import type { CascadeObligation } from '../hooks/useCascadeSurface';

/**
 * Shared grouping/provenance helpers for the cascade deep views (Posture, Gaps).
 * Authority grouping buckets obligations into the famous-frameworks vs long-tail
 * categories that make the moat legible; provenance is the FE-derived coarse
 * "why it applies" (precise "via {parent clause}" needs a BE root+edge follow-up).
 */

/** Map an obligation to a coarse authority group. */
export function authorityGroup(o: CascadeObligation): string {
  const t = o.artifactType;
  const id = (o.identifier || '').toUpperCase();
  const auth = (o.sourceAuthority || '').toUpperCase();
  if (t === 'dfars_clause' || id.startsWith('DFARS') || id.startsWith('CMMC') || auth.includes('CMMC')) return 'DoD (DFARS) / CMMC';
  if (t === 'nist_publication' || id.startsWith('NIST') || id.startsWith('FIPS') || id.includes('800-')) return 'NIST (800-53/171/FIPS)';
  if (t === 'far_clause' || id.startsWith('FAR ') || id.includes('FAR 52')) return 'FAR';
  if (id.includes('36 CFR 1194') || id.includes('508')) return 'Section 508';
  if (id.includes('45 CFR 164') || id.includes('HIPAA')) return 'HIPAA';
  if (t === 'omb_memo' || auth.includes('OMB') || id.includes('32 CFR 2002') || id.includes('CUI') || auth.includes('NARA')) return 'OMB / CUI (NARA)';
  if (t === 'hsar_clause' || t === 'agency_supplement_clause' || id.startsWith('HSAR') || id.startsWith('VAAR') || id.startsWith('HHSAR')) return 'Agency supplements';
  if (t === 'statute' || id.includes('U.S.C') || id.includes('USC') || auth.includes('PRIVACY')) return 'Statutes / privacy';
  if (t === 'executive_order' || id.startsWith('EO ') || id.includes('EXECUTIVE ORDER')) return 'Executive orders';
  return 'Other / agency';
}

/** Coarse FE-derived "why this applies to you". */
export function provenanceOf(o: CascadeObligation, fwName: Record<string, string>): string {
  if (o.explicitSatisfied) return 'marked satisfied';
  const names = o.frameworkIds.map(id => fwName[id]).filter(Boolean);
  return names.length ? `in your ${names[0]} scope` : 'beyond your activated frameworks';
}
