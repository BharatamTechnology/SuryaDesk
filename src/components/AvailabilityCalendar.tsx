import { useState, useMemo } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CircleDot, 
  Sparkles,
  UserCheck,
  Briefcase,
  AlertCircle,
  PlayCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppUser, Lead, Tab } from "../types";

interface SystemTask {
  lead: Lead;
  label: string;
  tab: Tab;
  stepId?: number;
  assignedDate: any;
  dueDate: any;
  assigneeName: string;
  assigneeEmail: string;
  isPaymentTask: boolean;
}

interface AvailabilityCalendarProps {
  users: AppUser[];
  allTasks: SystemTask[];
  onSelectTask: (leadId: string, stepId?: number, tab?: Tab) => void;
}

const parseToDate = (val: any): Date => {
  if (!val) return new Date();
  try {
    if (val instanceof Date) return val;
    if (typeof val === "object" && val.seconds !== undefined) {
      return new Date(val.seconds * 1000);
    }
    if (typeof val?.toDate === "function") {
      return val.toDate();
    }
    const parsed = new Date(val);
    if (isNaN(parsed.getTime())) return new Date();
    return parsed;
  } catch {
    return new Date();
  }
};

const hasLeadExecutionStarted = (l: Lead) => {
  if (!l) return false;
  return !!(
    l.isStep1Submitted || l.isStep2Submitted || l.isStep3Submitted ||
    l.isStep4Submitted || l.isStep5Submitted || l.isStep6Submitted ||
    l.isStep7Submitted || l.isStep8Submitted || l.isStep9Submitted ||
    l.isStep10Submitted || l.isStep11Submitted || l.isStep12Submitted ||
    l.isStep13Submitted || l.isExecutionSubmitted
  );
};

