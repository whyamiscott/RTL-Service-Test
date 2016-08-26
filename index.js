'use strict'

let http = require('http'),
	bodyParser = require('body-parser'),
	express = require('express'),
	ws = new require('ws'),
	app = new express(),
	wsServer = new ws.Server({port: 8081}),
	server;

app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static('assets'));
app.use(bodyParser.json());

class Device {
	constructor(deviceKey, isOnline, locationGenerationFreg, statusGenerationFreg) {
		this.deviceKey = deviceKey;
		this.isOnline = isOnline | false;
		this.location = {
			lon: Math.round(Math.random() * 1) ? Math.random() * 180 : Math.random() * -180,
			lat: Math.round(Math.random() * 1) ? Math.random() * 90 : Math.random() * -90,
			alt: 'The strange tides'
		}
		this.locationGenerationFreg = locationGenerationFreg | 500;
		this.statusGenerationFreg = statusGenerationFreg | 1000;
		this.locationGenerationError = Math.round(Math.round(Math.random() * 1) ? Math.random() * 50 : Math.random() * -50);
		this.statusGenerationError = Math.round(Math.round(Math.random() * 1) ? Math.random() * 50 : Math.random() * -50);
	}

	setOnline() {this.online = true}
	setOffline() {this.online = false}

	getLocationPacket() {
		return {
			mac: this.deviceKey,
			type: 'location',
			ts: Date.now(),
			location: this.location
		}
	}

	getStatusPacket() {
		return {
			mac: this.deviceKey,
			type: 'status',
			ts: Date.now(),
			status: {isOnline: this.isOnline, name: Math.random()}
		}
	}
}

let myDevice = new Device(232139);

wsServer.on('connection', (ws) => {
	let locationTimer = setInterval(
		wsSendMsgOnTimer,
		myDevice.locationGenerationFreg + myDevice.locationGenerationError,
		ws,
		myDevice,
		'location'
	);

	let statusTimer = setInterval(
		wsSendMsgOnTimer,
		myDevice.statusGenerationFreg + myDevice.statusGenerationError,
		ws,
		myDevice,
		'status'
	);

	ws.on('close', () => {
		clearInterval(locationTimer);
		clearInterval(statusTimer);
	})

	ws.on('message', (data, flags) => {
		console.log(data, flags);
	});
});

function wsSendMsgOnTimer(ws, device, type) {
	switch (type) {
		case 'location':
			ws.send(JSON.stringify(device.getLocationPacket()));
			break;
		case 'status':
			ws.send(JSON.stringify(device.getStatusPacket()));
			break;
		default:
			console.log('Unknown type of packet.');
	}
}

app.route('/')
	.get((req, res) => {
		res.render('index');
	})

server = app.listen('3000', 'localhost', () => console.log("Server is listening on 3000, ws on 8081."));
