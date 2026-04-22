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

    let cleanup: (() => void) | undefined;

    try {
      cleanup = initThreeGame({
        mount: mountRef.current,
        setCrash,
        setRoadInfo,
        setCarMapPos,
        toggleMiniMap: () => setMiniMap((p) => !p),
      });

      // 👉 focus canvas so keyboard works
      const canvas = mountRef.current.querySelector('canvas');
      if (canvas) {
        canvas.setAttribute('tabindex', '1');
        (canvas as HTMLCanvasElement).focus();
      }
    } catch (err) {
      console.error('Game init failed:', err);
    }

    return () => {
      cleanup && cleanup();
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
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden', // ✅ FIX scroll issue
      }}
    >
      {/* THREE CANVAS */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* ROAD INFO HUD */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(0,0,0,0.7)',
          color: '#00ff88',
          fontFamily: 'monospace',
          fontSize: 14,
          padding: '8px 16px',
          borderRadius: 6,
          borderLeft: '3px solid #00ff88',
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
          fontSize: 13,
          padding: '6px 14px',
          borderRadius: 6,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        🗺 Map [{miniMap ? 'ON' : 'OFF'}]
      </div>

      {/* MINI MAP PANEL */}
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
            border: '1px solid #555',
            overflow: 'hidden',
          }}
        >
          <svg width={MAP_W} height={MAP_H}>
            <rect width={MAP_W} height={MAP_H} fill="#2a4a2a" />

            {/* Car */}
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

      {/* CONTROLS HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 13,
          background: 'rgba(0,0,0,0.6)',
          padding: '10px 20px',
          borderRadius: 8,
        }}
      >
        W/↑ Accel | S/↓ Brake | A/← Left | D/→ Right | R Reset | M Map
      </div>

      {/* CRASH OVERLAY */}
      {crash && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          <h1
            style={{
              color: '#ff3333',
              fontSize: 60,
              fontFamily: 'monospace',
              margin: 0,
            }}
          >
            CRASH!
          </h1>
          <p style={{ color: '#fff', marginTop: 10 }}>
            Press <b>R</b> to restart
          </p>
        </div>
      )}
    </div>
  );
};

export default GameScene;