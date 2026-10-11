/* =========================================================
   Stockroom — core: helpers, icons, state, store, derived stock
   ========================================================= */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const DAY=86400000;
const startOfDay=ts=>{const d=new Date(ts);d.setHours(0,0,0,0);return d.getTime()};
const nfQ=new Intl.NumberFormat('th-TH',{maximumFractionDigits:3});
const nf0=new Intl.NumberFormat('th-TH',{maximumFractionDigits:0});
const nf2=new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const q3=x=>Math.round((+x||0)*1000)/1000;
const fq=n=>nfQ.format(q3(n));
const money=n=>'฿'+nf0.format(Math.round(n||0));
const money2=n=>'฿'+nf2.format(n||0);
const dShort=ts=>new Date(ts).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
const tShort=ts=>new Date(ts).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',hour12:false});
const dtShort=ts=>dShort(ts)+' '+tShort(ts);
const rel=ts=>{const d=Date.now()-ts;if(d<6e4)return 'เมื่อสักครู่';if(d<36e5)return Math.floor(d/6e4)+' นาทีที่แล้ว';if(d<DAY)return Math.floor(d/36e5)+' ชม.ที่แล้ว';if(d<7*DAY)return Math.floor(d/DAY)+' วันที่แล้ว';return dShort(ts)};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const num=v=>{const n=parseFloat(String(v).replace(/,/g,''));return isFinite(n)?n:NaN};
const reduceMotion=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICONS={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.8"/>',
  box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  pin:'<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  in:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  out:'<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  swap:'<path d="M4 8h14"/><path d="M14 4l4 4-4 4"/><path d="M20 16H6"/><path d="M10 12l-4 4 4 4"/>',
  chart:'<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  alert:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',
  wh:'<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
  adj:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 13l2 2 4-4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  db:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  dl:'<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  scan:'<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M8 9v6M12 9v6M16 9v6"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2c1.5.3 2.5.8 2.5 2s-1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5V8m0 8v1.5"/>',
  layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  zap:'<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.2 4.5 2.1 4.5 5.3"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  out2:'<path d="M10 4H5a1 1 0 00-1 1v14a1 1 0 001 1h5"/><path d="M15 8l4 4-4 4"/><path d="M19 12H9"/>',
  print:'<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="9" rx="2"/><path d="M7 14h10v7H7z"/>'
};
const ic=(n,cls)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'+(cls?' class="'+cls+'"':'')+'>'+(ICONS[n]||'')+'</svg>';

const TYPES={
  IN:{pfx:'GR',name:'รับเข้า',en:'Goods Receipt',icon:'in',party:'ผู้ส่งของ / Supplier',ref:'อ้างอิง PO / ใบส่งของ',submit:'บันทึกรับเข้า'},
  OUT:{pfx:'GI',name:'จ่ายออก',en:'Goods Issue',icon:'out',party:'ผู้เบิก / ปลายทาง (งาน, หน่วยงาน)',ref:'อ้างอิงใบเบิก / Work Order',submit:'บันทึกจ่ายออก'},
  TRF:{pfx:'TR',name:'ย้าย Location',en:'Stock Transfer',icon:'swap',party:'ผู้ดำเนินการ',ref:'อ้างอิง',submit:'บันทึกการย้าย'},
  ADJ:{pfx:'AJ',name:'ปรับยอด / ตรวจนับ',en:'Stock Adjustment',icon:'adj',party:'ผู้ตรวจนับ',ref:'อ้างอิงใบตรวจนับ',submit:'บันทึกการปรับยอด'}
};
const LOC_TYPES={rack:'ชั้นวาง',floor:'พื้นที่กองวาง',cabinet:'ตู้ / ห้องควบคุม',recv:'พื้นที่รับของ',hold:'กักกัน / รอตรวจ'};
const LVL={out:'หมด',low:'ต่ำกว่า Min',ok:'ปกติ',over:'เกิน Max'};

