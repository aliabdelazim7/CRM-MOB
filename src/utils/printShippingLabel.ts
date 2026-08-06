import { escapeHtml } from './escapeHtml';
import { printDocument, AUTO_PRINT_SCRIPT } from './printWindow';
import { useStore } from '../store/useStore';

export interface ShippingLabelHeld {
  id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  shipping_note?: string | null;
  notes?: string | null;
  items?: any[];
  total: number;
  deposit?: number | null;
  deposit_split?: Record<string, number> | null;
  status?: string | null;
  created_at: string;
  cashier_name?: string | null;
  shipping_cost?: number;
}

export async function printShippingLabel(held: ShippingLabelHeld, settings: any): Promise<void> {
    const dep = Math.max(0, Number(held.deposit) || 0);
  const total = Number(held.total) || 0;
  const shippingCost = Number(held.shipping_cost) || 0;
  const due = Math.max(0, total - dep);
  
  // Extract order reference
  const orderRef = String(held.id).slice(-9).toUpperCase();
  // Barcode data for TR#
  const trBarcodeStr = `*${held.id}*`;
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(held.id)}&scale=2&height=10`;
  
  // Print Date
  const dateObj = new Date(held.created_at || new Date());
  const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const topDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Get products to find images
  const products = useStore.getState().products || [];

  // Generate Items Table HTML
  const itemsHtml = (held.items || []).map((it: any) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.sale_price) || 0;
    const prod = products.find(p => p.id === it.id);
    const imgUrl = prod?.image_url || '';
    
    // Fallback if no image is available
    const imgTag = imgUrl ? `<img src="${escapeHtml(imgUrl)}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" />` : `<div style="width:40px;height:40px;background:#eee;border-radius:4px;"></div>`;
    
    return `
      <tr>
        <td style="text-align:center;font-weight:900;">00</td>
        <td style="text-align:center;font-weight:900;">${(price * qty).toFixed(0)}</td>
        <td style="text-align:center;font-weight:900;">00</td>
        <td style="text-align:center;font-weight:900;">${price.toFixed(0)}</td>
        <td style="text-align:center;font-weight:900;">${qty}</td>
        <td style="text-align:right;font-weight:900;display:flex;align-items:center;justify-content:flex-end;gap:5px;">
           <span style="font-size:11px;">${escapeHtml(it.name || '')}</span>
           ${imgTag}
        </td>
      </tr>`;
  }).join('');

  // QR Code for Tracking
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(held.id)}`;
  const topQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(orderRef)}`;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>بوليصة شحن #${escapeHtml(orderRef)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif;}
  body{background:#fff;color:#000;margin:0;}
  
  /* A4/A5 responsive container for Waybill */
  .waybill-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background: #fff;
  }

  .top-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .left-col {
    width: 48%;
    font-size: 14px;
    font-weight: 900;
  }

  .right-col {
    width: 48%;
    text-align: right;
    font-size: 14px;
  }

  .store-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin-bottom: 5px;
  }
  .store-header h2 { margin:0; font-size: 18px; font-weight: 900; }
  .store-logo { width: 50px; height: 50px; object-fit: contain; }

  .customer-name-large { font-size: 22px; font-weight: 900; margin: 10px 0; }
  .address-large { font-size: 18px; font-weight: 900; line-height: 1.3; margin-bottom: 15px;}
  .country-text { font-size: 16px; font-weight: 900; text-transform: uppercase; font-family: sans-serif; }

  .barcode-box { margin-top: 5px; text-align: left; }
  .barcode-img { width: 100%; max-height: 70px; display:block; margin: 5px 0; }
  .barcode-text { font-family: monospace; font-size: 12px; font-weight: 900; text-align: center; display: block; margin-bottom: 10px; }

  .info-line { display: flex; align-items: center; justify-content: flex-start; gap: 5px; font-weight: 900; font-size: 13px; margin-bottom: 3px; direction: ltr; }
  .info-line span.ar { direction: rtl; margin-left: 5px; }

  .middle-divider {
    display: flex;
    align-items: center;
    margin: 15px 0;
  }
  .middle-divider::before, .middle-divider::after {
    content: '';
    flex: 1;
    border-bottom: 2px solid #000;
  }
  .middle-divider span {
    padding: 0 10px;
    font-size: 16px;
    line-height: 1;
  }

  .delivery-inst {
    font-size: 12px;
    font-family: sans-serif;
    text-align: left;
    margin-bottom: 2px;
    font-weight: 900;
  }

  .ship-box {
    border: 2px solid #000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    margin-bottom: 15px;
  }

  .ship-box-col {
    text-align: center;
    font-family: sans-serif;
  }
  .ship-box-col .lbl { font-size: 14px; font-weight: 900; margin-bottom: 5px; }
  .ship-box-col .val { font-size: 18px; font-weight: 900; }
  
  .shipper-box {
    border-right: 2px solid #000;
    padding-right: 15px;
    text-align: center;
  }

  .cut-line {
    border-top: 1px dashed #000;
    text-align: right;
    margin: 15px 0;
    position: relative;
  }
  .cut-line span {
    position: absolute;
    right: 0;
    top: -10px;
    background: #fff;
    padding-left: 10px;
    font-family: sans-serif;
    font-weight: 900;
    font-size: 12px;
  }
  .cut-icon {
    position: absolute;
    left: 50%;
    top: -12px;
    background: #fff;
    padding: 0 5px;
    font-size: 16px;
  }

  .pkg-details { font-family: sans-serif; font-weight: 900; font-size: 14px; text-align: left; margin-bottom: 5px; }

  table { width: 100%; border-collapse: collapse; border: 2px solid #000; text-align: center; }
  th, td { border: 2px solid #000; padding: 5px; font-weight: 900; font-size: 13px; }
  th { font-size: 12px; }

  .totals-footer {
    text-align: left;
    margin-top: 15px;
    font-size: 18px;
    font-weight: 900;
    direction: ltr;
  }
  .totals-footer .ar {
    direction: rtl;
    display: inline-block;
    text-align: right;
  }

  .social-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 40px;
  }
  .social-col { display: flex; flex-direction: column; gap: 5px; font-family: sans-serif; font-weight: 900; font-size: 14px; }
  .social-item { display: flex; align-items: center; gap: 5px; direction: ltr; }
  
  .thank-you {
    text-align: center;
    font-family: 'Brush Script MT', cursive, sans-serif;
  }
  .thank-you h1 { font-size: 48px; line-height: 0.8; margin: 0; }
  .thank-you p { font-size: 14px; font-family: sans-serif; font-weight: 900; margin-top: 10px; }

  @media print {
    @page { size: A4 auto; margin: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .waybill-container { width: 100%; max-width: 100%; padding: 15mm; }
  }
</style>
</head>
<body>
<div class="waybill-container">
  
  <div class="top-section">
    <!-- Left Column -->
    <div class="left-col">
      <div style="font-family: sans-serif; text-align:left;">${topDate}</div>
      <div style="font-family: sans-serif; text-align:left; margin-bottom: 20px;">#${escapeHtml(held.customer_phone || '+20000000000')}</div>
      
      <div style="display:flex; gap: 15px;">
        <div style="flex:1;">
          <div class="customer-name-large">الاسم : ${escapeHtml(held.customer_name || 'عميل')}</div>
          <div class="address-large">العنوان : ${escapeHtml(held.customer_address || '—')}</div>
          <div class="country-text" style="text-align:left;">EGYPT</div>
          
          <div style="margin-top: 30px; text-align:left; font-family: sans-serif;">
            Vendor :<br/>${escapeHtml(settings?.name || 'Hances')}
          </div>
        </div>
        <div>
          <div style="font-family:sans-serif; text-align:center; margin-bottom:2px;">${escapeHtml(held.id.split('-')[0] || 'EG-VAR')}</div>
          <img src="${topQrCodeUrl}" style="width:80px;height:80px;" />
        </div>
      </div>
    </div>

    <!-- Right Column -->
    <div class="right-col">
      <div class="store-header">
        <h2>${escapeHtml(settings?.name || 'Hances')} | التحكم في الطلبات</h2>
        ${settings?.logo ? `<img class="store-logo" src="${escapeHtml(settings.logo)}" />` : ''}
      </div>
      
      <div style="font-weight: 900; margin-bottom: 5px;">اسم العميل : ${escapeHtml(held.customer_name || 'عميل')}</div>
      
      <div style="font-weight: 900; font-family: sans-serif; text-align: left; direction: ltr;">TR#:</div>
      <div class="barcode-box">
        <img src="${barcodeUrl}" class="barcode-img" />
        <span class="barcode-text">${trBarcodeStr}</span>
      </div>

      <div class="info-line"><span>Amount : </span><span>${due.toFixed(2)} PRE</span></div>
      <div class="info-line"><span>Signature: </span><span style="text-transform:uppercase;">${escapeHtml(settings?.name || 'HANCES')}</span></div>
      
      <div style="font-weight: 900; margin-top: 15px;">المرسل اليه : ${escapeHtml(held.customer_name || 'عميل')}</div>
    </div>
  </div>

  <div class="middle-divider">
    <span>✦</span><span>✦</span>
  </div>

  <div class="delivery-inst">Delivery Instructions</div>
  
  <div class="ship-box">
    <div class="shipper-box">
      <div style="font-weight: 900; margin-bottom: 5px;">shipper:</div>
      <div style="font-weight: 900;">${escapeHtml(settings?.name || 'Hances')}</div>
      ${settings?.logo ? `<img src="${escapeHtml(settings.logo)}" style="height:40px; margin-top:5px;" />` : ''}
      <div style="font-family:sans-serif; font-weight:900;">${escapeHtml(settings?.name || 'HANCES').toUpperCase()}</div>
    </div>
    
    <div class="ship-box-col" style="direction: ltr;">
      <div class="lbl">Order #:</div>
      <div class="val">${escapeHtml(orderRef)}</div>
    </div>
    
    <div class="ship-box-col" style="direction: ltr;">
      <div class="lbl">Ship D/T:</div>
      <div class="val">${formattedDate}</div>
    </div>
    
    <div class="ship-box-col" style="direction: ltr;">
      <div class="lbl">Weight:</div>
      <div class="val" style="direction: rtl;">1.00 كجم</div>
    </div>
    
    <div class="ship-box-col" style="text-align:center;">
      <div style="font-size:10px; font-weight:900; font-family:sans-serif;">QR CODE</div>
      <img src="${qrCodeUrl}" style="width:50px;height:50px;" />
    </div>
  </div>

  <div class="cut-line">
    <div class="cut-icon">✂</div>
    <span>Cut here incase of return_</span>
  </div>

  <div class="pkg-details">Package Details:</div>
  
  <table>
    <thead>
      <tr>
        <th>إجمالي المرتجع<br/>مصاريف الشحن</th>
        <th>إجمالي السعر بدون<br/>رسوم الشحن</th>
        <th>سعر الخصم</th>
        <th>سعر الصنف</th>
        <th>العدد</th>
        <th>اسم الصنف</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals-footer">
    <div class="ar">
      سعر الشحن : ${shippingCost.toFixed(1)}<br/>
      المجموع المراد تحصيله<br/>
      ${due.toFixed(0)} : ( شامل الضريبية )<br/>
    </div>
    <div style="margin-top: 5px;">PRE</div>
  </div>

  <div class="social-footer">
    <div class="social-col">
      <div class="social-item">
        <span style="font-size:18px;">📘</span> ${escapeHtml(settings?.name || 'Hances')}
      </div>
      <div class="social-item">
        <span style="font-size:18px;">📸</span> @${escapeHtml(settings?.name || 'Hances')}
      </div>
      <div class="social-item">
        <span style="font-size:18px;">💬</span> ${escapeHtml(settings?.phone || '')}
      </div>
      ${settings?.phone2 ? `<div class="social-item"><span style="font-size:18px;">💬</span> ${escapeHtml(settings.phone2)}</div>` : ''}
    </div>
    
    <div class="thank-you">
      <h1 style="font-family: 'Brush Script MT', cursive, serif;">Thank<br/>You</h1>
      <p>"Hoping To See You Again"</p>
    </div>
  </div>

</div>
${AUTO_PRINT_SCRIPT}
</body></html>`;
  
  void printDocument('invoice', html);
}
