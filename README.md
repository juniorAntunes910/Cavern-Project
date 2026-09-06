# CAVERN

> **Disciplina, leitura e progresso — em um espaço seu.**

O **Cavern** é um aplicativo pessoal para transformar intenção em prática. Acompanhe hábitos e metas, registre leituras, finanças e check-ins para enxergar sua evolução com clareza.

![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalável-5A0FC8)
![Offline first](https://img.shields.io/badge/dados-offline--first-1F6F4A)

## O que você encontra

| Área | Para quê serve |
| --- | --- |
| **Hábitos** | Registre o que importa hoje e mantenha suas sequências visíveis. |
| **Metas** | Transforme intenções em objetivos mensuráveis. |
| **Financeiro** | Controle lançamentos, metas monetárias e sua posição em BTC. |
| **Livros e leitor** | Gerencie sua biblioteca, abra PDFs e acompanhe a leitura. |
| **Progresso** | Veja consistência, avanço de metas e o ritmo que está construindo. |
| **Check-ins** | Pare, reflita e ajuste a rota sem perder o contexto. |

## Destaques

- **Local-first:** hábitos, metas, livros, check-ins e progresso ficam no IndexedDB do dispositivo.
- **Funciona offline:** o service worker mantém a interface disponível sem conexão.
- **Instalável:** use como PWA no Android, Chrome e Edge; também há empacotamento para Windows via Electron.
- **Lembretes diários:** notificações opcionais para hábitos que ainda não foram concluídos.
- **Sincronização opcional:** conecte um projeto Supabase quando quiser autenticação e dados remotos.
- **Tema claro ou escuro:** escolha o ambiente que combina com seu momento.

## Tecnologias

O aplicativo em evolução está em [`web/`](web/) e usa **React 19**, **TypeScript**, **Vite**, **React Router**, **IndexedDB**, **PWA**, **Capacitor** e **Electron**. O diretório [`lib/`](lib/) preserva a fundação Flutter anterior; o schema do banco está em [`supabase/migrations/`](supabase/migrations/).

## Começar a desenvolver

### Pré-requisitos

- Node.js 24 ou superior;
- npm;
- Supabase CLI apenas se for usar sincronização remota.

### Executar localmente

```powershell
git clone https://github.com/juniorAntunes910/Cavern-Project.git
cd Cavern-Project/web
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Sem variáveis de ambiente, o Cavern continua funcionando no modo local e offline.

### Configurar o Supabase (opcional)

1. Copie [`web/.env.example`](web/.env.example) para `web/.env`.
2. Informe a URL e a publishable key do seu projeto.
3. Aplique o schema versionado:

```powershell
supabase db push
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_ALLOWED_EMAIL=voce@exemplo.com
```

`web/.env` nunca deve ser enviado ao Git. Para uma instalação exclusivamente pessoal, siga o [guia de uso privado](docs/private-use.md).

## Comandos úteis

Execute os comandos dentro de `web/`.

```powershell
# Verificar qualidade do código
npm run lint

# Gerar a PWA de produção em dist/
npm run build

# Testar a build de produção localmente
npm run preview

# Sincronizar a aplicação com o projeto Android
npm run android:sync

# Gerar APK de desenvolvimento
npm run apk:debug

# Empacotar o aplicativo Windows
npm run desktop:package
```

Os instaladores e arquivos empacotados são gerados em `web/release/` e não fazem parte do repositório. Publique a pasta `web/dist/` em HTTPS para habilitar a instalação como PWA.

## Estrutura do projeto

```text
Cavern-Project/
├── web/                    # Aplicação React, PWA, Android e Electron
│   ├── src/features/        # Hábitos, metas, finanças, livros e progresso
│   ├── src/lib/             # Dados locais, Supabase, PWA e notificações
│   ├── android/             # Projeto Capacitor para Android
│   └── electron/            # Empacotamento para Windows
├── lib/                     # Fundação Flutter preservada
├── supabase/migrations/     # Schema PostgreSQL versionado
├── docs/                    # Arquitetura, dados, sincronização e regras
└── test/                    # Testes de domínio Flutter
```

## Documentação

- [Arquitetura](docs/architecture.md)
- [Banco de dados](docs/database.md)
- [Sincronização](docs/sync.md)
- [Regras de produto](docs/product-rules.md)
- [Uso privado](docs/private-use.md)

---

Feito para construir constância, um dia de cada vez.
