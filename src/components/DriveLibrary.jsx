import React, { useState } from 'react';
import { HardDrive, Folder, Lock, ListMusic, Zap, Coffee, Plus, Sparkles, FolderOpen } from 'lucide-react';

const DriveLibrary = ({ 
  tracks = [], 
  folders = [], 
  selectedFolderId = null,
  onFolderSelect,
  currentTrack = null,
  folderCounts = {}
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [playlists, setPlaylists] = useState([
    { id: 'pl1', name: 'ナイトドライブ (AI)', type: 'ai' },
    { id: 'pl2', name: '集中コーディング', type: 'manual' }
  ]);

  const handleBrandDoubleClick = () => {
    setShowSecret(!showSecret);
    if (!showSecret) {
      alert('システムメッセージ: [機密] ASMRフォルダのロックが解除されました。');
    }
  };

  // プレイリスト作成ボタンのハンドラ
  const handleCreatePlaylist = () => {
    const name = prompt('新規プレイリストの名前を入力してください:');
    if (name && name.trim()) {
      const newPl = {
        id: `pl-${Date.now()}`,
        name: name.trim(),
        type: 'manual'
      };
      setPlaylists([...playlists, newPl]);
    }
  };

  // AIプレイリスト作成ボタンのハンドラ
  const handleCreateAIPlaylist = () => {
    const promptText = prompt('どのような曲調のプレイリストを作成しますか？\n(例:「深夜 of 高速道路を走るのに合うサイバーなインスト曲」)');
    if (promptText && promptText.trim()) {
      alert(`AI DJ が「${promptText}」のテーマでドライブ内の音楽を解析中...\n\nプレイリスト「${promptText.substring(0, 10)}... (AI)」を生成しました！`);
      const newPl = {
        id: `pl-ai-${Date.now()}`,
        name: `🤖 ${promptText.substring(0, 10)}... (AI)`,
        type: 'ai'
      };
      setPlaylists([...playlists, newPl]);
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand" onDoubleClick={handleBrandDoubleClick}>
        <HardDrive className="neon-text-pink" size={24} />
        <h1 className="glitch" data-text="CloudGroove">CloudGroove</h1>
        <span className="badge">PRO</span>
      </div>
      
      {/* G-Drive (フォルダ階層) セクション */}
      <div className="library-section">
        <h2><HardDrive size={16} /> G-Drive (フォルダ)</h2>
        <ul className="folder-tree" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
          {/* すべての曲 (マイドライブ全体) */}
          <li 
            className={`folder ${selectedFolderId === null ? 'active-folder' : ''}`}
            onClick={() => onFolderSelect(null)}
            style={{ fontWeight: selectedFolderId === null ? 'bold' : 'normal' }}
          >
            <FolderOpen size={16} className={selectedFolderId === null ? "neon-text-cyan" : ""} /> 
            <span>すべての音楽 ({tracks.length}曲)</span>
          </li>

          {/* 本物のGoogle Drive上のフォルダ階層を動的にループ */}
          {folders.map(folder => {
            const isActive = selectedFolderId === folder.id;
            const count = folderCounts[folder.id] || 0;
            return (
              <li 
                key={folder.id}
                className={`folder ${isActive ? 'active-folder' : ''}`}
                onClick={() => onFolderSelect(folder.id)}
                style={{ fontWeight: isActive ? 'bold' : 'normal' }}
              >
                <Folder size={16} className={isActive ? "neon-text-cyan" : ""} /> 
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  width: '100%',
                  minWidth: 0
                }}>
                  <span style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    marginRight: '8px' 
                  }} title={folder.name}>
                    {folder.name}
                  </span>
                  {count > 0 && (
                    <span className="cyber-folder-badge" style={{
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                      color: isActive ? 'var(--neon-pink)' : 'var(--neon-cyan)',
                      background: 'rgba(0, 243, 255, 0.05)',
                      border: `1px solid ${isActive ? 'rgba(255,0,127,0.3)' : 'rgba(0,243,255,0.15)'}`,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      flexShrink: 0
                    }}>
                      {count} trk
                    </span>
                  )}
                </div>
              </li>
            );
          })}

          {folders.length === 0 && (
            <li className="folder" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}>
              (フォルダがありません)
            </li>
          )}

          {showSecret && (
            <li className="folder secret-folder" style={{ color: 'var(--neon-pink)', borderLeft: '2px solid var(--neon-pink)', paddingLeft: '4px' }}>
              <Lock size={16} /> [機密] ASMR
            </li>
          )}
        </ul>
      </div>

      {/* プレイリスト セクション */}
      <div className="library-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2><ListMusic size={16} /> プレイリスト</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleCreatePlaylist}
              title="プレイリスト作成"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--neon-cyan)',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={handleCreateAIPlaylist}
              title="AIプレイリスト自動生成"
              style={{
                background: 'transparent',
                border: '1px solid rgba(181, 0, 255, 0.3)',
                color: 'var(--neon-purple)',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>

        <ul className="playlist-tree">
          {playlists.map(pl => (
            <li key={pl.id} className="playlist">
              {pl.type === 'ai' ? (
                <Zap size={16} className="neon-text-cyan" />
              ) : (
                <Coffee size={16} style={{ color: 'var(--text-muted)' }} />
              )}
              <span>{pl.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default DriveLibrary;
