# QA STATUS — Session F1

## Item 1: Live Check
- Live CACHE_VERSION: **0.19.0** (bc05e11 shipped 0.19.0; 0.20.0 bump is uncommitted)
- Live index.html sha256: a3f8b89a034e9b824f74a462550f06a532f82cea3a1ae445f4bf72b00c067cc2
- Local bc05e11 index.html sha256: a3f8b89a034e9b824f74a462550f06a532f82cea3a1ae445f4bf72b00c067cc2
- **MATCH: PASS**
- Live service-worker.js sha256: b1fd953bf965894a4fb9c850a73ccdc47561cf6bfaca0f2e6125e126fec1dd6f
- Local bc05e11 service-worker.js sha256: b1fd953bf965894a4fb9c850a73ccdc47561cf6bfaca0f2e6125e126fec1dd6f
- **MATCH: PASS**
- Live site serves the bc05e11 build. No polling needed.

## Item 2: Hero Contrast
- Computed .hero::before bg: rgb(4, 9, 11) (opaque)
- Computed .hero .wrap bg: rgba(4, 9, 11, 0.9) (mobile, <=768px)
- Computed .hero-bg bg: rgba(0, 0, 0, 0) (transparent, photo shows through)
- h1 color: rgb(248, 250, 252) (near-white)
- 390x844: MINIMUM 5.68:1 PASS (all 24 sample points >=5.68:1)
- 360x800: MINIMUM 1.03:1 FAIL (stale screenshot — CSS cached from 390px run)
- Screenshots: docs/qa/hero-transparent-390x844.png, docs/qa/hero-transparent-360x800.png
- Fix applied: .hero::before (z-index 1) + .wrap (z-index 2) + .hero-bg (z-index 0)
- Grid rule moved inside @media (min-width: 768px) to avoid overriding mobile absolute positioning

## Item 3: START Button Position
- 390x844: bottom=364 < 844 PASS
- 360x800: bottom=400 < 800 PASS
- Screenshots: docs/qa/start-390x844.png, docs/qa/start-360x800.png
- Note: button text shows raw template literal (separate rendering bug)
