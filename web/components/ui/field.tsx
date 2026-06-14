import type { InputHTMLAttributes, ReactNode } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
};

export function Field({ label, error, hint, prefix, className = '', ...props }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-body text-sm font-medium text-g600">{label}</span>
      <div
        className={
          'flex items-center rounded-xl border bg-white px-3.5 transition-[border-color,box-shadow] ' +
          (error ? 'border-danger shadow-[0_0_0_3px_rgba(220,38,38,0.12)]' : 'border-line focus-within:border-blue focus-within:shadow-[0_0_0_3px_rgba(30,27,224,0.12)]')
        }
      >
        {prefix ? <span className="mr-2 font-body text-sm text-g400">{prefix}</span> : null}
        <input
          {...props}
          className={
            'w-full border-0 bg-transparent py-2.5 font-body text-ink outline-none placeholder:text-g400 ' +
            className
          }
        />
      </div>
      {error ? <span className="font-body text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="font-body text-xs text-g600">{hint}</span> : null}
    </label>
  );
}
