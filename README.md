# TruckerWallet - Apple App Store Webhook Proxy

> Serverless webhook proxy для обработки Apple App Store Server Notifications и интеграции с Appwrite backend.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/igorTimofiejczyk/TruckerWallet_appstore_webhook)

---

## 📋 Описание

Этот проект является промежуточным звеном между Apple App Store и Appwrite Cloud Functions. Он:

- 🔄 Принимает webhook уведомления от Apple о событиях подписок
- ✅ Проксирует запросы в Appwrite Function для обработки
- 📊 Предоставляет health check endpoint для мониторинга
- 🚀 Развернут на Vercel с Edge Runtime для максимальной производительности

---

## 🏗️ Архитектура

```
Apple App Store
    ↓ webhook
Vercel Edge Function (этот проект)
    ↓ proxy
Appwrite Cloud Function
    ↓ process & store
Appwrite Database
    ↓ sync
iOS App (TruckerWallet)
```

---

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- Vercel аккаунт
- Appwrite Cloud проект
- App Store Connect доступ

### Установка

```bash
# Клонируйте репозиторий
git clone https://github.com/igorTimofiejczyk/TruckerWallet_appstore_webhook.git
cd TruckerWallet_appstore_webhook

# Установите зависимости
npm install

# Запустите локально
npm run dev

# Откройте http://localhost:3000/api/apple-webhook
```

---

## 🔧 Конфигурация

### Environment Variables

Создайте `.env.local` файл:

```env
APPWRITE_FUNCTION_URL=https://cloud.appwrite.io/v1/functions/YOUR_FUNCTION_ID/executions
APPWRITE_PROJECT_ID=your_project_id
```

### Vercel Environment Variables

```bash
# Через CLI
vercel env add APPWRITE_FUNCTION_URL
vercel env add APPWRITE_PROJECT_ID

# Или через Dashboard:
# Vercel → Your Project → Settings → Environment Variables
```

---

## 📡 API Endpoints

### Health Check
```http
GET /api/apple-webhook
```

**Response:**
```json
{
  "status": "ok",
  "service": "TruckerWallet Webhook",
  "timestamp": "2024-10-02T22:00:00.000Z"
}
```

### Webhook Handler
```http
POST /api/apple-webhook
```

Принимает webhook от Apple App Store и проксирует в Appwrite.

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "signedPayload": "eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlC..."
}
```

---

## 🔌 Интеграция с App Store Connect

### 1. Настройка Webhook URL

```
App Store Connect → My Apps → TruckerWallet
→ App Information → App Store Server Notifications

Production Server URL:
https://your-project.vercel.app/api/apple-webhook

Sandbox Server URL:
https://your-project.vercel.app/api/apple-webhook
```

### 2. Тестирование

```bash
# В App Store Connect нажмите "Send Test Notification"

# Или через curl
curl -X POST https://your-project.vercel.app/api/apple-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 3. Проверка логов

```
Vercel Dashboard → Your Project → Logs
→ Real-time logs для app/api/apple-webhook/route
```

---

## 📊 Мониторинг

### Vercel Analytics

```
Dashboard → Analytics → Functions
→ Смотрите метрики:
  - Invocations
  - Error rate
  - Execution duration
  - Cold starts
```

### Health Check Monitoring

Настройте UptimeRobot или аналогичный сервис:

```
URL: https://your-project.vercel.app/api/apple-webhook
Method: GET
Interval: 5 minutes
```

---

## 🛠️ Разработка

### Структура проекта

```
TruckerWallet_appstore_webhook/
├── app/
│   ├── api/
│   │   └── apple-webhook/
│   │       └── route.ts          # Webhook handler
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── .env.local                    # Local env vars
├── .gitignore
├── next.config.js                # Next.js config
├── package.json
├── tsconfig.json
└── README.md
```

### Локальная разработка

```bash
# Development server
npm run dev

# Test health check
curl http://localhost:3000/api/apple-webhook

# Test webhook
curl -X POST http://localhost:3000/api/apple-webhook \
  -H "Content-Type: application/json" \
  -d '{"signedPayload": "test"}'
```

### Тестирование с ngrok (для Apple webhooks)

```bash
# Установите ngrok
brew install ngrok  # macOS

# Запустите туннель
ngrok http 3000

# Используйте ngrok URL в App Store Connect (для тестирования)
https://abc123.ngrok.io/api/apple-webhook
```

---

## 🚢 Deployment

### Автоматический deploy

