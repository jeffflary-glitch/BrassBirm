# Brass Scoring

A digital scoring sheet for the board game Brass: Birmingham.

- Enter each player's name and pick their color at the start (2–4 players), with recent names one tap away
- Canal Era and Rail Era scored separately, then a Final Score tab with live standings
- Tap a score to type it, or use −, + and +5 buttons
- Each merchant beer bonus can only be claimed by one player per era
- Scores are kept on your phone, so a reload or locked screen doesn't lose the game
- Finish & save games to History, with a win tally for each player

## Use it

Open the live page on your phone (once GitHub Pages is turned on):

https://jeffflary-glitch.github.io/BrassBirm/

To put it on your home screen: in Safari tap **Share → Add to Home Screen**; in Chrome on Android tap **⋮ → Add to Home screen**.

## What's in here

| Path | What it is |
| --- | --- |
| `src/BrassBirminghamScorer.jsx` | The scoring sheet itself (all the game logic and layout) |
| `src/main.jsx` | Starts the app on the page |
| `index.html` | The page shell |
| `public/` | Home-screen icon and app manifest |
| `docs/` | The built, ready-to-serve site that GitHub Pages publishes |

## Making changes

Edit `src/BrassBirminghamScorer.jsx`, then rebuild so `docs/` picks up the change:

```
npm install
npm run build
```

Commit both the source change and the updated `docs/` folder.
