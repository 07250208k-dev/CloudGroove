import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Clock, BarChart3, Activity, Award } from 'lucide-react';

const StatsConsole = ({ userProfile, onClose, isAsmrMode = false }) => {
  const canvasRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalTime: 0,
    topTracks: [],
    topArtists: [],
    hackerClass: '未検出'
  });

  // ログデータのロードと集計
  useEffect(() => {
    const baseKey = isAsmrMode ? 'cg_play_log_asmr_' : 'cg_play_log_';
    const userSub = (userProfile && userProfile.sub) ? userProfile.sub : 'guest';
    const key = `${baseKey}${userSub}`;
    const saved = localStorage.getItem(key);
    let playLogs = [];
    if (saved) {
      try {
        playLogs = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse play logs:", e);
      }
    }
    if (!Array.isArray(playLogs)) playLogs = [];
    setLogs(playLogs);

    if (playLogs.length === 0) return;

    // 1. 総再生時間と回数の算出
    const totalCount = playLogs.length;
    let totalTime = 0;
    playLogs.forEach(entry => {
      totalTime += (entry.duration && !isNaN(entry.duration)) ? entry.duration : 200; // 不明な場合は3分20秒と仮定
    });

    // 2. トラックランキング集計
    const trackCounts = {};
    playLogs.forEach(entry => {
      const key = `${entry.title} // ${entry.artist}`;
      trackCounts[key] = (trackCounts[key] || 0) + 1;
    });
    const topTracks = Object.entries(trackCounts)
      .map(([name, count]) => {
        const [title, artist] = name.split(' // ');
        return { title, artist, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. アーティストランキング集計
    const artistCounts = {};
    playLogs.forEach(entry => {
      if (entry.artist && entry.artist !== 'Google Drive 音源' && entry.artist !== 'UNKNOWN ARTIST') {
        artistCounts[entry.artist] = (artistCounts[entry.artist] || 0) + 1;
      }
    });
    const topArtists = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 4. サイバー属性（時間帯分析）
    const hourCounts = Array(24).fill(0);
    playLogs.forEach(entry => {
      const date = new Date(entry.timestamp);
      const hour = date.getHours();
      hourCounts[hour]++;
    });

    let lateNight = 0; // 22:00 - 04:00
    let officeHours = 0; // 09:00 - 17:00
    let earlyMorning = 0; // 05:00 - 09:00
    let evening = 0; // 17:00 - 22:00

    hourCounts.forEach((count, hour) => {
      if (hour >= 22 || hour < 4) lateNight += count;
      else if (hour >= 9 && hour < 17) officeHours += count;
      else if (hour >= 5 && hour < 9) earlyMorning += count;
      else evening += count;
    });

    let hackerClass = isAsmrMode ? '精神防壁の調律師 [ZEN.MIND_TUNER]' : 'ネオンディスコダンサー [NEON.DANCER]';
    const maxVal = Math.max(lateNight, officeHours, earlyMorning, evening);
    
    if (maxVal === lateNight) {
      hackerClass = isAsmrMode ? '深層意識の睡眠ダイバー [ZEN.DEEP_SLEEPER]' : '深夜の電脳ハッカー [SYS.NIGHT_RUNNER]';
    } else if (maxVal === officeHours) {
      hackerClass = isAsmrMode ? '白昼のストレスバスター [ZEN.STRESS_FREE]' : 'グリッドオフィスワーカー [SYS.GRID_CLERK]';
    } else if (maxVal === earlyMorning) {
      hackerClass = isAsmrMode ? '黎明の静寂トランス [ZEN.DAWN_HEALER]' : '黎明の瞑想レイヴン [SYS.DAWN_MEDITATION]';
    } else if (maxVal === evening) {
      hackerClass = isAsmrMode ? '黄昏のアンビエント瞑想者 [ZEN.DUSK_MEDITATOR]' : '黄昏のサイバースパム [SYS.DUSK_OPERATOR]';
    }

    setStats({
      totalCount,
      totalTime,
      topTracks,
      topArtists,
      hackerClass
    });
  }, [userProfile, isAsmrMode]);

  // 曜日別アクティビティグラフを Canvas でネオン描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || logs.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const styles = window.getComputedStyle(document.documentElement);
    const cyanColor = styles.getPropertyValue('--neon-cyan').trim() || '#00f3ff';
    const pinkColor = styles.getPropertyValue('--neon-pink').trim() || '#ff007f';

    // 高DPI対応
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 曜日別の再生回数集計 (日:0 〜 土:6)
    const dayCounts = Array(7).fill(0);
    logs.forEach(entry => {
      const date = new Date(entry.timestamp);
      dayCounts[date.getDay()]++;
    });

    const maxCount = Math.max(...dayCounts) || 1;
    const padding = 25;
    const chartHeight = height - padding * 2;
    const barWidth = (width - padding * 2) / 7 - 10;
    const days = ['日', '月', '火', '水', '木', '金', '土'];

    ctx.clearRect(0, 0, width, height);

    // 軸線の描画
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    dayCounts.forEach((count, i) => {
      const barHeight = (count / maxCount) * chartHeight;
      const x = padding + i * (barWidth + 10) + 5;
      const y = height - padding - barHeight;

      // ネオングラデーションバーの描画
      const grad = ctx.createLinearGradient(x, y, x, height - padding);
      if (isAsmrMode) {
        grad.addColorStop(0, '#8c00ff'); // 紫
        grad.addColorStop(1, '#00ffcc'); // エメラルド
      } else {
        grad.addColorStop(0, pinkColor); // ピンク (動的)
        grad.addColorStop(1, cyanColor); // シアン (動的)
      }
      ctx.fillStyle = grad;

      ctx.save();
      ctx.shadowColor = isAsmrMode ? 'rgba(140, 0, 255, 0.4)' : (pinkColor + '66');
      ctx.shadowBlur = 8;

      // 角丸の柱を描画
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, Math.max(2, barHeight), [3, 3, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, Math.max(2, barHeight));
      }
      ctx.fill();
      ctx.restore();

      // 数値表示
      if (count > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(count.toString(), x + barWidth / 2, y - 5);
      }

      // 曜日ラベル
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(days[i], x + barWidth / 2, height - 10);
    });

  }, [logs, isAsmrMode]);

  // 秒を「〇時間〇分」フォーマットに変換
  const formatTotalTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間 ${minutes}分`;
    }
    return `${minutes}分`;
  };

  return (
    <div className={`side-panel stats-panel ${isAsmrMode ? 'asmr-panel' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div className="panel-header" style={{ borderBottom: isAsmrMode ? '1px solid var(--neon-asmr-emerald, #00ffcc)' : '1px solid var(--neon-pink)' }}>
        <h3 style={{ color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-pink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} /> {isAsmrMode ? '[ZEN MEDITATION LOG HUD]' : '[STATS CONSOLE HUD]'}
        </h3>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
      </div>

      {logs.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: '15px',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          textAlign: 'center',
          padding: '20px'
        }}>
          <Activity size={32} className="pulse-icon" style={{ color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-pink)' }} />
          <p>
            {isAsmrMode 
              ? '精神安らぎログが空です。\nASMRフォルダ内の音声を30秒以上再生すると自動的に禅プロファイリングが開始されます。' 
              : '精神ログが空です。\n音声ファイルを同期して、30秒以上音楽を再生すると自動的にプロファイリングが開始されます。'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
          
          {/* ハッカークラスプロファイル */}
          <div style={{
            background: isAsmrMode ? 'rgba(0, 255, 204, 0.05)' : 'rgba(255, 0, 127, 0.05)',
            border: isAsmrMode ? '1px solid rgba(0, 255, 204, 0.25)' : '1px solid rgba(255, 0, 127, 0.25)',
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: isAsmrMode ? '0 0 10px rgba(0, 255, 204, 0.05)' : '0 0 10px rgba(255, 0, 127, 0.05)'
          }}>
            <Award size={28} style={{ color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-pink)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'Orbitron' }}>
                {isAsmrMode ? 'ZEN COGNITIVE PROFILE TYPE:' : 'USER PROFILE TYPE:'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                {stats.hackerClass}
              </div>
            </div>
          </div>

          {/* 主要統計サマリー */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(5, 5, 8, 0.6)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                {isAsmrMode ? 'TOTAL ZEN PLAYS' : 'TOTAL REPLICATED PLAYS'}
              </div>
              <div style={{ fontSize: '1.4rem', color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)', fontWeight: 'bold', fontFamily: 'Orbitron', marginTop: '4px' }}>
                {stats.totalCount} <span style={{ fontSize: '0.75rem' }}>回</span>
              </div>
            </div>
            <div style={{ background: 'rgba(5, 5, 8, 0.6)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                {isAsmrMode ? 'TOTAL TRANQUIL TIME' : 'TOTAL SYNC TIME'}
              </div>
              <div style={{ fontSize: '1.2rem', color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-green)', fontWeight: 'bold', fontFamily: 'Orbitron', marginTop: '6px' }}>
                {formatTotalTime(stats.totalTime)}
              </div>
            </div>
          </div>

          {/* 曜日別アクティビティグラフ */}
          <div style={{ background: 'rgba(5, 5, 8, 0.6)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.65rem', color: '#fff', fontFamily: 'Orbitron', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
              {isAsmrMode ? 'COGNITIVE SLUMBER GRAPH' : 'WEEKLY ACTIVITY GRAPH'}
            </div>
            <canvas ref={canvasRef} style={{ width: '100%', height: '110px' }} />
          </div>

          {/* ヘビロテランキング */}
          <div style={{ background: 'rgba(5, 5, 8, 0.6)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.65rem', color: '#fff', fontFamily: 'Orbitron', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
              {isAsmrMode ? 'HEAVIEST ROTATION ASMR' : 'HEAVY ROTATION: TOP 5'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {stats.topTracks.map((item, idx) => {
                const maxCount = stats.topTracks[0].count;
                const percent = (item.count / maxCount) * 100;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff' }}>
                      <span style={{ maxWidth: '75%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {idx + 1}. {item.title} <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>- {item.artist}</span>
                      </span>
                      <span style={{ color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-pink)', fontFamily: 'Orbitron', fontSize: '0.65rem' }}>{item.count} trk</span>
                    </div>
                    {/* ネオンプログレスバー */}
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: isAsmrMode 
                          ? 'linear-gradient(90deg, var(--neon-asmr-emerald, #00ffcc) 0%, var(--neon-asmr-purple, #8c00ff) 100%)' 
                          : 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-pink) 100%)',
                        boxShadow: isAsmrMode ? '0 0 5px var(--neon-asmr-purple, #8c00ff)' : '0 0 5px var(--neon-pink)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* お気に入りアーティスト */}
          {stats.topArtists.length > 0 && (
            <div style={{ background: 'rgba(5, 5, 8, 0.6)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.65rem', color: '#fff', fontFamily: 'Orbitron', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                {isAsmrMode ? 'FAVORITE ZEN ARTISTS' : 'PRIMARY SYNAPSE ARTISTS'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {stats.topArtists.map((artist, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#fff', borderBottom: '1px dashed rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                    <span>{idx + 1}. {artist.name}</span>
                    <span style={{ color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)', fontFamily: 'Orbitron' }}>{artist.count} 回</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsConsole;
