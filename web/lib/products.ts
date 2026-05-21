/** Contrato compartilhado de produtos do marketplace. */

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  photos: string[];
  is_active: boolean;
  created_at: string;
};

export const PRODUCT_SELECT =
  'id, name, description, category, price, stock, photos, is_active, created_at';

/** Categorias sugeridas (texto livre no banco). */
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
export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
