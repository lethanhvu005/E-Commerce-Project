/* FILE: assets/js/config/routes.js */
window.NEXA_ROUTES = {
  home: "home.html",
  shop: "prd.html",
  product: "prd_detail.html",
  cart: "cart.html",
  checkout: "checkout.html",
  success: "success.html",
  orders: "orders.html",
  login: "login.html",
  register: "register.html",
  profile: "profile.html",
  wishlist: "wishlist.html",
  reviews: "reviews.html",
  vouchers: "vouchers.html",
  contact: "contact.html",
  faq: "faq.html",
  shipping: "shipping.html",
  tracking: "tracking.html",
  about: "about.html",
  privacy: "privacy.html",
  payment: "payment.html",
  "admin/dashboard": "admin_dashboard.html",
  "admin/products": "admin_products.html",
  "admin/inventory": "admin_inventory.html",
  "admin/orders": "admin_orders.html",
  "admin/analytics": "admin_analytics.html",
  "admin/customers": "admin_customers.html",
  "admin/promotions": "admin_promotions.html",
  "admin/reviews": "admin_reviews.html",
  "admin/support": "admin_support.html",
  "admin/settings": "admin_settings.html",
};
window.NEXA_FILE_TO_ROUTE = {
  "index.html": "home",
  "home.html": "home",
  "prd.html": "shop",
  "prd_detail.html": "product",
  "cart.html": "cart",
  "checkout.html": "checkout",
  "success.html": "success",
  "orders.html": "orders",
  "login.html": "login",
  "register.html": "register",
  "profile.html": "profile",
  "wishlist.html": "wishlist",
  "reviews.html": "reviews",
  "vouchers.html": "vouchers",
  "contact.html": "contact",
  "faq.html": "faq",
  "shipping.html": "shipping",
  "tracking.html": "tracking",
  "about.html": "about",
  "privacy.html": "privacy",
  "payment.html": "payment",
  "admin_dashboard.html": "admin/dashboard",
  "admin_products.html": "admin/products",
  "admin_inventory.html": "admin/inventory",
  "admin_orders.html": "admin/orders",
  "admin_analytics.html": "admin/analytics",
  "admin_customers.html": "admin/customers",
  "admin_promotions.html": "admin/promotions",
  "admin_reviews.html": "admin/reviews",
  "admin_support.html": "admin/support",
  "admin_settings.html": "admin/settings",
};
window.pagePath = function (r) {
  if (r.startsWith("product/"))
    return "prd_detail.html?id=" + encodeURIComponent(r.split("/")[1]);
  if (r.startsWith("success/"))
    return "success.html?id=" + encodeURIComponent(r.slice(8));
  return window.NEXA_ROUTES[r] || "home.html";
};

/* FILE: assets/js/data/catalog.js */
/* Danh mục, sản phẩm và dữ liệu minh họa | NEXA / CommerceOS static demo. */

"use strict";
/* NEXA/CommerceOS: static UX prototype. LocalStorage is demo state, NOT secure storage. */
const STORE_KEY = "nexa-commerce-demo-v1";
const INITIAL_PROMOTIONS = [
  { id: 1, code: "NEXA10", name: "WELCOME 10%", description: "Giảm 10% giá trị sản phẩm", type: "percent", value: 10, minOrder: 0, active: true },
  { id: 2, code: "NEXA5", name: "MEMBER 5%", description: "Giảm 5% giá trị sản phẩm", type: "percent", value: 5, minOrder: 0, active: true },
  { id: 3, code: "FREESHIP", name: "FREE DELIVERY", description: "Miễn phí vận chuyển tiêu chuẩn/nhanh", type: "shipping", value: 0, minOrder: 0, active: true },
];
// Set image here so the same product photo is used across cards, details, cart, and other rendered pages.
const INITIAL = [
  {
    id: 1,
    name: "NEXA X75 Mechanical Keyboard",
    short: "NEXA X75",
    brand: "NEXA",
    cat: "Bàn phím",
    price: 2490000,
    old: 3290000,
    stock: 45,
    sku: "NEXA-X75",
    image: "assets/images/categories/keyboards.png",
    rating: 4.9,
    reviews: 124,
    tag: "Bán chạy",
    type: "keyboard",
    color: "#8a73ff",
    desc: "Bàn phím cơ layout 75%, hot-swap, RGB đa chế độ, kết nối ba chế độ.",
    features: [
      "Layout 75% tiện dụng",
      "Hot-swap hỗ trợ switch 3/5 pin",
      "Kết nối USB-C / 2.4GHz / Bluetooth",
      "Gõ mượt, độ trễ thấp",
    ],
  },
  {
    id: 2,
    name: "Logitech G Pro X Superlight 2",
    short: "G Pro X Superlight 2",
    brand: "Logitech",
    cat: "Chuột",
    price: 2890000,
    old: 3590000,
    stock: 5,
    sku: "LOGI-GPX2",
    image: "assets/images/categories/mouse.png",
    rating: 4.9,
    reviews: 98,
    tag: "-20%",
    type: "mouse",
    color: "#8298ff",
    desc: "Chuột gaming không dây siêu nhẹ, cảm biến chính xác, phù hợp eSports.",
    features: [
      "Trọng lượng siêu nhẹ",
      "Cảm biến độ chính xác cao",
      "Wireless tối ưu độ trễ",
      "Thiết kế công thái học",
    ],
  },
  {
    id: 3,
    name: "Razer BlackShark V2 Pro",
    short: "BlackShark V2 Pro",
    brand: "Razer",
    cat: "Tai nghe",
    price: 4990000,
    old: 0,
    stock: 28,
    sku: "RAZER-BSV2",
    image: "assets/images/categories/headset.png",
    rating: 4.8,
    reviews: 76,
    tag: "Mới",
    type: "headset",
    color: "#65d5ff",
    desc: "Tai nghe gaming không dây cao cấp, tối ưu định vị âm thanh.",
    features: [
      "Micro thoại rõ ràng",
      "Đệm tai êm, thoải mái",
      "Âm thanh vòm sống động",
      "Thiết kế gọn nhẹ",
    ],
  },
  {
    id: 4,
    name: "ASUS TUF Gaming VG27AQ",
    short: "ASUS TUF VG27AQ",
    brand: "ASUS",
    cat: "Màn hình",
    price: 6990000,
    old: 0,
    stock: 12,
    sku: "ASUS-VG27AQ",
    image: "assets/images/categories/monitor.png",
    rating: 4.8,
    reviews: 52,
    tag: "",
    type: "monitor",
    color: "#6f6eff",
    desc: "Màn hình gaming 27 inch QHD cho không gian hiển thị sắc nét.",
    features: [
      "27 inch QHD",
      "Tần số quét cao",
      "Góc nhìn rộng",
      "Thiết kế viền mỏng",
    ],
  },
  {
    id: 5,
    name: "Keychron K2 Wireless Keyboard",
    short: "Keychron K2",
    brand: "Keychron",
    cat: "Bàn phím",
    price: 2690000,
    old: 2990000,
    stock: 8,
    sku: "KEY-K2",
    image: "assets/images/categories/keyboards.png",
    rating: 4.7,
    reviews: 80,
    tag: "-10%",
    type: "keyboard",
    color: "#f598a9",
    desc: "Bàn phím cơ không dây nhỏ gọn với trải nghiệm gõ tinh tế.",
    features: [
      "Thiết kế gọn 75%",
      "Hỗ trợ nhiều thiết bị",
      "Bluetooth ổn định",
      "Keycap bền đẹp",
    ],
  },
  {
    id: 6,
    name: "NEXA S98 RGB Triple Mode",
    short: "NEXA S98",
    brand: "NEXA",
    cat: "Bàn phím",
    price: 3290000,
    old: 3590000,
    stock: 36,
    sku: "NEXA-S98",
    image: "assets/images/categories/keyboards.png",
    rating: 4.9,
    reviews: 91,
    tag: "Mới",
    type: "keyboard",
    color: "#4ed9dc",
    desc: "Bàn phím 98 phím với dải RGB và kết nối đa thiết bị.",
    features: [
      "Layout 98 phím",
      "Kết nối 3 chế độ",
      "RGB tùy chỉnh",
      "Hot-swap nhanh chóng",
    ],
  },
  {
    id: 7,
    name: "Corsair K70 Pro Gaming Keyboard",
    short: "Corsair K70 Pro",
    brand: "Corsair",
    cat: "Bàn phím",
    price: 4290000,
    old: 0,
    stock: 21,
    sku: "COR-K70",
    image: "assets/images/categories/keyboards.png",
    rating: 4.8,
    reviews: 49,
    tag: "",
    type: "keyboard",
    color: "#d65aff",
    desc: "Bàn phím gaming full-size hiệu năng cao.",
    features: [
      "Switch độ bền cao",
      "Full-size",
      "RGB từng phím",
      "Khung chắc chắn",
    ],
  },
  {
    id: 8,
    name: "HyperX Cloud III Wireless",
    short: "HyperX Cloud III",
    brand: "HyperX",
    cat: "Tai nghe",
    price: 3190000,
    old: 3690000,
    stock: 17,
    sku: "HYX-CLOUD3",
    image: "assets/images/categories/headset.png",
    rating: 4.8,
    reviews: 115,
    tag: "-14%",
    type: "headset",
    color: "#e36fbc",
    desc: "Tai nghe không dây với pin lâu, thiết kế linh hoạt.",
    features: ["Pin sử dụng dài", "Mic tháo rời", "Đệm tai êm", "Âm trầm mạnh"],
  },
  {
    id: 9,
    name: "Logitech G502 X LIGHTSPEED",
    short: "Logitech G502 X",
    brand: "Logitech",
    cat: "Chuột",
    price: 2590000,
    old: 0,
    stock: 52,
    sku: "LOGI-G502",
    image: "assets/images/categories/mouse.png",
    rating: 4.7,
    reviews: 201,
    tag: "Bán chạy",
    type: "mouse",
    color: "#9b75ff",
    desc: "Chuột gaming nhiều nút, thiết kế tối ưu công việc và trò chơi.",
    features: [
      "Nút chức năng đa dạng",
      "Wireless ổn định",
      "Tùy chỉnh DPI",
      "Cảm biến chính xác",
    ],
  },
  {
    id: 10,
    name: "NEXA Vision 27 QHD",
    short: "NEXA Vision 27",
    brand: "NEXA",
    cat: "Màn hình",
    price: 5490000,
    old: 6190000,
    stock: 19,
    sku: "NEXA-V27",
    image: "assets/images/categories/monitor.png",
    rating: 4.6,
    reviews: 67,
    tag: "-11%",
    type: "monitor",
    color: "#4ecefa",
    desc: "Màn hình 27 inch sắc nét, thẩm mỹ tối giản.",
    features: [
      "Độ phân giải QHD",
      "Cổng HDMI / DisplayPort",
      "Chế độ bảo vệ mắt",
      "Chân đế vững chắc",
    ],
  },
  {
    id: 11,
    name: "NEXA Desk Mat XL",
    short: "NEXA Desk Mat",
    brand: "NEXA",
    cat: "Phụ kiện",
    price: 490000,
    old: 650000,
    stock: 86,
    sku: "NEXA-MAT",
    image: "assets/images/categories/pad.png",
    rating: 4.8,
    reviews: 92,
    tag: "-25%",
    type: "pad",
    color: "#64aaff",
    desc: "Lót bàn cỡ lớn hoàn thiện setup làm việc.",
    features: [
      "Bề mặt chống trượt",
      "Chống thấm nhẹ",
      "Viền may chắc chắn",
      "Phù hợp setup tối giản",
    ],
  },
  {
    id: 12,
    name: "NEXA Ergo Pro Chair",
    short: "NEXA Ergo Pro",
    brand: "NEXA",
    cat: "Ghế gaming",
    price: 4290000,
    old: 0,
    stock: 9,
    sku: "NEXA-CHAIR",
    image: "assets/images/categories/desk.png",
    rating: 4.7,
    reviews: 38,
    tag: "Mới",
    type: "chair",
    color: "#c57cff",
    desc: "Ghế công thái học hỗ trợ tư thế ngồi dài.",
    features: [
      "Tựa lưng điều chỉnh",
      "Đệm ngồi êm",
      "Tay vịn linh hoạt",
      "Thiết kế mạnh mẽ",
    ],
  },
];
const CATS = [
  {
    name: "Bàn phím",
    type: "keyboard",
    image: "assets/images/categories/keyboards.png",
    count: "120+",
  },
  {
    name: "Chuột",
    type: "mouse",
    image: "assets/images/categories/mouse.png",
    count: "80+",
  },
  {
    name: "Tai nghe",
    type: "headset",
    image: "assets/images/categories/headset.png",
    count: "70+",
  },
  {
    name: "Màn hình",
    type: "monitor",
    image: "assets/images/categories/monitor.png",
    count: "50+",
  },
  {
    name: "Phụ kiện",
    type: "pad",
    image: "assets/images/categories/pad.png",
    count: "100+",
  },
  {
    name: "Ghế gaming",
    type: "chair",
    image: "assets/images/categories/desk.png",
    count: "40+",
  },
];
const ICON = {
  search: "⌕",
  bag: "🛒",
  heart: "♡",
  user: "♙",
  menu: "☰",
  close: "✕",
  arrow: "↗",
  truck: "♧",
  shield: "◇",
};

/* FILE: assets/js/data/state.js */
/* State localStorage + tính tiền demo | NEXA / CommerceOS static demo. */
let state=readState();let ui={route:'home',query:'',category:'Tất cả',brand:'Tất cả',sort:'popular',min:0,max:10000000,tab:'Tất cả',qty:1,variant:'Brown',color:'#8a73ff',ship:'normal',pay:'cod',coupon:'',ordersFilter:'Tất cả',adminSearch:'',adminOrderFilter:'Tất cả',adminProductFilter:'Tất cả',adminStockFilter:'Tất cả',modal:null,form:null};
function readState(){try{let x=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return {cart:Array.isArray(x.cart)?x.cart:[],favorites:Array.isArray(x.favorites)?x.favorites:[],orders:Array.isArray(x.orders)?x.orders:[],stock:(x.stock&&typeof x.stock==='object')?x.stock:{},customProducts:Array.isArray(x.customProducts)?x.customProducts:[],productEdits:(x.productEdits&&typeof x.productEdits==='object')?x.productEdits:{},promotions:Array.isArray(x.promotions)?x.promotions:INITIAL_PROMOTIONS.map(p=>({...p}))}}catch{return {cart:[],favorites:[],orders:[],stock:{},customProducts:[],productEdits:{},promotions:INITIAL_PROMOTIONS.map(p=>({...p}))}}}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state))}catch{toast('Trình duyệt không cho lưu trạng thái.','warn')}}
function money(n){return new Intl.NumberFormat('vi-VN').format(Math.round(n))+' ₫'}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function pstock(p){return Number.isFinite(+state.stock[p.id])?Math.max(0,+state.stock[p.id]):p.stock}
function cartCount(){return state.cart.reduce((t,i)=>t+i.qty,0)}
function cartRows(){return state.cart.map(x=>({p:INITIAL.find(p=>p.id===x.id),qty:x.qty})).filter(x=>x.p)}
function subtotal(){return cartRows().reduce((s,x)=>s+x.p.price*x.qty,0)}
function promotionForCode(code){return (state.promotions||[]).find(p=>p.active&&String(p.code).toUpperCase()===String(code||'').trim().toUpperCase())||null}
function discount(){const p=promotionForCode(ui.coupon);if(!p||p.type==='shipping'||subtotal()<Number(p.minOrder||0))return 0;const amount=p.type==='percent'?subtotal()*Number(p.value||0)/100:Number(p.value||0);return Math.min(subtotal(),Math.max(0,Math.round(amount)))}
function shipping(){const p=promotionForCode(ui.coupon);return p?.type==='shipping'&&subtotal()>=Number(p.minOrder||0)?0:(ui.ship==='express'?50000:(subtotal()-discount()>=1000000?0:30000))}

