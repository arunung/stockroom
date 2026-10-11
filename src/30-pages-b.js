/* =========================================================
   Locations + document forms (receive / issue / transfer / adjust)
   ========================================================= */
function locCards(){
  const q=S.ui.locQ.trim().toLowerCase(),wh=S.ui.locWh;
  const list=S.locs.filter(l=>{
    if(wh!=='all'&&(l.wh||'คลังหลัก')!==wh)return false;
    if(q&&![l.code,l.name,l.zone,l.wh].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    return true;
  }).sort((a,b)=>String(a.code).localeCompare(String(b.code),'th',{numeric:true}));
  if(!list.length)return '<div class="card" style="grid-column:1/-1"><div class="empty">'+ic('pin','big')+'<h3>'+(S.locs.length?'ไม่พบ Location ที่ตรงเงื่อนไข':'ยังไม่มี Location')+'</h3><p>'+(S.locs.length?'ลองเปลี่ยนคำค้นหา':'สร้าง Location (เช่น ชั้นวาง A-01-01) เพื่อให้ระบบติดตามยอดคงเหลือรายตำแหน่ง')+'</p></div></div>';
  return list.map(l=>{
    const st=D.locStats.get(l.id)||{skus:0,value:0},on=D.maxLocVal>0?Math.round(st.value/D.maxLocVal*12):0;
    let meter='';for(let i=0;i<12;i++)meter+='<i class="'+(i<on?'on':'')+'" style="height:'+(34+i*6)+'%;animation-delay:'+(i*35)+'ms"></i>';
    return '<button class="card loc-card" type="button" data-act="open-loc" data-id="'+l.id+'"><div class="row"><span class="code">'+esc(l.code)+'</span><span class="sp"></span>'+(l.active===false?'<span class="pill off">ปิดใช้งาน</span>':'')+'</div>'
      +'<div><div class="cell-main ellip">'+esc(l.name)+'</div><div class="row wrap" style="margin-top:6px;gap:6px">'+(l.wh?'<span class="tag">'+esc(l.wh)+'</span>':'')+(l.zone?'<span class="tag">โซน '+esc(l.zone)+'</span>':'')+'<span class="tag">'+esc(LOC_TYPES[l.type]||LOC_TYPES.rack)+'</span></div></div>'
      +'<div class="meter" aria-hidden="true">'+meter+'</div><div class="row"><span class="sub">'+st.skus+' SKU</span><span class="sp"></span><b class="num">'+money(st.value)+'</b></div></button>';
  }).join('');
}
function vLocations(){
  const whs=[...new Set(S.locs.map(l=>l.wh||'คลังหลัก'))].sort((a,b)=>a.localeCompare(b,'th'));
  return '<div class="toolbar"><div class="search-in">'+ic('search')+'<input class="in-ctl" id="locQ" type="search" placeholder="ค้นหา Location, โซน, คลัง…" value="'+esc(S.ui.locQ)+'" autocomplete="off" aria-label="ค้นหา Location"></div>'
   +(whs.length>1?'<div class="row wrap" style="gap:6px"><button class="chip" type="button" data-act="loc-wh" data-id="all" aria-pressed="'+(S.ui.locWh==='all')+'">ทั้งหมด</button>'+whs.map(w=>'<button class="chip" type="button" data-act="loc-wh" data-id="'+esc(w)+'" aria-pressed="'+(S.ui.locWh===w)+'">'+esc(w)+'</button>').join('')+'</div>':'')
   +'<span class="sp"></span>'+(can('master')?'<button class="btn primary" type="button" data-act="loc-new">'+ic('plus')+'เพิ่ม Location</button>':'')+'</div>'
   +'<div class="loc-grid stagger" id="locGrid">'+locCards()+'</div>';
}
function updateLocations(){const g=$('#locGrid');if(g){g.innerHTML=locCards()}}
function locModal(id){
  const l=id?D.locById.get(id):null,whs=[...new Set(S.locs.map(x=>x.wh).filter(Boolean))],v=k=>esc(l?(l[k]==null?'':l[k]):'');
  openModal('<form data-form="loc" data-id="'+(id||'')+'"><div class="modal-h"><h2>'+(l?'แก้ไข Location':'เพิ่ม Location')+'</h2><span class="sp"></span><button class="icon-btn" type="button" data-act="modal-close" aria-label="ปิด">'+ic('x')+'</button></div><div class="modal-b"><div class="form-grid">'
   +'<div class="fld"><label for="f-code">รหัส Location <i>*</i></label><input class="in-ctl mono" id="f-code" name="code" required value="'+v('code')+'" placeholder="เช่น A-01-02" autocomplete="off"></div>'
   +'<div class="fld"><label for="f-lname">ชื่อ / คำอธิบาย <i>*</i></label><input class="in-ctl" id="f-lname" name="name" required value="'+v('name')+'" placeholder="เช่น ชั้นวาง A แถว 1 ชั้น 2" autocomplete="off"></div>'
   +'<div class="fld"><label for="f-wh">คลัง / อาคาร</label><input class="in-ctl" id="f-wh" name="wh" list="dl-wh" value="'+(l?v('wh'):esc(whs[0]||'คลังหลัก'))+'" autocomplete="off"><datalist id="dl-wh">'+whs.map(w=>'<option value="'+esc(w)+'">').join('')+'</datalist></div>'
   +'<div class="fld"><label for="f-zone">โซน</label><input class="in-ctl" id="f-zone" name="zone" value="'+v('zone')+'" placeholder="เช่น A" autocomplete="off"></div>'
   +'<div class="fld full"><label for="f-ltype">ประเภทพื้นที่</label><select class="in-ctl" id="f-ltype" name="type">'+Object.entries(LOC_TYPES).map(([k,n])=>'<option value="'+k+'"'+((l?l.type:'rack')===k?' selected':'')+'>'+n+'</option>').join('')+'</select></div>'
   +'</div></div><div class="modal-f"><button class="btn" type="button" data-act="modal-close">ยกเลิก</button><button class="btn primary" type="submit">'+ic('check')+(l?'บันทึก':'เพิ่ม Location')+'</button></div></form>');
}
async function saveLoc(form){
  if(!can('master')){toast('คุณไม่มีสิทธิ์จัดการ Location','bad');return}
  const f=Object.fromEntries(new FormData(form).entries()),id=form.dataset.id||'';
  const code=(f.code||'').trim(),name=(f.name||'').trim();
  if(!code||!name){toast('กรอกรหัสและชื่อ Location','bad');return}
  if(S.locs.some(l=>l.id!==id&&String(l.code).toLowerCase()===code.toLowerCase())){toast('รหัส Location นี้มีอยู่แล้ว','bad');$('#f-code').classList.add('bad');return}
  const old=id?D.locById.get(id):null;
  try{await put('locs',id||uid(),{code,name,wh:(f.wh||'').trim()||'คลังหลัก',zone:(f.zone||'').trim(),type:f.type||'rack',active:old?old.active!==false:true,createdAt:old?old.createdAt||Date.now():Date.now()});closeModal();toast(id?'บันทึก Location แล้ว':'เพิ่ม Location '+code+' แล้ว')}catch(e){}
}
function drawerLoc(s){
  const l=D.locById.get(s.id);if(!l)return null;
  const st=D.locStats.get(l.id)||{skus:0,value:0,list:[]},tab=s.tab,used=D.usedLoc.has(l.id),mst=can('master');
  let body='';
  if(tab==='items'){
    const rows=[...st.list].sort((a,b)=>b.qty-a.qty);
    body=rows.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>สินค้า</th><th class="r">คงเหลือ</th><th class="r">มูลค่า</th></tr></thead><tbody>'+rows.map(r=>{const it=D.itemById.get(r.itemId);return '<tr class="click" data-act="open-item" data-id="'+r.itemId+'"><td><div class="cell-main">'+esc(it?it.name:'(ถูกลบ)')+'</div><div class="cell-sub mono">'+esc(it?it.sku:'')+'</div></td><td class="r num" style="font-weight:600">'+fq(r.qty)+' '+esc(it?it.unit:'')+'</td><td class="r num">'+money(Math.max(0,r.qty)*(it?+it.cost||0:0))+'</td></tr>'}).join('')+'</tbody><tfoot><tr><td>รวม</td><td></td><td class="r num">'+money(st.value)+'</td></tr></tfoot></table></div>':'<div class="empty" style="padding:30px 0">'+ic('box','big')+'<p>Location นี้ยังว่างอยู่ บันทึกรับเข้าหรือย้ายสินค้ามาที่นี่</p></div>';
  }else{
    const rows=D.moves.filter(m=>m.locId===l.id).slice(-60).reverse();
    body=rows.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>วันที่</th><th>เอกสาร</th><th>สินค้า</th><th class="r">+/−</th></tr></thead><tbody>'+rows.map(m=>'<tr class="click" data-act="open-doc" data-id="'+m.docId+'"><td class="cell-sub" style="white-space:nowrap">'+dShort(m.ts)+'<br>'+tShort(m.ts)+'</td><td><span class="mono" style="font-size:12.5px">'+esc(m.docNo)+'</span><br>'+typePill(m)+'</td><td><div class="cell-main">'+esc(m.name)+'</div><div class="cell-sub mono">'+esc(m.sku)+'</div></td><td class="r num '+(m.qty>=0?'qty-pos':'qty-neg')+'">'+(m.qty>0?'+':'')+fq(m.qty)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty" style="padding:30px 0">'+ic('clock','big')+'<p>ยังไม่มีการเคลื่อนไหวที่ Location นี้</p></div>';
  }
  return '<div class="drawer-h"><div class="row"><span class="tag">'+esc(l.wh||'คลังหลัก')+'</span>'+(l.zone?'<span class="tag">โซน '+esc(l.zone)+'</span>':'')+'<span class="tag">'+esc(LOC_TYPES[l.type]||'')+'</span>'+(l.active===false?'<span class="pill off">ปิดใช้งาน</span>':'')+'<span class="sp"></span><button class="icon-btn" type="button" data-act="drawer-close" aria-label="ปิด">'+ic('x')+'</button></div>'
   +'<h2 style="font:700 28px/1.2 var(--font-mono);margin:8px 0 2px">'+esc(l.code)+'</h2><div class="sub">'+esc(l.name)+'</div></div>'
   +'<div class="drawer-b"><div class="stat-row"><div class="stat"><small>จำนวน SKU</small><b class="num">'+st.skus+'</b></div><div class="stat"><small>มูลค่าสินค้า</small><b class="num">'+money(st.value)+'</b></div><div class="stat"><small>รายการเคลื่อนไหว</small><b class="num">'+D.moves.filter(m=>m.locId===l.id).length+'</b></div></div>'
   +(mst?'<div class="row wrap"><button class="btn sm" type="button" data-act="loc-edit" data-id="'+l.id+'">'+ic('edit')+'แก้ไข</button><button class="btn sm" type="button" data-act="loc-toggle" data-id="'+l.id+'">'+(l.active===false?'เปิดใช้งาน':'ปิดใช้งาน')+'</button>'+(used?'':'<button class="btn sm danger" type="button" data-act="loc-del" data-id="'+l.id+'">'+ic('trash')+'ลบ</button>')+'</div>':'')
   +'<div class="hint-tab"><button type="button" data-act="drawer-tab" data-tab="items" aria-pressed="'+(tab==='items')+'">สินค้าที่เก็บอยู่ ('+st.skus+')</button><button type="button" data-act="drawer-tab" data-tab="moves" aria-pressed="'+(tab==='moves')+'">ประวัติเคลื่อนไหว</button></div><div style="margin-top:12px">'+body+'</div></div>';
}

/* ----- document forms ----- */
const blankLine=()=>({itemId:'',locId:'',toLocId:'',qty:'',lot:'',counted:''});
const newDraft=()=>({date:ymd(new Date()),party:'',ref:'',note:'',tried:false,lines:[blankLine()]});
const draftOf=t=>S.drafts[t]||(S.drafts[t]=newDraft());
const docTs=ds=>ds===ymd(new Date())?Date.now():new Date(ds+'T12:00:00').getTime();
const formType=()=>S.route==='receive'?'IN':S.route==='issue'?'OUT':S.trfMode;
const routeOf=t=>t==='IN'?'receive':t==='OUT'?'issue':'transfer';
const COLS_={IN:'minmax(0,2.4fr) minmax(0,1.7fr) minmax(0,1fr) minmax(0,1fr) 40px',OUT:'minmax(0,2.6fr) minmax(0,2fr) minmax(0,1fr) 40px',TRF:'minmax(0,2.2fr) minmax(0,1.6fr) minmax(0,1.6fr) minmax(0,1fr) 40px',ADJ:'minmax(0,2.2fr) minmax(0,1.7fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,.8fr) 40px'};

function bestLoc(itemId){const a=D.itemLocs.get(itemId)||[];return a.length?a[0].locId:''}
function itemOptions(t,sel){
  const needStock=t==='OUT'||t==='TRF',groups=new Map();
  for(const it of S.items){
    if(it.active===false&&it.id!==sel)continue;
    if(needStock&&itemQ(it.id)<=0&&it.id!==sel)continue;
    const c=it.cat||'ไม่ระบุหมวด';(groups.get(c)||groups.set(c,[]).get(c)).push(it);
  }
  let h='<option value="">เลือกสินค้า…</option>';
  [...groups].sort((a,b)=>a[0].localeCompare(b[0],'th')).forEach(([c,arr])=>{
    h+='<optgroup label="'+esc(c)+'">'+arr.sort((a,b)=>String(a.sku).localeCompare(String(b.sku),'th',{numeric:true})).map(it=>'<option value="'+it.id+'"'+(it.id===sel?' selected':'')+'>'+esc(it.sku)+' · '+esc(it.name)+(needStock?' (มี '+fq(itemQ(it.id))+' '+esc(it.unit)+')':'')+'</option>').join('')+'</optgroup>';
  });
  return h;
}
function locOptions(t,l,which){
  const sel=which==='to'?l.toLocId:l.locId,it=l.itemId;
  let list;
  if(which==='from'||(t==='OUT')){
    if(!it)return '<option value="">เลือกสินค้าก่อน</option>';
    list=(D.itemLocs.get(it)||[]).filter(x=>x.qty>0).map(x=>D.locById.get(x.locId)).filter(Boolean);
    return '<option value="">เลือก Location ต้นทาง…</option>'+list.map(lc=>'<option value="'+lc.id+'"'+(lc.id===sel?' selected':'')+'>'+esc(lc.code)+' · '+esc(lc.name)+' (มี '+fq(qtyAt(it,lc.id))+')</option>').join('');
  }
  list=activeLocs();
  if(which==='to')list=list.filter(x=>x.id!==l.locId);
  if(t==='ADJ'&&it){(D.itemLocs.get(it)||[]).forEach(x=>{const lc=D.locById.get(x.locId);if(lc&&!list.includes(lc))list.push(lc)})}
  return '<option value="">'+(which==='to'?'เลือก Location ปลายทาง…':'เลือก Location…')+'</option>'+list.map(lc=>'<option value="'+lc.id+'"'+(lc.id===sel?' selected':'')+'>'+esc(lc.code)+' · '+esc(lc.name)+(it?' (มี '+fq(qtyAt(it,lc.id))+')':'')+'</option>').join('');
}
function lineHtml(t,l,i){
  const it=D.itemById.get(l.itemId),u=it?esc(it.unit):'';
  const f=(cls,lbl,id,inner)=>'<div class="fld '+cls+'"><label for="'+id+'">'+lbl+'</label>'+inner+'</div>';
  const sel=(id,key,opts)=>'<select class="in-ctl" id="'+id+'" data-lf="'+key+'" data-i="'+i+'">'+opts+'</select>';
  const qty=(key,ph)=>'<input class="in-ctl num" id="l'+i+'-'+key+'" data-lf="'+key+'" data-i="'+i+'" inputmode="decimal" placeholder="'+ph+'" autocomplete="off" value="'+esc(l[key])+'">';
  let cells=f('item','สินค้า','l'+i+'-itemId',sel('l'+i+'-itemId','itemId',itemOptions(t,l.itemId)));
  if(t==='IN'){
    cells+=f('wide','รับเข้า Location','l'+i+'-locId',sel('l'+i+'-locId','locId',locOptions(t,l,'loc')))
     +f('','Lot / Batch','l'+i+'-lot','<input class="in-ctl mono" id="l'+i+'-lot" data-lf="lot" data-i="'+i+'" placeholder="ไม่บังคับ" autocomplete="off" value="'+esc(l.lot)+'">')
     +f('','จำนวน'+(u?' ('+u+')':''),'l'+i+'-qty',qty('qty','0'));
  }else if(t==='OUT'){
    cells+=f('wide','จ่ายจาก Location','l'+i+'-locId',sel('l'+i+'-locId','locId',locOptions(t,l,'from')))+f('','จำนวน'+(u?' ('+u+')':''),'l'+i+'-qty',qty('qty','0'));
  }else if(t==='TRF'){
    cells+=f('wide','จาก Location','l'+i+'-locId',sel('l'+i+'-locId','locId',locOptions(t,l,'from')))+f('wide','ไป Location','l'+i+'-toLocId',sel('l'+i+'-toLocId','toLocId',locOptions(t,l,'to')))+f('','จำนวน'+(u?' ('+u+')':''),'l'+i+'-qty',qty('qty','0'));
  }else{
    cells+=f('wide','Location ที่นับ','l'+i+'-locId',sel('l'+i+'-locId','locId',locOptions(t,l,'loc')))
     +'<div class="fld"><label>ยอดในระบบ</label><div class="readout num" id="sys'+i+'">—</div></div>'
     +f('','นับได้จริง','l'+i+'-counted',qty('counted','0'))
     +'<div class="fld"><label>ผลต่าง</label><div class="readout num" id="diff'+i+'">—</div></div>';
  }
  return '<div class="line" data-i="'+i+'" style="--cols:'+COLS_[t]+'">'+cells+'<button class="icon-btn x" type="button" data-act="line-del" data-i="'+i+'" aria-label="ลบรายการ">'+ic('trash')+'</button><div class="line-msg" id="msg'+i+'"></div></div>';
}
function linesHtml(t){return draftOf(t).lines.map((l,i)=>lineHtml(t,l,i)).join('')}

/* validation per line (also drives the live hints) */
function analyze(t){
  const d=draftOf(t),used=new Map();
  return d.lines.map((l,i)=>{
    const info={i,ok:false,empty:false,skip:false,kind:'',msg:'',line:null};
    if(!l.itemId&&!l.locId&&!l.toLocId&&!String(l.qty).trim()&&!String(l.counted).trim()&&!String(l.lot).trim()){info.empty=true;return info}
    const it=D.itemById.get(l.itemId);
    const hint=m=>{info.msg=m;info.kind=d.tried?'err':'';return info},err=m=>{info.msg=m;info.kind='err';return info};
    if(!it)return hint('เลือกสินค้า');
    const base={itemId:it.id,sku:it.sku,name:it.name,unit:it.unit,cost:+it.cost||0};
    const qty=num(l.qty);
    if(t==='IN'){
      if(!l.locId)return hint('เลือก Location ปลายทาง');
      if(!(qty>0))return hint('ระบุจำนวนที่มากกว่า 0');
      info.ok=true;info.msg='หลังรับ '+locCode(l.locId)+' จะมี '+fq(qtyAt(it.id,l.locId)+qty)+' '+it.unit;info.kind='ok';
      info.line={...base,locId:l.locId,qty:q3(qty),lot:(l.lot||'').trim()};return info;
    }
    if(t==='OUT'||t==='TRF'){
      if(!l.locId)return hint('เลือก Location ต้นทาง');
      if(t==='TRF'){if(!l.toLocId)return hint('เลือก Location ปลายทาง');if(l.toLocId===l.locId)return err('ต้นทางและปลายทางต้องไม่เหมือนกัน')}
      if(!(qty>0))return hint('ระบุจำนวนที่มากกว่า 0');
      const k=it.id+'|'+l.locId,u=q3((used.get(k)||0)+qty),avail=qtyAt(it.id,l.locId);used.set(k,u);
      if(u>avail+1e-9)return err('เกินยอดคงเหลือ: '+locCode(l.locId)+' มี '+fq(avail)+' '+it.unit+(u>qty?' (รวมรายการอื่นที่ใช้ Location นี้ '+fq(u)+')':''));
      info.ok=true;info.kind='ok';
      info.msg=t==='OUT'?'คงเหลือหลังจ่าย '+fq(avail-u)+' '+it.unit+' ที่ '+locCode(l.locId):locCode(l.locId)+' เหลือ '+fq(avail-u)+' → '+locCode(l.toLocId)+' เป็น '+fq(qtyAt(it.id,l.toLocId)+qty)+' '+it.unit;
      info.line={...base,locId:l.locId,qty:q3(qty)};if(t==='TRF')info.line.toLocId=l.toLocId;return info;
    }
    if(!l.locId)return hint('เลือก Location ที่นับ');
    const cnt=num(l.counted);
    if(!isFinite(cnt)||cnt<0||String(l.counted).trim()==='')return hint('ระบุจำนวนที่นับได้จริง');
    const sys=qtyAt(it.id,l.locId),delta=q3(cnt-sys);
    info.sys=sys;info.delta=delta;
    if(delta===0){info.skip=true;info.msg='ตรงกับระบบ ไม่ต้องปรับ';return info}
    info.ok=true;info.kind='ok';info.msg=(delta>0?'เพิ่ม ':'ลด ')+fq(Math.abs(delta))+' '+it.unit+' เป็น '+fq(cnt);
    info.line={...base,locId:l.locId,system:sys,counted:q3(cnt),delta};return info;
  });
}
function updateFormMeta(){
  const t=formType(),d=draftOf(t),a=analyze(t);if(!$('#lines'))return;
  let nOk=0,val=0;
  a.forEach(x=>{
    const m=$('#msg'+x.i);
    if(m){m.textContent=x.msg;m.className='line-msg'+(x.kind==='err'?' err':x.kind==='ok'?' okk':'')}
    const inp=$$('#lines [data-i="'+x.i+'"]');
    if(t==='ADJ'){const s=$('#sys'+x.i),df=$('#diff'+x.i),l=d.lines[x.i];
      if(s)s.textContent=l.itemId&&l.locId?fq(qtyAt(l.itemId,l.locId)):'—';
      if(df){df.textContent=x.delta!=null?(x.delta>0?'+':'')+fq(x.delta):'—';df.className='readout num '+(x.delta>0?'qty-pos':x.delta<0?'qty-neg':'')}}
    if(x.ok){nOk++;const ln=x.line;val+=(t==='ADJ'?Math.abs(ln.delta):ln.qty)*ln.cost}
  });
  const sl=$('#sumLines'),sv=$('#sumValue'),btn=$('#submitDoc');
  if(sl)sl.textContent=nOk;if(sv)sv.textContent=money(val);
  if(btn)btn.disabled=false;
  const dn=$('#docNo');if(dn)dn.textContent=nextNo(t,docTs(d.date));
}
function renderLines(t,focusId){
  const el=$('#lines');if(!el)return;
  el.innerHTML=linesHtml(t);updateFormMeta();
  if(focusId){const f=document.getElementById(focusId);if(f)f.focus()}
}
function setLineItem(t,i,itemId){
  const d=draftOf(t),l=d.lines[i];l.itemId=itemId;l.toLocId='';
  if(!itemId){l.locId='';return}
  if(t==='IN'){const prev=d.lines.slice(0,i).reverse().find(x=>x.locId);l.locId=bestLoc(itemId)||(prev?prev.locId:'')}
  else l.locId=bestLoc(itemId);
}
function recentDocs(t){
  const types=(S.route==='transfer')?['TRF','ADJ']:[t];
  const list=S.docs.filter(d=>types.includes(d.type)).sort((a,b)=>b.ts-a.ts).slice(0,9);
  if(!list.length)return '<div class="empty" style="padding:30px 18px">'+ic('list','big')+'<p>ยังไม่มีเอกสาร เมื่อบันทึกแล้วจะแสดงที่นี่</p></div>';
  return list.map(d=>{const l0=(d.lines||[])[0]||{},more=(d.lines||[]).length-1;
    const vd=D.voidMap.has(d.id);
    return '<div class="doc-i'+(S.flashId===d.id?' flash':'')+(vd?' voided':'')+'" data-act="open-doc" data-id="'+d.id+'"><span class="ico '+d.type+'">'+ic(TYPES[d.type].icon)+'</span><div style="min-width:0;flex:1"><div class="cell-main ellip"><span class="mono'+(vd?' struck':'')+'">'+esc(d.no)+'</span>'+(vd?' <span class="pill off">ยกเลิก</span>':'')+(S.route==='transfer'?' <span class="cell-sub">'+TYPES[d.type].name+'</span>':'')+'</div><div class="cell-sub ellip">'+esc(l0.name||'')+(more>0?' +'+more+' รายการ':'')+'</div></div><span class="cell-sub" style="white-space:nowrap">'+rel(d.ts)+'</span><button class="icon-btn sm" type="button" data-act="doc-print" data-id="'+d.id+'" aria-label="พิมพ์เอกสาร" title="พิมพ์ / ดาวน์โหลด">'+ic('print')+'</button></div>'}).join('');
}
function vForm(){
  const t=formType(),T=TYPES[t],d=draftOf(t);
  const parties=[...new Set([...(t==='IN'?S.items.map(i=>i.supplier):[]),...S.docs.filter(x=>x.type===t).map(x=>x.party)].filter(x=>x&&x!=='ยอดยกมา'))];
  const seg=S.route==='transfer'?'<div style="margin-bottom:14px"><div class="seg" role="group" aria-label="ประเภทเอกสาร"><button type="button" data-act="trf-mode" data-id="TRF" aria-pressed="'+(t==='TRF')+'">'+ic('swap')+' ย้าย Location</button>'+(can('adj')?'<button type="button" data-act="trf-mode" data-id="ADJ" aria-pressed="'+(t==='ADJ')+'">ปรับยอด / ตรวจนับ</button>':'')+'</div></div>':'';
  const noteLbl=t==='ADJ'?'เหตุผลการปรับยอด':'หมายเหตุ';
  return seg+'<div class="doc-layout"><section class="card"><div class="card-h" style="padding-bottom:2px"><span class="doc-badge '+t+'">'+ic(T.icon)+'</span><div><h2>'+T.name+'</h2><div class="sub">'+T.en+'</div></div><span class="docno" id="docNo" title="เลขที่เอกสาร (สร้างอัตโนมัติ)">'+nextNo(t,docTs(d.date))+'</span></div>'
   +'<div class="hdr"><div class="fld"><label for="d-date">วันที่</label><input class="in-ctl" type="date" id="d-date" data-df="date" max="'+ymd(new Date())+'" value="'+esc(d.date)+'"></div>'
   +'<div class="fld"><label for="d-party">'+esc(T.party)+'</label><input class="in-ctl" id="d-party" data-df="party" list="dl-party" value="'+esc(d.party)+'" autocomplete="off"><datalist id="dl-party">'+parties.map(p=>'<option value="'+esc(p)+'">').join('')+'</datalist></div>'
   +'<div class="fld"><label for="d-ref">'+esc(T.ref)+'</label><input class="in-ctl mono" id="d-ref" data-df="ref" value="'+esc(d.ref)+'" autocomplete="off"></div>'
   +'<div class="fld"><label for="d-note">'+noteLbl+'</label><input class="in-ctl" id="d-note" data-df="note" value="'+esc(d.note)+'" autocomplete="off"></div></div>'
   +'<div class="scan">'+ic('scan')+'<input class="in-ctl" id="scan" placeholder="สแกนหรือพิมพ์ SKU แล้วกด Enter" autocomplete="off" aria-label="สแกนหรือพิมพ์ SKU"></div>'
   +'<div class="lines" id="lines">'+linesHtml(t)+'</div>'
   +'<div class="row" style="padding:0 18px"><button class="btn sm" type="button" data-act="line-add">'+ic('plus')+'เพิ่มรายการ</button></div>'
   +'<div class="doc-foot"><div class="sum"><div><small>รายการที่พร้อมบันทึก</small><b class="num" id="sumLines">0</b></div><div><small>มูลค่าตามต้นทุน</small><b class="num" id="sumValue">฿0</b></div></div><span class="sp"></span><button class="btn" type="button" data-act="form-reset">ล้างฟอร์ม</button><button class="btn primary" type="button" id="submitDoc" data-act="doc-submit">'+ic('check')+T.submit+'</button></div></section>'
   +'<aside class="card"><div class="card-h" style="padding-bottom:8px"><div><h3>เอกสารล่าสุด</h3><div class="sub">คลิกเพื่อดูรายละเอียด</div></div></div><div id="recentDocs">'+recentDocs(t)+'</div></aside></div>';
}
function afterForm(){updateFormMeta()}
function updateForm(){updateFormMeta();const r=$('#recentDocs');if(r)r.innerHTML=recentDocs(formType())}
function scanAdd(code){
  const t=formType(),d=draftOf(t),c=code.trim().toLowerCase();if(!c)return;
  const it=S.items.find(i=>String(i.sku).toLowerCase()===c)||S.items.find(i=>String(i.name).toLowerCase()===c);
  if(!it){toast('ไม่พบ SKU "'+code+'"','bad');return}
  if(it.active===false){toast(it.sku+' ปิดใช้งานอยู่','bad');return}
  if((t==='OUT'||t==='TRF')&&itemQ(it.id)<=0){toast(it.sku+' ไม่มียอดคงเหลือ','bad');return}
  let i=d.lines.findIndex(l=>!l.itemId&&!l.locId&&!String(l.qty).trim());
  if(i<0){d.lines.push(blankLine());i=d.lines.length-1}
  setLineItem(t,i,it.id);
  if(t==='ADJ'){}else d.lines[i].qty='1';
  renderLines(t,t==='ADJ'?'l'+i+'-counted':'l'+i+'-qty');
  const f=$('#l'+i+(t==='ADJ'?'-counted':'-qty'));if(f)f.select();
  toast('เพิ่ม '+it.sku+' · '+it.name);
}
async function submitDoc(){
  const t=formType(),d=draftOf(t);
  if(!can(t==='ADJ'?'adj':'doc')){toast('คุณไม่มีสิทธิ์บันทึกเอกสารประเภทนี้','bad');return}
  d.tried=true;
  if(!d.date||d.date>ymd(new Date())){toast('วันที่ต้องไม่เกินวันนี้','bad');return}
  const a=analyze(t),bad=a.filter(x=>!x.empty&&!x.skip&&!x.ok),ok=a.filter(x=>x.ok);
  updateFormMeta();
  if(bad.length){toast('มี '+bad.length+' รายการที่ยังไม่สมบูรณ์ ตรวจสอบข้อความสีแดง','bad');const el=document.getElementById('msg'+bad[0].i);if(el)el.scrollIntoView({block:'center',behavior:'smooth'});return}
  if(!ok.length){toast(t==='ADJ'?'ไม่มีรายการที่ยอดต่างจากระบบ':'เพิ่มรายการสินค้าอย่างน้อย 1 รายการ','bad');return}
  const ts=docTs(d.date),id=uid(),no=nextNo(t,ts),btn=$('#submitDoc');
  if(btn)btn.disabled=true;
  try{
    await put('docs',id,{no,type:t,ts,party:d.party.trim(),ref:d.ref.trim(),note:d.note.trim(),by:ME.id||'',createdAt:Date.now(),lines:ok.map(x=>x.line)});
    S.drafts[t]=newDraft();S.flashId=id;
    toast('บันทึก '+no+' แล้ว · '+ok.length+' รายการ');
    S.lastDocId=id;
    render(false);setTimeout(()=>{S.flashId=null},2000);
  }catch(e){if(btn)btn.disabled=false}
}
