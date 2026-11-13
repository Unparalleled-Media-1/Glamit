# Design extraction (GLAM All Screens → Flutter data)

`apps/glam_mobile/assets/screens/{dark,light}_{ios,android}.json.gz` are generated, not hand-written. Each holds, for every
generated screen, its resolved layout (rects, colours, radii, shadows, blur, filters, text with the design's own line breaks,
sprite crops, scroll areas) at two canvas heights, plus the destination every control navigates to.

1. Serve the design project: `python3 -m http.server 8765` in the folder that contains `GLAM All Screens.html` and `ui_kits/`.
2. Install `react@18.3.1`, `react-dom@18.3.1`, `@babel/standalone@7.29.0` into `libs/` (the script maps the design's unpkg URLs to them) and Playwright.
3. `SKIP='["home","DS","GL-035",...]' THEME=dark PLAT=ios OUT=x_dark_ios.json node extract.js` (repeat for the other three variants). Hand-built screens (tabs, GL-017…034) are skipped on purpose: their sample results would be fabricated data.
4. `python3 pack.py dark_ios dark_android light_ios light_android` gzips them into the app assets.
5. Visual QA: `node shot_all.js` (design screenshots), render the Flutter screens with `render_all_shots_test.dart.txt` (rename to `.dart`, drop into `apps/glam_mobile/test`, pass `--dart-define=THEME= --dart-define=PLAT= --dart-define=OUT=`), then `python3 compare.py <dir>`.

The `scratchpad` paths inside the scripts are from the session that produced them; edit them for your machine.
