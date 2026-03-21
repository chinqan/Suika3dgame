/**
 * AudioManager — GDD Ch.7 §7.1–7.4
 * Multi-layer procedural synthesis per sound pack
 * Ported from 2D version with full level-dependent sound design
 */

export type SoundPack = 'standard' | 'crystal' | 'waterdrop' | 'bomb' | 'stone' | 'cosmic' | 'fighting' | 'shooting';
type SoundType = 'drop' | 'merge' | 'combo' | 'gameover' | 'select' | 'hover' | 'bump' | 'thud';

type MergeHandler = (level: number) => void;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private readonly noiseBufCache = new Map<string, AudioBuffer>();
  private currentPack: SoundPack = 'stone';
  private enabled = true;

  private readonly mergeHandlers: Record<SoundPack, MergeHandler> = {
    standard: (l) => this.playStandard(l),
    crystal:  (l) => this.playCrystal(l),
    waterdrop:(l) => this.playWaterDrop(l),
    bomb:     (l) => this.playBomb(l),
    stone:    (l) => this.playStone(l),
    cosmic:   (l) => this.playCosmic(l),
    fighting: (l) => this.playFighting(l),
    shooting: (l) => this.playShooting(l),
  };

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private getNoiseBuffer(key: string, numFrames: number, fillFn: (data: Float32Array, n: number) => void): AudioBuffer {
    if (this.noiseBufCache.has(key)) return this.noiseBufCache.get(key)!;
    const ctx = this.ensure();
    const buf = ctx.createBuffer(1, numFrames, ctx.sampleRate);
    fillFn(buf.getChannelData(0), numFrames);
    this.noiseBufCache.set(key, buf);
    return buf;
  }

  private setOnEnded(src: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
    src.onended = () => {
      nodes.forEach(n => { try { n.disconnect(); } catch (_) { /* noop */ } });
    };
  }

  private autoDisconnect(node: AudioNode, duration: number): void {
    setTimeout(() => { try { node.disconnect(); } catch (_) { /* noop */ } }, (duration + 0.15) * 1000);
  }

  // ─── Public API ─────────────────────────────

  setPack(pack: SoundPack): void { this.currentPack = pack; }
  getPack(): SoundPack { return this.currentPack; }
  setEnabled(v: boolean): void { this.enabled = v; }

  play(type: SoundType, level = 0, intensity = 1.0): void {
    if (!this.enabled) return;
    switch (type) {
      case 'drop': this.playDropSound(); break;
      case 'merge': (this.mergeHandlers[this.currentPack] || this.mergeHandlers.standard)(level); break;
      case 'combo': this.playComboSound(level); break;
      case 'gameover': this.playGameOver(); break;
      case 'select': this.playUI(600, 900, 0.1); break;
      case 'hover': this.playUI(800, 800, 0.03, 0.06); break;
      case 'bump': this.playBump(intensity); break;
      case 'thud': this.playThud(intensity); break;
    }
  }

  /** Preview a specific sound type with a given pack */
  preview(type: 'drop' | 'merge' | 'combo', pack: SoundPack): void {
    if (type === 'drop') { this.playDropSound(); return; }
    if (type === 'combo') { this.playComboSound(3); return; }
    // merge preview: play at level 3 with specified pack
    (this.mergeHandlers[pack] || this.mergeHandlers.standard)(3);
  }

  // ─── Drop ──────────────────────────────────

  private playDropSound(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const dur = 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + dur);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + dur);
    this.setOnEnded(osc, osc, gain);
  }

  // ─── Combo ─────────────────────────────────

  private playComboSound(comboLevel: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const baseFreq = 600 + comboLevel * 100;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const st = t + i * 0.06;
      osc.frequency.setValueAtTime(baseFreq + i * 200, st);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + i * 400, st + 0.15);
      gain.gain.setValueAtTime(0.08, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(st); osc.stop(st + 0.2);
      this.setOnEnded(osc, osc, gain);
    }
  }

  // ─── Game Over ─────────────────────────────

  private playGameOver(): void {
    const ctx = this.ensure();
    [400, 300, 200, 100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const st = ctx.currentTime + i * 0.15;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.1, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(st); osc.stop(st + 0.3);
      this.setOnEnded(osc, osc, gain);
    });
  }

  // ─── UI ────────────────────────────────────

  private playUI(f1: number, f2: number, vol: number, dur = 0.15): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f1, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
    this.setOnEnded(osc, osc, gain);
  }

  // ─── Standard ──────────────────────────────

  private playStandard(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.7 + level * 0.1;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-20, t); comp.knee.setValueAtTime(10, t);
    comp.ratio.setValueAtTime(12, t); comp.attack.setValueAtTime(0, t);
    comp.release.setValueAtTime(0.1, t); comp.connect(ctx.destination);

    const noiseDur = 0.3 + level * 0.03;
    const bufSz = Math.floor(ctx.sampleRate * noiseDur);
    const nBuf = this.getNoiseBuffer(`std_noise_${level}`, bufSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    });
    const nSrc = ctx.createBufferSource(); nSrc.buffer = nBuf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.5 * intensity, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDur);
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(3000 + level * 400, t);
    lpf.frequency.exponentialRampToValueAtTime(300, t + noiseDur);
    nSrc.connect(lpf).connect(nGain).connect(comp); nSrc.start(t); nSrc.stop(t + noiseDur);
    this.setOnEnded(nSrc, nSrc, lpf, nGain);

    const subO = ctx.createOscillator(); const subG = ctx.createGain();
    subO.type = 'sine'; subO.frequency.setValueAtTime(100, t);
    subO.frequency.exponentialRampToValueAtTime(20, t + 0.3);
    subG.gain.setValueAtTime(0.6 * intensity, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    subO.connect(subG).connect(comp); subO.start(t); subO.stop(t + 0.35);
    this.setOnEnded(subO, subO, subG);

    const mFreq = 800 + level * 150;
    const mO = ctx.createOscillator(); const mG = ctx.createGain();
    mO.type = 'square'; mO.frequency.setValueAtTime(mFreq, t);
    mO.frequency.exponentialRampToValueAtTime(mFreq * 0.3, t + 0.08);
    mG.gain.setValueAtTime(0.2 * intensity, t);
    mG.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 600;
    mO.connect(hpf).connect(mG).connect(comp); mO.start(t); mO.stop(t + 0.1);
    this.setOnEnded(mO, mO, hpf, mG);

    const rFreq = 300 + level * 80;
    const rO = ctx.createOscillator(); const rG = ctx.createGain();
    rO.type = 'sine'; rO.frequency.setValueAtTime(rFreq, t + 0.05);
    rO.frequency.exponentialRampToValueAtTime(rFreq * 3, t + 0.4);
    rG.gain.setValueAtTime(0.001, t);
    rG.gain.linearRampToValueAtTime(0.15 * intensity, t + 0.08);
    rG.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    rO.connect(rG).connect(comp); rO.start(t); rO.stop(t + 0.45);
    this.setOnEnded(rO, rO, rG, comp);
  }

  // ─── Crystal ───────────────────────────────

  private playCrystal(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.6 + level * 0.08;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-12, t); comp.knee.setValueAtTime(4, t);
    comp.ratio.setValueAtTime(6, t); comp.attack.setValueAtTime(0.001, t);
    comp.release.setValueAtTime(0.15, t); comp.connect(ctx.destination);

    const clickDur = 0.012;
    const clickSz = Math.floor(ctx.sampleRate * clickDur);
    const clickBuf = this.getNoiseBuffer(`cry_click_${level}`, clickSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 8);
    });
    const clickSrc = ctx.createBufferSource(); clickSrc.buffer = clickBuf;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.7 * intensity, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + clickDur);
    const clickHPF = ctx.createBiquadFilter(); clickHPF.type = 'highpass';
    clickHPF.frequency.setValueAtTime(2000, t); clickHPF.Q.setValueAtTime(1.5, t);
    clickSrc.connect(clickHPF).connect(clickGain).connect(comp);
    clickSrc.start(t); clickSrc.stop(t + clickDur);
    this.setOnEnded(clickSrc, clickSrc, clickHPF, clickGain);

    const pingFreq = 3200 - level * 180; const pingDur = 0.15 + level * 0.025;
    const pingO = ctx.createOscillator(); const pingG = ctx.createGain();
    pingO.type = 'sine'; pingO.frequency.setValueAtTime(pingFreq, t);
    pingO.frequency.exponentialRampToValueAtTime(pingFreq * 0.7, t + pingDur);
    pingG.gain.setValueAtTime(0.35 * intensity, t);
    pingG.gain.setValueAtTime(0.35 * intensity, t + 0.003);
    pingG.gain.exponentialRampToValueAtTime(0.001, t + pingDur);
    const pingBPF = ctx.createBiquadFilter(); pingBPF.type = 'bandpass';
    pingBPF.frequency.setValueAtTime(pingFreq, t); pingBPF.Q.setValueAtTime(3, t);
    pingO.connect(pingBPF).connect(pingG).connect(comp); pingO.start(t); pingO.stop(t + pingDur);
    this.setOnEnded(pingO, pingO, pingBPF, pingG);

    const resDur = 0.25 + level * 0.04; const resBase = 1800 - level * 100; const detune = 12 + level * 3;
    for (let d = 0; d < 2; d++) {
      const resO = ctx.createOscillator(); const resG = ctx.createGain();
      resO.type = 'triangle';
      resO.frequency.setValueAtTime(resBase + (d === 0 ? detune : -detune), t);
      resG.gain.setValueAtTime(0.12 * intensity, t + 0.002);
      resG.gain.exponentialRampToValueAtTime(0.001, t + resDur);
      resO.connect(resG).connect(comp); resO.start(t); resO.stop(t + resDur);
      this.setOnEnded(resO, resO, resG);
    }

    const shimFreq = 5000 + level * 300; const shimDur = 0.4 + level * 0.05;
    const shimO = ctx.createOscillator(); const shimG = ctx.createGain();
    shimO.type = 'sine'; shimO.frequency.setValueAtTime(shimFreq, t + 0.01);
    shimO.frequency.exponentialRampToValueAtTime(shimFreq * 0.5, t + shimDur);
    shimG.gain.setValueAtTime(0.001, t);
    shimG.gain.linearRampToValueAtTime(0.06 * intensity, t + 0.02);
    shimG.gain.exponentialRampToValueAtTime(0.001, t + shimDur);
    shimO.connect(shimG).connect(comp); shimO.start(t); shimO.stop(t + shimDur);

    const thudO = ctx.createOscillator(); const thudG = ctx.createGain();
    thudO.type = 'sine'; thudO.frequency.setValueAtTime(180 + level * 15, t);
    thudO.frequency.exponentialRampToValueAtTime(60, t + 0.06);
    thudG.gain.setValueAtTime(0.15 * intensity, t);
    thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    thudO.connect(thudG).connect(comp); thudO.start(t); thudO.stop(t + 0.08);
    this.setOnEnded(thudO, thudO, thudG);
    this.setOnEnded(shimO, shimO, shimG, comp);
  }

  // ─── Water Drop ────────────────────────────

  private playWaterDrop(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.5 + level * 0.06;

    const dropFreq = 1800 - level * 120; const dropDur = 0.08 + level * 0.01;
    const dropO = ctx.createOscillator(); const dropG = ctx.createGain();
    dropO.type = 'sine'; dropO.frequency.setValueAtTime(dropFreq, t);
    dropO.frequency.exponentialRampToValueAtTime(dropFreq * 0.25, t + dropDur);
    dropG.gain.setValueAtTime(0.5 * intensity, t);
    dropG.gain.exponentialRampToValueAtTime(0.001, t + dropDur);
    dropO.connect(dropG).connect(ctx.destination); dropO.start(t); dropO.stop(t + dropDur);
    this.setOnEnded(dropO, dropO, dropG);

    const rippleDur = 0.35 + level * 0.04;
    for (let i = 0; i < 2; i++) {
      const ripO = ctx.createOscillator(); const ripG = ctx.createGain();
      ripO.type = 'sine';
      const rFreq = (600 - level * 30) + (i === 0 ? 8 : -8);
      ripO.frequency.setValueAtTime(rFreq, t + 0.02);
      ripO.frequency.exponentialRampToValueAtTime(rFreq * 0.4, t + rippleDur);
      ripG.gain.setValueAtTime(0.001, t);
      ripG.gain.linearRampToValueAtTime(0.12 * intensity, t + 0.03);
      ripG.gain.exponentialRampToValueAtTime(0.001, t + rippleDur);
      ripO.connect(ripG).connect(ctx.destination); ripO.start(t + 0.02); ripO.stop(t + rippleDur);
      this.setOnEnded(ripO, ripO, ripG);
    }

    const splashDur = 0.1 + level * 0.015;
    const splSz = Math.floor(ctx.sampleRate * splashDur);
    const splBuf = this.getNoiseBuffer(`wdrop_spl_${level}`, splSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
    });
    const splSrc = ctx.createBufferSource(); splSrc.buffer = splBuf;
    const splG = ctx.createGain();
    splG.gain.setValueAtTime(0.08 * intensity, t + 0.01);
    splG.gain.exponentialRampToValueAtTime(0.001, t + splashDur);
    const splBPF = ctx.createBiquadFilter(); splBPF.type = 'bandpass';
    splBPF.frequency.setValueAtTime(3000, t); splBPF.Q.setValueAtTime(2, t);
    splSrc.connect(splBPF).connect(splG).connect(ctx.destination);
    splSrc.start(t + 0.01); splSrc.stop(t + splashDur + 0.01);
    this.setOnEnded(splSrc, splSrc, splBPF, splG);

    const shimDur = 0.5 + level * 0.03;
    const shimO = ctx.createOscillator(); const shimG = ctx.createGain();
    shimO.type = 'sine'; shimO.frequency.setValueAtTime(4000 + level * 200, t + 0.05);
    shimO.frequency.exponentialRampToValueAtTime(2000, t + 0.5);
    shimG.gain.setValueAtTime(0.001, t);
    shimG.gain.linearRampToValueAtTime(0.04 * intensity, t + 0.08);
    shimG.gain.exponentialRampToValueAtTime(0.001, t + shimDur);
    shimO.connect(shimG).connect(ctx.destination);
    shimO.start(t + 0.05); shimO.stop(t + shimDur);
    this.setOnEnded(shimO, shimO, shimG);
  }

  // ─── Bomb ──────────────────────────────────

  private playBomb(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.55 + level * 0.07;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-15, t); comp.knee.setValueAtTime(6, t);
    comp.ratio.setValueAtTime(8, t); comp.attack.setValueAtTime(0.001, t);
    comp.release.setValueAtTime(0.2, t); comp.connect(ctx.destination);

    const subDur = 0.25 + level * 0.03;
    const subO = ctx.createOscillator(); const subG = ctx.createGain();
    subO.type = 'sine'; subO.frequency.setValueAtTime(60 + level * 5, t);
    subO.frequency.exponentialRampToValueAtTime(25, t + subDur);
    subG.gain.setValueAtTime(0.5 * intensity, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + subDur);
    subO.connect(subG).connect(comp); subO.start(t); subO.stop(t + subDur);
    this.setOnEnded(subO, subO, subG);

    const clickDur = 0.02;
    const clickSz = Math.floor(ctx.sampleRate * clickDur);
    const clickBuf = this.getNoiseBuffer(`bomb_click_${level}`, clickSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    });
    const clickSrc = ctx.createBufferSource(); clickSrc.buffer = clickBuf;
    const clickG = ctx.createGain();
    clickG.gain.setValueAtTime(0.4 * intensity, t);
    clickG.gain.exponentialRampToValueAtTime(0.001, t + clickDur);
    clickSrc.connect(clickG).connect(comp); clickSrc.start(t); clickSrc.stop(t + clickDur);
    this.setOnEnded(clickSrc, clickSrc, clickG);

    const crklDur = 0.4 + level * 0.05;
    const crklSz = Math.floor(ctx.sampleRate * crklDur);
    const crklBuf = this.getNoiseBuffer(`bomb_crkl_${level}`, crklSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    });
    const crklSrc = ctx.createBufferSource(); crklSrc.buffer = crklBuf;
    const crklG = ctx.createGain();
    crklG.gain.setValueAtTime(0.001, t);
    crklG.gain.linearRampToValueAtTime(0.15 * intensity, t + 0.03);
    crklG.gain.exponentialRampToValueAtTime(0.001, t + crklDur);
    const crklLPF = ctx.createBiquadFilter(); crklLPF.type = 'lowpass';
    crklLPF.frequency.setValueAtTime(2000 + level * 200, t);
    crklLPF.frequency.exponentialRampToValueAtTime(400, t + crklDur);
    crklSrc.connect(crklLPF).connect(crklG).connect(comp);
    crklSrc.start(t); crklSrc.stop(t + crklDur);
    this.setOnEnded(crklSrc, crklSrc, crklLPF, crklG);

    const resDur = 0.5 + level * 0.04;
    const resO = ctx.createOscillator(); const resG = ctx.createGain();
    resO.type = 'triangle'; resO.frequency.setValueAtTime(120 + level * 10, t + 0.03);
    resO.frequency.exponentialRampToValueAtTime(40, t + resDur);
    resG.gain.setValueAtTime(0.001, t);
    resG.gain.linearRampToValueAtTime(0.1 * intensity, t + 0.06);
    resG.gain.exponentialRampToValueAtTime(0.001, t + resDur);
    resO.connect(resG).connect(comp); resO.start(t + 0.03); resO.stop(t + resDur);
    this.setOnEnded(resO, resO, resG, comp);
  }

  // ─── Stone ─────────────────────────────────

  private playStone(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.6 + level * 0.07;

    const clickDur = 0.008;
    const clickSz = Math.floor(ctx.sampleRate * clickDur);
    const clickBuf = this.getNoiseBuffer(`stone_click_${level}`, clickSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 12);
    });
    const clickSrc = ctx.createBufferSource(); clickSrc.buffer = clickBuf;
    const clickG = ctx.createGain();
    clickG.gain.setValueAtTime(0.8 * intensity, t);
    clickG.gain.exponentialRampToValueAtTime(0.001, t + clickDur);
    const clickHPF = ctx.createBiquadFilter(); clickHPF.type = 'highpass';
    clickHPF.frequency.setValueAtTime(3000, t); clickHPF.Q.setValueAtTime(2, t);
    clickSrc.connect(clickHPF).connect(clickG).connect(ctx.destination);
    clickSrc.start(t); clickSrc.stop(t + clickDur);
    this.setOnEnded(clickSrc, clickSrc, clickHPF, clickG);

    const knockDur = 0.12 + level * 0.02; const knockFreq = 800 - level * 40;
    const knockO = ctx.createOscillator(); const knockG = ctx.createGain();
    knockO.type = 'triangle'; knockO.frequency.setValueAtTime(knockFreq, t);
    knockO.frequency.exponentialRampToValueAtTime(knockFreq * 0.5, t + knockDur);
    knockG.gain.setValueAtTime(0.35 * intensity, t);
    knockG.gain.exponentialRampToValueAtTime(0.001, t + knockDur);
    const knockBPF = ctx.createBiquadFilter(); knockBPF.type = 'bandpass';
    knockBPF.frequency.setValueAtTime(knockFreq, t); knockBPF.Q.setValueAtTime(5, t);
    knockO.connect(knockBPF).connect(knockG).connect(ctx.destination);
    knockO.start(t); knockO.stop(t + knockDur);
    this.setOnEnded(knockO, knockO, knockBPF, knockG);

    const gritDur = 0.15 + level * 0.02;
    const gritSz = Math.floor(ctx.sampleRate * gritDur);
    const gritBuf = this.getNoiseBuffer(`stone_grit_${level}`, gritSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5);
    });
    const gritSrc = ctx.createBufferSource(); gritSrc.buffer = gritBuf;
    const gritG = ctx.createGain();
    gritG.gain.setValueAtTime(0.18 * intensity, t + 0.005);
    gritG.gain.exponentialRampToValueAtTime(0.001, t + gritDur);
    const gritBPF = ctx.createBiquadFilter(); gritBPF.type = 'bandpass';
    gritBPF.frequency.setValueAtTime(1500 + level * 100, t); gritBPF.Q.setValueAtTime(3, t);
    gritSrc.connect(gritBPF).connect(gritG).connect(ctx.destination);
    gritSrc.start(t + 0.005); gritSrc.stop(t + gritDur);
    this.setOnEnded(gritSrc, gritSrc, gritBPF, gritG);

    const thudO = ctx.createOscillator(); const thudG = ctx.createGain();
    thudO.type = 'sine'; thudO.frequency.setValueAtTime(200 + level * 10, t);
    thudO.frequency.exponentialRampToValueAtTime(70, t + 0.05);
    thudG.gain.setValueAtTime(0.25 * intensity, t);
    thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    thudO.connect(thudG).connect(ctx.destination); thudO.start(t); thudO.stop(t + 0.07);
    this.setOnEnded(thudO, thudO, thudG);

    const tailDur = 0.2 + level * 0.03;
    const tailO = ctx.createOscillator(); const tailG = ctx.createGain();
    tailO.type = 'sine'; tailO.frequency.setValueAtTime(1200 + level * 50, t + 0.02);
    tailO.frequency.exponentialRampToValueAtTime(600, t + tailDur);
    tailG.gain.setValueAtTime(0.001, t);
    tailG.gain.linearRampToValueAtTime(0.04 * intensity, t + 0.04);
    tailG.gain.exponentialRampToValueAtTime(0.001, t + tailDur);
    tailO.connect(tailG).connect(ctx.destination);
    tailO.start(t + 0.02); tailO.stop(t + tailDur);
    this.setOnEnded(tailO, tailO, tailG);
  }

  // ─── Cosmic ────────────────────────────────

  private playCosmic(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.5 + level * 0.06;

    const fmDur = 0.2 + level * 0.03;
    const carrier = ctx.createOscillator(); const modulator = ctx.createOscillator();
    const modGain = ctx.createGain(); const carGain = ctx.createGain();
    modulator.type = 'sine'; modulator.frequency.setValueAtTime(200 + level * 30, t);
    modulator.frequency.exponentialRampToValueAtTime(50, t + fmDur);
    modGain.gain.setValueAtTime(800 + level * 100, t);
    modGain.gain.exponentialRampToValueAtTime(50, t + fmDur);
    carrier.type = 'sine'; carrier.frequency.setValueAtTime(1500 - level * 60, t);
    carrier.frequency.exponentialRampToValueAtTime(400, t + fmDur);
    carGain.gain.setValueAtTime(0.25 * intensity, t);
    carGain.gain.exponentialRampToValueAtTime(0.001, t + fmDur);
    modulator.connect(modGain); modGain.connect(carrier.frequency);
    carrier.connect(carGain).connect(ctx.destination);
    modulator.start(t); carrier.start(t); modulator.stop(t + fmDur); carrier.stop(t + fmDur);
    this.setOnEnded(modulator, modulator, modGain);
    this.setOnEnded(carrier, carrier, carGain);

    const shimBase = 3000 + level * 200;
    for (let i = 0; i < 3; i++) {
      const shimDur = 0.5 + level * 0.05 + i * 0.15;
      const shimO = ctx.createOscillator(); const shimG = ctx.createGain();
      shimO.type = 'sine';
      const freq = shimBase + i * 700 + Math.random() * 200;
      shimO.frequency.setValueAtTime(freq, t + 0.03 + i * 0.04);
      shimO.frequency.exponentialRampToValueAtTime(freq * 0.4, t + shimDur);
      shimG.gain.setValueAtTime(0.001, t);
      shimG.gain.linearRampToValueAtTime(0.05 * intensity / (i + 1), t + 0.06 + i * 0.04);
      shimG.gain.exponentialRampToValueAtTime(0.001, t + shimDur);
      shimO.connect(shimG).connect(ctx.destination);
      shimO.start(t + 0.03 + i * 0.04); shimO.stop(t + shimDur);
      this.setOnEnded(shimO, shimO, shimG);
    }

    const padDur = 0.6 + level * 0.06;
    const padO = ctx.createOscillator(); const padG = ctx.createGain();
    padO.type = 'triangle'; padO.frequency.setValueAtTime(90 + level * 8, t);
    padO.frequency.exponentialRampToValueAtTime(50 + level * 3, t + padDur);
    padG.gain.setValueAtTime(0.001, t);
    padG.gain.linearRampToValueAtTime(0.1 * intensity, t + 0.1);
    padG.gain.exponentialRampToValueAtTime(0.001, t + padDur);
    padO.connect(padG).connect(ctx.destination); padO.start(t); padO.stop(t + padDur);
    this.autoDisconnect(padO, padDur); this.autoDisconnect(padG, padDur);

    const statDur = 0.15 + level * 0.02;
    const statSz = Math.floor(ctx.sampleRate * statDur);
    const statBuf = this.getNoiseBuffer(`cosmic_stat_${level}`, statSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    });
    const statSrc = ctx.createBufferSource(); statSrc.buffer = statBuf;
    const statG = ctx.createGain();
    statG.gain.setValueAtTime(0.06 * intensity, t + 0.01);
    statG.gain.exponentialRampToValueAtTime(0.001, t + statDur);
    const statHPF = ctx.createBiquadFilter(); statHPF.type = 'highpass';
    statHPF.frequency.setValueAtTime(5000, t);
    statSrc.connect(statHPF).connect(statG).connect(ctx.destination);
    statSrc.start(t + 0.01); statSrc.stop(t + statDur + 0.01);
    this.autoDisconnect(statSrc, statDur);
    this.autoDisconnect(statHPF, statDur);
    this.autoDisconnect(statG, statDur);
  }

  // ─── Fighting ──────────────────────────────

  private playFighting(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.65 + level * 0.08;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-18, t); comp.knee.setValueAtTime(4, t);
    comp.ratio.setValueAtTime(10, t); comp.attack.setValueAtTime(0, t);
    comp.release.setValueAtTime(0.08, t); comp.connect(ctx.destination);

    const hitDur = 0.015;
    const hitSz = Math.floor(ctx.sampleRate * hitDur);
    const hitBuf = this.getNoiseBuffer(`fight_hit_${level}`, hitSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 10);
    });
    const hitSrc = ctx.createBufferSource(); hitSrc.buffer = hitBuf;
    const hitG = ctx.createGain();
    hitG.gain.setValueAtTime(0.9 * intensity, t);
    hitG.gain.exponentialRampToValueAtTime(0.001, t + hitDur);
    hitSrc.connect(hitG).connect(comp); hitSrc.start(t); hitSrc.stop(t + hitDur);
    this.setOnEnded(hitSrc, hitSrc, hitG);

    const thudDur = 0.08 + level * 0.015;
    const thudO = ctx.createOscillator(); const thudG = ctx.createGain();
    thudO.type = 'sine';
    thudO.frequency.setValueAtTime(150 + level * 10, t);
    thudO.frequency.exponentialRampToValueAtTime(40, t + thudDur);
    thudG.gain.setValueAtTime(0.6 * intensity, t);
    thudG.gain.exponentialRampToValueAtTime(0.001, t + thudDur);
    thudO.connect(thudG).connect(comp); thudO.start(t); thudO.stop(t + thudDur);
    this.setOnEnded(thudO, thudO, thudG);

    const smackFreq = 600 + level * 80;
    const smackDur = 0.05 + level * 0.008;
    const smO = ctx.createOscillator(); const smG = ctx.createGain();
    smO.type = 'sawtooth';
    smO.frequency.setValueAtTime(smackFreq, t);
    smO.frequency.exponentialRampToValueAtTime(smackFreq * 0.2, t + smackDur);
    smG.gain.setValueAtTime(0.3 * intensity, t);
    smG.gain.exponentialRampToValueAtTime(0.001, t + smackDur);
    const smBPF = ctx.createBiquadFilter(); smBPF.type = 'bandpass';
    smBPF.frequency.setValueAtTime(smackFreq, t); smBPF.Q.setValueAtTime(4, t);
    smO.connect(smBPF).connect(smG).connect(comp); smO.start(t); smO.stop(t + smackDur);
    this.setOnEnded(smO, smO, smBPF, smG);

    const crDur = 0.12 + level * 0.02;
    const crSz = Math.floor(ctx.sampleRate * crDur);
    const crBuf = this.getNoiseBuffer(`fight_cr_${level}`, crSz, (d, n) => {
      for (let i = 0; i < n; i++) {
        const env = Math.pow(1 - i / n, 3);
        d[i] = Math.tanh((Math.random() * 2 - 1) * 3) * env;
      }
    });
    const crSrc = ctx.createBufferSource(); crSrc.buffer = crBuf;
    const crG = ctx.createGain();
    crG.gain.setValueAtTime(0.2 * intensity, t + 0.005);
    crG.gain.exponentialRampToValueAtTime(0.001, t + crDur);
    const crLPF = ctx.createBiquadFilter(); crLPF.type = 'lowpass';
    crLPF.frequency.setValueAtTime(2500 + level * 200, t);
    crLPF.frequency.exponentialRampToValueAtTime(500, t + crDur);
    crSrc.connect(crLPF).connect(crG).connect(comp);
    crSrc.start(t + 0.005); crSrc.stop(t + crDur);
    this.setOnEnded(crSrc, crSrc, crLPF, crG);

    const tailDur = 0.15 + level * 0.025;
    const tailO = ctx.createOscillator(); const tailG = ctx.createGain();
    tailO.type = 'triangle';
    tailO.frequency.setValueAtTime(250 + level * 20, t + 0.02);
    tailO.frequency.exponentialRampToValueAtTime(80, t + tailDur);
    tailG.gain.setValueAtTime(0.001, t);
    tailG.gain.linearRampToValueAtTime(0.08 * intensity, t + 0.04);
    tailG.gain.exponentialRampToValueAtTime(0.001, t + tailDur);
    tailO.connect(tailG).connect(comp); tailO.start(t + 0.02); tailO.stop(t + tailDur);
    this.setOnEnded(tailO, tailO, tailG, comp);
  }

  // ─── Shooting ──────────────────────────────

  private playShooting(level: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const intensity = 0.6 + level * 0.08;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-15, t); comp.knee.setValueAtTime(5, t);
    comp.ratio.setValueAtTime(10, t); comp.attack.setValueAtTime(0, t);
    comp.release.setValueAtTime(0.1, t); comp.connect(ctx.destination);

    const snapDur = 0.01;
    const snapSz = Math.floor(ctx.sampleRate * snapDur);
    const snapBuf = this.getNoiseBuffer(`shoot_snap_${level}`, snapSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 15);
    });
    const snapSrc = ctx.createBufferSource(); snapSrc.buffer = snapBuf;
    const snapG = ctx.createGain();
    snapG.gain.setValueAtTime(0.85 * intensity, t);
    snapG.gain.exponentialRampToValueAtTime(0.001, t + snapDur);
    const snapHPF = ctx.createBiquadFilter(); snapHPF.type = 'highpass';
    snapHPF.frequency.setValueAtTime(4000, t);
    snapSrc.connect(snapHPF).connect(snapG).connect(comp);
    snapSrc.start(t); snapSrc.stop(t + snapDur);
    this.setOnEnded(snapSrc, snapSrc, snapHPF, snapG);

    const expDur = 0.2 + level * 0.03;
    const expO = ctx.createOscillator(); const expG = ctx.createGain();
    expO.type = 'sine';
    expO.frequency.setValueAtTime(80 + level * 8, t);
    expO.frequency.exponentialRampToValueAtTime(20, t + expDur);
    expG.gain.setValueAtTime(0.55 * intensity, t);
    expG.gain.exponentialRampToValueAtTime(0.001, t + expDur);
    expO.connect(expG).connect(comp); expO.start(t); expO.stop(t + expDur);
    this.setOnEnded(expO, expO, expG);

    const ricFreq = 2000 + level * 300;
    const ricDur = 0.06 + level * 0.01;
    const ricO = ctx.createOscillator(); const ricG = ctx.createGain();
    ricO.type = 'square';
    ricO.frequency.setValueAtTime(ricFreq, t);
    ricO.frequency.exponentialRampToValueAtTime(ricFreq * 0.1, t + ricDur);
    ricG.gain.setValueAtTime(0.2 * intensity, t);
    ricG.gain.exponentialRampToValueAtTime(0.001, t + ricDur);
    const ricBPF = ctx.createBiquadFilter(); ricBPF.type = 'bandpass';
    ricBPF.frequency.setValueAtTime(ricFreq * 0.8, t); ricBPF.Q.setValueAtTime(6, t);
    ricO.connect(ricBPF).connect(ricG).connect(comp);
    ricO.start(t); ricO.stop(t + ricDur);
    this.setOnEnded(ricO, ricO, ricBPF, ricG);

    const debDur = 0.3 + level * 0.04;
    const debSz = Math.floor(ctx.sampleRate * debDur);
    const debBuf = this.getNoiseBuffer(`shoot_deb_${level}`, debSz, (d, n) => {
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
    });
    const debSrc = ctx.createBufferSource(); debSrc.buffer = debBuf;
    const debG = ctx.createGain();
    debG.gain.setValueAtTime(0.001, t);
    debG.gain.linearRampToValueAtTime(0.18 * intensity, t + 0.015);
    debG.gain.exponentialRampToValueAtTime(0.001, t + debDur);
    const debLPF = ctx.createBiquadFilter(); debLPF.type = 'lowpass';
    debLPF.frequency.setValueAtTime(3500 + level * 300, t);
    debLPF.frequency.exponentialRampToValueAtTime(400, t + debDur);
    debSrc.connect(debLPF).connect(debG).connect(comp);
    debSrc.start(t); debSrc.stop(t + debDur);
    this.setOnEnded(debSrc, debSrc, debLPF, debG);

    const pwDur = 0.25 + level * 0.03;
    const pwO = ctx.createOscillator(); const pwG = ctx.createGain();
    pwO.type = 'triangle';
    pwO.frequency.setValueAtTime(300 + level * 25, t + 0.01);
    pwO.frequency.exponentialRampToValueAtTime(60, t + pwDur);
    pwG.gain.setValueAtTime(0.001, t);
    pwG.gain.linearRampToValueAtTime(0.12 * intensity, t + 0.03);
    pwG.gain.exponentialRampToValueAtTime(0.001, t + pwDur);
    pwO.connect(pwG).connect(comp); pwO.start(t + 0.01); pwO.stop(t + pwDur);
    this.setOnEnded(pwO, pwO, pwG, comp);
  }

  // ─── Bump (ball-to-ball collision) ──────────

  private playBump(intensity: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const vol = Math.min(0.12, intensity * 0.06);
    const dur = 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300 + intensity * 200, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + dur);
    this.setOnEnded(osc, osc, gain);
  }

  // ─── Thud (ball-to-wall/floor collision) ────

  private playThud(intensity: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const vol = Math.min(0.10, intensity * 0.05);
    const dur = 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 + intensity * 100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + dur);
    this.setOnEnded(osc, osc, gain);
  }

  dispose(): void { this.ctx?.close(); }
}
