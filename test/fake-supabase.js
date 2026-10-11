/* In-memory stand-in for @supabase/supabase-js (subset used by src/shim.js). Test-only. */
(function(){
  const W=window;
  const T=W.__FAKE__={users:{},records:[],profiles:{},session:null,calls:[],handlers:[],storage:{},now:()=>new Date().toISOString(),tick:0};
  // seed from page-provided data
  const seed=W.__FSEED__||{};
  T.users=seed.users||{};            // email -> {id,password,name}
  Object.values(T.users).forEach(u=>{T.profiles[u.id]={id:u.id,name:u.name,role:u.role||'pending',last_seen:null}});
  (seed.records||[]).forEach(r=>T.records.push({col:r.col,id:r.id,data:r.data,deleted:false,updated_at:new Date(Date.now()-86400000*3+(T.tick++)).toISOString()}));
  const me=()=>T.session&&T.session.user.id;
  const role=()=>me()&&T.profiles[me()]?T.profiles[me()].role:'pending';
  const approved=()=>['viewer','clerk','manager','admin'].includes(role());
  const fire=(table,row,kind)=>T.handlers.forEach(h=>{if(h.table===table&&(!h.filter||('col=eq.'+row.col)===h.filter)){setTimeout(()=>h.cb({eventType:kind,new:row}),5)}});
  const denied={error:{code:'42501',message:'new row violates row-level security policy'}};

  function builder(table){
    const q={table,op:'select',filters:[],order:[],range:null,payload:null,sel:false,single:false};
    const b={
      select(){q.sel=true;return b},
      eq(k,v){q.filters.push(['eq',k,v]);return b},
      in(k,v){q.filters.push(['in',k,v]);return b},
      gte(k,v){q.filters.push(['gte',k,v]);return b},
      order(k,o){q.order.push([k,o&&o.ascending===false?-1:1]);return b},
      range(a,z){q.range=[a,z];return b},
      upsert(p){q.op='upsert';q.payload=p;return b},
      update(p){q.op='update';q.payload=p;return b},
      maybeSingle(){q.single=true;return b},
      then(res,rej){return Promise.resolve(run(q)).then(res,rej)}
    };
    return b;
  }
  const match=(row,f)=>f.every(([op,k,v])=>op==='eq'?row[k]===v:op==='in'?v.includes(row[k]):op==='gte'?row[k]>=v:true);
  function run(q){
    T.calls.push({table:q.table,op:q.op,filters:q.filters.map(f=>f.join(':'))});
    if(!T.session)return {data:null,error:{code:'401',message:'no session'}};
    if(q.table==='records'){
      if(q.op==='select'){
        if(!approved())return {data:[],error:null};
        let rows=T.records.filter(r=>match(r,q.filters));
        q.order.forEach(([k,d])=>rows.sort((a,b)=>a[k]<b[k]?-d:a[k]>b[k]?d:0));
        if(q.range)rows=rows.slice(q.range[0],q.range[1]+1);
        return {data:rows.map(r=>({...r})),error:null};
      }
      if(q.op==='upsert'){
        const p=q.payload,r=role();
        const okIns=p.col==='docs'?['clerk','manager','admin'].includes(r)&&(p.data.type!=='ADJ'||['manager','admin'].includes(r)):['items','locations','voids'].includes(p.col)?['manager','admin'].includes(r):p.col==='settings'?r==='admin':false;
        const ex=T.records.find(x=>x.col===p.col&&x.id===p.id);
        if(ex&&!(p.col==='docs'?r==='admin':okIns))return denied;
        if(!ex&&!okIns)return denied;
        const row=ex||{col:p.col,id:p.id};row.data=p.data;row.deleted=!!p.deleted;row.updated_at=T.now();
        if(!ex)T.records.push(row);
        fire('records',row,ex?'UPDATE':'INSERT');
        return {data:null,error:null};
      }
      if(q.op==='update'){
        const r=role();let rows=T.records.filter(x=>match(x,q.filters));
        const can=x=>x.col==='docs'?r==='admin':x.col==='settings'?r==='admin':['manager','admin'].includes(r);
        rows=rows.filter(can);rows.forEach(x=>{Object.assign(x,q.payload);x.updated_at=T.now();fire('records',x,'UPDATE')});
        return {data:rows.map(x=>({id:x.id})),error:null};
      }
    }
    if(q.table==='profiles'){
      if(q.op==='select'){
        let rows=Object.values(T.profiles).filter(p=>approved()||p.id===me()).filter(p=>match(p,q.filters));
        if(q.single)return {data:rows[0]||null,error:null};
        return {data:rows.map(p=>({...p})),error:null};
      }
      if(q.op==='update'){
        if(role()!=='admin')return {data:[],error:null};
        const rows=Object.values(T.profiles).filter(p=>match(p,q.filters));
        rows.forEach(p=>{Object.assign(p,q.payload);fire('profiles',{...p},'UPDATE')});
        return {data:rows.map(p=>({id:p.id})),error:null};
      }
    }
    return {data:null,error:{message:'unsupported '+q.table+' '+q.op}};
  }
  const auth={
    async getSession(){return {data:{session:T.session}}},
    async signInWithPassword({email,password}){
      const u=T.users[email];if(!u||u.password!==password)return {data:{},error:{message:'Invalid login credentials'}};
      T.session={user:{id:u.id,email}};try{localStorage.setItem('fake-sess',email)}catch(e){}
      return {data:{session:T.session},error:null};
    },
    async signUp({email,password,options}){
      if(T.users[email])return {data:{},error:{message:'User already registered'}};
      const id='u_'+Math.random().toString(16).slice(2,10);
      T.users[email]={id,password,name:(options&&options.data&&options.data.name)||email.split('@')[0]};
      T.profiles[id]={id,name:T.users[email].name,role:'pending',last_seen:null};
      T.session={user:{id,email}};try{localStorage.setItem('fake-sess',email)}catch(e){}
      return {data:{session:T.confirm?null:T.session,user:{id}},error:null};
    },
    async signOut(){T.session=null;try{localStorage.removeItem('fake-sess')}catch(e){}return {error:null}}
  };
  W.supabase={createClient(url,key){
    T.url=url;T.key=key;
    try{const e=localStorage.getItem('fake-sess');if(e&&T.users[e])T.session={user:{id:T.users[e].id,email:e}}}catch(e){}
    return {
      auth,
      from:builder,
      async rpc(name){T.calls.push({rpc:name});if(name==='touch_seen'&&me()&&T.profiles[me()])T.profiles[me()].last_seen=T.now();return {data:null,error:null}},
      channel(){const ch={on(type,opts,cb){T.handlers.push({table:opts.table,filter:opts.filter,cb});return ch},subscribe(f){setTimeout(()=>f&&f('SUBSCRIBED'),5);return ch}};return ch},
      storage:{from(bucket){return {
        async upload(path,blob,o){if(!['manager','admin'].includes(role()))return denied;T.storage[path]={size:blob.size,type:o&&o.contentType};return {data:{path},error:null}},
        async remove(paths){paths.forEach(p=>delete T.storage[p]);return {data:[],error:null}}
      }}}
    };
  }};
})();
