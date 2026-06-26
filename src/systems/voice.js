// Mic-based ambient voice detection.
// No recording, no speech recognition — just volume threshold.
// Detects talking/laughing and triggers creature reactions.

class VoiceReactor {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.cooldown = 0;
    this.COOLDOWN_MS = 8000;
    this.THRESHOLD = 30;
    this.talkingFor = 0;
    this.TRIGGER_MS = 500;
    this.reactionText = null;
  }

  requestMic() {
    const prompt = this.scene.add.text(240, 440,
      '[ allow sound reactions? — press Y ]',
      { fontFamily: 'monospace', fontSize: '11px', color: '#666666' }
    ).setOrigin(0.5).setDepth(20);

    this.scene.input.keyboard.once('keydown-Y', () => {
      prompt.destroy();
      this._startListening();
    });

    this.scene.time.delayedCall(6000, () => { if (prompt.active) prompt.destroy(); });
  }

  _startListening() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        this.active = true;

        const check = () => {
          if (!this.active) return;
          analyser.getByteFrequencyData(data);
          const vol = data.reduce((a, b) => a + b, 0) / data.length;
          this._onVolume(vol);
          requestAnimationFrame(check);
        };
        check();
      })
      .catch(() => {
        // Player declined or no mic — silent fail, game continues
      });
  }

  _onVolume(vol) {
    const now = Date.now();
    if (vol > this.THRESHOLD) {
      this.talkingFor += 16;
      if (this.talkingFor >= this.TRIGGER_MS && now > this.cooldown) {
        this.cooldown = now + this.COOLDOWN_MS;
        this.talkingFor = 0;
        this._react();
      }
    } else {
      this.talkingFor = Math.max(0, this.talkingFor - 32);
    }
  }

  _react() {
    const lines = {
      aggressive: [
        "Yes, keep talking. It helps me concentrate.",
        "Was that a strategy discussion? Cute.",
        "I can hear you, you know.",
        "Laughing already? We've barely started.",
        "Bold of you to commentate.",
      ],
      cautious: [
        "Careful. I'm listening.",
        "Every word. Every word.",
        "You sound nervous. You should be.",
        "Quiet would suit you better.",
      ],
      curious: [
        "Something to say?",
        "Observing me won't help you.",
        "Go on then.",
      ],
      greedy: [
        "More talking, less eating. Interesting priorities.",
        "You seem distracted.",
        "Focus.",
      ],
    };

    const dominant = this.scene.playstyle ? this.scene.playstyle._dominant() : 'curious';
    const pool = lines[dominant] || lines.curious;
    const line = pool[Math.floor(Math.random() * pool.length)];

    if (this.reactionText && this.reactionText.active) this.reactionText.destroy();

    this.reactionText = this.scene.add.text(240, 420, line, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.scene.tweens.add({
      targets: this.reactionText,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 2500,
      onComplete: () => { if (this.reactionText && this.reactionText.active) this.reactionText.destroy(); },
    });
  }
}
