# Spotify操作Webアプリ

このプロジェクトはNode.jsベースでSpotify APIを利用し、楽曲の再生・停止・検索などの操作ができるWebアプリです。

## 機能
- Spotify認証（OAuth 2.0）
- 楽曲再生・停止・シーク
- お気に入り曲一覧表示
- 現在再生中の曲表示
- **API リクエスト失敗時の自動リトライ機能（指数バックオフ）**

## API リトライ機能

アプリケーションは以下の状況で自動的にリトライを行います：

### リトライ対象エラー
- **429 Too Many Requests**: Spotify APIのレート制限
- **5xx サーバーエラー**: 503, 502, 504, 500
- **ネットワークエラー**: 接続失敗、タイムアウト

### バックオフ設定
- **最大リトライ回数**: 3回
- **初期遅延**: 1秒
- **最大遅延**: 30秒
- **遅延計算**: 指数バックオフ（1秒 → 2秒 → 4秒...）
- **ジッター**: 10%のランダム要素でサーバー負荷分散

### 対象エンドポイント
- `/favorites` - お気に入り曲取得
- `/current` - 現在再生中の曲取得
- `/play` - 楽曲再生
- `/pause` - 再生停止
- `/seek` - 再生位置変更
- `/callback` - 認証トークン取得

## セットアップ手順

1. Node.jsとnpmをインストール
2. Spotify Developer Dashboardでアプリ登録
3. `client_id`と`client_secret`を取得
4. `.env`ファイルを作成し、以下を設定：
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=https://localhost:3000/callback
   ```
5. SSL証明書を生成：
   ```bash
   openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -sha256 -days 365 -nodes
   ```
6. プロジェクトの依存パッケージをインストール

## 実行方法

```bash
npm install
npm start
```

アプリケーションは `https://localhost:3000` で起動します。

## ファイル構成

- `index.js` - メインサーバーファイル
- `backoff.js` - API リトライロジック
- `public/` - フロントエンドファイル
  - `index.html` - メインページ
  - `app.js` - フロントエンドJavaScript
  - `style.css` - スタイルシート

## 開発・テスト

バックオフ機能のテスト：
```bash
node test-backoff.js
```

## 注意事項

- Spotify APIの利用にはSpotifyアカウントが必要です
- Spotify Premiumアカウントが再生制御に必要です
- レート制限に達した場合、自動的にリトライしますが完了まで時間がかかる場合があります
