export const LEARN_TOPIC_PRACTICE = [
  {
    id: 'ad-as-foundations',
    title: 'AD–AS foundations',
    summary: 'Name the curve shifts and output gaps before moving into policy evaluation.',
    questions: [
      {
        id: 'gap_inflationary',
        prompt: 'Actual GDP exceeds potential output (Y > Yf). Which term best describes the gap?',
        options: ['Inflationary gap', 'Recessionary gap', 'Stagflation', 'Liquidity trap'],
        answer: 'Inflationary gap',
        explanation: 'When output runs past its full-employment level, demand-pull inflation creates an inflationary gap.'
      },
      {
        id: 'sras_cost_push',
        prompt: 'Energy costs surge, raising firms’ production expenses. Which curve shift matches this shock?',
        options: ['SRAS shifts left', 'SRAS shifts right', 'AD shifts left', 'LRAS shifts left'],
        answer: 'SRAS shifts left',
        explanation: 'Higher costs reduce short-run supply at every price level, so SRAS shifts left (cost-push inflation).'
      },
      {
        id: 'lras_productivity',
        prompt: 'Productivity gains expand productive capacity. Which curve moves to reflect that long-run change?',
        options: ['LRAS shifts right', 'AD shifts right', 'SRAS shifts left', 'AD shifts left'],
        answer: 'LRAS shifts right',
        explanation: 'More productive firms raise potential output, driving LRAS to the right rather than changing short-run demand.'
      }
    ]
  },
  {
    id: 'policy-evaluation',
    title: 'Policy evaluation',
    summary: 'Pick policy moves and justify short-run gains versus long-run trade-offs.',
    questions: [
      {
        id: 'policy_contraction',
        prompt: 'Inflation is above target while output sits near potential. Which mix is the most responsible response?',
        options: [
          'Contractionary monetary policy plus a cautious fiscal stance',
          'Expansionary fiscal policy with easy money',
          'Large supply-side subsidies only',
          'Maintain current policy and wait it out'
        ],
        answer: 'Contractionary monetary policy plus a cautious fiscal stance',
        explanation: 'Tightening demand through higher rates (and keeping fiscal policy restrained) calms inflation when the economy is already at potential.'
      },
      {
        id: 'policy_supply_side',
        prompt: 'Why mention supply-side reforms during policy evaluation even if inflation is the focus?',
        options: [
          'They shift AS/LRAS right without overheating demand',
          'They immediately cool inflation by cutting AD',
          'They only work when there is a recessionary gap',
          'They raise short-run unemployment by design'
        ],
        answer: 'They shift AS/LRAS right without overheating demand',
        explanation: 'Structural reforms expand capacity, letting the economy grow without generating additional inflationary pressure.'
      },
      {
        id: 'policy_multiplier',
        prompt: 'Mentioning the multiplier effect strengthens a fiscal evaluation because it shows what?',
        options: [
          'Initial government spending triggers repeated re-spending, boosting AD',
          'The policy leaves AS unchanged',
          'Every policy has zero trade-offs afterward',
          'The central bank controls the multiplier directly'
        ],
        answer: 'Initial government spending triggers repeated re-spending, boosting AD',
        explanation: 'The multiplier explains why a fiscal boost can create a larger total output change, tying spending to demand growth.'
      }
    ]
  },
  {
    id: 'phillips-expectations',
    title: 'Phillips curve & expectations',
    summary: 'Connect unemployment, inflation, and expectations when you write evaluations.',
    questions: [
      {
        id: 'pc_movement',
        prompt: 'Demand strengthens and output goes above potential. How does the economy move along the short-run Phillips curve?',
        options: [
          'Movement up along the SRPC: lower unemployment, higher inflation',
          'Movement down along the SRPC: higher unemployment, lower inflation',
          'LRPC shifts right immediately',
          'No change in inflation or unemployment'
        ],
        answer: 'Movement up along the SRPC: lower unemployment, higher inflation',
        explanation: 'Tighter demand cuts unemployment but raises inflation, so you move up along the existing SRPC.'
      },
      {
        id: 'pc_expectations',
        prompt: 'Persistent higher inflation expectations most likely cause which Phillips curve change?',
        options: ['SRPC shifts upward', 'SRPC shifts downward', 'LRPC shifts left', 'SRPC becomes horizontal'],
        answer: 'SRPC shifts upward',
        explanation: 'Expectations of higher inflation lift the SRPC, meaning each unemployment rate now matches higher inflation.'
      },
      {
        id: 'pc_tradeoff',
        prompt: 'Explaining the Phillips trade-off ensures your evaluation covers which point?',
        options: [
          'Reducing inflation may increase unemployment in the short run',
          'AD always shifts left when policy tightens',
          'LRAS shifts right immediately',
          'Policy has no limits to its effects'
        ],
        answer: 'Reducing inflation may increase unemployment in the short run',
        explanation: 'The Phillips trade-off highlights that tighter policy can cool inflation but at the cost of more unemployment initially.'
      }
    ]
  },
  {
    id: 'money-transmission',
    title: 'Money market & transmission',
    summary: 'Link money-market shifts to interest rates, currency, and aggregate demand.',
    questions: [
      {
        id: 'money_policy_rate',
        prompt: 'The central bank lowers the policy rate. What happens in the money market and to aggregate demand?',
        options: [
          'Money supply shifts right, interest rates fall, and AD shifts right',
          'Money demand shifts left, interest rates rise, and AD shifts left',
          'LRAS shifts right immediately',
          'No change occurs in the short run'
        ],
        answer: 'Money supply shifts right, interest rates fall, and AD shifts right',
        explanation: 'Easier policy increases liquidity, pushes down the interest rate, and boosts investment/consumption—shifting AD right.'
      },
      {
        id: 'money_appreciation',
        prompt: 'Higher interest rates appreciate the currency. What is the likely impact on AD?',
        options: ['Net exports fall and AD shifts left', 'Investment surges and AD shifts right', 'LRAS shifts left', 'SRAS shifts right'],
        answer: 'Net exports fall and AD shifts left',
        explanation: 'An appreciated currency makes exports more expensive and imports cheaper, reducing net exports and AD.'
      },
      {
        id: 'money_transmission',
        prompt: 'Which channel best describes how monetary easing boosts aggregate demand?',
        options: [
          'Lower interest rates cut borrowing costs, encouraging investment and consumption',
          'Raising reserve requirements forces banks to lend less',
          'Setting higher rates directly raises wages',
          'Printing money shifts LRAS'
        ],
        answer: 'Lower interest rates cut borrowing costs, encouraging investment and consumption',
        explanation: 'Lower rates reduce financing costs, so firms invest and households spend more, lifting AD.'
      }
    ]
  },
  {
    id: 'exchange-rates-bop',
    title: 'Exchange rates & balance of payments',
    summary: 'Use currency and external-balance logic in evaluation chains.',
    questions: [
      {
        id: 'bop_current_account_deficit',
        prompt: 'A sustained current account deficit usually means which statement is most accurate?',
        options: [
          'Import spending exceeds export earnings over time',
          'The capital account must also be in deficit',
          'The exchange rate cannot change',
          'Inflation automatically falls below target'
        ],
        answer: 'Import spending exceeds export earnings over time',
        explanation: 'A current account deficit reflects net outflows on trade/income/transfers, often tied to stronger import demand.'
      },
      {
        id: 'bop_depreciation_effect',
        prompt: 'If the domestic currency depreciates (with elastic demand), what is the expected directional effect?',
        options: [
          'Exports become more competitive, helping net exports and AD',
          'Imports become cheaper, reducing inflation immediately',
          'LRAS shifts right at once',
          'Money demand collapses permanently'
        ],
        answer: 'Exports become more competitive, helping net exports and AD',
        explanation: 'Depreciation improves price competitiveness; with enough responsiveness, net exports and AD tend to rise.'
      },
      {
        id: 'bop_hot_money',
        prompt: 'Higher domestic interest rates can attract short-term capital inflows because investors seek what?',
        options: [
          'Higher returns on domestic financial assets',
          'Lower risk from all macro shocks',
          'Guaranteed currency depreciation',
          'Immediate increases in potential output'
        ],
        answer: 'Higher returns on domestic financial assets',
        explanation: 'Rate differentials can pull in portfolio flows (“hot money”), affecting the financial account and exchange rate.'
      }
    ]
  },
  {
    id: 'labour-market-unemployment',
    title: 'Labour market & unemployment',
    summary: 'Differentiate unemployment types and policy responses with trade-offs.',
    questions: [
      {
        id: 'labour_cyclical',
        prompt: 'During a recession, rising unemployment caused by weak aggregate demand is mainly what type of unemployment?',
        options: ['Cyclical unemployment', 'Structural unemployment', 'Seasonal unemployment', 'Frictional unemployment'],
        answer: 'Cyclical unemployment',
        explanation: 'Cyclical unemployment moves with the business cycle as firms cut hiring/output when demand weakens.'
      },
      {
        id: 'labour_structural_policy',
        prompt: 'Which policy best targets structural unemployment over the medium run?',
        options: [
          'Retraining and skills-matching programmes',
          'A one-time cut in VAT only',
          'Immediate currency devaluation',
          'Higher reserve requirements for banks'
        ],
        answer: 'Retraining and skills-matching programmes',
        explanation: 'Structural unemployment comes from skill/location mismatch, so labour-market training and matching tools are the direct fix.'
      },
      {
        id: 'labour_nairu',
        prompt: 'Why reference the natural rate (NAIRU) in evaluations?',
        options: [
          'It shows inflation pressure can build if unemployment is pushed too low for too long',
          'It proves unemployment can be permanently zero',
          'It means monetary policy cannot affect demand',
          'It guarantees stable exchange rates'
        ],
        answer: 'It shows inflation pressure can build if unemployment is pushed too low for too long',
        explanation: 'NAIRU framing helps explain why aggressive demand stimulus may reduce unemployment short-run but raise inflation over time.'
      }
    ]
  },
  {
    id: 'fiscal-policy-multiplier',
    title: 'Fiscal policy & multiplier depth',
    summary: 'Evaluate fiscal stance, leakages, and crowding-out risk with tighter chains of logic.',
    questions: [
      {
        id: 'fiscal_auto_stabilizer',
        prompt: 'Which item is an automatic stabilizer in a downturn?',
        options: ['Unemployment benefits', 'A new discretionary stimulus bill', 'An emergency currency peg', 'Quantitative tightening'],
        answer: 'Unemployment benefits',
        explanation: 'Automatic stabilizers respond without new legislation, cushioning income and demand during recessions.'
      },
      {
        id: 'fiscal_leakages',
        prompt: 'When the marginal propensity to import rises, the fiscal multiplier becomes what?',
        options: ['Smaller', 'Larger', 'Infinite', 'Unchanged in all economies'],
        answer: 'Smaller',
        explanation: 'Import leakages send spending abroad, reducing the domestic re-spending rounds that power the multiplier.'
      },
      {
        id: 'fiscal_crowding_out',
        prompt: 'In a near-full-employment economy, large deficit spending most likely risks?',
        options: ['Crowding out private investment via higher rates', 'Immediate structural unemployment', 'Permanent productivity gains', 'Lower long-run debt automatically'],
        answer: 'Crowding out private investment via higher rates',
        explanation: 'With limited spare capacity, extra public borrowing can push rates up and displace private investment.'
      }
    ]
  },
  {
    id: 'supply-side-productivity',
    title: 'Supply-side policy & productivity',
    summary: 'Distinguish demand boosts from policies that raise potential output and efficiency.',
    questions: [
      {
        id: 'supply_infrastructure',
        prompt: 'Which policy most directly raises long-run productive capacity?',
        options: ['Transport and digital infrastructure investment', 'One-off cash transfer only', 'Temporary VAT cut', 'Currency intervention'],
        answer: 'Transport and digital infrastructure investment',
        explanation: 'High-quality infrastructure improves productivity and market efficiency, shifting LRAS to the right over time.'
      },
      {
        id: 'supply_tax_incentive',
        prompt: 'A tax credit for business capital investment is mainly intended to achieve what?',
        options: ['Increase productivity and potential output', 'Reduce exports immediately', 'Raise structural inflation', 'Shift AD left by design'],
        answer: 'Increase productivity and potential output',
        explanation: 'Investment incentives can lift the capital stock and worker productivity, supporting long-run growth.'
      },
      {
        id: 'supply_time_lag',
        prompt: 'Why are supply-side policies often paired with short-run demand tools?',
        options: ['They usually have long implementation lags', 'They instantly remove all inflation', 'They cannot affect output at all', 'They only work in deflation'],
        answer: 'They usually have long implementation lags',
        explanation: 'Structural reforms take time to deliver, so policymakers often need demand management for near-term stabilization.'
      }
    ]
  },
  {
    id: 'trade-protectionism',
    title: 'Trade policy & protectionism',
    summary: 'Weigh domestic producer support against efficiency losses and retaliation risk.',
    questions: [
      {
        id: 'trade_tariff_price',
        prompt: 'A tariff on imported goods tends to cause what immediate domestic effect?',
        options: ['Higher domestic prices for those goods', 'Lower government revenue', 'Guaranteed export surge', 'No market response'],
        answer: 'Higher domestic prices for those goods',
        explanation: 'Tariffs raise import costs, which typically passes through to higher domestic prices.'
      },
      {
        id: 'trade_retaliation',
        prompt: 'A major downside of protectionist escalation is?',
        options: ['Retaliation that hurts export industries', 'Automatic productivity gains', 'Immediate lower inflation', 'Higher global efficiency'],
        answer: 'Retaliation that hurts export industries',
        explanation: 'Trading partners often respond with their own barriers, reducing market access for exporters.'
      },
      {
        id: 'trade_consumer_surplus',
        prompt: 'From a welfare perspective, protectionism often reduces?',
        options: ['Consumer surplus', 'Producer revenues in all cases', 'Tax receipts always', 'Exchange-rate volatility'],
        answer: 'Consumer surplus',
        explanation: 'Higher prices and less choice generally reduce consumer welfare even if some producers gain.'
      }
    ]
  },
  {
    id: 'inequality-distribution',
    title: 'Inequality & income distribution',
    summary: 'Connect growth outcomes to equity, mobility, and policy design trade-offs.',
    questions: [
      {
        id: 'ineq_gini',
        prompt: 'What does the Gini coefficient mainly measure?',
        options: ['Income inequality', 'GDP growth volatility', 'Inflation persistence', 'Current account balance'],
        answer: 'Income inequality',
        explanation: 'The Gini index summarizes how equally (or unequally) income is distributed across households.'
      },
      {
        id: 'ineq_progressive_tax',
        prompt: 'What is the primary aim of a progressive tax-and-transfer system?',
        options: ['Reduce post-tax income inequality', 'Increase import dependence', 'Shift SRAS left', 'Eliminate business cycles'],
        answer: 'Reduce post-tax income inequality',
        explanation: 'Progressive taxes and targeted transfers redistribute net income and can narrow disposable-income gaps.'
      },
      {
        id: 'ineq_human_capital',
        prompt: 'Why is education policy central in long-run inequality strategy?',
        options: ['It improves human capital and intergenerational mobility', 'It directly pegs exchange rates', 'It removes inflation entirely', 'It guarantees equal wages immediately'],
        answer: 'It improves human capital and intergenerational mobility',
        explanation: 'Better education raises skills and opportunity access, helping mobility and reducing persistent inequality over time.'
      }
    ]
  },
  {
    id: 'real-world-case-studies-2024-2025',
    title: 'Real-world case studies (2024–2025)',
    summary: 'Apply macro frameworks to recent policy choices, inflation dynamics, and growth risks.',
    questions: [
      {
        id: 'case_us_soft_landing_2024',
        prompt: 'In 2024, many analysts described the US as a “soft landing.” Which combo best fits that outcome?',
        options: [
          'Inflation eased while unemployment stayed relatively low',
          'Deep recession with deflation',
          'Rapid currency collapse and import rationing',
          'Zero growth with runaway fiscal deficits only'
        ],
        answer: 'Inflation eased while unemployment stayed relatively low',
        explanation: 'A soft landing means disinflation without a large unemployment spike, indicating demand cooled without a severe downturn.'
      },
      {
        id: 'case_euro_area_2024_energy',
        prompt: 'After the energy shock period, euro-area inflation moderation in 2024 is best explained by?',
        options: [
          'Lower energy base effects plus tighter monetary policy transmission',
          'A permanent leftward shift in LRAS',
          'Immediate elimination of supply constraints everywhere',
          'Higher tariffs reducing all import prices'
        ],
        answer: 'Lower energy base effects plus tighter monetary policy transmission',
        explanation: 'Fading energy spikes and lagged policy tightening both helped reduce headline inflation pressures.'
      },
      {
        id: 'case_india_growth_2025',
        prompt: 'If a fast-growing emerging economy in 2025 expands infrastructure while inflation risk stays elevated, the key policy trade-off is?',
        options: [
          'Supporting long-run capacity while preventing short-run overheating',
          'Choosing fixed exchange rates over all fiscal tools',
          'Eliminating unemployment permanently through demand stimulus only',
          'Avoiding any productivity policy to lower inflation'
        ],
        answer: 'Supporting long-run capacity while preventing short-run overheating',
        explanation: 'Policymakers must balance growth-enhancing investment with demand management so inflation expectations remain anchored.'
      }
    ]
  },
  {
    id: 'economic-case-studies-2025-2026',
    title: 'Economic case studies (2025–2026)',
    summary: 'Use current macro events to evaluate inflation, growth, and policy trade-offs.',
    questions: [
      {
        id: 'case_2025_us_rates',
        prompt: 'If inflation remains sticky in 2025 while labor markets stay tight, the most likely central-bank stance is?',
        options: [
          'Keep policy restrictive for longer',
          'Cut rates aggressively immediately',
          'Target unemployment directly with fiscal transfers',
          'Fix the exchange rate to reduce CPI'
        ],
        answer: 'Keep policy restrictive for longer',
        explanation: 'Sticky inflation with resilient demand usually leads to a higher-for-longer stance to re-anchor inflation expectations.'
      },
      {
        id: 'case_2025_europe_growth',
        prompt: 'A low-growth, easing-inflation euro-area scenario in 2025 most strongly supports which policy mix?',
        options: [
          'Gradual monetary easing with targeted productivity reforms',
          'Large protectionist tariffs to cut imports',
          'Immediate austerity regardless output gap',
          'Money-financed fiscal expansion with no constraints'
        ],
        answer: 'Gradual monetary easing with targeted productivity reforms',
        explanation: 'When inflation cools but growth remains weak, gradual easing plus supply-side support can stabilize demand without reigniting price pressure.'
      },
      {
        id: 'case_2026_supply_shock',
        prompt: 'A renewed commodity shock in 2026 would most likely create what short-run AD-AS pattern?',
        options: [
          'SRAS shifts left, raising inflation and lowering output',
          'AD shifts right with lower inflation',
          'LRAS shifts right immediately',
          'No macro effect if interest rates are unchanged'
        ],
        answer: 'SRAS shifts left, raising inflation and lowering output',
        explanation: 'A cost shock increases production costs economy-wide, generating stagflation pressure in the short run.'
      },
      {
        id: 'case_2026_fed_policy_path',
        prompt: 'If US core inflation is still above target in 2026 but growth is slowing, the Federal Reserve is most likely to?',
        options: [
          'Signal data-dependent, gradual cuts while keeping policy restrictive',
          'Cut rates to zero immediately',
          'Abandon inflation targeting altogether',
          'Use tariffs as its main policy instrument'
        ],
        answer: 'Signal data-dependent, gradual cuts while keeping policy restrictive',
        explanation: 'With inflation persistence and softer growth, the Fed usually emphasizes cautious easing and credibility rather than abrupt shifts.'
      },
      {
        id: 'case_2026_tariff_pass_through',
        prompt: 'In 2026, a broad new tariff package on imported intermediate goods most directly risks?',
        options: [
          'Cost-push inflation and weaker short-run output',
          'Immediate rightward LRAS shift',
          'Lower prices and stronger real wages instantly',
          'No effect because exchange rates offset all tariffs'
        ],
        answer: 'Cost-push inflation and weaker short-run output',
        explanation: 'Tariff pass-through raises input costs for firms, pushing SRAS left and creating stagflation pressure in the short run.'
      }
    ]
  },
  {
    id: 'economic-case-studies-2026-q1',
    title: 'Economic case studies (2026 Q1)',
    summary: 'Evaluate early-2026 inflation, tariffs, and growth signals using AD-AS and policy credibility.',
    questions: [
      {
        id: 'case_2026_q1_us_disinflation_stall',
        prompt: 'If US disinflation stalls in Q1 2026 while payroll growth stays solid, which policy signal is most plausible?',
        options: [
          'A prolonged pause with hawkish forward guidance',
          'Immediate large rate cuts',
          'Abandoning inflation targets',
          'Switching to fiscal policy only'
        ],
        answer: 'A prolonged pause with hawkish forward guidance',
        explanation: 'Sticky core inflation plus resilient labor data typically supports holding rates restrictive while emphasizing inflation credibility.'
      },
      {
        id: 'case_2026_q1_tariff_supply_chain',
        prompt: 'A Q1 2026 tariff expansion on intermediate imports mainly creates which short-run macro risk?',
        options: [
          'SRAS left shift with higher inflation pressure',
          'AD collapse with immediate deflation',
          'Rightward LRAS shift from efficiency gains',
          'No impact if monetary policy is unchanged'
        ],
        answer: 'SRAS left shift with higher inflation pressure',
        explanation: 'Higher imported input costs raise production costs, creating cost-push inflation and weaker near-term output.'
      },
      {
        id: 'case_2026_q1_euro_area_policy_mix',
        prompt: 'In Q1 2026, euro-area growth is weak but inflation remains above target. Which mix is most defensible?',
        options: [
          'Gradual easing plus targeted supply-side reforms',
          'Aggressive easing regardless inflation risks',
          'Immediate austerity and tighter money together',
          'FX pegs as the only tool'
        ],
        answer: 'Gradual easing plus targeted supply-side reforms',
        explanation: 'A calibrated approach supports demand while structural measures lift capacity and help contain medium-run inflation trade-offs.'
      },
      {
        id: 'case_2026_q1_expectations_anchor',
        prompt: 'Why is central-bank communication especially important in volatile Q1 2026 data?',
        options: [
          'To keep inflation expectations anchored during uncertainty',
          'To directly increase LRAS in one quarter',
          'To replace fiscal institutions entirely',
          'To guarantee currency stability under all shocks'
        ],
        answer: 'To keep inflation expectations anchored during uncertainty',
        explanation: 'Clear communication reduces expectation drift and can lower the output cost of future disinflation.'
      }
    ]
  },
  {
    id: 'q2-2026-economic-case-studies',
    title: 'Q2 2026 economic case studies (Fed, tariffs, market trends)',
    summary: 'Analyze mid-2026 policy trade-offs across inflation persistence, tariff pass-through, and shifting financial conditions.',
    questions: [
      {
        id: 'q2_2026_fed_restriction_bias',
        prompt: 'In Q2 2026, core inflation cools only slowly while growth softens modestly. What is the most likely Fed posture?',
        options: [
          'Hold restrictive bias and ease only gradually if disinflation broadens',
          'Cut to near-zero rates immediately',
          'Abandon forward guidance entirely',
          'Target the exchange rate instead of inflation'
        ],
        answer: 'Hold restrictive bias and ease only gradually if disinflation broadens',
        explanation: 'With sticky services inflation, central banks usually prioritize credibility and move cautiously even as activity slows.'
      },
      {
        id: 'q2_2026_tariff_pass_through_channels',
        prompt: 'A wider Q2 2026 tariff package on intermediate inputs would most directly affect firms through?',
        options: [
          'Higher marginal costs and margin pressure before partial consumer pass-through',
          'Instant productivity gains across supply chains',
          'Lower financing costs from tighter policy',
          'An automatic rise in potential output'
        ],
        answer: 'Higher marginal costs and margin pressure before partial consumer pass-through',
        explanation: 'Tariffs often transmit through input costs first, then split between lower margins and higher final prices depending on demand elasticity.'
      },
      {
        id: 'q2_2026_market_trends_risk_premia',
        prompt: 'If equity volatility and credit spreads rise in Q2 2026 while policy rates are unchanged, the macro interpretation is?',
        options: [
          'Effective financial conditions tightened via higher risk premia',
          'Monetary policy became expansionary',
          'Inflation expectations are irrelevant',
          'Demand will necessarily accelerate'
        ],
        answer: 'Effective financial conditions tightened via higher risk premia',
        explanation: 'Wider spreads can tighten credit availability and cool demand even without a policy-rate move.'
      },
      {
        id: 'q2_2026_policy_mix_response',
        prompt: 'Which Q2 2026 policy mix best balances inflation control with growth resilience amid trade friction?',
        options: [
          'Targeted supply-side investment with measured, data-dependent demand support',
          'Large untargeted stimulus plus aggressive rate cuts',
          'Across-the-board austerity regardless cycle conditions',
          'Tariffs as the primary macro-stabilization tool'
        ],
        answer: 'Targeted supply-side investment with measured, data-dependent demand support',
        explanation: 'A balanced mix can limit inflation persistence while improving productive capacity and cushioning downside growth risks.'
      }
    ]
  },
  {
    id: 'q1-2026-labor-market-rebalancing',
    title: 'Q1 2026: labor market rebalancing',
    summary: 'Assess wage growth, participation, and policy trade-offs as labor demand cools unevenly.',
    questions: [
      {
        id: 'q1_2026_labor_openings',
        prompt: 'If job openings fall faster than payroll growth in Q1 2026, the best interpretation is?',
        options: [
          'Labor demand is cooling before a broad layoffs cycle',
          'An immediate recession is guaranteed',
          'Potential output has collapsed',
          'Monetary policy is fully neutral already'
        ],
        answer: 'Labor demand is cooling before a broad layoffs cycle',
        explanation: 'Vacancy compression can indicate gradual normalization in labor demand while employment levels remain relatively resilient.'
      },
      {
        id: 'q1_2026_wage_disinflation',
        prompt: 'Why does moderating nominal wage growth help the inflation outlook in Q1 2026?',
        options: [
          'It reduces second-round cost pressure in services inflation',
          'It forces an immediate rightward LRAS shift',
          'It eliminates all imported inflation shocks',
          'It removes the need for monetary policy'
        ],
        answer: 'It reduces second-round cost pressure in services inflation',
        explanation: 'Slower wage growth can ease persistent service-sector inflation, improving the medium-run disinflation path.'
      },
      {
        id: 'q1_2026_participation_tradeoff',
        prompt: 'If participation rises while unemployment edges up slightly, policymakers should read this as?',
        options: [
          'Potentially healthier labor supply normalization, not necessarily a demand collapse',
          'Proof that demand stimulus is urgently required',
          'A signal to abandon inflation targets',
          'Evidence that productivity is falling sharply'
        ],
        answer: 'Potentially healthier labor supply normalization, not necessarily a demand collapse',
        explanation: 'Higher participation can temporarily lift measured unemployment while expanding labor supply and easing wage pressure.'
      }
    ]
  },
  {
    id: 'q1-2026-global-trade-fragmentation',
    title: 'Q1 2026: global trade fragmentation',
    summary: 'Analyze tariff escalation, supply-chain shifts, and their effects on inflation and growth.',
    questions: [
      {
        id: 'q1_2026_trade_fragmentation_sras',
        prompt: 'A broad shift to less-efficient supplier networks in Q1 2026 most directly implies?',
        options: [
          'Higher average costs and leftward short-run supply pressure',
          'Immediate disinflation with stronger output',
          'No macro effect unless fiscal spending changes',
          'A permanent rightward LRAS shift in one quarter'
        ],
        answer: 'Higher average costs and leftward short-run supply pressure',
        explanation: 'Fragmented supply chains often raise logistics and input costs, worsening short-run inflation-output trade-offs.'
      },
      {
        id: 'q1_2026_tariff_incidence',
        prompt: 'Tariff incidence in Q1 2026 is most likely to be shared between?',
        options: [
          'Importers, firms, and consumers via margins and pass-through',
          'Only foreign producers with zero domestic effect',
          'Only central banks through reserve losses',
          'Only workers through lower nominal wages'
        ],
        answer: 'Importers, firms, and consumers via margins and pass-through',
        explanation: 'Tariff burdens are usually split across the chain depending on market power, contract structure, and demand elasticity.'
      },
      {
        id: 'q1_2026_trade_policy_mix',
        prompt: 'Which policy response best cushions trade-fragmentation shocks while preserving inflation credibility?',
        options: [
          'Targeted supply-side investment with disciplined aggregate demand management',
          'Unconditional large demand stimulus',
          'Ignoring inflation expectations and cutting rates aggressively',
          'Eliminating all trade regardless strategic context'
        ],
        answer: 'Targeted supply-side investment with disciplined aggregate demand management',
        explanation: 'Combining productivity-enhancing investment with credible stabilization policy can reduce medium-run inflation costs.'
      }
    ]
  },
  {
    id: 'q1-2026-financial-conditions-credit-risk',
    title: 'Q1 2026: financial conditions & credit risk',
    summary: 'Connect tighter credit channels, risk spreads, and real-economy transmission in early 2026.',
    questions: [
      {
        id: 'q1_2026_credit_spread_signal',
        prompt: 'If corporate credit spreads widen in Q1 2026 while policy rates are unchanged, this most likely signals?',
        options: [
          'Tighter effective financial conditions through higher risk premia',
          'Automatic monetary easing',
          'A guaranteed rise in potential output',
          'No effect on private investment decisions'
        ],
        answer: 'Tighter effective financial conditions through higher risk premia',
        explanation: 'Wider spreads increase borrowing costs independent of the policy rate, dampening investment and demand.'
      },
      {
        id: 'q1_2026_bank_lending_channel',
        prompt: 'A slowdown in bank lending growth primarily affects the macro economy through?',
        options: [
          'Weaker credit creation, lower spending, and softer output momentum',
          'Immediate appreciation-driven export booms',
          'Guaranteed CPI decline within days',
          'Elimination of business-cycle volatility'
        ],
        answer: 'Weaker credit creation, lower spending, and softer output momentum',
        explanation: 'Credit frictions transmit into consumption and investment, often with lags but meaningful demand effects.'
      },
      {
        id: 'q1_2026_policy_communication_financial',
        prompt: 'When markets are volatile, central-bank communication should prioritize?',
        options: [
          'Reaction-function clarity to reduce policy uncertainty premia',
          'Promise of fixed asset prices',
          'Abandoning data dependence',
          'Replacing prudential supervision with FX intervention'
        ],
        answer: 'Reaction-function clarity to reduce policy uncertainty premia',
        explanation: 'Clear policy frameworks can stabilize expectations and reduce excess volatility in financial conditions.'
      }
    ]
  },
  {
    id: 'debt-sustainability-fiscal-rules',
    title: 'Debt sustainability & fiscal rules',
    summary: 'Evaluate debt dynamics, borrowing costs, and rule-based fiscal credibility.',
    questions: [
      {
        id: 'debt_primary_balance',
        prompt: 'If interest rates exceed nominal GDP growth for a prolonged period, stabilizing debt/GDP usually requires?',
        options: [
          'A stronger primary fiscal balance over time',
          'Only looser monetary policy forever',
          'Higher imports to lift demand',
          'Automatic debt reduction with no policy changes'
        ],
        answer: 'A stronger primary fiscal balance over time',
        explanation: 'When r > g, debt ratios tend to rise unless governments improve the primary balance or lift growth sustainably.'
      },
      {
        id: 'debt_rule_credibility',
        prompt: 'Why can transparent fiscal rules lower sovereign borrowing costs?',
        options: [
          'They improve policy credibility and reduce default/inflation risk premia',
          'They guarantee zero recessions',
          'They eliminate all political constraints',
          'They force immediate debt cancellation'
        ],
        answer: 'They improve policy credibility and reduce default/inflation risk premia',
        explanation: 'Credible medium-term rules can anchor expectations, reducing uncertainty that investors price into yields.'
      },
      {
        id: 'debt_austerity_timing',
        prompt: 'The main timing risk of front-loaded austerity in a weak economy is?',
        options: [
          'Deeper short-run contraction that worsens the output gap',
          'Immediate inflation spiral',
          'Guaranteed productivity surge',
          'Automatic current-account surplus'
        ],
        answer: 'Deeper short-run contraction that worsens the output gap',
        explanation: 'Large near-term tightening can compress demand quickly, raising unemployment before debt gains appear.'
      }
    ]
  },
  {
    id: 'expectations-policy-credibility',
    title: 'Expectations & policy credibility',
    summary: 'Use expectations channels to explain inflation persistence and stabilization outcomes.',
    questions: [
      {
        id: 'expect_anchor',
        prompt: 'When inflation expectations are well anchored, disinflation often requires?',
        options: [
          'A smaller output sacrifice for the same inflation reduction',
          'Larger permanent unemployment increases',
          'No role for central-bank communication',
          'Immediate LRAS contraction'
        ],
        answer: 'A smaller output sacrifice for the same inflation reduction',
        explanation: 'Anchored expectations can reduce wage-price persistence, improving the inflation-output trade-off.'
      },
      {
        id: 'expect_forward_guidance',
        prompt: 'Forward guidance is most effective when households and firms believe?',
        options: [
          'The central bank will follow through on its stated policy path',
          'Interest rates never affect spending',
          'Fiscal policy becomes irrelevant',
          'Exchange rates are fixed permanently'
        ],
        answer: 'The central bank will follow through on its stated policy path',
        explanation: 'Guidance works through expectations; credibility determines whether private decisions adjust today.'
      },
      {
        id: 'expect_wage_setting',
        prompt: 'If workers expect high inflation next year, nominal wage bargaining is likely to?',
        options: [
          'Push for higher wage growth now',
          'Lower wage demands below productivity growth',
          'Eliminate all unemployment risk',
          'Reduce money demand permanently'
        ],
        answer: 'Push for higher wage growth now',
        explanation: 'Higher expected inflation feeds wage demands, which can reinforce current inflation through costs and pricing.'
      }
    ]
  },
  {
    id: 'commodity-shocks-energy-markets',
    title: 'Commodity shocks & energy markets',
    summary: 'Analyze how oil/gas and input-cost shocks transmit into inflation and growth.',
    questions: [
      {
        id: 'commodity_cost_push',
        prompt: 'A sudden oil-price spike is most likely to generate which immediate macro pattern?',
        options: [
          'Cost-push inflation with weaker real output',
          'Demand-pull inflation with higher potential output',
          'Lower CPI and faster productivity growth',
          'No effect unless unemployment is zero'
        ],
        answer: 'Cost-push inflation with weaker real output',
        explanation: 'Higher energy input costs shift SRAS left, typically raising prices while reducing output in the short run.'
      },
      {
        id: 'commodity_terms_of_trade',
        prompt: 'For an energy-importing country, persistently higher oil prices usually worsen?',
        options: [
          'Terms of trade and external balance pressures',
          'Only household saving rates',
          'Potential output immediately upward',
          'Public debt ratios automatically downward'
        ],
        answer: 'Terms of trade and external balance pressures',
        explanation: 'Costlier imports deteriorate purchasing power and can widen external deficits if export earnings do not keep pace.'
      },
      {
        id: 'commodity_policy_response',
        prompt: 'A balanced policy response to an adverse energy supply shock often combines?',
        options: [
          'Targeted relief with medium-term efficiency/supply measures',
          'Unlimited broad stimulus regardless inflation',
          'Immediate protectionism as sole strategy',
          'No policy action because shocks self-correct instantly'
        ],
        answer: 'Targeted relief with medium-term efficiency/supply measures',
        explanation: 'Targeted support cushions vulnerable groups while efficiency and supply policies reduce repeat exposure to energy shocks.'
      }
    ]
  },
  {
    id: 'interactive-practice-problems',
    title: 'Interactive macro practice problems',
    summary: 'Work through applied macro scenarios with policy-choice reasoning.',
    questions: [
      {
        id: 'practice_output_gap_mix',
        prompt: 'An economy has a recessionary gap and falling inflation. Best immediate stabilization response?',
        options: [
          'Expansionary monetary policy and targeted fiscal support',
          'Contractionary monetary policy and tax increases',
          'Protectionist tariffs only',
          'Do nothing because inflation is falling'
        ],
        answer: 'Expansionary monetary policy and targeted fiscal support',
        explanation: 'A negative output gap with disinflation calls for demand support to restore output toward potential.'
      },
      {
        id: 'practice_multiplier_leakage',
        prompt: 'If households increase saving sharply after a tax cut, what happens to the multiplier effect?',
        options: ['It weakens', 'It strengthens automatically', 'It becomes infinite', 'It only affects LRAS'],
        answer: 'It weakens',
        explanation: 'Higher saving is a leakage from the spending cycle, reducing induced rounds of demand.'
      },
      {
        id: 'practice_exchange_rate_policy',
        prompt: 'Domestic rates rise relative to foreign rates. Most likely short-run exchange-rate result?',
        options: [
          'Currency appreciation from capital inflows',
          'Currency depreciation from lower demand',
          'No movement in FX markets',
          'Guaranteed current account surplus instantly'
        ],
        answer: 'Currency appreciation from capital inflows',
        explanation: 'Higher yield on domestic assets tends to attract portfolio inflows, bidding up the currency.'
      },
      {
        id: 'practice_supply_side_tradeoff',
        prompt: 'Which statement best captures the supply-side policy trade-off?',
        options: [
          'Benefits are often long-run, while costs/political friction are near-term',
          'They instantly eliminate cyclical unemployment',
          'They never require fiscal resources',
          'They always lower inflation immediately'
        ],
        answer: 'Benefits are often long-run, while costs/political friction are near-term',
        explanation: 'Structural reforms can raise potential output, but implementation lags and transition costs are common.'
      },
      {
        id: 'practice_policy_credibility',
        prompt: 'Why does policy credibility matter for disinflation outcomes?',
        options: [
          'It helps anchor expectations and lowers sacrifice ratio risk',
          'It guarantees zero unemployment',
          'It removes the need for any policy action',
          'It only matters in fixed exchange-rate regimes'
        ],
        answer: 'It helps anchor expectations and lowers sacrifice ratio risk',
        explanation: 'Credible policy can reduce expected inflation faster, improving the inflation-output trade-off during stabilization.'
      }
    ]
  },
  {
    id: 'financial-stability-banking',
    title: 'Financial stability & banking',
    summary: 'Understand credit cycles, systemic risk, and macroprudential policy roles.',
    questions: [
      {
        id: 'bank_capital_buffer',
        prompt: 'Higher bank capital requirements are primarily designed to?',
        options: ['Improve resilience to losses', 'Increase inflation immediately', 'Reduce all lending to zero', 'Replace monetary policy'],
        answer: 'Improve resilience to losses',
        explanation: 'Larger capital buffers help banks absorb shocks and lower systemic fragility.'
      },
      {
        id: 'bank_credit_boom',
        prompt: 'A rapid credit boom with rising asset prices most strongly raises concern about?',
        options: ['Financial instability and bubble risk', 'Automatic LRAS expansion', 'Permanent lower unemployment', 'Guaranteed fiscal surpluses'],
        answer: 'Financial instability and bubble risk',
        explanation: 'Fast leverage growth can inflate asset bubbles and amplify downside risk when conditions reverse.'
      },
      {
        id: 'bank_macroprudential',
        prompt: 'Loan-to-value (LTV) limits are best described as?',
        options: ['Macroprudential tools to contain systemic risk', 'Trade policy instruments', 'Fiscal automatic stabilizers', 'Exchange-rate controls only'],
        answer: 'Macroprudential tools to contain systemic risk',
        explanation: 'LTV caps constrain risky borrowing in housing cycles and support financial-system stability.'
      }
    ]
  }
];

export function evaluatePracticeAnswer(question, selection) {
  const expected = question?.answer ?? '';
  const isCorrect = expected && selection === expected;
  const explanation = (question?.explanation || '').trim();
  const message = isCorrect
    ? `✅ Correct. ${explanation}`.trim()
    : `❌ Correct answer: ${expected}. ${explanation}`.trim();
  return { isCorrect, explanation, message };
}

export function computePracticeScore(outcomes) {
  const total = outcomes.length;
  const correct = outcomes.filter(outcome => outcome.isCorrect).length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  return { total, correct, score };
}
