# Soalin (Android)

Project Android Studio: WebView yang memuat web app Soalin dari app/src/main/assets/www.

## Cara build
1. Buka Android Studio → Open → pilih folder ini.
2. Tunggu Gradle sync. Kalau diminta membuat Gradle wrapper, terima.
3. Run ▶ ke emulator/HP, atau Build → Generate App Bundles or APKs untuk rilis.

## Catatan
- Package: com.dotleav.soalin.regular. Ganti di app/build.gradle.kts (applicationId dan namespace) dan di MainActivity.kt jika perlu.
- Konten soal diambil dari bank online (repo soalin-bank), jadi app butuh internet untuk memuat paket baru.
- Ikon: titik hijau di ikon sudah diganti huruf R.
- Web assets di app/src/main/assets/www sudah dibersihkan dari data soal tertanam (data/packages, images/packages).
- Sudah diuji: belum dibuild di sini. Lakukan build di Android Studio dan tes upload .docx, pilihan paket, dan audio.
