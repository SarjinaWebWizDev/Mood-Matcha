import React,{useState,useEffect,useRef,useMemo} from 'react';
import {DEFAULT,fallbackApi,img,money,post,live,hoursSummary,hoursInfo,calc,FAQ,SPECIALS,MOODS} from './lib.js';
const HERO='hero-matcha-whisk-flatlay.png',LOGO='brand-logo-transparent.png',WORLD='hero-matcha-world.png';
const reduce=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion:reduce)').matches;
function R({as:T='div',d=0,className='',style,children,...p}){const ref=useRef(),[on,setOn]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el)return;if(!('IntersectionObserver' in window)||reduce()){setOn(true);return}const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setOn(true);io.disconnect()}},{threshold:.1});io.observe(el);return()=>io.disconnect()},[]);
 return <T ref={ref} className={'rv '+(on?'in ':'')+className} style={{transitionDelay:d+'ms',...style}} {...p}>{children}</T>}
function Dlg({open,onClose,className,label,children}){const ref=useRef();useEffect(()=>{const d=ref.current;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open]);
 return <dialog ref={ref} className={className} aria-label={label} onClose={onClose} onClick={e=>{if(e.target===ref.current)onClose()}}>{open&&children}</dialog>}
const scrollTo=id=>{const el=document.getElementById(id);if(el){el.scrollIntoView({behavior:reduce()?'auto':'smooth',block:'center'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash')}};

export default function App(){
 const [api,setApi]=useState(fallbackApi),conf=api||DEFAULT,P=useMemo(()=>conf.products.filter(p=>p.available!==false),[conf]),OF=conf.offers,O=conf.options;
 const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('mm_cart')||'[]')}catch(e){return[]}});
 const [coupon,setCoupon]=useState(''),[cmsg,setCmsg]=useState(''),[q,setQ]=useState(''),[cat,setCat]=useState('All'),[menu,setMenu]=useState(false),[cartOpen,setCartOpen]=useState(false),[prod,setProd]=useState(null),[info,setInfo]=useState(null),[done,setDone]=useState(null);
 const count=cart.reduce((a,l)=>a+l.q,0),first=useRef(true);useEffect(()=>{first.current=false},[]);
 useEffect(()=>{try{localStorage.setItem('mm_cart',JSON.stringify(cart))}catch(e){}},[cart]);
 useEffect(()=>{let stop=false;const load=async()=>{try{const r=await fetch('/api/config',{cache:'no-store'}),c=await r.json();if(!r.ok||!c.products)throw 0;if(!stop)setApi(c)}catch(e){if(!stop)setApi(x=>({...x,status:hoursInfo(DEFAULT)}))}};load();const t=setInterval(load,60000);return()=>{stop=true;clearInterval(t)}},[]);
 useEffect(()=>{setCart(c=>c.filter(l=>P.some(p=>p.id===l.id)))},[P]);
 useEffect(()=>{const k=e=>{if(e.key==='Escape')setMenu(false)};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[]);
 useEffect(()=>{if(reduce())return;let t=0;const f=()=>{if(t)return;t=requestAnimationFrame(()=>{t=0;document.documentElement.style.setProperty('--py',Math.min(scrollY*.02,7)+'px')})};addEventListener('scroll',f,{passive:true});return()=>removeEventListener('scroll',f)},[]);
 const tax=conf.taxPercent||0,T=calc(cart,P,OF,coupon,tax),b2=OF.find(o=>o.id==='b2g1'),on=live(b2),byId=id=>P.find(p=>p.id===id);
 const drinks=P.filter(p=>p.cat==='drinks'),cats=['All',...new Set(drinks.map(p=>p.c))],m=p=>(p.n+' '+p.d).toLowerCase().includes(q.toLowerCase().trim());
 const dl=drinks.filter(p=>(cat==='All'||p.c===cat)&&m(p)),ds=P.filter(p=>p.cat==='dessert'&&m(p));
 const add=l=>{setDone(null);setCart(c=>{const x=c.find(y=>y.k===l.k);return x?c.map(y=>y.k===l.k?{...y,q:y.q+l.q}:y):[...c,l]})};
 const addD=p=>{add({k:p.id,id:p.id,n:p.n,opt:'',note:'',u:p.p,q:1,s:0,m:0,w:''});setCartOpen(true)};
 const setQty=(k,d)=>setCart(c=>c.flatMap(l=>l.k!==k?[l]:l.q+d<1?[]:[{...l,q:l.q+d}]));
 const applyCoupon=code=>{const c=code.trim().toUpperCase();setCoupon('');setCmsg('');if(!c)return;const o=OF.find(x=>x.code===c);if(!live(o))setCmsg('This code is not valid or not active.');else if(T.sub<(o.min||0))setCmsg('Minimum order '+money(o.min)+' required for this code.');else if(T.ds.length&&!T.ds.some(d=>d[0]==='Code '+c))setCmsg('This code cannot be combined with another offer in your cart.');else setCoupon(c)};
 const hi=api?api.status:hoursInfo(conf),status=`${hi.open?'Open now':'Closed'} · ${hi.text}`;
 const [pin,setPin]=useState(''),[pr,setPr]=useState('');
 const [mood,setMood]=useState('bold'),moods=MOODS.filter(m=>byId(m.id)),curMood=moods.find(m=>m.k===mood)||moods[0],pick=curMood&&byId(curMood.id);
 useEffect(()=>{MOODS.forEach(m=>{const p=P.find(x=>x.id===m.id);if(p){const i=new Image();i.src=img(p.img)}})},[P]);
 const orderPick=()=>pick.cat==='drinks'?setProd(pick):addD(pick);
 const check=async()=>{if(!/^\d{6}$/.test(pin.trim()))return setPr('Enter a valid 6-digit PIN code.');try{setPr((await post('/api/delivery/check',{pin:pin.trim()})).message)}catch(e){setPr('Could not check right now. Please try again.')}};
 const biz=conf.business||{};
 return <>
 {(()=>{const off=!api.ordering.enabled,parts=[];if(!off){if(on)parts.push(`${b2.t} on all drinks`);OF.filter(o=>o.showCode&&live(o)).forEach(o=>parts.push(`Use code ${o.code}: ${o.d}`))}const text=off?api.ordering.message:parts.join(' · ');return text?<div className="notice" role="note">{text}</div>:null})()}
 <header><div className="hb"><a href="#top" aria-label="Home"><img src={img(LOGO)} alt={(biz.name||'Mood Matcha')+' logo'}/></a>
  <nav id="nav" aria-label="Main" className={menu?'open':''} onClick={e=>{if(e.target.closest('a'))setMenu(false)}}><a href="#drinks">Order Now</a><a href="#offers" className="of">Offers</a><a href="#drinks">Drinks</a><a href="#desserts">Desserts</a><a href="#faq">FAQs</a><a href="#contact">Contact</a></nav>
  <button className="ib" id="mb" aria-expanded={menu} aria-controls="nav" onClick={()=>setMenu(!menu)}>Menu</button>
  <button className="ib c" onClick={()=>setCartOpen(true)} aria-label={`Open cart, ${count} items`}>Cart (<span id="cc" key={count} className={first.current?'':'bump'}>{count}</span>)</button></div></header>
 <main id="top">
 <section className="w hero2" aria-label="Welcome">
  <div className="h-top"><p className="sans eyebrow">Matcha café</p><h1>Your Matcha. <span className="hl">Your Mood.</span></h1><p className="lead">How are you feeling today? Pick a mood and we’ll pour the matcha for it.</p></div>
  <div className="arch-wrap"><div className="arch">{pick&&<img key={pick.id} className="mi" src={img(pick.img)} alt={pick.n}/>}</div>
   <div className="inset"><img src={img(HERO)} alt="Bamboo whisk, matcha powder and a bowl of whisked matcha" loading="lazy"/></div>
   {on&&<div className="sticker" aria-hidden="true">BUY 2<br/>GET 1<br/>FREE</div>}</div>
  <div className="h-bottom"><div className="moods" role="group" aria-label="Choose a mood">{moods.map(m=><button key={m.k} className="mood" aria-pressed={m.k===curMood.k} onClick={()=>setMood(m.k)}>{m.label}</button>)}</div>
   {pick&&<div className="pick" key={pick.id} aria-live="polite"><span className="k">{curMood.label} mood</span><h2>{pick.n}</h2><p>{curMood.line}</p><div className="row2"><b className="price">{money(pick.p)}</b><button className="btn go" onClick={orderPick}>Order this <span aria-hidden="true">→</span></button><a className="btn o" href="#offers">Explore Offers</a></div></div>}</div>
 </section>

 <section id="offers" className="ban"><div className="w bi"><R><p className="sans eyebrow">Seasonal Offers &amp; Special Deals</p><h2>A Little Matcha Magic, Just for the Season.</h2><p>Discover your seasonal favourites, refreshing matcha creations, and delicious pairings.</p><p><a className="btn" href="#ofl">Explore Offers</a></p></R><img src={img(WORLD)} alt="Matcha drinks, cookies and desserts on a blush table"/></div></section>
 <section className="w" id="ofl"><R as="h2">Seasonal Specials</R><R as="p" style={{color:'var(--mut)'}}>Buy 2 Get 1 Free on drinks. Validity dates are shown only when the café sets them.</R>
  {OF.filter(o=>o.showCode&&live(o)).map(o=><R as="p" key={o.id} className="sans" style={{marginTop:6}}>Coupon: use code <b>{o.code}</b> — {o.d}</R>)}
  <div className="grid sp" style={{marginTop:16}}>{on?SPECIALS.map(([t,id,d],i)=>{const p=byId(id);return p&&<R as="article" className="card" d={i*80} key={id}><img loading="lazy" src={img(p.img)} alt={t+': '+p.n}/><div><span className="tag ofr">{b2.t}</span><h3>{t}</h3><p>{d}</p><div className="pr" style={{padding:0,flexDirection:'row'}}><b>{money(p.p)}</b><span><button className="ib" onClick={()=>setInfo(b2)}>View Offer</button> <button className="btn" onClick={()=>setProd(p)}>Order Now</button></span></div></div></R>}):<p>No offers are active right now.</p>}</div>
  <R as="h2" style={{marginTop:44}}>Matcha Combos</R>
  <div className="grid" style={{marginTop:16}}>
   <R as="article" className="card"><div className="th">{['sig','straw','pist'].map(id=>byId(id)&&<img key={id} loading="lazy" src={img(byId(id).img)} alt=""/>)}</div><div><span className="tag ofr">{on?'Active':'Not active yet'}</span><h3>The Matcha Trio</h3><p>Pick any three drinks and the lowest-priced one is free.</p><div className="pr" style={{padding:0,flexDirection:'row'}}><button className="ib" onClick={()=>setInfo(b2)}>View Offer</button><a className="btn" href="#drinks">Order Now</a></div></div></R>
   {OF.filter(o=>o.id==='duo').map(o=><R as="article" className="card duo" d={80} key={o.id}><img loading="lazy" src={img(o.img)} alt="Matcha tiramisu served with an iced matcha drink"/><div><span className="tag">{live(o)?'Active':'Not active yet'}</span><h3>{o.t}</h3><p>A drink and a dessert together. {live(o)?'':'Waiting for the café to confirm the deal.'}</p><div className="pr" style={{padding:0,flexDirection:'row'}}><button className="ib" onClick={()=>setInfo(o)}>View Offer</button><button className="btn" disabled={!live(o)} onClick={()=>scrollTo('desserts')}>{live(o)?'Order Now':'Unavailable'}</button></div></div></R>)}</div>
  <R as="h2" style={{marginTop:44}}>Your Seasonal Favourites</R>
  <div className="row">{drinks.slice(0,8).map(p=><article className="card" key={p.id}><img loading="lazy" src={img(p.img)} alt={p.n}/><div><h3 style={{fontSize:17}}>{p.n}</h3><div className="pr" style={{padding:0,flexDirection:'row'}}><b>{money(p.p)}</b><button className="btn" onClick={()=>setProd(p)}>Add</button></div></div></article>)}</div></section>

 <section className="w" id="drinks"><R><p className="sans eyebrow" style={{color:'var(--ch)'}}>Sip</p><h2>Matcha Drinks</h2></R>
  <div className="bar"><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search drinks and desserts" aria-label="Search menu"/></div>
  <div className="bar" role="group" aria-label="Drink categories">{cats.map(c=><button key={c} className="chip" aria-pressed={c===cat} onClick={()=>setCat(c)}>{c}</button>)}</div>
  <div className="grid" aria-live="polite">{dl.length?dl.map((p,i)=><R as="article" className="card" d={i*60} key={p.id+cat}><img loading="lazy" src={img(p.img)} alt={p.n}/><div>{p.best&&<span className="tag">Bestseller</span>}{on&&<span className="tag ofr">{b2.t}</span>}<h3>{p.n}</h3><p>{p.d}</p><div className="pr" style={{padding:0,flexDirection:'row'}}><b>{money(p.p)}</b><button className="btn" onClick={()=>setProd(p)}>Customise &amp; add</button></div></div></R>):<p>No drinks match your search.</p>}</div></section>

 <section id="desserts" className="dess"><div className="w"><R><p className="sans eyebrow">Treat</p><h2>Matcha Desserts</h2><p style={{opacity:.8}}>Add one straight to your cart, or pair it with a drink.</p></R>
  <div className="dgrid">{ds.length?ds.map((p,i)=><R as="article" className="dc" id={'p-'+p.id} d={i*60} key={p.id}><img loading="lazy" src={img(p.img)} alt={p.n}/><div><span><h3 style={{margin:0}}>{p.n}</h3><b>{money(p.p)}</b></span><button className="btn" onClick={()=>addD(p)} aria-label={'Add '+p.n+' to cart'}>Add</button></div></R>):<p>No desserts match your search.</p>}</div>
  <p><a className="btn" href="#drinks">Pair with a drink</a></p></div></section>

 <section className="w" id="deliv"><R as="h2">Delivery &amp; pickup</R><R className="box f" style={{marginTop:14}}><p className="sans" style={{margin:0}} id="st">{status}</p>{api&&api.pickup.enabled&&<p className="sans">Pickup: {api.pickup.address||api.pickup.instructions}</p>}
  <label htmlFor="pin">Delivery PIN code</label><input id="pin" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} inputMode="numeric" maxLength={6} placeholder="6-digit PIN"/><p style={{margin:'10px 0 0'}}><button className="btn o" onClick={check}>Check availability</button></p><p className="sans" aria-live="polite">{pr}</p></R></section>
 <section className="w" id="faq"><R as="h2">FAQs</R><div style={{marginTop:10}}>{FAQ.map(([a,b])=><details key={a}><summary>{a}</summary><p>{b}</p></details>)}</div></section>
 </main>
 <footer id="contact"><div className="w"><img src={img(LOGO)} alt={(biz.name||'Mood Matcha')+' logo'} style={{height:76,width:76,borderRadius:14,marginBottom:10,display:'block'}}/><b>{biz.name||'Mood Matcha'}</b>
  <p>{[biz.phone&&'Phone: '+biz.phone,biz.email&&'Email: '+biz.email,(conf.pickup.address||conf.pickup.instructions)&&'Pickup: '+(conf.pickup.address||conf.pickup.instructions)].filter(Boolean).map((t,i)=><span key={i}>{t}<br/></span>)}{'Hours: '+hoursSummary(conf.hours)}</p>
  <p><a href="#faq">FAQs</a> · Privacy Policy (to be supplied) · Terms (to be supplied) · Cancellation &amp; refunds (to be supplied)</p></div></footer>

 <Dlg open={!!prod} onClose={()=>setProd(null)} label="Customise drink">{prod&&<ProductForm p={prod} O={O} onClose={()=>setProd(null)} onAdd={l=>{add(l);setProd(null);setCartOpen(true)}}/>}</Dlg>
 <Dlg open={!!info} onClose={()=>setInfo(null)} label="Offer details">{info&&<div className="dp"><h2 style={{fontSize:26}}>{info.t}</h2><p>{info.d}</p><p className="sans" style={{fontSize:14}}>{info.cond}</p><p className="sans"><b>{live(info)?'Active':'Not active yet'}</b></p><a className="btn" style={{textAlign:'center'}} href="#drinks" onClick={()=>setInfo(null)}>Order Now</a><button className="ib" onClick={()=>setInfo(null)}>Close</button></div>}</Dlg>
 <Dlg open={cartOpen} onClose={()=>setCartOpen(false)} className="dr" label="Your cart"><div className="dp"><div style={{display:'flex',justifyContent:'space-between'}}><h2 style={{fontSize:26}}>Your cart</h2><button className="ib" onClick={()=>setCartOpen(false)}>Close</button></div>
  {done?<Done d={done}/>:!cart.length?<><p>Your cart is empty.</p><a className="btn" href="#drinks" onClick={()=>setCartOpen(false)}>Order Now</a></>:<>
   <div>{cart.map(l=><div className="li" key={l.k}><div><b>{l.n}</b><small>{l.opt}{l.note?' · “'+l.note+'”':''}</small><span className="q"><button onClick={()=>setQty(l.k,-1)} aria-label={'Decrease '+l.n}>−</button> {l.q} <button onClick={()=>setQty(l.k,1)} aria-label={'Increase '+l.n}>+</button> <button onClick={()=>setQty(l.k,-99)} style={{width:'auto',padding:'0 10px',borderRadius:99}}>Remove</button></span></div><b>{money(l.u*l.q)}</b></div>)}</div>
   <Coupon applied={coupon} msg={cmsg} apply={applyCoupon}/>
   <Checkout api={api} cart={cart} T={T} coupon={coupon} money={money} onDone={d=>{try{localStorage.setItem('mm_cart','[]')}catch(e){}setCart([]);setCoupon('');location.assign('order.html?new=1&id='+encodeURIComponent(d.id)+'&t='+encodeURIComponent(d.token||''))}} OF={OF}/></>}</div></Dlg>
 </>}
