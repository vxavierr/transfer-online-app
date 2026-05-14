# Handoff — iOS GPS Story 1.2 / Build #27 aguardando teste

**Data:** 2026-05-12 08:30 -03  
**Sessão:** `[transfer]fix/ios-gps-platform-selector`  
**Status:** Build #27 publicado no TestFlight (post-processing failed = falso positivo). Aguardando teste do Fernando.

---

## TL;DR (situação em 30 segundos)

A Story 1.1 (commit `86916e9`) NUNCA executou no iOS porque o seletor `if (!TelemetryForeground)` é falso-truthy — `Capacitor.registerPlugin()` retorna proxy truthy mesmo sem implementação iOS. Por semanas, iOS rodou o branch Android (`watchPosition()` foreground only).

A Story 1.2 (commit `5878b16`, mergeada na main) corrige isso:
1. Seletor: `Capacitor.getPlatform() === 'ios'` em vez de `!TelemetryForeground`
2. Permissão "Always" agora pedida via `backgroundMessage` no `addWatcher`
3. Filtro de acurácia adaptativo: 500m no primeiro fix iOS, 100m depois (Android sempre 100m)

Build #27 do Codemagic completou — IPA de 3.03 MB já está no App Store Connect. O erro "post-processing failed" é falso positivo (só afeta submissão pra grupo externo; interno funciona).

**Próxima ação:** Fernando testar no TestFlight e reportar.

---

## ⚠️ Restrição absoluta para próximas sessões

**Android NÃO PODE SER ALTERADO** em nenhuma story que mexe em iOS.

- `app/android/**` — proibido
- `app/src/native/bridge/TelemetryForegroundBridge.js` — proibido (afeta Android)
- Toda mudança deve ser condicional a `Capacitor.getPlatform() === 'ios'`
- @qa valida via `git diff --stat -- 'transfer-online/app/android/'` (deve ser vazio)

---

## Estado git

