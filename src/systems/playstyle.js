// Silently tracks how the player plays. No UI. Shapes the evolution.

class PlaystyleTracker {
  constructor() {
    this.moves = 0;
    this.pauses = 0;
    this.edgeVisits = 0;
    this.rushEats = 0;
    this.movesSinceFood = 0;
  }

  recordMove(head, food) {
    this.moves++;
    this.movesSinceFood++;

    if (head.x === 0 || head.x === 29 || head.y === 0 || head.y === 29) {
      this.edgeVisits++;
    }

    if (food && head.x === food.x && head.y === food.y) {
      if (this.movesSinceFood <= 4) this.rushEats++;
      this.movesSinceFood = 0;
    }
  }

  recordPause() {
    this.pauses++;
  }

  profile() {
    return {
      aggressive: this.rushEats,
      cautious:   this.pauses,
      curious:    this.edgeVisits,
      greedy:     this.rushEats,
      dominant:   this._dominant(),
    };
  }

  _dominant() {
    const scores = {
      aggressive: this.rushEats * 3,
      cautious:   this.pauses * 2,
      curious:    this.edgeVisits,
      greedy:     this.rushEats * 2,
    };
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }
}
