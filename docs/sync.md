# Sincronização

O modo inicial é local-first com sincronização eventual. Cada escrita confirma primeiro no Drift e recebe `synced_at = null`; a UI atualiza imediatamente. O `SyncService` é acionado por conectividade, abertura do app e ação manual, sem bloquear a navegação.

Ordem: (1) enviar outbox em ordem de criação, (2) aplicar respostas remotas, (3) buscar registros alterados desde o último cursor, (4) reconciliar e registrar falhas recuperáveis. Conflitos de entidades editáveis adotam last-write-wins por `updated_at` UTC. Eventos com unicidade diária são upsertados pela chave natural e uma colisão é exposta para resolução, nunca descartada sem log.

Arquivos são separados dos metadados: a cópia local continua a abrir offline; o upload é idempotente usando `storage_path`. Falha de upload não impede a leitura.

