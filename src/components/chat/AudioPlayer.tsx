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
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Memoize waveform heights so they don't change on re-render
  const waveformHeights = useMemo(() => {
    return Array.from({ length: 30 }, () => Math.random() * 60 + 40);
  }, []);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Audio failed to load');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [src]);

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

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-xs">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isSelf
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        } disabled:opacity-50`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform/Progress Bar */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="relative h-6 flex items-center">
          {/* Background bars (waveform simulation) */}
          <div className="absolute inset-0 flex items-center gap-0.5">
            {waveformHeights.map((height, i) => {
              const isPassed = (i / 30) * 100 < progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isSelf
                      ? isPassed
                        ? 'bg-white'
                        : 'bg-white/30'
                      : isPassed
                      ? 'bg-emerald-600'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Time Display */}
        <div className={`text-[10px] ${isSelf ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {isLoading ? 'Loading...' : formatTime(isPlaying ? currentTime : duration)}
        </div>
      </div>

      {/* Three-dot Menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`p-1 hover:bg-white/10 rounded transition-colors ${
            isSelf ? 'text-white/80' : 'text-zinc-600 dark:text-zinc-400'
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
