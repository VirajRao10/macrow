import { GRAPH as C_GRAPH, defaults as C_DEFAULTS, clamp, lerp, computeFromParams, AD, invertAD_Y, ASshape, equilibrium, adLineSegment } from './js/calculations.js';
import { loadProgress, saveProgress } from './js/storage.js';
import { buildQuizQuestions, buildPracticeFromConcepts } from './js/assessments.js';
import { LEARN_TOPIC_PRACTICE, evaluatePracticeAnswer, computePracticeScore } from './js/learn-practice.js';
import { summarizeTeacherAnalytics } from './js/teacher-analytics.js';
import { normalizeScenarios, addCommentToScenario, formatCommentTimestamp } from './js/scenario-comments.js';
import { buildScenarioUrl, parseScenarioPayloadFromUrl } from './js/scenario-share.js';
import { authenticateUser, registerUser, getActiveUser, setActiveUser, clearActiveUser } from './js/auth.js';
import { storageGet, storageSet } from './js/local-storage.js';

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
const GRAPH=C_GRAPH; const defaults=C_DEFAULTS;
const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s)); const deepCopy=x=>JSON.parse(JSON.stringify(x));
const RESILIENCE_ERROR_DELAY_MS=1200;
const scriptStartTime=Date.now();
let hasRenderedChart=false;

function shouldReportResilienceError(){
  return hasRenderedChart||Date.now()-scriptStartTime>RESILIENCE_ERROR_DELAY_MS;
}

function markChartRendered(){
  hasRenderedChart=true;
}

function onDocumentReady(callback){
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',callback,{once:true});
  } else {
    callback();
  }
}

const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

