export function Loading() { return <div className="state-box"><div className="spinner"/><p>Loading your family record…</p></div>; }
export function Empty({ title, children }) { return <div className="state-box empty"><strong>{title}</strong><p>{children}</p></div>; }
export function ErrorNotice({ message }) { return message ? <div className="notice error" role="alert">{message}</div> : null; }
export function SuccessNotice({ message }) { return message ? <div className="notice success" role="status">{message}</div> : null; }
