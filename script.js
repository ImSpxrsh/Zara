
const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const bezier = (cp, t) => {
  const [p0, p1, p2] = cp;
  return p0.mul((1 - t) ** 2).add(p1.mul(2 * t * (1 - t))).add(p2.mul(t ** 2));
};

const inheart = (x, y, r) => {
  const [nx, ny] = [x / r, y / r];
  return (nx ** 2 + ny ** 2 - 1) ** 3 - nx ** 2 * ny ** 3 < 0;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const colorPalette = [
  '#590d22', // night-bordeaux
  '#800f2f', // dark-amaranth
  '#a4133c', // cherry-rose
  '#c9184a', // rosewood
  '#ff4d6d', // bubblegum-pink
  '#ff758f', // bubblegum-pink-2
  '#ff8fa3', // cotton-candy
  '#ffb3c1', // cherry-blossom
  '#ffccd5', // pastel-pink
  '#fff0f3'  // lavender-blush
];

class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  clone() { return new Point(this.x, this.y); }
  add(o) { return new Point(this.x + o.x, this.y + o.y); }
  sub(o) { return new Point(this.x - o.x, this.y - o.y); }
  div(n) { return new Point(this.x / n, this.y / n); }
  mul(n) { return new Point(this.x * n, this.y * n); }
}

class Star {
  constructor() {
    this.points = [];
    const outer = 20;
    const inner = 10;
    for (let i = 0; i < 10; i++) {
      const angle = (i * 36) * Math.PI / 180;
      const radius = i % 2 === 0 ? outer : inner;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      this.points.push(new Point(x, y));
    }
    this.length = this.points.length;
  }
  get(i, scale = 1) { return this.points[i].mul(scale); }
}

class Seed {
  constructor(tree, point, scale = 1, color = "#c9184a") {
    this.tree = tree;
    this.heart = { point, scale, color, figure: new Star() };
    this.circle = { point, scale, color, radius: 5 };
  }
  
  draw = () => { 
    this.drawHeart(); 
    this.drawText(); 
  };
  
  addPosition = (x, y) => { 
    this.circle.point = this.circle.point.add(new Point(x, y)); 
  };
  
  canMove = () => this.circle.point.y < this.tree.height + 20;
  canScale = () => this.heart.scale > 0.2;
  
  move = (x, y) => { 
    this.clear(); 
    this.drawCircle(); 
    this.addPosition(x, y); 
  };
  
  scale = (s) => { 
    this.clear(); 
    this.drawCircle(); 
    this.drawHeart(); 
    this.heart.scale *= s;
  };
  
