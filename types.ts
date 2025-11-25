export type TextRichness = 'concise' | 'rich';

export type SlideCountOption = 'auto' | 2 | 5 | 8 | 10 | 12 | 15;

export interface SlideContent {
  id: number;
  title: string; // The functional title (e.g., "Page 1 - Introduction")
  visualPrompt: string; // The full prompt constructed for the image generator
  textContent: {
    mainTitle: string;
    subTitle: string;
  };
  metaphor: string;
  mood: string;
  explanation: string; // The interpretation of the design
  imageUrl?: string; // Populated after image generation
  isGenerating?: boolean; // Loading state for specific slide
}

export interface PresentationAnalysis {
  detectedLanguage: string;
  globalStyleDefinition: string;
  visualCoherence: string; // Step 4: Visual coherence explanation
  slides: SlideContent[];
}

export interface StyleSuggestion {
  id: string;
  label: string; // e.g., "Minimalist", "Structural"
  description: string; // The actual prompt derived from the image
}

export interface AppSettings {
  apiKey: string;
  systemPrompt: string;
}

export enum AppState {
  IDLE,
  ANALYZING_STYLE, // New state for reference analysis
  ANALYZING_TEXT,  // Renamed from ANALYZING
  GENERATING_IMAGES,
  COMPLETE,
  ERROR
}