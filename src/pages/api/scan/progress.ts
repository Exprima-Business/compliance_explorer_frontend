import type { NextApiRequest, NextApiResponse } from 'next';
import { activeScans } from './document';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scanId } = req.query;

  if (!scanId || typeof scanId !== 'string') {
    return res.status(400).json({ error: 'Scan ID is required' });
  }

  const progress = activeScans.get(scanId);

  if (!progress) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  return res.status(200).json(progress);
} 