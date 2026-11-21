/**
 * DocuStruct AI — Intelligent Document-to-Database Extractor
 * IBM AI Builders Challenge — Track IT: Document to Database AI
 *
 * script.js — Main Application Logic
 * Modules: SampleData | Parser | Validator | Store | Renderer | CRUD | Export | UI
 *
 * Standards:
 *  - XSS-safe: All user content rendered via textContent or sanitized helpers
 *  - Descriptive naming, section comments on every major block
 *  - No external libraries (Vanilla JS only)
 */

'use strict';

/* =============================================================
   MODULE: CONSTANTS & CONFIG
   ============================================================= */

/** localStorage key for persisting database entries */
const STORAGE_KEY = 'docustruct_ai_db';

/** Column field definitions (order matters for export) */
const FIELDS = ['name', 'date', 'time', 'category', 'location', 'status', 'validation'];

/** Column display labels */
const FIELD_LABELS = {
  name:        'Nama / Subjek',
  date:        'Tanggal',
  time:        'Waktu',
  category:    'Kategori',
  location:    'Lokasi / Unit',
  status:      'Status / Keterangan',
  validation:  'Status Validasi',
  extractedAt: 'Diekstraksi Pada',
  confidence:  'Confidence Score (%)',
};

/**
 * The 5 core fields used for confidence score calculation.
 * Each present field contributes 20% (5 × 20 = 100%).
 */
const CONFIDENCE_FIELDS = ['name', 'date', 'category', 'location', 'status'];

/* =============================================================
   MODULE: SAMPLE DATA
   Three realistic Indonesian document scenarios for demo/testing.
   ============================================================= */

const SAMPLE_DATA = {
  /**
   * Contoh 1: Buku Tamu / Log Kunjungan
   * Multiple visitor entries in free-text format
   */
  '1': `BUKU TAMU KANTOR PUSAT — PT. NUSANTARA TEKNOLOGI
Periode: Januari 2025

Tanggal 6 Januari 2025 pukul 08:45 — Budi Santoso dari PT. Mitra Jaya, divisi Pengadaan, datang ke Gedung A Lantai 3 untuk keperluan presentasi proposal pengadaan server. Status: Selesai.

07/01/2025, jam 10:00 pagi. Nama tamu: Sari Dewi Rahayu, asal perusahaan PT Konsultan Global, tujuan: pertemuan dengan HRD mengenai rekrutmen. Lokasi: Ruang Rapat B2. Keterangan: Selesai dan tanda tangan keluar 11:30.

Tanggal 8 Januari 2025. Tamu: Ahmad Fauzi (Kepala Teknis, CV. Bangun Citra). Keperluan: inspeksi instalasi AC unit baru di Gudang Selatan. Waktu masuk: 13:00. Waktu keluar: 16:30. Status kunjungan: Selesai.

9 Jan 2025 09:30 — tanpa nama tamu tercatat, asal: tidak diketahui, tujuan: antar paket ekspedisi ke resepsionis. Lokasi: Lobby utama. Status: Selesai.

Tanggal: 10 Januari 2025. Rudi Hermawan, Divisi IT Internal. Keperluan: penggantian perangkat laptop user. Ruangan: Server Room Lt.2. Status: Dalam Proses — menunggu approval IT Security.`,

  /**
   * Contoh 2: Laporan Kegiatan Harian
   * Daily activity report with varied formats
   */
  '2': `LAPORAN KEGIATAN HARIAN
Unit: Divisi Teknologi Informasi — Departemen Infrastruktur
Tanggal Laporan: 15 Februari 2025

Kegiatan 1:
Nama Penanggung Jawab: Irwan Kusuma
Jenis Kegiatan: Maintenance Rutin Server
Waktu Pelaksanaan: 08:00 – 10:00
Lokasi: Data Center Lantai 1
Status: Selesai dengan hasil normal

Kegiatan 2:
PIC: Nita Puspitasari, tim Jaringan
Kegiatan: Konfigurasi ulang firewall perimeter untuk segmentasi VLAN baru
Waktu mulai: 10:30 pagi, berakhir sekitar pukul 13:00
Unit/Ruangan: Network Operation Center (NOC)
Status akhir: Berhasil, tidak ada downtime tercatat

Kegiatan 3:
15/02/2025 jam 14:00. Doni Prasetyo. Pelatihan penggunaan aplikasi ERP modul HR untuk staf baru. Ruang Training Center. Peserta 12 orang. Selesai pukul 17:00.

Kegiatan 4 (tidak lengkap):
Waktu: sore hari (jam tidak tercatat). Tim pemeliharaan gedung melakukan pengecekan UPS. Lokasi: —. Status: Belum selesai.

Kegiatan 5:
Tanggal 15 Februari 2025, pukul 19:00. On-call engineer Bagas Wibowo melakukan penanganan insiden downtime sistem absensi. Lokasi: Remote/WFH. Status: Resolved — sistem kembali normal pukul 20:15.`,

  /**
   * Contoh 3: Berita Acara Rapat
   * Meeting minutes with structured and unstructured entries mixed
   */
  '3': `BERITA ACARA RAPAT KOORDINASI BULANAN
Tanggal: 20 Maret 2025 | Waktu: 09:00 – 11:30 WIB
Lokasi: Ruang Direksi, Gedung Pusat Lt. 10
Dipimpin oleh: Direktur Operasional

DAFTAR HADIR:
1. Hendra Gunawan — Manajer IT, hadir lengkap
2. Maya Sari Utami — Kepala HRD, hadir dari pukul 09:00 sampai 10:45 (meninggalkan rapat lebih awal)
3. Bram Nugroho — Manajer Keuangan, hadir penuh
4. Lestari Ningrum — Staf Admin, hadir sebagai notulen
5. Tidak ada konfirmasi dari Manajer Logistik — absen tanpa keterangan

AGENDA & HASIL RAPAT:
Agenda 1: Review KPI Q1 2025. Presentasi oleh Hendra Gunawan, Ruang Direksi, 20/03/2025 pukul 09:15. Status: Selesai dipaparkan, disetujui dengan catatan minor.
Agenda 2: Pembahasan anggaran pengadaan server tambahan. PIC: Bram Nugroho. Waktu: 10:00. Lokasi: Ruang Direksi. Status: Pending — perlu persetujuan CFO.
Agenda 3: Update program rekrutmen Q2. Maya Sari Utami. 10:30, Ruang Direksi. Status: Selesai.
Agenda 4 — tidak tercatat nama PIC, hanya disebutkan "tim IT", waktu tidak jelas, lokasi: Ruang Direksi. Status: Ditunda ke rapat berikutnya.`
};

