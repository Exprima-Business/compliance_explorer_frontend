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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
import formidable from 'formidable';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
// Initialize Supabase client
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabase = createClient(supabaseUrl, supabaseKey);
// Initialize OpenAI
var openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Configure formidable
export var config = {
    api: {
        bodyParser: false,
    },
};
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var form_1, _a, fields, files, fileArray, file, fileContent, scanId, _b, storageData, storageError, completion, analysisResult, _c, resultData, resultError, error_1;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ error: 'Method not allowed' })];
                    }
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 6, , 7]);
                    form_1 = formidable({
                        maxFileSize: 10 * 1024 * 1024, // 10MB
                        keepExtensions: true,
                    });
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            form_1.parse(req, function (err, fields, files) {
                                if (err)
                                    reject(err);
                                resolve([fields, files]);
                            });
                        })];
                case 2:
                    _a = _e.sent(), fields = _a[0], files = _a[1];
                    fileArray = files.file;
                    if (!fileArray || fileArray.length === 0) {
                        return [2 /*return*/, res.status(400).json({ error: 'No file uploaded' })];
                    }
                    file = fileArray[0];
                    fileContent = fs.readFileSync(file.filepath, 'utf-8');
                    scanId = uuidv4();
                    return [4 /*yield*/, supabase
                            .storage
                            .from('scanned-documents')
                            .upload("".concat(scanId, "/").concat(file.originalFilename), fileContent, {
                            contentType: file.mimetype || 'application/octet-stream',
                        })];
                case 3:
                    _b = _e.sent(), storageData = _b.data, storageError = _b.error;
                    if (storageError) {
                        throw new Error('Failed to store document');
                    }
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: "gpt-4",
                            messages: [
                                {
                                    role: "system",
                                    content: "You are a compliance document analyzer. Your task is to identify IT security clauses in the provided text. For each clause found, provide: 1) The clause ID (if available), 2) The clause title, 3) A brief description of the requirement, and 4) The confidence level of the match (0-1). Format the response as a JSON array of objects with these fields: clauseId, title, description, and confidence."
                                },
                                {
                                    role: "user",
                                    content: fileContent
                                }
                            ],
                            temperature: 0.3,
                            max_tokens: 2000,
                        })];
                case 4:
                    completion = _e.sent();
                    analysisResult = JSON.parse(((_d = completion.choices[0].message) === null || _d === void 0 ? void 0 : _d.content) || '[]');
                    return [4 /*yield*/, supabase
                            .from('scan_results')
                            .insert({
                            scan_id: scanId,
                            file_name: file.originalFilename,
                            file_path: storageData.path,
                            analysis_result: analysisResult,
                            created_at: new Date().toISOString(),
                        })];
                case 5:
                    _c = _e.sent(), resultData = _c.data, resultError = _c.error;
                    if (resultError) {
                        throw new Error('Failed to store analysis results');
                    }
                    // Clean up the temporary file
                    fs.unlinkSync(file.filepath);
                    // Return the results
                    return [2 /*return*/, res.status(200).json({
                            scanId: scanId,
                            results: analysisResult,
                        })];
                case 6:
                    error_1 = _e.sent();
                    console.error('Error processing document:', error_1);
                    return [2 /*return*/, res.status(500).json({
                            error: 'Failed to process document',
                            details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                        })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
