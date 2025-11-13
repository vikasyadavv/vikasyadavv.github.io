/**
 * Analytics Tracking System
 * Handles user interaction tracking and analytics data collection
 */

class Analytics {
    constructor() {
        this.apiUrl = '';
        this.sessionId = this.generateSessionId();
        this.autoTrack = false;
        this.queue = [];
        this.isOnline = navigator.onLine;
        
        // Bind event listeners
        this.bindEvents();
    }

    init(config = {}) {
        this.apiUrl = config.apiUrl || 'https://api.vikasyadav.live';
        this.autoTrack = config.autoTrack || false;
        
        if (this.autoTrack) {
            this.startAutoTracking();
        }
        
        // Process queued events
        this.processQueue();
        
        console.log('Analytics initialized', { apiUrl: this.apiUrl, sessionId: this.sessionId });
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    bindEvents() {
        // Online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });

        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.track('page_hidden');
            } else {
                this.track('page_visible');
            }
        });

        // Page unload
        window.addEventListener('beforeunload', () => {
            this.track('page_unload');
            this.flush();
        });
    }

    startAutoTracking() {
        // Track page view
        this.track('page_view', {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer
        });

        // Track clicks on important elements
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Track button clicks
            if (target.tagName === 'BUTTON' || target.classList.contains('button')) {
                this.track('button_click', {
                    text: target.textContent.trim(),
                    class: target.className,
                    id: target.id
                });
            }
            
            // Track link clicks
            if (target.tagName === 'A') {
                this.track('link_click', {
                    href: target.href,
                    text: target.textContent.trim(),
                    external: target.hostname !== window.location.hostname
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            this.track('form_submit', {
                id: form.id,
                action: form.action,
                method: form.method
            });
        });

        // Track scroll depth
        let maxScrollDepth = 0;
        window.addEventListener('scroll', this.throttle(() => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                
                // Track milestones
                if (scrollPercent >= 25 && maxScrollDepth < 25) {
                    this.track('scroll_depth', { depth: 25 });
                } else if (scrollPercent >= 50 && maxScrollDepth < 50) {
                    this.track('scroll_depth', { depth: 50 });
                } else if (scrollPercent >= 75 && maxScrollDepth < 75) {
                    this.track('scroll_depth', { depth: 75 });
                } else if (scrollPercent >= 90 && maxScrollDepth < 90) {
                    this.track('scroll_depth', { depth: 90 });
                }
            }
        }, 500));

        // Track time on page
        let startTime = Date.now();
        setInterval(() => {
            const timeOnPage = Math.round((Date.now() - startTime) / 1000);
            if (timeOnPage % 30 === 0) { // Every 30 seconds
                this.track('time_on_page', { seconds: timeOnPage });
            }
        }, 1000);
    }

    track(eventType, data = {}) {
        const event = {
            event_type: eventType,
            page_url: window.location.href,
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            additional_data: {
                ...data,
                user_agent: navigator.userAgent,
                screen_resolution: `${screen.width}x${screen.height}`,
                viewport_size: `${window.innerWidth}x${window.innerHeight}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };

        if (this.isOnline && this.apiUrl) {
            this.sendEvent(event);
        } else {
            this.queue.push(event);
        }
    }

    async sendEvent(event) {
        try {
            await fetch(`${this.apiUrl}/api/analytics/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify(event)
            });
        } catch (error) {
            console.warn('Analytics tracking failed:', error);
            this.queue.push(event);
        }
    }

    processQueue() {
        if (!this.isOnline || !this.apiUrl || this.queue.length === 0) {
            return;
        }

        const events = [...this.queue];
        this.queue = [];

        events.forEach(event => this.sendEvent(event));
    }

    flush() {
        if (this.queue.length > 0 && this.isOnline && this.apiUrl) {
            // Use sendBeacon for reliable sending on page unload
            navigator.sendBeacon(
                `${this.apiUrl}/api/analytics/track`,
                JSON.stringify({
                    events: this.queue,
                    session_id: this.sessionId
                })
            );
        }
    }

    // Utility function to throttle events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Custom event tracking methods
    trackCustomEvent(eventName, properties = {}) {
        this.track(`custom_${eventName}`, properties);
    }

    trackError(error, context = {}) {
        this.track('error', {
            message: error.message,
            stack: error.stack,
            context: context
        });
    }

    trackPerformance() {
        if ('performance' in window) {
            const timing = performance.timing;
            const navigation = performance.navigation;
            
            this.track('performance', {
                page_load_time: timing.loadEventEnd - timing.navigationStart,
                dom_ready_time: timing.domContentLoadedEventEnd - timing.navigationStart,
                first_paint: timing.responseStart - timing.navigationStart,
                navigation_type: navigation.type,
                redirect_count: navigation.redirectCount
            });
        }
    }

    // A/B Testing support
    trackExperiment(experimentName, variant) {
        this.track('experiment', {
            experiment: experimentName,
            variant: variant
        });
    }
}

// Global Analytics instance
window.Analytics = new Analytics();

// Track performance metrics when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        window.Analytics.trackPerformance();
    }, 1000);
});

// Track errors
window.addEventListener('error', (e) => {
    window.Analytics.trackError(e.error, {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    window.Analytics.trackError(new Error(e.reason), {
        type: 'unhandled_promise_rejection'
    });
});
