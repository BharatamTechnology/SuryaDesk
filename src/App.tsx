/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { auth, db } from "./lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from "firebase/auth";
import { doc, getDocFromServer } from 'firebase/firestore';
import { 
  Sun, 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  User as UserIcon,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  FileText,
  Settings,
  Menu,
  Wrench,
  Calculator,
  X,
  CreditCard,
  ClipboardList,
  BarChart3,
  Maximize,
  Minimize,
  Download,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Dashboard from "./components/Dashboard";
import LeadForm from "./components/LeadForm";
import LeadDetail from "./components/LeadDetail";
import AdminSection from "./components/AdminSection";
import { ServiceManagement } from "./components/ServiceManagement";
import { CommissionManagement } from "./components/CommissionManagement";
import { PaymentManagement } from "./components/PaymentManagement";
import TaskSheet from "./components/TaskSheet";
import MISReport from "./components/MISReport";
import { NotificationBell } from "./components/NotificationBell";
import { userService } from "./services/userService";
import { leadService } from "./services/leadService";
import { notificationService } from "./services/notificationService";
import { settingsService } from "./services/settingsService";
import { companyService } from "./services/companyService";
import { RATE_TABLE } from "./constants/rates";
import { AppUser, Lead, Tab } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppUser['role'] | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [companyNameInput, setCompanyNameInput] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "new-lead" | "detail" | "admin" | "services" | "commission" | "payments" | "tasks" | "mis">("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [initialStepId, setInitialStepId] = useState<number | null>(null);
  const [initialTab, setInitialTab] = useState<Tab | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  useEffect(() => {
    async function checkPendingTasks() {
      if (user?.email && role) {
        const leads = await leadService.getAllLeads(role, user.email) as unknown as Lead[];
        if (leads) {
          const normalizedEmail = user.email.toLowerCase().trim();
          const ASSIGNEE_MAP = {
            'assignedToEmail': 'isSurveySubmitted',
            'assignedSalesEmail': 'isSalesSubmitted',
            'projectAssigneeEmail': 'isFinancialsSubmitted',
            'accAssigneeEmail': 'isAccountsSubmitted',
            'execution_assignedToEmail': 'isExecutionSubmitted'
          };

          const count = leads.filter(l => {
            return Object.entries(ASSIGNEE_MAP).some(([emailField, submissionField]) => {
              const email = (l as any)[emailField];
              const isSubmitted = (l as any)[submissionField];
              return typeof email === 'string' && 
                     email.toLowerCase().trim() === normalizedEmail && 
                     !isSubmitted;
            });
          }).length;
          setPendingCount(count);
        }
      }
    }
    checkPendingTasks();
  }, [user, role, activeTab]); // Re-check when coming back to dashboard

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email) {
        // Request notification permission and activate token registration on app launch
        try {
          if (typeof window !== "undefined" && "Notification" in window) {
            notificationService.requestAndSaveToken(u.email);
          }
        } catch (err) {
          console.error("Error setting up push registration on app launch:", err);
        }

        // Special case for lead admin
        if (u.email === 'hemant.tyagi@bharatamtechnology.com') {
          setRole('Admin');
          setIsAuthorized(true);
          
          // Auto-seed if collection is empty
          try {
            const allUsers = await userService.getAllUsers();
            if (allUsers.length === 0) {
              console.log("Seeding initial users...");
              await userService.seedUsers();
            }
          } catch (e) {
            console.error("Auto-seeding failed", e);
          }
        } else {
          const userRole = await userService.getUserRole(u.email);
          if (userRole) {
            setRole(userRole);
            setIsAuthorized(true);
          } else {
            setRole(null);
            setIsAuthorized(false);
          }
        }

        // Check company membership
        try {
          const companyData = await companyService.getUserCompany(u.uid);
          if (companyData) {
            setCompanyId(companyData.companyId);
            setNeedsOnboarding(false);
          } else {
            setCompanyId(null);
            setNeedsOnboarding(true);
          }
        } catch (e) {
          console.error("Error checking company membership", e);
        }


      } else {
        setRole(null);
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoginError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        setLoginError('unauthorized-domain');
      } else if (error?.code === 'auth/operation-not-allowed' || error?.message?.includes('operation-not-allowed')) {
        setLoginError('operation-not-allowed');
      } else {
        setLoginError(error?.message || String(error));
      }
    }
  };

  const handleLogout = () => signOut(auth);


  const handleCreateCompany = async (companyName: string) => {
    if (!user || !user.email || !companyName.trim()) return;
    try {
      const result = await companyService.createCompanyAndUser(user.uid, user.email, companyName.trim());
      setCompanyId(result.companyId);
      setRole('Admin');
      setIsAuthorized(true);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("Failed to create company:", error);
      alert("Company create karne mein error aayi. Dobara try kariye.");
    }
  };

  

  useEffect(() => {
    (window as any).setActiveTab = setActiveTab;
    return () => { delete (window as any).setActiveTab; };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubRates = settingsService.subscribeToRates((customTable) => {
      if (customTable && Object.keys(customTable).length > 0) {
        for (const k in RATE_TABLE) {
          delete RATE_TABLE[k];
        }
        Object.assign(RATE_TABLE, customTable);
      }
    });
    return () => unsubRates();
  }, [user]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error attempting to toggle fullscreen:", err);
    }
  };

  const mapModuleToTabAndStep = (moduleType: string, taskId: string): { tab: Tab | null, step: number | null } => {
    let tab: Tab | null = null;
    let step: number | null = null;

    if (moduleType === 'lead_management') {
      if (taskId === 'assignedPreSales') {
        tab = 'pre_sales';
      } else {
        tab = 'basic';
      }
    } else if (moduleType === 'site_survey') {
      tab = 'survey';
    } else if (moduleType === 'project_control') {
      if (taskId === 'projectAssigneeEmail') {
        tab = 'financials';
      } else if (taskId === 'accAssigneeEmail') {
        tab = 'accounts';
      } else if (taskId === 'projectInchargeEmail') {
        tab = 'project_incharge';
      } else {
        tab = 'project_incharge';
      }
    } else if (moduleType === 'task_sheet' || taskId.startsWith('step') || taskId.startsWith('s')) {
      tab = 'timeline';
      if (taskId && typeof taskId === 'string') {
        const match = taskId.match(/s(?:tep)?(\d+)/i);
        if (match && match[1]) {
          step = parseInt(match[1], 10);
        }
      }
    } else if (moduleType === 'service_request') {
      tab = 'timeline';
    }

    return { tab, step };
  };

  useEffect(() => {
    // 1. Listen to background notifications clicked when app is already open
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const { projectId, moduleType, taskId } = event.data;
        if (projectId) {
          const { tab, step } = mapModuleToTabAndStep(moduleType || "", taskId || "");
          if (tab) setInitialTab(tab);
          if (step) setInitialStepId(step);
          setSelectedLeadId(projectId);
          setActiveTab('detail');
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // 2. Parse URL parameters on initial launch or route transition
    const parseUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const openLeadId = params.get('openLeadId');
      const moduleType = params.get('module');
      const taskId = params.get('task');

      if (openLeadId) {
        const { tab, step } = mapModuleToTabAndStep(moduleType || "", taskId || "");
        if (tab) setInitialTab(tab);
        if (step) setInitialStepId(step);
        setSelectedLeadId(openLeadId);
        setActiveTab('detail');

        // Clear search parameters safely from browser URL bar without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    };

    parseUrlParams();
    window.addEventListener('popstate', parseUrlParams);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      window.removeEventListener('popstate', parseUrlParams);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Sun className="w-12 h-12 text-yellow-500" />
        </motion.div>
      </div>
    );
  }

  if (!user || (!isAuthorized && user.email !== 'hemant.tyagi@bharatamtechnology.com')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 overflow-hidden bg-black border border-black p-1 shadow-sm">
            <img src="/icon-192.png?v=1.0.3" alt="Sitvik Solar Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sitvik Solar</h1>
          <p className="text-slate-500 mb-8">Manage your solar installation pipeline from survey to project completion.</p>
          
          {loginError && (
            <div className="mb-6 p-5 bg-amber-50 text-amber-900 rounded-2xl text-xs text-left border border-amber-200/80 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <Database className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{loginError === 'unauthorized-domain' ? 'Authorized Domain Needed' : loginError === 'operation-not-allowed' ? 'Enable Google Sign-In' : 'Firebase Login Error'}</span>
              </div>
              {loginError === 'unauthorized-domain' ? (
                <div className="space-y-2 leading-relaxed">
                  <p>
                    Your running app's domain is not authorized in the new <strong>sitvik-suryadesk</strong> Firebase project.
                  </p>
                  <p className="font-semibold text-[11px]">
                    To fix this immediately:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 font-semibold text-[10px]">
                    <li>Go to the <strong>Firebase Console</strong> for your project.</li>
                    <li>Navigate to <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.</li>
                    <li>Click <strong>Add domain</strong> and add these domains:
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 font-mono text-[9px] bg-amber-100/60 p-1.5 rounded border border-amber-200">
                        <li>{window.location.hostname}</li>
                        <li>ais-dev-mbfnwfxifwkbq3djeuk66p-376257800013.asia-east1.run.app</li>
                        <li>ais-pre-mbfnwfxifwkbq3djeuk66p-376257800013.asia-east1.run.app</li>
                      </ul>
                    </li>
                  </ol>
                </div>
              ) : loginError === 'operation-not-allowed' ? (
                <div className="space-y-2 leading-relaxed">
                  <p>
                    Google Sign-In has not been enabled in the Firebase project <strong>sitvik-suryadesk</strong>.
                  </p>
                  <p className="font-semibold text-[11px]">
                    To enable Google Sign-In immediately:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 font-semibold text-[10px]">
                    <li>Go to the <strong>Firebase Console</strong>.</li>
                    <li>Navigate to <strong>Build &gt; Authentication &gt; Sign-in method</strong>.</li>
                    <li>Click <strong>Add new provider</strong> (or edit if it exists) and select <strong>Google</strong>.</li>
                    <li>Toggle the <strong>Enable</strong> switch, configure your project support email, and click <strong>Save</strong>.</li>
                  </ol>
                </div>
              ) : (
                <p className="font-semibold leading-relaxed break-all">
                  Firebase Login Error: {loginError}
                </p>
              )}
            </div>
          )}

          {user && !isAuthorized ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                Access Denied: Your account ({user.email}) is not authorized to use this system. Please contact the administrator.
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-colors"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 rounded-full" />
              Continue with Google
            </button>
          )}
        </motion.div>
      </div>
    );
  }

