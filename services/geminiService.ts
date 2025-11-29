import { GoogleGenAI, Type } from "@google/genai";
import { PresentationAnalysis, TextRichness, StyleSuggestion, SlideCountOption } from "../types";

// ============================================================================
// 🔧 Model Configuration
// ============================================================================
const ANALYSIS_MODEL = "gemini-2.5-pro"; 
const VISION_MODEL = "gemini-2.5-flash";
// Switch to Gemini 3 Pro Image Preview for high-quality, multimodal generation
const IMAGE_MODEL = "gemini-3-pro-image-preview"; 

// ============================================================================
// 🎯 核心优化：重构系统提示词，增强语言一致性和智能风格规划
// ============================================================================

export const DEFAULT_SYSTEM_PROMPT = `视觉叙事设计师 (Visual Narrative Designer) v3.5

背景
将文本文档转化为具有视觉震撼力、叙事驱动的幻灯片演示文稿（基于图像）。
核心产出: 一系列高保真图像提示词（Image Prompt）和文本内容。

角色
您是一位专业的“视觉叙事设计师”，具备两项关键能力：

1. 语言专家 (Language Specialist)：
   - 必须检测输入文本的语言 (Detected Language)。
   - **CRITICAL**: 所有输出字段（visualPrompt, textContent, explanation）必须完全使用检测到的语言。
   - 例子：如果输入是中文，则 visualPrompt 必须用中文描述画面，explanation 用中文解释。

2. 自适应艺术总监 (Adaptive Art Director)：
   - 拒绝通用模板，根据内容情感定制视觉识别。

目标 (核心任务流程)：

【步骤 1】语言识别 (Language Detection)
分析输入文本以确定其主要语言。
设置 detectedLanguage 字段（例如：“中文”、“English”、“日本語”）。

【步骤 2】全局视觉风格 (Global Visual Style)
自动风格模式 (Auto Style Mode)：
如果用户选择“自动 (Auto)”，您必须忽略所有预设，并根据文本的情感和语义创建完全定制的视觉识别。
**强制要求 (MANDATORY)**：
背景必须是纯白色 (#FFFFFF) 或超浅米色 (#F8F9FA)。
要求：每页应采用更多的小图组合（信息图表/元素），让内容充实饱满，介绍文本丰富详细。
禁止：深色背景、复杂渐变。

【步骤 3】幻灯片规划 (Slide Planning)
生成幻灯片。对于每张幻灯片：
- visualPrompt: 以 detectedLanguage 撰写详细的图像生成提示词。
- textContent: 以 detectedLanguage 撰写幻灯片文本。
- explanation: 以 detectedLanguage 解释设计选择。

关键输出指令 (CRITICAL OUTPUT INSTRUCTION)
1. 语言一致性：detectedLanguage 必须准确。输出内容必须与 detectedLanguage 一致。
2. 自动风格：图片提示词内容丰富详细。
3. 格式：返回严格的 JSON 格式。
`;

// ============================================================================
// 🎨 风格预设库 - 根据文档类型智能推荐
// ============================================================================