const THEME_STORAGE_KEY="macrow_theme_mode_v1";
const ThemeMode={DARK:"dark",LIGHT:"light"};
let currentTheme=ThemeMode.DARK;
function detectSystemPrefersDark(){return typeof window!="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("(prefers-color-scheme: dark)").matches;}
function getPreferredTheme(){const stored=storageGet(THEME_STORAGE_KEY);if(stored===ThemeMode.LIGHT||stored===ThemeMode.DARK)return stored;return detectSystemPrefersDark()?ThemeMode.DARK:ThemeMode.LIGHT;}
function applyTheme(theme,{persist=true}={}){const nextTheme=theme===ThemeMode.LIGHT?ThemeMode.LIGHT:ThemeMode.DARK;currentTheme=nextTheme;const body=document.body;if(body)body.dataset.theme=nextTheme;if(persist)storageSet(THEME_STORAGE_KEY,nextTheme);updateThemeToggleUI();}
function updateThemeToggleUI(){const toggle=qs("#themeToggle");if(!toggle)return;const isDark=currentTheme===ThemeMode.DARK;toggle.setAttribute("aria-pressed",isDark?"true":"false");toggle.setAttribute("aria-label",isDark?"Switch to light mode":"Switch to dark mode");const icon=toggle.querySelector(".themeToggle__icon");const label=toggle.querySelector(".themeToggle__label");if(icon)icon.textContent=isDark?"🌙":"☀️";if(label)label.textContent=isDark?"Dark theme":"Light theme";}
function initThemeToggle(){const toggle=qs("#themeToggle");if(!toggle)return;toggle.addEventListener("click",()=>{const next=currentTheme===ThemeMode.DARK?ThemeMode.LIGHT:ThemeMode.DARK;applyTheme(next);});updateThemeToggleUI();}
applyTheme(getPreferredTheme(),{persist:false});

const SCENARIO_STORAGE_KEY="macrow_scenarios_v1";
const FLASHCARD_STORAGE_KEY="macrow_flashcards_srs_v1";
const scenarioFilterState={favoritesOnly:false};
const URL_STATE_PARAM_MAP={govSpending:'gov',taxRate:'tax',interestRate:'interest',productionCosts:'cost',productivity:'prod',supplySideReform:'reform'};
const KEYBOARD_SHORTCUTS=[
  {key:"p",desc:"Policies tab"},{key:"r",desc:"Parameters tab"},{key:"l",desc:"Learn tab"},{key:"q",desc:"Assess tab (when enabled)"},{key:"a",desc:"About tab"},
  {key:"s",desc:"Open scenario manager"},{key:"?",desc:"Shortcuts modal"},{key:"x",desc:"Reset parameters"},{key:"Escape",desc:"Close overlays"}
];
const LEARN_TIPS=[
  "When AD shifts right, it typically raises real output and the price level in the short run.",
  "AS shifts left (cost-push shock) creates inflation with weaker growth.",
  "Yf now anchors at the AS right-kink point (where SRAS meets the vertical LRAS).",
  "Use evaluation language: short run vs long run, inflation vs unemployment, and policy trade-offs.",
  "For top-band answers, add assumptions (confidence, spare capacity, policy lag, external shocks)."
];
const LEARN_NAV_LINKS=[
  {label:'Guidance',target:'learnGuidance'},
  {label:'Labs',target:'learnLabs'},
  {label:'Resources',target:'learnResources'},
  {label:'AI scenarios',target:'learnAi'}
];
const LEARN_MODULES=[
  {title:"AD–AS exam roadmap",points:["Start with the initial equilibrium (Y and P).","State the curve shift direction and why it shifts.","Explain the new short-run equilibrium outcome.","Evaluate short-run gains vs long-run risks."]},
  {title:"Policy evaluation structure (IB-ready)",points:["Define the policy objective (growth, inflation, unemployment, external balance).","Use AD/AS mechanics to explain likely transmission.","Add at least one time lag or confidence effect.","Conclude with conditions when policy is most effective."]},
  {title:"Classroom investigation template",points:["Set a starting state and ask students to predict P/Y before moving any slider.","Apply one policy, then require annotation of what shifted and why.","Compare short-run gains against inflation or unemployment trade-offs.","Finish with a 2–3 sentence evaluation using assumptions and limits."]},
  {title:"Common command terms",points:["Explain: show clear cause-and-effect steps.","Discuss: present advantages + limitations.","Evaluate: weigh trade-offs and end with justified judgement.","To what extent: compare alternatives before concluding."]},
  {title:"Phillips curve analysis",points:["Start by identifying whether movement is along SRPC or a shift of SRPC.","Link unemployment changes to inflation pressure using labour-market tightness.","Use expectations to explain why SRPC can shift after persistent inflation.","Evaluate policy trade-offs: inflation control vs short-run employment costs."]},
  {title:"Money market transmission",points:["Show how demand for money or money supply shifts the equilibrium interest rate.","Connect interest-rate changes to investment and aggregate demand.","Distinguish temporary liquidity effects from medium-run inflation expectations.","Comment on central bank credibility when discussing policy effectiveness."]},
  {title:"External sector & exchange rates",points:["Explain how appreciation/depreciation affects net exports and AD.","Add an inflation channel through imported input costs.","Use Marshall–Lerner/J-curve ideas for short-run vs long-run evaluation.","Conclude with impacts on growth, inflation, and external balance together."]},
  {title:"Balance of payments diagnosis",points:["Separate current account and financial account developments before judging policy.","Identify whether imbalances are cyclical (demand) or structural (competitiveness).","Match fiscal, monetary, and supply-side tools to the diagnosed cause.","Evaluate trade-offs including exchange-rate pressure and debt sustainability."]},
  {title:"Monetary policy transmission deep-dive",points:["Start with the policy-rate change and identify the first transmission channel (credit, confidence, or exchange rate).","Trace second-round effects on consumption, investment, and net exports before concluding on AD.","Discuss when transmission weakens (liquidity traps, fragile banks, or pessimistic expectations).","Evaluate inflation and growth outcomes across short run vs medium run with explicit assumptions."]}
];
// Video explanation placeholders - concepts that will have video lessons in v2.0
const VIDEO_CONCEPTS=new Set([
  "Aggregate Demand (AD)","Aggregate Supply (AS)","Long-run Aggregate Supply (LRAS)",
  "Recessionary gap","Inflationary gap","Demand-pull inflation","Cost-push inflation",
  "Multiplier effect","Crowding out","Supply-side policy"
]);
const PARAM_LABELS={
  govSpending:'Gov spending',
  taxRate:'Tax rate',
  interestRate:'Interest rate',
  productionCosts:'Production costs',
  productivity:'Productivity',
  supplySideReform:'Supply-side intensity'
};
const PARAM_FORMATTERS={
  taxRate:v=>`${Number(v).toFixed(0)}%`,
  interestRate:v=>`${Number(v).toFixed(1)}%`
};
const formatParamValue=(key,value)=>{
  if(PARAM_FORMATTERS[key]) return PARAM_FORMATTERS[key](value);
  const numeric=Number(value);
  if(Number.isFinite(numeric)) return Number.isInteger(numeric)?String(numeric):numeric.toFixed(1);
  return String(value);
};
const AI_SCENARIO_SUGGESTIONS=[
  {
    id:'stagflation-watch',
    title:'2026 stagflation watch',
    focus:'Cost-push inflation and credibility trade-offs',
    description:'Raise input costs while policy credibility matters, then ask students to compare supply-side fixes with short-run stabilisation.',
    prompt:'AI prompt: “Explain how a 2026 cost-push shock with sticky wages raises inflation while output slips, and identify supply-side reforms that can restore potential output without reigniting inflation expectations.”',
    steps:[
      'Increase production costs to lock in a leftward SRAS shock.',
      'Keep supply-side reform and productivity low so LRAS stays inelastic.',
      'Hold interest rates higher to show central-bank credibility pressure on inflation.'
    ],
    params:{govSpending:48,taxRate:38,interestRate:7.5,productionCosts:82,productivity:42,supplySideReform:18}
  },
  {
    id:'supply-growth-lift',
    title:'Supply-side growth lift',
    focus:'Productivity gains with calibrated demand',
    description:'Show how structural reform and selective spending expand potential output without overheating inflation.',
    prompt:'AI prompt: “List how targeted supply-side reforms plus measured spending can shift LRAS right, keeping inflation anchored while AD increments carefully.”',
    steps:[
      'Boost supply-side reform intensity to signal structural upgrades.',
      'Raise productivity to push potential output higher.',
      'Pair with moderate government spending so AD grows without overheating.'
    ],
    params:{govSpending:38,taxRate:30,interestRate:3.6,productionCosts:42,productivity:74,supplySideReform:65}
  },
  {
    id:'global-tightening',
    title:'Global tightening pause',
    focus:'High rates and fiscal restraint',
    description:'Model a high-rate environment where demand cools while governments keep deficits in check and guide students through export effects.',
    prompt:'AI prompt: “Describe a scenario where global tightening pushes policy rates up, slowing demand but leaving potential output intact, and highlight risks for net exports and debt service.”',
    steps:[
      'Set interest rates near the top of the range to dampen AD.',
      'Raise tax rates modestly to offset inflation without cutting supply.',
      'Keep productivity and supply-side reform steady to keep LRAS stable while AD adjusts.'
    ],
    params:{govSpending:34,taxRate:34,interestRate:8.8,productionCosts:56,productivity:48,supplySideReform:24}
  }
];

const TOTAL_PRACTICE_QUESTIONS=LEARN_TOPIC_PRACTICE.reduce((sum,topic)=>sum+topic.questions.length,0);
const PRACTICE_QUESTION_LOOKUP=new Map();
LEARN_TOPIC_PRACTICE.forEach(topic=>{
  topic.questions.forEach(question=>PRACTICE_QUESTION_LOOKUP.set(question.id,question));
});
const WORKSHEET_DEFAULT_INSTRUCTIONS='Answer each question using IB command terms, name the curve shifts, and justify the short-run vs long-run outcomes.';
const worksheetState={topicId:LEARN_TOPIC_PRACTICE[0]?LEARN_TOPIC_PRACTICE[0].id:'',instructions:WORKSHEET_DEFAULT_INSTRUCTIONS,includeAnswers:false};

function getWorksheetTopic(){
  return LEARN_TOPIC_PRACTICE.find(topic=>topic.id===worksheetState.topicId)||LEARN_TOPIC_PRACTICE[0]||{title:'Learn worksheet',summary:'',questions:[]};
}


const CLASSROOM_INVESTIGATIONS=[
  "A central bank is worried about persistent inflation and weak credibility.",
  "Consumer confidence has fallen after external uncertainty, reducing private spending.",
  "Government announces an infrastructure package to support growth and jobs.",
  "Energy and shipping costs surge, pushing up firms’ production costs.",
  "A productivity boom follows digital adoption and labour upskilling.",
  "A tax increase is introduced to reduce a widening budget deficit."
];

const LESSON_PLANS=[
  {
    id:'recessionary-gap',
    title:'Recessionary gap investigation',
    focus:'Diagnose AD shortfalls and weigh fiscal vs monetary responses.',
    duration:'20-25 min classwork',
    profile:'preset_recession',
    objective:'Help learners articulate what causes a recessionary gap and how policy tools trade off short-run output and price impacts.',
    steps:[
      'Start with the baseline equilibrium and calculate the recessionary gap relative to Yf.',
      'Apply fiscal expansion (AD right shift) and compare the price vs output response with a monetary expansion.',
      'Ask students to evaluate which tool is better when spare capacity exists versus when inflation expectations are rising.'
    ],
    resources:[
      'Exit ticket prompt: “Which policy has the stronger multiplier and why?”',
      'Share this scenario link with students for homework analysis.'
    ]
  },
  {
    id:'demand-pull-inflation',
    title:'Demand-pull inflation simulation',
    focus:'Trace overheating economies and practice evaluation language.',
    duration:'15 min warm-up',
    profile:'preset_inflation',
    objective:'Reinforce how strong AD pushes up both prices and output before comparing contractionary policies.',
    steps:[
      'Load the demand-pull preset and annotate how AD moves relative to potential output.',
      'Test fiscal tightening vs interest-rate hikes to show how each cools demand.',
      'Have each student write a “Discuss” response comparing the lagged effects of each policy.'
    ],
    resources:[
      'Mini-quiz question: “Why does Y rise faster than P when AD shifts?”',
      'Teacher note: Tie outcomes to real-world central bank panic decisions.'
    ]
  },
  {
    id:'cost-push-stagflation',
    title:'Cost-push stagflation lab',
    focus:'Explore AS left shifts and the policy dilemma they create.',
    duration:'15 min scenario lab',
    profile:'cost_push',
    objective:'Expose students to stagflation and why supply-side policy or targeted support is preferable.',
    steps:[
      'Load the cost-push preset and highlight why output falls while prices rise.',
      'Discuss why demand-side tools struggle when AS is shifting left.',
      'Invite students to propose supply-side or productivity responses that move LRAS right.'
    ],
    resources:[
      'Reflection prompt: “Why is stagflation harder to solve than pure demand-pull inflation?”',
      'Shareable QR code bundle explaining cost pressures in the short run.'
    ]
  },
  {
    id:'supply-side-growth',
    title:'Supply-side growth workshop',
    focus:'Use AS/LRAS shifts to highlight long-run prosperity goals.',
    duration:'20 min group activity',
    profile:'preset_growth',
    objective:'Show how productivity boosts shift potential output and how policy choices align with development goals.',
    steps:[
      'Start with the growth preset and note how LRAS and AS both move right.',
      'Compare the immediate price/output effects with a pure AD-driven expansion.',
      'Ask students to design a supply-side policy package that preserves price stability.'
    ],
    resources:[
      'Student worksheet: “Name 3 real-world supply-side reforms and their expected curves.”',
      'Share scenario link + QR for remote learners.'
    ]
  }
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

const ECONOMIC_INDICATOR_REFERENCE=[
  {name:"Real GDP growth",why:"Tracks whether the economy is expanding or slowing.",examUse:"Use with output gap and unemployment to justify AD-side policy choices."},
  {name:"CPI inflation",why:"Shows the pace of price-level increases.",examUse:"Distinguish demand-pull vs cost-push pressures before choosing policy."},
  {name:"Unemployment rate",why:"Signals labour-market slack and cyclical weakness.",examUse:"Link to recessionary gaps and Phillips-curve trade-offs."},
  {name:"Policy interest rate",why:"Core monetary-policy stance set by the central bank.",examUse:"Trace transmission to borrowing, investment, AD, and inflation."},
  {name:"Current account balance",why:"Indicates external demand strength and competitiveness.",examUse:"Evaluate exchange-rate effects and external-balance objectives."},
  {name:"Government budget balance",why:"Shows fiscal position and room for discretionary policy.",examUse:"Discuss sustainability, crowding-out risk, and fiscal trade-offs."}
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

const settings={
  showAxisNumbers:(storageGet("macrow_show_axis_numbers","1"))==="1",
  accessibility:(storageGet("macrow_access","0"))==="1",
  assessEnabled:(storageGet("macrow_assess_enabled","0"))==="1"
};
let state={tab:"policies",params:deepCopy(defaults.params),adShiftY:0,asShiftP:0,yFe:GRAPH.yFeBase,history:[],historyIndex:-1,compare:{on:false,snapshot:null},activeScenarioId:null};
let scenarios=[];
let scenarioComparisonController = null;
try {
  const savedScenarios = storageGet(SCENARIO_STORAGE_KEY);
  scenarios = normalizeScenarios(JSON.parse(savedScenarios||"[]"), defaults.params);
} catch (err) {
  console.warn('Unable to parse saved scenarios, starting fresh.', err);
  scenarios = [];
}
let progress=loadProgress();
progress.learnPracticeAttempts=progress.learnPracticeAttempts||[];
progress.learnTopicQuizzes=progress.learnTopicQuizzes||{};
progress.quizAttempts=progress.quizAttempts||[];
progress.competencies=progress.competencies||{};
let flashcardProgress=loadFlashcardProgress();
let learnPanelRendered=false;
let currentUser=getActiveUser();
const topicQuizState={topicId:null,questionIndex:0,answers:[],feedback:null,completed:false,summary:null};
const phillipsState={mode:'srpc',shift:0,inflation:4.5,naturalU:5.2};
const moneyMarketState={mdShift:0,msShift:0,policyRate:4.0};
const MONEY_MARKET_CONFIG={
  basePolicyRate:4.0,
  baseMsQuantity:95,
  qBounds:[45,150],
  qRange:[35,165],
  slope:-0.04,
  mdShiftQuantityImpact:8,
  msShiftQuantityImpact:6,
  msShiftInterestImpact:0.55,
  interestBounds:[1.2,10.8]
};
const loanableFundsState={demandShift:0,supplyShift:0,policyRate:4.0};
const LOANABLE_FUNDS_CONFIG={
  baseRate:4.0,
  baseFunds:95,
  qBounds:[45,150],
  qRange:[35,165],
  demandSlope:-0.045,
  supplySlope:0.045,
  demandShiftFundsImpact:8,
  supplyShiftFundsImpact:7,
  demandShiftRateImpact:0.5,
  supplyShiftRateImpact:0.55,
  rateBounds:[1.2,10.8]
};
const circularFlowState={injectionBalance:50};
const CIRCULAR_FLOW_CONFIG={
  nodeRadius:42,
  nodes:{
    households:{label:'Households',x:130,y:150},
    firms:{label:'Firms',x:360,y:110},
    government:{label:'Government',x:420,y:230},
    financial:{label:'Financial',subLabel:'sector',x:180,y:260},
    foreign:{label:'Rest of world',subLabel:'trade flows',x:320,y:320}
  },
  flows:[
    {id:'consumption',start:'households',end:'firms',label:'Consumption',type:'real',baseColor:'16,185,129',offset:-22,labelOffset:{x:0,y:-14}},
    {id:'wages',start:'firms',end:'households',label:'Income',type:'real',baseColor:'59,130,246',offset:18,labelOffset:{x:0,y:12}},
    {id:'savings',start:'households',end:'financial',label:'Savings (leakage)',type:'leakage',baseColor:'239,68,68',offset:16,labelOffset:{x:-12,y:6}},
    {id:'taxes',start:'households',end:'government',label:'Taxes (leakage)',type:'leakage',baseColor:'234,179,8',offset:4,labelOffset:{x:12,y:-8}},
    {id:'imports',start:'households',end:'foreign',label:'Imports (leakage)',type:'leakage',baseColor:'246,76,63',offset:26,labelOffset:{x:0,y:18}},
    {id:'investment',start:'financial',end:'firms',label:'Investment (injection)',type:'injection',baseColor:'16,185,129',offset:-8,labelOffset:{x:10,y:-10}},
    {id:'govSpend',start:'government',end:'firms',label:'Gov spending (injection)',type:'injection',baseColor:'14,165,233',offset:0,labelOffset:{x:22,y:2}},
    {id:'exports',start:'foreign',end:'firms',label:'Exports (injection)',type:'injection',baseColor:'34,197,94',offset:-14,labelOffset:{x:14,y:-6}}
  ]
};

const aggregateDemandState={cShift:0,iShift:0,gShift:0,nxShift:0};
const ppfState={capitalBias:0,technology:0};
const adGraphState={shift:0};
const longRunEqState={adShift:0,lrasShift:0};
const lafferState={taxRate:30,enforcement:50};
const AD_GRAPH_CONFIG={step:12,min:-48,max:48};
const CURVE_SHIFT_CONFIG={min:-2,max:2,step:1};
const shiftCurve=(value,direction)=>clamp(value+(direction*CURVE_SHIFT_CONFIG.step),CURVE_SHIFT_CONFIG.min,CURVE_SHIFT_CONFIG.max);

const navButtons=qsa('.navBtn');
const assessNavButton=navButtons.find(b=>b.dataset.tab==="assess");
const authOverlay=qs('#authOverlay');
const authForm=qs('#authForm');
const authTabs=qsa('[data-auth-mode]');
const authRegisterFields=qsa('.authField--register');
const authMessage=qs('#authMessage');
const authSubmitButton=qs('#authSubmit');
const authFooterHint=qs('#authFooterHint');
const authSwitchMode=qs('#authSwitchMode');
const authUsername=qs('#authUsername');
const authPassword=qs('#authPassword');
const authDisplayName=qs('#authDisplayName');
const authRoleSelect=qs('#authRole');
let authMode='login';

function setAuthMode(mode){
  if(!authOverlay) return;
  authMode=mode==='register'?'register':'login';
  authForm?.reset();
  displayAuthMessage('');
  if(authSubmitButton) authSubmitButton.textContent=authMode==='register'?'Create account':'Sign in';
  if(authFooterHint) authFooterHint.textContent=authMode==='register'
    ?'Teacher accounts unlock class analytics, while students can track progress.'
    :'Sign in with your credentials to open the teacher dashboard.';
  authRegisterFields?.forEach(field=>field.classList.toggle('hidden',authMode!=='register'));
  authTabs?.forEach(tab=>tab.classList.toggle('authTab--active',tab.dataset.authMode===authMode));
  if(authUsername) authUsername.focus();
}

function openAuthOverlay(mode='login'){
  if(!authOverlay) return;
  setAuthMode(mode);
  authOverlay.classList.remove('hidden');
  authOverlay.setAttribute('aria-hidden','false');
}

function closeAuthOverlay(){
  if(!authOverlay) return;
  authOverlay.classList.add('hidden');
  authOverlay.setAttribute('aria-hidden','true');
}

function displayAuthMessage(text='',isError=true){
  if(!authMessage) return;
  authMessage.textContent=text;
  authMessage.classList.toggle('authMessage--error',!!text&&isError);
  authMessage.classList.toggle('authMessage--success',!!text&&!isError);
}

async function handleAuthSubmit(event){
  event.preventDefault();
  if(!authForm) return;
  const username=authUsername?.value||'';
  const password=authPassword?.value||'';
  if(!username||!password){
    displayAuthMessage('Username and password are required.');
    return;
  }
  try{
    if(authMode==='register'){
      const role=authRoleSelect?.value||'student';
      const displayName=authDisplayName?.value||username;
      const user=await registerUser({username,password,displayName,role});
      setActiveUser(user);
      currentUser=user;
      updateAuthStatusUI();
      showStatus(`Welcome, ${user.displayName}`);
    } else {
      const user=await authenticateUser({username,password});
      if(!user) throw new Error('Invalid username or password.');
      setActiveUser(user);
      currentUser=user;
      updateAuthStatusUI();
      showStatus(`Signed in as ${user.displayName}`);
    }
    renderTeacherPanel();
    closeAuthOverlay();
  }catch(err){
    displayAuthMessage(err?.message||'Unable to sign in.');
  }
}

function initAuthControls(){
  const openBtn=qs('#btnAuthOpen');
  const signOutBtn=qs('#btnAuthSignOut');
  openBtn?.addEventListener('click',()=>openAuthOverlay('login'));
  signOutBtn?.addEventListener('click',()=>{
    clearActiveUser();
    currentUser=null;
    updateAuthStatusUI();
    renderTeacherPanel();
    showStatus('Signed out.');
  });
  qs('#authClose')?.addEventListener('click',closeAuthOverlay);
  authTabs?.forEach(tab=>tab.addEventListener('click',()=>setAuthMode(tab.dataset.authMode)));
  authSwitchMode?.addEventListener('click',()=>setAuthMode(authMode==='login'?'register':'login'));
  authForm?.addEventListener('submit',handleAuthSubmit);
  setAuthMode(authMode);
}

function updateAuthStatusUI(){
  const status=qs('#authStatus');
  const openBtn=qs('#btnAuthOpen');
  const signOutBtn=qs('#btnAuthSignOut');
  if(status){
    if(currentUser){
      status.textContent=`${currentUser.displayName||currentUser.username} (${currentUser.role})`;
      status.classList.add('authStatus--signed');
    } else {
      status.textContent='Guest';
      status.classList.remove('authStatus--signed');
    }
  }
  if(openBtn) openBtn.textContent=currentUser?'Switch account':'Sign in';
  if(signOutBtn) signOutBtn.classList.toggle('hidden',!currentUser);
}

function ensureLearnPanelRendered(){
  renderLearnPanel();
  learnPanelRendered=true;
}
function setTab(tab){
  if(tab==="teacher" && (!currentUser||currentUser.role!=='teacher')){
    showStatus('Sign in as a teacher to view this dashboard.',true,2600);
    openAuthOverlay('login');
    return;
  }
  if(tab==="assess" && !settings.assessEnabled){
    tab="policies";
  }
  state.tab=tab;
  if(tab==="learn") ensureLearnPanelRendered();
  navButtons.forEach(b=>{
    const isActive=b.dataset.tab===tab;
    b.classList.toggle('navBtn--active',isActive);
    b.setAttribute('aria-selected',isActive?'true':'false');
    b.setAttribute('tabindex',isActive?'0':'-1');
  });
  ["policies","parameters","learn","assess","about","teacher"].forEach(t=>{
    const panel=qs(`#panel${t[0].toUpperCase()+t.slice(1)}`);
    if(!panel) return;
    const hidden=t!==tab;
    panel.classList.toggle('hidden',hidden);
    panel.setAttribute('aria-hidden',hidden?'true':'false');
  });
  const titleEl=qs('#panelTitle');
  if(titleEl) titleEl.textContent=tab[0].toUpperCase()+tab.slice(1);
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
function applyAiScenarioSuggestion(suggestion){
  if(!suggestion||!suggestion.params) return;
  state.params={...defaults.params,...suggestion.params};
  onParamsChanged(true);
  showStatus(`AI scenario loaded: ${suggestion.title}`,false,2600);
}

function renderLearnPanel(){
  const root=qs('#panelLearn');

  root.innerHTML=`
    <div class="sectionTitle">IB Learn mode</div>
    <div class="sectionHint">Structured for Paper 1/2 AD–AS explanations and strong evaluation chains.</div>
    <div class="learnNav" role="tablist" aria-label="Learn navigation">
      ${LEARN_NAV_LINKS.map(link=>`<button type="button" class="learnNav__button" data-target="${link.target}">${escapeHtml(link.label)}</button>`).join('')}
    </div>

    <div id="learnGuidance" class="learnSection">
      <div class="sectionTitle">Classroom guidance</div>
      <div class="sectionHint">Quick tips, investigations, and snapshots guide exam-style explanations.</div>
      <div class="learnTipsGrid">
        ${LEARN_TIPS.map(t=>`<div class="learnCard learnTipCard">💡 ${escapeHtml(t)}</div>`).join('')}
      </div>

      <div class="sectionTitle">Classroom investigations</div>
      <div class="sectionHint">Generate teacher-ready prompts, assign a starter scenario, and ask students to justify the shift and evaluate the impact.</div>
      <div class="learnCard investigationCard">
        <div class="investigationCard__top">
          <div>
            <div class="investigationCard__tag">IBDP 5.2 / 5.3 • AD/AS evaluation</div>
            <div class="investigationCard__note">Click "Generate investigation brief" to craft prompts tied to the same curves students just explored.</div>
          </div>
          <div class="scenarioToolbar learnActions">
            <button id="btnGenerateInvestigation" class="btn btn--primary">Generate investigation brief</button>
            <button id="btnAssignStarter" class="btn btn--ghost">Assign random starter state</button>
            <button id="btnCopyInvestigation" class="btn btn--ghost">Copy brief</button>
          </div>
        </div>
        <div class="investigationCard__grid">
          <div class="investigationCard__panel">
            <div class="investigationCard__panelTitle">Scenario prompt</div>
            <div id="investigationScenario" class="investigationCard__panelBody"></div>
          </div>
          <div class="investigationCard__panel">
            <div class="investigationCard__panelTitle">Policy lens</div>
            <div id="investigationPolicy" class="investigationCard__panelBody"></div>
          </div>
          <div class="investigationCard__panel">
            <div class="investigationCard__panelTitle">Model snapshot</div>
            <ul id="investigationSnapshot" class="investigationCard__panelList"></ul>
          </div>
          <div class="investigationCard__panel">
            <div class="investigationCard__panelTitle">Investigation steps</div>
            <ol id="investigationSteps" class="investigationCard__panelList investigationCard__stepsList"></ol>
          </div>
          <div class="investigationCard__panel">
            <div class="investigationCard__panelTitle">Deliverables</div>
            <ul id="investigationDeliverables" class="investigationCard__panelList"></ul>
            <div id="investigationReference" class="investigationCard__reference"></div>
          </div>
        </div>
        <textarea id="learnInvestigationText" class="textInput learnTextarea investigationCard__textarea" rows="7" aria-label="Classroom investigation brief"></textarea>
        <div class="policy__text investigationCard__cta">Teacher move: ask students to annotate <b>which curve shifts</b>, mark new equilibrium, and evaluate one limitation.</div>
      </div>

      <div class="learnCard" id="learnSnapshot" aria-live="polite" aria-atomic="true"></div>
    </div>

    <div id="learnLabs" class="learnSection">
      <div class="sectionTitle">Hands-on labs</div>
      <div class="sectionHint">Rotate through diagram labs built for the IB macro syllabus.</div>

      <div class="learnLab" id="labPhillips">
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
      </div>

      <div class="learnLab" id="labMoneyMarket">
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
      </div>

      <div class="learnLab" id="labAdComponents">
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
      </div>

      <div class="learnLab" id="labLoanableFunds">
        <div class="sectionTitle">Loanable funds market diagram lab</div>
        <div class="learnCard">
          <div class="scenarioToolbar learnActions">
            <button id="btnLfDemandLeft" class="btn btn--ghost" type="button">I demand ←</button>
            <button id="btnLfDemandRight" class="btn btn--ghost" type="button">I demand →</button>
            <button id="btnLfSupplyLeft" class="btn btn--ghost" type="button">Savings ←</button>
            <button id="btnLfSupplyRight" class="btn btn--ghost" type="button">Savings →</button>
            <button id="btnLfReset" class="btn btn--ghost" type="button">Reset</button>
          </div>
          <label class="policy__text" for="lfPolicyRate">Policy-rate anchor: <span id="lfPolicyRateVal">4.0%</span></label>
          <input id="lfPolicyRate" type="range" min="1" max="10" step="0.1" value="4.0" />
          <svg id="loanableFundsSvg" viewBox="0 0 560 300" role="img" aria-label="Loanable funds market diagram"></svg>
          <div id="loanableFundsCaption" class="policy__text"></div>
        </div>
      </div>


      <div class="learnLab" id="labCircularFlow">
        <div class="sectionTitle">Circular flow of the economy lab</div>
        <div class="learnCard">
          <div class="scenarioToolbar learnActions">
            <button id="btnCircularFlowInject" class="btn btn--ghost" type="button">Boost injections</button>
            <button id="btnCircularFlowLeak" class="btn btn--ghost" type="button">Boost leakages</button>
            <button id="btnCircularFlowReset" class="btn btn--ghost" type="button">Balance flows</button>
            <button id="btnExportCircularFlowPng" class="btn btn--ghost" type="button">Export circular flow (PNG)</button>
          </div>
          <label class="policy__text" for="circularFlowBalance">Injections vs leakages: <span id="circularFlowBalanceVal">50% injections · 50% leakages</span></label>
          <input id="circularFlowBalance" type="range" min="0" max="100" step="5" value="50" />
          <svg id="circularFlowSvg" viewBox="0 0 560 340" role="img" aria-label="Circular flow of the economy"></svg>
          <div id="circularFlowCaption" class="policy__text"></div>
        </div>
      </div>


      <div class="learnLab" id="labAdGraph">
        <div class="sectionTitle">Aggregate demand graph lab</div>
        <div class="learnCard">
          <div class="scenarioToolbar learnActions">
            <button id="btnAdGraphShiftLeft" class="btn btn--ghost" type="button">AD ←</button>
            <button id="btnAdGraphShiftRight" class="btn btn--ghost" type="button">AD →</button>
            <button id="btnAdGraphReset" class="btn btn--ghost" type="button">Reset</button>
          </div>
          <svg id="adGraphSvg" viewBox="0 0 560 300" role="img" aria-label="Aggregate demand diagram"></svg>
          <div id="adGraphCaption" class="policy__text"></div>
        </div>
      </div>

      <div class="learnLab" id="labLongRunEq">
        <div class="sectionTitle">AD-AS long-run equilibrium lab</div>
        <div class="learnCard">
          <div class="scenarioToolbar learnActions">
            <button id="btnLrAdLeft" class="btn btn--ghost" type="button">AD ← (demand shock)</button>
            <button id="btnLrAdRight" class="btn btn--ghost" type="button">AD → (demand shock)</button>
            <button id="btnLrLrasLeft" class="btn btn--ghost" type="button">LRAS ←</button>
            <button id="btnLrLrasRight" class="btn btn--ghost" type="button">LRAS →</button>
            <button id="btnLrReset" class="btn btn--ghost" type="button">Reset</button>
          </div>
          <svg id="lreqSvg" viewBox="0 0 560 300" role="img" aria-label="AD-AS long-run equilibrium diagram"></svg>
          <div id="lreqCaption" class="policy__text"></div>
        </div>
      </div>

      <div class="learnLab" id="labPpf">
        <div class="sectionTitle">PPF (Production Possibility Frontier) lab</div>
        <div class="learnCard">
          <div class="scenarioToolbar learnActions">
            <button id="btnPpfCapitalLeft" class="btn btn--ghost" type="button">Capital goods bias ←</button>
            <button id="btnPpfCapitalRight" class="btn btn--ghost" type="button">Capital goods bias →</button>
            <button id="btnPpfTechDown" class="btn btn--ghost" type="button">Technology −</button>
            <button id="btnPpfTechUp" class="btn btn--ghost" type="button">Technology +</button>
            <button id="btnPpfReset" class="btn btn--ghost" type="button">Reset</button>
          </div>
          <svg id="ppfSvg" viewBox="0 0 560 300" role="img" aria-label="Production possibility frontier diagram"></svg>
          <div id="ppfCaption" class="policy__text"></div>
        </div>
      </div>

      <div class="learnLab" id="labLaffer">
        <div class="sectionTitle">Laffer curve tax-revenue lab</div>
        <div class="learnCard">
          <div class="scenarioToolbar learnActions">
            <button id="btnLafferRateDown" class="btn btn--ghost" type="button">Tax rate −</button>
            <button id="btnLafferRateUp" class="btn btn--ghost" type="button">Tax rate +</button>
            <button id="btnLafferEnforcementDown" class="btn btn--ghost" type="button">Compliance −</button>
            <button id="btnLafferEnforcementUp" class="btn btn--ghost" type="button">Compliance +</button>
            <button id="btnLafferReset" class="btn btn--ghost" type="button">Reset</button>
          </div>
          <label class="policy__text" for="lafferRate">Tax rate: <span id="lafferRateVal">30%</span></label>
          <input id="lafferRate" type="range" min="0" max="100" step="1" value="30" />
          <label class="policy__text" for="lafferEnforcement">Compliance quality: <span id="lafferEnforcementVal">50%</span></label>
          <input id="lafferEnforcement" type="range" min="0" max="100" step="1" value="50" />
          <svg id="lafferSvg" viewBox="0 0 560 300" role="img" aria-label="Laffer curve diagram"></svg>
          <div id="lafferCaption" class="policy__text"></div>
        </div>
      </div>
    </div>

    <div id="learnResources" class="learnSection">
      <div class="sectionTitle">Resources & revision</div>
      <div class="sectionHint">Presets, revision modules, glossary, and flashcards keep IB terms accessible.</div>

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

      <div class="sectionTitle">Economic indicator quick reference</div>
      <div class="sectionHint">Fast exam-focused reminders for interpreting macro data before writing analysis.</div>
      ${ECONOMIC_INDICATOR_REFERENCE.map(ind=>`<div class="learnCard"><b>${escapeHtml(ind.name)}</b><div class="policy__text">Why it matters: ${escapeHtml(ind.why)}</div><div class="policy__text">Exam use: ${escapeHtml(ind.examUse)}</div></div>`).join('')}

      <div class="sectionTitle">IB Macro glossary</div>
      <div class="sectionHint">High-frequency concepts from AD–AS, stabilization policy, and macro evaluation.</div>
      ${GLOSSARY.map(g=>`<div class="learnCard"><b>${escapeHtml(g.term)}</b><div class="policy__text">${escapeHtml(g.blurb)}</div>${VIDEO_CONCEPTS.has(g.term)?'<div class="sectionHint" style="margin-top:4px;">🎥 Video lesson coming soon</div>':''}</div>`).join('')}
      
      <div class="sectionTitle">Video Explanations</div>
      <div class="learnCard">
        <div class="policy__name">Coming in v2.0</div>
        <div class="policy__text">Interactive video lessons linked to each concept. Watch, pause, and interact with the diagrams.</div>
        <div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          ${Array.from(VIDEO_CONCEPTS).slice(0,4).map(c=>`<div class="learnCard" style="padding:8px;"><span style="opacity:0.5">🎥</span> ${escapeHtml(c)}</div>`).join('')}
        </div>
      </div>

      <div id="learnAi" class="learnSection">
        <div class="sectionTitle">AI scenario suggestions</div>
        <div class="sectionHint">Use these AI-inspired prompts to structure investigations and quickly reset your curves.</div>
        <div class="learnAiGrid">
          ${AI_SCENARIO_SUGGESTIONS.map(s=>`<div class="learnCard learnAiCard">
            <div class="learnAiCard__header">
              <div>
                <div class="learnAiCard__title">${escapeHtml(s.title)}</div>
                <div class="learnAiCard__focus">${escapeHtml(s.focus)}</div>
              </div>
              <button class="btn btn--ghost" type="button" data-ai-apply="${s.id}">Apply scenario</button>
            </div>
            <div class="policy__text learnAiCard__description">${escapeHtml(s.description)}</div>
            <div class="learnAiCard__prompt"><strong>AI prompt:</strong> ${escapeHtml(s.prompt)}</div>
            <ul class="learnAiCard__steps">
              ${s.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}
            </ul>
            <div class="learnAiCard__params">
              ${Object.entries(s.params).map(([key,value])=>`<span>${escapeHtml(PARAM_LABELS[key]||key)}: ${escapeHtml(formatParamValue(key,value))}</span>`).join('')}
            </div>
          </div>`).join('')}
        </div>
      </div>

      <div class="sectionTitle">Interactive practice problems</div>
      <div class="sectionHint">Quick multiple-choice checks with instant feedback.</div>
      <div id="learnPracticeRoot"></div>

      <div class="sectionTitle">Topic quiz mode</div>
      <div class="sectionHint">Run a focused quiz per topic. Scores are tracked locally so you can review mastery over time.</div>
      <div id="learnTopicQuizRoot"></div>
      <div id="topicQuizHost"></div>

      <div class="sectionTitle">Flashcard mode (spaced repetition)</div>
      <div class="sectionHint">Review term/definition cards with adaptive intervals (Again/Hard/Good/Easy).</div>
      <div id="flashcardRoot"></div>

      <div class="sectionTitle">Printable worksheet generator</div>
      <div class="sectionHint">Pull a Learn topic, add instructions, and print a student-ready worksheet.</div>
      <div id="worksheetGeneratorRoot"></div>
    </div>
  `;
  const learnNavButtons=root.querySelectorAll('.learnNav__button');
  learnNavButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      learnNavButtons.forEach(b=>b.classList.toggle('learnNav__button--active',b===btn));
      const target=qs(`#${btn.dataset.target}`);
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
  if(learnNavButtons[0]) learnNavButtons[0].classList.add('learnNav__button--active');
  const aiSection=qs('#learnAi');
  if(aiSection){
    aiSection.addEventListener('click',e=>{
      const btn=e.target.closest('[data-ai-apply]');
      if(!btn) return;
      const suggestion=AI_SCENARIO_SUGGESTIONS.find(s=>s.id===btn.dataset.aiApply);
      if(!suggestion) return;
      applyAiScenarioSuggestion(suggestion);
    });
  }
  const txt=qs('#learnInvestigationText');
  const applyInvestigation=inv=>{
    if(txt) txt.value=inv.text;
    renderInvestigationDetails(inv);
  };
  applyInvestigation(buildInvestigationBrief());
  const btnGenerate=qs('#btnGenerateInvestigation');
  if(btnGenerate) btnGenerate.onclick=()=>applyInvestigation(buildInvestigationBrief());
  qs('#btnAssignStarter').onclick=()=>{const pick=policyCards[Math.floor(Math.random()*policyCards.length)]; state.params=pick.apply(deepCopy(defaults.params)); onParamsChanged(true); setTab('policies');};
  const btnCopy=qs('#btnCopyInvestigation');
  if(btnCopy) btnCopy.onclick=async()=>{await navigator.clipboard?.writeText(txt?.value||''); btnCopy.textContent='Copied ✓'; setTimeout(()=>{const b=qs('#btnCopyInvestigation'); if(b)b.textContent='Copy brief';},1200);};
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
  const circularFlowBalanceSlider=qs('#circularFlowBalance');
  const setCircularFlowBalance=value=>{
    const clamped=clamp(value,0,100);
    circularFlowState.injectionBalance=clamped;
    if(circularFlowBalanceSlider) circularFlowBalanceSlider.value=String(clamped);
    renderCircularFlowDiagram();
  };
  qs('#btnCircularFlowInject').onclick=()=>setCircularFlowBalance(circularFlowState.injectionBalance+10);
  qs('#btnCircularFlowLeak').onclick=()=>setCircularFlowBalance(circularFlowState.injectionBalance-10);
  qs('#btnCircularFlowReset').onclick=()=>setCircularFlowBalance(50);
  if(circularFlowBalanceSlider) circularFlowBalanceSlider.addEventListener('input',e=>{const target=e.target; if(!target||!(target instanceof HTMLInputElement)) return; setCircularFlowBalance(Number(target.value));});
  qs('#btnExportCircularFlowPng').onclick=()=>exportCircularFlowPng();
  qs('#btnLfDemandLeft').onclick=()=>{loanableFundsState.demandShift=shiftCurve(loanableFundsState.demandShift,-1); renderLoanableFundsDiagram();};
  qs('#btnLfDemandRight').onclick=()=>{loanableFundsState.demandShift=shiftCurve(loanableFundsState.demandShift,1); renderLoanableFundsDiagram();};
  qs('#btnLfSupplyLeft').onclick=()=>{loanableFundsState.supplyShift=shiftCurve(loanableFundsState.supplyShift,-1); renderLoanableFundsDiagram();};
  qs('#btnLfSupplyRight').onclick=()=>{loanableFundsState.supplyShift=shiftCurve(loanableFundsState.supplyShift,1); renderLoanableFundsDiagram();};
  qs('#btnLfReset').onclick=()=>{loanableFundsState.demandShift=0; loanableFundsState.supplyShift=0; loanableFundsState.policyRate=4.0; const slider=qs('#lfPolicyRate'); if(slider) slider.value='4.0'; renderLoanableFundsDiagram();};
  qs('#lfPolicyRate').oninput=e=>{loanableFundsState.policyRate=Number(e.target.value); renderLoanableFundsDiagram();};
  qs('#btnAdCompCDown').onclick=()=>{aggregateDemandState.cShift=shiftCurve(aggregateDemandState.cShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompCUp').onclick=()=>{aggregateDemandState.cShift=shiftCurve(aggregateDemandState.cShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompIDown').onclick=()=>{aggregateDemandState.iShift=shiftCurve(aggregateDemandState.iShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompIUp').onclick=()=>{aggregateDemandState.iShift=shiftCurve(aggregateDemandState.iShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompGDown').onclick=()=>{aggregateDemandState.gShift=shiftCurve(aggregateDemandState.gShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompGUp').onclick=()=>{aggregateDemandState.gShift=shiftCurve(aggregateDemandState.gShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompNXDown').onclick=()=>{aggregateDemandState.nxShift=shiftCurve(aggregateDemandState.nxShift,-1); renderAggregateDemandComponents();};
  qs('#btnAdCompNXUp').onclick=()=>{aggregateDemandState.nxShift=shiftCurve(aggregateDemandState.nxShift,1); renderAggregateDemandComponents();};
  qs('#btnAdCompReset').onclick=()=>{aggregateDemandState.cShift=0;aggregateDemandState.iShift=0;aggregateDemandState.gShift=0;aggregateDemandState.nxShift=0; renderAggregateDemandComponents();};
  qs('#btnAdGraphShiftLeft').onclick=()=>adjustAdGraphShift(-AD_GRAPH_CONFIG.step);
  qs('#btnAdGraphShiftRight').onclick=()=>adjustAdGraphShift(AD_GRAPH_CONFIG.step);
  qs('#btnAdGraphReset').onclick=()=>{adGraphState.shift=0; renderAdGraphDiagram();};
  qs('#btnLrAdLeft').onclick=()=>{longRunEqState.adShift=shiftCurve(longRunEqState.adShift,-1); renderLongRunEquilibriumDiagram();};
  qs('#btnLrAdRight').onclick=()=>{longRunEqState.adShift=shiftCurve(longRunEqState.adShift,1); renderLongRunEquilibriumDiagram();};
  qs('#btnLrLrasLeft').onclick=()=>{longRunEqState.lrasShift=shiftCurve(longRunEqState.lrasShift,-1); renderLongRunEquilibriumDiagram();};
  qs('#btnLrLrasRight').onclick=()=>{longRunEqState.lrasShift=shiftCurve(longRunEqState.lrasShift,1); renderLongRunEquilibriumDiagram();};
  qs('#btnLrReset').onclick=()=>{longRunEqState.adShift=0; longRunEqState.lrasShift=0; renderLongRunEquilibriumDiagram();};
  qs('#btnPpfCapitalLeft').onclick=()=>{ppfState.capitalBias=shiftCurve(ppfState.capitalBias,-1); renderPpfDiagram();};
  qs('#btnPpfCapitalRight').onclick=()=>{ppfState.capitalBias=shiftCurve(ppfState.capitalBias,1); renderPpfDiagram();};
  qs('#btnPpfTechDown').onclick=()=>{ppfState.technology=shiftCurve(ppfState.technology,-1); renderPpfDiagram();};
  qs('#btnPpfTechUp').onclick=()=>{ppfState.technology=shiftCurve(ppfState.technology,1); renderPpfDiagram();};
  qs('#btnPpfReset').onclick=()=>{ppfState.capitalBias=0;ppfState.technology=0; renderPpfDiagram();};
  qs('#btnLafferRateDown').onclick=()=>{lafferState.taxRate=clamp(lafferState.taxRate-5,0,100); const slider=qs('#lafferRate'); if(slider) slider.value=String(lafferState.taxRate); renderLafferDiagram();};
  qs('#btnLafferRateUp').onclick=()=>{lafferState.taxRate=clamp(lafferState.taxRate+5,0,100); const slider=qs('#lafferRate'); if(slider) slider.value=String(lafferState.taxRate); renderLafferDiagram();};
  qs('#btnLafferEnforcementDown').onclick=()=>{lafferState.enforcement=clamp(lafferState.enforcement-5,0,100); const slider=qs('#lafferEnforcement'); if(slider) slider.value=String(lafferState.enforcement); renderLafferDiagram();};
  qs('#btnLafferEnforcementUp').onclick=()=>{lafferState.enforcement=clamp(lafferState.enforcement+5,0,100); const slider=qs('#lafferEnforcement'); if(slider) slider.value=String(lafferState.enforcement); renderLafferDiagram();};
  qs('#btnLafferReset').onclick=()=>{lafferState.taxRate=30; lafferState.enforcement=50; const rate=qs('#lafferRate'); const enforce=qs('#lafferEnforcement'); if(rate) rate.value='30'; if(enforce) enforce.value='50'; renderLafferDiagram();};
  qs('#lafferRate').oninput=e=>{lafferState.taxRate=Number(e.target.value); renderLafferDiagram();};
  qs('#lafferEnforcement').oninput=e=>{lafferState.enforcement=Number(e.target.value); renderLafferDiagram();};
  qs('#btnPresetRecession').onclick=()=>applyPresetScenario('recession');
  qs('#btnPresetInflation').onclick=()=>applyPresetScenario('inflation');
  qs('#btnPresetGrowth').onclick=()=>applyPresetScenario('growth');
  qs('#btnExportPcPng').onclick=()=>exportPhillipsCurvePng();
  qs('#btnExportMmPng').onclick=()=>exportMoneyMarketPng();
  renderPhillipsCurve();
  renderMoneyMarketDiagram();
  renderLoanableFundsDiagram();
  renderCircularFlowDiagram();
  renderAggregateDemandComponents();
  renderAdGraphDiagram();
  renderLongRunEquilibriumDiagram();
  renderPpfDiagram();
  renderLafferDiagram();
  renderLearnPracticeModule();
  renderLearnTopicQuizzes();
  renderTopicQuizHost();
  renderFlashcardModule();
  renderWorksheetGenerator();
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
  const modelSnapshot=[
    `Model anchor: Y = ${eq.y.toFixed(1)}, P = ${eq.p.toFixed(1)}, potential output Yf = ${cur.yFe.toFixed(1)}`,
    `Short-run output gap: ${gapValue} (${gapLabel})`,
    `Slider signals: AD ${adDescriptor} ${Math.abs(cur.adShiftY).toFixed(1)} units, SRAS shift ${asDescriptor} ${Math.abs(cur.asShiftP).toFixed(1)} units`
  ];
  const steps=[
    'Analyse the scenario and policy lens: decide which curve moves first, name the transmission channel, and justify the direction using cause-and-effect language.',
    'Draw and label the AD/AS diagram: show the starting point, the new curve position, and the revised short-run equilibrium (P & Y) relative to the anchor.',
    'Explain the short-run outcome (inflation, output, employment) then contrast it with the long-run path anchored at Yf, noting any lags or confidence effects.',
    'Evaluate trade-offs: weigh the policy objective against a clear limit (crowding out, capacity constraints, inflation expectations, or external factors) and recommend whether to augment or pause the policy.'
  ];
  const deliverables=[
    'A labelled AD/AS sketch with arrows for curve shifts and annotations for price/output moves.',
    'A four-sentence written evaluation covering short run, long run, a policy trade-off, a policy limit, and one stated assumption.',
    'Use syllabus-aligned vocabulary (Analyse, Explain, Evaluate, Justify) and cite the dominant transmission channel.'
  ];
  const referenceFrame=`Current reference frame: AD shift = ${cur.adShiftY.toFixed(1)} (${adDescriptor}), AS shift = ${cur.asShiftP.toFixed(1)} (${asDescriptor})`;
  const policyAnchor=`Use the ${policy.name} lens to anchor your policy recommendation.`;
  const lines=[
    'Investigation brief (IB Macro — AD/AS)',
    `Scenario prompt: ${caseLine}`,
    `Assigned policy lens: ${policy.name} — ${policy.definition}`,
    '',
    'Model snapshot:',
    ...modelSnapshot.map(line=>`- ${line}`),
    '',
    'Investigation steps (IB command terms):',
    ...steps.map((step,index)=>`${index+1}) ${step}`),
    '',
    'Deliverables:',
    ...deliverables.map(item=>`- ${item}`),
    '',
    referenceFrame,
    policyAnchor
  ];
  const text=lines.join('\n');
  return {
    text,
    scenarioPrompt: caseLine,
    policyLens:{name:policy.name,definition:policy.definition},
    modelSnapshot,
    steps,
    deliverables,
    referenceFrame,
    policyAnchor
  };
}
function renderInvestigationDetails(data){
  if(!data) return;
  const scenarioEl=qs('#investigationScenario');
  if(scenarioEl) scenarioEl.textContent=data.scenarioPrompt;
  const policyEl=qs('#investigationPolicy');
  if(policyEl) policyEl.innerHTML=`<strong>${escapeHtml(data.policyLens.name)}</strong><br/>${escapeHtml(data.policyLens.definition)}`;
  const snapshotEl=qs('#investigationSnapshot');
  if(snapshotEl) snapshotEl.innerHTML=data.modelSnapshot.map(line=>`<li>${escapeHtml(line)}</li>`).join('');
  const stepsEl=qs('#investigationSteps');
  if(stepsEl) stepsEl.innerHTML=data.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('');
  const deliverablesEl=qs('#investigationDeliverables');
  if(deliverablesEl) deliverablesEl.innerHTML=data.deliverables.map(item=>`<li>${escapeHtml(item)}</li>`).join('');
  const referenceEl=qs('#investigationReference');
  if(referenceEl) referenceEl.innerHTML=`<strong>${escapeHtml(data.referenceFrame)}</strong><br/><span>${escapeHtml(data.policyAnchor)}</span>`;
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
  const mdQuantityShift=moneyMarketState.mdShift*config.mdShiftQuantityImpact;
  const eqInterestRaw=moneyMarketState.policyRate+(-config.slope)*mdQuantityShift-moneyMarketState.msShift*config.msShiftInterestImpact;
  const eqInterest=clamp(eqInterestRaw,config.interestBounds[0],config.interestBounds[1]);
  const intercept=eqInterest-config.slope*(eqQuantity-mdQuantityShift);
  const mdLinePoints=[
    [config.qRange[0],intercept+config.slope*(config.qRange[0]-mdQuantityShift)],
    [config.qRange[1],intercept+config.slope*(config.qRange[1]-mdQuantityShift)]
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

  caption.innerHTML=`<b>Money market equilibrium</b>: i ≈ ${eqInterest.toFixed(1)}%, Q ≈ ${eqQuantity.toFixed(0)}. The golden dot marks where downward-sloping Md (blue) meets vertical Ms (green). Policy rate slider lifts/lowers Md, Md buttons shift demand left/right, and Ms buttons shift money supply left/right.`;
}

function renderLoanableFundsDiagram(){
  const svg=qs('#loanableFundsSvg');
  const caption=qs('#loanableFundsCaption');
  const rateOut=qs('#lfPolicyRateVal');
  if(!svg||!caption||!rateOut) return;
  const W=560,H=300,pad={l:64,r:20,t:20,b:46};
  const x=q=>pad.l+((q-35)/130)*(W-pad.l-pad.r);
  const y=i=>pad.t+((11.5-i)/10.5)*(H-pad.t-pad.b);
  const cfg=LOANABLE_FUNDS_CONFIG;
  const eqFunds=clamp(
    cfg.baseFunds+loanableFundsState.supplyShift*cfg.supplyShiftFundsImpact-loanableFundsState.demandShift*cfg.demandShiftFundsImpact*0.35,
    cfg.qBounds[0],
    cfg.qBounds[1]
  );
  const eqRateRaw=loanableFundsState.policyRate+loanableFundsState.demandShift*cfg.demandShiftRateImpact-loanableFundsState.supplyShift*cfg.supplyShiftRateImpact;
  const eqRate=clamp(eqRateRaw,cfg.rateBounds[0],cfg.rateBounds[1]);
  const demandIntercept=eqRate-cfg.demandSlope*eqFunds;
  const supplyIntercept=eqRate-cfg.supplySlope*eqFunds;
  const demandShiftRateAdj=loanableFundsState.demandShift*0.5;
  const supplyShiftRateAdj=loanableFundsState.supplyShift*0.45;
  const demandLine=[
    [cfg.qRange[0],demandIntercept+cfg.demandSlope*cfg.qRange[0]+demandShiftRateAdj],
    [cfg.qRange[1],demandIntercept+cfg.demandSlope*cfg.qRange[1]+demandShiftRateAdj]
  ];
  const supplyLine=[
    [cfg.qRange[0],supplyIntercept+cfg.supplySlope*cfg.qRange[0]-supplyShiftRateAdj],
    [cfg.qRange[1],supplyIntercept+cfg.supplySlope*cfg.qRange[1]-supplyShiftRateAdj]
  ];
  const eqX=x(eqFunds);
  const eqY=y(eqRate);
  rateOut.textContent=`${loanableFundsState.policyRate.toFixed(1)}%`;

  svg.innerHTML=`
    <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="rgba(255,255,255,0.02)"/>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <text x="${W/2}" y="${H-12}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12">Quantity of loanable funds</text>
    <text x="18" y="${H/2}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12" transform="rotate(-90 18 ${H/2})">Real interest rate (%)</text>
  `;

  strokePath(svg,pathFromPoints(x,y,demandLine),'rgba(239,68,68,0.95)',4);
  strokePath(svg,pathFromPoints(x,y,supplyLine),'rgba(34,197,94,0.95)',4);
  line(svg,pad.l,eqY,eqX-8,eqY,'rgba(250,204,21,0.6)',1.2,'4 4');
  line(svg,eqX,eqY+8,eqX,H-pad.b,'rgba(250,204,21,0.6)',1.2,'4 4');
  point(svg,eqX,eqY,5,'rgba(250,204,21,0.95)');
  text(svg,x(demandLine[0][0])+8,y(demandLine[0][1])-8,'I demand','start','rgba(239,68,68,0.95)',11,true);
  text(svg,x(supplyLine[1][0])-8,y(supplyLine[1][1])-8,'Savings','end','rgba(34,197,94,0.95)',11,true);
  text(svg,pad.l-10,eqY+4,`${eqRate.toFixed(1)}%`,'end','rgba(250,204,21,0.95)',11,true);
  text(svg,eqX,H-pad.b+18,`Q ≈ ${eqFunds.toFixed(0)}`,'middle','rgba(250,204,21,0.95)',11,true);
  boxedLabel(svg,eqX+64,eqY-24,'Equilibrium','rgba(250,204,21,0.95)',{fill:'rgba(6,11,22,0.92)'});

  caption.innerHTML=`<b>Loanable funds equilibrium</b>: r ≈ ${eqRate.toFixed(1)}%, Q ≈ ${eqFunds.toFixed(0)}. Investment demand (red) slopes downward and savings supply (green) slopes upward. Demand buttons shift investment demand; savings buttons shift funds supply.`;
}

function renderCircularFlowDiagram(){
  const svg=qs('#circularFlowSvg');
  const caption=qs('#circularFlowCaption');
  const balanceLabel=qs('#circularFlowBalanceVal');
  if(!svg||!caption||!balanceLabel) return;
  const W=560,H=340;
  const config=CIRCULAR_FLOW_CONFIG;
  const injectionRatio=circularFlowState.injectionBalance/100;
  const leakageRatio=1-injectionRatio;
  balanceLabel.textContent=`${circularFlowState.injectionBalance.toFixed(0)}% injections · ${(100-circularFlowState.injectionBalance).toFixed(0)}% leakages`;
  svg.innerHTML=`
    <rect x='0' y='0' width='${W}' height='${H}' rx='16' fill='rgba(255,255,255,0.02)'/>
    <line x1='${W/2}' y1='16' x2='${W/2}' y2='${H-16}' stroke='rgba(226,232,240,0.2)' stroke-width='1.4'/>
    <line x1='16' y1='${H/2}' x2='${W-16}' y2='${H/2}' stroke='rgba(226,232,240,0.2)' stroke-width='1.4'/>
    <text x='${W/2}' y='32' fill='rgba(226,232,240,0.8)' text-anchor='middle' font-size='13'>Money flows (clockwise) and product markets</text>`;
  const nodes=config.nodes;
  const radius=config.nodeRadius||40;
  const shrinkPoint=(from,to)=>{
    const dx=to[0]-from[0];
    const dy=to[1]-from[1];
    const dist=Math.hypot(dx,dy);
    if(!dist) return [from[0],from[1]];
    const offset=radius-6;
    const ratio=offset/dist;
    return [from[0]+dx*ratio, from[1]+dy*ratio];
  };
  config.flows.forEach(flow=>{
    const source=nodes[flow.start];
    const target=nodes[flow.end];
    if(!source||!target) return;
    const start=[source.x,source.y];
    const end=[target.x,target.y];
    const startPoint=shrinkPoint(start,end);
    const endPoint=shrinkPoint(end,start);
    const dx=endPoint[0]-startPoint[0];
    const dy=endPoint[1]-startPoint[1];
    const normal=[-dy,dx];
    const normalLen=Math.hypot(normal[0],normal[1])||1;
    const offset=flow.offset||0;
    const midX=(startPoint[0]+endPoint[0])/2+(normal[0]/normalLen)*offset;
    const midY=(startPoint[1]+endPoint[1])/2+(normal[1]/normalLen)*offset;
    const path=`M ${startPoint[0].toFixed(1)} ${startPoint[1].toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${endPoint[0].toFixed(1)} ${endPoint[1].toFixed(1)}`;
    const intensity=flow.type==='injection'?injectionRatio:flow.type==='leakage'?leakageRatio:1;
    const width=flow.type==='real'?3.2:2.6+intensity*3.2;
    const alpha=flow.type==='real'?0.95:0.55+0.4*intensity;
    const strokeColor=`rgba(${flow.baseColor},${alpha.toFixed(2)})`;
    strokePath(svg,path,strokeColor,width);
    point(svg,endPoint[0],endPoint[1],4.2,strokeColor);
    if(flow.label&&flow.type!=='real'){
      const labelX=midX+(flow.labelOffset?.x||0);
      const labelY=midY+(flow.labelOffset?.y||0);
      text(svg,labelX,labelY,flow.label,'middle','rgba(226,232,240,0.75)',10);
    }
  });
  Object.values(nodes).forEach(node=>{
    if(!node) return;
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',node.x.toFixed(1));
    circle.setAttribute('cy',node.y.toFixed(1));
    circle.setAttribute('r',String(radius));
    circle.setAttribute('fill','rgba(15,23,42,0.95)');
    circle.setAttribute('stroke','rgba(148,163,184,0.6)');
    circle.setAttribute('stroke-width','1.8');
    svg.appendChild(circle);
    text(svg,node.x,node.y-(node.subLabel?6:0),node.label,'middle','rgba(226,232,240,0.95)',12.5,true);
    if(node.subLabel) text(svg,node.x,node.y+12,node.subLabel,'middle','rgba(226,232,240,0.6)',10);
  });
  const balance=circularFlowState.injectionBalance;
  const status=balance>52?'Injections exceed leakages, pushing aggregate demand upward.':balance<48?'Leakages outweigh injections, dampening spending.':'Leakages and injections stay balanced, keeping income stable.';
  caption.innerHTML=`<b>Circular flow of income</b>: ${balance}% injections vs ${100-balance}% leakages. ${status} Savings, taxes, and imports withdraw spending while investment, government spending, and exports inject new demand.`;
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

function adjustAdGraphShift(delta){
  adGraphState.shift=clamp(adGraphState.shift+delta,AD_GRAPH_CONFIG.min,AD_GRAPH_CONFIG.max);
  renderAdGraphDiagram();
}

function renderAdGraphDiagram(){
  const svg=qs('#adGraphSvg');
  const caption=qs('#adGraphCaption');
  if(!svg||!caption) return;
  const W=560,H=300,pad={l:64,r:20,t:20,b:46};
  const toX=Y=>pad.l+((Y-GRAPH.Ymin)/(GRAPH.Ymax-GRAPH.Ymin))*(W-pad.l-pad.r);
  const toY=P=>pad.t+((GRAPH.Pmax-P)/(GRAPH.Pmax-GRAPH.Pmin))*(H-pad.t-pad.b);
  rect(svg,0,0,W,H,14,'rgba(255,255,255,0.02)');
  line(svg,pad.l,pad.t,pad.l,H-pad.b,'rgba(226,232,240,0.65)',2.5);
  line(svg,pad.l,H-pad.b,W-pad.r,H-pad.b,'rgba(226,232,240,0.65)',2.5);
  text(svg,(pad.l+W-pad.r)/2,H-pad.b+20,'Real output (Y)','middle','rgba(226,232,240,0.9)',12);
  textRot(svg,18,(pad.t+(H-pad.b))/2,'Price level (P)',-90,'middle','rgba(226,232,240,0.9)',12);
  const baseSeg=adLineSegment(0).seg;
  const shiftSeg=adLineSegment(adGraphState.shift).seg;
  if(baseSeg) strokePath(svg,pathFromSegment(toX,toY,baseSeg),'rgba(148,163,184,0.45)',3,'3 3');
  if(shiftSeg) strokePath(svg,pathFromSegment(toX,toY,shiftSeg),'rgba(239,68,68,0.95)',5);
  if(shiftSeg){
    const midY=lerp(shiftSeg[0][0],shiftSeg[1][0],0.68);
    const midP=lerp(shiftSeg[0][1],shiftSeg[1][1],0.68);
    boxedLabel(svg,toX(midY)+32,toY(midP)-22,'AD','rgba(239,68,68,0.95)',{fill:'rgba(6,11,22,0.92)'});
  }
  const anchorY=GRAPH.adPivotY;
  const baseP=AD(anchorY,0);
  const shiftP=AD(anchorY,adGraphState.shift);
  const anchorX=toX(anchorY);
  const basePointY=toY(baseP);
  const shiftPointY=toY(shiftP);
  if(Math.abs(adGraphState.shift)>1e-6){
    line(svg,anchorX,basePointY,anchorX,shiftPointY,'rgba(250,204,21,0.6)',1.6,'4 4');
    const arrowY=adGraphState.shift>0?shiftPointY:basePointY;
    const arrowDir=adGraphState.shift>0?-6:6;
    line(svg,anchorX,arrowY,anchorX+arrowDir,arrowY-6,'rgba(250,204,21,0.7)',1.4);
    line(svg,anchorX,arrowY,anchorX-arrowDir,arrowY-6,'rgba(250,204,21,0.7)',1.4);
    point(svg,anchorX,basePointY,4,'rgba(148,163,184,0.85)');
    point(svg,anchorX,shiftPointY,5,'rgba(250,204,21,0.95)');
  } else {
    point(svg,anchorX,shiftPointY,5,'rgba(250,204,21,0.95)');
  }
  const directionLabel=adGraphState.shift===0?'Baseline AD':adGraphState.shift>0?'Rightward (demand-pull) shift':'Leftward (weaker demand) shift';
  const directionDesc=adGraphState.shift===0?'baseline':adGraphState.shift>0?'rightward (demand-pull)':'leftward (weaker demand)';
  const magnitude=adGraphState.shift===0?'':` (Δ ${adGraphState.shift>0?'+':''}${adGraphState.shift.toFixed(0)})`;
  caption.innerHTML=`<b>Aggregate demand live</b>: ${directionLabel}${magnitude}. The golden dot highlights the price change at fixed output when ${directionDesc} demand occurs.`;
}

function renderLongRunEquilibriumDiagram(){
  const svg=qs('#lreqSvg');
  const caption=qs('#lreqCaption');
  if(!svg||!caption) return;
  const W=560,H=300,pad={l:64,r:20,t:20,b:46};
  const toX=Y=>pad.l+((Y-GRAPH.Ymin)/(GRAPH.Ymax-GRAPH.Ymin))*(W-pad.l-pad.r);
  const toY=P=>pad.t+((GRAPH.Pmax-P)/(GRAPH.Pmax-GRAPH.Pmin))*(H-pad.t-pad.b);
  rect(svg,0,0,W,H,14,'rgba(255,255,255,0.02)');
  line(svg,pad.l,pad.t,pad.l,H-pad.b,'rgba(226,232,240,0.65)',2.5);
  line(svg,pad.l,H-pad.b,W-pad.r,H-pad.b,'rgba(226,232,240,0.65)',2.5);
  text(svg,(pad.l+W-pad.r)/2,H-pad.b+20,'Real output (Y)','middle','rgba(226,232,240,0.9)',12);
  textRot(svg,18,(pad.t+(H-pad.b))/2,'Price level (P)',-90,'middle','rgba(226,232,240,0.9)',12);

  const adSeg=adLineSegment(longRunEqState.adShift).seg;
  if(adSeg) strokePath(svg,pathFromSegment(toX,toY,adSeg),'rgba(239,68,68,0.95)',4.6);

  const asBase=asLineSegments(0,GRAPH.yFeBase);
  const yFeShifted=clamp(GRAPH.yFeBase+longRunEqState.lrasShift*6,GRAPH.Ymin+18,GRAPH.Ymax-18);
  const asShifted=asLineSegments(0,yFeShifted);
  if(asBase.seg1&&asBase.seg2){
    strokePath(svg,pathFromSegment(toX,toY,asBase.seg1),'rgba(148,163,184,0.35)',2.4,'4 4');
    strokePath(svg,pathFromSegment(toX,toY,asBase.seg2),'rgba(148,163,184,0.35)',2.4,'4 4');
  }
  if(asShifted.seg1&&asShifted.seg2){
    strokePath(svg,pathFromSegment(toX,toY,asShifted.seg1),'rgba(59,130,246,0.95)',4.2);
    strokePath(svg,pathFromSegment(toX,toY,asShifted.seg2),'rgba(59,130,246,0.95)',4.2);
    boxedLabel(svg,toX(asShifted.yKink)+26,toY(asShifted.pKink)-12,'SRAS','rgba(59,130,246,0.95)',{fill:'rgba(6,11,22,0.9)'});
  }
  line(svg,toX(yFeShifted),toY(GRAPH.Pmin),toX(yFeShifted),toY(GRAPH.Pmax),'rgba(34,197,94,0.95)',3.6);
  text(svg,toX(yFeShifted)+6,toY(GRAPH.Pmax)-8,'LRAS','start','rgba(34,197,94,0.95)',11,true);

  const eq=equilibrium({adShiftY:longRunEqState.adShift,asShiftP:0,yFe:yFeShifted});
  point(svg,toX(eq.y),toY(eq.p),5.5,'rgba(250,204,21,0.98)');
  line(svg,toX(eq.y),toY(eq.p),toX(eq.y),H-pad.b,'rgba(250,204,21,0.7)',1.5,'5 5');
  line(svg,pad.l,toY(eq.p),toX(eq.y),toY(eq.p),'rgba(250,204,21,0.7)',1.5,'5 5');

  const adText=longRunEqState.adShift===0?'AD baseline':longRunEqState.adShift>0?'AD shifted right':'AD shifted left';
  const lrasText=longRunEqState.lrasShift===0?'LRAS baseline':longRunEqState.lrasShift>0?'LRAS shifted right (higher potential output)':'LRAS shifted left (lower potential output)';
  caption.innerHTML=`<b>Long-run equilibrium</b>: ${adText}; ${lrasText}. Current intersection gives <b>Y = ${eq.y.toFixed(1)}</b> and <b>P = ${eq.p.toFixed(1)}</b>. In the long run, supply-side gains move LRAS right and raise potential output.`;
}

function renderPpfDiagram(){
  const svg=qs('#ppfSvg');
  const caption=qs('#ppfCaption');
  if(!svg||!caption) return;
  const W=560,H=300,pad={l:64,r:20,t:20,b:46};
  const x=g=>pad.l+((g)/100)*(W-pad.l-pad.r);
  const y=s=>pad.t+((100-s)/100)*(H-pad.t-pad.b);
  const techShift=ppfState.technology*7;
  const baseMaxX=94+techShift;
  const baseMaxY=90+techShift;
  const bias=ppfState.capitalBias*6;
  const ppfY=goods=>{
    const t=clamp(goods/baseMaxX,0,1);
    return clamp(baseMaxY*(1-Math.pow(t,1.55))+bias*(0.5-t),0,100);
  };
  const points=[];
  for(let g=0;g<=baseMaxX;g+=2){ points.push([x(g),y(ppfY(g))]); }
  const ppfPath=buildCatmullRomPath(points);
  const prodX=clamp(52+bias*0.8,8,96);
  const prodY=ppfY(prodX);

  svg.innerHTML=`
    <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="rgba(255,255,255,0.02)"/>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <text x="${W/2}" y="${H-12}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12">Capital goods</text>
    <text x="18" y="${H/2}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12" transform="rotate(-90 18 ${H/2})">Consumer goods</text>
    <path d="${ppfPath}" fill="none" stroke="rgba(96,165,250,0.95)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${x(prodX)}" y1="${H-pad.b}" x2="${x(prodX)}" y2="${y(prodY)}" stroke="rgba(250,204,21,0.9)" stroke-width="1.8" stroke-dasharray="5 6"/>
    <line x1="${pad.l}" y1="${y(prodY)}" x2="${x(prodX)}" y2="${y(prodY)}" stroke="rgba(250,204,21,0.9)" stroke-width="1.8" stroke-dasharray="5 6"/>
    <circle cx="${x(prodX)}" cy="${y(prodY)}" r="5" fill="rgba(250,204,21,0.95)"/>
    <text x="${x(prodX)+8}" y="${y(prodY)-8}" fill="rgba(250,204,21,0.95)" font-size="11" font-weight="700">Current mix</text>
  `;

  const biasLabel=ppfState.capitalBias>0?'capital goods priority':ppfState.capitalBias<0?'consumer goods priority':'balanced allocation';
  caption.innerHTML=`<b>PPF interpretation</b>: ${biasLabel}, technology shift ${ppfState.technology>=0?'+':''}${ppfState.technology}. Points on the curve are productively efficient; inward/outward shifts represent lower/higher productive capacity.`;
}

function renderLafferDiagram(){
  const svg=qs('#lafferSvg');
  const caption=qs('#lafferCaption');
  const rateVal=qs('#lafferRateVal');
  const enforcementVal=qs('#lafferEnforcementVal');
  if(!svg||!caption) return;

  const W=560,H=300,pad={l:64,r:24,t:20,b:46};
  const x=v=>pad.l+(v/100)*(W-pad.l-pad.r);
  const y=v=>pad.t+((100-v)/100)*(H-pad.t-pad.b);

  const compliance=0.65+(lafferState.enforcement/100)*0.55;
  const peakRate=clamp(45-(lafferState.enforcement-50)*0.18,30,60);
  const maxRevenue=clamp(68+(lafferState.enforcement-50)*0.26,45,92);
  const revenueAtRate=rate=>{
    const t=clamp(rate/100,0,1);
    const p=peakRate/100;
    const normalized=4*t*(1-t);
    const skewAdj=1-Math.abs(t-p)*0.85;
    return clamp(maxRevenue*normalized*skewAdj*compliance,0,100);
  };

  const points=[];
  for(let r=0;r<=100;r+=2){ points.push([x(r),y(revenueAtRate(r))]); }
  const curvePath=buildCatmullRomPath(points);
  const currentRevenue=revenueAtRate(lafferState.taxRate);

  svg.innerHTML=`
    <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="rgba(255,255,255,0.02)"/>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="rgba(226,232,240,0.65)" stroke-width="2.5"/>
    <text x="${W/2}" y="${H-12}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12">Tax rate (%)</text>
    <text x="18" y="${H/2}" fill="rgba(226,232,240,0.9)" text-anchor="middle" font-size="12" transform="rotate(-90 18 ${H/2})">Tax revenue index</text>
    <path d="${curvePath}" fill="none" stroke="rgba(16,185,129,0.98)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${x(lafferState.taxRate)}" y1="${H-pad.b}" x2="${x(lafferState.taxRate)}" y2="${y(currentRevenue)}" stroke="rgba(250,204,21,0.9)" stroke-width="1.8" stroke-dasharray="5 6"/>
    <line x1="${pad.l}" y1="${y(currentRevenue)}" x2="${x(lafferState.taxRate)}" y2="${y(currentRevenue)}" stroke="rgba(250,204,21,0.9)" stroke-width="1.8" stroke-dasharray="5 6"/>
    <circle cx="${x(lafferState.taxRate)}" cy="${y(currentRevenue)}" r="5" fill="rgba(250,204,21,0.95)"/>
    <line x1="${x(peakRate)}" y1="${pad.t}" x2="${x(peakRate)}" y2="${H-pad.b}" stroke="rgba(96,165,250,0.5)" stroke-width="1.5" stroke-dasharray="4 6"/>
    <text x="${x(peakRate)+6}" y="${pad.t+14}" fill="rgba(96,165,250,0.9)" font-size="11" font-weight="700">Peak ≈ ${peakRate.toFixed(0)}%</text>
  `;

  if(rateVal) rateVal.textContent=`${Math.round(lafferState.taxRate)}%`;
  if(enforcementVal) enforcementVal.textContent=`${Math.round(lafferState.enforcement)}%`;

  caption.innerHTML=`<b>Laffer interpretation</b>: at tax rate <b>${Math.round(lafferState.taxRate)}%</b>, estimated revenue index is <b>${currentRevenue.toFixed(1)}</b>. Higher compliance shifts potential revenue upward; very high rates can still reduce collections through base erosion and avoidance incentives.`;
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
    const rawValue=storageGet(FLASHCARD_STORAGE_KEY);
    const raw=JSON.parse(rawValue||'{}');
    return raw&&typeof raw==='object'?raw:{};
  }catch{return {};}
}
function saveFlashcardProgress(){
  storageSet(FLASHCARD_STORAGE_KEY,JSON.stringify(flashcardProgress));
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
function updateWorksheetPreview(){
  const preview=qs('#worksheetPrintArea');
  if(!preview) return;
  const topic=getWorksheetTopic();
  const instructions=worksheetState.instructions||WORKSHEET_DEFAULT_INSTRUCTIONS;
  const questions=(topic.questions||[]).slice();
  const questionHtml=questions.length?questions.map((question,index)=>{
    const optionHtml=question.options.map((option,optIndex)=>`<li>${String.fromCharCode(65+optIndex)}. ${escapeHtml(option)}</li>`).join('');
    return `
      <div class="worksheetQuestion">
        <div class="worksheetQuestion__prompt">${index+1}. ${escapeHtml(question.prompt)}</div>
        <ol class="worksheetQuestion__options" type="A">${optionHtml}</ol>
        <div class="worksheetQuestion__responseLine">Response: __________________________________________</div>
        ${worksheetState.includeAnswers?`<div class="worksheetQuestion__answerKey">Answer: ${escapeHtml(question.answer)}</div>`:''}
      </div>`;
  }).join(''):'<div class="policy__text">No questions available for this topic yet.</div>';
  preview.innerHTML=`
    <div class="worksheetPreview__header">
      <div class="worksheetPreview__title">${escapeHtml(topic.title)} Worksheet</div>
      <div class="worksheetPreview__meta">${escapeHtml(topic.summary)}</div>
    </div>
    <div class="worksheetPreview__instructions">
      <strong>Instructions:</strong>
      <p>${escapeHtml(instructions)}</p>
    </div>
    <div class="worksheetQuestions">${questionHtml}</div>
  `;
}

function renderWorksheetGenerator(){
  const root=qs('#worksheetGeneratorRoot');
  if(!root) return;
  const topicOptions=LEARN_TOPIC_PRACTICE.map(topic=>`<option value="${topic.id}">${escapeHtml(topic.title)}</option>`).join('');
  root.innerHTML=`
    <div class="learnCard worksheetGenerator">
      <div class="worksheetGenerator__controls">
        <div class="worksheetGenerator__selector">
          <label class="policy__text" for="worksheetTopicSelect">Topic</label>
          <select id="worksheetTopicSelect">${topicOptions}</select>
        </div>
        <label class="worksheetGenerator__toggle toggle"><input id="worksheetIncludeAnswers" type="checkbox"/> Include answer key (teacher copy)</label>
        <div class="worksheetGenerator__actions">
          <button id="worksheetPrintButton" class="btn btn--primary" type="button">Print worksheet</button>
        </div>
      </div>
      <div class="worksheetGenerator__instructions">
        <label class="policy__text" for="worksheetInstructions">Instructions</label>
        <textarea id="worksheetInstructions" class="textInput" rows="3"></textarea>
      </div>
      <div id="worksheetPrintArea" class="worksheetPreview" role="region" aria-live="polite"></div>
    </div>
  `;
  const topicSelect=qs('#worksheetTopicSelect');
  if(topicSelect){
    topicSelect.value=worksheetState.topicId;
    topicSelect.onchange=e=>{
      worksheetState.topicId=e.target.value;
      updateWorksheetPreview();
    };
  }
  const instructionsField=qs('#worksheetInstructions');
  if(instructionsField){
    instructionsField.value=worksheetState.instructions||WORKSHEET_DEFAULT_INSTRUCTIONS;
    instructionsField.oninput=e=>{
      worksheetState.instructions=e.target.value;
      updateWorksheetPreview();
    };
  }
  const answerToggle=qs('#worksheetIncludeAnswers');
  if(answerToggle){
    answerToggle.checked=worksheetState.includeAnswers;
    answerToggle.onchange=e=>{
      worksheetState.includeAnswers=e.target.checked;
      updateWorksheetPreview();
    };
  }
  const printButton=qs('#worksheetPrintButton');
  if(printButton) printButton.onclick=()=>{
    updateWorksheetPreview();
    window.print();
  };
  updateWorksheetPreview();
}

function renderLearnPracticeModule(){
  const root=qs('#learnPracticeRoot');
  if(!root) return;
  const attempts=progress.learnPracticeAttempts||[];
  const avg=attempts.length?(attempts.reduce((a,b)=>a+b.score,0)/attempts.length).toFixed(1):'—';

  root.innerHTML=`
    <div class="learnCard">
      <div class="policy__name">Practice history</div>
      <div class="policy__text">Attempts: ${attempts.length} · Average score: ${avg}%</div>
    </div>
    <div class="learnCard">
      <div id="learnPracticeProgress" class="policy__text">Session progress: 0/${TOTAL_PRACTICE_QUESTIONS} answered · 0 correct</div>
    </div>
    <div id="learnPracticeTopics" class="learnPracticeTopics"></div>
    <div class="scenarioToolbar learnActions">
      <button id="btnLearnPracticeRecord" class="btn btn--primary" type="button">Record practice attempt</button>
    </div>
  `;

  const topicsHost=qs('#learnPracticeTopics');
  if(!topicsHost) return;
  topicsHost.innerHTML=LEARN_TOPIC_PRACTICE.map(topic=>`
    <div class="learnPracticeTopic">
      <div class="sectionTitle">${escapeHtml(topic.title)}</div>
      <div class="sectionHint">${escapeHtml(topic.summary)}</div>
      ${topic.questions.map(question=>`
        <div class="learnCard learnPracticeTopic__card">
          <div class="policy__text"><b>${escapeHtml(question.prompt)}</b></div>
          <div class="scenarioToolbar learnActions">
            ${question.options.map((option,idx)=>`<button type="button" class="btn btn--ghost" data-practice-topic="${topic.id}" data-practice-q="${question.id}" data-practice-option="${idx}">${escapeHtml(option)}</button>`).join('')}
          </div>
          <div id="learn_practice_fb_${question.id}" class="policy__text"></div>
        </div>
      `).join('')}
    </div>
  `).join('');

  const practiceState={outcomes:[],answered:new Set()};
  const progressLabel=qs('#learnPracticeProgress');
  const updateSessionProgress=()=>{
    const score=computePracticeScore(practiceState.outcomes);
    if(progressLabel) progressLabel.textContent=`Session progress: ${practiceState.outcomes.length}/${TOTAL_PRACTICE_QUESTIONS} answered · ${score.correct} correct`;
  };

  topicsHost.onclick=e=>{
    const button=e.target.closest('[data-practice-q]');
    if(!button) return;
    const questionId=button.dataset.practiceQ;
    if(!questionId||practiceState.answered.has(questionId)) return;
    const question=PRACTICE_QUESTION_LOOKUP.get(questionId);
    if(!question) return;
    const optionIndex=Number(button.dataset.practiceOption||'0');
    const selection=question.options[optionIndex];
    if(selection==null) return;
    const feedback=evaluatePracticeAnswer(question,selection);
    practiceState.answered.add(questionId);
    practiceState.outcomes.push({questionId,topicId:button.dataset.practiceTopic,isCorrect:feedback.isCorrect});
    const optionGroup=button.parentElement;
    optionGroup?.querySelectorAll('button').forEach(b=>b.disabled=true);
    const fb=qs(`#learn_practice_fb_${questionId}`);
    if(fb) fb.textContent=feedback.message;
    updateSessionProgress();
  };

  const recordButton=qs('#btnLearnPracticeRecord');
  if(recordButton) recordButton.onclick=()=>{
    if(!practiceState.outcomes.length){
      showStatus('Answer at least one question before recording an attempt.',true,2200);
      return;
    }
    const score=computePracticeScore(practiceState.outcomes);
    progress.learnPracticeAttempts=[...(progress.learnPracticeAttempts||[]),{ts:Date.now(),score:score.score,total:score.total,correct:score.correct}].slice(-30);
    saveProgress(progress);
    showStatus(`Practice score recorded: ${score.score}%`);
    renderLearnPracticeModule();
  };

  updateSessionProgress();
}

function formatShortDate(value){
  if(!value) return '';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString(undefined,{month:'short',day:'numeric'});
}

function deriveTopicStats(attempts){
  if(!attempts||!attempts.length) return {best:null,average:null,last:null};
  const best=attempts.reduce((max,item)=>Math.max(max,item.score||0),0);
  const average=Math.round(attempts.reduce((sum,item)=>sum+(item.score||0),0)/attempts.length);
  const last=attempts[attempts.length-1];
  return {best,average,last};
}

function renderLearnTopicQuizzes(){
  const root=qs('#learnTopicQuizRoot');
  if(!root) return;
  const cards=LEARN_TOPIC_PRACTICE.map(topic=>{
    const attempts=(progress.learnTopicQuizzes[topic.id]?.attempts)||[];
    const stats=deriveTopicStats(attempts);
    const active=topicQuizState.topicId===topic.id;
    const lastLabel=stats.last?`Last: ${formatShortDate(stats.last.ts)} · ${stats.last.score}%`:'No attempts yet';
    return `<div class="learnTopicQuizCard${active?' learnTopicQuizCard--active':''}">
      <div class="learnTopicQuizCard__header">
        <div>
          <div class="policy__name">${escapeHtml(topic.title)}</div>
          <div class="policy__text">${escapeHtml(topic.summary)}</div>
        </div>
        <button class="btn btn--ghost" data-topic-quiz-start="${topic.id}">Start quiz</button>
      </div>
      <div class="learnTopicQuizCard__stats">
        <div><span>Best</span><strong>${stats.best!==null?stats.best+'%':'—'}</strong></div>
        <div><span>Average</span><strong>${stats.average!==null?stats.average+'%':'—'}</strong></div>
        <div><span>Attempts</span><strong>${attempts.length}</strong></div>
        <div class="learnTopicQuizCard__meta">${escapeHtml(lastLabel)}</div>
      </div>
    </div>`;
  }).join('');
  root.innerHTML=cards||'<div class="learnCard"><div class="policy__text">Start a topic quiz to capture scores per module.</div></div>';
  root.onclick=e=>{const btn=e.target.closest('[data-topic-quiz-start]');if(!btn) return;startTopicQuiz(btn.dataset.topicQuizStart);};
}

function renderTopicQuizHost(){
  const host=qs('#topicQuizHost');
  if(!host) return;
  if(!topicQuizState.topicId){
    host.innerHTML=`<div class="learnCard"><div class="policy__name">Topic quiz mode</div><div class="policy__text">Select a quiz card above to begin. Scores track progress per topic.</div></div>`;
    host.onclick=null;
    return;
  }
  const topic=LEARN_TOPIC_PRACTICE.find(t=>t.id===topicQuizState.topicId);
  if(!topic){ topicQuizState.topicId=null; renderTopicQuizHost(); return; }
  if(topicQuizState.completed){
    const summary=topicQuizState.summary||computePracticeScore(topicQuizState.answers.map(a=>({isCorrect:a.isCorrect})));
    host.innerHTML=`<div class="learnCard learnTopicQuizActiveCard">
      <div class="policy__name">Quiz complete — ${escapeHtml(topic.title)}</div>
      <div class="policy__text">Score: ${summary.correct}/${summary.total} correct · ${summary.score}%</div>
      <div class="policy__text">Your attempt is saved locally. Restart to try again.</div>
      <div class="scenarioToolbar learnActions">
        <button class="btn btn--ghost" data-topic-quiz-restart>Restart quiz</button>
        <button class="btn btn--ghost" data-topic-quiz-newtopic>Pick another topic</button>
      </div>
    </div>`;
  }else{
    const question=topic.questions[topicQuizState.questionIndex];
    if(!question){
      topicQuizState.completed=true;
      finalizeTopicQuiz(topic);
      return;
    }
    host.innerHTML=`<div class="learnCard learnTopicQuizActiveCard">
      <div class="policy__name">Quiz: ${escapeHtml(topic.title)}</div>
      <div class="policy__text">Question ${topicQuizState.questionIndex+1} of ${topic.questions.length}</div>
      <div class="policy__text" style="margin-top:8px;">${escapeHtml(question.prompt)}</div>
      <div class="scenarioToolbar learnActions">
        ${question.options.map((option,idx)=>`<button class="btn btn--ghost" data-topic-quiz-answer="${idx}">${escapeHtml(option)}</button>`).join('')}
      </div>
      ${topicQuizState.feedback?`<div class="policy__text learnTopicQuizFeedback ${topicQuizState.feedback.correct?'correct':'incorrect'}">${escapeHtml(topicQuizState.feedback.message)}</div>`:''}
    </div>`;
  }
  host.onclick=e=>{const answerBtn=e.target.closest('[data-topic-quiz-answer]');if(answerBtn){handleTopicQuizAnswer(Number(answerBtn.dataset.topicQuizAnswer));return;}const restartBtn=e.target.closest('[data-topic-quiz-restart]');if(restartBtn){startTopicQuiz(topicQuizState.topicId);return;}const newTopic=e.target.closest('[data-topic-quiz-newtopic]');if(newTopic){topicQuizState.topicId=null;topicQuizState.feedback=null;topicQuizState.completed=false;topicQuizState.summary=null;topicQuizState.answers=[];topicQuizState.questionIndex=0;renderTopicQuizHost();renderLearnTopicQuizzes();}};
}

function startTopicQuiz(topicId){
  const topicExists=LEARN_TOPIC_PRACTICE.some(t=>t.id===topicId);
  if(!topicExists) return;
  topicQuizState.topicId=topicId;
  topicQuizState.questionIndex=0;
  topicQuizState.answers=[];
  topicQuizState.feedback=null;
  topicQuizState.completed=false;
  topicQuizState.summary=null;
  renderTopicQuizHost();
  renderLearnTopicQuizzes();
}

function handleTopicQuizAnswer(optionIndex){
  const topic=LEARN_TOPIC_PRACTICE.find(t=>t.id===topicQuizState.topicId);
  if(!topic||topicQuizState.completed) return;
  const question=topic.questions[topicQuizState.questionIndex];
  if(!question) return;
  if(topicQuizState.answers.some(a=>a.questionId===question.id)) return;
  const selection=question.options[optionIndex];
  if(selection==null) return;
  const isCorrect=selection===question.answer;
  const message=isCorrect?`✅ Correct. ${question.explanation}`:`❌ Correct answer: ${question.answer}. ${question.explanation}`;
  topicQuizState.answers.push({questionId:question.id,isCorrect});
  topicQuizState.feedback={message,correct:isCorrect};
  if(topicQuizState.answers.length>=topic.questions.length){
    topicQuizState.completed=true;
    finalizeTopicQuiz(topic);
  }else{
    topicQuizState.questionIndex=Math.min(topicQuizState.questionIndex+1,topic.questions.length-1);
  }
  renderTopicQuizHost();
  renderLearnTopicQuizzes();
}

function finalizeTopicQuiz(topic){
  const scoreInfo=computePracticeScore(topicQuizState.answers);
  const history=progress.learnTopicQuizzes[topic.id]||{attempts:[]};
  const attempt={ts:Date.now(),score:scoreInfo.score,total:scoreInfo.total,correct:scoreInfo.correct};
  history.attempts=[...(history.attempts||[]),attempt].slice(-20);
  progress.learnTopicQuizzes[topic.id]=history;
  saveProgress(progress);
  topicQuizState.summary=scoreInfo;
  renderLearnTopicQuizzes();
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
  qs('#toggleAccess').onchange=e=>{settings.accessibility=e.target.checked; storageSet('macrow_access',settings.accessibility?'1':'0'); document.body.classList.toggle('accessibility-mode',settings.accessibility);};
  qs('#toggleAssess').checked=settings.assessEnabled;
  qs('#toggleAssess').onchange=e=>{
    settings.assessEnabled=e.target.checked;
    storageSet('macrow_assess_enabled',settings.assessEnabled?'1':'0');
    syncAssessAvailability();
  };
  qs('#btnOpenShortcuts').onclick=openShortcuts;
}

// Teacher Dashboard MVP - Basic teacher view for monitoring student progress
const TEACHER_STORAGE_KEY = 'macrow_teacher_data_v1';
function readTeacherStorage(){
  try{
    const raw=storageGet(TEACHER_STORAGE_KEY);
    return raw?JSON.parse(raw):{};
  }catch{
    return {};
  }
}
function loadTeacherData(userKey){
  if(!userKey) return {};
  const store=readTeacherStorage();
  return store[userKey]||{};
}
function saveTeacherData(userKey,data){
  if(!userKey) return;
  const store=readTeacherStorage();
  store[userKey]=data||{};
  storageSet(TEACHER_STORAGE_KEY,JSON.stringify(store));
}

function renderTeacherPanel(){
  const root=qs('#panelTeacher');
  if(!root) return;
  if(!currentUser||currentUser.role!=='teacher'){
    root.innerHTML=`
      <div class="sectionTitle">Teacher dashboard</div>
      <div class="sectionHint">Sign in as a teacher to unlock analytics and assignments.</div>
      <div class="learnCard">
        <div class="policy__name">Teacher access required</div>
        <div class="policy__text">Authenticate to review student progress, assign scenarios, and unlock classroom tools.</div>
        <div style="margin-top:14px;"><button id="btnTeacherSignIn" class="btn btn--primary">Sign in</button></div>
      </div>
    `;
    qs('#btnTeacherSignIn')?.addEventListener('click',()=>openAuthOverlay('login'));
    return;
  }
  const teacherData=loadTeacherData(currentUser.normalized);
  const students=teacherData.students||[];
  const assignedScenarios=teacherData.assignedScenarios||[];
  
  // Mock student data if none exists
  const displayStudents=students.length?students:[
    {id:'s1',name:'Alex',lastActive:Date.now()-3600000,progress:75,assessScore:82},
    {id:'s2',name:'Jordan',lastActive:Date.now()-7200000,progress:45,assessScore:68},
    {id:'s3',name:'Taylor',lastActive:Date.now()-86400000,progress:90,assessScore:95},
  ];
  
  const now=Date.now();
  const fmtTime=ts=>{const diff=now-ts; if(diff<3600000)return'M'+Math.round(diff/60000); if(diff<86400000)return'H'+Math.round(diff/3600000); return'D'+Math.round(diff/86400000);};
  const formatTimeAgo=ts=>{if(!Number.isFinite(ts))return'—';const label=fmtTime(ts);if(!label)return'—';const unit=label[0];const value=label.slice(1);if(!value)return'—';if(unit==='M')return`${value} min ago`;if(unit==='H')return`${value} hr ago`;if(unit==='D')return`${value} day${value==='1'?'':'s'} ago`;return`${value} ago`;};
  const analytics=summarizeTeacherAnalytics({progress,scenarios,teacherData,now});
  const avgScoreDisplay=analytics.avgScore!=null?`${analytics.avgScore}%`:'—';
  const avgScoreHint=analytics.lastAttemptTs?`Last attempt ${fmtTime(analytics.lastAttemptTs)} ago`:'No quiz attempts recorded yet.';
  const bestScoreNote=analytics.bestScore!=null?` · Best ${analytics.bestScore}%`:'';
  const streakLabel=`${analytics.streak} day${analytics.streak===1?'':'s'}`;
  const streakHint=analytics.streak?'Consistent quiz practice':'Record quizzes to build a streak';
  const scenarioLabel=Number.isFinite(analytics.totalScenarios)?analytics.totalScenarios:0;
  const scenarioHint=analytics.totalScenarios?`${analytics.scenarioCategories} categories saved`:'Save scenarios to track usage';
  const assignmentLabel=analytics.assignmentsCount??0;
  const assignmentHint=analytics.lastAssignmentTs?`Last assignment ${fmtTime(analytics.lastAssignmentTs)} ago`:'Assign a scenario to get started';
  const practiceHistory=progress.learnPracticeAttempts||[];
  const practiceAverage=practiceHistory.length
    ? (practiceHistory.reduce((sum,attempt)=>sum+(Number(attempt.score)||0),0)/practiceHistory.length).toFixed(1)
    : null;
  const latestPractice=practiceHistory.length
    ? practiceHistory[practiceHistory.length-1]
    : null;
  const competencyEntries=Object.entries(progress.competencies||{});
  const competencyPoints=competencyEntries.reduce((sum,[_key,value])=>sum+(Number(value)||0),0);
  const competencyCount=competencyEntries.length;
  const topicInsights=Object.entries(progress.learnTopicQuizzes||{}).map(([topicId,entry])=>{
    const attempts=(entry?.attempts)||[];
    const stats=deriveTopicStats(attempts);
    const topicMeta=LEARN_TOPIC_PRACTICE.find(t=>t.id===topicId);
    return{
      id:topicId,
      title:topicMeta?.title||topicId,
      attempts:attempts.length,
      best:stats.best,
      average:stats.average,
      lastAttempt:stats.last
    };
  }).sort((a,b)=>((b.best||0)-(a.best||0)));
  const topTopics=topicInsights.slice(0,3);
  const timelineAttempts=(progress.quizAttempts||[]).slice(-4).reverse();
  const timelineHtml=timelineAttempts.length
    ? timelineAttempts.map(attempt=>`
        <div class="progressTracker__timelineItem">
          <div class="progressTracker__timelineScore">${Number.isFinite(Number(attempt.score))?`${Math.round(attempt.score)}%`:'—'}</div>
          <div class="progressTracker__timelineHint">${formatTimeAgo(Number(attempt.ts))}</div>
        </div>
      `).join('')
    : '<div class="policy__text">No quiz attempts yet. Encourage students to try the Assess tab.</div>';
  const topicItemsHtml=topTopics.length
    ? topTopics.map(topic=>`
        <div class="progressTracker__topic">
          <div class="progressTracker__topicTitle">${escapeHtml(topic.title)}</div>
          <div class="progressTracker__topicValue">${topic.best!==null?`${topic.best}%`:'—'} best</div>
          <div class="progressTracker__topicHint">${topic.attempts} attempt${topic.attempts===1?'':'s'} · ${topic.lastAttempt?`${topic.lastAttempt.score}% · ${formatTimeAgo(topic.lastAttempt.ts)}`:'No recent data'}</div>
        </div>
      `).join('')
    : '<div class="progressTracker__topicEmpty">No topic quizzes recorded yet. Encourage students to explore the Learn tab.</div>';
  const progressTrackerHtml=`
    <div class="sectionTitle">Student progress tracking</div>
    <div class="learnCard progressTracker">
      <div class="progressTracker__grid">
        <div class="progressTracker__item">
          <div class="progressTracker__label">Average quiz score</div>
          <div class="progressTracker__value">${analytics.avgScore!=null?`${analytics.avgScore}%`:'—'}</div>
          <div class="progressTracker__hint">${analytics.attemptsCount} attempts · ${streakLabel} streak</div>
        </div>
        <div class="progressTracker__item">
          <div class="progressTracker__label">Practice sessions</div>
          <div class="progressTracker__value">${practiceHistory.length}</div>
          <div class="progressTracker__hint">${practiceAverage!==null?`Avg ${practiceAverage}%`:'No practice recorded yet'}</div>
        </div>
        <div class="progressTracker__item">
          <div class="progressTracker__label">Competency mastery</div>
          <div class="progressTracker__value">${competencyCount?competencyPoints:'—'}</div>
          <div class="progressTracker__hint">${competencyCount?`${competencyCount} competencies tracked`:'No competency data yet'}</div>
        </div>
        <div class="progressTracker__item">
          <div class="progressTracker__label">Latest practice score</div>
          <div class="progressTracker__value">${latestPractice?.score!=null?`${Math.round(latestPractice.score)}%`:'—'}</div>
          <div class="progressTracker__hint">${latestPractice?formatTimeAgo(latestPractice.ts):'No recent practice'}</div>
        </div>
      </div>
      <div class="progressTracker__timeline">
        <div class="progressTracker__timelineTitle">Recent quiz attempts</div>
        <div class="progressTracker__timelineList">${timelineHtml}</div>
      </div>
      <div class="progressTracker__topics">
        <div class="progressTracker__topicsTitle">Topic performance</div>
        <div class="progressTracker__topicList">${topicItemsHtml}</div>
      </div>
    </div>
  `;
  
  root.innerHTML=`
    <div class="sectionTitle">Teacher Dashboard</div>
    <div class="sectionHint">Monitor student progress and assign scenarios (MVP - localStorage only)</div>
    
    <div class="learnCard">
      <div class="policy__name">Class Overview</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;">
        <div style="text-align:center;"><div style="font-size:24px;font-weight:700;">${displayStudents.length}</div><div class="sectionHint">Students</div></div>
        <div style="text-align:center;"><div style="font-size:24px;font-weight:700;">${Math.round(displayStudents.reduce((a,s)=>a+s.progress,0)/displayStudents.length)||0}%</div><div class="sectionHint">Avg Progress</div></div>
        <div style="text-align:center;"><div style="font-size:24px;font-weight:700;">${Math.round(displayStudents.reduce((a,s)=>a+(s.assessScore||0),0)/displayStudents.length)||0}%</div><div class="sectionHint">Avg Score</div></div>
      </div>
    </div>
    
    <div class="sectionTitle">Teacher analytics</div>
    <div class="learnCard analyticsGrid">
      <div class="analyticsMetric">
        <div class="analyticsMetric__value">${scenarioLabel}</div>
        <div class="analyticsMetric__label">Scenarios saved</div>
        <div class="analyticsMetric__hint">${scenarioHint}</div>
      </div>
      <div class="analyticsMetric">
        <div class="analyticsMetric__value">${avgScoreDisplay}</div>
        <div class="analyticsMetric__label">Average quiz score</div>
        <div class="analyticsMetric__hint">${avgScoreHint}${bestScoreNote}</div>
      </div>
      <div class="analyticsMetric">
        <div class="analyticsMetric__value">${streakLabel}</div>
        <div class="analyticsMetric__label">Quiz streak</div>
        <div class="analyticsMetric__hint">${streakHint}</div>
      </div>
      <div class="analyticsMetric">
        <div class="analyticsMetric__value">${assignmentLabel}</div>
        <div class="analyticsMetric__label">Assignments assigned</div>
        <div class="analyticsMetric__hint">${assignmentHint}</div>
      </div>
    </div>
    
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
      <div class="sectionTitle" style="margin:0;">Student Progress</div>
      <button id="btnExportTeacherProgressCsv" class="btn btn--ghost" type="button">Export progress (CSV)</button>
    </div>
    ${displayStudents.map(s=>`
      <div class="learnCard">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><b>${escapeHtml(s.name)}</b><div class="sectionHint">Active ${fmtTime(s.lastActive)} ago</div></div>
          <div style="text-align:right;">
            <div>Progress: ${s.progress||0}%</div>
            <div>Assess: ${s.assessScore||'—'}%</div>
          </div>
        </div>
        <div style="margin-top:8px;background:rgba(255,255,255,0.1);height:6px;border-radius:3px;"><div style="background:rgba(59,130,246,0.8);height:100%;border-radius:3px;width:${s.progress||0}%"></div></div>
      </div>
    `).join('')}
    
    <div class="sectionTitle">Lesson plan library</div>
    <div class="lessonPlanLibrary">
      ${LESSON_PLANS.map(plan=>`
        <div class="lessonPlanCard">
          <div class="lessonPlanCard__header">
            <div>
              <div class="lessonPlanCard__title">${escapeHtml(plan.title)}</div>
              <div class="lessonPlanCard__focus">${escapeHtml(plan.focus)}</div>
            </div>
            <div class="lessonPlanCard__duration">${escapeHtml(plan.duration)}</div>
          </div>
          <div class="lessonPlanCard__objective">${escapeHtml(plan.objective)}</div>
          <ul class="lessonPlanCard__steps">
            ${plan.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}
          </ul>
          ${plan.resources && plan.resources.length ? `<div class="lessonPlanCard__resources">${plan.resources.map(resource=>`<div>${escapeHtml(resource)}</div>`).join('')}</div>` : ''}
          <div class="lessonPlanCard__actions">
            <button class="btn btn--ghost btn--full" data-lesson-plan="${plan.id}">Load scenario & share</button>
          </div>
        </div>
      `).join('')}
    </div>
    
    ${progressTrackerHtml}
    
    <div class="sectionTitle">Assign Scenarios</div>
    <div class="learnCard">
      <div class="policy__name">Create Assignment</div>
      <div class="scenarioToolbar" style="margin-top:8px;flex-wrap:wrap;">
        <select id="teacherScenarioSelect" class="textInput" aria-label="Select scenario">
          <option value="">— Select a scenario -</option>
          <option value="recession">Recessionary Gap</option>
          <option value="inflation">Demand-Pull Inflation</option>
          <option value="costpush">Cost-Push Inflation</option>
          <option value="growth">Long-run Growth</option>
        </select>
        <button id="btnAssignScenario" class="btn btn--primary">Assign to Class</button>
      </div>
      <div id="teacherAssignedList" class="sectionHint" style="margin-top:12px;">
        ${assignedScenarios.length?assignedScenarios.map(a=>`<div>📌 ${escapeHtml(a.scenario)} - Assigned ${fmtTime(a.assignedAt)} ago</div>`).join(''):'No assignments yet.'}
      </div>
    </div>
    
    <div class="learnCard">
      <div class="policy__name">Teacher Tips</div>
      <div class="policy__text">
        • Use the <b>Scenarios</b> tab to create custom problems<br>
        • Students can share their scenario URL with you<br>
        • Track assess mode scores for formative data
      </div>
    </div>
  `;

  root.querySelectorAll('[data-lesson-plan]').forEach(btn=>{
    btn.onclick=()=>handleLessonPlanLoad(btn.dataset.lessonPlan);
  });

  qs('#btnAssignScenario').onclick=()=>{
    const select=qs('#teacherScenarioSelect');
    const scenario=select?.value;
    if(!scenario) return;
    const assignment={scenario:select.options[select.selectedIndex].text,assignedAt:Date.now()};
    const updatedData={
      ...teacherData,
      assignedScenarios:[assignment,...(teacherData.assignedScenarios||[])]
    };
    saveTeacherData(currentUser.normalized,updatedData);
    renderTeacherPanel();
  };

  qs('#btnExportTeacherProgressCsv')?.addEventListener('click',()=>{
    exportTeacherProgressCsv({
      students:displayStudents,
      progress,
      analytics,
      now:Date.now()
    });
  });
}

function handleLessonPlanLoad(planId){
  const plan=LESSON_PLANS.find(p=>p.id===planId);
  if(!plan) return;
  const profile=plan.profile&&SHIFT_PROFILES[plan.profile];
  if(profile){
    state.params=applyShiftProfile(deepCopy(defaults.params),profile);
  } else if(plan.manual){
    state.params={...state.params,...plan.manual};
  }
  onParamsChanged(true);
  showStatus(`${plan.title} lesson plan loaded. Share it with your class.`,false,3200);
}

function syncParamReadouts(){paramDefs.forEach(d=>{qs(`#val_${d.key}`).textContent=d.format(state.params[d.key]); qs(`#rng_${d.key}`).value=state.params[d.key];});}

qs('#btnReset').onclick=()=>{state.params=deepCopy(defaults.params); onParamsChanged(true);};
qs('#btnMakeRecession').onclick=()=>{state.params=applyShiftProfile(deepCopy(defaults.params),SHIFT_PROFILES.preset_recession); onParamsChanged(true);};
qs('#btnMakeDemandPull').onclick=()=>{state.params=applyShiftProfile(deepCopy(defaults.params),SHIFT_PROFILES.preset_inflation); onParamsChanged(true);};
qs('#btnMakeCostPush').onclick=()=>{state.params=applyShiftProfile(deepCopy(defaults.params),SHIFT_PROFILES.cost_push); onParamsChanged(true);};
qs('#btnClearGap').onclick=()=>{state.params=deepCopy(defaults.params); onParamsChanged(true);};
qs('#toggleAxisNumbers').onchange=e=>{settings.showAxisNumbers=e.target.checked; storageSet('macrow_show_axis_numbers',settings.showAxisNumbers?'1':'0'); renderMainChart();}; qs('#toggleAxisNumbers').checked=settings.showAxisNumbers;
qs('#btnExportPng').onclick=()=>exportChartPng();
qs('#btnExportSvg').onclick=()=>exportChartSvg();

let pendingRender=false;
function queueRender(){
  if(pendingRender) return;
  pendingRender=true;
  const runner=()=>{
    pendingRender=false;
    renderMainChart();
  };
  if(typeof requestAnimationFrame=="function"){
    requestAnimationFrame(runner);
  } else {
    setTimeout(runner,16);
  }
}
function onParamsChanged(pushHistory=false){
  Object.assign(state,computeFromParams(state.params));
  syncParamReadouts();
  updateLearnSnapshot();
  queueRender();
  syncStateToUrl();
  const sharePanel=qs('#sharePanel');
  if(sharePanel && !sharePanel.classList.contains('hidden')) refreshShareLinkPreview();
  if(pushHistory) pushPolicyHistory();
  const scenarioOverlay=qs('#scenarioOverlay');
  if(scenarioComparisonController&&scenarioOverlay&&!scenarioOverlay.classList.contains('hidden')){
    scenarioComparisonController.refresh();
  }
}
function pushPolicyHistory(){const stamp={ts:Date.now(),params:deepCopy(state.params)}; state.history=state.history.slice(0,state.historyIndex+1); state.history.push(stamp); state.historyIndex=state.history.length-1;}
function replayHistory(dir){if(!state.history.length)return; state.historyIndex=clamp(state.historyIndex+dir,0,state.history.length-1); state.params=deepCopy(state.history[state.historyIndex].params); onParamsChanged(false);}

function renderMainChart(){const svg=qs('#chartSvg'); if(!svg) return; svg.innerHTML=''; const W=860,H=560,pad={l:86,r:28,t:20,b:78},x=Y=>pad.l+((Y-GRAPH.Ymin)/(GRAPH.Ymax-GRAPH.Ymin))*(W-pad.l-pad.r),y=P=>pad.t+(1-(P-GRAPH.Pmin)/(GRAPH.Pmax-GRAPH.Pmin))*(H-pad.t-pad.b);
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
markChartRendered();
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
  const chipsRoot=qs('#changeChips');
  if(chipsRoot){
    chipsRoot.innerHTML='';
    chipsRoot.append(chip(dY,'Output'),chip(dP,'Prices'));
  }

  const gap=c.y-cur.yFe;
  const gapPercent=(gap/cur.yFe)*100;
  let stateText='Near full-employment equilibrium';
  let stateClass='near-equilibrium';
  if(gap<-2){stateText=`Recessionary gap: ${Math.abs(gapPercent).toFixed(1)}% below potential output`; stateClass='recessionary';}
  else if(gap>2){stateText=`Inflationary gap: ${gapPercent.toFixed(1)}% above potential output`; stateClass='inflationary';}
  else if(c.p>75){stateText='Rising price pressure near potential output'; stateClass='pressure';}
  const gapEl=qs('#gapLabel');
  if(gapEl){
    gapEl.textContent=stateText;
    gapEl.setAttribute('data-state',stateClass);
  }

  const setStat=(selector,value)=>{const el=qs(selector); if(el) el.textContent=value;};
  setStat('#statOutputValue',`Y ${num(c.y)}`);
  setStat('#statPriceValue',`P ${num(c.p)}`);
  setStat('#statPotentialValue',`Yf ${num(cur.yFe)}`);
  setStat('#statOutputDelta',delta(dY));
  setStat('#statPriceDelta',delta(dP));
  setStat('#statPotentialDelta',delta(dYf));
}
const chip=(d,l)=>{const el=document.createElement('div'); el.className='chip'; el.textContent=`${l} ${d>1?'↑':d<-1?'↓':'→'}`; return el;};

function addGraphTooltips(svg,xScale,yScale,cur){
  const tip=qs('#chartTooltip');
  if(!tip) return;
  const as=ASshape(cur);
  const items=[{label:'Aggregate Demand (AD)',text:'Total spending: C + I + G + (X−M).',x:invertAD_Y(75,cur.adShiftY),y:75},{label:'Short-run Aggregate Supply',text:'Output producers are willing to supply at each price level.',x:as.yKink+8,y:60},{label:'Yf (potential output)',text:'Potential output where SRAS reaches the vertical LRAS segment.',x:as.yFe,y:as.pEnd},{label:'Real GDP axis',text:'Horizontal axis shows real output (Y).',x:120,y:22},{label:'Price level axis',text:'Vertical axis shows the average price level (P).',x:43,y:70}];
  items.forEach(it=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('cx',xScale(it.x)); c.setAttribute('cy',yScale(it.y)); c.setAttribute('r','11'); c.setAttribute('fill','transparent'); c.setAttribute('tabindex','0'); c.setAttribute('aria-label',`${it.label} info`); c.style.cursor='help'; c.onmouseenter=c.onfocus=e=>{tip.innerHTML=`<b>${it.label}</b><br>${it.text}`; tip.classList.remove('hidden'); tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; c.onmouseleave=c.onblur=()=>tip.classList.add('hidden'); c.onmousemove=e=>{tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; svg.appendChild(c);});
}
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

function initScenarioManager(){
  scenarioComparisonController=createScenarioComparisonController();
  const opener=qs('#btnScenarios');
  opener.onclick=()=>{qs('#scenarioOverlay').classList.remove('hidden'); qs('#scenarioOverlay').setAttribute('aria-hidden','false'); renderScenarioList();};
  qs('#scenarioClose').onclick=closeScenarioModal;
  qs('#btnSaveScenario').onclick=saveScenario;
  qs('#btnExportJson').onclick=exportScenariosJson;
  qs('#scenarioImportFile').onchange=importScenariosJson;
  qs('#btnShareScenario').onclick=shareScenarioURL;
  qs('#btnQrExport').onclick=exportScenarioQr;
  qs('#btnQrScan').onclick=()=>startQrScanner('scenario');
  const commentBtn=qs('#btnAddScenarioComment');
  commentBtn?.addEventListener('click',addScenarioComment);
  const commentInput=qs('#scenarioCommentInput');
  commentInput?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault(); addScenarioComment();}});
  const favoritesToggle=qs('#toggleScenarioFavorites');
  if(favoritesToggle){
    favoritesToggle.checked=scenarioFilterState.favoritesOnly;
    favoritesToggle.addEventListener('change',e=>{scenarioFilterState.favoritesOnly=e.target.checked; renderScenarioList();});
  }
}

function closeScenarioModal(){qs('#scenarioOverlay').classList.add('hidden'); qs('#scenarioOverlay').setAttribute('aria-hidden','true'); stopQrScanner('scenario');}
function saveScenario(){const name=qs('#scenarioName').value.trim()||`Scenario ${scenarios.length+1}`,category=qs('#scenarioCategory').value; const newScenario={id:crypto.randomUUID(),name,category,params:deepCopy(state.params),createdAt:Date.now(),comments:[],favorite:false}; scenarios.unshift(newScenario); state.activeScenarioId=newScenario.id; persistScenarios(); renderScenarioList();}
function createSampleScenario(){
  const sample={
    id:crypto.randomUUID(),
    name:'Sample scenario: inflation shock',
    category:'policy',
    params:deepCopy({...defaults.params,ad:55,sras:46,money:47,gov:58,cons:49,inv:47,exp:46,imp:54}),
    createdAt:Date.now(),
    comments:[{id:crypto.randomUUID(),text:'Use this starter to compare demand and supply-side responses.',createdAt:Date.now()}],
    favorite:false
  };
  scenarios.unshift(sample);
  state.activeScenarioId=sample.id;
  state.params=deepCopy(sample.params);
  persistScenarios();
  onParamsChanged(true);
  renderScenarioList();
  showStatus('Sample scenario loaded. You can save your own version anytime.',false,2600);
}
function persistScenarios(){storageSet(SCENARIO_STORAGE_KEY,JSON.stringify(scenarios));}

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

function renderScenarioList(){
  const root=qs('#scenarioListRoot');
  if(!root) return;
  const filtered=scenarios.filter(s=>!scenarioFilterState.favoritesOnly||s.favorite);
  if(!filtered.length){
    const favoritesMode=scenarioFilterState.favoritesOnly;
    const message=favoritesMode?'No favorite scenarios yet. Star one to bookmark it.':'No saved scenarios yet. Start with a sample scenario.';
    const sampleCta=favoritesMode?'':`<button type="button" class="btn btn--ghost" data-create-sample="true">Load sample scenario</button>`;
    root.innerHTML=`<div class="sectionHint">${escapeHtml(message)}</div>${sampleCta}`;
    root.onclick=e=>{
      const sampleBtn=e.target.closest('[data-create-sample]');
      if(sampleBtn) createSampleScenario();
    };
    renderScenarioComments();
    scenarioComparisonController?.refresh();
    return;
  }
  const listHtml=filtered.map(s=>{
    const activeClass=state.activeScenarioId===s.id?' scenarioItem--active':'';
    const commentCount=Array.isArray(s.comments)?s.comments.length:0;
    const commentLabel=commentCount>0?`${commentCount} comment${commentCount===1?'':'s'}`:'No comments yet';
    const favoriteBtn=`<button type="button" class="scenarioItem__favorite" data-favorite="${s.id}" data-active="${s.favorite?'true':'false'}" aria-label="${s.favorite?'Remove from favorites':'Add to favorites'}">${s.favorite?'★':'☆'}</button>`;
    return `<div class="scenarioItem${activeClass}"><div class="scenarioItem__main"><div class="scenarioItem__nameRow"><span class="scenarioItem__name">${escapeHtml(s.name)}</span>${favoriteBtn}</div><div class="scenarioItem__meta">${escapeHtml(s.category)} · ${escapeHtml(commentLabel)}</div></div><div class="scenarioItem__actions"><button class="btn btn--ghost" data-load="${s.id}">Load</button><button class="btn btn--ghost" data-del="${s.id}">Delete</button></div></div>`;
  }).join('');
  root.innerHTML=listHtml;
  root.onclick=e=>{
    const favBtn=e.target.closest('[data-favorite]');
    if(favBtn){
      toggleScenarioFavorite(favBtn.dataset.favorite);
      return;
    }
    const loadBtn=e.target.closest('[data-load]');
    if(loadBtn){
      const scenario=scenarios.find(x=>x.id===loadBtn.dataset.load);
      if(scenario){
        state.params=deepCopy(scenario.params);
        state.activeScenarioId=scenario.id;
        onParamsChanged(true);
        renderScenarioList();
        return;
      }
    }
    const deleteBtn=e.target.closest('[data-del]');
    if(deleteBtn){
      const deleteId=deleteBtn.dataset.del;
      scenarios=scenarios.filter(x=>x.id!==deleteId);
      if(state.activeScenarioId===deleteId) state.activeScenarioId=null;
      persistScenarios();
      renderScenarioList();
    }
  };
  renderScenarioComments();
  scenarioComparisonController?.refresh();
}

function toggleScenarioFavorite(id){
  const scenario=scenarios.find(x=>x.id===id);
  if(!scenario) return;
  scenario.favorite=!scenario.favorite;
  persistScenarios();
  renderScenarioList();
}

function getActiveScenario(){
  if(!state.activeScenarioId) return null;
  return scenarios.find(s=>s.id===state.activeScenarioId)||null;
}

function renderScenarioComments(){
  const list=qs('#scenarioCommentList');
  const status=qs('#scenarioCommentsStatus');
  const input=qs('#scenarioCommentInput');
  const button=qs('#btnAddScenarioComment');
  if(!list||!input||!button){
    return;
  }
  const scenario=getActiveScenario();
  if(!scenario){
    list.innerHTML='<div class="sectionHint">Save or load a scenario to add comments.</div>';
    if(status) status.textContent='No scenario selected';
    input.disabled=true;
    button.disabled=true;
    input.placeholder='Save or load a scenario to add a comment';
    return;
  }
  const comments=Array.isArray(scenario.comments)?scenario.comments:[];
  const summaryText=`${comments.length} comment${comments.length===1?'':'s'}`;
  if(status) status.textContent=summaryText;
  input.disabled=false;
  button.disabled=false;
  input.placeholder='Add a comment to this scenario';
  if(comments.length===0){
    list.innerHTML='<div class="sectionHint">No comments yet for this scenario.</div>';
    return;
  }
  const sorted=[...comments].sort((a,b)=>b.createdAt-a.createdAt);
  list.innerHTML=sorted.map(comment=>`<div class="scenarioComment"><div class="scenarioComment__text">${escapeHtml(comment.text)}</div><div class="scenarioComment__meta">${escapeHtml(formatCommentTimestamp(comment.createdAt))}</div></div>`).join('');
}

function addScenarioComment(){
  const input=qs('#scenarioCommentInput');
  if(!input) return;
  const text=input.value.trim();
  if(!text){
    showStatus('Type a comment before adding.',true,2200);
    return;
  }
  const scenario=getActiveScenario();
  if(!scenario){
    showStatus('Save or load a scenario to add comments.',true,2200);
    return;
  }
  addCommentToScenario(scenario,text);
  persistScenarios();
  input.value='';
  renderScenarioComments();
  showStatus('Comment saved!',false,2000);
}


function getScenarioComparisonOptions(){
  const baseOption={
    id:'current',
    name:'Current scenario',
    label:'Current scenario (live)',
    category:'Live state',
    params:deepCopy(state.params),
    isCurrent:true
  };
  const saved=scenarios.map(s=>({
    id:s.id,
    name:s.name||'Scenario',
    label:s.name||'Scenario',
    category:s.category||'Saved scenario',
    params:s.params
  }));
  return [baseOption,...saved];
}

function describeScenarioForComparison(option){
  const snapshot=computeFromParams(option.params);
  const eq=equilibrium(snapshot);
  const gap=eq.y-snapshot.yFe;
  const gapPercent=snapshot.yFe? (gap/snapshot.yFe)*100 : 0;
  let descriptor='Near full-employment equilibrium';
  let descriptorClass='near-equilibrium';
  if(gap<-2){
    descriptor=`Recessionary gap: ${Math.abs(gapPercent).toFixed(1)}% below potential output`;
    descriptorClass='recessionary';
  } else if(gap>2){
    descriptor=`Inflationary gap: ${gapPercent.toFixed(1)}% above potential output`;
    descriptorClass='inflationary';
  } else if(eq.p>75){
    descriptor='Rising price pressure near potential output';
    descriptorClass='pressure';
  }
  return {snapshot,eq,gap,gapPercent,descriptor,descriptorClass};
}

const formatComparisonNumber=value=>Number(value).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1});

function formatComparisonDelta(delta,formatFn){
  if(Math.abs(delta)<1e-6) return '—';
  const display=formatFn(Math.abs(delta));
  return delta>0?`+${display}`:`−${display}`;
}

function buildScenarioComparisonCard(option,label){
  const {snapshot,eq,descriptor,descriptorClass}=describeScenarioForComparison(option);
  const title=option.name||'Scenario';
  const category=option.category|| (option.isCurrent?'Live state':'Saved scenario');
  const stats=[
    {label:'Output (Y)',value:`Y ${formatComparisonNumber(eq.y)}`},
    {label:'Price level (P)',value:`P ${formatComparisonNumber(eq.p)}`},
    {label:'Potential output (Yf)',value:`Yf ${formatComparisonNumber(snapshot.yFe)}`}
  ];
  const statsHtml=stats.map(stat=>`<div class="scenarioCompare__stat"><div class="scenarioCompare__statLabel">${stat.label}</div><div class="scenarioCompare__statValue">${stat.value}</div></div>`).join('');
  const paramsHtml=paramDefs.map(d=>`<div class="scenarioCompare__param"><span>${escapeHtml(d.label)}</span><strong>${d.format(option.params[d.key])}</strong></div>`).join('');
  return `<div class="scenarioCompare__cardHeader"><div><div class="scenarioCompare__cardTitle">${escapeHtml(title)}</div><div class="scenarioCompare__cardCategory">${escapeHtml(category)}</div></div><div class="scenarioCompare__sideLabel">${escapeHtml(label)}</div></div><div class="stateLabel scenarioCompare__descriptor" data-state="${descriptorClass}">${escapeHtml(descriptor)}</div><div class="scenarioCompare__stats">${statsHtml}</div><div class="scenarioCompare__params">${paramsHtml}</div>`;
}

function renderScenarioComparisonDiff(leftOption,rightOption,root){
  if(!root) return;
  if(!leftOption||!rightOption){
    root.innerHTML='<div class="sectionHint">Select scenarios to compare.</div>';
    return;
  }
  if(leftOption.id===rightOption.id){
    root.innerHTML='<div class="sectionHint">Select two different scenarios to compare them.</div>';
    return;
  }
  const rows=paramDefs.map(d=>{
    const leftVal=leftOption.params[d.key];
    const rightVal=rightOption.params[d.key];
    const delta=rightVal-leftVal;
    const deltaLabel=formatComparisonDelta(delta,d.format);
    const deltaClass=delta>0?'up':delta<0?'down':'flat';
    return `<tr><td>${escapeHtml(d.label)}</td><td>${d.format(leftVal)}</td><td>${d.format(rightVal)}</td><td class="scenarioCompare__delta scenarioCompare__delta--${deltaClass}">${deltaLabel}</td></tr>`;
  }).join('');
  root.innerHTML=`<div class="scenarioCompare__diffHeading">Parameter differences</div><div class="scenarioCompare__diffTableWrap"><table><thead><tr><th>Parameter</th><th>Scenario A</th><th>Scenario B</th><th>Δ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function createScenarioComparisonController(){
  const leftSelect=qs('#scenarioCompareLeft');
  const rightSelect=qs('#scenarioCompareRight');
  const swapBtn=qs('#scenarioCompareSwap');
  const leftCard=qs('#scenarioCompareLeftCard');
  const rightCard=qs('#scenarioCompareRightCard');
  const diffRoot=qs('#scenarioCompareDiff');
  if(!leftSelect||!rightSelect||!leftCard||!rightCard||!diffRoot) return null;
  let cachedOptions=[];
  const buildOptions=()=>{
    const updates=getScenarioComparisonOptions();
    cachedOptions=updates;
    const prevLeft=leftSelect.value;
    const prevRight=rightSelect.value;
    const optionsHtml=updates.map(opt=>{
      const labelText=opt.isCurrent?`${opt.name||'Current scenario'} (live)`:opt.name||'Scenario';
      return `<option value="${opt.id}">${escapeHtml(labelText)}</option>`;
    }).join('');
    leftSelect.innerHTML=optionsHtml;
    rightSelect.innerHTML=optionsHtml;
    const leftCandidate=updates.find(opt=>opt.id===prevLeft)?.id||updates[0]?.id||'';
    leftSelect.value=leftCandidate;
    const fallback=updates.find(opt=>opt.id!==leftCandidate);
    rightSelect.value=updates.find(opt=>opt.id===prevRight)?.id||(fallback?.id||leftCandidate);
  };
  const renderCards=()=>{
    if(!cachedOptions.length){
      const message='<div class="sectionHint">Save scenarios to compare them.</div>';
      leftCard.innerHTML=message;
      rightCard.innerHTML=message;
      diffRoot.innerHTML=message;
      return;
    }
    const leftOption=cachedOptions.find(opt=>opt.id===leftSelect.value)||cachedOptions[0];
    const rightOption=cachedOptions.find(opt=>opt.id===rightSelect.value)||cachedOptions.find(opt=>opt.id!==leftOption.id)||leftOption;
    leftCard.innerHTML=buildScenarioComparisonCard(leftOption,'Scenario A');
    rightCard.innerHTML=buildScenarioComparisonCard(rightOption,'Scenario B');
    renderScenarioComparisonDiff(leftOption,rightOption,diffRoot);
  };
  const refresh=()=>{buildOptions();renderCards();};
  leftSelect.addEventListener('change',renderCards);
  rightSelect.addEventListener('change',renderCards);
  swapBtn?.addEventListener('click',()=>{
    const leftValue=leftSelect.value;
    const rightValue=rightSelect.value;
    if(leftValue&&rightValue&&leftValue!==rightValue){
      leftSelect.value=rightValue;
      rightSelect.value=leftValue;
      renderCards();
    }
  });
  refresh();
  return {refresh};
}

function csvCell(value){
  const text=String(value??'');
  const escaped=text.replace(/"/g,'""');
  return /[",\n]/.test(text)?`"${escaped}"`:escaped;
}

function exportTeacherProgressCsv({students=[],progress={},analytics={},now=Date.now()}={}){
  const rows=[["student_id","student_name","progress_pct","assess_score_pct","last_active","latest_practice_score_pct","quiz_attempts","topic_quiz_attempts","avg_quiz_score_pct","streak_days","exported_at"]];
  const practiceAttempts=Array.isArray(progress.learnPracticeAttempts)?progress.learnPracticeAttempts:[];
  const latestPractice=practiceAttempts.length?practiceAttempts[practiceAttempts.length-1]:null;
  const quizAttempts=Array.isArray(progress.quizAttempts)?progress.quizAttempts:[];
  const topicQuizAttempts=Object.values(progress.learnTopicQuizzes||{}).reduce((sum,entry)=>sum+((entry?.attempts?.length)||0),0);
  const avgScore=analytics?.avgScore!=null?analytics.avgScore:'';
  const streak=Number.isFinite(Number(analytics?.streak))?Number(analytics.streak):0;
  students.forEach(student=>{
    rows.push([
      student?.id||'',
      student?.name||'',
      Number.isFinite(Number(student?.progress))?Math.round(Number(student.progress)):'',
      Number.isFinite(Number(student?.assessScore))?Math.round(Number(student.assessScore)):'',
      Number.isFinite(Number(student?.lastActive))?new Date(Number(student.lastActive)).toISOString():'',
      latestPractice?.score!=null?Math.round(Number(latestPractice.score)):'',
      quizAttempts.length,
      topicQuizAttempts,
      avgScore,
      streak,
      new Date(now).toISOString()
    ]);
  });
  const csv=rows.map(row=>row.map(csvCell).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`macrow-student-progress-${new Date(now).toISOString().slice(0,10)}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  showStatus('Student progress exported as CSV');
}

function exportScenariosJson(){const blob=new Blob([JSON.stringify(scenarios,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='macrow-scenarios.json'; a.click();}
function importScenariosJson(e){const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result); if(Array.isArray(data)){const safe=data.filter(x=>x&&typeof x==='object'&&x.params&&typeof x.params==='object').map(x=>({id:crypto.randomUUID(),name:String(x.name||'Imported scenario'),category:String(x.category||'custom'),params:deepCopy({...defaults.params,...x.params}),createdAt:Date.now(),comments:Array.isArray(x.comments)?x.comments:[]})); const normalized=normalizeScenarios(safe,defaults.params); scenarios=normalized.concat(scenarios); persistScenarios(); renderScenarioList();} else {alert('Invalid scenario format');}}catch{alert('Invalid JSON')}}; r.readAsText(f); e.target.value='';}
function buildStateURLFromParams(params){
  const url=new URL(`${location.origin}${location.pathname}`);
  Object.entries(URL_STATE_PARAM_MAP).forEach(([key,shortKey])=>{
    const value=params?.[key];
    if(Number.isFinite(value)) url.searchParams.set(shortKey,String(value));
  });
  return url.toString();
}
let urlSyncTimer=null;
function syncStateToUrl(){
  if(urlSyncTimer) clearTimeout(urlSyncTimer);
  urlSyncTimer=setTimeout(()=>{
    const next=buildStateURLFromParams(state.params);
    history.replaceState(null,'',next);
  },120);
}
function applyStateParamsFromUrl(){
  const sp=new URLSearchParams(location.search);
  let hasAny=false;
  const next={...state.params};
  Object.entries(URL_STATE_PARAM_MAP).forEach(([key,shortKey])=>{
    const raw=sp.get(shortKey);
    if(raw==null) return;
    const val=Number(raw);
    if(!Number.isFinite(val)) return;
    hasAny=true;
    next[key]=val;
  });
  if(hasAny) state.params={...defaults.params,...next};
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src;});}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();}
function downloadCanvas(canvas,fileName){const a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download=fileName; a.click();}
async function shareScenarioURL(){const url=buildScenarioUrl(getScenarioForShare()); try{await navigator.clipboard?.writeText(url); alert('Scenario URL copied.');}catch{prompt('Copy scenario URL:',url);}}
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
  const link=buildStateURLFromParams(state.params);
  preview.textContent=link;
  preview.classList.remove('hidden');
}

async function copyScenarioShareLink(){
  const link=buildStateURLFromParams(state.params);
  try{
    await navigator.clipboard?.writeText(link);
    showStatus('Scenario state link copied!');
  }catch{
    prompt('Copy scenario URL:',link);
  }
  refreshShareLinkPreview();
}

async function renderScenarioQrPreview(root,opts={}){
  if(!root) return;
  const {width=220,headingText='Scan this QR to load the scenario',includeDownload=false}=opts;
  const payload=getScenarioForShare();
  const link=buildScenarioUrl(payload);
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
  const scanBtn=qs('#btnShareScanQr');
  const scannerStop=qs('#btnShareScannerStop');
  const preview=qs('#shareLinkPreview');
  const qrArea=qs('#shareQrPreview');
  opener?.addEventListener('click',()=>{
    panel.classList.remove('hidden');
    refreshShareLinkPreview();
    qrArea?.classList.add('hidden');
    stopQrScanner('share');
  });
  closer?.addEventListener('click',()=>{
    stopQrScanner('share');
    panel.classList.add('hidden');
  });
  copyBtn?.addEventListener('click',copyScenarioShareLink);
  preview?.addEventListener('click',copyScenarioShareLink);
  qrBtn?.addEventListener('click',()=>renderScenarioQrPreview(qrArea,{width:220,headingText:'Scan this QR to load the same scenario',includeDownload:true}));
  scanBtn?.addEventListener('click',()=>startQrScanner('share'));
  scannerStop?.addEventListener('click',()=>stopQrScanner('share'));
}
const QR_SCANNER_CONFIGS={scenario:{area:'#qrScannerArea',hint:'#qrScannerHint',video:'#qrVideo',canvas:'#qrCanvas'},share:{area:'#shareScannerArea',hint:'#shareScannerHint',video:'#shareQrVideo',canvas:'#shareQrCanvas'}};
const QR_SCANNER_HINTS={initial:'Allow camera access and point at a Macrow scenario QR code.',requesting:'Requesting camera access…',scanning:'Point camera at scenario QR code.',permissionDenied:'Camera access blocked. Enable permissions or import JSON instead.',notFound:'No compatible camera found. Try another device or import JSON instead.',unavailable:'Camera unavailable. Try again later or import JSON.',invalidCode:'Scanned QR not recognized. Point at a Macrow scenario QR code.',success:'Scenario loaded from QR!'};
const QR_PERMISSION_ERRORS=new Set(['NotAllowedError','PermissionDeniedError']);
const QR_NOT_FOUND_ERRORS=new Set(['NotFoundError','DevicesNotFoundError']);
let qrStream=null,qrLoopId=null,activeQrScanner=null;
function updateScannerHint(scanner,message){if(scanner?.hint)scanner.hint.textContent=message;}
function handleScannerError(scanner,error){if(!scanner) return; const reason=error?.name; let hint=QR_SCANNER_HINTS.unavailable; let statusMsg='Unable to open camera. Try again or import JSON.'; if(reason&&QR_PERMISSION_ERRORS.has(reason)){hint=QR_SCANNER_HINTS.permissionDenied; statusMsg='Camera access was blocked. Enable permissions or import JSON.';} else if(reason&&QR_NOT_FOUND_ERRORS.has(reason)){hint=QR_SCANNER_HINTS.notFound; statusMsg='No compatible camera found. Try another device or import JSON.';} updateScannerHint(scanner,hint); showStatus(statusMsg,true,3200);}
async function startQrScanner(target='scenario'){const config=QR_SCANNER_CONFIGS[target]; if(!config) return; const area=qs(config.area); const hint=qs(config.hint); const video=qs(config.video); const canvas=qs(config.canvas); if(!area||!hint||!video||!canvas) return; stopQrScanner(); area.classList.remove('hidden'); activeQrScanner={target,area,hint,video,canvas}; updateScannerHint(activeQrScanner,QR_SCANNER_HINTS.requesting); if(!navigator.mediaDevices?.getUserMedia){ handleScannerError(activeQrScanner,{name:'NotSupportedError',message:'Media capture unavailable'}); return;} try{ await ensureQrLibs(); const isMobile=window.matchMedia('(pointer:coarse)').matches; const constraints={video:isMobile?{facingMode:{ideal:'environment'}}:true}; qrStream=await navigator.mediaDevices.getUserMedia(constraints); if(!activeQrScanner||activeQrScanner.target!==target){ stopQrScanner(target); return;} video.srcObject=qrStream; await video.play(); updateScannerHint(activeQrScanner,QR_SCANNER_HINTS.scanning); const ctx=canvas.getContext('2d',{willReadFrequently:true}); if(!ctx) throw new Error('Unable to capture video frame'); const scanFrame=()=>{ if(!activeQrScanner||activeQrScanner.target!==target) return; if(video.readyState>=2){ const width=video.videoWidth||video.clientWidth||640; const height=video.videoHeight||video.clientHeight||480; canvas.width=width; canvas.height=height; ctx.drawImage(video,0,0,width,height); const img=ctx.getImageData(0,0,width,height); const code=window.jsQR?.(img.data,width,height); if(code?.data){ const loaded=loadScenarioFromEncodedUrl(code.data); if(loaded){ updateScannerHint(activeQrScanner,QR_SCANNER_HINTS.success); showStatus('Scenario loaded from QR code.',false,2600); stopQrScanner(target); return;} const hintEl=activeQrScanner?.hint; updateScannerHint(activeQrScanner,QR_SCANNER_HINTS.invalidCode); if(hintEl) setTimeout(()=>{ if(hintEl.textContent===QR_SCANNER_HINTS.invalidCode) hintEl.textContent=QR_SCANNER_HINTS.scanning; },1600); } } qrLoopId=requestAnimationFrame(scanFrame); }; scanFrame(); }catch(error){ console.warn('QR scanner failed',error); handleScannerError(activeQrScanner,error);} }
function stopQrScanner(target){if(qrLoopId) cancelAnimationFrame(qrLoopId); qrLoopId=null; if(qrStream){qrStream.getTracks().forEach(t=>t.stop()); qrStream=null;} const key=target||activeQrScanner?.target; if(key){ const config=QR_SCANNER_CONFIGS[key]; if(config){ const area=qs(config.area); const video=qs(config.video); const canvas=qs(config.canvas); const hint=qs(config.hint); if(area) area.classList.add('hidden'); if(video){ video.pause(); video.srcObject=null;} if(hint) hint.textContent=QR_SCANNER_HINTS.initial; if(canvas){ canvas.width=0; canvas.height=0;} }} if(!target||target===activeQrScanner?.target){ activeQrScanner=null;} }
document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopQrScanner(); });
function addSwipeAdjust(el,step){let sx=null; el.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true}); el.addEventListener('touchmove',e=>{if(sx==null)return; const dx=e.touches[0].clientX-sx; if(Math.abs(dx)>18){const next=Number(el.value)+(dx>0?1:-1)*Number(step||1); el.value=clamp(next,Number(el.min),Number(el.max)); el.dispatchEvent(new Event('input')); sx=e.touches[0].clientX;}},{passive:true});}

