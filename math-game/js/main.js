// Main application controller
class MathGameApp {
    constructor() {
        this.currentScreen = 'main-menu';
        this.selectedOperation = null;
        this.userName = null;
        this.gameHistory = [];
        this.lastGameSettings = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.checkFirstVisit();
        // Initialize Avatar
        if (typeof AvatarManager !== 'undefined') {
            AvatarManager.init();
        }
        // Initialize Prize Manager
        if (typeof PrizeManager !== 'undefined') {
            PrizeManager.init();
        }
        // Initialize Battle Game
        if (typeof battleGame !== 'undefined') {
            battleGame.init();
        }
    }

    loadUserData() {
        // Load user name
        this.userName = localStorage.getItem('mathGameUserName');
        
        // Load game history
        const historyJson = localStorage.getItem('mathGameHistory');
        this.gameHistory = historyJson ? JSON.parse(historyJson) : [];
        
        // Update greeting
        if (this.userName) {
            document.getElementById('greeting').textContent = `Hello, ${this.userName}!`;
        }
    }

    checkFirstVisit() {
        if (!this.userName) {
            // Show name input modal
            document.getElementById('name-modal').style.display = 'flex';
        } else {
            // Hide name modal if it's showing
            document.getElementById('name-modal').style.display = 'none';
        }
    }

    saveUserName(name) {
        this.userName = name;
        localStorage.setItem('mathGameUserName', name);
        document.getElementById('greeting').textContent = `Hello, ${name}!`;
        document.getElementById('name-modal').style.display = 'none';
    }

    saveGameResult(operation, rangeOrGrade, timer, trainingMode, score, total, cancelled = false, coinsAwarded = 0) {
        const gameData = {
            operation,
            rangeOrGrade,
            timer,
            trainingMode,
            score,
            total,
            percentage: Math.round((score / total) * 100),
            cancelled,
            coinsAwarded,
            date: new Date().toISOString()
        };
        
        this.gameHistory.unshift(gameData); // Add to beginning
        
        // Keep only last 50 games
        if (this.gameHistory.length > 50) {
            this.gameHistory = this.gameHistory.slice(0, 50);
        }
        
        localStorage.setItem('mathGameHistory', JSON.stringify(this.gameHistory));
    }

    resetHistory() {
        localStorage.removeItem('mathGameHistory');
        this.gameHistory = [];
        this.showStatsScreen();
    }

    resetAvatar() {
        localStorage.removeItem('mathGameUserName');
        localStorage.removeItem('mathGameAvatar');
        this.userName = null;
        if (typeof AvatarManager !== 'undefined') {
            AvatarManager.reset();
        }
        document.getElementById('greeting').textContent = 'Hello!';
        this.showScreen('main-menu');
        // Show name modal again
        setTimeout(() => {
            document.getElementById('name-modal').style.display = 'flex';
        }, 300);
    }

    resetAll() {
        // Clear all app-related localStorage items
        localStorage.removeItem('mathGameUserName');
        localStorage.removeItem('mathGameAvatar');
        localStorage.removeItem('math-game-avatar');
        localStorage.removeItem('mathGameHistory');
        localStorage.removeItem('mathGamePrize');
        
        // Reload the page to start fresh
        window.location.reload();
    }

