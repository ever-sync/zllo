import type { Metadata } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import "./globals.css";
import { publicEnvScript } from "@/lib/supabase/env";

// As credenciais públicas do Supabase são lidas em runtime (o Railway não as
// injeta no build). Forçar render dinâmico garante que o <script> abaixo pegue
// os valores reais do servidor a cada request, e não o vazio do build.
export const dynamic = "force-dynamic";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dmsans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "zllo · Console da loja",
  description: "Painel da assistência — pedidos, orçamentos e ordens de serviço.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${dmSans.variable} antialiased`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Publica as credenciais públicas em window.__ENV antes da hidratação,
            para o cliente Supabase do browser as ler em runtime. */}
        <script dangerouslySetInnerHTML={{ __html: publicEnvScript() }} />
        {children}
      </body>
    </html>
  );
}
