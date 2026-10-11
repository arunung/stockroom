// Generates sample data (items, locations, docs) for the Stockroom demo. Output: seed.json
const fs=require('fs');
let a=20261011;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const ri=(lo,hi)=>Math.floor(lo+rnd()*(hi-lo+1));
const BASE=Date.UTC(2026,9,11)-7*3600e3; // Bangkok midnight today
const ts=(d,h,m)=>BASE+d*86400000+h*3600e3+m*60e3;
const dow=d=>new Date(BASE+d*86400000+7*3600e3).getUTCDay(); // 0 Sun

const L=[
 ['rcv','WH1-RCV','จุดรับของ / Receiving','คลังไซต์งาน','R','recv'],
 ['a01','WH1-A-01','ชั้นวาง A แถว 1 · วัสดุไฟฟ้า','คลังไซต์งาน','A','rack'],
 ['a02','WH1-A-02','ชั้นวาง A แถว 2 · สายไฟ/เคเบิล','คลังไซต์งาน','A','rack'],
 ['b01','WH1-B-01','ชั้นวาง B แถว 1 · อุปกรณ์ยึด/เครื่องมือ','คลังไซต์งาน','B','rack'],
 ['b02','WH1-B-02','ชั้นวาง B แถว 2 · PPE','คลังไซต์งาน','B','rack'],
 ['f01','WH1-F-01','ลานกองวัสดุ · ปูน/เหล็ก','คลังไซต์งาน','F','floor'],
 ['hold','WH1-HOLD','พื้นที่กักกัน / รอตรวจรับ','คลังไซต์งาน','H','hold'],
 ['it01','IT-CAB-01','ตู้เก็บอุปกรณ์ IT','ห้อง IT สำนักงาน','IT','cabinet']
];
const I=[
 ['cem001','CEM-001','ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.','วัสดุก่อสร้าง','ถุง',142,200,1000,'บจก. สยามวัสดุก่อสร้าง'],
 ['cem002','CEM-002','ปูนฉาบสำเร็จรูป 40 กก.','วัสดุก่อสร้าง','ถุง',98,100,600,'บจก. สยามวัสดุก่อสร้าง'],
 ['rbr12','RBR-DB12','เหล็กข้ออ้อย DB12 ยาว 10 ม.','เหล็กเสริมคอนกรีต','เส้น',285,150,800,'บจก. ไทยสตีลเทรดดิ้ง'],
 ['rbr16','RBR-DB16','เหล็กข้ออ้อย DB16 ยาว 10 ม.','เหล็กเสริมคอนกรีต','เส้น',510,100,500,'บจก. ไทยสตีลเทรดดิ้ง'],
 ['cbl04','CBL-THW4','สายไฟ THW 1×4 sq.mm ม้วน 100 ม.','ไฟฟ้า','ม้วน',1850,10,40,'บจก. ไทยเคเบิลซัพพลาย'],
 ['cbl25','CBL-VCT25','สายไฟ VCT 3×2.5 sq.mm ม้วน 100 ม.','ไฟฟ้า','ม้วน',2950,6,24,'บจก. ไทยเคเบิลซัพพลาย'],
 ['brk20','BRK-2P20','เบรกเกอร์ MCB 2P 20A','ไฟฟ้า','ตัว',420,20,80,'หจก. เอ็มซีบี อิเล็กทริก'],
 ['blt12','BLT-M12X80','สลักเกลียวพร้อมน็อต M12×80','อุปกรณ์ยึด','ชุด',18.5,500,3000,'บจก. แฟสเทนเนอร์ไทย'],
 ['anc10','ANC-M10X100','พุกเหล็ก M10×100','อุปกรณ์ยึด','ตัว',12,400,2000,'บจก. แฟสเทนเนอร์ไทย'],
 ['hlm','PPE-HELMET','หมวกนิรภัย สีขาว','PPE / ความปลอดภัย','ใบ',135,40,150,'บจก. เซฟตี้พลัส'],
 ['glv','PPE-GLOVE','ถุงมือผ้าเคลือบยาง','PPE / ความปลอดภัย','คู่',28,100,600,'บจก. เซฟตี้พลัส'],
 ['vst','PPE-VEST','เสื้อสะท้อนแสง','PPE / ความปลอดภัย','ตัว',95,30,120,'บจก. เซฟตี้พลัส'],
 ['netc6','NET-CAT6','สาย LAN Cat6 UTP กล่อง 305 ม.','IT / Network','กล่อง',2650,3,12,'บจก. ไอทีเน็ตเวิร์ค'],
 ['sw24','NET-SW24P','สวิตช์ PoE 24 พอร์ต','IT / Network','ตัว',14900,2,6,'บจก. ไอทีเน็ตเวิร์ค'],
 ['ssd','IT-SSD1T','SSD 1TB SATA (อะไหล่เซิร์ฟเวอร์)','IT / Network','ชิ้น',2490,4,10,'บจก. ไอทีเน็ตเวิร์ค'],
 ['drl','TLS-DRILL','สว่านไฟฟ้าไร้สาย 18V','เครื่องมือ','เครื่อง',4200,3,10,'บจก. โปรทูลส์']
];
const items={},locs={};
for(const [id,code,name,wh,zone,type] of L)locs[id]={code,name,wh,zone,type,active:true,sample:true,createdAt:ts(-30,9,0)};
const IT={};
for(const [id,sku,name,cat,unit,cost,min,max,supplier] of I){items[id]={sku,name,cat,unit,cost,price:0,min,max,supplier,note:'ข้อมูลตัวอย่างสำหรับทดลองใช้งาน',active:true,sample:true,createdAt:ts(-30,9,0)};IT[id]=items[id]}

