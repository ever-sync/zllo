/** Extrai lat/lng de geography/GeoJSON retornado pelo Supabase. */
export function parseShopLocation(loc: unknown): { lat: number; lng: number } | null {
  if (!loc) return null;
  if (typeof loc === 'object' && loc !== null && 'coordinates' in loc) {
    const coords = (loc as { coordinates?: number[] }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lat: coords[1], lng: coords[0] };
    }
  }
  if (typeof loc === 'string') {
    try {
      return parseShopLocation(JSON.parse(loc));
    } catch {
      return null;
    }
  }
  return null;
}

export const SHOP_LOCATION_FALLBACK = { lat: -23.5614, lng: -46.6559 };
