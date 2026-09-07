// GET 10 PRO copyright 2015 Raymond Hulha
import { $, ga } from './dom.js';
import { bgcolors, fgcolors } from './colors.js';
import { particles, spawnBurst, spawnRing, updateAndDrawParticles } from './particles.js';
import { drawTile, drawNumber, drawBombTile } from './render.js';

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
let requestAnimationFrameID;
let animating=false;
let gameOver=false;
let lastTime=0;

const DROP_DURATION = 150; // ms, how long a drop animation takes regardless of distance
function easeInOutQuad(t) {
	return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
}

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
				drawBombTile(ctx, px, py, pw, ph);
			} else {
				drawTile(ctx, px, py, pw, ph, t);
				drawNumber(ctx, t.nr, x*tw+tw/2, y*th+th*0.72-offset, th);
			}
        }
    }
	updateAndDrawParticles(ctx, elapsed);
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
    spawnRing(x*tw+tw/2, y*th+th/2, 'orange', Math.max(tw,th)*0.7);
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
	spawnRing(x*tw+tw/2, y*th+th/2, fgcolors[nr], Math.max(tw,th)*0.7);
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
