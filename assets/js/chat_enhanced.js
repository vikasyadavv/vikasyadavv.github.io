/**
 * Enhanced Chat Widget System with WhatsApp-like Interface
 * Handles AI assistant interactions with typing indicators and modern UI
 */

class ChatWidget {
    constructor() {
        this.apiUrl = 'https://api.vikasyadav.live';
        this.sessionId = this.generateSessionId();
        this.isOpen = false;
        this.isTyping = false;
        this.messageHistory = [];
        this.typingTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        
        this.init();
    }

    generateSessionId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.bindEvents();
        this.loadChatHistory();
        this.showWelcomeMessage();
        this.addConnectionStatusIndicator();
    }

    bindEvents() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatClose = document.getElementById('chat-close');
        const chatSend = document.getElementById('chat-send');
        const chatInput = document.getElementById('chat-input');

        if (chatToggle) {
            chatToggle.addEventListener('click', () => this.toggleChat());
        }

        if (chatClose) {
            chatClose.addEventListener('click', () => this.closeChat());
        }

        if (chatSend) {
            chatSend.addEventListener('click', () => this.sendMessage());
        }

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                } else {
                    this.showUserTyping();
                }
            });

            chatInput.addEventListener('input', () => {
                this.showUserTyping();
            });
        }

        // Handle visibility change to manage connection
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });
    }

    addConnectionStatusIndicator() {
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            const statusIndicator = document.createElement('div');
            statusIndicator.id = 'connection-status';
            statusIndicator.className = 'connection-status online';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Online';
            chatHeader.appendChild(statusIndicator);
        }
    }

    updateConnectionStatus(status) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = `connection-status ${status}`;
            switch (status) {
                case 'online':
                    statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Online';
                    break;
                case 'connecting':
                    statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Connecting...';
                    break;
                case 'offline':
                    statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Offline';
                    break;
            }
        }
    }

    showUserTyping() {
        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            // User stopped typing
        }, 1000);
    }

    showBotTyping() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot-message typing-indicator';
        typingIndicator.id = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div class="typing-text">AI Assistant is typing...</div>
            </div>
            <div class="message-time">${this.formatTime(new Date())}</div>
        `;

        messagesContainer.appendChild(typingIndicator);
        this.scrollToBottom();
    }

    hideBotTyping() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const chatToggle = document.getElementById('chat-toggle');

        if (this.isOpen) {
            chatWindow.style.display = 'flex';
            chatToggle.classList.add('chat-open');
            this.scrollToBottom();
            this.markMessagesAsRead();
            
            // Focus on input
            setTimeout(() => {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }, 100);
        } else {
            chatWindow.style.display = 'none';
            chatToggle.classList.remove('chat-open');
        }
    }

    closeChat() {
        this.isOpen = false;
        const chatWindow = document.getElementById('chat-window');
        const chatToggle = document.getElementById('chat-toggle');

        chatWindow.style.display = 'none';
        chatToggle.classList.remove('chat-open');
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;

        const message = chatInput.value.trim();
        if (!message) return;

        // Clear input and disable send button
        chatInput.value = '';
        this.setInputDisabled(true);

        // Add user message to chat
        this.addMessage(message, 'user');

        // Show typing indicator
        this.showBotTyping();

        try {
            this.updateConnectionStatus('connecting');
            
            const response = await fetch(`${this.apiUrl}/api/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId,
                    context: this.getContext()
                })
            });

            this.hideBotTyping();
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.sessionId;
                this.addMessage(data.response, 'bot', {
                    suggestions: data.suggestions,
                    timestamp: data.timestamp
                });
                this.updateConnectionStatus('online');
                this.reconnectAttempts = 0;
            } else {
                throw new Error(data.message || 'Failed to get response');
            }

        } catch (error) {
            this.hideBotTyping();
            console.error('Chat error:', error);
            
            this.handleConnectionError(error);
            this.addMessage(
                "I'm having trouble connecting right now. Please try again in a moment.",
                'bot',
                { isError: true }
            );
        } finally {
            this.setInputDisabled(false);
            chatInput.focus();
        }
    }

    handleConnectionError(error) {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.updateConnectionStatus('offline');
        } else {
            this.updateConnectionStatus('connecting');
            // Try to reconnect after a delay
            setTimeout(() => {
                this.updateConnectionStatus('online');
            }, 2000);
        }
    }

    addMessage(content, sender, options = {}) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        const timestamp = options.timestamp || new Date().toISOString();
        const isError = options.isError || false;
        
        messageElement.className = `message ${sender}-message ${isError ? 'error-message' : ''}`;
        
        const messageContent = `
            <div class="message-content">
                ${content}
                ${sender === 'bot' && options.suggestions ? this.createSuggestions(options.suggestions) : ''}
            </div>
            <div class="message-time">${this.formatTime(new Date(timestamp))}</div>
            <div class="message-status">
                ${sender === 'user' ? '<i class="fas fa-check-double delivered"></i>' : ''}
            </div>
        `;

        messageElement.innerHTML = messageContent;

        // Add animation
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(10px)';
        messagesContainer.appendChild(messageElement);

        // Trigger animation
        requestAnimationFrame(() => {
            messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        });

        // Add to message history
        this.messageHistory.push({
            content,
            sender,
            timestamp,
            options
        });

        // Save to localStorage
        this.saveChatHistory();

        // Scroll to bottom
        this.scrollToBottom();

        // Mark message as delivered after a short delay
        if (sender === 'user') {
            setTimeout(() => {
                const status = messageElement.querySelector('.message-status i');
                if (status) {
                    status.classList.add('delivered');
                }
            }, 1000);
        }
    }

    createSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) return '';

        const suggestionsHtml = suggestions.map(suggestion => 
            `<button class="suggestion-btn" onclick="chatWidget.selectSuggestion('${suggestion}')">${suggestion}</button>`
        ).join('');

        return `<div class="message-suggestions">${suggestionsHtml}</div>`;
    }

    selectSuggestion(suggestion) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = suggestion;
            this.sendMessage();
        }
    }

    setInputDisabled(disabled) {
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');

        if (chatInput) {
            chatInput.disabled = disabled;
        }

        if (chatSend) {
            chatSend.disabled = disabled;
            chatSend.innerHTML = disabled ? 
                '<i class="fas fa-spinner fa-spin"></i>' : 
                '<i class="fas fa-paper-plane"></i>';
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    getContext() {
        return {
            page: window.location.pathname,
            referrer: document.referrer,
            messageCount: this.messageHistory.length,
            timestamp: new Date().toISOString()
        };
    }

    markMessagesAsRead() {
        const unreadIndicator = document.querySelector('.unread-indicator');
        if (unreadIndicator) {
            unreadIndicator.remove();
        }
    }

    showWelcomeMessage() {
        if (this.messageHistory.length === 0) {
            setTimeout(() => {
                this.addMessage(
                    "Hello! I'm Vikas's AI assistant. I can help you learn about his work, projects, and blog content. How can I assist you today?",
                    'bot',
                    {
                        suggestions: [
                            "Tell me about Vikas's portfolio",
                            "What are his latest projects?",
                            "Show me recent blog posts",
                            "How can I contact Vikas?"
                        ]
                    }
                );
            }, 1000);
        }
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem(`chat_history_${this.sessionId}`);
            if (saved) {
                this.messageHistory = JSON.parse(saved);
                this.messageHistory.forEach(msg => {
                    this.addMessage(msg.content, msg.sender, msg.options);
                });
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem(
                `chat_history_${this.sessionId}`,
                JSON.stringify(this.messageHistory.slice(-50)) // Keep last 50 messages
            );
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
    }

    handlePageHidden() {
        // Clean up any timers or connections when page is hidden
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
    }

    handlePageVisible() {
        // Reconnect or refresh when page becomes visible
        this.updateConnectionStatus('online');
    }

    // Public method to send a message programmatically
    sendMessageProgrammatically(message) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = message;
            this.sendMessage();
        }
    }

    // Public method to clear chat history
    clearHistory() {
        this.messageHistory = [];
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        localStorage.removeItem(`chat_history_${this.sessionId}`);
        this.showWelcomeMessage();
    }
}