/* FILE: assets/js/utils/navigation.js */
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


/* FILE: assets/js/ui/image-assets.js */
/* Product and category photos use raster assets from assets/images/categories. */
const CATEGORY_IMAGE_BY_TYPE = {
  keyboard: 'keyboards.png',
  mouse: 'mouse.png',
  headset: 'headset.png',
  monitor: 'monitor.png',
  pad: 'pad.png',
  chair: 'desk.png'
};

function productImage(product, loading = 'lazy') {
  const image = product.image || `assets/images/categories/${CATEGORY_IMAGE_BY_TYPE[product.type] || CATEGORY_IMAGE_BY_TYPE.keyboard}`;
  return `<img class="nexa-product-img" src="${esc(image)}" loading="${loading}" decoding="async" alt="${esc(product.name)}">`;
}

/* FILE: assets/js/ui/layout.js */
/* Shared storefront. Keep route/action hooks compatible with the demo state. */
function gearIcon(name){
 const paths={home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',grid:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',layers:'<path d="m2 8 10-6 10 6-10 6zM2 12l10 6 10-6M2 16l10 6 10-6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',user:'<circle cx="12" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2z"/>',moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',bag:'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',heart:'<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7M6 10h12"/>',headset:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v2a2 2 0 0 1-2 2h-4"/><rect x="2" y="11" width="5" height="7" rx="2"/><rect x="17" y="11" width="5" height="7" rx="2"/>',monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M7 21h10"/>',pad:'<path d="M3 6h18v13H3zM7 10h10M7 14h6"/>',chair:'<path d="M7 3h10l-1 11H8L7 3ZM5 12v5h14v-5M12 17v4M7 22l5-1 5 1"/>',menu:'<path d="M4 6h16M4 12h16M4 18h10"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>'};
 return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
}
function gearBrand(){return '<a class="gear-brand" href="home.html" aria-label="NEXA GEAR — Trang chủ"><span class="gear-mark" aria-hidden="true">N</span><span>NEXA<small>ELEVATE YOUR PLAY</small></span></a>';}
function categoryLink(label,cat,extra=''){return `<a href="prd.html?cat=${encodeURIComponent(cat)}" data-route="shop" data-cat="${esc(cat)}" class="${extra}">${esc(label)}</a>`;}
function menuCategory(c,active,tile=false){
 const selected=active==='shop'&&ui.category===c.name;
 const count=INITIAL.filter(p=>p.cat===c.name).length;
 return `<a href="prd.html?cat=${encodeURIComponent(c.name)}" data-route="shop" data-cat="${esc(c.name)}" class="${tile?'menu-category-tile':'nav-category'} ${selected?'selected':''}" ${selected?'aria-current="page"':''}>${gearIcon(c.type)}<span>${esc(c.name)}${tile?`<small>${count} sản phẩm</small>`:''}</span>${tile?'<b aria-hidden="true">↗</b>':''}</a>`;
}
function accountLinks(){return demoSession?`<details class="gear-account"><summary>${esc(demoSession.name)} <span>⌄</span></summary><div class="account-panel"><small>Tài khoản mô phỏng</small><a href="profile.html">Hồ sơ của tôi</a><a href="orders.html">Đơn hàng</a><button data-ux="logout">Đăng xuất</button></div></details>`:'<a class="login-link" href="login.html">Đăng nhập</a><a class="register-link" href="register.html">Đăng ký</a>';}
function megaCategoryLink(c,active){
 const selected=active==='shop'&&ui.category===c.name;
 const count=INITIAL.filter(p=>p.cat===c.name).length;
 return `<a class="mega-category-link ${selected?'selected':''}" href="prd.html?cat=${encodeURIComponent(c.name)}" data-route="shop" data-cat="${esc(c.name)}" ${selected?'aria-current="page"':''}>${gearIcon(c.type)}<span>${esc(c.name)}</span><small>${count} mẫu</small></a>`;
}
function megaFeature(p,index){
 return `<a class="mega-feature" href="${pagePath('product/'+p.id)}"><span class="mega-feature-image">${productImage(p)}<b>0${index+1}</b></span><span class="mega-feature-copy"><small>${esc(p.cat)} / NEXA SELECT</small><strong>${esc(p.short)}</strong><span>${money(p.price)} <b aria-hidden="true">↗</b></span></span></a>`;
}
function megaPanel(active){
 const groups=[
  {title:'Điều khiển',cats:CATS.slice(0,2)},
  {title:'Hiển thị & âm thanh',cats:CATS.slice(2,4)},
  {title:'Hoàn thiện setup',cats:CATS.slice(4,6)}
 ];
 const featured=[INITIAL.find(p=>p.cat==='Bàn phím'),INITIAL.find(p=>p.cat==='Chuột')].filter(Boolean);
 return `<div class="mega-panel"><div class="mega-panel-inner"><div class="mega-catalog"><div class="mega-heading"><div><span class="gear-kicker">KHÁM PHÁ NEXA</span><strong>Chọn thiết bị theo cách của bạn.</strong></div><a href="prd.html">Tất cả sản phẩm <span aria-hidden="true">↗</span></a></div><div class="mega-category-groups mega-category-grid">${groups.map(group=>`<section class="mega-category-group"><h3>${esc(group.title)}</h3>${group.cats.map(c=>megaCategoryLink(c,active)).join('')}</section>`).join('')}</div><div class="mega-quick"><span>ĐƯỢC QUAN TÂM</span><a href="prd.html?cat=${encodeURIComponent('Bàn phím')}&search=${encodeURIComponent('75%')}">Bàn phím 75% ↗</a><a href="prd.html?cat=${encodeURIComponent('Tai nghe')}">Tai nghe không dây ↗</a></div></div><div class="mega-feature-grid">${featured.map(megaFeature).join('')}</div></div></div>`;
}
function header(active){
 const cats=CATS;
 const isShop=active==='shop'||(typeof active==='string'&&active.startsWith('product/'));
 const isSupport=['contact','faq','shipping','returns','warranty','privacy','terms','about','tracking','compare'].includes(active);
 return `<a class="skip-link" href="#main">Đến nội dung chính</a><header class="gear-header">
 <div class="container masthead"><button class="gear-menu-button" data-ux="mobile-menu" aria-label="Mở danh mục" aria-controls="ux-mobile-menu" aria-expanded="false">${gearIcon('menu')}</button>${gearBrand()}<nav class="desktop-links" aria-label="Điều hướng chính">
 <a class="nav-home" href="home.html" ${active==='home'?'aria-current="page"':''}>${gearIcon('home')}<span>Trang chủ</span></a><details class="gear-mega" ${isShop?'data-active="true"':''}><summary>${gearIcon('grid')}<span class="gear-nav-label">Sản phẩm</span><span class="gear-nav-caret" aria-hidden="true">⌄</span></summary>${megaPanel(active)}</details>
 <a href="home.html#featured">${gearIcon('layers')}Công Nghệ</a><a href="reviews.html" ${active==='reviews'?'aria-current="page"':''}>${gearIcon('info')}Cộng Đồng</a><a href="contact.html" ${isSupport?'aria-current="page"':''}>${gearIcon('headset')}Hỗ trợ</a></nav>
 <form class="gear-search" data-form="search" role="search"><input name="search" aria-label="Tìm kiếm sản phẩm" value="${esc(ui.query)}" placeholder="Tìm bàn phím, chuột, tai nghe…" autocomplete="off"><button aria-label="Tìm kiếm">${gearIcon('search')}</button></form>
 <div class="gear-actions"><button class="gear-theme" data-ux="theme" aria-label="Chuyển sáng tối"><span class="theme-moon">${gearIcon('moon')}</span><span class="theme-sun">${gearIcon('sun')}</span></button><div class="desktop-account">${gearIcon('user')}${accountLinks()}</div><a class="gear-icon wishlist-link" href="wishlist.html" aria-label="Sản phẩm yêu thích" ${active==='wishlist'?'aria-current="page"':''}>${gearIcon('heart')}</a><a class="gear-cart" href="cart.html" aria-label="Giỏ hàng, ${cartCount()} sản phẩm" ${active==='cart'||active==='checkout'?'aria-current="page"':''}>${gearIcon('bag')}<span class="cart-label">Giỏ hàng</span><b class="gear-count">${cartCount()}</b></a></div></div>
 <nav id="ux-mobile-menu" class="gear-mobile-menu" aria-label="Menu di động" hidden><div class="mobile-menu-top"><b>KHÁM PHÁ NEXA</b><button data-ux="theme" aria-label="Chuyển sáng tối">◐</button><button data-ux="mobile-close" aria-label="Đóng menu">✕</button></div><div class="mobile-auth">${accountLinks()}</div><a href="home.html" ${active==='home'?'aria-current="page"':''}>Trang chủ</a><a href="prd.html" ${active==='shop'&&ui.category==='Tất cả'?'aria-current="page"':''}>Tất cả sản phẩm</a><div class="mobile-category-grid">${cats.map(c=>menuCategory(c,active,true)).join('')}</div><a href="wishlist.html" ${active==='wishlist'?'aria-current="page"':''}>Yêu thích</a><a href="orders.html" ${active==='orders'?'aria-current="page"':''}>Đơn hàng</a><a href="contact.html" ${active==='contact'?'aria-current="page"':''}>Liên hệ</a></nav></header>`;
}
function mobileTab(active){const icon=name=>gearIcon(name).replace('<svg ','<svg class="tab-icon" ');return `<nav class="mobile-tabs" aria-label="Điều hướng di động"><button data-route="home" class="${active==='home'?'active':''}">${icon('home')}Trang chủ</button><button data-route="shop" class="${active==='shop'?'active':''}">${icon('grid')}Danh mục</button><button data-route="cart" class="${active==='cart'?'active':''}">${icon('bag')}Giỏ hàng</button><button data-action="account">${icon('user')}Cá nhân</button></nav>`;}
function footer(){return `<footer class="gear-footer"><div class="container"><div class="footer-statement"><span>Thiết kế tinh gọn.<br><em>Trải nghiệm trọn vẹn.</em></span><a href="prd.html">Tìm món gear tiếp theo ${gearIcon('arrow')}</a></div><div class="gear-footer-grid"><div>${gearBrand()}<p>Bàn phím, chuột và âm thanh.<br>Chọn thiết bị theo cách bạn sử dụng.</p></div><div><h3>Khám phá</h3><a href="prd.html">Tất cả sản phẩm</a>${categoryLink('Bàn phím','Bàn phím')}${categoryLink('Chuột & lót bàn','Chuột')}<a href="wishlist.html">Danh sách yêu thích</a></div><div><h3>Hỗ trợ</h3><a href="shipping.html">Chính sách giao hàng</a><a href="faq.html">Câu hỏi thường gặp</a><a href="contact.html">Liên hệ</a><a href="privacy.html">Quyền riêng tư</a></div><div><h3>Tài khoản</h3><a href="login.html">Đăng nhập</a><a href="register.html">Đăng ký</a><a href="tracking.html">Theo dõi đơn hàng</a><a href="admin_dashboard.html">Quản trị ↗</a></div></div><div class="gear-colophon"><span>© 2026 NEXA GEAR</span></div></div></footer>`;}
function announcement(){let dismissed=false;try{dismissed=sessionStorage.getItem('nexa-announcement-dismissed')==='1'}catch{}return dismissed?'':`<div class="topbar"><span>MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN TỪ <b>1.000.000 ₫</b> · HỖ TRỢ KHÁCH HÀNG 24/7</span><button class="topbar-dismiss" data-ux="dismiss-topbar" aria-label="Ẩn thông báo">×</button></div>`;}
function storefront(content,active,light=false){return `${announcement()}${header(active)}<main class="main-with-mobile ${light?'light-area':''}" id="main" tabindex="-1">${content}</main>${footer()}${mobileTab(active)}`;}
function productCard(p){const rating=Math.max(0,Math.min(5,Number(p.rating)||0)),ratingText=rating.toFixed(1),reviews=Math.max(0,Number(p.reviews)||0),fill=`${Math.round(rating*20)}%`,tagText=p.tag||(pstock(p)>0&&pstock(p)<=5?`Còn ${pstock(p)}`:''),tagKind=tagText.startsWith('-')?'sale':tagText==='Mới'?'new':tagText?'hot':'';return `<article class="gear-card" style="--card-accent:${esc(p.color||'var(--accent)')}">${tagText?`<span class="gear-badge ${tagKind?`gear-badge-${tagKind}`:''}">${esc(tagText)}</span>`:''}<button class="gear-favorite ${state.favorites.includes(p.id)?'is-fav':''}" data-action="fav" data-id="${p.id}" aria-label="Yêu thích ${esc(p.name)}" aria-pressed="${state.favorites.includes(p.id)}">${gearIcon('heart')}</button><a class="gear-product-photo" href="${pagePath('product/'+p.id)}" aria-label="Xem ${esc(p.name)}">${productImage(p)}</a><div class="gear-product-meta"><span class="gear-kicker">${esc(p.brand)} <i aria-hidden="true">/</i> ${esc(p.cat)}</span><h3><a href="${pagePath('product/'+p.id)}">${esc(p.name)}</a></h3><div class="gear-rating" role="img" aria-label="${ratingText} trên 5 sao, ${reviews} đánh giá"><span class="gear-stars" style="--rating-fill:${fill}" aria-hidden="true">★★★★★</span><span>${ratingText} <i aria-hidden="true">·</i> ${reviews}</span></div><p><span class="gear-feature-icon" aria-hidden="true">${gearIcon(p.type)}</span><span>${esc(p.features[0]||p.desc)}</span></p><div class="gear-price">${money(p.price)}${p.old?`<del>${money(p.old)}</del>`:''}</div><button data-action="add" data-id="${p.id}" class="gear-add" aria-label="${pstock(p)>0?'Thêm '+esc(p.name)+' vào giỏ hàng':'Hết hàng'}" ${pstock(p)<=0?'disabled':''}>${pstock(p)>0?'Thêm vào giỏ':'Hết hàng'}<span class="gear-add-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6"/><circle cx="10" cy="21" r="1"/><circle cx="19" cy="21" r="1"/></svg></span></button></div></article>`;}

