import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <span>404</span>
      <h1>Không tìm thấy trang.</h1>
      <p>Đường dẫn này không tồn tại hoặc đã được thay đổi.</p>
      <Link className="btn btn-primary" to="/">Về trang chủ</Link>
    </div>
  );
}
