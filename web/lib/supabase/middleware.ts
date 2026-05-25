import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { supabaseAnonKey, supabaseUrl } from './env';

/**
 * Revalida a sessão (refresh de token) e barra acesso não autenticado.
 * Chamado pelo `proxy.ts` (em Next 16 o antigo `middleware` virou `proxy`).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // NÃO remover: revalida o token. getClaims valida a assinatura do JWT
  // (recomendado pela doc; nunca confiar em getSession no servidor).
  const { data } = await supabase.auth.getClaims();
  const authed = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/auth');

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
