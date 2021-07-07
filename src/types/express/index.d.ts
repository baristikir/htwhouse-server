export {};

declare global {
	namespace Express {
		export interface Session {
			session: import('next-iron-session').Session;
		}
	}
}
