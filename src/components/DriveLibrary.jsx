import React, { useState } from 'react';
import { HardDrive, Folder, Lock, ListMusic, Zap, Coffee } from 'lucide-react';

const DriveLibrary = () => {
  const [showSecret, setShowSecret] = useState(false);

  const handleBrandDoubleClick = () => {
    setShowSecret(!showSecret);
    if (!showSecret) {
      alert('システムメッセージ: [機密] ASMRフォルダのロックが解除されました。');
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand" onDoubleClick={handleBrandDoubleClick}>
        <HardDrive className="neon-text-pink" size={24} />
        <h1 className="glitch" data-text="CloudGroove">CloudGroove</h1>
        <span className="badge">PRO</span>
      </div>
      
      <div className="library-section">
        <h2><HardDrive size={16} /> G-Drive</h2>
        <ul className="folder-tree">
          <li className="folder"><Folder size={16} /> アニメサントラ</li>
          <li className="folder"><Folder size={16} /> 同人音楽</li>
          <li className="folder"><Folder size={16} /> 90年代J-POP</li>
          <li className="folder"><Folder size={16} /> シンセウェイヴ・ミックス</li>
          {showSecret && (
            <li className="folder secret-folder">
              <Lock size={16} /> [機密] ASMR
            </li>
          )}
        </ul>
      </div>

      <div className="library-section">
        <h2><ListMusic size={16} /> AIプレイリスト</h2>
        <ul className="playlist-tree">
          <li className="playlist"><Zap size={16} className="neon-text-cyan" /> ナイトドライブ (AI)</li>
          <li className="playlist"><Coffee size={16} /> 集中コーディング</li>
        </ul>
      </div>
    </aside>
  );
};

export default DriveLibrary;
