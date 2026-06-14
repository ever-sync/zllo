import { ClientShell } from '../client-shell';
import { EsqueciSenhaForm } from './esqueci-senha-form';

export default function ClienteEsqueciSenhaPage() {
  return (
    <ClientShell>
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="font-head text-2xl font-extrabold text-ink">Recuperar senha</h1>
        <p className="mt-1 text-sm text-g600">Enviaremos um link de redefinição para o seu e-mail.</p>
        <div className="mt-6">
          <EsqueciSenhaForm />
        </div>
      </div>
    </ClientShell>
  );
}
