import { GRAPH as C_GRAPH, defaults as C_DEFAULTS, clamp, lerp, computeFromParams, AD, invertAD_Y, ASshape, equilibrium, adLineSegment } from './js/calculations.js';
import { loadProgress, saveProgress } from './js/storage.js';
import { buildQuizQuestions, buildPracticeFromConcepts } from './js/assessments.js';

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
const GRAPH=C_GRAPH; const defaults=C_DEFAULTS;
const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s)); const deepCopy=x=>JSON.parse(JSON.stringify(x));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

const SCENARIO_STORAGE_KEY="macrow_scenarios_v1";
const FLASHCARD_STORAGE_KEY="macrow_flashcards_srs_v1";
const KEYBOARD_SHORTCUTS=[
  {key:"p",desc:"Policies tab"},{key:"r",desc:"Parameters tab"},{key:"l",desc:"Learn tab"},{key:"q",desc:"Assess tab (when enabled)"},{key:"a",desc:"About tab"},
  {key:"s",desc:"Open scenario manager"},{key:"?",desc:"Shortcuts modal"},{key:"x",desc:"Reset parameters"},{key:"Escape",desc:"Close overlays"}
];
const LEARN_TIPS=[
  "AD shifts right usually raise real output and the price level in the short run.",
  "AS shifts left (cost-push shock) create inflation with weaker growth.",
  "Yf now anchors at the AS right-kink point (where SRAS meets vertical LRAS).",
  "Use evaluation language: short run vs long run, inflation vs unemployment, and policy trade-offs.",
  "For top-band answers, add assumptions (confidence, spare capacity, policy lag, external shocks)."
];
const LEARN_MODULES=[
  {title:"AD–AS exam roadmap",points:["Start with the initial equilibrium (Y and P).","State the curve shift direction and why it shifts.","Explain the new short-run equilibrium outcome.","Evaluate short-run gains vs long-run risks."]},
  {title:"Policy evaluation structure (IB-ready)",points:["Define the policy objective (growth, inflation, unemployment, external balance).","Use AD/AS mechanics to explain likely transmission.","Add at least one time lag or confidence effect.","Conclude with conditions when policy is most effective."]},
  {title:"Classroom investigation template",points:["Set a starting state and ask students to predict P/Y before moving any slider.","Apply one policy, then require annotation of what shifted and why.","Compare short-run gains against inflation or unemployment trade-offs.","Finish with a 2–3 sentence evaluation using assumptions and limits."]},
  {title:"Common command terms",points:["Explain: show clear cause-and-effect steps.","Discuss: present advantages + limitations.","Evaluate: weigh trade-offs and end with justified judgement.","To what extent: compare alternatives before concluding."]}
];
const CLASSROOM_INVESTIGATIONS=[
  "A central bank is worried about persistent inflation and weak credibility.",
  "Consumer confidence has fallen after external uncertainty, reducing private spending.",
  "Government announces an infrastructure package to support growth and jobs.",
  "Energy and shipping costs surge, pushing up firms’ production costs.",
  "A productivity boom follows digital adoption and labour upskilling.",
  "A tax increase is introduced to reduce a widening budget deficit."
];

const PARAM_LIMITS = {
  govSpending:{min:0,max:100},
  taxRate:{min:0,max:50},
  interestRate:{min:0,max:10},
  productionCosts:{min:0,max:100},
  productivity:{min:0,max:100},
  supplySideReform:{min:0,max:100}
};
const SHIFT_LEVELS = {
  adStrong:20,
  adModerate:12,
  adLight:6,
  asRightStrong:-5,
  asRightModerate:-3,
  asLeftModerate:4,
  yfBoostStrong:14,
  yfBoostModerate:10
};
const AD_PARAM_EFFECTS={govSpending:0.6,taxRate:-0.9,interestRate:-4};
const AS_PARAM_EFFECTS={productionCosts:0.6,supplySideReform:-0.3};
const YFE_PARAM_EFFECTS={productivity:1,supplySideReform:0.5};
function computeParamDeltas(targetShift,weights,effects){
  if(!targetShift||!weights) return {};
  const totalWeight=Object.values(weights).reduce((sum,val)=>sum+val,0);
  if(totalWeight===0) return {};
  const contributions={};
  for(const [key,weight] of Object.entries(weights)){
    const effect=effects[key];
    if(!effect) continue;
    const share=weight/totalWeight;
    const delta=(targetShift*share)/effect;
    if(Math.abs(delta)>1e-5) contributions[key]=delta;
  }
  return contributions;
}
function applyParamDeltas(params,deltas){
  let next={...params};
  for(const [key,delta] of Object.entries(deltas)){
    const limit=PARAM_LIMITS[key];
    if(!limit) continue;
    next[key]=clamp(next[key]+delta,limit.min,limit.max);
  }
  return next;
}
function applyAdShift(params,targetShift,weights){
  if(!targetShift||!weights) return {...params};
  const deltas=computeParamDeltas(targetShift,weights,AD_PARAM_EFFECTS);
  return applyParamDeltas(params,deltas);
}
function applyAsShift(params,targetShift,weights){
  if(!targetShift||!weights) return {...params};
  const deltas=computeParamDeltas(targetShift,weights,AS_PARAM_EFFECTS);
  return applyParamDeltas(params,deltas);
}
function applyYfShift(params,targetShift,weights){
  if(!targetShift||!weights) return {...params};
  const deltas=computeParamDeltas(targetShift,weights,YFE_PARAM_EFFECTS);
  return applyParamDeltas(params,deltas);
}
function applyShiftProfile(params,profile){
  if(!profile) return {...params};
  let next={...params};
  if(profile.ad) next=applyAdShift(next,profile.ad.target,profile.ad.weights);
  if(profile.as) next=applyAsShift(next,profile.as.target,profile.as.weights);
  if(profile.yfe) next=applyYfShift(next,profile.yfe.target,profile.yfe.weights);
  if(profile.manual) next={...next,...profile.manual};
  return next;
}
const SHIFT_PROFILES={
  fiscal_exp:{ad:{target:SHIFT_LEVELS.adStrong,weights:{govSpending:0.65,taxRate:0.35}}},
  fiscal_con:{ad:{target:-SHIFT_LEVELS.adStrong,weights:{govSpending:0.65,taxRate:0.35}}},
  monetary_exp:{ad:{target:SHIFT_LEVELS.adModerate,weights:{interestRate:1}}},
  monetary_con:{ad:{target:-SHIFT_LEVELS.adModerate,weights:{interestRate:1}}},
  supply_market:{
    as:{target:SHIFT_LEVELS.asRightStrong,weights:{productionCosts:0.6,supplySideReform:0.4}},
    yfe:{target:SHIFT_LEVELS.yfBoostStrong,weights:{supplySideReform:0.45,productivity:0.55}}
  },
  supply_intervention:{
    as:{target:SHIFT_LEVELS.asRightModerate,weights:{productionCosts:0.55,supplySideReform:0.45}},
    yfe:{target:SHIFT_LEVELS.yfBoostModerate,weights:{supplySideReform:0.55,productivity:0.45}}
  },
  preset_recession:{
    ad:{target:-SHIFT_LEVELS.adStrong,weights:{govSpending:0.6,taxRate:0.4}},
    note:'Recession preset loaded: demand softens with a strong AD left shift.'
  },
  preset_inflation:{
    ad:{target:SHIFT_LEVELS.adStrong,weights:{govSpending:0.6,taxRate:0.4}},
    note:'Inflation preset loaded: strong AD right shift (fiscal bias).'
  },
  preset_growth:{
    as:{target:SHIFT_LEVELS.asRightModerate,weights:{productionCosts:0.6,supplySideReform:0.4}},
    yfe:{target:SHIFT_LEVELS.yfBoostStrong,weights:{supplySideReform:0.5,productivity:0.5}},
    note:'Growth preset loaded: supply-side push with potential boost.'
  },
  cost_push:{
    as:{target:SHIFT_LEVELS.asLeftModerate,weights:{productionCosts:0.75,supplySideReform:0.25}},
    note:'Cost-push demo: higher production costs shift AS left.'
  }
};
const policyDefinitions=[
  {id:'fiscal_exp',name:'Fiscal expansionary',badge:{text:'AD → right',kind:'ad'},definition:'Increase G or reduce taxes.'},
  {id:'fiscal_con',name:'Fiscal contractionary',badge:{text:'AD → left',kind:'ad'},definition:'Reduce G or raise taxes.'},
  {id:'monetary_exp',name:'Monetary expansionary',badge:{text:'AD → right',kind:'ad'},definition:'Lower interest rates.'},
  {id:'monetary_con',name:'Monetary contractionary',badge:{text:'AD → left',kind:'ad'},definition:'Raise interest rates.'},
  {id:'supply_market',name:'Supply-side market reforms',badge:{text:'AS/LRAS → right',kind:'as'},definition:'Deregulation/competition boosts productivity.'},
  {id:'supply_intervention',name:'Supply-side intervention',badge:{text:'AS/LRAS → right',kind:'as'},definition:'Training/infrastructure investment.'}
];
const policyCards=policyDefinitions.map(def=>({...def,apply:p=>applyShiftProfile(p,SHIFT_PROFILES[def.id])}));
const PRESET_PROFILE_IDS={
  recession:'preset_recession',
  inflation:'preset_inflation',
  growth:'preset_growth'
};

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

