/* Sự kiện demo auth/review/checkout/contact | NEXA / CommerceOS static demo. */
document.addEventListener('click',e=>{const el=e.target.closest('[data-ux]');if(!el)return;const a=el.dataset.ux;
  if(a==='theme'){const newTheme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=newTheme;try{localStorage.setItem('nexa-cobalt-theme',newTheme)}catch{};applyCampaignTheme();syncThemeControls();}
  else if(a==='dismiss-topbar'){try{sessionStorage.setItem('nexa-announcement-dismissed','1')}catch{};el.closest('.topbar')?.remove();}
 else if(a==='mobile-menu'){const menu=document.getElementById('ux-mobile-menu');if(menu)setMobileMenu(menu.hidden);}
 else if(a==='mobile-close')setMobileMenu(false);
 else if(a==='slide-next')window.nexaApplySlide?.(activeSlide+1);
 else if(a==='slide-prev')window.nexaApplySlide?.(activeSlide-1);
 else if(a==='slide-set')window.nexaApplySlide?.(+el.dataset.slide);
 else if(a==='chat-toggle')toggleChat();
 else if(a==='chat-prompt'){toggleChat(true);appendChat(el.dataset.question,'user');appendChat(botReply(el.dataset.question),'bot');}
 else if(a==='social'){toast('Đăng nhập bằng '+el.dataset.provider+' đã được chọn.','warn');}
 else if(a==='use-voucher'){const promotion=promotionForCode(el.dataset.code);if(!promotion){toast('Ưu đãi này hiện không còn áp dụng.','warn');return}ui.coupon=promotion.code;try{sessionStorage.setItem('nexa-page-ui',JSON.stringify({coupon:ui.coupon,ship:ui.ship,pay:ui.pay}))}catch{};toast('Đã lưu '+ui.coupon+' — áp dụng khi vào giỏ hàng.');}
 else if(a==='logout'){demoSession=null;localStorage.removeItem('nexa-user-demo-v2');render();toast('Đã đăng xuất.');}
 else if(a==='payment-ok'){let o=pendingOrder();if(o){o.status='Đã thanh toán';save();try{sessionStorage.removeItem('nexa-pending-payment')}catch{};nav('success/'+o.id)}}
 else if(a==='payment-cancel'){let o=pendingOrder();if(o){o.status='Thanh toán bị hủy';save()}try{sessionStorage.removeItem('nexa-pending-payment')}catch{};nav('orders')}
 else if(a==='clear-demo'){if(confirm('Xóa giỏ hàng, đơn hàng, wishlist, đánh giá, yêu cầu hỗ trợ và lịch sử trò chuyện trên trình duyệt này?')){[STORE_KEY,DEMO_REVIEWS_KEY,DEMO_REVIEW_MODS_KEY,DEMO_SUPPORT_KEY,DEMO_CHAT_KEY,DEMO_COMMENTS_KEY,'nexa-user-demo-v2'].forEach(k=>localStorage.removeItem(k));location.href='home.html'}}
 else if(a==='copy'){navigator.clipboard?.writeText(el.dataset.copy||'').then(()=>toast('Đã sao chép mã voucher.'),()=>toast('Hãy sao chép thủ công: '+el.dataset.copy));}
});
document.addEventListener('submit',e=>{const f=e.target.closest('form[data-ux-form],#ux-chat-form');if(!f)return;e.preventDefault();if(f.id==='ux-chat-form'){let input=f.querySelector('input'),message=input.value.trim();if(!message)return;appendChat(message,'user');appendChat(botReply(message),'bot');input.value='';return;}
 const fd=new FormData(f),kind=f.dataset.uxForm;
 if(kind==='login'||kind==='register'){
 const email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');if(!f.reportValidity()||password.length<8)return;
 // Password only used for demo form validation. Never persist it.
 const name=kind==='register'?String(fd.get('name')||'Khách NEXA').slice(0,80):email.split('@')[0].slice(0,30);
 demoSession={name,email};try{localStorage.setItem('nexa-user-demo-v2',JSON.stringify(demoSession))}catch{};
 toast('Đăng nhập thành công.');nav('profile');
 } else if(kind==='review'){
 if(!f.reportValidity())return;let product=Number(fd.get('product'))||Number(fd.get('productChoose'))||1;let author=String(fd.get('author')||'').trim(),txt=String(fd.get('text')||'').trim();if(author.length<2||txt.length<10)return toast('Vui lòng nhập đầy đủ đánh giá.','warn');
 demoReviews.unshift({id:Date.now(),product,name:author,stars:Math.max(1,Math.min(5,Number(fd.get('stars'))||5)),text:txt.slice(0,500),date:new Date().toISOString(),verified:false});try{localStorage.setItem(DEMO_REVIEWS_KEY,JSON.stringify(demoReviews))}catch{};
 toast('Đánh giá đã được gửi.');render();
 } else if(kind==='comment'){
 if(!f.reportValidity())return;let product=Number(fd.get('product')),name=String(fd.get('name')||'').trim(),body=String(fd.get('body')||'').trim();if(!product||name.length<2||body.length<5)return toast('Bình luận chưa hợp lệ.','warn');demoComments.unshift({product,name:name.slice(0,40),body:body.slice(0,500),date:new Date().toISOString()});try{localStorage.setItem(DEMO_COMMENTS_KEY,JSON.stringify(demoComments))}catch{};toast('Đã thêm bình luận.');render();
 } else if(kind==='tracking'){let code=String(fd.get('code')||'').trim().slice(0,100),res=document.getElementById('track-result');if(res)res.innerHTML=trackResult(code);
 } else if(kind==='contact'){
 if(!f.reportValidity())return;const subject=String(fd.get('subject')||'Hỗ trợ NEXA').slice(0,90),name=String(fd.get('name')||'').slice(0,70),email=String(fd.get('email')||'').slice(0,120),message=String(fd.get('message')||'').slice(0,1000);
 const text=`Tên: ${name}\nEmail người gửi: ${email}\n\n${message}`;
 // To avoid inventing a valid recipient, ask the user to fill it in their email app.
 const link='mailto:?subject='+encodeURIComponent('[NEXA] '+subject)+'&body='+encodeURIComponent(text);toast('Đang mở ứng dụng email; bạn cần tự nhập địa chỉ người nhận.');location.href=link;
 }
});

