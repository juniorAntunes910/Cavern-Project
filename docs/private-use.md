# Uso privado

O Cavern Project é destinado exclusivamente ao proprietário e seus dispositivos pessoais. Não publicar em lojas, URLs públicas ou serviços de hospedagem sem proteção de acesso.

## Configuração inicial

1. Crie sua única conta no Supabase.
2. No painel Supabase, desative novos cadastros por e-mail em **Authentication > Providers > Email**. Essa é a medida que impede a criação de outras contas.
3. Em `web/.env`, defina `VITE_ALLOWED_EMAIL` com o e-mail da sua conta e reinicie/recompile a PWA.
4. Mantenha o projeto Supabase privado e nunca use service role no frontend.

`VITE_ALLOWED_EMAIL` é uma barreira adicional de interface: ela encerra sessões de e-mails diferentes e remove o cadastro da tela. A proteção de dados permanece nas policies RLS do banco e no bloqueio de cadastros do Supabase.

## Distribuição

Use no PC via `npm run dev` durante desenvolvimento. Para uso entre PC e celular, prefira uma rede privada (como Tailscale) ou um host com controle de acesso. Não utilize hospedagem estática pública e não exponha o servidor de desenvolvimento (`npm run dev`) na internet por túneis (o antigo script de túnel público do Cloudflare foi removido por isso).

## Contas bancárias no Financeiro (Pluggy)

O Financeiro pode importar lançamentos e saldo do seu banco pela [Pluggy](https://pluggy.ai), somente leitura. O `CLIENT_SECRET` da Pluggy nunca vai para o app: ele fica numa Edge Function do Supabase (`supabase/functions/pluggy`), que só responde ao seu login.

1. Crie uma conta e uma **aplicação** em pluggy.ai. Anote o `CLIENT_ID` e o `CLIENT_SECRET`.
2. Em [meu.pluggy.ai](https://meu.pluggy.ai), conecte seu banco. Isso só é possível enquanto o período de teste da conta Pluggy estiver ativo; faça logo.
3. No painel da Pluggy, abra a aplicação, o menu ⋮ da conexão e copie o **Item ID**.
4. Publique a função e os segredos:
   ```
   supabase secrets set PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... ALLOWED_EMAIL=seu@email
   supabase functions deploy pluggy
   ```
   `ALLOWED_EMAIL` é o mesmo valor de `VITE_ALLOWED_EMAIL`. Sem ele a função recusa todas as chamadas.
5. No app, entre com sua conta, abra **Financeiro > Contas conectadas**, cole o Item ID e toque em **Conectar e importar**.

Como funciona: a primeira carga traz 90 dias; depois o app atualiza ao abrir o Financeiro (no máximo a cada 6 h) ou por "Sincronizar agora". Pagamento de fatura vira transferência para não contar em dobro. Lançamentos importados que você excluir não voltam. O saldo vem do banco (contas correntes e poupança ativas); cartão não entra no saldo. A conexão e os lançamentos importados entram no backup do Perfil.

Antes de usar com o banco real, valide no sandbox da Pluggy: o formato do campo `next` do `GET /v2/transactions` (cursor) e o sentido de DEBIT/CREDIT nas contas de cartão.
