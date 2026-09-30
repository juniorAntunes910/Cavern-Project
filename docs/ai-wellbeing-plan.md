# Plano — Orientador de bem-estar com IA

> **Atualização de implementação (30/09/2026):** o app é local-first e o plano técnico antigo abaixo descrevia um backend remoto que não corresponde ao APK. O fluxo atual foi adaptado para análise local e integração opcional com Gemini Nano no Android. A referência vigente de arquitetura, limites e geração do APK é [`ai.md`](ai.md). A disponibilidade generativa varia por aparelho; as regras locais são o modo universal.

## 1. Objetivo

Criar no Cavern um orientador de bem-estar que analise, com autorização explícita do usuário, os dados das várias áreas do aplicativo e ajude a:

- perceber padrões entre rotina, humor, foco, treino, leitura, metas e finanças;
- conferir fatos e métricas antes de apresentar uma conclusão;
- fazer perguntas de reflexão e sugerir próximos passos pequenos;
- montar desafios personalizados, sempre sujeitos à aprovação do usuário.

O produto não deve se apresentar como psicólogo, diagnosticar transtornos, prescrever tratamentos ou substituir acompanhamento profissional. A experiência será descrita como **orientação de bem-estar e reflexão pessoal com IA**.

## 2. Dados que poderão entrar na análise

Somente categorias habilitadas pelo usuário:

- perfil e rotina;
- metas, hábitos, registros e observações;
- check-ins, notas livres e indicadores de bem-estar;
- livros e sessões de leitura;
- treinos, exercícios, frequência e peso corporal;
- sessões de foco e nomes de projetos;
- objetivos, transações e observações financeiras;
- desafios, progresso, sequência e linha do tempo.
- XP e conquistas desbloqueadas.

Não enviar conteúdo de arquivos anexados, foto de perfil, credenciais, tokens, chaves ou dados técnicos de autenticação. Aplicar limites de período e quantidade antes do envio, com 180 dias como padrão inicial.

## 3. Consentimento e controles

1. Mostrar uma tela de ativação antes do primeiro uso.
2. Explicar quais categorias serão enviadas e com qual finalidade.
3. Deixar check-ins, finanças e peso corporal desmarcados inicialmente por serem mais sensíveis.
4. Oferecer uma prévia legível do resumo que será enviado.
5. Permitir revogar o acesso, apagar o histórico da IA e usar apenas análises locais.
6. Não executar mudanças em metas, hábitos, treinos ou finanças sem confirmação.
7. Manter a chave do provedor somente no backend.

## 4. Como validar as análises

A validação terá duas camadas:

### Métricas determinísticas

O aplicativo calcula localmente fatos como frequência, médias, totais, sequências, evolução e intervalos de datas. Esses valores formam a fonte de verdade e não podem ser alterados pelo modelo.

### Resposta estruturada e verificada

A IA deve devolver JSON dentro de um schema fixo. Cada observação terá:

- área analisada;
- afirmação;
- evidências e intervalo de datas;
- classificação entre `fato`, `inferência` e `pergunta`;
- confiança baixa, média ou alta.

O backend rejeitará campos inválidos, números que não coincidam com as métricas e afirmações sem evidência. Inferências serão exibidas como hipóteses, nunca como fatos. Contradições e dados insuficientes devem resultar em uma pergunta ao usuário.

## 5. Experiência planejada

### Revisão semanal

- resumo das principais mudanças;
- padrões positivos e pontos de atenção;
- relações possíveis entre áreas, com evidências;
- três perguntas de reflexão;
- até três ações pequenas para a semana.

### Conversa de reflexão

- usa somente o contexto autorizado;
- separa o que está nos dados da interpretação do modelo;
- evita respostas absolutas;
- sugere ajuda humana quando o tema exigir avaliação profissional.

### Desafio personalizado

- considera o panorama geral e as preferências atuais;
- gera regras mensuráveis e viáveis;
- mostra por que cada regra foi sugerida;
- exige revisão antes de salvar.

## 6. Segurança emocional e situações de crise

