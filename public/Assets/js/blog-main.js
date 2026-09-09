/**
 * MBK Blog - Core Frontend JavaScript
 * Handles navbar, mobile menu drawer, scroll effects, and user authentication helpers.
 */

// Helper to read cookies (globally accessible)
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
}
window.getCookie = getCookie;

// User Profile Picture Hydration from Cookie (For Logged-in User in Navbar & Current User Badge)
function hydrateUserAvatars() {
    const cookiePp = getCookie('profile_image_url');
    if (!cookiePp || cookiePp === 'default') return;

    // Update ONLY navbar avatar and current user badge elements
    document.querySelectorAll('.user-nav-avatar img.user-cookie-avatar, .user-nav-avatar, [data-current-user="true"]').forEach(el => {
        if (el.tagName === 'IMG') {
            el.src = cookiePp;
        } else {
            el.innerHTML = `<img src="${cookiePp}" alt="User Avatar" style="width:100%;height:100%;object-fit:cover;" class="user-cookie-avatar">`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    hydrateUserAvatars();

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileMenuBtn.innerHTML = mobileMenu.classList.contains('active')
                ? '<i class="fas fa-times"></i>'
                : '<i class="fas fa-bars"></i>';
        });

        // Close mobile menu when clicking a link
        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }

    // Header Scroll Shadow (Throttled)
    let headerTicking = false;
    window.addEventListener('scroll', () => {
        if (!headerTicking) {
            window.requestAnimationFrame(() => {
                const header = document.querySelector('header');
                if (header) {
                    if (window.scrollY > 20) {
                        header.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.06)';
                        header.style.background = 'rgba(255, 255, 255, 0.95)';
                    } else {
                        header.style.boxShadow = 'none';
                        header.style.background = 'rgba(255, 255, 255, 0.88)';
                    }
                }
                headerTicking = false;
            });
            headerTicking = true;
        }
    }, { passive: true });
});
