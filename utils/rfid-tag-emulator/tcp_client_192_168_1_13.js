const net = require("net");
const { Buffer } = require('node:buffer');

const host = "192.168.1.13";
const port = 1300;

const client = net.createConnection(port, host, () => {
    console.log("Connected");

    // Trame RFID ID_CAPT :
    const tag = "02000005001d64fb170003";

    // Sends message to server/listener :
    const message = Buffer.from(tag, "hex").toString("utf-8");
    client.write(message);
});

client.on("data", (data) => {
    // Receives result from server
    const message = data.toString('hex').split('0d0a').join('');
    if (message.length) {
       console.log(`Received from server: ${message}`);
    }
    client.end();
});

client.on("error", (error) => {
    console.log(`Error: ${error.message}`);
});

client.on("close", () => {
    console.log("Connection closed");
});
