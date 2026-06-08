import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Wrench,
  Loader2,
  X,
  ChevronRight,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Camera,
  ExternalLink,
  Upload,
  Trash2
} from 'lucide-react';
import { serviceRequestService } from '../services/serviceRequestService';
import { ServiceRequest, AppUser } from '../types';
import { userService } from '../services/userService';
import { storageService } from '../services/storageService';

interface ServiceManagementProps {
  user: AppUser;
}

export const ServiceManagement: React.FC<ServiceManagementProps> = ({ user }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);

  // Submission/Error handling states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    mobileNumber: '',
    customerName: '',
    address: '',
    issue: '',
    issueType: 'General Maintenance',
    assignedTo: '',
    assignedToEmail: '',
    isNewCustomer: true,
    issuePhotoUrl: ''
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isAdminUser = user.role === 'Admin' || user.email === 'hemant.tyagi@bharatamtechnology.com';

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'assigned' | 'created'>(isAdminUser ? 'all' : 'assigned');

  const handleDeleteRequest = async (id: string) => {
    try {
      await serviceRequestService.deleteRequest(id);
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting service request:", err);
    }
  };

  // Update Form State
  const [updateFormData, setUpdateFormData] = useState({
    status: '' as ServiceRequest['status'],
    resolutionRemark: '',
    resolvedPhotoUrl: '',
    issuePhotoUrl: '',
    completionCertificateUrl: '',
    assignedToEmail: '',
    assignedTo: ''
  });

  const handleOpenCreateModal = () => {
    setSubmitError(null);
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const handleOpenUpdateModal = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setUpdateFormData({
      status: req.status,
      resolutionRemark: req.resolutionRemark || '',
      resolvedPhotoUrl: req.resolvedPhotoUrl || '',
      issuePhotoUrl: req.issuePhotoUrl || '',
      completionCertificateUrl: req.completionCertificateUrl || '',
      assignedToEmail: req.assignedToEmail || '',
      assignedTo: req.assignedTo || ''
    });
    setUpdateError(null);
    setIsUpdating(false);
    setIsUpdateModalOpen(true);
  };

  useEffect(() => {
    const unsubscribeRequests = serviceRequestService.subscribeToRequests(user.email, isAdminUser, setRequests);
    const unsubscribeUsers = userService.subscribeToUsers(setUsers);
    return () => {
      unsubscribeRequests();
      unsubscribeUsers();
    };
  }, [user.email, user.role, isAdminUser]);

  const handleMobileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const mobile = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, mobileNumber: mobile }));

    if (mobile.length === 10) {
      setIsSearchingCustomer(true);
      try {
        const lead = await serviceRequestService.findCustomerByMobile(mobile);
        if (lead) {
          setFormData(prev => ({
            ...prev,
            customerName: lead.customerName,
            address: lead.address,
            isNewCustomer: false
          }));
        } else {
          setFormData(prev => ({ ...prev, isNewCustomer: true }));
        }
      } catch (error) {
        console.error("Error finding customer:", error);
      } finally {
        setIsSearchingCustomer(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate inputs
    if (formData.mobileNumber.length < 10) {
      setSubmitError("Mobile number must be exactly 10-digits.");
      return;
    }
    if (!formData.customerName.trim()) {
      setSubmitError("Customer name is required.");
      return;
    }
    if (!formData.address.trim()) {
      setSubmitError("Physical address of customer site is required.");
      return;
    }
    if (!formData.issue.trim()) {
      setSubmitError("Please write a description of the issue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await serviceRequestService.createRequest({
        ...formData,
        status: 'Open',
        createdBy: user.email
      });
      setIsModalOpen(false);
      setFormData({
        mobileNumber: '',
        customerName: '',
        address: '',
        issue: '',
        issueType: 'General Maintenance',
        assignedTo: '',
        assignedToEmail: '',
        isNewCustomer: true,
        issuePhotoUrl: ''
      });
      setUploadProgress(0);
    } catch (error: any) {
      console.error("Error creating service request:", error);
      let errMsg = "Failed to submit issue ticket. Please verify connection and try again.";
      if (error && error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && parsed.error) {
            errMsg = parsed.error;
          }
        } catch (e) {
          errMsg = error.message;
        }
      }
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canChangeStatus = (req: ServiceRequest) => {
    const userEmailNormalized = user.email?.toLowerCase().trim();
    const assignedNormalized = req.assignedToEmail?.toLowerCase().trim();
    const creatorNormalized = req.createdBy?.toLowerCase().trim();
    return user.role === 'Admin' || 
           userEmailNormalized === 'hemant.tyagi@bharatamtechnology.com' ||
           userEmailNormalized === assignedNormalized ||
           userEmailNormalized === creatorNormalized;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isUpdate = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setUploadProgress(10);
    try {
      const requestId = isUpdate && selectedRequest ? selectedRequest.id : 'new_request';
      const url = await storageService.uploadServiceRequestPhoto(requestId, file, (p) => setUploadProgress(p));
      if (isUpdate) {
        setUpdateFormData(prev => ({ ...prev, resolvedPhotoUrl: url }));
      } else {
        setFormData(prev => ({ ...prev, issuePhotoUrl: url }));
      }
    } catch (error) {
      console.error("Photo upload failed:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleBeforePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setUploadProgress(10);
    try {
      const requestId = selectedRequest ? selectedRequest.id : 'new_request';
      const url = await storageService.uploadServiceRequestPhoto(requestId, file, (p) => setUploadProgress(p));
      setUpdateFormData(prev => ({ ...prev, issuePhotoUrl: url }));
    } catch (error) {
      console.error("Before photo upload failed:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setUploadProgress(10);
    try {
      const requestId = selectedRequest ? selectedRequest.id : 'new_request';
      const url = await storageService.uploadServiceRequestPhoto(requestId, file, (p) => setUploadProgress(p));
      setUpdateFormData(prev => ({ ...prev, completionCertificateUrl: url }));
    } catch (error) {
      console.error("Certificate upload failed:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setUpdateError(null);
    setIsUpdating(true);

    try {
      await serviceRequestService.updateRequest(selectedRequest.id, {
        status: updateFormData.status,
        resolutionRemark: updateFormData.resolutionRemark,
        resolvedPhotoUrl: updateFormData.resolvedPhotoUrl,
        issuePhotoUrl: updateFormData.issuePhotoUrl,
        completionCertificateUrl: updateFormData.completionCertificateUrl,
        assignedToEmail: updateFormData.assignedToEmail,
        assignedTo: updateFormData.assignedTo,
        updatedAt: new Date()
      });
      setIsUpdateModalOpen(false);
      setSelectedRequest(null);
      setUpdateFormData({
        status: 'Open',
        resolutionRemark: '',
        resolvedPhotoUrl: '',
        issuePhotoUrl: '',
        completionCertificateUrl: '',
        assignedToEmail: '',
        assignedTo: ''
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      let errMsg = "Failed to apply status update. Only administrators or the assigned technician can update.";
      if (error && error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && parsed.error) {
            errMsg = parsed.error;
          }
        } catch (e) {
          errMsg = error.message;
        }
      }
      setUpdateError(errMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.mobileNumber.includes(searchQuery) ||
      req.issue.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterMode === 'assigned') {
      return req.assignedToEmail?.toLowerCase().trim() === user.email?.toLowerCase().trim();
    }
    if (filterMode === 'created') {
      return req.createdBy?.toLowerCase().trim() === user.email?.toLowerCase().trim();
    }
    
    // Safety guard for non-admins under any edge case 'all'
    if (!isAdminUser) {
      return req.assignedToEmail?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
             req.createdBy?.toLowerCase().trim() === user.email?.toLowerCase().trim();
    }
    
    return true; // 'all' for admins
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open': return <Clock className="w-3 h-3" />;
      case 'Under Process': return <AlertCircle className="w-3 h-3" />;
      case 'Complain Register with Company (OEM)': return <Wrench className="w-3 h-3" />;
      case 'Resolved': return <CheckCircle2 className="w-3 h-3" />;
      case 'Not Resolved': return <X className="w-3 h-3" />;
      case 'Closed': return <CheckCircle2 className="w-3 h-3" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Under Process': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Complain Register with Company (OEM)': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Not Resolved': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Closed': return 'bg-slate-50 text-slate-600 border-slate-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
               <Wrench className="w-6 h-6 text-white" />
             </div>
             <div>
               <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Desk</h1>
               <p className="text-slate-500 font-medium text-sm">Customer issue tracking system</p>
             </div>
          </div>
        </div>
        
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-zinc-800 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Log New Issue
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', value: requests.length, color: 'text-slate-600', bg: 'bg-white' },
          { label: 'Awaiting Action', value: requests.filter(r => r.status === 'Open').length, color: 'text-amber-600', bg: 'bg-white' },
          { label: 'Under Repair', value: requests.filter(r => r.status === 'Under Process').length, color: 'text-blue-600', bg: 'bg-white' },
          { label: 'Completed', value: requests.filter(r => ['Resolved', 'Closed'].includes(r.status)).length, color: 'text-emerald-600', bg: 'bg-white' },
        ].map((stat, i) => (
          <div key={i} className={`p-5 rounded-[2rem] border border-slate-100 ${stat.bg} shadow-sm flex flex-col`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</span>
            <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by customer name, phone, or issue description..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Toggle Pills */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 w-full md:w-auto shrink-0 justify-around md:justify-start gap-1">
          {isAdminUser && (
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                filterMode === 'all' 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-800 border border-transparent'
              }`}
            >
              All Tickets
            </button>
          )}
          <button
            onClick={() => setFilterMode('assigned')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'assigned' 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                : 'text-slate-500 hover:text-slate-800 border border-transparent'
            }`}
          >
            Assigned
          </button>
          <button
            onClick={() => setFilterMode('created')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'created' 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                : 'text-slate-500 hover:text-slate-800 border border-transparent'
            }`}
          >
            My Raised
          </button>
        </div>
      </div>

      {/* Modern Table Interface */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="pl-8 pr-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Customer & Site</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Issue Summary</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Visual Proof</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Technician</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Status</th>
                <th className="pl-4 pr-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/30 transition-colors group">
                  {/* Customer Info */}
                  <td className="pl-8 pr-4 py-6 align-top">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-bold text-slate-900 leading-none">{req.customerName}</span>
                        {req.isNewCustomer && (
                          <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded uppercase leading-none">New</span>
                        )}
                      </div>
                      <a href={`tel:${req.mobileNumber}`} className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-3 hover:text-blue-600 transition-colors">
                        <Phone className="w-3 h-3" /> {req.mobileNumber}
                      </a>
                      <div className="flex items-start gap-1 text-slate-400 max-w-[200px]">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="text-[10px] font-medium leading-tight line-clamp-2 italic">{req.address}</span>
                      </div>
                    </div>
                  </td>

                  {/* Issue Details */}
                  <td className="px-4 py-6 align-top">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider mb-2 bg-blue-50 w-fit px-2 py-0.5 rounded">
                        {req.issueType}
                      </span>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed mb-2 line-clamp-2">
                        {req.issue}
                      </p>
                      {req.resolutionRemark && (
                         <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100/50 flex gap-2">
                           <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                           <p className="text-[10px] font-semibold text-emerald-700 leading-tight italic line-clamp-2">{req.resolutionRemark}</p>
                         </div>
                      )}
                    </div>
                  </td>

                  {/* Visual Proof (Thumbnails) */}
                  <td className="px-4 py-6 align-top">
                    <div className="flex -space-x-2">
                      {req.issuePhotoUrl ? (
                        <a 
                          href={req.issuePhotoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-12 h-12 rounded-xl border-2 border-white shadow-sm hover:scale-110 hover:z-10 transition-transform relative group/img overflow-hidden bg-slate-100"
                          title="View Issue Photo"
                        >
                          <img src={req.issuePhotoUrl} alt="Before" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center">
                            <ExternalLink className="w-3 h-3 text-white" />
                          </div>
                        </a>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300" title="No before photo">
                          <Camera className="w-4 h-4 opacity-30" />
                        </div>
                      )}

                      {req.resolvedPhotoUrl && (
                        <a 
                          href={req.resolvedPhotoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-12 h-12 rounded-xl border-2 border-white shadow-md hover:scale-110 hover:z-10 transition-transform relative group/img overflow-hidden bg-emerald-50 ring-2 ring-emerald-50/50"
                          title="View Resolved Photo"
                        >
                          <img src={req.resolvedPhotoUrl} alt="After" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-emerald-600/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center">
                            <ExternalLink className="w-3 h-3 text-white" />
                          </div>
                        </a>
                      )}

                      {req.completionCertificateUrl && (
                        <a 
                          href={req.completionCertificateUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-12 h-12 rounded-xl border-2 border-white shadow-md hover:scale-110 hover:z-10 transition-transform relative group/img overflow-hidden bg-blue-50 ring-2 ring-blue-50/50"
                          title="View Completion Certificate"
                        >
                          {req.completionCertificateUrl.match(/\.(jpeg|jpg|gif|png)$/i) || !req.completionCertificateUrl.includes('.') ? (
                            <img src={req.completionCertificateUrl} alt="Certificate" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-blue-600 bg-blue-50">
                              <Upload className="w-5 h-5 animate-pulse" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center">
                            <ExternalLink className="w-3 h-3 text-white" />
                          </div>
                        </a>
                      )}
                    </div>
                    {(req.issuePhotoUrl || req.resolvedPhotoUrl || req.completionCertificateUrl) && (
                      <span className="text-[9px] font-bold text-slate-400 mt-2 block ml-1 uppercase tracking-tighter italic">
                        {req.completionCertificateUrl 
                          ? (req.resolvedPhotoUrl ? 'Before, After & Cert' : 'Before & Cert')
                          : (req.resolvedPhotoUrl ? 'Before & After' : 'Initial Photo')}
                      </span>
                    )}
                  </td>

                  {/* Technician Info */}
                  <td className="px-4 py-6 align-top">
                    {req.assignedToEmail ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-white shadow-sm flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate leading-tight">{req.assignedTo}</span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">{req.assignedToEmail}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-rose-400 px-3 py-1 bg-rose-50/50 rounded-lg border border-rose-100 w-fit">
                        <Users className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Unassigned</span>
                      </div>
                    )}
                  </td>

                  {/* Status Indicator */}
                  <td className="px-4 py-6 align-top">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor(req.status)}`}>
                      <span className="flex-shrink-0">{getStatusIcon(req.status)}</span>
                      {req.status}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 mt-2 ml-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.createdAt?.toDate?.() || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </td>

                  {/* Final Actions */}
                  <td className="pl-4 pr-8 py-6 align-top text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {canChangeStatus(req) ? (
                        <button 
                          onClick={() => handleOpenUpdateModal(req)}
                          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                          Action
                        </button>
                      ) : (
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest pr-4 select-none">
                          Read Only
                        </div>
                      )}

                      {isAdminUser && (
                        deletingId === req.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              className="px-3 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 font-bold text-[10px] uppercase transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(req.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                            title="Delete Issue"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRequests.length === 0 && (
            <div className="py-24 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-100">
                <Search className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">No Records Found</h3>
              <p className="text-slate-400 font-bold max-w-sm mx-auto mt-2 italic">Try refining your search or adding filters</p>
            </div>
          )}
        </div>
      </div>


      {/* Modal Tool */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col slide-up overflow-y-auto max-h-[90vh]">
            <div className="px-8 pt-8 pb-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Log Support Ticket</h2>
                <p className="text-slate-500 font-bold text-[10px] mt-0.5 uppercase tracking-[0.2em]">Service Intake Form</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm transition-all border border-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {submitError && (
                <div id="service-submit-error" className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 font-bold flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-full">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Mobile</label>
                    {formData.mobileNumber.length === 10 && !isSearchingCustomer && (
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${formData.isNewCustomer ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {formData.isNewCustomer ? 'NEW CLIENT' : 'RETURNING CLIENT'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type="tel"
                      value={formData.mobileNumber}
                      onChange={handleMobileChange}
                      placeholder="Enter 10-digit mobile..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all pr-12 shadow-inner"
                      required
                    />
                    {isSearchingCustomer && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                    placeholder="Enter customer name..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Type</label>
                  <select 
                    value={formData.issueType}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueType: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                  >
                    <option>General Maintenance</option>
                    <option>Generation Drop</option>
                    <option>Inverter Error Code</option>
                    <option>Physical Damage</option>
                    <option>Cleaning Request</option>
                    <option>Update Electricity Bill</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Address</label>
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all min-h-[80px]"
                    placeholder="Physical location of installation..."
                    required
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Details</label>
                  <textarea 
                    value={formData.issue}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all min-h-[100px]"
                    placeholder="Describe the complaint in detail..."
                    required
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Issue Photo (Optional)</label>
                  <div className={`mt-1 border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${formData.issuePhotoUrl ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    {formData.issuePhotoUrl ? (
                      <>
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md border-2 border-white">
                          <img src={formData.issuePhotoUrl} alt="Issue Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Photo Attached</span>
                          <label className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer mt-1">
                            Replace Photo
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} />
                          </label>
                        </div>
                      </>
                    ) : uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Uploading {uploadProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Click or Upload Issue Image</span>
                          <label className="mt-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-95">
                            Select File
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>



                <div className="space-y-2 col-span-full border-t border-slate-50 pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technician Assignment</label>
                  <select 
                    value={formData.assignedToEmail}
                    onChange={(e) => {
                      const sel = users.find(u => u.email === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        assignedToEmail: e.target.value,
                        assignedTo: sel ? sel.name : ''
                      }));
                    }}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                  >
                    <option value="">Choose technician...</option>
                    {users.map(u => (
                      <option key={u.email} value={u.email}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploadingPhoto || isSubmitting}
                className={`w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-800 transition-all shadow-2xl shadow-slate-200 mt-4 active:scale-95 ${uploadingPhoto || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingPhoto ? 'Uploading Photo...' : isSubmitting ? 'Posting Ticket...' : 'Post Service Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Update Status Modal */}
      {isUpdateModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsUpdateModalOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col slide-up overflow-y-auto max-h-[90vh]">
            <div className="px-8 pt-8 pb-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Update Issue Status</h2>
                <p className="text-slate-500 font-bold text-[10px] mt-0.5 uppercase tracking-[0.2em]">{selectedRequest.customerName} - {selectedRequest.issueType}</p>
              </div>
              <button 
                onClick={() => setIsUpdateModalOpen(false)} 
                className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm transition-all border border-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-8 space-y-6">
              {updateError && (
                <div id="service-update-error" className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 font-bold flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{updateError}</span>
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign / Reassign Technician (Optional)</label>
                  <select 
                    value={updateFormData.assignedToEmail}
                    onChange={(e) => {
                      const sel = users.find(u => u.email === e.target.value);
                      setUpdateFormData(prev => ({ 
                        ...prev, 
                        assignedToEmail: e.target.value,
                        assignedTo: sel ? sel.name : ''
                      }));
                    }}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                  >
                    <option value="">Choose technician...</option>
                    {users.map(u => (
                      <option key={u.email} value={u.email}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Status</label>
                  <select 
                    value={updateFormData.status}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, status: e.target.value as ServiceRequest['status'] }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                    required
                  >
                    <option value="Open">Open</option>
                    <option value="Under Process">Under Process</option>
                    <option value="Complain Register with Company (OEM)">Complain Register with Company (OEM)</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Not Resolved">Not Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                 <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">before issue resolve Photo</label>
                  <div className={`mt-1 border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${updateFormData.issuePhotoUrl ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    {updateFormData.issuePhotoUrl ? (
                      <>
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md border-2 border-white">
                          <img src={updateFormData.issuePhotoUrl} alt="Before Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Photo Attached</span>
                          <label className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer mt-1">
                            Replace Photo
                            <input type="file" className="hidden" accept="image/*" onChange={handleBeforePhotoUpload} />
                          </label>
                        </div>
                      </>
                    ) : uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Uploading {uploadProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Click or Upload Before Image</span>
                          <label className="mt-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-95">
                            Select File
                            <input type="file" className="hidden" accept="image/*" onChange={handleBeforePhotoUpload} />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">After issue resolve Photo</label>
                  <div className={`mt-1 border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${updateFormData.resolvedPhotoUrl ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    {updateFormData.resolvedPhotoUrl ? (
                      <>
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md border-2 border-white">
                          <img src={updateFormData.resolvedPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Photo Attached</span>
                          <label className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer mt-1">
                            Replace Photo
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} />
                          </label>
                        </div>
                      </>
                    ) : uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Uploading {uploadProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Click or Upload Resolution Image</span>
                          <label className="mt-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-95">
                            Select File
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Services completion certificate from client</label>
                  <div className={`mt-1 border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${updateFormData.completionCertificateUrl ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                    {updateFormData.completionCertificateUrl ? (
                      <>
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md border-2 border-white bg-white flex items-center justify-center text-emerald-500">
                          {updateFormData.completionCertificateUrl.match(/\.(jpeg|jpg|gif|png)$/i) || !updateFormData.completionCertificateUrl.includes('.') ? (
                            <img src={updateFormData.completionCertificateUrl} alt="Certificate Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Upload className="w-8 h-8 font-black" />
                          )}
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Certificate Attached</span>
                          <div className="flex gap-2">
                            <a href={updateFormData.completionCertificateUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-1">
                              View Certificate
                            </a>
                            <span className="text-slate-300 mt-1">|</span>
                            <label className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer mt-1">
                              Replace File
                              <input type="file" className="hidden" onChange={handleCertificateUpload} />
                            </label>
                          </div>
                        </div>
                      </>
                    ) : uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Uploading {uploadProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Click or Upload Certificate / Document</span>
                          <label className="mt-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-95">
                            Select File
                            <input type="file" className="hidden" onChange={handleCertificateUpload} />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolution Remark</label>
                  <textarea 
                    value={updateFormData.resolutionRemark}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, resolutionRemark: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all min-h-[100px]"
                    placeholder="Provide details about the resolution or next steps..."
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploadingPhoto || isUpdating}
                className={`w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-800 transition-all shadow-2xl shadow-slate-200 mt-4 active:scale-95 ${uploadingPhoto || isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingPhoto ? 'Uploading photo...' : isUpdating ? 'Processing...' : 'Apply Status Update'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
