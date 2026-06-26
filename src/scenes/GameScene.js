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

    this.snake = [
      { x: 15, y: 15 },
      { x: 14, y: 15 },
      { x: 13, y: 15 },
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = this.spawnFood();
    this.score = 0;
    this.alive = true;
    this.tickTimer = 0;

    this.graphics = this.add.graphics();

    this.scoreText = this.add.text(8, 8, 'SCORE: 0', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setDepth(10);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => this.playstyle.recordPause());

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
    this.dir = this.nextDir;
    const head = {
      x: (this.snake[0].x + this.dir.x + COLS) % COLS,
      y: (this.snake[0].y + this.dir.y + ROWS) % ROWS,
    };

    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.die();
      return;
    }

    this.snake.unshift(head);
    this.playstyle.recordMove(head, this.food);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.scoreText.setText('SCORE: ' + this.score);
      this.food = this.spawnFood();
      this.evolution.onEat(this.score, this.playstyle.profile());
    } else {
      this.snake.pop();
    }
  }

  draw() {
    this.graphics.clear();
    const stage = this.evolution.stage;

    // Grid — only in early stages
    if (stage <= 2) {
      this.graphics.lineStyle(1, 0x111111, 1);
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

    // Food
    this.graphics.fillStyle(this.evolution.foodColor());
    this.graphics.fillRect(
      this.food.x * GRID_SIZE + 2,
      this.food.y * GRID_SIZE + 2,
      GRID_SIZE - 4,
      GRID_SIZE - 4
    );

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
    if (stage === 4) {
      this.voice.requestMic();
    }
  }

  die() {
    this.alive = false;
    this.scoreText.setText('GAME OVER — SCORE: ' + this.score + '  [SPACE to restart]');
    this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
  }
}
