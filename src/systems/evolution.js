class EvolutionSystem {
  constructor() {
    this.stage = 1;
    this.onStageChange = null;
  }

  onEat(score, playstyle) {
    const next = this._checkTriggers(score, playstyle);
    if (next && next > this.stage) {
      this.stage = next;
      if (this.onStageChange) this.onStageChange(this.stage);
    }
  }

  _checkTriggers(score, playstyle) {
    // Thresholds are starting points — adjust after playtesting
    if (this.stage < 2 && score >= 8)  return 2;
    if (this.stage < 3 && score >= 20) return 3;
    if (this.stage < 4 && score >= 40) return 4;
    if (this.stage < 5 && score >= 65) return 5;
    if (this.stage < 6 && score >= 90) return 6;
    return null;
  }

  tickRate() {
    const rates = { 1: 150, 2: 140, 3: 125, 4: 110, 5: 95, 6: 80 };
    return rates[this.stage] || 150;
  }

  snakeColor(segIndex, totalLength) {
    if (this.stage === 1) return 0xffffff;

    if (this.stage === 2) {
      // Subtle: faint green tint on head only
      return segIndex === 0 ? 0xccffcc : 0xffffff;
    }

    if (this.stage >= 3) {
      // Full colour gradient head to tail
      const t = segIndex / Math.max(totalLength, 1);
      const r = Math.floor(Phaser.Math.Linear(0x00, 0xff, 1 - t));
      const g = Math.floor(Phaser.Math.Linear(0xff, 0x44, t));
      const b = Math.floor(Phaser.Math.Linear(0x44, 0xff, t));
      return (r << 16) | (g << 8) | b;
    }

    return 0xffffff;
  }

  foodColor() {
    const colors = {
      1: 0xffffff,
      2: 0xeeffee,
      3: 0xffee44,
      4: 0xff6644,
      5: 0xff44ff,
      6: 0x44ffff,
    };
    return colors[this.stage] || 0xffffff;
  }
}
