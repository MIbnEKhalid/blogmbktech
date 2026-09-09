document.addEventListener('DOMContentLoaded', () => {
    const assetsToPreload = [
        // CSS Files
        '/assets/css/blog-main.css',
        '/assets/css/markdown.css',
        '/assets/css/post-card.css',
        '/assets/css/search-filter.css',
        '/assets/css/post-detail.css',
        '/assets/css/blog-archive.css',
        '/assets/css/table-of-contents.css',

        // JS Files
        '/assets/js/blog-main.js',
        '/assets/js/markdown-enhancer.js',
        '/assets/js/post-detail.js'
    ];

    window.addEventListener('load', () => {
        assetsToPreload.forEach(url => {
            fetch(url).catch(err => console.error(`Failed to preload ${url}:`, err));
        });
    });
});
