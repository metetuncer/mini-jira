# Testler

## Kapsam

| Kontrol | Kapsam | Gerçek API/veritabanı |
|---|---|---|
| `npm run build` | Angular ve şablon derlemesi | Hayır |
| `dotnet test backend/tests/MiniJira.Tests/MiniJira.Tests.csproj` | Hub üyeliği, bağlantı reddi ve üye çıkarma sonrası bildirim alıcıları | Hayır; EF InMemory ve test doubles |
| `npm run test:e2e` | Ekranlar, filtreler, formlar, sprint akışı, CSV, toplu işlem hataları, mobil genişlik | Hayır; mock yanıtlar |
| `python tests/api_smoke.py` | Kayıt/giriş, görev CRUD, yetki sınırları, atama, sprint kuralları ve sıralama | Evet |
| `node tests/realtime_smoke.cjs` | Hub giriş/üyelik kontrolü, iki kullanıcıya olay iletimi, üye çıkarma | Evet |

E2E testleri, eski tür/puan değerlerinin ilgisiz bir alan düzenlenirken korunmasını
ve puan alanının yeni arayüz/CSV'de bulunmamasını da kontrol eder.
Backend birim testleri SignalR erişim kurallarına odaklanır; auth ve görev CRUD
kapsamı canlı API smoke betiğindedir. EF InMemory testleri PostgreSQL'in SQL,
transaction veya foreign key davranışını doğrulamaz.

## Çalıştırma

README'deki komutları kullan. Canlı testler için üretim veritabanı yerine ayrı,
silinebilir bir veritabanı hazırla. API betikleri benzersiz test hesapları ve projeler
oluşturur. Projeler temizlenir; kullanıcı hesapları kalır.

`.github/workflows/verify.yml` her push/pull request'te PostgreSQL servisi açar,
backend'i derler, şemayı yükler, API/SignalR testlerini ve frontend testlerini çalıştırır.
CI veritabanı parolası yalnızca bu geçici servis içindir; JWT anahtarı her koşuda üretilir.
Workflow başarısı GitHub Actions üzerinden kontrol edilmelidir.

## Manuel kontrol

- İki kullanıcıyla aynı projeyi aç; görev oluşturma ve taşıma olaylarını kontrol et.
- Bir üyeyi çıkar; eski bağlantısından yeni görev verisi gelmediğini kontrol et.
- Dosya yükle/indir/sil; başka proje kimliğiyle erişimin reddedildiğini kontrol et.
- Filtreli panoda hareket, sıfır sonuç, boş proje ve mobil görünümü kontrol et.
- Yeni bilgisayarda README'yi takip ederek temiz kurulum yap.

## Bu paketin doğrulaması

17 Eylül 2026 tarihinde:

- .NET 8 backend ve test projeleri derlendi: 0 hata, 0 uyarı.
- 3 backend erişim testi geçti (EF InMemory, gerçek PostgreSQL değil).
- Angular üretim derlemesi geçti.
- 11 Playwright tarayıcı testi geçti; Kanban sürükle-bırak da doğrulandı.
- API smoke betiğinin Python sözdizimi ve SignalR betiğinin Node sözdizimi kontrol edildi.
- Gerçek PostgreSQL sunucusu bu ortamda kurulamadığı için canlı API/SignalR betikleri
  çalıştırılmadı. Bu kapsam CI'a eklendi; GitHub Actions burada tetiklenmedi.

Ekran görüntüleri bu testlerin kullandığı örnek verilerle yeniden oluşturuldu.
Görsellerdeki canlı bağlantı uyarısı mock testte hub'ın kapalı olmasından kaynaklanır.

## Angular 21 güncellemesi doğrulaması — 18 Eylül 2026

- Ortam: Linux, Node 24.19.0, npm 11.9.0, Chromium 153.
- Güncel package-lock.json ile temiz `npm ci --offline --no-audit --no-fund` geçti;
  paketler bu oturumda npm üzerinden indirilip önbelleğe alınmıştı. Kullanıcı kurulumu `npm ci` kullanır.
- Son `npm run build` geçti.
- Son çevrimiçi `npm audit --json`: 0 düşük, 0 orta, 0 yüksek, 0 kritik bildirim.
- `npm run test:e2e`: 11/11 geçti. Mock API yanıtları kullanıldı; gerçek backend/SignalR doğrulaması değildir.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 2/2 geçti.
- Playwright'ın varsayılan tarayıcı indirmesi erişim hatası verdiği için test ortamında
  alternatif Chromium 153 yürütülebilir dosyası kullanıldı. Projeye bu yerel tarayıcı yolu eklenmedi.
- Backend kaynakları/SQL şeması değişmedi; bu güncelleme sırasında .NET testleri ve
  gerçek PostgreSQL/SignalR testleri yeniden çalıştırılmadı. Önceki test sonuçları yukarıda tarihleriyle korunmuştur.
- Kanban ekranı görsel olarak kontrol edildi; örnek ekran görüntüleri yeni test koşusundan yenilendi.

Bu doğrulama bağımlılık geçişini kapsar. Önceki kod incelemesindeki işlevsel sorunlar
[geçiş notlarında](dependency-update.md) ayrıca belirtilmiştir.
