/* Cloudflare Pages Function: /en/blog/{slug}/ — English blog SSR (auto-translated)
 * 実装は functions/_lib/blog-ssr.js
 */
import { handleBlog } from '../../_lib/blog-ssr.js';

export const onRequest = (context) => handleBlog(context, 'en');
