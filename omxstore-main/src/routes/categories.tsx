import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import type { Product } from "@/lib/products";
import { fetchProducts, fetchCategories } from "@/lib/catalog";
import { CategoryChip } from "@/components/site/CategoryChip";
import { ProductCard } from "@/components/site/ProductCard";
import { Footer } from "@/components/site/Footer";
import { Container } from "@/components/site/Container";
import { EmptyState } from "@/components/site/EmptyState";
import { PageHeader, SectionHeader } from "@/components/site/PageHeader";

type Sort = "featured" | "price_asc" | "price_desc" | "rating";

const SORT_LABELS: Record<Sort, string> = {
  featured: "المميّزة",
  price_asc: "السعر: من الأقل",
  price_desc: "السعر: من الأعلى",
  rating: "الأعلى تقييماً",
};

export const Route = createFileRoute("/categories")({
  loader: async () => {
    const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
    return { products, categories };
  },
  head: () => ({
    meta: [
      { title: "الأقسام — OMEX Store" },
      { name: "description", content: "استعرض كل أقسام متجر OMEX ومنتجاتنا." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { products, categories } = Route.useLoaderData();
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("featured");

  const filtered = useMemo(() => {
    const list: Product[] = cat ? products.filter((p) => p.category === cat) : products.slice();
    switch (sort) {
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        list.sort((a, b) => Number(b.featured) - Number(a.featured) || b.sales - a.sales);
    }
    return list;
  }, [products, cat, sort]);

  const activeCategoryName = cat ? categories.find((c) => c.id === cat)?.name : null;

  return (
    <main className="pb-8">
      <Container size="xl" className="py-6">
        <PageHeader
          title="تسوّق حسب القسم"
          subtitle="اختر قسماً لتصفية المنتجات، أو رتّبها كما يناسبك"
        />

        <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {categories.map((c, i) => (
            <CategoryChip
              key={c.id}
              category={c}
              index={i}
              active={cat === c.id}
              onClick={() => setCat((cur) => (cur === c.id ? null : c.id))}
            />
          ))}
        </div>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader title={activeCategoryName ? `قسم: ${activeCategoryName}` : "كل المنتجات"} />
            <div className="flex items-center gap-2">
              {cat && (
                <button
                  type="button"
                  onClick={() => setCat(null)}
                  className="text-xs text-primary-glow hover:underline"
                >
                  عرض الكل
                </button>
              )}
              <label htmlFor="sort" className="sr-only">
                ترتيب المنتجات
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 rounded-2xl bg-surface/70 border border-white/10 px-3 text-sm outline-none transition-[color,border-color,box-shadow] hover:border-white/20 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
                  <option key={s} value={s} className="bg-surface">
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Inbox}
                title="لا توجد منتجات"
                description="جرّب قسماً آخر أو اعرض كل المنتجات."
              />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </section>
      </Container>
      <Footer />
    </main>
  );
}
