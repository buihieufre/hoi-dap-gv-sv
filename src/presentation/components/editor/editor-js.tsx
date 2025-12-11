"use client";

import { useEffect, useRef, useState } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import CodeTool from "@editorjs/code";
import InlineCode from "@editorjs/inline-code";
import LinkTool from "@editorjs/link";
import ImageTool from "@editorjs/image";
import Paragraph from "@editorjs/paragraph";

interface EditorJsProps {
  data?: OutputData;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  className?: string;
}

export function EditorJs({
  data,
  onChange,
  placeholder = "Nhập nội dung của bạn...",
  className = "",
}: EditorJsProps) {
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const initialDataRef = useRef<OutputData | undefined>(data);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !holderRef.current || isInitializedRef.current) return;

    // Initialize Editor.js only once
    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder,
      data: initialDataRef.current || undefined,
      tools: {
        header: {
          class: Header as any,
          config: {
            levels: [1, 2, 3],
            defaultLevel: 2,
          },
        },
        list: {
          class: List,
          inlineToolbar: true,
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
        },
        code: CodeTool,
        inlineCode: {
          class: InlineCode,
          shortcut: "CMD+SHIFT+M",
        },
        linkTool: {
          class: LinkTool,
          config: {
            endpoint: "/api/link-preview", // Optional: for link preview
          },
        },
        image: {
          class: ImageTool,
          config: {
            endpoints: {
              byFile: "/api/upload", // Upload endpoint
            },
            field: "file",
            types: "image/*",
            captionPlaceholder: "Nhập mô tả ảnh (tùy chọn)",
          },
        },
        paragraph: {
          class: Paragraph as any,
          inlineToolbar: true,
        },
      },
      onChange: async () => {
        if (editor) {
          try {
            const outputData = await editor.save();
            onChange(outputData);
          } catch (error) {
            console.error("Error saving editor data:", error);
          }
        }
      },
    });

    editorRef.current = editor;
    isInitializedRef.current = true;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [isMounted]); // Do not re-init on each render to avoid losing focus

  if (!isMounted) {
    return (
      <div
        className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}
        suppressHydrationWarning
      >
        <div className="bg-white p-4 min-h-[200px]">
          <div className="text-gray-400 text-sm">{placeholder}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent ${className}`}
      style={{ position: "relative", overflow: "visible", zIndex: 1 }}
    >
      <div
        ref={holderRef}
        className="bg-white p-8 min-h-[200px] prose prose-sm max-w-none"
        id="editorjs-container"
        style={{ overflow: "visible", position: "relative", zIndex: 1 }}
      />
    </div>
  );
}
