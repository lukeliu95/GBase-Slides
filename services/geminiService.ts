import { GoogleGenAI, Type } from "@google/genai";
import { PresentationAnalysis, TextRichness, StyleSuggestion, SlideCountOption } from "../types";

const ANALYSIS_MODEL = "gemini-3-pro-preview";
const VISION_MODEL = "gemini-2.5-flash"; // Fast multimodal model for style extraction
const IMAGE_MODEL = "gemini-3-pro-image-preview";

export const DEFAULT_SYSTEM_PROMPT = `Background（背景）
用户拥有一份文本文档（如文章、报告或笔记），希望将其转化为一份具有高度视觉美感和叙事深度的 PPT 演示文稿。
用户希望模仿 【日式精美商业杂志：极简、充满智性、通过隐喻和光影来传达情感】。
关键要求：生成的图片必须同时包含视觉画面和文字内容，实现图文一体化设计。

Role（角色）
你是指挥官级的"视觉叙事设计师（Visual Narrative Designer）"。
你具备以下核心能力：
1、自动语言识别能力：能够自动检测用户提供文档的语言，并在整个工作流程中使用相同语言进行交互和输出。
2、跨语言理解能力：能够准确阅读任何语言的源文档（中文/英文/日文/法文等）。
3、图文融合设计能力：擅长将文字内容与视觉画面有机结合，创造既美观又信息完整的图像。
4、隐喻转化能力：擅长将抽象概念转化为具体的视觉意象。
5、艺术指导能力：精通光线、构图、色彩心理学和文字排版设计。

Objectives（目标/任务）
请完成以下核心任务流程：
1、语言自动识别： 
自动检测用户输入文档的语言
确认检测到的语言并告知用户
后续所有对话、分析、提示词生成均使用该语言

2、内容分析与隐喻构建： 
深度阅读文档，提取核心观点
建立贯穿始终的视觉隐喻系统
为每页规划需要在图片中显示的关键文字内容

3、生成图文融合的分页提示词： 
根据 PPT 叙事结构，为每一页生成具体的图像提示词。
**智能页数规划**：请勿局限于固定页数。根据文档内容的丰富程度、逻辑段落和叙事节奏，智能决定幻灯片的页数（通常在 5 到 15 页之间）。长文多页，短文少页，确保信息传达完整。
**视觉一致性**：确保每一页的视觉场景（Visual Scene）都严格呼应全局视觉风格，使整套幻灯片具有统一的艺术调性。

4、强制约束： 
所有灰色代码块内的图像提示词（Prompt）必须使用检测到的文档语言
提示词中必须包含具体的文字内容和文字设计要求

CRITICAL OUTPUT INSTRUCTION:
You must return a JSON object strictly strictly adhering to the provided 'responseSchema'.
Map the "Key Result" sections to the JSON fields as follows:
- 【Step 1】 -> detectedLanguage
- 【Step 2】 -> globalStyleDefinition
- 【Step 3】 -> slides array.
    - IMPORTANT: The 'visualPrompt' field for each slide must be a consolidated paragraph containing ALL the information from the "Prompt Block" (Visual Scene, Text Content, Text Design, Metaphor, Mood, Tech Specs). This prompt will be sent directly to the image generator.
    - '[检测语言]解读' -> explanation
- 【Step 4】 -> visualCoherence`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: { type: Type.STRING, description: "The language detected in the source text (Step 1)" },
    globalStyleDefinition: { type: Type.STRING, description: "Global visual style definition (Step 2)" },
    visualCoherence: { type: Type.STRING, description: "Explanation of visual coherence across slides (Step 4)" },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Functional title (e.g., Page 1 - Title)" },
          visualPrompt: { type: Type.STRING, description: "The comprehensive image generation prompt including Visual Scene, Text Content details, Text Design, Metaphor, Mood, and Tech Specs." },
          textContent: {
            type: Type.OBJECT,
            properties: {
              mainTitle: { type: Type.STRING },
              subTitle: { type: Type.STRING },
            }
          },
          metaphor: { type: Type.STRING },
          mood: { type: Type.STRING },
          explanation: { type: Type.STRING, description: "Interpretation of how the design supports the content" },
        },
        required: ["id", "title", "visualPrompt", "textContent", "metaphor", "mood", "explanation"]
      }
    }
  },
  required: ["detectedLanguage", "globalStyleDefinition", "visualCoherence", "slides"]
};

