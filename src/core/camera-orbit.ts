/**
 * CameraOrbit — 水平環繞攝影機控制器
 * 支援：左鍵拖曳旋轉、方向鍵旋轉、H 鍵重置
 * 鎖定只能左右旋轉（水平軌道），Y 軸高度不變
 */
import * as THREE from 'three';
import { CAMERA_POSITION, CAMERA_LOOKAT } from '@/constants';

export class CameraOrbit {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // 軌道參數
  private angle = 0; // 當前水平角度 (radians)
  private defaultAngle = 0;
  private readonly orbitRadius: number;
  private readonly orbitY: number;
  private readonly lookAtTarget = new THREE.Vector3(CAMERA_LOOKAT.x, CAMERA_LOOKAT.y, CAMERA_LOOKAT.z);

  // 拖曳狀態
  private isDragging = false;
  private dragStartX = 0;
  private totalDragDelta = 0;
  private readonly DRAG_THRESHOLD = 5; // px, 超過此值視為拖曳而非點擊
  private readonly DRAG_SENSITIVITY = 0.005; // radians per pixel

  // 方向鍵狀態
  private keysPressed = new Set<string>();
  private readonly KEY_SPEED = 1.5; // radians per second

  /** 是否正在拖曳（用於讓 input.ts 判斷是否要抑制 drop） */
  public get wasDragging(): boolean {
    return Math.abs(this.totalDragDelta) > this.DRAG_THRESHOLD;
  }

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    // 計算初始攝影機從 lookAt 點到預設位置的水平距離與高度
    const dx = CAMERA_POSITION.x - CAMERA_LOOKAT.x;
    const dz = CAMERA_POSITION.z - CAMERA_LOOKAT.z;
    this.orbitRadius = Math.sqrt(dx * dx + dz * dz);
    this.orbitY = CAMERA_POSITION.y;

    // 計算初始角度
    this.angle = Math.atan2(dx, dz);
    this.defaultAngle = this.angle;

    this.bindEvents();
  }

  // 觸控兩指狀態
  private isTwoFingerTouch = false;
  private twoFingerStartX = 0;

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // 觸控兩指旋轉
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'touch') return; // 觸控裝置交給 touch 事件處理
    if (e.button !== 0) return; // 只處理左鍵
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.totalDragDelta = 0;
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerType === 'touch') return; // 觸控裝置交給 touch 事件處理
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    this.totalDragDelta = dx;

    if (Math.abs(dx) > this.DRAG_THRESHOLD) {
      this.angle -= dx * this.DRAG_SENSITIVITY;
      this.updateCamera();
      this.dragStartX = e.clientX;
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    this.isDragging = false;
    setTimeout(() => { this.totalDragDelta = 0; }, 50);
  }

  // ---- 觸控兩指環繞 ----

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault(); // 防止頁面縮放
      this.isTwoFingerTouch = true;
      // 取兩指中點的 X
      this.twoFingerStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isTwoFingerTouch || e.touches.length < 2) return;
    e.preventDefault();
    const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const dx = currentX - this.twoFingerStartX;

    if (Math.abs(dx) > 2) {
      this.angle -= dx * this.DRAG_SENSITIVITY;
      this.updateCamera();
      this.twoFingerStartX = currentX;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) {
      this.isTwoFingerTouch = false;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.keysPressed.add(e.key);
    }
    if (e.key === 'h' || e.key === 'H') {
      this.resetToDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysPressed.delete(e.key);
  }

  /** 每幀更新：處理方向鍵旋轉 + 強制重設軌道位置（給 shake 一個乾淨的基底） */
  update(dt: number): void {
    if (this.keysPressed.has('ArrowLeft')) {
      this.angle += this.KEY_SPEED * dt;
    }
    if (this.keysPressed.has('ArrowRight')) {
      this.angle -= this.KEY_SPEED * dt;
    }
    // 每幀都重設攝影機到正確軌道位置，防止 shake 偏移累積
    this.updateCamera();
  }

  /** 重置到預設視角 */
  resetToDefault(): void {
    this.angle = this.defaultAngle;
    this.updateCamera();
  }

  /** 更新攝影機位置 */
  private updateCamera(): void {
    const x = this.lookAtTarget.x + Math.sin(this.angle) * this.orbitRadius;
    const z = this.lookAtTarget.z + Math.cos(this.angle) * this.orbitRadius;
    this.camera.position.set(x, this.orbitY, z);
    this.camera.lookAt(this.lookAtTarget);
  }

  dispose(): void {
    this.keysPressed.clear();
  }
}
