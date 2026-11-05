const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = __dirname;
const out = path.join(base,'figma-ready'); fs.mkdirSync(out,{recursive:true});
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(base,'design-data.js'),'utf8'),context);
const D=context.window.GLAM_DESIGN;
vm.runInNewContext(fs.readFileSync(path.join(base,'library-layouts.js'),'utf8'),context);
const layouts=context.window.GLAM_LIBRARY_LAYOUTS;
const tokens=JSON.parse(fs.readFileSync(path.join(base,'tokens.json'),'utf8'));
const color=name=>tokens.color[name].$value;
const x=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect=(a,b,w,h,fill,r=0,stroke='none')=>`<rect x="${a}" y="${b}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const text=(a,b,value,size=16,fill=color('ink'),serif=false,weight=400)=>`<text x="${a}" y="${b}" font-family="${serif?'Georgia,serif':'Arial,sans-serif'}" font-size="${size}" font-weight="${weight}" fill="${fill}">${x(value)}</text>`;
const svg=(w,h,title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${x(title)}</title>${body}</svg>\n`;
const editorial='data:image/webp;base64,'+fs.readFileSync(path.join(base,'assets/editorial.webp')).toString('base64');
const products='data:image/webp;base64,'+fs.readFileSync(path.join(base,'assets/products.webp')).toString('base64');
function portrait(id,a,b,w,h,wire=false) {
  if(wire)return rect(a,b,w,h,'#DDD8D4',22)+text(a+20,b+35,'Editorial image area',14,color('muted'));
  return `<defs><clipPath id="${id}">${rect(a,b,w,h,'white',22)}</clipPath></defs><image href="${editorial}" x="${a}" y="${b-45}" width="${w*4}" height="${w*2}" preserveAspectRatio="none" clip-path="url(#${id})"/>`;
}
function mobile(wire=false) {
  let body=rect(0,0,414,890,color('ivory'),35,color('ink'));
  body+=text(25,28,'9:41',11)+rect(164,12,85,22,color('ink'),15)+text(285,28,'DESIGN PREVIEW',9);
  body+=text(27,85,'GLAM AI',25,color('ink'),false,700)+text(235,83,'Region / USD',11);
  body+=rect(26,112,362,45,'white',23,color('line'))+text(43,140,'Search looks, styles, occasions',12,color('muted'));
  body+=portrait('mobile-hero',26,175,362,390,wire);
  body+=rect(26,390,362,175,'#17151ACC',0);
  body+=text(49,422,'EVERY LOOK. EVERY STYLE. EVERYONE.',9,'white',false,700);
  body+=text(49,470,'Find Your',45,'white',true)+text(49,517,'Next Look.',45,'white',true);
  body+=rect(48,529,145,36,'white',18)+text(67,552,'Try a Look',12,color('ink'),false,700);
  ['Hair','Makeup','Fashion','Grooming'].forEach((n,i)=>{body+=rect(26+i*90,580,82,40,color('ivory'),20,color('line'))+text(42+i*90,605,n,11)});
  body+=text(27,658,'Discover a different direction',18,color('ink'),false,600);
  body+=rect(27,678,173,62,'#E4D8CC',15)+rect(213,678,173,62,'#E4D8CC',15);
  body+=rect(0,741,414,149,color('ivory'),0)+rect(269,751,120,43,'#EEE8F3',22)+text(287,778,'Ask GLAM',13);
  body+=rect(0,810,414,80,'white',0);
  ['Home','Discover','Studio','Shop','Profile'].forEach((n,i)=>{body+=text(25+i*79,845,['⌂','◇','✦','□','○'][i],19)+text(19+i*79,870,n,11,i===0?color('ink'):color('muted'),false,i===0?700:400)});
  return svg(414,890,'GLAM AI mobile Home — editable layout study; illustrative imagery',body);
}
function desktop(wire=false) {
  let body=rect(0,0,1440,1040,color('ivory'));
  body+=rect(0,0,1440,45,'white')+text(30,28,'GLAM AI · DESIGN PROPOSAL · ILLUSTRATIVE ASSETS, NO LIVE SERVICES',11);
  body+=text(50,105,'GLAM AI',27,color('ink'),false,700)+text(1080,102,'Region / USD',12);
  body+=text(350,158,'Discover     AI Studio     Hair & Beauty     Fashion     Shop the Look     Professionals     Creators',13);
  body+=text(50,224,'DISCOVER · TRY · PERSONALIZE · COMPLETE',10,color('actionRose'),false,700);
  body+=text(50,278,'Complete the Look.',47,color('ink'),true)+text(50,308,'Quiet confidence · Editorial concept, no live product matches',13,color('muted'));
  body+=portrait('desktop-look',50,340,455,600,wire);
  body+=text(530,365,'Everything that makes the look',20,color('ink'),false,700);
  const labels=['Hair','Makeup','Clothing','Shoes & bag','Accessories','Professional service'];
  labels.forEach((n,i)=>{
    const yy=400+i*85;body+=rect(530,yy,485,80,'white',12,color('line'));
    body+=rect(544,yy+10,54,60,'#EEE8E4',8);
    if(!wire&&i>0&&i<5){const ix=[2,0,1,3][i-1];const sx=ix%2,sy=Math.floor(ix/2);const id='product-'+i;body+=`<defs><clipPath id="${id}">${rect(544,yy+10,54,54,'white',8)}</clipPath></defs><image href="${products}" x="${544-sx*108}" y="${yy+10-sy*108}" width="216" height="216" clip-path="url(#${id})"/>`;}
    body+=text(612,yy+31,n,14,color('ink'),false,600)+text(612,yy+55,i===0||i===5?'Feasibility / quote required':'Price pending · Availability unverified',11,color('muted'));
  });
  body+=rect(1040,340,350,520,'white',22,color('line'))+text(1065,378,'Your look, item by item.',21,color('ink'),false,600);
  ['Items & materials','Delivery, tax & duties','Full service cost','Delivered total'].forEach((n,i)=>{body+=text(1065,440+i*55,n,13)+text(1260,440+i*55,['Pending','Unknown','Quote needed','Unconfirmed'][i],12,color('ink'),false,600)});
  body+=text(1065,655,'No firm budget fit without source evidence.',11,color('muted'));
  body+=rect(1065,682,300,48,color('ink'),24)+text(1160,712,'Shop the Look',13,'white',false,600);
  body+=rect(1065,744,300,48,'white',24,color('line'))+text(1160,774,'Compare Offers',13,color('ink'),false,600);
  body+=text(1120,829,'Book the Exact Look',12);
  body+=text(50,1010,'Original vector layout study · Text/shapes editable; image fills are raster · Native Figma import/authoring not verified',11,color('muted'));
  return svg(1440,1040,'GLAM AI desktop Complete the Look — editable layout study',body);
}
function components() {
  let body=rect(0,0,1440,1000,color('ivory'))+text(50,65,'GLAM AI · COMPONENT STARTER FRAMES',13,color('ink'),false,700)+text(50,126,'Editorial expression. Considered controls.',46,color('ink'),true);
  ['ink','ivory','rose','lilac','gold'].forEach((n,i)=>{body+=`<g id="Color-${n}">${rect(50+i*270,180,245,120,color(n),20,color('line'))}${text(60+i*270,330,n.toUpperCase(),13)}${text(60+i*270,353,color(n),12,color('muted'))}</g>`;});
  body+=`<g id="Button-Primary">${rect(50,420,200,50,color('ink'),25)}${text(95,451,'Primary action',14,'white',false,600)}</g>`;
  body+=`<g id="Button-Secondary">${rect(280,420,200,50,'white',25,color('line'))}${text(321,451,'Secondary action',14)}</g>`;
  body+=`<g id="Button-Disabled">${rect(510,420,200,50,'#E9E4E1',25)}${text(570,451,'Unavailable',14,color('muted'))}</g>`;
  body+=`<g id="Field-Focus">${text(50,535,'Persistent label',13)}${rect(50,550,400,54,'white',12,color('actionRose'))}${text(66,582,'Accessible field and clear help',14,color('muted'))}</g>`;
  body+=`<g id="Label-Sponsored">${rect(510,550,180,40,'#F5E6EC',20)}${text(536,576,'Sponsored · Sample',13)}</g>`;
  body+=`<g id="State-Unavailable">${rect(50,660,620,180,'white',20,color('line'))}${text(75,705,'A moment offline',25,color('ink'),true)}${text(75,745,'No transaction or private processing while evidence is unavailable.',13,color('muted'))}${text(75,780,'A successful layout is never proof of a completed real operation.',13,color('muted'))}</g>`;
  body+=text(50,940,'Starter vectors and tokens support handoff; native auto-layout, component variants and complete Figma library remain outstanding.',13,color('muted'));
  return svg(1440,1000,'GLAM AI editable component starter frames',body);
}
for(const [name,body]of [['mobile-home.svg',mobile()],['desktop-complete-look.svg',desktop()],['wireframe-mobile-home.svg',mobile(true)],['wireframe-desktop-complete-look.svg',desktop(true)],['components.svg',components()]])fs.writeFileSync(path.join(out,name),body);

