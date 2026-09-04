# Cavern Web App

Aplicativo React + TypeScript distribuído como PWA instalável no Android e em desktops compatíveis com Chrome ou Edge.

## Desenvolvimento

```powershell
npm install
npm run dev
```

## Gerar o aplicativo

```powershell
npm run build
npm run preview
```

O conteúdo instalável é gerado em `dist/`. Publique essa pasta em um endereço HTTPS e use o botão **Instalar aplicativo** no Cavern. No Android e no desktop, o navegador exibirá a confirmação nativa e criará o ícone do app.

## Dados locais e modo offline

- hábitos, registros, metas, cavernas, livros, sessões e check-ins ficam no IndexedDB `cavern-app`;
- PDFs ficam no IndexedDB `cavern-pdfs`;
- o service worker mantém a interface disponível sem internet;
- dados existentes no LocalStorage são migrados automaticamente para o IndexedDB na primeira inicialização desta versão.

## Notificações

O usuário ativa o lembrete no Perfil e escolhe o horário. O service worker envia no máximo uma notificação por dia, apenas quando existem hábitos ativos ainda não concluídos. Navegadores com Periodic Background Sync podem fazer a verificação com o app fechado; nos demais, a verificação ocorre ao abrir ou retornar ao aplicativo.
