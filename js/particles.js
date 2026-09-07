export let particles = [];

export function spawnBurst(cx, cy, color) {
	for(let i=0; i<8; i++) {
		const angle = Math.random()*Math.PI*2;
		const speed = 90 + Math.random()*160;
		particles.push({
			type: 'dot', x: cx, y: cy,
			vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
			gravity: 260, color,
			life: 400+Math.random()*250, maxLife: 650,
			size: 2+Math.random()*2.5
		});
	}
	for(let i=0; i<4; i++) { // bright sparks mixed in
		const angle = Math.random()*Math.PI*2;
		const speed = 180 + Math.random()*220;
		particles.push({
			type: 'dot', x: cx, y: cy,
			vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
			gravity: 260, color: 'white',
			life: 200+Math.random()*150, maxLife: 350,
			size: 1.2+Math.random()*1.3
		});
	}
}

export function spawnRing(cx, cy, color, maxRadius) {
	particles.push({ type: 'ring', x: cx, y: cy, color, life: 350, maxLife: 350, maxRadius });
}

export function updateAndDrawParticles(ctx, elapsed) {
	const dtMs = elapsed || 16.666;
	const dt = dtMs/1000;
	for(let i=particles.length-1; i>=0; i--) {
		const p = particles[i];
		p.life -= dtMs;
		if(p.life <= 0) { particles.splice(i,1); continue; }
		const t = p.life/p.maxLife;
		if(p.type === 'dot') {
			p.vy += p.gravity*dt;
			p.x += p.vx*dt;
			p.y += p.vy*dt;
			ctx.globalAlpha = Math.max(t,0);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, Math.max(p.size*t,0.3), 0, Math.PI*2);
			ctx.fill();
		} else if(p.type === 'ring') {
			const grow = 1-t;
			ctx.globalAlpha = Math.max(t,0);
			ctx.strokeStyle = p.color;
			ctx.lineWidth = 3*t+1;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.maxRadius*grow, 0, Math.PI*2);
			ctx.stroke();
		}
	}
	ctx.globalAlpha = 1;
}
