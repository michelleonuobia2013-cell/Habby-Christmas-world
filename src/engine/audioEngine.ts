import type { ProximityAudioState } from '../game/ambientAudio';
import type { HorrorStingKind } from '../game/environmentalHorrorDirector';

export class HabbyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.75;
  private muted = false;
  private ambienceRunning = false;
  private musicBoxTimer: number | null = null;
  private windNode: AudioBufferSourceNode | null = null;
  private warningOsc: OscillatorNode | null = null;
  private warningGain: GainNode | null = null;
  private noteIndex = 0;
  private lastBinauralCueAt = 0;
  private binauralStep = 0;
  private lastHeartbeatAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.04);
    }
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.04);
    }
  }

  public startAmbience() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.ambienceRunning) return;
    this.ambienceRunning = true;

    // Low winter wind noise bed
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 1.8;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.09;

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.masterGain);
    noise.start();
    this.windNode = noise;

    // Distorted Christmas music-box notes every ~1.4s
    const notes = [523.25, 493.88, 523.25, 440.0, 392.0, 349.23, 329.63, 293.66];
    this.musicBoxTimer = window.setInterval(() => {
      if (!this.ambienceRunning || this.muted || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const freq = notes[this.noteIndex % notes.length];
      this.noteIndex++;
      // Subtle detune for eerie haunted music box
      const detuneFactor = this.noteIndex % 5 === 0 ? 0.94 : 1.0;

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * detuneFactor, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.028, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 1.1);

      const pan = this.ctx.createStereoPanner();
      pan.pan.value = Math.sin(this.noteIndex * 0.7) * 0.45;

      osc.connect(g);
      g.connect(pan);
      pan.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.15);
    }, 1550);
  }

  public stopAmbience() {
    this.ambienceRunning = false;
    if (this.musicBoxTimer !== null) {
      clearInterval(this.musicBoxTimer);
      this.musicBoxTimer = null;
    }
    if (this.windNode) {
      try {
        this.windNode.stop();
      } catch {
        // ignore
      }
      this.windNode = null;
    }
    this.updateGazeWarningHum(0);
  }

  /**
   * Dynamic Binaural Haunting Sound Manager:
   * Triggers spatialized left/right ear binaural cues when near secret clues or hiding spots.
   */
  public updateProximityHaunting(cue: ProximityAudioState, nowSec: number) {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || this.muted || !cue.active || cue.intensity < 0.08) return;

    const cooldown = Math.max(0.85, 2.35 - cue.intensity * 1.35);
    if (nowSec - this.lastBinauralCueAt < cooldown) return;
    this.lastBinauralCueAt = nowSec;
    this.binauralStep++;

    const t0 = ctx.currentTime;
    const baseGain = Math.min(0.075, 0.015 + cue.intensity * 0.055);
    const leftPan = Math.max(-1, Math.min(1, cue.pan - 0.14));
    const rightPan = Math.max(-1, Math.min(1, cue.pan + 0.14));

    if (cue.kind === 'clue') {
      // Eerie binaural music-box harmonic + shimmer split across ears (7 Hz binaural beat)
      const clueScale = [587.33, 622.25, 698.46, 523.25];
      const f = clueScale[this.binauralStep % clueScale.length];

      [
        { freq: f, panVal: leftPan },
        { freq: f + 6.5, panVal: rightPan },
      ].forEach(({ freq, panVal }) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t0 + 0.9);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0005, t0);
        g.gain.exponentialRampToValueAtTime(baseGain * 0.65, t0 + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.95);

        const panner = ctx.createStereoPanner();
        panner.pan.value = panVal;

        osc.connect(g);
        g.connect(panner);
        panner.connect(this.masterGain!);
        osc.start(t0);
        osc.stop(t0 + 0.98);
      });
    } else if (cue.kind === 'hiding_spot') {
      // Hollow wood creak + low whispered hush panning toward the hiding wardrobe/bed/sofa
      [
        { freq: 142, panVal: leftPan },
        { freq: 148, panVal: rightPan },
      ].forEach(({ freq, panVal }) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(84, t0 + 0.65);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 380;
        filter.Q.value = 2.4;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0005, t0);
        g.gain.linearRampToValueAtTime(baseGain * 0.85, t0 + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.72);

        const panner = ctx.createStereoPanner();
        panner.pan.value = panVal;

        osc.connect(filter);
        filter.connect(g);
        g.connect(panner);
        panner.connect(this.masterGain!);
        osc.start(t0);
        osc.stop(t0 + 0.75);
      });
    }
  }

  public playDoorCreak(open: boolean, pan = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(open ? 128 : 175, now);
    osc.frequency.linearRampToValueAtTime(open ? 185 : 96, now + 0.32);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = 4.0;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);

    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    osc.connect(filter);
    filter.connect(g);
    g.connect(panner);
    panner.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Keeps the Web Audio 3D AudioListener aligned with the Nanny's active camera
   * so environmental horror stings spatialize accurately in 3D space.
   */
  public setListenerTransform(
    pos: { x: number; y: number; z: number },
    forward: { x: number; y: number; z: number },
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const listener = ctx.listener;
    const now = ctx.currentTime;
    try {
      if ('positionX' in listener && listener.positionX) {
        listener.positionX.setValueAtTime(pos.x, now);
        listener.positionY.setValueAtTime(pos.y, now);
        listener.positionZ.setValueAtTime(pos.z, now);
        listener.forwardX.setValueAtTime(forward.x, now);
        listener.forwardY.setValueAtTime(forward.y, now);
        listener.forwardZ.setValueAtTime(forward.z, now);
        listener.upX.setValueAtTime(0, now);
        listener.upY.setValueAtTime(1, now);
        listener.upZ.setValueAtTime(0, now);
      } else if (typeof listener.setPosition === 'function') {
        listener.setPosition(pos.x, pos.y, pos.z);
        listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
      }
    } catch {
      // Ignore unsupported AudioListener updates in restricted browsers
    }
  }

  private create3DPanner(
    ctx: AudioContext,
    sourcePos: { x: number; y: number; z: number },
  ): PannerNode {
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2.0;
    panner.maxDistance = 28;
    panner.rolloffFactor = 1.2;
    const now = ctx.currentTime;
    if ('positionX' in panner && panner.positionX) {
      panner.positionX.setValueAtTime(sourcePos.x, now);
      panner.positionY.setValueAtTime(sourcePos.y, now);
      panner.positionZ.setValueAtTime(sourcePos.z, now);
    } else if (typeof panner.setPosition === 'function') {
      panner.setPosition(sourcePos.x, sourcePos.y, sourcePos.z);
    }
    return panner;
  }

  /**
   * Procedural 3D Horror Sting triggered by the EnvironmentalHorrorDirector when
   * the Nanny lingers near a clue for too long or Fear Level surges.
   */
  public playHorrorSting3D(params: {
    kind: HorrorStingKind;
    sourcePos: { x: number; y: number; z: number };
    pan: number;
    fearLevel: number;
  }) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;

    const now = ctx.currentTime;
    const intensity = Math.max(0.45, Math.min(1.0, 0.5 + params.fearLevel / 180));

    // Route through true 3D HRTF PannerNode blended with StereoPanner safety
    const panner3d = this.create3DPanner(ctx, params.sourcePos);
    const stereoSafety = ctx.createStereoPanner();
    stereoSafety.pan.value = Math.max(-1, Math.min(1, params.pan));
    panner3d.connect(stereoSafety);
    stereoSafety.connect(this.masterGain);

    if (params.kind === 'door_slam') {
      // Heavy oak door creak-to-slam transient + filtered wood impact burst
      const creak = ctx.createOscillator();
      creak.type = 'sawtooth';
      creak.frequency.setValueAtTime(195, now);
      creak.frequency.exponentialRampToValueAtTime(68, now + 0.14);
      const creakFilter = ctx.createBiquadFilter();
      creakFilter.type = 'bandpass';
      creakFilter.frequency.value = 460;
      creakFilter.Q.value = 3.2;
      const creakGain = ctx.createGain();
      creakGain.gain.setValueAtTime(0.08 * intensity, now);
      creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      creak.connect(creakFilter);
      creakFilter.connect(creakGain);
      creakGain.connect(panner3d);
      creak.start(now);
      creak.stop(now + 0.18);

      // Deep sub-bass door frame thud at +0.11s
      const thudTime = now + 0.11;
      const thud = ctx.createOscillator();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(112, thudTime);
      thud.frequency.exponentialRampToValueAtTime(31, thudTime + 0.28);
      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.32 * intensity, thudTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.32);
      thud.connect(thudGain);
      thudGain.connect(panner3d);
      thud.start(thudTime);
      thud.stop(thudTime + 0.34);

      // Wood clap noise burst
      const clapLen = Math.floor(ctx.sampleRate * 0.22);
      const clapBuf = ctx.createBuffer(1, clapLen, ctx.sampleRate);
      const clapData = clapBuf.getChannelData(0);
      for (let i = 0; i < clapLen; i++) {
        clapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.045));
      }
      const clap = ctx.createBufferSource();
      clap.buffer = clapBuf;
      const clapFilter = ctx.createBiquadFilter();
      clapFilter.type = 'lowpass';
      clapFilter.frequency.value = 920;
      const clapGain = ctx.createGain();
      clapGain.gain.value = 0.26 * intensity;
      clap.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(panner3d);
      clap.start(thudTime);
    } else if (params.kind === 'light_flicker' || params.kind === 'electrical_surge') {
      // Stuttering tungsten relay clicks + 60Hz electrical buzz + dissonant chime
      const clickOffsets = params.kind === 'light_flicker' ? [0, 0.16, 0.38, 0.62] : [0, 0.12, 0.34];
      clickOffsets.forEach((offset, idx) => {
        const t = now + offset;
        const clickOsc = ctx.createOscillator();
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(idx % 2 === 0 ? 1280 : 860, t);
        clickOsc.frequency.exponentialRampToValueAtTime(180, t + 0.045);
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.09 * intensity, t);
        cg.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
        clickOsc.connect(cg);
        cg.connect(panner3d);
        clickOsc.start(t);
        clickOsc.stop(t + 0.07);
      });

      const buzz = ctx.createOscillator();
      buzz.type = 'sawtooth';
      buzz.frequency.setValueAtTime(params.kind === 'electrical_surge' ? 120 : 60, now);
      buzz.frequency.linearRampToValueAtTime(48, now + 0.95);
      const buzzFilter = ctx.createBiquadFilter();
      buzzFilter.type = 'bandpass';
      buzzFilter.frequency.value = 420;
      buzzFilter.Q.value = 2.0;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.001, now);
      bg.gain.linearRampToValueAtTime(0.11 * intensity, now + 0.05);
      bg.gain.exponentialRampToValueAtTime(0.0008, now + 1.0);
      buzz.connect(buzzFilter);
      buzzFilter.connect(bg);
      bg.connect(panner3d);
      buzz.start(now);
      buzz.stop(now + 1.05);

      // Haunting minor-second music-box bell shimmer
      [622.25, 659.25].forEach((freq) => {
        const bell = ctx.createOscillator();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(freq, now + 0.06);
        const bellGain = ctx.createGain();
        bellGain.gain.setValueAtTime(0.045 * intensity, now + 0.06);
        bellGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.9);
        bell.connect(bellGain);
        bellGain.connect(panner3d);
        bell.start(now + 0.06);
        bell.stop(now + 0.95);
      });
    } else {
      // 'shadow_whisper': Breathy 3D spatialized hiss + eerie low harmonic behind shoulder
      const whisperLen = Math.floor(ctx.sampleRate * 0.85);
      const whisperBuf = ctx.createBuffer(1, whisperLen, ctx.sampleRate);
      const data = whisperBuf.getChannelData(0);
      for (let i = 0; i < whisperLen; i++) {
        const env = Math.sin((i / whisperLen) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = whisperBuf;
      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(1450, now);
      formant.frequency.linearRampToValueAtTime(720, now + 0.8);
      formant.Q.value = 4.2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.14 * intensity, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.84);
      noiseSrc.connect(formant);
      formant.connect(ng);
      ng.connect(panner3d);
      noiseSrc.start(now);

      const drone = ctx.createOscillator();
      drone.type = 'triangle';
      drone.frequency.setValueAtTime(185, now);
      drone.frequency.exponentialRampToValueAtTime(116.5, now + 0.8);
      const dg = ctx.createGain();
      dg.gain.setValueAtTime(0.06 * intensity, now);
      dg.gain.exponentialRampToValueAtTime(0.0008, now + 0.82);
      drone.connect(dg);
      dg.connect(panner3d);
      drone.start(now);
      drone.stop(now + 0.85);
    }
  }

  public updateFearHeartbeat(fearLevel: number, nowSec: number) {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || this.muted || fearLevel < 45) return;
    const norm = Math.max(0, Math.min(1, (fearLevel - 45) / 55));
    const interval = 1.25 - norm * 0.62; // 48 bpm -> ~95 bpm
    if (nowSec - this.lastHeartbeatAt < interval) return;
    this.lastHeartbeatAt = nowSec;

    const t0 = ctx.currentTime;
    const beatGain = 0.035 + norm * 0.085;
    [0, 0.18].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 58 : 48, t0 + offset);
      osc.frequency.exponentialRampToValueAtTime(28, t0 + offset + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t0 + offset);
      g.gain.linearRampToValueAtTime(beatGain * (idx === 0 ? 1 : 0.72), t0 + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + offset + 0.14);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.16);
    });
  }

  public playFootstep(isSnow: boolean, pan = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = isSnow ? 'sine' : 'triangle';
    const baseFreq = isSnow ? 150 + Math.random() * 40 : 88 + Math.random() * 22;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    osc.connect(g);
    g.connect(panner);
    panner.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPositionalEvent(kind: 'knock' | 'bells' | 'whisper' | 'interact', pan = 0, distanceScale = 1) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const gainScale = Math.max(0.15, Math.min(1, distanceScale));
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    panner.connect(this.masterGain);

    if (kind === 'knock') {
      [0, 0.18, 0.36].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(115, now + offset);
        osc.frequency.exponentialRampToValueAtTime(42, now + offset + 0.09);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.16 * gainScale, now + offset);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);
        osc.connect(g);
        g.connect(panner);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } else if (kind === 'bells') {
      [1318.5, 1567.9, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.04 * gainScale, now + idx * 0.09);
        g.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.09 + 0.5);
        osc.connect(g);
        g.connect(panner);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.55);
      });
    } else if (kind === 'interact') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(g);
      g.connect(panner);
      osc.start(now);
      osc.stop(now + 0.24);
    } else {
      // Eerie whisper sweep
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.6);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 950;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.03 * gainScale, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
      osc.connect(filter);
      filter.connect(g);
      g.connect(panner);
      osc.start(now);
      osc.stop(now + 0.7);
    }
  }

  public updateGazeWarningHum(progress: number) {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || this.muted || progress <= 0.05) {
      if (this.warningGain && ctx) {
        this.warningGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      }
      return;
    }

    if (!this.warningOsc || !this.warningGain) {
      this.warningOsc = ctx.createOscillator();
      this.warningOsc.type = 'sawtooth';
      this.warningOsc.frequency.value = 65;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;

      this.warningGain = ctx.createGain();
      this.warningGain.gain.value = 0.0001;

      this.warningOsc.connect(filter);
      filter.connect(this.warningGain);
      this.warningGain.connect(this.masterGain);
      this.warningOsc.start();
    }

    const now = ctx.currentTime;
    this.warningOsc.frequency.setTargetAtTime(65 + progress * 140, now, 0.05);
    this.warningGain.gain.setTargetAtTime(Math.min(0.18, progress * 0.2), now, 0.05);
  }

  /**
   * THE DEVIL'S GAZE Game-Over Audio Sequence:
   * 1) Brief background cutout (0.15s)
   * 2) Sudden low crimson horror sting
   * 3) Original hysterical, unsettling creepy laughter burst
   */
  public playDevilsGazeLoseSequence() {
    this.stopAmbience();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;

    // Brief audio cutout before sting at +0.16s
    const stingStart = now + 0.16;

    // Sub-bass horror sting
    const sub = ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(110, stingStart);
    sub.frequency.exponentialRampToValueAtTime(34, stingStart + 0.75);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, stingStart);
    subGain.gain.linearRampToValueAtTime(0.32, stingStart + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.001, stingStart + 0.85);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(stingStart);
    sub.stop(stingStart + 0.9);

    // Dissonant metallic screech accent
    [587.3, 622.25, 830.6].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, stingStart);
      osc.frequency.linearRampToValueAtTime(freq * 0.75, stingStart + 0.45);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, stingStart);
      g.gain.exponentialRampToValueAtTime(0.001, stingStart + 0.48);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(stingStart);
      osc.stop(stingStart + 0.5);
    });

    // Hysterical, unsettling creepy laughter (staccato formant syllables rising & falling)
    const laughStart = stingStart + 0.35;
    const syllables = [
      { t: 0.0, f: 420, d: 0.11 },
      { t: 0.14, f: 495, d: 0.1 },
      { t: 0.27, f: 560, d: 0.1 },
      { t: 0.40, f: 615, d: 0.11 },
      { t: 0.54, f: 540, d: 0.11 },
      { t: 0.68, f: 465, d: 0.12 },
      { t: 0.83, f: 390, d: 0.14 },
      { t: 1.01, f: 510, d: 0.1 },
      { t: 1.14, f: 585, d: 0.12 },
      { t: 1.30, f: 350, d: 0.26 },
    ];

    syllables.forEach((syl, idx) => {
      const t0 = laughStart + syl.t;
      const carrier = ctx.createOscillator();
      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(syl.f, t0);
      carrier.frequency.exponentialRampToValueAtTime(syl.f * 0.72, t0 + syl.d);

      // Vibrato wobble for eerie manic quality
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 18 + (idx % 3) * 4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 28;
      lfo.connect(lfoGain);
      lfoGain.connect(carrier.frequency);

      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(920 + (idx % 4) * 140, t0);
      formant.Q.value = 3.2;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + syl.d);

      carrier.connect(formant);
      formant.connect(g);
      g.connect(this.masterGain!);

      lfo.start(t0);
      carrier.start(t0);
      lfo.stop(t0 + syl.d + 0.02);
      carrier.stop(t0 + syl.d + 0.02);
    });
  }
}
