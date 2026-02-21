import { GRAPH as C_GRAPH, defaults as C_DEFAULTS, clamp, lerp, computeFromParams, AD, invertAD_Y, ASshape, equilibrium, adLineSegment } from './js/calculations.js';
import { loadProgress, saveProgress, clearProgress } from './js/storage.js';
import { buildQuizQuestions, buildPracticeFromConcepts } from './js/assessments.js';

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
const GRAPH=C_GRAPH; const defaults=C_DEFAULTS;
const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s)); const deepCopy=x=>JSON.parse(JSON.stringify(x));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

const SCENARIO_STORAGE_KEY="macrow_scenarios_v1";
const KEYBOARD_SHORTCUTS=[
  {key:"p",desc:"Policies tab"},{key:"r",desc:"Parameters tab"},{key:"l",desc:"Learn tab"},{key:"q",desc:"Assess tab (when enabled)"},{key:"a",desc:"About tab"},
  {key:"s",desc:"Open scenario manager"},{key:"?",desc:"Shortcuts modal"},{key:"x",desc:"Reset parameters"},{key:"Escape",desc:"Close overlays"}
];
const ALL_TABS=["policies","parameters","learn","assess","about"];
const LEARN_TIPS=[
  "AD shifts right usually raise real output and the price level in the short run.",
  "AS shifts left (cost-push shock) create inflation with weaker growth.",
  "The Yf marker sits on the AS curve at potential output (Yf).",
  "Use evaluation language: short run vs long run, inflation vs unemployment, and policy trade-offs.",
  "For top-band answers, add assumptions (confidence, spare capacity, policy lag, external shocks)."
];
const LEARN_MODULES=[
  {title:"AD–AS exam roadmap",points:["Start with the initial equilibrium (Y and P).","State the curve shift direction and why it shifts.","Explain the new short-run equilibrium outcome.","Evaluate short-run gains vs long-run risks."]},
  {title:"Policy evaluation structure (IB-ready)",points:["Define the policy objective (growth, inflation, unemployment, external balance).","Use AD/AS mechanics to explain likely transmission.","Add at least one time lag or confidence effect.","Conclude with conditions when policy is most effective."]},
  {title:"Common command terms",points:["Explain: show clear cause-and-effect steps.","Discuss: present advantages + limitations.","Evaluate: weigh trade-offs and end with justified judgement.","To what extent: compare alternatives before concluding."]}
];

const GLOSSARY=[
  {term:"Aggregate Demand (AD)",blurb:"Total planned spending at each price level: C + I + G + (X − M). AD shifts right when spending conditions improve."},
  {term:"Aggregate Supply (AS)",blurb:"Short-run total output producers are willing to supply. It can shift left after cost shocks and right after cost reductions."},
  {term:"Long-run Aggregate Supply (LRAS)",blurb:"Potential output at full employment. It moves with productive capacity, not short-run demand management."},
  {term:"Recessionary gap",blurb:"Actual output below potential output (Y < Yf). Usually linked to cyclical unemployment and weak demand."},
  {term:"Inflationary gap",blurb:"Actual output above sustainable potential (Y > Yf), often creating upward pressure on wages and prices."},
  {term:"Demand-pull inflation",blurb:"Rising price level caused by strong aggregate demand relative to productive capacity."},
  {term:"Cost-push inflation",blurb:"Inflation driven by higher production costs (e.g., wages, imported energy, taxes on firms)."},
  {term:"Disinflation",blurb:"A fall in the inflation rate (prices still rise, but more slowly). Different from deflation."},
  {term:"Deflation",blurb:"Sustained fall in the overall price level. Can increase real debt burdens and delay spending."},
  {term:"Automatic stabilisers",blurb:"Tax and benefit systems that soften business-cycle swings without new policy decisions."},
  {term:"Expansionary fiscal policy",blurb:"Higher government spending and/or lower taxes to stimulate AD and real output."},
  {term:"Contractionary fiscal policy",blurb:"Lower spending and/or higher taxes to reduce excess demand and inflation pressure."},
  {term:"Expansionary monetary policy",blurb:"Lower interest rates / easier credit conditions to stimulate investment and consumption."},
  {term:"Contractionary monetary policy",blurb:"Higher rates / tighter credit to cool inflation by reducing demand growth."},
  {term:"Supply-side policy",blurb:"Measures that improve productivity, competition, skills, or infrastructure, shifting AS/LRAS right."},
  {term:"Output gap",blurb:"Difference between actual GDP and potential GDP; useful for diagnosing cyclical pressure."},
  {term:"Multiplier effect",blurb:"Initial spending change causes a larger final change in national income through repeated re-spending."},
  {term:"Crowding out",blurb:"Government borrowing can raise rates and reduce private investment if spare capacity is limited."},
  {term:"Stagflation",blurb:"Combination of weak growth/unemployment with high inflation, often from adverse supply shocks."},
  {term:"Policy time lags",blurb:"Recognition, decision, and impact delays that reduce precision of stabilization policy."}
];
const ASSESS_COMPETENCIES=['AD-AS Foundations','Policy Analysis','Evaluation','Diagram Reasoning','Evaluation Writing'];

const settings={
  showAxisNumbers:(localStorage.getItem("macrow_show_axis_numbers")??"1")==="1",
  accessibility:(localStorage.getItem("macrow_access")??"0")==="1",
  assessEnabled:(localStorage.getItem("macrow_assess_enabled")??"0")==="1"
};
let state={tab:"policies",params:deepCopy(defaults.params),adShiftY:0,asShiftP:0,yFe:GRAPH.yFeBase,history:[],historyIndex:-1,compare:{on:false,snapshot:null}};
let scenarios=JSON.parse(localStorage.getItem(SCENARIO_STORAGE_KEY)||"[]");
let progress=loadProgress();
const getActiveTabs=()=>settings.assessEnabled?ALL_TABS:["policies","parameters","learn","about"];
const navButtons=qsa('.navBtn');
function syncAssessAvailability(){
  const assessBtn=qs('.navBtn[data-tab="assess"]');
  if(assessBtn) assessBtn.classList.toggle('hidden',!settings.assessEnabled);
  if(!settings.assessEnabled){
    const assessPanel=qs('#panelAssess');
    if(assessPanel) assessPanel.classList.add('hidden');
  }
}
function setTab(tab){
  const activeTabs=getActiveTabs();
  const target=activeTabs.includes(tab)?tab:activeTabs[0];
  state.tab=target;
  navButtons.forEach(b=>b.classList.toggle('navBtn--active',b.dataset.tab===target));
  ["policies","parameters","learn","assess","about"].forEach(t=>{
    const panel=qs(`#panel${t[0].toUpperCase()+t.slice(1)}`);
    if(panel) panel.classList.toggle('hidden',t!==target);
  });
  if(target==="assess") renderAssessPanel();
  qs('#panelTitle').textContent=target[0].toUpperCase()+target.slice(1);
  qs('#underGraphFormula')?.classList.toggle('hidden',target!=="parameters");
}
navButtons.forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));