/* =============================================================
   MODULE: STATE
   Central reactive state object for the application.
   ============================================================= */

const AppState = {
  /** Master array of all database entries (source of truth) */
  entries: [],

  /** Active filter: 'all' | 'valid' | 'review' */
  currentFilter: 'all',

  /** Active search query string */
  currentSearch: '',

  /** Total extraction sessions run */
  sessionCount: 0,
};

/* =============================================================
   MODULE: UTILITY HELPERS
   XSS-safe DOM manipulation and string utilities.
   ============================================================= */

/**
 * Sanitize a value for safe text insertion (XSS prevention).
 * Uses DOM's built-in textContent escaping.
 * @param {*} value - Raw user input
 * @returns {string} Sanitized string safe for display
 */
function sanitize(value) {
  if (value === null || value === undefined) return '';
  const temp = document.createElement('div');
  temp.textContent = String(value);
  return temp.innerHTML; // HTML-escaped string
}

/**
 * Generate a unique ID string (timestamp + random).
 * @returns {string}
 */
function generateId() {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Format current timestamp as ISO-like string for display.
 * @returns {string}
 */
function nowTimestamp() {
  return new Date().toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Truncate string to max length with ellipsis.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function truncate(str, max = 50) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/* =============================================================
   MODULE: PARSER ENGINE
   Extracts structured entities from free-form text using
   Regex patterns and keyword matching.
   ============================================================= */

/**
 * Split a large document text into individual "blocks" or records.
 * Heuristic: split on blank lines or numbered list patterns.
 * @param {string} text - Raw document text
 * @returns {string[]} Array of text blocks
 */
function splitIntoBlocks(text) {
  // Split on two or more newlines (paragraph breaks)
  const rawBlocks = text.split(/\n{2,}/);

  const blocks = [];
  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (trimmed.length < 10) continue; // Skip near-empty blocks

    // Further split numbered list items within a block: "1. ...\n2. ..."
    const numbered = trimmed.split(/\n(?=\d+[\.\)]\s)/);
    if (numbered.length > 1) {
      for (const nb of numbered) {
        const t = nb.trim();
        if (t.length >= 10) blocks.push(t);
      }
    } else {
      blocks.push(trimmed);
    }
  }
  return blocks.length > 0 ? blocks : [text.trim()];
}

/**
 * Extract a DATE from text using multiple pattern matching strategies.
 * @param {string} text
 * @returns {string} Extracted date string or empty string
 */
function extractDate(text) {
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
    // "Tanggal 15 Januari 2025" or "tanggal: 15 Jan 2025"
    /(?:tanggal\s*:?\s*)(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|mei|jun|jul|ags|aug|sep|okt|oct|nov|des|dec)\s+(\d{4})/i,
    // "15 Januari 2025" standalone
    /\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|mei|jun|jul|ags|aug|sep|okt|oct|nov|des|dec)\s+(\d{4})\b/i,
    // "20/03/2025" or "20-03-2025"
    /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/,
    // YYYY-MM-DD ISO
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].trim();
  }
  return '';
}

/**
 * Extract a TIME from text.
 * @param {string} text
 * @returns {string}
 */
function extractTime(text) {
  const patterns = [
    // "pukul 09:00" or "jam 10:00" or "09.00" or "09:00"
    /(?:pukul|jam|pk\.?)\s*(\d{1,2})[:\.](\d{2})(?:\s*(?:WIB|WITA|WIT|pagi|siang|sore|malam))?/i,
    // Standalone HH:MM
    /\b(\d{1,2}):(\d{2})\b/,
    // HH.MM format
    /\b(\d{1,2})\.(\d{2})\b(?!\d)/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      // Normalize to HH:MM format
      const full = m[0].trim();
      const hourMin = full.match(/(\d{1,2})[:\.](\d{2})/);
      if (hourMin) return `${hourMin[1].padStart(2,'0')}:${hourMin[2]}`;
      return full;
    }
  }
  return '';
}

/**
 * Extract a NAME / SUBJECT from a text block.
 * Uses keyword signals and capitalization heuristics.
 * @param {string} text
 * @returns {string}
 */
