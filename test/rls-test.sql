-- Run after supabase-stub.sql + ../supabase/schema.sql. Prints PASS/FAIL lines.
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create or replace function pg_temp.as_admin_sql() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); end $$;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
declare n int;
begin execute q; get diagnostics n = row_count; return case when n = 0 then 'zero-rows' else 'ok' end;
exception when others then return 'err:' || sqlstate; end $$;
create or replace function pg_temp.expect(name text, got text, want text) returns void language plpgsql as $$
begin raise notice '% %  (got %, want %)', case when got = want then 'PASS' else 'FAIL' end, name, got, want; end $$;

-- users: signups via the trigger
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','admin@x.com','{"name":"Ann Admin"}'),
 ('00000000-0000-0000-0000-0000000000b1','mgr@x.com','{"name":"Max Manager"}'),
 ('00000000-0000-0000-0000-0000000000c1','clerk@x.com','{"name":"Cleo Clerk"}'),
 ('00000000-0000-0000-0000-0000000000d1','view@x.com','{}'),
 ('00000000-0000-0000-0000-0000000000e1','new@x.com','{"name":"Newbie"}');
select pg_temp.expect('trigger creates pending profiles', (select count(*)::text||'/'||min(role) from profiles where role='pending'), '5/pending');
select pg_temp.expect('name falls back to email prefix', (select name from profiles where id='00000000-0000-0000-0000-0000000000d1'), 'view');
-- bootstrap roles as the SQL-editor superuser (auth.uid() is null)
update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000a1';
update profiles set role='manager' where id='00000000-0000-0000-0000-0000000000b1';
update profiles set role='clerk' where id='00000000-0000-0000-0000-0000000000c1';
update profiles set role='viewer' where id='00000000-0000-0000-0000-0000000000d1';

