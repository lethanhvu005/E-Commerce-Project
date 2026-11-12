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
