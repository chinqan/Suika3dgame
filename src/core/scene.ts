/**
 * SceneManager — GDD Ch.2 §2.1, Ch.3 §3.3
 * Manages Three.js Scene, Camera, Renderer, CSS2DRenderer
 */
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  BG_COLOR, FOG_DENSITY,
  CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR,
  CAMERA_POSITION, CAMERA_LOOKAT,
} from '@/constants';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public css2DRenderer: CSS2DRenderer;

  private container: HTMLElement;

  constructor(containerId = 'canvas-container') {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;

    // ---- Scene ----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.FogExp2(BG_COLOR, FOG_DENSITY);

    // ---- Camera ----
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
    this.camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
    this.camera.lookAt(CAMERA_LOOKAT.x, CAMERA_LOOKAT.y, CAMERA_LOOKAT.z);

    // ---- WebGL Renderer ----
    // [PERF] antialias off (bloom provides enough softening), pixelRatio capped at 1.5
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // ---- CSS2D Renderer ----
    this.css2DRenderer = new CSS2DRenderer();
    this.css2DRenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2DRenderer.domElement.style.position = 'absolute';
    this.css2DRenderer.domElement.style.top = '0';
    this.css2DRenderer.domElement.style.left = '0';
    this.css2DRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.css2DRenderer.domElement);

    // ---- Resize ----
    this.onResize();
    window.addEventListener('resize', this.onResize.bind(this));
    window.visualViewport?.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.css2DRenderer.setSize(w, h);
  }

  /** Base render (without post-processing) — used as fallback */
  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.css2DRenderer.render(this.scene, this.camera);
  }

  /** Render only CSS2D overlay */
  renderCSS2D(): void {
    this.css2DRenderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}
