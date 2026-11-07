# PyKnowledge User Guide

## 1. About PyKnowledge

PyKnowledge is an **offline-first, installable Python learning application** that runs entirely in a web browser. Once the app is loaded once, the entire course — all lessons, exercises, quizzes, and a Python code runner — works without any internet connection.

The application teaches Python programming through nine progressive, CHED-aligned modules. It is designed for students in geographically isolated regions of the Philippines (TRAC/BARMM) where internet signal is unreliable, school computers are shared, and most online learning platforms fail because they require constant connectivity.

### Key characteristics (verified in implementation):

- **Offline after first install**: All application code, lesson content, quizzes, exercises, and the Python interpreter (Skulpt) are cached by the browser's service worker. No internet is needed after caching.
- **Zero hosting cost after first load**: Progress is saved in the browser's IndexedDB and localStorage, not on a server.
- **No account required**: Users create a local profile with a PIN, or use the app as a guest. No email, no password, no server registration.
- **Shared computer support**: Multiple profiles with PIN protection keep each student's progress separate on shared devices.
- **Low-spec hardware target**: Built with vanilla JavaScript (no heavy frameworks). Targets dual-core CPUs with 2 GB RAM.
- **Current version**: 0.9.0 (from `package.json` and `core/version.js`)

### Current version

- **Application version**: 0.9.0 (`package.json`, `core/version.js`, `manifest.json`)
- **Service worker version**: 0.20.9 (`core/sw-version.js`)

## 2. Who This Guide Is For

Based on repository evidence, PyKnowledge is intended for:

- **Students**: Primary learners who complete lessons and quizzes. The app specifically mentions TRAC students in Bongao, Tawi-Tawi.
- **Beginning Python learners**: The curriculum starts with "What is Python?" and progresses through basic syntax to object-oriented programming. No prior programming experience is assumed.
- **Teachers and instructors**: The course structure, reference library, and progress tracking support classroom use. The About page explicitly invites teachers to help improve lessons.
- **Administrators**: Multiple profiles with PIN protection are built for shared school computers where multiple students use the same device.

The app does **not** currently support:

- Server-side user accounts or cloud-based progress (the optional server module exists but is not the primary mode of operation)
- Real-time collaboration or multiplayer features
- Administrative dashboards for teachers (the About page mentions this as a future possibility, but no admin UI exists in the codebase)

## 3. Getting Started

### Where to access PyKnowledge

PyKnowledge is a web application. You can access it by:

1. **Online (first visit)**: Open the app URL in a modern browser (Chrome, Edge, Firefox, Safari). The landing page loads first.
2. **After installation (offline)**: Once installed as a PWA, the app launches from your home screen or apps menu and works without internet.

### What you need

- A modern browser with JavaScript enabled (Chrome 90+, Edge, Firefox 88+, Safari 14+)
- Web Crypto API support (available in all modern browsers — required for PIN hashing)
- At least one visit while online to cache content for offline use
- Approximately 200-250 MB of device storage for full offline content

### What happens on first launch

1. The **landing page** loads, showing the project description, target region, and technology stack.
2. You see a **"Start learning"** button (links to `#/login`) and an **"Explore the Project"** button (scrolls down the landing page).
3. Clicking "Start learning" enters the app shell and shows the **authentication flow**.

### PWA installation

The app supports PWA installation on compatible browsers and devices:

- **Android Chrome**: An install prompt appears after first visit. You can also tap the menu (⋮) → "Add to Home screen" → "Install".
- **Desktop Chrome/Edge**: Look for the install icon in the address bar, or use the browser menu → "Install [App Name]".
- **iOS Safari**: Tap the Share button → "Add to Home Screen" → "Add".

When installed, PyKnowledge launches in standalone mode (no browser address bar) and functions like a native app. All content downloads to the device during installation.

### Guest access

If you do not want to create a profile, you can select **"Continue as Guest"** on the welcome screen. Guest progress is saved locally on the device but can be migrated to a named profile later if you create one.

## 4. Understanding the Home Page

The **home page** (landing page) is the first thing you see when you open PyKnowledge online or when you navigate to `#/login` without any profiles.

### What you see

The home page contains several sections (scrollable):

1. **Hero section**: The PyKnowledge logo, badges ("Offline-First", "Zero Hosting Cost", "CHED-Aligned"), a description, and two buttons:
   - **"Start Learning"** — enters the authentication flow
   - **"Explore the Project"** — scrolls down to the "The Area" section

2. **The Area section**: Describes the target region (TRAC, BARMM, CHED Curriculum) and shows performance statistics:
   - Page load target: under 500 ms
   - Minimum RAM: 2 GB
   - Hosting cost: 0
   - Offline after install: 100%

3. **The Platform section**: Explains that PyKnowledge is a self-contained PWA with four modules:
   - Content Module (lessons with code examples)
   - Assessment Module (quizzes with 70% pass threshold)
   - Progress Module (lesson unlocking, achievements, progress tracking)
   - Local Profiles (PIN-protected student profiles)

4. **Design section**: Describes visual language, accessibility, motion design, and responsive layout.

5. **Curriculum section**: Shows counts of modules and lessons:
   - 9 modules
   - 28 lessons
   - 28 quizzes

6. **Stakeholders section**: Lists project stakeholders (Students, CHED, BARMM, TRAC Admin, ICS Faculty, Project Team).

7. **Footer**: "Ready to Learn Python?" with a link to "Enter Learning Dashboard" and version info.

### Navigation

The landing page uses smooth-scrolling anchors. Links like `#the-area`, `#platform`, `#design`, `#curriculum`, `#stakeholders` scroll to the respective sections. The "Start Learning" button uses `#/login` which transitions to the app shell.

## 5. Profiles and Authentication

PyKnowledge uses **local, offline authentication** with no server involvement in its primary mode.

### When you first enter the app

- If **no profiles exist** on the device, you see the **Welcome screen** with:
  - "Create Profile" button
  - "Continue as Guest" button
  - An installation guide (how to add to home screen on Android and iOS)

- If **profiles already exist** on the device, you see the **Profile Picker** with:
  - A card for each saved profile (showing avatar color and first letter of name)
  - An "Add Profile" card
  - "Continue as Guest" option
  - A "Download App" button (visible when the browser supports PWA installation)

