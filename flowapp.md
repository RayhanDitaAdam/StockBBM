# StockBBM: P2P Crowdsourced Fuel Queue & Availability Monitor

StockBBM adalah sistem pemantauan antrean dan ketersediaan stok BBM di SPBU berbasis *crowdsourcing* yang dirancang *stateless* (tanpa registrasi). Untuk mengakomodasi mobilitas pengguna di lapangan yang bergerak cepat dan memiliki waktu terbatas di area SPBU, aplikasi ini mengutamakan UX ultra-minimalis dengan memangkas halaman utama menjadi hanya **dua tombol navigasi utama: Pengisi dan Pencari**.

Sistem ini memecahkan masalah validasi data *real-time* dan celah kecurangan kelompok (*circle fraud*) dengan menerapkan pendekatan ekonomi gotong-royong berupa sistem donasi peer-to-peer (P2P).

---

## 🗺️ Arsitektur UX & Flow Sistem Terbaru

Halaman awal (*Home*) dirancang sebersih mungkin demi meminimalkan *cognitive load* pengguna yang sedang berkendara atau berhenti sejenak di jalan.

                     [ HALAMAN UTAMA / HOME ]
                    ┌────────────────────────┐
                    │   [1] TOMBOL PENGISI   │
                    │   [2] TOMBOL PENCARI   │
                    └────────────────────────┘
                                │
     ┌──────────────────────────┴──────────────────────────┐
     ▼                                                     ▼

[ FLOW PENGISI ]                                     [ FLOW PENCARI ]
│                                                     │
Input Lokasi & Jam                                    Scan Radius 50km
│                                                     │
Kondisi Antrean (P/K/H)                                Lihat Indikator Warna
│                                                     │
Upload Foto POM                                   Konfirmasi: "Apakah Akurat?"
│                                                     │
Input Stok Habis                                             ▼
│                                      ┌───────────────────────────┐
Attach QRIS Donasi                              │  TRUE: Pop-Up QRIS Aktif  │
│                                      └───────────────────────────┘
▼                                                     │
┌──────────────────────┐                                       ▼
│ TTL Expired (1 Jam)  │                            Pencari Kirim Donasi Sukarela
└──────────────────────┘


### 1. Alur Pengisi (Data Provider) - Jalur Cepat
* **Aksi Awal:** Pengguna membuka aplikasi, langsung menekan tombol **"Pengisi"**.
* **Input Form Tunggal:** Pengisi melaporkan lokasi, jam, kondisi antrean (Merah = Panjang, Kuning = Lumayan, Hijau = Tidak Antre), foto bukti kondisi fisik POM, dan daftar stok BBM yang habis.
* **Jalur Apresiasi:** Pada akhir form, pengisi melampirkan foto QRIS E-Wallet (Dana/OVO/Gopay) secara opsional sebagai media untuk menerima ucapan terima kasih.
* **Data Ephemeral (TTL):** Laporan memiliki masa aktif ketat selama **1 jam** di database sebelum otomatis terhapus guna memastikan akurasi data *real-time*.

### 2. Alur Pencari (Data Consumer)
* **Aksi Awal:** Pengguna membuka aplikasi, langsung menekan tombol **"Pencari"**.
* **Geo-Filtering:** Aplikasi langsung mengarahkan ke peta interaktif dan memetakan SPBU terdekat dalam radius hingga 50 km beserta indikator warna status antrean ter-update (Merah/Kuning/Hijau).
* **Direct P2P Tipping:** Begitu pencari tiba di lokasi dan merasa terbantu oleh informasi tersebut, mereka cukup klik tombol *"Ya, data ini akurat"*. Sistem akan langsung memicu *pop-up* modal yang menampilkan foto QRIS milik si pengisi asli laporan agar pencari bisa mengirim donasi sukarela.

---

## 🛡️ Solusi Anti-Fraud: Keunggulan Sistem Donasi P2P

Dengan mengubah konsep *gamification reward* konvensional (sistem koin) menjadi sistem **Donasi Sukarela P2P**, Antigravity berhasil mengeliminasi potensi kecurangan tanpa membebani sistem:

1. **Zero Financial Incentive for Cheaters:** Insentif untuk melakukan manipulasi data (*Sybil Attack / Circle Fraud*) otomatis hilang karena dana tidak keluar dari sistem, melainkan dari kantong pencari itu sendiri secara langsung. Rombongan *touring* atau komplotan siber tidak mendapat keuntungan finansial gratisan dari sistem.
2. **Stateless Device Tracking:** Walau tanpa login, backend memanfaatkan tracking ringan berbasis *Device Fingerprint/UUID* pada local session untuk membatasi *rate-limiting* pengiriman laporan berulang dari perangkat yang sama.
3. **Automated Cache Cleansing:** Menggunakan mekanisme TTL (Time-to-Live) index pada database untuk memastikan tidak ada penumpukan *stale data* atau sampah QRIS anonim yang membebani infrastruktur *storage cloud*.

---

## 🛠️ Desain Arsitektur Sistem (Local Development)

* **Frontend:** Next.js (App/Pages Router) + Tailwind CSS + Lucide Icons.
* **Backend:** Node.js (Express) atau Golang (Gin-Gonic) sebagai *Stateless API Gateway*.
* **Database:** MongoDB dengan Geospasial Indexing (`2dsphere`) untuk kalkulasi koordinat radius 50km dan TTL Index (`expires: 3600`) untuk otomatisasi penghapusan data laporan.