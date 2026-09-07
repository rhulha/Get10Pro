import { tileShades, numberShades, fgcolors } from './colors.js';

export function roundRectPath(ctx, x, y, rw, rh, r) {
	ctx.beginPath();
	ctx.moveTo(x+r, y);
	ctx.arcTo(x+rw, y,    x+rw, y+rh, r);
	ctx.arcTo(x+rw, y+rh, x,    y+rh, r);
	ctx.arcTo(x,    y+rh, x,    y,    r);
	ctx.arcTo(x,    y,    x+rw, y,    r);
	ctx.closePath();
}

export function drawTile(ctx, px, py, pw, ph, t) {
	const r = Math.min(pw, ph) * 0.2;
	const shades = tileShades[t.nr];

	// drop shadow, gives the candy piece some lift off the board
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.45)';
	ctx.shadowBlur = 6;
	ctx.shadowOffsetY = 4;
	roundRectPath(ctx, px, py, pw, ph, r);
	const grad = ctx.createLinearGradient(px, py, px, py+ph);
	grad.addColorStop(0, shades.light);
	grad.addColorStop(0.55, shades.base);
	grad.addColorStop(1, shades.dark);
	ctx.fillStyle = grad;
	ctx.fill();
	ctx.restore();

	// glossy highlight across the top half, like a candy shell
	ctx.save();
	roundRectPath(ctx, px, py, pw, ph, r);
	ctx.clip();
	const gloss = ctx.createLinearGradient(px, py, px, py+ph*0.55);
	gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
	gloss.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = gloss;
	ctx.fillRect(px, py, pw, ph*0.55);
	ctx.restore();

	// crisp inner bevel edge
	roundRectPath(ctx, px+1, py+1, pw-2, ph-2, r);
	ctx.strokeStyle = 'rgba(255,255,255,0.45)';
	ctx.lineWidth = 1;
	ctx.stroke();
}

export function drawNumber(ctx, nr, cx, cy, th) {
	const text = ''+nr;
	ctx.save();
	// dark recessed shadow beneath the glyph
	ctx.fillStyle = 'rgba(0,0,0,0.35)';
	ctx.fillText(text, cx+2, cy+3);
	// glossy vertical gradient fill for the raised 3D look
	const grad = ctx.createLinearGradient(cx, cy-th*0.35, cx, cy+th*0.1);
	grad.addColorStop(0, numberShades[nr]);
	grad.addColorStop(1, fgcolors[nr]);
	ctx.fillStyle = grad;
	ctx.fillText(text, cx, cy);
	// thin bright rim on top for an embossed edge
	ctx.strokeStyle = 'rgba(255,255,255,0.55)';
	ctx.lineWidth = 1;
	ctx.strokeText(text, cx, cy-0.6);
	ctx.restore();
}

export function drawBombTile(ctx, px, py, pw, ph) {
	const r = Math.min(pw, ph) * 0.2;

	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.45)';
	ctx.shadowBlur = 6;
	ctx.shadowOffsetY = 4;
	roundRectPath(ctx, px, py, pw, ph, r);
	const grad = ctx.createLinearGradient(px, py, px, py+ph);
	grad.addColorStop(0, '#555');
	grad.addColorStop(0.55, '#2b2b2b');
	grad.addColorStop(1, '#111');
	ctx.fillStyle = grad;
	ctx.fill();
	ctx.restore();

	ctx.save();
	roundRectPath(ctx, px, py, pw, ph, r);
	ctx.clip();
	const gloss = ctx.createLinearGradient(px, py, px, py+ph*0.55);
	gloss.addColorStop(0, 'rgba(255,255,255,0.25)');
	gloss.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = gloss;
	ctx.fillRect(px, py, pw, ph*0.55);
	ctx.restore();

	roundRectPath(ctx, px+1, py+1, pw-2, ph-2, r);
	ctx.strokeStyle = 'rgba(255,255,255,0.3)';
	ctx.lineWidth = 1;
	ctx.stroke();

	// bomb ball
	const cx = px+pw/2;
	const cy = py+ph/2 + ph*0.08;
	const radius = Math.min(pw,ph)*0.28;
	const ballGrad = ctx.createRadialGradient(cx-radius*0.35, cy-radius*0.35, radius*0.15, cx, cy, radius);
	ballGrad.addColorStop(0, '#777');
	ballGrad.addColorStop(0.5, '#222');
	ballGrad.addColorStop(1, '#000');
	ctx.beginPath();
	ctx.fillStyle = ballGrad;
	ctx.arc(cx, cy, radius, 0, Math.PI*2);
	ctx.fill();
	ctx.beginPath();
	ctx.fillStyle = 'rgba(255,255,255,0.6)';
	ctx.arc(cx-radius*0.35, cy-radius*0.35, radius*0.22, 0, Math.PI*2);
	ctx.fill();

	// fuse and its flickering spark
	const fuseX = cx + radius*0.55;
	const fuseY = cy - radius*0.75;
	const tipX = fuseX + radius*0.1;
	const tipY = fuseY - radius*1.1;
	ctx.strokeStyle = '#8a5a2b';
	ctx.lineWidth = Math.max(2, radius*0.18);
	ctx.beginPath();
	ctx.moveTo(fuseX, fuseY);
	ctx.quadraticCurveTo(fuseX+radius*0.4, fuseY-radius*0.6, tipX, tipY);
	ctx.stroke();

	const flicker = 0.6+0.4*Math.sin(performance.now()/80);
	ctx.beginPath();
	ctx.fillStyle = `rgba(255,${Math.floor(180+60*flicker)},0,0.85)`;
	ctx.arc(tipX, tipY, radius*0.22*flicker, 0, Math.PI*2);
	ctx.fill();
}
