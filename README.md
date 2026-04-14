# cdm-rfid-server
RFID Tag listener (node server receiving tag, ip and reporting w/ Websocket)

__ID-CAPT => [RFID-SERVER] Node tcp server => [WEB SOCKET SERVER]__

Dependencies : 'ws' node module, installed with npm

A JSON message is sent with TagID, IP address of the RFID device, and timestamp.

The server can be installed, started, uninstalled as a Windows service with qckwinsvc2 package (logs, errors).

qckwinsvc2 install name="TCP_listener" description="RFID Automatic tag listener to WS"
qckwinsvc2 start name="TCP_listener"
qckwinsvc2 uninstall name="TCP_listener"


## Testing :

In 'utils' folder, two utilities for testing :
- a basic websocket server used to test webSocket communication with Node tcp server
- a node script used to emulate tag event from ID CAPT device ( needs ip and port of the RFID server ) from another PC on the same network

__[TCP-CLIENT : TAG id] => [RFID-SERVER] Node tcp server => [WEB SOCKET SERVER]__
