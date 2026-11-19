import { daybookRoute } from '@/lib/daybook/http';
import { getCollection } from '@/lib/daybook/collection';
import { parseRange } from '@/lib/daybook/validate';

export const dynamic = 'force-dynamic';

// GET /api/daybook/collection?from=YYYY-MM-DD&to=YYYY-MM-DD
// Collection Book payments for the period, the same figures the Collection Book shows.
export const GET = daybookRoute(async (req) => {
  const { from, to } = parseRange(req.nextUrl.searchParams);
  return getCollection(from, to);
});
