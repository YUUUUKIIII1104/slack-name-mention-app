require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Slack
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  slackAppToken: process.env.SLACK_APP_TOKEN,

  // Google
  geminiApiKey: process.env.GEMINI_API_KEY,
  googleCloudKeyFile: process.env.GOOGLE_CLOUD_KEY_FILE || 'credentials/google-cloud-key.json',

  // Application limits
  maxMentions: 5,
  maxBatchSize: 15,       // Gemini batch size per request
  maxRetries: 2,          // Gemini retry count
  retryDelayMs: 1000,     // Delay between retries

  // Cache
  userCacheTtlMs: 5 * 60 * 1000, // 5 minutes

  // Download
  downloadTimeoutMs: 10000,
  jsonPayloadLimit: '10mb',
};

module.exports = config;
