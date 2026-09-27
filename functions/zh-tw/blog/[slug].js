/* Cloudflare Pages Function: /zh-tw/blog/{slug}/ — 繁體中文 blog SSR (auto-translated)
 * 実装は functions/_lib/blog-ssr.js
 */
import { handleBlog } from '../../_lib/blog-ssr.js';

export const onRequest = (context) => handleBlog(context, 'zh');
