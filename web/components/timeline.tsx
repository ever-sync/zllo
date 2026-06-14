import { ORDER_STEPS, stepIndex } from '@/lib/order-status';

/** Linha do tempo da OS (versão web). */
export function Timeline({ status, events }: { status: string; events: Record<string, string> }) {
  const current = stepIndex(status);

  return (
    <div className="flex flex-col">
      {ORDER_STEPS.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const last = i === ORDER_STEPS.length - 1;
        const time = events[step.key];

        return (
          <div key={step.key} className="flex gap-3.5">
            <div className="flex w-6 flex-col items-center">
              <div
                className={
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ' +
                  (isCurrent
                    ? 'border-[3px] border-lime bg-blue text-white'
                    : done
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-g200 text-g400')
                }
              >
                {done && !isCurrent ? '✓' : null}
              </div>
              {!last ? (
                <div className={'my-0.5 w-0.5 flex-1 ' + (done ? 'bg-[#16A34A]' : 'bg-g200')} />
              ) : null}
            </div>
            <div className="flex-1 pb-4">
              <p
                className={
                  'text-sm ' +
                  (done || isCurrent ? 'font-semibold text-ink' : 'font-medium text-g400')
                }
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-g600">{time ?? (isCurrent ? 'Em andamento' : '—')}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
