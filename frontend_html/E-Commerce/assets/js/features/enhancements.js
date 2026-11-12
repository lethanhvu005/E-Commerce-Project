/* Chuyển link, đánh giá, slider và chat UI | NEXA / CommerceOS static demo. */
function uxRouteLinks(){document.querySelectorAll('a[href^="#/"]').forEach(a=>{let r=a.getAttribute('href').slice(2);a.setAttribute('href',window.pagePath(r));});}
function renderReviewsProduct(){if(!routeFromHash().startsWith('product/'))return;let id=Number(routeFromHash().split('/')[1]);let main=document.querySelector('main#main');if(!main)return;main.insertAdjacentHTML('beforeend',`<section class="container ux-detail-reviews" id="customer-reviews"><div class="sec-head"><div><h2>ĐÁNH GIÁ THỰC TẾ</h2><p>Cộng đồng NEXA · phản hồi mẫu và trên trình duyệt</p></div><a class="text-link" href="reviews.html">Xem tất cả ↗</a></div><div class="ux-two">${card(`<h3>Đánh giá cho sản phẩm</h3><div class="ux-review-stack">${reviewsFor(id).length?reviewsFor(id).map(reviewItem).join(''):'<p>Chưa có đánh giá cho sản phẩm này.</p>'}</div>`)}${reviewForm(id)}</div><div class="ux-discussion">${card(`<div class="ux-discussion-header"><h3>Hỏi đáp & thảo luận</h3></div>${safeForm('comment')}<input type="hidden" name="product" value="${id}"><label>Tên hiển thị<input class="field" name="name" maxlength="40" required placeholder="Tên của bạn"></label><label>Nội dung câu hỏi / bình luận<textarea class="field" name="body" rows="3" minlength="5" maxlength="500" required placeholder="Bạn muốn hỏi điều gì về sản phẩm này?"></textarea></label><button type="submit" class="btn btn-violet">Đăng bình luận</button></form><div class="ux-comment-list">${demoComments.filter(c=>c.product===id).map(c=>`<article class="ux-comment"><div><strong>${esc(c.name)}</strong><small>${dateVN(c.date)}</small></div><p>${esc(c.body)}</p></article>`).join('')||'<p class="ux-note">Chưa có bình luận nào. Hãy đặt câu hỏi đầu tiên.</p>'}</div>`)}</div></section>`);}
function initProductDetail(){
 const root=document.querySelector('.pd-experience');if(!root)return;
 const id=Number(root.dataset.productId),stock=Number(root.dataset.stock),art=root.querySelector('.pd-artwork');
 const updateQuantity=()=>{
  root.querySelector('.pd-quantity output').textContent=String(ui.qty);
  root.querySelector('[data-detail-action="decrease"]').disabled=ui.qty<=1;
  root.querySelector('[data-detail-action="increase"]').disabled=ui.qty>=stock;
 };
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-detail-view],[data-detail-tone],[data-detail-action]');if(!button)return;
  if(button.dataset.detailView){
   art.dataset.view=button.dataset.detailView;
   root.querySelectorAll('[data-detail-view]').forEach(item=>{const selected=item.dataset.detailView===art.dataset.view;item.classList.toggle('active',selected);item.setAttribute('aria-pressed',String(selected));});
  }else if(button.dataset.detailTone){
   art.dataset.tone=button.dataset.detailTone;
   root.querySelectorAll('[data-detail-tone]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  }else{
   const action=button.dataset.detailAction;
   if(action==='increase'||action==='decrease'){ui.qty=Math.min(Math.max(ui.qty+(action==='increase'?1:-1),1),Math.max(stock,1));updateQuantity();}
   else if(action==='favorite'){
    const selected=!state.favorites.includes(id);state.favorites=selected?[...state.favorites,id]:state.favorites.filter(value=>value!==id);save();button.setAttribute('aria-pressed',String(selected));button.classList.remove('is-popping');void button.offsetWidth;button.classList.add('is-popping');toast(selected?'Đã thêm vào yêu thích.':'Đã bỏ khỏi yêu thích.');
   }else if(action==='add'||action==='buy'){
    if(!stock||!addCart(id,ui.qty,false))return;
    document.querySelectorAll('.gear-count').forEach(count=>{count.textContent=String(cartCount());count.classList.remove('is-bumping');void count.offsetWidth;count.classList.add('is-bumping');});
    document.querySelector('.gear-cart')?.setAttribute('aria-label',`Giỏ hàng, ${cartCount()} sản phẩm`);
    if(action==='buy')nav('checkout');
    else if(!button.classList.contains('is-added')){
     const original=button.textContent;button.classList.add('is-added');button.textContent='Đã thêm vào giỏ ✓';
     window.setTimeout(()=>{if(!button.isConnected)return;button.classList.remove('is-added');button.textContent=original;},1100);
    }
   }
  }
 });
 root.querySelector('[data-detail-variant]')?.addEventListener('change',event=>{ui.variant=event.target.value;});
}
function initSlider(){
 window.nexaSliderCleanup?.();
 if(slideTimer)clearTimeout(slideTimer);slideTimer=null;
 const hero=document.querySelector('.gear-hero');if(!hero)return;
 const panels=[...hero.querySelectorAll('[data-slide-panel]')];if(!panels.length)return;
 const controller=new AbortController(),options={signal:controller.signal};
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const toggle=hero.querySelector('[data-slider-toggle]');
 let paused=window.nexaSliderPaused??motion.matches,touching=false,progress=null,animations=[],transition=0;
 const cancelMotion=()=>{transition++;animations.forEach(animation=>animation.cancel());animations=[];panels.forEach(panel=>panel.classList.remove('is-leaving'));};
 const stop=()=>{clearTimeout(slideTimer);slideTimer=null;progress?.cancel();progress=null;};
 const schedule=()=>{
  stop();
  const focused=document.activeElement;
  const keyboardFocus=focused!==toggle&&hero.contains(focused)&&focused.matches(':focus-visible');
  const running=!paused&&!touching&&!document.hidden&&!keyboardFocus;
  hero.dataset.autoplay=running?'playing':'paused';
  hero.querySelector('.slide-index').setAttribute('aria-live',running?'off':'polite');
  if(running&&panels.length>1){
   const fill=hero.querySelector('.slider-dots .active i');
   if(fill&&!motion.matches)progress=fill.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:5000,fill:'forwards'});
   slideTimer=setTimeout(()=>{apply(activeSlide+1);},5000);
  }
 };
 const updateToggle=()=>{
  window.nexaSliderPaused=paused;
  toggle.setAttribute('aria-label',paused?'Phát tự động slider':'Tạm dừng slider');
  toggle.setAttribute('title',paused?'Phát tự động':'Tạm dừng');
  toggle.setAttribute('aria-pressed',String(paused));
  toggle.innerHTML=`<span aria-hidden="true">${paused?'▷':'Ⅱ'}</span>`;
 };
 const apply=i=>{
  const previous=activeSlide;
  cancelMotion();
  activeSlide=(i+panels.length)%panels.length;
  const focused=document.activeElement;
  panels.forEach((panel,n)=>{const hidden=n!==activeSlide,image=panel.querySelector('.hero-product-image');if(image)image.loading=hidden?'lazy':'eager';panel.hidden=hidden;panel.inert=hidden;panel.setAttribute('aria-hidden',String(hidden));});
  hero.dataset.slide=String(activeSlide);
  hero.querySelector('#slide-number').textContent=String(activeSlide+1).padStart(2,'0');
  hero.querySelectorAll('[data-ux="slide-set"]').forEach((button,n)=>{button.classList.toggle('active',n===activeSlide);button.setAttribute('aria-pressed',String(n===activeSlide));});
  if(focused?.closest('[data-slide-panel]')?.hidden)hero.focus({preventScroll:true});
  if(!motion.matches&&previous!==activeSlide){
   const incoming=panels[activeSlide],version=transition,artImg=incoming.querySelector('.hero-product-image');
   animations=[incoming.animate([{transform:'translateX(100%)',opacity:.92},{transform:'translateX(0)',opacity:1}],{duration:620,easing:'cubic-bezier(.22,.68,0,1)',fill:'both'})];
   if(artImg)animations.push(artImg.animate([{transform:'scale(1.028)'},{transform:'scale(1)'}],{duration:680,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
   Promise.all(animations.map(animation=>animation.finished)).then(()=>{
    if(version===transition)cancelMotion();
   }).catch(()=>{});
  }
  schedule();
 };
 window.nexaApplySlide=apply;updateToggle();apply(activeSlide);
 hero.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();apply(activeSlide+(e.key==='ArrowRight'?1:-1));}},options);
 let start=null;
 hero.addEventListener('touchstart',e=>{touching=true;stop();start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{...options,passive:true});
 hero.addEventListener('touchend',e=>{touching=false;if(start){const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)apply(activeSlide+(dx<0?1:-1));}start=null;schedule();},{...options,passive:true});
 hero.addEventListener('touchcancel',()=>{start=null;touching=false;schedule();},options);
 // Mouse hover must not stop the showcase. Only keyboard focus pauses for reading.
 hero.addEventListener('pointerdown',()=>queueMicrotask(schedule),options);
 hero.addEventListener('focusin',schedule,options);
 hero.addEventListener('focusout',()=>queueMicrotask(schedule),options);
 toggle.addEventListener('click',()=>{paused=!paused;updateToggle();schedule();},options);
 document.addEventListener('visibilitychange',schedule,options);
 motion.addEventListener('change',()=>{paused=motion.matches;cancelMotion();updateToggle();schedule();},options);
 window.nexaSliderCleanup=()=>{stop();cancelMotion();controller.abort();window.nexaApplySlide=null;};
}
function initScrollReveal(){
 window.nexaRevealCleanup?.();
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(motion.matches||typeof IntersectionObserver==='undefined'){
  document.querySelectorAll('.reveal-ready').forEach(el=>el.classList.remove('reveal-ready'));
  return;
 }
 document.querySelectorAll('.gear-category-grid,.gear-brand-grid,.gear-product-grid,.gear-new-grid,.shop-products,.pd-specs,.ux-grid-3,.ux-two').forEach(grid=>{
  [...grid.children].forEach((child,idx)=>child.style.setProperty('--reveal-index',String(idx%6)));
 });
 const targets=[...document.querySelectorAll('.gear-section,.gear-category,.gear-brand-card,.gear-card,.gear-new-item,.pd-story article,.pd-specs > div,.ux-card,.whitebox')];
 if(!targets.length)return;
 const vh=window.innerHeight||800;
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(entry.isIntersecting){
    entry.target.classList.add('is-revealed');
    entry.target.classList.remove('reveal-ready');
    observer.unobserve(entry.target);
   }
  });
 },{threshold:0.08,rootMargin:'0px 0px -20px 0px'});
 targets.forEach(el=>{
  if(el.classList.contains('is-revealed'))return;
  const rect=el.getBoundingClientRect();
  if(rect.top>vh*0.92){
   el.classList.add('reveal-ready');
   observer.observe(el);
  }else{
   el.classList.add('is-revealed');
  }
 });
 const onMotionChange=()=>{
  if(motion.matches){
   observer.disconnect();
   document.querySelectorAll('.reveal-ready').forEach(el=>{el.classList.remove('reveal-ready');el.classList.add('is-revealed');});
  }
 };
 motion.addEventListener('change',onMotionChange);
 window.nexaRevealCleanup=()=>{
  observer.disconnect();
  motion.removeEventListener('change',onMotionChange);
  window.nexaRevealCleanup=null;
 };
}
function initChat(){if(document.getElementById('nexa-chat'))return;const chat=document.createElement('aside');chat.id='nexa-chat';chat.className='ux-chat';chat.setAttribute('aria-label','Chat với NEXA');chat.innerHTML=`<button class="ux-chat-launch" data-ux="chat-toggle" aria-label="Mở hoặc đóng chat hỗ trợ"><span>✳</span><strong>Chat với NEXA</strong><span id="ux-chat-caret">↗</span></button><section class="ux-chat-panel" id="ux-chat-panel" hidden><header><div><strong>✳ NEXA ASSISTANT</strong><small>Trợ lý NEXA</small></div><button data-ux="chat-toggle" title="Đóng" aria-label="Đóng chat">✕</button></header><div class="ux-chat-messages" id="ux-chat-messages" aria-live="polite"><div class="ux-chat-message bot">Xin chào! 👋 Mình là trợ lý NEXA. Bạn muốn hỏi về sản phẩm, voucher hay vận chuyển?</div></div><div class="ux-chat-suggestions"><button data-ux="chat-prompt" data-question="Có voucher nào?">🎟 Voucher</button><button data-ux="chat-prompt" data-question="Vận chuyển bao lâu?">🚚 Giao hàng</button><button data-ux="chat-prompt" data-question="Thanh toán VNPay?">💳 VNPay</button></div><form id="ux-chat-form"><input id="ux-chat-input" maxlength="250" aria-label="Nhập tin nhắn" placeholder="Nhập câu hỏi của bạn..." autocomplete="off" required><button type="submit" aria-label="Gửi tin nhắn">➤</button></form></section>`;document.body.appendChild(chat);if(chatExpanded)toggleChat(true);
}
