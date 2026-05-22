import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Search, Bot, SlidersHorizontal, Settings, LogIn, LogOut, RefreshCw, X, Play, Pause, HardDrive, Plus } from 'lucide-react';
import DriveLibrary from './components/DriveLibrary';
import SpectrumVisualizer from './components/SpectrumVisualizer';
import Player from './components/Player';
import AIDJ from './components/AIDJ';
import FullScreenPlayer from './components/FullScreenPlayer';

function App() {
  const [renderError, setRenderError] = useState(null);

  // グローバルエラー監視（マウント直後に登録）
  useEffect(() => {
    const handleError = (event) => {
      setRenderError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : null
      });
    };
    const handleRejection = (event) => {
      setRenderError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        error: event.reason ? event.reason.stack : null
      });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const [pipWindow, setPipWindow] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAIDJ, setShowAIDJ] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Google Drive & Auth States
  const [clientId, setClientId] = useState(localStorage.getItem('cg_client_id') || '210521239989-t2bvp162ed8mntukhjndrg3b5tgc2fmq.apps.googleusercontent.com');
  const [accessToken, setAccessToken] = useState(localStorage.getItem('cg_access_token') || '');
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('cg_user_profile');
      if (saved && saved !== 'undefined') {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse user profile from localStorage:", e);
    }
    return null;
  });
  const [tracks, setTracks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [audioFolderIds, setAudioFolderIds] = useState(new Set());
  const [audioFolderCounts, setAudioFolderCounts] = useState({});
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  // Playlist States & Operations
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [activeTrackForPlaylist, setActiveTrackForPlaylist] = useState(null);

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

  // Playback Control & EQ States
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none' | 'all' | 'one'
  const [eqGains, setEqGains] = useState([0, 0, 0, 0, 0]); // 60, 230, 910, 3600, 14000 Hz
  const filtersRef = useRef([]);

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

  // --- Google アカウント別プレイリストのロードと永続化 ---
  useEffect(() => {
    const key = (userProfile && userProfile.sub) ? `cg_playlists_${userProfile.sub}` : 'cg_playlists_guest';
    const saved = localStorage.getItem(key);
    let loadedPlaylists = null;
    
    if (saved) {
      try {
        loadedPlaylists = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved playlists from localStorage:", e);
      }
    }
    
    if (loadedPlaylists && Array.isArray(loadedPlaylists)) {
      setPlaylists(loadedPlaylists);
    } else {
      // アカウント切り替え時の初期デモプレイリスト
      const demoPlaylists = [
        { id: 'pl1', name: '🌙 ナイトドライブ (AI)', type: 'ai', tracks: [] },
        { id: 'pl2', name: '💻 集中コーディング', type: 'manual', tracks: [] }
      ];
      setPlaylists(demoPlaylists);
      localStorage.setItem(key, JSON.stringify(demoPlaylists));
    }
    setSelectedPlaylistId(null);
  }, [userProfile]);

  const savePlaylists = (updatedPlaylists) => {
    if (!Array.isArray(updatedPlaylists)) return;
    setPlaylists(updatedPlaylists);
    const key = (userProfile && userProfile.sub) ? `cg_playlists_${userProfile.sub}` : 'cg_playlists_guest';
    localStorage.setItem(key, JSON.stringify(updatedPlaylists));
  };

  const handleCreatePlaylist = (name, type = 'manual', promptText = '') => {
    let playlistTracks = [];
    
    if (type === 'ai' && promptText && tracks.length > 0) {
      const query = promptText.toLowerCase();
      
      // 1. キーワードマッピングの定義 (SF・サイバーパンク風)
      const keywords = {
        cyber: ['cyber', 'synth', 'neon', 'future', 'grid', 'retro', 'hack', 'matrix', 'system', 'electronic', 'サイバー', 'シンセ', '電子', '未来', 'テクノ'],
        chill: ['chill', 'lofi', 'night', 'midnight', 'sleep', 'relax', 'ambient', 'soft', 'slow', '🌙', '夜', '深夜', 'チル', 'リラックス', '雨', '睡眠'],
        energy: ['rock', 'metal', 'hype', 'fast', 'hard', 'dance', 'club', 'beat', 'bass', 'run', 'drive', '🔥', '激しい', 'ロック', 'ドライブ', 'クラブ', 'ビート', '爆音'],
        vocal: ['vocal', 'sing', 'pop', 'uta', 'song', '歌', 'ボーカル', 'ポップ', 'アニソン']
      };
      
      // プロンプトに含まれるジャンル/ムードを判定
      let matchedCategories = [];
      if (query.includes('サイバー') || query.includes('未来') || query.includes('電子') || query.includes('cyber') || query.includes('synth') || query.includes('インスト') || query.includes('テクノ')) {
        matchedCategories.push('cyber');
      }
      if (query.includes('チル') || query.includes('夜') || query.includes('静か') || query.includes('chill') || query.includes('lofi') || query.includes('眠')) {
        matchedCategories.push('chill');
      }
      if (query.includes('激しい') || query.includes('テンション') || query.includes('ロック') || query.includes('ドライブ') || query.includes('高') || query.includes('rock') || query.includes('energy') || query.includes('走')) {
        matchedCategories.push('energy');
      }
      if (query.includes('歌') || query.includes('ボーカル') || query.includes('ポップ') || query.includes('pop')) {
        matchedCategories.push('vocal');
      }
      
      // 2. スコアリングによる選曲
      const scoredTracks = tracks.map(track => {
        let score = 0;
        const trackNameLower = (track.name || '').toLowerCase();
        
        // カテゴリーキーワードマッチング
        matchedCategories.forEach(cat => {
          keywords[cat].forEach(word => {
            if (trackNameLower.includes(word)) {
              score += 10;
            }
          });
        });
        
        // 部分一致マッチング（プロンプトの単語が曲名に含まれるか）
        const promptWords = query.split(/[\s,，、。・]+/).filter(w => w.length > 1);
        promptWords.forEach(word => {
          if (trackNameLower.includes(word)) {
            score += 15;
          }
        });
        
        // インストゥルメンタル判定
        if (query.includes('インスト') && (trackNameLower.includes('inst') || trackNameLower.includes('off vocal') || trackNameLower.includes('karaoke'))) {
          score += 20;
        }
        
        return { track, score };
      });
      
      // スコア順にソートし、加点された曲を抽出
      let candidates = scoredTracks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.track);
        
      // マッチする曲が少ない（3曲未満）場合は、ドライブ内からインテリジェントにランダムピックアップ
      if (candidates.length < 3) {
        const shuffled = [...tracks].sort(() => 0.5 - Math.random());
        candidates = shuffled.slice(0, Math.min(6, tracks.length));
      } else {
        candidates = candidates.slice(0, 8);
      }
      
      playlistTracks = candidates;
      
      // 選曲完了をオシャレなSFダイアログで通知
      const songListText = playlistTracks.map((t, idx) => `${idx + 1}. ${t.name.substring(0, 40)}`).join('\n');
      alert(`🤖 [SYS.AI.DJ]: ドライブ内の全音声ファイルを解析完了。\n\n「${promptText}」に合致する音響メタデータを検出しました。\n以下の ${playlistTracks.length} 曲を自動選曲し、プレイリストに同期展開します：\n\n${songListText}`);
    } else if (type === 'ai' && tracks.length === 0) {
      alert(`🤖 [SYS.AI.DJ]: ドライブ内の音声ファイルが同期されていません。\n先にGoogle Driveと「同期」し、曲を読み込んでから実行してください。 (空のプレイリストを作成します)`);
    }
    
    const newPl = {
      id: `pl-${Date.now()}`,
      name: name,
      type: type,
      tracks: playlistTracks
    };
    savePlaylists([...playlists, newPl]);
  };

  const handleDeletePlaylist = (playlistId) => {
    const updated = playlists.filter(p => p.id !== playlistId);
    savePlaylists(updated);
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
  };

  const handleAddTrackToPlaylist = (playlistId, track) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        if (p.tracks.some(t => t.id === track.id)) {
          alert('この曲はすでにプレイリストに登録されています。');
          return p;
        }
        return { ...p, tracks: [...p.tracks, track] };
      }
      return p;
    });
    savePlaylists(updated);
    setActiveTrackForPlaylist(null); // 追加後にメニューを閉じる
  };

  const handleRemoveTrackFromPlaylist = (playlistId, trackId) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
      }
      return p;
    });
    savePlaylists(updated);
  };

  // 表示用曲リスト（プレイリスト選択時はその中身、それ以外はGoogle Driveの全曲）
  const displayTracks = (selectedPlaylistId && Array.isArray(playlists))
    ? (playlists.find(p => p.id === selectedPlaylistId)?.tracks || [])
    : (Array.isArray(tracks) ? tracks : []);

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
          if (!file || !file.name) return false;
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
      
      // 5-Band Equalizer Filters (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz)
      const freqs = [60, 230, 910, 3600, 14000];
      const filters = freqs.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.0;
        filter.gain.value = eqGains[i];
        return filter;
      });

      // Connect: source -> filter0 -> ... -> filter4 -> analyser -> destination
      let currentSource = source;
      filters.forEach(filter => {
        currentSource.connect(filter);
        currentSource = filter;
      });
      currentSource.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      filtersRef.current = filters;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const handleEqChange = (index, value) => {
    const newGains = [...eqGains];
    newGains[index] = Number(value);
    setEqGains(newGains);
    
    if (filtersRef.current && filtersRef.current[index] && audioContextRef.current) {
      filtersRef.current[index].gain.setValueAtTime(Number(value), audioContextRef.current.currentTime);
    }
  };

  const applyEqPreset = (presetGains) => {
    setEqGains(presetGains);
    presetGains.forEach((gainVal, i) => {
      if (filtersRef.current && filtersRef.current[i] && audioContextRef.current) {
        filtersRef.current[i].gain.setValueAtTime(gainVal, audioContextRef.current.currentTime);
      }
    });
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

  // デスクトップへ投射 (Document Picture-in-Picture)
  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    try {
      if (!window.documentPictureInPicture) {
        alert('このブラウザは文書Picture-in-Picture APIをサポートしていません。最新のChrome/Edgeをご使用ください。');
        return;
      }

      const w = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 380,
      });

      // 親ウィンドウのスタイルシートをコピーして適用
      const allStyleSheets = Array.from(document.styleSheets);
      allStyleSheets.forEach((styleSheet) => {
        try {
          const cssRules = Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
          const style = w.document.createElement('style');
          style.textContent = cssRules;
          w.document.head.appendChild(style);
        } catch (e) {
          if (styleSheet.href) {
            const link = w.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            w.document.head.appendChild(link);
          }
        }
      });

      // Google Fonts などのフォントリンクのコピー
      const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
      fontLinks.forEach(link => {
        w.document.head.appendChild(link.cloneNode(true));
      });

      w.document.body.className = 'pip-body';
      w.document.title = 'CloudGroove Controller';

      w.addEventListener('pagehide', () => {
        setPipWindow(null);
      });

      setPipWindow(w);
    } catch (err) {
      console.error('Failed to open Document PiP:', err);
      alert('文書PiPの起動に失敗しました。');
    }
  };

  // タブ切り替え（非アクティブ化）時に自動でデスクトップPiPをポップアップ投射する処理
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        if (isPlaying && currentTrack && !pipWindow) {
          try {
            await togglePiP();
          } catch (err) {
            console.warn('バックグラウンド移行時の自動PiP起動に失敗しました:', err);
          }
        }
      } else {
        if (pipWindow) {
          try {
            pipWindow.close();
            setPipWindow(null);
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
  }, [isPlaying, currentTrack, pipWindow]);

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
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error(err));
      }
    } else {
      playNextTrack();
    }
  };

  const playNextTrack = () => {
    if (displayTracks.length === 0 || !currentTrack) return;
    
    if (repeatMode === 'one') {
      playTrack(currentTrack);
      return;
    }

    const currentIndex = displayTracks.findIndex(t => t.id === currentTrack.id);
    
    if (isShuffle) {
      if (displayTracks.length > 1) {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * displayTracks.length);
        } while (randomIndex === currentIndex);
        playTrack(displayTracks[randomIndex]);
      } else {
        playTrack(displayTracks[0]);
      }
    } else {
      if (currentIndex !== -1 && currentIndex < displayTracks.length - 1) {
        playTrack(displayTracks[currentIndex + 1]);
      } else if (repeatMode === 'all') {
        playTrack(displayTracks[0]);
      } else {
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    }
  };

  const playPrevTrack = () => {
    if (displayTracks.length === 0 || !currentTrack) return;
    const currentIndex = displayTracks.findIndex(t => t.id === currentTrack.id);
    
    if (isShuffle) {
      if (displayTracks.length > 1) {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * displayTracks.length);
        } while (randomIndex === currentIndex);
        playTrack(displayTracks[randomIndex]);
      } else {
        playTrack(displayTracks[0]);
      }
    } else {
      if (currentIndex > 0) {
        playTrack(displayTracks[currentIndex - 1]);
      } else if (repeatMode === 'all') {
        playTrack(displayTracks[displayTracks.length - 1]);
      }
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

  if (renderError) {
    return (
      <div style={{
        padding: '30px',
        backgroundColor: '#12000c',
        color: '#ff66aa',
        fontFamily: 'Consolas, monospace',
        minHeight: '100vh',
        boxSizing: 'border-box',
        border: '3px solid var(--neon-pink, #ff007f)',
        boxShadow: '0 0 30px rgba(255, 0, 127, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h1 style={{ 
          color: '#fff', 
          textShadow: '0 0 10px #ff007f, 0 0 20px #ff007f', 
          borderBottom: '2px solid #ff007f', 
          paddingBottom: '15px',
          margin: 0,
          fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '2px'
        }}>
          [⚠️ SYSTEM CRASH DETECTED]
        </h1>
        <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>
            <strong style={{ color: '#fff' }}>ERROR MESSAGE:</strong> {renderError.message}
          </p>
          {renderError.filename && (
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#88a' }}>
              <strong>FILE:</strong> {renderError.filename} (Line: {renderError.lineno}, Col: {renderError.colno})
            </p>
          )}
        </div>
        
        {renderError.error && (
          <pre style={{
            backgroundColor: '#050005',
            padding: '20px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 0, 127, 0.2)',
            overflowX: 'auto',
            color: '#ff88cc',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            margin: 0
          }}>
            {renderError.error}
          </pre>
        )}
        
        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ff007f',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 15px #ff007f',
              transition: 'transform 0.1s'
            }}
          >
            キャッシュと全設定を強制クリアしてリセット
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#00f3ff',
              border: '1px solid #00f3ff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)'
            }}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">

      <DriveLibrary 
        tracks={tracks} 
        folders={hasScanned ? folders.filter(f => audioFolderIds.has(f.id)) : folders} 
        selectedFolderId={selectedFolderId}
        onFolderSelect={(folderId) => {
          setSelectedFolderId(folderId);
          setSelectedPlaylistId(null); // フォルダ選択時はプレイリスト選択を解除
        }}
        currentTrack={currentTrack} 
        folderCounts={audioFolderCounts}
        playlists={playlists}
        selectedPlaylistId={selectedPlaylistId}
        onPlaylistSelect={(playlistId) => {
          setSelectedPlaylistId(playlistId);
          setSelectedFolderId(null); // プレイリスト選択時はフォルダ選択を解除
        }}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
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
          ) : displayTracks.length === 0 ? (
            <div className="sync-prompt">
              <HardDrive size={48} className="neon-text-cyan" />
              <h3>{selectedPlaylistId ? 'プレイリストが空です' : '音声ファイルが見つかりません'}</h3>
              <p>
                {selectedPlaylistId 
                  ? 'G-Drive（フォルダ）から曲を選択し、ホバー時に表示される「＋」アイコンからこのプレイリストに追加してください。'
                  : '選択された場所（またはマイドライブ全体）に再生可能な音声ファイル（.mp3, .wav, .m4a など）があるかご確認ください。'}
              </p>
              {!selectedPlaylistId && (
                <button className="play-generated-btn" onClick={() => fetchDriveFiles(accessToken, selectedFolderId)} style={{ marginTop: '15px' }}>
                  <RefreshCw size={16} style={{ marginRight: '8px' }} /> 再読み込み
                </button>
              )}
            </div>
          ) : (
            <table className="tracklist">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>タイトル</th>
                  <th style={{ width: '120px' }}>ファイルサイズ</th>
                  <th style={{ width: '150px' }}>追加日</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>[操作]</th>
                </tr>
              </thead>
              <tbody>
                {displayTracks.map((track, index) => {
                  if (!track || !track.id) return null;
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
                      <td className="track-actions-cell" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="track-action-btn add-btn"
                            title="プレイリストに追加"
                            onClick={() => setActiveTrackForPlaylist(activeTrackForPlaylist?.id === track.id ? null : track)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--neon-cyan)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.6,
                              transition: 'opacity 0.2s, transform 0.2s'
                            }}
                          >
                            <Plus size={16} />
                          </button>
                          
                          {selectedPlaylistId && (
                            <button 
                              className="track-action-btn remove-btn"
                              title="プレイリストから削除"
                              onClick={() => {
                                if (confirm(`「${track.name}」をこのプレイリストから削除しますか？`)) {
                                  handleRemoveTrackFromPlaylist(selectedPlaylistId, track.id);
                                }
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--neon-pink)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.6,
                                transition: 'opacity 0.2s'
                              }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', height: '160px', marginBottom: '20px', padding: '10px' }}>
              {[60, 230, 910, 3600, 14000].map((freq, index) => (
                <div key={freq} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="-12" 
                    max="12" 
                    value={eqGains[index]} 
                    onChange={(e) => handleEqChange(index, e.target.value)}
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '100px', accentColor: 'var(--neon-cyan)', cursor: 'ns-resize' }} 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{freq > 1000 ? `${freq/1000}k` : freq}Hz</span>
                  <span style={{ fontSize: '0.65rem', color: eqGains[index] > 0 ? 'var(--neon-cyan)' : eqGains[index] < 0 ? 'var(--neon-pink)' : '#888' }}>
                    {eqGains[index] > 0 ? `+${eqGains[index]}` : eqGains[index]}dB
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="play-generated-btn" style={{flex: 1}} onClick={() => applyEqPreset([10, 5, -1, 0, 2])}>Cyber Bass</button>
              <button className="play-generated-btn" style={{flex: 1}} onClick={() => applyEqPreset([-12, -3, 8, 4, -10])}>Retro Radio</button>
              <button className="play-generated-btn" style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.08)'}} onClick={() => applyEqPreset([0, 0, 0, 0, 0])}>Bypass</button>
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
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        repeatMode={repeatMode}
        onToggleRepeat={() => setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none')}
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
          isShuffle={isShuffle}
          onToggleShuffle={() => setIsShuffle(prev => !prev)}
          repeatMode={repeatMode}
          onToggleRepeat={() => setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none')}
          eqGains={eqGains}
          onEqChange={handleEqChange}
          onApplyPreset={applyEqPreset}
        />
      )}

      {/* プレイリスト追加用のサイバーパンク・フローティングドロップダウン */}
      {activeTrackForPlaylist && (
        <div className="cyber-dropdown-overlay" onClick={() => setActiveTrackForPlaylist(null)}>
          <div className="cyber-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-header">
              <span>[ADD TO PLAYLIST]</span>
              <button className="dropdown-close" onClick={() => setActiveTrackForPlaylist(null)}><X size={14} /></button>
            </div>
            <div className="dropdown-title">「{activeTrackForPlaylist.name}」を追加する先:</div>
            <ul className="dropdown-list">
              {playlists.map(pl => (
                <li 
                  key={pl.id} 
                  onClick={() => handleAddTrackToPlaylist(pl.id, activeTrackForPlaylist)}
                >
                  <span className="dropdown-pl-name">{pl.name}</span>
                  <span className="dropdown-pl-count">({pl.tracks?.length || 0} trks)</span>
                </li>
              ))}
              {playlists.length === 0 && (
                <li style={{ color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}>
                  プレイリストがありません
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* フローティング PiP ウィンドウへの React Portal レンダリング */}
      {pipWindow && ReactDOM.createPortal(
        <PipController 
          isPlaying={isPlaying}
          currentTrack={currentTrack}
          trackMetadata={trackMetadata}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          onPlayPause={handlePlayPauseToggle}
          onNext={playNextTrack}
          onPrev={playPrevTrack}
          onShuffle={() => setIsShuffle(prev => !prev)}
          onRepeat={() => setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none')}
        />,
        pipWindow.document.body
      )}
    </div>
  );
}

export default App;

// Document PiP 用のフローティング・サイバーコントローラーコンポーネント
function PipController({
  isPlaying,
  currentTrack,
  trackMetadata,
  isShuffle,
  repeatMode,
  onPlayPause,
  onNext,
  onPrev,
  onShuffle,
  onRepeat
}) {
  const shuffleRef = useRef(null);
  const prevRef = useRef(null);
  const playPauseRef = useRef(null);
  const nextRef = useRef(null);
  const repeatRef = useRef(null);

  useEffect(() => {
    const sBtn = shuffleRef.current;
    const pBtn = prevRef.current;
    const ppBtn = playPauseRef.current;
    const nBtn = nextRef.current;
    const rBtn = repeatRef.current;

    // React Portalでは別ウィンドウ内のイベントバブリングが親ウィンドウのReactでキャッチできないため、
    // ネイティブな addEventListener を直接対象のDOM要素にバインドすることでイベント発火を100%保証します。
    if (sBtn) sBtn.addEventListener('click', onShuffle);
    if (pBtn) pBtn.addEventListener('click', onPrev);
    if (ppBtn) ppBtn.addEventListener('click', onPlayPause);
    if (nBtn) nBtn.addEventListener('click', onNext);
    if (rBtn) rBtn.addEventListener('click', onRepeat);

    return () => {
      if (sBtn) sBtn.removeEventListener('click', onShuffle);
      if (pBtn) pBtn.removeEventListener('click', onPrev);
      if (ppBtn) ppBtn.removeEventListener('click', onPlayPause);
      if (nBtn) nBtn.removeEventListener('click', onNext);
      if (rBtn) rBtn.removeEventListener('click', onRepeat);
    };
  }, [onShuffle, onPrev, onPlayPause, onNext, onRepeat]);

  const title = trackMetadata?.title || currentTrack?.name || '未再生';
  const artist = trackMetadata?.artist || 'Google Drive 音源';
  const coverUrl = trackMetadata?.coverUrl || '';

  return (
    <div className="pip-container">
      <div className="pip-header">
        <span className="pip-brand">CLOUDGROOVE</span>
        <span className="pip-status-glow"></span>
      </div>

      <div className="pip-art-wrap">
        <div 
          className={`pip-album-art ${isPlaying ? 'spinning' : ''}`}
          style={{
            backgroundImage: coverUrl ? `url('${coverUrl}')` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!coverUrl && (
            <div className="pip-art-fallback">
              <span className="pip-logo-icon">🎧</span>
            </div>
          )}
          <div className="pip-disk-center"></div>
        </div>
      </div>

      <div className="pip-meta">
        <div className="pip-title" title={title}>{title}</div>
        <div className="pip-artist">{artist}</div>
      </div>

      <div className="pip-controls">
        <button 
          ref={shuffleRef}
          className={`pip-btn ${isShuffle ? 'active-cyan' : ''}`} 
          title="シャッフル"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"></path><path d="M4 20L21 3"></path><path d="M21 16v5h-5"></path><path d="M15 15l6 6"></path><path d="M4 4l5 5"></path></svg>
        </button>

        <button 
          ref={prevRef}
          className="pip-btn" 
          title="前の曲"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
        </button>

        <button 
          ref={playPauseRef}
          className="pip-btn-play" 
          title={isPlaying ? "一時停止" : "再生"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"></rect><rect x="6" y="4" width="4" height="16" rx="1"></rect></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          )}
        </button>

        <button 
          ref={nextRef}
          className="pip-btn" 
          title="次の曲"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
        </button>

        <button 
          ref={repeatRef}
          className={`pip-btn ${repeatMode !== 'none' ? 'active-pink' : ''}`} 
          title={`リピート: ${repeatMode === 'one' ? '1曲' : repeatMode === 'all' ? 'すべて' : 'オフ'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
          {repeatMode === 'one' && <span className="pip-repeat-badge">1</span>}
        </button>
      </div>
    </div>
  );
}