/* ---------- state ---------- */
const S={items:[],locs:[],docs:[],voids:[],members:[],seen:[],settings:[],loaded:{items:false,locs:false,docs:false,voids:false,members:false,settings:false,seen:false},ready:false,route:'dashboard',live:false,role:'viewer',isAdmin:false,canWrite:true,
  drawer:null,drafts:{},trfMode:'TRF',
  ui:{itemQ:'',itemCat:'all',itemShow:'active',locQ:'',locWh:'all',
    rep:{tab:'stock',view:'item',q:'',cat:'all',loc:'all',hideZero:true,quick:'30',from:'',to:'',types:{IN:1,OUT:1,TRF:1,ADJ:1},item:'',mloc:'',docq:'',limit:100,dtypes:{IN:1,OUT:1,TRF:1,ADJ:1},dstat:'all',dq:'',dlimit:100}}};
let D={voidMap:new Map(),usedItem:new Set(),usedLoc:new Set(),itemById:new Map(),locById:new Map(),moves:[],bal:new Map(),itemQty:new Map(),itemLocs:new Map(),locQty:new Map(),locStats:new Map(),totalValue:0,catValue:[],lows:[],maxLocVal:0};
let DB=null,USER=null,ASSETS=null,ME={id:'',name:''};
const COL={items:'items',locs:'locations',docs:'docs',voids:'voids',members:'members',seen:'seen',settings:'settings'};
const CORE_COLS=['items','locs','docs','voids','members','settings'];

/* ---------- derived stock (ledger -> balance per item x location) ---------- */
function docMoves(d){
  const mv=[];
  (d.lines||[]).forEach((l,i)=>{
    const b={docId:d.id,docNo:d.no||'',type:d.type,ts:d.ts||0,by:d.by||'',ref:d.ref||'',party:d.party||'',lot:l.lot||'',line:i,itemId:l.itemId,sku:l.sku||'',name:l.name||'',unit:l.unit||'',cost:+l.cost||0};
    if(d.type==='IN')mv.push({...b,locId:l.locId,qty:+l.qty});
    else if(d.type==='OUT')mv.push({...b,locId:l.locId,qty:-l.qty});
    else if(d.type==='TRF'){mv.push({...b,locId:l.locId,qty:-l.qty,peer:l.toLocId,dir:'out'});mv.push({...b,locId:l.toLocId,qty:+l.qty,peer:l.locId,dir:'in'})}
    else if(d.type==='ADJ')mv.push({...b,locId:l.locId,qty:+l.delta,note:l.reason||''});
  });
  return mv;
}
const mvSort=(a,b)=>a.ts-b.ts||(a.docNo<b.docNo?-1:a.docNo>b.docNo?1:0)||a.line-b.line;
function recompute(){
  D.itemById=new Map(S.items.map(i=>[i.id,i]));
  D.locById=new Map(S.locs.map(l=>[l.id,l]));
  D.voidMap=new Map(S.voids.map(v=>[v.docId||v.id,v]));
  D.usedItem=new Set();D.usedLoc=new Set();
  const mv=[];
  for(const d of S.docs){
    for(const l of (d.lines||[])){D.usedItem.add(l.itemId);D.usedLoc.add(l.locId);if(l.toLocId)D.usedLoc.add(l.toLocId)}
    if(D.voidMap.has(d.id))continue;
    for(const m of docMoves(d))mv.push(m);
  }
  mv.sort(mvSort);
  D.moves=mv;
  const bal=new Map();
  for(const m of mv){const k=m.itemId+'|'+m.locId;bal.set(k,q3((bal.get(k)||0)+m.qty))}
  D.bal=bal;D.itemQty=new Map();D.itemLocs=new Map();D.locQty=new Map();D.locStats=new Map();
  for(const [k,v] of bal){
    if(!v)continue;
    const [iid,lid]=k.split('|');
    D.itemQty.set(iid,q3((D.itemQty.get(iid)||0)+v));
    (D.itemLocs.get(iid)||D.itemLocs.set(iid,[]).get(iid)).push({locId:lid,qty:v});
    const it=D.itemById.get(iid);
    const st=D.locStats.get(lid)||D.locStats.set(lid,{skus:0,value:0,list:[]}).get(lid);
    st.skus++;st.value+=Math.max(0,v)*(it?+it.cost||0:0);st.list.push({itemId:iid,qty:v});
  }
  for(const arr of D.itemLocs.values())arr.sort((a,b)=>b.qty-a.qty);
  let tv=0;const cats=new Map();const lows=[];
  for(const it of S.items){
    const qn=D.itemQty.get(it.id)||0;const val=Math.max(0,qn)*(+it.cost||0);
    if(it.active!==false){
      tv+=val;const c=it.cat||'ไม่ระบุหมวด';cats.set(c,(cats.get(c)||0)+val);
      const lv=levelOf(it,qn);if(lv==='low'||lv==='out')lows.push({it,qty:qn,lv});
    }
  }
  D.totalValue=tv;
  D.catValue=[...cats].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  lows.sort((a,b)=>(a.lv==='out'?0:1)-(b.lv==='out'?0:1)||(a.qty/(a.it.min||1))-(b.qty/(b.it.min||1)));
  D.lows=lows;
  D.maxLocVal=Math.max(0,...[...D.locStats.values()].map(s=>s.value));
}
function levelOf(it,qn){
  if(qn<=0)return 'out';
  if(+it.min>0&&qn<=+it.min)return 'low';
  if(+it.max>0&&qn>+it.max)return 'over';
  return 'ok';
}
const qtyAt=(iid,lid)=>D.bal.get(iid+'|'+lid)||0;
const itemQ=iid=>D.itemQty.get(iid)||0;
const activeLocs=()=>S.locs.filter(l=>l.active!==false).sort((a,b)=>String(a.code).localeCompare(String(b.code),'th'));
const locCode=id=>{const l=D.locById.get(id);return l?l.code:'(ถูกลบ)'};
const itemName=id=>{const i=D.itemById.get(id);return i?i.name:'(ถูกลบ)'};
const lvPill=(it,qn)=>{const k=levelOf(it,qn);return '<span class="pill '+k+'">'+LVL[k]+'</span>'};
const typePill=(m)=>{const t=m.type;let lbl=TYPES[t].name;if(t==='TRF')lbl=m.dir==='in'?'ย้ายเข้า':m.dir==='out'?'ย้ายออก':'ย้าย';return '<span class="pill '+t+'">'+lbl+'</span>'};
const byHtml=by=>by?'<span data-uid="'+esc(by)+'">…</span>':'—';
const PFX=Object.fromEntries(Object.entries(TYPES).map(([k,v])=>[k,v.pfx]));
function nextNo(type,ts){
  const d=new Date(ts);const p=PFX[type]+'-'+String(d.getFullYear()).slice(2)+pad(d.getMonth()+1)+'-';let mx=0;
  for(const x of S.docs){if(x.no&&x.no.startsWith(p)){const n=parseInt(x.no.slice(p.length),10);if(n>mx)mx=n}}
  return p+String(mx+1).padStart(4,'0');
}

