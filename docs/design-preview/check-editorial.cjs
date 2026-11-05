const { chromium } = require('playwright');
const { createPreviewServer } = require('./server.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const server = createPreviewServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const checks = [], screenshots = [], errors = [], external = [], mutations = [], popups = [], failedAssets = [];
  const frames = path.join(__dirname, 'frames'); fs.mkdirSync(frames, { recursive: true });
  let browser;
  try {
    const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('popup', p => { popups.push(p.url()); p.close(); });
    page.on('request', r => {
      if (new URL(r.url()).origin !== origin) external.push(r.url());
      if (!['GET','HEAD'].includes(r.method())) mutations.push(r.method()+' '+r.url());
    });
    page.on('response', r => { if (r.status() >= 400) failedAssets.push(r.status()+' '+r.url()); });
    const pass = name => { checks.push({ name, status: 'passed' }); console.log('PASS: '+name); };
    const close = async () => { if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); };
    const surface = async name => { await close(); await page.locator('#surface').selectOption(name); };
    const tab = async name => { await close(); await page.locator(`.bottom-nav [data-tab="${name}"]`).click(); };
    const capture = async (name, phone=false) => {
      if (phone) await page.locator('.app-main').evaluate(el => { el.scrollTop=0; });
      const file = path.join(frames, name+'.png');
      if (phone) await page.locator('.phone').screenshot({ path:file });
      else await page.screenshot({ path:file, fullPage:true });
      screenshots.push('frames/'+name+'.png');
    };
    await page.goto(origin, { waitUntil:'networkidle' });
    assert.equal((await page.locator('.phone h1').innerText()).replace(/\s+/g,' ').trim(), 'Find Your Next Look.');
    assert.deepEqual(await page.locator('.bottom-nav button').evaluateAll(nodes => nodes.map(n=>n.dataset.tab)), ['Home','Discover','Studio','Shop','Profile']);
    assert.equal(await page.locator('.bottom-nav [data-tab="AI Advisor"]').count(),0);
    assert(await page.getByRole('button',{name:'Ask GLAM',exact:true}).isVisible());
    await capture('mobile-home',true); pass('Five new mobile destinations and contextual Advisor');

    await tab('Discover'); await capture('mobile-discover',true);
    await page.locator('.phone [data-action="open-look"]').first().click();
    assert.equal(await page.locator('.look-detail-title h1').innerText(),'Quiet confidence');
    await page.getByRole('button',{name:'Try this look',exact:true}).click();
    await page.getByRole('button',{name:'Makeup',exact:true}).click();
    assert.equal(await page.locator('[data-component="Makeup"]').getAttribute('aria-pressed'),'true');
    const slider=page.getByRole('slider',{name:'Comparison slider'});
    await slider.focus(); await page.keyboard.press('End');
    assert.equal(await page.locator('#compare-line').evaluate(n=>n.style.insetInlineStart),'100%');
    const details=page.locator('.studio-bottom details');
    await details.locator('summary').click(); assert.equal(await slider.isVisible(),false);
    await details.locator('summary').click(); assert(await slider.isVisible());
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await page.locator('[data-component="Hair"]').getAttribute('aria-pressed'),'true');
    await capture('mobile-studio',true);
    await page.getByRole('button',{name:'Preview generation states'}).click();
    await page.getByRole('button',{name:'Queued / processing layout'}).click();
    assert((await page.locator('.state-card').innerText()).includes('No AI request is running'));
    await page.getByRole('button',{name:'Return to default layout'}).click();
    pass('Discover → look → Studio, collapsible controls, keyboard comparison, undo and honest loading state');

    await page.getByRole('button',{name:'Complete the Look',exact:true}).click();
    assert.equal(await page.locator('.component-line').count(),6);
    await page.getByRole('button',{name:'Lowest Total Cost',exact:true}).click();
    assert((await page.locator('.app-main').innerText()).includes('verified item, shipping, tax and full service costs'));
    await page.getByRole('button',{name:'Best Match',exact:true}).click();
    await capture('mobile-complete-look',true);
    await page.getByRole('button',{name:'Compare Offers',exact:true}).click();
    assert((await page.locator('.app-main h1').innerText()).includes('whole cost'));
    await page.getByRole('button',{name:'Review merchant handoff',exact:true}).click();
    assert(await page.getByRole('button',{name:/Open verified merchant/}).isDisabled());
    assert((await page.getByRole('dialog').innerText()).includes('No merchant is connected'));
    await page.getByRole('dialog').screenshot({path:path.join(frames,'handoff-dialog.png')});screenshots.push('frames/handoff-dialog.png');
    await close(); pass('Complete → cost comparison → blocked unverified handoff, with no fabricated totals');

    await tab('Shop'); await capture('mobile-shop',true);
    await page.getByRole('button',{name:'View details',exact:true}).first().click();
    assert((await page.getByRole('dialog').innerText()).includes('Stock'));
    assert((await page.getByRole('dialog').innerText()).includes('Unverified'));
    await page.getByRole('button',{name:'Add to look plan',exact:true}).click();
    assert.equal(await page.locator('.component-line').count(),6);
    pass('Product detail → illustrative plan without inventory, order or payment claims');

    await tab('Home');
    await page.getByRole('button',{name:'Plan an occasion',exact:true}).click();
    await page.locator('#occasion-kind').selectOption('Wedding guest');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.locator('#occasion-date').fill('2030-05-11');
    await page.locator('#occasion-place').fill('Example city');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.locator('#occasion-budget').fill('150');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    assert.equal(await page.locator('.dialog .look-card').count(),3);
    assert((await page.getByRole('dialog').innerText()).includes('No priced, time-qualified proposal'));
    await page.getByRole('dialog').screenshot({path:path.join(frames,'occasion-dialog.png')});screenshots.push('frames/occasion-dialog.png');
    const modal=page.getByRole('dialog'); await modal.focus(); await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Review look plan');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Close dialog');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Plan an occasion');
    pass('Four-step Occasion Concierge with unconfirmed-cost disclosure and modal focus containment/restoration');

    await page.getByRole('button',{name:'Ask GLAM',exact:true}).click();
    assert((await page.getByRole('dialog').innerText()).includes('only you can confirm a purchase or booking'));
    await page.getByRole('dialog').screenshot({path:path.join(frames,'advisor-dialog.png')});screenshots.push('frames/advisor-dialog.png');
    await page.getByRole('button',{name:'Preview Occasion Concierge'}).click();
    assert((await page.locator('#dialog-title').innerText()).includes('What is the moment'));
    await close();
    await tab('Profile'); await capture('mobile-profile',true);
    await page.getByRole('button',{name:/Style DNA/}).click();
    await page.getByLabel('Warm neutrals',{exact:true}).check();
    await page.getByRole('button',{name:'Clear preview choices'}).click();
    assert.equal(await page.locator('.dialog input:checked').count(),0);await close();
    assert.deepEqual((await context.storageState()).origins,[]);
    pass('Contextual Advisor, editable/clearable preview preferences and no persisted personal profile');

    await page.locator('#audience').selectOption('child'); await tab('Studio');
    assert.equal(await page.locator('.phone .photo').count(),0);
    assert(await page.getByRole('button',{name:'Guardian connection required'}).isDisabled());
    await page.getByRole('button',{name:'Ask GLAM',exact:true}).click();
    assert((await page.getByRole('dialog').innerText()).includes('curated, age-appropriate guidance'));
    await close(); await capture('mobile-child-restriction',true);
    for(const mode of ['teen','unknown']){
      await page.locator('#audience').selectOption(mode); await tab('Shop');
      assert.equal(await page.locator('.phone .product-card').count(),0);
      assert(await page.getByRole('button',{name:'Eligibility connection required'}).isDisabled());
    }
    await page.locator('#audience').selectOption('adult');
    await surface('android'); assert.equal(await page.locator('.phone').getAttribute('data-platform'),'android');await capture('android-home',true);
    pass('Restricted child/teen/unknown layouts suppress risky content and transactions; Android canvas available');

    await surface('consumer');
    assert.equal(await page.locator('.web-nav button').count(),7);
    assert.equal(await page.locator('.web-complete').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),3);
    await capture('desktop-complete-look');
    await page.locator('.web-nav [data-item="AI Studio"]').click();
    assert.equal(await page.locator('.web-studio').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),3);
    await capture('desktop-studio');
    await page.locator('.web-header [data-screen="home"]').click(); await capture('desktop-home');
    await page.locator('.web-nav [data-item="Shop the Look"]').click();
    await page.setViewportSize({width:768,height:1100});
    assert.equal(await page.locator('.web-complete').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),2);
    await capture('tablet-complete-look'); await page.setViewportSize({width:1440,height:1050});
    pass('Independent desktop Studio/Complete layouts and tablet two-column comparison');

    const modules=await page.evaluate(()=>Object.fromEntries(Object.entries(GLAM_DESIGN.workspaces).map(([k,v])=>[k,v.modules])));
    for(const [kind,names]of Object.entries(modules)){
      await surface(kind);
      const nav=page.getByRole('navigation',{name:kind+' modules'});
      assert.equal(await nav.getByRole('button').count(),names.length);
      for(const name of names){
        await nav.getByRole('button',{name,exact:true}).click();
        assert.equal(await page.locator('#module-title').innerText(),name);
        assert.equal(await nav.locator('[aria-current="page"]').count(),1);
      }
      await nav.getByRole('button',{name:names[0],exact:true}).click();await capture(kind+'-workspace');
    }
    pass('All role-specific workspace modules: merchant 11, advertiser 11, professional 10, creator 7, admin 15');

    await surface('merchant');await page.getByRole('button',{name:'Create product',exact:true}).click();
    assert(await page.getByRole('button',{name:'Publication unavailable'}).isDisabled());await close();
    await surface('advertiser'); await page.getByRole('button',{name:'Create campaign',exact:true}).click();
    const steps=await page.evaluate(()=>GLAM_DESIGN.campaignSteps);
    for(let i=0;i<steps.length-1;i++) await page.getByRole('button',{name:'Next: '+steps[i+1],exact:true}).click();
    assert(await page.getByRole('button',{name:'Launch unavailable'}).isDisabled());
    await capture('advertiser-launch-review');
    await surface('professional');await page.getByRole('button',{name:'Quote-request layout',exact:true}).click();
    await page.getByRole('button',{name:'Preview request summary',exact:true}).click();
    assert((await page.getByRole('dialog').innerText()).includes('Request not sent'));
    assert(await page.getByRole('button',{name:'Send request unavailable'}).isDisabled());await close();
    pass('Catalog publication, guided campaign launch and booking request remain evidence-gated');

    await surface('admin');
    for(const role of ['Customer Support','Finance','Read-Only Analyst','Content Editor','AI Operations','Compliance','Super Admin']){
      await page.locator('#admin-role').selectOption(role);
      assert(await page.locator('.workspace-nav button').count()>0);
      if(role==='Customer Support'){
        assert.equal(await page.locator('.workspace-nav [data-module="Commerce"]').count(),0);
        assert(!(await page.locator('.metric-grid').innerText()).includes('Recognized revenue'));
      }
    }
    await page.getByRole('button',{name:'System Configuration',exact:true}).click();
    assert((await page.locator('.workspace-main').innerText()).includes('mobile apps'));
    assert(await page.getByRole('button',{name:'Policy changes unavailable'}).isDisabled());
    pass('Seven admin role-layout variants and platform-wide controls without claiming backend authorization');

    await surface('ios');
    for(const state of ['loading','empty','error','offline','denied','success']){
      await page.locator('#state').selectOption(state);
      assert.equal(await page.locator('.state-card').getAttribute('data-kind'),state);
      if(state==='success')assert((await page.locator('.state-card').innerText()).includes('not a completed generation'));
    }
    await page.locator('#state').selectOption('default');
    await page.locator('#wireframe').check();
    assert.equal(await page.locator('.mobile-hero').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
    await capture('wireframe-mobile-home',true);
    await surface('consumer');await capture('wireframe-desktop-complete');
    await page.locator('#wireframe').uncheck();
    await surface('ios');await page.locator('#rtl').check();
    assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
    assert.equal(await page.locator('.bottom-nav button').first().innerText(),'الرئيسية');
    await capture('rtl-mobile-home',true);await page.locator('#rtl').uncheck();
    pass('All lifecycle panels, wireframe study and explicit partial-translation RTL layout');

    for(const width of [320,390,430,768,1440,1920]){
      await page.setViewportSize({width,height:1050});
      for(const kind of ['ios','consumer','merchant','advertiser','professional','creator','admin','system']){
        await surface(kind);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),kind+' horizontal overflow at '+width);
        if(kind==='ios')assert(await page.locator('.app-head').evaluate(n=>n.scrollWidth<=n.clientWidth),'clipped phone header at '+width);
      }
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
    await page.setViewportSize({width:1440,height:1050});await surface('system');await capture('design-system');
    await surface('library');
    const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'screen-catalog.json'),'utf8'));
    const families=[...catalog.consumerFamilies,...catalog.webFamilies,...catalog.workspaceFamilies];
    assert.equal(families.length,133);assert.equal(new Set(families.map(n=>n.id)).size,133);
    assert.equal(await page.locator('#family option').count(),133);
    const libraryFrames=path.join(frames,'library');fs.mkdirSync(libraryFrames,{recursive:true});
    for(const f of families){
      await page.locator('#family').selectOption(f.id);
      assert.equal(await page.locator('.family-canvas').getAttribute('data-family'),f.id);
      assert.equal(await page.locator('#family-heading').innerText(),f.layout.heading);
      for(const label of f.layout.fields)assert((await page.locator('.family-canvas').innerText()).includes(label));
      assert(await page.locator('.family-canvas button').last().isDisabled());
      await page.locator('.family-canvas').screenshot({path:path.join(libraryFrames,f.id+'.jpg'),type:'jpeg',quality:72});
      screenshots.push('frames/library/'+f.id+'.jpg');
    }
    await page.locator('#family').selectOption('M20');await page.locator('#wireframe').check();
    assert.equal(await page.locator('.family-hero').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
    await page.locator('#wireframe').uncheck();await page.locator('#audience').selectOption('child');
    assert.equal(await page.locator('.family-canvas .photo').count(),0);
    await page.locator('#audience').selectOption('adult');
    await page.setViewportSize({width:320,height:1050});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.setViewportSize({width:1440,height:1050});
    pass('All 133 dedicated screen-family studies render their task controls; wireframes, restricted audience and narrow layout verified');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(mutations,[]);assert.deepEqual(popups,[]);assert.deepEqual(failedAssets,[]);
    pass('Responsive 320–1920px, reduced motion, no runtime/asset errors, external requests, mutations or popups');
    fs.copyFileSync(path.join(frames,'mobile-home.png'),path.join(__dirname,'mobile.png'));
    fs.copyFileSync(path.join(frames,'desktop-home.png'),path.join(__dirname,'website.png'));
    fs.copyFileSync(path.join(frames,'admin-workspace.png'),path.join(__dirname,'admin.png'));
    fs.writeFileSync(path.join(__dirname,'test-results.json'),JSON.stringify({run_at:new Date().toISOString(),checks,screenshots,limitations:['Native Figma file and native devices unverified','Role/age controls are layout demonstrations, not backend authorization','RTL is a partial localization study','AI/catalog/payment services are not connected']},null,2)+'\n');
    console.log(`${checks.length} design check groups passed; ${screenshots.length} current-run frames captured.`);
  } finally {
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e.stack);process.exit(1)});
