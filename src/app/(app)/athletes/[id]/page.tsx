import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { MatchedFlag, TicketFlag } from "@/components/TicketFlag";
import { getCategories, getMyEntries, requireProfile } from "@/lib/data";
import { formatRaceTime, photoUrl } from "@/lib/format";
import { situationLabel } from "@/lib/matching";
import { createClient } from "@/lib/supabase/server";
import type { AthleteProfile, FeedEntry, PartnerRequest } from "@/lib/types";
import { RequestForm } from "./RequestForm";

export const metadata = { title: "Athlete" };

export default async function AthletePage({ params }: PageProps<"/athletes/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: entryData } = await supabase.from("feed_entries").select("*").eq("id", id).maybeSingle();
  const entry = entryData as FeedEntry | null;
  if (!entry) notFound();

  const [{ data: profileData }, { data: requestData }, categories, myEntries] = await Promise.all([
    supabase.from("athlete_profiles").select("*").eq("id", entry.user_id).maybeSingle(),
    supabase
      .from("partner_requests")
      .select("*")
      .eq("event_id", entry.event_id)
      .or(`and(from_user.eq.${user.id},to_entry_id.eq.${entry.id}),and(from_user.eq.${entry.user_id},to_user.eq.${user.id})`)
      .in("status", ["pending", "accepted"]),
    getCategories(entry.event_id),
    getMyEntries(),
  ]);
  const profile = profileData as AthleteProfile | null;
  if (!profile) notFound();
  const requests = (requestData as PartnerRequest[] | null) ?? [];
  const sent = requests.find((r) => r.from_user === user.id);
  const received = requests.find((r) => r.from_user === entry.user_id);
  const isMe = entry.user_id === user.id;
  const isTeam = entry.has_ticket && entry.team_size === 4;
  const haveListing = myEntries.some((e) => e.event_id === entry.event_id);
  const wants = [...new Set(entry.wanted_category_ids.map((cid) => categories.find((c) => c.id === cid)?.name).filter(Boolean))];

  const rows: [string, string | null | undefined][] = [
    ["Looking for", situationLabel(entry)],
    ["Category", entry.has_ticket ? [entry.category_name, entry.race_day].filter(Boolean).join(" · ") : wants.join(", ")],
    ["Race days", entry.has_ticket ? null : entry.race_days.join(", ")],
    ["Captain", isTeam ? `${profile.first_name}, ${profile.age}` : null],
    ["Stations to cover", isTeam ? entry.stations : null],
    ["5km time", formatRaceTime(profile.five_k_seconds)],
    ["Previous race", profile.best_race_time],
    ["Gym", profile.gym],
    ["Home", [profile.home_town, profile.region].filter(Boolean).join(", ")],
    ["Will travel", profile.travel_miles != null ? `${profile.travel_miles} miles` : null],
  ];

  const hasPhoto = Boolean(photoUrl(profile.photo_path));
  const title = isTeam ? entry.team_name || `${profile.first_name}'s team` : `${profile.first_name}, ${profile.age}`;

  return (
    <div className="-mx-4 -mt-5">
      <div className="relative border-b border-fg">
        {hasPhoto ? (
          <Avatar name={profile.first_name} path={profile.photo_path} size={640} className="!h-72 !w-full" />
        ) : (
          <div className="h-28 bg-linear-to-br from-soft to-bg" aria-hidden />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg/90 to-transparent p-4">
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide">{title}</h1>
          {isTeam && (
            <p className="mt-1 text-sm text-accent">
              Relay · needs {entry.spots_needed} of 4
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <TicketFlag hasTicket={entry.has_ticket} verified={entry.ticket_verified} />
            {entry.status === "matched" && <MatchedFlag />}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 pt-5">
        <dl>
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-edge py-2 text-sm">
                <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
        </dl>
        {entry.note && <p className="border-l-2 border-accent pl-3 text-sm">{entry.note}</p>}
        {profile.bio && <p className="text-sm text-muted">{profile.bio}</p>}

        {isMe ? (
          <Link href="/me" className="btn-line w-full">
            This is you. Edit your profile
          </Link>
        ) : sent?.status === "accepted" || received?.status === "accepted" ? (
          <Link href={`/chats/${(sent ?? received)!.conversation_id}`} className="btn-gold w-full">
            Open chat
          </Link>
        ) : sent ? (
          <p className="border border-edge p-3 text-center text-sm text-muted">Request sent. Chat opens when they accept.</p>
        ) : received ? (
          <Link href="/requests" className="btn-gold w-full">
            {profile.first_name} has asked you. Reply
          </Link>
        ) : entry.status !== "looking" ? (
          <p className="border border-edge p-3 text-center text-sm text-muted">Not looking for a partner right now.</p>
        ) : !haveListing ? (
          <Link href="/me/race" className="btn-gold w-full">
            Add your listing to send a request
          </Link>
        ) : (
          <RequestForm entryId={entry.id} isTeam={isTeam} firstName={profile.first_name} />
        )}
      </div>
    </div>
  );
}