/* ---------- roles & permissions (UI-level; see admin page for the honest limits) ---------- */
const ROLES={
  admin:{name:'ผู้ดูแลระบบ',en:'Admin',desc:'ทำได้ทุกอย่าง รวมถึงจัดการผู้ใช้ ตั้งค่าองค์กร และล้างข้อมูลตัวอย่าง'},
  manager:{name:'ผู้จัดการคลัง',en:'Manager',desc:'ทำธุรกรรมทุกประเภท ปรับยอด ยกเลิก/กู้คืนเอกสาร และจัดการข้อมูลสินค้า-Location'},
  clerk:{name:'เจ้าหน้าที่คลัง',en:'Clerk',desc:'บันทึกรับเข้า จ่ายออก ย้าย Location พิมพ์เอกสาร และดูรายงาน'},
  viewer:{name:'ผู้ดูข้อมูล',en:'Viewer',desc:'ดูข้อมูลและรายงาน ส่งออกไฟล์ และพิมพ์เอกสาร แต่บันทึกหรือแก้ไขไม่ได้'}
};
const ROLE_ORDER=['admin','manager','clerk','viewer'];
const PERM={doc:['admin','manager','clerk'],adj:['admin','manager'],master:['admin','manager'],void:['admin','manager'],users:['admin'],settings:['admin']};
const PERM_ROWS=[['ดูข้อมูล / รายงาน / ส่งออก CSV / พิมพ์เอกสาร',['admin','manager','clerk','viewer']],['บันทึกรับเข้า · จ่ายออก · ย้าย Location','doc'],['ปรับยอด / ตรวจนับ','adj'],['เพิ่ม-แก้ไข-ลบ สินค้าและ Location · แนบรูป','master'],['ยกเลิก / กู้คืนเอกสาร','void'],['จัดการผู้ใช้ · ตั้งค่าองค์กร · ล้างข้อมูลตัวอย่าง','users']];
const can=k=>S.canWrite&&(PERM[k]||[]).includes(S.role);
const cfg=()=>S.settings.find(x=>x.id==='main')||{};
function resolveRole(){
  if(!DB){S.role='admin';return}
  if(S.isAdmin){S.role='admin';return}
  const m=S.members.find(x=>x.id===ME.id),c=cfg();
  S.role=m&&ROLES[m.role]?m.role:(ROLES[c.defaultRole]?c.defaultRole:'viewer');
  if(!S.canWrite)S.role='viewer';
}
const rolePill=r=>'<span class="pill role-'+r+'">'+(ROLES[r]?ROLES[r].name:r)+'</span>';

