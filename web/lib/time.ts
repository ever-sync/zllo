/**
 * Utilidades de tempo puras (sem React) — seguras em Server e Client Components.
 * O hook useNow vive em lib/use-now.ts (só client).
 */

/** Rótulo de contagem regressiva (mm:ss) até `respondsBy`. */
export function timeLeft(
  respondsBy: string,
  now: number,
): { label: string; expired: boolean; urgent: boolean } {
  const diff = new Date(respondsBy).getTime() - now;
  if (diff <= 0) return { label: 'Expirado', expired: true, urgent: false };
  const totalSec = Math.floor(diff / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return {
    label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    expired: false,
    urgent: totalSec < 120,
  };
}

/** Distância em metros → "1,2 km" / "800 m". */
export function distanceLabel(meters: number | null | undefined): string {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
