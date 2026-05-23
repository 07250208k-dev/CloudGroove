import React, { useState } from 'react';
import { Folder, X, ArrowRight, HardDrive, Shield } from 'lucide-react';

const MoveModal = ({
  isOpen,
  onClose,
  asset, // { id, name, parents, isFolder }
  folders = [], // すでにApp.jsx側でモード別にフィルタリングされたフォルダ一覧
  secretFolderId,
  isAsmrMode,
  onMove,
  addToast
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !asset) return null;

  // モード別のルートディレクトリ設定
  const defaultDest = isAsmrMode 
    ? { id: secretFolderId, name: '🔒 ASMRアーカイブ (ルート)' }
    : { id: 'root', name: 'マイドライブ (すべての音楽ルート)' };

  // 自分自身（移動対象がフォルダの場合）を移動先候補から除外する
  const availableFolders = folders.filter(f => f.id !== asset.id);

  // 現在の親フォルダを特定
  const currentParentId = (asset.parents && asset.parents[0]) || (isAsmrMode ? secretFolderId : 'root');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetParentId = selectedFolderId || defaultDest.id;

    if (targetParentId === currentParentId) {
      if (addToast) addToast('現在の場所と同じ場所です。別の移動先を選択してください。', 'warn');
      return;
    }

    setIsSubmitting(true);
    try {
      await onMove(asset.id, currentParentId, targetParentId, asset.isFolder);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const accentColor = isAsmrMode ? 'var(--neon-asmr-emerald, #00ffcc)' : 'var(--neon-cyan)';
  const themeClass = isAsmrMode ? 'container-glow-pink' : 'container-glow-cyan'; // ASMRは紫/ピンク発光

  return (
    <div className="cyber-modal-overlay">
      <div className={`cyber-modal ${themeClass}`} style={{ maxWidth: '480px', width: '95%' }}>
        <div className="panel-header" style={{ borderBottom: `1px solid ${accentColor}` }}>
          <h3 style={{ color: accentColor, display: 'flex', alignItems: 'center', gap: '10px', textShadow: `0 0 8px ${accentColor}` }}>
            {isAsmrMode ? <Shield size={18} /> : <HardDrive size={18} />}
            <span>[SYS.MOVE.PROTOCOL]</span>
          </h3>
          <button className="close-btn" onClick={onClose} disabled={isSubmitting}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 移動アセット情報 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '0.85rem'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px', fontFamily: 'monospace' }}>
              TARGET {asset.isFolder ? 'FOLDER' : 'AUDIO_FILE'}:
            </div>
            <div style={{ color: '#fff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.name}
            </div>
          </div>

          {/* 移動経路シミュレーション */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', margin: '5px 0' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px dotted rgba(255,255,255,0.2)', paddingBottom: '2px' }}>
              {asset.isFolder ? '現在地' : '現在の所属'}
            </span>
            <ArrowRight size={16} style={{ color: accentColor }} />
            <span style={{ fontSize: '0.8rem', color: accentColor, fontWeight: 'bold', textShadow: `0 0 5px ${accentColor}` }}>
              {selectedFolderId 
                ? (availableFolders.find(f => f.id === selectedFolderId)?.name || '選択中のフォルダ')
                : defaultDest.name}
            </span>
          </div>

          {/* 移動先選択リスト */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              SELECT DESTINATION DIRECTORY:
            </label>
            <div style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.5)',
              padding: '6px'
            }}>
              {/* ルートフォルダの選択肢 */}
              <div 
                onClick={() => setSelectedFolderId('')}
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: selectedFolderId === '' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: selectedFolderId === '' ? `1px solid ${accentColor}` : '1px solid transparent',
                  color: selectedFolderId === '' ? accentColor : '#fff',
                  transition: 'all 0.2s',
                  marginBottom: '6px'
                }}
              >
                <HardDrive size={15} />
                <span>{defaultDest.name}</span>
              </div>

              {/* サブフォルダ一覧の選択肢 */}
              {availableFolders.map(folder => (
                <div 
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: selectedFolderId === folder.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: selectedFolderId === folder.id ? `1px solid ${accentColor}` : '1px solid transparent',
                    color: selectedFolderId === folder.id ? accentColor : '#fff',
                    transition: 'all 0.2s',
                    marginBottom: '4px'
                  }}
                >
                  <Folder size={15} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder.name}
                  </span>
                </div>
              ))}

              {availableFolders.length === 0 && selectedFolderId !== '' && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '10px', textAlign: 'center' }}>
                  (利用可能なサブディレクトリがありません)
                </div>
              )}
            </div>
          </div>

          {/* 送信・キャンセルボタン */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button 
              type="button" 
              className="play-generated-btn" 
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              className="play-generated-btn" 
              style={{ flex: 1, borderColor: accentColor, color: accentColor }}
              disabled={isSubmitting}
            >
              {isSubmitting ? '転送処理中...' : '転送を実行 [OK]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveModal;
