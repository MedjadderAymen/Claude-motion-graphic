# Claude-motion-graphic

Remotion project with a 10-second animated lower third (1920×1080, 30 fps).

## Usage

```bash
npm install
npm run dev           # open Remotion Studio to preview and tweak props
npm run render        # → out/lower-third.mp4
npm run render:alpha  # → out/lower-third.mov (ProRes 4444, transparent background)
npm run still         # → out/lower-third.png (frame 150)
```

## Props

Edit the defaults in `src/Root.tsx`, change them live in Studio, or pass `--props` at render time:

| Prop          | Default                            |
| ------------- | ---------------------------------- |
| `name`        | `Alex Rivera`                      |
| `title`       | `Motion Designer · Claude Studio`  |
| `accentColor` | `#FF6B35`                          |
| `transparent` | `false` (dark gradient backdrop)   |

## Timeline

| Time        | Action                                                      |
| ----------- | ----------------------------------------------------------- |
| 0.0–0.5 s   | Empty                                                       |
| 0.5–2.0 s   | Accent bar grows, name/title plates wipe in, text springs up |
| 2.0–8.5 s   | Hold: shimmer sweep across the name plate, pulsing dot      |
| 8.5–9.5 s   | Build-out in reverse order                                  |
| 9.5–10 s    | Empty                                                       |
