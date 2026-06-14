import { ClientShell } from '../client-shell';
import { CarrinhoClient } from './carrinho-client';

export default function CarrinhoPage() {
  return (
    <ClientShell>
      <CarrinhoClient />
    </ClientShell>
  );
}
