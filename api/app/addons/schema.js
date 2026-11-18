'use strict';
// جداول الإضافات (BYOK): كل صف مرتبط بـ user_id، وكل استعلام في الخدمة يُقيَّد بـ user_id الخاص بالجلسة.
// لا يُخزَّن أي مفتاح خام هنا: المفاتيح في addon_credentials مشفّرة فقط.
// الجداول الثلاثة الأخيرة (permissions / usage / subscriptions) مُنشأة للمراحل القادمة ولا تكتب فيها المرحلة الأولى.

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS addons (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'api_key',
      billing TEXT NOT NULL DEFAULT 'per_use_by_provider',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addon_slug TEXT NOT NULL REFERENCES addons(slug),
      key_hint TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('verified', 'failed')),
      last_tested_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (user_id, addon_slug)
    );
    CREATE TABLE IF NOT EXISTS addon_credentials (
      integration_id INTEGER PRIMARY KEY REFERENCES user_integrations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ciphertext TEXT NOT NULL,
      key_version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      rotated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS user_addons (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addon_slug TEXT NOT NULL REFERENCES addons(slug),
      integration_id INTEGER REFERENCES user_integrations(id) ON DELETE SET NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, addon_slug)
    );
    CREATE TABLE IF NOT EXISTS addon_permissions (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addon_slug TEXT NOT NULL REFERENCES addons(slug),
      tool_name TEXT NOT NULL,
      allowed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, addon_slug, tool_name)
    );
    CREATE TABLE IF NOT EXISTS addon_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addon_slug TEXT NOT NULL,
      units REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS addon_usage_user ON addon_usage_logs(user_id, created_at);
    CREATE TABLE IF NOT EXISTS addon_execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addon_slug TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      error_code TEXT,
      duration_ms INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS addon_exec_user ON addon_execution_logs(user_id, created_at);
    CREATE TABLE IF NOT EXISTS addon_subscriptions (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addon_slug TEXT NOT NULL REFERENCES addons(slug),
      plan TEXT NOT NULL DEFAULT 'pay_per_use',
      status TEXT NOT NULL DEFAULT 'inactive',
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, addon_slug)
    );
  `);
}

module.exports = { initSchema };
