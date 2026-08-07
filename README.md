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

Testler:

```powershell
npm.cmd test
```
