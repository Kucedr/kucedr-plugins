// Built-in GLSL fields: each returns a tone in [0, 1], 0 paper and 1 ink.
const aspect = `vec2 p = vec2(uv.x * res.x / res.y, uv.y);`;

export const FIELDS = {
	gradient: `float field(vec2 uv, vec2 res, float t) {
  return clamp(dot(uv - 0.5, vec2(0.6, 0.8)) + 0.5, 0.0, 1.0);
}`,
	glow: `float field(vec2 uv, vec2 res, float t) {
  ${aspect}
  float d = length(p - vec2(0.5 * res.x / res.y, 0.0));
  return exp(-d * 2.2) * (0.92 + 0.08 * sin(t * 0.8));
}`,
	noise: `float field(vec2 uv, vec2 res, float t) {
  ${aspect}
  return smoothstep(0.2, 0.85, fbm(p * 2.2 + vec2(t * 0.04, t * 0.025)));
}`,
	waves: `float field(vec2 uv, vec2 res, float t) {
  ${aspect}
  float y = uv.y - 0.5 - 0.1 * sin(p.x * 4.0 + t * 0.6) - 0.04 * sin(p.x * 9.0 - t * 0.9);
  return smoothstep(0.3, -0.25, y);
}`,
	plasma: `float field(vec2 uv, vec2 res, float t) {
  ${aspect}
  float v = sin(p.x * 6.0 + t * 0.5) + sin(p.y * 5.0 - t * 0.4)
    + sin((p.x + p.y) * 4.0 + t * 0.3) + sin(length(p - 0.5) * 9.0 - t * 0.6);
  return 0.5 + 0.125 * v;
}`,
	ripples: `float field(vec2 uv, vec2 res, float t) {
  ${aspect}
  vec2 drop = vec2(0.5 * res.x / res.y, 0.5);
  float d = length(p - drop) + (fbm(p * 2.2 + vec2(t * 0.03, 0.0)) - 0.5) * 0.08;
  return (0.5 + 0.5 * cos(d * 40.0 - t * 0.9)) * exp(-d * 2.6);
}`,
};

export const PATTERNS = Object.keys(FIELDS);
export const MATRICES = ['bayer2', 'bayer4', 'bayer8', 'blue-noise'];
