/* =========================================================
   Stockroom — Supabase adapter
   Gives the app the same `window.claude.use('db'|'user'|'assets'|'downloads')`
   interface it has inside claude.ai, backed by Supabase (Auth + Postgres + Realtime + Storage).
   ========================================================= */
(function(){
"use strict";
const CFG=window.STOCKROOM_CONFIG||{};
const SR=window.SR={standalone:true,photoBase:'',signOut:function(){}};
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sb=null,session=null,profile=null;
const ROLE_OK=['viewer','clerk','manager','admin'];

/* ---------- error mapping ---------- */
function mapErr(e){
  const msg=(e&&e.message)||'';
  const code=(e&&(e.code==='42501'||/row-level security|permission denied|not authorized|violates/i.test(msg)))?'permission_denied':((e&&e.code)||'error');
  return {code,message:msg};
}
const TH_ERR=[[/Invalid login credentials/i,'อีเมลหรือรหัสผ่านไม่ถูกต้อง'],[/already registered|already been registered/i,'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ'],[/Password should be at least/i,'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'],[/Email not confirmed/i,'ยังไม่ได้ยืนยันอีเมล ตรวจกล่องจดหมายของคุณ'],[/rate limit|too many/i,'ส่งคำขอบ่อยเกินไป รอสักครู่แล้วลองใหม่'],[/signups? (are )?(not allowed|disabled)/i,'ระบบปิดรับสมัครผู้ใช้ใหม่ ติดต่อผู้ดูแลระบบ'],[/Failed to fetch|NetworkError|network/i,'เชื่อมต่ออินเทอร์เน็ตหรือเซิร์ฟเวอร์ไม่ได้']];
const thErr=m=>{for(const [re,t] of TH_ERR)if(re.test(m||''))return t;return m||'เกิดข้อผิดพลาด'};

/* ---------- tiny IndexedDB key/value cache (delta sync) ---------- */
let idb=null;
function idbOpen(){
  if(idb)return idb;
  idb=new Promise(res=>{try{const r=indexedDB.open('stockroom-cache',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)}catch(e){res(null)}});
  return idb;
}
async function idbGet(k){const d=await idbOpen();if(!d)return null;return new Promise(res=>{try{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}})}
async function idbSet(k,v){const d=await idbOpen();if(!d)return;try{d.transaction('kv','readwrite').objectStore('kv').put(v,k)}catch(e){}}
const cacheKey=name=>'v1|'+(CFG.supabaseUrl||'')+'|'+(session&&session.user.id)+'|'+name;

/* ---------- record-backed collections ---------- */
const stores={};
function snapOf(c){const docs=[...c.map].map(([id,d])=>({id,exists:true,data:()=>d,metadata:{}}));return {docs,size:docs.length,empty:!docs.length}}
function emit(c){
  if(c.t)return;
  c.t=setTimeout(()=>{c.t=0;const s=snapOf(c);c.ls.forEach(f=>{try{f.ok(s)}catch(e){console.error(e)}})},0);
}
function persist(c){
  clearTimeout(c.pt);
  c.pt=setTimeout(()=>idbSet(cacheKey(c.name),{cursor:c.cursor,rows:[...c.map]}),800);
}
function applyRow(c,r){
  if(!r||!r.id)return;
  if(r.deleted)c.map.delete(r.id);else c.map.set(r.id,r.data||{});
  if(r.updated_at&&r.updated_at>c.cursor)c.cursor=r.updated_at;
}
async function fetchDelta(c){
  const page=1000;let from=0;
  const since=c.cursor?new Date(Date.parse(c.cursor)-5000).toISOString():'';
  for(;;){
    let q=sb.from('records').select('id,data,deleted,updated_at').eq('col',c.name).order('updated_at',{ascending:true}).order('id',{ascending:true}).range(from,from+page-1);
    if(since)q=q.gte('updated_at',since);
    const {data,error}=await q;
    if(error)throw mapErr(error);
    (data||[]).forEach(r=>applyRow(c,r));
    if(!data||data.length<page)break;
    from+=page;
  }
}
async function startStore(c){
  try{
    const cached=await idbGet(cacheKey(c.name));
    if(cached&&Array.isArray(cached.rows)){c.map=new Map(cached.rows);c.cursor=cached.cursor||'';c.cachedOnly=true;emit(c)}
    await fetchDelta(c);
    c.loaded=true;emit(c);persist(c);
    let seenSub=false;
    c.ch=sb.channel('rec-'+c.name).on('postgres_changes',{event:'*',schema:'public',table:'records',filter:'col=eq.'+c.name},p=>{
      const r=p.new&&p.new.id?p.new:null;if(!r)return;
      applyRow(c,r);emit(c);persist(c);
    }).subscribe(st=>{
      if(st==='SUBSCRIBED'){if(seenSub)fetchDelta(c).then(()=>{emit(c);persist(c)}).catch(()=>{});seenSub=true}
    });
  }catch(e){c.ls.forEach(f=>f.err&&f.err(e));c.started=false}
}
function recStore(name){
  if(stores[name])return stores[name];
  const c=stores[name]={name,map:new Map(),cursor:'',ls:new Set(),loaded:false,started:false,t:0,pt:0};
  return c;
}
function recCollection(name){
  const c=recStore(name);
  return {
    onSnapshot(ok,err){
      const l={ok,err};c.ls.add(l);
      if(!c.started){c.started=true;startStore(c)}
      else if(c.loaded)setTimeout(()=>ok(snapOf(c)),0);
      return ()=>c.ls.delete(l);
    },
    doc(id){return {
      async set(data){
        const {error}=await sb.from('records').upsert({col:name,id,data,deleted:false},{onConflict:'col,id'});
        if(error)throw mapErr(error);
        c.map.set(id,JSON.parse(JSON.stringify(data)));emit(c);
      },
      async delete(){
        const {data,error}=await sb.from('records').update({deleted:true,data:{}}).eq('col',name).eq('id',id).select('id');
        if(error)throw mapErr(error);
        if(!data||!data.length)throw {code:'permission_denied',message:'no row updated'};
        c.map.delete(id);emit(c);
      }
    }}
  };
}

/* ---------- profiles exposed as the app's "members" and "seen" collections ---------- */
const prof={map:new Map(),loaded:false,started:false,ls:{members:new Set(),seen:new Set()}};
const profSnap=kind=>{
  const docs=[...prof.map.values()].map(p=>({id:p.id,exists:true,metadata:{},data:()=>kind==='members'?{role:ROLE_OK.includes(p.role)?p.role:''}:{at:p.last_seen?Date.parse(p.last_seen):0}}));
  return {docs,size:docs.length,empty:!docs.length};
};
function profEmit(){
  ['members','seen'].forEach(k=>prof.ls[k].forEach(f=>{try{f.ok(profSnap(k))}catch(e){console.error(e)}}));
}
async function profStart(){
  try{
    const {data,error}=await sb.from('profiles').select('id,name,role,last_seen');
    if(error)throw mapErr(error);
    (data||[]).forEach(p=>prof.map.set(p.id,p));
    prof.loaded=true;profEmit();
    sb.channel('profiles-all').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},p=>{
      const r=p.new&&p.new.id?p.new:null;if(!r)return;
      prof.map.set(r.id,r);
      if(session&&r.id===session.user.id&&profile&&r.role!==profile.role){setTimeout(()=>location.reload(),700)}
      profEmit();
    }).subscribe();
  }catch(e){['members','seen'].forEach(k=>prof.ls[k].forEach(f=>f.err&&f.err(e)));prof.started=false}
}
function profCollection(kind){
  return {
    onSnapshot(ok,err){
      const l={ok,err};prof.ls[kind].add(l);
      if(!prof.started){prof.started=true;profStart()}else if(prof.loaded)setTimeout(()=>ok(profSnap(kind)),0);
      return ()=>prof.ls[kind].delete(l);
    },
    doc(id){return {
      async set(data){
        if(kind==='seen'){const {error}=await sb.rpc('touch_seen');if(error)throw mapErr(error);return}
        const role=ROLE_OK.includes(data&&data.role)?data.role:'pending';
        const {data:rows,error}=await sb.from('profiles').update({role}).eq('id',id).select('id');
        if(error)throw mapErr(error);
        if(!rows||!rows.length)throw {code:'permission_denied',message:'no row updated'};
      },
      async delete(){
        if(kind==='seen')return;
        const {data:rows,error}=await sb.from('profiles').update({role:'pending'}).eq('id',id).select('id');
        if(error)throw mapErr(error);
        if(!rows||!rows.length)throw {code:'permission_denied',message:'no row updated'};
      }
    }}
  };
}
const dbApi={collection:name=>name==='members'||name==='seen'?profCollection(name):recCollection(name)};

