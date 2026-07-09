export type Tab = "basic" | "pre_sales" | "survey" | "sales" | "financials" | "accounts" | "project_incharge" | "execution" | "timeline" | "handover" | "deliverables" | "final_review" | "documents";

export interface AppUser {
  name: string;
  role: 'Admin' | 'Executive' | 'Junior Admin';
  email: string;
  category?: 'Sales Partner' | 'Sales Person' | 'Field Supervisor' | 'Accountant' | 'Store Incharge' | 'Technician' | 'Bank executive' | 'Project Coordinator' | 'Site Incharge/Supervisor' | 'None';
  fcmToken?: string;
}

export type LeadStatus = 'New' | 'Under Discussion' | 'Negotiation' | 'Won' | 'Lost' | 'Converted' | 'Completed';

export interface FollowUp {
  date: string;
  status: LeadStatus;
  remark: string;
  nextFollowUpDate?: string;
  timestamp: any;
}

export interface Lead {
  id: string;
  leadId: string;
  createdAt: any;
  customerEmail: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  reference?: string;
  punchDate: string;
  requiredKw: string;
  planSiteVisitDate?: string;
  assignedInitial: string;
  remarkInitial: string;
  plan: string;

  // Pre-Sales Section
  assignedPreSales?: string;
  assignedPreSalesName?: string;
  isPreSalesSubmitted?: boolean;
  preSalesRemark?: string;
  preSalesStatus?: 'Pending' | 'Discussion Done' | 'Not Interested';

  // Section B
  siteVisitDate?: string;
  visitedBy?: string;
  roofType?: string;
  shadowIssue?: string;
  locationType?: 'Jaipur' | 'Outside Jaipur';
  phase?: string;
  finalKw?: string;
  connectionType?: 'DS' | 'NDS';
  dcrType?: string;
  stdPackage?: 'Diamond' | 'Gold' | 'Silver' | 'Platinum';
  brand?: string;
  rateDeviationNotes?: 'Yes' | 'No';
  deviationDetails?: string;
  deviationCost?: number;
  rateAfterDeviation?: number;
  billUrl?: string;
  drawingUrl?: string;
  gpsUrl?: string;
  meterUrl?: string;
  smartMeterInstalled?: 'Yes' | 'No';

  // Section C
  assignedSales?: string;
  nextFollowUpDate?: string;
  status: LeadStatus;
  lostReason?: string;
  salesRemark?: string;
  followUps?: FollowUp[];

  // Section D
  originalRate?: number;
  discount?: number;
  finalRate?: number;
  loadExtensionRequired?: 'Yes' | 'No';
  loadExtensionKw?: string;
  loadPropertyUrl?: string;
  loanRequired?: 'Yes' | 'No';
  loanAmount?: number;
  marginAmount?: number;
  aadhaarUrl?: string;
  bankDocUrl?: string;
  panUrl?: string;
  propertyCertUrl?: string;
  workAgreementUrl?: string;
  modelAgreementUrl?: string;
  coApplicant?: string;
  coApplicantRemark?: string;
  coApplicantDocUrl?: string;
  docCorrectionRemark?: string;
  customerMailId?: string;

  // Section E
  projectType?: 'PM Surya Ghar' | 'SSO' | 'Surya Ghar + SSO';
  ssoPassportPhotoUrl?: string;
  ssoSignatureUrl?: string;
  ssoIdAndPassword?: string;
  newConnectionRequired?: 'Yes' | 'No';
  newConnectionPhotosUrl?: string;
  executionNewConnectionPhotosUrl?: string;
  newConnectionDetails?: string;
  advanceReceived?: 'Yes' | 'No';
  advanceAmount?: number;
  advanceUrtNo?: string;
  advanceDate?: string;
  tempAdvanceAmount?: number;
  tempAdvanceUrtNo?: string;
  tempAdvanceDate?: string;
  projectRemark?: string;
  projectAssignee?: string;

  // Section F
  paymentConfirmation?: boolean;
  installationAssignee?: string;
  installationDate?: string;
  installationStatus?: string;

  // Accounts Section
  accPaymentStatus?: 'Confirmed' | 'No';
  accAmount?: number;
  accUtrNo?: string;
  accDate?: string;
  accAssignee?: string;
  accAssigneeEmail?: string;
  commissionSalesPerson?: string;

  updatedAt: any;
  createdBy: string;
  createdByName?: string;

