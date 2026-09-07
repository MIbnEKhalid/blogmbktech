-- ===========================
-- SQLITE PRAGMAS
-- ===========================
PRAGMA foreign_keys = ON;

-- ============================================================
-- MBKAUTHE AUTHENTICATION TABLES
-- ============================================================

-- Table: mbkcore_users
CREATE TABLE IF NOT EXISTS mbkcore_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE,
    password TEXT DEFAULT 'admin123',
    is_active INTEGER DEFAULT 1,
    active INTEGER DEFAULT 1,
    role TEXT DEFAULT 'normaluser',
    have_mail_account INTEGER DEFAULT 0,
    allowed_apps TEXT DEFAULT '["Portal", "mbkauthe"]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT,
    password_hash TEXT,
    full_name TEXT,
    user_id TEXT UNIQUE CHECK (user_id IS NULL OR length(user_id) = 9),
    email TEXT DEFAULT 'support@mbktech.org',
    image TEXT DEFAULT 'https://portal.mbktech.org/icon.svg',
    bio TEXT DEFAULT 'I am ....',
    social_accounts TEXT DEFAULT '{}',
    positions TEXT DEFAULT '{"Not_Permanent": "Member Is Not Permanent"}'
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_users_is_active ON mbkcore_users (is_active);
CREATE INDEX IF NOT EXISTS idx_mbkcore_users_email ON mbkcore_users (email);
CREATE INDEX IF NOT EXISTS idx_mbkcore_users_last_login ON mbkcore_users (last_login);
CREATE INDEX IF NOT EXISTS idx_mbkcore_users_role ON mbkcore_users (role);
CREATE INDEX IF NOT EXISTS idx_mbkcore_users_username ON mbkcore_users (username);
CREATE INDEX IF NOT EXISTS idx_mbkcore_users_user_id ON mbkcore_users (user_id);

