'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function OnlineToggle({ shopId, initialOnline }: { shopId: string; initialOnline: boolean }) {
  const [online, setOnline] = useState(initialOnline);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !online;
    setOnline(next);
    const { error } = await createClient().from('shops').update({ is_online: next }).eq('id', shopId);
    if (error) setOnline(!next); // reverte se a atualização falhar
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={
        'flex items-center gap-2 rounded-full px-3.5 py-2 font-head text-xs font-extrabold uppercase tracking-[0.5px] transition-colors ' +
        (online ? 'bg-lime text-ink' : 'bg-g100 text-g600')
      }
    >
      <span className={'h-2 w-2 rounded-full ' + (online ? 'animate-pulse bg-success' : 'bg-g400')} />
      {online ? 'Online' : 'Offline'}
    </button>
  );
}
