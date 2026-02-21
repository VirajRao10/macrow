export const GRAPH={Ymin:40,Ymax:180,Pmin:20,Pmax:120,adIntercept:80,adSlope:0.75,adPivotY:120,pFlat:55,yFeBase:120,kinkGap:20,curveRise:25};
export const defaults={params:{govSpending:50,taxRate:25,interestRate:3.5,productionCosts:50,productivity:50,supplySideReform:50}};

export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const lerp=(a,b,t)=>a+(b-a)*t;

export function computeFromParams(p){
  const g=(p.govSpending-50)*0.6,t=(25-p.taxRate)*0.9,i=(3.5-p.interestRate)*4.0;
  const adShiftY=clamp(g+t+i,-60,60);
  const supplyBoost=(p.supplySideReform-50)*0.3;
  const asShiftP=clamp((p.productionCosts-50)*0.6 - supplyBoost,-22,22);
  const yFe=clamp(GRAPH.yFeBase + (p.productivity-50)+(p.supplySideReform-50)*0.5,70,160);
  return {adShiftY,asShiftP,yFe};
}

export const AD=(Y,adShiftY)=>{const Y0=GRAPH.adPivotY+adShiftY; return GRAPH.adIntercept-GRAPH.adSlope*(Y-Y0)};
export const invertAD_Y=(P,adShiftY)=>{const Y0=GRAPH.adPivotY+adShiftY; return Y0+(GRAPH.adIntercept-P)/GRAPH.adSlope};

export function ASshape({asShiftP,yFe}){
  const shiftedYFe=clamp(yFe,GRAPH.Ymin+30,GRAPH.Ymax-10);
  const pFlat=clamp(GRAPH.pFlat+asShiftP,GRAPH.Pmin+8,GRAPH.Pmax-GRAPH.curveRise-8);
  const yKink=clamp(shiftedYFe-GRAPH.kinkGap,GRAPH.Ymin+8,shiftedYFe-10);
  const pEnd=clamp(pFlat+GRAPH.curveRise,GRAPH.Pmin+12,GRAPH.Pmax-6);
  const pts=[[GRAPH.Ymin,pFlat],[yKink,pFlat]];
  for(let i=1;i<=60;i++){
    const t=i/60,y=lerp(yKink,shiftedYFe,t),e=(Math.exp(6*t)-1)/(Math.exp(6)-1),p=pFlat+e*(pEnd-pFlat);
    pts.push([y,p]);
  }
  pts.push([shiftedYFe,pEnd],[shiftedYFe,GRAPH.Pmax-6]);
  return {pts,yKink,yFe:shiftedYFe,pFlat,pEnd};
}

export function equilibrium(v){
  const as=ASshape(v);
  const asP=Y=>Y<=as.yKink
    ? as.pFlat
    : as.pFlat+((Math.exp(6*clamp((Y-as.yKink)/(as.yFe-as.yKink),0,1))-1)/(Math.exp(6)-1))*(as.pEnd-as.pFlat);
  let pY=GRAPH.Ymin,pH=AD(pY,v.adShiftY)-asP(pY);
  if(Math.abs(pH)<1e-6) return {y:pY,p:AD(pY,v.adShiftY)};
  for(let i=1;i<=420;i++){
    const Y=lerp(GRAPH.Ymin,as.yFe,i/420),h=AD(Y,v.adShiftY)-asP(Y);
    if(Math.abs(h)<1e-6) return {y:Y,p:AD(Y,v.adShiftY)};
    if(pH*h<0){
      let lo=pY,hi=Y;
      for(let k=0;k<56;k++){
        const m=(lo+hi)/2,hm=AD(m,v.adShiftY)-asP(m);
        if((AD(lo,v.adShiftY)-asP(lo))*hm<0) hi=m; else lo=m;
      }
      const y=(lo+hi)/2;
      return {y,p:AD(y,v.adShiftY)};
    }
    pY=Y;pH=h;
  }
  const pAtYf=AD(as.yFe,v.adShiftY);
  if(pAtYf>=as.pEnd){
    return {y:as.yFe,p:clamp(pAtYf,as.pEnd,GRAPH.Pmax-6)};
  }
  return {y:as.yFe,p:as.pEnd};
}

export function clipLineToBox(m,b,box){
  const {Ymin,Ymax,Pmin,Pmax}=box,pts=[];
  [[Ymin,m*Ymin+b],[Ymax,m*Ymax+b]].forEach(([Y,P])=>{if(P>=Pmin&&P<=Pmax)pts.push([Y,P])});
  if(Math.abs(m)>1e-9){
    const y1=(Pmin-b)/m,y2=(Pmax-b)/m;
    if(y1>=Ymin&&y1<=Ymax)pts.push([y1,Pmin]);
    if(y2>=Ymin&&y2<=Ymax)pts.push([y2,Pmax]);
  }
  if(pts.length<2) return null;
  return [pts[0],pts[1]];
}

export const adLineSegment=adShiftY=>{
  const m=-GRAPH.adSlope,b=GRAPH.adIntercept+GRAPH.adSlope*(GRAPH.adPivotY+adShiftY);
  return {m,b,seg:clipLineToBox(m,b,GRAPH)};
};
