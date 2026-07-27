const STORES = ["rootA", "キノコ", "untake", "TurnA", "酔", "エクラス"];
const $ = (id) => document.getElementById(id);
const state = {
  store: localStorage.getItem("roota_store") || STORES[0],
  casts: [],
  shifts: [],
  db: null,
  online: false
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
function localKey(type) { return `roota_v5_${type}`; }
function readLocal(type) {
  try { return JSON.parse(localStorage.getItem(localKey(type)) || "[]"); }
  catch { return []; }
}
function writeLocal(type, value) {
  localStorage.setItem(localKey(type), JSON.stringify(value));
}
function setStatus(text, mode) {
  $("syncStatus").textContent = text;
  $("syncStatus").className = `status ${mode || ""}`;
}
function escapeHtml(value="") {
  return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function initDb() {
  const cfg = window.ROOTA_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) {
    setStatus("端末内保存", "local");
    return;
  }
  try {
    state.db = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    const { error } = await state.db.from("casts").select("id").limit(1);
    if (error) throw error;
    state.online = true;
    setStatus("Supabase同期", "online");
  } catch (error) {
    console.error(error);
    state.db = null;
    state.online = false;
    setStatus("接続失敗・端末内保存", "local");
  }
}

async function loadData() {
  if (state.db) {
    const [castsRes, shiftsRes] = await Promise.all([
      state.db.from("casts").select("*").order("created_at"),
      state.db.from("shifts").select("*").order("shift_date").order("start_time")
    ]);
    if (!castsRes.error && !shiftsRes.error) {
      state.casts = castsRes.data || [];
      state.shifts = shiftsRes.data || [];
      writeLocal("casts", state.casts);
      writeLocal("shifts", state.shifts);
      return;
    }
  }
  state.casts = readLocal("casts");
  state.shifts = readLocal("shifts");
}

async function saveCast(record) {
  if (state.db) {
    const { data, error } = await state.db.from("casts").upsert(record).select().single();
    if (error) throw error;
    return data;
  }
  const index = state.casts.findIndex(x => x.id === record.id);
  if (index >= 0) state.casts[index] = record; else state.casts.push(record);
  writeLocal("casts", state.casts);
  return record;
}
async function deleteCast(id) {
  if (state.db) {
    const { error } = await state.db.from("casts").delete().eq("id", id);
    if (error) throw error;
  }
  state.casts = state.casts.filter(x => x.id !== id);
  state.shifts = state.shifts.filter(x => x.cast_id !== id);
  writeLocal("casts", state.casts);
  writeLocal("shifts", state.shifts);
}
async function saveShift(record) {
  if (state.db) {
    const { data, error } = await state.db.from("shifts").insert(record).select().single();
    if (error) throw error;
    return data;
  }
  state.shifts.push(record);
  writeLocal("shifts", state.shifts);
  return record;
}
async function deleteShift(id) {
  if (state.db) {
    const { error } = await state.db.from("shifts").delete().eq("id", id);
    if (error) throw error;
  }
  state.shifts = state.shifts.filter(x => x.id !== id);
  writeLocal("shifts", state.shifts);
}

function renderStores() {
  $("storeSelect").innerHTML = STORES.map(s => `<option value="${s}">${s}</option>`).join("");
  $("storeSelect").value = state.store;
}
function renderCasts() {
  const casts = state.casts.filter(x => x.store_id === state.store);
  $("castsEmpty").classList.toggle("hidden", casts.length > 0);
  $("castsList").innerHTML = casts.map(c => `
    <article class="row">
      <div class="row-main">
        <div class="row-title">${escapeHtml(c.name)}</div>
        <div class="row-sub">${escapeHtml(c.store_id)}</div>
      </div>
      <div class="row-actions">
        <button class="secondary" data-edit-cast="${c.id}">編集</button>
        <button class="danger" data-delete-cast="${c.id}">削除</button>
      </div>
    </article>`).join("");
}
function renderShiftCastOptions() {
  const casts = state.casts.filter(x => x.store_id === state.store);
  $("shiftCast").innerHTML = casts.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}
function renderShifts() {
  const date = $("shiftDate").value;
  const castMap = new Map(state.casts.map(c => [c.id, c]));
  const shifts = state.shifts.filter(x => x.store_id === state.store && x.shift_date === date);
  $("shiftsEmpty").classList.toggle("hidden", shifts.length > 0);
  $("shiftsList").innerHTML = shifts.map(s => {
    const cast = castMap.get(s.cast_id);
    const end = s.end_time ? `〜${s.end_time.slice(0,5)}` : "〜";
    return `<article class="row">
      <div class="row-main">
        <div class="row-title">${escapeHtml(cast?.name || "削除済みキャスト")}</div>
        <div class="row-sub">${s.start_time.slice(0,5)}${end}${s.memo ? ` ｜ ${escapeHtml(s.memo)}` : ""}</div>
      </div>
      <div class="row-actions">
        <button class="danger" data-delete-shift="${s.id}">削除</button>
      </div>
    </article>`;
  }).join("");
}
function renderAll() {
  renderCasts();
  renderShiftCastOptions();
  renderShifts();
}

function openCastDialog(cast=null) {
  $("castDialogTitle").textContent = cast ? "キャスト編集" : "キャスト追加";
  $("castId").value = cast?.id || "";
  $("castName").value = cast?.name || "";
  $("castDialog").showModal();
  setTimeout(() => $("castName").focus(), 50);
}

document.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === tab));
    $("castsPanel").classList.toggle("active", tab.dataset.tab === "casts");
    $("shiftsPanel").classList.toggle("active", tab.dataset.tab === "shifts");
  }

  const closer = event.target.closest("[data-close]");
  if (closer) $(closer.dataset.close).close();

  if (event.target.id === "addCastButton") openCastDialog();

  const editCastId = event.target.dataset.editCast;
  if (editCastId) openCastDialog(state.casts.find(x => x.id === editCastId));

  const deleteCastId = event.target.dataset.deleteCast;
  if (deleteCastId && confirm("このキャストを削除しますか？関連する出勤も削除されます。")) {
    try { await deleteCast(deleteCastId); renderAll(); }
    catch (e) { alert(`削除できませんでした: ${e.message}`); }
  }

  if (event.target.id === "addShiftButton") {
    const available = state.casts.some(x => x.store_id === state.store);
    if (!available) return alert("先にキャストを登録してください。");
    $("shiftStart").value = "";
    $("shiftEnd").value = "";
    $("shiftMemo").value = "";
    renderShiftCastOptions();
    $("shiftDialog").showModal();
  }

  const deleteShiftId = event.target.dataset.deleteShift;
  if (deleteShiftId && confirm("この出勤を削除しますか？")) {
    try { await deleteShift(deleteShiftId); renderShifts(); }
    catch (e) { alert(`削除できませんでした: ${e.message}`); }
  }
});

