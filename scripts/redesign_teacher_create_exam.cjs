const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../Milestone 2/frontend/src/pages/TeacherCreateExam.jsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace outdated styling tokens:
// 1. Loading spinner
content = content.replace(
  '<div className="w-12 h-12 border-4 border-[#DCE5F0] border-t-orange-500 rounded-full animate-spin"></div>\n        <p className="text-sm text-[#94A3B8]">Loading examination workspace...</p>',
  '<div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>\n        <p className="text-sm text-[#718096]">Loading examination workspace...</p>'
);

// 2. Top header panel
const oldHeaderRegex = /<div className="glass-panel p-6 rounded-3xl border border-\[#E2E8F0\] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;

// Let's replace systematically section by section or use exact strings
console.log('Original length:', content.length);

// Let's check occurrences of specific glass-panel, glass-card, stone, amber, orange
let replacements = [
  // Top header panel
  [
    `className="glass-panel p-6 rounded-3xl border border-[#E2E8F0] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"`,
    `className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"`
  ],
  [
    `className="p-2.5 rounded-xl bg-[#F1F5FB] border border-[#E2E8F0] text-[#94A3B8] hover:text-white transition-colors"`,
    `className="p-2.5 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0] text-[#718096] hover:text-[#202B40] hover:bg-[#E2E8F0] transition-colors"`
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
    `<span className="text-xs text-[#64748B]">`,
    `<span className="text-xs text-[#718096]">`
  ],
  [
    `<h1 className="text-xl sm:text-2xl font-bold text-white mt-1">`,
    `<h1 className="text-xl sm:text-2xl font-bold text-[#202B40] mt-1">`
  ],
  [
    `className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#06B6D4] bg-[#2563EB]/10 hover:bg-[#2563EB]/10 border border-[#DCE5F0] transition-all flex items-center gap-1.5"`,
    `className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all flex items-center gap-1.5"`
  ],
  [
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"`,
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#299D70] hover:bg-[#20835C] shadow-sm shadow-[#299D70]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"`
  ],
  [
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-200 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 transition-all flex items-center gap-1.5 disabled:opacity-50"`,
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-[#D69B35] bg-[#D69B35]/10 hover:bg-[#D69B35]/20 border border-[#D69B35]/30 transition-all flex items-center gap-1.5 disabled:opacity-50"`
  ],
  [
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-orange-200 bg-[#2563EB] hover:bg-[#2563EB] transition-all flex items-center gap-1.5 disabled:opacity-50"`,
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4169C1] hover:bg-[#34559E] shadow-sm shadow-[#4169C1]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"`
  ],
  [
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#2563EB] shadow-lg shadow-blue-200 transition-all flex items-center gap-1.5 disabled:opacity-50"`,
    `className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"`
  ],
  // Alerts
  [
    `className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center justify-between gap-3"`,
    `className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center justify-between gap-3"`
  ],
  [
    `className="text-xs font-bold text-red-200 hover:text-white"`,
    `className="text-xs font-bold text-[#D95C65] hover:underline"`
  ],
  [
    `className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between gap-3"`,
    `className="p-4 rounded-xl bg-[#299D70]/10 border border-[#299D70]/30 text-[#299D70] text-sm flex items-center justify-between gap-3"`
  ],
  [
    `className="text-xs font-bold text-emerald-200 hover:text-white"`,
    `className="text-xs font-bold text-[#299D70] hover:underline"`
  ],
  // Tabs
  [
    `activeTab === 'details'
              ? 'border-[#DCE5F0] text-white bg-[#2563EB]/10 rounded-t-xl'
              : 'border-transparent text-[#94A3B8] hover:text-white hover:bg-[#F1F5FB]/40 rounded-t-xl'`,
    `activeTab === 'details'
              ? 'border-[#4169C1] text-[#233B67] bg-[#EDF2FA] rounded-t-xl'
              : 'border-transparent text-[#718096] hover:text-[#202B40] hover:bg-[#F5F7FC] rounded-t-xl'`
  ],
  [
    `<Sliders className="w-4 h-4 text-[#2563EB]" />`,
    `<Sliders className="w-4 h-4 text-[#4169C1]" />`
  ],
  [
    `activeTab === 'questions'
              ? 'border-[#DCE5F0] text-white bg-[#2563EB]/10 rounded-t-xl'
              : 'border-transparent text-[#94A3B8] hover:text-white hover:bg-[#F1F5FB]/40 rounded-t-xl'`,
    `activeTab === 'questions'
              ? 'border-[#4169C1] text-[#233B67] bg-[#EDF2FA] rounded-t-xl'
              : 'border-transparent text-[#718096] hover:text-[#202B40] hover:bg-[#F5F7FC] rounded-t-xl'`
  ],
  [
    `<HelpCircle className="w-4 h-4 text-[#2563EB]" />`,
    `<HelpCircle className="w-4 h-4 text-[#4169C1]" />`
  ],
  [
    `activeTab === 'students'
              ? 'border-[#DCE5F0] text-white bg-[#2563EB]/10 rounded-t-xl'
              : 'border-transparent text-[#94A3B8] hover:text-white hover:bg-[#F1F5FB]/40 rounded-t-xl'`,
    `activeTab === 'students'
              ? 'border-[#4169C1] text-[#233B67] bg-[#EDF2FA] rounded-t-xl'
              : 'border-transparent text-[#718096] hover:text-[#202B40] hover:bg-[#F5F7FC] rounded-t-xl'`
  ],
  [
    `<Users className="w-4 h-4 text-[#2563EB]" />`,
    `<Users className="w-4 h-4 text-[#4169C1]" />`
  ]
];

for (const [from, to] of replacements) {
  if (content.includes(from)) {
    content = content.replace(from, to);
  } else {
    console.warn('Could not find match for:', from.substring(0, 40));
  }
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Done initial substitutions.');