/* FILE: assets/js/pages/storefront.js */
/* Trang chủ / catalog / chi tiết / giỏ hàng / checkout | NEXA / CommerceOS static demo. */
function heroProducts() {
  return [
    {
      short: "Cảm nhận từng khoảnh khắc",
      cat: "Tai nghe",
      asset: "sound",
      eyebrow: "ÂM THANH ĐỒNG HÀNH CÙNG BẠN",
      title: "<em>Cảm Nhận</em><span>Từng</span><span>Khoảnh Khắc.</span>",
      desc: "Âm thanh cho những khoảnh khắc riêng. Thiết kế cho nhịp sống của bạn.",
      note: "Chạm vào âm nhạc.<br>Chạm đến cảm xúc.",
    },
    {
      short: "Cảm hứng trên từng phím",
      cat: "Bàn phím",
      asset: "keys",
      eyebrow: "DÀNH CHO NHỮNG ĐIỀU BẠN TẠO NÊN",
      title: "<em>Cảm Hứng</em><span>Trên Từng</span><span>Phím Chạm.</span>",
      desc: "Một góc làm việc có gu. Một nhịp sáng tạo rất riêng — bắt đầu từ bàn phím bạn chọn.",
      note: "Thiết kế tinh gọn.<br>Cảm hứng bất tận.",
    },
    {
      short: "Tự do trong từng chuyển động",
      cat: "Chuột",
      asset: "motion",
      eyebrow: "CÔNG NGHỆ HÒA VÀO NHỊP SỐNG",
      title: "<em>Tự Do</em><span>Trong Từng</span><span>Chuyển Động.</span>",
      desc: "Khám phá thiết bị phù hợp với cách bạn làm việc, chơi và tận hưởng mỗi ngày.",
      note: "Chuyển động tự nhiên.<br>Trải nghiệm liền mạch.",
    },
  ];
}
// Frontend-only category cards for the homepage. Replace labels/counts/images here during UI work.
const HOME_DEMO_CATEGORIES = [
  { name: "Bàn phím", filter: "Bàn phím", count: "4+ sản phẩm", image: "keyboards.png" },
  { name: "Chuột", filter: "Chuột", count: "2 sản phẩm", image: "mouse.png" },
  { name: "Tai nghe", filter: "Tai nghe", count: "2 sản phẩm", image: "headset.png" },
  { name: "Màn hình", filter: "Màn hình", count: "2 sản phẩm", image: "monitor.png" },
  { name: "Lót bàn & phụ kiện", filter: "Phụ kiện", count: "1 sản phẩm", image: "pad.png" },
  { name: "Ghế gaming", filter: "Ghế gaming", count: "1 sản phẩm", image: "desk.png" },
];
const HOME_DEMO_BRANDS = [
  { label: "SONY", brand: "Sony", style: "sony" },
  { label: "logitech", brand: "Logitech", style: "logitech" },
  { label: "msi", brand: "MSI", style: "msi" },
  { label: "Microsoft", brand: "Microsoft", style: "microsoft" },
  { label: "ASUS", brand: "ASUS", style: "asus" },
  { label: "RAPOO", brand: "Rapoo", style: "rapoo" },
  { label: "JBL", brand: "JBL", style: "jbl" },
  { label: "nuio.", brand: "Nuio", style: "nuio" },
  { label: "ZADEZ", brand: "ZADEZ", style: "zadez" },
];
function heroWaves(i) {
  return `<svg class="hero-waves" viewBox="0 0 1440 620" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="wave-ink-${i}" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="var(--wave-deep)" stop-opacity="0"/><stop offset=".43" stop-color="var(--wave-blue)"/><stop offset=".65" stop-color="var(--wave-ice)"/><stop offset="1" stop-color="var(--wave-blue)" stop-opacity=".1"/></linearGradient><linearGradient id="wave-fill-${i}" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="var(--wave-blue)" stop-opacity=".2"/><stop offset="1" stop-color="var(--wave-deep)" stop-opacity="0"/></linearGradient></defs><g fill="url(#wave-fill-${i})"><path d="M140 475C390 610 415 275 710 355S1100 590 1440 280L1440 465C1120 680 970 455 700 430S345 655 140 475Z"/><path d="M290 260C490 60 560 440 780 210S1090 100 1340 65C1140 285 950 115 770 320S470 250 290 260Z"/><path d="M550 560C800 360 945 650 1300 390L1440 485C1190 685 950 550 760 585Z"/></g><g fill="none" stroke="url(#wave-ink-${i})"><path class="wave-aura" d="M100 470C390 610 415 275 710 355S1100 590 1440 280M290 260C490 60 560 440 780 210S1090 100 1340 65M550 560C800 360 945 650 1300 390"/><path class="wave-edge" d="M100 470C390 610 415 275 710 355S1100 590 1440 280M290 260C490 60 560 440 780 210S1090 100 1340 65M550 560C800 360 945 650 1300 390"/></g></svg>`;
}
function heroSlide(p, i) {
  const image =
    p.asset === "sound"
      ? "cobalt-sound-wide.png"
      : p.asset === "keys"
        ? "cobalt-keys-lettered.png"
        : "cobalt-motion.png";
  const lightImage =
    p.asset === "sound"
      ? "cobalt-sound-wide-day.png"
      : p.asset === "keys"
        ? "cobalt-keys-day.png"
        : "cobalt-motion-day.png";
  const dimensions = { width: 1536, height: 1024 };
  const alt = `Ảnh ý tưởng ${esc(p.cat.toLowerCase())} giữa những cánh hoa xanh cobalt`;
  return `<div class="gear-slide campaign-${p.asset}" data-slide-panel="${i}" ${i ? "hidden" : ""}>
 ${heroWaves(i)}<div class="gear-stage"><img class="hero-product-image" src="assets/images/campaign/${image}" data-dark-src="assets/images/campaign/${image}" data-light-src="assets/images/campaign/${lightImage}" width="${dimensions.width}" height="${dimensions.height}" alt="${alt}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"><span class="campaign-caption">NEXA / ẢNH Ý TƯỞNG</span></div>
 <div class="gear-slide-copy"><span class="gear-kicker">${p.eyebrow}</span><h1>${p.title}</h1><p class="hero-benefit">${p.desc}</p><div class="hero-buy"><a class="btn btn-primary" href="prd.html?cat=${encodeURIComponent(p.cat)}">Khám phá ngay ${gearIcon("arrow")}</a></div>
 <div class="campaign-index"><span>${String(i + 1).padStart(2, "0")}</span> / BỘ SƯU TẬP ${esc(p.cat.toUpperCase())}</div></div>
 <div class="campaign-note">${p.note}<i></i></div>
 </div>`;
}
function homePage() {
  const slides = heroProducts();
  const categories = ["Tất cả", ...new Set(INITIAL.map((p) => p.cat))];
  const activeCategory = categories.includes(ui.tab) ? ui.tab : "Tất cả";
  const promoProduct = INITIAL.find((p) => p.id === 5) || INITIAL[0];
  const featuredProducts = INITIAL.filter(
    (p) => activeCategory === "Tất cả" || p.cat === activeCategory,
  ).slice(0, 4);
  const newProducts = INITIAL.filter((p) => p.tag === "Mới").slice(0, 3);
  return storefront(
    `<section class="gear-hero container" aria-roledescription="carousel" aria-label="Sản phẩm được giới thiệu" tabindex="0"><div class="slider-viewport">${slides.map(heroSlide).join("")}</div><div class="slider-dock"><div class="slide-index slider-sr-only" aria-live="off" aria-atomic="true"><span id="slide-number">01</span> / ${String(slides.length).padStart(2, "0")}</div><div class="slider-dots">${slides.map((p, i) => `<button data-ux="slide-set" data-slide="${i}" aria-label="${esc(p.short)}" aria-pressed="${!i}" class="${i ? "" : "active"}"><span><i></i></span></button>`).join("")}</div><button class="slider-play" data-slider-toggle aria-label="Tạm dừng slider" aria-pressed="false"><span aria-hidden="true">Ⅱ</span></button></div></section>
 <div class="container home-body">
 <section class="home-section" id="categories"><div class="gear-section-head"><div><span class="gear-kicker">DANH MỤC THIẾT BỊ</span><h2>Chọn loại sản phẩm</h2></div></div><div class="gear-categories" aria-label="Danh mục gear">${HOME_DEMO_CATEGORIES.map((c, i) => `<a class="gear-category" href="prd.html?cat=${encodeURIComponent(c.filter)}" data-route="shop" data-cat="${esc(c.filter)}"><span class="category-index">${String(i + 1).padStart(2, "0")}</span><img src="assets/images/categories/${c.image}" loading="lazy" decoding="async" alt="${esc(c.name)}"><div><strong>${esc(c.name)}</strong><small>${esc(c.count)} <span aria-hidden="true">↗</span></small></div></a>`).join("")}</div></section>
 <section class="home-section gear-brand-section" aria-labelledby="home-brands-title"><div class="gear-section-head"><div><span class="gear-kicker">CHỌN THƯƠNG HIỆU</span><h2 id="home-brands-title">Gaming Gear</h2></div></div><div class="gear-brand-grid" aria-label="Thương hiệu gear">${HOME_DEMO_BRANDS.map((b) => `<a class="gear-brand-card brand-${b.style}" href="prd.html?brand=${encodeURIComponent(b.brand)}" data-route="shop" data-brand="${esc(b.brand)}" aria-label="Xem sản phẩm thương hiệu ${esc(b.brand)}"><span>${esc(b.label)}</span></a>`).join("")}</div></section>
 <section id="featured" class="home-section"><div class="gear-section-head"><div><span class="gear-kicker">SẢN PHẨM NỔI BẬT</span><h2>Mỗi món, một lý do chọn.</h2></div><a href="prd.html">Toàn bộ sản phẩm ↗</a></div><div class="gear-tabs" role="group" aria-label="Lọc sản phẩm nổi bật">${categories.map((c) => `<button class="${activeCategory === c ? "active" : ""}" data-action="home-tab" data-cat="${c}" aria-pressed="${activeCategory === c}">${c}</button>`).join("")}</div><div class="gear-product-grid">${featuredProducts.map(productCard).join("")}</div></section>
 <section class="gear-editorial home-section" id="promos"><div class="editorial-copy"><span class="gear-kicker">GÓC CHỌN GEAR / BÀN PHÍM</span><h2>Gọn 75%.<br>Hay đủ phím?</h2><p>Ưu tiên khoảng trống cho chuột hay hàng phím số? Bắt đầu từ layout bạn dùng mỗi ngày.</p><div class="editorial-links"><a href="prd.html?cat=B%C3%A0n%20ph%C3%ADm&search=75%25">Layout 75% <span>↗</span></a><a href="prd.html?cat=B%C3%A0n%20ph%C3%ADm&search=full-size">Full-size <span>↗</span></a></div></div><a class="editorial-product" href="prd_detail.html?id=${promoProduct.id}"><span class="gear-kicker">${esc(promoProduct.brand)} / ${esc(promoProduct.short)}</span>${productImage(promoProduct)}<span>${esc(promoProduct.desc)} <b>Xem chi tiết ↗</b></span></a></section>
 <section class="home-section"><div class="gear-section-head"><div><span class="gear-kicker">RA MẮT GẦN ĐÂY</span><h2>Thêm lựa chọn cho bạn.</h2></div></div><div class="gear-new-list">${newProducts.map((p) => `<a class="gear-new-item" href="prd_detail.html?id=${p.id}">${productImage(p)}<div><small>${esc(p.cat)}</small><h3>${esc(p.short)}</h3><strong>${money(p.price)}</strong></div><span>↗</span></a>`).join("")}</div></section>
 </div>`,
    "home",
  );
}
function filteredProducts() {
  return INITIAL.filter(
    (p) =>
      (ui.category === "Tất cả" || p.cat === ui.category) &&
      (ui.brand === "Tất cả" || p.brand === ui.brand) &&
      p.price >= ui.min &&
      p.price <= ui.max &&
      (!ui.query ||
        [p.name, p.cat, p.brand, p.sku, p.desc, ...p.features]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(ui.query.toLocaleLowerCase("vi"))) &&
      (!ui.onlyFav || state.favorites.includes(p.id)),
  ).sort((a, b) =>
    ui.sort === "priceLow"
      ? a.price - b.price
      : ui.sort === "priceHigh"
        ? b.price - a.price
        : ui.sort === "name"
          ? a.name.localeCompare(b.name)
          : a.id - b.id,
  );
}
function shopPage() {
  let list = filteredProducts();
  return storefront(
    `<div class="container"><div class="crumb"><a href="#/home">Trang chủ</a> › Sản phẩm ${ui.category !== "Tất cả" ? "› " + esc(ui.category) : ""}</div><h1 class="page-title">${ui.category === "Tất cả" ? "Tất cả sản phẩm" : esc(ui.category)}</h1><p class="muted" style="font-size:12px;margin:3px 0 0">Thiết bị công nghệ chọn lọc — lựa chọn hoàn hảo cho mọi setup.</p><div class="shop-layout"><aside class="filters" id="mobile-filters"><div class="filter-head"><strong>Bộ lọc</strong><button class="text-link" data-action="clear-filter">Xóa tất cả</button></div><div class="filter-section"><h4>Danh mục</h4>${["Tất cả", ...CATS.map((x) => x.name)].map((c) => `<label class="checkrow"><input type="radio" name="category" value="${c}" ${ui.category === c ? "checked" : ""}> ${c}</label>`).join("")}</div><div class="filter-section"><h4>Thương hiệu</h4>${["Tất cả", ...new Set(INITIAL.map((p) => p.brand))].map((b) => `<label class="checkrow"><input type="radio" name="brand" value="${b}" ${ui.brand === b ? "checked" : ""}> ${b}</label>`).join("")}</div><div class="filter-section"><h4>Khoảng giá tối đa</h4><select name="maxPrice" class="select"><option value="10000000" ${ui.max === 10000000 ? "selected" : ""}>Tất cả mức giá</option><option value="1000000" ${ui.max === 1000000 ? "selected" : ""}>Dưới 1 triệu</option><option value="3000000" ${ui.max === 3000000 ? "selected" : ""}>Dưới 3 triệu</option><option value="5000000" ${ui.max === 5000000 ? "selected" : ""}>Dưới 5 triệu</option></select></div></aside><section><div class="sort-header"><div><p>Tìm thấy <strong>${list.length}</strong> sản phẩm</p><button class="btn-quiet mobile-filter hide" data-action="filters">☷ Bộ lọc</button></div><select class="select" style="max-width:195px" name="sort" aria-label="Sắp xếp sản phẩm"><option value="popular" ${ui.sort === "popular" ? "selected" : ""}>Phổ biến</option><option value="priceLow" ${ui.sort === "priceLow" ? "selected" : ""}>Giá: Thấp đến cao</option><option value="priceHigh" ${ui.sort === "priceHigh" ? "selected" : ""}>Giá: Cao đến thấp</option><option value="name" ${ui.sort === "name" ? "selected" : ""}>Tên A – Z</option></select></div>${list.length ? `<div class="shop-products">${list.map(productCard).join("")}</div>` : `<div class="empty"><h2>Không tìm thấy sản phẩm</h2><p>Hãy thử từ khóa hoặc bộ lọc khác.</p><button class="btn btn-violet" data-action="clear-filter">Xóa bộ lọc</button></div>`}</section></div></div>`,
    "shop",
    true,
  );
}
function detailPage(id) {
  const p = INITIAL.find((x) => x.id === +id) || INITIAL[0],
    stock = pstock(p);
  const qty = Math.min(Math.max(ui.qty || 1, 1), Math.max(stock, 1));
  ui.qty = qty;
  const related = [
    ...INITIAL.filter((x) => x.id !== p.id && x.cat === p.cat),
    ...INITIAL.filter((x) => x.id !== p.id && x.cat !== p.cat),
  ].slice(0, 4);
  return storefront(
    `<div class="pd-experience container" data-product-id="${p.id}" data-stock="${stock}">
 <nav class="pd-breadcrumb" aria-label="Đường dẫn"><a href="home.html">Trang chủ</a><span>/</span><a href="prd.html?cat=${encodeURIComponent(p.cat)}">${esc(p.cat)}</a><span>/</span><span>${esc(p.short)}</span></nav>
 <section class="pd-hero" aria-labelledby="pd-title">
  <div class="pd-orbit pd-orbit-one" aria-hidden="true"></div><div class="pd-orbit pd-orbit-two" aria-hidden="true"></div>
  <div class="pd-topline"><span>NEXA SELECT <b>/ ${esc(p.cat)}</b></span><button class="pd-save" data-detail-action="favorite" aria-pressed="${state.favorites.includes(p.id)}" aria-label="Yêu thích ${esc(p.name)}">${gearIcon("heart")}</button></div>
  <div class="pd-artwork" data-view="full" data-tone="original">
   <div class="pd-watermark" aria-hidden="true">${esc(p.brand)}</div>
   <div class="pd-wordmark" aria-hidden="true"><span>${esc(p.brand)}</span><span>${esc(p.sku.split("-").slice(1).join(" ") || p.short)}</span></div>
   <div class="pd-product-art">${productImage(p, "eager")}</div>
   <span class="pd-art-caption">${esc(p.sku)} <i></i> ẢNH SẢN PHẨM</span>
   <div class="pd-view-dots" aria-label="Góc nhìn sản phẩm">${[
     ["full", "Toàn cảnh"],
     ["angle", "Góc nghiêng"],
     ["close", "Cận cảnh"],
   ]
     .map(
       ([view, label], i) =>
         `<button data-detail-view="${view}" aria-label="${label}" aria-pressed="${!i}" class="${i ? "" : "active"}"><span></span></button>`,
     )
     .join("")}</div>
  </div>
  <div class="pd-bottom">
   <div class="pd-gallery"><span class="pd-label">KHÁM PHÁ THIẾT KẾ</span><div class="pd-thumbnails">${[
     ["full", "Toàn cảnh"],
     ["angle", "Góc nghiêng"],
     ["close", "Cận cảnh"],
   ]
     .map(
       ([view, label], i) =>
         `<button data-detail-view="${view}" class="pd-thumbnail ${i ? "" : "active"}" aria-label="Xem ${label.toLowerCase()}" aria-pressed="${!i}"><span class="pd-thumbnail-art pd-thumb-${view}">${productImage(p)}</span><span>${label}</span></button>`,
     )
     .join("")}</div><div class="pd-tones"><span>Màu sắc</span>${[
     ["original", "Gốc"],
     ["ice", "Lạnh"],
     ["rose", "Hồng"],
   ]
     .map(
       ([tone, label], i) =>
         `<button class="pd-tone tone-${tone}" data-detail-tone="${tone}" aria-label="Màu sắc ${label}" aria-pressed="${!i}"></button>`,
     )
     .join("")}</div></div>
   <div class="pd-purchase"><div class="pd-product-heading"><div><span class="pd-label">${esc(p.brand)} / ${esc(p.cat)}</span><h1 id="pd-title">${esc(p.name)}</h1></div><div class="pd-price"><strong>${money(p.price)}</strong>${p.old ? `<del>${money(p.old)}</del>` : ""}</div></div>
   <div class="pd-stock"><span class="${stock ? "" : "out"}"></span>${stock ? `Còn ${stock} sản phẩm` : "Tạm hết hàng"}</div>
   ${p.type === "keyboard" ? `<label class="pd-variant">Switch<select data-detail-variant aria-label="Chọn switch">${["Red", "Brown", "Blue", "Silent"].map((v) => `<option ${ui.variant === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>` : ""}
   <div class="pd-buy-row"><div class="pd-quantity" role="group" aria-label="Số lượng"><button data-detail-action="decrease" aria-label="Giảm số lượng" ${qty <= 1 ? "disabled" : ""}>−</button><output aria-live="polite">${qty}</output><button data-detail-action="increase" aria-label="Tăng số lượng" ${qty >= stock ? "disabled" : ""}>+</button></div><button class="pd-add" data-detail-action="add" ${stock ? "" : "disabled"}>${gearIcon("bag")}Thêm vào giỏ</button><button class="pd-buy" data-detail-action="buy" ${stock ? "" : "disabled"}>Mua ngay ${gearIcon("arrow")}</button></div>
   </div>
  </div>
 </section>
 <section class="pd-story" aria-labelledby="pd-story-title"><div><span class="pd-label">THIẾT KẾ CHO GÓC CHƠI CỦA BẠN</span><h2 id="pd-story-title">${esc(p.features[0])}<span>Chất riêng trong từng chi tiết.</span></h2><p>${esc(p.desc)}</p></div><dl class="pd-specs">${p.features.map((f, i) => `<div><dt>${String(i + 1).padStart(2, "0")}</dt><dd>${esc(f)}</dd></div>`).join("")}</dl></section>
 <section class="pd-related"><div class="gear-section-head"><div><span class="gear-kicker">TIẾP TỤC HOÀN THIỆN GÓC CHƠI</span><h2>Có thể bạn cũng thích.</h2></div><a href="prd.html">Khám phá thêm ↗</a></div><div class="products-grid">${related.map(productCard).join("")}</div></section>
 </div>`,
    "shop",
  );
}

function cartPage() {
  let rows = cartRows();
  return storefront(
    `<div class="container"><div class="crumb"><a href="#/home">Trang chủ</a> › Giỏ hàng</div><h1 class="page-title">Giỏ hàng <span style="font-size:14px;color:#8a96ac;font-weight:500">(${cartCount()} sản phẩm)</span></h1>${rows.length ? `<div class="cart-layout"><div class="whitebox"><h3>Danh sách sản phẩm</h3>${rows.map(({ p, qty }) => `<div class="cart-line"><div class="cart-image">${productImage(p)}</div><div><strong>${esc(p.name)}</strong><small style="display:block">${esc(p.brand)} · SKU: ${esc(p.sku)}</small><div class="price">${money(p.price)}</div><button class="remove" data-action="remove" data-id="${p.id}">Xóa khỏi giỏ</button></div><div style="text-align:right"><div class="qty"><button data-action="change-cart" data-id="${p.id}" data-delta="-1" aria-label="Giảm số lượng">−</button><span>${qty}</span><button data-action="change-cart" data-id="${p.id}" data-delta="1" aria-label="Tăng số lượng">+</button></div><div style="font-size:12px;margin-top:8px;font-weight:850;color:#253452">${money(p.price * qty)}</div></div></div>`).join("")}</div><aside class="whitebox"><h3>Tóm tắt đơn hàng</h3><form data-form="coupon" class="coupon"><input name="coupon" class="field" placeholder="Nhập mã ưu đãi" value="${esc(ui.coupon)}"><button class="btn btn-dark">Áp dụng</button></form>${orderSummary()}<button class="btn btn-primary full" data-route="checkout" style="margin-top:20px">Tiếp tục thanh toán ↗</button></aside></div>` : `<div class="empty" style="margin:23px 0 50px"><div class="empty-illustration" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.4 12H5.4L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3M8 13h.01M12 13h.01M16 13h.01"/></svg></div><h2>Giỏ hàng đang trống</h2><p>Bắt đầu khám phá những món gaming gear bạn yêu thích.</p><button class="btn btn-violet" data-route="shop">Khám phá sản phẩm</button></div>`}</div>`,
    "cart",
    true,
  );
}
function orderSummary() {
  return `<div class="summary-row"><span>Tạm tính</span><strong>${money(subtotal())}</strong></div><div class="summary-row"><span>Giảm giá ${ui.coupon ? "(" + esc(ui.coupon) + ")" : ""}</span><strong style="color:#db4668">−${money(discount())}</strong></div><div class="summary-row"><span>Vận chuyển</span><strong>${shipping() === 0 ? "Miễn phí" : money(shipping())}</strong></div><div class="summary-row total"><span>Tổng cộng</span><strong>${money(subtotal() - discount() + shipping())}</strong></div>`;
}
function checkoutPage() {
  if (!state.cart.length) return cartPage();
  return storefront(
    `<div class="container"><div class="crumb"><a href="#/cart">Giỏ hàng</a> › Thanh toán</div><h1 class="page-title">Thanh toán</h1><div class="checkout-steps" aria-label="Tiến trình thanh toán"><span class="current" aria-current="step"><b>1</b> Địa chỉ</span><i aria-hidden="true"></i><span><b>2</b> Vận chuyển</span><i aria-hidden="true"></i><span><b>3</b> Xác nhận</span></div><div class="checkout-layout"><form id="checkout-form" data-form="checkout"><div class="whitebox"><h3>Thông tin nhận hàng</h3><div class="form-grid"><div><label for="coName" class="field-label">Họ và tên *</label><input id="coName" class="field" name="name" required maxlength="80" placeholder="Nguyễn Văn A" autocomplete="name"></div><div><label for="coPhone" class="field-label">Số điện thoại *</label><input id="coPhone" class="field" name="phone" required minlength="9" maxlength="15" pattern="[0-9+() .-]{9,15}" placeholder="09xxxxxxxx" autocomplete="tel"></div></div><label for="coEmail" class="field-label">Email *</label><input id="coEmail" class="field" name="email" type="email" required maxlength="120" placeholder="you@example.com" autocomplete="email"><label for="coAddress" class="field-label">Địa chỉ nhận hàng *</label><input id="coAddress" class="field" name="address" required minlength="8" maxlength="180" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" autocomplete="street-address"><label for="coNote" class="field-label">Ghi chú giao hàng</label><textarea id="coNote" class="field" name="note" rows="2" maxlength="300" placeholder="Ghi chú cho người giao hàng (nếu có)"></textarea></div><div class="whitebox" style="margin-top:17px"><h3>Phương thức vận chuyển</h3><label class="radio-card"><span><input type="radio" name="ship" value="normal" ${ui.ship === "normal" ? "checked" : ""}> Giao hàng tiêu chuẩn (2–4 ngày)</span><b>0–30.000 ₫</b></label><label class="radio-card"><span><input type="radio" name="ship" value="express" ${ui.ship === "express" ? "checked" : ""}> Giao hàng nhanh (1–2 ngày)</span><b>50.000 ₫</b></label></div><div class="whitebox" style="margin-top:17px"><h3>Phương thức thanh toán</h3><label class="radio-card"><span><input type="radio" name="pay" value="cod" ${ui.pay === "cod" ? "checked" : ""}> Thanh toán khi nhận hàng (COD)</span></label><label class="radio-card"><span><input type="radio" name="pay" value="momo" ${ui.pay === "momo" ? "checked" : ""}> Ví MoMo</span></label><label class="radio-card"><span><input type="radio" name="pay" value="vnpay" ${ui.pay === "vnpay" ? "checked" : ""}> VNPAY</span></label></div><button class="btn btn-violet full" style="margin-top:18px;padding:15px" type="submit">Đặt hàng · ${money(subtotal() - discount() + shipping())} ↗</button></form><aside class="whitebox"><h3>Đơn hàng của bạn</h3>${cartRows()
      .map(
        ({ p, qty }) =>
          `<div style="display:flex;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #edf0f4"><div class="cart-image" style="width:58px;height:52px;flex-shrink:0">${productImage(p)}</div><div style="font-size:11px;flex:1"><b>${esc(p.short)}</b><div style="color:#7b8aa1">SL: ${qty}</div></div><b style="font-size:11px">${money(p.price * qty)}</b></div>`,
      )
      .join("")}${orderSummary()}</aside></div></div>`,
    "cart",
    true,
  );
}
function successPage(id) {
  let order = state.orders.find((x) => x.id === id);
  return storefront(
    `<div class="container"><div class="whitebox success-order" style="margin:35px auto"><div class="big-check">✓</div><h1>Đặt hàng thành công!</h1><p>Mã đơn <b>${esc(id)}</b>. </p><div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:22px"><button class="btn btn-violet" data-route="orders">Theo dõi đơn hàng</button><button class="btn btn-dark" data-route="shop">Tiếp tục mua sắm</button></div></div></div>`,
    "cart",
    true,
  );
}
function orderStage(status) {
  if (status === "Đã hủy" || status === "Thanh toán bị hủy") return -1;
  if (status === "Đã giao") return 4;
  if (status === "Đang vận chuyển") return 3;
  if (["Đã xác nhận", "Đang xử lý", "Đã thanh toán"].includes(status))
    return 2;
  return 1;
}
function orderTimeline(status) {
  let stage = orderStage(status);
  if (stage < 0) return `<div class="order-cancelled">Đơn hàng đã hủy</div>`;
  return `<ol class="order-timeline">${["Đặt hàng", "Chờ xác nhận", "Đã xác nhận", "Đang vận chuyển", "Đã giao"].map((label, i) => `<li class="${i < stage ? "done" : i === stage ? "current" : ""}"><span>${i < stage ? "✓" : i + 1}</span><b>${label}</b></li>`).join("")}</ol>`;
}
function orderFilterKey(status) {
  if (status === "Chờ xác nhận") return "Chờ xác nhận";
  if (status === "Đang vận chuyển") return "Đang vận chuyển";
  if (status === "Đã giao") return "Đã giao";
  if (status === "Đã hủy" || status === "Thanh toán bị hủy")
    return "Đã hủy";
  return "Khác";
}
function ordersPage() {
  let all = [...state.orders].reverse(),
    filters = [
      "Tất cả",
      "Chờ xác nhận",
      "Đang vận chuyển",
      "Đã giao",
      "Đã hủy",
    ],
    orders =
      ui.ordersFilter === "Tất cả"
        ? all
        : all.filter((o) => orderFilterKey(o.status) === ui.ordersFilter);
  return storefront(
    `<div class="container"><div class="crumb">Trang chủ › Tài khoản</div><h1 class="page-title">Đơn hàng của tôi</h1><p class="muted">Theo dõi trạng thái và tiến trình từng đơn hàng.</p>${all.length ? `<nav class="order-filters" aria-label="Lọc đơn hàng">${filters.map((f) => `<button type="button" class="${ui.ordersFilter === f ? "active" : ""}" aria-pressed="${ui.ordersFilter === f}" data-action="order-filter" data-value="${f}">${f}${f === "Tất cả" ? ` (${all.length})` : ""}</button>`).join("")}</nav>${orders.length ? `<div class="orders-list">${orders.map((o) => `<article class="whitebox order-card"><header class="order-card-head"><div><b>${esc(o.id)}</b><span>${new Date(o.time).toLocaleString("vi-VN")}</span></div><span class="order-status ${orderStage(o.status) < 0 ? "cancelled" : orderStage(o.status) === 4 ? "delivered" : ""}">${esc(o.status)}</span></header>${orderTimeline(o.status)}<div class="order-items">${o.items.map((x) => `<div><span>${esc(x.name)} × ${x.qty}</span><b>${money(x.total)}</b></div>`).join("")}</div><footer class="order-card-foot"><span>${o.pay === "cod" ? "Thanh toán khi nhận hàng" : "Thanh toán " + (o.pay === "momo" ? "MoMo" : "VNPAY")}</span><b>Tổng cộng: ${money(o.total)}</b></footer></article>`).join("")}</div>` : `<div class="empty order-empty"><h2>Không có đơn hàng ở trạng thái này</h2><p>Hãy chọn tab khác để xem đơn hàng.</p></div>`}` : `<div class="empty" style="margin:25px 0 50px"><h2>Chưa có đơn hàng</h2><p>Hãy thử quy trình mua sắm để trải nghiệm.</p><button class="btn btn-violet" data-route="shop">Mua sắm ngay</button></div>`}</div>`,
    "cart",
    true,
  );
}

