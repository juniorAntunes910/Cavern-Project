# Arquitetura

## Tecnologia ativa

O SDK Flutter não estava instalado no ambiente de desenvolvimento. Com autorização explícita para mudar de tecnologia, a implementação ativa passou a ser React 19 + TypeScript + Vite, em `web/`, com `@supabase/supabase-js` e React Router. O schema e as regras de produto continuam no Supabase/PostgreSQL. O diretório Flutter existente é legado preservado, não a aplicação em evolução.

## Princípios

O Cavern Project é local-first: a interface grava no repositório local e a sincronização eventual envia alterações ao Supabase. A UI nunca conhece SQL, Storage ou detalhes do cliente Supabase. Dados derivados (streak e progresso de meta) são calculados de eventos, nunca persistidos como fonte de verdade.

## Camadas

```text
presentation (widgets, páginas, providers) -> domain (entidades, calculadoras, contratos)
                                             -> data (repositórios, DTOs, fontes local/remota)
                                             -> core (Supabase, conectividade, sync, erros)
```

Cada feature possui `data`, `domain` e `presentation` somente quando precisar das três. Código compartilhado que não é de domínio fica em `shared/`; infraestrutura transversal fica em `core/`.

## Estrutura

```text
lib/
  app/                 # App, router, tema e shell responsivo
  core/                # ambiente, erros, serviços e sync
  shared/widgets/      # componentes realmente reutilizados
  features/
    auth/              # sessão e autenticação email/senha
    dashboard/
    caverns/
    goals/
    habits/
    streaks/
    books/
    reader/
    reading/
    checkins/
    statistics/
test/                  # testes de domínio
supabase/migrations/   # schema remoto versionado
```

## Estado e rotas

No frontend web, cada feature terá hooks e serviços próprios; o estado de sessão do Supabase protege as rotas e encaminha usuários não autenticados ao login. React Router define as rotas e o shell troca de sidebar desktop para barra inferior no mobile.

## Persistência e sincronização

Fase 7 introduz Drift/SQLite. As tabelas locais espelham entidades sincronizáveis, incluindo `id`, `created_at`, `updated_at` e `synced_at`. Operações locais entram em uma outbox. `SyncService` executa fora da UI: envia pendências, baixa mudanças e marca conflitos. A regra inicial é last-write-wins pelo `updated_at` UTC somente para campos sem merge semântico; logs diários usam chave única e nunca são duplicados silenciosamente.

PDFs não entram no PostgreSQL. Em plataformas nativas, uma cópia é mantida no diretório de documentos do app e opcionalmente enviada a `books/{userId}/{bookId}/{filename}` no bucket privado. No Web, o arquivo deve ser mantido via armazenamento compatível do browser e a sincronização é opcional.

## Decisões de domínio

- Uma sessão conta `max(0, max_page_reached - start_page)`: avanço máximo inédito dentro da sessão, sem contar o retorno de páginas como novo avanço.
- Progresso de leitura agrega `pages_read` das sessões que intersectam o período da meta; inclui livros diferentes.
- Dia ativo geral é uma data com ao menos um `habit_log` relevante concluído ou uma `reading_session` encerrada com atividade; o `StreakCalculator` recebe datas locais normalizadas e não faz suposições de timezone do dispositivo.