function extractName(text) {
  const patterns = [
    // "Nama: X" or "Nama Tamu: X" or "PIC: X" or "Oleh: X"
    /(?:nama\s*(?:tamu|lengkap|penanggung\s*jawab)?\s*:?\s*)([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s\.\,]{2,50}?)(?:\s*[\,\-\n]|,\s*(?:dari|asal|divisi|tim|staf|bagian|manajer|kepala|direktur|unit))/i,
    /(?:^|\n)\s*(?:PIC|penanggung\s*jawab)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s\.]{2,50}?)(?:\s*[\,\-\n]|,)/i,
    /(?:dipimpin\s*oleh\s*:?\s*)([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s\.]{2,50}?)(?:\n|$)/i,
    // "1. Hendra Gunawan — Manajer" (numbered list)
    /^\s*\d+\.\s+([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s\.]{2,50?})\s+[—\-]/m,
    // After a date+time pattern: "— Budi Santoso dari..."
    /[—\-]\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ\s\.]{2,50?})\s+(?:dari|asal)/,
    // Bare "Tamu: X"
    /(?:^|\n)\s*(?:tamu|nama)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s\.]{2,50?})/im,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const candidate = m[1].trim().replace(/\s+/g, ' ');
      // Reject if looks like a date, time, or too short
      if (candidate.length >= 3 && !/^\d/.test(candidate)) {
        return candidate.replace(/[,\.\-]+$/, '');
      }
    }
  }
  return '';
}

/**
 * Extract a CATEGORY / TYPE OF ACTIVITY from text.
 * @param {string} text
 * @returns {string}
 */
function extractCategory(text) {
  const keywordMap = [
    { regex: /(?:jenis\s*kegiatan|keperluan|agenda|kegiatan)\s*:?\s*([^\n\.,;]{5,80})/i,  group: 1 },
    { regex: /maintenance|pemeliharaan|perbaikan/i,       value: 'Maintenance' },
    { regex: /instalasi|install/i,                        value: 'Instalasi' },
    { regex: /(?:rapat|meeting|koordinasi)/i,             value: 'Rapat' },
    { regex: /(?:pelatihan|training)/i,                   value: 'Pelatihan' },
    { regex: /(?:kunjungan|tamu|visit)/i,                 value: 'Kunjungan' },
    { regex: /(?:presentasi|paparan)/i,                   value: 'Presentasi' },
    { regex: /(?:inspeksi|cek|pengecekan)/i,              value: 'Inspeksi' },
    { regex: /(?:pengadaan|procurement)/i,                value: 'Pengadaan' },
    { regex: /(?:insiden|incident|downtime)/i,            value: 'Penanganan Insiden' },
    { regex: /(?:konfigurasi|config)/i,                   value: 'Konfigurasi' },
    { regex: /(?:rekrutmen|recruitment)/i,                value: 'Rekrutmen' },
    { regex: /(?:pengiriman|antar\s*paket|ekspedisi)/i,   value: 'Pengiriman' },
    { regex: /(?:penggantian|replace)/i,                  value: 'Penggantian Perangkat' },
    { regex: /(?:review|evaluasi)/i,                      value: 'Review / Evaluasi' },
  ];

  for (const entry of keywordMap) {
    const m = text.match(entry.regex);
    if (m) {
      if (entry.value) return entry.value;
      if (entry.group !== undefined && m[entry.group]) {
        return m[entry.group].trim().replace(/\s+/g, ' ').replace(/[,\.\-\—]+$/, '');
      }
    }
  }
  return '';
}

/**
 * Extract a LOCATION / UNIT from text.
 * @param {string} text
 * @returns {string}
 */
function extractLocation(text) {
  const patterns = [
    /(?:lokasi|ruangan?|ruang\s*rapat|gedung|lantai|unit|tempat)\s*:?\s*([^\n,;\.]{3,80}?)(?:\s*[\.\n,;]|$)/i,
    /(?:di\s+)((?:Gedung|Ruang|Lantai|Data Center|NOC|Server Room|Lobby|Gudang)[^,\.\n;]{0,60})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const candidate = m[1].trim().replace(/\s+/g, ' ').replace(/[—\-\.\,]+$/, '');
      if (candidate.length >= 2 && candidate !== '—' && candidate !== '-') return candidate;
    }
  }
  return '';
}

/**
 * Extract a STATUS / DESCRIPTION from text.
 * @param {string} text
 * @returns {string}
 */
function extractStatus(text) {
  const patterns = [
    /(?:^|\n)\s*status(?:\s*akhir|\s*kunjungan|\s*kegiatan)?\s*:?\s*([^\n]{3,100})/im,
    /(?:^|\n)\s*keterangan\s*:?\s*([^\n]{3,100})/im,
    /(?:status\s*:?\s*)([^\n\.,;]{3,80})/i,
  ];
  const statusKeywords = [
    'selesai', 'berhasil', 'sukses', 'completed', 'done',
    'dalam proses', 'in progress', 'pending', 'ditunda',
    'resolved', 'belum', 'gagal', 'dibatalkan', 'cancel',
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      return m[1].trim().replace(/\s+/g, ' ').replace(/[—\-]+$/, '');
    }
  }

  // Fallback: keyword scan
  const lower = text.toLowerCase();
  for (const kw of statusKeywords) {
    if (lower.includes(kw)) {
      return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
  }
  return '';
}

/**
 * Parse a single text block into a structured entry object.
 * Calls all individual field extractors.
 * @param {string} block - Text block for one entry
 * @returns {Object} Structured entry with all fields
 */
