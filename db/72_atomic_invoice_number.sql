-- ADRIA — ترقيم الفواتير الذرّي + إصلاح العدّاد المتأخّر.
-- آمن للتشغيل أكتر من مرة.
--
-- المشكلة اللي بيحلّها: «عذراً، رقم الفاتورة مستخدم حالياً (N)».
--
-- الكود كان بياخد الرقم على خطوتين:
--     select current_value from invoice_counter;   -- قراءة
--     update invoice_counter set current_value = current_value + 1;  -- كتابة
-- ده **مش ذرّي** رغم إن التعليق في الكود كان مكتوب فيه "Atomic approach":
--   • كاشيرين بيقروا في نفس اللحظة → الاتنين بياخدوا نفس الرقم.
--   • لو الـUPDATE فشل لأي سبب، العدّاد بيفضل مكانه فكل بيعة بعد كده بتحاول
--     تاخد نفس الرقم المستخدم — والكاشير بيقف تماماً عن البيع.
--   • أي سكربت seed/reset بيرجّع العدّاد لـ 1 والأوردرات لسه موجودة → نفس القفلة.
--
-- الحل: دالة بتزوّد وترجّع في statement واحد. Postgres بياخد قفل على الصف
-- طول الـUPDATE، فمفيش نافذة يقدر عميل تاني يقرا فيها نفس القيمة.

-- ── 1) مزامنة العدّاد مع أكبر رقم فاتورة موجود فعلاً ────────────────────────
-- ده بيصلّح الحالة الحالية: العدّاد بيرجع لـ 1 بعد الـ seed والأوردرات لسه هناك.
-- بنعدّي الصفوف اللي id بتاعها مش رقم (لو فيه بيانات قديمة بصيغة مختلفة).
update invoice_counter
set current_value = greatest(
  coalesce((select max(id::bigint) from orders where id ~ '^[0-9]+$'), 0) + 1,
  current_value
)
where id = 1;

-- ── 2) الدالة الذرّية ───────────────────────────────────────────────────────
create or replace function next_invoice_number()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  -- UPDATE ... RETURNING في statement واحد = ذرّي. الصف مقفول لحد ما ينتهي.
  update invoice_counter
  set current_value = current_value + 1
  where id = 1
  returning current_value - 1 into v;

  if v is null then
    -- الصف مش موجود (قاعدة بيانات ناقصة) — بننشئه من أكبر رقم فاتورة.
    insert into invoice_counter (id, current_value)
    values (1, coalesce((select max(id::bigint) from orders where id ~ '^[0-9]+$'), 0) + 2)
    on conflict (id) do update set current_value = excluded.current_value
    returning current_value - 1 into v;
  end if;

  -- حزام أمان: لو العدّاد لسه متأخّر عن الواقع (seed مثلاً)، بنقفز فوق
  -- المستخدم بدل ما نرجّع رقم هيصطدم.
  while exists (select 1 from orders where id = v::text) loop
    update invoice_counter
    set current_value = current_value + 1
    where id = 1
    returning current_value - 1 into v;
  end loop;

  return v;
end;
$$;

grant execute on function next_invoice_number() to authenticated;

-- ── 3) تحديث schema cache بتاع PostgREST عشان يشوف الدالة ──────────────────
notify pgrst, 'reload schema';

-- ── 4) تأكيد ────────────────────────────────────────────────────────────────
select
  (select current_value from invoice_counter where id = 1) as "العدّاد دلوقتي",
  (select coalesce(max(id::bigint), 0) from orders where id ~ '^[0-9]+$') as "أكبر رقم فاتورة",
  case
    when (select current_value from invoice_counter where id = 1)
       > (select coalesce(max(id::bigint), 0) from orders where id ~ '^[0-9]+$')
    then 'تمام ✅'
    else 'لسه متأخّر ❌'
  end as "الحالة";
