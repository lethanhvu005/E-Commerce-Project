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