function parseBlock(block) {
  const name     = extractName(block);
  const date     = extractDate(block);
  const time     = extractTime(block);
  const category = extractCategory(block);
  const location = extractLocation(block);
  const status   = extractStatus(block);

  return { name, date, time, category, location, status };
}

/* =============================================================
   MODULE: CONFIDENCE SCORE
   Dynamically calculates extraction completeness (0–100%).
   ============================================================= */

/**
 * Compute the confidence score for a parsed entry.
 * Each of the 5 core fields (CONFIDENCE_FIELDS) contributes 20%.
 * @param {Object} entry - Parsed or stored entry object
 * @returns {number} Score in range [0, 100] (multiples of 20)
 */
function computeConfidence(entry) {
  let filled = 0;
  for (const field of CONFIDENCE_FIELDS) {
    if (entry[field] && String(entry[field]).trim() !== '') filled++;
  }
  return filled * 20;
}

/* =============================================================
   MODULE: VALIDATOR
   Determines validation status of parsed entries.
   ============================================================= */

/**
 * Validate a parsed entry. An entry is "valid" if it has at least
 * 4 of the 6 core fields populated and no anomaly flags.
 * Returns 'valid' or 'review'.
 * @param {Object} entry - Parsed entry { name, date, time, category, location, status }
 * @returns {{ status: 'valid'|'review', reasons: string[] }}
 */
function validateEntry(entry) {
  const reasons = [];
  const coreFields = CONFIDENCE_FIELDS;
  let missingCount = 0;

  for (const field of coreFields) {
    if (!entry[field] || entry[field].trim() === '') {
      missingCount++;
      reasons.push(`${FIELD_LABELS[field] || field} tidak ditemukan`);
    }
  }

  // Flag anomalies: name too short, date invalid, etc.
  if (entry.name && entry.name.length < 3) {
    reasons.push('Nama terlalu pendek atau tidak valid');
  }
  if (entry.date && /^\d{1,2}$/.test(entry.date.trim())) {
    reasons.push('Format tanggal tidak lengkap');
  }

  // Validation rule: need at least 3 of 5 core fields to be valid
  const validationStatus = missingCount <= 2 ? 'valid' : 'review';
  return { status: validationStatus, reasons };
}

/* =============================================================
   MODULE: STORE (localStorage)
   Persist and load database entries.
   ============================================================= */

/**
 * Save all entries to localStorage.
 */
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.entries));
  } catch (e) {
    console.warn('DocuStruct AI: localStorage save failed.', e);
  }
}

/**
 * Load entries from localStorage into AppState.
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        AppState.entries = parsed;
      }
    }
  } catch (e) {
    console.warn('DocuStruct AI: localStorage load failed.', e);
    AppState.entries = [];
  }
}

/**
 * Clear all entries from storage and state.
 */
