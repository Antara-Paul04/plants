// Navigation and the error message work even when WebGL or the CDN is unavailable.
let world, paused = false;
function syncMotion() {
  world?.setMotion(!paused);
}

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
} catch {
  world?.dispose();
  document.getElementById('scene').hidden = true;
}
