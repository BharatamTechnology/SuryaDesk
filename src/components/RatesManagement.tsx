import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Download, 
  Search, 
  Edit2, 
  Trash2, 
  Plus, 
  X, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  FileJson, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Copy 
} from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { RATE_TABLE as DEFAULT_RATE_TABLE } from '../constants/rates';

export default function RatesManagement() {
  const [rates, setRates] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Custom manual edit states
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ kw: string; price: string }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const dbRates = await settingsService.getRates();
      if (dbRates && Object.keys(dbRates).length > 0) {
        setRates(dbRates);
      } else {
        // Fallback to default copy
        setRates(JSON.parse(JSON.stringify(DEFAULT_RATE_TABLE)));
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to fetch rates from database.', type: 'error' });
      setRates(JSON.parse(JSON.stringify(DEFAULT_RATE_TABLE)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleSaveAll = async (targetRates: Record<string, Record<string, number>>) => {
    try {
      await settingsService.saveRates(targetRates);
      setRates(targetRates);
      setMessage({ text: 'Rates updated and published successfully.', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to publish rates to the database.', type: 'error' });
    }
  };

  // Helper to toggle expanded category view
  const toggleExpand = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Filter keys based on search query
  const filteredCategories = useMemo(() => {
    return Object.keys(rates).filter(key => 
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rates, searchQuery]);

  // Export current rates to a JSON file
  const handleExportJSON = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(rates, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', 'solar_rates_config.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setMessage({ text: 'Rates configuration exported successfully.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to export configuration.', type: 'error' });
    }
  };

  // Parse and validate rates JSON
  const validateAndImportRates = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Root structure must be a JSON object of category packages.');
      }

      const validated: Record<string, Record<string, number>> = {};

      for (const category in parsed) {
        if (typeof parsed[category] !== 'object' || parsed[category] === null || Array.isArray(parsed[category])) {
          throw new Error(`Package "${category}" must contain a key-value object mapping kW strings to number rates.`);
        }
        
        validated[category] = {};
        for (const kw in parsed[category]) {
          const val = parsed[category][kw];
          const numVal = Number(val);
          if (isNaN(numVal) || numVal < 0) {
            throw new Error(`Rate value for "${category}" -> "${kw}" must be a valid positive number.`);
          }
          validated[category][kw] = numVal;
        }
      }

      if (Object.keys(validated).length === 0) {
        throw new Error('JSON structure is empty.');
      }

      // Automatically publish to database on valid upload
      handleSaveAll(validated);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: `Invalid Rates File: ${err.message}`, type: 'error' });
    }
  };

  // File picker handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        validateAndImportRates(text);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          validateAndImportRates(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset to default constants
  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure you want to revert all rates to system default presets? This will overwrite your current Firestore configuration.")) {
      handleSaveAll(JSON.parse(JSON.stringify(DEFAULT_RATE_TABLE)));
    }
  };

  // Delete category
  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Are you sure you want to delete the rate config category "${cat}"?`)) {
      const updated = { ...rates };
      delete updated[cat];
      handleSaveAll(updated);
    }
  };

  // Clone/Copy category
  const handleCloneCategory = (cat: string) => {
    const prefix = prompt(`Enter name for the cloned category:`, `${cat}_COPY`);
    if (!prefix) return;
    const cleanName = prefix.trim();
    if (!cleanName) return;
    if (rates[cleanName]) {
      alert("A category with this name already exists.");
      return;
    }
    const updated = { 
      ...rates,
      [cleanName]: JSON.parse(JSON.stringify(rates[cat]))
    };
    handleSaveAll(updated);
  };

  // Start editing single category inline
  const startEditCategory = (cat: string) => {
    setEditingCategory(cat);
    const fields = Object.entries(rates[cat]).map(([kw, rate]) => ({
      kw,
      price: String(rate)
    }));
    setEditFields(fields.length > 0 ? fields : [{ kw: '', price: '' }]);
  };

  // Save manual category edits
  const saveCategoryEdits = () => {
    if (!editingCategory) return;

    // Validate entries
    const categoryRates: Record<string, number> = {};
    for (const f of editFields) {
      const kw = f.kw.trim();
      const price = Number(f.price);
      if (!kw) {
        setMessage({ text: 'kW key cannot be blank.', type: 'error' });
        return;
      }
      if (isNaN(price) || price < 0) {
        setMessage({ text: `Invalid price rating value defined for "${kw}".`, type: 'error' });
        return;
      }
      categoryRates[kw] = price;
    }

    const updated = {
      ...rates,
      [editingCategory]: categoryRates
    };

    handleSaveAll(updated);
    setEditingCategory(null);
  };

  // Add category manual action
  const handleAddCategory = () => {
    const cleanCat = newCategoryName.trim();
    if (!cleanCat) {
      setMessage({ text: 'Please enter a valid package category name.', type: 'error' });
      return;
    }
    if (rates[cleanCat]) {
      setMessage({ text: 'A category with this name already exists.', type: 'error' });
      return;
    }

    const updated = {
      ...rates,
      [cleanCat]: {
        "3.1 KW 1PH": 150000,
        "5 KW 3PH": 250000
      }
    };

    handleSaveAll(updated);
    setNewCategoryName('');
    setShowAddCategoryForm(false);
    setExpandedCategories(prev => ({ ...prev, [cleanCat]: true }));
  };

  return (
    <div id="solar_rates_dashboard" className="flex flex-col gap-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 id="rates-primary-title" className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileJson className="w-5 h-5 text-indigo-500" />
            Solar Rates and Tariff Configurator
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Dynamic system pricing index. Changes sync in real-time across financial quotation views.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:self-end">
          <button
            id="export-rates-btn"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Backup JSON
          </button>
          
          <button
            id="reset-rates-defaults-btn"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 text-amber-700 hover:text-amber-800 hover:bg-amber-50 text-xs font-semibold rounded-lg transition-all"
            title="Restore system built-in rates"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            id="rates-status-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border border-rose-100'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Upload Center + Search list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Config upload and quick helper */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Quick upload card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 flex flex-col gap-4">
            <h3 id="bulk-uploader-title" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Bulk Configuration Tool
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a rate sheet in formatted JSON to adjust all kW tiers instantly. 
            </p>

            <form 
              id="rates-drag-area"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50/50' 
                  : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Upload className="mx-auto w-8 h-8 text-slate-400 mb-3" />
              <p className="text-xs font-bold text-slate-700">Drag file here or click to browse</p>
              <p className="text-[10px] text-slate-400 mt-1">Accepts raw JSON configurationsOnly</p>
            </form>

            <div className="bg-white rounded-xl p-4 border border-slate-200/50 flex flex-col gap-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Example Schema Format</h4>
              <pre className="text-[9px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg overflow-x-auto">
{`{
  "JaipurDCRDIAMOND": {
    "3.1 KW 1PH": 190000,
    "3.7 KW 1PH": 229000
  },
  "JaipurDCRGOLD": {
    "3.1 KW 1PH": 179000
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Search, Add, List, and Edit categories */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-rates-category-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search package tier name (e.g. DCR, Gold, Jaipur)..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 placeholder-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Expand / Add Category controls */}
            <div className="flex items-center gap-2">
              <button
                id="toggle-add-cat-btn"
                onClick={() => setShowAddCategoryForm(!showAddCategoryForm)}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Package
              </button>
            </div>
          </div>

          {/* Inline Form to Add New Category */}
          {showAddCategoryForm && (
            <motion.div
              id="add-category-inner-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-bold text-indigo-900">Create Dynamic Package Group</span>
                <button onClick={() => setShowAddCategoryForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="new-category-name-input"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. JaipurNDCRBRONZE"
                  className="flex-1 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold focus:outline-none"
                />
                <button
                  id="confirm-add-cat-btn"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Add Package Group
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Will be populated with default rate structures (3.1 KW and 5 KW keys). You can modify them instantly.
              </p>
            </motion.div>
          )}

          {/* Loader or Categories Area */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">
              Fetching Rates Database Configurations...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border rounded-2xl text-slate-400 text-xs font-semibold">
              No matching package categories found.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredCategories.map((catKey) => {
                const isExpanded = !!expandedCategories[catKey];
                const itemsCount = Object.keys(rates[catKey] || {}).length;

                return (
                  <div key={catKey} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-slate-200/80">
                    
                    {/* Header Row */}
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 gap-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleExpand(catKey)}
                          className="text-slate-400 hover:text-indigo-500 shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 break-all block">{catKey}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{itemsCount} Tier Rating Records</span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEditCategory(catKey)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Manage kW Tiers"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCloneCategory(catKey)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Clone as Copy"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(catKey)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Table View of kW tiers */}
                    {isExpanded && !editingCategory && (
                      <div className="p-4 border-t border-slate-100 bg-white">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                                <th className="py-2">System kW Tier</th>
                                <th className="py-2 text-right">Published Rate (INR)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(rates[catKey]).length === 0 ? (
                                <tr>
                                  <td colSpan={2} className="py-3 text-center text-slate-400 font-medium">No values. Click edit icon to add.</td>
                                </tr>
                              ) : (
                                Object.entries(rates[catKey]).map(([kw, val]) => (
                                  <tr key={kw} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="py-2 font-black text-slate-700">{kw}</td>
                                    <td className="py-2 text-right font-bold text-slate-900">₹{val.toLocaleString()}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Active Editing State Overlay/Panel per package */}
                    {editingCategory === catKey && (
                      <div className="p-4 bg-slate-50/70 border-t border-indigo-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                          <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                            <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                            Editing Tiers for {catKey}
                          </span>
                          <span className="text-[10px] text-slate-400">Add, rename, or set rate values manually</span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {editFields.map((field, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={field.kw}
                                onChange={(e) => {
                                  const updated = [...editFields];
                                  updated[idx].kw = e.target.value;
                                  setEditFields(updated);
                                }}
                                placeholder="kW String (e.g. 3.1 KW 1PH)"
                                className="flex-1 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none"
                              />
                              <div className="relative w-44">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                                <input
                                  type="number"
                                  value={field.price}
                                  onChange={(e) => {
                                    const updated = [...editFields];
                                    updated[idx].price = e.target.value;
                                    setEditFields(updated);
                                  }}
                                  placeholder="Tariff"
                                  className="w-full pl-6 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-black focus:outline-none"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const updated = editFields.filter((_, fIdx) => fIdx !== idx);
                                  setEditFields(updated.length > 0 ? updated : [{ kw: '', price: '' }]);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-1.5">
                          <button
                            onClick={() => setEditFields([...editFields, { kw: '', price: '' }])}
                            className="flex items-center gap-1 px-3 py-1.5 border border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs font-bold rounded-lg transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add kW Record Row
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-lg transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveCategoryEdits}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
