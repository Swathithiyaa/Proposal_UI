import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiChevronDown,
  FiCopy,
  FiEye,
  FiFileText,
  FiLoader,
  FiRefreshCw,
  FiSave,
  FiTag,
  FiX,
  FiZap,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContent, type Section, type WorkspaceContent } from '../../hooks/useContent';
import { useWorkspace } from '../../hooks/useWorkspace';

const CreateProposal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces, fetchWorkspaces } = useWorkspace();
  const {
    getWorkspaceContent,
    generateContent,
    saveGeneratedContent,
    loading: contentLoading,
  } = useContent();

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaceContent, setWorkspaceContent] = useState<WorkspaceContent | null>(null);
  const [prompt, setPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [viewingSection, setViewingSection] = useState<Section | null>(null);

  // Token calculation for selected sections
  const calculateTokens = () => {
    if (!workspaceContent?.sections) return 0;
    
    const totalChars = selectedSections.reduce((sum, sectionId) => {
      const section = workspaceContent.sections.find(s => s.id === sectionId);
      return sum + (section?.content?.length || 0);
    }, 0);
    
    return Math.ceil(totalChars / 4);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Pre-fill from navigation state (prompt template)
  useEffect(() => {
    if (
      location.state &&
      (location.state.type || location.state.section || location.state.prompt)
    ) {
      // Try to auto-select a workspace of the given type
      if (location.state.type && workspaces.length > 0) {
        const ws = workspaces.find((w) => w.workspace_type === location.state.type);
        if (ws) setSelectedWorkspace(ws.id);
      }
      if (location.state.prompt) setPrompt(location.state.prompt);
      // Optionally, if you have section selection UI, pre-select section here
      // (Assuming you have a section dropdown or similar)
    }
  }, [location.state, workspaces]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceContent();
    }
  }, [selectedWorkspace]);

  const loadWorkspaceContent = async () => {
    if (!selectedWorkspace) {
      toast.error('Please select a workspace first');
      return;
    }

    const toastId = toast.loading('Loading workspace content...');
    try {
      const content = await getWorkspaceContent(selectedWorkspace);
      setWorkspaceContent(content);
      toast.success('Workspace content loaded', { id: toastId });
    } catch (error) {
      toast.error('Failed to load workspace content', { id: toastId });
      console.error('Error loading workspace content:', error);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleSectionToggle = (sectionId: number) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedWorkspace) {
      toast.error('Please enter a prompt and select a workspace');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generating content...');
    try {
      const content = await generateContent(selectedWorkspace, prompt, selectedSections);
      setGeneratedContent(content);
      toast.success('Content generated successfully!', { id: toastId });
    } catch (error) {
      toast.error('Failed to generate content', { id: toastId });
      console.error(error);
    } finally {
      setIsGenerating(false);
      toast.dismiss(toastId);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !selectedWorkspace) {
      toast.error('No content to save');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Saving content...');
    try {
      await saveGeneratedContent(
        selectedWorkspace,
        prompt,
        generatedContent,
        selectedSections,
        tags,
      );
      toast.success('Content saved successfully!', { id: toastId });
      navigate('/dashboard/proposal-authoring');
    } catch (error) {
      toast.error('Failed to save content', { id: toastId });
      console.error(error);
    } finally {
      setIsSaving(false);
      toast.dismiss(toastId);
    }
  };

  const copyToClipboard = async (text: string) => {
    const toastId = toast.loading('Copying content...');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Content copied to clipboard!', { id: toastId });
    } catch (error) {
      toast.error('Failed to copy content', { id: toastId });
      console.error('Error copying content:', error);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleViewSection = (section: Section) => {
    setViewingSection(section);
  };

  const selectedWorkspaceData = workspaces.find((w) => w.id === selectedWorkspace);

  const SectionViewModal = () => {
    if (!viewingSection) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6">
          <h3 className="text-lg font-semibold mb-4">{viewingSection.name}</h3>
          <div className="prose max-w-none">
            {viewingSection.content}
          </div>
          <button
            onClick={() => setViewingSection(null)}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100/50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/proposal-authoring')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Generate Content</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm font-medium px-3 py-1 rounded-lg border border-yellow-400 bg-yellow-100 text-yellow-800 shadow-sm">
                    Tokens for selected context: <span className="font-bold">{calculateTokens()}</span>
                  </span>
                </div>
                <p className="text-gray-600 mt-1">
                  Create AI-powered content using your workspace resources
                </p>
              </div>
            </div>

            {generatedContent && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(generatedContent)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiCopy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={handleRetry}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Retry
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-600/25 disabled:opacity-50"
                >
                  {isSaving ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  Save Content
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Workspace</h3>
              <div className="relative">
                <button
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <span className={selectedWorkspaceData ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedWorkspaceData ? selectedWorkspaceData.name : 'Choose a workspace...'}
                  </span>
                  <FiChevronDown className="w-4 h-4" />
                </button>

                {showWorkspaceDropdown && (
                  <div className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => {
                          setSelectedWorkspace(workspace.id);
                          setShowWorkspaceDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                      >
                        <div className="font-medium text-gray-900">{workspace.name}</div>
                        <div className="text-sm text-gray-500">{workspace.clientName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Prompt</h3>
              <div
                className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-line select-none cursor-not-allowed border border-gray-200 mb-4"
                tabIndex={-1}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {prompt}
              </div>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Add your own prompt or instructions..."
                className="w-full min-h-[60px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {workspaceContent && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Select Context</h3>
                  {/* Select All Checkbox */}
                  {workspaceContent.sections.length > 0 && (
                    <div className="flex items-center">
                      <label
                        htmlFor="select-all-sections"
                        className="text-sm text-gray-700 cursor-pointer mr-2"
                      >
                        Select All
                      </label>
                      <input
                        type="checkbox"
                        id="select-all-sections"
                        checked={selectedSections.length === workspaceContent.sections.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections(
                              workspaceContent.sections.map((section) => section.id),
                            );
                          } else {
                            setSelectedSections([]);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {workspaceContent.sections.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <FiFileText className="w-4 h-4" />
                        Content Sections ({selectedSections.length}/
                        {workspaceContent.sections.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {workspaceContent.sections.map((section: Section) => (
                          <div
                            key={section.id}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSections.includes(section.id)}
                              onChange={() => handleSectionToggle(section.id)}
                              className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleSectionToggle(section.id)}
                            >
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {section.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {section.content.substring(0, 100)}...
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSection(section);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary rounded transition-all"
                              title="View full content"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        <FiTag className="w-3 h-3 mr-1" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-primary hover:text-primary/80"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedWorkspace || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-medium hover:from-primary/90 hover:to-primary/80 transition-all duration-200 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <FiLoader className="w-5 h-5 animate-spin" />
              ) : (
                <FiZap className="w-5 h-5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[655px] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
              </div>
              <div className="p-6">
                {contentLoading || isGenerating ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <FiLoader className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Generating your content...</p>
                    </div>
                  </div>
                ) : generatedContent ? (
                  <div className="prose prose-gray max-w-none">
                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiZap className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to generate</h4>
                      <p className="text-gray-600">
                        Configure your prompt and context, then click "Generate Content" to get
                        started.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionViewModal />
    </div>
  );
};

export default CreateProposal;
