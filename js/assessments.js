export function buildQuizQuestions(glossary, rng=Math.random){
  const selected=sampleWithoutReplacement(glossary,Math.min(10,glossary.length),rng);
  return selected.map((item,idx)=>{
    const correct=item.term;
    const pool=glossary.filter(g=>g.term!==correct).map(g=>g.term);
    const distractors=sampleWithoutReplacement(pool,Math.min(3,pool.length),rng);
    return {
      id:`q_${idx+1}`,
      prompt:`Which macro concept best matches: ${item.blurb}`,
      options:shuffle([correct,...distractors],rng).slice(0,4),
      answer:correct,
      competency:idx<4?'AD-AS Foundations':idx<7?'Policy Analysis':'Evaluation'
    };
  });
}

export function buildPracticeFromConcepts(concepts, rng=Math.random){
  const selected=sampleWithoutReplacement(concepts,Math.min(6,concepts.length),rng);
  return selected.map((c,i)=>({
    id:`p_${i+1}`,
    prompt:`Using ${c.term}, explain one AD-AS shift and one likely trade-off in 2-3 sentences.`,
    competency:i<3?'Diagram Reasoning':'Evaluation Writing'
  }));
}

function shuffle(arr,rng=Math.random){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function sampleWithoutReplacement(items,count,rng=Math.random){
  const pool=[...items];
  const out=[];
  const max=Math.min(count,pool.length);
  for(let i=0;i<max;i++){
    const idx=Math.floor(rng()*pool.length);
    out.push(pool.splice(idx,1)[0]);
  }
  return out;
}
