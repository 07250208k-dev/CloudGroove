import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, RefreshCw, CheckCircle } from 'lucide-react';

const TagEditModal = ({
  isOpen,
  onClose,
  accessToken,
  track,
  onEditSuccess
}) => {
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // 元ファイルのバイナリ保持用
  const [fileBlob, setFileBlob] = useState(null);

  // 編集フォーム用ステート
  const [metadata, setMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    coverUrl: '',
    coverBlob: null
  });

  const logEndRef = useRef(null);

  // ログ自動スクロール
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // モーダルが開かれたら、音声データをフェッチしてメタデータをスキャンする
  useEffect(() => {
    if (isOpen && track && accessToken) {
      fetchAndParseAudio();
    } else {
      // リセット
      setFileBlob(null);
      setMetadata({
        title: '',
        artist: '',
        album: '',
        coverUrl: '',
        coverBlob: null
      });
      setLogs([]);
      setProgress(0);
      setIsProcessing(false);
      setIsDownloading(false);
    }
  }, [isOpen, track]);

  if (!isOpen || !track) return null;

  const addLog = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [${type.toUpperCase()}] ${text}`]);
  };

  // Google DriveからファイルをフェッチしID3タグを解析
  const fetchAndParseAudio = async () => {
    setIsDownloading(true);
    setLogs([]);
    addLog(`INITIATING METADATA DOWNLOAD FOR FILE: "${track.name}"`, 'sys');
    addLog(`FETCHING STREAM FROM REMOTE STORAGE...`, 'sys');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!res.ok) throw new Error('Failed to retrieve file content from Drive');
      
      const blob = await res.blob();
      setFileBlob(blob);
      addLog(`STREAM SECURED. SIZE: ${(blob.size / (1024 * 1024)).toFixed(2)} MB [OK]`, 'ok');
      addLog(`PARSING METADATA HEADERS...`, 'sys');

      const cleanTitle = track.name.replace(/\.[^/.]+$/, "");
      setMetadata(prev => ({ ...prev, title: cleanTitle }));

      if (window.jsmediatags) {
        window.jsmediatags.read(blob, {
          onSuccess: (tag) => {
            const tags = tag.tags;
            let coverUrl = '';
            let coverBlob = null;

            if (tags.picture) {
              const { data, format } = tags.picture;
              const len = data.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = data[i];
              }
              coverBlob = new Blob([bytes], { type: format });
              coverUrl = URL.createObjectURL(coverBlob);
            }

            setMetadata({
              title: tags.title || cleanTitle,
              artist: tags.artist || 'Google Drive 音源',
              album: tags.album || 'マイドライブ',
              coverUrl: coverUrl,
              coverBlob: coverBlob
            });
            addLog(`ID3 HEADERS EXTRACTED [OK]`, 'ok');
            setIsDownloading(false);
          },
          onError: (error) => {
            addLog(`ID3 HEADER EXTRACTION FAILED: ${error.type}. FALLING BACK.`, 'warn');
            setMetadata({
              title: cleanTitle,
              artist: 'Google Drive 音源',
              album: 'マイドライブ',
              coverUrl: '',
              coverBlob: null
            });
            setIsDownloading(false);
          }
        });
      } else {
        addLog(`jsmediatags NOT FOUND. METADATA SCANNED FROM FILENAME.`, 'warn');
        setIsDownloading(false);
      }
    } catch (err) {
      addLog(`CRITICAL ERROR DURING SECURING STREAM: ${err.message}`, 'error');
      setIsDownloading(false);
    }
  };

  // カバー画像差し替え
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const coverUrl = URL.createObjectURL(file);
    setMetadata(prev => ({
      ...prev,
      coverUrl: coverUrl,
      coverBlob: file
    }));
    addLog(`NEW COVER ART CAPTURED: ${file.name}`, 'sys');
  };

  // Google Drive上の既存ファイルを上書き更新
  const patchGoogleDriveFile = async (fileBlob, filename, mimeType) => {
    const metadataObj = {
      name: filename,
      mimeType: mimeType || 'audio/mpeg',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const arrayBuffer = await fileBlob.arrayBuffer();
    const mediaPart = new Uint8Array(arrayBuffer);

    const metadataPart = new Blob([
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadataObj) +
      delimiter +
      'Content-Type: ' + metadataObj.mimeType + '\r\n\r\n'
    ]);

    const closePart = new Blob([close_delim]);
    const multipartBlob = new Blob([metadataPart, mediaPart, closePart], { type: `multipart/related; boundary=${boundary}` });

    // 既存ファイルをPATCHでメタデータとコンテンツ両方上書き
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${track.id}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBlob
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Google Drive API patch failed');
    }

    return await response.json();
  };

  // タグ書き換えおよび上書きアップロードの実行
  const handleUpdate = async () => {
    if (!fileBlob) return;

    setIsProcessing(true);
    setProgress(10);
    addLog(`INITIATING METADATA RE-COMPILATION PROTOCOL...`, 'sys');

    try {
      let finalBlob = fileBlob;

      if (window.ID3Writer) {
        addLog(`WRITING ID3v2 TAGS TO BINARY BUFFER...`, 'sys');
        setProgress(30);

        const arrayBuffer = await fileBlob.arrayBuffer();
        const writer = new window.ID3Writer(arrayBuffer);

        writer.setFrame('TIT2', metadata.title)
              .setFrame('TPE1', [metadata.artist])
              .setFrame('TALB', metadata.album);

        if (metadata.coverBlob) {
          addLog(`COMPRESSING AND EMBEDDING COVER ARTWORK...`, 'sys');
          const coverArrayBuffer = await metadata.coverBlob.arrayBuffer();
          writer.setFrame('APIC', {
            type: 3,
            data: coverArrayBuffer,
            description: 'Cover',
            useAltMime: false
          });
        }

        writer.addTag();
        finalBlob = writer.getBlob();
        addLog(`BINARY ID3 BUFFER COMPILED [OK]`, 'ok');
      } else {
        addLog(`ID3Writer NOT FOUND. CONTENT PATCH WILL SKIPPED LOCALLY.`, 'warn');
      }

      setProgress(60);
      addLog(`PATCHING CLOUD DATA ON GOOGLE DRIVE...`, 'sys');

      const originalExt = track.name.split('.').pop();
      const filename = metadata.title + '.' + originalExt;
      
      await patchGoogleDriveFile(finalBlob, filename, track.mimeType);

      setProgress(100);
      addLog(`METADATA SYNCHRONIZED SUCCESSFULLY. [OK]`, 'ok');

      setTimeout(() => {
        setIsProcessing(false);
        onEditSuccess();
        onClose();
      }, 1500);

    } catch (err) {
      addLog(`CRITICAL ERROR DURING PROTOCOL WRITING: ${err.message}`, 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="cyber-modal-overlay">
      <div className="cyber-modal container-glow-cyan" style={{ maxWidth: '750px' }}>
        <div className="panel-header">
          <h3>
            <Edit3 size={18} style={{ marginRight: '8px' }} />
            [CLOUD_GROOVE_METADATA_PATCHER]
          </h3>
          <button className="close-btn" onClick={onClose} disabled={isProcessing || isDownloading}>
            <X size={20} />
          </button>
        </div>

        <div className="upload-body" style={{ display: 'grid', gridTemplateColumns: (isProcessing || isDownloading) ? '1fr' : '1.2fr 1fr', gap: '20px', minHeight: '300px', marginTop: '10px' }}>
          
          {/* ローディング・処理進行中のコンソール画面のみを表示 */}
          {(isProcessing || isDownloading) && (
            <div className="console-panel" style={{
              background: 'rgba(0,0,0,0.85)',
              border: '1px solid var(--neon-cyan)',
              borderRadius: '6px',
              padding: '20px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              boxShadow: 'inset 0 0 15px rgba(0,243,255,0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>[PATCHER_SEQUENCE_STATUS]</span>
                <span className="spin-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={14} style={{ animation: 'spin 1s infinite linear' }} />
                </span>
              </div>

              <div className="log-area" style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', minHeight: '200px' }}>
                {logs.map((log, idx) => {
                  let color = 'var(--text-muted)';
                  if (log.includes('[OK]')) color = 'var(--neon-green)';
                  if (log.includes('[ERROR]')) color = 'var(--neon-pink)';
                  if (log.includes('[WARN]')) color = '#ffea00';
                  if (log.includes('[SYS]')) color = 'var(--neon-cyan)';
                  return <div key={idx} style={{ fontSize: '0.75rem', color, wordBreak: 'break-all' }}>{log}</div>;
                })}
                <div ref={logEndRef}></div>
              </div>

              {isProcessing && (
                <div className="progress-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fff' }}>
                    <span>UPDATING PROTOCOLS...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'var(--neon-cyan)',
                      boxShadow: '0 0 10px var(--neon-cyan)',
                      transition: 'width 0.2s ease-out'
                    }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 編集フォームの表示 */}
          {!isProcessing && !isDownloading && (
            <>
              <div className="metadata-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '10px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>[EDITABLE_FIELDS]</p>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[TRACK_TITLE]</label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    className="settings-input"
                    style={{ width: '100%', padding: '8px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[ARTIST_NAME]</label>
                  <input
                    type="text"
                    value={metadata.artist}
                    onChange={(e) => setMetadata(prev => ({ ...prev, artist: e.target.value }))}
                    className="settings-input"
                    style={{ width: '100%', padding: '8px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[ALBUM_NAME]</label>
                  <input
                    type="text"
                    value={metadata.album}
                    onChange={(e) => setMetadata(prev => ({ ...prev, album: e.target.value }))}
                    className="settings-input"
                    style={{ width: '100%', padding: '8px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[COVER_IMAGE_INJECTION]</label>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        border: '1px solid var(--border-color)',
                        background: metadata.coverUrl ? `url('${metadata.coverUrl}')` : '#111',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                    ></div>
                    <div style={{ position: 'relative', flexGrow: 1 }}>
                      <button className="play-generated-btn" style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', marginTop: 0 }}>
                        新しい画像を選択
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: 100 + '%', height: 100 + '%' }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleUpdate}
                  className="play-generated-btn"
                  style={{ width: '100%', marginTop: 'auto', padding: '12px', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                >
                  SAVE METADATA CHANGES
                </button>
              </div>

              {/* 右ペイン: プレビュー ＆ 現在のターゲット情報 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', alignSelf: 'flex-start' }}>[LIVE_PLAYER_PREVIEW]</p>
                <div style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '8px',
                  backgroundImage: metadata.coverUrl ? `url('${metadata.coverUrl}')` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '2px solid var(--neon-cyan)',
                  boxShadow: '0 0 20px rgba(0, 243, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {!metadata.coverUrl && <span style={{ fontSize: '3rem' }}>🎧</span>}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    width: 100 + '%',
                    background: 'rgba(0,0,0,0.85)',
                    padding: '8px',
                    textAlign: 'center',
                    borderTop: '1px solid rgba(0,243,255,0.2)'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {metadata.title || 'No Title'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--neon-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {metadata.artist || 'Unknown Artist'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4', marginTop: '10px' }}>
                  [TARGET_FILE]: {track.name}<br />
                  [FILE_SIZE]: {(track.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default TagEditModal;
