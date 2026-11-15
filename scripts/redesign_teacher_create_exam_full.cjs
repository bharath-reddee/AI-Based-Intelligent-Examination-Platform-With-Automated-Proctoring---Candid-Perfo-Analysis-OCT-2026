const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../Milestone 2/frontend/src/pages/TeacherCreateExam.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

const globalReplacements = [
  // Labels and text
  [`text-stone-200`, `text-[#202B40]`],
  [`text-stone-300`, `text-[#202B40]`],
  [`text-stone-400`, `text-[#718096]`],
  [`text-stone-500`, `text-[#718096]/60`],
  [`text-stone-600`, `text-[#718096]`],
  [`border-stone-600`, `border-[#E2E8F0]`],
  [`border-stone-700`, `border-[#E2E8F0]`],
  [`border-stone-800`, `border-[#E2E8F0]`],
  [`bg-stone-950/80`, `bg-[#F5F7FC]`],
  [`bg-stone-950/70`, `bg-[#F5F7FC]`],
  [`bg-stone-950/40`, `bg-[#F5F7FC]`],
  [`bg-stone-950`, `bg-[#F5F7FC]`],
  [`bg-stone-900`, `bg-[#F5F7FC]`],

  // Colors
  [`text-[#94A3B8]`, `text-[#718096]`],
  [`text-[#64748B]`, `text-[#718096]`],
  [`border-[#CBD5E1]`, `border-[#E2E8F0]`],
  [`focus:border-[#DCE5F0]`, `focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20`],
  [`border-[#DCE5F0]`, `border-[#4169C1]/30`],
  [`bg-[#F1F5FB]`, `bg-[#EDF2FA]`],
  [`bg-[#2563EB]`, `bg-[#233B67]`],
  [`hover:bg-[#2563EB]`, `hover:bg-[#1C2F52]`],
  [`text-[#2563EB]`, `text-[#4169C1]`],
  [`text-[#06B6D4]`, `text-[#4169C1]`],
  [`shadow-blue-200`, `shadow-[#233B67]/20`],
  [`text-orange-200`, `text-[#4169C1]`],
  [`text-orange-400`, `text-[#35A6A0]`],
  [`text-orange-500`, `text-[#35A6A0]`],
  [`border-orange-500`, `border-[#4169C1]`],
  [`border-t-orange-500`, `border-t-[#233B67]`],
  [`text-amber-200`, `text-[#D69B35]`],
  [`text-amber-300`, `text-[#D69B35]`],
  [`text-amber-400`, `text-[#D69B35]`],
  [`bg-amber-600/30`, `bg-[#D69B35]/15`],
  [`hover:bg-amber-600/50`, `hover:bg-[#D69B35]/25`],
  [`border-amber-500/40`, `border-[#D69B35]/30`],
  [`border-amber-500/30`, `border-[#D69B35]/30`],
  [`bg-amber-500/15`, `bg-[#D69B35]/10`],
  [`bg-amber-500/10`, `bg-[#D69B35]/10`],
  [`text-emerald-400`, `text-[#299D70]`],
  [`text-emerald-300`, `text-[#299D70]`],
  [`text-emerald-200`, `text-[#299D70]`],
  [`bg-emerald-600`, `bg-[#299D70]`],
  [`hover:bg-emerald-500`, `hover:bg-[#20835C]`],
  [`border-emerald-500/30`, `border-[#299D70]/30`],
  [`bg-emerald-500/15`, `bg-[#299D70]/10`],
  [`bg-emerald-500/10`, `bg-[#299D70]/10`],
  [`text-red-400`, `text-[#D95C65]`],
  [`text-red-300`, `text-[#D95C65]`],
  [`text-red-200`, `text-[#D95C65]`],
  [`border-red-500/30`, `border-[#D95C65]/30`],
  [`border-red-500/20`, `border-[#D95C65]/20`],
  [`bg-red-500/15`, `bg-[#D95C65]/10`],
  [`bg-red-500/10`, `bg-[#D95C65]/10`],
  [`glass-panel`, `bg-white shadow-sm`],
  [`glass-card`, `bg-[#F5F7FC] border border-[#E2E8F0]`]
];

for (const [from, to] of globalReplacements) {
  code = code.replaceAll(from, to);
}

// Clean up input text color inside inputs/textareas/selects
code = code.replaceAll('text-white placeholder-[#64748B]', 'text-[#202B40] placeholder-[#718096]/60');
code = code.replaceAll('text-white placeholder-[#718096]/60', 'text-[#202B40] placeholder-[#718096]/60');
code = code.replaceAll('text-white focus:outline-none', 'text-[#202B40] focus:outline-none');
code = code.replaceAll('text-white font-mono', 'text-[#202B40] font-mono');
code = code.replaceAll('hover:text-white', 'hover:text-[#202B40]');

// Backdrop cleanups
code = code.replaceAll('bg-black/80 backdrop-blur-md', 'bg-[#202B40]/60 backdrop-blur-sm');

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Finished global replacements with replaceAll.');
