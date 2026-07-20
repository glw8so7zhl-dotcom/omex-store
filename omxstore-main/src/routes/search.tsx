import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Search as SearchIcon } from "lucide-react";
import { fetchProducts } from "@/lib/catalog";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { EmptyState } from "@/components/site/EmptyState";
import { ProductCard } from "@/components/site/ProductCard";
import { Footer } from "@/components/site/Footer";

const searchSchema = z.object({ q: z.string().optional().catch("") });

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: async () => ({ products: await fetchProducts() }),
  head: () => ({
    meta: [
      { title: "البحث — OMEX Store" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { products } = Route.useLoaderData();
  const { q } = Route.useSearch();
  const query = (q ?? "").trim().toLowerCase();

  const results = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query),
      )
    : [];

  return (
    <main className="pb-8">
      <Container size="xl" className="py-6">
        <PageHeader
          title="نتائج البحث"
          subtitle={
            query ? `${results.length} نتيجة عن "${q}"` : "اكتب في شريط البحث بالأعلى للبدء"
          }
        />

        {query && results.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={SearchIcon}
              title="لا توجد نتائج"
              description="جرّب كلمات مختلفة أو تصفّح الأقسام."
            />
          </div>
        ) : results.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : null}
      </Container>
      <Footer />
    </main>
  );
}
