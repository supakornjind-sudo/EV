/**
 * ตัวเรียก API ของเว็บปฏิทินงานประจำเดือน
 * ส่งแบบ POST + Content-Type: text/plain เพื่อเลี่ยง CORS preflight (เหมือนระบบ RMA เดิม
 * แต่เป็น Apps Script คนละตัว คนละ Google Sheet กันคนละไฟล์ 100%)
 */
const McAPI = {
  async call(action, data) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, user: mcWhoName(), data: data || {} }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'เกิดข้อผิดพลาด');
    return json.data;
  },
  bootstrap()          { return this.call('bootstrap'); },
  createTask(row)       { return this.call('createTask', { row }); },
  updateTask(id, row)   { return this.call('updateTask', { id, row }); },
  deleteTask(id)        { return this.call('deleteTask', { id }); },
  createBrand(name, color) { return this.call('createBrand', { name, color }); },
  updateBrand(id, row)  { return this.call('updateBrand', { id, row }); },
  deleteBrand(id)       { return this.call('deleteBrand', { id }); },
};
