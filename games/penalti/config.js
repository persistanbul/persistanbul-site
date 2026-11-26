// =============================================================
//  PENALTI LİGİ — AYARLAR (Pers Learning demo)
//  Sadece bu dosyayı ve questions.js'i düzenlemeniz yeterli.
// =============================================================
window.OYUN_AYAR = {
  // Google Apps Script web uygulaması adresi (…/exec ile biter).
  // Boş bırakılırsa oyun "demo modunda" çalışır (lig sadece bu cihazda tutulur).
  LIG_URL: "",

  // Apps Script'teki TOKEN ile aynı olmalı (basit spam koruması).
  TOKEN: "pers-penalti-demo",

  // Sezon adı. Ligi sıfırlamak için yeni bir sezon adı yazıp paketi yeniden yükleyin.
  SEZON: "Demo",

  // Bir maçta kaç soru (penaltı) olacak. questions.js'te bundan fazla soru varsa rastgele seçilir.
  MAC_SORU_SAYISI: 5,

  // Soru başına süre (saniye)
  SORU_SURESI: 20,

  // Puanlama
  PUAN_DOGRU: 50,        // doğru cevap
  PUAN_HIZ_MAX: 50,      // hız bonusu (süre doldukça azalır)
  PUAN_GOL: 100,         // gol
  KALECI_ZORLUK: 0.55,   // 0 = kaleci hiç doğru tarafa atlamaz, 1 = hep doğru tarafa atlar

  // Geçme notu (SCORM "başarılı" sayılması için gereken puan yüzdesi)
  GECME_YUZDE: 50,

  // Mağaza listesi — oyuncu ilk girişte buradan mağazasını seçer.
  MAGAZALAR: [
    "Merkez Ofis",
    "Kadıköy Mağaza",
    "Nişantaşı Mağaza",
    "Bağdat Caddesi Mağaza",
    "Ankara Mağaza",
    "İzmir Mağaza",
    "Online Ekip"
  ]
};
