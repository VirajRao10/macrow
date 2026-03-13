import { storageGet, storageSet } from './local-storage.js';

const KEY='macrow_progress_v1';
const DEFAULT_PROGRESS={quizAttempts:[],competencies:{},practice:[]};

export function loadProgress(){
  try{
    const raw=storageGet(KEY);
    if(!raw) return {...DEFAULT_PROGRESS};
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=='object') return {...DEFAULT_PROGRESS};
    return parsed;
  }catch{
    return {...DEFAULT_PROGRESS};
  }
}

export function saveProgress(progress){
  storageSet(KEY,JSON.stringify(progress));
}
