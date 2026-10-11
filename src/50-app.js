/* =========================================================
   Router, events, command palette, theme, boot
   ========================================================= */
const ROUTES={
  dashboard:{title:'ภาพรวมคลังสินค้า',crumb:'DASHBOARD',icon:'grid',label:'ภาพรวม',view:vDashboard,after:afterDashboard},
  receive:{title:'รับเข้าสินค้า',crumb:'GOODS RECEIPT',icon:'in',label:'รับเข้า',view:vForm,after:afterForm,update:updateForm,form:true,perm:'doc'},
  issue:{title:'จ่ายสินค้าออก',crumb:'GOODS ISSUE',icon:'out',label:'จ่ายออก',view:vForm,after:afterForm,update:updateForm,form:true,perm:'doc'},
  transfer:{title:'ย้าย Location / ปรับยอด',crumb:'TRANSFER & ADJUST',icon:'swap',label:'ย้าย / ปรับยอด',view:vForm,after:afterForm,update:updateForm,form:true,perm:'doc'},
  items:{title:'สินค้า',crumb:'ITEM MASTER',icon:'box',label:'สินค้า',view:vItems,update:updateItems},
  locations:{title:'Location',crumb:'STORAGE LOCATIONS',icon:'pin',label:'Location',view:vLocations,update:updateLocations},
  reports:{title:'รายงาน',crumb:'REPORTS',icon:'chart',label:'รายงาน',view:vReports,update:updateReports},
  admin:{title:'ผู้ใช้ & ตั้งค่า',crumb:'USERS & SETTINGS',icon:'users',label:'ผู้ใช้ & ตั้งค่า',view:vAdmin,update:updateAdmin,perm:'users'}
};
const NAV=[['ภาพรวม',['dashboard']],['ธุรกรรมคลัง',['receive','issue','transfer']],['ข้อมูลหลัก',['items','locations']],['รายงาน',['reports']],['ระบบ',['admin']]];

