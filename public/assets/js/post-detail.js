/**
 * MBK Blog - Post Detail JavaScript Module
 * Handles reading progress, sticky sidebar & mobile Table of Contents, heading anchor links,
 * code block headers & copy, post reactions, left rail sync, Web Share, lightbox, font-resizer, bookmarks, and comments.
 */

// --- USER PROFILE PICTURE (PP) HYDRATION FOR POST VIEW ---
function hydratePostAvatars() {
    const cookiePp = window.getCookie ? window.getCookie('profile_image_url') : null;
    if (!cookiePp || cookiePp === 'default') return;

    // Update ONLY current user comment box avatar
    document.querySelectorAll('[data-current-user="true"]').forEach(el => {
        el.innerHTML = `<img src="${cookiePp}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;">`;
    });

    // ONLY if the logged-in viewer is strictly the author of this post
    const currentUserName = (document.body.dataset.currentUser || '').trim().toLowerCase();
    const postAuthor = (document.querySelector('[data-post-author]')?.dataset?.postAuthor || '').trim().toLowerCase();
    if (currentUserName && postAuthor && currentUserName === postAuthor) {
        document.querySelectorAll('.author-avatar, .author-bio-avatar').forEach(el => {
            el.innerHTML = `<img src="${cookiePp}" alt="${postAuthor}" style="width:100%;height:100%;object-fit:cover;">`;
        });
    }
}

// --- READING PROGRESS BAR & SCROLL FAB (ULTRA-LEAN) ---
let postScrollTicking = false;
window.addEventListener('scroll', () => {
    if (!postScrollTicking) {
        window.requestAnimationFrame(() => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            const bar = document.getElementById('readingProgressBar');
            if (bar) bar.style.width = `${scrolled}%`;

            // Back to top floating button visibility
            const scrollFab = document.getElementById('scrollTopFab');
            if (scrollFab) {
                if (scrollTop > 400) {
                    scrollFab.classList.add('visible');
                } else {
                    scrollFab.classList.remove('visible');
                }
            }
            postScrollTicking = false;
        });
        postScrollTicking = true;
    }
}, { passive: true });

// --- INTERSECTION OBSERVER BASED TOC SCROLL-SPY ---
let tocObserver = null;
function initTocScrollSpy() {
    if (tocObserver) {
        tocObserver.disconnect();
        tocObserver = null;
    }

    const content = document.getElementById('markdownContent');
    if (!content) return;

    const headings = content.querySelectorAll('h2, h3, h4');
    const tocLinks = document.querySelectorAll('.table-of-contents a');
    if (!headings.length || !tocLinks.length) return;

    const linkMap = new Map();
    tocLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const id = href.replace('#', '');
        if (id) {
            if (!linkMap.has(id)) linkMap.set(id, []);
            linkMap.get(id).push(link);
        }
    });

    if ('IntersectionObserver' in window) {
        tocObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    tocLinks.forEach(l => l.classList.remove('active'));
                    const activeLinks = linkMap.get(id);
                    if (activeLinks) {
                        activeLinks.forEach(l => l.classList.add('active'));
                    }
                }
            });
        }, {
            rootMargin: '-80px 0px -70% 0px',
            threshold: 0
        });

        headings.forEach(heading => {
            if (heading.id) tocObserver.observe(heading);
        });
    }
}

