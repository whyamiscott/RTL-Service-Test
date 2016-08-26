var ws = new WebSocket('ws://localhost:8081');

ws.onopen = function() {
	console.log('Соединение установлено!');
};

ws.onmessage = function(event) {
	var data = JSON.parse(event.data);

	switch (data.type) {
		case 'location':
			console.log('LOCATION:', event.data);
			break;
		case 'status':
			console.log('STATUS:', event.data);
			break;
		default:
			console.log('Unknown type')
	}
};
