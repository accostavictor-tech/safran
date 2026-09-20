import { PageHeader } from "@/components/page-header";
import { KitForm } from "@/components/kit-form";

export default function NovoKitPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Novo kit" description="O cliente escolhe os pratos; o preço é fechado." />
      <KitForm />
    </div>
  );
}
