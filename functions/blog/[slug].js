/* Cloudflare Pages Function: /blog/{slug}/ — 日本語ブログ詳細 SSR
 * 実装は functions/_lib/blog-ssr.js（EN / 繁中と共通）
 */
import { handleBlog } from '../_lib/blog-ssr.js';

export const onRequest = (context) => handleBlog(context, 'ja');
