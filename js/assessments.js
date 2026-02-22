const SHIFT_QUESTION_BANK = [
  {
    id: 'shift_sras_left',
    prompt: 'A sudden energy-price shock raises firms\' production costs. Which shift is most likely in AD-AS?',
    options: ['SRAS shifts left', 'SRAS shifts right', 'LRAS shifts left', 'AD shifts right'],
    answer: 'SRAS shifts left',
    competency: 'Policy Analysis',
    explanation: 'Higher input costs reduce short-run output at each price level, so SRAS shifts left (cost-push inflation risk).'
  },
  {
    id: 'shift_lras_right',
    prompt: 'A sustained productivity boom from better technology occurs over several years. Which shift best fits?',
    options: ['LRAS shifts right', 'SRAS shifts left', 'AD shifts left', 'No curve shift'],
    answer: 'LRAS shifts right',
    competency: 'AD-AS Foundations',
    explanation: 'Productivity raises potential output, so long-run productive capacity expands and LRAS shifts right.'
  }
];

export function buildQuizQuestions(glossary, rng = Math.random) {
  const randomGlossary = sampleWithoutReplacement(glossary, Math.max(0, Math.min(8, glossary.length)), rng);
  const glossaryQuestions = randomGlossary.map((item, idx) => {
    const correct = item.term;
    const pool = glossary.filter(g => g.term !== correct).map(g => g.term);
    const distractors = sampleWithoutReplacement(pool, Math.min(3, pool.length), rng);
    return {
      id: `q_${idx + 1}`,
      prompt: `Which macro concept best matches: ${item.blurb}`,
      options: shuffle([correct, ...distractors], rng).slice(0, 4),
      answer: correct,
      competency: idx < 4 ? 'AD-AS Foundations' : idx < 7 ? 'Policy Analysis' : 'Evaluation',
      explanation: `${correct} is the best match for this definition in the Macrow glossary.`
    };
  });

  const shiftedBank = shuffle([...SHIFT_QUESTION_BANK], rng);
  const combined = shuffle([...shiftedBank, ...glossaryQuestions], rng).slice(0, 10);
  return combined.map((q, i) => ({ ...q, id: q.id || `q_${i + 1}` }));
}

export function buildPracticeFromConcepts(concepts, rng = Math.random) {
  const selected = sampleWithoutReplacement(concepts, Math.min(6, concepts.length), rng);
  return selected.map((c, i) => ({
    id: `p_${i + 1}`,
    prompt: `Using ${c.term}, explain one AD-AS shift and one likely trade-off in 2-3 sentences.`,
    competency: i < 3 ? 'Diagram Reasoning' : 'Evaluation Writing'
  }));
}

function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleWithoutReplacement(items, count, rng = Math.random) {
  const pool = [...items];
  const out = [];
  const max = Math.min(count, pool.length);
  for (let i = 0; i < max; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
