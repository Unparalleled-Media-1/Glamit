/** Generate test-only composition; refuses regular/production builds. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const env=process.env;
if (env.CI!=='1' || env.GLAM_BUILD_ENV!=='development' ||
    env.GLAM_IOS_BUNDLE_IDENTIFIER!=='com.glambeauty.localverification' ||
    env.GLAM_ANDROID_PACKAGE!=='com.glambeauty.localverification' ||
    env.EXPO_PUBLIC_GLAM_API_ORIGIN!=='https://native-fixture.invalid' ||
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY!=='sb_publishable_nativefixture0000000000000000')
  throw Error('Only explicitly isolated CI fixture builds may use this composition');
const mobile=path.resolve('apps/mobile');
fs.mkdirSync('artifacts',{recursive:true});
if (process.argv.includes('--native-permissions')) {
  const platform=process.argv.at(-1);
  if (platform==='android') {
    const file=path.join(mobile,'android/app/src/main/AndroidManifest.xml');
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/ android:usesCleartextTraffic="[^"]*"/g,'').replace(/<application\b/, '<application android:usesCleartextTraffic="true"'));
  } else if (platform==='ios') {
    const files=fs.readdirSync(path.join(mobile,'ios'),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>path.join(mobile,'ios',d.name,'Info.plist')).filter(f=>fs.existsSync(f));
    if(files.length!==1)throw Error('Expected one isolated application Info.plist');
    execFileSync('python3',['-c',"import plistlib,sys; p=sys.argv[1]; d=plistlib.load(open(p,'rb')); d.setdefault('NSAppTransportSecurity',{}).update(NSAllowsLocalNetworking=True,NSAllowsArbitraryLoads=True); plistlib.dump(d,open(p,'wb'))",files[0]]);
  } else throw Error('Expected native test platform');
} else {
  fs.writeFileSync(path.join(mobile,'index.ts'),'import "../../tests/native_device/entry";\n');
  fs.writeFileSync(path.join(mobile,'metro.config.js'),`const {getDefaultConfig}=require('expo/metro-config');
const path=require('path');const config=getDefaultConfig(__dirname);const previous=config.resolver.resolveRequest;
config.resolver.resolveRequest=(context,name,platform)=>{const answer=previous?previous(context,name,platform):context.resolveRequest(context,name,platform);
if(answer.type==='sourceFile' && answer.filePath===path.join(__dirname,'private-media.ts'))return {...answer,filePath:path.resolve(__dirname,'../../tests/native_device/media-port.ts')};return answer;};module.exports=config;\n`);
  fs.writeFileSync('artifacts/native-fixture-build.json',JSON.stringify({fixture:true,auth:'real native SDK/hooks; isolated signed test identity service',provider:'deterministic-device-fixture-v1',source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),productionTLSQualified:false},null,2));
}