/* ---------- void impact: would removing / restoring a document drive any balance negative? ---------- */
function negMap(skip){
  const mv=[];
  for(const d of S.docs){if(skip.has(d.id))continue;for(const m of docMoves(d))mv.push(m)}
  mv.sort(mvSort);
  const run=new Map(),neg=new Map();
  for(const m of mv){
    const k=m.itemId+'|'+m.locId,v=q3((run.get(k)||0)+m.qty);run.set(k,v);
    if(v<-1e-9){const o=neg.get(k);if(!o||v<o.min)neg.set(k,{min:v,ts:m.ts,docNo:m.docNo})}
  }
  return neg;
}
function voidImpact(docId,restoring){
  const base=new Set(D.voidMap.keys()),before=negMap(base),after=new Set(base);
  if(restoring)after.delete(docId);else after.add(docId);
  const nxt=negMap(after),out=[];
  for(const [k,v] of nxt){
    const b=before.get(k);
    if(!b||v.min<b.min-1e-9){const [iid,lid]=k.split('|');out.push({itemId:iid,locId:lid,min:v.min,docNo:v.docNo})}
  }
  return out;
}

/* ---------- product photos (assets capability is writer-only) ---------- */
const photoUrl=id=>id?((window.SR&&window.SR.photoBase)||'/_blob/')+id:'';
function resizeImage(file,max,q){
  max=max||1000;q=q||.85;
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const sc=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*sc)),h=Math.max(1,Math.round(img.height*sc));
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
      c.toBlob(b=>b?res(b):rej(new Error('encode')),'image/jpeg',q);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('decode'))};
    img.src=url;
  });
}
async function uploadPhoto(file){
  if(!ASSETS)throw new Error('no-assets');
  const blob=await resizeImage(file);
  const r=await ASSETS.upload(blob);
  return r.id;
}
async function dropAsset(id){try{if(ASSETS&&id)await ASSETS.delete(id)}catch(e){}}

/* ---------- persistence (shared db, in-memory fallback) ---------- */
async function put(col,id,data){
  if(DB){try{await DB.collection(COL[col]).doc(id).set(data)}catch(e){dbFail(e);throw e}return}
  const arr=S[col];const i=arr.findIndex(x=>x.id===id);const rec={...data,id};
  if(i>=0)arr[i]=rec;else arr.push(rec);
  onData();
}
async function del(col,id){
  if(DB){try{await DB.collection(COL[col]).doc(id).delete()}catch(e){dbFail(e);throw e}return}
  S[col]=S[col].filter(x=>x.id!==id);onData();
}
function dbFail(e){
  const c=e&&e.code;
  toast(c==='quota_exceeded'?'ฐานข้อมูลเต็ม (เกินจำนวนเอกสารสูงสุด) กรุณาลบรายการเก่าที่ไม่ใช้':c==='permission_denied'?'ฐานข้อมูลไม่อนุญาต: บทบาทของคุณไม่มีสิทธิ์ทำรายการนี้':'บันทึกไม่สำเร็จ ('+(c||'error')+') ลองใหม่อีกครั้ง','bad');
}
function subscribeAll(){
  const check=()=>{if(CORE_COLS.every(c=>S.loaded[c]))S.ready=true};
  Object.keys(COL).forEach(col=>{
    DB.collection(COL[col]).onSnapshot(snap=>{
      S[col]=snap.docs.map(d=>({...d.data(),id:d.id}));
      S.loaded[col]=true;check();
      onData();
    },err=>{
      S.loaded[col]=true;check();
      if(col!=='seen')toast('อ่านข้อมูลไม่สำเร็จ ('+((err&&err.code)||'error')+')','bad');
      onData();
    });
  });
  setTimeout(()=>{if(!S.ready){S.ready=true;onData()}},9000);
}