const settings={
  showAxisNumbers:(localStorage.getItem("macrow_show_axis_numbers")??"1")==="1",
  accessibility:(localStorage.getItem("macrow_access")??"0")==="1",
  assessEnabled:(localStorage.getItem("macrow_assess_enabled")??"0")==="1"
};
let state={tab:"policies",params:deepCopy(defaults.params),adShiftY:0,asShiftP:0,yFe:GRAPH.yFeBase,history:[],historyIndex:-1,compare:{on:false,snapshot:null}};
let scenarios=JSON.parse(localStorage.getItem(SCENARIO_STORAGE_KEY)||"[]");
let progress=loadProgress();
let flashcardProgress=loadFlashcardProgress();
const phillipsState={mode:'srpc',shift:0,inflation:4.5,naturalU:5.2};
const moneyMarketState={mdShift:0,msShift:0,policyRate:4.0};
const MONEY_MARKET_CONFIG={
  basePolicyRate:4.0,
  baseMsQuantity:95,
  qBounds:[45,150],
  qRange:[35,165],
  slope:-0.04,
  mdShiftImpact:0.7,
  msShiftQuantityImpact:6,
  msShiftInterestImpact:0.55,
  interestBounds:[1.2,10.8]
};
const aggregateDemandState={cShift:0,iShift:0,gShift:0,nxShift:0};
const CURVE_SHIFT_CONFIG={min:-2,max:2,step:1};
const shiftCurve=(value,direction)=>clamp(value+(direction*CURVE_SHIFT_CONFIG.step),CURVE_SHIFT_CONFIG.min,CURVE_SHIFT_CONFIG.max);

const navButtons=qsa('.navBtn');
const assessNavButton=navButtons.find(b=>b.dataset.tab==="assess");
function setTab(tab){
  if(tab==="assess" && !settings.assessEnabled){
    tab="policies";
  }
  state.tab=tab;
  navButtons.forEach(b=>b.classList.toggle('navBtn--active',b.dataset.tab===tab));
  ["policies","parameters","learn","assess","about"].forEach(t=>qs(`#panel${t[0].toUpperCase()+t.slice(1)}`).classList.toggle('hidden',t!==tab));
  qs('#panelTitle').textContent=tab[0].toUpperCase()+tab.slice(1);
  qs('#underGraphFormula')?.classList.toggle('hidden',tab!=="parameters");
}
navButtons.forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));

