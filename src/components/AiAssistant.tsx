import React, { useState } from 'react';
import { Sparkles, Brain, ArrowRight, Check, X, HelpCircle, AlertCircle } from 'lucide-react';
import { RangeAction } from '../types';

interface AiAssistantProps {
  onClose: () => void;
  activeActionName: string;
  onApplyRange: (combosWithWeights: { [hand: string]: number }, explanation: string) => void;
}

export default function AiAssistant({
  onClose,
  activeActionName,
  onApplyRange,
}: AiAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    combos: { [hand: string]: number };
    explanation: string;
    notation: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const response = await fetch('/api/ai/generate-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          actionName: activeActionName,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Не удалось сгенерировать диапазон.');
      }

      const data = await response.json();
      if (!data.combos || typeof data.combos !== 'object') {
        throw new Error('Некорректный формат ответа от AI.');
      }

      setPreviewData({
        combos: data.combos,
        explanation: data.explanation || 'Успешно сгенерировано.',
        notation: data.notation || '',
      });
    } catch (err: any) {
      setError(err.message || 'Произошла непредвиденная ошибка.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!previewData) return;
    onApplyRange(previewData.combos, previewData.explanation);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Генератор префлопа</h3>
              <p className="text-[10px] text-zinc-400">Генерация диапазонов с помощью Gemini AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-xl">
            <p className="text-xs text-zinc-300">
              Вы рисуете диапазон для действия <strong className="text-emerald-400">«{activeActionName}»</strong>.
              Опишите ситуацию, и искусственный интеллект рассчитает проценты и закрасит матрицу.
            </p>
          </div>

          {/* Prompts Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              Опишите желаемый диапазон
            </label>
            <textarea
              rows={3}
              placeholder="E.g. 'Диапазон открытия 15% с UTG для 6-max кэш-игры' или 'Тайтовый 3-бет с SB против открытия баттона'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none resize-none"
            />
          </div>

          {/* Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Примеры запросов:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                '100bb cash UTG RFI (15%)',
                'BTN vs CO Flat Call range',
                'SB Vs BTN Open 3-bet tight (9%)',
                'Push/Fold range 10bb SB vs BB',
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-800 cursor-pointer transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview State */}
          {previewData && (
            <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Успешно рассчитано!
                </span>
                <span className="text-[10px] font-mono text-zinc-400">{previewData.notation}</span>
              </div>
              
              <div className="text-xs text-zinc-300">
                <strong className="text-zinc-100 block mb-1">Пояснение AI Coach:</strong>
                <p className="leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-900 max-h-36 overflow-y-auto scrollbar-thin">
                  {previewData.explanation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs cursor-pointer transition-all"
          >
            Закрыть
          </button>
          
          {!previewData ? (
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow shadow-emerald-950/30"
            >
              {loading ? (
                <>
                  <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Рассчитываем...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Рассчитать диапазон
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer shadow shadow-emerald-950/30"
            >
              Закрасить чарт
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
