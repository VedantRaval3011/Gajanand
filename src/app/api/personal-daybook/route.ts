import { daybookRoute } from '@/lib/daybook/http';
import { personalDaybook } from '@/lib/daybook/service';
import { parseRange } from '@/lib/daybook/validate';
const { listEntries } = personalDaybook;

export const dynamic = 'force-dynamic';

// GET /api/personal-daybook?from=YYYY-MM-DD&to=YYYY-MM-DD  (to defaults to from, from defaults to today)
export const GET = daybookRoute(async (req) => {
  const { from, to } = parseRange(req.nextUrl.searchParams);
  return listEntries(from, to);
});
