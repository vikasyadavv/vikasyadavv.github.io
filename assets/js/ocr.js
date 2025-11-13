/**
 * OCR Tool JavaScript
 * Handles OCR document processing functionality
 */

class OCRTool {
    constructor() {
        this.apiUrl = 'https://api.vikasyadav.live';
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];
        this.processingHistory = this.loadProcessingHistory();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderProcessingHistory();
        this.loadLanguages();
    }

    bindEvents() {
        const ocrForm = document.getElementById('ocr-form');
        const ocrUrlForm = document.getElementById('ocr-url-form');
        const fileInput = document.getElementById('file-input');
        const copyTextBtn = document.getElementById('copy-text');
        const downloadTextBtn = document.getElementById('download-text');

        if (ocrForm) {
            ocrForm.addEventListener('submit', (e) => this.handleFileUpload(e));
        }

        if (ocrUrlForm) {
            ocrUrlForm.addEventListener('submit', (e) => this.handleUrlProcessing(e));
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }

        if (copyTextBtn) {
            copyTextBtn.addEventListener('click', () => this.copyExtractedText());
        }

        if (downloadTextBtn) {
            downloadTextBtn.addEventListener('click', () => this.downloadExtractedText());
        }

        // Drag and drop support
        this.initDragAndDrop();
    }

    initDragAndDrop() {
        const dropZone = document.querySelector('.box');
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });

        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById('file-input');
            fileInput.files = files;
            this.handleFileSelection({ target: fileInput });
        }
    }

    handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!this.validateFile(file)) {
            return;
        }

        // Show file info
        this.displayFileInfo(file);
    }

    validateFile(file) {
        if (file.size > this.maxFileSize) {
            this.showError(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
            return false;
        }

        if (!this.supportedTypes.includes(file.type)) {
            this.showError('Unsupported file type. Please use JPEG, PNG, WebP, TIFF, or PDF files.');
            return false;
        }

        return true;
    }

    displayFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) {
            fileInfo.innerHTML = `
                <li><strong>Name:</strong> ${file.name}</li>
                <li><strong>Size:</strong> ${this.formatFileSize(file.size)}</li>
                <li><strong>Type:</strong> ${file.type}</li>
                <li><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleDateString()}</li>
            `;
        }
    }

    async handleFileUpload(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const file = formData.get('file');

        if (!file || !this.validateFile(file)) {
            return;
        }

        this.showProcessing(true);
        this.hideResults();
        this.hideError();

        try {
            // Track analytics
            if (window.Analytics) {
                window.Analytics.track('ocr_file_upload', {
                    file_size: file.size,
                    file_type: file.type,
                    include_details: formData.get('includeDetails') === 'on'
                });
            }

            const response = await fetch(`${this.apiUrl}/api/ocr/extract`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.displayResults(result);
                this.addToHistory(result);
            } else {
                this.showError(result.message || 'Processing failed');
            }

        } catch (error) {
            console.error('OCR processing error:', error);
            this.showError('Failed to process document. Please try again.');
            
            if (window.Analytics) {
                window.Analytics.trackError(error, { context: 'ocr_file_upload' });
            }
        } finally {
            this.showProcessing(false);
        }
    }

    async handleUrlProcessing(e) {
        e.preventDefault();

        const imageUrl = document.getElementById('image-url').value.trim();
        if (!imageUrl) return;

        this.showProcessing(true);
        this.hideResults();
        this.hideError();

        try {
            const response = await fetch(`${this.apiUrl}/api/ocr/extract-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageUrl: imageUrl,
                    includeDetails: document.getElementById('include-details').checked
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayResults(result);
                this.addToHistory(result);
            } else {
                this.showError(result.message || 'Processing failed');
            }

        } catch (error) {
            console.error('OCR URL processing error:', error);
            this.showError('Failed to process image URL. Please try again.');
        } finally {
            this.showProcessing(false);
        }
    }

    displayResults(result) {
        const resultsSection = document.getElementById('results-section');
        const extractedText = document.getElementById('extracted-text');
        const processingStats = document.getElementById('processing-stats');
        const detailedAnalysis = document.getElementById('detailed-analysis');

        if (resultsSection) resultsSection.style.display = 'block';

        if (extractedText) {
            extractedText.value = result.extractedText || '';
        }

        if (processingStats) {
            processingStats.innerHTML = `
                <li><strong>Confidence:</strong> ${Math.round(result.confidence || 0)}%</li>
                <li><strong>Word Count:</strong> ${result.wordCount || 0}</li>
                <li><strong>Processing Time:</strong> ${this.calculateProcessingTime(result.processedAt)}</li>
                ${result.source ? `<li><strong>Source:</strong> ${result.source}</li>` : ''}
            `;
        }

        // Show detailed analysis if available
        if (result.details && detailedAnalysis) {
            this.displayDetailedAnalysis(result.details);
            detailedAnalysis.style.display = 'block';
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    displayDetailedAnalysis(details) {
        const analysisContent = document.getElementById('analysis-content');
        if (!analysisContent) return;

        let html = '';

        if (details.words && details.words.length > 0) {
            html += '<h4>Word Analysis</h4>';
            html += '<div class="word-analysis">';
            
            const topWords = details.words
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 20);

            topWords.forEach(word => {
                const confidenceClass = word.confidence > 80 ? 'high' : word.confidence > 60 ? 'medium' : 'low';
                html += `<span class="word-confidence ${confidenceClass}" title="Confidence: ${word.confidence}%">${word.text}</span> `;
            });
            
            html += '</div>';
        }

        if (details.paragraphs && details.paragraphs.length > 0) {
            html += '<h4>Paragraph Structure</h4>';
            html += '<ul>';
            details.paragraphs.forEach((para, index) => {
                html += `<li>Paragraph ${index + 1}: ${para.words?.length || 0} words, Confidence: ${Math.round(para.confidence || 0)}%</li>`;
            });
            html += '</ul>';
        }

        analysisContent.innerHTML = html;
    }

    addToHistory(result) {
        const historyItem = {
            id: Date.now(),
            filename: result.filename || 'URL Processing',
            extractedText: result.extractedText.substring(0, 100) + '...',
            confidence: result.confidence,
            wordCount: result.wordCount,
            processedAt: new Date().toISOString()
        };

        this.processingHistory.unshift(historyItem);
        this.processingHistory = this.processingHistory.slice(0, 10); // Keep last 10 items
        
        this.saveProcessingHistory();
        this.renderProcessingHistory();
    }

    renderProcessingHistory() {
        const historyContainer = document.getElementById('processing-history');
        if (!historyContainer) return;

        if (this.processingHistory.length === 0) {
            historyContainer.innerHTML = '<p><em>No recent processing history</em></p>';
            return;
        }

        let html = '<ul class="processing-history-list">';
        this.processingHistory.forEach(item => {
            html += `
                <li>
                    <strong>${item.filename}</strong><br>
                    <small>${item.extractedText}</small><br>
                    <span class="meta">Confidence: ${Math.round(item.confidence)}% | ${this.formatDate(item.processedAt)}</span>
                </li>
            `;
        });
        html += '</ul>';

        historyContainer.innerHTML = html;
    }

    async loadLanguages() {
        try {
            const response = await fetch(`${this.apiUrl}/api/ocr/languages`);
            const data = await response.json();
            
            if (data.languages) {
                const languageSelect = document.getElementById('language');
                if (languageSelect) {
                    languageSelect.innerHTML = '';
                    data.languages.forEach(lang => {
                        const option = document.createElement('option');
                        option.value = lang.code;
                        option.textContent = lang.name;
                        if (lang.code === data.default) {
                            option.selected = true;
                        }
                        languageSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to load languages:', error);
        }
    }

    copyExtractedText() {
        const extractedText = document.getElementById('extracted-text');
        if (extractedText) {
            extractedText.select();
            document.execCommand('copy');
            
            // Show feedback
            const copyBtn = document.getElementById('copy-text');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);

            if (window.Analytics) {
                window.Analytics.track('ocr_text_copied');
            }
        }
    }

    downloadExtractedText() {
        const extractedText = document.getElementById('extracted-text');
        if (!extractedText || !extractedText.value) return;

        const blob = new Blob([extractedText.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extracted-text-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.Analytics) {
            window.Analytics.track('ocr_text_downloaded');
        }
    }

    showProcessing(show) {
        const submitBtn = document.querySelector('#ocr-form input[type="submit"]');
        const urlSubmitBtn = document.querySelector('#ocr-url-form input[type="submit"]');
        
        if (show) {
            if (submitBtn) {
                submitBtn.value = 'Processing...';
                submitBtn.disabled = true;
            }
            if (urlSubmitBtn) {
                urlSubmitBtn.value = 'Processing...';
                urlSubmitBtn.disabled = true;
            }
        } else {
            if (submitBtn) {
                submitBtn.value = 'Process Document';
                submitBtn.disabled = false;
            }
            if (urlSubmitBtn) {
                urlSubmitBtn.value = 'Process';
                urlSubmitBtn.disabled = false;
            }
        }
    }

    showError(message) {
        const errorSection = document.getElementById('error-section');
        const errorMessage = document.getElementById('error-message');
        
        if (errorSection && errorMessage) {
            errorMessage.textContent = message;
            errorSection.style.display = 'block';
        }
    }

    hideError() {
        const errorSection = document.getElementById('error-section');
        if (errorSection) {
            errorSection.style.display = 'none';
        }
    }

    hideResults() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    // Utility methods
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    calculateProcessingTime(processedAt) {
        const now = new Date();
        const processed = new Date(processedAt);
        const diff = now - processed;
        
        if (diff < 1000) return 'Just now';
        if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
        return `${Math.floor(diff / 60000)}m ago`;
    }

    loadProcessingHistory() {
        try {
            const saved = localStorage.getItem('ocr_processing_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load processing history:', error);
            return [];
        }
    }

    saveProcessingHistory() {
        try {
            localStorage.setItem('ocr_processing_history', JSON.stringify(this.processingHistory));
        } catch (error) {
            console.warn('Failed to save processing history:', error);
        }
    }
}

// Initialize OCR tool when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.OCRTool = new OCRTool();
});

// Add CSS for OCR-specific styles
const ocrStyles = `
.drag-over {
    border: 2px dashed #4299e1 !important;
    background-color: #ebf8ff !important;
}

.word-analysis {
    line-height: 2;
    margin: 1rem 0;
}

.word-confidence {
    padding: 2px 4px;
    border-radius: 3px;
    margin: 1px;
    display: inline-block;
}

.word-confidence.high {
    background-color: #c6f6d5;
    color: #22543d;
}

.word-confidence.medium {
    background-color: #feebc8;
    color: #c05621;
}

.word-confidence.low {
    background-color: #fed7d7;
    color: #c53030;
}

.processing-history-list {
    list-style: none;
    padding: 0;
}

.processing-history-list li {
    padding: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 0.5rem;
}

.processing-history-list .meta {
    font-size: 0.8em;
    color: #718096;
}

.message.error {
    background-color: #fed7d7;
    color: #c53030;
    padding: 1rem;
    border-radius: 4px;
    border-left: 4px solid #e53e3e;
}

#extracted-text {
    background-color: #f7fafc;
    border: 1px solid #e2e8f0;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.4;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = ocrStyles;
document.head.appendChild(styleSheet);
