import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GoogleGenAI,
  Type,
  ThinkingLevel,
  type FunctionDeclaration,
  type Content,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'cadastrar_rota',
    description:
      'Cadastra uma nova rota diária de entregas no sistema GLS. Calcula automaticamente as incidências (saiu - entregou) e a qualidade percentual.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Data da rota no formato YYYY-MM-DD. Se o usuário disser "hoje", use a data atual informada no contexto.',
        },
        provider: {
          type: Type.STRING,
          description: 'Nome do provedor responsável: exatamente "Oscar" ou "Tiago".',
        },
        driverName: {
          type: Type.STRING,
          description: 'Nome completo ou principal do motorista que operou a rota.',
        },
        routeNumber: {
          type: Type.STRING,
          description: 'Número ou código identificador da rota (ex: "R-12", "105", "402").',
        },
        routeName: {
          type: Type.STRING,
          description: 'Nome descritivo da rota (opcional). Se não informado, pode usar a localidade ou número da rota.',
        },
        locality: {
          type: Type.STRING,
          description: 'Cidade, bairro ou zona atendida pela rota (opcional).',
        },
        packages: {
          type: Type.NUMBER,
          description: 'Quantidade de pacotes que saiu para entrega (total de saída).',
        },
        deliveredPackages: {
          type: Type.NUMBER,
          description: 'Quantidade de pacotes efetivamente entregues (entre 0 e packages).',
        },
        notes: {
          type: Type.STRING,
          description: 'Observações adicionais sobre a rota (opcional).',
        },
      },
      required: ['provider', 'driverName', 'routeNumber', 'packages', 'deliveredPackages'],
    },
  },
  {
    name: 'cadastrar_motorista',
    description: 'Cadastra um novo motorista vinculado a um provedor (Oscar ou Tiago).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        provider: {
          type: Type.STRING,
          description: 'Provedor do motorista: "Oscar" ou "Tiago".',
        },
        name: {
          type: Type.STRING,
          description: 'Nome do motorista.',
        },
        phone: {
          type: Type.STRING,
          description: 'Telefone ou WhatsApp do motorista (opcional).',
        },
        vehicleType: {
          type: Type.STRING,
          description: 'Tipo de veículo principal (ex: "Furgão", "Van Master", "Fiorino") (opcional).',
        },
        licensePlate: {
          type: Type.STRING,
          description: 'Placa do veículo habitual (opcional).',
        },
        status: {
          type: Type.STRING,
          description: 'Status do motorista: "active" (padrão) ou "inactive".',
        },
      },
      required: ['provider', 'name'],
    },
  },
  {
    name: 'cadastrar_furgoneta',
    description: 'Cadastra uma nova furgoneta/veículo na frota GLS.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nome ou apelido identificador da furgoneta (ex: "Furgoneta 04", "Master Branca").',
        },
        plate: {
          type: Type.STRING,
          description: 'Placa do veículo (ex: "ABC-1234" ou "ABC1D23").',
        },
        model: {
          type: Type.STRING,
          description: 'Modelo da furgoneta (ex: "Renault Master L3H2", "Fiat Ducato", "Iveco Daily").',
        },
        provider: {
          type: Type.STRING,
          description: 'Provedor dono/responsável pelo veículo: "Oscar" ou "Tiago".',
        },
        defaultDriverName: {
          type: Type.STRING,
          description: 'Nome do motorista titular (opcional).',
        },
        initialOdometer: {
          type: Type.NUMBER,
          description: 'Quilometragem inicial do odômetro no momento do cadastro.',
        },
        fuelType: {
          type: Type.STRING,
          description:
            'Combustível: "Diesel S10" (padrão), "Gasolina Comum", "Gasolina Aditivada", "Etanol", "GNV" ou "Arla 32".',
        },
        tankCapacity: {
          type: Type.NUMBER,
          description: 'Capacidade do tanque em litros (opcional).',
        },
        status: {
          type: Type.STRING,
          description: 'Status inicial: "active" (padrão), "maintenance" ou "inactive".',
        },
        notes: {
          type: Type.STRING,
          description: 'Observações (opcional).',
        },
      },
      required: ['name', 'plate', 'model', 'provider', 'initialOdometer'],
    },
  },
  {
    name: 'registrar_km_manha',
    description:
      'Registra a leitura diária do odômetro pela manhã de uma furgoneta. O sistema calcula automaticamente os KM rodados em relação à manhã anterior.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Data da leitura no formato YYYY-MM-DD (opcional, padrão hoje).',
        },
        vehiclePlate: {
          type: Type.STRING,
          description: 'Placa (ou nome) da furgoneta registrada.',
        },
        driverName: {
          type: Type.STRING,
          description: 'Nome do motorista (opcional, usa o titular da furgoneta se disponível).',
        },
        startKm: {
          type: Type.NUMBER,
          description: 'Valor atual do odômetro lido pela manhã (em KM).',
        },
        routeNumber: {
          type: Type.STRING,
          description: 'Código da rota do dia (opcional).',
        },
        notes: {
          type: Type.STRING,
          description: 'Observações (opcional).',
        },
      },
      required: ['vehiclePlate', 'startKm'],
    },
  },
  {
    name: 'registrar_abastecimento',
    description:
      'Registra um abastecimento de furgoneta com cálculo automático de consumo (KM/L) e custo por KM em relação ao último abastecimento.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Data do abastecimento no formato YYYY-MM-DD (opcional, padrão hoje).',
        },
        vehiclePlate: {
          type: Type.STRING,
          description: 'Placa da furgoneta abastecida.',
        },
        driverName: {
          type: Type.STRING,
          description: 'Nome do motorista que abasteceu (opcional).',
        },
        odometerKm: {
          type: Type.NUMBER,
          description: 'Odômetro (KM) exibido no painel no momento do abastecimento.',
        },
        fuelType: {
          type: Type.STRING,
          description:
            'Tipo de combustível: "Diesel S10", "Gasolina Comum", "Gasolina Aditivada", "Etanol", "GNV" ou "Arla 32" (opcional).',
        },
        liters: {
          type: Type.NUMBER,
          description: 'Quantidade de litros abastecidos.',
        },
        pricePerLiter: {
          type: Type.NUMBER,
          description: 'Preço por litro em R$ (opcional se totalCost for informado).',
        },
        totalCost: {
          type: Type.NUMBER,
          description: 'Valor total pago em R$ (opcional se pricePerLiter for informado).',
        },
        stationName: {
          type: Type.STRING,
          description: 'Nome do posto de combustível (opcional).',
        },
        receiptNumber: {
          type: Type.STRING,
          description: 'Número da nota fiscal ou cupom (opcional).',
        },
        notes: {
          type: Type.STRING,
          description: 'Observações (opcional).',
        },
      },
      required: ['vehiclePlate', 'odometerKm', 'liters'],
    },
  },
  {
    name: 'registrar_manutencao',
    description: 'Registra uma manutenção preventiva ou corretiva de uma furgoneta.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Data da manutenção no formato YYYY-MM-DD (opcional, padrão hoje).',
        },
        vehiclePlate: {
          type: Type.STRING,
          description: 'Placa da furgoneta.',
        },
        driverName: {
          type: Type.STRING,
          description: 'Nome do motorista (opcional).',
        },
        odometerKm: {
          type: Type.NUMBER,
          description: 'Odômetro no momento da manutenção (opcional, usa odômetro atual do veículo se omitido).',
        },
        type: {
          type: Type.STRING,
          description: '"Preventiva" ou "Corretiva".',
        },
        category: {
          type: Type.STRING,
          description: 'Categoria (ex: "Óleo e Filtros", "Freios", "Pneus", "Suspensão", "Motor", "Elétrica", "Revisão Geral").',
        },
        description: {
          type: Type.STRING,
          description: 'Descrição do serviço realizado.',
        },
        cost: {
          type: Type.NUMBER,
          description: 'Valor total da manutenção em R$.',
        },
        workshop: {
          type: Type.STRING,
          description: 'Nome da oficina ou prestador (opcional).',
        },
        status: {
          type: Type.STRING,
          description: '"Concluída" (padrão), "Agendada" ou "Em Andamento".',
        },
        nextMaintenanceKm: {
          type: Type.NUMBER,
          description: 'KM previsto para a próxima revisão/troca (opcional).',
        },
        nextMaintenanceDate: {
          type: Type.STRING,
          description: 'Data prevista para a próxima revisão YYYY-MM-DD (opcional).',
        },
        notes: {
          type: Type.STRING,
          description: 'Observações (opcional).',
        },
      },
      required: ['vehiclePlate', 'type', 'category', 'description', 'cost'],
    },
  },
  {
    name: 'consultar_registros',
    description:
      'Consulta registros detalhados ao vivo do sistema (rotas, motoristas, furgonetas, quilometragem, abastecimentos ou manutenções) aplicando filtros.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: {
          type: Type.STRING,
          description:
            'Qual base consultar: "routes", "drivers", "vehicles", "mileage", "fuel" ou "maintenance".',
        },
        provider: {
          type: Type.STRING,
          description: 'Filtro por provedor: "all" (padrão), "Oscar" ou "Tiago".',
        },
        search: {
          type: Type.STRING,
          description: 'Termo de busca (nome de motorista, placa, número de rota ou localidade) (opcional).',
        },
        startDate: {
          type: Type.STRING,
          description: 'Data inicial YYYY-MM-DD (opcional).',
        },
        endDate: {
          type: Type.STRING,
          description: 'Data final YYYY-MM-DD (opcional).',
        },
        limit: {
          type: Type.NUMBER,
          description: 'Quantidade máxima de itens retornados (padrão 20, máx 50).',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'navegar_para_aba',
    description: 'Navega a tela do aplicativo diretamente para uma das abas principais.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tab: {
          type: Type.STRING,
          description:
            'Identificador da aba: "dashboard", "oscar", "tiago", "rankings", "history" ou "fleet".',
        },
      },
      required: ['tab'],
    },
  },
  {
    name: 'abrir_relatorio_pdf',
    description: 'Abre o gerador oficial de relatórios em PDF para rotas ou frota.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: '"routes" para Relatório de Qualidade de Rotas ou "fleet" para Relatório de Controle de Frota.',
        },
      },
      required: ['category'],
    },
  },
];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'gls-qualidade-api' });
  });

  // Server-side Gemini AI chat & function calling endpoint
  app.post('/api/ai/chat', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'A chave GEMINI_API_KEY não está configurada. Configure sua chave no painel Settings > Secrets para ativar a Assistente IA.',
      });
    }

    try {
      const {
        contents,
        contextSummary,
        isAdmin,
        todayDate,
      }: {
        contents?: Content[];
        contextSummary?: string;
        isAdmin?: boolean;
        todayDate?: string;
      } = req.body || {};

      if (!Array.isArray(contents) || contents.length === 0) {
        return res.status(400).json({ error: 'Histórico de mensagens inválido.' });
      }

      const systemInstruction = `Você é a **Assistente GLS IA**, a especialista inteligente oficial do sistema **GLS – Gestão de Qualidade, Auditoria de Rotas & Controle de Frota**.

Responda sempre em **Português (Brasil)**, de forma clara, objetiva, amigável e prática, usando formatação limpa (negrito, listas curtas e valores alinhados).

=== REGRAS DE NEGÓCIO DO SISTEMA GLS ===
1. **Meta Contratual de Qualidade**: **94,0%**.
   - **Fórmula oficial**: Qualidade (%) = ((Pacotes que Saiu - Incidências) / Pacotes que Saiu) × 100.
   - **Incidências**: Saiu - Entregou (nunca perguntamos volume; perguntamos quantos pacotes saíram e quantos entregaram).
   - **Classificações**:
     - **VERDE**: acima de 94,0% (meta batida)
     - **AMARELO**: entre 90,0% e 94,0% (atenção)
     - **VERMELHO**: abaixo de 90,0% (crítico)
2. **Provedores**: Existem exatamente dois provedores separados: **Oscar** e **Tiago**.
3. **Controle de Frota**:
   - **Quilometragem Diária**: Registro matinal único por dia. O sistema calcula automaticamente os KM rodados de uma manhã para a outra (KM de hoje - KM da manhã anterior).
   - **Abastecimentos**: Calcula automaticamente KM rodados desde o último abastecimento, consumo em **KM/L** e **R$/KM**. Alertas visuais sinalizam furgonetas abaixo do limite aceitável de eficiência (padrão 10.0 KM/L ou valor salvo).
   - **Manutenção Preventiva**: Alertas automáticos comparam o odômetro atual e a data de hoje contra a próxima revisão prevista (**VENCIDA**, **PRÓXIMA**, **EM DIA**).

=== COMO EXECUTAR CADASTROS E CONSULTAS ===
- Data local atual de hoje: **${todayDate || new Date().toISOString().slice(0, 10)}**.
- Nível de acesso atual do usuário: **${isAdmin ? 'ADMINISTRADOR (pode cadastrar e editar)' : 'VISUALIZADOR (somente leitura; cadastros bloqueados até ativar Admin)'}**.
- Se o usuário pedir para cadastrar uma rota, motorista, furgoneta, KM da manhã, abastecimento ou manutenção:
  - Se todos os dados obrigatórios já foram informados na mensagem (ex: placa, valor, litros, provedor, etc.) — ou puderem ser inferidos com segurança pelo contexto (por exemplo, placa da furgoneta cadastrada já identifica o provedor e motorista titular!) — **chame imediatamente a função correspondente** sem burocracia!
  - Se faltar algum dado essencial impossível de deduzir (ex: quantidade que saiu ou entregou, ou placa quando há várias furgonetas), pergunte de forma objetiva apenas o que falta.
  - Se o usuário estiver no modo Visualizador e pedir um cadastro, avise educadamente para ativar o modo **Admin** no menu superior direito (ou informar o PIN / login Google).
- Para perguntas sobre desempenho, comparações entre Oscar e Tiago, melhores/piores motoristas, gastos ou alertas, use os dados do resumo abaixo E chame \`consultar_registros\` sempre que precisar de detalhes completos por data, motorista, placa ou histórico.
- Nunca invente números, placas ou valores. Baseie-se estritamente no contexto ao vivo e nos resultados retornados pelas ferramentas.

=== CONTEXTO OPERACIONAL AO VIVO DO SISTEMA ===
${contextSummary || 'Nenhum dado carregado no momento.'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const modelContent = response.candidates?.[0]?.content || null;
      const functionCalls = response.functionCalls || [];
      const text = response.text || '';

      return res.json({
        text,
        functionCalls,
        modelContent,
      });
    } catch (err: unknown) {
      console.error('Erro no endpoint /api/ai/chat:', err);
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('API_KEY_INVALID') || message.includes('400')) {
        return res.status(400).json({
          error: 'Chave da API Gemini inválida ou requisição malformada. Verifique Settings > Secrets.',
        });
      }
      if (message.includes('PERMISSION_DENIED') || message.includes('403')) {
        return res.status(403).json({
          error: 'Permissão negada pela API Gemini. Verifique sua chave em Settings > Secrets.',
        });
      }
      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        return res.status(429).json({
          error: 'Limite de requisições da IA atingido no momento. Tente novamente em alguns segundos.',
        });
      }
      return res.status(500).json({
        error: 'Não foi possível processar sua solicitação com a IA no momento. Tente novamente.',
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GLS Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
