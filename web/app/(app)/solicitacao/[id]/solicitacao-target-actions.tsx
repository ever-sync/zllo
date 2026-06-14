'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SolicitacaoTargetActions({
  requestId,
  targetStatus,
  unavailable,
}: {
  requestId: string;
  targetStatus: string | null;
  unavailable: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId || unavailable) return;
    if (targetStatus === 'pendente') {
      void supabase.rpc('mark_target_viewed', { p_request_id: requestId });
    }
  }, [requestId, targetStatus, unavailable, supabase]);

  const decline = async () => {
    if (!window.confirm('Recusar esta solicitação? Ela sairá do seu feed de orçamentos.')) return;
    setDeclining(true);
    setError(null);
    const { error: rpcErr } = await supabase.rpc('decline_target', { p_request_id: requestId });
    setDeclining(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    router.push('/operacao');
    router.refresh();
  };

  if (unavailable || !targetStatus || ['orcou', 'recusou', 'expirou'].includes(targetStatus)) {
    return null;
  }

  return (
    <div className="mt-4">
      {error ? <p className="mb-2 text-sm text-[#B91C1C]">{error}</p> : null}
      <button
        type="button"
        onClick={() => void decline()}
        disabled={declining}
        className="w-full rounded-xl border border-[#FECACA] bg-[#FEE2E2] py-3 font-head text-sm font-bold text-[#B91C1C] disabled:opacity-60"
      >
        {declining ? 'Recusando…' : 'Recusar solicitação'}
      </button>
    </div>
  );
}
