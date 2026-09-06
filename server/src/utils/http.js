export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function publicUser(user) {
  return { id: user._id, name: user.name, displayName: user.name, email: user.email, role: user.role };
}
