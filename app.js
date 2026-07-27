const STORES = ["rootA", "キノコ", "untake", "TurnA", "酔", "エクラス"];
const $ = (id) => document.getElementById(id);

const state = {
  store: localStorage.getItem("roota_store") || STORES[0],
  casts: [],
  shifts: [],
  db: null,
  online: false,
  pendingPhoto: null
};

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function localKey(type) {
  return `roota_v5_${type}`;
}

function readLocal(type) {
  try {
    return JSON.parse(localStorage.getItem(localKey(type)) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(type, value) {
  localStorage.setItem(localKey(type), JSON.stringify(value));
}

function setStatus(text, mode) {
  $("syncStatus").textContent = text;
  $("syncStatus").className = `status ${mode || ""}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function imageFileToDataUrl(file) {
  const originalDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = originalDataUrl;
  });

  const maxSize = 700;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.78);
}

function updatePhotoPreview(photoData) {
  state.pendingPhoto = photoData || null;

  const preview = $("castPhotoPreview");
  const removeButton = $("removePhotoButton");

  if (state.pendingPhoto) {
    preview.src = state.pendingPhoto;
    preview.classList.remove("hidden");
    removeButton.classList.remove("hidden");
  } else {
    preview.removeAttribute("src");
    preview.classList.add("hidden");
    removeButton.classList.add("hidden");
  }
}

async function initDb() {
  const config = window.ROOTA_CONFIG || {};

  if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
    setStatus("端末内保存", "local");
    return;
  }

  try {
    state.db = supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_KEY
    );

    const { error } = await state.db
      .from("casts")
      .select("id")
      .limit(1);

    if (error) {
      throw error;
    }

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
    const [castsResult, shiftsResult] = await Promise.all([
      state.db.from("casts").select("*").order("created_at"),
      state.db
        .from("shifts")
        .select("*")
        .order("shift_date")
        .order("start_time")
    ]);

    if (!castsResult.error && !shiftsResult.error) {
      state.casts = castsResult.data || [];
      state.shifts = shiftsResult.data || [];
      writeLocal("casts", state.casts);
      writeLocal("shifts", state.shifts);
      return;
    }

    console.error(castsResult.error || shiftsResult.error);
  }

  state.casts = readLocal("casts");
  state.shifts = readLocal("shifts");
}

async function saveCast(record) {
  if (state.db) {
    const { data, error } = await state.db
      .from("casts")
      .upsert(record)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const index = state.casts.findIndex((cast) => cast.id === record.id);

  if (index >= 0) {
    state.casts[index] = record;
  } else {
    state.casts.push(record);
  }

  writeLocal("casts", state.casts);
  return record;
}

async function deleteCast(id) {
  if (state.db) {
    const { error } = await state.db
      .from("casts")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  state.casts = state.casts.filter((cast) => cast.id !== id);
  state.shifts = state.shifts.filter((shift) => shift.cast_id !== id);

  writeLocal("casts", state.casts);
  writeLocal("shifts", state.shifts);
}

async function saveShift(record) {
  if (state.db) {
    const { data, error } = await state.db
      .from("shifts")
      .insert(record)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  state.shifts.push(record);
  writeLocal("shifts", state.shifts);
  return record;
}

async function deleteShift(id) {
  if (state.db) {
    const { error } = await state.db
      .from("shifts")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  state.shifts = state.shifts.filter((shift) => shift.id !== id);
  writeLocal("shifts", state.shifts);
}

function renderStores() {
  $("storeSelect").innerHTML = STORES
    .map((store) => `<option value="${store}">${store}</option>`)
    .join("");

  $("storeSelect").value = state.store;
}

function renderCasts() {
  const casts = state.casts.filter(
    (cast) => cast.store_id === state.store
  );

  $("castsEmpty").classList.toggle("hidden", casts.length > 0);

  $("castsList").innerHTML = casts.map((cast) => `
    <article class="row">
      <div class="cast-profile">
        ${
          cast.photo_data
            ? `<img class="cast-avatar" src="${cast.photo_data}" alt="${escapeHtml(cast.name)}">`
            : `<div class="cast-avatar cast-avatar-empty">写真なし</div>`
        }

        <div class="row-main">
          <div class="row-title">${escapeHtml(cast.name)}</div>
          <div class="row-sub">${escapeHtml(cast.store_id)}</div>
        </div>
      </div>

      <div class="row-actions">
        <button class="secondary" data-edit-cast="${cast.id}">編集</button>
        <button class="danger" data-delete-cast="${cast.id}">削除</button>
      </div>
    </article>
  `).join("");
}

function renderShiftCastOptions() {
  const casts = state.casts.filter(
    (cast) => cast.store_id === state.store
  );

  $("shiftCast").innerHTML = casts
    .map((cast) => `<option value="${cast.id}">${escapeHtml(cast.name)}</option>`)
    .join("");
}

function renderShifts() {
  const date = $("shiftDate").value;
  const castMap = new Map(
    state.casts.map((cast) => [cast.id, cast])
  );

  const shifts = state.shifts.filter(
    (shift) =>
      shift.store_id === state.store &&
      shift.shift_date === date
  );

  $("shiftsEmpty").classList.toggle("hidden", shifts.length > 0);

  $("shiftsList").innerHTML = shifts.map((shift) => {
    const cast = castMap.get(shift.cast_id);
    const end = shift.end_time
      ? `〜${shift.end_time.slice(0, 5)}`
      : "〜";

    return `
      <article class="row">
        <div class="row-main">
          <div class="row-title">
            ${escapeHtml(cast?.name || "削除済みキャスト")}
          </div>

          <div class="row-sub">
            ${shift.start_time.slice(0, 5)}${end}
            ${shift.memo ? ` ｜ ${escapeHtml(shift.memo)}` : ""}
          </div>
        </div>

        <div class="row-actions">
          <button class="danger" data-delete-shift="${shift.id}">削除</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderAll() {
  renderCasts();
  renderShiftCastOptions();
  renderShifts();
}

function openCastDialog(cast = null) {
  $("castDialogTitle").textContent = cast
    ? "キャスト編集"
    : "キャスト追加";

  $("castId").value = cast?.id || "";
  $("castName").value = cast?.name || "";
  $("castPhoto").value = "";

  updatePhotoPreview(cast?.photo_data || null);

  $("castDialog").showModal();

  setTimeout(() => {
    $("castName").focus();
  }, 50);
}

$("castPhoto").addEventListener("change", async () => {
  const file = $("castPhoto").files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("画像ファイルを選んでください。");
    $("castPhoto").value = "";
    return;
  }

  try {
    setStatus("写真を処理中");

    const photoData = await imageFileToDataUrl(file);
    updatePhotoPreview(photoData);

    setStatus(
      state.online ? "Supabase同期" : "端末内保存",
      state.online ? "online" : "local"
    );
  } catch (error) {
    console.error(error);
    alert("写真を読み込めませんでした。");

    setStatus(
      state.online ? "Supabase同期" : "端末内保存",
      state.online ? "online" : "local"
    );
  }
});

$("removePhotoButton").addEventListener("click", () => {
  $("castPhoto").value = "";
  updatePhotoPreview(null);
});

document.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-tab]");

  if (tab) {
    document.querySelectorAll(".tab").forEach((button) => {
      button.classList.toggle("active", button === tab);
    });

    $("castsPanel").classList.toggle(
      "active",
      tab.dataset.tab === "casts"
    );

    $("shiftsPanel").classList.toggle(
      "active",
      tab.dataset.tab === "shifts"
    );
  }

  const closeButton = event.target.closest("[data-close]");

  if (closeButton) {
    $(closeButton.dataset.close).close();
  }

  if (event.target.id === "addCastButton") {
    openCastDialog();
  }

  const editCastId = event.target.dataset.editCast;

  if (editCastId) {
    const cast = state.casts.find(
      (item) => item.id === editCastId
    );

    openCastDialog(cast);
  }

  const deleteCastId = event.target.dataset.deleteCast;

  if (
    deleteCastId &&
    confirm("このキャストを削除しますか？関連する出勤も削除されます。")
  ) {
    try {
      await deleteCast(deleteCastId);
      renderAll();
    } catch (error) {
      alert(`削除できませんでした: ${error.message}`);
    }
  }

  if (event.target.id === "addShiftButton") {
    const hasCast = state.casts.some(
      (cast) => cast.store_id === state.store
    );

    if (!hasCast) {
      alert("先にキャストを登録してください。");
      return;
    }

    $("shiftStart").value = "";
    $("shiftEnd").value = "";
    $("shiftMemo").value = "";

    renderShiftCastOptions();
    $("shiftDialog").showModal();
  }

  const deleteShiftId = event.target.dataset.deleteShift;

  if (
    deleteShiftId &&
    confirm("この出勤を削除しますか？")
  ) {
    try {
      await deleteShift(deleteShiftId);
      renderShifts();
    } catch (error) {
      alert(`削除できませんでした: ${error.message}`);
    }
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
  const existing = state.casts.find(
    (cast) => cast.id === id
  );

  const record = {
    id,
    store_id: state.store,
    name: $("castName").value.trim(),
    photo_data: state.pendingPhoto,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!record.name) {
    return;
  }

  try {
    const saved = await saveCast(record);
    const index = state.casts.findIndex(
      (cast) => cast.id === saved.id
    );

    if (index >= 0) {
      state.casts[index] = saved;
    } else {
      state.casts.push(saved);
    }

    writeLocal("casts", state.casts);

    $("castDialog").close();
    renderAll();
  } catch (error) {
    alert(`保存できませんでした: ${error.message}`);
  }
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
  } catch (error) {
    alert(`保存できませんでした: ${error.message}`);
  }
});

(async function initialize() {
  renderStores();

  $("shiftDate").value = new Date()
    .toISOString()
    .slice(0, 10);

  await initDb();
  await loadData();

  renderAll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
})();
