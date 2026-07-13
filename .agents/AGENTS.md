# Diretrizes e Regras do Workspace Zenos (Agentes Customizados)

## 🔑 Configuração da API do Gemini na Vercel

Sempre que for configurar ou atualizar a chave da API do Google Gemini no sistema ZenOS em ambiente de produção (Vercel):

1. **Painel do Projeto**: Acesse o painel da Vercel para o projeto Zenos.
2. **Environment Variables**: Vá em **Settings** > **Environment Variables**.
3. **Adicionar Variável**:
   * Nome: `GEMINI_API_KEY`
   * Valor: Cole a chave secreta fornecida pelo administrador/Google AI Studio.
4. **Ambientes**: Selecione todos os ambientes apropriados (Production, Preview, Development).
5. **Salvar**: Clique em salvar para registrar a nova variável.
6. **Redeploy**: Faça um novo deploy do aplicativo na Vercel para que o build do Vite compile e reconheça a chave de API injetada no sistema.
