import Link from "next/link";
import { MatchedFlag, TicketFlag } from "@/components/TicketFlag";
import { getEvents, getMyEntries, getMyProfile, requireUser } from "@/lib/data";
import { SetupSteps } from "@/components/SetupSteps";
import { formatEventDates, photoUrl } from "@/lib/format";
import { isSituation, situationLabel } from "@/lib/matching";
import { deleteAccount } from "./actions";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "My profile" };

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const params = await searchParams;
  const user = await requireUser();
  const [profile, entries, events] = await Promise.all([getMyProfile(), getMyEntries(), getEvents()]);
  const welcome = params.welcome === "1" || !profile;
  const situation = isSituation(params.situation) ? params.situation : null;

  return (
    <div className="space-y-10">
      <section>
        {welcome && (
          <div className="mb-6">
            <SetupSteps current={1} />
          </div>
        )}
        <h1 className="heading mb-2">{welcome ? "Build your race profile" : "My profile"}</h1>
        {welcome && (
          <p className="mb-6 text-center text-sm text-muted">This is what other athletes see. You can change it any time.</p>
        )}
        <div className={welcome ? "" : "mt-6"}>
          <ProfileForm profile={profile} photoUrl={photoUrl(profile?.photo_path)} welcome={welcome} situation={situation} />
        </div>
      </section>

      {profile && !welcome && (
        <section>
          <h2 className="heading mb-6">My races</h2>
          <ul className="space-y-3">
            {events.map((event) => {
              const entry = entries.find((e) => e.event_id === event.id);
              return (
                <li key={event.id} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-bold uppercase">{event.name}</p>
                    <p className="text-sm text-muted">{formatEventDates(event.starts_on, event.ends_on)}</p>
                    {entry && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <TicketFlag hasTicket={entry.has_ticket} verified={entry.ticket_verified} />
                        {entry.status === "matched" && <MatchedFlag />}
                        {entry.status === "paused" && <span className="chip">Hidden</span>}
                      </div>
                    )}
                    {entry && (
                      <p className="mt-2 text-xs text-muted">
                        {situationLabel({ ...entry, team_size: null })} · Alerts {entry.alerts_email ? "on" : "off"}
                      </p>
                    )}
                  </div>
                  <Link href={`/me/race?event=${event.slug}`} className={entry ? "btn-line" : "btn-gold"}>
                    {entry ? "Edit" : "Join"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!welcome && (
      <section className="space-y-4 border-t border-edge pt-6">
        <p className="text-sm text-muted">Signed in as {user.email}</p>
        <form action="/auth/signout" method="post">
          <button className="btn-line w-full">Sign out</button>
        </form>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Delete my account</summary>
          <form action={deleteAccount} className="mt-3 space-y-3">
            <p className="text-muted">This deletes your profile, race listings, requests and messages. It can&apos;t be undone.</p>
            <label className="block">
              <span className="field-label">Type DELETE to confirm</span>
              <input className="input" name="confirm" autoComplete="off" />
            </label>
            <button className="btn w-full border border-danger text-danger">Delete account</button>
          </form>
        </details>
      </section>
      )}
    </div>
  );
}
