var ws = new WebSocket('ws://localhost:8081'),
	map = new Map(document.getElementById('map'), {lat: 0.09, lon: 78.21}, 1),
	devices = {};

ws.onmessage = function(event) {
	var data = JSON.parse(event.data);

	if (!devices.hasOwnProperty(data.mac) && data.type != 'device') return false;

	switch (data.type) {
		case 'location':
			devices[data.mac].model.setLocation(data.location);
			break;
		case 'status':
			devices[data.mac].model.setStatus(data.status);
			break;
		case 'device':
			devices[data.mac] = createDevice(document.getElementById('devices'), map, data.mac, data.location, data.status);
			break;
		default:
			console.log('Unknown type')
	}
};

function Map(mapContainer, coords, zoom) {
	var tiles = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoid2h5YW1pc2NvdHQiLCJhIjoiY2lzZm1kd2FuMDAybzMwbnFtYXdtOGNraCJ9.zcjtKmiWjx-3-SloVJXl4Q'),
		map = L.map(mapContainer, {center: coords, zoom: zoom, layers: tiles}),
		markers = L.markerClusterGroup({chunkedLoading: true});

	this.addMarker = function(coords, popup) {
		var marker = L.marker(coords);
		if (popup) marker.bindPopup(popup);
		markers.addLayer(marker);
		map.addLayer(markers);
		return marker;
	}

	this.setMarkerCoords = function(marker, coords) {
		marker.setLatLng(coords);
	}

	this.openPopup = function(marker) {
		markers.zoomToShowLayer(marker, function() {
			marker.openPopup();
		})
	}
};

function DeviceView(deviceOnPanel, panelDeviceId, panelOnlineStatus, panelStatusName, map, mapMarker, mapDeviceId, mapOnlineStatus, mapStatusName) {
	this.panel = {
		device: deviceOnPanel,
		deviceId: panelDeviceId,
		onlineStatus: panelOnlineStatus,
		statusName: panelStatusName
	}

	this.map = {
		mapObject: map,
		marker: mapMarker,
		deviceId: mapDeviceId,
		onlineStatus: mapOnlineStatus,
		statusName: mapStatusName
	}

	var that = this;

	this.getMap = function() {return that.map.mapObject}
	this.getMarker = function() {return that.map.marker}

	this.renderDeviceId = function(val) {
		setInnerHTML(that.map.deviceId, val);
		setInnerHTML(that.panel.deviceId, val);
	}

	this.renderOnlineStatus = function(val) {
		var text = val ? 'On-line' : 'Off-line';

		setInnerHTML(that.panel.onlineStatus, text);
		setInnerHTML(that.map.onlineStatus, text);
	}

	this.renderName = function(val) {
		setInnerHTML(that.panel.statusName, val);
		setInnerHTML(that.map.statusName, val);
	}

	this.changeLocation = function(val) {
		that.map.mapObject.setMarkerCoords(that.map.marker, val);
	}

	this.update = function(properties) {
		if (properties.hasOwnProperty('isOnline')) this.renderOnlineStatus(properties.isOnline);
		if (properties.hasOwnProperty('name')) this.renderName(properties.name);
		if (properties.hasOwnProperty('location')) this.changeLocation(properties.location);
	}

	function setInnerHTML(elem, html) {
		elem.innerHTML = html;
	}
};

function DeviceController(deviceModel, deviceView) {
	this.model = deviceModel;
	this.view = deviceView;

	var that = this;

	this.model.attachObserver(this.view);

	this.view.renderOnlineStatus(this.model.getStatus().isOnline);
	this.view.renderName(this.model.getStatus().name);
	this.view.renderDeviceId(this.model.getMac());

	this.view.panel.device.addEventListener('click', function() {
		console.log(1);
		that.view.getMap().openPopup(that.view.getMarker());
	});
};

function DeviceModel(mac, location, status) {
	var mac = mac;
	var location = location;
	var status = status;
	var observers = [];

	this.getStatus = function() {
		return status;
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

	this.getLocation = function() {
		return location;
	}

	this.setLocation = function(newLocation) {
		if (location.lon != newLocation.lon || location.lat != newLocation.lat || location.alt != newLocation.alt) {
			location = newLocation;
			notifyObservers({location: newLocation});
		}
	}

	this.getMac = function() {
		return mac;
	}

	this.attachObserver = function(o) {
		observers.push(o);
	}

	function notifyObservers(properties) {
		observers.forEach(function(o) {
			o.update(properties);
		})
	}
};

function createDevice(devicesContainer, map, deviceId, deviceLocation, deviceStatus) {
	var model = new DeviceModel(deviceId, deviceLocation, deviceStatus),
		view,
		controller;

	var deviceOnPanel = document.createElement('div'),
		panelDeviceId = document.createElement('p'),
		deviceOnlineStatus = document.createElement('p'),
		deviceStatusName = document.createElement('p');

	var	marker,
		popup = document.createElement('div'),
		popupDeviceId = document.createElement('p'),
		popupOnlineStatus = document.createElement('p'),
		popupStatusName = document.createElement('p');

	deviceOnPanel.id = 'device_' + deviceId;
	deviceOnPanel.rel = ''+deviceId;
	deviceOnPanel.className = 'device';
	panelDeviceId.id = deviceOnPanel.id + '__deviceId';
	deviceOnlineStatus.id = deviceOnPanel.id + '__onlineStatus';
	deviceStatusName.id = deviceOnPanel.id + '__statusName';
	deviceOnPanel.appendChild(panelDeviceId);
	deviceOnPanel.appendChild(document.createElement('hr'));
	deviceOnPanel.appendChild(deviceOnlineStatus);
	deviceOnPanel.appendChild(deviceStatusName);
	devicesContainer.appendChild(deviceOnPanel);

	popup.id = deviceOnPanel.id + '__popup';
	popupDeviceId.id = deviceOnPanel.id + '__popupDeviceId';
	popupOnlineStatus.id = deviceOnPanel.id + '__popupOnlineStatus';
	popupStatusName.id = deviceOnPanel.id + '__popupStatusName';
	popup.appendChild(popupDeviceId);
	popup.appendChild(document.createElement('hr'));
	popup.appendChild(popupOnlineStatus);
	popup.appendChild(popupStatusName);

	marker = map.addMarker(deviceLocation, popup);

	view = new DeviceView(deviceOnPanel, panelDeviceId, deviceOnlineStatus, deviceStatusName, map, marker, popupDeviceId, popupOnlineStatus, popupStatusName);
	controller = new DeviceController(model, view);

	return {
		model: model,
		view: view,
		controller: controller
	}
}
