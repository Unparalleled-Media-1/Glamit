const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

(async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const errors = [], external = [];
  try {
    const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (new URL(r.url()).origin !== origin) external.push(r.url()); });
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert(await page.locator('#web').isVisible());
    assert.equal((await page.locator('#web h1').innerText()).replace(/\s+/g, ' ').trim(), 'Every Look. Every Style. Everyone.');
    assert((await page.locator('#web').innerText()).includes('Style DNA'));
    assert.equal(await page.locator('#web button:disabled').count(), 2);
    await page.screenshot({ path: path.join(__dirname, 'website.png'), fullPage: true });
    await page.getByRole('button', { name: 'Mobile app', exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Mobile bottom navigation' });
    const titles = { Home: 'Every Look. Every Style. Everyone.', Analyze: 'Your style. Your boundaries.', Studio: 'Your own style studio.', 'AI Advisor': "A plan for your occasion.", Profile: 'Your account. Your choices.' };
    for (const [tab, title] of Object.entries(titles)) {
      await nav.getByRole('button', { name: tab, exact: true }).click();
      assert.equal(await nav.locator('[aria-pressed=true]').count(), 1);
      assert.equal((await page.locator('.mobile-title').innerText()).replace(/\s+/g, ' ').trim(), title);
      if (tab === 'Profile') assert((await page.locator('#mobile-content').innerText()).includes('Style DNA and learning controls'));
      if (tab === 'AI Advisor') assert((await page.locator('#mobile-content').innerText()).includes('only you can confirm a purchase or booking'));
    }
    await nav.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: 'Explore Analyze' }).click();
    assert.equal(await nav.getByRole('button', { name: 'Analyze', exact: true }).getAttribute('aria-pressed'), 'true');
    await nav.getByRole('button', { name: 'Home', exact: true }).click();
    await page.setViewportSize({ width: 430, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(__dirname, 'mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.getByRole('button', { name: 'Web /admin', exact: true }).click();
    const admin = page.getByRole('navigation', { name: 'Admin modules' });
    assert.equal(await admin.getByRole('button').count(), 16);
    for (let i = 0; i < 16; i++) {
      const button = admin.getByRole('button').nth(i);
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await admin.locator('[aria-pressed=true]').count(), 1);
      assert.equal(await page.locator('#admin-breadcrumb').innerText(), await button.innerText());
      assert(await page.locator('#admin-title').innerText());
    }
    await admin.getByRole('button', { name: 'Mobile app controls', exact: true }).click();
    assert((await page.locator('#admin-description').innerText()).includes('minimum app versions'));
    assert((await page.locator('#admin-description').innerText()).includes('guardian policy'));
    await admin.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.screenshot({ path: path.join(__dirname, 'admin.png'), fullPage: true });
    await page.getByRole('button', { name: 'Website', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#web').isVisible());
    for (const view of ['web', 'mobile', 'admin']) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.locator(`[data-view=${view}]`).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} horizontal overflow`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log('PASS: 3 surfaces, 5 mobile tabs, Home-to-Analyze, 16 admin module selections, mobile controls, keyboard switching, disabled downloads, 390px layouts, zero runtime errors/external requests. Screenshots refreshed.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e.stack); process.exit(1); });
