import React, { useEffect, useRef } from 'react';
import { HardDrive } from 'lucide-react';

const SpectrumVisualizer = ({ isPlaying, analyser = null, isAsmrMode = false, trackMetadata = null }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas internal dimensions to match display size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const bars = 64;
    // フォールバック用のダミーデータバッファ
    const dummyDataArray = new Uint8Array(bars);
    for(let i = 0; i < bars; i++) {
      dummyDataArray[i] = 10;
    }

    const draw = () => {
      if (!ctx || !canvas) return;

      // 動的カラー定義（テーマ対応）
      const styles = window.getComputedStyle(document.documentElement);
      const cyanVar = styles.getPropertyValue('--neon-cyan').trim() || '#00f3ff';
      const pinkVar = styles.getPropertyValue('--neon-pink').trim() || '#ff007f';

      const hexToRgbStr = (hex) => {
        const c = hex.replace('#', '').trim();
        if (c.length === 3) {
          const r = parseInt(c[0] + c[0], 16);
          const g = parseInt(c[1] + c[1], 16);
          const b = parseInt(c[2] + c[2], 16);
          return `${r}, ${g}, ${b}`;
        } else if (c.length === 6) {
          const r = parseInt(c.substring(0, 2), 16);
          const g = parseInt(c.substring(2, 4), 16);
          const b = parseInt(c.substring(4, 6), 16);
          return `${r}, ${g}, ${b}`;
        }
        return '0, 243, 255'; // fallback
      };

      const rgbCyan = hexToRgbStr(cyanVar);
      const rgbPink = hexToRgbStr(pinkVar);

      const cyanParts = rgbCyan.split(',').map(Number);
      const pinkParts = rgbPink.split(',').map(Number);

      const barWidth = (canvas.width / bars) - 2;
      let x = 0;

      let drawData = new Uint8Array(bars);

      if (analyser && isPlaying) {
        // 本物の周波数アナライザーからデータを引き出す
        const bufferLength = analyser.frequencyBinCount;
        const realDataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(realDataArray);
        
        // 128個の周波数帯域から64個をサンプリング（高周波と低周波をブレンド）
        for (let i = 0; i < bars; i++) {
          // 少し低周波側を強調してダイナミックにするために補正
          const sampleIndex = Math.floor((i / bars) * bufferLength * 0.8);
          drawData[i] = realDataArray[sampleIndex] || 0;
        }
      } else {
        // フォールバック（再生停止中、または未同期状態）
        for (let i = 0; i < bars; i++) {
          if (isPlaying) {
            // ダミーのアニメーション
            const target = Math.random() * 255;
            dummyDataArray[i] = dummyDataArray[i] + (target - dummyDataArray[i]) * 0.2;
          } else {
            // 減衰
            dummyDataArray[i] = Math.max(10, dummyDataArray[i] * 0.85);
          }
          drawData[i] = dummyDataArray[i];
        }
      }

      if (isAsmrMode) {
        // 🌌 ASMR 水面波紋（円形）ビジュアライザー (Cybernetic Slumber)
        // わずかに前のフレームを残すことで幻想的な残像エフェクトを作成
        ctx.fillStyle = 'rgba(10, 5, 20, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.22;

        let totalVal = 0;
        for (let i = 0; i < bars; i++) {
          totalVal += drawData[i];
        }
        const avgVal = totalVal / bars;
        const pulse = (avgVal / 255) * 35; // 音圧に応じたダイナミックな脈動

        // 3本の優しく揺れる円形波紋を描画
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const radius = baseRadius + (rIdx * 35) + pulse * (1 - rIdx * 0.25);
          ctx.beginPath();
          
          for (let angle = 0; angle <= Math.PI * 2; angle += 0.04) {
            const sampleIndex = Math.floor((angle / (Math.PI * 2)) * bars);
            const val = drawData[sampleIndex % bars] || 0;
            // 周波数に応じた歪み ＆ サイン波による時間的な揺らぎ
            const waveOffset = (val / 255) * 20 * Math.sin(angle * (6 + rIdx) + Date.now() * 0.003);
            
            const xCoord = centerX + (radius + waveOffset) * Math.cos(angle);
            const yCoord = centerY + (radius + waveOffset) * Math.sin(angle);
            
            if (angle === 0) {
              ctx.moveTo(xCoord, yCoord);
            } else {
              ctx.lineTo(xCoord, yCoord);
            }
          }
          
          ctx.closePath();
          
          // オーロラエメラルド & ルナバイオレット
          ctx.lineWidth = rIdx === 0 ? 3 : 1.5;
          ctx.strokeStyle = rIdx === 0 ? 'rgba(0, 255, 204, 0.85)' : rIdx === 1 ? 'rgba(181, 0, 255, 0.55)' : 'rgba(0, 243, 255, 0.35)';
          
          ctx.shadowBlur = rIdx === 0 ? 15 : 6;
          ctx.shadowColor = rIdx === 0 ? '#00ffcc' : '#b500ff';
          ctx.stroke();
        }

        // 周囲を浮遊する微小な星屑（精神安定のためのパーティクル）
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + (Date.now() * 0.0006);
          const dist = baseRadius + 40 + (avgVal / 255) * 80 + (Math.sin(Date.now() * 0.0015 + i) * 15);
          const pX = centerX + dist * Math.cos(angle);
          const pY = centerY + dist * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(pX, pY, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // ⚡ 通常のサイバーパンク・バー状ビジュアライザー
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < bars; i++) {
          const value = drawData[i];
          const barHeight = (value / 255) * canvas.height * 0.95 + 4; // 最低4pxは描く

          const percent = i / bars;
          let r, g, b;
          if (percent < 0.5) {
            // Interpolate from Cyan (at percent = 0) towards Pink (at percent = 0.5)
            const factor = percent * 2;
            r = Math.floor(cyanParts[0] + (pinkParts[0] - cyanParts[0]) * factor);
            g = Math.floor(cyanParts[1] + (pinkParts[1] - cyanParts[1]) * factor);
            b = Math.floor(cyanParts[2] + (pinkParts[2] - cyanParts[2]) * factor);
          } else {
            // Interpolate from Pink (at percent = 0.5) towards Cyan (at percent = 1.0)
            const factor = (percent - 0.5) * 2;
            r = Math.floor(pinkParts[0] + (cyanParts[0] - pinkParts[0]) * factor);
            g = Math.floor(pinkParts[1] + (cyanParts[1] - pinkParts[1]) * factor);
            b = Math.floor(pinkParts[2] + (cyanParts[2] - pinkParts[2]) * factor);
          }

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.shadowBlur = Math.min(15, barHeight / 8);
          ctx.shadowColor = `rgb(${r},${g},${b})`;
          
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 2;
        }
      }

      // レトロ液晶の走査線（スキャンライン）効果をオーバーレイ (ASMRモード時は走査線もより優しく透過)
      ctx.fillStyle = isAsmrMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      for (let i = 0; i < canvas.height; i += 4) {
        ctx.fillRect(0, i, canvas.width, 1);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, analyser, isAsmrMode]);

  return (
    <div className="spectrum-container">
      {/* Outer Flex Layout to place the large square jacket to the left of the spectrogram box */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '35px',
        width: '100%',
        maxWidth: '1000px'
      }}>
        
        {/* 1. Large Rounded Square Album Jacket Cover (Outside the Box, with HUD corner ornaments) */}
        {(isPlaying || trackMetadata) && (
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0
            }}
          >
            {/* The Main Holographic Deck Panel */}
            <div 
              style={{
                width: '210px',
                height: '210px',
                borderRadius: '24px', /* さらに豊かな角丸 */
                background: 'rgba(10, 5, 20, 0.95)',
                border: `2px solid ${isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)'}`,
                boxShadow: isAsmrMode 
                  ? '0 0 35px rgba(0, 255, 204, 0.55), 0 10px 30px rgba(0,0,0,0.85), inset 0 0 20px rgba(0, 255, 204, 0.3)' 
                  : '0 0 30px rgba(0, 243, 255, 0.45), 0 10px 30px rgba(0,0,0,0.85), inset 0 0 20px rgba(0, 243, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 3
              }}
            >
              {/* HUD Corner Ornaments (Futuristic targeting reticle look) */}
              {/* Top-Left Corner */}
              <div style={{
                position: 'absolute', top: '10px', left: '10px', width: '16px', height: '16px',
                borderTop: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderLeft: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderTopLeftRadius: '4px',
                filter: `drop-shadow(0 0 5px ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'})`,
                pointerEvents: 'none'
              }} />
              {/* Top-Right Corner */}
              <div style={{
                position: 'absolute', top: '10px', right: '10px', width: '16px', height: '16px',
                borderTop: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderRight: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderTopRightRadius: '4px',
                filter: `drop-shadow(0 0 5px ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'})`,
                pointerEvents: 'none'
              }} />
              {/* Bottom-Left Corner */}
              <div style={{
                position: 'absolute', bottom: '10px', left: '10px', width: '16px', height: '16px',
                borderBottom: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderLeft: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderBottomLeftRadius: '4px',
                filter: `drop-shadow(0 0 5px ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'})`,
                pointerEvents: 'none'
              }} />
              {/* Bottom-Right Corner */}
              <div style={{
                position: 'absolute', bottom: '10px', right: '10px', width: '16px', height: '16px',
                borderBottom: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderRight: `3px solid ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'}`,
                borderBottomRightRadius: '4px',
                filter: `drop-shadow(0 0 5px ${isAsmrMode ? '#00ffcc' : 'var(--neon-cyan)'})`,
                pointerEvents: 'none'
              }} />

              {/* Holographic scanning overlay effect */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
                backgroundSize: '100% 4px, 6px 100%',
                pointerEvents: 'none',
                zIndex: 10
              }} />

              {trackMetadata?.coverUrl ? (
                <div 
                  style={{
                    width: 'calc(100% - 12px)',
                    height: 'calc(100% - 12px)',
                    backgroundImage: `url(${trackMetadata.coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '18px',
                    filter: isAsmrMode ? 'contrast(1.05) saturate(1.05)' : 'none'
                  }}
                />
              ) : (
                /* Fallback glowing square placeholder */
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    width: 'calc(100% - 12px)',
                    height: 'calc(100% - 12px)',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, #150d29 0%, #06020c 100%)',
                    gap: '12px'
                  }}
                >
                  <HardDrive size={44} style={{ 
                    color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)', 
                    filter: `drop-shadow(0 0 10px ${isAsmrMode ? 'rgba(0,255,204,0.7)' : 'rgba(0,243,255,0.7)'})` 
                  }} />
                  <span style={{ 
                    fontSize: '0.65rem', 
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                    letterSpacing: '1px'
                  }}>
                    NO_IMAGE
                  </span>
                </div>
              )}
            </div>

            {/* Sub-Metadata Status Text (Monospace HUD Style) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)',
              textShadow: isAsmrMode ? '0 0 5px rgba(0,255,204,0.4)' : '0 0 5px rgba(0,243,255,0.4)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase'
            }}>
              <span>[ {isAsmrMode ? 'SYS.MEDITATION.SYNC' : 'SYS.DEEP.AUDIO_DECK'} ]</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>
                HOLO_PROJECTOR_01 // ONLINE
              </span>
            </div>
          </div>
        )}

        {/* 2. The Spectrogram Box */}
        <div className="spectrum-box" style={{ margin: 0, flex: 1, maxWidth: '800px' }}>
          <div className="spectrum-header">
            <span className="glitch" data-text="[SYS.AUDIO.SPECTROGRAM]">[システム.オーディオ.スペクトログラム]</span>
            <span>FREQ: 20Hz - 20kHz | 状態: {isPlaying ? (analyser ? '実解析中' : 'シミュレート中') : '待機中'}</span>
          </div>
          
          {/* Inner Flex Row inside the box (Spinning Vinyl Disk + Canvas Wave) */}
          <div className="spectrum-canvas-wrap" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '24px', 
            padding: '16px 20px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.03)',
            height: '100%'
          }}>
            {/* Rotating Circular Vinyl Deck (Inside the Box, Left) */}
            <div 
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'rgba(10, 5, 20, 0.95)',
                border: `2px solid ${isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)'}`,
                boxShadow: isAsmrMode 
                  ? '0 0 20px rgba(0, 255, 204, 0.4), inset 0 0 12px rgba(0, 255, 204, 0.2)' 
                  : '0 0 15px rgba(0, 243, 255, 0.3), inset 0 0 12px rgba(0, 243, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                position: 'relative',
                animation: isPlaying ? 'spin 20s linear infinite' : 'none',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {trackMetadata?.coverUrl ? (
                <div 
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${trackMetadata.coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%'
                  }}
                />
              ) : (
                /* Fallback spinning vinyl disk core */
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(10,10,15,1) 35%, rgba(25,25,35,1) 75%, rgba(10,10,15,1) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  {/* Vinyl center labels */}
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isAsmrMode ? 'rgba(0, 255, 204, 0.15)' : 'rgba(0, 243, 255, 0.15)',
                      border: `1px solid ${isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 0 5px rgba(0,0,0,0.8)'
                    }}
                  >
                    <div 
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#0c0813',
                        border: `1px solid ${isAsmrMode ? 'rgba(0, 255, 204, 0.5)' : 'rgba(0, 243, 255, 0.5)'}`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: The visualizer canvas (Inside the Box, Right) */}
            <div style={{ flex: 1, height: '100px', position: 'relative' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectrumVisualizer;
