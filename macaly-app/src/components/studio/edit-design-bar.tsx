'use client';

import { ChevronDown, MessageCircle, Paintbrush, PenLine, Type } from 'lucide-react';
import { useState } from 'react';

export function EditDesignBar() {
  const [editing, setEditing] = useState(false);
  return <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-700 bg-slate-900/95 p-1.5 shadow-xl shadow-slate-950/50"><button type="button" onClick={() => setEditing((value) => !value)} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${editing ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-200 hover:bg-slate-800'}`}><Paintbrush className="h-3.5 w-3.5" />Edit design</button><span className="h-5 w-px bg-slate-700" /><button type="button" title="Edit text" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><Type className="h-4 w-4" /></button><button type="button" title="Style brush" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><PenLine className="h-4 w-4" /></button><button type="button" title="Add comment" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><MessageCircle className="h-4 w-4" /></button><button type="button" title="Collapse edit tools" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronDown className="h-4 w-4" /></button></div>;
}
