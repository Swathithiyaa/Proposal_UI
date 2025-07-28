import React, { useEffect, useState } from 'react';
import { FiFolder, FiPlus, FiSearch, FiTag, FiTrash2, FiArrowRight, FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { useSections } from '../../hooks/useSections';
import { useWorkspace } from '../../hooks/useWorkspace';
import CreateWorkspace from './CreateWorkspace';

const Workspaces: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces, getAllTags, filterWorkspaces, fetchWorkspaces, loading, deleteWorkspace } =
    useWorkspace();
  const { fetchSections } = useSections();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sectionCounts, setSectionCounts] = useState<{ [workspaceId: string]: number }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const tags = getAllTags();

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  useEffect(() => {
    const performFilter = async () => {
      if (debouncedSearch || selectedTags.length > 0) {
        await filterWorkspaces(
          debouncedSearch || undefined,
          selectedTags.length > 0 ? selectedTags : undefined,
        );
      } else {
        await fetchWorkspaces();
      }
    };

    performFilter();
  }, [debouncedSearch, selectedTags]);

  useEffect(() => {
    const fetchAllSectionCounts = async () => {
      const counts: { [workspaceId: string]: number } = {};
      await Promise.all(
        workspaces.map(async (workspace) => {
          try {
            const sections = await fetchSections(workspace.id);
            counts[workspace.id] = Array.isArray(sections) ? sections.length : 0;
          } catch {
            counts[workspace.id] = 0;
          }
        }),
      );
      setSectionCounts(counts);
    };
    if (workspaces.length > 0) {
      fetchAllSectionCounts();
    }
  }, [workspaces]);

  useEffect(() => {
    // Open modal if ?create=1 is in the query string
    const params = new URLSearchParams(location.search);
    if (params.get('create') === '1') {
      setShowCreateModal(true);
    }
  }, [location.search]);

  const handleWorkspaceCreated = (newWorkspace: any) => {
    setShowCreateModal(false);
    fetchWorkspaces();
    if (newWorkspace && newWorkspace.id) {
      const defaultSectionMap = {
        Proposal: 'Executive Summary',
        'Service Agreement': 'Agreement Overview',
        Report: 'Introduction',
        Research: 'Abstract',
        Template: 'Header',
        Blog: 'Title',
      };
      const defaultSectionName = defaultSectionMap[newWorkspace.workspaceType] || '';
      navigate(`/dashboard/proposal-authoring/${newWorkspace.id}`, {
        state: {
          workspaceId: newWorkspace.id,
          sectionName: defaultSectionName,
          workspaceName: newWorkspace.name,
        },
      });
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <FiFolder className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Content Workspaces</h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Organize and manage your reusable content libraries
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {workspaces.length > 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-primary to-primary/90 text-white px-6 py-3 rounded-xl font-semibold hover:from-primary/90 hover:to-primary transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <FiPlus className="w-5 h-5 inline mr-2" />
                  New Workspace
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filter Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="space-y-6">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-96 pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm"
              />
            </div>

            {tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Filter by Tags</h3>
                <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-primary/10 hover:border-primary/30 hover:shadow-sm'
                    }`}
                  >
                    <FiTag className="inline w-3 h-3 mr-1" />
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  >
                    Clear filters
                  </button>
                )}
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Workspaces Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FiLoader className="w-8 h-8 animate-spin text-primary" />
                </div>
                <p className="text-gray-600 font-medium">Loading workspaces...</p>
              </div>
            </div>
          ) : workspaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => navigate(`/dashboard/workspaces/${workspace.id}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer group relative hover:-translate-y-1"
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this workspace?')) {
                        deleteWorkspace(workspace.id);
                      }
                    }}
                    className="absolute top-4 right-4 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 z-10"
                    title="Delete workspace"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                  
                  {/* Workspace Content */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                          <FiFolder className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-200 leading-tight">
                            {workspace.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600 font-medium">Active</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        <span className="font-medium">Client:</span> {workspace.clientName || 'No client specified'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {workspace.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {workspace.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-semibold flex items-center border border-primary/20"
                          >
                            <FiTag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {workspace.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                            +{workspace.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">{sectionCounts[workspace.id] ?? 0}</span> content pieces
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">Updated today</span>
                        </div>
                        <FiArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="max-w-lg mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                  <FiFolder className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {search || selectedTags.length > 0 ? 'No workspaces found' : 'No workspaces yet'}
                </h3>
                <p className="text-gray-600 mb-10 text-lg leading-relaxed">
                  {search || selectedTags.length > 0
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first workspace to organize reusable content'}
                </p>
                {!search && selectedTags.length === 0 && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-primary to-primary/90 text-white px-8 py-4 rounded-xl font-semibold hover:from-primary/90 hover:to-primary transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <FiPlus className="w-5 h-5 inline mr-2" />
                    Add New Workspace
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CreateWorkspace
              onWorkspaceCreated={handleWorkspaceCreated}
              onClose={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;