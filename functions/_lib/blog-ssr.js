/* 和晩酌 嶺 — ブログ詳細 SSR 共通モジュール
 *
 *   /blog/{slug}/        日本語（Sheets 原文）
 *   /en/blog/{slug}/     英語（GAS ?blog_one=&lang=en → OpenAI 翻訳・blog_i18n シート保存）
 *   /zh-tw/blog/{slug}/  繁体字（同 lang=zh）
 *
 * 3 言語は hreflang で相互リンク。訳文は GAS の 30 分トリガーで事前生成され、
 * サイトマップにも訳文がある記事だけ載る。万一未翻訳の時は日本語原文を表示しつつ
 * HTTP 503 + Retry-After を返す（noindex は付けない → Google は一時的と判断して後で再訪、
 * 訳文ができ次第そのままインデックスされる。訪問者には本文が普通に見える）。
 *
 * GAS_URL は functions 配下ではここ 1 か所だけ。GAS 新デプロイ時は index.html ×3 とここを差し替え。
 */

export const GAS_URL  = 'https://script.google.com/macros/s/AKfycbw59goi8aqgNHX0beXSzgf0n2L-6sBkLqoI5GlUgewN8WeG2Fht8APRZ7KlKZpTzUP1aw/exec';
export const SITE_URL = 'https://wabanshaku-mine.search-mania.net';

const LANGS = {
  ja: {
    htmlLang: 'ja', ogLocale: 'ja_JP', prefix: '', gas: null,
    store: '和晩酌 嶺', storeAlt: 'Wa Banshaku Mine',
    back: '← トップへ戻る', reserve: 'ご予約はこちら',
    reserveUrl: 'https://www.tablecheck.com/ja/shops/wabanshaku-mine/reserve?utm_source=searchmania',
    untitled: (d) => d ? `${d} の投稿` : 'お知らせ',
    nfTitle: '記事が見つかりません',
    nfText: '指定された記事は削除されたか、URL が正しくない可能性があります。',
    errTitle: '一時的なエラー',
    pending: '',
    font: 'Shippori+Mincho:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700',
    serif: "'Shippori Mincho',serif", sans: "'Zen Kaku Gothic New','Hiragino Sans',sans-serif",
  },
  en: {
    htmlLang: 'en', ogLocale: 'en_US', prefix: '/en', gas: 'en',
    store: 'Wa Banshaku Mine', storeAlt: '和晩酌 嶺',
    back: '← Back to top', reserve: 'Reserve a table',
    reserveUrl: 'https://www.tablecheck.com/en/shops/wabanshaku-mine/reserve?utm_source=searchmania',
    untitled: (d) => d ? `Post of ${d}` : 'News',
    nfTitle: 'Article not found',
    nfText: 'This article may have been removed, or the URL may be incorrect.',
    errTitle: 'Temporary error',
    pending: 'The English translation is being prepared. Showing the original Japanese for now.',
    font: 'Shippori+Mincho:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700',
    serif: "'Shippori Mincho',Georgia,serif", sans: "'Zen Kaku Gothic New',system-ui,sans-serif",
  },
  zh: {
    htmlLang: 'zh-TW', ogLocale: 'zh_TW', prefix: '/zh-tw', gas: 'zh',
    store: '和晚酌 嶺', storeAlt: 'Wa Banshaku Mine',
    back: '← 返回首頁', reserve: '線上訂位',
    reserveUrl: 'https://www.tablecheck.com/zh-TW/shops/wabanshaku-mine/reserve?utm_source=searchmania',
    untitled: (d) => d ? `${d} 的貼文` : '最新消息',
    nfTitle: '找不到文章',
    nfText: '此文章可能已被刪除，或網址有誤。',
    errTitle: '暫時性錯誤',
    pending: '中文翻譯準備中，目前先顯示日文原文。',
    font: 'Noto+Serif+TC:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700',
    serif: "'Noto Serif TC',serif", sans: "'Noto Sans TC','PingFang TC',sans-serif",
  },
};

