import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// タイプ別のネオンカラーマッピング
const typeColors = {
  success: { border: '#0f0', glow: 'rgba(0, 255, 0, 0.15)', label: 'OK' },
  error:   { border: '#ff007f', glow: 'rgba(255, 0, 127, 0.15)', label: 'ERROR' },
  warn:    { border: '#ffea00', glow: 'rgba(255, 234, 0, 0.15)', label: 'WARN' },
  info:    { border: '#00f3ff', glow: 'rgba(0, 243, 255, 0.15)', label: 'INFO' },
  sys:     { border: '#b500ff', glow: 'rgba(181, 0, 255, 0.15)', label: 'SYS' }
};

// 自動消滅までの時間(ms)
const autoDismiss = {
  success: 4000,
  error: 6000,
  warn: 5000,
  info: 4000,
  sys: 4000
};

const ToastItem = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const color = typeColors[toast.type] || typeColors.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 350);
    }, autoDismiss[toast.type] || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 350);
  };

  // メッセージの改行をサポート
  const messageLines = toast.message.split('\n');

  return (
    <div
      style={{
        animation: isExiting ? 'toast-fade-out 0.35s ease-out forwards' : 'toast-slide-in 0.35s ease-out forwards',
        background: 'rgba(5, 5, 8, 0.95)',
        border: `1px solid ${color.border}`,
        borderLeft: `4px solid ${color.border}`,
        borderRadius: '6px',
        padding: '12px 36px 12px 14px',
        maxWidth: '420px',
        minWidth: '280px',
        position: 'relative',
        boxShadow: `0 0 15px ${color.glow}, inset 0 0 8px ${color.glow}`,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '0.8rem',
        lineHeight: '1.5',
        color: '#ccc',
        wordBreak: 'break-word',
        backdropFilter: 'blur(10px)',
        pointerEvents: 'auto'
      }}
    >
      {/* タイプラベル */}
      <div style={{
        fontSize: '0.65rem',
        color: color.border,
        marginBottom: '4px',
        letterSpacing: '2px',
        fontWeight: 'bold'
      }}>
        [{color.label}]
      </div>

      {/* メッセージ本文 */}
      {messageLines.map((line, i) => (
        <div key={i} style={{ color: i === 0 ? '#fff' : '#aaa' }}>
          {line}
        </div>
      ))}

      {/* 閉じるボタン */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.color = color.border}
        onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.4)'}
      >
        <X size={14} />
      </button>
    </div>
  );
};

const CyberToast = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none'
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default CyberToast;
