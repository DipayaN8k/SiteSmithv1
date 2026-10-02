"use client";

import { useState } from "react";
import { projects } from "@/lib/site";
import { WorkCard } from "./Sections";

export function WorkGrid() {
  const kinds = ["All", ...Array.from(new Set(projects.map((p) => p.kind)))];
  const [kind, setKind] = useState("All");
  const shown = kind === "All" ? projects : projects.filter((p) => p.kind === kind);
  return (
    <>
      <div className="filter" role="group" aria-label="Filter projects">
        {kinds.map((k) => <button key={k} aria-pressed={k === kind} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <div className="work-grid work-grid--3">
        {shown.map((p) => <WorkCard key={p.slug} p={p} />)}
      </div>
    </>
  );
}
