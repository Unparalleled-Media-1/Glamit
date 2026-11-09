/** Real native library component + shared transport; HTTP/OS ports are explicit doubles. */
const React = require('react'), Renderer = require('react-test-renderer'), { act } = React;
const assert = require('node:assert/strict'), { build } = require('esbuild'), Module = require('node:module');
global.IS_REACT_ACT_ENVIRONMENT = true;
const text = n => typeof n === 'string' ? n : !n?.children ? '' : n.children.map(text).join(' ');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const id = '11111111-1111-4111-8111-111111111111';
const item = state => ({ id, state, content_type: 'image/png', width: state === 'deleted' ? null : 480, height: state === 'deleted' ? null : 600, stored_size: state === 'deleted' ? null : 400, created_at: '2026-11-08T10:00:00Z', expires_at: '2026-11-09T10:00:00Z', deleted_at: state === 'deleted' ? '2026-11-08T11:00:00Z' : null, last_error_code: null });
(async () => { for (const platform of ['ios', 'android']) {
  let calls = [], confirmation, pendingList, pendingDelete, failDelete = false, emptyList = false, deleteState = 'deleted', configured = true;
  const fetch = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/status')) return Response.json({ state: configured ? 'CONNECTED' : 'NOT CONFIGURED', scope: 'private_media_storage' });
    if (init.method === 'DELETE') {
      if (pendingDelete) return pendingDelete.promise;
      return Response.json(failDelete ? { message: 'private provider detail' } : item(deleteState), { status: failDelete ? 503 : 200 });
    }
    assert(url.endsWith('/v1/media'));
    return pendingList ? pendingList.promise : Response.json(emptyList ? [] : [item('ready')]);
  };
  global.__glamMediaLibrary = { fetch, sdk: { Platform: { OS: platform }, Text: 'Text', View: 'View', Pressable: 'Pressable', StyleSheet: { create: x => x }, Alert: { alert(_title, _body, buttons) { confirmation = buttons; } } } };
  const output = await build({ entryPoints: ['apps/mobile/NativePrivatePhotos.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], plugins: [{ name: 'native-ports', setup(b) {
    b.onResolve({ filter: /^(react-native|expo\/fetch|expo-crypto)$/ }, a => ({ path: a.path, namespace: 'ports' }));
    b.onLoad({ filter: /.*/, namespace: 'ports' }, a => ({ loader: 'js', contents: a.path === 'react-native' ? 'module.exports=global.__glamMediaLibrary.sdk' : a.path === 'expo/fetch' ? 'exports.fetch=(...args)=>global.__glamMediaLibrary.fetch(...args)' : 'exports.CryptoDigestAlgorithm={SHA256:"SHA-256"};exports.digest=()=>{throw Error("Library must never hash/upload photos")}' }));
  } }] });
  const modulePath = process.cwd() + '/native-media-library-fixture.cjs';
  const m = new Module(modulePath, module); m.filename = modulePath; m.paths = module.paths; m._compile(output.outputFiles[0].text, modulePath);
  const Card = m.exports.default, account = { token: 'alice-test-session', profile: { id: 'alice' } };
  const props = { account, apiOrigin: 'https://api.example' }; let view;
  const press = label => { const nodes = view.root.findAll(n => n.type === 'Pressable' && text(n).trim() === label); assert(nodes.length, 'Missing native action ' + label); return nodes[0].props.onPress(); };
  const open = async () => { await act(async () => { view = Renderer.create(React.createElement(Card, props)); }); await act(async () => press('Refresh private photos')); };
  await act(async () => { view = Renderer.create(React.createElement(Card, { ...props, account: null })); });
  assert(text(view.toJSON()).includes('Sign in')); assert.equal(calls.length, 0); await act(async () => view.unmount());
  await open(); assert(text(view.toJSON()).includes('Ready in private storage')); assert(calls.every(c => c.init.headers.Authorization === 'Bearer alice-test-session'));
  await act(async () => press('Delete private photo')); assert.equal(calls.filter(c => c.init.method === 'DELETE').length, 0);
  await act(async () => confirmation.find(b => b.text === 'Cancel').onPress?.()); assert(text(view.toJSON()).includes('Ready in private storage'));
  await act(async () => press('Delete private photo')); failDelete = true;
  await act(async () => confirmation.find(b => b.text === 'Delete').onPress());
  assert(text(view.toJSON()).includes('Ready in private storage')); assert(!text(view.toJSON()).includes('private provider detail'));
  failDelete = false; deleteState = 'deletion_pending';
  await act(async () => press('Delete private photo')); await act(async () => confirmation.find(b => b.text === 'Delete').onPress());
  assert(text(view.toJSON()).includes('Deletion pending')); assert(!text(view.toJSON()).includes('Deleted from private storage'));
  deleteState = 'deleted'; await act(async () => press('Retry photo deletion'));
  pendingDelete = deferred(); let deletion, duplicate;
  await act(async () => { const callback = confirmation.find(b => b.text === 'Delete').onPress; deletion = callback(); duplicate = callback(); });
  const deleteCall = calls.at(-1), deleteCount = calls.filter(c => c.init.method === 'DELETE').length;
  await act(async () => { pendingDelete.resolve(Response.json(item('deleted'))); await deletion; await duplicate; });
  assert.equal(calls.filter(c => c.init.method === 'DELETE').length, deleteCount);
  assert(text(view.toJSON()).includes('Deleted from private storage')); assert(!deleteCall.init.signal.aborted);
  await act(async () => view.unmount()); pendingDelete = null;

  await open(); await act(async () => press('Delete private photo')); const staleConfirm = confirmation.find(b => b.text === 'Delete').onPress;
  await act(async () => view.update(React.createElement(Card, { ...props, account: { token: 'bob-test-session', profile: { id: 'bob' } } })));
  const before = calls.length; await act(async () => staleConfirm()); assert.equal(calls.length, before, 'Old account confirmation must never issue a request');
  assert(!text(view.toJSON()).includes('Ready in private storage')); await act(async () => view.unmount());

  pendingList = deferred(); await act(async () => { view = Renderer.create(React.createElement(Card, props)); }); let listing;
  await act(async () => { listing = press('Refresh private photos'); });
  const listCall = calls.at(-1); await act(async () => view.update(React.createElement(Card, { ...props, account: null })));
  assert(listCall.init.signal.aborted);
  await act(async () => { pendingList.resolve(Response.json([item('ready')])); await listing; });
  assert(!text(view.toJSON()).includes('Ready in private storage')); await act(async () => view.unmount()); pendingList = null;

  pendingList = deferred(); await act(async () => { view = Renderer.create(React.createElement(Card, props)); });
  await act(async () => { listing = press('Refresh private photos'); });
  const stoppedRequest = calls.at(-1); await act(async () => press('Stop waiting')); assert(stoppedRequest.init.signal.aborted);
  await act(async () => { pendingList.resolve(Response.json([item('ready')])); await listing; });
  assert(!text(view.toJSON()).includes('Ready in private storage')); assert(text(view.toJSON()).includes('Refresh to confirm server state'));
  await act(async () => view.unmount()); pendingList = null;

  pendingList = deferred(); await act(async () => { view = Renderer.create(React.createElement(Card, props)); });
  await act(async () => { listing = press('Refresh private photos'); });
  const unmountedRequest = calls.at(-1); await act(async () => view.unmount()); assert(unmountedRequest.init.signal.aborted);
  await act(async () => { pendingList.resolve(Response.json([item('ready')])); await listing; }); pendingList = null;

  emptyList = true; await open(); assert(text(view.toJSON()).includes('No private photos were returned for this account')); await act(async () => view.unmount()); emptyList = false;

  configured = false; await open(); assert(text(view.toJSON()).includes('NOT CONFIGURED')); assert(!text(view.toJSON()).includes('No private photos')); await act(async () => view.unmount());
  console.log('PASS ' + platform + ' actual native private-library controls: authenticated reload, explicit deletion confirmation, failed/pending/confirmed states, duplicate lock, account and cancellation fences (OS/HTTP doubled)');
} delete global.__glamMediaLibrary; })().catch(e => { console.error(e); process.exitCode = 1; });
