
import { GoogleGenAI } from "@google/genai";
import { FinancialData } from "../types";

// Preferência: chave salva pelo usuário nas Configurações (guardada localmente
// e sincronizada em settings.meta_json) > variável de ambiente do build.
const getApiKey = () => {
  try {
    const userKey = localStorage.getItem('zenos_gemini_api_key');
    if (userKey) return userKey;
  } catch {}
  return process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

const withTimeout = (promise: Promise<any>, timeoutMs: number = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))
  ]);
};

export const getFinancialAdvice = async (data: FinancialData, userQuery: string) => {
  const ai = getAI();
  
  const contextSummary = {
    balance: data.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - 
             data.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
    debtsCount: data.debts.filter(d => d.status !== 'paid').length,
    accounts: data.accounts.map(a => `${a.name}: R$ ${(a.current_balance || 0).toLocaleString('pt-BR')}`).join(', '),
    categories: Array.from(new Set(data.categories.map(c => c.name)))
  };

  const systemInstruction = `
    Você é o ZenOS Master Assistant, um assistente financeiro de elite.
    
    ESTADO ATUAL:
    - Saldo Total: R$ ${contextSummary.balance}
    - Contas: ${contextSummary.accounts}
    - Categorias conhecidas: ${contextSummary.categories.join(', ')}
    
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
    - Seja conciso e executivo.
    - Use Markdown.
    - Responda em Português (Brasil).
  `;

  try {
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, 
      },
    }));

    return response.text;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') {
      return "O ZenOS está levando mais tempo do que o esperado para responder. Por favor, tente novamente em instantes.";
    }
    console.error("ZenOS AI Error:", error);
    return "Falha na conexão neural. Verifique sua conexão ou tente novamente.";
  }
};

export const analyzeReceipt = async (base64Image: string) => {
  const ai = getAI();

  try {
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: `Analise este cupom fiscal ou imagem financeira. Extraia os dados para criar uma transação.
             Identifique se é: Mercado, Padaria, Posto de Gasolina, Farmácia, Restaurante, etc.
             Retorne APENAS um JSON válido seguindo o esquema fornecido.`
          }
        ]
      },
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
  const ai = getAI();

  try {
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } }, 
          { text: `Ouça este comando de voz financeiro. Extraia a intenção de transação.
             REGRAS:
             - Se contiver "Gastei", "Comprei", "Paguei", "Saiu" -> type: "expense"
             - Se contiver "Recebi", "Ganhei", "Entrou", "Depósito" -> type: "income"
             
             Retorne APENAS um JSON válido.`
          }
        ]
      },
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
