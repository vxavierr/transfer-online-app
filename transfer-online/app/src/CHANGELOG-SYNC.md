# Changelog de Sincronização — Transfer Online

Registro de alterações que impactam a sincronização Base44 → Capacitor.
O agente AI atualiza após cada mudança relevante.
O João consulta antes de cada exportação.

## Formato

### [DATA] — Descrição curta

**Arquivos alterados:**
- caminho/do/arquivo.jsx (criado | modificado | removido)

**Impacto na sincronização:**
- [ ] Novo window.open que precisa migração
- [ ] Novo localStorage que precisa migração
- [ ] Nova página adicionada
- [ ] Mudança em App.jsx / Layout.jsx / app-params.js
- [ ] Nova dependência em package.json
- [ ] Nenhum impacto

---

## Registro

### [2026-03-19] — Migração completa para AccessPortal (login interno)

**Arquivos alterados:**
- lib/AuthContext.jsx (modificado — navigateToLogin agora navega para /AccessPortal com returnUrl)
- pages/AccessPortal.jsx (modificado — suporte a returnUrl via query param, removido login Google)
- App.jsx (modificado — NativeAuthNavigator passa returnUrl, AdminOnlyRoute usa AccessPortal)
- Layout.jsx (modificado — 5 chamadas substituídas: login buttons, logout, proteção de páginas, handler 401)
- pages/NovaReserva.jsx (modificado — 5 chamadas substituídas: login, logout, quote redirect, vehicle select)
- 37 páginas protegidas (modificado — base44.auth.redirectToLogin → AccessPortal redirect)

**Impacto na sincronização:**
- [x] Mudança em App.jsx, Layout.jsx, AuthContext.jsx
- [x] Login Google removido do AccessPortal
- [x] Logout agora redireciona para /AccessPortal
- [x] Nenhuma nova dependência
- [x] Nenhum novo window.open

---

### [2026-03-18] — Página AccessPortal (autenticação nativa)

**Arquivos alterados:**
- pages/AccessPortal.jsx (criado)
- native/index.js (criado)
- App.jsx (modificado — import AccessPortal, NativeAuthNavigator, rota /AccessPortal)
- lib/AuthContext.jsx (modificado — navigateToLogin usa navegação nativa quando disponível)

**Impacto na sincronização:**
- [x] Nova página adicionada (/AccessPortal — standalone, sem Layout)
- [x] Mudança em App.jsx (nova rota + NativeAuthNavigator)
- [x] Mudança em lib/AuthContext.jsx (navigateToLogin com suporte nativo)
- [x] Criado native/index.js (camada de abstração — João deve integrar com Capacitor real)

---

### [2026-03-17] — Setup inicial

**Arquivos alterados:**
- NATIVE-COMPAT.md (criado)
- CHANGELOG-SYNC.md (criado)
- ARCHITECTURE.md (criado)

**Impacto na sincronização:**
- [x] Nenhum impacto