'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createRequest, type RequestState } from './actions';

type Device = { id: string; name: string };
const initial: RequestState = {};

export function RequestForm({ devices }: { devices: Device[] }) {
  const [state, formAction, pending] = useActionState(createRequest, initial);

  if (devices.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center">
        <h2 className="font-head text-lg font-extrabold text-ink">Cadastre um aparelho primeiro</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-g600">
          A solicitação precisa estar ligada ao aparelho que será reparado.
        </p>
        <Link href="/cliente/aparelhos" className="mt-5 inline-flex rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white">
          Cadastrar aparelho
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-g600">Aparelho</span>
        <select name="device_id" required className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue">
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-g600">Qual o problema?</span>
        <textarea
          name="description"
          required
          minLength={10}
          rows={5}
          placeholder="Ex: tela trincada, touch não responde no canto..."
          className="resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-xl border border-line p-3">
          <input type="radio" name="shipping_type" value="levar_local" defaultChecked className="mr-2 accent-blue" />
          <span className="font-semibold text-ink">Levo na assistência</span>
          <p className="mt-1 text-xs text-g600">Você combina o melhor horário com a loja.</p>
        </label>
        <label className="rounded-xl border border-line p-3">
          <input type="radio" name="shipping_type" value="frete" className="mr-2 accent-blue" />
          <span className="font-semibold text-ink">Preciso de coleta</span>
          <p className="mt-1 text-xs text-g600">As assistências próximas recebem seu endereço.</p>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-g600">Endereço ou referência</span>
        <input
          name="address"
          placeholder="Av. Paulista, São Paulo"
          className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-g600">Latitude</span>
          <input name="lat" type="number" step="any" defaultValue="-23.5614" className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-g600">Longitude</span>
          <input name="lng" type="number" step="any" defaultValue="-46.6559" className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue" />
        </label>
      </div>

      {state.error ? <p className="rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#B91C1C]">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Enviando...' : 'Enviar para assistências'}
      </button>
    </form>
  );
}
