/** Native Image assets derive from exactly the same vector geometry as the web marks. */
const { chromium } = require(
    "../../docs/design-preview/node_modules/playwright",
  ),
  marks = require("../../packages/auth/provider-marks.json");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const p = await browser.newPage();
    for (const [name, mark] of Object.entries(marks)) {
      const background = mark.background
        ? `<rect width="100%" height="100%" fill="${mark.background}"/>`
        : "";
      await p.setContent(
        `<style>body{margin:0}</style><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="${mark.viewBox}">${background}${
          mark.paths.map((v) => `<path d="${v.d}" fill="${v.fill}"/>`).join("")
        }</svg>`,
      );
      await p.locator("svg").screenshot({
        path: `apps/mobile/auth/assets/${name}.png`,
        omitBackground: true,
      });
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
