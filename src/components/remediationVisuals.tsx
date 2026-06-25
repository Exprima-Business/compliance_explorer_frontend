import {
  Shield, Description, AccountTree, VpnKey, WorkspacePremium, School, ReportProblem,
  MonitorHeart, DeleteSweep, LocalOffer, Gavel, Badge, Public, Block, Inventory2,
  BugReport, CloudUpload, TaskAlt,
} from '@mui/icons-material';

/** Shared remediation-move visuals — used by the dashboard's Priority
 *  Remediation card and the full All Remediation Actions page. */

export const GREEN = '#15803d', AMBER = '#b45309', RED = '#b91c1c', PURPLE = '#534AB7';

export const riskBg = (l: string) =>
  l === 'High' ? 'rgba(163,45,45,0.12)' : l === 'Medium' ? 'rgba(180,83,9,0.12)' : 'rgba(0,0,0,0.06)';
export const riskFg = (l: string) =>
  l === 'High' ? '#A32D2D' : l === 'Medium' ? '#854d0e' : '#5f5e5a';
export const statusSx = (s: string) =>
  s === 'Complete' ? { bgcolor: 'rgba(21,128,61,0.12)', color: '#15803d' }
    : s === 'In progress' ? { bgcolor: 'rgba(180,83,9,0.12)', color: '#854d0e' }
      : { bgcolor: 'rgba(0,0,0,0.06)', color: '#5f5e5a' };

/**
 * Map a remediation (satisfaction-mechanism) label to an icon. Keyed off the
 * label text; a mechanism_type → icon mapping in the catalog would be more
 * robust (open question with the team).
 */
export function iconFor(label: string) {
  const l = label.toLowerCase();
  const sx = { fontSize: 18, color: PURPLE };
  if (l.includes('framework control')) return <Shield sx={sx} />;
  if (l.includes('flowdown') || l.includes('subcontract')) return <AccountTree sx={sx} />;
  if (l.includes('policy') || l.includes('procedure') || l.includes('conformance')) return <Description sx={sx} />;
  if (l.includes('access') || l.includes('restriction')) return <VpnKey sx={sx} />;
  if (l.includes('authorization') || l.includes('assessment') || l.includes('certification')) return <WorkspacePremium sx={sx} />;
  if (l.includes('training')) return <School sx={sx} />;
  if (l.includes('incident')) return <ReportProblem sx={sx} />;
  if (l.includes('monitoring')) return <MonitorHeart sx={sx} />;
  if (l.includes('sanitization') || l.includes('media')) return <DeleteSweep sx={sx} />;
  if (l.includes('marking') || l.includes('handling')) return <LocalOffer sx={sx} />;
  if (l.includes('agreement') || l.includes('statut') || l.includes('attestation') || l.includes('role')) return <Gavel sx={sx} />;
  if (l.includes('personnel') || l.includes('credential')) return <Badge sx={sx} />;
  if (l.includes('residency')) return <Public sx={sx} />;
  if (l.includes('prohibition')) return <Block sx={sx} />;
  if (l.includes('evidence') || l.includes('preservation')) return <Inventory2 sx={sx} />;
  if (l.includes('vulnerability')) return <BugReport sx={sx} />;
  if (l.includes('post') || l.includes('government system')) return <CloudUpload sx={sx} />;
  return <TaskAlt sx={sx} />;
}
