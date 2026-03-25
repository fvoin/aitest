// Game logic controller
class Game {
    constructor() {
        this.operation = null;
        this.range = null;
        this.timerSeconds = 0;
        this.trainingMode = false;
        this.currentQuestion = 0;
        this.totalQuestions = 10;
        this.score = 0;
        this.questions = [];
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.isActive = false;
        this.pendingTimeouts = [];
    }

    startNewGame(operation, range, timerSeconds, trainingMode = false) {
        this.operation = operation;
        this.range = range;
        this.timerSeconds = timerSeconds;
        this.trainingMode = trainingMode;
        this.currentQuestion = 0;
        this.score = 0;
        this.questions = [];
        this.isActive = true;
        this.clearPendingTimeouts();
        
        // Show/hide multiplication table button
        const tableBtn = document.getElementById('show-table-btn');
        if (trainingMode && operation === 'multiplication') {
            tableBtn.style.display = 'block';
        } else {
            tableBtn.style.display = 'none';
        }
        
        // Generate all questions
        for (let i = 0; i < this.totalQuestions; i++) {
            this.questions.push(this.generateQuestion());
        }
        
        // Show first question
        this.showNextQuestion();
    }

    generateQuestion() {
        // Handle word problems (questions mode)
        if (this.operation === 'questions') {
            return this.generateWordProblem(parseInt(this.range));
        }
        
        const [min, max] = this.range.split('-').map(Number);
        let num1, num2, answer, questionText;

        switch (this.operation) {
            case 'addition':
                num1 = this.getRandomNumber(min, max);
                num2 = this.getRandomNumber(min, max);
                answer = num1 + num2;
                questionText = `${num1} + ${num2} = ?`;
                break;

            case 'subtraction':
                num1 = this.getRandomNumber(min, max);
                num2 = this.getRandomNumber(min, num1); // Ensure positive result
                answer = num1 - num2;
                questionText = `${num1} − ${num2} = ?`;
                break;

            case 'multiplication':
                // For multiplication, use smaller ranges for better UX
                const multMax = Math.min(max, 12);
                num1 = this.getRandomNumber(min, multMax);
                num2 = this.getRandomNumber(min, multMax);
                answer = num1 * num2;
                questionText = `${num1} × ${num2} = ?`;
                break;

            case 'division':
                // For division, generate answer first, then multiply
                num2 = this.getRandomNumber(Math.max(1, min), Math.min(max, 12));
                answer = this.getRandomNumber(min, max);
                num1 = num2 * answer;
                questionText = `${num1} ÷ ${num2} = ?`;
                break;
        }

        return { num1, num2, answer, questionText };
    }

