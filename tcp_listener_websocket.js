const { networkInterfaces } = require('os');
const net = require('net');
const path = require('path')
const fs = require('fs');
const WebSocket = require('ws');



/**************************************************/
// TCP Params :
let tcpHost = '192.168.1.13'; // default value
const tcpPort = 1300;
/**************************************************/


const log = function(data) {
    console.log(getTimestamp() + ": " + data);
}

const getTimestamp = function(data) {
	return new Date().toISOString().slice(0, 19).replace('T', ' ');;
}

const getLocal_IP = function() {

    const nets = networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object
    const ips = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
                ips.push(net.address);
            }
        }
    }

    if (ips.length > 0) {
      return ips[0];
    } else {
        log("Local IP NOT FOUND", results);
        return "NOT_FOUND";
    }
}

const getTagIdFromTagData = function(tag) {

    const STX  = tag.substr(0, 2);
    const SEQ  = tag.substr(2, 2);
    const DADD = tag.substr(4, 2);
    const DATA_LENGTH = parseInt(tag.substr(6, 2));
    const STATUS = tag.substr(8, 2);

    const dataLength = 2 * (DATA_LENGTH - 1);
    const dataEndPosition = 10 + dataLength;

    if (dataLength <= 1) {
        return "";
    }

    const DATA = tag.substr(10, dataLength);
    const BCC = tag.substr(dataEndPosition, 2);
    const ETX = tag.substr(dataEndPosition + 2, 2);

    return DATA;
}

log('--------- Server init ---------');


//
// WebSocket client 
//

let ws;
let ws_URL;

const openWebSocketConnection = function(messageJSON) {
	if (ws_URL) {
		log(`Open Websocket connection... ${ws_URL}`);
		ws = new WebSocket(ws_URL);
		
		ws.addEventListener("open", () => {
		  log(`WebSocket connection opened : ${ws_URL}`);
		  
		  if (messageJSON) {
			  setTimeout(function() {
				log(`WebSocket client is ready : sending message...`);
				sendMessageToWebSocketServer(messageJSON);
			  }, 100);
		  }
		  
		});
		
		ws.addEventListener("error", () => {
		  log(`WebSocket connection error : ${ws_URL}`);
		});	
		
		ws.addEventListener("close", () => {
			// Disconnected
			ws = null;
		});
		
	} else {
	  log(`WebSocket URL not defined`);
	}
}

const sendMessageToWebSocketServer = function(messageJSON) {
	if (ws) {
		
		const message = Buffer.from( JSON.stringify(messageJSON) );
		ws.send(message);

	} else {
		
		// Open connection then send message :
		openWebSocketConnection(messageJSON);
		
	}
}



//
// Config : RFID IPs 
//

let RFID_readers_config = {};

const getRFIDReaderConfig = function(IpAdddress) {
	if (RFID_readers_config && RFID_readers_config[IpAdddress]) {
		return RFID_readers_config[IpAdddress];
	}
	return "NOT_FOUND";
}


const loadConfig = function() {
	fs.readFile(path.resolve(__dirname, 'config.json'), 'UTF-8', function(err, data) { 

		if (err) throw err; 

		const config = JSON.parse(data); 
		
		if (config.websocket_URL) {
			
			//
			// WebSocket
			//
			
			ws_URL = config.websocket_URL;

			// Try to open connection on start :
			openWebSocketConnection();
			
		} else {
			  log(`WebSocket URL is missing in config.json`);
		}
		
		if (config.RFID_readers) {
			RFID_readers_config = config.RFID_readers;
			log('RFID readers config loaded' );
		} else {
			  log(`RFID readers config is missing in config.json`);
		}
	}); 
}
loadConfig();


//
// TCP listener
//

// Local IP address of the PC
const localIP = getLocal_IP();
if (localIP !== "NOT_FOUND") {
    tcpHost = localIP;
}

log('Server IP address ' + tcpHost);
log('Launch server listening on port ' + tcpPort);

const tcpSocket = net.createServer((socket) => {

  log('client connected');

  socket.on("data", (data) => {

    const tag_data = data.toString('hex');
    const tag_ID = getTagIdFromTagData(tag_data);
	
	const RFID_reader_IP_address = socket.remoteAddress;
	const RFID_reader_entry_point = getRFIDReaderConfig(RFID_reader_IP_address);
	
    log(`Received data : ${tag_ID}`);	


    // Notification to WebSocket server :	
	sendMessageToWebSocketServer({
		"tag_id" : tag_ID,
		"RFID_ip": RFID_reader_IP_address,
		"current_step": RFID_reader_entry_point,
		"timestamp": new Date().toISOString()
	});

  });

  socket.on('end', () => {
    log('client disconnected');
  });

  socket.on('error', (error) => {
    log(`Error: ${error.message}`);
  });

  socket.write('\r\n');

});  

tcpSocket.listen(tcpPort, tcpHost, () => {
  log('TCP server listening on port ' + tcpPort);
});

tcpSocket.on("error", (error) => {
   log(`Server Error: ${error.message}`);
});

tcpSocket.on('data', function(data) {
   log('Server captures data...');
    try {
       var obj = JSON.parse(data.toString())
       log(JSON.stringify(obj, null, 4))
    }
    catch(e) {
       var string = data.toString()
       log(string)
    }
});