const policyCards=[
{id:'fiscal_exp',name:'Fiscal expansionary',badge:{text:'AD → right',kind:'ad'},definition:'Increase G or reduce taxes.',apply:p=>({...p,govSpending:clamp(p.govSpending+18,0,100),taxRate:clamp(p.taxRate-8,0,50)})},
{id:'fiscal_con',name:'Fiscal contractionary',badge:{text:'AD → left',kind:'ad'},definition:'Reduce G or raise taxes.',apply:p=>({...p,govSpending:clamp(p.govSpending-14,0,100),taxRate:clamp(p.taxRate+6,0,50)})},
{id:'monetary_exp',name:'Monetary expansionary',badge:{text:'AD → right',kind:'ad'},definition:'Lower interest rates.',apply:p=>({...p,interestRate:clamp(p.interestRate-1.3,0,10)})},
{id:'monetary_con',name:'Monetary contractionary',badge:{text:'AD → left',kind:'ad'},definition:'Raise interest rates.',apply:p=>({...p,interestRate:clamp(p.interestRate+1.3,0,10)})},
{id:'supply_market',name:'Supply-side market reforms',badge:{text:'AS/LRAS → right',kind:'as'},definition:'Deregulation/competition boosts productivity.',apply:p=>({...p,supplySideReform:clamp(p.supplySideReform+15,0,100),productivity:clamp(p.productivity+8,0,100)})},
{id:'supply_intervention',name:'Supply-side intervention',badge:{text:'AS/LRAS → right',kind:'as'},definition:'Training/infrastructure investment.',apply:p=>({...p,supplySideReform:clamp(p.supplySideReform+10,0,100),productivity:clamp(p.productivity+12,0,100)})}
];

function renderPoliciesPanel(){ const root=qs('#panelPolicies'); root.innerHTML='<div class="sectionTitle">Choose a policy</div><div class="sectionHint">Use compare toggle for split-view and replay history for policy paths.</div><label class="toggle"><input id="toggleCompare" type="checkbox"/><span>Split-view compare</span></label><div class="scenarioToolbar"><button id="btnReplayBack" class="btn btn--ghost">◀ Replay</button><button id="btnReplayForward" class="btn btn--ghost">Replay ▶</button></div>';
policyCards.forEach(pc=>{const el=document.createElement('div'); el.className='policy'; el.innerHTML=`<div class="policy__top"><div><div class="policy__name">${escapeHtml(pc.name)}</div><div class="policy__text">${escapeHtml(pc.definition)}</div></div><button class="btn btn--primary" data-apply="${pc.id}">Apply</button></div>`; root.appendChild(el);});
root.onclick=e=>{const b=e.target.closest('[data-apply]'); if(!b)return; const p=policyCards.find(x=>x.id===b.dataset.apply); state.params=p.apply(state.params); onParamsChanged(true);};
qs('#toggleCompare').onchange=e=>{state.compare.on=e.target.checked; state.compare.snapshot=deepCopy(state.params); renderMainChart();};
qs('#btnReplayBack').onclick=()=>replayHistory(-1); qs('#btnReplayForward').onclick=()=>replayHistory(1);
}
const paramDefs=[
{key:'govSpending',label:'Government spending (G)',hint:'Higher G shifts AD right.',min:0,max:100,step:1,format:v=>`${v}`},
{key:'taxRate',label:'Tax rate (T)',hint:'Higher T shifts AD left.',min:0,max:50,step:1,format:v=>`${v}%`},
{key:'interestRate',label:'Interest rate (i)',hint:'Lower i shifts AD right.',min:0,max:10,step:0.1,format:v=>`${v.toFixed(1)}%`},
{key:'productionCosts',label:'Production costs',hint:'Higher costs shift AS left.',min:0,max:100,step:1,format:v=>`${v}`},
{key:'productivity',label:'Productivity',hint:'Shifts LRAS right/left.',min:0,max:100,step:1,format:v=>`${v}`},
{key:'supplySideReform',label:'Supply-side policy intensity',hint:'Captures tax/regulation/training bundles.',min:0,max:100,step:1,format:v=>`${v}`}
];
function renderParametersPanel(){const root=qs('#panelParameters'); root.innerHTML='<div class="sectionTitle">Explore drivers</div>'; paramDefs.forEach(d=>{const wrap=document.createElement('div'); wrap.className='slider'; wrap.innerHTML=`<div class="slider__top"><div><div class="slider__label">${d.label}</div><div class="slider__hint">${d.hint}</div></div><div class="slider__value" id="val_${d.key}">—</div></div><input type="range" id="rng_${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" />`; root.appendChild(wrap);}); paramDefs.forEach(d=>{const rng=qs(`#rng_${d.key}`); rng.value=state.params[d.key]; rng.oninput=()=>{state.params[d.key]=Number(rng.value); onParamsChanged(true);}; addSwipeAdjust(rng,d.step);}); syncParamReadouts();}
function renderLearnPanel(){
  const root=qs('#panelLearn');
  root.innerHTML=`
    <div class="sectionTitle">IB Learn mode</div>
    <div class="sectionHint">Structured for Paper 1/2 AD–AS explanations and strong evaluation chains.</div>
    ${LEARN_TIPS.map(t=>`<div class="learnCard">💡 ${escapeHtml(t)}</div>`).join('')}

    <div class="sectionTitle">Core revision modules</div>
    ${LEARN_MODULES.map(m=>`<div class="learnCard"><b>${escapeHtml(m.title)}</b><ul>${m.points.map(p=>`<li class="policy__text">${escapeHtml(p)}</li>`).join('')}</ul></div>`).join('')}
    <div class="sectionTitle">IB Macro glossary</div>
    <div class="sectionHint">High-frequency concepts from AD–AS, stabilization policy, and macro evaluation.</div>
    ${GLOSSARY.map(g=>`<div class="learnCard"><b>${escapeHtml(g.term)}</b><div class="policy__text">${escapeHtml(g.blurb)}</div></div>`).join('')}`;
}

