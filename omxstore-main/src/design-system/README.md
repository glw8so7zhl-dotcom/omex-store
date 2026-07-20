# OMEX Store — Design System

Single source of truth for how the storefront looks, behaves, and stays
consistent as the codebase grows. Everything visual should compose these
primitives; ad-hoc utility strings are a smell.

---

## 1. Foundations

All foundations live as CSS custom properties in `src/styles.css` and are
consumed through Tailwind v4 `@theme inline` tokens. Never hardcode raw
colors, hex values, or shadow strings in components.

### 1.1 Color palette (semantic tokens)

| Token                     | Purpose                                | CSS var             |
| ------------------------- | -------------------------------------- | ------------------- |
| `bg-background`           | App background (deep space)            | `--background`      |
| `text-foreground`         | Default text on background             | `--foreground`      |
| `bg-surface`              | Elevated surface (cards, inputs)       | `--surface`         |
| `bg-surface-2`            | Higher-elevation surface               | `--surface-2`       |
| `bg-primary`              | Brand blue (#2563EB)                   | `--primary`         |
| `bg-primary-glow`         | Lighter accent blue (#3B82F6)          | `--primary-glow`    |
| `bg-muted` / `text-muted-foreground` | Low-emphasis text/surfaces  | `--muted*`          |
| `bg-success` / `text-success` | Positive (WhatsApp, in-stock)      | `--success`         |
| `bg-sale` / `text-sale`   | Destructive / discount                 | `--sale`            |
| `border-border`           | Standard border                        | `--border`          |
| `ring-ring`               | Focus ring                             | `--ring`            |

Gradients & shadows (composed as Tailwind utilities):

- `.gradient-primary` — brand CTA background
- `.gradient-sale` — sale/discount background
- `.gradient-hero` — homepage hero backdrop
- `.shadow-glow` / `.shadow-glow-sm` — brand glow for CTAs
- `.shadow-card` — resting card shadow
- `.text-gradient` — text with the primary gradient

### 1.2 Typography

Only two families are allowed — loaded via `<link>` in `__root.tsx`:

- `font-display` → **Cairo** — headings, prices, brand marks
- `font-sans`    → **Tajawal** — body text (default)

Type scale (canonical):

| Element                  | Class                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Page title (`h1`)        | `font-display text-2xl md:text-3xl font-black`              |
| Section title (`h2`)     | `font-display text-xl sm:text-2xl md:text-3xl font-black`   |
| Card title               | `font-display text-lg font-black`                           |
| Body                     | `text-sm` (default) / `text-base` on desktop where relevant |
| Helper / caption         | `text-xs text-muted-foreground`                             |
| Micro                    | `text-[11px]` / `text-[10px]`                               |
| Price (hero)             | `font-display text-3xl font-black text-gradient`            |

Always use `PageHeader` / `SectionHeader` rather than repeating headings.

### 1.3 Spacing & layout

- Container widths: `sm=max-w-2xl · md=max-w-3xl · lg=max-w-6xl · xl=max-w-7xl` — use `<Container size=… />`.
- Horizontal page padding is always `px-4`.
- Vertical rhythm: sections `py-6` / `py-8` / `py-10`; card interiors `p-3 sm:p-4`, `p-4 sm:p-5`, `p-5 sm:p-6` (`pad="sm|md|lg"` on `GlassPanel`).
- Tap targets are `≥ 44px` — form inputs, icon buttons and CTAs use `h-11` or `h-12`.

### 1.4 Border radius

`--radius = 1.25rem`. Prefer these:

- `rounded-xl`  — small chips & inner tiles (icons, thumbnails)
- `rounded-2xl` — cards, buttons, inputs, panels
- `rounded-3xl` — hero glass panels, empty-state cards
- `rounded-full`— badges, pills, avatars

### 1.5 Shadows & elevation

- `shadow-card`     — resting elevation for cards
- `shadow-glow-sm`  — CTA / focused element
- `shadow-glow`     — hero / high-emphasis CTA

### 1.6 Glass effect

Two tones only:

- `glass`         — light frosted surface (`GlassPanel tone="glass"`)
- `glass-strong`  — denser frosted surface (`GlassPanel tone="strong"`)

Never hand-roll `bg-white/…backdrop-blur…` combinations.

---

## 2. Reusable components

Import from `@/components/ui/*` (shadcn primitives) or
`@/components/site/*` (project-specific compositions).

### 2.1 Layout

| Component        | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `Container`      | Page wrapper with max-width + padding.                     |
| `GlassPanel`     | Only way to render a frosted card/panel.                   |
| `PageHeader`     | Page-level `h1` block with optional subtitle & actions.    |
| `SectionHeader`  | In-page `h2` block with optional action.                   |
| `IconTile`       | Standard icon container (gradient/soft, 4 sizes).          |
| `EmptyState`     | Standard empty/placeholder state (icon + copy + CTA).      |

### 2.2 Actions & feedback

| Component        | Usage                                                       |
| ---------------- | ----------------------------------------------------------- |
| `Button`         | Every clickable action. Never hand-roll a `<button>` CTA.   |
| `Spinner`        | Inline loading indicator (inside buttons).                  |
| `PageSpinner`    | Route-level suspense fallback.                              |
| `Badge`          | Status pills — success / sale / gradientSale / glass.       |
| `QtyStepper`     | Quantity control (cart, product detail).                    |
| `SummaryRow`     | Label + value row in order summaries.                       |

#### Button variants

| Variant        | When                                                      |
| -------------- | --------------------------------------------------------- |
| `gradient`     | Primary CTA on a page or panel                            |
| `gradientGlow` | Hero / checkout confirm — higher emphasis                 |
| `glass`        | Secondary CTA on dark surfaces                            |
| `success`      | WhatsApp actions / positive confirm                       |
| `saleGhost`    | Destructive/light-danger (delete, clear)                  |
| `default/outline/ghost/link/secondary/destructive` | Standard shadcn variants |

#### Button sizes

- `pill`     — h-11, form actions
- `pillLg`   — h-12, primary CTAs
- `iconPill` — h-11 w-11, icon-only

### 2.3 Forms

Always use `TextField`, `TextArea`, `SelectField` from
`@/components/site/TextField`. They enforce:

- Associated `<label>` (accessibility)
- Consistent glass styling
- Error surfacing via `error?: string`
- `aria-invalid` when errored

### 2.4 Icons

`lucide-react` only. Standard sizes: `h-4 w-4` (inline), `h-5 w-5`
(tiles), `h-6 w-6` (FAB). Always wrap decorative icons that stand alone
inside interactive elements with an `aria-label`.

### 2.5 Modals / dialogs

Use shadcn `Dialog` / `AlertDialog` / `Sheet` / `Drawer` from
`@/components/ui/*`. Do not build custom modals.

---

## 3. Animation

Motion library: `motion/react`. Standard patterns:

- Entrance: `initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}`
- List stagger: `transition={{ delay: index * 0.05 }}`
- Hover lift: `whileHover={{ y: -4 }}` (Category chips)
- Micro-tap: `active:scale-[0.98]` on buttons (built into gradient/success variants)

Global keyframes (Tailwind utilities): `animate-float`, `animate-float-slow`,
`animate-pulse-glow`, `animate-spin`, `animate-in / animate-out` (shadcn).

Keep hero animations to **one** per page.

---

## 4. Dark theme & RTL

- The app is dark-only. `<html class="dark">` is applied in `__root.tsx`;
  the `.dark` scope in `styles.css` re-applies the same tokens so
  utilities render identically regardless of ancestor class.
- The app is RTL-only. `<html dir="rtl">` in `__root.tsx`. Never use
  directional utilities like `ml-*` / `mr-*` — prefer logical
  `ms-*` / `me-*` from Tailwind, or symmetric utilities (`px-*`, `gap-*`).
- Icons that imply direction (`ArrowLeft` in a "next" CTA, `ArrowRight`
  in a "back" CTA) are chosen for RTL, not LTR — do not swap them
  without checking the layout.

---

## 5. Rules

1. **No hex colors in components.** Use tokens.
2. **No hand-rolled buttons.** Use `Button` + a variant.
3. **No hand-rolled glass panels.** Use `GlassPanel`.
4. **No hand-rolled inputs.** Use `TextField` / `TextArea` / `SelectField`.
5. **No hand-rolled empty states.** Use `EmptyState`.
6. **Icon-only buttons must have `aria-label`.**
7. **Every route sets `head()` metadata** (title + description).
8. **Every product image uses `loading="lazy" decoding="async"`.**

Violating a rule requires a comment explaining why.