if (user && isAuthorized && needsOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 overflow-hidden bg-black border border-black p-1 shadow-sm">
            <Sun className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Your Company</h1>
          <p className="text-slate-500 mb-8">Apni company ka naam dijiye SuryaDesk shuru karne ke liye.</p>

          <input
            type="text"
            value={companyNameInput}
            onChange={(e) => setCompanyNameInput(e.target.value)}
            placeholder="Company Name"
            className="w-full px-4 py-3 mb-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 outline-none"
          />

          <button
            onClick={() => handleCreateCompany(companyNameInput)}
            disabled={!companyNameInput.trim()}
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
          >
            Create Company & Continue
          </button>
        </motion.div>
      </div>
    );
  }


  

  const navigateToDetail = (id: string, stepId?: number, tab?: Tab) => {
    setSelectedLeadId(id);
    setInitialStepId(stepId || null);
    setInitialTab(tab || null);
    setActiveTab("detail");
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 text-white transition-transform duration-500 ease-in-out ${isDesktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} border-right border-white/5`}>
        <div className="flex items-center justify-between p-8 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-white/5 overflow-hidden p-0.5">
              <img src="/icon-192.png?v=1.0.3" alt="Sitvik Solar Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-white">Sitvik Solar</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-4 space-y-1">
          <button
            onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); window.history.pushState({}, "", "/"); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "dashboard" ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            CRM
            {pendingCount > 0 && (
              <span className="ml-auto bg-emerald-500 text-[10px] text-white font-black px-1.5 py-0.5 rounded-md animate-pulse">
                {pendingCount} PENDING
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab("tasks"); setIsMobileMenuOpen(false); window.history.pushState({}, "", "/"); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "tasks" ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <ClipboardList className="w-5 h-5" />
            Task Sheet
          </button>
          <button
            onClick={() => { setActiveTab("services"); setIsMobileMenuOpen(false); window.history.pushState({}, "", "/"); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "services" ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Wrench className="w-5 h-5" />
            Services
          </button>

          <button
            onClick={() => { setActiveTab("payments"); setIsMobileMenuOpen(false); window.history.pushState({}, "", "/"); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "payments" ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <CreditCard className="w-5 h-5" />
            Payments
          </button>
          
          {(role === 'Admin' || user?.email === 'hemant.tyagi@bharatamtechnology.com') && (
            <button
              onClick={() => { setActiveTab("commission"); setIsMobileMenuOpen(false); window.history.pushState({}, "", "/"); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "commission" ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Calculator className="w-5 h-5" />
              Commission
            </button>
          )}

          <button
            onClick={() => { setActiveTab("mis"); setIsMobileMenuOpen(false); window.history.pushState({}, "", "/"); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "mis" ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <BarChart3 className="w-5 h-5" />
            MIS
          </button>
          
          {(role === 'Admin' || user?.email === 'hemant.tyagi@bharatamtechnology.com') && (
            <button
              onClick={() => { setActiveTab("admin"); setIsMobileMenuOpen(false); window.history.pushState({}, "", "/"); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "admin" ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Settings className="w-5 h-5" />
              Admin Settings
            </button>
          )}
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-4">
          <div className="bg-white/5 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="User" /> : <UserIcon className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user.displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col w-full relative z-10 transition-all duration-500 overflow-hidden h-full ${isDesktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        {/* Top Header */}
        <header className="h-14 md:h-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Menu className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button 
              onClick={() => setIsDesktopSidebarOpen(prev => !prev)}
              className="hidden lg:block p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Menu className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <h2 className="text-base md:text-xl font-display font-bold text-slate-900 capitalize tracking-tight truncate max-w-[150px] sm:max-w-none">
              {activeTab === "dashboard" ? "CRM" : activeTab.replace("-", " ")}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={toggleFullscreen} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hidden md:block"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search leads..." 
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm w-48 lg:w-64 focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all outline-none"
              />
            </div>
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg md:hidden">
              <Search className="w-5 h-5" />
            </button>
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold tracking-wider hover:bg-blue-700 transition-all shadow-md shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Download App
              </button>
            )}
            <NotificationBell userEmail={user.email!} onNavigateToProject={(id) => navigateToDetail(id)} />
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm shrink-0">
               {user.photoURL && <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" />}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-8">
          <div className={`mx-auto h-full transition-all duration-300 ${isFullscreen ? 'max-w-none w-full' : 'max-w-[100rem] w-full'}`}>
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                  <Dashboard 
                    user={user}
                    role={role}
                    onSelectLead={navigateToDetail} 
                    onNewLead={() => setActiveTab("new-lead")} 
                    searchQuery={globalSearchQuery}
                  />
                </motion.div>
              )}
              {activeTab === "new-lead" && (
                <motion.div
                  key="new-lead"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <LeadForm user={user} onCancel={() => setActiveTab("dashboard")} onSuccess={() => setActiveTab("dashboard")} />
                </motion.div>
              )}
              {activeTab === "detail" && selectedLeadId && (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <LeadDetail 
                    leadId={selectedLeadId} 
                    user={user}
                    role={role}
                    initialStepId={initialStepId || undefined}
                    initialTab={initialTab || undefined}
                    onBack={() => {
                      setActiveTab("dashboard");
                      setInitialStepId(null);
                      setInitialTab(null);
                    }} 
                  />
                </motion.div>
              )}
              {activeTab === "admin" && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                  <AdminSection />
                </motion.div>
              )}
              {activeTab === "services" && (
                <motion.div
                  key="services"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                   <ServiceManagement user={{ name: user.displayName || 'User', email: user.email!, role: role || 'Executive' }} />
                </motion.div>
              )}
              {(role === 'Admin' || user?.email === 'hemant.tyagi@bharatamtechnology.com') && activeTab === "commission" && (
                <motion.div
                  key="commission"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                   <CommissionManagement userEmail={user.email!} isAdmin={role === 'Admin' || user?.email === 'hemant.tyagi@bharatamtechnology.com'} />
                </motion.div>
              )}
              {activeTab === "payments" && (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                   <PaymentManagement user={{ name: user.displayName || 'User', email: user.email!, role: role || 'Executive' }} />
                </motion.div>
              )}
              {activeTab === "tasks" && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                   <TaskSheet 
                    user={user} 
                    role={role} 
                    onSelectTask={navigateToDetail}
                   />
                </motion.div>
              )}
              {activeTab === "mis" && (
                <motion.div
                  key="mis"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                   <MISReport 
                    user={user} 
                    role={role} 
                    onSelectLead={navigateToDetail}
                   />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

