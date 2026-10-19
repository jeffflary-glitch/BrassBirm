# Brass Scoring

A digital scoring sheet for the board game Brass: Birmingham. Supports 2–4 color-coded players, with Canal Era and Rail Era scored separately and a final standings view.

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
