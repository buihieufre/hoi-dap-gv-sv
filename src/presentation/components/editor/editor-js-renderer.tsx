"use client";

import React from "react";
import { OutputData } from "@editorjs/editorjs";

interface EditorJsRendererProps {
  data: OutputData;
  className?: string;
}

export function EditorJsRenderer({
  data,
  className = "",
}: EditorJsRendererProps) {
  const renderBlock = (block: any) => {
    switch (block.type) {
      case "paragraph":
        return (
          <p
            key={block.id}
            className="mb-4 text-gray-700"
            dangerouslySetInnerHTML={{ __html: block.data.text }}
          />
        );

      case "header":
        const level = block.data.level || 1;
        const headerClasses = {
          1: "text-3xl font-bold mb-4 mt-6 text-gray-900",
          2: "text-2xl font-bold mb-3 mt-5 text-gray-900",
          3: "text-xl font-bold mb-2 mt-4 text-gray-900",
        };
        const className = headerClasses[level as keyof typeof headerClasses];

        if (level === 1) {
          return (
            <h1 key={block.id} className={className}>
              {block.data.text}
            </h1>
          );
        } else if (level === 2) {
          return (
            <h2 key={block.id} className={className}>
              {block.data.text}
            </h2>
          );
        } else {
          return (
            <h3 key={block.id} className={className}>
              {block.data.text}
            </h3>
          );
        }

      case "list":
        const ListTag = block.data.style === "ordered" ? "ol" : "ul";
        const listClasses =
          block.data.style === "ordered"
            ? "list-decimal pl-6 mb-4 space-y-1"
            : "list-disc pl-6 mb-4 space-y-1";
        
        const renderListItem = (item: any, index: number): React.ReactNode => {
          // Handle both string and object formats
          let content: string;
          if (typeof item === "string") {
            content = item;
          } else if (item && typeof item === "object" && item.content) {
            content = item.content;
          } else {
            // Fallback: try to stringify if it's an object
            content = String(item);
          }

          // Check if item has nested items (nested list)
          const nestedItems = item && typeof item === "object" && item.items && Array.isArray(item.items) && item.items.length > 0;

          return (
            <li key={index} className="text-gray-700">
              <span dangerouslySetInnerHTML={{ __html: content }} />
              {nestedItems && (
                <ListTag className={listClasses} style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                  {item.items.map((nestedItem: any, nestedIndex: number) =>
                    renderListItem(nestedItem, nestedIndex)
                  )}
                </ListTag>
              )}
            </li>
          );
        };

        return (
          <ListTag key={block.id} className={listClasses}>
            {block.data.items.map((item: any, index: number) =>
              renderListItem(item, index)
            )}
          </ListTag>
        );

      case "quote":
        return (
          <blockquote
            key={block.id}
            className="border-l-4 border-indigo-500 pl-4 py-2 my-4 italic text-gray-600 bg-gray-50"
          >
            <p dangerouslySetInnerHTML={{ __html: block.data.text }} />
            {block.data.caption && (
              <cite className="block mt-2 text-sm text-gray-500 not-italic">
                — {block.data.caption}
              </cite>
            )}
          </blockquote>
        );

      case "code":
        return (
          <div key={block.id} className="my-4">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm font-mono">{block.data.code}</code>
            </pre>
          </div>
        );

      case "image":
        return (
          <figure key={block.id} className="my-6">
            <img
              src={block.data.file?.url || block.data.url}
              alt={block.data.caption || ""}
              className="max-w-full h-auto rounded-lg"
            />
            {block.data.caption && (
              <figcaption className="mt-2 text-sm text-gray-500 text-center">
                {block.data.caption}
              </figcaption>
            )}
          </figure>
        );

      case "linkTool":
        return (
          <div
            key={block.id}
            className="my-4 border border-gray-200 rounded-lg p-4"
          >
            {block.data.link && (
              <a
                href={block.data.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                {block.data.meta?.title || block.data.link}
              </a>
            )}
            {block.data.meta?.description && (
              <p className="text-sm text-gray-600 mt-2">
                {block.data.meta.description}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!data || !data.blocks || data.blocks.length === 0) {
    return (
      <div className={`text-gray-400 ${className}`}>Không có nội dung</div>
    );
  }

  return (
    <div className={`editorjs-content ${className}`}>
      {data.blocks.map((block) => renderBlock(block))}
    </div>
  );
}
