// PromptPay QR (EMVCo / Thai QR Payment) payload + rendering.

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** id: mobile number (08x...), 13-digit national/tax ID, or 15-digit e-wallet ID. amount in baht. */
export function promptpayPayload(id, amount) {
  const digits = String(id || '').replace(/[^0-9]/g, '');
  if (digits.length < 9) throw new Error('เลขพร้อมเพย์ไม่ถูกต้อง');
  let target;
  if (digits.length >= 15) target = field('03', digits);
  else if (digits.length >= 13) target = field('02', digits);
  else target = field('01', ('0000000000000' + digits.replace(/^0/, '66')).slice(-13));
  const amt = Number(amount) > 0 ? field('54', Number(amount).toFixed(2)) : '';
  const body = field('00', '01') + field('01', amt ? '12' : '11') +
    field('29', field('00', 'A000000677010111') + target) +
    field('58', 'TH') + field('53', '764') + amt + '6304';
  return body + crc16(body);
}

let libPromise;
function loadQrLib() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
      s.onload = () => resolve(window.qrcode);
      s.onerror = () => reject(new Error('โหลดตัวสร้าง QR ไม่สำเร็จ'));
      document.head.appendChild(s);
    });
  }
  return libPromise;
}

/** Returns an <svg> string for the payload. */
export async function qrSvg(payload) {
  const qrcode = await loadQrLib();
  const qr = qrcode(0, 'M');
  qr.addData(payload);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}