const GRAPH_PINCH_SVG_SELECTORS = ['#chartSvg','#pcSvg','#moneyMarketSvg','#adComponentsSvg','#loanableFundsSvg','#circularFlowSvg','#adGraphSvg','#lreqSvg','#ppfSvg'];

function attachPinchZoom(svg,{min=1,max=2.4}={}){
  if(!svg) return;
  if(svg.dataset.macrowPinchZoomInit==='1') return;
  svg.dataset.macrowPinchZoomInit='1';

  let zoom=1;
  let translateX=0;
  let translateY=0;
  let startDistance=null;
  let startZoom=1;
  let panStartX=null;
  let panStartY=null;
  let startTranslateX=0;
  let startTranslateY=0;

  const clampZoom=value=>clamp(value,min,max);
  const maxPan=(axisSize,currentZoom)=>Math.max(0,(axisSize*(currentZoom-1))/2);
  const clampPan=()=>{
    const bounds=svg.getBoundingClientRect();
    const maxX=maxPan(bounds.width||1,zoom);
    const maxY=maxPan(bounds.height||1,zoom);
    translateX=clamp(translateX,-maxX,maxX);
    translateY=clamp(translateY,-maxY,maxY);
  };
  const touchDistance=touches=>{
    if(!touches||touches.length<2) return null;
    const dx=touches[0].clientX-touches[1].clientX;
    const dy=touches[0].clientY-touches[1].clientY;
    return Math.hypot(dx,dy);
  };
  const applyTransform=()=>{
    clampPan();
    svg.style.transform=`translate(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px) scale(${zoom.toFixed(3)})`;
    svg.style.transformOrigin='center center';
    svg.style.transformBox='fill-box';
  };
  const applyZoom=next=>{
    zoom=clampZoom(next);
    if(zoom<=1.001){
      translateX=0;
      translateY=0;
    }
    applyTransform();
  };
  const resetPinchState=()=>{startDistance=null; startZoom=zoom;};
  const resetPanState=()=>{panStartX=null; panStartY=null; startTranslateX=translateX; startTranslateY=translateY;};

  const handlePinchStart=e=>{
    if(e.touches.length===2){
      startDistance=touchDistance(e.touches);
      startZoom=zoom;
      resetPanState();
    }else if(e.touches.length===1&&zoom>1.001){
      panStartX=e.touches[0].clientX;
      panStartY=e.touches[0].clientY;
      startTranslateX=translateX;
      startTranslateY=translateY;
    }
  };

  const handlePinchMove=e=>{
    if(e.touches.length===2&&startDistance!=null){
      const nextDistance=touchDistance(e.touches);
      if(!nextDistance) return;
      applyZoom(startZoom*(nextDistance/startDistance));
      if(e.cancelable) e.preventDefault();
      return;
    }
    if(e.touches.length===1&&zoom>1.001&&panStartX!=null&&panStartY!=null){
      const dx=e.touches[0].clientX-panStartX;
      const dy=e.touches[0].clientY-panStartY;
      translateX=startTranslateX+dx;
      translateY=startTranslateY+dy;
      applyTransform();
      if(e.cancelable) e.preventDefault();
    }
  };

  const handlePinchEnd=e=>{
    if(e.touches.length<2) resetPinchState();
    if(e.touches.length===0||zoom<=1.001) resetPanState();
    if(e.touches.length===1&&zoom>1.001){
      panStartX=e.touches[0].clientX;
      panStartY=e.touches[0].clientY;
      startTranslateX=translateX;
      startTranslateY=translateY;
    }
  };

  svg.addEventListener('touchstart',handlePinchStart,{passive:true});
  svg.addEventListener('touchmove',handlePinchMove,{passive:false});
  svg.addEventListener('touchend',handlePinchEnd,{passive:true});
  svg.addEventListener('touchcancel',()=>{resetPinchState(); resetPanState();},{passive:true});
  svg.addEventListener('dblclick',()=>{zoom=1; translateX=0; translateY=0; applyTransform(); resetPinchState(); resetPanState();});
}