function clearStorage() {
  AppState.entries = [];
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get storage size info string for display.
 * @returns {string}
 */
function getStorageInfo() {
  try {
    const size = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
    if (size < 1024) return `localStorage: ${size} B`;
    return `localStorage: ${(size / 1024).toFixed(1)} KB`;
  } catch {
    return '';
  }
}

/* =============================================================
   MODULE: RENDERER
   Renders the filtered/searched table rows and KPI cards.
   ============================================================= */

/**
 * Get the filtered and searched subset of entries.
 * @returns {Object[]} Filtered entries
 */
function getFilteredEntries() {
  let items = AppState.entries;

  // Apply status filter
  if (AppState.currentFilter !== 'all') {
    items = items.filter(e => e.validation === AppState.currentFilter);
  }

  // Apply search filter (case-insensitive across all string fields)
  const q = AppState.currentSearch.trim().toLowerCase();
  if (q) {
    items = items.filter(e =>
      FIELDS.some(f => typeof e[f] === 'string' && e[f].toLowerCase().includes(q))
    );
  }

  return items;
}

/**
 * Render (or re-render) the full table based on current state.
 */
function renderTable() {
  const tbody = document.getElementById('db-table-body');
  const emptyState = document.getElementById('empty-state');
  const tableInfo = document.getElementById('table-info');
  const storageInfo = document.getElementById('table-storage-info');

  const filtered = getFilteredEntries();
  const total = AppState.entries.length;

  // Update table info footer
  tableInfo.textContent = `Menampilkan ${filtered.length} dari ${total} entri`;
  storageInfo.textContent = total > 0 ? getStorageInfo() : '';

  // Show/hide empty state
  if (total === 0) {
    emptyState.classList.add('visible');
    tbody.innerHTML = '';
    return;
  } else {
    emptyState.classList.remove('visible');
  }

  // Build table rows — using textContent for XSS safety
  const fragment = document.createDocumentFragment();

  filtered.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.id = entry.id;
    tr.classList.add('transition-colors', 'duration-150');

    // Row number
    const tdNum = document.createElement('td');
    tdNum.className = 'px-4 py-3';
    const numSpan = document.createElement('span');
    numSpan.className = 'row-number font-mono';
    numSpan.textContent = String(idx + 1).padStart(2, '0');
    tdNum.appendChild(numSpan);
    tr.appendChild(tdNum);

    // Name
    tr.appendChild(createCell(entry.name || '—', 'font-medium text-slate-800'));

    // Date + Time (combined)
    const tdDateTime = document.createElement('td');
    tdDateTime.className = 'px-4 py-3';
    const dtDiv = document.createElement('div');
    const dateSpan = document.createElement('span');
    dateSpan.className = 'cell-text text-slate-700 text-xs font-medium';
    dateSpan.textContent = entry.date || '—';
    const timeSpan = document.createElement('span');
    timeSpan.className = 'cell-text-sm mt-0.5';
    timeSpan.textContent = entry.time || '';
    dtDiv.appendChild(dateSpan);
    if (entry.time) dtDiv.appendChild(timeSpan);
    tdDateTime.appendChild(dtDiv);
    tr.appendChild(tdDateTime);

    // Category
    tr.appendChild(createCell(entry.category || '—', 'text-slate-600 text-xs'));

    // Location
    tr.appendChild(createCell(entry.location || '—', 'text-slate-600 text-xs'));

    // Status
    tr.appendChild(createCell(entry.status || '—', 'text-slate-600 text-xs'));

    // Confidence Score
    const score = typeof entry.confidence === 'number' ? entry.confidence : computeConfidence(entry);
    const tdConf = document.createElement('td');
    tdConf.className = 'px-4 py-3';
    const confWrap = document.createElement('div');
    confWrap.className = 'flex flex-col gap-1 min-w-[72px]';
    const confLabel = document.createElement('span');
    confLabel.className = 'text-xs font-semibold ' + (score === 100 ? 'text-emerald-600' : score >= 60 ? 'text-indigo-600' : 'text-amber-600');
    confLabel.textContent = `${score}%`;
    const confBar = document.createElement('div');
    confBar.className = 'w-full bg-slate-100 rounded-full h-1';
    const confFill = document.createElement('div');
    confFill.className = 'h-1 rounded-full transition-all duration-500 ' + (score === 100 ? 'bg-emerald-500' : score >= 60 ? 'bg-indigo-500' : 'bg-amber-400');
    confFill.style.width = `${score}%`;
    confBar.appendChild(confFill);
    confWrap.appendChild(confLabel);
    confWrap.appendChild(confBar);
    tdConf.appendChild(confWrap);
    tr.appendChild(tdConf);

    // Validation badge
    const tdVal = document.createElement('td');
    tdVal.className = 'px-4 py-3';
    const badge = document.createElement('span');
    if (entry.validation === 'valid') {
      badge.className = 'badge badge-valid';
      badge.textContent = '✓ Valid';
    } else {
      badge.className = 'badge badge-review';
      badge.title = entry.validationReasons ? entry.validationReasons.join('; ') : '';
      badge.textContent = '⚠ Perlu Review';
    }
    tdVal.appendChild(badge);
    tr.appendChild(tdVal);

    // Action buttons
    const tdActions = document.createElement('td');
    tdActions.className = 'px-4 py-3 text-right whitespace-nowrap';

    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn action-btn-edit';
    editBtn.dataset.action = 'edit';
    editBtn.dataset.id = entry.id;
    editBtn.setAttribute('aria-label', `Edit entri ${entry.name || idx + 1}`);
    editBtn.title = 'Edit entri';
    editBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

    const delBtn = document.createElement('button');
    delBtn.className = 'action-btn action-btn-delete ml-1';
    delBtn.dataset.action = 'delete';
    delBtn.dataset.id = entry.id;
    delBtn.setAttribute('aria-label', `Hapus entri ${entry.name || idx + 1}`);
    delBtn.title = 'Hapus entri';
    delBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>';

    tdActions.appendChild(editBtn);
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    fragment.appendChild(tr);
  });

  tbody.innerHTML = '';
  tbody.appendChild(fragment);
}

/**
 * Helper to create a standard <td> with text content.
 * Uses textContent internally — XSS safe.
 * @param {string} text
 * @param {string} className
 * @returns {HTMLTableCellElement}
 */
function createCell(text, className = '') {
  const td = document.createElement('td');
  td.className = 'px-4 py-3';
  const span = document.createElement('span');
  span.className = `cell-text ${className}`.trim();
  span.textContent = truncate(text, 60);
  span.title = text; // Show full text on hover
  td.appendChild(span);
  return td;
}

/**
 * Update all KPI dashboard cards with current state data.
 */
function renderKPIs() {
  const total    = AppState.entries.length;
  const valid    = AppState.entries.filter(e => e.validation === 'valid').length;
  const review   = AppState.entries.filter(e => e.validation === 'review').length;
  const accuracy = total > 0 ? Math.round((valid / total) * 100) : 0;

  animateKPIValue('kpi-total',    total);
  animateKPIValue('kpi-valid',    valid);
  animateKPIValue('kpi-review',   review);

  const accuracyEl = document.getElementById('kpi-accuracy');
  const accuracyBar = document.getElementById('kpi-accuracy-bar');
  accuracyEl.textContent = `${accuracy}%`;
  accuracyEl.classList.remove('kpi-updated');
  void accuracyEl.offsetWidth; // force reflow for animation
  accuracyEl.classList.add('kpi-updated');
  accuracyBar.style.width = `${accuracy}%`;
}

/**
 * Animate a KPI number change using counting effect.
 * @param {string} elementId
 * @param {number} targetValue
 */
function animateKPIValue(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const current = parseInt(el.textContent) || 0;
  if (current === targetValue) return;

  el.classList.remove('kpi-updated');
  void el.offsetWidth;
  el.classList.add('kpi-updated');
  el.textContent = targetValue;
}

/* =============================================================
   MODULE: EXTRACTION ENGINE
   Orchestrates the full parse+validate pipeline.
   ============================================================= */

