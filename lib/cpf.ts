/** Utilidades de CPF e telefone (BR). */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Valida CPF pelos dígitos verificadores (não consulta a Receita). */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const digit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += parseInt(cpf[i], 10) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === parseInt(cpf[9], 10) && digit(10) === parseInt(cpf[10], 10);
}

/** Formata como 000.000.000-00 enquanto digita. */
export function formatCPF(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Valida telefone BR (10 ou 11 dígitos com DDD). */
export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 10 || d.length === 11;
}

/** Formata como (11) 91234-5678 enquanto digita. */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a && `(${a}`, a.length === 2 ? ') ' : '', b, c && `-${c}`].join(''),
    );
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? `-${c}` : ''}`);
}
