(function() {
    'use strict';

    class CheminationsLogoAnimation {
        constructor(stage, canvas, word) {
            this.stage = stage;
            this.canvas = canvas;
            this.word = word;
            this.context = canvas.getContext('2d');
            this.link = stage.closest('a');
            this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.cycleDuration = 10000;
            this.startTime = performance.now();
            this.animationFrame = null;
            this.isInteractionPaused = false;
            this.render = this.render.bind(this);
            this.handleResize = this.resize.bind(this);
            this.handleMotionChange = this.updateMotionPreference.bind(this);
            this.handleVisibilityChange = this.updateVisibility.bind(this);

            this.bindEvents();
            this.resize();
            this.updateMotionPreference();
        }

        bindEvents() {
            window.addEventListener('resize', this.handleResize, { passive: true });
            document.addEventListener('visibilitychange', this.handleVisibilityChange);

            if (this.link) {
                this.link.addEventListener('pointerenter', () => this.pauseForInteraction());
                this.link.addEventListener('pointerleave', () => this.resumeAfterInteraction());
                this.link.addEventListener('focus', () => this.pauseForInteraction());
                this.link.addEventListener('blur', () => this.resumeAfterInteraction());
            }

            if (typeof this.motionQuery.addEventListener === 'function') {
                this.motionQuery.addEventListener('change', this.handleMotionChange);
            } else if (typeof this.motionQuery.addListener === 'function') {
                this.motionQuery.addListener(this.handleMotionChange);
            }
        }

        resize() {
            const bounds = this.stage.getBoundingClientRect();
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 4);

            this.canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
            this.canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
            this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            this.width = bounds.width;
            this.height = bounds.height;
            this.readColors();

            if (this.motionQuery.matches || this.isInteractionPaused) {
                this.showWordmark();
            }
        }

        readColors() {
            const stageStyles = getComputedStyle(this.stage);
            const bodyStyles = getComputedStyle(document.body);

            this.colors = {
                coral: stageStyles.getPropertyValue('--cheminations-logo-coral').trim() || '#f56565',
                indigo: stageStyles.getPropertyValue('--cheminations-logo-indigo').trim() || '#667eea',
                line: stageStyles.getPropertyValue('--cheminations-logo-line').trim() || 'rgba(210, 215, 217, 0.75)',
                surface: bodyStyles.backgroundColor || '#ffffff'
            };
        }

        updateMotionPreference() {
            this.stop();

            if (this.motionQuery.matches) {
                this.showWordmark();
                return;
            }

            this.startTime = performance.now();
            this.animationFrame = window.requestAnimationFrame(this.render);
        }

        updateVisibility() {
            if (document.hidden) {
                this.stop();
            } else if (!this.motionQuery.matches && !this.isInteractionPaused) {
                this.startTime = performance.now();
                this.animationFrame = window.requestAnimationFrame(this.render);
            }
        }

        pauseForInteraction() {
            this.isInteractionPaused = true;
            this.stop();
            this.showWordmark();
        }

        resumeAfterInteraction() {
            this.isInteractionPaused = false;

            if (!this.motionQuery.matches && !document.hidden) {
                this.startTime = performance.now();
                this.animationFrame = window.requestAnimationFrame(this.render);
            }
        }

        stop() {
            if (this.animationFrame) {
                window.cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
        }

        showWordmark() {
            this.context.clearRect(0, 0, this.width || 0, this.height || 0);
            this.word.style.opacity = '1';
            this.word.style.transform = 'translateY(0) scale(1)';
        }

        clamp(value, minimum = 0, maximum = 1) {
            return Math.min(maximum, Math.max(minimum, value));
        }

        smoothstep(value) {
            const normalized = this.clamp(value);
            return normalized * normalized * (3 - (2 * normalized));
        }

        fadeInOut(progress, fadeInStart, visibleStart, visibleEnd, fadeOutEnd) {
            if (progress < fadeInStart || progress > fadeOutEnd) {
                return 0;
            }

            if (progress < visibleStart) {
                return this.smoothstep((progress - fadeInStart) / (visibleStart - fadeInStart));
            }

            if (progress <= visibleEnd) {
                return 1;
            }

            return 1 - this.smoothstep((progress - visibleEnd) / (fadeOutEnd - visibleEnd));
        }

        updateWordmark(progress) {
            let opacity = 0;

            if (progress <= 0.36 || progress >= 0.89) {
                opacity = 1;
            } else if (progress < 0.42) {
                opacity = 1 - this.smoothstep((progress - 0.36) / 0.06);
            } else if (progress > 0.83) {
                opacity = this.smoothstep((progress - 0.83) / 0.06);
            }

            this.word.style.opacity = opacity.toFixed(3);
            this.word.style.transform = `translateY(${(-4 * (1 - opacity)).toFixed(2)}px) scale(${(0.98 + (0.02 * opacity)).toFixed(3)})`;
        }

        rotateVector(vector, angle) {
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);

            return {
                x: (vector.x * cosine) - (vector.y * sine),
                y: (vector.x * sine) + (vector.y * cosine)
            };
        }

        getMovingAtom(center, vector, phase, index) {
            const stretchStrengths = [0.12, 0.1, 0.11, 0.12];
            const bendStrengths = [0.085, 0.1, 0.09, 0.11];
            const oscillation = (phase * Math.PI * 4) + (index * 1.35);
            const stretch = 1 + (Math.sin(oscillation) * stretchStrengths[index]);
            const bend = Math.sin((phase * Math.PI * 3) + (index * 0.9)) * bendStrengths[index];
            const rotated = this.rotateVector(vector, bend);

            return {
                x: center.x + (rotated.x * stretch),
                y: center.y + (rotated.y * stretch)
            };
        }

        drawLineBond(context, center, atom) {
            context.beginPath();
            context.moveTo(center.x, center.y);
            context.lineTo(atom.x, atom.y);
            context.stroke();
        }

        drawSolidWedge(context, center, atom) {
            const dx = atom.x - center.x;
            const dy = atom.y - center.y;
            const length = Math.hypot(dx, dy) || 1;
            const perpendicularX = (-dy / length) * 4.5;
            const perpendicularY = (dx / length) * 4.5;

            context.beginPath();
            context.moveTo(center.x, center.y);
            context.lineTo(atom.x + perpendicularX, atom.y + perpendicularY);
            context.lineTo(atom.x - perpendicularX, atom.y - perpendicularY);
            context.closePath();
            context.fill();
        }

        drawHashedWedge(context, center, atom) {
            const dx = atom.x - center.x;
            const dy = atom.y - center.y;
            const length = Math.hypot(dx, dy) || 1;
            const unitPerpendicularX = -dy / length;
            const unitPerpendicularY = dx / length;

            for (let index = 1; index <= 5; index += 1) {
                const ratio = index / 6;
                const halfWidth = ratio * 4.5;
                const x = center.x + (dx * ratio);
                const y = center.y + (dy * ratio);

                context.beginPath();
                context.moveTo(x - (unitPerpendicularX * halfWidth), y - (unitPerpendicularY * halfWidth));
                context.lineTo(x + (unitPerpendicularX * halfWidth), y + (unitPerpendicularY * halfWidth));
                context.stroke();
            }
        }

        drawAtom(context, atom, radius, strokeColor) {
            context.save();
            context.fillStyle = this.colors.surface;
            context.strokeStyle = strokeColor;
            context.lineWidth = 1.6;
            context.beginPath();
            context.arc(atom.x, atom.y, radius, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.restore();
        }

        drawMolecule(progress, opacity) {
            const context = this.context;
            const phase = this.clamp((progress - 0.42) / 0.22);
            const scale = Math.min(this.width / 175, this.height / 54);
            const center = { x: this.width * 0.5, y: this.height * 0.52 };
            const vectors = [
                { x: 0, y: -22 * scale },
                { x: -29 * scale, y: -14 * scale },
                { x: -31 * scale, y: 17 * scale },
                { x: 32 * scale, y: 18 * scale }
            ];
            const atoms = vectors.map((vector, index) => this.getMovingAtom(center, vector, phase, index));

            context.save();
            context.globalAlpha = opacity;
            context.strokeStyle = this.colors.indigo;
            context.fillStyle = this.colors.indigo;
            context.lineCap = 'round';
            context.lineWidth = 1.5;

            this.drawLineBond(context, center, atoms[0]);
            this.drawLineBond(context, center, atoms[1]);
            this.drawSolidWedge(context, center, atoms[2]);
            this.drawHashedWedge(context, center, atoms[3]);

            atoms.forEach((atom, index) => {
                this.drawAtom(context, atom, 3.25 * scale, index === 3 ? this.colors.coral : this.colors.indigo);
            });

            const centerPulse = 1 + (Math.sin(phase * Math.PI * 5) * 0.12);
            context.fillStyle = this.colors.indigo;
            context.beginPath();
            context.arc(center.x, center.y, 4.8 * scale * centerPulse, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }

        gaussian(value, center, width, height) {
            const distance = (value - center) / width;
            return height * Math.exp(-0.5 * distance * distance);
        }

        getRamanSignal(position) {
            const peaks = [
                [0.14, 0.013, 0.28],
                [0.24, 0.007, 0.78],
                [0.38, 0.014, 0.36],
                [0.45, 0.009, 0.65],
                [0.51, 0.012, 0.32],
                [0.63, 0.014, 0.22],
                [0.74, 0.01, 0.52],
                [0.88, 0.015, 0.27]
            ];
            let signal = 0;

            peaks.forEach((peak) => {
                signal += this.gaussian(position, peak[0], peak[1], peak[2]);
            });

            signal += Math.sin(position * 88) * 0.012;
            signal += Math.sin((position * 197) + 0.7) * 0.008;
            return Math.max(0, signal);
        }

        drawSpectrum(progress, opacity) {
            const context = this.context;
            const drawProgress = this.smoothstep((progress - 0.66) / 0.14);
            const endX = this.width * this.clamp(drawProgress);
            const baseline = this.height * 0.84;
            const amplitude = this.height * 0.78;

            context.save();
            context.globalAlpha = opacity;
            context.strokeStyle = this.colors.line;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(0, baseline);
            context.lineTo(this.width, baseline);
            context.stroke();

            context.strokeStyle = this.colors.coral;
            context.lineWidth = 1.8;
            context.lineJoin = 'round';
            context.lineCap = 'round';
            context.beginPath();

            for (let x = 0; x <= endX; x += 1) {
                const position = x / this.width;
                const y = baseline - (this.getRamanSignal(position) * amplitude);

                if (x === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }

            context.stroke();

            if (endX > 2 && endX < this.width - 1) {
                const scanY = baseline - (this.getRamanSignal(endX / this.width) * amplitude);
                context.fillStyle = this.colors.indigo;
                context.beginPath();
                context.arc(endX, scanY, 2.4, 0, Math.PI * 2);
                context.fill();
            }

            context.restore();
        }

        render(timestamp) {
            if (this.motionQuery.matches || this.isInteractionPaused || document.hidden) {
                return;
            }

            const progress = ((timestamp - this.startTime) % this.cycleDuration) / this.cycleDuration;
            const moleculeOpacity = this.fadeInOut(progress, 0.38, 0.43, 0.59, 0.64);
            const spectrumOpacity = this.fadeInOut(progress, 0.61, 0.66, 0.82, 0.87);

            this.context.clearRect(0, 0, this.width, this.height);
            this.updateWordmark(progress);

            if (moleculeOpacity > 0) {
                this.drawMolecule(progress, moleculeOpacity);
            }

            if (spectrumOpacity > 0) {
                this.drawSpectrum(progress, spectrumOpacity);
            }

            this.animationFrame = window.requestAnimationFrame(this.render);
        }
    }


    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.cheminations-logo-stage').forEach((stage) => {
            const canvas = stage.querySelector('.cheminations-logo-canvas');
            const word = stage.querySelector('.cheminations-logo-word');

            if (canvas && word) {
                stage.cheminationsLogoAnimation = new CheminationsLogoAnimation(stage, canvas, word);
            }
        });
    });
})();