// --- DYNAMIC TABLE OF CONTENTS & HEADING ANCHORS ---
function slugifyHeading(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

function initTableOfContentsAndAnchors() {
    const content = document.getElementById('markdownContent');
    const tocContainer = document.getElementById('tocContainer');
    const sidebarTocContainer = document.getElementById('sidebarTocContainer');
    if (!content) return;

    const headings = Array.from(content.querySelectorAll('h2, h3, h4'));
    if (!headings.length) {
        if (sidebarTocContainer) sidebarTocContainer.style.display = 'none';
        return;
    }

    const usedIds = new Set();
    const tocItems = [];

    headings.forEach((heading, index) => {
        let baseId = heading.id || slugifyHeading(heading.textContent) || `section-${index + 1}`;
        let uniqueId = baseId;
        let counter = 1;
        while (usedIds.has(uniqueId) || (document.getElementById(uniqueId) && document.getElementById(uniqueId) !== heading)) {
            uniqueId = `${baseId}-${counter++}`;
        }
        usedIds.add(uniqueId);
        heading.id = uniqueId;
        heading.classList.add('article-heading-anchor-wrap');

        // Add hover anchor link icon
        if (!heading.querySelector('.heading-anchor-link')) {
            const anchor = document.createElement('a');
            anchor.className = 'heading-anchor-link';
            anchor.href = `#${uniqueId}`;
            anchor.title = 'Copy direct link to this section';
            anchor.innerHTML = '<i class="fas fa-link"></i>';
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUrl = `${window.location.origin}${window.location.pathname}#${uniqueId}`;
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(targetUrl);
                }
                history.pushState(null, '', `#${uniqueId}`);
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                showToastNotification('Section link copied!');
            });
            heading.appendChild(anchor);
        }

        tocItems.push({
            id: uniqueId,
            text: heading.textContent.replace('#', '').trim(),
            level: heading.tagName.toLowerCase()
        });
    });

    // Render TOC if at least 2 headings exist
    if (tocItems.length >= 2) {
        let tocHtml = `
        <nav class="table-of-contents" aria-label="Table of Contents">
            <div class="toc-header">
                <h3><i class="fas fa-list-ul"></i> Table of Contents</h3>
                <button type="button" class="toc-toggle" id="tocToggleBtn" onclick="toggleTocCollapse()">
                    <i class="fas fa-chevron-up"></i>
                    <span>Hide</span>
                </button>
            </div>
            <ul class="toc-list">
        `;

        tocItems.forEach(item => {
            tocHtml += `<li class="toc-${item.level}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`;
        });

        tocHtml += `
            </ul>
        </nav>
        `;

        if (sidebarTocContainer) {
            sidebarTocContainer.innerHTML = tocHtml;
            sidebarTocContainer.style.display = 'block';
        }

        if (tocContainer) {
            tocContainer.innerHTML = tocHtml;
        }

        // Smooth scroll for all TOC links
        document.querySelectorAll('.table-of-contents a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href')?.replace('#', '');
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.pushState(null, '', `#${targetId}`);
                }
            });
        });

        // Initialize IntersectionObserver scroll-spy
        initTocScrollSpy();
    } else {
        if (sidebarTocContainer) sidebarTocContainer.style.display = 'none';
    }
}

function toggleTocCollapse() {
    const tocs = document.querySelectorAll('.table-of-contents');
    tocs.forEach(toc => {
        toc.classList.toggle('collapsed');
        const isCollapsed = toc.classList.contains('collapsed');
        const btn = toc.querySelector('.toc-toggle');
        if (btn) {
            btn.innerHTML = isCollapsed
                ? '<i class="fas fa-chevron-down"></i> <span>Show</span>'
                : '<i class="fas fa-chevron-up"></i> <span>Hide</span>';
        }
    });
}

// --- ENHANCED CODE BLOCKS WITH COPY & LANGUAGE HEADER ---
function enhanceCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.markdown-content pre');
    codeBlocks.forEach((pre) => {
        if (pre.closest('.code-block-wrapper')) return;

        const code = pre.querySelector('code');
        if (!code) return;

        // Detect language from class (e.g. language-javascript, lang-python)
        let langName = 'CODE';
        const classNames = ((code.className || '') + ' ' + (pre.className || '')).split(/\s+/);
        for (const cls of classNames) {
            if (cls.startsWith('language-') || cls.startsWith('lang-')) {
                langName = cls.replace(/^(language-|lang-)/, '').toUpperCase();
                break;
            }
        }

        const langMap = {
            'JS': 'JAVASCRIPT',
            'TS': 'TYPESCRIPT',
            'PY': 'PYTHON',
            'SH': 'BASH',
            'SHELL': 'BASH',
            'YML': 'YAML',
            'MD': 'MARKDOWN',
            'HTML': 'HTML',
            'CSS': 'CSS',
            'JSON': 'JSON',
            'SQL': 'SQL',
            'CPP': 'C++',
            'CS': 'C#',
            'JAVA': 'JAVA',
            'RUST': 'RUST',
            'GO': 'GO'
        };
        if (langMap[langName]) langName = langMap[langName];

        // Create outer wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';

        // Create header bar
        const header = document.createElement('div');
        header.className = 'code-header-bar';
        header.innerHTML = `
            <div class="code-lang-badge">
                <span class="code-dot"></span>
                <span>${langName}</span>
            </div>
            <button type="button" class="code-copy-btn" title="Copy code snippet">
                <i class="far fa-copy"></i>
                <span>Copy</span>
            </button>
        `;

        const copyBtn = header.querySelector('.code-copy-btn');
        copyBtn.addEventListener('click', () => {
            const rawCode = code.innerText || code.textContent;
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(rawCode).then(() => triggerCodeCopied(copyBtn));
            } else {
                const ta = document.createElement('textarea');
                ta.value = rawCode;
                ta.style.position = 'fixed';
                ta.style.left = '-999999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                triggerCodeCopied(copyBtn);
            }
        });

        // Insert wrapper into DOM around the pre element
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
    });

    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

