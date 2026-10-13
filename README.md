# Platform Undangan Pernikahan

Aplikasi undangan dinamis berbasis Node.js, Express, EJS, dan Multer. Versi ini mempertahankan fitur lama: cover undangan, profil dan foto mempelai, galeri, countdown, latar belakang per bagian, musik MP3, Google Maps, RSVP/ucapan, dan dashboard admin.

## Fitur baru
- Warna tema tombol dan aksen/dekorasi per undangan.
- Warna latar halaman dan warna tulisan yang dapat dipilih lewat color picker.
- Nama ayah dan ibu dari kedua mempelai.
- Jadwal, jam, lokasi, dan tautan Google Maps terpisah untuk pemberkatan dan resepsi.
- Informasi keluarga yang turut mengundang.

Undangan lama tetap dapat dibaca: jika kolom fitur baru belum tersedia pada data lama, template menggunakan warna bawaan dan menyembunyikan informasi yang kosong.

## Menjalankan
1. Ekstrak ZIP.
2. Buka folder `platform-undangan` di terminal.
3. Jalankan `npm install`.
4. Jalankan `npm start`.
5. Buka `http://localhost:3000/admin`.

Persyaratan: Node.js 20+ dan npm.

## Musik
Salin MP3 ke `public/music/`, lalu masukkan nama file di dashboard. Musik mulai setelah tamu menekan tombol Buka Undangan sesuai kebijakan autoplay browser.

## Catatan keamanan dan produksi
- `database.json` adalah penyimpanan lokal sederhana untuk prototipe. Untuk layanan publik, gunakan database sungguhan, autentikasi admin, otorisasi, backup, perlindungan CSRF, pembatasan laju, dan penyimpanan file terkelola.
- Dashboard admin belum memiliki login. Jangan publikasikan ke internet tanpa autentikasi.
- Upload gambar dibatasi 5 MB per file dan tipe MIME JPG, PNG, WEBP, atau GIF. Produksi sebaiknya juga memvalidasi isi file sebenarnya dan melakukan pemindaian malware.
- Google Fonts dan gambar cover default memerlukan koneksi internet. Unggah latar cover sendiri jika ingin menghindari gambar eksternal.


### Pembaruan v6
- Form input nama ayah dan ibu masing-masing mempelai dihapus.
- Lagu MP3 dapat diunggah langsung dari dashboard admin saat membuat undangan (maksimal 20 MB).
- Musik dicoba diputar setelah tamu menekan tombol “Buka Undangan”, karena browser umumnya melarang pemutaran otomatis sebelum interaksi pengguna.


## Pembaruan fitur admin
- Edit undangan tersimpan melalui tombol **Edit undangan** pada dashboard admin.
- Ubah informasi, jadwal, lokasi, warna tema, slug, dan file media tanpa membuat undangan baru.
- Hapus foto yang tersimpan dengan mencentang **Hapus foto**, atau pilih foto baru untuk menggantinya.
- Semua unggahan foto (termasuk latar belakang) dibatasi maksimal 500 KB per file.
- File lagu MP3 tetap dibatasi maksimal 20 MB.
