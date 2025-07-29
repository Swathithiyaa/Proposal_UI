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
    <div className="h-full bg-white relative">
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
        className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ${showSourcesPanel ? 'translate-x-0' : 'translate-x-full'} w-full max-w-md bg-white border-l border-gray-200 shadow-lg`}
      >
        <div className="overflow-y-auto h-[calc(100%-56px)] px-4 sm:px-6">
          <ContentSources />
        </div>
      </div>
      {/* Menu button to open/close panel */}
      <button
        onClick={() => setShowSourcesPanel((prev) => !prev)}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-white border border-gray-200 shadow hover:bg-primary/10"
        title="Toggle Content Sources"
      >
        <FiMenu className="w-6 h-6 text-gray-700" />
      </button>
      <div className={`transition-all duration-300 ${showSourcesPanel ? 'lg:mr-[28rem]' : ''}`}>
        {extractedResults.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <IngestForm
              onContentUploaded={handleContentUploaded}
              onProcessingStart={handleProcessingStart}
              onProcessingEnd={handleProcessingEnd}
              isProcessing={isProcessing}
            />
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