function syncAssessAvailability(){
  if(!assessNavButton) return;
  assessNavButton.classList.toggle("hidden",!settings.assessEnabled);
  if(!settings.assessEnabled && state.tab==="assess"){
    setTab("policies");
  }
}


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

    <div class="sectionTitle">Classroom investigations</div>
    <div class="sectionHint">Generate teacher-ready prompts, assign a starter scenario, and ask students to justify the shift + evaluate impact.</div>
    <div class="learnCard">
      <div class="scenarioToolbar learnActions">
        <button id="btnGenerateInvestigation" class="btn btn--primary">Generate investigation brief</button>
        <button id="btnAssignStarter" class="btn btn--ghost">Assign random starter state</button>
        <button id="btnCopyInvestigation" class="btn btn--ghost">Copy brief</button>
      </div>
      <textarea id="learnInvestigationText" class="textInput learnTextarea" rows="7" aria-label="Classroom investigation brief"></textarea>
      <div class="policy__text">Teacher move: ask students to annotate <b>which curve shifts</b>, mark new equilibrium, and evaluate one limitation.</div>
    </div>

    <div class="learnCard" id="learnSnapshot" aria-live="polite" aria-atomic="true"></div>

    <div class="sectionTitle">Phillips Curve diagram lab</div>
    <div class="learnCard">
      <div class="scenarioToolbar learnActions">
        <button id="btnPcMode" class="btn btn--ghost" type="button">Mode: SRPC</button>
        <button id="btnPcShockLeft" class="btn btn--ghost" type="button">Shift left (adverse shock)</button>
        <button id="btnPcShockRight" class="btn btn--ghost" type="button">Shift right (supply gain)</button>
        <button id="btnPcReset" class="btn btn--ghost" type="button">Reset</button>
        <button id="btnExportPcPng" class="btn btn--ghost" type="button">Export Phillips curve (PNG)</button>
      </div>
      <svg id="pcSvg" viewBox="0 0 560 300" role="img" aria-label="Phillips curve diagram"></svg>
      <div id="pcCaption" class="policy__text"></div>
    </div>

    <div class="sectionTitle">Money market diagram lab</div>
    <div class="learnCard">
      <div class="scenarioToolbar learnActions">
        <button id="btnMmMdLeft" class="btn btn--ghost" type="button">Md ←</button>
        <button id="btnMmMdRight" class="btn btn--ghost" type="button">Md →</button>
        <button id="btnMmMsLeft" class="btn btn--ghost" type="button">Ms ←</button>
        <button id="btnMmMsRight" class="btn btn--ghost" type="button">Ms →</button>
        <button id="btnMmReset" class="btn btn--ghost" type="button">Reset</button>
        <button id="btnExportMmPng" class="btn btn--ghost" type="button">Export money market (PNG)</button>
      </div>
      <label class="policy__text" for="mmPolicyRate">Policy rate anchor: <span id="mmPolicyRateVal">4.0%</span></label>
      <input id="mmPolicyRate" type="range" min="1" max="10" step="0.1" value="4.0" />
      <svg id="moneyMarketSvg" viewBox="0 0 560 300" role="img" aria-label="Money market diagram"></svg>
      <div id="moneyMarketCaption" class="policy__text"></div>
    </div>

    <div class="sectionTitle">Aggregate demand components lab</div>
    <div class="learnCard">
      <div class="scenarioToolbar learnActions">
        <button id="btnAdCompCDown" class="btn btn--ghost" type="button">C −</button>
        <button id="btnAdCompCUp" class="btn btn--ghost" type="button">C +</button>
        <button id="btnAdCompIDown" class="btn btn--ghost" type="button">I −</button>
        <button id="btnAdCompIUp" class="btn btn--ghost" type="button">I +</button>
        <button id="btnAdCompGDown" class="btn btn--ghost" type="button">G −</button>
        <button id="btnAdCompGUp" class="btn btn--ghost" type="button">G +</button>
        <button id="btnAdCompNXDown" class="btn btn--ghost" type="button">(X−M) −</button>
        <button id="btnAdCompNXUp" class="btn btn--ghost" type="button">(X−M) +</button>
        <button id="btnAdCompReset" class="btn btn--ghost" type="button">Reset</button>
      </div>
      <svg id="adComponentsSvg" viewBox="0 0 560 300" role="img" aria-label="Aggregate demand components diagram"></svg>
      <div id="adComponentsCaption" class="policy__text"></div>
    </div>

    <div class="sectionTitle">Scenario presets</div>
    <div class="learnCard">
      <div class="scenarioToolbar learnActions">
        <button id="btnPresetRecession" class="btn btn--ghost" type="button">Load recession</button>
        <button id="btnPresetInflation" class="btn btn--ghost" type="button">Load inflation</button>
        <button id="btnPresetGrowth" class="btn btn--ghost" type="button">Load growth</button>
      </div>
      <div id="presetFeedback" class="policy__text">Preset tools ready.</div>
    </div>

    <div class="sectionTitle">Core revision modules</div>
    ${LEARN_MODULES.map(m=>`<div class="learnCard"><b>${escapeHtml(m.title)}</b><ul>${m.points.map(p=>`<li class="policy__text">${escapeHtml(p)}</li>`).join('')}</ul></div>`).join('')}
    <div class="sectionTitle">IB Macro glossary</div>
    <div class="sectionHint">High-frequency concepts from AD–AS, stabilization policy, and macro evaluation.</div>
    ${GLOSSARY.map(g=>`<div class="learnCard"><b>${escapeHtml(g.term)}</b><div class="policy__text">${escapeHtml(g.blurb)}</div></div>`).join('')}

    <div class="sectionTitle">Flashcard mode (spaced repetition)</div>
    <div class="sectionHint">Review term/definition cards with adaptive intervals (Again/Hard/Good/Easy).</div>
    <div id="flashcardRoot"></div>`;

  const txt=qs('#learnInvestigationText');
  txt.value=buildInvestigationBrief();
  qs('#btnGenerateInvestigation').onclick=()=>{txt.value=buildInvestigationBrief();};
  qs('#btnAssignStarter').onclick=()=>{const pick=policyCards[Math.floor(Math.random()*policyCards.length)]; state.params=pick.apply(deepCopy(defaults.params)); onParamsChanged(true); setTab('policies');};
  qs('#btnCopyInvestigation').onclick=async()=>{await navigator.clipboard?.writeText(txt.value); qs('#btnCopyInvestigation').textContent='Copied ✓'; setTimeout(()=>{const b=qs('#btnCopyInvestigation'); if(b)b.textContent='Copy brief';},1200);};
  qs('#btnPcMode').onclick=()=>{phillipsState.mode=phillipsState.mode==='srpc'?'lrpc':'srpc'; renderPhillipsCurve();};
  qs('#btnPcShockLeft').onclick=()=>{phillipsState.shift=shiftCurve(phillipsState.shift,-1); renderPhillipsCurve();};
  qs('#btnPcShockRight').onclick=()=>{phillipsState.shift=shiftCurve(phillipsState.shift,1); renderPhillipsCurve();};
  qs('#btnPcReset').onclick=()=>{phillipsState.mode='srpc'; phillipsState.shift=0; renderPhillipsCurve();};
  qs('#btnMmMdLeft').onclick=()=>{moneyMarketState.mdShift=shiftCurve(moneyMarketState.mdShift,-1); renderMoneyMarketDiagram();};
  qs('#btnMmMdRight').onclick=()=>{moneyMarketState.mdShift=shiftCurve(moneyMarketState.mdShift,1); renderMoneyMarketDiagram();};
  qs('#btnMmMsLeft').onclick=()=>{moneyMarketState.msShift=shiftCurve(moneyMarketState.msShift,-1); renderMoneyMarketDiagram();};
  qs('#btnMmMsRight').onclick=()=>{moneyMarketState.msShift=shiftCurve(moneyMarketState.msShift,1); renderMoneyMarketDiagram();};
  qs('#btnMmReset').onclick=()=>{moneyMarketState.mdShift=0; moneyMarketState.msShift=0; moneyMarketState.policyRate=4.0; const slider=qs('#mmPolicyRate'); if(slider) slider.value='4.0'; renderMoneyMarketDiagram();};
  qs('#mmPolicyRate').oninput=e=>{moneyMarketState.policyRate=Number(e.target.value); renderMoneyMarketDiagram();};
  qs('#btnAdCompCDown').onclick=()=>{aggregateDemandState.cShift=shiftCurve(aggregateDemandState.cShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompCUp').onclick=()=>{aggregateDemandState.cShift=shiftCurve(aggregateDemandState.cShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompIDown').onclick=()=>{aggregateDemandState.iShift=shiftCurve(aggregateDemandState.iShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompIUp').onclick=()=>{aggregateDemandState.iShift=shiftCurve(aggregateDemandState.iShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompGDown').onclick=()=>{aggregateDemandState.gShift=shiftCurve(aggregateDemandState.gShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompGUp').onclick=()=>{aggregateDemandState.gShift=shiftCurve(aggregateDemandState.gShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompNXDown').onclick=()=>{aggregateDemandState.nxShift=shiftCurve(aggregateDemandState.nxShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompNXUp').onclick=()=>{aggregateDemandState.nxShift=shiftCurve(aggregateDemandState.nxShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompReset').onclick=()=>{aggregateDemandState.cShift=0;aggregateDemandState.iShift=0;aggregateDemandState.gShift=0;aggregateDemandState.nxShift=0; renderAggregateDemandComponents();};
  qs('#btnPresetRecession').onclick=()=>applyPresetScenario('recession');
  qs('#btnPresetInflation').onclick=()=>applyPresetScenario('inflation');
  qs('#btnPresetGrowth').onclick=()=>applyPresetScenario('growth');
  qs('#btnExportPcPng').onclick=()=>exportPhillipsCurvePng();
  qs('#btnExportMmPng').onclick=()=>exportMoneyMarketPng();
  renderPhillipsCurve();
  renderMoneyMarketDiagram();
  renderAggregateDemandComponents();
  renderFlashcardModule();
  updateLearnSnapshot();
}

function buildInvestigationBrief(){
  const cur={adShiftY:state.adShiftY,asShiftP:state.asShiftP,yFe:state.yFe};
  const eq=equilibrium(cur);
  const caseLine=CLASSROOM_INVESTIGATIONS[Math.floor(Math.random()*CLASSROOM_INVESTIGATIONS.length)];
  const policy=policyCards[Math.floor(Math.random()*policyCards.length)];
  const outputGap=eq.y-cur.yFe;
  const gapValue=outputGap===0 ? '0.0' : `${outputGap>0?'+':'-'}${Math.abs(outputGap).toFixed(1)}`;
  const gapLabel=outputGap>0 ? 'inflationary gap' : outputGap<0 ? 'recessionary gap' : 'balanced gap';
  const adDescriptor=cur.adShiftY>0 ? 'rightward' : cur.adShiftY<0 ? 'leftward' : 'neutral';
  const asDescriptor=cur.asShiftP>0 ? 'leftward' : cur.asShiftP<0 ? 'rightward' : 'neutral';
  return [
    'Investigation brief (IB Macro — AD/AS)',
    `Scenario prompt: ${caseLine}`,
    `Assigned policy lens: ${policy.name} — ${policy.definition}`,
    '',
    'Model snapshot:',
    `- Model anchor: Y = ${eq.y.toFixed(1)}, P = ${eq.p.toFixed(1)}, potential output Yf = ${cur.yFe.toFixed(1)}`,
    `- Short-run output gap: ${gapValue} (${gapLabel})`,
    `- Slider signals: AD ${adDescriptor} ${Math.abs(cur.adShiftY).toFixed(1)} units, SRAS shift ${asDescriptor} ${Math.abs(cur.asShiftP).toFixed(1)} units`,
    '',
    'Investigation steps (IB command terms):',
    '1) Analyse the scenario and policy lens: decide which curve moves first, name the transmission channel, and justify the direction using cause-and-effect language.',
    '2) Draw and label the AD/AS diagram: show the starting point, the new curve position, and the revised short-run equilibrium (P & Y) relative to the anchor.',
    '3) Explain the short-run outcome (inflation, output, employment) then contrast it with the long-run path anchored at Yf, noting any lags or confidence effects.',
    '4) Evaluate trade-offs: weigh the policy objective against a clear limit (crowding out, capacity constraints, inflation expectations, or external factors) and recommend whether to augment or pause the policy.',
    '',
    'Deliverables:',
    '- A labelled AD/AS sketch with arrows for curve shifts and annotations for price/output moves.',
    '- A four-sentence written evaluation covering short run, long run, a policy trade-off, a policy limit, and one stated assumption.',
    '- Use syllabus-aligned vocabulary (Analyse, Explain, Evaluate, Justify) and cite the dominant transmission channel.',
    '',
    `Current reference frame: AD shift = ${cur.adShiftY.toFixed(1)} (${adDescriptor}), AS shift = ${cur.asShiftP.toFixed(1)} (${asDescriptor})`,
    `Use the ${policy.name} lens to anchor your policy recommendation.`
  ].join('\n');
}

function updateLearnSnapshot(){
  const host=qs('#learnSnapshot');
  if(!host) return;
  const cur={adShiftY:state.adShiftY,asShiftP:state.asShiftP,yFe:state.yFe};
  const eq=equilibrium(cur);
  const outputGap=eq.y-cur.yFe;
  host.innerHTML=`
    <div class="policy__name">Live classroom snapshot</div>
    <div class="policy__text">Y = <b>${eq.y.toFixed(1)}</b>, P = <b>${eq.p.toFixed(1)}</b>, Yf = <b>${cur.yFe.toFixed(1)}</b>, output gap = <b>${outputGap>0?'+':''}${outputGap.toFixed(1)}</b>.</div>
    <div class="policy__text">Sentence starter: <i>Identify which curve shifts first (AD via demand factors or AS via cost/productivity factors), then explain how Y and P move at the new equilibrium.</i></div>`;
}

function renderPhillipsCurve(){
  const svg=qs('#pcSvg');
  const caption=qs('#pcCaption');
  const modeBtn=qs('#btnPcMode');
  if(!svg||!caption||!modeBtn) return;
  modeBtn.textContent=`Mode: ${phillipsState.mode==='srpc'?'SRPC':'LRPC'}`;
  const W=560,H=300,pad={l:64,r:20,t:20,b:46};
  const x=u=>pad.l+((u-1.5)/8.5)*(W-pad.l-pad.r);
  const y=i=>pad.t+((11.5-i)/10.5)*(H-pad.t-pad.b);
  const shiftPx=phillipsState.shift*22;
  const naturalU=phillipsState.naturalU;
  const modeIsSrpc=phillipsState.mode==='srpc';
  const srpcInflation=u=>computePhillipsInflation(u,naturalU,phillipsState.inflation,phillipsState.shift);
  const srpcPoints=[];
  for(let u=2; u<=10; u+=0.25){
    srpcPoints.push([x(u)+shiftPx,y(srpcInflation(u))]);
  }
  const srpcPath=buildCatmullRomPath(srpcPoints);
  const highlightBaseU=modeIsSrpc?clamp(naturalU-phillipsState.shift*0.35,2.2,9.2):naturalU;
  const highlightInfl=modeIsSrpc?srpcInflation(highlightBaseU):phillipsState.inflation;
  const highlightX=x(highlightBaseU)+(modeIsSrpc?shiftPx:shiftPx*0.35);
  const highlightY=y(highlightInfl);
  const labelAnchorU=Math.min(8.2,Math.max(6.2,highlightBaseU+1.1));
  const srpcLabelX=x(labelAnchorU)+shiftPx;
  const srpcLabelY=clamp(y(srpcInflation(labelAnchorU))-11,pad.t+20,H-pad.b-18);
  const lrX=x(naturalU)+shiftPx;

  svg.innerHTML=`
    <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="rgba(255,255,255,0.02)"/>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <text x="${W/2}" y="${H-12}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12">Unemployment rate (%)</text>
    <text x="18" y="${H/2}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12" transform="rotate(-90 18 ${H/2})">Inflation rate (%)</text>
    <g opacity="0.9">
      <path d="${srpcPath}" fill="none" stroke="rgba(59,130,246,0.95)" stroke-width="4" stroke-linecap="round"/>
      <text x="${srpcLabelX}" y="${srpcLabelY}" fill="rgba(59,130,246,0.95)" font-size="11" font-weight="700">SRPC</text>
      <line x1="${lrX}" y1="${pad.t+4}" x2="${lrX}" y2="${H-pad.b}" stroke="rgba(239,68,68,0.95)" stroke-width="3" stroke-dasharray="${phillipsState.mode==='lrpc'?'':'7 5'}"/>
      <text x="${lrX+6}" y="${pad.t+18}" fill="rgba(239,68,68,0.95)" font-size="11" font-weight="700">LRPC</text>
      <circle cx="${highlightX}" cy="${highlightY}" r="5" fill="rgba(250,204,21,0.95)">
        <animate attributeName="cx" dur="260ms" to="${highlightX}" fill="freeze" />
        <animate attributeName="cy" dur="260ms" to="${highlightY}" fill="freeze" />
      </circle>
    </g>`;

  caption.textContent=modeIsSrpc
    ? 'SRPC mode: short-run trade-off – lower unemployment costs higher inflation. Shift buttons move the whole curve and the highlighted point follows the new trade-off.'
    : 'LRPC mode: unemployment tends to return near the natural rate in the long run (vertical LRPC), while inflation can vary.';
}

function computePhillipsInflation(u,naturalU,baseInflation,shift){
  const distance=u-naturalU;
  const slope=0.82;
  const curvature=Math.pow(distance,2)*0.034;
  const shiftImpact=shift*0.45;
  return clamp(baseInflation+shiftImpact-distance*slope+curvature,1.4,11.8);
}

function buildCatmullRomPath(points){
  if(!points.length) return '';
  if(points.length===1) return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  const path=[`M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`];
  for(let i=0;i<points.length-1;i++){
    const p0=i===0?points[i]:points[i-1];
    const p1=points[i];
    const p2=points[i+1];
    const p3=i+2<points.length?points[i+2]:p2;
    const cp1x=p1[0]+(p2[0]-p0[0])/6;
    const cp1y=p1[1]+(p2[1]-p0[1])/6;
    const cp2x=p2[0]-(p3[0]-p1[0])/6;
    const cp2y=p2[1]-(p3[1]-p1[1])/6;
    path.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`);
  }
  return path.join(' ');
}