    generateWordProblem(grade) {
        const templates = this.getWordProblemTemplates(grade);
        const template = templates[this.getRandomNumber(0, templates.length - 1)];
        
        // Pre-select random names and items to ensure consistency
        const names = ['Mary', 'John', 'Sarah', 'Tom', 'Lisa', 'Mike', 'Emma', 'Alex', 'Kate', 'David'];
        const items = ['apples', 'books', 'toys', 'cookies', 'stickers', 'marbles', 'cards', 'candies', 'flowers'];
        
        const name1 = names[this.getRandomNumber(0, names.length - 1)];
        const name2 = names[this.getRandomNumber(0, names.length - 1)];
        // Special items for reading templates
        const readableItems = ['books', 'pages', 'stories', 'chapters'];
        const isReadingTemplate = template.text.toString().includes('read');
        const item = isReadingTemplate 
            ? readableItems[this.getRandomNumber(0, readableItems.length - 1)]
            : items[this.getRandomNumber(0, items.length - 1)];
        
        // Generate numbers based on grade level and template requirements
        let num1, num2, num3, answer;
        const ranges = this.getNumberRanges(grade);
        
        switch (template.operation) {
            case 'addition':
                num1 = this.getRandomNumber(ranges.min, ranges.max);
                num2 = this.getRandomNumber(ranges.min, ranges.max);
                answer = num1 + num2;
                break;
            case 'subtraction':
                num1 = this.getRandomNumber(ranges.min + 5, ranges.max);
                num2 = this.getRandomNumber(ranges.min, num1 - 1);
                answer = num1 - num2;
                break;
            case 'multiplication':
                num1 = this.getRandomNumber(ranges.multMin, ranges.multMax);
                num2 = this.getRandomNumber(ranges.multMin, ranges.multMax);
                answer = num1 * num2;
                break;
            case 'division':
                num2 = this.getRandomNumber(ranges.divMin, ranges.divMax);
                answer = this.getRandomNumber(1, ranges.divResult);
                num1 = num2 * answer;
                break;
            case 'mixed_add_sub':
                // For templates like "had n1, sold n2, received n3" or "had n1, received n3, gave n2"
                // Pattern: start with n1, subtract n2, add n3 = n1 - n2 + n3 (always positive)
                num1 = this.getRandomNumber(ranges.min + 10, ranges.max);
                num2 = this.getRandomNumber(ranges.min, Math.floor(num1 / 2)); // num2 never more than half of num1
                num3 = this.getRandomNumber(ranges.min, ranges.max);
                answer = num1 - num2 + num3;
                // Ensure answer is always positive
                if (answer <= 0) {
                    num3 = num2 + this.getRandomNumber(1, 10);
                    answer = num1 - num2 + num3;
                }
                break;
            case 'mixed_mult_add':
                num1 = this.getRandomNumber(ranges.multMin, ranges.multMax);
                num2 = this.getRandomNumber(ranges.multMin, ranges.multMax);
                num3 = this.getRandomNumber(ranges.min, ranges.max);
                answer = (num1 * num2) + num3;
                break;
            case 'comparison':
                num1 = this.getRandomNumber(ranges.min, ranges.max);
                num2 = this.getRandomNumber(ranges.min, ranges.max);
                answer = num1 + num2;
                break;
            case 'difference':
                // For "How many more does the person with more have?" questions
                num1 = this.getRandomNumber(ranges.min, ranges.max);
                num2 = this.getRandomNumber(ranges.min, ranges.max);
                // Ensure they're different for meaningful question
                while (num1 === num2) {
                    num2 = this.getRandomNumber(ranges.min, ranges.max);
                }
                answer = Math.abs(num1 - num2);
                break;
            case 'relative_total':
                // For "A has X, B has Y more than A. How many in total?" questions
                num1 = this.getRandomNumber(ranges.min, ranges.max);
                num3 = this.getRandomNumber(1, Math.floor(ranges.max / 3)); // The "more" amount
                num2 = num1 + num3; // B's amount
                answer = num1 + num2; // A's amount + B's amount
                break;
            case 'relative_total_less':
                // For "A has X, B has Y fewer than A. How many in total?" questions
                num1 = this.getRandomNumber(ranges.min + 5, ranges.max); // Ensure A has enough
                num3 = this.getRandomNumber(1, Math.min(num1 - 1, Math.floor(ranges.max / 3))); // The "fewer" amount
                num2 = num1 - num3; // B's amount
                answer = num1 + num2; // A's amount + B's amount
                break;
        }
        
        // Safeguard: ensure answer is never negative
        if (answer < 0) {
            // Fallback to simple addition
            num1 = this.getRandomNumber(ranges.min, ranges.max);
            num2 = this.getRandomNumber(ranges.min, ranges.max);
            answer = num1 + num2;
        }
        
        return { 
            questionText: template.text(num1, num2, num3, name1, name2, item), 
            answer, 
            num1, 
            num2 
        };
    }

    getNumberRanges(grade) {
        const ranges = {
            1: { min: 1, max: 10, multMin: 2, multMax: 5, divMin: 2, divMax: 5, divResult: 5 },
            2: { min: 5, max: 20, multMin: 2, multMax: 8, divMin: 2, divMax: 8, divResult: 10 },
            3: { min: 10, max: 50, multMin: 2, multMax: 10, divMin: 2, divMax: 10, divResult: 20 },
            4: { min: 20, max: 100, multMin: 3, multMax: 12, divMin: 3, divMax: 12, divResult: 50 },
            5: { min: 50, max: 500, multMin: 5, multMax: 20, divMin: 5, divMax: 15, divResult: 100 }
        };
        return ranges[grade] || ranges[1];
    }

