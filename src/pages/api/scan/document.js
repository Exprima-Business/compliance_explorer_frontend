var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
var CHUNK_SIZE = 4000; // Characters per chunk
var BATCH_SIZE = 5; // Number of chunks to process in parallel
var supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
var openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
export var config = {
    api: {
        bodyParser: false,
    },
};
export var activeScans = new Map();
// Function to process a single chunk
function processChunk(chunk) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var completion, content, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, openai.chat.completions.create({
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
                        })];
                case 1:
                    completion = _b.sent();
                    content = ((_a = completion.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || '[]';
                    return [2 /*return*/, JSON.parse(content)];
                case 2:
                    error_1 = _b.sent();
                    console.error('Error processing chunk:', error_1);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var form_1, _a, fields, files, fileArray, file, scanId_1, fileContent, totalChunks, _b, storageData, storageError, chunks, i, results, _loop_1, i, _c, resultData, resultError, finalProgress, error_2;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ error: 'Method not allowed' })];
                    }
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 9, , 10]);
                    form_1 = formidable();
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            form_1.parse(req, function (err, fields, files) {
                                if (err)
                                    reject(err);
                                resolve([fields, files]);
                            });
                        })];
                case 2:
                    _a = _d.sent(), fields = _a[0], files = _a[1];
                    fileArray = files.file;
                    if (!fileArray || fileArray.length === 0) {
                        return [2 /*return*/, res.status(400).json({ error: 'No file uploaded' })];
                    }
                    file = fileArray[0];
                    scanId_1 = uuidv4();
                    fileContent = fs.readFileSync(file.filepath, 'utf-8');
                    totalChunks = Math.ceil(fileContent.length / CHUNK_SIZE);
                    activeScans.set(scanId_1, {
                        scanId: scanId_1,
                        current: 0,
                        total: totalChunks,
                        status: 'processing',
                        message: 'Starting document analysis...'
                    });
                    return [4 /*yield*/, supabase.storage
                            .from('documents')
                            .upload("".concat(scanId_1, "/").concat(file.originalFilename), fs.createReadStream(file.filepath))];
                case 3:
                    _b = _d.sent(), storageData = _b.data, storageError = _b.error;
                    if (storageError) {
                        throw new Error('Failed to store document');
                    }
                    chunks = [];
                    for (i = 0; i < fileContent.length; i += CHUNK_SIZE) {
                        chunks.push(fileContent.slice(i, i + CHUNK_SIZE));
                    }
                    results = [];
                    _loop_1 = function (i) {
                        var batch, batchResults;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    batch = chunks.slice(i, i + BATCH_SIZE);
                                    return [4 /*yield*/, Promise.all(batch.map(function (chunk, index) { return __awaiter(_this, void 0, void 0, function () {
                                            var result, progress, error_3;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        _a.trys.push([0, 2, , 3]);
                                                        return [4 /*yield*/, processChunk(chunk)];
                                                    case 1:
                                                        result = _a.sent();
                                                        progress = activeScans.get(scanId_1);
                                                        if (progress) {
                                                            progress.current = i + index + 1;
                                                            progress.message = "Processing chunk ".concat(progress.current, " of ").concat(progress.total, "...");
                                                            activeScans.set(scanId_1, progress);
                                                        }
                                                        return [2 /*return*/, result];
                                                    case 2:
                                                        error_3 = _a.sent();
                                                        console.error("Error processing chunk ".concat(i + index, ":"), error_3);
                                                        return [2 /*return*/, []];
                                                    case 3: return [2 /*return*/];
                                                }
                                            });
                                        }); }))];
                                case 1:
                                    batchResults = _e.sent();
                                    results.push.apply(results, batchResults.flat());
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _d.label = 4;
                case 4:
                    if (!(i < chunks.length)) return [3 /*break*/, 7];
                    return [5 /*yield**/, _loop_1(i)];
                case 5:
                    _d.sent();
                    _d.label = 6;
                case 6:
                    i += BATCH_SIZE;
                    return [3 /*break*/, 4];
                case 7: return [4 /*yield*/, supabase
                        .from('scan_results')
                        .insert({
                        scan_id: scanId_1,
                        file_name: file.originalFilename,
                        file_path: storageData.path,
                        analysis_result: results,
                        created_at: new Date().toISOString(),
                    })];
                case 8:
                    _c = _d.sent(), resultData = _c.data, resultError = _c.error;
                    if (resultError) {
                        throw new Error('Failed to store analysis results');
                    }
                    finalProgress = activeScans.get(scanId_1);
                    if (finalProgress) {
                        finalProgress.status = 'completed';
                        finalProgress.message = 'Analysis completed successfully';
                        activeScans.set(scanId_1, finalProgress);
                    }
                    // Clean up the temporary file
                    fs.unlinkSync(file.filepath);
                    // Return the results
                    return [2 /*return*/, res.status(200).json({
                            scanId: scanId_1,
                            results: results,
                        })];
                case 9:
                    error_2 = _d.sent();
                    console.error('Error processing document:', error_2);
                    return [2 /*return*/, res.status(500).json({
                            error: 'Failed to process document',
                            details: error_2 instanceof Error ? error_2.message : 'Unknown error'
                        })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Add an endpoint to check scan progress
export function getScanProgress(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var scanId, progress;
        return __generator(this, function (_a) {
            scanId = req.query.scanId;
            if (!scanId || typeof scanId !== 'string') {
                return [2 /*return*/, res.status(400).json({ error: 'Invalid scan ID' })];
            }
            progress = activeScans.get(scanId);
            if (!progress) {
                return [2 /*return*/, res.status(404).json({ error: 'Scan not found' })];
            }
            return [2 /*return*/, res.status(200).json(progress)];
        });
    });
}
