-- =========================================================
-- Phase 4A — Seed catalog from the original static storefront data.
--
-- Purpose: make the Supabase `products`/`categories`/`inventory` tables the
-- single source of truth for the storefront WITHOUT changing how the site
-- looks. Slugs intentionally match the previous static string IDs
-- (e.g. 'phone-x-pro') so existing product URLs and localStorage carts keep
-- working. Fully idempotent: safe to run more than once.
--
-- REVIEW BEFORE RUNNING against your database. Adjust prices/stock later via
-- the existing Admin panel.
-- =========================================================

-- ---------- Categories ----------
INSERT INTO public.categories (slug, name, name_ar, icon, gradient, sort_order, is_active)
VALUES
  ('electronics', 'الكترونيات',      'الكترونيات',      '⚡', 'from-blue-500 to-cyan-500',     1, true),
  ('phones',      'هواتف',           'هواتف',           '📱', 'from-indigo-500 to-blue-500',   2, true),
  ('smart',       'أجهزة ذكية',      'أجهزة ذكية',      '⌚', 'from-violet-500 to-purple-500', 3, true),
  ('car',         'قطع سيارات',      'قطع سيارات',      '🚗', 'from-slate-500 to-zinc-500',    4, true),
  ('home',        'أدوات منزلية',    'أدوات منزلية',    '🏠', 'from-amber-500 to-orange-500',  5, true),
  ('tools',       'عدد وأدوات',      'عدد وأدوات',      '🔧', 'from-yellow-500 to-amber-500',  6, true),
  ('sports',      'رياضة',           'رياضة',           '⚽', 'from-emerald-500 to-teal-500',  7, true),
  ('health',      'صحة',             'صحة',             '💊', 'from-rose-500 to-pink-500',     8, true),
  ('kids',        'أطفال',           'أطفال',           '🧸', 'from-pink-500 to-fuchsia-500',  9, true),
  ('fashion',     'أزياء',           'أزياء',           '👕', 'from-fuchsia-500 to-purple-500',10, true),
  ('beauty',      'العناية والجمال', 'العناية والجمال', '💄', 'from-pink-400 to-rose-500',    11, true),
  ('accessories', 'إكسسوارات',       'إكسسوارات',       '💎', 'from-cyan-500 to-sky-500',     12, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------- Products ----------
INSERT INTO public.products
  (slug, name, brand, category_id, description, features, image,
   price, old_price, rating, reviews_count, sales_count, featured, flash_sale, is_active, stock)
VALUES
  (
    'phone-x-pro', 'هاتف OMEX X Pro الذكي', 'OMEX',
    (SELECT id FROM public.categories WHERE slug = 'phones'),
    'هاتف OMEX X Pro بشاشة AMOLED مقاس 6.7 بوصة، معالج ثماني النواة، كاميرا 108 ميجابكسل، وبطارية 5000 مللي أمبير. تصميم فاخر وأداء استثنائي.',
    '["شاشة AMOLED 120Hz","معالج ثماني النواة","كاميرا 108MP + عدسة ماكرو","بطارية 5000mAh مع شحن سريع 65W","ذاكرة 256GB / 12GB RAM"]'::jsonb,
    '/products/product-phone.png', 189000, 245000, 4.8, 1284, 3210, true, true, true, 24
  ),
  (
    'headphones-air', 'سماعات OMEX Air اللاسلكية', 'OMEX',
    (SELECT id FROM public.categories WHERE slug = 'electronics'),
    'سماعات لاسلكية بعزل ضوضاء نشط، جودة صوت هاي فاي، وبطارية تدوم 40 ساعة.',
    '["عزل ضوضاء ANC","بلوتوث 5.3","بطارية 40 ساعة","شحن سريع USB-C"]'::jsonb,
    '/products/product-headphones.png', 42000, 65000, 4.7, 892, 2140, true, true, true, 58
  ),
  (
    'watch-galaxy', 'ساعة OMEX Galaxy الذكية', 'OMEX',
    (SELECT id FROM public.categories WHERE slug = 'smart'),
    'ساعة ذكية بشاشة AMOLED دائرية، قياس معدل ضربات القلب، ونسبة الأكسجين.',
    '["شاشة AMOLED دائرية","قياس ECG و SpO2","GPS مدمج","مقاومة ماء 5ATM"]'::jsonb,
    '/products/product-watch.png', 58000, 79000, 4.6, 512, 1420, true, true, true, 33
  ),
  (
    'laptop-pro', 'لابتوب OMEX Studio Pro', 'OMEX',
    (SELECT id FROM public.categories WHERE slug = 'electronics'),
    'لابتوب احترافي بمعالج قوي، شاشة 14 بوصة عالية الدقة، وبطارية تدوم طوال اليوم.',
    '["معالج M-Series","شاشة Retina 14 بوصة","SSD 512GB","بطارية 18 ساعة"]'::jsonb,
    '/products/product-laptop.png', 620000, 745000, 4.9, 341, 890, true, false, true, 12
  ),
  (
    'sneakers-flux', 'حذاء OMEX Flux الرياضي', 'OMEX',
    (SELECT id FROM public.categories WHERE slug = 'sports'),
    'حذاء رياضي بتصميم مستقبلي وإضاءة LED، مريح للاستخدام اليومي والجري.',
    '["إضاءة LED","نعل مرن مبتكر","خامة تسمح بالتهوية","خفيف الوزن"]'::jsonb,
    '/products/product-sneakers.png', 32000, 45000, 4.5, 623, 1780, false, true, true, 71
  ),
  (
    'drill-power', 'مثقاب OMEX Power الكهربائي', 'OMEX',
    (SELECT id FROM public.categories WHERE slug = 'tools'),
    'مثقاب كهربائي قوي بسرعتين متغيرتين، مناسب للاستخدام المنزلي والاحترافي.',
    '["قوة 850W","سرعتان متغيرتان","قبضة مطاطية مريحة","مع طقم لقم"]'::jsonb,
    '/products/product-drill.png', 28500, 39000, 4.7, 210, 540, false, false, true, 45
  ),
  (
    'speaker-boom', 'مكبر صوت OMEX Boom', 'OMEX',
    (SELECT id FROM public.categories WHERE slug = 'electronics'),
    'مكبر صوت بلوتوث محمول بجودة صوت غامرة ومقاومة للماء.',
    '["بلوتوث 5.2","مقاوم للماء IPX7","بطارية 24 ساعة","صوت 360°"]'::jsonb,
    '/products/product-speaker.png', 18500, 27000, 4.4, 456, 1120, false, false, true, 89
  )
ON CONFLICT (slug) DO NOTHING;

-- ---------- Inventory (mirror product stock) ----------
INSERT INTO public.inventory (product_id, stock, low_stock_threshold)
SELECT p.id, p.stock, 5
FROM public.products p
WHERE p.slug IN (
  'phone-x-pro','headphones-air','watch-galaxy','laptop-pro',
  'sneakers-flux','drill-power','speaker-boom'
)
ON CONFLICT (product_id) DO NOTHING;
