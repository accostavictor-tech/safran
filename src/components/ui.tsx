import { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import Link from "next/link";

const baseInput =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-neutral-100 disabled:text-neutral-500";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`block text-sm font-medium text-neutral-700 ${props.className ?? ""}`} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} bg-white ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-xs text-neutral-400">{hint}</p> : null}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white shadow-sm ${className ?? ""}`}>{children}</div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants = {
    primary: "bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60",
    secondary: "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
    ghost: "text-neutral-600 hover:bg-neutral-100",
  };
  return (
    <button
      {...props}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${variants[variant]} ${className ?? ""}`}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const variants = {
    primary: "bg-purple-700 text-white hover:bg-purple-800",
    secondary: "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50",
  };
  return (
    <Link href={href} className={`inline-block rounded-md px-3 py-1.5 text-sm font-medium transition ${variants[variant]}`}>
      {children}
    </Link>
  );
}
