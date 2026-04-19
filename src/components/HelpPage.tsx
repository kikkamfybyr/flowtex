import React from 'react';

export const HelpPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>📘 使い方ガイド</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--panel-border)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ✕ 閉じる
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', fontSize: '0.9rem', lineHeight: 1.8 }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>ノードの編集</span><br />
            • ノードをクリックするとテキストを編集できます。<br />
            • ノード下部の <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>↓追加</code> で縦に新しく連結します。<br />
            • ノード下部の <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>⑂分岐</code> で複数への分岐を作成します。
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>試薬・条件の追加</span><br />
            • ノード側面の <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>+試薬</code> で横付けの試薬パスを作成します。<br />
            • 線の中央にある <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>+</code> ボタンで、矢印の途中に試薬を追加します。
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>線の操作</span><br />
            • 線の中央にある <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>🔄</code> ボタンで線を回り込み（ループ）させます。クリックで右、もう一度で左に切り替わります。<br />
            • ノード（箱）にマウスを乗せると上下に ●（ハンドル）が出現します。その ● からドラッグすると、離れたノード同士を自由に接続できます。
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>複数選択と合流操作</span><br />
            • <kbd style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid var(--panel-border)', borderRadius: 4, padding: '2px 6px', fontSize: '0.8rem' }}>Shift</kbd> を押しながらドラッグで範囲選択ができます。<br />
            • <kbd style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid var(--panel-border)', borderRadius: 4, padding: '2px 6px', fontSize: '0.8rem' }}>Shift</kbd> を押したまま複数のノードをクリックでも選択可能です。<br />
            • 2つ以上のノードを選択すると、サイドバーにピンク色の「合流」ボタンが出現し、それらを一箇所にまとめることができます。
          </div>
        </div>
      </div>
    </div>
  );
};