-- Table: mbkcore_sessions (mbkauthe persistent device / multi-session table)
CREATE TABLE IF NOT EXISTS mbkcore_sessions (
    id TEXT PRIMARY KEY DEFAULT (
        lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))), 2) || '-' ||
        substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
        lower(hex(randomblob(6)))
    ),
    username VARCHAR(50) NOT NULL REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    meta TEXT
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_sessions_expires ON mbkcore_sessions (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mbkcore_sessions_user_created ON mbkcore_sessions (username, created_at);
CREATE INDEX IF NOT EXISTS idx_mbkcore_sessions_username_expires ON mbkcore_sessions (username, expires_at);

-- Table: mbkcore_two_factor
CREATE TABLE IF NOT EXISTS mbkcore_two_factor (
    username VARCHAR(50) NOT NULL PRIMARY KEY REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    is_enabled INTEGER DEFAULT 0 NOT NULL,
    two_fa_secret TEXT
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_two_factor_username_status ON mbkcore_two_factor (username, is_enabled);

-- Table: mbkcore_trusted_devices
CREATE TABLE IF NOT EXISTS mbkcore_trusted_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    device_token TEXT NOT NULL UNIQUE,
    device_name TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    last_used TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_trusted_devices_expires ON mbkcore_trusted_devices (expires_at);
CREATE INDEX IF NOT EXISTS idx_mbkcore_trusted_devices_username_expires ON mbkcore_trusted_devices (username, expires_at);
CREATE INDEX IF NOT EXISTS idx_mbkcore_trusted_devices_token_user_expires ON mbkcore_trusted_devices (device_token, username, expires_at);

-- Table: mbkcore_session (express-session store)
CREATE TABLE IF NOT EXISTS mbkcore_session (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire TEXT NOT NULL,
    username VARCHAR(50) REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_session_expire ON mbkcore_session (expire);

-- Table: mbkcore_password_resets
CREATE TABLE IF NOT EXISTS mbkcore_password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    reset_token TEXT,
    reset_token_expires TEXT,
    reset_attempts INTEGER DEFAULT 0,
    last_reset_attempt TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_password_resets_token ON mbkcore_password_resets (reset_token);

-- Table: mbkcore_api_tokens
CREATE TABLE IF NOT EXISTS mbkcore_api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    token_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    permissions TEXT DEFAULT '{"scope": "read-only", "allowed_apps": null}' NOT NULL,
    last_used TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    CHECK (expires_at IS NULL OR expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_api_tokens_expires ON mbkcore_api_tokens (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mbkcore_api_tokens_username_created ON mbkcore_api_tokens (username, created_at DESC);

-- Table: mbkcore_api_token_profiles
CREATE TABLE IF NOT EXISTS mbkcore_api_token_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_key TEXT,
    name TEXT NOT NULL,
    description TEXT,
    allowed_apps TEXT,
    scope TEXT DEFAULT 'read-only' NOT NULL,
    expires_in_days INTEGER,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mbkcore_api_token_profiles_name_key UNIQUE (name),
    CONSTRAINT mbkcore_api_token_profiles_profile_key_key UNIQUE (profile_key),
    CONSTRAINT chk_mbkcore_api_token_profiles_scope CHECK (scope IN ('read-only', 'write')),
    CONSTRAINT chk_mbkcore_api_token_profiles_expires CHECK (expires_in_days IS NULL OR expires_in_days > 0)
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_api_token_profiles_is_active ON mbkcore_api_token_profiles (is_active);

-- Table: mbkcore_cli_auth_sessions
CREATE TABLE IF NOT EXISTS mbkcore_cli_auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code_hash TEXT NOT NULL,
    user_code_hash TEXT NOT NULL,
    client_name TEXT NOT NULL,
    profile_id INTEGER NOT NULL,
    username VARCHAR(50),
    token_id INTEGER,
    pending_token TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    CONSTRAINT mbkcore_cli_auth_sessions_device_code_hash_key UNIQUE (device_code_hash),
    CONSTRAINT mbkcore_cli_auth_sessions_user_code_hash_key UNIQUE (user_code_hash),
    CONSTRAINT chk_mbkcore_cli_auth_sessions_status CHECK (status IN ('pending', 'approved', 'completed', 'denied', 'expired'))
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_cli_auth_sessions_expires ON mbkcore_cli_auth_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_mbkcore_cli_auth_sessions_status ON mbkcore_cli_auth_sessions (status);

-- Table: mbkcore_user_github
CREATE TABLE IF NOT EXISTS mbkcore_user_github (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    github_id TEXT UNIQUE,
    github_username VARCHAR(255),
    access_token TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    installation_id INTEGER,
    installation_target_type TEXT
);
CREATE INDEX IF NOT EXISTS idx_mbkcore_user_github_username ON mbkcore_user_github (username);

-- Table: mbkcore_user_google
CREATE TABLE IF NOT EXISTS mbkcore_user_google (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) REFERENCES mbkcore_users(username),
    google_id TEXT UNIQUE,
    google_email TEXT,
    access_token TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BLOG CORE STRUCTURE
-- ============================================================

-- Table: blog_categories
CREATE TABLE IF NOT EXISTS blog_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blog_categories_name ON blog_categories (name);

-- Table: blog_posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    excerpt TEXT,
    content_markdown TEXT NOT NULL,
    username VARCHAR(50) REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    slug TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    published INTEGER DEFAULT 0,
    preview_image TEXT,
    views INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_username ON blog_posts (username);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_created_at ON blog_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_views ON blog_posts (views);

-- Table: blog_tags
CREATE TABLE IF NOT EXISTS blog_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blog_tags_name ON blog_tags (name);

-- Table: blog_post_categories (Many-to-many: Posts <-> Categories)
CREATE TABLE IF NOT EXISTS blog_post_categories (
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES blog_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_post_id ON blog_post_categories (post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_category_id ON blog_post_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_cat_post ON blog_post_categories (category_id, post_id);

-- Table: blog_post_tags (Many-to-many: Posts <-> Tags)
CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON blog_post_tags (post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON blog_post_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_post ON blog_post_tags (tag_id, post_id);

-- Table: blog_comments
CREATE TABLE IF NOT EXISTS blog_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    username VARCHAR(50) REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
    is_approved INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_username ON blog_comments (username);
CREATE INDEX IF NOT EXISTS idx_blog_comments_is_approved ON blog_comments (is_approved);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_approved ON blog_comments (post_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_user ON blog_comments (post_id, username);

-- Table: blog_activity_logs
CREATE TABLE IF NOT EXISTS blog_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    entity_title TEXT,
    details TEXT,
    username VARCHAR(50),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blog_activity_logs_created_at ON blog_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_activity_logs_entity ON blog_activity_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_blog_activity_logs_username ON blog_activity_logs (username);

-- Table: blog_settings
CREATE TABLE IF NOT EXISTS blog_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEEDED DEFAULT DATA
-- ============================================================

INSERT OR IGNORE INTO blog_categories (id, name, description) VALUES 
(1, 'Technology', 'Posts about technology and programming'),
(2, 'Tutorials', 'Step-by-step guides and coding tutorials'),
(3, 'Opinion', 'Personal thoughts and tech insights');

INSERT OR IGNORE INTO blog_tags (name) VALUES 
('javascript'),
('nodejs'),
('programming'),
('webdev'),
('database'),
('tutorial');

-- Default admin user with pre-hashed password for mbkauthe (admin / admin123)
INSERT INTO mbkcore_users (username, password, password_hash, role, active, is_active, have_mail_account, full_name, email, image)
VALUES (
    'admin',
    'admin123',
    '922c9af02415198bc0683656663bc50312ab309da2568adceff673cd8bc97182a2b4fda1908d03db2511d0367c4ab310247b84671c3772018ff1c457c929ec2d',
    'superadmin',
    1,
    1,
    1,
    'Administrator',
    'admin@mbktech.org',
    'https://portal.mbktech.org/icon.svg'
)
ON CONFLICT(username) DO UPDATE SET
    password_hash = excluded.password_hash,
    role = 'superadmin',
    is_active = 1,
    active = 1;

-- Seed support user
INSERT INTO mbkcore_users (username, password_hash, role, is_active, active, have_mail_account, full_name, email)
VALUES (
    'support',
    'b8b10c1c9006d8c30ab81c412463c65ff6dae3293d9bfbaf5fd8e275081d0947f000a828004e2fbd3a8f6ef5a35ae3eddd4c57b00ecab376b12e607a16a57459',
    'superadmin',
    1,
    1,
    0,
    'Support User',
    'support@mbktech.org'
)
ON CONFLICT(username) DO NOTHING;