/**
 * Extract all entries from the textarea input.
 * Splits into blocks, parses each, validates, and saves.
 */
function extractDocument() {
  const input = document.getElementById('document-input');
  const feedback = document.getElementById('extract-feedback');
  const rawText = input.value.trim();

  // Guard: empty input
  if (!rawText) {
    showFeedback(feedback, 'error', '⚠ Teks dokumen kosong. Muat contoh data atau tempelkan teks terlebih dahulu.');
    return;
  }

  // Guard: too short
  if (rawText.length < 20) {
    showFeedback(feedback, 'error', '⚠ Teks terlalu pendek untuk diekstraksi. Masukkan teks yang lebih panjang.');
    return;
  }

  // Split document into blocks
  const blocks = splitIntoBlocks(rawText);

  if (blocks.length === 0) {
    showFeedback(feedback, 'warning', '⚠ Tidak ditemukan blok data yang dapat diproses.');
    return;
  }

  let newEntries = [];
  let newValidCount = 0;
  let newReviewCount = 0;

  for (const block of blocks) {
    const parsed = parseBlock(block);
    const { status, reasons } = validateEntry(parsed);

    const entry = {
      id:                generateId(),
      name:              parsed.name,
      date:              parsed.date,
      time:              parsed.time,
      category:          parsed.category,
      location:          parsed.location,
      status:            parsed.status,
      validation:        status,
      validationReasons: reasons,
      confidence:        computeConfidence(parsed),
      extractedAt:       nowTimestamp(),
      rawBlock:          block.slice(0, 300), // Store snippet of original text
    };

    newEntries.push(entry);
    if (status === 'valid') newValidCount++;
    else newReviewCount++;
  }

  // Merge new entries with existing (prepend new ones)
  AppState.entries = [...newEntries, ...AppState.entries];
  AppState.sessionCount++;

  saveToStorage();
  renderTable();
  renderKPIs();

  // Show extraction result feedback
  const msg = `✓ Berhasil mengekstraksi ${newEntries.length} entri — ${newValidCount} valid, ${newReviewCount} perlu review.`;
  showFeedback(feedback, newReviewCount > 0 ? 'warning' : 'success', msg);

  // Highlight first new row
  setTimeout(() => {
    const firstRow = document.querySelector('#db-table-body tr:first-child');
    if (firstRow) {
      firstRow.classList.add('row-highlight');
      firstRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);

  showToast(`Ekstraksi selesai: ${newEntries.length} entri ditambahkan`, 'success');
}

/**
 * Show inline feedback banner below the textarea.
 * @param {HTMLElement} el - Feedback element
 * @param {'success'|'warning'|'error'} type
 * @param {string} message
 */
function showFeedback(el, type, message) {
  el.className = `mt-3 text-xs rounded-lg px-3 py-2 font-medium feedback-${type}`;
  el.textContent = message; // textContent — XSS safe
  el.classList.remove('hidden');

  // Auto-hide after 6 seconds for success
  if (type === 'success') {
    setTimeout(() => { el.classList.add('hidden'); }, 6000);
  }
}

/* =============================================================
   MODULE: CRUD OPERATIONS
   Edit and Delete entries in the database.
   ============================================================= */

/**
 * Open the edit modal populated with the given entry's data.
 * @param {string} entryId - Entry ID to edit
 */
function openEditModal(entryId) {
  const entry = AppState.entries.find(e => e.id === entryId);
  if (!entry) return;

  document.getElementById('modal-id').value         = entry.id;
  document.getElementById('modal-name').value       = entry.name       || '';
  document.getElementById('modal-date').value       = entry.date       || '';
  document.getElementById('modal-time').value       = entry.time       || '';
  document.getElementById('modal-category').value   = entry.category   || '';
  document.getElementById('modal-location').value   = entry.location   || '';
  document.getElementById('modal-status').value     = entry.status     || '';
  document.getElementById('modal-validation').value = entry.validation || 'review';

  const modal = document.getElementById('edit-modal');
  modal.classList.remove('hidden');
  document.getElementById('modal-name').focus();
  document.body.style.overflow = 'hidden';
}

/**
 * Save changes from the edit modal back to the entry.
 */
function saveEditModal() {
  const id = document.getElementById('modal-id').value;
  const idx = AppState.entries.findIndex(e => e.id === id);
  if (idx === -1) return;

  // Read values — stored as text, XSS handled by textContent at render time
  AppState.entries[idx].name       = document.getElementById('modal-name').value.trim();
  AppState.entries[idx].date       = document.getElementById('modal-date').value.trim();
  AppState.entries[idx].time       = document.getElementById('modal-time').value.trim();
  AppState.entries[idx].category   = document.getElementById('modal-category').value.trim();
  AppState.entries[idx].location   = document.getElementById('modal-location').value.trim();
  AppState.entries[idx].status     = document.getElementById('modal-status').value.trim();
  AppState.entries[idx].validation = document.getElementById('modal-validation').value;
  AppState.entries[idx].editedAt   = nowTimestamp();

  // Clear validation reasons if manually set to valid
  if (AppState.entries[idx].validation === 'valid') {
    AppState.entries[idx].validationReasons = [];
  }

  saveToStorage();
  closeEditModal();
  renderTable();
  renderKPIs();
  showToast('Entri berhasil diperbarui', 'success');
}

/**
 * Close the edit modal.
 */
function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

/**
 * Delete a single entry by ID after confirmation.
 * @param {string} entryId
 */
function deleteEntry(entryId) {
  const entry = AppState.entries.find(e => e.id === entryId);
  const name = entry ? (entry.name || 'entri ini') : 'entri ini';

  openConfirmModal(
    `Hapus entri "${truncate(name, 40)}"?`,
    () => {
      AppState.entries = AppState.entries.filter(e => e.id !== entryId);
      saveToStorage();
      renderTable();
      renderKPIs();
      showToast('Entri dihapus', 'info');
    }
  );
}

/**
 * Delete all entries after confirmation.
 */
function clearAllEntries() {
  if (AppState.entries.length === 0) {
    showToast('Database sudah kosong', 'warning');
    return;
  }

  openConfirmModal(
    `Hapus semua ${AppState.entries.length} entri dari database?`,
    () => {
      clearStorage();
      renderTable();
      renderKPIs();
      showToast('Semua data dihapus', 'info');
    }
  );
}

/* =============================================================
   MODULE: CONFIRM MODAL
   Reusable confirmation dialog.
   ============================================================= */

/** Stored callback for confirm modal OK action */
let _confirmCallback = null;

/**
 * Open the confirmation modal with a custom message and callback.
 * @param {string} message
 * @param {Function} onConfirm
 */
function openConfirmModal(message, onConfirm) {
  document.getElementById('confirm-message').textContent = message; // XSS safe
  _confirmCallback = onConfirm;
  document.getElementById('confirm-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('confirm-ok').focus();
}

/**
 * Close the confirmation modal.
 */
function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  document.body.style.overflow = '';
  _confirmCallback = null;
}

/* =============================================================
   MODULE: EXPORT
   Download data as CSV or JSON file.
   ============================================================= */

/**
 * Build CSV string from all entries.
 * Properly escapes fields containing commas, quotes, or newlines.
 * @returns {string} CSV content
 */
function buildCSV() {
  const exportFields = ['name', 'date', 'time', 'category', 'location', 'status', 'validation', 'extractedAt'];
  const header = exportFields.map(f => FIELD_LABELS[f] || f).join(',');

  const rows = AppState.entries.map(entry => {
    return exportFields.map(field => {
      const val = entry[field] !== undefined ? String(entry[field]) : '';
      // CSV escaping: wrap in quotes if contains comma, quote, or newline
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });

  return [header, ...rows].join('\r\n');
}

/**
 * Build clean JSON string for export (excludes internal fields).
 * @returns {string} JSON content
 */
function buildJSON() {
  const exportFields = ['id', 'name', 'date', 'time', 'category', 'location', 'status', 'validation', 'extractedAt', 'editedAt'];
  const clean = AppState.entries.map(entry => {
    const obj = {};
    for (const f of exportFields) {
      if (entry[f] !== undefined && entry[f] !== '') obj[f] = entry[f];
    }
    return obj;
  });
  return JSON.stringify({ exportedAt: nowTimestamp(), totalEntries: clean.length, data: clean }, null, 2);
}

/**
 * Trigger a file download in the browser.
 * @param {string} content - File content string
 * @param {string} filename - Suggested filename
 * @param {string} mimeType - MIME type (e.g. 'text/csv')
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export all entries as a CSV file.
 */
function exportCSV() {
  if (AppState.entries.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'warning');
    return;
  }
  const csv = buildCSV();
  const filename = `docustruct_ai_export_${Date.now()}.csv`;
  downloadFile(csv, filename, 'text/csv');
  showToast(`CSV diekspor: ${AppState.entries.length} entri`, 'success');
}

/**
 * Export all entries as a JSON file.
 */
function exportJSON() {
  if (AppState.entries.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'warning');
    return;
  }
  const json = buildJSON();
  const filename = `docustruct_ai_export_${Date.now()}.json`;
  downloadFile(json, filename, 'application/json');
  showToast(`JSON diekspor: ${AppState.entries.length} entri`, 'success');
}

/**
 * Build a SQL INSERT INTO statement string for all currently visible
 * (filtered) entries, ready to paste into any SQL client.
 * Uses the `documents` table with columns matching CONFIDENCE_FIELDS
 * plus date, time, validation, confidence, and extracted_at.
 * @returns {string} Multi-statement SQL string
 */
function buildSQL() {
  const filtered = getFilteredEntries();
  if (filtered.length === 0) return '';

  /**
   * Escape a value for safe SQL single-quoted string literals.
   * Escapes single quotes by doubling them (standard SQL).
   * @param {*} val
   * @returns {string}
   */
  function sqlEscape(val) {
    if (val === null || val === undefined || val === '') return 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
  }

  const lines = [
    '-- DocuStruct AI — Generated SQL INSERT Statements',
    `-- Exported: ${nowTimestamp()} | Rows: ${filtered.length}`,
    '',
    'INSERT INTO documents',
    '  (name, date, time, category, location, status, validation, confidence, extracted_at)',
    'VALUES',
  ];

  filtered.forEach((entry, idx) => {
    const isLast = idx === filtered.length - 1;
    const row = [
      sqlEscape(entry.name),
      sqlEscape(entry.date),
      sqlEscape(entry.time),
      sqlEscape(entry.category),
      sqlEscape(entry.location),
      sqlEscape(entry.status),
      sqlEscape(entry.validation),
      entry.confidence !== undefined ? entry.confidence : computeConfidence(entry),
      sqlEscape(entry.extractedAt),
    ].join(', ');
    lines.push(`  (${row})${isLast ? ';' : ','}`);
  });

  return lines.join('\n');
}

/**
 * Copy the SQL INSERT query for visible entries to the clipboard.
 * Shows a success or error toast based on the outcome.
 */
function copySQLToClipboard() {
  if (AppState.entries.length === 0) {
    showToast('Tidak ada data untuk disalin', 'warning');
    return;
  }

  const sql = buildSQL();
  if (!sql) {
    showToast('Tidak ada entri yang sesuai filter saat ini', 'warning');
    return;
  }

  // Use the modern Clipboard API with a graceful fallback
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(sql)
      .then(() => {
        showToast(`SQL disalin: ${getFilteredEntries().length} baris INSERT`, 'success');
      })
      .catch(() => {
        _fallbackCopyText(sql);
      });
  } else {
    _fallbackCopyText(sql);
  }
}

/**
 * Fallback clipboard copy using a temporary textarea element.
 * Used when the Clipboard API is not available (non-HTTPS or old browsers).
 * @param {string} text
 */
function _fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand('copy');
    showToast(ok ? `SQL disalin: ${getFilteredEntries().length} baris INSERT` : 'Gagal menyalin ke clipboard', ok ? 'success' : 'error');
  } catch {
    showToast('Gagal menyalin ke clipboard', 'error');
  } finally {
    document.body.removeChild(ta);
  }
}