### Creating a profile

1. Click **"Create Profile"** on the welcome screen.
2. Enter your **name** (at least 2 characters).
3. Set a **4-8 digit numeric PIN** (only numbers allowed).
4. Confirm the PIN.
5. The profile is stored locally with a hashed PIN (PBKDF2 with salt — never stored in plaintext).

After creation, you are automatically signed in and taken to the dashboard. If you had guest progress, it is migrated into the new profile automatically.

### Signing in with a profile

1. On the profile picker, click your profile card.
2. Enter your **PIN** using the on-screen keypad or your physical keyboard.
3. The PIN is verified against the stored hash.
4. On success, you are taken to the dashboard. You have **5 attempts** before being blocked (though the app does not currently implement a hard lockout — it decrements the attempt counter in the UI).

### Guest mode

- Click **"Continue as Guest"** on either the welcome or profile picker screen.
- No PIN or profile creation is required.
- Guest progress is saved under a persistent guest ID.
- Guest progress can be migrated to a named profile later by creating a profile (migration happens automatically on profile creation).
- In guest mode, the navbar shows "Guest" as a label with a "Sign out" button.

### Authentication requirements

- Profiles use **PIN-based authentication** (4-8 digits, numbers only).
- PINs are hashed using **PBKDF2** (100,000 iterations, SHA-256) with a random salt.
- Authentication happens entirely in the browser using the **Web Crypto API**.
- No server, no email, no cloud storage of credentials.
- Web Crypto must be available — if not, profile creation is blocked with an error message.

### Signing out

- Click your avatar in the top-right of the navbar (real user) or the "Sign out" button (guest).
- A dropdown menu appears for real users with options: "My progress", "About this app", and "Sign out".
- Signing out clears the session. On next access, you return to the profile picker or welcome screen.
- After signing out, the app reloads and returns to the login flow.

### Session timeout

Sessions have a **30-minute idle timeout**. If the app is not used for 30 minutes, the session expires and you must re-enter your PIN. Each interaction (page change, quiz interaction) "touches" the session to extend the timeout.

## 6. Dashboard

The **dashboard** is the main hub after signing in. It is accessible at the route `#/dashboard`.

### What you see

1. **Greeting**: A time-aware greeting ("Good morning/afternoon/evening, [name]") showing your profile name. Below it: "Continue your Python learning journey."

2. **Primary action button**: A prominent button that either says:
   - "START: [Next lesson title]" (if no lessons completed)
   - "CONTINUE: [Next lesson title]" (if some lessons completed)
   - This button links directly to the next locked module (via `#/module/module-1`).

3. **Overall progress section**: Shows your total progress as:
   - "Overall progress"
   - Completion count: e.g., "3/28 lessons · 11%"
   - A visual "memory map" of all 28 lessons (cells showing done/locked/current state)
   - A progress bar

4. **Course statistics**: "This course, by the numbers" — shows:
   - 9 modules
   - Total hands-on exercises (counted from content)
   - Total challenge exercises (counted from content)
   - "0 KB NET" — indicating no data needed after install

5. **Daily trivia**: A rotating Python fact ("$ fortune" style).

6. **Module cards**: A list of all nine modules as cards, each showing:
   - Module icon (inline SVG)
   - Module title and description
   - Progress bar with percentage
   - Completion count: e.g., "1/2 lessons"
   - Status chip: "OPEN", "DONE", or "LOCKED: finish M1"
   - Action button: "Start module", "Continue module", or "Review module"
   - Locked modules show: "Complete all lessons in [previous module title] first"

### Module locking rules

- **Module 1** (Introduction to Python) is unlocked by default for all users.
- **Modules 2-9** require completing **all lessons in the preceding module**. For example, Module 2 unlocks after completing all 3 lessons in Module 1.
- Locked modules cannot be opened. The dashboard shows the locking reason.

### Flash messages

After signing in, the dashboard may show a temporary toast message (e.g., "Signed in — pick up where you left off.") if the URL contains a `?flash=` parameter.

## 7. Learning Modules

PyKnowledge contains **9 modules** organized in a sequential path. Each module must be fully completed (all lessons) to unlock the next.

### Module list

| Module ID | Title | Prerequisite | Lessons |
|-----------|-------|--------------|---------|
| module-1 | Introduction to Python | None (start here) | 3 |
| module-2 | Control Structures | module-1 | 2 |
| module-3 | Loops | module-2 | 3 |
| module-4 | Functions | module-3 | 4 |
| module-5 | Data Structures | module-4 | 4 |
| module-6 | Modules and Imports | module-5 | 3 |
| module-7 | Input and Output | module-6 | 3 |
| module-8 | Errors and Exceptions | module-7 | 3 |
| module-9 | Classes and Object-Oriented Programming | module-8 | 3 |

### Module detail view

When you click "Start module" or "Continue module" on a module card, you go to `#/module/module-X`. This view shows:

- **Module title and description**
- **Lesson list**: A numbered list of all lessons in the module
  - Lessons you have completed show a "Done" badge
  - Lessons that are locked (because the previous lesson is not yet complete) show "(locked)"
  - Lessons you can access are clickable links
  - The current/next lesson is suggested by the primary action button
- **Primary action button**: Either "Start Lesson", "Continue Lesson", or "Review Lesson"

### Lesson sequencing within a module

- Lessons in each module are **sequentially locked**: lesson N+1 is only available after lesson N is completed.
- The first lesson in each module is always available (unlocked) once the module itself is unlocked.
- Completing the last lesson in a module unlocks a quiz for that lesson.

### Completion requirements

A lesson is marked complete when you finish it and navigate away (the lesson does not have an explicit "mark complete" button — completion is handled by the quiz engine when you pass a quiz, or by the progress system).

Actually, reviewing the code more carefully: lessons are marked complete through the quiz flow. The quiz's `markLessonComplete` function is called when a quiz is passed, which marks the associated lesson (quiz ID matches lesson ID) as complete.

## 8. Lessons

Lessons are where you read content and work through exercises. Access them via `#/lesson/lesson-X-Y`.

### What you see in a lesson

1. **Header**: Lesson title and estimated duration (e.g., "20 min").

