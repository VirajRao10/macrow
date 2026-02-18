const KEY='macrow_progress_v1';
const TEACHER_KEY='macrow_teacher_v1';

export function loadProgress(){
  try{return JSON.parse(localStorage.getItem(KEY)||'{"quizAttempts":[],"competencies":{},"practice":[]}');}
  catch{return {quizAttempts:[],competencies:{},practice:[]};}
}

export function saveProgress(progress){
  localStorage.setItem(KEY,JSON.stringify(progress));
}

export function loadTeacher(){
  try{return JSON.parse(localStorage.getItem(TEACHER_KEY)||'{"classes":[],"assignments":[],"studentProgress":[]}');}
  catch{return {classes:[],assignments:[],studentProgress:[]};}
}

export function saveTeacher(state){
  localStorage.setItem(TEACHER_KEY,JSON.stringify(state));
}
