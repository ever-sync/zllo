'use client';

import { useActionState } from 'react';
import { createDevice, type DeviceState } from './actions';

const initial: DeviceState = {};

export function DeviceForm() {
  const [state, formAction, pending] = useActionState(createDevice, initial);

  return (
    <form action={formAction} className="grid gap-4 rounded-[14px] border border-line bg-white p-4 md:grid-cols-2 md:p-[18px]">
      <Field name="nickname" label="Apelido" placeholder="Meu iPhone" />
      <Field name="brand" label="Marca" placeholder="Apple" required />
      <Field name="model" label="Modelo" placeholder="iPhone 13 Pro" required />
      <Field name="storage" label="Armazenamento" placeholder="128 GB" />
      <Field name="color" label="Cor" placeholder="Grafite" />

      {state.error ? (
        <p className="rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#B91C1C] md:col-span-2">{state.error}</p>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Salvando...' : 'Cadastrar aparelho'}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-g600">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue"
      />
    </label>
  );
}
