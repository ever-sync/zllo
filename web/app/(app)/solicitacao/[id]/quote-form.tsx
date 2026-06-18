'use client';

import { useActionState, useState } from 'react';
import { sendQuote, type QuoteState } from '../actions';

const initial: QuoteState = {};

/** Máscara de moeda: dígitos → "1.234,56" (centavos). */
function maskBRL(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  const cents = Number(digits);
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function QuoteForm({ requestId, deviceName }: { requestId: string; deviceName: string }) {
  const [state, formAction, pending] = useActionState(sendQuote, initial);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <div>
        <h3 className="font-head text-base font-bold text-ink">Enviar orçamento</h3>
        <p className="font-body text-sm text-g600">{deviceName}</p>
      </div>

      <input type="hidden" name="request_id" value={requestId} />

      <p className="font-body text-xs text-g600">
        Informe uma faixa estimada. O valor final você confirma após o diagnóstico.
      </p>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Valor mínimo (R$)</span>
          <div className="flex items-center rounded-xl border border-line px-3.5 focus-within:border-blue">
            <span className="font-head text-lg text-g400">R$</span>
            <input
              name="value_min"
              inputMode="decimal"
              required
              value={min}
              onChange={(e) => setMin(maskBRL(e.target.value))}
              placeholder="200,00"
              className="w-full bg-transparent py-2.5 pl-2 font-head text-lg text-ink outline-none"
            />
          </div>
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Valor máximo (R$)</span>
          <div className="flex items-center rounded-xl border border-line px-3.5 focus-within:border-blue">
            <span className="font-head text-lg text-g400">R$</span>
            <input
              name="value_max"
              inputMode="decimal"
              required
              value={max}
              onChange={(e) => setMax(maskBRL(e.target.value))}
              placeholder="500,00"
              className="w-full bg-transparent py-2.5 pl-2 font-head text-lg text-ink outline-none"
            />
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-body text-sm text-g600">Garantia (dias)</span>
        <input
          name="warranty_days"
          inputMode="numeric"
          defaultValue="90"
          placeholder="0"
          className="rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
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
