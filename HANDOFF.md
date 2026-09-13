# 和晩酌 嶺 サイト構築ハンドオフ資料

**作成日**: 2026-09-02
**構築**: SearchMania Inc.
**担当**: h.kuniyoshi@search-mania.net

---

## サイト概要

| 項目 | 値 |
|---|---|
| 公開URL | https://wabanshaku-mine.search-mania.net/ |
| GitHub | https://github.com/hkuniyoshi-cpu/wabanshaku-mine |
| Cloudflare Pages | wabanshaku-mine（プロジェクト名） |
| 対応言語 | JP（既定） / EN / zh-TW |
| CMS 方式 | Google Sheets + GAS Web App |
| Reviews 同期 | **なし**（GBP 運用なしのため手動投入方式） |
| Make ブログ自動投稿 | **なし**（同上） |
| Google Map 埋め込み | あり（訪問客導線用） |
| 予約プラットフォーム | **TableCheck** — https://www.tablecheck.com/ja/shops/wabanshaku-mine |
| Drive 画像フォルダ | https://drive.google.com/drive/folders/16J3G5cJ8un67Ny-Qjv2FCH5qMFtvndlt |

---

## ディレクトリ構成

```
和晩酌嶺様/
├─ index.html                    JP メインページ
├─ shared.css                    共有デザインシステム
├─ favicon.svg                   ファビコン
├─ ogp.svg                       OGP 画像（1200×630 SVG）
├─ robots.txt                    クローラー許可（AI 12 種 Allow）
├─ llms.txt                      LLM 用サイト要約（英語）
├─ _redirects                    Cloudflare Pages リライトルール
├─ netlify.toml                  互換用（Cloudflare では無視）
├─ privacy-policy.html           プライバシーポリシー
├─ terms.html                    ご利用ガイドライン
├─ .gitignore                    gas/ scripts/ 等を除外
│
├─ en/index.html                 英語版 LP
├─ zh-tw/index.html              繁体中文版 LP
│
├─ blog/index.html               ブログ詳細（?post=SLUG 用フォールバック）
│
├─ functions/                    Cloudflare Pages Functions
│  ├─ sitemap.xml.js             動的 sitemap.xml
│  └─ blog/[slug].js             SSR ブログ詳細（/blog/xxx/）
│
├─ gas/                          .gitignore で除外・秘匿
│  ├─ Code.js                    GAS Web App API
│  ├─ setup.js                   Sheets 初期セットアップ
│  └─ appsscript.json            Web App manifest
│
├─ scripts/                      .gitignore で除外・社内用
│  ├─ deploy-github.ps1          gh CLI で GitHub 作成 + push
│  ├─ deploy-cloudflare.ps1      wrangler で Pages + カスタムドメイン + CNAME
│  ├─ clasp-setup.ps1            GAS プロジェクト clasp create + push
│  └─ inject-gas-url.ps1         GAS URL を全 HTML/JS ファイルに一括注入
│
├─ CITATION-CHECKLIST.md         業種別サイテーション登録リスト
└─ HANDOFF.md                    本ファイル
```

---

## 構築手順（未実施分）

### 1. GAS プロジェクトのデプロイ

```powershell
cd C:\Users\endle\.claude\お取引先ポータル\企業別\和晩酌嶺様
.\scripts\clasp-setup.ps1
```

その後、Apps Script エディタで手動操作：

1. `clasp open` でエディタを開く
2. `setup` ファイル → `createCMSSpreadsheet` を **▶ Run**
3. 承認プロンプト → 続行
4. ログの Spreadsheet ID をコピー
5. `gas/Code.js` の `__SS_ID__` を実 ID に置換
6. `clasp push -f` を再実行
7. **デプロイ → 新しいデプロイ → 種類:ウェブアプリ**
    - 実行するユーザー: 自分
    - アクセスできるユーザー: **全員**
    - **デプロイ**
8. Web App URL をコピー

### 2. GAS URL を全ファイルに注入

```powershell
.\scripts\inject-gas-url.ps1 -GasUrl 'https://script.google.com/macros/s/AKfy.../exec'
```

これで `__GAS_URL__` および `__GAS_DEPLOY_ID__` 全箇所が置換される。

### 3. GitHub リポジトリ作成 + push

```powershell
.\scripts\deploy-github.ps1
```

### 4. Cloudflare Pages デプロイ + カスタムドメイン

```powershell
.\scripts\deploy-cloudflare.ps1
```

