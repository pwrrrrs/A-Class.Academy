import { initLayout, $ } from '../core.js';

(async () => {
  await initLayout();
  $('#app').innerHTML = `
    <div class="empty" style="max-width:520px;margin:40px auto">
      <h1 style="font-size:28px;color:var(--ink)">ไม่พบหน้านี้</h1>
      <p style="margin:12px 0 20px">ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายไปแล้ว</p>
      <a class="btn btn-brand" href="/">กลับหน้าแรก</a>
    </div>`;
})();
