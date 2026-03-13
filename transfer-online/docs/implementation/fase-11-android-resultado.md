# Fase 11 — Android Platform Setup
Data: 2026-03-13
Agente: @dev (Dex)

---

## Estrutura Android

Estrutura completa e válida gerada pelo Capacitor:

```
app/android/
├── app/
│   ├── build.gradle              ✅ Configurado
│   ├── google-services.json      ❌ NÃO EXISTE (bloqueio externo para Push)
│   └── src/main/
│       ├── AndroidManifest.xml   ✅ Completo (atualizado nesta fase)
│       ├── assets/
│       │   └── public/           ✅ Assets web copiados pelo cap sync
│       ├── java/                 ✅ MainActivity presente
│       └── res/
│           ├── values/strings.xml ✅ app_name correto
│           └── xml/
│               ├── file_paths.xml             ✅ Presente
│               ├── config.xml                 ✅ Presente
│               └── network_security_config.xml ✅ CRIADO nesta fase
├── build.gradle                  ✅ Presente
├── capacitor.settings.gradle     ✅ Presente
├── variables.gradle              ✅ SDKs atualizados
├── gradlew                       ✅ Executável (-rwxr-xr-x)
└── gradlew.bat                   ✅ Presente
```

---

## AndroidManifest.xml — estado final

Arquivo completamente configurado. Permissões adicionadas nesta fase (em relação ao manifest original):

| Permissão | Status | Justificativa |
|-----------|--------|---------------|
| `INTERNET` | Pré-existente | Comunicação com Base44 API |
| `ACCESS_NETWORK_STATE` | **ADICIONADO** | Verificar conectividade antes de requests |
| `CAMERA` | Pré-existente | QR Code Scanner (checkin) |
| `hardware.camera` (feature) | Pré-existente | Câmera opcional |
| `ACCESS_COARSE_LOCATION` | Pré-existente | GPS motorista |
| `ACCESS_FINE_LOCATION` | Pré-existente | GPS motorista (precisão) |
| `FOREGROUND_SERVICE` | Pré-existente | Background GPS |
| `FOREGROUND_SERVICE_LOCATION` | Pré-existente | Background GPS location type |
| `POST_NOTIFICATIONS` | **ADICIONADO** | Push notifications (Android 13+) |
| `VIBRATE` | **ADICIONADO** | Notificações locais |
| `WAKE_LOCK` | **ADICIONADO** | Background GPS tracking (TelemetryTracker) |

Atributos adicionados à tag `<application>`:

```xml
android:usesCleartextTraffic="false"
android:networkSecurityConfig="@xml/network_security_config"
```

---

## network_security_config.xml

**Status: CRIADO** em `app/android/app/src/main/res/xml/network_security_config.xml`

Política aplicada:
- `localhost` e `10.0.2.2` (emulador Android): cleartext permitido para live reload em desenvolvimento
- `base44.com`, `api.base44.com`: HTTPS obrigatório
- `googleapis.com`, `maps.googleapis.com`: HTTPS obrigatório
- `stripe.com`, `js.stripe.com`: HTTPS obrigatório
- Todos os outros domínios (`base-config`): HTTPS obrigatório por padrão

---

## capacitor.config.ts — verificação

| Item | Valor | Status |
|------|-------|--------|
| `appId` | `com.transferonline.app` | ✅ Válido |
| `appName` | `Transfer Online` | ✅ Correto |
| `webDir` | `dist` | ✅ Corresponde ao output do Vite |
| `androidScheme` | `'https'` | ✅ PRESENTE — crítico para CORS com Base44 |
| `android.buildOptions` | Comentado (aguarda keystore) | ✅ Correto para agora |
| `loggingBehavior` | `'debug'` em dev, `'production'` em prod | ✅ Correto |
| `server.url` (dev) | `http://10.0.2.2:5173` | ✅ Somente ativado se `NODE_ENV=development` |

---

## variables.gradle

Versões atuais — Capacitor 8 com SDK mais recente disponível:

| Variável | Valor | Avaliação |
|----------|-------|-----------|
| `compileSdkVersion` | `36` | ✅ Mais recente (Android 16 preview) |
| `targetSdkVersion` | `36` | ✅ Mais recente |
| `minSdkVersion` | `24` | ✅ Android 7.0+ (cobre 99%+ dos devices ativos) |
| `androidxActivityVersion` | `1.11.0` | ✅ Atualizado |
| `androidxAppCompatVersion` | `1.7.1` | ✅ Atualizado |
| `androidxCoreVersion` | `1.17.0` | ✅ Atualizado |
| `androidxWebkitVersion` | `1.14.0` | ✅ Atualizado |
| `coreSplashScreenVersion` | `1.2.0` | ✅ Atualizado |
| `cordovaAndroidVersion` | `14.0.1` | ✅ Atualizado |

---

## build.gradle da app

| Item | Valor | Status |
|------|-------|--------|
| `namespace` | `com.transferonline.app` | ✅ Corresponde ao appId |
| `applicationId` | `com.transferonline.app` | ✅ Corresponde ao capacitor.config.ts |
| `compileSdk` | Referência a `variables.gradle` | ✅ Correto |
| `minSdkVersion` | Referência a `variables.gradle` | ✅ Correto |
| `targetSdkVersion` | Referência a `variables.gradle` | ✅ Correto |
| `versionCode` | `1` | ✅ Inicial (incrementar a cada release) |
| `versionName` | `1.0` | ✅ Inicial |
| Dependências Capacitor | `capacitor-android`, `capacitor-cordova-android-plugins` | ✅ Presentes |
| google-services.json check | `try/catch` com log informativo | ✅ Graceful degradation |

