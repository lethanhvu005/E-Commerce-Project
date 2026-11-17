import { useState } from "react";

const RATING_LABELS = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Rất hài lòng",
};

export function StarRatingInput({ value, onChange, disabled = false }) {
  const [hovered, setHovered] = useState(0);
  const activeValue = hovered || value;

  return (
    <div className="review-rating-field">
      <div
        className="review-star-input"
        role="radiogroup"
        aria-label="Mức độ hài lòng"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} sao - ${RATING_LABELS[star]}`}
            className={star <= activeValue ? "is-active" : ""}
            disabled={disabled}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <span aria-hidden="true">★</span>
          </button>
        ))}
      </div>
      <span className="review-rating-label" aria-live="polite">
        {value ? `${value}/5 · ${RATING_LABELS[value]}` : "Chọn số sao"}
      </span>
    </div>
  );
}

export function ReviewCard({ review, isAuthenticated = false, onReply, replying = false }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const authorName = review.author || "Khách hàng NEXA";
  const initial = (authorName[0] || "K").toUpperCase();
  const createdAt = review.created_at
    ? new Date(review.created_at).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <article className="ux-review nexa-review-card">
      <header className="ux-review-head">
        <div className="nexa-qa-author-wrap">
          <span className="nexa-qa-avatar" aria-hidden="true">{initial}</span>
          <div>
            <strong className="nexa-qa-author-name">{authorName}</strong>
            <div className="nexa-review-stars-row">
              <span className="nexa-stars-gold" aria-label={`${review.stars} trên 5 sao`}>
                <span aria-hidden="true">{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>
              </span>
              {review.is_verified_buyer && (
                <span className="ux-verified">✓ Đã mua hàng</span>
              )}
            </div>
          </div>
        </div>
        <time className="nexa-qa-date" dateTime={review.created_at || undefined}>{createdAt}</time>
      </header>
      <p className="nexa-review-body">{review.body}</p>

      {review.replies?.length > 0 && (
        <div className="review-reply-list" aria-label="Các phản hồi">
          {review.replies.map((reply) => (
            <div className="review-reply" key={reply.id}>
              <span className="review-reply-line" aria-hidden="true" />
              <div>
                <div className="review-reply-meta">
                  <strong>{reply.author || "Thành viên NEXA"}</strong>
                  <time dateTime={reply.created_at || undefined}>
                    {reply.created_at ? new Date(reply.created_at).toLocaleDateString("vi-VN") : ""}
                  </time>
                </div>
                <p>{reply.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="review-actions">
        {isAuthenticated ? (
          <button type="button" onClick={() => setReplyOpen((open) => !open)}>
            {replyOpen ? "Đóng phản hồi" : "Trả lời đánh giá"}
          </button>
        ) : (
          <span>Đăng nhập để trả lời</span>
        )}
      </div>

      {replyOpen && isAuthenticated && (
        <form
          className="review-reply-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const body = replyBody.trim();
            if (body.length < 2 || !onReply) return;
            const sent = await onReply(review.id, body);
            if (sent) {
              setReplyBody("");
              setReplyOpen(false);
            }
          }}
        >
          <label htmlFor={`review-reply-${review.id}`}>Phản hồi đánh giá này</label>
          <textarea
            id={`review-reply-${review.id}`}
            className="field"
            rows="3"
            minLength={2}
            maxLength={1000}
            required
            placeholder="Viết phản hồi lịch sự và đúng chủ đề..."
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
          />
          <div>
            <span>{replyBody.length}/1000</span>
            <button className="btn btn-primary" disabled={replying || replyBody.trim().length < 2}>
              {replying ? "Đang gửi..." : "Gửi phản hồi"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

export function ReviewEligibilityNotice({ eligibility, productName }) {
  if (!eligibility || eligibility.can_review) return null;

  const content = {
    login_required: {
      title: "Đăng nhập để viết đánh giá",
      text: "Đánh giá chỉ dành cho tài khoản đã mua và nhận sản phẩm.",
    },
    purchase_required: {
      title: "Chưa đủ điều kiện đánh giá",
      text: `Bạn có thể đánh giá ${productName || "sản phẩm này"} sau khi đơn hàng được giao thành công.`,
    },
    already_reviewed: {
      title: "Bạn đã đánh giá sản phẩm này",
      text: "Mỗi khách hàng chỉ gửi một đánh giá cho mỗi sản phẩm. Đánh giá đang được lưu trong hệ thống.",
    },
  }[eligibility.reason] || {
    title: "Chưa thể gửi đánh giá",
    text: eligibility.message || "Vui lòng thử lại sau.",
  };

  return (
    <div className="review-eligibility-notice" role="status">
      <span className="review-eligibility-icon" aria-hidden="true">✓</span>
      <div>
        <strong>{content.title}</strong>
        <p>{content.text}</p>
      </div>
    </div>
  );
}
