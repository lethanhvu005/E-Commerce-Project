/* Trợ lý trả lời theo quy tắc | NEXA / CommerceOS static demo. */
function toggleChat(open){chatExpanded=typeof open==='boolean'?open:!chatExpanded;const p=document.getElementById('ux-chat-panel');if(p)p.hidden=!chatExpanded;if(chatExpanded)document.getElementById('ux-chat-input')?.focus();}
function botReply(input){let x=input.toLowerCase();if(/voucher|giảm|mã|khuyến mãi|ưu đãi/.test(x)){const active=(state.promotions||[]).filter(p=>p.active).map(p=>`${p.code} (${p.name})`);return active.length?'Mã ưu đãi đang áp dụng: '+active.join(', ')+'. Xem trang Voucher để sử dụng.':'Hiện chưa có mã ưu đãi đang áp dụng.';}
if(/vận chuyển|giao hàng|ship|bao lâu|bao nhiêu ngày|ghn|ghtk/.test(x))return 'Giao tiêu chuẩn dự kiến 2–4 ngày; giao nhanh 1–2 ngày. Vui lòng kiểm tra thời gian giao hàng tại bước đặt hàng.';
if(/vnpay|momo|thanh toán|tiền|chuyển khoản|cod/.test(x))return 'Bạn có thể chọn COD, MoMo hoặc VNPAY tại bước thanh toán.';
if(/bảo hành|đổi trả|đổi hàng|trả hàng/.test(x))return 'Bạn có thể liên hệ trang Hỗ trợ để xem giao diện yêu cầu đổi trả. Hiện chưa có quy trình xử lý bảo hành thực.';
if(/đơn hàng|tracking|mã đơn|kiểm tra/.test(x))return 'Mở trang Theo dõi đơn hàng và nhập mã đơn trên xác nhận đặt hàng.';
return 'Mình có thể hỗ trợ: voucher, giao hàng, thanh toán, đơn hàng và bảo hành. Bạn hãy thử một trong các chủ đề đó nhé!';}
function appendChat(text,type){const box=document.getElementById('ux-chat-messages');if(!box)return;const div=document.createElement('div');div.className='ux-chat-message '+type;div.textContent=text;box.appendChild(div);box.scrollTop=box.scrollHeight;}

