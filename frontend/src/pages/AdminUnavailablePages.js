const configs = {
  products: ["Quản lý sản phẩm", "Theo dõi sản phẩm, biến thể, giá bán và trạng thái.", ["Sản phẩm", "SKU", "Danh mục", "Giá bán", "Tồn kho", "Trạng thái", "Thao tác"]],
  orders: ["Quản lý đơn hàng", "Theo dõi và xử lý đơn hàng trên toàn hệ thống.", ["Mã đơn", "Khách hàng", "Ngày tạo", "Số SP", "Tổng tiền", "Trạng thái", "Cập nhật"]],
  customers: ["Quản lý khách hàng", "Thông tin và lịch sử mua hàng của khách hàng.", ["Khách hàng", "Phân nhóm", "Đơn hàng", "Tổng chi", "Trạng thái"]],
  promotions: ["Mã giảm giá & chương trình", "Quản lý ưu đãi và điều kiện áp dụng.", ["Mã", "Loại ưu đãi", "Mức", "Trạng thái", "Thao tác"]],
  reviews: ["Kiểm duyệt đánh giá", "Theo dõi nội dung đánh giá sản phẩm.", ["Tên", "Sản phẩm", "Số sao", "Nội dung", "Nguồn"]],
  support: ["Ticket & chăm sóc khách hàng", "Theo dõi yêu cầu hỗ trợ từ khách hàng.", ["Ticket", "Khách hàng", "Chủ đề", "Độ ưu tiên", "Trạng thái"]],
  settings: ["Cài đặt hệ thống", "Theo dõi cấu hình và trạng thái dịch vụ.", ["Dịch vụ", "Hiện tại", "Muốn chạy production"]],
};

function EmptyTable({ headers }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody><tr><td colSpan={headers.length} className="admin-empty">Backend chưa cung cấp API cho phân hệ này. Không hiển thị dữ liệu giả.</td></tr></tbody></table></div>;
}

export function AdminUnavailablePage({ type }) {
  const [title, description, headers] = configs[type];
  return <><div className="admin-intro"><div><h1>{title}</h1><p>{description}</p></div></div><div className="admin-panel"><div className="admin-toolbar"><input className="field" placeholder="⌕ Tìm kiếm..." disabled /><button className="btn btn-primary" disabled>Thêm mới</button></div><EmptyTable headers={headers} /></div></>;
}

export function AdminAnalyticsPage() {
  return <><div className="admin-intro"><div><h1>Báo cáo & phân tích</h1><p>Số liệu tổng hợp lấy từ backend theo quyền quản trị.</p></div></div><div className="admin-kpis">{["Doanh thu", "Đơn hàng", "Khách hàng", "Giá trị trung bình"].map((x) => <div className="kpi" key={x}><small>{x}</small><strong>—</strong><span className="change">Chưa có API phân tích</span></div>)}</div><div className="admin-panel"><div className="admin-panel-head"><h3>Doanh thu & đơn hàng</h3></div><div className="admin-chart-empty">Backend chưa cung cấp chuỗi dữ liệu phân tích.</div></div></>;
}
