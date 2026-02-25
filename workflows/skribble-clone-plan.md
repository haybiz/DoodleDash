# Project Architecture: "Next-Gen Drawing Game" (Skribble.io Clone)

## 1. Core Tech Stack
*   **Frontend Framework:** Angular (Strictly typed, component-driven, great for handling a complex UI state and canvas operations).
*   **Real-time Communication:** Socket.io (Chosen over Firebase Realtime DB to afford unlimited high-frequency point updates necessary for smooth, lag-free drawing).
*   **Backend Server:** Node.js / Express (Lightweight wrapper around the Socket.io server to maintain game state, room management, and timers).
*   **Hosting:** Render.com
    *   *Frontend:* Hosted as a Free Static Site (Always on, instant load).
    *   *Backend:* Hosted as a Free Web Service (Subject to 15-min sleep).
    *   *UX Mitigation:* Since the backend takes ~50s to wake up, the frontend must immediately attempt a connection and gracefully display an engaging "Waking Server..." loading screen or mini-game in the lobby until the Socket connection is established.

## 2. The "Better" Criteria (Key Differentiators)

### A. Vastly Superior Drawing Tools
The primary complaint about pure web drawing games is the lack of precision tools. We will implement:
*   **Undo/Redo System:** An absolute must-have (Ctrl+Z shortcut support). Maintain a stack of previous canvas states or a history array of paths to redraw.
*   **Shape Tools:** Perfect circle, square, and straight-line primitives.
*   **Layering (2 Layers):** Implement an offscreen canvas or dual-canvas setup to allow a "Background" layer (colors/sketches) and a "Foreground" layer (outlines) so filling colors doesn't ruin the line art.
*   **Advanced Brushes:** Spray paint, highlighter (opacity blends), and calligraphy pen, alongside the standard hard-round brush.

### B. Modern UI & Metagame
*   **Mobile/Tablet First Canvas:** Ensure touch events (`touchstart`, `touchmove`) are handled just as smoothly as mouse events (`mousedown`, `mousemove`) so iPad/stylus users have the ultimate advantage.
*   **The "Graffiti Lobby":** While waiting for players (or the server to wake up), the waiting room itself is an unstructured, shared free-draw canvas.
*   **Live Audience Reactions:** Guessers can click emoji buttons that float up the side of the screen over the canvas, similar to Instagram Live.

## 3. Innovative Game Modes
Move beyond the standard "One draws, all guess" format to specialized game types selected by the room host:

*   **Classic Mode:** Standard Skribble rules.
*   **Relay Mode:** The word remains the same, but the Drawer changes every 15 seconds. Player 1 starts, the canvas freezes, and Player 2 takes over the exact same canvas to continue the drawing without knowing what Player 1 was trying to convey.
*   **Showdown Mode:** The ultimate 1v1. The canvas is split evenly in half. Two players are given the *same* word and draw simultaneously on their respective halves. The lobby guesses, and the fastest guess rewards whichever drawer's art they recognized first.
*   **Blitz / Rapid Fire:** 15-second timer, slightly easier words. Frantic energy, terrible art.

## 4. Phase 1 Implementation Plan
1.  **Repo Setup:** Initialize Angular Workspace, Node.js backend.
2.  **Canvas Engine:** Build the `DrawingService` in Angular. Handle the tracking of X/Y points, rendering lines smoothly (quadratic bezier curves between points to avoid jagged edges), and the Undo stack.
3.  **Socket Pipeline:** Implement the Socket.io rooms architecture. Create the data payload structure for emitting drawing paths (batching points slightly if needed to prevent CPU choke on the server).
4.  **Game State Machine:** Build the backend logic for round timers, word selection, and role assignment (Drawer vs. Guesser).
5.  **UI Wrapping:** Build the lobby, the chat box with word-checking logic, and the final scoring screen.
