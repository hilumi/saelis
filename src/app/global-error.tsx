"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#FCFBFF",
          color: "#2D3650",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <h1>Saelis needs a moment.</h1>
        <p>Something unexpected happened. Nothing you wrote was lost on our side.</p>
        <button
          onClick={reset}
          style={{
            minHeight: "44px",
            padding: "0.5rem 1.5rem",
            borderRadius: "999px",
            border: "none",
            background: "#AA9AD4",
            color: "#fff",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest ? (
          <p style={{ color: "#8992A5", fontSize: "0.8rem" }}>Ref: {error.digest}</p>
        ) : null}
      </body>
    </html>
  );
}
