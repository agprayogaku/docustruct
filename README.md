# DocuStruct AI — Intelligent Document-to-Database Extractor

> **IBM AI Builders Challenge — Track IT: Document to Database AI**

DocuStruct AI adalah aplikasi web MVP yang mensimulasikan ekstraksi teks laporan atau dokumen tidak terstruktur menjadi entri database terstruktur yang siap divalidasi dan diekspor — dibangun seluruhnya dengan HTML5 semantik, Tailwind CSS, dan Vanilla JavaScript murni.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| **KPI Dashboard Real-time** | Statistik langsung: Total Diproses, Entri Valid, Perlu Review, dan Tingkat Akurasi Ekstraksi |
| **Parser Cerdas (Regex + Keyword)** | Mengekstrak 5 entitas kunci: Nama/Subjek, Tanggal/Waktu, Kategori, Lokasi/Unit, dan Status |
| **Confidence Score (%)** | Skor kelengkapan per entri (0–100%), dihitung dinamis dari jumlah field yang berhasil diekstrak |
| **Validasi Otomatis** | Entri ditandai ✓ Valid atau ⚠ Perlu Review berdasarkan kelengkapan dan anomali data |
| **Tabel Database Interaktif** | Filter status, pencarian real-time, edit via modal, hapus entri |
| **Persistent Storage** | Semua data tersimpan otomatis ke `localStorage` browser |
| **Ekspor CSV & JSON** | Unduh seluruh data terstruktur langsung di browser |
| **Salin Query SQL INSERT** | Satu klik menyalin perintah `INSERT INTO` siap pakai ke clipboard |
| **3 Contoh Dokumen Bawaan** | Log kunjungan tamu, laporan kegiatan harian, dan berita acara rapat |

---

## 🗂️ Struktur File

```
docustruct/
├── index.html   # Struktur HTML5 semantik — layout, tabel, modal, header
├── style.css    # Custom styles pelengkap Tailwind CDN — animasi, badge, toast
└── script.js    # Semua logika aplikasi — parser, validator, CRUD, ekspor
```

**Tidak ada dependencies eksternal.** Hanya Tailwind CSS dimuat via CDN.

---

## 🚀 Cara Menjalankan

Karena aplikasi ini sepenuhnya berjalan di browser tanpa backend:

1. **Clone** repositori ini:
   ```bash
   git clone https://github.com/agprayogaku/docustruct.git
   cd docustruct
   ```

2. **Buka** `index.html` langsung di browser favorit Anda (Chrome, Firefox, Edge):
   ```bash
   # Atau gunakan ekstensi Live Server di VS Code
   open index.html
   ```

> Tidak diperlukan `npm install`, build step, atau server lokal.

---

## 🧠 Cara Kerja Parser

```
Teks Bebas (Input)
      │
      ▼
splitIntoBlocks()      ← Pisahkan per paragraf / item bernomor
      │
      ▼
parseBlock()           ← Jalankan 5 ekstraktor paralel
  ├─ extractName()     ← Regex: "Nama:", "PIC:", numbered list, dll.
  ├─ extractDate()     ← Regex: DD/MM/YYYY, "15 Januari 2025", ISO, dll.
  ├─ extractTime()     ← Regex: "pukul 09:00", "jam 10:00", HH:MM
  ├─ extractCategory() ← Keyword map: Rapat, Kunjungan, Maintenance, dll.
  ├─ extractLocation() ← Regex: "lokasi:", "Gedung", "Ruang", dll.
  └─ extractStatus()   ← Regex: "status:", keyword: Selesai, Pending, dll.
      │
      ▼
computeConfidence()    ← Skor: (field terisi / 5) × 100%
      │
      ▼
validateEntry()        ← Valid jika ≥ 3 dari 5 field terisi
      │
      ▼
Database Terstruktur (Tabel + localStorage)
```

---

## 📊 Format Ekspor

### CSV
```
Nama / Subjek,Tanggal,Waktu,Kategori,Lokasi / Unit,Status / Keterangan,Status Validasi,Diekstraksi Pada
Budi Santoso,6 Januari 2025,08:45,Kunjungan,Gedung A Lantai 3,Selesai,valid,21 Nov 2026 15:00
```

### JSON
```json
{
  "exportedAt": "21 Nov 2026 15:00",
  "totalEntries": 1,
  "data": [
    {
      "id": "entry_1234567890_abc12",
      "name": "Budi Santoso",
      "date": "6 Januari 2025",
      "time": "08:45",
      "category": "Kunjungan",
      "location": "Gedung A Lantai 3",
      "status": "Selesai",
      "validation": "valid",
      "confidence": 100,
      "extractedAt": "21 Nov 2026 15:00"
    }
  ]
}
```

### SQL INSERT
```sql
-- DocuStruct AI — Generated SQL INSERT Statements
INSERT INTO documents
  (name, date, time, category, location, status, validation, confidence, extracted_at)
VALUES
  ('Budi Santoso', '6 Januari 2025', '08:45', 'Kunjungan', 'Gedung A Lantai 3', 'Selesai', 'valid', 100, '21 Nov 2026 15:00');
```

---

## 🎨 Desain & Teknologi

| Aspek | Detail |
|---|---|
| **Tema Warna** | Indigo `#4F46E5` (utama) · Emerald (valid) · Amber (review) · Slate (background) |
| **CSS Framework** | Tailwind CSS via CDN + custom `style.css` |
| **Font** | System UI stack (`-apple-system`, `Segoe UI`, `sans-serif`) |
| **JavaScript** | Vanilla ES6+, `'use strict'`, tanpa framework/library |
| **Storage** | Browser `localStorage` — data persisten antar sesi |
| **Aksesibilitas** | ARIA labels, `role="dialog"`, `aria-live`, focus rings, contrast-compliant |
| **Keamanan** | Semua user input dirender via `textContent` (XSS-safe) |
| **Responsif** | Mobile-first, kolom tersembunyi otomatis di layar kecil |

---

## 📋 Skenario Contoh Data Bawaan

| # | Nama Contoh | Deskripsi |
|---|---|---|
| 1 | Log Kunjungan Tamu | 5 entri buku tamu kantor dengan format campuran |
| 2 | Laporan Kegiatan Harian | 5 kegiatan IT dengan berbagai tingkat kelengkapan |
| 3 | Berita Acara Rapat | Daftar hadir + agenda rapat koordinasi bulanan |

---

## 🏆 Kompetisi

Proyek ini dibangun untuk **IBM AI Builders Challenge — Track IT: Document to Database AI**.

> Memperlihatkan bagaimana pendekatan AI rule-based (Regex + keyword matching) dapat mengotomatisasi transformasi dokumen tidak terstruktur menjadi data terstruktur yang siap masuk ke database, tanpa ketergantungan pada layanan cloud atau API eksternal.

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi.
