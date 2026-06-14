import Link from 'next/link';
import { EsqueciSenhaForm } from '../../cliente/esqueci-senha/esqueci-senha-form';

export default function ShopEsqueciSenhaPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-head text-2xl font-extrabold text-ink">Recuperar senha</h1>
      <p className="mt-1 text-sm text-g600">Enviaremos um link de redefinição para o seu e-mail.</p>
      <div className="mt-6">
        <EsqueciSenhaForm />
      </div>
      <Link href="/login" className="mt-4 text-center text-sm font-semibold text-blue">
        Voltar ao login da assistência
      </Link>
    </div>
  );
}
