# Banco de dados

## Modelo relacional

```text
auth.users 1--1 profiles
auth.users 1--* goals
auth.users 1--* habits 1--* habit_logs
goals *--* habits (goal_habit_links)
auth.users 1--* finance_transactions
auth.users 1--* financial_goals
auth.users 1--* books 1--* reading_sessions
auth.users 1--* daily_checkins
```

Todas as tabelas privadas têm `user_id` e RLS. `profiles.id` é a exceção intencional: é simultaneamente PK e FK para `auth.users.id` e não repete um `user_id` redundante. O trigger cria o perfil após cadastro.

## Integridade

- Enums restringem status e métricas conhecidas.
- `habit_logs` e `daily_checkins` têm unicidade por usuário/data.
- Triggers validam que as FKs escolhidas pertencem ao mesmo `auth.uid()`/usuário da linha.
- `goals.current_progress` não existe: é um valor derivado de sessões/logs.
- Os timestamps UTC são atualizados pelo trigger `set_updated_at()`.

## Segurança

RLS está habilitado em toda tabela `public` privada. As policies conferem `auth.uid() = user_id` (ou `id` em profiles). O bucket `books` é privado; sua policy requer que o primeiro segmento do nome do objeto seja o UUID do usuário autenticado.

As migrations são a fonte de verdade. A publishable key pode estar no cliente; nunca adicione uma `service_role` a `.env`, builds ou código Flutter.
