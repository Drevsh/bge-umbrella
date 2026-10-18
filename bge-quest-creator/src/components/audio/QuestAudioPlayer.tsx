import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Trash2, Volume2, VolumeX, Sparkles, Loader2, Zap } from 'lucide-react';
import { QuestAudioTrack } from '../../types/campaign';
import { getQuestAudioBlob, triggerAudioFileDownload } from '../../utils/audioStorage';

interface QuestAudioPlayerProps {
  track: QuestAudioTrack;
  isActiveInSimulation?: boolean;
  isCurrentTab?: boolean;
  onDelete: () => void;
}

export const QuestAudioPlayer: React.FC<QuestAudioPlayerProps> = ({
  track,
  isActiveInSimulation = false,
  isCurrentTab = false,
  onDelete
}) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load blob from IndexedDB
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadAudio() {
      setIsLoading(true);
      try {
        const loadedBlob = await getQuestAudioBlob(track.blobKey);
        if (active && loadedBlob) {
          setBlob(loadedBlob);
          createdUrl = URL.createObjectURL(loadedBlob);
          setAudioUrl(createdUrl);
        }
      } catch (err) {
        console.error('Failed to load quest audio blob:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadAudio();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [track.blobKey]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error('Audio playback failed:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().catch(() => {});
  };

  const handleDownload = () => {
    if (!blob) return;
    triggerAudioFileDownload(track.fileName, blob);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) {
    return (
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading audio track...</span>
      </div>
    );
  }

  if (!audioUrl || !blob) {
    return (
      <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/40 text-xs text-rose-400 flex items-center justify-between">
        <span>Audio data missing from local storage.</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs underline hover:text-rose-300"
        >
          Remove Track
        </button>
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 bg-gradient-to-b from-slate-950 to-slate-900/90 rounded-xl border shadow-lg space-y-2.5 transition-colors ${
        isActiveInSimulation
          ? 'border-emerald-800/80 shadow-emerald-950/20'
          : isCurrentTab
          ? 'border-indigo-600/70 shadow-indigo-950/20'
          : 'border-slate-800/80'
      }`}
    >
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        muted={isMuted}
      />

      {/* Header Info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className={`p-1 rounded shrink-0 border ${
              isActiveInSimulation
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
                : 'bg-indigo-950 text-indigo-400 border-indigo-800/80'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold text-slate-200 truncate" title={track.fileName}>
            {track.fileName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Download .wav file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this audio narration?')) {
                onDelete();
              }
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 transition-colors"
            title="Delete Audio Track"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Badges: Scope, Field, Voice, Style, Simulation Active */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {/* Scope badge */}
        {track.scope === 'mutation' ? (
          <span
            className="bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-1"
            title="Mutation Narrative Override"
          >
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span>{track.variantTag || 'Mutation'}</span>
          </span>
        ) : track.scope === 'merged' ? (
          <span
            className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-1"
            title="Merged Narrative (Base + Mutation)"
          >
            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
            <span>Merged: {track.variantTag || 'Variant'}</span>
          </span>
        ) : (
          <span
            className="bg-slate-800/80 text-slate-300 border border-slate-700/80 px-1.5 py-0.5 rounded font-mono font-medium"
            title="Base Quest Narrative"
          >
            Base
          </span>
        )}

        {/* Target Field badge */}
        <span className="bg-slate-800/60 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded font-mono">
          {track.targetField === 'flavorText' ? 'Flavor' : track.targetField === 'setupInstructions' ? 'Setup' : 'Combined'}
        </span>

        {/* Voice badge */}
        <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 text-indigo-300 font-mono font-medium">
          {track.voice}
        </span>

        {/* Active Simulation Indicator */}
        {isActiveInSimulation && (
          <span
            className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 text-[9px]"
            title="Active in current simulator state"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Sim
          </span>
        )}

        {/* Current Tab Indicator */}
        {isCurrentTab && (
          <span className="text-indigo-400/90 font-mono text-[9px] px-1 py-0.5">
            (Editing Tab)
          </span>
        )}
      </div>

      {track.stylePrompt && (
        <div className="text-[10px] text-slate-500 italic truncate" title={track.stylePrompt}>
          "{track.stylePrompt}"
        </div>
      )}

      {/* Scrubber Progress Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
        />
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Restart from beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1.5 rounded-lg border transition-colors ${
            isMuted
              ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
              : 'bg-slate-800/50 text-slate-400 hover:text-white border-slate-700/60'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
