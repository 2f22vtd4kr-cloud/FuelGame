// ─── Audio Manager — Web Audio API synthesis (no MP3 files needed) ───────────
// §8.1 background music (3 synthesized tracks) + §8.2 SFX
// audio.init() must be called on first user gesture (autoplay policy).

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private gurgleOsc: OscillatorNode | null = null;
  private gurgleGain: GainNode | null = null;
  private gurgleLFO: OscillatorNode | null = null;

  // §8.1 Music scheduler state (Chris Wilson lookahead clock)
  private musicTrack: 'menu' | 'play' | 'meeting' | null = null;
  private musicScheduler: ReturnType<typeof setInterval> | null = null;
  private musicNextBeatTime: number = 0;
  private musicBeatIndex: number = 0;
  private musicBPM: number = 90;
  private readonly MUSIC_LOOKAHEAD = 0.25; // seconds to schedule ahead
  private readonly MUSIC_INTERVAL = 100;   // ms between scheduler runs

  // §8.1 Dynamic rumble layer (siphon proximity)
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;

  // ── Init ──────────────────────────────────────────────────────────────────

  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.masterGain);
    } catch {
      // AudioContext not available (SSR/test env)
    }
  }

  private get c(): AudioContext | null { return this.ctx; }
  private get dest(): AudioNode | null { return this.sfxGain; }
  private get mDest(): AudioNode | null { return this.musicGain; }

  // ── §8.1 Music API ────────────────────────────────────────────────────────

  playMusic(track: 'menu' | 'play' | 'meeting'): void {
    this.init();
    if (!this.c || !this.musicGain) return;
    if (this.musicTrack === track) return; // already playing this track
    this.stopMusic();
    this.musicTrack = track;
    this.musicBPM = track === 'menu' ? 90 : track === 'play' ? 110 : 60;
    this.musicBeatIndex = 0;
    this.musicNextBeatTime = this.c.currentTime + 0.05;

    // Fade in
    const mg = this.musicGain;
    mg.gain.cancelScheduledValues(this.c.currentTime);
    mg.gain.setValueAtTime(0, this.c.currentTime);
    mg.gain.linearRampToValueAtTime(0.18, this.c.currentTime + 2.0);

    this._scheduleMusicBeats();
    this.musicScheduler = setInterval(() => this._scheduleMusicBeats(), this.MUSIC_INTERVAL);
  }

  stopMusic(): void {
    if (this.musicScheduler !== null) {
      clearInterval(this.musicScheduler);
      this.musicScheduler = null;
    }
    this.musicTrack = null;
    if (this.c && this.musicGain) {
      const mg = this.musicGain;
      mg.gain.cancelScheduledValues(this.c.currentTime);
      mg.gain.setValueAtTime(mg.gain.value, this.c.currentTime);
      mg.gain.linearRampToValueAtTime(0, this.c.currentTime + 0.8);
    }
    this.stopRumble();
  }

  /** §8.1 Dynamic siphon-proximity rumble layer */
  startRumble(): void {
    this.init();
    if (!this.c || !this.musicGain || this.rumbleOsc) return;
    try {
      const ctx = this.c;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120;
      osc.type = 'sawtooth';
      osc.frequency.value = 40;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2.0);
      osc.start();
      this.rumbleOsc = osc;
      this.rumbleGain = gain;
    } catch { /* ignore */ }
  }

  stopRumble(): void {
    if (!this.c || !this.rumbleGain || !this.rumbleOsc) return;
    try {
      const t = this.c.currentTime;
      this.rumbleGain.gain.linearRampToValueAtTime(0, t + 1.0);
      this.rumbleOsc.stop(t + 1.0);
      this.rumbleOsc = null;
      this.rumbleGain = null;
    } catch { /* ignore */ }
  }

  // ── Music beat scheduler ──────────────────────────────────────────────────

  private _scheduleMusicBeats(): void {
    if (!this.c || !this.musicTrack) return;
    const beatDur = 60 / this.musicBPM;
    const horizon = this.c.currentTime + this.MUSIC_LOOKAHEAD;

    while (this.musicNextBeatTime < horizon) {
      switch (this.musicTrack) {
        case 'menu':    this._menuBeat(this.musicNextBeatTime, this.musicBeatIndex % 16); break;
        case 'play':    this._playBeat(this.musicNextBeatTime, this.musicBeatIndex % 16); break;
        case 'meeting': this._meetingBeat(this.musicNextBeatTime, this.musicBeatIndex % 8); break;
      }
      this.musicNextBeatTime += beatDur;
      this.musicBeatIndex++;
    }
  }

  /** §8.1 Menu: lo-fi, C major, 90 BPM — electric piano, soft kick, hi-hat */
  private _menuBeat(t: number, b: number): void {
    const ctx = this.c!; const dest = this.mDest!;
    // Hi-hat on every beat (quiet filtered noise)
    this._hihat(ctx, dest, t, 0.06);

    switch (b) {
      case 0: case 8:
        this._kick(ctx, dest, t, 55, 0.28);
        this._pianoChord(ctx, dest, t, [262, 330, 392], 0.18, 1.2); // C major
        break;
      case 2: case 10:
        this._snare(ctx, dest, t, 0.14);
        this._pianoNote(ctx, dest, t, 523, 0.12, 0.5); // C5
        break;
      case 4: case 12:
        this._kick(ctx, dest, t, 55, 0.22);
        this._pianoChord(ctx, dest, t, [392, 494, 587], 0.14, 1.0); // G major
        break;
      case 6: case 14:
        this._snare(ctx, dest, t, 0.12);
        this._pianoNote(ctx, dest, t, 659, 0.12, 0.5); // E5
        break;
      case 1: case 5: case 9: case 13:
        this._pianoNote(ctx, dest, t, 440, 0.06, 0.3); // background A4
        break;
      case 3: case 7: case 11: case 15:
        this._pianoNote(ctx, dest, t, 392, 0.05, 0.3); // G4 filler
        break;
    }
  }

  /** §8.1 Play phase: tense, A minor, 110 BPM — plucked bass, syncopated stabs */
  private _playBeat(t: number, b: number): void {
    const ctx = this.c!; const dest = this.mDest!;
    // Drone: sustain A2 quietly under everything
    if (b === 0) this._drone(ctx, dest, t, 110, 0.07, 60 / 110 * 16);
    // Hi-hat on every beat
    this._hihat(ctx, dest, t, 0.04);

    switch (b) {
      case 0: case 4: case 8: case 12:
        this._kick(ctx, dest, t, 50, 0.22);
        this._pluckBass(ctx, dest, t, 110, 0.22); // A2
        break;
      case 2: case 10:
        this._snare(ctx, dest, t, 0.10);
        this._stab(ctx, dest, t, [349, 523], 0.12); // Fm stab
        break;
      case 6: case 14:
        this._snare(ctx, dest, t, 0.09);
        this._stab(ctx, dest, t, [262, 392], 0.10); // C stab
        break;
      case 1: case 9:
        this._pluckBass(ctx, dest, t, 165, 0.10); // E3 off-beat
        break;
      case 5: case 13:
        this._stab(ctx, dest, t, [247, 349], 0.08); // dissonant Bm/F
        break;
      case 3: case 7: case 11: case 15:
        this._pluckBass(ctx, dest, t, 110, 0.06); // subtle A2 fill
        break;
    }
  }

  /** §8.1 Meeting: dramatic tango, D minor, 60 BPM — accordion, bass, castanet */
  private _meetingBeat(t: number, b: number): void {
    const ctx = this.c!; const dest = this.mDest!;
    switch (b) {
      case 0: case 4:
        this._kick(ctx, dest, t, 73, 0.30); // D2 bass
        this._accordion(ctx, dest, t, [294, 349, 440], 0.20, 0.7); // Dm chord
        break;
      case 1: case 3: case 7:
        this._castanet(ctx, dest, t, 0.14);
        break;
      case 2:
        this._kick(ctx, dest, t, 110, 0.22); // A2
        this._accordion(ctx, dest, t, [262, 349, 523], 0.16, 0.6); // F major
        break;
      case 5:
        this._accordion(ctx, dest, t, [294, 392, 494], 0.10, 0.5); // quiet fill
        break;
      case 6:
        this._kick(ctx, dest, t, 73, 0.25);
        this._accordion(ctx, dest, t, [294, 349, 440], 0.18, 0.6);
        break;
    }
  }

  // ── Primitive synthesizers (music building blocks) ────────────────────────

  private _kick(ctx: AudioContext, dest: AudioNode, t: number, freq: number, vol: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 3, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.15);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.4);
  }

  private _snare(ctx: AudioContext, dest: AudioNode, t: number, vol: number): void {
    const bufSize = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.7;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(vol, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.start(t); noise.stop(t + 0.14);
  }

  private _hihat(ctx: AudioContext, dest: AudioNode, t: number, vol: number): void {
    const bufSize = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 8000;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(vol, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.start(t); noise.stop(t + 0.05);
  }

  private _pianoNote(ctx: AudioContext, dest: AudioNode, t: number, freq: number, vol: number, dur: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  private _pianoChord(ctx: AudioContext, dest: AudioNode, t: number, freqs: number[], vol: number, dur: number): void {
    for (const f of freqs) this._pianoNote(ctx, dest, t, f, vol * 0.6, dur);
  }

  private _pluckBass(ctx: AudioContext, dest: AudioNode, t: number, freq: number, vol: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 400;
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.type = 'triangle'; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.4);
  }

  private _stab(ctx: AudioContext, dest: AudioNode, t: number, freqs: number[], vol: number): void {
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sawtooth'; osc.frequency.value = f;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.18);
    }
  }

  private _drone(ctx: AudioContext, dest: AudioNode, t: number, freq: number, vol: number, dur: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 300;
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur);
  }

  private _accordion(ctx: AudioContext, dest: AudioNode, t: number, freqs: number[], vol: number, dur: number): void {
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const g = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      lfo.type = 'sine'; lfo.frequency.value = 5;
      lfoGain.gain.value = freq * 0.015;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      osc.connect(g); g.connect(dest);
      g.gain.setValueAtTime(vol * 0.5, t);
      g.gain.setValueAtTime(vol * 0.5, t + dur - 0.08);
      g.gain.linearRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur);
      lfo.start(t); lfo.stop(t + dur);
    }
  }

  private _castanet(ctx: AudioContext, dest: AudioNode, t: number, vol: number): void {
    for (let i = 0; i < 2; i++) {
      const bufSize = Math.floor(ctx.sampleRate * 0.025);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) data[j] = (Math.random() * 2 - 1);
      const noise = ctx.createBufferSource();
      const ng = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 5000;
      noise.buffer = buf;
      noise.connect(f); f.connect(ng); ng.connect(dest);
      ng.gain.setValueAtTime(vol, t + i * 0.06);
      ng.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.03);
      noise.start(t + i * 0.06); noise.stop(t + i * 0.06 + 0.04);
    }
  }

  // ── Looping gurgle for active siphon ──────────────────────────────────────

  startGurgle(): void {
    this.init();
    if (!this.c || this.gurgleOsc) return;
    try {
      const ctx = this.c;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 90;
      lfo.type = 'sine';
      lfo.frequency.value = 4;
      lfoGain.gain.value = 30;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.dest!);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.5);

      osc.start();
      lfo.start();

      this.gurgleOsc = osc;
      this.gurgleGain = gain;
      this.gurgleLFO = lfo;
    } catch { /* ignore */ }
  }

  stopGurgle(): void {
    if (!this.c || !this.gurgleGain || !this.gurgleOsc) return;
    try {
      const t = this.c.currentTime;
      this.gurgleGain.gain.linearRampToValueAtTime(0, t + 0.3);
      this.gurgleOsc.stop(t + 0.3);
      this.gurgleLFO?.stop(t + 0.3);
      this.gurgleOsc = null;
      this.gurgleGain = null;
      this.gurgleLFO = null;
    } catch { /* ignore */ }
  }

  // ── Trigger a named SFX ───────────────────────────────────────────────────

  play(name: SoundName): void {
    this.init();
    if (!this.c || !this.dest) return;
    try {
      switch (name) {
        case 'task_complete':      this._taskComplete(); break;
        case 'meeting_horn':       this._meetingHorn(); break;
        case 'vote_cast':          this._voteCast(); break;
        case 'vote_skip':          this._voteSkip(); break;
        case 'ejection':           this._ejection(); break;
        case 'body_found':         this._bodyFound(); break;
        case 'ambush':             this._ambush(); break;
        case 'siphon_complete':    this._siphonComplete(); break;
        case 'canister_drop':      this._canisterDrop(); break;
        case 'canister_pickup':    this._canisterPickup(); break;
        case 'win_owners':         this._winOwners(); break;
        case 'win_slivshchiki':    this._winSlivshchiki(); break;
        case 'ui_click':           this._uiClick(); break;
        case 'ui_hover':           this._uiHover(); break;
        case 'alarm_button':       this._alarmButton(); break;
        case 'pipe_burst_sfx':     this._pipeBurst(); break;
        case 'chat_offline_sfx':   this._chatOffline(); break;
        case 'alarm_chaos_sfx':    this._alarmChaos(); break;
        case 'babushka_cerberus_sfx': this._babushkaCerberus(); break;
        case 'fuel_lock':          this._fuelLock(); break;
        case 'shawarma_buy':       this._shawarmaBuy(); break;
        case 'player_death':       this._playerDeath(); break;
        case 'bot_death':          this._botDeath(); break;
        case 'footstep_asphalt':   this._footstepAsphalt(); break;
        case 'footstep_grass':     this._footstepGrass(); break;
        case 'car_door':           this._carDoor(); break;
        case 'engine_start':       this._engineStart(); break;
        case 'tesla_zap':          this._teslaZap(); break;
        case 'grandma_escort':     this._grandmaEscort(); break;
      }
    } catch { /* ignore synthesis errors */ }
  }

  // ── Synthesized SFX ───────────────────────────────────────────────────────

  private _taskComplete(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.25, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.22);
      osc.start(t + i * 0.09); osc.stop(t + i * 0.09 + 0.25);
    });
  }

  private _meetingHorn(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const freqs = [130, 160, 110];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      const start = t + i * 0.4;
      g.gain.setValueAtTime(0.35, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
      osc.start(start); osc.stop(start + 0.4);
    });
  }

  private _alarmButton(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'square'; osc.frequency.value = i % 2 === 0 ? 880 : 660;
      g.gain.setValueAtTime(0.15, t + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.13);
      osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.15);
    }
  }

  private _voteCast(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.value = 440;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t); osc.stop(t + 0.15);
  }

  /** §8.2 vote_skip — soft paper-slide: descending sine 250→100Hz */
  private _voteSkip(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.18);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.22);
  }

  private _ejection(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [494, 440, 392, 349].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      const start = t + i * 0.28;
      g.gain.setValueAtTime(0.3, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.start(start); osc.stop(start + 0.32);
    });
  }

  private _bodyFound(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [147, 175, 185].forEach(freq => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(t); osc.stop(t + 0.85);
    });
  }

  private _ambush(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.25);
    const bufSize = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    noise.buffer = buf;
    noise.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.start(t); noise.stop(t + 0.15);
  }

  private _siphonComplete(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [400, 500, 650, 800].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.2, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
      osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.18);
    });
  }

  private _canisterDrop(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.18);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.22);
  }

  private _winOwners(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.3, t + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.35);
      osc.start(t + i * 0.18); osc.stop(t + i * 0.18 + 0.4);
    });
  }

  private _winSlivshchiki(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [220, 261, 311].forEach(freq => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.start(t); osc.stop(t + 1.25);
    });
  }

  private _uiClick(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.value = 600;
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.start(t); osc.stop(t + 0.08);
  }

  /** §8.2 ui_hover — featherweight ping */
  private _uiHover(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.value = 880;
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.start(t); osc.stop(t + 0.05);
  }

  private _canisterPickup(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [500, 700, 900].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.18, t + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.18);
      osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.2);
    });
  }

  private _pipeBurst(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * 0.8);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
    noise.buffer = buf;
    noise.connect(filter); filter.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(0.0, t);
    ng.gain.linearRampToValueAtTime(0.4, t + 0.1);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    noise.start(t); noise.stop(t + 0.85);
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.connect(og); og.connect(dest);
    osc.type = 'sine'; osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    og.gain.setValueAtTime(0.35, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.4);
  }

  private _chatOffline(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.linearRampToValueAtTime(200, t + 0.4);
    g.gain.setValueAtTime(0.12, t);
    g.gain.setValueAtTime(0.12, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t); osc.stop(t + 0.55);
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(dest);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(600, t + 0.2);
    osc2.frequency.linearRampToValueAtTime(1800, t + 0.4);
    g2.gain.setValueAtTime(0.08, t + 0.2);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc2.start(t + 0.2); osc2.stop(t + 0.55);
  }

  private _alarmChaos(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const patterns = [
      [880, 660], [1046, 784], [740, 587], [988, 740],
    ];
    patterns.forEach(([hi, lo], car) => {
      const offset = car * 0.08;
      [hi, lo, hi].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(dest);
        osc.type = 'square'; osc.frequency.value = freq;
        const s = t + offset + i * 0.12;
        g.gain.setValueAtTime(0.07, s);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.1);
        osc.start(s); osc.stop(s + 0.12);
      });
    });
  }

  private _babushkaCerberus(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [440, 550, 660, 550].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      const s = t + i * 0.18;
      g.gain.setValueAtTime(0.22, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.15);
      osc.start(s); osc.stop(s + 0.18);
    });
  }

  /** §8.2 fuel_lock — metallic click + brief shield hum */
  private _fuelLock(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    // High metallic click
    const click = ctx.createOscillator();
    const cg = ctx.createGain();
    click.connect(cg); cg.connect(dest);
    click.type = 'sine'; click.frequency.setValueAtTime(2400, t);
    click.frequency.exponentialRampToValueAtTime(600, t + 0.05);
    cg.gain.setValueAtTime(0.3, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    click.start(t); click.stop(t + 0.07);
    // Shield hum
    const hum = ctx.createOscillator();
    const hg = ctx.createGain();
    hum.connect(hg); hg.connect(dest);
    hum.type = 'sine'; hum.frequency.value = 880;
    hg.gain.setValueAtTime(0.0, t + 0.05);
    hg.gain.linearRampToValueAtTime(0.15, t + 0.15);
    hg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    hum.start(t + 0.05); hum.stop(t + 0.65);
  }

  /** §8.2 shawarma_buy — sizzle + two ascending dings */
  private _shawarmaBuy(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    // Sizzle (filtered noise)
    const bufSize = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.4;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(0.15, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    noise.start(t); noise.stop(t + 0.28);
    // Two happy dings
    [784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.2, t + 0.12 + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + i * 0.1 + 0.25);
      osc.start(t + 0.12 + i * 0.1); osc.stop(t + 0.12 + i * 0.1 + 0.3);
    });
  }

  /** §8.2 player_death — dramatic descending chord hit */
  private _playerDeath(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    // Low impact boom
    const boom = ctx.createOscillator();
    const bg = ctx.createGain();
    boom.connect(bg); bg.connect(dest);
    boom.type = 'sine'; boom.frequency.setValueAtTime(200, t);
    boom.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    bg.gain.setValueAtTime(0.45, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    boom.start(t); boom.stop(t + 0.55);
    // Descending chord (A minor)
    [440, 349, 262, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      const s = t + i * 0.12;
      g.gain.setValueAtTime(0.22, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.4);
      osc.start(s); osc.stop(s + 0.45);
    });
  }

  /** §8.2 bot_death — compressed sad descending beep */
  private _botDeath(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [330, 262, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'square'; osc.frequency.value = freq;
      const s = t + i * 0.1;
      g.gain.setValueAtTime(0.12, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
      osc.start(s); osc.stop(s + 0.14);
    });
  }

  /** §8.2 footstep_asphalt — dry click transient */
  private _footstepAsphalt(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * 0.018);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.5;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.value = 0.09;
    noise.start(t); noise.stop(t + 0.02);
  }

  /** §8.2 footstep_grass — muffled soft thud */
  private _footstepGrass(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 600;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.value = 0.07;
    noise.start(t); noise.stop(t + 0.035);
  }

  /** §8.2 car_door — bass thud with metallic high click */
  private _carDoor(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    // Bass thud
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sine'; osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.18);
    // Metallic click
    const bufSize = Math.floor(ctx.sampleRate * 0.02);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 4000;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(0.18, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    noise.start(t); noise.stop(t + 0.04);
  }

  /** §8.2 engine_start — rising filtered noise (starter motor) */
  private _engineStart(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(80, t); f.Q.value = 2;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(0.0, t);
    ng.gain.linearRampToValueAtTime(0.3, t + 0.1);
    ng.gain.setValueAtTime(0.3, t + 0.3);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    f.frequency.linearRampToValueAtTime(300, t + 0.5);
    noise.start(t); noise.stop(t + 0.55);
  }

  /** §8.2 tesla_zap — electric discharge: high descending freq + noise burst */
  private _teslaZap(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'square';
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t); osc.stop(t + 0.25);
    // Noise burst
    const bufSize = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    const ng = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2000;
    noise.buffer = buf;
    noise.connect(f); f.connect(ng); ng.connect(dest);
    ng.gain.setValueAtTime(0.15, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    noise.start(t); noise.stop(t + 0.1);
  }

  /** §8.2 grandma_escort — three ascending confirmation dings */
  private _grandmaEscort(): void {
    const ctx = this.c!; const dest = this.dest!;
    const t = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.type = 'sine'; osc.frequency.value = freq;
      const s = t + i * 0.12;
      g.gain.setValueAtTime(0.18, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.2);
      osc.start(s); osc.stop(s + 0.22);
    });
  }
}

export type SoundName =
  | 'task_complete' | 'meeting_horn' | 'vote_cast' | 'vote_skip' | 'ejection'
  | 'body_found' | 'ambush' | 'siphon_complete' | 'canister_drop'
  | 'canister_pickup' | 'win_owners' | 'win_slivshchiki' | 'ui_click' | 'ui_hover'
  | 'alarm_button' | 'pipe_burst_sfx' | 'chat_offline_sfx'
  | 'alarm_chaos_sfx' | 'babushka_cerberus_sfx'
  | 'fuel_lock' | 'shawarma_buy' | 'player_death' | 'bot_death'
  | 'footstep_asphalt' | 'footstep_grass'
  | 'car_door' | 'engine_start' | 'tesla_zap' | 'grandma_escort';

export const audio = new AudioManager();
