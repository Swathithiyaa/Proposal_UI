/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BiTrash } from 'react-icons/bi';
import { FiFile, FiGlobe, FiLoader, FiSearch, FiUpload } from 'react-icons/fi';
import { useSources } from '../../../hooks/useSources';
import { API } from '../../../utils/constants';

type ContentSource = {
  id: number;
  name: string;
  type: 'pdf' | 'docx' | 'web';
  source_url: string;
  created_at: string;
};

type IngestFormProps = {
  onContentUploaded: (results: any[]) => void;
  onProcessingStart: () => void;
  onProcessingEnd: () => void;
  isProcessing: boolean;
};

const IngestForm: React.FC<IngestFormProps> = ({
  onContentUploaded,
  onProcessingStart,
  isProcessing,
  onProcessingEnd,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [webLinks, setWebLinks] = useState<string>('');
  const [errors, setErrors] = useState<{ file?: string; url?: string }>({});
  // Restore all state and logic for existing sources
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [existingSources, setExistingSources] = useState<ContentSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<ContentSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(false);

  const { uploadSources } = useSources();

  // Fetch existing sources when switching to 'existing' tab
  useEffect(() => {
    if (uploadType === 'existing') {
      fetchExistingSources();
    }
  }, [uploadType]);

  const fetchExistingSources = async () => {
    setLoadingExisting(true);
    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.LIST()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setExistingSources(data.sources || []);
      }
    } catch (error) {
      console.error('Error fetching existing sources:', error);
      toast.error('Failed to load existing sources');
    } finally {
      setLoadingExisting(false);
    }
  };

  const fetchSourceContent = async (sourceId: number) => {
    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.SOURCES.BASE_URL()}${API.ENDPOINTS.SOURCES.BY_ID(sourceId)}`,
      );
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          content_source_id: data.source.id,
          chunks: data.chunks,
          images: data.images,
          tables: data.tables,
          filename: data.source.name,
          type: data.source.type,
        };
      }
    } catch (error) {
      console.error('Error fetching source content:', error);
    }
    return null;
  };

  const toggleSourceSelection = (source: ContentSource) => {
    setSelectedSources((prev) => {
      const exists = prev.find((s) => s.id === source.id);
      if (exists) {
        return prev.filter((s) => s.id !== source.id);
      } else {
        return [...prev, source];
      }
    });
  };

  const filteredExistingSources = existingSources.filter(
    (source) =>
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FiFile className="w-4 h-4 text-red-500" />;
      case 'docx':
        return <FiFile className="w-4 h-4 text-blue-500" />;
      case 'web':
        return <FiGlobe className="w-4 h-4 text-green-500" />;
      default:
        return <FiFile className="w-4 h-4 text-gray-500" />;
    }
  };

  const validateFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return allowedTypes.includes(file.type);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const validFiles = files.filter(validateFile);

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    setErrors((prev) => ({
      ...prev,
      file: validFiles.length !== files.length ? 'Only PDF and DOCX files are allowed' : undefined,
    }));

    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWebLinks(e.target.value);
    setErrors((prev) => ({ ...prev, url: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      onProcessingStart();

      let results: any[] = [];

      if (uploadType === 'file' && selectedFiles.length > 0) {
        results = await uploadSources({ files: selectedFiles });
      } else if (uploadType === 'url' && webLinks.trim()) {
        const urls = webLinks
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        results = await uploadSources({ urls });
      } else if (uploadType === 'existing' && selectedSources.length > 0) {
        results = await Promise.all(
          selectedSources.map(async (source) => {
            const sourceContent = await fetchSourceContent(source.id);
            if (sourceContent) {
              return sourceContent;
            }
            return {
              success: false,
              error: `Failed to fetch content for source ID: ${source.id}`,
            };
          }),
        );
      }

      if (results.length > 0) {
        const successfulResults = results.filter((r: any) => r.success);
        const failedResults = results.filter((r: any) => !r.success);

        if (successfulResults.length > 0) {
          toast.success(`Successfully processed ${successfulResults.length} source(s)`);
          onContentUploaded(results);
        }

        if (failedResults.length > 0) {
          failedResults.forEach((r: any) => {
            toast.error(`Failed: ${r.error}`);
          });
        }

        setSelectedFiles([]);
        setWebLinks('');
        setErrors({});
        setSelectedSources([]); // Clear selected sources after processing
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process content. Please try again.');
    } finally {
      if (onProcessingEnd) {
        onProcessingEnd();
      }
    }
  };

  const canSubmit =
    !isProcessing &&
    ((uploadType === 'file' && selectedFiles.length > 0 && !errors.file) ||
      (uploadType === 'url' && webLinks.trim().length > 0 && !errors.url));

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg mb-6">
          <FiUpload className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Content Ingestion</h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
          Transform your documents and web content into structured, searchable knowledge for your proposals
        </p>
      </div>

      {/* Upload Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div
          className={`group p-8 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl ${
            uploadType === 'file'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg scale-105'
              : 'border-gray-200 hover:border-primary/30 hover:shadow-lg'
          }`}
          onClick={() => !isProcessing && setUploadType('file')}
        >
          <div className="flex items-center mb-6">
            <div className={`p-3 rounded-xl mr-4 transition-all duration-300 ${
              uploadType === 'file' 
                ? 'bg-primary/20 shadow-md' 
                : 'bg-primary/10 group-hover:bg-primary/15'
            }`}>
              <FiFile className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Document Upload</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">PDF</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">DOCX</span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Upload PDF or DOCX documents to extract structured content, tables, and key information for your workspace
          </p>
        </div>

        <div
          className={`group p-8 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl ${
            uploadType === 'url'
              ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg scale-105'
              : 'border-gray-200 hover:border-primary/30 hover:shadow-lg'
          }`}
          onClick={() => !isProcessing && setUploadType('url')}
        >
          <div className="flex items-center mb-6">
            <div className={`p-3 rounded-xl mr-4 transition-all duration-300 ${
              uploadType === 'url' 
                ? 'bg-primary/20 shadow-md' 
                : 'bg-primary/10 group-hover:bg-primary/15'
            }`}>
              <FiGlobe className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Web Content</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Articles</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Pages</span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Extract and process content from web pages, articles, and online resources to build your knowledge base
          </p>
        </div>
      </div>

      {/* Content Input Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-12">
        {uploadType === 'file' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-primary transition-all duration-300 hover:bg-primary/5 group">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                multiple
                disabled={isProcessing}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10 transition-colors duration-300">
                  <FiUpload className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop files here or click to browse</h3>
                <p className="text-gray-600 mb-4">Upload your documents to get started</p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">PDF</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-full">DOC</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-full">DOCX</span>
                  <span className="text-gray-400">•</span>
                  <span>Up to 10MB</span>
                </div>
              </label>
            </div>

            {errors.file && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.file}</p>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                  <FiFile className="w-4 h-4 mr-2" />
                  Selected Files ({selectedFiles.length}):
                </p>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <FiFile className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-green-800 text-sm font-medium">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        disabled={isProcessing}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      >
                        <BiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {uploadType === 'url' && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Web URLs
              </label>
            </div>
            <textarea
              placeholder="https://example.com/article&#10;https://company.com/whitepaper&#10;&#10;Enter one URL per line or separate with commas"
              value={webLinks}
              onChange={handleUrlChange}
              className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-mono resize-none"
              rows={6}
              disabled={isProcessing}
            />
            {errors.url && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{errors.url}</p>
              </div>
            )}
          </div>
        )}

        {uploadType === 'existing' && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Search Existing Sources
              </label>
            </div>
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search existing sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            {loadingExisting ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FiLoader className="w-6 h-6 animate-spin text-primary" />
                </div>
                <p className="text-gray-600 font-medium">Loading existing sources...</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-3 border border-gray-200 rounded-xl p-4">
                {filteredExistingSources.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {existingSources.length === 0
                      ? 'No existing sources found'
                      : 'No sources match your search'}
                  </div>
                ) : (
                  filteredExistingSources.map((source) => (
                    <div
                      key={source.id}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedSources.find((s) => s.id === source.id)
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-gray-200 hover:border-primary/30 hover:shadow-sm'
                      }`}
                      onClick={() => toggleSourceSelection(source)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getSourceIcon(source.type)}
                          <div>
                            <h4 className="font-semibold text-gray-900">{source.name}</h4>
                            <p className="text-sm text-gray-500">
                              {source.type.toUpperCase()} •{' '}
                              {new Date(source.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!selectedSources.find((s) => s.id === source.id)}
                          onChange={() => toggleSourceSelection(source)}
                          className="w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedSources.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-800 text-sm font-medium flex items-center">
                  <FiFile className="w-4 h-4 mr-2" />
                  {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="text-center">
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-12 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
            canSubmit
              ? 'bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary hover:-translate-y-0.5'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-3">
              <FiLoader className="w-5 h-5 animate-spin" />
              <span>Processing Content...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <FiUpload className="w-5 h-5" />
              <span>Process Content</span>
            </div>
          )}
        </button>
      </form>
      </div>
    </div>
  );
};

export default IngestForm;
