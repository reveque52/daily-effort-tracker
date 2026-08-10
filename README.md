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

## Kişi tanımları ve görev atama

**Ekip → Kişiler** ekranında ad-soyad, e-posta, ünvan, organizasyon rolü ve bağlı yönetici bilgileriyle görev atanabilir kişiler oluşturulabilir, düzenlenebilir ve silinebilir. Görev formundaki **Atanan kişi / kimde bekliyor** alanı bu tanımları kullanır. Kişi adı değiştirildiğinde bağlı görevlerin görünen atama bilgisi güncellenir; açık bir görevde kullanılan veya kendisine bağlı ekip üyesi bulunan kişi silinemez. **Ekip → Organizasyon** ekranında seçilen liderin kendisine ve tüm alt ekibine atanmış görevler tek görünümde izlenebilir. Kişi tanımları uygulama yedeğine dahil edilir.

## Yerel kayıt ve bulut senkronizasyonu

Uygulamadaki efor, görev, kişi, hatırlatma ve JIRA bakım alanları her zaman kullanılabilir. Değişiklikler önce yerel tarayıcı verisine kaydedilir. Supabase hesabı menüsündeki **Değişiklikleri gönder** düğmesi güncel veriyi kullanıcının çalışma alanına aktarır. Google Drive menüsü isteğe bağlı, elle alınan ikinci bir yedek olarak korunur. Supabase’e gönderilmemiş yerel değişiklik bilgisi tarayıcı kapatılsa da korunur.

## Görev dokümanları ve Google Drive

**Görevler → Görev Ekle → Dokümanlar** alanından aynı göreve birden fazla dosya bağlanabilir. Yeni dosyalar görev kaydedilirken Google Drive’daki görünür **Günlük Efor Takibi Dokümanları** klasörüne, görev bazında ayrı bir alt klasör oluşturularak yüklenir. Uygulama verisinde dosyanın kendisi değil; Drive dosya kimliği, adı, türü, boyutu ve bağlantısı tutulur. Dokümanlar görev detay sayfasından açılabilir.

İlk doküman yüklemesinde Google yeniden izin ister. Google Cloud Console’daki OAuth izin ekranında hem `drive.appdata` hem de `drive.file` kapsamları tanımlı olmalıdır. `drive.file`, uygulamanın oluşturduğu/seçilen dosyalarla sınırlı dar kapsamdır; tüm Drive içeriğine erişim istemez. Tek seferde en fazla 10 dosya ve dosya başına 100 MB desteklenir. Bir görevi silmek Drive’daki dokümanları otomatik silmez; dosyalar Drive’dan ayrıca yönetilebilir.

## Supabase hesap, veri ve e-posta kurulumu

Ana menüdeki **Supabase** alanından e-posta ve en az sekiz karakterli şifreyle hesap oluşturulur. E-posta doğrulandıktan sonra her kullanıcı için kişisel bir çalışma alanı otomatik hazırlanır. Efor, görev, kişi, JIRA maddesi ve hatırlatma kayıtları bu çalışma alanında tutulur; tarayıcıda yalnızca publishable key bulunur. Secret/service-role anahtarı veya SMTP parolası frontend koduna ve GitHub deposuna yazılmaz.

İlk kullanımda:

1. **Hesap oluştur** ile kayıt olun ve gelen doğrulama bağlantısını açın.
2. Uygulamaya dönüp giriş yapın. Supabase boşsa mevcut yerel kayıt sayısı menüde gösterilir.
3. **Yerel verileri gönder** ile bu tarayıcıdaki verileri ilk kez aktarın. Supabase’de daha önce veri varsa işlemden önce onay sorulur.
4. Başka bir cihazda **Supabase’den yükle** ile bulut sürümünü yerel tarayıcıya alın.

### Doğrulama ve şifre e-postaları

Kayıt doğrulama ve **Şifremi unuttum** akışları uygulamada aktiftir. Supabase'in varsayılan e-posta hizmeti yalnızca proje ekip üyelerine test gönderimi ve düşük hız limiti için uygundur. Gerçek kullanıcılara gönderim için Supabase Dashboard'da **Authentication → Emails → SMTP Settings** bölümünden özel SMTP açılmalıdır. Sağlayıcınızdan alınan şu değerleri girin:

- Host ve port
- SMTP kullanıcı adı ve parola
- Gönderen e-posta adresi ve görünen ad

**Authentication → URL Configuration** bölümünde Site URL ile Redirect URLs listesine hem `http://localhost:8080/` hem de kullanılan tam GitHub Pages adresini ekleyin. SMTP parolasını `.env`, HTML veya JavaScript dosyasına koymayın; yalnızca Supabase Dashboard'daki şifreli SMTP alanına girin.

