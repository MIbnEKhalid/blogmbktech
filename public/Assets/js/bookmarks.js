/**
 * MBK Blog - Bookmarks Manager JavaScript Module
 * Handles local storage bookmark synchronization, removal, and JSON export.
 */

document.addEventListener('DOMContentLoaded', function () {
    const currentUrl = new URL(window.location);
    const bookmarks = JSON.parse(localStorage.getItem('bookmarkedPosts')) || [];
    const bookmarkIds = bookmarks.map(b => b.id).sort((a, b) => a - b);

    let currentIds = [];
    if (currentUrl.searchParams.has('ids')) {
        try {
            currentIds = JSON.parse(currentUrl.searchParams.get('ids')).sort((a, b) => a - b);
        } catch (e) {
            currentIds = [];
        }
    }

    const idsMatch = JSON.stringify(currentIds) === JSON.stringify(bookmarkIds);

    if (!idsMatch) {
        if (bookmarkIds.length > 0) {
            const params = new URLSearchParams();
            params.append('ids', JSON.stringify(bookmarkIds));
            window.location.href = `/bookmarks?${params.toString()}`;
        } else {
            currentUrl.searchParams.delete('ids');
            window.location.href = currentUrl.toString();
        }
    }

    calculateReadingTime();
});

function removeBookmark(postId) {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarkedPosts')) || [];
    bookmarks = bookmarks.filter(b => b.id != postId);
    localStorage.setItem('bookmarkedPosts', JSON.stringify(bookmarks));

    const currentUrl = new URL(window.location);
    if (currentUrl.searchParams.has('ids')) {
        let ids = JSON.parse(currentUrl.searchParams.get('ids'));
        ids = ids.filter(id => id != postId);

        if (ids.length > 0) {
            currentUrl.searchParams.set('ids', JSON.stringify(ids));
        } else {
            currentUrl.searchParams.delete('ids');
        }

        window.history.replaceState({}, '', currentUrl);
    }

    const card = document.querySelector(`[data-post-id="${postId}"]`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.remove();
            if (document.querySelectorAll('.post-card').length === 0) {
                location.reload();
            }
        }, 250);
    }
}

function clearAllBookmarks() {
    if (confirm('Clear all saved bookmarks?')) {
        localStorage.removeItem('bookmarkedPosts');
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.delete('ids');
        window.history.replaceState({}, '', currentUrl);
        setTimeout(() => {
            location.reload();
        }, 200);
    }
}

function exportBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarkedPosts')) || [];
    if (bookmarks.length === 0) {
        alert('No bookmarks to export');
        return;
    }

    const postsData = [];
    document.querySelectorAll('.post-card').forEach(card => {
        const postId = card.getAttribute('data-post-id');
        const titleElement = card.querySelector('.post-title a');
        const authorElement = card.querySelector('.post-info a');
        const dateElement = card.querySelector('.date');

        if (titleElement && authorElement) {
            postsData.push({
                id: postId,
                title: titleElement.textContent.trim(),
                url: titleElement.href,
                author: authorElement.textContent.trim(),
                date: dateElement ? dateElement.textContent.trim() : '',
                bookmarkedAt: bookmarks.find(b => b.id == postId)?.bookmarkedAt || new Date().toISOString()
            });
        }
    });

    const exportData = {
        exportDate: new Date().toISOString(),
        totalBookmarks: postsData.length,
        bookmarks: postsData
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mbk-blog-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function calculateReadingTime() {
    const posts = document.querySelectorAll('.post-card');
    let totalTime = 0;
    posts.forEach(card => {
        const content = card.querySelector('.post-content');
        if (content) {
            const words = content.textContent.trim().split(/\s+/).length;
            totalTime += Math.ceil(words / 200);
        }
    });
    const el = document.getElementById('totalReadingTime');
    if (el) el.textContent = `${totalTime} min`;
}
