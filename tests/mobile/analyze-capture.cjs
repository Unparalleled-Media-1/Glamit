/** Actual RN Capture handlers; OS camera/picker/filesystem are explicit test doubles.
 * This suite does not certify native binaries, hardware or installed-device behavior. */
const React = require('react');
const Renderer = require('react-test-renderer');
const { build } = require('esbuild');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { act } = React;
global.IS_REACT_ACT_ENVIRONMENT = true;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const text = node => typeof node === 'string' ? node : (node?.children || []).map(text).join(' ');

(async () => {
  const result = await build({ stdin: { contents: 'export { default } from "./apps/mobile/analyze/AnalyzeCapture"; export { CaptureFiles } from "./apps/mobile/analyze/capture-photo";', resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false,
    platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.webp': 'dataurl' }, external: ['react', 'react/jsx-runtime'],
    plugins: [{ name: 'capture-native-ports', setup(b) {
      b.onResolve({ filter: /^(react-native|react-native-safe-area-context|expo|expo-camera|expo-image-picker|expo-file-system|expo-crypto)$/ }, a => ({ path: a.path, namespace: 'ports' }));
      b.onLoad({ filter: /.*/, namespace: 'ports' }, a => ({ loader: 'js', contents: {
        'react-native': 'module.exports=global.__capturePorts.sdk',
        'react-native-safe-area-context': 'exports.useSafeAreaInsets=()=>({top:47,bottom:34,left:0,right:0})',
        'expo': 'exports.requireOptionalNativeModule=()=>global.__capturePorts.available?{}:null',
        'expo-camera': 'module.exports=global.__capturePorts.camera',
        'expo-image-picker': 'module.exports=global.__capturePorts.picker',
        'expo-file-system': 'module.exports=global.__capturePorts.fs',
        'expo-crypto': 'exports.randomUUID=()=>require("node:crypto").randomUUID()',
      }[a.path] }));
    } }] });
  let checks = 0;
  for (const platform of ['ios', 'android']) {
    let view, copies, removed, files, listeners, backs, exits, permission, selection, capture, denyDelete, failCopy;
    let permissionCalls, pickerCalls, captureCalls;
    const originalFetch = global.fetch;
    let networkCalls = 0;
    global.fetch = () => { networkCalls++; throw Error('Capture must not use the network'); };
    class File {
      constructor(...args) { this.uri = args.map(x => typeof x === 'string' ? x : x.uri).reduce((a, b) => a.replace(/\/+$/, '') + '/' + b.replace(/^\/+/, '')); }
      get exists() { return files.has(this.uri); }
      get size() { return files.get(this.uri) || 0; }
      copy(target) { files.set(target.uri, this.size); copies.push([this.uri, target.uri]); if (failCopy) throw Error('Partial copy'); }
      delete() { if (denyDelete) throw Error('Cannot erase'); removed.push(this.uri); files.delete(this.uri); }
    }
    const CameraView = React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({ takePictureAsync: async () => { captureCalls++; return capture.promise; } }));
      return React.createElement('CameraView', props);
    });
    const ports = global.__capturePorts = {
      available: true,
      camera: { CameraView, Camera: { requestCameraPermissionsAsync: async () => { permissionCalls++; return permission ? permission.promise : { granted: true }; } } },
      picker: { launchImageLibraryAsync: async options => { pickerCalls++; assert.equal(options.allowsEditing, false); assert.equal(options.exif, false); return selection ? selection.promise : { canceled: true }; } },
      fs: { File, Paths: { cache: { uri: 'file:///app/cache/' } } },
      sdk: { View: 'View', Text: 'Text', Image: 'Image', ScrollView: 'ScrollView', Pressable: 'Pressable', Switch: 'Switch', ActivityIndicator: 'ActivityIndicator',
        Platform: { OS: platform }, StyleSheet: { create: x => x, absoluteFillObject: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } },
        Linking: { openSettings: async () => { throw Error('No settings'); } },
        AppState: { currentState: 'active', addEventListener: (_, fn) => { listeners.add(fn); return { remove: () => listeners.delete(fn) }; } },
        BackHandler: { addEventListener: (_, fn) => { backs.add(fn); return { remove: () => backs.delete(fn) }; } },
      },
    };
    const compiled = new Module(process.cwd() + '/capture-fixture.cjs', module);
    compiled.filename = process.cwd() + '/capture-fixture.cjs'; compiled.paths = module.paths;
    compiled._compile(result.outputFiles[0].text, compiled.filename);
    const Capture = compiled.exports.default;
    function nodes(type) { return view.root.findAll(n => n.type === type); }
    function button(label) { const found = nodes('Pressable').filter(n => n.props.accessibilityLabel === label); assert.equal(found.length, 1, 'Missing button ' + label); return found[0]; }
    function press(label) { const node = button(label); assert(!node.props.disabled, 'Disabled ' + label); return node.props.onPress(); }
    async function open(extra = {}) {
      copies = []; removed = []; files = new Map(); listeners = new Set(); backs = new Set(); exits = 0;
      permission = selection = capture = null; denyDelete = failCopy = false; permissionCalls = pickerCalls = captureCalls = 0;
      ports.available = true; ports.sdk.AppState.currentState = 'active';
      await act(async () => { view = Renderer.create(React.createElement(Capture, { accountScope: 'account-a', onExit: () => exits++, ...extra })); });
    }
    async function close() { await act(async () => view.unmount()); assert.equal(listeners.size, 0); assert.equal(backs.size, 0); }
    async function guide() {
      await act(async () => press('Start analysis'));
      const unsupported = ['Skin appearance', 'Hair & grooming', 'Fashion & full-body styling', 'Complete transformation'];
      for (const label of unsupported) assert(button(label).props.disabled);
      await act(async () => press('Continue to goals'));
      assert(button('Continue to camera guidance').props.disabled);
      await act(async () => button('Everyday polish').props.onPress());
      await act(async () => press('Continue to camera guidance'));
      assert(button('Open camera').props.disabled);
      await act(async () => nodes('Switch')[0].props.onValueChange(true));
    }
    async function cameraReady() { await act(async () => press('Open camera')); assert(button('Capture photo').props.disabled); await act(async () => nodes('CameraView')[0].props.onCameraReady()); }
    async function appState(value) { ports.sdk.AppState.currentState = value; await act(async () => { for (const fn of [...listeners]) fn(value); }); }
    const photo = () => nodes('Image').find(n => n.props.testID === 'capture-selected-photo');
    const galleryAsset = { uri: 'file:///user/original.png', width: 800, height: 1000 };

    await open();
    assert(nodes('Image').every(n => n.props.accessibilityLabel.includes('Editorial')));
    assert.equal(permissionCalls + pickerCalls, 0);
    await guide();
    assert.equal(permissionCalls + pickerCalls, 0, 'No implicit permission dialog or source launch');
    const root = view.root.findByProps({ testID: 'native-analyze-capture' });
    assert.equal(root.props.style[1].paddingTop, 47); assert.equal(root.props.style[1].paddingBottom, 34);
    await act(async () => press('Choose from gallery')); assert.match(text(view.toJSON()), /selection cancelled/); assert(!photo());
    checks++; await close();

    await open();
    await act(async () => press('Start analysis'));
    await act(async () => press('Face & makeup')); assert.match(text(view.toJSON()), /Face & makeup is selected/);
    await act(async () => press('Continue to goals'));
    await act(async () => nodes('Switch')[0].props.onValueChange(true));
    assert(!button('Continue to camera guidance').props.disabled);
    assert(!button('Everyday polish').props.accessibilityState.checked);
    await act(async () => press('Continue to camera guidance')); checks++; await close();

    await open(); await guide(); permission = deferred(); let pending;
    await act(async () => { pending = press('Open camera'); });
    await act(async () => press('Back'));
    await act(async () => { permission.resolve({ granted: true }); await pending; });
    assert.equal(nodes('CameraView').length, 0); checks++; await close();

    await open(); await guide(); permission = deferred();
    await act(async () => { pending = press('Open camera'); });
    await act(async () => { permission.resolve({ granted: false }); await pending; });
    assert.match(text(view.toJSON()), /permission was denied/); assert.equal(nodes('CameraView').length, 0);
    await act(async () => press('Open device settings')); assert.match(text(view.toJSON()), /settings could not be opened/);
    await act(async () => press('Choose from gallery')); checks++; await close();

    await open(); await guide(); await cameraReady();
    const first = nodes('CameraView')[0].props;
    await act(async () => press('Flip camera')); assert(button('Capture photo').props.disabled);
    await act(async () => first.onCameraReady()); assert(button('Capture photo').props.disabled, 'Stale ready event after flip');
    await act(async () => nodes('CameraView')[0].props.onCameraReady());
    capture = deferred(); const cameraAsset = { uri: 'file:///app/cache/Camera/native.jpg', width: 800, height: 1000 };
    files.set(cameraAsset.uri, 4096);
    await act(async () => { pending = press('Capture photo'); });
    await act(async () => { capture.resolve(cameraAsset); await pending; });
    assert(photo()); const owned = photo().props.source.uri;
    assert.match(owned, /\/glam-capture-.*\.photo$/); assert(files.has(owned)); assert(!files.has(cameraAsset.uri));
    assert.equal(nodes('Image').length, 1, 'No editorial portrait in selected camera state');
    await act(async () => press('Retake photo')); assert(!files.has(owned)); assert(!photo());
    checks++; await close();

    await open(); await guide(); await cameraReady();
    await act(async () => nodes('CameraView')[0].props.onMountError({ message: 'no hardware' }));
    assert.equal(nodes('CameraView').length, 0); assert.match(text(view.toJSON()), /unavailable on this device/);
    assert(!button('Choose from gallery').props.disabled); checks++; await close();

    await open(); await guide();
    const originalPicker = ports.picker.launchImageLibraryAsync;
    ports.picker.launchImageLibraryAsync = async () => { throw Error('OS library denied'); };
    await act(async () => press('Choose from gallery')); assert.match(text(view.toJSON()), /could not be completed/); assert(!photo());
    ports.picker.launchImageLibraryAsync = originalPicker; checks++; await close();

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048);
    await act(async () => { pending = press('Choose from gallery'); });
    await act(async () => { selection.resolve({ canceled: false, assets: [{ ...galleryAsset, width: 10 }] }); await pending; });
    assert(!photo()); assert.equal(copies.length, 0); assert(files.has(galleryAsset.uri)); checks++; await close();

    // No native module means no fake viewfinder, while the actual OS library remains available.
    await open(); await close(); ports.available = false;
    await act(async () => { view = Renderer.create(React.createElement(Capture, { accountScope: 'account-a', onExit: () => exits++ })); });
    await guide(); await act(async () => press('Open camera')); assert.match(text(view.toJSON()), /unavailable in this build/);
    assert.equal(nodes('CameraView').length, 0); await act(async () => press('Choose from gallery')); checks++; await close();

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048);
    const nativeCallback = button('Choose from gallery').props.onPress;
    let second;
    await act(async () => { pending = nativeCallback(); second = nativeCallback(); }); assert.equal(pickerCalls, 1);
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await pending; await second; });
    assert(photo()); assert(files.has(galleryAsset.uri)); const copy = photo().props.source.uri;
    denyDelete = true; await act(async () => press('Clear private photo'));
    assert(!photo()); assert(files.has(copy)); assert(button('Retry clearing private photo'));
    denyDelete = false; await act(async () => press('Retry clearing private photo'));
    assert(!files.has(copy)); assert(files.has(galleryAsset.uri)); assert(!removed.includes(galleryAsset.uri));
    checks++; await close();

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048);
    await act(async () => { pending = press('Choose from gallery'); });
    await act(async () => nodes('Switch')[0].props.onValueChange(false));
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await pending; });
    assert.equal(copies.length, 0); assert(!photo()); checks++; await close();

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048);
    await act(async () => { pending = press('Choose from gallery'); });
    await act(async () => view.update(React.createElement(Capture, { accountScope: 'account-b', onExit: () => exits++ })));
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await pending; });
    assert.equal(copies.length, 0); assert(!photo()); checks++; await close();

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048);
    await act(async () => { pending = press('Choose from gallery'); });
    await appState('background');
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await Promise.resolve(); });
    assert(!photo()); await appState('active'); await act(async () => pending); assert(photo());
    await appState('inactive'); assert(!photo()); assert(view.root.findByProps({ testID: 'capture-privacy-cover' }));
    await appState('background'); await appState('active'); assert(!photo());
    assert(files.has(galleryAsset.uri)); checks++; await close();

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048);
    await act(async () => { pending = press('Choose from gallery'); });
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await pending; });
    const staleImageError = photo().props.onError;
    selection = deferred();
    await act(async () => { pending = press('Choose from gallery'); });
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await pending; });
    const invalidCopy = photo().props.source.uri;
    await act(async () => staleImageError());
    assert.equal(photo().props.source.uri, invalidCopy, 'A stale image event must not clear a replacement');
    await act(async () => photo().props.onError());
    assert(!photo()); assert(!files.has(invalidCopy)); assert(files.has(galleryAsset.uri));
    assert.match(text(view.toJSON()), /could not be displayed/); checks++; await close();

    await open(); await guide(); await cameraReady(); capture = deferred(); files.set(cameraAsset.uri, 4096);
    await act(async () => { pending = press('Capture photo'); });
    await appState('background');
    await act(async () => { capture.resolve(cameraAsset); await pending; });
    assert(!files.has(cameraAsset.uri)); assert(!photo()); checks++; await close();

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048);
    await act(async () => { pending = press('Choose from gallery'); }); await appState('background');
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await Promise.resolve(); });
    await close(); await act(async () => pending); assert.equal(copies.length, 0); checks++;

    await open(); await guide(); selection = deferred(); files.set(galleryAsset.uri, 2048); failCopy = denyDelete = true;
    await act(async () => { pending = press('Choose from gallery'); });
    await act(async () => { selection.resolve({ canceled: false, assets: [galleryAsset] }); await pending; });
    assert(!photo()); assert(button('Retry clearing private photo'));
    await act(async () => press('Close Analyze')); assert.equal(exits, 0, 'Cleanup failure must not be silently certified');
    failCopy = denyDelete = false; await act(async () => press('Retry clearing private photo'));
    await act(async () => press('Close Analyze')); assert.equal(exits, 1); assert(files.has(galleryAsset.uri));
    checks++; await close();

    await open(); await guide(); await cameraReady(); capture = deferred(); files.set(cameraAsset.uri, 4096);
    await act(async () => { pending = press('Capture photo'); }); await close();
    await act(async () => { capture.resolve(cameraAsset); await pending; }); assert(!files.has(cameraAsset.uri)); checks++;
    await open(); await guide(); permission = deferred();
    await act(async () => { pending = press('Open camera'); });
    await act(async () => view.update(React.createElement(Capture, { accountScope: 'account-a', focused: false, onExit: () => exits++ })));
    assert.equal(backs.size,0,'Hidden Capture must not consume Review hardware-back events');
    await act(async () => { permission.resolve({granted:true}); await pending; });
    assert.equal(nodes('CameraView').length,0,'Hidden Capture must not mount a late camera'); checks++; await close();

    const sharedFiles = new compiled.exports.CaptureFiles();let reviewCalls=0,selectedPhoto=null,selectedGoals=[];
    await open({sessionFiles:sharedFiles,onReview:()=>reviewCalls++,onPhotoChanged:p=>{selectedPhoto=p},onGoalsChange:g=>{selectedGoals=g}});
    await guide(); selection=deferred();files.set(galleryAsset.uri,2048);
    await act(async()=>{pending=press('Choose from gallery')});
    await act(async()=>{selection.resolve({canceled:false,assets:[galleryAsset]});await pending});
    assert(selectedPhoto?.uri===sharedFiles.photo?.uri);assert(selectedGoals.includes('Everyday polish'));
    await act(async()=>press('Review photo'));assert.equal(reviewCalls,1);
    const retained=sharedFiles.photo.uri;await close();assert(files.has(retained),'Capture unmount must preserve the root-owned Review lease');
    assert(sharedFiles.clear());assert(!files.has(retained));assert(files.has(galleryAsset.uri));checks++;

    assert.equal(networkCalls, 0, 'Capture performed a network operation'); global.fetch = originalFetch;
    console.log(`PASS ${platform}: native Capture handlers, source gates, races, privacy, cleanup and no network (OS/camera/filesystem doubled)`);
  }
  console.log(`${checks} Capture scenarios passed; installed Android/iOS tests are separate.`);
})().catch(error => { console.error(error); process.exit(1); });
