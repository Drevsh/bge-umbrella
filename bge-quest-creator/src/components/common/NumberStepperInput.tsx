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
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={`w-full min-w-0 bg-transparent text-center font-mono font-medium focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${colorStyles.text}`}
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
