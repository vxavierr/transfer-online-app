# Regras de Compatibilidade Nativa — Transfer Online

Este app web é exportado periodicamente e executado como app nativo Android/iOS via Capacitor 8.
Toda alteração de código deve respeitar estas regras.

## PROIBIDO (quebra o app nativo)

| Código Proibido | Alternativa Correta | Import |
|----------------|--------------------|---------|
| window.open(url, '_blank') | BrowserService.open(url) | import { BrowserService } from '@/native' |
| window.location.href = url | useNavigate() | import { useNavigate } from 'react-router-dom' |
| import { X } from '@capacitor/xxx' | import { X } from '@/native' | (camada de abstração) |
| localStorage.setItem(key, val) | StorageService.set(key, val) | import { StorageService } from '@/native' |
| navigator.geolocation.X() | GeoService.X() | import { GeoService } from '@/native' |
| navigator.serviceWorker.register() | Guardar com if (!isNativePlatform()) | import { isNativePlatform } from '@/native' |
| toast() do react-hot-toast | toast() do sonner | import { toast } from 'sonner' |
| useToast() do shadcn | toast() do sonner | import { toast } from 'sonner' |

## EXCEÇÕES PERMITIDAS

| Código | Onde | Por Quê |
|--------|------|---------|
| localStorage em app-params.js | src/lib/app-params.js | SDK Base44 gerencia tokens internamente |
| @capacitor/core em App.jsx | src/App.jsx | Seleção de Router precisa ocorrer antes do React montar |
| window.open('', '_blank') para impressão | BoardingPassModal, TermosAceiteMotoristas | Impressão em nova aba |

## CAMADA NATIVA (src/native/)

| Serviço | O Que Faz | Métodos |
|---------|----------|---------|
| StorageService | Persistência de dados | get(key), set(key, val), remove(key), clear() |
| GeoService | GPS foreground + background | getCurrentPosition(), watchPosition(), startBackgroundTracking() |
| CameraService | Câmera e QR scanner | scanQRCode(), requestPermission() |
| BrowserService | Abrir URLs externas | open(url), close() |
| isNativePlatform() | Detectar se é nativo | Retorna true no Capacitor, false no browser |

REGRA: Componentes e páginas NUNCA importam @capacitor/* direto. Sempre via @/native.

## CHECKLIST PARA CADA MUDANÇA

- [ ] Nenhum window.open() novo (usar BrowserService)
- [ ] Nenhum localStorage novo para dados do app (usar StorageService)
- [ ] Nenhum import @capacitor/* fora de src/native/
- [ ] Toast usa sonner (não react-hot-toast nem shadcn toast)
- [ ] Nova página adicionada à lista de role no Layout.jsx
- [ ] Se mudou App.jsx, Layout.jsx ou app-params.js → AVISAR JOÃO