-- OMEX — real flash-sale deadlines.
-- The homepage countdown used to tick to midnight with nothing actually
-- ending. flash_ends_at gives every flash product an admin-controlled,
-- honest deadline: the storefront counts down to it and hides the offer
-- automatically once it passes (null = flash with no deadline, preserving
-- the previous always-on behavior).

alter table public.products
  add column if not exists flash_ends_at timestamptz;

comment on column public.products.flash_ends_at is
  'When the flash sale ends; null = no deadline. Storefront hides expired flash offers automatically.';

-- Make the currently-flagged flash products honest immediately:
-- give them a real 3-day window (the admin can change it per product).
update public.products
   set flash_ends_at = now() + interval '3 days'
 where flash_sale
   and flash_ends_at is null;
