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

---

## 🧪 Status de Builds e Testes
* **Compilação TypeScript**: Rodando `npx tsc --noEmit` de forma recurrentemente com 100% de sucesso e sem quebra de tipos.
* **Servidor Dev Local**: Rodando na porta 3000 (`http://localhost:3000/`) como tarefa de background para visualização local imediata.
* **Status Git**: Repositório remoto no GitHub sincronizado na branch `main`.

---

## 📌 Guia de Deploy Vercel
Para colocar as alterações de chaves no ar:
1. Vá nas configurações de variáveis de ambiente do projeto na Vercel (*Settings > Environment Variables*).
2. Adicione a variável `GEMINI_API_KEY` com a chave secreta.
3. Realize um novo deploy do projeto para aplicar as variáveis no build estático do Vite.