2. **Content sections**: Each lesson contains one or more sections, each with:
   - A **heading** (e.g., "Variables", "Worked Example")
   - A **body** (explanation text, may include numbered lists and line breaks)
   - Optional **code block** (shown with line numbers and a `>>>` prompt on the first line)

3. **Exercises** (if the lesson has them): Each exercise is rendered as a card with:
   - Exercise number (e.g., "EX 01")
   - Exercise type badge (e.g., "predict output", "fix the code", "parsons", "write code", "challenge")
   - Difficulty level (easy, medium, hard)
   - The exercise prompt
   - Interactive elements (see Exercise types below)

4. **Navigation footer**:
   - "Back to Module" button
   - "Previous" button (if not the first lesson in the module)
   - "Next Lesson" button (if not the last lesson in the module) or "Take Quiz" button (for the last lesson)

### Exercise types

PyKnowledge lessons contain five types of interactive exercises:

1. **Predict output**: Code is displayed. You select what you think it will print from multiple-choice options. Click "Check Answer" to verify. Correct answers show an explanation.

2. **Fix the code**: Buggy code is shown alongside a hidden correct solution. You can reveal the solution via a "reveal fix" details element. Hints are provided with progressive disclosure.

3. **Parsons problems**: Code blocks are provided in a jumbled order. You drag and drop them into the correct order. A "Check Order" button verifies your arrangement. Distractor blocks (incorrect options) may be included. Also supports tap-to-move on touch devices.

4. **Write code**: You write Python code in an embedded code editor. The code runs in the browser using **Skulpt** (a browser-based Python interpreter — no server needed). Test cases are provided, and your output is compared against expected output.

5. **Challenge**: More complex write-code exercises that go beyond the basics. Same editor and execution model as write-code exercises.

### Progressive hints

Exercises with hints support a **progressive hint system**: hints are revealed one level at a time via a "hint --level 1" button. After viewing a hint, the button advances to reveal the next level if available.

### Misconception detection

Some exercises include **misconception data** — common student errors with detection rules. If your answer triggers a known misconception, the feedback includes a traceback-style explanation and a link to a remediation exercise.

### Navigation between lessons

- Use the "Next Lesson" button at the bottom of a lesson to advance.
- Use the "Previous" button to go back.
- You can also navigate via the module view or the dashboard.
- Press **Escape** to return to the home page from any route.

### Lesson locking

Lessons are locked sequentially within a module. If you try to access a lesson whose predecessor is not yet completed, you see a "Lesson Locked" message: "Complete [previous lesson title] first."

## 9. Quizzes

After completing the last lesson in a module, you can take that module's quiz. The quiz route is `#/quiz/lesson-X-Y` (the quiz ID matches the lesson ID).

### There is also a Capstone Quiz

The **Final Capstone** quiz (`capstone-final`) covers all nine modules. It contains 10 questions of mixed types. It is accessible at `#/quiz/capstone-final` and is linked from the last lesson of Module 9 (`lesson-9-3`).

### Starting a quiz

When you navigate to a quiz, you see:
- Quiz title
- Number of questions (e.g., "5 questions")
- Pass threshold: **"Need 70% to pass"**
- A note: "Take your time — you can retry if you don't pass on the first attempt."
- **"Start Quiz"** button
- "Back to Lesson" link

Click "Start Quiz" to begin answering questions.

### Answering questions

Quizzes support three question types:

1. **Multiple choice**: Select one option from a list of radio buttons.
2. **True/False**: Select "True" or "False" via radio buttons.
3. **Fill in the blank**: Type your answer in a text input. Multiple correct answers may be accepted (case-insensitive, whitespace-trimmed).

### Navigation during a quiz

- Use the **"Prev"** and **"Next"** buttons to move between questions.
- Your answers are saved as you go — you can navigate back and change them.
- A segmented progress bar shows your position (e.g., Q1/5 with filled dots).

### Submitting a quiz

On the last question, the "Next" button changes to **"Submit Quiz"**.

### Scoring

- Your score is calculated as a percentage: (correct answers / total questions) × 100.
- The **passing threshold is 70%**. Scores at exactly 70% or above pass.
- Scores are rounded to the nearest whole number.

### If you pass (70% or higher)

1. The lesson associated with the quiz is marked as **complete** in your progress.
2. The **next module is unlocked** (if there is one).
3. **Achievements** are checked and any newly earned ones are displayed with a celebration animation.
4. If there is a next module, you see: **"MODULE X UNLOCKED"**
5. If this was the last module, you see: **"COURSE COMPLETE"**
6. You get a **"Continue"** button (goes to the module view) and a **"Dashboard"** button.

### If you fail (below 70%)

1. You see your score and the number of correct answers.
2. **Weak spots** are identified — concepts from questions you answered incorrectly are listed as review tags.
3. You can click **"Retry Quiz"** to try again from the beginning.
4. You can click **"Review Lesson"** to go back to the lesson content.
5. You can click **"Dashboard"** to return to the dashboard.

There is **no limit** on retry attempts. Each retry starts the quiz fresh.

### Quiz score storage

