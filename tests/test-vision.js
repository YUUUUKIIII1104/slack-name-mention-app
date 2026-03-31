require('dotenv').config();
const vision = require('@google-cloud/vision');

async function testVisionAPI() {
  try {
    const client = new vision.ImageAnnotatorClient();
    console.log('✅ Google Cloud Vision API接続成功!');
    
    // 簡単なテスト（オンラインのサンプル画像を使用）
    const imageUrl = 'https://cloud.google.com/vision/docs/images/sign_text.png';
    
    const [result] = await client.textDetection({
      image: { source: { imageUri: imageUrl } }
    });
    
    const detections = result.textAnnotations;
    if (detections && detections.length > 0) {
      console.log('✅ OCR処理成功!');
      console.log('検出されたテキスト:', detections[0].description);
    }
    
  } catch (error) {
    console.error('❌ Vision API エラー:', error.message);
  }
}

testVisionAPI();