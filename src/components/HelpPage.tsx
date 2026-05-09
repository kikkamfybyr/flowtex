import React, { useEffect, useRef } from 'react';

export const HelpPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        tabIndex={-1}
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
          <h2 id="help-dialog-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>📘 使い方ガイド</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="ヘルプモーダルを閉じる"
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
            • ノードを<b>クリック</b>するとテキストを編集できます。<br />
            • ノード下部の <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>↓追加</code> で縦に連結、<code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>⑂分岐</code> で複数への分岐を作成します。<br />
            • すでに接続がある場合、<code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>↓間に挿入</code> ボタンで既存の接続を維持したまま間に新しい工程を割り込ませることができます。
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>試薬・条件の追加</span><br />
            • ノード側面の <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>+試薬</code> で横からの追加パスを作成します。<br />
            • 矢印（線）の上にある <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>+</code> ボタンで、反応矢印の途中に試薬や条件を追加できます。
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>線の操作と接続</span><br />
            • 線の中央にある <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>🔄</code> ボタンで線を回り込み（ループ）させます。<br />
            • 分岐部分にある丸いハンドルをドラッグすると、分岐の高さ（折れ曲がり位置）を調整できます。<br />
            • ノードの上下にある ●（ハンドル）からドラッグすると、離れたノード同士を自由に接続できます。
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>複数選択と一括操作</span><br />
            • <b>PC:</b> <kbd style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid var(--panel-border)', borderRadius: 4, padding: '2px 6px', fontSize: '0.8rem' }}>Shift</kbd> を押しながらドラッグ、またはクリックで複数選択。<br />
            • <b>モバイル:</b> ノードを<b>長押し</b>すると複数選択モードになります。その状態で他のノードをタップして追加選択し、背景タップで解除します。<br />
            • 2つ以上のノードを選択すると、サイドバーに「合流」ボタンが出現し、一箇所にまとめることができます。
          </div>

          <div style={{ marginBottom: '8px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>📄 TeX出力の注意点</span><br />
            生成されるコードは <code style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '2px 5px' }}>standalone</code> 形式です。単体でのコンパイルには <b>LuaLaTeX</b> を推奨します。
          </div>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 600 }}>他の文書に埋め込む場合:</span><br />
            1. プリアンブルに <code style={{ opacity: 0.8 }}>mhchem, siunitx</code> パッケージと <code style={{ opacity: 0.8 }}>arrows.meta, positioning, calc</code> ライブラリを追加してください。<br />
            2. 出力コード内の <code style={{ opacity: 0.8 }}>\newcommand{'{'}\addreagent{'}'}...</code> 等のマクロ定義と <code style={{ opacity: 0.8 }}>\tikzset{'{'}...{'}'}</code> の設定も合わせてコピーしてください。
          </div>
        </div>
      </div>
    </div>
  );
};
