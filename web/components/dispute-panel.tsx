'use client';

import { useState } from 'react';

const DISPUTE_LABEL: Record<string, string> = {
  aberta: 'Disputa aberta',
  em_analise: 'Disputa em análise',
  resolvida: 'Disputa resolvida',
  recusada: 'Disputa recusada',
  cancelada: 'Disputa cancelada',
};

export type DisputeInfo = {
  id: string;
  status: string;
  reason: string;
  resolution: string | null;
};

export function DisputePanel({
  dispute,
  canOpen,
  onOpen,
}: {
  dispute: DisputeInfo | null;
  canOpen: boolean;
  onOpen: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (dispute && dispute.status !== 'recusada' && dispute.status !== 'cancelada') {
    return (
      <div className="rounded-2xl border border-line bg-white p-5">
        <p className="font-head text-sm font-bold text-ink">
          {DISPUTE_LABEL[dispute.status] ?? dispute.status}
        </p>
        <p className="mt-2 text-sm italic text-g600">“{dispute.reason}”</p>
        {dispute.resolution ? (
          <p className="mt-2 text-sm font-medium text-[#15803D]">Resolução: {dispute.resolution}</p>
        ) : null}
      </div>
    );
  }

  if (!canOpen) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 text-sm font-semibold text-g600 underline underline-offset-2"
      >
        Tive um problema — abrir disputa
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="font-head text-sm font-bold text-ink">Abrir disputa</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Descreva o que aconteceu…"
        className="mt-3 w-full resize-none rounded-xl border border-line p-3 text-sm outline-none focus:border-blue"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void (async () => {
            if (reason.trim().length < 5) {
              alert('Descreva o motivo com mais detalhes.');
              return;
            }
            setBusy(true);
            await onOpen(reason.trim());
            setBusy(false);
            setOpen(false);
            setReason('');
          })()}
          disabled={busy}
          className="flex-1 rounded-xl bg-blue py-2.5 font-head text-sm font-bold text-white disabled:opacity-60"
        >
          Enviar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-g600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
