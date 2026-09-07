// GET 10 PRO copyright 2015 Raymond Hulha
const $ = (id) => document.getElementById(id);
const ga = (el, n, cb) => $(el).addEventListener(n, cb);

const bgcolors = ['', 'LawnGreen', 'DodgerBlue', 'orange', 'Tomato', 'DarkGreen',
                'DarkViolet', 'lightblue', 'red', 'blue', 'green', 'white'];
const fgcolors = ['', 'DarkGreen', 'DarkBlue', 'red', '#ff9e9e', 'LawnGreen',
                'Plum', 'Plum', 'Plum', 'Plum', 'Plum', 'Plum'];

const canvas = $('c');
const ctx = canvas.getContext('2d');
const popSound = new Audio('sounds/pop.wav');
popSound.volume = 0.3;

let xTiles;
let yTiles;
let w;
let h;
let tw; // tile width
let th; // tile height
let board = [];
let particles = [];
let requestAnimationFrameID;
let animating=false;
let gameOver=false;
let lastTime=0;

const DROP_DURATION = 150; // ms, how long a drop animation takes regardless of distance
function easeInOutQuad(t) {
	return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
}

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
const tileShades = bgcolors.map((c) => c ? { light: shade(c, 65), base: c, dark: shade(c, -55) } : null);
const numberShades = fgcolors.map((c) => c ? shade(c, 90) : null);

function setSize() {
	w = canvas.width = canvas.clientWidth;
	h = canvas.height = canvas.clientHeight;
	tw = Math.floor(w/xTiles); // tile width
	th = Math.floor(h/yTiles); // tile height
	ctx.font= "bold " + th/2.2 + "pt Comic Sans MS";
}

const BOMB_CHANCE = 0.03; // chance a freshly spawned tile is a bomb instead of a number
const MAX_BOMBS_ON_BOARD = 2; // keep bombs rare on screen at once

function countBombs() {
	let n = 0;
	for(let x=0; x<xTiles; x++) {
		if(!board[x]) continue;
		for(let y=0; y<yTiles; y++) {
			if(board[x][y] && board[x][y].bomb) n++;
		}
	}
	return n;
}

function newTile(nr) {
	const bomb = !nr && countBombs() < MAX_BOMBS_ON_BOARD && Math.random() < BOMB_CHANCE;
	return {
		nr: nr || Math.ceil(Math.random()*4),
		bomb, // bombs explode on click and clear their surrounding 3x3 area
		offset: 0, // offset in the y axis for down dropping tiles.
		distance: 0, // total distance to drop
		elapsed: 0 // time spent dropping so far
	};
}

function roundRectPath(x, y, rw, rh, r) {
	ctx.beginPath();
	ctx.moveTo(x+r, y);
	ctx.arcTo(x+rw, y,    x+rw, y+rh, r);
	ctx.arcTo(x+rw, y+rh, x,    y+rh, r);
	ctx.arcTo(x,    y+rh, x,    y,    r);
	ctx.arcTo(x,    y,    x+rw, y,    r);
	ctx.closePath();
}

function drawTile(px, py, pw, ph, t) {
	const r = Math.min(pw, ph) * 0.2;
	const shades = tileShades[t.nr];

	// drop shadow, gives the candy piece some lift off the board
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.45)';
	ctx.shadowBlur = 6;
	ctx.shadowOffsetY = 4;
	roundRectPath(px, py, pw, ph, r);
	const grad = ctx.createLinearGradient(px, py, px, py+ph);
	grad.addColorStop(0, shades.light);
	grad.addColorStop(0.55, shades.base);
	grad.addColorStop(1, shades.dark);
	ctx.fillStyle = grad;
	ctx.fill();
	ctx.restore();

	// glossy highlight across the top half, like a candy shell
	ctx.save();
	roundRectPath(px, py, pw, ph, r);
	ctx.clip();
	const gloss = ctx.createLinearGradient(px, py, px, py+ph*0.55);
	gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
	gloss.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = gloss;
	ctx.fillRect(px, py, pw, ph*0.55);
	ctx.restore();

	// crisp inner bevel edge
	roundRectPath(px+1, py+1, pw-2, ph-2, r);
	ctx.strokeStyle = 'rgba(255,255,255,0.45)';
	ctx.lineWidth = 1;
	ctx.stroke();
}

