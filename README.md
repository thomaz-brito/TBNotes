# TBNotes 🏋️

App web pessoal para registrar treinos de academia e acompanhar a progressão
de carga ao longo do tempo. Feito para funcionar muito bem no iPhone (Safari)
e ser instalável na tela inicial (PWA).

## Como rodar no seu computador

Você só precisa fazer o passo 1 uma vez.

1. **Instale o Node.js** (o "motor" que roda o projeto):
   baixe em <https://nodejs.org> e instale a versão **LTS**.

2. **Baixe o código**: no GitHub, botão verde **Code → Download ZIP**
   (ou `git clone` se você usa git). Descompacte em uma pasta.

3. **Abra o Terminal** (no Mac: Cmd+Espaço, digite "Terminal") e entre na
   pasta do projeto:

   ```bash
   cd caminho/para/TBNotes
   ```

4. **Instale as dependências** (só na primeira vez ou quando o código mudar):

   ```bash
   npm install
   ```

5. **Rode o app**:

   ```bash
   npm run dev
   ```

   O terminal mostra um endereço como `http://localhost:5173` — abra no
   navegador. Para ver no iPhone na mesma rede Wi-Fi, rode
   `npm run dev -- --host` e abra o endereço "Network" que aparecer.

Para parar o app, volte ao Terminal e aperte `Ctrl+C`.

## Etapas do projeto

- [x] **Etapa 1** — Estrutura, visual e telas de Exercícios e Treinos (rotinas)
- [ ] **Etapa 2** — Registro da sessão do dia + cronômetro de descanso
- [ ] **Etapa 3** — Histórico por data e gráficos de progresso
- [ ] **Etapa 4** — Supabase: conta, banco na nuvem, login e backup
- [ ] **Etapa 5** — PWA: instalar na tela inicial do iPhone

## Stack

- [Vite](https://vitejs.dev) + [React](https://react.dev) + TypeScript
- CSS puro com design system próprio (tema claro/escuro automático)
- Dados no `localStorage` por enquanto; Supabase (Postgres + Auth) na Etapa 4
