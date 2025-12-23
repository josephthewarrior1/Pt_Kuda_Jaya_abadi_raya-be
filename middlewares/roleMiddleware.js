// Middleware untuk cek role user
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
      try {
        const userRole = req.user.role;
  
        if (!userRole) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: No role assigned',
          });
        }
  
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Insufficient permissions',
          });
        }
  
        next();
      } catch (error) {
        console.error('❌ Role check error:', error);
        res.status(500).json({
          success: false,
          error: 'Server error during authorization',
        });
      }
    };
  };
  
  // Shorthand middleware functions
  const adminOnly = checkRole('admin');
  const paidOnly = checkRole('paid_user', 'admin');
  const allUsers = checkRole('user', 'paid_user', 'admin');
  
  module.exports = {
    checkRole,
    adminOnly,
    paidOnly,
    allUsers,
  };