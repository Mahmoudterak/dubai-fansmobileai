#!/usr/bin/env bash
# المستشار (advisor): توصيات بانتظار موافقة + محلل النتائج. ما فيهوش تنفيذ تلقائي.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
API_DIR=/opt/dfai
[ -f "$API_DIR/docker-compose.yml" ] || { echo "❌ مسار dfai مش موجود"; exit 1; }
TS=$(date +%Y%m%d-%H%M%S); mkdir -p /root/dfai-backups
docker exec dfai_api node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/dfai.db');d.exec(\"VACUUM INTO '/data/backup-$TS.db'\");" 2>/dev/null \
  && docker cp "dfai_api:/data/backup-$TS.db" "/root/dfai-backups/dfai-$TS.db" && docker exec dfai_api rm -f "/data/backup-$TS.db" && echo "نسخة احتياطية: /root/dfai-backups/dfai-$TS.db ✅"
mkdir -p "$API_DIR/app/advisor/market-sources" "$API_DIR/app/ai-tools" "$API_DIR/app/tasks"
cp "$SRC/api/app/server.js" "$API_DIR/app/"
cp "$SRC/api/app/business.js" "$API_DIR/app/"
cp "$SRC/api/app/model-router.js" "$API_DIR/app/"
cp "$SRC/api/app/langfuse.js" "$API_DIR/app/"
cp "$SRC/api/app/langfuse-admin.js" "$API_DIR/app/"
cp "$SRC/api/app/sentry-admin.js" "$API_DIR/app/"
cp "$SRC/api/app/sentry-lite.js" "$API_DIR/app/"
cp "$SRC/api/app/otel-http.js" "$API_DIR/app/"
cp "$SRC/api/app/api-keys.js" "$API_DIR/app/"
cp "$SRC/api/app/r2.js" "$SRC/api/app/bgtasks.js" "$SRC/api/app/chats.js" "$API_DIR/app/"
cp "$SRC/api/app/tasks/"*.js "$API_DIR/app/tasks/"
cp "$SRC/api/app/advisor/"*.js "$API_DIR/app/advisor/"
cp "$SRC/api/app/advisor/market-sources/"*.js "$API_DIR/app/advisor/market-sources/"
cp "$SRC/api/app/ai-tools/"*.js "$API_DIR/app/ai-tools/"
cd "$API_DIR" && docker compose up -d --force-recreate dfai-api
WEB=/var/www/dubai-fans-ai
if [ -d "$WEB" ]; then
  V=$(date +%s); cp -r "$SRC/site/." "$WEB/"; sed -i "s/__V__/$V/g" "$WEB"/*.html && echo "الواجهة اتحدّثت ✅"
fi
sleep 5
echo "اختبار المستشار (المتوقع 401):"; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3210/api/advisor/recs
# بوابة اختبارات الدخان: لو فشل أي اختبار يطلع النشر بخطأ.
# ملاحظة: الكود يكون نُشر فعلاً قبل هذه الخطوة، فلو فشلت راجع فوراً.
if [ -f /opt/dfai-smoke/run-smoke.sh ]; then
  bash /opt/dfai-smoke/run-smoke.sh || { echo "❌ اختبارات الدخان فشلت بعد النشر — راجع /opt/dfai-smoke/last-run.json"; exit 1; }
else
  echo "⚠️ اختبارات الدخان غير مثبتة في /opt/dfai-smoke — تخطّيت الخطوة"
fi
echo "تم ✅"
