/* =========================================================
   Dashboard, Items, item drawer, doc viewer, confirm
   ========================================================= */
const short=v=>v>=1e6?+(v/1e6).toFixed(1)+'M':v>=1e3?+(v/1e3).toFixed(1)+'k':String(Math.round(v));
function niceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),f=v/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
function topRound(x,y,w,h,r){x=+x;y=+y;w=+w;h=+h;r=Math.max(0,Math.min(r,h,w/2));const f=v=>+v.toFixed(1);return 'M'+f(x)+','+f(y+h)+'V'+f(y+r)+'Q'+f(x)+','+f(y)+' '+f(x+r)+','+f(y)+'H'+f(x+w-r)+'Q'+f(x+w)+','+f(y)+' '+f(x+w)+','+f(y+r)+'V'+f(y+h)+'Z'}
function levelBar(it,qn,withMarker){
  const k=levelOf(it,qn),mx=+it.max>0?+it.max:(+it.min>0?+it.min*3:Math.max(qn,1));
  const pct=Math.max(0,Math.min(100,qn/mx*100));
  const mk=withMarker&&+it.min>0?'<u style="left:'+Math.min(98,it.min/mx*100)+'%"></u>':'';
  return '<div class="bar '+k+'"><i data-w="'+pct.toFixed(1)+'"></i>'+mk+'</div>';
}
const liveDocs=()=>S.docs.filter(d=>!D.voidMap.has(d.id));
function emptyAll(){
  if(!can('master'))return '<div class="card"><div class="empty">'+ic('wh','big')+'<h3>ยังไม่มีข้อมูลในคลัง</h3><p>รอผู้จัดการคลังหรือผู้ดูแลระบบสร้าง Location และสินค้าก่อน</p></div></div>';
  return '<div class="card"><div class="empty">'+ic('wh','big')+'<h3>เริ่มต้นใช้งานคลังสินค้า</h3><p>ระบบยังไม่มีข้อมูล เริ่มจากสร้าง Location สำหรับเก็บสินค้า แล้วเพิ่มสินค้า จากนั้นบันทึกรับเข้า ยอดคงเหลือแต่ละ Location จะคำนวณให้อัตโนมัติ</p>'
   +'<div class="row wrap" style="justify-content:center;margin-top:8px"><button class="btn primary" data-act="loc-new">'+ic('pin')+'1. เพิ่ม Location</button><button class="btn" data-act="item-new">'+ic('box')+'2. เพิ่มสินค้า</button><button class="btn" data-act="go" data-id="receive">'+ic('in')+'3. บันทึกรับเข้า</button></div></div></div>';
}
function skeleton(){
  return '<div class="grid g-kpi">'+'<div class="skel" style="height:112px"></div>'.repeat(4)+'</div><div class="grid g-2 sec-gap"><div class="skel" style="height:320px"></div><div class="skel" style="height:320px"></div></div><div class="skel sec-gap" style="height:220px"></div>';
}

