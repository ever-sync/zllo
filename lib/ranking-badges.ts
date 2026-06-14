export type RegionalRankRow = {
  id: string;
  name: string;
  rating: number;
  reviews_count: number;
  distance_km: number;
  rank_position: number;
  badge: string | null;
};

const BADGE_META: Record<string, { label: string; bg: string; fg: string }> = {
  top_regiao: { label: '🏆 Top da região', bg: '#D4F520', fg: '#1E3A8A' },
  elite: { label: '★ Elite', bg: '#EEEEFF', fg: '#1E3A8A' },
  experiente: { label: '✓ Experiente', bg: '#F3F4F6', fg: '#4B5563' },
};

export function rankBadge(badge: string | null) {
  if (!badge) return null;
  return BADGE_META[badge] ?? null;
}