function renderAssessPanel(){
  const root=qs('#panelAssess');
  if(!root) return;
  const questions=buildQuizQuestions(GLOSSARY);
  const practice=buildPracticeFromConcepts(GLOSSARY);
  const attempts=progress.quizAttempts||[];
  const avg=attempts.length?(attempts.reduce((a,b)=>a+b.score,0)/attempts.length).toFixed(1):'—';
  const best=attempts.length?Math.max(...attempts.map(a=>Number(a.score)||0)).toFixed(1):'—';
  const recent=attempts.slice(-3).reverse();
  root.innerHTML=`
    <div class="sectionTitle">Formative quiz + progress dashboard</div>
    <div class="learnCard"><b>Attempts:</b> ${attempts.length} &nbsp; <b>Average score:</b> ${avg}% &nbsp; <b>Best:</b> ${best}%</div>
    <div class="learnCard">
      <div id="quizLiveScore" class="policy__text"><b>Current quiz:</b> Answered 0/${questions.length} · Correct 0</div>
      <div class="scenarioToolbar">
        <button id="btnSubmitQuiz" class="btn btn--primary">Save current attempt</button>
        <button id="btnNewQuiz" class="btn btn--ghost">New question set</button>
        <button id="btnResetProgress" class="btn btn--ghost">Reset assess progress</button>
      </div>
    </div>
    ${recent.length?`<div class="learnCard">${recent.map(a=>`<div class="policy__text">• ${formatAttemptDate(a.ts)}: <b>${Number(a.score||0).toFixed(1)}%</b></div>`).join('')}</div>`:''}
    <div class="sectionHint">Uses existing Macrow glossary terms only. Instant feedback is shown after each response.</div>
    <div id="quizRoot"></div>
    <div class="sectionTitle">Competency-based path</div>
    <div class="learnCard" id="competencyRoot"></div>
    <div class="sectionTitle">Practice prompts</div>
    ${practice.map(p=>`<div class="learnCard"><b>${p.competency}</b><div class="policy__text">${escapeHtml(p.prompt)}</div></div>`).join('')}
  `;
  const quizHost=qs('#quizRoot');
  quizHost.innerHTML=questions.map((q,i)=>`<div class="learnCard"><div><b>Q${i+1}.</b> ${escapeHtml(q.prompt)}</div><div class="scenarioToolbar">${q.options.map((o,optIdx)=>`<button class="btn btn--ghost" data-q="${q.id}" data-opt="${optIdx}">${escapeHtml(o)}</button>`).join('')}</div><div id="fb_${q.id}" class="policy__text"></div></div>`).join('');
  const answered=new Set();
  let correctCount=0;
  const quizScoreNode=qs('#quizLiveScore');
  const updateQuizScore=()=>{
    if(quizScoreNode){
      quizScoreNode.innerHTML=`<b>Current quiz:</b> Answered ${answered.size}/${questions.length} · Correct ${correctCount}`;
    }
  };
  const renderCompetencies=()=>{
    qs('#competencyRoot').innerHTML=ASSESS_COMPETENCIES.map(k=>`<div class="policy__text"><b>${k}</b>: ${progress.competencies?.[k]||0} mastery points</div>`).join('');
  };
  quizHost.onclick=e=>{
    const b=e.target.closest('[data-q][data-opt]'); if(!b) return;
    const q=questions.find(x=>x.id===b.dataset.q); if(!q) return;
    if(answered.has(q.id)) return;
    const optionIdx=Number(b.dataset.opt);
    const selected=q.options[optionIdx];
    if(typeof selected!=='string') return;
    const ok=selected===q.answer;
    answered.add(q.id);
    if(ok) correctCount+=1;
    qs(`#fb_${q.id}`).textContent=ok?`✅ Correct. Competency: ${q.competency}`:`❌ Not quite. Correct answer: ${q.answer}`;
    quizHost.querySelectorAll(`[data-q="${q.id}"]`).forEach(btn=>{btn.disabled=true;});
    if(ok){
      progress.competencies[q.competency]=(progress.competencies[q.competency]||0)+1;
      saveProgress(progress);
      renderCompetencies();
    }
    updateQuizScore();
  };
  renderCompetencies();
  qs('#btnSubmitQuiz').onclick=()=>{
    if(!answered.size){
      showStatus('Answer at least one question before saving an attempt.',true);
      return;
    }
    const score=(correctCount/questions.length)*100;
    progress.quizAttempts=[...(progress.quizAttempts||[]),{ts:Date.now(),score:Number(score.toFixed(1)),correct:correctCount,total:questions.length,answered:answered.size}].slice(-30);
    saveProgress(progress);
    showStatus('Quiz attempt saved.');
    renderAssessPanel();
  };
  qs('#btnNewQuiz').onclick=()=>renderAssessPanel();
  qs('#btnResetProgress').onclick=()=>{
    if(!window.confirm('Reset all saved assess attempts and competency points?')) return;
    clearProgress();
    progress=loadProgress();
    showStatus('Assess progress reset.');
    renderAssessPanel();
  };
}

function formatAttemptDate(ts){
  if(!ts) return 'Unknown time';
  return new Date(ts).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}

