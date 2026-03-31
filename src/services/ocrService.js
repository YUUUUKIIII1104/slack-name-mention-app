require('dotenv').config();
const vision = require('@google-cloud/vision');

// 一般名詞・地名・役職など、人名でないことが明らかな漢字2〜4文字の除外リスト
const NON_NAME_WORDS = new Set([
  // 地名
  '東京', '大阪', '京都', '名古屋', '福岡', '札幌', '横浜', '神戸', '広島', '仙台',
  '北海道', '沖縄', '新宿', '渋谷', '品川', '池袋', '銀座', '六本木', '赤坂', '青山',
  '千代田', '中央区', '港区', '目黒', '世田谷', '杉並', '練馬', '板橋', '豊島', '江東',
  '埼玉', '千葉', '神奈川', '茨城', '栃木', '群馬', '静岡', '愛知', '三重', '岐阜',
  '新潟', '長野', '富山', '石川', '福井', '滋賀', '奈良', '和歌山', '兵庫', '岡山',
  '鳥取', '島根', '山口', '香川', '徳島', '愛媛', '高知', '佐賀', '長崎', '熊本',
  '大分', '宮崎', '鹿児島', '山形', '秋田', '岩手', '青森', '福島', '山梨',
  // 役職・肩書
  '部長', '課長', '係長', '主任', '社長', '会長', '専務', '常務', '理事', '監事',
  '取締役', '執行役員', '代表', '本部長', '次長', '室長', '所長', '局長', '院長',
  '店長', '支店長', '工場長', '責任者', '担当者', '顧問', '相談役', '参与',
  // 組織・業務用語
  '株式会社', '有限会社', '合同会社', '財団法人', '社団法人',
  '営業', '経理', '総務', '人事', '企画', '設計', '製造', '販売', '開発', '技術',
  '管理', '広報', '法務', '財務', '調達', '購買', '品質', '生産', '物流', '情報',
  '教育', '研修', '研究', '事業', '戦略', '推進', '支援', '統括', '運用', '保守',
  '会議', '報告', '連絡', '相談', '提案', '検討', '確認', '承認', '決裁', '稟議',
  '人財開発', '業務改善', '市場調査',
  // 一般名詞
  '日本', '世界', '今日', '明日', '昨日', '今月', '来月', '今年', '去年', '来年',
  '月曜', '火曜', '水曜', '木曜', '金曜', '土曜', '日曜',
  '電話', '住所', '番地', '丁目', '郵便', '携帯', '内線',
  '資料', '書類', '文書', '台帳', '帳票', '伝票', '請求', '納品', '発注', '受注',
  '平成', '令和', '昭和', '大正', '明治',
  '御中', '様方', '殿方',
]);

class OCRService {
  constructor() {
    this.client = new vision.ImageAnnotatorClient();
  }

  async extractTextFromImage(imageBuffer) {
    try {
      const [result] = await this.client.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations;
      if (detections && detections.length > 0) {
        return detections[0].description.trim();
      }

      return null;
    } catch (error) {
      console.error('OCR処理エラー:', error);
      throw new Error('画像からテキストを抽出できませんでした');
    }
  }

  // 日本語の名前らしい文字列を抽出
  extractJapaneseNames(text) {
    const patterns = [
      /[一-龯]{2,4}/g,     // 漢字2-4文字
      /[あ-ん]{2,6}/g,     // ひらがな2-6文字
      /[ア-ン]{2,6}/g,     // カタカナ2-6文字
      /[A-Za-z]{2,10}/g,   // ローマ字2-10文字
    ];

    let allMatches = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      allMatches = allMatches.concat(matches);
    }

    const uniqueNames = [...new Set(allMatches)].filter(name => {
      if (name.length < 2 || name.length > 10) return false;

      // 既知の非人名を除外
      if (NON_NAME_WORDS.has(name)) return false;

      const excludePatterns = [
        /^\d+$/,                    // 数字のみ
        /^[ぁぃぅぇぉっゃゅょ]+$/, // 小文字のみ
        /^[!@#$%^&*()]+$/,         // 記号のみ
      ];

      return !excludePatterns.some(p => p.test(name));
    });

    return uniqueNames;
  }
}

module.exports = OCRService;
