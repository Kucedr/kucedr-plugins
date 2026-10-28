import { createRoot } from 'react-dom/client';
import { DitherShader } from '@/lib/dither/shader';
import { FIELDS } from './fields.mjs';

const input = JSON.parse(document.getElementById('dither-input').textContent);
createRoot(document.getElementById('dither')).render(
	<DitherShader
		className="dither"
		field={input.field ?? FIELDS[input.pattern]}
		palette={['--dither-paper', ...(input.colors ?? ['ink'])]}
		matrix={input.matrix}
		cell={input.cell}
		speed={input.speed}
		animate={input.animate}
	/>
);
