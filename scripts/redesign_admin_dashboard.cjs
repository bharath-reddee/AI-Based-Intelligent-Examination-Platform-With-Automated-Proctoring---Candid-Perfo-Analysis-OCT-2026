const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../Milestone 2/frontend/src/pages/AdminDashboard.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

const replacements = [
  // Skeletons
  [
    `className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#DCE5F0] shadow-2xl relative overflow-hidden bg-white/80 h-36 flex items-center justify-between"`,
    `className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden h-36 flex items-center justify-between"`
  ],
  [
    `className="glass-panel p-5 rounded-2xl border border-[#DCE5F0] bg-white/80 h-28 space-y-3"`,
    `className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm h-28 space-y-3"`
  ],
  [
    `className="glass-panel p-6 rounded-3xl border border-[#DCE5F0] bg-white/80 h-80 space-y-4"`,
    `className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm h-80 space-y-4"`
  ],
  [
    `rounded-2xl bg-[#F1F5FB]/60`,
    `rounded-2xl bg-[#F5F7FC]`
  ],

  // Top Hero Banner
  [
    `className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#DCE5F0] shadow-2xl relative overflow-hidden"`,
    `className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden"`
  ],
  [
    `<div className="absolute top-0 right-0 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>\n        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none"></div>`,
    `<div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>\n        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none"></div>`
  ],
  [
    `from-orange-600 via-orange-600 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200 shrink-0`,
    `from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-[#233B67]/20 shrink-0`
  ],
  [
    `<h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">`,
    `<h1 className="text-2xl sm:text-3xl font-extrabold text-[#202B40] tracking-tight">`
  ],
  [
    `className="text-[#2563EB] font-mono font-medium"`,
    `className="text-[#4169C1] font-mono font-medium"`
  ],
  [
    `className="flex items-center gap-2 bg-[#E2E8F0]/80 hover:bg-[#CBD5E1]/80 text-[#94A3B8] hover:text-white px-3.5 py-2.5 rounded-2xl border border-[#CBD5E1] text-xs font-medium transition-all cursor-pointer disabled:opacity-50"`,
    `className="flex items-center gap-2 bg-[#EDF2FA] hover:bg-[#E2E8F0] text-[#718096] hover:text-[#202B40] px-3.5 py-2.5 rounded-2xl border border-[#E2E8F0] text-xs font-medium transition-all cursor-pointer disabled:opacity-50"`
  ],

  // 4 Metric Cards
  [
    `className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#F1F5FB]/60 to-[#F1F5FB]/80 cursor-pointer hover:border-amber-400/50 transition-all group"`,
    `className="bg-white p-5 rounded-2xl border border-[#D69B35]/30 shadow-sm cursor-pointer hover:border-[#D69B35] transition-all group"`
  ],
  [
    `className="text-xs font-semibold text-[#06B6D4] uppercase tracking-wider"`,
    `className="text-xs font-semibold text-[#D69B35] uppercase tracking-wider"`
  ],
  [
    `className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#06B6D4] flex items-center justify-center group-hover:scale-110 transition-transform"`,
    `className="w-9 h-9 rounded-xl bg-[#D69B35]/10 text-[#D69B35] flex items-center justify-center group-hover:scale-110 transition-transform"`
  ],
  [
    `className="text-3xl font-extrabold text-[#06B6D4] mt-2.5"`,
    `className="text-3xl font-extrabold text-[#D69B35] mt-2.5"`
  ],
  [
    `className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-amber-500/20"`,
    `className="flex items-center justify-between text-xs text-[#718096] mt-2 pt-2 border-t border-[#E2E8F0]"`
  ],
  [
    `className="glass-card p-5 rounded-2xl border border-[#DCE5F0]"`,
    `className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm"`
  ],
  [
    `className="text-3xl font-extrabold text-white mt-2.5"`,
    `className="text-3xl font-extrabold text-[#202B40] mt-2.5"`
  ],
  [
    `className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center"`,
    `className="w-9 h-9 rounded-xl bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center"`
  ],
  [
    `className="glass-card p-5 rounded-2xl border border-emerald-500/20"`,
    `className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm"`
  ],
  [
    `className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center"`,
    `className="w-9 h-9 rounded-xl bg-[#299D70]/10 text-[#299D70] flex items-center justify-center"`
  ],
  [
    `className="text-emerald-400 font-medium"`,
    `className="text-[#299D70] font-medium"`
  ],
  [
    `className="text-2xl font-bold text-white mt-2.5 flex items-center gap-2"`,
    `className="text-2xl font-bold text-[#202B40] mt-2.5 flex items-center gap-2"`
  ],
  [
    `className="text-rose-400"`,
    `className="text-[#D95C65]"`
  ],

  // Tab Header Bar
  [
    `className="flex items-center gap-2 bg-[#F1F5FB]/80 p-1.5 rounded-2xl border border-[#E2E8F0] self-start"`,
    `className="flex items-center gap-2 bg-[#F5F7FC] p-1.5 rounded-2xl border border-[#E2E8F0] self-start"`
  ],
  [
    `activeTab === 'queue'\n                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-lg shadow-amber-500/25 font-bold'\n                : 'text-[#64748B] hover:text-white'`,
    `activeTab === 'queue'\n                ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20 font-bold'\n                : 'text-[#718096] hover:text-[#202B40]'`
  ],
  [
    `className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F1F5FB] text-[#06B6D4] ml-1"`,
    `className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EDF2FA] text-[#4169C1] ml-1"`
  ],
  [
    `activeTab === 'directory'\n                ? 'bg-gradient-to-r from-orange-600 via-orange-600 to-amber-600 text-white shadow-lg shadow-blue-200 font-bold'\n                : 'text-[#64748B] hover:text-white'`,
    `activeTab === 'directory'\n                ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20 font-bold'\n                : 'text-[#718096] hover:text-[#202B40]'`
  ],
  [
    `className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E2E8F0] text-[#94A3B8] ml-1"`,
    `className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EDF2FA] text-[#718096] ml-1"`
  ],

  // Queue Tab
  [
    `<div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-6">`,
    `<div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">`
  ],
  [
    `<h2 className="text-xl font-bold text-white flex items-center gap-2">`,
    `<h2 className="text-xl font-bold text-[#202B40] flex items-center gap-2">`
  ],
  [
    `className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-[#06B6D4] border border-amber-500/30"`,
    `className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30"`
  ],
  [
    `className="py-14 text-center rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F1F5FB]/30"`,
    `className="py-14 text-center rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F5F7FC]"`
  ],
  [
    `<h3 className="text-base font-bold text-white">All Caught Up!</h3>`,
    `<h3 className="text-base font-bold text-[#202B40]">All Caught Up!</h3>`
  ],
  [
    `<tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">`,
    `<tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider bg-[#F5F7FC]">`
  ],
  [
    `<tr key={candidate.id || idx} className="hover:bg-[#E2E8F0]/40 transition-colors">`,
    `<tr key={candidate.id || idx} className="hover:bg-[#F5F7FC] transition-colors">`
  ],
  [
    `<div className="font-semibold text-white">{candidate.fullName}</div>`,
    `<div className="font-semibold text-[#202B40]">{candidate.fullName}</div>`
  ],
  [
    `candidate.role === 'teacher'\n                              ? 'bg-[#2563EB]/10 text-[#06B6D4] border border-[#DCE5F0]'\n                              : 'bg-[#2563EB]/10 text-[#06B6D4] border border-[#DCE5F0]'`,
    `candidate.role === 'teacher'\n                              ? 'bg-[#EDF2FA] text-[#4169C1] border border-[#4169C1]/30'\n                              : 'bg-[#F5F7FC] text-[#233B67] border border-[#E2E8F0]'`
  ],
  [
    `<div className="flex items-center gap-1.5 text-xs text-stone-200 font-medium">`,
    `<div className="flex items-center gap-1.5 text-xs text-[#202B40] font-medium">`
  ],
  [
    `className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-[#06B6D4] border border-amber-500/30"`,
    `className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30"`
  ],
  [
    `bg-amber-400`,
    `bg-[#D69B35]`
  ],
  [
    `className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer disabled:opacity-50"`,
    `className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#299D70] hover:bg-[#20835C] text-white text-xs font-semibold transition-all shadow-sm shadow-[#299D70]/20 active:scale-95 cursor-pointer disabled:opacity-50"`
  ],
  [
    `className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"`,
    `className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D95C65]/10 hover:bg-[#D95C65]/20 text-[#D95C65] border border-[#D95C65]/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"`
  ],

  // Directory Tab
  [
    `<h2 className="text-xl font-bold text-white">Platform Users Registry</h2>`,
    `<h2 className="text-xl font-bold text-[#202B40]">Platform Users Registry</h2>`
  ],
  [
    `className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F1F5FB]/90 border border-[#E2E8F0] text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-[#DCE5F0] transition-colors"`,
    `className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5F7FC] border border-[#E2E8F0] text-xs text-[#202B40] placeholder:text-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white transition-colors"`
  ],
  [
    `className="flex rounded-xl bg-[#F1F5FB]/90 p-1 border border-[#E2E8F0]"`,
    `className="flex rounded-xl bg-[#F5F7FC] p-1 border border-[#E2E8F0]"`
  ],
  [
    `roleFilter === r\n                        ? 'bg-[#2563EB] text-white font-semibold shadow'\n                        : 'text-[#64748B] hover:text-white'`,
    `roleFilter === r\n                        ? 'bg-[#233B67] text-white font-semibold shadow-sm'\n                        : 'text-[#718096] hover:text-[#202B40]'`
  ],
  [
    `statusFilter === s\n                        ? 'bg-[#2563EB] text-white font-semibold shadow'\n                        : 'text-[#64748B] hover:text-white'`,
    `statusFilter === s\n                        ? 'bg-[#233B67] text-white font-semibold shadow-sm'\n                        : 'text-[#718096] hover:text-[#202B40]'`
  ],
  [
    `<td colSpan="7" className="py-10 text-center text-stone-500 text-xs">`,
    `<td colSpan="7" className="py-10 text-center text-[#718096] text-xs">`
  ],
  [
    `<tr key={candidate.id || idx} className="hover:bg-[#E2E8F0]/30 transition-colors">`,
    `<tr key={candidate.id || idx} className="hover:bg-[#F5F7FC] transition-colors">`
  ],
  [
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"`,
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30"`
  ],
  [
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-[#06B6D4] border border-amber-500/30"`,
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30"`
  ],
  [
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"`,
    `className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D95C65]/10 text-[#D95C65] border border-[#D95C65]/30"`
  ],
  // Active pill
  [
    `candidate.is_active\n                              ? 'bg-amber-500/10 text-[#06B6D4] border border-amber-500/20'\n                              : 'bg-[#E2E8F0] text-[#64748B] border border-[#CBD5E1]'`,
    `candidate.is_active\n                              ? 'bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30'\n                              : 'bg-[#EDF2FA] text-[#718096] border border-[#E2E8F0]'`
  ],
  [
    `candidate.is_active ? 'bg-amber-400' : 'bg-stone-500'`,
    `candidate.is_active ? 'bg-[#299D70]' : 'bg-[#718096]'`
  ],
  // Actions
  [
    `className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"`,
    `className="p-1.5 rounded-lg bg-[#299D70]/10 hover:bg-[#299D70]/20 text-[#299D70] border border-[#299D70]/30 transition-all cursor-pointer disabled:opacity-50"`
  ],
  [
    `className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"`,
    `className="p-1.5 rounded-lg bg-[#D95C65]/10 hover:bg-[#D95C65]/20 text-[#D95C65] border border-[#D95C65]/30 transition-all cursor-pointer disabled:opacity-50"`
  ],
  [
    `candidate.is_active\n                                ? 'bg-[#E2E8F0] hover:bg-rose-600/20 text-[#64748B] hover:text-rose-300 border-[#CBD5E1] hover:border-rose-500/30'\n                                : 'bg-amber-600/20 hover:bg-amber-600/30 text-[#06B6D4] border-amber-500/30'`,
    `candidate.is_active\n                                ? 'bg-[#EDF2FA] hover:bg-[#D95C65]/10 text-[#718096] hover:text-[#D95C65] border-[#E2E8F0] hover:border-[#D95C65]/30'\n                                : 'bg-[#4169C1]/10 hover:bg-[#4169C1]/20 text-[#4169C1] border border-[#4169C1]/30'`
  ],

  // Reject Modal
  [
    `className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"`,
    `className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm animate-fade-in"`
  ],
  [
    `className="relative w-full max-w-lg login-glass-card rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-500/30"`,
    `className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E2E8F0]"`
  ],
  [
    `border-b border-white/10`,
    `border-b border-[#E2E8F0]`
  ],
  [
    `<h3 id="reject-dialog-title" className="text-lg font-bold text-white">`,
    `<h3 id="reject-dialog-title" className="text-lg font-bold text-[#202B40]">`
  ],
  [
    `className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center"`,
    `className="w-10 h-10 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] flex items-center justify-center"`
  ],
  [
    `className="text-[#64748B] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"`,
    `className="text-[#718096] hover:text-[#202B40] p-1 rounded-lg hover:bg-[#EDF2FA] transition-colors cursor-pointer"`
  ],
  [
    `className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs"`,
    `className="my-5 p-4 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-2 text-xs"`
  ],
  [
    `className="font-semibold text-white"`,
    `className="font-semibold text-[#202B40]"`
  ],
  [
    `className="font-mono text-stone-200"`,
    `className="font-mono text-[#4169C1] font-semibold"`
  ],
  [
    `className="text-stone-200"`,
    `className="text-[#202B40]"`
  ],
  [
    `className="block text-xs font-semibold text-stone-200 mb-1.5"`,
    `className="block text-xs font-semibold text-[#202B40] mb-1.5"`
  ],
  [
    `className="w-full p-3.5 rounded-2xl login-glass-input text-white text-xs placeholder:text-stone-500 focus:border-rose-400 focus:ring-rose-500/20 resize-none"`,
    `className="w-full p-3.5 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] text-[#202B40] text-xs placeholder:text-[#718096]/60 focus:border-[#D95C65] focus:outline-none focus:ring-1 focus:ring-[#D95C65]/20 resize-none"`
  ],
  [
    `border-t border-white/10`,
    `border-t border-[#E2E8F0]`
  ],
  [
    `className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"`,
    `className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"`
  ],
  [
    `className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"`,
    `className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#D95C65] hover:bg-[#C24851] shadow-sm shadow-[#D95C65]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"`
  ]
];

for (const [from, to] of replacements) {
  code = code.replaceAll(from, to);
}

// Global text icon cleanups
code = code.replaceAll(`text-[#2563EB]`, `text-[#4169C1]`);
code = code.replaceAll(`text-[#94A3B8]`, `text-[#718096]`);
code = code.replaceAll(`text-[#64748B]`, `text-[#718096]`);
code = code.replaceAll(`text-[#06B6D4]`, `text-[#4169C1]`);
code = code.replaceAll(`text-emerald-400`, `text-[#299D70]`);
code = code.replaceAll(`text-stone-500`, `text-[#718096]`);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('AdminDashboard.jsx redesigned successfully.');
