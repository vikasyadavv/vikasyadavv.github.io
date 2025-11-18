/**
 * Google Scholar Stats Widget
 * Fetches and displays research metrics from n8n webhook
 * Caches data for 3 days to minimize API calls
 */

(function() {
	'use strict';

	class ScholarStatsWidget {
		constructor(options = {}) {
			this.apiUrl = options.apiUrl || 'https://vikasyadav-api.vikas4770.workers.dev/api/chat/message';
			this.cacheKey = 'scholar_stats_cache';
			this.cacheDuration = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
			this.containerId = options.containerId || 'scholar-stats-widget';
			this.retryAttempts = 3;
			this.retryDelay = 1000;
		}

		/**
		 * Initialize the widget
		 */
		async init() {
			const container = document.getElementById(this.containerId);
			if (!container) {
				console.error(`Scholar Stats: Container #${this.containerId} not found`);
				return;
			}

			// Show loading state
			this.showLoading(container);

			try {
				// Fetch stats (from cache or API)
				const metrics = await this.fetchStats();
				
				// Render the widget
				this.render(container, metrics);
				
				console.log('✅ Scholar stats loaded successfully');
			} catch (error) {
				console.error('❌ Scholar stats error:', error);
				this.showError(container);
			}
		}

		/**
		 * Fetch stats with caching logic
		 */
		async fetchStats() {
			// Try to get cached data first
			const cached = this.getCachedData();
			if (cached) {
				console.log('📚 Using cached Scholar stats (< 3 days old)');
				return cached;
			}

			console.log('📡 Fetching fresh Scholar stats from n8n...');

			// Fetch from API with retry logic
			for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
				try {
					const sessionId = 'scholar_' + Date.now();
					
					const response = await fetch(this.apiUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							message: '/scholar',
							sessionId: sessionId,
							context: {
								page: 'homepage-scholar-widget',
								action: 'fetch-stats',
								timestamp: new Date().toISOString()
							}
						}),
						signal: AbortSignal.timeout(10000) // 10-second timeout
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}

				const data = await response.json();
				console.log('📊 Raw API response:', data);
				console.log('📊 Response type:', typeof data.response);

				// Parse the response
				let metrics;
				
				// Handle different response formats
				if (data.response) {
					// Format 1: {response: "[{\"output\":{\"metrics\":...}}]"} - STRING
					if (typeof data.response === 'string') {
						console.log('🔍 Parsing string response...');
						try {
							const parsed = JSON.parse(data.response);
							console.log('🔍 Parsed response:', parsed);
							
							if (Array.isArray(parsed) && parsed[0]?.output?.metrics) {
								metrics = parsed[0].output.metrics;
								console.log('✅ Extracted metrics from array format:', metrics);
							} else if (parsed.output?.metrics) {
								metrics = parsed.output.metrics;
								console.log('✅ Extracted metrics from object format:', metrics);
							}
						} catch (e) {
							console.error('❌ Failed to parse stringified response:', e);
							console.error('Raw response string:', data.response);
						}
					}
					// Format 2: {response: {output: {metrics: ...}}} - OBJECT
					else if (data.response.output?.metrics) {
						metrics = data.response.output.metrics;
						console.log('✅ Extracted metrics from object format:', metrics);
					}
					// Format 3: {response: [{output: {metrics: ...}}]} - ARRAY
					else if (Array.isArray(data.response) && data.response[0]?.output?.metrics) {
						metrics = data.response[0].output.metrics;
						console.log('✅ Extracted metrics from array format:', metrics);
					} else {
						console.error('❌ Unknown response format:', data.response);
					}
				} else {
					console.error('❌ No response field in data:', data);
				}

				if (!metrics || !metrics.All) {
					console.error('❌ Invalid metrics - All field missing:', metrics);
					throw new Error('Invalid metrics format in response');
				}					// Cache the successful result
					this.cacheData(metrics);
					console.log('✅ Scholar stats fetched and cached:', metrics);

					return metrics;

				} catch (error) {
					console.warn(`⚠️ Attempt ${attempt}/${this.retryAttempts} failed:`, error.message);
					
					if (attempt < this.retryAttempts) {
						// Wait before retry
						await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
					} else {
						// All attempts failed - try to use expired cache as fallback
						const expiredCache = this.getCachedData(true);
						if (expiredCache) {
							console.log('⚠️ Using expired cache as fallback');
							return expiredCache;
						}
						
						// No cache available - throw error
						throw error;
					}
				}
			}
		}

		/**
		 * Get cached data from localStorage
		 */
		getCachedData(ignoreExpiry = false) {
			try {
				const cached = localStorage.getItem(this.cacheKey);
				if (!cached) return null;

				const data = JSON.parse(cached);
				
				if (ignoreExpiry) {
					return data.metrics;
				}

				const age = Date.now() - data.timestamp;
				
				if (age < this.cacheDuration) {
					const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
					console.log(`📦 Cache age: ${daysOld} day(s) old`);
					return data.metrics;
				}

				console.log('⏰ Cache expired (> 3 days), will fetch fresh data');
				return null;

			} catch (error) {
				console.error('Error reading cache:', error);
				return null;
			}
		}

		/**
		 * Cache data in localStorage
		 */
		cacheData(metrics) {
			try {
				const cacheData = {
					metrics: metrics,
					timestamp: Date.now(),
					cached_at: new Date().toISOString()
				};
				localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
				console.log('💾 Data cached for 3 days');
			} catch (error) {
				console.error('Error caching data:', error);
			}
		}

		/**
		 * Show loading state
		 */
		showLoading(container) {
			container.innerHTML = `
				<div class="scholar-loading" style="text-align: center; padding: 2em; color: #999;">
					<i class="fas fa-spinner fa-spin" style="font-size: 2em; margin-bottom: 0.5em;"></i>
					<p>Loading research metrics...</p>
				</div>
			`;
		}

		/**
		 * Show error state
		 */
		showError(container) {
			container.innerHTML = `
				<article class="scholar-error" style="padding: 2em; text-align: center; background: #fff3cd; border-radius: 8px;">
					<h3 style="color: #856404; margin-bottom: 1em;">
						<i class="icon solid fa-exclamation-triangle"></i>
						Stats Unavailable
					</h3>
					<p style="color: #856404; margin-bottom: 1.5em;">Unable to load Scholar metrics. Please try again later.</p>
					<a href="https://scholar.google.com/citations?user=C1cWkWYAAAAJ" 
					   target="_blank" 
					   rel="noopener" 
					   class="button small">
						View Google Scholar Profile →
					</a>
				</article>
			`;
		}

	/**
	 * Render the widget with metrics (dual flip card version)
	 */
	render(container, metrics) {
		const allMetrics = metrics.All;
		
		// Get the "Since XXXX" key dynamically
		const sinceKeys = Object.keys(metrics).filter(key => key.startsWith('Since'));
		const sinceKey = sinceKeys[0] || 'Since 2020';
		const sinceMetrics = metrics[sinceKey];
		const sinceYear = sinceKey.replace('Since ', '');

		// Calculate percentage of recent impact
		const recentPercentage = allMetrics.citations > 0 
			? Math.round((sinceMetrics.citations / allMetrics.citations) * 100)
			: 100;

		const html = `
			<article class="scholar-stats-card">
				<style>
					.scholar-stats-card {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						padding: 2em 1.5em;
						border-radius: 12px;
						box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
						margin-bottom: 2em;
						perspective: 1000px;
					}

					.scholar-stats-card h3 {
						color: white;
						margin: 0 0 1.5em 0;
						font-size: 1.2em;
						display: flex;
						align-items: center;
						gap: 0.5em;
					}

					/* Flip Card Container */
					.flip-card-container {
						position: relative;
						width: 100%;
						height: 280px;
						margin-bottom: 1.5em;
					}

					.flip-card {
						position: relative;
						width: 100%;
						height: 100%;
						transform-style: preserve-3d;
						transition: transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
					}

					.flip-card.flipped {
						transform: rotateY(180deg);
					}

					.card-face {
						position: absolute;
						width: 100%;
						height: 100%;
						backface-visibility: hidden;
						-webkit-backface-visibility: hidden;
						border-radius: 8px;
						padding: 1.5em;
						background: rgba(255, 255, 255, 0.1);
						backdrop-filter: blur(10px);
					}

					.card-face-back {
						transform: rotateY(180deg);
					}

					.card-title {
						text-align: center;
						font-size: 1.1em;
						font-weight: bold;
						margin-bottom: 1em;
						color: rgba(255, 255, 255, 0.95);
						text-transform: uppercase;
						letter-spacing: 1px;
						border-bottom: 2px solid rgba(255, 255, 255, 0.3);
						padding-bottom: 0.5em;
					}

					.stats-grid {
						display: grid;
						grid-template-columns: repeat(3, 1fr);
						gap: 1em;
					}

					.stat-card {
						background: rgba(255, 255, 255, 0.15);
						padding: 1em 0.5em;
						border-radius: 8px;
						text-align: center;
						transition: all 0.3s ease;
						backdrop-filter: blur(10px);
					}

					.stat-card:hover {
						transform: translateY(-3px);
						background: rgba(255, 255, 255, 0.25);
						box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
					}

					.stat-value {
						display: block;
						font-size: 2em;
						font-weight: bold;
						color: white;
						line-height: 1;
						margin-bottom: 0.3em;
					}

					.stat-label {
						display: block;
						font-size: 0.75em;
						color: rgba(255, 255, 255, 0.9);
						text-transform: uppercase;
						letter-spacing: 0.5px;
					}

					/* Progress Ring */
					.stats-visual {
						text-align: center;
						margin-top: 1em;
					}

					.progress-ring {
						position: relative;
						width: 100px;
						height: 100px;
						margin: 0 auto;
					}

					.progress-ring svg {
						width: 100%;
						height: 100%;
						transform: rotate(-90deg);
					}

					.progress-ring circle {
						fill: none;
						stroke-width: 8;
					}

					.progress-ring circle.bg {
						stroke: rgba(255, 255, 255, 0.2);
					}

					.progress-ring circle.fg {
						stroke: white;
						stroke-linecap: round;
						stroke-dasharray: 251.2;
						stroke-dashoffset: 251.2;
						animation: progress-animation 2s ease-out forwards;
					}

					@keyframes progress-animation {
						to {
							stroke-dashoffset: ${251.2 * (1 - recentPercentage / 100)};
						}
					}

					.progress-text {
						position: absolute;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%);
						font-size: 1.5em;
						font-weight: bold;
						color: white;
					}

					.progress-label {
						text-align: center;
						margin-top: 0.5em;
						font-size: 0.85em;
						color: rgba(255, 255, 255, 0.9);
					}

					.scholar-stats-card .button {
						background: white;
						color: #667eea;
						border: none;
						font-weight: bold;
						transition: all 0.3s ease;
					}

					.scholar-stats-card .button:hover {
						background: rgba(255, 255, 255, 0.9);
						transform: translateY(-2px);
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
					}

					/* Flip Indicator */
					.flip-indicator {
						text-align: center;
						font-size: 0.75em;
						color: rgba(255, 255, 255, 0.7);
						margin-bottom: 1em;
					}

					.flip-indicator i {
						animation: bounce 2s infinite;
					}

					@keyframes bounce {
						0%, 100% { transform: translateY(0); }
						50% { transform: translateY(-5px); }
					}

					@media screen and (max-width: 736px) {
						.stats-grid {
							grid-template-columns: 1fr;
							gap: 0.75em;
						}
						
						.stat-value {
							font-size: 1.8em;
						}

						.flip-card-container {
							height: 320px;
						}
					}
				</style>

				<h3>
					<i class="icon brands fa-google"></i>
					Research Impact
				</h3>

				<div class="flip-indicator">
					<i class="fas fa-sync-alt"></i> Auto-flipping every 3 seconds
				</div>

				<div class="flip-card-container">
					<div class="flip-card" id="scholar-flip-card">
						<!-- Front Face: All Time Stats -->
						<div class="card-face card-face-front">
							<div class="card-title">📊 All Time Metrics</div>
							<div class="stats-grid">
								<div class="stat-card">
									<span class="stat-value" data-target="${allMetrics.citations}" data-side="all">0</span>
									<span class="stat-label">Citations</span>
								</div>
								<div class="stat-card">
									<span class="stat-value" data-target="${allMetrics.h_index}" data-side="all">0</span>
									<span class="stat-label">h-index</span>
								</div>
								<div class="stat-card">
									<span class="stat-value" data-target="${allMetrics.i10_index}" data-side="all">0</span>
									<span class="stat-label">i10-index</span>
								</div>
							</div>
							<div class="stats-visual">
								<div class="progress-ring">
									<svg viewBox="0 0 100 100">
										<circle class="bg" cx="50" cy="50" r="40"/>
										<circle class="fg" cx="50" cy="50" r="40"/>
									</svg>
									<div class="progress-text">100%</div>
								</div>
								<div class="progress-label">Complete Impact</div>
							</div>
						</div>

						<!-- Back Face: Since ${sinceYear} Stats -->
						<div class="card-face card-face-back">
							<div class="card-title">🚀 Since ${sinceYear}</div>
							<div class="stats-grid">
								<div class="stat-card">
									<span class="stat-value" data-target="${sinceMetrics.citations}" data-side="since">0</span>
									<span class="stat-label">Citations</span>
								</div>
								<div class="stat-card">
									<span class="stat-value" data-target="${sinceMetrics.h_index}" data-side="since">0</span>
									<span class="stat-label">h-index</span>
								</div>
								<div class="stat-card">
									<span class="stat-value" data-target="${sinceMetrics.i10_index}" data-side="since">0</span>
									<span class="stat-label">i10-index</span>
								</div>
							</div>
							<div class="stats-visual">
								<div class="progress-ring">
									<svg viewBox="0 0 100 100">
										<circle class="bg" cx="50" cy="50" r="40"/>
										<circle class="fg" cx="50" cy="50" r="40"/>
									</svg>
									<div class="progress-text">${recentPercentage}%</div>
								</div>
								<div class="progress-label">Recent Impact</div>
							</div>
						</div>
					</div>
				</div>

				<a href="https://scholar.google.com/citations?user=C1cWkWYAAAAJ" 
				   target="_blank" 
				   rel="noopener" 
				   class="button small fit">
					View Full Profile →
				</a>
			</article>
		`;

		container.innerHTML = html;

		// Animate initial counters
		this.animateCounters(container);

		// Start auto-flip cycle
		this.startAutoFlip();
	}

	/**
	 * Start automatic card flipping every 3 seconds
	 */
	startAutoFlip() {
		const flipCard = document.getElementById('scholar-flip-card');
		if (!flipCard) return;

		let isFlipped = false;

		// Flip every 3 seconds
		setInterval(() => {
			isFlipped = !isFlipped;
			
			if (isFlipped) {
				flipCard.classList.add('flipped');
				// Animate back side counters after flip completes
				setTimeout(() => {
					this.animateCounters(flipCard.querySelector('.card-face-back'));
				}, 400); // Half of flip duration
			} else {
				flipCard.classList.remove('flipped');
				// Animate front side counters after flip completes
				setTimeout(() => {
					this.animateCounters(flipCard.querySelector('.card-face-front'));
				}, 400);
			}
		}, 3000);
	}		/**
		 * Animate stat counters from 0 to target value
		 */
		animateCounters(container) {
			const counters = container.querySelectorAll('.stat-value[data-target]');
			
			counters.forEach(counter => {
				const target = parseInt(counter.getAttribute('data-target'));
				const duration = 2000; // 2 seconds
				const startTime = performance.now();

				const animate = (currentTime) => {
					const elapsed = currentTime - startTime;
					const progress = Math.min(elapsed / duration, 1);

					// Easing function (ease-out cubic)
					const easeOut = 1 - Math.pow(1 - progress, 3);
					const current = Math.floor(target * easeOut);

					counter.textContent = current;

					if (progress < 1) {
					requestAnimationFrame(animate);
				} else {
					counter.textContent = target;
				}
			};

			// Reset to 0 before animating
			counter.textContent = '0';
			requestAnimationFrame(animate);
		});
	}
}	// Auto-initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initWidget);
	} else {
		initWidget();
	}

	function initWidget() {
		const widget = new ScholarStatsWidget();
		widget.init();
	}

	// Expose to window for manual initialization if needed
	window.ScholarStatsWidget = ScholarStatsWidget;

	// Expose test function for debugging
	window.testScholarAPI = async function() {
		console.log('🧪 Testing Scholar API...');
		
		const sessionId = 'test_scholar_' + Date.now();
		
		try {
			const response = await fetch('https://vikasyadav-api.vikas4770.workers.dev/api/chat/message', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: '/scholar',
					sessionId: sessionId,
					context: {
						page: 'test',
						action: 'debug'
					}
				})
			});

			console.log('📡 Response status:', response.status);
			console.log('📡 Response headers:', Object.fromEntries(response.headers));

			const data = await response.json();
			console.log('📊 Full response:', data);
			console.log('📊 Response field type:', typeof data.response);
			console.log('📊 Response content:', data.response);

			if (typeof data.response === 'string') {
				try {
					const parsed = JSON.parse(data.response);
					console.log('✅ Parsed response:', parsed);
					
					if (Array.isArray(parsed)) {
						console.log('✅ Array length:', parsed.length);
						console.log('✅ First item:', parsed[0]);
						if (parsed[0]?.output?.metrics) {
							console.log('✅ Metrics found:', parsed[0].output.metrics);
						}
					}
				} catch (e) {
					console.error('❌ Parse error:', e);
				}
			}

			return data;
		} catch (error) {
			console.error('❌ Test failed:', error);
			throw error;
		}
	};

})();
