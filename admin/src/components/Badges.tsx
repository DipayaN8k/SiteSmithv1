import { STAGE_LABEL, STATUS_LABEL, type Stage, type Status } from "@/lib/api";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>;
}

// Three small dots: one per stage (backend, frontend, deployment).
export function StageDots({ stages }: { stages: Stage[] }) {
  return (
    <span className="dots" aria-label={stages.map((s) => `${STAGE_LABEL[s.stage]}: ${STATUS_LABEL[s.status]}`).join(", ")}>
      {stages.map((s) => <i key={s.stage} className={`dot dot--${s.status}`} title={`${STAGE_LABEL[s.stage]}: ${STATUS_LABEL[s.status]}`} />)}
    </span>
  );
}
