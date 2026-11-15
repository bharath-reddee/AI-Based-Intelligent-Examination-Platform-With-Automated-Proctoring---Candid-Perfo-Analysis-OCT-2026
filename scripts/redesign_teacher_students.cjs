const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../Milestone 2/frontend/src/pages/TeacherStudents.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

const replacements = [
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

  // Search Filter Bar
  [
    `className="glass-panel p-5 rounded-2xl border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4"`,
    `className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4"`
  ],
  [
    `className="w-full bg-stone-950/80 border border-[#CBD5E1] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#DCE5F0]"`,
    `className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"`
  ],
  [
    `className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F1F5FB] border border-[#E2E8F0] font-medium"`,
    `className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDF2FA] border border-[#E2E8F0] font-medium"`
  ],
  [
    `<strong className="text-white">{filteredStudents.length}</strong>`,
    `<strong className="text-[#202B40]">{filteredStudents.length}</strong>`
  ],

  // Loading & Empty States
  [
    `<div className="w-10 h-10 border-4 border-[#DCE5F0] border-t-orange-500 rounded-full animate-spin"></div>`,
    `<div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>`
  ],
  [
    `<p className="text-xs text-[#94A3B8]">Loading approved candidate accounts...</p>`,
    `<p className="text-xs text-[#718096]">Loading approved candidate accounts...</p>`
  ],
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

  // Student Cards
  [
    `className="glass-card p-5 rounded-2xl border border-[#E2E8F0]/90 hover:border-[#DCE5F0] transition-all flex flex-col justify-between space-y-4"`,
    `className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:border-[#4169C1]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"`
  ],
  [
    `className="w-11 h-11 rounded-xl bg-[#2563EB]/10 border border-[#DCE5F0] text-[#06B6D4] flex items-center justify-center font-bold text-sm"`,
    `className="w-11 h-11 rounded-xl bg-[#EDF2FA] border border-[#4169C1]/30 text-[#4169C1] flex items-center justify-center font-bold text-sm"`
  ],
  [
    `<h3 className="text-sm font-bold text-white leading-tight">`,
    `<h3 className="text-sm font-bold text-[#202B40] leading-tight">`
  ],
  [
    `text-emerald-400 font-medium`,
    `text-[#299D70] font-medium`
  ],
  [
    `text-emerald-400`,
    `text-[#299D70]`
  ],
  [
    `text-stone-200`,
    `text-[#202B40]`
  ],
  [
    `className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#06B6D4] bg-[#2563EB]/10 hover:bg-[#2563EB]/10 border border-[#DCE5F0] transition-all text-center"`,
    `className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all text-center"`
  ]
];

for (const [from, to] of replacements) {
  code = code.replaceAll(from, to);
}

// Global text icon cleanups
code = code.replaceAll(`text-[#2563EB]`, `text-[#4169C1]`);
code = code.replaceAll(`text-[#94A3B8]`, `text-[#718096]`);
code = code.replaceAll(`text-[#64748B]`, `text-[#718096]`);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('TeacherStudents.jsx redesigned successfully.');
