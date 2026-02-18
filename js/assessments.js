export function buildQuizQuestions(glossary){
  return glossary.slice(0,10).map((item,idx)=>{
    const correct=item.term;
    const distractors=glossary.filter(g=>g.term!==correct).slice(idx,idx+3).map(g=>g.term);
    return {
      id:`q_${idx+1}`,
      prompt:`Which macro concept best matches: ${item.blurb}`,
      options:shuffle([correct,...distractors]).slice(0,4),
      answer:correct,
      competency:idx<4?'AD-AS Foundations':idx<7?'Policy Analysis':'Evaluation'
    };
  });
}

export function buildPracticeFromConcepts(concepts){
  return concepts.slice(0,6).map((c,i)=>({
    id:`p_${i+1}`,
    prompt:`Using ${c.term}, explain one AD-AS shift and one likely trade-off in 2-3 sentences.`,
    competency:i<3?'Diagram Reasoning':'Evaluation Writing'
  }));
}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
