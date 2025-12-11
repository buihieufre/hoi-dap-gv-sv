import { v2 as cloudinary } from "cloudinary";

/**
 * Initialize Cloudinary with environment variables
 */
export function initCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dmhy697at",
    api_key: process.env.CLOUDINARY_API_KEY || "236545828234791",
    api_secret:
      process.env.CLOUDINARY_API_SECRET || "7nAieok8TGDRcvq2wf1yWM9u3TM",
  });
}

/**
 * Upload image to Cloudinary
 * @param buffer - Image buffer
 * @param folder - Optional folder name in Cloudinary
 * @returns Promise with secure_url
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  folder: string = "questions"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result?.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(new Error("Upload failed: No URL returned"));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Get the appropriate resource type for Cloudinary upload based on MIME type
 * @param mimeType - MIME type of the file
 * @returns Cloudinary resource type
 */
function getCloudinaryResourceType(mimeType?: string): "image" | "video" | "raw" {
  if (!mimeType) return "raw";
  
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  // For PDFs, documents, and all other files, use "raw"
  return "raw";
}

/**
 * Upload any file to Cloudinary (images, PDFs, documents, etc.)
 * @param dataUri - Data URI string (base64 with mime type)
 * @param folder - Optional folder name in Cloudinary
 * @param mimeType - Optional MIME type to determine resource type
 * @returns Promise with upload result containing secure_url
 */
export async function uploadToCloudinary(
  dataUri: string,
  folder: string = "resources",
  mimeType?: string
): Promise<{ secure_url: string; public_id: string; bytes: number }> {
  // Extract MIME type from dataUri if not provided
  let effectiveMimeType = mimeType;
  if (!effectiveMimeType && dataUri.startsWith("data:")) {
    const match = dataUri.match(/^data:([^;]+);/);
    if (match) {
      effectiveMimeType = match[1];
    }
  }
  
  const resourceType = getCloudinaryResourceType(effectiveMimeType);
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      dataUri,
      {
        folder: folder,
        resource_type: resourceType, // Use appropriate resource type
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            bytes: result.bytes,
          });
        } else {
          reject(new Error("Upload failed: No result returned"));
        }
      }
    );
  });
}

/**
 * Delete file from Cloudinary
 * @param url - Cloudinary URL of the file to delete
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
  // Extract public_id and resource_type from URL
  // URL formats:
  // - Image: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{ext}
  // - Raw: https://res.cloudinary.com/{cloud_name}/raw/upload/v{version}/{folder}/{public_id}.{ext}
  // - Video: https://res.cloudinary.com/{cloud_name}/video/upload/v{version}/{folder}/{public_id}.{ext}
  
  // Extract resource type from URL
  let resourceType: "image" | "raw" | "video" = "image";
  if (url.includes("/raw/upload/")) {
    resourceType = "raw";
  } else if (url.includes("/video/upload/")) {
    resourceType = "video";
  }
  
  const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
  const match = url.match(regex);
  
  if (!match) {
    console.warn("[Cloudinary] Could not extract public_id from URL:", url);
    return;
  }
  
  const publicId = match[1];
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Initialize on module load
initCloudinary();
