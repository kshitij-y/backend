const errorHandler = (err, req, res, next) => {
	const statusCode = err.statusCode || 500;

	const errorLog = {
		success: false,
		status: statusCode,
		message: err.message,
		method: req.method,
		url: req.originalUrl,
		ip: req.ip,
		timestamp: new Date().toISOString(),
		stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
	};

	// Clean console output
	if (process.env.NODE_ENV === "development") {
		console.error("🔥 ERROR:", JSON.stringify(errorLog, null, 2));
	} else {
		console.error("🔥 ERROR:", err.message);
	}

	// Response (client-safe)
	res.status(statusCode).json({
		success: false,
		message:
			process.env.NODE_ENV === "production"
				? "Something went wrong"
				: err.message,
		...(process.env.NODE_ENV === "development" && {
			stack: err.stack,
		}),
	});
};

export default errorHandler;