import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type FieldOption = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "select" | "date" | "email" | "url";
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  step?: string;
  hidden?: "create" | "edit" | "always";
  defaultValue?: string | number | boolean | null;
  helper?: string;
};

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export type ResourceManagerProps<T extends { id: string }> = {
  table: string;
  queryKey: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  columns: Column<T>[];
  fields: Field[];
  searchColumn?: string;
  filter?: (row: T, q: string) => boolean;
  readOnly?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  transformIn?: (row: T) => Record<string, unknown>;
  transformOut?: (values: Record<string, unknown>) => Record<string, unknown>;
  extraRowActions?: (row: T, refetch: () => void) => ReactNode;
  emptyLabel?: string;
  createLabel?: string;
};

export function ResourceManager<T extends { id: string }>({
  table,
  queryKey,
  select = "*",
  orderBy,
  columns,
  fields,
  searchColumn,
  filter,
  readOnly,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  transformIn,
  transformOut,
  extraRowActions,
  emptyLabel = "لا توجد عناصر",
  createLabel = "إضافة",
}: ResourceManagerProps<T>) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      let query = supabase.from(table as never).select(select);
      if (orderBy)
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [] as T[];
    if (!q.trim()) return data;
    const s = q.trim().toLowerCase();
    if (filter) return data.filter((r) => filter(r, s));
    if (searchColumn)
      return data.filter((r) =>
        String((r as Record<string, unknown>)[searchColumn] ?? "")
          .toLowerCase()
          .includes(s),
      );
    return data;
  }, [data, q, filter, searchColumn]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: Record<string, unknown> }) => {
      const payload = transformOut ? transformOut(values) : values;
      if (id) {
        const { error } = await supabase.from(table as never).update(payload as never).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.success("تم الحفظ");
      setEditing(null);
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحفظ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.success("تم الحذف");
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحذف"),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <GlassPanel pad="sm" className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث…"
            className="pr-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} / {data?.length ?? 0}
        </div>
        {!readOnly && canCreate && (
          <Button variant="gradient" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 ml-1" /> {createLabel}
          </Button>
        )}
      </GlassPanel>

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title={emptyLabel} />
      ) : (
        <GlassPanel pad="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02]">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn("px-4 py-3 text-right font-semibold text-xs", c.className)}
                    >
                      {c.label}
                    </th>
                  ))}
                  {!readOnly && (
                    <th className="px-4 py-3 text-right font-semibold text-xs w-32">إجراءات</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                        {c.render
                          ? c.render(row)
                          : String((row as Record<string, unknown>)[c.key] ?? "")}
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {extraRowActions?.(row, () =>
                            qc.invalidateQueries({ queryKey: [queryKey] }),
                          )}
                          {canEdit && (
                            <Button
                              variant="glass"
                              size="icon"
                              onClick={() => setEditing(row)}
                              aria-label="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="glass"
                              size="icon"
                              onClick={() => setDeleting(row)}
                              aria-label="حذف"
                              className="text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      <ResourceDialog
        open={creating || !!editing}
        row={editing}
        fields={fields}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(values) =>
          saveMutation.mutate({ id: editing?.id ?? null, values })
        }
        submitting={saveMutation.isPending}
        transformIn={transformIn}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه.
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
    </div>
  );
}

function ResourceDialog<T extends { id: string }>({
  open,
  row,
  fields,
  onClose,
  onSubmit,
  submitting,
  transformIn,
}: {
  open: boolean;
  row: T | null;
  fields: Field[];
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  submitting: boolean;
  transformIn?: (row: T) => Record<string, unknown>;
}) {
  const isEdit = !!row;
  const initial = useMemo<Record<string, unknown>>(() => {
    if (row) return transformIn ? transformIn(row) : (row as unknown as Record<string, unknown>);
    const d: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) d[f.name] = f.defaultValue;
      else if (f.type === "boolean") d[f.name] = false;
      else d[f.name] = "";
    });
    return d;
  }, [row, fields, transformIn]);

  const [values, setValues] = useState<Record<string, unknown>>(initial);

  // Reset when opening
  useMemo(() => {
    if (open) setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id]);

  const visibleFields = fields.filter((f) => {
    if (f.hidden === "always") return false;
    if (f.hidden === "create" && !isEdit) return false;
    if (f.hidden === "edit" && isEdit) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل" : "إضافة"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean: Record<string, unknown> = {};
            visibleFields.forEach((f) => {
              const v = values[f.name];
              if (f.type === "number") clean[f.name] = v === "" || v == null ? null : Number(v);
              else if (f.type === "boolean") clean[f.name] = !!v;
              else if (v === "" || v == null) clean[f.name] = null;
              else clean[f.name] = v;
            });
            onSubmit(clean);
          }}
          className="space-y-3"
        >
          {visibleFields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>
                {f.label}
                {f.required && <span className="text-red-400 mr-1">*</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  rows={4}
                />
              ) : f.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <Switch
                    id={f.name}
                    checked={!!values[f.name]}
                    onCheckedChange={(v) => setValues({ ...values, [f.name]: v })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {values[f.name] ? "مفعل" : "معطل"}
                  </span>
                </div>
              ) : f.type === "select" ? (
                <Select
                  value={values[f.name] == null ? "" : String(values[f.name])}
                  onValueChange={(v) => setValues({ ...values, [f.name]: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={f.placeholder ?? "اختر"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.name}
                  type={f.type === "number" ? "number" : f.type === "date" ? "datetime-local" : f.type ?? "text"}
                  step={f.step}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={
                    f.type === "date" && values[f.name]
                      ? String(values[f.name]).slice(0, 16)
                      : String(values[f.name] ?? "")
                  }
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                />
              )}
              {f.helper && <p className="text-[10px] text-muted-foreground">{f.helper}</p>}
            </div>
          ))}
          <DialogFooter className="pt-2">
            <Button type="button" variant="glass" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
