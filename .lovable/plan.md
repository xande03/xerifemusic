

# Plano de Implementação — 4 Funcionalidades

## Visão Geral

São 4 itens distintos que envolvem mudanças no player (NowPlayingView), na lógica de download (nova Edge Function), no compartilhamento (QR Code + tmpfiles.org) e no layout da splash screen.

---

## 1. Botões de Ação no Player (Cast, Share, AirPlay, Fullscreen)

**Onde:** `NowPlayingView.tsx`

- Reorganizar os botões que hoje ficam no topo do artwork (Cast, AirPlay, PiP) para uma **barra de ações dedicada** abaixo das informações da música, ao lado de Heart/Share.
- Adicionar ícone de **Download** (ArrowDownToLine) nessa mesma barra.
- O botão **Tela Cheia** já existe no modo vídeo. Ao ser clicado, além de entrar em fullscreen, chamar `screen.orientation.lock('landscape')` para forçar modo horizontal. Ao sair, chamar `screen.orientation.unlock()`.
- Atualizar `FullscreenOverlay.tsx` para tentar lock de orientação ao montar e unlock ao desmontar.

**Arquivos:** `NowPlayingView.tsx`, `FullscreenOverlay.tsx`, `useYouTubePlayer.ts` (se necessário ajustar requestFullscreen para incluir orientation lock).

---

## 2. Download de MP3/MP4 com Progresso

**Problema:** Não é possível extrair áudio/vídeo do YouTube diretamente no client-side (requer conversão server-side).

**Solução:** Criar uma **Edge Function** `youtube-download` que:
1. Recebe `videoId` e `format` (mp3 ou mp4).
2. Usa a API do YouTube (ou lib como `ytdl-core` via CDN/importmap compatível com Deno) para obter a URL de streaming direta.
3. Retorna a URL de download direta para o client fazer o fetch com progresso.

**No client:**
- Criar um hook `useDownloadWithProgress` que faz `fetch()` da URL retornada, lê o stream com `ReadableStream` e calcula a porcentagem com base no `Content-Length`.
- Exibir um **overlay/toast de progresso** com barra e porcentagem durante o download.
- Ao concluir, salvar via `URL.createObjectURL()` + `<a download>`.

**Nota técnica:** A extração real de áudio do YouTube é tecnicamente restrita. A Edge Function tentará obter streams adaptivos (formato `itag` 140 para áudio M4A, ou 18/22 para vídeo MP4). Se não for viável server-side com Deno, usaremos um proxy que retorna a URL de streaming para download direto no browser.

**Arquivos novos:** `supabase/functions/youtube-download/index.ts`, `src/hooks/useDownloadProgress.ts`
**Arquivos editados:** `NowPlayingView.tsx` (botão de download), `Index.tsx` (state/handler)

---

## 3. Compartilhar via QR Code com Link Temporário (tmpfiles.org)

**Fluxo:**
1. Usuário clica em "Compartilhar" no player.
2. O sistema primeiro faz o download do arquivo (MP3 ou MP4) usando a mesma lógica do item 2.
3. Faz upload do arquivo para `https://tmpfiles.org/api/v1/upload` (aceita POST multipart).
4. tmpfiles.org retorna uma URL temporária.
5. Gera QR Code usando a lib `qrcode` (npm) com a URL do arquivo.
6. Salva o QR Code + URL em `localStorage` para cache.
7. Exibe um modal/dialog com o QR Code para o usuário escanear.

**O QR Code aponta diretamente para o MP3/MP4 no tmpfiles**, não para o app.

**Dependência nova:** `qrcode` (npm package para gerar QR codes como data URL no browser).

**Arquivos novos:** `src/components/ShareQRDialog.tsx`, `src/lib/tmpFilesUpload.ts`
**Arquivos editados:** `NowPlayingView.tsx` (botão Share abre o dialog)

---

## 4. Logo do Xerife Hub na Splash Screen

**Onde:** `SplashScreen.tsx`

- Aumentar o tamanho da logo de `w-36 h-36` para `w-48 h-48` (ou `w-52 h-52`).
- Garantir centralização com `flex items-center justify-center` (já existe).
- Adicionar uma leve animação de escala ao entrar.
- Ajustar o título para ficar mais visível e proporcional.

**Arquivo:** `SplashScreen.tsx`

---

## Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/NowPlayingView.tsx` |
| Editar | `src/components/FullscreenOverlay.tsx` |
| Editar | `src/components/SplashScreen.tsx` |
| Editar | `src/pages/Index.tsx` |
| Criar | `supabase/functions/youtube-download/index.ts` |
| Criar | `src/hooks/useDownloadProgress.ts` |
| Criar | `src/components/ShareQRDialog.tsx` |
| Criar | `src/lib/tmpFilesUpload.ts` |
| Instalar | `qrcode` (npm) |

