import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 超強力なグローバル・エラーバウンダリ（画面のブラックアウトを完全に阻止してエラーを可視化）
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '30px',
          backgroundColor: '#12000c',
          color: '#ff66aa',
          fontFamily: 'Consolas, monospace',
          minHeight: '100vh',
          boxSizing: 'border-box',
          border: '3px solid #ff007f',
          boxShadow: '0 0 30px rgba(255, 0, 127, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h1 style={{ 
            color: '#fff', 
            textShadow: '0 0 10px #ff007f, 0 0 20px #ff007f', 
            borderBottom: '2px solid #ff007f', 
            paddingBottom: '15px',
            margin: 0,
            fontFamily: 'Orbitron, sans-serif',
            letterSpacing: '2px'
          }}>
            [⚠️ ENGINE CRASH DETECTED]
          </h1>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>
              <strong style={{ color: '#fff' }}>CRITICAL ERROR:</strong> {this.state.error && this.state.error.message}
            </p>
          </div>
          {this.state.error && (
            <pre style={{
              backgroundColor: '#050005',
              padding: '20px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 0, 127, 0.2)',
              overflowX: 'auto',
              color: '#ff88cc',
              fontSize: '0.85rem',
              lineHeight: '1.5',
              margin: 0
            }}>
              {this.state.error.stack}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={async () => {
                localStorage.clear();
                sessionStorage.clear();
                
                // Unregister all service workers to kill off persistent stale cache providers
                if ('serviceWorker' in navigator) {
                  try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                      await reg.unregister();
                    }
                  } catch (e) {
                    console.error("SW unregister failed:", e);
                  }
                }

                // Delete all caches (CacheStorage API) containing stale bundles
                if ('caches' in window) {
                  try {
                    const keys = await caches.keys();
                    for (const key of keys) {
                      await caches.delete(key);
                    }
                  } catch (e) {
                    console.error("Caches clear failed:", e);
                  }
                }

                // Force cache-bypassing reload
                window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff007f',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, sans-serif',
                boxShadow: '0 0 15px #ff007f'
              }}
            >
              キャッシュと全設定を強制クリアしてリセット
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#00f3ff',
                border: '1px solid #00f3ff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, sans-serif',
                boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)'
              }}
            >
              再起動
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('🤖 [PWA.SYSTEM] ServiceWorker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('🤖 [PWA.SYSTEM] ServiceWorker registration failed:', err);
      });
  });
}
