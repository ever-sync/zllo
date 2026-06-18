/** Endereço estruturado para Uber Direct e checkout. */

export type DeliveryAddress = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
  cep?: string | null;
};

export function formatDeliveryAddress(p: DeliveryAddress): string {
  const linha1 = [p.street, p.number].filter(Boolean).join(', ');
  const local = p.uf ? `${p.city}/${p.uf}` : p.city;
  return [linha1, p.complement, p.neighborhood, local, p.cep].filter(Boolean).join(' · ');
}

export function isDeliveryAddressComplete(p: DeliveryAddress): boolean {
  return Boolean(
    p.street?.trim() &&
      p.number?.trim() &&
      p.city?.trim() &&
      p.uf?.trim() &&
      (p.cep?.replace(/\D/g, '').length ?? 0) >= 8,
  );
}

export function deliveryAddressFromProfile(p: {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
  cep?: string | null;
} | null): DeliveryAddress {
  if (!p) return {};
  return {
    street: p.street,
    number: p.number,
    complement: p.complement,
    neighborhood: p.neighborhood,
    city: p.city,
    uf: p.uf,
    cep: p.cep,
  };
}
