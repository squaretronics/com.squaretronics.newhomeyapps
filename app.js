"use strict";

var PreviousNewApps = [];
var AppLimit = 8;

function MakeRequest()
{
	// Initiate https request to the athom new apps datafeed
	var https = require('https');
	https.get(
		{
			host: "apps.athom.com",
			path: "/api/app?cache=true&fields=name&limit=" + AppLimit + "&order_by=created,desc&skip=0&title=New"
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
						// Get Homeys preferred language
						var PreferredLanguage = Homey.manager( 'i18n' ).getLanguage( );
						
						// Check if we received valid json, if not, bail to prevent crash:
						try
						{
							RequestResult = JSON.parse(RequestResult);
						}catch(err){
							Homey.log("Something went wrong");
							return;
						}
						
						// Organize and compare received data
						var CurrentNewApps = [];
						
						// Walk trough received apps
						var ItemCounter = 0;
						while(ItemCounter<RequestResult.length)
						{
							// Just some vars to make it all a little more readable
							var ActiveEntry = RequestResult[ItemCounter];
							var ActiveEntryID = ActiveEntry["_id"];
							
							// Only act on new apps if this is not the first initiating request
							if(PreviousNewApps.length)
							{
								// If it is the first time we see this:
								if(PreviousNewApps.indexOf(ActiveEntryID) == -1)
								{
									// Hah this one is new!
									
									// Name should always be present, but better just check
									if(ActiveEntry["name"] !== undefined)
									{
										if(ActiveEntry["name"][PreferredLanguage] !== undefined)
										{
											// And name is available in preferred language!
											Homey.manager('flow').trigger(
												'new_app',
												{
													AppName: ActiveEntry["name"][PreferredLanguage]
												}
											);
										}else if(ActiveEntry["name"]["en"]){
											// According to Athom's design rules, english should always be present to fall back on.
											Homey.manager('flow').trigger(
												'new_app',
												{
													AppName: ActiveEntry["name"]["en"]
												}
											);
										}else{
											// Okay this shouldn't happen, what language is this?
											Homey.log("Que?");
										}
									}
								}
							}
							
							// Anyway, we saw it now so push it to the array with current apps
							CurrentNewApps.push(ActiveEntryID);
							
							// Now go check the next one if present
							ItemCounter++;
						}
						
						// Update Previous set with new set so we can see what's new next time:
						PreviousNewApps = CurrentNewApps;
					}
				);
			//
		}
	);
}


function init()
{
	// Setup a timed update every hour
	setInterval(
		function()
		{
			MakeRequest();
		},
		60 * 60 * 1000
	);
	
	// But for now run just once so we know what we already have in the store.
	MakeRequest();
}

module.exports.init = init;