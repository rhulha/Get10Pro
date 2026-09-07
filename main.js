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
let requestAnimationFrameID;
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
	ctx.font= th/2 + "pt Comic Sans MS";
}

function newTile(nr) {
	return {
		nr: nr || Math.ceil(Math.random()*4),
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
            ctx.fillStyle = bgcolors[t.nr];
            ctx.fillRect(x*tw+2, y*th-offset+2, tw-2, th-2);
            ctx.fillStyle = fgcolors[t.nr];
            ctx.fillText(""+t.nr,x*tw+tw/2,(y*th+th*0.75)-offset);
        }
    }
	if(gameOver) {
		ctx.font= h/10 + "pt Comic Sans MS";
        ctx.fillStyle="white";
		ctx.fillText("Game Over",w/2+2,h/2+2);
        ctx.fillStyle="blue";
		ctx.fillText("Game Over",w/2,h/2);
	}
	if(countAnimated==0)
		cancelAnimationFrame(requestAnimationFrameID);
}

function animate(time) {
	requestAnimationFrameID=requestAnimationFrame(animate);
	if( time-lastTime < 1300) // skip long frame times
		drawBoard(time-lastTime);
	lastTime=time;
}

function removeTileAndNeighbors(x, y, nr) {
    if(x<0 || x>xTiles-1 || y<0 || y>yTiles-1 || !board[x][y] || board[x][y].nr != nr)
        return 0;
    let count=1;
    board[x][y] = undefined;
    count += removeTileAndNeighbors(x+1,y,nr);
    count += removeTileAndNeighbors(x-1,y,nr);
    count += removeTileAndNeighbors(x,y+1,nr);
    count += removeTileAndNeighbors(x,y-1,nr);
    return count;
}

function click(x,y) {
  const nr = board[x][y].nr;
  if( removeTileAndNeighbors(x, y, nr) === 1) {
    board[x][y] = newTile(nr); // if we only clicked on one tile, we restore it, This approach keeps removeTileAndNeighbors simpler.
		return;
	}
	board[x][y] = newTile(nr+1);
	popSound.currentTime = 0;
	popSound.play();
	compactBoard();
	animate();
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
	return board[x] && board[x][y] && board[x][y].nr;
}

function checkEnd() {
    for(let x=0; x<xTiles; x++) {
        for(let y=0; y<yTiles; y++) {
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
