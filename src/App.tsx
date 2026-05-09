import React from 'react';
import GameScene from './game/GameScene';

// Error boundary component for catching game errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[App] Game crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.errorContainer}>
          <h1 style={styles.errorTitle}> Game Error</h1>
          <p style={styles.errorMessage}>Something went wrong with the game.</p>
          <details style={styles.errorDetails}>
            <summary>Error Details</summary>
            <pre style={styles.errorPre}>{this.state.error?.message}</pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={styles.reloadButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0056b3';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#007bff';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
             Reload Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = React.useState(0);
  const [message, setMessage] = React.useState('Loading game assets...');

  React.useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        // Update loading message based on progress
        if (prev < 20) setMessage(' Initializing engine...');
        else if (prev < 40) setMessage(' Loading road system...');
        else if (prev < 60) setMessage(' Spawning vehicles...');
        else if (prev < 80) setMessage(' Loading textures...');
        else setMessage('✨ Almost ready...');
        
        return prev + 5;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  if (progress < 100) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <h1 style={styles.loadingTitle}> NEED FOR SPEED RACING </h1>
          <div style={styles.loadingBarContainer}>
            <div style={{ ...styles.loadingBar, width: `${progress}%` }} />
          </div>
          <p style={styles.loadingMessage}>{message}</p>
          <p style={styles.loadingProgress}>{progress}%</p>
        </div>
      </div>
    );
  }
  
  return null;
};

// Main App component
const App: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [showGame, setShowGame] = React.useState(false);

  React.useEffect(() => {
    // Simulate asset loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowGame(true);
    }, 1000);

    // Prevent default touch/mouse events that might interfere with game
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    document.addEventListener('contextmenu', preventContextMenu);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <div style={styles.appContainer}>
        {showGame && <GameScene />}
        
        {/* Optional: Game controls hint overlay */}
        {showGame && (
          <div style={styles.controlsHint}>
            <div style={styles.controlsContent}>
              <span style={styles.controlKey}>← →</span> or <span style={styles.controlKey}>A D</span> - Change Lane
              <span style={styles.controlKeySeparator}>|</span>
              <span style={styles.controlKey}>↑ ↓</span> or <span style={styles.controlKey}>W S</span> - Speed Control
              <span style={styles.controlKeySeparator}>|</span>
              <span style={styles.controlKey}>B</span> - Boost
              <span style={styles.controlKeySeparator}>|</span>
              <span style={styles.controlKey}>ESC</span> - Pause
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Styles object for better maintainability
const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    width: '100%',
    height: '100vh',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  
  loadingContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    fontFamily: "'Arial', sans-serif",
  },
  
  loadingContent: {
    textAlign: 'center',
    padding: '40px',
    borderRadius: '20px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    minWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  
  loadingTitle: {
    color: '#ffaa44',
    fontSize: '32px',
    marginBottom: '30px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  },
  
  loadingBarContainer: {
    width: '100%',
    height: '30px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '15px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  
  loadingBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff00, #ffff00, #ff0000)',
    transition: 'width 0.1s ease',
    borderRadius: '15px',
  },
  
  loadingMessage: {
    color: '#ffffff',
    fontSize: '16px',
    marginBottom: '10px',
  },
  
  loadingProgress: {
    color: '#ffaa44',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  
  errorContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #2a1a1a 0%, #1a0a0a 100%)',
    fontFamily: "'Arial', sans-serif",
    padding: '20px',
    boxSizing: 'border-box' as const,
  },
  
  errorTitle: {
    color: '#ff4444',
    fontSize: '48px',
    marginBottom: '20px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  },
  
  errorMessage: {
    color: '#ffffff',
    fontSize: '20px',
    marginBottom: '20px',
  },
  
  errorDetails: {
    color: '#cccccc',
    fontSize: '14px',
    marginBottom: '30px',
    maxWidth: '600px',
    textAlign: 'left' as const,
  },
  
  errorPre: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: '10px',
    borderRadius: '5px',
    overflow: 'auto',
    fontSize: '12px',
  },
  
  reloadButton: {
    padding: '12px 30px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  
  controlsHint: {
    position: 'absolute' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    pointerEvents: 'none' as const,
    animation: 'fadeInUp 0.5s ease-out',
  },
  
  controlsContent: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    padding: '12px 24px',
    borderRadius: '30px',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: "'Arial', sans-serif",
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  
  controlKey: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    margin: '0 4px',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  
  controlKeySeparator: {
    margin: '0 10px',
    color: '#ffaa44',
    fontWeight: 'bold',
  },
};

// Add CSS animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(styleSheet);

export default App;