- Não produzir diagnóstico, indicação de medicamento ou promessa de tratamento.
- Não incentivar dependência emocional, exclusividade ou afastamento de pessoas reais.
- Não afirmar que possui sigilo profissional de psicólogo.
- Usar uma verificação de risco separada da conversa normal.
- Diante de risco imediato, interromper as recomendações comuns e mostrar recursos brasileiros: CVV 188, SAMU 192, UPA/pronto-socorro e CAPS/UBS, além de incentivar contato com alguém de confiança.
- Antes do lançamento público, revisar textos, fluxos e casos de avaliação com um profissional de saúde mental.

Referências: [OMS sobre IA responsável em saúde mental](https://www.who.int/news/item/20-03-2026-towards-responsible-ai-for-mental-health-and-well-being--experts-chart-a-way-forward), [OMS sobre IA segura e ética em saúde](https://www.who.int/news/item/16-05-2023-who-calls-for-safe-and-ethical-ai-for-health), [Ministério da Saúde — prevenção do suicídio](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/suicidio-prevencao/suicidio-prevencao) e [SAMU 192](https://www.gov.br/saude/pt-br/composicao/saes/samu-192).

## 7. Arquitetura proposta

```text
Dados locais/Supabase
        ↓
Consentimento por categoria
        ↓
Snapshot sanitizado + métricas determinísticas
        ↓
Supabase Edge Function autenticada
        ↓
OpenAI Responses API com Structured Outputs
        ↓
Validação do schema e das evidências
        ↓
Tela de revisão e confirmação do usuário
```

Configuração de servidor:

- `OPENAI_API_KEY`: segredo exclusivo da Edge Function;
- `OPENAI_MODEL`: modelo configurável sem alterar o frontend;
- `store: false`: desativa o armazenamento do estado da resposta pela API; retenção e monitoramento também dependem das configurações da organização;
- autenticação obrigatória e limite de requisições por usuário.

Estrutura mínima da resposta:

```text
summary
observations[]: area, kind, statement, evidence[], confidence
reflectionQuestions[]
recommendations[]: title, reason, effort, relatedAreas[]
alerts[]: severity, reason, action
challenge: title, durationDays, rules[]
```

## 8. Etapas de implementação

### Fase 0 — estabilizar o trabalho existente

- substituir a integração experimental da Jev pelo novo contrato;
- preservar o gerador local como fallback;
- finalizar os tipos do snapshot e remover incompatibilidades entre frontend e Edge Function.

### Fase 1 — consentimento e privacidade

- criar preferências por categoria;
- criar prévia dos dados enviados;
- implementar revogação e exclusão do histórico.

### Fase 2 — motor local de métricas

- calcular fatos por área e período;
- criar uma versão única e testável do snapshot;
- detectar dados incompletos, contraditórios ou antigos.

### Fase 3 — backend com resposta estruturada

- integrar a OpenAI Responses API na Edge Function;
- aplicar schema rígido, autenticação, rate limit e logs sem conteúdo sensível;
- validar toda resposta antes de retorná-la ao aplicativo.

### Fase 4 — interface do orientador

- criar painel de revisão semanal;
- separar visualmente fatos, inferências e perguntas;
- permitir abrir as evidências usadas;
- exigir confirmação antes de criar um desafio ou alterar dados.

### Fase 5 — conversa e segurança

- adicionar conversa contextual com memória opcional e apagável;
- implementar o fluxo de crise;
- limitar respostas clínicas e encaminhar questões adequadas a profissionais.

### Fase 6 — avaliação e lançamento

- testar qualidade, segurança, acessibilidade e custo;
- fazer revisão profissional dos cenários de saúde mental;
- liberar gradualmente e acompanhar feedback e falhas.

## 9. Testes obrigatórios

- dados completos, vazios, antigos e contraditórios;
- tentativas de prompt injection dentro de notas do usuário;
- números incorretos e conclusões sem evidência;
- português informal, erros de digitação e mensagens ambíguas;
- risco emocional real, falso positivo e ausência de risco;
- indisponibilidade do provedor e funcionamento do fallback local;
- ausência de chave no frontend, autenticação e limite de requisições;
- exclusão do histórico e revogação das categorias;
- layouts mobile e acessibilidade por teclado/leitor de tela.

## 10. Critérios de aceite

- nenhuma análise roda antes do consentimento;
- toda afirmação factual aponta para evidências verificáveis;
- inferências aparecem explicitamente como hipóteses;
- respostas inválidas nunca chegam à interface;
- nenhuma ação altera dados sem confirmação;
- crise apresenta imediatamente os recursos apropriados;
- aplicação continua útil sem internet através do fallback local;
- segredo do provedor permanece apenas no backend.

## 11. Estado atual em 30/09/2026

- Correções mobile dos gráficos e calendário foram implementadas e verificadas.
- O campo de nome do treino foi alinhado aos componentes visuais do sistema.
- Há geração local com fallback e geração remota de desafio.
- O fluxo remoto agora pede seleção por categoria e mostra a contagem de registros antes do envio; check-ins, finanças e peso começam desmarcados.
- O snapshot usa campos permitidos, janela de 180 dias e limites por categoria; nome, e-mail, foto e arquivos não entram.
- O snapshot também calcula métricas determinísticas por área; hipóteses da IA devem referenciar IDs de métricas existentes e passar por validação no backend e frontend.
- A Edge Function foi trocada para OpenAI Responses, Structured Outputs, `store: false`, limite de payload e validação da sessão Supabase.
- A revisão inicial mostra resumo, hipóteses com confiança qualitativa, métricas de origem, perguntas e recomendações antes do desafio.
- A conversa temporária de reflexão e o encaminhamento inicial para frases explícitas de risco imediato foram implementados; o protocolo precisa de avaliação profissional e não cobre todos os casos.
- A prévia agora exibe o JSON sanitizado que será enviado para cada solicitação.
- A revisão semanal independente, evidências que abram os registros originais e avaliação profissional ainda estão pendentes.
- O rate limit persistente foi implementado via migration do Supabase (8/minuto e 40/dia por usuário).
- Para ativar a geração remota, ainda é necessário configurar os secrets da OpenAI/Supabase e publicar a função.

## 12. Próxima execução recomendada

Criar controles persistentes de consentimento em Perfil e transformar a leitura inicial em uma revisão semanal independente do gerador de desafios. Avaliar conversas e encaminhamento de crise com profissional, adicionar limite de requisições persistente e executar cenários de segurança antes de divulgar o recurso amplamente.

## 13. Backlog executável

Cada item deve ser concluído antes de avançar para a fase seguinte. Os nomes abaixo indicam áreas prováveis do código; confirmar os caminhos durante a implementação.

### Marco A — contrato e estado atual

- [ ] Definir o contrato TypeScript do snapshot, das métricas e da resposta de IA.
- [x] Definir explicitamente os campos permitidos por categoria; evitar enviar objetos inteiros do armazenamento local.
- [x] Substituir o contrato experimental Jev na Edge Function e na documentação.
- [x] Manter geração local disponível quando a configuração estiver ausente ou a chamada falhar.
- [x] Decidir onde persistir consentimento e histórico, considerando modo local e sincronização Supabase.

**Pronto quando:** frontend, Edge Function e schema compartilham o mesmo contrato; nenhuma chave ou campo não permitido vai ao provedor.

### Marco B — consentimento e exportação do contexto

- [x] Criar preferências por categoria com padrões conservadores.
- [x] Criar uma função única que monta snapshot de acordo com consentimento, período e limites.
- [x] Adicionar tela de prévia com categorias, período e exemplos de dados incluídos.
- [x] Implementar desligar categoria, revogar consentimento e apagar histórico da IA.
- [x] Definir expiração e retenção local/remota antes de habilitar memória de conversa.

**Pronto quando:** testes demonstram que categoria desligada não aparece no snapshot e que a prévia corresponde ao payload enviado.

### Marco C — qualidade dos dados e métricas

- [ ] Normalizar datas, unidades e identificadores entre áreas.
- [ ] Calcular completude por categoria e sinalizar ausência de dados sem inferir que a atividade não ocorreu.
- [ ] Calcular tendências em janelas comparáveis e registrar a origem de cada métrica.
- [ ] Marcar duplicatas, registros inválidos e divergências sem corrigir silenciosamente os dados originais.
- [ ] Criar fixtures pequenas para cenários completos, vazios, inconsistentes e dados antigos.

**Pronto quando:** as métricas podem ser recalculadas de forma determinística e cada uma tem origem, período e unidade.

### Marco D — serviço de IA e validação

- [x] Implementar chamada à OpenAI somente na Edge Function autenticada.
- [x] Usar Structured Outputs e um schema versionado.
- [x] Tratar o conteúdo do usuário como dado não confiável, inclusive notas que contenham instruções.
- [x] Validar limites, enums, citações de evidência e correspondência de números com as métricas.
- [ ] Aplicar timeout, limite por usuário, tratamento de erro e logs sem conteúdo privado.
- [x] Retornar erro controlado para schema inválido e usar fallback local no cliente.

**Pronto quando:** payloads malformados, sem evidências ou com números inventados são descartados no backend.

### Marco E — revisão e conversa

- [ ] Criar tela de revisão semanal com filtro de período e categorias usadas.
- [ ] Permitir abrir a evidência de cada afirmação e mostrar quando os dados são insuficientes.
- [ ] Adicionar perguntas de reflexão e recomendações pequenas, sem executar ações automaticamente.
- [x] Conectar o desafio personalizado ao editor já existente e pedir confirmação antes de salvar.
- [ ] Se houver conversa, permitir memória explicitamente opcional, visualizável e apagável.

**Pronto quando:** pessoa usuária consegue verificar por que uma conclusão apareceu e rejeitar qualquer sugestão.

### Marco F — segurança emocional e liberação

- [ ] Definir com profissional de saúde mental os textos, limites e critérios de encaminhamento.
- [ ] Avaliar fluxo de risco imediato, ambiguidade e falsos positivos em português brasileiro.
- [x] Mostrar recursos oficiais no app e manter acesso rápido durante uma conversa.
- [ ] Fazer revisão de privacidade, segurança, acessibilidade e custo.
- [ ] Liberar para grupo pequeno, acompanhar incidentes e feedback e só então ampliar.

**Pronto quando:** avaliação profissional concluída, cenários críticos aprovados e processo de resposta a incidentes definido.

## 14. Dependências e decisões de produto

| Decisão | Padrão recomendado | Dependência |
| --- | --- | --- |
| Modelo | Configurável em `OPENAI_MODEL` no servidor | Conta/projeto OpenAI e secret no Supabase |
| Categorias sensíveis | Check-ins, finanças e peso desativados até opt-in | Tela e armazenamento de consentimento |
| Janela de análise | Até 180 dias, com métricas resumidas para dados antigos | Montagem do snapshot |
| Memória de conversa | Desativada por padrão, sessão curta e apagável | Política de retenção definida |
| Persistência de análise | Guardar só se usuário optar; permitir apagar | Escolha entre local e Supabase |
| Ações sugeridas | Nunca aplicar sem confirmação | Interface de revisão |

## 15. Riscos principais e respostas previstas

- **Conclusão psicológica indevida:** restringir linguagem, rotular inferências e exigir revisão especializada dos fluxos.
- **Dados enviados além do consentido:** lista positiva de campos, prévia baseada no payload real e testes por categoria.
- **Métrica incorreta por registros incompletos:** exibir cobertura e período; perguntar em vez de completar lacunas.
- **Prompt injection em notas:** tratar textos como conteúdo, limitar ferramentas e validar saída no servidor.
- **Exposição de dados sensíveis em logs:** não registrar payloads/respostas e revisar logs da Edge Function.
- **Dependência de rede ou provedor:** fallback local claro e sem alegar que a análise local equivale à revisão completa.
- **Custo inesperado:** limitar tamanho, frequência e período; medir custo antes de ampliar o acesso.

## 16. Escopo da primeira entrega

A primeira versão deve incluir consentimento por categoria, prévia do snapshot, resumo semanal com fatos e evidências, recomendações revisáveis, desafio opcional e fallback local. A conversa contínua com memória fica para uma entrega posterior, depois de validar segurança, privacidade e utilidade do resumo semanal.
