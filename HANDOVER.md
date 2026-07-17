# ZenOS Finance — Documento de Handover e Histórico de Atualizações

Este documento registra cronologicamente todas as modificações, melhorias de UI/UX, correções no banco de dados e novas funcionalidades desenvolvidas no ecossistema ZenOS. Ele serve como guia de transição para desenvolvedores e agentes autônomos.

---

## 🚀 Resumo das Implementações Recentes

### 1. Sincronização Automática com Supabase Auth
* **Problema**: Inconsistência histórica onde usuários criados manualmente ou importados no `auth.users` do Supabase não possuíam perfil correspondente na tabela de `public.profiles`.
* **Solução**:
  * Desenvolvemos e aplicamos o RPC seguro `public.sync_auth_users_to_profiles()` em banco de dados ([20260712_admin_schema.sql](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/supabase/migrations/20260712_admin_schema.sql)).
  * Integramos no painel administrativo ([AdminDashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/admin/AdminDashboard.tsx)) via serviço ([adminService.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/services/adminService.ts)) o disparo automático de sincronização segura ao iniciar o painel.
* **Resultado**: Integridade absoluta e listagem de usuários do CRM sempre sincronizada e completa com o auth do Supabase.

### 2. Polimento de UI/UX e Contraste Acessível (Mobile-First)
* **Problema**: Rótulos e textos com baixo contraste em modo escuro (`dark:text-slate-600` / `dark:text-slate-700`), prejudicando a acessibilidade WCAG. Cards e modais com arredondamentos excessivos ocupando muito espaço útil em smartphones.
* **Solução**:
  * Otimizamos todos os rótulos de formulários, atividades de dashboard, orçamentos e subtítulos em [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx), [Transactions.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Transactions.tsx) e [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx) para usar `dark:text-slate-400`.
  * Ajustamos os arredondamentos mobile-first de `rounded-[2.5rem]` para `rounded-3xl` ou `rounded-2xl`.
  * **BottomNav**: Otimizamos as cores de ícones ativos (`text-indigo-600 dark:text-indigo-400`) e inativos (`text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white`) em [BottomNav.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/BottomNav.tsx).
* **Resultado**: Contraste perfeito, visual clean premium e maior usabilidade em telas pequenas de iPhones/Smartphones.

### 3. Logotipo 3D Oficial e Preparação para a Google Play Store
* **Problema**: O PWA usava um ícone de atalho e Splash Screen genérico de terceiros (uma carteira azul externa).
* **Solução**:
  * Geramos a identidade visual oficial em 3D (uma letra Z cromada metálica cortada por lâmina neon azul elétrica) e salvamos em [public/icon.jpg](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/public/icon.jpg).
  * Atualizamos o [manifest.json](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/manifest.json) e o [index.html](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/index.html) para usarem o ícone local oficial.
  * Criamos a pasta e o arquivo de template de validação [public/.well-known/assetlinks.json](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/public/.well-known/assetlinks.json) para habilitar tela cheia nativa via Trusted Web Activity (TWA) no Android.
* **Resultado**: O PWA agora inicializa e exibe a Splash Screen oficial da marca ZenOS, estando pronto para empacotamento no PWABuilder e publicação na Google Play Store.

### 4. Segurança e Gestão de Chaves de API (Vercel)
* **Problema**: O input público de chaves de API do Gemini no perfil violava melhores práticas e expunha o fluxo para o usuário comum.
* **Solução**:
  * Removemos o input de chave visual de [Settings.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Settings.tsx).
  * Ajustamos a leitura de chaves em [services/gemini.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/services/gemini.ts) para usar de forma resiliente as variáveis de ambiente `VITE_GEMINI_API_KEY` do Vite e `GEMINI_API_KEY` do ambiente Node.js.
  * Adicionamos diretrizes de deploy e regras de workspace em [.agents/AGENTS.md](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/.agents/AGENTS.md).
* **Resultado**: Chaves de API gerenciadas de forma ultra-segura diretamente pelas configurações da Vercel.

### 5. Mecanismo de Comandos de Voz Offline (NLP Local)
* **Problema**: Interações e lançamentos simples por voz geravam custos constantes de API de IA do Gemini.
* **Solução**:
  * Desenvolvemos e injetamos o motor de parsing de voz local `parseIntentLocally` em [ZenosIAScannerModal.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/ZenosIAScannerModal.tsx).
  * O analisador intercepta a fala e decodifica localmente no aparelho (via Regex/regras em JavaScript), executando lançamentos (gastos e entradas de ganho), criação de notas, metas e navegação entre telas (*"abrir calendário"*, *"ver cartões"*, etc.) offline, sem gastar cota de API.
  * Implementamos fallback inteligente: comandos locais não reconhecidos são encaminhados automaticamente à API do Gemini na nuvem.
* **Resultado**: Comandos de voz imediatos, gratuitos e resilientes integrados ao botão principal do assistente.

### 6. Reestruturação e Distribuição dos Botões (UX & Layout)
* **Microfone Centralizado no FAB (`+`)**: 
  * O menu radial flutuante agora conta com **5 opções** no [BottomNav.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/BottomNav.tsx).
  * O **Microfone (Comando de Voz)** foi inserido na posição central de destaque (`bottom: 190, left: '50%'`), com o gradiente roxo/azul oficial da marca, rodeado pelas 4 ações de atalho: *Transferência* (esquerda baixo), *Receita* (esquerda cima), *Gasto Cartão* (direita cima) e *Gasto* (direita baixo).
  * O callback em [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx) foi adaptado para interceptar a ação de voz e abrir o scanner.
* **Central de Notificações (Sino Superior)**: 
  * O botão superior direito do [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx) foi redesenhado com o ícone **`Bell`** (Notificações e Mensagens), deixando de acionar a voz.
  * O clique exibe um toast informando *"Nenhuma nova notificação ou mensagem no momento"*.
