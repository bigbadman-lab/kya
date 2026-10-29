export function CornerMarks() {
  return (
    <>
      <svg
        width="10"
        height="9"
        viewBox="0 0 10 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-full -left-1.25 z-30 pointer-events-none text-zinc-700 fill-zinc-700"
        aria-hidden="true"
      >
        <path d="M0 0L10 0L5 9Z" fill="currentColor" />
      </svg>
      <svg
        width="10"
        height="9"
        viewBox="0 0 10 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-full -right-1.5 z-30 pointer-events-none text-zinc-700 fill-zinc-700"
        aria-hidden="true"
      >
        <path d="M0 0L10 0L5 9Z" fill="currentColor" />
      </svg>
    </>
  );
}