$("storeSelect").addEventListener("change", () => {
  state.store = $("storeSelect").value;
  localStorage.setItem("roota_store", state.store);
  renderAll();
});
$("shiftDate").addEventListener("change", renderShifts);

$("castForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("castId").value || uid();
  const existing = state.casts.find(x => x.id === id);
  const record = {
    id,
    store_id: state.store,
    name: $("castName").value.trim(),
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (!record.name) return;
  try {
    const saved = await saveCast(record);
    const index = state.casts.findIndex(x => x.id === saved.id);
    if (index >= 0) state.casts[index] = saved; else state.casts.push(saved);
    writeLocal("casts", state.casts);
    $("castDialog").close();
    renderAll();
  } catch (e) { alert(`保存できませんでした: ${e.message}`); }
});

$("shiftForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = {
    id: uid(),
    store_id: state.store,
    cast_id: $("shiftCast").value,
    shift_date: $("shiftDate").value,
    start_time: $("shiftStart").value,
    end_time: $("shiftEnd").value || null,
    memo: $("shiftMemo").value.trim() || null,
    created_at: new Date().toISOString()
  };
  try {
    const saved = await saveShift(record);
    state.shifts.push(saved);
    writeLocal("shifts", state.shifts);
    $("shiftDialog").close();
    renderShifts();
  } catch (e) { alert(`保存できませんでした: ${e.message}`); }
});

(async function init() {
  renderStores();
  $("shiftDate").value = new Date().toISOString().slice(0,10);
  await initDb();
  await loadData();
  renderAll();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js");
})();
