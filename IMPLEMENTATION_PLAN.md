# Plano de implementação

## Fase 1 — Fundação
- [x] Estrutura feature-first, tema e shell responsivo
- [x] Roteamento com guarda de autenticação
- [x] Bootstrap Supabase opcional e modo local
- [x] Schema PostgreSQL, RLS e Storage versionados
- [x] Login local de testes e autenticação Supabase
- [x] Alternativa operacional React + TypeScript + Vite validada

## Fase 2 — Disciplina
- [x] Cavernas: criação e listagem
- [x] Metas: criação, associação, progresso, conclusão e cancelamento
- [x] Hábitos e registros diários (concluído, falhou, pulou)
- [x] Streak calculada a partir do histórico
- [ ] Edição de cavernas e filtros avançados

## Fase 3 — Biblioteca
- [x] Modelo local de livros e biblioteca com progresso
- [x] Importação local de PDF e metadados
- [x] Arquivos PDF persistidos no IndexedDB

## Fase 4 — Leitor
- [x] Leitor PDF.js, uma página por vez, zoom do navegador e retomada
- [x] Sessões de leitura e contagem conservadora de páginas
- [ ] Testes automatizados de ReadingSessionCalculator

## Fase 5 — Metas de leitura
- [x] Progresso de páginas derivado das sessões
- [x] Períodos diário, semanal, mensal e total
- [ ] Minutos de estudo/leitura derivados de sessões

## Fase 6 — Visão diária
- [x] Dashboard reativo
- [x] Check-in diário com gráfico mensal de disciplina, foco e energia
- [x] Estatísticas, calendário e comparação mensal

## Fase 7 — Offline e sincronização
- [x] Persistência estruturada em IndexedDB com migração automática do LocalStorage
- [x] Service worker e shell offline
- [ ] Camada de sincronização Supabase e fila de alterações
- [ ] Estratégia last-write-wins implementada

## Fase 8 — Entrega
- [x] Responsividade, acessibilidade básica e tema claro/escuro
- [x] Renderização sob demanda de páginas do leitor
- [x] PWA instalável em Android e desktop
- [x] Lembrete diário de hábitos pendentes com controle de duplicidade
- [ ] Testes de integração e builds nas plataformas
- [ ] Deploy permanente (requer provedor/conta e máquina ou hospedagem ativa)
