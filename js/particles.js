export let particles = [];

export function spawnBurst(cx, cy, color) {
	for(let i=0; i<16; i++) {
		const angle = Math.random()*Math.PI*2;
		const speed = 140 + Math.random()*260;
		particles.push({
			type: 'dot', x: cx, y: cy,
			vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
			gravity: 300, color,
			life: 450+Math.random()*300, maxLife: 750,
			size: 3.5+Math.random()*3.5,
			glow: true
		});
	}
	for(let i=0; i<10; i++) { // bright sparks mixed in
		const angle = Math.random()*Math.PI*2;
		const speed = 260 + Math.random()*320;
		particles.push({
			type: 'dot', x: cx, y: cy,
			vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
			gravity: 300, color: 'white',
			life: 250+Math.random()*200, maxLife: 450,
			size: 1.8+Math.random()*1.8,
			glow: true
		});
	}
}

export function spawnRing(cx, cy, color, maxRadius) {
	particles.push({ type: 'ring', x: cx, y: cy, color, life: 450, maxLife: 450, maxRadius: maxRadius*1.5 });
}

export function updateAndDrawParticles(ctx, elapsed) {
	const dtMs = elapsed || 16.666;
	const dt = dtMs/1000;
	for(let i=particles.length-1; i>=0; i--) {
		const p = particles[i];
		p.life -= dtMs;
		if(p.life <= 0) { particles.splice(i,1); continue; }
		const t = p.life/p.maxLife;
		const fade = Math.sqrt(Math.max(t,0)); // stays bright longer, then fades fast at the end
		if(p.type === 'dot') {
			p.vy += p.gravity*dt;
			p.x += p.vx*dt;
			p.y += p.vy*dt;
			ctx.save();
			ctx.globalAlpha = fade;
			ctx.fillStyle = p.color;
			if(p.glow) {
				ctx.shadowColor = p.color;
				ctx.shadowBlur = 10;
			}
			ctx.beginPath();
			ctx.arc(p.x, p.y, Math.max(p.size*fade,0.5), 0, Math.PI*2);
			ctx.fill();
			ctx.restore();
		} else if(p.type === 'ring') {
			const grow = 1-t;
			ctx.save();
			ctx.globalAlpha = fade;
			ctx.strokeStyle = p.color;
			ctx.lineWidth = 7*t+2;
			ctx.shadowColor = p.color;
			ctx.shadowBlur = 16;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.maxRadius*grow, 0, Math.PI*2);
			ctx.stroke();
			ctx.restore();
		}
	}
	ctx.globalAlpha = 1;
}
