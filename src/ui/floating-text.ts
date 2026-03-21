/**
 * FloatingText — GDD Ch.4 §4.5
 * CSS2DObject for score/combo popups in 3D space
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function spawnFloatingScore(
  scene: THREE.Scene,
  position: THREE.Vector3,
  score: number,
  colorHex: string,
): void {
  const div = document.createElement('div');
  div.className = 'floating-score';
  div.textContent = `+${score}`;
  div.style.color = colorHex;
  div.style.textShadow = `0 0 10px ${colorHex}`;

  const label = new CSS2DObject(div);
  label.position.copy(position);
  label.position.y += 0.5;
  scene.add(label);

  // Auto-remove after animation
  setTimeout(() => {
    scene.remove(label);
    div.remove();
  }, 800);
}

export function spawnFloatingCombo(
  scene: THREE.Scene,
  position: THREE.Vector3,
  comboCount: number,
): void {
  const div = document.createElement('div');
  div.className = 'floating-combo';
  div.textContent = `COMBO ×${comboCount}`;
  const size = 18 + comboCount * 2;
  div.style.fontSize = `${Math.min(size, 36)}px`;

  const label = new CSS2DObject(div);
  label.position.copy(position);
  label.position.y += 1.5;
  scene.add(label);

  setTimeout(() => {
    scene.remove(label);
    div.remove();
  }, 1000);
}
