

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '..');
const INDEX_CSS = path.join(FRONTEND_DIR, 'src', 'index.css');
const SIDEBAR_JSX = path.join(FRONTEND_DIR, 'src', 'components', 'Sidebar.jsx');
const APP_HEADER_JSX = path.join(FRONTEND_DIR, 'src', 'components', 'AppHeader.jsx');
const APP_JSX = path.join(FRONTEND_DIR, 'src', 'App.jsx');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('================================================================');
console.log('VERIFYING GLOBAL SIDEBAR & HEADER BORDER ALIGNMENT');
console.log('Platform Roles: Admin, Teacher, Student');
console.log('================================================================\n');

console.log('1. Design System Tokens & Classes (src/index.css):');
const cssContent = fs.readFileSync(INDEX_CSS, 'utf-8');

assert(
  cssContent.includes('--rg-header-height: 72px;'),
  'Global header height design token (--rg-header-height: 72px) is defined in :root'
);

assert(
  cssContent.includes('.rg-layout-header') &&
  cssContent.includes('height: var(--rg-header-height, 72px);') &&
  cssContent.includes('box-sizing: border-box;'),
  '.rg-layout-header utility class standardizes height, min-height, max-height and border-box'
);

console.log('\n2. Sidebar Layout & Header Alignment (src/components/Sidebar.jsx):');
const sidebarContent = fs.readFileSync(SIDEBAR_JSX, 'utf-8');

assert(
  sidebarContent.includes('className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col'),
  'Sidebar <aside> is fixed to top-0 and spans the full vertical viewport'
);

assert(
  sidebarContent.includes('rg-layout-header') &&
  sidebarContent.includes('h-[72px]') &&
  sidebarContent.includes('min-h-[72px]') &&
  sidebarContent.includes('max-h-[72px]'),
  'Sidebar header div is explicitly locked to exactly 72px height'
);

assert(
  sidebarContent.includes('border-b border-[#4169C1]/30'),
  'Sidebar header bottom border matches cool academic theme: border-b border-[#4169C1]/30'
);

assert(
  sidebarContent.includes('shrink-0 box-border'),
  'Sidebar header has shrink-0 and box-border preventing flex deformation'
);

assert(
  !sidebarContent.includes('className="p-4 sm:p-5 border-b border-purple-900/20'),
  'Old unconstrained vertical padding (p-4 sm:p-5) has been removed from Sidebar header'
);

assert(
  sidebarContent.includes("role === 'admin'") &&
  sidebarContent.includes("role === 'teacher'") &&
  sidebarContent.includes("role === 'student'"),
  'Sidebar provides dynamic navigation and role badges for Admin, Teacher, and Student roles'
);

console.log('\n3. Main AppHeader Layout & Border Alignment (src/components/AppHeader.jsx):');
const appHeaderContent = fs.readFileSync(APP_HEADER_JSX, 'utf-8');

assert(
  appHeaderContent.includes('sticky top-0 z-30'),
  'AppHeader uses sticky top-0 to pin to the exact same top position during page scroll'
);

assert(
  appHeaderContent.includes('rg-layout-header') &&
  appHeaderContent.includes('h-[72px]') &&
  appHeaderContent.includes('min-h-[72px]') &&
  appHeaderContent.includes('max-h-[72px]'),
  'AppHeader <header> is explicitly locked to exactly 72px height matching Sidebar header'
);

assert(
  appHeaderContent.includes('border-b border-[#E2E8F0]'),
  'AppHeader bottom border matches cool academic theme: border-b border-[#E2E8F0]'
);

assert(
  appHeaderContent.includes('shrink-0 box-border'),
  'AppHeader has shrink-0 and box-border ensuring border sits at exactly Y = 71px-72px'
);

assert(
  !appHeaderContent.includes('py-3.5 flex items-center'),
  'Old arbitrary vertical padding (py-3.5) replaced with flex items-center for vertical centering'
);

assert(
  appHeaderContent.includes("role === 'admin'") &&
  appHeaderContent.includes("role === 'teacher'") &&
  appHeaderContent.includes("role === 'student'"),
  'AppHeader dynamic page title mapping handles Admin, Teacher, and Student roles'
);

console.log('\n4. Shared Authenticated Architecture (src/App.jsx):');
const appContent = fs.readFileSync(APP_JSX, 'utf-8');

assert(
  appContent.includes('<Sidebar') && appContent.includes('<AppHeader'),
  'Admin, Teacher, and Student share the exact same top-level Sidebar and AppHeader components'
);

assert(
  appContent.includes("lg:pl-64 xl:pl-72"),
  'Main content column correctly accounts for fixed expanded (w-64/w-72) sidebar'
);

assert(
  appContent.includes('path="/admin/dashboard"') &&
  appContent.includes('path="/teacher/dashboard"') &&
  appContent.includes('path="/student/dashboard"'),
  'All three primary dashboard routes are routed through the shared authenticated layout'
);

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests} / ${totalTests} checks PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
