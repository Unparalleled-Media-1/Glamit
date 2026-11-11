/** Exercise the real session + analysis hooks. File/OS/network ports are isolated doubles. */
const React = require('react'), Renderer = require('react-test-renderer'), { act } = React;
const { build } = require('esbuild'), Module = require('node:module'), assert = require('node:assert/strict');
global.IS_REACT_ACT_ENVIRONMENT = true;
(async () => {
  for (const platform of ['ios', 'android']) {
    const calls = [], listeners = new Set();
    const permissions = { eligible: true, storage: { granted: true, policy: { id: 'storage-fixture' } }, analysis: { granted: true, policy: { id: 'analysis-fixture' } } };
    let deferred, signal;
    const client = {
      analysisPermissions: async currentSignal => { calls.push('permissions'); signal = currentSignal; return deferred ? deferred.promise : permissions; },
      analysisPassport: async () => { calls.push('passport'); return { revision: 0, analysis: null, analysis_state: 'none' }; },
      analysisStatus: async () => ({state:'CONNECTED'}), analysisJobs: async () => [], consent: async (id, action) => { calls.push(id + ':' + action); },
    };
    class CaptureFiles { photo = null; fail = false; clear() { this.photo = null; calls.push('clear'); return !this.fail; } }
    global.__sessionPorts = { client, CaptureFiles, sdk: { Platform: { OS: platform }, AppState: { addEventListener: (_, listener) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; } }, StyleSheet: { create: s => s } } };
    const output = await build({ entryPoints: ['apps/mobile/analyze/use-analyze-session.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react','react/jsx-runtime'], plugins: [{ name: 'isolated-session-ports', setup(b) {
      b.onResolve({ filter: /^(react-native|expo-file-system|expo-crypto)$|\/private-media$|^\.\/capture-photo$/ }, a => ({ path: a.path, namespace: 'ports' }));
      b.onLoad({ filter: /.*/, namespace: 'ports' }, a => ({ loader: 'js', contents: a.path === 'react-native' ? 'module.exports=global.__sessionPorts.sdk' : a.path === 'expo-file-system' ? 'exports.File=class{async arrayBuffer(){return new Uint8Array([255,216,255,0,0,0,0,0]).buffer}}' : a.path === 'expo-crypto' ? 'exports.randomUUID=()=>require("node:crypto").randomUUID()' : a.path.endsWith('capture-photo') ? 'exports.CaptureFiles=global.__sessionPorts.CaptureFiles' : 'exports.nativePrivateMedia=()=>global.__sessionPorts.client;exports.PrivateMediaError=class extends Error{}' }));
    } }] });
    const file = process.cwd() + '/session-fixture.cjs', m = new Module(file, module); m.filename = file; m.paths = module.paths; m._compile(output.outputFiles[0].text, file);
    let flow, view; const account = { token: 'isolated-fixture-only', profile: { id: 'owner-a' } };
    function Probe({ account }) { flow = m.exports.useAnalyzeSession(account); return null; }
    await act(async () => { view = Renderer.create(React.createElement(Probe, { account })); });
    const select = async () => act(async () => { const photo = { uri: 'file:///test-owned/photo', width: 800, height: 900, bytes: 8 }; flow.files.photo = photo; flow.selectPhoto(photo); flow.selectGoals(['Everyday polish']); });
    await select(); assert.equal((await flow.readPhoto()).byteLength, 8); assert(!calls.includes('permissions'), 'Selecting photo/goals must never call processing APIs');
    const mediaKeys=[],jobKeys=[];let loseResponse=true;
    client.uploadPhoto=async(_,key)=>{mediaKeys.push(key);return{id:'isolated-media',state:'ready'}};
    client.submitAnalysis=async(_,key)=>{jobKeys.push(key);if(loseResponse){loseResponse=false;throw Error('isolated lost response')}return{id:'isolated-job',state:'queued'}};
    await act(async()=>flow.operations.upload());assert(flow.operations.state.error);
    await act(async()=>flow.operations.upload());assert.equal(flow.operations.state.job.state,'queued');
    assert.equal(mediaKeys.length,2);assert.equal(new Set(mediaKeys).size,1);assert.equal(new Set(jobKeys).size,1,'Ambiguous explicit retry must keep the original job key');
    await act(async () => flow.withdraw());
    assert(calls.includes('storage-fixture:withdrawn') && calls.includes('analysis-fixture:withdrawn'), 'Clearing the photo must not abort withdrawal');
    assert.equal(flow.photo, null); assert.equal(flow.operations.state.consentUnknown, false);
    await select(); let release; deferred = { promise: new Promise(resolve => { release = resolve; }) };
    let pending; await act(async () => { pending = flow.operations.reload(); });
    assert.equal(signal.aborted, false); const before = calls.filter(c => c === 'passport').length;
    await act(async () => { for (const listener of listeners) listener('background'); });
    assert.equal(signal.aborted, true); assert.equal(flow.photo, null);
    await act(async () => { release(permissions); await pending; }); deferred = null;
    assert.equal(calls.filter(c => c === 'passport').length, before, 'Late background response must not continue private reads');
    await select(); await act(async () => view.update(React.createElement(Probe, { account: { ...account, token: 'other-fixture-session', profile: { id: 'owner-b' } } })));
    assert.equal(flow.photo, null); assert.equal(flow.files.photo, null); assert.equal(flow.goals.length, 0);
    flow.files.fail = true; await act(async () => flow.clear()); assert.equal(flow.cleanupFailed, true);
    flow.files.fail = false; await act(async () => flow.clear()); assert.equal(flow.cleanupFailed, false);
    await act(async () => view.unmount()); assert.equal(listeners.size, 0);
    console.log(`PASS ${platform}: session no-auto-processing, ambiguous submission original-key retry, withdrawal after photo reset, background abort/late-response fence, identity reset and cleanup retry (OS/network doubled)`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
