import React, { useState, useEffect, useRef } from 'react';
import { Search, Bot, SlidersHorizontal, Settings, LogIn, LogOut, RefreshCw, X, Play, Pause, HardDrive } from 'lucide-react';
import DriveLibrary from './components/DriveLibrary';
import SpectrumVisualizer from './components/SpectrumVisualizer';
import Player from './components/Player';
import AIDJ from './components/AIDJ';
import FullScreenPlayer from './components/FullScreenPlayer';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAIDJ, setShowAIDJ] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Google Drive & Auth States
  const [clientId, setClientId] = useState(localStorage.getItem('cg_client_id') || '');
  const [accessToken, setAccessToken] = useState(localStorage.getItem('cg_access_token') || '');
  const [userProfile, setUserProfile] = useState(JSON.parse(localStorage.getItem('cg_user_profile')) || null);
  const [tracks, setTracks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [audioFolderIds, setAudioFolderIds] = useState(new Set());
  const [audioFolderCounts, setAudioFolderCounts] = useState({});
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [trackMetadata, setTrackMetadata] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Audio & Web Audio API Refs
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);

  // Picture in Picture Video Ref
  const videoRef = useRef(null);

  // Toggle handlers
  const toggleAIDJ = () => {
    setShowAIDJ(!showAIDJ);
    if (!showAIDJ) {
      setShowEQ(false);
      setShowSettings(false);
    }
  };

  const toggleEQ = () => {
    setShowEQ(!showEQ);
    if (!showEQ) {
      setShowAIDJ(false);
      setShowSettings(false);
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    if (!showSettings) {
      setShowAIDJ(false);
      setShowEQ(false);
    }
  };

  // Google OAuth2 Token Client Reference
  const tokenClientRef = useRef(null);

  // Google Identity Servicesの初期化
  useEffect(() => {
    if (clientId && window.google) {
      try {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
          callback: async (response) => {
            if (response.error) {
              alert('認証エラー: ' + response.error);
              return;
            }
            if (response.access_token) {
              setAccessToken(response.access_token);
              localStorage.setItem('cg_access_token', response.access_token);
              await fetchUserProfile(response.access_token);
            }
          },
        });
      } catch (err) {
        console.error('Google Identity SDKの初期化に失敗しました:', err);
      }
    }
  }, [clientId]);

  // トークン起動時のロード
  useEffect(() => {
    if (accessToken) {
      fetchUserProfile(accessToken);
      fetchDriveFolders(accessToken);
      scanAudioFolders(accessToken); // 音声フォルダのバックグラウンドスキャンを開始
      fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
    }
  }, [accessToken]);

  // 選択フォルダ変更時
  useEffect(() => {
    if (accessToken) {
      fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
    }
  }, [selectedFolderId]);

  // プロフィール取得
  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setUserProfile(profile);
        localStorage.setItem('cg_user_profile', JSON.stringify(profile));
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('ユーザー情報の取得失敗:', err);
    }
  };

  // フォルダ取得
  const fetchDriveFolders = async (token) => {
    try {
      const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=50`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setFolders(data.files || []);
      }
    } catch (err) {
      console.error('フォルダ取得エラー:', err);
    }
  };

  // マイドライブ全体の音声ファイルをスキャンし、音楽が入っているフォルダIDと曲数を特定する
  const scanAudioFolders = async (token) => {
    try {
      let q = "trashed = false and (mimeType = 'audio/mpeg' or mimeType = 'audio/mp3' or mimeType = 'audio/wav' or mimeType = 'audio/x-wav' or mimeType = 'audio/mp4' or mimeType = 'audio/x-m4a' or mimeType = 'audio/flac' or mimeType = 'audio/x-flac' or mimeType = 'audio/ogg' or mimeType = 'audio/aac' or mimeType = 'audio/x-aac' or name contains '.mp3' or name contains '.wav' or name contains '.m4a' or name contains '.flac' or name contains '.ogg' or name contains '.aac' or name contains '.m4r')";
      // parentsフィールドを要求して、最大400件の音声ファイルをスキャン
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,parents)&pageSize=400`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const folderIds = new Set();
        const counts = {};
        
        (data.files || []).forEach(file => {
          if (file.parents && file.parents.length > 0) {
            file.parents.forEach(pId => {
              folderIds.add(pId);
              counts[pId] = (counts[pId] || 0) + 1;
            });
          }
        });
        
        setAudioFolderCounts(counts);
        setAudioFolderIds(folderIds);
      }
    } catch (err) {
      console.error('音声フォルダスキャンエラー:', err);
    } finally {
      setHasScanned(true);
    }
  };

  // ファイル取得 (音声ファイル100%厳密フィルター)
  const fetchDriveFiles = async (token, folderId = null, query = '') => {
    setIsLoading(true);
    try {
      // Google Drive APIのqパラメータにおいてmimeType containsは使えないため、完全一致(=)の論理和とname containsを結合した厳密クエリを使用
      let q = "trashed = false and (mimeType = 'audio/mpeg' or mimeType = 'audio/mp3' or mimeType = 'audio/wav' or mimeType = 'audio/x-wav' or mimeType = 'audio/mp4' or mimeType = 'audio/x-m4a' or mimeType = 'audio/flac' or mimeType = 'audio/x-flac' or mimeType = 'audio/ogg' or mimeType = 'audio/aac' or mimeType = 'audio/x-aac' or name contains '.mp3' or name contains '.wav' or name contains '.m4a' or name contains '.flac' or name contains '.ogg' or name contains '.aac' or name contains '.m4r')";
      
      if (folderId) {
        q = `'${folderId}' in parents and (${q})`;
      }
      
      if (query) {
        q = `(${q}) and name contains '${query}'`;
      }
      
      // 各ファイルのparents（親フォルダ）も要求する
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,parents)&pageSize=100`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // 【100%厳密化】クライアント側での二重の音声ファイル・拡張子フィルター
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.m4r'];
        const filteredFiles = (data.files || []).filter(file => {
          const nameLower = file.name.toLowerCase();
          const hasAudioExtension = audioExtensions.some(ext => nameLower.endsWith(ext));
          const isAudioMime = file.mimeType && file.mimeType.startsWith('audio/');
          return hasAudioExtension || isAudioMime;
        });
        
        setTracks(filteredFiles);
      } else if (res.status === 401) {
        handleLogout();
      } else {
        const errData = await res.json();
        console.error('Google Drive API エラー:', errData);
      }
    } catch (err) {
      console.error('Google Drive接続エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ログイン
  const handleLogin = () => {
    if (!clientId) {
      alert('先に設定パネルから「Google クライアント ID」を設定してください。');
      setShowSettings(true);
      return;
    }
    
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } else if (window.google) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
        callback: async (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            localStorage.setItem('cg_access_token', response.access_token);
            await fetchUserProfile(response.access_token);
          }
        },
      });
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    }
  };

  // ログアウト
  const handleLogout = () => {
    setAccessToken('');
    setUserProfile(null);
    setTracks([]);
    setFolders([]);
    setAudioFolderIds(new Set());
    setAudioFolderCounts({});
    setHasScanned(false);
    setSelectedFolderId(null);
    setCurrentTrack(null);
    setTrackMetadata(null);
    setIsPlaying(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
    localStorage.removeItem('cg_access_token');
    localStorage.removeItem('cg_user_profile');
  };

  const handleSaveSettings = (newId) => {
    setClientId(newId);
    localStorage.setItem('cg_client_id', newId);
    alert('クライアントIDを保存しました。');
    setShowSettings(false);
  };

  const initWebAudio = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playTrack = async (track) => {
    setIsLoading(true);
    initWebAudio();
    
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!res.ok) throw new Error('オーディオデータのダウンロードに失敗しました');
      
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      setAudioUrl(objectUrl);
      setCurrentTrack(track);
      
      // 初期メタデータ設定（フォールバック用）
      const cleanTitle = track.name.replace(/\.[^/.]+$/, "");
      setTrackMetadata({
        title: cleanTitle,
        artist: 'Google Drive 音源',
        album: 'マイドライブ',
        coverUrl: ''
      });

      // ID3タグ解析 (非同期)
      try {
        const jsmediatags = window.jsmediatags;
        if (jsmediatags) {
          jsmediatags.read(blob, {
            onSuccess: (tag) => {
              const tags = tag.tags;
              let coverUrl = '';
              
              if (tags.picture) {
                const { data, format } = tags.picture;
                let base64String = '';
                const len = data.length;
                for (let i = 0; i < len; i++) {
                  base64String += String.fromCharCode(data[i]);
                }
                coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
              }

              setTrackMetadata({
                title: tags.title || cleanTitle,
                artist: tags.artist || 'Google Drive 音源',
                album: tags.album || 'マイドライブ',
                coverUrl: coverUrl
              });
            },
            onError: (error) => {
              console.warn('ID3タグ読み込み失敗:', error);
            }
          });
        } else {
          console.warn('jsmediatagsがグローバルスコープに見つかりません');
        }
      } catch (e) {
        console.warn('jsmediatags起動エラー:', e);
      }
      
      if (audioRef.current) {
        audioRef.current.src = objectUrl;
        audioRef.current.load();
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(err => {
              console.error('再生エラー:', err);
              setIsPlaying(false);
            });
        }
      }
    } catch (err) {
      alert('曲のロード中にエラーが発生しました: ' + err.message);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  // デスクトップへ投射 (Picture-in-Picture)
  const togglePiP = async () => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        alert('描画元のスペクトルが見つかりません');
        return;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (videoRef.current) {
          // canvasから映像ストリームを取得 (30fps)
          if (!videoRef.current.srcObject) {
            const stream = canvas.captureStream(30);
            videoRef.current.srcObject = stream;
          }
          
          await videoRef.current.play();
          await videoRef.current.requestPictureInPicture();
        }
      }
    } catch (err) {
      alert('デスクトップ投射 (PiP) の起動に失敗しました。\n※ブラウザが対応しており、一度再生を行ってから実行してください。');
      console.error(err);
    }
  };

  // タブ切り替え（非アクティブ化）時に自動でデスクトップPiPをポップアップ投射する処理
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // ユーザーが別タブや別ウィンドウに移動した（非アクティブ化）
        if (isPlaying && currentTrack && !document.pictureInPictureElement && videoRef.current) {
          try {
            const canvas = document.querySelector('canvas');
            if (canvas) {
              const stream = canvas.captureStream(30);
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
              await videoRef.current.requestPictureInPicture();
            }
          } catch (err) {
            console.warn('バックグラウンド移行時の自動PiP起動に失敗しました:', err);
          }
        }
      } else {
        // ユーザーがタブに戻ってきた（アクティブ化）
        if (document.pictureInPictureElement) {
          try {
            await document.exitPictureInPicture();
          } catch (err) {
            console.warn('アクティブ復帰時のPiP自動クローズに失敗しました:', err);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, currentTrack]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (accessToken) {
      fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setTrackProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTrackDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    playNextTrack();
  };

  const playNextTrack = () => {
    if (tracks.length === 0 || !currentTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      playTrack(tracks[currentIndex + 1]);
    }
  };

  const playPrevTrack = () => {
    if (tracks.length === 0 || !currentTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(tracks[currentIndex - 1]);
    }
  };

  const handlePlayPauseToggle = () => {
    initWebAudio();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error(err));
      }
    }
  };

  const handleSeek = (newTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setTrackProgress(newTime);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getByteSizeText = (bytes) => {
    if (!bytes) return '不明';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="app-container">
      {/* デスクトップ投射 (PiP) 用の隠しvideo要素 */}
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
        playsInline 
        muted 
      />

      <DriveLibrary 
        tracks={tracks} 
        folders={hasScanned ? folders.filter(f => audioFolderIds.has(f.id)) : folders} 
        selectedFolderId={selectedFolderId}
        onFolderSelect={setSelectedFolderId}
        currentTrack={currentTrack} 
        folderCounts={audioFolderCounts}
      />

      <main className="main-content">
        <header className="top-bar">
          <form className="search-bar" onSubmit={handleSearchSubmit}>
            <Search size={18} color="#888899" />
            <input 
              type="text" 
              placeholder="現在のリストを検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!accessToken}
            />
          </form>
          
          <div className="user-profile">
            <Bot className="toggle-icon" size={24} onClick={toggleAIDJ} title="Toggle AI DJ" />
            <Settings className="toggle-icon" size={24} onClick={toggleSettings} title="Settings" />
            
            {userProfile ? (
              <div className="avatar-container" title={`${userProfile.name} として同期中`}>
                <img src={userProfile.picture || "https://ui-avatars.com/api/?name=User&background=00f3ff&color=000"} alt="User" />
                <span className="sync-dot active"></span>
              </div>
            ) : (
              <button className="auth-btn" onClick={handleLogin} title="Google Drive 同期">
                <LogIn size={16} /> 同期
              </button>
            )}
          </div>
        </header>

        <audio 
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          crossOrigin="anonymous"
        />

        <SpectrumVisualizer isPlaying={isPlaying} analyser={analyserRef.current} />

        <div className="tracklist-container">
          {isLoading && (
            <div className="loading-overlay">
              <RefreshCw className="spin-icon" size={32} />
              <p>データを同期中...</p>
            </div>
          )}
          
          {!accessToken ? (
            <div className="sync-prompt">
              <HardDrive size={48} className="neon-text-cyan" />
              <h3>Google Drive 音楽同期</h3>
              <p>Google Driveに保存されている音声ファイル（MP3など）のみを安全に同期・再生します。右上の「同期」から接続してください。</p>
              <button className="play-generated-btn" onClick={handleLogin} style={{ marginTop: '15px' }}>
                <LogIn size={16} style={{ marginRight: '8px' }} /> Googleアカウントと同期する
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="sync-prompt">
              <h3>音声ファイルが見つかりません</h3>
              <p>選択された場所（またはマイドライブ全体）に再生可能な音声ファイル（.mp3, .wav, .m4a など）があるかご確認ください。</p>
              <button className="play-generated-btn" onClick={() => fetchDriveFiles(accessToken, selectedFolderId)} style={{ marginTop: '15px' }}>
                <RefreshCw size={16} style={{ marginRight: '8px' }} /> 再読み込み
              </button>
            </div>
          ) : (
            <table className="tracklist">
              <thead>
                <tr>
                  <th>#</th>
                  <th>タイトル</th>
                  <th>ファイルサイズ</th>
                  <th>追加日</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track, index) => {
                  const isCurrent = currentTrack && currentTrack.id === track.id;
                  return (
                    <tr 
                      key={track.id} 
                      className={isCurrent ? "active-track" : ""}
                      onClick={() => playTrack(track)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        {isCurrent && isPlaying ? (
                          <span className="playing-pulse">▶</span>
                        ) : index + 1}
                      </td>
                      <td className="track-title-cell">{track.name}</td>
                      <td>{getByteSizeText(track.size)}</td>
                      <td>{new Date(track.createdTime).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {showAIDJ && (
          <AIDJ 
            tracks={tracks} 
            playTrack={playTrack} 
            onClose={() => setShowAIDJ(false)} 
          />
        )}
        
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

        {showSettings && (
          <div className="side-panel settings-panel">
            <div className="panel-header">
              <h3><Settings size={18} /> システム設定</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <div className="settings-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--neon-pink)', fontSize: '0.9rem', fontFamily: 'Orbitron' }}>
                  Google OAuth クライアント ID
                </label>
                <input 
                  type="text" 
                  className="settings-input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: '1px solid var(--neon-cyan)',
                    color: '#fff',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}
                  placeholder="xxxxxx.apps.googleusercontent.com"
                  defaultValue={clientId}
                  id="client-id-input"
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                  Google Cloud Consoleで取得したクライアントIDを入力してください。
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  className="play-generated-btn" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    const inputVal = document.getElementById('client-id-input').value;
                    handleSaveSettings(inputVal);
                  }}
                >
                  保存する
                </button>
              </div>

              {accessToken && (
                <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--neon-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="sync-dot active" style={{ position: 'static' }}></span> Google 同期はアクティブです
                  </p>
                  <button 
                    className="play-generated-btn" 
                    style={{ width: '100%', marginTop: '15px', backgroundColor: 'rgba(255, 0, 85, 0.2)', border: '1px solid var(--neon-pink)', color: 'var(--neon-pink)' }}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} style={{ marginRight: '8px' }} /> 連携を解除
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Player 
        isPlaying={isPlaying} 
        setIsPlaying={handlePlayPauseToggle} 
        toggleEq={toggleEQ} 
        currentTrack={currentTrack}
        trackMetadata={trackMetadata}
        progress={trackProgress}
        duration={trackDuration}
        onSeek={handleSeek}
        formatTime={formatTime}
        playNext={playNextTrack}
        playPrev={playPrevTrack}
        onPlayerBarClick={() => {
          if (currentTrack) {
            setShowFullScreenPlayer(true);
          } else {
            alert('音楽を同期して、再生を開始してからクリックしてください');
          }
        }}
      />

      {/* アプリ内別画面（AIDJ, EQ, 設定パネル）遷移時に右下に出現する浮遊ホログラムミニプレイヤー */}
      {isPlaying && currentTrack && (showAIDJ || showEQ || showSettings) && !showFullScreenPlayer && (
        <div 
          className="floating-mini-player" 
          onClick={() => setShowFullScreenPlayer(true)}
          title="クリックでコックピット画面を展開 [SYS.EXPAND]"
        >
          <div className="floating-neon-disk" style={{
            backgroundImage: (trackMetadata && trackMetadata.coverUrl) ? `url('${trackMetadata.coverUrl}')` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: (trackMetadata && trackMetadata.coverUrl) ? '1px solid var(--neon-cyan)' : 'none'
          }}>
            {!trackMetadata?.coverUrl && <div className="disk-core-mini"></div>}
          </div>
          <div className="floating-info">
            <span className="floating-badge">[SYS.HOLO.POPUP]</span>
            <div className="floating-track-name">{trackMetadata ? trackMetadata.title : currentTrack.name}</div>
          </div>
        </div>
      )}

      {/* 大迫力フルスクリーンプレイヤー (表示状態のときのみマウント) */}
      {showFullScreenPlayer && (
        <FullScreenPlayer 
          isPlaying={isPlaying}
          setIsPlaying={handlePlayPauseToggle}
          currentTrack={currentTrack}
          trackMetadata={trackMetadata}
          progress={trackProgress}
          duration={trackDuration}
          onSeek={handleSeek}
          formatTime={formatTime}
          playNext={playNextTrack}
          playPrev={playPrevTrack}
          analyser={analyserRef.current}
          onClose={() => setShowFullScreenPlayer(false)}
          onTogglePiP={togglePiP}
        />
      )}
    </div>
  );
}

export default App;
