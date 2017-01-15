"use strict";

// Global Vars
var PreviousAthomsNewApps = [];
var PreviousAthomsUpdatedApps = [];
var AppLimit = 14;//8;

// Code to make https requests
function MakeHTTPSRequest(Domain, Path, ResultCallback)
{
	// Initiate https request
	var https = require('https');
	https.get(
		{
			host: Domain,
			path: Path
		},
		function(response)
		{
			// We received a response, better add some events:
				
				// This is where we will hold the total result
				var RequestResult = '';
				
				// When new data arrived:
				response.on(
					'data',
					function(data)
					{
						// Add it to the total result
						RequestResult += data;
					}
				);
				
				// And when we finish:
				response.on(
					'end',
					function()
					{
						ResultCallback(RequestResult);
					}
				);
			//
		}
	).on(
		'error',
		(error) => {
			// Request failed for some reason: Probably no internet, site is down or wrong url
			Homey.log("Something went wrong");
		}
	);
}

function HandleNewAppRequest(PreferredLanguage, OnFinish)
{
	// Make parameters optional
	if(PreferredLanguage==undefined)PreferredLanguage = "en";
	if(OnFinish==undefined)OnFinish = null;
	
	// Make new app request:
	MakeHTTPSRequest(
		"apps.athom.com",
		"/api/app?cache=true&fields=name&limit=" + AppLimit + "&order_by=created,desc&skip=0&title=New",
		function(RequestResult)
		{
			// Check if we received valid json, if not, bail to prevent crash:
			try
			{
				RequestResult = JSON.parse(RequestResult);
			}catch(err){
				Homey.log("Something went wrong");
				return;
			}
			
			// Keep track of apps that were just added, so we can prevent the update event from triggering when it's just a new app
			var NewApps = [];
			
			// Organize and compare received data
			var CurrentAthomsNewApps = [];
			
			// Walk trough received apps
			var ItemCounter = 0;
			while(ItemCounter<RequestResult.length)
			{
				// Just some var to make it all a little more readable
				var ActiveEntry = RequestResult[ItemCounter];
				
				// Validation
				if(
					(ActiveEntry["_id"] !== undefined) &&
					(ActiveEntry["name"] !== undefined)
				){
					var ActiveEntryID = ActiveEntry["_id"];
					
					// Only act on new apps if this is not the first initiating request
					if(PreviousAthomsNewApps.length)
					{
						// If it is the first time we see this:
						if(PreviousAthomsNewApps.indexOf(ActiveEntryID) == -1)
						{
							// Hah this one is new!
							NewApps.push(ActiveEntryID);
							
							// Better check if the app name is available in preferred language
							if(ActiveEntry["name"][PreferredLanguage] !== undefined)
							{
								// And name is available in preferred language!
								// Make it flow!
								Homey.manager('flow').trigger(
									'new_app',
									{
										AppName: ActiveEntry["name"][PreferredLanguage],
										AppID: ActiveEntryID
									}
								);
								Homey.log("New app (" + PreferredLanguage + "): '" + ActiveEntry["name"][PreferredLanguage] + "' (" + ActiveEntryID + ")");
							}else if(ActiveEntry["name"]["en"]){
								// According to Athom's design rules, english should always be present to fall back on.
								// Make it flow!
								Homey.manager('flow').trigger(
									'new_app',
									{
										AppName: ActiveEntry["name"]["en"],
										AppID: ActiveEntryID
									}
								);
								Homey.log("New app (en): '" + ActiveEntry["name"]["en"] + "' (" + ActiveEntryID + ")");
							}else{
								// Okay this shouldn't happen, what language is this?
								Homey.log("Que?");
							}
						}
					}
					
					// Anyway, we saw it now so push it to the array with current apps
					CurrentAthomsNewApps.push(ActiveEntryID);
				}
				// Now go check the next one if present
				ItemCounter++;
			}
			
			// Update Previous set with new set so we can see what's new next time:
			PreviousAthomsNewApps = CurrentAthomsNewApps;		
			
			// Start OnFinish Callback if present:
			if(OnFinish)OnFinish(NewApps);
		}
	);
}

