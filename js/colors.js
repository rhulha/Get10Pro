export const bgcolors = ['', 'LawnGreen', 'DodgerBlue', 'orange', 'Tomato', 'DarkGreen',
                'DarkViolet', 'lightblue', 'red', 'blue', 'green', 'white'];
export const fgcolors = ['', 'DarkGreen', 'DarkBlue', 'red', '#ff9e9e', 'LawnGreen',
                'Plum', 'Plum', 'Plum', 'Plum', 'Plum', 'Plum'];

// --- color helpers, used to build the glossy 3D tile/number shading ---
let shadeCanvas;
function colorToRgb(color) {
	shadeCanvas = shadeCanvas || document.createElement('canvas');
	shadeCanvas.width = shadeCanvas.height = 1;
	const sctx = shadeCanvas.getContext('2d', { willReadFrequently: true });
	sctx.fillStyle = color;
	sctx.fillRect(0, 0, 1, 1);
	const d = sctx.getImageData(0, 0, 1, 1).data;
	return { r: d[0], g: d[1], b: d[2] };
}
function shade(color, amt) {
	const { r, g, b } = colorToRgb(color);
	const c = (v) => Math.max(0, Math.min(255, v + amt));
	return `rgb(${c(r)},${c(g)},${c(b)})`;
}

export const tileShades = bgcolors.map((c) => c ? { light: shade(c, 65), base: c, dark: shade(c, -55) } : null);
export const numberShades = fgcolors.map((c) => c ? shade(c, 90) : null);
