/** Campos de coleta da loja para Uber Direct. */
export type ShopPickup = {
  pickup_phone: string;
  pickup_street: string;
  pickup_number: string;
  pickup_cep: string;
  pickup_city: string;
  pickup_uf: string;
};

export const emptyShopPickup = (): ShopPickup => ({
  pickup_phone: '',
  pickup_street: '',
  pickup_number: '',
  pickup_cep: '',
  pickup_city: '',
  pickup_uf: '',
});

type ShopPickupRow = { [K in keyof ShopPickup]?: string | null };

export function shopPickupFromRow(row: ShopPickupRow | null | undefined): ShopPickup {
  return {
    pickup_phone: row?.pickup_phone ?? '',
    pickup_street: row?.pickup_street ?? '',
    pickup_number: row?.pickup_number ?? '',
    pickup_cep: row?.pickup_cep ?? '',
    pickup_city: row?.pickup_city ?? '',
    pickup_uf: row?.pickup_uf ?? '',
  };
}

export function shopPickupRpcArgs(pickup: ShopPickup) {
  const trim = (s: string) => s.trim();
  return {
    p_pickup_phone: trim(pickup.pickup_phone) || undefined,
    p_pickup_street: trim(pickup.pickup_street) || undefined,
    p_pickup_number: trim(pickup.pickup_number) || undefined,
    p_pickup_cep: trim(pickup.pickup_cep) || undefined,
    p_pickup_city: trim(pickup.pickup_city) || undefined,
    p_pickup_uf: trim(pickup.pickup_uf) || undefined,
  };
}
