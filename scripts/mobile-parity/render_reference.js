// Renders the design reference (the supplied standalone atlas) at 2x for the
// requested screens, theme and platform. Typography is the bundled OFL
// substitutes (Gelasio for Georgia, Arimo for Arial) so reference and native
// builds use the same font files; see docs/mobile-parity/FONT_SUBSTITUTION.md.
//   node render_reference.js <atlas.html> <fonts-dir> <out-dir> [ids,comma] [original]
// With `original` the design's own font stack (Georgia/Arial) is left untouched. The renderer
// resolves it with whatever the host has (Georgia/Arial are NOT installed on CI runners), so this
// set shows the design as authored only where those fonts exist; it is reported separately.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const [atlas, fonts, out, idArg, mode] = process.argv.slice(2);
  const original = mode === 'original';
  const ids = (idArg || 'home,GL-017,GL-035,GL-069,GL-117').split(',');
  fs.mkdirSync(out, { recursive: true });
  const f = (n) => 'file://' + path.resolve(fonts, n);
  const browser = await chromium.launch();
  const manifest = [];
  for (const theme of ['dark', 'light']) {
    for (const plat of ['ios', 'android']) {
      const page = await browser.newPage({ viewport: { width: 4400, height: 2000 }, deviceScaleFactor: 2 });
      await page.goto('file://' + path.resolve(atlas) + `?theme=${theme}&plat=${plat}&state=default`);
      if (!original) await page.addStyleTag({ content: `@font-face{font-family:'GelasioRef';src:url('${f('Gelasio.ttf')}');font-weight:400 700}@font-face{font-family:'ArimoRef';src:url('${f('Arimo.ttf')}');font-weight:400 700}:root{--font-display:'GelasioRef',serif !important;--font-body:'ArimoRef',sans-serif !important}body,.g{font-family:'ArimoRef',sans-serif}` });
      await page.waitForFunction(() => document.querySelectorAll('.g').length > 200, null, { timeout: 120000 });
      await page.waitForTimeout(8000);
      await page.evaluate(() => document.fonts.ready);
      const boxes = await page.evaluate((ids) => {
        const labs = [...document.querySelectorAll('.lab')];
        return ids.map((id) => {
          const l = labs.find((x) => x.textContent.startsWith(id + ' ·'));
          if (!l) return null;
          const r = l.parentElement.querySelector('.g').getBoundingClientRect();
          return { id, x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
        });
      }, ids);
      for (const b of boxes) {
        if (!b) throw new Error('missing reference screen');
        const file = `${b.id}_${theme}_${plat}.png`;
        await page.screenshot({ path: path.join(out, file), fullPage: true, clip: { x: b.x, y: b.y, width: b.w, height: b.h } });
        manifest.push({ id: b.id, theme, platform: plat, file, frame_css_px: [b.w, b.h], typography: original ? 'design font stack as resolved by renderer host' : 'Gelasio/Arimo substitutes' });
      }
      await page.close();
    }
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
})();
