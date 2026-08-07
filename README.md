# Günlük Efor Takibi

Günlük çalışma eforlarını tarih ve proje bazında kaydetmek için hazırlanmış statik web uygulaması.

Kayıtlar tarayıcının `localStorage` alanında tutulur; GitHub deposuna gönderilmez.

## Yerel çalışma

Node.js 20 veya üzeri gereklidir. Yapay zeka asistanı olmadan da uygulama açılır; asistanı kullanmak için `.env.example` dosyasını `.env` adıyla kopyalayıp OpenAI API anahtarınızı yalnızca bu dosyaya yazın:

```powershell
Copy-Item .env.example .env
# .env içindeki OPENAI_API_KEY değerini kendi anahtarınızla değiştirin.
npm.cmd start
```

Ardından `http://localhost:8080` adresini açın.

API anahtarı tarayıcı koduna eklenmez ve `.env` dosyası Git tarafından yok sayılır. AI asistanı uygulamadaki görev, JIRA, efor ve hatırlatma verilerini özetleyebilir; bu sürüm kayıtları değiştirmez.

## FIT Global JIRA Cloud entegrasyonu

JIRA maddelerini doğrudan senkronize etmek ve eforları worklog olarak göndermek için `.env` dosyasına aşağıdaki değerleri ekleyin:

```dotenv
JIRA_BASE_URL=https://fit-global.atlassian.net
JIRA_EMAIL=atlassian-hesabiniz@example.com
JIRA_API_TOKEN=atlassian_api_token_degeriniz
```

API token'ı [Atlassian hesap güvenliği](https://id.atlassian.com/manage-profile/security/api-tokens) sayfasından oluşturun. Token'ı HTML, JavaScript veya GitHub deposuna yazmayın. Sunucuyu yeniden başlattıktan sonra uygulamadaki **JIRA Maddeleri → Bağlantıyı test et** ve **JIRA'dan senkronize et** düğmelerini kullanın.

Varsayılan JQL yalnızca oturum açan kullanıcıya atanmış, çözülmemiş maddeleri getirir. Senkronizasyon aynı JIRA Key'i bulunan yerel kaydı günceller; diğer yerel kayıtları silmez. Worklog seçeneği açıksa yeni efor, revizyon ve silme işlemlerinde JIRA'ya gönderimden önce kullanıcı onayı istenir; onay verilmeden JIRA verisi değiştirilmez.

Tek bir madde eklemek için **JIRA Maddeleri → JIRA maddesi ekle** alanına yalnızca `RD-179` biçimindeki Key'i yazın. Issue Type, Summary, URL, Assignee, Reporter, Priority, Status, Resolution ve tarih alanları JIRA Cloud'dan otomatik alınır. Aynı Key zaten varsa mükerrer kayıt oluşturulmaz; yerel madde JIRA'daki son bilgilerle güncellenir.

Timesheet ekranındaki **JIRA eforlarını getir** düğmesi, seçili tarih aralığında oturum kullanıcısının oluşturduğu worklog kayıtlarını alır. Kayıtlar JIRA worklog kimliğine göre birleştirildiği için tekrar senkronizasyonda mükerrer satır oluşmaz; JIRA'da revize edilen kayıtlar yerelde güncellenir. Gönderimi bekleyen veya başarısız yerel değişikliklerin üzerine otomatik yazılmaz ve bu kayıtlar çakışma olarak raporlanır. Tek istekte en fazla 366 günlük aralık desteklenir.

GitHub Pages yalnızca statik frontend'i barındırır. Pages üzerinden canlı JIRA bağlantısı için `server.js` ayrıca güvenli bir Node.js barındırma ortamına kurulmalı ve ekrandaki **JIRA backend adresi** bu HTTPS servisine yönlendirilmelidir.

## Outlook Takvim entegrasyonu

Ana sayfadaki Outlook Takvim alanı, Microsoft Graph üzerinden oturum açan kullanıcının yaklaşan etkinliklerini salt okunur olarak gösterir. Uygulama yalnızca `Calendars.ReadBasic` iznini ister; istemci sırrı kullanılmaz ve takvim verileri yerel kayıtlara kopyalanmaz.

1. [Microsoft Entra yönetim merkezinde](https://entra.microsoft.com/) **App registrations → New registration** ile bir uygulama oluşturun.
2. **Authentication → Add a platform → Single-page application** bölümünde uygulamadaki Outlook ayarlarında gösterilen yönlendirme adresini aynen ekleyin. Yerel kullanım için bu adres genellikle `http://localhost:8080/`, GitHub Pages için ise tam Pages adresidir.
3. **API permissions → Add a permission → Microsoft Graph → Delegated permissions** bölümünden `Calendars.ReadBasic` iznini ekleyin. Kurum politikanız gerektiriyorsa yönetici onayı alın.
4. **Overview** sayfasındaki **Application (client) ID** ve **Directory (tenant) ID** değerlerini uygulamanın Outlook bağlantı ayarlarına kaydedin.
5. **Outlook'a bağlan** düğmesine basıp Microsoft hesabınızla izin verin.

Yönlendirme adresi, uygulamanın çalıştığı adresle karakter karakter aynı olmalıdır. Hem yerel hem GitHub Pages kullanılıyorsa ikisini de aynı SPA platformuna ayrı yönlendirme adresi olarak ekleyin.

Testler:

```powershell
npm.cmd test
```
