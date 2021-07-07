import { Application } from 'express';
import LoggerInstance from './logger';
import expressLoader from './express';

export default async ({ app }: { app: Application }) => {
	await expressLoader({ app });
	LoggerInstance.info('✌️ Express loaded');
};
