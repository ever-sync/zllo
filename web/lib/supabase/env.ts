/**
 * Credenciais públicas do Supabase lidas em RUNTIME.
 *
 * Por que não usar `process.env.NEXT_PUBLIC_*` direto: o Next substitui essas
 * referências por valores literais durante o `next build` ("inlining"). O
 * Railway não expõe as variáveis para o passo de build (só para o runtime),
 * então o bundle ficava com `undefined` gravado e o cliente Supabase quebrava.
 *
 * Aqui a chave é lida de forma DINÂMICA (`process.env[name]`), o que o Next não
 * consegue substituir no build:
 *  - no servidor (Node, em runtime) cai no `process.env` real;
 *  - no browser cai no `window.__ENV`, injetado pelo root layout.
 */

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

// Chave dinâmica → não é "assada" no build; no servidor retorna o valor real.
function fromProcess(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
}

function fromWindow(name: string): string | undefined {
  if (typeof window !== 'undefined') {
    return (window as { __ENV?: Record<string, string> }).__ENV?.[name];
  }
  return undefined;
}

function read(name: string): string {
  return fromProcess(name) ?? fromWindow(name) ?? '';
}

export function supabaseUrl(): string {
  return read(URL_KEY);
}

export function supabaseAnonKey(): string {
  return read(ANON_KEY);
}

/**
 * String do `<script>` que publica as credenciais públicas em `window.__ENV`.
 * Renderizada pelo root layout (server component) → roda no runtime do servidor,
 * então pega os valores reais e os entrega ao browser antes da hidratação.
 */
export function publicEnvScript(): string {
  const env = { [URL_KEY]: supabaseUrl(), [ANON_KEY]: supabaseAnonKey() };
  // `</script>` no JSON quebraria a tag; escapa o `<`.
  return `window.__ENV=${JSON.stringify(env).replace(/</g, '\\u003c')}`;
}
