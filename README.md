# Turkish Is Easy

A friendly, dependency-free Turkish learning app for kids and adults — learn by
**building meanings from word blocks** (root + suffix), with real, owner-verified
pronunciation audio. Bilingual guidance: **English** and **Bahasa Indonesia**.

**Live app:** https://gibiamie.github.io/turkish-is-easy/
**QA mode:** https://gibiamie.github.io/turkish-is-easy/?qa=1

This project is the corrected and extended successor of
[turkish-tutor-kids-clean](https://github.com/gibiamie/turkish-tutor-kids-clean) (RC9).

## Features
- Profile-based learner flow: Bella (EN kids), Ayza (ID kids), Adult, Guest (temporary)
- Guided learning path: Sounds → First words → Meaning builders → Practice & review
- Builder lessons with shuffled blocks — no answer reveal before solving
- **Spaced repetition**: wrong answers and "needs more practice" items return in Mixed Review on a 1/3/7/14-day ladder
- **Rewards**: topic-complete celebration with stars, topic badges, streak milestones (3/7/14/30 days), daily goal
- Optional **"Say it"** speaking practice (browser speech recognition, tr-TR) and clearly-labeled robot-voice fallback only where no human recording exists
- Real day-streak per profile; progress stored locally (backend-ready store)
- Installable PWA with offline support (service worker)
- Accessible: keyboard operable, aria-live feedback, `lang="tr"` on Turkish content
- Session restore: reload returns you to where you were; browser Back works (hash routing)

## Development
No build step. Serve statically and open in a browser:

```
python -m http.server 8765
# http://127.0.0.1:8765/
```

Checks (Node ≥ 22):

```
node --check js/*.js
node tests/data-integrity.mjs
```

CI runs both on every push (`.github/workflows/ci.yml`).

## Deployment
Push to `main` → GitHub Pages redeploys in ~1–3 min. The service worker caches
aggressively: bump the `CACHE` name in `sw.js` when shipping significant changes.

## Governance
Pedagogy red-lines (pronunciation accuracy, no fake audio, softening rules, ğ handling)
are binding — see `project-constitution.md` and the `qa/` folder before any release.
