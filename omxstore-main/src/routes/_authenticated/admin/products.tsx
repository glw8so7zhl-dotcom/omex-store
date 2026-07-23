import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  Video,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatPrice } from "@/lib/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "المنتجات — OMEX Admin" }] }),
  component: ProductsAdmin,
});

const BUCKET = "products";

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category_id: string | null;
  description: string | null;
  price: number;
  old_price: number | null;
  image: string | null;
  gallery: string[] | null;
  video_url: string | null;
  sku: string | null;
  barcode: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  warranty: string | null;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  featured: boolean;
  flash_sale: boolean;
  flash_ends_at: string | null;
  created_at?: string;
};

type Category = { id: string; name: string };

const EMPTY: Omit<Product, "id"> = {
  name: "",
  slug: "",
  brand: "",
  category_id: null,
  description: "",
  price: 0,
  old_price: null,
  image: null,
  gallery: [],
  video_url: null,
  sku: "",
  barcode: "",
  weight: null,
  length: null,
  width: null,
  height: null,
  warranty: "",
  tags: [],
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  stock: 0,
  low_stock_threshold: 5,
  is_active: true,
  featured: false,
  flash_sale: false,
  flash_ends_at: null,
};

/** ISO → value for <input type="datetime-local"> in the admin's local time. */
function toLocalDT(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function slugify(s: string) {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadFile(file: File, folder: "images" | "videos"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  // `products` is a public bucket — use a stable public URL (no expiry).
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Failed to resolve public URL");
  return data.publicUrl;
}

function ProductsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const { data: cats } = useQuery({
    queryKey: ["admin-cats-options"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").order("name");
      return (data ?? []) as Category[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [] as Product[];
    if (!q.trim()) return data;
    const s = q.trim().toLowerCase();
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.sku ?? "").toLowerCase().includes(s) ||
        (r.brand ?? "").toLowerCase().includes(s),
    );
  }, [data, q]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: Partial<Product> }) => {
      if (id) {
        const { error } = await supabase
          .from("products")
          .update(values as never)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(values as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("تم الحفظ");
      setEditing(null);
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحفظ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("تم الحذف");
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحذف"),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (p: Product) => {
      const { id: _id, created_at: _c, ...rest } = p;
      void _id;
      void _c;
      const copy = {
        ...rest,
        name: `${p.name} (نسخة)`,
        slug: `${p.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
        sku: p.sku ? `${p.sku}-COPY` : null,
        barcode: null,
        is_active: false,
      };
      const { error } = await supabase.from("products").insert(copy as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("تم إنشاء نسخة");
    },
    onError: (e: Error) => toast.error(e.message || "فشل التكرار"),
  });

  return (
    <AdminShell title="المنتجات" subtitle="إدارة كاتالوج المنتجات">
      <div className="space-y-4">
        <GlassPanel pad="sm" className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم أو SKU…"
              className="pr-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} / {data?.length ?? 0}
          </div>
          <Button variant="gradient" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 ml-1" /> منتج جديد
          </Button>
        </GlassPanel>

        {isLoading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="لا توجد منتجات" />
        ) : (
          <GlassPanel pad="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-xs">المنتج</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs">SKU</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs">السعر</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs">المخزون</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs w-40">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const low = r.stock <= r.low_stock_threshold;
                    return (
                      <tr key={r.id} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {r.image && (
                              <img
                                src={r.image}
                                alt=""
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{r.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {r.brand ?? ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.sku ?? "—"}
                        </td>
                        <td className="px-4 py-3">{formatPrice(Number(r.price))}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={low ? "sale" : "success"}
                            className="rounded-full text-[10px]"
                          >
                            {r.stock}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={r.is_active ? "default" : "secondary"}>
                              {r.is_active ? "مفعل" : "معطل"}
                            </Badge>
                            {r.featured && <Badge variant="outline">مميز</Badge>}
                            {r.flash_sale && <Badge variant="destructive">خصم</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="glass"
                              size="icon"
                              onClick={() => duplicateMutation.mutate(r)}
                              aria-label="تكرار"
                              disabled={duplicateMutation.isPending}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="glass"
                              size="icon"
                              onClick={() => setEditing(r)}
                              aria-label="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="glass"
                              size="icon"
                              onClick={() => setDeleting(r)}
                              aria-label="حذف"
                              className="text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )}
      </div>

      <ProductDialog
        open={creating || !!editing}
        product={editing}
        categories={cats ?? []}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(values) => saveMutation.mutate({ id: editing?.id ?? null, values })}
        submitting={saveMutation.isPending}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف "{deleting?.name}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function ProductDialog({
  open,
  product,
  categories,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (values: Partial<Product>) => void;
  submitting: boolean;
}) {
  const isEdit = !!product;
  const initial = useMemo<Product>(() => {
    if (product)
      return {
        ...product,
        gallery: Array.isArray(product.gallery) ? product.gallery : [],
        tags: Array.isArray(product.tags) ? product.tags : [],
      };
    return { id: "", ...EMPTY } as Product;
  }, [product]);

  const [v, setV] = useState<Product>(initial);
  const [tagInput, setTagInput] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useMemo(() => {
    if (open) {
      setV(initial);
      setTagInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const set = <K extends keyof Product>(k: K, val: Product[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadFile(f, "images"));
      }
      const gallery = [...(v.gallery ?? []), ...urls];
      setV((p) => ({
        ...p,
        gallery,
        image: p.image ?? urls[0] ?? null,
      }));
      toast.success(`تم رفع ${urls.length} صورة`);
    } catch (e) {
      toast.error((e as Error).message || "فشل رفع الصور");
    } finally {
      setUploadingImages(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const url = await uploadFile(file, "videos");
      set("video_url", url);
      toast.success("تم رفع الفيديو");
    } catch (e) {
      toast.error((e as Error).message || "فشل رفع الفيديو");
    } finally {
      setUploadingVideo(false);
      if (vidInputRef.current) vidInputRef.current.value = "";
    }
  };

  const removeGalleryItem = (url: string) => {
    const gallery = (v.gallery ?? []).filter((g) => g !== url);
    setV((p) => ({
      ...p,
      gallery,
      image: p.image === url ? (gallery[0] ?? null) : p.image,
    }));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!(v.tags ?? []).includes(t)) set("tags", [...(v.tags ?? []), t]);
    setTagInput("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Product> = {
      name: v.name.trim(),
      slug: (v.slug || slugify(v.name)).trim(),
      brand: v.brand?.trim() || null,
      category_id: v.category_id || null,
      description: v.description?.trim() || null,
      price: Number(v.price) || 0,
      old_price: v.old_price != null && v.old_price !== ("" as unknown) ? Number(v.old_price) : null,
      image: v.image || null,
      gallery: v.gallery ?? [],
      video_url: v.video_url || null,
      sku: v.sku?.trim() || null,
      barcode: v.barcode?.trim() || null,
      weight: v.weight != null && v.weight !== ("" as unknown) ? Number(v.weight) : null,
      length: v.length != null && v.length !== ("" as unknown) ? Number(v.length) : null,
      width: v.width != null && v.width !== ("" as unknown) ? Number(v.width) : null,
      height: v.height != null && v.height !== ("" as unknown) ? Number(v.height) : null,
      warranty: v.warranty?.trim() || null,
      tags: v.tags ?? [],
      meta_title: v.meta_title?.trim() || null,
      meta_description: v.meta_description?.trim() || null,
      meta_keywords: v.meta_keywords?.trim() || null,
      stock: Number(v.stock) || 0,
      low_stock_threshold: Number(v.low_stock_threshold) || 0,
      is_active: !!v.is_active,
      featured: !!v.featured,
      flash_sale: !!v.flash_sale,
      flash_ends_at: v.flash_sale && v.flash_ends_at ? v.flash_ends_at : null,
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(x) => !x && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل منتج" : "منتج جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Tabs defaultValue="general">
            <TabsList className="w-full flex-wrap h-auto">
              <TabsTrigger value="general">أساسي</TabsTrigger>
              <TabsTrigger value="media">الوسائط</TabsTrigger>
              <TabsTrigger value="inventory">المخزون</TabsTrigger>
              <TabsTrigger value="shipping">الشحن</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            {/* GENERAL */}
            <TabsContent value="general" className="space-y-3 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Fld label="اسم المنتج" required>
                  <Input
                    value={v.name}
                    required
                    onChange={(e) => {
                      const name = e.target.value;
                      setV((p) => ({
                        ...p,
                        name,
                        slug: p.slug && isEdit ? p.slug : slugify(name),
                      }));
                    }}
                  />
                </Fld>
                <Fld label="المعرّف (slug)" required>
                  <Input
                    value={v.slug}
                    required
                    onChange={(e) => set("slug", e.target.value)}
                  />
                </Fld>
                <Fld label="الماركة (Brand)">
                  <Input
                    value={v.brand ?? ""}
                    onChange={(e) => set("brand", e.target.value)}
                  />
                </Fld>
                <Fld label="التصنيف">
                  <Select
                    value={v.category_id ?? ""}
                    onValueChange={(x) => set("category_id", x || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر تصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Fld>
              </div>

              <Fld label="الوصف">
                <Textarea
                  rows={4}
                  value={v.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Fld>

              <div className="grid grid-cols-2 gap-3">
                <Fld label="السعر" required>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={v.price ?? 0}
                    onChange={(e) => set("price", Number(e.target.value))}
                  />
                </Fld>
                <Fld label="السعر قبل الخصم">
                  <Input
                    type="number"
                    step="0.01"
                    value={v.old_price ?? ""}
                    onChange={(e) =>
                      set("old_price", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </Fld>
              </div>

              <Fld label="الوسوم (Tags)">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="أضف وسم واضغط Enter"
                  />
                  <Button type="button" variant="glass" size="sm" onClick={addTag}>
                    إضافة
                  </Button>
                </div>
                {(v.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(v.tags ?? []).map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="gap-1 cursor-pointer"
                        onClick={() =>
                          set("tags", (v.tags ?? []).filter((x) => x !== t))
                        }
                      >
                        {t} <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </Fld>

              <div className="grid grid-cols-3 gap-3">
                <Toggle
                  label="مفعل"
                  checked={v.is_active}
                  onChange={(x) => set("is_active", x)}
                />
                <Toggle
                  label="مميز"
                  checked={v.featured}
                  onChange={(x) => set("featured", x)}
                />
                <Toggle
                  label="خصم فلاش"
                  checked={v.flash_sale}
                  onChange={(x) => set("flash_sale", x)}
                />
              </div>

              {v.flash_sale && (
                <Fld
                  label="ينتهي عرض الفلاش في"
                  helper="يظهر عدّاد تنازلي حقيقي للعملاء ويختفي العرض تلقائياً بعد هذا الوقت. اتركه فارغاً لعرض بلا موعد."
                >
                  <Input
                    type="datetime-local"
                    value={toLocalDT(v.flash_ends_at)}
                    onChange={(e) =>
                      set(
                        "flash_ends_at",
                        e.target.value ? new Date(e.target.value).toISOString() : null,
                      )
                    }
                  />
                </Fld>
              )}
            </TabsContent>

            {/* MEDIA */}
            <TabsContent value="media" className="space-y-4 mt-4">
              <Fld label="معرض الصور" helper="أول صورة تُستخدم كصورة رئيسية. اضغط على الصورة لتعيينها كرئيسية.">
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {(v.gallery ?? []).map((url) => (
                    <div
                      key={url}
                      className={cn(
                        "relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer",
                        v.image === url ? "border-primary" : "border-transparent",
                      )}
                      onClick={() => set("image", url)}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {v.image === url && (
                        <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-1">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGalleryItem(url);
                        }}
                        className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        aria-label="حذف"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 grid place-items-center text-muted-foreground disabled:opacity-50"
                  >
                    {uploadingImages ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-xs">
                        <Upload className="h-5 w-5" />
                        رفع صور
                      </div>
                    )}
                  </button>
                </div>
              </Fld>

              <Fld label="فيديو المنتج">
                <input
                  ref={vidInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => handleVideoUpload(e.target.files?.[0] ?? null)}
                />
                {v.video_url ? (
                  <div className="space-y-2">
                    <video
                      src={v.video_url}
                      controls
                      className="w-full max-h-64 rounded-xl bg-black"
                    />
                    <Button
                      type="button"
                      variant="glass"
                      size="sm"
                      onClick={() => set("video_url", null)}
                    >
                      <X className="h-4 w-4" /> إزالة الفيديو
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="glass"
                    onClick={() => vidInputRef.current?.click()}
                    disabled={uploadingVideo}
                  >
                    {uploadingVideo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Video className="h-4 w-4" /> رفع فيديو
                      </>
                    )}
                  </Button>
                )}
              </Fld>
            </TabsContent>

            {/* INVENTORY */}
            <TabsContent value="inventory" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Fld label="SKU">
                  <Input value={v.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
                </Fld>
                <Fld label="الباركود (Barcode)">
                  <Input
                    value={v.barcode ?? ""}
                    onChange={(e) => set("barcode", e.target.value)}
                  />
                </Fld>
                <Fld label="الكمية المتاحة">
                  <Input
                    type="number"
                    value={v.stock ?? 0}
                    onChange={(e) => set("stock", Number(e.target.value))}
                  />
                </Fld>
                <Fld label="حد التنبيه للمخزون">
                  <Input
                    type="number"
                    value={v.low_stock_threshold ?? 0}
                    onChange={(e) => set("low_stock_threshold", Number(e.target.value))}
                  />
                </Fld>
              </div>
            </TabsContent>

            {/* SHIPPING */}
            <TabsContent value="shipping" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Fld label="الوزن (كجم)">
                  <Input
                    type="number"
                    step="0.01"
                    value={v.weight ?? ""}
                    onChange={(e) =>
                      set("weight", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </Fld>
                <Fld label="الضمان">
                  <Input
                    value={v.warranty ?? ""}
                    onChange={(e) => set("warranty", e.target.value)}
                    placeholder="مثال: سنة واحدة"
                  />
                </Fld>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Fld label="الطول (سم)">
                  <Input
                    type="number"
                    step="0.01"
                    value={v.length ?? ""}
                    onChange={(e) =>
                      set("length", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </Fld>
                <Fld label="العرض (سم)">
                  <Input
                    type="number"
                    step="0.01"
                    value={v.width ?? ""}
                    onChange={(e) =>
                      set("width", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </Fld>
                <Fld label="الارتفاع (سم)">
                  <Input
                    type="number"
                    step="0.01"
                    value={v.height ?? ""}
                    onChange={(e) =>
                      set("height", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </Fld>
              </div>
            </TabsContent>

            {/* SEO */}
            <TabsContent value="seo" className="space-y-3 mt-4">
              <Fld label="Meta Title" helper="60 حرف أو أقل">
                <Input
                  value={v.meta_title ?? ""}
                  onChange={(e) => set("meta_title", e.target.value)}
                  maxLength={80}
                />
              </Fld>
              <Fld label="Meta Description" helper="160 حرف أو أقل">
                <Textarea
                  rows={3}
                  value={v.meta_description ?? ""}
                  onChange={(e) => set("meta_description", e.target.value)}
                  maxLength={200}
                />
              </Fld>
              <Fld label="Meta Keywords" helper="افصل بفواصل">
                <Input
                  value={v.meta_keywords ?? ""}
                  onChange={(e) => set("meta_keywords", e.target.value)}
                />
              </Fld>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 sticky bottom-0 bg-background">
            <Button type="button" variant="glass" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={submitting || uploadingImages || uploadingVideo}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Fld({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-red-400 mr-1">*</span>}
      </Label>
      {children}
      {helper && <p className="text-[10px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <GlassPanel pad="sm" className="flex items-center justify-between">
      <span className="text-sm font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </GlassPanel>
  );
}