    getWordProblemTemplates(grade) {
        const templates = [];
        
        // Grade 1: Simple addition and subtraction (1-10)
        if (grade === 1) {
            templates.push(
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item}. ${name2} gives them ${n2} more ${item}. How many ${item} does ${name1} have now?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `There are ${n1} ${item} in a basket. Someone adds ${n2} more ${item}. How many ${item} are there in total?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} found ${n1} ${item}. Then ${name1} found ${n2} more ${item}. How many ${item} did ${name1} find in total?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `In the park, ${name1} saw ${n1} ${item} and ${name2} saw ${n2} ${item}. How many ${item} did they see together?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} red ${item} and ${n2} blue ${item}. How many ${item} does ${name1} have?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `On Monday, ${name1} collected ${n1} ${item}. On Tuesday, ${name1} collected ${n2} ${item}. How many ${item} in total?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} put ${n1} ${item} in a box. ${name2} put ${n2} ${item} in the same box. How many ${item} are in the box?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `There are ${n1} ${item} on the table and ${n2} ${item} on the chair. How many ${item} are there?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} ate ${n1} ${item} at breakfast and ${n2} ${item} at lunch. How many ${item} did ${name1} eat?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} bought ${n1} ${item} and ${name2} bought ${n2} ${item}. How many ${item} did they buy together?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item}. ${name1} gives ${n2} ${item} to ${name2}. How many ${item} are left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `There were ${n1} ${item} on the table. ${name1} took ${n2} ${item}. How many ${item} are left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} had ${n1} ${item}. ${name1} ate ${n2} ${item}. How many ${item} does ${name1} have now?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `A basket had ${n1} ${item}. ${name1} removed ${n2} ${item}. How many ${item} are in the basket now?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} had ${n1} ${item} and lost ${n2} ${item}. How many ${item} does ${name1} have left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} collected ${n1} ${item} but gave away ${n2} ${item}. How many ${item} does ${name1} still have?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `There are ${n1} ${item} in a jar. ${name1} takes out ${n2} ${item}. How many ${item} are left in the jar?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} baked ${n1} ${item}. ${name2} ate ${n2} ${item}. How many ${item} are left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} bought ${n1} ${item} and used ${n2} ${item}. How many ${item} does ${name1} have left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `There were ${n1} ${item} in the garden. ${n2} ${item} were picked. How many ${item} are left?` }
            );
        }
        
        // Grade 2: Addition and subtraction with larger numbers (5-20)
        if (grade === 2) {
            templates.push(
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item} and ${name2} has ${n2} ${item}. How many ${item} do they have together?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `In the morning, ${name1} collected ${n1} ${item}. In the afternoon, ${name1} collected ${n2} more ${item}. How many ${item} in total?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} saved ${n1} ${item} last week and ${n2} ${item} this week. How many ${item} did ${name1} save?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `A store had ${n1} ${item} on Monday. They received ${n2} more ${item} on Tuesday. How many ${item} do they have now?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} read ${n1} pages yesterday and ${n2} pages today. How many pages did ${name1} read in total?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `There are ${n1} ${item} in the first box and ${n2} ${item} in the second box. How many ${item} are there?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} planted ${n1} ${item} and ${name2} planted ${n2} ${item}. How many ${item} were planted altogether?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} walked ${n1} steps to school and ${n2} steps back home. How many steps did ${name1} walk?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} drew ${n1} ${item} and ${name2} drew ${n2} ${item}. How many ${item} did they draw together?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item} and wants to have ${n1 + n2} ${item}. How many more ${item} does ${name1} need?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} had ${n1} ${item}. After giving ${n2} ${item} to ${name2}, how many ${item} does ${name1} have left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `A library had ${n1} ${item}. They lent out ${n2} ${item}. How many ${item} are left in the library?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} had ${n1} ${item} and sold ${n2} ${item}. How many ${item} does ${name1} have now?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `There were ${n1} ${item} at the party. ${n2} ${item} were eaten. How many ${item} are left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} wrote ${n1} pages but erased ${n2} pages. How many pages does ${name1} have left?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} collected ${n1} ${item} and gave ${n2} ${item} to charity. How many ${item} does ${name1} still have?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `A farmer had ${n1} ${item} and harvested ${n2} less ${item} this year. How many ${item} were harvested?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} planned to make ${n1} ${item} but only made ${n1 - n2} ${item}. How many ${item} were not made?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `There were ${n1} ${item} in stock. After selling ${n2} ${item}, how many ${item} remain?` },
                { operation: 'comparison', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item} and ${name2} has ${n2} ${item}. How many ${item} do they need to have the same?` }
            );
        }
        
        // Grade 3: Multiplication, division, and mixed operations (10-50)
        if (grade === 3) {
            templates.push(
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} boxes. Each box contains ${n2} ${item}. How many ${item} does ${name1} have in total?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `There are ${n1} groups of students. Each group has ${n2} ${item}. How many ${item} are there altogether?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} buys ${n1} packs of ${item}. Each pack has ${n2} ${item}. How many ${item} does ${name1} buy?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `A store has ${n1} shelves. Each shelf holds ${n2} ${item}. How many ${item} can the store hold?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} plants ${n1} rows of ${item}. Each row has ${n2} ${item}. How many ${item} are planted?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `Each bag has ${n2} ${item}. ${name1} has ${n1} bags. How many ${item} does ${name1} have?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} reads ${n1} pages per day for ${n2} days. How many pages does ${name1} read in total?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item} to share equally among ${n2} friends. How many ${item} does each friend get?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `A baker made ${n1} ${item}. They are packed in boxes of ${n2} ${item}. How many boxes are needed?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item} to arrange in ${n2} equal rows. How many ${item} are in each row?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `There are ${n1} ${item} to be divided among ${n2} children. How many ${item} does each child get?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `${name1} saved $${n1} in January and $${n2} in February. How much money did ${name1} save in total?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} had $${n1} and spent $${n2} on ${item}. How much money does ${name1} have left?` },
                { operation: 'addition', text: (n1, n2, n3, name1, name2, item) => `A library has ${n1} ${item} on science and ${n2} ${item} on history. How many ${item} in total?` },
                { operation: 'subtraction', text: (n1, n2, n3, name1, name2, item) => `${name1} collected ${n1} ${item} but ${n2} ${item} were broken. How many good ${item} does ${name1} have?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} works ${n2} hours a day for ${n1} days. How many hours does ${name1} work in total?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} traveled ${n1} miles in ${n2} hours. How many miles per hour did ${name1} travel?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `Each ${item} costs $${n1}. ${name2} buys ${n2} ${item}. How much money does ${name2} spend?` },
                { operation: 'difference', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item}, ${name2} has ${n2} ${item}. How many more ${item} does the person with more have?` },
                { operation: 'comparison', text: (n1, n2, n3, name1, name2, item) => `${name1} collected ${n1} ${item} and ${name2} collected ${n2} ${item}. How many ${item} were collected in total?` },
                { operation: 'relative_total', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item}. ${name2} has ${n3} more ${item} than ${name1}. How many ${item} do they have together?` }
            );
        }
        
        // Grade 4: Multi-step problems (20-100)
        if (grade === 4) {
            templates.push(
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `${name1} had $${n1}. ${name1} earned $${n3} and spent $${n2}. How much money does ${name1} have now?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `A school has ${n1} classrooms. Each classroom has ${n2} ${item}. How many ${item} are there in total?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} drove ${n1} miles in ${n2} hours. How many miles per hour did ${name1} drive on average?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `Each ${item} costs $${n1}. ${name1} buys ${n2} ${item}. How much does ${name1} spend in total?` },
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `${name1} had ${n1} ${item}. ${name1} bought ${n3} more ${item} and gave away ${n2} ${item}. How many ${item} does ${name1} have now?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} saves $${n1} per week. How much money will ${name1} save in ${n2} weeks?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `A factory produces ${n1} ${item} in ${n2} days. How many ${item} does it produce per day?` },
                { operation: 'mixed_mult_add', text: (n1, n2, n3, name1, name2, item) => `${name1} bought ${n1} packs of ${item} with ${n2} ${item} each, plus ${n3} extra ${item}. How many ${item} in total?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `A bus travels ${n1} miles per hour. How far does it travel in ${n2} hours?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item} to distribute equally among ${n2} boxes. How many ${item} go in each box?` },
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `${name1} collected ${n1} ${item} in the morning and ${n3} ${item} in the afternoon, but lost ${n2} ${item}. How many ${item} remain?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} works ${n1} hours per day for ${n2} days a week. How many hours does ${name1} work per week?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} spent $${n1} on ${n2} ${item}. How much did each ${item} cost?` },
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `A store had ${n1} ${item}. They sold ${n2} ${item} and received ${n3} new ${item}. How many ${item} does the store have now?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} reads ${n1} pages per day. How many pages will ${name1} read in ${n2} days?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `A rope of ${n1} meters is cut into ${n2} equal pieces. How long is each piece?` },
                { operation: 'mixed_mult_add', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} boxes with ${n2} ${item} each. ${name2} gives ${name1} ${n3} more ${item}. How many ${item} does ${name1} have?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `A garden has ${n1} rows of ${item} with ${n2} ${item} per row. How many ${item} are in the garden?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} has $${n1} to buy ${item} that cost $${n2} each. How many ${item} can ${name1} buy?` },
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `${name1} started with ${n1} ${item}, found ${n3} more, then gave ${n2} to ${name2}. How many ${item} does ${name1} have left?` },
                { operation: 'difference', text: (n1, n2, n3, name1, name2, item) => `${name1} scored ${n1} points and ${name2} scored ${n2} points. How many more points does the winner have?` },
                { operation: 'relative_total', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item}. ${name2} has ${n3} more ${item} than ${name1}. How many ${item} do they have in total?` },
                { operation: 'relative_total_less', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item}. ${name2} has ${n3} fewer ${item} than ${name1}. How many ${item} do they have together?` }
            );
        }
        
        // Grade 5: Complex multi-step problems (50-500)
        if (grade === 5) {
            templates.push(
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `A warehouse had ${n1} ${item}. They received a delivery of ${n3} ${item} and shipped out ${n2} ${item}. How many ${item} are left?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} works ${n1} hours per day for ${n2} days. How many hours does ${name1} work in total?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `A factory produces ${n1} ${item} per day. How many days will it take to produce ${n1 * n2} ${item}?` },
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `${name1} has $${n1}. ${name1} spends $${n2} on lunch but earns $${n3} helping a neighbor. How much money does ${name1} have now?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `A train travels ${n1} miles per hour for ${n2} hours. How far does the train travel?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} saved $${n1} over ${n2} months. How much did ${name1} save per month on average?` },
                { operation: 'mixed_mult_add', text: (n1, n2, n3, name1, name2, item) => `${name1} bought ${n1} packages with ${n2} ${item} each, and ${name2} gave ${n3} extra ${item}. How many ${item} in total?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `A factory produces ${n2} ${item} per day. How many ${item} are produced in ${n1} days?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item} to pack into boxes of ${n2} ${item}. How many boxes are needed?` },
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `A company had ${n1} employees. They hired ${n3} new employees and ${n2} employees left. How many employees now?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} invests $${n1} per month for ${n2} months. How much has ${name1} invested in total?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `A distance of ${n1} kilometers is covered in ${n2} hours. What is the average speed per hour?` },
                { operation: 'mixed_mult_add', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} boxes with ${n2} ${item} per box. After buying ${n3} more ${item}, how many ${item} does ${name1} have?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `A building has ${n1} floors with ${n2} ${item} per floor. How many ${item} are in the building?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `${name1} spent $${n1} on ${n2} identical ${item}. What was the cost of each ${item}?` },
                { operation: 'mixed_add_sub', text: (n1, n2, n3, name1, name2, item) => `${name1} started with ${n1} ${item}, received ${n3} ${item}, and sold ${n2} ${item}. How many ${item} remain?` },
                { operation: 'multiplication', text: (n1, n2, n3, name1, name2, item) => `${name1} earns $${n1} per hour and works ${n2} hours. How much does ${name1} earn?` },
                { operation: 'division', text: (n1, n2, n3, name1, name2, item) => `A journey of ${n1} miles uses ${n2} gallons of fuel. How many miles per gallon?` },
                { operation: 'mixed_mult_add', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} groups of ${n2} ${item} each and finds ${n3} additional ${item}. How many ${item} in total?` },
                { operation: 'difference', text: (n1, n2, n3, name1, name2, item) => `${name1} collected ${n1} ${item} and ${name2} collected ${n2} ${item}. How many more ${item} does the person with more have?` },
                { operation: 'relative_total', text: (n1, n2, n3, name1, name2, item) => `${name1} saved $${n1}. ${name2} saved $${n3} more than ${name1}. How much did they save together?` },
                { operation: 'relative_total_less', text: (n1, n2, n3, name1, name2, item) => `${name1} has ${n1} ${item}. ${name2} has ${n3} fewer ${item} than ${name1}. How many ${item} do they have in total?` }
            );
        }
        
        return templates;
    }

    getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateHint(question) {
        const { num1, num2, operation } = question;
        let hint = '';

        switch (this.operation) {
            case 'addition':
                if (num2 <= 10) {
                    hint = `Count up from ${num1}: ${num1}`;
                    for (let i = 1; i <= num2; i++) {
                        hint += ` → ${num1 + i}`;
                    }
                } else {
                    const tens = Math.floor(num2 / 10) * 10;
                    const ones = num2 % 10;
                    hint = `Break it down: ${num1} + ${tens} = ${num1 + tens}`;
                    if (ones > 0) {
                        hint += `, then add ${ones} → ${num1 + tens + ones}`;
                    }
                }
                break;

            case 'subtraction':
                if (num2 <= 10) {
                    hint = `Count down from ${num1}: ${num1}`;
                    for (let i = 1; i <= num2; i++) {
                        hint += ` → ${num1 - i}`;
                    }
                } else {
                    const tens = Math.floor(num2 / 10) * 10;
                    const ones = num2 % 10;
                    hint = `Break it down: ${num1} - ${tens} = ${num1 - tens}`;
                    if (ones > 0) {
                        hint += `, then subtract ${ones} → ${num1 - tens - ones}`;
                    }
                }
                break;

            case 'multiplication':
                hint = `Think: ${num1} × ${num2} means ${num1} groups of ${num2}. `;
                if (num1 <= 5 && num2 <= 5) {
                    hint += `Count: ${Array(num1).fill(num2).join(' + ')} = ${num1 * num2}`;
                } else {
                    hint += `Check the multiplication table! ${num1} × ${num2} = ${num1 * num2}`;
                }
                break;

            case 'division':
                hint = `How many times does ${num2} fit into ${num1}? `;
                hint += `Think: ${num2} × ? = ${num1}. Answer: ${num2} × ${num1 / num2} = ${num1}`;
                break;
        }

        return hint;
    }

    showNextQuestion() {
        if (this.currentQuestion >= this.totalQuestions) {
            this.endGame();
            return;
        }

        // Fade in the question
        ui.fadeIn(() => {
            const question = this.questions[this.currentQuestion];
            ui.updateQuestion(question.questionText, this.currentQuestion + 1, this.totalQuestions);
            ui.clearAnswer();
            
            // Show training hint if enabled
            if (this.trainingMode) {
                const hint = this.generateHint(question);
                ui.showHint(hint);
            } else {
                ui.hideHint();
            }
            
            // Re-enable input for new question
            ui.enableInput();
            
            // Start timer if enabled
            if (this.timerSeconds > 0) {
                this.startTimer();
            } else {
                ui.updateTimer('');
            }
        });
    }

    startTimer() {
        this.timeRemaining = this.timerSeconds;
        ui.updateTimer(this.timeRemaining);
        
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            ui.updateTimer(this.timeRemaining);
            
            if (this.timeRemaining <= 5 && this.timeRemaining > 0) {
                ui.showTimerWarning(true);
            } else {
                ui.showTimerWarning(false);
            }
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.handleTimeout();
            }
        }, 1000);
    }

    handleTimeout() {
        if (!this.isActive) return;
        
        ui.disableInput();
        const question = this.questions[this.currentQuestion];
        ui.showFeedback(false, question.answer);
        animations.showFailAnimation();
        
        const timeoutId = setTimeout(() => {
            if (!this.isActive) return;
            ui.fadeOut(() => {
                if (!this.isActive) return;
                this.currentQuestion++;
                this.showNextQuestion();
            });
        }, 2000);
        this.pendingTimeouts.push(timeoutId);
    }

    checkAnswer(userAnswer) {
        if (!this.isActive) return;
        
        clearInterval(this.timerInterval);
        
        const question = this.questions[this.currentQuestion];
        const isCorrect = parseInt(userAnswer) === question.answer;
        
        if (isCorrect) {
            this.score++;
            ui.showFeedback(true);
            
            // Show fireworks immediately
            animations.showFireworks();
            
            const timeoutId = setTimeout(() => {
                if (!this.isActive) return;
                ui.fadeOut(() => {
                    if (!this.isActive) return;
                    this.currentQuestion++;
                    this.showNextQuestion();
                });
            }, 2000);
            this.pendingTimeouts.push(timeoutId);
        } else {
            ui.showFeedback(false, question.answer);
            animations.showFailAnimation();
            
            const timeoutId = setTimeout(() => {
                if (!this.isActive) return;
                ui.fadeOut(() => {
                    if (!this.isActive) return;
                    this.currentQuestion++;
                    this.showNextQuestion();
                });
            }, 2000);
            this.pendingTimeouts.push(timeoutId);
        }
    }

    clearPendingTimeouts() {
        this.pendingTimeouts.forEach(id => clearTimeout(id));
        this.pendingTimeouts = [];
    }

    endGame() {
        this.isActive = false;
        clearInterval(this.timerInterval);
        this.clearPendingTimeouts();
        ui.hideFeedback();
        app.showResults(this.score, this.totalQuestions);
    }
}

// Initialize game instance
const game = new Game();