/* ---------- user / assets / downloads ---------- */
const userApi={
  me:async()=>({id:session.user.id,name:profile.name||'',email:null}),
  id:async()=>session.user.id,
  canEdit:async()=>profile.role==='admin',
  isOwner:async()=>profile.role==='admin',
  can:async n=>n==='data.write'?profile.role!=='viewer':null,
  profiles:async ids=>{
    const out={};
    const miss=ids.filter(i=>!prof.map.has(i));
    if(miss.length&&!prof.loaded){try{const {data}=await sb.from('profiles').select('id,name,role,last_seen').in('id',miss);(data||[]).forEach(p=>prof.map.set(p.id,p))}catch(e){}}
    ids.forEach(i=>{const p=prof.map.get(i);out[i]={id:i,name:(p&&p.name)||'',guest:false}});
    return out;
  },
  search:async q=>{q=(q||'').toLowerCase();return [...prof.map.values()].filter(p=>!q||(p.name||'').toLowerCase().includes(q)).slice(0,20).map(p=>({id:p.id,name:p.name||''}))}
};
const assetApi={
  upload:async blob=>{
    const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2));
    const {error}=await sb.storage.from('photos').upload(id,blob,{contentType:blob.type||'image/jpeg',cacheControl:'31536000',upsert:false});
    if(error)throw mapErr(error);
    return {id,url:SR.photoBase+id,sizeBytes:blob.size,contentType:blob.type||'image/jpeg'};
  },
  delete:async id=>{const {error}=await sb.storage.from('photos').remove([id]);if(error)throw mapErr(error);return {deleted:true}},
  list:async()=>({assets:[],usage:{}})
};
const MIME={csv:'text/csv;charset=utf-8',html:'text/html;charset=utf-8',pdf:'application/pdf',json:'application/json',txt:'text/plain;charset=utf-8'};
const dlApi={save:async({filename,data})=>{
  const ext=String(filename).split('.').pop().toLowerCase();
  const blob=data instanceof Blob?data:new Blob([data],{type:MIME[ext]||'application/octet-stream'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
  return {status:'saved'};
}};

/* ---------- auth gate (login / waiting for approval) ---------- */
function overlay(html){
  let o=$('#srAuth');
  if(!o){o=document.createElement('div');o.id='srAuth';o.className='modal-bg';o.style.zIndex=90;document.body.appendChild(o)}
  o.innerHTML='<div class="modal" role="dialog" aria-modal="true" style="max-width:440px">'+html+'</div>';
  return o;
}
const closeOverlay=()=>{const o=$('#srAuth');if(o)o.remove()};
const brand='<div class="modal-h" style="padding-bottom:4px"><svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="13" fill="#f0900c"/><path d="M12 19l12-6 12 6v12l-12 6-12-6z" fill="none" stroke="#1b1100" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 19l12 6 12-6M24 25v12" fill="none" stroke="#1b1100" stroke-width="2.6" stroke-linejoin="round"/></svg><div><h2 style="font-family:var(--font-display)">STOCKROOM</h2><div class="sub">ระบบจัดการคลังสินค้า</div></div></div>';

function showSetup(resolve){
  const o=overlay(brand+'<div class="modal-b"><div class="banner">⚠<span>ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase</span></div><p class="sub" style="line-height:1.7">แก้ไฟล์ <b class="mono">config.js</b> (หรือกำหนดค่า <b class="mono">SUPABASE_URL</b> และ <b class="mono">SUPABASE_ANON_KEY</b> ใน Cloudflare Pages) ตามขั้นตอนใน README</p></div><div class="modal-f"><button class="btn" type="button" id="srDemo">ลองใช้โหมดทดลอง (ข้อมูลไม่ถูกบันทึก)</button></div>');
  $('#srDemo',o).onclick=()=>{closeOverlay();resolve('offline')};
}
function showLogin(){
  return new Promise(resolve=>{
    let mode='in';
    const draw=(msg,kind)=>{
      const o=overlay(brand+'<form id="srForm" novalidate><div class="modal-b"><div class="seg" role="group" style="width:100%;margin-bottom:14px"><button type="button" data-m="in" aria-pressed="'+(mode==='in')+'" style="flex:1">เข้าสู่ระบบ</button><button type="button" data-m="up" aria-pressed="'+(mode==='up')+'" style="flex:1">สมัครใช้งาน</button></div>'
       +(mode==='up'?'<div class="fld" style="margin-bottom:12px"><label for="sr-name">ชื่อ-นามสกุล <i>*</i></label><input class="in-ctl" id="sr-name" autocomplete="name"></div>':'')
       +'<div class="fld" style="margin-bottom:12px"><label for="sr-mail">อีเมล <i>*</i></label><input class="in-ctl" id="sr-mail" type="email" autocomplete="email" inputmode="email"></div>'
       +'<div class="fld"><label for="sr-pw">รหัสผ่าน <i>*</i>'+(mode==='up'?' (อย่างน้อย 8 ตัวอักษร)':'')+'</label><input class="in-ctl" id="sr-pw" type="password" autocomplete="'+(mode==='up'?'new-password':'current-password')+'"></div>'
       +'<div id="srMsg" class="banner'+(kind==='ok'?' info':'')+'" style="margin:14px 0 0;'+(msg?'':'display:none')+'" role="alert">'+esc(msg||'')+'</div>'
       +(mode==='up'?'<p class="sub" style="margin:12px 0 0">บัญชีใหม่ต้องรอผู้ดูแลระบบอนุมัติก่อนจึงจะเห็นข้อมูล</p>':'')
       +'</div><div class="modal-f"><button class="btn primary" type="submit" id="srGo" style="width:100%;justify-content:center">'+(mode==='in'?'เข้าสู่ระบบ':'สมัครใช้งาน')+'</button></div></form>');
      $$('[data-m]',o).forEach(b=>b.onclick=()=>{mode=b.dataset.m;draw()});
      $('#srForm',o).onsubmit=async e=>{
        e.preventDefault();
        const mail=$('#sr-mail',o).value.trim(),pw=$('#sr-pw',o).value,nm=mode==='up'?$('#sr-name',o).value.trim():'';
        const say=(m,k)=>{const x=$('#srMsg',o);x.textContent=m;x.style.display='';x.className='banner'+(k==='ok'?' info':'')};
        if(!mail||!pw||(mode==='up'&&!nm)){say('กรอกข้อมูลให้ครบ');return}
        if(mode==='up'&&pw.length<8){say('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');return}
        const go=$('#srGo',o);go.disabled=true;
        try{
          if(mode==='in'){
            const {data,error}=await sb.auth.signInWithPassword({email:mail,password:pw});
            if(error)throw error;session=data.session;resolve();
          }else{
            const {data,error}=await sb.auth.signUp({email:mail,password:pw,options:{data:{name:nm}}});
            if(error)throw error;
            if(data.session){session=data.session;resolve()}
            else{go.disabled=false;say('สมัครแล้ว — ตรวจอีเมลเพื่อกดยืนยัน แล้วกลับมาเข้าสู่ระบบ','ok')}
          }
        }catch(err){go.disabled=false;say(thErr(err&&err.message))}
      };
      const f=$(mode==='up'?'#sr-name':'#sr-mail',o);if(f&&!matchMedia('(max-width:640px)').matches)f.focus();
    };
    draw();
  });
}
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
async function loadProfile(){
  const {data,error}=await sb.from('profiles').select('id,name,role,last_seen').eq('id',session.user.id).maybeSingle();
  if(error)throw mapErr(error);
  return data;
}
function showPending(){
  return new Promise(resolve=>{
    const o=overlay(brand+'<div class="modal-b"><div class="banner info" style="align-items:flex-start">⏳<div><b>บัญชีของคุณรอการอนุมัติ</b><div class="sub" style="color:inherit">ผู้ดูแลระบบต้องกำหนดบทบาทให้ก่อน จึงจะเห็นข้อมูลคลังสินค้า หน้านี้จะเปิดให้อัตโนมัติเมื่ออนุมัติแล้ว</div></div></div><p class="sub">เข้าสู่ระบบเป็น <b>'+esc((profile&&profile.name)||session.user.email||'')+'</b></p></div><div class="modal-f"><button class="btn" type="button" id="srOut">ออกจากระบบ</button></div>');
    $('#srOut',o).onclick=()=>SR.signOut();
    const t=setInterval(async()=>{try{const p=await loadProfile();if(p&&ROLE_OK.includes(p.role)){clearInterval(t);profile=p;resolve()}}catch(e){}},6000);
  });
}
let gateP=null;
function gate(){return gateP||(gateP=start())}
async function start(){
  if(!CFG.supabaseUrl||!CFG.supabaseAnonKey||!window.supabase){
    return new Promise(res=>showSetup(res));
  }
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  SR.photoBase=CFG.supabaseUrl.replace(/\/$/,'')+'/storage/v1/object/public/photos/';
  SR.signOut=async()=>{try{await sb.auth.signOut()}catch(e){}try{indexedDB.deleteDatabase('stockroom-cache')}catch(e){}location.reload()};
  const {data}=await sb.auth.getSession();session=data&&data.session;
  if(!session)await showLogin();
  try{profile=await loadProfile()}catch(e){profile=null}
  if(!profile){overlay(brand+'<div class="modal-b"><div class="banner">⚠<span>ไม่พบโปรไฟล์ผู้ใช้ — ตรวจว่ารัน supabase/schema.sql ครบแล้ว</span></div></div><div class="modal-f"><button class="btn" type="button" id="srOut">ออกจากระบบ</button></div>');$('#srOut').onclick=()=>SR.signOut();return new Promise(()=>{})}
  if(!ROLE_OK.includes(profile.role))await showPending();
  closeOverlay();
  try{sb.rpc('touch_seen')}catch(e){}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')Object.values(stores).forEach(c=>{if(c.loaded)fetchDelta(c).then(()=>{emit(c);persist(c)}).catch(()=>{})})});
  return 'ok';
}
window.claude={use:async name=>{
  if(name==='downloads')return dlApi;
  if(name!=='db'&&name!=='user'&&name!=='assets')return null;
  const g=await gate();
  if(g==='offline')return null;
  if(name==='db')return dbApi;
  if(name==='user')return userApi;
  return (profile.role==='manager'||profile.role==='admin')?assetApi:null;
}};
})();
