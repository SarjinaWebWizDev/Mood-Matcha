// Build: node build.mjs            -> public/assets/app.js + app.css  (production)
//        node build.mjs --preview  -> single self-contained file preview/index.html (images inlined)
import {build,context} from 'esbuild';import fs from 'node:fs';import path from 'node:path';
const preview=process.argv.includes('--preview'),cfg=JSON.parse(fs.readFileSync('config.default.json','utf8'));
const used=new Set(['hero-matcha-whisk-flatlay.png','hero-matcha-world.png','brand-logo-transparent.png',...cfg.products.map(p=>p.img),...cfg.offers.map(o=>o.img).filter(Boolean)]);
let src='';
if(preview){const L=[...used];src=L.map((f,i)=>`import i${i} from '../tools/preview-img/${f.replace(/\.[a-z]+$/,'')}.jpg';`).join('\n')+'\nexport default {'+L.map((f,i)=>`${JSON.stringify(f)}:i${i}`).join(',')+'};';}
else src='export default '+JSON.stringify(Object.fromEntries([...used].map(f=>[f,'images/'+f])))+';';
fs.writeFileSync('src/images.js',src);
const out=preview?'preview-dist':'public/assets';
const opts={entryPoints:['src/main.jsx'],entryNames:preview?'main':'app.[hash]',bundle:true,minify:true,format:'iife',target:'es2020',outdir:out,loader:{'.jsx':'jsx','.jpg':'dataurl','.svg':'dataurl'},jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'warning',metafile:true};
const page=r=>{const o=Object.keys(r.metafile.outputs).map(p=>path.basename(p)),js=o.find(f=>f.endsWith('.js')),css=o.find(f=>f.endsWith('.css'));
 for(const f of fs.readdirSync(out))if(!o.includes(f))fs.rmSync(path.join(out,f),{force:true});
 const t=fs.readFileSync('src/template.html','utf8');fs.writeFileSync('public/index.html',t.replace('<!--CSS-->',()=>`<link rel="stylesheet" href="assets/${css}">`).replace('<!--JS-->',()=>`<script src="assets/${js}"></script>`))};
if(!preview){fs.mkdirSync(out,{recursive:true});opts.plugins=[{name:'page',setup(b){b.onEnd(r=>{if(r.metafile)page(r)})}}]}
if(process.argv.includes('--watch')){const c=await context(opts);await c.rebuild();await c.watch();console.log('watching src/ for changes...')}else{
const r=await build(opts);
if(preview){const js=fs.readFileSync(out+'/main.js','utf8'),css=fs.readFileSync(out+'/main.css','utf8');
 fs.mkdirSync('preview',{recursive:true});fs.writeFileSync('preview/index.html',fs.readFileSync('src/template.html','utf8').replace('<!--CSS-->',()=>'<style>'+css+'</style>').replace('<!--JS-->',()=>'<script>'+js.replace(/<\/script/g,'<\\/script')+'</script>'));console.log('preview',Math.round(fs.statSync('preview/index.html').size/1024)+'KB')}
else{console.log('built',Object.keys(r.metafile.outputs).join(', '))}}
