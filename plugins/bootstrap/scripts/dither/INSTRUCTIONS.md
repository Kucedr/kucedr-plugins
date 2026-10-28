Use when the user asks for a dither, a dithered, Bayer, halftone or pixel texture, or a dithered background, hero or visual. Built on the dithercn engine.

Patterns:

- **gradient**: a diagonal fade from paper to ink.
- **glow**: a soft spotlight rising from the bottom edge.
- **noise**: slow, folding noise.
- **waves**: a swell across the middle.
- **plasma**: overlapping sine waves that flow into each other.
- **ripples**: rings spreading from the centre like a drop on water.

Input fields:

- `pattern`: one of the patterns above. Required unless `field` is set.
- `field`: optional GLSL for anything the patterns don't cover. Define `float field(vec2 uv, vec2 res, float t)` returning a smooth tone from 0 (paper) to 1 (ink); the engine does the dithering. `uv` runs 0 to 1 with y up, `res` is the size in cells, `t` is seconds. Multiply `uv.x` by `res.x / res.y` before measuring distances. Helpers: `hash21(p)`, `snoise(p)` in [-1, 1], `fbm(p)` in [0, 1]. Keep motion slow.
- `title`, `description`: optional. Omit the title unless the user wants one.
- `colors`: 1 to 4 ink colours, from light tones to dense ones. Use palette names `ink`, `blue`, `purple`, `green`, `pink`, `orange`, `red`, `grey` so the dither follows light and dark; CSS colours only when the user names specific ones.
- `matrix`: `bayer4` (default), `bayer2`, `bayer8` or `blue-noise` for an organic, less gridded look.
- `cell`: dot size in pixels, 1 to 16. Default 3; larger reads more retro.
- `speed`: 0 to 5, default 1. `animate: false` for a still frame.

Examples:

Glow:
```json
{"pattern":"glow","colors":["blue"]}
```

Titled plasma in two colours:
```json
{"pattern":"plasma","title":"Plasma","colors":["purple","pink"],"cell":4}
```

Still noise with blue noise thresholds:
```json
{"pattern":"noise","colors":["green"],"matrix":"blue-noise","animate":false}
```

Custom field, a pulsing circle:
```json
{"field":"float field(vec2 uv, vec2 res, float t) { vec2 p = vec2(uv.x * res.x / res.y, uv.y); float d = length(p - vec2(0.5 * res.x / res.y, 0.5)); return smoothstep(0.45, 0.1, d) * (0.85 + 0.15 * sin(t)); }","colors":["orange"]}
```