function Coupon({applied,msg,apply}){const [v,setV]=useState('');return <form className="f" style={{display:'flex',gap:8,alignItems:'end'}} onSubmit={e=>{e.preventDefault();apply(v)}}><label style={{flex:1}}>Coupon code<input value={v} onChange={e=>setV(e.target.value)} autoComplete="off"/></label><button className="ib">Apply</button>{applied&&<span className="sans" style={{fontSize:13}}>Applied: {applied}</span>}{msg&&<span className="er" role="alert">{msg}</span>}</form>}
function ProductForm({p,O,onAdd,onClose}){const dr=p.cat==='drinks',[s,setS]=useState(0),[m,setM]=useState(0),[w,setW]=useState(O.sweet.includes('Regular')?'Regular':O.sweet[0]),[q,setQ]=useState(1),[n,setN]=useState('');
 const u=p.p+(dr?O.sizes[s].p+O.milks[m].p:0),qq=Math.max(1,Math.min(20,+q||1)),opt=dr?[O.sizes[s].n,O.milks[m].n,w].join(' · '):'';
 return <div className="dp"><h2 id="pt" style={{fontSize:26}}>{p.n}</h2><img src={img(p.img)} alt="" style={{width:'100%',height:180,objectFit:'cover',borderRadius:12}}/>
  <form className="f" onSubmit={e=>{e.preventDefault();onAdd({k:p.id+opt+n,id:p.id,n:p.n,opt,note:n.trim(),u,q:qq,s,m,w:dr?w:''})}}>
  {dr&&<><fieldset><legend>Size</legend>{O.sizes.map((x,i)=><label key={x.n}><input type="radio" name="s" checked={s===i} onChange={()=>setS(i)}/> {x.n} {x.p?'(+'+money(x.p)+')':''}</label>)}</fieldset>
  <fieldset><legend>Milk</legend>{O.milks.map((x,i)=><label key={x.n}><input type="radio" name="m" checked={m===i} onChange={()=>setM(i)}/> {x.n} {x.p?'(+'+money(x.p)+')':''}</label>)}</fieldset>
  <label>Sweetness<select value={w} onChange={e=>setW(e.target.value)}>{O.sweet.map(x=><option key={x}>{x}</option>)}</select></label></>}
  <label>Quantity<input type="number" min="1" max="20" value={q} onChange={e=>setQ(e.target.value)}/></label><label>Special instructions<textarea rows="2" maxLength="140" value={n} onChange={e=>setN(e.target.value)}/></label>
  <p className="sans" style={{fontWeight:600}}>Unit price {money(u)} · Total {money(u*qq)}</p><button className="btn" style={{width:'100%'}}>Add to cart</button><button type="button" className="ib" style={{width:'100%',marginTop:8}} onClick={onClose}>Cancel</button></form></div>}
