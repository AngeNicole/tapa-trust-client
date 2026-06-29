// Shared icon set, backed by Phosphor (duotone). Consumers use Icons.<name>;
// sizing/colour come from the surrounding CSS (svg inherits currentColor).
import {
  User,
  CalendarBlank,
  CurrencyDollar,
  MapPin,
  CheckSquare,
  Plus,
  Clock,
  BookmarkSimple,
  Briefcase,
  Wallet,
  MagnifyingGlass,
  EnvelopeSimple,
  Bell,
  SignOut,
  Sparkle,
  UploadSimple,
  GraduationCap,
  Certificate,
  CheckCircle,
} from '@phosphor-icons/react';

const w = 'regular';

export const Icons = {
  user: <User weight={w} />,
  calendar: <CalendarBlank weight={w} />,
  dollar: <CurrencyDollar weight={w} />,
  pin: <MapPin weight={w} />,
  check: <CheckSquare weight={w} />,
  plus: <Plus weight={w} />,
  clock: <Clock weight={w} />,
  bookmark: <BookmarkSimple weight={w} />,
  briefcase: <Briefcase weight={w} />,
  wallet: <Wallet weight={w} />,
  search: <MagnifyingGlass weight={w} />,
  mail: <EnvelopeSimple weight={w} />,
  bell: <Bell weight={w} />,
  logout: <SignOut weight={w} />,
  spark: <Sparkle weight={w} />,
  upload: <UploadSimple weight={w} />,
  graduation: <GraduationCap weight="fill" />,
  certificate: <Certificate weight="fill" />,
  checkCircle: <CheckCircle weight="fill" />,
};
