import React, { useState } from 'react';
import { Plus, Trash2, Eraser, Check, Sparkles } from 'lucide-react';
import { RangeAction } from '../types';

interface ActionPaletteProps {
  actions: RangeAction[];
  activeActionId: string | null; // active brush ID, null means Eraser
  activeWeight: number; // weight of active brush
  onSelectAction: (id: string | null) => void;
  onSelectWeight: (weight: number) => void;
  onAddAction: (name: string, color: string) => void;
  onDeleteAction: (id: string) => void;
  onUpdateAction?: (id: string, name: string, color: string) => void;
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#10B981', // green
  '#3B82F6', // blue
  '#F59E0B', // orange
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#EAB308', // yellow
  '#64748B', // slate/gray
];

export default function ActionPalette({
  actions,
  activeActionId,
  activeWeight,
  onSelectAction,
  onSelectWeight,
  onAddAction,
  onDeleteAction,
  onUpdateAction,
}: ActionPaletteProps) {
  const [newActionName, setNewActionName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [colorPickerActionId, setColorPickerActionId] = useState<string | null>(null);

  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionName.trim()) return;
    onAddAction(newActionName.trim(), selectedColor);
    setNewActionName('');
  };

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-900 shadow-xl p-5 space-y-6 w-full max-w-[780px]">
      
      {/* Title */}
      <div className="pb-3 border-b border-zinc-900 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Палитра и Инструменты</h3>
          <p className="text-[11px] text-zinc-500">
            Выберите инструмент для рисования на матрице. Меняйте названия и цвета прямо в списке.
          </p>
        </div>
      </div>

      {/* Grid of Brushes (including Eraser) */}
      <div className="space-y-3">
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Инструменты рисования</div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {/* Eraser Tool */}
          <button
            onClick={() => {
              onSelectAction(null);
              setColorPickerActionId(null);
            }}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeActionId === null
                ? 'bg-zinc-900/90 border-amber-500/50 text-white shadow-lg shadow-amber-950/10'
                : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-700/50 text-amber-500">
              <Eraser className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold">Ластик</div>
              <p className="text-[10px] text-zinc-500 truncate">Очистка ячеек диапазона</p>
            </div>
          </button>

          {/* User actions */}
          {actions.map((act) => {
            const isActive = activeActionId === act.id;
            return (
              <div
                key={act.id}
                onClick={() => onSelectAction(act.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer relative group ${
                  isActive
                    ? 'bg-zinc-900 border-emerald-500/50 shadow-lg shadow-emerald-950/10 text-white'
                    : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {/* Color Button with Inline color-picker popover */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    title="Изменить цвет"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerActionId(colorPickerActionId === act.id ? null : act.id);
                    }}
                    className="h-6 w-6 rounded-full border border-black/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer relative shadow-sm"
                    style={{ backgroundColor: act.color }}
                  >
                    <div className="absolute inset-0 rounded-full border border-white/10" />
                  </button>

                  {colorPickerActionId === act.id && (
                    <div className="absolute top-8 left-0 bg-zinc-900 border border-zinc-800 rounded-xl p-2 z-40 shadow-2xl flex flex-wrap gap-1.5 w-36">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateAction?.(act.id, act.name, c);
                            setColorPickerActionId(null);
                          }}
                          style={{ backgroundColor: c }}
                          className="h-5.5 w-5.5 rounded-full border border-black/30 flex items-center justify-center shrink-0 cursor-pointer relative hover:scale-110 transition-transform"
                        >
                          {act.color === c && (
                            <Check className="h-2.5 w-2.5 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline editable name input */}
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={act.name}
                    title="Кликните для переименования"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      onUpdateAction?.(act.id, e.target.value, act.color);
                    }}
                    placeholder="Назовите цвет"
                    className="w-full bg-transparent border-b border-transparent hover:border-zinc-700/50 focus:border-emerald-500 focus:bg-zinc-950 text-xs font-bold text-zinc-100 px-1 py-0.5 rounded outline-none transition-all"
                  />
                  <div className="text-[9px] text-zinc-500 px-1 mt-0.5 pointer-events-none">Нажмите для изменения имени</div>
                </div>

                {/* Delete action if more than 1 action exists */}
                {actions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAction(act.id);
                    }}
                    title="Удалить это действие из палитры"
                    className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800/60 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategy Weight Slider */}
      <div className="space-y-2.5 pb-4 border-b border-zinc-900 bg-zinc-900/20 p-3.5 rounded-xl border border-zinc-900/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Вес действия (Плотность закрашивания / Смешанная стратегия):
          </span>
          <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
            {activeActionId === null ? '0' : activeWeight}%
          </span>
        </div>

        {activeActionId !== null ? (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="100"
              value={activeWeight}
              onChange={(e) => onSelectWeight(parseInt(e.target.value))}
              className="flex-1 accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            
            {/* Quick preset weight buttons */}
            <div className="flex gap-1 shrink-0">
              {[25, 50, 75, 100].map((w) => (
                <button
                  key={w}
                  onClick={() => onSelectWeight(w)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                    activeWeight === w
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {w}%
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500 italic">Ластик полностью очищает все действия с ячеек.</p>
        )}
      </div>

      {/* Prominent Always-Visible Creator: "Выбери цвет из палитры - дай ему имя и им работай" */}
      <form onSubmit={handleAddAction} className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-4">
        <div className="flex items-center gap-1.5 text-zinc-300 font-bold text-xs">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          Создать новый инструмент (цвет)
        </div>

        {/* 1. Выберите цвет */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Шаг 1: Выберите цвет из палитры</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                className={`h-6.5 w-6.5 rounded-full border border-black/40 flex items-center justify-center shrink-0 cursor-pointer relative hover:scale-105 transition-all ${
                  selectedColor === color ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950 scale-110' : ''
                }`}
              >
                {selectedColor === color && (
                  <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Введите имя */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Шаг 2: Укажите название действия</label>
            <input
              type="text"
              required
              placeholder="Например, Опенрейз, 3-бет, Пуш, Колл..."
              value={newActionName}
              onChange={(e) => setNewActionName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!newActionName.trim()}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
            >
              <Plus className="h-4 w-4" />
              Добавить в палитру
            </button>
          </div>
        </div>
      </form>

    </div>
  );
}
