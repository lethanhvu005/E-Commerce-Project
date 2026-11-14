#!/usr/bin/env bash
# Shell script to backup PostgreSQL database for NEXA / CommerceOS (#23)
set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
DB_NAME="${POSTGRES_DB:-commerceos_apps}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-127.0.0.1}"
DB_PORT="${POSTGRES_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Bắt đầu sao lưu database '$DB_NAME' tại $DB_HOST:$DB_PORT..."

if ! command -v pg_dump >/dev/null 2>&1; then
  log "LỖI: pg_dump chưa được cài đặt trên hệ thống."
  exit 1
fi

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --format=custom \
  --blobs \
  --file="$BACKUP_FILE" \
  "$DB_NAME"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Sao lưu THÀNH CÔNG: $BACKUP_FILE ($FILE_SIZE)"

# Dọn dẹp bản sao lưu cũ quá thời hạn RETENTION_DAYS
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} +
log "Đã dọn dẹp các bản sao lưu cũ hơn $RETENTION_DAYS ngày."
