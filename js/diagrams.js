// macrow lesson diagrams. Each entry maps to a real PNG image in assets/diagrams/.
// All diagrams are textbook-quality illustrations (light cream background, editorial
// typography, proper labels with arrows). AI-generated to match the design language
// of the rest of the app. The DIAGRAMS registry is keyed by the `diagram` field in
// each lesson in course.js.

export const DIAGRAMS = {
  circularFlow: {
    src: 'assets/diagrams/circular-flow.png',
    alt: 'Circular flow of income diagram showing households, firms, government and the foreign sector with injections and leakages.',
    caption: 'The four-sector circular flow. Money flows (in terracotta) and real flows (in sage) move continuously between households, firms, government and the foreign sector. In equilibrium, injections (I + G + X) equal leakages (S + T + M).',
  },
  businessCycle: {
    src: 'assets/diagrams/business-cycle.png',
    alt: 'Business cycle diagram showing real GDP fluctuating around a long-run growth trend, with peak, recession, expansion and trough phases labelled.',
    caption: 'Real GDP fluctuates around a long-run growth trend. The cycle has four phases: expansion, peak, recession and trough. The trend itself shifts with long-run growth in productive capacity.',
  },
  ad: {
    src: 'assets/diagrams/adas-equilibrium.png',
    alt: 'Aggregate demand curve sloping downward in a price level vs real GDP diagram, with a rightward shift shown as a dashed line.',
    caption: 'Aggregate demand slopes downward. A rightward shift means higher demand at every price level, caused by changes in consumption, investment, government spending or net exports.',
  },
  sras: {
    src: 'assets/diagrams/sras.png',
    alt: 'Short-run aggregate supply curve shown as horizontal at low Y, sloping upward, then vertical at potential output Yf.',
    caption: 'The short-run aggregate supply curve is horizontal at low output (where spare capacity dominates), then slopes upward, then becomes vertical at potential output. Vertical LRAS shown dashed for reference.',
  },
  lras: {
    src: 'assets/diagrams/lras.png',
    alt: 'Side-by-side comparison of monetarist LRAS (vertical at Yf) and Keynesian AS (upward sloping).',
    caption: 'Monetarists view LRAS as vertical at the natural rate of unemployment. Keynesians argue the long-run AS can keep sloping upward because wages and prices adjust slowly. The two views disagree on how quickly output returns to potential.',
  },
  equilibrium: {
    src: 'assets/diagrams/equilibrium.png',
    alt: 'Macroeconomic equilibrium diagram showing AD and SRAS intersecting at E0 above potential output, with self-correction as SRAS shifts left to bring equilibrium back to Yf.',
    caption: 'A short-run equilibrium above Yf (an inflationary gap) triggers self-correction: nominal wages and input prices rise, SRAS shifts left, and output returns to potential at a higher price level.',
  },
  growth: {
    src: 'assets/diagrams/growth.png',
    alt: 'Long-run growth shown as LRAS shifting right from Yf0 to Yf1, with AD and SRAS in their original positions.',
    caption: 'Long-run growth is a rightward shift of LRAS. It is driven by more or better factors of production, technological progress, improved efficiency, or supportive institutions. AD-driven short-term growth raises output and prices without changing potential.',
  },
  unemployment: {
    src: 'assets/diagrams/unemployment.png',
    alt: 'Labour market diagram showing labour demand and supply curves, equilibrium wage We, and a minimum wage above We creating unemployment.',
    caption: 'A minimum wage set above the equilibrium wage raises wages for those in work but creates unemployment — labour supplied at the higher wage exceeds labour demanded. The gap is the unemployment effect of the policy.',
  },
  inflation: {
    src: 'assets/diagrams/inflation.png',
    alt: 'Side-by-side diagrams of demand-pull inflation (AD shifts right) and cost-push inflation (SRAS shifts left).',
    caption: 'Demand-pull inflation: AD shifts right, prices and output rise. Cost-push inflation: SRAS shifts left, prices rise but output falls — stagflation. Both raise the price level; they differ in the output effect.',
  },
  phillips: {
    src: 'assets/diagrams/phillips-curve.png',
    alt: 'Phillips curve diagram with downward-sloping short-run Phillips curve and vertical long-run Phillips curve at the natural rate of unemployment.',
    caption: 'The short-run Phillips curve slopes downward — in the short run, lower unemployment comes with higher inflation. The long-run Phillips curve is vertical at the natural rate. In the long run, attempts to push unemployment below the natural rate only produce accelerating inflation.',
  },
  phillipsShifts: {
    src: 'assets/diagrams/phillips-shifts.png',
    alt: 'Phillips curve shifting outward to illustrate stagflation: SRPC moves right while LRPC stays vertical at the natural rate.',
    caption: 'When expected inflation rises (e.g. after a supply shock), the short-run Phillips curve shifts outward. Unemployment and inflation can both rise — the 1970s stagflation episode. LRPC stays at the natural rate.',
  },
  lorenz: {
    src: 'assets/diagrams/lorenz-curve.png',
    alt: 'Lorenz curve diagram with line of perfect equality, bowed Lorenz curve, and shaded inequality area.',
    caption: 'The Lorenz curve plots cumulative share of income against cumulative share of population. The further it bows from the line of perfect equality, the greater the inequality. The Gini coefficient is the ratio of the inequality area to the total area under the equality line.',
  },
  adas: {
    src: 'assets/diagrams/adas-policy.png',
    alt: 'AD/AS diagram showing expansionary policy shifting AD right, with new equilibrium E1 at higher Y and higher P.',
    caption: 'Expansionary fiscal or monetary policy shifts AD right. New equilibrium has higher output AND higher price level. The price-level effect is the trade-off against using policy to raise output.',
  },
  crowdingOut: {
    src: 'assets/diagrams/crowding-out.png',
    alt: 'Crowding out in the loanable funds market: government borrowing shifts demand for loanable funds right, raising the interest rate and reducing private investment.',
    caption: 'When the government runs a deficit, it borrows more, raising demand for loanable funds. The real interest rate rises from r₀ to r₁, and private investment falls — this is crowding out.',
  },
  moneyMarket: {
    src: 'assets/diagrams/money-market.png',
    alt: 'Money market diagram with downward-sloping money demand, vertical money supply, and equilibrium interest rate i star.',
    caption: 'Equilibrium interest rate is set where money demand meets money supply. A rightward shift of money supply (e.g. via open market operations) lowers the interest rate; a leftward shift raises it.',
  },
};

// Default (fallback) caption when a lesson references a diagram id we don't have.
export const DEFAULT_CAPTION = 'Diagram illustrating the key relationships described in this lesson.';

// Resolves a diagram id from a lesson to its image data, falling back gracefully.
export function getDiagram(id) {
  return DIAGRAMS[id] || { src: '', alt: DEFAULT_CAPTION, caption: DEFAULT_CAPTION };
}
