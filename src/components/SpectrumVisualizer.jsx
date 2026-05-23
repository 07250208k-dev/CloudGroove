import React, { useEffect, useRef, useState } from 'react';
import { HardDrive } from 'lucide-react';

const initGrid = (width, height, baseRadius) => {
  const nodes = [];
  const links = [];
  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Core Node (Center)
  nodes.push({
    id: 'core',
    x: centerX,
    y: centerY,
    type: 'core',
    size: 18,
    pulse: 1,
    intrusion: 0,
    breached: false,
    label: 'CORE_SECTOR'
  });

  // 2. Firewall Nodes (Intermediate)
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
      size: 10,
      pulse: 1,
      intrusion: 0,
      breached: false,
      label: `FW_GATE_0${i}`
    });
    links.push({ source: 'core', target: id, breached: false });
  }

  // 3. Sub-nodes (Peripheral)
  const subNodeCount = 12;
  for (let i = 0; i < subNodeCount; i++) {
    const angle = (i * Math.PI * 2) / subNodeCount;
    const fwIdx = Math.floor((i / subNodeCount) * fwCount);
    const parentId = `fw_${fwIdx}`;
    const dist = baseRadius * (2.2 + Math.random() * 0.3);
    const id = `sub_${i}`;
    nodes.push({
      id,
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      type: 'node',
      size: 5,
      pulse: 1,
      intrusion: 0,
      breached: false,
      label: `DB_CHUNK_${i.toString(16).toUpperCase()}`
    });
    links.push({ source: parentId, target: id, breached: false });
  }

  return { nodes, links, initialized: true };
};