function renderAboutPanel(){
  qs('#panelAbout').innerHTML=`
    <div class="sectionTitle">About macrow</div>
    <div class="sectionHint">Interactive IB Keynesian AD-AS simulator.</div>

    <div class="learnCard">
      <div class="policy__name">Links</div>
      <div class="policy__text">
        LinkedIn: <a class="link" href="https://linkedin.com/in/virajrao1" target="_blank" rel="noopener noreferrer">linkedin.com/in/virajrao1</a><br/>
        BuyMeACoffee: <a class="link" href="https://buymeacoffee.com/virajrao" target="_blank" rel="noopener noreferrer">buymeacoffee.com/virajrao</a><br/>
        Inquiries: <a class="link" href="mailto:raoco@virajrao.com">raoco@virajrao.com</a>
      </div>
    </div>

    <div class="learnCard">
      <div class="policy__text"><b>Microw - Coming Soon</b> (Microeconomics learning platform)</div>
    </div>

    <div class="learnCard aboutActions">
      <label class="toggle"><input id="toggleAccess" type="checkbox"/><span>High contrast + larger controls</span></label>
      <label class="toggle"><input id="toggleAssess" type="checkbox"/><span>Enable Assess tab</span></label>
      <button id="btnOpenShortcuts" class="btn btn--ghost">Open shortcuts help</button>
    </div>
  `;
  qs('#toggleAccess').checked=settings.accessibility;
  qs('#toggleAccess').onchange=e=>{settings.accessibility=e.target.checked; localStorage.setItem('macrow_access',settings.accessibility?'1':'0'); document.body.classList.toggle('accessibility-mode',settings.accessibility);};
  qs('#toggleAssess').checked=settings.assessEnabled;
  qs('#toggleAssess').onchange=e=>{
    settings.assessEnabled=e.target.checked;
    localStorage.setItem('macrow_assess_enabled',settings.assessEnabled?'1':'0');
    syncAssessAvailability();
    if(settings.assessEnabled){
      renderAssessPanel();
    }else if(state.tab==='assess'){
      setTab('about');
    }
  };
  qs('#btnOpenShortcuts').onclick=openShortcuts;
}
function syncParamReadouts(){paramDefs.forEach(d=>{qs(`#val_${d.key}`).textContent=d.format(state.params[d.key]); qs(`#rng_${d.key}`).value=state.params[d.key];});}

qs('#btnReset').onclick=()=>{state.params=deepCopy(defaults.params); onParamsChanged(true);};
qs('#btnMakeRecession').onclick=()=>{state.params={...state.params,govSpending:15,taxRate:45,interestRate:8.5,productionCosts:50,productivity:50}; onParamsChanged(true);};
qs('#btnMakeDemandPull').onclick=()=>{state.params={...state.params,govSpending:85,taxRate:10,interestRate:1.0,productionCosts:50,productivity:50}; onParamsChanged(true);};
qs('#btnMakeCostPush').onclick=()=>{state.params={...state.params,productionCosts:85}; onParamsChanged(true);};
qs('#btnClearGap').onclick=()=>{state.params=deepCopy(defaults.params); onParamsChanged(true);};
qs('#toggleAxisNumbers').onchange=e=>{settings.showAxisNumbers=e.target.checked; localStorage.setItem('macrow_show_axis_numbers',settings.showAxisNumbers?'1':'0'); renderMainChart();}; qs('#toggleAxisNumbers').checked=settings.showAxisNumbers;
qs('#btnExportPng').onclick=()=>exportChartPng();

let pendingRender=false;
function queueRender(){
  if(pendingRender) return;
  pendingRender=true;
  requestAnimationFrame(()=>{pendingRender=false; renderMainChart();});
}
function onParamsChanged(pushHistory=false){Object.assign(state,computeFromParams(state.params)); syncParamReadouts(); queueRender(); if(pushHistory) pushPolicyHistory();}
function pushPolicyHistory(){const stamp={ts:Date.now(),params:deepCopy(state.params)}; state.history=state.history.slice(0,state.historyIndex+1); state.history.push(stamp); state.historyIndex=state.history.length-1;}
function replayHistory(dir){if(!state.history.length)return; state.historyIndex=clamp(state.historyIndex+dir,0,state.history.length-1); state.params=deepCopy(state.history[state.historyIndex].params); onParamsChanged(false);}

function renderMainChart(){const svg=qs('#chartSvg'); svg.innerHTML=''; const W=860,H=560,pad={l:86,r:28,t:20,b:78},x=Y=>pad.l+((Y-GRAPH.Ymin)/(GRAPH.Ymax-GRAPH.Ymin))*(W-pad.l-pad.r),y=P=>pad.t+(1-(P-GRAPH.Pmin)/(GRAPH.Pmax-GRAPH.Pmin))*(H-pad.t-pad.b);
rect(svg,0,0,W,H,18,'rgba(255,255,255,0.02)'); [30,50,70,90,110].forEach(P=>{line(svg,pad.l,y(P),W-pad.r,y(P),'rgba(148,163,184,0.10)',1); if(settings.showAxisNumbers) text(svg,pad.l-10,y(P)+4,String(P),'end','rgba(148,163,184,0.70)',12);}); [60,90,120,150,180].forEach(Y=>{line(svg,x(Y),pad.t,x(Y),H-pad.b,'rgba(148,163,184,0.08)',1); if(settings.showAxisNumbers) text(svg,x(Y),H-pad.b+22,String(Y),'middle','rgba(148,163,184,0.70)',12);}); line(svg,pad.l,pad.t,pad.l,H-pad.b,'rgba(226,232,240,0.70)',3); line(svg,pad.l,H-pad.b,W-pad.r,H-pad.b,'rgba(226,232,240,0.70)',3); text(svg,(pad.l+(W-pad.r))/2,H-18,'Real GDP ($)','middle','rgba(226,232,240,0.92)',15,true); textRot(svg,22,(pad.t+(H-pad.b))/2,'Average Price Level ($)',-90,'middle','rgba(226,232,240,0.92)',15,true);
const cur={adShiftY:state.adShiftY,asShiftP:state.asShiftP,yFe:state.yFe}, base=computeFromParams(defaults.params);
drawCurveSet(svg,x,y,base,'rgba(255,255,255,0.22)',true); drawCurveSet(svg,x,y,cur,null,false); if(state.compare.on && state.compare.snapshot){drawCurveSet(svg,x,y,computeFromParams(state.compare.snapshot),'rgba(250,204,21,.9)',false,'6 7');}
drawEquilibriumGuides(svg,x,y,equilibrium(base),equilibrium(cur),pad,H);
addGraphTooltips(svg,x,y,cur); renderState(base,cur);
}
function drawCurveSet(svg,x,y,v,tint,muted=false,dash){
  const ad=adLineSegment(v.adShiftY).seg;
  if(ad) strokePath(svg,pathFromSegment(x,y,ad),tint||'rgba(239,68,68,0.95)',muted?4:6,dash);
  const as=ASshape(v);
  strokePath(svg,pathFromPoints(x,y,as.pts),tint||'rgba(59,130,246,0.95)',muted?4:6,dash);
  const adLabel=labelOnAD(svg,x,y,v.adShiftY,tint);
  const yfLabel=drawYfPoint(svg,x,y,as,tint,muted,dash);
  labelOnAS(svg,x,y,as,tint,adLabel,yfLabel);
}
function renderState(base,cur){
  const b=equilibrium(base),c=equilibrium(cur),dY=c.y-b.y,dP=c.p-b.p,dYf=cur.yFe-base.yFe;
  const num=v=>Number(v).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1});
  const delta=v=>`Δ ${v>0?'+':''}${num(v)}`;
  qs('#changeChips').innerHTML='';
  qs('#changeChips').append(chip(dY,'Output'),chip(dP,'Prices'));

  const gap=c.y-cur.yFe;
  const gapPercent=(gap/cur.yFe)*100;
  let stateText='Near full-employment equilibrium';
  let stateClass='near-equilibrium';
  if(gap<-2){stateText=`Recessionary gap: ${Math.abs(gapPercent).toFixed(1)}% below potential output`; stateClass='recessionary';}
  else if(gap>2){stateText=`Inflationary gap: ${gapPercent.toFixed(1)}% above potential output`; stateClass='inflationary';}
  else if(c.p>75){stateText='Rising price pressure near potential output'; stateClass='pressure';}
  qs('#gapLabel').textContent=stateText;
  qs('#gapLabel').setAttribute('data-state',stateClass);

  qs('#statOutputValue').textContent=`Y ${num(c.y)}`;
  qs('#statPriceValue').textContent=`P ${num(c.p)}`;
  qs('#statPotentialValue').textContent=`Yf ${num(cur.yFe)}`;
  qs('#statOutputDelta').textContent=delta(dY);
  qs('#statPriceDelta').textContent=delta(dP);
  qs('#statPotentialDelta').textContent=delta(dYf);
}
const chip=(d,l)=>{const el=document.createElement('div'); el.className='chip'; el.textContent=`${l} ${d>1?'↑':d<-1?'↓':'→'}`; return el;};