const routeOk=k=>{const r=ROUTES[k];return !r.perm||can(r.perm)};
function buildNav(){
  $('#nav').innerHTML=NAV.map(([g,keys])=>{
    keys=keys.filter(routeOk);if(!keys.length)return '';
    return '<div class="nav-label">'+g+'</div>'+keys.map(k=>'<a href="#'+k+'" data-act="go" data-id="'+k+'" id="nav-'+k+'">'+ic(ROUTES[k].icon)+'<span>'+ROUTES[k].label+'</span>'+(k==='items'?'<span class="badge" id="lowBadge" hidden></span>':'')+'</a>').join('');
  }).join('');
  S.navKey=S.role+'|'+S.canWrite;
}
function renderWho(){
  const el=$('#who');if(!el)return;
  const nm=ME.name||'';
  el.innerHTML='<span class="av" aria-hidden="true">'+esc((nm||'ผ').trim().charAt(0).toUpperCase())+'</span><div style="min-width:0;flex:1"><b class="ellip" '+(nm?'':'data-uid="'+esc(ME.id)+'"')+'>'+esc(nm||'…')+'</b>'+rolePill(S.role)+'</div>'+(S.standalone?'<button class="icon-btn sm" type="button" data-act="signout" title="ออกจากระบบ" aria-label="ออกจากระบบ" style="background:transparent;color:var(--side-ink);border-color:var(--side-line)">'+ic('out2')+'</button>':'');
  if(!nm)fillNames(el);
}
function updateNav(){
  Object.keys(ROUTES).forEach(k=>{const a=$('#nav-'+k);if(a){if(k===S.route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}});
  const b=$('#lowBadge');if(b){b.hidden=!D.lows.length;b.textContent=D.lows.length;b.title='สินค้าต่ำกว่า Min หรือหมด'}
}
function syncChip(){
  const el=$('#sync');
  el.innerHTML=S.live?'<span class="dot"></span><span>เชื่อมต่อฐานข้อมูลแล้ว<br>ข้อมูลใช้ร่วมกันทั้งทีม</span>':S.mem?'<span class="dot off"></span><span>โหมดออฟไลน์<br>ข้อมูลจะไม่ถูกบันทึก</span>':'<span class="dot off"></span><span>กำลังเชื่อมต่อ…</span>';
}
function render(enter){
  const R=ROUTES[S.route],v=$('#view');
  if(S.route==='transfer'&&S.trfMode==='ADJ'&&!can('adj'))S.trfMode='TRF';
  $('#pageTitle').textContent=R.title;$('#crumb').textContent=R.crumb;updateNav();
  if(!S.ready){v.innerHTML=skeleton();return}
  if(!S.shown){S.shown=true;enter=true}
  const sy=window.scrollY||0;
  const banner=S.mem?'<div class="banner">'+ic('alert')+'<span>เชื่อมต่อฐานข้อมูลไม่ได้ในมุมมองนี้ ข้อมูลที่บันทึกจะหายเมื่อปิดหน้า</span></div>':'';
  v.innerHTML=banner+(routeOk(S.route)?R.view():noAccess());
  S.sig=S.items.length+'|'+S.locs.length;
  if(enter){v.classList.remove('enter');void v.offsetWidth;v.classList.add('enter');clearTimeout(S.enterT);S.enterT=setTimeout(()=>v.classList.remove('enter'),1200)}
  else window.scrollTo(0,sy);
  afterRender(v,!enter);fillNames(v);
  if(R.after&&routeOk(S.route))R.after(enter);
}
function noAccess(){return '<div class="card"><div class="empty">'+ic('lock','big')+'<h3>คุณไม่มีสิทธิ์เข้าหน้านี้</h3><p>บทบาทของคุณคือ <b>'+esc(ROLES[S.role].name)+'</b> — ติดต่อผู้ดูแลระบบหากต้องการสิทธิ์เพิ่ม</p><button class="btn" type="button" data-act="go" data-id="dashboard">กลับหน้าภาพรวม</button></div></div>'}
function go(r){
  if(!ROUTES[r])r='dashboard';
  const changed=S.route!==r;S.route=r;
  try{if(location.hash!=='#'+r)history.replaceState(null,'','#'+r)}catch(e){}
  document.body.classList.remove('nav-open');
  if(changed){hideTip();if(chartRO){chartRO.disconnect();chartRO=null}window.scrollTo(0,0);render(true)}else render(false);
}
function onData(){
  resolveRole();recompute();syncChip();
  if(S.navKey!==S.role+'|'+S.canWrite){buildNav();renderWho()}
  updateNav();
  if(!S.ready)return;
  markSeen();
  const R=ROUTES[S.route];
  const rs=S.role+'|'+S.canWrite;
  if(S.roleSig!==rs){const first=S.roleSig==null;S.roleSig=rs;renderWho();if(S.shown&&!first){render(false);if(S.drawer)drawerRender(false);return}}
  if(!S.shown){render(true)}
  else if(R.update&&routeOk(S.route)){
    if(S.sig!==S.items.length+'|'+S.locs.length){
      if(R.form){S.sig=S.items.length+'|'+S.locs.length;renderLines(formType());R.update()}else render(false);
    }else R.update();
  }else render(false);
  if(S.drawer)drawerRender(false);
}
function markSeen(){
  if(S.seenDone||!DB||!ME.id||!S.canWrite||!S.loaded.seen)return;
  S.seenDone=true;
  const mine=S.seen.find(x=>x.id===ME.id);
  if(mine&&Date.now()-(mine.at||0)<6*36e5)return;
  try{DB.collection(COL.seen).doc(ME.id).set({at:Date.now()}).catch(()=>{})}catch(e){}
}

/* ---------- theme ---------- */
const effDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches};
function themeUI(){const d=effDark();$('#themeIco').innerHTML=ic(d?'sun':'moon');$('#themeTxt').textContent=d?'เปลี่ยนเป็นธีมสว่าง':'เปลี่ยนเป็นธีมมืด'}
function toggleTheme(){const n=effDark()?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('stk-theme',n)}catch(e){}themeUI()}

