require('dotenv').config();
const { App } = require('@slack/bolt');
const config = require('./config');
const ImageController = require('./controllers/imageController');

const app = new App({
  token: config.slackBotToken,
  signingSecret: config.slackSigningSecret,
  // Socket Mode を使う場合は以下を有効化（Webhook不要でローカル開発に便利）
  // socketMode: true,
  // appToken: config.slackAppToken,
});

const imageController = new ImageController();

// Slackに画像が投稿されたときのイベントリスナー
app.event('message', async ({ event, client, logger }) => {
  try {
    // ファイル添付がないメッセージは無視
    if (!event.files || event.files.length === 0) return;

    // 画像ファイルのみ対象
    const imageFiles = event.files.filter(f =>
      f.mimetype && f.mimetype.startsWith('image/')
    );
    if (imageFiles.length === 0) return;

    const channel = event.channel;
    const threadTs = event.thread_ts || event.ts;

    logger.info(`画像検出: ${imageFiles.length}件 in channel ${channel}`);

    for (const file of imageFiles) {
      const fileUrl = file.url_private || file.url_private_download;
      if (!fileUrl) continue;

      await imageController.processImageFromEvent({
        imageUrl: fileUrl,
        channel,
        threadTs,
      });
    }
  } catch (error) {
    logger.error('イベント処理エラー:', error);
  }
});

// ヘルスチェック用（Bolt の receiver は Express ベース）
app.receiver.app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

(async () => {
  await app.start(config.port);
  console.log(`⚡ Bolt app is running on port ${config.port}`);
})();

module.exports = app;
