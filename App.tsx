import React, { useState, useEffect } from 'react';
import { AppState, PresentationAnalysis, SlideContent, TextRichness, AppSettings, SlideCountOption } from './types';
import { analyzeText, generateSlideImage, analyzeReferenceStyle, DEFAULT_SYSTEM_PROMPT } from './services/geminiService';
import InputSection from './components/InputSection';
import ProcessingState from './components/ProcessingState';
import SlideViewer from './components/SlideViewer';
import SettingsModal from './components/SettingsModal';
import { Sparkles, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<PresentationAnalysis | null>(null);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  });

  // Reference Template State
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | undefined>(undefined);

  // Load Settings on Mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gbase_api_key') || '';
    const savedPrompt = localStorage.getItem('gbase_system_prompt') || DEFAULT_SYSTEM_PROMPT;
    setSettings({
      apiKey: savedApiKey,
      systemPrompt: savedPrompt
    });
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('gbase_api_key', newSettings.apiKey);
    localStorage.setItem('gbase_system_prompt', newSettings.systemPrompt);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle Reference Style Analysis
  const handleAnalyzeReference = async (file: File) => {
     if (!settings.apiKey && !process.env.API_KEY) {
      setErrorMsg("Please configure your Gemini API Key in settings.");
      setIsSettingsOpen(true);
      throw new Error("No API Key");
    }

    setAppState(AppState.ANALYZING_STYLE);
    try {
      // 1. Convert to Base64 and store it for later Image-to-Image generation
      const base64 = await fileToBase64(file);
      setReferenceImageBase64(base64);

      // 2. Analyze for prompt extraction
      const suggestions = await analyzeReferenceStyle(file, settings.apiKey);
      setAppState(AppState.IDLE); // Return to idle so user can submit form
      return suggestions;
    } catch (e) {
      console.error(e);
      setAppState(AppState.IDLE);
      setErrorMsg("Failed to analyze visual style. Please try another image.");
      throw e;
    }
  };

  const handleAnalyze = async (text: string, richness: TextRichness, slideCount: SlideCountOption, referenceStyle?: string) => {
    // Validate API Key before starting if it's not set in env (which we assume isn't for this feature)
    if (!settings.apiKey && !process.env.API_KEY) {
      setErrorMsg("Please configure your Gemini API Key in settings.");
      setIsSettingsOpen(true);
      return;
    }

    setAppState(AppState.ANALYZING_TEXT);
    setErrorMsg(null);
    try {
      // 1. Analyze text to get slide structure (incorporating reference style if provided)
      const result = await analyzeText(
        text, 
        richness, 
        settings.apiKey, 
        settings.systemPrompt,
        referenceStyle,
        slideCount
      );
      setAnalysis(result);
      setSlides(result.slides);
      setAppState(AppState.GENERATING_IMAGES);

      // 2. Start generating images. 
      generateImagesForSlides(result.slides, result.globalStyleDefinition);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("We encountered an issue analyzing your text. Please check your API Key and try again.");
      setAppState(AppState.ERROR);
    }
  };

  const generateImagesForSlides = async (slideList: SlideContent[], globalStyle: string) => {
    let firstSlideImage: string | undefined = undefined;

    // Execute sequentially to prevent rate limiting / overloading
    for (let i = 0; i < slideList.length; i++) {
      const slide = slideList[i];
      try {
        // Logic for Reference Image:
        // Priority 1: If user uploaded a Reference Template (referenceImageBase64), use it for EVERY slide to ensure high fidelity to that template.
        // Priority 2: If no template, use the First Generated Slide (firstSlideImage) as a reference for subsequent slides (index > 0) to maintain consistency.
        let referenceToUse: string | undefined = undefined;

        if (referenceImageBase64) {
          referenceToUse = referenceImageBase64;
        } else if (i > 0) {
          referenceToUse = firstSlideImage;
        }

        const imageUrl = await generateSlideImage(
          slide.visualPrompt, 
          settings.apiKey, 
          globalStyle,
          referenceToUse
        );

        // Store the first image to use as fallback template for others if no user template was uploaded
        if (i === 0 && imageUrl && !referenceImageBase64) {
          firstSlideImage = imageUrl;
        }

        setSlides(prevSlides => 
          prevSlides.map(s => s.id === slide.id ? { ...s, imageUrl, isGenerating: false } : s)
        );
      } catch (e) {
        console.error(`Failed to generate image for slide ${slide.id}`, e);
        // Turn off generating flag for this slide on error
        setSlides(prevSlides => 
            prevSlides.map(s => s.id === slide.id ? { ...s, isGenerating: false } : s)
          );
      }
    }
    
    // Once the loop is done (all success or fail), mark complete
    setAppState(AppState.COMPLETE);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
      case AppState.ANALYZING_STYLE: 
      case AppState.ERROR:
        return (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <InputSection 
                onAnalyze={handleAnalyze} 
                onAnalyzeRef={handleAnalyzeReference}
                isLoading={false}
                isAnalyzingRef={appState === AppState.ANALYZING_STYLE}
            />
            {errorMsg && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-100 text-sm animate-fade-in flex items-center gap-2 shadow-md z-50">
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        );
      case AppState.ANALYZING_TEXT:
        return <ProcessingState />;
      case AppState.GENERATING_IMAGES:
      case AppState.COMPLETE:
        return (
          <SlideViewer 
            slides={slides} 
            currentSlideIndex={currentSlideIndex}
            setCurrentSlideIndex={setCurrentSlideIndex}
            globalStyle={analysis?.globalStyleDefinition || "Elegant, Minimalist, Narrative-driven."}
            visualCoherence={analysis?.visualCoherence}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-notebook-bg font-sans text-notebook-text selection:bg-notebook-highlight">
      {/* Top Navigation Bar */}
      <header className="flex-none w-full px-8 py-4 flex items-center justify-between border-b border-notebook-accent/50 bg-white/70 backdrop-blur-sm z-10">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => {
            if (appState !== AppState.ANALYZING_TEXT) {
                setAppState(AppState.IDLE);
                setSlides([]);
                setAnalysis(null);
                setReferenceImageBase64(undefined); // Reset reference
            }
          }}
        >
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <span className="font-serif font-bold text-lg italic">S</span>
          </div>
          <span className="font-medium text-neutral-800 tracking-tight">GBase Slides</span>
        </div>
        
        <div className="flex items-center gap-4">
           {appState === AppState.COMPLETE && (
               <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                   <Sparkles className="w-3 h-3" /> Ready
               </span>
           )}
           {appState === AppState.GENERATING_IMAGES && (
               <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                   <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" /> Generating visuals...
               </span>
           )}
           
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-2 rounded-full hover:bg-neutral-100 text-notebook-secondary hover:text-notebook-text transition-colors"
             title="Settings"
           >
             <SettingsIcon className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 relative w-full">
        {renderContent()}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings}
      />
      
    </div>
  );
}

export default App;