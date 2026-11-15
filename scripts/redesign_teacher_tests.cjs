const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../Milestone 2/frontend/src/pages/TeacherTests.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

const replacements = [
  // Top Hero Banner
  [
    `className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-xl relative overflow-hidden"`,
    `className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden"`
  ],
  [
    `<div className="absolute top-0 right-0 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>`,
    `<div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>`
  ],
  [
    `from-[#174EA6] to-[#2563EB] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200`,
    `from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-[#233B67]/20`
  ],
  [
    `bg-[#2563EB]/10 text-[#06B6D4] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#DCE5F0]`,
    `bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30`
  ],
  [
    `<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">`,
    `<h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">`
  ],
  [
    `<p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">`,
    `<p className="text-xs sm:text-sm text-[#718096] mt-0.5">`
  ],
  [
    `className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-200 bg-[#F1F5FB]/90 hover:bg-[#E2E8F0] border border-[#CBD5E1] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"`,
    `className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] hover:text-[#202B40] hover:bg-[#E2E8F0] border border-[#E2E8F0] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"`
  ],
  [
    `className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#2563EB] shadow-lg shadow-blue-200 transition-all flex items-center gap-2"`,
    `className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2"`
  ],

  // Alerts
  [
    `className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center justify-between gap-3"`,
    `className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center justify-between gap-3"`
  ],
  [
    `className="text-xs font-bold text-red-200 underline hover:text-white"`,
    `className="text-xs font-bold text-[#D95C65] underline hover:text-[#202B40]"`
  ],
  [
    `className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between gap-3"`,
    `className="p-4 rounded-xl bg-[#299D70]/10 border border-[#299D70]/30 text-[#299D70] text-sm flex items-center justify-between gap-3"`
  ],
  [
    `className="text-xs font-bold text-emerald-200 hover:text-white"`,
    `className="text-xs font-bold text-[#299D70] hover:text-[#202B40]"`
  ],

  // Filter Bar
  [
    `className="glass-panel p-5 rounded-2xl border border-[#E2E8F0] flex flex-col md:flex-row items-center justify-between gap-4"`,
    `className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"`
  ],
  [
    `statusFilter === 'all'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-200'
                : 'text-[#94A3B8] hover:text-white bg-[#F1F5FB]/80 hover:bg-[#E2E8F0] border border-[#E2E8F0]'`,
    `statusFilter === 'all'
                ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'`
  ],
  [
    `statusFilter === 'drafts'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-[#94A3B8] hover:text-white bg-[#F1F5FB]/80 hover:bg-[#E2E8F0] border border-[#E2E8F0]'`,
    `statusFilter === 'drafts'
                ? 'bg-[#D69B35] text-white shadow-sm shadow-[#D69B35]/20'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'`
  ],
  [
    `statusFilter === 'published'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-[#94A3B8] hover:text-white bg-[#F1F5FB]/80 hover:bg-[#E2E8F0] border border-[#E2E8F0]'`,
    `statusFilter === 'published'
                ? 'bg-[#299D70] text-white shadow-sm shadow-[#299D70]/20'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'`
  ],
  [
    `statusFilter === 'closed'
                ? 'bg-[#CBD5E1] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-white bg-[#F1F5FB]/80 hover:bg-[#E2E8F0] border border-[#E2E8F0]'`,
    `statusFilter === 'closed'
                ? 'bg-[#718096] text-white shadow-sm'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'`
  ],
  [
    `className="w-full bg-stone-950/80 border border-[#CBD5E1] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#DCE5F0]"`,
    `className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"`
  ],

  // Loading
  [
    `<div className="w-10 h-10 border-4 border-[#DCE5F0] border-t-orange-500 rounded-full animate-spin"></div>`,
    `<div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>`
  ],
  [
    `<p className="text-xs text-[#94A3B8]">Loading examinations...</p>`,
    `<p className="text-xs text-[#718096]">Loading examinations...</p>`
  ],

  // Empty state
  [
    `<div className="text-center py-16 px-4 rounded-3xl glass-panel border border-[#E2E8F0] space-y-3">`,
    `<div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">`
  ],
  [
    `<div className="w-12 h-12 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mx-auto mb-2">`,
    `<div className="w-12 h-12 rounded-full bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center mx-auto mb-2">`
  ],
  [
    `<h3 className="text-base font-bold text-white">`,
    `<h3 className="text-base font-bold text-[#202B40]">`
  ],
  [
    `<p className="text-xs text-[#94A3B8] max-w-md mx-auto">`,
    `<p className="text-xs text-[#718096] max-w-md mx-auto">`
  ],
  [
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#2563EB] transition-all inline-flex items-center gap-1.5"`,
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all inline-flex items-center gap-1.5"`
  ],

  // Cards
  [
    `className="glass-card p-6 rounded-2xl border border-[#E2E8F0]/90 hover:border-[#DCE5F0] transition-all flex flex-col justify-between space-y-5 relative group"`,
    `className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm hover:border-[#4169C1]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-5 relative group"`
  ],
  [
    `className="text-[11px] font-semibold text-[#06B6D4] uppercase tracking-wider bg-[#2563EB]/10 border border-[#DCE5F0] px-2.5 py-0.5 rounded-full truncate max-w-[170px]"`,
    `className="text-[11px] font-semibold text-[#4169C1] uppercase tracking-wider bg-[#EDF2FA] border border-[#4169C1]/30 px-2.5 py-0.5 rounded-full truncate max-w-[170px]"`
  ],
  [
    `isPublished
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isDraft
                            ? 'bg-amber-500/15 text-[#06B6D4] border-amber-500/30'
                            : 'bg-[#CBD5E1]/50 text-stone-200 border-stone-600'`,
    `isPublished
                            ? 'bg-[#299D70]/10 text-[#299D70] border-[#299D70]/30'
                            : isDraft
                            ? 'bg-[#D69B35]/10 text-[#D69B35] border-[#D69B35]/30'
                            : 'bg-[#EDF2FA] text-[#718096] border-[#E2E8F0]'`
  ],
  [
    `className="p-1 rounded-lg hover:bg-[#E2E8F0] text-[#94A3B8] hover:text-white transition-colors"`,
    `className="p-1 rounded-lg hover:bg-[#EDF2FA] text-[#718096] hover:text-[#202B40] transition-colors"`
  ],
  [
    `className="absolute right-0 top-7 w-44 bg-[#F1F5FB] border border-[#CBD5E1]/80 rounded-xl shadow-2xl py-1.5 z-30 space-y-0.5"`,
    `className="absolute right-0 top-7 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1.5 z-30 space-y-0.5"`
  ],
  [
    `className="w-full text-left px-3.5 py-1.5 text-xs text-stone-200 hover:text-white hover:bg-[#2563EB]/10 flex items-center gap-2 font-medium"`,
    `className="w-full text-left px-3.5 py-1.5 text-xs text-[#202B40] hover:bg-[#EDF2FA] flex items-center gap-2 font-medium"`
  ],
  [
    `className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/20 flex items-center gap-2 font-medium"`,
    `className="w-full text-left px-3.5 py-1.5 text-xs text-[#299D70] hover:bg-[#299D70]/10 flex items-center gap-2 font-medium"`
  ],
  [
    `className="w-full text-left px-3.5 py-1.5 text-xs text-[#06B6D4] hover:text-amber-200 hover:bg-amber-600/20 flex items-center gap-2 font-medium"`,
    `className="w-full text-left px-3.5 py-1.5 text-xs text-[#D69B35] hover:bg-[#D69B35]/10 flex items-center gap-2 font-medium"`
  ],
  [
    `className="w-full text-left px-3.5 py-1.5 text-xs text-[#06B6D4] hover:text-orange-200 hover:bg-[#2563EB]/10 flex items-center gap-2 font-medium"`,
    `className="w-full text-left px-3.5 py-1.5 text-xs text-[#4169C1] hover:bg-[#EDF2FA] flex items-center gap-2 font-medium"`
  ],
  [
    `className="w-full text-left px-3.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 flex items-center gap-2 font-medium"`,
    `className="w-full text-left px-3.5 py-1.5 text-xs text-[#D95C65] hover:bg-[#D95C65]/10 flex items-center gap-2 font-medium"`
  ],
  [
    `className="text-base font-bold text-white mt-3 hover:text-[#06B6D4] cursor-pointer transition-colors leading-snug"`,
    `className="text-base font-bold text-[#202B40] mt-3 hover:text-[#4169C1] cursor-pointer transition-colors leading-snug"`
  ],
  [
    `className="text-xs text-[#06B6D4] font-medium mt-0.5"`,
    `className="text-xs text-[#4169C1] font-medium mt-0.5"`
  ],
  [
    `className="text-xs text-[#94A3B8] mt-1 line-clamp-2"`,
    `className="text-xs text-[#718096] mt-1 line-clamp-2"`
  ],
  [
    `className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-[#94A3B8] font-medium"`,
    `className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-[#718096] font-medium"`
  ],
  [
    `className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5FB] border border-[#E2E8F0]"`,
    `className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E2E8F0]"`
  ],
  [
    `className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB]/10 text-[#06B6D4] border border-[#DCE5F0]"`,
    `className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EDF2FA] text-[#4169C1] border border-[#4169C1]/30"`
  ],
  [
    `<strong className="text-white font-semibold">`,
    `<strong className="text-[#202B40] font-semibold">`
  ],
  [
    `className="text-[#64748B] text-[11px] ml-1 font-normal"`,
    `className="text-[#718096] text-[11px] ml-1 font-normal"`
  ],
  [
    `className="flex items-center justify-between text-[11px] text-[#64748B] pt-1"`,
    `className="flex items-center justify-between text-[11px] text-[#718096] pt-1"`
  ],
  [
    `className="text-[#94A3B8] font-mono"`,
    `className="text-[#718096] font-mono"`
  ],
  [
    `className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#2563EB] transition-all text-center shadow-sm flex items-center justify-center gap-1"`,
    `className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] transition-all text-center shadow-sm shadow-[#233B67]/20 flex items-center justify-center gap-1"`
  ],
  [
    `className="py-2 px-3 rounded-xl text-xs font-semibold text-[#06B6D4] bg-[#2563EB]/10 hover:bg-[#2563EB]/10 border border-[#DCE5F0] transition-all text-center flex items-center gap-1"`,
    `className="py-2 px-3 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all text-center flex items-center gap-1"`
  ]
];

for (const [from, to] of replacements) {
  code = code.replaceAll(from, to);
}

// Global text icon cleanups
code = code.replaceAll(`text-[#2563EB]`, `text-[#4169C1]`);
code = code.replaceAll(`text-emerald-400`, `text-[#299D70]`);
code = code.replaceAll(`text-[#94A3B8]`, `text-[#718096]`);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('TeacherTests.jsx redesigned successfully.');
