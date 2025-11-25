import React, { useRef, useState } from 'react';
import { SlideContent } from '../types';
import { Download, ChevronLeft, ChevronRight, Info, Sparkles, Layout, Maximize2, Minimize2, Loader2, Quote, Palette } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SlideViewerProps {
  slides: SlideContent[];
  currentSlideIndex: number;
  setCurrentSlideIndex: (index: number) => void;
  globalStyle: string;
  visualCoherence?: string;
}

const SlideViewer: React.FC<SlideViewerProps> = ({ 
  slides, 
  currentSlideIndex, 
  setCurrentSlideIndex,
  globalStyle,
  visualCoherence
}) => {
  const currentSlide = slides[currentSlideIndex];
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleFullscreen = () => {
    if (!slideContainerRef.current) return;

    if (!document.fullscreenElement) {
      slideContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(currentSlideIndex + 1);
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
  };

  const handleDownloadPDF = async () => {
    if (slides.length === 0 || isDownloading) return;
    setIsDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080],
        hotfixes: ['px_scaling']
      });

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (i > 0) doc.addPage();

        if (slide.imageUrl) {
          const format = slide.imageUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
          doc.addImage(slide.imageUrl, format, 0, 0, 1920, 1080);
        } else {
          doc.setFillColor(248, 249, 250);
          doc.rect(0, 0, 1920, 1080, 'F');
          doc.setFontSize(40);
          doc.setTextColor(32, 33, 36);
          doc.text(slide.textContent.mainTitle || `Slide ${i + 1}`, 960, 540, { align: 'center' });
        }
      }

      doc.save('visual-narrative-slides.pdf');
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!currentSlide) return null;

  const isAnySlideGenerating = slides.some(s => s.isGenerating);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-fade-in gap-8 overflow-hidden">
      
      {/* LEFT PANEL: Narrative & Info Dashboard */}
      <div className="w-full lg:w-[420px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 lg:border-r border-transparent lg:border-notebook-accent/50">
        
        {/* Title Section */}
        <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-neutral-900 text-white">
                    Slide {currentSlideIndex + 1}/{slides.length}
                </span>
                <div className="h-px bg-notebook-accent flex-1"></div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-serif text-notebook-text leading-tight">
                {currentSlide.textContent.mainTitle}
            </h1>
            <p className="text-lg text-notebook-secondary leading-relaxed font-light">
                {currentSlide.textContent.subTitle}
            </p>
        </div>

        {/* Design Insights Card */}
        <div className="bg-white rounded-xl border border-notebook-accent shadow-sm p-6 space-y-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-24 h-24 text-indigo-500" />
            </div>

            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-notebook-text">Design Intelligence</h3>
            </div>

            <div className="space-y-4 relative z-10">
                <div>
                    <span className="text-[10px] uppercase text-notebook-secondary/70 font-bold tracking-wider block mb-1">Visual Metaphor</span>
                    <p className="text-sm font-medium text-notebook-text leading-relaxed">{currentSlide.metaphor}</p>
                </div>
                
                <div>
                    <span className="text-[10px] uppercase text-notebook-secondary/70 font-bold tracking-wider block mb-1">Mood</span>
                    <div className="flex flex-wrap gap-2">
                        {currentSlide.mood.split(/[,\s]+/).filter(Boolean).map((m, i) => (
                            <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md font-medium">
                                {m}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="pt-2 border-t border-notebook-accent/50">
                     <span className="text-[10px] uppercase text-notebook-secondary/70 font-bold tracking-wider block mb-2">Director's Note</span>
                     <div className="flex gap-3">
                        <Quote className="w-4 h-4 text-notebook-accent flex-shrink-0 fill-notebook-accent" />
                        <p className="text-sm text-notebook-secondary italic leading-relaxed">
                            {currentSlide.explanation}
                        </p>
                     </div>
                </div>
            </div>
        </div>

        {/* Global Context Card */}
        <div className="bg-neutral-50 rounded-xl border border-notebook-accent/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-notebook-secondary" />
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-notebook-secondary">Global Style</h3>
            </div>
            <p className="text-xs text-notebook-secondary leading-relaxed border-l-2 border-notebook-accent pl-3">
                {globalStyle}
            </p>
            
            {visualCoherence && (
                <div className="pt-3 border-t border-notebook-accent/50">
                    <div className="flex items-center gap-2 mb-2">
                        <Layout className="w-3 h-3 text-emerald-600" />
                        <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700">Coherence Strategy</span>
                    </div>
                    <p className="text-xs text-emerald-800/80 leading-relaxed italic">
                        {visualCoherence}
                    </p>
                </div>
            )}
        </div>

      </div>

      {/* RIGHT PANEL: Visual Stage */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        
        {/* Main Stage Container */}
        <div className="flex-1 bg-neutral-100/50 rounded-2xl border border-notebook-accent/50 p-4 md:p-8 flex flex-col relative overflow-hidden group-stage">
            
            {/* Toolbar - Always visible */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading || isAnySlideGenerating}
                    title={isAnySlideGenerating ? "Waiting for generation to finish..." : "Download Presentation as PDF"}
                    className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-sm border border-notebook-accent text-sm font-medium hover:bg-white hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>Export PDF</span>
                </button>
                <button 
                    onClick={toggleFullscreen}
                    title="Toggle Fullscreen"
                    className="p-2 bg-white/90 backdrop-blur rounded-full shadow-sm border border-notebook-accent hover:bg-white hover:text-indigo-600 transition-colors"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Image Preview Area */}
            <div className="flex-1 flex items-center justify-center w-full min-h-0">
                <div 
                    ref={slideContainerRef}
                    className={`relative shadow-2xl shadow-neutral-200/50 bg-white transition-all duration-500 ${
                        isFullscreen 
                        ? 'w-full h-full fixed inset-0 z-50 rounded-none' 
                        : 'aspect-[16/9] w-full max-h-full rounded-lg overflow-hidden ring-1 ring-notebook-accent'
                    }`}
                >
                    {currentSlide.imageUrl ? (
                        <img 
                            src={currentSlide.imageUrl} 
                            alt={currentSlide.textContent.mainTitle}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center gap-4">
                            {currentSlide.isGenerating ? (
                                <>
                                    <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                                    <p className="font-serif italic text-indigo-400 animate-pulse">Rendering visual...</p>
                                </>
                            ) : (
                                <div className="text-notebook-accent">
                                    <div className="w-16 h-16 rounded-full bg-notebook-bg animate-pulse mx-auto mb-4" />
                                    <p className="font-serif italic">Waiting for generation queue...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* On-Image Navigation (Visible on hover) */}
                    {!isFullscreen && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                disabled={currentSlideIndex === 0}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg opacity-0 hover:opacity-100 disabled:hidden transition-all hover:scale-105 z-10"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                disabled={currentSlideIndex === slides.length - 1}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg opacity-0 hover:opacity-100 disabled:hidden transition-all hover:scale-105 z-10"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Thumbnails Strip (Inside the visual stage for proximity) */}
            <div className="mt-6 h-16 w-full flex justify-center">
                 <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full px-4 py-1">
                    {slides.map((slide, idx) => (
                        <button
                            key={slide.id}
                            onClick={() => setCurrentSlideIndex(idx)}
                            className={`relative flex-shrink-0 aspect-video h-full rounded-md overflow-hidden transition-all duration-300 border ${
                            idx === currentSlideIndex 
                                ? 'ring-2 ring-indigo-500 ring-offset-2 border-transparent scale-105 shadow-md' 
                                : 'border-notebook-accent opacity-60 hover:opacity-100 hover:scale-105'
                            }`}
                        >
                            {slide.imageUrl ? (
                                <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-notebook-bg flex items-center justify-center">
                                    <div className={`w-2 h-2 rounded-full ${slide.isGenerating ? 'bg-indigo-400 animate-bounce' : 'bg-notebook-accent'}`} />
                                </div>
                            )}
                        </button>
                    ))}
                 </div>
            </div>

        </div>
      </div>

    </div>
  );
};

export default SlideViewer;