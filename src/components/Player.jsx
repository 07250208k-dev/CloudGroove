import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, SlidersHorizontal, Volume2, Share2 } from 'lucide-react';
import WaveformSeekbar from './WaveformSeekbar';

const Player = ({ 
  isPlaying, 
  setIsPlaying, 
  toggleEq, 
  currentTrack = null, 
  currentBlob = null,
  trackMetadata = null,
  progress = 0, 
  duration = 0, 
  onSeek, 
  formatTime,
  playNext,
  playPrev,
  onPlayerBarClick,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  volume = 0.7,
  onVolumeChange,
  isAsmrMode = false,
  onShareClick
}) => {

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
          <button 
            className={`control-btn ${isShuffle ? 'neon-text-cyan' : ''}`} 
            onClick={onToggleShuffle}
            disabled={!currentTrack}
            title={isShuffle ? "シャッフル再生: ON [SYS.SHUFFLE.ACTIVE]" : "シャッフル再生: OFF"}
          >
            <Shuffle size={20} />
          </button>
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
          <button 
            className={`control-btn ${repeatMode !== 'none' ? 'neon-text-pink' : ''}`} 
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
            <Repeat size={20} />
            {repeatMode === 'one' && (
              <span 
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  fontSize: '0.55rem',
                  fontWeight: 'bold',
                  backgroundColor: 'var(--neon-pink)',
                  color: '#000',
                  borderRadius: '50%',
                  width: '11px',
                  height: '11px',
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
        <div className="progress-container" onClick={(e) => e.stopPropagation()}>
          <span className="time">{formatTime(progress)}</span>
          <WaveformSeekbar
            blob={currentBlob}
            progress={progress}
            duration={duration}
            onSeek={onSeek}
            formatTime={formatTime}
            isAsmrMode={isAsmrMode}
          />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="controls-right" onClick={(e) => e.stopPropagation()}>
        <button 
          className="control-btn" 
          onClick={onShareClick} 
          disabled={!currentTrack}
          title="共有リンク確立 [SYS.SHARE]"
          style={{ opacity: currentTrack ? 1 : 0.5 }}
        >
          <Share2 size={20} className={isPlaying ? "neon-text-pink" : ""} />
        </button>
        <button className="control-btn" onClick={toggleEq} title="Equalizer">
          <SlidersHorizontal size={20} className={isPlaying ? "neon-text-cyan" : ""} />
        </button>
        <Volume2 size={20} style={{ color: 'var(--text-muted)' }} />
        <input 
          type="range" 
          className="volume-slider" 
          min="0" 
          max="100" 
          value={volume * 100} 
          onChange={(e) => {
            onVolumeChange(Number(e.target.value) / 100);
          }}
          style={{
            accentColor: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)',
            cursor: 'pointer'
          }}
        />
      </div>
    </footer>
  );
};

export default Player;
