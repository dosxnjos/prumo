# Empacotar o Prumo como app desktop (Windows)

Usa `pake` (Tauri) — mesmo padrão que os outros apps desktop do Gabriel
(`cerebro/reference_pake_apps.md` na memória). Gera um `.msi` standalone,
sem precisar do `npm run dev` rodando: os arquivos ficam embutidos no app.

## ⚠️ Antes de instalar: o app novo nasce vazio

O app desktop usa um perfil de WebView2 **isolado** do Chrome — não
compartilha o IndexedDB da aba do navegador. Ele **não vê** os dados que já
existem em `localhost:5177`. Para migrar:

1. No navegador (onde os dados reais estão): Configurações (⚙︎) → **exportar
   backup (JSON)**.
2. Instale e abra o app desktop (ele abre no onboarding, vazio).
3. Configurações (⚙︎) → **importar backup (JSON)** → escolha o arquivo
   exportado no passo 1.

## Gerar o instalador

```
npm run build
node -e "..." # gera build-assets/icone.png (ver abaixo)
pake "dist/index.html" --name Prumo --icon "build-assets/icone.png" --use-local-file --enable-find --force-internal-navigation
```

O `.msi` sai em `Prumo.msi`, na raiz do projeto (gitignored — refazer
sempre que precisar, nunca versionar o binário).

### Gerar o ícone (256×256 PNG truecolor)

Tauri rejeita PNG indexado. Script (precisa de `sharp`, instalar isolado,
não como dependência do projeto):

```js
import sharp from 'sharp'
await sharp('public/favicon.svg')
  .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .toColourspace('srgb')
  .png()
  .toFile('build-assets/icone.png')
```

## Instalar

```
msiexec /i "C:\Dev\prumo\Prumo.msi"
```

(sem aspas no caminho, o `msiexec` abre só a tela de ajuda em vez de
instalar — armadilha documentada na memória de referência do Pake.)

## `vite.config.ts` — por que `base: './'` só no build

O app desktop abre o `dist/index.html` via `file://` (dentro do
WebView2). Caminhos absolutos (`/assets/...`, o padrão do Vite) resolvem
contra a raiz do **disco**, não contra a pasta do `index.html`, e quebram
nesse esquema. `base: './'` no build resolve isso sem afetar o dev server
(que continua servindo em `/` normalmente).
