// Mic-based ambient voice detection.
// No recording, no speech recognition — just volume threshold.
// Detects talking/laughing and triggers creature reactions.
// Also detects prolonged silence and nudges the player.

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
    this.subtitleText = null;

    // Silence detection
    this.lastSoundAt = Date.now();
    this.silenceLines = [
      "...hello?",
      "I can't tell if anyone is out there.",
      "You could at least breathe louder.",
      "Is this thing on?",
      "Say something. Anything.",
      "I'm watching either way.",
    ];
    this.silenceIndex = 0;
    this.silenceTimer = null;
  }

  // Called at game start — shows a pre-game screen, not mid-game
  requestMic(onGranted, onDeclined) {
    this._showMicScreen(onGranted, onDeclined);
  }

  _showMicScreen(onGranted, onDeclined) {
    const bg = this.scene.add.rectangle(240, 240, 480, 480, 0x000000, 0.85).setDepth(50);

    const title = this.scene.add.text(240, 190, 'one thing before you start', {
      fontFamily: 'monospace', fontSize: '13px', color: '#555555',
    }).setOrigin(0.5).setDepth(51);

    const body = this.scene.add.text(240, 230,
      'the game can react to sound —\ntalking, laughing, whatever.\nno recording. just listening.',
      { fontFamily: 'monospace', fontSize: '12px', color: '#888888', align: 'center' }
    ).setOrigin(0.5).setDepth(51);

    const yes = this.scene.add.text(180, 295, '[ Y — allow ]', {
      fontFamily: 'monospace', fontSize: '12px', color: '#5aff5a',
    }).setOrigin(0.5).setDepth(51);

    const no = this.scene.add.text(300, 295, '[ N — skip ]', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555555',
    }).setOrigin(0.5).setDepth(51);

    const dismiss = () => {
      bg.destroy(); title.destroy(); body.destroy(); yes.destroy(); no.destroy();
    };

    this.scene.input.keyboard.once('keydown-Y', () => {
      dismiss();
      this._startListening();
      if (onGranted) onGranted();
    });

    this.scene.input.keyboard.once('keydown-N', () => {
      dismiss();
      if (onDeclined) onDeclined();
    });
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
        this.lastSoundAt = Date.now();
        this._scheduleSilenceCheck();

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
        // Player declined browser permission — silent fail
      });
  }

  _scheduleSilenceCheck() {
    this.silenceTimer = this.scene.time.addEvent({
      delay: 28000,
      loop: true,
      callback: () => {
        const silent = Date.now() - this.lastSoundAt > 25000;
        if (silent && this.active) {
          this._reactToSilence();
        }
      },
    });
  }

  _onVolume(vol) {
    const now = Date.now();
    if (vol > this.THRESHOLD) {
      this.lastSoundAt = now;
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
    this._showLine(line);
  }

  _reactToSilence() {
    const line = this.silenceLines[this.silenceIndex % this.silenceLines.length];
    this.silenceIndex++;
    this._showLine(line, '#666666');
  }

  _showLine(line, color = '#999999') {
    if (this.reactionText && this.reactionText.active) this.reactionText.destroy();
    if (this.subtitleText && this.subtitleText.active) this.subtitleText.destroy();

    // Subtitle background strip
    this.subtitleText = this.scene.add.rectangle(240, 422, 480, 22, 0x000000, 0.55)
      .setDepth(19).setAlpha(0);

    this.reactionText = this.scene.add.text(240, 422, line, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: color,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.scene.tweens.add({
      targets: [this.reactionText, this.subtitleText],
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 2800,
      onComplete: () => {
        if (this.reactionText && this.reactionText.active) this.reactionText.destroy();
        if (this.subtitleText && this.subtitleText.active) this.subtitleText.destroy();
      },
    });
  }
}
