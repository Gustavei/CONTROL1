import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Mic,
  MicOff,
  Loader2,
  ShieldAlert,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import {
  runAIAssistantTurn,
  type AIContent,
  type ExecutedAction,
  type AppLiveState,
  type AppActionCallbacks,
} from '../services/aiService.ts';
import type { TabId } from './Navigation.tsx';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: ExecutedAction[];
  isError?: boolean;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  liveState: AppLiveState;
  callbacks: AppActionCallbacks;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEvent extends Event {
  results: ArrayLike<SpeechRecognitionResult>;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

const QUICK_SUGGESTIONS = [
  { label: 'Resumo de hoje', prompt: 'Faça um resumo completo do desempenho de hoje e compare Oscar vs Tiago.' },
  { label: 'Abaixo da meta 94%', prompt: 'Quais motoristas ou rotas estão abaixo da meta de 94% nos últimos registros?' },
  { label: 'Alertas da frota', prompt: 'Verifique os alertas de consumo de combustível e revisões preventivas pendentes na frota.' },
  { label: 'Cadastrar rota', prompt: 'Quero cadastrar uma nova rota de entregas.' },
  { label: 'Registrar abastecimento', prompt: 'Quero registrar um abastecimento de furgoneta.' },
  { label: 'Marcar KM da manhã', prompt: 'Quero marcar a quilometragem da manhã de uma furgoneta.' },
];

function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} className="h-1.5" />;
    }

    const renderInline = (content: string) => {
      const tokens = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return tokens.map((tok, i) => {
        if (tok.startsWith('**') && tok.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-slate-900">
              {tok.slice(2, -2)}
            </strong>
          );
        }
        if (tok.startsWith('`') && tok.endsWith('`')) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-slate-100 text-[#002B5C] font-mono text-[11px] font-semibold"
            >
              {tok.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{tok}</React.Fragment>;
      });
    };

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      return (
        <div key={idx} className="flex items-start gap-2 pl-1">
          <span className="text-[#0057B8] font-bold mt-0.5">•</span>
          <span className="flex-1">{renderInline(trimmed.slice(2))}</span>
        </div>
      );
    }

    const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 pl-1">
          <span className="text-[#0057B8] font-bold tabular-nums">{numMatch[1]}</span>
          <span className="flex-1">{renderInline(numMatch[2])}</span>
        </div>
      );
    }

    if (trimmed.startsWith('### ')) {
      return (
        <div key={idx} className="font-bold text-[#002B5C] text-xs uppercase tracking-wider mt-2 mb-0.5">
          {renderInline(trimmed.slice(4))}
        </div>
      );
    }

    return (
      <p key={idx} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  liveState,
  callbacks,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiHistory, setApiHistory] = useState<AIContent[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleReset = () => {
    setMessages([]);
    setApiHistory([]);
    setInput('');
  };

  const toggleVoice = () => {
    if (!speechSupported) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const sendMessage = async (textToSend?: string) => {
    const contentText = (textToSend ?? input).trim();
    if (!contentText || isLoading) return;

    if (!textToSend) setInput('');

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: contentText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const nextApiHistory: AIContent[] = [
      ...apiHistory,
      { role: 'user', parts: [{ text: contentText }] },
    ];

    try {
      const { replyText, updatedContents, executedActions } = await runAIAssistantTurn(
        nextApiHistory,
        liveState,
        callbacks
      );

      setApiHistory(updatedContents);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text: replyText,
          actions: executedActions,
        },
      ]);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro inesperado ao consultar a IA.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: errorMessage,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const badgeToneClasses: Record<NonNullable<ExecutedAction['badgeTone']>, string> = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    blue: 'bg-blue-100 text-[#0057B8] border-blue-200',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gls-ai-title"
      >
        {/* Header */}
        <div className="bg-[#002B5C] text-white px-5 py-4 flex items-center justify-between border-b-4 border-[#FFD100] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FFD100] text-[#002B5C] flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="gls-ai-title" className="font-extrabold text-base tracking-tight flex items-center gap-2 truncate">
                Assistente GLS IA
                <span className="text-[10px] font-bold bg-[#0057B8] text-blue-100 px-2 py-0.5 rounded uppercase">
                  Inteligência Operacional
                </span>
              </h2>
              <p className="text-[11px] text-blue-200 truncate tabular-nums">
                {liveState.routes.length} rotas &bull; {liveState.vehicles.length} furgonetas &bull; {liveState.drivers.length} motoristas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Nova conversa"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer warning if not admin */}
        {!liveState.isAdmin && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800 flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Modo <strong>Visualizador</strong>: você pode tirar dúvidas e consultar dados. Ative o modo <strong>Admin</strong> no topo para a IA salvar cadastros.
            </span>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
          {messages.length === 0 ? (
            <div className="space-y-4 py-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#002B5C]">
                  <Bot className="w-4 h-4 text-[#0057B8]" />
                  Como posso ajudar hoje?
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Peça análises em tempo real, compare <strong>Oscar vs Tiago</strong>, consulte metas ou me peça em linguagem natural para <strong>cadastrar rotas, motoristas, furgonetas, KM da manhã, abastecimentos e manutenções</strong>.
                </p>
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 text-[11px] text-[#002B5C]">
                  <strong>Exemplo rápido:</strong> &ldquo;Cadastre a rota R-15 de hoje do motorista João no Oscar: saiu 120 e entregou 117.&rdquo;
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Sugestões rápidas
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_SUGGESTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      className="text-left p-2.5 rounded-xl bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-[#0057B8]/40 text-xs font-semibold text-slate-700 hover:text-[#002B5C] transition flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <span className="truncate">{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0057B8] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#0057B8] text-[#FFD100] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] space-y-2 ${
                    msg.role === 'user'
                      ? 'bg-[#0057B8] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs shadow-xs'
                      : msg.isError
                      ? 'bg-red-50 text-red-800 border border-red-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs shadow-xs'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  ) : (
                    <div className="space-y-1 tabular-nums">{renderFormattedText(msg.text)}</div>
                  )}

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                      {msg.actions.map((act) => (
                        <div
                          key={act.id}
                          className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-[11px] truncate">
                                {act.title}
                              </div>
                              <div className="text-[10px] text-slate-600 truncate">
                                {act.subtitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {act.badge && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${
                                  badgeToneClasses[act.badgeTone || 'blue']
                                }`}
                              >
                                {act.badge}
                              </span>
                            )}
                            {act.targetTab && (
                              <button
                                type="button"
                                onClick={() => {
                                  callbacks.onNavigateTab(act.targetTab as TabId);
                                  onClose();
                                }}
                                className="text-[10px] font-bold text-[#0057B8] hover:underline whitespace-nowrap"
                              >
                                Ver
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-[#0057B8] text-[#FFD100] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0057B8]" />
                <span>Analisando dados e processando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 bg-white border-t border-slate-200 shrink-0"
        >
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-300 focus-within:border-[#0057B8] focus-within:ring-2 focus-within:ring-[#0057B8]/20 rounded-xl p-2 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Pergunte algo ou peça para cadastrar rota, KM, abastecimento..."
              className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 resize-none max-h-28 focus:outline-none py-1 px-1"
              disabled={isLoading}
            />

            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`p-2 rounded-lg transition shrink-0 ${
                  isListening
                    ? 'bg-red-600 text-white'
                    : 'text-slate-500 hover:text-[#0057B8] hover:bg-slate-200/70'
                }`}
                title={isListening ? 'Parar ditado por voz' : 'Falar comando por voz'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-[#0057B8] hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white transition shrink-0 shadow-xs"
              title="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between px-1">
            <span>Enter para enviar &bull; Shift+Enter para nova linha</span>
            <span>GLS Assistente Inteligente</span>
          </div>
        </form>
      </aside>
    </div>
  );
};