const SWITCH = [
  { key: 'ja', label: '日本語', prefix: '' },
  { key: 'en', label: 'EN',     prefix: '/en' },
  { key: 'zh', label: '繁中',   prefix: '/zh-tw' },
];

export async function handleBlog(context, langKey) {
  const L = LANGS[langKey];
  const slug = context.params.slug;
  const home = SITE_URL + L.prefix + '/';
  if (!slug) return Response.redirect(home, 302);

  try {
    // 1) 日本語原文（存在確認 + ja 表示用）
    const upstream = await fetch(GAS_URL + '?blog_all=1&v=2', {
      redirect: 'follow',
      cf: { cacheTtl: 900, cacheEverything: true },
    });
    if (!upstream.ok) return html(renderError(L, 'CMS upstream ' + upstream.status), 502);
    const data = await upstream.json();
    const decoded = decodeURIComponent(slug);
    let post = findPost((data && data.blog) || [], decoded);
    if (!post) return html(renderNotFound(L, home), 404);

    // 2) 翻訳版（EN / 繁）
    let translated = true;
    if (L.gas) {
      translated = false;
      try {
        const tr = await fetch(GAS_URL + '?blog_one=' + encodeURIComponent(decoded) + '&lang=' + L.gas + '&v=2', {
          redirect: 'follow',
          cf: { cacheTtl: 3600, cacheEverything: true },
          signal: AbortSignal.timeout(25000), // 初回翻訳が詰まったら原文フォールバック
        });
        if (tr.ok) {
          const j = await tr.json();
          if (j && j.post && j.translated) {
            post = Object.assign({}, post, { title: j.post.title, body: j.post.body });
            translated = true;
          }
        }
      } catch (_) { /* 原文フォールバック */ }
    }

    if (!translated) {
      return html(renderPost(L, langKey, post, decoded, false), 503, {
        'Retry-After': '1800',
        'Cache-Control': 'no-store',
      });
    }
    return html(renderPost(L, langKey, post, decoded, true), 200, {
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    });
  } catch (err) {
    return html(renderError(L, String((err && err.message) || err)), 500);
  }
}

function html(body, status, extraHeaders) {
  const headers = Object.assign({
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  }, extraHeaders || {});
  return new Response(body, { status: status || 200, headers });
}

