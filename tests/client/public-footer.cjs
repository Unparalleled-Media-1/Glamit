/** Website DOM/link/accessibility regression. Never native-device or live-provider evidence. */
const { chromium } = require('../../docs/design-preview/node_modules/playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { buildSync } = require('esbuild'), os = require('node:os');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'glam-footer-'));
buildSync({ entryPoints: ['packages/product/public-site.ts'], bundle: true, platform: 'node', outfile: path.join(temporary, 'config.cjs') });
const { checkedPublicLink, publicSite, publicPageLinks, businessPageLinks } = require(path.join(temporary, 'config.cjs'));
assert.equal(publicSite.email, 'hello@glamit.beauty');
assert.equal(publicSite.operator, 'Zanzu Technologies Inc.');
assert.equal(publicSite.iosUrl, null); assert.equal(publicSite.androidUrl, null);
assert(publicSite.social.every(s => s.url === null), 'Unconfirmed profiles must not be invented');
for (const [kind, url] of [
  ['Instagram','https://instagram.com/'], ['Instagram','https://instagram.com.evil.invalid/glam'],
  ['Facebook','javascript:alert(1)'], ['TikTok','https://user:password@tiktok.com/@glam'],
  ['ios','https://apps.apple.com/'], ['ios','https://apps.apple.com/app/id123?token=private'],
  ['android','https://play.google.com/store/apps/details?id=com.example.app&token=private'],
]) assert.throws(() => checkedPublicLink(kind, url));
assert.equal(checkedPublicLink('ios', 'https://apps.apple.com/us/app/example/id1234567890'), 'https://apps.apple.com/us/app/example/id1234567890');
assert.equal(checkedPublicLink('android', 'https://play.google.com/store/apps/details?id=com.example.fixture'), 'https://play.google.com/store/apps/details?id=com.example.fixture');

(async () => {
  let server, browser;
  const errors = [], external = [], accessibilityChecks = [];
  let origin = process.env.GLAM_PUBLIC_TEST_ORIGIN, base = '';
  try {
    if (!origin) {
      base = '/Glamit/app'; const root = path.resolve('dist/interactive-preview');
      server = http.createServer((req,res) => {
        const pathname = new URL(req.url,'http://localhost').pathname;
        if (!pathname.startsWith('/Glamit/')) { res.writeHead(404); return res.end(); }
        let file = path.resolve(root, decodeURIComponent(pathname.slice('/Glamit/'.length)));
        if (!file.startsWith(root + path.sep)) { res.writeHead(404); return res.end(); }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
        if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', ({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(file)] || 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
      await new Promise(r => server.listen(0,'127.0.0.1',r)); origin = 'http://127.0.0.1:' + server.address().port;
    }
    browser = await chromium.launch({ executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args:['--no-sandbox'] });
    const context = await browser.newContext({ viewport:{width:1440,height:1000} });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (!/^(data|blob):/.test(r.url()) && new URL(r.url()).origin !== origin) external.push(new URL(r.url()).origin); });
    const output = process.env.GLAM_PUBLIC_EVIDENCE || '/tmp/glam-public-footer'; fs.mkdirSync(output,{recursive:true});
    await page.goto(origin + base + '/');
    const footer = page.locator('.public-footer');
    await footer.getByRole('link',{name:'Terms & conditions',exact:true}).waitFor();
    const footerAxe = await new AxeBuilder({page}).include('.public-footer').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    accessibilityChecks.push({route:'home footer',engine:footerAxe.testEngine.version,violations:footerAxe.violations.map(v=>v.id)});
    assert.deepEqual(footerAxe.violations.map(v=>({id:v.id,impact:v.impact})),[], 'Footer accessibility violations');
    assert.equal(await footer.getByRole('link',{name:'hello@glamit.beauty',exact:true}).getAttribute('href'), 'mailto:hello@glamit.beauty');
    assert.equal(await footer.getByRole('img',{name:/official profile coming soon/}).count(),5);
    assert.equal(await footer.locator('a[href^="https://"]').count(),0,'No invented external profiles/store destinations');
    assert.equal(await page.locator('.site-header').getByRole('link',{name:'Get the GLAM app',exact:true}).count(),1);
    await footer.scrollIntoViewIfNeeded();
    await footer.screenshot({path:path.join(output,'desktop-footer.png')});
    for (const width of [320,360,390,412,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow at '+width);
      assert(await page.locator('.desktop-nav').isVisible() || await page.locator('.mobile-nav').isVisible(), 'Consumer navigation missing at '+width);
      const header=await page.locator('.site-header').boundingBox(), cta=await page.locator('.header-app-cta').boundingBox();
      assert(cta.y+cta.height<=header.y+header.height+1,'App CTA must fit inside header at '+width);
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => scrollTo(0,document.body.scrollHeight));
    const footerBox=await footer.boundingBox(), mobileNav=await page.locator('.mobile-nav').boundingBox();
    assert(footerBox.y+footerBox.height<=mobileNav.y+1,'Footer must scroll above the fixed mobile navigation');
    await page.screenshot({path:path.join(output,'mobile-browser-footer.png')});
    await footer.getByRole('link',{name:'Terms & conditions',exact:true}).focus();
    await page.keyboard.press('Tab');
    assert(await footer.getByRole('link',{name:'Privacy policy',exact:true}).evaluate(n => n === document.activeElement), 'Footer keyboard order');
    for (const route of publicPageLinks) {
      const response = await page.goto(origin + base + '/' + route.slug + '/'); assert.equal(response.status(),200,route.slug);
      await page.getByRole('heading',{name:route.label,exact:true,level:1}).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Legal page overflow: '+route.slug);
      assert.equal(await page.locator('.public-footer').count(),1);
      const accessibility = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      accessibilityChecks.push({route:route.slug,engine:accessibility.testEngine.version,violations:accessibility.violations.map(v=>v.id)});
      assert.deepEqual(accessibility.violations.map(v=>({id:v.id,impact:v.impact})),[], 'Public-page accessibility: '+route.slug);
      if (['terms','privacy-policy','cookies','returns'].includes(route.slug)) assert(await page.getByText('Draft for operator review',{exact:true}).isVisible());
      if (route.slug === 'pricing') {
        await page.getByText('US$1.50 per month',{exact:true}).waitFor();
        await page.getByText('US$15.00 per year',{exact:true}).waitFor();
        assert(await page.getByText('Save US$3.00 compared with 12 monthly payments.',{exact:true}).isVisible());
        assert(await page.getByRole('heading',{name:'Refer a friend, get a month free',exact:true}).isVisible());
        assert(await page.getByText(/Rewards accumulate: refer 3 people, earn 3 free months/).isVisible());
        assert(await page.getByText(/after their first successful subscription payment/).isVisible());
        assert(await page.getByText(/Subscription purchase and card saving are not available yet/).isVisible());
        assert.equal(await page.getByRole('link',{name:'Check app availability',exact:true}).getAttribute('href'),base+'/get-app');
        assert.equal(await page.locator('input[autocomplete="cc-number"], input[autocomplete="cc-csc"]').count(),0);
        for(const width of [390,1440]) {
          await page.setViewportSize({width,height:900});
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Pricing overflow at '+width);
          await page.screenshot({path:path.join(output,'subscription-pricing-'+width+'.png'),fullPage:true});
        }
        await page.setViewportSize({width:390,height:844});
      }
      if (route.slug === 'get-app') {
        assert.equal(await page.locator('main .public-store-pending').count(),2);
        const fallback=page.getByRole('link',{name:'Continue exploring on the web',exact:true});
        assert.equal(await fallback.getAttribute('href'),base+'/analyze');
        await page.screenshot({path:path.join(output,'mobile-browser-get-app.png'),fullPage:true});
      }
    }
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      for (const business of businessPageLinks) {
        await page.goto(origin+base+'/');
        await page.locator('.public-footer').getByRole('link',{name:business.label,exact:true}).click();
        await page.getByRole('heading',{name:business.title,level:1}).waitFor();
        assert(new URL(page.url()).pathname.replace(/\/$/,'').endsWith('/'+business.slug));
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Business page overflow: '+business.slug);
        const login=page.getByRole('link',{name:'Sign in for '+business.label.toLowerCase(),exact:true});
        assert.equal(await login.getAttribute('href'),base+'/business/login');
        const registration=page.locator('main').getByRole('link',{name:'Register your business account',exact:true});
        assert.equal(await registration.getAttribute('href'),base+'/business/register');
        await login.click();
        assert(new URL(page.url()).pathname.replace(/\/$/,'').endsWith('/business/login'));
        await page.getByRole('heading',{name:'Sign in to your business workspace',level:1}).waitFor();
        await page.goto(origin+base+'/'+business.slug+'/');
        await page.getByRole('heading',{name:business.title,level:1}).waitFor();
        await page.locator('main').getByRole('link',{name:'Register your business account',exact:true}).click();
        await page.getByRole('heading',{name:'Create your GLAM Beauty account',level:1}).waitFor();
        await page.goto(origin+base+'/'+business.slug+'/');
        const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        assert.deepEqual(accessibility.violations.map(v=>({id:v.id,impact:v.impact})),[],'Business-page accessibility: '+business.slug);
      }
    }
    await page.goto(origin+base+'/contact/');
    await page.screenshot({path:path.join(output,'mobile-browser-contact.png'),fullPage:true});
    await page.goto(origin+base+'/privacy/');
    assert.equal(await page.locator('.public-app-prompt').count(),0,'Privacy access must not require an app prompt');
    if (!base) {
      await page.goto(origin+'/');
      await page.evaluate(() => { window.__publicNavigationMarker = 'same-document'; });
      await page.locator('.public-footer').getByRole('link',{name:'Privacy & data controls',exact:true}).click();
      await page.getByRole('heading',{name:'Private by default.',exact:true}).waitFor();
      assert.equal(await page.evaluate(() => window.__publicNavigationMarker), 'same-document');
      await page.locator('.public-footer').getByRole('link',{name:'Terms & conditions',exact:true}).click();
      await page.getByRole('heading',{name:'Terms & conditions',level:1}).waitFor();
      assert.equal(await page.evaluate(() => window.__publicNavigationMarker), 'same-document');
      await page.waitForFunction(() => document.activeElement.tagName === 'MAIN' && scrollY === 0);
      await page.locator('.public-footer').getByRole('link',{name:'Business portal',exact:true}).click();
      await page.waitForURL('**/business');
      assert.equal(await page.evaluate(() => window.__publicNavigationMarker), 'same-document', 'Preserve the existing in-memory sign-in handoff');
      for (const route of ['/login','/business','/business/login','/admin/login']) {
        await page.goto(origin+route); await page.locator('.public-footer').waitFor();
        assert.equal(await page.locator('.public-footer').count(),1,'Shared footer on '+route);
        if(route.startsWith('/admin')) assert.equal(await page.locator('.public-footer').getByRole('link',{name:/Register/}).count(),0,'No registration entry on staff pages');
        assert(!page.url().includes('/get-app'),'Business/Auth must remain available on web');
      }
    }
    assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({scope:'website browser only',nativeDevice:false,routes:publicPageLinks.map(r=>r.slug),widths:[320,360,390,412,768,1024,1440],email:publicSite.email,accessibilityChecks,consoleErrors:errors,externalRequests:external,sameDocumentBusinessHandoff:!base},null,2));
    console.log('PASS website public footer/routes, approved contact, legal draft disclosure, social/store pending states, app-first CTA/web fallback, keyboard order, 320–1440px overflow and protected business/Auth entry; no external requests. Browser evidence only.');
  } finally { if(browser)await browser.close(); if(server)await new Promise(r=>server.close(r)); fs.rmSync(temporary,{recursive:true,force:true}); }
})().catch(e=>{console.error(e);process.exitCode=1});
