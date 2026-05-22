import React, { useEffect, useRef } from 'react';

const SpectrumVisualizer = ({ isPlaying, analyser = null }) => {
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

      // 描画処理
      for (let i = 0; i < bars; i++) {
        // 低い周波数（左側）と高い周波数（右側）でグラデーションの色を変化
        const value = drawData[i];
        const barHeight = (value / 255) * canvas.height * 0.95 + 4; // 最低4pxは描画してサイバー感を残す

        // サイバーパンクな発光グラデーション (青〜水色〜ピンク)
        const percent = i / bars;
        
        // グラデーション（高さに応じても発光が変化）
        let r, g, b;
        if (percent < 0.5) {
          // 左側はネオンシアン寄り
          r = Math.floor(0 + (100 * percent));
          g = Math.floor(243 - (100 * percent));
          b = 255;
        } else {
          // 右側はネオンマゼンタ/ピンク寄り
          r = 255;
          g = Math.floor(0 + (150 * (1 - percent)));
          b = Math.floor(150 + (105 * percent));
        }

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        
        // ネオンの「光彩（グロー）」効果
        ctx.shadowBlur = Math.min(15, barHeight / 8);
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        
        // 角丸のバー風に描くためにfillRectではなくちょっとした描画テクニック
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }

      // レトロ液晶の走査線（スキャンライン）効果をオーバーレイ
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
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
  }, [isPlaying, analyser]);

  return (
    <div className="spectrum-container">
      <div className="spectrum-box">
        <div className="spectrum-header">
          <span className="glitch" data-text="[SYS.AUDIO.SPECTROGRAM]">[システム.オーディオ.スペクトログラム]</span>
          <span>FREQ: 20Hz - 20kHz | 状態: {isPlaying ? (analyser ? '実解析中' : 'シミュレート中') : '待機中'}</span>
        </div>
        <div className="spectrum-canvas-wrap">
          <canvas ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
};

export default SpectrumVisualizer;
