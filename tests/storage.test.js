import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgress, loadProgress, saveProgress } from '../js/storage.js';

function makeStorage(){
  const backing=new Map();
  return {
    getItem:key=>backing.has(key)?backing.get(key):null,
    setItem:(key,val)=>backing.set(key,String(val)),
    removeItem:key=>backing.delete(key),
    clear:()=>backing.clear()
  };
}

describe('progress storage',()=>{
  beforeEach(()=>{
    globalThis.localStorage=makeStorage();
  });

  it('returns safe defaults for empty or invalid payloads',()=>{
    expect(loadProgress()).toEqual({quizAttempts:[],competencies:{},practice:[]});
    localStorage.setItem('macrow_progress_v1','{invalid');
    expect(loadProgress()).toEqual({quizAttempts:[],competencies:{},practice:[]});
  });

  it('sanitizes malformed progress when saving and loading',()=>{
    saveProgress({quizAttempts:'bad',competencies:null,practice:{}});
    expect(loadProgress()).toEqual({quizAttempts:[],competencies:{},practice:[]});
  });

  it('clears saved progress',()=>{
    saveProgress({quizAttempts:[{score:80}],competencies:{Evaluation:2},practice:[]});
    clearProgress();
    expect(loadProgress()).toEqual({quizAttempts:[],competencies:{},practice:[]});
  });
});
