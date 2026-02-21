const KEY='macrow_progress_v1';
const DEFAULT_PROGRESS={quizAttempts:[],competencies:{},practice:[]};

export function loadProgress(){
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {
      quizAttempts:Array.isArray(parsed.quizAttempts)?parsed.quizAttempts:[],
      competencies:parsed.competencies&&typeof parsed.competencies==='object'?parsed.competencies:{},
      practice:Array.isArray(parsed.practice)?parsed.practice:[]
    };
  }catch{
    return {...DEFAULT_PROGRESS};
  }
}

export function saveProgress(progress){
  const safe={
    quizAttempts:Array.isArray(progress?.quizAttempts)?progress.quizAttempts:[],
    competencies:progress?.competencies&&typeof progress.competencies==='object'?progress.competencies:{},
    practice:Array.isArray(progress?.practice)?progress.practice:[]
  };
  localStorage.setItem(KEY,JSON.stringify(safe));
}

export function clearProgress(){
  localStorage.removeItem(KEY);
}
