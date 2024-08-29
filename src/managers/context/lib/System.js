


class System {

    #bitmaps = new Map();

    constructor(index) {
        super();

        this.index = index;
        this.device = new Device(); // os, uuid, glibc, etc
        this.location = new Location(); // timezone, country, etc
        this.network = new Network(); // ip, ssid, etc

        this.index.createBitmap('context/system', this.device.id)
        this.index.createBitmap('context/system', this.device.os)
        this.index.createBitmap('context/system', this.location.id)
        this.index.createBitmap('context/system', this.network.cidr)

    }

    tick() { }

    untick() { }




}