  // S3 — DISCOM (Pre-Install)
  s3_loadExtFileUrl?: string;
  s3_loadExtFileSubmittedDate?: string;
  s3_demandNoteIssued?: string;
  s3_demandDeposited?: string;
  s3_onlineRegistrationDone?: string;
  s3_aenOfficeName?: string;
  s3_bankName?: string;
  s3_onlineRegDate?: string;
  s3_discomRemark?: string;
  s3_loanFileUrl?: string;
  s3_discomFileUrl?: string;
  s3_detailsConfirmedByCustomer?: 'Yes' | 'No';

  // S4 — SITE INCHARGE / LOAN OFFICER
  s4_loanApplied?: 'Yes' | 'No';
  s4_bankExecutive?: string;
  s4_physicalFileToBankDate?: string;
  s4_loanProcessStatus?: string;
  s4_loanProcessDate?: string;
  s4_customerSignDone?: 'Yes' | 'No';
  s4_customerSignDate?: string;
  s4_firstInstallmentReceived?: 'Yes' | 'No';
  s4_firstInstallmentAmount?: number;
  s4_firstInstallmentUtr?: string;
  s4_firstInstallmentDate?: string;
  s4_loanRemark?: string;

  // S5 — STORE INCHARGE
  s5_meters?: string;
  s5_metersDate?: string;
  s5_readyToDispatch?: 'Yes' | 'No';
  s5_readyToDispatchDate?: string;
  s5_dispatched?: 'Yes' | 'No';
  s5_dispatchDate?: string;
  s5_meterDetails?: string;
  s5_meterDispatchRemark?: string;
  s5_meterDispatchDate?: string;
  s5_fileMeterToDiscomDate?: string;
  s5_meterTestedReceived?: 'Yes' | 'No';
  s5_materialReadyToDispatch?: string;
  s5_materialReadyToDispatchDate?: string;
  s5_materialListUrl?: string;
  s5_storeDispatchDate?: string;
  s5_storeRemark?: string;

  // S6 — SITE TEAM
  s6_reAssignTo?: string;
  s6_expectedStartDate?: string;
  s6_siteRevisitDate?: string;
  s6_siteRevisitMeasurementUrl?: string;
  s6_materialListRequired?: string;
  s6_materialListUrl?: string;
  s6_siteDrawingUrl?: string;
  s6_materialReadyToDispatch?: 'Yes' | 'No';
  s6_dispatchDate?: string;
  s6_dispatchedMaterialListUrl?: string;
  s6_materialReceivedDate?: string;
  s6_receivedMaterialListUrl?: string;
  s6_workStartDate?: string;
  s6_completionReportSubmitted?: 'Yes' | 'No';
  s6_workCompletionReportUrl?: string;
  s6_photoGpsUrl?: string;
  s6_photoInverterUrl?: string;
  s6_photoStructureUrl?: string;
  s6_photoFoundationUrl?: string;
  s6_photoEarthingUrl?: string;
  s6_photoWiringUrl?: string;
  s6_photoInverterSrNoUrl?: string;
  s6_photoPanelSrNoUrl?: string;
  s6_photoDcrCertUrl?: string;
  s6_photoWorkCompletionCertUrl?: string;
  s6_workEndDate?: string;
  s6_deviationFromFinal?: 'Yes' | 'No';
  s6_deviationDetails?: string;
  s6_deviationCost?: number;
  s6_expectedEndDate?: string;
  s6_remarks?: string;
  s6_assignedTo?: string;
  s6_siteTeamRemark?: string;

  // S7 — OFFICE EXEC (Post-Install)
  s7_onlineDetailsSubmitted?: 'Yes' | 'No';
  s7_onlineSubmissionDate?: string;
  s7_dcrCertificateUrl?: string;
  s7_workCompletionCertificateUrl?: string;
  s7_invoiceAdvanceReceiptUrl?: string;
  s7_installationStatus?: 'On Time' | 'Delay';
  s7_officeRemark?: string;

  // S8 — DISCOM (Post-Install)
  s8_discomInspectionDate?: string;
  s8_meterInstalledDate?: string;
  s8_trainingCertUrl?: string;
  s8_smartMeterConverted?: string;
  s8_convertedPhotoUrl?: string;
  s8_siteOnDate?: string;
  s8_discomStatus?: 'On Time' | 'Delay';
  s8_discomRemark?: string;

