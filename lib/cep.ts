/** Utilidades de CEP (BR) + busca de endereço no ViaCEP. */

import { onlyDigits } from './cpf';

/** Formata como 00000-000 enquanto digita. */
export function formatCEP(value: string): string {
  return onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

/** CEP tem 8 dígitos. */
export function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8;
}

export type CepAddress = {
  street: string;
  neighborhood: string;
  city: string;
  uf: string;
};

/** Busca endereço pelo CEP no ViaCEP. Retorna null se inválido/indisponível. */
export async function fetchAddressByCEP(cep: string): Promise<CepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      uf: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