function addGraphTooltips(svg,xScale,yScale,cur){const tip=qs('#chartTooltip'); const as=ASshape(cur); const items=[{label:'Aggregate Demand (AD)',text:'Total spending: C + I + G + (X−M).',x:invertAD_Y(75,cur.adShiftY),y:75},{label:'Short-run Aggregate Supply',text:'Output producers are willing to supply at each price level.',x:as.yKink+8,y:60},{label:'Yf (potential output)',text:'Potential output marker on the AS curve.',x:as.yFe,y:as.pEnd},{label:'Real GDP axis',text:'Horizontal axis shows real output (Y).',x:120,y:22},{label:'Price level axis',text:'Vertical axis shows the average price level (P).',x:43,y:70}]; items.forEach(it=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('cx',xScale(it.x)); c.setAttribute('cy',yScale(it.y)); c.setAttribute('r','11'); c.setAttribute('fill','transparent'); c.setAttribute('tabindex','0'); c.setAttribute('aria-label',`${it.label} info`); c.style.cursor='help'; c.onmouseenter=c.onfocus=e=>{tip.innerHTML=`<b>${it.label}</b><br>${it.text}`; tip.classList.remove('hidden'); tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; c.onmouseleave=c.onblur=()=>tip.classList.add('hidden'); c.onmousemove=e=>{tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; svg.appendChild(c);});}

function drawEquilibriumGuides(svg,x,y,baseEq,curEq,pad,H){
  const pGap=Math.abs(y(baseEq.p)-y(curEq.p));
  const yGap=Math.abs(x(baseEq.y)-x(curEq.y));
  const axisLabel=(cx,cy,label,stroke)=>{
    const w=34,h=20;
    const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');
    [['x',cx-w/2],['y',cy-h/2],['width',w],['height',h],['rx',9],['fill','rgba(11,18,32,0.85)'],['stroke',stroke],['stroke-width','1.5']].forEach(([k,v])=>bg.setAttribute(k,v));
    svg.appendChild(bg);
    text(svg,cx,cy+4,label,'middle','rgba(241,245,249,0.96)',12,true);
  };
  const drawPoint=(pt,tag,color)=>{
    line(svg,pad.l,y(pt.p),x(pt.y),y(pt.p),color,1.6,'5 6');
    line(svg,x(pt.y),y(pt.p),x(pt.y),H-pad.b,color,1.6,'5 6');
    point(svg,x(pt.y),y(pt.p),5,color);

    const pBaseOffset=tag==='1'?-12:12;
    const pOffset=pGap<24?pBaseOffset:(tag==='1'?-2:2);
    axisLabel(pad.l-30,y(pt.p)+pOffset,`P${tag}`,color);

    const yBaseOffset=tag==='1'?-22:22;
    const yOffset=yGap<34?yBaseOffset:0;
    axisLabel(x(pt.y)+yOffset,H-pad.b+36,`Y${tag}`,color);
  };

  const baseColor='rgba(148,163,184,0.95)',curColor='rgba(248,250,252,0.95)';
  drawPoint(baseEq,'1',baseColor);
  drawPoint(curEq,'2',curColor);

  if(Math.abs(curEq.p-baseEq.p)>0.5){
    line(svg,pad.l-46,y(baseEq.p),pad.l-46,y(curEq.p),'rgba(244,114,182,0.95)',2.1);
    text(svg,pad.l-60,(y(baseEq.p)+y(curEq.p))/2+4,'P1 → P2','end','rgba(244,114,182,0.95)',12,true);
  }
  if(Math.abs(curEq.y-baseEq.y)>0.5){
    line(svg,x(baseEq.y),H-pad.b+50,x(curEq.y),H-pad.b+50,'rgba(56,189,248,0.95)',2.1);
    text(svg,(x(baseEq.y)+x(curEq.y))/2,H-pad.b+69,'Y1 → Y2','middle','rgba(56,189,248,0.95)',12,true);
  }
}



function openShortcuts(){const ov=qs('#shortcutsOverlay'); ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); qs('#shortcutsList').innerHTML=KEYBOARD_SHORTCUTS.map(s=>`<div class='learnCard'><b>${escapeHtml(s.key)}</b> — ${escapeHtml(s.desc)}</div>`).join('');}
qs('#shortcutsClose').onclick=()=>{qs('#shortcutsOverlay').classList.add('hidden'); qs('#shortcutsOverlay').setAttribute('aria-hidden','true');};