* **Melhoria no Ciclo de Voz (Falar Novamente)**:
  * No modal do assistente [ZenosIAScannerModal.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/ZenosIAScannerModal.tsx), o botão de *"Voltar"* foi aprimorado para um botão de **"Falar Novamente"** com ícone de microfone. 
  * Ao ser clicado, ele reseta o formulário e reativa a gravação de áudio instantaneamente, facilitando correções rápidas por voz.
* **NLP Local Offline Refinado (Ganho vs Gasto)**:
  * Expandimos as regras de parsing de linguagem natural no helper `parseIntentLocally`.
  * Ganhos, receitas, conquistas, depósitos e Pix de entrada são classificados automaticamente como `'income'` (receitas), enquanto despesas, compras, remédios e combustível são classificados como `'expense'` (despesas).
  * A caixa de seleção de categorias no formulário agora é filtrada de forma dinâmica: exibe apenas categorias compatíveis com o tipo de transação (evitando categorização cruzada ou inválida).
* **Melhoria da Voz do Assistente (Premium & Silenciador)**:
  * **Seleção de Voz Humana**: O assistente busca dinamicamente as vozes de alta qualidade em português (como vozes do Google, Microsoft ou Apple) instaladas no sistema operacional do dispositivo para evitar falas robóticas.
  * **Botão Mute (Silenciar)**: Adicionamos um controle de silenciamento de áudio (ícones `Volume2` e `VolumeX`) no cabeçalho do assistente. A preferência é lembrada e salva no `localStorage` sob a chave `zenos_voice_muted`.

### 8. Instalabilidade Real do PWA (Service Worker & Prompt Nativo)
* **Criação do Service Worker (`sw.js`)**: 
  * Criamos o arquivo [sw.js](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/public/sw.js) na pasta `public/` para responder a eventos de interceptação de rede (`fetch`), atendendo ao requisito técnico obrigatório do Chrome/Safari para tornar o aplicativo verdadeiramente instalável no telefone/PC.
  * O registro do Service Worker foi movido de condicional (apenas produção https) para **global** no [index.html](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/index.html) para permitir testes locais no localhost.
* **Banner de Instalação Nativa (In-App)**:
  * Criamos no [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx) uma escuta para o evento `beforeinstallprompt` do navegador.
  * Quando o navegador sinaliza que o aplicativo pode ser instalado, exibimos um **banner premium flutuante** na interface do usuário com a logo oficial, título de instalação e botão "Instalar".
  * O clique em "Instalar" invoca o prompt nativo de instalação do navegador, baixando e instalando o ZenOS de fato no sistema do celular ou computador do usuário.
  * **Banner de Instalação Nativa (In-App)**:
  * Criamos no [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx) uma escuta para o evento `beforeinstallprompt` do navegador.
  * Quando o navegador sinaliza que o aplicativo pode ser instalado, exibimos um **banner premium flutuante** na interface do usuário com a logo oficial, título de instalação e botão "Instalar".
  * O clique em "Instalar" invoca o prompt nativo de instalação do navegador, baixando e instalando o ZenOS de fato no sistema do celular ou computador do usuário.
  * Adicionamos controle de descarte: se o usuário clicar em fechar (`X`), o banner é recolhido e a ação é memorizada no `sessionStorage` para não incomodar sua navegação durante a sessão ativa.

### 9. Prompt de Instalação Automática Pós-Login & Captura de Navegação (Deep Linking)
* **Pergunta Automática Pós-Login**: 
  * Criamos um **Modal Popup Central Premium** no [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx) que é acionado de imediato quando detecta que o usuário está logado no navegador Chrome/Safari e o PWA é instalável.
  * Se o usuário ainda não instalou o aplicativo, o popup central pergunta: *"Deseja instalar o ZenOS no seu telefone para ter acesso instantâneo pela tela inicial, modo offline e melhor velocidade?"*
  * Um clique em *"Instalar Agora"* ativa o instalador nativo do sistema operacional. O clique em *"Mais Tarde"* silencia a pergunta no `localStorage` sob a chave `zenos_install_prompt_asked_v1`.
* **Abertura Automática do App Instalado (Launch Handler)**:
  * Atualizamos o [manifest.json](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/manifest.json) para incluir as chaves `"launch_handler"` (configurado para `client_mode: "navigate-existing"`) e `"prefer_related_applications": true`.
  * Isso diz ao sistema operacional do smartphone/PC que, caso o usuário já tenha o aplicativo instalado, ao clicar em links ou abrir o endereço do ZenOS em navegadores tradicionais, o sistema deve interceptar a navegação e abrir o aplicativo nativamente na janela PWA instalada, redirecionando o fluxo instantaneamente.

### 10. Correção de Exibição de Saldos dos Potes e Histórico de Metas
* **Exibição do Saldo do Pote**:
  * No detalhamento de cada Pote do [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx), a propriedade `account.balance` estava sendo lida como `undefined` devido à ausência no mapeamento. 
  * Corrigimos o mapeamento para atribuir `balance: account.current_balance` (calculado dinamicamente no `App.tsx` pela diferença entre as receitas/aportes e despesas reais de cada pote). Com isso, o saldo acumulado de cada pote passa a refletir instantaneamente a verdade financeira.
  * O saldo disponível do cabeçalho soma perfeitamente os saldos reativos dos potes de forma agregada.
* **Histórico Sincronizado em Metas**:
  * Atualizamos a interface `GoalsProps` e a chamada de depósito no [Goals.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Goals.tsx) para suportar a listagem de transações reais.
  * A caixa de detalhes de metas que antes exibia a mensagem estática *"Aguardando implementação..."* agora lista dinamicamente todas as contribuições financeiras reais vinculadas àquela meta (filtradas por `goal_id`), com a data e valor corretos de cada aporte.
  * Sanamos incompatibilidades de propriedades e chaves no [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx) e [types.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/types.ts).

