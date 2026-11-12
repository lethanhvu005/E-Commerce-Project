/* Thông báo và chuyển trang | NEXA / CommerceOS static demo. */
function toast(msg,type=''){const area=document.getElementById('toast-region');let box=document.createElement('div');box.className='toast'+(type?' '+type:'');const text=document.createElement('span');text.textContent=msg;box.append(text);if(type==='cart'){const link=document.createElement('a');link.href='cart.html';link.className='toast-action';link.dataset.route='cart';link.textContent='Xem giỏ →';box.append(link);}area.append(box);setTimeout(()=>box.remove(),3800)}
function nav(r){
  try{sessionStorage.setItem('nexa-page-ui',JSON.stringify({query:ui.query,category:ui.category,brand:ui.brand,onlyFav:ui.onlyFav||false,ship:ui.ship,pay:ui.pay,coupon:ui.coupon}));}catch(e){}
  const url=window.pagePath(r);if(location.pathname.split('/').pop()===url.split('?')[0] && !url.includes('?')){render();scrollTo({top:0,behavior:'instant'});}else location.href=url;
}
function routeFromHash(){
 const current=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 if(current==='prd_detail.html')return 'product/'+(new URLSearchParams(location.search).get('id')||'1');
 if(current==='success.html')return 'success/'+(new URLSearchParams(location.search).get('id')||'');
 return window.NEXA_FILE_TO_ROUTE[current]||'home';
}