function initScenarioManager(){qs('#btnScenarios').onclick=()=>{qs('#scenarioOverlay').classList.remove('hidden'); qs('#scenarioOverlay').setAttribute('aria-hidden','false'); renderScenarioList();}; qs('#scenarioClose').onclick=closeScenarioModal; qs('#btnSaveScenario').onclick=saveScenario; qs('#btnExportJson').onclick=exportScenariosJson; qs('#scenarioImportFile').onchange=importScenariosJson; qs('#btnShareScenario').onclick=shareScenarioURL; qs('#btnQrExport').onclick=exportScenarioQr; qs('#btnQrScan').onclick=startQrScanner;}
function closeScenarioModal(){qs('#scenarioOverlay').classList.add('hidden'); qs('#scenarioOverlay').setAttribute('aria-hidden','true'); stopQrScanner();}
function saveScenario(){const name=qs('#scenarioName').value.trim()||`Scenario ${scenarios.length+1}`,category=qs('#scenarioCategory').value; scenarios.unshift({id:crypto.randomUUID(),name,category,params:deepCopy(state.params),createdAt:Date.now()}); persistScenarios(); renderScenarioList();}
function persistScenarios(){localStorage.setItem(SCENARIO_STORAGE_KEY,JSON.stringify(scenarios));}

function showStatus(msg,error=false,ms=2400){
  const box=qs('#appStatus');
  if(!box) return;
  box.textContent=msg;
  box.classList.remove('hidden');
  box.classList.toggle('error',error);
  clearTimeout(showStatus.t);
  showStatus.t=setTimeout(()=>box.classList.add('hidden'),ms);
}

async function ensureScript(src){
  if([...document.scripts].some(s=>s.src.includes(src))) return;
  await new Promise((resolve,reject)=>{
    const tag=document.createElement('script');
    tag.src=src; tag.defer=true;
    tag.onload=resolve; tag.onerror=()=>reject(new Error(`Failed ${src}`));
    document.head.appendChild(tag);
  });
}

async function ensureQrLibs(){
  if(window.QRCode && window.jsQR) return;
  showStatus('Loading QR tools for this action…');
  await ensureScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js');
  await ensureScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');
}

function renderScenarioList(){const root=qs('#scenarioListRoot'); root.innerHTML=scenarios.map(s=>`<div class="scenarioItem"><div><b>${escapeHtml(s.name)}</b><div class="sectionHint">${escapeHtml(s.category)}</div></div><div><button class="btn btn--ghost" data-load="${s.id}">Load</button><button class="btn btn--ghost" data-del="${s.id}">Delete</button></div></div>`).join('')||'<div class="sectionHint">No saved scenarios yet.</div>'; root.onclick=e=>{const l=e.target.closest('[data-load]'),d=e.target.closest('[data-del]'); if(l){const s=scenarios.find(x=>x.id===l.dataset.load); if(s){state.params=deepCopy(s.params); onParamsChanged(true);}} if(d){scenarios=scenarios.filter(x=>x.id!==d.dataset.del); persistScenarios(); renderScenarioList();}};}
function exportScenariosJson(){const blob=new Blob([JSON.stringify(scenarios,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='macrow-scenarios.json'; a.click();}
function importScenariosJson(e){const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result); if(Array.isArray(data)){const safe=data.filter(x=>x&&typeof x==='object'&&x.params&&typeof x.params==='object').map(x=>({id:crypto.randomUUID(),name:String(x.name||'Imported scenario'),category:String(x.category||'custom'),params:deepCopy({...defaults.params,...x.params}),createdAt:Date.now()})); scenarios=safe.concat(scenarios); persistScenarios(); renderScenarioList();} else {alert('Invalid scenario format');}}catch{alert('Invalid JSON')}}; r.readAsText(f); e.target.value='';}
function encodeScenario(s){
  const bytes=new TextEncoder().encode(JSON.stringify(s));
  let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeScenario(raw){
  const b64=raw.replace(/-/g,'+').replace(/_/g,'/');
  const padded=b64 + '==='.slice((b64.length+3)%4);
  try{
    const bin=atob(padded);
    const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }catch{
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  }
}
function buildScenarioURL(s){
  const payload={name:s.name,params:s.params,category:s.category};
  return `${location.origin}${location.pathname}?scenario=${encodeURIComponent(encodeScenario(payload))}`;
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src;});}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();}
function downloadCanvas(canvas,fileName){const a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download=fileName; a.click();}
async function shareScenarioURL(){const s=scenarios[0]||{name:'Current',params:state.params,category:'custom'}; const url=buildScenarioURL(s); try{await navigator.clipboard?.writeText(url); alert('Scenario URL copied.');}catch{prompt('Copy scenario URL:',url);}}
async function exportScenarioQr(){
  const s=scenarios[0]||{name:'Current',params:state.params,category:'custom'};
  const code=buildScenarioURL(s);
  const area=qs('#qrArea');
  area.classList.remove('hidden');
  area.innerHTML='';

  try{
    await ensureQrLibs();
    const canvas=document.createElement('canvas');
    await QRCode.toCanvas(canvas,code,{width:320,margin:1,errorCorrectionLevel:'H',color:{dark:'#0f172a',light:'#ffffff'}});
    const ctx=canvas.getContext('2d');

    try{
      const logo=await loadImage('./assets/macrow-logo.png');
      const sz=68;
      const x=(canvas.width-sz)/2,y=(canvas.height-sz)/2;
      ctx.fillStyle='white';
      roundRect(ctx,x-4,y-4,sz+8,sz+8,14);
      ctx.fill();
      ctx.drawImage(logo,x,y,sz,sz);
    }catch{}

    const heading=document.createElement('div');
    heading.className='sectionHint';
    heading.textContent='QR ready. Scan or download.';

    const downloadBtn=document.createElement('button');
    downloadBtn.className='btn btn--ghost';
    downloadBtn.textContent='Download QR image';
    downloadBtn.onclick=()=>downloadCanvas(canvas,`macrow-scenario-${Date.now()}.png`);

    const copyBtn=document.createElement('button');
    copyBtn.className='btn btn--ghost';
    copyBtn.textContent='Copy scenario URL';
    copyBtn.onclick=async()=>{await navigator.clipboard?.writeText(code); copyBtn.textContent='Copied ✓';};

    const row=document.createElement('div');
    row.className='scenarioToolbar';
    row.append(downloadBtn,copyBtn);

    area.append(heading,canvas,row);
  }catch(e){
    area.innerHTML=`<div class="sectionHint">Unable to generate QR right now (${escapeHtml(e?.message||'unknown error')}).</div>`;
  }
}
let qrStream=null,qrLoopId=null;
async function startQrScanner(){
  const area=qs('#qrScannerArea'),hint=qs('#qrScannerHint'),video=qs('#qrVideo'),canvas=qs('#qrCanvas');
  area.classList.remove('hidden');
  stopQrScanner();
  try{
    await ensureQrLibs();
    const isMobile=window.matchMedia('(pointer:coarse)').matches;
    qrStream=await navigator.mediaDevices.getUserMedia({video:isMobile?{facingMode:{ideal:'environment'}}:true});
    video.srcObject=qrStream;
    await video.play();
    hint.textContent='Point camera at scenario QR code.';
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const tick=()=>{
      if(video.readyState>=2){
        canvas.width=video.videoWidth;
        canvas.height=video.videoHeight;
        ctx.drawImage(video,0,0);
        const img=ctx.getImageData(0,0,canvas.width,canvas.height);
        const code=window.jsQR?.(img.data,canvas.width,canvas.height);
        if(code?.data){
          loadScenarioFromEncodedUrl(code.data);
          hint.textContent='Scenario loaded!';
          stopQrScanner();
          return;
        }
      }
      qrLoopId=requestAnimationFrame(tick);
    };
    tick();
  }catch{
    hint.textContent='Camera access failed. Use Import JSON.';
  }
}
function stopQrScanner(){if(qrLoopId) cancelAnimationFrame(qrLoopId); qrLoopId=null; if(qrStream){qrStream.getTracks().forEach(t=>t.stop()); qrStream=null;}}
function loadScenarioFromEncodedUrl(url){try{const u=new URL(url,location.origin); const val=u.searchParams.get('scenario'); if(!val) return; const obj=decodeScenario(decodeURIComponent(val)); if(obj?.params){state.params={...state.params,...obj.params}; onParamsChanged(true);}}catch{}}

