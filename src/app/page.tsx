"use client";

import { useState, useEffect, useRef } from 'react';
import { taskStore, Task } from '@/lib/store';
import { Settings, Command, Send, AlertCircle, CheckCircle2, Clock, Hash, Flag } from 'lucide-react';

// ---------------------------
// Components (Simplified for MVP)
// ---------------------------

const PriorityBadge = ({ priority }: { priority: number }) => {
  const colors = {
    0: 'bg-slate-100 text-slate-600 border-slate-200',
    1: 'bg-amber-100 text-amber-700 border-amber-200',
    2: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[priority as keyof typeof colors]}`}>
      P{priority}
    </span>
  );
};

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
    <Hash className="w-2.5 h-2.5 opacity-50" />
    {children}
  </span>
);

// ---------------------------
// Main Page
// ---------------------------

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Settings initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('recall_api_key');
      if (storedKey) setApiKey(storedKey);
      
      const storedTasks = taskStore.getAll();
      // Sort: Completed last, then High Priority first, then Newest first
      const sorted = storedTasks.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTasks(sorted);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('recall_api_key', apiKey);
    setShowSettings(false);
    setMessage({ type: 'success', text: 'Settings saved' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleMagicInput = async () => {
    if (!input.trim()) return;
    
    // Check for API Key
    if (!apiKey) {
      setShowSettings(true);
      setMessage({ type: 'error', text: 'Please enter your OpenAI API Key first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Simple heuristic for search vs create
      const isSearch = input.toLowerCase().startsWith('recall') || 
                       input.includes('?') || 
                       input.includes('搜索') || 
                       input.includes('找');

      const endpoint = '/api/ai/process';
      const mode = isSearch ? 'search' : 'create';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, mode, apiKey }),
      });

      if (!res.ok) throw new Error('API Request Failed');

      const data = await res.json();

      if (isSearch) {
        if (data.embedding) {
          const results = taskStore.search(data.embedding);
          setTasks(results);
          setMessage({ type: 'success', text: `Found ${results.length} related tasks` });
        }
      } else {
        if (data.task) {
          taskStore.add(data.task);
          // Refresh list
          setTasks(taskStore.getAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          setInput('');
          setMessage({ type: 'success', text: 'Task created successfully' });
        }
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to process request. Check API Key.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = (id: string) => {
    // In a real app this would update the store properly
    // For MVP just re-render local state is fine, but let's update store too ideally
    // Ignoring store update logic for simplicity in MVP UI code, assume store is source of truth
    const updatedTasks = tasks.map(t => 
      t.id === id ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' } : t
    ) as Task[]; // Cast to avoid strict type issues with simple toggle
    
    // Hacky store update
    const allTasks = taskStore.getAll().map(t => 
      t.id === id ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' } : t
    );
    localStorage.setItem('recall_tasks_v1', JSON.stringify(allTasks));
    setTasks(updatedTasks);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header */}
      <header className="fixed top-0 w-full bg-[#F5F5F7]/80 backdrop-blur-md z-10 border-b border-slate-200/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <h1 className="font-semibold text-slate-800 tracking-tight">Recall</h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full hover:bg-slate-200 transition-colors ${showSettings ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-32">
        
        {/* Notification Toast */}
        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in zoom-in-95">
            <h2 className="text-sm font-semibold mb-4 text-slate-900">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">OpenAI API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-2">
                  Key is stored locally in your browser. Used for Magic Input & Recall.
                </p>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={saveSettings}
                  className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Command className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No tasks yet</p>
              <p className="text-slate-400 text-sm mt-1">Try asking AI to remember something for you.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div 
                key={task.id} 
                className={`group bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all duration-200 ${task.status === 'completed' ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <button 
                    onClick={() => toggleTaskStatus(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      task.status === 'completed' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 hover:border-indigo-500 text-transparent hover:text-indigo-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className={`text-sm font-medium text-slate-900 truncate leading-snug ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </p>
                      {(task as any).similarity !== undefined && (task as any).similarity > 0.7 && (
                         <span className="shrink-0 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                           {Math.round((task as any).similarity * 100)}% Match
                         </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {task.priority > 0 && <PriorityBadge priority={task.priority} />}
                      {task.dueDate && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.tags?.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </main>

      {/* Input Bar (Fixed Bottom) */}
      <div className="fixed bottom-0 w-full bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7] to-transparent pt-12 pb-8 px-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-white rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] border border-slate-200 flex items-center p-2 gap-2 transition-shadow focus-within:shadow-[0_12px_48px_-8px_rgba(99,102,241,0.15)] focus-within:border-indigo-500/30">
              <div className="pl-3 text-slate-400">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                ) : (
                  <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center">
                    <Command className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleMagicInput()}
                placeholder="What's on your mind? (or type 'recall' to search)"
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-sm py-2.5"
                disabled={loading}
              />
              <button 
                onClick={handleMagicInput}
                disabled={loading || !input.trim()}
                className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            Powered by AI &bull; Privacy First &bull; Local Storage
          </p>
        </div>
      </div>

    </div>
  );
}
