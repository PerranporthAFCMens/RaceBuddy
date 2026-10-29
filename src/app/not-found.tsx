import { Oops } from "@/components/Oops";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <Oops
      title="This page isn't here"
      body="The link may be old, or the athlete may have removed their listing or found a partner. Go back, or find someone else on Browse."
    />
  );
}