// スラッグ規則は index.html の applyBlog / GAS _blogSlug_ と同一
function slugOf(p) {
  let s = '';
  if (p.url) {
    const raw = String(p.url).trim().replace(/\/+$/, '');
    const m = raw.match(/\/blog\/([^\/\?#]+)/);
    s = m ? m[1] : raw.split('/').pop();
  }
  return s || p.date || '';
}

function findPost(posts, slug) {
  for (const p of posts) {
    if (p && slugOf(p) === slug) return p;
  }
  for (const p of posts) {
    if (p && p.date === slug) return p;
  }
  return null;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(s) {
  if (!s) return '';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : String(s);
}

function extractTitle(L, post) {
  if (post.title && String(post.title).trim()) return String(post.title).trim();
  if (post.body) {
    const first = String(post.body).split(/[。\n]|\.\s/)[0].trim();
    if (first) return first.length > 60 ? first.slice(0, 60) + '…' : first;
  }
  return L.untitled(fmtDate(post.date));
}

function toImageUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  const m1 = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w1200`;
  if (s.indexOf('drive.google.com/thumbnail') !== -1) return s.replace(/([?&])sz=[^&]*/, '$1sz=w1200');
  return s;
}

function renderPost(L, langKey, post, slug, translated) {
  let title = extractTitle(L, post);
  let bodyRaw = String(post.body || '');
  // Make 自動投稿は C列タイトル空・本文 1 行目が見出し → H1 に昇格し本文から除去（重複表示防止）
  if (!(post.title && String(post.title).trim())) {
    const lines = bodyRaw.split('\n');
    const first = (lines[0] || '').trim();
    if (first && first.length <= 80) {
      title = first;
      bodyRaw = lines.slice(1).join('\n').replace(/^\s+/, '');
    }
  }
  const desc = (bodyRaw || title).replace(/\s+/g, ' ').slice(0, 160);
  const imgUrl = toImageUrl(post.image);
  const date = post.date || '';
  const s = encodeURIComponent(slug);
  const urlFor = (prefix) => `${SITE_URL}${prefix}/blog/${s}/`;
  const canonical = urlFor(L.prefix);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': title,
    'description': desc,
    'datePublished': date,
    'inLanguage': L.htmlLang,
    'url': canonical,
    'mainEntityOfPage': { '@type': 'WebPage', '@id': canonical },
    'publisher': {
      '@type': 'Organization',
      'name': L.store,
      'alternateName': L.storeAlt,
      'url': SITE_URL + L.prefix + '/',
      'logo': { '@type': 'ImageObject', 'url': SITE_URL + '/favicon.svg' },
    },
    'author': { '@type': 'Organization', 'name': L.store, 'url': SITE_URL + L.prefix + '/' },
  };
  if (imgUrl) jsonLd.image = imgUrl;
  if (langKey !== 'ja') jsonLd.translationOfWork = { '@id': urlFor('') };

  const ogImg = imgUrl || `${SITE_URL}/ogp.png`;
  const switcher = SWITCH.map((x) => x.key === langKey
    ? `<span aria-current="true">${x.label}</span>`
    : `<a href="${urlFor(x.prefix)}" hreflang="${LANGS[x.key].htmlLang}" lang="${LANGS[x.key].htmlLang}">${x.label}</a>`
  ).join('<span class="sep" aria-hidden="true">/</span>');

  return `<!DOCTYPE html>
<html lang="${L.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0C0A08">
<meta http-equiv="content-language" content="${L.htmlLang}">
<title>${esc(title)} | ${esc(L.store)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" hreflang="ja" href="${urlFor('')}">
<link rel="alternate" hreflang="en" href="${urlFor('/en')}">
<link rel="alternate" hreflang="zh-TW" href="${urlFor('/zh-tw')}">
<link rel="alternate" hreflang="x-default" href="${urlFor('')}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(L.store)}">
<meta property="og:locale" content="${L.ogLocale}">
${SWITCH.filter((x) => x.key !== langKey).map((x) => `<meta property="og:locale:alternate" content="${LANGS[x.key].ogLocale}">`).join('\n')}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">

<link rel="icon" href="/favicon.svg">
<link rel="apple-touch-icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${L.font}&display=swap" rel="stylesheet">

<style>
:root{--ink:#0C0A08;--paper:#E8DFC8;--muted:#B4A886;--card:#1a1815;--gold:#C9A860}
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow-x:clip}
body{background:var(--ink);color:var(--paper);font-family:${L.sans};line-height:1.85;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
a:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
header{background:var(--paper);padding:14px 20px;position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px}
header .brand{color:var(--ink);text-decoration:none;font-size:17px;letter-spacing:.2em;font-family:${L.serif};font-weight:600;white-space:nowrap}
.lang{display:flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.08em;white-space:nowrap}
.lang a{color:var(--ink);opacity:.55;text-decoration:none}
.lang a:hover{opacity:1}
.lang [aria-current]{color:var(--ink);font-weight:700}
.lang .sep{color:var(--ink);opacity:.3}
.wrap{max-width:720px;margin:60px auto;padding:0 24px 80px}
article.card{background:var(--card);border-radius:4px;overflow:hidden;box-shadow:0 6px 28px rgba(0,0,0,.12)}
article.card img{width:100%;display:block;max-height:480px;object-fit:cover}
.card-body{padding:36px 38px 44px}
.notice{font-size:12px;color:var(--gold);border:1px solid rgba(201,168,96,.4);padding:10px 14px;margin-bottom:22px;line-height:1.7}
.date{font-size:12px;color:var(--muted);letter-spacing:.24em;display:block}
h1{margin:14px 0 28px;font-size:22px;line-height:1.7;font-weight:600;font-family:${L.serif};color:var(--paper);letter-spacing:.04em;overflow-wrap:anywhere}
.text{font-size:15px;line-height:2.05;white-space:pre-wrap;color:var(--muted);overflow-wrap:anywhere}
.actions{margin-top:52px;display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.btn{display:inline-block;padding:14px 36px;border:1.5px solid var(--paper);color:var(--paper);text-decoration:none;border-radius:2px;font-size:13px;letter-spacing:.2em;font-family:${L.serif};white-space:nowrap;transition:background .35s ease,color .35s ease}
.btn:hover{background:var(--paper);color:var(--ink)}
.btn.gold{border-color:var(--gold);color:var(--gold)}
.btn.gold:hover{background:var(--gold);color:var(--ink)}
.produced-by{text-align:center;margin-top:64px;font-size:11px;letter-spacing:.24em;color:var(--muted);opacity:.6}
.produced-by a{color:var(--gold);text-decoration:none}
@media (max-width:600px){.wrap{margin:30px auto;padding:0 16px 60px}.card-body{padding:26px 22px 32px}h1{font-size:19px;margin:12px 0 22px}.text{font-size:14.5px;line-height:1.95}header{padding:12px 16px}header .brand{font-size:14px;letter-spacing:.14em}.lang{font-size:11px;gap:6px}.btn{padding:13px 26px;font-size:12px}}
</style>

<script type="application/ld+json">
${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}
</script>
</head>
<body>

<header>
  <a class="brand" href="${SITE_URL}${L.prefix}/">${esc(L.store)}</a>
  <nav class="lang" aria-label="Language">${switcher}</nav>
</header>

<main class="wrap">
  <article class="card">
    ${imgUrl ? `<img src="${esc(imgUrl)}" alt="${esc(title)}" loading="eager">` : ''}
    <div class="card-body">
      ${translated ? '' : `<p class="notice">${L.pending}</p>`}
      ${date ? `<time class="date" datetime="${esc(date)}">${esc(fmtDate(date))}</time>` : ''}
      <h1>${esc(title)}</h1>
      <p class="text">${esc(bodyRaw)}</p>
    </div>
  </article>
  <div class="actions">
    <a class="btn gold" href="${L.reserveUrl}" target="_blank" rel="noopener">${L.reserve}</a>
    <a class="btn" href="${SITE_URL}${L.prefix}/">${L.back}</a>
  </div>
  <div class="produced-by">
    Produced by <a href="https://search-mania.net/" target="_blank" rel="noopener noreferrer">SearchMania Inc.</a>
  </div>
</main>

</body>
</html>`;
}

function renderNotFound(L, home) {
  return `<!DOCTYPE html>
<html lang="${L.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(L.nfTitle)} | ${esc(L.store)}</title>
<meta name="robots" content="noindex,follow">
<link rel="icon" href="/favicon.svg">
<style>
body{background:#0C0A08;color:#E8DFC8;font-family:${L.sans};text-align:center;padding:120px 24px}
h1{font-family:${L.serif};font-size:24px;margin-bottom:16px}
p{color:#B4A886;font-size:14px;margin-bottom:36px;line-height:1.9}
a.back{display:inline-block;padding:14px 36px;border:1.5px solid #E8DFC8;color:#E8DFC8;text-decoration:none;font-size:13px;letter-spacing:.24em}
</style>
</head>
<body>
<h1>${esc(L.nfTitle)}</h1>
<p>${esc(L.nfText)}</p>
<a class="back" href="${home}">${L.back}</a>
</body>
</html>`;
}

function renderError(L, msg) {
  return `<!DOCTYPE html>
<html lang="${L.htmlLang}"><head><meta charset="UTF-8"><title>Error</title><meta name="robots" content="noindex,nofollow"></head>
<body style="font-family:sans-serif;padding:60px;text-align:center"><h1>${esc(L.errTitle)}</h1><p>${esc(msg)}</p><p><a href="${SITE_URL}${L.prefix}/">${L.back}</a></p></body></html>`;
}
