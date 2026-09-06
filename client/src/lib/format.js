export const money = (minor = 0) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
export const moneyAmount = (amount = 0) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: Number(amount) % 1 ? 2 : 0 }).format(Number(amount) || 0);
export const shortDate = (value) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
export const dateTime = (value) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
export const toInputDateTime = (value = new Date()) => { const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000); return date.toISOString().slice(0, 16); };
export const initials = (name = "") => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
