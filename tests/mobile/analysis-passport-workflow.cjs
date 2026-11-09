/** Actual RN component -> shared HTTPS contract -> isolated FastAPI/PostgreSQL bridge.
 * OS primitives, fixture identity and provider/storage are explicitly test doubles.
 * This is NOT an installed simulator/device test or live provider verification.
 */
const React = require('react'), Renderer = require('react-test-renderer'), { act } = React;
const assert = require('node:assert/strict'), { build } = require('esbuild'), Module = require('node:module');
const { webcrypto, randomUUID } = require('node:crypto'), fs = require('node:fs');
global.IS_REACT_ACT_ENVIRONMENT = true;
const [platform, port, subject, fixturePath] = process.argv.slice(2);
assert(['ios', 'android'].includes(platform)); assert(/^\d+$/.test(port));
const text = n => typeof n === 'string' ? n : !n?.children ? '' : n.children.map(text).join(' ');
const calls = [];
global.__analysisPorts = {
  sdk: { Platform: { OS: platform }, Text: 'Text', View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', Switch: 'Switch', StyleSheet: { create: x => x } },
  crypto: { randomUUID, CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digest: (algorithm, bytes) => webcrypto.subtle.digest(algorithm, bytes) },
  async fetch(url, init) {
    assert(url.startsWith('https://native-fixture.invalid/')); // No production URL or credentials.
    calls.push({ url, method: init.method || 'GET' });
    const response = await fetch(`http://127.0.0.1:${port}${new URL(url).pathname}`, init);
    const result = new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
    if (global.__analysisPorts.holdPassport && url.endsWith('/analysis-passport') && (!init.method || init.method === 'GET')) {
      const hold=global.__analysisPorts.holdPassport; global.__analysisPorts.holdPassport=null;
      hold.enter(init.signal); await hold.wait;
    }
    return result;
  },
};
(async () => {
  const output = await build({ entryPoints: ['apps/mobile/NativeAnalysisJourney.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], plugins: [{ name: 'isolated-native-ports', setup(b) {
    b.onResolve({ filter: /^(react-native|expo\/fetch|expo-crypto)$/ }, a => ({ path: a.path, namespace: 'ports' }));
    b.onLoad({ filter: /.*/, namespace: 'ports' }, a => ({ loader: 'js', contents: a.path === 'react-native' ? 'module.exports=global.__analysisPorts.sdk' : a.path === 'expo/fetch' ? 'exports.fetch=(...args)=>global.__analysisPorts.fetch(...args)' : 'module.exports=global.__analysisPorts.crypto' }));
  } }] });
  const path = process.cwd() + '/native-analysis-fixture.cjs', m = new Module(path, module);
  m.filename = path; m.paths = module.paths; m._compile(output.outputFiles[0].text, path);
  const Card = m.exports.default, props = { account: { token: 'isolated-test-only-session', profile: { id: subject } }, apiOrigin: 'https://native-fixture.invalid',
    goals: ['Understand my features'], photoUri: 'fixture-owned-device-copy.jpg', readPhoto: async () => { const b = fs.readFileSync(fixturePath); return b.buffer.slice(b.byteOffset, b.byteOffset+b.byteLength); } };
  let view;
  const press = label => {
    const n = view.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityLabel === label);
    assert.equal(n.length, 1, 'Missing native action ' + label); assert(!n[0].props.disabled, 'Disabled native action ' + label);
    return n[0].props.onPress();
  };
  const open = async extra => { await act(async () => { view = Renderer.create(React.createElement(Card, { ...props, ...extra })); }); };
  await open({ account: null }); assert.equal(calls.length, 0); await act(async () => view.unmount());
  await open(); await act(async () => press('Reload saved analysis and passport'));
  for (const name of ['storage','analysis']) {
    const toggle=view.root.findByProps({ accessibilityLabel: `I agree to ${name}` });
    await act(async () => toggle.props.onValueChange(true));
    await act(async () => press(`Confirm ${name} permission`));
  }
  assert(text(view.toJSON()).includes('Permission confirmed'));
  const beforeGrants = calls.filter(c => c.url.includes('/consent')).length;
  await act(async () => press('Upload privately and request analysis'));
  assert(text(view.toJSON()).includes('Analysis queued'));
  assert.equal(calls.filter(c => c.url.includes('/consent')).length, beforeGrants, 'Current grants must not be renewed');
  await act(async () => press('Refresh analysis status'));
  assert(text(view.toJSON()).includes('Explicit isolated test observation only'));
  const input = view.root.findByProps({ accessibilityLabel: 'Correct Face shape' });
  await act(async () => input.props.onChangeText('User-approved fixture correction'));
  const save = view.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityLabel === 'Save analysis to Style Passport')[0];
  assert(save.props.disabled, 'Unsaved edits cannot be silently skipped');
  await act(async () => press('Save corrections'));
  assert(text(view.toJSON()).includes('Your correction revision is saved'));
  await act(async () => press('Save analysis to Style Passport'));
  assert(text(view.toJSON()).includes('Style Passport saved'));
  await act(async () => view.unmount());
  // A fresh component has no private state. It must reopen the durable server snapshot.
  await open({ photoUri: undefined, readPhoto: undefined });
  assert(!text(view.toJSON()).includes('User-approved fixture correction'));
  await act(async () => press('Reload saved analysis and passport'));
  assert(text(view.toJSON()).includes('User-approved fixture correction'));
  assert.match(text(view.toJSON()), /AI certainty:\s+unavailable/);
  // A delayed real private response must not reappear after account changes.
  let enter, release, signal;
  const entered=new Promise(resolve=>{enter=resolve;}), wait=new Promise(resolve=>{release=resolve;});
  global.__analysisPorts.holdPassport={ enter(value){signal=value;enter();}, wait };
  let pending;
  await act(async()=>{pending=press('Reload saved analysis and passport');await entered;});
  await act(async () => view.update(React.createElement(Card, { ...props, account: null })));
  assert(signal.aborted);
  await act(async()=>{release();await pending;});
  assert(!text(view.toJSON()).includes('User-approved fixture correction'));
  await act(async () => view.unmount()); await open({ photoUri: undefined });
  await act(async () => press('Reload saved analysis and passport'));
  await act(async () => press('Withdraw photo and analysis permissions'));
  assert(text(view.toJSON()).includes('permissions withdrawn'));
  assert(!text(view.toJSON()).includes('User-approved fixture correction'));
  await act(async () => press('Reload saved analysis and passport'));
  assert(!text(view.toJSON()).includes('User-approved fixture correction'));
  await act(async () => view.unmount());
  console.log(JSON.stringify({ platform, evidence: 'native-component-fastapi-postgresql-with-test-ports', uploaded: calls.some(c => c.method === 'PUT' && c.url.includes('/content')),
    analysisSubmitted: calls.some(c => c.method === 'POST' && c.url.endsWith('/jobs')), corrected: true, savedAndReopened: true, withdrawn: true, installedDeviceVerified: false }));
})().catch(e => { console.error(e); process.exit(1); });