- Quiz scores are stored per-lesson in your progress data.
- Each retry **replaces** the previous score (the most recent attempt's score is kept).

### Verified scoring behavior (from tests)

- 10 questions, 7 correct = 70% = pass
- 10 questions, 6 correct = 60% = fail
- All correct = 100% = pass
- All wrong = 0% = fail
- Unanswered/null answers count as wrong

## 10. Progress Tracking

PyKnowledge tracks your learning progress locally on your device. No data is sent to any server.

### What is tracked

- **Completed lessons**: A list of lesson IDs you have finished (each marked complete when you pass its quiz).
- **Quiz scores**: A record of your score for each quiz (replaced on retry).
- **Achievements**: IDs of achievements you have earned.
- **Unlocked modules**: Which modules are available to you (starts with module-1, grows as you complete modules).
- **Last accessed**: A timestamp updated each time your progress is saved.

### Where to view progress

1. **Dashboard** (`#/dashboard`): Shows overall completion percentage, a memory map of all lessons, and per-module completion counts.
2. **Progress page** (`#/progress`): A detailed breakdown showing:
   - Overall completion percentage
   - Quiz statistics (quizzes taken, average score)
   - Number of unlocked modules
   - A sparkline chart of quiz scores over time
   - Per-module progress bars
   - All achievements (unlocked and locked)

### How completion works

- A lesson is marked complete when you pass its associated quiz (70% or higher).
- Passing a quiz also unlocks the next module automatically.
- The dashboard shows a visual "memory map" — one cell per lesson, color-coded:
  - Filled (ok): completed
  - Current/glowing: in-progress or next available
  - Locked (hatched): not yet available

### Offline persistence

- Progress is saved in **IndexedDB** (primary storage) with a **localStorage** fallback.
- Progress persists across app restarts and browser sessions.
- On shared computers, each profile has its own separate progress (keyed by user ID).
- Guest progress is stored separately and can be migrated to a profile.

### Progress integrity

The app includes a **progress integrity check** that validates your progress against the lesson sequence. If someone manually edits local storage to mark a later lesson as complete without completing its predecessor, the integrity check will prune the impossible entries and restore the longest consistent prefix.

## 11. Achievements

PyKnowledge has four achievements that you can earn:

| ID | Title | Condition |
|----|-------|-----------|
| first-lesson | First Steps | Complete your first lesson |
| first-quiz | Quiz Taker | Pass your first quiz with 70% or higher |
| module-complete | Module Master | Complete all lessons in a module |
| perfect-score | Perfect Score | Score 100% on any quiz |

### How achievements work

- Achievements are **checked automatically** when you pass a quiz.
- Any newly earned achievements are displayed immediately with a celebration animation.
- Achievement progress is **persistent** — it is saved in your local progress data and survives app restarts.
- Achievements are **profile-specific** — each user's achievements are stored separately.
- If you are using guest mode, achievements are saved under your guest ID and migrate to a profile if you create one later.

### Viewing achievements

- **Progress page** (`#/progress`): All achievements are listed with their status (unlocked or locked).
- **Quiz result screen**: When you pass a quiz and earn a new achievement, it is displayed with a badge.

## 12. Reference Library

The **Reference Library** (`#/library`) is a free-reading area with no locks or quizzes. It is designed for quick lookups and review.

### What it contains

The library has two main sections:

1. **Nine reference cheat sheets** — one per module:
   - `ref-basics`: Python Basics
   - `ref-conditionals`: If-Else Statements
   - `ref-loops`: Loops
   - `ref-functions`: Functions
   - `ref-datastructures`: Lists, Tuples, Sets & Dictionaries
   - `ref-modules`: Modules & Imports
   - `ref-io-formatting`: Output Formatting, Files & JSON
   - `ref-errors`: Errors & Exceptions
   - `ref-oop`: Classes & OOP (+ Generators)

   Each sheet contains sections with headings, explanatory text, and code examples.

2. **Searchable glossary**: 24 Python terms from "Argument" to "Yield", each with a one-line definition.

### Navigating the library

1. The **library index** (`#/library`) shows a file-tree-style listing of all cheat sheets and the glossary.
2. Clicking a cheat sheet opens it at `#/library/sheet-id`.
3. Each sheet has **Previous** and **Next** buttons to navigate between sheets.
4. Clicking the glossary link opens `#/library/glossary`.

### Searching the glossary

The glossary supports **live search**: type in the search box at the top, and terms are filtered in real time based on whether the term or definition contains your search text.

### Offline availability

The entire library (all sheets and glossary terms) is cached by the service worker. No internet connection is required to browse, read, or search the library.

## 13. Offline Mode

PyKnowledge is built around an **offline-first architecture**. Here is exactly what works without a network connection:

### What works offline

- **All lessons**: Content, code examples, and all exercise types (predict output, fix the code, Parsons, write code, challenge)
- **All quizzes**: All 29 quizzes including the 10-question capstone
- **The Python code runner**: The Skulpt interpreter runs entirely in the browser — no server needed for code execution
- **Progress tracking**: All progress, scores, and achievements are saved locally via IndexedDB and localStorage
- **Achievements**: Earned and displayed entirely client-side
- **Reference Library**: All cheat sheets and glossary searches work offline
- **Authentication**: Profile creation, PIN login, and guest mode all work offline (uses Web Crypto API)
- **PWA installation**: Installing the app caches all content for offline use
- **Navigation**: All routing (hash-based) works without a server

### What does NOT work offline

- **Server/API mode**: If `window.PYKNOWLEDGE_API_URL` is configured, the app can fetch lessons and quizzes from a server. This is optional and disabled by default. Without a server configured, the app uses static JSON files (which are cached).
- **New content downloads**: If new lessons or quizzes are added to the server while you are offline, they will not appear until you reconnect and the service worker updates the cache.
- **PWA installation prompt**: The "Install" button only appears when the browser's `beforeinstallprompt` event fires, which requires an initial online visit.

### Service worker caching

The service worker caches **55+ static assets** including:

- All application code (HTML, CSS, JavaScript)
- All content files (lessons.json, quizzes.json, reference.json)
- The Python interpreter (Skulpt) and supporting libraries
- Fonts and images
- The manifest file and icons

The cache uses a **cache-first strategy**: requests are served from the cache immediately, and only go to the network if no cached copy exists. If the network is unavailable, cached content is served. If something is not cached, an offline error page is returned.

### Cache progress

During the first install, the service worker reports caching progress to the app (counting cached files out of the total). This is used by the update notifier and offline indicator components.

### When the network disappears

If you are using the app and lose connectivity:

1. An **offline indicator** appears: "You are offline — cached content is available"
2. The status pill in the header changes to "OFFLINE"
3. All existing functionality continues to work (lessons, quizzes, progress)
4. A toast notification shows: "You are now offline. Cached lessons remain available."

### When the connection returns

1. The offline indicator disappears
2. The status pill updates
3. A toast notification shows: "Back online."
4. The app checks for service worker updates (if online)

### Guest vs. profile offline behavior

Both guest and profile modes work identically offline. All data (profiles, PINs, progress) is stored in browser storage. The only difference is that creating a profile requires Web Crypto API support, which virtually all modern browsers provide.

## 14. Installing PyKnowledge as a PWA

### When installation is available

The PWA install prompt appears automatically on supported devices when:

- The app has been visited at least once online
- A service worker is registered
- The `beforeinstallprompt` event fires

You can also trigger the install prompt via the "Download App" button on the authentication screens.

### Android (Chrome)

1. After loading PyKnowledge once, Chrome may show a banner: "Add to Home screen"
2. Alternatively, tap the **⋮ menu** → **Add to Home screen** → **Install**
3. Or use the **"Download App"** button on the welcome/profile screens
4. Once installed, launch PyKnowledge from your home screen. It opens in fullscreen mode with no browser UI.

### Desktop (Chrome/Edge)

1. Visit PyKnowledge in Chrome or Edge
2. Click the **install icon** in the address bar (or find "Install" in the browser menu)
3. Confirm the installation prompt
4. Launch from your desktop or app launcher

### iOS (Safari)

1. Visit PyKnowledge in Safari
2. Tap the **Share** button
3. Tap **Add to Home Screen**
4. Confirm and launch from your home screen

### After installation

- The app launches in standalone mode (no browser address bar or navigation)
- All content is cached locally
- The app works without any internet connection
- Updates are applied automatically when you reconnect (a notification prompts you to refresh)

## 15. Mobile and Low-End Device Usage

### Mobile navigation

- All interactive elements (buttons, quiz options, exercise interactions) are sized for touch
- The PIN entry screen uses a large on-screen keypad
- Parsons problems support both drag-and-drop and tap-to-move
- The code editor supports touch-based text selection and editing

### Responsive design

- The layout adapts from desktop to mobile using a mobile-first CSS approach
- Module cards, lesson content, and quiz questions reflow based on screen width
- Text remains readable on small screens

### Performance considerations

The About page explicitly states the app is designed for:
- **Dual-core CPU, 2 GB RAM** minimum
- **Under 500 ms** page load target
- **200-250 MB** storage (including all content and the Python interpreter)

### Reduced motion

The app respects the `prefers-reduced-motion` CSS media query:
- Page transitions are disabled for users who prefer reduced motion
- Animations (staggered card entrances, progress fills) are skipped
- The scroll-based reveal animations are not applied

### Accessibility

Verified accessibility features include:

- **Skip-to-content**: Keyboard navigation support via the navbar and Escape key to return home
- **ARIA labels and roles**: All interactive elements have appropriate ARIA attributes (e.g., `aria-label`, `aria-current`, `role`)
- **Keyboard navigation**: Full keyboard support including Escape to return home, Tab for focus movement, and Enter/Space for activation
- **Screen reader support**: Semantic HTML5 structure with proper headings, landmarks (`role="banner"`, `role="main"`, `role="navigation"`, `role="contentinfo"`)
- **Focus management**: Focus is moved to the main content area after navigation
- **Offline indicator visibility**: Uses `aria-live="polite"` for dynamic status updates
- **Quiz progress**: Uses `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`
- **Visual indicators**: Color is not the only indicator — text labels and icons supplement visual state (e.g., "LOCKED", "DONE", "OPEN" chips)

## 16. Common Problems and Solutions

### The app does not load

**Possible causes and solutions:**

- **JavaScript is disabled**: PyKnowledge requires JavaScript. Enable JavaScript in your browser. The app shows a noscript warning if JavaScript is disabled.
- **Browser is too old**: The app uses ES6+ modules and the Web Crypto API. Use a modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+).
- **Service worker is blocked**: Some browser extensions or corporate policies block service workers. Try disabling ad blockers or content blockers.
- **File corrupted**: If the app fails to load after an update, try refreshing the page. If the problem persists, clear your browser's cache and service workers for the site.