### 11. Eliminação de Comandos Repetidos e Otimização do Supabase CDC
* **O Problema de Duplicidade**: 
  * Identificamos que o Supabase CDC (Change Data Capture/Postgres Realtime Subscriptions) disparava recargas completas de dados da nuvem (`loadUserData`) toda vez que ocorria uma alteração no banco.
  * No entanto, isso acontecia mesmo quando a mutação era gerada pelo próprio cliente/dispositivo do usuário localmente (que já havia atualizado o estado do React instantaneamente de forma otimista). Isso causava centenas de leituras redundantes e comandos de rede duplicados à API do Supabase na nuvem a cada transação, meta ou pote criado.
* **A Solução (Bypass de Mutação Recente)**:
  * Criamos uma função de timestamp global no [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx): `registerLocalMutation` (registrando o timestamp `window.zenos_last_local_mutation = Date.now()`).
  * Vinculamos esse registro em todos os métodos de persistência e mutação do app, incluindo a função genérica `updateAndSave` e o método de novas transações `handleAddTransaction`.
  * No listener do realtime `handleRemoteChange`, adicionamos uma validação: se o evento de alteração CDC ocorrer há menos de 3.5 segundos de uma mutação local feita pelo próprio dispositivo, o disparo de recarga é ignorado, bloqueando requisições duplicadas. As recargas em tempo real continuam funcionando normalmente apenas quando as alterações vêm de outros dispositivos conectados.

### 12. Recriação da Lógica PWA e Suporte Nativo para Windows
* **Exclusão e Recriação de Componentes**:
  * Excluímos a antiga lógica quebrada e reescrevemos do zero os módulos e arquivos responsáveis por tornar o app instalável: [pwaInstall.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/services/pwaInstall.ts) (controle centralizado do singleton de prompt do navegador) e o banner [InstallPrompt.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/InstallPrompt.tsx).
* **Service Workers Unificados**:
  * Corrigimos o [sw.js](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/sw.js) da raiz e o [public/sw.js](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/public/sw.js) para atuarem como Service Workers PWA ativos persistentes, contendo obrigatoriamente o evento `'fetch'` respondendo com pass-through da rede (`fetch(event.request)`). Isso atende ao critério de instalabilidade exigido pelo Google Chrome no Windows sem prender arquivos antigos no cache.
* **Manifesto e Ícones PNG**:
  * Para atender às regras rígidas do Chrome e Edge do Windows, geramos imagens PNG de alta fidelidade e resolução (`icon-192.png` e `icon-512.png`) na pasta `public/` através de script do PowerShell.
  * Atualizamos o [manifest.json](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/manifest.json) para linkar os novos ícones PNG, marcando-os como `"type": "image/png"` com finalidades `"any"` e `"maskable"`.
  * Corrigimos o parâmetro `"prefer_related_applications": false` para evitar que o navegador Windows bloqueie a instalação à procura de um app inexistente na loja nativa.

### 13. Correção de Desaparecimento de Lançamentos (Sanitização Strict no Supabase)
* **Causa do Desaparecimento**:
  * O frontend do ZenOS estendeu a interface de transações (`Transaction` no `types.ts`) adicionando propriedades úteis de interface e metas (como `goal_id`, `subcategory_id`, `item`, `location`).
  * Porém, a tabela `transactions` no Supabase não possui essas colunas. Quando o frontend executava o `upsert` enviando o objeto completo, o Supabase rejeitava a transação com erro `400 (column does not exist)`.
  * Como a query falhava, o app entrava no fallback de salvamento local. Mas, na inicialização subsequente do app, o `refreshFromSupabase` sobrescrevia o cache do LocalStorage com o estado da nuvem (onde a transação não existia), fazendo-a desaparecer da tela após o fechamento/reabertura do app.
* **A Solução (Sanitização no db.ts)**:
  * Ajustamos a função `saveTransactions` no [db.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/services/db.ts) para realizar uma sanitização estrita antes de rodar o `upsert`.
  * Filtramos e passamos apenas as colunas oficiais mapeadas na tabela do Supabase. Com isso, os inserts na nuvem são efetuados com sucesso completo e os lançamentos são persistidos definitivamente, permanecendo visíveis após reabrir o app.

---

## 🧪 Status de Builds e Testes
* **Compilação TypeScript**: Rodando `npx tsc --noEmit` de forma recurrentemente com 100% de sucesso e sem quebra de tipos.
* **Servidor Dev Local**: Rodando na porta 3000 (`http://localhost:3000/`) como tarefa de background para visualização local imediata.
* **Status Git**: Repositório remoto no GitHub sincronizado na branch `main`.

### 14. Separação de Contas Físicas vs Potes Virtuais no Frontend
* **O Problema**: A modelagem de banco de dados anterior misturava contas físicas e potes virtuais no mesmo conceito (`accounts`). Na migração v1.0, o frontend precisava lidar de forma isolada com Contas Bancárias Reais (onde reside o saldo real do usuário) e Potes Virtuais (porcentagens de rateio virtual).
* **A Solução**:
  * Passamos tanto `processedAccounts` (Contas Físicas) quanto `processedPots` (Potes Virtuais) de forma independente no objeto `financialData` do [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx).
  * O widget `"Potes"` no [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx) foi adaptado para consumir a variável dedicada `pots` e calcular os fluxos mensais dos potes com base na tabela física correspondente do banco, deixando a aba `"accounts"` livre para calcular o saldo total físico do usuário.
  * O formulário de lançamentos em [Transactions.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Transactions.tsx) foi adaptado para permitir selecionar tanto a **Conta Bancária (Física)** de onde o dinheiro sai (salvando em `account_id`) quanto o **Pote Virtual** correspondente (salvando em `pot_id`), respeitando 100% a integridade relacional.

