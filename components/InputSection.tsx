import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Palette, Paperclip, 
  SlidersHorizontal, Plus, Trash2, Check,
  AlignLeft, AlignJustify, Wand2
} from 'lucide-react';
import { TextRichness, StyleSuggestion, SlideCountOption, VisualStylePreset, UserStyle } from '../types';
import ReferenceUploader, { ReferenceUploaderHandle } from './ReferenceUploader';

interface InputSectionProps {
  onAnalyze: (text: string, richness: TextRichness, slideCount: SlideCountOption, referenceStyle?: string, visualStyle?: string) => void;
  onAnalyzeRef: (file: File) => Promise<StyleSuggestion[]>;
  isLoading: boolean;
  isAnalyzingRef: boolean;
}

const AUTO_STYLE_DESC = 'AUTO_STYLE_DETECT';

// Construct the presets list - RESTRICTED TO ONLY AUTO PER USER REQUEST
const PRESETS_LIST: VisualStylePreset[] = [
  {
    id: 'auto',
    label: 'Auto (AI Planned)',
    description: 'Custom AI Design (Pure White/Light BG)'
  }
];

const InputSection: React.FC<InputSectionProps> = ({ onAnalyze, onAnalyzeRef, isLoading, isAnalyzingRef }) => {
  const [text, setText] = useState('');
  const [richness, setRichness] = useState<TextRichness>('auto'); // Default to Auto
  const [slideCount, setSlideCount] = useState<SlideCountOption>('auto');
  
  // Style State
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  
  const [selectedStyle, setSelectedStyle] = useState<VisualStylePreset | UserStyle>(PRESETS_LIST[0]);
  const [userStyles, setUserStyles] = useState<UserStyle[]>([]);
  const [referenceStylePrompt, setReferenceStylePrompt] = useState<string | undefined>(undefined);

  // New Custom Style Input
  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleDesc, setNewStyleDesc] = useState('');

  const uploaderRef = useRef<ReferenceUploaderHandle>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Load User Styles
  useEffect(() => {
    const saved = localStorage.getItem('gbase_user_styles');
    if (saved) {
      try {
        setUserStyles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load styles", e);
      }
    }
  }, []);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target as Node)) {
        setShowStyleMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddUserStyle = () => {
    if (!newStyleName.trim() || !newStyleDesc.trim()) return;
    const newStyle: UserStyle = {
      id: `custom_${Date.now()}`,
      label: newStyleName,
      description: newStyleDesc,
      createdAt: Date.now()
    };
    const updated = [...userStyles, newStyle];
    setUserStyles(updated);
    localStorage.setItem('gbase_user_styles', JSON.stringify(updated));
    setNewStyleName('');
    setNewStyleDesc('');
    setSelectedStyle(newStyle);
  };

  const handleDeleteStyle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = userStyles.filter(s => s.id !== id);
    setUserStyles(updated);
    localStorage.setItem('gbase_user_styles', JSON.stringify(updated));
    if (selectedStyle.id === id) setSelectedStyle(PRESETS_LIST[0]);
  };

  const handleSubmit = () => {
    if (text.trim()) {
      let styleParam = '';
      if (selectedStyle.id === 'auto') {
        styleParam = 'AUTO_STYLE_DETECT';
      } else {
        // If it's a user custom style, pass the full description
        styleParam = selectedStyle.description;
      }
      
      onAnalyze(text, richness, slideCount, referenceStylePrompt, styleParam);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] w-full max-w-3xl mx-auto px-4 animate-fade-in relative">
      
      {/* Header */}
      <div className="text-center mb-10 space-y-4">
        {/* Removed Center Icon Block as requested */}
        <h1 className="text-4xl md:text-5xl font-serif font-medium text-notebook-text tracking-tight">
            Design Your Narrative
        </h1>
        <p className="text-notebook-secondary text-lg font-light">
            AI-powered storytelling with professional visual aesthetics.
        </p>
      </div>

      {/* Main Input Card */}
      <div className="w-full bg-white rounded-3xl border border-notebook-accent shadow-xl shadow-neutral-100/50 overflow-visible relative transition-all duration-300 focus-within:shadow-2xl focus-within:border-indigo-100 focus-within:ring-4 focus-within:ring-indigo-50/50">
        
        {/* Text Area */}
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What would you like to present today? Paste your article, notes, or topic..."
            className="w-full h-40 p-6 bg-transparent outline-none resize-none text-notebook-text text-lg placeholder-neutral-300 font-light leading-relaxed focus:ring-0"
            disabled={isLoading}
        />

        {/* Attachment Area (If file exists) */}
        <div className="px-6 pb-2">
           <ReferenceUploader 
              ref={uploaderRef}
              onAnalyze={onAnalyzeRef} 
              onSelectStyle={setReferenceStylePrompt}
              isAnalyzing={isAnalyzingRef}
           />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/50 border-t border-notebook-accent/30 rounded-b-3xl">
            
            {/* Left Tools */}
            <div className="flex items-center gap-2">
                
                {/* 1. Style Trigger */}
                <div className="relative" ref={styleMenuRef}>
                    <button 
                        onClick={() => setShowStyleMenu(!showStyleMenu)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent ${showStyleMenu ? 'bg-white shadow-sm border-notebook-accent text-indigo-600' : 'hover:bg-white hover:shadow-sm text-notebook-secondary hover:text-notebook-text'}`}
                        title="Visual Style"
                    >
                        <Palette className="w-4 h-4" />
                        <span className="max-w-[100px] truncate hidden sm:block">
                          {selectedStyle.id === 'auto' ? 'Auto Style' : selectedStyle.label}
                        </span>
                    </button>

                    {/* Style Popover */}
                    {showStyleMenu && (
                        <div className="absolute bottom-12 left-0 w-[340px] bg-white rounded-2xl shadow-2xl border border-notebook-accent p-4 z-50 animate-fade-in origin-bottom-left">
                            
                            {/* Tabs */}
                            <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-4">
                                <button 
                                    onClick={() => setActiveTab('presets')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'presets' ? 'bg-white shadow-sm text-notebook-text' : 'text-notebook-secondary hover:text-notebook-text'}`}
                                >
                                    Presets
                                </button>
                                <button 
                                    onClick={() => setActiveTab('custom')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'custom' ? 'bg-white shadow-sm text-notebook-text' : 'text-notebook-secondary hover:text-notebook-text'}`}
                                >
                                    My Styles
                                </button>
                            </div>

                            {/* Presets List */}
                            {activeTab === 'presets' && (
                                <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                                    {PRESETS_LIST.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => { setSelectedStyle(preset); setShowStyleMenu(false); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group ${selectedStyle.id === preset.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-neutral-50 text-notebook-text'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium flex items-center gap-1.5">
                                                    {preset.label}
                                                    {preset.id === 'auto' && <Wand2 className="w-3 h-3 text-indigo-500" />}
                                                </span>
                                                {preset.id === 'auto' ? (
                                                    <span className="text-[10px] opacity-70 text-indigo-600">Pure White Background • AI Planned</span>
                                                ) : (
                                                    <span className="text-[10px] opacity-70 truncate max-w-[200px]">{preset.description}</span>
                                                )}
                                            </div>
                                            {selectedStyle.id === preset.id && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Custom Styles List & Add */}
                            {activeTab === 'custom' && (
                                <div className="space-y-3">
                                    <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                        {userStyles.length === 0 && (
                                            <p className="text-center text-xs text-notebook-secondary py-4 italic">No custom styles yet.</p>
                                        )}
                                        {userStyles.map(style => (
                                            <button
                                                key={style.id}
                                                onClick={() => { setSelectedStyle(style); setShowStyleMenu(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${selectedStyle.id === style.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-neutral-50 text-notebook-text'}`}
                                            >
                                                <span className="font-medium truncate">{style.label}</span>
                                                <div className="flex items-center gap-2">
                                                    {selectedStyle.id === style.id && <Check className="w-3.5 h-3.5" />}
                                                    <span 
                                                        onClick={(e) => handleDeleteStyle(style.id, e)}
                                                        className="p-1 hover:bg-red-100 hover:text-red-500 rounded text-neutral-300"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="pt-3 border-t border-notebook-accent/50 space-y-2">
                                        <input 
                                            value={newStyleName}
                                            onChange={(e) => setNewStyleName(e.target.value)}
                                            placeholder="New Style Name"
                                            className="w-full px-3 py-2 bg-neutral-50 rounded-lg text-xs border border-transparent focus:bg-white focus:border-indigo-200 outline-none"
                                        />
                                        <textarea 
                                            value={newStyleDesc}
                                            onChange={(e) => setNewStyleDesc(e.target.value)}
                                            placeholder="Describe style (e.g. 'Matte painting, warm lights...')"
                                            className="w-full px-3 py-2 bg-neutral-50 rounded-lg text-xs border border-transparent focus:bg-white focus:border-indigo-200 outline-none resize-none h-16"
                                        />
                                        <button 
                                            onClick={handleAddUserStyle}
                                            disabled={!newStyleName || !newStyleDesc}
                                            className="w-full py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Add Style
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Upload Trigger */}
                <button 
                    onClick={() => uploaderRef.current?.triggerUpload()}
                    className="p-2 rounded-xl text-notebook-secondary hover:bg-white hover:shadow-sm hover:text-notebook-text transition-all border border-transparent hover:border-notebook-accent"
                    title="Attach Reference Image"
                >
                    <Paperclip className="w-4 h-4" />
                </button>

                {/* 3. Settings Trigger (Richness/Count) */}
                <div className="relative" ref={settingsMenuRef}>
                    <button 
                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                        className={`p-2 rounded-xl transition-all border border-transparent ${showSettingsMenu ? 'bg-white shadow-sm border-notebook-accent text-notebook-text' : 'text-notebook-secondary hover:bg-white hover:shadow-sm hover:text-notebook-text hover:border-notebook-accent'}`}
                        title="Output Settings"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>

                    {showSettingsMenu && (
                        <div className="absolute bottom-12 left-0 w-[240px] bg-white rounded-2xl shadow-xl border border-notebook-accent p-4 z-50 animate-fade-in">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-notebook-secondary mb-3">Content Density</h4>
                            <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-4">
                                <button
                                    onClick={() => setRichness('auto')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${richness === 'auto' ? 'bg-white shadow-sm text-indigo-600' : 'text-notebook-secondary hover:text-notebook-text'}`}
                                    title="Let AI decide based on content"
                                >
                                    <Wand2 className="w-3 h-3" /> Auto
                                </button>
                                <button
                                    onClick={() => setRichness('concise')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${richness === 'concise' ? 'bg-white shadow-sm text-indigo-600' : 'text-notebook-secondary hover:text-notebook-text'}`}
                                >
                                    <AlignLeft className="w-3 h-3" /> Concise
                                </button>
                                <button
                                    onClick={() => setRichness('rich')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${richness === 'rich' ? 'bg-white shadow-sm text-indigo-600' : 'text-notebook-secondary hover:text-notebook-text'}`}
                                >
                                    <AlignJustify className="w-3 h-3" /> Rich
                                </button>
                            </div>

                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-notebook-secondary mb-3">Slide Count</h4>
                            <div className="grid grid-cols-4 gap-1">
                                {['auto', 5, 8, 10, 12, 15].map((opt: any) => (
                                    <button
                                        key={opt}
                                        onClick={() => setSlideCount(opt)}
                                        className={`py-1.5 rounded-md text-xs font-medium transition-all ${slideCount === opt ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-neutral-50 text-notebook-secondary hover:bg-neutral-100'}`}
                                    >
                                        {opt === 'auto' ? 'Auto' : opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Right Tools - Generate */}
            <button
                onClick={handleSubmit}
                disabled={!text.trim() || isLoading || isAnalyzingRef}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                text.trim() && !isLoading && !isAnalyzingRef
                    ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-500/20 hover:scale-105 hover:bg-black' 
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
            >
                Generate
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-notebook-secondary">
        <span className="opacity-50">Try:</span>
        <button onClick={() => setText("A pitch deck for an eco-friendly coffee startup focused on sustainable sourcing.")} className="hover:text-indigo-500 transition-colors border-b border-dotted border-notebook-secondary/50 hover:border-indigo-500">
          Startup Pitch
        </button>
        <span className="opacity-30">•</span>
        <button onClick={() => setText("Explain Quantum Computing to a 10-year-old using space metaphors.")} className="hover:text-indigo-500 transition-colors border-b border-dotted border-notebook-secondary/50 hover:border-indigo-500">
          Educational Explainer
        </button>
      </div>

    </div>
  );
};

export default InputSection;