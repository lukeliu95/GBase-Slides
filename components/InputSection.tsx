import React, { useState } from 'react';
import { Sparkles, ArrowRight, AlignLeft, AlignJustify, Layers } from 'lucide-react';
import { TextRichness, StyleSuggestion, SlideCountOption } from '../types';
import ReferenceUploader from './ReferenceUploader';

interface InputSectionProps {
  onAnalyze: (text: string, richness: TextRichness, slideCount: SlideCountOption, referenceStyle?: string) => void;
  onAnalyzeRef: (file: File) => Promise<StyleSuggestion[]>;
  isLoading: boolean;
  isAnalyzingRef: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onAnalyze, onAnalyzeRef, isLoading, isAnalyzingRef }) => {
  const [text, setText] = useState('');
  const [richness, setRichness] = useState<TextRichness>('concise');
  const [slideCount, setSlideCount] = useState<SlideCountOption>('auto');
  const [selectedStylePrompt, setSelectedStylePrompt] = useState<string | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAnalyze(text, richness, slideCount, selectedStylePrompt);
    }
  };

  const slideCountOptions: SlideCountOption[] = ['auto', 2, 5, 8, 10, 12, 15];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-4xl mx-auto px-6 py-12 animate-fade-in">
      
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex mb-6 p-4 bg-white rounded-full shadow-sm border border-neutral-100">
            <Sparkles className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-medium text-notebook-text mb-6 tracking-tight leading-tight">
            Visual Narratives, <br/>
            <span className="italic text-notebook-secondary">Refined by AI.</span>
        </h1>
        <p className="text-notebook-secondary max-w-xl mx-auto leading-relaxed">
            Paste your content, and optionally upload a visual template. We'll handle the rest.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        
        {/* 1. Reference Upload */}
        <ReferenceUploader 
            onAnalyze={onAnalyzeRef} 
            onSelectStyle={setSelectedStylePrompt}
            isAnalyzing={isAnalyzingRef}
        />

        {/* 2. Text Input Form */}
        <form onSubmit={handleSubmit} className="w-full relative group">
            <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your article, notes, or report here..."
            className="w-full h-64 p-6 pb-24 rounded-2xl border border-notebook-accent bg-white shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 outline-none resize-none transition-all text-notebook-text placeholder-neutral-300 text-lg leading-relaxed"
            disabled={isLoading}
            />
            
            {/* Controls Bar inside TextArea */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex flex-wrap gap-2">
                {/* Richness Toggle */}
                <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-lg border border-neutral-100">
                    <button
                        type="button"
                        onClick={() => setRichness('concise')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        richness === 'concise' 
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                            : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                        title="Concise Text"
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Concise</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRichness('rich')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        richness === 'rich' 
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                            : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                        title="Rich Text"
                    >
                        <AlignJustify className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Rich</span>
                    </button>
                </div>

                {/* Slide Count Toggle */}
                <div className="flex items-center gap-2 bg-neutral-50 p-1 rounded-lg border border-neutral-100 relative">
                    <div className="px-2 border-r border-neutral-200">
                         <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <select 
                        value={slideCount}
                        onChange={(e) => setSlideCount(e.target.value === 'auto' ? 'auto' : Number(e.target.value) as SlideCountOption)}
                        className="bg-transparent text-xs font-medium text-notebook-text outline-none cursor-pointer pr-1"
                    >
                        {slideCountOptions.map(opt => (
                            <option key={opt} value={opt}>
                                {opt === 'auto' ? 'Auto Pages' : `${opt} Pages`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <button
                type="submit"
                disabled={!text.trim() || isLoading || isAnalyzingRef}
                className={`p-3 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                text.trim() && !isLoading && !isAnalyzingRef
                    ? 'bg-neutral-900 text-white shadow-lg hover:scale-105' 
                    : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                }`}
            >
                <span className="text-sm font-medium pl-1 hidden md:inline">Generate</span>
                <ArrowRight className="w-5 h-5" />
            </button>
            </div>
        </form>
      </div>

      {/* Suggestion Chips */}
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-notebook-secondary">
        <span className="opacity-50">Examples:</span>
        <button onClick={() => setText("A detailed report on the future of renewable energy in urban environments, focusing on solar glass and kinetic sidewalks.")} className="hover:text-indigo-500 transition-colors underline decoration-dotted">
          Sustainable Cities
        </button>
        <span className="opacity-30">•</span>
        <button onClick={() => setText("An essay exploring the emotional impact of color in Wes Anderson movies.")} className="hover:text-indigo-500 transition-colors underline decoration-dotted">
          Film Analysis
        </button>
      </div>
    </div>
  );
};

export default InputSection;