### 15. Consolidação de Saldos dos Potes (Entradas - Saídas) e Somatório de Potes no Saldo Disponível
* **Cálculo de Saldos Reais (Potes)**:
  * Ajustamos o cálculo em [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx) e [Potes.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Potes.tsx) para computar de forma precisa as entradas (aportes de rateio obtidos a partir de `transaction_allocations` + receitas diretas no pote) menos as saídas (despesas diretas no pote), garantindo a verdade matemática do saldo real de cada pote no período selecionado.
  * Ajustamos a listagem de transações no detalhe do pote no [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx) e [Potes.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Potes.tsx) para incluir despesas tagged em `t.pot_id` (anteriormente limitados apenas a `t.account_id`).
* **Soma Consolidada no Saldo Disponível**:
  * Adicionamos a visualização física do **"Saldo nos Potes"** (que soma os saldos reais de todos os potes) no cabeçalho superior do [Potes.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Potes.tsx).
  * Ajustamos o `totalBalance` na raiz do [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx) e no [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx) para computar a soma exata de todos os potes ativos, refletindo essa soma consolidada no **"Saldo Disponível"** no topo da tela principal.

### 16. Auto-Migração de Dados (Auto-Healing) e Correção de Saldo Zerado no Card
* **Causa do Saldo Zerado**:
  * Os potes originais do usuário residiam na tabela `accounts` com IDs (UUIDs) antigos associados às suas receitas e alocações de rateio (`transaction_allocations`).
  * Na migração para a tabela dedicada `pots`, o seed padrão gerou IDs novos para os potes ("Essencial", "Investimentos", "Lazer"). Isso quebrou o vínculo com as alocações e despesas antigas no banco, fazendo o cálculo de saldo (`current_balance`) de cada pote zerar e as transações de histórico do pote no card sumirem.
* **A Solução (Auto-Migração em Tempo de Execução)**:
  * Desenvolvemos um mecanismo de migração em tempo de execução na função `ensureDefaultPots` do [db.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/services/db.ts) que roda de forma transparente na sessão autenticada do usuário.
  * O app identifica se há registros de potes antigos (contas com `percentage > 0`) na tabela `accounts` e os migra para a tabela dedicada `pots` **preservando exatamente o mesmo ID (UUID)** histórico.
  * Após migrar, o app zera a coluna `percentage` nas contas correspondentes na tabela `accounts` no Supabase para limpar a tabela de contas físicas e evitar duplicidades.
  * Ajustamos a listagem de histórico no card do pote no [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx) para buscar transações filtrando por `t.pot_id === account.id || t.account_id === account.id` (garantindo que tanto transações antigas quanto novas apareçam). Com isso, todos os saldos e históricos do card voltaram a bater imediatamente.

### 17. Recriação Completa e Autoteste do Banco de Dados no Novo Supabase
* **O Contexto**: O banco de dados foi completamente resetado/excluído. Recebemos a URL do novo projeto Supabase (`ylanzkfdjvkjubolcgqq`), a Service Role Key, a Anon Key e a senha do Postgres (`Zenos2026DbPass`).
* **A Solução**:
  * Desenvolvemos e rodamos uma rotina de migração programática passo a passo (`deploy_db.js`). O script executa de forma isolada a DDL de cada recurso e em seguida roda uma query de autoteste contra o Postgres remoto via pooler (`6543`) com SSL, validando a criação correta de cada estrutura antes de prosseguir.
  * O loop completou com **100% de sucesso** em todas as 17 etapas unitárias, incluindo:
    1. Extensões e Enums do schema
    2. Tabelas base (`plans`, `profiles`, `subscriptions`, `categories`, `accounts`, `pots`)
    3. Tabelas transacionais e relacionais (`transactions`, `transaction_allocations`)
    4. Tabelas auxiliares (`goals`, `debts`, `settings`, `guest_backups`, `user_credentials`)
    5. Triggers de auto-atualização `updated_at`
    6. Funções de trigger e hooks para cadastro de novos usuários autenticados (`handle_new_user`)
    7. Configurações de RLS e políticas de segurança
    8. Triggers de auto-rateio financeiro nos potes (`handle_auto_revenue_apportionment`)
    9. Índices de alta performance e tabelas de administração.
  * Atualizamos o `.env` local e o [vite.config.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/vite.config.ts) para referenciar as credenciais públicas do novo projeto Supabase como fallbacks de compilação.
  * Removemos o script temporário de migração por questões de segurança (para não deixar credenciais expostas no código).

### 18. Fluxo de Recuperação e Redefinição de Senha
* **O Problema**: Ao clicar no link de recuperação de e-mail enviado pelo Supabase, o usuário chegava no app com o hash contendo `#access_token=...&type=recovery`. No entanto, o dev server local (`npm run dev`) havia sido desligado durante o restart da plataforma (causando o `ERR_FAILED` de conexão), e além disso o frontend não possuía uma tela/estado preparado para capturar o evento de recuperação e permitir a digitação de uma nova senha.
* **A Solução**:
  * **Reinicialização do Dev Server**: Reiniciamos o servidor local de desenvolvimento na porta `3000` via script em background.
  * **Detecção de Evento do Supabase**: Ajustamos o `onAuthStateChange` em [auth.ts](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/services/auth.ts) para capturar o evento `PASSWORD_RECOVERY` emitido pelo cliente JS do Supabase Auth quando a URL contém o hash de recuperação.
  * **Tela de Nova Senha**: Adicionamos o estado de visualização `'reset'` ao [LoginModal.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/LoginModal.tsx). Quando a recuperação é detectada no [App.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/App.tsx), o modal de login é forçado a abrir neste modo, exibindo um formulário exclusivo com campo para a nova senha.
  * **Persistência e Update**: A nova senha é enviada via API `supabase.auth.updateUser` e, se for bem-sucedida, o usuário já é autenticado automaticamente no Dashboard com a nova credencial de acesso.

