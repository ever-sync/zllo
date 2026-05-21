/** Geocoding de endereço por CEP — coordenadas sem precisar de permissão. */

import { onlyDigits } from './cpf';

export type Coords = { lat: number; lng: number };

/** Geocodifica um CEP em coordenadas (AwesomeAPI). Null se inválido/indisponível. */
export async function geocodeCEP(cep: string): Promise<Coords | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${digits}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lng?: string };
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}
