'use client';

import { timeLeft } from '@/lib/time';
import { useNow } from '@/lib/use-now';

/** Badge de contagem regressiva (urgente em vermelho, senão âmbar). */
export function Countdown({ respondsBy }: { respondsBy: string }) {
  const now = useNow(1000);
  const t = timeLeft(respondsBy, now);

  if (t.expired) {
    return (
      <span className="inline-flex items-center rounded-md bg-g100 px-2 py-1 font-head text-xs font-bold text-g600">
        Expirado
      </span>
    );
  }

  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-md px-2 py-1 font-head text-xs font-bold ' +
        (t.urgent ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF3C7] text-[#B45309]')
      }
    >
      ⏱ {t.label}
    </span>
  );
}
