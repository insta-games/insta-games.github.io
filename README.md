# Insta-Games

Static browser game collection with single-player and local two-player games.

## What this repo contains
- `index.html` for the game hub
- Individual game pages and scripts for single-player and local multiplayer modes
- Shared styling in `styles.css`
- Shared behavior in `script.js`

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Notes
- This site does not use Firebase.
- Online multiplayer and room-based backend logic have been removed.
- Local multiplayer games remain available where the UI says so.
