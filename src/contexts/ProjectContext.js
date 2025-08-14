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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiCall } from '../services/api';
import { useOrg } from './OrgContext';
import { dlog } from '../utils/debugLog';
var ProjectContext = createContext(undefined);
var PROJECT_KEY = 'projectId';
export var ProjectProvider = function (_a) {
    var children = _a.children;
    var _b = useOrg(), orgInitialized = _b.initialized, currentOrg = _b.currentOrg;
    var _c = useState([]), projects = _c[0], setProjects = _c[1];
    var _d = useState(null), currentProject = _d[0], setCurrentProjectState = _d[1];
    var _e = useState(false), initialized = _e[0], setInitialized = _e[1];
    var refreshProjects = useCallback(function () { return __awaiter(void 0, void 0, void 0, function () {
        var resp, storedId_1, match;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dlog('ProjectProvider: refreshProjects called', {
                        orgInitialized: orgInitialized,
                        currentOrg: currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.id,
                        currentOrgName: currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.name
                    });
                    // Only load projects if org context is initialized and we have a current org
                    if (!orgInitialized || !currentOrg) {
                        dlog('ProjectProvider: skipping project load - org not ready', {
                            orgInitialized: orgInitialized,
                            hasCurrentOrg: !!currentOrg
                        });
                        setInitialized(false);
                        return [2 /*return*/];
                    }
                    dlog('ProjectProvider: loading projects for org', { orgId: currentOrg.id, orgName: currentOrg.name });
                    return [4 /*yield*/, apiCall('/api/projects')];
                case 1:
                    resp = _a.sent();
                    if (!resp.error && Array.isArray(resp.data)) {
                        dlog('ProjectProvider: projects loaded successfully', {
                            count: resp.data.length,
                            projects: resp.data.map(function (p) { return ({ id: p.id, name: p.name }); })
                        });
                        setProjects(resp.data);
                        storedId_1 = localStorage.getItem(PROJECT_KEY);
                        match = resp.data.find(function (p) { return p.id === storedId_1; }) || resp.data[0] || null;
                        if (match) {
                            setCurrentProjectState(match);
                            localStorage.setItem(PROJECT_KEY, match.id);
                            dlog('ProjectProvider: current project set', { projectId: match.id, projectName: match.name });
                        }
                        else {
                            setCurrentProjectState(null);
                            localStorage.removeItem(PROJECT_KEY);
                            dlog('ProjectProvider: no current project found');
                        }
                        setInitialized(true);
                    }
                    else {
                        dlog('ProjectProvider: failed to load projects', { error: resp.error });
                    }
                    return [2 /*return*/];
            }
        });
    }); }, [orgInitialized, currentOrg]);
    useEffect(function () {
        refreshProjects();
    }, [refreshProjects]);
    var setCurrentProject = function (p) {
        setCurrentProjectState(p);
        localStorage.setItem(PROJECT_KEY, p.id);
    };
    var createProject = function (name, description) { return __awaiter(void 0, void 0, void 0, function () {
        var resp, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, apiCall('/api/projects', {
                        method: 'POST',
                        body: JSON.stringify({ name: name, description: description }),
                    })];
                case 1:
                    resp = _a.sent();
                    if (resp.error) {
                        msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
                        throw new Error(msg);
                    }
                    if (resp.data) {
                        setProjects(function (prev) { return __spreadArray(__spreadArray([], prev, true), [resp.data], false); });
                        setCurrentProject(resp.data);
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var value = {
        projects: projects,
        currentProject: currentProject,
        initialized: initialized,
        setCurrentProject: setCurrentProject,
        refreshProjects: refreshProjects,
        createProject: createProject,
    };
    return _jsx(ProjectContext.Provider, { value: value, children: children });
};
export var useProject = function () {
    var ctx = useContext(ProjectContext);
    if (!ctx)
        throw new Error('useProject must be used within ProjectProvider');
    return ctx;
};
