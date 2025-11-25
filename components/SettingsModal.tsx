import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Key, FileText } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT } from '../services/geminiService';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.apiKey);
      setSystemPrompt(settings.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSave({ apiKey, systemPrompt });
    onClose();
  };

  const handleResetPrompt = () => {
    if (window.confirm("Reset system prompt to default?")) {
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-notebook-accent bg-notebook-bg/50">
          <h2 className="text-lg font-serif font-medium text-notebook-text">Configuration</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-notebook-secondary" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* API Key Section */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-notebook-text">
              <Key className="w-4 h-4 text-indigo-500" />
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API Key..."
                className="w-full p-3 rounded-lg border border-notebook-accent focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none text-sm font-mono"
              />
            </div>
            <p className="text-xs text-notebook-secondary">
              Your key is stored locally in your browser. Get a key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a>.
            </p>
          </div>

          <div className="h-px bg-notebook-accent" />

          {/* System Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-notebook-text">
                <FileText className="w-4 h-4 text-emerald-500" />
                System Prompt
              </label>
              <button 
                onClick={handleResetPrompt}
                className="text-xs flex items-center gap-1 text-notebook-secondary hover:text-red-500 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset Default
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="System instructions..."
              className="w-full h-64 p-4 rounded-lg border border-notebook-accent focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 outline-none text-xs font-mono leading-relaxed resize-none bg-neutral-50"
            />
             <p className="text-xs text-notebook-secondary">
              Customize the persona, style constraints, or output format instructions.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-notebook-bg border-t border-notebook-accent flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-notebook-secondary hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-notebook-text text-white hover:bg-black transition-all shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;