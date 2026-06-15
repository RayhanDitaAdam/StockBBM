Markdown

# stockbbm: P2P Crowdsourced Fuel Queue & Availability Monitor

StockBBM adalah sistem pemantauan antrean dan ketersediaan stok BBM di SPBU berbasis *crowdsourcing* yang dirancang *stateless* (tanpa registrasi). Sistem ini memecahkan masalah klasik pada aplikasi informasi publik, yaitu validasi data *real-time* dan celah kecurangan kelompok (*circle fraud*), dengan menerapkan pendekatan ekonomi gotong-royong berupa sistem donasi peer-to-peer (P2P).

---

## 🗺️ Arsitektur Produk & Flow Sistem

Sistem ini membagi pengguna menjadi dua aktor utama tanpa membutuhkan proses *authentication* (No-Auth) untuk memangkas *friction* pengguna saat berada di lapangan.

   [ PENGISI ]                               [ PENCARI ]
        │                                         │
Input Lokasi & Jam                        Scan Radius 50km
        │                                         │

Kondisi Antrean (P/K/H)                    Lihat Indikator Warna
│                                         │
Upload Foto POM                       Konfirmasi: "Apakah Akurat?"
│                                         │
Input Stok Habis                                 ▼
│                           ┌───────────────────────────┐
Attach QRIS Donasi                   │  TRUE: Pop-Up QRIS Aktif  │
│                           └───────────────────────────┘
▼                                         │
┌──────────────────────┐                             ▼
│ TTL Expired (1 Jam)  │                  Pencari Kirim Donasi Sukarela
└──────────────────────┘


### 1. Sisi Pengisi (Data Provider)
* **Input Cepat:** Pengisi melaporkan lokasi, jam, kondisi antrean (Merah = Panjang, Kuning = Lumayan, Hijau = Tidak Antre), foto bukti kondisi fisik POM, dan daftar stok BBM yang habis.
* **Jalur Apresiasi:** Pada akhir form, pengisi dapat melampirkan foto QRIS E-Wallet (Dana/OVO/Gopay/LinkAja) mereka secara opsional sebagai media untuk menerima ucapan terima kasih dari pengguna lain.
* **Data Ephemeral (TTL):** Laporan memiliki masa aktif ketat selama **1 jam**. Setelah 1 jam, data laporan dan gambar QRIS akan otomatis dihapus dari database untuk menjaga akurasi informasi *real-time*.

### 2. Sisi Pencari (Data Consumer)
* **Geo-Filtering:** Pencari dapat memetakan SPBU di sekitarnya dalam radius hingga 50 km. Indikator warna pin maps otomatis berubah sesuai laporan terakhir (atau menjadi abu-abu jika data kosong/off).
* **Social Proof Validation:** Begitu pencari tiba di lokasi dan merasakan manfaat akurasi data tersebut, mereka cukup memberikan konfirmasi satu kali klik: *"Ya, data ini akurat"*.
* **Direct P2P Tipping:** Konfirmasi akurasi tersebut langsung memicu *pop-up* modal yang menampilkan QRIS milik si pengisi asli laporan. Pencari dapat melakukan *scan* donasi secara sukarela sebagai bentuk gotong-royong antar-pengendara.

---

## 🛡️ Solusi Anti-Fraud: Transisi dari Sistem Koin ke P2P Donasi

Pada rancangan awal, sistem direncanakan menggunakan *gamification koin* yang dapat ditukar uang dari penyedia sistem. Namun, sistem tersebut memiliki celah keamanan kritis terhadap **Sybil Attack / Circle Fraud** (misal: rombongan *touring* atau kelompok teman tongkrongan yang sekongkol memvalidasi data palsu demi mencairkan koin gratisan).

### Strategi Mitigasi pada Antigravity:
1. **Zero Financial Incentive for Cheaters:** Dengan mengubah koin menjadi sistem **Donasi Sukarela P2P**, insentif untuk melakukan manipulasi data otomatis hilang 100%. Tidak ada celah mengeksploitasi sistem karena dana keluar dari kantong pencari itu sendiri secara langsung.
2. **Stateless Device Tracking:** Walau tanpa sistem login, backend memanfaatkan tracking ringan berbasis *Device Fingerprint/UUID* atau *IP Subnet Clustering* pada local session untuk membatasi *rate-limiting* pengiriman laporan berulang dari perangkat yang sama.
3. **Automated Cache Cleansing:** Menggunakan mekanisme TTL (Time-to-Live) index pada database untuk memastikan tidak ada penumpukan *stale data* atau sampah QRIS anonim yang membebani infrastruktur *storage cloud*.

---

## 🛠️ Tech Stack (Simulasi Local Demo)

* **Frontend:** Next.js, Tailwind CSS, Shadcn/UI (Dialog & Card components).
* **Backend Options:** Node.js (Express/Socket.io untuk real-time state update) / Golang (Gin Gonic untuk high-traffic handling).
* **Database:** MongoDB (Memanfaatkan Geospasial Queries `$near` dan TTL Index untuk otomatisasi hapus data laporan 1 jam).