---

## Assets web no Android

O `cap sync android` copiou o build web com sucesso:

```
app/android/app/src/main/assets/public/
├── index.html          ✅
├── cordova.js          ✅
├── cordova_plugins.js  ✅
└── assets/             ✅ (chunks JS/CSS do Vite)
```

Saída do cap sync:
```
✔ Copying web assets from dist to android\app\src\main\assets\public in 58.41ms
✔ Creating capacitor.config.json in android\app\src\main\assets in 1.07ms
✔ copy android in 160.82ms
✔ Updating Android plugins in 30.51ms
✔ update android in 241.11ms
[info] Sync finished in 0.544s
```

Plugins Capacitor detectados pelo sync (9 total):
- `@capacitor-community/background-geolocation@1.2.26`
- `@capacitor/app@8.0.1`
- `@capacitor/browser@8.0.2`
- `@capacitor/camera@8.0.2`
- `@capacitor/geolocation@8.1.0`
- `@capacitor/network@8.0.1`
- `@capacitor/preferences@8.0.1`
- `@capacitor/splash-screen@8.0.1`
- `@capacitor/status-bar@8.0.1`

---

## google-services.json

**Status: NÃO EXISTE**

O arquivo `app/android/app/google-services.json` não foi encontrado.

**Impacto:**
- Push Notifications (Firebase Cloud Messaging / FCM) não funcionarão
- Google Analytics nativo (Firebase Analytics) não funcionará
- O `build.gradle` já lida com isso gracefully via `try/catch` — o build **não falhará** por ausência deste arquivo

**Bloqueio registrado:**
- **Fase 5 (Push Notifications)** — BLOQUEADA até obter `google-services.json` do Firebase Console
- **Fase 10 (Analytics)** — BLOQUEADA até obter `google-services.json`

**Como desbloquear:**
1. Acessar [Firebase Console](https://console.firebase.google.com)
2. Criar projeto (ou usar existente)
3. Adicionar app Android com package name `com.transferonline.app`
4. Baixar `google-services.json`
5. Colocar em `app/android/app/google-services.json`
6. Rodar `npx cap sync android` novamente

---

## Estado para build

O projeto está **pronto para ser aberto no Android Studio** e gerar um APK de debug:

| Item | Status |
|------|--------|
| AndroidManifest.xml | ✅ Completo com todas as permissões |
| network_security_config.xml | ✅ Configurado |
| capacitor.config.ts | ✅ androidScheme: 'https' presente |
| variables.gradle | ✅ SDK 36 / minSdk 24 |
| Web assets copiados | ✅ via cap sync |
| gradlew executável | ✅ `-rwxr-xr-x` |
| google-services.json | ❌ Ausente (não bloqueia debug APK) |

---

## Bloqueios externos para completar

| Bloqueio | Impacto | Fase |
|----------|---------|------|
| `google-services.json` ausente | Push Notifications e Firebase Analytics não funcionam | Fase 5, Fase 10 |
| Keystore de release | Necessário para publicar na Play Store | Play Store |
| Android SDK instalado localmente | Necessário para build via linha de comando (`./gradlew`) | Build |
| Conta Google Play Developer | Necessário para publicação | Distribuição |
| Assinatura APNs (Apple) | iOS apenas — não bloqueia Android | iOS Fase 9 |

---

## Próximos passos para o desenvolvedor

### Abrir no Android Studio (recomendado)
```bash
# A partir do diretório app/
npx cap open android
```

### Build de debug via Android Studio
1. File → Open → selecionar `app/android/`
2. Aguardar Gradle sync
3. Run → Run 'app' (Shift+F10)
4. Selecionar emulador ou dispositivo físico

### Build via linha de comando (requer Android SDK)
```bash
# Debug APK
cd app/android
./gradlew assembleDebug

# O APK gerado fica em:
# app/android/app/build/outputs/apk/debug/app-debug.apk
```

### Build de release (requer keystore)
```bash
# Primeiro configurar keystore no capacitor.config.ts, depois:
./gradlew assembleRelease
```

### Live reload com emulador (desenvolvimento)
```bash
# Terminal 1: servidor Vite
cd app && npm run dev

# Terminal 2: sync e run no emulador
NODE_ENV=development npx cap run android
```

### Validação no emulador após build
1. App abre sem tela branca
2. Login via Base44 redireciona corretamente
3. Tela principal (NovaReserva) carrega
4. GPS funciona (testar em DashboardMotoristaV2)
5. Câmera QR funciona em /checkin
6. Links externos (WhatsApp, Maps) abrem via Browser plugin

---

## Arquivos modificados/criados nesta fase

| Arquivo | Ação |
|---------|------|
| `app/android/app/src/main/AndroidManifest.xml` | MODIFICADO — permissões adicionadas, networkSecurityConfig configurado |
| `app/android/app/src/main/res/xml/network_security_config.xml` | CRIADO |