const blueprint=fs.readFileSync(path.join(base,'../specification/screen-blueprint.md'),'utf8');
const originalFamilies=blueprint.split('\n').filter(l=>/^\| M\d\d \|/.test(l)).map(l=>{
  const [,id,title,gate]=l.split('|').map(s=>s.trim());
  const n=Number(id.slice(1));
  let domain='profile / consent / privacy',journey='J05',route='profile';
  if(n<=13){domain='identity / capabilities / preferences / media consent';journey='J00';route='onboarding';}
  else if(n<=19){domain='analysis jobs / private media / feedback';journey='J01';route=n===14?'home':'studio';}
  else if(n<=26){domain='generation jobs / private looks / quotes';journey='J01';route='studio';}
  else if(n<=30){domain='advisor / conversations / routines';journey='J03';route='profile';}
  else if(n<=33||n>=46&&n<=55){domain='catalog / matching / full-cost quote / referrals / professional feasibility';journey='J02';route='complete';}
  else if(n>=56&&n<=61){domain='age / guardian / fit / publication / verified rewards';journey='J05';route='profile';}
  else if(n>=62){domain='companion memory / wardrobe / twin / occasion / group / agent / later commerce';journey='J03';route=n===65||n===68?'home':'profile';}
  const interactive=['M02','M04','M05','M06','M07','M10','M14','M20','M21','M22','M23','M25','M27','M28','M31','M32','M34','M35','M46','M47','M55','M62','M65','M68'].includes(id);
  return {id,title,stage:'proposed',platforms:['ios','android','consumer-web-as-qualified'],backend:domain,contractStatus:'proposed / no new endpoint implemented',journey,preview:'?surface=ios&screen='+route,coverage:interactive?'interaction-study; not a complete native/Figma screen':'specified; dedicated high-fidelity/native frame outstanding',acceptance:[gate,'Owner/role/age/market/consent/rights gates before private or commercial effects','Loading, empty, error, offline, denied and authoritative-success states','No fabricated price/stock/delivery, no unconfirmed charge/booking, explicit sponsored separation','Accessible labels/focus/touch targets, scalable text, RTL/locale/device review before release']};
});
const webFamilies=[['W01','Consumer discovery','discover'],['W02','Desktop AI Studio','studio'],['W03','Hair & Beauty','discover'],['W04','Fashion','shop'],['W05','Complete the Look / comparisons / handoff','complete'],['W06','Professionals / quote request','complete'],['W07','Creators / collections','discover'],['W08','Web account / cross-device session boundary','profile']].map(([id,title,route])=>({id,title,platforms:['consumer-web','tablet'],stage:'design proposal',journey:'J02',backend:'Shared qualified API domains; web session/CSRF/continuity contracts require review',preview:'?surface=consumer&screen='+route,coverage:'responsive interaction-study; not a native Figma screen',acceptance:['Independent desktop/tablet composition','Private session and owner/tenant isolation; no local media cache leakage','Same source/quote/policy versions across devices; no cross-device auto-charge','Keyboard, focus, responsive comparison, uncertainty and unavailable-state coverage']}));
const workspaceFamilies=Object.entries(D.workspaces).flatMap(([kind,config])=>config.modules.map((title,i)=>({id:({merchant:'MER',advertiser:'ADV',professional:'PRO',creator:'CRE',admin:'ADM'})[kind]+String(i+1).padStart(2,'0'),title,platforms:[kind+'-web'],stage:'design proposal',journey:kind==='advertiser'?'J06':kind==='professional'?'J04':'J07',backend:'Organization/admin permissions and corresponding canonical business domain',preview:'?surface='+kind+'&module='+encodeURIComponent(title),coverage:'workspace interaction-study; some modules share operational empty-state template',acceptance:['Correct isolated role workspace and scoped navigation','Real records/metrics show evidence and freshness; unknown is not zero','Privileged operations require backend authority/MFA/audit; no client-only grants','Explicit review/confirmation and no publication/booking/charge before qualification','Responsive, keyboard, error/denied/offline states and safe exports']})));
const catalog={version:D.version,authority:'2026-11 UI/UX brief; prototype-only, approval before implementation',consumerFamilies:originalFamilies,webFamilies,workspaceFamilies,nativeFigmaFile:'outstanding',completeHighFidelityScreenLibrary:'outstanding; coverage stated per family',allAcceptanceTestsForRealServices:'unimplemented / unrun'};
const families=[...originalFamilies,...webFamilies,...workspaceFamilies];
for(const family of families){
  const layout=layouts[family.id] || {kind:family.id.startsWith('W')?'journey':'operations',heading:family.title,copy:'Review the scoped workspace and source evidence before making changes.',fields:[family.title+' records','Source and last verified time','Permissions and review','Activity and exception history'],cta:'Verified connection required'};
  family.layout=layout;
  family.coverage='Dedicated HTML frame study + editable SVG wireframe; primary interactions linked separately; native Figma outstanding';
  family.study='?surface=library&family='+family.id;
  const w=family.id.startsWith('M')&&!family.id.startsWith('MER')?414:1100;
  let body=rect(0,0,w,860,color('ivory'))+text(26,45,'GLAM AI · '+family.id+' · FRAME STUDY',12,color('muted'));
  body+=text(26,100,family.title.substring(0,w===414?35:90),24,color('ink'),true);
  body+=text(26,147,layout.heading.substring(0,w===414?38:100),18);
  layout.fields.forEach((field,i)=>{body+=rect(26,195+i*100,w-52,80,'white',14,color('line'))+text(42,225,field.substring(0,w===414?42:110),14)+text(42,253,'No connected records / optional input',12,color('muted'));});
  body+=rect(26,690,w-52,52,'#E9E4E1',26)+text(42,722,layout.cta.substring(0,w===414?40:110),13,color('muted'));
  body+=text(26,790,'Design study · No operation submitted',12,color('muted'));
  const dir=path.join(out,'screen-families');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,family.id+'.svg'),svg(w,860,family.id+' '+family.title+' — editable wireframe study',body));
}
catalog.completeHighFidelityScreenLibrary='133 dedicated HTML frame studies; not native Figma screens or complete service implementations';
fs.writeFileSync(path.join(base,'screen-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(base,'screen-catalog.js'),'window.GLAM_SCREEN_CATALOG='+JSON.stringify(catalog)+';\n');
const ia={version:D.version,applications:[{id:'ios',type:'native consumer design',navigation:D.mobileTabs},{id:'android',type:'native consumer design',navigation:D.mobileTabs},{id:'consumer',type:'responsive consumer web',navigation:D.webNav},...Object.entries(D.workspaces).map(([id,c])=>({id,type:'role-specific web',navigation:c.modules}))],advisor:'contextual; no sixth primary tab',legacySurfaceRule:'Landing-only/mobile-only non-admin design restriction superseded by latest explicit brief',runtimeApplication:'unchanged foundation; no new service authorization',inventory:'screen-catalog.json'};
fs.writeFileSync(path.join(base,'information-architecture.json'),JSON.stringify(ia,null,2)+'\n');
const manifest={version:D.version,nativeFigmaFile:'not created; no Figma authoring tool connected',tokens:'../tokens.json',components:'../components.json',editableVectorFrames:['mobile-home.svg','desktop-complete-look.svg','components.svg','wireframe-mobile-home.svg','wireframe-desktop-complete-look.svg'],format:'SVG text/shapes with embedded original WebP image fills; not native Figma components/auto-layout',figmaImportVerification:'not performed',primaryHighFidelity:'HTML/CSS prototype and captured frames',fullScreenLibrary:'133 dedicated HTML frame studies and screen-families/*.svg wireframe studies; native Figma library outstanding'};
fs.writeFileSync(path.join(out,'handoff-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Exported 5 primary SVG studies, 133 task wireframes, token/component handoff and ${originalFamilies.length} consumer + ${webFamilies.length} web + ${workspaceFamilies.length} workspace screen-family specifications. Native Figma authoring remains outstanding.`);
