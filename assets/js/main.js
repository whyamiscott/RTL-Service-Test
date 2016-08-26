var ws = new WebSocket('ws://localhost:8081');

function DeviceView(isOnline, name) {
	this.isOnline = isOnline;
	this.name = name;

	var that = this;

	this.setIsOnline = function(val) {
		if (val) {
			setInnerHTML(that.isOnline, 'On-line');
		} else {
			setInnerHTML(that.isOnline, 'Off-line');
		}
	}

	this.setName = function(val) {
		setInnerHTML(that.name, val);
	}

	this.update = function(properties) {
		if (properties.hasOwnProperty('isOnline')) this.setIsOnline(properties.isOnline);
		if (properties.hasOwnProperty('name')) this.setName(properties.name);
	}

	function setInnerHTML(elem, html) {
		elem.innerHTML = html;
	}
}

function DeviceController(deviceModel, deviceView) {
	this.model = deviceModel;
	this.view = deviceView;

	this.model.attachObserver(this.view);

	this.view.setIsOnline(this.model.getStatus().isOnline);
	this.view.setName(this.model.getStatus().name);
}

function DeviceModel(mac, location, status) {
	var mac = mac;
	var location = location;
	var status = status;
	var observers = [];

	this.getStatus = function() {
		return status;
	}

	this.getLocation = function() {
		return location;
	}

	this.attachObserver = function(o) {
		observers.push(o);
	}

	function notifyObservers(properties) {
		observers.forEach(function(o) {
			o.update(properties);
		})
	}

	this.setStatus = function(newStatus) {
		var changed = [],
			properties = {},
			i = 0;

		if (!newStatus.hasOwnProperty('isOnline') && !newStatus.hasOwnProperty('name')) return false;

		if (status.isOnline != newStatus.isOnline) {
			status.isOnline = newStatus.isOnline;
			changed.push('isOnline');
		}

		if (status.name != newStatus.name) {
			status.name = newStatus.name;
			changed.push('name');
		}

		for (i; i<changed.length; i++) {
			properties[changed[i]] = newStatus[changed[i]];
		}

		notifyObservers(properties);

		return true;
	}
}

var devices = {};

ws.onopen = function() {
	console.log('Соединение установлено!');
};

ws.onmessage = function(event) {
	var data = JSON.parse(event.data);

	if (!devices.hasOwnProperty(data.mac) && data.type != 'device') return false;

	switch (data.type) {
		case 'location':
			//console.log('LOCATION:', event.data);
			break;
		case 'status':
			devices[data.mac].model.setStatus(data.status);
			break;
		case 'device':
			var model = new DeviceModel(data.mac, data.location, data.status),
				view,
				controller,
				deviceHTMLNode = document.createElement('div'),
				isOnlineHTMLNode = document.createElement('p'),
				nameHTMLNode = document.createElement('p');

			deviceHTMLNode.id = 'device_' + data.mac;
			deviceHTMLNode.className = 'device';
			isOnlineHTMLNode.id = deviceHTMLNode.id + '__isOnline';
			nameHTMLNode.id = deviceHTMLNode.id + '__name';

			deviceHTMLNode.appendChild(isOnlineHTMLNode);
			deviceHTMLNode.appendChild(nameHTMLNode);
			document.getElementById('devices').appendChild(deviceHTMLNode);

			view = new DeviceView(isOnlineHTMLNode, nameHTMLNode);
			controller = new DeviceController(model, view);

			devices[data.mac] = {model: model, view: view, controller: controller};

			break;
		default:
			console.log('Unknown type')
	}
};
