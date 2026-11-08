import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const probe=(key,args=['--production-web'])=>spawnSync(process.execPath,['scripts/check-browser-auth-config.mjs',...args],{encoding:'utf8',env:{...process.env,NEXT_PUBLIC_SUPABASE_ANON_KEY:key,EXPO_PUBLIC_SUPABASE_ANON_KEY:''}});
test('production web build refuses missing public configuration; local offline build still works',()=>{
 assert.notEqual(probe('').status,0);
 assert.equal(probe('',[]).status,0);
});
test('production web accepts a public fixture and rejects privileged keys without printing them',()=>{
 assert.equal(probe('sb_publishable_fixture_public_key_1234').status,0);
 const forbidden='sb_secret_never_echo_this_fixture_1234';const r=probe(forbidden);
 assert.notEqual(r.status,0);assert(!(`${r.stdout}${r.stderr}`).includes(forbidden));
});
