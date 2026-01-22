"use client";

import { useState, useEffect, useRef } from 'react';
import { taskStore, Task } from '@/lib/store';
import {
  Settings, Command, Send, Search, Plus,
  Calendar, Inbox, Sun, Star, Trash2,
  Menu, X, CheckCircle2, Circle, MoreVertical,
  AlignLeft, Flag, Tag as TagIcon, Hash
} from 'lucide-react';

// ---------------------------
// Components
// ---------------------------

const SidebarItem = ({ icon: Icon, label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'bg-[#2C2C2C] text-white' : 'text-[#888888] hover:bg-[#2C2C2C] hover:text-[#CCCCCC]'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    {count > 0 && <span className="text-xs text-[#666666]">{count}</span>}
  </button>
);

const TaskItem = ({ task, selected, onClick, onToggle }: any) => (
  <div 
    onClick={onClick}
    className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border-b border-[#222222] ${
      selected ? 'bg-[#2C2C2C]' : 'hover:bg-[#222222]'
    }`}
  >
    <button 
      onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
        task.status === 'completed' 
          ? 'bg-[#5E5E5E] border-[#5E5E5E] text-white' 
          : 'border-[#555555] hover:border-[#888888]'
      }`}
    >
      {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
    </button>
    
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start">
        <p className={`text-sm leading-snug ${
          task.status === 'completed' ? 'text-[#666666] line-through' : 'text-[#EEEEEE]'
        }`}>
          {task.title}
        </p>
        {(task as any).similarity !== undefined && (task as any).similarity > 0.7 && (
          <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded ml-2 whitespace-nowrap">
            {Math.round((task as any).similarity * 100)}%
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-1.5">
        {task.priority > 0 && (
          <span className={`text-[10px] flex items-center gap-0.5 ${
            task.priority === 2 ? 'text-red-400' : 'text-yellow-400'
          }`}>
            <Flag className="w-3 h-3 fill-current" />
            P{task.priority}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-[#888888] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.tags?.map((tag: string) => (
          <span key={tag} className="text-[10px] text-[#666666]">#{tag}</span>
        ))}
      </div>
    </div>
  </div>
);

// ---------------------------
// Main Layout
// ---------------------------

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState('inbox'); // inbox, today, next7, completed

  // Load Initial Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('recall_api_key');
      if (storedKey) setApiKey(storedKey);
      refreshTasks();
    }
  }, []);

  const refreshTasks = () => {
    const all = taskStore.getAll();
    setTasks(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  // Filter Logic
  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'completed') return t.status === 'completed';
    if (t.status === 'completed') return false; // Hide completed in other views
    
    if (activeFilter === 'today') {
      if (!t.dueDate) return false;
      const today = new Date().toDateString();
      return new Date(t.dueDate).toDateString() === today;
    }
    // ... add more filters as needed
    return true; // Default Inbox
  });

  const handleMagicInput = async () => {
    if (!input.trim()) return;
    if (!apiKey) return setShowSettings(true);

    setLoading(true);
    try {
      const isSearch = input.toLowerCase().startsWith('recall') || input.includes('?');
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        body: JSON.stringify({ input, mode: isSearch ? 'search' : 'create', apiKey }),
      });
      const data = await res.json();

      if (isSearch && data.embedding) {
        // Search Mode
        const results = taskStore.search(data.embedding);
        setTasks(results); // Replace list with search results temporarily
        setActiveFilter('search'); 
      } else if (data.task) {
        // Create Mode
        taskStore.add(data.task);
        refreshTasks();
        setInput('');
      }
    } catch (e) {
      console.error(e);
      alert('Failed. Check API Key.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (id: string) => {
    const all = taskStore.getAll();
    const target = all.find(t => t.id === id);
    if (target) {
      target.status = target.status === 'completed' ? 'todo' : 'completed';
      localStorage.setItem('recall_tasks_v1', JSON.stringify(all));
      refreshTasks();
    }
  };

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-[#EEEEEE] overflow-hidden font-sans">
      
      {/* 1. Sidebar */}
      <aside className="w-[240px] flex flex-col bg-[#222222] border-r border-[#333333]">
        {/* User Profile */}
        <div className="p-4 flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
            R
          </div>
          <div>
            <h1 className="text-sm font-semibold">Recall AI</h1>
            <p className="text-xs text-[#666666]">Pro Plan</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1">
          <SidebarItem 
            icon={Inbox} label="Inbox" count={tasks.filter(t => t.status !== 'completed').length} 
            active={activeFilter === 'inbox'} 
            onClick={() => { setActiveFilter('inbox'); refreshTasks(); }} 
          />
          <SidebarItem 
            icon={Sun} label="Today" count={0} 
            active={activeFilter === 'today'} 
            onClick={() => { setActiveFilter('today'); refreshTasks(); }} 
          />
          <SidebarItem 
            icon={Calendar} label="Next 7 Days" count={0} 
            active={activeFilter === 'next7'} 
            onClick={() => { setActiveFilter('next7'); refreshTasks(); }} 
          />
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider">
            Lists
          </div>
          <SidebarItem icon={Hash} label="Work" count={0} />
          <SidebarItem icon={Hash} label="Personal" count={0} />
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider">
            Tags
          </div>
          <SidebarItem icon={TagIcon} label="shopping" count={0} />
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-[#333333]">
          <SidebarItem icon={Trash2} label="Trash" onClick={() => setActiveFilter('completed')} active={activeFilter === 'completed'} />
          <SidebarItem icon={Settings} label="Settings" onClick={() => setShowSettings(true)} />
        </div>
      </aside>

      {/* 2. Main Task List */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#1A1A1A]">
        {/* Header */}
        <header className="h-14 border-b border-[#333333] flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {activeFilter === 'inbox' && <Inbox className="w-5 h-5 text-blue-500" />}
            {activeFilter === 'today' && <Sun className="w-5 h-5 text-yellow-500" />}
            {activeFilter === 'search' && <Search className="w-5 h-5 text-purple-500" />}
            {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
          </h2>
          <div className="flex items-center gap-4 text-[#666666]">
            <AlignLeft className="w-5 h-5 cursor-pointer hover:text-[#AAAAAA]" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-[#AAAAAA]" />
          </div>
        </header>

        {/* Magic Input */}
        <div className="px-6 py-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3 bg-[#262626] border border-[#333333] rounded-lg px-4 py-3 shadow-sm focus-within:border-[#444444] focus-within:ring-1 focus-within:ring-[#444444] transition-all">
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#444444] border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5 text-blue-500" />
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicInput()}
                placeholder="Add a task... (e.g., 'Remind me to call John tomorrow #work')"
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder-[#555555]"
                disabled={loading}
              />
              {input && (
                <button 
                  onClick={handleMagicInput}
                  className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Task List Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <div className="space-y-1">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#444444]">
                <Inbox className="w-16 h-16 mb-4 opacity-20" />
                <p>All clear</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  selected={selectedTask?.id === task.id}
                  onClick={() => setSelectedTask(task)}
                  onToggle={toggleStatus}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. Detail Sidebar (Right) */}
      {selectedTask && (
        <aside className="w-[300px] bg-[#222222] border-l border-[#333333] flex flex-col animate-in slide-in-from-right duration-200">
          <div className="h-14 border-b border-[#333333] flex items-center justify-between px-4">
            <div className="flex items-center gap-2 text-[#666666]">
              <span className="text-xs">Created {new Date(selectedTask.createdAt).toLocaleDateString()}</span>
            </div>
            <button onClick={() => setSelectedTask(null)} className="text-[#666666] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3 mb-6">
              <button 
                onClick={() => toggleStatus(selectedTask.id)}
                className={`mt-1 w-5 h-5 rounded flex items-center justify-center border ${
                  selectedTask.status === 'completed' 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-[#555555]'
                }`}
              >
                {selectedTask.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              <h3 className={`text-xl font-semibold leading-snug ${
                selectedTask.status === 'completed' ? 'line-through text-[#666666]' : ''
              }`}>
                {selectedTask.title}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">Date</label>
                <div className="flex items-center gap-2 text-sm text-[#CCCCCC]">
                  <Calendar className="w-4 h-4 text-[#666666]" />
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toDateString() : 'No Date'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">Priority</label>
                <div className="flex items-center gap-2 text-sm text-[#CCCCCC]">
                  <Flag className={`w-4 h-4 ${
                    selectedTask.priority === 2 ? 'text-red-500' : 
                    selectedTask.priority === 1 ? 'text-yellow-500' : 'text-[#666666]'
                  }`} />
                  {['None', 'Medium', 'High'][selectedTask.priority]}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.tags?.length ? selectedTask.tags.map(tag => (
                    <span key={tag} className="text-xs bg-[#333333] px-2 py-1 rounded text-[#CCCCCC]">
                      #{tag}
                    </span>
                  )) : <span className="text-sm text-[#666666]">No tags</span>}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-[#333333] text-xs text-center text-[#444444]">
            ID: {selectedTask.id}
          </div>
        </aside>
      )}

      {/* Settings Modal Overlay */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#262626] w-full max-w-md rounded-xl border border-[#333333] shadow-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-2 uppercase">OpenAI API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm text-[#AAAAAA] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { localStorage.setItem('recall_api_key', apiKey); setShowSettings(false); }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
