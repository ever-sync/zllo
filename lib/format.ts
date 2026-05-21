/** Tipo mínimo de aparelho para exibição (apelido + marca/modelo). */
export type DeviceLike = {
  nickname?: string | null;
  brand?: string | null;
  model?: string | null;
} | null | undefined;

/**
 * Nome de exibição de um aparelho: apelido se houver, senão "marca modelo",
 * senão o fallback. Centraliza a lógica que estava repetida em ~6 telas.
 */
export function getDeviceName(device: DeviceLike, fallback = 'Aparelho'): string {
  if (!device) return fallback;
  const composed = `${device.brand ?? ''} ${device.model ?? ''}`.trim();
  return device.nickname || composed || fallback;
}
