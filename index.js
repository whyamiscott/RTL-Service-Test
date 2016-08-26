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
	constructor(deviceKey, locationGenerationFreg, statusGenerationFreg) {
		this.deviceKey = deviceKey;
		this.status = {isOnline: false, name: 0};
		this.location = {
			lon: Math.round(Math.random() * 1) ? Math.random() * 180 : Math.random() * -180,
			lat: Math.round(Math.random() * 1) ? Math.random() * 90 : Math.random() * -90,
			alt: 'The strange tides'
		}
		this.locationGenerationFreg = locationGenerationFreg | 500;
		this.statusGenerationFreg = statusGenerationFreg | 1000;
		this.locationGenerationError = Math.round(Math.round(Math.random() * 1) ? Math.random() * 50 : Math.random() * -50);
		this.statusGenerationError = Math.round(Math.round(Math.random() * 1) ? Math.random() * 50 : Math.random() * -50);

		setInterval(this.randomChangeStatus, 5000, this);
	}

	randomChangeStatus(that) {
		let changeIsOnline = Math.round(Math.random() * 1),
			changeName = Math.round(Math.random() * 1);

		if (changeIsOnline) {
			that.status.isOnline = Math.round(Math.random() * 1) ? true : false;
		}

		if (changeName) {
			that.status.name = Math.round(Math.random() * 42);
		}
	}

	setIntervalForMethod(method, time) {
		setInterval(method, time);
	}

	getLocationPacket() {
		let location = this.location;

		return {
			mac: this.deviceKey,
			type: 'location',
			ts: Date.now(),
			location: location
		}
	}

	getStatusPacket() {
		let status = this.status;

		return {
			mac: this.deviceKey,
			type: 'status',
			ts: Date.now(),
			status: status
		}
	}

	getDevicePacket() {
		let status = this.status;
		let location = this.location;

		return {
			mac: this.deviceKey,
			type: 'device',
			status: status,
			location: location
		}
	}
}


let devices = [];
const N = 1000;

for (let i=0; i<N; i++) {
	devices.push(new Device(i));
}

wsServer.on('connection', (ws) => {
	let timers = [];

	for (let i=0; i<devices.length; i++) {
		wsSendMsg(ws, devices[i], 'device');

		let locationTimer = setInterval(
			wsSendMsg,
			devices[i].locationGenerationFreg + devices[i].locationGenerationError,
			ws,
			devices[i],
			'location'
		);

		let statusTimer = setInterval(
			wsSendMsg,
			devices[i].statusGenerationFreg + devices[i].statusGenerationError,
			ws,
			devices[i],
			'status'
		);

		timers.push(locationTimer);
		timers.push(statusTimer);
	}

	ws.on('close', () => {
		for (let i=0; i<timers.length; i++) {
			clearInterval(timers[i]);
		}
	})

	ws.on('message', (data, flags) => {
		console.log(data, flags);
	});
});

function wsSendMsg(ws, device, type) {
	switch (type) {
		case 'location':
			ws.send(JSON.stringify(device.getLocationPacket()));
			break;
		case 'status':
			ws.send(JSON.stringify(device.getStatusPacket()));
			break;
		case 'device':
			ws.send(JSON.stringify(device.getDevicePacket()));
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
