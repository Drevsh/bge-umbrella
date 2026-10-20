import React, { useState } from 'react';
import {
  Coins,
  Heart,
  HeartCrack,
  Layers,
  Zap,
  Sparkles,
  Clock,
  X,
  Plus
} from 'lucide-react';
import { NumberStepperInput } from '../common/NumberStepperInput';

export interface OutcomeEffectsValues {
  gold?: number;
  damage?: number;
  fatigue?: number;
  energy?: number;
  essence?: number;
  timeAdvance?: number;
}

interface OutcomeEffectsEditorProps {
  values: OutcomeEffectsValues;
  onChange: (partial: Partial<OutcomeEffectsValues>) => void;
  compact?: boolean;
}

type EffectKey = 'damage' | 'fatigue' | 'energy' | 'essence' | 'gold' | 'timeAdvance';

export const OutcomeEffectsEditor: React.FC<OutcomeEffectsEditorProps> = ({
  values,
  onChange
}) => {
  const [openKeys, setOpenKeys] = useState<Set<EffectKey>>(() => new Set());

  const isKeyVisible = (key: EffectKey): boolean => {
    const val = values[key] || 0;
    return val !== 0 || openKeys.has(key);
  };

  const handleToggleEffect = (key: EffectKey, defaultVal: number) => {
    const currentVal = values[key] || 0;
    if (isKeyVisible(key)) {
      // Remove / reset to 0
      setOpenKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      onChange({ [key]: 0 });
    } else {
      // Activate with sensible non-zero default
      setOpenKeys((prev) => new Set(prev).add(key));
      onChange({ [key]: currentVal !== 0 ? currentVal : defaultVal });
    }
  };

  const damageVal = values.damage || 0;
  const fatigueVal = values.fatigue || 0;
  const energyVal = values.energy || 0;
  const essenceVal = values.essence || 0;
  const goldVal = values.gold || 0;
  const timeVal = values.timeAdvance || 0;

  const chipDefinitions: {
    key: EffectKey;
    label: string;
    defaultVal: number;
    activeClass: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'damage',
      label: 'Damage',
      defaultVal: 1,
      activeClass: 'bg-rose-950/90 text-rose-300 border-rose-500/70',
      icon: <HeartCrack className="w-3 h-3 text-rose-400" />
    },
    {
      key: 'fatigue',
      label: 'Fatigue',
      defaultVal: 1,
      activeClass: 'bg-orange-950/90 text-orange-300 border-orange-500/70',
      icon: <Layers className="w-3 h-3 text-orange-400" />
    },
    {
      key: 'energy',
      label: 'Energy',
      defaultVal: 1,
      activeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/70',
      icon: <Zap className="w-3 h-3 text-cyan-400" />
    },
    {
      key: 'essence',
      label: 'Essence',
      defaultVal: 1,
      activeClass: 'bg-purple-950/90 text-purple-300 border-purple-500/70',
      icon: <Sparkles className="w-3 h-3 text-purple-400" />
    },
    {
      key: 'gold',
      label: 'Gold',
      defaultVal: 10,
      activeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/70',
      icon: <Coins className="w-3 h-3 text-amber-400" />
    },
    {
      key: 'timeAdvance',
      label: '+Time',
      defaultVal: 1,
      activeClass: 'bg-teal-950/90 text-teal-300 border-teal-500/70',
      icon: <Clock className="w-3 h-3 text-teal-400" />
    }
  ];

  const anyActive = chipDefinitions.some((c) => isKeyVisible(c.key));

  return (
    <div className="space-y-2">
      {/* Effect Toggle Chips Bar */}
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Rewards & Penalties (Click to add/remove)
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {chipDefinitions.map((chip) => {
            const active = isKeyVisible(chip.key);
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => handleToggleEffect(chip.key, chip.defaultVal)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer select-none ${
                  active
                    ? `${chip.activeClass} font-semibold shadow-sm`
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
                title={active ? `Remove ${chip.label}` : `Add ${chip.label} reward or penalty`}
              >
                {chip.icon}
                <span>{chip.label}</span>
                {!active && <Plus className="w-2.5 h-2.5 opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Effect Steppers */}
      {anyActive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/90">
          {/* 1. DAMAGE (Deal vs Heal/Remove) */}
          {isKeyVisible('damage') && (
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-800">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-semibold flex items-center gap-1 text-slate-200">
                  {damageVal >= 0 ? (
                    <HeartCrack className="w-3 h-3 text-rose-400 shrink-0" />
                  ) : (
                    <Heart className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                  <span>Damage</span>
                </span>
                <div className="inline-flex rounded bg-slate-950 p-0.5 border border-slate-800 w-fit">
                  <button
                    type="button"
                    onClick={() => onChange({ damage: Math.abs(damageVal) || 1 })}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold cursor-pointer ${
                      damageVal >= 0
                        ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Deal Damage to player"
                  >
                    Deal (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ damage: -Math.abs(damageVal || 1) })}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold cursor-pointer ${
                      damageVal < 0
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Heal / Remove Damage"
                  >
                    Heal (-)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <NumberStepperInput
                  value={damageVal}
                  onChange={(val) => onChange({ damage: val })}
                  min={-25}
                  max={25}
                  step={1}
                  showPlusSign={true}
                  colorScheme={damageVal >= 0 ? 'rose' : 'emerald'}
                  title="Positive = Deal Damage, Negative = Heal/Remove Damage"
                />
                <button
                  type="button"
                  onClick={() => handleToggleEffect('damage', 1)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Remove Damage"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* 2. FATIGUE CARDS (Give vs Remove) */}
          {isKeyVisible('fatigue') && (
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-800">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-semibold flex items-center gap-1 text-slate-200">
                  <Layers
                    className={`w-3 h-3 shrink-0 ${
                      fatigueVal >= 0 ? 'text-orange-400' : 'text-sky-400'
                    }`}
                  />
                  <span>Fatigue Card</span>
                </span>
                <div className="inline-flex rounded bg-slate-950 p-0.5 border border-slate-800 w-fit">
                  <button
                    type="button"
                    onClick={() => onChange({ fatigue: Math.abs(fatigueVal) || 1 })}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold cursor-pointer ${
                      fatigueVal >= 0
                        ? 'bg-orange-950 text-orange-300 border border-orange-700/60'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Give Fatigue card(s) to player"
                  >
                    Give (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ fatigue: -Math.abs(fatigueVal || 1) })}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold cursor-pointer ${
                      fatigueVal < 0
                        ? 'bg-sky-950 text-sky-300 border border-sky-700/60'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Remove Fatigue card(s) from player"
                  >
                    Remove (-)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <NumberStepperInput
                  value={fatigueVal}
                  onChange={(val) => onChange({ fatigue: val })}
                  min={-10}
                  max={10}
                  step={1}
                  showPlusSign={true}
                  colorScheme={fatigueVal >= 0 ? 'orange' : 'cyan'}
                  title="Positive = Give Fatigue Card(s), Negative = Remove Fatigue Card(s)"
                />
                <button
                  type="button"
                  onClick={() => handleToggleEffect('fatigue', 1)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Remove Fatigue effect"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* 3. ENERGY */}
          {isKeyVisible('energy') && (
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-semibold flex items-center gap-1 text-cyan-300">
                <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Energy</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <NumberStepperInput
                  value={energyVal}
                  onChange={(val) => onChange({ energy: val })}
                  min={-15}
                  max={25}
                  step={1}
                  showPlusSign={true}
                  colorScheme="cyan"
                  title="Energy granted (+) or spent/lost (-)"
                />
                <button
                  type="button"
                  onClick={() => handleToggleEffect('energy', 1)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Remove Energy"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* 4. ESSENCE */}
          {isKeyVisible('essence') && (
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-semibold flex items-center gap-1 text-purple-300">
                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                <span>Essence</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <NumberStepperInput
                  value={essenceVal}
                  onChange={(val) => onChange({ essence: val })}
                  min={-15}
                  max={25}
                  step={1}
                  showPlusSign={true}
                  colorScheme="purple"
                  title="Essence granted (+) or spent/lost (-)"
                />
                <button
                  type="button"
                  onClick={() => handleToggleEffect('essence', 1)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Remove Essence"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* 5. GOLD */}
          {isKeyVisible('gold') && (
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-semibold flex items-center gap-1 text-amber-300">
                <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Gold</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <NumberStepperInput
                  value={goldVal}
                  onChange={(val) => onChange({ gold: val })}
                  min={-999}
                  max={999}
                  step={5}
                  showPlusSign={true}
                  colorScheme="amber"
                  title="Gold granted (+) or lost (-)"
                />
                <button
                  type="button"
                  onClick={() => handleToggleEffect('gold', 10)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Remove Gold"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* 6. EXPLORATION TIME */}
          {isKeyVisible('timeAdvance') && (
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-semibold flex items-center gap-1 text-teal-300">
                <Clock className="w-3 h-3 text-teal-400 shrink-0" />
                <span>+Time</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <NumberStepperInput
                  value={timeVal}
                  onChange={(val) => onChange({ timeAdvance: val })}
                  min={0}
                  max={10}
                  step={1}
                  showPlusSign={true}
                  colorScheme="teal"
                  title="Exploration Time Track advance"
                />
                <button
                  type="button"
                  onClick={() => handleToggleEffect('timeAdvance', 1)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Remove Time Advance"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const OutcomeEffectsBadges: React.FC<{
  values: OutcomeEffectsValues;
}> = ({ values }) => {
  const timeVal = values.timeAdvance || 0;
  const damageVal = values.damage || 0;
  const fatigueVal = values.fatigue || 0;
  const energyVal = values.energy || 0;
  const essenceVal = values.essence || 0;
  const goldVal = values.gold || 0;

  return (
    <>
      {timeVal > 0 && (
        <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/80 font-bold">
          <Clock className="w-2.5 h-2.5 text-teal-400" />+{timeVal} Time
        </span>
      )}
      {damageVal !== 0 && (
        <span
          className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold ${
            damageVal > 0
              ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
          }`}
          title={damageVal > 0 ? `Deals ${damageVal} Damage` : `Removes/Heals ${Math.abs(damageVal)} Damage`}
        >
          {damageVal > 0 ? (
            <HeartCrack className="w-2.5 h-2.5 text-rose-400" />
          ) : (
            <Heart className="w-2.5 h-2.5 text-emerald-400" />
          )}
          {damageVal > 0 ? `+${damageVal}` : damageVal} Damage
        </span>
      )}
      {fatigueVal !== 0 && (
        <span
          className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold ${
            fatigueVal > 0
              ? 'bg-orange-950/80 text-orange-300 border-orange-800/80'
              : 'bg-sky-950/80 text-sky-300 border-sky-800/80'
          }`}
          title={
            fatigueVal > 0
              ? `Gives ${fatigueVal} Fatigue card(s)`
              : `Removes ${Math.abs(fatigueVal)} Fatigue card(s)`
          }
        >
          <Layers className={`w-2.5 h-2.5 ${fatigueVal > 0 ? 'text-orange-400' : 'text-sky-400'}`} />
          {fatigueVal > 0 ? `+${fatigueVal}` : fatigueVal} Fatigue
        </span>
      )}
      {energyVal !== 0 && (
        <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold">
          <Zap className="w-2.5 h-2.5 text-cyan-400" />
          {energyVal > 0 ? `+${energyVal}` : energyVal} Energy
        </span>
      )}
      {essenceVal !== 0 && (
        <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/80 font-bold">
          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
          {essenceVal > 0 ? `+${essenceVal}` : essenceVal} Essence
        </span>
      )}
      {goldVal !== 0 && (
        <span
          className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold ${
            goldVal > 0
              ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
              : 'bg-rose-950/80 text-rose-300 border-rose-800/80'
          }`}
        >
          <Coins className="w-2.5 h-2.5 text-amber-400" />
          {goldVal > 0 ? `+${goldVal}g` : `${goldVal}g`}
        </span>
      )}
    </>
  );
};
