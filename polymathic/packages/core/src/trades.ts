/**
 * Trade taxonomy: every kind of work Polymathic routes, with what it takes to
 * get in, what it takes to do the job, and the logistics that come with it.
 *
 * Licensing and certification rules vary by state, county, and city. Entries
 * describe the *typical* US picture and are a starting point for the growth
 * research assistant, which looks up the exact local rules.
 */

export type SkillTier = 'low' | 'medium' | 'high';

export type Sector =
  | 'construction'
  | 'home_services'
  | 'outdoor'
  | 'automotive'
  | 'transport'
  | 'cleaning'
  | 'care'
  | 'hospitality_events'
  | 'beauty_wellness'
  | 'creative_media'
  | 'technology'
  | 'business_services'
  | 'education'
  | 'manufacturing'
  | 'security'
  | 'health_support'
  | 'resale_sourcing'
  | 'agriculture';

export interface Trade {
  id: string;
  name: string;
  sector: Sector;
  /** Rough barrier to entry: low = trainable in days, medium = weeks–months, high = licensed/years. */
  tier: SkillTier;
  /** How often a government license is required somewhere in the US. */
  licensing: 'rarely' | 'sometimes' | 'usually';
  /** Certifications that commonly gate or upgrade work (slugs). */
  certifications: string[];
  /** Equipment typically needed to take jobs independently (slugs, see equipment.ts). */
  equipment: string[];
  /** Per-job logistics the platform should handle or prompt for. */
  logistics: string[];
  /** Typical ways in: training, apprenticeship, school. */
  pathways: string[];
}

const t = (
  id: string,
  name: string,
  sector: Sector,
  tier: SkillTier,
  licensing: Trade['licensing'],
  certifications: string[],
  equipment: string[],
  logistics: string[],
  pathways: string[],
): Trade => ({ id, name, sector, tier, licensing, certifications, equipment, logistics, pathways });

// Shared logistics fragments
const SITE = ['Confirm site access & parking', 'Before/after photos'];
const MATERIALS = ['Materials list & pickup', 'Receipt capture for expenses'];
const DISPOSAL = ['Debris disposal / dump run'];
const PERMIT = ['Check permit requirements', 'Schedule inspection if permitted'];
const INSURED = ['Certificate of insurance on file'];

