'use strict';
// Mood Matcha ordering server. Zero dependencies (Node 18+). Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
try{for(const l of fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#\r\n]*)/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'')}}catch(e){}
const SERVERLESS=!!process.env.VERCEL,ROOT=__dirname,DATA=process.env.DATA_DIR||(SERVERLESS?'/tmp/mm-data':path.join(ROOT,'data')),PUB=path.join(ROOT,'public'),E=process.env;
const PORT=+E.PORT||3000,KEY=E.RAZORPAY_KEY_ID||'',SEC=E.RAZORPAY_KEY_SECRET||'',WH=E.RAZORPAY_WEBHOOK_SECRET||'',ADM=E.ADMIN_TOKEN||'',RZ=E.RAZORPAY_API_BASE||'https://api.razorpay.com';
fs.mkdirSync(DATA,{recursive:true,mode:0o700});
const CF=path.join(DATA,'config.json'),OFILE=path.join(DATA,'orders.json');
const rd=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
const wr=(f,o)=>{const t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(o,null,2),{mode:0o600});fs.renameSync(t,f)};
const H=require('./shared/hours.js'),DEFAULTS=require('./config.default.json');
const merge=(a,b)=>{if(b===null||typeof b!=='object'||Array.isArray(b))return b;const o={...a};for(const k in b)o[k]=(a&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))?merge(a[k],b[k]):b[k];return o};
// data/config.json holds ONLY the owner's overrides; shipped defaults come from config.default.json (so updates apply).
{const cur=rd(CF,null);if(cur&&cur.schemaVersion!==2){fs.copyFileSync(CF,path.join(DATA,'config.legacy.json'));console.log('Old configuration saved as data/config.legacy.json; the current defaults are now in use.')}if(!cur||cur.schemaVersion!==2)wr(CF,{schemaVersion:2})}
const now=()=>new Date(E.NODE_ENV==='test'&&E.MM_NOW?E.MM_NOW:Date.now());
let orders=rd(OFILE,{});const save=()=>{if(!SERVERLESS)wr(OFILE,orders)},cfg=()=>merge(DEFAULTS,rd(CF,{}));
const ONLINE=!!(KEY&&SEC)&&!SERVERLESS,SECRET=E.ORDER_SECRET||'mood-matcha-portfolio-secret';
if(SERVERLESS&&!E.ORDER_SECRET)console.warn('ORDER_SECRET is not set: using a built-in default. Set ORDER_SECRET in your Vercel project settings.');
const bad=(m,c=400,x={})=>Object.assign(new Error(m),{code:c,extra:x}),r2=x=>Math.round(x*100)/100,sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const skey=()=>crypto.createHash('sha256').update(SECRET).digest();
const seal=o=>{const {tokenHash,...r}=o,iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',skey(),iv),enc=Buffer.concat([c.update(zlib.deflateRawSync(Buffer.from(JSON.stringify(r)))),c.final()]);return Buffer.concat([iv,c.getAuthTag(),enc]).toString('base64url')};
const unseal=(t,id)=>{try{const b=Buffer.from(String(t||''),'base64url');if(b.length<30||b.length>12000)return null;const d=crypto.createDecipheriv('aes-256-gcm',skey(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));const r=JSON.parse(zlib.inflateRawSync(Buffer.concat([d.update(b.subarray(28)),d.final()]),{maxOutputLength:100000}).toString());return r.id===id?r:null}catch(e){return null}};
const teq=(a,b)=>{a=Buffer.from(String(a));b=Buffer.from(String(b));return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const {tm,fm}=H,local=tz=>H.local(tz,now()),hoursInfo=(c,extra=0)=>H.info(c.hours,c.timezone,extra,now());
const portfolio=c=>c.mode!=='production',receiptOk=c=>!!(c.payment?.allowPayOnReceipt||portfolio(c));
function readiness(c){const r=[],P=c.products||[];const bad=P.filter(p=>!p.id||!p.n||!Number.isFinite(p.p)||p.p<=0);
 if(!P.length||bad.length)r.push('Menu has missing or invalid prices'+(bad.length?' ('+bad.map(p=>p.id||'?').join(', ')+')':'')+'.');if(new Set(P.map(p=>p.id)).size!==P.length)r.push('Menu has duplicate product ids.');
 const o=c.options||{};if(![...(o.sizes||[]),...(o.milks||[])].every(x=>x&&Number.isFinite(x.p)&&x.p>=0)||!(o.sizes||[]).length||!(o.milks||[]).length||!(o.sweet||[]).length)r.push('Drink options are missing or invalid.');
 if(!portfolio(c)&&!c.pricesConfirmed)r.push('The owner has not confirmed menu prices yet.');const hv=H.validate(c.hours);if(hv)r.push(hv);
 const del=c.delivery?.enabled&&realZones(c).length,pk=c.pickup?.enabled&&(portfolio(c)||c.pickup.address);if(!del&&!pk)r.push('Neither delivery zones nor a pickup option are configured.');
 if(!ONLINE&&!receiptOk(c))r.push('No payment method is configured.');return r}
function pub(c){const h=hoursInfo(c),rs=readiness(c);return{business:c.business,timezone:c.timezone,hours:c.hours,hoursSummary:H.summary(c.hours),status:{open:h.open,text:h.text},
 pickup:{enabled:!!(c.pickup?.enabled&&(portfolio(c)||c.pickup.address)),address:c.pickup?.address||'',instructions:c.pickup?.instructions||'',note:c.pickup?.note||''},delivery:{enabled:!!(c.delivery?.enabled&&realZones(c).length),chargeNote:c.delivery?.chargeNote||''},pickupCollector:c.pickup?.allowCollector!==false,
 payment:{online:!!ONLINE,payOnReceipt:receiptOk(c)},taxPercent:c.taxPercent||0,options:c.options,offers:c.offers,products:c.products,ordering:{enabled:!rs.length,message:rs.length?'Online ordering is temporarily unavailable. Please try again later.':''}}}
const zoneFor=(c,pin)=>(c.delivery?.zones||[]).find(z=>(z.anyPin&&portfolio(c))||(z.pins||[]).includes(pin)),realZones=c=>(c.delivery?.zones||[]).filter(z=>portfolio(c)||(z.pins||[]).length);
function lines(c,items){if(!Array.isArray(items)||!items.length||items.length>40)throw bad('Your cart is empty or too large.');
 return items.map(it=>{const p=c.products.find(x=>x.id===String(it.id));if(!p||p.available===false)throw bad('An item in your cart is no longer available. Please refresh the menu.');
 const q=Math.floor(+it.q);if(!(q>=1&&q<=20))throw bad('Invalid quantity.');let u=p.p,opt='';
 if(p.cat==='drinks'){const o=c.options,s=o.sizes[+it.s],m=o.milks[+it.m],w=o.sweet.includes(it.w)?it.w:null;if(!s||!m||!w)throw bad('Invalid drink options.');u+=s.p+m.p;opt=[s.n,m.n,w].join(' · ')}
 return{id:p.id,cat:p.cat,name:p.n,opt,note:String(it.n||'').slice(0,140),unit:u,qty:q,total:r2(u*q)}})}
function discounts(c,L,sub,code){const out=[],now_=now(),live=o=>o&&o.on&&(!o.start||now_>=new Date(o.start))&&(!o.end||now_<=new Date(o.end)),dr=[],de=[];let coupon=null;
 L.forEach(l=>{for(let i=0;i<l.qty;i++)(l.cat==='drinks'?dr:de).push(l.unit)});const O=c.offers||[],b=O.find(o=>o.id==='b2g1');
 if(live(b)){const s=[...dr].sort((a,z)=>z-a);let f=0;for(let i=2;i<s.length;i+=3)f+=s[i];if(f)out.push({name:b.t,amt:r2(f)})}
 const d=O.find(o=>o.id==='duo');if(live(d)&&d.amt){const n=Math.min(dr.length,de.length);if(n)out.push({name:d.t,amt:r2(n*d.amt)})}
 if(code){const k=String(code).trim().toUpperCase(),o=O.find(x=>x.code&&x.code===k);coupon={code:k,ok:false,message:''};
  if(!live(o))coupon.message='This coupon code is not valid or not active.';else if(sub<(o.min||0))coupon.message='Minimum order of ₹'+o.min+' required for this code.';else if(out.length)coupon.message='This code cannot be combined with another offer in your cart.';
  else{coupon.ok=true;out.push({name:'Code '+o.code,amt:r2(o.type==='pct'?sub*o.pct/100:Math.min(o.amt||0,sub))})}}
 return{out,coupon}}
function quote(c,b){const mode=b.mode;if(mode!=='delivery'&&mode!=='pickup')throw bad('Choose delivery or pickup.');const L=lines(c,b.items),sub=r2(L.reduce((a,l)=>a+l.total,0)),DS=discounts(c,L,sub,b.coupon),D=DS.out,disc=r2(D.reduce((a,d)=>a+d.amt,0)),net=r2(sub-disc);
 const q={coupon:DS.coupon,lines:L,sub,discounts:D,disc,tax:r2(net*(c.taxPercent||0)/100),fee:0,zone:null,eta:null,problem:null,mode};let extra=0;
 if(mode==='delivery'){if(!c.delivery?.enabled||!realZones(c).length)q.problem='Delivery is not available right now.';else if(!/^\d{6}$/.test(String(b.pin||'')))q.problem='Enter a valid 6-digit PIN code.';
  else{const z=zoneFor(c,String(b.pin));if(!z)q.problem='Sorry, we do not deliver to PIN code '+b.pin+' yet.';else{q.zone=z.name;q.fee=z.freeAbove!=null&&net>=z.freeAbove?0:r2(z.fee||0);
   if(z.minOrder&&net<z.minOrder)q.problem='Minimum order for delivery to '+z.name+' is ₹'+z.minOrder+'.';
   const pm=c.delivery.prepMinutes;if(pm!=null&&z.etaMin!=null&&z.etaMax!=null){extra=pm+z.etaMin;const l=local(c.timezone);q.eta=fm(l.min+pm+z.etaMin)+' – '+fm(l.min+pm+z.etaMax)}}}}
 else{if(!(c.pickup?.enabled&&(portfolio(c)||c.pickup.address)))q.problem='Pickup is not available right now.';else if(c.pickup.prepMinutes!=null){extra=c.pickup.prepMinutes;q.eta='Ready in about '+c.pickup.prepMinutes+' minutes'}}
 q.total=r2(net+q.tax+q.fee);q.extra=extra;return q}
const pubOrder=o=>({id:o.id,status:o.status,payment:o.payment.status,mode:o.mode,total:o.quote.total,lines:o.quote.lines,discounts:o.quote.discounts,fee:o.quote.fee,tax:o.quote.tax,eta:o.quote.eta,zone:o.quote.zone,createdAt:o.createdAt,history:o.history,confirmed:!['awaiting_payment','failed'].includes(o.status),sub:o.quote.sub,name:o.customer.name,paymentMethod:o.payment.method});
const mark=(o,s)=>{o.status=s;o.history.push({status:s,at:new Date().toISOString()})};
const hits=new Map();function limit(ip,k,max){const n=Date.now(),a=(hits.get(ip+k)||[]).filter(t=>n-t<60000);a.push(n);hits.set(ip+k,a);if(a.length>max)throw bad('Too many requests. Please wait a minute.',429)}
const readBody=(req,max=51200)=>req.body!==undefined&&req.body!==null?Promise.resolve(typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString():JSON.stringify(req.body)):new Promise((ok,no)=>{let b='',n=0;req.on('data',c=>{n+=c.length;if(n>max){no(bad('Request too large.',413));req.destroy()}else b+=c});req.on('end',()=>ok(b));req.on('error',no)});
const json=async req=>{const s=await readBody(req);try{return s?JSON.parse(s):{}}catch(e){throw bad('Invalid request.')}};
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
async function rzOrder(o,paise){const r=await fetch(RZ+'/v1/orders',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(KEY+':'+SEC).toString('base64')},body:JSON.stringify({amount:paise,currency:'INR',receipt:o.id}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('rz '+r.status);return r.json()}
const clean=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,n);
async function createOrder(req,c,b,ip){const rs=readiness(c);if(rs.length){console.error('Order refused, not ready: '+rs.join(' | '));throw bad('Online ordering is temporarily unavailable. Please try again later.',503)}limit(ip,'o',10);
 const name=clean(b.name,80),phone=String(b.phone||'').replace(/[\s-]/g,'').replace(/^\+91/,''),errs={};if(name.length<2)errs.name='Enter your name.';if(!/^[6-9]\d{9}$/.test(phone))errs.phone='Enter a valid 10-digit mobile number.';
 const address=clean(b.address,300),pin=String(b.pin||'');if(b.mode==='delivery'){if(address.length<8)errs.address='Enter your full address.';if(!/^\d{6}$/.test(pin))errs.pin='Enter a valid 6-digit PIN code.'}
 const pay=b.payment;if(pay==='online'?!ONLINE:pay==='receipt'?!receiptOk(c):true)errs.payment='Choose an available payment method.';
 let collector=null;if(b.mode==='pickup'&&clean(b.collectorName,80)){const cn=clean(b.collectorName,80),cp=String(b.collectorPhone||'').replace(/[\s-]/g,'').replace(/^\+91/,'');if(cn.length<2)errs.collectorName='Enter the name of the person collecting.';if(cp&&!/^[6-9]\d{9}$/.test(cp))errs.collectorPhone='Enter a valid 10-digit mobile number for the collector.';collector={name:cn,phone:cp}}
 if(Object.keys(errs).length)throw bad('Please correct the highlighted fields.',400,{fields:errs});
 const q=quote(c,b);if(q.problem)throw bad(q.problem,422);if(q.coupon&&!q.coupon.ok)throw bad(q.coupon.message,422);const h=hoursInfo(c,q.extra);if(!h.open)throw bad(h.text,409);
 const key=clean(b.key,64);if(key){const ex=Object.values(orders).find(o=>o.key===key);if(ex)return{order:pubOrder(ex),token:null,duplicate:true}}
 const id='MM-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+crypto.randomBytes(4).toString('hex').toUpperCase(),token=crypto.randomBytes(16).toString('hex'),now=new Date().toISOString();
 const o={id,key,tokenHash:sha(token),status:'awaiting_payment',createdAt:now,history:[],mode:b.mode,customer:{name,phone},collector,address,pin,instructions:clean(b.instructions,200),quote:q,payment:{method:pay,status:'pending'}};
 if(pay==='receipt'){o.payment.status='pay_on_receipt';mark(o,'received');orders[id]=o;save();return{order:pubOrder(o),token:SERVERLESS?seal(o):token}}
 mark(o,'awaiting_payment');orders[id]=o;save();
 try{const z=await rzOrder(o,Math.round(q.total*100));o.payment.rzpOrderId=z.id;save();return{order:pubOrder(o),token,razorpay:{keyId:KEY,orderId:z.id,amount:Math.round(q.total*100)}}}
 catch(e){if(E.DEBUG_PAY)console.error('razorpay error',e);mark(o,'failed');o.payment.status='failed';save();throw bad('The payment provider is unavailable. Your order was not placed.',502)}}
function paid(o){if(o.status==='awaiting_payment'){o.payment.status='paid';mark(o,'received');save()}}
const STAT=['received','accepted','preparing','ready','out_for_delivery','delivered','cancelled'];
async function api(req,res,u,p,ip){const m=req.method,c=cfg();limit(ip,'g',120);
 if(p==='/api/config'&&m==='GET')return send(res,200,pub(c));
 if(p==='/api/quote'&&m==='POST')return send(res,200,quote(c,await json(req)));
 if(p==='/api/delivery/check'&&m==='POST'){const pin=String((await json(req)).pin||'');if(!/^\d{6}$/.test(pin))return send(res,200,{ok:false,message:'Enter a valid 6-digit PIN code.'});
  if(!c.delivery?.enabled||!realZones(c).length)return send(res,200,{ok:false,message:'Delivery has not been set up yet. Pickup may be available.'});const z=zoneFor(c,pin);
  if(!z)return send(res,200,{ok:false,message:'Sorry, we do not deliver to '+pin+' yet.'});const l=local(c.timezone),pm=c.delivery.prepMinutes;
  let t=(z.anyPin?'You can place a delivery order for PIN code '+pin+'.':'Delivery is available to '+z.name+'.')+' Delivery charge ₹'+(z.fee||0)+(z.freeAbove!=null?' (free above ₹'+z.freeAbove+')':'')+(z.minOrder?'. Minimum order ₹'+z.minOrder:'')+'.';
  if(pm!=null&&z.etaMin!=null&&z.etaMax!=null)t+=hoursInfo(c,pm+z.etaMin).open?' Estimated delivery if ordered now: '+fm(l.min+pm+z.etaMin)+' – '+fm(l.min+pm+z.etaMax)+' (an estimate, not live tracking).':' '+hoursInfo(c).text;return send(res,200,{ok:true,message:t})}
 if(p==='/api/orders'&&m==='POST')return send(res,201,await createOrder(req,c,await json(req),ip));
 let g=p.match(/^\/api\/orders\/(MM-[0-9A-Z-]+)$/);if(g&&m==='GET'){const t=u.searchParams.get('t')||'',o=SERVERLESS?unseal(t,g[1]):(orders[g[1]]&&teq(sha(t),orders[g[1]].tokenHash)?orders[g[1]]:null);if(!o)throw bad('Order not found.',404);return send(res,200,{order:{...pubOrder(o),collector:o.mode==='pickup'?o.collector||null:null,address:o.mode==='delivery'?o.address:'',pin:o.mode==='delivery'?o.pin:'',instructions:o.instructions},support:c.business,pickup:{address:c.pickup?.address||'',instructions:c.pickup?.instructions||''},hours:H.summary(c.hours)})}
 if(p==='/api/payments/verify'&&m==='POST'){limit(ip,'v',20);const b=await json(req),o=orders[b.id];if(!o||!teq(sha(b.t||''),o.tokenHash)||o.payment.method!=='online'||b.razorpay_order_id!==o.payment.rzpOrderId)throw bad('Order not found.',404);
  const exp=crypto.createHmac('sha256',SEC).update(b.razorpay_order_id+'|'+b.razorpay_payment_id).digest('hex');if(!SEC||!teq(exp,b.razorpay_signature))throw bad('Payment could not be verified. Your order is not confirmed.',400);
  o.payment.rzpPaymentId=b.razorpay_payment_id;paid(o);return send(res,200,{order:pubOrder(o)})}
 if(p==='/api/payments/webhook'&&m==='POST'){const raw=await readBody(req);const sig=crypto.createHmac('sha256',WH||'x').update(raw).digest('hex');if(!WH||!teq(sig,req.headers['x-razorpay-signature']||''))throw bad('Invalid signature.',400);
  const e=JSON.parse(raw),en=e.payload?.payment?.entity||{},o=Object.values(orders).find(x=>x.payment.rzpOrderId===en.order_id);if(o&&(e.event==='payment.captured'||e.event==='order.paid')&&en.amount===Math.round(o.quote.total*100)){o.payment.rzpPaymentId=en.id;paid(o)}return send(res,200,{ok:true})}
 if(p.startsWith('/api/admin/')){if(SERVERLESS)throw bad('Not found.',404);if(ADM.length<24)throw bad('Admin is disabled. Set ADMIN_TOKEN (24+ characters).',503);limit(ip,'a',60);if(!teq((req.headers.authorization||'').replace(/^Bearer /,''),ADM))throw bad('Unauthorised.',401);
  if(p==='/api/admin/readiness')return send(res,200,{mode:c.mode||'portfolio',reasons:readiness(c)});
  if(p==='/api/admin/orders'&&m==='GET')return send(res,200,Object.values(orders).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,200).map(o=>({...pubOrder(o),customer:o.customer,collector:o.collector||null,address:o.address,pin:o.pin,instructions:o.instructions,paymentMethod:o.payment.method})));
  g=p.match(/^\/api\/admin\/orders\/(MM-[0-9A-Z-]+)$/);if(g&&m==='PATCH'){const o=orders[g[1]],s=(await json(req)).status;if(!o)throw bad('Not found.',404);if(!STAT.includes(s)||!pubOrder(o).confirmed)throw bad('Invalid status change.');mark(o,s);save();return send(res,200,{order:pubOrder(o)})}
  if(p==='/api/admin/config'&&m==='GET')return send(res,200,c);
  if(p==='/api/admin/config'&&m==='PUT'){const n=await json(req,);if(!n||typeof n!=='object'||!Array.isArray(n.products)||!n.options||!n.delivery||!n.pickup)throw bad('Config is missing required sections.');fs.copyFileSync(CF,CF+'.bak');n.schemaVersion=2;wr(CF,n);return send(res,200,{ok:true,readiness:readiness(n)})}}
 throw bad('Not found.',404)}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain'};
function stat(req,res,p){let f=path.normalize(path.join(PUB,decodeURIComponent(p==='/'?'/index.html':p)));if(!f.startsWith(PUB+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end('Not found')}
 res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':/^[/\\]assets[/\\]app\.[A-Za-z0-9]+\.(js|css)$/.test(p)?'public, max-age=31536000, immutable':/\.(png|jpg|svg)$/.test(f)?'public, max-age=3600':'no-cache'});fs.createReadStream(f).pipe(res)}
const handler=async(req,res)=>{try{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com");
 const u=new URL(req.url,'http://x'),ip=(E.TRUST_PROXY==='1'||SERVERLESS)?(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.socket.remoteAddress:req.socket.remoteAddress;
 if(u.pathname.startsWith('/api/'))await api(req,res,u,u.pathname,ip);else stat(req,res,u.pathname)}
 catch(e){const c=e.code>=400&&e.code<600?e.code:500;if(c===500)console.error(e);send(res,c,{error:c===500?'Something went wrong. Please try again.':e.message,...(e.extra||{})})}};
const srv=http.createServer(handler);
if(require.main===module){
srv.on('error',e=>{if(e.code==='EADDRINUSE')console.error('\nPort '+PORT+' is already in use. Close the other program using it (or the previous "npm run dev" window), or start on another port with PORT=3001.');else console.error(e);process.exit(1)});
srv.listen(PORT,()=>{const c=cfg(),rs=readiness(c);console.log('Mood Matcha is running at http://localhost:'+PORT+'  ('+(portfolio(c)?'portfolio':'production')+' mode)');console.log('Hours: '+H.summary(c.hours)+' ('+c.timezone+')');
 if(rs.length)console.log('Ordering is OFF until fixed:\n - '+rs.join('\n - '));else console.log('Ordering is ON. Payment: '+(ONLINE?'Razorpay online + ':'')+(receiptOk(c)?'pay at pickup/delivery':'online only'))});
}
module.exports={handler};
