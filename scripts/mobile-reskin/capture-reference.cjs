/** Render approved HTML only as a reference. Output is never native-device evidence. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('../../docs/design-preview/node_modules/playwright');
const [source, destination, theme = 'dark', platform = 'ios', state = 'default'] = process.argv.slice(2);
if (!source || !destination || !['dark', 'light'].includes(theme) || !['ios', 'android'].includes(platform) || !['default', 'loading', 'empty', 'error'].includes(state)) throw Error('Usage: node capture-reference.cjs standalone.html output-dir [dark|light] [ios|android] [default|loading|empty|error]');
(async () => {
  const html = fs.readFileSync(source), out = path.resolve(destination);
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => { if (!req.url.startsWith('/reference')) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => { const url = new URL(route.request().url()); return ['data:', 'blob:'].includes(url.protocol) || url.hostname === '127.0.0.1' ? route.continue() : route.abort(); });
    await page.goto(`http://127.0.0.1:${server.address().port}/reference?theme=${theme}&plat=${platform}&state=${state}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForFunction(() => window.SC?.length === 233, { timeout: 90000 });
    await page.locator('.lab').last().waitFor();
    await page.evaluate(() => {
      // Remove only the illustrative phone frame, not any screen content.
      for (const frame of document.querySelectorAll('.g')) { frame.style.borderWidth = '0'; frame.style.borderRadius = '0'; }
    });
    await page.waitForTimeout(1000);
    const labels = page.locator('.lab'); const ids = [];
    for (let i = 0; i < await labels.count(); i++) {
      const label = labels.nth(i), name = await label.innerText();
      const id = name.split(' · ')[0]; if (id === 'Design system') continue;
      if (!/^(home|GL-\d{3}|TP-\d{2}|FB-\d{2})$/.test(id)) throw Error('Unrecognized reference ID '+id);
      const frame = label.locator('..').locator('.g').first();
      await frame.screenshot({ path: path.join(out, id + '.png'), animations: 'disabled', timeout: 30000 });
      ids.push(id);
    }
    if (ids.length !== 232 || new Set(ids).size !== 232 || errors.length) throw Error(JSON.stringify({ frames: ids.length, errors }));
    fs.writeFileSync(path.join(out, 'reference-manifest.json'), JSON.stringify({ type: 'approved HTML reference, not native evidence', source_sha256: crypto.createHash('sha256').update(html).digest('hex'), theme, platform, state, viewport: { width: 390, height: 844 }, exclusions: ['illustrative black phone border and rounded device frame'], ids, errors }, null, 2)+'\n');
    console.log(`Captured ${ids.length} approved reference frames: ${theme}/${platform}/${state}; no native verification claim.`);
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
