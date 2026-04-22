import { useEffect, useRef, useState } from 'react';
import { initThreeGame } from './ThreeSetup';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  const [crash, setCrash] = useState(false);
  const [miniMap, setMiniMap] = useState(false);
  const [roadInfo, setRoadInfo] = useState('HIGHWAY');
  const [carMapPos, setCarMapPos] = useState({ x: 0, z: 0 });

  useEffect(() => {
    if (!mountRef.current || initialized.current) return;
    initialized.current = true;

    const cleanup = initThreeGame({
      mount: mountRef.current,
      setCrash,
      setRoadInfo,
      setCarMapPos,
      toggleMiniMap: () => setMiniMap((p) => !p),
    });

    return () => {
      cleanup();
      initialized.current = false;
    };
  }, []);

  // ── Mini-map helpers ──
  const MAP_SCALE = 0.08;
  const MAP_W = 240;
  const MAP_H = 240;
  const MAP_CX = MAP_W / 2;
  const MAP_CY = MAP_H / 2;

  const toMap = (x: number, z: number) => ({
    mx: MAP_CX + x * MAP_SCALE,
    my: MAP_CY + z * MAP_SCALE,
  });

  const { mx: carMX, my: carMY } = toMap(carMapPos.x, carMapPos.z);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* HUD */}
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#0f8' }}>
        📍 {roadInfo}
      </div>

      {/* Mini-map toggle */}
      <div
        onClick={() => setMiniMap((p) => !p)}
        style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer' }}
      >
        🗺 Map [{miniMap ? 'ON' : 'OFF'}]
      </div>

      {/* Mini-map */}
      {miniMap && (
        <div style={{ position: 'absolute', bottom: 70, right: 16 }}>
          <svg width={MAP_W} height={MAP_H}>
            <rect width={MAP_W} height={MAP_H} fill="#2a4a2a" />
            <circle cx={carMX} cy={carMY} r={4} fill="red" />
          </svg>
        </div>
      )}

      {/* Crash */}
      {crash && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <h1 style={{ color: 'red' }}>CRASH! Press R</h1>
        </div>
      )}
    </div>
  );
};

export default GameScene;
