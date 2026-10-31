// npm run dev: rebuilds on every change in src/ and runs the server (Windows/macOS/Linux)
import {spawn} from 'node:child_process';
const run=a=>spawn(process.execPath,a,{stdio:'inherit'});
const kids=[run(['build.mjs','--watch']),run(['server.js'])];
const stop=()=>{kids.forEach(k=>k.kill());process.exit()};process.on('SIGINT',stop);process.on('SIGTERM',stop);
