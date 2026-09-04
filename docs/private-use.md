# Uso privado

O Cavern Project é destinado exclusivamente ao proprietário e seus dispositivos pessoais. Não publicar em lojas, URLs públicas ou serviços de hospedagem sem proteção de acesso.

## Configuração inicial

1. Crie sua única conta no Supabase.
2. No painel Supabase, desative novos cadastros por e-mail em **Authentication > Providers > Email**. Essa é a medida que impede a criação de outras contas.
3. Em `web/.env`, defina `VITE_ALLOWED_EMAIL` com o e-mail da sua conta e reinicie/recompile a PWA.
4. Mantenha o projeto Supabase privado e nunca use service role no frontend.

`VITE_ALLOWED_EMAIL` é uma barreira adicional de interface: ela encerra sessões de e-mails diferentes e remove o cadastro da tela. A proteção de dados permanece nas policies RLS do banco e no bloqueio de cadastros do Supabase.

## Distribuição

Use no PC via `npm run dev` durante desenvolvimento. Para uso entre PC e celular, prefira uma rede privada (como Tailscale) ou um host com controle de acesso. Não utilize hospedagem estática pública.
