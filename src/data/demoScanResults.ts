/**
 * Pre-cached demo scan results for RSA Conference booth demos.
 *
 * These replicate a realistic scan of a DoD RFP/contract containing
 * DFARS, FAR, and NIST references. The clauseId values match the
 * normalizedCode values in the production clause database so that
 * clauseMatching.ts validation succeeds.
 */

import type { DetectedClause, ProcessingMetadata } from '../services/scanApi';

const now = new Date().toISOString();

export const DEMO_FILE_NAME = 'DoD_RFP_W15QKN-25-R-0042.pdf';

export const DEMO_METADATA: ProcessingMetadata = {
  totalTokens: 12840,
  estimatedCost: 0.019,
  processingTime: 28400,
  totalPages: 47,
  modelUsed: 'gpt-4o-mini',
  chunksProcessed: 12,
  totalChunks: 12,
};

export const DEMO_DETECTED_CLAUSES: DetectedClause[] = [
  {
    id: 'demo-001',
    clauseId: 'DFARS 252.204-7012',
    title: 'Safeguarding Covered Defense Information and Cyber Incident Reporting',
    description:
      'Requires contractors to provide adequate security on all covered contractor information systems and report cyber incidents within 72 hours to the DoD Cyber Crime Center.',
    confidence: 0.97,
    supportingContext:
      'Section H.4: "The contractor shall comply with DFARS 252.204-7012, including all requirements for safeguarding Covered Defense Information (CDI) and reporting cyber incidents."',
    family: 'DFARS',
    conditions: 'Applies when handling Covered Defense Information (CDI)',
    implementationRequirements:
      'Implement NIST SP 800-171 Rev 2 security requirements; report cyber incidents within 72 hours',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-002',
    clauseId: 'DFARS 252.204-7021',
    title: 'Cybersecurity Maturity Model Certification Requirements',
    description:
      'Requires contractors to achieve and maintain a specific CMMC level as a condition of contract award.',
    confidence: 0.95,
    supportingContext:
      'Section H.5: "Offerors must possess a current CMMC Level 2 certification at the time of award and maintain it throughout contract performance."',
    family: 'DFARS',
    conditions: 'Required for contract award and maintained during performance',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-003',
    clauseId: 'FAR 52.204-21',
    title: 'Basic Safeguarding of Covered Contractor Information Systems',
    description:
      'Requires contractors to apply 15 basic safeguarding requirements to covered contractor information systems.',
    confidence: 0.94,
    supportingContext:
      'Section I, Clause Listing: "FAR 52.204-21 Basic Safeguarding of Covered Contractor Information Systems (Nov 2021)"',
    family: 'FAR',
    conditions: 'Applies to all covered contractor information systems',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-004',
    clauseId: 'DFARS 252.204-7019',
    title: 'Notice of NIST SP 800-171 DoD Assessment Requirements',
    description:
      'Requires offerors to have a current NIST SP 800-171 DoD Assessment with results posted in SPRS.',
    confidence: 0.92,
    supportingContext:
      'Section L.3: "Offerors shall have a current assessment of the NIST SP 800-171 security requirements posted in the Supplier Performance Risk System (SPRS)."',
    family: 'DFARS',
    conditions: 'Required at time of proposal submission',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-005',
    clauseId: 'DFARS 252.204-7020',
    title: 'NIST SP 800-171 DoD Assessment Requirements',
    description:
      'Provides for DoD assessment of contractor implementation of NIST SP 800-171 security requirements.',
    confidence: 0.91,
    supportingContext:
      'Section H.6: "The Government reserves the right to conduct a Medium or High assessment of the contractor\'s NIST SP 800-171 implementation per DFARS 252.204-7020."',
    family: 'DFARS',
    conditions: 'Government may assess at any time during performance',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-006',
    clauseId: 'NIST SP 800-171',
    title: 'Protecting Controlled Unclassified Information in Nonfederal Systems',
    description:
      'Provides 110 security requirements across 14 families for protecting CUI in nonfederal systems and organizations.',
    confidence: 0.96,
    supportingContext:
      'Referenced throughout Sections H.4, H.5, H.6, and L.3 as the foundational security standard. "Contractors shall implement all security requirements in NIST SP 800-171."',
    family: 'NIST',
    conditions: 'Applies to all nonfederal systems processing, storing, or transmitting CUI',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-007',
    clauseId: 'FAR 52.204-25',
    title: 'Prohibition on Contracting for Certain Telecommunications and Video Surveillance Services or Equipment',
    description:
      'Prohibits contractors from providing or using covered telecommunications equipment or services.',
    confidence: 0.89,
    supportingContext:
      'Section I, Clause Listing: "FAR 52.204-25 Prohibition on Contracting for Certain Telecommunications and Video Surveillance Services or Equipment (Nov 2021)"',
    family: 'FAR',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-008',
    clauseId: 'DFARS 252.239-7010',
    title: 'Cloud Computing Services',
    description:
      'Establishes requirements for cloud computing services used to process government data, including FedRAMP authorization.',
    confidence: 0.87,
    supportingContext:
      'Section H.8: "Any cloud service offerings used to process, store, or transmit CUI shall meet FedRAMP Moderate baseline per DFARS 252.239-7010."',
    family: 'DFARS',
    conditions: 'Applies when using cloud services for government data',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-009',
    clauseId: 'FAR 52.204-2',
    title: 'Security Requirements',
    description:
      'General security requirements for contractor personnel and facilities with access to classified information.',
    confidence: 0.85,
    supportingContext:
      'Section I: "FAR 52.204-2 Security Requirements — applicable at the SECRET level for portions of work identified in the DD 254."',
    family: 'FAR',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-010',
    clauseId: 'DFARS 252.204-7008',
    title: 'Compliance with Safeguarding Covered Defense Information Controls',
    description:
      'Provision requiring offerors to represent compliance with NIST SP 800-171 security requirements at time of proposal.',
    confidence: 0.88,
    supportingContext:
      'Section K, Representations: "By submission of this offer, the Offeror represents that it will implement the security requirements specified by NIST SP 800-171."',
    family: 'DFARS',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-011',
    clauseId: 'FAR 52.239-1',
    title: 'Privacy or Security Safeguards',
    description:
      'Requires contractors to establish safeguards for government information processed under the contract.',
    confidence: 0.83,
    supportingContext:
      'Section I: "FAR 52.239-1 Privacy or Security Safeguards (Aug 1996)"',
    family: 'FAR',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
  {
    id: 'demo-012',
    clauseId: 'DFARS 252.227-7013',
    title: 'Rights in Technical Data—Noncommercial Items',
    description:
      'Defines government rights in technical data pertaining to noncommercial items developed under the contract.',
    confidence: 0.82,
    supportingContext:
      'Section H.12: "Technical data delivered under this contract shall be marked in accordance with DFARS 252.227-7013."',
    family: 'DFARS',
    isSelected: false,
    implementationStatus: 'NOT_STARTED',
    userModified: false,
    lastModified: now,
  },
];
