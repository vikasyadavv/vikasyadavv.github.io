(function() {
    'use strict';

    const EMAIL_ADDRESS = 'info@cheminations.com';

    class ContactSpectrum {
        constructor(canvas, topicSelect) {
            this.canvas = canvas;
            this.context = canvas.getContext('2d');
            this.topicSelect = topicSelect;
            this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.pointerPosition = null;
            this.animationFrame = null;
            this.burstStartedAt = 0;
            this.profile = 0;
            this.profiles = {
                '': 0,
                'Research collaboration': 1,
                'AI or scientific software': 2,
                'Spectroscopy and data analysis': 3,
                'Speaking or academic opportunity': 4,
                'General conversation': 5
            };

            this.handleResize = this.resize.bind(this);
            this.handleMotionChange = this.updateMotionPreference.bind(this);
            this.render = this.render.bind(this);

            this.bindEvents();
            this.resize();
            this.updateMotionPreference();
        }

        bindEvents() {
            window.addEventListener('resize', this.handleResize, { passive: true });

            this.canvas.addEventListener('pointermove', (event) => {
                const bounds = this.canvas.getBoundingClientRect();
                this.pointerPosition = (event.clientX - bounds.left) / bounds.width;
            });

            this.canvas.addEventListener('pointerleave', () => {
                this.pointerPosition = null;
            });

            if (this.topicSelect) {
                this.topicSelect.addEventListener('change', () => {
                    this.profile = this.profiles[this.topicSelect.value] || 0;
                    if (this.motionQuery.matches) {
                        this.draw(0);
                    }
                });
            }

            if (typeof this.motionQuery.addEventListener === 'function') {
                this.motionQuery.addEventListener('change', this.handleMotionChange);
            } else if (typeof this.motionQuery.addListener === 'function') {
                this.motionQuery.addListener(this.handleMotionChange);
            }
        }

        updateMotionPreference() {
            if (this.animationFrame) {
                window.cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            if (this.motionQuery.matches) {
                this.draw(0);
            } else {
                this.animationFrame = window.requestAnimationFrame(this.render);
            }
        }

        resize() {
            const bounds = this.canvas.getBoundingClientRect();
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

            this.canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
            this.canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
            this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            this.width = bounds.width;
            this.height = bounds.height;
            this.draw(0);
        }

        gaussian(x, center, width, height) {
            const distance = (x - center) / width;
            return height * Math.exp(-0.5 * distance * distance);
        }

        getSignal(x, time) {
            const profiles = [
                [[0.16, 0.018, 0.22], [0.34, 0.025, 0.46], [0.57, 0.015, 0.72], [0.77, 0.03, 0.38]],
                [[0.12, 0.018, 0.3], [0.29, 0.022, 0.62], [0.48, 0.014, 0.42], [0.69, 0.018, 0.76], [0.86, 0.025, 0.34]],
                [[0.2, 0.028, 0.38], [0.41, 0.016, 0.78], [0.56, 0.022, 0.35], [0.74, 0.014, 0.64]],
                [[0.13, 0.012, 0.28], [0.26, 0.017, 0.52], [0.39, 0.011, 0.72], [0.51, 0.013, 0.4], [0.66, 0.012, 0.82], [0.81, 0.018, 0.5]],
                [[0.18, 0.035, 0.33], [0.45, 0.024, 0.58], [0.72, 0.032, 0.7]],
                [[0.14, 0.022, 0.36], [0.32, 0.018, 0.55], [0.52, 0.03, 0.48], [0.75, 0.02, 0.68], [0.9, 0.016, 0.3]]
            ];

            const selectedProfile = profiles[this.profile] || profiles[0];
            let signal = 0.025;

            selectedProfile.forEach((peak, index) => {
                const drift = Math.sin((time * 0.00035) + index) * 0.0025;
                signal += this.gaussian(x, peak[0] + drift, peak[1], peak[2]);
            });

            signal += Math.sin((x * 42) + (time * 0.0012)) * 0.008;

            if (this.pointerPosition !== null) {
                signal += this.gaussian(x, this.pointerPosition, 0.045, 0.1);
            }

            return Math.min(signal, 0.92);
        }

        drawGrid() {
            const context = this.context;
            context.save();
            context.strokeStyle = 'rgba(102, 126, 234, 0.08)';
            context.lineWidth = 1;

            for (let x = 0; x <= this.width; x += this.width / 8) {
                context.beginPath();
                context.moveTo(x, 18);
                context.lineTo(x, this.height - 18);
                context.stroke();
            }

            for (let y = 22; y <= this.height - 18; y += (this.height - 40) / 4) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(this.width, y);
                context.stroke();
            }

            context.restore();
        }

        drawBurst(time) {
            if (!this.burstStartedAt) {
                return;
            }

            const elapsed = time - this.burstStartedAt;
            if (elapsed > 950) {
                this.burstStartedAt = 0;
                return;
            }

            const progress = elapsed / 950;
            const context = this.context;
            context.save();
            context.globalAlpha = 1 - progress;
            context.strokeStyle = '#f56565';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(this.width * 0.82, this.height * 0.35, 8 + (progress * 48), 0, Math.PI * 2);
            context.stroke();
            context.restore();
        }

        draw(time) {
            if (!this.width || !this.height) {
                return;
            }

            const context = this.context;
            const baseline = this.height - 34;
            const usableHeight = this.height - 58;

            context.clearRect(0, 0, this.width, this.height);
            this.drawGrid();

            const gradient = context.createLinearGradient(0, 0, this.width, 0);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.58, '#f56565');
            gradient.addColorStop(1, '#df4d4d');

            context.save();
            context.strokeStyle = gradient;
            context.lineWidth = 2.25;
            context.lineJoin = 'round';
            context.lineCap = 'round';
            context.shadowBlur = 10;
            context.shadowColor = 'rgba(245, 101, 101, 0.2)';
            context.beginPath();

            for (let pixel = 0; pixel <= this.width; pixel += 2) {
                const normalizedX = pixel / this.width;
                const signal = this.getSignal(normalizedX, time);
                const y = baseline - (signal * usableHeight);

                if (pixel === 0) {
                    context.moveTo(pixel, y);
                } else {
                    context.lineTo(pixel, y);
                }
            }

            context.stroke();
            context.restore();
            this.drawBurst(time);
        }

        render(time) {
            this.draw(time);
            this.animationFrame = window.requestAnimationFrame(this.render);
        }

        sendPulse() {
            this.burstStartedAt = performance.now();
            if (this.motionQuery.matches) {
                this.draw(this.burstStartedAt + 450);
            }
        }
    }

    function initializeRevealAnimations() {
        const elements = document.querySelectorAll('.reveal');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reducedMotion || !('IntersectionObserver' in window)) {
            elements.forEach((element) => element.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.14,
            rootMargin: '0px 0px -30px'
        });

        elements.forEach((element, index) => {
            element.style.transitionDelay = `${Math.min(index * 70, 210)}ms`;
            observer.observe(element);
        });
    }

    function initializeContactForm(spectrum) {
        const form = document.getElementById('contact-form');
        const status = document.getElementById('contact-status');

        if (!form) {
            return;
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            if (!form.reportValidity()) {
                return;
            }

            const formData = new FormData(form);
            const name = String(formData.get('name') || '').trim();
            const senderEmail = String(formData.get('email') || '').trim();
            const topic = String(formData.get('topic') || '').trim();
            const message = String(formData.get('message') || '').trim();
            const subject = `${topic} — message from ${name}`;
            const body = [
                'Hi Vikas,',
                '',
                message,
                '',
                '—',
                `Name: ${name}`,
                `Email: ${senderEmail}`,
                `Topic: ${topic}`,
                'Sent from: cheminations.com/contact.html'
            ].join('\n');
            const mailtoUrl = `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            if (status) {
                status.textContent = `Opening your email app with a message addressed to ${EMAIL_ADDRESS}.`;
                status.classList.add('is-visible');
            }

            if (spectrum) {
                spectrum.sendPulse();
            }

            window.setTimeout(() => {
                window.location.href = mailtoUrl;
            }, 180);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('contact-spectrum');
        const topicSelect = document.getElementById('contact-topic');
        const spectrum = canvas ? new ContactSpectrum(canvas, topicSelect) : null;

        initializeRevealAnimations();
        initializeContactForm(spectrum);
    });
})();