-- pending user: sees nothing
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect('pending reads no records', (select count(*)::text from records), '0');
select pg_temp.expect('pending sees only own profile', (select count(*)::text from profiles), '1');
select pg_temp.expect('pending cannot insert doc', pg_temp.try($q$insert into records(col,id,data) values('docs','p1','{"type":"IN","by":"00000000-0000-0000-0000-0000000000e1"}')$q$), 'err:42501');
select pg_temp.expect('pending cannot self-approve', pg_temp.try($q$update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000e1'$q$), 'zero-rows');

-- manager creates master data
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('manager inserts item', pg_temp.try($q$insert into records(col,id,data) values('items','i1','{"sku":"A","name":"Item A"}')$q$), 'ok');
select pg_temp.expect('manager inserts location', pg_temp.try($q$insert into records(col,id,data) values('locations','l1','{"code":"L1"}')$q$), 'ok');
select pg_temp.expect('manager inserts ADJ doc', pg_temp.try($q$insert into records(col,id,data) values('docs','adj1','{"type":"ADJ","by":"00000000-0000-0000-0000-0000000000b1"}')$q$), 'ok');
select pg_temp.expect('manager cannot write settings', pg_temp.try($q$insert into records(col,id,data) values('settings','main','{"orgName":"x"}')$q$), 'err:42501');
select pg_temp.expect('manager cannot change roles', pg_temp.try($q$update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000c1'$q$), 'zero-rows');
select pg_temp.expect('manager can void (insert voids)', pg_temp.try($q$insert into records(col,id,data) values('voids','adj1','{"docId":"adj1","by":"00000000-0000-0000-0000-0000000000b1"}')$q$), 'ok');
select pg_temp.expect('manager cannot tombstone a doc (immutable ledger)', pg_temp.try($q$update records set deleted=true where col='docs' and id='adj1'$q$), 'zero-rows');

-- clerk
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('clerk reads records', (select count(*)::text from records where col in ('items','locations')), '2');
select pg_temp.expect('clerk inserts IN doc', pg_temp.try($q$insert into records(col,id,data) values('docs','gr1','{"type":"IN","by":"00000000-0000-0000-0000-0000000000c1"}')$q$), 'ok');
select pg_temp.expect('clerk inserts OUT doc', pg_temp.try($q$insert into records(col,id,data) values('docs','gi1','{"type":"OUT","by":"00000000-0000-0000-0000-0000000000c1"}')$q$), 'ok');
select pg_temp.expect('clerk cannot insert ADJ', pg_temp.try($q$insert into records(col,id,data) values('docs','adj2','{"type":"ADJ","by":"00000000-0000-0000-0000-0000000000c1"}')$q$), 'err:42501');
select pg_temp.expect('clerk cannot spoof author', pg_temp.try($q$insert into records(col,id,data) values('docs','gr2','{"type":"IN","by":"00000000-0000-0000-0000-0000000000b1"}')$q$), 'err:42501');
select pg_temp.expect('clerk cannot insert item', pg_temp.try($q$insert into records(col,id,data) values('items','i2','{"sku":"B"}')$q$), 'err:42501');
select pg_temp.expect('clerk cannot edit item', pg_temp.try($q$update records set data='{"sku":"hacked"}' where col='items' and id='i1'$q$), 'zero-rows');
select pg_temp.expect('clerk cannot overwrite own doc', pg_temp.try($q$update records set data='{"type":"IN","by":"00000000-0000-0000-0000-0000000000c1","x":1}' where col='docs' and id='gr1'$q$), 'zero-rows');
select pg_temp.expect('clerk cannot void', pg_temp.try($q$insert into records(col,id,data) values('voids','gr1','{"by":"00000000-0000-0000-0000-0000000000c1"}')$q$), 'err:42501');
select pg_temp.expect('clerk cannot hard delete', pg_temp.try($q$delete from records where col='docs' and id='gr1'$q$), 'err:42501');
select pg_temp.expect('clerk cannot use unknown col', pg_temp.try($q$insert into records(col,id,data) values('hax','x','{}')$q$), 'err:42501');
select pg_temp.expect('clerk upsert of a NEW doc works (PostgREST path)', pg_temp.try($q$insert into records(col,id,data,deleted) values('docs','gr9','{"type":"IN","by":"00000000-0000-0000-0000-0000000000c1"}',false) on conflict (col,id) do update set data=excluded.data, deleted=excluded.deleted$q$), 'ok');
select pg_temp.expect('clerk upsert cannot overwrite an EXISTING doc', pg_temp.try($q$insert into records(col,id,data,deleted) values('docs','gr9','{"type":"IN","by":"00000000-0000-0000-0000-0000000000c1","x":2}',false) on conflict (col,id) do update set data=excluded.data, deleted=excluded.deleted$q$), 'err:42501');
select pg_temp.expect('clerk touch_seen works', pg_temp.try($q$select touch_seen()$q$), 'ok');
select pg_temp.expect('touch_seen only own row', (select count(*)::text from profiles where last_seen is not null), '1');

-- viewer
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect('viewer reads', (select count(*)::text from records where col='docs'), '4');
select pg_temp.expect('viewer cannot insert doc', pg_temp.try($q$insert into records(col,id,data) values('docs','v1','{"type":"IN","by":"00000000-0000-0000-0000-0000000000d1"}')$q$), 'err:42501');

-- admin
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('admin writes settings', pg_temp.try($q$insert into records(col,id,data) values('settings','main','{"orgName":"x"}')$q$), 'ok');
select pg_temp.expect('admin approves user', pg_temp.try($q$update profiles set role='clerk' where id='00000000-0000-0000-0000-0000000000e1'$q$), 'ok');
select pg_temp.expect('admin tombstones doc', pg_temp.try($q$update records set deleted=true,data='{}' where col='docs' and id='gr1'$q$), 'ok');
select pg_temp.expect('updated_at/updated_by are server stamped', (select (updated_by='00000000-0000-0000-0000-0000000000a1')::text from records where col='docs' and id='gr1'), 'true');
select pg_temp.expect('admin cannot demote last admin', pg_temp.try($q$update profiles set role='viewer' where id='00000000-0000-0000-0000-0000000000a1'$q$), 'err:42501');
select pg_temp.expect('admin can promote second admin', pg_temp.try($q$update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000b1'$q$), 'ok');
select pg_temp.expect('admin can now demote self', pg_temp.try($q$update profiles set role='manager' where id='00000000-0000-0000-0000-0000000000a1'$q$), 'ok');

-- anon
select pg_temp.as_admin_sql();
set role anon;
select pg_temp.expect('anon cannot read records', pg_temp.try($q$select * from records$q$), 'err:42501');
select pg_temp.expect('anon cannot read profiles', pg_temp.try($q$select * from profiles$q$), 'err:42501');
reset role;
-- storage policies
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('clerk cannot upload photo', pg_temp.try($q$insert into storage.objects(bucket_id,name) values('photos','x.jpg')$q$), 'err:42501');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('manager (now admin) uploads photo', pg_temp.try($q$insert into storage.objects(bucket_id,name) values('photos','x.jpg')$q$), 'ok');
select pg_temp.expect('manager cannot upload to other bucket', pg_temp.try($q$insert into storage.objects(bucket_id,name) values('private','x.jpg')$q$), 'err:42501');
