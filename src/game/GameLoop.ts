export const startGameLoop = (update: (delta: number) => void) => {
  let lastTime = 0;

  const animate = (time: number) => {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    update(delta);

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
};