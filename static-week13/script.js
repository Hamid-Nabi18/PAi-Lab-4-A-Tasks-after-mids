// ========== DOM Elements ==========
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');

// ========== State ==========
let currentTheme = localStorage.getItem('hadithbot-theme') || 'light';
let isProcessing = false;

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    scrollToBottom();
});

// ========== Theme Management ==========
themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('hadithbot-theme', currentTheme);
});

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
}

// ========== Event Listeners ==========
sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Suggestion chips click handler
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('suggestion-chip')) {
        userInput.value = e.target.textContent;
        handleSendMessage();
    }
});

// ========== Message Handling ==========
async function handleSendMessage() {
    if (isProcessing) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    // Clear input
    userInput.value = '';
    userInput.focus();
    
    // Add user message
    addMessage(message, 'user');
    
    // Show loading
    isProcessing = true;
    showTypingIndicator();
    
    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: message })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        if (data.error) {
            addMessage('Sorry, an error occurred. Please try again.', 'bot');
        } else if (!data.has_results) {
            addMessage(data.answer || 'No relevant Hadith found. Please try a different question.', 'bot');
        } else {
            // Add main Hadith result
            addHadithMessage(data.main_hadith, data.supporting_hadiths);
        }
    } catch (error) {
        removeTypingIndicator();
        addMessage('Sorry, something went wrong. Please try again.', 'bot');
        console.error('Error:', error);
    } finally {
        isProcessing = false;
    }
}

// ========== Add Messages ==========
function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-avatar ${type}-avatar">${type === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content">
            <div class="message-bubble">
                <p>${escapeHtml(text)}</p>
            </div>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addHadithMessage(mainHadith, supportingHadiths) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let supportingHtml = '';
    if (supportingHadiths && supportingHadiths.length > 0) {
        supportingHtml = `
            <div class="supporting-title">📚 Supporting Hadith</div>
            ${supportingHadiths.map(h => `
                <div class="hadith-card">
                    <div class="hadith-source">
                        <span class="source-tag">${escapeHtml(h.source)}</span>
                        <span class="source-tag gold">Hadith #${h.hadith_no}</span>
                    </div>
                    <p class="hadith-text">${escapeHtml(truncateText(h.text, 300))}</p>
                </div>
            `).join('')}
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar bot-avatar">🤖</div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="hadith-source" style="margin-bottom: 12px;">
                    <span class="source-tag">${escapeHtml(mainHadith.source)}</span>
                    <span class="source-tag gold">Hadith #${mainHadith.hadith_no}</span>
                </div>
                <div class="hadith-card">
                    <p class="hadith-text">${escapeHtml(mainHadith.text)}</p>
                </div>
                <p style="margin-top: 8px; font-size: 12px; color: var(--text-light);">
                    📖 <strong>Chapter:</strong> ${escapeHtml(mainHadith.chapter)}
                </p>
                ${supportingHtml}
            </div>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

// ========== Typing Indicator ==========
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar bot-avatar">🤖</div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        </div>
    `;
    chatContainer.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// ========== Utilities ==========
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ========== Voice Input (Optional Feature) ==========
const voiceBtn = document.querySelector('.voice-btn');
if (voiceBtn && 'webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    voiceBtn.addEventListener('click', () => {
        recognition.start();
        voiceBtn.style.color = 'var(--primary-green)';
    });
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        voiceBtn.style.color = 'var(--text-light)';
    };
    
    recognition.onerror = () => {
        voiceBtn.style.color = 'var(--text-light)';
    };
    
    recognition.onend = () => {
        voiceBtn.style.color = 'var(--text-light)';
    };
} else if (voiceBtn) {
    voiceBtn.style.display = 'none';
}