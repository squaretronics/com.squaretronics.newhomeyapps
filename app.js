'use strict';

const Homey = require('homey');
const { ManagerI18n } = require('homey');
const HomeyAppApi = require('HomeyAppApi');

const trigger_app_update = "updated_app";
const trigger_new_app = "new_app";

class NewHomeyApps extends Homey.App{

    onInit(){
        this.logArray = [];
        this.preferedLanguage = ManagerI18n.getLanguage();
        this.api = new HomeyAppApi();
        this.newapplications = [];
        this.updatedapplications = [];
        
        let log = this.getLogs();
        this.newapps = [];
        this.updatedapps = [];

        if(log != null &&log !== ""){
            try{
                this.logArray = JSON.parse(log);
            }catch(error){

            }
        }

        this._intervalId = setInterval(()=>{
            this.api.retrieve().then((data)=>{
                this.checkApplication(data);
            });
        },1000 * 60);

        this.api.retrieve().then((data)=>{
            this.checkApplication(data);
        })

    }

    async checkApplication(data){

        this.handleUpdates(data.updates,this.handleNewApplications(data.new));
    }

    static GetArrayKeys(Array)
    {
        var Keys = [];
        for (var Key in Array)
        {
            if(Array.hasOwnProperty(Key))
            {
                Keys.push(Key);
            }
        }
        return Keys;
    }

    handleUpdates(data,newapplications){
        this.doLog("Start finding updated applications");
        var CurrentAthomsUpdatedApps = [];

        // Walk trough received apps
        var ItemCounter = 0;
        while(ItemCounter<data.length)
        {
            // Just some var to make it all a little more readable
            var ActiveEntry = data[ItemCounter];

            // validation
            if(
                (ActiveEntry["_id"] !== undefined) &&
                (ActiveEntry["name"] !== undefined) &&
                (ActiveEntry["version"] !== undefined) &&
                (ActiveEntry["version"]["number"] !== undefined)
            ){
                var ActiveEntryID = ActiveEntry["_id"];

                // Only act on new apps if this is not the first initiating request
                if(NewHomeyApps.GetArrayKeys(this.updatedapplications).length)
                {
                    // If it is the first time we see this app in the update list and it's not new, or the version number changed:
                    if(
                        (
                            (
                                (this.updatedapplications[ActiveEntryID] === undefined)
                            ) && (
                                (newapplications.indexOf(ActiveEntryID) === -1)
                            )
                        )||(
                            (
                                (this.updatedapplications[ActiveEntryID] !== undefined)
                            ) && (
                                (ActiveEntry["version"]["number"] !== this.updatedapplications[ActiveEntryID])
                            )
                        )
                    ){
                        // Hah this one is updated!
                        this.doLog("An app has been updated. Lets trigger");
                        let token = {};
                        token.AppID = ActiveEntryID;
                        token.AppName = ActiveEntry["name"][this.preferedLanguage] ?ActiveEntryID["name"][this.preferedLanguage] : ActiveEntryID["name"]["en"];
                        token.AppVersion = ActiveEntry["version"]["number"];

                        this.doLog("Updated app (" + this.preferedLanguage + "): '" + ActiveEntry["name"][this.preferedLanguage] + "' (" + ActiveEntryID + ")");
                        let updateTrigger = new Homey.FlowCardTrigger(trigger_app_update);
                        updateTrigger.register().trigger(token).catch(this.error).then(this.log);
                    }else{
                        this.doLog("No changes found");
                    }
                }
                // Anyway, we saw it now so push it to the array with current apps
                CurrentAthomsUpdatedApps[ActiveEntryID] = ActiveEntry["version"]["number"];
            }

            // Now go check the next one if present
            ItemCounter++;
        }

        // Update Previous set with new set so we can see what's new next time:
        this.updatedapplications = CurrentAthomsUpdatedApps;

        // Start OnFinish Callback if present:

    }

    handleNewApplications(data){
        // Organize and compare received data
        this.doLog("Start finding new applications");
        var CurrentAthomsNewApps = [];

        // Walk trough received apps
        var ItemCounter = 0;
        while(ItemCounter<data.length)
        {

            // Just some var to make it all a little more readable
            var ActiveEntry = data[ItemCounter];

            // Validation
            if(
                (ActiveEntry["_id"] !== undefined) &&
                (ActiveEntry["name"] !== undefined)
            ){
                var ActiveEntryID = ActiveEntry["_id"];

                // Only act on new apps if this is not the first initiating request
                if(this.newapplications.length)
                {
                    // If it is the first time we see this:
                    if(this.newapplications.indexOf(ActiveEntryID) === -1)
                    {
                        // Hah this one is new!
                        this.newapplications.push(ActiveEntryID);

                        // Better check if the app name is available in preferred language

                        let token = {};
                        token.AppID = ActiveEntryID;
                        token.AppName = ActiveEntry["name"][this.preferedLanguage] ? ActiveEntry["name"][this.preferedLanguage] : ActiveEntry["name"]["en"];

                        this.doLog("New app (" + this.preferedLanguage + "): '" + ActiveEntry["name"][this.preferedLanguage] + "' (" + ActiveEntryID + ")");
                        let newappTrigger = new Homey.FlowCardTrigger(trigger_new_app);
                        newappTrigger.register().trigger(token).catch(this.error).then(this.log);
                    }
                }

                // Anyway, we saw it now so push it to the array with current apps
                CurrentAthomsNewApps.push(ActiveEntryID);
            }
            // Now go check the next one if present
            ItemCounter++;
        }

        // Update Previous set with new set so we can see what's new next time:
        this.newapplications = CurrentAthomsNewApps;

    }

    getLogs() {
        return this.logArray;
    }

    doLog(msg){
        let date = new Date();
        let line = date.toLocaleString()+": "+msg;
        if(msg instanceof Object){
            line = date.toLocaleString()+": "+JSON.stringify(msg);
        }

        this.log(line);
        this.logArray.push(line);
        if(this.logArray.length > 500){ // only persist 500 lines
            this.logArray.shift();
        }
    }
}

module.exports = NewHomeyApps;