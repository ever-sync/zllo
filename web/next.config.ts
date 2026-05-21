import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Este app vive em web/ dentro do repo do mobile (que tem seu próprio
  // lockfile). Fixa a raiz aqui para o Turbopack não inferir o diretório errado.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