  drawHeart = () => {
    const { ctx } = this.tree;
    const { point, color, scale } = this.heart;
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(point.x, point.y);
    ctx.beginPath();
    for (let i = 0; i < this.heart.figure.length; i++) {
      const p = this.heart.figure.get(i, scale);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  
  drawCircle = () => {
    const { ctx } = this.tree;
    const { point, color, scale, radius } = this.circle;
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(point.x, point.y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  
  drawText = () => {
    const { ctx } = this.tree;
    const { point, color, scale } = this.heart;
    const text = CONFIG.seedText;
    const lines = text.split('\n');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = "black";
    ctx.translate(point.x, point.y);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.scale(0.75, 0.75);
    ctx.font = '9px Happy Monkey';
    ctx.fillText(lines[0], 0, 40);
    ctx.fillText(lines[1], 0, 55);
    ctx.restore();
  };
  
  clear = () => {
    const { ctx } = this.tree;
    const { point, scale } = this.circle;
    const w = 26 * scale, h = 26 * scale;
    ctx.clearRect(point.x - w, point.y - h, 4 * w, 4 * h);
  };
  
  hover = (x, y) => {
    const pixel = this.tree.ctx.getImageData(x, y, 1, 1);
    return pixel.data[3] === 255;
  };
}


class Footer {
  constructor(tree, width, height, speed = 2) {
    this.tree = tree;
    this.point = new Point(tree.seed.heart.point.x, tree.height - height / 2);
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.length = 0;
  }
  
  draw() {
    const { ctx } = this.tree;
    const { point, height, length, width, speed } = this;
    ctx.save();
    ctx.strokeStyle = "rgb(164, 19, 60)"; 
    ctx.lineWidth = height;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.translate(point.x, point.y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length / 2, 0);
    ctx.lineTo(-length / 2, 0);
    ctx.stroke();
    ctx.restore();
    if (length < width) this.length += speed;
  }
}


class Tree {
  constructor(canvas, width, height, opt = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = width;
    this.height = height;
    this.opt = opt;
    this.record = {};
    this.initSeed();
    this.initFooter();
    this.initBranch();
    this.initBloom();
  }
  
  initSeed() {
    const { x = this.width / 4, y = this.height / 2, color = "#FFCC80", scale = 1 } = this.opt.seed || {};
    this.seed = new Seed(this, new Point(x, y), scale, color);
  }
  
  initFooter() {
    const { width = this.width, height = 5, speed = 2 } = this.opt.footer || {};
    this.footer = new Footer(this, width, height, speed);
  }
  
  initBranch() {
    this.branches = [];
    this.addBranches(this.opt.branch || []);
  }
  
  initBloom() {
    const { num = 500, width = this.width, height = this.height } = this.opt.bloom || {};
    const figure = this.seed.heart.figure;
    const r = 240;
    const cache = [];
    for (let i = 0; i < num; i++) {
      cache.push(this.createBloom(width, height, r, figure));
    }
    this.blooms = [];
    this.bloomsCache = cache;
  }
  
  toDataURL(type) { return this.canvas.toDataURL(type); }
  
  draw(k) {
    const rec = this.record[k];
    if (!rec) return;
    const { point, image } = rec;
    this.ctx.save();
    this.ctx.putImageData(image, point.x, point.y);
    this.ctx.restore();
  }
  
  addBranch(branch) { this.branches.push(branch); }
  
  addBranches(branches) {
    branches.forEach(([x1, y1, x2, y2, x3, y3, r, l, c]) => {
      this.addBranch(new Branch(this, new Point(x1, y1), new Point(x2, y2), new Point(x3, y3), r, l, c));
    });
  }
  
  removeBranch(branch) { this.branches = this.branches.filter((b) => b !== branch); }
  canGrow() { return this.branches.length > 0; }
  grow() { this.branches.forEach((b) => b?.grow()); }
  addBloom(bloom) { this.blooms.push(bloom); }
  removeBloom(bloom) { this.blooms = this.blooms.filter((b) => b !== bloom); }
  
  createBloom(width, height, radius, figure, color, alpha, angle, scale, place, speed) {
    let x, y;
    while (true) {
      x = Math.random() * (width - 40) + 20;
      y = Math.random() * (height - 40) + 20;
      if (inheart(x - width / 2, height - (height - 40) / 2 - y, radius)) {
        return new Bloom(this, new Point(x, y), figure, color, alpha, angle, scale, place, speed);
      }
    }
  }
  
  canFlower() { return this.bloomsCache.length > 0; }
  
  flower(num) {
    const blooms = this.bloomsCache.splice(0, num);
    blooms.forEach((b) => this.addBloom(b));
    this.blooms.forEach((b) => b.flower());
  }
  
  snapshot(k, x, y, width, height) {
    this.record[k] = { image: this.ctx.getImageData(x, y, width, height), point: new Point(x, y), width, height };
  }
  
  move(k, x, y) {
    const rec = this.record[k || "move"];
    let { point, image, speed = 10, width, height } = rec;
    const i = Math.min(point.x + speed, x);
    const j = Math.min(point.y + speed, y);
    this.ctx.save();
    this.ctx.clearRect(point.x, point.y, width, height);
    this.ctx.putImageData(image, i, j);
    this.ctx.restore();
    rec.point = new Point(i, j);
    rec.speed = Math.max(speed * 0.95, 2);
    return i < x || j < y;
  }
  
  jump() {
    
    const blooms = this.blooms.filter(b => b.place && b.speed);
    this.blooms = blooms;
    blooms.forEach((b) => b.jump());
    
    
    if (blooms.length < 3) {
      const { width = this.width, height = this.height } = this.opt.bloom || {};
      const figure = this.seed.heart.figure;
      for (let i = 0; i < random(1, 2); i++) {
        this.blooms.push(this.createBloom(
          width / 2 + width, height, 240, figure, 
          colorPalette[random(0, colorPalette.length - 1)], 
          1, null, 1, 
          new Point(random(-100, 600), 720), 
          random(200, 300)
        ));
      }
    }
  }
}


class Branch {
  constructor(tree, p1, p2, p3, radius, length = 100, branchs = []) {
    this.tree = tree;
    this.point1 = p1;
    this.point2 = p2;
    this.point3 = p3;
    this.radius = radius;
    this.length = length;
    this.len = 0;
    this.t = 1 / (length - 1);
    this.branchs = branchs;
  }
  
  grow() {
    if (this.len <= this.length) {
      const p = bezier([this.point1, this.point2, this.point3], this.len * this.t);
      this.draw(p);
      this.len += 1;
      this.radius *= 0.97;
    } else {
      this.tree.removeBranch(this);
      this.tree.addBranches(this.branchs);
    }
  }
  
  draw(p) {
    const { ctx } = this.tree;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "rgb(128, 15, 47)"; 
    ctx.shadowColor = "rgb(128, 15, 47)";
    ctx.shadowBlur = 2;
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}


class Bloom {
  constructor(tree, point, figure, color = "#c9184a", 
    alpha = random(0.3, 1), angle = random(0, 360), scale = 0.1, place, speed) {
    this.tree = tree;
    this.point = point;
    this.color = color;
    this.alpha = alpha;
    this.angle = angle;
    this.scale = scale;
    this.place = place;
    this.speed = speed;
    this.figure = figure;
  }
  
  
  flower = () => {
    this.draw();
    this.scale += 0.1;
    if (this.scale > 1) this.tree.removeBloom(this);
  };
  
  draw = () => {
    const { ctx } = this.tree;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.point.x, this.point.y);
    ctx.scale(this.scale, this.scale);
    ctx.rotate(this.angle);
    ctx.beginPath();
    for (let i = 0; i < this.figure.length; i++) {
      const p = this.figure.get(i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  
  
  jump = () => {
    if (!this.place || !this.speed) return;
    if (this.point.x < -20 || this.point.y > this.tree.height + 20) {
      this.tree.removeBloom(this);
    } else {
      this.draw();
      const { x, y } = this.place.sub(this.point).div(this.speed).add(this.point);
      this.point = { x, y };
      this.angle += 0.05;
      this.speed -= 1;
    }
  };
}


const typewriter = async (el, speed = 75) => {
  el.style.display = "block";
  const str = el.innerHTML;
  let progress = 0;
  el.innerHTML = "";
  const timer = setInterval(() => {
    if (str.charAt(progress) === "<") progress = str.indexOf(">", progress) + 1;
    else progress++;
    el.innerHTML = `${str.substring(0, progress)}${progress & 1 ? "_" : ""}`;
    el.scrollTop = el.scrollHeight;
    if (progress >= str.length) {
      clearInterval(timer);
      el.innerHTML = str;
      el.scrollTop = el.scrollHeight;
    }
  }, speed);
};

const scaleContent = () => {
  const base = { w: 1100, h: 680 };
  const { innerWidth: w, innerHeight: h } = window;
  const scale = Math.min(w / base.w, h / base.h, 1);
  const newW = base.w * scale, newH = base.h * scale;
  Object.assign(document.body.style, {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: `${newW}px`,
    height: `${newH}px`,
    marginTop: `${(h - newH) / 2}px`,
    marginLeft: `${(w - newW) / 2}px`
  });
  return scale;
};

const initContent = () => {
  const letter = document.getElementById("letter");
  const { letter: letterConfig } = CONFIG;
  let html = '';
  for (let i = 1; ; i++) {
    const para = letterConfig[`paragraph${i}`];
    if (!para) break;
    const className = i === 11 ? 'footer' : '';
    html += para.split('\n').map(line => `<p class="${className}">${line}</p>`).join('') + '<br>';
  }
  letter.innerHTML = html;
};


const AnimationConfig = {
  SCALE_FACTOR: 0.95,        
  SEED_MOVE_SPEED: 2,        
  TREE_GROW_DELAY: 10,       
  FLOWER_BLOOM_COUNT: 2,     
  FLOWER_BLOOM_DELAY: 10,    
  TREE_MOVE_TARGET_X: 500,   
  SNAPSHOT_LEFT_X: 240,      
  SNAPSHOT_RIGHT_X: 500,     
  SNAPSHOT_WIDTH: 610,       
  BACKGROUND_FADE_DELAY: 300,
  HEART_JUMP_DELAY: 25,      
};

async function waitForUserClick(seed, canvas, scaleFactor) {
  return new Promise((resolve) => {
    const clickHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scaleFactor;
      const y = (e.clientY - rect.top) / scaleFactor;
      if (seed.hover(x, y)) {
        canvas.removeEventListener("click", clickHandler);
        resolve();
      }
    };
    canvas.addEventListener("click", clickHandler);
  });
}

async function animateSeedShrink(seed) {
  while (seed.canScale()) {
    seed.scale(AnimationConfig.SCALE_FACTOR);
    await sleep(AnimationConfig.TREE_GROW_DELAY);
  }
}

async function animateSeedMove(seed, footer) {
  while (seed.canMove()) {
    seed.move(0, AnimationConfig.SEED_MOVE_SPEED);
    footer.draw();
    await sleep(AnimationConfig.TREE_GROW_DELAY);
  }
}

async function animateTreeGrow(tree) {
  while (tree.canGrow()) {
    tree.grow();
    await sleep(AnimationConfig.TREE_GROW_DELAY);
  }
}

async function animateFlowerBloom(tree) {
  while (tree.canFlower()) {
    tree.flower(AnimationConfig.FLOWER_BLOOM_COUNT);
    await sleep(AnimationConfig.FLOWER_BLOOM_DELAY);
  }
}

async function animateTreeMove(tree, footer) {
  tree.snapshot("p1", AnimationConfig.SNAPSHOT_LEFT_X, 0, AnimationConfig.SNAPSHOT_WIDTH, tree.height);
  while (tree.move("p1", AnimationConfig.TREE_MOVE_TARGET_X, 0)) {
    footer.draw();
    await sleep(AnimationConfig.TREE_GROW_DELAY);
  }
  footer.draw();
  tree.snapshot("p2", AnimationConfig.SNAPSHOT_RIGHT_X, 0, AnimationConfig.SNAPSHOT_WIDTH, tree.height);
}

async function prepareBackground(tree, canvas) {
  canvas.parentNode.style.background = `url(${tree.toDataURL("image/png")})`;
  canvas.style.background = "transparent";
  await sleep(AnimationConfig.BACKGROUND_FADE_DELAY);
  canvas.style.background = "none";
}

function revealLetter() {
  typewriter(document.getElementById("letter"));
}

function startHeartJumpAnimation(tree) {
  const jumpAnimate = async () => {
    tree.ctx.clearRect(0, 0, tree.width, tree.height);
    tree.draw("p2");  
    tree.jump();      
    tree.footer.draw();
    await sleep(AnimationConfig.HEART_JUMP_DELAY);
    requestAnimationFrame(jumpAnimate);
  };
  jumpAnimate();
}


document.addEventListener("DOMContentLoaded", async () => {
  initContent();
  
  
  const canvas = document.getElementById("canvas");
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  canvas.width = w;
  canvas.height = h;
  
  
  const opts = {
    seed: { x: w / 2 - 20, color: "rgb(128, 15, 47)", scale: 3 },  
    branch: [[535, 680, 570, 250, 500, 200, 30, 100, [
      [540, 500, 455, 417, 340, 400, 13, 100, [[450, 435, 434, 430, 394, 395, 2, 40]]],
      [550, 445, 600, 356, 680, 345, 12, 100, [[578, 400, 648, 409, 661, 426, 3, 80]]],
      [539, 281, 537, 248, 534, 217, 3, 40],
      [546, 397, 413, 247, 328, 244, 9, 80, [[427, 286, 383, 253, 371, 205, 2, 40], [498, 345, 435, 315, 395, 330, 4, 60]]],
      [546, 357, 608, 252, 678, 221, 6, 100, [[590, 293, 646, 277, 648, 271, 2, 80]]]
    ]]],
    bloom: { num: 700, width: 1080, height: 650 },
    footer: { width: 1200, height: 5, speed: 10 }
  };
  
  
  const tree = new Tree(canvas, w, h, opts);
  const { seed, footer } = tree;
  
  
  let scaleFactor = scaleContent();
  window.addEventListener("resize", () => { scaleFactor = scaleContent(); });
  
  
  
  
  seed.draw();
  
  
  await waitForUserClick(seed, canvas, scaleFactor);
  
  
  var myMedia = document.createElement('audio');
  $('#player').append(myMedia);
  myMedia.id = "myMedia";
  playAudio('lofi songs if you\'re having a bad day.mp3', 0.3);
  
  
  await animateSeedShrink(seed);
  
  
  await animateSeedMove(seed, footer);
  
  
  await animateTreeGrow(tree);
  
  
  await animateFlowerBloom(tree);
  
  
  await animateTreeMove(tree, footer);
  
  
  await prepareBackground(tree, canvas);
  
  
  revealLetter();
  
  
  startHeartJumpAnimation(tree);
});

$("#volume").slider({
  	min: 0,
  	max: 100,
  	value: 30,
		range: "min",
  	slide: function(event, ui) {
    	setVolume(ui.value / 100);
  	}
	});
	
	$('#volumeBtn').click(function() {
		$('#player').addClass('show');
	});
	
	function playAudio(fileName, myVolume) {
			myMedia.src = fileName;
			myMedia.setAttribute('loop', 'loop');
    	setVolume(myVolume);
    	myMedia.play();
	}
	
	function setVolume(myVolume) {
    var myMedia = document.getElementById('myMedia');
    myMedia.volume = myVolume;
	}