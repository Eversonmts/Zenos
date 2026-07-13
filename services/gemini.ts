import { GoogleGenAI } from "@google/genai";
import { FinancialData } from "../types";

// Preferência: chave salva pelo usuário nas Configurações (guardada localmente
// e sincronizada em settings.meta_json) > variável de ambiente do build.
const getApiKey = () => {
  try {
    const userKey = localStorage.getItem('zenos_gemini_api_key');
    if (userKey) return userKey;
  } catch {}
  
  // Prioriza a chave de API das variáveis de ambiente da Vercel / Vite
  const viteKey = import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  const processKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;
  
  return viteKey || processKey;
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

const withTimeout = (promise: Promise<any>, timeoutMs: number = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))
  ]);
};

export const getFinancialAdvice = async (data: FinancialData, userQuery: string) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Sua chave de API do Google Gemini não está configurada. Por favor, insira e salve sua API Key para ativar o Zenos IA.";
  }

  const ai = getAI();
  
  const contextSummary = {
    balance: data.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - 
             data.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
    debtsCount: data.debts.filter(d => d.status !== 'paid').length,
    accounts: data.accounts.map(a => `${a.name}: R$ ${(a.current_balance || 0).toLocaleString('pt-BR')}`).join(', '),
    categories: Array.from(new Set(data.categories.map(c => c.name)))
  };

  const systemInstruction = `
    Você é o Zenos IA, um assistente financeiro de inteligência artificial altamente avançado.
    
    ESTADO ATUAL DO USUÁRIO:
    - Saldo Total: R$ ${contextSummary.balance}
    - Contas/Potes: ${contextSummary.accounts}
    - Categorias de gastos: ${contextSummary.categories.join(', ')}
    
    COMANDOS ESPECIAIS:
    Se o usuário pedir para registrar um gasto ou entrada (ex: "gastei 50 com café" ou "recebi 2000 de bônus"), você deve responder normalmente mas incluir no FINAL da resposta um bloco JSON exatamente com este formato para que o sistema processe:
    {
      "action": "ADD_TRANSACTION",
      "transaction": {
        "description": "string",
        "amount": number,
        "type": "income" | "expense",
        "category_id": "string (opcional)",
        "date_at": "YYYY-MM-DD"
      }
    }

    DIRETRIZES:
    - Seja conciso, direto e executivo.
    - Use Markdown para respostas estruturadas.
    - Responda SEMPRE em Português (Brasil).
  `;

  try {
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, 
      },
    }));

    return response.text || "Sem resposta.";
  } catch (error: any) {
    if (error.message === 'TIMEOUT') {
      return "O Zenos IA está levando mais tempo do que o esperado para responder. Por favor, tente novamente em instantes.";
    }
    console.error("Zenos IA Error:", error);
    
    // Tratamento estendido e claro de limites de cota
    if (error.message?.includes('Quota exceeded') || error.message?.includes('RESOURCE_EXHAUSTED') || error.status === 429) {
      return "Cota Esgotada: A chave de API do Gemini fornecida excedeu a cota de uso do plano gratuito do Google. Por favor, tente novamente mais tarde ou configure outra chave de API ativa.";
    }

    if (error.message?.includes('API_KEY_INVALID') || error.status === 400 || error.status === 403) {
      return "Erro de Autenticação: Sua chave de API do Gemini está inválida. Por favor, verifique a chave inserida.";
    }
    
    return "Falha na conexão com o Zenos IA. Verifique sua chave de API ou conexão à internet e tente novamente.";
  }
};

