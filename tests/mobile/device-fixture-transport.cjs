/** Fixture build/transport safety only; not native installed evidence. */
const assert=require('node:assert/strict'),{buildSync}=require('esbuild'),Module=require('node:module');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),crypto=require('node:crypto');
const entry='apps/mobile/index.ts',before=crypto.createHash('sha256').update(fs.readFileSync(entry)).digest('hex');
const refused=spawnSync(process.execPath,['tests/native_device/prepare-build.mjs'],{env:{...process.env,CI:'0',GLAM_BUILD_ENV:'production'},encoding:'utf8'});
assert.notEqual(refused.status,0);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(entry)).digest('hex'),before,'Refused fixture build must not alter the production entry');
const calls=[],original=global.fetch;
global.fetch=async(url,init)=>{calls.push({url,init});return Response.json({fixture:true});};
const out=buildSync({entryPoints:['tests/native_device/transport.ts'],bundle:true,write:false,platform:'node',format:'cjs'});
const m=new Module(process.cwd()+'/fixture-transport-test.cjs',module);m.filename=process.cwd()+'/fixture-transport-test.cjs';m.paths=module.paths;m._compile(out.outputFiles[0].text,m.filename);
(async()=>{
 for(const url of ['https://native-fixture.invalid/v1/me','https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1/user']){
  const result=await global.fetch(url,{headers:{Authorization:'Bearer isolated-fixture-only'}});
  assert.equal(result.url,url);assert.deepEqual(await result.json(),{fixture:true});
  assert(calls.at(-1).url.startsWith('http://127.0.0.1:8765/'));
 }
 const count=calls.length;
 for(const url of ['https://api.openai.com/v1/responses','https://evil.invalid/','http://native-fixture.invalid/','https://user:password@native-fixture.invalid/','https://native-fixture.invalid:8443/'])await assert.rejects(()=>global.fetch(url));
 assert.equal(calls.length,count,'Forbidden origins must never reach the physical transport');
 global.fetch=original;console.log('PASS fixture-only build refusal and default-deny loopback transport; not native/device evidence');
})().catch(e=>{global.fetch=original;console.error(e);process.exitCode=1;});
