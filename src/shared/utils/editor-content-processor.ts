import { OutputData } from "@editorjs/editorjs";
import { readFile } from "fs/promises";
import { join } from "path";
import { uploadImageToCloudinary } from "./cloudinary";

/**
 * Check if a URL is a base64 data URL
 */
function isBase64DataUrl(url: string): boolean {
  return url.startsWith("data:image/");
}

/**
 * Check if a URL is a local upload URL
 */
function isLocalUploadUrl(url: string): boolean {
  return url.startsWith("/uploads/");
}

/**
 * Check if a URL is already a Cloudinary URL
 */
function isCloudinaryUrl(url: string): boolean {
  return url.includes("cloudinary.com") || url.includes("res.cloudinary.com");
}

/**
 * Convert base64 data URL to buffer
 */
function base64ToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.split(",")[1];
  return Buffer.from(base64Data, "base64");
}

/**
 * Read local file from filesystem
 */
async function readLocalFile(url: string): Promise<Buffer> {
  // Remove leading slash and read from public directory
  const filePath = url.startsWith("/") ? url.substring(1) : url;
  const fullPath = join(process.cwd(), "public", filePath);
  return await readFile(fullPath);
}

/**
 * Upload image from URL (base64 or local) to Cloudinary
 */
async function uploadImageFromUrl(
  url: string,
  folder: string = "questions"
): Promise<string> {
  // If already Cloudinary URL, return as is
  if (isCloudinaryUrl(url)) {
    return url;
  }

  let buffer: Buffer;

  if (isBase64DataUrl(url)) {
    // Convert base64 to buffer
    buffer = base64ToBuffer(url);
  } else if (isLocalUploadUrl(url)) {
    // Read from local filesystem
    buffer = await readLocalFile(url);
  } else {
    // External URL or unknown format, try to fetch
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`Error fetching image from ${url}:`, error);
      // Return original URL if fetch fails
      return url;
    }
  }

  // Upload to Cloudinary
  return await uploadImageToCloudinary(buffer, folder);
}

/**
 * Process Editor.js content and upload images to Cloudinary
 * @param content - Editor.js JSON content (as string or object)
 * @param folder - Cloudinary folder name
 * @returns Processed content with Cloudinary URLs
 */
export async function processEditorContent(
  content: string | OutputData,
  folder: string = "questions"
): Promise<string> {
  // Parse content if it's a string
  let contentData: OutputData;
  if (typeof content === "string") {
    try {
      contentData = JSON.parse(content);
    } catch (error) {
      // If not JSON, return as is (might be HTML from old format)
      return content;
    }
  } else {
    contentData = content;
  }

  // Check if it's valid Editor.js format
  if (
    !contentData ||
    !contentData.blocks ||
    !Array.isArray(contentData.blocks)
  ) {
    return typeof content === "string" ? content : JSON.stringify(content);
  }

  // Process each block
  const processedBlocks = await Promise.all(
    contentData.blocks.map(async (block) => {
      // Only process image blocks
      if (block.type === "image") {
        const imageData = block.data;
        let imageUrl = imageData.file?.url || imageData.url;

        if (imageUrl) {
          try {
            // Upload to Cloudinary if needed
            const cloudinaryUrl = await uploadImageFromUrl(imageUrl, folder);

            // Update the URL in the block
            if (imageData.file) {
              imageData.file.url = cloudinaryUrl;
            } else {
              imageData.url = cloudinaryUrl;
            }
          } catch (error) {
            console.error(`Error uploading image ${imageUrl}:`, error);
            // Keep original URL if upload fails
          }
        }
      }

      return block;
    })
  );

  // Return updated content as JSON string
  return JSON.stringify({
    ...contentData,
    blocks: processedBlocks,
  });
}
