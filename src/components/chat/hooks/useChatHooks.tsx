"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/lib/chat-api";

type LiteBill = {
  _id: string;
  billNumber?: string;
  totalAmount?: number;
  createdAt: string;
  paymentStatus?: string;
  status?: string;
  paidAmount?: number;
  balanceAmount?: number;
};

export function useChatData(
  roomId: string,
  senderId: string,
  actor: "admin" | "customer",
) {
  const { messagesByRoomId, fetchMessages, markRead, rooms } = useChatStore();
  const [bills, setBills] = useState<LiteBill[]>([]);

  const messages = useMemo(
    () => messagesByRoomId[roomId] || [],
    [messagesByRoomId, roomId],
  );

  const customerId = useMemo(() => {
    const r = (rooms || []).find((x) => x._id === roomId);
    return r?.customer?._id;
  }, [rooms, roomId]);

  useEffect(() => {
    fetchMessages(roomId)
      .then(() => {
        markRead(roomId, actor);
      })
      .catch(() => {});
  }, [roomId, fetchMessages, markRead, actor]);

  useEffect(() => {
    let alive = true;
    if (!customerId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/bill-book/user/${encodeURIComponent(customerId)}/list`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!alive) return;
        if (json?.success && Array.isArray(json.data)) {
          const list: LiteBill[] = (
            json.data as Array<Record<string, unknown>>
          ).map((b) => {
            const paymentStatusUnknown = (b as { paymentStatus?: unknown })
              .paymentStatus;
            const statusUnknown = (b as { status?: unknown }).status;
            return {
              _id: String(b._id as string),
              billNumber: b.billNumber as string | undefined,
              totalAmount: Number(
                (b.totalAmount as number | string | undefined) ?? 0,
              ),
              createdAt: String(b.createdAt as string),
              paymentStatus:
                typeof paymentStatusUnknown === "string"
                  ? paymentStatusUnknown
                  : undefined,
              status:
                typeof statusUnknown === "string" ? statusUnknown : undefined,
              paidAmount:
                typeof (b as { paidAmount?: unknown }).paidAmount === "number"
                  ? ((b as { paidAmount?: unknown }).paidAmount as number)
                  : Number(
                      ((b as { paidAmount?: unknown }).paidAmount as string) ||
                        0,
                    ),
              balanceAmount:
                typeof (b as { balanceAmount?: unknown }).balanceAmount ===
                "number"
                  ? ((b as { balanceAmount?: unknown }).balanceAmount as number)
                  : Number(
                      ((b as { balanceAmount?: unknown })
                        .balanceAmount as string) || 0,
                    ),
            };
          });
          setBills(list);
        } else {
          setBills([]);
        }
      } catch {
        setBills([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  return { messages, bills, customerId, rooms };
}

export function useScrollToBottom(listRef: React.RefObject<HTMLDivElement>) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const scrollContainer = listRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [listRef]);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [listRef]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  return { showScrollButton, scrollToBottom, bottomRef };
}

export function useMessageSeen(
  roomId: string,
  senderId: string,
  messages: ChatMessage[],
) {
  const [seenQueue, setSeenQueue] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const { markMessageSeen } = useChatStore();

  const processSeenQueue = useCallback(async () => {
    if (seenQueue.size === 0) return;

    const messagesToProcess = Array.from(seenQueue);
    setSeenQueue(new Set());

    for (const messageId of messagesToProcess) {
      try {
        await markMessageSeen(roomId, messageId);
      } catch (error) {
        console.error("Failed to mark message as seen:", messageId, error);
      }
    }
  }, [seenQueue, roomId, markMessageSeen]);

  useEffect(() => {
    const interval = setInterval(processSeenQueue, 2000);
    return () => clearInterval(interval);
  }, [processSeenQueue]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const messageId = entry.target.getAttribute("data-message-id");
            if (messageId) {
              const message = messages.find((m) => m._id === messageId);
              if (message) {
                const getMsgSenderId = (m: ChatMessage): string | undefined => {
                  if (!m?.sender) return undefined;
                  const s = m.sender as { _id?: string; _ref?: string };
                  return s._id ?? s._ref;
                };
                const isSelf = getMsgSenderId(message) === senderId;
                if (!isSelf && message.status !== "seen") {
                  setSeenQueue((prev) => new Set([...prev, messageId]));
                }
              }
            }
          }
        });
      },
      {
        threshold: [0.6],
        rootMargin: "0px 0px -20px 0px",
      },
    );

    messageRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messages, senderId, roomId]);

  const registerMessageRef = useCallback(
    (messageId: string, element: HTMLElement | null) => {
      if (element) {
        messageRefs.current.set(messageId, element);
        if (observerRef.current) {
          observerRef.current.observe(element);
        }
      } else {
        messageRefs.current.delete(messageId);
      }
    },
    [],
  );

  return { registerMessageRef };
}

export function useFileUpload() {
  const [attachments, setAttachments] = useState<
    Array<{ file: File; preview?: string; id: string }>
  >([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const newAttachments = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const uploadFileWithProgress = useCallback(
    (
      file: File,
      attachmentId: string,
    ): Promise<{
      _id: string;
      filename: string;
      size: number;
      type: string;
      url: string;
    }> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress((prev) => ({
              ...prev,
              [attachmentId]: percentComplete,
            }));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (!result || !result.assetId || !result.url) {
                reject(new Error(`Invalid upload response for ${file.name}`));
              } else {
                resolve({
                  _id: result.assetId,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  url: result.url,
                });
              }
            } catch (_error) {
              reject(new Error(`Failed to parse response for ${file.name}`));
            }
          } else {
            reject(
              new Error(`Upload failed for ${file.name}: ${xhr.statusText}`),
            );
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error(`Network error while uploading ${file.name}`));
        });

        xhr.open("POST", "/api/upload/chat");
        xhr.send(formData);
      });
    },
    [],
  );

  const clearAttachments = useCallback(() => {
    attachments.forEach((attachment) => {
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
    });
    setAttachments([]);
    setUploadProgress({});
    setUploadingFiles(new Set());
  }, [attachments]);

  return {
    attachments,
    uploadProgress,
    uploadingFiles,
    handleFileSelect,
    removeAttachment,
    uploadFileWithProgress,
    clearAttachments,
  };
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(30).fill(0));
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldSendRecordingRef = useRef<boolean>(true);

  const attachAudioBlobAsFile = useCallback(
    async (
      blob: Blob,
      mime: string,
      roomId: string,
      senderId: string,
      actor: "admin" | "customer",
      sendMessage: any,
    ) => {
      if (!shouldSendRecordingRef.current) {
        console.log("Recording cancelled, not sending");
        shouldSendRecordingRef.current = true;
        return;
      }

      try {
        const filename = `voice-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
        const file = new File([blob], filename, {
          type: mime || blob.type || "audio/webm",
        });
        const attachmentId = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        setUploadingFiles(new Set([attachmentId]));
        setUploadProgress({ [attachmentId]: 1 });

        try {
          const formData = new FormData();
          formData.append("file", file);

          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              setUploadProgress((prev) => ({
                ...prev,
                [attachmentId]: percentComplete,
              }));
            }
          });

          const uploadPromise = new Promise<{
            _id: string;
            filename: string;
            size: number;
            type: string;
            url: string;
          }>((resolve, reject) => {
            xhr.addEventListener("load", () => {
              if (xhr.status === 200) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  if (!result || !result.assetId || !result.url) {
                    reject(new Error(`Invalid upload response`));
                  } else {
                    resolve({
                      _id: result.assetId,
                      filename: file.name,
                      size: file.size,
                      type: file.type,
                      url: result.url,
                    });
                  }
                } catch {
                  reject(new Error(`Failed to parse response`));
                }
              } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            });

            xhr.addEventListener("error", () => {
              reject(new Error(`Network error while uploading`));
            });

            xhr.open("POST", "/api/upload/chat");
            xhr.send(formData);
          });

          const result = await uploadPromise;

          setUploadingFiles(new Set());
          setUploadProgress({});

          await sendMessage(
            roomId,
            "",
            senderId,
            actor === "customer",
            undefined,
            undefined,
            [result],
          );

          setTimeout(() => {
            const input = document.getElementById(
              "message-input",
            ) as HTMLInputElement;
            input?.focus();
          }, 50);
        } catch (error) {
          console.error("Failed to send voice message:", error);
          setUploadingFiles(new Set());
          setUploadProgress({});
        }
      } catch (e) {
        console.error("Failed to process audio file", e);
      }
    },
    [],
  );

  const startRecording = useCallback(async () => {
    setRecordingError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setRecordingError("Audio recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateWaveform = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          const levels = Array.from({ length: 30 }, (_, i) => {
            const index = Math.floor((i / 30) * dataArray.length);
            return dataArray[index] / 255;
          });
          setAudioLevels(levels);
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      }

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      let mimeType = "";
      const MR: typeof MediaRecorder | undefined =
        typeof MediaRecorder !== "undefined" ? MediaRecorder : undefined;
      for (const m of mimeCandidates) {
        if (MR?.isTypeSupported && MR.isTypeSupported(m)) {
          mimeType = m;
          break;
        }
      }
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        try {
          const blob = new Blob(recordingChunksRef.current, {
            type: mimeType || "audio/webm",
          });
          attachAudioBlobAsFile(
            blob,
            mimeType || "audio/webm",
            "",
            "",
            "admin",
            () => {},
          );
        } finally {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          analyserRef.current = null;
          setAudioLevels(Array(30).fill(0));
          try {
            stream.getTracks().forEach((t) => t.stop());
          } catch {}
          setIsRecording(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= 240) {
            stopRecording();
            return 240;
          }
          return newDuration;
        });
      }, 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setRecordingError(message);
      setIsRecording(false);
    }
  }, [attachAudioBlobAsFile]);

  const stopRecording = useCallback(() => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const r = mediaRecorderRef.current;
      if (r && r.state !== "inactive") {
        r.stop();
      } else {
        setIsRecording(false);
        setRecordingDuration(0);
      }
    } catch {
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    shouldSendRecordingRef.current = false;
    stopRecording();
    recordingChunksRef.current = [];
    setRecordingDuration(0);
    setAudioLevels(Array(30).fill(0));
  }, [stopRecording]);

  return {
    isRecording,
    recordingError,
    audioLevels,
    recordingDuration,
    uploadingFiles,
    uploadProgress,
    startRecording,
    stopRecording,
    cancelRecording,
    mediaRecorderRef,
    recordingChunksRef,
  };
}
