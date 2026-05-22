import React, { useState } from 'react';
import { HardDrive, Folder, Lock, ListMusic, Zap, Coffee, Plus, Sparkles, FolderOpen, Trash2, X } from 'lucide-react';

const DriveLibrary = ({ 
  tracks = [], 
  folders = [], 
  selectedFolderId = null,
  onFolderSelect,
  currentTrack = null,
  folderCounts = {},
  playlists = [],
  selectedPlaylistId = null,
  onPlaylistSelect,
  onCreatePlaylist,
  onDeletePlaylist
}) => {
  const [showSecret, setShowSecret] = useState(false);

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
      onCreatePlaylist(name.trim(), 'manual');
    }
  };

  // AIプレイリスト作成ボタンのハンドラ
  const handleCreateAIPlaylist = () => {
    const promptText = prompt('どのような曲調のプレイリストを作成しますか？\n(例:「深夜の高速道路を走るのに合うサイバーなインスト曲」)');
    if (promptText && promptText.trim()) {
      onCreatePlaylist(`🤖 ${promptText.substring(0, 15)}... (AI)`, 'ai', promptText.trim());
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
          {playlists.map(pl => {
            const isActive = selectedPlaylistId === pl.id;
            return (
              <li 
                key={pl.id} 
                className={`playlist ${isActive ? 'active-playlist' : ''}`}
                onClick={() => onPlaylistSelect(pl.id)}
                style={{ 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  transition: 'background 0.2s, border-color 0.2s',
                  border: isActive ? '1px solid var(--neon-pink)' : '1px solid transparent',
                  background: isActive ? 'rgba(255, 0, 127, 0.05)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {pl.type === 'ai' ? (
                    <Zap size={16} className={isActive ? "neon-text-pink" : "neon-text-cyan"} />
                  ) : (
                    <Coffee size={16} style={{ color: isActive ? 'var(--neon-pink)' : 'var(--text-muted)' }} />
                  )}
                  <span style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontWeight: isActive ? 'bold' : 'normal',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }} title={pl.name}>
                    {pl.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.5, color: 'var(--text-muted)' }}>({pl.tracks?.length || 0})</span>
                </div>
                
                <button
                  className="playlist-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`プレイリスト「${pl.name}」を削除しますか？`)) {
                      onDeletePlaylist(pl.id);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    marginLeft: '8px'
                  }}
                  title="プレイリスト削除"
                >
                  <Trash2 size={13} className="trash-icon" />
                </button>
              </li>
            );
          })}
          
          {playlists.length === 0 && (
            <li className="playlist" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none', padding: '10px' }}>
              (プレイリストがありません)
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
};

export default DriveLibrary;
