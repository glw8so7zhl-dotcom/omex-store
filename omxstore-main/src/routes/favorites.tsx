import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { fetchProducts } from "@/lib/catalog";
import { useWishlist } from "@/lib/wishlist";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { EmptyState } from "@/components/site/EmptyState";
import { ProductCard } from "@/components/site/ProductCard";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favorites")({
  loader: async () => ({ products: await fetchProducts() }),
  head: () => ({
    meta: [
      { title: "المفضلة — OMEX Store" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { products } = Route.useLoaderData();
  const { ids, count, clear } = useWishlist();
  const favs = products.filter((p) => ids.includes(p.id));

  return (
    <main className="pb-8">
      <Container size="xl" className="py-6">
        <PageHeader
          title="المفضلة"
          subtitle={count > 0 ? `${count} منتج في قائمتك` : "احفظ منتجاتك المفضلة هنا"}
          actions={
            favs.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="text-xs text-sale hover:underline"
              >
                إفراغ القائمة
              </button>
            ) : null
          }
        />

        {favs.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Heart}
              title="قائمة المفضلة فارغة"
              description="اضغط على القلب في أي منتج لإضافته إلى مفضلتك."
              action={
                <Button asChild variant="gradient" size="pill">
                  <Link to="/">استعرض المنتجات</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favs.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </Container>
      <Footer />
    </main>
  );
}