- **Branch atual:** `release/1.0.4` (cortada da main, contém Stories 1.1 + 1.2 + Android release prep)
- **Commits relevantes** (top 5):
  | Hash | Mensagem |
  |---|---|
  | `8b5eba3` | chore(android): bump to 1.0.4 (versionCode 5) for production release |
  | `881bd84` | fix(telemetry): guard flushBuffer against RejectedExecutionException |
  | `2f88978` | feat(disclosure): add LocationDisclosureModal for Google Play compliance |
  | `5878b16` | fix(ios): use Capacitor.getPlatform for branch + request Always permission [Story 1.2] |
  | `86916e9` | fix: use background geolocation and fix permission flow on iOS [Story 1.1] (#1) |

- **PRs:** #1 (Story 1.1, merged), #2 (Story 1.2, merged)
- **Modificações locais não-commitadas (pré-existentes, NÃO mexer):**
  - `app/android/.../LocationTelemetryForegroundService.java`
  - Vários arquivos em `../uhuru-os/**` (projeto irmão)

---

## Build #27 no Codemagic — estado final

- **Build ID:** `69fa6225e39b8db419333c3c`
- **Index:** 27
- **Commit:** `5211669` (squash da Story 1.2)
- **Workflow:** iOS → App Store
- **Status:** `finished with post-processing failed` ← FALSO POSITIVO
- **Duração:** 3m 10s
- **Artifacts:** `App.ipa` (3.03 MB) + zip
- **App Store Connect build ID:** `1d880e7b-3ad3-491e-ba75-d730d63e1db8`

**Por que "post-processing failed" é falso positivo:**

Mensagem exata do erro:
```
Failure: Complete test information is required to submit application 
Transfer Online Motorista build for external testing.
App is missing required Beta App Information: Feedback Email.
App is missing required Beta App Review Information: First Name, Last Name, Phone Number, Email.
```

Isso só afeta submissão pro grupo **externo** (que não está configurado). Grupo **interno** já recebeu o build normalmente.

---

## Pendências do Fernando (manual)

1. **Resolver Export Compliance** no App Store Connect:
   - TestFlight → Transfer Online Motorista → build 1.0 (27) com ⚠️ amarelo
   - Clicar "Gerenciar" → "Nenhum dos algoritmos mencionados" → Salvar
2. **Adicionar build #27 ao grupo de teste interno** (aba Compilações → `+`)
3. **No iPhone do Fernando:**
   - Atualizar TestFlight
   - **Desinstalar e reinstalar o app** (importante: reseta estado de permissão iOS — se ele negou "Always" antes, o sistema não pergunta de novo)
   - Iniciar viagem
   - Quando aparecer diálogo de localização: escolher **"Permitir Sempre"**
   - Verificar GPS atualizando no admin (foreground)
   - Minimizar app → verificar que continua atualizando (background)

---

## Plano B (se Story 1.2 não resolver)

Se Fernando reportar que GPS ainda não funciona → criar **Story 1.3**:

- Trocar `@capacitor-community/background-geolocation@1.2.26` por `@capgo/background-geolocation@8.0.32`
- Mesma API (`addWatcher`/`removeWatcher`)
- Diferença: `@capgo` é oficialmente compatível com Capacitor 8 (o atual é Capacitor 7 com patch sed)
- Esforço: 2-4h
- Plano C (último recurso): plugin Swift custom OU `@transistorsoft/capacitor-background-geolocation` ($399 one-time)

Pesquisa completa em:
- `docs/research/ios-gps-research-runtime.md`
- `docs/research/ios-gps-research-architect.md`
- `docs/research/ios-gps-research-analyst.md`

---

## Critical Anti-Patterns descobertos nesta jornada

| Pattern | Como manifestou | Severidade | Mitigação estrutural |
|---|---|---|---|
| **Truthy proxy do registerPlugin** | `!TelemetryForeground` no iOS era `false` — proxy é truthy mesmo sem código nativo | **BLOCKING** | Sempre usar `Capacitor.getPlatform() === 'ios'` para diferenciar plataforma |
| **QA PASS sem teste de runtime** | Story 1.1 teve PASS em todos os AC, mas o código nunca rodou no iOS | **BLOCKING** | QA deve validar comportamento em device real OU explicitar que é review de código apenas |
| **Codemagic auto-build no merge é assumption** | Documentação dizia "qualquer push em main dispara build" — mas o usuário precisa rodar manualmente | advisory | Não assumir CI/CD trigger sem confirmar via UI ou logs |
| **Android intocável esquecido** | Stories iOS poderiam acidentalmente mexer em Android se a condição fosse global | **BLOCKING** | Toda mudança iOS deve ser explicitamente condicional. @qa valida via `git diff` Android |
| **`git add -A` em monorepo** | Há muitos arquivos modificados pré-existentes (uhuru-os, Android FGS) — commit em massa pega tudo | **BLOCKING** | Sempre adicionar arquivos individualmente por path |

---

## Decisões importantes

1. **Não trocar plugin ainda** — fizemos pesquisa multi-agente: 3 vereditos divergiram. Conclusão: o seletor era o bug REAL, não o plugin. Plano B (trocar) só se Story 1.2 não resolver.
2. **Filtro 500m no primeiro fix iOS** — CLLocationManager precisa "warmar" e primeiro fix vem 150-300m. 500m dá margem. Depois aperta pra 100m.
3. **Codemagic build manual** — usuário corrige o entendimento: precisa disparar manualmente, não é automático no merge.
4. **Tab reuse no Codemagic dashboard** — usar `dev-browser --connect` + `browser.getPage(tabId)` na aba já aberta. Não abrir nova aba.

---

## Required Reading (próxima sessão, em ordem)

1. **Este handoff** — contexto da pausa
2. `docs/stories/1.2.story.md` — a story atual mergeada
3. `docs/research/ios-gps-research-runtime.md` — hipótese vencedora explicada
4. `docs/sessions/2026-04/handoff-2026-04-29-ios-testflight.md` — handoff anterior (TestFlight setup)
5. Memória `project_transfer_telemetry_session.md` — arquitetura Android (referência, NÃO modificar)

---

## Como retomar

**Cenário A — Fernando testou e funcionou:**
- Atualizar memória `project_transfer_ios_testflight_ready.md` com status "GPS iOS funcionando — Story 1.2 resolveu"
- Considerar promover release para distribuição mais ampla
- Verificar se precisa atualizar `docs/PARA-FERNANDO.md` com instruções

**Cenário B — Fernando testou e GPS ainda não funciona:**
1. Criar branch `fix/ios-gps-plugin-swap`
2. Escrever Story 1.3:
   - `bun remove @capacitor-community/background-geolocation`
   - `bun add @capgo/background-geolocation@8.0.32`
   - Verificar API compatível (`addWatcher`/`removeWatcher`)
   - Atualizar `Package.swift` (SPM) ou usar CocoaPods se necessário
   - Remover patch sed do `codemagic.yaml`
3. Mesmo workflow: @dev → @qa → @devops → push manual no Codemagic
4. Manter Android intocável

**Cenário C — Fernando ainda não testou:**
- Aguardar feedback
- Não disparar novo build até ter resultado
- Considerar criar checklist visual pro Fernando se ele estiver com dificuldade

---

## Próximo comando

```bash
cd D:/workspace/projects/transfer-online && git status
```

Depois, perguntar ao João: "O Fernando já testou o build #27 no iPhone?"
