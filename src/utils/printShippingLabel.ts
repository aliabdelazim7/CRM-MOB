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
  weight?: number | string;
  shipper_name?: string;
  vendor_name?: string;
}

export async function printShippingLabel(held: ShippingLabelHeld, settings: any): Promise<void> {
  const dep = Math.max(0, Number(held.deposit) || 0);
  const total = Number(held.total) || 0;
  const shippingCost = Number(held.shipping_cost) || 50;
  const due = Math.max(0, total - dep);
  
  // Extract order reference & Barcodes
  const rawId = String(held.id || '');
  const orderRef = rawId.replace(/[^0-9]/g, '').slice(-9) || '366672799';
  const trText = `*DS-2SN-${rawId.slice(-9)}-${Math.floor(1000 + Math.random() * 9000)}*`;
  const mainBarcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(rawId || 'HANCES-ORDER')}&scale=3&height=14&inkcolor=000000`;

  // Print Date Formatting
  const dateObj = new Date(held.created_at || new Date());
  const dateTop = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '\\') + ', ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const shipDateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  // Store & Customer metadata
  const storeName = settings?.name || 'Hànces.11';
  const vendorName = held.vendor_name || settings?.name || 'Hances';
  const customerName = held.customer_name || 'يارا عربي سيد';
  const customerPhone = held.customer_phone || '+201008451142';
  const customerAddress = held.customer_address || 'الفيوم ابشواي النصاريه عزبة عرابي';

  // Products lookup for images
  const products = useStore.getState().products || [];

  // Generate Package Details Rows
  const itemsHtml = (held.items || []).map((it: any) => {
    const qty = Number(it.quantity) || 1;
    const price = Number(it.sale_price) || 0;
    const itemTotal = price * qty;
    const prod = products.find(p => p.id === it.id || p.name === it.name);
    const imgUrl = prod?.image_url || it.image_url || '';
    const imgTag = imgUrl ? `<img src="${escapeHtml(imgUrl)}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" />` : '';

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;text-align:right;">
            <span style="font-weight:900;font-size:13px;">${escapeHtml(it.name || '')}</span>
            ${imgTag}
          </div>
        </td>
        <td style="font-weight:900;font-size:14px;text-align:center;">${qty}</td>
        <td style="font-weight:900;font-size:14px;text-align:center;">${price.toFixed(0)}</td>
        <td style="font-weight:900;font-size:14px;text-align:center;">00</td>
        <td style="font-weight:900;font-size:14px;text-align:center;">${itemTotal.toFixed(0)}</td>
        <td style="font-weight:900;font-size:14px;text-align:center;">00</td>
      </tr>`;
  }).join('');

  // QR Codes
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('EG-VAR-R2S')}`;
  const boxQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(orderRef)}`;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>فاتورة / بوليصة - ${escapeHtml(customerName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo','Segoe UI',Arial,sans-serif;color:#000;}
  body{background:#fff;margin:0;padding:0;}
  
  .pdf-page {
    width: 210mm;
    max-height: 297mm;
    margin: 0 auto;
    padding: 6mm 10mm;
    background: #fff;
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* Header Top Info */
  .top-datetime {
    font-size: 11px;
    font-weight: 700;
    font-family: sans-serif;
  }

  .header-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-top: 3px;
    align-items: start;
  }

  .left-header-box {
    font-size: 13px;
    line-height: 1.3;
  }
  .customer-title-large {
    font-size: 20px;
    font-weight: 900;
  }
  .customer-address-box {
    font-size: 16px;
    font-weight: 900;
    margin-top: 2px;
    line-height: 1.2;
  }
  .location-tags {
    font-size: 13px;
    font-weight: 900;
    font-family: sans-serif;
    margin-top: 4px;
    text-align: left;
  }

  .vendor-block {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
  }

  .right-header-box {
    text-align: right;
  }
  .brand-title {
    font-size: 18px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .brand-logo-h {
    font-size: 24px;
    font-weight: 900;
    font-family: serif;
    background: #000;
    color: #fff;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .qr-code-eg {
    display: flex;
    flex-direction: column;
    align-items: center;
    float: left;
  }
  .qr-code-eg img { width: 70px; height: 70px; }
  .qr-code-eg span { font-size: 10px; font-weight: 900; font-family: sans-serif; margin-bottom: 1px; }

  .barcode-wrapper {
    margin-top: 4px;
    text-align: center;
  }
  .barcode-wrapper img {
    width: 100%;
    max-height: 48px;
    object-fit: contain;
  }
  .barcode-subtext {
    font-family: monospace;
    font-size: 11px;
    font-weight: 900;
    display: block;
    margin-top: 1px;
  }

  .meta-info-list {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.3;
  }

  /* Decorative line with icons */
  .decorative-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40%;
    margin: 10px 0;
    position: relative;
  }
  .decorative-divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    border-top: 2px solid #000;
    z-index: 1;
  }
  .star-diamond {
    position: relative;
    z-index: 2;
    background: #fff;
    padding: 0 8px;
    font-size: 14px;
  }

  .delivery-instructions-text {
    font-size: 11px;
    font-weight: 800;
    font-family: sans-serif;
    margin-bottom: 4px;
  }

  /* Shipper Order Info Table Box */
  .ship-info-table {
    width: 100%;
    border: 2px solid #000;
    border-collapse: collapse;
    margin-bottom: 10px;
  }
  .ship-info-table td {
    border-right: 2px solid #000;
    padding: 4px 8px;
    vertical-align: top;
    text-align: center;
  }
  .ship-info-table td:last-child {
    border-right: none;
  }

  .shipper-subhead {
    font-size: 11px;
    font-weight: 700;
    font-family: sans-serif;
    text-align: right;
  }
  .shipper-title-big {
    font-size: 16px;
    font-weight: 900;
  }
  .shipper-brand-h {
    font-size: 24px;
    font-weight: 900;
    margin-top: 2px;
  }

  .box-label { font-size: 14px; font-weight: 900; font-family: sans-serif; }
  .box-value { font-size: 16px; font-weight: 900; font-family: sans-serif; margin-top: 3px; }

  /* Cut line */
  .cut-here-container {
    position: relative;
    border-top: 2px dashed #000;
    margin: 12px 0 6px;
    text-align: center;
  }
  .cut-icon-center {
    position: absolute;
    top: -10px;
    left: 42%;
    background: #fff;
    padding: 0 4px;
    font-size: 14px;
  }
  .cut-text-right {
    position: absolute;
    top: -8px;
    right: 0;
    background: #fff;
    padding-left: 8px;
    font-size: 11px;
    font-weight: 900;
    font-family: sans-serif;
  }

  .package-details-title {
    font-size: 13px;
    font-weight: 900;
    font-family: sans-serif;
    margin-bottom: 4px;
  }

  /* Items Table */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 2px solid #000;
    margin-bottom: 10px;
  }
  .items-table th {
    border: 2px solid #000;
    padding: 4px 4px;
    font-size: 11px;
    font-weight: 900;
    background: #fff;
    text-align: center;
  }
  .items-table td {
    border: 2px solid #000;
    padding: 4px 4px;
    vertical-align: middle;
  }

  /* Totals Section Right Aligned */
  .totals-block-right {
    text-align: right;
    margin-top: 8px;
    font-size: 15px;
    font-weight: 900;
    line-height: 1.3;
  }

  /* Bottom Social & Thank you */
  .bottom-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 15px;
  }

  .social-links-box {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    font-weight: 900;
    font-family: sans-serif;
  }
  .social-item-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .thank-you-script {
    text-align: center;
  }
  .thank-you-script h1 {
    font-family: 'Brush Script MT', cursive, serif;
    font-size: 40px;
    line-height: 0.85;
    margin: 0;
    font-weight: 400;
  }
  .thank-you-script p {
    font-family: serif;
    font-size: 12px;
    font-style: italic;
    margin-top: 4px;
    font-weight: 700;
  }

  @media print {
    @page { size: A4 portrait; margin: 0; }
    html, body { height: 100%; overflow: hidden; page-break-after: avoid; page-break-before: avoid; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pdf-page { width: 100%; height: 100vh; max-height: 100vh; padding: 6mm 10mm; box-sizing: border-box; overflow: hidden; page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="pdf-page">
  
  <div class="top-datetime">${dateTop}</div>

  <div class="header-grid">
    <!-- Left Box -->
    <div class="left-header-box">
      <div style="font-weight:700;font-size:14px;" dir="ltr">#.${escapeHtml(customerPhone)}</div>
      
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:10px;">
        <div>
          <div class="customer-title-large">الاسم : ${escapeHtml(customerName)}</div>
          <div class="customer-address-box">العنوان : ${escapeHtml(customerAddress)}</div>
          <div class="location-tags">EL FAYUM<br/>EGYPT</div>
        </div>
        
        <div class="qr-code-eg">
          <span>EG-VAR-R2S</span>
          <img src="${qrCodeUrl}" alt="QR" />
        </div>
      </div>

      <div class="vendor-block">
        Vendor :<br/>${escapeHtml(vendorName)}
      </div>
    </div>

    <!-- Right Box -->
    <div class="right-header-box">
      <div class="brand-title">
        <span>${escapeHtml(storeName)} | التحكم في الطلبات</span>
        <div class="brand-logo-h">H</div>
      </div>

      <div style="font-size:15px;font-weight:900;margin-top:12px;">أسم العميل : ${escapeHtml(customerName)}</div>
      <div style="font-size:15px;font-weight:900;margin-top:6px;font-family:sans-serif;">TR#:</div>

      <div class="barcode-wrapper">
        <img src="${mainBarcodeUrl}" alt="Barcode" />
        <span class="barcode-subtext">${trText}</span>
      </div>

      <div class="meta-info-list">
        <div>Amount : <span style="font-family:sans-serif;">${due.toFixed(2)} PRE</span></div>
        <div>Signature: <span style="font-family:sans-serif;">${escapeHtml(storeName.toUpperCase())}</span></div>
        <div style="margin-top:8px;">المرسل اليه : ${escapeHtml(customerName)}</div>
      </div>
    </div>
  </div>

  <!-- Decorative Divider Line -->
  <div class="decorative-divider">
    <span class="star-diamond">✦</span>
    <span class="star-diamond">✦</span>
  </div>

  <div class="delivery-instructions-text">Delivery Insturctions</div>

  <!-- Shipper Info Box -->
  <table class="ship-info-table">
    <tr>
      <td style="width:20%;text-align:right;">
        <div class="shipper-subhead">shipper:</div>
        <div class="shipper-title-big">${escapeHtml(storeName)}</div>
        <div class="shipper-brand-h">H</div>
        <div style="font-size:13px;font-weight:900;font-family:sans-serif;margin-top:2px;">HANCES</div>
      </td>
      <td style="width:25%;">
        <div class="box-label">Order #:</div>
        <div class="box-value">${escapeHtml(orderRef)}</div>
      </td>
      <td style="width:25%;">
        <div class="box-label">Ship D/T:</div>
        <div class="box-value">${shipDateStr}</div>
      </td>
      <td style="width:18%;">
        <div class="box-label">Weight:</div>
        <div class="box-value">كجم 5.00</div>
      </td>
      <td style="width:12%;text-align:center;">
        <div style="font-size:11px;font-weight:900;font-family:sans-serif;margin-bottom:4px;">QR CODE</div>
        <img src="${boxQrCodeUrl}" style="width:55px;height:55px;" alt="QR" />
      </td>
    </tr>
  </table>

  <!-- Cut Line -->
  <div class="cut-here-container">
    <span class="cut-icon-center">✂</span>
    <span class="cut-text-right">Cut here incase of return_</span>
  </div>

  <div class="package-details-title">Package Details:</div>

  <!-- Package Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:30%;">أسم الصنف</th>
        <th style="width:10%;">العدد</th>
        <th style="width:15%;">سعر الصنف</th>
        <th style="width:15%;">سعر الخصم</th>
        <th style="width:15%;">إجمالي السعر بدون<br/>رسوم الشحن</th>
        <th style="width:15%;">أجمالي السعر مع<br/>مصاريف الشحن</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || `
      <tr>
        <td style="text-align:right;font-weight:900;">شنطة باك مدارس</td>
        <td style="text-align:center;font-weight:900;">1</td>
        <td style="text-align:center;font-weight:900;">380</td>
        <td style="text-align:center;font-weight:900;">00</td>
        <td style="text-align:center;font-weight:900;">380</td>
        <td style="text-align:center;font-weight:900;">00</td>
      </tr>
      `}
    </tbody>
  </table>

  <!-- Totals Section -->
  <div class="totals-block-right">
    سعر الشحن : ${shippingCost.toFixed(1)}<br/>
    المجموع المراد تحصيله<br/>
    ${due.toFixed(0)} : ( شامل الضريبية)<br/>
    <span style="font-family:sans-serif;font-size:16px;">PRE</span>
  </div>

  <!-- Footer Socials & Thank you -->
  <div class="bottom-footer">
    <div class="social-links-box">
      <div class="social-item-row">
        <span style="font-size:20px;">🔵</span>
        <span>Hànces</span>
      </div>
      <div class="social-item-row">
        <span style="font-size:20px;">📷</span>
        <span>@Hances.11</span>
      </div>
      <div class="social-item-row">
        <span style="font-size:20px;">💬</span>
        <span dir="ltr">+201149009410 - +201550801034</span>
      </div>
    </div>

    <div class="thank-you-script">
      <h1>Thank<br/>You</h1>
      <p>“Hoping To See You Again”</p>
    </div>
  </div>

</div>
${AUTO_PRINT_SCRIPT}
</body></html>`;

  void printDocument('invoice', html);
}

