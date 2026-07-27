# RootA Manager v5

## 入っている機能
- 6店舗切替
- キャスト追加・編集・削除
- 日付別の出勤追加・削除
- Supabase同期
- Supabase未設定時のブラウザ内保存
- スマホ対応
- PWA対応
- Netlify静的公開対応

## 最初に行うこと
1. `config.js` をメモ帳またはVS Codeで開く
2. `SUPABASE_URL` にProject URLを入れる
3. `SUPABASE_KEY` にPublishable keyを入れる
4. 保存する
5. 全ファイルをGitHubへアップロードする

## Supabase
`supabase.sql` は何度実行しても既存ポリシーで止まりにくい形にしています。
以前のSQLでテーブルができていても、最新版をもう一度実行してください。

## 注意
現在のRLSポリシーは初期開発用です。URLを知っている人がデータ操作できます。
運用前にログイン機能と権限管理を追加してください。
