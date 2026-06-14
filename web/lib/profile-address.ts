/** Endereço formatado a partir do perfil (checkout web). */
export type ProfileAddress = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
};

export function profileAddress(p: ProfileAddress | null | undefined): string {
  if (!p?.street) return '';
  const linha1 = [p.street, p.number].filter(Boolean).join(', ');
  const local = p.uf ? `${p.city}/${p.uf}` : p.city;
  return [linha1, p.complement, p.neighborhood, local].filter(Boolean).join(' · ');
}
