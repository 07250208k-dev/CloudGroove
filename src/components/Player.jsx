import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, SlidersHorizontal, Volume2 } from 'lucide-react';

const Player = ({ isPlaying, setIsPlaying, toggleEq }) => {
  return (
    <footer className="player-controls">
      <div className="now-playing-info">
        <div className={`album-art ${isPlaying ? 'glow-art' : ''}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop')" }}></div>
        <div className="track-info">
          <h4>ネオン・シティ・ナイツ</h4>
          <p>サイバー・シンセ・ウェイヴ</p>
        </div>
      </div>

      <div className="controls-center">
        <div className="main-buttons">
          <button className="control-btn"><Shuffle size={20} /></button>
          <button className="control-btn"><SkipBack size={20} /></button>
          <button className="control-btn play-pause-btn" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={24} color="#000" /> : <Play size={24} color="#000" />}
          </button>
          <button className="control-btn"><SkipForward size={20} /></button>
          <button className="control-btn"><Repeat size={20} /></button>
        </div>
        <div className="progress-container">
          <span className="time">1:04</span>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: '25%' }}></div>
          </div>
          <span className="time">4:20</span>
        </div>
      </div>

      <div className="controls-right">
        <button className="control-btn" onClick={toggleEq} title="Equalizer">
          <SlidersHorizontal size={20} className={isPlaying ? "neon-text-cyan" : ""} />
        </button>
        <Volume2 size={20} />
        <input type="range" className="volume-slider" min="0" max="100" defaultValue="70" />
      </div>
    </footer>
  );
};

export default Player;
