import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, SlidersHorizontal, Volume2 } from 'lucide-react';

const Player = ({ 
  isPlaying, 
  setIsPlaying, 
  toggleEq, 
  currentTrack = null, 
  trackMetadata = null,
  progress = 0, 
  duration = 0, 
  onSeek, 
  formatTime,
  playNext,
  playPrev,
  onPlayerBarClick
}) => {

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // 進捗バーのクリックによるシーク処理
  const handleProgressClick = (e) => {
    e.stopPropagation(); // 親のフルスクリーン起動イベントを遮断
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = clickX / width;
    const newTime = clickPercent * duration;
    onSeek(newTime);
  };

  return (
    <footer 
      className="player-controls cyber-player-bar" 
      onClick={() => currentTrack && onPlayerBarClick()}
      style={{ cursor: currentTrack ? 'pointer' : 'default' }}
      title={currentTrack ? "クリックでコックピット再生画面を展開 [SYS.EXPAND]" : ""}
    >
      <div className="now-playing-info cyber-hover-expand">
        <div 
          className={`album-art ${isPlaying ? 'glow-art' : ''}`} 
          style={{ 
            backgroundImage: (trackMetadata && trackMetadata.coverUrl) 
              ? `url('${trackMetadata.coverUrl}')` 
              : "url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        ></div>
        <div className="track-info">
          <h4 className="neon-text-cyan" style={{ 
            maxWidth: '180px', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {trackMetadata ? trackMetadata.title : (currentTrack ? currentTrack.name : '未同期')}
          </h4>
          <p>{trackMetadata ? trackMetadata.artist : (currentTrack ? 'Google Drive 音源' : 'Google Driveから同期してください')}</p>
          {currentTrack && (
            <span className="cyber-click-guide">[SYS.HOLO.ACTIVE]</span>
          )}
        </div>
      </div>

      <div className="controls-center" onClick={(e) => e.stopPropagation()}>
        <div className="main-buttons">
          <button className="control-btn" title="シャッフル (モック)"><Shuffle size={20} /></button>
          <button className="control-btn" onClick={playPrev} disabled={!currentTrack}><SkipBack size={20} /></button>
          <button 
            className="control-btn play-pause-btn" 
            onClick={setIsPlaying}
            disabled={!currentTrack}
            style={{ opacity: currentTrack ? 1 : 0.5 }}
          >
            {isPlaying ? <Pause size={24} color="#000" /> : <Play size={24} color="#000" />}
          </button>
          <button className="control-btn" onClick={playNext} disabled={!currentTrack}><SkipForward size={20} /></button>
          <button className="control-btn" title="ループ (モック)"><Repeat size={20} /></button>
        </div>
        <div className="progress-container">
          <span className="time">{formatTime(progress)}</span>
          <div className="progress-bar-bg" onClick={handleProgressClick} style={{ cursor: duration > 0 ? 'pointer' : 'default' }}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="controls-right" onClick={(e) => e.stopPropagation()}>
        <button className="control-btn" onClick={toggleEq} title="Equalizer">
          <SlidersHorizontal size={20} className={isPlaying ? "neon-text-cyan" : ""} />
        </button>
        <Volume2 size={20} style={{ color: 'var(--text-muted)' }} />
        <input 
          type="range" 
          className="volume-slider" 
          min="0" 
          max="100" 
          defaultValue="70" 
          onChange={(e) => {
            const volumeValue = e.target.value / 100;
            const audioEl = document.querySelector('audio');
            if (audioEl) {
              audioEl.volume = volumeValue;
            }
          }}
        />
      </div>
    </footer>
  );
};

export default Player;