function Done({d}){return <div className="box" role="status"><h3 style={{margin:'0 0 6px'}}>Order confirmed</h3><p className="sans" style={{margin:0}}>Order ID: <b>{d.id}</b><br/>Status: {d.status.replace(/_/g,' ')}<br/>Total: ₹{d.total}{d.eta&&<><br/>Estimate: {d.eta} (an estimate, not live tracking)</>}</p><p className="sans"><a className="btn" href={`order.html?id=${encodeURIComponent(d.id)}&t=${encodeURIComponent(d.token||'')}`}>Track order status</a></p></div>}
const hrsOf=a=>hoursSummary(a.hours);
function Checkout({api,cart,T,coupon,money,onDone,OF}){
 const [mode,setMode]=useState(''),[v,setV]=useState({}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[qt,setQt]=useState(null),[qerr,setQerr]=useState(''),idem=useRef('');
 const set=(k,x)=>setV(o=>({...o,[k]:x}));
 const modes=api?[api.delivery.enabled&&['delivery','Delivery'],api.pickup.enabled&&['pickup','Pickup']].filter(Boolean):[];const cur=modes.some(x=>x[0]===mode)?mode:(modes[0]||[])[0];
 const payOpts=api?[api.payment.online&&['online','Pay online (UPI, card, netbanking)'],api.payment.payOnReceipt&&['receipt',cur==='delivery'?'Pay on delivery':'Pay at pickup']].filter(Boolean):[];
 const body=()=>({items:cart.map(l=>({id:l.id,q:l.q,s:l.s,m:l.m,w:l.w,n:l.note})),mode:cur,pin:v.pin||'',coupon});
 useEffect(()=>{if(!api||!cur)return;let stop=false;const t=setTimeout(async()=>{try{const x=await post('/api/quote',body());if(!stop){setQt(x);setQerr('')}}catch(e){if(!stop){setQt(null);setQerr((e.data&&e.data.error)?e.message:'We couldn’t update your total. Please check your connection.')}}},300);return()=>{stop=true;clearTimeout(t)}},[api,cart,cur,v.pin,coupon]);
 const hint=T.hint;
  if(!modes.length||!api.ordering.enabled)return <div className="box"><b>Online ordering is temporarily unavailable.</b><p className="sans" style={{fontSize:14,margin:'6px 0 0'}}>Please try again later.</p></div>;
 const submit=async e=>{e.preventDefault();if(busy)return;const er=[],d=cur==='delivery',pay=v.payment||payOpts[0][0];
  if((v.name||'').trim().length<2)er.push('Enter your name.');if(!/^[6-9]\d{9}$/.test((v.phone||'').replace(/[\s-]/g,'').replace(/^\+91/,'')))er.push('Enter a valid 10-digit mobile number.');
  if(d){if((v.address||'').trim().length<8)er.push('Enter your full address.');if(!/^\d{6}$/.test(v.pin||''))er.push('Enter a valid 6-digit PIN code.')}
  if(!d&&v.collector==='other'){if((v.cname||'').trim().length<2)er.push('Enter the name of the person collecting.');if((v.cphone||'').trim()&&!/^[6-9]\d{9}$/.test(v.cphone.replace(/[\s-]/g,'').replace(/^\+91/,'')))er.push('Enter a valid 10-digit mobile number for the collector.')}
  if(er.length)return setErr(er.join('\n'));if(qt&&qt.problem)return setErr(qt.problem);
  setBusy(true);setErr('');idem.current=idem.current||crypto.randomUUID();
  try{const r=await post('/api/orders',{...body(),name:v.name,phone:v.phone,address:d?v.address:'',instructions:d?v.instructions:'',collectorName:!d&&v.collector==='other'?v.cname:'',collectorPhone:!d&&v.collector==='other'?v.cphone:'',payment:pay,key:idem.current});
   if(r.razorpay)return pay2(r);fin(r)}catch(x){setBusy(false);const fl=x.data&&x.data.fields;setErr(((x.data&&x.data.error)?x.message:'We couldn’t place your order right now. Your order was not placed. Please check your connection and try again.')+(fl?'\n'+Object.values(fl).join('\n'):''))}};
 const fin=r=>{const o=r.order;if(!o.confirmed){setBusy(false);return setErr('Your order is not confirmed.')}onDone({...o,token:r.token})};
 const pay2=r=>{const go=()=>new window.Razorpay({key:r.razorpay.keyId,amount:r.razorpay.amount,currency:'INR',order_id:r.razorpay.orderId,name:api.business.name||'Mood Matcha',prefill:{name:v.name,contact:v.phone},
   handler:async x=>{try{const o=await post('/api/payments/verify',{id:r.order.id,t:r.token,...x});fin({order:o.order,token:r.token})}catch(e){setBusy(false);setErr('Payment could not be verified, so your order is NOT confirmed. If you were charged, contact the café with order ID '+r.order.id+'.')}},
   modal:{ondismiss:()=>{setBusy(false);setErr('Payment was not completed. Your order is not confirmed.')}}}).open();
  if(window.Razorpay)return go();const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=go;s.onerror=()=>{setBusy(false);setErr('Could not load the payment window. Your order is not confirmed.')};document.head.appendChild(s)};
 const d=cur==='delivery',bad=(qt&&qt.problem&&d&&(v.pin||'').length===6)||(qt&&qt.coupon&&!qt.coupon.ok);
 return <form className="f" onSubmit={submit} noValidate><p className="sans" style={{fontSize:14}}>{hint}</p>
  <fieldset><legend>Order type</legend>{modes.map(([k,l])=><label key={k}><input type="radio" name="mode" checked={cur===k} onChange={()=>setMode(k)}/> {l}</label>)}</fieldset>
  <label>Name<input value={v.name||''} onChange={e=>set('name',e.target.value)} autoComplete="name" maxLength="80"/></label><label>Mobile number<input value={v.phone||''} onChange={e=>set('phone',e.target.value)} inputMode="tel" autoComplete="tel"/></label>
  {d?<><label>Full address<textarea rows="3" maxLength="300" value={v.address||''} onChange={e=>set('address',e.target.value)} autoComplete="street-address"/></label><label>PIN code<input value={v.pin||''} onChange={e=>set('pin',e.target.value.replace(/\D/g,''))} inputMode="numeric" maxLength="6" autoComplete="postal-code"/></label><label>Delivery instructions (optional)<textarea rows="2" maxLength="200" value={v.instructions||''} onChange={e=>set('instructions',e.target.value)}/></label><p className="sans" style={{fontSize:13,color:'var(--mut)',margin:'8px 0 0'}}>{api.delivery.chargeNote||'A delivery charge for courier travel is added to your total.'}</p></>
   :<><div className="box sans" style={{fontSize:14,marginTop:10}}><b>Pickup</b><br/>{api.pickup.address||api.pickup.instructions}{api.pickup.address&&api.pickup.instructions&&<><br/>{api.pickup.instructions}</>}{api.pickup.note&&<><br/>{api.pickup.note}</>}<br/>{hrsOf(api)}</div>
   {api.pickupCollector&&<><fieldset><legend>Who will collect?</legend><label><input type="radio" name="collector" checked={(v.collector||'self')==='self'} onChange={()=>set('collector','self')}/> I will collect it</label><label><input type="radio" name="collector" checked={v.collector==='other'} onChange={()=>set('collector','other')}/> Someone else will collect it</label></fieldset>
   {v.collector==='other'&&<><label>Collector’s name<input value={v.cname||''} onChange={e=>set('cname',e.target.value)} maxLength="80"/></label><label>Collector’s mobile number (optional)<input value={v.cphone||''} onChange={e=>set('cphone',e.target.value)} inputMode="tel"/></label><p className="sans" style={{fontSize:13,color:'var(--mut)',margin:'8px 0 0'}}>They should show your order number at the counter.</p></>}</>}</>}
  <label>Payment<select value={v.payment||payOpts[0][0]} onChange={e=>set('payment',e.target.value)}>{payOpts.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
  <div className="sans" style={{marginTop:12}} aria-live="polite">{qt?<>Subtotal {money(qt.sub)}<br/>{qt.discounts.map(x=><span key={x.name}>{x.name} −{money(x.amt)}<br/></span>)}{d&&qt.zone&&<>Delivery charge ({qt.zone}) {money(qt.fee)}<br/></>}{qt.tax>0&&<>Tax {money(qt.tax)}<br/></>}<b>Total {money(qt.total)}</b>{qt.eta&&<><br/>Estimate: {qt.eta} <small>(an estimate, not live tracking)</small></>}{qt.problem&&(!d||(v.pin||'').length===6)&&<><br/><span className="er">{qt.problem}</span></>}{qt.coupon&&!qt.coupon.ok&&<><br/><span className="er">{qt.coupon.message}</span></>}</>:qerr&&<span className="er">{qerr}</span>}</div>
  <p className="er" role="alert" style={{whiteSpace:'pre-line'}}>{err}</p><button className="btn" style={{width:'100%'}} disabled={busy||!!bad}>{busy?'Placing order…':'Place order'}</button></form>}
