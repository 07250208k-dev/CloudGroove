import React, { useState } from 'react';
import { X, Copy, QrCode, Share2, ExternalLink, Music, ListMusic } from 'lucide-react';

const ShareModal = ({
  isOpen,
  onClose,
  currentTrack = null,
  selectedPlaylistId = null,
  playlists = [],
  currentTheme = 'neon',
  addToast
}) => {
  const [activeTab, setActiveTab] = useState(selectedPlaylistId ? 'playlist' : 'track');
  const [isCopying, setIsCopying] = useState(false);

  if (!isOpen) return null;

  // テーマごとのカラー設定 (QRコードAPI用。#は含めない)
  const themeConfig = {
    neon: {
      color: '00f3ff',       // シアン
      bgcolor: '050508',     // ダークブルー
      name: 'Cyber Neon',
      accent: 'var(--neon-cyan)'
    },
    vaporwave: {
      color: 'ff00ff',       // マゼンタ
      bgcolor: '120024',     // ディープインディゴ
      name: 'Vaporwave Grid',
      accent: 'var(--neon-pink)'
    },
    hacker: {
      color: '00ff00',       // マトリックスグリーン
      bgcolor: '020202',     // ピュアブラック
      name: 'Terminal Hacker',
      accent: 'var(--neon-cyan)'
    },
    outrun: {
      color: 'ff5e00',       // サンセットオレンジ
      bgcolor: '14051a',     // ダークバイオレット
      name: 'Outrun Sunset',
      accent: 'var(--neon-pink)'
    }
  };

  const themeInfo = themeConfig[currentTheme] || themeConfig.neon;
  const accentColor = themeInfo.accent;

  // 1. トラック共有情報の構築
  const trackName = currentTrack ? currentTrack.name.replace(/\.[^/.]+$/, "") : '';
  const trackShareUrl = currentTrack ? `${window.location.origin}?trackId=${currentTrack.id}` : '';
  const trackQrUrl = currentTrack 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=${themeInfo.color}&bgcolor=${themeInfo.bgcolor}&data=${encodeURIComponent(trackShareUrl)}`
    : '';

  // 2. プレイリスト共有情報の構築
  let playlistName = '';
  let playlistTrackCount = 0;
  if (selectedPlaylistId) {
    if (selectedPlaylistId.startsWith('sp-')) {
      const smartPlaylists = {
        'sp-recent': '最近同期した曲',
        'sp-heavy': 'ヘビロテトラック',
        'sp-least': '眠れる埋もれ曲',
        'sp-inst': 'インスト曲'
      };
      playlistName = smartPlaylists[selectedPlaylistId] || 'スマートプレイリスト';
    } else {
      const p = playlists.find(pl => pl.id === selectedPlaylistId);
      playlistName = p ? p.name : 'マイプレイリスト';
      playlistTrackCount = p ? p.tracks.length : 0;
    }
  }
  const playlistShareUrl = selectedPlaylistId ? `${window.location.origin}?playlistId=${selectedPlaylistId}` : '';
  const playlistQrUrl = selectedPlaylistId 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=${themeInfo.color}&bgcolor=${themeInfo.bgcolor}&data=${encodeURIComponent(playlistShareUrl)}`
    : '';

  const currentShareUrl = activeTab === 'track' ? trackShareUrl : playlistShareUrl;
  const currentQrUrl = activeTab === 'track' ? trackQrUrl : playlistQrUrl;

  const handleCopyLink = async () => {
    if (!currentShareUrl) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      if (addToast) {
        addToast('🤖 LINK COPIED TO SYNAPSE. [OK]', 'sys');
      }
    } catch (err) {
      console.error('Failed to copy share link:', err);
      if (addToast) addToast('⚠️ Failed to copy share link.', 'error');
    } finally {
      setTimeout(() => setIsCopying(false), 1000);
    }
  };

  const handleOpenLink = () => {
    if (currentShareUrl) {
      window.open(currentShareUrl, '_blank');
    }
  };

  return (
    <div className="cyber-modal-overlay">
      <div className="cyber-modal container-glow-cyan" style={{ maxWidth: '460px', width: '95%', padding: '20px' }}>
        
        {/* ヘッダー */}
        <div className="panel-header" style={{ borderBottom: `1px solid ${accentColor}`, paddingBottom: '12px', marginBottom: '15px' }}>
          <h3 style={{ color: accentColor, display: 'flex', alignItems: 'center', gap: '8px', textShadow: `0 0 10px ${accentColor}66` }}>
            <Share2 size={18} />
            <span>[SYS.SHARE.INTERFACE]</span>
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* タブ切り替え */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '8px',
          padding: '4px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setActiveTab('track')}
            disabled={!currentTrack}
            style={{
              flex: 1,
              background: activeTab === 'track' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
              border: activeTab === 'track' ? `1px solid ${accentColor}` : '1px solid transparent',
              color: activeTab === 'track' ? '#fff' : (currentTrack ? 'var(--text-muted)' : 'rgba(255, 255, 255, 0.15)'),
              borderRadius: '6px',
              padding: '8px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              cursor: currentTrack ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'track' ? `0 0 8px ${accentColor}33` : 'none'
            }}
          >
            <Music size={14} />
            TRACK SHARE
          </button>
          <button
            onClick={() => setActiveTab('playlist')}
            disabled={!selectedPlaylistId}
            style={{
              flex: 1,
              background: activeTab === 'playlist' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
              border: activeTab === 'playlist' ? `1px solid ${accentColor}` : '1px solid transparent',
              color: activeTab === 'playlist' ? '#fff' : (selectedPlaylistId ? 'var(--text-muted)' : 'rgba(255, 255, 255, 0.15)'),
              borderRadius: '6px',
              padding: '8px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              cursor: selectedPlaylistId ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'playlist' ? `0 0 8px ${accentColor}33` : 'none'
            }}
          >
            <ListMusic size={14} />
            PLAYLIST SHARE
          </button>
        </div>

        {/* コンテンツ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
          
          {/* 共有アセットの詳細カード */}
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '12px 15px',
            fontSize: '0.85rem'
          }}>
            {activeTab === 'track' && currentTrack ? (
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', marginBottom: '3px', textTransform: 'uppercase' }}>
                  TARGET SOURCE: CURRENT_TRACK
                </div>
                <div style={{ color: '#fff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {trackName}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  FILE_ID: {currentTrack.id.substring(0, 16)}...
                </div>
              </div>
            ) : activeTab === 'playlist' && selectedPlaylistId ? (
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', marginBottom: '3px', textTransform: 'uppercase' }}>
                  TARGET SOURCE: PLAYLIST_COUPLER
                </div>
                <div style={{ color: '#fff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {playlistName}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {!selectedPlaylistId.startsWith('sp-') && `${playlistTrackCount} TRACKS | `}TYPE: {selectedPlaylistId.startsWith('sp-') ? 'DYNAMIC_SYSTEM' : 'USER_DEFINED'}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', fontSize: '0.8rem' }}>
                共有可能なターゲットがありません
              </div>
            )}
          </div>

          {/* QRコード表示エリア */}
          {currentShareUrl ? (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                padding: '12px',
                background: `rgba(10, 10, 18, 0.95)`,
                border: `2px solid ${accentColor}`,
                borderRadius: '16px',
                boxShadow: `0 0 25px ${accentColor}44`,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {/* 装飾コーナー */}
                <div style={{ position: 'absolute', top: '6px', left: '6px', width: '10px', height: '10px', borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '10px', height: '10px', borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />
                <div style={{ position: 'absolute', bottom: '6px', left: '6px', width: '10px', height: '10px', borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
                <div style={{ position: 'absolute', bottom: '6px', right: '6px', width: '10px', height: '10px', borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />

                <img 
                  src={currentQrUrl} 
                  alt="Cyber QR Share Code"
                  style={{
                    width: '160px',
                    height: '160px',
                    display: 'block',
                    borderRadius: '8px',
                    filter: `drop-shadow(0 0 2px ${accentColor}66)`
                  }}
                  loading="lazy"
                />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                [ SCAN TO LINK BEAT SYNC ]
              </span>
            </div>
          ) : null}

          {/* リンク操作パネル */}
          {currentShareUrl ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '8px 12px',
                width: '100%'
              }}>
                <input 
                  type="text" 
                  readOnly 
                  value={currentShareUrl} 
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    outline: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                />
                <button
                  onClick={handleOpenLink}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    marginLeft: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  title="リンクを新しいタブで開く"
                  onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <ExternalLink size={14} />
                </button>
              </div>

              <button
                onClick={handleCopyLink}
                disabled={isCopying}
                style={{
                  width: '100%',
                  background: `linear-gradient(90deg, ${accentColor}22, ${accentColor}11)`,
                  border: `1px solid ${accentColor}`,
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: `0 0 10px ${accentColor}22`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(90deg, ${accentColor}44, ${accentColor}22)`;
                  e.currentTarget.style.boxShadow = `0 0 15px ${accentColor}44`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(90deg, ${accentColor}22, ${accentColor}11)`;
                  e.currentTarget.style.boxShadow = `0 0 10px ${accentColor}22`;
                }}
              >
                <Copy size={16} />
                {isCopying ? 'COPY COMPLETE' : 'GENERATE SHARE LINK'}
              </button>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
};

export default ShareModal;
