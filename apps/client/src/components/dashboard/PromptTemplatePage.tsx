import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText } from 'react-icons/fi';
import ReactModal from 'react-modal';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContent } from '../../hooks/useContent';
import { useWorkspace } from '../../hooks/useWorkspace';
import { API } from '../../utils/constants';

// Add type for workspace type
interface WorkspaceType {
  id: number;
  name: string;
  is_default: boolean;
  sections: Array<{
    id: number;
    name: string;
    order: number;
    prompt?: string;
  }>;
}

const PromptTemplatePage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [selectedSection, setSelectedSection] = useState<{ id: number; name: string; prompt?: string } | null>(
    null,
  );
  const [editablePrompt, setEditablePrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const userInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { savePromptToWorkspace } = useContent();
  const [workspaceTypes, setWorkspaceTypes] = useState<WorkspaceType[]>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionPrompt, setNewSectionPrompt] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [typesLoading, setTypesLoading] = useState(false);
  const { workspaces, fetchWorkspaces } = useWorkspace();

  useEffect(() => {
    fetchWorkspaces();
    fetchWorkspaceTypes();
  }, []);

  // Fetch workspace types from backend
  const fetchWorkspaceTypes = async () => {
    setTypesLoading(true);
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const types = await response.json();
        setWorkspaceTypes(types);
      } else {
        console.error('Failed to fetch workspace types');
        toast.error('Failed to fetch workspace types');
      }
    } catch (error) {
      console.error('Error fetching workspace types:', error);
      toast.error('Error fetching workspace types');
    } finally {
      setTypesLoading(false);
    }
  };

  // Helper to fetch all sections and their prompts for a workspace type
  const fetchSectionsWithPrompts = async (typeId: number) => {
    setSectionsLoading(true);
    try {
      const sectionsResp = await fetch(
        `${API.BASE_URL()}/api/prompt-templates/types/${typeId}/sections`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );
      if (!sectionsResp.ok) {
        throw new Error('Failed to fetch sections');
      }
      const sections = await sectionsResp.json();
      return sections;
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to fetch sections');
      return [];
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Workspace type name is required.');
      return;
    }

    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: newTypeName.trim(),
          is_default: false,
        }),
      });

      if (response.ok) {
        const newType = await response.json();
        setWorkspaceTypes([...workspaceTypes, newType]);
        toast.success('Workspace type added!');
        setNewTypeName('');
        setShowAddTypeModal(false);
      } else {
        const error = await response.text();
        toast.error(error || 'Failed to add workspace type');
      }
    } catch (error) {
      console.error('Error adding workspace type:', error);
      toast.error('Failed to add workspace type');
    }
  };

  // Fetch and set sections+prompts for the selected type
  const loadSectionsForType = async (typeObj: WorkspaceType) => {
    if (!typeObj || !typeObj.id) return;

    const sectionsWithPrompts = await fetchSectionsWithPrompts(typeObj.id);
    const updatedType = {
      ...typeObj,
      sections: sectionsWithPrompts,
    };

    setWorkspaceTypes(prev =>
      prev.map(t => t.id === typeObj.id ? updatedType : t)
    );
    setSelectedType(updatedType);
  };

  // On type selection, fetch sections+prompts from backend
  useEffect(() => {
    if (selectedType && selectedType.id) {
      loadSectionsForType(selectedType);
    }
  }, [selectedType?.id]);

  // Pre-select workspace and type from navigation state
  useEffect(() => {
    if (location.state?.workspaceId) {
      setSelectedWorkspaceId(String(location.state.workspaceId));
    }
    if (location.state?.type && workspaceTypes.length > 0) {
      const typeObj = workspaceTypes.find((t) => t.name === location.state.type);
      if (typeObj) setSelectedType(typeObj);
    }
  }, [location.state, workspaceTypes]);

  useEffect(() => {
    setEditablePrompt(selectedSection ? selectedSection.prompt || '' : '');
  }, [selectedSection]);

  // Update handleSaveToWorkspace to use selectedWorkspaceId if location.state?.workspaceId is not present
  const handleSaveToWorkspace = async () => {
    if (!selectedType || !selectedSection) {
      toast.error('Please select a type and section');
      return;
    }
    // Prefer navigation state, fallback to selectedWorkspaceId
    let workspaceId = location.state?.workspaceId || selectedWorkspaceId;
    let workspace = workspaces.find((w) => String(w.id) === String(workspaceId));
    if (!workspace) {
      toast.error('Please select a workspace');
      return;
    }
    setSaving(true);
    try {
      const title = `${selectedType.name} - ${selectedSection.name}`;
      await savePromptToWorkspace(workspace.id, title, editablePrompt, []);
      toast.success('Prompt added to workspace');
      await fetchWorkspaces();
      // Reset section and prompt for new entry
      setSelectedSection(null);
      setEditablePrompt('');
    } catch (err) {
      console.error('Failed to save prompt:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save prompt to workspace');
    } finally {
      setSaving(false);
    }
  };

  // Place this above the return statement
  const handleAddSection = async () => {
    if (selectedType && newSectionName.trim() && newSectionPrompt.trim()) {
      try {
        // 1. Create the section
        const response = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/types/${selectedType.id}/sections`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              name: newSectionName.trim(),
              order: selectedType.sections.length
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          toast.error(error || 'Failed to add section');
          return;
        }

        const sectionData = await response.json();
        const sectionId = sectionData.id;

        // 2. Create the prompt for the section
        const promptResp = await fetch(
          `${API.BASE_URL()}/api/prompt-templates/sections/${sectionId}/prompts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              prompt: newSectionPrompt.trim(),
              is_default: true
            }),
          },
        );

        if (!promptResp.ok) {
          const error = await promptResp.text();
          toast.error(error || 'Failed to add prompt');
          return;
        }

        // 3. Refresh the sections for this type
        await loadSectionsForType(selectedType);

        setNewSectionName('');
        setNewSectionPrompt('');
        setShowAddSectionModal(false);
        toast.success('Section and prompt added!');
      } catch (err) {
        console.error('Failed to add section or prompt:', err);
        toast.error('Failed to add section or prompt');
      }
    } else {
      toast.error('Section name and prompt are required.');
    }
  };

  // Seed default data
  const handleSeedData = async () => {
    try {
      const response = await fetch(`${API.BASE_URL()}/api/prompt-templates/seed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        await fetchWorkspaceTypes();
      } else {
        toast.error('Failed to seed data');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data');
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Prompt Templates</h1>
                <p className="text-gray-600 text-lg mt-1">
                  Manage and customize AI prompts for different content sections
                </p>
              </div>
            </div>
            </h2>
            <button
              onClick={handleSeedData}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
            >
              <FiFileText className="w-4 h-4 mr-2 inline" />
              Seed Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
          {/* Workspace Type Card Selector */}
            <div className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Select Workspace Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 justify-center">
            {typesLoading ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="w-6 h-6 animate-pulse text-primary" />
                  </div>
                  <p className="text-gray-600 font-medium">Loading workspace types...</p>
                </div>
            ) : workspaceTypes.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workspace Types Found</h3>
                  <p className="text-gray-600 mb-6">Click "Seed Demo Data" to add default types.</p>
              </div>
            ) : (
              workspaceTypes.map((type, idx) => (
                <button
                  key={type.id}
                    className={`group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 hover:-translate-y-1 hover:shadow-xl
                    ${selectedType && selectedType.id === type.id
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-white border-primary shadow-lg scale-105'
                        : 'bg-white text-gray-800 border-gray-200 hover:bg-primary/5 hover:border-primary/30 shadow-md'}
                  `}
                  onClick={() => {
                    setSelectedType(type);
                    setSelectedSection(null);
                  }}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                      selectedType && selectedType.id === type.id 
                        ? 'bg-white/20' 
                        : 'bg-primary/10 group-hover:bg-primary/15'
                    }`}>
                      <FiFileText className={`w-6 h-6 ${selectedType && selectedType.id === type.id ? 'text-white' : 'text-primary'}`} />
                    </div>
                    <span className="font-semibold text-sm text-center leading-tight">{type.name}</span>
                </button>
              ))
            )}
            <button
                className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-primary/30 text-primary bg-white hover:bg-primary/5 transition-all duration-300 focus:outline-none hover:-translate-y-1 hover:shadow-lg hover:border-primary/50"
              onClick={() => setShowAddTypeModal(true)}
              type="button"
            >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors duration-300">
                  <FiPlus className="w-6 h-6 text-primary" />
                </div>
                <span className="font-semibold text-sm text-center">Add Type</span>
            </button>
            </div>
          </div>

          {/* Section Selector for Selected Type */}
          {selectedType && (
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Sections for {selectedType.name}
              </h2>
              <div className="flex gap-3 flex-wrap justify-center mb-8">
                {sectionsLoading ? (
                  <div className="text-center text-gray-600 py-4">
                    <FiLoader className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading sections...
                  </div>
                ) : (selectedType?.sections?.length ?? 0) === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="mb-2">No sections found for this type.</p>
                  </div>
                ) : (
                  selectedType?.sections?.map((section, idx) => (
                    <button
                      key={section.id}
                      className={`px-4 py-2 rounded-xl font-medium border transition-all duration-200 text-sm whitespace-nowrap hover:shadow-md
                        ${selectedSection && selectedSection.id === section.id
                          ? 'bg-primary text-white border-primary shadow-lg'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-primary/10 hover:border-primary/30'}
                      `}
                      onClick={() => {
                        setSelectedSection(section);
                        setEditablePrompt(section.prompt || '');
                      }}
                    >
                      {section.name}
                    </button>
                  ))
                )}
                <button
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-medium hover:from-primary/90 hover:to-primary transition-all duration-200 text-sm shadow-md hover:shadow-lg"
                  onClick={() => setShowAddSectionModal((prev) => !prev)}
                  type="button"
                >
                  <FiPlus className="w-4 h-4 mr-1 inline" />
                  Add Section
                </button>
              </div>

              {/* Inline Add Section Form */}
              {showAddSectionModal && (
                <div className="max-w-2xl mx-auto mt-8">
                  <form
                    className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col gap-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSection();
                  }}
                >
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Section</h3>
                      <p className="text-gray-600">Create a new section template for this workspace type</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Section Name</label>
                  <input
                    type="text"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm"
                    placeholder="Section name..."
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                  />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Default Prompt</label>
                  <textarea
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm resize-none"
                    placeholder="Prompt for this section..."
                    value={newSectionPrompt}
                    onChange={(e) => setNewSectionPrompt(e.target.value)}
                        rows={5}
                  />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                        className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-all duration-200"
                      onClick={() => {
                        setShowAddSectionModal(false);
                        setNewSectionName('');
                        setNewSectionPrompt('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                      disabled={!newSectionName.trim() || !newSectionPrompt.trim()}
                    >
                      Add
                    </button>
                  </div>
                </form>
                </div>
              )}
            </div>
          )}

          {/* Prompt for Selected Section */}
          {selectedType && selectedSection ? (
            <div className="border-t border-gray-200 pt-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedSection.name}</h3>
                    <p className="text-gray-600">Customize the AI prompt for this section</p>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Section Prompt</label>
                <textarea
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm resize-none"
                      rows={8}
                  placeholder="Edit the prompt for this section..."
                />
                  </div>
                {/* Workspace selector if not navigated from a workspace */}
                {!location.state?.workspaceId && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Target Workspace</label>
                    <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm"
                      value={selectedWorkspaceId}
                      onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    >
                      <option value="">Select workspace...</option>
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                  <div className="text-center">
                <button
                      className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-semibold hover:from-primary/90 hover:to-primary transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  onClick={handleSaveToWorkspace}
                  disabled={saving || (!location.state?.workspaceId && !selectedWorkspaceId)}
                >
                      {saving ? (
                        <div className="flex items-center space-x-2">
                          <FiLoader className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <FiSave className="w-4 h-4" />
                          <span>Save to Workspace</span>
                        </div>
                      )}
                </button>
                  </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FiFileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedType
                  ? 'Select a Section'
                  : 'Choose a Workspace Type'}
              </h3>
              <p className="text-gray-600">
                {selectedType
                  ? 'Pick a section above to view and edit its prompt template.'
                  : 'Start by selecting a workspace type to see its available sections.'}
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Add Workspace Type Modal */}
        {showAddTypeModal && !showAddSectionModal && (
          <ReactModal
            isOpen={showAddTypeModal}
            onRequestClose={() => setShowAddTypeModal(false)}
            contentLabel="Add Workspace Type"
            ariaHideApp={false}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
            overlayClassName=""
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FiPlus className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Add Workspace Type</h2>
                <p className="text-gray-600">Create a new workspace type template</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type Name</label>
              <input
                type="text"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm"
                placeholder="Workspace type name..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-all duration-200"
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setNewTypeName('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  onClick={handleAddType}
                  disabled={!newTypeName.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          </ReactModal>
        )}
      </div>
    </div>
  );
};

export default PromptTemplatePage;
