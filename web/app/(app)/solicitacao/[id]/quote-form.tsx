'use client';

import { useActionState } from 'react';
import { sendQuote, type QuoteState } from '../actions';

const initial: QuoteState = {};

export function QuoteForm({ requestId, deviceName }: { requestId: string; deviceName: string }) {
  const [state, formAction, pending] = useActionState(sendQuote, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <div>
        <h3 className="font-head text-base font-bold text-ink">Enviar orçamento</h3>
        <p className="font-body text-sm text-g600">{deviceName}</p>
      </div>

      <input type="hidden" name="request_id" value={requestId} />

      <label className="flex flex-col gap-1.5">
        <span className="font-body text-sm text-g600">Valor (R$)</span>
        <input
          name="value"
          inputMode="decimal"
          required
          placeholder="0,00"
          className="rounded-xl border border-line px-3.5 py-2.5 font-head text-lg text-ink outline-none focus:border-blue"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-body text-sm text-g600">Descrição</span>
        <textarea
          name="note"
          rows={3}
          placeholder="Ex: troca de tela original, garantia de 90 dias, pronto em 2 dias…"
          className="resize-none rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg bg-[#FEE2E2] px-3 py-2 font-body text-sm text-[#B91C1C]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-blue px-4 py-3 font-head font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? 'Enviando…' : 'Enviar orçamento'}
      </button>
    </form>
  );
}
