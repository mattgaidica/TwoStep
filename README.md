# Two Step — Logomark demo

A single-page, no-build demo of the Two Step logomark, its variations, and the ideas hidden in it.

**Live site:** <https://mattgaidica.github.io/TwoStep/>

Every shape on the page is drawn from the one path in `assets/two-step-single.svg`, so the geometry is exact at any size.

## Variations

- **Full mark**: the single piece rotated 180° and stacked. The outline reads as a 2; the negative space reads as an S.
- **Hourglass**: the pieces crushed together (offset 36.15 units, the path's own straight segment). Timely, time-bound work.
- **Minimal mark**: the pieces fully overlapped. Used for section markers, avatars, and background texture.

The hero scrubber morphs between all three.

## What's on the page

- **Read the mark**: highlights readings in the full mark's negative space: the S, a bent finger, and the finger pressing a key (Two Step as the "easy button").
- **Color**: three palettes (Ledger, Evergreen, Ink & Coral), plus Invert and Two-tone toggles in the top bar.
- **In use**: app icons and favicon, avatars, lockups, section markers, an easy button, and a background texture.
- **Background texture**: toggles between *Subtle* (minimal marks) and *Woman-founded, women-run* (the minimal mark split along its 45° lip line, alternating with a kiss print, in a red → burgundy → plum gradient).
- **Founder's monogram**: animates the single mark into CG for Chantelle Gaidica. The C is the piece turned 90° clockwise; the G is that C flipped vertically.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Files

- `index.html`: page markup, with the source path inlined once as `#ts-piece` plus the finger, lip, and clip shapes derived from it
- `styles.css`: layout, palettes (`--ink`, `--paper`, `--accent`), and texture states
- `main.js`: mark builder, hero morph, reading highlights, texture toggle, CG animation, palette/invert/two-tone toggles
- `assets/`: source SVG, reference PNGs (full, single, hourglass, minimal, CG), favicon, and `kiss.png`

## Publishing

The site is served by GitHub Pages from the `main` branch root (Settings → Pages → Deploy from branch → `main` / `/`). Pushing to `main` updates <https://mattgaidica.github.io/TwoStep/>.

`.nojekyll` is included so the files are served as-is.

## Notes

- `assets/kiss.png` must be cleared for use before this goes public-facing. Any transparent PNG at that path picks up the lips gradient automatically.
