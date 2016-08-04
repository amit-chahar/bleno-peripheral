//
// Require bleno peripheral library.
// https://github.com/sandeepmistry/bleno
//
var bleno = require('bleno');
var fs = require('fs');

var name = 'commService';
var commServiceUuid = '12ab';
var commCharacteristicUuid = '34cd';
var logfile_name = __dirname + '/firmware_file';

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

var first_write = true;
function write_to_file(message) {
    var buf = new Buffer(message);
    if (first_write) {
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