// Helper to get client with correct key
const getClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Helper to retry operations with exponential backoff on 503/Overloaded errors.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 5,
  initialDelay = 4000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Robustly check for 503 or specific overload messages in various error structures
    // The SDK sometimes returns error inside an 'error' property
    const status = error?.status || error?.code || error?.error?.code || error?.error?.status;
    const message = error?.message || error?.error?.message || '';
    
    const isOverloaded = 
      status === 503 || 
      status === 'UNAVAILABLE' ||
      message.toLowerCase().includes('overloaded') ||
      message.toLowerCase().includes('unavailable');

    if (retries > 0 && isOverloaded) {
      console.warn(`Model overloaded (Status: ${status}). Retrying in ${initialDelay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return retryWithBackoff(operation, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

export const analyzeReferenceStyle = async (
  file: File, 
  apiKey?: string
): Promise<StyleSuggestion[]> => {
  try {
    const ai = getClient(apiKey);
    const imagePart = await fileToGenerativePart(file);

    const prompt = `
    You are an expert Design Director. Analyze this image/document. It is a reference template.
    Extract the core visual identity: Color Palette, Composition Layout, Typography Style, Lighting, and Mood.
    
    Based on this analysis, provide 3 distinct, high-quality image generation prompts that would recreate this exact style for a presentation slide.
    
    Return a JSON object with this schema:
    {
      "suggestions": [
        { "id": "1", "label": "Literal Recreation", "description": "..." },
        { "id": "2", "label": "Mood & Atmosphere", "description": "..." },
        { "id": "3", "label": "Structural Layout", "description": "..." }
      ]
    }
    `;

    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: {
        parts: [imagePart, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result.suggestions || [];
  } catch (error) {
    console.error("Style analysis failed:", error);
    throw error;
  }
};

export const analyzeText = async (
  text: string, 
  richness: TextRichness, 
  apiKey?: string, 
  customSystemPrompt?: string,
  forcedStyle?: string,
  slideCount: SlideCountOption = 'auto'
): Promise<PresentationAnalysis> => {
  try {
    const ai = getClient(apiKey);
    
    let richnessInstruction = "";
    if (richness === 'concise') {
      richnessInstruction = `
      【Step 3 特别指令：文本密度 - 简洁模式 (Concise)】
      - 生成的图片中的文字内容必须非常精简。
      - Text Content 要求：主标题不超过 10 个汉字/单词；副标题仅使用极为简短的短语（不超过 15 个汉字/单词）。
      - Text Design 要求：强调极简主义排版，大面积留白，文字作为视觉的点缀而非主体。
      `;
    } else {
      richnessInstruction = `
      【Step 3 特别指令：文本密度 - 丰富模式 (Rich)】
      - 生成的图片中必须包含较丰富的信息量。
      - Text Content 要求：主标题清晰明确；副标题或正文应包含具体的论述、数据或要点（30-50 个汉字/单词）。
      - Text Design 要求：使用杂志风格或海报风格的排版，确保有足够的文本区域来容纳这些内容，同时保持美感。
      `;
    }

    let slideCountInstruction = "";
    if (slideCount === 'auto') {
      slideCountInstruction = `**智能页数规划**：请勿局限于固定页数。根据文档内容的丰富程度、逻辑段落和叙事节奏，智能决定幻灯片的页数（通常在 5 到 15 页之间）。长文多页，短文少页，确保信息传达完整。`;
    } else {
      slideCountInstruction = `**固定页数要求**：请严格按照 **${slideCount} 页** 的数量进行规划和生成。`;
    }

    let basePrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    // Replace the default page count instruction with our specific one
    basePrompt = basePrompt.replace(
      /\*\*智能页数规划\*\*：.*?(?=\n)/s, 
      slideCountInstruction
    );
    
    // Inject forced style if present
    if (forcedStyle) {
      basePrompt = basePrompt.replace(
        /用户希望模仿 【.*?】。/, 
        `用户提供了具体的参考模版。
        【CRITICAL: STRICT VISUAL COMPLIANCE】
        全局视觉风格必须严格强制执行以下描述：
        "${forcedStyle}"
        忽略任何与此参考风格冲突的默认设置。所有生成的提示词必须基于此视觉核心。`
      );
    }

    const systemInstruction = `${basePrompt}\n\n${richnessInstruction}`;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from analysis model");
    return JSON.parse(jsonText) as PresentationAnalysis;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateSlideImage = async (
  prompt: string, 
  apiKey?: string, 
  globalStyle?: string,
  referenceImage?: string // Data URL string
): Promise<string> => {
  const ai = getClient(apiKey);
  const styleContext = globalStyle ? `Style Context: ${globalStyle}. ` : "";
  let enhancedPrompt = `High quality, editorial design, text-integrated image. ${styleContext}${prompt}`;
  
  const contentsParts: any[] = [];

  if (referenceImage) {
    // Parse Data URL to extract base64 and mime
    const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const data = matches[2];
      
      // Add reference image to parts
      contentsParts.push({
        inlineData: { mimeType, data }
      });

      // Update prompt to force using the reference
      enhancedPrompt = `[STRICT TEMPLATE REFERENCE] 
      Use the provided image as a Reference Template for layout, typography, and color palette.
      Generate a NEW image that matches this visual style EXACTLY (High Fidelity), but with the following new content:
      
      ${enhancedPrompt}`;
    }
  }

  // Add the text prompt part
  contentsParts.push({ text: enhancedPrompt });

  return retryWithBackoff(async () => {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: contentsParts },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K"
          }
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("No image data found in response");
    } catch (error) {
      console.error("Internal generation attempt failed", error);
      throw error;
    }
  });
};