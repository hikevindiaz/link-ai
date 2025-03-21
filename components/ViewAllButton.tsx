"use client";

export default function ViewAllButton({ link }: { link: string }) {
  return (
    <button
      className="text-blue-500 text-sm font-medium mt-4"
      onClick={() => (window.location.href = link)}
    >
      View all
    </button>
  );
}