/* FILE: assets/js/pages/admin.js */
/* Giao diện quản trị và widget | NEXA / CommerceOS static demo. */
function adminSidebar(active) {
  let menu = [
    ["dashboard", "◫", "Tổng quan"],
    ["products", "⬡", "Sản phẩm"],
    ["orders", "▤", "Đơn hàng"],
    ["inventory", "▣", "Tồn kho"],
    ["analytics", "▥", "Báo cáo"],
    ["customers", "♙", "Khách hàng"],
    ["promotions", "◈", "Ưu đãi"],
    ["reviews", "★", "Đánh giá"],
    ["support", "☏", "Hỗ trợ"],
    ["settings", "⚙", "Cài đặt"],
    ["store", "↗", "Xem cửa hàng"],
  ];
  return `<aside class="admin-sidebar" id="admin-sidebar"><div class="admin-logo"><span class="brand-mark" style="width:28px;height:28px;font-size:16px">N</span> CommerceOS<span style="font-size:8px;color:#a1aed1;font-weight:500;align-self:center">DEMO</span></div><nav class="admin-menu">${menu.map(([r, i, t]) => `<button class="admin-link ${r === active ? "active" : ""}" data-route="${r === "store" ? "home" : "admin/" + r}"><span class="ico">${i}</span>${t}</button>`).join("")}</nav><div class="sidebar-bottom"><div class="admin-user"><span class="admin-avatar">A</span><div><b>Admin Demo</b><br><span>Local-only prototype</span></div></div></div></aside>`;
}
function adminLayout(active, content) {
  return `<div class="admin-app">${adminSidebar(active)}<div class="admin-main"><header class="admin-top"><button class="sidebar-toggle" data-action="sidebar" aria-label="Mở menu quản trị">☰</button><label class="admin-top-search">⌕ <input id="admin-global-search" placeholder="Tìm sản phẩm, đơn hàng, khách hàng..." aria-label="Tìm nhanh admin"></label><div class="admin-top-right"><span class="demo-pill desktop-only">STATIC DEMO</span><button class="icon-btn" style="color:#42536c" data-route="home" title="Xem cửa hàng">↗</button><span class="admin-avatar" style="height:32px;width:32px;font-size:12px">A</span><b class="desktop-only">Admin</b></div></header><main class="admin-content">${content}</main></div></div><div id="admin-veil" class="admin-veil hide" data-action="sidebar"></div>${ui.modal ? modalView() : ""}`;
}
function graphSvg(big = false) {
  let arr = [
    14, 19, 22, 26, 35, 39, 31, 29, 32, 35, 37, 33, 42, 40, 43, 48, 47, 52, 46,
    54, 57, 48, 45, 59, 61, 58, 71, 75, 69, 82,
  ];
  let w = 750,
    h = big ? 285 : 220,
    baseline = h - 21;
  let step = (w - 38) / arr.length;
  let bars = arr
    .map(
      (v, i) =>
        `<rect x="${25 + i * step}" y="${baseline - v * 2}" width="${Math.max(8, step - 8)}" height="${v * 2}" rx="3" fill="${i > 25 ? "#7265ff" : "#a1a0ff"}" opacity="${i > 25 ? "1" : ".83"}"/>`,
    )
    .join("");
  let pts = arr
    .map(
      (v, i) =>
        `${25 + i * step + step / 2},${baseline - v * 1.83 - 15 + Math.sin(i * 0.7) * 13}`,
    )
    .join(" ");
  let grid = [0, 1, 2, 3, 4]
    .map(
      (i) =>
        `<line x1="22" y1="${21 + (i * (baseline - 21)) / 4}" x2="740" y2="${21 + (i * (baseline - 21)) / 4}" stroke="#dfe7f4" stroke-width="1"/>`,
    )
    .join("");
  return `<svg class="graph ${big ? "admin-chart-wide" : ""}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu mẫu 30 ngày, số liệu minh họa">${grid}${bars}<polyline points="${pts}" fill="none" stroke="#36b8be" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${[0, 4, 9, 14, 19, 24, 29].map((i) => `<text x="${25 + i * step}" y="${h - 4}" fill="#8492a6" font-size="12">${String(i + 1).padStart(2, "0")}/10</text>`).join("")}</svg>`;
}
function kpi(title, value, icon, change, cls = "") {
  return `<div class="kpi"><small>${title}</small><strong>${value}</strong><span class="change ${cls}">${change}</span><span class="kpi-icon ${cls === "down" ? "red" : cls === "green" ? "green" : ""}">${icon}</span></div>`;
}
function statusPill(s) {
  return `<span class="pill ${s === "Đã giao" ? "green" : ["Đã xác nhận", "Đang vận chuyển"].includes(s) ? "blue" : s === "Đã hủy" ? "red" : "yellow"}">${esc(s)}</span>`;
}
function demoOrders() {
  let samples = [
    {
      id: "#NX-1001",
      name: "Nguyễn Văn An",
      items: [{ name: "NEXA X75", qty: 1, total: 2490000 }],
      total: 2490000,
      status: "Đã giao",
      time: "2026-10-15T08:42:00",
    },
    {
      id: "#NX-1002",
      name: "Trần Thị Mai",
      items: [{ name: "Razer BlackShark V2 Pro", qty: 1, total: 4990000 }],
      total: 4990000,
      status: "Đang xử lý",
      time: "2026-10-16T10:14:00",
    },
    {
      id: "#NX-1003",
      name: "Lê Minh Hoàng",
      items: [
        { name: "Logitech G Pro X Superlight 2", qty: 1, total: 2890000 },
      ],
      total: 2890000,
      status: "Đã xác nhận",
      time: "2026-10-17T09:19:00",
    },
    {
      id: "#NX-1004",
      name: "Phạm Thu Hà",
      items: [{ name: "Keychron K2", qty: 1, total: 2690000 }],
      total: 2690000,
      status: "Đang xử lý",
      time: "2026-10-17T12:01:00",
    },
  ];
  return [...state.orders].reverse().concat(samples);
}
function shortOrderTable(orders, max) {
  return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>${orders
    .slice(0, max)
    .map(
      (o) =>
        `<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.name)}</td><td>${o.items.length} sản phẩm</td><td><strong>${money(o.total)}</strong></td><td>${statusPill(o.status)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function adminDashboard() {
  let low = [...INITIAL]
    .filter((p) => pstock(p) < 13)
    .sort((a, b) => pstock(a) - pstock(b));
  return adminLayout(
    "dashboard",
    `<div class="admin-intro"><div><h1>Tổng quan <span class="demo-pill">DỮ LIỆU MẪU</span></h1><p>Chào mừng bạn trở lại! Đây là giao diện quản trị CommerceOS.</p></div><span class="admin-select">Tháng 10 / 2026 ▾</span></div><div class="admin-hero-note">🔎 <strong>Giới hạn bản demo:</strong> Doanh thu / biểu đồ là dữ liệu minh họa. Đơn vừa đặt và chỉnh sửa tồn kho được lưu cục bộ trên trình duyệt. Không có backend, phân quyền hoặc bảo mật thực.</div><div class="admin-kpis">${kpi("Doanh thu mô phỏng", "285.420.000 ₫", "▣", "↑ 12.5% so với tháng trước", "green")}${kpi("Đơn hàng (bao gồm demo)", String(342 + state.orders.length), "♧", "↑ 18.2% so với tháng trước")}${kpi("Khách hàng mới (demo)", "128", "♙", "↑ 6.7% so với tháng trước")}${kpi("Sản phẩm sắp hết", String(low.length), "⚠", "Tồn dưới 13 sản phẩm", "down")}</div><div class="admin-charts"><div class="admin-panel"><div class="admin-panel-head"><div><h3>Doanh thu & Đơn hàng</h3><div class="chart-legend"><span><i class="legend-dot"></i>Doanh thu minh họa</span><span><i class="legend-dot green"></i>Xu hướng đơn</span></div></div><span class="admin-select">Theo ngày ▾</span></div>${graphSvg()}</div><div class="admin-panel"><div class="admin-panel-head"><h3>Tỷ lệ danh mục sản phẩm</h3><span class="admin-select">Tháng này ▾</span></div><div class="donut-wrap"><div class="donut"><div class="donut-hole"><div><strong>${INITIAL.length}</strong><br><small>Sản phẩm demo</small></div></div></div><div class="donut-legend"><div>🟣 Bàn phím · 36%</div><div>🔵 Chuột · 19%</div><div>🟪 Tai nghe · 21%</div><div>🟠 Màn hình · 15%</div><div>⚪ Khác · 9%</div></div></div></div></div><div class="admin-bottom"><div class="admin-panel"><div class="admin-panel-head"><h3>Đơn hàng gần đây</h3><button class="text-link" data-route="admin/orders">Xem tất cả ↗</button></div>${shortOrderTable(demoOrders(), 5)}</div><div class="admin-panel"><div class="admin-panel-head"><h3>Sản phẩm tồn kho thấp</h3><button class="text-link" data-route="admin/inventory">Xem tất cả ↗</button></div>${
      low.length
        ? low
            .slice(0, 5)
            .map(
              (p) =>
                `<div style="display:flex;gap:9px;align-items:center;padding:9px 0;border-bottom:1px solid #e9edf4"><div class="mini-product"><div class="mini-img">${productImage(p)}</div></div><div style="flex:1;min-width:0"><b style="font-size:11px;color:#273852">${esc(p.short)}</b><small style="display:block;color:#8290a5">SKU: ${esc(p.sku)}</small></div><span class="pill ${pstock(p) < 7 ? "red" : "yellow"}">Còn ${pstock(p)}</span></div>`,
            )
            .join("")
        : `<p>Chưa có cảnh báo tồn kho.</p>`
    }</div></div>`,
  );
}
function adminProducts() {
  let pro = INITIAL.filter(
    (p) =>
      (ui.adminProductFilter === "Tất cả" || p.cat === ui.adminProductFilter) &&
      [p.name, p.sku, p.brand, p.cat]
        .join(" ")
        .toLowerCase()
        .includes(ui.adminSearch.toLowerCase()) &&
      (ui.adminStockFilter === "Tất cả" ||
        (ui.adminStockFilter === "Hết hàng" ? pstock(p) === 0 : pstock(p) > 0)),
  );
  return adminLayout(
    "products",
    `<div class="admin-intro"><div><h1>Quản lý sản phẩm</h1><p>Danh mục, sản phẩm, SKU và giá bán (mô phỏng).</p></div><button class="btn btn-primary" data-action="open-product-add">＋ Thêm sản phẩm</button></div><div class="admin-panel"><div class="admin-tabs"><button class="admin-tab ${ui.adminStockFilter === "Tất cả" ? "active" : ""}" data-action="admin-stock-filter" data-value="Tất cả">Tất cả (${INITIAL.length})</button><button class="admin-tab ${ui.adminStockFilter === "Đang kinh doanh" ? "active" : ""}" data-action="admin-stock-filter" data-value="Đang kinh doanh">Đang kinh doanh (${INITIAL.filter((p) => pstock(p) > 0).length})</button><button class="admin-tab ${ui.adminStockFilter === "Hết hàng" ? "active" : ""}" data-action="admin-stock-filter" data-value="Hết hàng">Hết hàng (${INITIAL.filter((p) => pstock(p) === 0).length})</button></div><div class="admin-toolbar"><input id="admin-product-search" class="field" placeholder="⌕ Tìm theo tên hoặc mã SKU..." value="${esc(ui.adminSearch)}" aria-label="Tìm sản phẩm quản trị"><select class="select" id="admin-product-filter"><option>Tất cả</option>${CATS.map((c) => `<option value="${c.name}" ${c.name === ui.adminProductFilter ? "selected" : ""}>${c.name}</option>`).join("")}</select><span style="font-size:11px;color:#8290a6;margin-left:auto">${pro.length} sản phẩm</span></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${pro.map((p) => `<tr><td><div class="mini-product"><span class="mini-img">${productImage(p)}</span><span><strong>${esc(p.short)}</strong><small>${esc(p.brand)}</small></span></div></td><td>${esc(p.sku)}</td><td>${esc(p.cat)}</td><td><strong>${money(p.price)}</strong></td><td>${pstock(p)}</td><td><span class="pill ${pstock(p) === 0 ? "red" : pstock(p) < 10 ? "yellow" : "green"}">${pstock(p) === 0 ? "Hết hàng" : pstock(p) < 10 ? "Sắp hết" : "Đang kinh doanh"}</span></td><td><button class="btn-quiet" data-action="edit-product" data-id="${p.id}">✎ Sửa</button></td></tr>`).join("")}</tbody></table></div></div>`,
  );
}
function adminInventory() {
  let rows = INITIAL.filter((p) =>
    [p.name, p.sku, p.cat]
      .join(" ")
      .toLowerCase()
      .includes(ui.adminSearch.toLowerCase()),
  );
  let low = INITIAL.filter((p) => pstock(p) < 10).length;
  return adminLayout(
    "inventory",
    `<div class="admin-intro"><div><h1>Quản lý tồn kho</h1><p>Cập nhật số lượng tồn của từng SKU (dữ liệu cục bộ).</p></div><button class="btn btn-primary" data-action="inventory-guide">? Hướng dẫn nghiệp vụ</button></div><div class="admin-kpis">${kpi("Tổng tồn kho", INITIAL.reduce((s, p) => s + pstock(p), 0).toLocaleString("vi-VN"), "▣", "Tính từ dữ liệu hiện tại", "green")}${kpi("Sản phẩm có hàng", INITIAL.filter((p) => pstock(p) > 0).length + " / " + INITIAL.length, "⬡", "SKU đang khả dụng")}${kpi("Sản phẩm sắp hết", low, "⚠", "Dưới 10 sản phẩm", "down")}${kpi("Hết hàng", INITIAL.filter((p) => pstock(p) === 0).length, "⊘", "Cần nhập kho bổ sung", "down")}</div><div class="admin-panel"><div class="admin-panel-head"><h3>Danh sách tồn kho theo SKU</h3><span class="demo-pill">CHỈ DEMO</span></div><div class="admin-toolbar"><input id="admin-product-search" class="field" placeholder="⌕ Tìm tên hoặc SKU..." value="${esc(ui.adminSearch)}"><span style="font-size:11px;color:#8794ab">Thay đổi số lượng và nhấn Enter hoặc rời ô để lưu</span></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Tồn thực tế</th><th>Tồn đang giữ</th><th>Tồn khả dụng</th><th>Cảnh báo</th></tr></thead><tbody>${rows.map((p) => `<tr><td><div class="mini-product"><span class="mini-img">${productImage(p)}</span><span><strong>${esc(p.short)}</strong><small>${esc(p.cat)}</small></span></div></td><td>${esc(p.sku)}</td><td><input type="number" class="stock-input" name="stock" data-id="${p.id}" min="0" max="999999" value="${pstock(p)}" aria-label="Tồn kho ${esc(p.name)}"></td><td>0 <small>Demo</small></td><td><strong>${pstock(p)}</strong></td><td><span class="pill ${pstock(p) === 0 ? "red" : pstock(p) < 10 ? "yellow" : "green"}">${pstock(p) === 0 ? "Hết hàng" : pstock(p) < 10 ? "Sắp hết" : "Bình thường"}</span></td></tr>`).join("")}</tbody></table></div><div class="demo-notice">Sản phẩm thật cần có <b>phiếu nhập/xuất, transaction, inventory ledger, reserved stock, audit log và đồng bộ backend</b>. Bản HTML chỉ sửa con số mô phỏng để kiểm thử UI.</div></div>`,
  );
}
function adminOrders() {
  let orders = demoOrders().filter(
    (o) =>
      (ui.adminOrderFilter === "Tất cả" || o.status === ui.adminOrderFilter) &&
      [o.id, o.name]
        .join(" ")
        .toLowerCase()
        .includes(ui.adminSearch.toLowerCase()),
  );
  return adminLayout(
    "orders",
    `<div class="admin-intro"><div><h1>Quản lý đơn hàng</h1><p>Tra cứu, theo dõi và cập nhật trạng thái đơn (đơn demo trong trình duyệt).</p></div><span class="admin-select">${orders.length} đơn hiển thị</span></div><div class="admin-panel"><div class="admin-toolbar"><input class="field" id="admin-product-search" value="${esc(ui.adminSearch)}" placeholder="⌕ Tìm mã đơn, khách hàng..."><select class="select" name="orderFilter">${["Tất cả", "Chờ xác nhận", "Đã xác nhận", "Đang xử lý", "Đang vận chuyển", "Đã giao", "Đã hủy"].map((s) => `<option ${ui.adminOrderFilter === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày tạo</th><th>Số SP</th><th>Tổng tiền</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>${orders.map((o) => `<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.name)}</td><td>${new Date(o.time).toLocaleDateString("vi-VN")}</td><td>${o.items.reduce((a, b) => a + b.qty, 0)}</td><td><strong>${money(o.total)}</strong></td><td>${statusPill(o.status)}</td><td>${state.orders.some((x) => x.id === o.id) ? `<select class="select" style="width:145px" name="orderStatus" data-id="${esc(o.id)}">${["Chờ xác nhận", "Đã xác nhận", "Đang xử lý", "Đang vận chuyển", "Đã giao", "Đã hủy"].map((s) => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>` : `<span style="font-size:10px;color:#8190a8">Dữ liệu mẫu</span>`}</td></tr>`).join("")}</tbody></table></div><div class="demo-notice">Ở sản phẩm production, việc thay đổi trạng thái phải được kiểm tra trên server theo state machine, phân quyền theo vai trò và ghi audit log.</div></div>`,
  );
}
function adminAnalytics() {
  return adminLayout(
    "analytics",
    `<div class="admin-intro"><div><h1>Báo cáo & phân tích</h1><p>Góc nhìn doanh thu, vận hành và hiệu quả kinh doanh — toàn bộ số liệu bên dưới là dữ liệu mẫu.</p></div><span class="admin-select">30 ngày gần nhất ▾</span></div><div class="admin-kpis">${kpi("Doanh thu ước tính", "285.420.000 ₫", "▣", "↑ 12.5% so với tháng trước")}${kpi("Lợi nhuận gộp mẫu", "86.200.000 ₫", "↗", "↑ 10.2%")}${kpi("Tổng đơn", "342", "♧", "↑ 18.2%")}${kpi("Tỷ lệ hủy mẫu", "2.3%", "⚠", "↓ 0.8%")}</div><div class="admin-panel" style="margin-bottom:17px"><div class="admin-panel-head"><div><h3>Doanh thu theo thời gian</h3><p style="font-size:11px;color:#7c8aa2;margin:5px 0 0">Dữ liệu mẫu phục vụ thiết kế UI/UX</p></div><span class="admin-select">Tháng này ▾</span></div>${graphSvg(true)}</div><div class="admin-charts"><div class="admin-panel"><h3>Sản phẩm bán chạy (mẫu)</h3>${INITIAL.slice(
      0,
      5,
    )
      .map(
        (p, i) =>
          `<div style="display:flex;align-items:center;gap:12px;margin:18px 0"><div style="font-size:11px;color:#7e8ba0;width:18px">0${i + 1}</div><div style="font-size:11px;color:#2d3a52;width:156px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.short)}</div><div style="height:10px;background:#edf1f8;border-radius:10px;flex:1;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,#6355fc,#54cee3);width:${90 - i * 14}%"></div></div><b style="font-size:11px;color:#22334c">${Math.round(120 - i * 19)}</b></div>`,
      )
      .join(
        "",
      )}</div><div class="admin-panel"><h3>Đóng góp danh mục (mẫu)</h3><div class="donut-wrap"><div class="donut"><div class="donut-hole"><div><strong>100%</strong><br><small>Dữ liệu mẫu</small></div></div></div><div class="donut-legend"><div>🟣 Bàn phím — 36%</div><div>🔵 Chuột — 19%</div><div>🟪 Tai nghe — 21%</div><div>🟠 Màn hình — 15%</div><div>⚪ Khác — 9%</div></div></div></div></div>`,
  );
}
function modalView() {
  let p = ui.modal?.id ? INITIAL.find((x) => x.id === ui.modal.id) : null;
  const fallback = `assets/images/categories/${CATEGORY_IMAGE_BY_TYPE[p?.type] || CATEGORY_IMAGE_BY_TYPE.keyboard}`;
  const image = p?.image || fallback;
  const isUploaded = image.startsWith("data:");
  return `<div class="modal-back" id="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${p ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm demo"}</h2><form data-form="product-editor"><input type="hidden" name="id" value="${p?.id || ""}"><label class="field-label">Tên sản phẩm *</label><input class="field" name="name" required maxlength="100" value="${esc(p?.name || "")}"><div class="form-grid"><div><label class="field-label">Giá bán (VND) *</label><input class="field" type="number" name="price" min="1000" max="1000000000" required value="${p?.price || ""}"></div><div><label class="field-label">Số lượng tồn *</label><input class="field" type="number" name="stock" min="0" max="999999" required value="${p ? pstock(p) : 0}"></div></div><div class="form-grid"><div><label class="field-label">Danh mục</label><select class="select" name="cat">${CATS.map((c) => `<option ${p?.cat === c.name ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div><label class="field-label">Thương hiệu</label><input class="field" name="brand" maxlength="50" value="${esc(p?.brand || "NEXA")}"></div></div><section class="product-image-editor" aria-label="Ảnh sản phẩm"><div class="product-image-editor-preview"><img id="product-image-preview" src="${esc(image)}" alt="Xem trước ảnh sản phẩm"><span id="product-image-empty" hidden>Không tải được ảnh</span></div><div class="product-image-editor-fields"><label class="field-label" for="product-image-path">Đường dẫn ảnh</label><input class="field" id="product-image-path" type="text" value="${isUploaded ? "" : esc(image)}" placeholder="assets/images/... hoặc https://..." autocomplete="off"><input type="hidden" id="product-image-value" name="image" value="${esc(image)}"><label class="field-label" for="product-image-file">Hoặc tải ảnh từ máy</label><input class="field" id="product-image-file" type="file" accept="image/*"><small id="product-image-status" class="product-image-status">${isUploaded ? "Ảnh tải lên đang được lưu trong trình duyệt." : "Đổi đường dẫn hoặc chọn ảnh; ảnh sẽ cập nhật ở các trang sản phẩm."}</small></div></section><div class="modal-actions"><button type="button" class="btn-quiet" data-action="close-modal">Hủy</button><button class="btn btn-violet" type="submit">${p ? "Lưu thay đổi" : "Thêm sản phẩm"}</button></div></form><p style="font-size:10px;color:#8390a6;margin:17px 0 0">Bản demo lưu chỉnh sửa trong trình duyệt này; chưa tải ảnh lên database.</p></div></div>`;
}

/* FILE: assets/js/app/app.js */
/* Render, giỏ hàng và filter | NEXA / CommerceOS static demo. */
function currentRoute(){let r=routeFromHash();return r.startsWith('product/')?'product':r}
function render(){let r=routeFromHash(),app=document.getElementById('app');if(r==='home')app.innerHTML=homePage();else if(r==='shop')app.innerHTML=shopPage();else if(r.startsWith('product/'))app.innerHTML=detailPage(r.split('/')[1]);else if(r==='cart')app.innerHTML=cartPage();else if(r==='checkout')app.innerHTML=checkoutPage();else if(r==='orders')app.innerHTML=ordersPage();else if(r.startsWith('success/'))app.innerHTML=successPage(decodeURIComponent(r.slice(8)));else if(r==='admin/dashboard')app.innerHTML=adminDashboard();else if(r==='admin/products')app.innerHTML=adminProducts();else if(r==='admin/inventory')app.innerHTML=adminInventory();else if(r==='admin/orders')app.innerHTML=adminOrders();else if(r==='admin/analytics')app.innerHTML=adminAnalytics();else if(window.extraPages && window.extraPages[r])app.innerHTML=window.extraPages[r]();else{app.innerHTML=storefront('<div class="container"><h1>Không tìm thấy trang</h1><button data-route="home" class="btn btn-violet">Về trang chủ</button></div>','home');}document.title=`${r.startsWith('admin')?'CommerceOS Admin':'NEXA GEAR'} • ${r.split('/').slice(-1)[0]}`;const lb=document.getElementById('loading');lb.style.width='100%';setTimeout(()=>lb.style.width='0',300);if(typeof window.enhanceDOM==='function')window.enhanceDOM()}
function addCart(id,qty=1,refresh=true){let p=INITIAL.find(x=>x.id===+id);if(!p)return;qty=Math.max(1,Math.min(99,Number(qty)||1));let item=state.cart.find(x=>x.id===p.id);let next=(item?.qty||0)+qty;if(next>pstock(p)){toast(`Chỉ còn ${pstock(p)} sản phẩm trong kho.`,'warn');return false}if(item)item.qty=next;else state.cart.push({id:p.id,qty});save();toast('Đã thêm '+p.short+' vào giỏ hàng.','cart');if(refresh)render();return true}
function updateCart(id,delta){let p=INITIAL.find(x=>x.id===+id);if(!p)return;let x=state.cart.find(x=>x.id===+id);if(!x)return;let n=x.qty+(+delta||0);if(n>pstock(p)){toast('Số lượng vượt số lượng tồn kho.','warn');return}if(n<=0)state.cart=state.cart.filter(t=>t.id!==+id);else x.qty=n;save();render()}
function resetFilters(){ui.query='';ui.category='Tất cả';ui.brand='Tất cả';ui.max=10000000;ui.min=0;ui.sort='popular';ui.onlyFav=false;render()}
function openModal(id){ui.modal={id:id||null};render();setTimeout(()=>document.querySelector('.modal input[name="name"]')?.focus(),0)}
function adminCloseSide(){document.getElementById('admin-sidebar')?.classList.remove('open');document.getElementById('admin-veil')?.classList.add('hide')}


/* FILE: assets/js/app/events.js */
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

/* FILE: assets/js/app/hydrate.js */
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

/* FILE: assets/js/data/demo-content.js */
/* Review mẫu, trạng thái demo, helper UI | NEXA / CommerceOS static demo. */
'use strict';
/* NEXA UX extensions: all non-backend actions are deliberately labeled as demo. */
const DEMO_REVIEWS_KEY='nexa-reviews-demo-v2';
const DEMO_REVIEW_MODS_KEY='nexa-review-moderation-v1';
const DEMO_CHAT_KEY='nexa-chat-demo-v2';
const DEMO_COMMENTS_KEY='nexa-product-discussion-v1';
const DEMO_SUPPORT_KEY='nexa-support-tickets-v1';
let demoComments=(()=>{try{return JSON.parse(localStorage.getItem(DEMO_COMMENTS_KEY)||'[]')}catch{return []}})();
const demoRead=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
let demoReviews=demoRead(DEMO_REVIEWS_KEY,[]);
let demoSession=demoRead('nexa-user-demo-v2',null);
const DEFAULT_SUPPORT_TICKETS=[
 {id:1,code:'#TK-2041',customer:'Khách ẩn danh',subject:'Tư vấn bàn phím',message:'Khách cần tư vấn chọn bàn phím phù hợp.',priority:'Trung bình',status:'Mới',response:''},
 {id:2,code:'#TK-2042',customer:'Khách hàng mẫu',subject:'Hỏi về giao hàng',message:'Khách hỏi thời gian giao hàng dự kiến.',priority:'Cao',status:'Đang xử lý',response:''},
];
let demoSupportTickets=(()=>{const value=demoRead(DEMO_SUPPORT_KEY,null);return Array.isArray(value)?value:DEFAULT_SUPPORT_TICKETS.map(x=>({...x}))})();
function saveSupportTickets(){try{localStorage.setItem(DEMO_SUPPORT_KEY,JSON.stringify(demoSupportTickets))}catch{toast('Trình duyệt không lưu được thay đổi hỗ trợ.','warn')}}
let activeSlide=1,slideTimer=null,chatExpanded=false;
const dateVN=iso=>{try{return new Date(iso).toLocaleDateString('vi-VN')}catch{return ''}};
const starterReviews=[{id:1,product:1,name:'Minh An',stars:5,text:'Bàn phím gõ chắc tay, thiết kế rất đẹp. Đèn nền đều và tiếng gõ dễ chịu.',date:'2026-10-10T00:00:00.000Z',verified:true},{id:2,product:1,name:'Hải Phong',stars:4,text:'Layout 75% tiết kiệm diện tích, chuyển Bluetooth tiện. Hộp đóng gói tốt.',date:'2026-10-12T00:00:00.000Z',verified:true},{id:3,product:2,name:'Gia Huy',stars:5,text:'Chuột nhẹ, cảm giác cầm tốt cho FPS. Rất đáng thử.',date:'2026-10-09T00:00:00.000Z',verified:true}];
let demoReviewMods=demoRead(DEMO_REVIEW_MODS_KEY,{});
const allReviews=()=>[...demoReviews,...starterReviews].map(x=>({...x,...(demoReviewMods[String(x.id)]||{})}));
const reviewsFor=id=>allReviews().filter(x=>x.visible!==false&&(!id||x.product===Number(id)));
const reviewsForAdmin=()=>allReviews();
function saveReviewModeration(id,changes){demoReviewMods[String(id)]={...(demoReviewMods[String(id)]||{}),...changes};try{localStorage.setItem(DEMO_REVIEW_MODS_KEY,JSON.stringify(demoReviewMods))}catch{toast('Trình duyệt không lưu được thay đổi đánh giá.','warn')}}
const stars=n=>`<span class="user-stars" aria-label="${n} trên 5 sao">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`;
const uxHero=(label,title,desc)=>`<section class="ux-hero"><div><span class="ux-kicker">NEXA / ${esc(label)}</span><h1>${title}</h1><p>${desc}</p></div><span class="ux-hero-orbit" aria-hidden="true">N</span></section>`;
const page=(label,title,desc,inner)=>storefront(`<div class="container ux-page">${uxHero(label,title,desc)}${inner}</div>`,'shop',true);
const card=(content,cls='')=>`<section class="ux-card ${cls}">${content}</section>`;
const info=(k,v)=>`<div class="ux-meta"><span>${k}</span><strong>${v}</strong></div>`;
const safeForm=(name,extra='')=>`<form data-ux-form="${name}" ${extra}>`;
const fields={name:'<label>Họ tên<input class="field" name="name" placeholder="Họ tên của bạn" maxlength="80" required></label>',email:'<label>Email<input class="field" name="email" type="email" placeholder="example@gmail.com" maxlength="120" required></label>',pass:'<label>Mật khẩu<input class="field" name="password" type="password" placeholder="Ít nhất 8 ký tự" minlength="8" maxlength="128" required></label>'};
const social=()=>`<div class="ux-social"><button type="button" class="ux-social-button" data-ux="social" data-provider="Google"><svg class="google-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.6-4.2 6l6.7 5.2c3.9-3.6 6.1-8.8 6.1-14.9Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2l-6.9 5.3C7.3 39.5 15 44 24 44Z"/><path fill="#FBBC05" d="M12.8 27.7a12 12 0 0 1 0-7.4l-6.9-5.3a20.1 20.1 0 0 0 0 18l6.9-5.3Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4 15 4 7.3 8.5 3.9 15l6.9 5.3c1.6-4.7 6-8.2 11.2-8.2Z"/></svg> Tiếp tục với Google</button><button type="button" class="ux-social-button" data-ux="social" data-provider="Facebook"><svg class="facebook-f" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8h3.4Z"/></svg> Tiếp tục với Facebook</button></div><div class="ux-separator"><span>hoặc qua email</span></div>`;

/* FILE: assets/js/pages/account.js */
/* Đăng nhập/đăng ký, hồ sơ, wishlist demo | NEXA / CommerceOS static demo. */
const login=()=>page('ACCOUNT / SIGN IN','Chào mừng <em>trở lại.</em>','Quản lý đơn hàng, wishlist và trải nghiệm NEXA theo cách của bạn.',`<div class="ux-auth">${card(`<h2>Đăng nhập</h2>${social()}${safeForm('login')}${fields.email}${fields.pass}<button type="submit" class="btn btn-violet full">Đăng nhập ↗</button></form><p>Chưa có tài khoản? <a class="ux-link" href="register.html">Đăng ký</a></p>`)}${card(`<div class="ux-icon">✦</div><h2>ONE ACCOUNT.<br>ALL YOUR GEAR.</h2><p>Xem lịch sử mua sắm, lưu sản phẩm yêu thích, quản lý địa chỉ và nhận mã giảm giá trong một không gian.</p><ul class="ux-benefits"><li>Trải nghiệm mượt mà trên mọi thiết bị</li><li>Thông báo trạng thái đơn hàng</li><li>Đổi trả và bảo hành dễ dàng</li></ul>`,'ux-auth-promo')}</div>`);
const register=()=>page('ACCOUNT / REGISTER','Gia nhập <em>NEXA.</em>','Một tài khoản, toàn bộ trải nghiệm công nghệ yêu thích.',`<div class="ux-auth">${card(`<h2>Tạo tài khoản</h2>${social()}${safeForm('register')}${fields.name}${fields.email}${fields.pass}<label class="ux-check"><input type="checkbox" required name="terms"> Tôi đồng ý điều khoản và chính sách quyền riêng tư</label><button type="submit" class="btn btn-violet full">Tạo tài khoản</button></form><p>Đã có tài khoản? <a class="ux-link" href="login.html">Đăng nhập</a></p>`)}${card('<h2>YOUR SETUP.<br>YOUR SPACE.</h2><p>Nhận ưu đãi và lưu các sản phẩm yêu thích trong không gian riêng của bạn.</p>','ux-auth-promo')}</div>`);
const profile=()=>page('ACCOUNT / PROFILE','Không gian <em>của bạn.</em>','Quản lý thông tin cá nhân, đơn hàng và danh sách yêu thích.',`<div class="ux-two">${card(`<h2>Thông tin tài khoản</h2><p>Trạng thái: <b>${demoSession?'Đã đăng nhập':'Khách'}</b></p><div class="ux-profile-icon">${demoSession?esc(demoSession.name[0]||'N'):'N'}</div>${info('Tên hiển thị',esc(demoSession?.name||'Chưa có'))}${info('Email',esc(demoSession?.email||'Chưa có'))}<button class="btn btn-quiet" data-ux="logout">Đăng xuất</button>`)}${card(`<h2>Truy cập nhanh</h2><div class="ux-action-list"><a href="orders.html">▣ Theo dõi đơn hàng <b>↗</b></a><a href="wishlist.html">♡ Danh sách yêu thích <b>↗</b></a><a href="vouchers.html">◈ Kho voucher <b>↗</b></a><a href="reviews.html">★ Đánh giá của bạn <b>↗</b></a></div>`)}</div>`);
const wishlist=()=>page('ACCOUNT / FAVORITES','Your <em>wishlist.</em>','Những món đồ bạn muốn sở hữu, được lưu trên trình duyệt đang dùng.',`${state.favorites.length?`<div class="products-grid">${INITIAL.filter(p=>state.favorites.includes(p.id)).map(p=>productCard(p)).join('')}</div>`:card('<h2>Wishlist đang trống</h2><p>Chạm ♡ trên một sản phẩm để lưu lại.</p><button class="btn btn-violet" data-route="shop">Khám phá sản phẩm →</button>')}`);


/* FILE: assets/js/pages/community.js */
/* Đánh giá, bình luận, voucher | NEXA / CommerceOS static demo. */
const reviewItem=r=>`<article class="ux-review"><div class="ux-review-head"><b>${esc(r.name)}</b><small>${dateVN(r.date)}</small></div>${stars(r.stars)}<p>${esc(r.text)}</p></article>`;
const reviewForm=productId=>`${card(`<h3>Chia sẻ trải nghiệm của bạn</h3>${safeForm('review')}<input type="hidden" name="product" value="${productId}"><label>Sản phẩm<select class="field" name="productChoose" ${productId?'disabled':''}>${INITIAL.map(p=>`<option value="${p.id}" ${p.id===Number(productId)?'selected':''}>${esc(p.short)}</option>`).join('')}</select></label><label>Tên hiển thị<input class="field" name="author" maxlength="40" required placeholder="Tên của bạn" value="${esc(demoSession?.name||'')}"></label><label>Đánh giá <select class="field" name="stars"><option value="5">★★★★★ (5 sao)</option><option value="4">★★★★☆ (4 sao)</option><option value="3">★★★☆☆ (3 sao)</option><option value="2">★★☆☆☆ (2 sao)</option><option value="1">★☆☆☆☆ (1 sao)</option></select></label><label>Nội dung<textarea class="field" name="text" rows="4" minlength="10" maxlength="500" required placeholder="Mô tả trải nghiệm thực tế..."></textarea></label><button type="submit" class="btn btn-violet">Gửi đánh giá ↗</button></form>`)}`;
const reviews=()=>page('COMMUNITY / REVIEWS','Real voices.<br><em>Real experiences.</em>','Đọc nhận xét mẫu, trải nghiệm biểu mẫu đánh giá và xem phản hồi ngay trên trình duyệt.',`<div class="ux-two"><div>${card(`<h2>Đánh giá khách hàng <span class="ux-counter">${reviewsFor().length}</span></h2><div class="ux-review-stack">${reviewsFor().map(reviewItem).join('')}</div>`)}</div><div>${reviewForm(0)}</div></div>`);
const vouchers=()=>{const active=(state.promotions||[]).filter(p=>p.active);return page('REWARDS / OFFERS','Good gear.<br><em>Better deals.</em>','Khám phá ưu đãi và sử dụng trong giỏ hàng.',`<div class="ux-voucher-grid">${active.length?active.map(c=>`<article class="ux-voucher"><span class="ux-kicker">NEXA / REWARDS</span><h2>${esc(c.name)}</h2><p>${esc(c.description||'Ưu đãi dành cho bạn')}</p><code>${esc(c.code)}</code><button class="btn btn-violet" data-ux="use-voucher" data-code="${esc(c.code)}">Lưu và sử dụng →</button></article>`).join(''):'<div class="empty"><h2>Chưa có ưu đãi</h2><p>Hiện chưa có mã nào đang áp dụng.</p></div>'}</div>`)};


/* FILE: assets/js/pages/support.js */
/* Liên hệ, FAQ, vận chuyển, tracking | NEXA / CommerceOS static demo. */
const contact=()=>page('SUPPORT / CONTACT','Let’s <em>talk.</em>','Bạn có câu hỏi về sản phẩm, đơn hàng hay hợp tác? Hãy để lại lời nhắn hoặc dùng chatbox.',`<div class="ux-two">${card(`<h2>Gửi yêu cầu hỗ trợ</h2>${safeForm('contact')}${fields.name}${fields.email}<label>Chủ đề<select class="field" name="subject"><option>Tư vấn sản phẩm</option><option>Trạng thái đơn hàng</option><option>Bảo hành và đổi trả</option><option>Hợp tác kinh doanh</option></select></label><label>Nội dung<textarea class="field" name="message" rows="5" minlength="10" maxlength="1000" required placeholder="Nội dung cần hỗ trợ..."></textarea></label><button type="submit" class="btn btn-violet">Soạn email trong ứng dụng mail ↗</button></form>`)}${card(`<h2>Chúng tôi luôn ở đây.</h2><div class="ux-contact-tile"><span>✉</span><div><b>Liên hệ qua email</b><p>support@nexa.example</p></div></div><div class="ux-contact-tile"><span>◷</span><div><b>Giờ hoạt động</b><p>Thứ 2 – Thứ 7, 8:00 – 20:00</p></div></div><div class="ux-contact-tile"><span>☏</span><div><b>Hỗ trợ tức thì</b><p>Chat trực tiếp ở góc dưới bên phải</p></div></div><button class="btn btn-quiet" data-ux="chat-toggle">Mở chat hỗ trợ ↗</button>`)}</div>`);
const faq=()=>page('HELP / FAQ','Your questions.<br><em>Answered.</em>','Những giải đáp thường gặp khi mua sắm tại NEXA.',`<div class="ux-faq">${[['Làm sao để áp voucher?',`Từ giỏ hàng, nhập một trong các mã đang hoạt động: ${(state.promotions||[]).filter(p=>p.active).map(p=>p.code).join(', ')||'hiện chưa có mã'}.`],['Có thể thanh toán qua VNPay?','Bạn có thể chọn phương thức thanh toán tại bước đặt hàng.'],['Có theo dõi được vận chuyển?','Nhập mã đơn hàng tại mục Theo dõi đơn hàng để xem trạng thái.'],['Tôi có thể đánh giá sản phẩm không?','Mở trang Đánh giá để chia sẻ nhận xét về sản phẩm.']].map(([q,a])=>`<details class="ux-faq-item"><summary>${q}<span>＋</span></summary><p>${a}</p></details>`).join('')}</div>`);
const shippingPage=()=>page('FULFILLMENT / DELIVERY','From our setup<br><em>to yours.</em>','Luồng giao hàng minh bạch: từ xác nhận đơn đến bàn giao cho khách.',`<div class="ux-two">${card('<h2>Phương thức giao hàng</h2><div class="ux-shipping-item"><strong>01 / Standard</strong><p>Dự kiến 2–4 ngày · 30.000 ₫ · miễn phí khi đơn từ 1 triệu .</p></div><div class="ux-shipping-item"><strong>02 / Express</strong><p>Dự kiến 1–2 ngày · 50.000 ₫ .</p></div><div class="ux-shipping-item"><strong>03 / Tracking</strong><p>Cập nhật trạng thái đơn trong trang Theo dõi vận chuyển.</p></div>')} ${card('<h2>Theo dõi đơn hàng</h2><p>Nhập mã đơn hàng để xem tiến trình giao hàng.</p><a class="btn btn-violet" href="tracking.html">Kiểm tra đơn hàng ↗</a>')}</div>`);
const trackResult=id=>{const o=state.orders.find(x=>x.id.toUpperCase()===id.toUpperCase());if(!o)return `<div class="ux-empty">Không tìm thấy mã đơn hàng. Vui lòng kiểm tra lại mã.</div>`;return `<div class="ux-tracking-result"><h3>${esc(o.id)}</h3>${info('Trạng thái',esc(o.status))}${info('Tổng tiền',money(o.total))}${orderTimeline(o.status)}</div>`};
const tracking=()=>page('ORDERS / TRACKING','Track every <em>move.</em>','Kiểm tra tiến trình giao hàng cho đơn hàng của bạn.',`${card(`<h2>Theo dõi vận chuyển</h2>${safeForm('tracking')}<label>Mã đơn hàng<input name="code" class="field" required placeholder="Mã đơn hàng"></label><button type="submit" class="btn btn-violet">Tra cứu đơn ↗</button></form><div id="track-result"></div><p class="ux-note"></p>`)}`);

/* FILE: assets/js/pages/payments.js */
/* Trang thanh toán mô phỏng | NEXA / CommerceOS static demo. */
const pendingOrder=()=>{let id='';try{id=sessionStorage.getItem('nexa-pending-payment')||''}catch{}return state.orders.find(o=>o.id===id)||[...state.orders].reverse().find(o=>['momo','vnpay'].includes(o.pay))};
const payment=()=>{let o=pendingOrder();return page('PAYMENT / GATEWAY','Complete your<br><em>checkout.</em>','',`${card(`<div class="ux-payment-head"><div class="ux-payment-logo">${o?.pay==='momo'?'MOMO':'VNPAY'}</div></div><h2>Xác nhận thanh toán</h2>${info('Đơn hàng',esc(o?.id||'Không có đơn chờ thanh toán'))}${info('Số tiền',o?money(o.total):'—')}${info('Phương thức',o?.pay==='momo'?'Ví MoMo':'VNPAY')}<div class="ux-payment-actions"><button class="btn btn-violet" data-ux="payment-ok" ${o?'':'disabled'}>Xác nhận thanh toán ✓</button><button class="btn btn-quiet" data-ux="payment-cancel">Hủy thanh toán</button></div>`,'ux-payment-card')}`)};


/* FILE: assets/js/pages/information.js */
/* Giới thiệu, quyền riêng tư | NEXA / CommerceOS static demo. */
const about=()=>page('STORY / BRAND','Built for the<br><em>extra mile.</em>','Gear dành cho những người luôn muốn tốt hơn từng ngày.',`${card('<h2>Thiết bị tốt bắt đầu từ trải nghiệm tốt.</h2><p>NEXA hướng đến những thiết bị công nghệ có thiết kế tinh gọn, hiệu năng đáng tin cậy và trải nghiệm phù hợp với từng người dùng.</p><p>Brand direction: futuristic gaming · bold typography · thoughtful performance.</p>')}`);
const privacy=()=>page('LEGAL / PRIVACY','Your data.<br><em>Your control.</em>','Thông tin về quyền riêng tư và các lựa chọn của bạn.',`${card('<h2>Quyền riêng tư của bạn</h2><p>Liên hệ bộ phận hỗ trợ nếu bạn cần trợ giúp về thông tin cá nhân.</p>')}`);


/* FILE: assets/js/pages/admin-extended.js */
/* Customer / promotions / reviews / support / settings | NEXA / CommerceOS static demo. */
const adminIntro = (title, sub) =>
  `<div class="admin-intro"><div><h1>${title}</h1><p>${sub} · dữ liệu minh họa / lưu cục bộ</p></div><span class="demo-pill">ADMIN FRONTEND</span></div>`;
const adminPanel = (content) =>
  `<div class="admin-panel ux-admin-panel">${content}</div>`;
const table = (headers, rows) =>
  `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const customers = () =>
  adminLayout(
    "customers",
    adminIntro("Quản lý khách hàng", "CRM cơ bản và phân nhóm khách hàng") +
      adminPanel(
        `<h3>Khách hàng mẫu</h3>${table(
          ["Khách hàng", "Phân nhóm", "Đơn hàng", "Tổng chi", "Trạng thái"],
          [
            [
              "Nguyễn Văn An",
              "VIP",
              "12",
              "28.490.000 ₫",
              statusPill("Đã xác nhận"),
            ],
            [
              "Trần Thị Mai",
              "Mới",
              "2",
              "7.480.000 ₫",
              statusPill("Đã xác nhận"),
            ],
            [
              "Lê Minh Hoàng",
              "Thường",
              "5",
              "13.240.000 ₫",
              statusPill("Đã xác nhận"),
            ],
          ],
        )}<p class="ux-note">Dữ liệu CRM giả, không có thông tin cá nhân khách hàng thật.</p>`,
      ),
  );
let promotionEditorId = null,
  promotionEditorOpen = false;
function openPromotionModal(id = null) {
  promotionEditorId = id;
  promotionEditorOpen = true;
  render();
  setTimeout(() => document.getElementById("promo-code")?.focus(), 0);
}
function closePromotionModal() {
  promotionEditorId = null;
  promotionEditorOpen = false;
  render();
}
function promotionAmount(p) {
  return p.type === "percent"
    ? `${Number(p.value)}%`
    : p.type === "fixed"
      ? money(p.value)
      : "Miễn phí vận chuyển";
}
function promotionModalView() {
  const p =
    promotionEditorId === null
      ? null
      : state.promotions.find((x) => x.id === promotionEditorId);
  return `<div class="modal-back" id="promotion-modal-back"><div class="modal promotion-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-title"><h2 id="promotion-title">${p ? "Chỉnh sửa ưu đãi" : "Thêm ưu đãi"}</h2><form data-form="promotion-editor"><input type="hidden" name="id" value="${p?.id || ""}"><label class="field-label" for="promo-code">Mã ưu đãi *</label><input class="field" id="promo-code" name="code" required maxlength="24" pattern="[A-Za-z0-9_-]+" value="${esc(p?.code || "")}" placeholder="VD: NEXA15"><label class="field-label" for="promo-name">Tên chương trình *</label><input class="field" id="promo-name" name="name" required maxlength="80" value="${esc(p?.name || "")}" placeholder="Tên hiển thị"><label class="field-label" for="promo-description">Mô tả</label><input class="field" id="promo-description" name="description" maxlength="160" value="${esc(p?.description || "")}" placeholder="Điều kiện hoặc nội dung ưu đãi"><div class="form-grid"><div><label class="field-label" for="promo-type">Loại ưu đãi</label><select class="select" id="promo-type" name="type"><option value="percent" ${p?.type === "percent" ? "selected" : ""}>Giảm theo phần trăm</option><option value="fixed" ${p?.type === "fixed" ? "selected" : ""}>Giảm số tiền</option><option value="shipping" ${p?.type === "shipping" ? "selected" : ""}>Miễn phí vận chuyển</option></select></div><div><label class="field-label" for="promo-value">Giá trị giảm</label><input class="field" id="promo-value" name="value" type="number" min="0" max="1000000000" value="${p?.value ?? 10}"></div></div><div><label class="field-label" for="promo-min-order">Đơn hàng tối thiểu (₫)</label><input class="field" id="promo-min-order" name="minOrder" type="number" min="0" max="1000000000" value="${p?.minOrder || 0}"></div><label class="promotion-active"><input type="checkbox" name="active" ${p?.active !== false ? "checked" : ""}> Đang áp dụng</label><div class="modal-actions"><button type="button" class="btn-quiet" data-action="promotion-close">Hủy</button><button class="btn btn-violet" type="submit">${p ? "Lưu ưu đãi" : "Tạo ưu đãi"}</button></div></form><p class="promotion-demo-note">Ưu đãi được lưu trong trình duyệt này và dùng cho trang voucher/giỏ hàng của bản demo.</p></div></div>`;
}
const adminPromotions = () => {
  const promotions = state.promotions || [];
  return adminLayout(
    "promotions",
    adminIntro(
      "Mã giảm giá & chương trình",
      "Quản lý nội dung, điều kiện và trạng thái ưu đãi",
    ) +
      `<div class="admin-intro promotion-toolbar"><span>${promotions.length} chương trình</span><button class="btn btn-primary" data-action="promotion-add">＋ Thêm ưu đãi</button></div>` +
      adminPanel(
        `<h3>Danh sách ưu đãi</h3>${table(
          [
            "Mã",
            "Chương trình",
            "Loại ưu đãi",
            "Mức giảm",
            "Đơn tối thiểu",
            "Trạng thái",
            "Thao tác",
          ],
          promotions.map((p) => [
            esc(p.code),
            `<strong>${esc(p.name)}</strong><small class="promotion-description">${esc(p.description || "")}</small>`,
            p.type === "percent"
              ? "Phần trăm"
              : p.type === "fixed"
                ? "Số tiền"
                : "Vận chuyển",
            promotionAmount(p),
            money(p.minOrder || 0),
            `<span class="pill ${p.active ? "green" : "yellow"}">${p.active ? "Đang áp dụng" : "Tạm dừng"}</span>`,
            `<div class="promotion-actions"><button class="btn-quiet" data-ux="copy" data-copy="${esc(p.code)}">Sao chép</button><button class="btn-quiet" data-action="promotion-edit" data-id="${p.id}">✎ Sửa</button><button class="btn-quiet" data-action="promotion-toggle" data-id="${p.id}">${p.active ? "Tạm dừng" : "Kích hoạt"}</button></div>`,
          ]),
        )}<p class="ux-note">Mã đang áp dụng cũng xuất hiện ở trang voucher và được tính trong giỏ hàng demo.</p>`,
      ) +
      (promotionEditorOpen ? promotionModalView() : ""),
  );
};
let reviewEditorId = null,
  reviewEditorOpen = false;
function openReviewModal(id) {
  reviewEditorId = id;
  reviewEditorOpen = true;
  render();
  setTimeout(() => document.getElementById("review-name")?.focus(), 0);
}
function closeReviewModal() {
  reviewEditorId = null;
  reviewEditorOpen = false;
  render();
}
function reviewModalView() {
  const r = reviewsForAdmin().find((x) => x.id === reviewEditorId);
  if (!r) return "";
  return `<div class="modal-back" id="review-modal-back"><div class="modal admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><h2 id="review-title">Chỉnh sửa đánh giá</h2><form data-form="review-editor"><input type="hidden" name="id" value="${r.id}"><label class="field-label" for="review-name">Tên hiển thị</label><input class="field" id="review-name" name="name" maxlength="40" required value="${esc(r.name)}"><label class="field-label" for="review-product">Sản phẩm</label><select class="select" id="review-product" name="product">${INITIAL.map((p) => `<option value="${p.id}" ${p.id === Number(r.product) ? "selected" : ""}>${esc(p.short)}</option>`).join("")}</select><label class="field-label" for="review-stars">Số sao</label><select class="select" id="review-stars" name="stars">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${n === Number(r.stars) ? "selected" : ""}>${n} sao</option>`).join("")}</select><label class="field-label" for="review-text">Nội dung đánh giá</label><textarea class="field" id="review-text" name="text" rows="5" minlength="10" maxlength="500" required>${esc(r.text)}</textarea><label class="promotion-active"><input type="checkbox" name="visible" ${r.visible !== false ? "checked" : ""}> Hiển thị đánh giá trên cửa hàng</label><div class="modal-actions"><button type="button" class="btn-quiet" data-action="review-close">Hủy</button><button type="submit" class="btn btn-violet">Lưu đánh giá</button></div></form><p class="promotion-demo-note">Thay đổi được lưu cục bộ trong trình duyệt này.</p></div></div>`;
}
const adminReviews = () => {
  const reviews = reviewsForAdmin();
  return adminLayout(
    "reviews",
    adminIntro(
      "Kiểm duyệt đánh giá",
      "Chỉnh sửa nội dung và kiểm soát hiển thị đánh giá",
    ) +
      adminPanel(
        `<h3>${reviews.length} đánh giá</h3>${table(
          [
            "Tên",
            "Sản phẩm",
            "Số sao",
            "Nội dung",
            "Nguồn",
            "Trạng thái",
            "Thao tác",
          ],
          reviews.map((r) => [
            esc(r.name),
            esc(INITIAL.find((p) => p.id === r.product)?.short || "—"),
            stars(r.stars),
            esc(r.text.slice(0, 120)),
            r.verified ? "Mẫu" : "Khách hàng",
            `<span class="pill ${r.visible === false ? "yellow" : "green"}">${r.visible === false ? "Đang ẩn" : "Đang hiển thị"}</span>`,
            `<div class="promotion-actions"><button class="btn-quiet" data-action="review-edit" data-id="${r.id}">✎ Sửa</button><button class="btn-quiet" data-action="review-toggle" data-id="${r.id}">${r.visible === false ? "Hiện" : "Ẩn"}</button></div>`,
          ]),
        )}<p class="ux-note">Đánh giá ẩn sẽ không xuất hiện trên trang sản phẩm hoặc trang cộng đồng.</p>`,
      ) +
      (reviewEditorOpen ? reviewModalView() : ""),
  );
};
let supportEditorId = null,
  supportEditorOpen = false;
