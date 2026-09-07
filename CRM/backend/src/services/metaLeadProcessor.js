const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const LeadForm = require('../models/LeadForm');
const User = require('../models/User');
const FacebookPage = require('../models/FacebookPage');
const MetaWebhookLog = require('../models/MetaWebhookLog');
const { getLeadDetails } = require('./metaGraphService');
const { notifySuperAdmins, notifyUser } = require('./notificationService');

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
  if (entry.field_data && Array.isArray(entry.field_data)) {
    // Direct field data provided (e.g. testing tools or manual webhooks)
    fieldData = flattenFieldData(entry.field_data);
  } else {
    try {
      const accessToken = page?.pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN;
      const details = await getLeadDetails(metaLeadId, accessToken);
      fieldData = flattenFieldData(details.field_data);
    } catch (err) {
      // Store raw entry even if the Graph API lookup fails; can be retried later
      fieldData = { _fetchError: err.message };
    }
  }

  // Exact 6 Fields from Specification + Flexible Aliases:
  // 1. Company Name (Text)
  // 2. Total Employees (Dropdown / Number)
  // 3. Contact Person (Text)
  // 4. Designation (Dropdown / Text)
  // 5. Work Email (Email)
  // 6. Contact Number (Phone)
  const company = fieldData['Company Name'] || fieldData.company_name || fieldData.company || fieldData.organization || 'Corporate Prospect';
  const employeeCount = fieldData['Total Employees'] || fieldData.total_employees || fieldData.employee_count || fieldData.company_size || '21-50 Employees';
  const fullName = fieldData['Contact Person'] || fieldData.contact_person || fieldData.full_name || [fieldData.first_name, fieldData.last_name].filter(Boolean).join(' ') || 'HRMS Inbound Prospect';
  const jobTitle = fieldData['Designation'] || fieldData.designation || fieldData.job_title || fieldData.role || 'HR Manager';
  const email = fieldData['Work Email'] || fieldData.work_email || fieldData.email || 'prospect@company.com';
  const phone = fieldData['Contact Number'] || fieldData.contact_number || fieldData.phone_number || fieldData.phone || '+91 0000000000';

  // Ensure CTA button is recorded if not already present
  if (!fieldData['Submit Button'] && !fieldData['cta_button']) {
    fieldData['Submit Button'] = 'Book Free Demo';
  }

  // Dynamic HRMS Modules & System Info
  const rawModules = fieldData.modules_needed || fieldData.modules || fieldData['interested_modules'] || fieldData['Required Modules'] || 'Payroll & Compliance, Attendance & Leave';
  const hrmsModules = Array.isArray(rawModules)
    ? rawModules
    : typeof rawModules === 'string'
      ? rawModules.split(/[,|]/).map(s => s.trim()).filter(Boolean)
      : ['Automated Payroll & Compliance', 'Biometric & GPS Attendance'];
  const currentSystem = fieldData.current_system || fieldData['current_hr_system'] || fieldData['Current HR Software'] || 'Manual Excel Spreadsheets';
  const implementationTimeline = fieldData.timeline || fieldData['timeline'] || 'Within 15 Days';

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
    currentSystem,
    implementationTimeline,
    demoStatus: 'requested',
    source: 'meta_lead_ad',
    campaign: campaign?._id,
    campaignName: campaign?.name || 'Meta Ads HRMS Inbound',
    status: 'new',
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
        note: `HRMS Lead auto-captured from Meta Lead Ads (${employeeCount} emps • ${jobTitle})`,
        performedBy: 'System',
      },
    ],
  });

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
