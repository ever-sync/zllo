/** Utilitários de IMEI (15 dígitos + dígito verificador Luhn). */

export function imeiDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/** Valida 15 dígitos com checksum de Luhn (mesma regra do trigger no banco). */
export function isValidImei(input: string): boolean {
  const d = imeiDigits(input);
  if (d.length !== 15) return false;
  let sum = 0;
  let dbl = false;
  for (let i = 14; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}
