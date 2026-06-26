const GRID_SIZE = 16;
const COLS = 30;
const ROWS = 30;

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.evolution = new EvolutionSystem();
    this.playstyle = new PlaystyleTracker();
    this.voice = new VoiceReactor(this);

    // Build starting snake from DEV.startSize
    const startSize = (window.DEV && window.DEV.startSize) || 3;
    this.snake = [];
    for (let i = 0; i < startSize; i++) {
      this.snake.push({ x: 15 - i, y: 15 });
    }
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = this.spawnFood();
    this.score = 0;
    this.alive = true;
    this.tickTimer = 0;

    // Near-death powerup — only once per game
    this.nearDeathUsed = false;
    // Jump powerup state
    this.jumpReady = false;
    this.jumpActive = false;

    // Stage sparks — track which have fired
    this.sparks = { glitch: false, trail: false, foodTwitch: false, tilt: false, pause: false };

    // Apply DEV stage override
    if (window.DEV && window.DEV.stage > 1) {
      this.evolution.stage = window.DEV.stage;
    }
    this.trailSegments = []; // fading trail for stage 2+
    this.gridTilt = 0;       // degrees, stage 4
    this.snakeForcePause = false;

    this.graphics = this.add.graphics();
    this.bgGraphics = this.add.graphics().setDepth(-1);

    this.scoreText = this.add.text(8, 8, 'SCORE: 0', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#cccccc',
    }).setDepth(10);

    this.flashText = this.add.text(240, 240, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.cursors = this.input.keyboard.createCursorKeys();

    // Space: jump if ready, otherwise record pause for playstyle
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.jumpReady && this.alive) {
        this.activateJump();
      } else {
        this.playstyle.recordPause();
      }
    });

    this.evolution.onStageChange = (stage) => this.handleStageChange(stage);
  }

  update(time, delta) {
    if (!this.alive) return;

    this.handleInput();
    this.tickTimer += delta;
    if (this.tickTimer >= this.evolution.tickRate()) {
      this.tickTimer = 0;
      this.tick();
    }

    this.draw();
  }

  handleInput() {
    const { left, right, up, down } = this.cursors;
    if (left.isDown  && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
    if (right.isDown && this.dir.x === 0) this.nextDir = { x:  1, y: 0 };
    if (up.isDown    && this.dir.y === 0) this.nextDir = { x:  0, y: -1 };
    if (down.isDown  && this.dir.y === 0) this.nextDir = { x:  0, y:  1 };
  }

  tick() {
    // Stage 5 spark: snake pauses on its own once
    if (!this.sparks.pause && this.evolution.stage >= 5 && this._dev('pause')) {
      this.sparks.pause = true;
      this.snakeForcePause = true;
      this.time.delayedCall(600, () => { this.snakeForcePause = false; });
      return;
    }
    if (this.snakeForcePause) return;

    this.dir = this.nextDir;
    const head = {
      x: (this.snake[0].x + this.dir.x + COLS) % COLS,
      y: (this.snake[0].y + this.dir.y + ROWS) % ROWS,
    };

    // Collision — skip if jump is active
    const collides = this.snake.some(s => s.x === head.x && s.y === head.y);
    if (collides && !this.jumpActive) {
      this.die();
      return;
    }
    if (this.jumpActive) this.jumpActive = false; // jump consumed

    // Add trail segment before moving
    if (this.evolution.stage >= 2 && this._dev('trail')) {
      this.trailSegments.push({ x: this.snake[0].x, y: this.snake[0].y, alpha: 0.25 });
      if (this.trailSegments.length > 12) this.trailSegments.shift();
    }

    this.snake.unshift(head);
    this.playstyle.recordMove(head, this.food);

    // Stage 3 spark: food twitches once before being eaten
    if (!this.sparks.foodTwitch && this.evolution.stage >= 3 && this._dev('foodTwitch')) {
      const dist = Math.abs(head.x - this.food.x) + Math.abs(head.y - this.food.y);
      if (dist <= 2) {
        this.sparks.foodTwitch = true;
        const origX = this.food.x;
        const origY = this.food.y;
        this.food = { x: origX + (Math.random() > 0.5 ? 1 : -1), y: origY };
        this.time.delayedCall(120, () => { this.food = { x: origX, y: origY }; });
      }
    }

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.scoreText.setText('SCORE: ' + this.score);

      // Stage 1 spark: tiny glitch on very first eat
      if (!this.sparks.glitch && this.score === 1 && this._dev('glitch')) {
        this.sparks.glitch = true;
        this.doGlitch();
      }

      this.food = this.spawnFood();
      this.evolution.onEat(this.score, this.playstyle.profile());
    } else {
      this.snake.pop();
    }
  }

  draw() {
    this.graphics.clear();
    this.bgGraphics.clear();
    const stage = this.evolution.stage;

    // Background
    this.bgGraphics.fillStyle(0x0d0d0d);
    this.bgGraphics.fillRect(0, 0, COLS * GRID_SIZE, ROWS * GRID_SIZE);

    // Grid — visible in stages 1-3, fades out by stage 4
    if (stage <= 3) {
      const gridAlpha = stage === 3 ? 0.3 : 0.6;
      const gridColor = stage === 1 ? 0x2a2a2a : 0x1a2a1a;
      this.graphics.lineStyle(1, gridColor, gridAlpha);
      for (let x = 0; x <= COLS; x++) {
        this.graphics.moveTo(x * GRID_SIZE, 0);
        this.graphics.lineTo(x * GRID_SIZE, ROWS * GRID_SIZE);
      }
      for (let y = 0; y <= ROWS; y++) {
        this.graphics.moveTo(0, y * GRID_SIZE);
        this.graphics.lineTo(COLS * GRID_SIZE, y * GRID_SIZE);
      }
      this.graphics.strokePath();
    }

    // Stage 4 spark: world tilts slightly (canvas rotation)
    const tiltTarget = stage >= 4 && !this.sparks.tilt ? 1.5 : 0;
    if (stage >= 4 && !this.sparks.tilt && this._dev('tilt')) {
      this.sparks.tilt = true;
      this.gridTilt = 1.5;
      // Tilt resets after a few seconds — the world corrects itself
      this.time.delayedCall(3000, () => { this.gridTilt = 0; });
    }
    if (this.gridTilt !== 0) {
      this.graphics.setAngle(this.gridTilt);
    } else {
      this.graphics.setAngle(0);
    }

    // Fading trail (stage 2+)
    this.trailSegments.forEach((seg, i) => {
      const a = (i / this.trailSegments.length) * 0.2;
      this.graphics.fillStyle(0x44ff44, a);
      this.graphics.fillRect(
        seg.x * GRID_SIZE + 3,
        seg.y * GRID_SIZE + 3,
        GRID_SIZE - 6,
        GRID_SIZE - 6
      );
    });

    // Food
    this.graphics.fillStyle(this.evolution.foodColor());
    this.graphics.fillRect(
      this.food.x * GRID_SIZE + 2,
      this.food.y * GRID_SIZE + 2,
      GRID_SIZE - 4,
      GRID_SIZE - 4
    );

    // Jump powerup indicator
    if (this.jumpReady) {
      this.graphics.fillStyle(0xffff00, 0.8);
      this.graphics.fillRect(
        this.food.x * GRID_SIZE,
        this.food.y * GRID_SIZE,
        4, 4
      );
      // Small JUMP label near score
      if (!this.jumpLabel) {
        this.jumpLabel = this.add.text(8, 24, '[ SPACE = JUMP ]', {
          fontFamily: 'monospace', fontSize: '10px', color: '#ffff44',
        }).setDepth(10);
      }
    } else if (this.jumpLabel) {
      this.jumpLabel.destroy();
      this.jumpLabel = null;
    }

    // Snake
    this.snake.forEach((seg, i) => {
      const color = this.evolution.snakeColor(i, this.snake.length);
      const size = i === 0 ? GRID_SIZE : GRID_SIZE - 2;
      const offset = i === 0 ? 0 : 1;
      this.graphics.fillStyle(color);
      this.graphics.fillRect(
        seg.x * GRID_SIZE + offset,
        seg.y * GRID_SIZE + offset,
        size,
        size
      );
    });
  }

  doGlitch() {
    // Single frame white flash — barely there
    this.cameras.main.flash(80, 255, 255, 255, true);
    this.time.delayedCall(80, () => this.cameras.main.flash(0, 0, 0, 0, true));
  }

  showFlash(msg, color = '#ffffff') {
    this.flashText.setText(msg).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: this.flashText,
      alpha: 0,
      duration: 1800,
      ease: 'Power2',
    });
  }

  activateJump() {
    this.jumpReady = false;
    this.jumpActive = true; // next collision is ignored
    this.showFlash('✦ jump', '#ffff44');
  }

  spawnFood() {
    let pos;
    do {
      pos = {
        x: Phaser.Math.Between(0, COLS - 1),
        y: Phaser.Math.Between(0, ROWS - 1),
      };
    } while (this.snake && this.snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  handleStageChange(stage) {
    console.log('Stage:', stage);
    if (stage === 4) this.voice.requestMic();

    // Give jump powerup at stage 3
    if (stage === 3 && this._dev('jump')) {
      this.time.delayedCall(2000, () => {
        this.jumpReady = true;
        this.showFlash('something new awakens...', '#88ff88');
      });
    }
  }

  die() {
    // Near-death powerup — 30% chance, only once
    if (!this.nearDeathUsed && Math.random() < 0.3 && this._dev('nearDeath')) {
      this.nearDeathUsed = true;
      this.nearDeathRevival();
      return;
    }

    this.alive = false;
    this.scoreText.setText('GAME OVER — SCORE: ' + this.score + '  [SPACE to restart]');
    this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
  }

  _dev(key) {
    return !window.DEV || window.DEV.milestones[key] !== false;
  }

  nearDeathRevival() {
    // Flash the screen, show message, revive with jump ready
    this.cameras.main.flash(200, 255, 50, 50, true);
    this.showFlash('...not yet.', '#ff4444');

    this.time.delayedCall(600, () => {
      // Trim snake back to 3 segments
      this.snake = this.snake.slice(0, 3);
      // Grant jump powerup as the revelation
      this.jumpReady = true;
      this.showFlash('✦ something awakened', '#ffaa44');
    });
  }
}