const SpectrumVisualizer = ({ 
  isPlaying, 
  analyser = null, 
  isAsmrMode = false, 
  trackMetadata = null,
  visualizerMode = 'hacker_grid',
  setVisualizerMode
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Persistent refs for the Cyber Grid visualizer to maintain states between animation frames
  const gridRef = useRef({ nodes: [], links: [], initialized: false, width: 0, height: 0 });
  const packetsRef = useRef([]);
  const ringsRef = useRef([]);
  const logsRef = useRef([]);

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
      const primaryColor = cyanVar;
      const secondaryColor = pinkVar;

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

      } else if (visualizerMode === 'hacker_grid') {
        // ⚡ 近未来サイバー・グリッドハッキングシミュレータ
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.20;

        // 初期化または画面リサイズ時に再計算
        if (!gridRef.current.initialized || gridRef.current.width !== canvas.width || gridRef.current.height !== canvas.height) {
          gridRef.current = initGrid(canvas.width, canvas.height, baseRadius);
          gridRef.current.width = canvas.width;
          gridRef.current.height = canvas.height;
        }

        const { nodes, links } = gridRef.current;
        const packets = packetsRef.current;
        const rings = ringsRef.current;
        const logs = logsRef.current;

        // 周波数解析
        let bassVal = 0;
        let midVal = 0;
        let trebleVal = 0;

        if (analyser && isPlaying) {
          for (let i = 0; i < 6; i++) bassVal += drawData[i];
          bassVal /= 6;

          for (let i = 6; i < 30; i++) midVal += drawData[i];
          midVal /= 24;

          for (let i = 30; i < bars; i++) trebleVal += drawData[i];
          trebleVal /= 34;
        } else if (isPlaying) {
          bassVal = 100 + Math.random() * 80;
          midVal = 80 + Math.random() * 60;
          trebleVal = 50 + Math.random() * 40;
        }

        // 低音（キック）連動でデータパケット射出
        if (isPlaying && bassVal > 155 && Math.random() < 0.16) {
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
              speed: 0.03 + (bassVal / 255) * 0.025,
              color: Math.random() > 0.5 ? secondaryColor : primaryColor
            });
          }
        }

        // 高音（ハイハット）連動でショート電光ショート
        let drawLightning = false;
        let lSource, lTarget;
        if (isPlaying && trebleVal > 130 && Math.random() < 0.08) {
          const subNodes = nodes.filter(n => n.type === 'node');
          if (subNodes.length >= 2) {
            lSource = subNodes[Math.floor(Math.random() * subNodes.length)];
            lTarget = subNodes[Math.floor(Math.random() * subNodes.length)];
            if (lSource.id !== lTarget.id) {
              drawLightning = true;
            }
          }
        }

        // ログ情報（BPM同期風）
        if (isPlaying && Math.random() < 0.04) {
          const addresses = ["0x0F8B", "0xFF30", "0x5E8A", "0x9D0C", "0x7A4C", "0xCC5D", "0xE25F", "0xF58B"];
          const logsList = [
            "OVERWRITE_KERNEL: OK",
            "SCANNING MODULE 0x4F...",
            "BYPASSING PORT 8080...",
            "BUFFER OVERFLOW DIRECTED",
            "ESTABLISHING SYNC BEAT...",
            "INTRUSION AT SUB-GRID",
            "OVERCLOCKING CPU_SEC...",
            "OVERRIDING AUDIO DECK"
          ];
          const addr = addresses[Math.floor(Math.random() * addresses.length)];
          const text = logsList[Math.floor(Math.random() * logsList.length)];
          logs.push({
            text: `[${addr}] ${text}`,
            color: Math.random() > 0.6 ? secondaryColor : primaryColor,
            y: canvas.height - 15,
            alpha: 1.0,
            speed: 1.0 + Math.random() * 0.6
          });
        }

        // 1. リンク（接続線）の描画
        ctx.lineWidth = 1;
        links.forEach(l => {
          const sNode = nodes.find(n => n.id === l.source);
          const tNode = nodes.find(n => n.id === l.target);
          if (sNode && tNode) {
            const baseAlpha = 0.05;
            const glowAlpha = (midVal / 255) * 0.12;
            ctx.strokeStyle = sNode.breached && tNode.breached 
              ? 'rgba(0, 255, 0, 0.22)' 
              : `rgba(${cyanParts[0]}, ${cyanParts[1]}, ${cyanParts[2]}, ${baseAlpha + glowAlpha})`;
            ctx.beginPath();
            ctx.moveTo(sNode.x, sNode.y);
            ctx.lineTo(tNode.x, tNode.y);
            ctx.stroke();
          }
        });

        // 2. パケット（電送信号ドット）の更新・描画
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
                  maxRadius: 35,
                  alpha: 1.0,
                  color: '#00ff00'
                });
                logs.push({
                  text: `🤖 [BREACHED]: ${tNode.label} ACCESSED!`,
                  color: '#00ff00',
                  y: canvas.height - 15,
                  alpha: 1.0,
                  speed: 1.5
                });
              }
            }
            continue;
          }

          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // 3. ショート雷撃の描画
        if (drawLightning && lSource && lTarget) {
          ctx.strokeStyle = `rgba(${pinkParts[0]}, ${pinkParts[1]}, ${pinkParts[2]}, 0.85)`;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = secondaryColor;
          ctx.beginPath();
          ctx.moveTo(lSource.x, lSource.y);
          const midX = (lSource.x + lTarget.x) / 2 + (Math.random() - 0.5) * 30;
          const midY = (lSource.y + lTarget.y) / 2 + (Math.random() - 0.5) * 30;
          ctx.lineTo(midX, midY);
          ctx.lineTo(lTarget.x, lTarget.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 4. 攻略ノード波紋リングの更新・描画
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i];
          r.radius += 1.5;
          r.alpha -= 0.04;

          if (r.alpha <= 0) {
            rings.splice(i, 1);
            continue;
          }

          ctx.strokeStyle = r.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = r.alpha;
          ctx.shadowBlur = 10;
          ctx.shadowColor = r.color;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1.0;

        // 5. ノード（コアと端末）の描画
        nodes.forEach(n => {
          if (n.type === 'core') {
            n.pulse = 1 + (bassVal / 255) * 0.15;
          } else if (n.type === 'firewall') {
            n.pulse = 1 + (midVal / 255) * 0.10 * Math.sin(Date.now() * 0.005 + n.x);
          } else {
            n.pulse = 1 + (trebleVal / 255) * 0.08 * Math.cos(Date.now() * 0.005 + n.y);
          }

          const rSize = n.size * n.pulse;

          let nColor = primaryColor;
          let glowGlow = 0;
          if (n.breached) {
            nColor = '#00ff00';
            glowGlow = 15;
          } else if (n.intrusion > 0) {
            const factor = n.intrusion / 100;
            const r = Math.floor(cyanParts[0] + (pinkParts[0] - cyanParts[0]) * factor);
            const g = Math.floor(cyanParts[1] + (pinkParts[1] - cyanParts[1]) * factor);
            const b = Math.floor(cyanParts[2] + (pinkParts[2] - cyanParts[2]) * factor);
            nColor = `rgb(${r},${g},${b})`;
            glowGlow = 8 + factor * 6;
          } else {
            glowGlow = n.type === 'core' ? 20 : 6;
          }

          ctx.save();
          ctx.shadowColor = nColor;
          ctx.shadowBlur = glowGlow;
          ctx.fillStyle = nColor;
          ctx.beginPath();
          ctx.arc(n.x, n.y, rSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (n.type === 'core' || n.type === 'firewall') {
            ctx.strokeStyle = `rgba(${n.breached ? '0, 255, 0' : rgbCyan}, 0.22)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, rSize * 1.5, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (n.intrusion > 0 && !n.breached) {
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(n.x, n.y, rSize + 3, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * n.intrusion) / 100);
            ctx.stroke();
          }
        });

        // 6. ローグログのスクロール描画
        ctx.font = '8px "Share Tech Mono", monospace';
        for (let i = logs.length - 1; i >= 0; i--) {
          const log = logs[i];
          log.y -= log.speed;
          log.alpha -= 0.005;

          if (log.alpha <= 0 || log.y < 30) {
            logs.splice(i, 1);
            continue;
          }

          ctx.fillStyle = log.color;
          ctx.globalAlpha = log.alpha;
          ctx.fillText(log.text, 15, log.y);
        }
        ctx.globalAlpha = 1.0;

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
          <div className="spectrum-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span className="glitch" data-text={visualizerMode === 'hacker_grid' ? "[SYS.HACK.MATRIX]" : "[SYS.AUDIO.SPECTROGRAM]"}>
                {visualizerMode === 'hacker_grid' ? "[電脳グリッド.ハックシミュレーション]" : "[システム.オーディオ.スペクトログラム]"}
              </span>
              {!isAsmrMode && (
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', padding: '2px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={() => setVisualizerMode('spectrogram')}
                    style={{
                      background: visualizerMode === 'spectrogram' ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none',
                      color: visualizerMode === 'spectrogram' ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.6rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer'
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
                      fontSize: '0.6rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    GRID.HACK
                  </button>
                </div>
              )}
            </div>
            <span>状態: {isPlaying ? (analyser ? '解析中' : 'シミュレート中') : '待機中'}</span>
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
