import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, X, MonitorPlay, Sparkles, SlidersHorizontal, Activity, Share2 } from 'lucide-react';
import WaveformSeekbar from './WaveformSeekbar';

const initFullScreenGrid = (width, height, baseRadius) => {
  const nodes = [];
  const links = [];
  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Center virtual core ring (inside the album disc)
  nodes.push({
    id: 'core',
    x: centerX,
    y: centerY,
    type: 'core',
    size: 0,
    pulse: 1,
    intrusion: 0,
    breached: false,
    label: 'CENTRAL_DECK'
  });

  // 2. Firewall Ring (Concentric)
  const fwCount = 4;
  for (let i = 0; i < fwCount; i++) {
    const angle = (i * Math.PI * 2) / fwCount + Math.PI / 4;
    const dist = baseRadius * 1.5;
    const id = `fw_${i}`;
    nodes.push({
      id,
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      type: 'firewall',
      size: 11,
      pulse: 1,
      intrusion: 0,
      breached: false,
      label: `FW_GATE_0${i}`
    });
    links.push({ source: 'core', target: id });
  }

  // Link firewall nodes to each other to form a barrier shield ring
  for (let i = 0; i < fwCount; i++) {
    links.push({ source: `fw_${i}`, target: `fw_${(i + 1) % fwCount}` });
  }

  // 3. Sub-nodes (Branching outwards)
  const subNodeCount = 12;
  for (let i = 0; i < subNodeCount; i++) {
    const angle = (i * Math.PI * 2) / subNodeCount;
    const fwIdx = Math.floor((i / subNodeCount) * fwCount);
    const parentId = `fw_${fwIdx}`;
    const dist = baseRadius * (2.1 + Math.random() * 0.4);
    const id = `sub_${i}`;
    nodes.push({
      id,
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      type: 'node',
      size: 6,
      pulse: 1,
      intrusion: 0,
      breached: false,
      label: `DB_NODE_${i.toString(16).toUpperCase()}`
    });
    links.push({ source: parentId, target: id });
  }

  return { nodes, links, initialized: true };
};

