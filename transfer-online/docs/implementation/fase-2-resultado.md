# Fase 2 — Roteamento (BrowserRouter → MemoryRouter): Resultado
Data: 2026-03-13
Agente: @dev (Dex)

## Status: CONCLUÍDA

---

## O que foi executado

### 1. Busca por usos de Router no projeto

Grep em `app/src/` por `BrowserRouter|HashRouter|MemoryRouter`:
- **1 resultado**: `app/src/App.jsx` linha 8
- Nenhum outro arquivo usa router diretamente

### 2. Mudança implementada em `app/src/App.jsx`

**Antes:**
```jsx
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
```

**Depois:**
```jsx
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// Use MemoryRouter on native platforms (Capacitor)
const Router = Capacitor.isNativePlatform() ? MemoryRouter : BrowserRouter;
```

O `<Router>` no JSX permanece inalterado — ele usa a constante `Router` que resolve para o tipo correto em runtime.

### 3. Build verificado

```
npm run build → EXIT 0
```

---

## Por que MemoryRouter para native

O `BrowserRouter` usa a History API do browser (`window.history.pushState`). Em WebViews nativas:
- No Capacitor com `androidScheme: 'https'`, a URL é `https://localhost/NovaReserva`
- O Android WebView não tem um servidor HTTP real servindo rotas — apenas `index.html`
- `pushState` funciona para navegação interna, mas ao recarregar ou abrir deep link,
  o WebView não sabe como resolver `/NovaReserva` pois não há servidor tratando isso
- `MemoryRouter` mantém o histórico de navegação **em memória**, sem alterar a URL da barra de endereço,
  evitando o problema completamente

### Impacto na versão web: ZERO

`Capacitor.isNativePlatform()` retorna `false` em browsers — o `BrowserRouter` é usado normalmente.

---

## Impacto em NavigationTracker

O `NavigationTracker` (`src/lib/NavigationTracker.jsx`) usa `useLocation()` do react-router para rastrear mudanças de página. Isso funciona identicamente com `MemoryRouter` — o hook não depende do tipo de router.

---

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `app/src/App.jsx` | Import + branching router nativo/web |

---

## Limitações conhecidas (para Wave 3b)

- **Deep links**: Com `MemoryRouter`, deep links externos (`transferonline://NovaReserva`) não são automaticamente roteados — requer tratamento via `@capacitor/app` plugin (ouvir `appUrlOpen` event e chamar `navigate()`). Isso é Wave 3b.
- **Estado da navegação**: Ao fechar e reabrir o app, o MemoryRouter reinicia na rota inicial. Comportamento esperado para um app nativo.
