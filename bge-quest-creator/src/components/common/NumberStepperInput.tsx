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
  className?: string;
  size?: 'sm' | 'md';
  colorScheme?: 'indigo' | 'amber' | 'teal' | 'slate';
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
      onChange(min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  // Color styles
  const colorStyles = {
    slate: {
      border: 'border-slate-800 focus-within:border-slate-600',
      bg: 'bg-slate-950/90',
      text: 'text-slate-200',
      btnHover: 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
    },
    indigo: {
      border: 'border-indigo-900/60 focus-within:border-indigo-500',
      bg: 'bg-slate-950/90',
      text: 'text-indigo-300',
      btnHover: 'hover:bg-indigo-950/60 text-indigo-400 hover:text-indigo-200'
    },
    amber: {
      border: 'border-amber-900/60 focus-within:border-amber-500',
      bg: 'bg-slate-950/90',
      text: 'text-amber-300',
      btnHover: 'hover:bg-amber-950/60 text-amber-400 hover:text-amber-200'
    },
    teal: {
      border: 'border-teal-900/60 focus-within:border-teal-500',
      bg: 'bg-slate-950/90',
      text: 'text-teal-300',
      btnHover: 'hover:bg-teal-950/60 text-teal-400 hover:text-teal-200'
    }
  }[colorScheme];

  const sizeStyles = size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm';
  const btnSize = size === 'sm' ? 'w-5 h-full' : 'w-6 h-full';

  return (
    <div
      title={title}
      className={`inline-flex items-center rounded-lg border transition-colors overflow-hidden select-none ${colorStyles.border} ${colorStyles.bg} ${sizeStyles} ${className} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {prefix && <span className="pl-2 pr-0.5 flex items-center shrink-0">{prefix}</span>}

      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={`flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${btnSize} ${colorStyles.btnHover}`}
        tabIndex={-1}
      >
        <Minus className="w-3 h-3" />
      </button>

      <div className="relative flex items-center justify-center min-w-[28px] px-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={`w-full bg-transparent text-center font-mono font-medium focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${colorStyles.text}`}
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
        className={`flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${btnSize} ${colorStyles.btnHover}`}
        tabIndex={-1}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};
