/** Geocoding de endereço por CEP — coordenadas sem precisar de permissão. */

export type Coords = { lat: number; lng: number };

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

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

export function formatProfileAddress(profile: {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
}): string | null {
  if (!profile.street || !profile.city) return null;
  const linha1 = [profile.street, profile.number].filter(Boolean).join(', ');
  const local = profile.uf ? `${profile.city}/${profile.uf}` : profile.city;
  return [linha1, profile.complement, profile.neighborhood, local].filter(Boolean).join(' · ');
}

async function getBrowserCoords(): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}

const FALLBACK = { lat: -23.5614, lng: -46.6559 };

export async function resolveRequestLocation(opts: {
  source: 'cadastrado' | 'atual';
  profile: {
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    uf?: string | null;
  } | null;
}): Promise<{ lat: number; lng: number; address: string | null; error?: string }> {
  if (opts.source === 'cadastrado' && opts.profile?.cep) {
    const geo = await geocodeCEP(opts.profile.cep);
    if (!geo) {
      return { lat: FALLBACK.lat, lng: FALLBACK.lng, address: null, error: 'Não consegui localizar seu endereço cadastrado. Use "Localização atual".' };
    }
    return { ...geo, address: formatProfileAddress(opts.profile) };
  }

  const gps = await getBrowserCoords();
  if (gps) return { ...gps, address: null };
  return { ...FALLBACK, address: null };
}