## FIT Global JIRA Cloud entegrasyonu

### Kullanıcı bazlı “JIRA ile giriş yap” (önerilen)

Her kullanıcının kendi Atlassian hesabıyla çalışması için [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) üzerinden bir **OAuth 2.0 (3LO) integration** oluşturun. Uygulamanın **Permissions** bölümüne `read:jira-work`, `read:jira-user` ve `write:jira-work` klasik kapsamlarını ekleyin. **Authorization** callback adresi `.env` dosyasındaki adresle birebir aynı olmalıdır.

```dotenv
JIRA_BASE_URL=https://fit-global.atlassian.net
JIRA_OAUTH_CLIENT_ID=atlassian_oauth_client_id
JIRA_OAUTH_CLIENT_SECRET=atlassian_oauth_client_secret
JIRA_OAUTH_REDIRECT_URI=http://localhost:8080/api/jira/oauth/callback
JIRA_OAUTH_SCOPES=read:jira-work read:jira-user write:jira-work offline_access
```

GitHub Pages ile ayrı bir HTTPS backend kullanılıyorsa callback adresi backend alan adında olmalıdır; örneğin `https://backend.example.com/api/jira/oauth/callback`. Pages adresini de `ALLOWED_ORIGINS` listesine ekleyin. Kullanıcı **JIRA Maddeleri → JIRA ile giriş yap** düğmesine bastığında Atlassian onayından sonra kendi hesabıyla uygulamaya döner. Access ve dönen rotating refresh tokenlar tarayıcıya veya Drive yedeğine yazılmaz; yalnızca backend belleğindeki HttpOnly oturumla ilişkilendirilir. Sunucu yeniden başlatılırsa kullanıcı yeniden giriş yapar. Üretimde frontend ve backend’in aynı HTTPS origin altında yayınlanması, tarayıcıların üçüncü taraf çerez kısıtlamalarından kaçınmak için önerilir.

### Tek hesaplı API token yöntemi (geriye dönük)

OAuth ayarları tanımlı değilse JIRA maddelerini senkronize etmek ve eforları worklog olarak göndermek için `.env` dosyasındaki aşağıdaki değerler kullanılabilir:

```dotenv
JIRA_BASE_URL=https://fit-global.atlassian.net
JIRA_EMAIL=atlassian-hesabiniz@example.com
JIRA_API_TOKEN=atlassian_api_token_degeriniz
```

API token'ı [Atlassian hesap güvenliği](https://id.atlassian.com/manage-profile/security/api-tokens) sayfasından oluşturun. Token'ı HTML, JavaScript veya GitHub deposuna yazmayın. Sunucuyu yeniden başlattıktan sonra uygulamadaki **JIRA Maddeleri → Bağlantıyı test et** ve **JIRA'dan senkronize et** düğmelerini kullanın.

**Ekip → Kişiler → JIRA’dan aktif kullanıcıları getir** işlemi, en fazla 1000 aktif Atlassian hesabını güvenli backend proxy üzerinden alır. Kişiler öncelikle JIRA `accountId`, ardından e-posta adresiyle eşleştirilir; aynı kullanıcı yeniden eklenmez ve mevcut ünvan, organizasyon rolü ile yönetici bağlantısı korunur. JIRA gizlilik ayarı nedeniyle e-posta gelmezse kullanıcı yine eklenir ve kartında e-postanın gizli olduğu gösterilir. Bu işlem yalnızca yerel değişiklik oluşturur; Google Drive yedeği kullanıcı **Kaydet ve Drive’a gönder** dediğinde alınır. JIRA hesabında kullanıcı listesini okuyabilmek için gerekli global yetkinin bulunması gerekir.

Varsayılan JQL yalnızca oturum açan kullanıcıya atanmış, çözülmemiş maddeleri getirir. Senkronizasyon aynı JIRA Key'i bulunan yerel kaydı günceller; diğer yerel kayıtları silmez. Worklog seçeneği açıksa yeni efor, revizyon ve silme işlemlerinde JIRA'ya gönderimden önce kullanıcı onayı istenir; onay verilmeden JIRA verisi değiştirilmez.

### GitHub Pages üzerinde kişisel JIRA bağlantısı

GitHub Pages statik olduğu için yerel `/api/jira` Node servisini çalıştıramaz. Yayındaki uygulama bu nedenle varsayılan olarak `supabase:jira-proxy` yöntemini kullanır. Kullanıcı önce Supabase hesabına giriş yapar, ardından ana menüdeki **JIRA → Kişisel JIRA bağlantısı** alanına Atlassian e-posta adresini ve kendi API tokenını girer.

