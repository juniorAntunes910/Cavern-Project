# Regras de produto

- Uma Caverna representa um intervalo fechado de datas e possui status planejada, ativa, concluída ou cancelada.
- Streaks são calculadas de histórico. A streak atual termina no último dia ativo, podendo incluir hoje; a mais longa considera todas as datas ativas.
- Uma sessão começa ao abrir o leitor e é encerrada ao sair/pausar. `pages_read` é `max(0, max_page_reached - start_page)`. Isso evita contar páginas revisitadas na mesma sessão.
- Metas de páginas e minutos são calculadas por eventos de leitura dentro de seu período; não há preenchimento manual de progresso derivado.
- Cada usuário possui no máximo um check-in e um log por hábito por data local.
- Datas de hábitos, check-ins e períodos usam data civil ISO (`DATE`); instantes de sessão usam UTC (`TIMESTAMPTZ`).

