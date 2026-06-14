'use client';

import { useState } from 'react';

export function ReviewForm({
  onSubmit,
  title = 'Avaliar atendimento',
}: {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  title?: string;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (stars < 1) return;
    setBusy(true);
    await onSubmit(stars, comment.trim());
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-head text-base font-extrabold text-ink">{title}</h3>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStars(s)}
            className="text-2xl leading-none text-[#F59E0B]"
            aria-label={`${s} estrelas`}
          >
            {s <= stars ? '★' : '☆'}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Conte como foi (opcional)"
        className="mt-3 w-full resize-none rounded-xl border border-line p-3 text-sm outline-none focus:border-blue"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={stars < 1 || busy}
        className="mt-3 w-full rounded-xl bg-blue py-3 font-head text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Enviando…' : 'Enviar avaliação'}
      </button>
    </div>
  );
}

export function ReviewDisplay({
  rating,
  comment,
}: {
  rating: number;
  comment: string | null;
}) {
  return (
    <div className="rounded-2xl bg-g100 p-5">
      <p className="font-head text-xs font-bold uppercase tracking-wide text-g600">Sua avaliação</p>
      <p className="mt-1 text-xl text-[#F59E0B]">
        {'★'.repeat(rating)}
        {'☆'.repeat(5 - rating)}
      </p>
      {comment ? <p className="mt-2 text-sm text-g600">{comment}</p> : null}
    </div>
  );
}
