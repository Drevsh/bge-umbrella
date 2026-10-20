import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface NumberStepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: React.ReactNode;
  suffix?: string;
  showPlusSign?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  colorScheme?: 'indigo' | 'amber' | 'teal' | 'slate' | 'rose' | 'emerald' | 'purple' | 'cyan' | 'orange';
  title?: string;
  disabled?: boolean;
}

export const NumberStepperInput: React.FC<NumberStepperInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  prefix,
  suffix,
  showPlusSign = false,
  className = '',
  size = 'sm',
  colorScheme = 'slate',
  title,
  disabled = false
}) => {
  const handleDecrement = () => {
    if (disabled) return;
    const next = Math.max(min, (Number(value) || 0) - step);
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const next = Math.min(max, (Number(value) || 0) + step);
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      onChange(0 >= min && 0 <= max ? 0 : min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  const colorStyles = {
    slate: {
      border: 'border-slate-800 focus-within:border-slate-600',
      bg: 'bg-slate-950',
      text: 'text-slate-200',
      btnHover: 'hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:bg-slate-700'
    },
    indigo: {
      border: 'border-indigo-900/60 focus-within:border-indigo-500',
      bg: 'bg-slate-950',
      text: 'text-indigo-300',
      btnHover: 'hover:bg-indigo-950/80 text-indigo-400 hover:text-indigo-200 active:bg-indigo-900'
    },
    amber: {
      border: 'border-amber-900/60 focus-within:border-amber-500',
      bg: 'bg-slate-950',
      text: 'text-amber-300',
      btnHover: 'hover:bg-amber-950/80 text-amber-400 hover:text-amber-200 active:bg-amber-900'
    },
    teal: {
      border: 'border-teal-900/60 focus-within:border-teal-500',
      bg: 'bg-slate-950',
      text: 'text-teal-300',
      btnHover: 'hover:bg-teal-950/80 text-teal-400 hover:text-teal-200 active:bg-teal-900'
    },
    rose: {
      border: 'border-rose-900/60 focus-within:border-rose-500',
      bg: 'bg-slate-950',
      text: 'text-rose-300',
      btnHover: 'hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 active:bg-rose-900'
    },
    emerald: {
      border: 'border-emerald-900/60 focus-within:border-emerald-500',
      bg: 'bg-slate-950',
      text: 'text-emerald-300',
      btnHover: 'hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-200 active:bg-emerald-900'
    },
    purple: {
      border: 'border-purple-900/60 focus-within:border-purple-500',
      bg: 'bg-slate-950',
      text: 'text-purple-300',
      btnHover: 'hover:bg-purple-950/80 text-purple-400 hover:text-purple-200 active:bg-purple-900'
    },
    cyan: {
      border: 'border-cyan-900/60 focus-within:border-cyan-500',
      bg: 'bg-slate-950',
      text: 'text-cyan-300',
      btnHover: 'hover:bg-cyan-950/80 text-cyan-400 hover:text-cyan-200 active:bg-cyan-900'
    },
    orange: {
      border: 'border-orange-900/60 focus-within:border-orange-500',
      bg: 'bg-slate-950',
      text: 'text-orange-300',
      btnHover: 'hover:bg-orange-950/80 text-orange-400 hover:text-orange-200 active:bg-orange-900'
    }
  }[colorScheme];

  const sizeStyles = size === 'sm' ? 'h-7 text-xs min-w-[76px]' : 'h-8 text-sm min-w-[88px]';
  const btnWidth = size === 'sm' ? 'w-6' : 'w-7';

  return (
    <div
      title={title}
      className={`inline-flex items-center justify-between rounded-lg border transition-colors select-none shrink-0 ${colorStyles.border} ${colorStyles.bg} ${sizeStyles} ${className} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {prefix && <span className="pl-1.5 pr-0.5 flex items-center shrink-0">{prefix}</span>}

      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={`h-full ${btnWidth} flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-25 disabled:cursor-not-allowed ${colorStyles.btnHover}`}
        tabIndex={-1}
        aria-label="Decrease value"
      >
        <Minus className="w-3 h-3 shrink-0" />
      </button>

      <div className="flex-1 flex items-center justify-center min-w-0 px-1">
        {showPlusSign && value > 0 && (
          <span className={`font-mono font-medium -mr-0.5 ${colorStyles.text}`}>+</span>
        )}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={`w-full min-w-0 bg-transparent text-center font-mono font-medium focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            value === 0 ? 'text-slate-500' : colorStyles.text
          }`}
        />
        {suffix && (
          <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-0.5">
            {suffix}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={`h-full ${btnWidth} flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-25 disabled:cursor-not-allowed ${colorStyles.btnHover}`}
        tabIndex={-1}
        aria-label="Increase value"
      >
        <Plus className="w-3 h-3 shrink-0" />
      </button>
    </div>
  );
};
