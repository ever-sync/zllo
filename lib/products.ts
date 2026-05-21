/** Marketplace — tipos e helpers de produtos (app cliente). */

export type BrowseProduct = {
  id: string;
  shop_id: string;
  shop_name: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  photos: string[];
  distance_m: number | null;
};

/** Categorias sugeridas (espelha o console web). */
export const CATEGORIES = [
  'Película',
  'Capinha',
  'Carregador',
  'Cabo',
  'Fone',
  'Bateria',
  'Tela',
  'Acessório',
  'Aparelho',
  'Outro',
] as const;

/** Preço em reais com centavos: 29.9 → "R$ 29,90". */
export function priceBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Distância em metros → "264 m" / "1,2 km" (null se desconhecida). */
export function distanceLabel(meters: number | null | undefined): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
