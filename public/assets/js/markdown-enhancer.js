// Enhanced Markdown Functionality
document.addEventListener('DOMContentLoaded', function () {
    const markdownContent = document.querySelector('.markdown-content');

    if (!markdownContent) return;

    initializeMarkdownFeatures(markdownContent);
});

// Export function for use in edit-post preview
window.initializeMarkdownFeatures = function (container) {
    if (document.querySelector('.post-page-container')) {
        if (typeof Prism !== 'undefined') {
            Prism.highlightAllUnder(container);
        }
        return;
    }

    // Add copy functionality to code blocks
    addCodeBlockCopyFunctionality(container);

    // Add reading progress indicator (only on blog posts, not editor)
    if (document.querySelector('article')) {
        addReadingProgress();
    }

    // Add table of contents generation
    generateTableOfContents(container);

    // Add smooth scroll for anchor links
    addSmoothScrolling(container);

    // Add image zoom functionality
    addImageZoom(container);

    // Add syntax highlighting if Prism is available
    if (typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(container);
    }
};

function addCodeBlockCopyFunctionality(container) {
    const codeBlocks = container.querySelectorAll('pre');
    const isMobile = window.innerWidth <= 768;

    codeBlocks.forEach(pre => {
        // Remove existing copy buttons to avoid duplicates
        const existingBtn = pre.querySelector('.copy-code-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy code';
        copyBtn.setAttribute('aria-label', 'Copy code to clipboard');

        // Make touch-friendly on mobile
        if (isMobile) {
            copyBtn.style.minWidth = '44px';
            copyBtn.style.minHeight = '44px';
            copyBtn.style.touchAction = 'manipulation';
        }

        const handleCopy = async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            try {
                const codeElement = pre.querySelector('code') || pre;
                const textToCopy = codeElement.textContent;

                await navigator.clipboard.writeText(textToCopy);

                // Visual feedback
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyBtn.classList.add('copied');

                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    copyBtn.classList.remove('copied');
                }, 2000);

            } catch (err) {
                console.error('Failed to copy code:', err);

                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                const codeElement = pre.querySelector('code') || pre;
                textArea.value = codeElement.textContent;
                textArea.style.position = 'fixed';
                textArea.style.top = '0';
                textArea.style.left = '0';
                textArea.style.opacity = '0';

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    document.execCommand('copy');
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (fallbackErr) {
                    console.error('Fallback copy failed:', fallbackErr);
                }

                document.body.removeChild(textArea);
            }
        };

        copyBtn.addEventListener('click', handleCopy);
        
        // Add touch event for better mobile support
        if (isMobile) {
            copyBtn.addEventListener('touchend', handleCopy);
        }

        // Style the pre element to position the button
        pre.style.position = 'relative';
        pre.appendChild(copyBtn);
    });
}

function addReadingProgress() {
    const article = document.querySelector('article');
    if (!article) return;

    const updateProgress = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const articleRect = article.getBoundingClientRect();
        const articleTop = article.offsetTop;
        const articleHeight = article.offsetHeight;
        const windowHeight = window.innerHeight;

        // Calculate how much of the article has been scrolled past
        const articleScrolled = Math.max(0, scrollTop - articleTop);

        // Total scrollable distance within the article
        const maxScroll = Math.max(1, articleHeight - windowHeight);

        // Calculate percentage
        let scrollPercent = (articleScrolled / maxScroll) * 100;

        // Clamp between 0 and 100
        scrollPercent = Math.min(Math.max(scrollPercent, 0), 100);

        document.documentElement.style.setProperty('--scroll-progress', `${scrollPercent}%`);
    };

    window.addEventListener('scroll', updateProgress);
    window.addEventListener('resize', updateProgress);
    updateProgress();
}

