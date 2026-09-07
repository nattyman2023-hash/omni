export type Service = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  detail: string;
  image: string;
  icon: string;
  bullets: string[];
};

export type Project = {
  slug: string;
  title: string;
  location: string;
  category: string;
  description: string;
  image: string;
  gallery: string[];
  tags: string[];
};

export const site = {
  name: 'Omni Developments',
  tagline: 'Building with design, quality & pride',
  phone: '07928 149 731',
  phoneHref: 'tel:+447928149731',
  whatsappHref: 'https://wa.me/447928149731',
  email: 'admin@omnidevelopment.co.uk',
  area: 'Greater Manchester & Cheshire',
};

/**
 * Verification settings for claims that appear in the Stitch design.
 * Each claim is gated behind a boolean so it can be enabled only after
 * the owner supplies documentary evidence. Until evidence is supplied,
 * the badge/claim is NOT rendered publicly. This prevents publishing
 * unverified accreditations, ratings, addresses or legal details.
 *
 * Update these to `true` and fill in the verified values once evidence
 * is confirmed. See REAL_CONTENT_REQUIRED.md for the audit trail.
 */
export const siteSettings = {
  // Accreditations / guarantees
  fmbRegistered: false,
  fmbMember: false,
  publicLiabilityInsured: false,
  structuralWarranty10yr: false,
  buildingControlGuaranteed: false,
  // Ratings
  ratedGoogleCheckatrade: false,
  // Company legal identity
  legalCompanyName: '' as string,        // e.g. "Omni Developments Manchester Ltd"
  companyRegistrationNumber: '' as string, // Companies House number — empty = not verified
  registeredInEnglandWales: false,
  // Address
  operationsCentreAddress: '' as string,   // e.g. "Greater Manchester Operations Centre, M20 Manchester, UK"
};

export const services: Service[] = [
  {
    slug: 'home-extensions',
    name: 'Home Extensions',
    shortName: 'Extensions',
    description: 'Single and double-storey extensions that give your home room to grow.',
    detail: 'From the first feasibility conversation to the finishing details, we coordinate the structural, practical and design decisions that make an extension feel like it always belonged to the house.',
    image: '/images/site-interior.webp',
    icon: 'expand',
    bullets: ['Single and double-storey options', 'Structural alterations and steelwork', 'Open-plan living and garden connections', 'Clear scope before work begins'],
  },
  {
    slug: 'loft-conversions',
    name: 'Loft Conversions',
    shortName: 'Loft conversions',
    description: 'Thoughtful roof-space transformations with careful attention to light, access and structure.',
    detail: 'We help you understand what your roof space can support, then bring together the joinery, insulation, stairs and services needed for a comfortable new room.',
    image: '/images/services-loft.webp',
    icon: 'roofing',
    bullets: ['Dormer and roof-space planning', 'Insulation and structural coordination', 'New stairs, rooms and storage', 'A single point of contact'],
  },
  {
    slug: 'property-renovations',
    name: 'Property Renovations',
    shortName: 'Renovations',
    description: 'Whole-home improvements that respect the existing property while making it work harder.',
    detail: 'Renovation work is often a sequence of connected decisions. Our role is to keep those decisions joined up, from internal reconfiguration through to the final finish.',
    image: '/images/services-renovation.webp',
    icon: 'home-edit',
    bullets: ['Internal reconfiguration', 'Planned structural changes', 'Fabric, finish and services coordination', 'Practical build sequencing'],
  },
  {
    slug: 'property-refurbishments',
    name: 'Property Refurbishments',
    shortName: 'Refurbishments',
    description: 'A considered refresh for homes that need better performance, flow or finish.',
    detail: 'We can shape a refurbishment around the parts of the home that matter most, with a clear written scope so the priorities stay visible throughout the work.',
    image: '/images/services-refurbishment.webp',
    icon: 'sparkles',
    bullets: ['Room-by-room refreshes', 'External and internal repairs', 'New finishes and practical upgrades', 'Scope-led project planning'],
  },
  {
    slug: 'kitchen-renovations',
    name: 'Kitchen Renovations',
    shortName: 'Kitchens',
    description: 'Kitchen spaces designed around how your household actually lives.',
    detail: 'A kitchen renovation works best when layout, lighting, storage, finishes and building work are considered together. We manage the build details around your chosen direction.',
    image: '/images/home-front.webp',
    icon: 'cooking',
    bullets: ['Layout and service coordination', 'Open-plan and kitchen-diner work', 'Cabinet, worktop and lighting interfaces', 'Careful finishing and handover'],
  },
  {
    slug: 'bathroom-renovations',
    name: 'Bathroom Renovations & Installations',
    shortName: 'Bathrooms',
    description: 'Well-built bathrooms with durable finishes, considered details and clean installation.',
    detail: 'Whether you are updating one room or coordinating several, we take care of the plumbing, preparation, installation and finish with a practical eye for the details that last.',
    image: '/images/services-bathroom.webp',
    icon: 'bathroom',
    bullets: ['Bathroom and en-suite installations', 'Tiling, waterproofing and preparation', 'Fixtures, fittings and ventilation', 'A tidy, coordinated finish'],
  },
  {
    slug: 'general-building-work',
    name: 'General Building Work',
    shortName: 'General building',
    description: 'Structural and building work that needs experienced coordination on site.',
    detail: 'For projects that do not fit one neat label, we provide a joined-up building service for masonry, structural alterations, repairs and associated works.',
    image: '/images/site-interior.webp',
    icon: 'hammer',
    bullets: ['Masonry and structural work', 'Repairs and making-good', 'Steelwork and supporting trades', 'Clear communication on site'],
  },
];

