// Prize Manager - handles prize setup, progress tracking, and coin rewards
class PrizeManagerClass {
    constructor() {
        this.prize = null;
        this.STORAGE_KEY = 'mathGamePrize';
    }

    init() {
        this.load();
        this.updateUI();
        this.setupEventListeners();
    }

    load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.prize = JSON.parse(stored);
            } catch (e) {
                this.prize = null;
            }
        }
    }

    save() {
        if (this.prize) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.prize));
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    // Get mode-specific options
    getModeConfig(mode) {
        const configs = {
            'addition': {
                paramType: 'range',
                ranges: ['0-10', '10-20', '10-50', '10-100', '100-999'],
                timers: [10, 30, 60, 0]
            },
            'subtraction': {
                paramType: 'range',
                ranges: ['0-10', '10-20', '10-50', '10-100', '100-999'],
                timers: [10, 30, 60, 0]
            },
            'multiplication': {
                paramType: 'range',
                ranges: ['0-10', '10-20', '10-50', '10-100', '100-999'],
                timers: [10, 30, 60, 0]
            },
            'division': {
                paramType: 'range',
                ranges: ['0-10', '10-20', '10-50', '10-100', '100-999'],
                timers: [10, 30, 60, 0]
            },
            'questions': {
                paramType: 'grade',
                grades: ['1', '2', '3', '4', '5'],
                timers: [10, 30, 60, 0]
            },
            'balloons': {
                paramType: 'grade',
                grades: ['1', '2', '3', '4', '5'],
                timers: [30, 60, 120, 0]
            },
            'battle': {
                paramType: 'grade',
                grades: ['1', '2', '3', '4', '5'],
                timers: [30, 60, 120, 0]
            }
        };
        return configs[mode] || configs['addition'];
    }

    getModeName(mode) {
        const names = {
            'addition': 'Addition',
            'subtraction': 'Subtraction',
            'multiplication': 'Multiplication',
            'division': 'Division',
            'questions': 'Word Problems',
            'balloons': 'Balloons',
            'battle': 'Find Friends'
        };
        return names[mode] || mode;
    }

    getModeIcon(mode) {
        const icons = {
            'addition': '+',
            'subtraction': '−',
            'multiplication': '×',
            'division': '÷',
            'questions': '?',
            'balloons': '🎈',
            'battle': '🤝'
        };
        return icons[mode] || '+';
    }

    getTimerText(timer) {
        return timer === 0 ? 'No timer' : `${timer}s`;
    }

    getRangeOrGradeText(mode, value) {
        const config = this.getModeConfig(mode);
        if (config.paramType === 'grade') {
            return `Grade ${value}`;
        }
        return value;
    }

    // Check if a game result matches any task and award coins
    checkAndAwardCoins(operation, rangeOrGrade, timer, score, total) {
        if (!this.prize || !this.prize.tasks || this.prize.tasks.length === 0) {
            return { awarded: false, coins: 0 };
        }

        // Need at least 8/10 to earn coins
        if (score < 8 || total < 10) {
            return { awarded: false, coins: 0 };
        }

        // Find matching task
        const matchingTask = this.prize.tasks.find(task => 
            task.mode === operation &&
            task.rangeOrGrade === rangeOrGrade &&
            task.timer === timer
        );

        if (matchingTask && matchingTask.coins > 0) {
            this.prize.currentCoins += matchingTask.coins;
            this.save();
            this.updateUI();
            return { awarded: true, coins: matchingTask.coins };
        }

        return { awarded: false, coins: 0 };
    }

    // Find coins for a specific mode/params combination (for settings screen indicator)
    findCoinsForSettings(operation, rangeOrGrade, timer) {
        if (!this.prize || !this.prize.tasks) {
            return 0;
        }

        const matchingTask = this.prize.tasks.find(task => 
            task.mode === operation &&
            task.rangeOrGrade === rangeOrGrade &&
            task.timer === timer
        );

        return matchingTask ? matchingTask.coins : 0;
    }

    // Check if prize is complete
    isPrizeComplete() {
        return this.prize && this.prize.currentCoins >= this.prize.prizePrice;
    }

    // Reset coins after claiming (keep prize name, price, and tasks)
    claimPrize() {
        if (this.prize) {
            this.prize.currentCoins = 0;
            this.save();
            this.updateUI();
        }
    }

    // Update the UI based on current prize state
    updateUI() {
        this.updatePrizeArea();
        this.updateTaskButtons();
    }

    updatePrizeArea() {
        const prizeArea = document.getElementById('prize-area');
        if (!prizeArea) return;

        if (!this.prize) {
            // Show setup button in prize area
            prizeArea.innerHTML = `
                <button id="setup-prize-btn" class="prize-setup-btn" title="Setup a prize goal">
                    <svg class="prize-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 8V21" stroke="currentColor" stroke-width="2"/>
                        <path d="M3 13H21" stroke="currentColor" stroke-width="2"/>
                        <path d="M7.5 8C7.5 8 7 3 12 3C17 3 16.5 8 16.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="12" cy="5" r="1" fill="currentColor"/>
                    </svg>
                    <span>Setup Prize</span>
                </button>
            `;
            document.getElementById('setup-prize-btn').addEventListener('click', () => this.openSetupModal());
        } else {
            // Show progress bar
            const progress = Math.min((this.prize.currentCoins / this.prize.prizePrice) * 100, 100);
            const isComplete = this.isPrizeComplete();
            
            prizeArea.innerHTML = `
                <div id="prize-progress" class="prize-progress ${isComplete ? 'complete' : ''}" title="Click to edit prize">
                    <div class="prize-progress-header">
                        <span class="prize-name">${this.escapeHtml(this.prize.prizeName)}</span>
                        <span class="prize-coins">${this.getCoinSvg()} ${this.prize.currentCoins} / ${this.prize.prizePrice}</span>
                    </div>
                    <div class="prize-bar">
                        <div class="prize-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    ${isComplete ? '<div class="prize-complete-text">🎉 Prize Ready! Tap to claim!</div>' : ''}
                </div>
            `;
            
            document.getElementById('prize-progress').addEventListener('click', () => {
                if (isComplete) {
                    this.showClaimModal();
                } else {
                    this.openSetupModal();
                }
            });
        }
    }

    updateTaskButtons() {
        const taskButtonsArea = document.getElementById('task-buttons-area');
        if (!taskButtonsArea) return;

        if (!this.prize || !this.prize.tasks || this.prize.tasks.length === 0) {
            // No tasks - show empty state or prompt
            taskButtonsArea.innerHTML = `
                <div class="no-tasks-message">
                    <p>Set up a prize with tasks to start playing!</p>
                </div>
            `;
            return;
        }

        // Render task buttons
        let buttonsHtml = '';
        this.prize.tasks.forEach((task, index) => {
            const icon = this.getModeIcon(task.mode);
            const modeName = this.getModeName(task.mode);
            const paramText = this.getRangeOrGradeText(task.mode, task.rangeOrGrade);
            const timerText = this.getTimerText(task.timer);
            
            buttonsHtml += `
                <button class="task-play-btn" data-task-index="${index}">
                    <div class="task-btn-icon">${icon}</div>
                    <div class="task-btn-details">
                        <span class="task-btn-mode">${modeName}</span>
                        <span class="task-btn-params">${paramText} • ${timerText}</span>
                    </div>
                    <div class="task-btn-coins">
                        ${this.getCoinSvg('task-btn-coin')}
                        <span>${task.coins}</span>
                    </div>
                </button>
            `;
        });

        taskButtonsArea.innerHTML = buttonsHtml;

        // Add click listeners
        taskButtonsArea.querySelectorAll('.task-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.taskIndex);
                this.startTaskGame(index);
            });
        });
    }

    startTaskGame(taskIndex) {
        if (!this.prize || !this.prize.tasks || !this.prize.tasks[taskIndex]) return;
        
        const task = this.prize.tasks[taskIndex];
        
        // Call app's method to start game with specific settings
        if (typeof app !== 'undefined' && app.startGameWithSettings) {
            app.startGameWithSettings(task.mode, task.rangeOrGrade, task.timer);
        }
    }

    showClaimModal() {
        const modal = document.getElementById('prize-claim-modal');
        document.getElementById('claim-prize-name').textContent = this.prize.prizeName;
        modal.style.display = 'flex';
    }

    openSetupModal() {
        // Password check
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.prizePassword) {
            const entered = prompt('Enter password to access prize setup:');
            if (entered === null) return; // cancelled
            if (entered !== APP_CONFIG.prizePassword) {
                alert('Incorrect password.');
                return;
            }
        }

        const modal = document.getElementById('prize-setup-modal');
        const nameInput = document.getElementById('prize-name-input');
        const priceInput = document.getElementById('prize-price-input');
        const currentCoinsInput = document.getElementById('prize-current-coins-input');
        const tasksList = document.getElementById('prize-tasks-list');

        // Pre-fill if editing existing prize
        if (this.prize) {
            nameInput.value = this.prize.prizeName || '';
            priceInput.value = this.prize.prizePrice || '';
            currentCoinsInput.value = this.prize.currentCoins || 0;

            // Render existing tasks
            tasksList.innerHTML = '';
            if (this.prize.tasks && this.prize.tasks.length > 0) {
                this.prize.tasks.forEach((task, index) => {
                    this.addTaskRow(task, index);
                });
            }
        } else {
            nameInput.value = '';
            priceInput.value = '';
            currentCoinsInput.value = 0;
            tasksList.innerHTML = '';
        }

        modal.style.display = 'flex';
    }

    closeSetupModal() {
        document.getElementById('prize-setup-modal').style.display = 'none';
    }

    addTaskRow(taskData = null, index = null) {
        const tasksList = document.getElementById('prize-tasks-list');
        const taskIndex = index !== null ? index : tasksList.children.length;
        
        const taskDiv = document.createElement('div');
        taskDiv.className = 'prize-task-row';
        taskDiv.dataset.index = taskIndex;

        const defaultMode = (taskData && taskData.mode) || 'addition';
        const config = this.getModeConfig(defaultMode);

        taskDiv.innerHTML = `
            <select class="task-mode" data-index="${taskIndex}">
                <option value="addition" ${defaultMode === 'addition' ? 'selected' : ''}>+ Addition</option>
                <option value="subtraction" ${defaultMode === 'subtraction' ? 'selected' : ''}>− Subtraction</option>
                <option value="multiplication" ${defaultMode === 'multiplication' ? 'selected' : ''}>× Multiplication</option>
                <option value="division" ${defaultMode === 'division' ? 'selected' : ''}>÷ Division</option>
                <option value="questions" ${defaultMode === 'questions' ? 'selected' : ''}>? Word Problems</option>
                <option value="balloons" ${defaultMode === 'balloons' ? 'selected' : ''}>🎈 Balloons</option>
                <option value="battle" ${defaultMode === 'battle' ? 'selected' : ''}>🤝 Find Friends</option>
            </select>
            <select class="task-param" data-index="${taskIndex}">
                ${this.renderParamOptions(defaultMode, taskData && taskData.rangeOrGrade)}
            </select>
            <select class="task-timer" data-index="${taskIndex}">
                ${this.renderTimerOptions(defaultMode, taskData && taskData.timer)}
            </select>
            <div class="task-coins-wrapper">
                ${this.getCoinSvg('coin-icon')}
                <input type="number" class="task-coins" data-index="${taskIndex}" 
                       value="${(taskData && taskData.coins) || 5}" min="1" max="100" placeholder="5">
            </div>
            <button class="task-delete-btn" data-index="${taskIndex}" title="Remove task">×</button>
        `;

        tasksList.appendChild(taskDiv);

        // Add event listeners
        const modeSelect = taskDiv.querySelector('.task-mode');
        modeSelect.addEventListener('change', (e) => this.onModeChange(e, taskDiv));

        const deleteBtn = taskDiv.querySelector('.task-delete-btn');
        deleteBtn.addEventListener('click', () => taskDiv.remove());
    }

    renderParamOptions(mode, selectedValue = null) {
        const config = this.getModeConfig(mode);
        let options = '';

        if (config.paramType === 'range') {
            config.ranges.forEach(range => {
                const selected = selectedValue === range ? 'selected' : '';
                options += `<option value="${range}" ${selected}>${range}</option>`;
            });
        } else {
            config.grades.forEach(grade => {
                const selected = selectedValue === grade ? 'selected' : '';
                options += `<option value="${grade}" ${selected}>Grade ${grade}</option>`;
            });
        }

        return options;
    }

    renderTimerOptions(mode, selectedValue = null) {
        const config = this.getModeConfig(mode);
        let options = '';

        config.timers.forEach(timer => {
            const selected = selectedValue === timer ? 'selected' : '';
            const text = timer === 0 ? 'No timer' : `${timer}s`;
            options += `<option value="${timer}" ${selected}>${text}</option>`;
        });

        return options;
    }

    onModeChange(event, taskDiv) {
        const mode = event.target.value;
        const paramSelect = taskDiv.querySelector('.task-param');
        const timerSelect = taskDiv.querySelector('.task-timer');

        paramSelect.innerHTML = this.renderParamOptions(mode);
        timerSelect.innerHTML = this.renderTimerOptions(mode);
    }

    savePrize() {
        const nameInput = document.getElementById('prize-name-input');
        const priceInput = document.getElementById('prize-price-input');
        const tasksList = document.getElementById('prize-tasks-list');

        const prizeName = nameInput.value.trim();
        const prizePrice = parseInt(priceInput.value) || 0;

        if (!prizeName) {
            alert('Please enter a prize name!');
            return;
        }

        if (prizePrice < 1) {
            alert('Please enter a valid prize price (at least 1 coin)!');
            return;
        }

        // Collect tasks
        const tasks = [];
        const taskRows = tasksList.querySelectorAll('.prize-task-row');
        taskRows.forEach(row => {
            const mode = row.querySelector('.task-mode').value;
            const rangeOrGrade = row.querySelector('.task-param').value;
            const timer = parseInt(row.querySelector('.task-timer').value);
            const coins = parseInt(row.querySelector('.task-coins').value) || 5;

            tasks.push({ mode, rangeOrGrade, timer, coins });
        });

        // Use current coins from input field
        const currentCoins = parseInt(document.getElementById('prize-current-coins-input').value) || 0;

        this.prize = {
            prizeName,
            prizePrice,
            currentCoins,
            tasks
        };

        this.save();
        this.closeSetupModal();
        this.updateUI();
    }

    deletePrize() {
        if (confirm('Are you sure you want to delete this prize? All progress will be lost.')) {
            this.prize = null;
            this.save();
            this.closeSetupModal();
            this.updateUI();
        }
    }

    setupEventListeners() {
        // Close modal button
        const closeBtn = document.getElementById('close-prize-setup-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSetupModal());
        }

        // Add task button
        const addTaskBtn = document.getElementById('add-prize-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.addTaskRow());
        }

        // Save prize button
        const saveBtn = document.getElementById('save-prize-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.savePrize());
        }

        // Delete prize button
        const deleteBtn = document.getElementById('delete-prize-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deletePrize());
        }

        // Click outside modal to close
        const modal = document.getElementById('prize-setup-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeSetupModal();
                }
            });
        }

        // Claim modal buttons
        const claimModal = document.getElementById('prize-claim-modal');
        if (claimModal) {
            claimModal.addEventListener('click', (e) => {
                if (e.target === claimModal) {
                    claimModal.style.display = 'none';
                }
            });
        }

        const claimBtn = document.getElementById('claim-prize-confirm-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                document.getElementById('prize-claim-modal').style.display = 'none';
                this.claimPrize();
            });
        }

        const claimCancelBtn = document.getElementById('claim-prize-cancel-btn');
        if (claimCancelBtn) {
            claimCancelBtn.addEventListener('click', () => {
                document.getElementById('prize-claim-modal').style.display = 'none';
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCoinSvg(className = 'coin-svg') {
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="url(#coinGold)"/>
            <circle cx="12" cy="12" r="8" fill="url(#coinInner)"/>
            <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#8B6914">$</text>
            <defs>
                <linearGradient id="coinGold" x1="2" y1="2" x2="22" y2="22">
                    <stop offset="0%" stop-color="#FFD700"/>
                    <stop offset="50%" stop-color="#FFA500"/>
                    <stop offset="100%" stop-color="#FFD700"/>
                </linearGradient>
                <linearGradient id="coinInner" x1="4" y1="4" x2="20" y2="20">
                    <stop offset="0%" stop-color="#FFEC8B"/>
                    <stop offset="50%" stop-color="#FFD700"/>
                    <stop offset="100%" stop-color="#DAA520"/>
                </linearGradient>
            </defs>
        </svg>`;
    }

    // Show coin animation when coins are awarded
    showCoinAnimation(coins) {
        const overlay = document.createElement('div');
        overlay.className = 'coin-award-overlay';
        overlay.innerHTML = `
            <div class="coin-award-content">
                <div class="coin-award-icon">${this.getCoinSvg('coin-svg-large')}</div>
                <div class="coin-award-text">+${coins} coins!</div>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 500);
        }, 1500);
    }
}

// Initialize singleton
const PrizeManager = new PrizeManagerClass();
