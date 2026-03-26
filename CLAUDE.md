# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A mobile-first HTML5 math game for kids. No build system, no bundler, no framework — plain vanilla JS served as static files from `math-game/`.

## Running

Open `math-game/index.html` directly in a browser. No server, build step, or dependencies required.

## Architecture

All source lives under `math-game/`. Scripts are loaded in order via `<script>` tags in `index.html` — **load order matters** because files reference globals defined by earlier scripts.

**Script load order and responsibilities:**

1. **config.js** — App-wide constants (e.g. `prizePassword`)
2. **animations.js** — `Animations` class: canvas particle effects (fireworks on correct, red rain on wrong)
3. **avatar.js** — `AvatarManager` object (not a class): SVG-based avatar builder with face/eyes/hair/accessories; persisted to localStorage
4. **prize.js** — `PrizeManagerClass`: parent-configurable prize goals with coin tasks; password-protected setup
5. **game.js** — `Game` class: core math engine — question generation (4 operations + word problems across 5 grades), timer, scoring, training-mode hints
6. **ui.js** — `UI` class: keypad input, question/timer display, animated feedback scenes (SVG mini-scenes for win/lose)
7. **balloons.js** — `BalloonsGame` class: matching game mode (pair questions to answers on a balloon grid, 3-life system)
8. **battle.js** — `BattleGameClass`: Mario-style canvas side-scroller where enemies carry math questions; uses avatar system for player/enemy sprites
9. **main.js** — `MathGameApp`: top-level controller — screen navigation, event wiring, localStorage persistence (name, history, settings), result recording

**Navigation:** Single-page app with screens toggled via `.active` CSS class. Screens: main-menu, settings, game, balloons, battle, results, stats. Modals for avatar editor, prize setup, multiplication table, confirmations.

**State:** All persistence is localStorage-based (user name, avatar config, game history capped at 50, prize/coin progress). No backend.

## Key Patterns

- Global instances: `window.game`, `window.ui`, `window.animations`, `window.AvatarManager`, `window.PrizeManager`, `window.BattleGame`, `window.app`
- Coin rewards require score >= 8/10 on any mode
- Game modes share question generation from `Game` but balloons and battle have their own game loops
- Battle mode renders on `<canvas id="battle-canvas">` with its own physics (gravity, collision, platforming)
- Avatar SVGs are rendered to `<img>` via data URIs for canvas use in battle mode
