import assert from "node:assert/strict";
import { createRequire } from "node:module";

const mobile = createRequire(new URL("../apps/mobile/package.json", import.meta.url));
const native = createRequire(mobile.resolve("react-native/package.json"));
const expo = createRequire(mobile.resolve("expo/package.json"));
assert.strictEqual(mobile("react"), native("react"), "Mobile and React Native must share React");
assert.strictEqual(mobile("react"), expo("react"), "Mobile and Expo must share React");

const web = createRequire(new URL("../apps/web/package.json", import.meta.url));
const dom = createRequire(web.resolve("react-dom/package.json"));
const react = web("react");
assert.strictEqual(react, dom("react"), "Web and React DOM must share React");
assert.equal(react.version, web("react-dom").version, "React and its DOM renderer must match");

function HookProbe() {
  const [value] = react.useState("runtime-ok");
  return react.createElement("span", null, value);
}
assert.equal(
  web("react-dom/server").renderToStaticMarkup(react.createElement(HookProbe)),
  "<span>runtime-ok</span>",
);
console.log("Client runtime checks passed: shared React instances and web hook rendering");
