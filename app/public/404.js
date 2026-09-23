// Navigation and the error message work even when WebGL or the CDN is unavailable.
const motion = document.getElementById('motion');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let world, paused = preference.matches;
function syncMotion() {
  world?.setMotion(!paused);
  motion.textContent = paused ? 'Resume motion' : 'Pause motion';
  motion.setAttribute('aria-pressed', String(paused));
}
motion.addEventListener('click', () => { paused = !paused; syncMotion(); });
preference.addEventListener('change', event => { paused = event.matches; syncMotion(); });

try {
  const { mountIdle } = await import('/tree/main.js');
  world = mountIdle(document.getElementById('scene'), {
    allowQueryParams: false,
    motion: !paused,
    viewportInsets: () => ({
      top: 72,
      bottom: document.querySelector('.lost-message').getBoundingClientRect().height + 90,
    }),
  });
  await world.ready;
  syncMotion();
  motion.hidden = false;
} catch {
  world?.dispose();
  document.getElementById('scene').hidden = true;
}
