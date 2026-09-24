/**
 * ============================================================
 * ปฏิทินงานประจำเดือน — เว็บแยกต่างหาก 100% (ไม่เกี่ยวกับระบบ RMA เดิม)
 * ไม่มี Login — พิมพ์ชื่อไว้บนหัวเว็บเพื่อระบุว่าใครเป็นคนเพิ่ม/แก้งาน
 * ============================================================
 */
const MC_COLORS = ['#c0392b', '#2c5d9e', '#1c7c47', '#9b59b6', '#e0641f', '#16a085', '#8e44ad', '#d35400'];

let MC = { tasks: [], brands: [], ym: '', filter: '', editId: null };
let mcDayISO = '';     // วันที่กำลังเปิดดูในหน้าต่าง "ดูงานทั้งวัน"
let mcFromDay = false; // true = เปิดฟอร์มงานมาจากหน้าต่างดูงานทั้งวัน (บันทึก/ลบเสร็จให้กลับไปหน้านั้นต่อ)
const MC_DOW = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function mcWhoName() {
  return (document.getElementById('mcWho').value || 'ไม่ระบุชื่อ').trim();
}
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('mcWhoName');
  if (saved) document.getElementById('mcWho').value = saved;
  document.getElementById('mcWho').addEventListener('input', e => sessionStorage.setItem('mcWhoName', e.target.value));
  mcInit();
});