function addSwipeAdjust(el,step){let sx=null; el.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true}); el.addEventListener('touchmove',e=>{if(sx==null)return; const dx=e.touches[0].clientX-sx; if(Math.abs(dx)>18){const next=Number(el.value)+(dx>0?1:-1)*Number(step||1); el.value=clamp(next,Number(el.min),Number(el.max)); el.dispatchEvent(new Event('input')); sx=e.touches[0].clientX;}},{passive:true});}

function isEditableTarget(target){
  if(!target) return false;
  const el=target.closest?.('input, textarea, select, [contenteditable="true"]');
  return Boolean(el);
}

window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!qs('#welcomeOverlay').classList.contains('hidden'))qs('#welcomeClose').click();
    if(!qs('#scenarioOverlay').classList.contains('hidden'))qs('#scenarioClose').click();
    if(!qs('#shortcutsOverlay').classList.contains('hidden'))qs('#shortcutsClose').click();
  }

  if(isEditableTarget(e.target)) return;

  if(e.key==='?'||(e.shiftKey&&e.key==='/')){e.preventDefault(); openShortcuts();}
  if(e.key==='p')setTab('policies');
  if(e.key==='r')setTab('parameters');
  if(e.key==='l')setTab('learn');
  if(e.key==='q' && settings.assessEnabled)setTab('assess');
  if(e.key==='a')setTab('about');
  if(e.key==='s')qs('#btnScenarios').click();
  if(e.key==='x')qs('#btnReset').click();
});

function applyScenarioFromUrl(){const s=new URLSearchParams(location.search).get('scenario'); if(s){try{const obj=decodeScenario(decodeURIComponent(s)); if(obj.params){state.params={...state.params,...obj.params};}}catch{}}}

