const config = require('../config');
const OCRService = require('../services/ocrService');
const NameConverter = require('../services/nameConverter');
const SlackService = require('../services/slackService');

class ImageController {
  constructor() {
    this.ocrService = new OCRService();
    this.nameConverter = new NameConverter();
    this.slackService = new SlackService(config.slackBotToken);
  }

  // Slackイベントからの呼び出し
  async processImageFromEvent({ imageUrl, channel, threadTs }) {
    try {
      console.log('🔄 画像処理開始...');
      console.log('画像URL:', imageUrl);
      console.log('チャンネル:', channel);

      // 1. 画像をダウンロード
      console.log('📥 画像をダウンロード中...');
      const imageBuffer = await this.slackService.downloadImage(imageUrl);

      // 2. OCRで文字認識
      console.log('🔍 OCR処理中...');
      const extractedText = await this.ocrService.extractTextFromImage(imageBuffer);

      if (!extractedText) {
        console.log('画像からテキストを抽出できませんでした');
        return;
      }

      console.log('✅ 抽出されたテキスト:', extractedText);

      // 3. 日本語名前候補を抽出
      const extractedNames = this.ocrService.extractJapaneseNames(extractedText);

      if (extractedNames.length === 0) {
        console.log('名前候補が見つかりませんでした');
        return;
      }

      console.log('✅ 抽出された名前候補:', extractedNames);

      // 4. 人名判定とユーザーマッチング
      console.log('🔄 人名判定とユーザーマッチング中...');
      const users = await this.slackService.getAllUsers();

      const personNames = await this.nameConverter.batchConvertNames(extractedNames);

      if (personNames.length === 0) {
        console.log('❌ 人名が見つかりませんでした');
        await this.slackService.postMentionMessage(channel, threadTs, [], extractedText, []);
        return;
      }

      console.log(`✅ ${personNames.length}個の人名を特定`);

      // 各人名でユーザーマッチング
      const allMatches = [];
      for (const nameObj of personNames) {
        const variations = this.nameConverter.generateNameVariations(nameObj);
        const matches = this.slackService.findMatchingUsers(variations, users);
        if (matches.length > 0) {
          allMatches.push(...matches);
        }
      }

      // 重複除去
      const uniqueMatches = this.removeDuplicateUsers(allMatches);
      console.log(`✅ 最終マッチ数: ${uniqueMatches.length}件`);

      // 5. Slackに結果投稿
      await this.slackService.postMentionMessage(
        channel,
        threadTs,
        uniqueMatches,
        extractedText,
        personNames.map(p => p.kanji)
      );
      console.log('✅ Slackメッセージ投稿完了');
    } catch (error) {
      console.error('❌ 画像処理エラー:', error);
    }
  }

  removeDuplicateUsers(matches) {
    const seen = new Set();
    return matches.filter(match => {
      if (seen.has(match.user.id)) return false;
      seen.add(match.user.id);
      return true;
    });
  }
}

module.exports = ImageController;
