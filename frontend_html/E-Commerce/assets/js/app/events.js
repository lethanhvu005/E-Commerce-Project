/* Event delegation frontend | NEXA / CommerceOS static demo. */
window.addEventListener('hashchange',()=>{ui.modal=null;ui.qty=1;ui.adminSearch='';promotionEditorId=null;promotionEditorOpen=false;reviewEditorId=null;reviewEditorOpen=false;supportEditorId=null;supportEditorOpen=false;render();adminCloseSide()});
document.addEventListener('click',e=>{
const b=e.target.closest('[data-route],[data-action],[data-scroll]');if(!b)return;
if(b.dataset.route){e.preventDefault();if(b.dataset.cat){ui.category=b.dataset.cat;ui.query='';ui.brand='Tất cả';ui.onlyFav=false;ui.max=10000000;}if(b.dataset.brand){ui.brand=b.dataset.brand;ui.category='Tất cả';ui.query='';ui.onlyFav=false;ui.max=10000000;}nav(b.dataset.route);return}
if(b.dataset.scroll){let section=document.getElementById(b.dataset.scroll);if(section)section.scrollIntoView({behavior:'smooth'});else nav('home');return}
let a=b.dataset.action,id=Number(b.dataset.id);
if(a==='cat'){ui.category=b.dataset.cat;ui.brand='Tất cả';ui.query='';nav('shop')}
else if(a==='home-tab'){ui.tab=b.dataset.cat;render();[...document.querySelectorAll('[data-action="home-tab"]')].find(t=>t.dataset.cat===ui.tab)?.focus({preventScroll:true})}
 else if(a==='add'){
  if(!b.classList.contains('gear-add')){addCart(id,+b.dataset.qty||1);return}
  if(addCart(id,+b.dataset.qty||1,false)){
   document.querySelectorAll('.gear-count').forEach(count=>{count.textContent=String(cartCount());count.classList.remove('is-bumping');void count.offsetWidth;count.classList.add('is-bumping');});
   document.querySelector('.gear-cart')?.setAttribute('aria-label',`Giỏ hàng, ${cartCount()} sản phẩm`);
   const original=b.innerHTML;b.classList.add('is-adding','added');b.disabled=true;b.innerHTML='Đã thêm <span aria-hidden="true">✓</span>';
   window.setTimeout(()=>b.classList.remove('is-adding'),180);
   window.setTimeout(()=>{if(!b.isConnected)return;b.classList.remove('added');b.disabled=false;b.innerHTML=original},1100);
  }
 }
else if(a==='buy'){if(addCart(id,+b.dataset.qty||1))nav('checkout')}
else if(a==='fav'){
 const selected=!state.favorites.includes(id);
 state.favorites=selected?[...state.favorites,id]:state.favorites.filter(x=>x!==id);
 save();
 toast(selected?'Đã thêm vào danh sách yêu thích.':'Đã bỏ khỏi danh sách yêu thích.');
 const r=routeFromHash();
 if(r==='wishlist'||(r==='shop'&&ui.onlyFav)){render();}
 else{
  document.querySelectorAll(`.gear-favorite[data-id="${id}"]`).forEach(btn=>{
   btn.classList.toggle('is-fav',selected);
   btn.setAttribute('aria-pressed',String(selected));
   btn.classList.remove('is-popping');void btn.offsetWidth;btn.classList.add('is-popping');
  });
 }
}
else if(a==='favorites'){ui.onlyFav=true;ui.query='';ui.category='Tất cả';nav('shop');toast('Đang hiển thị '+state.favorites.length+' sản phẩm yêu thích.')} // Browser-only favorites
else if(a==='account'){nav(demoSession?'profile':'login')}
else if(a==='change-cart'){updateCart(id,+b.dataset.delta)}
else if(a==='remove'){state.cart=state.cart.filter(x=>x.id!==id);save();render();toast('Đã xóa sản phẩm khỏi giỏ.')}
else if(a==='detail-qty'){let p=INITIAL.find(x=>routeFromHash()==='product/'+x.id);ui.qty=Math.min(Math.max(ui.qty+(+b.dataset.delta),1),p?pstock(p)||1:99);render()}
else if(a==='variant'){ui.variant=b.dataset.value;render()}
else if(a==='color'){ui.color=b.dataset.color;render()}
else if(a==='clear-filter'){resetFilters()}
else if(a==='order-filter'){ui.ordersFilter=b.dataset.value||'Tất cả';render()}
else if(a==='filters'){document.querySelector('.filters')?.classList.toggle('open')}
else if(a==='sidebar'){let sidebar=document.getElementById('admin-sidebar');sidebar?.classList.toggle('open');document.getElementById('admin-veil')?.classList.toggle('hide',!sidebar?.classList.contains('open'))}
else if(a==='admin-stock-filter'){ui.adminStockFilter=b.dataset.value;render()}
else if(a==='open-product-add'){openModal(null)}
else if(a==='edit-product'){openModal(id)}
else if(a==='close-modal'){ui.modal=null;render()}
else if(a==='promotion-add'){openPromotionModal(null)}
else if(a==='promotion-edit'){openPromotionModal(id)}
else if(a==='promotion-close'){closePromotionModal()}
else if(a==='promotion-toggle'){const p=state.promotions.find(x=>x.id===id);if(p){p.active=!p.active;save();render();toast(p.active?'Đã kích hoạt ưu đãi.':'Đã tạm dừng ưu đãi.')}}
else if(a==='review-edit'){openReviewModal(id)}
else if(a==='review-close'){closeReviewModal()}
else if(a==='review-toggle'){const r=reviewsForAdmin().find(x=>x.id===id);if(r){const visible=r.visible===false;saveReviewModeration(id,{visible});render();toast(visible?'Đã hiển thị đánh giá.':'Đã ẩn đánh giá.')}}
else if(a==='support-edit'){openSupportModal(id)}
else if(a==='support-close'){closeSupportModal()}
else if(a==='inventory-guide'){toast('Production: quản lý inventory ledger, reserved stock, đối soát, transaction và phân quyền backend.','warn')}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="link"][data-route]')){e.preventDefault();nav(e.target.dataset.route)}if(e.key==='Escape'){if(ui.modal){ui.modal=null;render()}else if(promotionEditorOpen)closePromotionModal();else if(reviewEditorOpen)closeReviewModal();else if(supportEditorOpen)closeSupportModal()}});
document.addEventListener('change',e=>{
const t=e.target;if(t.id==='product-image-file'){
 const file=t.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){toast('Vui lòng chọn tệp hình ảnh.','warn');t.value='';return}
 if(file.size>15*1024*1024){toast('Ảnh gốc quá lớn. Hãy chọn ảnh nhỏ hơn 15 MB.','warn');t.value='';return}
 const status=document.getElementById('product-image-status');if(status)status.textContent='Đang tối ưu ảnh…';
 compressProductImage(file).then(src=>{
  const value=document.getElementById('product-image-value'),preview=document.getElementById('product-image-preview'),path=document.getElementById('product-image-path');
  if(value)value.value=src;if(preview){preview.src=src;preview.hidden=false}if(path)path.value='';if(status)status.textContent=`Đã chọn ${file.name}; ảnh được lưu trong trình duyệt.`;
 }).catch(()=>{if(status)status.textContent='Không đọc được ảnh. Hãy thử tệp khác.';toast('Không thể đọc ảnh đã chọn.','warn')});
}else if(t.name==='category'){ui.category=t.value;render()}else if(t.name==='brand'){ui.brand=t.value;render()}else if(t.name==='maxPrice'){ui.max=+t.value;render()}else if(t.name==='sort'){ui.sort=t.value;render()}else if(t.name==='ship'){ui.ship=t.value;let f=document.getElementById('checkout-form');if(f)ui.form=Object.fromEntries(new FormData(f));render();restoreCheckout()}
else if(t.name==='pay'){ui.pay=t.value;let f=document.getElementById('checkout-form');if(f)ui.form=Object.fromEntries(new FormData(f));render();restoreCheckout()}
else if(t.name==='stock'){const id=+t.dataset.id;let p=INITIAL.find(x=>x.id===id);if(!p)return;let x=Number(t.value);if(!Number.isInteger(x)||x<0||x>999999){toast('Tồn kho phải là số nguyên từ 0 đến 999.999.','warn');t.value=pstock(p);return}state.stock[id]=x;save();render();toast('Đã lưu số lượng tồn kho mô phỏng.')}
else if(t.name==='orderStatus'){let o=state.orders.find(o=>o.id===t.dataset.id);if(o){o.status=t.value;save();render();toast('Đã thay đổi trạng thái đơn hàng.')}}
else if(t.name==='orderFilter'){ui.adminOrderFilter=t.value;render()}
else if(t.id==='admin-product-filter'){ui.adminProductFilter=t.value;render()}
});
function restoreCheckout(){if(!ui.form)return;let f=document.getElementById('checkout-form');if(!f)return;for(let key of ['name','phone','email','address','note'])if(f.elements[key])f.elements[key].value=ui.form[key]||''}
document.addEventListener('input',e=>{let t=e.target;if(t.id==='product-image-path'){const value=document.getElementById('product-image-value'),preview=document.getElementById('product-image-preview'),status=document.getElementById('product-image-status');if(value)value.value=t.value.trim();if(preview){preview.src=t.value.trim();preview.hidden=!t.value.trim()}if(status)status.textContent=t.value.trim()?'Xem trước ảnh theo đường dẫn vừa nhập.':'Ảnh sẽ dùng hình mặc định theo danh mục.'}else if(t.id==='admin-product-search'){ui.adminSearch=t.value;let s=t.selectionStart;render();let el=document.getElementById('admin-product-search');if(el){el.focus();el.setSelectionRange(s,s)}}else if(t.id==='admin-global-search'){ui.adminSearch=t.value;nav('admin/products')} });
document.addEventListener('submit',e=>{let form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();let type=form.dataset.form;let fd=new FormData(form);
if(type==='search'){ui.query=String(fd.get('search')||'').trim().slice(0,80);ui.category='Tất cả';ui.brand='Tất cả';ui.onlyFav=false;ui.max=10000000;if(routeFromHash()==='shop')render();else nav('shop')}
else if(type==='coupon'){let val=String(fd.get('coupon')||'').trim().toUpperCase(),p=promotionForCode(val);if(p&&subtotal()>=Number(p.minOrder||0)){ui.coupon=val;toast('Đã áp dụng mã ưu đãi.')}else{ui.coupon='';toast(p?'Đơn hàng chưa đạt mức tối thiểu của mã này.':'Mã không hợp lệ hoặc ưu đãi đã dừng.','warn')}render()}
else if(type==='checkout'){
if(!form.reportValidity())return;
let items=cartRows();if(!items.length){nav('cart');return}
if(items.some(({p,qty})=>pstock(p)<qty)){toast('Tồn kho đã thay đổi, vui lòng kiểm tra giỏ hàng.','warn');nav('cart');return}
let id='NX-'+Date.now().toString(36).toUpperCase().slice(-7);let order={id,name:'Khách hàng',time:new Date().toISOString(),ship:ui.ship,pay:ui.pay,status:'Chờ xác nhận',total:subtotal()-discount()+shipping(),items:items.map(({p,qty})=>({id:p.id,name:p.name,qty,total:p.price*qty}))};
for(let {p,qty} of items)state.stock[p.id]=pstock(p)-qty;
state.orders.push(order);state.cart=[];const provider=ui.pay;ui.coupon='';ui.form=null;save();if(provider==='vnpay'||provider==='momo'){try{sessionStorage.setItem('nexa-pending-payment',order.id)}catch(e){};nav('payment')}else nav('success/'+order.id);toast('Đặt hàng thành công!')
}
else if(type==='product-editor'){
let name=String(fd.get('name')||'').trim().slice(0,100),price=Number(fd.get('price')),stock=Number(fd.get('stock')),image=String(fd.get('image')||'').trim();if(!name||!Number.isInteger(price)||price<1000||price>1000000000||!Number.isInteger(stock)||stock<0||stock>999999){toast('Vui lòng nhập dữ liệu sản phẩm hợp lệ.','warn');return}
let id=Number(fd.get('id'));if(id){let p=INITIAL.find(x=>x.id===id);if(p){Object.assign(p,{name,short:name,price,image,cat:String(fd.get('cat')),brand:String(fd.get('brand')||'NEXA')});if(!state.productEdits)state.productEdits={};state.productEdits[id]={name,short:name,price,image,cat:p.cat,brand:p.brand};state.stock[id]=stock}}
else{let id=Math.max(...INITIAL.map(x=>x.id),0)+1;let cat=String(fd.get('cat')),type=CATS.find(x=>x.name===cat)?.type||'keyboard';let p={id,name,short:name,price,image,old:0,stock,cat,brand:String(fd.get('brand')||'NEXA'),sku:'NX-'+id,rating:5,reviews:0,tag:'Mới',type,color:'#8a73ff',desc:'Sản phẩm mới được thêm vào danh mục.',features:['Tùy chọn sản phẩm']};INITIAL.push(p);if(!state.customProducts)state.customProducts=[];state.customProducts.push(p)}save();ui.modal=null;render();toast('Đã lưu sản phẩm.')}
else if(type==='promotion-editor'){
 const id=Number(fd.get('id')),code=String(fd.get('code')||'').trim().toUpperCase(),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim(),kind=String(fd.get('type')),value=Number(fd.get('value')),minOrder=Number(fd.get('minOrder')||0),active=fd.get('active')==='on';
 const existing=state.promotions.find(p=>p.id===id),duplicate=state.promotions.some(p=>p.code.toUpperCase()===code&&p.id!==id);
 if(!/^[A-Z0-9_-]{2,24}$/.test(code)||!name||duplicate||!['percent','fixed','shipping'].includes(kind)||!Number.isFinite(minOrder)||minOrder<0||(kind==='percent'&&(!Number.isFinite(value)||value<1||value>100))||(kind==='fixed'&&(!Number.isInteger(value)||value<1000))){toast(duplicate?'Mã ưu đãi đã tồn tại.':'Vui lòng kiểm tra mã, loại và giá trị ưu đãi.','warn');return}
 const promotion={id:id||Math.max(0,...state.promotions.map(p=>p.id))+1,code,name,description,type:kind,value:kind==='shipping'?0:value,minOrder:Math.round(minOrder),active};
 if(existing)Object.assign(existing,promotion);else state.promotions.push(promotion);
 save();promotionEditorId=null;promotionEditorOpen=false;render();toast(existing?'Đã cập nhật ưu đãi.':'Đã thêm ưu đãi.');
}
else if(type==='review-editor'){
 const id=Number(fd.get('id')),name=String(fd.get('name')||'').trim(),product=Number(fd.get('product')),starsValue=Number(fd.get('stars')),text=String(fd.get('text')||'').trim(),visible=fd.get('visible')==='on';
 if(!reviewsForAdmin().some(r=>r.id===id)||name.length<2||!INITIAL.some(p=>p.id===product)||!Number.isInteger(starsValue)||starsValue<1||starsValue>5||text.length<10){toast('Vui lòng kiểm tra nội dung đánh giá.','warn');return}
 saveReviewModeration(id,{name,product,stars:starsValue,text,visible});reviewEditorId=null;reviewEditorOpen=false;render();toast('Đã cập nhật đánh giá.');
}
else if(type==='support-editor'){
 const id=Number(fd.get('id')),ticket=demoSupportTickets.find(x=>x.id===id),customer=String(fd.get('customer')||'').trim(),subject=String(fd.get('subject')||'').trim(),message=String(fd.get('message')||'').trim(),priority=String(fd.get('priority')),status=String(fd.get('status')),response=String(fd.get('response')||'').trim();
 if(!ticket||customer.length<2||!subject||!message||!['Thấp','Trung bình','Cao'].includes(priority)||!['Mới','Đang xử lý','Đã phản hồi','Đã đóng'].includes(status)){toast('Vui lòng kiểm tra nội dung yêu cầu hỗ trợ.','warn');return}
 Object.assign(ticket,{customer,subject,message,priority,status,response});saveSupportTickets();supportEditorId=null;supportEditorOpen=false;render();toast('Đã cập nhật yêu cầu hỗ trợ.');
}
});

function compressProductImage(file){
 return new Promise((resolve,reject)=>{
  const objectUrl=URL.createObjectURL(file),image=new Image();
  image.onload=()=>{
   const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const context=canvas.getContext('2d');if(!context){URL.revokeObjectURL(objectUrl);reject(new Error('canvas unavailable'));return}
   context.drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(objectUrl);
   canvas.toBlob(blob=>{if(!blob){reject(new Error('image conversion failed'));return}if(blob.size>1100*1024){reject(new Error('image too large after compression'));return}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('image read failed'));reader.readAsDataURL(blob)},'image/webp',.82);
  };
  image.onerror=()=>{URL.revokeObjectURL(objectUrl);reject(new Error('invalid image'))};image.src=objectUrl;
 });
}
