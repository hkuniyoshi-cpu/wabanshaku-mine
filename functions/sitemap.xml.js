/* Cloudflare Pages Function
   /sitemap.xml → GAS ?sitemap=1 に投げて XML を返す。
   edge cache 1h。GAS の /exec は 302 で /usercontent にリダイレクトするので
   redirect: 'follow' 必須。
   GAS 障害時（403/500・HTML エラーページ・通信例外）は 503 + Retry-After を返し、
   壊れた内容や空の sitemap を 200 でキャッシュしない。
*/
import { GAS_URL } from './_lib/blog-ssr.js';

function unavailable() {
  return new Response('sitemap temporarily unavailable', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600', 'Cache-Control': 'no-store' },
  });
}

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(context.request.url).toString(), context.request);
  let response = await cache.match(cacheKey);
  if (response) return response;

  try {
    const upstream = await fetch(GAS_URL + '?sitemap=1', { redirect: 'follow' });
    const xml = await upstream.text();
    if (!upstream.ok || xml.indexOf('<urlset') === -1) return unavailable();
    response = new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (e) {
    return unavailable();
  }
}
