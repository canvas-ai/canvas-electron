
class Device {

    constructor() {

        this.type = ''; // desktop || mobile || watch || tv || embedded || unknown
        this.id = '';
        this.meta = {
            // os: ""
            // osVersion: ""
            // network: {}
        };
        this.api = {
            // sendNotification            
            // sendEmail
            // openWindow
            // 
        };
        this.eventListeners = {
            // onNotification: []
            // onMessage: []
            // onAppOpen: []
        };

    }

}