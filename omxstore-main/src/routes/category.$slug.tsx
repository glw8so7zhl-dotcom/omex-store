import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import type { Product } from "@/lib/products";
import { fetchProducts, fetchCategories } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { EmptyState } from "@/components/site/EmptyState";
import { ProductCard } from "@/components/site/ProductCard";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

type Sort = "featured" | "price_asc" | "price_desc" | "rating";
const SORT_LABELS: Record<Sort, string> = {
  featured: "المميّزة",
  price_asc: "السعر: من الأقل",
  price_desc: "السعر: من الأعلى",
  rating: "الأعلى تقييماً",
};

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
    const category = categories.find((c) => c.id === params.slug);
    if (!category) throw notFound();
    const items = products.filter((p) => p.category === category.id);
    return { category, items };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.category.name} — OMEX Store` },
          {
            name: "description",
            content: `تسوّق ${loaderData.category.name} في متجر OMEX — منتجات أصلية وتوصيل لجميع المحافظات اليمنية.`,
          },
        ]
      : [{ title: "القسم غير موجود" }],
    links: loaderData
      ? [{ rel: "canonical", href: `${SITE_URL}/category/${loaderData.category.id}` }]
      : [],
  }),
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="text-center glass-strong rounded-3xl shadow-card p-10">
        <h1 className="font-display text-2xl font-black">القسم غير موجود</h1>
        <Button asChild variant="gradient" size="pill" className="mt-4">
          <Link to="/categories">استعرض الأقسام</Link>
        </Button>
      </div>
    </div>
  ),
});

function CategoryPage() {
  const { category, items } = Route.useLoaderData();
  const [sort, setSort] = useState<Sort>("featured");

  const sorted = useMemo(() => {
    const list: Product[] = items.slice();
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
  }, [items, sort]);

  return (
    <main className="pb-8">
      <Container size="xl" className="py-6">
        <nav className="text-xs text-muted-foreground flex items-center gap-2">
          <Link to="/" className="hover:text-foreground">الرئيسية</Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-foreground">الأقسام</Link>
          <span>/</span>
          <span className="text-foreground">{category.name}</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <PageHeader
            title={`${category.icon} ${category.name}`}
            subtitle={`${items.length} منتجاً في هذا القسم`}
          />
          <div>
            <label htmlFor="cat-sort" className="sr-only">ترتيب المنتجات</label>
            <select
              id="cat-sort"
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

        {sorted.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Inbox}
              title="لا توجد منتجات في هذا القسم بعد"
              description="تصفّح بقية الأقسام — منتجات جديدة تُضاف باستمرار."
              action={
                <Button asChild variant="gradient" size="pill">
                  <Link to="/categories">كل الأقسام</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </Container>
      <Footer />
    </main>
  );
}
