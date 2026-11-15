const fs = require('fs');
const path = require('path');

function replaceInFile(relPath, replacements) {
  const fullPath = path.resolve(__dirname, '../Milestone 2/frontend/src', relPath);
  let code = fs.readFileSync(fullPath, 'utf8');
  for (const [from, to] of replacements) {
    code = code.replaceAll(from, to);
  }
  fs.writeFileSync(fullPath, code, 'utf8');
  console.log(`Updated ${relPath}`);
}

// 1. ProtectedRoute.jsx
replaceInFile('components/ProtectedRoute.jsx', [
  [
    `className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"`,
    `className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"`
  ],
  [
    `className="mt-4 text-sm text-stone-400 font-medium"`,
    `className="mt-4 text-sm text-[#718096] font-medium"`
  ]
]);

// 2. Login.jsx
replaceInFile('pages/Login.jsx', [
  [
    `? 'bg-amber-50 border border-amber-300 text-amber-800'`,
    `? 'bg-[#D69B35]/10 border border-[#D69B35]/30 text-[#D69B35]'`
  ],
  [
    `? 'text-amber-600'`,
    `? 'text-[#D69B35]'`
  ],
  [
    `text-amber-900`,
    `text-[#D69B35]`
  ]
]);

// 3. StudentDashboard.jsx
replaceInFile('pages/StudentDashboard.jsx', [
  [
    `className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center"`,
    `className="w-8 h-8 rounded-lg bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30 flex items-center justify-center"`
  ],
  [
    `? 'bg-amber-50 text-amber-800 border border-amber-200'`,
    `? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'`
  ]
]);

// 4. StudentExamReadiness.jsx
replaceInFile('pages/StudentExamReadiness.jsx', [
  [
    `bg-amber-400`,
    `bg-[#D69B35]`
  ],
  [
    `text-amber-300`,
    `text-[#D69B35]`
  ],
  [
    `border-amber-400/30`,
    `border-[#D69B35]/30`
  ]
]);

// 5. StudentMyTests.jsx
replaceInFile('pages/StudentMyTests.jsx', [
  [
    `? 'bg-amber-50 text-amber-800 border border-amber-200'`,
    `? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'`
  ],
  [
    `className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"`,
    `className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#D69B35] hover:bg-[#B88226] shadow-sm shadow-[#D69B35]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"`
  ],
  [
    `className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2"`,
    `className="p-3 rounded-xl bg-[#D69B35]/10 border border-[#D69B35]/30 text-[#D69B35] text-xs flex items-start gap-2"`
  ],
  [
    `text-amber-600`,
    `text-[#D69B35]`
  ]
]);

// 6. StudentRegister.jsx
replaceInFile('pages/StudentRegister.jsx', [
  [
    `bg-amber-50 border border-amber-300 text-amber-800`,
    `bg-[#D69B35]/10 border border-[#D69B35]/30 text-[#D69B35]`
  ],
  [
    `bg-amber-500`,
    `bg-[#D69B35]`
  ]
]);

// 7. TeacherDashboard.jsx
replaceInFile('pages/TeacherDashboard.jsx', [
  [
    `<div className="w-12 h-12 border-4 border-[#DCE5F0] border-t-orange-500 rounded-full animate-spin"></div>`,
    `<div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>`
  ]
]);

// 8. TeacherRegister.jsx
replaceInFile('pages/TeacherRegister.jsx', [
  [
    `bg-amber-50 border border-amber-300 text-amber-800`,
    `bg-[#D69B35]/10 border border-[#D69B35]/30 text-[#D69B35]`
  ],
  [
    `bg-amber-500`,
    `bg-[#D69B35]`
  ]
]);

console.log('All remaining color tokens cleaned successfully.');