### I cannot log in / I forgot my PIN

- **No PIN recovery exists**: PINs are stored as hashes and cannot be recovered. If you forget your PIN, you must create a new profile.
- **To start over**: Sign out, then on the profile picker, create a new profile with a new name. The old profile remains but you will need to use the new one.
- **5 attempts allowed**: You have 5 PIN attempts before the UI shows "ACCESS DENIED" and resets the input. There is no permanent lockout.

### A lesson or module is locked

- **Module locked**: You must complete **all lessons** in the prerequisite module. For example, to unlock Module 2, complete all 3 lessons in Module 1.
- **Lesson locked**: You must complete the **previous lesson** in the same module. Lessons unlock sequentially.
- **Solution**: Check your dashboard to see which lessons are marked "Done". Complete any missing lessons by working through earlier content.

### My quiz score is low / I failed a quiz

- **You can retake quizzes**: Click "Retry Quiz" on the failure screen. There is no limit on attempts.
- **Review weak spots**: The failure screen highlights concepts you missed. Use the "Review Lesson" link to study those topics.
- **Passing score**: You need 70% or higher to pass. Scores are rounded to the nearest whole number.

### My progress disappeared

- **Profile-specific**: Progress is stored per-profile. If you signed in as a different profile or as a guest, your progress from another profile will not appear.
- **Cleared browser data**: If you or your browser cleared storage (cache, site data), progress is lost. This is stored only on the device.
- **Guest progress**: Guest progress uses a persistent ID. If you cleared site data, the guest ID is lost and progress is gone.
- **Solution**: Ensure you are signed into the correct profile. If progress was truly cleared, starting over is the only option (there is no cloud backup).

### The application is offline

When offline:
- The offline indicator appears at the top of the screen
- All cached lessons, quizzes, and exercises remain available
- Your progress continues to save locally
- No data is lost
- Simply continue working — the app is designed for this scenario

### PWA installation is not working

- **Not supported**: PWA installation requires a supporting browser (Chrome, Edge, or Safari on iOS). Some browsers (mobile Firefox, etc.) do not support the install prompt.
- **Already installed**: If the app is already running in standalone mode, the install button is hidden.
- **Incognito/private browsing**: Installation is not available in private browsing modes.
- **Corporate policies**: Some managed devices block PWA installation.

### Code exercises do not run

- The Python code runner uses **Skulpt**, which is cached by the service worker. If the interpreter fails to load, refresh the page.
- Skulpt supports a subset of Python 3 syntax. Some advanced language features may not be available in the browser interpreter.

## 17. Data and Privacy

### What data is stored locally

All your data never leaves your device. PyKnowledge stores:

