import { verifyToken } from "../utils/jwt.js";
import prisma from "../config/db.js";

const authMiddleware = async (req, res, next) => {
	try {
		const token = req.cookies?.token;

		if (!token) {
			const error = new Error("Unauthorized: No token provided");
			error.statusCode = 401;
			throw error;
		}

		let decoded;
		try {
			decoded = verifyToken(token);
		} catch (err) {
			const error = new Error("Unauthorized: Invalid token");
			error.statusCode = 401;
			throw error;
		}

		const user = await prisma.user.findUnique({
			where: { id: decoded.id },
		});

		if (!user) {
			const error = new Error("Unauthorized: User not found");
			error.statusCode = 401;
			throw error;
		}

		req.user = user;

		next();
	} catch (err) {
		next(err);
	}
};

export default authMiddleware;