Cloudflare API Token が `~/.claude/secrets/cloudflare-dns-token` にあれば CNAME まで自動作成される。なければ Pages ダッシュボードで手動で `wabanshaku-mine.search-mania.net` を追加。

### 5. Search Console 認証

1. h.kuniyoshi@search-mania.net で https://search.google.com/search-console
2. URL プレフィックス方式で `https://wabanshaku-mine.search-mania.net/` を追加
3. HTML タグ認証 → 発行された `<meta name="google-site-verification" content="...">` を `index.html` の `<head>` に追加
4. GitHub push → Cloudflare 自動デプロイ後に「確認」
5. サイトマップ送信: `sitemap.xml`
6. URL 検査 → トップ URL → インデックス登録リクエスト

---

## クライアント運用マニュアル（オーナー様向け）

### Sheets を編集して即時反映

CMS の実体は Google Sheets です（GAS が読み込みAPIを提供）。

1. Google Sheets を開く（アクセス権はオーナー様のアカウントに付与済）
2. 該当タブ（`settings` / `menu` / `blog` など）を編集
3. **保存不要 = 自動保存**
4. サイトに **数秒〜1 分で反映**（ブラウザキャッシュにより最大 5 分）

### タブごとの役割

| タブ | 用途 | 更新頻度 |
|---|---|---|
| settings | 店舗基本情報（店名、住所、営業時間、電話等） | ほぼ変わらない |
| hero | トップ画像スライドショー（4 枚推奨） | 季節ごと |
| about | 「店のこと」文章と写真 | 年 1 回程度 |
| menu | コース・単品お品書き（6 枠、季節で入替可） | 季節ごと |
| features | 「こだわり」6 項目 | ほぼ変わらない |
| forYou | 「こんな方に」4 項目 | ほぼ変わらない |
| reviews | Google クチコミ（手動投入） | 気が向いたとき |
| blog | 「お知らせ・季節の便り」 | 随時 |
| access | 住所、駅、駐車場、地図埋め込みURL | ほぼ変わらない |
| sns | Instagram 等のリンク | 変わらない |
| delivery | ランチ告知、予約リンク等 | ほぼ変わらない |
| faq | よくあるご質問 | 随時 |
| cta | フッター上の予約バナー文言 | ほぼ変わらない |

### ブログを投稿する

`blog` タブに以下を追加：

- 順番: 空欄でOK
- 日付: 投稿日（例: 2026-09-15）
- タイトル: 空欄で OK（本文冒頭が自動的にタイトルになる）
- 本文: 内容
- 画像URL: Google Drive の共有 URL をコピペ（`https://drive.google.com/file/d/xxx/view?usp=sharing`）
- ブログ個別URL: 空欄で OK（自動で /blog/日付-時刻/ になる）
- ステータス: `published` と入力
- CTAラベル: 空欄で OK

保存 → 数分でサイトに表示されます。

### 画像の Google Drive 権限

サイトから画像を参照するには、Drive フォルダで **「リンクを知っている全員が閲覧可」** に設定してください。フォルダに設定すれば中の全ファイルに継承されます。

### Drive フォルダから画像を一括取り込み（推奨・かんたん）

すでに Google Drive に写真フォルダがあれば、**GAS の関数を 1 回実行するだけで、Hero・About・Menu の画像URL列がまとめて埋まります**。

Apps Script エディタで：

1. `Code.js` を開く
2. 関数名プルダウンで **`syncDriveFolderAll`** を選択
3. コード編集エリアの上部でフォルダIDを渡すコードを1行足すか、以下を直接コンソールに入力：
   ```
   syncDriveFolderAll('16J3G5cJ8un67Ny-Qjv2FCH5qMFtvndlt')
   ```
4. **▶ Run**（初回のみ Drive 権限を承認）
5. Logger の出力を確認 → Sheets を開くと画像URLが投入済み
6. サイトを再読み込みすると自動で反映

その他の関数：
- `listDriveFolder('<folder-id>')` — フォルダ内画像一覧をログ出力（何がどのファイル名か確認したい時）
- `syncDriveFolderToHero('<folder-id>')` — Hero だけに 4 枚投入
- `syncDriveFolderToMenu('<folder-id>')` — Menu だけに 6 枚投入
- `syncDriveFolderToAbout('<folder-id>')` — About だけに 3 枚投入