function renderMoneyMarketDiagram(){
  const svg=qs('#moneyMarketSvg');
  const caption=qs('#moneyMarketCaption');
  const rateOut=qs('#mmPolicyRateVal');
  if(!svg||!caption||!rateOut) return;
  const W=560,H=300,pad={l:64,r:20,t:20,b:46};
  const x=q=>pad.l+((q-35)/130)*(W-pad.l-pad.r);
  const y=i=>pad.t+((11.5-i)/10.5)*(H-pad.t-pad.b);
  const config=MONEY_MARKET_CONFIG;
  const eqQuantity=clamp(config.baseMsQuantity+moneyMarketState.msShift*config.msShiftQuantityImpact,config.qBounds[0],config.qBounds[1]);
  const eqInterestRaw=moneyMarketState.policyRate+moneyMarketState.mdShift*config.mdShiftImpact-moneyMarketState.msShift*config.msShiftInterestImpact;
  const eqInterest=clamp(eqInterestRaw,config.interestBounds[0],config.interestBounds[1]);
  const intercept=eqInterest-config.slope*eqQuantity;
  const mdLinePoints=[
    [config.qRange[0],intercept+config.slope*config.qRange[0]],
    [config.qRange[1],intercept+config.slope*config.qRange[1]]
  ];
  const eqX=x(eqQuantity);
  const eqY=y(eqInterest);
  rateOut.textContent=`${moneyMarketState.policyRate.toFixed(1)}%`;

  svg.innerHTML=`
    <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="rgba(255,255,255,0.02)"/>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <text x="${W/2}" y="${H-12}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12">Quantity of money</text>
    <text x="18" y="${H/2}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12" transform="rotate(-90 18 ${H/2})">Interest rate (%)</text>
  `;

  strokePath(svg,pathFromPoints(x,y,mdLinePoints),'rgba(59,130,246,0.95)',4);
  const msX=x(eqQuantity);
  line(svg,msX,pad.t+6,msX,H-pad.b,'rgba(34,197,94,0.95)',4);
  line(svg,pad.l,eqY,eqX-8,eqY,'rgba(250,204,21,0.6)',1.2,'4 4');
  line(svg,eqX,eqY+8,eqX,H-pad.b,'rgba(250,204,21,0.6)',1.2,'4 4');
  point(svg,eqX,eqY,5,'rgba(250,204,21,0.95)');
  text(svg,msX+6,pad.t+18,'Ms','start','rgba(34,197,94,0.95)',11,true);
  text(svg,x(mdLinePoints[0][0])+8,y(mdLinePoints[0][1])-8,'Md','start','rgba(59,130,246,0.95)',11,true);
  text(svg,pad.l-10,eqY+4,`${eqInterest.toFixed(1)}%`,'end','rgba(250,204,21,0.95)',11,true);
  text(svg,eqX,H-pad.b+18,`Q ≈ ${eqQuantity.toFixed(0)}`,'middle','rgba(250,204,21,0.95)',11,true);
  boxedLabel(svg,eqX+48,eqY-24,'Equilibrium','rgba(250,204,21,0.95)',{fill:'rgba(6,11,22,0.92)'});

  caption.innerHTML=`<b>Money market equilibrium</b>: i ≈ ${eqInterest.toFixed(1)}%, Q ≈ ${eqQuantity.toFixed(0)}. The golden dot marks where downward-sloping Md (blue) meets vertical Ms (green). Policy rate slider lifts/lowers the Md intercept, the Md shift buttons move demand up/down, and the Ms buttons slide the supply column horizontally.`;
}

