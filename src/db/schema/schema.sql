-- ===========================
-- USERS AND SESSION TABLES (Shared MBKAuthe tables)
-- ===========================

CREATE TABLE mbkcore_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'normaluser',
    active BOOLEAN DEFAULT TRUE,
    have_mail_account BOOLEAN DEFAULT FALSE,
    session_id VARCHAR(255),
    image TEXT
);

CREATE TABLE mbkcore_session (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- ===========================
-- BLOG CORE STRUCTURE
-- ===========================

-- Categories table
CREATE TABLE blog_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content_markdown TEXT NOT NULL,
    username VARCHAR(50) REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    slug VARCHAR(255) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft', 'published', 'private'
    published BOOLEAN DEFAULT FALSE,
    preview_image TEXT,
    views INTEGER DEFAULT 0
);

-- Tags table
CREATE TABLE blog_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- RELATIONSHIP TABLES
-- ===========================

-- Many-to-many: Posts <-> Categories
CREATE TABLE blog_post_categories (
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES blog_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

-- Many-to-many: Posts <-> Tags
CREATE TABLE blog_post_tags (
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- ===========================
-- COMMENTS TABLE
-- ===========================

CREATE TABLE blog_comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    username VARCHAR(50) REFERENCES mbkcore_users(username) ON DELETE CASCADE,
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT FALSE
);

-- ===========================
-- ADMIN TABLES
-- ===========================

CREATE TABLE blog_activity_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    entity_title TEXT,
    details TEXT,
    username VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- DEFAULT DATA
-- ===========================

-- Insert default categories
INSERT INTO blog_categories (name, description) VALUES 
('Technology', 'Posts about technology and programming'),
('Tutorials', 'Step-by-step guides and coding tutorials'),
('Opinion', 'Personal thoughts and tech insights');

-- Insert default tags
INSERT INTO blog_tags (name) VALUES 
('javascript'),
('nodejs'),
('programming'),
('webdev'),
('database'),
('tutorial');

-- ===========================
-- SAMPLE USER (optional)
-- ===========================
INSERT INTO mbkcore_users (username, password, role, active, have_mail_account) VALUES
('admin', 'admin123', 'superadmin', TRUE, TRUE);

-- ===========================
-- DATABASE OPTIMIZATION: INDEXES FOR PERFORMANCE
-- ===========================

-- Posts Table Indexes
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_username ON blog_posts(username);
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX idx_blog_posts_status_created_at ON blog_posts(status, created_at DESC);
CREATE INDEX idx_blog_posts_views ON blog_posts(views);

-- Categories Table Indexes
CREATE INDEX idx_blog_categories_name ON blog_categories(name);

-- Tags Table Indexes
CREATE INDEX idx_blog_tags_name ON blog_tags(name);

-- Post_Categories Table Indexes
CREATE INDEX idx_blog_post_categories_post_id ON blog_post_categories(post_id);
CREATE INDEX idx_blog_post_categories_category_id ON blog_post_categories(category_id);
CREATE INDEX idx_blog_post_categories_cat_post ON blog_post_categories(category_id, post_id);

-- Post_Tags Table Indexes
CREATE INDEX idx_blog_post_tags_post_id ON blog_post_tags(post_id);
CREATE INDEX idx_blog_post_tags_tag_id ON blog_post_tags(tag_id);
CREATE INDEX idx_blog_post_tags_tag_post ON blog_post_tags(tag_id, post_id);

-- Comments Table Indexes
CREATE INDEX idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX idx_blog_comments_username ON blog_comments(username);
CREATE INDEX idx_blog_comments_is_approved ON blog_comments(is_approved);
CREATE INDEX idx_blog_comments_parent_id ON blog_comments(parent_id);
CREATE INDEX idx_blog_comments_post_approved ON blog_comments(post_id, is_approved);
CREATE INDEX idx_blog_comments_post_user ON blog_comments(post_id, username);

-- Activity Logs Indexes
CREATE INDEX idx_blog_activity_logs_created_at ON blog_activity_logs(created_at DESC);
CREATE INDEX idx_blog_activity_logs_entity ON blog_activity_logs(entity_type, entity_id);
CREATE INDEX idx_blog_activity_logs_username ON blog_activity_logs(username);

-- Users Table Indexes
CREATE INDEX idx_mbkcore_users_role ON mbkcore_users(role);
CREATE INDEX idx_mbkcore_users_session_id ON mbkcore_users(session_id);

-- Session Table Indexes
CREATE INDEX idx_mbkcore_session_expire ON mbkcore_session(expire);
