const { chromium } = require('playwright'); const fs=require('fs'); const L='libs/node_modules/';
const T=process.env.THEME||'dark',P=process.env.PLAT||'ios';
const map={'react@18.3.1':L+'react/umd/react.development.js','react-dom@18.3.1':L+'react-dom/umd/react-dom.development.js','@babel/standalone@7.29.0':L+'@babel/standalone/babel.min.js'};
const SKIP=new Set(JSON.parse(process.env.SKIP||'[]'));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:500,height:900}});
await p.route('https://unpkg.com/**',r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes('/'+k+'/'));r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(map[k])});});
await p.goto('http://localhost:8765/GLAM%20All%20Screens.html');await p.waitForFunction(()=>window.SC&&window.SC.length>200,null,{timeout:120000});
fs.mkdirSync('shots/'+T+'_'+P,{recursive:true});
const ids=await p.evaluate(()=>window.SC.map(s=>s.id));let n=0;
for(const id of ids){ if(SKIP.has(id)||id==='DS')continue;
 await p.evaluate(async([id,T,P])=>{const s=window.SC.find(x=>x.id===id);document.body.innerHTML='<div id=h style="position:absolute;left:0;top:0"></div>';const root=ReactDOM.createRoot(document.getElementById('h'));root.render(React.createElement(Ctx.Provider,{value:{go(){},theme:T,live:false,plat:P,toast(){},state:'default',setState(){}}},React.createElement('div',{className:'g','data-theme':T,'data-plat':P,style:{borderWidth:'0',borderRadius:'0'}},React.createElement(s.C))));await new Promise(r=>setTimeout(r,500));},[id,T,P]);
 await p.locator('.g').screenshot({path:`shots/${T}_${P}/design_${id}.png`});n++;}
console.log('shots',n);await b.close();})();
