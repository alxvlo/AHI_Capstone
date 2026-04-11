import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildClientDashboardHref,
  type ClientDashboardSearchState,
} from "@/features/dashboard/client/shared";

type CaseSearchProps = {
  searchState: ClientDashboardSearchState;
};

export function CaseSearch({ searchState }: CaseSearchProps) {
  const clearHref = buildClientDashboardHref({
    caseId: "",
    query: "",
    fromDate: "",
    toDate: "",
    dpaAccepted: searchState.dpaAccepted,
  });

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Search and Filter</h2>

      <form action="/dashboard/client" className="grid gap-3 md:grid-cols-4">
        <Input
          name="query"
          defaultValue={searchState.query}
          placeholder="Search name, case number, or identifier"
          className="h-11"
        />
        <Input name="fromDate" type="date" defaultValue={searchState.fromDate} className="h-11" />
        <Input name="toDate" type="date" defaultValue={searchState.toDate} className="h-11" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 px-4">
            Apply Filters
          </Button>
          <Button type="button" variant="outline" className="h-11 px-4" asChild>
            <Link href={clearHref}>Clear</Link>
          </Button>
        </div>

        {searchState.caseId ? (
          <input type="hidden" name="caseId" value={searchState.caseId} />
        ) : null}
        {searchState.dpaAccepted === "1" ? (
          <input type="hidden" name="dpaAccepted" value="1" />
        ) : null}
      </form>
    </section>
  );
}
