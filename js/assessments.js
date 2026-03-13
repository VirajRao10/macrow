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
  },
  {
    id: 'shift_ad_left_tightening',
    prompt: 'The central bank sharply raises interest rates to cool inflation. In the short run, which AD-AS shift is most likely?',
    options: ['AD shifts left', 'AD shifts right', 'SRAS shifts right', 'LRAS shifts left'],
    answer: 'AD shifts left',
    competency: 'Policy Analysis',
    explanation: 'Higher interest rates reduce consumption and investment demand, shifting AD left in the short run.'
  },
  {
    id: 'shift_sras_right_supply_reform',
    prompt: 'A government cuts payroll taxes and streamlines logistics, reducing unit production costs economy-wide. Which shift best fits?',
    options: ['SRAS shifts right', 'AD shifts left', 'LRAS shifts left', 'No shift occurs'],
    answer: 'SRAS shifts right',
    competency: 'Evaluation',
    explanation: 'Lower per-unit costs increase profitable output at each price level, which shifts SRAS right.'
  }
];

const INFLATION_PHILLIPS_BANK = [
  {
    id: 'pc_move_along',
    prompt: 'Demand rises above potential output in the short run. What is most likely on the Phillips Curve?',
    options: ['Movement up along SRPC: lower unemployment, higher inflation', 'Movement down along SRPC: higher unemployment, lower inflation', 'LRPC shifts right immediately', 'No change in inflation or unemployment'],
    answer: 'Movement up along SRPC: lower unemployment, higher inflation',
    competency: 'Policy Analysis',
    explanation: 'Stronger demand tightens labour markets, reducing unemployment while raising inflation pressure along the SRPC.'
  },
  {
    id: 'pc_expectations_shift',
    prompt: 'After several years of high inflation expectations, what Phillips Curve change is most likely?',
    options: ['SRPC shifts upward', 'SRPC shifts downward', 'LRPC shifts left permanently', 'No curve can shift'],
    answer: 'SRPC shifts upward',
    competency: 'Evaluation',
    explanation: 'Higher expected inflation can shift the short-run Phillips Curve up, worsening inflation at each unemployment rate.'
  },
  {
    id: 'inflation_policy_mix',
    prompt: 'Inflation is above target while output is near potential. Which macro mix is most consistent?',
    options: ['Contractionary monetary policy and cautious fiscal stance', 'Expansionary fiscal + expansionary monetary policy', 'Large subsidy to boost AD immediately', 'No policy response is needed'],
    answer: 'Contractionary monetary policy and cautious fiscal stance',
    competency: 'Evaluation',
    explanation: 'When inflation is the main gap, tighter demand policy is usually preferred to cool price pressure.'
  }
];

const FALLBACK_QUESTION_BANK = [
  {
    id: 'fallback_output_gap',
    prompt: 'If actual output is below potential output, what condition best describes the economy?',
    options: ['Recessionary gap', 'Inflationary gap', 'Full-employment equilibrium', 'Hyperinflation trap'],
    answer: 'Recessionary gap',
    competency: 'AD-AS Foundations',
    explanation: 'Output below potential usually indicates a recessionary gap and spare capacity.'
  },
  {
    id: 'fallback_policy_tradeoff',
    prompt: 'Why is macro policy evaluation important in exams?',
    options: ['Because policies involve trade-offs over time', 'Because one policy always solves every issue', 'Because diagrams replace analysis', 'Because assumptions are never needed'],
    answer: 'Because policies involve trade-offs over time',
    competency: 'Evaluation',
    explanation: 'High-quality macro answers explain short-run gains, long-run costs, and uncertainty.'
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
  const inflationPhillips = sampleWithoutReplacement(INFLATION_PHILLIPS_BANK, Math.min(2, INFLATION_PHILLIPS_BANK.length), rng);
  const combinedPool = [...inflationPhillips, ...shiftedBank, ...glossaryQuestions];
  const remaining = shuffle(combinedPool.slice(inflationPhillips.length), rng).slice(0, Math.max(0, 10 - inflationPhillips.length));
  let combined = shuffle([...inflationPhillips, ...remaining], rng).slice(0, 10);

  const lrasQuestion = SHIFT_QUESTION_BANK.find(q => q.id === 'shift_lras_right');
  if (lrasQuestion) {
    const hasLras = combined.some(q => /LRAS/i.test(`${q.prompt} ${q.answer}`));
    if (!hasLras) {
      combined[combined.length - 1] = {
        ...lrasQuestion,
        id: `${lrasQuestion.id}_forced`
      };
    }
  }

  if (combined.length < 10) {
    const fallback = shuffle([...FALLBACK_QUESTION_BANK], rng);
    while (combined.length < 10) {
      const next = fallback[combined.length % fallback.length];
      combined.push({ ...next, id: `${next.id}_${combined.length + 1}` });
    }
  }

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
