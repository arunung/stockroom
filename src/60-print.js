/* =========================================================
   Printable documents: A4 sheets -> HTML download + PDF (self-made, no external libs)
   ========================================================= */
const SHEET_FONT="Tahoma,'Leelawadee UI','Noto Sans Thai','Thonburi','Sarabun','Loma',sans-serif";
const SHEET_CSS=
".sheet{width:794px;height:1123px;box-sizing:border-box;padding:38px 44px 30px;background:#fff;color:#111;font:13px/1.4 "+SHEET_FONT+";position:relative;overflow:hidden;display:flex;flex-direction:column;text-align:left}"
+".sheet *{box-sizing:border-box}"
+".sheet .sh-head{display:flex;justify-content:space-between;gap:18px;border-bottom:2px solid #111;padding-bottom:10px}"
+".sheet .sh-org{min-width:0;flex:1}.sheet .sh-org b{display:block;font-size:17px;line-height:1.3}.sheet .sh-org small{display:block;color:#444;font-size:11.5px;line-height:1.45}"
+".sheet .ph{color:#999;font-weight:400}"
+".sheet .sh-title{text-align:right;flex:none}.sheet .sh-title h1{font-size:22px;line-height:1.2;margin:0;font-weight:700}.sheet .sh-title .en{font-size:11px;letter-spacing:.1em;color:#444}"
+".sheet .sh-no{font-family:Consolas,'Courier New',monospace;font-size:15px;font-weight:700;margin-top:4px}"
+".sheet .sh-meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 26px;margin:12px 0 10px}"
+".sheet .sh-meta div{display:flex;gap:8px;align-items:flex-end;min-width:0}.sheet .sh-meta span{color:#555;flex:none;min-width:84px;font-size:12px}"
+".sheet .sh-meta b{font-weight:600;border-bottom:1px dotted #888;flex:1;min-height:19px;min-width:0;overflow-wrap:anywhere}.sheet .sh-meta .full{grid-column:1/-1}"
+".sheet .sh-void{border:1.5px solid #b3261e;color:#b3261e;padding:5px 10px;margin:0 0 10px;font-size:12px;font-weight:600}"
+".sheet table.sh-t{width:100%;border-collapse:collapse;table-layout:fixed}"
+".sheet .sh-t th{background:#ececec;border:1px solid #444;padding:5px 5px;font-size:11.5px;font-weight:700;line-height:1.25}"
+".sheet .sh-t td{border:1px solid #777;padding:3px 6px;height:41px;vertical-align:middle;font-size:12.5px;line-height:1.3;overflow:hidden;overflow-wrap:anywhere}"
+".sheet .sh-t td.r{text-align:right}.sheet .sh-t td.c,.sheet .sh-t th.c{text-align:center}.sheet .sh-t td.m{font-family:Consolas,'Courier New',monospace;font-size:12px}"
+".sheet .sh-t td small{display:block;color:#555;font-size:10.5px}"
+".sheet .sh-t tfoot td{background:#f5f5f5;font-weight:700;height:30px;border-color:#444}"
+".sheet .sh-note{margin-top:8px;font-size:12px;color:#333}"
+".sheet .sh-sign{margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center;padding-top:12px;font-size:12px}"
+".sheet .sh-sign .ln{height:44px;border-bottom:1px solid #333;margin-bottom:5px}.sheet .sh-sign small{display:block;color:#555;margin-top:3px}"
+".sheet .sh-foot{display:flex;justify-content:space-between;gap:12px;font-size:10.5px;color:#666;border-top:1px solid #bbb;padding-top:6px;margin-top:12px}"
+".sheet .sh-wm{position:absolute;left:0;right:0;top:34%;text-align:center;font-size:120px;line-height:1;font-weight:800;color:rgba(190,30,30,.14);transform:rotate(-24deg);letter-spacing:.06em}"
+".sheet .sh-wm small{display:block;font-size:46px;letter-spacing:.3em}";

