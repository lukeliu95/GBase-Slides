import React, { useState, useEffect } from 'react';
import { AppState, PresentationAnalysis, SlideContent, TextRichness, AppSettings, SlideCountOption } from './types';
import { analyzeText, generateSlideImage, analyzeReferenceStyle, DEFAULT_SYSTEM_PROMPT } from './services/geminiService';
import InputSection from './components/InputSection';
import ProcessingState from './components/ProcessingState';
import SlideViewer from './components/SlideViewer';
import SettingsModal from './components/SettingsModal';
import { Sparkles, Settings as SettingsIcon, Banana, Clock, Hourglass } from 'lucide-react';

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

  // Queue & ETA State (新增：用于处理速率限制的队列状态)
  const [queueStatus, setQueueStatus] = useState<{
    currentSlide: number;
    totalSlides: number;
    nextRequestCountdown: number; // 距离下一次请求的倒计时(秒)
    totalEstimatedTime: number;   // 总预计剩余时间(秒)
  } | null>(null);

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
     // STRICT CHECK: Must have settings.apiKey
     if (!settings.apiKey) {
      setErrorMsg("Please configure your Gemini API Key in settings.");
      setIsSettingsOpen(true);
      throw new Error("No API Key configured");
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
      setErrorMsg("Failed to analyze visual style. Please check API Key or try another image.");
      throw e;
    }
  };

  const handleAnalyze = async (text: string, richness: TextRichness, slideCount: SlideCountOption, referenceStyle?: string, visualStyle?: string) => {
    // STRICT CHECK: Must have settings.apiKey
    if (!settings.apiKey) {
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
        referenceStyle, // This is if they selected a suggestion from upload
        slideCount,
        visualStyle // This is the generic or custom style text from the new UI
      );
      setAnalysis(result);
      setSlides(result.slides);
      setAppState(AppState.GENERATING_IMAGES);

      // 2. Start generating images with Queue Logic
      // Explicitly pass apiKey to ensure the closure uses the correct key
      generateImagesForSlides(result.slides, result.globalStyleDefinition, result.detectedLanguage, settings.apiKey);

    } catch (err: any) {
      console.error("App Error:", err);
      let msg = "We encountered an issue analyzing your text. Please check your API Key and try again.";
      // specific handling for Quota limits
      if (err.message && (err.message.includes('Quota') || err.message.includes('429') || err.message.includes('limit: 0'))) {
          msg = "Error (429): Quota Exceeded. Your API Key does not have access to this model or has hit a rate limit.";
      }
      setErrorMsg(msg);
      setAppState(AppState.ERROR);
    }
  };

  // ============================================================================
  // ⚡️ 核心逻辑：带速率限制队列的图片生成器
  // ============================================================================
  const generateImagesForSlides = async (
    slideList: SlideContent[], 
    globalStyle: string, 
    detectedLanguage: string,
    apiKey: string // Explicitly passed
  ) => {
    let firstSlideImage: string | undefined = undefined;
    
    // 设置每张图片之间的强制等待时间（Gemini 3 Pro Tier 1 限制为 1 RPM，所以我们需要 > 60秒）
    // 设置为 65 秒以留出缓冲
    const WAIT_TIME_SECONDS = 65; 

    // Execute sequentially to prevent rate limiting / overloading
    for (let i = 0; i < slideList.length; i++) {
      const slide = slideList[i];
      
      // 更新队列状态 UI
      setQueueStatus({
        currentSlide: i + 1,
        totalSlides: slideList.length,
        nextRequestCountdown: 0,
        // 计算剩余时间：(剩余张数 * 每张等待时间) + 当前生成预估时间(10s)
        totalEstimatedTime: ((slideList.length - 1 - i) * WAIT_TIME_SECONDS) + 10 
      });

      try {
        // --- 速率限制强制等待逻辑 (Rate Limit Enforcement) ---
        // 第一张图直接生成，后续每一张图都需要等待，以满足 1 RPM 的限制
        if (i > 0) {
            let countdown = WAIT_TIME_SECONDS;
            while (countdown > 0) {
                // 更新倒计时状态
                setQueueStatus({
                    currentSlide: i + 1,
                    totalSlides: slideList.length,
                    nextRequestCountdown: countdown,
                    totalEstimatedTime: (countdown) + ((slideList.length - 1 - i) * WAIT_TIME_SECONDS)
                });
                
                // 等待 1 秒
                await new Promise(resolve => setTimeout(resolve, 1000));
                countdown--;
            }
        }
        
        // 等待结束，开始调用 API
        setQueueStatus(prev => prev ? { ...prev, nextRequestCountdown: 0 } : null); // 清除倒计时显示

        // Set current slide to loading
        setSlides(prevSlides => 
            prevSlides.map(s => s.id === slide.id ? { ...s, isGenerating: true } : s)
        );

        // Logic for Reference Image:
        // Priority 1: If user uploaded a Reference Template (referenceImageBase64), use it for EVERY slide to ensure high fidelity to that template.
        // Priority 2: If no template, use the First Generated Slide (firstSlideImage) as a reference for subsequent slides (index > 0) to maintain consistency.
        let referenceToUse: string | undefined = undefined;

        if (referenceImageBase64) {
          referenceToUse = referenceImageBase64;
        } else if (i > 0) {
          referenceToUse = firstSlideImage;
        }

        // 使用传入的 apiKey，而不是依赖 settings.apiKey
        const imageUrl = await generateSlideImage(
          slide.visualPrompt, 
          apiKey, 
          globalStyle,
          referenceToUse,
          detectedLanguage
        );

        // Store the first image to use as fallback template for others if no user template was uploaded
        if (i === 0 && imageUrl && !referenceImageBase64) {
          firstSlideImage = imageUrl;
        }

        setSlides(prevSlides => 
          prevSlides.map(s => s.id === slide.id ? { ...s, imageUrl, isGenerating: false } : s)
        );
      } catch (e: any) {
        console.error(`Failed to generate image for slide ${slide.id}`, e);
        
        let customError = "";
        if (e.message?.includes('limit: 0')) {
             customError = " (Quota Limit Reached)";
             // If we hit a hard limit, we might want to stop the loop or alert the user
             setErrorMsg("Generation stopped: Your API key does not have access to 'gemini-3-pro-image-preview'. Please check your Google AI Studio plan.");
        }

        // Turn off generating flag for this slide on error
        setSlides(prevSlides => 
            prevSlides.map(s => s.id === slide.id ? { ...s, isGenerating: false, explanation: s.explanation + customError } : s)
          );
      }
    }
    
    // Once the loop is done (all success or fail), mark complete
    setQueueStatus(null);
    setAppState(AppState.COMPLETE);
  };

  const handleRegenerateSlide = async (index: number) => {
    if (!settings.apiKey || !analysis) return;

    const slide = slides[index];
    // 1. Set Generating State
    setSlides(prev => prev.map((s, i) => i === index ? { ...s, isGenerating: true } : s));

    try {
      // 2. Determine Reference Logic (Same as initial generation)
      let referenceToUse: string | undefined = undefined;
      
      // If user uploaded a template, always use it
      if (referenceImageBase64) {
        referenceToUse = referenceImageBase64;
      } 
      // If no upload, and we are not on the first slide, try to use the first slide as reference
      else if (index > 0 && slides[0].imageUrl) {
        referenceToUse = slides[0].imageUrl;
      }

      // 3. Call API
      const imageUrl = await generateSlideImage(
        slide.visualPrompt,
        settings.apiKey,
        analysis.globalStyleDefinition,
        referenceToUse,
        analysis.detectedLanguage
      );

      // 4. Update Result
      setSlides(prev => prev.map((s, i) => i === index ? { ...s, imageUrl, isGenerating: false } : s));

    } catch (error: any) {
      console.error("Regeneration failed", error);
      let msg = "Failed to regenerate slide image.";
      if (error.message?.includes('limit: 0')) {
          msg = "Failed: Quota Limit (429).";
      }
      setErrorMsg(msg);
      setSlides(prev => prev.map((s, i) => i === index ? { ...s, isGenerating: false } : s));
    }
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
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-200 shadow-2xl z-50 max-w-lg text-center flex flex-col gap-2 animate-fade-in">
                <span className="font-semibold text-sm">{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="text-xs underline opacity-80 hover:opacity-100">Dismiss</button>
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
            onRegenerateSlide={handleRegenerateSlide}
          />
        );
      default:
        return null;
    }
  };

  // Helper to format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-notebook-bg font-sans text-notebook-text selection:bg-notebook-highlight">
      {/* Top Navigation Bar */}
      <header className="flex-none w-full px-8 py-4 flex items-center justify-between border-b border-notebook-accent/50 bg-white/70 backdrop-blur-sm z-10">
        <div 
          className="flex items-center gap-4 cursor-pointer group" 
          onClick={() => {
            if (appState !== AppState.ANALYZING_TEXT && !queueStatus) {
                setAppState(AppState.IDLE);
                setSlides([]);
                setAnalysis(null);
                setReferenceImageBase64(undefined); // Reset reference
            }
          }}
        >
          <img 
            src="https://gbase.ai/title-logo.png" 
            alt="GBase" 
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
          />
          
          <div className="flex items-center gap-3">
             <span className="font-serif font-bold text-xl text-neutral-800 tracking-tight">PPT</span>
             <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200/60 shadow-sm ml-2">
                <Banana className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-700 font-mono tracking-wide uppercase">Nano Banana Pro</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {/* 状态显示区域：完成状态 */}
           {appState === AppState.COMPLETE && (
               <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                   <Sparkles className="w-3 h-3" /> Ready
               </span>
           )}

           {/* 状态显示区域：生成中与队列倒计时 */}
           {appState === AppState.GENERATING_IMAGES && queueStatus && (
               <div className="flex items-center gap-3">
                   {/* 进度显示 */}
                   <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                       <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" /> 
                       Generating {queueStatus.currentSlide}/{queueStatus.totalSlides}
                   </span>
                   
                   {/* 倒计时警告 (Tier 1 限制) */}
                   {queueStatus.nextRequestCountdown > 0 && (
                       <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 flex items-center gap-1.5 shadow-sm animate-pulse">
                           <Hourglass className="w-3 h-3" /> 
                           Cooling down: {queueStatus.nextRequestCountdown}s
                       </span>
                   )}

                   {/* 总预计时间 */}
                   <span className="text-xs font-medium text-notebook-secondary bg-neutral-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                       <Clock className="w-3 h-3" /> 
                       ETA: {formatTime(queueStatus.totalEstimatedTime)}
                   </span>
               </div>
           )}
           
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className={`p-2 rounded-full hover:bg-neutral-100 transition-colors ${!settings.apiKey ? 'text-red-500 animate-pulse' : 'text-notebook-secondary hover:text-notebook-text'}`}
             title={!settings.apiKey ? "Configure API Key" : "Settings"}
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