1. **Profiles**: Your display name, avatar color, PIN hash, PIN salt, and user ID — stored in `localStorage` under the key `pyknowledge_profiles`.
2. **Sessions**: Active user ID and last-active timestamp — stored in `sessionStorage` under the key `pyknowledge_session`.
3. **Progress**: Completed lessons, quiz scores, achievements, unlocked modules, and last-accessed timestamp — stored in **IndexedDB** (primary) with a `localStorage` fallback.
4. **Guest ID**: A persistent identifier for guest users — stored in `localStorage` under the key `pyknowledge_guest_id`.
5. **Theme preference**: `pk-theme` in `localStorage`.

### Data isolation

- Each profile has a **separate progress record** keyed by user ID (e.g., `pyknowledge_progress_user_123_abc`).
- Guest progress is stored under the guest ID and does not mix with profile data.
- When a guest creates a profile, their guest progress is **migrated** to the new profile and the guest data is cleaned up.

### What is NOT stored

- **No plaintext PINs**: PINs are hashed with PBKDF2 (100,000 iterations, SHA-256) with a random salt. The hash and salt are stored, never the raw PIN.
- **No server data**: In the default offline mode, no data is sent to any server.
- **No analytics or tracking**: The app does not include analytics scripts or tracking pixels.
- **No personal information beyond the profile name**: No email, address, or other PII is collected.

### Server mode (optional, not default)

The app includes optional server integration (Node.js/Express/PostgreSQL) that can be enabled by setting `window.PYKNOWLEDGE_API_URL`. In this mode:

- Lessons and quizzes can be fetched from a server API
- Authentication can use email/password with JWT tokens
- Server data is fetched network-first (falls back to cache when offline)

But in the standard offline-first mode, none of this is active. The app works entirely from local JSON files and browser storage.

## 18. Frequently Asked Questions

### Can I use PyKnowledge without internet?

Yes. After the first visit (which loads and caches all content), PyKnowledge works entirely offline. All lessons, quizzes, exercises, the Python interpreter, and your progress are stored locally.

### Do I need an account?

No. PyKnowledge does not require an account. You can either create a local profile with a PIN, or use the app as a guest. No email, no password, no server registration.

### Can I learn Python offline?

Yes. The entire Python curriculum — 9 modules, 28 lessons, 116 exercises, 29 quizzes, and a Python code runner (Skulpt) — works without internet after the first load.

### How is my progress saved?

Progress is saved in your browser's IndexedDB (with localStorage fallback) when you complete a lesson or pass a quiz. It persists across app restarts and works offline. Progress is per-profile — each student on a shared computer has their own.

### What happens if I fail a quiz?

You can retake quizzes unlimited times. The quiz engine shows your weak spots (concepts you missed) and lets you review the lesson. You need 70% or higher to pass. The most recent score replaces any previous attempt.

### Can I repeat a lesson?

Yes. You can navigate back to any completed lesson at any time. The lesson will show your previous exercises, and you can work through them again. Quizzes can also be retaken.

### Can I install PyKnowledge on Android?

Yes, as a PWA. On Android Chrome, use the menu (⋮) → "Add to Home screen" → "Install". You can also use the "Download App" button on the welcome/profile screens. Once installed, it launches like a native app and works offline.

### Can I use it on a computer?

Yes. PyKnowledge works in any modern browser on Windows, macOS, or Linux. You can also install it as a PWA on desktop (Chrome/Edge: click the install icon in the address bar).

### What happens when the connection returns?

When you come back online, the app detects the change, shows "Back online", and checks for service worker updates. Your offline progress is preserved and continues to be stored locally. No data is uploaded or synced.

### What are the nine modules?

1. Introduction to Python
2. Control Structures
3. Loops
4. Functions
5. Data Structures
6. Modules and Imports
7. Input and Output
8. Errors and Exceptions
9. Classes & OOP

### What is the passing score for quizzes?

70%. Scores at or above 70% pass. Scores below 70% fail but can be retried.

### What are the five exercise types?

1. Predict output (guess what code prints)
2. Fix the code (correct buggy code)
3. Parsons problems (arrange code blocks in order)
4. Write code (write and run Python in the browser)
5. Challenge (complex coding problems)

### Is there a final exam?

Yes. After completing Module 9, you can take the **Final Capstone** quiz (`capstone-final`) — a 10-question mixed review covering all nine modules. It is accessible at `#/quiz/capstone-final`.

## 19. Quick Start

1. **Open PyKnowledge** in your browser (Chrome, Edge, Firefox, or Safari).
2. Read the landing page, then click **"Start Learning"**.
3. On the welcome screen, click **"Create Profile"**.
4. Enter your name and set a 4-digit PIN. Confirm the PIN.
5. You are taken to the **dashboard**. It shows Module 1, which is unlocked.
6. Click **"Start module"** on the Module 1 card.
7. Click **"Start Lesson"** to open the first lesson ("What is Python?").
8. Read the lesson and work through the exercises. Each exercise provides hints and immediate feedback.
9. When you reach the last lesson of a module, click **"Take Quiz"**.
10. Complete the quiz. If you score 70% or higher, the lesson is marked complete and the next module unlocks.
11. Return to the **dashboard** and continue with the next module.
12. After completing all 9 modules, take the **Final Capstone** quiz via `#/quiz/capstone-final`.
13. Check your **progress** anytime at the Progress page (`#/progress`) to see completion percentages, quiz scores, and achievements.
14. If you are offline, the app continues to work. Progress saves locally just the same.

## 20. Documentation Verification Matrix

