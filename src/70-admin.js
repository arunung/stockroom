/* =========================================================
   Users & settings (admin only): roles, organisation details for printed forms
   ========================================================= */
function admUsers(){
  const ids=new Map();
  S.members.forEach(m=>ids.set(m.id,{id:m.id,role:m.role,at:m.at||0}));
  S.seen.forEach(x=>{const o=ids.get(x.id)||{id:x.id,role:'',at:0};o.seen=x.at||0;ids.set(x.id,o)});
  if(ME.id&&!ids.has(ME.id))ids.set(ME.id,{id:ME.id,role:'',at:0,seen:Date.now()});
  const def=ROLES[cfg().defaultRole]?cfg().defaultRole:'viewer';
  const rows=[...ids.values()].sort((a,b)=>(b.id===ME.id)-(a.id===ME.id)||(b.seen||0)-(a.seen||0));
  if(!rows.length)return '<tr><td colspan="3"><div class="empty" style="padding:26px 0"><p>ยังไม่มีผู้ใช้อื่น — ผู้ที่เปิดหน้านี้และมีสิทธิ์เขียนข้อมูลจะปรากฏที่นี่อัตโนมัติ หรือเพิ่มด้วยการค้นหาชื่อด้านบน</p></div></td></tr>';
  return rows.map(u=>{
    const me=u.id===ME.id;
    const sel='<select class="in-ctl" data-member="'+esc(u.id)+'" aria-label="บทบาท"'+(me&&S.isAdmin?' disabled':'')+'><option value="">ค่าเริ่มต้น ('+ROLES[def].name+')</option>'+ROLE_ORDER.map(r=>'<option value="'+r+'"'+(u.role===r?' selected':'')+'>'+ROLES[r].name+' · '+ROLES[r].en+'</option>').join('')+'</select>';
    return '<tr><td><div class="cell-main"><span data-uid="'+esc(u.id)+'">…</span>'+(me?' <span class="tag">คุณ</span>':'')+'</div>'+(me&&S.isAdmin?'<div class="cell-sub">มีสิทธิ์ Editor ขึ้นไป จึงเป็น Admin เสมอ</div>':'')+'</td><td style="min-width:230px">'+sel+'</td><td class="cell-sub" style="white-space:nowrap">'+(u.seen?'เข้าใช้ล่าสุด '+rel(u.seen):'—')+'</td></tr>';
  }).join('');
}
function admMatrix(){
  return '<table class="tbl"><thead><tr><th>ความสามารถ</th>'+ROLE_ORDER.map(r=>'<th class="c">'+ROLES[r].name+'</th>').join('')+'</tr></thead><tbody>'
   +PERM_ROWS.map(([lbl,k])=>{const allow=Array.isArray(k)?k:PERM[k];return '<tr><td>'+lbl+'</td>'+ROLE_ORDER.map(r=>'<td class="c">'+(allow.includes(r)?'<span class="qty-pos" aria-label="ทำได้">'+ic('check')+'</span>':'<span class="cell-sub" aria-label="ทำไม่ได้">—</span>')+'</td>').join('')+'</tr>'}).join('')+'</tbody></table>';
}
function admStandaloneCard(){
  return '<section class="card"><div class="card-h"><div><h2>เชิญผู้ใช้เข้าทีม</h2><div class="sub">ผู้ใช้สมัครเองได้ที่หน้า Login แล้วรอการอนุมัติ</div></div></div><div class="card-b"><ol class="sub" style="padding-left:20px;line-height:1.9"><li>ส่งลิงก์เว็บนี้ให้เพื่อนร่วมทีม ให้กด “สมัครใช้งาน”</li><li>บัญชีใหม่จะเป็น <b>รออนุมัติ</b> — เข้าดูข้อมูลไม่ได้</li><li>เลือกบทบาทในตาราง “ผู้ใช้และบทบาท” ด้านล่างเพื่ออนุมัติ</li></ol>'
   +'<div class="banner info" style="margin:14px 0 0">'+ic('info')+'<span>สิทธิ์ของแต่ละบทบาทถูกบังคับที่ฐานข้อมูล (Row Level Security) ไม่ใช่แค่ซ่อนปุ่มบนหน้าจอ</span></div></div></section>';
}
function vAdmin(){
  const c=cfg(),f=(k,l,ph,full)=>'<div class="fld'+(full?' full':'')+'"><label for="s-'+k+'">'+l+'</label><input class="in-ctl" id="s-'+k+'" name="'+k+'" value="'+esc(c[k]||'')+'" placeholder="'+esc(ph||'')+'" autocomplete="off"></div>';
  const def=ROLES[c.defaultRole]?c.defaultRole:'viewer';
  return '<div class="grid g-2e">'
   +'<section class="card"><div class="card-h"><div><h2>ข้อมูลองค์กรสำหรับใบพิมพ์</h2><div class="sub">แสดงที่หัวกระดาษของใบรับ / ใบเบิก / ใบย้าย / ใบปรับยอด — เว้นว่างไว้ได้ ระบบจะแสดงเป็นช่อง placeholder</div></div></div>'
   +'<form class="card-b" data-form="settings"><div class="form-grid">'
   +f('orgName','ชื่อหน่วยงาน / บริษัท','เช่น ชื่อโครงการ หรือชื่อบริษัท',true)+f('orgAddr','ที่อยู่','',true)+f('orgPhone','โทรศัพท์','')+f('orgTax','เลขประจำตัวผู้เสียภาษี','')
   +f('footerNote','ข้อความท้ายกระดาษ','เช่น รหัสแบบฟอร์ม / เลขที่ฉบับแก้ไข',true)+f('docNote','หมายเหตุใต้ตาราง (ทุกใบ)','เช่น เงื่อนไขการรับ-จ่ายสินค้า',true)
   +(S.standalone?'':'<div class="fld full"><label for="s-defaultRole">บทบาทเริ่มต้นของผู้ใช้ที่ยังไม่ได้กำหนด</label><select class="in-ctl" id="s-defaultRole" name="defaultRole">'+ROLE_ORDER.filter(r=>r!=='admin').map(r=>'<option value="'+r+'"'+(def===r?' selected':'')+'>'+ROLES[r].name+' — '+ROLES[r].desc+'</option>').join('')+'</select></div>')
   +'</div><div class="row" style="margin-top:16px"><span class="sp"></span><button class="btn primary" type="submit">'+ic('check')+'บันทึกการตั้งค่า</button></div></form></section>'
   +(S.standalone?admStandaloneCard():'<section class="card"><div class="card-h"><div><h2>เพิ่มผู้ใช้</h2><div class="sub">ค้นหาจากชื่อคนในองค์กร แล้วกำหนดบทบาท</div></div></div><div class="card-b"><div class="search-in">'+ic('search')+'<input class="in-ctl" id="adm-q" type="search" placeholder="พิมพ์ชื่อเพื่อค้นหา…" autocomplete="off" aria-label="ค้นหาผู้ใช้"></div><div id="admHits" class="adm-hits"></div>'
   +'<div class="banner info" style="margin:14px 0 0">'+ic('info')+'<span>ผู้ใช้ที่ได้รับสิทธิ์ <b>Editor ขึ้นไป</b> จากการแชร์ จะเป็น Admin เสมอ · ผู้ที่ได้รับแชร์แบบ <b>ดูอย่างเดียว</b> จะอ่านได้อย่างเดียวไม่ว่าจะตั้งบทบาทใด</span></div></div></section></div>')
   +'<section class="card sec-gap"><div class="card-h"><div><h2>ผู้ใช้และบทบาท</h2><div class="sub">เปลี่ยนบทบาทแล้วมีผลทันที</div></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th></tr></thead><tbody id="admUsers">'+admUsers()+'</tbody></table></div></section>'
   +'<section class="card sec-gap"><div class="card-h"><div><h2>สิทธิ์ของแต่ละบทบาท</h2><div class="sub">'+ROLE_ORDER.map(r=>'<b>'+ROLES[r].en+'</b> '+ROLES[r].desc).join(' · ')+'</div></div></div><div class="tbl-wrap" id="admMatrix">'+admMatrix()+'</div>'
   +'<div class="card-b"><div class="banner">'+ic('alert')+'<span>'+(S.standalone?'<b>การบังคับสิทธิ์:</b> ฐานข้อมูลตรวจสิทธิ์ของทุกคำสั่งเขียนตามบทบาท (Row Level Security) — ผู้ใช้ที่แก้โค้ดฝั่งเบราว์เซอร์ก็ทำเกินสิทธิ์ไม่ได้ · ข้อมูลยอดคงเหลือไม่ถูกคำนวณซ้ำที่ฐานข้อมูล จึงยังไม่กันการบันทึกเอกสารที่ทำให้ยอดติดลบจากไคลเอนต์ที่ถูกแก้ไข':'<b>ข้อจำกัดที่ควรทราบ:</b> การควบคุมสิทธิ์เหล่านี้ทำงานที่หน้าจอของแอป ส่วนฐานข้อมูลบังคับเฉพาะ “ตั้งค่า / บทบาทผู้ใช้” ให้แก้ได้เฉพาะ Editor ขึ้นไป — ผู้ที่ได้รับแชร์ระดับ Contributor ซึ่งมีความรู้เทคนิคยังอาจเขียนข้อมูลคลังตรงเข้าฐานข้อมูลได้ จึงควรแชร์ระดับ Editor เฉพาะผู้ที่ไว้ใจ')+'</span></div></div></section>';
}
function updateAdmin(){
  const u=$('#admUsers');if(u){u.innerHTML=admUsers();fillNames(u)}
}
async function saveSettings(form){
  if(!can('settings')){toast('เฉพาะผู้ดูแลระบบที่ตั้งค่าได้','bad');return}
  const f=Object.fromEntries(new FormData(form).entries()),o={};
  ['orgName','orgAddr','orgPhone','orgTax','footerNote','docNote'].forEach(k=>o[k]=(f[k]||'').trim());
  o.defaultRole=ROLES[f.defaultRole]&&f.defaultRole!=='admin'?f.defaultRole:'viewer';
  o.updatedAt=Date.now();o.updatedBy=ME.id||'';
  try{await put('settings','main',o);toast('บันทึกการตั้งค่าแล้ว')}catch(e){}
}
async function setMemberRole(uid,role){
  if(!can('users')){toast('เฉพาะผู้ดูแลระบบที่จัดการผู้ใช้ได้','bad');return}
  try{
    if(!role){await del('members',uid);toast('ใช้บทบาทเริ่มต้นแล้ว')}
    else{await put('members',uid,{role,at:Date.now(),by:ME.id||''});toast('กำหนดบทบาท '+ROLES[role].name+' แล้ว')}
  }catch(e){}
}
let admT=0;
function admSearch(q){
  clearTimeout(admT);
  admT=setTimeout(async()=>{
    const box=$('#admHits');if(!box)return;
    if(!USER||!USER.search){box.innerHTML='<div class="sub">ค้นหารายชื่อไม่ได้ในมุมมองนี้ — ผู้ใช้จะปรากฏในตารางด้านล่างเมื่อเข้าใช้งานครั้งแรก</div>';return}
    let hits=[];try{hits=await USER.search(q.trim())}catch(e){}
    const have=new Set([...S.members.map(m=>m.id),...S.seen.map(x=>x.id)]);
    hits=(hits||[]).filter(h=>h&&h.id&&!have.has(h.id)&&h.id!==ME.id);
    box.innerHTML=hits.length?hits.slice(0,8).map(h=>'<div class="adm-hit"><span class="cell-main ellip">'+esc(h.name||'ผู้ใช้')+'</span><span class="sp"></span><button class="btn sm" type="button" data-act="adm-add" data-id="'+esc(h.id)+'">'+ic('plus')+'เพิ่มเป็นเจ้าหน้าที่คลัง</button></div>').join(''):(q.trim()?'<div class="sub">ไม่พบผู้ใช้ที่ยังไม่ได้อยู่ในรายการ</div>':'');
  },220);
}
