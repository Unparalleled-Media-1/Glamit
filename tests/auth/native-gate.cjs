/** State-machine regression with isolated native/Auth doubles; not hardware verification. */
const React = require("react"),
  Renderer = require("react-test-renderer"),
  { act } = React;
const { build } = require("esbuild"),
  Module = require("node:module"),
  assert = require("node:assert/strict");
global.IS_REACT_ACT_ENVIRONMENT = true;
(async () => {
  let listener,
    appListener,
    controller,
    view,
    presence = false,
    refreshes = 0,
    requests = 0;
  const id = "a79fd2ad-c836-4b0e-b588-58d803d44a29";
  const session = (sid) => ({
    access_token: "e30." +
      Buffer.from(JSON.stringify({ sub: id, session_id: sid })).toString(
        "base64url",
      ) + ".fixture",
    refresh_token: "protected-fixture",
    user: { id },
  });
  const initial = session("294ad655-ea94-4124-a5c3-73eb2405ba5c");
  const client = {
    auth: {
      onAuthStateChange(cb) {
        listener = cb;
        return {
          data: {
            subscription: {
              unsubscribe() {
                listener = null;
              },
            },
          },
        };
      },
      startAutoRefresh() {},
      stopAutoRefresh() {},
      getUser: async () => ({ data: { user: { id } }, error: null }),
      refreshSession: async () => {
        refreshes++;
        listener?.("TOKEN_REFRESHED", initial);
        return { data: { session: initial }, error: null };
      },
      signOut: async () => {
        listener?.("SIGNED_OUT", null);
        return { error: null };
      },
    },
  };
  global.__nativeGate = {
    client,
    enabled: async () => true,
    unlock: async () => {
      if (!presence) throw Error("cancelled");
      return "protected-fixture";
    },
    forget: async () => {},
    rotate: async () => {},
    clear() {},
    AppState: {
      currentState: "active",
      addEventListener(_, cb) {
        appListener = cb;
        return {
          remove() {
            appListener = null;
          },
        };
      },
    },
    Linking: { getInitialURL: async () => null },
  };
  const result = await build({
    entryPoints: ["apps/mobile/auth/use-native-account.ts"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    external: ["react"],
    define: { "process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY": '"public-fixture"' },
    plugins: [{
      name: "native-gate-doubles",
      setup(b) {
        b.onResolve(
          { filter: /^react-native$|^\.\/secure-session$/ },
          (a) => ({ path: a.path, namespace: "gate-fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "gate-fixture" }, (a) => ({
          loader: "js",
          contents: a.path === "react-native"
            ? "export const AppState=global.__nativeGate.AppState,Linking=global.__nativeGate.Linking;"
            : "export const createNativeAuth=()=>global.__nativeGate.client,biometricEnabled=global.__nativeGate.enabled,unlockBiometricSession=global.__nativeGate.unlock,forgetBiometricSession=global.__nativeGate.forget,rotateBiometricSession=global.__nativeGate.rotate,clearNativeMemory=global.__nativeGate.clear;",
        }));
      },
    }],
  });
  const m = new Module("native-gate", module);
  m.paths = module.paths;
  m._compile(result.outputFiles[0].text, "native-gate");
  global.fetch = async (url) => {
    requests++;
    return {
      ok: true,
      json: async () =>
        String(url).endsWith("/v1/me/profile")
          ? { id, display_name: "Fixture" }
          : [],
    };
  };
  function Harness() {
    controller = m.exports.useNativeAccount();
    return null;
  }
  const flush = () => new Promise(setImmediate);
  await act(async () => {
    view = Renderer.create(React.createElement(Harness));
    await flush();
  });
  assert.equal(controller.locked, true);
  assert.equal(controller.account, null);
  await act(async () => {
    listener("TOKEN_REFRESHED", initial);
    await flush();
  });
  assert.equal(requests, 0);
  await act(async () => {
    await controller.unlock();
  });
  assert.equal(refreshes, 0);
  assert.equal(controller.account, null);
  presence = true;
  await act(async () => {
    await controller.unlock();
    await flush();
  });
  assert.equal(refreshes, 1);
  assert.equal(controller.account.profile.id, id);
  await act(async () => {
    appListener("background");
    appListener("active");
    listener("TOKEN_REFRESHED", initial);
    await flush();
  });
  assert.equal(controller.locked, true);
  assert.equal(controller.account, null);
  const before = requests;
  await act(async () => {
    await controller.freshLogin();
    listener("SIGNED_IN", initial);
    await flush();
  });
  assert.equal(controller.account, null);
  assert.equal(requests, before);
  await act(async () => {
    await controller.acceptSignIn(
      session("7a7a9e34-cfb3-452c-97e6-3aacb24d2f75"),
    );
  });
  assert.equal(controller.account.profile.id, id);
  await act(async () => {
    await controller.logout();
    listener("TOKEN_REFRESHED", initial);
    await flush();
  });
  assert.equal(controller.account, null);
  await act(async () => {
    view.unmount();
  });
  console.log(
    "Native gate doubles passed: no refresh unlock without biometric proof; cancellation, background locking, fresh proof and logout reject stale events.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
