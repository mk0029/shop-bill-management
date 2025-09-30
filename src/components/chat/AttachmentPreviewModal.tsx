import React, { useState, useRef } from 'react';
import { X, Download, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Attachment {
  _id?: string;
  filename: string;
  size: number;
  type: string;
  url: string;
}

interface AttachmentPreviewModalProps {
  attachment: Attachment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AttachmentPreviewModal({ attachment, isOpen, onClose }: AttachmentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Early return if no attachment
  if (!attachment) {
    return null;
  }

  const isVideo = attachment.type?.startsWith('video/') || false;
  const isImage = attachment.type?.startsWith('image/') || false;
  const isAudio = attachment.type?.startsWith('audio/') || false;
  const isPdf = attachment.type === 'application/pdf';

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleDownload = async () => {
    if (!attachment || !attachment.url) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error('Download failed');

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];

      if (reader) {
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (contentLength > 0) {
            setDownloadProgress((received / contentLength) * 100);
          }
        }
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadProgress(100);
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch {
      setError('Failed to download file');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            isFullscreen ? 'fixed inset-0 w-screen h-screen rounded-none' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-2 md:p-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate" title={attachment.filename}>
                {attachment.filename || 'Unknown File'}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {formatFileSize(attachment.size || 0)} • {attachment.type || 'Unknown type'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isDownloading && attachment.url && (
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium">{Math.round(downloadProgress)}%</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="relative">
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                <div className="text-center">
                  <div className="text-red-600 dark:text-red-400 text-lg font-medium">
                    Error loading file
                  </div>
                  <div className="text-red-500 dark:text-red-300 text-sm mt-2">
                    {error}
                  </div>
                </div>
              </div>
            )}

            {isVideo && attachment.url && (
              <div
                className={`relative ${isFullscreen ? 'h-screen' : 'max-h-[70vh]'}`}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => isPlaying && setShowControls(false)}
              >
                <video
                  ref={videoRef}
                  src={attachment.url}
                  className="w-full h-full object-contain"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={() => setError('Failed to load video')}
                />

                {/* Video Controls */}
                <AnimatePresence>
                  {showControls && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
                    >
                      {/* Progress Bar */}
                      <div
                        className="w-full bg-white/20 rounded-full h-1 mb-3 cursor-pointer"
                        onClick={handleSeek}
                      >
                        <div
                          className="bg-white h-1 rounded-full transition-all duration-100"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={togglePlayPause}
                            className="p-2 hover:bg-white/20 rounded transition-colors"
                          >
                            {isPlaying ? (
                              <Pause className="w-5 h-5 text-white" />
                            ) : (
                              <Play className="w-5 h-5 text-white" />
                            )}
                          </button>

                          <button
                            onClick={toggleMute}
                            className="p-2 hover:bg-white/20 rounded transition-colors"
                          >
                            {isMuted ? (
                              <VolumeX className="w-5 h-5 text-white" />
                            ) : (
                              <Volume2 className="w-5 h-5 text-white" />
                            )}
                          </button>

                          <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        <button
                          onClick={toggleFullscreen}
                          className="p-2 hover:bg-white/20 rounded transition-colors"
                        >
                          {isFullscreen ? (
                            <Minimize className="w-5 h-5 text-white" />
                          ) : (
                            <Maximize className="w-5 h-5 text-white" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isImage && attachment.url && (
              <div className={`relative ${isFullscreen ? 'h-screen' : 'h-[70vh]'} flex items-center justify-center bg-zinc-900`}>
                <img
                  src={attachment.url}
                  alt={attachment.filename || 'Image'}
                  className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-contain'}`}
                  onLoad={() => setIsLoading(false)}
                  onError={() => setError('Failed to load image')}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
                {/* Fullscreen Toggle Button */}
                <button
                  onClick={toggleFullscreen}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5 text-white" />
                  ) : (
                    <Maximize className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            )}

            {isPdf && attachment.url && (
              <div className={`relative ${isFullscreen ? 'h-screen' : 'max-h-[70vh]'} w-full`}>
                <iframe
                  src={attachment.url}
                  className="w-full h-full border-0"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setError('Failed to load PDF')}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            )}

            {isAudio && attachment.url && (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-md">
                  {/* Audio Player */}
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-6 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Volume2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-white truncate">
                          {attachment.filename}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          Audio File
                        </div>
                      </div>
                    </div>
                    
                    {/* HTML5 Audio Player */}
                    <audio
                      controls
                      className="w-full"
                      onLoadedMetadata={() => setIsLoading(false)}
                      onError={() => setError('Failed to load audio')}
                    >
                      <source src={attachment.url} type={attachment.type} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>

                  {/* File Info */}
                  <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    <p>{formatFileSize(attachment.size)}</p>
                    <p className="mt-1">{attachment.type}</p>
                  </div>
                </div>
              </div>
            )}

            {!isVideo && !isImage && !isPdf && !isAudio && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center mb-4">
                  <Download className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Preview not available</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                  This file type cannot be previewed in the browser.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download File
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