Token tarayıcı koduna veya herkese açık bir Supabase tablosuna yazılmaz. Supabase Auth JWT'siyle korunan `jira-proxy` Edge Function bağlantıyı JIRA üzerinde doğrular; tokenı Supabase Vault'ta şifreli saklar ve `private.jira_credentials` tablosunda yalnızca Vault secret kimliğiyle kullanıcı eşlemesini tutar. Vault'taki çözülmüş tokenı sadece `service_role` yetkili RPC okuyabilir; `anon` ve `authenticated` rollerinin doğrudan erişimi yoktur. Her kullanıcı yalnızca kendi Supabase kullanıcı kimliğine bağlı JIRA hesabıyla işlem yapar, böylece workloglar doğru Atlassian kullanıcısı adına oluşur.

Yerel geliştirmede `/api/jira`, GitHub Pages üzerinde ise `supabase:jira-proxy` otomatik seçilir; kullanıcıdan servis adresi girmesi istenmez. Senkronizasyon JQL’i ve worklog onay tercihi ana menüdeki **JIRA** düğmesinden yönetilir.

Tek bir madde eklemek için **JIRA Maddeleri → JIRA maddesi ekle** alanına yalnızca `RD-179` biçimindeki Key'i yazın. Issue Type, Summary, URL, Assignee, Reporter, Priority, Status, Resolution ve tarih alanları JIRA Cloud'dan otomatik alınır. Aynı Key zaten varsa mükerrer kayıt oluşturulmaz; yerel madde JIRA'daki son bilgilerle güncellenir.

JIRA ekranındaki **Talepler** alt sekmesi senkronize edilen maddeleri statü bazlı Kanban sütunlarında gösterir. Üstteki çoklu seçim alanından gösterilecek statüler açılıp kapatılabilir. Key, Summary, atanan kişi, öncelik ve son güncelleme bilgileri ilgili statü sütununda yer alır; sütunlar yatay kaydırılabilir ve tüm taleplerde anlık arama yapılabilir. Bir talep kartı başka bir statü sütununa bırakıldığında JIRA'ya gönderimden önce kullanıcı onayı istenir. Onay verilirse backend uygun transition'ı çalıştırır; işlem reddedilir veya başarısız olursa kart önceki statüsünde kalır.

Timesheet ekranındaki **JIRA eforlarını getir** düğmesi, seçili tarih aralığında oturum kullanıcısının oluşturduğu worklog kayıtlarını alır. Kayıtlar JIRA worklog kimliğine göre birleştirildiği için tekrar senkronizasyonda mükerrer satır oluşmaz; JIRA'da revize edilen kayıtlar yerelde güncellenir. Gönderimi bekleyen veya başarısız yerel değişikliklerin üzerine otomatik yazılmaz ve bu kayıtlar çakışma olarak raporlanır. Tek istekte en fazla 366 günlük aralık desteklenir.

GitHub Pages yalnızca statik frontend'i barındırır. Yayındaki canlı JIRA bağlantısı kullanıcı bazlı Supabase Auth oturumu ve `jira-proxy` Edge Function üzerinden otomatik çalışır; servis adresi arayüzde ayrıca ayarlanmaz.

## Google ve Outlook Takvim entegrasyonu

Ana sayfadaki Takvim alanında **Google Takvim** veya **Outlook** seçilebilir. Etkinlikler yalnızca görüntülenir; yerel kayıtlara ya da Drive yedeğine kopyalanmaz. Google için `calendar.events.readonly`, Outlook için `Calendars.ReadBasic` izni kullanılır ve tarayıcı kodunda client secret tutulmaz.

### Google Takvim

1. [Google Cloud Console](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) üzerinden kullandığınız projede **Google Calendar API** hizmetini etkinleştirin.
2. Mevcut **Web application** OAuth Client ID’nizin **Authorized JavaScript origins** listesine yerel adresi (`http://localhost:8080`) ve GitHub Pages adresinizi ekleyin.
3. OAuth izin ekranı test modundaysa Google hesabınızı test kullanıcısı olarak ekleyin.
4. OAuth Client ID’yi uygulamadaki **Google Drive → Ayarlar** alanına kaydedin. Takvim aynı Client ID’yi kullanır ancak ayrıca yalnızca takvim etkinliklerini okuma izni ister.
5. Ana sayfada **Google Takvim** seçiliyken **Google’a bağlan** düğmesine basın ve izni onaylayın.

Google erişim belirteci yalnızca açık sayfada bellekte tutulur. Sayfa yenilendiğinde güvenlik gereği Google Takvim’e yeniden bağlanmanız istenebilir; Drive bağlantısının izni iptal edilmez.

### Outlook

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