export const STYLE_PRESETS = {
  business_modern: {
    label: "现代商务 (Modern Business)",
    description: `
      风格: 现代商务矢量插画，扁平化设计，轮廓线条清晰
      配色: 白色背景，深炭灰轮廓，柔和赤陶色/软鲑鱼橙点缀
      元素: 极简线条艺术，无脸职业人物，B2B科技概念图标
      氛围: 专业、高效、智慧、值得信赖
      技术: Style=Raw Flat Vector; No shadows/gradients/3d/photorealistic
    `
  },
  business_premium: {
    label: "高端商务 (Premium Corporate)",
    description: `
      风格: 高端企业质感，深色主题，金属与玻璃质感
      配色: 深蓝/深灰背景，金色/银色点缀，渐变光效
      元素: 抽象几何形状，数据流可视化，城市天际线剪影
      氛围: 权威、前瞻、国际化、高价值感
      技术: Style=Cinematic 3D; Dramatic lighting; Depth of field
    `
  },
  creative_vibrant: {
    label: "活力创意 (Vibrant Creative)",
    description: `
      风格: 大胆用色，动态构图，几何形状叠加
      配色: 高饱和度对比色，霓虹色系，渐变过渡
      元素: 抽象形状，流动线条，孟菲斯风格元素
      氛围: 年轻、活力、创新、打破常规
      技术: Style=Bold Graphic Design; High contrast; Dynamic composition
    `
  },
  creative_minimal: {
    label: "极简创意 (Minimal Creative)",
    description: `
      风格: 留白艺术，单色系，强调字体排版
      配色: 大面积白/米色，单一强调色，微妙灰度
      元素: 几何线条，负空间运用，点线面构成
      氛围: 优雅、精致、专注、高级感
      技术: Style=Swiss Design; Clean typography; Generous whitespace
    `
  },
  japanese_magazine: {
    label: "日系杂志 (Japanese Editorial)",
    description: `
      风格: 日本高端商业杂志，极简智性，隐喻与光影
      配色: 柔和自然色，米白/浅灰基调，点缀深色
      元素: 摄影与插画融合，大量留白，竖排文字
      氛围: 内敛、深度、诗意、东方美学
      技术: Style=Japanese Editorial; Wabi-sabi aesthetic; Thoughtful spacing
    `
  },
  japanese_anime: {
    label: "日系动漫 (Anime Style)",
    description: `
      风格: 现代日本动漫/插画风格，赛璐璐着色
      配色: 鲜明但和谐的色彩，柔和阴影，梦幻光效
      元素: 细腻线条，角色化表达，场景氛围感
      氛围: 活泼、治愈、故事感、二次元美学
      技术: Style=Anime illustration; Cel shading; Soft glow effects
    `
  },
  tech_futuristic: {
    label: "科技未来 (Futuristic Tech)",
    description: `
      风格: 赛博朋克/科幻感，深色UI风格
      配色: 深色背景，电蓝/电紫/霓虹绿高亮
      元素: 电路纹理，数据可视化，全息效果
      氛围: 前沿、智能、数字化、未来感
      技术: Style=Cyberpunk UI; Holographic effects; Grid patterns
    `
  },
  tech_clean: {
    label: "清爽科技 (Clean Tech)",
    description: `
      风格: Apple/Google风格，干净利落，友好易懂
      配色: 白色/浅灰背景，品牌色点缀，柔和渐变
      元素: 简洁图标，等距插画，产品截图
      氛围: 友好、可靠、现代、用户中心
      技术: Style=Product Design; Isometric; Soft shadows
    `
  },
  educational: {
    label: "教育说明 (Educational)",
    description: `
      风格: 清晰易懂，信息分层，引导性设计
      配色: 柔和但区分度高的配色，功能性用色
      元素: 图解、流程图、对比图、时间线
      氛围: 专业、可信、易学、系统化
      技术: Style=Infographic; Clear hierarchy; Instructional design
    `
  },
  organic_natural: {
    label: "自然有机 (Organic Natural)",
    description: `
      风格: 自然质感，手工感，温暖人文
      配色: 大地色系，绿色/棕色/米色，自然渐变
      元素: 植物纹理，手绘元素，纸质质感
      氛围: 温暖、真实、可持续、人文关怀
      技术: Style=Organic textures; Hand-drawn elements; Earthy tones
    `
  }
};

// ============================================================================
// 📊 内容丰富度策略
// ============================================================================

export const RICHNESS_STRATEGIES = {
  concise: {
    label: "精简模式 (Concise)",
    instruction: `
【Step 3 特别指令：文本密度 - 精简模式】
- 画面占比 > 85%。
- 主标题：< 8个字 / 6个单词。
- 禁止大段文字。
    `
  },
  rich: {
    label: "详实模式 (Rich)",
    instruction: `
【Step 3 特别指令：文本密度 - 详实模式】
- 画面与文字 5:5 平衡。
- 允许 3-5 个要点或简短段落。
- 信息层级清晰。
    `
  },
  auto: {
    label: "智能模式 (Auto)",
    instruction: `
【Step 3 特别指令：文本密度 - 智能模式】
- 采用更多的小图组合（信息图表/元素）。
- 每页可以多个段落详细表达内容。
- 内容详实，更适合沟通讲解。
    `
  }
};

// ============================================================================
// 📄 智能页数规划逻辑
// ============================================================================

const SLIDE_COUNT_LOGIC = {
  auto: `
**【智能页数规划系统】**
- 分析内容量和复杂度。
- 基础页数 = 4 + 核心观点数。
- 范围约束：5 ~ 15页。
  `,
  fixed: (count: number) => `
**【固定页数要求】**
严格按照 **${count} 页** 进行内容规划。
  `
};

