import React from 'react';

const ProcessingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-neutral-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-white rounded-full shadow-sm flex items-center justify-center">
             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <h2 className="font-serif text-2xl text-notebook-text mb-2">Analyzing Narrative</h2>
      <p className="text-notebook-secondary text-sm animate-pulse">Detecting language • Extracting metaphors • Designing layout</p>
      
      <div className="mt-8 flex gap-2">
         <div className="w-12 h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 animate-[width_1s_ease-in-out_infinite] w-full origin-left"></div>
         </div>
      </div>
    </div>
  );
};

export default ProcessingState;