export const analyzeReceipt = async (base64Image: string) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = getAI();

  try {
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Analise este cupom fiscal ou imagem financeira. Extraia os dados para criar uma transação.
             Identifique se é: Mercado, Padaria, Posto de Gasolina, Farmácia, Restaurante, etc.
             Retorne APENAS um JSON válido seguindo o esquema fornecido.`
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
           type: 'OBJECT',
           properties: {
             description: { type: 'STRING' },
             item: { type: 'STRING', description: 'O item principal comprado ou serviço' },
             location: { type: 'STRING', description: 'O estabelecimento ou local da compra' },
             amount: { type: 'NUMBER' },
             date_at: { type: 'STRING', description: 'Formato YYYY-MM-DD' },
             category: { type: 'STRING' },
             type: { type: 'STRING', enum: ['income', 'expense'] }
           },
           required: ['description', 'amount', 'date_at', 'type']
        }
      }
    }));

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Receipt Analysis Error:", error);
    return null;
  }
};

export const analyzeAudioCommand = async (base64Audio: string) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = getAI();

  try {
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        { inlineData: { mimeType: 'audio/webm', data: base64Audio } }, 
        { text: `Ouça este comando de voz financeiro. Extraia a intenção de transação.
           REGRAS:
           - Se contiver "Gastei", "Comprei", "Paguei", "Saiu" -> type: "expense"
           - Se contiver "Recebi", "Ganhei", "Entrou", "Depósito" -> type: "income"
           
           Retorne APENAS um JSON válido.`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
           type: 'OBJECT',
           properties: {
             description: { type: 'STRING' },
             item: { type: 'STRING', description: 'O item principal mencionado' },
             location: { type: 'STRING', description: 'O local mencionado' },
             amount: { type: 'NUMBER' },
             date_at: { type: 'STRING', description: 'Formato YYYY-MM-DD' },
             category: { type: 'STRING' },
             type: { type: 'STRING', enum: ['income', 'expense'] }
           },
           required: ['description', 'amount', 'type']
        }
      }
    }));

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Audio Analysis Error:", error);
    return null;
  }
};

export const parseIntentFromText = async (text: string, context: any) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = getAI();

  const systemInstruction = `
    Você é o núcleo cognitivo do Zenos IA. Analise o comando do usuário e mapeie para uma das ações do sistema.
    
    AÇÕES SUPORTADAS:
    1. "CREATE_TRANSACTION": Lançar receitas ou despesas normais (gastei, recebi).
    2. "CREATE_GOAL": Criar metas financeiras (ex: poupar, comprar notebook).
    3. "CREATE_COMPROMISSO": Criar compromissos ou contas a pagar no calendário.
    4. "CREATE_NOTE": Criar notas rápidas de anotação.
    5. "CREATE_TASK": Criar tarefas (afazeres).
    6. "CREATE_SHOPPING_ITEM": Inserir itens na lista de compras (ex: "preciso comprar açúcar").
    7. "PAY_COMPROMISSO": Dar baixa em contas/compromissos do calendário (ex: "paguei a conta de energia").

    CONTEXTO DO USUÁRIO:
    - Compromissos em aberto: ${JSON.stringify(context.compromissos || [])}
    - Categorias do sistema: ${JSON.stringify(context.categories || [])}
    - Potes/Contas disponíveis: ${JSON.stringify(context.accounts || [])}

    REGRAS DE MAPEAMENTO:
    - Se o usuário falar sobre comprar algo ou adicionar à lista de compras, use "CREATE_SHOPPING_ITEM".
    - Se o usuário disser "paguei X", busque no contexto se há algum compromisso ativo cujo título seja correspondente a X. Se sim, use "PAY_COMPROMISSO" e retorne o ID e dados dele.
    - Se for nota rápida ("anote...", "escreva..."), use "CREATE_NOTE".
    - Se for meta ("quero economizar...", "criar meta de..."), use "CREATE_GOAL".
    - Se for tarefa ("preciso fazer...", "criar tarefa de..."), use "CREATE_TASK".
    
    Gere um texto curto, dinâmico e natural em português para "speechResponse" confirmando os dados que serão criados na tela para aprovação final.
  `;

  try {
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: ['CREATE_TRANSACTION', 'CREATE_GOAL', 'CREATE_COMPROMISSO', 'CREATE_NOTE', 'CREATE_TASK', 'CREATE_SHOPPING_ITEM', 'PAY_COMPROMISSO'] },
            data: {
              type: 'OBJECT',
              properties: {
                description: { type: 'STRING', description: 'Descrição, nome do item ou título da nota/compromisso/tarefa/meta' },
                amount: { type: 'NUMBER', description: 'Valor financeiro associado' },
                date_at: { type: 'STRING', description: 'Data formatada em YYYY-MM-DD' },
                category: { type: 'STRING', description: 'Nome da categoria correspondente se aplicável' },
                type: { type: 'STRING', enum: ['income', 'expense'] },
                deadline: { type: 'STRING', description: 'Prazo da meta em YYYY-MM-DD' },
                target_amount: { type: 'NUMBER', description: 'Valor alvo da meta' },
                content: { type: 'STRING', description: 'Conteúdo detalhado da nota' },
                quantity: { type: 'STRING', description: 'Quantidade do item de compras, ex: 2 pacotes' },
                compromisso_id: { type: 'STRING', description: 'ID do compromisso a dar baixa se PAY_COMPROMISSO' }
              }
            },
            speechResponse: { type: 'STRING', description: 'A fala resumida que Zenos IA dirá de volta' }
          },
          required: ['action', 'data', 'speechResponse']
        }
      }
    }));

    const resultText = response.text || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Text intent parsing error:", error);
    return null;
  }
};
