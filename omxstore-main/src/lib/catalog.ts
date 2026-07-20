import { supabase } from "@/integrations/supabase/client";
import type { Product, Category } from "@/lib/products";

/**
 * OMEX — catalog data access (Phase 4A).
 *
 * Single source of truth = Supabase. These helpers map DB rows onto the
 * existing `Product` / `Category` shapes so the rest of the app (cart,
 * checkout, cards) is unchanged. `Product.id` is the DB `slug`, keeping
 * product URLs and existing localStorage carts valid.
 *
 * Only scalar-column selects are used (no embedded-resource select strings)
 * to stay fully type-safe under strict TS. Category slug is resolved via a
 * small id→slug map. Used from SSR route loaders (isomorphic supabase anon
 * reads) so catalog pages render on the server for SEO.
 */

const PRODUCT_COLUMNS =
  "slug,name,brand,description,features,image,price,old_price,rating,reviews_count,sales_count,stock,featured,flash_sale,category_id";

type ProductRow = {
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  features: unknown;
  image: string | null;
  price: number | string | null;
  old_price: number | string | null;
  rating: number | string | null;
  reviews_count: number | null;
  sales_count: number | null;
  stock: number | null;
  featured: boolean | null;
  flash_sale: boolean | null;
  category_id: string | null;
};

async function fetchCategoryMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("categories").select("id,slug");
  if (error) throw error;
  const map = new Map<string, string>();
  for (const c of (data ?? []) as unknown as Array<{ id: string; slug: string }>) {
    map.set(c.id, c.slug);
  }
  return map;
}

/**
 * Seeded catalog images live in /public/products as optimized .webp (89%
 * smaller than the original .png). The DB keeps the .png path for the admin;
 * the storefront serves .webp. Scoped to /products/ so admin-uploaded images
 * (Supabase Storage URLs) pass through untouched.
 */
function toDisplayImage(src: string | null): string {
  const s = src ?? "";
  return s.startsWith("/products/") ? s.replace(/\.png$/i, ".webp") : s;
}

function mapProduct(row: ProductRow, categorySlugById: Map<string, string>): Product {
  return {
    id: row.slug,
    name: row.name,
    brand: row.brand ?? "",
    category: row.category_id ? (categorySlugById.get(row.category_id) ?? "") : "",
    image: toDisplayImage(row.image),
    price: Number(row.price ?? 0),
    oldPrice: row.old_price != null ? Number(row.old_price) : undefined,
    rating: Number(row.rating ?? 0),
    reviews: row.reviews_count ?? 0,
    sales: row.sales_count ?? 0,
    stock: row.stock ?? 0,
    featured: !!row.featured,
    flashSale: !!row.flash_sale,
    description: row.description ?? "",
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
  };
}

/** All active products, best-sellers first. */
export async function fetchProducts(): Promise<Product[]> {
  const [res, categorySlugById] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("is_active", true)
      .order("sales_count", { ascending: false }),
    fetchCategoryMap(),
  ]);
  if (res.error) throw res.error;
  return ((res.data ?? []) as unknown as ProductRow[]).map((r) => mapProduct(r, categorySlugById));
}

/** Single active product by slug (the public product id), or null. */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const [res, categorySlugById] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle(),
    fetchCategoryMap(),
  ]);
  if (res.error) throw res.error;
  return res.data ? mapProduct(res.data as unknown as ProductRow, categorySlugById) : null;
}

/** Active categories in display order. */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("slug,name,icon,gradient")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (
    (data ?? []) as unknown as Array<{
      slug: string;
      name: string;
      icon: string | null;
      gradient: string | null;
    }>
  ).map((c) => ({
    id: c.slug,
    name: c.name,
    icon: c.icon ?? "",
    gradient: c.gradient ?? "",
  }));
}