function HandleUpdatedAppRequest(PreferredLanguage, OnFinish, AppsThatHaveJustBeenAdded)
{
	// Make parameters optional
	if(PreferredLanguage==undefined)PreferredLanguage = "en";
	if(OnFinish==undefined)OnFinish = null;
	
	// Make new app request:
	MakeHTTPSRequest(
		"apps.athom.com",
		"/api/app?cache=true&fields=name,version&limit=" + AppLimit + "&order_by=updated,desc&skip=0&title=Recently+Updated",
		function(RequestResult)
		{
			// Check if we received valid json, if not, bail to prevent crash:
			try
			{
				RequestResult = JSON.parse(RequestResult);
			}catch(err){
				Homey.log("Something went wrong");
				return;
			}
			
			// Organize and compare received data
			var CurrentAthomsUpdatedApps = [];
			
			// Walk trough received apps
			var ItemCounter = 0;
			while(ItemCounter<RequestResult.length)
			{
				// Just some var to make it all a little more readable
				var ActiveEntry = RequestResult[ItemCounter];
				
				// validation
				if(
					(ActiveEntry["_id"] !== undefined) &&
					(ActiveEntry["name"] !== undefined) &&
					(ActiveEntry["version"] !== undefined) &&
					(ActiveEntry["version"]["number"] !== undefined)
				){
					var ActiveEntryID = ActiveEntry["_id"];
					
					// Only act on new apps if this is not the first initiating request
					if(GetArrayKeys(PreviousAthomsUpdatedApps).length)
					{
						// If it is the first time we see this app in the update list and it's not new, or the version number changed:
						if(
							(
								(
									(PreviousAthomsUpdatedApps[ActiveEntryID] == undefined)
								) && (
									(AppsThatHaveJustBeenAdded.indexOf(ActiveEntryID) == -1)
								)
							)||(
								(
									(PreviousAthomsUpdatedApps[ActiveEntryID] != undefined)
								) && (
									(ActiveEntry["version"]["number"] != PreviousAthomsUpdatedApps[ActiveEntryID])
								)
							)
						){
							// Hah this one is updated!
							
							if(ActiveEntry["name"][PreferredLanguage] !== undefined)
							{
								// And name is available in preferred language!
								Homey.manager('flow').trigger(
									'updated_app',
									{
										AppName: ActiveEntry["name"][PreferredLanguage],
										AppID: ActiveEntryID,
										AppVersion: ActiveEntry["version"]["number"]
									}
								);
								Homey.log("Updated app (" + PreferredLanguage + "): '" + ActiveEntry["name"][PreferredLanguage] + "' (" + ActiveEntryID + ") v" + ActiveEntry["version"]["number"]);
							}else if(ActiveEntry["name"]["en"] !== undefined){
								// According to Athom's design rules, english should always be present to fall back on.
								Homey.manager('flow').trigger(
									'updated_app',
									{
										AppName: ActiveEntry["name"]["en"],
										AppID: ActiveEntryID,
										AppVersion: ActiveEntry["version"]["number"]
									}
								);
								Homey.log("Updated app (en): '" + ActiveEntry["name"]["en"] + "' (" + ActiveEntryID + ") v" + ActiveEntry["version"]["number"]);
							}else{
								// Okay this shouldn't happen, what language is this?
								Homey.log("Que?");
							}
						}
					}
					// Anyway, we saw it now so push it to the array with current apps
					CurrentAthomsUpdatedApps[ActiveEntryID] = ActiveEntry["version"]["number"];
				}
				
				// Now go check the next one if present
				ItemCounter++;
			}
			
			// Update Previous set with new set so we can see what's new next time:
			PreviousAthomsUpdatedApps = CurrentAthomsUpdatedApps;
			
			// Start OnFinish Callback if present:
			if(OnFinish)OnFinish();
		}
	);
}

function StartAthomRequests()
{
	// Get Homeys preferred language
	var PreferredLanguage = Homey.manager( 'i18n' ).getLanguage( );
	
	// Make New app request, and scedule updated app request on finish
	HandleNewAppRequest(
		PreferredLanguage,
		function(NewApps)
		{
			// New App request has finished, now make a request for updated apps,
			// but pass the list of apps we just detected as being new apps,
			// this way we can prevent false 'updated' triggers.
			HandleUpdatedAppRequest(
				PreferredLanguage,
				null,
				NewApps
			);
		}
	);
}

function GetArrayKeys(Array)
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

function init()
{
	// Setup a timed update every hour
	setInterval(
		function()
		{
			StartAthomRequests();
		},
		60 * 60 * 1000
	);
	
	// But for now run just once so we know what we already have in the store.
	StartAthomRequests();
}

module.exports.init = init;