/* ----- dashboard ----- */
function dayBuckets(n){
  const end=startOfDay(Date.now()),out=[];
  for(let i=n-1;i>=0;i--)out.push({t:end-i*DAY,in:0,out:0});
  for(const m of D.moves){
    if(m.type!=='IN'&&m.type!=='OUT')continue;
    const i=Math.round((startOfDay(m.ts)-out[0].t)/DAY);if(i<0||i>=n)continue;
    out[i][m.type==='IN'?'in':'out']+=Math.abs(m.qty)*(m.cost||0);
  }
  return out;
}
const hasSample=()=>S.items.some(x=>x.sample)||S.locs.some(x=>x.sample)||S.docs.some(x=>x.sample);
function sampleBanner(){
  return hasSample()?'<div class="banner info">'+ic('info')+'<span style="flex:1">กำลังแสดงข้อมูลตัวอย่างสำหรับทดลองใช้งาน (สินค้า, Location และเอกสารที่มีป้าย “ตัวอย่าง”)</span>'+(can('users')?'<button class="btn sm" type="button" data-act="sample-clear">ล้างข้อมูลตัวอย่าง</button>':'')+'</div>':'';
}
function vDashboard(){
  if(!S.items.length&&!S.locs.length)return emptyAll();
  const t0=startOfDay(Date.now());
  const act=S.items.filter(i=>i.active!==false);
  const withStock=act.filter(i=>itemQ(i.id)>0).length;
  const todayDocs=liveDocs().filter(d=>d.ts>=t0);
  const nIn=todayDocs.filter(d=>d.type==='IN').length,nOut=todayDocs.filter(d=>d.type==='OUT').length;
  const outCnt=D.lows.filter(x=>x.lv==='out').length;
  const kpi=(cls,icon,label,val,fmtv,key,foot,color)=>'<div class="card kpi" style="--k:'+color+'"><div class="lbl">'+ic(icon)+label+'</div><div class="val num"><span data-count="'+val+'" data-key="'+key+'"'+(fmtv?' data-fmt="money"':'')+'>0</span></div><div class="foot">'+foot+'</div></div>';
  const maxCat=Math.max(1,...D.catValue.map(c=>c.value));
  const cats=D.catValue.length?D.catValue.slice(0,7).map(c=>'<div class="hbar"><span class="ellip" title="'+esc(c.name)+'">'+esc(c.name)+'</span><div class="bar acc"><i data-w="'+(c.value/maxCat*100).toFixed(1)+'"></i></div><b class="num">'+money(c.value)+'</b></div>').join(''):'<div class="sub" style="padding:20px 0">ยังไม่มียอดคงเหลือ</div>';
  const lows=D.lows.length?D.lows.slice(0,6).map(x=>'<div class="low-i" data-act="open-item" data-id="'+x.it.id+'"><div style="min-width:0"><div class="cell-main ellip">'+esc(x.it.name)+'</div><div class="cell-sub"><span class="mono">'+esc(x.it.sku)+'</span> · คงเหลือ '+fq(x.qty)+' '+esc(x.it.unit)+' / Min '+fq(x.it.min)+'</div></div><div>'+levelBar(x.it,x.qty,true)+'<div style="margin-top:5px;text-align:right">'+lvPill(x.it,x.qty)+'</div></div></div>').join(''):'<div class="empty" style="padding:28px 10px">'+ic('check','big')+'<p>ทุกรายการมียอดคงเหลืออยู่ในระดับปกติ</p></div>';
  const docs=liveDocs().sort((a,b)=>b.ts-a.ts).slice(0,7).map(d=>{
    const l0=(d.lines||[])[0]||{},more=(d.lines||[]).length-1;
    return '<div class="feed-i" data-act="open-doc" data-id="'+d.id+'"><span class="ico '+d.type+'">'+ic(TYPES[d.type].icon)+'</span><div style="min-width:0;flex:1"><div class="cell-main ellip"><span class="mono">'+esc(d.no)+'</span> · '+TYPES[d.type].name+'</div><div class="cell-sub ellip">'+esc(l0.name||'')+(more>0?' และอีก '+more+' รายการ':'')+'</div></div><span class="cell-sub" style="white-space:nowrap">'+rel(d.ts)+'</span></div>';
  }).join('')||'<div class="sub" style="padding:20px 0">ยังไม่มีเอกสาร</div>';
  const maxV=D.maxLocVal;
  const tiles=activeLocs().map(l=>{const st=D.locStats.get(l.id)||{skus:0,value:0};return '<button class="tile" type="button" data-act="open-loc" data-id="'+l.id+'" title="'+esc(l.name)+'"><span class="f" data-h="'+(maxV>0?Math.max(st.value>0?8:0,st.value/maxV*100).toFixed(1):0)+'"></span><b>'+esc(l.code)+'</b><span>'+st.skus+' SKU · '+money(st.value)+'</span></button>'}).join('')||'<div class="sub">ยังไม่มี Location</div>';
  return sampleBanner()+'<div class="grid g-kpi stagger">'
   +kpi('','coin','มูลค่าสินค้าคงคลัง',D.totalValue,true,'k-val','ต้นทุนรวมสินค้าที่ใช้งาน '+act.length+' SKU','var(--accent)')
   +kpi('','box','SKU ที่ใช้งาน',act.length,false,'k-sku','มียอดคงเหลือ '+withStock+' รายการ','var(--in)')
   +kpi('','alert','ต่ำกว่า Min / หมด',D.lows.length,false,'k-low','หมดสต๊อก '+outCnt+' · ต่ำกว่า Min '+(D.lows.length-outCnt),'var(--warn)')
   +kpi('','list','เอกสารวันนี้',todayDocs.length,false,'k-doc','รับเข้า '+nIn+' · จ่ายออก '+nOut+' · อื่นๆ '+(todayDocs.length-nIn-nOut),'var(--out)')
   +'</div>'
   +'<div class="grid g-2 sec-gap stagger"><section class="card"><div class="card-h"><div><h2>มูลค่ารับเข้า / จ่ายออก</h2><div class="sub">มูลค่าตามต้นทุนต่อวัน (บาท)</div></div><span class="sp"></span><div class="legend"><span><i style="background:var(--in)"></i>รับเข้า</span><span><i style="background:var(--out)"></i>จ่ายออก</span></div></div><div class="card-b"><div class="chart" id="mvChart"></div></div></section>'
   +'<section class="card"><div class="card-h"><div><h2>มูลค่าตามหมวดหมู่</h2><div class="sub">เรียงจากมากไปน้อย</div></div></div><div class="card-b">'+cats+'</div></section></div>'
   +'<div class="grid g-2e sec-gap stagger"><section class="card"><div class="card-h"><div><h2>ต้องสั่งซื้อ / เติมสต๊อก</h2><div class="sub">สินค้าที่ต่ำกว่า Min หรือหมด</div></div></div><div class="card-b">'+lows+'</div></section>'
   +'<section class="card"><div class="card-h"><div><h2>เอกสารล่าสุด</h2><div class="sub">รับเข้า จ่ายออก ย้าย และปรับยอด</div></div></div><div class="card-b feed">'+docs+'</div></section></div>'
   +'<section class="card sec-gap"><div class="card-h"><div><h2>แผนผังคลังสินค้า</h2><div class="sub">ความเข้มสีแสดงมูลค่าสินค้าในแต่ละ Location · คลิกเพื่อดูรายการ</div></div></div><div class="card-b"><div class="heat">'+tiles+'</div></div></section>';
}
let chartSig='',chartRO=null;
function drawMvChart(animate){
  const el=$('#mvChart');if(!el)return;
  const W=Math.max(280,Math.floor(el.clientWidth)),n=W<520?14:30,H=244;
  const days=dayBuckets(n),peak=Math.max(...days.map(d=>Math.max(d.in,d.out)));
  if(peak<=0){el.innerHTML='<div class="empty" style="padding:50px 0">'+ic('chart','big')+'<p>ยังไม่มีการรับเข้า/จ่ายออกใน '+n+' วันที่ผ่านมา</p></div>';return}
  const mx=niceMax(peak),L=46,R=6,T=10,B=30,pw=W-L-R,ph=H-T-B,band=pw/n,bw=Math.max(2,Math.min(12,(band-5)/2));
  const y=v=>T+ph-(v/mx)*ph,base=y(0),step=n>14?5:2;
  const an=animate?'':'animation:none;';
  let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="กราฟมูลค่ารับเข้าและจ่ายออกรายวัน '+n+' วันล่าสุด">';
  for(let i=0;i<=4;i++){const v=mx/4*i,yy=y(v);s+='<line class="gl'+(i?'':' base')+'" x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'"/><text class="ax" x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end">'+(i?short(v):'0')+'</text>'}
  days.forEach((d,i)=>{
    const cx=L+band*i+band/2;
    s+='<rect class="band" data-i="'+i+'" x="'+(L+band*i)+'" y="'+T+'" width="'+band+'" height="'+ph+'" rx="4"/>';
    if(d.in>0)s+='<path class="b" style="'+an+'animation-delay:'+(i*16)+'ms" d="'+topRound((cx-bw-1).toFixed(1),y(d.in).toFixed(1),bw.toFixed(1),(base-y(d.in)).toFixed(1),4)+'" fill="var(--in)"/>';
    if(d.out>0)s+='<path class="b" style="'+an+'animation-delay:'+(i*16+8)+'ms" d="'+topRound((cx+1).toFixed(1),y(d.out).toFixed(1),bw.toFixed(1),(base-y(d.out)).toFixed(1),4)+'" fill="var(--out)"/>';
    if((n-1-i)%step===0)s+='<text class="ax" x="'+cx+'" y="'+(H-9)+'" text-anchor="middle">'+new Date(d.t).toLocaleDateString('th-TH',{day:'numeric',month:'short'})+'</text>';
  });
  s+='<rect class="hit" x="'+L+'" y="'+T+'" width="'+pw+'" height="'+ph+'"/></svg>';
  el.innerHTML=s;
  const svg=$('svg',el),bands=$$('.band',svg);let cur=-1;
  const hit=$('.hit',svg);
  hit.addEventListener('pointermove',e=>{
    const r=svg.getBoundingClientRect(),sc=r.width/W,i=Math.floor(((e.clientX-r.left)/sc-L)/band);
    if(i<0||i>=n)return;
    if(i!==cur){if(bands[cur])bands[cur].classList.remove('on');bands[i].classList.add('on');cur=i}
    const d=days[i];
    showTip(e.clientX,e.clientY,'<b>'+new Date(d.t).toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'})+'</b><div><span style="color:var(--in)">รับเข้า</span><span class="num">'+money(d.in)+'</span></div><div><span style="color:var(--out)">จ่ายออก</span><span class="num">'+money(d.out)+'</span></div>');
  });
  hit.addEventListener('pointerleave',()=>{if(bands[cur])bands[cur].classList.remove('on');cur=-1;hideTip()});
}
function showTip(x,y,html){
  const t=$('#tip');t.innerHTML=html;t.classList.add('on');
  const w=t.offsetWidth,h=t.offsetHeight;
  t.style.left=Math.max(8,Math.min(x+16,innerWidth-w-8))+'px';t.style.top=Math.max(8,Math.min(y-h-12,innerHeight-h-8))+'px';
}
function hideTip(){$('#tip').classList.remove('on')}
function afterDashboard(enter){
  const el=$('#mvChart');if(!el)return;
  drawMvChart(!!enter);
  if(chartRO)chartRO.disconnect();
  if(window.ResizeObserver){let w=el.clientWidth;chartRO=new ResizeObserver(()=>{const nw=el.clientWidth;if(Math.abs(nw-w)>8){w=nw;drawMvChart(false)}});chartRO.observe(el)}
}

/* ----- items ----- */
const thumb=(i,cls)=>'<span class="thumb'+(cls?' '+cls:'')+'">'+(i.photo?'<img src="'+photoUrl(i.photo)+'" alt="" loading="lazy">':ic('box'))+'</span>';
function itemRows(){
  const q=S.ui.itemQ.trim().toLowerCase(),cat=S.ui.itemCat,show=S.ui.itemShow;
  const list=S.items.filter(i=>{
    if(show==='active'&&i.active===false)return false;
    if(show==='inactive'&&i.active!==false)return false;
    if(cat!=='all'&&i.cat!==cat)return false;
    if(q&&![i.sku,i.name,i.cat,i.supplier].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    return true;
  }).sort((a,b)=>String(a.sku).localeCompare(String(b.sku),'th',{numeric:true}));
  if(!list.length)return '<tr><td colspan="6"><div class="empty" style="padding:36px 0">'+ic('box','big')+'<h3>'+(S.items.length?'ไม่พบสินค้าที่ตรงเงื่อนไข':'ยังไม่มีสินค้า')+'</h3><p>'+(S.items.length?'ลองเปลี่ยนคำค้นหาหรือตัวกรอง':'เพิ่มสินค้าชิ้นแรก พร้อมระบุยอดยกมาได้ในขั้นตอนเดียว')+'</p></div></td></tr>';
  return list.map(i=>{
    const qn=itemQ(i.id),locs=D.itemLocs.get(i.id)||[];
    const chips=locs.slice(0,2).map(x=>'<span class="tag mono" title="'+esc(fq(x.qty))+'">'+esc(locCode(x.locId))+' · '+fq(x.qty)+'</span>').join(' ')+(locs.length>2?' <span class="cell-sub">+'+(locs.length-2)+'</span>':'');
    return '<tr class="click" data-act="open-item" data-id="'+i.id+'"><td><div class="row nowrap" style="gap:12px">'+thumb(i)+'<div style="min-width:0"><div class="cell-main">'+esc(i.name)+'</div><div class="cell-sub"><span class="mono">'+esc(i.sku)+'</span>'+(i.cat?' · '+esc(i.cat):'')+'</div></div></div></td>'
     +'<td style="min-width:150px"><div class="num" style="font-weight:600">'+fq(qn)+' <span class="cell-sub">'+esc(i.unit)+'</span></div>'+levelBar(i,qn,true)+'</td>'
     +'<td>'+(chips||'<span class="cell-sub">—</span>')+'</td><td class="r num">'+money(Math.max(0,qn)*(+i.cost||0))+'</td><td class="r num">'+money2(+i.cost||0)+'</td>'
     +'<td>'+(i.active===false?'<span class="pill off">ปิดใช้งาน</span>':lvPill(i,qn))+'</td></tr>';
  }).join('');
}
function vItems(){
  const cats=[...new Set(S.items.map(i=>i.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
  return '<div class="toolbar"><div class="search-in">'+ic('search')+'<input class="in-ctl" id="itemQ" type="search" placeholder="ค้นหา SKU, ชื่อสินค้า, Supplier…" value="'+esc(S.ui.itemQ)+'" autocomplete="off" aria-label="ค้นหาสินค้า"></div>'
   +'<select class="in-ctl" id="itemCat" aria-label="หมวดหมู่"><option value="all">ทุกหมวดหมู่</option>'+cats.map(c=>'<option'+(S.ui.itemCat===c?' selected':'')+' value="'+esc(c)+'">'+esc(c)+'</option>').join('')+'</select>'
   +'<select class="in-ctl" id="itemShow" aria-label="สถานะ"><option value="active"'+(S.ui.itemShow==='active'?' selected':'')+'>ที่ใช้งาน</option><option value="inactive"'+(S.ui.itemShow==='inactive'?' selected':'')+'>ปิดใช้งาน</option><option value="all"'+(S.ui.itemShow==='all'?' selected':'')+'>ทั้งหมด</option></select>'
   +'<span class="sp"></span>'+(can('master')?'<button class="btn primary" type="button" data-act="item-new">'+ic('plus')+'เพิ่มสินค้า</button>':'')+'</div>'
   +'<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>สินค้า</th><th>คงเหลือ</th><th>Location</th><th class="r">มูลค่า</th><th class="r">ต้นทุน/หน่วย</th><th>สถานะ</th></tr></thead><tbody id="itemsBody">'+itemRows()+'</tbody></table></div></div>';
}
function updateItems(){const b=$('#itemsBody');if(b){b.innerHTML=itemRows();afterRender(b)}}

/* item form */
function photoField(it){
  const has=it&&it.photo;
  const prev='<div class="photo-prev" id="photoPrev">'+(has?'<img src="'+photoUrl(it.photo)+'" alt="">':ic('box'))+'</div>';
  if(!ASSETS)return '<div class="fld full"><label>รูปสินค้า</label><div class="photo-fld">'+prev+'<div class="sub">การแนบรูปทำได้เฉพาะผู้ที่มีสิทธิ์แก้ไขหน้านี้ (Editor ขึ้นไป) — ผู้ใช้อื่นยังเห็นรูปที่แนบไว้แล้วตามปกติ</div></div></div>';
  return '<div class="fld full"><label for="f-photo">รูปสินค้า</label><div class="photo-fld">'+prev+'<div class="col"><div class="row wrap" style="gap:8px"><label class="btn sm" for="f-photo" tabindex="0">'+ic('plus')+(has?'เปลี่ยนรูป':'เลือกรูป / ถ่ายภาพ')+'</label><input class="vh" type="file" id="f-photo" name="photo" accept="image/*">'
    +(has?'<label class="chk"><input type="checkbox" name="rmphoto" id="f-rmphoto"> ลบรูปเดิม</label>':'')+'</div><div class="sub">ระบบย่อรูปให้อัตโนมัติ (ด้านยาวไม่เกิน 1,000 px)</div></div></div></div>';
}
function itemModal(id){
  const it=id?D.itemById.get(id):null,cats=[...new Set(S.items.map(i=>i.cat).filter(Boolean))],units=[...new Set(['ชิ้น','กล่อง','ถุง','ม้วน','เส้น','ลัง','แพ็ก','เมตร','กก.','ลิตร','ชุด',...S.items.map(i=>i.unit).filter(Boolean)])];
  const v=(k,d)=>esc(it?(it[k]==null?'':it[k]):(d||''));
  const opening=!it&&activeLocs().length?'<div class="full" style="border-top:1px dashed var(--line);padding-top:14px"><div class="cell-main" style="margin-bottom:8px">ยอดยกมา (ไม่บังคับ)</div><div class="form-grid"><div class="fld"><label for="f-oqty">จำนวนยกมา</label><input class="in-ctl" id="f-oqty" name="oqty" inputmode="decimal" placeholder="0"></div><div class="fld"><label for="f-oloc">เก็บที่ Location</label><select class="in-ctl" id="f-oloc" name="oloc"><option value="">เลือก Location</option>'+activeLocs().map(l=>'<option value="'+l.id+'">'+esc(l.code)+' · '+esc(l.name)+'</option>').join('')+'</select></div></div></div>':'';
  openModal('<form data-form="item" data-id="'+(id||'')+'"><div class="modal-h"><h2>'+(it?'แก้ไขสินค้า':'เพิ่มสินค้าใหม่')+'</h2><span class="sp"></span><button class="icon-btn" type="button" data-act="modal-close" aria-label="ปิด">'+ic('x')+'</button></div><div class="modal-b"><div class="form-grid">'
   +'<div class="fld"><label for="f-sku">SKU / รหัสสินค้า <i>*</i></label><input class="in-ctl mono" id="f-sku" name="sku" required value="'+v('sku')+'" autocomplete="off"></div>'
   +'<div class="fld"><label for="f-name">ชื่อสินค้า <i>*</i></label><input class="in-ctl" id="f-name" name="name" required value="'+v('name')+'" autocomplete="off"></div>'
   +'<div class="fld"><label for="f-cat">หมวดหมู่</label><input class="in-ctl" id="f-cat" name="cat" list="dl-cat" value="'+v('cat')+'" autocomplete="off"><datalist id="dl-cat">'+cats.map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist></div>'
   +'<div class="fld"><label for="f-unit">หน่วยนับ <i>*</i></label><input class="in-ctl" id="f-unit" name="unit" required list="dl-unit" value="'+v('unit')+'" autocomplete="off"><datalist id="dl-unit">'+units.map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist></div>'
   +'<div class="fld"><label for="f-cost">ต้นทุนต่อหน่วย (บาท)</label><input class="in-ctl" id="f-cost" name="cost" inputmode="decimal" value="'+v('cost')+'"></div>'
   +'<div class="fld"><label for="f-price">ราคาขาย/ราคาอ้างอิง (บาท)</label><input class="in-ctl" id="f-price" name="price" inputmode="decimal" value="'+v('price')+'"></div>'
   +'<div class="fld"><label for="f-min">Min (จุดสั่งซื้อ)</label><input class="in-ctl" id="f-min" name="min" inputmode="decimal" value="'+v('min')+'"></div>'
   +'<div class="fld"><label for="f-max">Max (ระดับสูงสุด)</label><input class="in-ctl" id="f-max" name="max" inputmode="decimal" value="'+v('max')+'"></div>'
   +'<div class="fld full"><label for="f-sup">Supplier / ผู้ขาย</label><input class="in-ctl" id="f-sup" name="supplier" value="'+v('supplier')+'" autocomplete="off"></div>'
   +photoField(it)
   +'<div class="fld full"><label for="f-note">รายละเอียด / สเปก / หมายเหตุ</label><textarea class="in-ctl" id="f-note" name="note">'+v('note')+'</textarea></div>'
   +opening+'</div></div><div class="modal-f"><button class="btn" type="button" data-act="modal-close">ยกเลิก</button><button class="btn primary" type="submit">'+ic('check')+(it?'บันทึกการแก้ไข':'เพิ่มสินค้า')+'</button></div></form>');
}
async function saveItem(form){
  const f=Object.fromEntries(new FormData(form).entries()),id=form.dataset.id||'';
  if(!can('master')){toast('คุณไม่มีสิทธิ์จัดการข้อมูลสินค้า','bad');return}
  const sku=(f.sku||'').trim(),name=(f.name||'').trim(),unit=(f.unit||'').trim();
  if(!sku||!name||!unit){toast('กรอก SKU ชื่อสินค้า และหน่วยนับให้ครบ','bad');return}
  if(S.items.some(i=>i.id!==id&&String(i.sku).toLowerCase()===sku.toLowerCase())){toast('SKU นี้มีอยู่แล้ว','bad');$('#f-sku').classList.add('bad');return}
  const nn=(k)=>{const x=num(f[k]);return isFinite(x)&&x>=0?x:0};
  const min=nn('min'),max=nn('max');
  if(max>0&&min>max){toast('Max ต้องไม่น้อยกว่า Min','bad');return}
  const old=id?D.itemById.get(id):null;
  const file=f.photo&&f.photo.size?f.photo:null,rmPhoto=!!f.rmphoto,oldPhoto=old&&old.photo||'';
  const btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;
  let newPhoto='';
  if(file&&ASSETS){try{newPhoto=await uploadPhoto(file)}catch(e){toast('อัปโหลดรูปไม่สำเร็จ ('+((e&&e.code)||'error')+') บันทึกสินค้าโดยไม่เปลี่ยนรูป','bad')}}
  const data={sku,name,unit,photo:newPhoto||(rmPhoto?'':oldPhoto),cat:(f.cat||'').trim(),cost:nn('cost'),price:nn('price'),min,max,supplier:(f.supplier||'').trim(),note:(f.note||'').trim(),active:old?old.active!==false:true,createdAt:old?old.createdAt||Date.now():Date.now()};
  const nid=id||uid();
  try{
    await put('items',nid,data);
    if(oldPhoto&&(newPhoto||rmPhoto))dropAsset(oldPhoto);
    const oq=num(f.oqty);
    if(!id&&isFinite(oq)&&oq>0&&f.oloc){
      const ts=Date.now();
      await put('docs',uid(),{no:nextNo('IN',ts),type:'IN',ts,party:'ยอดยกมา',ref:'OPENING',note:'ยอดยกมาตอนสร้างสินค้า',by:ME.id||'',createdAt:ts,lines:[{itemId:nid,sku,name,unit,cost:data.cost,locId:f.oloc,qty:oq,lot:''}]});
    }
    closeModal();toast(id?'บันทึกการแก้ไขแล้ว':'เพิ่มสินค้า '+sku+' แล้ว');
  }catch(e){if(btn)btn.disabled=false;if(newPhoto)dropAsset(newPhoto)}
}

/* item drawer */
function stockCardRows(itemId){
  let run=0;const rows=[];
  for(const m of D.moves){
    if(m.itemId!==itemId)continue;
    if(m.type==='TRF'){if(m.dir==='out')rows.push({m,delta:0,run,label:locCode(m.locId)+' → '+locCode(m.peer),trf:true});continue}
    run=q3(run+m.qty);rows.push({m,delta:m.qty,run,label:locCode(m.locId)});
  }
  return rows.reverse();
}
function drawerItem(s){
  const it=D.itemById.get(s.id);if(!it)return null;
  const qn=itemQ(it.id),locs=D.itemLocs.get(it.id)||[],tab=s.tab;
  const hasHist=D.usedItem.has(it.id),mst=can('master');
  let body='';
  if(tab==='loc'){
    body=locs.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Location</th><th class="r">คงเหลือ</th><th style="width:34%">สัดส่วน</th></tr></thead><tbody>'+locs.map(x=>{const l=D.locById.get(x.locId);return '<tr class="click" data-act="open-loc" data-id="'+x.locId+'"><td><div class="cell-main mono">'+esc(l?l.code:'(ถูกลบ)')+'</div><div class="cell-sub">'+esc(l?l.name:'')+'</div></td><td class="r num" style="font-weight:600">'+fq(x.qty)+' '+esc(it.unit)+'</td><td><div class="bar acc"><i data-w="'+(qn>0?Math.max(0,x.qty/qn*100):0).toFixed(1)+'"></i></div></td></tr>'}).join('')+'</tbody><tfoot><tr><td>รวมทุก Location</td><td class="r num">'+fq(qn)+' '+esc(it.unit)+'</td><td></td></tr></tfoot></table></div>':'<div class="empty" style="padding:30px 0">'+ic('pin','big')+'<p>ยังไม่มียอดคงเหลือใน Location ใด บันทึกรับเข้าเพื่อเริ่มเก็บสินค้า</p></div>';
  }else if(tab==='card'){
    const rows=stockCardRows(it.id).slice(0,80);
    body=rows.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>วันที่</th><th>เอกสาร</th><th>Location</th><th class="r">+/−</th><th class="r">คงเหลือ</th></tr></thead><tbody>'+rows.map(r=>'<tr class="click" data-act="open-doc" data-id="'+r.m.docId+'"><td class="cell-sub" style="white-space:nowrap">'+dShort(r.m.ts)+'<br>'+tShort(r.m.ts)+'</td><td><span class="mono" style="font-size:12.5px">'+esc(r.m.docNo)+'</span><br>'+typePill({type:r.m.type})+'</td><td class="mono" style="font-size:12.5px">'+esc(r.label)+'</td><td class="r num '+(r.trf?'':(r.delta>=0?'qty-pos':'qty-neg'))+'">'+(r.trf?'↔ '+fq(Math.abs(r.m.qty)):(r.delta>0?'+':'')+fq(r.delta))+'</td><td class="r num">'+fq(r.run)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty" style="padding:30px 0">'+ic('clock','big')+'<p>ยังไม่มีประวัติการเคลื่อนไหว</p></div>';
  }else{
    const kv=(a,b)=>'<dt>'+a+'</dt><dd>'+(b===''||b==null?'—':b)+'</dd>';
    body='<dl class="kv">'+kv('SKU','<span class="mono">'+esc(it.sku)+'</span>')+kv('ชื่อสินค้า',esc(it.name))+kv('หมวดหมู่',esc(it.cat))+kv('หน่วยนับ',esc(it.unit))+kv('ต้นทุน/หน่วย',money2(+it.cost||0))+kv('ราคาอ้างอิง',it.price?money2(+it.price):'')+kv('Min',fq(it.min)+' '+esc(it.unit))+kv('Max',+it.max?fq(it.max)+' '+esc(it.unit):'')+kv('Supplier',esc(it.supplier))+kv('รายละเอียด',esc(it.note).replace(/\n/g,'<br>'))+kv('สถานะ',it.active===false?'ปิดใช้งาน':'ใช้งาน')+'</dl>'
      +(mst?'<div class="row wrap" style="margin-top:20px"><button class="btn" type="button" data-act="item-edit" data-id="'+it.id+'">'+ic('edit')+'แก้ไข</button>'
      +'<button class="btn" type="button" data-act="item-toggle" data-id="'+it.id+'">'+(it.active===false?'เปิดใช้งาน':'ปิดใช้งาน')+'</button>'
      +(hasHist?'':'<button class="btn danger" type="button" data-act="item-del" data-id="'+it.id+'">'+ic('trash')+'ลบสินค้า</button>')+'</div>'
      +(hasHist?'<p class="sub" style="margin-top:10px">สินค้ามีเอกสารอ้างอิงแล้ว (รวมที่ยกเลิก) จึงลบไม่ได้ ให้ปิดการใช้งานแทน</p>':''):'');
  }
  return '<div class="drawer-h"><div class="row"><span class="mono sub">'+esc(it.sku)+'</span>'+(it.cat?'<span class="tag">'+esc(it.cat)+'</span>':'')+(it.active===false?'<span class="pill off">ปิดใช้งาน</span>':'')+'<span class="sp"></span><button class="icon-btn" type="button" data-act="drawer-close" aria-label="ปิด">'+ic('x')+'</button></div>'
   +'<div class="row nowrap" style="gap:14px;margin:8px 0 12px">'+(it.photo?'<a class="hero-img" href="'+photoUrl(it.photo)+'" target="_blank" rel="noopener" aria-label="เปิดรูปสินค้า"><img src="'+photoUrl(it.photo)+'" alt="'+esc(it.name)+'"></a>':'')+'<h2 style="font:700 22px/1.25 var(--font-display);margin:0">'+esc(it.name)+'</h2></div>'
   +(can('doc')?'<div class="row wrap"><button class="btn sm in" type="button" data-act="quick-doc" data-type="IN" data-id="'+it.id+'">'+ic('in')+'รับเข้า</button><button class="btn sm out" type="button" data-act="quick-doc" data-type="OUT" data-id="'+it.id+'">'+ic('out')+'จ่ายออก</button><button class="btn sm" type="button" data-act="quick-doc" data-type="TRF" data-id="'+it.id+'">'+ic('swap')+'ย้าย</button></div>':'')+'</div>'
   +'<div class="drawer-b"><div class="stat-row"><div class="stat"><small>คงเหลือรวม</small><b class="num">'+fq(qn)+' <span style="font-size:13px;color:var(--ink-3)">'+esc(it.unit)+'</span></b></div><div class="stat"><small>มูลค่า</small><b class="num">'+money(Math.max(0,qn)*(+it.cost||0))+'</b></div><div class="stat"><small>สถานะ</small><div style="margin-top:6px">'+(it.active===false?'<span class="pill off">ปิดใช้งาน</span>':lvPill(it,qn))+'</div></div></div>'
   +levelBar(it,qn,true)+'<div class="row sub" style="margin:6px 0 0"><span>Min '+fq(it.min)+'</span><span class="sp"></span><span>Max '+(+it.max?fq(it.max):'—')+'</span></div>'
   +'<div class="hint-tab"><button type="button" data-act="drawer-tab" data-tab="loc" aria-pressed="'+(tab==='loc')+'">ตาม Location ('+locs.length+')</button><button type="button" data-act="drawer-tab" data-tab="card" aria-pressed="'+(tab==='card')+'">Stock Card</button><button type="button" data-act="drawer-tab" data-tab="info" aria-pressed="'+(tab==='info')+'">รายละเอียด</button></div>'
   +'<div style="margin-top:12px">'+body+'</div></div>';
}

/* document viewer + confirm */
function docModal(id){
  const d=S.docs.find(x=>x.id===id);if(!d)return;
  const T=TYPES[d.type],v=D.voidMap.get(d.id);
  const rows=(d.lines||[]).map((l,i)=>{
    let loc=esc(locCode(l.locId)),qty=fq(l.qty);
    if(d.type==='TRF')loc=esc(locCode(l.locId))+' → '+esc(locCode(l.toLocId));
    if(d.type==='ADJ'){qty='ระบบ '+fq(l.system)+' → นับ '+fq(l.counted)+' ('+(l.delta>0?'+':'')+fq(l.delta)+')'}
    return '<tr><td class="cell-sub">'+(i+1)+'</td><td><div class="cell-main">'+esc(l.name)+'</div><div class="cell-sub mono">'+esc(l.sku)+'</div></td><td class="mono" style="font-size:12.5px">'+loc+'</td><td class="r num" style="font-weight:600">'+qty+' '+(d.type==='ADJ'?'':esc(l.unit))+'</td><td class="cell-sub">'+esc(l.lot||l.reason||'')+'</td></tr>';
  }).join('');
  const val=(d.lines||[]).reduce((s,l)=>s+(d.type==='ADJ'?Math.abs(l.delta):+l.qty)*(+l.cost||0),0);
  const vb=v?'<div class="banner void">'+ic('alert')+'<div style="flex:1"><b>เอกสารนี้ถูกยกเลิกแล้ว</b> — ไม่นับรวมในยอดคงเหลือและรายงานเคลื่อนไหว<div class="sub" style="color:inherit;opacity:.9">เมื่อ '+dtShort(v.at||0)+' โดย '+byHtml(v.by)+(v.reason?' · เหตุผล: '+esc(v.reason):'')+'</div></div></div>':'';
  openModal('<div class="modal-h"><span class="ico '+d.type+'">'+ic(T.icon)+'</span><div><h2 class="mono'+(v?' struck':'')+'">'+esc(d.no)+'</h2><div class="sub">'+T.name+' · '+T.en+(v?' · <b style="color:var(--crit-ink)">ยกเลิก</b>':'')+'</div></div><span class="sp"></span><button class="icon-btn" type="button" data-act="modal-close" aria-label="ปิด">'+ic('x')+'</button></div><div class="modal-b">'+vb
   +'<dl class="kv" style="margin-bottom:16px"><dt>วันที่</dt><dd>'+dtShort(d.ts)+'</dd><dt>'+esc(T.party)+'</dt><dd>'+esc(d.party)+'&nbsp;</dd><dt>'+esc(T.ref)+'</dt><dd>'+esc(d.ref)+'&nbsp;</dd><dt>ผู้บันทึก</dt><dd>'+byHtml(d.by)+'</dd>'+(d.note?'<dt>หมายเหตุ</dt><dd>'+esc(d.note)+'</dd>':'')+'</dl>'
   +'<div class="tbl-wrap card"><table class="tbl"><thead><tr><th>#</th><th>สินค้า</th><th>Location</th><th class="r">จำนวน</th><th>Lot / เหตุผล</th></tr></thead><tbody>'+rows+'</tbody>'+(d.type!=='TRF'?'<tfoot><tr><td colspan="3">มูลค่ารวมตามต้นทุน</td><td class="r num">'+money(val)+'</td><td></td></tr></tfoot>':'')+'</table></div></div><div class="modal-f">'
   +(can('void')?(v?'<button class="btn" type="button" data-act="doc-restore" data-id="'+d.id+'">กู้คืนเอกสาร</button>':'<button class="btn danger" type="button" data-act="doc-void" data-id="'+d.id+'">'+ic('trash')+'ยกเลิกเอกสาร</button>'):'')
   +'<span class="sp"></span><button class="btn" type="button" data-act="doc-print" data-id="'+d.id+'">'+ic('dl')+'พิมพ์ / ดาวน์โหลด</button><button class="btn primary" type="button" data-act="modal-close">ปิด</button></div>',true);
  fillNames($('#modalBg'));
}
function impactHtml(list){
  return '<div class="card" style="margin:10px 0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>สินค้า</th><th>Location</th><th class="r">ยอดจะติดลบถึง</th><th>เริ่มที่เอกสาร</th></tr></thead><tbody>'
   +list.map(x=>{const it=D.itemById.get(x.itemId);return '<tr><td><div class="cell-main">'+esc(it?it.name:'(ถูกลบ)')+'</div><div class="cell-sub mono">'+esc(it?it.sku:'')+'</div></td><td class="mono">'+esc(locCode(x.locId))+'</td><td class="r num qty-neg">'+fq(x.min)+'</td><td class="mono" style="font-size:12.5px">'+esc(x.docNo)+'</td></tr>'}).join('')+'</tbody></table></div></div>';
}
function voidModal(id){
  const d=S.docs.find(x=>x.id===id);if(!d)return;
  const imp=voidImpact(id,false);
  openModal('<form data-form="void" data-id="'+id+'"><div class="modal-h"><h2>ยกเลิกเอกสาร <span class="mono">'+esc(d.no)+'</span></h2><span class="sp"></span><button class="icon-btn" type="button" data-act="modal-close" aria-label="ปิด">'+ic('x')+'</button></div><div class="modal-b">'
   +'<p>เอกสารจะ<b>ไม่ถูกลบ</b> แต่ถูกทำเครื่องหมายยกเลิก และยอดคงเหลือจะย้อนกลับเสมือนไม่เคยมีเอกสารนี้ — กู้คืนได้ภายหลัง และเลขที่เอกสารจะไม่ถูกนำกลับมาใช้</p>'
   +(imp.length?'<div class="banner">'+ic('alert')+'<span>ยกเลิกไม่ได้ เพราะจะทำให้ยอดคงเหลือต่อไปนี้ติดลบ (มีเอกสารหลังจากนี้ที่ใช้ยอดนั้นอยู่) — ให้ยกเลิกเอกสารที่เกี่ยวข้องก่อน หรือทำเอกสารปรับยอด</span></div>'+impactHtml(imp)
     :'<div class="banner info">'+ic('check')+'<span>ตรวจแล้ว: การยกเลิกไม่ทำให้ยอดคงเหลือรายสินค้า × Location ติดลบ</span></div>')
   +'<div class="fld"><label for="v-reason">เหตุผลในการยกเลิก <i>*</i></label><textarea class="in-ctl" id="v-reason" name="reason" required placeholder="เช่น คีย์ผิดจำนวน, ซ้ำกับเอกสารเลขที่ …" '+(imp.length?'disabled':'')+'></textarea></div></div>'
   +'<div class="modal-f"><button class="btn" type="button" data-act="modal-close">ไม่ยกเลิก</button><button class="btn danger" type="submit" '+(imp.length?'disabled':'')+'>'+ic('trash')+'ยืนยันยกเลิกเอกสาร</button></div></form>');
}
async function saveVoid(form){
  if(!can('void')){toast('คุณไม่มีสิทธิ์ยกเลิกเอกสาร','bad');return}
  const id=form.dataset.id,d=S.docs.find(x=>x.id===id);if(!d||D.voidMap.has(id))return;
  const reason=(new FormData(form).get('reason')||'').trim();
  if(reason.length<3){toast('ระบุเหตุผลการยกเลิก','bad');return}
  if(voidImpact(id,false).length){toast('ยกเลิกไม่ได้ ยอดคงเหลือจะติดลบ','bad');return}
  try{await put('voids',id,{docId:id,no:d.no,reason,by:ME.id||'',at:Date.now()});closeModal();toast('ยกเลิกเอกสาร '+d.no+' แล้ว')}catch(e){}
}
function restoreDoc(id){
  if(!can('void')){toast('คุณไม่มีสิทธิ์กู้คืนเอกสาร','bad');return}
  const d=S.docs.find(x=>x.id===id);if(!d||!D.voidMap.has(id))return;
  const imp=voidImpact(id,true);
  if(imp.length){
    openModal('<div class="modal-h"><h2>กู้คืนไม่ได้</h2></div><div class="modal-b"><div class="banner">'+ic('alert')+'<span>การกู้คืน <b>'+esc(d.no)+'</b> จะทำให้ยอดคงเหลือต่อไปนี้ติดลบ (สต๊อกถูกนำไปใช้แล้ว)</span></div>'+impactHtml(imp)+'</div><div class="modal-f"><button class="btn primary" type="button" data-act="modal-close">ปิด</button></div>');
    return;
  }
  confirmModal('กู้คืนเอกสาร','กู้คืน <b>'+esc(d.no)+'</b> ให้กลับมามีผลต่อยอดคงเหลืออีกครั้ง?','กู้คืนเอกสาร',async()=>{try{await del('voids',id);toast('กู้คืนเอกสาร '+d.no+' แล้ว')}catch(e){}});
  const b=$('#modalBg .btn.danger');if(b){b.classList.remove('danger');b.classList.add('primary')}
}
let CONFIRM=null;
function confirmModal(title,msg,label,fn){
  CONFIRM=fn;
  openModal('<div class="modal-h"><h2>'+esc(title)+'</h2></div><div class="modal-b"><p>'+msg+'</p></div><div class="modal-f"><button class="btn" type="button" data-act="modal-close">ยกเลิก</button><button class="btn danger" type="button" data-act="confirm-ok">'+esc(label)+'</button></div>');
}
