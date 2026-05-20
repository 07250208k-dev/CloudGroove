import React, { useState } from 'react';
import { Search, Bot, SlidersHorizontal, X } from 'lucide-react';
import DriveLibrary from './components/DriveLibrary';
import SpectrumVisualizer from './components/SpectrumVisualizer';
import Player from './components/Player';
import AIDJ from './components/AIDJ';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAIDJ, setShowAIDJ] = useState(false);
  const [showEQ, setShowEQ] = useState(false);

  const toggleAIDJ = () => {
    setShowAIDJ(!showAIDJ);
    if (!showAIDJ) setShowEQ(false);
  };

  const toggleEQ = () => {
    setShowEQ(!showEQ);
    if (!showEQ) setShowAIDJ(false);
  };

  return (
    <div className="app-container">
      <DriveLibrary />

      <main className="main-content">
        <header className="top-bar">
          <div className="search-bar">
            <Search size={18} color="#888899" />
            <input type="text" placeholder="Driveライブラリを検索..." />
          </div>
          <div className="user-profile">
            <Bot className="toggle-icon" size={24} onClick={toggleAIDJ} title="Toggle AI DJ" />
            <img src="https://ui-avatars.com/api/?name=User&background=00f3ff&color=000" alt="User" />
          </div>
        </header>

        <SpectrumVisualizer isPlaying={isPlaying} />

        <div className="tracklist-container">
          <table className="tracklist">
            <thead>
              <tr>
                <th>#</th>
                <th>タイトル</th>
                <th>アーティスト</th>
                <th>時間</th>
              </tr>
            </thead>
            <tbody>
              <tr className={isPlaying ? "active-track" : ""}>
                <td>1</td>
                <td>ネオン・シティ・ナイツ</td>
                <td>サイバー・シンセ・ウェイヴ</td>
                <td>4:20</td>
              </tr>
              <tr>
                <td>2</td>
                <td>ホログラム・ティアーズ</td>
                <td>バーチャル・アイドル</td>
                <td>3:45</td>
              </tr>
              <tr>
                <td>3</td>
                <td>データ・ストリーム</td>
                <td>ネットランナー99</td>
                <td>5:12</td>
              </tr>
            </tbody>
          </table>
        </div>

        {showAIDJ && <AIDJ onClose={() => setShowAIDJ(false)} />}
        
        {showEQ && (
          <div className="side-panel">
            <div className="panel-header">
              <h3><SlidersHorizontal size={18} /> 5-Band Graphic EQ</h3>
              <button className="close-btn" onClick={() => setShowEQ(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', height: '150px', marginBottom: '20px' }}>
              {[60, 230, 910, 3600, 14000].map(freq => (
                <div key={freq} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <input type="range" min="-12" max="12" defaultValue={Math.floor(Math.random() * 24) - 12} 
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '100px', accentColor: 'var(--neon-cyan)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{freq > 1000 ? `${freq/1000}k` : freq}Hz</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="play-generated-btn" style={{flex: 1}}>Cyber Bass</button>
              <button className="play-generated-btn" style={{flex: 1}}>Retro Radio</button>
            </div>
          </div>
        )}
      </main>

      <Player isPlaying={isPlaying} setIsPlaying={setIsPlaying} toggleEq={toggleEQ} />
    </div>
  );
}

export default App;