function renderAggregateDemandComponents(){
  const svg=qs('#adComponentsSvg');
  const caption=qs('#adComponentsCaption');
  if(!svg||!caption) return;
  const W=560,H=300,pad={l:64,r:20,t:20,b:46};
  const x=q=>pad.l+((q-40)/120)*(W-pad.l-pad.r);
  const y=p=>pad.t+((11.5-p)/10.5)*(H-pad.t-pad.b);
  const adShift=(aggregateDemandState.cShift+aggregateDemandState.iShift+aggregateDemandState.gShift+aggregateDemandState.nxShift)*8;
  const eqQ=clamp(92+adShift*0.8,45,155);
  const eqP=clamp(5.6+adShift*0.03,1.3,10.8);

  const adStartX=x(52+adShift), adEndX=x(148+adShift);
  const srasStartX=x(52), srasEndX=x(150);
  svg.innerHTML=`
    <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="rgba(255,255,255,0.02)"/>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <text x="${W/2}" y="${H-12}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12">Real output (Y)</text>
    <text x="18" y="${H/2}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12" transform="rotate(-90 18 ${H/2})">Price level (P)</text>
    <line x1="${adStartX}" y1="${y(10.3)}" x2="${adEndX}" y2="${y(2.0)}" stroke="rgba(239,68,68,0.95)" stroke-width="4" stroke-linecap="round"/>
    <text x="${x(132+adShift)}" y="${y(2.8)}" fill="rgba(239,68,68,0.95)" font-size="11" font-weight="700">AD</text>
    <line x1="${srasStartX}" y1="${y(2.2)}" x2="${srasEndX}" y2="${y(10.2)}" stroke="rgba(59,130,246,0.95)" stroke-width="4" stroke-linecap="round"/>
    <text x="${x(134)}" y="${y(9.7)}" fill="rgba(59,130,246,0.95)" font-size="11" font-weight="700">SRAS</text>
    <circle cx="${x(eqQ)}" cy="${y(eqP)}" r="5" fill="rgba(250,204,21,0.95)"/>
  `;

  caption.textContent=`AD components: C ${aggregateDemandState.cShift>=0?'+':''}${aggregateDemandState.cShift}, I ${aggregateDemandState.iShift>=0?'+':''}${aggregateDemandState.iShift}, G ${aggregateDemandState.gShift>=0?'+':''}${aggregateDemandState.gShift}, (X−M) ${aggregateDemandState.nxShift>=0?'+':''}${aggregateDemandState.nxShift}. Net AD shift changes equilibrium against SRAS.`;
}

function applyPresetScenario(kind){
  const profileId=PRESET_PROFILE_IDS[kind];
  if(!profileId) return;
  const profile=SHIFT_PROFILES[profileId];
  if(!profile) return;
  state.params=applyShiftProfile(deepCopy(defaults.params),profile);
  onParamsChanged(true);
  const fb=qs('#presetFeedback');
  if(fb) fb.textContent=profile.note||'Preset loaded.';
}

function loadFlashcardProgress(){
  try{
    const raw=JSON.parse(localStorage.getItem(FLASHCARD_STORAGE_KEY)||'{}');
    return raw&&typeof raw==='object'?raw:{};
  }catch{return {};}
}
function saveFlashcardProgress(){
  localStorage.setItem(FLASHCARD_STORAGE_KEY,JSON.stringify(flashcardProgress));
}
function getFlashcardMeta(term){
  const existing=flashcardProgress[term];
  if(existing&&typeof existing==='object') return existing;
  const fresh={ease:2.5,intervalDays:0,dueAt:0,reps:0,lapses:0,lastResult:null,lastReviewAt:0};
  flashcardProgress[term]=fresh;
  return fresh;
}
function dueFlashcardsNow(){
  const now=Date.now();
  return GLOSSARY.filter(card=>(getFlashcardMeta(card.term).dueAt||0)<=now);
}
function nextFlashcardCard(){
  const due=dueFlashcardsNow();
  if(due.length) return due.sort((a,b)=>(getFlashcardMeta(a.term).dueAt||0)-(getFlashcardMeta(b.term).dueAt||0))[0];
  return GLOSSARY.slice().sort((a,b)=>(getFlashcardMeta(a.term).dueAt||0)-(getFlashcardMeta(b.term).dueAt||0))[0]||null;
}
function gradeFlashcard(term,quality){
  const q=clamp(Number(quality),0,5);
  const meta=getFlashcardMeta(term);
  const now=Date.now();
  if(q<3){
    meta.reps=0;
    meta.intervalDays=1;
    meta.lapses=(meta.lapses||0)+1;
  }else{
    meta.reps=(meta.reps||0)+1;
    if(meta.reps===1) meta.intervalDays=1;
    else if(meta.reps===2) meta.intervalDays=3;
    else meta.intervalDays=Math.max(1,Math.round((meta.intervalDays||3)*meta.ease));
  }
  meta.ease=Math.max(1.3,Number(((meta.ease||2.5)+(0.1-(5-q)*(0.08+(5-q)*0.02))).toFixed(2)));
  meta.lastResult=q;
  meta.lastReviewAt=now;
  meta.dueAt=now+Math.max(1,meta.intervalDays)*24*60*60*1000;
  saveFlashcardProgress();
}
function resetFlashcards(){
  flashcardProgress={};
  saveFlashcardProgress();
}
function renderFlashcardModule(){
  const root=qs('#flashcardRoot');
  if(!root) return;
  const dueCount=dueFlashcardsNow().length;
  const nextCard=nextFlashcardCard();
  if(!nextCard){
    root.innerHTML='<div class="policy__text">No glossary cards available.</div>';
    return;
  }
  const meta=getFlashcardMeta(nextCard.term);
  const dueLabel=meta.dueAt&&meta.dueAt>Date.now()?`Next due: ${new Date(meta.dueAt).toLocaleString()}`:'Due now';
  root.innerHTML=`
    <div class="learnCard">
      <div class="policy__name">Card (${dueCount} due)</div>
      <div class="policy__text"><b>${escapeHtml(nextCard.term)}</b></div>
      <div id="flashcardAnswer" class="policy__text hidden">${escapeHtml(nextCard.blurb)}</div>
      <div class="policy__text">${escapeHtml(dueLabel)} · interval ${meta.intervalDays||0}d · ease ${Number(meta.ease||2.5).toFixed(2)}</div>
      <div class="scenarioToolbar learnActions">
        <button id="btnFlashReveal" class="btn btn--primary" type="button">Reveal definition</button>
        <button id="btnFlashAgain" class="btn btn--ghost hidden" type="button">Again</button>
        <button id="btnFlashHard" class="btn btn--ghost hidden" type="button">Hard</button>
        <button id="btnFlashGood" class="btn btn--ghost hidden" type="button">Good</button>
        <button id="btnFlashEasy" class="btn btn--ghost hidden" type="button">Easy</button>
        <button id="btnFlashReset" class="btn btn--ghost" type="button">Reset SRS</button>
      </div>
    </div>`;
  const answer=qs('#flashcardAnswer');
  const reveal=qs('#btnFlashReveal');
  const gradeBtns=[qs('#btnFlashAgain'),qs('#btnFlashHard'),qs('#btnFlashGood'),qs('#btnFlashEasy')];
  reveal.onclick=()=>{
    answer.classList.remove('hidden');
    reveal.classList.add('hidden');
    gradeBtns.forEach(b=>b.classList.remove('hidden'));
  };
  qs('#btnFlashAgain').onclick=()=>{gradeFlashcard(nextCard.term,1); renderFlashcardModule();};
  qs('#btnFlashHard').onclick=()=>{gradeFlashcard(nextCard.term,3); renderFlashcardModule();};
  qs('#btnFlashGood').onclick=()=>{gradeFlashcard(nextCard.term,4); renderFlashcardModule();};
  qs('#btnFlashEasy').onclick=()=>{gradeFlashcard(nextCard.term,5); renderFlashcardModule();};
  qs('#btnFlashReset').onclick=()=>{resetFlashcards(); renderFlashcardModule(); showStatus('Flashcard progress reset');};
}

