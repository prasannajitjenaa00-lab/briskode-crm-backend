/**
 * Seed script for HRMS Meta Ads Campaigns and Inbound Leads
 * Usage: node src/utils/seedHRMS.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');

const run = async () => {
  await connectDB();

  const admin = await User.findOne({ role: 'super_admin' });
  if (!admin) {
    console.error('Please run npm run seed first to create the super admin.');
    process.exit(1);
  }

  // 1. Create or Update Meta HRMS Campaigns
  const campaignData = [
    {
      name: 'Meta Ads: Automated Payroll & Statutory Compliance',
      platform: 'both',
      status: 'ACTIVE',
      totalBudget: 45000,
      spend: 28400,
      leadsCount: 14,
      cpl: 2028,
      objective: 'LEAD_GENERATION',
      startDate: new Date(Date.now() - 14 * 86400000),
      notes: 'Targeting HR Heads, CFOs and Founders for Indian statutory payroll automation.',
    },
    {
      name: 'Meta Ads: Biometric & Geofenced Attendance Portal',
      platform: 'facebook',
      status: 'ACTIVE',
      totalBudget: 35000,
      spend: 19800,
      leadsCount: 11,
      cpl: 1800,
      objective: 'LEAD_GENERATION',
      startDate: new Date(Date.now() - 10 * 86400000),
      notes: 'Focus on multi-branch retail, factories, and logistics companies.',
    },
    {
      name: 'Meta Ads: Enterprise HRMS & Performance Appraisals (PMS)',
      platform: 'instagram',
      status: 'ACTIVE',
      totalBudget: 50000,
      spend: 31200,
      leadsCount: 8,
      cpl: 3900,
      objective: 'LEAD_GENERATION',
      startDate: new Date(Date.now() - 20 * 86400000),
      notes: 'High-ticket enterprise acquisition for 100+ headcount organizations.',
    },
  ];

  const createdCampaigns = [];
  for (const c of campaignData) {
    let camp = await Campaign.findOne({ name: c.name });
    if (!camp) {
      camp = await Campaign.create(c);
    }
    createdCampaigns.push(camp);
  }

  // 2. Create realistic HRMS Inbound Meta Leads
  const hrmsLeads = [
    {
      fullName: 'Priya Sharma',
      email: 'priya.sharma@apexlogistics.in',
      phone: '+91 98201 44521',
      company: 'Apex Logistics Pvt Ltd',
      employeeCount: '50-200 employees',
      jobTitle: 'Head of Human Resources',
      hrmsModules: ['Automated Payroll & Compliance', 'Biometric & GPS Attendance', 'Employee Mobile App'],
      currentSystem: 'Manual Excel Spreadsheets & Fingerprint Machine',
      implementationTimeline: 'Immediate (within 15 days)',
      demoStatus: 'requested',
      demoPreferredDate: 'Tomorrow, 3:00 PM',
      source: 'Facebook Instant Form',
      campaign: createdCampaigns[0]._id,
      campaignName: createdCampaigns[0].name,
      status: 'new',
      priority: 'urgent',
      estimatedValue: 240000,
      score: 94,
      assignedAdminId: admin._id,
      metaLeadId: 'leadgen_meta_8892100491',
      metaFormId: 'form_hrms_payroll_demo_01',
      rawFieldData: {
        full_name: 'Priya Sharma',
        company_name: 'Apex Logistics Pvt Ltd',
        work_email: 'priya.sharma@apexlogistics.in',
        phone_number: '+91 98201 44521',
        how_many_employees: '180 employees across 3 branches',
        job_title: 'Head of HR',
        primary_interest: 'Automated PF/ESI computation and geo-tagged mobile attendance for field drivers.',
      },
      dateCaptured: new Date(Date.now() - 45 * 60000), // 45 mins ago
      followUpRequired: true,
      nextFollowUpAction: 'Call to confirm 15-minute live payroll product demo',
      nextFollowUpDate: 'Today',
      interactions: [
        {
          type: 'note',
          note: 'Inbound Meta Lead captured from Facebook Instant Form. High-intent 180-employee company looking to replace Excel.',
          performedBy: 'System (Meta Webhook)',
        },
      ],
    },
    {
      fullName: 'Vikramaditya Rao',
      email: 'v.rao@zenithhealth.org',
      phone: '+91 98450 11299',
      company: 'Zenith Health Systems',
      employeeCount: '200-500 employees',
      jobTitle: 'VP - People & Culture',
      hrmsModules: ['Automated Payroll & Compliance', 'Attendance & Leave', 'Performance (PMS)', 'Recruitment ATS'],
      currentSystem: 'Outdated On-Premises Legacy Desktop Software',
      implementationTimeline: 'This Month',
      demoStatus: 'scheduled',
      demoPreferredDate: 'Wednesday, 11:30 AM',
      source: 'Instagram Lead Ad',
      campaign: createdCampaigns[2]._id,
      campaignName: createdCampaigns[2].name,
      status: 'qualified',
      priority: 'high',
      estimatedValue: 520000,
      score: 98,
      assignedAdminId: admin._id,
      metaLeadId: 'leadgen_meta_9103829102',
      metaFormId: 'form_hrms_enterprise_demo',
      rawFieldData: {
        full_name: 'Vikramaditya Rao',
        company_name: 'Zenith Health Systems',
        work_email: 'v.rao@zenithhealth.org',
        phone_number: '+91 98450 11299',
        how_many_employees: '380 healthcare staff',
        job_title: 'VP of People & Culture',
        primary_interest: 'Looking for modern cloud HRMS with shift rotations, biometric sync, and annual appraisal cycles.',
      },
      dateCaptured: new Date(Date.now() - 3 * 3600000),
      followUpRequired: true,
      nextFollowUpAction: 'Send calendar invite with customized healthcare shift management slide deck',
      nextFollowUpDate: 'Today',
      interactions: [
        {
          type: 'note',
          note: 'Meta Lead Ad Ingested. Enterprise medical client with 380 staff.',
          performedBy: 'System (Meta Webhook)',
        },
        {
          type: 'call',
          note: 'Connected with Vikramaditya. Confirmed 380 seats requirement. Demo scheduled for Wednesday.',
          performedBy: admin.name,
        },
      ],
    },
    {
      fullName: 'Kavita Menon',
      email: 'kavita@novaretail.co',
      phone: '+91 97110 88231',
      company: 'Nova Retail Ventures',
      employeeCount: '20-50 employees',
      jobTitle: 'HR & Operations Manager',
      hrmsModules: ['Biometric & GPS Attendance', 'Employee Mobile App'],
      currentSystem: 'Standalone Fingerprint Device with USB Export',
      implementationTimeline: 'Immediate (within 15 days)',
      demoStatus: 'requested',
      demoPreferredDate: 'Today, 5:00 PM',
      source: 'Facebook Instant Form',
      campaign: createdCampaigns[1]._id,
      campaignName: createdCampaigns[1].name,
      status: 'new',
      priority: 'high',
      estimatedValue: 96000,
      score: 88,
      assignedAdminId: admin._id,
      metaLeadId: 'leadgen_meta_7281920199',
      metaFormId: 'form_hrms_attendance_v2',
      rawFieldData: {
        full_name: 'Kavita Menon',
        company_name: 'Nova Retail Ventures',
        work_email: 'kavita@novaretail.co',
        phone_number: '+91 97110 88231',
        how_many_employees: '42 store employees',
        job_title: 'HR & Operations Manager',
        primary_interest: 'Store staff biometric attendance auto-sync to cloud without manual USB drives.',
      },
      dateCaptured: new Date(Date.now() - 2 * 3600000),
      followUpRequired: true,
      nextFollowUpAction: 'Send WhatsApp brochure and schedule live portal demo',
      nextFollowUpDate: 'Today',
      interactions: [
        {
          type: 'note',
          note: 'Lead captured from Facebook Instant Form (Attendance Campaign)',
          performedBy: 'System',
        },
      ],
    },
    {
      fullName: 'Arjun Singhania',
      email: 'arjun@cloudscaler.tech',
      phone: '+91 99881 22340',
      company: 'CloudScaler Software Labs',
      employeeCount: '50-200 employees',
      jobTitle: 'Founder & Managing Director',
      hrmsModules: ['Automated Payroll & Compliance', 'Recruitment ATS', 'Employee Mobile App'],
      currentSystem: 'Google Sheets & CA manual payroll outsource',
      implementationTimeline: 'Within 30 Days',
      demoStatus: 'completed',
      demoPreferredDate: 'Completed Yesterday',
      source: 'Instagram Lead Ad',
      campaign: createdCampaigns[0]._id,
      campaignName: createdCampaigns[0].name,
      status: 'proposal',
      priority: 'urgent',
      estimatedValue: 180000,
      score: 92,
      assignedAdminId: admin._id,
      metaLeadId: 'leadgen_meta_6619280194',
      metaFormId: 'form_hrms_payroll_demo_01',
      dateCaptured: new Date(Date.now() - 24 * 3600000),
      followUpRequired: true,
      nextFollowUpAction: 'Follow up on sent annual subscription quote of ₹1,80,000/year',
      nextFollowUpDate: 'Tomorrow',
      interactions: [
        {
          type: 'note',
          note: 'Demo conducted. Founder loved the 1-click payslip WhatsApp feature and automated TDS calculations.',
          performedBy: admin.name,
        },
      ],
    },
  ];

  for (const l of hrmsLeads) {
    const exists = await Lead.findOne({ metaLeadId: l.metaLeadId });
    if (!exists) {
      await Lead.create(l);
      console.log(`[Seed HRMS] Created lead: ${l.fullName} (${l.company})`);
    }
  }

  console.log('[Seed HRMS] HRMS Meta Ads Campaigns & Inbound Leads successfully populated.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('[Seed HRMS] Error:', err);
  process.exit(1);
});