  // S9 — LOAN OFFICER (Post-Install)
  s9_secondInstallmentReceived?: 'Yes' | 'No';
  s9_secondInstallmentAmount?: number;
  s9_secondInstallmentUtr?: string;
  s9_secondInstallmentDate?: string;
  s9_loanRemark?: string;

  // S10 — PAYMENT SUMMARY
  s10_balanceApplicable?: 'Yes' | 'No';
  s10_balanceAmount?: number;
  s10_balanceUtr?: string;
  s10_balanceDate?: string;
  s10_paymentSummaryRemarks?: string;

  // S11 — SUBSIDY SECTION
  s11_subsidyAppliedDate?: string;
  s11_subsidyAmount?: number;
  s11_subsidyReceivedDate?: string;
  s11_remarks?: string;
  s11_finalSettlement?: 'Yes' | 'No';

  // S12 — INSURANCE SECTION
  s12_insuranceStatus?: 'Done' | 'Pending';
  s12_policyDetails?: string;
  s12_policyDate?: string;
  s12_remarks?: string;
  s12_assignedTo?: string;
  s12_assignedToEmail?: string;

  execution_assignedTo?: string;
  execution_assignedToEmail?: string;
  s_docCorr_assignedTo?: string;
  s_docCorr_assignedToEmail?: string;
  s_docCorr_docUrl?: string;
  s_loadExt_assignedTo?: string;
  s_loadExt_assignedToEmail?: string;
  s4_loanAssignedTo?: string;
  s4_loanAssignedToEmail?: string;
  s5_storeDispatchAssignedTo?: string;
  s5_storeDispatchAssignedToEmail?: string;
  s5_discomPreAssignedTo?: string;
  s5_discomPreAssignedToEmail?: string;
  s5_preInstallPhotoUrl?: string;
  s6_inchargeAssignedTo?: string;
  s6_inchargeAssignedToEmail?: string;
  s5_storeInchargeAssignedTo?: string;
  s5_storeInchargeAssignedToEmail?: string;
  s7_assignedTo?: string;
  s7_assignedToEmail?: string;
  s8_assignedTo?: string;
  s8_assignedToEmail?: string;
  s9_assignedTo?: string;
  s9_assignedToEmail?: string;
  s11_assignedTo?: string;
  s11_assignedToEmail?: string;
  s10_assignedTo?: string;
  s10_assignedToEmail?: string;
  s_newConn_assignedTo?: string;
  s_newConn_assignedToEmail?: string;
  s_newConn_appliedDate?: string;
  s_newConn_uploadPhotosUrl?: string;
  projectAssigneeEmail?: string;
  assignedTo?: string;
  assignedToName?: string;
  visitedByEmail?: string;
  assignedSalesEmail?: string;
  isBasicSubmitted?: boolean;
  isSurveySubmitted?: boolean;
  isSalesSubmitted?: boolean;
  isFinancialsSubmitted?: boolean;
  isAccountsSubmitted?: boolean;
  isExecutionSubmitted?: boolean;
  finalExecutionStatus?: 'Done' | 'Pending' | 'Under Review';

  // Task Tracking for PMS (Assignment and Completion Dates)
  stepAssignmentDates?: { [key: string]: string }; 
  stepCompletionDates?: { [key: string]: string }; 
  stepDueDates?: { [key: string]: string }; 
  
  projectInchargeName?: string;
  projectInchargeEmail?: string;

  isStep1Submitted?: boolean;
  isStep2Submitted?: boolean;
  isStep3Submitted?: boolean;
  isStep4Submitted?: boolean;
  isStep5Submitted?: boolean;
  isStep6Submitted?: boolean;
  isStep7Submitted?: boolean;
  isStep8Submitted?: boolean;
  isStep9Submitted?: boolean;
  isStep10Submitted?: boolean;
  isStep11Submitted?: boolean;
  isStep12Submitted?: boolean;
  isStep13Submitted?: boolean;
  isStep14Submitted?: boolean;
  isStep15Submitted?: boolean;
  step1Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step2Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step3Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step4Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step5Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step6Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step7Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step8Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step9Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step10Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step11Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step12Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step13Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step14Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step15Status?: 'Pending' | 'Completed' | 'Assigned-Back';
  step1Remark?: string;
  step2Remark?: string;
  step3Remark?: string;
  step4Remark?: string;
  step5Remark?: string;
  step6Remark?: string;
  step7Remark?: string;
  step8Remark?: string;
  step9Remark?: string;
  step10Remark?: string;
  step11Remark?: string;
  step12Remark?: string;
  step13Remark?: string;
  step14Remark?: string;
  step15Remark?: string;
  step1Date?: string;
  step2Date?: string;
  s_loadExt_required?: string;
  s_docCorr_required?: string;
  members?: string[];
  payment_totalAmount?: number;
  payment_receivedAmount?: number;
  payment_balanceAmount?: number;
  payment_status?: 'Pending' | 'Partial' | 'Full';
  payment_remarks?: string;

