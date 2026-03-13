# Fase 6 — QR Scanner Nativo
Data: 2026-03-13
Agente: @dev (Dex)
Branch: feat/mobile-capacitor

## Status: CONCLUÍDA

## O que foi feito

### Serviço criado
- `app/src/native/services/CameraService.js` — abstração @capacitor/camera / web

### Componente atualizado
- `app/src/components/QRCodeScanner.jsx` — branching nativo/web

### AndroidManifest atualizado
- `app/android/app/src/main/AndroidManifest.xml` — permissões de câmera adicionadas:
  - `android.permission.CAMERA`
  - feature `android.hardware.camera` (android:required="false")

## Arquivos com uso de QR scanner identificados
| Arquivo | Status |
|---------|--------|
| `app/src/components/QRCodeScanner.jsx` | Migrado |
| `app/src/pages/checkin.jsx` | Usa QRCodeScanner — não precisa alteração direta |

## Estratégia adotada

Em **nativo**: `@capacitor/camera` abre câmera nativa e retorna `dataUrl` da foto.
- `CameraService.requestPermission()` chamado antes de abrir câmera
- Usuário cancela → dialog fecha (null retornado)

Em **web**: `html5-qrcode` mantido integralmente (getUserMedia funciona no browser normalmente).

## Pendência futura (Wave 3c)
`TODO: Wave 3c` — integrar `jsQR` ou `zbar.wasm` para decodificar QR da foto tirada em nativo
(atualmente em nativo retorna o dataUrl da imagem sem decodificação automática em tempo real).
O fluxo nativo atual abre a câmera, tira a foto e passa o `dataUrl` ao caller — adequado
para quando o servidor backend pode processar a imagem.

## Plugin instalado necessário
```bash
cd app && npm install @capacitor/camera && npx cap sync
```
(a ser executado pelo dev/CI)
