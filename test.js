import ClamAV from './lib.js';

const clamav = new ClamAV({ port: 3310, host: '127.0.0.1' });
const eicar = await fetch('https://secure.eicar.org/eicar.com.txt');

console.log(await clamav.version());
console.log(await clamav.scan(eicar.body));