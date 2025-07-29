import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { FiMenu } from 'react-icons/fi';
import { useLocation, useParams } from 'react-router-dom';
import ContentResults from '../../components/dashboard/ContentIngestion/ContentResults';
import IngestForm from '../../components/dashboard/ContentIngestion/IngestForm';
import ContentSources from './ContentSources';
import toast from 'react-hot-toast';


type ExtractedContent = {
  success: boolean;
  content_source_id: number;
  chunks: Array<{
    content: string;
    label: string;
    file_source?: string;
    page?: number;
    section_type?: string;
  }>;
  figures?: Array<{
    path: string;
    page: number;
    caption?: string;
  }>;
  filename?: string;
  url?: string;
  error?: string;
};

const ContentIngestion: React.FC = () => {
  const [extractedResults, setExtractedResults] = useState<ExtractedContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  // Try to get workspaceId from params or location.state
  const workspaceId = params.id || location.state?.workspaceId;

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  const handleProcessingEnd = () => {
    setIsProcessing(false);
  };

  const handleContentUploaded = (results: ExtractedContent[]) => {
    setExtractedResults(results); // Only keep the latest results, no duplicates
    setIsProcessing(false);
    toast.success('Content uploaded and processed successfully!');
  };

  const handleReset = () => {
    setExtractedResults([]);
    setIsProcessing(false);
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 relative">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      {/* Right side panel for Content Sources */}
      <div
        className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ${showSourcesPanel ? 'translate-x-0' : 'translate-x-full'} w-full max-w-md bg-white border-l border-gray-200 shadow-2xl backdrop-blur-sm`}
      >
        <div className="overflow-y-auto h-full">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Content Sources</h2>
              <button
                onClick={() => setShowSourcesPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiMenu className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
          <ContentSources />
          </div>
        </div>
      </div>
      {/* Menu button to open/close panel */}
      <button
        onClick={() => setShowSourcesPanel((prev) => !prev)}
        className="absolute top-6 right-6 z-50 p-3 rounded-xl bg-white border border-gray-200 shadow-lg hover:shadow-xl hover:bg-primary/5 transition-all duration-200 backdrop-blur-sm"
        title="Toggle Content Sources"
      >
        <FiMenu className="w-5 h-5 text-gray-700" />
      </button>
      <div className={`transition-all duration-300 ${showSourcesPanel ? 'lg:mr-[28rem]' : ''}`}>
        {extractedResults.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="w-full max-w-4xl">
            <IngestForm
              onContentUploaded={handleContentUploaded}
              onProcessingStart={handleProcessingStart}
              onProcessingEnd={handleProcessingEnd}
              isProcessing={isProcessing}
            />
            </div>
          </div>
        ) : (
          <ContentResults
            extractedResults={extractedResults}
            onReset={handleReset}
            workspaceId={workspaceId}
          />
        )}
      </div>
    </div>
  );
};

export default ContentIngestion;