export default function AvailabilityCalendar({
  users,
  allTasks,
  onSelectTask,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedStaffEmail, setSelectedStaffEmail] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Filter staff members of specified categories: 'Project Coordinator', 'Site Incharge/Supervisor', 'Field Supervisor'
  const filterCategories = ["Project Coordinator", "Site Incharge/Supervisor", "Field Supervisor"];
  
  const staffList = useMemo(() => {
    // 1. Try to fetch only matching categories
    let list = users.filter((u) => u.category && filterCategories.includes(u.category));
    
    // 2. Fallback to all users if none with specified categories exist in the local collection
    if (list.length === 0) {
      list = users.filter((u) => u.role === "Admin" || (u.category && u.category !== "None"));
    }
    
    // Sort staff members by name
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Set the first staff member as default if not already set or invalid
  useMemo(() => {
    if (staffList.length > 0 && !selectedStaffEmail) {
      setSelectedStaffEmail(staffList[0].email);
    }
  }, [staffList, selectedStaffEmail]);

  const activeStaff = useMemo(() => {
    return staffList.find((s) => s.email === selectedStaffEmail) || staffList[0] || null;
  }, [staffList, selectedStaffEmail]);

  // Extract all pending tasks specifically for the currently selected staff member
  const activeStaffTasks = useMemo(() => {
    if (!selectedStaffEmail) return [];
    const normalizedEmail = selectedStaffEmail.toLowerCase().trim();
    return allTasks.filter((t) => {
      const taskEmail = (t.assigneeEmail || "").toLowerCase().trim();
      return taskEmail === normalizedEmail;
    });
  }, [allTasks, selectedStaffEmail]);

  // Get count of pending tasks to display on staff list sidebar
  const getStaffTaskCount = (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    return allTasks.filter((t) => (t.assigneeEmail || "").toLowerCase().trim() === normalizedEmail).length;
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Array of Dates for the current month
  const monthDays = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [monthStart, monthEnd]);

  // Padding days on the left of calendar (representing previous month)
  const startingDayOfWeek = getDay(monthStart); // 0 = Sun, 1 = Mon ...
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; // Ajust to week starting with Monday (Mon=0)
  
  const paddingDays = useMemo(() => {
    const prevMonthDays = [];
    const prevMonthEnd = endOfMonth(subMonths(currentDate, 1));
    for (let i = adjustedStartingDay - 1; i >= 0; i--) {
      const d = new Date(prevMonthEnd);
      d.setDate(prevMonthEnd.getDate() - i);
      prevMonthDays.push(d);
    }
    return prevMonthDays;
  }, [currentDate, adjustedStartingDay]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleStaffSelect = (email: string) => {
    setSelectedStaffEmail(email);
    setSelectedDate(new Date()); // default to today
  };

  // Check how many tasks the active staff has due on a given day
  const getTasksForDate = (date: Date) => {
    return activeStaffTasks.filter((t) => {
      const dueDateObj = parseToDate(t.dueDate);
      return isSameDay(dueDateObj, date);
    });
  };

  // Calculate overall statistics for current month of active staff
  const monthStats = useMemo(() => {
    let busyDaysCount = 0;
    let inProgressDaysCount = 0;
    let pendingDaysCount = 0;
    
    monthDays.forEach((day) => {
      const dayTasks = getTasksForDate(day);
      const count = dayTasks.length;
      if (count >= 3) {
        busyDaysCount++;
      } else if (count > 0) {
        const isStarted = dayTasks.some((t) => hasLeadExecutionStarted(t.lead));
        if (isStarted) {
          inProgressDaysCount++;
        } else {
          pendingDaysCount++;
        }
      }
    });

    return {
      busyDays: busyDaysCount,
      inProgressDays: inProgressDaysCount,
      pendingDays: pendingDaysCount,
      freeDays: monthDays.length - busyDaysCount - inProgressDaysCount - pendingDaysCount,
    };
  }, [monthDays, activeStaffTasks]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return getTasksForDate(selectedDate);
  }, [selectedDate, activeStaffTasks]);

  // Render initials for avatars where photos may not be available
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div id="availability-calendar-view" className="bg-white border border-slate-200/80 rounded-[2rem] shadow-sm overflow-hidden flex flex-col xl:flex-row min-h-[550px]">
      
      {/* Sidebar - Staff List */}
      <div className="w-full xl:w-80 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200/60 p-6 flex flex-col shrink-0">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Project Staff Tracker</h4>
          </div>
          <h3 className="text-lg font-black text-slate-800 leading-none">Coordinator & Incharges</h3>
          <p className="text-[11px] text-slate-400 font-bold mt-1.5 leading-normal">
            Select a staff member below to inspect their monthly schedule, daily workload, and assignable dates.
          </p>
        </div>

        {/* Staff Scrolling Grid Container */}
        <div className="space-y-2.5 overflow-y-auto max-h-[350px] xl:max-h-[500px] pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {staffList.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200/50 rounded-2xl text-center">
              <p className="text-xs font-bold text-amber-600">No coordinators or incharges found.</p>
            </div>
          ) : (
            staffList.map((staff) => {
              const pendingCount = getStaffTaskCount(staff.email);
              const isSelected = staff.email === selectedStaffEmail;
              const isBusy = pendingCount >= 3;
              const isFree = pendingCount === 0;

              return (
                <button
                  key={staff.email}
                  onClick={() => handleStaffSelect(staff.email)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 shadow-md text-white"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {/* Circle Avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isSelected 
                        ? "bg-white/20 text-white" 
                        : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}>
                      {getInitials(staff.name)}
                    </div>
                    <div className="truncate">
                      <p className={`text-xs font-black truncate leading-tight ${isSelected ? "text-white" : "text-slate-800"}`}>
                        {staff.name}
                      </p>
                      <span className={`text-[9px] font-bold block leading-none mt-1 uppercase ${
                        isSelected ? "text-indigo-200" : "text-slate-400"
                      }`}>
                        {staff.category || "Staff"}
                      </span>
                    </div>
                  </div>

                  {/* Status Load Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : isFree
                          ? "bg-emerald-50 text-emerald-600 font-extrabold"
                          : isBusy
                            ? "bg-rose-50 text-rose-600 animate-pulse font-extrabold"
                            : "bg-amber-50 text-amber-600 font-extrabold"
                    }`}>
                      {isSelected 
                        ? `${pendingCount} Left`
                        : isFree 
                          ? "Free"
                          : isBusy
                            ? `Busy (${pendingCount})`
                            : "Active"
                      }
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Grid: Month Calendar & Selected Date Task Details */}
      <div className="flex-1 p-6 md:p-8 flex flex-col gap-6">
        
        {/* Calendar Nav & Headers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <h2 className="text-xl font-black text-slate-800 leading-none">
                {format(currentDate, "MMMM yyyy")}
              </h2>
            </div>
            {activeStaff && (
              <p className="text-xs text-slate-400 font-bold">
                Operational schedule for <span className="text-indigo-600 font-black">{activeStaff.name}</span>
              </p>
            )}
          </div>

          {/* Month Steppers & Summary Indicators */}
          <div className="flex items-center gap-4">
            {/* Legend Indicators */}
            <div className="hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-200 inline-block" />
                <span>Overloaded</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200 inline-block" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-200 inline-block" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-50 border border-slate-200 inline-block" />
                <span>Available</span>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition-all active:scale-90"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
                className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-600 hover:text-indigo-600 transition-all"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition-all active:scale-90"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Month Grid */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Month Day Titles */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Padding Days placeholder */}
              {paddingDays.map((date, idx) => (
                <div
                  key={`pad-${idx}`}
                  className="aspect-square bg-slate-50/40 border border-slate-100/50 rounded-xl flex flex-col justify-start p-1.5 text-slate-300 select-none text-[11px] font-bold"
                >
                  {date.getDate()}
                </div>
              ))}

              {/* Actual Days */}
              {monthDays.map((day) => {
                const dayTasks = getTasksForDate(day);
                const taskCount = dayTasks.length;
                const isTodayStr = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                let cellBg = "bg-white hover:bg-slate-50 border-slate-200 text-slate-800";
                let countBadge = null;

                if (taskCount >= 3) {
                  cellBg = isSelected
                    ? "bg-rose-600 border-rose-600 text-white"
                    : "bg-rose-50 hover:bg-rose-100/80 border-rose-200/60 text-rose-800";
                  countBadge = (
                    <span className={`text-[8px] font-black uppercase px-1 py-0.5 mt-auto rounded-md ${
                      isSelected ? "bg-white/20 text-white" : "bg-rose-600 text-white"
                    }`}>
                      {taskCount} Due
                    </span>
                  );
                } else if (taskCount > 0) {
                  const isStarted = dayTasks.some((t) => hasLeadExecutionStarted(t.lead));
                  if (isStarted) {
                    cellBg = isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-amber-50 hover:bg-amber-100/80 border-amber-200/60 text-amber-800";
                    countBadge = (
                      <span className={`text-[8px] font-black uppercase px-1 py-0.5 mt-auto rounded-md ${
                        isSelected ? "bg-white/20 text-white" : "bg-amber-600 text-white"
                      }`}>
                        {taskCount} In Progress
                      </span>
                    );
                  } else {
                    cellBg = isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-blue-50 hover:bg-blue-100/80 border-blue-200/60 text-blue-800";
                    countBadge = (
                      <span className={`text-[8px] font-black uppercase px-1 py-0.5 mt-auto rounded-md ${
                        isSelected ? "bg-white/20 text-white" : "bg-blue-600 text-white"
                      }`}>
                        {taskCount} Pending
                      </span>
                    );
                  }
                } else {
                  if (isSelected) {
                    cellBg = "bg-indigo-600 border-indigo-600 text-white";
                  }
                }

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square border rounded-xl flex flex-col justify-between items-start p-1.5 transition-all text-[11px] font-black leading-none ${cellBg} ${
                      isTodayStr && !isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                    }`}
                  >
                    <span className="text-[12px]">{day.getDate()}</span>
                    {countBadge}
                  </button>
                );
              })}
            </div>

            {/* Quick Stat Bar */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3 flex justify-between items-center text-[11px] font-bold text-slate-500 gap-2">
              <span className="flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Month Summary
              </span>
              <div className="flex gap-4">
                <span className="text-rose-600">{monthStats.busyDays} Busy Days</span>
                <span className="text-amber-600">{monthStats.inProgressDays} In Progress</span>
                <span className="text-blue-600">{monthStats.pendingDays} Pending</span>
                <span className="text-slate-600">{monthStats.freeDays} Available</span>
              </div>
            </div>
          </div>

          {/* Date Deadlines Detail List Panel */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200/80 rounded-[1.8rem] p-5 flex flex-col min-h-[300px]">
            <div className="border-b border-slate-200/60 pb-3 mb-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block mb-1">
                Deadlines Detail
              </span>
              <h3 className="font-black text-slate-800 leading-tight">
                {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Select a date"}
              </h3>
            </div>

            {/* Task list for selected date */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[330px]">
              {selectedDateTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100 mb-3 animate-pulse">
                    <CircleDot className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black text-slate-600 uppercase tracking-tight">Staff Member Available </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 max-w-[170px] mx-auto">
                    No deadlines due on this day. The staff member is free for new project assignments.
                  </p>
                </div>
              ) : (
                selectedDateTasks.map((t, idx) => {
                  const labelWords = t.label.split(" ");
                  const isExecutionStep = t.tab === "execution" || !!t.stepId;

                  return (
                    <div
                      key={`${t.lead.id}-${t.label}-${idx}`}
                      className="bg-white border border-slate-200/80 rounded-2xl p-3.5 hover:shadow-sm transition-all text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate">
                          <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded shrink-0 leading-normal block w-fit mb-1.5">
                            {t.tab.replace("_", " ")}
                          </span>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-snug break-words">
                            {t.lead.customerName || "Project Site"}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-bold mt-1 leading-normal truncate">
                            Task: {t.label}
                          </p>
                        </div>
                      </div>

                      {/* Bottom row actions */}
                      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Briefcase className="w-3.5 h-3.5 shrink-0" />
                          <span>Phase {t.stepId ? `Step ${t.stepId}` : "Action"}</span>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (t.isPaymentTask && (t as any).payment) {
                              onSelectTask(t.lead.id, undefined, "accounts");
                            } else {
                              onSelectTask(t.lead.id, t.stepId, t.tab);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider transition-all hover:bg-zinc-900 active:scale-95"
                        >
                          <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                          Execute
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
