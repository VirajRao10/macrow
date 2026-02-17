if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)); const lerp=(a,b,t)=>a+(b-a)*t;
const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s)); const deepCopy=x=>JSON.parse(JSON.stringify(x));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

const SCENARIO_STORAGE_KEY="macrow_scenarios_v1";
const KEYBOARD_SHORTCUTS=[
  {key:"p",desc:"Policies tab"},{key:"r",desc:"Parameters tab"},{key:"l",desc:"Learn tab"},
  {key:"s",desc:"Open scenario manager"},{key:"?",desc:"Shortcuts modal"},{key:"x",desc:"Reset"}
];
const LEARN_TIPS=[
  "AD shifts right usually raise real output and the price level in the short run.",
  "AS shifts left (cost-push shock) create inflation with weaker growth.",
  "LRAS shifts right raise potential output and reduce inflationary pressure over time.",
  "Use evaluation language: short run vs long run, inflation vs unemployment, and policy trade-offs."
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

const GRAPH={Ymin:40,Ymax:180,Pmin:20,Pmax:120,adIntercept:80,adSlope:0.75,adPivotY:120,pFlat:55,yFeBase:120,kinkGap:20,curveRise:25};
const defaults={params:{govSpending:50,taxRate:25,interestRate:3.5,productionCosts:50,productivity:50,supplySideReform:50}};
const settings={showAxisNumbers:(localStorage.getItem("macrow_show_axis_numbers")??"1")==="1",accessibility:(localStorage.getItem("macrow_access")??"0")==="1"};
let state={tab:"policies",params:deepCopy(defaults.params),adShiftY:0,asShiftP:0,yFe:GRAPH.yFeBase,history:[],historyIndex:-1,compare:{on:false,snapshot:null}};
let scenarios=JSON.parse(localStorage.getItem(SCENARIO_STORAGE_KEY)||"[]");

function computeFromParams(p){
  const g=(p.govSpending-50)*0.6,t=(25-p.taxRate)*0.9,i=(3.5-p.interestRate)*4.0;
  const adShiftY=clamp(g+t+i,-60,60);
  const supplyBoost=(p.supplySideReform-50)*0.3;
  const asShiftP=clamp((p.productionCosts-50)*0.6 - supplyBoost,-22,22);
  const yFe=clamp(GRAPH.yFeBase + (p.productivity-50)+(p.supplySideReform-50)*0.5,70,160);
  return {adShiftY,asShiftP,yFe};
}
const AD=(Y,adShiftY)=>{const Y0=GRAPH.adPivotY+adShiftY; return GRAPH.adIntercept-GRAPH.adSlope*(Y-Y0)};
const invertAD_Y=(P,adShiftY)=>{const Y0=GRAPH.adPivotY+adShiftY; return Y0+(GRAPH.adIntercept-P)/GRAPH.adSlope};
function ASshape({asShiftP,yFe}){const outputShift=asShiftP*3,shiftedYFe=clamp(yFe-outputShift,GRAPH.Ymin+30,GRAPH.Ymax-10),pFlat=GRAPH.pFlat,yKink=clamp(shiftedYFe-GRAPH.kinkGap,GRAPH.Ymin+8,shiftedYFe-10),pEnd=clamp(pFlat+GRAPH.curveRise,GRAPH.Pmin+10,GRAPH.Pmax-10);const pts=[[GRAPH.Ymin,pFlat],[yKink,pFlat]]; for(let i=1;i<=60;i++){const t=i/60,y=lerp(yKink,shiftedYFe,t),e=(Math.exp(6*t)-1)/(Math.exp(6)-1),p=pFlat+e*(pEnd-pFlat);pts.push([y,p]);} pts.push([shiftedYFe,pEnd],[shiftedYFe,GRAPH.Pmax-6]); return {pts,yKink,yFe:shiftedYFe,pFlat,pEnd};}
function equilibrium(v){const as=ASshape(v),asP=Y=>Y<=as.yKink?as.pFlat:(Y>=as.yFe?as.pEnd:as.pFlat+((Math.exp(6*clamp((Y-as.yKink)/(as.yFe-as.yKink),0,1))-1)/(Math.exp(6)-1))*(as.pEnd-as.pFlat)); let pY=GRAPH.Ymin,pH=AD(pY,v.adShiftY)-asP(pY);for(let i=1;i<=420;i++){const Y=lerp(GRAPH.Ymin,as.yFe,i/420),h=AD(Y,v.adShiftY)-asP(Y); if(pH*h<0){let lo=pY,hi=Y; for(let k=0;k<56;k++){const m=(lo+hi)/2,hm=AD(m,v.adShiftY)-asP(m); if((AD(lo,v.adShiftY)-asP(lo))*hm<0) hi=m; else lo=m;} const y=(lo+hi)/2; return {y,p:AD(y,v.adShiftY)};} pY=Y;pH=h;} return {y:v.yFe,p:AD(v.yFe,v.adShiftY)};}
function clipLineToBox(m,b,box){const {Ymin,Ymax,Pmin,Pmax}=box,pts=[]; [[Ymin,m*Ymin+b],[Ymax,m*Ymax+b]].forEach(([Y,P])=>{if(P>=Pmin&&P<=Pmax)pts.push([Y,P])}); if(Math.abs(m)>1e-9){const y1=(Pmin-b)/m,y2=(Pmax-b)/m; if(y1>=Ymin&&y1<=Ymax)pts.push([y1,Pmin]); if(y2>=Ymin&&y2<=Ymax)pts.push([y2,Pmax]);} if(pts.length<2) return null; return [pts[0],pts[1]];}
const adLineSegment=adShiftY=>{const m=-GRAPH.adSlope,b=GRAPH.adIntercept+GRAPH.adSlope*(GRAPH.adPivotY+adShiftY); return {m,b,seg:clipLineToBox(m,b,GRAPH)}};

const navButtons=qsa('.navBtn');
function setTab(tab){state.tab=tab; navButtons.forEach(b=>b.classList.toggle('navBtn--active',b.dataset.tab===tab)); ["policies","parameters","learn","about"].forEach(t=>qs(`#panel${t[0].toUpperCase()+t.slice(1)}`).classList.toggle('hidden',t!==tab)); qs('#panelTitle').textContent=tab[0].toUpperCase()+tab.slice(1); qs('#underGraphFormula')?.classList.toggle('hidden',tab!=="parameters");}
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
function renderAboutPanel(){
  qs('#panelAbout').innerHTML='<div class="sectionTitle">About macrow</div><div class="sectionHint">Interactive IB Keynesian AD-AS simulator.</div><div class="learnCard aboutActions"><label class="toggle"><input id="toggleAccess" type="checkbox"/><span>High contrast + larger controls</span></label><button id="btnOpenShortcuts" class="btn btn--ghost">Open shortcuts help</button></div>';
  qs('#toggleAccess').checked=settings.accessibility;
  qs('#toggleAccess').onchange=e=>{settings.accessibility=e.target.checked; localStorage.setItem('macrow_access',settings.accessibility?'1':'0'); document.body.classList.toggle('accessibility-mode',settings.accessibility);};
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
addGraphTooltips(svg,x,y,cur); renderState(base,cur);
}
function drawCurveSet(svg,x,y,v,tint,muted=false,dash){drawLRAS(svg,x,v.yFe,20,482,tint||'rgba(34,197,94,0.70)',dash||'6 6'); const ad=adLineSegment(v.adShiftY).seg; if(ad) strokePath(svg,pathFromSegment(x,y,ad),tint||'rgba(239,68,68,0.95)',muted?4:6,dash); const as=ASshape(v); strokePath(svg,pathFromPoints(x,y,as.pts),tint||'rgba(59,130,246,0.95)',muted?4:6,dash); labelOnAD(svg,x,y,v.adShiftY,tint); labelOnAS(svg,x,y,as,tint); labelOnLRAS(svg,x,v.yFe,tint);}
function renderState(base,cur){
  const b=equilibrium(base),c=equilibrium(cur),dY=c.y-b.y,dP=c.p-b.p,dYf=cur.yFe-base.yFe;
  const num=v=>Number(v).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1});
  const delta=v=>`Δ ${v>0?'+':''}${num(v)}`;
  qs('#changeChips').innerHTML='';
  qs('#changeChips').append(chip(dY,'Output'),chip(dP,'Prices'));
  qs('#gapLabel').textContent=c.y<cur.yFe-2?'State: recessionary gap':(c.p>70?'State: inflationary pressure':'State: near full employment');
  qs('#statOutputValue').textContent=`Y ${num(c.y)}`;
  qs('#statPriceValue').textContent=`P ${num(c.p)}`;
  qs('#statPotentialValue').textContent=`Yf ${num(cur.yFe)}`;
  qs('#statOutputDelta').textContent=delta(dY);
  qs('#statPriceDelta').textContent=delta(dP);
  qs('#statPotentialDelta').textContent=delta(dYf);
}
const chip=(d,l)=>{const el=document.createElement('div'); el.className='chip'; el.textContent=`${l} ${d>1?'↑':d<-1?'↓':'→'}`; return el;};

