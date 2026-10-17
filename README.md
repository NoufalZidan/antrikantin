Nama tim: Ompreng Genk Josjis

Aanggota:
Muhammad Rafly Abimanyu (Ketua) – H1D025010
Idham Khalid Munawar – H1D025018
Radithya Agung Anugrah – H1D025024
Dede Hidayatul ‘Aziz – H1D025036
Noufal Zidan Ivannov – H1D025065

Deskripsi permasalahan:
Di lingkungan kampus, waktu istirahat (ISHOMA) sangat terbatas, sementara kantin dipadati banyak mahasiswa pada saat yang bersamaan. Pemesanan masih dilakukan secara langsung dan manual, sehingga muncul beberapa masalah:
Antrean panjang. Mahasiswa harus mengantre fisik untuk memesan, sehingga sebagian besar waktu istirahat habis hanya untuk menunggu giliran.
Waktu istirahat tidak efektif. Mahasiswa terlambat masuk kelas berikutnya, atau terpaksa melewatkan makan dan ibadah karena waktu habis di antrean.
Beban penjual menumpuk. Pesanan datang serentak dan dicatat secara manual, sehingga rawan salah catat, pesanan tertukar, dan dapur kewalahan pada jam sibuk.
Tidak ada kepastian. Mahasiswa tidak tahu berapa lama pesanannya akan jadi, dan penjual tidak punya gambaran jumlah pesanan yang akan masuk.
Masalah ini dialami hampir setiap hari oleh mahasiswa dan penjual kantin, sehingga termasuk permasalahan sehari-hari yang nyata di lingkungan sekitar kami. 
Akar masalahnya bukan semata kantin yang ramai, melainkan ketidakseimbangan antara lonjakan permintaan dan kapasitas layanan. Seluruh mahasiswa membutuhkan makan siang pada jendela waktu yang sama, sementara kantin hanya dilayani oleh sejumlah kecil karyawan. Akibatnya, waktu istirahat yang seharusnya digunakan untuk makan, beribadah, dan memulihkan fokus justru habis di antrean. Ini bukan sekadar ketidaknyamanan, melainkan kerugian waktu produktif yang berulang setiap hari bagi ratusan mahasiswa. 

Solusi yang dikembangkan:
AntriKantin adalah aplikasi web berbasis browser (responsif untuk ponsel) yang memindahkan proses antre dari kantin ke aplikasi. Alur penggunaannya:
1. Mahasiswa membuka AntriKantin dari ponsel, memilih kantin dan menu, lalu melakukan pembayaran.
2. Pesanan masuk ke dashboard penjual secara real-time, lalu penjual memperbarui statusnya: Diterima, Diproses, Siap Diambil.
3. Mahasiswa menerima notifikasi status di aplikasi. Saat tiba di kantin, mahasiswa cukup menunjukkan kode pesanan dan mengambil makanannya.
Dengan cara ini, mahasiswa memesan dari kelas sebelum istirahat dimulai, sedangkan penjual mendapat gambaran beban kerja yang lebih teratur. Pembayaran pada tahap awal dilakukan di tempat saat pengambilan, dengan simulasi pembayaran QRIS pada prototipe sebagai gambaran 

Teknologi yang digunakan:
Frontend: React / Next.js + Tailwind CSS (responsif)
Backend & DB: Supabase: PostgreSQL, autentikasi, Realtime
Notifikasi: Supabase Realtime
Pembayaran: Simulasi QRIS (mock), tanpa payment gateway
Deployment: Vercel
Kolaborasi: GitHub, AI assistant sebagai alat bantu

Petunjuk installasi (jika ingin menjalankan secara lokal):
git clone https://github.com/your-team/antrikantin.git
cd antrikantin
npm install
npm run dev

Cara penggunaan aplikasi:
Buka laman https://antrikantin.vercel.app/
Login sebagai pembeli/penjual
Jika menjadi pembeli anda dapat langsung memilih kantin
Klik salah satu kantin maka anda akan diarahkan ke dalam menu pada kantin tersebut
Anda dapat langsung menambahkan item yang diinginkan
Klik "Checkout" maka anda akan langsung diarahkan ke halaman pembayaran
Selesaikan pembayaran dan kirim bukti pembayaran
Makanan akan segera diproses oleh penjual, anda dapat cek status pesanan pada halaman Lacak pesanan
Jika login sebagai penjual anda dapat melakukan kustomisasi barang yang dijual
Pada tampilan awal anda dapat melihat pesanan yang baru diterima, sedang diproses, dan siap diambil
Pesanan akan otomatis muncul dan anda dapat secara manual mengupdate status pesanan
