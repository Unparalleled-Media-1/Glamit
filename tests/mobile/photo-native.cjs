/** Real App.tsx consent/picker handlers under React rendering, with explicit native ports.
 * No simulator, OS permission, or hardware claim is inferred. */
const React = require('react'), Renderer = require('react-test-renderer'), { act } = React;
const { build } = require('esbuild'), Module = require('node:module'), assert = require('node:assert/strict');
global.IS_REACT_ACT_ENVIRONMENT = true;
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
(async () => {
    for (const platform of ['ios', 'android']) {
        const events = [], files = new Map(), listeners = {};
        let permission, selection, launches = 0, libraryPermissions = 0, denyDelete = false, failCopy = false, view;
        class File {
            constructor(...parts) { this.uri = parts.map(x => typeof x === 'string' ? x : x.uri).reduce((a, b) => a.replace(/\/+$/, '') + '/' + b.replace(/^\/+/, '')); }
            get exists() { return files.has(this.uri); }
            get size() { return files.get(this.uri)?.size || 1024; }
            async text() { return ''; }
            write() { }
            copy(to) { files.set(to.uri, { size: this.size }); events.push(['copy', this.uri, to.uri]); if (failCopy)
                throw Error('partial copy'); }
            delete() { events.push(['delete', this.uri]); if (denyDelete)
                throw Error('busy'); files.delete(this.uri); }
        }
        const sdk = { Platform: { OS: platform }, View: 'View', Text: 'Text', Image: 'Image', ScrollView: React.forwardRef((p, r) => React.createElement('ScrollView', p, p.children)), Pressable: 'Pressable', Switch: 'Switch', TextInput: 'TextInput', Modal: 'Modal', Alert: { alert() { } }, Linking: { openSettings: async () => { } }, StyleSheet: { create: x => x }, useWindowDimensions: () => ({ width: 390, height: 844 }), AppState: { currentState: 'active', addEventListener: (event, cb) => { listeners[event] = cb; return { remove: () => delete listeners[event] }; } } };
        global.__glamNativeTest = { sdk, fs: { File, Paths: { cache: { uri: 'file:///app/cache/' }, document: { uri: 'file:///app/documents/' } } }, picker: { requestCameraPermissionsAsync: async () => permission ? permission.promise : { granted: true }, requestMediaLibraryPermissionsAsync: async () => { libraryPermissions++; return { granted: true }; }, launchCameraAsync: async () => { launches++; return selection ? selection.promise : { canceled: true }; }, launchImageLibraryAsync: async () => { launches++; return selection ? selection.promise : { canceled: true }; } } };
        const output = await build({ entryPoints: ['apps/mobile/App.tsx'], bundle: true, write: false, platform: 'node', loader: { '.webp': 'dataurl', '.png': 'dataurl' }, format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], plugins: [{ name: 'native-ports', setup(b) { b.onResolve({ filter: /^(react-native|react-native-safe-area-context|expo-image-picker|expo-file-system|expo-crypto)$/ }, a => ({ path: a.path, namespace: 'ports' })); b.onLoad({ filter: /.*/, namespace: 'ports' }, a => ({ loader: 'js', contents: a.path === 'react-native' ? 'module.exports=global.__glamNativeTest.sdk' : a.path === 'expo-file-system' ? 'module.exports=global.__glamNativeTest.fs' : a.path === 'expo-image-picker' ? 'module.exports=global.__glamNativeTest.picker' : a.path === 'expo-crypto' ? 'exports.randomUUID=()=>require("node:crypto").randomUUID()' : 'exports.SafeAreaProvider=({children})=>children;exports.useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0})' })); b.onResolve({ filter: /reskin\/(navigation|CoreScreens|ui|PreferencesScreens|BeautyScreens)|analyze\/(use-analyze-session|AnalyzeScreens)$/ }, a => ({ path: a.path, namespace: 'reskin-fixture' })); b.onLoad({ filter: /.*/, namespace: 'reskin-fixture' }, a => ({ loader: 'js', contents: a.path.endsWith('navigation') ? `const R=require('react');exports.navigateDesign=id=>global.__glamNativeTest.navigate(id);exports.backDesign=()=>global.__glamNativeTest.navigate('home');exports.NativeRouteHost=({render,onRoute})=>{const[id,setId]=R.useState('home');global.__glamNativeTest.navigate=setId;R.useEffect(()=>onRoute(id),[id,onRoute]);return R.createElement('NativeHost',null,render(id),...['Profile','Analyze'].map(label=>R.createElement('Pressable',{key:label,accessibilityRole:'tab',accessibilityLabel:label,onPress:()=>setId(label==='Analyze'?'GL-017':'GL-117')},label)))}` : (/(PreferencesScreens|BeautyScreens)$/.test(a.path)) ? 'exports.NativePreferences=()=>null;exports.NativeSavedLooks=()=>null;exports.NativeHelp=()=>null;exports.NativeStudioHome=()=>null;exports.NativeBeautyWorkbench=()=>null' : a.path.endsWith('CoreScreens') ? `exports.NativeHome=()=>require('react').createElement('HomeProbe',{go:p=>global.__glamNativeTest.navigate(({consent:'GL-019',goals:'TP-01'})[p]||'home')});exports.NativeProfile=()=>null;exports.NativeDiscover=()=>null;exports.NativeSearch=()=>null;exports.NativeWelcome=()=>null;exports.NativeDependencyScreen=()=>null;exports.NativeSystemScreen=()=>null` : a.path.endsWith('use-analyze-session') ? `exports.useAnalyzeSession=()=>({clear(){return true},files:{},selectPhoto(){},selectGoals(){}})` : a.path.endsWith('AnalyzeScreens') ? `module.exports={PhotoReview:()=>null,AnalysisConsent:()=>null,AnalysisProgress:()=>null,AnalysisResults:()=>null,AnalysisHistory:()=>null}` : `exports.NativePage=({children})=>children;exports.NativeRow=()=>null` })); b.onResolve({ filter: /(AnalyzeCapture|BrandLogo|CreatorStudio|NativeAIStylist|NativePrivatePhotos|NativeAnalysisJourney|NativeAccount|use-native-account|BeautyExperience|GoldenCommerce|StylingJourney|ContextualRecommendations|MerchantSnapList|CompanionViews|use-personal-results|use-destination|use-marketplace)$/ }, a => ({ path: a.path, namespace: 'unrelated' })); b.onLoad({ filter: /.*/, namespace: 'unrelated' }, a => ({ loader: 'js', contents: a.path.endsWith('AnalyzeCapture') ? 'module.exports=p=>require("react").createElement("CaptureProbe",p)' : a.path.endsWith('NativeAnalysisJourney') ? 'module.exports=p=>require("react").createElement("LegacyAnalysisProbe",p)' : a.path.endsWith('use-native-account') ? 'exports.useNativeAccount=()=>({account:global.__glamNativeTest.account||null})' : a.path.includes('use-personal-results') ? 'exports.usePersonalResults=()=>({})' : a.path.includes('use-destination') ? 'exports.useDestination=()=>({})' : a.path.includes('use-marketplace') ? 'exports.useMarketplace=()=>({})' : a.path.endsWith('StylingJourney') ? 'module.exports=p=>require("react").createElement("HomeProbe",p)' : a.path.endsWith('BeautyExperience') ? 'exports.BeautyAnalysis=p=>require("react").createElement("AnalysisProbe",p);exports.BeautyStudio=()=>null;exports.BeautyColor=()=>null' : a.path.endsWith('CompanionViews') ? 'exports.PersonalResults=()=>null;exports.PersonalPreview=()=>null;exports.Destination=()=>null;exports.Marketplace=()=>null' : 'module.exports=()=>null' })); } }] });
        const compiled = new Module(process.cwd() + '/native-photo-fixture.cjs', module);
        compiled.filename = process.cwd() + '/native-photo-fixture.cjs';
        compiled.paths = module.paths;
        compiled._compile(output.outputFiles[0].text, compiled.filename);
        const App = compiled.exports.default;
        const allText = n => { if (typeof n === 'string')
            return n; if (!n?.children)
            return ''; return n.children.map(allText).join(' '); };
        const press = title => { const nodes = view.root.findAll(n => n.type === 'Pressable' && allText(n).trim() === title); assert(nodes.length, 'Missing native action: ' + title); return nodes[0].props.onPress(); };
        const open = async () => { await act(async () => { view = Renderer.create(React.createElement(App)); }); for (const label of ['Profile', 'Analyze']) { const tab = view.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === label); assert.equal(tab.length, 1, platform + ': native tab needs an exact accessible name: ' + label); assert.equal(typeof tab[0].props.onPress, 'function'); } await act(async () => view.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityLabel === 'Analyze')[0].props.onPress()); assert.equal(view.root.findAllByType('CaptureProbe').length, 1, 'Analyze must mount the dedicated Capture boundary'); assert.equal(view.root.findAllByType('ScrollView').length, 0, 'Capture must not be nested in the web-style page scroller'); await act(async () => view.root.findByType('CaptureProbe').props.onExit()); await act(async () => view.root.findByType('HomeProbe').props.go('consent')); await act(async () => view.root.findByType('Switch').props.onValueChange(true)); };
        const close = async () => { await act(async () => view.unmount()); };
        // Leaving while the camera permission dialog is unresolved must not open a camera later.
        permission = deferred();
        await open();
        let pending;
        await act(async () => { pending = press('Take a photo'); });
        await act(async () => press('Continue without a photo'));
        await act(async () => { permission.resolve({ granted: true }); await pending; });
        assert.equal(launches, 0, platform + ': stale permission must not launch camera');
        await close();
        // Consent must be withdrawable even while a native picker is pending.
        permission = null;
        selection = deferred();
        await open();
        await act(async () => { pending = press('Choose a photo'); });
        assert.notEqual(view.root.findByType('Switch').props.disabled, true, 'Consent withdrawal must remain enabled');
        await act(async () => view.root.findByType('Switch').props.onValueChange(false));
        await act(async () => { selection.resolve({ canceled: false, assets: [{ uri: 'file:///user/original.jpg', width: 800, height: 900, fileSize: 1024 }] }); await pending; });
        assert(!events.some(e => e[0] === 'delete' && e[1] === 'file:///user/original.jpg'));
        assert.equal(view.root.findByType('Switch').props.value, false);
        await close();
        // Modern system image selection does not need blanket photo-library permission.
        selection = null;
        await open();
        await act(async () => press('Choose a photo'));
        assert.equal(libraryPermissions, 0, 'System picker must not request blanket library permission');
        await close();
        // Adopt only our own copy; clearing never deletes a user/provider original.
        const original = 'file:///user/original.jpg';
        files.set(original, { size: 2048 });
        selection = deferred();
        await open();
        await act(async () => { pending = press('Choose a photo'); });
        await act(async () => { selection.resolve({ canceled: false, assets: [{ uri: original, width: 800, height: 900, fileSize: 2048 }] }); await pending; });
        const copies = events.filter(e => e[0] === 'copy');
        assert(copies.length);
        const owned = copies.at(-1)[2];
        assert.match(owned, /file:\/\/\/app\/cache\/glam-photo-/);
        assert(files.has(original));
        assert(files.has(owned));
        await act(async () => press('Choose my goals'));
        assert(view.root.findAll(n => n.type==='Switch' && n.props.testID?.startsWith('analysis-goal-')).length,'Existing picker must retain its original goals flow');
        await act(async () => press('Review permissions and run analysis'));
        assert.equal(view.root.findByType('LegacyAnalysisProbe').props.photoUri,owned,'Existing selected photo must reach its authenticated analysis composition');
        await act(async () => global.__glamNativeTest.navigate('GL-023'));
        denyDelete = true;
        await act(async () => press('Clear / retake photo'));
        assert(!view.root.findAll(n => n.type === 'Image' && n.props.source?.uri === owned).length, 'Revoked photo must disappear even if cache deletion fails');
        await act(async()=>global.__glamNativeTest.navigate('GL-017'));
        assert.equal(view.root.findAllByType('CaptureProbe').length,0,'Unresolved legacy cleanup must also block the new Capture path');
        await act(async()=>global.__glamNativeTest.navigate('GL-023'));
        denyDelete = false;
        await act(async () => press('Clear / retake photo'));
        assert(files.has(original));
        assert(!files.has(owned));
        assert.equal(view.root.findByType('Switch').props.value, false);
        await close();
        // Synchronous lock blocks double taps; leaving discards an eventual picker result.
        selection = deferred();
        await open();
        let second;
        const launchStart = launches;
        await act(async () => { pending = press('Choose a photo'); second = press('Choose a photo'); });
        assert.equal(launches, launchStart + 1);
        await act(async () => press('Continue without a photo'));
        const copyCount = events.filter(e => e[0] === 'copy').length;
        await act(async () => { selection.resolve({ canceled: false, assets: [{ uri: original, width: 800, height: 900, fileSize: 2048 }] }); await pending; await second; });
        assert.equal(events.filter(e => e[0] === 'copy').length, copyCount);
        await close();
        // A failed partial copy remains tracked when its immediate deletion fails.
        failCopy = true;
        denyDelete = true;
        selection = deferred();
        await open();
        await act(async () => { pending = press('Choose a photo'); });
        await act(async () => { selection.resolve({ canceled: false, assets: [{ uri: original, width: 800, height: 900, fileSize: 2048 }] }); await pending; });
        assert.equal(view.root.findByType('Switch').props.value, true);
        assert(view.root.findAll(n => n.type === 'Pressable' && allText(n).trim() === 'Retry clearing private photo').length);
        failCopy = false;
        denyDelete = false;
        await act(async () => press('Retry clearing private photo'));
        assert.equal(view.root.findByType('Switch').props.value, false);
        assert(files.has(original));
        await close();
        // Existing private copies are revoked on identity changes and background.
        selection=deferred();await open();
        await act(async()=>{pending=press('Choose a photo')});
        await act(async()=>{selection.resolve({canceled:false,assets:[{uri:original,width:800,height:900,fileSize:2048}]});await pending});
        const beforeAccount=events.filter(e=>e[0]==='copy').at(-1)[2];
        await act(async()=>{global.__glamNativeTest.account={profile:{id:'isolated-other-owner'},token:'fixture-only'};view.update(React.createElement(App))});
        assert(!files.has(beforeAccount),'Changing identity must clear the old private preview');assert(files.has(original));await close();
        selection=deferred();await open();
        await act(async()=>{pending=press('Choose a photo')});
        await act(async()=>{selection.resolve({canceled:false,assets:[{uri:original,width:800,height:900,fileSize:2048}]});await pending});
        const beforeBackground=events.filter(e=>e[0]==='copy').at(-1)[2];
        await act(async()=>listeners.change('background'));assert(!files.has(beforeBackground));assert(files.has(original));await close();
        // Unmount during permission wait never launches native capture later.
        selection = null;
        permission = deferred();
        await open();
        const beforeUnmount = launches;
        await act(async () => { pending = press('Take a photo'); });
        await close();
        await act(async () => { permission.resolve({ granted: true }); await pending; });
        assert.equal(launches, beforeUnmount);
        console.log('PASS ' + platform + ' actual native App photo handlers: stale permission, withdrawal, owned-copy/retry, original preservation, duplicate taps, navigation/unmount fencing, least-privilege picker (OS ports doubled)');
    }
    delete global.__glamNativeTest;
})().catch(e => { console.error(e); process.exitCode = 1; });
