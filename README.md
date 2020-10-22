implements all non-deprecated commands in clamd

```js
const clamav = new ClamAV({ port: 3310, host: '127.0.0.1' });
const eicar = await fetch('https://secure.eicar.org/eicar.com.txt');

console.log(await clamav.version());
console.log(await clamav.scan(eicar.body));
console.log(await clamav.scan(new Uint8Array([...])));
console.log(await clamav.scan(await Deno.open('file.txt')));
```