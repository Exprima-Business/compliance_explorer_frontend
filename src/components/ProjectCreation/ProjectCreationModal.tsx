// Project Creation Modal Component
import React, { useState, useEffect } from 'react';
import { 
  CreateProjectRequest, 
  ProjectOptions, 
  ValidationResult, 
  Project 
} from '../../types/projectCreation';
import { EnhancedProjectCreationStateManager } from '../../services/state/EnhancedProjectCreationStateManager';
import { ProjectCreationProgress } from './ProjectCreationProgress';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: string;
  onProjectCreated: (project: Project) => void;
}

type ModalStep = 'validation' | 'options' | 'creating' | 'completed';

export const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({
  isOpen,
  onClose,
  scanId,
  onProjectCreated
}) => {
  const [step, setStep] = useState<ModalStep>('validation');
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectOptions>({
    projectName: '',
    description: '',
    validateAgainstDatabase: true,
    includeAllClauses: true,
    minConfidence: 0.5,
    createBookmarks: true,
    bookmarkStatus: 'DETECTED'
  });
  const [stateManager, setStateManager] = useState<EnhancedProjectCreationStateManager | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('validation');
      setValidationResults(null);
      setError(null);
      setLoading(false);
      setProjectOptions(prev => ({
        ...prev,
        projectName: `Project from Scan ${scanId.slice(0, 8)}`,
        description: ''
      }));
    }
  }, [isOpen, scanId]);

  // Load validation preview when modal opens
  useEffect(() => {
    if (isOpen && step === 'validation') {
      loadValidationPreview();
    }
  }, [isOpen, step]);

  const loadValidationPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const manager = new EnhancedProjectCreationStateManager(scanId);
      const results = await manager.loadValidationPreview(scanId);
      setValidationResults(results);
      
    } catch (error) {
      console.error('Failed to load validation preview:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      setStep('creating');
      setError(null);
      
      // Initialize state manager
      const manager = new EnhancedProjectCreationStateManager(scanId);
      await manager.initialize();
      
      // Add state change listener
      manager.addStateChangeListener((newState, previousState) => {
        if (newState.status === 'completed' && newState.project) {
          onProjectCreated(newState.project);
          setStep('completed');
        } else if (newState.status === 'error') {
          setError(newState.error || 'Project creation failed');
          setStep('options'); // Go back to options step
        }
      });
      
      setStateManager(manager);
      
      // Create project
      const request: CreateProjectRequest = {
        scanId,
        projectName: projectOptions.projectName,
        description: projectOptions.description,
        options: projectOptions
      };
      
      await manager.createProjectFromScan(request);
      
    } catch (error) {
      console.error('Failed to create project:', error);
      setError((error as Error).message);
      setStep('options');
    }
  };

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Scan Validation Preview</h3>
        <p className="mt-2 text-sm text-gray-500">
          Review the validation results before creating your project
        </p>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Loading validation preview...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading validation preview</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {validationResults && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {validationResults.validatedClauses}
              </div>
              <div className="text-sm text-green-700">Validated Clauses</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {validationResults.missingClauses}
              </div>
              <div className="text-sm text-yellow-700">Missing Clauses</div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {validationResults.totalClauses}
              </div>
              <div className="text-sm text-blue-700">Total Clauses</div>
            </div>
          </div>
          
          {validationResults.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {validationResults.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep('options')}
          disabled={loading || !validationResults}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Project Options</h3>
        <p className="mt-2 text-sm text-gray-500">
          Configure your project settings
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Project Name *
          </label>
          <input
            type="text"
            value={projectOptions.projectName}
            onChange={(e) => setProjectOptions(prev => ({ ...prev, projectName: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter project name"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={projectOptions.description}
            onChange={(e) => setProjectOptions(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={3}
            placeholder="Enter project description (optional)"
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="validateAgainstDatabase"
              checked={projectOptions.validateAgainstDatabase}
              onChange={(e) => setProjectOptions(prev => ({ ...prev, validateAgainstDatabase: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="validateAgainstDatabase" className="ml-2 block text-sm text-gray-900">
              Validate against clause database
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeAllClauses"
              checked={projectOptions.includeAllClauses}
              onChange={(e) => setProjectOptions(prev => ({ ...prev, includeAllClauses: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="includeAllClauses" className="ml-2 block text-sm text-gray-900">
              Include all detected clauses
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="createBookmarks"
              checked={projectOptions.createBookmarks}
              onChange={(e) => setProjectOptions(prev => ({ ...prev, createBookmarks: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="createBookmarks" className="ml-2 block text-sm text-gray-900">
              Create bookmarks for detected clauses
            </label>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Minimum Confidence Threshold: {Math.round(projectOptions.minConfidence * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={projectOptions.minConfidence}
            onChange={(e) => setProjectOptions(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
            className="mt-1 block w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => setStep('validation')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back
        </button>
        <button
          onClick={handleCreateProject}
          disabled={!projectOptions.projectName.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Project
        </button>
      </div>
    </div>
  );

  const renderCreatingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Creating Project</h3>
        <p className="mt-2 text-sm text-gray-500">
          Please wait while we create your project...
        </p>
      </div>
      
      {stateManager && (
        <ProjectCreationProgress stateManager={stateManager} />
      )}
      
      <div className="flex justify-center">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderCompletedStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Project Created Successfully</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your project has been created and is ready to use.
        </p>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Close
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {step === 'validation' && renderValidationStep()}
            {step === 'options' && renderOptionsStep()}
            {step === 'creating' && renderCreatingStep()}
            {step === 'completed' && renderCompletedStep()}
          </div>
        </div>
      </div>
    </div>
  );
};