function triggerCodeCopied(btn) {
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
    setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '<i class="far fa-copy"></i> <span>Copy</span>';
    }, 2200);
}

// --- NATIVE WEB SHARE API ---
window.nativeWebShare = function(title, url, text) {
    if (navigator.share) {
        navigator.share({
            title: title || document.title,
            text: text || '',
            url: url || window.location.href
        }).catch(err => {
            if (err.name !== 'AbortError') {
                copyPostLink();
            }
        });
    } else {
        copyPostLink();
    }
};

function checkNativeShareSupport() {
    const btns = document.querySelectorAll('.native-share-btn');
    if (!navigator.share) {
        btns.forEach(btn => btn.title = "Copy Post Link");
    }
}

// --- FONT SIZE RESIZER ---
const fontSizes = ['font-size-sm', 'font-size-md', 'font-size-lg', 'font-size-xl'];
let currentFontIdx = 1;

function changeFontSize(delta) {
    const content = document.getElementById('markdownContent');
    if (!content) return;
    content.classList.remove(fontSizes[currentFontIdx]);
    currentFontIdx = Math.max(0, Math.min(fontSizes.length - 1, currentFontIdx + delta));
    content.classList.add(fontSizes[currentFontIdx]);
}

// --- IMAGE LIGHTBOX ---
function openLightbox(src) {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) lightbox.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// --- COMMENTS HANDLING ---
function replyToComment(commentId, authorName) {
    document.getElementById('parentCommentId').value = commentId;
    document.getElementById('replyingToName').textContent = authorName;
    document.getElementById('replyingTo').style.display = 'flex';
    const textarea = document.querySelector('textarea[name="content"]');
    if (textarea) {
        textarea.focus();
        textarea.placeholder = `Reply to ${authorName}...`;
    }
    document.getElementById('commentForm')?.scrollIntoView({ behavior: 'smooth' });
}

function cancelReply() {
    document.getElementById('parentCommentId').value = '';
    document.getElementById('replyingTo').style.display = 'none';
    const textarea = document.querySelector('textarea[name="content"]');
    if (textarea) {
        textarea.placeholder = 'Share your insights, ask questions, or contribute feedback...';
    }
}

function toggleReplies(commentId) {
    const container = document.getElementById(`replies-${commentId}`);
    const caret = document.getElementById(`caret-${commentId}`);
    const replyCount = document.getElementById(`reply-count-${commentId}`);
    if (!container || !replyCount) return;
    const count = replyCount.textContent.match(/\d+/)[0];

    if (container.style.display === 'none') {
        container.style.display = 'flex';
        caret.classList.remove('fa-caret-right');
        caret.classList.add('fa-caret-down');
        replyCount.textContent = `Hide replies (${count})`;
    } else {
        container.style.display = 'none';
        caret.classList.remove('fa-caret-down');
        caret.classList.add('fa-caret-right');
        replyCount.textContent = `Show replies (${count})`;
    }
}

function approveComment(commentId) {
    if (confirm('Approve this comment for public display?')) {
        fetch(`/dashboard/api/comments/${commentId}/approve`, { method: 'PUT' })
            .then(r => r.ok ? location.reload() : alert('Failed to approve comment.'))
            .catch(() => alert('Error approving comment.'));
    }
}

