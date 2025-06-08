import type { NextApiRequest, NextApiResponse } from 'next';
export declare const config: {
    api: {
        bodyParser: boolean;
    };
};
interface ScanProgress {
    scanId: string;
    current: number;
    total: number;
    status: 'processing' | 'completed' | 'error';
    message?: string;
}
export declare const activeScans: Map<string, ScanProgress>;
export default function handler(req: NextApiRequest, res: NextApiResponse): Promise<void>;
export declare function getScanProgress(req: NextApiRequest, res: NextApiResponse): Promise<void>;
export {};