function renderAssessPanel(){
  const root=qs('#panelAssess');
  const questions=buildQuizQuestions(GLOSSARY);
  const practice=buildPracticeFromConcepts(GLOSSARY);
  const attempts=progress.quizAttempts||[];
  const avg=attempts.length?(attempts.reduce((a,b)=>a+b.score,0)/attempts.length).toFixed(1):'—';
  root.innerHTML=`
    <div class="sectionTitle">Formative quiz + progress dashboard</div>
    <div class="learnCard"><b>Attempts:</b> ${attempts.length} &nbsp; <b>Average score:</b> ${avg}%</div>
    <div class="sectionHint">Uses existing Macrow glossary terms only. Instant feedback is shown after each response.</div>
    <div id="quizRoot"></div>
    <div class="sectionTitle">Competency-based path</div>
    <div class="learnCard" id="competencyRoot"></div>
    <div class="sectionTitle">Practice prompts</div>
    ${practice.map(p=>`<div class="learnCard"><b>${p.competency}</b><div class="policy__text">${escapeHtml(p.prompt)}</div></div>`).join('')}
  `;
  const quizHost=qs('#quizRoot');
  quizHost.innerHTML=questions.map((q,i)=>`<div class="learnCard"><div><b>Q${i+1}.</b> ${escapeHtml(q.prompt)}</div><div class="scenarioToolbar">${q.options.map(o=>`<button class="btn btn--ghost" data-q="${q.id}" data-a="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div><div id="fb_${q.id}" class="policy__text"></div></div>`).join('');
  quizHost.onclick=e=>{
    const b=e.target.closest('[data-q]'); if(!b) return;
    const q=questions.find(x=>x.id===b.dataset.q); if(!q) return;
    const ok=b.dataset.a===q.answer;
    qs(`#fb_${q.id}`).textContent=ok
      ?`✅ Correct. ${q.explanation||`Competency: ${q.competency}`}`
      :`❌ Not quite. Correct answer: ${q.answer}. ${q.explanation||''}`;
    progress.competencies[q.competency]=(progress.competencies[q.competency]||0)+(ok?1:0);
    saveProgress(progress);
  };
  qs('#competencyRoot').innerHTML=['AD-AS Foundations','Policy Analysis','Evaluation','Diagram Reasoning','Evaluation Writing'].map(k=>`<div class="policy__text"><b>${k}</b>: ${progress.competencies?.[k]||0} mastery points</div>`).join('');
  qs('#competencyRoot').insertAdjacentHTML('beforeend','<button id="btnSubmitQuiz" class="btn btn--primary">Record quiz attempt (auto score from feedback)</button>');
  qs('#btnSubmitQuiz').onclick=()=>{
    const score=Math.min(100,Math.round((Object.values(progress.competencies||{}).reduce((a,b)=>a+b,0)%10)/10*100));
    progress.quizAttempts=[...(progress.quizAttempts||[]),{ts:Date.now(),score}].slice(-30);
    saveProgress(progress);
    renderAssessPanel();
  };
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
      <label class="toggle"><input id="toggleAssess" type="checkbox"/><span>Enable Assess tab (dev testing only)</span></label>
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
  };
  qs('#btnOpenShortcuts').onclick=openShortcuts;
}
function syncParamReadouts(){paramDefs.forEach(d=>{qs(`#val_${d.key}`).textContent=d.format(state.params[d.key]); qs(`#rng_${d.key}`).value=state.params[d.key];});}

qs('#btnReset').onclick=()=>{state.params=deepCopy(defaults.params); onParamsChanged(true);};
qs('#btnMakeRecession').onclick=()=>{state.params=applyShiftProfile(deepCopy(defaults.params),SHIFT_PROFILES.preset_recession); onParamsChanged(true);};
qs('#btnMakeDemandPull').onclick=()=>{state.params=applyShiftProfile(deepCopy(defaults.params),SHIFT_PROFILES.preset_inflation); onParamsChanged(true);};
qs('#btnMakeCostPush').onclick=()=>{state.params=applyShiftProfile(deepCopy(defaults.params),SHIFT_PROFILES.cost_push); onParamsChanged(true);};
qs('#btnClearGap').onclick=()=>{state.params=deepCopy(defaults.params); onParamsChanged(true);};
qs('#toggleAxisNumbers').onchange=e=>{settings.showAxisNumbers=e.target.checked; localStorage.setItem('macrow_show_axis_numbers',settings.showAxisNumbers?'1':'0'); renderMainChart();}; qs('#toggleAxisNumbers').checked=settings.showAxisNumbers;
qs('#btnExportPng').onclick=()=>exportChartPng();

let pendingRender=false;
function queueRender(){
  if(pendingRender) return;
  pendingRender=true;
  requestAnimationFrame(()=>{pendingRender=false; renderMainChart();});
}
function onParamsChanged(pushHistory=false){
  Object.assign(state,computeFromParams(state.params));
  syncParamReadouts();
  updateLearnSnapshot();
  queueRender();
  const sharePanel=qs('#sharePanel');
  if(sharePanel && !sharePanel.classList.contains('hidden')) refreshShareLinkPreview();
  if(pushHistory) pushPolicyHistory();
}
function pushPolicyHistory(){const stamp={ts:Date.now(),params:deepCopy(state.params)}; state.history=state.history.slice(0,state.historyIndex+1); state.history.push(stamp); state.historyIndex=state.history.length-1;}
function replayHistory(dir){if(!state.history.length)return; state.historyIndex=clamp(state.historyIndex+dir,0,state.history.length-1); state.params=deepCopy(state.history[state.historyIndex].params); onParamsChanged(false);}