function initChartPinchZoom(){
  GRAPH_PINCH_SVG_SELECTORS.forEach(selector=>attachPinchZoom(qs(selector)));
}
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(authOverlay&&!authOverlay.classList.contains('hidden')){
      closeAuthOverlay();
      return;
    }
    if(!qs('#welcomeOverlay').classList.contains('hidden'))qs('#welcomeClose').click();
    if(!qs('#scenarioOverlay').classList.contains('hidden'))qs('#scenarioClose').click();
    if(!qs('#shortcutsOverlay').classList.contains('hidden'))qs('#shortcutsClose').click();
  }
  if(e.key==='?'||(e.shiftKey&&e.key==='/')){e.preventDefault(); openShortcuts();}
  if(e.key==='p')setTab('policies');
  if(e.key==='r')setTab('parameters');
  if(e.key==='l')setTab('learn');
  if(e.key==='q'&&settings.assessEnabled)setTab('assess');
  if(e.key==='a')setTab('about');
  if(e.key==='t')setTab('teacher');
  if(e.key==='s')qs('#btnScenarios').click();
  if(e.key==='x')qs('#btnReset').click();
});

function applyScenarioFromUrl(){
  applyStateParamsFromUrl();
  const payload=parseScenarioPayloadFromUrl(location.href);
  if(payload?.params){
    state.params={...state.params,...payload.params};
  }
}

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

