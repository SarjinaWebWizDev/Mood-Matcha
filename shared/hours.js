'use strict';
// Single implementation of opening hours, used by BOTH the server and the React app.
// hours = { mon:["04:00","24:00"], ... }  ("24:00" means midnight at the end of that day; null = closed)
const DAYS=['sun','mon','tue','wed','thu','fri','sat'],NAME={mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'};
const tm=s=>+s.slice(0,2)*60+ +s.slice(3,5);
const fm=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const fmt12=m=>{m=Math.round(m);const h24=Math.floor(m/60)%24,h=h24%12||12;return h+':'+String(m%60).padStart(2,'0')+' '+(h24<12?'AM':'PM')};
const t12=s=>fmt12(tm(s));
function local(tz,now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz||'Asia/Kolkata',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now||new Date()).map(x=>[x.type,x.value]));return{day:p.weekday.toLowerCase().slice(0,3),min:+p.hour*60+ +p.minute}}
const OPEN=/^([01]\d|2[0-3]):[0-5]\d$/,CLOSE=/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;
function validate(H){if(!H||typeof H!=='object'||!DAYS.some(d=>Array.isArray(H[d])))return 'Opening hours are not configured.';
 for(const d of DAYS){const h=H[d];if(h==null)continue;if(!Array.isArray(h)||h.length!==2||!OPEN.test(h[0])||!CLOSE.test(h[1])||tm(h[0])>=tm(h[1]))return 'Opening hours for '+d+' are invalid.'}return ''}
// extra = minutes still needed after ordering (preparation/delivery); the order must fit before closing.
function info(H,tz,extra,now){extra=extra||0;if(validate(H))return{configured:false,open:false,text:'Opening hours are not configured.'};
 const l=local(tz,now),h=H[l.day];
 if(Array.isArray(h)&&l.min>=tm(h[0])&&l.min+extra<=tm(h[1]))return{configured:true,open:true,text:'Open today until '+t12(h[1])};
 const i0=DAYS.indexOf(l.day);
 for(let i=0;i<=7;i++){const d=DAYS[(i0+i)%7],x=H[d];if(Array.isArray(x)&&(i>0||l.min<tm(x[0])))return{configured:true,open:false,text:'Closed for new orders. Next opening: '+(i===0?'today':i===1?'tomorrow':NAME[d])+' '+t12(x[0])}}
 return{configured:true,open:false,text:'Closed for new orders.'}}
function summary(H){if(validate(H))return 'Opening hours not set';const k=d=>Array.isArray(H[d])?H[d].join('-'):'closed';
 if(DAYS.every(d=>k(d)===k('mon'))&&Array.isArray(H.mon))return 'Daily · '+t12(H.mon[0])+' – '+t12(H.mon[1]);
 return ['mon','tue','wed','thu','fri','sat','sun'].map(d=>NAME[d]+' '+(Array.isArray(H[d])?t12(H[d][0])+' – '+t12(H[d][1]):'closed')).join(' · ')}
module.exports={DAYS,tm,fm,fmt12,local,validate,info,summary};
