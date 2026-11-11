/** Render actual native reskin controls with explicit RN/OS ports. Not installed-app evidence. */
const React = require('react'), Renderer = require('react-test-renderer'), { act } = React;
const { build } = require('esbuild'), Module = require('node:module'), assert = require('node:assert/strict');
global.IS_REACT_ACT_ENVIRONMENT = true;
(async () => {
  for (const platform of ['ios', 'android']) {
    const routes = [], events = [];
    const sdk = { Platform: { OS: platform }, View: 'View', Text: 'Text', TextInput: 'TextInput', Switch: 'Switch', Pressable: 'Pressable', Image: 'Image', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', StyleSheet: { hairlineWidth: 1 }, Linking: { openSettings: async () => { events.push('settings'); } } };
    global.__reskinPorts = { sdk, routes };
    const sources = ['apps/mobile/reskin/theme.tsx','apps/mobile/reskin/CoreScreens.tsx','apps/mobile/analyze/AnalyzeScreens.tsx','apps/mobile/reskin/PreferencesScreens.tsx','apps/mobile/reskin/BeautyScreens.tsx'];
    const exports = {};
    for (const entry of sources) {
      const result = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.png':'dataurl','.webp':'dataurl' }, external:['react','react/jsx-runtime'], plugins:[{name:'native-reskin-ports',setup(b){
        b.onResolve({filter:/^(react-native|react-native-safe-area-context|expo-linear-gradient|expo-crypto)$/},a=>({path:a.path,namespace:'ports'}));
        b.onLoad({filter:/.*/,namespace:'ports'},a=>({loader:'js',contents:a.path==='expo-crypto'?'exports.randomUUID=()=>require("node:crypto").randomUUID()':a.path==='react-native'?'module.exports=global.__reskinPorts.sdk':a.path==='expo-linear-gradient'?'exports.LinearGradient="LinearGradient"':'exports.useSafeAreaInsets=()=>({top:47,bottom:34,left:0,right:0})'}));
        b.onResolve({filter:/navigation$/},a=>({path:a.path,namespace:'navigation-port'}));
        b.onLoad({filter:/.*/,namespace:'navigation-port'},()=>({loader:'js',contents:'exports.navigateDesign=id=>global.__reskinPorts.routes.push(id);exports.backDesign=()=>global.__reskinPorts.routes.push("BACK")'}));
        if(entry!=='apps/mobile/reskin/theme.tsx'){
          b.onResolve({filter:/reskin\/theme$|^\.\/theme$/},a=>({path:a.path,namespace:'theme-port'}));
          b.onLoad({filter:/.*/,namespace:'theme-port'},()=>({loader:'js',contents:'module.exports=global.__reskinTheme'}));
        }
      }}]});
      const file=process.cwd()+'/reskin-test-fixture.cjs',m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(result.outputFiles[0].text,file);
      if(entry.endsWith('theme.tsx')) global.__reskinTheme=m.exports; else Object.assign(exports,m.exports);
    }
    const Theme=global.__reskinTheme.NativeTheme;let view;
    const mount=async(C,props)=>{await act(async()=>{view=Renderer.create(React.createElement(Theme,null,React.createElement(C,props)))});};
    const close=async()=>act(async()=>view.unmount());
    const action=label=>{const all=view.root.findAll(n=>n.type==='Pressable'&&n.props.accessibilityLabel===label);assert.equal(all.length,1,'Missing '+label);return all[0];};
    const press=async label=>act(async()=>{const n=action(label);assert(!n.props.disabled);n.props.onPress();});
    const flatten=n=>typeof n==='string'?n:(n?.children||[]).map(flatten).join(' ');
    await mount(exports.NativeHome,{account:null});await press('◎ Analyze my face');assert.equal(routes.at(-1),'GL-017');await press('Sign in');assert.equal(routes.at(-1),'GL-004');assert(!flatten(view.toJSON()).includes('12 credits'));await close();
    await mount(exports.NativeProfile,{account:null});await press('Security & privacy');assert.equal(routes.at(-1),'GL-130');await act(async()=>view.root.findByType('Switch').props.onValueChange(true));assert(view.root.findAll(n=>n.type==='View'&&n.props.style?.backgroundColor==='#f8f4f0').length);await close();
    await mount(exports.NativeSearch,{});await act(async()=>view.root.findByType('TextInput').props.onChangeText('ward'));await press('Wardrobe');assert.equal(routes.at(-1),'GL-061');assert(!view.root.findAll(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Products').length);await close();
    const flow={photo:null,goals:[],clear:()=>{events.push('clear');return true},operations:{account:null,client:null,state:{busy:false,permissions:null,job:null,report:null,history:[],edits:{},status:'Not checked',error:'',message:''},upload:()=>events.push('UPLOAD'),reload:()=>events.push('reload'),check:()=>events.push('check'),patch:()=>{},stop:()=>events.push('stop')}};
    await mount(exports.PhotoReview,{flow});await press('Return to Capture');assert.equal(routes.at(-1),'GL-017');assert(!events.includes('UPLOAD'));await close();
    flow.photo={uri:'file:///isolated/private.photo',width:800,height:1000,bytes:2048};flow.goals=['Understand my features'];
    await mount(exports.PhotoReview,{flow});await press('Use this photo');assert.equal(routes.at(-1),'GL-024');assert(!events.includes('UPLOAD'));await close();
    await mount(exports.AnalysisConsent,{flow});await press('Sign in');assert.equal(routes.at(-1),'GL-004');assert(!events.includes('UPLOAD'));await close();
    flow.operations.account={profile:{id:'isolated-owner'}};
    await mount(exports.AnalysisConsent,{flow});assert(flatten(view.toJSON()).includes('has not been configured'));await press('Return to Capture');assert(!events.includes('UPLOAD'));await close();
    flow.operations.client={};flow.operations.state.permissions={eligible:true,storage:{granted:true,policy:{content:'Fixture storage purpose',version:'1'}},analysis:{granted:true,policy:{content:'Fixture analysis purpose',version:'1'}}};flow.operations.state.status='CONNECTED';flow.operations.state.job={id:'existing-job',state:'queued'};flow.withdraw=()=>events.push('withdraw');
    const routeCount=routes.length;await mount(exports.AnalysisConsent,{flow});assert.equal(routes.length,routeCount,'Existing jobs must not force privacy/consent navigation away');assert.equal(view.root.findAllByType('Switch').length,0,'Confirmed grants must not appear as unchecked consent choices');await press('Withdraw photo and analysis permissions');assert(events.includes('withdraw'));await close();
    flow.operations.state.job=null;
    await mount(exports.AnalysisProgress,{flow});assert(action('Refresh analysis status').props.disabled);await press('Stop waiting');assert(events.includes('stop'));await close();
    let journey;
    const initial = { version:1,remember:false,onboarded:false,name:'',preferences:'',country:'',city:'',look:{id:'current',title:'My next look',parts:{Hair:'',Makeup:'',Clothing:'',Accessories:'','Professional services':''}},saved:[] };
    const withJourney = (Component, props={}) => function JourneyFixture() { const [value,setValue]=React.useState(initial);journey=value;return React.createElement(Component,{journey:value,setJourney:setValue,...props}); };
    await mount(withJourney(exports.NativePreferences,{id:'GL-119'}),{});
    await act(async()=>view.root.findByProps({accessibilityLabel:'Preferred name'}).props.onChangeText('Chosen name'));
    await act(async()=>view.root.findByType('Switch').props.onValueChange(true));assert.equal(journey.name,'Chosen name');assert.equal(journey.remember,true);assert.equal(flow.operations.account.profile.id,'isolated-owner');await close();
    await mount(withJourney(exports.NativeBeautyWorkbench,{id:'GL-039',photo:null}),{});
    await press('Lips shade 3');assert.match(journey.look.parts.Makeup,/#cf8d94/);assert(action('Generate photo preview').props.disabled);assert(flatten(view.toJSON()).includes('Not your photo or generated result'));
    await press('Use direction in my outfit brief');assert.equal(routes.at(-1),'FB-03');await close();
    await mount(withJourney(exports.NativeSavedLooks),{});assert(action('Save current written style brief').props.disabled);await close();
    const written={...initial,look:{...initial.look,parts:{...initial.look.parts,Makeup:'My written direction'}}};
    function SavedFixture(){const [value,setValue]=React.useState(written);journey=value;return React.createElement(exports.NativeSavedLooks,{journey:value,setJourney:setValue});}
    await mount(SavedFixture,{});await press('Save current written style brief');assert.equal(journey.saved.length,1);await press('Open My next look');assert.equal(routes.at(-1),'FB-03');await press('Delete My next look');assert.equal(journey.saved.length,0);await close();
    console.log(`PASS ${platform}: actual native Home/Profile/search/theme, Review/Consent/Progress, preferences, local beauty directions and saved-brief controls (native ports doubled; no device claim)`);
  }
})().catch(e=>{console.error(e);process.exit(1)});
