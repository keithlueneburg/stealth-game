// Basic stealth game logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 15, 'green');
        this.speed = 200; // pixels per second
        this.vx = 0;
        this.vy = 0;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        // keep within bounds
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }
}

class Enemy extends Entity {
    constructor(x, y, patrolPoints) {
        super(x, y, 15, 'red');
        this.patrolPoints = patrolPoints;
        this.targetIndex = 0;
        this.speed = 100;
        this.visionAngle = Math.PI / 3; // 60 degrees
        this.visionRange = 200;
        this.facing = 0;
        this.detected = false;
    }
    update(dt) {
        if (this.patrolPoints.length > 0) {
            const target = this.patrolPoints[this.targetIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 5) {
                this.targetIndex = (this.targetIndex + 1) % this.patrolPoints.length;
            } else {
                this.facing = Math.atan2(dy, dx);
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }
        }
    }
    draw(ctx) {
        super.draw(ctx);
        // draw vision cone
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.facing);
        ctx.fillStyle = this.detected ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.visionRange, -this.visionRange * Math.tan(this.visionAngle/2));
        ctx.lineTo(this.visionRange, this.visionRange * Math.tan(this.visionAngle/2));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    checkDetection(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.visionRange) {
            this.detected = false;
            return false;
        }
        const angleToPlayer = Math.atan2(dy, dx);
        let diff = angleToPlayer - this.facing;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (Math.abs(diff) < this.visionAngle / 2) {
            this.detected = true;
            return true;
        }
        this.detected = false;
        return false;
    }
}

class Game {
    constructor() {
        this.player = new Player(canvas.width / 2, canvas.height / 2);
        this.enemies = [];
        this.lastTime = 0;
        this.score = 0;
        this.detected = false;
        this.paused = false;
        this._initEnemies();
        this._bindKeys();
        this._bindTouch();
    }
    _initEnemies() {
        const margin = 50;
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * (canvas.width - 2*margin) + margin;
            const y = Math.random() * (canvas.height - 2*margin) + margin;
            const patrol = [
                {x, y},
                {x: Math.random() * canvas.width, y: Math.random() * canvas.height}
            ];
            this.enemies.push(new Enemy(x, y, patrol));
        }
    }
    _bindKeys() {
        const keys = {};
        window.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            this._updatePlayerVelocity(keys);
        });
        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;
            this._updatePlayerVelocity(keys);
        });
    }
    _updatePlayerVelocity(keys) {
        let vx = 0, vy = 0;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) vx = -1;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) vx = 1;
        if (keys['ArrowUp'] || keys['w'] || keys['W']) vy = -1;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) vy = 1;
        const norm = Math.hypot(vx, vy);
        if (norm > 0) {
            this.player.vx = (vx / norm) * this.player.speed;
            this.player.vy = (vy / norm) * this.player.speed;
        } else {
            this.player.vx = 0;
            this.player.vy = 0;
        }
    }
    _bindTouch() {
        let touchActive = false;
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); touchActive = true; this._handleTouch(e); });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (touchActive) this._handleTouch(e); });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); touchActive = false; this.player.vx = 0; this.player.vy = 0; });
    }
    _handleTouch(e) {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const tx = t.clientX - rect.left;
        const ty = t.clientY - rect.top;
        const dx = tx - this.player.x;
        const dy = ty - this.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
            this.player.vx = (dx / dist) * this.player.speed;
            this.player.vy = (dy / dist) * this.player.speed;
        } else {
            this.player.vx = 0;
            this.player.vy = 0;
        }
    }
    update(dt) {
        this.player.update(dt);
        let anyDetection = false;
        this.enemies.forEach(enemy => {
            enemy.update(dt);
            if (enemy.checkDetection(this.player)) {
                anyDetection = true;
            }
        });
        if (anyDetection) {
            this.player.color = 'orange';
            this.detected = true;
        } else {
            this.player.color = 'green';
            if (this.detected === false) {
                this.score += dt;
            }
            this.detected = false;
        }
    }
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.player.draw(ctx);
        this.enemies.forEach(enemy => enemy.draw(ctx));
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${Math.floor(this.score)}`, 10, 30);
        if (this.detected) {
            ctx.fillStyle = 'red';
            ctx.font = '24px Arial';
            ctx.fillText('Detected!', canvas.width - 120, 30);
        }
    }
    run(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        requestAnimationFrame(this.run.bind(this));
    }
}

const game = new Game();
requestAnimationFrame(game.run.bind(game));