function drawNumber(nr, cx, cy) {
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

function drawBombTile(px, py, pw, ph) {
	const r = Math.min(pw, ph) * 0.2;

	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.45)';
	ctx.shadowBlur = 6;
	ctx.shadowOffsetY = 4;
	roundRectPath(px, py, pw, ph, r);
	const grad = ctx.createLinearGradient(px, py, px, py+ph);
	grad.addColorStop(0, '#555');
	grad.addColorStop(0.55, '#2b2b2b');
	grad.addColorStop(1, '#111');
	ctx.fillStyle = grad;
	ctx.fill();
	ctx.restore();

	ctx.save();
	roundRectPath(px, py, pw, ph, r);
	ctx.clip();
	const gloss = ctx.createLinearGradient(px, py, px, py+ph*0.55);
	gloss.addColorStop(0, 'rgba(255,255,255,0.25)');
	gloss.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = gloss;
	ctx.fillRect(px, py, pw, ph*0.55);
	ctx.restore();

	roundRectPath(px+1, py+1, pw-2, ph-2, r);
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

function spawnBurst(cx, cy, color) {
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

function spawnRing(cx, cy, color) {
	particles.push({ type: 'ring', x: cx, y: cy, color, life: 350, maxLife: 350, maxRadius: Math.max(tw,th)*0.7 });
}

function updateAndDrawParticles(elapsed) {
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

function drawBoard(elapsed) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
	let countAnimated=0;
    for(let x=0; x<xTiles; x++) {
        for(let y=0; y<yTiles; y++) {
            const t = board[x][y];
			let offset = 0;
			if( t.offset > 0) {
				t.elapsed += elapsed || 0;
				const progress = Math.min(t.elapsed/DROP_DURATION, 1);
				offset = t.distance * (1-easeInOutQuad(progress));
				t.offset = offset;
				if( progress < 1)
					countAnimated++;
			}
			const px = x*tw+3;
			const py = y*th-offset+3;
			const pw = tw-6;
			const ph = th-6;
			if(t.bomb) {
				drawBombTile(px, py, pw, ph);
			} else {
				drawTile(px, py, pw, ph, t);
				drawNumber(t.nr, x*tw+tw/2, y*th+th*0.72-offset);
			}
        }
    }
	updateAndDrawParticles(elapsed);
	if(gameOver) {
		ctx.font= h/10 + "pt Comic Sans MS";
        ctx.fillStyle="white";
		ctx.fillText("Game Over",w/2+2,h/2+2);
        ctx.fillStyle="blue";
		ctx.fillText("Game Over",w/2,h/2);
	}
	if(countAnimated==0 && particles.length==0) {
		cancelAnimationFrame(requestAnimationFrameID);
		animating = false;
	}
}

function animate(time) {
	requestAnimationFrameID=requestAnimationFrame(animate);
	if( time-lastTime < 1300) // skip long frame times
		drawBoard(time-lastTime);
	lastTime=time;
}

function removeTileAndNeighbors(x, y, nr, removed) {
    if(x<0 || x>xTiles-1 || y<0 || y>yTiles-1 || !board[x][y] || board[x][y].bomb || board[x][y].nr != nr)
        return;
    removed.push({x, y, nr: board[x][y].nr});
    board[x][y] = undefined;
    removeTileAndNeighbors(x+1,y,nr,removed);
    removeTileAndNeighbors(x-1,y,nr,removed);
    removeTileAndNeighbors(x,y+1,nr,removed);
    removeTileAndNeighbors(x,y-1,nr,removed);
}

function explodeBomb(x, y) {
	const removed = [];
	for(let dx=-1; dx<=1; dx++) {
		for(let dy=-1; dy<=1; dy++) {
			if(dx===0 && dy===0) continue; // the bomb's own cell is handled separately below
			const nx=x+dx, ny=y+dy;
			if(nx<0 || nx>=xTiles || ny<0 || ny>=yTiles || !board[nx][ny]) continue;
			removed.push({x:nx, y:ny, nr: board[nx][ny].nr});
			board[nx][ny] = undefined;
		}
	}
	board[x][y] = undefined;
	return removed;
}

function click(x,y) {
  if(board[x][y].bomb) {
    const removed = explodeBomb(x,y);
    popSound.currentTime = 0;
    popSound.play();
    for(const r of removed)
      spawnBurst(r.x*tw+tw/2, r.y*th+th/2, bgcolors[r.nr]);
    spawnBurst(x*tw+tw/2, y*th+th/2, 'orange');
    spawnRing(x*tw+tw/2, y*th+th/2, 'orange');
    compactBoard();
    if(!animating) {
      animating = true;
      animate();
    }
    gameOver=checkEnd();
    return;
  }
  const nr = board[x][y].nr;
  const removed = [];
  removeTileAndNeighbors(x, y, nr, removed);
  if( removed.length === 1) {
    board[x][y] = newTile(nr); // if we only clicked on one tile, we restore it, This approach keeps removeTileAndNeighbors simpler.
		return;
	}
	board[x][y] = newTile(nr+1);
	popSound.currentTime = 0;
	popSound.play();
	for(const r of removed)
		spawnBurst(r.x*tw+tw/2, r.y*th+th/2, bgcolors[r.nr]);
	spawnRing(x*tw+tw/2, y*th+th/2, fgcolors[nr]);
	compactBoard();
	if(!animating) {
		animating = true;
		animate();
	}
	gameOver=checkEnd();
}

ga('c', 'mousedown', function(event) {
	const ex = event.offsetX || event.layerX;
	const ey = event.offsetY || event.layerY;
  const x = (ex-(ex%tw))/tw;
  const y = (ey-(ey%th))/th;
  click(x,y);
});

ga('c', 'touchstart', function(evt) {
  evt.preventDefault();
  const touches = evt.changedTouches;
	const ex = touches[0].pageX;
	const ey = touches[0].pageY;
  const x = (ex-(ex%tw))/tw;
  const y = (ey-(ey%th))/th;
  click(x,y);
});

function countMissingBelow(x,ystart) {
	return board[x].reduce(function(p,c,i){return (i>ystart)&&!c?p+1:p;},0);
}

function moveDown(tile, distanceInTiles) { // schedule tiles to move down over time
	tile.offset = distanceInTiles*th;
	tile.distance = distanceInTiles*th;
	tile.elapsed = 0;
	return tile;
}

function compactBoard() {
	for(let x=0; x<xTiles; x++) {
		for(let y=yTiles-1; y>=0; y--) {
			if(board[x][y]) {
				const m = countMissingBelow(x,y);
				if( m > 0 ) {
					board[x][y+m] = moveDown( board[x][y], m);
					board[x][y] = undefined;
				}
			}
		}
		for(let i=0, m = countMissingBelow(x,-1); i<m; i++) {
			board[x][-1+m-i] = moveDown( newTile(), m); // spawn new blocks for all that got removed
		}
	}
}

function getNr(x,y) {
	const t = board[x] && board[x][y];
	return t && !t.bomb ? t.nr : undefined;
}

function checkEnd() {
    for(let x=0; x<xTiles; x++) {
        for(let y=0; y<yTiles; y++) {
            if(board[x][y].bomb) continue; // a bomb is always clickable, it doesn't need a matching neighbor
            const nr = board[x][y].nr;
			if( nr == getNr(x+1,y)
			||  nr == getNr(x-1,y)
			||  nr == getNr(x,y+1)
			||  nr == getNr(x,y-1))
				return false;
		}
	}
	return true;
}

function startGame(cols, rows) {
	xTiles = cols;
	yTiles = rows;
	setSize();
	ctx.textAlign = 'center';
	board = [];
	for(let x=0; x<xTiles; x++) {
	    board[x] = [];
	    for(let y=0; y<yTiles; y++) {
	        board[x][y] = newTile();
	    }
	}
	drawBoard();
}

function recommendedGrid() { // pick a column count so tiles come out roughly square
	const rows = 7;
	const cols = Math.max(3, Math.round(rows * (canvas.clientWidth / canvas.clientHeight)));
	return { cols, rows };
}

const sizeMatch = location.search.match(/(\d+)\D+(\d+)/);
if(sizeMatch) {
	startGame(parseInt(sizeMatch[1], 10), parseInt(sizeMatch[2], 10));
} else {
	const rec = recommendedGrid();
	$('cols').value = rec.cols;
	$('rows').value = rec.rows;
	$('menu').hidden = false;
	ga('startBtn', 'click', function() {
		const cols = parseInt($('cols').value, 10) || rec.cols;
		const rows = parseInt($('rows').value, 10) || rec.rows;
		$('menu').hidden = true;
		startGame(cols, rows);
	});
}
