const KEY='macrow_progress_v1';

export function loadProgress(){
  try{return JSON.parse(localStorage.getItem(KEY)||'{"quizAttempts":[],"competencies":{},"practice":[]}');}
  catch{return {quizAttempts:[],competencies:{},practice:[]};}
}

export function saveProgress(progress){
  localStorage.setItem(KEY,JSON.stringify(progress));
}
