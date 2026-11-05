(() => {
  'use strict';
  const D = window.GLAM_DESIGN;
  const query = new URLSearchParams(location.search);
  const allowedScreens = ['home','discover','look','studio','complete','compare','shop','profile','onboarding'];
  const S = {
    surface: D.surfaces.some(([id]) => id === query.get('surface')) ? query.get('surface') : 'ios',
    screen: allowedScreens.includes(query.get('screen')) ? query.get('screen') : 'home',
    previewState: D.componentStates.includes(query.get('state')) ? query.get('state') : 'default',
    audience: ['adult','teen','child','unknown'].includes(query.get('audience')) ? query.get('audience') : 'adult',
    wireframe: query.get('mode') === 'wireframe', rtl: query.get('dir') === 'rtl',
    look: Math.max(0, Math.min(3, Math.trunc(Number(query.get('look')) || 0))),
    family: query.get('family') || 'M01', module: query.get('module') || '', sort: 'Best Match', component: 'Hair', currency: 'USD',
    adminRole: 'Super Admin', campaignStep: 0, occasionStep: 0,
    occasion: {kind:'Evening event',date:'',place:'',budget:''},
    dialog: null, focusReturn: null, toastTimer: null, selectedObjective: 'Look discovery'
  };
  const root = document.getElementById('review-content');
  const dialogRoot = document.getElementById('dialog-root');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    home:'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    discover:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M16 8l-2.5 5.5L8 16l2.5-5.5z',
    studio:'M4 20L17 7l3 3L7 23z M17 1v3 M22 6h-3 M5 1v4 M3 3h4 M10 7v4 M8 9h4',
    shop:'M5 7h14l1 14H4z M9 8V6a3 3 0 0 1 6 0v2',
    profile:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 22v-2a8 8 0 0 1 16 0v2',
    search:'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z M16 16l6 6',
    bell:'M5 16V9a7 7 0 0 1 14 0v7l2 3H3z M9 22h6',
    arrow:'M4 12h16 M14 6l6 6-6 6', back:'M20 12H4 M10 6l-6 6 6 6',
    heart:'M12 21L3 12A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 9 7z',
    plus:'M12 4v16 M4 12h16', close:'M5 5l14 14 M19 5L5 19',
    spark:'M12 2l2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z',
    camera:'M3 7h4l2-3h6l2 3h4v14H3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    lock:'M5 10h14v12H5z M8 10V6a4 4 0 0 1 8 0v4',
    check:'M4 12l5 5L21 5', menu:'M3 6h18 M3 12h18 M3 18h18',
    calendar:'M3 5h18v17H3z M7 2v6 M17 2v6 M3 11h18',
    chart:'M4 20V4 M4 20h18 M8 15l4-5 4 2 5-7',
    layers:'M2 7l10-5 10 5-10 5z M2 12l10 5 10-5 M2 17l10 5 10-5',
    info:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 11v6 M12 7v1',
    undo:'M3 8h10a8 8 0 0 1 0 16 M3 8l5-5 M3 8l5 5'
  };
  const icon = (name, size=20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(paths[name] || paths.layers).split(' M').map((p,i)=>`<path d="${i?'M':''}${p}"/>`).join('')}</svg>`;
  const action = (label, name, extra='', kind='button') => `<button class="${kind}" data-action="${name}" ${extra}>${label}</button>`;
  const ib = (name, label, command, extra='') => `<button class="icon-button" aria-label="${label}" data-action="${command}" ${extra}>${icon(name)}</button>`;
  const brand = () => `<span class="wordmark">${icon('spark',19)} GLAM<span>AI</span></span>`;
  const photo = (id, className='', inner='') => `<div class="photo portrait-${id} ${className}" role="img" aria-label="Original AI-generated editorial styling illustration ${id+1}; not a customer or try-on result">${inner}</div>`;
  const productImage = (id, className='') => `<div class="product-image product-${id} ${className}" role="img" aria-label="Unbranded illustrative ${esc(D.products[id].kind.toLowerCase())}; not verified inventory"></div>`;
  const look = () => D.looks[S.look];
  const eligible = () => S.audience === 'adult';
  function toast(message) {
    const node = document.getElementById('toast'); node.textContent = message;
    clearTimeout(S.toastTimer); S.toastTimer = setTimeout(() => { node.textContent=''; }, 4000);
  }
  function setScreen(screen) { S.screen=screen; S.previewState='default'; render(); }
  function syncControls() {
    document.getElementById('surface').value=S.surface;
    document.getElementById('state').value=S.previewState;
    document.getElementById('audience').value=S.audience;
    document.getElementById('wireframe').checked=S.wireframe;
    document.getElementById('rtl').checked=S.rtl;
    document.documentElement.dir=S.rtl?'rtl':'ltr';
    document.body.classList.toggle('wireframe',S.wireframe);
    const url=new URLSearchParams({surface:S.surface,screen:S.screen,state:S.previewState,audience:S.audience});
    if(S.surface==='library')url.set('family',S.family);
    if(D.workspaces[S.surface]&&S.module)url.set('module',S.module);
    if(S.wireframe)url.set('mode','wireframe'); if(S.rtl)url.set('dir','rtl');
    url.set('look',String(S.look)); history.replaceState(null,'',`?${url}`);
  }
  function stateCard() {
    const states={
      loading:['Preparing the layout','Loading state preview. No AI request is running.','spark'],
      empty:['A little space for something new','Empty state preview. Explore inspiration or return when a qualified service is connected.','layers'],
      error:['Something needs another look','Error state preview. Your original and accepted obligations would remain protected. No operation ran here.','info'],
      offline:['A moment offline','Offline state preview. Saved local content can stay visible; uploads, quotes and transactions wait for a verified connection.','info'],
      denied:['Permission is needed','Permission-denied layout. A safe manual alternative and consent information belong here. This preview never activates a camera.','lock'],
      success:['Success layout preview','A real success screen requires authoritative server confirmation. This is an illustrative state, not a completed generation, purchase or booking.','check']
    };
    const [title,body,symbol]=states[S.previewState] || states.empty;
    return `<section class="state-card" data-kind="${S.previewState}" role="${S.previewState==='error'?'alert':'status'}"><div class="state-icon">${icon(symbol,30)}</div><h2>${title}</h2><p>${body}</p>${S.previewState==='loading'?'<div class="progress-track"><div></div></div>':''}${action('Return to default layout','reset-state','','button secondary')}</section>`;
  }
  function ageCard() {
    const child=S.audience==='child';
    return `<div class="notice">${child?'Guardian-managed child':'Restricted '+esc(S.audience)} layout review. No age assurance, guardian or market policy is connected.</div><section class="empty-card"><div class="eyebrow">Style, with the right safeguards</div><h1 class="app-page-title">${child?'Explore together.':'Your style. Your boundaries.'}</h1><p>Curated, age-appropriate inspiration is planned. Facial processing, public sharing, targeted advertising and purchase authority remain unavailable in this concept.</p><button class="button full" disabled style="margin-top:20px">${child?'Guardian connection required':'Eligibility connection required'}</button></section>`;
  }
  function lookCard(item) {
    return `<button class="look-card" data-action="open-look" data-look="${item.id}" aria-label="View ${esc(item.title)}">${photo(item.id)}<div class="look-info"><strong>${item.title}</strong><small>${item.category} · Concept look</small></div></button>`;
  }
  function productCard(item, draft=false) {
    return `<article class="product-card">${productImage(item.id)}<div class="product-info"><span class="eyebrow" style="font-size:8px">${draft?'Unpublished draft layout':'Illustrative item'}</span><h3>${item.name}</h3><p>Price unavailable · Stock unverified</p>${action(draft?'Review draft':'View details',draft?'catalog-editor':'product',`data-product="${item.id}"`,'text-button')}</div></article>`;
  }
  function mobileHeader() {
    return `<div class="app-head">${brand()}<div class="row" style="gap:3px">${action(`Region / ${S.currency}`,'region','','region-button')}${ib('search','Search styles','search')}${ib('bell','Notifications','notifications')}</div></div>`;
  }
  function activeTab() {
    return ({home:'Home',onboarding:'Home',discover:'Discover',look:'Discover',studio:'Studio',complete:'Shop',compare:'Shop',shop:'Shop',profile:'Profile'})[S.screen];
  }
  function mobileNav() {
    const arabic=['الرئيسية','اكتشف','الاستوديو','تسوق','حسابي'];
    return `<nav class="bottom-nav" aria-label="Mobile primary navigation">${D.mobileTabs.map((tab,i)=>`<button data-action="tab" data-tab="${tab}" aria-label="${tab}" ${activeTab()===tab?'aria-current="page"':''}>${icon(['home','discover','studio','shop','profile'][i])}<span ${S.rtl?'lang="ar"':''}>${S.rtl?arabic[i]:tab}</span></button>`).join('')}</nav>`;
  }
  function homeContent() {
    if(!eligible())return ageCard();
    return `${action(`Search looks, styles, occasions ${icon('search',18)}`,'search','','mobile-search')}${photo(0,'mobile-hero',`<span class="image-label">Editorial concept image</span><div class="hero-copy"><div class="eyebrow">Every Look. Every Style. Everyone.</div><h1>Find Your<br><em>Next Look.</em></h1>${action(`Try a Look ${icon('arrow',16)}`,'navigate','data-screen="discover"','button light')}</div>`)}<div class="chips" aria-label="Style categories">${['Hair','Makeup','Fashion','Grooming','Modest Style','Accessories','Occasions'].map(name=>action(name,name==='Occasions'?'occasion':'category',`data-category="${name}"`,'')).join('')}</div><div class="section-head"><h2>Discover a different direction</h2>${action('View all','navigate','data-screen="discover"','text-button')}</div><div class="look-grid">${D.looks.slice(1,3).map(lookCard).join('')}</div><section class="home-editorial"><span class="pill ai">${icon('spark',13)} Occasion Concierge</span><h2>A look for the moment.<br>A plan for the details.</h2><p>Choose an occasion and a budget. Review what is known before you commit.</p>${action('Plan an occasion','occasion','','text-button')}</section><div class="section-head"><h2>For your budget</h2><span class="sample-note">Not yet priced</span></div><p class="small">Complete the Look will account for verified products, delivery and the full service cost.</p>${action('Explore Complete the Look','navigate','data-screen="complete"','button secondary full')}<div class="section-head"><h2>Professionals & creators</h2></div><div class="empty-card"><p>Verified local professionals and licensed creator collections will appear here when connected.</p>${action('Preview a look request','booking','','text-button')}</div>`;
  }
  function discoverContent() {
    if(!eligible())return ageCard();
    return `<div class="eyebrow">A point of view, made yours</div><h1 class="app-page-title">Discover your<br>next chapter.</h1>${action(`Search or upload inspiration ${icon('search',18)}`,'search','','mobile-search')}<div class="chips">${['For you','Hair & grooming','Fashion','Modest style','Occasions'].map((n,i)=>`<button data-action="category" data-category="${n}" aria-pressed="${i===0}">${n}</button>`).join('')}</div><div class="section-head"><h2>Concept collections</h2><span class="sample-note">Illustrative curation</span></div><div class="look-grid">${D.looks.map(lookCard).join('')}</div><div class="notice">These are original editorial illustrations, not customer results, measured trends or verified merchant offers.</div>`;
  }
  function lookContent() {
    if(!eligible())return ageCard();
    return `<div class="back-row">${ib('back','Back to discovery','navigate','data-screen="discover"')}<span>Concept look</span>${ib('heart','Save concept look','save')}</div>${photo(S.look,'look-detail-image')}<div class="look-detail-title"><div class="eyebrow">${look().category}</div><h1>${look().title}</h1><p>${look().note}</p><div class="row">${action('Try this look','navigate','data-screen="studio"')}${action('Complete the Look','navigate','data-screen="complete"','button secondary')}</div><p class="sample-note" style="margin-top:16px">Editorial concept only. No analysis, product match or generation has been performed.</p></div>`;
  }
  function studioImage(desktop=false) {
    return photo(S.look,'studio-image',`<div class="studio-top"><span class="pill">${icon('lock',13)} Private by default</span><span class="pill">Illustrative image</span></div><div class="compare-line" id="compare-line"></div>`);
  }
  function studioControls() {
    return `<div class="eyebrow">AI Studio · Layout preview</div><h1 class="flow-heading">Your look.<br>Your controls.</h1><div class="chips" aria-label="Studio components">${['Hair','Makeup','Outfit','Accessories'].map(n=>`<button data-action="studio-component" data-component="${n}" aria-pressed="${S.component===n}">${n}</button>`).join('')}</div><p class="small" style="margin-top:14px">${esc(S.component)} controls · A real edit requires consent, eligible input and an accepted server quote.</p><label for="compare-slider">Compare layout: original / simulation</label><input id="compare-slider" type="range" min="0" max="100" value="50" aria-label="Comparison slider"><p class="sample-note">Both sides use the same editorial image. This previews the comparison control, not a generated transformation.</p><div class="studio-controls">${action(icon('undo',16)+' Undo','undo','','button secondary')}${action('Save','save','','button secondary')}</div>${action('Preview generation states','generation','','button secondary full')}${action('Complete the Look','navigate','data-screen="complete"','button full')}<p class="sample-note" style="margin-top:13px">A real generation is shown as ready only after server verification.</p>`;
  }
  function studioContent() {
    if(!eligible())return `<div style="padding:18px">${ageCard()}</div>`;
    return `${studioImage()}<section class="studio-bottom"><details open><summary>Customize this look</summary>${studioControls()}</details></section>`;
  }
  function sortControls() {
    return `<div class="sort-group" aria-label="Offer sorting">${['Best Match','Lowest Total Cost','Fastest Available'].map(n=>`<button data-action="sort" data-sort="${n}" aria-pressed="${S.sort===n}">${n}</button>`).join('')}</div>${S.sort==='Best Match'?'':`<div class="notice">${S.sort==='Lowest Total Cost'?'A firm lowest-total ranking needs verified item, shipping, tax and full service costs.':'Arrival ranking needs source-backed delivery windows and professional availability.'} No such evidence is connected in this preview.</div>`}`;
  }
  function componentList() {
    const lines=[['Hair','Professional feasibility required',null],['Makeup','Price pending · Availability unverified',2],['Clothing','Price pending · Delivery unknown',0],['Shoes & bag','Price pending · Delivery unknown',1],['Accessories','Price pending · Availability unverified',3],['Professional service','Quote and real availability required',null]];
    return `<section class="component-list" aria-label="Look components">${lines.map(([name,note,id])=>`<article class="component-line">${id===null?`<div class="component-icon">${icon(name==='Hair'?'studio':'calendar',23)}</div>`:productImage(id)}<div><h3>${name}</h3><p>${note}</p></div>${ib(id===null?'arrow':'plus',id===null?'Preview professional request':'View '+name,id===null?'booking':'product',id===null?'':`data-product="${id}"`)}</article>`).join('')}</section>`;
  }
  function sponsoredExample() {
    if(!eligible())return '<div class="sample-note">Sponsored placement preview is suppressed in this age mode.</div>';
    return `<details class="sponsored-demo"><summary><span class="pill">Sponsored</span> Placement layout example</summary><p class="small" style="margin-top:15px">No advertiser is connected. A real placement must disclose its identity, have an eligible evidenced offer and never change organic analysis.</p>${action('Why this ad?','why-ad','','text-button')}</details>`;
  }
  function completeContent() {
    if(!eligible())return ageCard();
    return `<div class="eyebrow">The details, brought together</div><h1 class="app-page-title">Complete<br>the Look.</h1>${photo(S.look,'complete-photo')}<p class="sample-note" style="margin:12px 0">Concept look. Six planned components; no verified merchant matches.</p>${sortControls()}${componentList()}${sponsoredExample()}<div class="notice rose">Total not confirmed. Prices, stock, delivery and professional feasibility need real evidence.</div><div class="sticky-actions">${action('Save Look','save','','button secondary')}${action('Shop the Look','handoff')}${action('Compare Offers','navigate','data-screen="compare"','text-button')}</div>`;
  }
  function offerTable() {
    return `<div class="table-scroll"><table class="offer-table"><thead><tr><th>Component</th><th>Price</th><th>Stock</th><th>Delivery</th></tr></thead><tbody>${D.products.map(p=>`<tr><td>${p.name}<br><small>Illustrative item</small></td><td>Unavailable</td><td>Unverified</td><td>Unknown</td></tr>`).join('')}</tbody></table></div>`;
  }
  function compareContent() {
    if(!eligible())return ageCard();
    return `<div class="eyebrow">Look comparison</div><h1 class="app-page-title">The whole cost.<br>Clearly considered.</h1><p class="app-page-sub">Compare the delivered obligation, not just a headline price.</p>${sortControls()}${offerTable()}<div class="notice">No complete total or fastest-arrival claim can be made from unconfirmed facts.</div>${action('Review merchant handoff','handoff','','button full')}${action('Back to Complete the Look','navigate','data-screen="complete"','text-button')}`;
  }
  function shopContent() {
    if(!eligible())return ageCard();
    return `<div class="eyebrow">Choose what brings it together</div><h1 class="app-page-title">Good details.<br>Real possibilities.</h1><p class="app-page-sub">Product-card layout study. Illustrations are not connected inventory.</p><div class="chips">${['All','Beauty','Fashion','Accessories'].map((n,i)=>`<button data-action="category" data-category="${n}" aria-pressed="${i===0}">${n}</button>`).join('')}</div><div class="product-grid">${D.products.map(p=>productCard(p)).join('')}</div>${action('View shopping plan','navigate','data-screen="complete"','button secondary full')}<div class="section-head"><h2>For the look, not just the list</h2></div><p class="small">Choose a budget and occasion before considering a purchase.</p>${action('Plan an occasion','occasion','','text-button')}`;
  }
  function profileContent() {
    if(!eligible())return ageCard();
    return `<div class="eyebrow">Your account. Your choices.</div><h1 class="app-page-title">A companion<br>that listens.</h1><p class="app-page-sub">Your preferences stay under your control. No account or memory is created in this preview.</p><button class="button full" disabled>Google / Supabase not connected</button>${[['Style DNA','Inspect, edit, reset','dna'],['Wardrobe & saved looks','Private by default','saved'],['Plans & AI credits','No live billing','billing'],['Privacy & consent','Your purposes, your choice','privacy'],['Accessibility & language','Inclusive controls','accessibility'],['Export or delete my data','No data collected here','privacy']].map(([title,note,cmd])=>`<button class="account-link" data-action="${cmd}"><span>${title}<br><small>${note}</small></span>${icon('arrow',16)}</button>`).join('')}`;
  }
  function onboardingContent() {
    return `<div class="eyebrow">Every Look. Every Style. Everyone.</div><h1 class="app-page-title">Start with<br>what feels like you.</h1><p class="app-page-sub">A guided entry, with optional preferences and clear permission choices.</p>${action('Region & language','region','','account-link')}${action('Age-appropriate entry','eligibility','','account-link')}${action('Optional Style DNA','dna','','account-link')}${action('Photo purpose & consent','capture','','account-link')}<button class="button full" disabled style="margin-top:20px">Account connection required</button><p class="sample-note" style="margin-top:12px">Google/Supabase remains selected. Signup and recovery follow the provider; no parallel password system is introduced.</p>`;
  }
  function consumerContent() {
    return ({home:homeContent,discover:discoverContent,look:lookContent,studio:studioContent,complete:completeContent,compare:compareContent,shop:shopContent,profile:profileContent,onboarding:onboardingContent})[S.screen]();
  }
  function mobileView() {
    const footer=S.screen==='complete'&&S.previewState==='default'&&eligible()?`<div class="mobile-footer-actions">${ib('heart','Save Look','save')}${ib('layers','Compare Offers','navigate','data-screen="compare"')}${action('Shop the Look','handoff')}</div>`:'';
    return `<section class="mobile-stage"><p class="device-label">${S.surface==='ios'?'iOS':'Android'} concept · ${esc(S.audience)} layout · No native build</p><div class="phone" data-platform="${S.surface}"><div class="statusbar"><span>9:41</span><span class="island" aria-hidden="true"></span><span>DESIGN PREVIEW</span></div>${mobileHeader()}<div class="app-main ${['studio','look'].includes(S.screen)?'edge':''}">${S.previewState!=='default'?stateCard():consumerContent()}</div>${footer}<div class="advisor-dock">${action(`${icon('spark',17)} Ask GLAM`,'advisor','','advisor-trigger')}</div>${mobileNav()}</div></section>`;
  }
  function desktopSummary() {
    return `<aside class="desktop-summary"><h2>Your look, item by item.</h2><div class="total-row"><span>Items & materials</span><strong>Pending</strong></div><div class="total-row"><span>Delivery, tax & duties</span><strong>Unknown</strong></div><div class="total-row"><span>Full service cost</span><strong>Quote needed</strong></div><div class="total-row final"><span>Delivered total</span><strong>Unconfirmed</strong></div><p class="sample-note">A budget fit is not claimed until every obligation is evidenced.</p>${action('Shop the Look','handoff')}${action('Compare Offers','navigate','data-screen="compare"','button secondary')}${action('Save Look','save','','text-button')}${action('Book the Exact Look','booking','','text-button')}</aside>`;
  }
  function desktopComplete() {
    return `<div class="web-titlebar"><div><div class="eyebrow">Discover · Try · Personalize · Complete</div><h1>Complete the Look.</h1><p>${look().title} · Editorial concept, no live product matches</p></div><div class="row">${action(`${icon('studio',16)} Try this look`,'navigate','data-screen="studio"','button secondary')}${action(`${icon('spark',16)} Ask GLAM`,'advisor','','button secondary')}</div></div><div class="web-complete">${photo(S.look,'desktop-look',`<div class="look-image-caption"><strong>${look().title}</strong><br>Original editorial illustration. Not a generated customer result.</div>`)}<section class="desktop-components"><div class="section-head"><h2>Everything that makes the look</h2></div>${sortControls()}${componentList()}${sponsoredExample()}</section>${desktopSummary()}</div>`;
  }
  function desktopHome() {
    return `<section class="desktop-hero"><div><div class="eyebrow">Every Look. Every Style. Everyone.</div><h1>Find your<br><em>next look.</em></h1><p>A personal style companion for every background, body and budget. Explore a point of view, try a direction, and consider the whole look before you commit.</p><div class="row">${action('Start discovering '+icon('arrow',16),'navigate','data-screen="discover"')}${action('Plan an occasion','occasion','','button secondary')}</div><p class="sample-note" style="margin-top:20px">Inclusive discovery and real-world outcomes are the vision. All imagery and collections here are illustrative.</p></div>${photo(0)}</section><div class="section-head"><h2>Expression has more than one direction.</h2>${action('View collections','navigate','data-screen="discover"','text-button')}</div><div class="web-card-grid">${D.looks.map(lookCard).join('')}</div>`;
  }
  function desktopStudio() {
    if(!eligible())return ageCard();
    return `<div class="web-titlebar"><div><div class="eyebrow">AI Studio · Three-column workspace</div><h1>A little possibility.<br>A lot of control.</h1></div><span class="pill">Illustrative state only</span></div><div class="web-studio"><section class="studio-bottom">${studioControls()}</section>${studioImage(true)}${desktopSummary()}</div>`;
  }
  function webView() {
    const active=({studio:'AI Studio',complete:'Shop the Look',compare:'Shop the Look',shop:'Shop the Look'})[S.screen]||'Discover';
    let content;
    if(!eligible()&&S.screen!=='home')content=ageCard();
    else if(S.previewState!=='default')content=stateCard();
    else if(S.screen==='complete')content=desktopComplete();
    else if(S.screen==='studio')content=desktopStudio();
    else if(S.screen==='home')content=desktopHome();
    else if(S.screen==='discover')content=`<div class="web-titlebar"><div><div class="eyebrow">Expression, without assumptions</div><h1>Discover a different direction.</h1><p>Illustrative collections, not measured trends or merchant inventory.</p></div>${action('Screenshot to Shop','search','','button secondary')}</div><div class="web-card-grid">${D.looks.map(lookCard).join('')}</div>`;
    else if(S.screen==='look')content=`<div class="desktop-hero"><div><div class="eyebrow">${look().category}</div><h1>${look().title}</h1><p>${look().note}</p><div class="row">${action('Try this look','navigate','data-screen="studio"')}${action('Complete the Look','navigate','data-screen="complete"','button secondary')}</div></div>${photo(S.look)}</div>`;
    else if(S.screen==='shop')content=`<div class="web-titlebar"><div><h1>The details, thoughtfully chosen.</h1><p>Illustrative unbranded product-card study. All commercial evidence is unavailable.</p></div></div><div class="web-card-grid">${D.products.map(p=>productCard(p)).join('')}</div>`;
    else content=`<div style="max-width:900px;margin:35px auto">${consumerContent()}</div>`;
    return `<div class="web-shell"><header class="web-header">${action(brand(),'navigate','data-screen="home"','icon-button bare')}<div class="web-actions">${action(`Region / ${S.currency}`,'region','','region-button')}${ib('search','Search','search')}${ib('heart','Saved looks','saved')}${ib('profile','Account','navigate','data-screen="profile"')}${ib('shop','Shopping plan','navigate','data-screen="complete"')}</div></header><nav class="web-nav" aria-label="Consumer web navigation">${D.webNav.map(n=>`<button data-action="web-nav" data-item="${esc(n)}" ${n===active?'aria-current="page"':''}>${n}</button>`).join('')}</nav>${content}<footer class="web-footer"><span>GLAM AI · Original design proposal</span><span>Private by default · Explicit transaction confirmation · No live services</span></footer></div>`;
  }
  function allowedModules(kind) {
    const all=D.workspaces[kind].modules;
    if(kind!=='admin'||S.adminRole==='Super Admin')return all;
    const sets={
      'Customer Support':['User Management','Trust & Safety','Privacy'],
      'Finance':['Executive Overview','Commerce','Subscriptions','Advertising'],
      'Read-Only Analyst':['Executive Overview','AI Operations','Analytics'],
      'Content Editor':['Beauty Content','Creators'],
      'AI Operations':['AI Operations','Analytics'],
      'Compliance':['Trust & Safety','Privacy','User Management']
    };
    return sets[S.adminRole]||[];
  }
  function metrics(kind) {
    let names={merchant:['Verified products','Eligible inventory','Orders / qualified leads','Settled earnings'],advertiser:['Validated spend','Verified conversions','Attribution return','Available budget'],professional:['Confirmed bookings','Quote requests','Verified reviews','Settled earnings'],creator:['Published collections','Attributed sales','Earned commissions','Payout status'],admin:['Active app users','Recognized revenue','Verified generations','Open incidents']}[kind];
    if(kind==='admin'&&S.adminRole==='Customer Support')names=['Support requests','Account assistance','Privacy case status','Safety reports'];
    if(kind==='admin'&&S.adminRole==='Content Editor')names=['Content review','Licensed collections','Moderation status','Rights evidence'];
    if(kind==='admin'&&S.adminRole==='AI Operations')names=['Verified generations','Qualified models','Operational incidents','Evaluation evidence'];
    if(kind==='admin'&&S.adminRole==='Compliance')names=['Consent evidence','Deletion requests','Age policy reviews','Audit case status'];
    return `<div class="metric-grid">${names.map(n=>`<article class="metric"><span>${n}</span><strong>—</strong><small>Verified data not connected</small></article>`).join('')}</div>`;
  }
  function workspaceOverview(kind) {
    return `${metrics(kind)}<div class="workspace-panels"><section class="panel"><h2>${kind==='admin'?'Platform readiness':'Operational workspace'}</h2><p>${kind==='admin'?'Controls for mobile, consumer web and partner workspaces.':'The workflow stays separate from other business roles.'}</p>${['Identity and required assurance','Catalog / service evidence','Payments and reconciliation','Privacy and operational audit'].map(n=>`<div class="connection-row"><span>${n}</span><small>Not connected</small></div>`).join('')}</section><section class="panel"><h2>${kind==='professional'?'Feasibility before confirmation':kind==='advertiser'?'Clear intent. Clear disclosure.':'Next useful action'}</h2><p>${kind==='admin'?'Market, age/guardian and provider prerequisites remain server-enforced. A design flag cannot enable an unqualified capability.':'A verified organization, source rights and real business evidence are required before publication or a financial commitment.'}</p><div class="queue-empty">${icon('layers',30)}No operational records loaded.<br>Unavailable metrics are not zero.</div></section></div><section class="panel workspace-table"><h2>Recent operational evidence</h2><p>Permission, source and business-event lineage will be visible here.</p><div class="queue-empty">No records are fabricated for this design review.</div></section>`;
  }
  function campaignContent() {
    const step=D.campaignSteps[S.campaignStep];
    const body={
      Objective:`<h2>What should this campaign help people discover?</h2><div class="choice-grid">${['Look discovery','Eligible product visits'].map(n=>`<button class="choice" data-action="objective" data-objective="${n}" aria-pressed="${S.selectedObjective===n}">${icon('discover',23)}<br>${n}</button>`).join('')}</div>`,
      'Eligible products':'<h2>Choose verified eligible products</h2><p>No approved merchant feed is connected. The layout shows the required step without inventing inventory.</p>',
      Placement:'<h2>Preview the exact customer placement</h2><div class="sponsored-demo"><span class="pill">Sponsored · Layout sample</span><h3 style="margin-top:16px">A relevant finishing touch</h3><p>No advertiser or current offer is connected. Placement must not alter analysis or organic order.</p></div>',
      Budget:'<h2>A budget with clear limits</h2><label class="field">Billing currency<select disabled><option>Qualified currency required</option></select></label><label class="field">Daily cap<input disabled placeholder="Verified billing required"></label><p>Account, daily and campaign limits remain server-authoritative.</p>',
      Creative:'<h2>Rights before publication</h2><p>Product imagery, claims and any likeness require source rights, policy review and explicit approval.</p><button class="button secondary" disabled>Upload connection unavailable</button>',
      Review:'<h2>Review the complete obligation</h2><ul class="checklist"><li>Eligible products <span>Not connected</span></li><li>Rights / brand safety <span>Review required</span></li><li>Budget / billing <span>Unverified</span></li><li>Disclosure and measurement <span>Qualification required</span></li></ul>',
      Launch:'<h2>Launch requires verified readiness</h2><p>This prototype has no advertiser authorization, approved campaign, billing or delivery service.</p><button class="button" disabled>Launch unavailable</button>'
    }[step];
    return `<section class="panel"><div class="stepper" aria-label="Campaign steps">${D.campaignSteps.map((n,i)=>`<span class="${i===S.campaignStep?'active':''}"><b>${i+1}</b>${n}</span>`).join('')}</div><div class="campaign-form">${body}<div class="dialog-actions">${S.campaignStep? action('Back','campaign-back','','button secondary'):''}${S.campaignStep<6?action('Next: '+D.campaignSteps[S.campaignStep+1],'campaign-next'):''}</div></div></section>`;
  }
  function workspaceModule(kind) {
    const module=S.module;
    if(kind==='merchant'&&['Catalog','Inventory','Storefront'].includes(module))return `<section class="panel"><div class="row between"><div><h2>Catalog workspace</h2><p>Draft layouts, never automatically published facts.</p></div>${action('Create product','catalog-editor','','button compact')}</div><div class="workspace-card-grid">${D.products.map(p=>productCard(p,true)).join('')}</div><div class="notice">Images illustrate components. Price, stock, variants, shipping and returns require merchant evidence and review.</div><div class="row">${action('Preview CSV import','import','','button secondary compact')}${action('API sync requirements','import','','text-button')}</div></section>`;
    if(kind==='advertiser'&&module==='Create Campaign')return campaignContent();
    if(kind==='professional'&&['Quote Requests','Booking Calendar','Services'].includes(module))return `<section class="panel"><h2>Book the Exact Look</h2><p>Respond with feasibility, full price, materials and actual availability. A request is not a booking.</p><div class="queue-empty">${icon('calendar',32)}No real request or availability is connected.</div>${action('Review quote-request layout','booking','','button secondary')}</section>`;
    if(kind==='creator'&&['Published Looks','Shoppable Collections','Campaign Invitations'].includes(module))return `<section class="panel"><h2>Collections with a point of view</h2><p>Illustrative style directions. No collections are published by this prototype.</p><div class="workspace-card-grid">${D.looks.map(lookCard).join('')}</div><div class="notice">Likeness/content rights, disclosure, permitted audience and qualified offers are required before publication or commissions.</div><button class="button" disabled>Publishing not connected</button></section>`;
    if(kind==='admin'&&['Regional Operations','Trust & Safety','Privacy','System Configuration'].includes(module))return `<div class="workspace-panels"><section class="panel"><h2>${esc(module)}</h2><p>Web administration manages every platform surface, including mobile apps and role workspaces.</p>${['Country / age / guardian policy','Provider and feature qualification','Mobile minimum app version','Consumer web and partner roles','Scoped audit / approval / rollback'].map(n=>`<div class="connection-row"><span>${n}</span><small>Review required</small></div>`).join('')}</section><section class="panel"><h2>Privacy by default</h2><p>Private selfies, child profiles, Style DNA, wardrobes and twins are not general admin or advertiser data.</p><p>Role hiding is a layout study. Real actions require backend permission, privileged MFA and scoped evidence.</p><button class="button secondary" disabled>Policy changes unavailable</button></section></div>`;
    return workspaceOverview(kind);
  }
  function workspaceView(kind) {
    const config=D.workspaces[kind];
    if(!eligible())return `<div class="web-shell" style="padding-top:35px">${ageCard()}<div class="notice">Business and administration require eligible adult authority; this audience switch grants no access.</div></div>`;
    const modules=allowedModules(kind); if(!modules.includes(S.module))S.module=modules[0];
    const controls=kind==='admin'?`<label class="tiny">Role layout <select id="admin-role" class="role-selector" aria-label="Admin role layout">${['Super Admin','Customer Support','Finance','Read-Only Analyst','Content Editor','AI Operations','Compliance'].map(n=>`<option ${S.adminRole===n?'selected':''}>${n}</option>`).join('')}</select></label>`:'<span class="pill">Organization connection required</span>';
    const primary=kind==='merchant'?action('Create product','catalog-editor','','button compact'):kind==='advertiser'?action('Create campaign','module','data-module="Create Campaign"','button compact'):kind==='professional'?action('Quote-request layout','booking','','button secondary compact'):'<button class="button secondary compact" disabled>Verified connection required</button>';
    return `<div class="workspace"><aside class="workspace-sidebar">${brand()}<div class="workspace-kind">${config.title}</div><nav class="workspace-nav" aria-label="${kind} modules">${modules.map((n,i)=>`<button data-action="module" data-module="${esc(n)}" ${S.module===n?'aria-current="page"':''}>${icon(['home','layers','chart','calendar'][i%4],17)}${n}</button>`).join('')}</nav><div class="workspace-account">Layout review only.<br>No privileged session or real business data.</div></aside><div class="workspace-main"><header class="workspace-top"><span>${config.title} / <b id="module-breadcrumb">${esc(S.module)}</b></span><div class="row">${controls}${ib('search','Search workspace','workspace-search')}</div></header><div class="workspace-heading"><div><div class="eyebrow">Role-specific workspace</div><h1 id="module-title">${esc(S.module)}</h1><p>${config.subtitle}</p></div>${primary}</div>${S.previewState==='default'?workspaceModule(kind):stateCard()}<p class="workspace-footer">No data connection · No actions submitted · Source evidence, server authorization and audit required</p></div></div>`;
  }
  function systemView() {
    const colors=[['Ink','#17151A'],['Ivory','#F8F4F0'],['Rose','#D96B95'],['Lilac','#A98ABD'],['Gold','#C9A46A']];
    return `<section class="design-system"><div class="eyebrow">GLAM AI · Shared design language</div><h1>Expressive imagery.<br>Considered controls.</h1><p>Editorial serif for campaign moments; system sans-serif for tasks. Warm ivory, charcoal, restrained accents. Native Figma components/variants remain an external handoff task.</p><div class="swatches">${colors.map(([name,hex])=>`<div class="swatch"><div class="color" style="background:${hex}"></div><p><b>${name}</b><br>${hex}</p></div>`).join('')}</div><div class="component-samples"><h2>Actions</h2>${action('Primary action','sample')}${action('Secondary action','sample','','button secondary')}<button class="button" disabled>Unavailable</button>${ib('heart','Example save control','save')}</div><div class="component-samples"><h2>Labels</h2><span class="pill">Illustrative item</span><span class="pill ai">${icon('spark',13)} AI assistance</span><span class="pill rose">Sponsored · Sample</span></div><div class="component-samples"><h2>Inputs</h2><label class="field">Accessible field<input placeholder="Clear task-focused label"></label><label class="check"><input type="checkbox">Optional preference</label></div><div class="token-grid"><section class="panel"><h2>Typography</h2><div class="display" style="font-size:42px">Your expression.</div><p class="small">Body 15–16 px, functional labels 12–14 px, headlines adapt by viewport.</p></section><section class="panel"><h2>States</h2><p>Loading, empty, error, offline, denied and illustrative success are selectable in the review toolbar.</p></section><section class="panel"><h2>Accessibility</h2><p>Visible focus, labeled controls, logical spacing, 44 px minimum interactive targets and reduced-motion support. Formal audits/device qualification remain outstanding.</p></section></div></section>`;
  }
  function libraryView() {
    const C=window.GLAM_SCREEN_CATALOG;
    const groups=[['Consumer',C.consumerFamilies],['Consumer web',C.webFamilies],['Role workspaces',C.workspaceFamilies]];
    const families=groups.flatMap(([,items])=>items);
    const f=families.find(item=>item.id===S.family)||families[0];S.family=f.id;
    const L=f.layout;
    const options=groups.map(([title,items])=>`<optgroup label="${title}">${items.map(n=>`<option value="${n.id}" ${n.id===f.id?'selected':''}>${n.id} · ${esc(n.title)}</option>`).join('')}</optgroup>`).join('');
    const fieldCards=L.fields.map((n,i)=>`<div class="family-evidence"><span class="family-index">0${i+1}</span><div><h3>${esc(n)}</h3><p>${L.kind==='operations'?'No verified records connected':'Optional context · Not stored'}</p></div></div>`).join('');
    let body='';
    if(['gallery','studio','components','product','professional'].includes(L.kind))body=photo(S.look,'family-hero');
    if(L.kind==='products')body=`<div class="family-products">${[0,1,2,3].map(i=>productImage(i)).join('')}</div>`;
    if(L.kind==='palette')body='<div class="swatches">'+['#17151A','#F8F4F0','#D96B95','#A98ABD','#C9A46A'].map(c=>`<span class="family-swatch" style="background:${c}"></span>`).join('')+'</div><p class="sample-note">Brand palette only · No personal color result</p>';
    if(L.kind==='capture')body='<div class="family-capture">'+icon('camera',60)+'<p>Camera inactive</p><span>No photo selected or processed</span></div>';
    if(L.kind==='progress')body='<div class="progress-track"><div></div></div><p>No job is running.</p>';
    if(L.kind==='empty'||L.kind==='blocked'||L.kind==='identity')body='<div class="notice">'+icon('lock',22)+' A qualified connection is required. No private records are available in this study.</div>';
    if(L.kind==='chat')body='<div class="family-message">What would make this moment feel like you?</div><p class="sample-note">Illustrative prompt · No message sent</p>';
    body+=`<div class="family-fields">${L.fields.map((n,i)=>L.kind==='form'||L.kind==='preferences'?`<label class="field">${esc(n)}<input placeholder="Optional preview input" maxlength="120"></label>`:L.kind==='checks'?`<label class="check"><input type="checkbox">${esc(n)}</label>`:fieldCards.match(/<div class="family-evidence">[\s\S]*?<\/div><\/div>/g)?.[i]||'').join('')}</div>`;
    body+=`<button class="button full" disabled>${esc(L.cta)}</button><p class="sample-note">Design study · No operation submitted</p>`;
    const mobile=/^M\d/.test(f.id);
    const permitted=eligible()||['M01','M02','M03','M04','M56','M57','M58'].includes(f.id);
    const content=S.previewState!=='default'?stateCard():!permitted?ageCard():`<div class="eyebrow">${esc(f.title)}</div><h1 id="family-heading">${esc(L.heading)}</h1><p>${esc(L.copy)}</p>${body}`;
    return `<section class="library-shell"><div class="library-tools"><label class="field">Screen-family study<select id="family">${options}</select></label><p>${families.length} dedicated frame studies · Controls are illustrative · Use linked journeys to review interactions</p></div><div class="library-grid"><section class="family-canvas ${mobile?'family-mobile':''}" data-family="${f.id}">${brand()}<div class="family-content">${content}</div></section><aside class="panel family-notes"><div class="eyebrow">Review notes · ${esc(f.id)}</div><h2>${esc(f.title)}</h2><p>${esc(f.coverage)}</p><h3>Backend dependency</h3><p>${esc(f.backend)}</p><h3>Acceptance criteria</h3><ul>${f.acceptance.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><a class="button secondary" href="${esc(f.preview)}">Open related interactive flow</a><p>Journey ${esc(f.journey)} · Native Figma and real service validation outstanding</p></aside></div></section>`;
  }

  function render() {
    syncControls();
    root.innerHTML=(S.rtl?'<div class="rtl-note">RTL layout study · Partial Arabic navigation only; professional localization and assistive-technology review outstanding.</div>':'')+(S.surface==='ios'||S.surface==='android'?mobileView():S.surface==='consumer'?webView():S.surface==='system'?systemView():S.surface==='library'?libraryView():workspaceView(S.surface));
  }
  function openDialog(name, data={}) {
    if(!S.dialog)S.focusReturn=document.activeElement;
    S.dialog={name,data};
    const bodies={
      product:()=>{const p=D.products[data.product]||D.products[0];return [`${p.name}`,`${productImage(p.id)}<div class="eyebrow" style="margin-top:20px">Illustrative item · No verified seller</div><p>Price, variants, stock, delivery and claims require a real catalog revision. This image is not a merchant listing.</p><ul class="checklist"><li>Price <b>Unavailable</b></li><li>Stock <b>Unverified</b></li><li>Delivery / pickup <b>Unknown</b></li></ul><details><summary>Description</summary>Original unbranded design illustration, not a product efficacy or availability claim.</details><details><summary>Variants, sizes & returns</summary>Merchant evidence not connected. No fit guarantee is made.</details><div class="dialog-actions">${action('Try-on layout','dialog-studio','','button secondary')}${action('Add to look plan','add-plan')}</div>`]},
      collection:()=>['Collection placement preview',`${photo(S.look,'complete-photo')}<p>Original concept collection, not a published creator asset or qualified offer set.</p>${action('Preview customer placement','customer-placement','','button full')}`],
      handoff:()=>['Review the merchant handoff',`<p>A real handoff identifies the seller, exact source offer, full known cost, commercial disclosure and return/support responsibility.</p>${offerTable()}<div class="notice">No merchant is connected. No total, stock or arrival promise is confirmed.</div>${eligible()?'<button class="button full" disabled>Open verified merchant — unavailable</button>':'<button class="button full" disabled>Age / guardian authorization required</button>'}<p class="sample-note" style="margin-top:14px">No checkout, purchase or booking occurs in this design preview.</p>`],
      booking:()=>['Book the Exact Look',`<p>Share only the reference you authorize. A professional must confirm feasibility, materials, full price and actual availability.</p><label class="field">Requested service<select><option>Hairstyle / grooming consultation</option><option>Makeup and occasion styling</option><option>Outfit / tailoring consultation</option></select></label><label class="field">Preferred date<input type="date"></label><label class="field">Reference sharing<select><option>Non-personal style board only</option></select></label><div class="notice">No professional, slot or quote is connected. A request is not a confirmed appointment.</div>${action('Preview request summary','request-summary','','button full')}`],
      'request-summary':()=>['Request summary preview','<div class="notice">Request not sent. No booking or payment has been made.</div><p>The real next step is professional feasibility, an expiring full-price quote, customer acceptance and a verified slot/payment flow where enabled.</p><button class="button full" disabled>Send request unavailable</button>'],
      generation:()=>['Generation state review','<p>No photo upload or generation starts from this prototype. Real dispatch needs eligible account/age/market, rights/consent, valid input and an accepted server quote.</p><div class="dialog-actions">'+action('Queued / processing layout','show-processing')+'</div>'],
      capture:()=>['Your photo, your permission','<p>Explain purpose, processor, retention, price and alternatives before camera permission. Do not start a camera at login.</p><div class="notice">Account, age/guardian and service eligibility are not connected.</div><button class="button full" disabled>Camera or upload unavailable</button>'],
      advisor:()=>['Ask GLAM',eligible()?`<span class="pill ai">${icon('spark',14)} Contextual AI Advisor</span><div class="chat-sample"><div class="question">A look for an evening event, within my budget.</div><div class="answer">Conversation-layout example. The future agent will compare source-backed options; only you can confirm a purchase or booking.</div></div><p>Useful guidance beyond shopping: routines, wardrobe reuse and occasion preparation.</p>${action('Preview Occasion Concierge','occasion-next','','button full')}<p class="sample-note" style="margin-top:12px">No advisor or tool execution is connected. This is not a live AI answer.</p>`:'<p>This restricted audience mode uses curated, age-appropriate guidance only. Open chat and transaction authority are unavailable.</p><button class="button full" disabled>Qualified guardian / age route required</button>'],
      dna:()=>['Your Style DNA',`<p>Optional preferences, not assumptions about identity. Choices below exist only until this preview reloads.</p><div class="preference-grid">${['Warm neutrals','Comfortable fits','Natural hair care','Modest coverage','Adaptive details','Use what I own'].map(n=>`<label><input type="checkbox">${n}</label>`).join('')}</div><div class="notice">Learning from activity requires separate permission and editable provenance. No profile is stored or sent here.</div>${action('Clear preview choices','clear-dna','','button secondary')}`],
      privacy:()=>['Private by default','<p>Capture, processing, saved results, memory learning, public sharing and marketing are separate purposes. Children have no public profiles or launch photorealistic twin; youth features require qualified policy.</p><button class="button full" disabled>Account and rights-request connection unavailable</button>'],
      eligibility:()=>['Age-appropriate entry','<p>Age thresholds and guardian requirements are jurisdiction-specific. An account or a client checkbox cannot establish adult or guardian authority.</p><div class="notice">The review toolbar previews age-mode layouts. It does not verify anyone or activate a feature.</div>'],
      region:()=>['Region, language & currency',`<p>Layout settings do not activate a market or assert taxes/payment/delivery eligibility.</p><label class="field">Display currency<select id="currency-choice">${['USD','EUR','ZAR','GBP','INR','AED','JPY'].map(n=>`<option ${S.currency===n?'selected':''}>${n}</option>`).join('')}</select></label><p class="small">RTL layouts are available in the review toolbar. Regional legal and language reviews remain outstanding.</p>`],
      search:()=>['Screenshot to Shop','<p>Search a selected style or use an owned/licensed inspiration image. Exact matches need independent item evidence; similar-looking items must be labeled Similar.</p><label class="field">Style or occasion<input placeholder="A style, an occasion, a point of view"></label><button class="button secondary full" disabled>Private upload connection unavailable</button><div class="dialog-actions">'+action('Explore concept looks','dialog-discover')+'</div>'],
      notifications:()=>['Notifications','<p>No reminders or notifications are connected. Real occasion reminders are optional, timezone-aware and deletable.</p>'],
      saved:()=>['Your saved space','<p>No private looks, wardrobe items or routines are loaded. Style Twin reuse needs separate purpose/retention consent; no persistent photorealistic child twin at launch.</p>'],
      billing:()=>['Plans & credits','<p>Explore useful discovery before paid tools. Exact localized prices, renewal terms, server-verified entitlements, success-only credit consumption and restore belong here.</p><button class="button full" disabled>Store billing not connected</button>'],
      accessibility:()=>['Accessibility & localization','<p>Visible focus, labeled controls and scalable text are included in this design. The RTL toolbar is a layout study; full translations, VoiceOver/TalkBack and WCAG audits remain outstanding.</p>'],
      'why-ad':()=>['Why this placement?','<p>Sponsored-layout example only. A real eligible adult placement uses permitted explicit shopping context and advertiser disclosure. Private photos, Style DNA and sensitive identity are excluded. No advertiser is connected here.</p>'],
      import:()=>['Catalog intake requirements','<p>Manual creation, CSV import and approved API synchronization share source/rights, variant/size/color, stock, price, delivery and return-policy validation. Generated suggestions remain drafts until merchant review.</p><button class="button full" disabled>Import / synchronization unavailable</button>'],
      'catalog-editor':()=>['Product draft layout','<p>Authorized merchant evidence is required. This form does not publish or save a listing.</p><label class="field">Title<input placeholder="Verified product title"></label><label class="field">Variant / size / color<input placeholder="Source-backed attributes"></label><label class="field">Price and currency<input placeholder="Merchant verification required" disabled></label><label class="field">Shipping and returns<input placeholder="Eligible regions and actual policy" disabled></label><div class="notice">AI suggestions cannot establish stock, price, authenticity, certification or publication eligibility.</div><button class="button full" disabled>Publication unavailable</button>'],
      'workspace-search':()=>['Workspace search','<p>Permission-scoped records and operational search require a verified organization/admin session. No business data is loaded.</p>']
    };
    const fn=bodies[name]; if(!fn)return;
    const [title,body]=fn();
    dialogRoot.innerHTML=`<div class="dialog-backdrop"><section class="dialog ${name==='handoff'?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><header class="dialog-header"><div><div class="eyebrow">Design journey · No live services</div><h1 id="dialog-title">${title}</h1></div>${ib('close','Close dialog','close-dialog')}</header>${body}</section></div>`;
    root.inert=true;document.querySelector('.review-bar').inert=true;
    document.querySelector('.dialog').focus();
  }
  function closeDialog() {
    dialogRoot.innerHTML='';root.inert=false;document.querySelector('.review-bar').inert=false;S.dialog=null;
    if(S.focusReturn&&S.focusReturn.isConnected)S.focusReturn.focus();
  }
  function occasionDialog() {
    const step=S.occasionStep;
    const bodies=[
      `<p>Choose the moment. Preferences come from you, not your appearance.</p><label class="field">Occasion<select id="occasion-kind">${['Evening event','Wedding guest','Graduation','Workday','Cultural celebration','Everyday styling'].map(n=>`<option ${S.occasion.kind===n?'selected':''}>${n}</option>`).join('')}</select></label>`,
      `<p>Dates, destinations and real delivery evidence determine what is feasible.</p><label class="field">Event date<input id="occasion-date" type="date" value="${esc(S.occasion.date)}"></label><label class="field">Location<input id="occasion-place" placeholder="City or service area" value="${esc(S.occasion.place)}"></label>`,
      `<p>Budget means the full delivered obligation, including materials, tax and full service cost.</p><label class="field">Budget in ${S.currency}<input id="occasion-budget" type="number" min="0" placeholder="Your chosen limit" value="${esc(S.occasion.budget)}"></label><p class="field-help">This input is a design preference only. No priced proposal or payment is created.</p>`,
      `<p>Three illustrative directions for ${esc(S.occasion.kind.toLowerCase())}. No priced, time-qualified proposal has been generated.</p><div class="gallery-row">${D.looks.slice(0,3).map(lookCard).join('')}</div><ul class="checklist"><li>Arrival / availability <b>Unverified</b></li><li>Delivered cost <b>Incomplete</b></li><li>Professional feasibility <b>Quote required</b></li></ul><p>Preparation plan: confirm the style, verify materials and timing, then explicitly approve obligations.</p>`
    ];
    if(!S.dialog)S.focusReturn=document.activeElement;
    S.dialog={name:'occasion',data:{}};
    dialogRoot.innerHTML=`<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><header class="dialog-header"><div><div class="eyebrow">Occasion Concierge · Step ${step+1} / 4</div><h1 id="dialog-title">${['What is the moment?','Where and when?','A budget that is yours.','A considered preparation plan.'][step]}</h1></div>${ib('close','Close dialog','close-dialog')}</header>${bodies[step]}<div class="dialog-actions">${step?action('Back','occasion-back','','button secondary'):''}${step<3?action('Continue','occasion-next'):action('Review look plan','occasion-complete')}</div></section></div>`;
    root.inert=true;document.querySelector('.review-bar').inert=true;document.querySelector('.dialog').focus();
  }
  function saveOccasionFields() {
    for(const [id,key] of [['occasion-kind','kind'],['occasion-date','date'],['occasion-place','place'],['occasion-budget','budget']]){
      const node=document.getElementById(id);if(node)S.occasion[key]=node.value;
    }
  }
  document.getElementById('surface').innerHTML=D.surfaces.map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
  document.getElementById('surface').addEventListener('change',e=>{closeDialog();S.surface=e.target.value;S.module='';S.previewState='default';S.screen=S.surface==='consumer'?'complete':'home';render()});
  document.getElementById('state').addEventListener('change',e=>{closeDialog();S.previewState=e.target.value;render()});
  document.getElementById('audience').addEventListener('change',e=>{closeDialog();S.audience=e.target.value;S.previewState='default';render()});
  document.getElementById('wireframe').addEventListener('change',e=>{S.wireframe=e.target.checked;render()});
  document.getElementById('rtl').addEventListener('change',e=>{S.rtl=e.target.checked;render()});
  document.addEventListener('change',e=>{
    if(e.target.id==='family'){S.family=e.target.value;render();document.getElementById('family').focus()}
    if(e.target.id==='admin-role'){S.adminRole=e.target.value;S.module='';render()}
    if(e.target.id==='currency-choice'){S.currency=e.target.value;closeDialog();render();toast('Display currency changed in this preview only.')}
  });
  document.addEventListener('input',e=>{if(e.target.id==='compare-slider'){const line=document.getElementById('compare-line');if(line)line.style.insetInlineStart=e.target.value+'%'}});
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-action]');if(!el||el.disabled)return;
    const cmd=el.dataset.action;
    if(cmd==='navigate'){closeDialog();setScreen(el.dataset.screen)}
    else if(cmd==='tab'){closeDialog();setScreen(el.dataset.tab.toLowerCase())}
    else if(cmd==='open-look'){S.look=Number(el.dataset.look);if(D.workspaces[S.surface])openDialog('collection');else{closeDialog();setScreen('look')}}
    else if(cmd==='web-nav'){
      const map={'Discover':'discover','AI Studio':'studio','Shop the Look':'complete','Fashion':'shop','Hair & Beauty':'discover'};
      if(map[el.dataset.item])setScreen(map[el.dataset.item]);else openDialog(el.dataset.item==='Professionals'?'booking':'saved');
    }
    else if(cmd==='module'){S.module=el.dataset.module;S.previewState='default';S.campaignStep=0;render()}
    else if(cmd==='sort'){S.sort=el.dataset.sort;render()}
    else if(cmd==='studio-component'){S.component=el.dataset.component;render()}
    else if(cmd==='undo'){S.component='Hair';render();toast('Component selection reset. No image was edited.')}
    else if(cmd==='save')toast('Save-state layout only. No personal content was stored.');
    else if(cmd==='category'){setScreen('discover');toast(el.dataset.category+' category layout. No real recommendation query ran.')}
    else if(cmd==='reset-state'){S.previewState='default';render()}
    else if(cmd==='close-dialog')closeDialog();
    else if(cmd==='product')openDialog('product',{product:Number(el.dataset.product)});
    else if(cmd==='dialog-studio'){closeDialog();setScreen('studio')}
    else if(cmd==='dialog-discover'){closeDialog();setScreen('discover')}
    else if(cmd==='customer-placement'){closeDialog();S.surface='consumer';S.module='';setScreen('look')}
    else if(cmd==='add-plan'){closeDialog();setScreen('complete');toast('Illustrative plan layout only. No cart or order created.')}
    else if(cmd==='show-processing'){closeDialog();S.previewState='loading';render()}
    else if(cmd==='occasion'){closeDialog();S.occasionStep=0;occasionDialog()}
    else if(cmd==='occasion-next'){if(S.dialog?.name==='advisor')S.occasionStep=0;else{saveOccasionFields();S.occasionStep=Math.min(3,S.occasionStep+1)}occasionDialog()}
    else if(cmd==='occasion-back'){saveOccasionFields();S.occasionStep=Math.max(0,S.occasionStep-1);occasionDialog()}
    else if(cmd==='occasion-complete'){closeDialog();setScreen('complete')}
    else if(cmd==='clear-dna')document.querySelectorAll('.dialog input[type=checkbox]').forEach(n=>n.checked=false);
    else if(cmd==='campaign-next'){S.campaignStep=Math.min(6,S.campaignStep+1);render()}
    else if(cmd==='campaign-back'){S.campaignStep=Math.max(0,S.campaignStep-1);render()}
    else if(cmd==='objective'){S.selectedObjective=el.dataset.objective;render()}
    else if(cmd==='sample')toast('Component interaction preview.');
    else openDialog(cmd);
  });
  document.addEventListener('keydown',e=>{
    if(!S.dialog)return;
    if(e.key==='Escape'){closeDialog();return}
    if(e.key==='Tab'){
      const dialog=document.querySelector('.dialog');
      const nodes=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')];
      if(!nodes.length){e.preventDefault();dialog.focus();return}
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  render();
})();
