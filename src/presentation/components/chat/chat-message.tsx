"use client";

import { OutputData } from "@editorjs/editorjs";
import { EditorJsRenderer } from "@/presentation/components/editor/editor-js-renderer";

export interface ChatMessage {
  id: string;
  content: string; // stored JSON string of OutputData
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
  createdAt: string;
}

export function ChatMessageBubble({
  message,
  currentUserId,
}: {
  message: ChatMessage;
  currentUserId?: string;
}) {
  const isMine = currentUserId === message.sender.id;
  let data: OutputData | null = null;
  try {
    data = JSON.parse(message.content);
  } catch {
    // fallback
  }

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm border ${
          isMine
            ? "bg-indigo-50 border-indigo-100 text-gray-900"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <div className="text-xs text-gray-500 mb-1">
          {message.sender.fullName} •{" "}
          {new Date(message.createdAt).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          })}
        </div>
        <div className="prose prose-sm max-w-none">
          {data && (data as any).blocks ? (
            <EditorJsRenderer data={data} />
          ) : (
            <div>{message.content}</div>
          )}
        </div>
      </div>
    </div>
  );
}
