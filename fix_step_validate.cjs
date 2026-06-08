const fs = require('fs');

const validationLogic = `
  const getMissingExecutionFields = (stepId: number, lead: any): string[] => {
    const missing: string[] = [];
    if (stepId === 1) {
      if (!lead.docCorrectionRemark) missing.push("Correction Remark");
    } else if (stepId === 2) {
      if (!lead.s3_loadExtFileUrl) missing.push("Load Ext File");
      if (!lead.s3_loadExtFileSubmittedDate) missing.push("Load Ext File Submitted Date");
      if (!lead.s3_demandNoteIssued) missing.push("Demand Note Issued (Date)");
      if (!lead.s3_demandDeposited) missing.push("Demand Deposited (Date)");
    } else if (stepId === 3) {
      if (!lead.s3_detailsConfirmedByCustomer) missing.push("Customer Confirmation");
      if (!lead.s3_aenOfficeName) missing.push("AEN Office Name");
      if (!lead.s3_bankName) missing.push("Bank & Branch Name");
      if (!lead.s3_onlineRegistrationDone) missing.push("Online Registration Done");
      if (lead.loanRequired === 'Yes' && !lead.s4_loanApplied) missing.push("Loan Applied");
      if (lead.loanRequired === 'Yes' && !lead.s3_loanFileUrl) missing.push("Loan File");
      if (!lead.s3_discomFileUrl) missing.push("Discom File");
    } else if (stepId === 4) {
      if (!lead.s4_physicalFileToBankDate) missing.push("Physical File Submited to Bank Date");
      if (!lead.s4_loanProcessDate) missing.push("Loan Process Date");
      if (!lead.s4_customerSignDate) missing.push("Customer Sign Done Date");
      if (!lead.s4_firstInstallmentReceived) missing.push("First Installment Received Status");
      if (lead.s4_firstInstallmentReceived === 'Yes') {
        if (!lead.s4_firstInstallmentAmount) missing.push("Amount");
        if (!lead.s4_firstInstallmentUtr) missing.push("UTR No");
        if (!lead.s4_firstInstallmentDate) missing.push("First Installment Date");
      }
    } else if (stepId === 5) {
      if (!lead.s5_meters) missing.push("Meter Status");
      if (!lead.s5_readyToDispatchDate) missing.push("Meter Ready to Dispatch Date");
      if (!lead.s5_dispatchDate) missing.push("Meter Dispatch Date");
    } else if (stepId === 6) {
      if (!lead.s5_fileMeterToDiscomDate) missing.push("File & Meter Submited to Discom Date");
      if (!lead.s5_preInstallPhotoUrl) missing.push("Upload Pre-Install Photo");
      if (!lead.s5_meterTestedReceived) missing.push("Meter Tested & Received");
    } else if (stepId === 7) {
      if (!lead.s6_expectedStartDate) missing.push("Expected Work Start Date");
      if (!lead.s6_siteRevisitDate) missing.push("Site Revisit Date");
      if (!lead.s6_materialListUrl) missing.push("Material List");
      if (!lead.s6_siteDrawingUrl) missing.push("Site Drawing");
    } else if (stepId === 8) {
      if (!lead.s5_materialReadyToDispatch) missing.push("Material Ready to Dispatch");
      if (!lead.s5_materialReadyToDispatchDate) missing.push("Material Ready to Dispatch Date");
      if (!lead.s5_storeDispatchDate) missing.push("Dispatch Date");
      if (!lead.s5_materialListUrl) missing.push("Store Material List");
    } else if (stepId === 9) {
      if (!lead.s6_materialReceivedDate) missing.push("Material Received Date");
      if (!lead.s6_receivedMaterialListUrl) missing.push("Received Material List");
      if (!lead.s6_workStartDate) missing.push("Work Start Date");
      if (!lead.s6_completionReportSubmitted) missing.push("Work Completion Report Submitted");
      if (lead.s6_completionReportSubmitted === 'Yes') {
        if (!lead.s6_workCompletionReportUrl) missing.push("Completion Report File");
      }
      if (!lead.s6_photoGpsUrl) missing.push("Project GPS Photos");
      if (!lead.s6_photoInverterUrl) missing.push("Inverter Photo");
      if (!lead.s6_photoStructureUrl) missing.push("Structure Photo");
      if (!lead.s6_photoFoundationUrl) missing.push("Foundation Photo");
      if (!lead.s6_photoEarthingUrl) missing.push("Earthing Photo");
      if (!lead.s6_photoWiringUrl) missing.push("Wiring Photo");
      if (!lead.s6_photoInverterSrNoUrl) missing.push("Inverter Sr No Photo");
      if (!lead.s6_photoPanelSrNoUrl) missing.push("Panel Sr No Photo");
      if (!lead.s6_workEndDate) missing.push("Work End Date");
      if (!lead.s6_expectedEndDate) missing.push("Expected End Date");
    } else if (stepId === 10) {
      if (!lead.s7_onlineSubmissionDate) missing.push("Online Submission Date");
      if (!lead.s7_installationStatus) missing.push("Installation Status");
      if (!lead.s7_dcrCertificateUrl) missing.push("DCR Certificate");
      if (!lead.s7_workCompletionCertificateUrl) missing.push("Work Completion Certificate");
    } else if (stepId === 11) {
      if (!lead.s8_discomInspectionDate) missing.push("Discom Inspection Date");
      if (!lead.s8_meterInstalledDate) missing.push("Meter Installed Date");
      if (!lead.s8_trainingCertUrl) missing.push("Training Certificate");
      if (!lead.s8_siteOnDate) missing.push("Site ON Date");
      if (!lead.s8_discomStatus) missing.push("Status (On Time / Delay)");
    } else if (stepId === 12) {
      if (!lead.s9_secondInstallmentReceived) missing.push("2nd Installment Received Status");
      if (lead.s9_secondInstallmentReceived === 'Yes') {
        if (!lead.s9_secondInstallmentAmount) missing.push("Amount");
        if (!lead.s9_secondInstallmentUtr) missing.push("UTR No");
        if (!lead.s9_secondInstallmentDate) missing.push("Date");
      }
    } else if (stepId === 13) {
      if (!lead.s10_balanceApplicable) missing.push("Balance Applicable");
      if (lead.s10_balanceApplicable === 'Yes') {
        if (!lead.s10_balanceAmount) missing.push("Balance Amount");
        if (!lead.s10_balanceUtr) missing.push("Balance UTR");
        if (!lead.s10_balanceDate) missing.push("Balance Date");
      }
    } else if (stepId === 14) {
      if (!lead.s11_subsidyAppliedDate) missing.push("Subsidy Applied Date");
      if (!lead.s11_subsidyAmount) missing.push("Subsidy Amount");
      if (!lead.s11_subsidyReceivedDate) missing.push("Subsidy Received Date");
    }
    return missing;
  };
`;

let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

if (!code.includes('getMissingExecutionFields')) {
  code = code.replace(
    '  const handleStepAction = async () => {', 
    validationLogic + '\n  const handleStepAction = async () => {'
  );
}

const buttonPattern = /onClick\=\{\(\) \=\> \{\n\s*setRemarkModal\(\{\n\s*isOpen\: true,\n\s*stepId,\n\s*type\: \'complete\',/g;

code = code.replace(
  buttonPattern, 
  `onClick={() => {
                    if (activeTab === 'execution') {
                      const missing = getMissingExecutionFields(stepId, lead);
                      if (missing.length > 0) {
                        showNotification("Missing mandatory fields: " + missing.join(", "), "error");
                        return;
                      }
                    }
                    setRemarkModal({
                      isOpen: true,
                      stepId,
                      type: 'complete',`
);

fs.writeFileSync('src/components/LeadDetail.tsx', code);
