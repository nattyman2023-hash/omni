import {
  ArrowLeft, ArrowRight, ArrowUpRight, Award, Badge, BadgeCheck, Bath, Building2, Calculator, CalendarCheck2,
  CalendarDays, Check, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, CircleUserRound,
  ClipboardCheck, Clock3, Compass, Construction, Droplet, Eye, FileCheck2, FileText, Gauge, Gavel, GripVertical, Hammer,
  HardHat, Handshake, Hand, Camera, Headset, HelpCircle, Home, IdCard, ImagePlus, Images, KeyRound, Landmark, Layers, Lock, Mail,
  MapPin, MapPinned, Menu, MessageCircle, MessageSquare, Package, Phone, PhoneCall, PencilRuler, Quote, Ruler, Share2, Shield, ShieldCheck,
  Star, ThumbsUp, Users, Wrench, X, Calendar, GripHorizontal,
  type LucideIcon,
} from 'lucide-react';

/**
 * The Stitch exports use Google's Material Symbols Outlined icon font. The
 * existing app ships lucide-react (no extra font/network dependency), so this
 * maps every Material Symbol name referenced in the Stitch HTML to its closest
 * lucide-react equivalent. Add to this table rather than introducing a second
 * icon system.
 */
export const materialSymbolMap: Record<string, LucideIcon> = {
  location_on: MapPin,
  verified: BadgeCheck,
  call: Phone,
  mail: Mail,
  lock: Lock,
  chat: MessageCircle,
  arrow_forward: ArrowRight,
  east: ArrowRight,
  chevron_right: ChevronRight,
  person: CircleUserRound,
  history_edu: Award,
  record_voice_over: MessageSquare,
  square_foot: Ruler,
  mark_chat_read: CheckCheck,
  share_location: MapPinned,
  engineering: HardHat,
  check_circle: CheckCircle2,
  badge: IdCard,
  supervised_user_circle: Users,
  construction: Construction,
  calculate: Calculator,
  star: Star,
  verified_user: ShieldCheck,
  price_check: CircleDollarSign,
  policy: FileCheck2,
  security: Shield,
  gavel: Gavel,
  home_work: Home,
  layers: Layers,
  account_balance: Landmark,
  handshake: Handshake,
  hub: Share2,
  speed: Gauge,
  home_pin: MapPinned,
  calendar_month: CalendarDays,
  event_available: CalendarCheck2,
  water_drop: Droplet,
  photo_library: Images,
  architecture: Compass,
  grid_on: Building2,
  request_quote: FileText,
  carpenter: Hammer,
  shield_with_heart: ShieldCheck,
  handyman: Wrench,
  inventory_2: Package,
  wc: Bath,
  format_quote: Quote,
  drag_indicator: GripVertical,
  home: Home,
  schedule: Clock3,
  menu: Menu,
  close: X,
  arrow_back: ArrowLeft,
  done: Check,
  badge_outline: Badge,
  pin_drop: MapPin,
  expand_more: ChevronDown,
  key: KeyRound,
  rule: ClipboardCheck,
  assignment_turned_in: ClipboardCheck,
  phone_in_talk: Phone,
  domain_verification: Landmark,
  supervisor_account: Users,
  help_outline: HelpCircle,
  visibility: Eye,
  north_east: ArrowUpRight,
  straighten: Ruler,
  receipt_long: FileText,
  foundation: Building2,
  chat_bubble_outline: MessageSquare,
  roofing: HardHat,
  add_a_photo: ImagePlus,
  support_agent: Headset,
  thumb_up: ThumbsUp,
  touch_app: Hand,
  photo_camera: Camera,
  apartment: Building2,
  camera: Camera,
  shield_with_house: Home,
  calendar_today: Calendar,
  drag_handle: GripHorizontal,
  check: Check,
  rate_review: Quote,
  perm_phone_msg: PhoneCall,
  design_services: PencilRuler,
  domain: Building2,
};

type MSIconProps = {
  /** Material Symbols name as used in the Stitch export, e.g. "location_on" */
  name: keyof typeof materialSymbolMap | (string & {});
  size?: number;
  className?: string;
  strokeWidth?: number;
};

/** Renders the lucide-react icon mapped from a Stitch Material Symbols name. */
export function MSIcon({ name, size = 18, className, strokeWidth = 1.8 }: MSIconProps) {
  const Component = materialSymbolMap[name] ?? Building2;
  return <Component size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
