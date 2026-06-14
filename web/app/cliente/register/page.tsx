import { ClientShell } from '../client-shell';
import { RegisterForm } from './register-form';

export default function ClienteRegisterPage() {
  return (
    <ClientShell>
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <h1 className="font-head text-2xl font-extrabold text-ink">Criar conta</h1>
        <p className="mt-1 text-sm text-g600">Cadastro de cliente na zllo.</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
      </div>
    </ClientShell>
  );
}