**フォルダIDの取り方**: Drive フォルダを開いた URL の `/folders/<ここ>` の部分。
今回の写真フォルダは `16J3G5cJ8un67Ny-Qjv2FCH5qMFtvndlt`。

### 個別に画像を差し替える場合

Sheets の画像URL列に Drive の共有URL（`https://drive.google.com/file/d/xxx/view?usp=sharing`）をペーストするだけでOK。GAS が自動的に画像表示用URLに変換します。

---

## 多言語運用について

- 英語版（/en/）・繁体中文版（/zh-tw/）は **ハードコード** で、CMS 連動しません
- 内容変更が必要な場合は SearchMania までご連絡ください（GitHub 上の HTML ファイルを直接編集）
- 一部（メニュー、お知らせ等）は CMS の日本語がそのまま英語版・繁中版にも表示されます

---

## トラブル時の連絡

**SearchMania Inc.**
h.kuniyoshi@search-mania.net

- サイトが表示されない
- Sheets 編集が反映されない
- ブログ投稿の投稿方法がわからない
- 画像が表示されない
- 検索順位を上げたい

すべて対応可能です。お気軽にご相談ください。

---

## 技術要点（社内メモ）

- **Reviews 同期スキップ**: `syncGoogleReviews()` は Code.js から削除済み。手動で reviews タブに書き込めば表示される
- **Make GBP watcher スキップ**: 導入していない。将来必要になれば `references/make-setup.md` 参照
- **TableCheck 予約**: `settings.予約リンク` と `cta.ボタン1リンク` が TableCheck URL 経由。JSON-LD `potentialAction` に `ReserveAction` として組込。3 言語ページ全て対応（`/ja/` `/en/` `/zh-TW/`）
- **Drive 画像連動**: `Code.js` に `syncDriveFolderAll` / `listDriveFolder` / `syncDriveFolderToHero|Menu|About` を追加。フォルダID渡すだけで全画像取込。`appsscript.json` に `drive.readonly` スコープ追加済
- **Drive 画像フォールバック**: 全 3 index.html に `DRIVE_FALLBACK` 定数を埋込。CMS 未接続でも実写真が即表示される。setup.js 側でも hero/about/menu/forYou の画像URL列に Drive 共有URLを事前投入済（GAS 承認だけで即動作）
- **Split-screen layout**: toki-fuji.com 準拠。`.site-shell` > `.site-aside`（固定左パネル・写真+ロゴ+ナビ） + `.site-main`（右スクロール本文）。スクロール時に aside の写真がセクションに応じて crossfade（`data-photo` 属性でセクション毎にどの hero 画像を出すか指定）
- **SSR ブログ**: `functions/blog/[slug].js` で Cloudflare Pages Function として動作。Googlebot が initial HTML で本文を取得可能
- **動的 sitemap**: `functions/sitemap.xml.js` → GAS `?sitemap=1` プロキシ、edge cache 1h
- **hreflang**: 3 ページ全てで ja/en/zh-TW/x-default をクロスリンク
- **JSON-LD @graph**: Restaurant + Menu + FAQPage、`sameAs` に 8 URL
- **AI クローラー**: robots.txt で 12 種 Allow
- **CMS 反映**: `data-cms="settings.<キー>"` 属性方式 + `bindCmsSlots()` で 15+ 箇所に反映
- **ページローダー**: 700ms 最低表示、fetch 完了で fade-out
- **モバイル横スクロール**: menu / reviews / blog / scenes / cards すべて 600px 以下でカルーセル化

---

## デプロイ情報（2026-09-13 反映）

- **GAS Script ID**: `1v6IIV-E4jFezplVI9QAuq5ZbNK_Tl92shKgPiQ3EC0TjgMM9YsU7c2zk`
- **Spreadsheet ID**: `13lKVRYGt8lYtYqsdLanAfz-f-QrO_wERqQSebU214DE`
- **GAS Web App URL**: `https://script.google.com/macros/s/AKfycbxe8NzPOyOwqPrWUjbeFAVYC2fz-RUAPBlN8lAOg1dT_6zwpu6jCz7_k5JbNskWSDK8PA/exec`
- **Editor**: https://script.google.com/d/1v6IIV-E4jFezplVI9QAuq5ZbNK_Tl92shKgPiQ3EC0TjgMM9YsU7c2zk/edit
- **Sheet**: https://docs.google.com/spreadsheets/d/13lKVRYGt8lYtYqsdLanAfz-f-QrO_wERqQSebU214DE/edit
