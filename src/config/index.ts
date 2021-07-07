import dotenv from 'dotenv';

const envFound = dotenv.config();
if (envFound.error) {
	// This error should crash whole process
	throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
	/**
	 * Your favorite port
	 */
	port: parseInt(process.env.PORT!, 10),

	/**
	 * Used by winston logger
	 */
	logs: {
		level: process.env.LOG_LEVEL || 'silly',
	},

	/**
	 * API configs
	 */
	api: {
		restPrefix: '/api',
	},
};
