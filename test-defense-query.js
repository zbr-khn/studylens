const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey && fs.existsSync(path.join(__dirname, '.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  if (match) apiKey = match[1].trim();
}
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not set. Please set it in .env or as an environment variable.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const dataFile = path.join(__dirname, 'sample-materials', 'thesis_preindexed.json');
const raw = fs.readFileSync(dataFile, 'utf-8');
const data = JSON.parse(raw);

console.log('--- Verifying Thesis Knowledge Base Retrieval ---');
console.log(`Loaded Courses: ${data.courses.length} (${data.courses[0].name})`);
console.log(`Loaded Documents: ${data.documents.length}`);
console.log(`Loaded Chunks: ${data.chunks.length}`);

// Test BM25 / Keyword Retrieval on thesis question
function search(query, topK = 3) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const scored = data.chunks.map(chunk => {
    let score = 0;
    const text = (chunk.heading + ' ' + chunk.content).toLowerCase();
    for (const term of terms) {
      if (chunk.heading.toLowerCase().includes(term)) score += 5;
      if (text.includes(term)) score += 2;
    }
    return { ...chunk, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

async function testQuery(question) {
  console.log(`\n==================================================`);
  console.log(`TEST PROFESSOR QUESTION: "${question}"`);
  console.log(`==================================================`);
  
  const results = search(question);
  console.log(`Found Top ${results.length} Chunks:`);
  results.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ${r.docName} → ${r.heading} (Score: ${r.score})`);
    console.log(`      Snippet: ${r.content.slice(0, 140).replace(/\n/g, ' ')}...`);
  });

  const context = results.map(r => `--- ${r.docName} (${r.heading}) ---\n${r.content}`).join('\n\n');

  console.log('\nQuerying Gemini 3.1 Flash-Lite for Viva Answer...');
  const prompt = `You are StudyLens, assisting Zubair Ahmed Khan (92127983) during his Bachelor's thesis defense on MS Teams.
Candidate Thesis: "A Literature-Based Analysis of Agentic AI for Task Automation: Opportunities, Challenges, and a Lightweight Prototype Demonstration"

Professor's Question: "${question}"

RELEVANT THESIS CHUNKS:
${context}

Provide a short, punchy 2-3 sentence answer for Zubair to speak aloud, followed by key evidence points referencing his thesis and prototype.`;

  const res = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: { temperature: 0.2 },
  });

  console.log('\nAI DEFENSE ANSWER GENERATED:\n');
  console.log(res.text);
}

async function run() {
  await testQuery('Why did you choose a deterministic planner instead of letting the LLM decide each step in your prototype?');
}

run().catch(console.error);
