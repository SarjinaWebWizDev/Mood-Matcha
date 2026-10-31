import DEFAULT from '../config.default.json';import IMG from './images.js';import H from '../shared/hours.js';
export {DEFAULT};export const img=f=>IMG[f]||'';
export const money=n=>'₹'+(n%1?n.toFixed(2):String(n));
export const post=async(u,b)=>{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});let d={};try{d=await r.json()}catch(e){}if(!r.ok){const e=new Error(d.error||'We couldn’t complete that request. Please try again in a moment.');e.data=d;e.status=r.status;throw e}return d};
export const live=o=>!!o&&!!o.on&&(!o.start||new Date()>=new Date(o.start))&&(!o.end||new Date()<=new Date(o.end));
export const hoursSummary=H.summary;export const hoursInfo=conf=>H.info(conf.hours,conf.timezone,0,new Date());
export function calc(cart,P,OF,code,taxPct){const sub=cart.reduce((a,l)=>a+l.u*l.q,0),ds=[],dr=[],de=[];
 cart.forEach(l=>{const p=P.find(x=>x.id===l.id);for(let i=0;i<l.q;i++)((p&&p.cat==='drinks')?dr:de).push(l.u)});let hint='';const b=OF.find(o=>o.id==='b2g1');
 if(live(b)){const s=[...dr].sort((a,c)=>c-a);let f=0;for(let i=2;i<s.length;i+=3)f+=s[i];if(f)ds.push([b.t,f]);const r=dr.length%3;if(dr.length&&r)hint=`Add ${3-r} more drink${r===1?'s':''} to get one free.`}
 const d=OF.find(o=>o.id==='duo');if(live(d)&&d.amt){const n=Math.min(dr.length,de.length);if(n)ds.push([d.t,n*d.amt])}
 const c=code&&OF.find(o=>o.code===code);if(c&&live(c)&&sub>=(c.min||0)&&!ds.length)ds.push(['Code '+c.code,c.type==='pct'?sub*c.pct/100:Math.min(c.amt||0,sub)]);
 const disc=ds.reduce((a,x)=>a+x[1],0),net=sub-disc;return{sub,ds,disc,hint,tax:net*taxPct/100,total:net*(1+taxPct/100)}}
export {FAQ,SPECIALS,MOODS} from './content.js';
export const fallbackApi=()=>({business:DEFAULT.business,timezone:DEFAULT.timezone,hours:DEFAULT.hours,hoursSummary:H.summary(DEFAULT.hours),status:H.info(DEFAULT.hours,DEFAULT.timezone,0,new Date()),
 pickup:{enabled:!!DEFAULT.pickup.enabled,address:DEFAULT.pickup.address||'',instructions:DEFAULT.pickup.instructions||'',note:DEFAULT.pickup.note||''},delivery:{enabled:!!DEFAULT.delivery.enabled,chargeNote:DEFAULT.delivery.chargeNote||''},
 payment:{online:false,payOnReceipt:true},pickupCollector:DEFAULT.pickup.allowCollector!==false,taxPercent:DEFAULT.taxPercent||0,options:DEFAULT.options,offers:DEFAULT.offers,products:DEFAULT.products,ordering:{enabled:true,message:''}});
