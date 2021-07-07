import { Application } from 'express';
import cors from 'cors';
import express from 'express';
import LoggerInstance from '../loaders/logger';
import { applySession, ironSession, SessionOptions } from 'next-iron-session';
import { Server, Socket } from 'socket.io';
import http from 'http';

const whiteList = [
	'http://localhost:3000',
	'http://htwhouse.localhost',
	'https://htwhouse-production.up.railway.app/',
];

const expressLoader = async ({ app }: { app: Application }) => {
	const server: http.Server = http.createServer(app);
	const io: Server = new Server({ cors: { origin: '*' } });
	io.attach(server);

	const signalServer = require('simple-signal-server')(io);

	const rooms = {};
	const socketRooms = {};

	app.enable('trust proxy');
	app.use(cors({ origin: '*', credentials: false }));
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.get('/healthcheck', (_, res) => {
		LoggerInstance.info('Healthcheck Endpoint Hit');
		res.status(200).send({ message: 'All Systems working' }).end();
	});

	io.on('connection', (socket: Socket) => {
		LoggerInstance.debug('🌱 Client Connected.');
		socket.on('joinRoom', async (payload) => {
			LoggerInstance.debug('🎤 Client Joined Room.');
			LoggerInstance.debug(' Payload: %o', payload);
			const { id } = payload;
			const { streamId, name, id: userId } = payload.user;
			socket.join(id);

			if (!socketRooms[id]) {
				socketRooms[id] = new Set();
			}

			socketRooms[id].add({
				id: userId,
				name: name,
				streamId: streamId,
			});

			LoggerInstance.debug('🏠 Current Room: %o', socketRooms[id]);
			io.in(id).emit('users', JSON.stringify(Array.from(socketRooms[id])));

			socket.on('disconnect', () => {
				LoggerInstance.info('🗿 Socket Client Disconnecting: %o', payload.user);
				io.in(id).emit('delete', payload.user.streamId);
				LoggerInstance.info('Before deletion %o', socketRooms[id]);
				socketRooms[id].forEach((user: any) => {
					if (user.id === payload.user.id) {
						socketRooms[id].delete(user);
					}
				});
				LoggerInstance.info('After deletion %o', socketRooms[id]);
				io.in(id).emit('users', JSON.stringify(Array.from(socketRooms[id])));
			});

			socket.on('speaking', (streamId) => {
				Array.from(socketRooms[id]).find(
					(e: { streamId: string }) => e.streamId === streamId,
				) && io.in(id).emit('spoke', streamId);
			});

			socket.on('deleteRoom', () => {
				LoggerInstance.debug('💀 Admin is deleting the Room.');
				io.in(id).emit('roomClosed', { id });
			});
		});
	});

	signalServer.on('discover', (request) => {
		// console.log('Incoming Request: %o', request);
		const roomId = request.discoveryData;
		signalServer.on('disconnect', (socket) => {
			const clientId = socket.id;
			rooms[roomId].delete(clientId);
		});
		if (!rooms[roomId]) {
			rooms[roomId] = new Set();
		}
		request.discover({
			roomResponse: roomId,
			peers: Array.from(rooms[roomId]),
		});

		if (request.socket.roomId !== roomId) {
			request.socket.roomId = roomId;
			rooms[roomId].add(request.socket.id);
		}
	});

	server.listen(3002, () => {
		console.log(`> Ready on http://localhost:3002`);
	});
};

export default expressLoader;
