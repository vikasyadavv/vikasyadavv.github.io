(function() {
    'use strict';

    const pageDetails = {
        projects: {
            name: 'Projects',
            description: 'I’m organizing the work here as proper case studies—with the problem, the reasoning, and what actually came out of it.'
        },
        'ai-ml': {
            name: 'AI & Machine Learning',
            description: 'Notes and practical experiments are being shaped into something clear, useful, and worth returning to.'
        },
        'web-development': {
            name: 'Web Development',
            description: 'This space will collect the systems, interfaces, and engineering decisions behind the tools I build.'
        },
        research: {
            name: 'Research & Academia',
            description: 'I’m preparing a more thoughtful home for research notes, methods, lessons, and work that is still evolving.'
        },
        'technology-trends': {
            name: 'Technology Trends',
            description: 'A grounded look at emerging technology is coming—focused on what matters, not what is merely fashionable.'
        },
        'web-extractor': {
            name: 'Web Content Extractor',
            description: 'The extraction workflow is being refined before it becomes a public tool. Reliability comes first.'
        },
        analytics: {
            name: 'Analytics Dashboard',
            description: 'The dashboard is being assembled around useful signals and clear decisions, rather than charts for their own sake.'
        },
        'blockchain-voting': {
            name: 'Secure Voting System',
            description: 'This project page is being reviewed and rebuilt as a concise, honest case study.'
        },
        'edge-computing': {
            name: 'Edge Computing',
            description: 'This article is still being developed and will appear when the argument and examples are ready.'
        },
        'quantum-computing': {
            name: 'Quantum Computing',
            description: 'This article is being shaped into a careful introduction without the usual hype.'
        }
    };

    const parameters = new URLSearchParams(window.location.search);
    const requestedPage = parameters.get('page') || '';
    const details = pageDetails[requestedPage] || {
        name: 'This page',
        description: 'I’m building this part carefully. It will be ready when it has something genuinely useful to share.'
    };

    const nameElement = document.getElementById('coming-soon-name');
    const descriptionElement = document.getElementById('coming-soon-description');
    const backButton = document.getElementById('coming-soon-back');

    if (nameElement) nameElement.textContent = details.name;
    if (descriptionElement) descriptionElement.textContent = details.description;
    document.title = `${details.name} — Coming Soon | Cheminations`;

    if (backButton) {
        backButton.addEventListener('click', () => {
            const referrerIsLocal = document.referrer && new URL(document.referrer).origin === window.location.origin;
            if (referrerIsLocal && window.history.length > 1) window.history.back();
            else window.location.href = 'index.html';
        });
    }

    const canvas = document.getElementById('coming-soon-canvas');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let animationFrame = null;
    let startTime = performance.now();
    let isVisible = true;

    const colors = {
        coral: '#f56565',
        rose: '#ef6976',
        indigo: '#667eea',
        ink: '#3d4449',
        line: 'rgba(104, 114, 124, 0.28)',
        pale: 'rgba(245, 101, 101, 0.11)'
    };

    const molecule = [
        { x: 0, y: 0, radius: 9.5, color: colors.ink },
        { x: -0.72, y: -0.57, radius: 7.2, color: colors.coral },
        { x: 0.73, y: -0.48, radius: 7.2, color: colors.indigo },
        { x: -0.58, y: 0.7, radius: 6.4, color: colors.rose },
        { x: 0.64, y: 0.65, radius: 6.4, color: colors.coral }
    ];

    const peaks = [
        { x: 0.06, amplitude: 0.12, width: 0.016 },
        { x: 0.13, amplitude: 0.27, width: 0.012 },
        { x: 0.22, amplitude: 0.16, width: 0.022 },
        { x: 0.32, amplitude: 0.58, width: 0.014 },
        { x: 0.41, amplitude: 0.23, width: 0.011 },
        { x: 0.52, amplitude: 0.78, width: 0.018 },
        { x: 0.65, amplitude: 0.31, width: 0.024 },
        { x: 0.77, amplitude: 0.52, width: 0.013 },
        { x: 0.9, amplitude: 0.2, width: 0.02 }
    ];

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
        width = bounds.width;
        height = bounds.height;
        canvas.width = Math.max(1, Math.round(width * pixelRatio));
        canvas.height = Math.max(1, Math.round(height * pixelRatio));
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        if (motionQuery.matches) draw(performance.now());
    }

    function drawBond(x1, y1, x2, y2, opacity) {
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.lineWidth = 2.1;
        context.strokeStyle = `rgba(104, 114, 124, ${opacity})`;
        context.stroke();
    }

    function drawMolecule(time) {
        const centerX = width * 0.5;
        const centerY = height * 0.39;
        const scale = Math.min(width, height) * 0.19;
        const positions = molecule.map((atom, index) => {
            if (index === 0) return { x: centerX, y: centerY, ...atom };
            const bend = Math.sin(time * 1.05 + index * 1.3) * 0.045;
            const stretch = 1 + Math.sin(time * 1.32 + index * 0.82) * 0.055;
            return {
                x: centerX + (atom.x * Math.cos(bend) - atom.y * Math.sin(bend)) * scale * stretch,
                y: centerY + (atom.x * Math.sin(bend) + atom.y * Math.cos(bend)) * scale * stretch,
                ...atom
            };
        });

        positions.slice(1).forEach((atom, index) => {
            drawBond(centerX, centerY, atom.x, atom.y, 0.42 + index * 0.045);
        });

        positions.forEach((atom, index) => {
            const pulse = index === 0 ? 1 : 1 + Math.sin(time * 1.5 + index) * 0.045;
            context.beginPath();
            context.arc(atom.x, atom.y, atom.radius * pulse, 0, Math.PI * 2);
            context.fillStyle = atom.color;
            context.shadowColor = index === 0 ? 'rgba(61, 68, 73, 0.22)' : 'rgba(245, 101, 101, 0.24)';
            context.shadowBlur = 12;
            context.fill();
            context.shadowBlur = 0;
            context.beginPath();
            context.arc(atom.x - atom.radius * 0.25, atom.y - atom.radius * 0.28, atom.radius * 0.23, 0, Math.PI * 2);
            context.fillStyle = 'rgba(255, 255, 255, 0.62)';
            context.fill();
        });
    }

    function drawSpectrum(time) {
        const left = width * 0.08;
        const right = width * 0.92;
        const usableWidth = right - left;
        const baseline = height * 0.78;
        const signalHeight = height * 0.2;
        const step = Math.max(1.25, usableWidth / 260);

        context.beginPath();
        for (let x = 0; x <= usableWidth + step; x += step) {
            const normalizedX = x / usableWidth;
            let value = 0;
            peaks.forEach((peak, index) => {
                const breathe = 1 + Math.sin(time * 1.2 + index * 0.73) * 0.025;
                const distance = (normalizedX - peak.x) / peak.width;
                value += peak.amplitude * breathe * Math.exp(-0.5 * distance * distance);
            });
            value += Math.sin(normalizedX * 89 + time * 1.9) * 0.014;
            value += Math.sin(normalizedX * 151 - time * 1.15) * 0.008;
            const drawX = left + x;
            const drawY = baseline - value * signalHeight;
            if (x === 0) context.moveTo(drawX, drawY);
            else context.lineTo(drawX, drawY);
        }

        const gradient = context.createLinearGradient(left, 0, right, 0);
        gradient.addColorStop(0, colors.coral);
        gradient.addColorStop(0.55, colors.rose);
        gradient.addColorStop(1, colors.indigo);
        context.strokeStyle = gradient;
        context.lineWidth = 1.7;
        context.lineJoin = 'round';
        context.shadowColor = 'rgba(245, 101, 101, 0.25)';
        context.shadowBlur = 6;
        context.stroke();
        context.shadowBlur = 0;

        const scanX = left + ((time * 0.09) % 1) * usableWidth;
        const scanGradient = context.createLinearGradient(scanX - 28, 0, scanX + 28, 0);
        scanGradient.addColorStop(0, 'rgba(102, 126, 234, 0)');
        scanGradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.11)');
        scanGradient.addColorStop(1, 'rgba(102, 126, 234, 0)');
        context.fillStyle = scanGradient;
        context.fillRect(scanX - 28, height * 0.08, 56, height * 0.76);
    }

    function draw(timestamp) {
        context.clearRect(0, 0, width, height);
        const time = motionQuery.matches ? 0 : (timestamp - startTime) / 1000;
        drawMolecule(time);
        drawSpectrum(time);
        if (!motionQuery.matches && isVisible && !document.hidden) {
            animationFrame = window.requestAnimationFrame(draw);
        }
    }

    function start() {
        if (motionQuery.matches || animationFrame || !isVisible || document.hidden) return;
        startTime = performance.now();
        animationFrame = window.requestAnimationFrame(draw);
    }

    function stop() {
        if (!animationFrame) return;
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible) start();
            else stop();
        }, { threshold: 0.01 });
        observer.observe(canvas);
    }

    if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', () => {
            stop();
            if (motionQuery.matches) draw(performance.now());
            else start();
        });
    }

    if (motionQuery.matches) draw(performance.now());
    else start();
}());
