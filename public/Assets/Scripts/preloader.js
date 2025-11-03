document.addEventListener('DOMContentLoaded', () => {
    const assetsToPreload = [
        // CSS Files
        '/Assets/dashboard.css',
        '/Assets/markdown.css',
        '/Assets/post-card.css',
        '/Assets/search-filter.css',
        '/Assets/table-of-contents.css',

        // JS Files
        '/Assets/Scripts/markdown-enhancer.js'
    ];

    window.addEventListener('load', () => {
        assetsToPreload.forEach(url => {
            fetch(url).catch(err => console.error(`Failed to preload ${url}:`, err));
        });
    });
});
