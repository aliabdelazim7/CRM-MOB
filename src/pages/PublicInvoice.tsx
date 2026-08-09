import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Order, StoreSettings } from '../store/useStore';
import { Printer, Download, Phone, MapPin } from 'lucide-react';
// html2canvas-pro يدعم ألوان oklch() في Tailwind v4 (النسخة الأصلية تفشل معها).
import html2canvas from 'html2canvas-pro';
import { calculateOrderReturnValue } from '../utils/returns';


export default function PublicInvoice() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFormat, setViewFormat] = useState<'thermal' | 'a4'>('thermal');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // The public page has no Supabase session, so it cannot read the tables
        // directly (they are locked to authenticated users). Instead it calls a
        // single SECURITY DEFINER function that returns just this one invoice.
        const { data: rpc, error: rpcErr } = await supabase.rpc('get_public_invoice', { p_id: id });
        if (rpcErr) throw rpcErr;
        if (!rpc) throw new Error('Invoice not found');

        const s = rpc.settings;
        if (s) {
          setSettings({
            name: s.name,
            currency: s.currency,
            logo: s.logo,
            taxRate: s.tax_rate,
            themeColor: s.theme_color,
            address: s.address,
            phone: s.phone,
            phone2: s.phone2,
            whatsappCountryCode: s.whatsapp_country_code,
            initial_balance: s.initial_balance,
            locationUrl: s.location_url,
            taxNumber: s.tax_number || s.tax_id || '',
            commercialRecord: s.commercial_record || '',
            defaultInvoiceFormat: s.default_invoice_format === 'a4' ? 'a4' : 'thermal'
          });
          if (s.default_invoice_format === 'a4' || s.default_invoice_format === 'thermal') {
            setViewFormat(s.default_invoice_format);
          }
        }

        // Sale order
        const o = rpc.kind === 'order' ? rpc.order : null;

        if (o) {
          const itemRows = (o.order_items as any[]) ?? [];
          const items = itemRows.map((i: any) => ({
            id: i.product_id,
            name: i.product_name || i.products?.name || 'منتج غير معروف',
            quantity: i.quantity,
            sale_price: i.sale_price,
            regular_price: i.products?.sale_price,
            discount_price: i.products?.discount_price,
            returned_quantity: i.returned_quantity || 0,
          }));

          let debtBefore = 0;
          let debtAfter = 0;
          let currentDebt = 0;
          if (o.customer_id) {
            const allCustOrders = (rpc.customer_orders ?? []) as any[];
            
            if (allCustOrders) {
              const sortedOrders = [...allCustOrders].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              const calculateDebtForOrders = (ordersList: any[]) => {
                return Math.max(0, ordersList.reduce((sum, ord) => {
                  if (ord.type === 'payment' && ord.notes?.includes('سداد أجل للفاتورة رقم')) {
                    return sum;
                  }
                  const items = (ord.order_items as any[])?.map((i: any) => ({
                    quantity: i.quantity,
                    sale_price: i.sale_price,
                    returned_quantity: i.returned_quantity || 0,
                    refunded_amount: i.refunded_amount || 0
                  })) || [];
                  
                  const returnedValue = calculateOrderReturnValue({ ...ord, items });
                  const effectiveTotal = ord.type === 'payment' ? 0 : ord.total - returnedValue;
                  return sum + (effectiveTotal - ord.paid_amount);
                }, 0));
              };

              const oIndex = sortedOrders.findIndex(ord => ord.id === o.id);
              const ordersBefore = oIndex !== -1 ? sortedOrders.slice(0, oIndex) : [];
              debtBefore = calculateDebtForOrders(ordersBefore);
              
              const ordersUpTo = oIndex !== -1 ? sortedOrders.slice(0, oIndex + 1) : (o.is_deleted ? [] : [o]);
              debtAfter = calculateDebtForOrders(ordersUpTo);
              currentDebt = calculateDebtForOrders(sortedOrders);
            }
          }


          setOrder({
            id: o.id,
            total: o.total,
            paid_amount: o.paid_amount,
            paid_cash: o.paid_cash,
            paid_visa: o.paid_visa,
            paid_wallet: o.paid_wallet,
            paid_instapay: o.paid_instapay,
            type: o.type,
            payment_method: o.payment_method,
            date: o.created_at,
            items,
            cashier_name: o.cashier_name,
            salesperson_name: o.salesperson_name,
            notes: o.notes,
            coupon_code: o.coupon_code,
            discount_amount: o.discount || 0,
            debtBefore,
            debtAfter,
            currentDebt,
            originType: 'sale',
            customer: o.customers ? { 
              id: o.customers.id, 
              name: o.customers.name, 
              phone: o.customers.phone, 
              custom_id: o.customers.custom_id,
              timestamp: o.customers.created_at 
            } : undefined
          } as any);
          return;
        }

        // Maintenance appointment if not a sale order
        if (!o) {
          const appt = rpc.kind === 'maintenance' ? rpc.appointment : null;

          if (appt) {
            const apptOrders = (rpc.appointment_orders ?? []) as any[];

            const linkedOrders = (apptOrders ?? []).filter(ord => 
              (ord.notes || '').includes(`[زيارة:${appt.id}]`) || 
              (ord.order_items as any[])?.some(i => i.product_id?.startsWith(`maint-${appt.id}`))
            );

            const items = linkedOrders.flatMap(ord => {
              const itemRows = (ord.order_items as any[]) ?? [];
              if (itemRows.length === 0) {
                const name = (ord.notes || '').replace(/\[زيارة:[^\]]+\]/g, '').trim() || 'إيراد صيانة';
                return [{
                  id: `virtual-${ord.id}`,
                  name,
                  quantity: 1,
                  sale_price: ord.total || ord.paid_amount || 0,
                  returned_quantity: 0
                }];
              }
              return itemRows.map((i: any) => ({
                id: i.product_id,
                name: i.product_name || i.products?.name || 'منتج غير معروف',
                quantity: i.quantity,
                sale_price: i.sale_price,
                returned_quantity: i.returned_quantity || 0,
              }));
            });

            const grandTotal = items.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
            const car = appt.car_subscriptions;

            setOrder({
              id: appt.id,
              total: grandTotal,
              paid_amount: grandTotal,
              paid_cash: linkedOrders[0]?.payment_method === 'cash' ? grandTotal : 0,
              paid_visa: linkedOrders[0]?.payment_method === 'visa' ? grandTotal : 0,
              paid_wallet: linkedOrders[0]?.payment_method === 'wallet' ? grandTotal : 0,
              paid_instapay: linkedOrders[0]?.payment_method === 'instapay' ? grandTotal : 0,
              type: 'sale',
              payment_method: linkedOrders[0]?.payment_method || 'cash',
              date: appt.appointment_date || appt.created_at,
              items,
              originType: 'sale',
              notes: appt.report || appt.description || '',
              customer: car ? {
                id: car.id,
                name: car.customer_name,
                phone: car.customer_phone,
                custom_id: car.car_number,
                timestamp: car.created_at
              } : undefined
            } as any);
            return;
          }
        }

        // Purchase invoice
        const inv = rpc.kind === 'purchase' ? rpc.purchase : null;

        if (inv) {
          const itemRows = (inv.purchase_items as any[]) ?? [];
          const items = itemRows.map((i: any) => ({
            id: i.product_id,
            name: i.products?.name || 'منتج غير معروف',
            quantity: i.quantity,
            sale_price: i.purchase_price,
            returned_quantity: 0
          }));

          setOrder({
            id: inv.invoice_number || inv.id,
            total: inv.total,
            paid_amount: inv.paid_amount,
            paid_cash: inv.paid_cash,
            paid_visa: inv.paid_visa,
            paid_wallet: inv.paid_wallet,
            paid_instapay: inv.paid_instapay,
            type: inv.total === 0 ? 'payment' : 'sale',
            payment_method: inv.payment_method,
            date: inv.created_at,
            items,
            originType: 'purchase',
            supplier: inv.suppliers ? {
              name: inv.suppliers.name,
              phone: inv.suppliers.phone
            } : undefined
          } as any);
          return;
        }

        throw new Error('Invoice not found');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  const downloadAsImage = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `invoice-${order?.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) return (
    <div className="force-light min-h-screen flex items-center justify-center bg-slate-50">
      <div className="relative w-20 h-20" role="status" aria-label="جاري التحميل">
        <img src="/logo.svg" alt="" className="absolute inset-2.5 w-15 h-15 rounded-xl shadow-sm" style={{ width: 60, height: 60 }} />
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
      </div>
    </div>
  );

  if (error || !order || !settings) return (
    <div className="force-light min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-black text-slate-800">عذراً، الفاتورة غير موجودة</h1>
      <p className="text-slate-500 mt-2">يرجى التأكد من الرابط الصحيح.</p>
    </div>
  );

  const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0);

  let displayCash = order.paid_cash || 0;
  let displayVisa = order.paid_visa || 0;
  let displayWallet = order.paid_wallet || 0;
  let displayInstapay = order.paid_instapay || 0;
  let displayMethod5 = order.paid_method5 || 0;
  let displayMethod6 = order.paid_method6 || 0;

  if (displayCash === 0 && displayVisa === 0 && displayWallet === 0 && displayInstapay === 0 && displayMethod5 === 0 && displayMethod6 === 0 && order.paid_amount > 0) {
    const method = (order.payment_method || 'cash').toLowerCase();
    if (method === 'visa') {
      displayVisa = order.paid_amount;
    } else if (method === 'wallet' || method === 'vodafone') {
      displayWallet = order.paid_amount;
    } else if (method === 'instapay') {
      displayInstapay = order.paid_amount;
    } else if (method === 'method5') {
      displayMethod5 = order.paid_amount;
    } else if (method === 'method6') {
      displayMethod6 = order.paid_amount;
    } else {
      displayCash = order.paid_amount;
    }
  }


  return (
    <div className="force-light min-h-screen bg-slate-100 py-4 sm:py-8 px-2 sm:px-4 font-sans flex flex-col items-center gap-4 sm:gap-6" dir="rtl">
      
      {/* Format Selector & Action Buttons */}
      <div className="flex flex-col items-center gap-3 no-print w-full max-w-2xl">
        <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner border border-slate-300 dark:border-slate-700">
          <button
            onClick={() => setViewFormat('thermal')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition ${
              viewFormat === 'thermal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-700 dark:text-slate-300 hover:text-black'
            }`}
          >
            🧾 فاتورة الكاشير (ريسيت حراري 72mm)
          </button>
          <button
            onClick={() => setViewFormat('a4')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition ${
              viewFormat === 'a4'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-700 dark:text-slate-300 hover:text-black'
            }`}
          >
            📄 فاتورة A4 كاملة
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full justify-center">
          <button onClick={() => window.print()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black shadow-md hover:bg-slate-800 transition text-xs">
            <Printer size={16} /> طباعة ({viewFormat === 'thermal' ? 'حراري 72mm' : 'A4'})
          </button>
          <button onClick={downloadAsImage} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black shadow-md hover:bg-indigo-700 transition text-xs">
            <Download size={16} /> حفظ كصورة
          </button>
          <a 
            href={`tel:${settings.phone}`} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black shadow-md hover:bg-emerald-700 transition text-xs"
          >
            <Phone size={16} /> اتصل بنا
          </a>
          {settings.locationUrl && (
            <a 
              href={settings.locationUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-black shadow-md hover:bg-sky-700 transition text-xs"
            >
              <MapPin size={16} /> المقر
            </a>
          )}
        </div>
      </div>

      {/* Invoice Area: Render Thermal Cashier Receipt or Full A4 Card */}
      {viewFormat === 'thermal' ? (
        <div id="invoice-print-area" className="bg-white w-full max-w-[76mm] shadow-2xl rounded-2xl p-4 border border-slate-300 text-slate-900 font-sans text-right space-y-2.5">
          {/* Cashier Receipt Header */}
          <div className="text-center border-b border-dashed border-slate-400 pb-3">
            {settings.logo && (
              <img src={settings.logo} alt="Logo" className="h-12 w-auto mx-auto mb-1 object-contain" />
            )}
            <h2 className="text-lg font-black text-slate-900 leading-tight">{settings.name}</h2>
            {settings.address && <p className="text-[10px] font-bold text-slate-600 mt-0.5">{settings.address}</p>}
            {(settings.phone || settings.phone2) && (
              <p className="text-[10px] font-bold text-slate-600 font-mono mt-0.5" dir="ltr">
                {settings.phone2 ? `${settings.phone2} | ${settings.phone}` : settings.phone}
              </p>
            )}
            {settings.taxNumber && (
              <p className="text-[10px] font-black text-slate-900 font-mono mt-0.5" dir="ltr">
                الرقم الضريبي: {settings.taxNumber} 🏛️
              </p>
            )}
            <div className="mt-2 inline-block bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black">
              إيصال مبيعات الكاشير
            </div>
          </div>

          {/* Details Metadata */}
          <div className="space-y-1 text-xs font-bold border-b border-dashed border-slate-400 pb-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم الفاتورة:</span>
              <span className="font-mono font-black text-slate-900">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">التاريخ:</span>
              <span className="font-bold">{new Date(order.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">التوقيت:</span>
              <span className="font-bold">{new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">العميل:</span>
              <span className="font-black">{order.customer?.name || 'عميل نقدي'}</span>
            </div>
            {order.customer?.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">الهاتف:</span>
                <span className="font-mono">{order.customer.phone}</span>
              </div>
            )}
          </div>

          {/* Product Items Table */}
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-900 font-black text-[11px]">
                <th className="py-1.5 text-right">الصنف</th>
                <th className="py-1.5 text-center">الكمية</th>
                <th className="py-1.5 text-center">السعر</th>
                <th className="py-1.5 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-slate-300">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 font-bold text-slate-800">{item.name}</td>
                  <td className="py-1.5 text-center font-black text-slate-900">{item.quantity}</td>
                  <td className="py-1.5 text-center font-mono">{item.sale_price.toFixed(2)}</td>
                  <td className="py-1.5 text-left font-black text-slate-900">{(item.quantity * item.sale_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="border-t-2 border-slate-900 pt-2 space-y-1 text-xs font-bold">
            <div className="flex justify-between text-slate-600">
              <span>المجموع الفرعي:</span>
              <span className="font-mono">{subtotal.toFixed(2)} {settings.currency}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t border-b border-slate-900 py-1.5 my-1 bg-slate-50 px-1">
              <span>الإجمالي النهائي:</span>
              <span className="text-lg font-black">{order.total.toFixed(2)} {settings.currency}</span>
            </div>
            
            <div className="p-2 rounded-xl text-center font-black text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 mt-2">
              {order.paid_amount >= order.total ? '✅ تم السداد بالكامل' : `متبقي آجل: ${(order.total - order.paid_amount).toFixed(2)} ${settings.currency}`}
            </div>
          </div>

          {/* Barcode & Footer */}
          <div className="text-center border-t border-dashed border-slate-400 pt-2.5 space-y-1">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.href)}`} 
              alt="QR Code" 
              className="w-20 h-20 mx-auto"
            />
            <p className="text-[10px] text-slate-600 font-bold italic pt-1">
              شكراً لزيارتكم - {settings.name} ترحب بكم دائماً
            </p>
          </div>
        </div>
      ) : (
        /* Full A4 Waybill Invoice View matching فاتوره.pdf */
        <div id="invoice-print-area" className="bg-white w-full max-w-4xl shadow-2xl rounded-3xl overflow-hidden border border-slate-300 p-6 md:p-10 font-sans text-black" dir="rtl">
          {/* Top Date & Time */}
          <div className="text-xs font-bold font-mono mb-2" dir="ltr">
            {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '\\') + ', ' + new Date(order.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b-2 border-black">
            {/* Left Box: Customer Info */}
            <div className="space-y-2 text-right">
              <div className="font-bold text-sm font-mono" dir="ltr">#.{order.customer?.phone || settings.phone || '+201008451142'}</div>
              
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="text-xl md:text-2xl font-black">الاسم : {order.customer?.name || 'عميل نقدي'}</div>
                  <div className="text-base font-black text-slate-800">
                    العنوان : {(order.customer as any)?.address || settings.address || 'القاهرة - مصر'}
                  </div>
                  <div className="text-xs font-black font-mono text-slate-600 uppercase">
                    EL FAYUM <br/> EGYPT
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[10px] font-black font-mono">EG-VAR-R2S</span>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}`}
                    alt="QR"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>

              <div className="text-xs font-bold text-slate-700">
                Vendor : <br/> <span className="font-black text-sm">{settings.name || 'Hances'}</span>
              </div>
            </div>

            {/* Right Box: Store Title & Barcode Block */}
            <div className="text-right space-y-2">
              <div className="text-lg md:text-xl font-black flex items-center justify-end gap-2">
                <span>{settings.name || 'Hànces.11'} | التحكم في الطلبات</span>
                <div className="w-8 h-8 bg-black text-white font-serif font-black text-xl rounded flex items-center justify-center">H</div>
              </div>

              <div className="text-base font-black">أسم العميل : {order.customer?.name || 'عميل نقدي'}</div>
              <div className="text-sm font-black font-mono">TR#:</div>

              {/* Barcode wrapper */}
              <div className="text-center bg-slate-50 p-2 rounded-xl border border-slate-300 my-2">
                <img
                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(order.id || 'HANCES-ORDER')}&scale=3&height=14&inkcolor=000000`}
                  alt="Barcode"
                  className="h-10 mx-auto object-contain max-w-full"
                />
                <span className="text-xs font-mono font-black block mt-1">
                  *DS-2SN-{String(order.id).slice(-9)}-3906*
                </span>
              </div>

              <div className="text-xs font-black space-y-1">
                <div>Amount : <span className="font-mono text-sm">{(order.total - order.paid_amount).toFixed(2)} PRE</span></div>
                <div>Signature: <span className="font-mono">{settings.name ? settings.name.toUpperCase() : 'HANCES'}</span></div>
                <div>المرسل اليه : {order.customer?.name || 'عميل نقدي'}</div>
              </div>
            </div>
          </div>

          {/* Decorative Diamond Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-black"></div></div>
            <div className="relative inline-flex justify-between w-4/5 px-4 bg-white font-black text-lg">
              <span>✦</span>
              <span>✦</span>
            </div>
          </div>

          <div className="text-xs font-bold font-mono mb-2">Delivery Insturctions</div>

          {/* Shipper Info Table Box */}
          <div className="border-2 border-black rounded-lg overflow-hidden mb-4 grid grid-cols-2 md:grid-cols-5 text-center divide-x divide-y md:divide-y-0 divide-black text-xs font-black">
            <div className="p-2 text-right">
              <div className="text-[10px] text-slate-500 font-mono">shipper:</div>
              <div className="text-sm font-black">{settings.name || 'Hànces.11'}</div>
              <div className="text-xl font-black font-serif">H</div>
              <div className="text-xs font-mono">HANCES</div>
            </div>
            <div className="p-2 flex flex-col justify-center">
              <div className="text-slate-500 font-mono text-[11px]">Order #:</div>
              <div className="text-sm font-mono font-black">#{order.id}</div>
            </div>
            <div className="p-2 flex flex-col justify-center">
              <div className="text-slate-500 font-mono text-[11px]">Ship D/T:</div>
              <div className="text-xs font-mono font-black">
                {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
            <div className="p-2 flex flex-col justify-center">
              <div className="text-slate-500 font-mono text-[11px]">Weight:</div>
              <div className="text-xs font-black">كجم 5.00</div>
            </div>
            <div className="p-2 flex flex-col items-center justify-center col-span-2 md:col-span-1">
              <div className="text-[10px] font-mono font-black mb-1">QR CODE</div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(order.id)}`}
                alt="QR"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>

          {/* Cut Line */}
          <div className="relative border-t-2 border-dashed border-black my-5 text-center">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-sm font-black">✂</span>
            <span className="absolute -top-3 right-0 bg-white pl-2 text-xs font-bold font-mono">Cut here incase of return_</span>
          </div>

          <div className="text-xs font-black font-mono mb-2">Package Details:</div>

          {/* Package Details Table */}
          <div className="border-2 border-black rounded-lg overflow-hidden mb-4">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-black text-black font-black text-center">
                  <th className="p-2 border-r-2 border-black text-right w-2/5">أسم الصنف</th>
                  <th className="p-2 border-r-2 border-black">العدد</th>
                  <th className="p-2 border-r-2 border-black">سعر الصنف</th>
                  <th className="p-2 border-r-2 border-black">سعر الخصم</th>
                  <th className="p-2 border-r-2 border-black">إجمالي السعر بدون<br/>رسوم الشحن</th>
                  <th className="p-2">أجمالي السعر مع<br/>مصاريف الشحن</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black font-bold">
                {order.items.map((item, idx) => {
                  const qty = item.quantity || 1;
                  const price = item.sale_price || 0;
                  const itemTotal = price * qty;
                  return (
                    <tr key={idx} className="text-center">
                      <td className="p-2 border-r-2 border-black text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-black text-sm">{item.name}</span>
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded border border-slate-300 shadow-sm"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-2 border-r-2 border-black font-black text-sm">{qty}</td>
                      <td className="p-2 border-r-2 border-black font-mono">{price.toFixed(0)}</td>
                      <td className="p-2 border-r-2 border-black font-mono">00</td>
                      <td className="p-2 border-r-2 border-black font-mono font-black">{itemTotal.toFixed(0)}</td>
                      <td className="p-2 font-mono">00</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="text-right text-base font-black space-y-1 my-4">
            <div>سعر الشحن : 50.0</div>
            <div>المجموع المراد تحصيله</div>
            <div className="text-xl">{order.total.toFixed(0)} : ( شامل الضريبية)</div>
            <div className="font-mono text-sm">PRE</div>
          </div>

          {/* Footer Socials & Thank You */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-4 border-t border-slate-200 mt-6">
            <div className="space-y-1.5 text-xs font-black">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 text-lg">🔵</span>
                <span>{settings.name || 'Hànces'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-pink-600 text-lg">📷</span>
                <span>@{settings.name ? settings.name.replace(/\s+/g, '') : 'Hances.11'}</span>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <span className="text-emerald-600 text-lg">💬</span>
                <span>{settings.phone || '+201149009410'} {settings.phone2 ? `- ${settings.phone2}` : ''}</span>
              </div>
            </div>

            <div className="text-center">
              <div className="font-serif italic text-4xl font-normal leading-none">Thank<br/>You</div>
              <div className="text-xs font-serif italic font-bold mt-1">“Hoping To See You Again”</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body { background: white; padding: 0; }
          .no-print { display: none; }
          .min-h-screen { background: white; padding: 0; min-height: auto; }
          #invoice-print-area { 
            box-shadow: none; 
            border: none; 
            padding: 8mm; 
            margin: 0 auto; 
            width: 148mm; 
            min-height: 205mm; 
            border-radius: 0;
          }
          #invoice-print-area table th, #invoice-print-area table td {
            padding: 8px 4px;
          }
        }
        @media (max-width: 640px) {
          #invoice-print-area {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
