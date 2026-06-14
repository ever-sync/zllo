'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Field } from '@/components/ui/field';
import { LGPD_VERSION } from '@/lib/legal-content';
import { createClient } from '@/lib/supabase/client';

export function RegisterForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [lgpd, setLgpd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onlyDigits = (v: string) => v.replace(/\D/g, '');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!lgpd) {
      setError('Aceite os termos e a política de privacidade.');
      return;
    }
    if (fullName.trim().length < 3 || password.length < 6) {
      setError('Preencha nome e senha (mín. 6 caracteres).');
      return;
    }
    setLoading(true);
    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          cpf: onlyDigits(cpf),
          phone: onlyDigits(phone),
          role: 'cliente',
          cep: onlyDigits(cep),
          street: street.trim(),
          number: number.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          uf: uf.trim().toUpperCase(),
          lgpd_accepted: 'true',
          lgpd_version: LGPD_VERSION,
        },
      },
    });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    if (!data.session) {
      setInfo('Conta criada! Confirme seu e-mail para entrar.');
      return;
    }
    router.push('/cliente');
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
      <Field label="Nome completo" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <Field label="CPF" name="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
      <Field label="Telefone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <Field label="E-mail" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field label="Senha" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Field label="CEP" name="cep" value={cep} onChange={(e) => setCep(e.target.value)} required />
      <Field label="Logradouro" name="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número" name="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
        <Field label="UF" name="uf" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} required />
      </div>
      <Field label="Bairro" name="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
      <Field label="Cidade" name="city" value={city} onChange={(e) => setCity(e.target.value)} required />
      <label className="flex items-start gap-2 text-sm text-g600">
        <input type="checkbox" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} className="mt-1" />
        <span>
          Li e concordo com os <Link href="/termos" className="font-semibold text-blue">Termos</Link> e a{' '}
          <Link href="/privacidade" className="font-semibold text-blue">Privacidade</Link>.
        </span>
      </label>
      {error ? <p className="rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-2.5 text-sm text-[#B91C1C]">{error}</p> : null}
      {info ? <p className="rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] px-3.5 py-2.5 text-sm text-[#15803D]">{info}</p> : null}
      <button type="submit" disabled={loading} className="rounded-xl bg-blue px-4 py-3.5 font-head text-sm font-bold uppercase text-white disabled:opacity-60">
        {loading ? 'Criando…' : 'Criar conta'}
      </button>
      <Link href="/cliente/login" className="text-center text-sm text-g600">
        Já tem conta? <span className="font-semibold text-blue">Entrar</span>
      </Link>
    </form>
  );
}