function renderMainChart(){const svg=qs('#chartSvg'); svg.innerHTML=''; const W=860,H=560,pad={l:86,r:28,t:20,b:78},x=Y=>pad.l+((Y-GRAPH.Ymin)/(GRAPH.Ymax-GRAPH.Ymin))*(W-pad.l-pad.r),y=P=>pad.t+(1-(P-GRAPH.Pmin)/(GRAPH.Pmax-GRAPH.Pmin))*(H-pad.t-pad.b);
rect(svg,0,0,W,H,18,'rgba(255,255,255,0.02)'); [30,50,70,90,110].forEach(P=>{line(svg,pad.l,y(P),W-pad.r,y(P),'rgba(148,163,184,0.10)',1); if(settings.showAxisNumbers) text(svg,pad.l-10,y(P)+4,String(P),'end','rgba(148,163,184,0.70)',12);}); [60,90,120,150,180].forEach(Y=>{line(svg,x(Y),pad.t,x(Y),H-pad.b,'rgba(148,163,184,0.08)',1); if(settings.showAxisNumbers) text(svg,x(Y),H-pad.b+22,String(Y),'middle','rgba(148,163,184,0.70)',12);}); line(svg,pad.l,pad.t,pad.l,H-pad.b,'rgba(226,232,240,0.70)',3); line(svg,pad.l,H-pad.b,W-pad.r,H-pad.b,'rgba(226,232,240,0.70)',3); text(svg,(pad.l+(W-pad.r))/2,H-18,'Real GDP ($)','middle','rgba(226,232,240,0.92)',15,true); textRot(svg,22,(pad.t+(H-pad.b))/2,'Average Price Level ($)',-90,'middle','rgba(226,232,240,0.92)',15,true);
const cur={adShiftY:state.adShiftY,asShiftP:state.asShiftP,yFe:state.yFe}, base=computeFromParams(defaults.params);
const baseEq=equilibrium(base),curEq=equilibrium(cur);
const hasShift=Math.abs(curEq.y-baseEq.y)>0.15||Math.abs(curEq.p-baseEq.p)>0.15;
drawCurveSet(svg,x,y,base,'rgba(255,255,255,0.22)',true,{showLabels:false});
drawCurveSet(svg,x,y,cur,null,false,{showLabels:true});
if(state.compare.on && state.compare.snapshot){
  drawCurveSet(svg,x,y,computeFromParams(state.compare.snapshot),'rgba(250,204,21,.9)',false,{dash:'6 7',showLabels:false});
}
drawEquilibriumGuides(svg,x,y,baseEq,curEq,pad,H,{showSecond:hasShift});
addGraphTooltips(svg,x,y,cur); renderState(base,cur);
}
function drawCurveSet(svg,x,y,v,tint,muted=false,opt={}){
  const {dash,showLabels=true}=opt;
  const ad=adLineSegment(v.adShiftY).seg;
  if(ad) strokePath(svg,pathFromSegment(x,y,ad),tint||'rgba(239,68,68,0.95)',muted?4:6,dash);
  const as=ASshape(v);
  strokePath(svg,pathFromPoints(x,y,as.pts),tint||'rgba(59,130,246,0.95)',muted?4:6,dash);
  if(!showLabels) return;
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

function addGraphTooltips(svg,xScale,yScale,cur){const tip=qs('#chartTooltip'); const as=ASshape(cur); const items=[{label:'Aggregate Demand (AD)',text:'Total spending: C + I + G + (X−M).',x:invertAD_Y(75,cur.adShiftY),y:75},{label:'Short-run Aggregate Supply',text:'Output producers are willing to supply at each price level.',x:as.yKink+8,y:60},{label:'Yf (potential output)',text:'Potential output where SRAS reaches the vertical LRAS segment.',x:as.yFe,y:as.pEnd},{label:'Real GDP axis',text:'Horizontal axis shows real output (Y).',x:120,y:22},{label:'Price level axis',text:'Vertical axis shows the average price level (P).',x:43,y:70}]; items.forEach(it=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('cx',xScale(it.x)); c.setAttribute('cy',yScale(it.y)); c.setAttribute('r','11'); c.setAttribute('fill','transparent'); c.setAttribute('tabindex','0'); c.setAttribute('aria-label',`${it.label} info`); c.style.cursor='help'; c.onmouseenter=c.onfocus=e=>{tip.innerHTML=`<b>${it.label}</b><br>${it.text}`; tip.classList.remove('hidden'); tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; c.onmouseleave=c.onblur=()=>tip.classList.add('hidden'); c.onmousemove=e=>{tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; svg.appendChild(c);});}

function drawEquilibriumGuides(svg,x,y,baseEq,curEq,pad,H,opt={}){
  const {showSecond=true}=opt;
  const xAxisY=H-pad.b;
  const yAxisX=pad.l;
  const eqGap=Math.hypot(x(baseEq.y)-x(curEq.y),y(baseEq.p)-y(curEq.p));
  const bounds={left:84,right:832,top:22,bottom:482};
  const axisLabel=(cx,cy,label,stroke)=>{
    const w=Math.max(36,label.length*7.2+14),h=20;
    const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');
    [['x',cx-w/2],['y',cy-h/2],['width',w],['height',h],['rx',9],['fill','rgba(11,18,32,0.85)'],['stroke',stroke],['stroke-width','1.5']].forEach(([k,v])=>bg.setAttribute(k,v));
    svg.appendChild(bg);
    text(svg,cx,cy+4,label,'middle','rgba(241,245,249,0.96)',12,true);
    return {x:cx,y:cy,w,h};
  };
  const safeAxisLabel=(cx,cy,label,stroke,padPx=14)=>{
    const pos=clampLabelPos({x:cx,y:cy},bounds,padPx);
    return axisLabel(pos.x,pos.y,label,stroke);
  };
  const eqLabel=(pt,label,color,dx,dy)=>{
    const pos=clampLabelPos({x:x(pt.y)+dx,y:y(pt.p)+dy},bounds,18);
    boxedLabel(svg,pos.x,pos.y,label,color,{fill:'rgba(6,11,22,0.9)'});
  };
  const drawAxisTicks=(pt,color)=>{
    line(svg,yAxisX-7,y(pt.p),yAxisX+7,y(pt.p),color,2);
    line(svg,x(pt.y),xAxisY-7,x(pt.y),xAxisY+7,color,2);
  };
  const placePLabel=(axisY,label,color,tier=0)=>{
    const lx=yAxisX+30+tier*46;
    const box=safeAxisLabel(lx,axisY,label,color,16);
    line(svg,yAxisX+8,axisY,box.x-box.w/2-5,axisY,color,1.4,'4 4');
    return box;
  };
  const placeYLabel=(axisX,label,color,tier=0)=>{
    const ly=xAxisY-18-tier*28;
    const box=safeAxisLabel(axisX,ly,label,color,16);
    line(svg,axisX,xAxisY-8,axisX,box.y+box.h/2+4,color,1.4,'4 4');
    return box;
  };
  const drawPoint=(pt,tag,color,opt={})=>{
    const eqTag=opt.eqTag||`E${tag}`;
    const eqOffset=opt.eqOffset||[18,-20];
    line(svg,pad.l,y(pt.p),x(pt.y),y(pt.p),color,1.6,'5 6');
    line(svg,x(pt.y),y(pt.p),x(pt.y),H-pad.b,color,1.6,'5 6');
    point(svg,x(pt.y),y(pt.p),5,color);
    drawAxisTicks(pt,color);
    eqLabel(pt,eqTag,color,eqOffset[0],eqOffset[1]);
  };

  const baseColor='rgba(148,163,184,0.95)',curColor='rgba(248,250,252,0.95)';
  if(!showSecond||eqGap<5){
    drawPoint(curEq,'1',curColor,{eqTag:'E1',eqOffset:[22,-18]});
    placePLabel(y(curEq.p),'P1',curColor,0);
    placeYLabel(x(curEq.y),'Y1',curColor,0);
    return;
  }
  drawPoint(baseEq,'1',baseColor);
  drawPoint(curEq,'2',curColor,{eqOffset:[24,18]});

  const p1Y=y(baseEq.p),p2Y=y(curEq.p),pClose=Math.abs(p1Y-p2Y)<26;
  placePLabel(p1Y,'P1',baseColor,0);
  placePLabel(p2Y,'P2',curColor,pClose?1:0);

  const y1X=x(baseEq.y),y2X=x(curEq.y),yClose=Math.abs(y1X-y2X)<44;
  if(!yClose){
    placeYLabel(y1X,'Y1',baseColor,0);
    placeYLabel(y2X,'Y2',curColor,0);
  }else{
    const leftIsBase=y1X<=y2X;
    const left=leftIsBase?{x:y1X,label:'Y1',color:baseColor}:{x:y2X,label:'Y2',color:curColor};
    const right=leftIsBase?{x:y2X,label:'Y2',color:curColor}:{x:y1X,label:'Y1',color:baseColor};
    placeYLabel(left.x,left.label,left.color,0);
    placeYLabel(right.x,right.label,right.color,1);
  }

  if(Math.abs(curEq.p-baseEq.p)>0.5){
    line(svg,yAxisX+12,p1Y,yAxisX+12,p2Y,'rgba(244,114,182,0.95)',2.1);
    text(svg,yAxisX+22,(p1Y+p2Y)/2+4,'P1 → P2','start','rgba(244,114,182,0.95)',12,true);
  }
  if(Math.abs(curEq.y-baseEq.y)>0.5){
    const deltaY=clamp(Math.min(p1Y,p2Y)-34,pad.t+26,xAxisY-86);
    line(svg,y1X,deltaY,y2X,deltaY,'rgba(56,189,248,0.95)',2.1);
    text(svg,(y1X+y2X)/2,deltaY-8,'Y1 → Y2','middle','rgba(56,189,248,0.95)',12,true);
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
async function shareScenarioURL(){const url=buildScenarioURL(getScenarioForShare()); try{await navigator.clipboard?.writeText(url); alert('Scenario URL copied.');}catch{prompt('Copy scenario URL:',url);}}
async function exportScenarioQr(){
  const area=qs('#qrArea');
  area.classList.remove('hidden');
  area.innerHTML='';
  await renderScenarioQrPreview(area,{width:320,headingText:'QR ready. Scan or download.',includeDownload:true});
}

function getScenarioForShare(){
  return {name:'Current',params:deepCopy(state.params),category:'custom'};
}

function refreshShareLinkPreview(){
  const preview=qs('#shareLinkPreview');
  if(!preview) return;
  const link=buildScenarioURL(getScenarioForShare());
  preview.textContent=link;
  preview.classList.remove('hidden');
}

async function copyScenarioShareLink(){
  const link=buildScenarioURL(getScenarioForShare());
  try{
    await navigator.clipboard?.writeText(link);
    showStatus('Scenario share link copied!');
  }catch{
    prompt('Copy scenario URL:',link);
  }
  refreshShareLinkPreview();
}

async function renderScenarioQrPreview(root,opts={}){
  if(!root) return;
  const {width=220,headingText='Scan this QR to load the scenario',includeDownload=false}=opts;
  const payload=getScenarioForShare();
  const link=buildScenarioURL(payload);
  root.classList.remove('hidden');
  root.innerHTML='';
  try{
    await ensureQrLibs();
    const canvas=document.createElement('canvas');
    await QRCode.toCanvas(canvas,link,{width,margin:1,errorCorrectionLevel:'H',color:{dark:'#0f172a',light:'#ffffff'}});
    const ctx=canvas.getContext('2d');
    try{
      const logo=await loadImage('./assets/macrow-logo.png');
      const sz=Math.min(68,canvas.width/2.5);
      const x=(canvas.width-sz)/2;
      const y=(canvas.height-sz)/2;
      ctx.fillStyle='white';
      roundRect(ctx,x-4,y-4,sz+8,sz+8,14);
      ctx.fill();
      ctx.drawImage(logo,x,y,sz,sz);
    }catch{}
    const heading=document.createElement('div');
    heading.className='sectionHint';
    heading.textContent=headingText;
    root.append(heading,canvas);
    if(includeDownload){
      const ctrl=document.createElement('div');
      ctrl.className='sharePreview__controls';
      const downloadBtn=document.createElement('button');
      downloadBtn.className='btn btn--ghost';
      downloadBtn.textContent='Download QR';
      downloadBtn.onclick=()=>downloadCanvas(canvas,`macrow-scenario-${Date.now()}.png`);
      ctrl.append(downloadBtn);
      root.append(ctrl);
    }
  }catch(e){
    root.innerHTML=`<div class="sectionHint">Unable to generate QR right now (${escapeHtml(e?.message||'unknown error')}).</div>`;
  }
}

function initShareTools(){
  const panel=qs('#sharePanel');
  if(!panel) return;
  const opener=qs('#btnOpenSharePanel');
  const closer=qs('#btnCloseSharePanel');
  const copyBtn=qs('#btnShareLinkPanel');
  const qrBtn=qs('#btnShowShareQrPanel');
  const preview=qs('#shareLinkPreview');
  const qrArea=qs('#shareQrPreview');
  opener?.addEventListener('click',()=>{
    panel.classList.remove('hidden');
    refreshShareLinkPreview();
    qrArea?.classList.add('hidden');
  });
  closer?.addEventListener('click',()=>panel.classList.add('hidden'));
  copyBtn?.addEventListener('click',copyScenarioShareLink);
  preview?.addEventListener('click',copyScenarioShareLink);
  qrBtn?.addEventListener('click',()=>renderScenarioQrPreview(qrArea,{width:220,headingText:'Scan this QR to load the same scenario',includeDownload:true}));
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

window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!qs('#welcomeOverlay').classList.contains('hidden'))qs('#welcomeClose').click(); if(!qs('#scenarioOverlay').classList.contains('hidden'))qs('#scenarioClose').click(); if(!qs('#shortcutsOverlay').classList.contains('hidden'))qs('#shortcutsClose').click();} if(e.key==='?'||(e.shiftKey&&e.key==='/')){e.preventDefault(); openShortcuts();} if(e.key==='p')setTab('policies'); if(e.key==='r')setTab('parameters'); if(e.key==='l')setTab('learn'); if(e.key==='q'&&settings.assessEnabled)setTab('assess'); if(e.key==='a')setTab('about'); if(e.key==='s')qs('#btnScenarios').click(); if(e.key==='x')qs('#btnReset').click();});

function applyScenarioFromUrl(){const s=new URLSearchParams(location.search).get('scenario'); if(s){try{const obj=decodeScenario(decodeURIComponent(s)); if(obj.params){state.params={...state.params,...obj.params};}}catch{}}}

function getSvgExportDimensions(svg, overrides={}) {
  const viewBox = svg?.viewBox?.baseVal;
  const attrWidth = Number(svg?.getAttribute('width'));
  const attrHeight = Number(svg?.getAttribute('height'));
  const fallbackWidth = overrides.width ?? 860;
  const fallbackHeight = overrides.height ?? 560;
  const widthFromView = viewBox?.width;
  const heightFromView = viewBox?.height;
  const width = overrides.width ?? (Number.isFinite(widthFromView) && widthFromView > 0 ? widthFromView : (!Number.isNaN(attrWidth) && attrWidth > 0 ? attrWidth : fallbackWidth));
  const height = overrides.height ?? (Number.isFinite(heightFromView) && heightFromView > 0 ? heightFromView : (!Number.isNaN(attrHeight) && attrHeight > 0 ? attrHeight : fallbackHeight));
  return {width,height};
}
async function exportSvgAsPng(svg, options={}) {
  if(!svg) throw new Error('SVG element not available for export.');
  const {width,height} = getSvgExportDimensions(svg, options);
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if(!clone.hasAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const backgroundColor = options.backgroundColor ?? '#0b1220';
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(width));
  bgRect.setAttribute('height', String(height));
  bgRect.setAttribute('fill', backgroundColor);
  clone.insertBefore(bgRect, clone.firstChild);
  const svgMarkup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgMarkup], {type: 'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = e => reject(e || new Error('Failed to render SVG for export.'));
    });
    img.src = url;
    await loadPromise;
    const scale = Math.max(1, options.scale ?? 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if(!ctx) throw new Error('Canvas context unavailable.');
    const canvasBackground = options.canvasBackground ?? backgroundColor;
    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    const prefix = options.filePrefix ?? 'macrow-graph';
    anchor.download = `${prefix}-${Date.now()}.png`;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function exportChartPng() {
  try {
    await exportSvgAsPng(qs('#chartSvg'), {filePrefix: 'macrow-ad-as', backgroundColor: '#0b1220'});
    showStatus('Graph exported as PNG');
  } catch (error) {
    console.error(error);
    showStatus('Graph export failed. Try again.', true);
  }
}
async function exportPhillipsCurvePng() {
  try {
    await exportSvgAsPng(qs('#pcSvg'), {filePrefix: 'macrow-phillips-curve', backgroundColor: '#0b1220'});
    showStatus('Phillips curve exported as PNG');
  } catch (error) {
    console.error(error);
    showStatus('Phillips curve export failed. Try again.', true);
  }
}
async function exportMoneyMarketPng() {
  try {
    await exportSvgAsPng(qs('#moneyMarketSvg'), {filePrefix: 'macrow-money-market', backgroundColor: '#0b1220'});
    showStatus('Money market diagram exported as PNG');
  } catch (error) {
    console.error(error);
    showStatus('Money market export failed. Try again.', true);
  }
}

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
function drawYfPoint(svg,x,y,as,c,muted=false,dash){const px=x(as.yFe),axisY=y(GRAPH.Pmin),stroke=c||'rgba(34,197,94,.9)',markerY=y(as.pEnd); if(dash){line(svg,px,axisY,px,markerY,stroke,1.4,dash);} line(svg,px,axisY,px,markerY,stroke,muted?2.1:2.6); point(svg,px,markerY,muted?3.8:4.6,stroke); text(svg,px,axisY+22,'Yf','middle',stroke,12.5,true); return {x:px,y:axisY+22,w:34,h:20};}
function labelOnAD(svg,x,y,sh,c){const seg=adLineSegment(sh).seg; if(!seg)return null; const Y=lerp(seg[0][0],seg[1][0],.68),P=lerp(seg[0][1],seg[1][1],.68); const base=clampLabelPos({x:x(Y)+24,y:y(P)-24},{left:84,right:832,top:22,bottom:482},22); return boxedLabel(svg,base.x,base.y,'AD',c||'rgba(239,68,68,.95)');}
function labelOnAS(svg,x,y,as,c,adLabel,yfLabel){let pos=clampLabelPos({x:x(as.yKink)+58,y:y(as.pFlat)-20},{left:84,right:832,top:22,bottom:482},22); if(labelsOverlap({x:pos.x,y:pos.y,w:60,h:28},adLabel)){pos=clampLabelPos({x:pos.x+18,y:pos.y-34},{left:84,right:832,top:22,bottom:482},22);} if(labelsOverlap({x:pos.x,y:pos.y,w:60,h:28},yfLabel)){pos=clampLabelPos({x:pos.x-18,y:pos.y+32},{left:84,right:832,top:22,bottom:482},22);} return boxedLabel(svg,pos.x,pos.y,'AS',c||'rgba(59,130,246,.95)');}

function showWelcomeIfNeeded(){const k='macrow_welcome_dismissed_v6'; if(localStorage.getItem(k)==='1')return; const ov=qs('#welcomeOverlay'); ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); const close=(save=false)=>{if(save||qs('#welcomeDontShow').checked)localStorage.setItem(k,'1'); ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true'); document.removeEventListener('keydown',escHandler);}; const escHandler=e=>{if(e.key==='Escape')close(false);}; document.addEventListener('keydown',escHandler); qs('#welcomeClose').onclick=()=>close(false); qs('#welcomeOk').onclick=()=>close(true);}

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
  renderPoliciesPanel();
  renderParametersPanel();
  renderLearnPanel();
  renderAssessPanel();
  renderAboutPanel();
  initScenarioManager();
  initShareTools();
  syncAssessAvailability();
  setTab('policies');
  showWelcomeIfNeeded();
  applyScenarioFromUrl();
  onParamsChanged(true);
}
init();