| Feature | Status | Evidence | User Guide Coverage |
|---------|--------|----------|---------------------|
| Landing page | Verified UI | index.html landing-root section | Yes |
| App shell | Verified UI | index.html spa-root, engine.js loaded dynamically | Yes |
| PWA installation | Verified UI | manifest.json, install-prompt.js, install guide in auth-screen.js | Yes |
| PWA manifest | Verified | manifest.json (display=standalone, icons, theme) | Yes |
| Service worker | Verified Code | service-worker.js (cache-first, 55+ assets, SW version 0.20.9) | Yes |
| Offline indicator | Verified UI | offline-indicator.js | Yes |
| Update notifier | Verified UI | update-notifier.js (refresh banner) | Yes |
| Authentication (profiles) | Verified UI + Tests | storage/auth.js, auth-screen.js, auth.test.js | Yes |
| PIN creation (name validation) | Verified UI | auth-screen.js renderRegister (min 2 chars) | Yes |
| PIN creation (PIN validation) | Verified UI | auth-screen.js (4-8 digits, numeric only) | Yes |
| PIN hashing (PBKDF2) | Verified Code + Tests | utils/crypto.js, auth.test.js | Yes |
| Session timeout (30 min) | Verified Code | storage/auth.js SESSION_TIMEOUT_MS | Yes |
| Guest mode | Verified UI | auth-screen.js "Continue as Guest" | Yes |
| Guest progress migration | Verified Code | core/storage.js migrateGuestProgress() | Yes |
| Profile isolation | Verified UI + Tests | storage/auth.js per-user keys, auth.test.js | Yes |
| Logout | Verified UI | navbar.js btn-logout handler | Yes |
| Dashboard | Verified UI | app/dashboard/dashboard.js | Yes |
| Dashboard greeting (time-aware) | Verified UI | dashboard.js greetUser() | Yes |
| Dashboard primary button | Verified UI + Tests | dashboard-cards.test.js | Yes |
| Dashboard memory map | Verified UI | dashboard.js memoryMapHtml() | Yes |
| Module locking | Verified UI + Tests | storage/progress.js checkPrerequisite, prerequisites.test.js | Yes |
| Lesson viewer | Verified UI | app/lessons/lesson-viewer.js | Yes |
| Lesson sequential locking | Verified UI | lesson-viewer.js locked check | Yes |
| Lesson navigation (prev/next) | Verified UI | lesson-viewer.js footer buttons | Yes |
| Exercise: predict_output | Verified UI | lesson-viewer.js renderExercises | Yes |
| Exercise: fix_the_code | Verified UI | lesson-viewer.js (buggy + reveal solution) | Yes |
| Exercise: parsons | Verified UI | lesson-viewer.js (drag-and-drop + tap-to-move) | Yes |
| Exercise: write_code | Verified UI | lesson-viewer.js (Skulpt executor) | Yes |
| Exercise: challenge | Verified UI | lesson-viewer.js | Yes |
| Progressive hints | Verified UI | lesson-viewer.js renderHintLevels() | Yes |
| Misconception detection | Verified UI | lesson-viewer.js findRemediation() | Yes |
| Quiz engine | Verified UI + Tests | app/quizzes/quiz-engine.js, quiz-scoring.test.js | Yes |
| Quiz types (MC, TF, fill-blank) | Verified UI | quiz-engine.js questionHtml() | Yes |
| Quiz 70% pass threshold | Verified UI + Tests | quiz-engine.js (passingThreshold=70), quiz-scoring.test.js | Yes |
| Quiz retry | Verified UI | quiz-engine.js "Retry Quiz" button | Yes |
| Quiz score storage | Verified UI + Tests | core/storage.js markLessonComplete, progress.test.js | Yes |
| Quiz weak spot review | Verified UI | quiz-engine.js weakSpots | Yes |
| Achievement system | Verified UI | storage/achievements.js, progress-dashboard.js | Yes |
| 4 achievements (first-lesson, first-quiz, module-complete, perfect-score) | Verified Code | achievements.js ACHIEVEMENTS array | Yes |
| Progress tracking | Verified UI + Tests | core/storage.js, progress.js, progress.test.js | Yes |
| Progress: IndexedDB + localStorage | Verified Code | core/idb.js | Yes |
| Progress integrity check | Verified Code | storage/progress.js validateProgressIntegrity() | Yes |
| Progress dashboard (sparkline) | Verified UI | progress-dashboard.js quizScoresSparkline() | Yes |
| Reference library (9 sheets) | Verified UI | app/library/reference-library.js, reference.json | Yes |
| Reference library glossary (24 terms) | Verified UI | reference-library.js renderGlossary(), live search | Yes |
| Reference library offline | Verified Code | service-worker.js caches reference.json | Yes |
| Capstone quiz (10 questions) | Verified Content | quizzes.json capstone-final | Yes |
| Curriculum (9 modules, 28 lessons) | Verified Content | content/lessons.json | Yes |
| 116 exercises | Verified Content | Parsed from lessons.json | Yes |
| 5 exercise types | Verified UI | lesson-viewer.js renderExercises switch | Yes |
| 29 quizzes | Verified Content | content/quizzes.json | Yes |
| No videos embedded in lessons | Verified Content | all lesson.video fields are null | Yes |
| Error handling | Verified UI | core/errors.js renderError, renderNotFound | Yes |
| 5-part output (PASS/FAIL/NOT DONE) | N/A | Not user-facing — developer task tracking | Not applicable |
| Accessibility (ARIA, keyboard) | Verified UI | navbar.js, router.js, various components | Yes |
| Reduced motion support | Verified Code | router.js matchMedia('prefers-reduced-motion') | Yes |
| Skulpt Python interpreter | Verified UI | lib/skulpt.min.js, python-executor.js | Yes |
| Routing (hash-based) | Verified Code | core/router.js, engine.js routes | Yes |
| Routes verified (8 routes) | Verified Code | engine.js registerRoute calls | Yes |
| Theme preference (dark) | Verified UI | index.html color-scheme, theme restore | Yes |

## 21. Routes Reference

The following table lists all user-facing routes registered in the application:

| Route | Purpose | Authentication Required | Works Offline | Verified |
|-------|---------|------------------------|---------------|----------|
| `/` | Landing/home page (front-page) | No | Yes | Verified |
| `/login` | Profile picker, PIN entry, profile creation, guest access | No (but required to progress) | Yes | Verified |
| `/dashboard` | Module overview, primary action button, memory map | Yes (if profiles exist) | Yes | Verified |
| `/module/:id` | Module detail — lesson list with sequential locking | Yes (if profiles exist) | Yes | Verified |
| `/lesson/:id` | Lesson content with exercises, code editor, Skulpt runner | Yes (if profiles exist) | Yes | Verified |
| `/quiz/:id` | Quiz with multiple-choice, true/false, fill-blank questions | Yes (if profiles exist) | Yes | Verified |
| `/progress` | Progress dashboard with achievements, sparkline, stats | Yes (if profiles exist) | Yes | Verified |
| `/library` | Reference library index (9 sheets + glossary) | Yes (if profiles exist) | Yes | Verified |
| `/library/:sheetId` | Reference sheet detail with prev/next navigation | Yes (if profiles exist) | Yes | Verified |
| `/library/glossary` | Searchable glossary (24 terms, live search) | Yes (if profiles exist) | Yes | Verified |
| `/about` | About page with curriculum overview, credits, build info | Yes (if profiles exist) | Yes | Verified |

