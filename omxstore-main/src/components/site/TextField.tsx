import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * OMEX Design System — form primitives.
 * All form inputs across the app should use these to guarantee
 * a11y (labels, error text) + consistent glass styling.
 */

const fieldBase =
  "w-full rounded-2xl bg-surface/70 border px-3.5 text-sm placeholder:text-muted-foreground outline-none shadow-sm transition-[color,border-color,box-shadow] hover:border-white/20 focus:border-primary/60 focus:ring-2 focus:ring-primary/25";

const heightInput = "h-11";
const errorBorder = "border-sale/60 focus:border-sale/60 focus:ring-sale/20";
const normalBorder = "border-white/10";

export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold mb-1.5 text-muted-foreground">
      {children} {required && <span className="text-sale">*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-[11px] text-sale">{children}</p>;
}

type BaseProps = {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
};

// SSR-safe stable id (server and client agree — avoids hydration mismatch).
const useId = () => React.useId();

export function TextField({
  label,
  error,
  required,
  className,
  id,
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      <FieldLabel htmlFor={fieldId} required={required}>{label}</FieldLabel>
      <input
        id={fieldId}
        required={required}
        className={cn(fieldBase, heightInput, error ? errorBorder : normalBorder)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function TextArea({
  label,
  error,
  required,
  className,
  id,
  rows = 3,
  ...props
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      <FieldLabel htmlFor={fieldId} required={required}>{label}</FieldLabel>
      <textarea
        id={fieldId}
        rows={rows}
        required={required}
        className={cn(fieldBase, "py-2.5", error ? errorBorder : normalBorder)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function SelectField({
  label,
  error,
  required,
  className,
  id,
  children,
  ...props
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      <FieldLabel htmlFor={fieldId} required={required}>{label}</FieldLabel>
      <select
        id={fieldId}
        required={required}
        className={cn(fieldBase, heightInput, error ? errorBorder : normalBorder)}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
      <FieldError>{error}</FieldError>
    </div>
  );
}
