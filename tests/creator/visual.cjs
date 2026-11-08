/** Mocked transport UI regression only. SQL behavior is covered on real local PostgreSQL. */
const { build } = require('esbuild');
const { chromium } = require('../../docs/design-preview/node_modules/playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const http = require('node:http'), fs = require('node:fs'), assert = require('node:assert/strict');
(async()=>{
 const dir=process.env.GLAM_CREATOR_ARTIFACTS||'/tmp/glam-creator-ui'; fs.mkdirSync(dir,{recursive:true});
 const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import CreatorStudio from './apps/web/components/CreatorStudio';import './apps/web/app/styles.css';import './apps/web/app/golden-tokens.css';createRoot(document.getElementById('root')).render(<main style={{maxWidth:800,margin:'auto',padding:20}}><h1>GLAM Beauty</h1><CreatorStudio token='fixture-token'/></main>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'/tmp/glam-creator-bundle',jsx:'automatic',external:['/images/*'],define:{'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':'"ui-fixture-public-key"','process.env.NODE_ENV':'"production"'}});
 const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text,css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type',q.url==='/app.js'?'application/javascript':q.url==='/app.css'?'text/css':'text/html');r.end(q.url==='/app.js'?js:q.url==='/app.css'?css:'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLAM Beauty Creator UI test</title><link rel="stylesheet" href="/app.css"></head><body><p style="text-align:center">UI test · simulated records · no social API connection</p><div id="root"></div><script src="/app.js"></script></body></html>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); let browser;
 const result={checks:[],evidence:'Browser emulation with intercepted HTTP; not native devices or live providers'};
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}); const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state={profile:null,connections:[],media:[],collections:[],oauth_available:false,posting_available:false,payouts_available:false};let failure=false;
  await page.route('https://**/*',async route=>{const q=route.request(),url=new URL(q.url());assert.equal(url.origin,'https://bkkmsbxrxkqaveymcrgi.supabase.co');assert.equal(q.headers().authorization,'Bearer fixture-token');
   if(failure)return route.fulfill({status:503,contentType:'application/json',body:'{}'});
   const path=url.pathname.split('/v1/me/creator')[1],body=q.postDataJSON();let response=state;
   if(q.method()==='POST'){
    if(path==='/profile')response=state.profile={...body,id:'profile-fixture',status:'draft',revision:1};
    if(path==='/connections'){response={...body,id:'connection-fixture',status:'manual_unverified'};state.connections=[response];}
    if(path==='/media'){response={...body,id:'media-fixture',publication_status:'draft'};state.media=[response];}
    if(path==='/collections'){response={...body,id:'collection-fixture',status:'draft'};state.collections=[response];}
   }
   if(q.method()==='DELETE'){if(path.startsWith('/media/'))state.media=[];if(path.startsWith('/collections/'))state.collections=[];if(path.startsWith('/connections/'))state.connections=[];return route.fulfill({status:204});}
   await route.fulfill({status:q.method()==='POST'?201:200,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.goto('http://127.0.0.1:'+server.address().port);await page.getByLabel('Creator handle').fill('fixture_creator');await page.getByLabel('Creator display name').fill('Preview Creator');await page.getByRole('button',{name:'Save private creator profile',exact:true}).click();await page.getByRole('heading',{name:'Social profiles'}).waitFor();
  await page.getByLabel('Public social profile URL').fill('https://www.tiktok.com/@fixture');await page.getByRole('button',{name:'Save unverified profile link',exact:true}).click();await page.getByText('Manual · unverified',{exact:false}).waitFor();result.checks.push('Profile save and manual link labeling');
  await page.getByLabel('Content title',{exact:true}).fill('Preview beauty story');await page.getByLabel('Public tiktok content URL').fill('https://www.tiktok.com/@fixture/video/123');await page.getByLabel('I own this content or have permission to use it.').check();await page.getByRole('button',{name:'Save portfolio draft',exact:true}).click();await page.getByRole('heading',{name:'Preview beauty story'}).waitFor();
  await page.getByLabel('Collection title',{exact:true}).fill('Preview rose edit');await page.getByLabel('This collection is sponsored').check();await page.getByLabel('Sponsorship disclosure').fill('Sponsored by fixture');await page.getByLabel('I have the rights to this collection.').check();await page.getByRole('button',{name:'Save private collection draft',exact:true}).click();await page.getByRole('heading',{name:'Preview rose edit'}).waitFor();result.checks.push('Rights and sponsorship forms save private drafts');
  for(const [name,width] of [['desktop',1440],['mobile',390],['compact',320]]){
   await page.setViewportSize({width,height:1000});await page.screenshot({path:dir+'/'+name+'.png',fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[]);result.checks.push(name+': no horizontal overflow; automated WCAG A/AA checks pass');
  }
  await page.getByRole('button',{name:'Delete Preview beauty story',exact:true}).click();await page.getByRole('heading',{name:'Preview beauty story'}).waitFor({state:'detached'});result.checks.push('Owned draft deletion');
  failure=true;await page.reload();await page.getByText('Creator Studio is unavailable. No save is confirmed.').waitFor();assert.equal(await page.getByText('Preview rose edit',{exact:true}).count(),0);result.checks.push('Unavailable service clears previous records and reports failure');
  assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/report.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
