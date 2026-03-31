// src/test-file-access.js
require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testFileAccess() {
  const fileId = process.env.TEST_FILE_ID || 'YOUR_FILE_ID';
  
  try {
    console.log('📁 ファイル情報を取得中...');
    
    const response = await client.files.info({
      file: fileId
    });
    
    console.log('✅ ファイル情報:');
    console.log('- ファイル名:', response.file.name);
    console.log('- タイプ:', response.file.filetype);
    console.log('- サイズ:', response.file.size);
    console.log('- プライベートURL:', response.file.url_private);
    console.log('- ダウンロードURL:', response.file.url_private_download);
    
    return response.file.url_private_download;
    
  } catch (error) {
    console.error('❌ ファイルアクセスエラー:', error.message);
    
    if (error.message.includes('file_not_found')) {
      console.log('\n🔧 Bot権限確認が必要です:');
      console.log('https://api.slack.com/apps で files:read 権限を確認');
    }
    return null;
  }
}

testFileAccess();