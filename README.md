# Slack Name Mention App

Slackチャンネルに投稿された画像から人名を検出し、該当するSlackユーザーを自動でメンションするBotです。

## 仕組み

1. Slackチャンネルに画像が投稿される
2. Google Cloud Vision API で OCR テキスト抽出
3. 日本語の名前候補を抽出（非人名フィルタ付き）
4. Google Gemini API で人名判定・読み方変換
5. Slackユーザー一覧とマッチング
6. 該当ユーザーをスレッドでメンション

## 必要な環境

- Node.js 18+
- Google Cloud プロジェクト（Vision API 有効化済み）
- Google Gemini API キー
- Slack App（Bot Token + Signing Secret）

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数を設定
cp .env.example .env
# .env を編集して各APIキーを設定
```

### Slack App の設定

1. [Slack API](https://api.slack.com/apps) でアプリを作成
2. **OAuth & Permissions** で以下の Bot Token Scopes を追加:
   - `chat:write`
   - `files:read`
   - `users:read`
   - `channels:history` / `groups:history`
3. **Event Subscriptions** を有効化し、以下のイベントを購読:
   - `message.channels`
   - `message.groups`
4. Request URL に `https://<your-domain>/slack/events` を設定
5. Bot をチャンネルに招待

### Google Cloud の設定

1. サービスアカウントキーを `credentials/google-cloud-key.json` に配置
2. `GOOGLE_APPLICATION_CREDENTIALS` 環境変数、または `.env` の `GOOGLE_CLOUD_KEY_FILE` で参照

## 起動

```bash
# 本番
npm start

# 開発（ホットリロード）
npm run dev
```

## プロジェクト構成

```
├── src/
│   ├── app.js                    # Slack Bolt エントリポイント
│   ├── config/
│   │   └── index.js              # 設定値の一元管理
│   ├── controllers/
│   │   └── imageController.js    # 画像処理パイプライン
│   └── services/
│       ├── ocrService.js         # Google Vision OCR + 名前抽出
│       ├── nameConverter.js      # Gemini 人名判定・変換
│       └── slackService.js       # Slack API（キャッシュ・ページネーション付き）
├── tests/                        # テストスクリプト
├── credentials/                  # Google Cloud 鍵（.gitignore 対象）
├── .env.example                  # 環境変数テンプレート
└── package.json
```

## テスト

```bash
# API接続テスト（Slack, Vision, Gemini）
npm run test-apis
```
