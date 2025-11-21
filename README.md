# MBK Blog Platform

A powerful, SEO-optimized blogging platform built with Node.js and Express, featuring a robust admin dashboard, dynamic content management, and comprehensive SEO capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D16-green.svg)

## 🌟 Key Features

- **🔍 Advanced SEO Optimization**
  - Automatic sitemap generation
  - Built-in robots.txt configuration
  - Canonical URLs support
  - Schema.org markup integration
  - Meta tags and Open Graph support

- **📝 Content Management**
  - Rich text editor with Markdown support
  - Categories and tags organization
  - Dynamic blog posts
  - Nested comment system

- **🛡️ Security & Performance**
  - Rate limiting protection
  - GZIP compression
  - Static asset caching
  - Cross-domain cookie support
  - Two-factor authentication

- **🎨 User Experience**
  - Responsive mobile-first design
  - Fast page loading
  - Nested comment system
  - Search and filtering capabilities

## 📋 Prerequisites

- Node.js (>= 16.x)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/MIbnEKhalid/blog.mbktech.git
   cd blog.mbktech
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your:
   - Database credentials
   - Session secret key
   - Domain configuration
   - Two-factor authentication settings

4. **Start the development server**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3126`

## 🗺️ SEO Management

### Sitemap Generation

Generate fresh XML sitemaps after content updates:
```bash
npm run generate-sitemap
```

This creates:
- `sitemap.xml` - Main index
- `sitemap-posts.xml` - Blog posts
- `sitemap-categories.xml` - Categories
- `sitemap-tags.xml` - Tags

### Implemented SEO Features

- ✅ XML Sitemaps (auto-generated)
- ✅ robots.txt configuration
- ✅ Canonical URLs
- ✅ Meta tags & Open Graph
- ✅ Schema.org markup
- ✅ Twitter Cards
- ✅ Structured data
- ✅ Static asset caching
- ✅ GZIP compression

## 🏗️ Project Structure

```
├── index.js                 # Application entry point
├── routes/                  # Route handlers
├── views/                   # Handlebars templates
│   ├── blog/               # Blog views
│   ├── dashboard/          # Admin interface
│   ├── layouts/            # Page layouts
│   └── partial/            # Reusable components
├── public/                 # Static assets
│   ├── Assets/            # CSS, JS, Images
│   └── robots.txt         # SEO configurations
├── docs/                   # Documentation
└── generate-sitemap.js    # SEO sitemap generator
```

## 🔄 Known Issues & TODO

- [ ] Fix reply visibility in nested comments
- [ ] Implement infinite sub-reply support
- [ ] Enhance mobile responsiveness
- [ ] Add batch operation support in dashboard

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Muhammad Bin Khalid**
- Website: [mbktech.org](https://www.mbktech.org)
- GitHub: [@MIbnEKhalid](https://github.com/MIbnEKhalid)

---

⭐️ If you find this project useful, please consider giving it a star!
