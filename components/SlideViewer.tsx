import React, { useRef, useState, useEffect } from 'react';
import { SlideContent } from '../types';
import { Download, ChevronLeft, ChevronRight, Play, X, Loader2, Terminal, Maximize2 } from 'lucide-react';
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

  const enterFullscreen = () => {
    if (slideContainerRef.current) {
        slideContainerRef.current.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      enterFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Navigation for Fullscreen/Presentation Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow arrow navigation if fullscreen
      if (isFullscreen) {
        if (e.key === 'ArrowRight' || e.key === 'Space') {
          if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(currentSlideIndex + 1);
        } else if (e.key === 'ArrowLeft') {
          if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentSlideIndex, slides.length, setCurrentSlideIndex]);

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
      <div className="w-full lg:w-[320px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 lg:border-r border-transparent lg:border-notebook-accent/50">
        
        {/* Title Section */}
        <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-neutral-900 text-white">
                    Slide {currentSlideIndex + 1}/{slides.length}
                </span>
                <div className="h-px bg-notebook-accent flex-1"></div>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-serif text-notebook-text leading-tight">
                {currentSlide.textContent.mainTitle}
            </h1>
            <p className="text-sm md:text-base text-notebook-secondary leading-relaxed font-light">
                {currentSlide.textContent.subTitle}
            </p>
        </div>

        {/* Prompt Card - Simplified View */}
        <div className="bg-white rounded-xl border border-notebook-accent shadow-sm p-4 space-y-3 group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between border-b border-notebook-accent/50 pb-2">
                <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-notebook-secondary" />
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-notebook-text">Final Visual Prompt</h3>
                </div>
            </div>
            <div className="relative">
                <p className="text-[10px] text-notebook-secondary font-mono leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity whitespace-pre-wrap break-words">
                    {currentSlide.visualPrompt}
                </p>
            </div>
        </div>

      </div>

      {/* RIGHT PANEL: Visual Stage */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        
        {/* Main Stage Container */}
        <div className="flex-1 bg-neutral-100/50 rounded-2xl border border-notebook-accent/50 p-4 md:p-8 flex flex-col relative overflow-hidden group-stage">
            
            {/* Toolbar - Top Right */}
            {!isFullscreen && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isDownloading || isAnySlideGenerating}
                        title={isAnySlideGenerating ? "Waiting for generation to finish..." : "Download Presentation as PDF"}
                        className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-sm border border-notebook-accent text-sm font-medium hover:bg-white hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span>PDF</span>
                    </button>

                    <button 
                        onClick={enterFullscreen}
                        className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-sm border border-notebook-accent text-sm font-medium hover:bg-indigo-50 hover:text-indigo-600 transition-all hover:scale-105"
                        title="Start Presentation (Fullscreen)"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Play</span>
                    </button>
                </div>
            )}

            {/* Image Preview Area */}
            <div className="flex-1 flex items-center justify-center w-full min-h-0 relative">
                <div 
                    ref={slideContainerRef}
                    className={`relative shadow-2xl shadow-neutral-200/50 bg-white transition-all duration-500 ${
                        isFullscreen 
                        ? 'w-full h-full fixed inset-0 z-50 rounded-none bg-black flex items-center justify-center' 
                        : 'aspect-[16/9] w-full max-h-full rounded-lg overflow-hidden ring-1 ring-notebook-accent'
                    }`}
                >
                    {currentSlide.imageUrl ? (
                        <img 
                            src={currentSlide.imageUrl} 
                            alt={currentSlide.textContent.mainTitle}
                            className={`object-contain ${isFullscreen ? 'w-full h-full' : 'w-full h-full'}`}
                        />
                    ) : (
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center gap-4">
                            {currentSlide.isGenerating ? (
                                <>
                                    <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                                    <p className="font-serif italic text-indigo-400 animate-pulse">Rendering visual...</p>
                                </>
                            ) : (
                                <div className="text-notebook-accent text-center px-4">
                                    <div className="w-16 h-16 rounded-full bg-notebook-bg animate-pulse mx-auto mb-4" />
                                    <p className="font-serif italic mb-2">Image generation failed or pending</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation Buttons (HIDDEN in Fullscreen per user request to "remove extra buttons") */}
                    {!isFullscreen && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                disabled={currentSlideIndex === 0}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg transition-all hover:scale-105 z-10 opacity-0 hover:opacity-100 disabled:opacity-0"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                disabled={currentSlideIndex === slides.length - 1}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg transition-all hover:scale-105 z-10 opacity-0 hover:opacity-100 disabled:opacity-0"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {/* Fullscreen Close Button - Only visible in fullscreen (Safety UI) */}
                    {isFullscreen && (
                        <button 
                            onClick={toggleFullscreen}
                            className="absolute top-6 right-6 p-2 bg-white/10 backdrop-blur hover:bg-white/20 text-white rounded-full transition-colors z-50 group"
                            title="Exit Fullscreen"
                        >
                            <X className="w-6 h-6 opacity-50 group-hover:opacity-100" />
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Thumbnails Strip */}
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
                                    <div className={`w-2 h-2 rounded-full ${slide.isGenerating ? 'bg-indigo-400 animate-bounce' : 'bg-red-300'}`} />
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