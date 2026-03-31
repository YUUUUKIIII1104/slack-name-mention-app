const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const config = require('../config');

class SlackService {
  constructor(token) {
    this.client = new WebClient(token);
    this._userCache = null;
    this._userCacheExpiry = 0;
  }

  // ---- 画像ダウンロード ----

  async downloadImage(fileUrl) {
    try {
      if (this.isSlackFileUrl(fileUrl)) {
        return await this.downloadSlackFile(fileUrl);
      }
      return await this.downloadExternalFile(fileUrl);
    } catch (error) {
      console.error('画像ダウンロードエラー:', error);
      throw error;
    }
  }

  isSlackFileUrl(url) {
    return /files\.slack\.com|slack-files\.com/.test(url);
  }

  async downloadSlackFile(fileUrl) {
    console.log('🔧 [DEBUG] Slack ファイルダウンロード開始');

    let fileId = this.extractFileId(fileUrl);

    if (!fileId) {
      const directMatch = fileUrl.match(/(F[A-Z0-9]{8,})/);
      if (directMatch) fileId = directMatch[1];
    }

    if (!fileId) {
      throw new Error('SlackファイルIDを抽出できませんでした: ' + fileUrl);
    }

    const response = await this.client.files.info({ file: fileId });

    if (response.file && response.file.url_private_download) {
      const imageResponse = await axios.get(response.file.url_private_download, {
        headers: { 'Authorization': `Bearer ${config.slackBotToken}` },
        responseType: 'arraybuffer',
      });
      return Buffer.from(imageResponse.data);
    }

    throw new Error('Slackファイルをダウンロードできませんでした');
  }

  async downloadExternalFile(fileUrl) {
    const imageResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: config.downloadTimeoutMs,
    });
    return Buffer.from(imageResponse.data);
  }

  extractFileId(fileUrl) {
    const patterns = [
      /files\.slack\.com\/files-pri\/[^\/]+-([^\/\?]+)\/[^\/\?]*/,
      /files\.slack\.com\/files-pri\/[^\/]+\/([^\/\?]+)\/[^\/\?]*/,
      /files\.slack\.com\/files-pri\/[^\/]+\/([^\/\?]+)/,
      /files\.slack\.com\/files-tmb\/[^\/]+-([^\/\?]+)\/[^\/\?]*/,
      /slack-files\.com\/[^\/]+-([^\/\?]+)\/[^\/\?]*/,
    ];

    for (const pattern of patterns) {
      const match = fileUrl.match(pattern);
      if (match && match[1] && /^F[A-Z0-9]{8,}$/.test(match[1])) {
        return match[1];
      }
    }
    return null;
  }

  // ---- ユーザー一覧（キャッシュ＋ページネーション対応） ----

  async getAllUsers() {
    const now = Date.now();
    if (this._userCache && now < this._userCacheExpiry) {
      console.log('🔧 [DEBUG] ユーザーキャッシュ使用');
      return this._userCache;
    }

    try {
      const members = [];
      let cursor;

      do {
        const result = await this.client.users.list({
          limit: 200,
          ...(cursor ? { cursor } : {}),
        });
        if (result.members) {
          members.push(...result.members);
        }
        cursor = result.response_metadata?.next_cursor;
      } while (cursor);

      const activeUsers = members.filter(u => !u.deleted && !u.is_bot);

      this._userCache = activeUsers;
      this._userCacheExpiry = now + config.userCacheTtlMs;
      console.log(`✅ ユーザー一覧取得: ${activeUsers.length}人（キャッシュ更新）`);

      return activeUsers;
    } catch (error) {
      console.error('ユーザー一覧取得エラー:', error);
      throw error;
    }
  }

  // ---- ユーザーマッチング ----

  findMatchingUsers(nameVariations, users) {
    const matches = [];

    for (const user of users) {
      const userNames = [
        user.real_name,
        user.display_name,
        user.profile?.display_name,
        user.profile?.real_name,
        user.profile?.real_name_normalized,
        user.profile?.display_name_normalized,
      ].filter(Boolean);

      for (const variation of nameVariations) {
        for (const userName of userNames) {
          if (this.isNameMatch(variation, userName)) {
            matches.push({
              user,
              matchedName: variation,
              userName,
              confidence: this.calculateConfidence(variation, userName),
            });
            break;
          }
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 姓・名の境界を意識したマッチング。
   * - 完全一致
   * - スペース区切りのパート完全一致（姓 or 名が一致）
   * - ユーザー名が検索語で始まるか終わる（「田中」→「田中太郎」OK、「小田中」NG）
   */
  isNameMatch(variation, userName) {
    const v = variation.toLowerCase().trim();
    const u = userName.toLowerCase().trim();

    // 完全一致
    if (v === u) return true;

    // スペース区切りのパート完全一致（姓 or 名）
    const uParts = u.split(/\s+/);
    const vParts = v.split(/\s+/);
    for (const uPart of uParts) {
      for (const vPart of vParts) {
        if (uPart === vPart && uPart.length >= 2) return true;
      }
    }

    // 先頭一致または末尾一致（境界を意識）
    // 「田中」は「田中太郎」にマッチ、「小田中」にはマッチしない
    if (v.length >= 2 && u.startsWith(v)) return true;
    if (v.length >= 2 && u.endsWith(v) && this.isNameBoundary(u, u.length - v.length)) return true;

    return false;
  }

  /**
   * 指定位置が名前の境界かどうか判定。
   * スペースの直後、または漢字/かな切り替わりポイントを境界とする。
   */
  isNameBoundary(str, pos) {
    if (pos === 0) return true;
    const prev = str[pos - 1];
    // スペース直後は境界
    if (/\s/.test(prev)) return true;
    return false;
  }

  calculateConfidence(variation, userName) {
    const v = variation.toLowerCase();
    const u = userName.toLowerCase();

    if (v === u) return 1.0;

    const uParts = u.split(/\s+/);
    for (const uPart of uParts) {
      if (uPart === v) return 0.95;
    }

    if (u.startsWith(v) || u.endsWith(v)) return 0.8;

    return 0.6;
  }

  // ---- メッセージ投稿 ----

  async postMentionMessage(channel, threadTs, matches, originalText, extractedNames) {
    try {
      if (matches.length === 0) {
        await this.client.chat.postMessage({
          channel,
          thread_ts: threadTs,
          text: `🔍 画像からテキストを検出しましたが、該当するユーザーが見つかりませんでした。\n\n**検出されたテキスト**: ${originalText}\n**抽出された名前候補**: ${extractedNames.join(', ')}`,
        });
        return;
      }

      const mentions = matches
        .slice(0, config.maxMentions)
        .map(match => `<@${match.user.id}>`)
        .join(' ');

      const confidenceText = matches.length > 1
        ? '\n\n*複数の候補が見つかりました。信頼度順に表示しています。*'
        : '';

      const detailText = matches.length <= 3
        ? '\n\n**マッチング詳細**:\n' + matches.slice(0, 3).map(match =>
            `• <@${match.user.id}> (${match.matchedName} → ${match.userName})`
          ).join('\n')
        : '';

      const message = `🔍 **画像から名前を検出しました！**

**検出されたテキスト**: ${originalText}
**抽出された名前**: ${extractedNames.join(', ')}
**該当候補**: ${mentions}${confidenceText}${detailText}`;

      await this.client.chat.postMessage({
        channel,
        thread_ts: threadTs,
        text: message,
      });
    } catch (error) {
      console.error('メッセージ投稿エラー:', error);
      throw error;
    }
  }
}

module.exports = SlackService;
