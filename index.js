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
			alt: 0
		}
		this.locationGenerationFreg = locationGenerationFreg | 500;
		this.statusGenerationFreg = statusGenerationFreg | 1000;
		this.locationGenerationError = Math.round(Math.round(Math.random() * 1) ? Math.random() * 50 : Math.random() * -50);
		this.statusGenerationError = Math.round(Math.round(Math.random() * 1) ? Math.random() * 50 : Math.random() * -50);

		setInterval(this.randomChangeStatus, 5000, this);
		setInterval(this.randomChangeLocation, 1000, this);
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

	randomChangeLocation(that) {
		let changeLon = Math.round(Math.random() * 1),
			changeLat = Math.round(Math.random() * 1),
			changeAlt = Math.round(Math.random() * 1);

			if (changeLon) {
				let currentVal = that.location.lon;
				that.location.lon = Math.round(Math.random() * 1) ? currentVal + 0.05 : currentVal - 0.05;
			}

			if (changeLat) {
				let currentVal = that.location.lat;
				that.location.lat = Math.round(Math.random() * 1) ? currentVal + 0.05 : currentVal - 0.05;
			}

			if (changeAlt) {
				let currentVal = that.location.alt;
				that.location.alt = Math.round(Math.random() * 1) ? currentVal + 1 : currentVal - 1;
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
	let msg;

	switch (type) {
		case 'location':
			msg = JSON.stringify(device.getLocationPacket());
			break;
		case 'status':
			msg = JSON.stringify(device.getStatusPacket());
			break;
		case 'device':
			msg = JSON.stringify(device.getDevicePacket());
			break;
		default:
			console.log('Unknown type of packet.');
			return false;
	}

	try {ws.send(msg)}
	catch(e) {};
}

app.route('/')
	.get((req, res) => {
		res.render('index');
	})

server = app.listen('3000', 'localhost', () => console.log("Server is listening on 3000, ws on 8081."));
