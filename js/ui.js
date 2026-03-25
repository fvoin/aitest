// UI controller for handling user interactions and display updates
class UI {
    constructor() {
        this.currentAnswer = '';
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.setupKeypad();
        this.setupTouchFeedback();
    }

    setupTouchFeedback() {
        // Setup touch feedback for all interactive buttons
        const buttons = document.querySelectorAll('button, .key-btn, .operation-btn, .primary-btn, .secondary-btn');
        
        buttons.forEach(button => {
            // Add touchstart event
            button.addEventListener('touchstart', (e) => {
                button.classList.add('pressed');
            }, { passive: true });
            
            // Add touchend event
            button.addEventListener('touchend', (e) => {
                button.classList.remove('pressed');
            }, { passive: true });
            
            // Add touchcancel event (in case touch is interrupted)
            button.addEventListener('touchcancel', (e) => {
                button.classList.remove('pressed');
            }, { passive: true });
        });
    }

    setupKeypad() {
        document.querySelectorAll('.key-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.key;
                this.handleKeyPress(key);
            });
        });
    }

    handleKeyPress(key) {
        // Disable input while processing answer
        if (this.isProcessing) {
            return;
        }
        
        if (key === 'clear') {
            this.clearAnswer();
        } else if (key === 'ok') {
            if (this.currentAnswer !== '') {
                this.isProcessing = true;
                game.checkAnswer(this.currentAnswer);
            }
        } else {
            // Number key
            this.currentAnswer += key;
            this.updateAnswerDisplay();
        }
    }
    
    enableInput() {
        this.isProcessing = false;
    }
    
    disableInput() {
        this.isProcessing = true;
    }

    updateAnswerDisplay() {
        document.getElementById('answer-display').textContent = this.currentAnswer;
    }

    clearAnswer() {
        this.currentAnswer = '';
        this.updateAnswerDisplay();
    }

    updateQuestion(questionText = '', currentNum, total) {
        const questionElement = document.getElementById('question');
        questionElement.textContent = questionText;
        document.getElementById('question-number').textContent = currentNum;
        
        // Add word-problem class for longer text (word problems)
        if (questionText && questionText.length > 30) {
            questionElement.classList.add('word-problem');
        } else {
            questionElement.classList.remove('word-problem');
        }
    }

    updateTimer(seconds) {
        const timerDisplay = document.getElementById('timer-display');
        if (seconds === '' || seconds === 0) {
            timerDisplay.textContent = '';
        } else {
            timerDisplay.textContent = `${seconds}s`;
        }
    }

    showTimerWarning(show) {
        const timerDisplay = document.getElementById('timer-display');
        if (show) {
            timerDisplay.classList.add('warning');
        } else {
            timerDisplay.classList.remove('warning');
        }
    }

    showFeedback(isCorrect, correctAnswer = null) {
        const overlay = document.getElementById('feedback-overlay');
        overlay.innerHTML = '';
        
        const content = document.createElement('div');
        content.className = 'feedback-content';
        
        // Get avatar SVG
        const avatarSVG = typeof AvatarManager !== 'undefined' ? AvatarManager.getSVG(80) : '';
        
        if (isCorrect) {
            content.classList.add('correct');
            const scene = this.getWinScene(avatarSVG);
            content.innerHTML = `
                <div class="feedback-scene">${scene}</div>
                <div class="feedback-text">✓ Correct!</div>
            `;
        } else {
            content.classList.add('incorrect');
            const scene = this.getLoseScene(avatarSVG);
            let message = correctAnswer !== null 
                ? `✗ Wrong!<br><span class="correct-answer">Answer: ${correctAnswer}</span>`
                : '✗ Time\'s up!';
            content.innerHTML = `
                <div class="feedback-scene">${scene}</div>
                <div class="feedback-text">${message}</div>
            `;
        }
        
        overlay.appendChild(content);
        overlay.classList.add('show');
        
        setTimeout(() => {
            overlay.classList.remove('show');
        }, 2500);
    }

    hideFeedback() {
        const overlay = document.getElementById('feedback-overlay');
        overlay.classList.remove('show');
        overlay.innerHTML = '';
    }

    getWinScene(avatarSVG) {
        const scenes = ['chocolate', 'dog', 'trampoline'];
        const scene = scenes[Math.floor(Math.random() * scenes.length)];
        
        switch(scene) {
            case 'chocolate':
                return `
                    <div class="mini-scene cookie-scene">
                        <div class="avatar-wrapper eating">${avatarSVG}</div>
                        <div class="cookie-prop">
                            <svg viewBox="0 0 50 50" width="40" height="40">
                                <circle cx="25" cy="25" r="22" fill="#D2691E"/>
                                <circle cx="25" cy="25" r="20" fill="#DEB887"/>
                                <circle cx="15" cy="18" r="4" fill="#4A3728"/>
                                <circle cx="30" cy="15" r="3" fill="#4A3728"/>
                                <circle cx="20" cy="30" r="4" fill="#4A3728"/>
                                <circle cx="33" cy="28" r="3" fill="#4A3728"/>
                                <circle cx="25" cy="38" r="3" fill="#4A3728"/>
                                <circle cx="12" cy="32" r="2" fill="#4A3728"/>
                            </svg>
                        </div>
                        <div class="yum-text">Yammi!</div>
                    </div>`;
            case 'dog':
                return `
                    <div class="mini-scene dog-scene">
                        <div class="avatar-wrapper dancing">${avatarSVG}</div>
                        <div class="dancing-dog">
                            <svg viewBox="0 0 60 45" width="55" height="45">
                                <ellipse cx="30" cy="28" rx="18" ry="10" fill="#D2691E"/>
                                <circle cx="48" cy="20" r="9" fill="#D2691E"/>
                                <ellipse cx="42" cy="12" rx="4" ry="6" fill="#8B4513"/>
                                <ellipse cx="54" cy="12" rx="4" ry="6" fill="#8B4513"/>
                                <circle cx="45" cy="18" r="1.5" fill="#000"/>
                                <circle cx="51" cy="18" r="1.5" fill="#000"/>
                                <circle cx="52" cy="22" r="2" fill="#000"/>
                                <path d="M12 25 Q5 18 8 10" stroke="#D2691E" stroke-width="3" fill="none"/>
                                <rect x="20" y="35" width="4" height="8" rx="1" fill="#8B4513"/>
                                <rect x="28" y="35" width="4" height="8" rx="1" fill="#8B4513"/>
                                <rect x="36" y="35" width="4" height="8" rx="1" fill="#8B4513"/>
                                <path d="M54 24 Q56 30 52 32" fill="#FF69B4"/>
                            </svg>
                        </div>
                        <div class="music-notes">
                            <span class="note n1">♪</span>
                            <span class="note n2">♫</span>
                            <span class="note n3">♪</span>
                        </div>
                    </div>`;
            case 'trampoline':
                return `
                    <div class="mini-scene trampoline-scene">
                        <div class="avatar-wrapper bouncing">${avatarSVG}</div>
                        <div class="trampoline-prop">
                            <svg viewBox="0 0 100 30" width="110" height="35">
                                <path d="M8 25 L15 8 L85 8 L92 25" stroke="#333" stroke-width="3" fill="none"/>
                                <path d="M15 8 L10 25" stroke="#888" stroke-width="1.5"/>
                                <path d="M85 8 L90 25" stroke="#888" stroke-width="1.5"/>
                                <path class="tramp-surface" d="M18 10 Q50 16 82 10" stroke="#4ECDC4" stroke-width="4" fill="none"/>
                            </svg>
                        </div>
                        <div class="boing-text">Yoohoo!</div>
                    </div>`;
        }
    }

    getLoseScene(avatarSVG) {
        const scenes = ['computer', 'cat', 'flood'];
        const scene = scenes[Math.floor(Math.random() * scenes.length)];
        
        switch(scene) {
            case 'computer':
                return `
                    <div class="mini-scene computer-scene">
                        <div class="avatar-wrapper smashing">
                            ${avatarSVG}
                            <div class="bat-prop">
                                <svg viewBox="0 0 50 15" width="45" height="14">
                                    <rect x="0" y="6" width="25" height="3" fill="#8B4513"/>
                                    <path d="M22 0 L50 0 L50 15 L22 15 Z" fill="#A0522D" rx="2"/>
                                </svg>
                            </div>
                        </div>
                        <div class="computer-prop breaking">
                            <svg viewBox="0 0 50 45" width="50" height="45">
                                <rect x="3" y="3" width="44" height="28" rx="2" fill="#333"/>
                                <rect x="6" y="6" width="38" height="22" fill="#4A90D9"/>
                                <path class="crack" d="M25 15 L22 8 M25 15 L30 10 M25 15 L24 22" stroke="#fff" stroke-width="1.5"/>
                                <rect x="18" y="31" width="14" height="4" fill="#333"/>
                                <rect x="14" y="35" width="22" height="3" rx="1" fill="#333"/>
                            </svg>
                        </div>
                        <div class="smash-text">SMASH!</div>
                        <div class="spark-effects">
                            <span class="spark s1">✦</span>
                            <span class="spark s2">✧</span>
                            <span class="spark s3">✦</span>
                        </div>
                    </div>`;
            case 'cat':
                return `
                    <div class="mini-scene cat-scene">
                        <div class="avatar-wrapper kicking">${avatarSVG}</div>
                        <div class="flying-cat">
                            <svg viewBox="0 0 45 35" width="45" height="35">
                                <ellipse cx="22" cy="22" rx="14" ry="8" fill="#FFA500"/>
                                <circle cx="35" cy="16" r="7" fill="#FFA500"/>
                                <path d="M30 10 L33 4 L36 10" fill="#FFA500"/>
                                <path d="M38 10 L41 4 L44 10" fill="#FFA500"/>
                                <path d="M32 14 L35 16" stroke="#000" stroke-width="1.5"/>
                                <path d="M38 14 L35 16" stroke="#000" stroke-width="1.5"/>
                                <circle cx="37" cy="18" r="1.5" fill="#FF69B4"/>
                                <path d="M8 22 Q2 16 5 8" stroke="#FFA500" stroke-width="3" fill="none"/>
                            </svg>
                        </div>
                        <div class="meow-text">MEOW!</div>
                    </div>`;
            case 'flood':
                return `
                    <div class="mini-scene flood-scene">
                        <div class="avatar-wrapper crying">
                            ${avatarSVG}
                            <div class="tear t1"></div>
                            <div class="tear t2"></div>
                        </div>
                        <div class="mini-house">
                            <svg viewBox="0 0 60 50" width="55" height="45">
                                <rect x="10" y="22" width="40" height="28" fill="#DEB887"/>
                                <path d="M5 22 L30 3 L55 22 Z" fill="#8B0000"/>
                                <rect x="23" y="32" width="14" height="18" fill="#654321"/>
                                <rect x="14" y="28" width="10" height="10" fill="#87CEEB"/>
                                <rect x="36" y="28" width="10" height="10" fill="#87CEEB"/>
                            </svg>
                        </div>
                        <div class="water-rise"></div>
                        <div class="wahh-text">WAAHH!</div>
                    </div>`;
        }
    }

    fadeOut(callback) {
        const container = document.querySelector('.question-container');
        container.classList.add('fade-out');
        
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }

    fadeIn(callback) {
        const container = document.querySelector('.question-container');
        
        // Update content while faded out
        if (callback) {
            callback();
        }
        
        // Then fade in after content is updated
        setTimeout(() => {
            container.classList.remove('fade-out');
        }, 50);
    }

    showHint(hintText) {
        const hintsElement = document.getElementById('training-hints');
        const hintTextElement = document.getElementById('hint-text');
        hintTextElement.textContent = hintText;
        hintsElement.style.display = 'flex';
    }

    hideHint() {
        const hintsElement = document.getElementById('training-hints');
        hintsElement.style.display = 'none';
    }

    showMultiplicationTable() {
        const modal = document.getElementById('multiplication-table-modal');
        const tableContainer = document.getElementById('multiplication-table');
        
        // Generate multiplication table if not already generated
        if (tableContainer.children.length === 0) {
            this.generateMultiplicationTable(tableContainer);
        }
        
        modal.style.display = 'flex';
    }

    hideMultiplicationTable() {
        const modal = document.getElementById('multiplication-table-modal');
        modal.style.display = 'none';
    }

    generateMultiplicationTable(container) {
        // Create header row
        container.innerHTML = '';
        
        // Corner cell
        const cornerCell = document.createElement('div');
        cornerCell.className = 'table-cell corner';
        cornerCell.textContent = '×';
        container.appendChild(cornerCell);
        
        // Top header (1-10)
        for (let i = 1; i <= 10; i++) {
            const cell = document.createElement('div');
            cell.className = 'table-cell header';
            cell.textContent = i;
            container.appendChild(cell);
        }
        
        // Generate rows
        for (let row = 1; row <= 10; row++) {
            // Row header
            const headerCell = document.createElement('div');
            headerCell.className = 'table-cell header';
            headerCell.textContent = row;
            container.appendChild(headerCell);
            
            // Row cells
            for (let col = 1; col <= 10; col++) {
                const cell = document.createElement('div');
                cell.className = 'table-cell';
                cell.textContent = row * col;
                container.appendChild(cell);
            }
        }
    }
}

// Initialize UI instance
const ui = new UI();
