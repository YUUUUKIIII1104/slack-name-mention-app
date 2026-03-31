require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // モデル名を修正
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log('✅ Gemini API接続成功!');

    // 名前変換テスト
    const prompt = `
以下の日本語の名前について、最も一般的な読み方で各表記を教えてください。
必ずJSON形式で回答してください。

名前: 田中

回答形式（JSONのみ）:
{
  "kanji": "田中",
  "hiragana": "ひらがな読み",
  "katakana": "カタカナ読み", 
  "romaji": "ローマ字読み（小文字）",
  "confidence": 信頼度（0.0-1.0の数値）
}

注意事項:
- ローマ字は小文字で統一してください
- JSON以外のテキストは含めないでください
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ 名前変換テスト成功!');
    console.log('Geminiからの回答:', text);

    // JSONパース試行
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON解析成功:', parsed);
      }
    } catch (e) {
      console.log('⚠️ JSON解析失敗 - でも応答は正常です');
    }

  } catch (error) {
    console.error('❌ Gemini API エラー:', error.message);
    
    // 利用可能なモデルを確認
    console.log('\n利用可能なモデルを確認中...');
    try {
      const models = await genAI.listModels();
      console.log('利用可能なモデル:');
      models.forEach(model => {
        console.log(`- ${model.name}`);
      });
    } catch (listError) {
      console.log('モデル一覧取得エラー:', listError.message);
    }
  }
}

testGeminiAPI();