async function exportChartPng(){const svg=qs('#chartSvg').cloneNode(true); svg.setAttribute('xmlns','http://www.w3.org/2000/svg'); svg.setAttribute('width','860'); svg.setAttribute('height','560'); const bg=document.createElementNS('http://www.w3.org/2000/svg','rect'); bg.setAttribute('x','0');bg.setAttribute('y','0');bg.setAttribute('width','860');bg.setAttribute('height','560');bg.setAttribute('fill','#0b1220'); svg.insertBefore(bg,svg.firstChild); const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'})); const img=new Image(); await new Promise((res,rej)=>{img.onload=res; img.onerror=rej; img.src=url}); const c=document.createElement('canvas'); c.width=1720; c.height=1120; const ctx=c.getContext('2d'); ctx.fillStyle='#0b1220'; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0,c.width,c.height); const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download=`macrow-graph-${Date.now()}.png`; a.click(); URL.revokeObjectURL(url);}

function rect(svg,x,y,w,h,r,f){const el=document.createElementNS('http://www.w3.org/2000/svg','rect'); [['x',x],['y',y],['width',w],['height',h],['rx',r],['fill',f]].forEach(([k,v])=>el.setAttribute(k,v)); svg.appendChild(el);} 
function line(svg,x1,y1,x2,y2,s,w,d){const el=document.createElementNS('http://www.w3.org/2000/svg','line'); [['x1',x1],['y1',y1],['x2',x2],['y2',y2],['stroke',s],['stroke-width',w],['stroke-linecap','round']].forEach(([k,v])=>el.setAttribute(k,v)); if(d)el.setAttribute('stroke-dasharray',d); svg.appendChild(el);} 
function text(svg,x,y,s,a,f,z,b=false){const el=document.createElementNS('http://www.w3.org/2000/svg','text'); [['x',x],['y',y],['text-anchor',a],['fill',f],['font-size',z],['font-family','ui-sans-serif']].forEach(([k,v])=>el.setAttribute(k,v)); if(b)el.setAttribute('font-weight','900'); el.textContent=s; svg.appendChild(el);} 
function textRot(svg,x,y,s,d,a,f,z,b=false){const el=document.createElementNS('http://www.w3.org/2000/svg','text'); [['x',x],['y',y],['text-anchor',a],['fill',f],['font-size',z],['font-family','ui-sans-serif'],['transform',`rotate(${d} ${x} ${y})`]].forEach(([k,v])=>el.setAttribute(k,v)); if(b)el.setAttribute('font-weight','900'); el.textContent=s; svg.appendChild(el);} 
function strokePath(svg,d,s,w,da){const el=document.createElementNS('http://www.w3.org/2000/svg','path'); [['d',d],['fill','none'],['stroke',s],['stroke-width',w],['stroke-linecap','round'],['stroke-linejoin','round']].forEach(([k,v])=>el.setAttribute(k,v)); if(da)el.setAttribute('stroke-dasharray',da); svg.appendChild(el);} 
function point(svg,cx,cy,r,fill){const el=document.createElementNS('http://www.w3.org/2000/svg','circle'); [['cx',cx],['cy',cy],['r',r],['fill',fill],['stroke','rgba(15,23,42,0.75)'],['stroke-width','1.5']].forEach(([k,v])=>el.setAttribute(k,v)); svg.appendChild(el);} 
function pathFromPoints(x,y,pts){return `M ${pts.map(([Y,P])=>`${x(Y).toFixed(1)} ${y(P).toFixed(1)}`).join(' L ')}`;} function pathFromSegment(x,y,s){return `M ${x(s[0][0]).toFixed(1)} ${y(s[0][1]).toFixed(1)} L ${x(s[1][0]).toFixed(1)} ${y(s[1][1]).toFixed(1)}`;}
function boxedLabel(svg,x,y,label,color,opt={}){const w=Math.max(40,label.length*7.1)+20,h=28,bg=document.createElementNS('http://www.w3.org/2000/svg','rect'); const fill=opt.fill||'rgba(6,11,22,0.88)'; [['x',x-w/2],['y',y-h/2],['width',w],['height',h],['rx',13],['fill',fill],['stroke',color||'rgba(148,163,184,.9)'],['stroke-width','1.7']].forEach(([k,v])=>bg.setAttribute(k,v)); svg.appendChild(bg); text(svg,x,y+4,label,'middle','rgba(241,245,249,0.98)',12.5,true); return {x,y,w,h};}
function clampLabelPos(pos,box,pad=18){return {x:clamp(pos.x,box.left+pad,box.right-pad),y:clamp(pos.y,box.top+pad,box.bottom-pad)};}
function labelsOverlap(a,b){if(!a||!b) return false; return Math.abs(a.x-b.x)<((a.w+b.w)/2+10)&&Math.abs(a.y-b.y)<((a.h+b.h)/2+8);}
function drawYfPoint(svg,x,y,as,c,muted=false,dash){const px=x(as.yFe),py=y(as.pEnd),axisY=y(GRAPH.Pmin),stroke=c||'rgba(34,197,94,.9)',labelY=axisY+20,guideDash=dash||'4 6'; if(!muted){line(svg,px,py,px,axisY,stroke,1.6,guideDash);} point(svg,px,py,muted?3.8:4.8,stroke); text(svg,px,labelY,'Yf','middle',stroke,12.5,true); return {x:px,y:labelY,w:34,h:20};}
function labelOnAD(svg,x,y,sh,c){const seg=adLineSegment(sh).seg; if(!seg)return null; const Y=lerp(seg[0][0],seg[1][0],.68),P=lerp(seg[0][1],seg[1][1],.68); const base=clampLabelPos({x:x(Y)+24,y:y(P)-24},{left:84,right:832,top:22,bottom:482},22); return boxedLabel(svg,base.x,base.y,'AD',c||'rgba(239,68,68,.95)');}
function labelOnAS(svg,x,y,as,c,adLabel,yfLabel){let pos=clampLabelPos({x:x(as.yKink)+58,y:y(as.pFlat)-20},{left:84,right:832,top:22,bottom:482},22); if(labelsOverlap({x:pos.x,y:pos.y,w:60,h:28},adLabel)){pos=clampLabelPos({x:pos.x+18,y:pos.y-34},{left:84,right:832,top:22,bottom:482},22);} if(labelsOverlap({x:pos.x,y:pos.y,w:60,h:28},yfLabel)){pos=clampLabelPos({x:pos.x-18,y:pos.y+32},{left:84,right:832,top:22,bottom:482},22);} return boxedLabel(svg,pos.x,pos.y,'AS',c||'rgba(59,130,246,.95)');}

function showWelcomeIfNeeded(){const k='macrow_welcome_dismissed_v3'; if(localStorage.getItem(k)==='1')return; const ov=qs('#welcomeOverlay'); ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); const close=(save=false)=>{if(save||qs('#welcomeDontShow').checked)localStorage.setItem(k,'1'); ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true'); document.removeEventListener('keydown',escHandler);}; const escHandler=e=>{if(e.key==='Escape')close(false);}; document.addEventListener('keydown',escHandler); qs('#welcomeClose').onclick=()=>close(false); qs('#welcomeOk').onclick=()=>close(true);}


function initResilience(){
  window.addEventListener('error',()=>showStatus('Something went wrong. Try reset or reload.',true,5000));
  window.addEventListener('unhandledrejection',()=>showStatus('Network/action failed. Please retry.',true,5000));
}

function initPerformanceMonitoring(){
  if(navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType||'')) document.body.classList.add('low-bandwidth');
  if('PerformanceObserver' in window){
    try{
      const obs=new PerformanceObserver((list)=>{
        for(const e of list.getEntries()){
          if(e.entryType==='longtask' && e.duration>120) showStatus('Performance tip: device is under load, reducing visuals.',false,1800);
        }
      });
      obs.observe({entryTypes:['longtask']});
    }catch{}
  }
}

function init(){
  initResilience();
  initPerformanceMonitoring();
  document.body.classList.toggle('accessibility-mode',settings.accessibility);
  syncAssessAvailability();
  renderPoliciesPanel();
  renderParametersPanel();
  renderLearnPanel();
  if(settings.assessEnabled) renderAssessPanel();
  renderAboutPanel();
  initScenarioManager();
  setTab('policies');
  showWelcomeIfNeeded();
  applyScenarioFromUrl();
  Object.assign(state,computeFromParams(state.params));
  syncParamReadouts();
  queueRender();
  pushPolicyHistory();
}
init();
