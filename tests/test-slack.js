require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testSlackConnection() {
  try {
    const result = await client.auth.test();
    console.log('✅ Slack接続成功!');
    console.log('Bot名:', result.user);
    console.log('ワークスペース:', result.team);
    
    const users = await client.users.list();
    console.log(`✅ ユーザー一覧取得成功! (${users.members.length}人)`);
    
  } catch (error) {
    console.error('❌ Slack接続エラー:', error.message);
  }
}

testSlackConnection();