const bal={};const B=(i,l)=>bal[i+'|'+l]||0;
const docs=[];const seqs={};
const PFX={IN:'GR',OUT:'GI',TRF:'TR',ADJ:'AJ'};
function line(i){const it=IT[i];return {itemId:i,sku:it.sku,name:it.name,unit:it.unit,cost:it.cost}}
function doc(d,h,m,type,party,ref,note,lines){
  const t=ts(d,h,m),dt=new Date(t+7*3600e3);
  const ym=String(dt.getUTCFullYear()).slice(2)+String(dt.getUTCMonth()+1).padStart(2,'0');
  const k=PFX[type]+'-'+ym+'-';seqs[k]=(seqs[k]||0)+1;
  const out=[];
  for(const l of lines){
    if(type==='IN'){bal[l.i+'|'+l.l]=B(l.i,l.l)+l.q;out.push({...line(l.i),locId:l.l,qty:l.q,lot:l.lot||''})}
    else if(type==='OUT'){const q=Math.min(l.q,B(l.i,l.l));if(q<=0)continue;bal[l.i+'|'+l.l]=B(l.i,l.l)-q;out.push({...line(l.i),locId:l.l,qty:q})}
    else if(type==='TRF'){const q=Math.min(l.q,B(l.i,l.l));if(q<=0)continue;bal[l.i+'|'+l.l]=B(l.i,l.l)-q;bal[l.i+'|'+l.to]=B(l.i,l.to)+q;out.push({...line(l.i),locId:l.l,toLocId:l.to,qty:q})}
    else{const sys=B(l.i,l.l),cnt=l.c(sys);if(cnt===sys)continue;bal[l.i+'|'+l.l]=cnt;out.push({...line(l.i),locId:l.l,system:sys,counted:cnt,delta:cnt-sys})}
  }
  if(!out.length)return;
  docs.push({id:'d'+String(docs.length+1).padStart(3,'0'),no:k+String(seqs[k]).padStart(4,'0'),type,ts:t,party,ref,note:note||'',lines:out,sample:true,createdAt:t});
}
// opening receipts (29 days ago)
doc(-45,9,10,'IN','บจก. สยามวัสดุก่อสร้าง','PO-2609-014','รับของรอบเปิดคลัง',[{i:'cem001',l:'f01',q:600,lot:'L2609A'},{i:'cem001',l:'rcv',q:200,lot:'L2609A'},{i:'cem002',l:'f01',q:300,lot:'L2609B'}]);
doc(-45,10,40,'IN','บจก. ไทยสตีลเทรดดิ้ง','PO-2609-015','',[{i:'rbr12',l:'f01',q:600},{i:'rbr16',l:'f01',q:300}]);
doc(-45,13,20,'IN','บจก. ไทยเคเบิลซัพพลาย','PO-2609-016','',[{i:'cbl04',l:'a02',q:30},{i:'cbl25',l:'a02',q:18},{i:'brk20',l:'a01',q:60}]);
doc(-45,15,5,'IN','บจก. แฟสเทนเนอร์ไทย / บจก. เซฟตี้พลัส','PO-2609-017','',[{i:'blt12',l:'b01',q:2000},{i:'anc10',l:'b01',q:1500},{i:'hlm',l:'b02',q:120},{i:'glv',l:'b02',q:500},{i:'vst',l:'b02',q:90}]);
doc(-45,16,30,'IN','บจก. ไอทีเน็ตเวิร์ค / บจก. โปรทูลส์','PO-2609-018','',[{i:'netc6',l:'it01',q:8},{i:'sw24',l:'it01',q:4},{i:'ssd',l:'it01',q:8},{i:'drl',l:'b01',q:6}]);
doc(-44,14,0,'TRF','สมศักดิ์ (ผู้ดูแลคลัง)','','ย้ายปูนจากจุดรับของเข้าลานกอง',[{i:'cem001',l:'rcv',to:'f01',q:200}]);
const dests=['งานโครงสร้าง ช่วง P10–P14','งานระบบไฟฟ้าอาคารสำนักงานสนาม','งานฐานรากเสาเข็ม กลุ่ม C','งานติดตั้งแผงควบคุมชั้น 2','ฝ่ายสนับสนุนงานก่อสร้าง'];
const use={cem001:[40,110],cem002:[10,40],rbr12:[20,70],rbr16:[10,35],cbl04:[1,3],cbl25:[1,2],brk20:[2,8],blt12:[60,220],anc10:[40,160],hlm:[3,9],glv:[20,70],vst:[2,7]};
const home={cem001:'f01',cem002:'f01',rbr12:'f01',rbr16:'f01',cbl04:'a02',cbl25:'a02',brk20:'a01',blt12:'b01',anc10:'b01',hlm:'b02',glv:'b02',vst:'b02'};
const keys=Object.keys(use);
const extraIn={'-22':[['บจก. สยามวัสดุก่อสร้าง','PO-2609-031',[{i:'cem001',l:'rcv',q:400,lot:'L2609C'},{i:'rbr12',l:'f01',q:300}]]],
 '-15':[['บจก. ไทยเคเบิลซัพพลาย','PO-2610-004',[{i:'cbl04',l:'a02',q:12},{i:'cbl25',l:'a02',q:6}]],['บจก. เซฟตี้พลัส','PO-2610-005',[{i:'glv',l:'b02',q:200}]]],
 '-10':[['หจก. เอ็มซีบี อิเล็กทริก','PO-2610-008',[{i:'brk20',l:'hold',q:24,lot:'L2610A'}]]],
 '-8':[['บจก. สยามวัสดุก่อสร้าง','PO-2610-010',[{i:'cem001',l:'rcv',q:300,lot:'L2610B'},{i:'cem002',l:'f01',q:120}]]],
 '-4':[['บจก. เซฟตี้พลัส','PO-2610-014',[{i:'hlm',l:'b02',q:40},{i:'vst',l:'b02',q:30}]]]};
