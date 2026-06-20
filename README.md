# Halves

Fast mental-math drills — the kind of facts it's worth having memorised.
One round of 21-ish quick-fire questions; type the answer on the on-screen
pad. Correct answers advance on their own; press **enter** to lock in a
wrong guess and move on. Each mode keeps its own Hall of Fame.

### Modes

| Mode      | Prompt    | You answer        |
|-----------|-----------|-------------------|
| Halves    | `30`      | `15`              |
| Doubles   | `35`      | `70`              |
| Times     | `7 × 8`   | `56`              |
| Squares   | `12²`     | `144`             |
| Fractions | `3/8`     | `0.375`           |

## Project layout

No build step — plain static files:

- `index.html` — markup / screens
- `styles.css` — all styling
- `modes.js` — the math content; each mode is a small config object
- `main.js` — the game engine (mode-agnostic)

### Adding or editing a mode

Edit [`modes.js`](modes.js). Each mode supplies a `build()` that returns a
shuffled round of `{ p, a }` items (`p` = prompt string, `a` = exact numeric
answer). Add an object to the `MODES` array and the picker, brand mark and
per-mode leaderboard wire up automatically. Keep Fractions-style answers to
terminating decimals so they match exactly as the player types.

## Local preview

Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Hosting on GitHub Pages

A workflow at `.github/workflows/pages.yml` deploys the repo root on every
push to `main`. To enable it once:

1. Push these files to `main`.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.

The site then publishes at `https://<owner>.github.io/<repo>/`. You can also
trigger a deploy manually from the **Actions** tab ("Run workflow").
