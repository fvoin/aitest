// Balloons Game Controller
class BalloonsGame {
    constructor() {
        this.pairs = [];
        this.selectedBalloon = null;
        this.matchedCount = 0;
        this.totalPairs = 10; // Increased to 10 pairs
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.originalTime = 0;
        this.grade = 1;
        this.lives = 3;
        this.maxLives = 3;
        this.operations = ['addition', 'subtraction', 'multiplication', 'division'];
        this.colors = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'cyan'];
        this.isActive = false;
        this.pendingTimeouts = [];
    }

    startGame(grade, timerSeconds) {
        // Reset state
        this.pairs = [];
        this.selectedBalloon = null;
        this.matchedCount = 0;
        this.totalPairs = 10;
        this.grade = parseInt(grade);
        this.timeRemaining = timerSeconds === 0 ? 999 : timerSeconds;
        this.originalTime = timerSeconds;
        this.lives = this.maxLives;
        this.isActive = true;
        this.clearPendingTimeouts();

        // Generate pairs based on grade
        this.generatePairs();

        // Ensure container has dimensions before rendering
        setTimeout(() => {
            this.renderBalloons();
        }, 50);

        // Start timer
        this.startTimer();

        // Update UI
        this.updateScore();
        this.updateLivesDisplay();
        
        // Hide/show timer display based on settings
        const timerDisplay = document.getElementById('balloons-timer-display');
        if (timerSeconds === 0) {
            timerDisplay.style.display = 'none';
        } else {
            timerDisplay.style.display = 'block';
        }
    }

    updateLivesDisplay() {
        const hearts = document.querySelectorAll('#balloons-lives .heart-icon');
        hearts.forEach((heart, index) => {
            heart.classList.remove('lost', 'losing');
            if (index >= this.lives) {
                heart.classList.add('lost');
            }
        });
    }

    loseLife() {
        if (this.lives > 0) {
            const hearts = document.querySelectorAll('#balloons-lives .heart-icon');
            const heartToLose = hearts[this.lives - 1];
            if (heartToLose) {
                heartToLose.classList.add('losing');
            }
            this.lives--;
            
            // Check if game over
            if (this.lives <= 0) {
                const timeoutId = setTimeout(() => {
                    if (!this.isActive) return;
                    this.gameOverLives();
                }, 500);
                this.pendingTimeouts.push(timeoutId);
            }
        }
    }

    generatePairs() {
        const availableOperations = this.grade === 2 
            ? ['addition', 'subtraction'] 
            : this.operations;

        for (let i = 0; i < this.totalPairs; i++) {
            const operation = availableOperations[Math.floor(Math.random() * availableOperations.length)];
            const pair = this.generateGradeBasedQuestion(operation, this.grade);
            this.pairs.push({
                id: i,
                question: pair.question,
                answer: pair.answer
            });
        }
    }

    generateGradeBasedQuestion(op, grade) {
        let n1, n2, question, answer;
        
        // Simplified logic based on grade
        switch(grade) {
            case 1:
                if (op === 'division') op = 'addition'; // No division for grade 1
                if (op === 'multiplication') op = 'addition'; // No multiplication for grade 1
                n1 = Math.floor(Math.random() * 10) + 1;
                n2 = Math.floor(Math.random() * 10) + 1;
                break;
            case 2:
                n1 = Math.floor(Math.random() * 20) + 5;
                n2 = Math.floor(Math.random() * 20) + 1;
                break;
            case 3:
                n1 = Math.floor(Math.random() * 50) + 10;
                n2 = Math.floor(Math.random() * 50) + 5;
                break;
            case 4:
                n1 = Math.floor(Math.random() * 100) + 20;
                n2 = Math.floor(Math.random() * 100) + 20;
                break;
            case 5:
                n1 = Math.floor(Math.random() * 500) + 50;
                n2 = Math.floor(Math.random() * 500) + 50;
                break;
        }

        if (op === 'addition') {
            answer = n1 + n2;
            question = `${n1} + ${n2}`;
        } else if (op === 'subtraction') {
            if (n1 < n2) [n1, n2] = [n2, n1];
            answer = n1 - n2;
            question = `${n1} - ${n2}`;
        } else if (op === 'multiplication') {
            n1 = Math.floor(Math.random() * (grade + 5)) + 2;
            n2 = Math.floor(Math.random() * (grade + 5)) + 2;
            answer = n1 * n2;
            question = `${n1} × ${n2}`;
        } else { // division
            n2 = Math.floor(Math.random() * (grade + 3)) + 2;
            answer = Math.floor(Math.random() * (grade + 5)) + 2;
            n1 = n2 * answer;
            question = `${n1} ÷ ${n2}`;
        }

        return { question, answer };
    }

    renderBalloons() {
        const container = document.getElementById('balloons-container');
        container.innerHTML = '';

        // Create array of all balloons (questions and answers)
        const allBalloons = [];
        this.pairs.forEach(pair => {
            allBalloons.push({
                id: `q-${pair.id}`,
                pairId: pair.id,
                text: pair.question + '?',
                isQuestion: true,
                answer: pair.answer  // Store the expected answer
            });
            allBalloons.push({
                id: `a-${pair.id}`,
                pairId: pair.id,
                text: pair.answer.toString(),
                isQuestion: false,
                answer: pair.answer  // Store the answer value
            });
        });

        // Shuffle balloons
        this.shuffleArray(allBalloons);

        // Position balloons using grid-based approach for better distribution
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const balloonWidth = 80;
        const balloonHeight = 110;
        const usedPositions = [];
        
        // Calculate grid for 20 balloons (5 columns x 4 rows)
        const cols = 5;
        const rows = 4;
        const cellWidth = containerWidth / cols;
        const cellHeight = containerHeight / rows;

        allBalloons.forEach((balloon, index) => {
            const balloonDiv = document.createElement('div');
            balloonDiv.className = `balloon balloon-${this.colors[index % this.colors.length]}`;
            balloonDiv.dataset.id = balloon.id;
            balloonDiv.dataset.pairId = balloon.pairId;
            balloonDiv.dataset.answer = balloon.answer;
            balloonDiv.dataset.isQuestion = balloon.isQuestion;

            // Grid-based position with slight randomness
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            // Calculate base position in grid cell with random offset
            const offsetX = (cellWidth - balloonWidth) * Math.random() * 0.6 + (cellWidth - balloonWidth) * 0.2;
            const offsetY = (cellHeight - balloonHeight) * Math.random() * 0.6 + (cellHeight - balloonHeight) * 0.2;
            
            const position = {
                x: col * cellWidth + offsetX,
                y: row * cellHeight + offsetY
            };

            // Clamp position to container bounds
            position.x = Math.max(5, Math.min(position.x, containerWidth - balloonWidth - 5));
            position.y = Math.max(5, Math.min(position.y, containerHeight - balloonHeight - 25));

            usedPositions.push(position);
            balloonDiv.style.left = position.x + 'px';
            balloonDiv.style.top = position.y + 'px';

            // Add random animation delay for float
            const animationDelay = -Math.random() * 3; // Negative to start midway
            balloonDiv.style.animationDelay = animationDelay + 's';

            balloonDiv.innerHTML = `
                <div class="balloon-body">
                    <div class="balloon-text">${balloon.text}</div>
                </div>
                <div class="balloon-string"></div>
            `;

            // Use click event (works for both touch and mouse)
            let touchStarted = false;
            
            balloonDiv.addEventListener('touchstart', (e) => {
                touchStarted = true;
                balloonDiv.classList.add('pressed');
            }, { passive: true });
            
            balloonDiv.addEventListener('touchend', (e) => {
                if (touchStarted) {
                    e.preventDefault();
                    balloonDiv.classList.remove('pressed');
                    this.handleBalloonClick(balloon.id, balloon.answer, balloon.isQuestion);
                    touchStarted = false;
                }
            }, { passive: false });
            
            balloonDiv.addEventListener('touchcancel', () => {
                touchStarted = false;
                balloonDiv.classList.remove('pressed');
            });
            
            balloonDiv.addEventListener('click', (e) => {
                // Only handle click if it wasn't a touch event
                if (!touchStarted) {
                    e.preventDefault();
                    this.handleBalloonClick(balloon.id, balloon.answer, balloon.isQuestion);
                }
            });

            container.appendChild(balloonDiv);
        });
    }

    isOverlapping(newPos, usedPositions, width, height) {
        const padding = 30; // Larger padding to prevent strong overlap
        return usedPositions.some(pos => {
            return (
                newPos.x < pos.x + width + padding &&
                newPos.x + width + padding > pos.x &&
                newPos.y < pos.y + height + padding &&
                newPos.y + height + padding > pos.y
            );
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    handleBalloonClick(balloonId, answer, isQuestion) {
        const balloon = document.querySelector(`[data-id="${balloonId}"]`);
        
        // Ignore if already matched
        if (balloon.classList.contains('matched')) {
            return;
        }

        // First selection
        if (!this.selectedBalloon) {
            this.selectedBalloon = { id: balloonId, answer: answer, isQuestion: isQuestion };
            balloon.classList.add('selected');
            return;
        }

        // Second selection - same balloon
        if (this.selectedBalloon.id === balloonId) {
            balloon.classList.remove('selected');
            this.selectedBalloon = null;
            return;
        }

        // Second selection - check for match
        // Must be one question and one answer with same answer value
        const firstIsQuestion = this.selectedBalloon.isQuestion;
        const secondIsQuestion = isQuestion;
        const sameAnswer = this.selectedBalloon.answer === answer;
        const differentTypes = firstIsQuestion !== secondIsQuestion;
        
        if (sameAnswer && differentTypes) {
            // Match! (question matches answer with same value)
            const firstBalloon = document.querySelector(`[data-id="${this.selectedBalloon.id}"]`);
            firstBalloon.classList.add('matched');
            balloon.classList.add('matched');

            // Remove after animation
            setTimeout(() => {
                if (firstBalloon.parentNode) firstBalloon.remove();
                if (balloon.parentNode) balloon.remove();
            }, 500);

            this.matchedCount++;
            this.updateScore();
            this.selectedBalloon = null;

            // Check if game is complete
            if (this.matchedCount === this.totalPairs) {
                this.gameComplete();
            }
        } else {
            // No match - show mismatch animation on both balloons
            const firstBalloon = document.querySelector(`[data-id="${this.selectedBalloon.id}"]`);
            balloon.classList.add('selected');
            
            // Show mismatch animation
            firstBalloon.classList.add('mismatch');
            balloon.classList.add('mismatch');
            
            // Lose a life
            this.loseLife();
            
            // Remove selection and mismatch after animation
            setTimeout(() => {
                firstBalloon.classList.remove('selected', 'mismatch');
                balloon.classList.remove('selected', 'mismatch');
            }, 400);
            
            this.selectedBalloon = null;
        }
    }

    startTimer() {
        this.updateTimerDisplay();
        
        if (this.originalTime === 0) return; // No timer

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.gameOver();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('balloons-timer-display');
        if (this.originalTime === 0) {
            timerDisplay.textContent = '∞';
        } else {
            timerDisplay.textContent = this.timeRemaining + 's';
            if (this.timeRemaining <= 10) {
                timerDisplay.style.color = '#ff4757';
            } else {
                timerDisplay.style.color = '#667eea';
            }
        }
    }

    updateScore() {
        document.getElementById('pairs-count').textContent = this.matchedCount;
        document.getElementById('total-pairs').textContent = this.totalPairs;
    }

    gameComplete() {
        clearInterval(this.timerInterval);
        
        const timeoutId = setTimeout(() => {
            if (!this.isActive) return;
            
            app.saveGameResult('balloons', this.grade.toString(), this.originalTime, false, this.totalPairs, this.totalPairs, false);
            
            // Check for prize coin rewards
            if (typeof PrizeManager !== 'undefined') {
                const reward = PrizeManager.checkAndAwardCoins(
                    'balloons',
                    this.grade.toString(),
                    this.originalTime,
                    this.totalPairs,
                    this.totalPairs
                );
                if (reward.awarded) {
                    PrizeManager.showCoinAnimation(reward.coins);
                }
            }
            
            document.getElementById('result-message').textContent = 'Perfect! 🎉';
            document.getElementById('final-score').textContent = `${this.totalPairs}/${this.totalPairs}`;
            document.getElementById('mode-icon').textContent = '🎈';
            document.getElementById('mode-text').textContent = 'Balloons';
            document.getElementById('range-text').textContent = `Grade ${this.grade}`;
            document.getElementById('timer-text').textContent = this.originalTime === 0 ? 'No timer' : `${this.originalTime}s`;
            document.getElementById('training-mode-indicator').style.display = 'none';
            
            app.showScreen('results-screen');
        }, 1000);
        this.pendingTimeouts.push(timeoutId);
    }

    gameOver() {
        clearInterval(this.timerInterval);
        
        app.saveGameResult('balloons', this.grade.toString(), this.originalTime, false, this.matchedCount, this.totalPairs, false);
        
        document.getElementById('result-message').textContent = 'Time\'s Up! ⏰';
        document.getElementById('final-score').textContent = `${this.matchedCount}/${this.totalPairs}`;
        document.getElementById('mode-icon').textContent = '🎈';
        document.getElementById('mode-text').textContent = 'Balloons';
        document.getElementById('range-text').textContent = `Grade ${this.grade}`;
        document.getElementById('timer-text').textContent = `${this.originalTime}s`;
        document.getElementById('training-mode-indicator').style.display = 'none';
        
        app.showScreen('results-screen');
    }

    gameOverLives() {
        clearInterval(this.timerInterval);
        
        app.saveGameResult('balloons', this.grade.toString(), this.originalTime, false, this.matchedCount, this.totalPairs, false);
        
        document.getElementById('result-message').textContent = 'No Lives Left! 💔';
        document.getElementById('final-score').textContent = `${this.matchedCount}/${this.totalPairs}`;
        document.getElementById('mode-icon').textContent = '🎈';
        document.getElementById('mode-text').textContent = 'Balloons';
        document.getElementById('range-text').textContent = `Grade ${this.grade}`;
        document.getElementById('timer-text').textContent = this.originalTime === 0 ? 'No timer' : `${this.originalTime}s`;
        document.getElementById('training-mode-indicator').style.display = 'none';
        
        app.showScreen('results-screen');
    }

    clearPendingTimeouts() {
        this.pendingTimeouts.forEach(id => clearTimeout(id));
        this.pendingTimeouts = [];
    }

    endGame() {
        this.isActive = false;
        clearInterval(this.timerInterval);
        this.clearPendingTimeouts();
        const container = document.getElementById('balloons-container');
        container.innerHTML = '';
    }
}

// Initialize
const balloonsGame = new BalloonsGame();
