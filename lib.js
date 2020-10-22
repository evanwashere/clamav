import { fromStreamReader } from "https://deno.land/std@0.74.0/io/mod.ts";

export const commands = {
  _: Deno.core.encode('\n'),
  ping: Deno.core.encode('nPING'),
  scan: Deno.core.encode('nSCAN '),
  stats: Deno.core.encode('nSTATS'),
  reload: Deno.core.encode('nRELOAD'),
  version: Deno.core.encode('nVERSION'),
  shutdown: Deno.core.encode('nSHUTDOWN'),
  contscan: Deno.core.encode('nCONTSCAN '),
  instream: Deno.core.encode('nINSTREAM\n'),
  multiscan: Deno.core.encode('nMULTISCAN '),
  allmatchscan: Deno.core.encode('nALLMATCHSCAN '),
}

export default class ClamAV {
  constructor({ port, host }) {
    this.port = port;
    this.host = host;
  }

  async ping() {
    return Deno.core.decode(await this.request(commands.ping));
  }

  async stats() {
    return Deno.core.decode(await this.request(commands.stats));
  }

  async reload() {
    return Deno.core.decode(await this.request(commands.reload));
  }

  async version() {
    return Deno.core.decode(await this.request(commands.version));
  }

  async contscan(path) {
    return Deno.core.decode(await this.request(commands.contscan, Deno.core.encode(path)));
  }

  async multiscan(path) {
    return Deno.core.decode(await this.request(commands.multiscan, Deno.core.encode(path)));
  }

  async allmatchscan(path) {
    return Deno.core.decode(await this.request(commands.allmatchscan, Deno.core.encode(path)));
  }

  async shutdown() {
    const res = await this.request(commands.shutdown);

    if (0 === res.length) return !!1;
    else throw Deno.core.decode(res);
  }

  async scan(body) {
    if ('string' === typeof body) {
      return Deno.core.decode(await this.request(commands.scan, Deno.core.encode(body)));
    }

    else if (ArrayBuffer.isView(body) & !(body instanceof Uint8Array)) body = new Uint8Array(body.buffer);
    else if (body instanceof ArrayBuffer || body instanceof SharedArrayBuffer) body = new Uint8Array(body);

    const { readable, writable } = new ChunksStream();
    const res = this.request(commands.instream, readable);
    if (body instanceof ReadableStream) await body.pipeTo(writable);

    else {
      const w = writable.getWriter();
      if (body instanceof Uint8Array) await w.write(body);
      else for await (const chunk of Deno.iter(body)) await w.write(chunk);

      await w.close();
    }

    return Deno.core.decode(await res);
  }


  async request(cmd, body) {
    const con = await Deno.connect({
      port: this.port,
      transport: 'tcp',
      hostname: this.host,
    }).catch(() => Promise.reject(new Error(`clamd is not running on ${this.host}:${this.port}`)));

    await con.write(cmd);

    if (body) {
      if (body instanceof Uint8Array) await Deno.writeAll(con, body);
      else await Deno.copy(body instanceof ReadableStream ? fromStreamReader(body.getReader()) : body, con);
    }

    con.write(commands._);
    return (await Deno.readAll(con)).subarray(0, -1);
  }
}

class ChunksStream extends TransformStream {
  static transformer = {
    flush: ChunksStream.flush,
    transform: ChunksStream.transform,
  };

  constructor() {
    super(ChunksStream.transformer);
  }

  static flush(controller) {
    controller.enqueue(new Uint8Array(4));
  }

  static transform(chunk, controller) {
    const size = new Uint8Array(4);
    new DataView(size.buffer).setUint32(0, chunk.length, false);

    controller.enqueue(size);
    controller.enqueue(chunk);
  }
}
