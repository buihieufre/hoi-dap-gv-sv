import { OutputData } from "@editorjs/editorjs";

/**
 * Extract images from Editor.js content
 */
export function extractImagesFromContent(
  content: string | OutputData
): string[] {
  let contentData: OutputData;

  if (typeof content === "string") {
    try {
      contentData = JSON.parse(content);
    } catch (error) {
      // Not JSON, return empty array
      return [];
    }
  } else {
    contentData = content;
  }

  if (
    !contentData ||
    !contentData.blocks ||
    !Array.isArray(contentData.blocks)
  ) {
    return [];
  }

  const images: string[] = [];

  contentData.blocks.forEach((block) => {
    if (block.type === "image") {
      const imageUrl = block.data.file?.url || block.data.url;
      if (imageUrl) {
        images.push(imageUrl);
      }
    }
  });

  return images;
}

/**
 * Extract text preview from Editor.js content
 * @param content - Editor.js JSON content
 * @param maxLength - Maximum length of preview text
 * @returns Preview text
 */
export function extractTextPreview(
  content: string | OutputData,
  maxLength: number = 150
): string {
  let contentData: OutputData;

  if (typeof content === "string") {
    try {
      contentData = JSON.parse(content);
    } catch (error) {
      // If not JSON, might be HTML - extract text from HTML
      const text = content.replace(/<[^>]*>/g, "").trim();
      return text.length > maxLength
        ? text.substring(0, maxLength) + "..."
        : text;
    }
  } else {
    contentData = content;
  }

  if (
    !contentData ||
    !contentData.blocks ||
    !Array.isArray(contentData.blocks)
  ) {
    return "";
  }

  const textParts: string[] = [];

  // Extract text from first few blocks
  for (const block of contentData.blocks.slice(0, 3)) {
    if (block.type === "paragraph") {
      // Remove HTML tags from paragraph text
      const text = block.data.text.replace(/<[^>]*>/g, "").trim();
      if (text) {
        textParts.push(text);
      }
    } else if (block.type === "header") {
      const text = block.data.text.trim();
      if (text) {
        textParts.push(text);
      }
    } else if (block.type === "list") {
      // Get first item from list
      const firstItem = block.data.items[0];
      if (firstItem) {
        const text = firstItem.replace(/<[^>]*>/g, "").trim();
        if (text) {
          textParts.push(text);
        }
      }
    }

    // Stop if we have enough text
    if (textParts.join(" ").length >= maxLength) {
      break;
    }
  }

  const preview = textParts.join(" ").trim();
  return preview.length > maxLength
    ? preview.substring(0, maxLength) + "..."
    : preview;
}

/**
 * Extract all text content from Editor.js JSON for search purposes
 * @param content - Editor.js JSON content (string or object)
 * @returns All text content concatenated
 */
export function extractAllTextFromContent(
  content: string | OutputData
): string {
  let contentData: OutputData;

  if (typeof content === "string") {
    try {
      contentData = JSON.parse(content);
    } catch (error) {
      // If not JSON, might be HTML - extract text from HTML
      return content.replace(/<[^>]*>/g, "").trim();
    }
  } else {
    contentData = content;
  }

  if (
    !contentData ||
    !contentData.blocks ||
    !Array.isArray(contentData.blocks)
  ) {
    return "";
  }

  const textParts: string[] = [];

  // Extract text from all blocks
  for (const block of contentData.blocks) {
    if (block.type === "paragraph") {
      // Remove HTML tags from paragraph text
      const text = block.data.text.replace(/<[^>]*>/g, "").trim();
      if (text) {
        textParts.push(text);
      }
    } else if (block.type === "header") {
      const text = block.data.text.trim();
      if (text) {
        textParts.push(text);
      }
    } else if (block.type === "list") {
      // Extract text from all list items
      for (const item of block.data.items) {
        let itemText: string;
        if (typeof item === "string") {
          itemText = item;
        } else if (item && typeof item === "object" && item.content) {
          itemText = item.content;
        } else {
          itemText = String(item);
        }
        const text = itemText.replace(/<[^>]*>/g, "").trim();
        if (text) {
          textParts.push(text);
        }
      }
    } else if (block.type === "quote") {
      const text = block.data.text.replace(/<[^>]*>/g, "").trim();
      if (text) {
        textParts.push(text);
      }
    } else if (block.type === "code") {
      const text = block.data.code.trim();
      if (text) {
        textParts.push(text);
      }
    }
  }

  return textParts.join(" ").trim();
}
