const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../Milestone 2/frontend/src/pages/TeacherMockTestResult.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

const replacements = [
  // Loading
  [
    `<div className="w-12 h-12 border-4 border-[#DCE5F0] border-t-orange-500 rounded-full animate-spin"></div>`,
    `<div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>`
  ],
  [
    `border-t-orange-500`,
    `border-t-[#233B67]`
  ],

  // Top Banner
  [
    `className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-xl relative overflow-hidden"`,
    `className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden"`
  ],
  [
    `<div className="absolute top-0 right-0 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>`,
    `<div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>`
  ],
  [
    `from-orange-600 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200 flex-shrink-0`,
    `from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-[#233B67]/20 flex-shrink-0`
  ],
  [
    `bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold uppercase tracking-wider mb-1`,
    `bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30`
  ],
  [
    `<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{student_name}</h1>`,
    `<h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">{student_name}</h1>`
  ],
  [
    `text-stone-500`,
    `text-[#718096]`
  ],
  [
    `text-stone-600`,
    `text-[#718096]/50`
  ],
  [
    `font-mono text-[#06B6D4]`,
    `font-mono text-[#4169C1] font-semibold`
  ],
  [
    `bg-[#F1F5FB]/60 p-4 rounded-2xl border border-[#E2E8F0]`,
    `bg-[#F5F7FC] p-4 rounded-2xl border border-[#E2E8F0]`
  ],
  [
    `className="text-xs font-semibold text-white truncate max-w-[150px]"`,
    `className="text-xs font-semibold text-[#202B40] truncate max-w-[150px]"`
  ],
  [
    `className="text-xs font-semibold text-white"`,
    `className="text-xs font-semibold text-[#202B40]"`
  ],
  [
    `bg-[#2563EB]/10 text-[#2563EB]`,
    `bg-[#EDF2FA] text-[#4169C1]`
  ],
  [
    `bg-amber-500/10 text-[#2563EB] border border-amber-500/20`,
    `bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30`
  ],
  [
    `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`,
    `bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30`
  ],

  // 4 KPI Cards
  [
    `<div className="glass-card p-5 rounded-2xl relative overflow-hidden">`,
    `<div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">`
  ],
  [
    `<div className="glass-card p-5 rounded-2xl">`,
    `<div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">`
  ],
  [
    `text-3xl font-extrabold text-white mt-3`,
    `text-3xl font-extrabold text-[#202B40] mt-3`
  ],
  [
    `text-2xl font-bold text-white mt-3`,
    `text-2xl font-bold text-[#202B40] mt-3`
  ],
  [
    `passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-[#2563EB]'`,
    `passed ? 'bg-[#299D70]/10 text-[#299D70]' : 'bg-[#D69B35]/10 text-[#D69B35]'`
  ],
  [
    `pending_subjective_count > 0 ? 'bg-amber-500/10 text-[#2563EB]' : 'bg-emerald-500/10 text-emerald-400'`,
    `pending_subjective_count > 0 ? 'bg-[#D69B35]/10 text-[#D69B35]' : 'bg-[#299D70]/10 text-[#299D70]'`
  ],

  // Analytics Panel
  [
    `<div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-6">`,
    `<div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">`
  ],
  [
    `<h2 className="text-xl font-bold text-white tracking-tight">`,
    `<h2 className="text-xl font-bold text-[#202B40] tracking-tight">`
  ],
  [
    `<div className="bg-[#F1F5FB]/60 p-3.5 rounded-2xl border border-[#E2E8F0]/80">`,
    `<div className="bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E2E8F0]">`
  ],
  [
    `text-lg font-bold text-white mt-1`,
    `text-lg font-bold text-[#202B40] mt-1`
  ],
  [
    `stroke="#44403c"`,
    `stroke="#E2E8F0"`
  ],
  [
    `stopColor="#fb923c"`,
    `stopColor="#4169C1"`
  ],
  [
    `stroke="#fb923c"`,
    `stroke="#4169C1"`
  ],
  [
    `fill-orange-400 stroke-white stroke-2`,
    `fill-[#4169C1] stroke-white stroke-2`
  ],
  [
    `fill-[#F1F5FB] stroke-orange-400 stroke-2`,
    `fill-white stroke-[#4169C1] stroke-2`
  ],
  [
    `<div className="lg:col-span-2 bg-[#F1F5FB]/60 p-5 rounded-2xl border border-[#E2E8F0]/80 space-y-4">`,
    `<div className="lg:col-span-2 bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">`
  ],
  [
    `<h3 className="text-sm font-bold text-white">`,
    `<h3 className="text-sm font-bold text-[#202B40]">`
  ],
  [
    `<div className="bg-[#F1F5FB]/60 p-5 rounded-2xl border border-[#E2E8F0]/80 space-y-4">`,
    `<div className="bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">`
  ],

  // History table
  [
    `<thead className="bg-[#F1F5FB]/80 text-[#64748B] border-b border-[#E2E8F0] uppercase tracking-wider">`,
    `<thead className="bg-[#F5F7FC] text-[#718096] border-b border-[#E2E8F0] uppercase tracking-wider">`
  ],
  [
    `att.is_current ? 'bg-[#2563EB]/10 font-semibold' : 'hover:bg-[#E2E8F0]/30'`,
    `att.is_current ? 'bg-[#EDF2FA] font-semibold text-[#202B40]' : 'hover:bg-[#F5F7FC]'`
  ],
  [
    `text-stone-200`,
    `text-[#202B40]`
  ],
  [
    `font-medium text-white`,
    `font-medium text-[#202B40]`
  ],

  // Question-by-Question breakdown filters
  [
    `questionFilter === 'all'\n                  ? 'bg-[#2563EB] text-white shadow-md'\n                  : 'text-[#64748B] hover:text-white'`,
    `questionFilter === 'all'\n                  ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'\n                  : 'text-[#718096] hover:text-[#202B40]'`
  ],
  [
    `questionFilter === 'mcq'\n                  ? 'bg-[#2563EB] text-white shadow-md'\n                  : 'text-[#64748B] hover:text-white'`,
    `questionFilter === 'mcq'\n                  ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'\n                  : 'text-[#718096] hover:text-[#202B40]'`
  ],
  [
    `questionFilter === 'subjective'\n                  ? 'bg-[#2563EB] text-white shadow-md'\n                  : 'text-[#64748B] hover:text-white'`,
    `questionFilter === 'subjective'\n                  ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'\n                  : 'text-[#718096] hover:text-[#202B40]'`
  ],
  [
    `questionFilter === 'pending'\n                  ? 'bg-amber-600 text-white shadow-md'\n                  : 'text-[#2563EB]/80 hover:text-[#06B6D4]'`,
    `questionFilter === 'pending'\n                  ? 'bg-[#D69B35] text-white shadow-sm shadow-[#D69B35]/20'\n                  : 'text-[#D69B35] hover:text-[#202B40]'`
  ],

  // Question Card containers
  [
    `q.evaluation_status === 'pending_evaluation'\n                    ? 'bg-[#F1F5FB]/70 border-amber-500/30 shadow-lg shadow-amber-500/5'\n                    : 'bg-[#F1F5FB]/40 border-[#E2E8F0]'`,
    `q.evaluation_status === 'pending_evaluation'\n                    ? 'bg-[#FFFDF5] border-[#D69B35]/40 shadow-sm'\n                    : 'bg-[#F5F7FC] border-[#E2E8F0]'`
  ],
  [
    `text-base font-semibold text-white mb-5 leading-relaxed`,
    `text-base font-semibold text-[#202B40] mb-5 leading-relaxed`
  ],
  [
    `bg-[#F1F5FB]/40 border-[#E2E8F0]`,
    `bg-[#F5F7FC] border-[#E2E8F0]`
  ],
  [
    `bg-[#F1F5FB]/60 border-[#E2E8F0] text-[#94A3B8]`,
    `bg-white border-[#E2E8F0] text-[#718096]`
  ],
  [
    `bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold`,
    `bg-[#299D70]/10 border-[#299D70]/40 text-[#299D70] font-semibold`
  ],
  [
    `bg-red-500/10 border-red-500/40 text-red-300 font-semibold`,
    `bg-[#D95C65]/10 border-[#D95C65]/40 text-[#D95C65] font-semibold`
  ],
  [
    `bg-stone-950/70 border border-[#E2E8F0] text-sm text-stone-200 leading-relaxed font-sans whitespace-pre-wrap`,
    `bg-white border border-[#E2E8F0] text-sm text-[#202B40] leading-relaxed font-sans whitespace-pre-wrap`
  ],
  [
    `bg-[#F1F5FB]/60 border border-[#E2E8F0]/80 space-y-1.5`,
    `bg-[#EDF2FA] border border-[#E2E8F0] space-y-1.5`
  ],
  // Teacher evaluation scoring box
  [
    `bg-[#2563EB]/10 border border-[#DCE5F0] space-y-4`,
    `bg-[#EDF2FA] border border-[#E2E8F0] space-y-4`
  ],
  [
    `<h4 className="text-sm font-bold text-white">Teacher Evaluation & Scoring</h4>`,
    `<h4 className="text-sm font-bold text-[#202B40]">Teacher Evaluation & Scoring</h4>`
  ],
  [
    `className="w-full bg-[#F1F5FB] border border-[#CBD5E1]/80 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#DCE5F0] focus:ring-1 focus:ring-orange-500"`,
    `className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/20"`
  ],
  [
    `className="w-full bg-[#F1F5FB] border border-[#CBD5E1]/80 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-[#DCE5F0] focus:ring-1 focus:ring-orange-500"`,
    `className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/20"`
  ],
  [
    `className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#2563EB] shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-60"`,
    `className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2 disabled:opacity-60"`
  ]
];

for (const [from, to] of replacements) {
  code = code.replaceAll(from, to);
}

// Global text icon cleanups
code = code.replaceAll(`text-[#2563EB]`, `text-[#4169C1]`);
code = code.replaceAll(`text-[#94A3B8]`, `text-[#718096]`);
code = code.replaceAll(`text-[#64748B]`, `text-[#718096]`);
code = code.replaceAll(`text-emerald-400`, `text-[#299D70]`);
code = code.replaceAll(`text-red-400`, `text-[#D95C65]`);
code = code.replaceAll(`text-orange-200`, `text-[#4169C1]`);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('TeacherMockTestResult.jsx redesigned successfully.');
