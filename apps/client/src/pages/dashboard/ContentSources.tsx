/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCalendar, FiEye, FiFile, FiFileText, FiGlobe, FiTrash } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { API } from '../../utils/constants';

type ContentSource = {
  id: number;
  name: string;
  type: 'pdf' | 'docx' | 'web';
  source_url: string;
  created_at: string;
};

const ContentSources: React.FC = () => {
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'pdf' | 'docx' | 'web'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    // Show loading toast while fetching sources
    const toastId = toast.loading('Loading content sources...');
    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.LIST()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
        toast.success('Content sources loaded', { id: toastId });
      } else {
        toast.error('Failed to load content sources', { id: toastId });
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast.error('Failed to load content sources', { id: toastId });
    } finally {
      setLoading(false);
      toast.dismiss(toastId);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (confirm('Are you sure you want to delete this content source?')) {
      // Show loading toast while deleting
      const toastId = toast.loading('Deleting content source...');
      try {
        const response = await fetch(
          `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.DELETE_SOFT(sourceId)}`,
          { method: 'DELETE' },
        );
        if (response.ok) {
          setSources((prev) => prev.filter((s) => s.id !== sourceId));
          toast.success('Content source deleted', { id: toastId });
        } else {
          toast.error('Failed to delete content source', { id: toastId });
        }
      } catch (error) {
        console.error('Error deleting source:', error);
        toast.error('Failed to delete content source', { id: toastId });
      } finally {
        toast.dismiss(toastId);
      }
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FiFile className="w-5 h-5 text-red-500" />;
      case 'docx':
        return <FiFileText className="w-5 h-5 text-blue-500" />;
      case 'web':
        return <FiGlobe className="w-5 h-5 text-green-500" />;
      default:
        return <FiFile className="w-5 h-5 text-gray-500" />;
    }
  };

  const truncateName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const filteredSources = sources.filter(
    (source) => selectedType === 'all' || source.type === selectedType,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Add toast for navigation actions
  const handleUploadContent = () => {
    toast('Navigating to upload content...');
    navigate('/dashboard/content-ingestion');
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-3">Content Sources</h1>
        <p className="text-neutral-600">View and manage all your extracted content sources</p>
      </div>

      <div className="flex flex-row flex-wrap gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-full">
        {[
          { key: 'all', label: 'All Sources' },
          { key: 'pdf', label: 'PDF' },
          { key: 'docx', label: 'DOCX' },
          { key: 'web', label: 'Web' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedType === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredSources.length === 0 ? (
        <div className="text-center py-12">
          <FiFile className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content sources found</h3>
          <p className="text-gray-500 mb-4">
            {selectedType === 'all'
              ? "You haven't uploaded any content sources yet."
              : `No ${selectedType.toUpperCase()} sources found.`}
          </p>
          <button
            onClick={handleUploadContent}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Upload Content
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {filteredSources.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 mt-1">{getSourceIcon(source.type)}</div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-semibold text-black leading-tight break-words"
                      title={source.name}
                    >
                      {truncateName(source.name)}
                    </h3>
                    <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mt-1">
                      {source.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/dashboard/content-sources/${source.id}`)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="View details"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete source"
                  >
                    <FiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-4">
                <FiCalendar className="w-4 h-4 mr-2" />
                {new Date(source.created_at).toLocaleDateString()}
              </div>

              <button
                onClick={() => navigate(`/dashboard/content-sources/${source.id}`)}
                className="w-full bg-primary/10 text-primary py-2 px-4 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
              >
                View Content
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentSources;
