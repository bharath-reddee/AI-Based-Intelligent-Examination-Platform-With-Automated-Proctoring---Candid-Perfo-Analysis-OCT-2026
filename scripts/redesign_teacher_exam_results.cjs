const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../Milestone 2/frontend/src/pages/TeacherExamResults.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

const replacements = [
  // Loading
  [
    `<div className="w-12 h-12 border-4 border-[#DCE5F0] border-t-orange-500 rounded-full animate-spin"></div>`,
    `<div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>`
  ],
  [
    `<p className="text-sm text-[#94A3B8]">Loading examination results & candidate submissions...</p>`,
    `<p className="text-sm text-[#718096]">Loading examination results & candidate submissions...</p>`
  ],

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
    `className="p-2.5 rounded-xl bg-[#F1F5FB] border border-[#E2E8F0] text-[#94A3B8] hover:text-white transition-colors flex-shrink-0"`,
    `className="p-2.5 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0] text-[#718096] hover:text-[#202B40] hover:bg-[#E2E8F0] transition-colors flex-shrink-0"`
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
    `className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-2"`,
    `className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center gap-2"`
  ],

  // 4 KPI Stat Cards
  [
    `<div className="glass-card p-5 rounded-2xl">`,
    `<div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">`
  ],
  [
    `bg-amber-500/10 text-[#2563EB]`,
    `bg-[#D69B35]/10 text-[#D69B35]`
  ],
  [
    `bg-emerald-500/10 text-emerald-400`,
    `bg-[#299D70]/10 text-[#299D70]`
  ],
  [
    `bg-[#2563EB]/10 text-[#2563EB]`,
    `bg-[#EDF2FA] text-[#4169C1]`
  ],
  [
    `className="text-2xl font-bold text-white mt-3"`,
    `className="text-2xl font-bold text-[#202B40] mt-3"`
  ],
  [
    `className="text-[11px] text-[#06B6D4] mt-1"`,
    `className="text-[11px] text-[#718096] mt-1"`
  ],
  [
    `className="text-[11px] text-emerald-300 mt-1"`,
    `className="text-[11px] text-[#299D70] mt-1"`
  ],

  // Submissions Table Panel
  [
    `<div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-4">`,
    `<div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">`
  ],
  [
    `<h2 className="text-lg font-bold text-white">`,
    `<h2 className="text-lg font-bold text-[#202B40]">`
  ],
  [
    `className="w-full bg-stone-950/80 border border-[#CBD5E1] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#DCE5F0]"`,
    `className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"`
  ],
  [
    `<div className="text-center py-16 text-[#64748B] text-xs rounded-2xl bg-stone-950/40 border border-[#E2E8F0] space-y-2">\n            <Users className="w-8 h-8 text-stone-600 mx-auto" />`,
    `<div className="text-center py-16 text-[#718096] text-xs rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-2">\n            <Users className="w-8 h-8 text-[#718096]/50 mx-auto" />`
  ],
  [
    `<tr className="border-b border-[#E2E8F0] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">`,
    `<tr className="border-b border-[#E2E8F0] text-[11px] font-bold text-[#718096] uppercase tracking-wider bg-[#F5F7FC]">`
  ],
  [
    `<tr key={sub.attempt_id} className="hover:bg-[#E2E8F0]/30 transition-colors">`,
    `<tr key={sub.attempt_id} className="hover:bg-[#F5F7FC] transition-colors">`
  ],
  [
    `<div className="font-bold text-white text-xs">{sub.student_name}</div>`,
    `<div className="font-bold text-[#202B40] text-xs">{sub.student_name}</div>`
  ],
  [
    `<td className="py-3.5 px-4 font-mono text-[#94A3B8]">{sub.roll_number}</td>`,
    `<td className="py-3.5 px-4 font-mono text-[#4169C1] font-semibold">{sub.roll_number}</td>`
  ],
  [
    `<td className="py-3.5 px-4 font-semibold text-white">`,
    `<td className="py-3.5 px-4 font-semibold text-[#202B40]">`
  ],
  [
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"`,
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30"`
  ],
  [
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30"`,
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D95C65]/10 text-[#D95C65] border border-[#D95C65]/30"`
  ],
  [
    `<CheckCircle className="w-3 h-3 text-emerald-400" />`,
    `<CheckCircle className="w-3 h-3 text-[#299D70]" />`
  ],
  [
    `<XCircle className="w-3 h-3 text-red-400" />`,
    `<XCircle className="w-3 h-3 text-[#D95C65]" />`
  ],
  [
    `sub.tab_switch_count >= 3 ? 'text-[#2563EB] font-bold' : 'text-[#94A3B8]'`,
    `sub.tab_switch_count >= 3 ? 'text-[#D95C65] font-bold' : 'text-[#718096]'`
  ],
  [
    `className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-[#06B6D4] border border-amber-500/30"`,
    `className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30"`
  ],
  [
    `<AlertTriangle className="w-3 h-3 text-[#2563EB]" />`,
    `<AlertTriangle className="w-3 h-3 text-[#D69B35]" />`
  ],
  [
    `<span className="text-emerald-400 text-[11px] flex items-center gap-1">`,
    `<span className="text-[#299D70] text-[11px] flex items-center gap-1">`
  ],
  [
    `className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#06B6D4] bg-[#2563EB]/10 hover:bg-[#2563EB]/10 border border-[#DCE5F0] transition-all inline-flex items-center gap-1.5"`,
    `className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all inline-flex items-center gap-1.5"`
  ],

  // Detail Modal
  [
    `className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"`,
    `className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm overflow-y-auto"`
  ],
  [
    `className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#CBD5E1] w-full max-w-4xl space-y-6 my-8 shadow-2xl"`,
    `className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] w-full max-w-4xl space-y-6 my-8 shadow-2xl"`
  ],
  [
    `<h3 className="text-lg font-bold text-white flex items-center gap-2">\n                  <Award className="w-5 h-5 text-[#2563EB]" />`,
    `<h3 className="text-lg font-bold text-[#202B40] flex items-center gap-2">\n                  <Award className="w-5 h-5 text-[#4169C1]" />`
  ],
  [
    `className="text-[#64748B] hover:text-white p-1 rounded-lg"`,
    `className="text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA] p-1.5 rounded-lg transition-colors"`
  ],
  [
    `<div className="w-8 h-8 border-3 border-[#DCE5F0] border-t-orange-500 rounded-full animate-spin"></div>`,
    `<div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>`
  ],
  [
    `className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-stone-950/80 border border-[#E2E8F0]"`,
    `className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0]"`
  ],
  [
    `<div className="text-lg font-bold text-white mt-0.5">`,
    `<div className="text-lg font-bold text-[#202B40] mt-0.5">`
  ],
  [
    `className="text-xs font-bold text-emerald-400 capitalize mt-1"`,
    `className="text-xs font-bold text-[#299D70] capitalize mt-1"`
  ],
  [
    `className="text-xs font-mono font-bold text-[#2563EB] mt-1"`,
    `className="text-xs font-mono font-bold text-[#4169C1] mt-1"`
  ],
  [
    `className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider flex items-center gap-1.5"`,
    `className="text-xs font-bold text-[#4169C1] uppercase tracking-wider flex items-center gap-1.5"`
  ],
  [
    `className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between text-stone-200"`,
    `className="p-2.5 rounded-xl bg-[#D69B35]/10 border border-[#D69B35]/30 text-xs flex items-center justify-between text-[#202B40]"`
  ],
  [
    `<strong className="text-[#06B6D4] font-semibold">`,
    `<strong className="text-[#202B40] font-semibold">`
  ],
  [
    `className="p-5 rounded-2xl bg-[#F1F5FB]/60 border border-[#E2E8F0] space-y-3"`,
    `className="p-5 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-3"`
  ],
  [
    `<span className="text-xs font-bold text-white">`,
    `<span className="text-xs font-bold text-[#202B40]">`
  ],
  [
    `className="w-16 bg-stone-950 border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs text-white font-bold text-center"`,
    `className="w-16 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs text-[#202B40] font-bold text-center focus:border-[#4169C1]"`
  ],
  [
    `className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#2563EB] transition-all flex items-center gap-1"`,
    `className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-1"`
  ],
  [
    `className="text-xs text-stone-200 font-medium leading-relaxed"`,
    `className="text-xs text-[#202B40] font-medium leading-relaxed"`
  ],
  [
    `className="p-3 rounded-xl bg-stone-950/80 border border-[#E2E8F0] text-xs space-y-1"`,
    `className="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs space-y-1"`
  ],
  [
    `className="text-white font-mono"`,
    `className="text-[#202B40] font-mono"`
  ],
  [
    `className="text-stone-500 italic"`,
    `className="text-[#718096] italic"`
  ],
  [
    `className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1"`,
    `className="p-3 rounded-xl bg-[#299D70]/10 border border-[#299D70]/30 text-xs space-y-1"`
  ],
  [
    `className="text-[10px] text-emerald-400 uppercase font-semibold"`,
    `className="text-[10px] text-[#299D70] uppercase font-semibold"`
  ],
  [
    `className="text-emerald-200 font-mono"`,
    `className="text-[#299D70] font-mono font-semibold"`
  ],
  [
    `className="w-full bg-stone-950 border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#DCE5F0]"`,
    `className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1]"`
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
console.log('TeacherExamResults.jsx redesigned successfully.');
