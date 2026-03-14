import { GoogleGenAI, GenerateContentResponse, VideoGenerationReferenceType, VideoGenerationReferenceImage, HarmCategory, HarmBlockThreshold } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export const genAI = new GoogleGenAI({ apiKey: API_KEY });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export async function generateImages(
  prompt: string,
  referenceImageBase64: string,
  mimeType: string,
  count: number = 1
) {
  const model = "gemini-3.1-flash-image-preview";
  
  const response = await genAI.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: referenceImageBase64,
            mimeType: mimeType,
          },
        },
        {
          text: `Giữ nguyên nhân vật trong ảnh này. Thay đổi trang phục và bối cảnh theo mô tả sau: ${prompt}. Tạo ${count} ảnh khác nhau.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
      safetySettings,
    },
  });

  if (response.candidates?.[0]?.finishReason === 'SAFETY') {
    const ratings = response.candidates[0].safetyRatings || [];
    console.log("Safety Ratings:", ratings);
    const blockedCategories = ratings
      .filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
      .map(r => r.category)
      .join(", ");
    
    const msg = blockedCategories 
      ? `Nội dung bị hạn chế do chính sách an toàn (${blockedCategories}). Hãy thử mô tả nhẹ nhàng hơn.`
      : "Nội dung có thể bị hạn chế bởi chính sách Google. Hãy thử mô tả nhẹ nhàng hơn hoặc thay đổi chi tiết.";
    throw new Error(msg);
  }

  const images: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push(`data:image/png;base64,${part.inlineData.data}`);
      }
    }
  }
  
  return images;
}

export async function generateVideo(
  prompt: string,
  images: { base64: string, mimeType: string }[],
  isVertical: boolean = false,
  duration: '5s' | '8s' = '5s'
) {
  const apiKey = process.env.API_KEY || API_KEY;
  const veoAI = new GoogleGenAI({ apiKey: apiKey });
  
  // If multiple images are provided, we use veo-3.1-generate-preview (supports up to 3)
  // Note: Multiple refs require 16:9 and 720p
  const useMultipleRefs = images.length > 1;
  const model = useMultipleRefs ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
  
  const referenceImagesPayload: VideoGenerationReferenceImage[] = [];
  if (useMultipleRefs) {
    for (const img of images.slice(0, 3)) {
      referenceImagesPayload.push({
        image: {
          imageBytes: img.base64,
          mimeType: img.mimeType,
        },
        referenceType: VideoGenerationReferenceType.ASSET,
      });
    }
  }

  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: useMultipleRefs ? '16:9' : (isVertical ? '9:16' : '16:9'),
    safetySettings,
  };

  if (useMultipleRefs) {
    config.referenceImages = referenceImagesPayload;
  }

  let operation = await veoAI.models.generateVideos({
    model,
    prompt: `Tạo video chuyển động chất lượng cao: ${prompt}. ${duration === '8s' ? 'Kéo dài hành động mượt mà.' : ''}`,
    image: !useMultipleRefs ? {
      imageBytes: images[0].base64,
      mimeType: images[0].mimeType,
    } : undefined,
    config
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await veoAI.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    // Check for quota error
    const errorMsg = (operation.error as any)?.message || "";
    console.log("Veo Operation Error:", operation.error);
    
    if (errorMsg.includes('quota')) {
      throw new Error("Hết hạn mức (Quota exceeded). Vui lòng nâng cấp gói Pro.");
    }
    if (errorMsg.includes('safety') || errorMsg.includes('blocked')) {
      // Try to extract category if present in message
      const categoryMatch = errorMsg.match(/HARM_CATEGORY_[A-Z_]+/);
      const category = categoryMatch ? categoryMatch[0] : null;
      
      const msg = category 
        ? `Nội dung video bị hạn chế do chính sách an toàn (${category}). Hãy thử mô tả nhẹ nhàng hơn.`
        : "Nội dung video có thể bị hạn chế bởi chính sách Google. Hãy thử mô tả nhẹ nhàng hơn hoặc thay đổi chi tiết.";
      throw new Error(msg);
    }
    throw new Error("Không tìm thấy link tải video.");
  }

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey!,
    },
  });

  if (!response.ok) throw new Error("Không thể tải video từ server.");
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
