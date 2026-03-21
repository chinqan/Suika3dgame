/**
 * Post-Processing — GDD Ch.3 §3.3
 * EffectComposer + UnrealBloomPass for neon glow
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD } from '@/constants';

export class PostProcessing {
  public composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.composer = new EffectComposer(renderer);

    // 1. Render Pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. Bloom Pass — [PERF] Half resolution for ~75% GPU savings
    const size = new THREE.Vector2(
      Math.floor(window.innerWidth / 2),
      Math.floor(window.innerHeight / 2),
    );
    this.bloomPass = new UnrealBloomPass(size, BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
    this.composer.addPass(this.bloomPass);

    // 3. Output Pass (tone mapping + color space)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Resize handler
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.composer.setSize(w, h);
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.composer.dispose();
  }
}
