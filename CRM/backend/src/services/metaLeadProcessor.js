const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const LeadForm = require('../models/LeadForm');
const User = require('../models/User');
const FacebookPage = require('../models/FacebookPage');
const MetaWebhookLog = require('../models/MetaWebhookLog');
const { getLeadDetails } = require('./metaGraphService');
const { notifySuperAdmins, notifyUser } = require('./notificationService');

const { emitBroadcast } = require('../socket');

/**
 * Convert Meta's field_data array [{name, values: [v]}] into a flat object.
 */
const flattenFieldData = (fieldData = []) => {
  const out = {};
  fieldData.forEach((f) => {
    out[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
  });
  return out;
};

/**
 * Flexible case-insensitive, punctuation-free lookup for Meta Instant Form questions.
 */
const findField = (data = {}, ...candidateKeys) => {
  if (!data || typeof data !== 'object') return null;
  const normalized = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    const cleanKey = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = v;
  }
  for (const key of candidateKeys) {
    const cleanCandidate = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized[cleanCandidate] !== undefined && normalized[cleanCandidate] !== '') {
      return normalized[cleanCandidate];
    }
  }
  return null;
};

/**
 * Detect a likely duplicate lead by email or phone within the last 30 days.
 */
const findDuplicate = async (email, phone) => {
  if (!email && !phone) return null;
  const query = { $or: [] };
  if (email) query.$or.push({ email });
  if (phone) query.$or.push({ phone });
  return Lead.findOne(query).sort({ createdAt: -1 });
};

/**
 * Core handler: processes a single Meta "leadgen" webhook change entry.
 * entry = { leadgen_id, page_id, form_id, created_time, ad_id, ... }
 */