function exportSvgFile(svg, filePrefix='macrow-ad-as') {
  if(!svg) throw new Error('SVG element not available for export.');
  const clone=svg.cloneNode(true);
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const {width,height}=getSvgExportDimensions(svg);
  clone.setAttribute('width',String(width));
  clone.setAttribute('height',String(height));
  if(!clone.hasAttribute('viewBox')) clone.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=`${filePrefix}-${Date.now()}.svg`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

function exportChartSvg(){
  try{
    exportSvgFile(qs('#chartSvg'),'macrow-ad-as');
    showStatus('Graph exported as SVG');
  }catch(error){
    console.error(error);
    showStatus('SVG export failed. Try again.',true);
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

async function exportCircularFlowPng(){
  try{
    await exportSvgAsPng(qs('#circularFlowSvg'),{filePrefix:'macrow-circular-flow',backgroundColor:'#0b1220'});
    showStatus('Circular flow diagram exported as PNG');
  }catch(error){
    console.error(error);
    showStatus('Circular flow export failed. Try again.',true);
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

function showWelcomeIfNeeded(){
  const k='macrow_welcome_dismissed_v7';
  if(storageGet(k)==='1') return;
  const ov=qs('#welcomeOverlay');
  const intro=ov?.querySelector('.welcomeIntro');
  const grid=ov?.querySelector('.welcomeGrid');
  const okBtn=qs('#welcomeOk');
  const closeBtn=qs('#welcomeClose');
  if(!ov||!intro||!grid||!okBtn||!closeBtn) return;

  const steps=[
    {title:'Welcome to macrow',body:'Quick guided tour: we will show where to run scenarios, apply policy shifts, and use sliders.',target:null},
    {title:'Step 1: Graph area',body:'This is your AD-AS canvas. Watch equilibrium output (Y) and price level (P) update live as you change policy.',target:'.chartCard'},
    {title:'Step 2: Policy cards',body:'Use quick policy cards to simulate recession, demand-pull, and cost-push scenarios in one tap.',target:'#panelPolicies'},
    {title:'Step 3: Parameters',body:'Open Parameters tab to fine-tune gov spending, tax, rates, costs, productivity, and reform assumptions.',target:'[data-tab="parameters"]'},
    {title:'Step 4: Scenario sharing',body:'Use Share this scenario to copy a state link or QR code so others load the exact same setup.',target:'#btnOpenSharePanel'}
  ];
  let i=0;

  const clearSpotlight=()=>qsa('.tour-spotlight').forEach(el=>el.classList.remove('tour-spotlight'));
  const render=()=>{
    const step=steps[i];
    intro.innerHTML=`<b>${escapeHtml(step.title)}</b><div style="margin-top:6px;">${escapeHtml(step.body)}</div>`;
    grid.innerHTML=`<article class="welcomeCard"><h3>Tour progress</h3><p>Step ${i+1} of ${steps.length}</p></article>`;
    clearSpotlight();
    if(step.target){
      const target=qs(step.target);
      if(target){target.classList.add('tour-spotlight'); target.scrollIntoView({behavior:'smooth',block:'center'});} 
    }
    okBtn.textContent=i===steps.length-1?'Finish tour':'Next';
  };

  const close=(save=false)=>{
    if(save||qs('#welcomeDontShow')?.checked) storageSet(k,'1');
    clearSpotlight();
    ov.classList.add('hidden');
    ov.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown',escHandler);
  };
  const escHandler=e=>{if(e.key==='Escape')close(false);};

  ov.classList.remove('hidden');
  ov.setAttribute('aria-hidden','false');
  document.addEventListener('keydown',escHandler);
  closeBtn.onclick=()=>close(false);
  okBtn.onclick=()=>{if(i<steps.length-1){i+=1; render();}else close(true);};
  render();
}

function initResilience(){
  window.addEventListener('error',event=>{
    if(!shouldReportResilienceError()) return;
    showStatus('Something went wrong. Try reset or reload.',true,5000);
  });
  window.addEventListener('unhandledrejection',event=>{
    if(!shouldReportResilienceError()) return;
    showStatus('Network/action failed. Please retry.',true,5000);
  });
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
  initThemeToggle();
  initAuthControls();
  updateAuthStatusUI();
  document.body.classList.toggle('accessibility-mode',settings.accessibility);
  renderPoliciesPanel();
  renderParametersPanel();
  renderAssessPanel();
  renderAboutPanel();
  renderTeacherPanel();
  initScenarioManager();
  initShareTools();
  initChartPinchZoom();
  syncAssessAvailability();
  setTab('policies');
  showWelcomeIfNeeded();
  applyScenarioFromUrl();
  onDocumentReady(()=>onParamsChanged(true));
}
init();
