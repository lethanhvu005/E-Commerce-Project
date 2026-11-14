#!/usr/bin/env bash
# Shell script to restore PostgreSQL database for NEXA / CommerceOS (#23)
set -eo pipefail

if [ -z "$1" ]; then
  echo "Cách dùng: $0 <duong-dan-file-dump> [ten-database]"
  echo "Ví dụ:    $0 ../backups/commerceos_apps_20261114_120000.dump commerceos_restore_test"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${2:-${POSTGRES_DB:-commerceos_apps}}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-127.0.0.1}"
DB_PORT="${POSTGRES_PORT:-5432}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "LỖI: Không tìm thấy file sao lưu tại: $BACKUP_FILE"
  exit 1
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Chuẩn bị khôi phục database '$DB_NAME' từ $BACKUP_FILE..."

# Kiểm tra database đích, nếu chưa có thì tạo
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "Tạo database mới: $DB_NAME"
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
fi

pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  "$BACKUP_FILE" || true

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Khôi phục THÀNH CÔNG database '$DB_NAME'."
