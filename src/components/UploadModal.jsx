import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileAudio, Folder, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const UploadModal = ({
  isOpen,
  onClose,
  accessToken,
  selectedFolderId,
  onUploadSuccess,
  addToast
}) => {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'folder'
  const [logs, setLogs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- シングルファイル用ステート ---
  const [singleFile, setSingleFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    coverUrl: '',
    coverBlob: null
  });
  const originalMetadataRef = useRef(null);

  // --- フォルダ用ステート ---
  const [folderName, setFolderName] = useState('');
  const [folderFiles, setFolderFiles] = useState([]);
  const [folderMetadata, setFolderMetadata] = useState({
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

  if (!isOpen) return null;

  const addLog = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [${type.toUpperCase()}] ${text}`]);
  };

  // 既存のID3タグを読み込む
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSingleFile(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
    const defaultMeta = {
      title: cleanTitle,
      artist: 'Google Drive 音源',
      album: 'マイドライブ',
      coverUrl: '',
      coverBlob: null
    };
    setMetadata(defaultMeta);
    originalMetadataRef.current = defaultMeta;

    addLog(`FILE REGISTERED: ${file.name}`, 'sys');
    addLog('SCANNING ID3 METADATA...', 'sys');

    if (window.jsmediatags) {
      window.jsmediatags.read(file, {
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

          const parsedMeta = {
            title: tags.title || cleanTitle,
            artist: tags.artist || 'Google Drive 音源',
            album: tags.album || 'マイドライブ',
            coverUrl: coverUrl,
            coverBlob: coverBlob
          };
          setMetadata(parsedMeta);
          originalMetadataRef.current = parsedMeta;
          addLog('ID3 METADATA PARSED SUCCESSFULLY', 'ok');
        },
        onError: (error) => {
          addLog(`ID3 METADATA PARSING FAILED: ${error.type}. FALLING BACK TO FILENAME.`, 'warn');
        }
      });
    } else {
      addLog('jsmediatags NOT FOUND. FALLING BACK TO FILENAME.', 'warn');
    }
  };

  // カバー画像差し替え
  const handleCoverChange = (e, target = 'file') => {
    const file = e.target.files[0];
    if (!file) return;
    const coverUrl = URL.createObjectURL(file);
    if (target === 'folder') {
      setFolderMetadata(prev => ({
        ...prev,
        coverUrl: coverUrl,
        coverBlob: file
      }));
      addLog(`NEW DIRECTORY COVER IMAGE LOADED: ${file.name}`, 'sys');
    } else {
      setMetadata(prev => ({
        ...prev,
        coverUrl: coverUrl,
        coverBlob: file
      }));
      addLog(`NEW COVER IMAGE LOADED: ${file.name}`, 'sys');
    }
  };

  // フォルダ選択時
  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 音声ファイルのみをフィルター
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'];
    const audioFiles = files.filter(file => {
      const nameLower = file.name.toLowerCase();
      return audioExtensions.some(ext => nameLower.endsWith(ext)) || file.type.startsWith('audio/');
    });

    if (audioFiles.length === 0) {
      addLog('NO AUDIO FILES FOUND IN THE SELECTED DIRECTORY.', 'error');
      if (addToast) addToast('選択したフォルダ内に対応する音声ファイルが見つかりませんでした。', 'warn');
      return;
    }

    // 最初のファイルの相対パスからフォルダ名を取得
    const firstRelativePath = audioFiles[0].webkitRelativePath;
    const detectedFolderName = firstRelativePath.split('/')[0] || '新規フォルダ';

    setFolderName(detectedFolderName);
    setFolderFiles(audioFiles);
    addLog(`DIRECTORY DETECTED: "${detectedFolderName}"`, 'sys');
    addLog(`DETECTED ${audioFiles.length} AUDIO FILES TO SYNC`, 'sys');
  };

  // Google Drive APIへのマルチパートアップロード用共通関数
  const uploadToGoogleDrive = async (fileBlob, filename, mimeType, parentId) => {
    const metadataObj = {
      name: filename,
      mimeType: mimeType || 'audio/mpeg',
    };
    if (parentId) {
      metadataObj.parents = [parentId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    // FileReaderでArrayBufferとしてバイナリを取得
    const arrayBuffer = await fileBlob.arrayBuffer();
    const mediaPart = new Uint8Array(arrayBuffer);

    // マルチパートボディをBlobで構築
    const metadataPart = new Blob([
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadataObj) +
      delimiter +
      'Content-Type: ' + metadataObj.mimeType + '\r\n\r\n'
    ]);

    const closePart = new Blob([close_delim]);
    const multipartBlob = new Blob([metadataPart, mediaPart, closePart], { type: `multipart/related; boundary=${boundary}` });

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBlob
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Google Drive API upload failed');
    }

    return await response.json();
  };

  // シングルファイルアップロード実行
  const handleSingleUpload = async () => {
    if (!singleFile) {
      if (addToast) addToast('音声ファイルを選択してください。', 'warn');
      return;
    }

    setIsUploading(true);
    setProgress(10);
    setLogs([]);
    addLog('STARTING SINGLE FILE UPLOAD SEQUENCE...', 'sys');

    try {
      let finalBlob = singleFile;

      // メタデータが変更されたかチェック
      const isModified = !originalMetadataRef.current ||
        metadata.title !== originalMetadataRef.current.title ||
        metadata.artist !== originalMetadataRef.current.artist ||
        metadata.album !== originalMetadataRef.current.album ||
        metadata.coverBlob !== originalMetadataRef.current.coverBlob;

      // ID3タグ書き込み
      if (isModified && window.ID3Writer) {
        addLog('COMPILING METADATA INTO AUDIO BINARY...', 'sys');
        setProgress(30);

        const arrayBuffer = await singleFile.arrayBuffer();
        const writer = new window.ID3Writer(arrayBuffer);

        writer.setFrame('TIT2', metadata.title)
              .setFrame('TPE1', [metadata.artist])
              .setFrame('TALB', metadata.album);

        if (metadata.coverBlob) {
          addLog('INJECTING COVER ART WORK...', 'sys');
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
        addLog('ID3 COMPILATION COMPLETE [OK]', 'ok');
      } else {
        if (!isModified) {
          addLog('NO METADATA CHANGES DETECTED. UPLOADING ORIGINAL FILE AS-IS TO PRESERVE ALL ORIGINAL TAGS.', 'ok');
        } else {
          addLog('browser-id3-writer NOT DETECTED. SKIPPING LOCAL METADATA WRITING.', 'warn');
        }
      }

      setProgress(60);
      addLog(`UPLOADING TO GOOGLE DRIVE: "${metadata.title}"...`, 'sys');

      const filename = metadata.title + '.' + singleFile.name.split('.').pop();
      await uploadToGoogleDrive(finalBlob, filename, singleFile.type, selectedFolderId);

      setProgress(100);
      addLog(`UPLOAD COMPLETE: "${filename}" SYNCHRONIZED [OK]`, 'ok');
      addLog(`SEQUENCE COMPLETED SUCCESSFULLY.`, 'sys');

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess();
        onClose();
      }, 1500);

    } catch (error) {
      addLog(`CRITICAL ERROR DURING UPLOAD: ${error.message}`, 'error');
      setIsUploading(false);
    }
  };

  // 新規フォルダをGoogle Drive上に作成
  const createDriveFolder = async (name, parentId) => {
    const folderMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      folderMetadata.parents = [parentId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folderMetadata)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Folder creation failed');
    }

    const data = await res.json();
    return data.id;
  };

  // 個々のファイルのタグ情報を読み取る非同期ヘルパー
  const readTags = (file) => {
    return new Promise((resolve) => {
      if (!window.jsmediatags) {
        resolve(null);
        return;
      }
      window.jsmediatags.read(file, {
        onSuccess: (tag) => {
          resolve(tag.tags);
        },
        onError: () => {
          resolve(null);
        }
      });
    });
  };

  // フォルダアップロード実行
  const handleFolderUpload = async () => {
    if (folderFiles.length === 0) {
      if (addToast) addToast('フォルダを選択し、音声ファイルが含まれていることを確認してください。', 'warn');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setLogs([]);
    addLog(`INITIATING DIRECTORY UPLOAD SEQUENCE...`, 'sys');
    addLog(`TOTAL AUDIO FILES DETECTED: ${folderFiles.length}`, 'sys');

    try {
      // 1. Google Drive上に新規フォルダを作成
      addLog(`CREATING DIRECTORY ON REMOTE CLOUD: "${folderName}"...`, 'sys');
      const newFolderId = await createDriveFolder(folderName, selectedFolderId);
      addLog(`REMOTE DIRECTORY CREATED: ID=[${newFolderId}] [OK]`, 'ok');
      
      let successCount = 0;

      // 一括メタデータが指定されているかチェック
      const hasBatchMetadata = !!(folderMetadata.artist || folderMetadata.album || folderMetadata.coverBlob);

      // 2. フォルダ内の全音声ファイルをループで順次アップロード
      for (let i = 0; i < folderFiles.length; i++) {
        const file = folderFiles[i];
        addLog(`PROCESSING FILE [${i + 1}/${folderFiles.length}]: "${file.name}"...`, 'sys');

        let finalBlob = file;

        // ID3タグの書き込み（一括設定されたメタデータがある場合のみ実行）
        if (window.ID3Writer && hasBatchMetadata) {
          try {
            addLog(`READING ORIGINAL TAGS FOR "${file.name}"...`, 'sys');
            const originalTags = await readTags(file);
            
            const arrayBuffer = await file.arrayBuffer();
            const writer = new window.ID3Writer(arrayBuffer);

            // タイトルは元ファイルのタグを優先、なければファイル名から拡張子を除いたもの
            const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
            const title = (originalTags && originalTags.title) ? originalTags.title : cleanTitle;
            writer.setFrame('TIT2', title);

            // アーティスト: 一括設定があれば優先、なければ元ファイルのタグ、それもなければデフォルト値
            const artist = folderMetadata.artist || (originalTags && originalTags.artist) || 'Google Drive 音源';
            writer.setFrame('TPE1', [artist]);

            // アルバム: 一括設定があれば優先、なければ元ファイルのタグ、それもなければデフォルト値
            const album = folderMetadata.album || (originalTags && originalTags.album) || 'マイドライブ';
            writer.setFrame('TALB', album);

            // カバー画像: 一括設定があれば優先、なければ元ファイルのカバー画像
            let coverArrayBuffer = null;
            if (folderMetadata.coverBlob) {
              coverArrayBuffer = await folderMetadata.coverBlob.arrayBuffer();
            } else if (originalTags && originalTags.picture) {
              const { data } = originalTags.picture;
              const len = data.length;
              const bytes = new Uint8Array(len);
              for (let j = 0; j < len; j++) {
                bytes[j] = data[j];
              }
              coverArrayBuffer = bytes.buffer;
            }

            if (coverArrayBuffer) {
              writer.setFrame('APIC', {
                type: 3,
                data: coverArrayBuffer,
                description: 'Cover',
                useAltMime: false
              });
            }

            writer.addTag();
            finalBlob = writer.getBlob();
            addLog(`ID3 METADATA INJECTED SUCCESSFULLY [OK]`, 'sys');
          } catch (err) {
            addLog(`ID3 TAG WRITING ERROR ON "${file.name}": ${err.message}. UPLOADING ORIGINAL.`, 'warn');
            finalBlob = file;
          }
        } else {
          if (!hasBatchMetadata) {
            addLog(`NO BATCH METADATA SPECIFIED. UPLOADING ORIGINAL FILE AS-IS TO PRESERVE ALL ORIGINAL TAGS.`, 'sys');
          } else {
            addLog(`browser-id3-writer NOT DETECTED. SKIPPING BATCH METADATA WRITING.`, 'warn');
          }
        }

        try {
          await uploadToGoogleDrive(finalBlob, file.name, file.type, newFolderId);
          successCount++;
          addLog(`FILE SYNCHRONIZED: "${file.name}" [OK]`, 'ok');
        } catch (e) {
          addLog(`FAILED TO SYNC: "${file.name}" - ${e.message}`, 'error');
        }

        // プログレス計算
        const currentProgress = Math.round(((i + 1) / folderFiles.length) * 100);
        setProgress(currentProgress);
      }

      addLog(`========================================`, 'sys');
      addLog(`UPLOAD SEQUENCE FINISHED: ${successCount}/${folderFiles.length} FILES SYNCHRONIZED`, 'ok');
      setProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      addLog(`CRITICAL ERROR DURING DIRECTORY CREATION: ${error.message}`, 'error');
      setIsUploading(false);
    }
  };

  return (
    <div className="cyber-modal-overlay">
      <div className="cyber-modal container-glow-cyan" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>
            <Upload size={18} style={{ marginRight: '8px' }} />
            [CLOUD_GROOVE_SYNC_PROTOCOL]
          </h3>
          <button className="close-btn" onClick={onClose} disabled={isUploading}>
            <X size={20} />
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="upload-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(0,243,255,0.1)', paddingBottom: '8px' }}>
          <button
            onClick={() => !isUploading && setActiveTab('file')}
            className={`play-generated-btn ${activeTab === 'file' ? 'active-tab' : ''}`}
            style={{
              flex: 1,
              marginTop: 0,
              backgroundColor: activeTab === 'file' ? 'rgba(0, 243, 255, 0.1)' : 'transparent',
              borderColor: activeTab === 'file' ? 'var(--neon-cyan)' : 'var(--border-color)',
              color: activeTab === 'file' ? 'var(--neon-cyan)' : 'var(--text-muted)'
            }}
          >
            <FileAudio size={14} style={{ marginRight: '6px' }} /> AUDIO_FILE
          </button>
          <button
            onClick={() => !isUploading && setActiveTab('folder')}
            className={`play-generated-btn ${activeTab === 'folder' ? 'active-tab' : ''}`}
            style={{
              flex: 1,
              marginTop: 0,
              backgroundColor: activeTab === 'folder' ? 'rgba(255, 0, 127, 0.1)' : 'transparent',
              borderColor: activeTab === 'folder' ? 'var(--neon-pink)' : 'var(--border-color)',
              color: activeTab === 'folder' ? 'var(--neon-pink)' : 'var(--text-muted)'
            }}
          >
            <Folder size={14} style={{ marginRight: '6px' }} /> AUDIO_DIRECTORY
          </button>
        </div>

        <div className="upload-body" style={{ display: 'grid', gridTemplateColumns: isUploading ? '1fr' : '1fr 1fr', gap: '20px', minHeight: '300px' }}>
          
          {/* 非アップロード中の入力パネル */}
          {!isUploading && (
            <div className="input-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '20px' }}>
              {activeTab === 'file' ? (
                // --- ファイルアップロードフォーム ---
                <>
                  <div className="file-dropzone" style={{ border: '2px dashed var(--neon-cyan)', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'rgba(0,0,0,0.3)' }}>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                      style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: 100 + '%', height: 100 + '%', cursor: 'pointer' }}
                    />
                    <Upload size={32} className="neon-text-cyan" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: '0.8rem', color: '#fff' }}>音声ファイルをドラッグ＆ドロップ、または選択</p>
                    {singleFile && <p style={{ fontSize: '0.75rem', color: 'var(--neon-green)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{singleFile.name}</p>}
                  </div>

                  {singleFile && (
                    <div className="metadata-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '200px', paddingRight: '4px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[TRACK_TITLE]</label>
                        <input
                          type="text"
                          value={metadata.title}
                          onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                          className="settings-input"
                          style={{ width: '100%', padding: '6px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[ARTIST_NAME]</label>
                        <input
                          type="text"
                          value={metadata.artist}
                          onChange={(e) => setMetadata(prev => ({ ...prev, artist: e.target.value }))}
                          className="settings-input"
                          style={{ width: '100%', padding: '6px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[ALBUM_NAME]</label>
                        <input
                          type="text"
                          value={metadata.album}
                          onChange={(e) => setMetadata(prev => ({ ...prev, album: e.target.value }))}
                          className="settings-input"
                          style={{ width: '100%', padding: '6px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>[COVER_IMAGE_INJECTION]</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '50px',
                              height: '50px',
                              border: '1px solid var(--border-color)',
                              background: metadata.coverUrl ? `url('${metadata.coverUrl}')` : '#111',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}
                          ></div>
                          <div style={{ position: 'relative', flexGrow: 1 }}>
                            <button className="play-generated-btn" style={{ width: '100%', padding: '4px 10px', fontSize: '0.75rem', marginTop: 0 }}>
                              画像を選択
                            </button>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleCoverChange(e, 'file')}
                              style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: 100 + '%', height: 100 + '%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSingleUpload}
                    disabled={!singleFile}
                    className="play-generated-btn"
                    style={{ width: '100%', marginTop: 'auto', padding: '10px', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                  >
                    SYNC SINGLE TRACK
                  </button>
                </>
              ) : (
                // --- フォルダアップロードフォーム ---
                <>
                // --- フォルダアップロードフォーム ---
                <>
                  <div className="file-dropzone" style={{ border: '2px dashed var(--neon-pink)', borderRadius: '8px', padding: folderFiles.length > 0 ? '10px' : '4px 20px 20px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: folderFiles.length > 0 ? 0 : 1 }}>
                    <input
                      type="file"
                      webkitdirectory=""
                      directory=""
                      onChange={handleFolderChange}
                      style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: 100 + '%', height: 100 + '%', cursor: 'pointer' }}
                    />
                    <Folder size={folderFiles.length > 0 ? 20 : 32} className="neon-text-pink" style={{ margin: folderFiles.length > 0 ? '5px auto' : '15px auto 10px' }} />
                    <p style={{ fontSize: folderFiles.length > 0 ? '0.75rem' : '0.8rem', color: '#fff' }}>ローカルフォルダを選択</p>
                    {folderFiles.length === 0 && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>フォルダ全体の構成をGoogle Drive上にクローンします</p>}
                    {folderFiles.length > 0 && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--neon-green)', marginTop: '4px', fontWeight: 'bold' }}>
                        "{folderName}" ({folderFiles.length}個の音声ファイル)
                      </p>
                    )}
                  </div>

                  {folderFiles.length > 0 && (
                    <div className="metadata-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px', borderTop: '1px dashed rgba(255,0,127,0.2)', paddingTop: '10px' }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--neon-pink)', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '4px', marginBottom: '2px' }}>[BATCH_ID3_TAG_INJECTION]</p>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--neon-pink)', display: 'block', marginBottom: '2px' }}>[ARTIST_NAME]</label>
                        <input
                          type="text"
                          value={folderMetadata.artist}
                          onChange={(e) => setFolderMetadata(prev => ({ ...prev, artist: e.target.value }))}
                          className="settings-input"
                          style={{ width: '100%', padding: '4px 6px', background: '#000', border: '1px solid rgba(255,0,127,0.3)', color: '#fff', fontSize: '0.8rem' }}
                          placeholder="一括設定するアーティスト名"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--neon-pink)', display: 'block', marginBottom: '2px' }}>[ALBUM_NAME]</label>
                        <input
                          type="text"
                          value={folderMetadata.album}
                          onChange={(e) => setFolderMetadata(prev => ({ ...prev, album: e.target.value }))}
                          className="settings-input"
                          style={{ width: '100%', padding: '4px 6px', background: '#000', border: '1px solid rgba(255,0,127,0.3)', color: '#fff', fontSize: '0.8rem' }}
                          placeholder="一括設定するアルバム名"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--neon-pink)', display: 'block', marginBottom: '2px' }}>[COVER_IMAGE_INJECTION]</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              border: '1px solid rgba(255,0,127,0.3)',
                              background: folderMetadata.coverUrl ? `url('${folderMetadata.coverUrl}')` : '#111',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}
                          ></div>
                          <div style={{ position: 'relative', flexGrow: 1 }}>
                            <button className="play-generated-btn" style={{ width: '100%', padding: '3px 8px', fontSize: '0.7rem', marginTop: 0, borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)' }}>
                              一括画像を選択
                            </button>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleCoverChange(e, 'folder')}
                              style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: 100 + '%', height: 100 + '%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {folderFiles.length > 0 && (
                    <div style={{ maxHeight: '70px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px', background: '#000' }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--neon-pink)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2px', marginBottom: '4px' }}>[PREVIEW_SYNC_LIST]</p>
                      {folderFiles.slice(0, 10).map((f, i) => (
                        <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                          - {f.name}
                        </div>
                      ))}
                      {folderFiles.length > 10 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>and {folderFiles.length - 10} more files...</div>}
                    </div>
                  )}

                  <button
                    onClick={handleFolderUpload}
                    disabled={folderFiles.length === 0}
                    className="play-generated-btn"
                    style={{ width: '100%', marginTop: 'auto', padding: '10px', borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)' }}
                  >
                    SYNC AUDIO DIRECTORY
                  </button>
                </>
                </>
              )}
            </div>
          )}

          {/* サイバーコンソールログパネル */}
          <div className="console-panel" style={{
            gridColumn: isUploading ? '1 / span 2' : '2 / 3',
            background: 'rgba(0,0,0,0.85)',
            border: `1px solid ${activeTab === 'file' ? 'var(--neon-cyan)' : 'var(--neon-pink)'}`,
            borderRadius: '6px',
            padding: '15px',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: `inset 0 0 15px ${activeTab === 'file' ? 'rgba(0,243,255,0.1)' : 'rgba(255,0,127,0.1)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>[SYS.EXECUTION.LOG]</span>
              {isUploading && (
                <span className="spin-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={12} style={{ animation: 'spin 1s infinite linear' }} />
                </span>
              )}
            </div>

            <div className="log-area" style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', minHeight: '180px' }}>
              {logs.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>
                  READY FOR SYNCHRONIZATION SEQUENCE.<br />
                  SELECT PROTOCOL & LAUNCH.
                </div>
              )}
              {logs.map((log, index) => {
                let color = 'var(--text-muted)';
                if (log.includes('[OK]')) color = 'var(--neon-green)';
                if (log.includes('[ERROR]')) color = 'var(--neon-pink)';
                if (log.includes('[WARN]')) color = '#ffea00';
                if (log.includes('[SYS]')) color = 'var(--neon-cyan)';
                return (
                  <div key={index} style={{ fontSize: '0.75rem', color: color, wordBreak: 'break-all', lineHeight: '1.4' }}>
                    {log}
                  </div>
                );
              })}
              <div ref={logEndRef}></div>
            </div>

            {/* プログレスバー */}
            {isUploading && (
              <div className="progress-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff' }}>
                  <span>SYNCHRONIZING...</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: activeTab === 'file' ? 'var(--neon-cyan)' : 'var(--neon-pink)',
                    boxShadow: `0 0 10px ${activeTab === 'file' ? 'var(--neon-cyan)' : 'var(--neon-pink)'}`,
                    transition: 'width 0.2s ease-out'
                  }}></div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default UploadModal;
