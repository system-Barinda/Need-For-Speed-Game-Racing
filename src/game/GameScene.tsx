import { useEffect, useRef, useState } from 'react';
import { initThreeGame } from './ThreeSetup';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [crash, setCrash] = useState(false);
  const [miniMap, setMiniMap] = useState(false);
  const [roadInfo, setRoadInfo] = useState('HIGHWAY');
  const [carMapPos, setCarMapPos] = useState({ x: 0, z: 0 });

  useEffect(() => {
    if (!mountRef.current) return;

    // Prevent double initialization
    if (cleanupRef.current) return;

    try {
      cleanupRef.current = initThreeGame({
        mount: mountRef.current,
        setCrash,
        setRoadInfo,
        setCarMapPos,
        toggleMiniMap: () => setMiniMap((p) => !p),
      });

      // Focus canvas for keyboard input
      setTimeout(() => {
        const canvas = mountRef.current?.querySelector('canvas');
        if (canvas) {
          canvas.setAttribute('tabindex', '1');
          (canvas as HTMLCanvasElement).focus();
        }
      }, 0);

    } catch (err) {
      console.error('Game init failed:', err);
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
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
    <div
      style={{
        position: 'fixed', // ✅ FIX: prevents scroll issues
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* THREE CANVAS */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* ROAD INFO */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(0,0,0,0.7)',
          color: '#00ff88',
          fontFamily: 'monospace',
          padding: '8px 16px',
          borderRadius: 6,
        }}
      >
        📍 {roadInfo}
      </div>

      {/* MINI MAP TOGGLE */}
      <div
        onClick={() => setMiniMap((p) => !p)}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(0,0,0,0.7)',
          color: '#ffdd88',
          fontFamily: 'monospace',
          padding: '6px 14px',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        🗺 Map [{miniMap ? 'ON' : 'OFF'}]
      </div>

      {/* MINI MAP */}
      {miniMap && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            right: 16,
            width: MAP_W,
            height: MAP_H,
            background: 'rgba(0,0,0,0.8)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <svg width={MAP_W} height={MAP_H}>
            <rect width={MAP_W} height={MAP_H} fill="#2a4a2a" />

            <circle
              cx={carMX}
              cy={carMY}
              r={4}
              fill="#ff4422"
              stroke="#fff"
              strokeWidth={1}
            />
          </svg>
        </div>
      )}

      {/* CONTROLS */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.6)',
          padding: '10px 20px',
          borderRadius: 8,
        }}
      >
        W/↑ Accel | S/↓ Brake | A/← Left | D/→ Right | R Reset | M Map
      </div>

      {/* CRASH */}
      {crash && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.6)',
          }}
        >
          <h1 style={{ color: '#ff3333', fontSize: 60 }}>
            CRASH!
          </h1>
          <p style={{ color: '#fff' }}>
            Press <b>R</b> to restart
          </p>
        </div>
      )}
    </div>
  );
};

export default GameScene;