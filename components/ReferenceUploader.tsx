import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, Palette } from 'lucide-react';
import { StyleSuggestion } from '../types';

interface ReferenceUploaderProps {
  onAnalyze: (file: File) => Promise<StyleSuggestion[]>;
  onSelectStyle: (style: string) => void;
  isAnalyzing: boolean;
}

const ReferenceUploader: React.FC<ReferenceUploaderProps> = ({ onAnalyze, onSelectStyle, isAnalyzing }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<StyleSuggestion[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
      
      // Reset state
      setSuggestions([]);
      setSelectedStyleId(null);

      // Trigger analysis immediately
      try {
        const results = await onAnalyze(selectedFile);
        setSuggestions(results);
      } catch (err) {
        console.error("Failed to analyze file", err);
        // Reset file on error
        setFile(null);
        setPreviewUrl(null);
        alert("Could not analyze the image. Please check your API key and try again.");
      }
    }
  };

  const handleStyleClick = (suggestion: StyleSuggestion) => {
    setSelectedStyleId(suggestion.id);
    onSelectStyle(suggestion.description);
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setSuggestions([]);
    setSelectedStyleId(null);
    onSelectStyle(''); // Clear style
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full mb-8 animate-fade-in">
      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative border-2 border-dashed border-notebook-accent hover:border-indigo-300 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-neutral-50 flex flex-col items-center justify-center gap-3"
        >
          <div className="p-3 bg-notebook-bg rounded-full group-hover:scale-110 transition-transform shadow-sm">
             <Upload className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-notebook-text font-medium text-sm">Use a Reference Template (Optional)</p>
            <p className="text-notebook-secondary text-xs mt-1">Upload an image or slide to mimic its style</p>
          </div>
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="bg-white p-4 rounded-2xl border border-notebook-accent shadow-sm flex flex-col gap-4">
          {/* Preview Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200">
                {previewUrl ? (
                  <img src={previewUrl} alt="Reference" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-neutral-400 m-3" />
                )}
              </div>
              <div>
                 <p className="text-sm font-medium text-notebook-text truncate max-w-[200px]">{file.name}</p>
                 <button onClick={clearFile} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
            </div>
            {isAnalyzing && (
               <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium">
                 <Loader2 className="w-4 h-4 animate-spin" />
                 Analyzing Style...
               </div>
            )}
          </div>

          {/* Suggestions Grid */}
          {!isAnalyzing && suggestions.length > 0 && (
             <div className="animate-fade-in">
               <div className="flex items-center gap-2 mb-3">
                 <Palette className="w-4 h-4 text-indigo-500" />
                 <span className="text-xs font-bold uppercase tracking-wider text-notebook-secondary">Select a Style Interpretation</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 {suggestions.map((s) => (
                   <button
                     key={s.id}
                     type="button"
                     onClick={() => handleStyleClick(s)}
                     className={`text-left p-3 rounded-xl border transition-all text-xs ${
                       selectedStyleId === s.id
                         ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300'
                         : 'bg-notebook-bg border-transparent hover:border-notebook-accent hover:bg-white'
                     }`}
                   >
                     <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold ${selectedStyleId === s.id ? 'text-indigo-700' : 'text-notebook-text'}`}>{s.label}</span>
                        {selectedStyleId === s.id && <CheckCircle className="w-3 h-3 text-indigo-600" />}
                     </div>
                     <p className="text-notebook-secondary line-clamp-3 opacity-80">{s.description}</p>
                   </button>
                 ))}
               </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferenceUploader;