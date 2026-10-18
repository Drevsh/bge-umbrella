import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Tag, Check, AlertTriangle, ArrowRight, CornerDownLeft } from 'lucide-react';
import { StateTagInfo, QuestTagAnalysisResult } from '../../utils/tagAnalysis';

interface StateTagAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  tagAnalysis: QuestTagAnalysisResult;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const StateTagAutocompleteInput: React.FC<StateTagAutocompleteInputProps> = ({
  value,
  onChange,
  onSubmit,
  tagAnalysis,
  placeholder = 'e.g. Beacon_Lit',
  autoFocus = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter matching tags based on input
  const filteredTags = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return tagAnalysis.allTags;
    }
    return tagAnalysis.allTags.filter((t) =>
      t.tag.toLowerCase().includes(query)
    );
  }, [value, tagAnalysis]);

  // Check if current value exactly matches an existing tag
  const exactMatch = tagAnalysis.tagMap.get(value.trim());
  const isUpstream = Boolean(exactMatch?.isUpstream);
  const isCampaign = Boolean(exactMatch);
  const isCustomNew = value.trim().length > 0 && !isCampaign;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredTags.length]);

  const handleSelectTag = (tagInfo: StateTagInfo) => {
    onChange(tagInfo.tag);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        onSubmit?.();
      }
      return;
    }

    const totalOptions = filteredTags.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (totalOptions || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalOptions) % (totalOptions || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredTags.length) {
        handleSelectTag(filteredTags[highlightedIndex]);
      } else {
        setIsOpen(false);
        onSubmit?.();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input Field with Status Icon */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.replace(/\s+/g, '_'));
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 pr-8 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none transition-colors ${
            isUpstream
              ? 'border-emerald-600/70 focus:border-emerald-500'
              : isCustomNew
              ? 'border-amber-600/70 focus:border-amber-500'
              : 'border-slate-800 focus:border-indigo-500'
          }`}
        />

        {/* Status Indicator Icon on the right */}
        <div className="absolute right-2 flex items-center pointer-events-none">
          {isUpstream ? (
            <span title="Reachable from upstream quests">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </span>
          ) : isCustomNew ? (
            <span title="Unlinked state: Not produced by any upstream quest">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </span>
          ) : isCampaign ? (
            <span title="Defined in another campaign branch">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
            </span>
          ) : (
            <Tag className="w-3.5 h-3.5 text-slate-600" />
          )}
        </div>
      </div>

      {/* Status Warning / Success Pill below input */}
      {value.trim().length > 0 && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px]">
          {isUpstream ? (
            <div className="flex items-center gap-1 text-emerald-400 font-medium">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>
                Upstream State (granted by {exactMatch?.sources.map((s) => s.questCode).join(', ')})
              </span>
            </div>
          ) : isCampaign ? (
            <div className="flex items-center gap-1 text-slate-400">
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span>
                Other Branch State ({exactMatch?.sources.map((s) => s.questCode).join(', ')})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-400 font-medium bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Unlinked: Not granted by any upstream quest</span>
            </div>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 flex flex-col backdrop-blur-md">
          {/* Header */}
          <div className="p-2 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Available Campaign States</span>
            <span className="font-mono text-slate-500">
              {filteredTags.length} found
            </span>
          </div>

          {/* List Options */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 p-1">
            {filteredTags.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                <p>No matching campaign state tags.</p>
                {value.trim().length > 0 && (
                  <p className="text-[11px] text-amber-400/90 mt-1 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Press <kbd className="px-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Enter</kbd> to add as custom state.
                  </p>
                )}
              </div>
            ) : (
              filteredTags.map((t, idx) => {
                const isSelected = idx === highlightedIndex;
                return (
                  <button
                    key={t.tag}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectTag(t)}
                    className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-950/80 border border-indigo-500/60 text-slate-100'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Tag className={`w-3 h-3 ${t.isUpstream ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className="font-mono font-bold text-xs truncate">
                          {t.tag}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate pl-4.5 mt-0.5">
                        from {t.sources.map((s) => `${s.questCode} (${s.questTitle})`).join(', ')}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {t.isUpstream ? (
                        <span className="text-[9px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          Upstream
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                          Other Branch
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick instructions footer */}
          <div className="p-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 px-2.5">
            <span>Use ↑↓ to navigate</span>
            <span className="flex items-center gap-1">
              Select <CornerDownLeft className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
