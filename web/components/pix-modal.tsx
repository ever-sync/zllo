'use client';

/** Modal de pagamento Pix (QR + copia e cola). */
export function PixModal({
  open,
  paid,
  pix,
  copied,
  error,
  onClose,
  onCopy,
}: {
  open: boolean;
  paid: boolean;
  pix: { payload: string; encodedImage: string } | null;
  copied: boolean;
  error: string | null;
  onClose: () => void;
  onCopy: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {paid ? (
          <div className="text-center">
            <p className="text-4xl">✓</p>
            <h3 className="mt-2 font-head text-xl font-extrabold text-ink">Pagamento confirmado!</h3>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-ink py-3 font-head text-sm font-bold text-white"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-head text-xl font-extrabold text-ink">Pague com Pix</h3>
            <p className="mt-1 text-sm text-g600">Escaneie o QR Code ou copie o código abaixo.</p>
            {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
            {pix?.encodedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.encodedImage}`}
                alt="QR Code Pix"
                className="mx-auto mt-4 h-52 w-52 object-contain"
              />
            ) : null}
            {pix ? (
              <button
                type="button"
                onClick={onCopy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-head text-sm font-bold text-white"
              >
                {copied ? 'Copiado!' : 'Copiar código Pix'}
              </button>
            ) : null}
            <p className="mt-4 text-center text-xs text-g600">Aguardando pagamento…</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full text-center text-sm font-semibold text-g600"
            >
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