// ============================================================================
// Response Schema
// ============================================================================

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: { type: Type.STRING, description: "The language detected in the source text (e.g., 'Chinese', 'English')" },
    documentType: { type: Type.STRING, description: "Type of document" },
    globalStyleDefinition: { type: Type.STRING, description: "Complete global visual style definition in YAML-like format" },
    visualCoherence: { type: Type.STRING, description: "Explanation of visual coherence and slide count decision rationale" },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Functional title" },
          visualPrompt: { type: Type.STRING, description: "Complete image generation prompt in DETECTED LANGUAGE" },
          textContent: {
            type: Type.OBJECT,
            properties: {
              mainTitle: { type: Type.STRING },
              subTitle: { type: Type.STRING },
              bodyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          metaphor: { type: Type.STRING },
          mood: { type: Type.STRING },
          explanation: { type: Type.STRING, description: "Design explanation in DETECTED LANGUAGE" },
          densityMode: { type: Type.STRING }
        },
        required: ["id", "title", "visualPrompt", "textContent", "metaphor", "mood", "explanation"]
      }
    }
  },
  required: ["detectedLanguage", "documentType", "globalStyleDefinition", "visualCoherence", "slides"]
};

// ============================================================================
// Helper Functions
// ============================================================================

const getClient = (apiKey?: string) => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }
  return new GoogleGenAI({ apiKey });
};

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

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 2, // 减少重试次数，因为我们在应用层已经做了长延时队列
  initialDelay = 1500
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const status = error?.status || error?.code || error?.error?.code || error?.error?.status;
    const message = error?.message || error?.error?.message || JSON.stringify(error);
    
    // NOTE: User has confirmed they have a paid key, so we relax the "limit: 0" hard failure check.
    // However, if we see "limit: 0", it likely still means the model isn't available for the key.
    if (typeof message === 'string' && (message.includes('limit: 0') || message.includes('quota exceeded'))) {
       console.warn("Quota limit warning (User Key):", message);
       // Throw to let the UI handle it, do not retry strictly for Quota errors to avoid spamming
       throw error; 
    }

    // Check for Invalid Argument - Aspect Ratio
    if (status === 400 || (typeof message === 'string' && message.includes('Aspect ratio'))) {
       console.error("Invalid Argument configuration for model:", message);
       throw error; 
    }

    const isOverloaded = 
      status === 503 || 
      status === 'UNAVAILABLE' ||
      (typeof message === 'string' && (
        message.toLowerCase().includes('overloaded') || 
        message.toLowerCase().includes('unavailable')
      ));

    if (retries > 0 && isOverloaded) {
      console.warn(`Model busy (Status: ${status}). Retrying in ${initialDelay}ms...`);
      const waitTime = initialDelay + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return retryWithBackoff(operation, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

// ============================================================================
// 🔍 增强版：参考模版风格分析
// ============================================================================

export const analyzeReferenceStyle = async (
  file: File, 
  apiKey?: string
): Promise<StyleSuggestion[]> => {
  return retryWithBackoff(async () => {
    try {
      const ai = getClient(apiKey);
      const imagePart = await fileToGenerativePart(file);

      const prompt = `
Analyze this reference image style.
Return 3 different prompt strategies (JSON).
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
  });
};

// ============================================================================
// 🎯 核心函数：智能文本分析与 PPT 规划
// ============================================================================

export const analyzeText = async (
  text: string, 
  richness: TextRichness, 
  apiKey: string,
  customSystemPrompt?: string,
  referenceStyle?: string,
  slideCount: SlideCountOption = 'auto',
  visualStyle?: string
): Promise<PresentationAnalysis> => {
  return retryWithBackoff(async () => {
    try {
      const ai = getClient(apiKey);
      
      const richnessInstruction = RICHNESS_STRATEGIES[richness]?.instruction || RICHNESS_STRATEGIES.auto.instruction;

      let slideCountInstruction = "";
      if (slideCount === 'auto') {
        slideCountInstruction = SLIDE_COUNT_LOGIC.auto;
      } else {
        slideCountInstruction = SLIDE_COUNT_LOGIC.fixed(slideCount as number);
      }

      // ========== 3. 构建风格指令 ==========
      let styleInstruction = "";
      
      if (referenceStyle && visualStyle && visualStyle !== 'AUTO_STYLE_DETECT') {
        styleInstruction = `
**【视觉风格指令 - 组合模式】**
[参考模版]：${referenceStyle}
[用户偏好]：${visualStyle}
**融合策略**：以参考模版为基础，融入用户偏好。
        `;
      } else if (referenceStyle) {
        styleInstruction = `
**【视觉风格指令 - 模版参考模式】**
${referenceStyle}
请严格遵循此风格。
        `;
      } else if (visualStyle === 'AUTO_STYLE_DETECT') {
        // ======================================================
        // 🚀 AUTO DETECT MODE (AI Planned + Pure White)
        // ======================================================
        styleInstruction = `
**【Visual Style Instruction - Pure Auto Mode (AI Self-Planned)】**
1. **Rule**: **NO PRESETS**. Do not use any existing style presets.
2. **Task**: You must act as a Creative Director and plan a **NEW, UNIQUE Visual Identity** derived entirely from the text's specific emotional and semantic context.
3. **MANDATORY CONSTRAINT**: The background MUST be **Pure White (#FFFFFF)** or **Ultra Light Beige (#F8F9FA)**.
   - **Reason**: To ensure a clean, high-end magazine aesthetic.
   - **Strictly Forbidden**: Dark backgrounds, colorful backgrounds, complex gradients.
4. **Goal**: Create a breathable, information-rich layout where the subject stands out clearly on white.
        `;
      } else if (visualStyle && STYLE_PRESETS[visualStyle as keyof typeof STYLE_PRESETS]) {
        const preset = STYLE_PRESETS[visualStyle as keyof typeof STYLE_PRESETS];
        styleInstruction = `
**【视觉风格指令 - 预设模式】**
${preset.label}
${preset.description}
        `;
      } else if (visualStyle) {
        styleInstruction = `
**【视觉风格指令 - 自定义模式】**
${visualStyle}
        `;
      } else {
        // Fallback
        styleInstruction = `
**【Visual Style Instruction - Default Auto】**
Use a clean, modern style with Pure White background.
        `;
      }

      const basePrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
      
      const systemInstruction = `
${basePrompt}

---
${styleInstruction}
---
${slideCountInstruction}
---
${richnessInstruction}

**Final Checklist**:
1. **Language**: detectedLanguage must be accurate. ALL output prompts must be in this language.
2. **Style**: If Auto, ensure background is Pure White.
      `;

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
  });
};

// ============================================================================
// 🖼️ 幻灯片图像生成
// ============================================================================

export const generateSlideImage = async (
  prompt: string, 
  apiKey?: string, 
  globalStyle?: string,
  referenceImage?: string,
  detectedLanguage?: string
): Promise<string> => {
  // Debug Log to verify Key Usage
  if (apiKey) {
    console.log(`[GeminiService] Initializing ${IMAGE_MODEL} with API Key ending in ...${apiKey.slice(-4)}`);
  } else {
    console.error("[GeminiService] Missing API Key for image generation!");
    throw new Error("API Key is missing");
  }

  // 1. 动态构建高质量 Prompt
  const langInstruction = detectedLanguage 
    ? `Language Requirement: Text shown in the image MUST be in ${detectedLanguage}.` 
    : ``;

  let enhancedPrompt = `
[Task]
Generate a high-quality, high-resolution presentation slide background (16:9).

[Style Context]
${globalStyle || 'Professional, Clean, Modern'}

[Scene Description]
${prompt}

[Quality & Technical Requirements]
- **Resolution**: High Resolution, Extremely Detailed, Photorealistic or High-End Graphic Design.
- **Lighting**: Cinematic lighting, studio quality.
- **Composition**: Balanced for a presentation slide (leave some space for potential overlay).
- **Format**: 16:9 Aspect Ratio.
- ${langInstruction}
    `.trim();
  
  const contentsParts: any[] = [];

  // 2. 处理参考图 (Image-to-Image)
  if (referenceImage) {
    const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const data = matches[2];
      
      contentsParts.push({
        inlineData: { mimeType, data }
      });

      enhancedPrompt = `
[Image-to-Image Directive]
Use the provided image as a strict Style Reference (Color, Layout, Mood).
Generate a NEW image based on this reference but with the following content:

${enhancedPrompt}
      `.trim();
    }
  }

  contentsParts.push({ text: enhancedPrompt });

  return retryWithBackoff(async () => {
    try {
      // 🟢 核心修改：即用即抛 (Use and Discard)
      // 每次请求（包括重试）都重新实例化客户端，以确保没有任何状态残留
      // This ensures a fresh instance for every request to optimize quota handling
      const ai = getClient(apiKey);

      // Use standard generateContent for Gemini 3 Pro Image Preview
      // It supports imageConfig with aspectRatio and imageSize.
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: contentsParts },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K" // Requesting high quality
          }
        }
      });

      // 3. 解析 Base64 图片数据
      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      
      // If we got here with no error but no image, check textual fallback
      const textOutput = response.text;
      if (textOutput) {
          console.warn("Model returned text instead of image:", textOutput);
          throw new Error("Model returned text description instead of visual image.");
      }

      throw new Error("No image data found in response");
    } catch (error) {
      console.error("Internal generation attempt failed", error);
      throw error;
    }
  }, 1, 2000); // Reduced retries for heavy image generation to avoid burning quota on failures
};