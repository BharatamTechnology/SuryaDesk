import React, { useState, useEffect } from 'react';
import { kwService } from '../services/kwService';
import { Save, Plus, Trash2, X } from 'lucide-react';

export default function KWUploadModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState('1 Phase');
  const [kwValues, setKwValues] = useState<string[]>([]);
  const [newKw, setNewKw] = useState('');

  useEffect(() => {
    kwService.getKwOptions(phase).then(setKwValues);
  }, [phase]);

  const handleSave = async () => {
    await kwService.saveKwOptions(phase, kwValues);
    onClose();
  };

  const addKw = () => {
    if (newKw && !kwValues.includes(newKw)) {
      setKwValues([...kwValues, newKw]);
      setNewKw('');
    }
  };

  const removeKw = (val: string) => {
    setKwValues(kwValues.filter(v => v !== val));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900">Manage KW Options</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">Select Phase</label>
          <select 
            value={phase} 
            onChange={(e) => setPhase(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg"
          >
            <option value="1 Phase">1 Phase</option>
            <option value="3 Phase">3 Phase</option>
          </select>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <input 
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              placeholder="Add new KW (e.g., 5 KW 3PH)"
            />
            <button onClick={addKw} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
          {kwValues.map(val => (
            <div key={val} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
              <span>{val}</span>
              <button onClick={() => removeKw(val)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <button onClick={handleSave} className="w-full bg-emerald-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-bold">
          <Save className="w-5 h-5" /> Save Changes
        </button>
      </div>
    </div>
  );
}
