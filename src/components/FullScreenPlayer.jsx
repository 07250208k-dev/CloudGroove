import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, X, MonitorPlay, Sparkles } from 'lucide-react';

const FullScreenPlayer = ({
  isPlaying,
  setIsPlaying,
  currentTrack,
  trackMetadata = null,
  progress,
  duration,
  onSeek,
  formatTime,
  playNext,
  playPrev,
  analyser,
  onClose,
  onTogglePiP,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  eqGains,
  onEqChange,
  onApplyPreset,
  isAsmrMode = false
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [bassScale, setBassScale] = useState(1);

  useEffect(() => {
    // ESCキーで閉じる
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ラジアル（円形）スペクトルビジュアライザーの描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const bars = 90; // 円形に並べるバーの数
    const dummyDataArray = new Uint8Array(bars);
    for(let i = 0; i < bars; i++) {
      dummyDataArray[i] = 20;
    }

    // サイバー演出用パーティクルシステム
    const particles = [];

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.20; // 中央のホログラムディスクの半径

      let drawData = new Uint8Array(bars);
      let averageBass = 0;

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const realDataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(realDataArray);

        // 低音域の強さを解析して、中央のディスクをビートに合わせて脈打たせる
        let bassSum = 0;
        const bassBandCount = 8; // 最初の方の数バンド（低音域）
        for(let i = 0; i < bassBandCount; i++) {
          bassSum += realDataArray[i];
        }
        averageBass = bassSum / bassBandCount;
        // 低音の強さに応じてスケール係数を算出 (1.0 〜 1.28)
        const scaleVal = 1 + (averageBass / 255) * 0.28;
        setBassScale(scaleVal);

        // 周波数データを円形サンプリング
        for (let i = 0; i < bars; i++) {
          const sampleIndex = Math.floor((i / bars) * bufferLength * 0.7);
          drawData[i] = realDataArray[sampleIndex] || 0;
        }
      } else {
        // 非再生時・未同期時
        setBassScale(1);
        for (let i = 0; i < bars; i++) {
          if (isPlaying) {
            const target = Math.random() * 150 + 20;
            dummyDataArray[i] = dummyDataArray[i] + (target - dummyDataArray[i]) * 0.15;
          } else {
            dummyDataArray[i] = Math.max(10, dummyDataArray[i] * 0.9);
          }
          drawData[i] = dummyDataArray[i];
        }
      }

      // ビート（低音）に合わせてネオンダストパーティクルを放出
      if (isPlaying && averageBass > 100) {
        const pCount = Math.min(5, Math.floor(averageBass / 40));
        for (let p = 0; p < pCount; p++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          const decay = Math.random() * 0.015 + 0.01;
          particles.push({
            x: centerX + Math.cos(angle) * (baseRadius * bassScale),
            y: centerY + Math.sin(angle) * (baseRadius * bassScale),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1,
            alpha: 1,
            decay: decay,
            color: isAsmrMode
              ? (Math.random() > 0.5 ? '0, 255, 204' : '140, 0, 255')
              : (Math.random() > 0.5 ? '0, 243, 255' : '255, 0, 127') // シアンかネオンピンク
          });
        }
      }

      // パーティクルの更新と描画
      ctx.shadowBlur = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgb(${p.color})`;
        ctx.fill();
        ctx.restore();
      }

      // 円形の外側へ広がるビジュアライザーの描画
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      for (let i = 0; i < bars; i++) {
        const value = drawData[i];
        // バーの長さの計算
        const barLength = (value / 255) * baseRadius * 1.3 + 2; 

        // 角度の算出 (全周に均等配置)
        const angle = i * (2 * Math.PI / bars);
        
        // 開始地点 (ホログラムディスクのフチ)
        const startX = centerX + Math.cos(angle) * (baseRadius * bassScale);
        const startY = centerY + Math.sin(angle) * (baseRadius * bassScale);

        // 終了地点 (バーの長さ分外側へ)
        const endX = centerX + Math.cos(angle) * (baseRadius * bassScale + barLength);
        const endY = centerY + Math.sin(angle) * (baseRadius * bassScale + barLength);

        // サイバーパンクグラデーションカラーの決定
        const percent = i / bars;
        let r, g, b;
        if (isAsmrMode) {
          if (percent < 0.5) {
            r = 0; g = 255; b = 204; // オーロラエメラルド
          } else {
            r = 140; g = 0; b = 255; // ルナバイオレット
          }
        } else {
          if (percent < 0.33) {
            r = 0; g = 243; b = 255; // シアン
          } else if (percent < 0.66) {
            r = 181; g = 0; b = 255; // パープル
          } else {
            r = 255; g = 0; b = 127; // ピンク
          }
        }

        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.shadowBlur = Math.min(20, barLength / 3);
        ctx.shadowColor = `rgb(${r},${g},${b})`;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // スペクトルの先端に光るネオンドットを描画
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      // サイバーな「グリッド円」を周囲に描く
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * bassScale * 1.5, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * bassScale * 2.0, 0, 2 * Math.PI);
      ctx.stroke();

      // レトロ液晶スキャンライン
      ctx.fillStyle = isAsmrMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.18)';
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

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = clickX / width;
    const newTime = clickPercent * duration;
    onSeek(newTime);
  };

  return (
    <div className={`fullscreen-overlay ${isAsmrMode ? 'asmr-theme' : ''}`}>
      {/* サイバーなグリッド背景 */}
      <div className="cyber-grid"></div>

      {/* トップコントロールバー */}
      <header className="fs-header">
        <div className="brand">
          <span className="neon-text-pink" style={{ fontFamily: 'monospace' }}>[SYS.MODE.FULLSCREEN]</span>
          <h1 className="glitch" data-text="CloudGroove">CloudGroove</h1>
        </div>

        <div className="fs-action-buttons" style={{ display: 'flex', gap: '15px' }}>
          <button className="fs-icon-btn glow-cyan" onClick={onTogglePiP} title="デスクトップへ投射 (PiP)">
            <MonitorPlay size={22} />
            <span style={{ fontSize: '0.75rem', fontFamily: 'Orbitron', marginLeft: '5px' }}>PIP</span>
          </button>
          <button className="fs-icon-btn glow-pink" onClick={onClose} title="閉じる (ESC)">
            <X size={26} />
          </button>
        </div>
      </header>

      {/* メインビジュアルエリア */}
      <div className="fs-visual-container">
        {/* レトロフューチャーな液晶スペクトル */}
        <canvas ref={canvasRef} className="fs-canvas"></canvas>

        <div 
          className="hologram-disk"
          style={{
            transform: `translate(-50%, -50%) scale(${bassScale})`,
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        >
          <div className="disk-inner" style={{
            backgroundImage: (trackMetadata && trackMetadata.coverUrl) 
              ? `url('${trackMetadata.coverUrl}')` 
              : "url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `2px solid ${isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)'}`,
            boxShadow: `0 0 20px ${isAsmrMode ? 'rgba(0, 255, 204, 0.4)' : 'rgba(0, 243, 255, 0.4)'}`
          }}>
            <div className="disk-core" style={{
              background: 'rgba(0,0,0,0.85)',
              border: '1px solid var(--neon-pink)'
            }}></div>
          </div>
        </div>

        {/* 左側：システムステータスログ（サイバー演出）＆ イコライザーHUD */}
        <div className="fs-side-panel left-panel" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px',
          borderLeft: `3px solid ${isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)'}`
        }}>
          <div>
            <h3>SYSTEM ANALYSIS</h3>
            <div className="system-log" style={{ fontSize: '0.75rem', height: '110px' }}>
              <p className="neon-text-cyan">&gt; AUDIO BUFFER INITIALIZED</p>
              <p>&gt; BITRATE: 320KBPS / STEADY</p>
              <p className="neon-text-pink">&gt; BEAT DETECTOR STATUS: OK</p>
              <p style={{
                color: eqGains.some(g => g !== 0) ? 'var(--neon-cyan)' : 'var(--text-muted)',
                animation: eqGains.some(g => g !== 0) ? 'pulse-fast 1s infinite alternate' : 'none'
              }}>
                &gt; EQ STATUS: {eqGains.some(g => g !== 0) ? 'ACTIVE' : 'BYPASS (FLAT)'}
              </p>
              <p className="neon-text-green">&gt; SPECTRUM LOCK: ACTIVE</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0, 243, 255, 0.2)', paddingTop: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <Sparkles size={14} /> HUD GRAPHIC EQ
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, padding: '0 5px', minHeight: '120px' }}>
              {[60, 230, 910, 3600, 14000].map((freq, idx) => (
                <div key={freq} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <input 
                    type="range" 
                    min="-12" 
                    max="12" 
                    value={eqGains[idx]} 
                    onChange={(e) => onEqChange(idx, e.target.value)}
                    style={{
                      writingMode: 'vertical-lr', 
                      direction: 'rtl', 
                      height: '80px', 
                      accentColor: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)', 
                      cursor: 'ns-resize',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      outline: 'none'
                    }} 
                  />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'monospace' }}>
                    {freq > 1000 ? `${freq/1000}k` : freq}
                  </span>
                  <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: eqGains[idx] > 0 ? 'var(--neon-cyan)' : eqGains[idx] < 0 ? 'var(--neon-pink)' : '#666', marginTop: '2px' }}>
                    {eqGains[idx] > 0 ? `+${eqGains[idx]}` : eqGains[idx]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => onApplyPreset(isAsmrMode ? [-8, -2, 5, 8, 4] : [10, 5, -1, 0, 2])}
                style={{
                  flex: 1, 
                  padding: '5px 0', 
                  fontSize: '0.65rem', 
                  backgroundColor: 'rgba(0,0,0,0.6)', 
                  border: `1px solid ${isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-pink)'}`, 
                  color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-pink)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'Orbitron'
                }}
              >
                {isAsmrMode ? 'WHISPER' : 'BASS'}
              </button>
              <button 
                onClick={() => onApplyPreset(isAsmrMode ? [-12, -4, 2, 10, 12] : [-12, -3, 8, 4, -10])}
                style={{
                  flex: 1, 
                  padding: '5px 0', 
                  fontSize: '0.65rem', 
                  backgroundColor: 'rgba(0,0,0,0.6)', 
                  border: `1px solid ${isAsmrMode ? 'var(--neon-asmr-purple, #8c00ff)' : 'var(--neon-cyan)'}`, 
                  color: isAsmrMode ? 'var(--neon-asmr-purple, #8c00ff)' : 'var(--neon-cyan)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'Orbitron'
                }}
              >
                {isAsmrMode ? 'CLEANING' : 'RADIO'}
              </button>
              <button 
                onClick={() => onApplyPreset([0, 0, 0, 0, 0])}
                style={{
                  flex: '1 1 100%', 
                  padding: '5px 0', 
                  fontSize: '0.65rem', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'Orbitron',
                  marginTop: '5px'
                }}
              >
                FLAT
              </button>
            </div>
          </div>
        </div>

        {/* 右側：現在の楽曲情報 */}
        <div className="fs-side-panel right-panel" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px',
          borderRight: `3px solid ${isAsmrMode ? 'var(--neon-asmr-purple, #8c00ff)' : 'var(--neon-pink)'}`
        }}>
          <span className="badge">NOW PLAYING</span>
          
          {/* アルバムアートの大きなサイバーフレーム表示 */}
          <div style={{
            width: '100%',
            aspectRatio: '1/1',
            borderRadius: '10px',
            border: `2px solid ${isAsmrMode ? 'var(--neon-asmr-purple, #8c00ff)' : 'var(--neon-pink)'}`,
            boxShadow: `0 0 25px ${isAsmrMode ? 'rgba(140, 0, 255, 0.35)' : 'rgba(255, 0, 127, 0.35)'}`,
            backgroundImage: (trackMetadata && trackMetadata.coverUrl) 
              ? `url('${trackMetadata.coverUrl}')` 
              : "url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* スキャンライン重ね合わせ */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
              backgroundSize: '100% 4px, 6px 100%',
              pointerEvents: 'none'
            }}></div>
          </div>

          <h2 className="neon-text-cyan track-name-large" style={{ marginTop: '5px', fontSize: '1.4rem' }}>
            {trackMetadata ? trackMetadata.title : (currentTrack ? currentTrack.name : 'NO CONNECTION')}
          </h2>
          <p className="artist-name-large" style={{ color: '#fff', fontSize: '1rem', opacity: 0.9 }}>
            {trackMetadata ? trackMetadata.artist : 'UNKNOWN ARTIST'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            ALBUM: {trackMetadata ? trackMetadata.album : 'UNKNOWN ALBUM'}
          </p>
          
          <div className="track-stats" style={{ marginTop: 'auto' }}>
            <div>
              <span>SIZE:</span>
              <span className="val" style={{ color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)' }}>
                {currentTrack ? `${(currentTrack.size / (1024 * 1024)).toFixed(1)} MB` : '0.0 MB'}
              </span>
            </div>
            <div>
              <span>TYPE:</span>
              <span className="val" style={{ color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)' }}>
                {currentTrack ? currentTrack.mimeType.split('/')[1].toUpperCase() : 'UNKNOWN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 下部大型操作パネル */}
      <footer className="fs-footer" style={{ borderTop: `1px solid ${isAsmrMode ? 'var(--neon-asmr-purple, #8c00ff)' : 'var(--neon-pink)'}` }}>
        <div className="fs-controls-container">
          {/* 進捗バー */}
          <div className="fs-progress-wrap">
            <span className="time fs-time">{formatTime(progress)}</span>
            <div className="fs-progress-bg" onClick={handleProgressClick}>
              <div 
                className="fs-progress-fill" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: isAsmrMode ? 'linear-gradient(90deg, var(--neon-asmr-emerald) 0%, var(--neon-asmr-purple) 100%)' : 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-pink) 100%)',
                  boxShadow: `0 0 15px ${isAsmrMode ? 'var(--neon-asmr-emerald)' : 'var(--neon-pink)'}`
                }}
              ></div>
            </div>
            <span className="time fs-time">{formatTime(duration)}</span>
          </div>

          {/* メイン操作ボタン */}
          <div className="fs-main-buttons">
            <button 
              className={`fs-btn secondary-btn ${isShuffle ? 'neon-text-cyan glow-cyan' : ''}`} 
              onClick={onToggleShuffle}
              disabled={!currentTrack}
              title={isShuffle ? "シャッフル再生: ON [SYS.SHUFFLE.ACTIVE]" : "シャッフル再生: OFF"}
            >
              <Shuffle size={22} />
            </button>
            
            <button className="fs-btn" onClick={playPrev} disabled={!currentTrack}><SkipBack size={26} /></button>
            
            <button 
              className="fs-btn fs-play-btn pulse-glow-btn" 
              onClick={setIsPlaying}
              disabled={!currentTrack}
            >
              {isPlaying ? <Pause size={30} color="#000" /> : <Play size={30} color="#000" />}
            </button>
            
            <button className="fs-btn" onClick={playNext} disabled={!currentTrack}><SkipForward size={26} /></button>
            
            <button 
              className={`fs-btn secondary-btn ${repeatMode !== 'none' ? 'neon-text-pink glow-pink' : ''}`} 
              onClick={onToggleRepeat}
              disabled={!currentTrack}
              style={{ position: 'relative' }}
              title={
                repeatMode === 'all' 
                  ? "リスト全ループ [SYS.LOOP.ALL]" 
                  : repeatMode === 'one' 
                    ? "1曲リピート [SYS.LOOP.ONE]" 
                    : "ループ再生: OFF"
              }
            >
              <Repeat size={22} />
              {repeatMode === 'one' && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '3px',
                    right: '3px',
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--neon-pink)',
                    color: '#000',
                    borderRadius: '50%',
                    width: '13px',
                    height: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Orbitron',
                    boxShadow: '0 0 5px var(--neon-pink)'
                  }}
                >
                  1
                </span>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FullScreenPlayer;