function deleteComment(commentId) {
    if (confirm('Delete this comment permanently?')) {
        fetch(`/dashboard/api/comments/${commentId}`, { method: 'DELETE' })
            .then(r => r.ok ? location.reload() : alert('Failed to delete comment.'))
            .catch(() => alert('Error deleting comment.'));
    }
}

// --- SHARE LINK & CLIPBOARD ---
function copyPostLink() {
    const url = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(showCopyFeedback);
    } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopyFeedback();
    }
}

function showCopyFeedback() {
    const btns = document.querySelectorAll('.copy-link-btn');
    btns.forEach(btn => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
    });
    showToastNotification('Article link copied to clipboard!');
}

function showToastNotification(msg) {
    const existing = document.getElementById('postToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'postToast';
    toast.className = 'post-floating-toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${escapeHtml(msg)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 20);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- BOOKMARK LOGIC ---
function toggleBookmark(postId, slug, title) {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarkText = document.getElementById('bookmarkText');
    const floatingFab = document.getElementById('floatingBookmarkFab');
    const railBookmarkBtn = document.getElementById('railBookmarkBtn');

    let bookmarks = JSON.parse(localStorage.getItem('bookmarkedPosts')) || [];
    const isBookmarked = bookmarks.some(p => p.id == postId);

    if (isBookmarked) {
        bookmarks = bookmarks.filter(p => p.id != postId);
        if (bookmarkBtn) {
            bookmarkBtn.classList.remove('bookmarked');
            if (bookmarkText) bookmarkText.textContent = 'Bookmark';
            bookmarkBtn.querySelector('i').className = 'far fa-bookmark';
        }
        if (floatingFab) floatingFab.querySelector('i').className = 'far fa-bookmark';
        if (railBookmarkBtn) {
            railBookmarkBtn.classList.remove('active');
            railBookmarkBtn.querySelector('i').className = 'far fa-bookmark';
        }
        showToastNotification('Removed from saved bookmarks.');
    } else {
        bookmarks.push({ id: postId, slug: slug, title: title, bookmarkedAt: new Date().toISOString() });
        if (bookmarkBtn) {
            bookmarkBtn.classList.add('bookmarked');
            if (bookmarkText) bookmarkText.textContent = 'Bookmarked';
            bookmarkBtn.querySelector('i').className = 'fas fa-bookmark';
        }
        if (floatingFab) floatingFab.querySelector('i').className = 'fas fa-bookmark';
        if (railBookmarkBtn) {
            railBookmarkBtn.classList.add('active');
            railBookmarkBtn.querySelector('i').className = 'fas fa-bookmark';
        }
        showToastNotification('Saved to your reading bookmarks!');
    }
    localStorage.setItem('bookmarkedPosts', JSON.stringify(bookmarks));
}

function checkBookmarkStatus(postId) {
    if (!postId) return;
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarkText = document.getElementById('bookmarkText');
    const floatingFab = document.getElementById('floatingBookmarkFab');
    const railBookmarkBtn = document.getElementById('railBookmarkBtn');
    const bookmarks = JSON.parse(localStorage.getItem('bookmarkedPosts')) || [];

    if (bookmarks.some(p => p.id == postId)) {
        if (bookmarkBtn) {
            bookmarkBtn.classList.add('bookmarked');
            if (bookmarkText) bookmarkText.textContent = 'Bookmarked';
            bookmarkBtn.querySelector('i').className = 'fas fa-bookmark';
        }
        if (floatingFab) floatingFab.querySelector('i').className = 'fas fa-bookmark';
        if (railBookmarkBtn) {
            railBookmarkBtn.classList.add('active');
            railBookmarkBtn.querySelector('i').className = 'fas fa-bookmark';
        }
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    hydratePostAvatars();

    const postId = document.getElementById('mainArticle')?.dataset?.postId;
    if (postId) {
        checkBookmarkStatus(postId);
    }

    // Dynamic ToC & Anchors
    initTableOfContentsAndAnchors();

    // Enhanced Code Blocks
    enhanceCodeBlocks();

    // Web Share check
    checkNativeShareSupport();

    // Lightbox image clicks
    document.querySelectorAll('.markdown-content img, .zoomable-img').forEach(img => {
        img.addEventListener('click', () => {
            openLightbox(img.src);
        });
    });
});
