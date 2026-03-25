# Math Game for Kids

A fun, interactive HTML5 math game designed for kids to practice addition, subtraction, multiplication, and division on mobile touchscreens.

## Features

### 4 Math Operations
- **Addition** (+)
- **Subtraction** (−)
- **Multiplication** (×)
- **Division** (÷)

### Customizable Settings
- **Range Options:**
  - 0-10 (easy)
  - 10-20
  - 10-50
  - 10-100
  - 100-999 (challenging)

- **Timer Options:**
  - 10 seconds
  - 30 seconds (default)
  - 60 seconds
  - No timer

### Game Features
- **10 Random Questions** per game
- **Touch-Friendly Keypad** (0-9, Clear, OK buttons)
- **Visual Feedback:**
  - ✓ Correct answers show fireworks animation
  - ✗ Wrong answers show fail animation with correct answer
  - Timer warning (turns red at 5 seconds remaining)
- **Score Tracking** with final results screen
- **Mobile-Optimized** with responsive design

## How to Play

1. **Open** `index.html` in any modern web browser
2. **Select** a math operation (Addition, Subtraction, Multiplication, or Division)
3. **Choose** your preferred range and timer settings
4. **Press** "Start Game"
5. **Answer** 10 questions using the on-screen keypad
6. **View** your final score and play again!

## File Structure

```
math-game/
├── index.html          # Main HTML structure
├── css/
│   └── styles.css      # All styling (mobile-first design)
└── js/
    ├── main.js         # App initialization & navigation
    ├── game.js         # Game logic (questions, scoring, timer)
    ├── ui.js           # UI updates & keypad handling
    └── animations.js   # Fireworks & fail animations
```

## Technical Details

- **Pure HTML5/CSS3/JavaScript** - No external dependencies
- **Modular Architecture** - Separate concerns across files
- **Touch-Optimized** - Designed for mobile devices
- **Responsive Design** - Works on all screen sizes
- **Canvas Animations** - Smooth particle effects

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Safari
- Firefox
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

The game uses a modular structure:
- `MathGameApp` class handles navigation between screens
- `Game` class manages game logic and state
- `UI` class handles user interactions and display updates
- `Animations` class creates visual effects using HTML5 Canvas

## License

Free to use for educational purposes.