const processLeadgenChange = async (entry, webhookLogId) => {
  const { leadgen_id: metaLeadId, page_id: pageId, form_id: formId } = entry;

  const existing = await Lead.findOne({ metaLeadId });
  if (existing) return existing; // idempotent — already processed

  const page = await FacebookPage.findOne({ pageId }).select('+pageAccessToken');
  const leadForm = await LeadForm.findOne({ formId }).populate('linkedCampaign autoAssignAdminId');

  let fieldData = {};
  let graphDetails = null;

  if (entry.field_data && Array.isArray(entry.field_data)) {
    // Direct field data provided (e.g. testing tools or manual webhooks)
    fieldData = flattenFieldData(entry.field_data);
  } else {
    try {
      const accessToken = page?.pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN;
      graphDetails = await getLeadDetails(metaLeadId, accessToken);
      fieldData = flattenFieldData(graphDetails?.field_data || []);
    } catch (err) {
      // Store raw entry even if the Graph API lookup fails; can be retried later
      fieldData = { _fetchError: err.message };
    }
  }

  // Detect whether lead originated from Meta Lead Ads Testing Tool
  const isTestingLead = Boolean(
    entry.ad_id === '0' ||
    entry.ad_id === 0 ||
    !entry.ad_id ||
    entry.is_test ||
    entry.test ||
    String(metaLeadId).startsWith('test:') ||
    (graphDetails && graphDetails.is_organic === false && (!entry.ad_id || entry.ad_id === '0')) ||
    Object.values(fieldData).some(v => typeof v === 'string' && (v.toLowerCase().includes('test lead') || v.toLowerCase().includes('dummy data')))
  );

  const testingToolRemark = isTestingLead ? 'Captured via Meta Lead Ads Testing Tool' : undefined;

  // Exact Fields with Dynamic Synonyms:
  // 1. Company Name
  const company =
    findField(fieldData, 'Company Name', 'company_name', 'company', 'organization', 'organization_name', 'business_name', 'business') ||
    'Corporate Prospect';

  // 2. Total Employees (Headcount)
  const employeeCount =
    findField(fieldData, 'Total Employees', 'total_employees', 'total_employee', 'employee_count', 'company_size', 'no_of_employees', 'how_many_employees', 'headcount', 'employees', 'workforce') ||
    '21-50 Employees';

  // 3. Contact Person / Applicant (Who applied)
  const fullName =
    findField(fieldData, 'Contact Person', 'contact_person', 'full_name', 'name', 'applicant_name', 'who_is_applying', 'applicant') ||
    [fieldData.first_name, fieldData.last_name].filter(Boolean).join(' ') ||
    'HRMS Inbound Prospect';

  // 4. Designation / Role
  const jobTitle =
    findField(fieldData, 'Designation', 'designation', 'job_title', 'role', 'title', 'position', 'who_is_applying_designation') ||
    'HR Manager';

  // 5. Work Email
  const email =
    findField(fieldData, 'Work Email', 'work_email', 'email', 'email_address', 'business_email', 'contact_email') ||
    'prospect@company.com';

  // 6. Contact Number / Mobile
  const phone =
    findField(fieldData, 'Contact Number', 'contact_number', 'phone_number', 'phone', 'mobile_no', 'mobile_number', 'mobile', 'contact_no') ||
    '+91 0000000000';

  // 7. What they require (Requirements & Remarks from user)
  const requirements =
    findField(fieldData, 'What do you require', 'what_do_you_require', 'requirements', 'requirement', 'what_they_require', 'remarks', 'primary_interest', 'notes', 'description', 'message', 'what_are_you_looking_for', 'needed_modules', 'modules_needed') ||
    (isTestingLead ? 'Inbound HRMS demo requirement tested via Meta Lead Ads Testing Tool' : 'Automated Payroll & Compliance, Attendance & Leave Management');

  // Ensure CTA button is recorded if not already present
  if (!fieldData['Submit Button'] && !fieldData['cta_button']) {
    fieldData['Submit Button'] = 'Book Free Demo';
  }

  // Dynamic HRMS Modules & System Info
  const rawModules = findField(fieldData, 'modules_needed', 'modules', 'interested_modules', 'Required Modules') || requirements;
  const hrmsModules = Array.isArray(rawModules)
    ? rawModules
    : typeof rawModules === 'string'
      ? rawModules.split(/[,|]/).map(s => s.trim()).filter(Boolean)
      : ['Automated Payroll & Compliance', 'Biometric & GPS Attendance'];
  const currentSystem = findField(fieldData, 'current_system', 'current_hr_system', 'Current HR Software') || 'Manual Excel Spreadsheets';
  const implementationTimeline = findField(fieldData, 'timeline', 'implementation_timeline') || 'Within 15 Days';

  const duplicate = await findDuplicate(email, phone);

  const campaign = leadForm?.linkedCampaign;
  const assignedAdminId = leadForm?.autoAssignAdminId?._id;

  const lead = await Lead.create({
    fullName,
    email,
    phone,
    company,
    employeeCount,
    jobTitle,
    hrmsModules,
    requirements,
    isTestingLead,
    testingToolRemark,
    currentSystem,
    implementationTimeline,
    demoStatus: 'requested',
    source: isTestingLead ? 'Meta Lead Ads Testing Tool' : (leadForm ? 'Facebook Instant Form' : 'meta_lead_ad'),
    campaign: campaign?._id,
    campaignName: campaign?.name || (isTestingLead ? 'Meta Developer Testing Tool' : 'Meta Ads HRMS Inbound'),
    status: 'new',
    priority: employeeCount.includes('200') || employeeCount.includes('500') ? 'urgent' : 'high',
    tags: isTestingLead ? ['Meta Testing Tool', 'Test Lead'] : ['Meta Instant Form'],
    assignedAdminId,
    metaLeadId,
    metaFormId: formId,
    metaPageId: pageId,
    rawFieldData: fieldData,
    isDuplicate: !!duplicate,
    duplicateOfLead: duplicate?._id,
    interactions: [
      {
        type: 'note',
        note: isTestingLead
          ? `🧪 Test Lead auto-captured from Meta Lead Ads Testing Tool (${employeeCount} emps • ${jobTitle} • Requirements: ${requirements.substring(0, 60)})`
          : `HRMS Lead auto-captured from Meta Lead Ads (${employeeCount} emps • ${jobTitle})`,
        performedBy: isTestingLead ? 'Meta Testing Tool' : 'System',
      },
    ],
  });

  // Emit real-time WebSocket event so CRM UI updates live
  try {
    emitBroadcast('lead:new', lead);
  } catch (socketErr) {
    // Non-blocking socket broadcast
  }

  if (campaign) {
    await Campaign.findByIdAndUpdate(campaign._id, { $inc: { leadsCount: 1 } });
  }

  if (webhookLogId) {
    await MetaWebhookLog.findByIdAndUpdate(webhookLogId, { processedLead: lead._id });
  }

  if (assignedAdminId) {
    await notifyUser(assignedAdminId, {
      type: 'new_lead',
      title: 'New Lead Assigned',
      message: `${fullName} came in via Meta Lead Ads and was assigned to you.`,
      refId: lead._id,
      link: `/leads/${lead._id}`,
    });
  } else {
    await notifySuperAdmins({
      type: 'new_lead',
      title: 'New Lead Captured',
      message: `${fullName} came in via Meta Lead Ads.`,
      refId: lead._id,
      link: `/leads/${lead._id}`,
    });
  }

  return lead;
};

module.exports = { processLeadgenChange, flattenFieldData };