/* ---------- UI helpers ---------- */
function toast(msg,kind){
  const t=document.createElement('div');t.className='toast '+(kind||'good');
  t.innerHTML=ic(kind==='bad'?'alert':'check')+'<span>'+esc(msg)+'</span>';
  $('#toasts').appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),320)},kind==='bad'?5200:3200);
}
function openModal(html,wide){
  closeModal(true);
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modalBg';
  bg.innerHTML='<div class="modal'+(wide?' wide':'')+'" role="dialog" aria-modal="true">'+html+'</div>';
  bg.addEventListener('mousedown',e=>{if(e.target===bg)closeModal()});
  $('#modalRoot').appendChild(bg);
  const f=$('input:not([readonly]),select,textarea',bg);if(f&&!matchMedia('(max-width:640px)').matches)f.focus();
}
function closeModal(){const m=$('#modalBg');if(m)m.remove()}
function openDrawer(kind,id,tab){S.drawer={kind,id,tab:tab||(kind==='item'?'loc':'items')};drawerRender(true)}
function closeDrawer(){
  const bg=$('.drawer-bg'),dr=$('.drawer');S.drawer=null;
  if(!dr)return;bg.classList.add('closing');dr.classList.add('closing');
  setTimeout(()=>{$('#drawerRoot').innerHTML=''},280);
}
function drawerRender(first){
  const s=S.drawer;if(!s)return;
  const html=s.kind==='item'?drawerItem(s):drawerLoc(s);
  if(!html){closeDrawer();return}
  const root=$('#drawerRoot');
  if(first||!$('.drawer',root)){root.innerHTML='<div class="drawer-bg" data-act="drawer-close"></div><aside class="drawer" role="dialog" aria-modal="true">'+html+'</aside>';}
  else{const dr=$('.drawer',root);const sc=dr.scrollTop;dr.innerHTML=html;dr.scrollTop=sc}
  afterRender(root);fillNames(root);
}
function afterRender(root,instant){
  if(instant)$$('[data-w],[data-h]',root).forEach(e=>{e.style.transition='none'});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    $$('[data-w]',root).forEach(e=>e.style.width=e.dataset.w+'%');
    $$('[data-h]',root).forEach(e=>e.style.height=e.dataset.h+'%');
    $$('[data-count]',root).forEach(countUp);
  }));
}
const LASTC={};
function countUp(el){
  const to=+el.dataset.count||0,key=el.dataset.key||'',money_=el.dataset.fmt==='money';
  const from=key&&LASTC[key]!=null?LASTC[key]:0;if(key)LASTC[key]=to;
  const show=v=>{el.textContent=money_?money(v):nf0.format(Math.round(v))};
  if(reduceMotion()||from===to){show(to);return}
  const t0=performance.now(),dur=1000;
  (function step(t){const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,4);show(from+(to-from)*e);if(p<1)requestAnimationFrame(step)})(t0);
}
async function fillNames(root){
  root=root||document;
  const els=$$('[data-uid]',root);if(!els.length||!USER)return;
  const ids=[...new Set(els.map(e=>e.dataset.uid).filter(Boolean))];
  try{const ps=await USER.profiles(ids);els.forEach(e=>{const p=ps[e.dataset.uid];e.textContent=(p&&p.name)||'ผู้ใช้'})}catch(e){}
}
const csvCell=v=>{v=v==null?'':String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
async function saveCsv(name,rows){
  const dl=await getDl();if(!dl){toast('มุมมองนี้ยังดาวน์โหลดไฟล์ไม่ได้','bad');return}
  const data='﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
  try{await dl.save({filename:name,data});toast('ส่งออกไฟล์ '+name+' แล้ว')}
  catch(e){if(!e||e.code!=='declined')toast('ส่งออกไฟล์ไม่สำเร็จ','bad')}
}
let DL;async function getDl(){if(DL===undefined){try{DL=window.claude&&claude.use?await claude.use('downloads'):null}catch(e){DL=null}}return DL}