const FullScreenPlayer = ({
  isPlaying,
  bypassWebAudio = false,
  setIsPlaying,
  currentTrack,
  currentBlob = null,
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
  onShareClick,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  eqGains,
  onEqChange,
  onApplyPreset,
  isAsmrMode = false,
  volume = 0.7,
  onVolumeChange,
  isReverbOn = false,
  onToggleReverb,
  reverbMix = 30,
  onReverbMixChange,
  isDelayOn = false,
  onToggleDelay,
  delayTime = 0.3,
  onDelayTimeChange,
  delayFeedback = 40,
  onDelayFeedbackChange,
  isFilterOn = false,
  onToggleFilter,
  lowpassFreq = 8000,
  onLowpassFreqChange,
  highpassFreq = 20,
  onHighpassFreqChange,
  playbackSpeed = 1.0,
  onPlaybackSpeedChange,
  currentLyrics = [],
  visualizerMode = 'hacker_grid',
  setVisualizerMode
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const [bassScale, setBassScale] = useState(1);
  const [activeTab, setActiveTab] = useState('eq'); // 'eq' | 'fx' | 'lyrics'
  
  // Refs to persist visualizer data between drawing frames in FullScreenPlayer
  const gridRef = useRef({ nodes: [], links: [], initialized: false, width: 0, height: 0 });
  const packetsRef = useRef([]);
  const ringsRef = useRef([]);
  const logsRef = useRef([]);

  // 歌詞が存在する場合、自動的に歌詞タブに切り替える
  useEffect(() => {
    if (currentLyrics && currentLyrics.length > 0) {
      setActiveTab('lyrics');
    }
  }, [currentLyrics]);

  // 現在進行中の歌詞のインデックスを見つける
  let activeLyricIndex = -1;
  if (currentLyrics && currentLyrics.length > 0) {
    for (let i = 0; i < currentLyrics.length; i++) {
      if (currentLyrics[i].time <= progress) {
        activeLyricIndex = i;
      } else {
        break;
      }
    }
  }

  // 進行中の歌詞をスムーズにスクロール
  useEffect(() => {
    if (activeTab === 'lyrics' && lyricsContainerRef.current && activeLyricIndex !== -1) {
      const activeEl = lyricsContainerRef.current.querySelector(`[data-index="${activeLyricIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [activeLyricIndex, activeTab]);

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

      // 動的カラー定義（テーマ対応）
      const styles = window.getComputedStyle(document.documentElement);
      const cyanVar = styles.getPropertyValue('--neon-cyan').trim() || '#00f3ff';
      const pinkVar = styles.getPropertyValue('--neon-pink').trim() || '#ff007f';
      const purpleVar = styles.getPropertyValue('--neon-purple').trim() || '#b500ff';

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
      const rgbPurple = hexToRgbStr(purpleVar);

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
              : (Math.random() > 0.5 ? rgbCyan : rgbPink) // テーマ別のカラー
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

      if (!isAsmrMode && visualizerMode === 'hacker_grid') {
        // 👾 フルスクリーン専用 コンセントリック・ホログラフィックグリッド・ビジュアライザー
        if (!gridRef.current.initialized || gridRef.current.width !== canvas.width || gridRef.current.height !== canvas.height) {
          gridRef.current = initFullScreenGrid(canvas.width, canvas.height, baseRadius);
          gridRef.current.width = canvas.width;
          gridRef.current.height = canvas.height;
        }

        const { nodes, links } = gridRef.current;
        const packets = packetsRef.current;
        const rings = ringsRef.current;
        const logs = logsRef.current;

        // キック（低音）で中心のコアから外側へデータパケット射出
        if (isPlaying && averageBass > 150 && Math.random() < 0.16) {
          const link = links[Math.floor(Math.random() * links.length)];
          const sourceNode = nodes.find(n => n.id === link.source);
          const targetNode = nodes.find(n => n.id === link.target);

          if (sourceNode && targetNode) {
            packets.push({
              sourceId: link.source,
              targetId: link.target,
              x: sourceNode.x,
              y: sourceNode.y,
              progress: 0,
              speed: 0.025 + (averageBass / 255) * 0.02,
              color: Math.random() > 0.5 ? `rgb(${rgbCyan})` : `rgb(${rgbPink})`
            });
          }
        }

        // 高音（トレブル）で不規則な電気ショート
        let drawLightning = false;
        let lSource, lTarget;
        if (isPlaying && averageBass < 140 && Math.random() < 0.08) {
          const subNodes = nodes.filter(n => n.type === 'node');
          if (subNodes.length >= 2) {
            lSource = subNodes[Math.floor(Math.random() * subNodes.length)];
            lTarget = subNodes[Math.floor(Math.random() * subNodes.length)];
            if (lSource.id !== lTarget.id) {
              drawLightning = true;
            }
          }
        }

        // 定期的にハッキングログを出力
        if (isPlaying && Math.random() < 0.04) {
          const addresses = ["0x0F8B", "0xFF30", "0x5E8A", "0x9D0C", "0x7A4C", "0xCC5D", "0xE25F", "0xF58B"];
          const logsList = [
            "DECRYPT_FILE: OVERWRITE_KEY",
            "SECTOR_TRACE 0x4F_SEC...",
            "SSL_BYPASS PORT_443...",
            "STACK_OVERFLOW DIRECT",
            "HOLO_DECK_SYNC COMPLETE",
            "INTRUSION SEC_LEVEL_3",
            "BOOSTING SYSTEM_COCKPIT",
            "OVERRIDING DISK_SECTOR"
          ];
          const addr = addresses[Math.floor(Math.random() * addresses.length)];
          const text = logsList[Math.floor(Math.random() * logsList.length)];
          logs.push({
            text: `[${addr}] ${text}`,
            color: Math.random() > 0.6 ? `rgb(${rgbPink})` : `rgb(${rgbCyan})`,
            y: canvas.height - 15,
            alpha: 1.0,
            speed: 1.0 + Math.random() * 0.5
          });
        }

        // 2. 接続線の描画
        ctx.lineWidth = 1.2;
        links.forEach(l => {
          const sNode = nodes.find(n => n.id === l.source);
          const tNode = nodes.find(n => n.id === l.target);
          if (sNode && tNode) {
            if (sNode.id === 'core') return;

            const baseAlpha = 0.07;
            const glowAlpha = (averageBass / 255) * 0.15;
            ctx.strokeStyle = sNode.breached && tNode.breached 
              ? 'rgba(0, 255, 0, 0.25)' 
              : `rgba(${rgbCyan}, ${baseAlpha + glowAlpha})`;
            ctx.beginPath();
            ctx.moveTo(sNode.x, sNode.y);
            ctx.lineTo(tNode.x, tNode.y);
            ctx.stroke();
          }
        });

        // 3. パケットドットの更新・描画
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          const sNode = nodes.find(n => n.id === p.sourceId);
          const tNode = nodes.find(n => n.id === p.targetId);

          if (!sNode || !tNode) {
            packets.splice(i, 1);
            continue;
          }

          p.progress += p.speed;
          p.x = sNode.x + (tNode.x - sNode.x) * p.progress;
          p.y = sNode.y + (tNode.y - sNode.y) * p.progress;

          if (p.progress >= 1) {
            packets.splice(i, 1);
            if (!tNode.breached) {
              tNode.intrusion = Math.min(100, tNode.intrusion + Math.floor(Math.random() * 15) + 12);
              if (tNode.intrusion === 100) {
                tNode.breached = true;
                rings.push({
                  x: tNode.x,
                  y: tNode.y,
                  radius: 4,
                  maxRadius: 40,
                  alpha: 1.0,
                  color: '#00ff00'
                });
                logs.push({
                  text: `🤖 [SEC_BREACHED]: ${tNode.label} ACQUIRED!`,
                  color: '#00ff00',
                  y: canvas.height - 15,
                  alpha: 1.0,
                  speed: 1.5
                });
              }
            }
            continue;
          }

          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // 4. 雷撃グリッドショート
        if (drawLightning && lSource && lTarget) {
          ctx.strokeStyle = `rgba(${rgbPink}, 0.85)`;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgb(${rgbPink})`;
          ctx.beginPath();
          ctx.moveTo(lSource.x, lSource.y);
          const midX = (lSource.x + lTarget.x) / 2 + (Math.random() - 0.5) * 40;
          const midY = (lSource.y + lTarget.y) / 2 + (Math.random() - 0.5) * 40;
          ctx.lineTo(midX, midY);
          ctx.lineTo(lTarget.x, lTarget.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 5. 波紋リングの描画
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i];
          r.radius += 1.8;
          r.alpha -= 0.035;

          if (r.alpha <= 0) {
            rings.splice(i, 1);
            continue;
          }

          ctx.strokeStyle = r.color;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = r.alpha;
          ctx.shadowBlur = 12;
          ctx.shadowColor = r.color;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1.0;

        // 6. ノードの描画
        nodes.forEach(n => {
          if (n.id === 'core') return;

          if (n.type === 'firewall') {
            n.pulse = 1 + (averageBass / 255) * 0.12 * Math.sin(Date.now() * 0.004 + n.x);
          } else {
            n.pulse = 1 + (averageBass / 255) * 0.08 * Math.cos(Date.now() * 0.004 + n.y);
          }

          const rSize = n.size * n.pulse;

          let nColor = `rgb(${rgbCyan})`;
          let glowGlow = 0;
          if (n.breached) {
            nColor = '#00ff00';
            glowGlow = 16;
          } else if (n.intrusion > 0) {
            const factor = n.intrusion / 100;
            const partsC = rgbCyan.split(',').map(Number);
            const partsP = rgbPink.split(',').map(Number);
            const r = Math.floor(partsC[0] + (partsP[0] - partsC[0]) * factor);
            const g = Math.floor(partsC[1] + (partsP[1] - partsC[1]) * factor);
            const b = Math.floor(partsC[2] + (partsP[2] - partsC[2]) * factor);
            nColor = `rgb(${r},${g},${b})`;
            glowGlow = 8 + factor * 8;
          } else {
            glowGlow = 8;
          }

          ctx.save();
          ctx.shadowColor = nColor;
          ctx.shadowBlur = glowGlow;
          ctx.fillStyle = nColor;
          ctx.beginPath();
          ctx.arc(n.x, n.y, rSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (n.type === 'firewall') {
            ctx.strokeStyle = `rgba(${n.breached ? '0, 255, 0' : rgbCyan}, 0.25)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, rSize * 1.5, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (n.intrusion > 0 && !n.breached) {
            ctx.strokeStyle = `rgb(${rgbPink})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(n.x, n.y, rSize + 3, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * n.intrusion) / 100);
            ctx.stroke();
          }
        });

        // 7. ハッキングスクロールログ
        ctx.font = '8px "Share Tech Mono", monospace';
        for (let i = logs.length - 1; i >= 0; i--) {
          const log = logs[i];
          log.y -= log.speed;
          log.alpha -= 0.005;

          if (log.alpha <= 0 || log.y < 40) {
            logs.splice(i, 1);
            continue;
          }

          ctx.fillStyle = log.color;
          ctx.globalAlpha = log.alpha;
          ctx.fillText(log.text, 25, log.y);
        }
        ctx.globalAlpha = 1.0;

      } else {
        // ⚡ 通常の円形イコライザー（従来の描画コード）
        // 円形ビジュアライザーの描画
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        for (let i = 0; i < bars; i++) {
          const value = drawData[i];
          const barLength = (value / 255) * baseRadius * 1.3 + 2; 

          const angle = i * (2 * Math.PI / bars);
          
          const startX = centerX + Math.cos(angle) * (baseRadius * bassScale);
          const startY = centerY + Math.sin(angle) * (baseRadius * bassScale);

          const endX = centerX + Math.cos(angle) * (baseRadius * bassScale + barLength);
          const endY = centerY + Math.sin(angle) * (baseRadius * bassScale + barLength);

          const percent = i / bars;
          let r, g, b;
          if (isAsmrMode) {
            if (percent < 0.5) {
              r = 0; g = 255; b = 204;
            } else {
              r = 140; g = 0; b = 255;
            }
          } else {
            if (percent < 0.33) {
              const parts = rgbCyan.split(',').map(Number);
              r = parts[0]; g = parts[1]; b = parts[2];
            } else if (percent < 0.66) {
              const parts = rgbPurple.split(',').map(Number);
              r = parts[0]; g = parts[1]; b = parts[2];
            } else {
              const parts = rgbPink.split(',').map(Number);
              r = parts[0]; g = parts[1]; b = parts[2];
            }
          }

          ctx.strokeStyle = `rgb(${r},${g},${b})`;
          ctx.shadowBlur = Math.min(20, barLength / 3);
          ctx.shadowColor = `rgb(${r},${g},${b})`;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // サイバーな「グリッド円」を周囲に描く
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(${rgbCyan}, 0.15)`;
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
  }, [isPlaying, analyser, isAsmrMode, visualizerMode]);

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

        <div className="fs-action-buttons" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {!isAsmrMode && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setVisualizerMode('spectrogram')}
                style={{
                  background: visualizerMode === 'spectrogram' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  color: visualizerMode === 'spectrogram' ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                SPECTRO
              </button>
              <button
                onClick={() => setVisualizerMode('hacker_grid')}
                style={{
                  background: visualizerMode === 'hacker_grid' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  color: visualizerMode === 'hacker_grid' ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                GRID.HACK
              </button>
            </div>
          )}
          <button className="fs-icon-btn glow-cyan" onClick={onShareClick} title="共有リンク確立 [SYS.SHARE]" style={{ borderColor: 'var(--neon-pink)', boxShadow: '0 0 15px rgba(255, 0, 127, 0.25)' }}>
            <Share2 size={22} style={{ color: 'var(--neon-pink)' }} />
            <span style={{ fontSize: '0.75rem', fontFamily: 'Orbitron', marginLeft: '5px', color: 'var(--neon-pink)' }}>SHARE</span>
          </button>
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

        {/* ホログラム・カラオケ字幕オーバーレイ */}
        {currentLyrics && currentLyrics.length > 0 && activeLyricIndex !== -1 && (
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'center',
            zIndex: 10,
            width: '80%',
            maxWidth: '600px',
            pointerEvents: 'none',
            fontFamily: '"Orbitron", monospace',
            textTransform: 'uppercase'
          }}>
            {/* 現在の歌詞 (主歌詞: 拡大 + 強力なネオン発光) */}
            <div style={{
              fontSize: '1.4rem',
              fontWeight: 'bold',
              color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-pink)',
              textShadow: isAsmrMode 
                ? '0 0 10px rgba(0, 255, 204, 0.8), 0 0 20px rgba(0, 255, 204, 0.4)' 
                : '0 0 10px rgba(255, 0, 127, 0.8), 0 0 20px rgba(255, 0, 127, 0.4)',
              letterSpacing: '1px',
              animation: 'pulse-fast 0.6s infinite alternate',
              lineHeight: '1.4'
            }}>
              {currentLyrics[activeLyricIndex].text}
            </div>

            {/* 次の歌詞 (半透明) */}
            {activeLyricIndex + 1 < currentLyrics.length && (
              <div style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.35)',
                textShadow: '0 0 5px rgba(255, 255, 255, 0.1)',
                letterSpacing: '0.5px',
                lineHeight: '1.3'
              }}>
                {currentLyrics[activeLyricIndex + 1].text}
              </div>
            )}
          </div>
        )}

        {/* 左側：グラフィックイコライザー or エフェクトコンソール HUD */}
        <div className="fs-side-panel left-panel" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          borderLeft: `3px solid ${isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)'}`
        }}>
          {/* タブ切り替えセレクター */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0, 243, 255, 0.15)', paddingBottom: '5px', gap: '8px' }}>
            <button 
              onClick={() => setActiveTab('lyrics')}
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'lyrics' ? `2px solid ${isAsmrMode ? '#8c00ff' : '#00f3ff'}` : '2px solid transparent',
                color: activeTab === 'lyrics' ? '#fff' : 'var(--text-muted)',
                fontFamily: 'Orbitron',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}
            >
              [LYRICS]
            </button>
            <button 
              onClick={() => setActiveTab('eq')}
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'eq' ? `2px solid ${isAsmrMode ? '#00ffcc' : '#00f3ff'}` : '2px solid transparent',
                color: activeTab === 'eq' ? '#fff' : 'var(--text-muted)',
                fontFamily: 'Orbitron',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}
            >
              [GRAPHIC EQ]
            </button>
            <button 
              onClick={() => setActiveTab('fx')}
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'fx' ? `2px solid ${isAsmrMode ? '#8c00ff' : '#ff007f'}` : '2px solid transparent',
                color: activeTab === 'fx' ? '#fff' : 'var(--text-muted)',
                fontFamily: 'Orbitron',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}
            >
              [FX CONSOLE]
            </button>
          </div>

          {activeTab === 'lyrics' && (
            <div 
              ref={lyricsContainerRef}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px', 
                flex: 1, 
                overflowY: 'auto', 
                padding: '20px 10px',
                scrollBehavior: 'smooth',
                maskImage: 'linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%)',
              }}
            >
              {currentLyrics && currentLyrics.length > 0 ? (
                currentLyrics.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <div
                      key={idx}
                      data-index={idx}
                      onClick={() => onSeek(line.time)}
                      style={{
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        transition: 'all 0.3s ease',
                        fontSize: isActive ? '1.05rem' : '0.85rem',
                        fontWeight: isActive ? 'bold' : 'normal',
                        color: isActive 
                          ? (isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)') 
                          : 'rgba(255,255,255,0.45)',
                        background: isActive 
                          ? (isAsmrMode ? 'rgba(0, 255, 204, 0.08)' : 'rgba(0, 243, 255, 0.08)')
                          : 'transparent',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        textShadow: isActive 
                          ? (isAsmrMode ? '0 0 10px rgba(0, 255, 204, 0.6)' : '0 0 10px rgba(0, 243, 255, 0.6)')
                          : 'none',
                        border: isActive 
                          ? `1px solid ${isAsmrMode ? 'rgba(0, 255, 204, 0.3)' : 'rgba(0, 243, 255, 0.3)'}` 
                          : '1px solid transparent',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)'
                      }}
                    >
                      {line.text}
                    </div>
                  );
                })
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🎤</span>
                  <p>
                    このトラックの歌詞が見つかりません。<br />
                    G-Drive内の同じフォルダに「曲名.lrc」ファイルを配置すると自動同期されます。
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'eq' && (
            /* ================= EQ TAB ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
              <div>
                <h3>SYSTEM ANALYSIS</h3>
                <div className="system-log" style={{ fontSize: '0.72rem', height: '95px' }}>
                  <p className="neon-text-cyan">&gt; AUDIO BUFFER ACTIVE</p>
                  <p>&gt; BITRATE: 320KBPS / STEADY</p>
                  <p className="neon-text-pink">&gt; BEAT DETECTOR STATUS: OK</p>
                  <p style={{
                    color: bypassWebAudio ? 'var(--neon-pink)' : (eqGains.some(g => g !== 0) ? 'var(--neon-cyan)' : 'var(--text-muted)'),
                    animation: (eqGains.some(g => g !== 0) && !bypassWebAudio) ? 'pulse-fast 1s infinite alternate' : 'none'
                  }}>
                    &gt; EQ STATUS: {bypassWebAudio ? 'BYPASSED [DIRECT ENGINE]' : (eqGains.some(g => g !== 0) ? 'ACTIVE' : 'BYPASS (FLAT)')}
                  </p>
                  {bypassWebAudio && (
                    <p style={{ color: 'var(--neon-pink)', animation: 'pulse-fast 1s infinite alternate' }}>
                      &gt; BACKGROUND OPTIMIZATION ACTIVE: EFFECTS INACTIVE
                    </p>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(0, 243, 255, 0.1)', paddingTop: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Sparkles size={13} /> HUD GRAPHIC EQ
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, padding: '0 5px', minHeight: '110px' }}>
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
                          height: '75px', 
                          accentColor: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)', 
                          cursor: 'ns-resize',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          outline: 'none'
                        }} 
                      />
                      <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'monospace' }}>
                        {freq > 1000 ? `${freq/1000}k` : freq}
                      </span>
                      <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: eqGains[idx] > 0 ? 'var(--neon-cyan)' : eqGains[idx] < 0 ? 'var(--neon-pink)' : '#666', marginTop: '1px' }}>
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
                      padding: '4px 0', 
                      fontSize: '0.6rem', 
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
                      padding: '4px 0', 
                      fontSize: '0.6rem', 
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
                      padding: '4px 0', 
                      fontSize: '0.6rem', 
                      backgroundColor: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.15)', 
                      color: '#fff',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontFamily: 'Orbitron',
                      marginTop: '3px'
                    }}
                  >
                    FLAT
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fx' && (
            /* ================= FX TAB ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              <h3 style={{ fontSize: '0.8rem', color: isAsmrMode ? 'var(--neon-asmr-purple)' : 'var(--neon-pink)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <Activity size={13} /> SOUND FX CONSOLE
              </h3>

              {bypassWebAudio && (
                <div style={{
                  padding: '8px',
                  border: '1px solid var(--neon-pink)',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 0, 127, 0.1)',
                  color: 'var(--neon-pink)',
                  fontSize: '0.65rem',
                  lineHeight: '1.4',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                  marginBottom: '5px'
                }}>
                  [OPTIMIZATION ENABLED]<br/>
                  音のプツプツを防ぐため、Direct Playbackエンジンが作動中です。エフェクトは無効化されています。
                </div>
              )}

              {/* REVERB Residual Sound */}
              <div style={{ background: 'rgba(5, 5, 8, 0.6)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron', color: isReverbOn ? 'var(--neon-cyan)' : '#888', fontWeight: 'bold' }}>
                    SPACE REVERB [宇宙残響]
                  </span>
                  <input 
                    type="checkbox" 
                    checked={isReverbOn} 
                    onChange={(e) => onToggleReverb(e.target.checked)}
                    style={{ accentColor: 'var(--neon-cyan)', cursor: 'pointer', width: '14px', height: '14px' }}
                  />
                </div>
                {isReverbOn && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                      <span>WET MIX [残響音率]</span>
                      <span>{reverbMix}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={reverbMix} 
                      onChange={(e) => onReverbMixChange(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--neon-cyan)', cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>

              {/* FEEDBACK DELAY */}
              <div style={{ background: 'rgba(5, 5, 8, 0.6)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron', color: isDelayOn ? 'var(--neon-pink)' : '#888', fontWeight: 'bold' }}>
                    CYBER DELAY [回帰ディレイ]
                  </span>
                  <input 
                    type="checkbox" 
                    checked={isDelayOn} 
                    onChange={(e) => onToggleDelay(e.target.checked)}
                    style={{ accentColor: 'var(--neon-pink)', cursor: 'pointer', width: '14px', height: '14px' }}
                  />
                </div>
                {isDelayOn && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                        <span>TIME [ディレイ時間]</span>
                        <span>{delayTime.toFixed(1)}s</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.1" 
                        value={delayTime} 
                        onChange={(e) => onDelayTimeChange(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--neon-pink)', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                        <span>FEEDBACK [フィードバック]</span>
                        <span>{delayFeedback}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="80" 
                        value={delayFeedback} 
                        onChange={(e) => onDelayFeedbackChange(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--neon-pink)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BIQUAD FILTER */}
              <div style={{ background: 'rgba(5, 5, 8, 0.6)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron', color: isFilterOn ? '#0f0' : '#888', fontWeight: 'bold' }}>
                    HUD FILTER [高低音フィルター]
                  </span>
                  <input 
                    type="checkbox" 
                    checked={isFilterOn} 
                    onChange={(e) => onToggleFilter(e.target.checked)}
                    style={{ accentColor: '#0f0', cursor: 'pointer', width: '14px', height: '14px' }}
                  />
                </div>
                {isFilterOn && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                        <span>LOWPASS [高音カット]</span>
                        <span>{lowpassFreq}Hz</span>
                      </div>
                      <input 
                        type="range" 
                        min="200" 
                        max="20000" 
                        step="200" 
                        value={lowpassFreq} 
                        onChange={(e) => onLowpassFreqChange(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#0f0', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                        <span>HIGHPASS [低音カット]</span>
                        <span>{highpassFreq}Hz</span>
                      </div>
                      <input 
                        type="range" 
                        min="20" 
                        max="2000" 
                        step="20" 
                        value={highpassFreq} 
                        onChange={(e) => onHighpassFreqChange(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#0f0', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PLAYBACK SPEED */}
              <div style={{ background: 'rgba(5, 5, 8, 0.6)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron', color: playbackSpeed !== 1.0 ? 'var(--neon-cyan)' : '#888', fontWeight: 'bold' }}>
                    SPEED FACTOR [速度: {playbackSpeed.toFixed(2)}x]
                  </span>
                  {playbackSpeed !== 1.0 && (
                    <button 
                      onClick={() => onPlaybackSpeedChange(1.0)}
                      style={{
                        padding: '1px 5px',
                        fontSize: '0.55rem',
                        fontFamily: 'Orbitron',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--neon-cyan)',
                        color: '#fff',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      RESET
                    </button>
                  )}
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.05" 
                  value={playbackSpeed} 
                  onChange={(e) => onPlaybackSpeedChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--neon-cyan)', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
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
          {/* 波形シークバーの統合 */}
          <div className="fs-progress-wrap" onClick={(e) => e.stopPropagation()}>
            <span className="time fs-time">{formatTime(progress)}</span>
            <WaveformSeekbar 
              blob={currentBlob}
              progress={progress}
              duration={duration}
              onSeek={onSeek}
              formatTime={formatTime}
              isAsmrMode={isAsmrMode}
            />
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
