const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

class NameConverter {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    this.commonNames = new Map([
      ['田中', { hiragana: 'たなか', katakana: 'タナカ', romaji: 'tanaka' }],
      ['佐藤', { hiragana: 'さとう', katakana: 'サトウ', romaji: 'sato' }],
      ['鈴木', { hiragana: 'すずき', katakana: 'スズキ', romaji: 'suzuki' }],
      ['山田', { hiragana: 'やまだ', katakana: 'ヤマダ', romaji: 'yamada' }],
      ['高橋', { hiragana: 'たかはし', katakana: 'タカハシ', romaji: 'takahashi' }],
      ['渡辺', { hiragana: 'わたなべ', katakana: 'ワタナベ', romaji: 'watanabe' }],
      ['伊藤', { hiragana: 'いとう', katakana: 'イトウ', romaji: 'ito' }],
      ['中村', { hiragana: 'なかむら', katakana: 'ナカムラ', romaji: 'nakamura' }],
    ]);
  }

  isLikelyPersonName(text) {
    const notPersonNamePatterns = [
      /^(株式会社|有限会社|合同会社|執行役員|取締役|責任者|部長|課長|主任|係長)$/,
      /^(東京都|大阪府|京都府|神奈川|埼玉県|千葉県|北海道|沖縄県)$/,
      /^(新宿区|渋谷区|港区|千代田|中央区|目黒区|世田谷)$/,
      /^(開発|営業|経理|総務|人事|企画|設計|製造|販売)$/,
      /^(電話|Tel|Mail|Mobile|住所|番地|丁目)$/i,
      /^[0-9\-]+$/,
      /^[A-Za-z\s]+$/,
      /^.{1}$/,
      /^.{7,}$/,
    ];

    return !notPersonNamePatterns.some(pattern => pattern.test(text));
  }

  async convertName(kanjiName) {
    try {
      if (!this.isLikelyPersonName(kanjiName)) return null;

      if (this.commonNames.has(kanjiName)) {
        const conversion = this.commonNames.get(kanjiName);
        return {
          kanji: kanjiName,
          ...conversion,
          confidence: 0.95,
          isPersonName: true,
        };
      }

      return await this.convertUsingGemini(kanjiName);
    } catch (error) {
      console.error('名前変換エラー:', error);
      return null;
    }
  }

  async convertUsingGemini(name) {
    try {
      const prompt = `
あなたは日本語の人名判定と読み方変換の専門家です。
以下の文字列について分析してください。

文字列: "${name}"

まず、この文字列が日本人の名前（姓または名、もしくは姓名）である可能性を判定してください。
人名である場合のみ、読み方を提供してください。

以下に該当する場合は人名ではありません:
- 会社名、組織名（株式会社、有限会社など）
- 役職名（執行役員、取締役、部長、課長など）
- 地名（東京都、大阪府、新宿区、渋谷区など）
- 住所の一部（番地、丁目、ビル名など）
- 業務用語（開発、営業、責任者、人財開発など）
- 連絡先情報（Tel、Mail、Mobileなど）
- 数字のみの文字列
- 明らかに日本人名でない外国語

必ずJSON形式で回答してください:

{
  "isPersonName": true/false,
  "confidence": 信頼度（0.0-1.0）,
  "reasoning": "判定理由",
  "kanji": "${name}",
  "hiragana": "ひらがな読み（人名の場合のみ）",
  "katakana": "カタカナ読み（人名の場合のみ）",
  "romaji": "ローマ字読み小文字（人名の場合のみ）"
}

注意事項:
- isPersonNameがfalseの場合、hiragana/katakana/romajiは空文字にしてください
- 人名の場合は最も一般的な読み方を選択してください
- ローマ字は小文字で統一してください
- JSON以外のテキストは含めないでください
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (!parsed.isPersonName) return null;

        if (parsed.kanji && parsed.hiragana && parsed.katakana && parsed.romaji) {
          return {
            kanji: parsed.kanji,
            hiragana: parsed.hiragana,
            katakana: parsed.katakana,
            romaji: parsed.romaji.toLowerCase(),
            confidence: parsed.confidence || 0.8,
            isPersonName: true,
            reasoning: parsed.reasoning,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Gemini変換エラー:', error);
      return null;
    }
  }

  generateNameVariations(nameObj) {
    if (!nameObj || !nameObj.isPersonName) return [];

    const variations = [];

    if (nameObj.kanji) variations.push(nameObj.kanji);
    if (nameObj.hiragana) variations.push(nameObj.hiragana);
    if (nameObj.katakana) variations.push(nameObj.katakana);
    if (nameObj.romaji) variations.push(nameObj.romaji);

    if (nameObj.romaji) {
      variations.push(nameObj.romaji.toUpperCase());
      variations.push(nameObj.romaji.charAt(0).toUpperCase() + nameObj.romaji.slice(1).toLowerCase());
    }

    return [...new Set(variations)];
  }

  // バッチ処理：チャンク分割＋リトライ付き
  async batchConvertNames(names) {
    // 事前フィルタリング
    const likelyPersonNames = names.filter(name => this.isLikelyPersonName(name));
    if (likelyPersonNames.length === 0) return [];

    // 辞書ヒットを先に処理
    const results = [];
    const needsGemini = [];

    for (const name of likelyPersonNames) {
      if (this.commonNames.has(name)) {
        const conversion = this.commonNames.get(name);
        results.push({
          kanji: name,
          ...conversion,
          confidence: 0.95,
          isPersonName: true,
          reasoning: '辞書マッチ',
        });
      } else {
        needsGemini.push(name);
      }
    }

    if (needsGemini.length === 0) return results;

    // チャンク分割してGeminiに送信
    const chunks = [];
    for (let i = 0; i < needsGemini.length; i += config.maxBatchSize) {
      chunks.push(needsGemini.slice(i, i + config.maxBatchSize));
    }

    for (const chunk of chunks) {
      const chunkResults = await this._batchConvertChunkWithRetry(chunk);
      results.push(...chunkResults);
    }

    return results;
  }

  async _batchConvertChunkWithRetry(names) {
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await this._batchConvertChunk(names);
      } catch (error) {
        console.error(`バッチ変換エラー (試行 ${attempt + 1}/${config.maxRetries + 1}):`, error.message);
        if (attempt < config.maxRetries) {
          await new Promise(r => setTimeout(r, config.retryDelayMs * (attempt + 1)));
        }
      }
    }

    // リトライ全失敗時は個別処理にフォールバック
    console.log('バッチ処理失敗、個別処理にフォールバック');
    const results = [];
    for (const name of names) {
      const result = await this.convertName(name);
      if (result && result.isPersonName) results.push(result);
    }
    return results;
  }

  async _batchConvertChunk(names) {
    console.log(`🔧 [DEBUG] ${names.length}個の人名候補をGeminiで判定`);

    const prompt = `
以下の日本語の文字列リストについて、それぞれが日本人の人名かどうかを判定し、
人名の場合のみ読み方を提供してください。

候補リスト: ${names.join(', ')}

必ずJSON配列形式で回答してください:
[
  {
    "input": "元の文字列",
    "isPersonName": true/false,
    "confidence": 信頼度,
    "reasoning": "判定理由",
    "kanji": "漢字（人名の場合のみ）",
    "hiragana": "ひらがな（人名の場合のみ）",
    "katakana": "カタカナ（人名の場合のみ）",
    "romaji": "ローマ字小文字（人名の場合のみ）"
  }
]

人名でない場合の例: 執行役員、東京都、株式会社、責任者、人財開発など
JSON配列以外のテキストは含めないでください。
`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('GeminiレスポンスからJSON配列を抽出できませんでした');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed
      .filter(item => item.isPersonName)
      .map(item => ({
        kanji: item.kanji,
        hiragana: item.hiragana,
        katakana: item.katakana,
        romaji: item.romaji?.toLowerCase(),
        confidence: item.confidence || 0.8,
        isPersonName: true,
        reasoning: item.reasoning,
      }));
  }
}

module.exports = NameConverter;
