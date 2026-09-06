export default function StatusBadge({ status }) { return <span className={`badge ${status}`}>{String(status).replace("-", " ")}</span>; }
