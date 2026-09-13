/* Cloudflare Pages Function
   /sitemap.xml → GAS ?sitemap=1 に投げて XML を返す。
   edge cache 1h。GAS の /exec は 302 で /usercontent にリダイレクトするので
   redirect: 'follow' 必須。
*/
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxe8NzPOyOwqPrWUjbeFAVYC2fz-RUAPBlN8lAOg1dT_6zwpu6jCz7_k5JbNskWSDK8PA/exec';

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(context.request.url).toString(), context.request);
  let response = await cache.match(cacheKey);
  if (response) return response;

  try {
    const upstream = await fetch(GAS_URL + '?sitemap=1', { redirect: 'follow' });
    const xml = await upstream.text();
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
    return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
