import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiLoader } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { useSections } from '../../hooks/useSections';


const AddContentChunksPage: React.FC = () => {
  const { sourceId, id: workspaceId } = useParams<{ sourceId: string; id: string }>();
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChunks, setSelectedChunks] = useState<number[]>([]);
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const navigate = useNavigate();
  const { createSections } = useSections();

  useEffect(() => {
    if (!sourceId) return;
    setLoading(true);
    fetch(`${window.location.origin}/api/sources/${sourceId}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Fetched source details:', data);
        // Handle both {chunks: [...]} and {source: {...}, chunks: [...]} structures
        if (Array.isArray(data.chunks)) {
          setChunks(data.chunks);
          setSourceName(data.filename || data.source?.name || '');
          setSourceUrl(data.url || data.source?.source_url || '');
        } else if (data && data.source && Array.isArray(data.source.chunks)) {
          setChunks(data.source.chunks);
          setSourceName(data.source.name || '');
          setSourceUrl(data.source.source_url || '');
        } else {
          setChunks([]);
          setSourceName('');
          setSourceUrl('');
        }
      })
      .finally(() => setLoading(false));
  }, [sourceId]);

  const handleToggleChunk = (idx: number) => {
    setSelectedChunks((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const handleSaveChunksToWorkspace = async () => {
    if (!workspaceId || !sourceId || selectedChunks.length === 0) return;
    const sections = selectedChunks.map((idx) => {
      const chunk = chunks[idx];
      return {
        content:
          typeof chunk.content === 'string'
            ? chunk.content
            : Array.isArray(chunk.content)
              ? chunk.content
                  .map((section: any) => {
                    if (section.content && Array.isArray(section.content)) {
                      return `${section.tag}\n${section.content.map((c: any) => c.text).join('\n')}`;
                    } else if (section.text) {
                      return section.text;
                    } else {
                      return '';
                    }
                  })
                  .join('\n\n')
              : '',
        name: getChunkLabel(chunk, idx),
        tags: [],
      };
    });
    const filename = sourceUrl || sourceName;
    // Show toast while saving, and update on success/error
    toast.promise(
      createSections(parseInt(workspaceId), filename, sections).then(() => {
        navigate(`/dashboard/workspaces/${workspaceId}`);
      }),
      {
        loading: 'Adding chunks to workspace...',
        success: 'Chunks added to workspace successfully!',
        error: 'Failed to add chunks to workspace.',
      },
    );
  };

  // Helper to get a label for a chunk
  const getChunkLabel = (chunk: any, idx: number) => {
    if (chunk.label && typeof chunk.label === 'string' && chunk.label.trim()) return chunk.label;
    if (typeof chunk.content === 'string' && chunk.content.trim())
      return chunk.content.substring(0, 50) + '...';
    if (Array.isArray(chunk.content)) {
      // For structured content, join all text fields
      const joined = chunk.content
        .map((section: any) =>
          section.tag
            ? `${section.tag}: ${
                Array.isArray(section.content)
                  ? section.content.map((c: any) => c.text).join(' ')
                  : ''
              }`
            : '',
        )
        .join(' ')
        .substring(0, 50);
      return joined ? joined + '...' : `Section ${idx + 1}`;
    }
    return `Section ${idx + 1}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <button
        className="mb-6 flex items-center text-primary hover:underline"
        onClick={() => navigate(-1)}
      >
        <FiArrowLeft className="mr-2" /> Back to Workspace
      </button>
      <h2 className="text-2xl font-bold mb-6">Select Chunks to Add to Workspace</h2>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <span className="ml-2 text-gray-500">Loading chunks...</span>
        </div>
      ) : chunks.length === 0 ? (
        <div className="text-gray-500">No chunks found for this source.</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto mb-8">
          {chunks.map((chunk, idx) => (
            <div
              key={idx}
              className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                selectedChunks.includes(idx)
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleToggleChunk(idx)}
            >
              <div className="flex-1">
                <div className="font-medium text-black">{getChunkLabel(chunk, idx)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {chunk.page && `Page ${chunk.page} • `}
                  {chunk.section_type && `${chunk.section_type}`}
                </div>
              </div>
              <input
                type="checkbox"
                checked={selectedChunks.includes(idx)}
                onChange={() => handleToggleChunk(idx)}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary ml-4"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSaveChunksToWorkspace}
          disabled={selectedChunks.length === 0}
          className={`py-2 px-6 rounded-lg font-semibold transition-colors ml-2 ${
            selectedChunks.length > 0
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save to Workspace
        </button>
      </div>
    </div>
  );
};

export default AddContentChunksPage;
