"use client";

import { Play, Pause, MoreVertical, Download } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";

interface AudioPlayerProps {
  src: string;
  isSelf: boolean;
  filename?: string;
}

export function AudioPlayer({ src, isSelf, filename }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Memoize waveform heights so they don't change on re-render
  const waveformHeights = useMemo(() => {
    return Array.from({ length: 30 }, () => Math.random() * 60 + 40);
  }, []);

  useEffect(() => {
    // Reset states when retrying
    setIsLoading(true);
    setLoadProgress(0);
    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setLoadProgress(100);
      setHasError(false); // Clear error on successful load
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration;
        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100;
          setLoadProgress(Math.min(progress, 100));
        }
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setLoadProgress(100);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      setLoadProgress(0);
      setHasError(true);
      const audioEl = e.target as HTMLAudioElement;
      const errorCode = audioEl.error?.code;
      const errorMessage = audioEl.error?.message || 'Unknown error';
      console.warn(`Audio failed to load (attempt ${retryCount + 1}): ${errorMessage} (code: ${errorCode})`, { src, filename });
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [src, filename, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = src;
      link.download = filename || 'audio.webm';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMenuOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Show loading state while audio is loading
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 md:gap-3 min-w-[220px] max-w-xs">
        {/* Loading Spinner */}
        <div className={`flex-shrink-0 md:w-10 md:h-10 w-6 h-6 rounded-full flex items-center justify-center ${
          isSelf ? 'bg-white/20' : 'bg-emerald-500/20'
        }`}>
          <div className={`md:w-5 md:h-5 h-3 w-3 border-2 border-t-transparent rounded-full animate-spin ${
            isSelf ? 'border-white' : 'border-emerald-500'
          }`} />
        </div>

        {/* Progress Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative h-2 bg-white/10 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 transition-all duration-300 rounded-full ${
                isSelf ? 'bg-white' : 'bg-emerald-500'
              }`}
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <div className={`text-[9px] md:text-[11px] font-medium ${isSelf ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
            Loading... {Math.round(loadProgress)}%
          </div>
        </div>
      </div>
    );
  }

  // Show error state if audio failed to load
  if (hasError) {
    return (
      <div className={`flex flex-col gap-2 min-w-[220px] max-w-xs p-3 rounded-lg border ${
        isSelf 
          ? 'bg-red-500/20 border-red-400/30' 
          : 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700/50'
      }`}>
        <div className={`text-xs font-medium ${isSelf ? 'text-white/90' : 'text-red-600 dark:text-red-400'}`}>
          ⚠️ Audio failed to load
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetry}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isSelf
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            🔄 Retry
          </button>
          {filename && (
            <button
              onClick={handleDownload}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isSelf
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-zinc-500 hover:bg-zinc-600 text-white'
              }`}
            >
              📥 Download
            </button>
          )}
        </div>
        {retryCount > 0 && (
          <div className={`text-[10px] ${isSelf ? 'text-white/70' : 'text-red-500 dark:text-red-400'}`}>
            Retry attempt: {retryCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-3 min-w-[220px] max-w-xs">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading || hasError}
        className={`flex-shrink-0 md:w-10 md:h-10 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-md ${
          isSelf
            ? 'bg-white hover:bg-white/90 text-emerald-600 hover:scale-105'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105'
        } disabled:opacity-50 disabled:hover:scale-100`}
      >
        {isPlaying ? (
          <Pause className="md:w-5 md:h-5 h-3 w-3" fill="currentColor" />
        ) : (
          <Play className="md:w-5 md:h-5 h-3 w-3 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform/Progress Bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="relative h-5 md:h-8 flex items-center">
          {/* Background bars (waveform simulation) */}
          <div className="absolute inset-0 flex items-center gap-1">
            {waveformHeights.map((height, i) => {
              const isPassed = (i / 30) * 100 < progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-200 ${
                    isSelf
                      ? isPassed
                        ? 'bg-white shadow-sm'
                        : 'bg-white/40'
                      : isPassed
                      ? 'bg-emerald-500 shadow-sm'
                      : 'bg-zinc-300 dark:bg-zinc-500'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Time Display */}
        <div className={`text-[9px] md:text-[11px] font-medium ${isSelf ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
          {isLoading ? 'Loading...' : formatTime(isPlaying ? currentTime : duration)}
        </div>
      </div>

      {/* Three-dot Menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`md:p-1.5 hover:bg-white/20 rounded-full transition-all ${
            isSelf ? 'text-white hover:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'
          }`}
          title="Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        {/* Dropdown Menu */}
        {menuOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 min-w-[140px]">
              <button
                onClick={handleDownload}
                className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
