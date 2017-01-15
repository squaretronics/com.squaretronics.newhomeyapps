# New Homey Apps for Homey
Gives you two new action cards:

	One that triggers when new Homey apps are available for download,
	and one that triggers when any Homey app in the store received an update.

Best is to create a flow that pushes the implemented Label containing the New App Name to your phone!

Only want to see if an update for a specific app occured?
Use logic to check if the 'ID' field matches your app of choice.
These ID's can be found in the address bar after you click on the app in the Athom App Store.

for example, this app's URL is:
'https://apps.athom.com/app/com.squaretronics.newhomeyapps'.
Its unique App ID is 'com.squaretronics.newhomeyapps'.

No need to donate, but if you feel like it anyway :)
[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.me/squaretronics)

## Changelog:
V1.1.0
* Prevented crash when homey does not have a working internet connection and we try to make a new app request.
* More labels! Now you can also use the unique App ID instead of the human friendly App Name.
* Added another card that checks for app updates instead of new apps. (labels for App Name, App ID and Version)

V1.0.0
* Initial Release

## Licensing:
* This application is subject to [these terms](https://raw.githubusercontent.com/squaretronics/com.squaretronics.newhomeyapps/master/LICENCE).
