import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { formatApiError } from '../api/axios';
import { 
  Shield, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Clock,
  XCircle,
  Search,
  Check,
  X,
  Power,
  RotateCcw
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, consumePreloadedData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const roleParam = searchParams.get('role');

  
  const preloaded = typeof consumePreloadedData === 'function' ? consumePreloadedData('admin') : null;

  const [data, setData] = useState(() => preloaded?.summary || null);
  const [usersList, setUsersList] = useState(() => preloaded?.usersList || { students: [], teachers: [] });
  const [loading, setLoading] = useState(() => !preloaded);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [roleFilter, setRoleFilter] = useState(
    ['student', 'teacher'].includes(roleParam) ? roleParam : 'all'
  );
  const [activeTab, setActiveTab] = useState(
    tabParam === 'directory' ? 'directory' : 'queue'
  );

  
  useEffect(() => {
    const t = searchParams.get('tab');
    const r = searchParams.get('role');
    if (t === 'queue' || t === 'directory') {
      setActiveTab(t);
    }
    if (r && ['all', 'student', 'teacher'].includes(r)) {
      setRoleFilter(r);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', newTab);
    setSearchParams(nextParams);
  };

  const handleRoleChange = (newRole) => {
    setRoleFilter(newRole);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('role', newRole);
    setSearchParams(nextParams);
  };

  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setError('');

    try {
      const [summaryRes, usersRes] = await Promise.all([
        apiClient.get('/admins/dashboard-summary'),
        apiClient.get('/admins/users'),
      ]);
      setData(summaryRes.data);
      setUsersList(usersRes.data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    
    if (preloaded) return;
    fetchData();
  }, []);

  
  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 4500);
  };

  
  const allUsers = useMemo(() => {
    const students = (usersList.students || []).map((s) => ({
      ...s,
      role: 'student',
      fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      affiliation: s.institute || 'Institution not specified',
      details: [
        s.roll_number ? `Roll: ${s.roll_number}` : null,
        s.class_year ? `Year: ${s.class_year}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }));

    const teachers = (usersList.teachers || []).map((t) => ({
      ...t,
      role: 'teacher',
      fullName: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
      affiliation: t.institute || 'Institution not specified',
      details: t.department ? `Dept: ${t.department}` : 'Faculty',
    }));

    return [...students, ...teachers].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [usersList]);

  
  const pendingUsers = useMemo(() => {
    return allUsers.filter((u) => u.approval_status === 'pending');
  }, [allUsers]);

  
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      
      if (statusFilter !== 'all' && u.approval_status !== statusFilter) return false;

      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(query);
        const matchesEmail = (u.email || '').toLowerCase().includes(query);
        const matchesInstitute = (u.affiliation || '').toLowerCase().includes(query);
        const matchesDetails = (u.details || '').toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesInstitute || matchesDetails;
      }

      return true;
    });
  }, [allUsers, roleFilter, statusFilter, searchQuery]);

  
  const handleApprove = async (candidate) => {
    setActionLoading(true);
    try {
      const response = await apiClient.post('/admins/users/approve', {
        email: candidate.email,
        role: candidate.role,
      });

      showFeedback('success', response.data.message || `Approved ${candidate.fullName}`);
      await fetchData();
    } catch (err) {
      showFeedback('error', formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  
  const openRejectModal = (candidate) => {
    setTargetUser(candidate);
    setRejectionReason('');
    setRejectError('');
    setRejectModalOpen(true);
  };

  
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!targetUser) return;

    const cleanReason = rejectionReason.trim();
    if (!cleanReason) {
      setRejectError('Please specify a rejection reason for the candidate.');
      return;
    }

    setActionLoading(true);
    setRejectError('');

    try {
      const response = await apiClient.post('/admins/users/reject', {
        email: targetUser.email,
        role: targetUser.role,
        reason: cleanReason,
      });

      showFeedback('success', response.data.message || `Registration for ${targetUser.fullName} was rejected.`);
      setRejectModalOpen(false);
      setTargetUser(null);
      await fetchData();
    } catch (err) {
      setRejectError(formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  
  const handleToggleActive = async (candidate) => {
    setActionLoading(true);
    const newStatus = !candidate.is_active;

    try {
      const response = await apiClient.post('/admins/users/toggle-status', {
        email: candidate.email,
        role: candidate.role,
        is_active: newStatus,
      });

      showFeedback('success', response.data.message || `Account status updated.`);
      await fetchData();
    } catch (err) {
      showFeedback('error', formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Registered recently';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-pulse">
        
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden h-36 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/10"></div>
            <div className="space-y-2">
              <div className="w-36 h-4 rounded-full bg-[#2563EB]/10"></div>
              <div className="w-56 h-6 rounded-lg bg-[#2563EB]/10"></div>
            </div>
          </div>
          <div className="w-32 h-10 rounded-2xl bg-[#2563EB]/10 hidden sm:block"></div>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm h-28 space-y-3">
              <div className="w-24 h-3 rounded-full bg-[#2563EB]/10"></div>
              <div className="w-16 h-7 rounded-lg bg-[#2563EB]/10"></div>
            </div>
          ))}
        </div>

        
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm h-80 space-y-4">
          <div className="w-48 h-6 rounded-lg bg-[#2563EB]/10"></div>
          <div className="w-full h-48 rounded-2xl bg-[#F5F7FC]"></div>
        </div>
      </div>
    );
  }

  const profile = data?.admin || user;
  const metrics = data?.metrics || {
    total_students: 0,
    total_teachers: 0,
    total_admins: 1,
    pending_approvals: 0,
    approved_students: 0,
    approved_teachers: 0,
    rejected_accounts: 0,
    active_accounts: 0,
    inactive_accounts: 0,
    published_exams: 0,
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-[#233B67]/20 shrink-0">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202B40] tracking-tight">
                {profile?.first_name} {profile?.last_name}
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                Admin Console: <span className="text-[#4169C1] font-mono font-medium">{profile?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || actionLoading}
              title="Refresh database records"
              className="flex items-center gap-2 bg-[#EDF2FA] hover:bg-[#E2E8F0] text-[#718096] hover:text-[#202B40] px-3.5 py-2.5 rounded-2xl border border-[#E2E8F0] text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#4169C1]' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>
      </div>

      
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {feedback.message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-3 transition-all duration-300 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#299D70]" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        <div
          onClick={() => setActiveTab('queue')}
          className="bg-white p-5 rounded-2xl border border-[#D69B35]/30 shadow-sm cursor-pointer hover:border-[#D69B35] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#D69B35] uppercase tracking-wider">Pending Approvals</span>
            <div className="w-9 h-9 rounded-xl bg-[#D69B35]/10 text-[#D69B35] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#D69B35] mt-2.5">
            {metrics.pending_approvals}
          </div>
          <div className="flex items-center justify-between text-xs text-[#718096] mt-2 pt-2 border-t border-[#E2E8F0]">
            <span>{metrics.pending_students || 0} Students</span>
            <span>{metrics.pending_teachers || 0} Teachers</span>
          </div>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">Total Students</span>
            <div className="w-9 h-9 rounded-xl bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#202B40] mt-2.5">{metrics.total_students}</div>
          <div className="flex items-center justify-between text-xs text-[#718096] mt-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-[#299D70] font-medium">{metrics.approved_students} Approved</span>
            <span>{metrics.total_students - metrics.approved_students} Pending/Other</span>
          </div>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">Total Teachers</span>
            <div className="w-9 h-9 rounded-xl bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#202B40] mt-2.5">{metrics.total_teachers}</div>
          <div className="flex items-center justify-between text-xs text-[#718096] mt-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-[#299D70] font-medium">{metrics.approved_teachers} Approved</span>
            <span>{metrics.total_teachers - metrics.approved_teachers} Pending/Other</span>
          </div>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">Account Security</span>
            <div className="w-9 h-9 rounded-xl bg-[#299D70]/10 text-[#299D70] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-2.5 flex items-center gap-2">
            <span className="text-[#299D70]">{metrics.active_accounts}</span>
            <span className="text-xs text-[#718096] font-normal">Active Users</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#718096] mt-2 pt-2 border-t border-[#E2E8F0]">
            <span>{metrics.rejected_accounts || 0} Rejected</span>
            <span className="text-[#D95C65]">{metrics.inactive_accounts || 0} Inactive</span>
          </div>
        </div>
      </div>

      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-2 bg-[#F5F7FC] p-1.5 rounded-2xl border border-[#E2E8F0] self-start">
          <button
            onClick={() => handleTabChange('queue')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20 font-bold'
                : 'text-[#718096] hover:text-[#202B40]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Approval Queue</span>
            {pendingUsers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EDF2FA] text-[#4169C1] ml-1">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('directory')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20 font-bold'
                : 'text-[#718096] hover:text-[#202B40]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Approvals Directory</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EDF2FA] text-[#718096] ml-1">
              {allUsers.length}
            </span>
          </button>
        </div>
      </div>

      
      {activeTab === 'queue' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#202B40] flex items-center gap-2">
                <span>Pending Registration Queue</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30">
                  {pendingUsers.length} Awaiting Review
                </span>
              </h2>
              <p className="text-xs text-[#718096] mt-1">
                Review candidate credentials and institutional affiliations before granting platform access.
              </p>
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="py-14 text-center rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F5F7FC]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#299D70] flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#202B40]">All Caught Up!</h3>
              <p className="text-xs text-[#718096] mt-1 max-w-md mx-auto">
                There are no pending registrations currently waiting in the approval queue. All student and teacher applications have been reviewed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider bg-[#F5F7FC]">
                    <th className="py-3.5 px-4">Candidate</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Institute / Affiliation</th>
                    <th className="py-3.5 px-4">Details</th>
                    <th className="py-3.5 px-4">Registered</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/60">
                  {pendingUsers.map((candidate, idx) => (
                    <tr key={candidate.id || idx} className="hover:bg-[#F5F7FC] transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-[#202B40]">{candidate.fullName}</div>
                        <div className="text-xs text-[#718096] font-mono mt-0.5">{candidate.email}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            candidate.role === 'teacher'
                              ? 'bg-[#EDF2FA] text-[#4169C1] border border-[#4169C1]/30'
                              : 'bg-[#F5F7FC] text-[#233B67] border border-[#E2E8F0]'
                          }`}
                        >
                          {candidate.role === 'teacher' ? 'Teacher' : 'Student'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-[#202B40] font-medium">
                          <Building className="w-3.5 h-3.5 text-[#718096] shrink-0" />
                          <span>{candidate.affiliation}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs text-[#718096]">
                        {candidate.details || '—'}
                      </td>

                      <td className="py-4 px-4 text-xs text-[#718096]">
                        {formatDate(candidate.created_at)}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D69B35] animate-pulse"></span>
                          Pending
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(candidate)}
                            disabled={actionLoading}
                            title="Approve candidate account"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#299D70] hover:bg-[#20835C] text-white text-xs font-semibold transition-all shadow-sm shadow-[#299D70]/20 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => openRejectModal(candidate)}
                            disabled={actionLoading}
                            title="Reject candidate application"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D95C65]/10 hover:bg-[#D95C65]/20 text-[#D95C65] border border-[#D95C65]/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {activeTab === 'directory' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#202B40]">Platform Users Registry</h2>
              <p className="text-xs text-[#718096] mt-1">
                Search, filter, and manage role-based approvals and activation status.
              </p>
            </div>

            
            <div className="flex flex-wrap items-center gap-3">
              
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, institute..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5F7FC] border border-[#E2E8F0] text-xs text-[#202B40] placeholder:text-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white transition-colors"
                />
              </div>

              
              <div className="flex rounded-xl bg-[#F5F7FC] p-1 border border-[#E2E8F0]">
                {['all', 'student', 'teacher'].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                      roleFilter === r
                        ? 'bg-[#233B67] text-white font-semibold shadow-sm'
                        : 'text-[#718096] hover:text-[#202B40]'
                    }`}
                  >
                    {r === 'all' ? 'All Roles' : `${r}s`}
                  </button>
                ))}
              </div>

              
              <div className="flex rounded-xl bg-[#F5F7FC] p-1 border border-[#E2E8F0]">
                {['all', 'approved', 'pending', 'rejected'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                      statusFilter === s
                        ? 'bg-[#233B67] text-white font-semibold shadow-sm'
                        : 'text-[#718096] hover:text-[#202B40]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider bg-[#F5F7FC]">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Institute</th>
                  <th className="py-3.5 px-4">Academic Info</th>
                  <th className="py-3.5 px-4 text-center">Approval Status</th>
                  <th className="py-3.5 px-4 text-center">Account State</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-[#718096] text-xs">
                      No matching user records found matching the specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((candidate, idx) => (
                    <tr key={candidate.id || idx} className="hover:bg-[#F5F7FC] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#202B40]">{candidate.fullName}</div>
                        <div className="text-xs text-[#718096] font-mono mt-0.5">{candidate.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                            candidate.role === 'teacher'
                              ? 'bg-[#EDF2FA] text-[#4169C1] border border-[#4169C1]/30'
                              : 'bg-[#F5F7FC] text-[#233B67] border border-[#E2E8F0]'
                          }`}
                        >
                          {candidate.role === 'teacher' ? 'Teacher' : 'Student'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-[#718096]">
                          <Building className="w-3.5 h-3.5 text-[#718096] shrink-0" />
                          <span>{candidate.affiliation}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#718096]">
                        {candidate.details || '—'}
                      </td>

                      
                      <td className="py-3.5 px-4 text-center">
                        {candidate.approval_status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30">
                            <CheckCircle2 className="w-3 h-3 text-[#299D70]" />
                            Approved
                          </span>
                        )}
                        {candidate.approval_status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30">
                            <Clock className="w-3 h-3 text-[#4169C1]" />
                            Pending
                          </span>
                        )}
                        {candidate.approval_status === 'rejected' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D95C65]/10 text-[#D95C65] border border-[#D95C65]/30">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              Rejected
                            </span>
                            {candidate.rejection_reason && (
                              <span
                                title={candidate.rejection_reason}
                                className="text-[10px] text-[#718096] max-w-[120px] truncate cursor-help mt-0.5"
                              >
                                {candidate.rejection_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            candidate.is_active
                              ? 'bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30'
                              : 'bg-[#EDF2FA] text-[#718096] border border-[#E2E8F0]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              candidate.is_active ? 'bg-[#299D70]' : 'bg-[#718096]'
                            }`}
                          ></span>
                          {candidate.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {candidate.approval_status !== 'approved' && (
                            <button
                              onClick={() => handleApprove(candidate)}
                              disabled={actionLoading}
                              title="Approve candidate account"
                              className="p-1.5 rounded-lg bg-[#299D70]/10 hover:bg-[#299D70]/20 text-[#299D70] border border-[#299D70]/30 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          
                          {candidate.approval_status !== 'rejected' && (
                            <button
                              onClick={() => openRejectModal(candidate)}
                              disabled={actionLoading}
                              title="Reject registration"
                              className="p-1.5 rounded-lg bg-[#D95C65]/10 hover:bg-[#D95C65]/20 text-[#D95C65] border border-[#D95C65]/30 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          
                          <button
                            onClick={() => handleToggleActive(candidate)}
                            disabled={actionLoading}
                            title={candidate.is_active ? 'Deactivate account' : 'Activate account'}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                              candidate.is_active
                                ? 'bg-[#EDF2FA] hover:bg-[#D95C65]/10 text-[#718096] hover:text-[#D95C65] border-[#E2E8F0] hover:border-[#D95C65]/30'
                                : 'bg-[#4169C1]/10 hover:bg-[#4169C1]/20 text-[#4169C1] border border-[#4169C1]/30'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {rejectModalOpen && targetUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E2E8F0]">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="reject-dialog-title" className="text-lg font-bold text-[#202B40]">
                    Reject Candidate Registration
                  </h3>
                  <p className="text-xs text-[#718096]">
                    A rejection notice with reason will be logged for this user.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-[#718096] hover:text-[#202B40] p-1 rounded-lg hover:bg-[#EDF2FA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            
            <div className="my-5 p-4 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#718096]">Candidate Name:</span>
                <span className="font-semibold text-[#202B40]">{targetUser.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">Role:</span>
                <span className="capitalize font-semibold text-[#4169C1]">{targetUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">Email:</span>
                <span className="font-mono text-[#4169C1] font-semibold">{targetUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">Institution:</span>
                <span className="text-[#202B40]">{targetUser.affiliation}</span>
              </div>
            </div>

            
            {rejectError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            
            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label htmlFor="rejection-reason" className="block text-xs font-semibold text-[#202B40] mb-1.5">
                  Rejection Reason <span className="text-[#D95C65]">*</span>
                </label>
                <textarea
                  id="rejection-reason"
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Institutional credentials could not be verified, or invalid roll number / department details."
                  className="w-full p-3.5 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] text-[#202B40] text-xs placeholder:text-[#718096]/60 focus:border-[#D95C65] focus:outline-none focus:ring-1 focus:ring-[#D95C65]/20 resize-none"
                />
                <p className="text-[11px] text-[#718096] mt-1">
                  This explanation will be recorded and shown to the candidate if they attempt to sign in.
                </p>
              </div>

              
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#D95C65] hover:bg-[#C24851] shadow-sm shadow-[#D95C65]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Reject Signup</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