**Note**: When no profiles exist, guest mode allows access to all routes without authentication. When profiles exist, the protected routes require a PIN login. The landing page (`/`) is always accessible regardless of authentication state.

### Authentication gating logic

From `core/router.js`:
- Routes requiring auth: `/dashboard`, `/module`, `/lesson`, `/quiz`, `/progress`, `/library`, `/about`
- If profiles exist and no session is active → redirect to `/login`
- If no profiles exist → guest mode is automatically allowed

### Escape key navigation

Pressing the **Escape** key from any route (except `/`) returns you to the home page (`/`).

## 22. Exercise Type Reference

### Predict Output

- You see a code snippet and are asked what it will print
- Select from multiple-choice options
- Click "Check Answer" to verify
- Correct answers show an explanation
- Incorrect answers may show a misconception-based traceback-style error

### Fix the Code

- You see buggy code and the prompt to fix it
- The correct solution is hidden behind a "reveal fix" toggle
- Hints are available with progressive disclosure
- No interactive execution — you fix code mentally/in your head

### Parsons Problems

- Code blocks are provided in a jumbled order
- Drag and drop blocks into the correct order
- Distractor blocks (incorrect options) may be included
- Tap-to-move is supported on touch devices (click to move blocks between source and target)
- Click "Check Order" to verify your arrangement
- Click "Reset" to start over

### Write Code

- Write Python code in an embedded editor
- Code runs in the browser using Skulpt (no server)
- Test cases show expected input/output
- Hints are available with progressive disclosure
- Output is compared against expected output
- Correct code shows a success message; incorrect output shows expected vs. actual

### Challenge

- More complex multi-step coding problems
- Same editor and execution model as write_code
- Often involve multiple concepts
- May have misconception detection with remediation links

## 23. Achievements Reference

### First Steps

- **ID**: first-lesson
- **Unlocked when**: You complete your first lesson (pass the first quiz with 70%+)
- **Description**: "Complete your first lesson"

### Quiz Taker

- **ID**: first-quiz
- **Unlocked when**: You pass your first quiz with 70% or higher
- **Description**: "Pass your first quiz with 70% or higher"

### Module Master

- **ID**: module-complete
- **Unlocked when**: You complete all lessons in any module
- **Description**: "Complete all lessons in a module"

### Perfect Score

- **ID**: perfect-score
- **Unlocked when**: You score 100% on any quiz
- **Description**: "Score 100% on any quiz"

All achievements are checked automatically after each quiz attempt. New achievements trigger a celebration animation and display on the quiz results screen.

## 24. Curriculum Overview

### Module 1: Introduction to Python

No prerequisite. Start here.

**Lessons:**
1. What is Python? — 15 min
2. Variables and Data Types — 20 min
3. Input and Output — 15 min

### Module 2: Control Structures

Prerequisites: Module 1 complete.

**Lessons:**
1. If-Else Statements — 20 min
2. Loops — 25 min

### Module 3: Loops

Prerequisites: Module 2 complete.

**Lessons:**
1. For Loops — 20 min
2. While Loops — 20 min
3. Break, Continue, and Nested Loops — 20 min

### Module 4: Functions

Prerequisites: Module 3 complete.

**Lessons:**
1. Defining and Calling Functions — 20 min
2. Parameters and Arguments — 20 min
3. Return Values — 20 min
4. Scope, Docstrings, and Best Practices — 20 min

### Module 5: Data Structures

Prerequisites: Module 4 complete.

**Lessons:**
1. List Methods — 20 min
2. List Comprehensions — 20 min
3. Tuples, Sets, and Dictionaries — 20 min
4. Looping Techniques — 20 min

### Module 6: Modules and Imports

Prerequisites: Module 5 complete.

**Lessons:**
1. Creating and Importing Modules — 20 min
2. Packages and Module Organization — 15 min
3. Exploring the Standard Library — 20 min

### Module 7: Input and Output

Prerequisites: Module 6 complete.

**Lessons:**
1. Fancier Output Formatting — 20 min
2. Reading and Writing Files — 25 min
3. Saving Structured Data with JSON — 20 min

### Module 8: Errors and Exceptions

Prerequisites: Module 7 complete.

**Lessons:**
1. Syntax Errors and Exceptions — 20 min
2. Handling Exceptions with try/except — 20 min
3. Raising Exceptions and Clean-up — 20 min

### Module 9: Classes and Object-Oriented Programming

Prerequisites: Module 8 complete.

**Lessons:**
1. Class and Instance Basics — 20 min
2. Inheritance — 20 min
3. Iterators and Generators — 20 min

### Final Capstone

After completing all 9 modules, take the **Final Capstone** quiz (10 questions) at `#/quiz/capstone-final`. The capstone quiz description recommends aiming for 80% or higher.

## 25. Limitations

The following limitations are based on inspection of the current implementation:

1. **No video lessons**: All lesson `video` fields are `null`. No videos are used in the curriculum.
2. **No PIN recovery**: Forgotten PINs require creating a new profile.
3. **No cloud sync**: Progress is stored only on the current device/browser.
4. **No admin/teacher dashboard**: No tools for instructors to view student progress remotely.
5. **No exercise auto-grading for code**: Write-code exercises compare output against test cases via Skulpt, but there is no server-side code execution.
6. **Skulpt limitations**: The Skulpt Python interpreter supports a subset of Python 3. Some advanced features may not work.
7. **Single device per profile**: Profiles are stored per-browser. You cannot access your profile from another device.
8. **No email-based accounts**: Authentication is purely local (PIN-based profiles or guest mode).
9. **Session timeout is fixed**: 30-minute idle timeout cannot be changed.
10. **No quiz history**: Only the most recent quiz score is retained; previous attempts are overwritten.