// Initialize chat widget when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chatWidget = new ChatWidget();
});

// Add CSS styles for the enhanced chat widget
const chatStyles = `
.chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-toggle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
    position: relative;
}

.chat-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}

.chat-toggle.chat-open {
    background: #e74c3c;
}

.chat-window {
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 380px;
    height: 500px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-direction: column;
    gap: 5px;
}

.chat-header h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.connection-status {
    font-size: 12px;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 5px;
}

.connection-status.online i { color: #2ecc71; }
.connection-status.connecting i { color: #f39c12; }
.connection-status.offline i { color: #e74c3c; }

.chat-close {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s ease;
    position: absolute;
    top: 15px;
    right: 15px;
}

.chat-close:hover {
    background: rgba(255,255,255,0.2);
}

.chat-messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
    background: #f8f9fa;
}

.message {
    display: flex;
    flex-direction: column;
    max-width: 80%;
    animation: messageSlide 0.3s ease;
}

.user-message {
    align-self: flex-end;
}

.bot-message {
    align-self: flex-start;
}

.message-content {
    padding: 12px 16px;
    border-radius: 18px;
    position: relative;
    word-wrap: break-word;
}

.user-message .message-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 6px;
}

.bot-message .message-content {
    background: white;
    color: #333;
    border: 1px solid #e1e8ed;
    border-bottom-left-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.error-message .message-content {
    background: #ffe6e6;
    border-color: #ff9999;
    color: #d63031;
}

.message-time {
    font-size: 11px;
    color: #95a5a6;
    margin-top: 4px;
    align-self: flex-end;
}

.bot-message .message-time {
    align-self: flex-start;
}

.message-status {
    font-size: 12px;
    color: #95a5a6;
    margin-top: 2px;
    align-self: flex-end;
}

.message-status i.delivered {
    color: #3498db;
}

.typing-indicator .typing-dots {
    display: flex;
    gap: 4px;
    margin-bottom: 5px;
}

.typing-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #bdc3c7;
    animation: typingDots 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

.typing-text {
    font-size: 12px;
    color: #7f8c8d;
    font-style: italic;
}

.message-suggestions {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.suggestion-btn {
    background: #ecf0f1;
    border: 1px solid #bdc3c7;
    border-radius: 12px;
    padding: 6px 12px;
    font-size: 12px;
    color: #2c3e50;
    cursor: pointer;
    transition: all 0.2s ease;
}

.suggestion-btn:hover {
    background: #d5dbdb;
    border-color: #95a5a6;
}

.chat-input-container {
    padding: 20px;
    background: white;
    border-top: 1px solid #e1e8ed;
    display: flex;
    gap: 10px;
    align-items: center;
}

.chat-input-container input {
    flex: 1;
    border: 1px solid #e1e8ed;
    border-radius: 20px;
    padding: 12px 16px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease;
}

.chat-input-container input:focus {
    border-color: #667eea;
}

.chat-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
    transform: scale(1.1);
}

.chat-send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

@keyframes messageSlide {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes typingDots {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-10px); }
}

@media (max-width: 480px) {
    .chat-window {
        width: calc(100vw - 40px);
        height: calc(100vh - 140px);
        bottom: 20px;
        right: 20px;
        left: 20px;
    }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = chatStyles;
document.head.appendChild(styleSheet);
