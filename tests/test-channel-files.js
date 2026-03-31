require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testChannelFiles() {
  const channelId = process.env.TEST_CHANNEL_ID || 'YOUR_CHANNEL_ID';
  
  try {
    console.log('📋 チャンネルの最新ファイルを取得中...');
    
    // チャンネルの履歴を取得
    const history = await client.conversations.history({
      channel: channelId,
      limit: 20
    });
    
    console.log(`✅ メッセージ数: ${history.messages.length}`);
    
    // ファイルを含むメッセージを探す
    const fileMessages = history.messages.filter(msg => 
      msg.files && msg.files.length > 0
    );
    
    console.log(`📁 ファイル付きメッセージ数: ${fileMessages.length}`);
    
    if (fileMessages.length > 0) {
      const latestFile = fileMessages[0].files[0];
      console.log('\n📸 最新のファイル情報:');
      console.log('- ファイルID:', latestFile.id);
      console.log('- ファイル名:', latestFile.name);
      console.log('- タイプ:', latestFile.filetype);
      console.log('- サイズ:', latestFile.size);
      
      // このファイルIDでアクセステスト
      try {
        const fileInfo = await client.files.info({
          file: latestFile.id
        });
        console.log('✅ ファイルアクセス成功!');
        console.log('- プライベートURL:', fileInfo.file.url_private);
        return latestFile.id;
      } catch (fileError) {
        console.log('❌ ファイルアクセス失敗:', fileError.message);
      }
    } else {
      console.log('📝 ファイルが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('❌ チャンネル履歴取得エラー:', error.message);
  }
}

testChannelFiles();