import { createClient } from '@supabase/supabase-js';

// 環境変数から情報を取得
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('エラー: 環境変数 SUPABASE_URL または SUPABASE_ANON_KEY が設定されていません。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  console.log('Supabaseへの接続を確認しています...');
  
  // flowsテーブルから1件だけ取得を試みる（アクティビティを発生させる）
  const { data, error } = await supabase.from('flows').select('id').limit(1);
  
  if (error) {
    console.error('Supabase接続エラー:', error.message);
    process.exit(1);
  }
  
  console.log('接続成功: Supabaseプロジェクトのアクティブ状態を維持しました。');
}

await keepAlive();
