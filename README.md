# ChemFlow-TeX

![ChemFlow-TeX](https://flowtex-six.vercel.app/) <!-- ここは実際のURLに合わせて変更してください -->

**ChemFlow-TeX** は、化学合成などのフローチャートを直感的な GUI で作成し、論文やレポートにそのまま使える高品質な **TikZ (LaTeX)** コードを即座に生成する Web アプリケーションです。

## 🚀 主な特徴

- **直感的なドラッグ＆ドロップ**: ノードを自由に配置し、ハンドル操作で簡単に接続できます。
- **動的なノード伸縮**: 入力されたテキストの長さに合わせて、ノードの幅や高さが自動的に調整されます。
- **高度な試薬管理**:
  - 矢印（Edge）の途中への試薬追加
  - プロセス（Node）の横からの試薬追加
  - 点線の長さやラベルの間隔など、細かいレイアウト調整済み
- **TikZ コードへのリアルタイム変換**: 編集内容が即座に TikZ/LaTeX コードとしてプレビューされ、ワンクリックでコピーや保存が可能です。
- **クラウド同期と共有**:
  - Supabase をバックエンドに使用し、自動保存に対応。
  - 固有の共有 URL を発行して、他のユーザーとチャートを共有できます。
- **ダークモード対応**: モダンで目に優しい UI デザイン。

## 🛠 技術スタック

- **Frontend**: React, Vite, TSX
- **Diagram Engine**: [React Flow](https://reactflow.dev/)
- **Styling**: Vanilla CSS (Modern UI/Glassmorphism)
- **Backend**: Supabase (Database & API)
- **Deployment**: Vercel

## 📦 ローカルでの実行方法

1. **リポジトリをクローン:**
   ```bash
   git clone https://github.com/your-username/flowtex.git
   cd flowtex
   ```

2. **依存関係のインストール:**
   ```bash
   npm install
   ```

3. **環境変数の設定:**
   `.env` ファイルを作成し、自身の Supabase プロジェクト情報を入力します。
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **開発サーバーの起動:**
   ```bash
   npm run dev
   ```

## 📝 TeX 出力の使い方

生成された TikZ コードは `standalone` クラスを使用しています。`lualatex` または `uplatex` でコンパイルすることを想定しています。

他のドキュメントに埋め込む場合は、`tikzpicture` 環境の部分のみをコピーして貼り付けてください。スタイル定義（`\tikzset`）は `tikzpicture` のオプション内にカプセル化されているため、既存のスタイルと衝突しにくくなっています。

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) をご覧ください。

---
Created with ❤️ for the Chemical Research Community.