    setupEventListeners() {
        // Operation buttons
        document.querySelectorAll('.operation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedOperation = e.currentTarget.dataset.operation;
                
                // Toggle between Range and Grade based on mode
                if (this.selectedOperation === 'questions' || this.selectedOperation === 'balloons') {
                    document.getElementById('range-group').style.display = 'none';
                    document.getElementById('grade-group').style.display = 'flex';
                    document.getElementById('training-toggle-group').style.display = 'none';
                } else {
                    document.getElementById('range-group').style.display = 'flex';
                    document.getElementById('grade-group').style.display = 'none';
                    document.getElementById('training-toggle-group').style.display = 'flex';
                }
                
                // Update timer options based on mode
                this.updateTimerOptions(this.selectedOperation);
                
                this.showScreen('settings-screen');
            });
        });

        // Back to menu button
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // Start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            const timer = parseInt(document.getElementById('timer-select').value);
            
            let rangeOrGrade, trainingMode;
            if (this.selectedOperation === 'questions' || this.selectedOperation === 'balloons') {
                rangeOrGrade = document.getElementById('grade-select').value;
                trainingMode = false;
            } else {
                rangeOrGrade = document.getElementById('range-select').value;
                trainingMode = document.getElementById('training-mode-toggle').checked;
            }
            
            if (this.selectedOperation === 'balloons') {
                this.showScreen('balloons-screen');
                balloonsGame.startGame(rangeOrGrade, timer);
            } else {
                game.startNewGame(this.selectedOperation, rangeOrGrade, timer, trainingMode);
                this.showScreen('game-screen');
            }
        });

        // Home button from game screen
        document.getElementById('home-btn').addEventListener('click', () => {
            this.showConfirmation(
                'Quit Game?',
                'Are you sure you want to quit the game? Your progress will be lost.',
                () => {
                    // Save cancelled game to history
                    this.saveGameResult(
                        game.operation,
                        game.range,
                        game.timerSeconds,
                        game.trainingMode,
                        game.score,
                        game.totalQuestions,
                        true // cancelled flag
                    );
                    game.endGame();
                    this.showScreen('main-menu');
                },
                'Yes, Quit'
            );
        });

        // Balloons home button
        document.getElementById('balloons-home-btn').addEventListener('click', () => {
            this.showConfirmation(
                'Quit Game?',
                'Are you sure you want to quit the game? Your progress will be lost.',
                () => {
                    balloonsGame.endGame();
                    this.showScreen('main-menu');
                },
                'Yes, Quit'
            );
        });

        // Battle home button
        document.getElementById('battle-home-btn').addEventListener('click', () => {
            this.showConfirmation(
                'Quit Find Friends?',
                'Are you sure you want to quit? Your progress will be lost.',
                () => {
                    battleGame.stopGame();
                    this.showScreen('main-menu');
                },
                'Yes, Quit'
            );
        });

        // Play again button - replay with same settings
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.replayLastGame();
        });

        // Main menu button from results
        document.getElementById('main-menu-btn').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // Multiplication table button
        document.getElementById('show-table-btn').addEventListener('click', () => {
            ui.showMultiplicationTable();
        });

        // Close multiplication table
        document.getElementById('close-table-btn').addEventListener('click', () => {
            ui.hideMultiplicationTable();
        });

        // Close modal when clicking outside
        document.getElementById('multiplication-table-modal').addEventListener('click', (e) => {
            if (e.target.id === 'multiplication-table-modal') {
                ui.hideMultiplicationTable();
            }
        });

        // Confirmation modal buttons
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
            this.hideConfirmation();
        });

        document.getElementById('confirm-ok-btn').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
                this.confirmCallback = null;
            }
            this.hideConfirmation();
        });

        // Close confirmation modal when clicking outside
        document.getElementById('confirmation-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmation-modal') {
                this.hideConfirmation();
            }
        });

        // Name input save button
        document.getElementById('save-name-btn').addEventListener('click', () => {
            const nameInput = document.getElementById('name-input');
            const name = nameInput.value.trim();
            if (name) {
                this.saveUserName(name);
            } else {
                alert('Please enter your name!');
            }
        });

        // Allow Enter key to save name
        document.getElementById('name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('save-name-btn').click();
            }
        });

        // Stats button
        document.getElementById('stats-btn').addEventListener('click', () => {
            this.showStatsScreen();
        });

        // Back from stats button
        document.getElementById('back-from-stats-btn').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // Reset history button
        document.getElementById('reset-history-btn').addEventListener('click', () => {
            this.showConfirmation(
                'Reset History?',
                'This will delete all your game history. This action cannot be undone.',
                () => this.resetHistory(),
                'Yes, Reset'
            );
        });

        // Reset avatar button
        document.getElementById('reset-avatar-btn').addEventListener('click', () => {
            this.showConfirmation(
                'Reset Avatar & Name?',
                'This will reset your avatar and delete your name. You will need to enter your name again.',
                () => this.resetAvatar(),
                'Yes, Reset'
            );
        });

        // Reset all button - clears all app data
        document.getElementById('reset-all-btn').addEventListener('click', () => {
            this.showConfirmation(
                'Reset Everything?',
                'This will clear ALL data: history, avatar, name, prize progress, and all settings. The page will reload.',
                () => this.resetAll(),
                'Yes, Reset All'
            );
        });

        // Settings change listeners for coin indicator
        document.getElementById('range-select').addEventListener('change', () => this.updateCoinIndicator());
        document.getElementById('grade-select').addEventListener('change', () => this.updateCoinIndicator());
        document.getElementById('timer-select').addEventListener('change', () => this.updateCoinIndicator());
        document.getElementById('training-mode-toggle').addEventListener('change', () => this.updateCoinIndicator());

        // Avatar click to open editor
        const avatarMain = document.getElementById('avatar-main');
        if (avatarMain) {
            avatarMain.addEventListener('click', () => {
                AvatarManager.openEditor();
            });
        }

        // Close avatar editor
        const closeAvatarBtn = document.getElementById('close-avatar-btn');
        if (closeAvatarBtn) {
            closeAvatarBtn.addEventListener('click', () => {
                document.getElementById('avatar-modal').style.display = 'none';
            });
        }

        // Save avatar button
        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        if (saveAvatarBtn) {
            saveAvatarBtn.addEventListener('click', () => {
                AvatarManager.save();
                document.getElementById('avatar-modal').style.display = 'none';
            });
        }
    }

    showConfirmation(title, message, callback, confirmText = 'Yes, Confirm') {
        document.getElementById('confirmation-title').textContent = title;
        document.getElementById('confirmation-message').textContent = message;
        document.getElementById('confirm-ok-btn').textContent = confirmText;
        this.confirmCallback = callback;
        document.getElementById('confirmation-modal').style.display = 'flex';
    }

    hideConfirmation() {
        document.getElementById('confirmation-modal').style.display = 'none';
        this.confirmCallback = null;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
        
        // Update coin indicator when showing settings screen
        if (screenId === 'settings-screen') {
            this.updateCoinIndicator();
        }
    }

    updateCoinIndicator() {
        const indicator = document.getElementById('coin-indicator');
        const valueSpan = document.getElementById('coin-indicator-value');
        
        if (!indicator || typeof PrizeManager === 'undefined' || !PrizeManager.prize) {
            if (indicator) indicator.style.display = 'none';
            return;
        }

        // Get current settings
        const trainingMode = document.getElementById('training-mode-toggle').checked;
        
        // No coins in training mode
        if (trainingMode && this.selectedOperation !== 'questions' && this.selectedOperation !== 'balloons') {
            indicator.style.display = 'none';
            return;
        }

        let rangeOrGrade;
        if (this.selectedOperation === 'questions' || this.selectedOperation === 'balloons') {
            rangeOrGrade = document.getElementById('grade-select').value;
        } else {
            rangeOrGrade = document.getElementById('range-select').value;
        }
        
        const timer = parseInt(document.getElementById('timer-select').value);

        // Check if this combination pays coins
        const coins = PrizeManager.findCoinsForSettings(this.selectedOperation, rangeOrGrade, timer);
        
        if (coins > 0) {
            indicator.style.display = 'flex';
            valueSpan.textContent = `+${coins} coins (8/10+)`;
        } else {
            indicator.style.display = 'none';
        }
    }

    // Start game directly with specific settings (used by prize task buttons)
    startGameWithSettings(operation, rangeOrGrade, timer) {
        // Store the settings for game completion tracking and replay
        this.selectedOperation = operation;
        this.lastGameSettings = {
            operation: operation,
            rangeOrGrade: rangeOrGrade,
            timer: timer
        };
        
        if (operation === 'balloons') {
            this.showScreen('balloons-screen');
            balloonsGame.startGame(rangeOrGrade, timer);
        } else if (operation === 'battle') {
            this.showScreen('battle-screen');
            battleGame.startGame(rangeOrGrade, timer);
        } else {
            // No training mode when playing prize tasks
            game.startNewGame(operation, rangeOrGrade, timer, false);
            this.showScreen('game-screen');
        }
    }

    // Replay the last game with same settings
    replayLastGame() {
        if (this.lastGameSettings) {
            const { operation, rangeOrGrade, timer } = this.lastGameSettings;
            this.startGameWithSettings(operation, rangeOrGrade, timer);
        } else {
            // Fallback to main menu if no last game
            this.showScreen('main-menu');
        }
    }

    updateTimerOptions(operation) {
        const timerSelect = document.getElementById('timer-select');
        timerSelect.innerHTML = '';
        
        if (operation === 'balloons') {
            // Balloons mode: 30s, 60s, 120s, No timer
            const options = [
                { value: '30', text: '30 seconds' },
                { value: '60', text: '60 seconds' },
                { value: '120', text: '120 seconds' },
                { value: '0', text: 'No timer' }
            ];
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                timerSelect.appendChild(option);
            });
        } else {
            // Regular modes: 10s, 30s, 60s, No timer
            const options = [
                { value: '10', text: '10 seconds' },
                { value: '30', text: '30 seconds' },
                { value: '60', text: '60 seconds' },
                { value: '0', text: 'No timer' }
            ];
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                timerSelect.appendChild(option);
            });
        }
    }

    showResults(score, total) {
        const percentage = (score / total) * 100;
        let message = '';
        let inspirationalPhrase = '';
        
        if (percentage === 100) {
            message = 'Perfect! 🌟';
            const phrases = [
                'Outstanding! You\'re a math superstar!',
                'Incredible! You got every single one right!',
                'Flawless victory! You\'re amazing at math!',
                'Perfect score! Your dedication is paying off!'
            ];
            inspirationalPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        } else if (percentage >= 80) {
            message = 'Excellent! 🎉';
            const phrases = [
                'Great job! You\'re really mastering this!',
                'Fantastic work! Keep up the excellent effort!',
                'You\'re doing wonderfully! Almost perfect!',
                'Impressive! Your skills are really shining!'
            ];
            inspirationalPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        } else if (percentage >= 60) {
            message = 'Good Job! 👍';
            const phrases = [
                'Good work! Practice makes perfect!',
                'You\'re making great progress! Keep it up!',
                'Nice effort! You\'re learning and improving!',
                'Well done! Every question makes you stronger!'
            ];
            inspirationalPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        } else if (percentage >= 40) {
            message = 'Keep Practicing! 💪';
            const phrases = [
                'Keep going! Every attempt makes you better!',
                'Don\'t give up! You\'re on the right path!',
                'Practice more and you\'ll get there!',
                'Believe in yourself! You can do this!'
            ];
            inspirationalPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        } else {
            message = 'Try Again! 📚';
            const phrases = [
                'Don\'t worry! Learning takes time and practice!',
                'Keep trying! Every mistake is a lesson learned!',
                'You can do it! Practice makes perfect!',
                'Never give up! Your hard work will pay off!'
            ];
            inspirationalPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        }

        // Update score display
        document.getElementById('result-message').textContent = message;
        document.getElementById('final-score').textContent = `${score}/${total}`;
        document.getElementById('inspirational-phrase').textContent = inspirationalPhrase;
        
        // Update game settings display
        this.updateSettingsDisplay();
        
        // Show training mode indicator if applicable
        const trainingIndicator = document.getElementById('training-mode-indicator');
        if (game.trainingMode) {
            trainingIndicator.style.display = 'flex';
        } else {
            trainingIndicator.style.display = 'none';
        }
        
        // Check for prize coin rewards (only for non-training mode)
        let coinsAwarded = 0;
        if (!game.trainingMode && typeof PrizeManager !== 'undefined') {
            const reward = PrizeManager.checkAndAwardCoins(
                game.operation,
                game.range,
                game.timerSeconds,
                score,
                total
            );
            if (reward.awarded) {
                coinsAwarded = reward.coins;
                PrizeManager.showCoinAnimation(reward.coins);
            }
        }

        // Save game result to history (with coins awarded)
        this.saveGameResult(
            game.operation,
            game.range,
            game.timerSeconds,
            game.trainingMode,
            score,
            total,
            false,
            coinsAwarded
        );
        
        this.showScreen('results-screen');
    }

    showBattleResults(score, total, won) {
        const percentage = Math.round((score / total) * 100);
        let message, phrase;

        if (won && percentage === 100)    { message = 'Perfect! 🌟'; phrase = 'You found all your friends!'; }
        else if (won)                     { message = 'Victory! 🎉'; phrase = 'All friends rescued — well done!'; }
        else if (percentage >= 60)        { message = 'Good Effort! 👍'; phrase = 'Keep looking — your friends need you!'; }
        else                              { message = 'Try Again! 💪'; phrase = 'Don\'t give up — your friends are waiting!'; }

        document.getElementById('result-message').textContent = message;
        document.getElementById('final-score').textContent = `${score}/${total}`;
        document.getElementById('inspirational-phrase').textContent = phrase;
        document.getElementById('mode-icon').textContent = '🤝';
        document.getElementById('mode-text').textContent = 'Find Friends';
        document.getElementById('range-text').textContent = `Grade ${battleGame.grade}`;
        document.getElementById('timer-text').textContent = battleGame.timerTotal === 0 ? 'No timer' : `${battleGame.timerTotal} seconds`;
        document.getElementById('training-mode-indicator').style.display = 'none';

        // Coins
        let coinsAwarded = 0;
        if (typeof PrizeManager !== 'undefined') {
            const reward = PrizeManager.checkAndAwardCoins('battle', battleGame.grade, battleGame.timerTotal, score, total);
            if (reward.awarded) { coinsAwarded = reward.coins; PrizeManager.showCoinAnimation(reward.coins); }
        }

        this.saveGameResult('battle', battleGame.grade, battleGame.timerTotal, false, score, total, !won, coinsAwarded);
        this.lastGameSettings = { operation: 'battle', rangeOrGrade: battleGame.grade, timer: battleGame.timerTotal };
        this.showScreen('results-screen');
    }

    updateSettingsDisplay() {
        // Operation mode
        const operationNames = {
            'addition': 'Addition',
            'subtraction': 'Subtraction',
            'multiplication': 'Multiplication',
            'division': 'Division',
            'questions': 'Word Problems'
        };
        const operationIcons = {
            'addition': '+',
            'subtraction': '−',
            'multiplication': '×',
            'division': '÷',
            'questions': '?'
        };
        
        document.getElementById('mode-icon').textContent = operationIcons[game.operation] || '+';
        document.getElementById('mode-text').textContent = operationNames[game.operation] || 'Addition';
        
        // Range or Grade
        if (game.operation === 'questions') {
            document.getElementById('range-text').textContent = `Grade ${game.range}`;
        } else {
            document.getElementById('range-text').textContent = game.range.replace('-', ' - ');
        }
        
        // Timer
        const timerText = game.timerSeconds === 0 ? 'No timer' : `${game.timerSeconds} seconds`;
        document.getElementById('timer-text').textContent = timerText;
    }

    showStatsScreen() {
        // Calculate statistics
        const totalGames = this.gameHistory.length;
        let totalScore = 0;
        let bestScore = 0;
        
        this.gameHistory.forEach(game => {
            totalScore += game.percentage;
            if (game.percentage > bestScore) {
                bestScore = game.percentage;
            }
        });
        
        const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
        
        // Update stats summary
        document.getElementById('total-games').textContent = totalGames;
        document.getElementById('total-score').textContent = `${avgScore}%`;
        document.getElementById('best-score').textContent = `${bestScore}%`;
        
        // Populate history list
        const historyList = document.getElementById('history-list');
        
        if (totalGames === 0) {
            historyList.innerHTML = '<p class="empty-message">No games played yet. Start playing to see your history!</p>';
        } else {
            historyList.innerHTML = '';
            
            this.gameHistory.forEach((game, index) => {
                const operationNames = {
                    'addition': 'Addition',
                    'subtraction': 'Subtraction',
                    'multiplication': 'Multiplication',
                    'division': 'Division',
                    'questions': 'Word Problems',
                    'balloons': 'Balloons',
                    'battle': 'Find Friends'
                };
                const operationSVGs = {
                    'addition': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
                    'subtraction': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
                    'multiplication': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
                    'division': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="1.5" fill="currentColor"/><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/></svg>',
                    'questions': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 9C9 7.34315 10.3431 6 12 6C13.6569 6 15 7.34315 15 9C15 10.1217 14.4118 11.1033 13.5 11.6291C12.7996 12.0387 12 12.4214 12 13.5V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>',
                    'balloons': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="10" rx="7" ry="9" stroke="currentColor" stroke-width="2"/><path d="M12 19V24M10 24H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
                    'battle': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="7" r="3" stroke="currentColor" stroke-width="2"/><path d="M4 21v-2a4 4 0 014-4h0M20 21v-2a4 4 0 00-4-4h0" stroke="currentColor" stroke-width="2"/><path d="M12 13v4M10 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
                };
                
                const date = new Date(game.date);
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                const rangeText = (game.operation === 'questions' || game.operation === 'balloons' || game.operation === 'battle')
                    ? `Grade ${game.rangeOrGrade}`
                    : (game.rangeOrGrade ? game.rangeOrGrade.replace('-', ' - ') : 'N/A');
                
                const timerText = game.timer === 0 ? 'No timer' : `${game.timer}s`;
                const trainingText = game.trainingMode ? ' • <svg class="inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L2 8L12 13L22 8L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M2 16L12 21L22 16" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg> Training' : '';
                const cancelledText = game.cancelled ? ' • <span class="cancelled-badge">Cancelled</span>' : '';
                const coinsText = game.coinsAwarded > 0
                    ? ` • <span class="coins-earned-badge">${typeof PrizeManager !== 'undefined' ? PrizeManager.getCoinSvg('inline-coin') : '🪙'} +${game.coinsAwarded}</span>`
                    : '';

                const historyItem = document.createElement('div');
                historyItem.className = game.cancelled ? 'history-item cancelled' : 'history-item';
                historyItem.innerHTML = `
                    <div class="history-header">
                        <span class="history-operation">
                            <span class="operation-icon">${operationSVGs[game.operation]}</span>
                            ${operationNames[game.operation]}
                        </span>
                        <span class="history-score">${game.score}/${game.total} (${game.percentage}%)</span>
                    </div>
                    <div class="history-details">
                        ${rangeText} • ${timerText}${trainingText}${cancelledText}${coinsText}
                    </div>
                    <div class="history-date">${dateStr}</div>
                `;
                
                historyList.appendChild(historyItem);
            });
        }
        
        this.showScreen('stats-screen');
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MathGameApp();
});
