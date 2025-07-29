/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheck, FiFileText, FiFolder, FiPlus, FiTag, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSources } from '../../hooks/useSources';
import { useWorkspace } from '../../hooks/useWorkspace';
import { API } from '../../utils/constants';
import SelectChunksModal from './SelectChunksModal';

interface CreateWorkspaceProps {
  onClose?: () => void;
  onWorkspaceCreated: (newWorkspace: any) => void;
}

const CreateWorkspace: React.FC<CreateWorkspaceProps> = ({ onClose, onWorkspaceCreated }) => {
  const internalNavigate = useNavigate();
  const { createWorkspace } = useWorkspace();
  const { listSources } = useSources();

  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    tags: [] as string[],
  });

  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState('');
  const [workspaceType, setWorkspaceType] = useState('');
  const [workspaceTypes, setWorkspaceTypes] = useState<{ id: number; name: string }[]>([]);
  const [workspaceTypesLoading, setWorkspaceTypesLoading] = useState(false);

  // Content selection state
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<number[]>([]); // source IDs
  const [expandedSource, setExpandedSource] = useState<number | null>(null);
  const [sourceChunks, setSourceChunks] = useState<{ [key: number]: any[] }>({}); // sourceId -> chunks
  const [selectedChunks, setSelectedChunks] = useState<{ [key: number]: Set<string> }>({}); // sourceId -> chunk indices
  const [selectingSourceId, setSelectingSourceId] = useState<number | null>(null);

  // Fetch sources on mount
  React.useEffect(() => {
    setSourcesLoading(true);
    listSources()
      .then((data) => {
        if (Array.isArray(data.sources)) setSources(data.sources);
        else if (Array.isArray(data)) setSources(data);
        else setSources([]);
      })
      .catch(() => setSources([]))
      .finally(() => setSourcesLoading(false));
  }, [listSources]);

  // Fetch workspace types on mount
  useEffect(() => {
    setWorkspaceTypesLoading(true);
    fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
      headers: {
        Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // Accept both {workspace_types: [...]}, or just an array
        if (Array.isArray(data)) setWorkspaceTypes(data);
        else if (Array.isArray(data.workspace_types)) setWorkspaceTypes(data.workspace_types);
        else setWorkspaceTypes([]);
        console.log('DEBUG: Loaded workspace types:', data);
      })
      .catch(() => setWorkspaceTypes([]))
      .finally(() => setWorkspaceTypesLoading(false));
  }, []);

  // Fetch chunks for a source
  const fetchChunksForSource = async (sourceId: number) => {
    if (sourceChunks[sourceId]) return; // already fetched
    const toastId = toast.loading('Loading chunks...');
    try {
      const res = await fetch(`http://localhost:8000/api/sources/${sourceId}/chunks`);
      const data = await res.json();
      setSourceChunks((prev) => ({ ...prev, [sourceId]: data.chunks || [] }));
      toast.success('Chunks loaded successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to load chunks', { id: toastId });
      setSourceChunks((prev) => ({ ...prev, [sourceId]: [] }));
    }
  };

  const handleSourceToggle = (sourceId: number) => {
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter((id) => id !== sourceId));
      setSelectedChunks((prev) => {
        const copy = { ...prev };
        delete copy[sourceId];
        return copy;
      });
    } else {
      setSelectedSources([...selectedSources, sourceId]);
      setSelectedChunks((prev) => {
        const copy = { ...prev };
        delete copy[sourceId];
        return copy;
      });
    }
  };

  const handleExpandSource = (sourceId: number) => {
    setExpandedSource(expandedSource === sourceId ? null : sourceId);
    if (expandedSource !== sourceId) fetchChunksForSource(sourceId);
  };

  const handleChunkToggle = (sourceId: number, idx: number) => {
    setSelectedSources(selectedSources.filter((id) => id !== sourceId)); // unselect full source if chunk is selected
    setSelectedChunks((prev) => {
      const set = new Set(prev[sourceId] || []);
      if (set.has(idx.toString())) set.delete(idx.toString());
      else set.add(idx.toString());
      return { ...prev, [sourceId]: set };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim().toLowerCase()],
      }));
      setCurrentTag('');
      toast.success('Tag added successfully');
    } else {
      toast.error('Tag already exists');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
    toast.success('Tag removed');
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    if (!formData.clientName.trim()) {
      toast.error('Client name is required');
      return;
    }

    if (!workspaceType) {
      toast.error('Workspace type is required');
      return;
    }

    if (!selectedVertical) {
      toast.error('Vertical is required');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Creating workspace...');

    try {
      const workspaceName = `${selectedVertical} - ${formData.name}`;
      // Prepare content selection payload
      const source_ids = selectedSources;
      const chunks: any[] = [];
      Object.entries(selectedChunks).forEach(([sourceId, idxSet]) => {
        const sid = Number(sourceId);
        const chunkArr = sourceChunks[sid] || [];
        // Track which major chunks are fully selected to avoid duplicate minors
        const majorSelected = new Set<string>();
        idxSet.forEach((key) => {
          if (/^\d+$/.test(key)) {
            // Major chunk selected
            const idx = Number(key);
            const chunk = chunkArr[idx];
            if (chunk) {
              let heading = chunk.name || chunk.title || '';
              try {
                const parsed = typeof chunk.content === 'string' ? JSON.parse(chunk.content) : chunk.content;
                if (Array.isArray(parsed)) {
                  const firstTag = parsed.find((item: any) => item.tag && item.tag.trim() !== '');
                  if (firstTag && firstTag.tag) heading = firstTag.tag;
                }
              } catch {}
              chunks.push({
                name: heading || `Chunk ${idx + 1}`,
                content: typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content),
                source: sources.find((s) => s.id === sid)?.name || '',
                tags: chunk.tags || [],
                content_source_id: sid,
              });
              majorSelected.add(key);
            }
          } else if (/^\d+-\d+$/.test(key)) {
            // Minor chunk selected
            const [majorIdx, minorIdx] = key.split('-').map(Number);
            // If the major chunk is also selected, skip this minor to avoid duplicate
            if (majorSelected.has(String(majorIdx))) return;
            const majorChunk = chunkArr[majorIdx];
            if (majorChunk && Array.isArray(majorChunk.content)) {
              const minor = majorChunk.content[minorIdx];
              if (minor) {
                chunks.push({
                  name: minor.tag || minor.title || minor.name || `Minor Chunk ${minorIdx + 1}`,
                  content: minor.content ? (typeof minor.content === 'string' ? minor.content : JSON.stringify(minor.content)) : '',
                  source: sources.find((s) => s.id === sid)?.name || '',
                  tags: minor.tags || [],
                  content_source_id: sid,
                });
              }
            }
          }
        });
      });
      const newWorkspace = await createWorkspace({
        name: workspaceName,
        client: formData.clientName.trim(),
        tags: formData.tags,
        workspace_type: workspaceType,
        source_ids: source_ids.length > 0 ? source_ids : undefined,
        chunks: chunks.length > 0 ? chunks : undefined,
      });

      toast.success('Workspace created successfully!', { id: toastId });
      
      if (onWorkspaceCreated) {
        onWorkspaceCreated(newWorkspace);
      }
      if (onClose) {
        onClose();
      } else {
        const defaultSectionMap: Record<string, string> = {
          Proposal: 'Executive Summary',
          'Service Agreement': 'Agreement Overview',
          Report: 'Introduction',
          Research: 'Abstract',
          Template: 'Header',
          Blog: 'Title',
        };
        const defaultSectionName = defaultSectionMap[workspaceType] || '';
        const navFn = internalNavigate;
        if (navFn) {
          navFn(`/dashboard/proposal-authoring/${newWorkspace.id}`, {
            state: {
              workspaceId: newWorkspace.id,
              sectionName: defaultSectionName,
              workspaceName: newWorkspace.name, // Pass the name for fallback
            },
          });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-auto max-h-[95vh] overflow-y-auto relative border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-8 py-6 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FiFolder className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create New Workspace</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Set up your workspace with details and content
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  const navFn = internalNavigate;
                  if (navFn) navFn('/dashboard/workspaces');
                }
              }}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
              aria-label="Close"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Workspace Details Section */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiFileText className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Workspace Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vertical */}
                <div className="space-y-2">
                  <label htmlFor="vertical" className="block text-sm font-medium text-gray-700">
                    Vertical <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="vertical"
                      value={selectedVertical}
                      onChange={(e) => setSelectedVertical(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200 appearance-none"
                      required
                    >
                      <option value="">Select Vertical</option>
                      <option value="FS">FS</option>
                      <option value="GEN-AI">GEN-AI</option>
                      <option value="H&I">H&I</option>
                      <option value="TT">TT</option>
                      <option value="M&C">M&C</option>
                      <option value="RE">RE</option>
                      <option value="STG">STG</option>
                      <option value="OTHERS">OTHERS</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Workspace Type */}
                <div className="space-y-2">
                  <label htmlFor="workspaceType" className="block text-sm font-medium text-gray-700">
                    Workspace Type
                  </label>
                  <div className="relative">
                    <select
                      id="workspaceType"
                      name="workspaceType"
                      value={workspaceType}
                      onChange={(e) => setWorkspaceType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200 appearance-none"
                      required
                    >
                      <option value="">{workspaceTypesLoading ? 'Loading...' : 'Select Type'}</option>
                      {workspaceTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Workspace Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200"
                    placeholder="Enter workspace name or title"
                    required
                  />
                </div>

                {/* Client Name */}
                <div className="space-y-2">
                  <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    list="client-suggestions"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200"
                    placeholder="Who is this workspace being prepared for?"
                    required
                  />
                  <datalist id="client-suggestions">
                    <option value="NYSE" />
                    <option value="BSE" />
                    <option value="UHG" />
                    <option value="Coca-Cola" />
                    <option value="Walmart" />
                    <option value="Delta Air Lines" />
                    <option value="MetLife" />
                  </datalist>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-6 space-y-3">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                  Tags / Keywords
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="Enter a tag and press Enter"
                    />
                    <FiTag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!currentTag.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg font-medium shadow-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content Selection Section */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiFileText className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Content from Existing Sources
                </h3>
              </div>
              
              {sourcesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">Loading sources...</span>
                </div>
              ) : sources.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No sources found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-lg transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <FiFileText className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <button
                            type="button"
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                            onClick={() => setSelectingSourceId(source.id)}
                          >
                            {source.name}
                          </button>
                          <p className="text-xs text-gray-500 mt-1">{source.type}</p>
                        </div>
                      </div>
                      {selectedChunks[source.id] && selectedChunks[source.id].size > 0 && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-700 font-medium">
                            {selectedChunks[source.id].size} chunk(s) selected
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Chunks Summary */}
            {Object.entries(selectedChunks).length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Selected Chunks Summary
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(selectedChunks).map(([sourceId, idxSet]) => {
                    const sid = Number(sourceId);
                    const chunkArr = sourceChunks[sid] || [];
                    const source = sources.find((s) => s.id === sid);
                    return (
                      <div key={sid} className="bg-white rounded-xl p-4 border border-blue-200">
                        <div className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                          <FiFileText className="w-4 h-4" />
                          <span>{source?.name || source?.title || 'Untitled Section'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[...idxSet].map((idx) => {
                            const chunk = chunkArr[Number(idx)];
                            if (!chunk) return null;
                            // Find the first non-empty tag in chunk.content
                            let chunkTitle = '';
                            if (Array.isArray(chunk.content)) {
                              const firstTag = chunk.content.find(
                                (item: any) => item.tag && item.tag.trim() !== '',
                              );
                              if (firstTag) chunkTitle = firstTag.tag;
                            }
                            if (!chunkTitle)
                              chunkTitle = chunk.name || chunk.title || 'Untitled Chunk';
                            return (
                              <div
                                key={idx}
                                className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg"
                              >
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-blue-800 font-medium">
                                  {chunkTitle}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 sticky bottom-0 bg-white z-10">
              <button
                type="button"
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    const navFn = internalNavigate;
                    if (navFn) navFn('/dashboard/workspaces');
                  }
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FiFolder className="w-5 h-5" />
                    <span>Create Workspace</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {selectingSourceId !== null && (
          <SelectChunksModal
            source={sources.find((s) => s.id === selectingSourceId)}
            chunks={sourceChunks[selectingSourceId as number] || []}
            fetchChunks={async (sourceId: number) => {
              if (!sourceChunks[sourceId]) {
                const res = await fetch(`http://localhost:8000/api/sources/${sourceId}/chunks`);
                const data = await res.json();
                setSourceChunks((prev) => ({ ...prev, [sourceId]: data.chunks || [] }));
                return data.chunks || [];
              }
              return sourceChunks[sourceId];
            }}
            selected={selectedChunks[selectingSourceId as number] || new Set()}
            onSave={(selectedSet: Set<string>) => {
              setSelectedChunks((prev) => ({
                ...prev,
                [selectingSourceId as number]: selectedSet,
              }));
              setSelectingSourceId(null);
            }}
            onClose={() => setSelectingSourceId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default CreateWorkspace;
