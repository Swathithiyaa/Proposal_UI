import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiCopy,
  FiFileText,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiTag,
  FiX,
  FiZap,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useContent,
  type Prompt,
  type Section,
  type WorkspaceContent,
} from '../../hooks/useContent';
import type { Workspace } from '../../hooks/useWorkspace';
import { useWorkspace } from '../../hooks/useWorkspace';
import { API } from '../../utils/constants';

function hasTextProp(item: any): item is { text: string } {
  return item && typeof item === 'object' && 'text' in item && typeof item.text === 'string';
}

const ProposalAuthoring: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, fetchWorkspaces, fetchWorkspace } = useWorkspace();
  const {
    getWorkspaceContent,
    generateContent,
    saveGeneratedContent,
    loading: contentLoading,
    getWorkspacePrompts,
    getWorkspaceGeneratedContent,
  } = useContent();

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaceContent, setWorkspaceContent] = useState<WorkspaceContent | null>(null);
  const [prompt, setPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<{ context_tokens: number; response_tokens: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [viewingSection, setViewingSection] = useState<Section | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [sectionPrompts, setSectionPrompts] = useState<Prompt[]>([]);
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [activeTab, setActiveTab] = useState<'prompts' | 'generated'>('prompts');
  const [generatedPrompts, setGeneratedPrompts] = useState<any[]>([]);
  const [fallbackWorkspace, setFallbackWorkspace] = useState<Workspace | null>(null);
  const [sectionTemplates, setSectionTemplates] = useState<{ id: number; name: string; order: number; prompt?: string }[]>([]);
  const [sectionTemplatesLoading, setSectionTemplatesLoading] = useState(false);
  const [workspaceTypes, setWorkspaceTypes] = useState<{ id: number; name: string }[]>([]);

  // Add static section lists for each workspace type
  // REMOVE all static WORKSPACE_SECTIONS and WORKSPACE_SECTION_PROMPTS

  // Prefer workspace name from navigation state if available
  const workspaceNameFromState = location.state?.workspaceName;

  // Compute selectedWorkspaceObj after all hooks and state
  let selectedWorkspaceObj: Workspace | { workspace_type: string; name: string };
  const foundWorkspace = workspaces.find((w) => w.id === selectedWorkspace);
  if (foundWorkspace) {
    selectedWorkspaceObj = foundWorkspace;
  } else if (fallbackWorkspace) {
    selectedWorkspaceObj = fallbackWorkspace;
  } else {
    selectedWorkspaceObj = {
      workspace_type: '',
      name: workspaceNameFromState || 'Workspace',
    };
  }

  // Fetch all workspace types on mount
  useEffect(() => {
    fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
      headers: {
        Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWorkspaceTypes(data);
        else if (Array.isArray(data.workspace_types)) setWorkspaceTypes(data.workspace_types);
        else setWorkspaceTypes([]);
      })
      .catch(() => setWorkspaceTypes([]));
  }, []);

  // Fetch section templates for the workspace type (by ID)
  useEffect(() => {
    async function fetchTemplates() {
      let wsTypeId = selectedWorkspaceObj?.workspace_type;
      console.log('Debug: selectedWorkspaceObj:', selectedWorkspaceObj);
      console.log('Debug: workspaceType:', wsTypeId);

      if (wsTypeId && isNaN(Number(wsTypeId))) {
        // If it's a name, look up the ID
        const found = workspaceTypes.find((t) => t.name === wsTypeId);
        wsTypeId = found ? String(found.id) : undefined;
        console.log('Debug: found workspace type by name:', found);
      }

      // If we still don't have a valid workspace type ID, try to get it from the workspace name
      if (!wsTypeId && selectedWorkspaceObj?.name) {
        const workspaceName = selectedWorkspaceObj.name.toLowerCase();
        if (workspaceName.includes('proposal')) {
          wsTypeId = '1'; // Default to Proposal type
        } else if (workspaceName.includes('blog')) {
          wsTypeId = '2'; // Default to Blog type
        } else {
          wsTypeId = '1'; // Default to Proposal type
        }
        console.log('Debug: inferred workspace type ID:', wsTypeId);
      }

      // If we still don't have a workspace type ID, create default sections
      if (!wsTypeId) {
        console.log('Debug: no workspace type found, using default sections');
        const defaultSections = [
          { id: 1, name: 'Executive Summary', order: 0, prompt: 'Provide a concise summary of the proposal, highlighting the business context, objectives, and value proposition.' },
          { id: 2, name: 'Problem Statement', order: 1, prompt: 'Explain the core business challenges the client is facing and why addressing them is critical.' },
          { id: 3, name: 'Proposed Solution', order: 2, prompt: 'Describe the proposed solution in detail, including key features, components, and how it addresses the client\'s needs.' },
          { id: 4, name: 'Scope of Work', order: 3, prompt: 'Outline the specific deliverables, services, and responsibilities covered under this proposal.' },
          { id: 5, name: 'Project Approach and Methodology', order: 4, prompt: 'Describe the overall approach, phases, and methodology that will be used to execute the project.' },
          { id: 6, name: 'Project Plan and Timeline', order: 5, prompt: 'Provide a high-level timeline with major milestones and estimated completion dates for key phases.' },
          { id: 7, name: 'Team Composition and Roles', order: 6, prompt: 'List the proposed team members, their roles, responsibilities, and relevant experience.' }
        ];
        setSectionTemplates(defaultSections);
        setSectionTemplatesLoading(false);
        return;
      }

      console.log('Debug: final wsTypeId:', wsTypeId);

      if (!wsTypeId) {
        setSectionTemplates([]);
        return;
      }
      setSectionTemplatesLoading(true);
      try {
        const res = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/types/${String(wsTypeId)}/sections`,
          {
            headers: {
              Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
            },
          },
        );
        console.log('Debug: API response status:', res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Debug: API error response:', errorText);
          throw new Error(`Failed to fetch section templates: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        console.log('Debug: fetched section templates:', data);
        setSectionTemplates(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Debug: error fetching section templates:', error);
        // Use fallback sections when API fails
        console.log('Debug: using fallback sections due to API error');
        const fallbackSections = [
          { id: 1, name: 'Executive Summary', order: 0, prompt: 'Provide a concise summary of the proposal, highlighting the business context, objectives, and value proposition.' },
          { id: 2, name: 'Problem Statement', order: 1, prompt: 'Explain the core business challenges the client is facing and why addressing them is critical.' },
          { id: 3, name: 'Proposed Solution', order: 2, prompt: 'Describe the proposed solution in detail, including key features, components, and how it addresses the client\'s needs.' },
          { id: 4, name: 'Scope of Work', order: 3, prompt: 'Outline the specific deliverables, services, and responsibilities covered under this proposal.' },
          { id: 5, name: 'Project Approach and Methodology', order: 4, prompt: 'Describe the overall approach, phases, and methodology that will be used to execute the project.' },
          { id: 6, name: 'Project Plan and Timeline', order: 5, prompt: 'Provide a high-level timeline with major milestones and estimated completion dates for key phases.' },
          { id: 7, name: 'Team Composition and Roles', order: 6, prompt: 'List the proposed team members, their roles, responsibilities, and relevant experience.' }
        ];
        setSectionTemplates(fallbackSections);
      } finally {
        setSectionTemplatesLoading(false);
      }
    }
    fetchTemplates();
  }, [selectedWorkspaceObj?.workspace_type, selectedWorkspaceObj?.name, workspaceTypes]);

  // Debug logging for section dropdown
  useEffect(() => {
    console.log('Debug: rendering section dropdown with:', {
      selectedWorkspace,
      sectionTemplatesLoading,
      sectionTemplates: sectionTemplates.length,
      selectedSectionId,
      selectedWorkspaceObj: selectedWorkspaceObj?.name,
      workspaceType: selectedWorkspaceObj?.workspace_type
    });
  }, [selectedWorkspace, sectionTemplatesLoading, sectionTemplates.length, selectedSectionId, selectedWorkspaceObj]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Ensure workspace name is always set correctly when navigating
  useEffect(() => {
    if (workspaceId) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws && ws.name) {
        setSelectedWorkspace(workspaceId);
        setFallbackWorkspace(null); // clear fallback if found
      } else {
        // If not found, fetch directly by ID
        fetchWorkspace(workspaceId).then((fw) => {
          console.log('Fetched fallback workspace:', fw);
          if (fw && fw.name) {
            setFallbackWorkspace({
              id: fw.id?.toString?.() || workspaceId,
              name: fw.name,
              workspace_type: fw.workspace_type || '',
              clientName: fw.clientName || fw.client || '',
              tags: fw.tags || [],
            });
            setSelectedWorkspace(workspaceId);
          } else {
            console.warn('No workspace found for ID', workspaceId, 'Response:', fw);
          }
        });
      }
    }
  }, [workspaceId, workspaces, fetchWorkspace]);

  // Auto-select workspace from URL param if present
  useEffect(() => {
    if (workspaceId) {
      setSelectedWorkspace(workspaceId);
    }
  }, [workspaceId]);

  // Pre-fill from navigation state (prompt template or workspace selection)
  useEffect(() => {
    if (location.state) {
      // Handle direct workspace selection (from Generate Prompt button or after prompt save)
      if (location.state.workspaceId) {
        setSelectedWorkspace(location.state.workspaceId);
      }
      // Handle section selection (after prompt save)
      if (location.state.sectionName) {
        setSelectedSectionName(location.state.sectionName);
      }
      // Handle workspace type selection (from prompt template)
      else if (location.state.type && workspaces.length > 0) {
        const ws = workspaces.find((w) => w.workspace_type === location.state.type);
        if (ws) setSelectedWorkspace(ws.id);
      }

      // Handle prompt if provided
      if (location.state.prompt) {
        setPrompt(location.state.prompt);
      }
    }
  }, [location.state, workspaces]);

  // Load workspace content when workspace is selected
  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceContent();
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedWorkspace && selectedSectionId) {
      fetchSectionPrompts();
    }
  }, [selectedWorkspace, selectedSectionId]);

  // When a section is selected, auto-fill the prompt input
  useEffect(() => {
    if (selectedSectionId && sectionTemplates.length > 0) {
      const selectedTemplate = sectionTemplates.find(template => String(template.id) === selectedSectionId);
      console.log('Debug: selected section template:', selectedTemplate);
      if (selectedTemplate) {
        setSelectedSectionName(selectedTemplate.name);
        if (selectedTemplate.prompt) {
          setPrompt(selectedTemplate.prompt);
          console.log('Debug: set prompt to:', selectedTemplate.prompt);
        } else {
          setPrompt(''); // Clear prompt if no default prompt is available
          console.log('Debug: no prompt available for section');
        }
        setUserPrompt(''); // Clear any user-added prompt when changing sections
      }
    }
  }, [selectedSectionId, sectionTemplates]);

  // When a section is selected, fetch its prompt(s) dynamically
  useEffect(() => {
    async function fetchPrompts() {
      if (selectedWorkspace && selectedSectionId) {
        const allPrompts = await getWorkspacePrompts(selectedWorkspace);
        setSectionPrompts(
          allPrompts.filter((p) => String((p as any)?.section_id) === String(selectedSectionId))
        );
      } else {
        setSectionPrompts([]);
      }
    }
    fetchPrompts();
  }, [selectedWorkspace, selectedSectionId, getWorkspacePrompts]);

  // Fetch generated content for the selected workspace
  useEffect(() => {
    async function fetchGenerated() {
      if (selectedWorkspace) {
        const allGenerated = await getWorkspaceGeneratedContent(selectedWorkspace);
        setGeneratedPrompts(
          selectedSectionName
            ? allGenerated.filter(
                (g) =>
                  g.prompt_title &&
                  g.prompt_title.toLowerCase().includes(selectedSectionName.toLowerCase()),
              )
            : allGenerated,
        );
      } else {
        setGeneratedPrompts([]);
      }
    }
    fetchGenerated();
  }, [selectedWorkspace, selectedSectionName, getWorkspaceGeneratedContent]);

  // Section list is now dynamic from workspaceContent
  const sectionList: { id: number; name: string }[] = Array.isArray(workspaceContent?.sections)
    ? workspaceContent.sections.map((s: any) => ({ id: s.id, name: s.name }))
    : [];

  // Debug logging
  console.log('Debug section dropdown:', {
    selectedWorkspace,
    selectedWorkspaceObj,
    workspaceType: selectedWorkspaceObj?.workspace_type,
    workspaceName: 'name' in selectedWorkspaceObj ? selectedWorkspaceObj.name : undefined,
    sectionList,
  });

  const loadWorkspaceContent = async () => {
    if (!selectedWorkspace) return;

    const toastId = toast.loading('Loading workspace content...');
    try {
      const content = await getWorkspaceContent(selectedWorkspace);
      setWorkspaceContent(content);
      toast.success('Workspace content loaded', { id: toastId });
      console.log('DEBUG: Loaded workspace content:', content);
    } catch (error) {
      toast.error('Failed to load workspace content', { id: toastId });
      console.error('Error loading workspace content:', error);
    }
  };

  const fetchSectionPrompts = async () => {
    // Replace with real API call to fetch prompts for the selected workspace/section
    // Example: await getPromptsBySection(selectedWorkspace, selectedSectionId)
    // For now, just clear or mock
    setSectionPrompts([]); // TODO: Replace with real fetch
  };

  const handleSectionToggle = (sectionId: number) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
    toast.success('Section toggled');
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedWorkspace) {
      toast.error('Please enter a prompt and select a workspace');
      return;
    }

    const combinedPrompt = userPrompt.trim()
      ? `${prompt.trim()}\n\n${userPrompt.trim()}`
      : prompt.trim();

    setIsGenerating(true);
    const toastId = toast.loading('Generating content...');
    
    try {
      let result;
      if (selectedSections.length > 0) {
        result = await generateContent(selectedWorkspace, combinedPrompt, selectedSections);
      } else {
        const sectionHeading = selectedSectionName
          ? `Section: ${selectedSectionName} (Type: ${selectedWorkspaceObj.workspace_type || 'Proposal'})\n\n`
          : '';
        result = await generateContent(selectedWorkspace, sectionHeading + combinedPrompt, []);
      }
      setGeneratedContent(result.content);
      setTokenInfo({
        context_tokens: result.context_tokens,
        response_tokens: result.response_tokens
      });
      toast.success('Content generated successfully!', { id: toastId });
    } catch (error) {
      toast.error('Failed to generate content', { id: toastId });
      console.error(error);
    } finally {
      setIsGenerating(false);
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
      navigate(`/dashboard/workspaces/${selectedWorkspace}`);
    } catch (error) {
      toast.error('Failed to save content', { id: toastId });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    setGeneratedContent('');
    setTokenInfo(null);
    toast.loading('Retrying generation...');
    handleGenerate();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      toast.success('Tag added successfully');
    } else if (tags.includes(newTag.trim())) {
      toast.error('Tag already exists');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
    toast.success('Tag removed');
  };

  // Calculate token count for selected sections
  const calculateSelectedTokens = () => {
    if (!workspaceContent) return 0;
    const selected = workspaceContent.sections.filter(section =>
      selectedSections.includes(section.id)
    );
    const totalChars = selected.reduce((sum, section) => sum + (section.content?.length || 0), 0);
    return Math.ceil(totalChars / 4); // Rough estimation: 1 token ≈ 4 characters
  };

  const copyToClipboard = async (text: string) => {
    const toastId = toast.loading('Copying to clipboard...');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!', { id: toastId });
    } catch (error) {
      toast.error('Failed to copy to clipboard', { id: toastId });
      console.error('Error copying content:', error);
    }
  };

  const handleViewSection = (section: Section) => {
    setViewingSection(section);
  };

  // When viewing a section, show its actual content (handle string/JSON)
  const SectionViewModal = () => {
    if (!viewingSection) return null;
    let contentString = '';
    if (typeof viewingSection.content === 'string') {
      contentString = viewingSection.content;
      try {
        const parsed = JSON.parse(viewingSection.content);
        if (Array.isArray(parsed)) {
          contentString = (parsed as any[])
            .map((item) =>
              item && typeof item === 'object'
                ? (
                  // @ts-ignore
                  typeof (item as any).text === 'string'
                    ? (item as any).text
                    : // @ts-ignore
                    typeof (item as any).content === 'string'
                    ? (item as any).content
                    : JSON.stringify(item)
                )
                : String(item)
            )
            .join('\n');
        } else {
          // fallback to string
          contentString = viewingSection.content;
        }
      } catch {
        // fallback to string
        contentString = viewingSection.content;
      }
    } else if (Array.isArray(viewingSection.content)) {
      contentString = (viewingSection.content as any[])
        .map((item) =>
          item && typeof item === 'object'
            ? (
              // @ts-ignore
              typeof (item as any).text === 'string'
                ? (item as any).text
                : // @ts-ignore
                typeof (item as any).content === 'string'
                ? (item as any).content
                : JSON.stringify(item)
            )
            : String(item)
        )
        .join('\n');
    } else if (viewingSection.content && typeof viewingSection.content === 'object') {
      const contentObj = viewingSection.content as any;
      contentString =
        (typeof contentObj.text === 'string' && contentObj.text) ||
        (typeof contentObj.content === 'string' && contentObj.content) ||
        JSON.stringify(viewingSection.content);
    }
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{viewingSection.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Source: {viewingSection.source || 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => setViewingSection(null)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-gray max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {contentString}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {Array.isArray(viewingSection.tags) && viewingSection.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewingSection.tags.map((tag, idx) => (
                    <span
                      key={typeof tag === 'object' && tag !== null && 'id' in tag ? tag.id : idx}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      <FiTag className="w-3 h-3 mr-1" />
                      {typeof tag === 'object' && tag !== null && 'name' in tag ? tag.name : String(tag)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => copyToClipboard(contentString)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary hover:bg-white rounded-lg transition-colors"
              >
                <FiCopy className="w-4 h-4" />
                Copy Content
              </button>
              <button
                onClick={() => {
                  handleSectionToggle(viewingSection.id);
                  setViewingSection(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedSections.includes(viewingSection.id)
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {selectedSections.includes(viewingSection.id)
                  ? 'Remove from Context'
                  : 'Add to Context'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Replace the main return JSX with a ChatGPT-like layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      {/* Header with back arrow */}
      <div className="w-full px-8 pt-8 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/workspaces')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            title="Back to Workspaces"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">
              {selectedWorkspaceObj.name || 'Proposal Authoring'}
            </h1>
            <p className="text-neutral-600 text-lg">
              Create, refine, and generate proposals using your workspace content.
            </p>
          </div>
        </div>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col p-4 space-y-4 min-h-screen">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Workspace</h3>
            <div className="relative mb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-gray-900 text-base font-medium">
                {workspaceNameFromState || selectedWorkspaceObj.name || 'Workspace'}
              </div>
            </div>
            {/* Section selector */}
            {selectedWorkspace && (
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Section</h3>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  disabled={sectionTemplatesLoading || !sectionTemplates.length}
                >
                  <option value="">{sectionTemplatesLoading ? 'Loading...' : 'Section...'}</option>
                  {sectionTemplates.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                {!sectionTemplatesLoading && sectionTemplates.length === 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    No sections found for this workspace type.
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API.BASE_URL()}/api/prompt-templates/seed`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
                            },
                          });
                          if (res.ok) {
                            console.log('Database seeded successfully');
                            // Retry fetching templates
                            window.location.reload();
                          } else {
                            console.error('Failed to seed database');
                          }
                        } catch (error) {
                          console.error('Error seeding database:', error);
                        }
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Seed Database
                    </button>
                  </div>
                )}
                {sectionTemplates.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    Found {sectionTemplates.length} sections for workspace type: {selectedWorkspaceObj?.workspace_type}
                  </div>
                )}
              </div>
            )}
            {/* Context/sections */}
            {workspaceContent && (
              <div className="mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Context</h3>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="select-all-context-sections"
                        checked={selectedSections.length === workspaceContent.sections.length && workspaceContent.sections.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections(workspaceContent.sections.map((section) => section.id));
                          } else {
                            setSelectedSections([]);
                          }
                        }}
                        className="mr-2"
                      />
                      <label
                        htmlFor="select-all-context-sections"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Select All
                      </label>
                    </div>
                    {selectedSections.length > 0 && (
                      <div className="text-xs text-blue-600 font-medium">
                        ~{calculateSelectedTokens().toLocaleString()} tokens
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {workspaceContent.sections.map((section: Section, idx: number) => {
                      let heading = section.name;
                      if (!heading) {
                        try {
                          let parsed: any = section.content;
                          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                          if (Array.isArray(parsed)) {
                            let firstTag: any = parsed.find(
                              (item: any) => typeof item === 'object' && item && 'tag' in item && typeof item.tag === 'string' && item.tag.trim() !== '',
                            );
                            if (firstTag && typeof firstTag.tag === 'string') heading = firstTag.tag;
                          } else if (
                            parsed &&
                            typeof parsed === 'object' &&
                            'tag' in parsed &&
                            typeof parsed.tag === 'string'
                          ) {
                            heading = parsed.tag;
                          }
                        } catch {}
                        if (!heading) heading = `Section ${idx + 1}`;
                      }
                      return (
                        <div
                          key={section.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 border-b border-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSections.includes(section.id)}
                            onChange={() => handleSectionToggle(section.id)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="font-medium text-gray-900 truncate">{heading}</span>
                          <button
                            className="ml-auto text-xs text-blue-600 hover:underline"
                            onClick={() => handleViewSection(section)}
                          >
                            View
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {/* Tags */}
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Tags</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                  disabled={!newTag.trim()}
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-primary/60 hover:text-primary transition-colors"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Generated Content (History) */}
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Generated Content (History)
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {generatedPrompts && generatedPrompts.length > 0 ? (
                  generatedPrompts.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      className="w-full text-left px-3 py-2 rounded bg-gray-50 hover:bg-primary/10 border border-gray-100 text-xs text-gray-700 truncate"
                      title={item.content}
                      onClick={() => setGeneratedContent(item.content)}
                    >
                      {item.content.slice(0, 60)}
                      {item.content.length > 60 ? '...' : ''}
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-gray-400">No generated content yet.</div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col bg-gray-50 min-h-screen relative">
          {/* Section heading */}
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-xl font-bold text-gray-900">{selectedSectionName || 'Section'}</h2>
            {selectedSectionName && prompt && (
              <div className="bg-gray-50 rounded-md p-3 text-gray-800 whitespace-pre-line select-none border border-gray-200 text-sm mt-2">
                {prompt}
              </div>
            )}
            {/* User prompt input moved here */}
            <div className="mt-4">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Type your prompt or instructions..."
                className="w-full min-h-[40px] max-h-32 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                readOnly={false}
                disabled={false}
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedWorkspace || isGenerating}
                className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <FiLoader className="w-5 h-5 animate-spin" />
                ) : (
                  <FiZap className="w-5 h-5" />
                )}
                Generate
              </button>
            </div>
          </div>
          {/* Chat history */}
          <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-6">
            {/* Show prompt and generated content as chat bubbles */}
            {generatedContent && (
              <div className="flex gap-3 items-start flex-row-reverse">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <FiFileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100 max-w-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-gray-900 font-medium">AI Response</div>
                    {tokenInfo && (
                      <div className="text-xs text-blue-600 font-medium">
                        {tokenInfo.response_tokens.toLocaleString()} tokens
                      </div>
                    )}
                  </div>
                  <div className="prose prose-gray max-w-none">
                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => copyToClipboard(generatedContent)}
                      className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors text-xs"
                    >
                      <FiCopy className="w-3 h-3" /> Copy
                    </button>
                    <button
                      onClick={handleRetry}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-xs disabled:opacity-50"
                    >
                      <FiRefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />{' '}
                      Retry
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-all duration-200 text-xs disabled:opacity-50"
                    >
                      {isSaving ? (
                        <FiLoader className="w-3 h-3 animate-spin" />
                      ) : (
                        <FiSave className="w-3 h-3" />
                      )}{' '}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <SectionViewModal />
        </main>
      </div>
    </div>
  );
};

export default ProposalAuthoring;
