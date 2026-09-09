# MBK Tech Blog Platform

A modern, high-performance, and SEO-optimized blogging platform and Content Management System built with Node.js, Express 5 (ES Modules), PostgreSQL, Cloudflare R2/S3 storage, and Google Gemini AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Express Version](https://img.shields.io/badge/express-v5.1.0-blue.svg)
![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg)
![Security](https://img.shields.io/badge/security-enhanced-green.svg)

---

## 🌟 Key Features

### 🤖 Google Gemini AI Writing & SEO Assistant
- **AI-Powered Tag Generator**: Automatically extracts 5–8 high-impact, lowercase SEO tags from content.
- **Smart Category Classifier**: Matches blog post topics against existing database categories with zero manual effort.
- **Catchy Title & Excerpt Generator**: Crafts optimized, high-CTR titles (max 60 chars) and meta excerpts (max 160 chars).
- **Markdown Polisher & Expander**: Automatically formats, refines, and structures markdown drafts with clean headings, code blocks, and lists.

### 🔍 Advanced SEO & Metadata Suite
- **Multi-File XML Sitemaps**: Auto-generated index, post, category, and tag sitemaps (`sitemap.xml`, `sitemap-posts.xml`, `sitemap-categories.xml`, `sitemap-tags.xml`).
- **Structured Data & Schema.org**: Fully integrated JSON-LD schema markup for articles, authors, and organizations.
- **Social Sharing**: Open Graph and Twitter Card tags with dynamic image previews and canonical URLs.
- **Search Engine Friendly**: Fully configured `robots.txt` and crawler management.

### 📝 Rich Content Management & Publishing Engine
- **Interactive Markdown Editor**: Split-view editing with live preview.
- **Syntax Highlighting & Sanitization**: Highlighted code blocks via [PrismJS](https://prismjs.com/) and XSS-safe HTML rendering via [DOMPurify](https://github.com/cure53/DOMPurify) and [Marked](https://marked.js.org/).
- **Post Lifecycle**: Seamless management of `draft`, `private`, and `published` post states.
- **Nested Comment System**: Multi-level reply threads with administrative approval, moderation, and XSS sanitization.
- **Taxonomy Management**: Dynamic categorization, tagging, and filtered navigation.

### 🖼️ Cloud Media & Storage (`mbkbucket`)
- **Cloudflare R2 & AWS S3 Compatibility**: Direct cloud asset storage and media management.
- **Multi-Format Support**: Upload JPEG, PNG, GIF, WebP, and SVG files up to 10MB.
- **Strict File Validation**: Magic number file signature checking against MIME-spoofing attacks.
- **Collision-Proof Filenames**: UUID-based sanitized storage keys.
- **Rate-Limited Uploads**: Strict IP-based upload limits to prevent abuse.

### 🛡️ Enterprise Security & Bot Mitigation
- **Authentication & RBAC (`mbkauthe`)**: Multi-factor authentication (2FA) support, secure cookie sessions, and role validation (`superadmin`).
- **AI Crawler & Bot Defense**: Custom bot blocker middleware identifying and filtering unwanted scrapers.
- **Multi-Tiered Rate Limiting**: Dedicated rate limits for general visitors, bots, and the admin dashboard.
- **HTTP Security Headers**: Secure headers, CORS, and cross-origin resource policy enforcement.

### ⚡ Performance & Caching
- **PostgreSQL Connection Pooling**: High-throughput database query handling with `pg` connection pool (supports Neon Postgres and standard PostgreSQL).
- **Static Post Caching**: Build-time post data generator script (`npm run generate-posts`) for ultra-fast response times.
- **Asset Optimization**: GZIP response compression and immutable browser caching for static assets (`max-age=30d`).

---

## 🛠️ Technology Stack

- **Runtime & Framework**: [Node.js](https://nodejs.org/) (ES Modules), [Express.js 5](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) / [Neon](https://neon.tech/) with `pg` Pool
- **Cloud Object Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) / [AWS S3](https://aws.amazon.com/s3/) via `mbkbucket`
- **Authentication**: `mbkauthe` (Session-based, 2FA enabled, RBAC)
- **AI Engine**: `@google/generative-ai` ([Gemini 2.5 Flash Lite](https://ai.google.dev/))
- **Templating**: [Express-Handlebars](https://github.com/express-handlebars/express-handlebars)
- **Markdown & Code**: Marked, PrismJS, DOMPurify, JSDOM
- **Testing**: [Jest](https://jestjs.io/) (with ES Module support), [Supertest](https://github.com/ladjs/supertest)

---

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js**: `v18.x` or higher
- **PostgreSQL**: Neon DB connection string or a local PostgreSQL instance (>= 14)
- **Cloudflare R2 / AWS S3 Bucket**: For media uploads
- **Google Gemini API Key**: For AI writing and categorization tools

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Mibnekhalid/blog.mbktech.git
cd blogmbktech
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):

### 4. Initialize Database Schema
Execute the SQL schema located in `docs/db.sql` on your PostgreSQL database:
```bash
# Example using psql
psql "<YOUR_POSTGRES_URL>" -f docs/db.sql
```

### 5. Run the Application
```bash
# Development mode with hot-reloading (nodemon)
npm run dev

# Production mode
npm start
```

Access the application in your browser at: `http://localhost:3126`

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the server in development mode with `nodemon` auto-reload. |
| `npm start` | Starts the server in production mode with standard `node`. |
| `npm run generate-sitemap` | Generates updated XML sitemaps for posts, categories, and tags. |
| `npm run generate-posts` | Generates static JSON cache snapshots for published posts in `public/posts/`. |
| `npm test` | Runs Jest unit and integration tests in ES module mode. |
| `npm run test:watch` | Runs Jest tests in interactive watch mode. |

---

## 🏗️ Project Structure

```
blogmbktech/
├── docs/
│   └── db.sql                      # PostgreSQL database schema & tables
├── public/
│   ├── Assets/                     # Static CSS, JS, fonts, and images
│   ├── posts/                      # Cached post JSON snapshots
│   ├── robots.txt                  # Web crawler rules
│   └── sitemap*.xml                # Auto-generated XML sitemaps
├── src/
│   ├── config/                     # Constants, DB pools, environment configs
│   │   ├── constants.js
│   │   └── db.js
│   ├── controllers/                # Request handling & business logic
│   │   ├── ai.controller.js        # Gemini AI assist endpoints
│   │   ├── blog.controller.js      # Public blog rendering & reading
│   │   ├── comments.controller.js  # Comment submission & moderation
│   │   ├── dashboard.controller.js # Admin dashboard & metrics
│   │   ├── media.controller.js     # Media library & file uploads
│   │   ├── posts.controller.js     # Post CRUD & publishing
│   │   └── taxonomy.controller.js  # Categories & tags management
│   ├── middleware/                 # Custom Express middlewares
│   │   ├── botBlocker.middleware.js # Scraper & bot detection
│   │   ├── errorHandler.middleware.js # Global 404 and 500 handlers
│   │   ├── logging.middleware.js   # Request timing & logging
│   │   └── rateLimiter.middleware.js # Multi-tiered rate limiters
│   ├── routes/                     # Application route definitions
│   │   ├── blog.routes.js          # Public routes (/posts, /tags, /categories, /search)
│   │   ├── dashboard.routes.js     # Protected admin dashboard routes (/dashboard/*)
│   │   └── index.js
│   ├── scripts/                    # CLI utilities
│   │   ├── generate-posts.js       # Pre-renders post cache JSON files
│   │   └── generate-sitemap.js     # Sitemaps generator
│   ├── utils/                      # Helper functions & handlebars helpers
│   │   └── handlebarsHelpers.js
│   ├── app.js                      # Express application setup & middleware stack
│   └── server.js                   # Server entry point (starts listener)
├── tests/                          # Jest test suites
├── views/                          # Handlebars templates
│   ├── blog/                       # Public blog pages
│   ├── dashboard/                  # Admin dashboard views
│   ├── layouts/                    # Master layout templates (main, dashboard)
│   ├── partial/                    # SEO, headers, footers, navigation
│   └── templates/                  # Notice & email templates
├── .env.example                    # Template environment variables
├── package.json
└── vercel.json                     # Cloud deployment configuration
```

---

## 🔐 Security Architecture

- **MIME & Magic-Number Verification**: Every uploaded file is checked at byte-level before upload to cloud storage to prevent executable upload exploits.
- **Session & 2FA Protection**: Powered by `mbkauthe` with secure cookie options (`SameSite`, `HttpOnly`, `Secure`).
- **Role-Based Authorization**: Dashboard routes are guarded by `validateSessionAndRole('superadmin')`.
- **Anti-Scraper Filtering**: Bot blocker middleware monitors headers and applies strict rate-limits to abusive crawlers.
- **XSS Prevention**: Markdown content is sanitized through `DOMPurify` with a headless DOM before being rendered or stored.

---

## 🧪 Testing

The codebase includes Jest test suites configured with native ES Module support:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch
```

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Muhammad Bin Khalid**
- Website: [mbktech.org](https://mbktech.org)
- Blog: [blog.mbktech.org](https://blog.mbktech.org)
- GitHub: [@Mibnekhalid](https://github.com/Mibnekhalid)