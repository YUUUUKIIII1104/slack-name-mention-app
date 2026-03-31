require('dotenv').config();
const axios = require('axios');

async function testRealImage() {
  const testData = {
    imageUrl: process.env.TEST_SLACK_FILE_URL || "https://files.slack.com/files-pri/TEAM_ID-FILE_ID/image.jpg",
    channel: process.env.TEST_CHANNEL_ID || "YOUR_CHANNEL_ID",
    // threadTsをオプショナルにするか、正しい形式で設定
    // threadTs: (Date.now() / 1000).toFixed(6) // 正しい形式
    // または、threadTsを削除してメインチャンネルに投稿
  };

  try {
    console.log('🔄 実際の画像処理テスト開始...');
    console.log('画像URL:', testData.imageUrl);
    console.log('チャンネル:', testData.channel);
    
    const response = await axios.post('http://localhost:3000/api/process-image', testData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });

    console.log('\n🎉 処理成功!');
    console.log('==========================================');
    console.log('📝 検出されたテキスト:');
    console.log(response.data.extractedText);
    
    console.log('\n👤 抽出された名前候補:');
    console.log(response.data.extractedNames);
    
    console.log('\n👥 マッチしたユーザー数:', response.data.matchCount);
    
    if (response.data.matches.length > 0) {
      console.log('\n✅ マッチしたユーザー:');
      response.data.matches.forEach((match, index) => {
        console.log(`${index + 1}. ${match.userName}`);
        console.log(`   → マッチした名前: ${match.matchedName}`);
        console.log(`   → 信頼度: ${match.confidence}`);
      });
    } else {
      console.log('\n📝 マッチするユーザーが見つかりませんでした');
    }

    console.log('\n==========================================');
    console.log('\n🔧 完全なレスポンス:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ エラーが発生しました:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testRealImage();