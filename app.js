//
// Require bleno peripheral library.
// https://github.com/sandeepmistry/bleno
//
var bleno = require('bleno');
var fs = require('fs');

var name = 'commService';
var commServiceUuid = '12ab';
var commCharacteristicUuid = '34cd';
var commCharacteristicUuid2 = '56ef';
var FT_CONTROL_FVERSION_UUID = '78ab';
var FT_CONTROL_FUPACKETS_RECV_STATUS_UUID = '21ab';

var logfile_name = __dirname + '/firmware_file';
var fversion_file = __dirname + '/fversion';
var no_of_packets_recvd = 0;

function delete_file(filename) {
	fs.stat(filename, function (err, stat) {
		if (err == null) {
			fs.unlinkSync(filename);
			console.log("Old file deleted.");
		} else if (err.code == 'ENOENT') {
            // file does not exist
        } else {
        	console.log("error while deleting file: " + filename);
        }
    });
}

function write_firmware_version(value){
	fs.writeFileSync(fversion_file, value);
}

function read_existing_firmware_version(){
	var version = fs.readFileSync(fversion_file);
	console.log("current version of firmware : " + version);
	return version;
}

var first_write = true;
function write_to_file(message) {
	var buf = new Buffer(message);
	if (first_write) {
	//delete_file(logfile_name);
	fs.writeFileSync(logfile_name, buf.toString());
	first_write = false;
}
else {
	fs.appendFileSync(logfile_name, buf.toString());
}
console.log("Data received and written to log file.");
}

var service1 = new bleno.PrimaryService({
	uuid: commServiceUuid,
	characteristics: [

        // Define a new characteristic within that service
        new bleno.Characteristic({
        	value: null,
        	uuid: commCharacteristicUuid,
        	properties: ['writeWithoutResponse', 'notify', 'read', 'write'],
        	secure: ['read', 'write', 'writeWithoutResponse'],

            // Send a message back to the client with the characteristic's value
            onReadRequest: function (offset, callback) {
            	console.log("Read request received");
            	callback(this.RESULT_SUCCESS, new Buffer(
            		this.value ? this.value.toString("utf-8") : ""));
            },

            // Accept a new value for the characterstic's value
            onWriteRequest: function (data, offset, withoutResponse, callback) {
                //this.value = data;
                //console.log('Write request: value = ' + this.value.toString("utf-8"));
                write_to_file(data.toString('utf-8'));
                no_of_packets_recvd += 1;
                callback(this.RESULT_SUCCESS);
            }

        }),
        new bleno.Characteristic({
        	value: null,
        	uuid: FT_CONTROL_FVERSION_UUID,
        	properties: ['writeWithoutResponse', 'notify', 'read', 'write'],
        	secure: ['read', 'write', 'writeWithoutResponse'],

            // Send a message back to the client with the characteristic's value
            onReadRequest: function (offset, callback) {
            	var version = read_existing_firmware_version();
            	console.log("Read request received : Firmware version");
            	callback(this.RESULT_SUCCESS, new Buffer(version));
            },

            // Accept a new value for the characterstic's value
            onWriteRequest: function (data, offset, withoutResponse, callback) {
                //this.value = data;
                //console.log('Write request: value = ' + this.value.toString("utf-8"));
                write_firmware_version(data.toString('utf-8'));
                callback(this.RESULT_SUCCESS);
            }

        }),

        new bleno.Characteristic({
        	value: null,
        	uuid: FT_CONTROL_FUPACKETS_RECV_STATUS_UUID,
        	properties: ['writeWithoutResponse', 'notify', 'read', 'write'],
        	secure: ['read', 'write', 'writeWithoutResponse'],

            // Send a message back to the client with the characteristic's value
            onReadRequest: function (offset, callback) {
		//var data_to_send = no_of_packets_recvd.toString('utf-8');
		//console.log("no of packets received : " + data_to_send);
            	console.log("Read request received : FU PACKETS RECEIVED : " + no_of_packets_recvd);
            	callback(this.RESULT_SUCCESS, new Buffer(no_of_packets_recvd.toString()));
            },

            // Accept a new value for the characterstic's value
            onWriteRequest: function (data, offset, withoutResponse, callback) {
                //this.value = data;
                //console.log('Write request: value = ' + this.value.toString("utf-8"));
                callback(this.RESULT_SUCCESS);
            }

        }),

        new bleno.Characteristic({
        	value: null,
        	uuid: commCharacteristicUuid2,
        	properties: ['writeWithoutResponse', 'notify', 'read', 'write'],
        	secure: ['read', 'write', 'writeWithoutResponse'],

            // Send a message back to the client with the characteristic's value
            onReadRequest: function (offset, callback) {
            	console.log("Read request received");
            	callback(this.RESULT_SUCCESS, new Buffer(
            		this.value ? this.value.toString("utf-8") : ""));
            },

            // Accept a new value for the characterstic's value
            onWriteRequest: function (data, offset, withoutResponse, callback) {
                //this.value = data;
                //console.log('Write request: value = ' + this.value.toString("utf-8"));
                data = new Buffer(data);
                console.log("control command received : " + data.toString());
                if(data.toString('utf-8') == '5'){
                	no_of_packets_recvd = 0;
                	delete_file(logfile_name);
                }
                callback(this.RESULT_SUCCESS);
            }

        })

        ]
    })

bleno.on('stateChange', function (state) {
	if (state === 'poweredOn') {
		bleno.startAdvertising(name, [commServiceUuid], function (err) {
			if (err) {
				console.log(err);
			}
		});
	}
	else {
		bleno.stopAdvertising();
	}
});

bleno.on('accept', function (clientAddress) {
	console.log("Accepted connection from address: " + clientAddress);
});

bleno.on('disconnect', function (clientAddress) {
	console.log("Disconnected from address: " + clientAddress);
});

bleno.on('advertisingStart', function (err) {
	if (!err) {
		console.log('advertising...');
		bleno.setServices([
			service1
			]);
	}
});