/* ---------- command palette ---------- */
const CMD={sel:0,list:[]};
function cmdBuild(q){
  q=q.trim().toLowerCase();const out=[];
  const add=(g,label,sub,icon,run)=>out.push({g,label,sub,icon,run});
  Object.entries(ROUTES).forEach(([k,r])=>{if(routeOk(k))add('ไปที่หน้า',r.title,r.crumb,r.icon,()=>go(k))});
  if(can('master')){add('คำสั่งด่วน','เพิ่มสินค้าใหม่','Item','plus',()=>itemModal());
  add('คำสั่งด่วน','เพิ่ม Location ใหม่','Location','plus',()=>locModal())}
  add('คำสั่งด่วน','สลับธีม สว่าง / มืด','Theme','sun',toggleTheme);
  S.items.forEach(i=>add('สินค้า',i.name,i.sku+' · คงเหลือ '+fq(itemQ(i.id))+' '+i.unit,'box',()=>openDrawer('item',i.id)));
  S.locs.forEach(l=>add('Location',l.code+' · '+l.name,(l.wh||'')+(l.zone?' · '+l.zone:''),'pin',()=>openDrawer('loc',l.id)));
  [...S.docs].sort((a,b)=>b.ts-a.ts).forEach(d=>add('เอกสาร',d.no,TYPES[d.type].name+' · '+dShort(d.ts)+(D.voidMap.has(d.id)?' · ยกเลิก':''),TYPES[d.type].icon,()=>docModal(d.id)));
  const res=q?out.filter(x=>(x.label+' '+x.sub).toLowerCase().includes(q)):out.filter(x=>x.g==='ไปที่หน้า'||x.g==='คำสั่งด่วน');
  return res.slice(0,40);
}
function cmdRender(){
  const ul=$('#cmdList');if(!ul)return;let g='',h='';
  CMD.list.forEach((x,i)=>{if(x.g!==g){g=x.g;h+='<li class="grp" role="presentation">'+esc(g)+'</li>'}
    h+='<li role="option" data-cmd="'+i+'" aria-selected="'+(i===CMD.sel)+'"><span class="ico TRF" style="width:30px;height:30px;border-radius:9px">'+ic(x.icon)+'</span><span class="ellip">'+esc(x.label)+'</span><small class="ellip">'+esc(x.sub)+'</small></li>'});
  ul.innerHTML=h||'<li class="grp" role="presentation">ไม่พบผลลัพธ์</li>';
  const s=$('[aria-selected="true"]',ul);if(s)s.scrollIntoView({block:'nearest'});
}
function openCmd(){
  if($('#cmdBg')){closeCmd();return}
  const bg=document.createElement('div');bg.className='cmd-bg';bg.id='cmdBg';
  bg.innerHTML='<div class="cmd" role="dialog" aria-label="ค้นหาด่วน"><input id="cmdIn" placeholder="ค้นหาสินค้า, Location, เลขที่เอกสาร หรือคำสั่ง…" autocomplete="off" aria-label="ค้นหา"><ul id="cmdList" role="listbox"></ul></div>';
  bg.addEventListener('mousedown',e=>{if(e.target===bg)closeCmd()});
  $('#cmdRoot').appendChild(bg);CMD.sel=0;CMD.list=cmdBuild('');cmdRender();$('#cmdIn').focus();
}
function closeCmd(){const b=$('#cmdBg');if(b)b.remove()}
function cmdRun(i){const x=CMD.list[i];if(!x)return;closeCmd();x.run()}

