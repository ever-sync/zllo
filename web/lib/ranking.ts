export type RegionalRankRow = {
  id: string;
  name: string;
  rating: number;
  reviews_count: number;
  distance_km: number;
  rank_position: number;
  badge: string | null;
};

const BADGE_META: Record<string, { label: string; cls: string }> = {
  top_regiao: { label: '🏆 Top da região', cls: 'bg-lime text-ink' },
  elite: { label: '★ Elite', cls: 'bg-[#EEEEFF] text-blue' },
  experiente: { label: '✓ Experiente', cls: 'bg-g100 text-g600' },
};

export function rankBadge(badge: string | null) {
  if (!badge) return null;
  return BADGE_META[badge] ?? null;
}
