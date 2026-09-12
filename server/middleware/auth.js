/**
 * Route protection middleware for admin-only resources.
 * Validates that an active Express Session exists and has role 'admin'.
 */
export function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  return res.status(401).json({
    message: 'Unauthorized access',
    errors: ['A valid administrator session is required to perform this action.']
  });
}
