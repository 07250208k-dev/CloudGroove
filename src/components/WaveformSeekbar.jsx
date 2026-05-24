import React, { useRef, useEffect, useState } from 'react';

const WaveformSeekbar = ({
  blob,
  progress = 0,
  duration = 0,
  onSeek,
  formatTime,
  isAsmrMode = false
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [peaks, setPeaks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSynthetic, setIsSynthetic] = useState(false);
  const [hoverPercent, setHoverPercent] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  // 音声ファイルの解析と波形データの抽出
  useEffect(() => {
    if (!blob) {
      setPeaks([]);
      setIsSynthetic(false);
      return;
    }

    // 巨大ファイル（30MB以上）はデコードせずに即座に美しい疑似波形を生成
    // ブラウザのクラッシュやフリーズを完璧に防ぎます
    if (blob.size > 30 * 1024 * 1024) {
      console.log(`[SYS.WAVEFORM] Large file detected (${(blob.size / (1024 * 1024)).toFixed(1)} MB). Generating synthetic cyberpunk waveform...`);
      generateSyntheticPeaks();
      return;
    }

    setLoading(true);
    let active = true;
    let audioCtx = null;

    const decode = async () => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        
        audioCtx.decodeAudioData(arrayBuffer, (audioBuffer) => {
          if (!active) {
            audioCtx.close();
            return;
          }
          
          const channelData = audioBuffer.getChannelData(0);
          const peaksCount = 140; // 波形の解像度
          const samplesPerPeak = Math.floor(channelData.length / peaksCount);
          const decodedPeaks = [];
          
          for (let i = 0; i < peaksCount; i++) {
            let max = 0;
            const start = i * samplesPerPeak;
            for (let j = 0; j < samplesPerPeak; j++) {
              const val = Math.abs(channelData[start + j]);
              if (val > max) max = val;
            }
            decodedPeaks.push(max);
          }
          
          // ピークの正規化
          const maxPeak = Math.max(...decodedPeaks) || 1;
          const normalizedPeaks = decodedPeaks.map(p => p / maxPeak);
          
          if (active) {
            setPeaks(normalizedPeaks);
            setIsSynthetic(false);
            setLoading(false);
          }
          audioCtx.close();
        }, (err) => {
          console.warn('[SYS.WAVEFORM] Decoding failed, falling back to synthetic waveform:', err);
          if (active) generateSyntheticPeaks();
          if (audioCtx) audioCtx.close();
        });
      } catch (err) {
        console.warn('[SYS.WAVEFORM] Error buffer extraction, falling back to synthetic:', err);
        if (active) generateSyntheticPeaks();
        if (audioCtx) audioCtx.close();
      }
    };

    decode();

    return () => {
      active = false;
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close();
      }
    };
  }, [blob]);

  // 高品質な疑似音楽波形の生成
  const generateSyntheticPeaks = () => {
    const peaksCount = 140;
    const synthetic = [];
    for (let i = 0; i < peaksCount; i++) {
      const percent = i / peaksCount;
      // サイン波とノイズを組み合わせた立体的な音楽的波形シルエット
      const envelope = Math.sin(percent * Math.PI); // 両端を絞るエンベロープ
      const baseWave = 0.5 * Math.sin(percent * Math.PI * 4.5) + 0.5 * Math.sin(percent * Math.PI * 11);
      const noise = 0.3 * Math.random();
      const peakVal = envelope * (Math.abs(baseWave) * 0.75 + noise + 0.25);
      
      synthetic.push(Math.max(0.08, Math.min(1.0, peakVal)));
    }
    setPeaks(synthetic);
    setIsSynthetic(true);
    setLoading(false);
  };

  // Canvasレンダリング
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 高DPI対応（Retinaディスプレイ等のぼやけ防止）
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const gap = 2; // バー同士の隙間
    const barWidth = (width / peaks.length) - gap;

    ctx.clearRect(0, 0, width, height);

    // 再生済みの割合
    const playedPercent = duration > 0 ? progress / duration : 0;
    const playedBarsCount = Math.floor(peaks.length * playedPercent);

    peaks.forEach((peak, i) => {
      const isPlayed = i <= playedBarsCount;
      const x = i * (barWidth + gap) + gap / 2;
      const barHeight = peak * (height * 0.7); // 最大高さを70%に制限して余白を作る
      
      ctx.save();

      // 色の設定
      if (isPlayed) {
        // 再生済み：ネオン発光グラデーション
        const grad = ctx.createLinearGradient(x, centerY - barHeight/2, x, centerY + barHeight/2);
        if (isAsmrMode) {
          grad.addColorStop(0, '#00ffcc'); // エメラルド
          grad.addColorStop(1, '#8c00ff'); // パープル
          ctx.strokeStyle = grad;
          ctx.shadowColor = 'rgba(0, 255, 204, 0.6)';
        } else {
          grad.addColorStop(0, '#00f3ff'); // シアン
          grad.addColorStop(1, '#ff007f'); // ピンク
          ctx.strokeStyle = grad;
          ctx.shadowColor = 'rgba(0, 243, 255, 0.6)';
        }
        ctx.shadowBlur = 6;
      } else {
        // 未再生：控えめな半透明ダークカラー
        ctx.strokeStyle = isAsmrMode 
          ? 'rgba(0, 255, 204, 0.15)' 
          : 'rgba(0, 243, 255, 0.15)';
        ctx.shadowBlur = 0;
      }

      ctx.lineWidth = barWidth;
      ctx.lineCap = 'round';

      // メインの波形（上下対称描画）
      ctx.beginPath();
      ctx.moveTo(x, centerY - barHeight / 2);
      ctx.lineTo(x, centerY + barHeight / 2);
      ctx.stroke();

      // 下半分の反射部分（さらに透明度を下げてサイバー感を演出）
      ctx.restore();
      ctx.save();
      if (isPlayed) {
        ctx.strokeStyle = isAsmrMode ? 'rgba(140, 0, 255, 0.25)' : 'rgba(255, 0, 127, 0.25)';
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      }
      ctx.lineWidth = barWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, centerY);
      ctx.lineTo(x, centerY + barHeight / 2.5); // 反射は少し短めに
      ctx.stroke();
      ctx.restore();
    });

    // ホバー時の縦プレビュー線とホバー時間の表示
    if (hoverPercent !== null && duration > 0) {
      ctx.save();
      ctx.strokeStyle = isAsmrMode ? 'rgba(0, 255, 204, 0.5)' : 'rgba(255, 0, 127, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      // 縦線描画
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      
      // ホバー時間ラベルの描画
      const hoverTime = hoverPercent * duration;
      const timeStr = formatTime(hoverTime);
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.fillStyle = '#fff';
      
      const textWidth = ctx.measureText(timeStr).width;
      let textX = hoverX - textWidth / 2;
      // 端でのクリッピング防止
      if (textX < 5) textX = 5;
      if (textX + textWidth > width - 5) textX = width - textWidth - 5;
      
      ctx.fillStyle = 'rgba(5, 5, 8, 0.85)';
      ctx.fillRect(textX - 4, 2, textWidth + 8, 14);
      ctx.strokeStyle = isAsmrMode ? '#00ffcc' : '#ff007f';
      ctx.strokeRect(textX - 4, 2, textWidth + 8, 14);
      
      ctx.fillStyle = '#fff';
      ctx.fillText(timeStr, textX, 12);
      ctx.restore();
    }
  }, [peaks, progress, duration, isAsmrMode, hoverPercent, hoverX]);

  // マウスイベント処理
  const handleMouseMove = (e) => {
    if (!canvasRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, x / rect.width));
    setHoverPercent(percent);
    setHoverX(x);
  };

  const handleMouseLeave = () => {
    setHoverPercent(null);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!canvasRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, x / rect.width));
    onSeek(percent * duration);
  };

  // タッチイベント処理 (スマホ・タブレット対応)
  const handleTouchStart = (e) => {
    e.stopPropagation();
    handleTouchSeek(e);
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault(); // シークドラッグ時の不要なブラウザスクロールを防止
    handleTouchSeek(e);
  };

  const handleTouchSeek = (e) => {
    if (!canvasRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, x / rect.width));
    onSeek(percent * duration);
    setHoverPercent(percent);
    setHoverX(x);
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    setHoverPercent(null);
  };

  return (
    <div 
      className="waveform-seekbar-container" 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(5, 5, 8, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '6px',
        padding: '2px 8px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.65rem',
          color: isAsmrMode ? '#00ffcc' : '#00f3ff',
          fontFamily: '"Share Tech Mono", monospace',
          background: 'rgba(5, 5, 8, 0.8)',
          zIndex: 5,
          letterSpacing: '1px'
        }}>
          [SYS.DECODING_WAVE...]
        </div>
      )}

      {isSynthetic && !loading && (
        <span style={{
          position: 'absolute',
          top: '2px',
          right: '8px',
          fontSize: '0.55rem',
          color: isAsmrMode ? 'rgba(0, 255, 204, 0.4)' : 'rgba(0, 243, 255, 0.4)',
          fontFamily: '"Share Tech Mono", monospace',
          pointerEvents: 'none'
        }}>
          [SYS.WAVEFORM.SYNTHETIC_MODE]
        </span>
      )}

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          cursor: duration > 0 ? 'pointer' : 'default',
          display: peaks.length > 0 ? 'block' : 'none'
        }}
      />

      {peaks.length === 0 && !loading && (
        <div style={{
          width: '100%',
          height: '2px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '1px'
        }} />
      )}
    </div>
  );
};

export default WaveformSeekbar;
