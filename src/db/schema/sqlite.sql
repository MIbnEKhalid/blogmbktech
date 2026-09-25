-- ============================================================
-- PREREQUISITE AUTH STRUCTURE
-- ============================================================
CREATE TABLE IF NOT EXISTS mbkcore_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'normaluser',
    is_active INTEGER DEFAULT 1,
    image TEXT,
    allowed_apps TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO mbkcore_users (username, full_name, email, role, is_active) VALUES ('admin', 'Admin User', 'admin@mbktech.org', 'superadmin', 1);

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