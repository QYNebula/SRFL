// src/pages/api/discord-verify.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // ✅ 先从 Authorization header 拿（最稳）
    const auth = request.headers.get('authorization') || '';
    const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    // ✅ 再尝试从 JSON body 拿（作为兜底）
    const body = await request.json().catch(() => null);
    const bodyToken = body?.access_token;

    const access_token = headerToken || bodyToken;

    if (!access_token || typeof access_token !== 'string') {
    return new Response('MISSING_TOKEN', { status: 400 });
    }


    // 1) 用 access_token 让 Supabase 验证这个用户是谁
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(access_token);
    const user = userRes?.user;

    if (userErr || !user) {
      return new Response('INVALID_SESSION', { status: 401 });
    }

    // 2) 从 user 里拿 Discord 用户 ID（优先 provider_id；不依赖 username/displayname）
    const discordUserId =
      // Supabase Discord 通常会放在 user_metadata.provider_id
      (user.user_metadata && (user.user_metadata.provider_id || user.user_metadata.sub)) ||
      // 有些情况下 identities 里能拿到
      ((user.identities || []).find((i) => i.provider === 'discord')?.id ?? '') ||
      '';

    if (!discordUserId) {
      return new Response('DISCORD_ID_NOT_FOUND', { status: 401 });
    }

    // 3) 查白名单
    const { data: row, error: wlErr } = await supabaseAdmin
      .from('admin_whitelist')
      .select('discord_user_id, role')
      .eq('discord_user_id', discordUserId)
      .maybeSingle();

    if (wlErr) {
      return new Response('WHITELIST_QUERY_FAILED', { status: 500 });
    }
    if (!row) {
      return new Response('NOT_ALLOWED', { status: 403 });
    }

    // 4) 白名单通过 -> 写入你原来的 cookie（保持原有逻辑不变）
    cookies.set('admin_session', 'verified', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      // 本地 http 不要设置 secure；上线 https 再加 secure: true
    });

    return new Response('OK', { status: 200 });
  } catch {
    return new Response('SERVER_ERROR', { status: 500 });
  }
};
