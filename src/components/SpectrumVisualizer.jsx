import React, { useEffect, useRef } from 'react';

const SpectrumVisualizer = ({ isPlaying }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas internal dimensions to match display size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const bars = 64;
    const dataArray = new Uint8Array(bars);
    
    // Initialize with some random heights
    for(let i=0; i<bars; i++) {
        dataArray[i] = 10;
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bars) - 2;
      let x = 0;

      for (let i = 0; i < bars; i++) {
        // Generate random data if playing, else decay to bottom
        if (isPlaying) {
            // Randomize but keep some continuity (mock audio data)
            const target = Math.random() * 255;
            // Smooth transition
            dataArray[i] = dataArray[i] + (target - dataArray[i]) * 0.3;
        } else {
            // Decay to 10
            dataArray[i] = Math.max(10, dataArray[i] * 0.9);
        }

        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Cyberpunk color gradient based on height
        const r = barHeight + (25 * (i/bars));
        const g = 250 * (i/bars);
        const b = 250;
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        
        // Add neon glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }

      // Add a scanline effect over the canvas
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 0;
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
  }, [isPlaying]);

  return (
    <div className="spectrum-container">
      <div className="spectrum-box">
        <div className="spectrum-header">
            <span className="glitch" data-text="[SYS.AUDIO.SPECTROGRAM]">[システム.オーディオ.スペクトログラム]</span>
            <span>FREQ: 20Hz - 20kHz | 状態: {isPlaying ? '稼働中' : '待機中'}</span>
        </div>
        <div className="spectrum-canvas-wrap">
            <canvas ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
};

export default SpectrumVisualizer;
