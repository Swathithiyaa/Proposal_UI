import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import DashLayout from './layouts/DashLayout';
import Auth from './pages/Auth';
import ContentIngestion from './pages/dashboard/ContentIngestion';
import ContentSources from './pages/dashboard/ContentSources';
import ContentSourceView from './pages/dashboard/ContentSourceView';
import CreateProposal from './pages/dashboard/CreateProposal';
import DashHome from './pages/dashboard/Home';
import ProposalAuthoring from './pages/dashboard/ProposalAuthoring';
// import ProposalView from './pages/dashboard/ProposalView';
import { Toaster } from 'react-hot-toast';
import PromptTemplatePage from './components/dashboard/PromptTemplatePage';
import AddContentChunksPage from './pages/dashboard/AddContentChunksPage';
import Workspaces from './pages/dashboard/Workspaces';
import WorkspaceView from './pages/dashboard/WorkspaceView';
import Error from './pages/Error';
import Home from './pages/Home';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <Error />,
  },
  {
    path: '/auth',
    element: <Auth />,
    errorElement: <Error />,
  },
  {
    path: '/dashboard',
    element: <DashLayout />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <DashHome />,
        errorElement: <Error />,
      },
      {
        path: 'workspaces',
        element: <Workspaces />,
        errorElement: <Error />,
      },
      {
        path: 'workspaces/:id',
        element: <WorkspaceView />,
        errorElement: <Error />,
      },
      {
        path: 'workspaces/:id/add-content/:sourceId',
        element: <AddContentChunksPage />,
        errorElement: <Error />,
      },
      {
        path: 'content-ingestion',
        element: <ContentIngestion />,
        errorElement: <Error />,
      },
      {
        path: 'content-sources',
        element: <ContentSources />,
        errorElement: <Error />,
      },
      {
        path: 'content-sources/:id',
        element: <ContentSourceView />,
        errorElement: <Error />,
      },
      {
        path: 'proposal-authoring',
        element: <ProposalAuthoring />,
        errorElement: <Error />,
      },
      {
        path: 'proposal-authoring/:id',
        element: <ProposalAuthoring />,
        errorElement: <Error />,
      },
      {
        path: 'proposal-authoring/create-proposal',
        element: <CreateProposal />,
        errorElement: <Error />,
      },
      {
        // path: 'proposal-authoring/:id',
        // element: <ProposalView />,
        // errorElement: <Error />,
      },
      {
        path: 'prompt-templates',
        element: <PromptTemplatePage />,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-right" />
  </StrictMode>,
);