export const areas = ['Manchester', 'Salford', 'Sale', 'Altrincham', 'Hale', 'Stockport', 'Cheadle', 'Bramhall', 'Hazel Grove', 'Wilmslow'];

export const projects: Project[] = [
  {
    slug: 'open-plan-extension',
    title: 'Open-plan extension & garden connection',
    location: 'Supplied project gallery',
    category: 'Extensions',
    description: 'A visual record of structural work, new openings and the connection between a home and its garden.',
    image: '/images/site-interior.webp',
    gallery: ['/images/site-interior.webp', '/images/timber-frame.jpeg', '/images/works-site.jpeg', '/images/garden-landscaping.jpeg'],
    tags: ['Extension', 'Structural work', 'Openings'],
  },
  {
    slug: 'property-improvements',
    title: 'Property improvements & external works',
    location: 'Supplied project gallery',
    category: 'Renovations',
    description: 'A collection of supplied photographs showing external improvements, landscaping and on-site progress.',
    image: '/images/project-renovation-01.webp',
    gallery: ['/images/project-renovation-01.webp', '/images/driveway-finish.jpeg', '/images/garden-beds.jpeg', '/images/home-front.jpeg'],
    tags: ['Renovation', 'External works', 'Landscaping'],
  },
  {
    slug: 'bathroom-installation',
    title: 'Bathroom installation',
    location: 'Supplied project gallery',
    category: 'Bathrooms',
    description: 'A finished bathroom detail from the supplied photography, used here to show finish quality and installation detail.',
    image: '/images/project-bathroom-01.webp',
    gallery: ['/images/project-bathroom-01.webp', '/images/interior-stair.jpeg', '/images/site-interior.jpeg'],
    tags: ['Bathroom', 'Installation', 'Finishes'],
  },
];

export const guides = [
  {
    slug: 'greater-manchester-home-extension-guide',
    title: 'The Complete Greater Manchester Home Extension Guide: Costs, Planning & Timelines',
    category: 'Planning guide',
    excerpt: 'A practical starting point for thinking through scope, design, approvals and the right questions to ask before building work begins.',
    body: [
      'Every successful extension starts with a clear brief. Before drawings or quotations, write down what is not working in the existing house and what you want the new space to make possible.',
      'From there, consider access, structure, drainage, natural light and how the new space will meet the rooms around it. The more those connections are understood early, the easier it is to compare options later.',
      'A useful early conversation should leave you with a better sense of scope, dependencies and the information still needed. A quote is most useful when it is built from that shared understanding.',
    ],
  },
  {
    slug: 'choosing-a-design-and-build-partner',
    title: 'Choosing a design-and-build partner',
    category: 'Advice',
    excerpt: 'The questions that help you compare communication, scope, site management and handover — not just a headline price.',
    body: [
      'Look for a clear explanation of what is included, what is excluded and how changes are handled. A transparent scope gives everyone a better starting point.',
      'Ask who will be responsible for day-to-day communication and how decisions will be recorded. Good project information protects the build as much as it protects the budget.',
      'Finally, choose a partner whose way of working matches the level of involvement you want. The right process should make the project feel more manageable from the beginning.',
    ],
  },
];

export const journey = [
  ['01', 'Initial conversation', 'Tell us what you want to change and what matters most.'],
  ['02', 'Site understanding', 'We review the property, access and the practical shape of the work.'],
  ['03', 'Scope & direction', 'The brief, specifications and next decisions are made visible.'],
  ['04', 'Build programme', 'We agree the sequence of work and keep communication moving.'],
  ['05', 'On-site delivery', 'Our team coordinates the build, trades and quality checks.'],
  ['06', 'Completion & handover', 'We walk through the finished work and close out the detail.'],
];

export const quoteTypes = [
  'Home Extension',
  'Loft Conversion',
  'Property Renovation',
  'Kitchen',
  'Bathroom',
  'Refurbishment',
  'General Building',
  'Other',
];
