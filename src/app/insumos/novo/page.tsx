import { InsumoForm } from "@/components/insumo-form";

export default function NovoInsumoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Novo insumo</h1>
      <InsumoForm />
    </div>
  );
}
