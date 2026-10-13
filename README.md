# Two Step — Logomark demo

A single-page, no-build demo of the Two Step logomark and its variations:

- **Full mark**: the single piece rotated 180° and stacked (a 2 in outline, an S in negative space).
- **Hourglass**: the pieces crushed together (offset 36.15 units).
- **Minimal mark**: the pieces fully overlapped.

Every variation is drawn from the one path in `assets/two-step-single.svg`, so the geometry is exact at any size.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Files

- `index.html`: page markup, with the source path inlined once as `#ts-piece`
- `styles.css`: layout and palettes (`--ink`, `--paper`, `--accent`)
- `main.js`: mark builder, morph scrubber, play sequence, palette/invert/two-tone toggles
- `assets/`: source SVG, reference PNGs, favicon

## Publish to GitHub Pages

```sh
gh repo create two-step-brand --public --source . --push
gh api -X POST repos/{owner}/two-step-brand/pages -f "source[branch]=main" -f "source[path]=/"
```

Or enable Pages in the repo under Settings → Pages → Deploy from branch → `main` / root.
The site will be at `https://<user>.github.io/two-step-brand/`.