function addGraphTooltips(svg,xScale,yScale,cur){const tip=qs('#chartTooltip'); const items=[{label:'AD',text:'Aggregate Demand: C + I + G + (X−M)',x:invertAD_Y(75,cur.adShiftY),y:75},{label:'AS',text:'Short-run Aggregate Supply',x:ASshape(cur).yKink+8,y:60},{label:'LRAS',text:'Long-run potential output (Yf)',x:cur.yFe,y:95},{label:'X axis',text:'Real output (GDP)',x:120,y:22},{label:'Y axis',text:'Average price level',x:43,y:70}]; items.forEach(it=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('cx',xScale(it.x)); c.setAttribute('cy',yScale(it.y)); c.setAttribute('r',8); c.setAttribute('fill','transparent'); c.setAttribute('tabindex','0'); c.setAttribute('aria-label',`${it.label} info`); c.onmouseenter=c.onfocus=e=>{tip.innerHTML=`<b>${it.label}</b><br>${it.text}`; tip.classList.remove('hidden'); tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; c.onmouseleave=c.onblur=()=>tip.classList.add('hidden'); c.onmousemove=e=>{tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px';}; svg.appendChild(c);});}

function openShortcuts(){const ov=qs('#shortcutsOverlay'); ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); qs('#shortcutsList').innerHTML=KEYBOARD_SHORTCUTS.map(s=>`<div class='learnCard'><b>${escapeHtml(s.key)}</b> — ${escapeHtml(s.desc)}</div>`).join('');}
qs('#shortcutsClose').onclick=()=>{qs('#shortcutsOverlay').classList.add('hidden'); qs('#shortcutsOverlay').setAttribute('aria-hidden','true');};

function initScenarioManager(){qs('#btnScenarios').onclick=()=>{qs('#scenarioOverlay').classList.remove('hidden'); qs('#scenarioOverlay').setAttribute('aria-hidden','false'); renderScenarioList();}; qs('#scenarioClose').onclick=closeScenarioModal; qs('#btnSaveScenario').onclick=saveScenario; qs('#btnExportJson').onclick=exportScenariosJson; qs('#scenarioImportFile').onchange=importScenariosJson; qs('#btnShareScenario').onclick=shareScenarioURL; qs('#btnQrExport').onclick=exportScenarioQr; qs('#btnQrScan').onclick=startQrScanner;}
function closeScenarioModal(){qs('#scenarioOverlay').classList.add('hidden'); qs('#scenarioOverlay').setAttribute('aria-hidden','true'); stopQrScanner();}
function saveScenario(){const name=qs('#scenarioName').value.trim()||`Scenario ${scenarios.length+1}`,category=qs('#scenarioCategory').value; scenarios.unshift({id:crypto.randomUUID(),name,category,params:deepCopy(state.params),createdAt:Date.now()}); persistScenarios(); renderScenarioList();}
function persistScenarios(){localStorage.setItem(SCENARIO_STORAGE_KEY,JSON.stringify(scenarios));}
function renderScenarioList(){const root=qs('#scenarioListRoot'); root.innerHTML=scenarios.map(s=>`<div class="scenarioItem"><div><b>${escapeHtml(s.name)}</b><div class="sectionHint">${escapeHtml(s.category)}</div></div><div><button class="btn btn--ghost" data-load="${s.id}">Load</button><button class="btn btn--ghost" data-del="${s.id}">Delete</button></div></div>`).join('')||'<div class="sectionHint">No saved scenarios yet.</div>'; root.onclick=e=>{const l=e.target.closest('[data-load]'),d=e.target.closest('[data-del]'); if(l){const s=scenarios.find(x=>x.id===l.dataset.load); if(s){state.params=deepCopy(s.params); onParamsChanged(true);}} if(d){scenarios=scenarios.filter(x=>x.id!==d.dataset.del); persistScenarios(); renderScenarioList();}};}
function exportScenariosJson(){const blob=new Blob([JSON.stringify(scenarios,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='macrow-scenarios.json'; a.click();}
function importScenariosJson(e){const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result); if(Array.isArray(data)){scenarios=data.concat(scenarios); persistScenarios(); renderScenarioList();}}catch{alert('Invalid JSON')}}; r.readAsText(f);}
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
function shareScenarioURL(){const s=scenarios[0]||{name:'Current',params:state.params,category:'custom'}; const url=buildScenarioURL(s); navigator.clipboard?.writeText(url); alert('Scenario URL copied.');}
async function exportScenarioQr(){
  const s=scenarios[0]||{name:'Current',params:state.params,category:'custom'};
  const code=buildScenarioURL(s);
  const area=qs('#qrArea');
  area.classList.remove('hidden');
  area.innerHTML='';

  if(!window.QRCode?.toCanvas){
    area.innerHTML='<div class="sectionHint">QR library not loaded yet. Refresh and try again.</div>';
    return;
  }

  try{
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
    downloadCanvas(canvas,`macrow-scenario-${Date.now()}.png`);
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

window.addEventListener('keydown',e=>{if(e.key==='?'){e.preventDefault(); openShortcuts();} if(e.key==='p')setTab('policies'); if(e.key==='r')setTab('parameters'); if(e.key==='l')setTab('learn'); if(e.key==='s')qs('#btnScenarios').click(); if(e.key==='x')qs('#btnReset').click();});

function applyScenarioFromUrl(){const s=new URLSearchParams(location.search).get('scenario'); if(s){try{const obj=decodeScenario(decodeURIComponent(s)); if(obj.params){state.params={...state.params,...obj.params};}}catch{}}}

async function exportChartPng(){const svg=qs('#chartSvg').cloneNode(true); svg.setAttribute('xmlns','http://www.w3.org/2000/svg'); svg.setAttribute('width','860'); svg.setAttribute('height','560'); const bg=document.createElementNS('http://www.w3.org/2000/svg','rect'); bg.setAttribute('x','0');bg.setAttribute('y','0');bg.setAttribute('width','860');bg.setAttribute('height','560');bg.setAttribute('fill','#0b1220'); svg.insertBefore(bg,svg.firstChild); const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'})); const img=new Image(); await new Promise((res,rej)=>{img.onload=res; img.onerror=rej; img.src=url}); const c=document.createElement('canvas'); c.width=1720; c.height=1120; const ctx=c.getContext('2d'); ctx.fillStyle='#0b1220'; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0,c.width,c.height); const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download=`macrow-graph-${Date.now()}.png`; a.click(); URL.revokeObjectURL(url);}

function rect(svg,x,y,w,h,r,f){const el=document.createElementNS('http://www.w3.org/2000/svg','rect'); [['x',x],['y',y],['width',w],['height',h],['rx',r],['fill',f]].forEach(([k,v])=>el.setAttribute(k,v)); svg.appendChild(el);} 
function line(svg,x1,y1,x2,y2,s,w,d){const el=document.createElementNS('http://www.w3.org/2000/svg','line'); [['x1',x1],['y1',y1],['x2',x2],['y2',y2],['stroke',s],['stroke-width',w],['stroke-linecap','round']].forEach(([k,v])=>el.setAttribute(k,v)); if(d)el.setAttribute('stroke-dasharray',d); svg.appendChild(el);} 
function text(svg,x,y,s,a,f,z,b=false){const el=document.createElementNS('http://www.w3.org/2000/svg','text'); [['x',x],['y',y],['text-anchor',a],['fill',f],['font-size',z],['font-family','ui-sans-serif']].forEach(([k,v])=>el.setAttribute(k,v)); if(b)el.setAttribute('font-weight','900'); el.textContent=s; svg.appendChild(el);} 
function textRot(svg,x,y,s,d,a,f,z,b=false){const el=document.createElementNS('http://www.w3.org/2000/svg','text'); [['x',x],['y',y],['text-anchor',a],['fill',f],['font-size',z],['font-family','ui-sans-serif'],['transform',`rotate(${d} ${x} ${y})`]].forEach(([k,v])=>el.setAttribute(k,v)); if(b)el.setAttribute('font-weight','900'); el.textContent=s; svg.appendChild(el);} 
function strokePath(svg,d,s,w,da){const el=document.createElementNS('http://www.w3.org/2000/svg','path'); [['d',d],['fill','none'],['stroke',s],['stroke-width',w],['stroke-linecap','round'],['stroke-linejoin','round']].forEach(([k,v])=>el.setAttribute(k,v)); if(da)el.setAttribute('stroke-dasharray',da); svg.appendChild(el);} 
function pathFromPoints(x,y,pts){return `M ${pts.map(([Y,P])=>`${x(Y).toFixed(1)} ${y(P).toFixed(1)}`).join(' L ')}`;} function pathFromSegment(x,y,s){return `M ${x(s[0][0]).toFixed(1)} ${y(s[0][1]).toFixed(1)} L ${x(s[1][0]).toFixed(1)} ${y(s[1][1]).toFixed(1)}`;}
function boxedLabel(svg,x,y,label,color){const w=Math.max(36,label.length*7.2)+20,h=27,bg=document.createElementNS('http://www.w3.org/2000/svg','rect'); [['x',x-w/2],['y',y-h/2],['width',w],['height',h],['rx',12],['fill','rgba(11,18,32,0.7)'],['stroke',color||'rgba(255,255,255,.8)'],['stroke-width','2']].forEach(([k,v])=>bg.setAttribute(k,v)); svg.appendChild(bg); text(svg,x,y+4,label,'middle','rgba(226,232,240,0.95)',13,true);} 
function drawLRAS(svg,x,yFe,t,b,s,d){line(svg,x(yFe),t,x(yFe),b,s,3.5,d);} function labelOnLRAS(svg,x,yFe,c){boxedLabel(svg,x(yFe)+54,72,'LRAS',c||'rgba(34,197,94,.9)');} function labelOnAD(svg,x,y,sh,c){const seg=adLineSegment(sh).seg; if(!seg)return; const Y=lerp(seg[0][0],seg[1][0],.72),P=lerp(seg[0][1],seg[1][1],.72); boxedLabel(svg,x(Y)+20,y(P)-20,'AD',c||'rgba(239,68,68,.95)');} function labelOnAS(svg,x,y,as,c){boxedLabel(svg,x(as.yKink+10)+44,y(as.pFlat+5)-18,'AS',c||'rgba(59,130,246,.95)');}

function showWelcomeIfNeeded(){const k='macrow_welcome_dismissed_v2'; if(localStorage.getItem(k)==='1')return; const ov=qs('#welcomeOverlay'); ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); const close=()=>{if(qs('#welcomeDontShow').checked)localStorage.setItem(k,'1'); ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true');}; qs('#welcomeClose').onclick=close; qs('#welcomeOk').onclick=close;}

function init(){document.body.classList.toggle('accessibility-mode',settings.accessibility); renderPoliciesPanel(); renderParametersPanel(); renderLearnPanel(); renderAboutPanel(); initScenarioManager(); setTab('policies'); showWelcomeIfNeeded(); applyScenarioFromUrl(); onParamsChanged(true);} init();