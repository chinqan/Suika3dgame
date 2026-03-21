/**
 * Main Entry Point — GDD Ch.6 §6.1
 * WASM Init → Game Init → Hide Loading Screen
 */
import { Game } from '@/game';

async function main(): Promise<void> {
  const loadingScreen = document.getElementById('loading-screen');

  try {
    console.log('[Neon Shape Merge 3D] Initializing...');

    // Create and initialize game
    const game = new Game();
    await game.init();

    console.log('[Neon Shape Merge 3D] Ready!');

    // Hide loading screen
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  } catch (error) {
    console.error('[Neon Shape Merge 3D] Init failed:', error);

    // Show error on loading screen
    if (loadingScreen) {
      const subtitle = loadingScreen.querySelector('.loading-subtitle');
      if (subtitle) {
        subtitle.textContent = 'INITIALIZATION FAILED — Check console for details';
        (subtitle as HTMLElement).style.color = '#FF3131';
      }
    }
  }
}

main();
