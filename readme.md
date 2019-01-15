# SG-Elites Destiny 2 Clan's Discord Bot

Discord bot that help manage raid events and newbie learning list among other things. Come say hi and see the bot in action @ [https://discordapp.com/invite/qkUuhB7](https://discordapp.com/invite/qkUuhB7).

Web directory, /web/sgelites contains source code for: [https://sgelites.com](https://sgelites.com).

Scripts directory, /scripts contains scripts to grab clan members' stats through Bungie API.

## Events

3 reaction emojis: :ok:, 🤔 and :no_entry: are displayed under each event's description.

Subscribe to an event by reacting :ok:, be added to the reserve list by reacting 🤔 and withdraw by reacting :no_entry:.

**Command list**

	!event help

**Create**

	!event create "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"

**Edit**

	!event edit 152 "13 Dec 8:30PM [EoW] Prestige teaching raid" "Newbies welcome"

**Delete**

	!event delete 152

**Add user to event**

	!event add 152 @xenodus

**Remove user from event**

	!event remove 152 @xenodus

**Add comment to sign-up entry**

	!event comment 152 Hi guys, I'm new

**Search**

	!event sotp

## Newbie Learning Interest List

Just `!sub levi/plevi/eow/sos/wish/riven/scourge comments` to be added to a list to indicate to clan sherpas you're looking to learn a certain raid.

To unsub, `!unsub levi/plevi/eow/sos/wish/riven/scourge`. If you've change your discord nickname to your Battle.net ID, you'll be automatically removed from a list once you've successfully completed a raid. The bot checks for completion every 24 hours.

**Subscribe**

	!sub levi

**Unsubscribe**

	!unsub levi


## Screenshots

**An event listing**

![Event](https://alvinyeoh.com/destiny/img/bot-event-sample.png "Event")

**Newbie learning list**

![Newbie-List](https://alvinyeoh.com/destiny/img/bot-newbie-sample.png "Newbie List")

## Authors

* [Alvin Yeoh](https://github.com/xenodus)
