import Link from 'next/link';
import { TERMS_BODY, TERMS_TITLE } from '@/lib/legal-content';

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/cliente/login" className="text-sm font-semibold text-blue">
        ← Voltar
      </Link>
      <h1 className="mt-4 font-head text-2xl font-extrabold text-ink">{TERMS_TITLE}</h1>
      <pre className="mt-6 whitespace-pre-wrap font-body text-sm leading-relaxed text-g600">{TERMS_BODY}</pre>
    </div>
  );
}
