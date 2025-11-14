/**
 * Blog.js - Dynamic Blog Post Loader
 * Fetches blog posts from Cloudflare Workers API (Google Sheets backend)
 * Filters posts by status (ready/posted) and handles image extraction
 */

(function() {
	'use strict';

	// Configuration
	const CONFIG = {
		API_URL: 'https://vikasyadav-blog-post.vikas4770.workers.dev',
		POSTS_PER_PAGE: 6,
		VALID_STATUSES: ['ready', 'posted'],
		IMAGE_CACHE_TIME: 3600000, // 1 hour
		ROTATION_INTERVAL: 7200000 // 2 hours for homepage rotation
	};

	// Pagination state
	let currentPage = 1;
	let totalPages = 1;
	let allValidPosts = [];

	// Utility Functions
	const utils = {
		/**
		 * Convert Google Drive share link to direct image URL
		 */
		convertDriveUrl: function(url) {
			if (!url || url.trim() === '') return null;
			
			url = url.trim();
			
			// If already a direct URL, return it
			if (url.includes('drive.google.com/uc?')) {
				return url;
			}
			
			// Extract file ID from various Google Drive URL formats
			const patterns = [
				/\/file\/d\/([a-zA-Z0-9_-]+)/,
				/\/d\/([a-zA-Z0-9_-]+)\/view/,
				/id=([a-zA-Z0-9_-]+)/,
				/\/open\?id=([a-zA-Z0-9_-]+)/
			];
			
			for (let pattern of patterns) {
				const match = url.match(pattern);
				if (match && match[1]) {
					// Use thumbnail format for better loading
					return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
				}
			}
			
			// If it's a regular image URL (not Google Drive), return as is
			if (url.startsWith('http')) {
				return url;
			}
			
			return null;
		},

		/**
		 * Extract the correct image URL based on Final_Image column
		 */
		getPostImage: function(post) {
			const finalImage = post.Final_Image ? post.Final_Image.trim() : '';
			
			// Check if Final_Image contains a direct URL
			if (finalImage && finalImage.startsWith('http')) {
				const convertedUrl = this.convertDriveUrl(finalImage);
				if (convertedUrl) return convertedUrl;
			}
			
			// Extract image number from Final_Image (e.g., "image1", "image2", etc.)
			if (finalImage) {
				const imageMatch = finalImage.toLowerCase().match(/image(\d+)/);
				if (imageMatch) {
					const imageNum = imageMatch[1];
					const imageUrl = post[`image${imageNum}`];
					if (imageUrl && imageUrl.trim()) {
						const convertedUrl = this.convertDriveUrl(imageUrl);
						if (convertedUrl) return convertedUrl;
					}
				}
			}
			
			// Fallback to first available image
			for (let i = 1; i <= 4; i++) {
				const imgUrl = post[`image${i}`];
				if (imgUrl && imgUrl.trim()) {
					const convertedUrl = this.convertDriveUrl(imgUrl);
					if (convertedUrl) return convertedUrl;
				}
			}
			
			return '../images/default-blog.jpg';
		},

		/**
		 * Extract first paragraph from idea as excerpt
		 */
		getExcerpt: function(idea) {
			if (!idea) return '';
			
			// Split by double newlines to get paragraphs
			const paragraphs = idea.split(/\n\n+/);
			
			// Skip the first paragraph if it's just the title
			const contentStart = paragraphs.length > 1 ? 1 : 0;
			const excerpt = paragraphs[contentStart] || paragraphs[0] || '';
			
			// Limit to 200 characters
			if (excerpt.length > 200) {
				return excerpt.substring(0, 200).trim() + '...';
			}
			
			return excerpt.trim();
		},

		/**
		 * Get title from name field or first line of idea
		 */
		getTitle: function(post) {
			if (post.name && post.name.trim() && post.name.length < 200) {
				return post.name.trim();
			}
			
			// Extract first line from idea as title
			if (post.idea) {
				const firstLine = post.idea.split('\n')[0].trim();
				if (firstLine.length > 0 && firstLine.length < 200) {
					return firstLine;
				}
			}
			
			return 'Untitled Post';
		},

		/**
		 * Create slug from title for URL
		 */
		createSlug: function(title) {
			return title
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.substring(0, 100);
		},

		/**
		 * Format date
		 */
		formatDate: function(date) {
			const options = { year: 'numeric', month: 'long', day: 'numeric' };
			return new Date(date).toLocaleDateString('en-US', options);
		},

		/**
		 * Store post data in localStorage for detail page
		 */
		storePostData: function(post, slug) {
			try {
				const postData = {
					title: this.getTitle(post),
					content: post.idea,
					image: this.getPostImage(post),
					status: post.status,
					slug: slug,
					timestamp: Date.now()
				};
				localStorage.setItem(`blog_post_${slug}`, JSON.stringify(postData));
			} catch (e) {
				console.error('Error storing post data:', e);
			}
		}
	};

	// API Functions
	const api = {
		/**
		 * Fetch posts from Cloudflare Workers API
		 */
		fetchPosts: async function() {
			try {
				const response = await fetch(CONFIG.API_URL);
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				
				const data = await response.json();
				
				if (!data.success || !Array.isArray(data.posts)) {
					throw new Error('Invalid API response format');
				}
				
				return data.posts;
			} catch (error) {
				console.error('Error fetching posts:', error);
				throw error;
			}
		},

		/**
		 * Filter posts by valid status
		 */
		filterPosts: function(posts) {
			return posts.filter(post => {
				// Filter out empty posts
				if (!post.idea || post.idea.trim() === '') {
					return false;
				}
				
				// Check if status is valid
				const status = (post.status || '').toLowerCase().trim();
				return CONFIG.VALID_STATUSES.includes(status);
			});
		}
	};

	// UI Rendering Functions
	const ui = {
		/**
		 * Create HTML for a single blog post card
		 */
		createPostCard: function(post, index) {
			const title = utils.getTitle(post);
			const excerpt = utils.getExcerpt(post.idea);
			const image = utils.getPostImage(post);
			const status = post.status.toLowerCase();
			const slug = utils.createSlug(title);
			
			// Store post data for detail page
			utils.storePostData(post, slug);
			
			const statusClass = status === 'posted' ? 'status-posted' : 'status-review';
			const statusLabel = status === 'posted' ? 'Published' : 'New';
			
			return `
				<article class="blog-post-card">
					<a href="post.html?slug=${slug}" class="blog-post-image-wrapper">
						<span class="blog-status ${statusClass}">${statusLabel}</span>
						<img src="${image}" alt="${title}" class="blog-post-image" 
							 loading="lazy"
							 onerror="this.onerror=null; this.src='../images/default-blog.jpg';" />
					</a>
					<div class="blog-post-content">
						<h3 class="blog-post-title">
							<a href="post.html?slug=${slug}">${title}</a>
						</h3>
						<p class="blog-post-excerpt">${excerpt}</p>
						<ul class="actions">
							<li><a href="post.html?slug=${slug}" class="button small">Read More</a></li>
						</ul>
					</div>
				</article>
			`;
		},

		/**
		 * Render posts to the blog grid with pagination
		 */
		renderPosts: function(posts, page = 1) {
			const container = document.getElementById('blog-posts-grid');
			const loadingIndicator = document.getElementById('loading-indicator');
			const noPostsMessage = document.getElementById('no-posts-message');
			const paginationSection = document.getElementById('pagination-section');
			
			if (!container) return;
			
			// Hide loading indicator
			if (loadingIndicator) {
				loadingIndicator.style.display = 'none';
			}
			
			if (posts.length === 0) {
				if (noPostsMessage) {
					noPostsMessage.style.display = 'block';
				}
				if (paginationSection) {
					paginationSection.style.display = 'none';
				}
				return;
			}
			
			// Store all posts and calculate pagination
			allValidPosts = posts;
			totalPages = Math.ceil(posts.length / CONFIG.POSTS_PER_PAGE);
			currentPage = Math.min(page, totalPages);
			
			// Get posts for current page
			const startIndex = (currentPage - 1) * CONFIG.POSTS_PER_PAGE;
			const endIndex = startIndex + CONFIG.POSTS_PER_PAGE;
			const postsToDisplay = posts.slice(startIndex, endIndex);
			
			// Render posts
			const postsHTML = postsToDisplay.map((post, index) => this.createPostCard(post, startIndex + index)).join('');
			container.innerHTML = postsHTML;
			container.style.display = 'flex';
			
			// Render pagination
			this.renderPagination();
			
			// Scroll to top of blog section
			if (page > 1) {
				const blogSection = document.getElementById('blog-posts-section');
				if (blogSection) {
					blogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			}
		},

		/**
		 * Render pagination controls
		 */
		renderPagination: function() {
			const paginationSection = document.getElementById('pagination-section');
			if (!paginationSection || totalPages <= 1) {
				if (paginationSection) paginationSection.style.display = 'none';
				return;
			}
			
			paginationSection.style.display = 'block';
			
			let paginationHTML = '<ul class="pagination">';
			
			// Previous button
			if (currentPage > 1) {
				paginationHTML += `<li><a href="#" class="button" data-page="${currentPage - 1}">Prev</a></li>`;
			} else {
				paginationHTML += '<li><span class="button disabled">Prev</span></li>';
			}
			
			// Page numbers
			const maxPageButtons = 5;
			let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
			let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
			
			if (endPage - startPage < maxPageButtons - 1) {
				startPage = Math.max(1, endPage - maxPageButtons + 1);
			}
			
			if (startPage > 1) {
				paginationHTML += '<li><a href="#" class="page" data-page="1">1</a></li>';
				if (startPage > 2) {
					paginationHTML += '<li><span>...</span></li>';
				}
			}
			
			for (let i = startPage; i <= endPage; i++) {
				if (i === currentPage) {
					paginationHTML += `<li><a href="#" class="page active" data-page="${i}">${i}</a></li>`;
				} else {
					paginationHTML += `<li><a href="#" class="page" data-page="${i}">${i}</a></li>`;
				}
			}
			
			if (endPage < totalPages) {
				if (endPage < totalPages - 1) {
					paginationHTML += '<li><span>...</span></li>';
				}
				paginationHTML += `<li><a href="#" class="page" data-page="${totalPages}">${totalPages}</a></li>`;
			}
			
			// Next button
			if (currentPage < totalPages) {
				paginationHTML += `<li><a href="#" class="button" data-page="${currentPage + 1}">Next</a></li>`;
			} else {
				paginationHTML += '<li><span class="button disabled">Next</span></li>';
			}
			
			paginationHTML += '</ul>';
			
			paginationSection.innerHTML = paginationHTML;
			
			// Add click handlers
			const pageLinks = paginationSection.querySelectorAll('a[data-page]');
			pageLinks.forEach(link => {
				link.addEventListener('click', (e) => {
					e.preventDefault();
					const page = parseInt(link.getAttribute('data-page'));
					ui.renderPosts(allValidPosts, page);
				});
			});
		},

		/**
		 * Show error message
		 */
		showError: function(message) {
			const loadingIndicator = document.getElementById('loading-indicator');
			const errorContainer = document.getElementById('error-container');
			const errorText = document.getElementById('error-text');
			
			if (loadingIndicator) {
				loadingIndicator.style.display = 'none';
			}
			
			if (errorContainer && errorText) {
				errorText.textContent = message;
				errorContainer.style.display = 'block';
			}
		},

		/**
		 * Render posts for homepage preview (6 posts, rotating)
		 */
		renderHomepagePosts: function(posts) {
			const container = document.getElementById('latest-posts');
			if (!container) return;
			
			// Get rotation index from localStorage
			let rotationIndex = parseInt(localStorage.getItem('blog_rotation_index') || '0');
			const lastRotation = parseInt(localStorage.getItem('blog_last_rotation') || '0');
			const now = Date.now();
			
			// Rotate posts every 2 hours
			if (now - lastRotation > CONFIG.ROTATION_INTERVAL) {
				rotationIndex = (rotationIndex + 6) % posts.length;
				localStorage.setItem('blog_rotation_index', rotationIndex.toString());
				localStorage.setItem('blog_last_rotation', now.toString());
			}
			
			// Get 6 posts starting from rotation index
			const displayPosts = [];
			for (let i = 0; i < Math.min(6, posts.length); i++) {
				displayPosts.push(posts[(rotationIndex + i) % posts.length]);
			}
			
			// Render posts
			const postsHTML = displayPosts.map((post, index) => {
				const title = utils.getTitle(post);
				const excerpt = utils.getExcerpt(post.idea);
				const image = utils.getPostImage(post);
				const slug = utils.createSlug(title);
				
				utils.storePostData(post, slug);
				
				return `
					<article>
						<a href="blog/post.html?slug=${slug}" class="image">
							<img src="${image}" alt="${title}" 
								 loading="lazy"
								 onerror="this.onerror=null; this.src='images/default-blog.jpg';" />
						</a>
						<h3>${title}</h3>
						<p>${excerpt}</p>
						<ul class="actions">
							<li><a href="blog/post.html?slug=${slug}" class="button">Read More</a></li>
						</ul>
					</article>
				`;
			}).join('');
			
			container.innerHTML = postsHTML;
		}
	};

	// Main Blog Loader
	const BlogLoader = {
		init: async function() {
			try {
				// Fetch posts from API
				const allPosts = await api.fetchPosts();
				
				// Filter valid posts
				const validPosts = api.filterPosts(allPosts);
				
				// Determine if we're on blog page or homepage
				const isBlogPage = window.location.pathname.includes('/blog/');
				
				if (isBlogPage) {
					ui.renderPosts(validPosts);
				} else {
					ui.renderHomepagePosts(validPosts);
				}
				
			} catch (error) {
				console.error('Error initializing blog:', error);
				ui.showError('Unable to load blog posts. Please try again later.');
			}
		}
	};

	// Search functionality
	const Search = {
		init: function() {
			const searchForm = document.getElementById('blog-search-form');
			const searchInput = document.getElementById('search-query');
			
			if (searchForm && searchInput) {
				searchForm.addEventListener('submit', async function(e) {
					e.preventDefault();
					const query = searchInput.value.trim().toLowerCase();
					
					if (!query) return;
					
					try {
						const allPosts = await api.fetchPosts();
						const validPosts = api.filterPosts(allPosts);
						
						// Filter posts by search query
						const filteredPosts = validPosts.filter(post => {
							const title = utils.getTitle(post).toLowerCase();
							const content = post.idea.toLowerCase();
							return title.includes(query) || content.includes(query);
						});
						
						ui.renderPosts(filteredPosts);
					} catch (error) {
						console.error('Search error:', error);
					}
				});
			}
		}
	};

	// Initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function() {
			BlogLoader.init();
			Search.init();
		});
	} else {
		BlogLoader.init();
		Search.init();
	}

	// Export for global access
	window.BlogLoader = BlogLoader;
	window.BlogUtils = utils;

})();
