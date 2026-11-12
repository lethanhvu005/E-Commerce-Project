function applyCampaignTheme(){
 const light=document.documentElement.dataset.theme==='light';
 document.querySelectorAll('img[data-light-src]').forEach(img=>{
  const src=light?img.dataset.lightSrc:img.dataset.darkSrc;
  if(img.getAttribute('src')!==src)img.src=src;
 });
}
let megaCloseTimer=0;
function replayMegaReveal(mega){
 const panel=mega.querySelector('.mega-panel');
 if(!panel)return;
 panel.classList.remove('is-entering');
 void panel.offsetWidth;
 panel.classList.add('is-entering');
}
function syncThemeControls(){
 const light=document.documentElement.dataset.theme==='light';
 const current=light?'sáng':'tối',target=light?'tối':'sáng';
 document.querySelectorAll('[data-ux="theme"]').forEach(button=>{
  button.setAttribute('aria-label',`Đang dùng giao diện ${current}. Nhấn để chuyển sang ${target}.`);
  button.setAttribute('title',`Giao diện ${current} · Chuyển sang ${target}`);
  button.setAttribute('aria-pressed',String(light));
 });
}
/* Shared enhancement lifecycle: no duplicate storefront menus or footer links. */
function setMobileMenu(open,returnFocus=true){
 const menu=document.getElementById('ux-mobile-menu'),button=document.querySelector('.gear-menu-button');
 if(!menu||!button)return;
 menu.hidden=!open;button.setAttribute('aria-expanded',String(open));
 button.setAttribute('aria-label',open?'Đóng danh mục':'Mở danh mục');
 document.body.classList.toggle('menu-is-open',open);
 if(open){
  menu.classList.remove('is-entering');
  void menu.offsetWidth;
  menu.classList.add('is-entering');
  menu.querySelector('button,a')?.focus();
 }else if(returnFocus)button.focus();
}
function enhanceDOM(){
 document.body.classList.remove('menu-is-open');
 document.documentElement.dataset.theme=localStorage.getItem('nexa-cobalt-theme')||'dark';
 syncThemeControls();
 applyCampaignTheme();
 uxRouteLinks();
 const adminActions=document.querySelector('.admin-top-right');
 if(adminActions&&!adminActions.querySelector('[data-ux="theme"]'))adminActions.insertAdjacentHTML('afterbegin','<button class="gear-theme" data-ux="theme" aria-label="Chuyển sáng tối">◐</button>');
 syncThemeControls();
 if(routeFromHash()==='home')initSlider();else {if(slideTimer)clearInterval(slideTimer);slideTimer=null;window.nexaApplySlide=null;}
 initProductDetail();renderReviewsProduct();initChat();initScrollReveal();
}
document.addEventListener('keydown',e=>{
 const menu=document.getElementById('ux-mobile-menu');
 if(e.key==='Escape'){
  if(menu&&!menu.hidden)setMobileMenu(false);
  document.querySelectorAll('.gear-header details[open]').forEach(d=>{d.open=false;d.querySelector('summary')?.focus();});
 }
 if(e.key==='Tab'&&menu&&!menu.hidden){
  const controls=[...menu.querySelectorAll('a,button,summary')].filter(el=>el.getClientRects().length);
  const first=controls[0],last=controls[controls.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
});
document.addEventListener('click',e=>{
 const menu=document.getElementById('ux-mobile-menu');
 if(menu&&!menu.hidden&&!e.target.closest('.gear-header'))setMobileMenu(false);
 document.querySelectorAll('.gear-header details[open]').forEach(d=>{if(!d.contains(e.target))d.open=false;});
 const summary=e.target.closest('.gear-mega>summary');
 if(summary){
  const mega=summary.parentElement;
  setTimeout(()=>{if(mega.open)replayMegaReveal(mega);},0);
 }
});
document.addEventListener('pointerover',e=>{
 if((e.pointerType!=='mouse'&&e.pointerType!=='pen')||!matchMedia('(min-width: 1201px) and (hover: hover)').matches)return;
 const mega=e.target.closest('.gear-mega');
 if(!mega)return;
 clearTimeout(megaCloseTimer);
 if(!mega.open){mega.open=true;replayMegaReveal(mega);}
});
document.addEventListener('pointerout',e=>{
 const mega=e.target.closest('.gear-mega');
 if(!mega||mega.contains(e.relatedTarget))return;
 megaCloseTimer=setTimeout(()=>{
  if(!mega.matches(':focus-within'))mega.open=false;
 },260);
});
window.addEventListener('resize',()=>{if(innerWidth>900)setMobileMenu(false,false);});
