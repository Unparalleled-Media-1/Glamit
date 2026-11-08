/** Production Expo configuration must fail closed before a paid remote build. */
const { buildSync }=require('esbuild'),assert=require('node:assert/strict');
const root=process.cwd(), output='/tmp/glam-mobile-config-check.cjs';
buildSync({entryPoints:['apps/mobile/app.config.ts'],bundle:true,platform:'node',outfile:output});
const config=require(output).default;
const keys=['GLAM_BUILD_ENV','EAS_PROJECT_ID','EXPO_OWNER','GLAM_IOS_BUNDLE_IDENTIFIER','GLAM_ANDROID_PACKAGE','EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
try {
 for(const k of keys)delete process.env[k];
 const dev=config({config:{name:'GLAM Beauty',slug:'glam-ai',scheme:'glamai'}});
 assert.equal(dev.extra.supabaseProject,'bkkmsbxrxkqaveymcrgi');assert.equal(dev.scheme,'glamai');assert.equal(dev.ios.bundleIdentifier,undefined);
 process.env.GLAM_BUILD_ENV='production';assert.throws(()=>config({config:{}}),/public key is required/);
 process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_fixture_public_key_1234';assert.throws(()=>config({config:{}}),/Registered iOS\/Android identifiers/);
 Object.assign(process.env,{EAS_PROJECT_ID:'11111111-1111-4111-8111-111111111111',EXPO_OWNER:'fixture-owner',GLAM_IOS_BUNDLE_IDENTIFIER:'beauty.glam.fixture',GLAM_ANDROID_PACKAGE:'beauty.glam.fixture'});
 assert.throws(()=>config({config:{}}),/Original approved app icon and splash/);
 console.log('Mobile production build gates passed; no EAS project, signing or native build was created.');
} finally { for(const k of keys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]; }
