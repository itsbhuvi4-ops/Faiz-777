import fs from 'fs';
import path from 'path';

console.log('=== FAIZ 777 VERIFICATION SUITE ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// 1. Read src/main.jsx
const mainPath = path.resolve('./src/main.jsx');
const mainContent = fs.readFileSync(mainPath, 'utf8');

// Check YouTube URL constant
const targetYt = 'https://youtube.com/@faiz777gaming-n8i?si=N9m_EyhmE0DztDAL';
assert(mainContent.includes(targetYt), `src/main.jsx contains exact YouTube URL: ${targetYt}`);

// Check WhatsApp Channel constant & button
const targetWa = 'https://chat.whatsapp.com/Ll7lo4R3C2d6PFGRIjLX4m';
assert(mainContent.includes(targetWa), `src/main.jsx contains exact WhatsApp Channel URL: ${targetWa}`);
assert(mainContent.includes('JOIN WHATSAPP CHANNEL'), 'src/main.jsx contains "JOIN WHATSAPP CHANNEL" button text');

// Check Tournament Date
const targetDate = '06.09.2026';
assert(mainContent.includes(targetDate), `src/main.jsx contains updated tournament date: ${targetDate}`);
assert(!mainContent.includes('05.09.2026'), 'src/main.jsx does NOT contain old date 05.09.2026');

// 2. Check Faiz-777-1/src/main.jsx if present
const sub1Path = path.resolve('./Faiz-777-1/src/main.jsx');
if (fs.existsSync(sub1Path)) {
  const sub1Content = fs.readFileSync(sub1Path, 'utf8');
  assert(sub1Content.includes(targetYt), `Faiz-777-1/src/main.jsx contains YouTube URL`);
  assert(sub1Content.includes(targetDate), `Faiz-777-1/src/main.jsx contains tournament date ${targetDate}`);
}

// 3. Check Faiz-777/src/main.jsx if present
const sub2Path = path.resolve('./Faiz-777/src/main.jsx');
if (fs.existsSync(sub2Path)) {
  const sub2Content = fs.readFileSync(sub2Path, 'utf8');
  assert(sub2Content.includes(targetYt), `Faiz-777/src/main.jsx contains YouTube URL`);
  assert(sub2Content.includes(targetDate), `Faiz-777/src/main.jsx contains tournament date ${targetDate}`);
}

console.log(`\nVerification Summary: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}
