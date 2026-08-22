# Play Store Submission Guide — PyKnowledge

Everything prepared locally + the exact manual steps only you can do.
Work top to bottom; each section unblocks the next.

---

## STEP 1 — Build the AAB (PWABuilder) — ~15 min, needs a PC browser

1. Open **https://www.pwabuilder.com** in a desktop browser
2. Enter `https://pyknowledge.onrender.com` → **Start**
3. Your manifest scores should be green (id ✅ icons ✅ maskable ✅ SW ✅)
4. Click **Package for stores → Android**
5. Options:
   - Package ID: `com.kerrfairtex.pyknowledge`
   - App name: `PyKnowledge`
   - Short name: `PyKnowledge`
   - Signing: **"Create a new signing key"**
6. Download the ZIP. Inside you'll find:
   - `app-release-bundle.aab` ← the upload artifact
   - `assetlinks.json` ← pre-filled with your key's SHA-256
   - `signing-key.keystore` + password file

⚠️ **BACK UP the keystore + passwords immediately** (password manager + cloud +
USB). Lose it = you can never update this listing again.

Keep-alive note: run an UptimeRobot ping (Step 5) BEFORE doing step 2 so
PWABuilder doesn't hit a cold-started Render instance mid-analysis.

---

## STEP 2 — Deploy assetlinks.json — 5 min after Step 1

1. Copy `assetlinks.json` from the ZIP into this repo:
   ```
   mkdir -p .well-known && cp /path/to/zip/assetlinks.json .well-known/
   git add .well-known/assetlinks.json && git commit -m "Add TWA asset links" && git push
   ```
2. Verify (after deploy finishes):
   ```
   curl https://pyknowledge.onrender.com/.well-known/assetlinks.json
   ```
   Must return 200 + JSON containing your SHA-256.

⚠️ If Play App Signing later shows a DIFFERENT SHA-256 than PWABuilder used
(Console → Setup → App signing → "App signing key certificate"), replace the
fingerprint in assetlinks.json with THAT one and re-push — Chrome validates
against the Play-managed key.

---

## STEP 3 — Listing assets

Already generated in `store-listing/`:
- ✅ `play-store-icon-512.png` — flattened, no alpha, 512×512
- ✅ `feature-graphic-1024x500.png` — brand colors, tagline
- ⬜ **Screenshots — take these yourself** (min 2, JPEG/PNG no-alpha):
  1. Dashboard with progress bars
  2. An open lesson with a code block
  3. Quiz screen
  4. Code editor exercise running Python
  5. Reference Library cheat sheet
  Take on a real phone at full resolution (≥1080px wide ideal).

Store listing copy (paste into Console):

**Title:** PyKnowledge: Learn Python Offline (≤30 chars ✓)
**Short description:** (≤80 chars)
> Free offline-first Python course for TRAC & BARMM students. No signal needed.
**Full description:**
> PyKnowledge is a free, offline-first Python learning platform built for
> students in Tawi-Tawi and across BARMM.
>
> NINE CHED-ALIGNED MODULES
> From your first print() to classes and object-oriented programming —
> lessons, interactive exercises, quizzes, and a final capstone.
>
> WORKS WITHOUT INTERNET
> Install once on your phone or a shared computer. Every lesson, exercise,
> quiz, and even the Python code runner works with zero connection after that.
> Built for island life where signal disappears for hours or days.
>
> LEARN BY DOING
> • Write and run real Python right in the app
> • Predict-output puzzles, fix-the-code challenges, drag-and-drop programs
> • Cheat sheets and a searchable glossary for quick review
> • Track progress per module; lessons unlock as you master them
>
> PRIVATE BY DESIGN
> All your progress stays on YOUR device. No accounts on servers, no ads,
> no tracking, no data collection.
>
> Free forever. Built by Kerr Fairtex for TRAC students in Bongao, Tawi-Tawi.

**Category:** Education · **Tags:** education, programming

---

## STEP 4 — Play Console forms (~30 min)

Account first: play.google.com/console → $25 one-time → identity verification.
New personal accounts must also complete: closed test w/ 20 testers × 14 days
before production access. Start recruiting testers NOW (classmates, teachers).

**App content → Privacy policy:**
`https://pyknowledge.onrender.com/privacy.html` (already live)

**App content → Ads:** No ads

**App content → Data safety** — answer exactly:
1. "Does your app collect or share user data?" → **No**

That single answer short-circuits the rest of the form (local-only storage is
not "collection"). This matches privacy.html — keep them in sync if anything
ever changes.

**Target audience:** 13+ (or 9-12 ONLY if deliberately accepting Families-Policy
rules — recommended: NOT child-directed, 13+)
**Content rating questionnaire:** Education, no violence/gambling/ads → expect IARC "Everyone"
**App access:** All functionality accessible without credentials
**News app declaration:** No
**COVID apps:** No
**Government apps:** No

**Release setup → App signing:** accept Play App Signing (default).
Then check Console's SHA-256 vs assetlinks.json (see Step 2 warning).

---

## STEP 5 — Keep-alive for review week

Render free cold-starts kill reviews. Two-layer fix:

1. **UptimeRobot free account** → Add monitor:
   - URL: `https://pyknowledge.onrender.com/app-shell.html`
   - Interval: 10 minutes
   - Enable NOW (before PWABuilder analysis too)
2. Optional cron fallback (Termux): every 10 min curl the URL.
3. After approval + stable launch month, disable it to save hours.

⚠️ Render free = 750 hrs/month; one always-on service fits, but don't add a
second one.

---

## STEP 6 — Release sequence

1. Create app in Console (name, language English, app or game=App, free)
2. **Closed testing track**: upload AAB → reviewers/testers need opt-in link
   → add 20+ tester emails
3. Fill store listing (assets above), content rating, data safety, privacy
4. Roll out closed test → testers install via opt-in link
5. Day 14+: submit production-access declaration form
6. Approved → promote release to Production → live listing 🎉

---

## Checklist state

- [x] Store icon generated (no alpha)
- [x] Feature graphic generated
- [x] Listing copy drafted
- [x] Data safety answers determined (single "No")
- [x] Privacy policy live
- [x] Keep-alive plan documented
- [ ] Screenshots taken by you
- [ ] AAB built via PWABuilder (needs PC + your account)
- [ ] Keystore backed up
- [ ] assetlinks.json deployed (after AAB)
- [ ] Developer account created
- [ ] 20 testers recruited
