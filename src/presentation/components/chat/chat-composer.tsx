"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { OutputData } from "@editorjs/editorjs";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";

const EditorJs = dynamic(
  () =>
    import("@/presentation/components/editor/editor-js").then((mod) => ({
      default: mod.EditorJs,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <SystemPulseLogo className="w-4 h-4 mx-auto" />
        <div className="bg-white p-4 min-h-[140px]">
          <div className="text-gray-400 text-sm">Đang tải editor...</div>
        </div>
      </div>
    ),
  }
);

export function ChatComposer({
  onSend,
}: {
  onSend: (data: OutputData) => void;
}) {
  const [data, setData] = useState<OutputData | null>(null);
  const [key, setKey] = useState(0);
  const handleSend = () => {
    if (!data || !data.blocks || data.blocks.length === 0) return;
    onSend(data);
    setData(null);
    setKey((k) => k + 1);
  };

  return (
    <div className="space-y-3">
      <div className="border border-gray-200 rounded-lg overflow-visible">
        <EditorJs
          key={key}
          data={data || undefined}
          onChange={(d) => setData(d)}
          placeholder="Nhập tin nhắn..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
          disabled={!data || !data.blocks || data.blocks.length === 0}
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
