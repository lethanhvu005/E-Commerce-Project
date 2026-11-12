/* Khôi phục dữ liệu từ localStorage và sessionStorage | NEXA / CommerceOS static demo. */
// Hydrate local demo product edits after initial data definition.
if(!state.customProducts)state.customProducts=[];if(!state.productEdits)state.productEdits={};INITIAL.forEach(p=>{if(state.productEdits[p.id])Object.assign(p,state.productEdits[p.id])});for(let p of state.customProducts){if(!INITIAL.some(x=>x.id===p.id))INITIAL.push(p)}
// initialized after pages.js loads; each HTML file is its own route

try{const savedUI=JSON.parse(sessionStorage.getItem('nexa-page-ui')||'{}');for(const k of ['query','category','brand','onlyFav','ship','pay','coupon'])if(Object.prototype.hasOwnProperty.call(savedUI,k))ui[k]=savedUI[k];}catch(e){}


// Shareable category/editorial links take precedence over previous session filters.
if(routeFromHash()==='shop'){
 const params=new URLSearchParams(location.search);
 if(params.has('cat')||params.has('search')){
  ui.category=CATS.some(c=>c.name===params.get('cat'))?params.get('cat'):'Tất cả';
  ui.query=(params.get('search')||'').slice(0,80);ui.brand='Tất cả';ui.onlyFav=false;ui.max=10000000;
 }
}
