# Authentication

PyKnowledge uses **offline local authentication** designed for shared school computers in TRAC/BARMM environments. There is no backend server — all auth runs in the browser.

## How It Works

| Feature | Implementation |
|---------|---------------|
| Profile storage | `localStorage` (`pyknowledge_profiles`) |
| Session | `sessionStorage` (30-minute idle timeout) |
| PIN security | PBKDF2-SHA256 (100,000 iterations) via Web Crypto API |
| Progress isolation | Per-user `pyknowledge_progress_{userId}` keys |
| Guest mode | Shared `pyknowledge_progress` key, no PIN required |

## User Flows

### First Visit (no profiles)
1. Welcome screen → Create Profile or Continue as Guest
2. Create Profile: name + 4-digit PIN + confirmation
3. Auto-login after creation

### Returning Visit (profiles exist)
1. Profile picker → select avatar
2. Enter PIN → dashboard with personal progress
3. Or: Continue as Guest (shared progress)

### Sign Out
- Navbar "Sign out" button clears session
- Returns to profile picker on next visit

## Security Notes

- PINs are **never stored in plaintext**
- This is **device-level** protection, not cloud authentication
- Suitable for preventing casual access on shared computers
- Not suitable for high-security scenarios requiring server-side auth
- Guest mode progress is visible to anyone using the device

## API Reference

```javascript
// storage/auth.js
createProfile(displayName, pin)  // Create new student profile
loginWithPin(userId, pin)        // Authenticate and start session
getActiveUser()                  // Current logged-in user or null
isAuthenticated()                // Boolean session check
logout()                         // Clear session
getProfiles()                    // List all profiles on device
deleteProfile(userId)            // Remove profile and progress
```

## Adding Auth to New Features

Progress is automatically scoped when using `getProgress()` / `saveProgress()` from `core/storage.js`. The storage layer reads the active session and uses the correct key.

```javascript
import { getActiveUser } from '../storage/auth.js';
import { getProgress } from '../core/storage.js';

const user = getActiveUser();
const progress = getProgress(); // automatically user-scoped
```
