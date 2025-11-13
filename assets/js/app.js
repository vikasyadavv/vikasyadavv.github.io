/**
 * Main Application JavaScript
 * Handles general functionality, API interactions, and page-specific features
 */

class VikasYadavApp {
    constructor() {
        this.apiUrl = 'https://api.vikasyadav.live';
        this.isAuthenticated = false;
        this.currentUser = null;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.bindEvents();
        this.loadDynamicContent();
        this.initServiceWorker();
    }

    checkAuthentication() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.validateToken(token);
        }
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.apiUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.updateUIForAuthenticatedUser();
            } else {
                localStorage.removeItem('auth_token');
            }
        } catch (error) {
            console.warn('Token validation failed:', error);
            localStorage.removeItem('auth_token');
        }
    }

    bindEvents() {
        // Newsletter subscription
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => this.handleNewsletterSubscription(e));
        }

        // Search functionality
        const searchForm = document.querySelector('#search form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Mobile menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Smooth scrolling for anchor links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

        // Lazy loading images
        this.initLazyLoading();

        // Performance monitoring
        this.monitorPerformance();
    }

    async loadDynamicContent() {
        try {
            // Load latest blog posts
            await this.loadLatestPosts();
            
            // Load featured projects
            await this.loadFeaturedProjects();
            
            // Load portfolio items
            await this.loadPortfolioItems();
            
        } catch (error) {
            console.error('Failed to load dynamic content:', error);
        }
    }

    async loadLatestPosts() {
        try {
            const response = await fetch(`${this.apiUrl}/api/blog?limit=6`);
            const data = await response.json();
            
            if (data.posts && data.posts.length > 0) {
                this.renderLatestPosts(data.posts);
            }
        } catch (error) {
            console.error('Failed to load latest posts:', error);
        }
    }

    renderLatestPosts(posts) {
        const container = document.getElementById('latest-posts');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        posts.forEach(post => {
            const article = document.createElement('article');
            article.innerHTML = `
                <a href="blog/${post.slug}.html" class="image">
                    <img src="${post.featured_image || 'images/default-blog.jpg'}" alt="${post.title}" loading="lazy" />
                </a>
                <h3><a href="blog/${post.slug}.html">${post.title}</a></h3>
                <p>${post.excerpt}</p>
                <div class="meta">
                    <span class="category">${post.category}</span>
                    <span class="date">${new Date(post.published_at).toLocaleDateString()}</span>
                </div>
                <ul class="actions">
                    <li><a href="blog/${post.slug}.html" class="button">Read More</a></li>
                </ul>
            `;
            container.appendChild(article);
        });
    }

    async loadFeaturedProjects() {
        try {
            const response = await fetch(`${this.apiUrl}/api/projects?featured=true&limit=4`);
            const data = await response.json();
            
            if (data.projects && data.projects.length > 0) {
                this.renderFeaturedProjects(data.projects);
            }
        } catch (error) {
            console.error('Failed to load featured projects:', error);
        }
    }

    renderFeaturedProjects(projects) {
        const container = document.querySelector('.featured-projects');
        if (!container) return;

        container.innerHTML = '';

        projects.forEach(project => {
            const article = document.createElement('article');
            article.innerHTML = `
                <a href="projects/${project.id}.html" class="image">
                    <img src="${project.featured_image || 'images/default-project.jpg'}" alt="${project.title}" loading="lazy" />
                </a>
                <h3><a href="projects/${project.id}.html">${project.title}</a></h3>
                <p>${project.description}</p>
                <div class="technologies">
                    ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
                <ul class="actions">
                    <li><a href="projects/${project.id}.html" class="button">View Project</a></li>
                    ${project.github_url ? `<li><a href="${project.github_url}" class="button alt" target="_blank" rel="noopener">GitHub</a></li>` : ''}
                </ul>
            `;
            container.appendChild(article);
        });
    }

    async loadPortfolioItems() {
        try {
            const response = await fetch(`${this.apiUrl}/api/portfolio/featured`);
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                this.renderPortfolioItems(data.items);
            }
        } catch (error) {
            console.error('Failed to load portfolio items:', error);
        }
    }

    renderPortfolioItems(items) {
        const container = document.querySelector('.portfolio-grid');
        if (!container) return;

        container.innerHTML = '';

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'portfolio-item';
            div.innerHTML = `
                <div class="portfolio-image">
                    <img src="${item.image_url}" alt="${item.title}" loading="lazy" />
                    <div class="portfolio-overlay">
                        <h4>${item.title}</h4>
                        <p>${item.description}</p>
                        ${item.url ? `<a href="${item.url}" class="button" target="_blank" rel="noopener">View</a>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async handleNewsletterSubscription(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.email.value.trim();
        const messageEl = document.getElementById('newsletter-message');
        
        if (!email) {
            this.showMessage(messageEl, 'Please enter a valid email address.', 'error');
            return;
        }

        try {
            // Show loading state
            const submitBtn = form.querySelector('input[type="submit"]');
            const originalText = submitBtn.value;
            submitBtn.value = 'Subscribing...';
            submitBtn.disabled = true;

            // Track analytics
            if (window.Analytics) {
                window.Analytics.track('newsletter_subscription_attempt', { email });
            }

            const response = await fetch(`${this.apiUrl}/api/analytics/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event_type: 'newsletter_subscription',
                    additional_data: { email }
                })
            });

            if (response.ok) {
                this.showMessage(messageEl, '🎉 Thank you for subscribing! You\'ll receive updates about new posts and projects.', 'success');
                form.reset();
                
                // Track success
                if (window.Analytics) {
                    window.Analytics.track('newsletter_subscription_success', { email });
                }
            } else {
                throw new Error('Subscription failed');
            }

        } catch (error) {
            console.error('Newsletter subscription error:', error);
            this.showMessage(messageEl, 'Sorry, there was an error. Please try again later.', 'error');
            
            // Track error
            if (window.Analytics) {
                window.Analytics.trackError(error, { context: 'newsletter_subscription' });
            }
        } finally {
            // Reset button
            const submitBtn = form.querySelector('input[type="submit"]');
            submitBtn.value = 'Subscribe';
            submitBtn.disabled = false;
        }
    }

    async handleSearch(e) {
        e.preventDefault();
        
        const query = e.target.query.value.trim();
        if (!query) return;

        // Track search
        if (window.Analytics) {
            window.Analytics.track('search', { query });
        }

        // Implement search functionality
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }

    showMessage(element, message, type) {
        if (!element) return;
        
        element.innerHTML = `<div class="message ${type}">${message}</div>`;
        element.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    }

    updateUIForAuthenticatedUser() {
        // Update UI elements for authenticated users
        const authElements = document.querySelectorAll('.auth-required');
        authElements.forEach(el => el.style.display = 'block');
        
        const guestElements = document.querySelectorAll('.guest-only');
        guestElements.forEach(el => el.style.display = 'none');
    }

    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }

    monitorPerformance() {
        // Monitor Core Web Vitals
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                if (window.Analytics) {
                    window.Analytics.track('performance_lcp', {
                        value: lastEntry.startTime,
                        url: window.location.href
                    });
                }
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // First Input Delay
            new PerformanceObserver((entryList) => {
                const firstInput = entryList.getEntries()[0];
                
                if (window.Analytics) {
                    window.Analytics.track('performance_fid', {
                        value: firstInput.processingStart - firstInput.startTime,
                        url: window.location.href
                    });
                }
            }).observe({ entryTypes: ['first-input'], buffered: true });

            // Cumulative Layout Shift
            let clsValue = 0;
            let clsEntries = [];
            
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        clsEntries.push(entry);
                    }
                }
                
                if (window.Analytics && clsValue > 0) {
                    window.Analytics.track('performance_cls', {
                        value: clsValue,
                        url: window.location.href
                    });
                }
            }).observe({ entryTypes: ['layout-shift'], buffered: true });
        }
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    }

    // Utility methods
    async fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('auth_token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return fetch(url, {
            ...options,
            headers
        });
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.VikasYadavApp = new VikasYadavApp();
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
    
    if (window.Analytics) {
        window.Analytics.trackError(e.error, {
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno
        });
    }
});

// Handle offline/online status
window.addEventListener('online', () => {
    console.log('Connection restored');
    if (window.Analytics) {
        window.Analytics.track('connection_restored');
    }
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    if (window.Analytics) {
        window.Analytics.track('connection_lost');
    }
});
