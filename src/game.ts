/**
 * Game — Main Controller (Phase 0-5 Integrated)
 * GDD Ch.6 §6.1 Complete Game Flow
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { SceneManager } from '@/core/scene';
import { InputManager } from '@/core/input';
import { CameraOrbit } from '@/core/camera-orbit';
import { PostProcessing } from '@/rendering/post-processing';
import { PhysicsSystem } from '@/systems/physics';
import { MergeSystem, type MergeEvent } from '@/systems/merge';
import { ParticleSystem } from '@/systems/particles';
import { GridFlowSystem } from '@/systems/grid-flow';
import { AudioManager, type SoundPack } from '@/audio/audio';
import { spawnFloatingScore, spawnFloatingCombo } from '@/ui/floating-text';
import { createNeonMesh } from '@/rendering/shape-mesh';
import { SHAPES, DIFFICULTIES, type Difficulty } from '@/types';
import {
  GRID_COLOR, GRID_SIZE, GRID_DIVISIONS,
  HALF_WIDTH, HALF_DEPTH, CONTAINER_HEIGHT,
  GAME_OVER_LINE_Y, DROP_COOLDOWN_MS, COMBO_WINDOW_MS,
  GAME_OVER_DELAY_MS, DROP_SPAWN_Y, DROP_Y,
  SHAKE_DECAY, SHAKE_THRESHOLD,
} from '@/constants';
import { randomInt } from '@/utils/math';

interface LeaderboardEntry {
  playerId: string;
  score: number;
  difficulty: string;
  playTime: number;
  date: string;
}

export class Game {
  // ---- Core Systems ----
  private sceneManager!: SceneManager;
  private postProcessing!: PostProcessing;
  private physics!: PhysicsSystem;
  private input!: InputManager;
  private cameraOrbit!: CameraOrbit;
  private mergeSystem!: MergeSystem;
  private eventQueue!: RAPIER.EventQueue;

  // ---- FX Systems ----
  private particleSystem!: ParticleSystem;
  private gridFlow!: GridFlowSystem;
  private audio = new AudioManager();

  // Scene groups
  private environmentGroup!: THREE.Group;
  private containerGroup!: THREE.Group;
  private shapesGroup!: THREE.Group;
  private particlesGroup!: THREE.Group;
  private aimGuideGroup!: THREE.Group;

  // ---- Aim Guide ----
  private aimLine: THREE.Mesh | null = null;
  private ghostMesh: THREE.Group | null = null;

  // ---- [PERF] Shared Snapshot Renderer (NEXT + Evolution Bar) ----
  private snapshotRenderer!: THREE.WebGLRenderer;
  private snapshotScene!: THREE.Scene;
  private snapshotCamera!: THREE.PerspectiveCamera;
  private snapshotMesh: THREE.Group | null = null;

  // ---- Next Preview ----
  private nextPreviewRenderer!: THREE.WebGLRenderer;

  // ---- Game State ----
  private score = 0;
  private highScore = 0;
  private currentLevel = 0;
  private nextLevel = 0;
  private maxDropLevel = 3;
  private startIndex = 0;
  private canDrop = true;
  private isGameOver = false;
  private isPlaying = false;
  private difficulty: Difficulty = 'normal';
  private playerId = 'guest';
  private gameStartTime = 0;

  // ---- Combo ----
  private comboCount = 0;
  private comboTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Game Over Detection ----
  private gameOverTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Camera Shake ----
  private shakeIntensity = 0;
  private readonly _scratchColor = new THREE.Color(); // [PERF] 重用 Color 物件

  // ---- Timing ----
  private animationId: number | null = null;
  private lastTime = 0;
  private physicsAccumulator = 0;

  // ---- FPS ----
  private fpsEl!: HTMLElement;
  private frameCount = 0;
  private lastFpsTime = 0;

  // ---- DOM ----
  private scoreEl!: HTMLElement;

  async init(): Promise<void> {
    // 1. Scene / Camera / Renderer
    this.sceneManager = new SceneManager('canvas-container');

    // 1.5 Camera Orbit (水平環繞視角控制)
    this.cameraOrbit = new CameraOrbit(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement,
    );

    // 2. Post-Processing
    this.postProcessing = new PostProcessing(
      this.sceneManager.renderer,
      this.sceneManager.scene,
      this.sceneManager.camera,
    );
    window.addEventListener('resize', () => {
      this.postProcessing.composer.setSize(window.innerWidth, window.innerHeight);
    });

    // 3. Physics
    this.physics = new PhysicsSystem();
    await this.physics.init();
    this.eventQueue = new RAPIER.EventQueue(true);

    // 4. Scene groups
    this.createGroups();

    // 5. Environment + Container + Lights
    this.buildEnvironment();
    this.buildContainer();
    this.setupLights();

    // 6. Input
    this.input = new InputManager(this.sceneManager.camera, this.sceneManager.renderer.domElement);
    this.input.isDragCheck = () => this.cameraOrbit.wasDragging;
    this.input.onDrop = this.handleDrop.bind(this);
    this.input.onMove = this.handlePointerMove.bind(this);

    // 7. Merge system
    this.mergeSystem = new MergeSystem(this.physics, this.shapesGroup);
    this.mergeSystem.onMerge = this.handleMerge.bind(this);
    this.mergeSystem.onBump = (type, intensity) => {
      this.audio.play(type, 0, intensity);
    };

    // 8. FX: particles + grid flow
    this.particleSystem = new ParticleSystem(this.particlesGroup);
    this.gridFlow = new GridFlowSystem(this.environmentGroup);

    // 9. DOM
    this.scoreEl = document.getElementById('score-value')!;
    this.highScore = parseInt(localStorage.getItem('highScore') || '0', 10);

    // 10. FPS
    this.fpsEl = document.createElement('div');
    this.fpsEl.id = 'fps-counter';
    this.fpsEl.style.cssText = `
      position: fixed; bottom: 8px; left: 8px; z-index: 9999;
      font-family: 'Orbitron', monospace; font-size: 13px;
      color: #39FF14; text-shadow: 0 0 6px rgba(57,255,20,0.5);
      pointer-events: none;
    `;
    this.fpsEl.textContent = 'FPS: --';
    document.body.appendChild(this.fpsEl);
    this.lastFpsTime = performance.now();

    // 11. UI bindings
    this.bindUIEvents();

    // 12. Aim guide
    this.buildAimGuide();

    // 13. NEXT preview (off-screen mini scene)
    this.setupNextPreview();

    // 14. Initial shape levels
    this.currentLevel = randomInt(this.startIndex, this.startIndex + this.maxDropLevel);
    this.nextLevel = randomInt(this.startIndex, this.startIndex + this.maxDropLevel);
    this.updateNextPreview();

    // 15. Start render loop
    this.lastTime = performance.now();
    this.startRenderLoop();
  }

  // ============================
  // Scene Setup
  // ============================

  private createGroups(): void {
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = 'environment';
    this.sceneManager.scene.add(this.environmentGroup);

    this.containerGroup = new THREE.Group();
    this.containerGroup.name = 'container';
    this.sceneManager.scene.add(this.containerGroup);

    // Game Over plane
    const goGeo = new THREE.PlaneGeometry(HALF_WIDTH * 2 + 1, HALF_DEPTH * 2 + 1);
    const goMat = new THREE.MeshBasicMaterial({
      color: 0xFF3131, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false,
    });
    const goPlane = new THREE.Mesh(goGeo, goMat);
    goPlane.rotation.x = -Math.PI / 2;
    goPlane.position.y = GAME_OVER_LINE_Y;
    goPlane.renderOrder = 1; // 確保紅色平面最後渲染，才能成為半透明遮擋層
    this.sceneManager.scene.add(goPlane);

    this.shapesGroup = new THREE.Group();
    this.shapesGroup.name = 'shapes';
    this.sceneManager.scene.add(this.shapesGroup);

    this.particlesGroup = new THREE.Group();
    this.particlesGroup.name = 'particles';
    this.sceneManager.scene.add(this.particlesGroup);

    this.aimGuideGroup = new THREE.Group();
    this.aimGuideGroup.name = 'aimGuide';
    this.sceneManager.scene.add(this.aimGuideGroup);
  }

  private buildEnvironment(): void {
    // Wireframe grid only — no solid floor plane
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, GRID_COLOR, GRID_COLOR);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.15;
    grid.position.y = 0.0;
    this.environmentGroup.add(grid);
  }

  private buildContainer(): void {
    const w = HALF_WIDTH * 2;
    const h = CONTAINER_HEIGHT;
    const d = HALF_DEPTH * 2;

    // 木頭色半透明材質
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC,      // 灰白色
      transparent: true,
      opacity: 0.2,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // 前面板
    const frontGeo = new THREE.PlaneGeometry(w, h);
    const front = new THREE.Mesh(frontGeo, woodMat);
    front.position.set(0, h / 2, HALF_DEPTH);
    this.containerGroup.add(front);

    // 後面板
    const back = new THREE.Mesh(frontGeo, woodMat);
    back.position.set(0, h / 2, -HALF_DEPTH);
    back.rotation.y = Math.PI;
    this.containerGroup.add(back);

    // 左面板
    const sideGeo = new THREE.PlaneGeometry(d, h);
    const left = new THREE.Mesh(sideGeo, woodMat);
    left.position.set(-HALF_WIDTH, h / 2, 0);
    left.rotation.y = Math.PI / 2;
    this.containerGroup.add(left);

    // 右面板
    const right = new THREE.Mesh(sideGeo, woodMat);
    right.position.set(HALF_WIDTH, h / 2, 0);
    right.rotation.y = -Math.PI / 2;
    this.containerGroup.add(right);

    // 底面板
    const bottomGeo = new THREE.PlaneGeometry(w, d);
    const bottom = new THREE.Mesh(bottomGeo, woodMat);
    bottom.position.set(0, 0, 0);
    bottom.rotation.x = -Math.PI / 2;
    this.containerGroup.add(bottom);
  }

  private setupLights(): void {
    // 環境光 — 提供基礎亮度，確保暗面也看得見
    this.sceneManager.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // 主方向光 — 從右上前方打下，營造多邊形明暗面的自然立體感
    const mainDir = new THREE.DirectionalLight(0xffffff, 1.2);
    mainDir.position.set(5, 15, 10);
    this.sceneManager.scene.add(mainDir);

    // 補光 — 從左下方打上，防止背光面完全變黑
    const fillDir = new THREE.DirectionalLight(0xffffff, 0.4);
    fillDir.position.set(-5, 5, -5);
    this.sceneManager.scene.add(fillDir);

    // 頂光 — 從正上方打下，讓頂面有亮面高光
    const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
    topLight.position.set(0, 20, 0);
    this.sceneManager.scene.add(topLight);
  }

  // ============================
  // Aim Guide
  // ============================

  private buildAimGuide(): void {
    const lineGeo = new THREE.CylinderGeometry(0.02, 0.02, CONTAINER_HEIGHT);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10 });
    this.aimLine = new THREE.Mesh(lineGeo, lineMat);
    this.aimLine.position.set(0, CONTAINER_HEIGHT / 2, 0);
    this.aimGuideGroup.add(this.aimLine);
    this.updateGhostShape();
  }

  private updateGhostShape(): void {
    if (this.ghostMesh) this.aimGuideGroup.remove(this.ghostMesh);
    this.ghostMesh = createNeonMesh(this.currentLevel);
    // Clone materials with reduced opacity — same look as dropped shapes but translucent
    this.ghostMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const cloned = (child.material as THREE.MeshStandardMaterial).clone();
        cloned.transparent = true;
        cloned.opacity = 0.35;
        cloned.depthWrite = false;
        cloned.side = THREE.FrontSide; // 只渲染正面，避免背面透出導致錯亂
        child.material = cloned;
      }
    });

    // 計算目前的游標座標 (確保形狀半徑更新時不會超出邊界)
    const rawX = this.input ? this.input.worldX : 0;
    const r = SHAPES[this.currentLevel].collisionRadius;
    const clampedX = this.input ? this.input.clampX(rawX, r) : 0;

    this.ghostMesh.position.set(clampedX, DROP_Y, 0);
    if (this.aimLine) this.aimLine.position.x = clampedX;

    this.aimGuideGroup.add(this.ghostMesh);
  }

  // ============================
  // NEXT Preview (mini 3D render → canvas)
  // ============================

  private setupNextPreview(): void {
    // ---- Shared Snapshot Renderer (used by NEXT + Evolution Bar) ----
    this.snapshotRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.snapshotRenderer.setSize(128, 128);

    this.snapshotScene = new THREE.Scene();
    this.snapshotScene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 3, 4);
    this.snapshotScene.add(dirLight);
    const fillDir = new THREE.DirectionalLight(0xffffff, 0.4);
    fillDir.position.set(-3, -1, -3);
    this.snapshotScene.add(fillDir);

    this.snapshotCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

    // ---- Dedicated NEXT canvas renderer ----
    const canvas = document.getElementById('next-preview') as HTMLCanvasElement;
    if (canvas) {
      this.nextPreviewRenderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      this.nextPreviewRenderer.setSize(80, 80, false);
      this.nextPreviewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.nextPreviewRenderer.toneMappingExposure = 1.2;
    }
  }

  /** [PERF] Render a snapshot using the shared renderer, return dataURL */
  private renderSnapshot(level: number, paddingFactor = 1.4): string {
    if (this.snapshotMesh) {
      this.snapshotScene.remove(this.snapshotMesh);
    }
    const mesh = createNeonMesh(level);
    mesh.rotation.x = Math.PI / 6;
    mesh.rotation.y = Math.PI / 4;

    const shapeRadius = SHAPES[level].collisionRadius;
    const fov = 40;
    const cameraZ = (shapeRadius * paddingFactor) / Math.tan((fov / 2) * THREE.MathUtils.DEG2RAD);
    this.snapshotCamera.position.set(0, 0, cameraZ);
    this.snapshotCamera.lookAt(0, 0, 0);
    this.snapshotCamera.updateProjectionMatrix();

    this.snapshotScene.add(mesh);
    this.snapshotRenderer.render(this.snapshotScene, this.snapshotCamera);
    const dataUrl = this.snapshotRenderer.domElement.toDataURL('image/png');

    this.snapshotScene.remove(mesh);
    this.snapshotMesh = null;

    return dataUrl;
  }

  private updateNextPreview(): void {
    if (!this.nextPreviewRenderer) return;

    // 建立專用場景並渲染到 NEXT canvas 上
    // 使用 NEXT 專用的 renderer + scene，每次只繪製一次
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a40);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const mainDir = new THREE.DirectionalLight(0xffffff, 1.2);
    mainDir.position.set(3, 4, 5);
    scene.add(mainDir);
    const fillDir = new THREE.DirectionalLight(0xffffff, 0.4);
    fillDir.position.set(-3, -1, -3);
    scene.add(fillDir);

    const mesh = createNeonMesh(this.nextLevel);
    mesh.rotation.y = Math.PI / 4;
    mesh.rotation.x = Math.PI / 8;

    const shapeRadius = SHAPES[this.nextLevel].collisionRadius;
    const fov = 40;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 50);
    const cameraZ = (shapeRadius * 1.4) / Math.tan((fov / 2) * THREE.MathUtils.DEG2RAD);
    camera.position.set(0, 0, cameraZ);
    camera.lookAt(0, 0, 0);

    scene.add(mesh);
    this.nextPreviewRenderer.render(scene, camera);
  }

  // ============================
  // UI Events
  // ============================

  private bindUIEvents(): void {
    // Difficulty buttons
    document.querySelectorAll('.btn-difficulty').forEach((btn) => {
      btn.addEventListener('click', () => {
        const diff = (btn as HTMLElement).dataset.difficulty as Difficulty;
        this.audio.play('select');
        this.selectDifficulty(diff);
      });
      btn.addEventListener('mouseenter', () => this.audio.play('hover'));
    });

    // Restart
    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.audio.play('select');
      document.getElementById('overlay-gameover')!.style.display = 'none';
      document.getElementById('overlay-difficulty')!.style.display = '';
    });

    // Leaderboard
    document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
      this.audio.play('select');
      this.showLeaderboard();
    });
    document.getElementById('btn-leaderboard-close')?.addEventListener('click', () => {
      document.getElementById('overlay-leaderboard')!.style.display = 'none';
    });

    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.audio.play('select');
      const overlay = document.getElementById('overlay-settings')!;
      overlay.style.display = overlay.style.display === 'none' ? '' : 'none';
    });
    document.getElementById('btn-settings-close')?.addEventListener('click', () => {
      document.getElementById('overlay-settings')!.style.display = 'none';
    });

    // Player ID
    const savedId = localStorage.getItem('playerId');
    if (savedId) {
      (document.getElementById('player-id-input') as HTMLInputElement).value = savedId;
    }

    // Sound pack select
    const soundSelect = document.getElementById('sound-type-select') as HTMLSelectElement;
    const savedPack = localStorage.getItem('soundPack');
    if (savedPack) {
      soundSelect.value = savedPack;
      this.audio.setPack(savedPack as SoundPack);
    }
    soundSelect?.addEventListener('change', () => {
      const pack = soundSelect.value as SoundPack;
      this.audio.setPack(pack);
      localStorage.setItem('soundPack', pack);
    });

    // Sound preview buttons
    document.querySelectorAll('.btn-preview').forEach((btn) => {
      btn.addEventListener('click', () => {
        const soundType = (btn as HTMLElement).dataset.sound as string;
        const pack = soundSelect.value as SoundPack;
        if (soundType === 'bump' || soundType === 'thud') {
          this.audio.play(soundType as 'bump' | 'thud', 0, 1.0);
        } else {
          this.audio.preview(soundType as 'drop' | 'merge' | 'combo', pack);
        }
      });
    });

    // Merge level preview buttons (Lv.1~9)
    document.querySelectorAll('.btn-preview-merge').forEach((btn) => {
      btn.addEventListener('click', () => {
        const level = parseInt((btn as HTMLElement).dataset.level || '0', 10);
        const pack = soundSelect.value as SoundPack;
        this.audio.setPack(pack);
        this.audio.play('merge', level);
      });
    });
  }

  private selectDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
    const config = DIFFICULTIES[diff];
    this.maxDropLevel = config.maxDropLevel;
    this.startIndex = config.startIndex;

    const idInput = document.getElementById('player-id-input') as HTMLInputElement;
    this.playerId = idInput.value.trim().slice(0, 16) || 'guest';
    localStorage.setItem('playerId', this.playerId);

    document.getElementById('overlay-difficulty')!.style.display = 'none';
    this.startGame();
  }

  private startGame(): void {
    this.score = 0;
    this.canDrop = true;
    this.isGameOver = false;
    this.isPlaying = true;
    this.comboCount = 0;
    this.gameStartTime = Date.now();

    this.mergeSystem.clearAll();
    this.physics.cleanup();
    this.updateScore(0);

    this.currentLevel = randomInt(this.startIndex, this.startIndex + this.maxDropLevel);
    this.nextLevel = randomInt(this.startIndex, this.startIndex + this.maxDropLevel);
    this.updateGhostShape();
    this.updateNextPreview();
    this.aimGuideGroup.visible = true;

    this.updateEvolutionBar();
  }

  private updateEvolutionBar(): void {
    const bar = document.getElementById('evolution-bar');
    if (!bar) return;
    bar.innerHTML = '';

    const config = DIFFICULTIES[this.difficulty];
    const endIndex = config.startIndex + config.shapeCount;

    // [PERF] 使用共用快照渲染器，不再每次 new WebGLRenderer
    for (let i = config.startIndex; i < endIndex; i++) {
      const dataUrl = this.renderSnapshot(i, 1.3);

      const wrapper = document.createElement('div');
      wrapper.className = 'evo-shape';
      const radius = SHAPES[i].collisionRadius;
      wrapper.style.flexGrow = String(radius);
      wrapper.style.flexBasis = '0';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.display = 'block';
      img.style.objectFit = 'contain';

      wrapper.appendChild(img);
      bar.appendChild(wrapper);
    }
  }

  // ============================
  // Leaderboard
  // ============================

  private showLeaderboard(): void {
    const overlay = document.getElementById('overlay-leaderboard')!;
    const body = document.getElementById('leaderboard-body')!;
    overlay.style.display = '';

    const records = this.getLeaderboardData();

    if (records.length === 0) {
      body.innerHTML = '<p class="loading-text">尚無紀錄</p>';
      return;
    }

    let html = '<table style="width:100%;border-collapse:collapse;color:#fff;font-family:var(--font-body);font-size:14px;">';
    html += '<tr style="color:var(--color-gold);"><th style="padding:8px;">#</th><th>玩家</th><th>分數</th><th>難度</th><th>時間</th></tr>';
    records.forEach((row: LeaderboardEntry, i: number) => {
      const color = i < 3 ? 'var(--color-gold)' : 'var(--color-text-primary)';
      const mins = Math.floor(row.playTime / 60);
      const secs = row.playTime % 60;
      const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
      html += `<tr style="color:${color};"><td style="padding:6px;text-align:center;">${i + 1}</td><td>${row.playerId}</td><td style="text-align:right;">${row.score}</td><td style="text-align:center;">${row.difficulty.toUpperCase()}</td><td style="text-align:center;">${timeStr}</td></tr>`;
    });
    html += '</table>';
    body.innerHTML = html;
  }

  // ============================
  // Drop Handling
  // ============================

  private handleDrop(worldX: number): void {
    if (!this.canDrop || this.isGameOver || !this.isPlaying) return;
    this.canDrop = false;

    const r = SHAPES[this.currentLevel].collisionRadius;
    const clampedX = this.input.clampX(worldX, r);

    this.mergeSystem.spawnShape(this.currentLevel, clampedX, DROP_SPAWN_Y, 0);
    this.audio.play('drop', this.currentLevel);

    this.currentLevel = this.nextLevel;
    this.nextLevel = randomInt(this.startIndex, this.startIndex + this.maxDropLevel);
    this.updateGhostShape();
    this.updateNextPreview();

    setTimeout(() => { this.canDrop = true; }, DROP_COOLDOWN_MS);
  }

  private handlePointerMove(worldX: number): void {
    if (!this.isPlaying || this.isGameOver) return;
    const r = SHAPES[this.currentLevel].collisionRadius;
    const clampedX = this.input.clampX(worldX, r);
    if (this.aimLine) this.aimLine.position.x = clampedX;
    if (this.ghostMesh) this.ghostMesh.position.x = clampedX;
  }

  // ============================
  // Merge Handling
  // ============================

  private handleMerge(event: MergeEvent): void {
    // Score
    this.score += event.score;
    this.updateScore(this.score);

    // Audio
    this.audio.play('merge', event.newLevel);

    // Floating text
    const shapeDef = SHAPES[event.newLevel] || SHAPES[SHAPES.length - 1];
    spawnFloatingScore(this.sceneManager.scene, event.position, event.score, shapeDef.colorHex);

    // Particles — use PRE-MERGE element color (the shapes that were merged)
    const preMergeLevel = Math.max(0, event.newLevel - 1);
    const preMergeDef = SHAPES[preMergeLevel];
    // [PERF] 使用 set() 覆寫而非 new Color()
    this._scratchColor.set(preMergeDef.color);
    this.particleSystem.emit(event.position, this._scratchColor, 20 + event.newLevel * 4);

    // Combo
    this.comboCount++;
    if (this.comboTimer) clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => { this.comboCount = 0; }, COMBO_WINDOW_MS);

    if (this.comboCount >= 2) {
      this.audio.play('combo', this.comboCount);
      spawnFloatingCombo(this.sceneManager.scene, event.position, this.comboCount);
    }

    // Camera shake
    this.shakeIntensity = 0.08 + event.newLevel * 0.03 + this.comboCount * 0.01;
  }

  // ============================
  // Game Over
  // ============================

  private checkGameOver(): void {
    if (this.isGameOver || !this.isPlaying) return;

    const shapes = this.mergeSystem.getAllShapes();
    const hasOverline = shapes.some((s) => {
      const y = this.physics.getY(s.body);
      const speed = this.physics.getSpeed(s.body);
      return y > GAME_OVER_LINE_Y && speed < 0.3;
    });

    if (hasOverline) {
      if (!this.gameOverTimer) {
        this.gameOverTimer = setTimeout(() => this.triggerGameOver(), GAME_OVER_DELAY_MS);
      }
    } else {
      if (this.gameOverTimer) {
        clearTimeout(this.gameOverTimer);
        this.gameOverTimer = null;
      }
    }
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.isPlaying = false;
    this.canDrop = false;
    this.gameOverTimer = null;
    this.aimGuideGroup.visible = false;
    this.audio.play('gameover');

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('highScore', String(this.highScore));
    }

    document.getElementById('gameover-score-value')!.textContent = String(this.score);
    document.getElementById('gameover-high-value')!.textContent = String(this.highScore);
    document.getElementById('overlay-gameover')!.style.display = '';

    this.submitScore();
  }

  private submitScore(): void {
    const playTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
    this.saveLeaderboardEntry({
      playerId: this.playerId,
      score: this.score,
      difficulty: this.difficulty,
      playTime,
      date: new Date().toISOString(),
    });
  }

  // ---- Leaderboard localStorage helpers ----

  private static readonly LB_KEY = 'leaderboard';
  private static readonly LB_MAX = 20;

  private getLeaderboardData(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(Game.LB_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw) as LeaderboardEntry[];
      return data.sort((a, b) => b.score - a.score).slice(0, Game.LB_MAX);
    } catch {
      return [];
    }
  }

  private saveLeaderboardEntry(entry: LeaderboardEntry): void {
    const records = this.getLeaderboardData();
    records.push(entry);
    records.sort((a, b) => b.score - a.score);
    const trimmed = records.slice(0, Game.LB_MAX);
    localStorage.setItem(Game.LB_KEY, JSON.stringify(trimmed));
  }

  private updateScore(score: number): void {
    this.scoreEl.textContent = String(score);
  }

  // ============================
  // Render Loop
  // ============================

  private startRenderLoop(): void {
    const loop = (): void => {
      this.animationId = requestAnimationFrame(loop);

      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
      this.lastTime = now;

      if (this.isPlaying && !this.isGameOver) {
        // Fixed physics timestep accumulator
        this.physicsAccumulator += dt;
        const physicsStep = 1 / 60; // 遵循 Rapier 預設設定
        while (this.physicsAccumulator >= physicsStep) {
          this.physics.world.step(this.eventQueue);
          this.mergeSystem.processContactEvents(this.eventQueue);
          this.physicsAccumulator -= physicsStep;
        }
        
        // 只需在物理算完後同步一次視覺
        this.mergeSystem.syncAll();

        this.checkGameOver();
      } else {
        // 非遊玩狀態且需要物理計算時（如結算畫面）
        this.physicsAccumulator += dt;
        const physicsStep = 1 / 60;
        while (this.physicsAccumulator >= physicsStep) {
          this.physics.step();
          this.physicsAccumulator -= physicsStep;
        }
        this.mergeSystem.syncAll();
      }

      // FX (always update)
      this.particleSystem.update(dt);
      this.gridFlow.update(dt);

      // Camera Orbit 先設定正確軌道位置，然後 shake 在其上偏移
      this.cameraOrbit.update(dt);
      this.updateCameraShake();

      // Render
      this.postProcessing.render();
      this.sceneManager.renderCSS2D();

      // NEXT preview — [PERF] 已改為 on-demand，不再每幀渲染

      // FPS
      this.frameCount++;
      if (now - this.lastFpsTime >= 1000) {
        this.fpsEl.textContent = `FPS: ${this.frameCount}`;
        this.frameCount = 0;
        this.lastFpsTime = now;
      }
    };
    loop();
  }

  private updateCameraShake(): void {
    if (this.shakeIntensity > SHAKE_THRESHOLD) {
      // cameraOrbit.update() 已在此之前設定了正確的軌道位置
      // 這裡只做一次性偏移，下一幀 orbit.update 會重設回正確位置
      const cam = this.sceneManager.camera;
      cam.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      cam.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= SHAKE_DECAY;
    } else {
      this.shakeIntensity = 0;
    }
  }

  stopRenderLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
