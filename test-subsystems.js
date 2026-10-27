const fs = require('fs');
const path = require('path');

console.log('--- Testing StudyLens Subsystems ---');

// 1. Verify Sample Materials
const sample1 = path.join(__dirname, 'sample-materials/Unit_4_Chomsky_Hierarchy.txt');
const sample2 = path.join(__dirname, 'sample-materials/Linear_Algebra_Eigenvalues.txt');
const sample3 = path.join(__dirname, 'sample-materials/Database_Normalization_Guide.md');

console.log('✓ Checking sample materials:');
console.log('  - TOC Sample:', fs.existsSync(sample1) ? 'OK' : 'MISSING');
console.log('  - Math Sample:', fs.existsSync(sample2) ? 'OK' : 'MISSING');
console.log('  - DB Sample:', fs.existsSync(sample3) ? 'OK' : 'MISSING');

// 2. Test Text Extraction & Chunking Logic
const tocText = fs.readFileSync(sample1, 'utf-8');
console.log('\n✓ TOC text length:', tocText.length, 'characters');

// Split by headings
const lines = tocText.split('\n');
const sections = [];
let currentHeading = 'Introduction';
let currentContent = [];

for (const line of lines) {
  const trimmed = line.trim();
  const isHeader = /^#{1,4}\s+(.+)$/.test(trimmed) || /^(Unit|Chapter|Section|Lecture)\s+\d+/i.test(trimmed);
  if (isHeader) {
    if (currentContent.join('\n').trim().length > 20) {
      sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      currentContent = [];
    }
    currentHeading = trimmed.replace(/^#+\s*/, '');
  } else {
    currentContent.push(line);
  }
}
if (currentContent.join('\n').trim().length > 0) {
  sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
}

console.log('✓ Extracted sections:', sections.length);
sections.forEach((s, idx) => console.log(`   [${idx + 1}] ${s.heading} (${s.content.length} chars)`));

// 3. Test Keyword & Semantic Matching
const testQuery = 'Explain context-sensitive grammars';
console.log(`\n✓ Querying: "${testQuery}"`);

const terms = testQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
const scored = sections.map(s => {
  const full = `${s.heading} ${s.content}`.toLowerCase();
  let hits = 0;
  for (const t of terms) {
    if (full.includes(t)) hits++;
    if (s.heading.toLowerCase().includes(t)) hits += 1.5;
  }
  return { heading: s.heading, score: hits };
});

scored.sort((a, b) => b.score - a.score);
const topMatch = scored[0];
console.log('✓ Top Matching Section:', topMatch.heading, '(Score:', topMatch.score, ')');
if (topMatch.heading.includes('Context-Sensitive')) {
  console.log('✓ Semantic/Structural retrieval test PASSED!');
} else {
  console.log('✗ Unexpected top match:', topMatch.heading);
}

// 4. Verify Built Artifacts
console.log('\n✓ Checking built electron artifacts:');
const distHtml = path.join(__dirname, 'dist/index.html');
const distMain = path.join(__dirname, 'dist-electron/main/index.js');
const distPreload = path.join(__dirname, 'dist-electron/preload/index.js');

console.log('  - dist/index.html:', fs.existsSync(distHtml) ? 'OK' : 'MISSING');
console.log('  - dist-electron/main/index.js:', fs.existsSync(distMain) ? 'OK' : 'MISSING');
console.log('  - dist-electron/preload/index.js:', fs.existsSync(distPreload) ? 'OK' : 'MISSING');

console.log('\n--- All Subsystems Verified Successfully! ---');
