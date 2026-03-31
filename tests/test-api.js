require('dotenv').config();
const axios = require('axios');

async function testAPI() {
  const testData = {
    imageUrl: process.env.TEST_IMAGE_URL || "https://cloud.google.com/vision/docs/images/sign_text.png",
    channel: process.env.TEST_CHANNEL_ID || "YOUR_CHANNEL_ID",
    threadTs: "1234567890.123456",
  };

  try {
    console.log('🔄 API テスト開始...');
    console.log('テストデータ:', testData);

    const response = await axios.post('http://localhost:3000/api/process-image', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒タイムアウト
    });

    console.log('✅ API レスポンス:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ API テストエラー:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPI();