# HCA Oil Boom Management Tools

Aplikasi web untuk mengelola inventaris **oil boom** (perangkat penahan tumpahan minyak) di HCA Site (Delta Mahakam), terintegrasi dengan peta interaktif. Dibuat untuk menggantikan pencatatan manual di Excel dengan sistem yang menampilkan lokasi pos penyimpanan, lokasi kerja (sumur/platform/cluster), dan status peminjaman secara visual di peta.

## Fitur

- **Dashboard** — ringkasan total stok, stok tersedia, jumlah unit sedang dipinjam, dan yang terlambat kembali. Daftar prioritas pengembalian diurutkan dari yang paling mendesak.
- **Peta Lokasi** — peta interaktif (Leaflet + OpenStreetMap/citra satelit) menampilkan titik pos penyimpanan (hijau) dan lokasi kerja/sumur-platform-cluster (biru = sedang dipakai, kuning = menunggu approval, merah = terlambat kembali, abu = tidak ada peminjaman). Klik marker untuk melihat detail stok atau detail peminjam (nama, entity, ext, fungsi, periode, sisa waktu).
- **Peminjaman** — kelola permintaan peminjaman boom: buat permintaan baru dengan **pencarian pos terdekat otomatis** (berdasarkan jarak dari lokasi kerja dan ketersediaan stok), ubah status (Pending → Disetujui → Aktif → Selesai), lihat/urutkan berdasarkan tanggal request, tanggal mulai, atau rencana tanggal selesai untuk menentukan prioritas.
- **Master Data** — kelola data pos penyimpanan, lokasi kerja (sumur/platform/cluster), batch stok boom (jumlah, panjang per unit, kondisi: Baik/Rusak Ringan/Rusak Berat), dan pengaturan umum.
- **Import / Export** — backup & restore seluruh database dalam format **JSON** (lengkap, untuk pindah perangkat) maupun **Excel (.xlsx)** (untuk update data manual/massal oleh tim, termasuk template kosong yang bisa diunduh).

Data disimpan secara lokal di browser (`localStorage`). Data contoh (dummy) sudah disediakan di sekitar koordinat referensi HCA Site (`-0.8414299596012856, 117.27831949619498`, Delta Mahakam) — silakan ubah melalui menu Master Data atau Import/Export sesuai kondisi aktual.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

Build produksi:

```bash
npm run build
npm run preview
```

## Struktur data

- **Lokasi** (`MapLocation`): pos penyimpanan (`type: pos`) atau lokasi kerja (`sumur` / `platform` / `cluster` / `lainnya`), masing-masing punya koordinat (latitude/longitude, WGS84).
- **Stok Boom** (`StockBatch`): batch stok per pos — jumlah unit, panjang per unit (meter), kondisi.
- **Peminjaman** (`LoanRequest`): permintaan peminjaman — peminta, entity/perusahaan, ext, fungsi pekerjaan, lokasi kerja, pos asal, jumlah, periode (tanggal request/mulai/selesai rencana/kembali aktual), status, prioritas.

## Rencana lanjutan

- Import titik lokasi dari file SHP / daftar koordinat sumur, platform, cluster, dan pos secara massal (untuk saat ini gunakan kolom Latitude/Longitude pada sheet **Lokasi** di Excel, atau input manual di Master Data).
- Data aktual (jumlah stok riil, lokasi pos, peminjaman berjalan) dapat diperbarui langsung melalui UI atau lewat import Excel/JSON begitu tersedia.

## Tech stack

React + TypeScript + Vite, Tailwind CSS v4, React-Leaflet (peta), Zustand (state + persist ke localStorage), ExcelJS (import/export .xlsx), Lucide Icons.