function mcPad(n) { return (n < 10 ? '0' : '') + n; }
function mcTodayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${mcPad(n.getMonth() + 1)}-${mcPad(n.getDate())}`;
}
function mcEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/* กันปัญหา Google Sheets ส่งวันที่กลับมาพร้อมเวลาแปะท้าย เช่น 2026-09-24T00:00:00.000Z */
function mcDateOnly(v) { return String(v || '').slice(0, 10); }
const MC_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function mcMonthLabel(ym) {
  const p = ym.split('-').map(Number);
  return MC_MONTHS[p[1] - 1] + ' ' + p[0];
}
function mcBrandColor(brandId) {
  const idx = MC.brands.findIndex(b => b.id === brandId);
  const b = idx >= 0 ? MC.brands[idx] : null;
  if (b && b.color) return b.color;   // สีที่ผู้ใช้ตั้งเองมาก่อนเสมอ
  return MC_COLORS[(idx < 0 ? 0 : idx) % MC_COLORS.length];   // ยังไม่ตั้งสี ใช้จากพาเลตต์ตามลำดับไปก่อน
}
function mcFmtDayFull(iso) {
  const p = iso.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  return `วัน${MC_DOW[d.getDay()]}ที่ ${p[2]} ${MC_MONTHS[p[1] - 1]} ${p[0]}`;
}
function mcBrandName(brandId) {
  const b = MC.brands.find(x => x.id === brandId);
  return b ? b.name : '-';
}
function mcToast(msg, kind) {
  let t = document.getElementById('mcToast');
  if (!t) {
    t = document.createElement('div'); t.id = 'mcToast';
    t.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:999;padding:11px 20px;border-radius:10px;color:#fff;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.2);transition:.2s;opacity:0;';
    document.body.appendChild(t);
  }
  t.style.background = kind === 'error' ? '#c0392b' : '#1c7c47';
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(window._mcToastTimer);
  window._mcToastTimer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

/* ---------- โหลดข้อมูล ---------- */
async function mcInit() {
  const n = new Date();
  MC.ym = `${n.getFullYear()}-${mcPad(n.getMonth() + 1)}`;
  try {
    const data = await McAPI.bootstrap();
    MC.tasks = data.tasks || [];
    MC.brands = data.brands || [];
    document.getElementById('mcLoading').classList.add('hide');
    mcRenderAll();
  } catch (e) {
    document.getElementById('mcLoading').innerHTML =
      '<div style="color:#c0392b;max-width:360px;text-align:center;font-size:13px;">⚠️ เชื่อมต่อไม่ได้: ' + mcEsc(e.message) +
      '<br><br>ตรวจสอบว่าใส่ API_URL ใน config.js ถูกต้อง และ Deploy Apps Script แล้ว</div>';
  }
}
async function mcRefresh() {
  const data = await McAPI.bootstrap();
  MC.tasks = data.tasks || [];
  MC.brands = data.brands || [];
  mcRenderAll();
}
function mcRenderAll() { mcRenderFilterChips(); mcRenderCalendar(); }

/* ---------- ฟิลเตอร์แบรนด์ ---------- */
function mcRenderFilterChips() {
  const el = document.getElementById('mcFilterChips');
  el.innerHTML = `<span class="mc-chip ${MC.filter === '' ? 'on' : ''}" onclick="mcSetFilter('')">ทั้งหมด</span>` +
    MC.brands.map(b => `<span class="mc-chip ${MC.filter === b.id ? 'on' : ''}" style="background:${MC.filter === b.id ? mcBrandColor(b.id) : ''};color:${MC.filter === b.id ? '#fff' : ''}" onclick="mcSetFilter('${b.id}')">${mcEsc(b.name)}</span>`).join('');
}
function mcSetFilter(id) { MC.filter = id; mcRenderAll(); }

/* ---------- ปฏิทิน ---------- */
function mcShiftMonth(n) {
  const p = MC.ym.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1 + n, 1);
  MC.ym = `${d.getFullYear()}-${mcPad(d.getMonth() + 1)}`;
  mcRenderCalendar();
}
function mcGoToday() {
  const n = new Date();
  MC.ym = `${n.getFullYear()}-${mcPad(n.getMonth() + 1)}`;
  mcRenderCalendar();
}
function mcTasksOn(iso) {
  return MC.tasks.filter(t => mcDateOnly(t.date) === iso && (!MC.filter || t.brand === MC.filter));
}
function mcRenderCalendar() {
  document.getElementById('mcMonthLabel').textContent = mcMonthLabel(MC.ym);
  const p = MC.ym.split('-').map(Number);
  const first = new Date(p[0], p[1] - 1, 1);
  const off = (first.getDay() + 6) % 7;
  const today = mcTodayISO();
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(p[0], p[1] - 1, 1 - off + i);
    const iso = `${d.getFullYear()}-${mcPad(d.getMonth() + 1)}-${mcPad(d.getDate())}`;
    const inMonth = d.getMonth() === p[1] - 1;
    const evs = mcTasksOn(iso);
    cells += `<div class="mc-cell ${inMonth ? '' : 'mc-out'} ${iso === today ? 'mc-today' : ''}" onclick="mcOpenDayModal('${iso}')">
      <div class="mc-num">${d.getDate()}</div>
      ${evs.slice(0, 3).map(t => `<div class="mc-task" style="background:${mcBrandColor(t.brand)}" onclick="event.stopPropagation();mcFromDay=false;mcOpenTaskModal('${t.id}')" title="${mcEsc(t.title)} — ${mcEsc(mcBrandName(t.brand))}">${mcEsc(t.title)}</div>`).join('')}
      ${evs.length > 3 ? `<div class="mc-more">+${evs.length - 3} เพิ่มเติม</div>` : ''}
    </div>`;
  }
  document.getElementById('mcGrid').innerHTML = cells;

  const monthTasks = MC.tasks.filter(t => t.date && mcDateOnly(t.date).slice(0, 7) === MC.ym && (!MC.filter || t.brand === MC.filter))
    .sort((a, b) => mcDateOnly(a.date).localeCompare(mcDateOnly(b.date)));
  document.getElementById('mcMonthList').innerHTML = monthTasks.length ? monthTasks.map(t => `
    <div class="mc-list-row" onclick="mcFromDay=false;mcOpenTaskModal('${t.id}')">
      <span class="mc-list-date">${mcDateOnly(t.date).slice(8, 10)}/${mcDateOnly(t.date).slice(5, 7)}</span>
      <span class="mc-list-dot" style="background:${mcBrandColor(t.brand)}"></span>
      <strong>${mcEsc(t.title)}</strong>
      ${t.note ? `<span style="color:#8fa1b5;font-size:12px;">📝 ${mcEsc(t.note)}</span>` : ''}
      <span class="mc-list-brand" style="background:${mcBrandColor(t.brand)}">${mcEsc(mcBrandName(t.brand))}</span>
    </div>`).join('') : '<div class="mc-empty">ยังไม่มีงานในเดือนนี้ — กด ➕ เพิ่มงาน หรือคลิกวันในปฏิทินได้เลย</div>';
}

/* ---------- ดูงานทั้งวัน (เพิ่ม/ลบในหน้าเดียว) ---------- */
function mcOpenDayModal(iso) {
  mcDayISO = iso;
  mcRenderDayModal();
  document.getElementById('mcDayModal').classList.add('open');
}
function mcRenderDayModal() {
  document.getElementById('mcDayModalTitle').textContent = '📅 ' + mcFmtDayFull(mcDayISO);
  const list = mcTasksOn(mcDayISO);
  document.getElementById('mcDayList').innerHTML = list.length ? list.map(t => `
    <div class="mc-day-row">
      <span class="mc-list-dot" style="background:${mcBrandColor(t.brand)}"></span>
      <span class="mc-day-title" onclick="mcFromDay=true;mcOpenTaskModal('${t.id}')">${mcEsc(t.title)}</span>
      <span class="mc-list-brand" style="background:${mcBrandColor(t.brand)}">${mcEsc(mcBrandName(t.brand))}</span>
      <button class="mc-btn mc-btn-red" style="padding:6px 10px;" onclick="mcQuickDeleteFromDay('${t.id}')">🗑️</button>
    </div>`).join('') : '<div class="mc-empty">ยังไม่มีงานวันนี้ — กด ➕ เพิ่มงานวันนี้ ได้เลย</div>';
}
function mcAddFromDay() {
  mcFromDay = true;
  mcCloseModal('mcDayModal');
  mcOpenTaskModal(null, mcDayISO);
}
async function mcQuickDeleteFromDay(taskId) {
  if (!confirm('ลบงานนี้? (ลบแล้วกู้คืนไม่ได้)')) return;
  try {
    await McAPI.deleteTask(taskId);
    await mcRefresh();
    mcRenderDayModal();   // อยู่ในหน้าดูงานทั้งวันต่อ ไม่ต้องปิด
    mcToast('ลบแล้ว ✓', 'success');
  } catch (e) { mcToast(e.message, 'error'); }
}

/* ---------- โมดัลงาน ---------- */
function mcOpenTaskModal(id, dateISO) {
  if (id === undefined && dateISO === undefined) mcFromDay = false;   // เปิดจากปุ่ม "➕ เพิ่มงาน" บนหัวเว็บ ไม่ใช่จากหน้าดูงานทั้งวัน
  MC.editId = id || null;
  const t = id ? MC.tasks.find(x => x.id === id) : null;
  document.getElementById('mcTaskModalTitle').textContent = id ? '✏️ แก้ไขงาน' : '➕ เพิ่มงาน';
  document.getElementById('mcTitle').value = t ? t.title : '';
  document.getElementById('mcDate').value = t ? mcDateOnly(t.date) : (dateISO || mcTodayISO());
  document.getElementById('mcNote').value = t ? (t.note || '') : '';
  const sel = document.getElementById('mcBrand');
  sel.innerHTML = MC.brands.map(b => `<option value="${b.id}">${mcEsc(b.name)}</option>`).join('');
  sel.value = t ? t.brand : (MC.brands[0] ? MC.brands[0].id : '');
  document.getElementById('mcDelBtn').style.display = id ? '' : 'none';
  document.getElementById('mcTaskModal').classList.add('open');
}
function mcCloseModal(id) { document.getElementById(id).classList.remove('open'); }
async function mcSaveTask() {
  const title = document.getElementById('mcTitle').value.trim();
  const brand = document.getElementById('mcBrand').value;
  const date = document.getElementById('mcDate').value;
  const note = document.getElementById('mcNote').value.trim();
  if (!title) { mcToast('กรุณาใส่ชื่องาน', 'error'); return; }
  if (!brand) { mcToast('กรุณาเลือกแบรนด์', 'error'); return; }
  if (!date) { mcToast('กรุณาเลือกวันที่', 'error'); return; }
  try {
    if (MC.editId) await McAPI.updateTask(MC.editId, { title, brand, date, note });
    else await McAPI.createTask({ title, brand, date, note });
    mcCloseModal('mcTaskModal');
    mcToast('บันทึกแล้ว ✓', 'success');
    await mcRefresh();
    if (mcFromDay) { mcDayISO = date; mcOpenDayModal(mcDayISO); }   // กลับไปหน้าดูงานทั้งวันต่อ
  } catch (e) { mcToast('บันทึกไม่สำเร็จ: ' + e.message, 'error'); }
}
async function mcDeleteTask() {
  if (!MC.editId || !confirm('ลบงานนี้? (ลบแล้วกู้คืนไม่ได้)')) return;
  try {
    await McAPI.deleteTask(MC.editId);
    mcCloseModal('mcTaskModal');
    mcToast('ลบแล้ว ✓', 'success');
    await mcRefresh();
    if (mcFromDay) mcOpenDayModal(mcDayISO);   // กลับไปหน้าดูงานทั้งวันต่อ
  } catch (e) { mcToast(e.message, 'error'); }
}

/* ---------- จัดการแบรนด์ ---------- */
function mcOpenBrandModal() {
  mcRenderBrandList();
  document.getElementById('mcBrandModal').classList.add('open');
}
function mcRenderBrandList() {
  document.getElementById('mcBrandList').innerHTML = MC.brands.length ? MC.brands.map(b => `
    <div class="mc-brand-item">
      <input type="color" class="mc-color-input" value="${mcBrandColor(b.id)}" title="เลือกสีของ ${mcEsc(b.name)}"
        onchange="mcSetBrandColor('${b.id}', this.value)">
      <span class="mc-brand-name">${mcEsc(b.name)}</span>
      <button class="mc-btn mc-btn-red" style="padding:5px 10px;" onclick="mcDeleteBrand('${b.id}','${mcEsc(b.name)}')">🗑️</button>
    </div>`).join('') : '<div class="mc-empty">ยังไม่มีแบรนด์</div>';
}
async function mcAddBrand() {
  const input = document.getElementById('mcNewBrand');
  const colorInput = document.getElementById('mcNewBrandColor');
  const name = input.value.trim();
  if (!name) { mcToast('กรุณาใส่ชื่อแบรนด์', 'error'); return; }
  try {
    await McAPI.createBrand(name, colorInput.value);
    input.value = '';
    await mcRefresh();
    mcRenderBrandList();
    mcToast('เพิ่มแบรนด์แล้ว ✓', 'success');
  } catch (e) { mcToast(e.message, 'error'); }
}
async function mcSetBrandColor(id, color) {
  try {
    await McAPI.updateBrand(id, { color });
    await mcRefresh();
    mcRenderBrandList();
    mcToast('เปลี่ยนสีแบรนด์แล้ว ✓', 'success');
  } catch (e) { mcToast(e.message, 'error'); }
}
async function mcDeleteBrand(id, name) {
  const used = MC.tasks.filter(t => t.brand === id).length;
  const msg = used
    ? `ลบแบรนด์ "${name}"? มีงาน ${used} รายการใช้แบรนด์นี้อยู่ (งานจะยังอยู่ แต่จะไม่มีแบรนด์กำกับ)`
    : `ลบแบรนด์ "${name}"?`;
  if (!confirm(msg)) return;
  try {
    await McAPI.deleteBrand(id);
    await mcRefresh();
    mcRenderBrandList();
    mcToast('ลบแบรนด์แล้ว ✓', 'success');
  } catch (e) { mcToast(e.message, 'error'); }
}

/* ---------- Export งานของเดือนที่กำลังดูอยู่เป็น PowerPoint (.pptx) ---------- */
async function mcExportPptx() {
  if (typeof PptxGenJS === 'undefined') { mcToast('โหลดไลบรารีสร้าง PowerPoint ไม่สำเร็จ ลองเช็คอินเทอร์เน็ตแล้วรีเฟรชใหม่', 'error'); return; }
  const monthTasks = MC.tasks.filter(t => t.date && mcDateOnly(t.date).slice(0, 7) === MC.ym)
    .sort((a, b) => mcDateOnly(a.date).localeCompare(mcDateOnly(b.date)));
  if (!monthTasks.length) { mcToast('เดือนนี้ยังไม่มีงาน ไม่มีอะไรให้ Export', 'error'); return; }

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const cover = pptx.addSlide();
  cover.background = { color: '1E3A5F' };
  cover.addText('📅 ปฏิทินงานประจำเดือน', { x: 0.5, y: 1.5, w: 9, h: 0.8, fontSize: 30, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Tahoma' });
  cover.addText(mcMonthLabel(MC.ym), { x: 0.5, y: 2.4, w: 9, h: 0.7, fontSize: 24, bold: true, color: '4CAF7D', align: 'center', fontFace: 'Tahoma' });
  cover.addText(`รวม ${monthTasks.length} งาน`, { x: 0.5, y: 3.2, w: 9, h: 0.5, fontSize: 14, color: 'C3CFDC', align: 'center', fontFace: 'Tahoma' });

  const rowsPerSlide = 13;
  const pageCount = Math.ceil(monthTasks.length / rowsPerSlide);
  const headerRow = [
    { text: 'วันที่', options: { bold: true, color: 'FFFFFF', fill: { color: '1E3A5F' }, fontFace: 'Tahoma' } },
    { text: 'ชื่องาน', options: { bold: true, color: 'FFFFFF', fill: { color: '1E3A5F' }, fontFace: 'Tahoma' } },
    { text: 'แบรนด์', options: { bold: true, color: 'FFFFFF', fill: { color: '1E3A5F' }, fontFace: 'Tahoma' } },
  ];
  for (let i = 0; i < monthTasks.length; i += rowsPerSlide) {
    const chunk = monthTasks.slice(i, i + rowsPerSlide);
    const slide = pptx.addSlide();
    const pageNum = Math.floor(i / rowsPerSlide) + 1;
    slide.addText(mcMonthLabel(MC.ym) + (pageCount > 1 ? ` (หน้า ${pageNum}/${pageCount})` : ''),
      { x: 0.4, y: 0.22, w: 9.2, h: 0.45, fontSize: 16, bold: true, color: '1E3A5F', fontFace: 'Tahoma' });
    const rows = [headerRow].concat(chunk.map(t => ([
      { text: mcDateOnly(t.date).slice(8, 10) + '/' + mcDateOnly(t.date).slice(5, 7), options: { fontSize: 11, fontFace: 'Tahoma' } },
      { text: t.title + (t.note ? '  —  ' + t.note : ''), options: { fontSize: 11, fontFace: 'Tahoma' } },
      { text: mcBrandName(t.brand), options: { fontSize: 11, color: 'FFFFFF', fill: { color: mcBrandColor(t.brand).replace('#', '') }, fontFace: 'Tahoma' } },
    ])));
    slide.addTable(rows, {
      x: 0.4, y: 0.8, w: 9.2, colW: [1.2, 6.1, 1.9],
      border: { type: 'solid', color: 'E6ECF3', pt: 0.5 }, autoPage: false,
    });
  }

  try {
    await pptx.writeFile({ fileName: `ปฏิทินงาน-${MC.ym}.pptx` });
    mcToast('ดาวน์โหลดไฟล์ PowerPoint แล้ว ✓', 'success');
  } catch (e) { mcToast('สร้างไฟล์ไม่สำเร็จ: ' + e.message, 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  ['mcTaskModal', 'mcBrandModal', 'mcDayModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => { if (e.target.id === id) mcCloseModal(id); });
  });
});
