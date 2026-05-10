const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      const error = new Error("Unauthorized: No user found");
      error.statusCode = 401;
      return next(error);
    }

    if (!allowedRoles.includes(user.role)) {
      const error = new Error("Forbidden: Access denied");
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

export default roleMiddleware;