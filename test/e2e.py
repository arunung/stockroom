import json, sys, time
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8790/'
seed=json.load(open('test/seed.json'))
fake=open('test/fake-supabase.js',encoding='utf-8').read()
recs=[]
for col in ('items','locations','docs'):
    for k,v in seed[col].items(): recs.append({'col':col,'id':k,'data':v})
USERS={
 'admin@x.co':{'id':'u_admin','password':'password1','name':'Admin','role':'admin'},
 'clerk@x.co':{'id':'u_clerk','password':'password1','name':'Clerk','role':'clerk'},
 'view@x.co':{'id':'u_view','password':'password1','name':'Viewer','role':'viewer'},
 'pend@x.co':{'id':'u_pend','password':'password1','name':'Pending','role':'pending'},
}
init="window.__FSEED__="+json.dumps({'users':USERS,'records':recs})+";"
CFG='window.STOCKROOM_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon"};'
res=[]
def chk(n,ok,extra=''):
    res.append(ok); print(('PASS ' if ok else 'FAIL ')+n+(' — '+str(extra) if extra and not ok else ''))
with sync_playwright() as p:
    b=p.chromium.launch()
    def newpage(email=None, vw=1280, vh=800):
        ctx=b.new_context(viewport={'width':vw,'height':vh},accept_downloads=True)
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
        pg.on('console',lambda m:errs.append('CONSOLE '+m.text) if m.type=='error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
        pg.route('**/vendor/supabase.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
        pg.route('**/config.js*',lambda r:r.fulfill(body=CFG,content_type='application/javascript'))
        pg.route('**/fonts.g*/**',lambda r:r.abort())
        pg.add_init_script(init)
        if email: pg.add_init_script("try{localStorage.setItem('fake-sess','%s')}catch(e){}"%email)
        return pg,errs
    # 0. unconfigured -> setup overlay
    ctx=b.new_context(); pg=ctx.new_page(); pg.route('**/fonts.g*/**',lambda r:r.abort())
    pg.goto(BASE); pg.wait_for_selector('#srDemo',timeout=8000)
    chk('setup overlay when config empty', 'config.js' in pg.inner_text('#srAuth'))
    ctx.close()
    # 1. login form with wrong pw, then ok
    pg,errs=newpage(); pg.goto(BASE); pg.wait_for_selector('#sr-mail',timeout=8000)
    pg.fill('#sr-mail','admin@x.co'); pg.fill('#sr-pw','wrong'); pg.click('#srGo')
    pg.wait_for_selector('#srMsg:not([style*="none"])',timeout=4000)
    chk('wrong password shows message', len(pg.inner_text('#srMsg'))>3, pg.inner_text('#srMsg'))
    pg.fill('#sr-pw','password1'); pg.click('#srGo')
    pg.wait_for_selector('#srAuth',state='detached',timeout=8000)
    pg.wait_for_selector('[data-act]',timeout=8000); time.sleep(3)
    body=pg.inner_text('body')
    chk('admin sees seeded data (KPI 658,698)', '658,698' in body)
    chk('admin: sign-out button present', pg.locator('[data-act="signout"]').count()>0)
    chk('no JS errors after login (CSP ok)', not errs, errs[:3])
    pg.screenshot(path='/tmp/e2e_admin_dash.png')
    # nav to each page
    for hash_ in ['receive','issue','transfer','items','locations','reports','admin']:
        pg.evaluate("h=>location.hash=h",'#/'+hash_); time.sleep(0.5)
    chk('no errors navigating pages', not errs, errs[:3])
    # admin page standalone card
    pg.evaluate("location.hash='#/admin'"); time.sleep(0.6)
    t=pg.inner_text('body'); chk('admin page shows standalone card / member list', 'Supabase' in t or 'ผู้ใช้' in t or 'สมาชิก' in t)
    pg.screenshot(path='/tmp/e2e_admin_page.png')
    # Realtime: another actor inserts a doc via fake; UI should update w/o reload
    pg.evaluate("""()=>{const T=window.__FAKE__;const r={col:'items',id:'zz1',data:{sku:'ZZ-TEST',name:'ทดสอบเรียลไทม์',cat:'ทดสอบ',unit:'ชิ้น',cost:1,price:0,min:0,max:0,active:true,createdAt:Date.now()},deleted:false,updated_at:new Date().toISOString()};T.records.push(r);T.handlers.forEach(h=>h.table==='records'&&h.cb({eventType:'INSERT',new:r}))}""")
    pg.evaluate("location.hash='#/items'"); time.sleep(0.8)
    chk('realtime insert appears', 'ZZ-TEST' in pg.inner_text('body'))
    # tombstone delivered by realtime removes it
    pg.evaluate("""()=>{const T=window.__FAKE__;const r=T.records.find(x=>x.id==='zz1');r.deleted=true;r.updated_at=new Date().toISOString();T.handlers.forEach(h=>h.table==='records'&&h.cb({eventType:'UPDATE',new:r}))}""")
    time.sleep(0.8); chk('realtime tombstone removes', 'ZZ-TEST' not in pg.inner_text('body'))
    # reload -> session persisted, cache path, delta
    pg.reload(); pg.wait_for_selector('[data-act]',timeout=8000); time.sleep(1)
    chk('reload keeps session (no login)', pg.locator('#sr-mail').count()==0)
    # sign out
    pg.click('[data-act="signout"]'); pg.wait_for_selector('#sr-mail',timeout=8000)
    chk('sign out returns to login', True)
    pg.context.close()

    # 2. pending user
    pg,errs=newpage(); pg.goto(BASE); pg.wait_for_selector('#sr-mail')
    pg.fill('#sr-mail','pend@x.co'); pg.fill('#sr-pw','password1'); pg.click('#srGo')
    pg.wait_for_selector('#srOut',timeout=8000)
    chk('pending user sees approval overlay', 'รอการอนุมัติ' in pg.inner_text('#srAuth'))
    calls=pg.evaluate("window.__FAKE__.calls.filter(c=>c.table==='records').length")
    chk('pending user made no records queries', calls==0, calls)
    # approve -> poll (6s) opens app
    pg.evaluate("window.__FAKE__.profiles.u_pend.role='viewer'")
    pg.wait_for_selector('#srAuth',state='detached',timeout=15000); time.sleep(1)
    chk('approval auto-opens app', 'CEM-001' in pg.inner_text('body') or 'ปูน' in pg.inner_text('body'))
    pg.context.close()

    # 3. signup new user -> pending
    pg,errs=newpage(); pg.goto(BASE); pg.wait_for_selector('#sr-mail')
    pg.click('[data-m="up"]'); pg.fill('#sr-name','คนใหม่'); pg.fill('#sr-mail','new@x.co'); pg.fill('#sr-pw','password1'); pg.click('#srGo')
    pg.wait_for_selector('#srOut',timeout=8000)
    chk('signup -> pending overlay', 'คนใหม่' in pg.inner_text('#srAuth'))
    pg.context.close()

    # 4. viewer: write buttons hidden / blocked
    pg,errs=newpage('view@x.co'); pg.goto(BASE); pg.wait_for_selector('[data-act]',timeout=8000); time.sleep(1)
    body=pg.inner_text('body'); chk('viewer sees data', 'ปูน' in body)
    chk('viewer nav: admin item hidden', pg.locator('#nav-admin').count()==0, pg.locator('#nav-admin').count())
    chk('viewer nav: receive hidden', pg.locator('#nav-receive').count()==0, pg.locator('#nav-receive').count())
    pg.screenshot(path='/tmp/e2e_viewer.png')
    pg.context.close()

    # 5. clerk: receive doc end-to-end via UI
    pg,errs=newpage('clerk@x.co'); pg.goto(BASE); pg.wait_for_selector('[data-act]',timeout=8000); time.sleep(1)
    chk('clerk nav: receive visible, admin hidden', pg.locator('#nav-receive').count()==1 and pg.locator('#nav-admin').count()==0)
    pg.evaluate("location.hash='#/receive'"); time.sleep(0.8)
    pg.evaluate("location.hash='#receive'"); time.sleep(0.8)
    n0=pg.evaluate("window.__FAKE__.records.filter(r=>r.col==='docs').length")
    opts=pg.eval_on_selector_all('#l0-itemId option','els=>els.map(e=>e.value)')
    locs=pg.eval_on_selector_all('#l0-locId option','els=>els.map(e=>e.value)')
    item=[o for o in opts if o][0]; loc=[o for o in locs if o][0]
    pg.select_option('#l0-itemId',item); pg.select_option('#l0-locId',loc); pg.fill('#l0-qty','7')
    time.sleep(0.3); pg.click('#submitDoc'); time.sleep(1.2)
    docs=pg.evaluate("window.__FAKE__.records.filter(r=>r.col==='docs')")
    chk('clerk receive saved to DB', len(docs)==n0+1, (n0,len(docs)))
    if len(docs)==n0+1:
        d=[x for x in docs if x['id'] not in seed['docs']][0]['data']
        chk('doc.type IN & qty 7', d.get('type')=='IN' and any(float(l.get('qty',0))==7 for l in d.get('lines',[])), d)
        chk('doc.by = clerk uid', d.get('by')=='u_clerk', d.get('by'))
    # clerk cannot adjust: force ADJ via direct API -> permission_denied path
    r=pg.evaluate("""async()=>{const db=await window.claude.use('db');try{await db.collection('docs').doc('adj_x').set({type:'ADJ',by:'u_clerk',lines:[]});return 'ok'}catch(e){return e.code||String(e)}}""")
    chk('clerk ADJ write is denied (permission_denied)', r=='permission_denied', r)
    r=pg.evaluate("""async()=>{const db=await window.claude.use('db');try{await db.collection('items').doc('hack').set({sku:'H',name:'h'});return 'ok'}catch(e){return e.code||String(e)}}""")
    chk('clerk item write is denied', r=='permission_denied', r)
    chk('no JS errors (clerk)', not errs, errs[:3])
    pg.context.close()

    # 6. viewer cannot write at all; admin can void (update) docs & change role
    pg,errs=newpage('view@x.co'); pg.goto(BASE); pg.wait_for_selector('[data-act]',timeout=8000); time.sleep(1)
    r=pg.evaluate("""async()=>{const db=await window.claude.use('db');try{await db.collection('docs').doc('v_x').set({type:'IN',by:'u_view',lines:[]});return 'ok'}catch(e){return e.code||String(e)}}""")
    chk('viewer write denied', r=='permission_denied', r)
    pg.context.close()
    pg,errs=newpage('admin@x.co'); pg.goto(BASE); pg.wait_for_selector('[data-act]',timeout=8000); time.sleep(1)
    r=pg.evaluate("""async()=>{const m=await window.claude.use('db');const c=m.collection('members');
      await c.doc('u_pend').set({role:'clerk'});return 'ok'}""")
    time.sleep(0.5)
    chk('admin sets member role -> profiles', pg.evaluate("window.__FAKE__.profiles.u_pend.role")=='clerk')
    r=pg.evaluate("""async()=>{const db=await window.claude.use('db');await db.collection('items').doc('a1').set({sku:'A1',name:'x',unit:'u',active:true});await db.collection('items').doc('a1').delete();return 'ok'}""")
    row=pg.evaluate("window.__FAKE__.records.find(r=>r.id==='a1')")
    chk('admin item create + soft delete (tombstone)', row and row['deleted'] is True, row)
    chk('no JS errors (admin ops)', not errs, errs[:3])
    pg.context.close()
    b.close()
print('\n%d/%d passed'%(sum(res),len(res)))
sys.exit(0 if all(res) else 1)
