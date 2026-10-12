# Icon → Fourier

Turn any icon into the mathematical functions that draw it. Each outline of the icon becomes a
Fourier series, a chain of rotating circles (epicycles), and the app animates it, shows the
equations and exports them.

```
x_j(t) = Σ r_k cos(n_k t + φ_k)
y_j(t) = Σ r_k sin(n_k t + φ_k)        t ∈ [0, 2π]
```

## Features

- **Four ways to provide an icon**
  - **Library**: search about 2,000 [Lucide](https://lucide.dev) icons
  - **SVG**: upload a file or paste markup (paths, shapes and transforms are all supported)
  - **Image**: PNG/JPG/WebP; edges are traced with Otsu thresholding and marching squares
  - **Draw**: sketch freehand
- **Fourier epicycle animation** with a play/pause control and a scrubber. You can adjust circles per path, sample count, speed and target overlay, and draw paths in sequence or all at once.
- **Equation export**: rendered LaTeX, Desmos-ready expressions, Python (numpy/matplotlib), JavaScript and JSON coefficients. Each can be copied or downloaded.
- **Animation export**: GIF (in-browser via `gifenc`) or video (MP4/WebM via `MediaRecorder`)

## How it works

1. The input is converted to polylines (`src/lib/svg.ts`, `src/lib/raster.ts`).
2. Polylines are ordered, centred, scaled to ±10 and flipped so y points up (`src/lib/geometry.ts`).
   Open strokes are traced forward and back so every path is a closed loop.
3. Each loop is resampled evenly by arc length and transformed with a DFT, treating points as
   complex numbers `x + iy` (`src/lib/fourier.ts`). Terms are sorted by amplitude, and the
   largest *K* are kept.
4. The epicycles are rendered on a canvas (`src/lib/scene.ts`), and the equations are formatted by
   `src/lib/equations.ts`.

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests for the math
npm run build
```

Built with React, TypeScript and Vite. Everything runs client-side, with no backend.
