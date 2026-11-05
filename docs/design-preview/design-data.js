window.GLAM_DESIGN = {
  version: 'ui-ux-1.0',
  surfaces: [
    ['ios','iOS mobile'], ['android','Android mobile'], ['consumer','Consumer web'],
    ['merchant','Merchant workspace'], ['advertiser','Advertiser workspace'],
    ['professional','Professional workspace'], ['creator','Creator workspace'], ['admin','Web /admin'],
    ['system','Design system'], ['library','Screen-family library']
  ],
  mobileTabs: ['Home','Discover','Studio','Shop','Profile'],
  webNav: ['Discover','AI Studio','Hair & Beauty','Fashion','Shop the Look','Professionals','Creators'],
  looks: [
    {id:0,title:'Quiet confidence',category:'Tailored layers',note:'A considered mix of warm neutrals and sculptural details.'},
    {id:1,title:'Everyday expression',category:'Grooming & texture',note:'Easy layers, thoughtful texture, a style of your own.'},
    {id:2,title:'Soft structure',category:'Occasion inspiration',note:'Comfortable shapes and understated finishing touches.'},
    {id:3,title:'A different perspective',category:'Modest styling',note:'Fluid layers and a rich, restrained palette.'}
  ],
  products: [
    {id:0,name:'Tailored layer',kind:'Clothing',component:'Outfit'},
    {id:1,name:'Finishing touches',kind:'Shoes & bag',component:'Shoes'},
    {id:2,name:'A plum accent',kind:'Cosmetics',component:'Makeup'},
    {id:3,name:'The small details',kind:'Accessories',component:'Accessories'}
  ],
  workspaces: {
    merchant: {title:'Merchant studio',subtitle:'Your catalog. Your business.',modules:['Overview','Catalog','Inventory','Orders / Leads','Promotions','Advertising','Analytics','Payouts','Storefront','Settings','Support']},
    advertiser: {title:'Advertising studio',subtitle:'Relevant placements. Clear outcomes.',modules:['Campaign Overview','Create Campaign','Ad Groups','Creative Library','Sponsored Looks','Targeting','Budgets & Bids','Attribution','Reporting','Billing','Brand Safety']},
    professional: {title:'Professional studio',subtitle:'From inspiration to a feasible appointment.',modules:['Dashboard','Services','Portfolio','Booking Calendar','Quote Requests','Clients','Promotions','Reviews','Earnings','Settings']},
    creator: {title:'Creator studio',subtitle:'Your point of view, thoughtfully shared.',modules:['Published Looks','Shoppable Collections','Affiliate Links','Attributed Sales','Commissions','Campaign Invitations','Payouts']},
    admin: {title:'Platform control',subtitle:'The whole platform, including mobile.',modules:['Executive Overview','User Management','AI Operations','Beauty Content','Merchant Management','Professional Management','Advertising','Commerce','Subscriptions','Creators','Regional Operations','Trust & Safety','Privacy','Analytics','System Configuration']}
  },
  campaignSteps:['Objective','Eligible products','Placement','Budget','Creative','Review','Launch'],
  componentStates:['default','loading','empty','error','offline','denied','success']
};
