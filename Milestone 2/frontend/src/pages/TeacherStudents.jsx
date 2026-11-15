import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { formatApiError } from '../api/axios';
import {
  Users,
  Search,
  Building,
  Hash,
  Calendar,
  Mail,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Plus,
  BookOpen,
  Filter
} from 'lucide-react';

const TeacherStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await apiClient.get('/teachers/students');
      setStudents(res.data || []);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = st.name && st.name.toLowerCase().includes(q);
    const emailMatch = st.email && st.email.toLowerCase().includes(q);
    const rollMatch = st.roll_number && st.roll_number.toLowerCase().includes(q);
    const classMatch = st.class_year && st.class_year.toLowerCase().includes(q);
    const instMatch = st.institute && st.institute.toLowerCase().includes(q);
    return nameMatch || emailMatch || rollMatch || classMatch || instMatch;
  });

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">
      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-[#233B67]/20">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Authorized Directory</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">
                Approved Candidates Directory
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                Inspect approved student accounts under your academic institution for test assignment and performance monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStudents(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] hover:text-[#202B40] hover:bg-[#E2E8F0] border border-[#E2E8F0] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#4169C1] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Directory'}</span>
            </button>
            <button
              onClick={() => navigate('/teacher/exams/create')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign to New Exam</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchStudents(true)}
            className="text-xs font-bold text-[#D95C65] underline hover:text-[#202B40]"
          >
            Retry
          </button>
        </div>
      )}

      
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, email, roll number, or class..."
            className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-[#718096]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDF2FA] border border-[#E2E8F0] font-medium">
            <Filter className="w-3.5 h-3.5 text-[#4169C1]" />
            <span>Showing: <strong className="text-[#202B40]">{filteredStudents.length}</strong> of {students.length} Candidates</span>
          </div>
        </div>
      </div>

      
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
          <p className="text-xs text-[#718096]">Loading approved candidate accounts...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center mx-auto mb-2">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#202B40]">
            {searchQuery ? 'No matching candidates found' : 'No approved students available'}
          </h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            {searchQuery
              ? `No student accounts matched "${searchQuery}". Please check your query or clear the search field.`
              : 'Students registered under your institution will appear here once approved by an administrator.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((st) => (
            <div
              key={st.email}
              className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:border-[#4169C1]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-[#EDF2FA] border border-[#4169C1]/30 text-[#4169C1] flex items-center justify-center font-bold text-sm">
                      {st.first_name ? st.first_name[0].toUpperCase() : 'S'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#202B40] leading-tight">
                        {st.name}
                      </h3>
                      <div className="inline-flex items-center gap-1 text-[11px] text-[#299D70] font-medium mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-[#299D70]" />
                        <span>Approved Candidate</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 pt-3 border-t border-[#E2E8F0]/80 text-xs text-[#718096]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#718096] flex-shrink-0" />
                    <span className="truncate text-[#202B40]" title={st.email}>{st.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-[#718096] flex-shrink-0" />
                      <span className="text-[#202B40] font-mono font-medium">{st.roll_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#718096]">
                      <Calendar className="w-3.5 h-3.5 text-[#718096]" />
                      <span>{st.class_year || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-[#718096] flex-shrink-0" />
                    <span className="truncate text-[#718096]" title={st.institute}>{st.institute || 'Institution Unspecified'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate(`/teacher/exams/create`)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all text-center"
                >
                  Create Exam for Candidate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;

