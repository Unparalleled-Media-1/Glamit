/** Real deployed HTTP/browser probes only. Never substitutes mocked success or mutates accounts. */
const {chromium}=require('../../docs/design-preview/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const origin=process.env.GLAM_DEPLOYED_ORIGIN||'https://glamit-web-production.up.railway.app';
 const u=new URL(origin);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||!['glamit-web-production.up.railway.app','www.glam.beauty'].includes(u.hostname))throw Error('EXPLICIT_APPROVED_DEPLOYED_ORIGIN_REQUIRED');
 const evidence=process.env.GLAM_LAUNCH_EVIDENCE||'docs/launch/evidence';
 const out=process.env.GLAM_LAUNCH_ARTIFACTS||'/workspace/artifacts/glam-launch';fs.mkdirSync(out,{recursive:true});
 const inventory=JSON.parse(fs.readFileSync(path.join(evidence,'source-inventory.json'),'utf8'));
 const report={observed_at:new Date().toISOString(),origin:u.origin,scope:'Actual deployed anonymous read-only route checks; not authenticated, AI, payment or native-device proof',status:'BLOCKED',routes:[],mutations_blocked:0,deployed_commit:null,railway_logs_available:false};
 const proxyUrl=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
 const proxy=proxyUrl?new URL(proxyUrl):null;
 let browser,context;
 try{
  browser=await chromium.launch({executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox'],...(proxy?{proxy:{server:proxy.origin,...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})});
  context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.tracing.start({screenshots:true,snapshots:true});
  await context.route('**/*',route=>{
   if(!['GET','HEAD','OPTIONS'].includes(route.request().method())){report.mutations_blocked++;return route.abort('blockedbyclient');}
   return route.continue();
  });
  const page=await context.newPage();
  try{
   const first=await page.goto(u.origin+'/',{waitUntil:'domcontentloaded',timeout:20000});
   report.initial_http_status=first?.status()||null;
   report.status=first?.ok()?'ANONYMOUS_ROUTE_PROBE_ONLY':'FAILED_INITIAL_HTTP';
  }catch(e){report.access_error=(e.message.match(/net::[A-Z_]+/)||['DEPLOYED_NAVIGATION_UNAVAILABLE'])[0];report.status='BLOCKED_ACCESS';}
  if(report.status==='BLOCKED_ACCESS')report.routes=inventory.routes.map(route=>({route,status:'BLOCKED',reason:report.access_error}));
  else for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile-web',width:390,height:844}]){
   await page.setViewportSize({width:viewport.width,height:viewport.height});
   for(const route of inventory.routes){
    try{const response=await page.goto(u.origin+route,{waitUntil:'domcontentloaded',timeout:20000});report.routes.push({route,viewport:viewport.name,http_status:response?.status()||null,status:response?.ok()?'HTTP_ROUTE_ONLY':'FAILED_HTTP'});}catch{report.routes.push({route,viewport:viewport.name,status:'BLOCKED',reason:'NAVIGATION_UNAVAILABLE'});}
   }
  }
  await page.screenshot({path:path.join(out,'deployed-access.png'),fullPage:true});
 }catch{report.status='BLOCKED_BROWSER';report.access_error='BROWSER_OR_PROXY_INITIALIZATION_FAILED';}
 finally{
  if(context)await context.tracing.stop({path:path.join(out,'deployed-access-trace.zip')}).catch(()=>{});
  await browser?.close();
  report.counts={checked:report.routes.filter(r=>r.http_status!=null).length,blocked:report.routes.filter(r=>r.status==='BLOCKED').length,passed_critical_journeys:0};
  fs.writeFileSync(path.join(evidence,'deployed-clickthrough.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,access_error:report.access_error,counts:report.counts}));
 }
})().catch(()=>{console.error('DEPLOYED_PROBE_CONFIGURATION_FAILED');process.exitCode=1;});
