// Office assistant agent

const Agent = require('../lib/Agent')


class Lucy extends Agent {


    constructor() {

        super()
        
        this.name = "Lucy";
        this.type = "Secretary";
        this.description = "A secretary that can help you with your daily tasks";
        this.actions = ["sendEmail", "sendSMS", "scheduleMeeting", "setReminder"];
        this.skills = ["email", "sms", "calendar", "reminder"];
        this.permissions = {
            io: [
                'command',
                'talk',
                'notify',
                'message'
            ]
        }
    }

    sendEmail() {
        console.log("Sending email...");
    }

    sendSMS() {
        console.log("Sending SMS...");
    }

    scheduleMeeting() {
        console.log("Scheduling meeting...");
    }

    setReminder() {
        console.log("Setting reminder...");
    }

    getActions() {
        return this.actions;
    }

    getSkills() {
        return this.skills;
    }

    getName() {
        return this.name;
    }

    getType() {
        return this.type;
    }

    getDescription() {
        return this.description;
    }

    getAgent() {
        return {
            name: this.name,
            type: this.type,
            description: this.description,
            actions: this.actions,
            skills: this.skills
        }
    }

}


module.exports = Lucy;