for(let d=-26;d<=-1;d++){
  const w=dow(d);
  (extraIn[d]||[]).forEach(([p,r,ls],i)=>doc(d,9,5+i*40,'IN',p,r,'',ls));
  if(d===-21)doc(d,14,10,'TRF','สมศักดิ์ (ผู้ดูแลคลัง)','','ย้ายปูนจากจุดรับของเข้าลานกอง',[{i:'cem001',l:'rcv',to:'f01',q:400}]);
  if(d===-9)doc(d,11,30,'TRF','สมศักดิ์ (ผู้ดูแลคลัง)','QC-2610-003','ผ่านการตรวจรับ ย้ายเข้าชั้นวาง',[{i:'brk20',l:'hold',to:'a01',q:24}]);
  if(d===-7)doc(d,10,45,'TRF','สมศักดิ์ (ผู้ดูแลคลัง)','','ย้ายปูนจากจุดรับของเข้าลานกอง',[{i:'cem001',l:'rcv',to:'f01',q:300}]);
  if(d===-16)doc(d,16,20,'ADJ','ทีมตรวจนับ','CNT-2610-01','ตรวจนับประจำเดือน พบพุกขาดจากความเสียหาย',[{i:'anc10',l:'b01',c:s=>s-12}]);
  if(d===-5)doc(d,16,10,'ADJ','ทีมตรวจนับ','CNT-2610-02','ตรวจนับถุงมือ พบสูญหาย',[{i:'glv',l:'b02',c:s=>s-6}]);
  if(d===-6)doc(d,10,15,'OUT','ฝ่าย IT / ห้องเซิร์ฟเวอร์','WO-2610-071','เปลี่ยนอะไหล่ RAID เซิร์ฟเวอร์',[{i:'ssd',l:'it01',q:5}]);
  if(d===-12)doc(d,13,40,'OUT','งานติดตั้งแผงควบคุมชั้น 2','WO-2610-044','',[{i:'netc6',l:'it01',q:2},{i:'sw24',l:'it01',q:1}]);
  if(d===-4)doc(d,9,50,'OUT','ช่างเทคนิคสนาม','WO-2610-083','',[{i:'drl',l:'b01',q:4}]);
  if(w===0||w===6)continue;
  const nDocs=ri(1,2);
  for(let k=0;k<nDocs;k++){
    const n=ri(1,3),pick=new Set();while(pick.size<n)pick.add(keys[ri(0,keys.length-1)]);
    const ls=[...pick].map(i=>({i,l:home[i],q:ri(...use[i])}));
    // prefer the location that actually holds stock
    ls.forEach(l=>{if(B(l.i,l.l)<l.q){const alt=Object.keys(bal).filter(k2=>k2.startsWith(l.i+'|')&&bal[k2]>0).sort((x,y)=>bal[y]-bal[x])[0];if(alt)l.l=alt.split('|')[1]}});
    doc(d,ri(8,16),ri(0,59),'OUT',dests[ri(0,dests.length-1)],'WO-2610-'+String(100+docs.length).padStart(3,'0'),'',ls);
  }
}
// push a few items below Min / to zero for a realistic dashboard
doc(-2,15,30,'OUT','งานโครงสร้าง ช่วง P10–P14','WO-2610-199','ปิดงานเทพื้นชั้นล่าง',[{i:'cem002',l:'f01',q:9999}]);
const glvNow=['b02'].map(l=>B('glv',l))[0];
if(glvNow>88)doc(-1,9,15,'OUT','ฝ่ายความปลอดภัย (จป.)','WO-2610-201','แจกจ่ายพนักงานใหม่',[{i:'glv',l:'b02',q:glvNow-88}]);
doc(0,6,40,'OUT','งานระบบไฟฟ้าอาคารสำนักงานสนาม','WO-2610-204','เบิกเช้าก่อนเริ่มงาน',[{i:'cbl04',l:'a02',q:1},{i:'brk20',l:'a01',q:4}]);
const out={items,locations:locs,docs:Object.fromEntries(docs.map(d=>{const {id,...r}=d;return [id,r]}))};
fs.writeFileSync('seed.json',JSON.stringify(out));
// report
const tot={};for(const k in bal){const [i]=k.split('|');tot[i]=(tot[i]||0)+bal[k]}
console.log('docs',docs.length,'lines',docs.reduce((s,d)=>s+d.lines.length,0));
for(const [id,sku,name,,unit,,min,max] of I)console.log(sku.padEnd(13),String(tot[id]||0).padStart(6),unit.padEnd(6),'min',min,'max',max,(tot[id]||0)<=0?'OUT':(tot[id]<=min?'LOW':(tot[id]>max?'OVER':'ok')));
const neg=Object.entries(bal).filter(([,v])=>v<0);console.log('negatives',neg.length);
