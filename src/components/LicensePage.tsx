import React, { useState } from 'react';

// サードパーティライブラリのライセンス情報
const thirdPartyLicenses = [
  {
    name: 'React',
    version: '^19.0.0',
    license: 'MIT',
    url: 'https://github.com/facebook/react',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
  },
  {
    name: '@xyflow/react (React Flow)',
    version: '^12.6.0',
    license: 'MIT',
    url: 'https://github.com/xyflow/xyflow',
    copyright: 'Copyright (c) 2023 webkid GmbH',
  },
  {
    name: 'Vite',
    version: '^6.2.0',
    license: 'MIT',
    url: 'https://github.com/vitejs/vite',
    copyright: 'Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors',
  },
  {
    name: 'TypeScript',
    version: '~5.8.3',
    license: 'Apache-2.0',
    url: 'https://github.com/microsoft/TypeScript',
    copyright: 'Copyright (c) Microsoft Corporation.',
  },
  {
    name: '@supabase/supabase-js',
    version: '^2.49.4',
    license: 'MIT',
    url: 'https://github.com/supabase/supabase-js',
    copyright: 'Copyright (c) 2020 Supabase',
  },
];

const licenseText = `MIT License

Copyright (c) 2025 kikkamfybyr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export const LicensePage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'app' | 'third'>('app');

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
          maxWidth: '640px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ヘッダー */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>📄 ライセンス情報</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              ChemFlow-TeX — MIT License
            </p>
          </div>
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

        {/* タブ */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--panel-border)',
          padding: '0 24px',
          gap: '4px',
        }}>
          {(['app', 'third'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: activeTab === tab ? 700 : 400,
                transition: 'all 0.2s',
              }}
            >
              {tab === 'app' ? '🔑 このソフトウェア' : '📦 サードパーティ'}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeTab === 'app' ? (
            <pre style={{
              margin: 0,
              fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
              fontSize: '0.78rem',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {licenseText}
            </pre>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {thirdPartyLicenses.map((lib) => (
                <div
                  key={lib.name}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{lib.name}</span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.08)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}>
                        {lib.version}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      background: lib.license === 'MIT' ? 'rgba(99,221,143,0.15)' : 'rgba(99,178,221,0.15)',
                      color: lib.license === 'MIT' ? '#63dd8f' : '#63b2dd',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}>
                      {lib.license}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {lib.copyright}
                  </div>
                  <a
                    href={lib.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', color: 'var(--accent-color)', textDecoration: 'none' }}
                  >
                    {lib.url} ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