  // Project Handover and Deliverables fields
  handoverExtraDiscount?: number;
  handoverPaymentsReceived?: 'Yes' | 'No';
  handoverSiteCompleted?: 'Yes' | 'No';
  handoverBillUpdateCreated?: 'Yes' | 'No';
  handoverAssignedAdminEmail?: string;
  handoverAssignedAdminName?: string;
  isHandoverSubmitted?: boolean;
  isHandoverAdminSubmitted?: boolean;
  handoverNextAssigneeEmail?: string;
  handoverNextAssigneeName?: string;

  deliverableTaxInvoice?: boolean;
  deliverableInverterWarranty?: boolean;
  deliverablePanelWarranty?: boolean;
  deliverableCustomerSignaturePhotoUrl?: string;
  deliverableSitePhotosUrl?: string;
  deliverableRemarks?: string;
  isDeliverablesSubmitted?: boolean;
}

export interface PaymentRecord {
  id: string;
  leadId: string;
  leadName: string;
  amount: number;
  date: any;
  utrNo: string;
  paymentType: 'Advance' | 'Installment 1' | 'Installment 2' | 'Balance' | 'Other';
  method: string;
  remarks: string;
  recordedBy: string;
  recordedAt: any;
  status?: 'Pending' | 'Confirmed' | 'Rejected';
  confirmationAssignee?: 'Admin' | 'Sitvik (Admin)' | 'Sitvik' | 'Anmol Rathi' | '';
}

export interface ServiceRequest {
  id: string;
  createdAt: any;
  mobileNumber: string;
  customerName: string;
  address: string;
  issue: string;
  issueType: string;
  assignedTo: string;
  assignedToEmail: string;
  status: 'Open' | 'Under Process' | 'Resolved' | 'Not Resolved' | 'Closed' | 'Complain Register with Company (OEM)';
  isNewCustomer: boolean;
  issuePhotoUrl?: string;
  resolvedPhotoUrl?: string;
  completionCertificateUrl?: string;
  resolutionRemark?: string;
  updatedAt: any;
  createdBy: string;
}

export interface StepDeadlineConfig {
  [stepId: string]: number; // stepId -> number of days
}

export interface GlobalSettings {
  stepDeadlines?: StepDeadlineConfig;
}

export interface CommissionRecord {
  id: string;
  leadId?: string;
  leadName?: string;
  leadIdString?: string;
  recipientName?: string;
  recipientEmail?: string;
  roleType?: 'Lead Creator' | 'Sales Person' | 'Sales Partner';
  totalProjectValue?: number;
  paymentReceived?: number;
  paymentDue?: number;
  percentage?: number;
  totalCommission?: number;
  commissionPaid?: number;
  commissionDue?: number;
  category?: 'Sales Partner' | 'Sales Person';
  name?: string;
  kw?: string;
  mrp?: number;
  soldAt?: number;
  commissionAmount?: number;
  companyShare?: number;
  remark?: string;
  date: any;
  createdBy: string;
}

export interface CommissionRole {
  id?: string;
  name: string;
  role: 'Lead Creator' | 'Sales Person' | 'Sales Partner';
  ratePerKw?: number;
  rateType?: 'percentage' | 'flat';
  rateValue?: number;
  createdAt?: any;
}

export interface CommissionEntry {
  id?: string;
  leadId: string;
  leadIdString: string;
  leadName: string;
  projectValue: number;
  role: 'Lead Creator' | 'Sales Person' | 'Sales Partner';
  personId: string;
  personName: string;
  commissionType: 'percentage' | 'manual';
  percentageValue: number;
  manualAmount: number;
  finalAmount: number;
  paidAmount?: number;
  payments?: any[];
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
}

export interface AppNotification {
  id?: string;
  userId: string;
  message: string;
  taskId: string;
  moduleType: string;
  projectId?: string;
  projectName?: string;
  assignedBy: string;
  timestamp: any;
  isRead: boolean;
}
