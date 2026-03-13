# Fase 1 — Setup Base do Capacitor: Resultado
Data: 2026-03-13
Agente: @dev (Dex)

## Status: CONCLUÍDA COM DESVIO DOCUMENTADO

---

## O que foi executado

### 1. Branch de trabalho
Reutilizada branch pré-existente `feat/mobile-capacitor` (mesmos commits que master — branch criada pela sessão anterior mas sem código ainda).

### 2. Instalação das dependências Capacitor em `app/`
```
npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor/android
```
Todos instalados com sucesso. 762 pacotes no total.

### 3. Localização do capacitor.config.ts
O arquivo foi criado pela @architect na raiz do projeto (`transfer-online/capacitor.config.ts`), mas o código React e o `package.json` ficam em `transfer-online/app/`. Para o Capacitor CLI funcionar, o config precisa estar no mesmo diretório do `package.json`.

**Ação:** Cópia criada em `app/capacitor.config.ts` com `webDir: 'dist'` (correto, pois o Vite gera `app/dist/`).

### 4. Fix pré-existente: legacySDKImports
O build falhava antes das mudanças do Capacitor por causa dos imports `@/functions/*` (ex: `validateCoupon`, `generateBookingNumber`) em `app/src/components/booking/BookingForm.jsx`. O Base44 vite-plugin precisa de `legacySDKImports: true` para resolver esses imports corretamente.

**Causa raiz:** `vite.config.js` usava `legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true'` mas a variável nunca estava setada — tornando o build impossível fora do ambiente de deploy Base44.

**Fix aplicado:** `legacySDKImports: true` hard-coded no `vite.config.js` com comentário explicativo.

### 5. Build
```
npm run build → EXIT 0
```
Output: `app/dist/` — 5.6MB — index.html + assets/

### 6. Plataforma Android adicionada
```
cap add android → SUCCESS
```
Output confirmado:
- `android/` criado em `app/android/`
- Web assets copiados: `dist/ → android/app/src/main/assets/public/`
- 3 plugins detectados: @capacitor/app, @capacitor/splash-screen, @capacitor/status-bar

### 7. Sync
```
cap sync → SUCCESS
```
Sync completed em 3.5s.

---

## Gate CORS Base44

### Análise da Origin

Com `androidScheme: 'https'` no `capacitor.config.ts`, a WebView Android serve o app como:
```
https://localhost
```
(e não como `capacitor://localhost` que seria o padrão sem essa opção)

### Como o Base44 SDK autentica

Inspecionado `@base44/sdk/dist/utils/axios-client.js`:
- **Auth:** Bearer token no header `Authorization` — sem cookies
- **Sem** `withCredentials: true`
- **Sem** `SameSite` issues
- O SDK envia `X-Origin-URL: window.location.href` por request (informativo, não de auth)

### Veredito CORS

**BAIXO RISCO — provavelmente vai funcionar sem configuração adicional.**

Justificativa:
1. Bearer token via header não dispara preflight complexo de CORS
2. Base44 é um SaaS multi-tenant — improvável que restrinja origins por allowlist
3. `androidScheme: 'https'` escolhido especificamente para reduzir restrições vs `capacitor://`
4. Sem cookies ou credenciais de sessão que precisem de `Access-Control-Allow-Credentials: true`

**Ação para validar definitivamente:** Rodar o app no emulador Android com Android Studio + observer os requests no DevTools do Chrome (`chrome://inspect`). Se CORS falhar, alternativa imediata é checar se o Base44 SDK aceita origem sem restrição (ADR-01 da arquitetura).

---

## Estrutura criada

```
app/
├── capacitor.config.ts     (NOVO — cópia do da raiz, adaptada para app/)
├── android/                (NOVO — plataforma Android gerada pelo cap add android)
│   └── app/src/main/assets/public/   (web assets copiados do dist/)
├── node_modules/@capacitor/ (NOVO — pacotes instalados)
├── dist/                   (NOVO — gerado pelo build)
└── vite.config.js          (MODIFICADO — legacySDKImports: true)
```

---

## Desvios da arquitetura documentados

| Desvio | Justificativa |
|--------|---------------|
| `capacitor.config.ts` duplicado (raiz + app/) | O Capacitor CLI exige o config no mesmo dir do `package.json`. A raiz é o repositório AIOX; `app/` é o projeto React. |
| `legacySDKImports: true` hard-coded | Build era impossível sem isso. Todas as imports `@/functions/*` dependem disso. Variável de ambiente não funciona fora do CI/CD do Base44. |
| `@capacitor/android` instalado separadamente | Não incluído na lista inicial da tarefa — necessário para `cap add android` funcionar. |

---

## Próximas verificações necessárias (Wave 3b)

- [ ] Validar CORS no emulador Android com `chrome://inspect`
- [ ] Checar se o fluxo de login Base44 (redirect via URL) funciona no WebView
