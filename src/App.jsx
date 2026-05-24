import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Search, Bot, SlidersHorizontal, Settings, LogIn, LogOut, RefreshCw, X, Play, Pause, HardDrive, Plus, Download, Trash2, Edit3, Moon, Folder, ListPlus, BarChart3 } from 'lucide-react';
import DriveLibrary from './components/DriveLibrary';
import SpectrumVisualizer from './components/SpectrumVisualizer';
import Player from './components/Player';
import AIDJ from './components/AIDJ';
import FullScreenPlayer from './components/FullScreenPlayer';
import UploadModal from './components/UploadModal';
import TagEditModal from './components/TagEditModal';
import MoveModal from './components/MoveModal';
import CyberToast from './components/CyberToast';
import StatsConsole from './components/StatsConsole';
import ShareModal from './components/ShareModal';

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
  const [showStats, setShowStats] = useState(false);
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('cg_theme') || 'neon');
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState(localStorage.getItem('cg_vis_mode') || 'hacker_grid');
  const [bypassWebAudio, setBypassWebAudio] = useState(() => {
    const saved = localStorage.getItem('cg_bypass_web_audio');
    if (saved !== null) {
      return saved === 'true';
    }
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile;
  });

  // --- Upload & Download States ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [isDownloadingFolder, setIsDownloadingFolder] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlLogs, setDlLogs] = useState([]);

  // --- ASMR Zen Mode States ---
  const [isAsmrMode, setIsAsmrMode] = useState(false);
  const [showAsmrPanel, setShowAsmrPanel] = useState(false);
  const [sleepTimer, setSleepTimer] = useState(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState(0);
  const rainAudioRef = useRef(null);
  const [rainVolume, setRainVolume] = useState(0);
  const [secretFolderId, setSecretFolderId] = useState(localStorage.getItem('cg_secret_folder_id') || '');
  const [movingAsset, setMovingAsset] = useState(null);

  // --- Toast Notification System ---
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [{ id, message, type }, ...prev]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Play Queue ---
  const [playQueue, setPlayQueue] = useState([]);

  const addToQueue = useCallback((track) => {
    setPlayQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
    addToast(`キューに追加: "${track.name.replace(/\.[^/.]+$/, '')}"`, 'info');
  }, [addToast]);

  const removeFromQueue = useCallback((index) => {
    setPlayQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setPlayQueue([]);
  }, []);

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
  const audioRef2 = useRef(null);
  const activeAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const sourceRef2 = useRef(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [currentBlob, setCurrentBlob] = useState(null);
  const [currentLyrics, setCurrentLyrics] = useState([]);
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const playLoggedRef = useRef(false);

  // Playback Control, Volume & EQ States
  const [volume, setVolume] = useState(0.7);
  const [crossfadeDuration, setCrossfadeDuration] = useState(5);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none' | 'all' | 'one'
  const [eqGains, setEqGains] = useState([0, 0, 0, 0, 0]); // 60, 230, 910, 3600, 14000 Hz
  const filtersRef = useRef([]);

  // Audio Effects Nodes & States
  const gainNode1 = useRef(null);
  const gainNode2 = useRef(null);
  const masterGainNodeRef = useRef(null);
  const reverbNodeRef = useRef(null);
  const reverbWetGainRef = useRef(null);
  const delayNodeRef = useRef(null);
  const delayFeedbackGainRef = useRef(null);
  const delayWetGainRef = useRef(null);
  const lowpassFilterRef = useRef(null);
  const highpassFilterRef = useRef(null);
  const compressorNodeRef = useRef(null);
  const isCrossfadingRef = useRef(false);

  const [isReverbOn, setIsReverbOn] = useState(false);
  const [reverbMix, setReverbMix] = useState(30); // 0 to 100
  const [isDelayOn, setIsDelayOn] = useState(false);
  const [delayTime, setDelayTime] = useState(0.3); // 0.1 to 1.0s
  const [delayFeedback, setDelayFeedback] = useState(40); // 0 to 80%
  const [isFilterOn, setIsFilterOn] = useState(false);
  const [lowpassFreq, setLowpassFreq] = useState(8000); // 200 to 20000Hz
  const [highpassFreq, setHighpassFreq] = useState(20); // 20 to 2000Hz
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 0.5x to 2.0x

  // Picture in Picture Video Ref
  const videoRef = useRef(null);

  // Toggle handlers
  const toggleAIDJ = () => {
    setShowAIDJ(!showAIDJ);
    if (!showAIDJ) {
      setShowEQ(false);
      setShowSettings(false);
      setShowStats(false);
      setShowAsmrPanel(false);
    }
  };

  const toggleEQ = () => {
    setShowEQ(!showEQ);
    if (!showEQ) {
      setShowAIDJ(false);
      setShowSettings(false);
      setShowStats(false);
      setShowAsmrPanel(false);
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    if (!showSettings) {
      setShowAIDJ(false);
      setShowEQ(false);
      setShowStats(false);
      setShowAsmrPanel(false);
    }
  };

  const toggleStats = () => {
    setShowStats(!showStats);
    if (!showStats) {
      setShowAIDJ(false);
      setShowEQ(false);
      setShowSettings(false);
      setShowAsmrPanel(false);
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
        { id: 'pl2', name: '💻 集中コーディング', type: 'manual', tracks: [] },
        { id: 'pl-asmr1', name: '💤 深い眠りの誘い (ASMR)', type: 'asmr', tracks: [] },
        { id: 'pl-asmr2', name: '🎧 耳かき・ささやき特選 (ASMR)', type: 'asmr', tracks: [] }
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
    
    // ASMRモード中なら、強制的に type: 'asmr' にする（AI生成プレイリストも含めて）
    const finalType = isAsmrMode ? 'asmr' : type;
    
    if (type === 'ai' && promptText && tracks.length > 0) {
      const query = promptText.toLowerCase();
      
      // 1. キーワードマッピングの定義 (SF・サイバーパンク風)
      const keywords = {
        cyber: ['cyber', 'synth', 'neon', 'future', 'grid', 'retro', 'hack', 'matrix', 'system', 'electronic', 'サイバー', 'シンセ', '電子', '未来', 'テクノ'],
        chill: ['chill', 'lofi', 'night', 'midnight', 'sleep', 'relax', 'ambient', 'soft', 'slow', '🌙', '夜', '深夜', 'チル', 'リラックス', '雨', '睡眠'],
        energy: ['rock', 'metal', 'hype', 'fast', 'hard', 'dance', 'club', 'beat', 'bass', 'run', 'drive', '🔥', '激しい', 'ロック', 'ドライブ', 'クラブ', 'ビート', '爆音'],
        vocal: ['vocal', 'sing', 'pop', 'uta', 'song', '歌', 'ボーカル', 'ポップ', 'アニソン'],
        asmr: ['asmr', 'ear', 'whisper', 'sleep', 'rain', 'relax', 'ささやき', '耳かき', '睡眠', '雨', '癒し', '安眠']
      };
      
      // プロンプトに含まれるジャンル/ムードを判定
      let matchedCategories = [];
      if (isAsmrMode) {
        matchedCategories.push('asmr');
        matchedCategories.push('chill');
      }

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
      if (query.includes('asmr') || query.includes('耳かき') || query.includes('ささやき') || query.includes('癒')) {
        matchedCategories.push('asmr');
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
      addToast(`🤖 AI.DJ: 「${promptText}」に合致する ${playlistTracks.length} 曲を自動選曲しました。`, 'sys');
    } else if (type === 'ai' && tracks.length === 0) {
      addToast('ドライブ内の音声ファイルが同期されていません。先にGoogle Driveと同期してください。', 'warn');
    }
    
    const newPl = {
      id: `pl-${Date.now()}`,
      name: name,
      type: finalType,
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
          addToast('この曲はすでにプレイリストに登録されています。', 'warn');
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

  const getSmartPlaylistTracks = (id) => {
    if (!tracks || tracks.length === 0) return [];
    
    // localStorageから再生履歴ログをロード
    const key = (userProfile && userProfile.sub) ? `cg_play_log_${userProfile.sub}` : 'cg_play_log_guest';
    const saved = localStorage.getItem(key);
    let playLogs = [];
    if (saved) {
      try { playLogs = JSON.parse(saved); } catch (e) {}
    }
    if (!Array.isArray(playLogs)) playLogs = [];
    
    switch (id) {
      case 'sp-recent':
      case 'sp-asmr-recent':
        // 最近同期した15曲 (作成日時降順)
        return [...tracks]
          .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime))
          .slice(0, 15);
          
      case 'sp-heavy':
      case 'sp-asmr-heavy':
        // 再生履歴ログから再生回数を集計し、多い順にソート
        const counts = {};
        playLogs.forEach(entry => {
          counts[entry.trackId] = (counts[entry.trackId] || 0) + 1;
        });
        return [...tracks]
          .filter(t => counts[t.id] > 0)
          .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
          .slice(0, 15);
          
      case 'sp-rediscover':
        // まだ再生されていない、または再生回数の極めて少ない曲をランダム抽出
        const loggedIds = new Set(playLogs.map(l => l.trackId));
        const unplayed = tracks.filter(t => !loggedIds.has(t.id));
        if (unplayed.length >= 5) {
          return [...unplayed].sort(() => 0.5 - Math.random()).slice(0, 15);
        } else {
          const leastCounts = {};
          playLogs.forEach(entry => {
            leastCounts[entry.trackId] = (leastCounts[entry.trackId] || 0) + 1;
          });
          return [...tracks]
            .sort((a, b) => (leastCounts[a.id] || 0) - (leastCounts[b.id] || 0))
            .slice(0, 15);
        }
        
      case 'sp-chill':
        return tracks.filter(t => {
          const nameLower = (t.name || '').toLowerCase();
          return nameLower.includes('lofi') || nameLower.includes('lo-fi') || nameLower.includes('chill') || nameLower.includes('ambient') || nameLower.includes('sleep') || nameLower.includes('relax') || nameLower.includes('rain');
        });
        
      case 'sp-energy':
        return tracks.filter(t => {
          const nameLower = (t.name || '').toLowerCase();
          return nameLower.includes('hype') || nameLower.includes('energy') || nameLower.includes('rock') || nameLower.includes('metal') || nameLower.includes('fast') || nameLower.includes('drive') || nameLower.includes('club') || nameLower.includes('beat') || nameLower.includes('bass') || nameLower.includes('synth');
        });
        
      case 'sp-instrumental':
        return tracks.filter(t => {
          const nameLower = (t.name || '').toLowerCase();
          return nameLower.includes('inst') || nameLower.includes('instrumental') || nameLower.includes('off vocal') || nameLower.includes('offvocal') || nameLower.includes('karaoke') || nameLower.includes('instrument');
        });
        
      case 'sp-asmr-ear':
        return tracks.filter(t => {
          const nameLower = (t.name || '').toLowerCase();
          return nameLower.includes('耳かき') || nameLower.includes('mimikaki') || nameLower.includes('ear cleaning') || nameLower.includes('massage') || nameLower.includes('マッサージ');
        });
        
      case 'sp-asmr-whisper':
        return tracks.filter(t => {
          const nameLower = (t.name || '').toLowerCase();
          return nameLower.includes('ささやき') || nameLower.includes('whisper') || nameLower.includes('voice') || nameLower.includes('音声') || nameLower.includes('ボイス') || nameLower.includes('バイノーラル') || nameLower.includes('binaural');
        });
        
      case 'sp-asmr-nature':
        return tracks.filter(t => {
          const nameLower = (t.name || '').toLowerCase();
          return nameLower.includes('雨') || nameLower.includes('波') || nameLower.includes('雷') || nameLower.includes('自然') || nameLower.includes('rain') || nameLower.includes('wave') || nameLower.includes('thunder') || nameLower.includes('nature') || nameLower.includes('ambient') || nameLower.includes('environment') || nameLower.includes('環境音');
        });
        
      default:
        return [];
    }
  };

  // 表示用曲リスト（プレイリスト選択時はその中身、それ以外はGoogle Driveの全曲）
  const displayTracks = (() => {
    if (selectedPlaylistId) {
      if (selectedPlaylistId.startsWith('sp-')) {
        return getSmartPlaylistTracks(selectedPlaylistId);
      }
      return playlists.find(p => p.id === selectedPlaylistId)?.tracks || [];
    }
    return Array.isArray(tracks) ? tracks : [];
  })();

  // Google OAuth2 Token Client Reference
  const tokenClientRef = useRef(null);

  // Google Identity Servicesの初期化
  useEffect(() => {
    if (clientId && window.google) {
      try {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile',
          callback: async (response) => {
            if (response.error) {
              addToast('認証エラー: ' + response.error, 'error');
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

  // テーマの変更を適用
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('cg_theme', currentTheme);
  }, [currentTheme]);

  // PWA Service Worker Ready Notification
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        addToast('🤖 PWA.SYSTEM: OFFLINE SHIELD ENGAGED. [OK]', 'sys');
      });
    }
  }, [addToast]);

  // URLクエリパラメータのブート起動処理
  useEffect(() => {
    if (!accessToken || hasBootstrapped) return;

    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('trackId');
    const playlistId = params.get('playlistId');

    if (!trackId && !playlistId) {
      setHasBootstrapped(true);
      return;
    }

    const boot = async () => {
      setHasBootstrapped(true);
      
      if (trackId) {
        addToast('🤖 [SYS.BOOT]: RESOLVING SHARED TRACK...', 'sys');
        const found = tracks.find(t => t.id === trackId);
        if (found) {
          addToast(`🤖 [SYS.BOOT]: PLAYING "${found.name.replace(/\.[^/.]+$/, '')}"`, 'success');
          playTrack(found);
        } else {
          try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${trackId}?fields=id,name,mimeType`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (res.ok) {
              const file = await res.json();
              if (file.mimeType.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a') || file.name.endsWith('.ogg') || file.name.endsWith('.flac')) {
                const tempTrack = { id: file.id, name: file.name };
                addToast(`🤖 [SYS.BOOT]: PLAYING EXT-TRACK "${file.name.replace(/\.[^/.]+$/, '')}"`, 'success');
                playTrack(tempTrack);
              } else {
                addToast('⚠️ [SYS.BOOT]: SHARED FILE IS NOT AN AUDIO FILE', 'error');
              }
            } else {
              addToast('⚠️ [SYS.BOOT]: SHARED FILE NOT FOUND OR INACCESSIBLE', 'error');
            }
          } catch (err) {
            console.error('Failed to boot shared track:', err);
            addToast('⚠️ [SYS.BOOT]: RESOLUTION FAILED', 'error');
          }
        }
      } else if (playlistId) {
        addToast('🤖 [SYS.BOOT]: COUPLING SHARED PLAYLIST...', 'sys');
        setSelectedPlaylistId(playlistId);
        
        let playlistTracks = [];
        if (playlistId.startsWith('sp-')) {
          playlistTracks = getSmartPlaylistTracks(playlistId);
        } else {
          playlistTracks = playlists.find(p => p.id === playlistId)?.tracks || [];
        }
        
        if (playlistTracks.length > 0) {
          addToast(`🤖 [SYS.BOOT]: PLAYING FIRST TRACK OF PLAYLIST`, 'success');
          playTrack(playlistTracks[0]);
        } else {
          addToast('🤖 [SYS.BOOT]: PLAYLIST COUPLED. NO TRACKS TO AUTO-PLAY.', 'info');
        }
      }
      
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    };

    if (hasScanned || tracks.length > 0) {
      boot();
    } else {
      const timer = setTimeout(() => {
        boot();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [accessToken, tracks, playlists, hasScanned, hasBootstrapped]);

  // トークン起動時のロード
  useEffect(() => {
    if (accessToken) {
      fetchUserProfile(accessToken);
      fetchDriveFolders(accessToken);
      scanAudioFolders(accessToken); // 音声フォルダのバックグラウンドスキャンを開始
      fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
    }
  }, [accessToken]);

  // 選択フォルダ変更時、またはフォルダ一覧・隠しフォルダIDの解決完了時
  useEffect(() => {
    if (accessToken) {
      fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
    }
  }, [selectedFolderId, secretFolderId, folders]);

  // ASMR モード切り替え時に、選択フォルダをリセットしファイルを再取得
  useEffect(() => {
    if (accessToken) {
      setSelectedFolderId(null);
      fetchDriveFiles(accessToken, null, searchQuery);
    }
  }, [isAsmrMode]);

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

  // フォルダ取得 ＆ 隠しASMRフォルダの自動確認・生成 (全件取得対応)
  const fetchDriveFolders = async (token) => {
    try {
      const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
      let allFolders = [];
      let pageToken = '';
      
      do {
        let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,parents)&pageSize=1000`;
        if (pageToken) {
          url += `&pageToken=${pageToken}`;
        }
        
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('フォルダ一覧の取得に失敗しました');
        
        const data = await res.json();
        allFolders = [...allFolders, ...(data.files || [])];
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      
      setFolders(allFolders);
      const secretFolder = allFolders.find(f => f.name === '.cg_secret_asmr');
      if (secretFolder) {
        setSecretFolderId(secretFolder.id);
        localStorage.setItem('cg_secret_folder_id', secretFolder.id);
      } else {
        console.log("Generating ASMR secret folder...");
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '.cg_secret_asmr', mimeType: 'application/vnd.google-apps.folder' })
        });
        if (createRes.ok) {
          fetchDriveFolders(token);
        }
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
      
      // 全てのASMRフォルダIDを再帰的に取得する (階層の深さ問わず完璧にトレース)
      const getAsmrFolderIdsTransitive = () => {
        const ids = new Set();
        if (!secretFolderId) return ids;
        
        let prevSize = -1;
        while (ids.size !== prevSize) {
          prevSize = ids.size;
          folders.forEach(f => {
            if (!ids.has(f.id)) {
              const isDirectChild = f.parents && f.parents.includes(secretFolderId);
              const isIndirectChild = f.parents && f.parents.some(p => ids.has(p));
              if (isDirectChild || isIndirectChild) {
                ids.add(f.id);
              }
            }
          });
        }
        return ids;
      };
      
      const asmrFolderIdsSet = getAsmrFolderIdsTransitive();
      const asmrFolderIds = Array.from(asmrFolderIdsSet);
      
      if (folderId) {
        q = `'${folderId}' in parents and (${q})`;
      } else if (isAsmrMode) {
        if (secretFolderId) {
          const parentsQuery = [`'${secretFolderId}' in parents`, ...asmrFolderIds.map(id => `'${id}' in parents`)].join(' or ');
          q = `(${parentsQuery}) and (${q})`;
        } else {
          q = `'dummy_nonexistent' in parents`;
        }
      }
      
      if (query) {
        q = `(${q}) and name contains '${query}'`;
      }
      
      // 各ファイルのparents（親フォルダ）も要求する。pageSizeを400に増やしてより多くの曲を取得
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,parents)&pageSize=400`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.m4r'];
        const filteredFiles = (data.files || []).filter(file => {
          if (!file || !file.name) return false;
          const nameLower = file.name.toLowerCase();
          const hasAudioExtension = audioExtensions.some(ext => nameLower.endsWith(ext));
          const isAudioMime = file.mimeType && file.mimeType.startsWith('audio/');
          const isValidAudio = hasAudioExtension || isAudioMime;
          if (!isValidAudio) return false;
          const isAsmrAsset = file.parents && file.parents.some(p => p === secretFolderId || asmrFolderIdsSet.has(p));
          if (isAsmrMode) {
            return isAsmrAsset;
          } else {
            return !isAsmrAsset;
          }
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

  // --- Google Driveファイル・フォルダ移動 ---
  const moveAsset = async (assetId, currentParentId, targetParentId, isFolder = false) => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      let url = `https://www.googleapis.com/drive/v3/files/${assetId}?addParents=${targetParentId}`;
      if (currentParentId && currentParentId !== 'root' && currentParentId !== 'root_dummy') {
        url += `&removeParents=${currentParentId}`;
      }
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('移動リクエストに失敗しました');
      
      addToast(`${isFolder ? 'フォルダ' : 'ファイル'}を移動しました。`, 'success');
      
      // 移動後の再同期
      fetchDriveFolders(accessToken);
      fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
      scanAudioFolders(accessToken);
    } catch (err) {
      addToast(`移動エラー: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 音声ファイル単体ダウンロードロジック ---
  const downloadSingleTrack = async (track) => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('音声データのダウンロードに失敗しました');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = track.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      addToast(`ダウンロードエラー: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- フォルダZIP一括ダウンロードロジック ---
  const downloadFolderAsZip = async (folderId, folderName) => {
    if (!accessToken) return;
    setIsDownloadingFolder(true);
    setDlProgress(0);
    setDlLogs([]);
    
    const addDlLog = (text, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      setDlLogs(prev => [...prev, `[${timestamp}] [${type.toUpperCase()}] ${text}`]);
    };

    addDlLog(`INITIATING ZIP COMPILATION PROTOCOL FOR: "${folderName}"`, 'sys');

    try {
      addDlLog(`FETCHING FILE SYSTEM STRUCTURE FROM REMOTE CLOUD...`, 'sys');
      let q = `'${folderId}' in parents and trashed = false and (mimeType = 'audio/mpeg' or mimeType = 'audio/mp3' or mimeType = 'audio/wav' or mimeType = 'audio/x-wav' or mimeType = 'audio/mp4' or mimeType = 'audio/x-m4a' or mimeType = 'audio/flac' or mimeType = 'audio/x-flac' or mimeType = 'audio/ogg' or mimeType = 'audio/aac' or mimeType = 'audio/x-aac' or name contains '.mp3' or name contains '.wav' or name contains '.m4a' or name contains '.flac' or name contains '.ogg' or name contains '.aac')`;
      const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size)&pageSize=100`;
      
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!listRes.ok) throw new Error('ファイル一覧の取得に失敗しました');
      const listData = await listRes.json();
      const filesToDownload = listData.files || [];

      if (filesToDownload.length === 0) {
        addDlLog(`NO DOWNLOADABLE AUDIO FILES DETECTED IN THIS DIRECTORY.`, 'error');
        addToast('このフォルダ内に対応する音声ファイルが見つかりませんでした。', 'warn');
        setIsDownloadingFolder(false);
        return;
      }

      addDlLog(`DETECTED ${filesToDownload.length} AUDIO FILES. STARTING STREAM CAPTURING...`, 'sys');
      
      if (!window.JSZip) {
        throw new Error('JSZip library not found. Please refresh the page and try again.');
      }
      
      const zip = new window.JSZip();
      let successCount = 0;

      for (let i = 0; i < filesToDownload.length; i++) {
        const file = filesToDownload[i];
        addDlLog(`DOWNLOADING [${i + 1}/${filesToDownload.length}]: "${file.name}"...`, 'sys');

        try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!res.ok) throw new Error('API capture error');
          const blob = await res.blob();
          
          zip.file(file.name, blob);
          successCount++;
          addDlLog(`ADDED TO ZIP CACHE: "${file.name}" [OK]`, 'ok');
        } catch (e) {
          addDlLog(`FAILED TO CAPTURE: "${file.name}" - ${e.message}`, 'warn');
        }

        // ダウンロード進捗を全体の80%として算出
        setDlProgress(Math.round(((i + 1) / filesToDownload.length) * 80));
      }

      if (successCount === 0) {
        throw new Error('すべてのファイルのダウンロードに失敗しました。');
      }

      addDlLog(`CAPTURE PHASE COMPLETE. COMPILING ZIP ARCHIVE PACKETS...`, 'sys');
      setDlProgress(85);

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        // 圧縮状況を85%〜100%にマッピング
        setDlProgress(Math.round(85 + (metadata.percent * 0.15)));
      });

      addDlLog(`ZIP ARCHIVE SUCCESSFULLY COMPILED. LAUNCHING DOWNLOAD SEQUENCE...`, 'ok');
      
      const objectUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      addDlLog(`SEQUENCE SUCCESSFUL. LOCAL STREAM COMPLETED. [OK]`, 'sys');
      
      setTimeout(() => {
        setIsDownloadingFolder(false);
      }, 1500);

    } catch (err) {
      addDlLog(`CRITICAL ERROR DURING PIPELINE SYNCHRONIZATION: ${err.message}`, 'error');
      setTimeout(() => {
        setIsDownloadingFolder(false);
      }, 3000);
    }
  };

  // --- Google Driveファイル（トラック）永久削除 ---
  const deleteTrack = async (track) => {
    if (!accessToken) return;
    if (!confirm(`[WARNING] "${track.name}" をGoogle Driveから永久に削除しますか？\nこの操作は取り消せません。`)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${track.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('API delete request failed');
      
      // 再生中だった場合は停止する
      if (currentTrack && currentTrack.id === track.id) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setCurrentTrack(null);
        setTrackMetadata(null);
        setIsPlaying(false);
      }

      addToast('ファイルを削除しました。', 'success');
      // リスト更新
      fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
      scanAudioFolders(accessToken);
    } catch (err) {
      addToast(`削除エラー: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Google Driveフォルダ永久削除 ---
  const deleteFolder = async (folderId, folderName) => {
    if (!accessToken) return;
    if (!confirm(`[WARNING] フォルダ "${folderName}" とその中のすべてのファイルをGoogle Driveから永久に削除しますか？\nこの操作は取り消せません。`)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('API delete request failed');
      
      addToast('フォルダを削除しました。', 'success');
      setSelectedFolderId(null);
      fetchDriveFiles(accessToken, null);
      fetchDriveFolders(accessToken);
      scanAudioFolders(accessToken);
    } catch (err) {
      addToast(`削除エラー: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Google Driveフォルダ名前変更 ---
  const renameFolder = async (folderId, oldName) => {
    if (!accessToken) return;
    const newName = prompt(`フォルダ「${oldName}」の新しい名前を入力してください:`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (!res.ok) throw new Error('フォルダ名の変更に失敗しました');
      
      addToast('フォルダ名を変更しました。', 'success');
      fetchDriveFolders(accessToken);
    } catch (err) {
      addToast(`エラー: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ASMR スリープタイマー ---
  const startSleepTimer = (minutes) => {
    if (sleepTimer) {
      clearInterval(sleepTimer);
    }
    
    if (minutes === 0) {
      setSleepTimer(null);
      setSleepTimeRemaining(0);
      addToast('🤖 睡眠タイマーを解除しました。', 'sys');
      return;
    }

    const totalSeconds = minutes * 60;
    setSleepTimeRemaining(totalSeconds);
    
    addToast(`🤖 睡眠タイマーを ${minutes} 分にセット。\n終了5分前から自動フェードアウトします。`, 'sys');

    const interval = setInterval(() => {
      setSleepTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setSleepTimer(null);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.volume = 1.0; 
          }
          setIsPlaying(false);
          addToast('💤 睡眠サイクル完了。スタンバイ状態へ移行します。', 'sys');
          return 0;
        }

        // 最後の5分 (300秒) でフェードアウトを実行
        if (prev <= 300 && audioRef.current) {
          const fadeVolume = prev / 300;
          audioRef.current.volume = fadeVolume;
        }

        return prev - 1;
      });
    }, 1000);

    setSleepTimer(interval);
  };

  // --- ASMR 雨音音量変更 ---
  const handleRainVolumeChange = (volumeVal) => {
    setRainVolume(volumeVal);
    if (rainAudioRef.current) {
      const vol = volumeVal / 100;
      rainAudioRef.current.volume = vol;
      
      if (vol > 0) {
        if (rainAudioRef.current.paused) {
          rainAudioRef.current.play().catch(e => console.log("Ambient rain loop started", e));
        }
      } else {
        rainAudioRef.current.pause();
      }
    }
  };

  // --- ASMR/Normal モード切り替え ---
  const toggleAsmrMode = () => {
    const nextState = !isAsmrMode;
    setIsAsmrMode(nextState);
    if (nextState) {
      addToast('🔮 安息メディテーションモードへ移行。\nルナウェーブと雨音が意識を夢幻の彼方へ誘います。', 'sys');
    } else {
      addToast('⚡ サイバーパンクコックピットへ帰還。出力最大化。', 'sys');
      // 雨音を停止
      handleRainVolumeChange(0);
      // スリープタイマーも解除
      startSleepTimer(0);
    }
  };

  // ログイン
  const handleLogin = () => {
    if (!clientId) {
      addToast('先に設定パネルから「Google クライアント ID」を設定してください。', 'warn');
      setShowSettings(true);
      return;
    }
    
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } else if (window.google) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile',
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

  // Driveの状態を更新する (再同期)
  const handleRefreshDrive = async () => {
    if (!accessToken) return;
    try {
      await Promise.all([
        fetchDriveFolders(accessToken),
        fetchDriveFiles(accessToken, selectedFolderId, searchQuery),
        scanAudioFolders(accessToken)
      ]);
    } catch (e) {
      console.error("Failed to refresh Drive state:", e);
    }
  };

  const handleSaveSettings = (newId) => {
    setClientId(newId);
    localStorage.setItem('cg_client_id', newId);
    addToast('クライアントIDを保存しました。', 'success');
    setShowSettings(false);
  };

  const handleBypassWebAudioChange = (val) => {
    setBypassWebAudio(val);
    localStorage.setItem('cg_bypass_web_audio', val);
    addToast(val ? '🤖 DIRECT ENGINE: ON [SYS.DIRECT.ACTIVE]' : '⚡ CYBER AUDIO ENGINE: ON [SYS.AUDIO.ACTIVE]', 'sys');
    addToast('エンジン変更を適用するため、次の曲の再生時に反映されます。', 'info');
  };

  const createImpulseResponse = (context, duration, decay) => {
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const percent = i / length;
      // 指数関数的に減衰するホワイトノイズで極上のリバーブ残響を表現
      const val = (Math.random() * 2 - 1) * Math.pow(1 - percent, decay);
      left[i] = val;
      right[i] = val;
    }
    return impulse;
  };

  const initWebAudio = () => {
    if (bypassWebAudio) {
      audioContextRef.current = null;
      return;
    }
    if (!audioContextRef.current && audioRef.current && audioRef2.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      
      // Analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      
      // 2系統のオーディオソースを作成
      const source1 = ctx.createMediaElementSource(audioRef.current);
      const source2 = ctx.createMediaElementSource(audioRef2.current);
      
      // クロスフェード用のゲインノードを作成
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      // 初期状態：1系統目をアクティブ(ゲイン=1)、2系統目をサイレント(ゲイン=0)
      g1.gain.value = 1.0;
      g2.gain.value = 0.0;
      
      source1.connect(g1);
      source2.connect(g2);
      
      // ローパス & ハイパスフィルター
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = isFilterOn ? lowpassFreq : 20000;
      
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = isFilterOn ? highpassFreq : 20;
      
      g1.connect(lp);
      g2.connect(lp);
      lp.connect(hp);
      
      // 5バンド・グラフィック・イコライザー（ハイパスの後段に結合）
      const freqs = [60, 230, 910, 3600, 14000];
      const filters = freqs.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.0;
        filter.gain.value = eqGains[i];
        return filter;
      });
      
      let currentSource = hp;
      filters.forEach(filter => {
        currentSource.connect(filter);
        currentSource = filter;
      });
      
      // ディレイ & フィードバック回路
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = delayTime;
      
      const delayFeedbackNode = ctx.createGain();
      delayFeedbackNode.gain.value = isDelayOn ? (delayFeedback / 100) : 0;
      
      delay.connect(delayFeedbackNode);
      delayFeedbackNode.connect(delay);
      
      // ディレイのウェット出力制御
      const delayWet = ctx.createGain();
      delayWet.gain.value = isDelayOn ? 0.4 : 0;
      
      currentSource.connect(delay);
      delay.connect(delayWet);
      
      // 残響用リバーブ (Convolver)
      const reverb = ctx.createConvolver();
      reverb.buffer = createImpulseResponse(ctx, 2.0, 2.0); // 2秒の残響時間
      
      const reverbWet = ctx.createGain();
      reverbWet.gain.value = isReverbOn ? (reverbMix / 100) : 0;
      
      currentSource.connect(reverb);
      reverb.connect(reverbWet);
      
      // ミキサー (ドライ音 + ディレイ湿音 + リバーブ湿音の統合)
      const effectMixer = ctx.createGain();
      currentSource.connect(effectMixer);
      delayWet.connect(effectMixer);
      reverbWet.connect(effectMixer);
      
      // ダイナミクスコンプレッサー (音割れ防止と全体の音圧ブースト)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-20, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(10, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      
      effectMixer.connect(compressor);
      compressor.connect(analyser);
      
      // マスター音量ゲイン
      const masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);
      
      // 各種リファレンスの格納
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source1;
      sourceRef2.current = source2;
      
      gainNode1.current = g1;
      gainNode2.current = g2;
      masterGainNodeRef.current = masterGain;
      
      lowpassFilterRef.current = lp;
      highpassFilterRef.current = hp;
      
      delayNodeRef.current = delay;
      delayFeedbackGainRef.current = delayFeedbackNode;
      delayWetGainRef.current = delayWet;
      
      reverbNodeRef.current = reverb;
      reverbWetGainRef.current = reverbWet;
      
      compressorNodeRef.current = compressor;
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

  const updateFilters = (isOn, lpVal, hpVal) => {
    if (lowpassFilterRef.current && highpassFilterRef.current && audioContextRef.current) {
      const time = audioContextRef.current.currentTime;
      if (isOn) {
        lowpassFilterRef.current.frequency.setValueAtTime(lpVal, time);
        highpassFilterRef.current.frequency.setValueAtTime(hpVal, time);
      } else {
        lowpassFilterRef.current.frequency.setValueAtTime(20000, time);
        highpassFilterRef.current.frequency.setValueAtTime(20, time);
      }
    }
  };

  const updateDelay = (isOn, delaySec, feedbackVal) => {
    if (delayNodeRef.current && delayFeedbackGainRef.current && delayWetGainRef.current && audioContextRef.current) {
      const time = audioContextRef.current.currentTime;
      delayNodeRef.current.delayTime.setValueAtTime(delaySec, time);
      delayFeedbackGainRef.current.gain.setValueAtTime(isOn ? (feedbackVal / 100) : 0, time);
      delayWetGainRef.current.gain.setValueAtTime(isOn ? 0.4 : 0, time);
    }
  };

  const updateReverb = (isOn, mixVal) => {
    if (reverbWetGainRef.current && audioContextRef.current) {
      const time = audioContextRef.current.currentTime;
      reverbWetGainRef.current.gain.setValueAtTime(isOn ? (mixVal / 100) : 0, time);
    }
  };

  const updatePlaybackSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
    if (audioRef2.current) audioRef2.current.playbackRate = speed;
  };

  const parseLrc = (lrcText) => {
    const lines = lrcText.split(/\r?\n/);
    const timeReg = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
    const parsed = [];
    
    for (const line of lines) {
      timeReg.lastIndex = 0;
      let match;
      const timestamps = [];
      
      while ((match = timeReg.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const msText = match[3] || "0";
        const ms = parseFloat("0." + msText) * 1000;
        const totalSec = min * 60 + sec + ms / 1000;
        timestamps.push(totalSec);
      }
      
      const cleanText = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
      
      if (timestamps.length > 0) {
        for (const t of timestamps) {
          parsed.push({ time: t, text: cleanText });
        }
      }
    }
    
    parsed.sort((a, b) => a.time - b.time);
    return parsed;
  };

  const fetchLyrics = async (track, token) => {
    if (!track.parents || track.parents.length === 0) {
      setCurrentLyrics([]);
      return;
    }
    
    try {
      const baseName = track.name.replace(/\.[^/.]+$/, "");
      const escapedName = baseName.replace(/'/g, "\\'");
      const q = `'${track.parents[0]}' in parents and name = '${escapedName}.lrc' and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const files = data.files || [];
        if (files.length > 0) {
          const lrcFileId = files[0].id;
          const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${lrcFileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (contentRes.ok) {
            const text = await contentRes.text();
            const parsed = parseLrc(text);
            setCurrentLyrics(parsed);
            return;
          }
        }
      }
      setCurrentLyrics([]);
    } catch (e) {
      console.warn("LRC lyrics search failed:", e);
      setCurrentLyrics([]);
    }
  };

  const logPlayEvent = (track, metadata, exactDuration) => {
    if (!track) return;
    try {
      const baseKey = isAsmrMode ? 'cg_play_log_asmr_' : 'cg_play_log_';
      const userSub = (userProfile && userProfile.sub) ? userProfile.sub : 'guest';
      const key = `${baseKey}${userSub}`;
      const saved = localStorage.getItem(key);
      let logsList = [];
      if (saved) {
        logsList = JSON.parse(saved);
      }
      if (!Array.isArray(logsList)) logsList = [];
      
      const cleanTitle = metadata?.title || track.name.replace(/\.[^/.]+$/, "");
      const artistName = metadata?.artist || 'Google Drive 音源';
      const albumName = metadata?.album || 'マイドライブ';
      
      const newEntry = {
        trackId: track.id,
        title: cleanTitle,
        artist: artistName,
        album: albumName,
        duration: exactDuration && !isNaN(exactDuration) ? exactDuration : 200,
        timestamp: Date.now()
      };
      
      logsList.unshift(newEntry);
      
      if (logsList.length > 500) {
        logsList = logsList.slice(0, 500);
      }
      
      localStorage.setItem(key, JSON.stringify(logsList));
      console.log(`[SYS.PLAY_LOGGER] Track logged successfully: "${cleanTitle}"`);
    } catch (e) {
      console.error("Failed to log play event:", e);
    }
  };

  const playTrack = async (track, forceNoCrossfade = false) => {
    setIsLoading(true);
    initWebAudio();
    
    try {
      const activeAudio = activeAudioRef.current || audioRef.current;
      const inactiveAudio = activeAudio === audioRef.current ? audioRef2.current : audioRef.current;
      const activeGain = activeAudio === audioRef.current ? gainNode1.current : gainNode2.current;
      const inactiveGain = activeAudio === audioRef.current ? gainNode2.current : gainNode1.current;
      
      let objectUrl = '';
      let blob = null;
      if (track.isDemo) {
        objectUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        setCurrentBlob(null);
      } else {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (!res.ok) throw new Error('オーディオデータのダウンロードに失敗しました');
        
        blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setCurrentBlob(blob);
      }
      
      if (audioUrl && !track.isDemo) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(objectUrl);
      setCurrentTrack(track);
      playLoggedRef.current = false;
      if (!track.isDemo) {
        fetchLyrics(track, accessToken);
      } else {
        setCurrentLyrics([]);
      }
      
      // 初期メタデータ設定（フォールバック用）
      const cleanTitle = track.name.replace(/\.[^/.]+$/, "");
      setTrackMetadata({
        title: track.isDemo ? 'Cyberpunk Slumber [DEMO]' : cleanTitle,
        artist: track.isDemo ? 'CloudGroove Synthwave' : 'Google Drive 音源',
        album: track.isDemo ? 'Virtual Reality Simulation' : 'マイドライブ',
        coverUrl: track.isDemo ? 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500&auto=format&fit=crop' : ''
      });

      // ID3タグ解析 (非同期)
      try {
        const jsmediatags = window.jsmediatags;
        if (jsmediatags && blob) {
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
        }
      } catch (e) {
        console.warn('jsmediatags起動エラー:', e);
      }
      
      // 他方の音声要素を完全に停止させる
      inactiveAudio.pause();
      inactiveAudio.currentTime = 0;
      
      // ゲインコントロールの設定
      if (gainNode1.current && gainNode2.current) {
        const time = audioContextRef.current.currentTime;
        activeGain.gain.setValueAtTime(1.0, time);
        inactiveGain.gain.setValueAtTime(0.0, time);
      }
      
      activeAudio.src = objectUrl;
      activeAudio.playbackRate = playbackSpeed;
      activeAudio.volume = bypassWebAudio ? volume : 1.0;
      activeAudio.load();
      
      const playPromise = activeAudio.play();
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
      
      // ロックの初期化
      isCrossfadingRef.current = false;
      
    } catch (err) {
      addToast('曲のロード中にエラーが発生しました: ' + err.message, 'error');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const playTrackWithCrossfade = async (track) => {
    if (bypassWebAudio || track.isDemo) {
      return playTrack(track, true);
    }
    setIsLoading(true);
    initWebAudio();
    
    try {
      const activeAudio = activeAudioRef.current || audioRef.current;
      const inactiveAudio = activeAudio === audioRef.current ? audioRef2.current : audioRef.current;
      const activeGain = activeAudio === audioRef.current ? gainNode1.current : gainNode2.current;
      const inactiveGain = activeAudio === audioRef.current ? gainNode2.current : gainNode1.current;
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!res.ok) throw new Error('オーディオデータのダウンロードに失敗しました');
      
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      setCurrentBlob(blob);
      setCurrentTrack(track);
      playLoggedRef.current = false;
      fetchLyrics(track, accessToken);
      
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
            }
          });
        }
      } catch (e) {
        console.warn(e);
      }
      
      // フェード用の準備
      inactiveAudio.src = objectUrl;
      inactiveAudio.playbackRate = playbackSpeed;
      inactiveAudio.load();
      
      const time = audioContextRef.current.currentTime;
      
      // フェードスケジュール
      inactiveGain.gain.setValueAtTime(0.0, time);
      inactiveGain.gain.linearRampToValueAtTime(1.0, time + crossfadeDuration);
      
      activeGain.gain.setValueAtTime(activeGain.gain.value, time);
      activeGain.gain.linearRampToValueAtTime(0.0, time + crossfadeDuration);
      
      await inactiveAudio.play();
      setIsPlaying(true);
      
      // アクティブオーディオ要素の切り替え
      activeAudioRef.current = inactiveAudio;
      
      // 旧音声のクリーンアップ処理（クロスフェード秒数後）
      setTimeout(() => {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(objectUrl);
        isCrossfadingRef.current = false;
      }, crossfadeDuration * 1000);
      
    } catch (err) {
      addToast('クロスフェード遷移中にエラーが発生しました: ' + err.message, 'error');
      isCrossfadingRef.current = false;
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
        addToast('このブラウザは文書PiP APIをサポートしていません。最新Chrome/Edgeを使用してください。', 'warn');
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
      addToast('文書PiPの起動に失敗しました。', 'error');
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
        // Sync trackProgress when returning to foreground to snap progress bar back in place
        const activeAudio = activeAudioRef.current || audioRef.current;
        if (activeAudio) {
          setTrackProgress(activeAudio.currentTime);
        }

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

  const handleTimeUpdate = (e) => {
    const activeAudio = activeAudioRef.current || audioRef.current;
    if (e.target === activeAudio) {
      // Save mobile CPU in background: only update progress state when visible
      if (document.visibilityState === 'visible') {
        setTrackProgress(e.target.currentTime);
      }
      
      // Update Media Session position state
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: e.target.duration || 0,
            playbackRate: e.target.playbackRate || 1.0,
            position: e.target.currentTime || 0
          });
        } catch (err) {
          console.warn("Failed to set MediaSession position state", err);
        }
      }
      
      // 再生履歴ログの記録（30秒以上、または半分の再生で記録）
      if (!playLoggedRef.current && currentTrack && e.target.duration > 0) {
        const threshold = Math.min(30, e.target.duration * 0.5);
        if (e.target.currentTime >= threshold) {
          playLoggedRef.current = true;
          logPlayEvent(currentTrack, trackMetadata, e.target.duration);
        }
      }
      
      // 自動クロスフェードの検出
      if (
        !isCrossfadingRef.current && 
        crossfadeDuration > 0 &&
        repeatMode !== 'one' && // 1曲リピート時はクロスフェードしない
        e.target.duration > 0 &&
        e.target.duration - e.target.currentTime <= crossfadeDuration
      ) {
        isCrossfadingRef.current = true;
        playNextTrack(false);
      }
    }
  };

  const handleLoadedMetadata = (e) => {
    const activeAudio = activeAudioRef.current || audioRef.current;
    if (e.target === activeAudio) {
      setTrackDuration(e.target.duration);
    }
  };

  const handleAudioEnded = (e) => {
    const activeAudio = activeAudioRef.current || audioRef.current;
    if (e.target !== activeAudio) return;
    
    if (repeatMode === 'one') {
      e.target.currentTime = 0;
      e.target.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error(err));
    } else {
      playNextTrack(true); // クロスフェードはすでに完了しているため forceNoCrossfade = true
    }
  };

  const playNextTrack = (forceNoCrossfade = false) => {
    let nextTrack = null;
    let newQueue = [...playQueue];
    
    if (newQueue.length > 0) {
      nextTrack = newQueue[0];
      newQueue = newQueue.slice(1);
    } else if (displayTracks.length > 0 && currentTrack) {
      const currentIndex = displayTracks.findIndex(t => t.id === currentTrack.id);
      if (isShuffle) {
        if (displayTracks.length > 1) {
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * displayTracks.length);
          } while (randomIndex === currentIndex);
          nextTrack = displayTracks[randomIndex];
        } else {
          nextTrack = displayTracks[0];
        }
      } else {
        if (currentIndex !== -1 && currentIndex < displayTracks.length - 1) {
          nextTrack = displayTracks[currentIndex + 1];
        } else if (repeatMode === 'all') {
          nextTrack = displayTracks[0];
        }
      }
    }
    
    if (nextTrack) {
      if (newQueue.length !== playQueue.length) {
        setPlayQueue(newQueue);
      }
      
      if (!forceNoCrossfade && crossfadeDuration > 0 && currentTrack) {
        playTrackWithCrossfade(nextTrack);
      } else {
        playTrack(nextTrack, true);
      }
    } else {
      if (repeatMode === 'one' && currentTrack) {
        playTrack(currentTrack);
      } else {
        setIsPlaying(false);
        const activeAudio = activeAudioRef.current || audioRef.current;
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
        }
      }
    }
  };

  const playPrevTrack = () => {
    if (displayTracks.length === 0 || !currentTrack) return;
    const currentIndex = displayTracks.findIndex(t => t.id === currentTrack.id);
    let prevTrack = null;
    
    if (isShuffle) {
      if (displayTracks.length > 1) {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * displayTracks.length);
        } while (randomIndex === currentIndex);
        prevTrack = displayTracks[randomIndex];
      } else {
        prevTrack = displayTracks[0];
      }
    } else {
      if (currentIndex > 0) {
        prevTrack = displayTracks[currentIndex - 1];
      } else if (repeatMode === 'all') {
        prevTrack = displayTracks[displayTracks.length - 1];
      }
    }
    
    if (prevTrack) {
      playTrack(prevTrack, true);
    }
  };

  const handlePlayPauseToggle = () => {
    initWebAudio();
    const activeAudio = activeAudioRef.current || audioRef.current;
    if (activeAudio) {
      if (isPlaying) {
        activeAudio.pause();
        setIsPlaying(false);
      } else {
        activeAudio.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error(err));
      }
    }
  };

  const handleSeek = (newTime) => {
    const activeAudio = activeAudioRef.current || audioRef.current;
    if (activeAudio) {
      activeAudio.currentTime = newTime;
      setTrackProgress(newTime);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- キーボードショートカット ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // input/textarea にフォーカス中は無効化
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPauseToggle();
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            playPrevTrack();
          } else if (audioRef.current) {
            e.preventDefault();
            handleSeek(Math.max(0, audioRef.current.currentTime - 5));
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            playNextTrack();
          } else if (audioRef.current) {
            e.preventDefault();
            handleSeek(Math.min(trackDuration, audioRef.current.currentTime + 5));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.volume = Math.min(1, audioRef.current.volume + 0.05);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.05);
          }
          break;
        case 's':
        case 'S':
          setIsShuffle(prev => !prev);
          break;
        case 'r':
        case 'R':
          setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');
          break;
        case 'f':
        case 'F':
          if (currentTrack) setShowFullScreenPlayer(prev => !prev);
          break;
        case 'Escape':
          if (showFullScreenPlayer) setShowFullScreenPlayer(false);
          else if (showAIDJ) setShowAIDJ(false);
          else if (showEQ) setShowEQ(false);
          else if (showSettings) setShowSettings(false);
          else if (showAsmrPanel) setShowAsmrPanel(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTrack, trackDuration, showFullScreenPlayer, showAIDJ, showEQ, showSettings, showAsmrPanel]);

  // --- Media Session API (Background playback UI) ---
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      try {
        const cleanTitle = currentTrack.name.replace(/\.[^/.]+$/, "");
        const title = trackMetadata?.title || cleanTitle;
        const artist = trackMetadata?.artist || 'Google Drive 音源';
        const album = trackMetadata?.album || 'マイドライブ';
        
        let coverUrl = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500&auto=format&fit=crop';
        if (trackMetadata?.coverUrl && !trackMetadata.coverUrl.includes('undefined')) {
          coverUrl = trackMetadata.coverUrl;
        }

        if (window.MediaMetadata) {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: title,
            artist: artist,
            album: album,
            artwork: [
              { src: coverUrl, sizes: '512x512', type: 'image/png' }
            ]
          });
        }
      } catch (err) {
        console.warn("Failed to set MediaSession metadata:", err);
      }
    }
  }, [currentTrack, trackMetadata]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          handlePlayPauseToggle();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          handlePlayPauseToggle();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playPrevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNextTrack();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.fastSeek && 'fastSeek' in (activeAudioRef.current || audioRef.current)) {
            const activeAudio = activeAudioRef.current || audioRef.current;
            activeAudio.fastSeek(details.seekTime);
          } else {
            handleSeek(details.seekTime);
          }
        });
      } catch (e) {
        console.warn("MediaSession handlers initialization failed", e);
      }
    }
  }, [displayTracks]);

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
            onClick={async () => {
              localStorage.clear();
              sessionStorage.clear();
              
              if ('serviceWorker' in navigator) {
                try {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  for (const reg of registrations) {
                    await reg.unregister();
                  }
                } catch (e) {
                  console.error("SW unregister failed:", e);
                }
              }

              if ('caches' in window) {
                try {
                  const keys = await caches.keys();
                  for (const key of keys) {
                    await caches.delete(key);
                  }
                } catch (e) {
                  console.error("Caches clear failed:", e);
                }
              }

              window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
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
    <div className={`app-container ${isAsmrMode ? 'asmr-theme' : ''}`}>
      <DriveLibrary 
        tracks={tracks} 
        folders={(() => {
          const all = hasScanned ? folders.filter(f => audioFolderIds.has(f.id)) : folders;
          
          // 再帰的にすべてのASMRフォルダ（階層問わず）を特定
          const asmrFolderIdsSet = new Set();
          if (secretFolderId) {
            let prevSize = -1;
            while (asmrFolderIdsSet.size !== prevSize) {
              prevSize = asmrFolderIdsSet.size;
              folders.forEach(f => {
                if (!asmrFolderIdsSet.has(f.id)) {
                  const isDirectChild = f.parents && f.parents.includes(secretFolderId);
                  const isIndirectChild = f.parents && f.parents.some(p => asmrFolderIdsSet.has(p));
                  if (isDirectChild || isIndirectChild) {
                    asmrFolderIdsSet.add(f.id);
                  }
                }
              });
            }
          }
          
          if (isAsmrMode) {
            return all.filter(f => asmrFolderIdsSet.has(f.id));
          } else {
            return all.filter(f => f.name !== '.cg_secret_asmr' && f.id !== secretFolderId && !asmrFolderIdsSet.has(f.id));
          }
        })()} 
        selectedFolderId={selectedFolderId}
        onFolderSelect={(folderId) => {
          setSelectedFolderId(folderId);
          setSelectedPlaylistId(null);
        }}
        currentTrack={currentTrack} 
        folderCounts={audioFolderCounts}
        playlists={playlists.filter(pl => isAsmrMode ? pl.type === 'asmr' : pl.type !== 'asmr')}
        selectedPlaylistId={selectedPlaylistId}
        onPlaylistSelect={(playlistId) => {
          setSelectedPlaylistId(playlistId);
          setSelectedFolderId(null);
        }}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        isSyncActive={!!accessToken}
        onUploadClick={() => setShowUploadModal(true)}
        onFolderDownload={(folderId, folderName) => downloadFolderAsZip(folderId, folderName)}
        onFolderDelete={(folderId, folderName) => deleteFolder(folderId, folderName)}
        onFolderRename={(folderId, oldName) => renameFolder(folderId, oldName)}
        onFolderMoveClick={(folderId, folderName, parents) => setMovingAsset({ id: folderId, name: folderName, parents: parents, isFolder: true })}
        isAsmrMode={isAsmrMode}
        onRefresh={handleRefreshDrive}
        addToast={addToast}
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
            {/* ASMR Mode トグルボタン */}
            <button 
              className={`asmr-toggle-btn ${isAsmrMode ? 'active' : ''}`}
              onClick={toggleAsmrMode}
              title={isAsmrMode ? "通常モードに切り替え" : "ASMR禅モードに切り替え"}
              style={{
                background: 'transparent',
                border: isAsmrMode ? '1px solid var(--neon-asmr-emerald, #00ffcc)' : '1px solid var(--border-color)',
                color: isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--text-muted)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontFamily: 'Orbitron, sans-serif',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.3s ease',
                boxShadow: isAsmrMode ? '0 0 10px rgba(0, 255, 204, 0.4)' : 'none',
                marginRight: '10px'
              }}
            >
              <Moon size={14} className={isAsmrMode ? 'pulse-icon' : ''} />
              <span>{isAsmrMode ? 'ZEN ON' : 'ZEN OFF'}</span>
            </button>

            {isAsmrMode && (
              <button
                className={`asmr-panel-btn ${showAsmrPanel ? 'active' : ''}`}
                onClick={() => {
                  setShowAsmrPanel(!showAsmrPanel);
                  if (!showAsmrPanel) {
                    setShowAIDJ(false);
                    setShowEQ(false);
                    setShowSettings(false);
                  }
                }}
                title="ASMRコントロールパネル"
                style={{
                  background: 'transparent',
                  border: showAsmrPanel ? '1px solid var(--neon-asmr-purple, #8c00ff)' : '1px solid var(--border-color)',
                  color: showAsmrPanel ? 'var(--neon-asmr-purple, #8c00ff)' : 'var(--text-muted)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontFamily: 'Orbitron, sans-serif',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.3s ease',
                  boxShadow: showAsmrPanel ? '0 0 10px rgba(140, 0, 255, 0.4)' : 'none',
                  marginRight: '15px'
                }}
              >
                <span>[PANEL]</span>
              </button>
            )}

            <Bot className="toggle-icon" size={24} onClick={toggleAIDJ} title="Toggle AI DJ" />
            <BarChart3 className="toggle-icon" size={24} onClick={toggleStats} title="Listening Stats Console" />
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

        <audio 
          ref={audioRef2}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          crossOrigin="anonymous"
        />

        {/* 環境雨音ループ用のaudio要素 */}
        <audio 
          ref={rainAudioRef} 
          src="https://raw.githubusercontent.com/wacko/rainsound/master/rain.mp3" 
          loop 
          preload="auto"
        />

        <SpectrumVisualizer 
          isPlaying={isPlaying} 
          analyser={analyserRef.current} 
          isAsmrMode={isAsmrMode} 
          trackMetadata={trackMetadata} 
          visualizerMode={visualizerMode}
          setVisualizerMode={(mode) => {
            setVisualizerMode(mode);
            localStorage.setItem('cg_vis_mode', mode);
          }}
        />

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
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '500px' }}>
                <button className="play-generated-btn" onClick={handleLogin} style={{ flex: '1 1 200px' }}>
                  <LogIn size={16} style={{ marginRight: '8px' }} /> Googleアカウントと同期する
                </button>
                <button 
                  className="play-generated-btn" 
                  onClick={() => playTrack({ id: 'demo-track-id', name: 'Cyberpunk Slumber.mp3', isDemo: true }, true)}
                  style={{
                    flex: '1 1 200px',
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    border: '1px solid var(--neon-cyan)',
                    color: 'var(--neon-cyan)',
                    boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)'
                  }}
                >
                  <Play size={16} style={{ marginRight: '8px' }} /> デモ音源を再生する [SYS.DEMO]
                </button>
              </div>
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
                            title="次に再生（キューに追加）"
                            onClick={() => addToQueue(track)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--neon-purple)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.6,
                              transition: 'opacity 0.2s, transform 0.2s'
                            }}
                          >
                            <ListPlus size={16} />
                          </button>
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

                          <button 
                            className="track-action-btn download-btn"
                            title="ローカルにダウンロード"
                            onClick={() => downloadSingleTrack(track)}
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
                            <Download size={16} />
                          </button>

                          {!selectedPlaylistId && (
                            <button 
                              className="track-action-btn edit-btn"
                              title="ID3タグを再編集"
                              onClick={() => setEditingTrack(track)}
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
                              <Edit3 size={16} />
                            </button>
                          )}

                          {!selectedPlaylistId && (
                            <button 
                              className="track-action-btn edit-btn"
                              title="別のフォルダへ移動"
                              onClick={() => setMovingAsset({ id: track.id, name: track.name, parents: track.parents, isFolder: false })}
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
                              <Folder size={16} />
                            </button>
                          )}
                          
                          {!selectedPlaylistId && (
                            <button 
                              className="track-action-btn remove-btn"
                              title="Google Driveから永久削除"
                              onClick={() => deleteTrack(track)}
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
                              <Trash2 size={16} />
                            </button>
                          )}
                          
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
            {bypassWebAudio && (
              <div style={{
                margin: '10px',
                padding: '10px',
                border: '1px solid var(--neon-pink)',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 0, 127, 0.1)',
                color: 'var(--neon-pink)',
                fontSize: '0.75rem',
                lineHeight: '1.4',
                fontFamily: 'var(--font-mono)',
                textAlign: 'center',
                boxShadow: '0 0 10px rgba(255, 0, 127, 0.2)'
              }}>
                [SYS.WARNING.ACTIVE]<br/>
                最適化モード有効のため、イコライザーの効果は適用されません。設定から変更できます。
              </div>
            )}
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="play-generated-btn" style={{flex: '1 1 30%'}} onClick={() => applyEqPreset([10, 5, -1, 0, 2])}>Cyber Bass</button>
              <button className="play-generated-btn" style={{flex: '1 1 30%'}} onClick={() => applyEqPreset([-12, -3, 8, 4, -10])}>Retro Radio</button>
              
              {/* ASMR プリセット */}
              {isAsmrMode && (
                <>
                  <button className="play-generated-btn" style={{flex: '1 1 45%', border: '1px solid var(--neon-asmr-emerald, #00ffcc)', color: 'var(--neon-asmr-emerald, #00ffcc)'}} onClick={() => applyEqPreset([-8, -2, 5, 8, 4])}>Whisper</button>
                  <button className="play-generated-btn" style={{flex: '1 1 45%', border: '1px solid var(--neon-asmr-purple, #8c00ff)', color: 'var(--neon-asmr-purple, #8c00ff)'}} onClick={() => applyEqPreset([-12, -4, 2, 10, 12])}>Ear Cleaning</button>
                </>
              )}
              
              <button className="play-generated-btn" style={{flex: '1 1 100%', backgroundColor: 'rgba(255,255,255,0.08)'}} onClick={() => applyEqPreset([0, 0, 0, 0, 0])}>Bypass</button>
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
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px' }}>
                <button
                  onClick={() => setShowDevSettings(!showDevSettings)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: 0,
                    textTransform: 'uppercase',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <span>{showDevSettings ? '[-] HIDE DEVELOPER PROTOCOL' : '[+] SHOW DEVELOPER PROTOCOL'}</span>
                </button>

                {showDevSettings && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'block', color: 'var(--neon-pink)', fontSize: '0.8rem', fontFamily: 'Orbitron' }}>
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
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      独自のGoogle Cloudプロジェクトを接続してセルフホストする場合のみ、クライアントIDを変更してください。
                    </p>
                    <button 
                      className="play-generated-btn" 
                      style={{ width: '100%', padding: '8px', fontSize: '0.75rem' }}
                      onClick={() => {
                        const inputVal = document.getElementById('client-id-input').value;
                        handleSaveSettings(inputVal);
                      }}
                    >
                      IDを保存して反映
                    </button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '5px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--neon-pink)', fontSize: '0.9rem', fontFamily: 'Orbitron' }}>
                  クロスフェード時間 [CROSSFADE: {crossfadeDuration}s]
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  value={crossfadeDuration} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCrossfadeDuration(val);
                    localStorage.setItem('cg_crossfade_duration', val);
                  }}
                  style={{
                    width: '100%',
                    accentColor: 'var(--neon-pink)',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)'
                  }}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                  曲の自動切り替わり時にフェードイン/フェードアウトする秒数を指定します（0秒で無効化）。
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--neon-pink)', fontSize: '0.9rem', fontFamily: 'Orbitron', cursor: 'pointer' }}>
                  <span>バックグラウンド最適化 [SYS.DIRECT.ENGINE]</span>
                  <input 
                    type="checkbox" 
                    checked={bypassWebAudio} 
                    onChange={(e) => handleBypassWebAudioChange(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--neon-cyan)',
                      cursor: 'pointer'
                    }}
                  />
                </label>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  有効にすると、Web Audio APIをバイパスして直接再生します。スマホやタブレットでバックグラウンド再生する際の音のプチプチ（ノイズ）を防ぎます。※ONの場合イコライザーなどの効果は無効になります。
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--neon-pink)', fontSize: '0.9rem', fontFamily: 'Orbitron' }}>
                  システムテーマ [SYS.THEME]
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '5px' }}>
                  {[
                    { id: 'neon', name: 'Cyber Neon', color: '#00f3ff' },
                    { id: 'vaporwave', name: 'Vaporwave', color: '#ff00ff' },
                    { id: 'hacker', name: 'Terminal Hacker', color: '#00ff00' },
                    { id: 'outrun', name: 'Outrun Sunset', color: '#ff5e00' }
                  ].map(t => {
                    const isSelected = currentTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setCurrentTheme(t.id);
                          addToast(`🤖 THEME CHANGED TO: ${t.name.toUpperCase()}`, 'sys');
                        }}
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.5)',
                          border: isSelected ? `2px solid ${t.color}` : '1px solid var(--border-color)',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          borderRadius: '6px',
                          padding: '8px 4px',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? `0 0 10px ${t.color}44` : 'none'
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color, display: 'inline-block', boxShadow: `0 0 5px ${t.color}` }} />
                        {t.name}
                      </button>
                    );
                  })}
                </div>
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

        {showStats && (
          <StatsConsole userProfile={userProfile} onClose={() => setShowStats(false)} isAsmrMode={isAsmrMode} />
        )}

        {isAsmrMode && showAsmrPanel && (
          <div className="side-panel asmr-panel">
            <div className="panel-header" style={{ borderBottom: '1px solid var(--neon-asmr-emerald, #00ffcc)' }}>
              <h3 style={{ color: 'var(--neon-asmr-emerald, #00ffcc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Moon size={18} /> [PSYCHE SLUMBER CONSOLE]
              </h3>
              <button className="close-btn" onClick={() => setShowAsmrPanel(false)}><X size={20} /></button>
            </div>
            
            <div className="asmr-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '15px 0' }}>
              {/* スリープタイマーセクション */}
              <div className="asmr-section" style={{ background: 'rgba(10, 5, 20, 0.4)', padding: '15px', borderRadius: '6px', border: '1px solid rgba(0, 255, 204, 0.15)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--neon-asmr-emerald, #00ffcc)', fontFamily: 'Orbitron' }}>
                  精神沈静タイマー [SLEEP TIMER]
                </h4>
                
                {sleepTimeRemaining > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                    <div className="timer-countdown" style={{ fontSize: '1.6rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#fff', textShadow: '0 0 8px var(--neon-asmr-emerald)' }}>
                      {formatTime(sleepTimeRemaining)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>タイマー作動中（終了5分前から自動音量フェードアウト）</span>
                    <button 
                      className="play-generated-btn" 
                      style={{ marginTop: '5px', backgroundColor: 'rgba(255, 0, 85, 0.15)', border: '1px solid var(--neon-pink)', color: 'var(--neon-pink)' }}
                      onClick={() => startSleepTimer(0)}
                    >
                      タイマーをキャンセル
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '10px' }}>
                    {[15, 30, 45, 60].map(mins => (
                      <button 
                        key={mins}
                        className="play-generated-btn" 
                        onClick={() => startSleepTimer(mins)}
                        style={{ fontSize: '0.75rem', padding: '8px 4px' }}
                      >
                        {mins}分
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 雨音ボリュームセクション */}
              <div className="asmr-section" style={{ background: 'rgba(10, 5, 20, 0.4)', padding: '15px', borderRadius: '6px', border: '1px solid rgba(140, 0, 255, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--neon-asmr-purple, #8c00ff)', fontFamily: 'Orbitron' }}>
                    都市雨音レイヤー [CITY RAIN]
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: rainVolume > 0 ? 'var(--neon-asmr-purple, #8c00ff)' : 'var(--text-muted)' }}>
                    {rainVolume}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={rainVolume}
                  onChange={(e) => handleRainVolumeChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--neon-asmr-purple, #8c00ff)',
                    background: 'rgba(255,255,255,0.1)',
                    cursor: 'pointer'
                  }}
                />
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.3' }}>
                  優しい雨の環境音をバックグラウンドに合成します。スライダーを上げると自動でループ再生されます。
                </p>
              </div>

              {/* DLsite ASMR Portalゲートウェイ */}
              <div className="asmr-section" style={{ padding: '5px 0' }}>
                <a 
                  href="https://www.dlsite.com/home/works/type/=/work_type_category/audio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dlsite-neon-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.8rem',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  🎧 [DLsite.ASMR.PORTAL]
                </a>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', lineHeight: '1.3' }}>
                  外部のASMRアーカイブポータルへ精神リンクを確立します。
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Player 
        isPlaying={isPlaying} 
        setIsPlaying={handlePlayPauseToggle} 
        toggleEq={toggleEQ} 
        currentTrack={currentTrack}
        onShareClick={() => setShowShareModal(true)}
        currentBlob={currentBlob}
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
            addToast('音楽を同期して、再生を開始してからクリックしてください', 'info');
          }
        }}
        volume={volume}
        onVolumeChange={(val) => {
          setVolume(val);
          if (masterGainNodeRef.current && audioContextRef.current) {
            masterGainNodeRef.current.gain.setValueAtTime(val, audioContextRef.current.currentTime);
          } else {
            if (audioRef.current) audioRef.current.volume = val;
            if (audioRef2.current) audioRef2.current.volume = val;
          }
        }}
        isAsmrMode={isAsmrMode}
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
          bypassWebAudio={bypassWebAudio}
          setIsPlaying={handlePlayPauseToggle}
          currentTrack={currentTrack}
          onShareClick={() => setShowShareModal(true)}
          currentBlob={currentBlob}
          trackMetadata={trackMetadata}
          currentLyrics={currentLyrics}
          visualizerMode={visualizerMode}
          setVisualizerMode={(mode) => {
            setVisualizerMode(mode);
            localStorage.setItem('cg_vis_mode', mode);
          }}
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
          isAsmrMode={isAsmrMode}
          volume={volume}
          onVolumeChange={(val) => {
            setVolume(val);
            if (masterGainNodeRef.current && audioContextRef.current) {
              masterGainNodeRef.current.gain.setValueAtTime(val, audioContextRef.current.currentTime);
            } else {
              if (audioRef.current) audioRef.current.volume = val;
              if (audioRef2.current) audioRef2.current.volume = val;
            }
          }}
          isReverbOn={isReverbOn}
          onToggleReverb={(isOn) => { setIsReverbOn(isOn); updateReverb(isOn, reverbMix); }}
          reverbMix={reverbMix}
          onReverbMixChange={(val) => { setReverbMix(val); updateReverb(isReverbOn, val); }}
          isDelayOn={isDelayOn}
          onToggleDelay={(isOn) => { setIsDelayOn(isOn); updateDelay(isOn, delayTime, delayFeedback); }}
          delayTime={delayTime}
          onDelayTimeChange={(val) => { setDelayTime(val); updateDelay(isDelayOn, val, delayFeedback); }}
          delayFeedback={delayFeedback}
          onDelayFeedbackChange={(val) => { setDelayFeedback(val); updateDelay(isDelayOn, delayTime, val); }}
          isFilterOn={isFilterOn}
          onToggleFilter={(isOn) => { setIsFilterOn(isOn); updateFilters(isOn, lowpassFreq, highpassFreq); }}
          lowpassFreq={lowpassFreq}
          onLowpassFreqChange={(val) => { setLowpassFreq(val); updateFilters(isFilterOn, val, highpassFreq); }}
          highpassFreq={highpassFreq}
          onHighpassFreqChange={(val) => { setHighpassFreq(val); updateFilters(isFilterOn, lowpassFreq, val); }}
          playbackSpeed={playbackSpeed}
          onPlaybackSpeedChange={(val) => { updatePlaybackSpeed(val); }}
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

      {/* アップロードモーダル */}
      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        accessToken={accessToken}
        selectedFolderId={isAsmrMode ? (selectedFolderId || secretFolderId) : selectedFolderId}
        onUploadSuccess={() => {
          fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
          scanAudioFolders(accessToken);
        }}
        addToast={addToast}
      />

      {/* タグ再編集モーダル */}
      <TagEditModal 
        isOpen={!!editingTrack}
        onClose={() => setEditingTrack(null)}
        accessToken={accessToken}
        track={editingTrack}
        onEditSuccess={() => {
          fetchDriveFiles(accessToken, selectedFolderId, searchQuery);
        }}
      />

      {/* フォルダ・ファイル移動モーダル */}
      <MoveModal 
        isOpen={!!movingAsset}
        onClose={() => setMovingAsset(null)}
        asset={movingAsset}
        folders={(() => {
          if (isAsmrMode) {
            return folders.filter(f => f.parents && f.parents.includes(secretFolderId));
          } else {
            return folders.filter(f => {
              const isSecretRoot = f.id === secretFolderId || f.name === '.cg_secret_asmr';
              const isSecretSub = f.parents && f.parents.includes(secretFolderId);
              return isSecretRoot || (!isSecretSub && f.name !== '.cg_secret_asmr');
            });
          }
        })()}
        secretFolderId={secretFolderId}
        isAsmrMode={isAsmrMode}
        onMove={moveAsset}
        addToast={addToast}
      />

      {/* フォルダZIPダウンロード進捗モーダル */}
      {isDownloadingFolder && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal container-glow-pink" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="panel-header">
              <h3>[ZIP_COMPILING_SEQUENCE]</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
              <div className="console-panel" style={{
                background: 'rgba(0,0,0,0.85)',
                border: '1px solid var(--neon-pink)',
                borderRadius: '6px',
                padding: '12px',
                fontFamily: 'var(--font-mono)'
              }}>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {dlLogs.map((log, idx) => {
                    let color = 'var(--text-muted)';
                    if (log.includes('[OK]')) color = 'var(--neon-green)';
                    if (log.includes('[ERROR]')) color = 'var(--neon-pink)';
                    if (log.includes('[WARN]')) color = '#ffea00';
                    return <div key={idx} style={{ color }}>{log}</div>;
                  })}
                </div>
              </div>
              <div className="progress-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fff' }}>
                  <span>PROCESSING...</span>
                  <span>{dlProgress}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{
                    width: `${dlProgress}%`,
                    height: '100%',
                    background: 'var(--neon-pink)',
                    boxShadow: '0 0 10px var(--neon-pink)',
                    transition: 'width 0.2s ease-out'
                  }}></div>
                </div>
              </div>
            </div>
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
      {/* サイバーパンク・トースト通知 */}
      <CyberToast toasts={toasts} removeToast={removeToast} />

      {/* 共有モーダルHUD */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        currentTrack={currentTrack}
        selectedPlaylistId={selectedPlaylistId}
        playlists={playlists}
        currentTheme={currentTheme}
        addToast={addToast}
      />
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
