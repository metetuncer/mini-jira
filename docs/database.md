# Veritabanı

PostgreSQL kullanılır; pgAdmin isteğe bağlı yönetim aracıdır. Kurulum SQL'i Identity
tabloları dahil EF modeline karşılık gelen şemayı oluşturur.

## Boş veritabanı

`backend/sql/001_fresh_database.sql` yalnızca boş veritabanı içindir.
README'deki Docker veya yerel PostgreSQL adımlarından birini seç.

## Mevcut veritabanı

Önce API'yi durdur ve yedek al. Docker kurulumu için:

```sh
docker exec minijira-postgres pg_dump -U minijira -d minijira -Fc -f /tmp/minijira-backup.dump
docker cp minijira-postgres:/tmp/minijira-backup.dump ./minijira-backup.dump
```

Eski, sprint özelliği bulunmayan Mini Jira şeması için:

```sh
docker cp backend/sql/002_upgrade_existing.sql minijira-postgres:/tmp/upgrade.sql
docker exec minijira-postgres psql -U minijira -d minijira -v ON_ERROR_STOP=1 -f /tmp/upgrade.sql
```

Yerel PostgreSQL'de aynı SQL dosyasını pgAdmin veya psql ile çalıştırabilirsin.
Script eski görevlerin durumunu, atamasını ve yorumlarını korur; sprinti olmayan
görevler backlog olarak görünür. Kendi şema değişikliklerin varsa önce yedekten
oluşturulmuş bir test veritabanında dene.

Sprint tablosu ve ilgili alanları zaten bulunan geliştirilmiş sürümden bu pakete
geçiş için yeni şema değişikliği yoktur. Arayüzden kaldırılan alanların kolonları
silinmez. Gerçek yedekleri repository'ye ekleme.

## SQL ve migration ayrımı

Bu repository SQL kurulum/yükseltme yöntemini kullanır; eski EF migration geçmişini
içermez. SQL ile oluşturulmuş veritabanına ayrıca InitialCreate uygulama.
Kendi migration geçmişini kullanıyorsan onu koru ve model farkları için migration
üret; aynı değişikliği SQL yükseltmesiyle ikinci kez uygulama.

## Parola değişimi

Compose ilk başlatıldığında boş volume'u `.env` içindeki parola ile oluşturur.
Mevcut volume varken `.env` değerini değiştirmek PostgreSQL kullanıcısının parolasını
değiştirmez. Gerçek veritabanı parolası ve API bağlantı dizesi eşleşmelidir.
Bu nedenle parola değiştirmek için veri volume'unu silme.
