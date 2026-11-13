const { chromium } = require('playwright'); const fs=require('fs'); const L='libs/node_modules/';
const map={'react@18.3.1':L+'react/umd/react.development.js','react-dom@18.3.1':L+'react-dom/umd/react-dom.development.js','@babel/standalone@7.29.0':L+'@babel/standalone/babel.min.js'};
const SKIP=new Set(JSON.parse(process.env.SKIP||'[]'));
const only=process.env.ONLY?process.env.ONLY.split(','):null;
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:900,height:1400}});
  p.on('pageerror',e=>console.error('ERR',e.message));
  await p.route('https://unpkg.com/**',r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes('/'+k+'/'));r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(map[k])});});
  await p.goto('http://localhost:8765/GLAM%20All%20Screens.html');
  await p.waitForFunction(()=>window.SC&&window.SC.length>200,null,{timeout:120000});
  await p.evaluate(([T,P])=>{ window.__THEME=T;window.__PLAT=P; // mount helper + extractor
    window.__host=document.createElement('div');window.__host.style.cssText='position:absolute;left:0;top:0;width:900px;height:1400px;z-index:9999;background:#888;overflow:visible';document.body.appendChild(window.__host);
    window.__mount=async(id,H,rec)=>{
      const s=window.SC.find(x=>x.id===id);const C=s.C;
      window.__host.innerHTML='';const box=document.createElement('div');window.__host.appendChild(box);
      const root=ReactDOM.createRoot(box);
      const ctx={go:(t)=>rec.push(['go',t]),theme:window.__THEME,live:false,plat:window.__PLAT,toast:(m)=>rec.push(['toast',String(m)]),state:'default',setState(){}};
      root.render(React.createElement(Ctx.Provider,{value:ctx},React.createElement('div',{className:'g','data-theme':window.__THEME,'data-plat':window.__PLAT,style:{height:H+'px',position:'absolute',left:'0px',top:'0px',borderWidth:'0px',borderRadius:'0px'}},React.createElement(C))));
      await new Promise(r=>setTimeout(r,250));
      const imgs=[...window.__host.querySelectorAll('img')];await Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r})));
      // wait for bg sprite
      await new Promise(r=>setTimeout(r,200));
      return {root,g:box.querySelector('.g')};
    };
    const col=(c)=>{const m=c&&c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);const al=a.length>3?a[3]:1;if(al===0)return null;return ((Math.round(al*255)<<24)|(a[0]<<16)|(a[1]<<8)|a[2])>>>0;};
    const px=v=>{const n=parseFloat(v);return isNaN(n)?0:n};
    window.__extract=(g)=>{
      const gr=g.getBoundingClientRect();let ix=0;
      const INTER=el=>{const t=el.tagName;if(t==='BUTTON'||t==='A')return true;if(el.getAttribute('role')==='switch')return true;const cs=getComputedStyle(el);return cs.cursor==='pointer'&&t!=='HTML'};
      function walk(el,pr,scrollParent){
        const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return null;
        if(el.classList.contains('sb'))return null;
        const r=el.getBoundingClientRect();
        const n={x:r.left-pr.left,y:r.top-pr.top,w:r.width,h:r.height};
        const bg=col(cs.backgroundColor);if(bg!==null)n.bg=bg;
        const bi=cs.backgroundImage;
        if(bi&&bi!=='none'){
          const m=bi.match(/url\("?([^")]+)"?\)/);
          if(m){n.img={u:m[1].split('/').pop(),sz:cs.backgroundSize.split(' ').map(px),pos:cs.backgroundPosition.split(' ').map(px)}}
          else if(bi.startsWith('repeating-conic-gradient')){const cs2=[...bi.matchAll(/rgba?\([^)]+\)/g)].map(m=>col(m[0]));n.checker={a:cs2[0],b:cs2[2]!==undefined?cs2[2]:cs2[1],size:px(cs.backgroundSize.split(' ')[0])};}
          else if(bi.startsWith('linear-gradient')||bi.startsWith('conic-gradient'))n.grad=bi;
        }
        const bw=[cs.borderTopWidth,cs.borderRightWidth,cs.borderBottomWidth,cs.borderLeftWidth].map(px);
        if(bw.some(x=>x>0)){n.bw=bw;n.bc=[cs.borderTopColor,cs.borderRightColor,cs.borderBottomColor,cs.borderLeftColor].map(col)}
        const rad=[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomRightRadius,cs.borderBottomLeftRadius].map(v=>v.includes('%')?parseFloat(v)/100*Math.min(r.width,r.height):px(v));
        if(rad.some(x=>x>0))n.rad=rad;
        if(+cs.opacity<1)n.op=+cs.opacity;
        if(cs.filter!=='none')n.filter=cs.filter;
        const bf=cs.backdropFilter||cs.webkitBackdropFilter;if(bf&&bf!=='none')n.bf=px((bf.match(/blur\(([^)]+)\)/)||[])[1]);
        if(cs.boxShadow!=='none')n.sh=cs.boxShadow;
        if(cs.clipPath!=='none')n.clip=cs.clipPath;
        if(cs.outlineStyle!=='none'&&px(cs.outlineWidth)>0)n.ol=[px(cs.outlineWidth),col(cs.outlineColor),px(cs.outlineOffset)];
        const ov=cs.overflowY;if(cs.overflowX==='hidden'||ov==='hidden'||ov==='auto'||ov==='scroll'||cs.overflowX==='auto')n.clipc=1;
        const scrolls=(ov==='auto'||ov==='scroll')&&el.scrollHeight>el.clientHeight+2;
        if(scrolls){n.scroll=el.scrollHeight}
        const nr={left:r.left,top:r.top};
        if(INTER(el)){n.ix=ix++}
        const pr_=el.getAttribute('aria-pressed');if(pr_!==null)n.pressed=pr_==='true'?1:0;
        if(el.getAttribute('role')==='switch')n.sw=el.getAttribute('aria-checked')==='true'?1:0;
        if(cs.backgroundClip==='content-box')n.bgpad=[px(cs.paddingTop),px(cs.paddingRight),px(cs.paddingBottom),px(cs.paddingLeft)];
        if(el.tagName==='IMG'){n.imgtag=el.getAttribute('src').split('/').pop();n.fit=cs.objectFit}
        if(el.tagName==='INPUT'&&el.type==='range'){n.range=[+el.value,+el.min||0,+el.max||100]}
        else if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){n.input={v:el.value,ph:el.placeholder||'',ml:el.tagName==='TEXTAREA',pw:el.type==='password',pad:[px(cs.paddingTop),px(cs.paddingRight),px(cs.paddingBottom),px(cs.paddingLeft)]};}
        if(n.input||n.range){n.t=textStyle(cs)}
        const kids=[];
        for(const c of el.childNodes){
          if(c.nodeType===3){
            const raw=c.textContent;let tx=cs.whiteSpace.startsWith('pre')?raw:raw.replace(/\s+/g,' ');if(!tx.trim())continue;
            const rg=document.createRange();rg.selectNodeContents(c);const rs=[...rg.getClientRects()].filter(q=>q.width>0);if(!rs.length)continue;
            const ur={left:Math.min(...rs.map(q=>q.left)),top:Math.min(...rs.map(q=>q.top)),right:Math.max(...rs.map(q=>q.right)),bottom:Math.max(...rs.map(q=>q.bottom))};
            if(rs.length>1){ // capture the browser's exact line breaks
              const L=[];let prev=null,cur='';
              for(let i=0;i<raw.length;i++){const r2=document.createRange();r2.setStart(c,i);r2.setEnd(c,i+1);const q=r2.getBoundingClientRect();if(q.width===0&&q.height===0)continue;
                if(prev!==null&&Math.abs(q.top-prev)>5){L.push(cur);cur=''}prev=q.top;cur+=raw[i];}
              L.push(cur);tx=L.map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length).join('\n');
            } else if(!cs.whiteSpace.startsWith('pre'))tx=tx.trim();
            if(cs.textTransform==='uppercase')tx=tx.toUpperCase();
            kids.push({txt:tx,x:ur.left-r.left,y:ur.top-r.top,w:ur.right-ur.left,h:ur.bottom-ur.top,lines:rs.length>1?Math.round(rs.reduce((a,q)=>Math.max(a,q.bottom),0)>0?(ur.bottom-ur.top)/ (px(cs.lineHeight)||px(cs.fontSize)*1.2):1):1,t:textStyle(cs)});
          } else if(c.nodeType===1){const k=walk(c,nr);if(k)kids.push(k)}
        }
        if(kids.length)n.k=kids;
        return n;
      }
      function textStyle(cs){return {fs:px(cs.fontSize),fw:+cs.fontWeight,disp:/Georgia/.test(cs.fontFamily)?1:0,ls:cs.letterSpacing==='normal'?0:px(cs.letterSpacing),lh:cs.lineHeight==='normal'?0:px(cs.lineHeight),c:col(cs.color),ta:cs.textAlign,pre:cs.whiteSpace.startsWith('pre')?1:0,nw:cs.whiteSpace==='nowrap'?1:0,td:cs.textDecorationLine==='underline'?1:0}}
      const tree=walk(g,{left:gr.left,top:gr.top});
      return tree;
    };
  },[process.env.THEME||'dark',process.env.PLAT||'ios']);
  const ids=await p.evaluate(()=>window.SC.map(s=>s.id));
  const out={};const fails=[];
  for(const id of ids){
    if(SKIP.has(id)||id==='DS'||(only&&!only.includes(id)))continue;
    try{
      const a=await p.evaluate(async id=>{const rec=[];const m=await window.__mount(id,844,rec);const t=window.__extract(m.g);m.root.unmount();return t},id);
      const b2=await p.evaluate(async id=>{const rec=[];const m=await window.__mount(id,944,rec);const t=window.__extract(m.g);m.root.unmount();return t},id);
      const acts=await p.evaluate(async id=>{const rec=[];const m=await window.__mount(id,844,rec);
        const q=()=>[...m.g.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&!e.classList.contains('sb')&&(e.tagName==='BUTTON'||e.tagName==='A'||e.getAttribute('role')==='switch'||(cs.cursor==='pointer'&&e.tagName!=='HTML'))});
        const total=q().length;
        const res={};
        for(let i=0;i<total;i++){rec.length=0;try{const cur=q();if(cur[i])cur[i].click()}catch(e){}await new Promise(r=>setTimeout(r,5));const g=rec.find(x=>x[0]==='go');if(g)res[i]=g[1];else if(rec.length)res[i]='toast:'+rec[0][1];}
        m.root.unmount();return res},id);
      out[id]={a,b:b2,acts};
    }catch(e){fails.push([id,String(e.message).slice(0,120)])}
  }
  fs.writeFileSync(process.env.OUT||'extract.json',JSON.stringify(out));
  console.log('ok',Object.keys(out).length,'fails',JSON.stringify(fails));
  await b.close();
})();