function generateTableOfContents(container) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

    if (headings.length < 3) return; // Only generate TOC if there are enough headings

    // Remove any existing table of contents
    const existingToc = container.querySelector('.table-of-contents');
    if (existingToc) {
        existingToc.remove();
    }

    const toc = document.createElement('nav');
    toc.className = 'table-of-contents';
    toc.setAttribute('role', 'navigation');
    toc.setAttribute('aria-label', 'Table of Contents');
    
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    
    const tocTitle = document.createElement('h3');
    tocTitle.textContent = '📑 Table of Contents';
    tocHeader.appendChild(tocTitle);
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toc-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    toggleBtn.setAttribute('aria-label', 'Toggle table of contents');
    tocHeader.appendChild(toggleBtn);
    
    toc.appendChild(tocHeader);

    const tocList = document.createElement('ul');
    tocList.style.display = 'flex';
    tocList.style.flexDirection = 'column';
    tocList.style.gap = '0.5rem';
    toc.appendChild(tocList);

    headings.forEach((heading, index) => {
        const id = heading.id || `heading-${index}`;
        heading.id = id;

        const listItem = document.createElement('li');
        listItem.className = `toc-${heading.tagName.toLowerCase()}`;
        listItem.style.display = 'block';
        listItem.style.width = '100%';

        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = heading.textContent.replace(/^[📚📖📄🔗]\s*/, ''); // Remove emoji prefixes
        link.style.display = 'block';

        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });

    // Toggle functionality
    const toggleToc = () => {
        toc.classList.toggle('collapsed');
        toggleBtn.innerHTML = toc.classList.contains('collapsed') 
            ? '<i class="fas fa-chevron-down"></i>' 
            : '<i class="fas fa-chevron-up"></i>';
    };

    // Make both the toggle button and header clickable
    toggleBtn.addEventListener('click', toggleToc);
    tocHeader.addEventListener('click', (e) => {
        // Only toggle if clicking the header itself or the button
        if (e.target === tocHeader || e.target === tocTitle || e.target.closest('.toc-toggle')) {
            toggleToc();
        }
    });

    // Add cursor pointer to header
    tocHeader.style.cursor = 'pointer';
    tocTitle.style.cursor = 'pointer';

    // Check if mobile and collapse by default
    if (window.innerWidth <= 768) {
        toc.classList.add('collapsed');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }

    // Always insert TOC at the beginning of the container
    container.insertBefore(toc, container.firstChild);
}

function addSmoothScrolling(container) {
    container.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerOffset = 80; // Adjust this value based on your header height
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Add focus outline for accessibility
                targetElement.focus({ preventScroll: true });
            }
        }
    });
}

function addImageZoom(container) {
    const images = container.querySelectorAll('img');
    const isMobile = window.innerWidth <= 768;

    images.forEach(img => {
        // Skip if image is already in a link
        if (img.closest('a')) return;

        const handleImageClick = () => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'image-zoom-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Zoomed image view');

            // Create zoomed image
            const zoomedImg = img.cloneNode();
            zoomedImg.className = 'zoomed-image';
            zoomedImg.alt = img.alt || 'Zoomed image';

            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'zoom-close-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.setAttribute('aria-label', 'Close zoomed image');
            
            const closeOverlay = () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            };
            
            closeBtn.onclick = closeOverlay;

            overlay.appendChild(zoomedImg);
            overlay.appendChild(closeBtn);
            document.body.appendChild(overlay);

            // Prevent body scroll on mobile
            if (isMobile) {
                document.body.style.overflow = 'hidden';
            }

            // Close on overlay click (but not on image click)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeOverlay();
                    if (isMobile) {
                        document.body.style.overflow = '';
                    }
                }
            });

            // Close on escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeOverlay();
                    if (isMobile) {
                        document.body.style.overflow = '';
                    }
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);

            // Focus trap for accessibility
            closeBtn.focus();

            // Swipe to close on mobile
            if (isMobile) {
                let touchStartY = 0;
                let touchEndY = 0;

                overlay.addEventListener('touchstart', (e) => {
                    touchStartY = e.changedTouches[0].screenY;
                }, { passive: true });

                overlay.addEventListener('touchend', (e) => {
                    touchEndY = e.changedTouches[0].screenY;
                    const swipeDistance = touchStartY - touchEndY;
                    
                    // Swipe down to close (at least 50px)
                    if (swipeDistance < -50) {
                        closeOverlay();
                        document.body.style.overflow = '';
                    }
                });
            }
        };

        img.addEventListener('click', handleImageClick);

        img.style.cursor = 'zoom-in';
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', `Click to zoom: ${img.alt || 'image'}`);

        // Allow keyboard activation
        img.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleImageClick();
            }
        });

        // Touch-friendly on mobile
        if (isMobile) {
            img.style.touchAction = 'manipulation';
        }
    });
}