"use client";

// Last-resort screen if the whole app fails to load. Plain styles, because
// the app's own stylesheet may not have loaded.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "Arial, sans-serif", display: "grid", placeItems: "center", textAlign: "center", padding: 16 }}>
        <div>
          <p style={{ fontSize: 48, fontWeight: 700, color: "#c09b2f", margin: 0 }}>OOPS</p>
          <p>Something went wrong loading Race Buddy.</p>
          <button onClick={() => retry()} style={{ background: "#c09b2f", border: 0, padding: "12px 20px", fontWeight: 700, textTransform: "uppercase" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