export const TRADES: Trade[] = [
  // Construction & building trades
  t('general-construction', 'General construction', 'construction', 'medium', 'sometimes', ['osha-10', 'osha-30'], ['power-tools', 'pickup-truck'], [...SITE, ...MATERIALS, ...DISPOSAL, ...PERMIT, ...INSURED], ['Laborer to lead path', 'NCCER Core', 'Community college construction program']),
  t('general-contracting', 'General contracting', 'construction', 'high', 'usually', ['osha-30', 'gc-license'], ['pickup-truck', 'power-tools'], [...PERMIT, ...INSURED, 'Subcontractor agreements', 'Lien waivers', 'Draw schedule'], ['Years of trade experience + state GC exam']),
  t('carpentry', 'Carpentry & framing', 'construction', 'medium', 'rarely', ['osha-10', 'nccer-carpentry'], ['power-tools', 'pickup-truck'], [...SITE, ...MATERIALS, ...DISPOSAL], ['Apprenticeship (union or open shop)', 'NCCER Carpentry']),
  t('finish-carpentry', 'Finish carpentry & cabinetry', 'construction', 'medium', 'rarely', [], ['power-tools', 'miter-saw'], [...SITE, ...MATERIALS], ['Apprenticeship', 'Woodworking courses']),
  t('painting-drywall', 'Painting & drywall', 'construction', 'low', 'rarely', ['epa-rrp'], ['ladders', 'drywall-tools'], [...SITE, ...MATERIALS, 'Lead-safe practices for pre-1978 homes'], ['On-the-job', 'EPA RRP course (1 day)']),
  t('flooring', 'Flooring installation', 'construction', 'medium', 'rarely', [], ['power-tools', 'flooring-tools', 'pickup-truck'], [...SITE, ...MATERIALS, ...DISPOSAL], ['On-the-job', 'Manufacturer install certifications']),
  t('tile', 'Tile & stone', 'construction', 'medium', 'rarely', ['ctef-cti'], ['tile-saw', 'power-tools'], [...SITE, ...MATERIALS], ['Apprenticeship', 'Certified Tile Installer (CTEF)']),
  t('roofing', 'Roofing', 'construction', 'medium', 'sometimes', ['osha-10', 'fall-protection'], ['ladders', 'fall-protection-kit', 'pickup-truck'], [...SITE, ...DISPOSAL, ...PERMIT, 'Weather window check'], ['On-the-job', 'Manufacturer certifications (e.g. shingle makers)']),
  t('concrete-masonry', 'Concrete & masonry', 'construction', 'medium', 'sometimes', ['aci-flatwork'], ['mixer', 'pickup-truck', 'trailer'], [...SITE, ...MATERIALS, ...PERMIT], ['Apprenticeship', 'ACI certifications']),
  t('electrical', 'Electrical', 'construction', 'high', 'usually', ['electrician-license', 'osha-10'], ['electrical-tools', 'van'], [...PERMIT, ...INSURED, 'Code compliance check'], ['4–5 year apprenticeship', 'Journeyman then master license']),
  t('plumbing', 'Plumbing', 'construction', 'high', 'usually', ['plumber-license', 'osha-10'], ['plumbing-tools', 'van'], [...PERMIT, ...INSURED], ['4–5 year apprenticeship', 'Journeyman then master license']),
  t('hvac', 'HVAC-R', 'construction', 'high', 'usually', ['epa-608', 'nate', 'hvac-license'], ['hvac-gauges', 'van'], [...PERMIT, ...INSURED, 'Refrigerant tracking'], ['Trade school (6–24 months)', 'EPA 608 exam', 'Helper → tech']),
  t('welding', 'Welding & fabrication', 'manufacturing', 'medium', 'rarely', ['aws-d1-1'], ['welder', 'pickup-truck'], ['Fire watch / hot-work permit', ...SITE], ['Welding school', 'AWS certification tests']),
  t('solar', 'Solar installation', 'construction', 'medium', 'sometimes', ['nabcep-pv-associate', 'osha-10'], ['power-tools', 'fall-protection-kit'], [...PERMIT, 'Utility interconnection paperwork'], ['NABCEP PV Associate', 'Installer crew']),
  t('insulation', 'Insulation & weatherization', 'construction', 'low', 'rarely', ['bpi-building-analyst'], ['insulation-blower'], [...SITE, ...MATERIALS], ['On-the-job', 'BPI certification']),
  t('fire-alarm', 'Fire alarm & low voltage', 'construction', 'high', 'usually', ['nicet-fire-alarm', 'low-voltage-license'], ['electrical-tools'], [...PERMIT, ...INSURED], ['NICET levels', 'Low-voltage license']),
  t('demolition', 'Demolition', 'construction', 'low', 'sometimes', ['osha-10'], ['pickup-truck', 'trailer'], [...DISPOSAL, 'Utility locate (811)', 'Asbestos/lead check'], ['On-the-job']),

  // Home services
  t('handyman', 'Handyman', 'home_services', 'low', 'sometimes', [], ['power-tools'], [...SITE, ...MATERIALS], ['On-the-job', 'Many states cap handyman job size without a license']),
  t('furniture-assembly', 'Furniture & fixture assembly', 'home_services', 'low', 'rarely', [], ['power-tools'], [...SITE, 'Packaging disposal'], ['None required']),
  t('tv-mounting', 'TV & smart-home install', 'home_services', 'low', 'rarely', [], ['power-tools', 'stud-finder'], SITE, ['None required']),
  t('appliance-repair', 'Appliance repair', 'home_services', 'medium', 'sometimes', ['epa-608'], ['appliance-tools', 'van'], [...SITE, 'Parts ordering'], ['Trade course', 'Manufacturer training']),
  t('locksmith', 'Locksmithing', 'home_services', 'medium', 'sometimes', ['locksmith-license'], ['lock-tools', 'van'], ['ID/ownership verification before entry'], ['Locksmith course', 'State license where required']),
  t('pest-control', 'Pest control', 'home_services', 'medium', 'usually', ['pesticide-applicator'], ['sprayer'], ['Chemical safety data sheets', 'Re-entry notice'], ['State pesticide applicator exam']),
  t('pool-service', 'Pool service', 'home_services', 'low', 'sometimes', ['cpo'], ['pool-kit', 'pickup-truck'], ['Chemical log'], ['Certified Pool Operator course']),
  t('home-inspection', 'Home inspection', 'home_services', 'high', 'usually', ['home-inspector-license'], ['inspection-kit', 'ladders', 'drone'], ['Report delivery', 'E&O insurance'], ['State pre-licensing course + exam']),
  t('restoration', 'Water & fire restoration', 'home_services', 'medium', 'rarely', ['iicrc-wrt'], ['dehumidifier', 'air-movers', 'van'], ['Moisture logs', 'Insurance claim documentation'], ['IICRC WRT course']),
  t('gutter-cleaning', 'Gutter & window cleaning', 'cleaning', 'low', 'rarely', ['fall-protection'], ['ladders'], SITE, ['None required']),

  // Outdoor
  t('landscaping', 'Landscaping & lawn care', 'outdoor', 'low', 'rarely', [], ['mower', 'trimmer', 'trailer', 'pickup-truck'], ['Route planning', 'Green-waste disposal'], ['On-the-job']),
  t('irrigation', 'Irrigation', 'outdoor', 'medium', 'sometimes', ['irrigation-license'], ['trencher', 'pickup-truck'], ['Utility locate (811)', 'Backflow test'], ['Irrigation Association courses', 'State license where required']),
  t('tree-care', 'Tree care & arborist', 'outdoor', 'high', 'sometimes', ['isa-arborist'], ['chainsaw', 'chipper', 'trailer'], ['Utility line clearance check', 'Debris haul'], ['ISA Certified Arborist']),
  t('snow-removal', 'Snow removal', 'outdoor', 'low', 'rarely', [], ['snow-plow', 'pickup-truck'], ['On-call scheduling', 'Liability waiver'], ['None required']),
  t('pressure-washing', 'Pressure washing', 'outdoor', 'low', 'rarely', [], ['pressure-washer', 'pickup-truck'], ['Runoff/wastewater rules'], ['None required']),
  t('fencing-decks', 'Fencing & decks', 'construction', 'medium', 'sometimes', [], ['post-hole-digger', 'power-tools', 'trailer'], ['Utility locate (811)', ...PERMIT, 'Property line check'], ['On-the-job']),

  // Automotive
  t('auto-mechanic', 'Auto repair (mobile)', 'automotive', 'medium', 'sometimes', ['ase'], ['mechanic-tools', 'van'], ['Parts ordering', 'Fluid disposal'], ['Automotive tech program', 'ASE tests']),
  t('auto-detailing', 'Auto detailing', 'automotive', 'low', 'rarely', [], ['pressure-washer', 'detailing-kit'], ['Water source check'], ['None required']),
  t('small-engine', 'Small engine repair', 'automotive', 'medium', 'rarely', [], ['mechanic-tools'], ['Parts ordering'], ['Small engine course']),

  // Transport & delivery
  t('rideshare', 'Rideshare driving', 'transport', 'low', 'sometimes', [], ['car'], ['Mileage log', 'Commercial/rideshare insurance'], ['Platform onboarding + background check']),
  t('delivery', 'Delivery & courier', 'transport', 'low', 'rarely', [], ['car'], ['Mileage log', 'Proof of delivery'], ['Platform onboarding']),
  t('moving', 'Moving & hauling', 'transport', 'low', 'sometimes', [], ['box-truck', 'dolly', 'moving-blankets'], ['Inventory & damage waiver', 'Crew coordination'], ['On-the-job']),
  t('junk-removal', 'Junk removal', 'transport', 'low', 'rarely', [], ['pickup-truck', 'trailer'], [...DISPOSAL, 'Donation/recycling drop-off'], ['None required']),
  t('trucking-cdl', 'Trucking (CDL)', 'transport', 'medium', 'usually', ['cdl-a', 'hazmat-endorsement', 'twic'], ['semi-truck'], ['Hours-of-service log', 'DOT medical card', 'Load paperwork'], ['CDL school (3–8 weeks)']),
  t('hotshot', 'Hotshot hauling', 'transport', 'medium', 'sometimes', ['cdl-a'], ['pickup-truck', 'gooseneck-trailer'], ['DOT/MC number', 'Load boards'], ['DOT registration']),
  t('forklift-warehouse', 'Warehouse & forklift', 'transport', 'low', 'rarely', ['forklift-operator'], [], ['Shift confirmation', 'PPE'], ['Forklift operator training (1 day)']),

  // Cleaning
  t('house-cleaning', 'Residential cleaning', 'cleaning', 'low', 'rarely', [], ['cleaning-kit'], ['Supplies restock', 'Key/lockbox handling'], ['None required']),
  t('commercial-cleaning', 'Commercial & janitorial', 'cleaning', 'low', 'rarely', [], ['cleaning-kit', 'floor-machine'], ['After-hours access', 'Bonding'], ['On-the-job']),
  t('carpet-cleaning', 'Carpet & upholstery cleaning', 'cleaning', 'medium', 'rarely', ['iicrc-cct'], ['carpet-extractor', 'van'], ['Drying time notice'], ['IICRC courses']),

  // Care
  t('childcare', 'Childcare & babysitting', 'care', 'low', 'sometimes', ['cpr-first-aid'], [], ['Parent contact sheet', 'Emergency plan'], ['CPR/First Aid course', 'State licensing for in-home daycare']),
  t('senior-care', 'Senior companion care', 'care', 'low', 'sometimes', ['cpr-first-aid'], ['car'], ['Care log', 'Emergency contacts'], ['CPR/First Aid', 'Home care aide training']),
  t('pet-care', 'Pet sitting & dog walking', 'care', 'low', 'rarely', ['pet-first-aid'], [], ['Pet profile & vet contact', 'Key handling'], ['None required']),
  t('dog-grooming', 'Mobile dog grooming', 'care', 'medium', 'rarely', [], ['grooming-kit', 'van'], ['Vaccination records'], ['Grooming school']),

  // Hospitality & events
  t('event-staffing', 'Event staffing', 'hospitality_events', 'low', 'rarely', ['food-handler'], [], ['Shift check-in', 'Dress code'], ['None required']),
  t('bartending', 'Bartending', 'hospitality_events', 'low', 'usually', ['tabc-or-state-alcohol'], [], ['Alcohol service certification on file'], ['State alcohol seller/server course']),
  t('catering', 'Catering & private chef', 'hospitality_events', 'medium', 'sometimes', ['servsafe-manager'], ['catering-kit', 'van'], ['Food safety plan', 'Commercial kitchen access'], ['Culinary school or experience', 'ServSafe']),
  t('av-tech', 'Event AV technician', 'hospitality_events', 'medium', 'rarely', [], ['av-kit', 'van'], ['Load-in schedule'], ['On-the-job']),

  // Beauty & wellness
  t('barber-cosmetology', 'Barber & cosmetology', 'beauty_wellness', 'medium', 'usually', ['cosmetology-license'], ['salon-kit'], ['Sanitation log'], ['State-approved school hours + exam']),
  t('massage', 'Massage therapy', 'beauty_wellness', 'medium', 'usually', ['massage-license'], ['massage-table'], ['Intake forms'], ['500+ hour program + MBLEx']),
  t('personal-training', 'Personal training', 'beauty_wellness', 'medium', 'rarely', ['cpt', 'cpr-first-aid'], [], ['Liability waiver'], ['NASM/ACE/NSCA certification']),

  // Creative & media
  t('photography', 'Photography', 'creative_media', 'medium', 'rarely', [], ['camera', 'lighting-kit'], ['Model/property releases', 'Delivery gallery'], ['Portfolio building']),
  t('videography', 'Videography', 'creative_media', 'medium', 'rarely', [], ['camera', 'lighting-kit', 'audio-kit'], ['Releases', 'Editing turnaround'], ['Portfolio building']),
  t('drone-services', 'Drone photo & inspection', 'creative_media', 'medium', 'usually', ['faa-part-107'], ['drone'], ['Airspace authorization (LAANC)', 'Flight log'], ['FAA Part 107 exam']),
  t('graphic-design', 'Graphic design', 'creative_media', 'medium', 'rarely', [], ['computer'], ['Brief & revisions policy'], ['Portfolio', 'Online courses']),
  t('signage-printing', 'Signs & print', 'creative_media', 'medium', 'rarely', [], ['vinyl-cutter', 'computer'], ['Proof approval'], ['On-the-job']),

  // Technology
  t('it-support', 'IT & computer support', 'technology', 'medium', 'rarely', ['comptia-a-plus'], ['computer'], ['Remote-access consent'], ['CompTIA A+']),
  t('networking-security', 'Networking & cybersecurity', 'technology', 'high', 'rarely', ['comptia-security-plus', 'ccna'], ['computer'], ['Scope/authorization letter'], ['CompTIA Security+', 'CCNA']),
  t('web-development', 'Web & app development', 'technology', 'high', 'rarely', [], ['computer'], ['Statement of work', 'Source control access'], ['Bootcamp, degree, or self-taught portfolio']),
  t('data-entry', 'Data entry & virtual assistance', 'business_services', 'low', 'rarely', [], ['computer'], ['NDA', 'Time tracking'], ['None required']),

  // Business & professional
  t('bookkeeping', 'Bookkeeping', 'business_services', 'medium', 'rarely', ['quickbooks-proadvisor'], ['computer'], ['Engagement letter', 'Secure document exchange'], ['Bookkeeping certificate', 'QuickBooks ProAdvisor']),
  t('tax-preparation', 'Tax preparation', 'business_services', 'high', 'sometimes', ['ptin', 'enrolled-agent'], ['computer'], ['PTIN on file', 'Client consent forms'], ['IRS PTIN', 'Enrolled Agent exam']),
  t('notary', 'Mobile notary & loan signing', 'business_services', 'medium', 'usually', ['notary-commission', 'nna-signing-agent'], ['car'], ['Journal entries', 'ID verification'], ['State notary commission', 'Signing agent certification']),
  t('real-estate', 'Real estate', 'business_services', 'high', 'usually', ['real-estate-license'], ['car'], ['Brokerage agreement'], ['Pre-licensing course + state exam']),
  t('translation', 'Translation & interpreting', 'business_services', 'high', 'rarely', ['ata-certification'], ['computer'], ['Confidentiality agreement'], ['ATA certification', 'Court/medical interpreter credentials']),
  t('marketing', 'Marketing & social media', 'business_services', 'medium', 'rarely', [], ['computer'], ['Brand guidelines', 'Ad account access'], ['Portfolio', 'Platform certifications']),

  // Education
  t('tutoring', 'Tutoring', 'education', 'medium', 'rarely', [], ['computer'], ['Session notes', 'Background check for minors'], ['Subject expertise']),
  t('trade-instruction', 'Trade & skills instruction', 'education', 'high', 'rarely', [], [], ['Curriculum', 'Liability waiver'], ['Journeyman-level experience']),

  // Security
  t('security-guard', 'Security guard', 'security', 'low', 'usually', ['guard-card'], [], ['Post orders', 'Incident reports'], ['State guard card course']),

  // Health support
  t('cna', 'Certified nursing assistant', 'health_support', 'medium', 'usually', ['cna-certification', 'cpr-first-aid'], [], ['Shift documentation'], ['State-approved CNA program (4–12 weeks)']),
  t('phlebotomy', 'Mobile phlebotomy', 'health_support', 'medium', 'sometimes', ['phlebotomy-certification'], ['phlebotomy-kit', 'car'], ['Specimen chain of custody'], ['Phlebotomy program + certification exam']),

  // Resale & sourcing (ties to the resale / cross-listing / estate-sale systems)
  t('estate-sales', 'Estate & garage sale management', 'resale_sourcing', 'medium', 'rarely', [], ['pickup-truck', 'pricing-kit'], ['Inventory & pricing', 'Consignment agreement', 'Payment handling'], ['On-the-job']),
  t('resale-sourcing', 'Resale sourcing & listing', 'resale_sourcing', 'low', 'rarely', ['sales-tax-permit'], ['camera', 'computer', 'car'], ['Cross-listing', 'Shipping & returns'], ['None required; resale certificate for tax-exempt buying']),
  t('appraisal', 'Personal property appraisal', 'resale_sourcing', 'high', 'rarely', ['isa-appraiser'], ['camera'], ['Written report'], ['ISA/ASA appraiser education']),

  // Agriculture
  t('farm-labor', 'Farm & ranch labor', 'agriculture', 'low', 'rarely', [], [], ['Seasonal scheduling'], ['On-the-job']),
  t('equipment-operator', 'Heavy equipment operator', 'agriculture', 'medium', 'sometimes', ['nccer-heo'], ['skid-steer', 'trailer'], ['Utility locate (811)', 'Equipment transport'], ['Operator school', 'Union apprenticeship']),
];

const BY_ID = new Map(TRADES.map((tr) => [tr.id, tr]));

export function getTrade(id: string): Trade | undefined {
  return BY_ID.get(id);
}

export function tradesByTier(tier: SkillTier): Trade[] {
  return TRADES.filter((tr) => tr.tier === tier);
}
