import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const CHUNK_SIZE = 4000; // Characters per chunk
const BATCH_SIZE = 5; // Number of chunks to process in parallel

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ScanProgress {
  scanId: string;
  current: number;
  total: number;
  status: 'processing' | 'completed' | 'error';
  message?: string;
}

export const activeScans = new Map<string, ScanProgress>();

// Function to process a single chunk
async function processChunk(chunk: string): Promise<any[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a compliance document analyzer. Your task is to identify IT security clauses in the provided text. For each clause found, provide: 1) The clause ID (if available), 2) The clause title, 3) A brief description of the requirement, and 4) The confidence level of the match (0-1). Format the response as a JSON array of objects with these fields: clauseId, title, description, and confidence."
        },
        {
          role: "user",
          content: chunk
        }
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0].message?.content || '[]';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error processing chunk:', error);
    return [];
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable();
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const fileArray = files.file as formidable.File[];
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = fileArray[0];

    // Generate a unique scan ID
    const scanId = uuidv4();

    // Initialize scan progress
    const fileContent = fs.readFileSync(file.filepath, 'utf-8');
    const totalChunks = Math.ceil(fileContent.length / CHUNK_SIZE);
    
    activeScans.set(scanId, {
      scanId,
      current: 0,
      total: totalChunks,
      status: 'processing',
      message: 'Starting document analysis...'
    });

    // Store the file in Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(`${scanId}/${file.originalFilename}`, fs.createReadStream(file.filepath));

    if (storageError) {
      throw new Error('Failed to store document');
    }

    // Split content into chunks
    const chunks: string[] = [];
    for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
      chunks.push(fileContent.slice(i, i + CHUNK_SIZE));
    }

    // Process chunks in batches
    const results: any[] = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (chunk, index) => {
          try {
            const result = await processChunk(chunk);
            // Update progress
            const progress = activeScans.get(scanId);
            if (progress) {
              progress.current = i + index + 1;
              progress.message = `Processing chunk ${progress.current} of ${progress.total}...`;
              activeScans.set(scanId, progress);
            }
            return result;
          } catch (error) {
            console.error(`Error processing chunk ${i + index}:`, error);
            return [];
          }
        })
      );
      results.push(...batchResults.flat());
    }

    // Store the results in Supabase
    const { data: resultData, error: resultError } = await supabase
      .from('scan_results')
      .insert({
        scan_id: scanId,
        file_name: file.originalFilename,
        file_path: storageData.path,
        analysis_result: results,
        created_at: new Date().toISOString(),
      });

    if (resultError) {
      throw new Error('Failed to store analysis results');
    }

    // Update final progress
    const finalProgress = activeScans.get(scanId);
    if (finalProgress) {
      finalProgress.status = 'completed';
      finalProgress.message = 'Analysis completed successfully';
      activeScans.set(scanId, finalProgress);
    }

    // Clean up the temporary file
    fs.unlinkSync(file.filepath);

    // Return the results
    return res.status(200).json({
      scanId,
      results,
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return res.status(500).json({ 
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Add an endpoint to check scan progress
export async function getScanProgress(req: NextApiRequest, res: NextApiResponse) {
  const { scanId } = req.query;
  
  if (!scanId || typeof scanId !== 'string') {
    return res.status(400).json({ error: 'Invalid scan ID' });
  }

  const progress = activeScans.get(scanId);
  if (!progress) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  return res.status(200).json(progress);
} 