function openSupportModal(id) {
  supportEditorId = id;
  supportEditorOpen = true;
  render();
  setTimeout(() => document.getElementById("support-customer")?.focus(), 0);
}
function closeSupportModal() {
  supportEditorId = null;
  supportEditorOpen = false;
  render();
}
function supportModalView() {
  const t = demoSupportTickets.find((x) => x.id === supportEditorId);
  if (!t) return "";
  return `<div class="modal-back" id="support-modal-back"><div class="modal admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="support-title"><h2 id="support-title">Cập nhật yêu cầu ${esc(t.code)}</h2><form data-form="support-editor"><input type="hidden" name="id" value="${t.id}"><label class="field-label" for="support-customer">Khách hàng</label><input class="field" id="support-customer" name="customer" maxlength="80" required value="${esc(t.customer)}"><label class="field-label" for="support-subject">Chủ đề</label><input class="field" id="support-subject" name="subject" maxlength="100" required value="${esc(t.subject)}"><label class="field-label" for="support-message">Nội dung yêu cầu</label><textarea class="field" id="support-message" name="message" rows="3" maxlength="1000" required>${esc(t.message)}</textarea><div class="form-grid"><div><label class="field-label" for="support-priority">Độ ưu tiên</label><select class="select" id="support-priority" name="priority">${["Thấp", "Trung bình", "Cao"].map((x) => `<option ${t.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div><label class="field-label" for="support-status">Trạng thái</label><select class="select" id="support-status" name="status">${["Mới", "Đang xử lý", "Đã phản hồi", "Đã đóng"].map((x) => `<option ${t.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div></div><label class="field-label" for="support-response">Phản hồi nội bộ / trả lời mẫu</label><textarea class="field" id="support-response" name="response" rows="3" maxlength="1000" placeholder="Ghi nội dung phản hồi">${esc(t.response || "")}</textarea><div class="modal-actions"><button type="button" class="btn-quiet" data-action="support-close">Hủy</button><button type="submit" class="btn btn-violet">Lưu yêu cầu</button></div></form><p class="promotion-demo-note">Ticket minh họa được lưu cục bộ; chưa gửi email hoặc tin nhắn thật.</p></div></div>`;
}
const adminSupport = () =>
  adminLayout(
    "support",
    adminIntro(
      "Ticket & chăm sóc khách hàng",
      "Cập nhật nội dung, độ ưu tiên, trạng thái và phản hồi",
    ) +
      adminPanel(
        `<h3>${demoSupportTickets.length} yêu cầu hỗ trợ</h3>${table(
          [
            "Ticket",
            "Khách hàng",
            "Chủ đề",
            "Độ ưu tiên",
            "Trạng thái",
            "Thao tác",
          ],
          demoSupportTickets.map((t) => [
            esc(t.code),
            esc(t.customer),
            esc(t.subject),
            esc(t.priority),
            `<span class="pill ${t.status === "Đã đóng" ? "green" : t.status === "Đang xử lý" ? "blue" : "yellow"}">${esc(t.status)}</span>`,
            `<button class="btn-quiet" data-action="support-edit" data-id="${t.id}">✎ Sửa</button>`,
          ]),
        )}<div class="ux-two"><div><h3>Mẫu trả lời tự động</h3><textarea class="field" rows="3" readonly>Xin chào, NEXA đã tiếp nhận yêu cầu của bạn. Đây là mẫu giao diện không gửi tin nhắn thật.</textarea></div><div><h3>Trò chuyện thử</h3><button data-ux="chat-toggle" class="btn btn-violet">Mở chatbox demo →</button></div></div>`,
      ) +
      (supportEditorOpen ? supportModalView() : ""),
  );
const adminSettings = () =>
  adminLayout(
    "settings",
    adminIntro("Cài đặt hệ thống", "Giao diện cấu hình và chuẩn bị tích hợp") +
      adminPanel(
        `<h3>Trạng thái các dịch vụ</h3>${table(
          ["Dịch vụ", "Hiện tại", "Muốn chạy production"],
          [
            [
              "Xác thực Google/Facebook",
              "Giao diện demo",
              "OAuth 2.0 + PKCE + callback server",
            ],
            [
              "Email",
              "mailto & thông báo demo",
              "Email API/SMTP worker + rate limit",
            ],
            ["VNPay / MoMo", "Mô phỏng", "Backend IPN + chữ ký + idempotency"],
            [
              "Chat hỗ trợ",
              "Bot luật cố định trong JS",
              "WebSocket hoặc nhà cung cấp livechat",
            ],
            [
              "Kho hàng & người dùng",
              "localStorage",
              "PostgreSQL + transaction / phân quyền",
            ],
            ["Ảnh sản phẩm", "SVG inline", "CDN/WebP/AVIF + lazy load"],
          ],
        )}<button class="btn btn-quiet" data-ux="clear-demo">Đặt lại dữ liệu demo trên trình duyệt</button>`,
      ),
  );
window.extraPages = {
  login,
  register,
  profile,
  wishlist,
  reviews,
  vouchers,
  contact,
  faq,
  shipping: shippingPage,
  tracking,
  payment,
  about,
  privacy,
  "admin/customers": customers,
  "admin/promotions": adminPromotions,
  "admin/reviews": adminReviews,
  "admin/support": adminSupport,
  "admin/settings": adminSettings,
};

/* FILE: assets/js/features/enhancements.js */
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

/* FILE: assets/js/features/chat.js */
/* Trợ lý trả lời theo quy tắc | NEXA / CommerceOS static demo. */
function toggleChat(open){chatExpanded=typeof open==='boolean'?open:!chatExpanded;const p=document.getElementById('ux-chat-panel');if(p)p.hidden=!chatExpanded;if(chatExpanded)document.getElementById('ux-chat-input')?.focus();}
function botReply(input){let x=input.toLowerCase();if(/voucher|giảm|mã|khuyến mãi|ưu đãi/.test(x)){const active=(state.promotions||[]).filter(p=>p.active).map(p=>`${p.code} (${p.name})`);return active.length?'Mã ưu đãi đang áp dụng: '+active.join(', ')+'. Xem trang Voucher để sử dụng.':'Hiện chưa có mã ưu đãi đang áp dụng.';}
if(/vận chuyển|giao hàng|ship|bao lâu|bao nhiêu ngày|ghn|ghtk/.test(x))return 'Giao tiêu chuẩn dự kiến 2–4 ngày; giao nhanh 1–2 ngày. Vui lòng kiểm tra thời gian giao hàng tại bước đặt hàng.';
if(/vnpay|momo|thanh toán|tiền|chuyển khoản|cod/.test(x))return 'Bạn có thể chọn COD, MoMo hoặc VNPAY tại bước thanh toán.';
if(/bảo hành|đổi trả|đổi hàng|trả hàng/.test(x))return 'Bạn có thể liên hệ trang Hỗ trợ để xem giao diện yêu cầu đổi trả. Hiện chưa có quy trình xử lý bảo hành thực.';
if(/đơn hàng|tracking|mã đơn|kiểm tra/.test(x))return 'Mở trang Theo dõi đơn hàng và nhập mã đơn trên xác nhận đặt hàng.';
return 'Mình có thể hỗ trợ: voucher, giao hàng, thanh toán, đơn hàng và bảo hành. Bạn hãy thử một trong các chủ đề đó nhé!';}
function appendChat(text,type){const box=document.getElementById('ux-chat-messages');if(!box)return;const div=document.createElement('div');div.className='ux-chat-message '+type;div.textContent=text;box.appendChild(div);box.scrollTop=box.scrollHeight;}


/* FILE: assets/js/features/theme-and-layout.js */
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

/* FILE: assets/js/features/forms-and-actions.js */
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


/* FILE: assets/js/app/start.js */
/* Khởi tạo và render website | NEXA / CommerceOS static demo. */
// Render after both the core application and extension functions are available.
render();

