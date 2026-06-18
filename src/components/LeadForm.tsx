import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { leadService } from "../services/leadService";
import { formatCreatorName } from "../utils/creatorUtils";
import { userService } from "../services/userService";
import { X, Save, AlertCircle, UserCheck } from "lucide-react";
import { AppUser } from "../types";

const leadSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  address: z.string().min(5, "Address is required"),
  punchDate: z.string().min(1, "Punch date is required"),
  reference: z.string().optional(),
  requiredKw: z.string().min(1, "KW is required"),
  assignedTo: z.string().min(1, "Assigning to someone is required"),
  remarkInitial: z.string().optional(),
  planSiteVisitDate: z.string().min(1, "Plan site visit date is required"),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
  user: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function LeadForm({ user, onCancel, onSuccess }: LeadFormProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      requiredKw: '',
      punchDate: new Date().toISOString().split('T')[0],
      planSiteVisitDate: new Date().toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    async function fetchUsers() {
      try {
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
      } catch (err) {
        console.error("Error fetching users", err);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const onSubmit = async (data: LeadFormValues) => {
    try {
      const selectedUser = users.find(u => u.email === data.assignedTo);
      const now = new Date().toISOString();
      await leadService.createLead({
        ...data,
        siteVisitDate: data.planSiteVisitDate, // Auto transfer to Section B
        assignedPreSales: data.assignedTo,
        assignedPreSalesName: selectedUser?.name || data.assignedTo,
        assignedTo: '', // clear survey assignment initially
        assignedToName: '',
        status: 'New',
        isBasicSubmitted: true,
        isPreSalesSubmitted: false,
        preSalesStatus: 'Pending',
        createdByName: formatCreatorName(user?.displayName, user?.email),
        stepAssignmentDates: {
          'pre_sales': now,
          'basic': now
        },
        stepCompletionDates: {
          'basic': now
        }
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to create lead", error);
      alert("Failed to create lead. Check your permissions.");
    }
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden max-w-2xl mx-auto relative">
      <div className="p-5 md:p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="text-xl md:text-3xl font-display font-bold text-slate-900 tracking-tight leading-tight">Initialize Lead</h3>
          <p className="text-xs md:text-sm text-slate-400 font-medium tracking-tight">Create a new lead in the ecosystem.</p>
        </div>
        <button onClick={onCancel} className="p-2 md:p-3 hover:bg-slate-200 rounded-xl md:rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-95">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 md:p-10 space-y-4 md:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Customer Name</label>
            <input 
              {...register("customerName")}
              className={`w-full px-5 py-3.5 border rounded-xl outline-none transition-all font-semibold text-sm ${errors.customerName ? 'border-red-300 bg-red-50 focus:ring-4 focus:ring-red-100/50' : 'border-slate-200 focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500'}`}
              placeholder="e.g. Hemant Tyagi"
            />
            {errors.customerName && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1.5 ml-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.customerName.message}</p>}
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Mobile Number</label>
            <input 
              {...register("mobileNumber")}
              className={`w-full px-5 py-3.5 border rounded-xl outline-none transition-all font-semibold text-sm ${errors.mobileNumber ? 'border-red-300 bg-red-50 focus:ring-4 focus:ring-red-100/50' : 'border-slate-200 focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500'}`}
              placeholder="e.g. 8099599599"
            />
            {errors.mobileNumber && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1.5 ml-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.mobileNumber.message}</p>}
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Email Address</label>
            <input 
              {...register("customerEmail")}
              className="w-full px-5 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all font-semibold text-sm"
              placeholder="customer@domain.com"
            />
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Required KW</label>
            <input 
              {...register("requiredKw")}
              className="w-full px-5 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all font-semibold text-sm"
              placeholder="e.g. 5.5"
            />
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Assign To Sales Team (Pre-Sales)</label>
            <select 
              {...register("assignedTo")}
              disabled={loadingUsers}
              className={`w-full px-5 py-3.5 border rounded-xl outline-none transition-all bg-white font-semibold text-sm appearance-none ${errors.assignedTo ? 'border-red-300 bg-red-50 focus:ring-4 focus:ring-red-100/50' : 'border-slate-200 focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500'}`}
            >
              <option value="">{loadingUsers ? 'Syncing Team...' : 'Select Executive...'}</option>
              {users.map((user, idx) => (
                <option key={`${idx}`} value={user.email}>{user.name} ({user.role})</option>
              ))}
            </select>
            {errors.assignedTo && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1.5 ml-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.assignedTo.message}</p>}
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Date</label>
            <input 
              type="date"
              {...register("punchDate")}
              className="w-full px-5 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all font-semibold text-sm appearance-none"
            />
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Expected Site Visit Date</label>
            <input 
              type="date"
              {...register("planSiteVisitDate")}
              className="w-full px-5 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all font-semibold text-sm appearance-none"
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Address</label>
          <textarea 
            {...register("address")}
            rows={2}
            className={`w-full px-5 py-3.5 border rounded-[1.25rem] outline-none transition-all font-semibold text-sm resize-none ${errors.address ? 'border-red-300 bg-red-50 focus:ring-4 focus:ring-red-100/50' : 'border-slate-200 focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500'}`}
            placeholder="Complete site location details"
          />
          {errors.address && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1.5 ml-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.address.message}</p>}
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Reference</label>
          <input 
            {...register("reference")}
            className="w-full px-5 py-3.5 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all font-semibold text-sm"
            placeholder="Reference Name / Channel"
          />
        </div>

        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[1.5rem] text-blue-800 text-xs font-medium leading-relaxed italic">
          <strong>Strategic Note:</strong> Once the lead is initialized and assigned to a steward, the protocol will be locked. Further administrative intervention will be required for modification.
        </div>

        <div className="pt-10 border-t border-slate-100 flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
          >
            Abort
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-4 px-6 bg-slate-950 text-white rounded-2xl font-bold text-sm hover:bg-emerald-400 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? "Processing..." : <><UserCheck className="w-4 h-4" /> Save Lead</>}
          </button>
        </div>
      </form>
    </div>
  );
}