```bash
# Push в main ветку автоматически деплоит на Vercel
git push origin main
```

### Ручной deploy

```bash
# Через Vercel CLI
vercel --prod

# Force redeploy
vercel --prod --force
```

### Preview deployments

```bash
# Создайте ветку
git checkout -b feature/new-feature

# Push создаст preview deployment
git push origin feature/new-feature

# Vercel предоставит уникальный URL для тестирования
```

---

## 🔒 Безопасность

### Best Practices

- ✅ Environment variables хранятся в Vercel (не в коде)
- ✅ HTTPS обязателен (автоматически на Vercel)
- ✅ Edge Runtime изолирует выполнение
- ✅ Appwrite JWT validation на стороне Appwrite Function
- ✅ Rate limiting можно добавить через Vercel Firewall

### Рекомендации

1. **Не коммитьте** `.env.local` в git
2. **Используйте** Vercel Environment Variables для production
3. **Мониторьте** логи на подозрительную активность
4. **Настройте** alerts для высокого error rate

---

## 📈 Производительность

### Метрики

- **Cold start:** ~50-100ms (Edge Runtime)
- **Execution time:** ~200-500ms (зависит от Appwrite latency)
- **Memory:** ~128MB
- **Concurrent requests:** Неограничено (serverless)

### Оптимизация

```typescript
// Edge Runtime для минимального cold start
export const runtime = 'edge';

// Streaming response (если нужно)
export const dynamic = 'force-dynamic';
```

---

## 🐛 Troubleshooting

### 404 Not Found

**Проблема:** Endpoint возвращает 404

**Решение:**
```bash
# Проверьте структуру файлов
ls -la app/api/apple-webhook/

# Должен быть route.ts (не index.ts)
# Redeploy
vercel --prod --force
```

### Environment Variables не работают

**Проблема:** `APPWRITE_FUNCTION_URL` undefined

**Решение:**
```bash
# Проверьте в Vercel Dashboard
vercel env ls

# Добавьте если отсутствуют
vercel env add APPWRITE_FUNCTION_URL production

# Redeploy обязателен после добавления env vars
vercel --prod
```

### Appwrite не получает запросы

**Проблема:** Webhook приходит, но Appwrite не обрабатывает

**Решение:**
1. Проверьте Appwrite Function Execute Access = "Any"
2. Проверьте что APPWRITE_FUNCTION_URL правильный
3. Смотрите логи в Appwrite Console → Functions → Executions

### Vercel build failed

**Проблема:** Deployment fails при билде

**Решение:**
```bash
# Проверьте package.json валидность
cat package.json | jq .

# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install

# Commit и push
git add package-lock.json
git commit -m "Fix dependencies"
git push
```

---

## 📚 Дополнительные ресурсы

### Документация

- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel Edge Runtime](https://vercel.com/docs/functions/edge-functions)
- [Apple Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications)
- [Appwrite Functions](https://appwrite.io/docs/products/functions)

### Связанные проекты

- [TruckerWallet iOS App](https://github.com/igorTimofiejczyk/TruckerWallet) - iOS приложение
- [Appwrite Backend](https://cloud.appwrite.io) - Backend обработка

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

### Development workflow

```bash
# 1. Fork репозиторий
# 2. Создайте feature ветку
git checkout -b feature/amazing-feature

# 3. Commit изменения
git commit -m 'Add amazing feature'

# 4. Push в ветку
git push origin feature/amazing-feature

# 5. Откройте Pull Request
```

---

## 📝 License

MIT License - см. [LICENSE](LICENSE) файл

---

## 👤 Автор

**Igor Tsimafeichyk**

- GitHub: [@igorTimofiejczyk](https://github.com/igorTimofiejczyk)
- Project: [TruckerWallet](https://truckerwallet.app)

---

## ⭐ Support

Если проект помог вам, поставьте звезду! ⭐

---

## 📋 Changelog

### [1.0.0] - 2024-10-02

#### Added
- ✨ Initial release
- 🔄 Apple webhook proxy implementation
- 📡 Health check endpoint
- 🚀 Vercel Edge Runtime deployment
- 📊 Integration with Appwrite Functions

---

## 🔮 Roadmap

- [ ] Rate limiting
- [ ] Request validation
- [ ] Webhook signature verification
- [ ] Detailed logging/analytics
- [ ] Admin dashboard
- [ ] Multi-environment support (staging/production)
- [ ] Webhook retry mechanism
- [ ] Custom domain support guide

---

**Made with ❤️ for TruckerWallet**