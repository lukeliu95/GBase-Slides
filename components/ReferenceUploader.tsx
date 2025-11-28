
import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Loader2, X, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { StyleSuggestion } from '../types';

interface ReferenceUploaderProps {
  onAnalyze: (file: File) => Promise<StyleSuggestion[]>;
  onSelectStyle: (style: string) => void;
  isAnalyzing: boolean;
}

export interface ReferenceUploaderHandle {
  triggerUpload: () => void;
  hasFile: boolean;
}

const ReferenceUploader = forwardRef<ReferenceUploaderHandle, ReferenceUploaderProps>(({ onAnalyze, onSelectStyle, isAnalyzing }, ref) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<StyleSuggestion[]>([]);
  const [error, setError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    triggerUpload: () => fileInputRef.current?.click(),
    hasFile: !!file
  }));

  const performAnalysis = async (fileToAnalyze: File) => {
    setError(false);
    try {
      const results = await onAnalyze(fileToAnalyze);
      setSuggestions(results);
      // Auto-select the first suggestion or the "Literal" one as a default base
      if (results.length > 0) {
        onSelectStyle(results[0].description);
      }
    } catch (err) {
      console.error("Failed to analyze file", err);
      setError(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
      
      setSuggestions([]);
      setError(false);
      onSelectStyle('');
      performAnalysis(selectedFile);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
    setSuggestions([]);
    setError(false);
    onSelectStyle(''); 
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!file) {
    return (
      <input 
        type="file" 
        accept="image/*,application/pdf" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    );
  }

  // Render Compact Preview Chip
  return (
    <div className="group relative inline-flex items-center gap-3 bg-white p-2 pr-3 rounded-xl border border-notebook-accent shadow-sm max-w-full animate-fade-in">
      <input 
        type="file" 
        accept="image/*,application/pdf" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <div className="relative w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200 flex-shrink-0">
        {previewUrl ? (
          <img src={previewUrl} alt="Ref" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-neutral-400 m-2.5" />
        )}
      </div>

      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-notebook-text truncate max-w-[120px]">
          {file.name}
        </span>
        <div className="flex items-center gap-1.5 h-4">
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
              <span className="text-[10px] text-indigo-500 font-medium">Analyzing...</span>
            </>
          ) : error ? (
             <button onClick={() => performAnalysis(file)} className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-medium">
               <AlertCircle className="w-3 h-3" /> Retry
             </button>
          ) : (
             <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <CheckCircle className="w-3 h-3" /> Style Active
             </span>
          )}
        </div>
      </div>

      <button 
        onClick={clearFile}
        className="ml-2 p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
});

ReferenceUploader.displayName = 'ReferenceUploader';

export default ReferenceUploader;
