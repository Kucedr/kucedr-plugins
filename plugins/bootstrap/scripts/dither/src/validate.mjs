import { MATRICES, PATTERNS } from './fields.mjs';

const MAX_FIELD = 8000;

export function validate(input) {
	if (!input || typeof input !== 'object' || Array.isArray(input))
		throw new Error('input must be an object.');
	if (input.field === undefined && !PATTERNS.includes(input.pattern))
		throw new Error(`pattern must be one of: ${PATTERNS.join(', ')}, or pass a GLSL field.`);
	if (
		input.field !== undefined &&
		(typeof input.field !== 'string' ||
			input.field.length > MAX_FIELD ||
			!/float\s+field\s*\(/.test(input.field))
	)
		throw new Error(
			`field must be GLSL under ${MAX_FIELD} characters that defines float field(vec2 uv, vec2 res, float t).`
		);
	if (input.title !== undefined && typeof input.title !== 'string')
		throw new Error('title must be a string when provided.');
	if (input.description !== undefined && typeof input.description !== 'string')
		throw new Error('description must be a string.');
	if (
		input.colors !== undefined &&
		(!Array.isArray(input.colors) ||
			input.colors.length === 0 ||
			input.colors.length > 4 ||
			!input.colors.every((color) => typeof color === 'string' && color.trim()))
	)
		throw new Error('colors must contain between 1 and 4 non-empty colour strings.');
	if (input.matrix !== undefined && !MATRICES.includes(input.matrix))
		throw new Error(`matrix must be one of: ${MATRICES.join(', ')}.`);
	if (input.cell !== undefined && !(Number.isFinite(input.cell) && input.cell >= 1 && input.cell <= 16))
		throw new Error('cell must be a number from 1 to 16.');
	if (input.speed !== undefined && !(Number.isFinite(input.speed) && input.speed >= 0 && input.speed <= 5))
		throw new Error('speed must be a number from 0 to 5.');
	if (input.animate !== undefined && typeof input.animate !== 'boolean')
		throw new Error('animate must be a boolean.');
}
