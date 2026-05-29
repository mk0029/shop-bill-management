"use client";

import React, { useState, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import VoiceRecorder from "./VoiceRecorder";
import {
  useChatData,
  useMessageSeen,
  useFileUpload,
  useVoiceRecorder,
} from "./hooks/useChatHooks";
import type { ChatMessage } from "@/lib/chat-api";

type Props = {
  roomId: string;
  senderId: string;
  actor: "admin" | "customer";
};

export default function ChatWindow({ roomId, senderId, actor }: Props) {
  const { sendMessage, editMessage } = useChatStore();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Use custom hooks
  const { messages, bills, rooms, chatReady } = useChatData(
    roomId,
    senderId,
    actor,
  );
  const { registerMessageRef } = useMessageSeen(roomId, senderId, messages);
  const {
    attachments,
    uploadProgress,
    uploadingFiles,
    handleFileSelect,
    removeAttachment,
    uploadFileWithProgress,
    clearAttachments,
  } = useFileUpload();
  const {
    isRecording,
    recordingError,
    audioLevels,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  // Event handlers
  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message);
    setEditingId(null);
    const input = document.getElementById("message-input");
    input?.focus();
  }, []);

  const handleEdit = useCallback((message: ChatMessage) => {
    setEditingId(message._id);
    setReplyingTo(null);
    setText(message.content as string);
    setTimeout(() => {
      const input = document.getElementById("message-input");
      input?.focus();
    }, 100);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setText("");
    const input = document.getElementById("message-input");
    input?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleClearRecordingError = useCallback(() => {
    // This will be handled by the voice recorder hook
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = document.getElementById("messages-scroll");
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const onSend = async () => {
    const content = text.trim();
    if (!content && attachments.length === 0) return;

    const currentEditing = editingId;
    const currentReply = replyingTo;
    const currentAttachments = [...attachments];

    // Optimistic UI: Clear inputs immediately
    setText("");
    setEditingId(null);
    setReplyingTo(null);
    clearAttachments();

    // Focus input immediately after clearing
    const input = document.getElementById("message-input") as HTMLInputElement;
    if (input) {
      input.focus();
    }

    if (currentEditing) {
      await editMessage(roomId, currentEditing, content);

      // Auto-scroll to bottom after edit
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      // Re-focus after edit
      setTimeout(() => {
        const editInput = document.getElementById(
          "message-input",
        ) as HTMLInputElement;
        if (editInput) editInput.focus();
      }, 50);
      return;
    }

    // Optimistic UI: Create and send a temporary message
    const tempId = `temp_${Date.now()}`;
    const optimisticAttachments = currentAttachments.map((att) => ({
      _id: att.id,
      filename: att.file.name,
      size: att.file.size,
      type: att.file.type,
      url: "",
    }));

    const optimisticMessage: ChatMessage = {
      _id: tempId,
      room: { _ref: roomId },
      content,
      sender: { _ref: senderId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      attachments: optimisticAttachments,
      ...(currentReply && {
        parentMessage: {
          _id: currentReply._id,
          content: currentReply.content,
          sender: currentReply.sender,
        },
      }),
    };

    useChatStore.getState().addOptimisticMessage(roomId, optimisticMessage);

    try {
      const uploadPromises = currentAttachments.map((attachment) =>
        uploadFileWithProgress(attachment.file, attachment.id),
      );

      const results = await Promise.all(
        uploadPromises.map((p) => p.catch((e) => e)),
      );

      const uploadedAttachments = results.filter(
        (result) => !(result instanceof Error),
      );
      const failedUploads = results.filter((result) => result instanceof Error);

      if (failedUploads.length > 0) {
        console.error("Some attachments failed to upload:", failedUploads);
      }

      if (currentAttachments.length > 0 && uploadedAttachments.length === 0) {
        console.error("All attachments failed to upload. Message not sent.");
        useChatStore.getState().updateMessageStatus(roomId, tempId, "failed");
        alert("Failed to upload attachments. Please try again.");
        // Re-focus input on failure
        setTimeout(() => {
          const failInput = document.getElementById(
            "message-input",
          ) as HTMLInputElement;
          if (failInput) failInput.focus();
        }, 100);
        return;
      }

      await useChatStore.getState().finalizeOptimisticMessage(tempId, {
        content,
        attachments: uploadedAttachments,
        isCustomer: actor === "customer",
        roomId,
        senderId,
        ...(currentReply && { parentId: currentReply._id }),
      });

      // Auto-scroll to bottom after successful send
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      // Ensure input is focused after successful send
      setTimeout(() => {
        const sentInput = document.getElementById(
          "message-input",
        ) as HTMLInputElement;
        if (sentInput) sentInput.focus();
      }, 100);
    } catch (error) {
      console.error("Failed to send message:", error);
      useChatStore.getState().updateMessageStatus(roomId, tempId, "failed");
      // Re-focus input on error
      setTimeout(() => {
        const errorInput = document.getElementById(
          "message-input",
        ) as HTMLInputElement;
        if (errorInput) errorInput.focus();
      }, 100);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <MessageList
        messages={messages}
        bills={bills}
        roomId={roomId}
        senderId={senderId}
        actor={actor}
        rooms={rooms}
        uploadProgress={uploadProgress}
        registerMessageRef={registerMessageRef}
        onReply={handleReply}
        onEdit={handleEdit}
        initialLoading={!chatReady}
      />

      <VoiceRecorder
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        audioLevels={audioLevels}
        recordingError={recordingError}
        onStopRecording={stopRecording}
        onCancelRecording={cancelRecording}
        onClearError={handleClearRecordingError}
      />

      <MessageInput
        text={text}
        setText={setText}
        attachments={attachments}
        onFileSelect={handleFileSelect}
        onRemoveAttachment={removeAttachment}
        onSend={onSend}
        onStartRecording={startRecording}
        uploadProgress={uploadProgress}
        uploadingFiles={uploadingFiles}
        editingId={editingId}
        replyingTo={replyingTo}
        onCancelEdit={handleCancelEdit}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
}
