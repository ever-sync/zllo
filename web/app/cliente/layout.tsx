import { ClienteProviders } from './providers';

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return <ClienteProviders>{children}</ClienteProviders>;
}
