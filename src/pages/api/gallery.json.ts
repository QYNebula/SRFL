export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('homepage_gallery')
      .select('url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message, urls: [] }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const urls = (data || [])
      .map((r: any) => (r?.url || '').toString())
      .filter((u: string) => u.length > 0);

    return new Response(JSON.stringify({ ok: true, urls }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // 不要缓存，否则你新增/删除图片后首页可能不更新
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'UNKNOWN', urls: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
