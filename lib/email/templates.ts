type RenderedEmail = {
  subject: string;
  text: string;
};

export function renderPatientReleaseEmail(input: {
  patientName: string;
  caseNumber: string;
  portalUrl: string;
}): RenderedEmail {
  return {
    subject: `Your AHI PEME case ${input.caseNumber} has been released`,
    text: [
      `Hi ${input.patientName},`,
      "",
      `Your Pre-Employment Medical Examination case (${input.caseNumber}) is now available in the AHI Patient Portal.`,
      "",
      `Sign in here:`,
      input.portalUrl,
      "",
      `If you did not request this examination, please contact AHI directly.`,
      "",
      `— American Hospital Inc.`,
    ].join("\n"),
  };
}

export function renderClientReleaseEmail(input: {
  companyName: string;
  contactName: string;
  caseNumber: string;
  portalUrl: string;
}): RenderedEmail {
  return {
    subject: `PEME case ${input.caseNumber} released for ${input.companyName}`,
    text: [
      `Hello ${input.contactName},`,
      "",
      `A Pre-Employment Medical Examination case (${input.caseNumber}) has been released for ${input.companyName}.`,
      "",
      `Sign in to the AHI Client Portal to view released cases:`,
      input.portalUrl,
      "",
      `— American Hospital Inc.`,
    ].join("\n"),
  };
}

export function renderReleasingStaffEmail(input: {
  caseNumber: string;
  dashboardUrl: string;
}): RenderedEmail {
  return {
    subject: `New case ready for releasing — ${input.caseNumber}`,
    text: [
      `A physician has finalized a decision for case ${input.caseNumber}.`,
      `The case is now in FOR_RELEASING status and ready for the releasing queue.`,
      "",
      `Open the staff dashboard:`,
      input.dashboardUrl,
      "",
      `— AHI System`,
    ].join("\n"),
  };
}
