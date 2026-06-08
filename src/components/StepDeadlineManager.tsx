import React, { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';
import { Save, Loader2, Clock } from 'lucide-react';
import { STEPS } from '../constants/steps';

export default function StepDeadlineManager() {
  const [deadlines, setDeadlines] = useState<{ [stepId: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      const dbSettings = await settingsService.getSettings();
      if (dbSettings.stepDeadlines) {
        setDeadlines(dbSettings.stepDeadlines);
      } else {
        // Initialize with default 0 if mapping not exists
        const initialMap: any = {};
        STEPS.forEach(s => {
          initialMap[s.id] = 0;
        });
        setDeadlines(initialMap);
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error loading deadlines configuration', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await settingsService.updateStepDeadlines(deadlines);
      setMessage({ text: 'Step deadlines saved successfully.', type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error saving config', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 pb-10 mt-8 bg-zinc-50 border border-slate-100 rounded-2xl">
        <h2 className="text-xl flex items-center font-bold text-slate-800 gap-3">
          <Clock className="w-6 h-6 text-zinc-900" />
          Step Deadlines (ETA Configuration)
        </h2>
        <div className="flex justify-center my-8 text-indigo-600">
           <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 mt-8 bg-zinc-50 border border-slate-100 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl flex items-center font-bold text-slate-800 gap-3">
            <Clock className="w-6 h-6 text-zinc-900" />
            Step Deadlines Configuration
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure the required number of working days for each specific step. This automatically computes if a lead is "On Time" or "Delayed".
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 min-w-[120px]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Config
        </button>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {STEPS.map((step, index) => {
          let displayIndex: string | number = '';
          if (index === 0) displayIndex = 'A';
          else if (index === 1) displayIndex = 'B';
          else if (index === 2) displayIndex = 'C';
          else if (index === 3) displayIndex = 'D';
          else displayIndex = index - 3; // index 4 -> 1, index 5 -> 2, etc.

          return (
          <div key={step.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                  {displayIndex}
                </span>
                <h3 className="font-bold text-sm text-slate-800 line-clamp-1" title={step.title}>{step.title}</h3>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Required Days
              </label>
              <div className="flex items-center relative">
                <input
                  type="number"
                  min="0"
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900"
                  value={deadlines[step.id] || ''}
                  onChange={(e) => setDeadlines(prev => ({ ...prev, [step.id]: parseInt(e.target.value) || 0 }))}
                />
                <span className="absolute right-3 text-xs font-bold text-slate-400">days</span>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
