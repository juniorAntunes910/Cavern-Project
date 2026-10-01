# Plano de retomada do Cavern

## Objetivo do produto

O caminho principal deve caber em quatro passos: abrir o aplicativo, escolher um hábito, registrar o dia e entender o avanço. Metas e Caverna ampliam esse caminho quando a pessoa estiver pronta. Academia, leitura e finanças são áreas independentes e devem continuar acessíveis sem interromper a rotina diária.

## Entregue nesta rodada

- A página inicial mostra primeiro as ações de hoje e permite concluir hábitos diretamente.
- A navegação principal mostra cinco destinos; os demais ficam em **Mais áreas**.
- No modo local, a entrada abre direto. A antiga tela usava senhas fixas no código e não protegia os dados do navegador. O perfil agora explica o alcance real desse modo.
- Criar um hábito exige só o nome. Categoria, descrição, tipo e vínculo com metas são opcionais.
- Criar uma meta começa com um alvo de sete dias dentro de um prazo de 30 dias; período e datas podem ser ajustados.
- Progresso de metas respeita as datas e passa a contar sessões de leitura, foco e presença/treinos da academia.
- Editar e iniciar uma Caverna usa o conteúdo editado. O avanço considera a duração do ciclo e a conclusão só fica disponível ao final.
- Dados da academia são restaurados do IndexedDB na inicialização; falha ao abrir esse banco não deixa a tela em branco.
- A segunda revisão simplificou Foco e Financeiro, acrescentou edição e desfazer em Hábitos/Metas, corrigiu custo da posição em BTC, estados de Leitura/Loja/Conquistas e melhorou foco de teclado nos diálogos.
- A revisão exploratória seguinte corrigiu conclusão de PDFs de uma página, exclusão de sessões de leitura e vínculos, confirmação de abandono/exclusão de Caverna, reversão de recompensas ao apagar a atividade e validação cronológica do saldo de BTC.
- Na inicialização, dados válidos do armazenamento local têm prioridade sobre uma cópia atrasada do IndexedDB; gravações no banco agora são ordenadas por chave para não inverter atualizações rápidas.
- O layout mobile foi compactado para navegador, PWA e APK Capacitor: cabeçalhos, cartões e formulários menores; loja em duas colunas com filtros horizontais; leitor adaptado; áreas seguras do Android consideradas.

## Validação feita

O backup local agora inclui os registros da academia e os arquivos PDF no formato v2. A importação aceita backups v1, informando que esses arquivos antigos não contêm academia nem PDFs. O percurso `npm run smoke:backup` exporta em um perfil temporário e restaura em outro, verificando leitura do PDF e registros da academia.

Percurso em Edge nas larguras móvel e desktop: abrir sem dados, criar hábito, concluir/desfazer o dia, criar meta e conferir avanço e descarte de edição, salvar check-in, iniciar/encerrar foco, lançar uma despesa e rejeitar valor zero, comprar/vender BTC e rejeitar uma venda retroativa sem saldo, marcar presença na academia, gerar/editar/iniciar/abandonar/excluir Caverna, recarregar e conferir persistência, importar/concluir/excluir um PDF de uma página, validar compra/equipamento na loja e navegar pelas 11 áreas. A exclusão de metas/hábitos também verifica limpeza de vínculos e recompensas. Sem erros JavaScript ou rolagem horizontal nesses percursos. `npm run lint`, TypeScript e build de produção devem permanecer como verificações antes de cada entrega.

Para repetir o percurso, inicie o Vite com `npm run dev -- --host 127.0.0.1` e, em outro terminal dentro de `web/`, execute `npm run smoke`. O teste usa o Edge instalado e cria um perfil temporário; não altera os dados do navegador pessoal.

A revisão mobile verificou as 11 áreas em 320, 360 e 430 px, o leitor de PDF em 320 px e um inset superior simulado do Android, sem rolagem horizontal. `npm run android:sync` concluiu e copiou a interface para o projeto Android. O APK de debug **não foi gerado nesta máquina**: o Gradle encontrou as dependências, mas não há Android SDK configurado (`ANDROID_HOME` ou `android/local.properties`). A validação em um aparelho/emulador permanece pendente.

## Próximas prioridades

1. **Proteção e recuperação dos dados.** Decidir se o produto será estritamente local ou terá contas. O modo local compartilha os dados com quem acessa o mesmo perfil do navegador. Testar o backup v2 com bibliotecas grandes e em dispositivos reais antes de depender dele para registros importantes.
2. **Financeiro.** Validar reconciliação contábil de aportes e apuração tributária/resultado em BTC com cenários reais de compra, venda e lançamentos retroativos. A transferência foi retirada do formulário porque não existe fluxo entre contas implementado.
3. **Academia e Caverna.** Ensaiar sessões de treino com exercícios e ciclos completos de vários dias; revisar cancelamento, edição e históricos.
4. **Distribuição.** Testar instalação PWA, operação offline, empacotamento Android e Electron em dispositivos reais. Esses ambientes não foram cobertos pelo ensaio de navegador.

## Critério para a próxima entrega

Uma pessoa nova deve conseguir registrar a primeira ação em menos de um minuto, compreender onde os dados ficam salvos e concluir cada fluxo principal sem depender de documentação. Cada mudança nas regras de progresso precisa de cenários de regressão para datas, vínculos e dados já existentes.