/* =============================================================
   MODULE: TOAST NOTIFICATIONS
   Non-blocking status messages shown at the bottom-right.
   ============================================================= */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'warning'|'error'|'info'} type
 * @param {number} duration - Auto-dismiss milliseconds
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Icon map
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  const iconEl = document.createElement('span');
  iconEl.innerHTML = icons[type] || icons.info; // Safe: static SVG strings

  const textEl = document.createElement('span');
  textEl.textContent = message; // XSS safe

  toast.appendChild(iconEl);
  toast.appendChild(textEl);
  container.appendChild(toast);

  // Auto-remove
  const removeToast = () => {
    toast.classList.add('removing');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  };

  setTimeout(removeToast, duration);
  toast.addEventListener('click', removeToast);
}

/* =============================================================
   MODULE: EVENT LISTENERS
   Wire up all UI interactions.
   ============================================================= */

/**
 * Initialize all event listeners once the DOM is ready.
 */
function initEventListeners() {

  // --- Input Panel ---

  // Character counter for textarea
  const textarea = document.getElementById('document-input');
  textarea.addEventListener('input', () => {
    const count = textarea.value.length;
    document.getElementById('char-count').textContent =
      `${count.toLocaleString('id-ID')} karakter`;
  });

  // Load sample data
  document.getElementById('btn-load-sample').addEventListener('click', () => {
    const sel = document.getElementById('sample-select');
    const key = sel.value;
    if (!key || !SAMPLE_DATA[key]) {
      showToast('Pilih contoh data terlebih dahulu', 'warning');
      return;
    }
    textarea.value = SAMPLE_DATA[key];
    // Trigger input event to update char count
    textarea.dispatchEvent(new Event('input'));
    // Hide any old feedback
    document.getElementById('extract-feedback').classList.add('hidden');
    showToast(`Contoh data ${sel.options[sel.selectedIndex].text} dimuat`, 'info');
    textarea.focus();
  });

  // Clear input
  document.getElementById('btn-clear-input').addEventListener('click', () => {
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    document.getElementById('extract-feedback').classList.add('hidden');
    document.getElementById('sample-select').value = '';
  });

  // Extract button
  document.getElementById('btn-extract').addEventListener('click', extractDocument);

  // Allow Ctrl+Enter to extract
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      extractDocument();
    }
  });

  // --- Filter & Search ---

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.currentFilter = btn.dataset.filter;
      renderTable();
    });
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    AppState.currentSearch = e.target.value;
    renderTable();
  });

  // --- Table Row Actions (event delegation) ---
  document.getElementById('db-table-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'edit')   openEditModal(id);
    if (action === 'delete') deleteEntry(id);
  });

  // --- Export ---
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-copy-sql').addEventListener('click', copySQLToClipboard);

  // --- Clear All ---
  document.getElementById('btn-clear-db').addEventListener('click', clearAllEntries);

  // --- Edit Modal ---
  document.getElementById('modal-close').addEventListener('click', closeEditModal);
  document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('modal-save').addEventListener('click', saveEditModal);

  // Close modal on backdrop click
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('edit-modal')) closeEditModal();
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeConfirmModal();
    }
  });

  // --- Confirm Modal ---
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
  document.getElementById('confirm-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirm-modal')) closeConfirmModal();
  });
  document.getElementById('confirm-ok').addEventListener('click', () => {
    if (typeof _confirmCallback === 'function') _confirmCallback();
    closeConfirmModal();
  });
}

/* =============================================================
   MODULE: APP INIT
   Bootstrap the application on DOMContentLoaded.
   ============================================================= */

/**
 * Main initialization function.
 * Loads persisted data, renders initial state, wires up events.
 */
function initApp() {
  // Load from localStorage
  loadFromStorage();

  // Initial render
  renderTable();
  renderKPIs();

  // Wire up all event listeners
  initEventListeners();

  // Warm welcome toast if data exists
  if (AppState.entries.length > 0) {
    showToast(`${AppState.entries.length} entri dimuat dari penyimpanan lokal`, 'info', 3000);
  }

  console.info('DocuStruct AI — Initialized successfully.');
}

// Bootstrap on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