### 19. Refatoração Premium de Dark Mode UI/UX
* **O Contexto**: O modo escuro anterior possuía baixo contraste, tons pretos puros e cores neon saturadas nos gráficos que causavam fadiga visual e dificultavam a legibilidade.
* **A Solução**:
  * **Remoção do Preto Puro**: Sobrescrevemos o fundo escuro nativo do `index.html` e a classe `.dark` para utilizar um cinza escuro premium (#0F172A), eliminando o preto absoluto (#000000).
  * **Hierarquia e Elevação**: Adicionamos regras CSS globais no [index.css](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/index.css) que interceptam e elevam todos os cards, modais e containers para um cinza ligeiramente mais claro (#1E293B), com uma borda extremamente sutil e fina de `1px solid rgba(255, 255, 255, 0.08)` para demarcar limites de layout.
  * **Tipografia e Contraste**: Substituímos os textos brancos puros por cinza claro suave (#E2E8F0) e textos secundários por cinza médio (#94A3B8). Os inputs e campos de seleção ganharam contraste especial.
  * **Cores Pastéis nos Gráficos**: Refatoramos as paletas de cores de Recharts no [Dashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/Dashboard.tsx) e [AnalyticsDashboard.tsx](file:///C:/Users/Everson/.gemini/antigravity/scratch/Zenos/components/AnalyticsDashboard.tsx) para utilizarem tons pastéis suaves e desaturados (como verdes, vermelhos, azuis e amarelos suaves), garantindo leitura imediata e confortável das séries de dados.

### 20. Correção de Sincronização e Criação de Potes e Subcategorias (Banco Remoto)
* **O Problema**: Ao cadastrar potes ou subcategorias, os registros apareciam na tela mas sumiam ao atualizar a página (F5).
* **As Causas**:
  1. **Tabela `subcategories` inexistente**: A tabela `subcategories` não havia sido declarada nas migrações locais, fazendo a API do Supabase retornar erro `404 Not Found` no `upsert` e crashar silenciosamente a sincronização local.
  2. **Ausência de Constraint de Conflito em `pots`**: O seed automático de potes do app (`ensureDefaultPots`) executa um `upsert` com a cláusula `onConflict: 'user_id,name'`. Contudo, a tabela `pots` no Supabase não possuía uma restrição única (`UNIQUE`) combinando essas duas colunas. O Postgres remoto rejeitava a operação com o erro `no unique constraint matching the ON CONFLICT specification`.
  3. **Comportamento de Cache**: Quando essas chamadas falhavam silenciosamente, o app renderizava os dados temporariamente do estado React local, mas ao recarregar a página (F5), o `refreshFromSupabase` do app sincronizava com a lista vazia do Supabase remoto e limpava os dados locais do localStorage.
* **A Solução**:
  * **Criação de `subcategories`**: Conectamos ao banco de dados remoto via TCP e criamos fisicamente a tabela `public.subcategories`, habilitamos o RLS correspondente por usuário, criamos as políticas de acesso e o trigger de sincronização de datas.
  * **Constraint UNIQUE em `pots`**: Limpamos possíveis registros duplicados de teste na tabela `pots` e aplicamos fisicamente a restrição `UNIQUE (user_id, name)`.
  * Ambas as tabelas no Supabase agora aceitam e gravam os novos cadastros com sucesso absoluto!

### 21. Sincronização Estrita de Transações com Potes e Subcategorias
* **O Problema**: A inserção de gastos (despesas) que possuíam subcategorias continuava a falhar, e ao atualizar a página (F5) os potes e subcategorias associados às transações sumiam da tela ou voltavam vazios.
* **As Causas**:
  1. **Coluna `subcategory_id` inexistente na tabela `transactions`**: A tabela `public.transactions` no banco de dados remoto do Supabase não possuía a coluna física `subcategory_id` para referenciar a tabela `subcategories`.
  2. **Omissão de Mapeamento**: A função de sanitização `saveTransactions` em [db.ts](file:///C:/Users/Everson/AppData/Local/Temp/services/db.ts) omitia os campos `pot_id` e `subcategory_id` na hora de enviar o objeto de transação limpo para a API `.upsert()` do Supabase remoto. Por conta disso, as transações eram salvas no Supabase com esses valores como `null`. No recarregamento da página (F5), os dados eram sobrescritos pelo Supabase com os campos zerados.
* **A Solução**:
  * **Alteração Estrutural**: Executamos via Postgres a adição da coluna `subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL` na tabela `public.transactions` no Supabase remoto.
  * **Atualização do Mapeador**: Modificamos o `cleanTxs` no [db.ts](file:///C:/Users/Everson/AppData/Local/Temp/services/db.ts) para mapear e enviar corretamente os campos `pot_id` e `subcategory_id` na chamada de persistência do Supabase.
  * **Fluxo de Novos Usuários**: O trigger `handle_new_user` no Supabase remoto está 100% íntegro e garante que qualquer cadastro crie automaticamente o perfil, configurações iniciais de tema, categorias padrão de transação e semeie os três potes ("Essencial", "Investimentos", "Lazer").

### 22. Unificação e Coerência de Exibição de Saldos dos Potes
* **O Problema**: Havia uma discrepância visual nos saldos exibidos para os potes no Dashboard:
  1. O **card fechado** do pote exibia a variação mensal de fluxo de caixa (`monthFlow`, ex: `+R$ 1.000,00`).
  2. O **card aberto** (tela de detalhes ao clicar) exibia o saldo acumulado total (`balance`, ex: `R$ 5.000,00`).
  Essa diferença criava a sensação de que os saldos não estavam se comunicando nem entre si e nem com a soma do *"Saldo Disponível"* global no cabeçalho.
* **A Solução**:
  * Ajustamos o card fechado do pote no [Dashboard.tsx](file:///C:/Users/Everson/AppData/Local/Temp/components/Dashboard.tsx) (linha 471) para renderizar o **saldo acumulado real** do pote (`account.displayBalance`), igualando-o à visualização aberta do card.
  * O saldo exibido agora é uniforme e coerente em todos os estados do card (aberto ou fechado), somando exatamente para compor o *"Saldo Disponível"* global do cabeçalho e alinhado perfeitamente com a aba dedicada de *"Potes"* do menu.

### 23. Correção de Coluna Faltante `color` na Tabela `pots`
* **O Problema**: Potes cadastrados pelo aplicativo local não apareciam de fato na tabela `pots` no painel do Supabase, que permanecia vazia.
* **A Causa**: A tabela `pots` no Supabase não possuía a coluna `color`. O aplicativo local envia a propriedade `color` (ex: `#4F46E5`) no JSON de cada pote na chamada `.upsert()`. Sem a coluna correspondente no banco, o Postgres remoto rejeitava a operação inteira com o erro `column "color" of relation "pots" does not exist`. E como o `ensureDefaultPots` falhava, o app revertia a inserção e exibia a lista vazia no reload (F5).
* **A Solução**:
  * **Alteração Estrutural**: Conectamos via Postgres e adicionamos a coluna `color TEXT` na tabela `public.pots` no Supabase remoto.
  * **Semeador de Emergência**: Rodamos uma rotina direta de semeadura que inseriu com sucesso os três potes padrão ("Essencial", "Investimentos", "Lazer") atrelados ao seu ID de administrador no banco remoto, confirmando-os na hora no seu painel.
  * **Alinhamento de Tipos**: Atualizamos a interface `Pot` no [types.ts](file:///C:/Users/Everson/AppData/Local/Temp/types.ts) para incluir formalmente a propriedade opcional `color?: string | null;`.

### 24. Correção e Reprocessamento do Trigger de Rateio Automático nos Potes
* **O Problema**: Aportes e receitas (como a receita de R$ 1.000,00 lançada pelo usuário) não atualizavam os saldos físicos dos potes no Supabase e nem compunham o *"Saldo Disponível"* global no cabeçalho do Dashboard, que ficava zerado (`R$ 0,00`).
* **A Causa**: A função PL/pgSQL do trigger de rateio automático (`handle_auto_revenue_apportionment`) exigia a condição `NEW.account_id IS NULL` para processar a receita. No entanto, no fluxo de negócios atual, todas as transações lançadas pelo formulário exigem a seleção de uma conta física operacional (`account_id` preenchido). Por conta dessa divergência, o trigger não era disparado, as frações de receitas não eram geradas na tabela `transaction_allocations` e os saldos físicos de potes permaneciam zerados.
* **A Solução**:
  * **Correção do Trigger**: Alteramos a função no Postgres do Supabase remoto para remover a exigência `AND NEW.account_id IS NULL`, permitindo que qualquer receita de status `"Realizado"` seja rateada automaticamente nos potes.
  * **Reprocessamento Retroativo**: Desenvolvemos e rodamos uma rotina que leu as receitas cadastradas do usuário administrador, efetuou o rateio retroativo e atualizou os saldos na tabela `pots`.
  * Como resultado, os saldos físicos dos seus potes padrão (`Essencial`, `Investimentos` e `Lazer`) foram instantaneamente atualizados no Supabase de acordo com o rateio de 50%, 30% e 20% das receitas cadastradas.

### 25. Otimização de Recarga Assíncrona para Triggers de Receita
* **O Problema**: Após adicionar, editar ou excluir um lançamento de receita, os novos valores do rateio e os saldos dos potes só apareciam atualizados na tela se o usuário clicasse para recarregar o navegador ou atualizar a página manualmente.
* **A Causa**: Quando o aplicativo salva uma receita no Supabase, a inserção é síncrona do ponto de vista do React. Contudo, a geração das alocações e o incremento dos saldos dos potes ocorrem via trigger (assincronamente do ponto de vista do React) no Postgres remoto. O React local não conhecia essas mudanças automáticas. E como havia uma trava de 3.5 segundos para ignorar eventos do Supabase Realtime no mesmo dispositivo (para fins de desempenho e concorrência), a atualização automática via Postgres CDC era bloqueada.
* **A Solução**:
  * Adicionamos uma rotina no [App.tsx](file:///C:/Users/Everson/AppData/Local/Temp/App.tsx) dentro de `handleAddTransaction` (linha 735), `onDelete` (linha 1370) e `onEdit` (linha 1385).
  * Sempre que ocorrer um lançamento, edição ou exclusão de uma transação do tipo `income`, o aplicativo aguarda 800ms (tempo para o trigger no Postgres comitar) e executa automaticamente uma busca limpa na base (`loadUserData(activeUser.id, true)`).
  * Com isso, o saldo dos potes e o saldo disponível global agora atualizam de forma instantânea e totalmente automática na tela, sem necessidade de recarga ou clique manual por parte do usuário!

### 26. Sanitização Estrita de Potes para Persistência em Tempo Real
* **O Problema**: A criação ou alteração de potes feita pela tela do aplicativo local não era salva de forma alguma na tabela `pots` no painel do Supabase.
* **A Causa**: No frontend, o formulário de potes (`Potes.tsx`) reutiliza propriedades herdadas das contas bancárias (`Account`), gerando objetos que contêm campos extras como `balance_initial`, `type` e `is_active`. Quando a função `savePots` realizava o `.upsert()` no Supabase com o objeto bruto, o Postgres remoto rejeitava a operação por erro de coluna inexistente (por exemplo, `column "balance_initial" of relation "pots" does not exist`).
* **A Solução**:
  * Implementamos a sanitização estrita de colunas no `savePots` dentro de [db.ts](file:///C:/Users/Everson/AppData/Local/Temp/services/db.ts) (linha 665).
  * O array de potes agora é mapeado de forma a enviar **apenas** os campos correspondentes e aceitos fisicamente pela tabela `pots` no Postgres remoto.
  * A criação, alteração ou remoção de potes feita pelo aplicativo local agora é gravada e refletida no banco de dados do Supabase instantaneamente e em tempo real!

### 27. Validação de Saúde das Tabelas e Resolução do Trigger de Novos Usuários
* **O Problema**:
  1. Para garantir o funcionamento perfeito do banco de dados remoto do Supabase, rodamos uma rotina automatizada de validação em todas as 9 tabelas.
  2. O teste de integridade na tabela `settings` acusou a ausência da coluna `is_sync_enabled`. 
* **A Causa**: A tabela `settings` no Supabase remoto do usuário foi criada sem a coluna `is_sync_enabled`. No entanto, na função PL/pgSQL do trigger de novos usuários (`handle_new_user`), o banco tenta inserir `is_sync_enabled = true` ao criar uma nova conta. Essa divergência fazia a inserção do trigger falhar e crashar totalmente o fluxo de criação de novos usuários no Supabase Auth.
* **A Solução**:
  * **Ajuste Estrutural**: Conectamos via Postgres e adicionamos a coluna `is_sync_enabled BOOLEAN DEFAULT true` na tabela `public.settings` no Supabase remoto.
  * **Saúde Geral Atestada**: Reexecutamos o teste de saúde em todas as tabelas (`profiles`, `categories`, `subcategories`, `pots`, `transactions`, `transaction_allocations`, `goals`, `debts`, `settings`) e todas retornaram **100% de sucesso**. O banco remoto está perfeito!

### 28. Implantação Física das Tabelas Auxiliares (Notas, Tarefas, Diário, Calendário, Lista de Compras)
* **O Problema**: Notas, tarefas, diários, compromissos do calendário e itens de listas de compras criados no aplicativo local sumiam inteiramente após atualizar a página (F5).
* **A Causa**: Nenhuma das tabelas auxiliares necessárias para essas funções (`notes`, `tasks`, `journal`, `calendar`, `shopping_list`) existia fisicamente no banco de dados remoto do Supabase do novo projeto. As chamadas `.upsert()` do Supabase JS Client falhavam silenciosamente com erro de tabela inexistente (404), fazendo o app carregar listas vazias no F5/recarregamento.
* **A Solução**:
  * Conectamos ao seu Postgres remoto via script e criamos fisicamente todas as 5 tabelas no schema `public`:
    1.  **`public.notes`**: Para notas pessoais do usuário.
    2.  **`public.tasks`**: Para gerenciamento de tarefas.
    3.  **`public.journal`**: Para os diários pessoais de humor e anotações.
    4.  **`public.calendar`**: Para eventos e compromissos do calendário.
    5.  **`public.shopping_list`**: Para os itens da lista de compras.
  * Habilitamos o RLS em todas as 5 tabelas com políticas de acesso isoladas por usuário (`auth.uid() = user_id`).
  * Adicionamos os triggers de atualização de data de modificação (`update_updated_at_column`) a cada uma delas.
  * A partir de agora, notas, tarefas, diários, eventos do calendário e itens da lista de compras serão salvos em tempo real e de forma permanente no seu Supabase!

### 29. Canal e Tabela de Suporte Dedicado com Anexo de Fotos
* **O Problema**: O aplicativo utilizava a tabela `tasks` (Tarefas) de forma mista para armazenar chamados de suporte dos usuários comuns. Isso poluía as tarefas pessoais do usuário e impedia o envio de imagens (como prints de problemas/telas) para ajudar o administrador a entender os chamados.
* **A Solução**:
  * **Tabela no Banco**: Criamos fisicamente a tabela `public.support_tickets` no Supabase remoto com colunas dedicadas a chamados de suporte: `id`, `user_id`, `message` (mensagem do chamado), `image_url` (para anexo do print) e `status` (`Pendente`, `Em Andamento`, `Resolvido`, `Fechado`).
  * **Segurança e RLS**: Habilitamos RLS com política permitindo usuários comuns criarem e visualizarem apenas seus próprios chamados (`auth.uid() = user_id`) e administradores visualizarem e resolverem todos os chamados.
  * **Aba de Suporte no App**: Criamos a aba "Suporte" no menu de navegação lateral (`Support.tsx`) com um formulário que aceita anexo de fotos. As imagens anexadas são convertidas localmente para Base64 (Data URI) e salvas de forma compacta e segura no banco de dados na coluna `image_url` (sem dependência de Storage externo complexo).
  * **Painel do Administrador**: Integramos os novos chamados e o preview de fotos anexadas no painel administrativo (`AdminDashboard.tsx`) sob a aba "Segurança & Suporte", permitindo ao administrador (ex: `mattos.mmn@gmail.com`) visualizar os chamados reais com e-mail/nome do usuário, ver o print anexo e marcá-los como "Resolvido".

### 30. Módulo de Orçamentos na Visão Geral e Reformulação de Cartões (Limite e Histórico)
* **O Problema**:
  1. A seção de Orçamentos ficava oculta na Visão Geral (Dashboard) caso o usuário não tivesse nenhum limite ativo cadastrado, o que tornava a tela incompleta.
  2. A tabela `cards` no Supabase remoto não havia sido criada física e estruturalmente no novo banco de dados.
  3. No cadastro de cartões, os campos de "melhor dia de compra" e "vencimento" vinham preenchidos por padrão, e aceitavam números longos inválidos (mais de 2 caracteres).
  4. Os cards dos cartões não exibiam o valor do limite disponível, e faltava uma seção com o histórico corrido de despesas de cada cartão.
* **A Solução**:
  * **Dashboard**: Modificamos [Dashboard.tsx](file:///C:/Users/Everson/AppData/Local/Temp/components/Dashboard.tsx) para renderizar a seção de "Orçamentos" sempre ativa na Visão Geral. Se vazia, exibe um estado motivador de UX convidando a criar limites de gastos.
  * **Banco de Dados**: Criamos fisicamente a tabela `public.cards` no Supabase remoto com chaves estrangeiras vinculadas aos perfis de usuários, RLS ativo e triggers de atualização.
  * **Cartões - UX do Formulário**: Reformulamos os inputs de dia de fechamento e vencimento no modal de [Cartoes.tsx](file:///C:/Users/Everson/AppData/Local/Temp/components/Cartoes.tsx) para virem limpos/vazios por padrão. Agora aceitam apenas caracteres numéricos e possuem limite físico de até 2 números (máximo de 31 dias).
  * **Cartões - Limite Disponível**: Exibimos no card principal de cada cartão o cálculo automático de Limite Disponível (`Limite Total - Fatura em Aberto`), exibido com destaque em verde.
  * **Cartões - Histórico de Compras**: Adicionamos uma seção dedicada de "Histórico de Gastos" dentro do painel expandido do cartão, listando todas as compras associadas ao cartão por ordem de data, com valores e badges de status (Pago / Abreto).

### 31. Ocultação Automática da Barra de Navegação Inferior (Scroll Hide no Mobile)
* **O Problema**: Em smartphones, a barra de navegação inferior (`BottomNav`) ocupava espaço fixo na tela o tempo todo, diminuindo a área útil de leitura e navegação do app. O comportamento anterior de tentar ocultar a barra via hook `useScroll` do Framer Motion falhava silenciosamente em mobile devido à inicialização tardia do container de rolagem (`null ref` na montagem do DOM).
* **A Solução**:
  * **Transição Nativa de Scroll**: Substituímos a dependência do `useScroll` por um listener nativo de rolagem no container principal (`<main>` do `App.tsx`).
  * **Rastreamento via useRef**: Implementamos o monitoramento de velocidade e direção da rolagem utilizando um `useRef` para armazenar a última posição. Isso garante processamento instantâneo sem causar rerenders e sem lag no celular.
  * **Comportamento Premium**:
    - **Rolar para Baixo**: A barra esconde de forma suave deslizando para fora da tela (e fecha o FAB central se estiver aberto).
    - **Rolar para Cima**: A barra retorna suavemente ao seu lugar original.

### 32. Ativação Estrutural de Orçamentos e Melhorias Estéticas no Modo Escuro (Menus Mobile)
* **O Problema**:
  1. A tabela `budgets` (Orçamentos) não existia no banco de dados remoto do Supabase, o que impedia a permanência dos limites criados pelo usuário.
  2. No modo escuro do celular, os botões inativos tanto do menu inferior (`BottomNav`) quanto da barra de navegação lateral (`Sidebar`) ficavam com um tom cinza escuro de baixíssimo contraste e, ao serem clicados ou tocados, piscavam para branco (flicker de foco).
* **A Solução**:
  * **Banco de Dados**: Criamos fisicamente a tabela `public.budgets` no Supabase remoto com todas as chaves estrangeiras vinculadas de RLS e triggers de atualização. A tabela de compromissos (`public.calendar`) já estava ativada e operacional.
  * **Estilização de Menus (Modo Escuro)**:
    - Alteramos a cor dos textos e ícones inativos nos botões do menu inferior de `dark:text-slate-400 dark:hover:text-white` para `dark:text-white` (branco puro permanente), removendo o efeito indesejado de alteração de cor ao tocar no celular.
    - Alteramos a cor dos links inativos no menu da gaveta lateral (`App.tsx`) de `dark:text-slate-600` para `dark:text-white` (branco puro permanente). Os itens agora têm contraste visual máximo e leitura perfeita no tema escuro.

### 33. Área de Download do Aplicativo (Android APK e Instruções de Instalação iOS)
* **O Problema**: O usuário solicitou transformar o site em um aplicativo nativo empacotado em WebView e criar uma área de download responsiva no próprio site para instalar o aplicativo no Android e no iOS de forma prática.
* **A Solução**:
  * **Empacotamento e Download de APK (Android)**:
    - O link do botão Android aponta para `/zenos.apk` para realizar o download direto e seguro do arquivo empacotado.
    - Criamos um arquivo placeholder `public/zenos.apk` na raiz pública. O usuário deve gerar o APK usando ferramentas gratuitas de empacotamento web como o [PWABuilder](https://www.pwabuilder.com/) (da Microsoft) ou [WebIntoApp](https://www.webintoapp.com/) a partir da URL publicada do site dele na Vercel e simplesmente colar o arquivo `.apk` gerado na pasta `public` com o nome `zenos.apk`.
  * **Instruções de Instalação (iOS)**:
    - O botão iOS abre um modal amigável (alerta interativo) instruindo detalhadamente o passo a passo para o usuário adicionar o app à tela inicial do Safari:
      1. Abrir o site no Safari.
      2. Clicar no ícone de "Compartilhar".
      3. Selecionar "Adicionar à Tela Inicial".
  * **Aba de Download no Sistema**:
    - Criamos e integramos a aba **Download App** no menu interno de Ajustes do Sistema (`Settings.tsx`) com os botões responsivos de Android e iOS no modo escuro/claro premium.

---

## 📌 Guia de Deploy Vercel
Para colocar as alterações de chaves no ar:
1. Vá nas configurações de variáveis de ambiente do projeto na Vercel (*Settings > Environment Variables*).
2. Atualize as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do novo banco.
3. Realize um novo deploy do projeto para aplicar as variáveis no build estático do Vite.
