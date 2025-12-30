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
  const userOnly = checkRole('user');
  const paidUserOnly = checkRole('paid_user');
  
  // User & Paid User only (ADMIN TIDAK BOLEH AKSES)
  const userAndPaidUserOnly = (req, res, next) => {
    try {
      const userRole = req.user.role;
  
      if (!userRole) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: No role assigned',
        });
      }
  
      // ADMIN TIDAK BOLEH AKSES
      if (userRole === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin cannot access this resource.',
        });
      }
  
      // Hanya user dan paid_user yang boleh akses
      if (userRole === 'user' || userRole === 'paid_user') {
        return next();
      }
  
      // Role lain tidak diizinkan
      return res.status(403).json({
        success: false,
        error: 'Access denied. User or paid_user role required.',
      });
    } catch (error) {
      console.error('❌ Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during authorization',
      });
    }
  };
  
  module.exports = {
    checkRole,
    adminOnly,
    paidOnly,
    userOnly,
    paidUserOnly,
    userAndPaidUserOnly, // Export middleware baru
  };