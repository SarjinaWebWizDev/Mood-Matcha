'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const ROOT=path.join(__dirname,'..'),procs=[];
async function start(port,env={}){const p=spawn(process.execPath,[path.join(__dirname,'vercel-harness.js')],{cwd:ROOT,env:{...process.env,NODE_ENV:'test',MM_NOW:'2026-10-26T12:00:00+05:30',VERCEL:'1',ORDER_SECRET:'s'.repeat(32),PORT:port,...env}});procs.push(p);p.stderr.on('data',d=>process.stderr.write(d));
 await new Promise((ok,no)=>{p.stdout.on('data',d=>/running at/.test(d)&&ok());setTimeout(()=>no(new Error('start timeout')),5000)});return{p,base:'http://127.0.0.1:'+port}}
const call=async(s,m,u,b)=>{const r=await fetch(s.base+u,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});return{status:r.status,body:await r.json()}};
const order={items:[{id:'sig',q:2,s:0,m:0,w:'Regular'}],mode:'delivery',name:'Asha Kumar',phone:'9876543210',address:'12 Sample Road, Sample Town',pin:'560001',payment:'receipt'};
after(()=>procs.forEach(p=>p.kill()));
test('serverless: config works and the entry file loads',async()=>{const S=await start(4701);const c=await call(S,'GET','/api/config');assert.equal(c.body.ordering.enabled,true);assert.equal(c.body.payment.online,false);assert.equal(typeof require('../api/[...path].js'),'function')});
test('serverless: order is accepted from a pre-parsed body and its confirmation link survives a restart (no database)',async()=>{
 const A=await start(4702);const o=await call(A,'POST','/api/orders',order);assert.equal(o.status,201);assert.equal(o.body.order.total,410);assert.equal(o.body.order.confirmed,true);assert.match(o.body.order.id,/^MM-\d{6}-[0-9A-F]{8}$/);
 const id=o.body.order.id,t=o.body.token;A.p.kill();
 const B=await start(4703);const g=await call(B,'GET',`/api/orders/${id}?t=${encodeURIComponent(t)}`);assert.equal(g.status,200);assert.equal(g.body.order.id,id);assert.equal(g.body.order.total,410);assert.equal(g.body.order.address,'12 Sample Road, Sample Town');assert.equal(g.body.order.status,'received');
 assert.equal((await call(B,'GET',`/api/orders/${id}?t=${encodeURIComponent(t.slice(0,-4)+'AAAA')}`)).status,404,'tampered token');
 assert.equal((await call(B,'GET',`/api/orders/MM-261026-AAAAAAAA?t=${encodeURIComponent(t)}`)).status,404,'token bound to its own order id');
 const C=await start(4704,{ORDER_SECRET:'z'.repeat(32)});assert.equal((await call(C,'GET',`/api/orders/${id}?t=${encodeURIComponent(t)}`)).status,404,'different secret cannot open it')});
test('serverless: token hides customer details, validation still applies, admin and online payment are off',async()=>{
 const S=await start(4705);const o=await call(S,'POST','/api/orders',order);const raw=Buffer.from(o.body.token,'base64url').toString('latin1');assert.ok(!raw.includes('Asha')&&!raw.includes('9876543210'));
 assert.equal((await call(S,'POST','/api/orders',{...order,phone:'123'})).status,400);assert.equal((await call(S,'POST','/api/orders',{...order,payment:'online'})).status,400);assert.equal((await call(S,'GET','/api/admin/orders')).status,404);
 assert.equal((await call(S,'POST','/api/quote',{items:order.items,mode:'delivery',pin:'560001'})).body.fee,50)});
