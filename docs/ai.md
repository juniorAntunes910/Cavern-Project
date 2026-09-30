# Orientador local do Cavern

O orientador funciona sem Supabase, chave de API ou conexão à internet. O snapshot é montado no próprio app a partir dos registros locais selecionados, calcula métricas e apresenta fatos, perguntas e sugestões. Conversas não são gravadas pelo recurso.

## No APK Android

O APK integra a Prompt API do ML Kit, que usa o Gemini Nano por meio do Android AICore quando o aparelho oferece suporte. Nesse caso, a conversa aberta também é gerada no dispositivo e recebe apenas as categorias autorizadas. O modelo generativo pode precisar de um download inicial pelo Android e não é compatível com todos os aparelhos. A análise local de métricas continua disponível quando o modelo não existe ou não pode ser baixado.

A versão mínima do APK passou para Android 8 (API 26), requisito da Prompt API. O modo de métricas funciona em todos os aparelhos que conseguem instalar essa versão do app.

Para gerar o APK:

```powershell
cd web
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

O artefato de depuração é criado em `web/android/app/build/outputs/apk/debug/app-debug.apk`. A integração exige Android API 26 ou superior. A primeira instalação do Gemini Nano pode precisar de internet; depois que o modelo está no aparelho, a inferência é local. A disponibilidade depende do modelo do celular, da versão do Android/AICore e do estado do dispositivo.

## Privacidade e categorias

Antes da análise, a pessoa escolhe quais áreas locais incluir. Todas vêm selecionadas para oferecer uma visão completa, mas check-ins, peso e finanças podem ser desmarcados. O snapshot não inclui nome, e-mail, foto, arquivos ou credenciais. O período padrão é de até 180 dias.

As categorias são: rotina e foco, metas e hábitos, leitura, treinos, peso corporal, sessões de foco, check-ins, finanças, desafios e linha do tempo, progresso e conquistas. Notas de check-in só entram quando essa categoria é escolhida.

## Limites

As métricas e relações apresentadas pelo modo universal são calculadas por regras locais e vinculadas aos registros. A conversa generativa é ativada somente nos Android compatíveis com Gemini Nano; nos outros ambientes, o orientador fornece respostas locais guiadas pelas métricas e tópicos reconhecidos. Isso não substitui um modelo clínico ou atendimento profissional.

O orientador é um guia de bem-estar e organização pessoal. Não é psicólogo, não diagnostica nem prescreve tratamento. Diante de risco imediato no Brasil, mostra CVV 188, SAMU 192, UPA/pronto-socorro, CAPS/UBS e recomenda avisar alguém de confiança. A detecção por texto é limitada e não identifica todas as situações.

## Implementação

- Snapshot local por lista permitida em `web/src/features/advisor/services/ai-data.service.ts`.
- Métricas, padrões, respostas de contingência e sinais de risco em `reflection.service.ts`.
- Integração nativa Android em `android-ai.service.ts` e `web/android/app/.../OnDeviceAiPlugin.java`.
- Desafios locais em `web/src/features/challenges/services/challenge-generator.service.ts`.
