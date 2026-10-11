/* =========================================================
   Reports: stock on hand (item / location / matrix) + movement ledger
   ========================================================= */
function repRange(){
  const r=S.ui.rep,t0=startOfDay(Date.now());
  switch(r.quick){
    case 'today':return [t0,Infinity];
    case '7':return [t0-6*DAY,Infinity];
    case '30':return [t0-29*DAY,Infinity];
    case 'month':{const d=new Date();return [new Date(d.getFullYear(),d.getMonth(),1).getTime(),Infinity]}
    case 'all':return [0,Infinity];
    default:return [r.from?new Date(r.from+'T00:00:00').getTime():0,r.to?new Date(r.to+'T23:59:59.999').getTime():Infinity];
  }
}
function repItems(){
  const r=S.ui.rep,q=r.q.trim().toLowerCase();
  return S.items.map(it=>{const qty=r.loc!=='all'?qtyAt(it.id,r.loc):itemQ(it.id);return {it,qty,val:Math.max(0,qty)*(+it.cost||0)}})
   .filter(x=>{
     if(r.cat!=='all'&&x.it.cat!==r.cat)return false;
     if(r.hideZero&&x.qty===0)return false;
     if(!r.hideZero&&x.it.active===false&&x.qty===0)return false;
     if(q&&![x.it.sku,x.it.name,x.it.cat].some(v=>String(v||'').toLowerCase().includes(q)))return false;
     return true;
   }).sort((a,b)=>String(a.it.sku).localeCompare(String(b.it.sku),'th',{numeric:true}));
}
function repLocs(){
  const r=S.ui.rep,q=r.q.trim().toLowerCase();
  return S.locs.map(l=>({l,st:D.locStats.get(l.id)||{skus:0,value:0}})).filter(x=>{
    if(r.loc!=='all'&&x.l.id!==r.loc)return false;
    if(r.hideZero&&x.st.skus===0)return false;
    if(q&&![x.l.code,x.l.name,x.l.zone,x.l.wh].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    return true;
  }).sort((a,b)=>String(a.l.code).localeCompare(String(b.l.code),'th',{numeric:true}));
}
function repMatrix(){
  const r=S.ui.rep,items=repItems(),locs=S.locs.filter(l=>l.active!==false||(D.locStats.get(l.id)||{}).skus>0).sort((a,b)=>String(a.code).localeCompare(String(b.code),'th',{numeric:true}))
    .filter(l=>r.loc==='all'||l.id===r.loc).filter(l=>!r.hideZero||(D.locStats.get(l.id)||{}).skus>0);
  return {items:items.map(x=>x.it),locs};
}
function stockBody(){
  const r=S.ui.rep;
  if(!S.items.length)return '<div class="card"><div class="empty">'+ic('chart','big')+'<h3>ยังไม่มีข้อมูล</h3><p>เพิ่มสินค้าและบันทึกรับเข้าก่อน รายงานจะแสดงยอดคงเหลือให้อัตโนมัติ</p></div></div>';
  if(r.view==='item'){
    const rows=repItems(),tv=rows.reduce((s,x)=>s+x.val,0);
    return '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>SKU</th><th>สินค้า</th><th>หมวดหมู่</th><th class="r">คงเหลือ</th><th>หน่วย</th><th class="r">Min</th><th>สถานะ</th><th class="r">ต้นทุน/หน่วย</th><th class="r">มูลค่า</th></tr></thead><tbody>'
     +(rows.length?rows.map(x=>'<tr class="click" data-act="open-item" data-id="'+x.it.id+'"><td class="sku">'+esc(x.it.sku)+'</td><td class="cell-main">'+esc(x.it.name)+'</td><td>'+esc(x.it.cat)+'</td><td class="r num" style="font-weight:600">'+fq(x.qty)+'</td><td>'+esc(x.it.unit)+'</td><td class="r num">'+fq(x.it.min)+'</td><td>'+(x.it.active===false?'<span class="pill off">ปิดใช้งาน</span>':lvPill(x.it,x.qty))+'</td><td class="r num">'+money2(+x.it.cost||0)+'</td><td class="r num">'+money(x.val)+'</td></tr>').join(''):'<tr><td colspan="9"><div class="empty" style="padding:28px 0"><p>ไม่พบรายการตามเงื่อนไข</p></div></td></tr>')
     +'</tbody><tfoot><tr><td colspan="8">รวม '+rows.length+' รายการ'+(r.loc!=='all'?' · เฉพาะ '+esc(locCode(r.loc)):'')+'</td><td class="r num">'+money(tv)+'</td></tr></tfoot></table></div></div>';
  }
  if(r.view==='loc'){
    const rows=repLocs(),tv=rows.reduce((s,x)=>s+x.st.value,0);
    return '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Location</th><th>ชื่อ</th><th>คลัง / โซน</th><th class="r">จำนวน SKU</th><th class="r">มูลค่า</th></tr></thead><tbody>'
     +(rows.length?rows.map(x=>'<tr class="click" data-act="open-loc" data-id="'+x.l.id+'"><td class="sku" style="font-weight:600;color:var(--ink)">'+esc(x.l.code)+'</td><td>'+esc(x.l.name)+'</td><td>'+esc(x.l.wh||'')+(x.l.zone?' · '+esc(x.l.zone):'')+'</td><td class="r num">'+x.st.skus+'</td><td class="r num">'+money(x.st.value)+'</td></tr>').join(''):'<tr><td colspan="5"><div class="empty" style="padding:28px 0"><p>ไม่พบ Location ตามเงื่อนไข</p></div></td></tr>')
     +'</tbody><tfoot><tr><td colspan="4">รวม '+rows.length+' Location</td><td class="r num">'+money(tv)+'</td></tr></tfoot></table></div></div>';
  }
  const m=repMatrix();
  if(!m.items.length||!m.locs.length)return '<div class="card"><div class="empty"><p>ไม่มีข้อมูลสำหรับตารางสินค้า × Location</p></div></div>';
  return '<div class="card"><div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>สินค้า</th>'+m.locs.map(l=>'<th class="loc r" title="'+esc(l.name)+'">'+esc(l.code)+'</th>').join('')+'<th class="r">รวม</th></tr></thead><tbody>'
   +m.items.map(it=>{const vals=m.locs.map(l=>qtyAt(it.id,l.id)),mx=Math.max(1,...vals.map(Math.abs));
     return '<tr><td class="click" data-act="open-item" data-id="'+it.id+'" style="cursor:pointer;min-width:200px"><div class="cell-main">'+esc(it.name)+'</div><div class="cell-sub mono">'+esc(it.sku)+' · '+esc(it.unit)+'</div></td>'+vals.map(v=>'<td class="cellq'+(v?'':' zero')+'" style="--h:'+(v>0?(v/mx).toFixed(2):0)+'">'+(v?fq(v):'·')+'</td>').join('')+'<td class="r num" style="font-weight:600">'+fq(itemQ(it.id))+'</td></tr>'}).join('')
   +'</tbody></table></div></div>';
}
function movesData(){
  const r=S.ui.rep,[a,b]=repRange(),dq=r.docq.trim().toLowerCase();
  const base=D.moves.filter(m=>(!r.item||m.itemId===r.item)&&(!r.mloc||m.locId===r.mloc));
  let run=0;for(const m of base){if(m.ts<a)run=q3(run+m.qty)}
  const opening=run,rows=[];
  for(const m of base){
    if(m.ts<a||m.ts>b)continue;
    run=q3(run+m.qty);
    if(!r.types[m.type])continue;
    if(dq&&![m.docNo,m.sku,m.name,m.ref,m.party].some(v=>String(v||'').toLowerCase().includes(dq)))continue;
    rows.push({m,run});
  }
  return {rows,opening,closing:run};
}
function movesBody(){
  const r=S.ui.rep,{rows,opening,closing}=movesData(),it=r.item?D.itemById.get(r.item):null;
  const docs=new Set(rows.map(x=>x.m.docId));
  let vin=0,vout=0;rows.forEach(({m})=>{if(m.type==='IN')vin+=Math.abs(m.qty)*m.cost;else if(m.type==='OUT')vout+=Math.abs(m.qty)*m.cost});
  const stat=(l,v,c)=>'<div class="stat"><small>'+l+'</small><b class="num"'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></div>';
  const unit=it?' '+esc(it.unit):'';
  const shown=rows.slice().reverse().slice(0,r.limit);
  const nv=D.voidMap.size;
  return (nv?'<div class="sub" style="margin:0 0 10px">ไม่รวมเอกสารที่ยกเลิก '+nv+' ฉบับ — ดูได้ที่แท็บ “ทะเบียนเอกสาร”</div>':'')+'<div class="stat-row" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">'+stat('เอกสาร / รายการ',docs.size+' / '+rows.length)+stat('มูลค่ารับเข้า',money(vin),'var(--in-ink)')+stat('มูลค่าจ่ายออก',money(vout),'var(--out-ink)')
   +(it?stat('ยอดยกมา',fq(opening)+unit)+stat('ยอดคงเหลือปลายช่วง',fq(closing)+unit):'')+'</div>'
   +'<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>วัน-เวลา</th><th>เอกสาร</th><th>ประเภท</th><th>สินค้า</th><th>Location</th><th class="r">เข้า (+)</th><th class="r">ออก (−)</th>'+(it?'<th class="r">คงเหลือ</th>':'')+'</tr></thead><tbody>'
   +(shown.length?shown.map(({m,run})=>'<tr class="click" data-act="open-doc" data-id="'+m.docId+'"><td class="cell-sub" style="white-space:nowrap">'+dShort(m.ts)+' '+tShort(m.ts)+'</td><td class="sku">'+esc(m.docNo)+'</td><td>'+typePill(m)+'</td><td><div class="cell-main">'+esc(m.name)+'</div><div class="cell-sub mono">'+esc(m.sku)+'</div></td><td class="mono" style="font-size:12.5px">'+esc(locCode(m.locId))+(m.type==='TRF'?'<span class="cell-sub"> '+(m.dir==='out'?'→ ':'← ')+esc(locCode(m.peer))+'</span>':'')+'</td><td class="r num qty-pos">'+(m.qty>0?'+'+fq(m.qty):'')+'</td><td class="r num qty-neg">'+(m.qty<0?'−'+fq(-m.qty):'')+'</td>'+(it?'<td class="r num">'+fq(run)+'</td>':'')+'</tr>').join(''):'<tr><td colspan="'+(it?8:7)+'"><div class="empty" style="padding:30px 0">'+ic('clock','big')+'<p>ไม่พบรายการเคลื่อนไหวในช่วงและเงื่อนไขที่เลือก</p></div></td></tr>')
   +'</tbody></table></div>'+(rows.length>shown.length?'<div class="row" style="justify-content:center;padding:12px"><button class="btn sm" type="button" data-act="rep-more">แสดงเพิ่ม (เหลืออีก '+(rows.length-shown.length)+' รายการ)</button></div>':'')+'</div>';
}
/* ----- document registry (includes voided documents) ----- */
const docVal=d=>(d.lines||[]).reduce((s,l)=>s+(d.type==='ADJ'?Math.abs(l.delta):+l.qty)*(+l.cost||0),0);
function regRows(){
  const r=S.ui.rep,q=r.dq.trim().toLowerCase(),[a,b]=repRange();
  return S.docs.filter(d=>{
    const v=D.voidMap.has(d.id);
    if(!r.dtypes[d.type])return false;
    if(r.dstat==='live'&&v)return false;
    if(r.dstat==='void'&&!v)return false;
    if(d.ts<a||d.ts>b)return false;
    if(q&&![d.no,d.party,d.ref,d.note].concat((d.lines||[]).map(l=>(l.sku||'')+' '+(l.name||''))).some(x=>String(x||'').toLowerCase().includes(q)))return false;
    return true;
  }).sort((a,b)=>b.ts-a.ts||(a.no<b.no?1:-1));
}
function regBody(){
  const r=S.ui.rep,rows=regRows(),shown=rows.slice(0,r.dlimit);
  const nVoid=rows.filter(d=>D.voidMap.has(d.id)).length,val=rows.filter(d=>!D.voidMap.has(d.id)&&(d.type==='IN'||d.type==='OUT')).reduce((s,d)=>s+docVal(d),0);
  const stat=(l,v,c)=>'<div class="stat"><small>'+l+'</small><b class="num"'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></div>';
  return '<div class="stat-row" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">'+stat('เอกสารทั้งหมด',rows.length)+stat('ใช้งาน',rows.length-nVoid,'var(--good-ink)')+stat('ยกเลิก',nVoid,nVoid?'var(--crit-ink)':'')+stat('มูลค่ารับ/จ่าย (ที่ไม่ยกเลิก)',money(val))+'</div>'
   +'<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>เลขที่</th><th>ประเภท</th><th>วัน-เวลา</th><th>คู่ค้า / อ้างอิง</th><th class="r">รายการ</th><th class="r">มูลค่า</th><th>ผู้บันทึก</th><th>สถานะ</th><th></th></tr></thead><tbody>'
   +(shown.length?shown.map(d=>{const v=D.voidMap.get(d.id);
     return '<tr class="click'+(v?' voided':'')+'" data-act="open-doc" data-id="'+d.id+'"><td class="sku'+(v?' struck':'')+'">'+esc(d.no)+'</td><td><span class="pill '+d.type+'">'+TYPES[d.type].name+'</span></td><td class="cell-sub" style="white-space:nowrap">'+dShort(d.ts)+' '+tShort(d.ts)+'</td><td><div class="cell-main ellip" style="max-width:220px">'+esc(d.party||'—')+'</div><div class="cell-sub mono">'+esc(d.ref)+'</div></td><td class="r num">'+(d.lines||[]).length+'</td><td class="r num">'+(d.type==='TRF'?'—':money(docVal(d)))+'</td><td class="cell-sub">'+byHtml(d.by)+'</td><td>'+(v?'<span class="pill out" title="'+esc(v.reason||'')+'">ยกเลิก</span>':'<span class="pill ok">ใช้งาน</span>')+'</td><td class="r"><button class="icon-btn sm" type="button" data-act="doc-print" data-id="'+d.id+'" aria-label="พิมพ์ '+esc(d.no)+'" title="พิมพ์ / ดาวน์โหลด">'+ic('dl')+'</button></td></tr>'}).join(''):'<tr><td colspan="9"><div class="empty" style="padding:30px 0">'+ic('list','big')+'<p>ไม่พบเอกสารในช่วงและเงื่อนไขที่เลือก</p></div></td></tr>')
   +'</tbody></table></div>'+(rows.length>shown.length?'<div class="row" style="justify-content:center;padding:12px"><button class="btn sm" type="button" data-act="rep-dmore">แสดงเพิ่ม (เหลืออีก '+(rows.length-shown.length)+' ฉบับ)</button></div>':'')+'</div>';
}
function repBody(){return S.ui.rep.tab==='stock'?stockBody():S.ui.rep.tab==='docs'?regBody():movesBody()}
function vReports(){
  const r=S.ui.rep,cats=[...new Set(S.items.map(i=>i.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
  const locOpts=(sel,all)=>'<option value="'+(all?'all':'')+'">'+(all?'ทุก Location':'ทุก Location')+'</option>'+S.locs.slice().sort((a,b)=>String(a.code).localeCompare(String(b.code),'th',{numeric:true})).map(l=>'<option value="'+l.id+'"'+(sel===l.id?' selected':'')+'>'+esc(l.code)+' · '+esc(l.name)+'</option>').join('');
  const tabs='<div class="hint-tab" style="margin-top:0"><button type="button" data-act="rep-tab" data-id="stock" aria-pressed="'+(r.tab==='stock')+'">'+ic('layers')+' สินค้าคงเหลือ</button><button type="button" data-act="rep-tab" data-id="moves" aria-pressed="'+(r.tab==='moves')+'">'+ic('clock')+' ความเคลื่อนไหวสินค้า</button><button type="button" data-act="rep-tab" data-id="docs" aria-pressed="'+(r.tab==='docs')+'">'+ic('list')+' ทะเบียนเอกสาร</button></div>';
  let tb;
  if(r.tab==='stock'){
    tb='<div class="toolbar" style="margin-top:14px"><div class="seg" role="group" aria-label="มุมมอง">'+[['item','ตามสินค้า'],['loc','ตาม Location'],['matrix','สินค้า × Location']].map(([k,n])=>'<button type="button" data-act="rep-view" data-id="'+k+'" aria-pressed="'+(r.view===k)+'">'+n+'</button>').join('')+'</div>'
     +'<div class="search-in">'+ic('search')+'<input class="in-ctl" id="rep-q" type="search" placeholder="ค้นหา…" value="'+esc(r.q)+'" autocomplete="off" aria-label="ค้นหา"></div>'
     +'<select class="in-ctl" id="rep-cat" aria-label="หมวดหมู่"><option value="all">ทุกหมวดหมู่</option>'+cats.map(c=>'<option value="'+esc(c)+'"'+(r.cat===c?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select>'
     +'<select class="in-ctl" id="rep-loc" aria-label="Location">'+locOpts(r.loc,true)+'</select>'
     +'<button class="chip" type="button" data-act="rep-hide" aria-pressed="'+r.hideZero+'">ซ่อนยอดศูนย์</button><span class="sp"></span><button class="btn" type="button" data-act="rep-export">'+ic('dl')+'ส่งออก CSV</button></div>';
  }else if(r.tab==='docs'){
    const q=(k,n)=>'<button class="chip" type="button" data-act="rep-quick" data-id="'+k+'" aria-pressed="'+(r.quick===k)+'">'+n+'</button>';
    tb='<div class="toolbar" style="margin-top:14px">'+q('today','วันนี้')+q('7','7 วัน')+q('30','30 วัน')+q('month','เดือนนี้')+q('all','ทั้งหมด')+q('custom','กำหนดเอง')
     +'<input class="in-ctl" type="date" id="rep-from" aria-label="ตั้งแต่วันที่" value="'+esc(r.from)+'"'+(r.quick==='custom'?'':' disabled')+'><span class="sub">ถึง</span><input class="in-ctl" type="date" id="rep-to" aria-label="ถึงวันที่" value="'+esc(r.to)+'"'+(r.quick==='custom'?'':' disabled')+'><span class="sp"></span><button class="btn" type="button" data-act="rep-export">'+ic('dl')+'ส่งออก CSV</button></div>'
     +'<div class="toolbar">'+Object.keys(TYPES).map(k=>'<button class="chip" type="button" data-act="rep-dtype" data-id="'+k+'" aria-pressed="'+(!!r.dtypes[k])+'">'+TYPES[k].name+'</button>').join('')
     +'<div class="seg" role="group" aria-label="สถานะ">'+[['all','ทั้งหมด'],['live','ใช้งาน'],['void','ยกเลิก']].map(([k,n])=>'<button type="button" data-act="rep-dstat" data-id="'+k+'" aria-pressed="'+(r.dstat===k)+'">'+n+'</button>').join('')+'</div>'
     +'<div class="search-in" style="min-width:200px"><input class="in-ctl" id="rep-dq" type="search" style="padding-left:12px" placeholder="เลขที่ / คู่ค้า / อ้างอิง / สินค้า" value="'+esc(r.dq)+'" autocomplete="off" aria-label="ค้นหาเอกสาร"></div></div>';
  }else{
    const q=(k,n)=>'<button class="chip" type="button" data-act="rep-quick" data-id="'+k+'" aria-pressed="'+(r.quick===k)+'">'+n+'</button>';
    tb='<div class="toolbar" style="margin-top:14px">'+q('today','วันนี้')+q('7','7 วัน')+q('30','30 วัน')+q('month','เดือนนี้')+q('all','ทั้งหมด')+q('custom','กำหนดเอง')
     +'<input class="in-ctl" type="date" id="rep-from" aria-label="ตั้งแต่วันที่" value="'+esc(r.from)+'"'+(r.quick==='custom'?'':' disabled')+'><span class="sub">ถึง</span><input class="in-ctl" type="date" id="rep-to" aria-label="ถึงวันที่" value="'+esc(r.to)+'"'+(r.quick==='custom'?'':' disabled')+'><span class="sp"></span><button class="btn" type="button" data-act="rep-export">'+ic('dl')+'ส่งออก CSV</button></div>'
     +'<div class="toolbar">'+Object.keys(TYPES).map(k=>'<button class="chip" type="button" data-act="rep-type" data-id="'+k+'" aria-pressed="'+(!!r.types[k])+'">'+TYPES[k].name+'</button>').join('')
     +'<select class="in-ctl" id="rep-item" aria-label="สินค้า" style="max-width:260px"><option value="">ทุกสินค้า</option>'+S.items.slice().sort((a,b)=>String(a.sku).localeCompare(String(b.sku),'th',{numeric:true})).map(i=>'<option value="'+i.id+'"'+(r.item===i.id?' selected':'')+'>'+esc(i.sku)+' · '+esc(i.name)+'</option>').join('')+'</select>'
     +'<select class="in-ctl" id="rep-mloc" aria-label="Location" style="max-width:220px">'+locOpts(r.mloc,false)+'</select>'
     +'<div class="search-in" style="min-width:160px"><input class="in-ctl" id="rep-docq" type="search" style="padding-left:12px" placeholder="เลขที่เอกสาร / อ้างอิง" value="'+esc(r.docq)+'" autocomplete="off" aria-label="ค้นหาเอกสาร"></div></div>';
  }
  return tabs+tb+'<div id="repBody">'+repBody()+'</div>';
}
function updateReports(){const b=$('#repBody');if(b){b.innerHTML=repBody();afterRender(b)}}
function exportReport(){
  const r=S.ui.rep,stamp=ymd(new Date());
  if(r.tab==='stock'){
    if(r.view==='item'){
      saveCsv('stock-by-item-'+stamp+'.csv',[['SKU','สินค้า','หมวดหมู่','คงเหลือ','หน่วย','Min','Max','สถานะ','ต้นทุน/หน่วย','มูลค่า']].concat(repItems().map(x=>[x.it.sku,x.it.name,x.it.cat||'',q3(x.qty),x.it.unit,x.it.min||0,x.it.max||0,x.it.active===false?'ปิดใช้งาน':LVL[levelOf(x.it,x.qty)],x.it.cost||0,Math.round(x.val*100)/100])));
    }else if(r.view==='loc'){
      saveCsv('stock-by-location-'+stamp+'.csv',[['Location','ชื่อ','คลัง','โซน','จำนวน SKU','มูลค่า']].concat(repLocs().map(x=>[x.l.code,x.l.name,x.l.wh||'',x.l.zone||'',x.st.skus,Math.round(x.st.value*100)/100])));
    }else{
      const m=repMatrix();
      saveCsv('stock-matrix-'+stamp+'.csv',[['SKU','สินค้า','หน่วย'].concat(m.locs.map(l=>l.code),['รวม'])].concat(m.items.map(it=>[it.sku,it.name,it.unit].concat(m.locs.map(l=>qtyAt(it.id,l.id)),[itemQ(it.id)]))));
    }
  }else if(r.tab==='docs'){
    saveCsv('document-registry-'+stamp+'.csv',[['เลขที่','ประเภท','วันที่','เวลา','คู่ค้า/ผู้เบิก','อ้างอิง','จำนวนรายการ','มูลค่าตามต้นทุน','สถานะ','เหตุผลยกเลิก','วันที่ยกเลิก']].concat(regRows().map(d=>{const v=D.voidMap.get(d.id);return [d.no,TYPES[d.type].name,ymd(new Date(d.ts)),tShort(d.ts),d.party||'',d.ref||'',(d.lines||[]).length,d.type==='TRF'?'':Math.round(docVal(d)*100)/100,v?'ยกเลิก':'ใช้งาน',v?v.reason||'':'',v?ymd(new Date(v.at||0)):'']})));
  }else{
    const {rows}=movesData();
    saveCsv('stock-movement-'+stamp+'.csv',[['วันที่','เวลา','เอกสาร','ประเภท','SKU','สินค้า','Location','จำนวน (+/−)','หน่วย','ต้นทุน/หน่วย','Lot','ผู้ส่ง/ผู้เบิก','อ้างอิง']].concat(rows.slice().reverse().map(({m})=>[ymd(new Date(m.ts)),tShort(m.ts),m.docNo,TYPES[m.type].name+(m.type==='TRF'?(m.dir==='in'?' (เข้า)':' (ออก)'):''),m.sku,m.name,locCode(m.locId),m.qty,m.unit,m.cost,m.lot,m.party,m.ref])));
  }
}