const DOC_TITLES={IN:['ใบรับสินค้า','GOODS RECEIPT'],OUT:['ใบเบิก-จ่ายสินค้า','GOODS ISSUE'],TRF:['ใบย้าย Location','STOCK TRANSFER'],ADJ:['ใบปรับยอดสต๊อก','STOCK ADJUSTMENT']};
const DOC_SIGS={IN:['ผู้ส่งของ','ผู้รับของ','ผู้ตรวจรับ / หัวหน้าคลัง'],OUT:['ผู้เบิก','ผู้จ่ายของ','ผู้อนุมัติ'],TRF:['ผู้ดำเนินการย้าย','ผู้ตรวจสอบ','ผู้อนุมัติ'],ADJ:['ผู้ตรวจนับ','ผู้ตรวจสอบ','ผู้อนุมัติ']};
const SHEET_FIRST=13,SHEET_MID=17,SHEET_MIN=8;
const dFull=ts=>new Date(ts).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}),dtFull=ts=>dFull(ts)+' '+tShort(ts);

function sheetCols(d,opt){
  const t=d.type,pr=opt.price&&(t==='IN'||t==='OUT');
  const c=[{h:'ลำดับ',w:38,k:'c',f:(l,i)=>i+1},{h:'รหัสสินค้า',w:92,k:'m',f:l=>esc(l.sku)},{h:'รายการ',w:0,f:l=>esc(l.name)}];
  if(t==='IN'){c.push({h:'Location',w:74,k:'m',f:l=>esc(locCode(l.locId))},{h:'Lot',w:64,k:'m',f:l=>esc(l.lot||'')})}
  else if(t==='OUT'){c.push({h:'จาก Location',w:80,k:'m',f:l=>esc(locCode(l.locId))})}
  else if(t==='TRF'){c.push({h:'จาก',w:74,k:'m',f:l=>esc(locCode(l.locId))},{h:'ไป',w:74,k:'m',f:l=>esc(locCode(l.toLocId))})}
  else{c.push({h:'Location',w:74,k:'m',f:l=>esc(locCode(l.locId))},{h:'ยอดระบบ',w:62,k:'r',f:l=>fq(l.system)},{h:'นับได้',w:62,k:'r',f:l=>fq(l.counted)},{h:'ผลต่าง',w:62,k:'r',f:l=>(l.delta>0?'+':'')+fq(l.delta)})}
  if(t!=='ADJ')c.push({h:'จำนวน',w:62,k:'r',f:l=>fq(l.qty)});
  c.push({h:'หน่วย',w:48,k:'c',f:l=>esc(l.unit||'')});
  if(pr)c.push({h:'ราคา/หน่วย',w:74,k:'r',f:l=>nf2.format(+l.cost||0)},{h:'มูลค่า (บาท)',w:86,k:'r',f:l=>nf2.format((+l.qty||0)*(+l.cost||0))});
  return c;
}
function sheetPagesHtml(d,opt,ctx){
  const t=d.type,T=DOC_TITLES[t],v=D.voidMap.get(d.id),c=cfg(),cols=sheetCols(d,opt),lines=d.lines||[];
  const pr=opt.price&&(t==='IN'||t==='OUT');
  const chunks=[];let rem=lines.slice(),start=0;
  while(rem.length>SHEET_FIRST){const n=Math.min(SHEET_MID,rem.length-5);chunks.push(rem.slice(0,n));rem=rem.slice(n)}
  chunks.push(rem);
  const total=chunks.length,fixed=cols.reduce((s,x)=>s+x.w,0),W=706;
  const colgroup='<colgroup>'+cols.map(x=>'<col'+(x.w?' style="width:'+x.w+'px"':'')+'>').join('')+'</colgroup>';
  const thead='<thead><tr>'+cols.map(x=>'<th class="'+(x.k==='r'?'r':'c')+'">'+x.h+'</th>').join('')+'</tr></thead>';
  const sumVal=lines.reduce((s,l)=>s+(+l.qty||0)*(+l.cost||0),0);
  const org=c.orgName?esc(c.orgName):'<span class="ph">[ชื่อหน่วยงาน — ตั้งค่าที่หน้า ผู้ใช้ &amp; ตั้งค่า]</span>';
  const orgSub=[c.orgAddr?esc(c.orgAddr):'',(c.orgPhone?'โทร '+esc(c.orgPhone):'')+(c.orgTax?(c.orgPhone?' · ':'')+'เลขประจำตัวผู้เสียภาษี '+esc(c.orgTax):'')].filter(Boolean).map(x=>'<small>'+x+'</small>').join('');
  const kv=(l,val,full)=>'<div'+(full?' class="full"':'')+'><span>'+l+'</span><b>'+(val||'')+'</b></div>';
  const tt=TYPES[t];
  const meta=kv('เลขที่เอกสาร',esc(d.no))+kv('วันที่',esc(dtFull(d.ts)))+kv(esc(tt.party.split(' (')[0]),esc(d.party||''))+kv(esc(tt.ref),esc(d.ref||''))+kv('ผู้บันทึก',esc(ctx.byName||''))+kv('หมายเหตุ',esc(d.note||''));
  const now=new Date();
  return chunks.map((ch,pi)=>{
    const last=pi===total-1;
    let rows=ch.map((l,k)=>'<tr>'+cols.map((x,ci)=>{const i=start+k;const val=x.f(l,i);return '<td class="'+(x.k||'')+'">'+(ci===2&&l.reason?val+'<small>'+esc(l.reason)+'</small>':val)+'</td>'}).join('')+'</tr>').join('');
    if(last){for(let k=ch.length;k<SHEET_MIN;k++)rows+='<tr>'+cols.map(()=>'<td>&nbsp;</td>').join('')+'</tr>'}
    start+=ch.length;
    let tfoot='';
    if(last){
      const span=cols.length-(pr?2:1);
      tfoot='<tfoot><tr><td colspan="'+span+'" class="r">รวม '+lines.length+' รายการ'+(t==='TRF'||t==='ADJ'?'':'')+'</td>'+(pr?'<td></td><td class="r">'+nf2.format(sumVal)+'</td>':'<td></td>')+'</tr></tfoot>';
      if(!pr)tfoot=tfoot.replace('colspan="'+span+'"','colspan="'+(cols.length-1)+'"');
    }
    const sig=last?'<div class="sh-sign">'+DOC_SIGS[t].map(s=>'<div><div class="ln"></div>('+'&nbsp;'.repeat(26)+')<br>'+esc(s)+'<small>วันที่ ____/____/________</small></div>').join('')+'</div>':'<div style="margin-top:auto"></div>';
    return '<div class="sheet">'+(v?'<div class="sh-wm">ยกเลิก<small>VOID</small></div>':'')
      +'<div class="sh-head"><div class="sh-org"><b>'+org+'</b>'+orgSub+'</div><div class="sh-title"><h1>'+T[0]+'</h1><div class="en">'+T[1]+'</div><div class="sh-no">'+esc(d.no)+'</div></div></div>'
      +'<div class="sh-meta">'+meta+'</div>'
      +(v?'<div class="sh-void">เอกสารนี้ถูกยกเลิกเมื่อ '+esc(dtFull(v.at||0))+(v.reason?' · เหตุผล: '+esc(v.reason):'')+'</div>':'')
      +'<table class="sh-t">'+colgroup+thead+'<tbody>'+rows+'</tbody>'+tfoot+'</table>'
      +(last&&c.docNote?'<div class="sh-note">'+esc(c.docNote)+'</div>':'')
      +sig
      +'<div class="sh-foot"><span>'+(c.footerNote?esc(c.footerNote)+' · ':'')+'พิมพ์จาก Stockroom '+esc(dtFull(now.getTime()))+'</span><span>หน้า '+(pi+1)+' / '+total+'</span></div></div>';
  });
}
async function printCtx(d){
  let byName='';
  if(d.by&&USER){try{const ps=await USER.profiles([d.by]);byName=(ps[d.by]&&ps[d.by].name)||''}catch(e){}}
  return {byName};
}
function sheetHtmlDoc(d,pages){
  return '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(d.no)+'</title><style>@page{size:A4;margin:0}html,body{margin:0}body{background:#8a8f94}'
   +'.sheet{margin:18px auto;box-shadow:0 4px 24px rgba(0,0,0,.35);break-after:page;page-break-after:always}'
   +'@media print{body{background:#fff}.sheet{margin:0;box-shadow:none}.sheet:last-child{break-after:auto;page-break-after:auto}.tip{display:none}}'
   +'.tip{position:fixed;top:0;left:0;right:0;background:#222;color:#fff;font:13px '+SHEET_FONT+';padding:8px 14px;text-align:center}@media print{.tip{display:none}}'
   +SHEET_CSS+'</style></head><body><div class="tip">กด Ctrl+P (หรือ Cmd+P) เพื่อพิมพ์ — เลือกกระดาษ A4 และตั้งค่า Margins เป็น None</div><div style="height:34px" class="tip2"></div>'+pages.join('')+'</body></html>';
}
/* ----- PDF: render each sheet to JPEG through SVG foreignObject, wrap in a minimal PDF ----- */
function sheetToJpeg(pageHtml,scale){
  return new Promise((resolve,reject)=>{
    const w=794,h=1123,wrap=document.createElement('div');wrap.innerHTML=pageHtml;
    const xml=new XMLSerializer().serializeToString(wrap.firstElementChild);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><foreignObject x="0" y="0" width="'+w+'" height="'+h+'"><style xmlns="http://www.w3.org/1999/xhtml">'+SHEET_CSS+'</style>'+xml+'</foreignObject></svg>';
    const img=new Image();
    img.onload=()=>{
      try{
        const c=document.createElement('canvas');c.width=w*scale;c.height=h*scale;const x=c.getContext('2d');
        x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
        c.toBlob(b=>{if(!b){reject(new Error('encode'));return}b.arrayBuffer().then(buf=>resolve({jpg:new Uint8Array(buf),w:c.width,h:c.height}),reject)},'image/jpeg',.93);
      }catch(e){reject(e)}
    };
    img.onerror=()=>reject(new Error('svg'));
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
}
function buildPdf(pages){
  const enc=new TextEncoder(),chunks=[],offs=[];let len=0;
  const push=b=>{const u=typeof b==='string'?enc.encode(b):b;chunks.push(u);len+=u.length};
  const W=595.28,H=841.89,n=pages.length;
  push('%PDF-1.4\n');
  const obj=(id,fn)=>{offs[id]=len;push(id+' 0 obj\n');fn();push('\nendobj\n')};
  obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2,()=>push('<< /Type /Pages /Count '+n+' /Kids ['+pages.map((_,i)=>(3+3*i)+' 0 R').join(' ')+'] >>'));
  pages.forEach((p,i)=>{
    const pid=3+3*i,cid=4+3*i,iid=5+3*i,cs='q '+W+' 0 0 '+H+' 0 0 cm /Im0 Do Q';
    obj(pid,()=>push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /XObject << /Im0 '+iid+' 0 R >> >> /Contents '+cid+' 0 R >>'));
    obj(cid,()=>push('<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream'));
    obj(iid,()=>{push('<< /Type /XObject /Subtype /Image /Width '+p.w+' /Height '+p.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpg.length+' >>\nstream\n');push(p.jpg);push('\nendstream')});
  });
  const total=3+3*n,xr=len;
  push('xref\n0 '+total+'\n0000000000 65535 f \n');
  for(let id=1;id<total;id++)push(String(offs[id]).padStart(10,'0')+' 00000 n \n');
  push('trailer\n<< /Size '+total+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF');
  return new Blob(chunks,{type:'application/pdf'});
}
/* ----- dialog ----- */
const PRINT={id:'',price:true,busy:false,pages:[],ctx:null};
async function printModal(id){
  const d=S.docs.find(x=>x.id===id);if(!d)return;
  PRINT.id=id;PRINT.price=d.type==='IN';PRINT.busy=false;PRINT.ctx=await printCtx(d);
  const T=DOC_TITLES[d.type],priceOpt=(d.type==='IN'||d.type==='OUT')?'<label class="chk"><input type="checkbox" id="pr-price"'+(PRINT.price?' checked':'')+'> แสดงราคาต่อหน่วยและมูลค่าในเอกสาร</label>':'';
  openModal('<style>'+SHEET_CSS+'</style><div class="modal-h"><span class="ico '+d.type+'">'+ic(TYPES[d.type].icon)+'</span><div><h2>พิมพ์ / ดาวน์โหลดเอกสาร</h2><div class="sub">'+T[0]+' · <span class="mono">'+esc(d.no)+'</span></div></div><span class="sp"></span><button class="icon-btn" type="button" data-act="modal-close" aria-label="ปิด">'+ic('x')+'</button></div>'
   +'<div class="modal-b"><div class="print-grid"><div class="print-prev" id="printPrev"><div id="printScale"></div></div><div class="print-opts">'+priceOpt
   +'<div class="sub">เอกสารขนาด A4 ลายเซ็น 3 ช่อง ชื่อหน่วยงานและข้อความท้ายกระดาษตั้งได้ที่หน้า “ผู้ใช้ &amp; ตั้งค่า”</div>'
   +'<div class="col" style="gap:8px;margin-top:6px"><button class="btn primary" type="button" id="prPdf" data-act="print-pdf">'+ic('dl')+'ดาวน์โหลด PDF</button><button class="btn" type="button" data-act="print-html">'+ic('dl')+'ดาวน์โหลด HTML (สั่งพิมพ์ได้)</button></div>'
   +'<div class="sub">PDF เป็นภาพหน้ากระดาษ (ข้อความเลือกคัดลอกไม่ได้) ส่วนไฟล์ HTML เปิดแล้วกด Ctrl+P เพื่อพิมพ์หรือบันทึกเป็น PDF แบบตัวอักษรจริง</div></div></div></div>',true);
  printPreview();
}
function printOpt(){return {price:PRINT.price}}
function printPreview(){
  const d=S.docs.find(x=>x.id===PRINT.id),host=$('#printScale'),box=$('#printPrev');if(!d||!host)return;
  PRINT.pages=sheetPagesHtml(d,printOpt(),PRINT.ctx);
  const avail=Math.max(200,box.clientWidth-28),sc=Math.min(.6,avail/794);
  host.style.cssText='width:'+(794*sc)+'px';
  host.innerHTML=PRINT.pages.map(p=>'<div class="pv" style="width:'+(794*sc)+'px;height:'+(1123*sc)+'px"><div style="transform:scale('+sc+');transform-origin:0 0;width:794px;height:1123px">'+p+'</div></div>').join('');
}
async function printDownload(kind){
  const d=S.docs.find(x=>x.id===PRINT.id);if(!d||PRINT.busy)return;
  const dl=await getDl();if(!dl){toast('มุมมองนี้ยังดาวน์โหลดไฟล์ไม่ได้','bad');return}
  const pages=sheetPagesHtml(d,printOpt(),PRINT.ctx),btn=$('#prPdf');
  try{
    if(kind==='html'){
      await dl.save({filename:d.no+'.html',data:new Blob([sheetHtmlDoc(d,pages)],{type:'text/html'})});
    }else{
      PRINT.busy=true;if(btn){btn.disabled=true;btn.classList.add('busy')}
      let imgs;
      try{imgs=[];for(const p of pages)imgs.push(await sheetToJpeg(p,2))}
      catch(e){PRINT.busy=false;if(btn){btn.disabled=false;btn.classList.remove('busy')}toast('เบราว์เซอร์นี้สร้าง PDF ไม่ได้ ให้ใช้ไฟล์ HTML แล้วสั่งพิมพ์เป็น PDF แทน','bad');return}
      await dl.save({filename:d.no+'.pdf',data:buildPdf(imgs)});
    }
    toast('ส่งออก '+d.no+(kind==='html'?'.html':'.pdf')+' แล้ว');
  }catch(e){if(!e||e.code!=='declined')toast('ส่งออกไฟล์ไม่สำเร็จ','bad')}
  finally{PRINT.busy=false;if(btn){btn.disabled=false;btn.classList.remove('busy')}}
}
