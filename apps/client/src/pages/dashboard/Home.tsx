import React, { useEffect } from 'react';
import { FiArrowRight, FiClock, FiEdit, FiFileText, FiFolder, FiPlus, FiTag, FiTrendingUp } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { dashboardData, loading, error, fetchDashboardData } = useDashboard();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-primary mx-auto"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-transparent animate-pulse"></div>
              </div>
              <p className="text-gray-600 mt-6 text-lg font-medium">Loading your dashboard...</p>
              <p className="text-gray-500 mt-2 text-sm">Gathering your latest data</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFileText className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
                <p className="text-red-600 mb-6">{error}</p>
                <button
                  onClick={fetchDashboardData}
                  className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Workspaces',
      value: dashboardData?.stats.total_workspaces?.toString() || '0',
      icon: FiFolder,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      trend: '+12%'
    },
    {
      label: 'Content Chunks',
      value: dashboardData?.stats.total_sections?.toString() || '0',
      icon: FiFileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      trend: '+8%'
    },
    {
      label: 'Saved Prompts',
      value: dashboardData?.stats.total_prompts?.toString() || '0',
      icon: FiEdit,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      trend: '+15%'
    },
    {
      label: 'Generated Content',
      value: dashboardData?.stats.total_generated_content?.toString() || '0',
      icon: FiTag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      trend: '+23%'
    },
  ];

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks} weeks ago`;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                    <FiFolder className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 text-sm font-medium">System Online</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
                  Monitor your workspace performance, track content creation, and manage your proposal authoring workflow from this central hub.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchDashboardData}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
                  title="Refresh dashboard stats"
                >
                  <FiTrendingUp className="w-4 h-4 mr-2 inline" />
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className={`bg-white rounded-2xl p-6 border ${stat.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <span className="text-green-600 text-sm font-medium flex items-center">
                      <FiTrendingUp className="w-3 h-3 mr-1" />
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <div className={`${stat.bgColor} p-4 rounded-xl border ${stat.borderColor} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </div>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${stat.color.replace('text-', 'from-').replace('-600', '-400')} to-${stat.color.replace('text-', '').replace('-600', '-600')} rounded-full transition-all duration-1000 ease-out`} 
                     style={{width: `${Math.min(parseInt(stat.value) * 10, 100)}%`}}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Workspaces */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FiClock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                        <p className="text-gray-600 text-sm mt-1">
                          Your most recently accessed workspaces
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/workspaces')}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6">
                {dashboardData?.recent_workspaces && dashboardData.recent_workspaces.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recent_workspaces.map((ws, index) => (
                      <div
                        key={ws.id}
                        onClick={() => navigate(`/dashboard/workspaces/${ws.id}`)}
                        className="group p-5 border border-gray-200 rounded-xl hover:border-primary/30 cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-r from-white to-gray-50/50 hover:from-primary/5 hover:to-primary/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200">
                                <FiFolder className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors duration-200">{ws.name}</h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">#{index + 1}</span>
                                  <span className="text-xs text-gray-500">Most Recent</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              <span className="font-medium">Client:</span> {ws.client}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-sm text-gray-500">
                                <FiClock className="w-4 h-4 mr-2" />
                                {ws.last_used_at ? formatTimeAgo(ws.last_used_at) : 'Never accessed'}
                              </div>
                              <FiArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <FiFolder className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Recent Activity
                    </p>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                      Start by opening a workspace to see your recent activity here
                    </p>
                    <button
                      onClick={() => navigate('/dashboard/workspaces?create=1')}
                      className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                    >
                      <FiPlus className="w-4 h-4 mr-2 inline" />
                      Create First Workspace
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FiPlus className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                    <p className="text-sm text-gray-600 mt-1">Jump into your workflow</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={() => navigate('/dashboard/workspaces?create=1')}
                  className="w-full group p-5 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:from-primary/90 hover:to-primary transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="flex items-center space-x-3">
                        <FiPlus className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        <div>
                          <span className="font-semibold block">New Workspace</span>
                          <span className="text-white/90 text-sm">Start organizing content</span>
                        </div>
                      </div>
                    </div>
                    <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </button>
                <button
                  onClick={() => navigate('/dashboard/content-ingestion')}
                  className="w-full group p-5 border-2 border-gray-200 rounded-xl hover:border-primary/30 transition-all duration-200 hover:shadow-md bg-gradient-to-r from-white to-gray-50/50 hover:from-primary/5 hover:to-primary/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                          <FiFolder className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">Upload Content</span>
                          <span className="text-gray-600 text-sm">Add new resources</span>
                        </div>
                      </div>
                    </div>
                    <FiArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