/* ---------- actions ---------- */
const stripId=o=>{const {id,...r}=o;return r};
const G=(perm,fn)=>(el,e)=>{if(!can(perm)){toast('คุณไม่มีสิทธิ์ทำรายการนี้','bad');return}return fn(el,e)};
const ACT={
  signout:()=>{if(window.SR&&SR.signOut)SR.signOut()},
  go:el=>go(el.dataset.id),
  'open-item':el=>{closeCmd();openDrawer('item',el.dataset.id)},
  'open-loc':el=>openDrawer('loc',el.dataset.id),
  'open-doc':el=>docModal(el.dataset.id),
  'drawer-close':closeDrawer,
  'drawer-tab':el=>{if(S.drawer){S.drawer.tab=el.dataset.tab;drawerRender(false)}},
  'modal-close':closeModal,
  'confirm-ok':()=>{const f=CONFIRM;CONFIRM=null;closeModal();if(f)f()},
  'item-new':G('master',()=>itemModal()),
  'item-edit':G('master',el=>itemModal(el.dataset.id)),
  'item-toggle':G('master',async el=>{const it=D.itemById.get(el.dataset.id);if(!it)return;try{await put('items',it.id,{...stripId(it),active:it.active===false});toast(it.active===false?'เปิดใช้งานแล้ว':'ปิดใช้งานแล้ว')}catch(e){}}),
  'item-del':G('master',el=>{const it=D.itemById.get(el.dataset.id);if(!it||D.usedItem.has(it.id))return;confirmModal('ลบสินค้า','ลบ <b>'+esc(it.sku)+' · '+esc(it.name)+'</b> ออกจากระบบถาวร? การลบทำได้เฉพาะสินค้าที่ยังไม่มีประวัติเคลื่อนไหว','ลบสินค้า',async()=>{try{await del('items',it.id);dropAsset(it.photo);closeDrawer();toast('ลบสินค้าแล้ว')}catch(e){}})}),
  'loc-new':G('master',()=>locModal()),
  'loc-edit':G('master',el=>locModal(el.dataset.id)),
  'loc-toggle':G('master',async el=>{const l=D.locById.get(el.dataset.id);if(!l)return;try{await put('locs',l.id,{...stripId(l),active:l.active===false});toast(l.active===false?'เปิดใช้งานแล้ว':'ปิดใช้งานแล้ว')}catch(e){}}),
  'loc-del':G('master',el=>{const l=D.locById.get(el.dataset.id);if(!l||D.usedLoc.has(l.id))return;confirmModal('ลบ Location','ลบ <b>'+esc(l.code)+' · '+esc(l.name)+'</b> ออกจากระบบถาวร?','ลบ Location',async()=>{try{await del('locs',l.id);closeDrawer();toast('ลบ Location แล้ว')}catch(e){}})}),
  'loc-wh':el=>{S.ui.locWh=el.dataset.id;render(false)},
  'quick-doc':G('doc',el=>{
    const t=el.dataset.type,id=el.dataset.id;
    if(t==='ADJ'&&!can('adj'))return;
    if((t==='OUT'||t==='TRF')&&itemQ(id)<=0){toast('สินค้านี้ไม่มียอดคงเหลือ','bad');return}
    closeDrawer();if(t==='TRF')S.trfMode='TRF';
    const d=draftOf(t);let i=d.lines.findIndex(l=>!l.itemId&&!String(l.qty).trim());
    if(i<0){d.lines.push(blankLine());i=d.lines.length-1}
    setLineItem(t,i,id);go(routeOf(t));
  }),
  'trf-mode':el=>{S.trfMode=el.dataset.id;render(false)},
  'line-add':()=>{const t=formType(),d=draftOf(t);d.lines.push(blankLine());renderLines(t,'l'+(d.lines.length-1)+'-itemId')},
  'line-del':el=>{const t=formType(),d=draftOf(t);d.lines.splice(+el.dataset.i,1);if(!d.lines.length)d.lines.push(blankLine());renderLines(t)},
  'form-reset':()=>{S.drafts[formType()]=newDraft();render(false)},
  'doc-submit':submitDoc,
  'rep-tab':el=>{S.ui.rep.tab=el.dataset.id;S.ui.rep.limit=100;S.ui.rep.dlimit=100;render(false)},
  'rep-dtype':el=>{const t=S.ui.rep.dtypes;t[el.dataset.id]=t[el.dataset.id]?0:1;S.ui.rep.dlimit=100;render(false)},
  'rep-dstat':el=>{S.ui.rep.dstat=el.dataset.id;S.ui.rep.dlimit=100;render(false)},
  'rep-dmore':()=>{S.ui.rep.dlimit+=100;updateReports()},
  'doc-print':el=>printModal(el.dataset.id),
  'print-pdf':()=>printDownload('pdf'),
  'print-html':()=>printDownload('html'),
  'doc-void':G('void',el=>voidModal(el.dataset.id)),
  'doc-restore':el=>restoreDoc(el.dataset.id),
  'adm-add':G('users',el=>setMemberRole(el.dataset.id,'clerk')),
  'rep-view':el=>{S.ui.rep.view=el.dataset.id;render(false)},
  'rep-hide':()=>{S.ui.rep.hideZero=!S.ui.rep.hideZero;render(false)},
  'rep-quick':el=>{S.ui.rep.quick=el.dataset.id;S.ui.rep.limit=100;render(false)},
  'rep-type':el=>{const t=S.ui.rep.types;t[el.dataset.id]=t[el.dataset.id]?0:1;S.ui.rep.limit=100;render(false)},
  'rep-more':()=>{S.ui.rep.limit+=100;updateReports()},
  'rep-export':exportReport,
  'sample-clear':G('users',()=>confirmModal('ล้างข้อมูลตัวอย่าง','ลบสินค้า Location และเอกสารที่เป็นข้อมูลตัวอย่างทั้งหมดออกจากระบบ ข้อมูลที่คุณเพิ่มเองจะไม่ถูกลบ','ล้างข้อมูลตัวอย่าง',async()=>{
    const sd=new Set(S.docs.filter(x=>x.sample).map(x=>x.id));
    const jobs=[...S.voids.filter(v=>sd.has(v.docId||v.id)).map(v=>['voids',v.id]),...S.docs.filter(x=>x.sample).map(x=>['docs',x.id]),...S.items.filter(x=>x.sample).map(x=>['items',x.id]),...S.locs.filter(x=>x.sample).map(x=>['locs',x.id])];
    try{for(let i=0;i<jobs.length;i+=8)await Promise.all(jobs.slice(i,i+8).map(([c,id])=>del(c,id)));toast('ล้างข้อมูลตัวอย่าง '+jobs.length+' รายการแล้ว')}catch(e){}
  }))
};
const FORMS={item:saveItem,loc:saveLoc,void:saveVoid,settings:saveSettings};

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(el){if(el.tagName==='A')e.preventDefault();const f=ACT[el.dataset.act];if(f)f(el,e);return}
  const c=e.target.closest('[data-cmd]');if(c){cmdRun(+c.dataset.cmd);return}
  if(e.target.closest('#themeBtn')){toggleTheme();return}
  if(e.target.closest('#cmdBtn')){openCmd();return}
  if(e.target.closest('#menuBtn')){document.body.classList.toggle('nav-open');return}
  if(e.target.id==='scrim')document.body.classList.remove('nav-open');
});
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.btn');if(!b||b.disabled)return;
  const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,sp=document.createElement('span');
  sp.className='ripple';sp.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px';
  b.appendChild(sp);setTimeout(()=>sp.remove(),650);
});
document.addEventListener('submit',e=>{const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();const fn=FORMS[f.dataset.form];if(fn)fn(f)});
document.addEventListener('input',e=>{
  const t=e.target,id=t.id,R=S.ui.rep;
  if(id==='itemQ'){S.ui.itemQ=t.value;updateItems()}
  else if(id==='locQ'){S.ui.locQ=t.value;updateLocations()}
  else if(id==='rep-q'){R.q=t.value;updateReports()}
  else if(id==='rep-dq'){R.dq=t.value;R.dlimit=100;updateReports()}
  else if(id==='adm-q'){admSearch(t.value)}
  else if(id==='rep-docq'){R.docq=t.value;R.limit=100;updateReports()}
  else if(id==='cmdIn'){CMD.sel=0;CMD.list=cmdBuild(t.value);cmdRender()}
  else if(t.dataset&&t.dataset.df){draftOf(formType())[t.dataset.df]=t.value;updateFormMeta()}
  else if(t.dataset&&t.dataset.lf&&t.tagName==='INPUT'){draftOf(formType()).lines[+t.dataset.i][t.dataset.lf]=t.value;updateFormMeta()}
});
document.addEventListener('change',e=>{
  const t=e.target,id=t.id,R=S.ui.rep;
  if(t.dataset&&t.dataset.member!=null&&t.tagName==='SELECT'){setMemberRole(t.dataset.member,t.value);return}
  if(id==='pr-price'){PRINT.price=t.checked;printPreview();return}
  if(id==='f-photo'){const fl=t.files&&t.files[0],pv=$('#photoPrev');if(fl&&pv){const u=URL.createObjectURL(fl);pv.innerHTML='<img src="'+u+'" alt="">'}return}
  if(id==='itemCat'){S.ui.itemCat=t.value;updateItems()}
  else if(id==='itemShow'){S.ui.itemShow=t.value;updateItems()}
  else if(id==='rep-cat'){R.cat=t.value;updateReports()}
  else if(id==='rep-loc'){R.loc=t.value;updateReports()}
  else if(id==='rep-item'){R.item=t.value;R.limit=100;updateReports()}
  else if(id==='rep-mloc'){R.mloc=t.value;R.limit=100;updateReports()}
  else if(id==='rep-from'||id==='rep-to'){R[id==='rep-from'?'from':'to']=t.value;R.limit=100;updateReports()}
  else if(t.dataset&&t.dataset.lf&&t.tagName==='SELECT'){
    const ft=formType(),d=draftOf(ft),i=+t.dataset.i,f=t.dataset.lf,l=d.lines[i];
    if(f==='itemId')setLineItem(ft,i,t.value);
    else{l[f]=t.value;if(ft==='TRF'&&l.toLocId===l.locId)l.toLocId=''}
    const next=f==='itemId'?(ft==='ADJ'?'l'+i+'-locId':'l'+i+'-qty'):'l'+i+'-'+f;
    renderLines(ft,f==='locId'&&ft==='TRF'?'l'+i+'-toLocId':f==='locId'&&ft!=='TRF'?(ft==='ADJ'?'l'+i+'-counted':'l'+i+'-qty'):next);
  }
});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCmd();return}
  if($('#cmdBg')){
    if(e.key==='Escape'){closeCmd();return}
    if(e.key==='ArrowDown'){e.preventDefault();CMD.sel=Math.min(CMD.list.length-1,CMD.sel+1);cmdRender();return}
    if(e.key==='ArrowUp'){e.preventDefault();CMD.sel=Math.max(0,CMD.sel-1);cmdRender();return}
    if(e.key==='Enter'){e.preventDefault();cmdRun(CMD.sel);return}
    return;
  }
  if(e.key==='Escape'){
    if($('#modalBg'))closeModal();else if(S.drawer)closeDrawer();else document.body.classList.remove('nav-open');
    return;
  }
  if(e.key==='Enter'&&e.target&&e.target.id==='scan'){e.preventDefault();const v=e.target.value;e.target.value='';scanAdd(v)}
});
window.addEventListener('hashchange',()=>{const r=location.hash.slice(1);if(r&&r!==S.route)go(r)});
window.addEventListener('scroll',hideTip,{passive:true});

/* ---------- boot ---------- */
async function boot(){
  try{const t=localStorage.getItem('stk-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
  $('#menuBtn').innerHTML=ic('menu');$('#cmdIco').innerHTML=ic('search');themeUI();buildNav();syncChip();
  const h=location.hash.slice(1);S.route=ROUTES[h]?h:'dashboard';
  render(true);
  const c=window.claude;
  if(c&&c.use){
    const [db,user,assets]=await Promise.all([c.use('db').catch(()=>null),c.use('user').catch(()=>null),c.use('assets').catch(()=>null)]);
    DB=db;USER=user;ASSETS=assets;S.standalone=!!(window.SR&&window.SR.standalone&&db);
    if(USER){
      try{const me=await USER.me();ME={id:me.id||'',name:me.name||''}}catch(e){}
      try{S.isAdmin=!!(await USER.canEdit())}catch(e){S.isAdmin=false}
      try{S.canWrite=(await USER.can('data.write'))!==false}catch(e){}
    }else S.isAdmin=false;
  }
  if(DB){S.live=true;syncChip();subscribeAll()}
  else{S.mem=true;S.ready=true;S.isAdmin=true;syncChip();onData()}
}
boot();
