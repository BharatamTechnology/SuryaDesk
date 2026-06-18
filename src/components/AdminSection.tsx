import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Clock, 
  FileJson, 
  ArrowLeft, 
  Settings, 
  Sparkles, 
  ChevronRight,
  ShieldAlert,
  Sliders,
  HelpCircle
} from 'lucide-react';
import UserManagement from './UserManagement';
import StepDeadlineManager from './StepDeadlineManager';
import RatesManagement from './RatesManagement';

type SubView = 'hub' | 'users' | 'deadlines' | 'rates';

export default function AdminSection() {
  const [currentView, setCurrentView] = useState<SubView>('hub');

  // Definition of the admin cards
  const adminModules = [
    {
      id: 'users' as SubView,
      title: 'User & Team Directory',
      shortTitle: 'Users',
      description: 'Manage platform access, invite pre-sales stewards, seed core staff, and assign roles across Executive, Accountant, and Admin tiers.',
      icon: Users,
      color: 'text-indigo-500 bg-indigo-50 border-indigo-100',
      badge: 'Team Access'
    },
    {
      id: 'deadlines' as SubView,
      title: 'Workflow SLAs & Deadlines',
      shortTitle: 'SLAs',
      description: 'Configure target ETA duration in hours for key workflow steps. Keeps business operations of solar prospects accountable on timelines.',
      icon: Clock,
      color: 'text-amber-500 bg-amber-50 border-amber-100',
      badge: 'Timeline Targets'
    },
    {
      id: 'rates' as SubView,
      title: 'Tariff & kW Rates Configurator',
      shortTitle: 'Rates',
      description: 'Review cost tables for DCR and Non-DCR solar packages. Conduct bulk JSON uploads, back up rate states, and manage system pricing.',
      icon: FileJson,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
      badge: 'Pricing Sheets'
    }
  ];

  return (
    <div id="admin-management-portal" className="min-h-full">
      {/* Dynamic Sub-Header with breadcrumb/pill navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('hub')}
            className={`p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors ${currentView === 'hub' ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-700'}`}
            disabled={currentView === 'hub'}
            title="Return to Admin Hub"
          >
            <Settings className="w-4 h-4 animate-spin-slow" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <span 
              onClick={() => setCurrentView('hub')} 
              className={`cursor-pointer transition-colors hover:text-slate-950 ${currentView === 'hub' ? 'text-slate-900 font-black text-sm' : ''}`}
            >
              System Controls
            </span>
            {currentView !== 'hub' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-900 capitalize font-black">
                  {currentView === 'users' ? 'User Accounts' : currentView === 'deadlines' ? 'Step SLAs' : 'Tariff Rates'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Pill navigations directly visible within sub-windows */}
        {currentView !== 'hub' && (
          <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto gap-0.5">
            <button
              onClick={() => setCurrentView('hub')}
              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-slate-600 hover:text-slate-950 transition-all flex items-center gap-1"
            >
              Hub
            </button>
            {adminModules.map((m) => (
              <button
                key={m.id}
                onClick={() => setCurrentView(m.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all uppercase tracking-wider ${
                  currentView === m.id 
                    ? 'bg-white text-slate-950 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m.shortTitle}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {currentView === 'hub' ? (
          <motion.div
            key="hub-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-8"
          >
            {/* Elegant welcoming banner */}
            <div className="relative overflow-hidden bg-slate-900 text-white p-8 md:p-10 rounded-2xl border border-slate-850 shadow-md">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-slate-800 rounded-full opacity-20 blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/15 rounded-full opacity-30 blur-3xl pointer-events-none" />
              
              <div className="max-w-2xl relative z-10 flex flex-col gap-3">
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-widest rounded-lg self-start">
                  Administration Workbench
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  System Parameter Workspace
                </h1>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-semibold">
                  Control internal solar parameters, configure service steps, structure team member access tiers, and publish updated kilowatt rate sheets in real-time.
                </p>
              </div>
            </div>

            {/* Hub Dashboard Modules */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-1">
                Aministration Modules
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {adminModules.map((m) => {
                  const Icon = m.icon;
                  return (
                    <motion.div
                      key={m.id}
                      onClick={() => setCurrentView(m.id)}
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="cursor-pointer group flex flex-col bg-white hover:bg-slate-50/20 border border-slate-200/70 hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all h-full justify-between"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-xl border ${m.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400/80 uppercase bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            {m.badge}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                            {m.title}
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                            {m.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-6 text-xs text-slate-500 font-extrabold border-t border-slate-100 pt-4 group-hover:text-slate-900">
                        <span>Launch Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Quick Warning/Help Section */}
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Privileged Session Disclaimer</h4>
                <p className="text-[10px] text-amber-800 leading-normal font-medium mt-1">
                  Access to these files is restricted to authorized personnel. Edits committed here will alter global workflow timelines and dynamic rate pricing indices used in billing modules.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sandbox-workspace"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-6"
          >
            {/* Control breadcrumb back key */}
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('hub')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-extrabold group bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Admin Settings Hub</span>
              </button>
            </div>

            {/* Separate Dedicated Window Container */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
              {currentView === 'users' && <UserManagement />}
              {currentView === 'deadlines' && <StepDeadlineManager />}
              {currentView === 'rates' && <RatesManagement />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
