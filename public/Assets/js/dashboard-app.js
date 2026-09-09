/**
 * MBK Blog Admin - Unified Interactive Script
 * Handles Command Palette (Ctrl+K), Toast Notifications, Modals, Keyboard Shortcuts, and UI Interactions.
 */

(function () {
    'use strict';

    // --- 1. TOAST NOTIFICATIONS ---
    window.showToast = function ({ type = 'info', title = '', message = '', duration = 4000 }) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-msg ${type}`;

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-circle'
        };

        const iconClass = iconMap[type] || 'fa-info-circle';

        toast.innerHTML = `
            <i class="fas ${iconClass} toast-icon"></i>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-desc">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(50px)';
                    setTimeout(() => toast.remove(), 250);
                }
            }, duration);
        }
    };

    // --- 2. CONFIRMATION MODAL ---
    window.showConfirm = function ({
        title = 'Are you sure?',
        message = 'This action cannot be undone.',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        isDestructive = false,
        onConfirm = () => {}
    }) {
        const backdrop = document.getElementById('globalConfirmBackdrop');
        if (!backdrop) return;

        const titleEl = document.getElementById('globalConfirmTitle');
        const descEl = document.getElementById('globalConfirmDesc');
        const confirmBtn = document.getElementById('globalConfirmBtn');
        const cancelBtn = document.getElementById('globalCancelBtn');
        const iconWrap = document.getElementById('globalConfirmIconWrap');

        titleEl.textContent = title;
        descEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        if (isDestructive) {
            confirmBtn.className = 'btn btn-danger';
            iconWrap.className = 'confirm-icon-wrap danger';
            iconWrap.innerHTML = '<i class="fas fa-trash-alt"></i>';
        } else {
            confirmBtn.className = 'btn btn-primary';
            iconWrap.className = 'confirm-icon-wrap primary';
            iconWrap.innerHTML = '<i class="fas fa-question-circle"></i>';
        }

        backdrop.classList.add('active');

        const cleanup = () => {
            backdrop.classList.remove('active');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
            cleanup();
            onConfirm();
        };

        cancelBtn.onclick = cleanup;
    };

    // --- 3. COMMAND PALETTE (Ctrl + K / Cmd + K) ---
    function initCommandPalette() {
        const backdrop = document.getElementById('cmdPaletteBackdrop');
        const input = document.getElementById('cmdPaletteInput');
        const results = document.getElementById('cmdPaletteResults');
        const triggers = document.querySelectorAll('.cmd-palette-trigger');

        if (!backdrop || !input || !results) return;

        const defaultActions = [
            { icon: 'fa-plus', title: 'Create New Post', desc: 'Open post editor', url: '/dashboard/posts/create', group: 'Quick Actions' },
            { icon: 'fa-newspaper', title: 'Manage Posts', desc: 'View all posts, drafts & filters', url: '/dashboard/posts', group: 'Navigation' },
            { icon: 'fa-comments', title: 'Moderate Comments', desc: 'Review pending & approved comments', url: '/dashboard/comments', group: 'Navigation' },
            { icon: 'fa-folder', title: 'Categories', desc: 'Manage blog categories', url: '/dashboard/categories', group: 'Navigation' },
            { icon: 'fa-tags', title: 'Tags', desc: 'Manage content tags', url: '/dashboard/tags', group: 'Navigation' },
            { icon: 'fa-chart-pie', title: 'Analytics', desc: 'Traffic & views insights', url: '/dashboard/analytics', group: 'Navigation' },
            { icon: 'fa-globe', title: 'SEO Health & Sitemaps', desc: 'Audit SEO & regenerate sitemaps', url: '/dashboard/seo', group: 'Navigation' },
            { icon: 'fa-history', title: 'Activity Audit Log', desc: 'View system audit timeline', url: '/dashboard/activity', group: 'Navigation' },
            { icon: 'fa-cog', title: 'Settings', desc: 'Site & storage configuration', url: '/dashboard/settings', group: 'Navigation' },
            { icon: 'fa-external-link-alt', title: 'Visit Public Blog', desc: 'Open public website', url: '/', group: 'Navigation' }
        ];

        let selectedIndex = 0;
        let currentItems = [];

        function renderItems(items) {
            currentItems = items;
            selectedIndex = 0;
            results.innerHTML = '';

            if (items.length === 0) {
                results.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fas fa-search" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>No matching results found</div>';
                return;
            }

            // Group by group
            const groups = {};
            items.forEach((item, idx) => {
                const g = item.group || 'Results';
                if (!groups[g]) groups[g] = [];
                groups[g].push({ ...item, originalIndex: idx });
            });

            for (const [groupName, groupList] of Object.entries(groups)) {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'cmd-group-title';
                groupTitle.textContent = groupName;
                results.appendChild(groupTitle);

                groupList.forEach(item => {
                    const row = document.createElement('div');
                    row.className = `cmd-item ${item.originalIndex === selectedIndex ? 'active' : ''}`;
                    row.dataset.index = item.originalIndex;
                    row.innerHTML = `
                        <i class="fas ${item.icon}"></i>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">${item.title}</div>
                            ${item.desc ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${item.desc}</div>` : ''}
                        </div>
                        ${item.meta ? `<div class="cmd-item-meta">${item.meta}</div>` : ''}
                    `;

                    row.addEventListener('click', () => {
                        window.location.href = item.url;
                    });

                    results.appendChild(row);
                });
            }
        }

        function openPalette() {
            backdrop.classList.add('active');
            input.value = '';
            renderItems(defaultActions);
            setTimeout(() => input.focus(), 50);
        }

        function closePalette() {
            backdrop.classList.remove('active');
        }

        triggers.forEach(t => t.addEventListener('click', openPalette));

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePalette();
        });

        let searchDebounce = null;
        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            clearTimeout(searchDebounce);

            if (!query) {
                renderItems(defaultActions);
                return;
            }

            // Local filter on default actions
            const localMatches = defaultActions.filter(a =>
                a.title.toLowerCase().includes(query) || a.desc?.toLowerCase().includes(query)
            );

            searchDebounce = setTimeout(async () => {
                try {
                    const res = await fetch(`/dashboard/api/global-search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();

                    const dynamicItems = [...localMatches];

                    if (data.posts && data.posts.length > 0) {
                        data.posts.forEach(p => {
                            dynamicItems.push({
                                icon: 'fa-file-alt',
                                title: p.title,
                                desc: `Status: ${p.status}`,
                                url: `/dashboard/posts/edit/${p.id}`,
                                group: 'Posts',
                                meta: 'Edit Post'
                            });
                        });
                    }

                    if (data.categories && data.categories.length > 0) {
                        data.categories.forEach(c => {
                            dynamicItems.push({
                                icon: 'fa-folder',
                                title: c.name,
                                desc: 'Category',
                                url: `/dashboard/posts?category=${encodeURIComponent(c.name)}`,
                                group: 'Categories',
                                meta: 'View Posts'
                            });
                        });
                    }

                    renderItems(dynamicItems);
                } catch (e) {
                    renderItems(localMatches);
                }
            }, 180);
        });

        // Key navigation
        document.addEventListener('keydown', (e) => {
            // Open on Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (backdrop.classList.contains('active')) {
                    closePalette();
                } else {
                    openPalette();
                }
                return;
            }

            if (!backdrop.classList.contains('active')) return;

            if (e.key === 'Escape') {
                closePalette();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentItems.length > 0) {
                    selectedIndex = (selectedIndex + 1) % currentItems.length;
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentItems.length > 0) {
                    selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentItems[selectedIndex]) {
                    window.location.href = currentItems[selectedIndex].url;
                }
            }
        });

        function updateActiveItem() {
            const itemEls = results.querySelectorAll('.cmd-item');
            itemEls.forEach(el => {
                if (parseInt(el.dataset.index) === selectedIndex) {
                    el.classList.add('active');
                    el.scrollIntoView({ block: 'nearest' });
                } else {
                    el.classList.remove('active');
                }
            });
        }
    }

    // --- 4. SIDEBAR MOBILE TOGGLE ---
    function initSidebarToggle() {
        const toggleBtn = document.getElementById('mobileSidebarToggle');
        const sidebar = document.getElementById('adminSidebar');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            });
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        initCommandPalette();
        initSidebarToggle();
    });
})();
