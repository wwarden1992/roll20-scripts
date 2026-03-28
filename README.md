This repo contains all the scripts I wrote for the campaign I ran (excluding ad-hoc files made for certain maps or puzzles).

Here is an explanation of all the files I wrote and the important functions if you want to build off it. You will see references to "Roll20 Objects" throughout this document. Please note that this refers to a specific type of structure as outlined in this webpage: https://wiki.roll20.net/API:Objects

## GENERAL CONSIDERATIONS:
I use bar3_value (the circle that's red by default) for HP, bar2_value (the circle that's blue by default) for temp HP, and bar1_value (the circle that's green by default) for AC. If you have bar4_value enabled in your settings (the circle that's yellow be default), I use that for speed.
If you don't use the same bars(/circles) for your values, then your mileage with these scripts will vary wildly.

## **AOEHAZARDS.JS**
This file allows you to create AOE hazards in your own JS files, specifying shapes, sizes, trigger conditions, and specific effects for them. Spells that generate AOE hazards (e.g. Grease, Moonbeam, etc.) make use of the methods in this class.
Hazard information gets stored as JSON in a document called "Hazard Tracker", which you can access from the "Journal" tab on the righthand menu in your Roll20 campaign. If this document does not exist, it will be created automatically as soon as we need to store hazard information. This file serves as "memory" so the AoE hazards will continue to be observed by the scripts following a restart (often due to inactivity, a crash, or you're pushing your own changes). I think it's still a bit finnicky at times, but it's pretty good about updating records when AoEs are created, moved, or destroyed.
AoE hazard sources are either a specific token (such as in the case of a moonbeam or a cloud of daggers), an aura around a token (such as in the case of spirit guardians), or a path object (such as what we use for fog cloud). To create your own AoE hazard programmatically, it is STRONGLY recommended you use the following method:

**createAoeHazard(obj, shape, triggers, params, callback, exitCallback, storeInMemory)**
- obj (Roll20 Object)- The Roll20 Object that is the source of the AoE. This can be a graphic, or a pathv2
- shape (string)- Acceptable values are "circle", "cone", and "rectangle". Shapes other than this (e.g. if you drew a random polygon) are not supported
- triggers (string array)- the conditions where the string effects are triggered. It is recommended that you use the consts defined at the top of this file as values for the array rather than hardcoding the strings yourself. The consts are listed as follows: 
  - START_OF_TURN (trigger if a token is within the AoE at the start of its turn)
  - ENTERS_AREA (trigger when the token enters the AoE on the first time during its turn; prevents triggering from involuntary movement, and prevents you from pinging yourself 'playing the hokey pokey' with the AoE)
  - END_OF_TURN (triger if the token is within the AoE at the end of its turn)
  - TRAP (trigger any time a token moves within the AoE, regardless of turn. Useful for when players move their tokens around a dungeon map outside of initiative
  - ON_CAST (trigger as the AoE comes into existence)
  - HAZARD_MOVED (trigger if the AoE is moved. good for something like ramming a creature with a flaming sphere)
- params (object) - typically if you're creating the AoE as part of a spell, you'll be able to just get away with using the 'params' that are already kind of baked into the spell script's architecture. It's smart enough to infer the values you need. Otherwise, your params object should look like this:
  { 
    "caster": The name of the token who's spell or ability created the AoE hazard (can be omitted if not applicable),
    "dc": The DC for a saving throw prompted by this AoE when triggered (can be omitted if not applicable),
    "level": The level of the spell cast that created this AoE, used for things like scaling damage effects (can be omitted if not applicable)
  }
- callback (function)- A function that specifies what happens when the AoE gets triggered.
- exitCallback (function, optional)- A function that gets called whenever a creature exits the AoE. Most AoEs do not need an exitCallback, but for some exceptions like Silence where we would want to remove a marker denoting it's silenced/deafened status, it's helpful.
- storeInMemory (boolean, optional)- if you don't want the AoE hazard to be remembered by the Hazard Tracker doc, set this to false. Otherwise it's assumed to be true. Useful to set false when you've scripted traps into your map, and you don't want to create duplicates each time you restart the scripts.

## **CHANGEMAP.JS**
Provides the ability for players to manually change the map they view. No macro has been provided, but anyone can type "!changemap (name of map)", and as long as a map of that name exists, the person who typed it will view that map. When that player is done, they can type "!changemap Rejoin Group" and they will be moved back to the map that the party is on.
It probably would not be too great an effort to write a function with another command where you print a list of buttons in chat so you could provide a list of specific map options (and 'Rejoin Group') for players to choose from. If someone wants to add a function like that and a placeholder array for you to name maps (or better yet, read from a campaign document with JSON so you can configure without having to restart scripts), that would be awesome

## **CHARACTERS.JS**
This contains methods for parsing information from character sheets in the campaign. 2024 character sheets here might perhaps be more appropriately labeled Jumpgate character sheets? Whatever the new style of character sheets is, it's a heck of a lot harder to parse out information from them now, so a lot of the methods are kind of hard to decipher. Honestly, a lot of the 2024 stuff probably isn't perfect either! 
Things you should know as a user:
- There's a var called "inactiveCharacterList". If there's any character sheets in the campaign for characters that are inactive, listing them here helps filter them out in functions where we only care about the active characters. For example, when we autopopulate a map with character tokens, we'll ignore characters from the inactiveCharacterList. Similarly, when we're trying to do gold tracking, we won't track gold for inactive characters.
- There's another var called "pets". If you maintain character sheets for your familiar, homunculi, stray NPCs, etc, adding them to the pets list will help us know that these aren't your actual characters. We'll still make tokens for them when creating a new map, but we know that we probably don't care about them for other things like gold tracking, looking up a player's active character's stats, etc.
- Aside from that, most of this stuff is just there to help with auto-creating tokens for your characters, figuring out your attack modifiers and DCs, etc. There's stuff that can check for your abilities and proficiencies, but most players don't want the machine auto-rolling for them, so it's debatable how useful it is.
In general, if you're trying to make new stuff, the most useful function to know is the following:

**getAttribute(character, attrName, valueType)**
- character (string)- The name of the character as it appears on the character sheet
- attrName (string)- The stat you want to look up information about
  - can be an ability score like "strength", "intelligence", etc.
  - if you want the modifier instead of the raw ability score, use "strength_mod", "intelligence_mod", etc.
  - if you want the save modifier, use "strength_save_bonus", etc.
  - for skills, use "perception_bonus", "animal_handling_bonus", etc.
  - other: "hp", "ac", "pb", "spellcasting_ability", "spell_save_dc", "spell_attack_bonus", "level"
- valueType (string, optional) - you can provide a value of "max" for this if you want to get an HP max instead of current HP from the character sheet.

## **ENEMY.JS**
This handles a lot of the automation for enemies built from the data provided by enemytemplates.js. Whenever you drag and drop a token onto the map, if the image source for that token matches something in enemytemplates.js, this function will automatically create an enemy entity for that object and assign it all the stats you'd normally want to see on that enemy.
If you cast a spell that requires a saving throw and the enemy is hit by it, it'll automatically roll the saving throw for you, factoring in any sort of advantage, disadvantage, auto-succeeds, auto-fails, bonuses, penalties, etc. based on markers on the token, or intrinsic properties of the enemy as defined in enemytemplates.js
It will make concentration checks for you when the enemy is damaged (again, assuming data is provided in enemytemplates.js), and can handle rolling initiative for all your enemies at once.
There's also some rudimentary behavior functions if you want to program your enemies to take their turns automatically in enemytemplates, but generally, I find programming auto-turns to be more trouble than it's worth, unless you have a large number of tokens with very simple behaviors:

**rollToRecharge()**- By default, it'll assume that you roll a d6 to recharge, and recharge happens only on 6. If it's different for your enemy, then specify in enemytemplates different values for rechargeDie and rechargeNumber (see enemytemplates.js for more info).
**approachPlayer()**- Moves towards the closest player-controlled token up to its movement speed. If the enemy has movement penalties or is unable to move, those conditions are respected. prints in chat who it's moving towards. NOTE: There is a bug where certain map ui elements might be picked up as viable targets for enemies. It's an easy fix, but one I never made because I had kind of moved away from programming auto-turns when they were added. If someone wants to be my friend and patch it, that would be awesome.
**basicAttack(target, overrideAttackMod, overrideDamage, overrideDamageType, overrideSecondaryDamage, overrideSecondaryDamageType, callbackFn)**- attacks the target using enemy stat info or override values provided. Factors in conditions that would help/hinder its ability to attack based on markers on both the attacker and the target.
 - target (string)- the name of the token you're attacking
 - overrideAttackMod (number, optional)- if you don't want to use the attack modifier calculated from the enemy attack's ability score + pb + other assigned bonuses, you can specify a value here as an override
 - overrideDamage (string, optional)- if you want to specify an amount of damage for the attack other than what's assigned in enemytemplates, you can provide a value here as an override. You can use a flat number, or you can use "XdY+Z" format.
 - overrideDamageType (string, optional), if you want to specify an alternative damage type from what's specified in enemytemplates (e.g. 'cold' instead of 'bludgeoning'), you can do that here. Note that if you are doing non-magical bludgeoning, piercing, or slashing, put "nm" before the damage type to mark it as non-magical (e.g. 'nmbludgeoning')
 - overrideSecondaryDamage (string, optional)- same as overrideDamage, but if your attack does 2 different damage types, this is how you override the secondary one
 - overrideSecondaryDamageType (string, optional)- same as overrideDamageType, but if your attack does 2 different damage types, this is how you override the secondary one
 - callbackFn (function, optional)- if hitting the target with an attack applies some kind of effect to the target (e.g. maybe you need to mark the target, or the target has to make a saving throw), you can add a function name as an argument here to make the program prompt the player to do whatever's necessary. You don't need to worry about prompting concentration checks this way; hp.js auto-handles all concentration check prompts by reading hp changes.

## **ENEMYTEMPLATES.JS**
This is where you define stats and stuff for the enemies. It's all stored in one large JSON object. If you're not much of a coder but want to reap the benefits of a lot of automation for new enemy types, you'll need to understand how this works. Pretty much start by going to the bottom of the document, and paste this in after the final existing enemy template, but before the final '}':
,  'NEW_ENEMY': {
        'name': '',
        'type': '',
        'img': '',
        'hp': ,
        'ac': ,
        'str': ,
        'dex': ,
        'con': ,
        'int': ,
        'wis': ,
        'cha': ,
        'speed': 30,
        'proficiency_bonus': ,
        'width': 70,
        'height': 70,
        'gmnotes': '', 
        'immunities': [],
        'resistances': [],
    }
<img width="1650" height="799" alt="image" src="https://github.com/user-attachments/assets/7f71fb50-25d1-47ae-b899-f87c1bc543c1" />

- Replace the text 'NEW_ENEMY' with some unique value. Doesn't even have to be the name of your enemy. Just some unique identifier.

- In the 'name' field, put down the name you want to appear on your tokens.

- For type, specify a value like 'humanoid', 'construct', 'undead', etc. This gets used by spells that care about that type (e.g. Hold Person)

- For img, you want to extract the image source from an actual token. Using the Get-Imgsrc macro is very helpful for this (see macros.txt). In the example below, I choose the token "Centurion 1" when executing this macro
<img width="481" height="368" alt="image" src="https://github.com/user-attachments/assets/8ea458fc-b8cd-431d-92de-2dc2b0a07012" />

I check my output in the script logs, and see my output there
<img width="808" height="363" alt="image" src="https://github.com/user-attachments/assets/8cd9530c-ec1d-478d-a73c-7016d0f91044" />

  My img value is everything after the "https://files.d20.io/images/" (i.e. "472786318/iE3ZshT44M4ZCl8efdBPHA/max.png?1769199801")

- For all the stats 'hp' through 'proficiency_bonus', those should be self-explanatory. Look them up from the enemy statblock (or your own brain if your inventing it on the fly), and copy them here.
  
- For 'width' and 'height', values of 70 basically means the enemy is size 'medium'. Make it '35' each for small, '17.5' for tiny, '140' for large, '210' for huge, and '280' for gargantuan. The reason I've made it require numbers instead of just doing 'size': 'medium' is just in case you want to do something weird and not have your enemy's size fit neatly into one of the prescribed boxes

- For 'gmnotes', this is just if you want something to appear on the 'gmnotes' section of the token. I personally find it helpful to have a link to the stat sheet. So for my centurion where I homebrewed a stat sheet on dndbeyond, I might put 'https://www.dndbeyond.com/monsters/6143911-agrimanian-centurion', so I see this when I double-click the enemy
<img width="534" height="315" alt="image" src="https://github.com/user-attachments/assets/b052a23a-89b3-43fc-bcf7-3600860db310" />

- For 'immunities' and 'resistances', you can add a list of damage types or conditions that they're resistant to. So if I have an enemy that resists cold damage, necrotic damage, and effects that charm it, I might put \["cold", "necrotic", "charmed"\] for my 'resistances'. Similar for 'immunities' as well. If there's vulnerabilities, you can add 'vulnerabilities': \[(whatever values you want)\] to the JSON as well! Please note that each value you add to the array (space between the \[\]) MUST have single or double quotes around it, and commas separating each item.

- Other keys (stat types) you can add:
  - 'group_size': if you have a whole bunch of enemies of the same type, it might be tedious to have to track individual initiatives for all of them. If you specify a number for this stat, it'll have the enemies act in groups of that size on initiative. For example, if I have 30 zombies, I might specify a group_size of 5. Then zombies 1-5 act on the same initiative, 6-10 go together, and so on.
  - 'attack_stat': give it some value like 'str', 'dex', etc, and if you program your enemy to attack or use a macro for it, it'll use the stats you defined to calculate attack modifier and flat damage bonus
  - 'damage_die': if you are having the enemy attack programmatically or via macro, this specifies the main damage type that's done via the attack. it can be a flat number or it can be an "XdY" string. If there is a flat damage component in your attack damage, please omit it; it will be autocalculated from 'attack_stat' and the value of the corresponding stat
  - 'damage_type': specifies the type of damage done (e.g. 'cold', 'necrotic', etc.) If the damage type is non magical, please put "nm" before the damage type to indicate that (e.g. 'nmbludgeoning')
  - 'secondary_damage_die' and 'secondary_damage_type': same as 'damage_die' and 'damage_type', but for the secondary type of damage an attack deals. For example, an ankheg deals slashing and acid damage, so I use the secondary vals for the acid component of the damage
  - 'reach': you can provide a number (in feet) to expand the range of your enemy's attacks. Used when calculating if an enemy is within melee attack range.
  - 'initiative_bonus': if your enemy has alert or something else that gives it a bonus to initiative rolls beyond its dex modifier, you can add that bonus as a number here.
  - 'proficient_saves': specify an array like \['con', 'str'\] to list the saving throws the enemy has proficiency in, and the bonus will automatically be applied for those types of saving throws
  - 'casterLevel': if your enemy casts cantrips and you need to calculate cantrip scaling for them, this parameter basically means 'scale the cantrip as though they were this level'
  - 'rechargeDie': if you want to automate rolling for ability recharges, you can specify a value like '1d6', '1d10', etc, and that's what'll be used when you call rollToRecharge() for the enemy (see enemy.js)
  - 'rechargeNumber': if you want to automate rolling for ability recharges, you can specify a value like '4', and that's what the enemy will have to meet or beat when you call rollToRecharge() for the enemy (see enemy.js)
  - 'rechargeAbilityReady': give it a value of true or false. This is used mostly to track whether the enemy has its recharge ability available. Set it to true if it comes into combat with the ability ready, otherwise set it to false.
  - 'magicResistance': add this with a value of true if you want your enemy to have magic resistance (advantage on saving throws against spells and other magical effects)
  - 'startOfTurnTrait': specify a function here to define a behavior you want the enemy to impose on others at the start of the other token's turn. The function is expected to be defined with arguments (me, token), where 'me' is the enemy, and 'token' is the creature starting its turn.
  Example: I have an alkilith, and I want players within to make a wisdom saving throw to resist its "Foment Madness". It's a 30 foot range, and requires a DC 18 wisdom save. I then write the following. turns.js will then take care of calling this function for me at the top of each creature's turn, printing a message if the creature is close enough to the alkilith
  <img width="1065" height="149" alt="image" src="https://github.com/user-attachments/assets/5ff0ac6e-6b21-4da4-88e7-61b3bc646609" />

  - 'endOfTurnTrait': same as startOfTurnTrait, but when the trigger is the end of a token's turn instead of the start.
  - 'startOfTurn': if this creature does something at the start of its turn, then I write a function to define it here. The function has no arguments. In the example below, I have an enemy who regains 2d10 hitpoints at the start of each of its turns. I wrote the following to do that
  <img width="850" height="137" alt="image" src="https://github.com/user-attachments/assets/e472a1f1-9d24-4ee0-9c1b-8ffab683ff5e" />

  - 'endOfTurn': if the creature does something at the end of its turn, then I write a function to define it here. The function has no arguments. In this example below, I just made a simple function reminding players (and myself) the enemy gets its legendary actions back. 
  <img width="558" height="50" alt="image" src="https://github.com/user-attachments/assets/de2b05c8-c74b-43a3-a10c-e05f9b7ffc37" />

  - 'onLethalDamage': if the creature has some effect when it hits 0 HP, the function you define here gets called. The function can have up to two args, 'me' (which is the enemy itself), and 'dmgParams' (which is whatever info about the triggering damage you collect and pass in). I really just used it for zombies who might stabilize with some HP if they aren't hit by a crit or radiant damage. Example below
  <img width="797" height="276" alt="image" src="https://github.com/user-attachments/assets/8889fb41-f73c-4d24-92c8-9c064c60691e" />

  - 'attackBonus' and 'damageBonus': if you want to specify extra bonuses to the enemy's damage when you attack programmatically or via macro, (e.g. maybe the enemy has a +1 sword) you can add it in here.
  - 'attackSound': if you want a sound effect to play when the enemy attacks, you can specify the name of the sound file you've uploaded to this game in roll20, and it'll play it when you attack programmatically or via macro
  - 'attackFx': if you want an effect to appear on the token the enemy attacks when you attack programmatically or via macro, you can specify the type here. For info on effects, visit https://wiki.roll20.net/Fx_Tool
  - 'turnFunction': if you want to automate your enemy's turns entirely, you can do that by specifying a function here. The function has one param of 'me', which refers to the enemy token itself. I wouldn't recommend doing this unless the enemy follows very simplistic behavior. For example, here's what I wrote for an ankheg to move towards the closest PC, attack them, and apply grapple on a hit
  <img width="1152" height="217" alt="image" src="https://github.com/user-attachments/assets/24b3e762-72c7-48c4-ad1e-1b4d075d93c5" />

  - 'disableAutoTurn': when you realize that the turnFunction is giving you too much trouble but you don't want to delete your work, add this and set it to true, and it won't do the behavior specified in 'turnFunction'
  - 'receivesAdvFunction': if a target conditionally gains advantage on attacks against an enemy token, you can specify a function here to evaluate that. There's two arguments you can provide to it, 'me' (referring to the enemy itself), and 'token' (referring to the target in question). Here's an example for an ankheg, which gets advantage against targets it has grappled
  <img width="1120" height="40" alt="image" src="https://github.com/user-attachments/assets/eff0e87f-2349-428a-b3f6-909bac8dc8c9" />

  - 'blindsight', 'truesight', 'tremorsense': you can specify these and give them values of true. Right now, it just checks to see if it's fooled by Mirror Image. It doesn't, for example, check if it's fooled by invisibility, or if a creature with tremorsight can see a flying creature, or anything like that. Possible fixes for later
  
## **FORTUNETOKENS.JS**
If you want to play with fortune tokens, this provides a means to do that. Interact with it through the SPEND-FORTUNE-TOKEN and SPEND-MISFORTUNE-TOKEN macros outlined in macros.txt. One thing I'll note, there's a const pretty early on in the file called 'totalTokens', and that's the sum of fortune/misfortune tokens in play at any given time. Traditionally, this should be set to the number of active players in the campaign, so you may want to raise or lower it (probably lower it) according to how many players there are in your campaign.
The quantity of fortune tokens is maintained in a document called "Fortune Token Tracking" (it gets created if it doesn't currently exist). This is used so the system can "remember" the balance of fortune tokens after a script reset, and also to reset the fortune tokens to the starting balance if it's the next session (i.e. hasn't been updated in 24 hours)
NOTE: I've tricked myself into thinking the fortune/misfortune tokens aren't working, by spending a misfortune token while looking at a different map. Please note that when you spend a fortune token, it only updates on the map the party is on, and won't update on other maps until that other map becomes the party map.

## **GEOMETRY.JS**
Abandon all hope ye who enter here. This contains the logic for detecting whether enemies fall within a certain AOE range, and it is messy and hard to read. But it works.
Notes about checking if an enemy exists within an AoE: it assumes that tokens are square, and even the tiniest bit of overlap is enough to declare a hit. If you'd rather the tokens be treated as circles within the grid square(s) they occupy, set the var somewhere within this file called 'allowAnyOverlap' to false.
The functions within here that you might want to use elsewhere are thankfully few:

**drawShape(playerid, shape, length, width, type, color, fill)**
- playerid (string, DEPRECATED)- don't worry about putting a value here. The program overwrites it to 'all'
- shape (string)- acceptable values are "cone", "square", "circle", or "line" (which actually draws a rectangle)
- length (number)- Whatever value (in feet) a spell or ability description would give, that's what you want to provide. For a sphere or cylinder with a 20 foot radius, use 20. For a 15 foot cone, use 15. For a 30 foot cube, use 30. And so on
- width (number)- optional for all shapes except "line". Gives the width of a rectangle. If you're drawing this shape for an ability that travels in a line but doesn't have a specified width (e.g. catapult), I just like to use something small for this value like 1
- type (string, optional)- if you're using this to measure something other than an aoe for a spell or ability, put some value here (not 'aoe'). Otherwise, it'll assume the object being drawn is going to be used for spell cast and will make a microadjustment to the line thickness to signal it can be used by a spell. 
- color (string, optional)- gives the color of the line drawing the shape. Use "#RRGGBB" format. If no value is provided, "#123456" is used (looks kinda dark blue)
- fill (string, optional)- fills in the shape with the given color. Use "#RRGGBB" format. If no value is provided, the shape is not filled in (e.g. transparent fill)

**liesWithinCircle(circle, target)**
- circle (object)- an object that represents all the information we need about the circle. The values needed are as follows
  - x (number) - the x-coordinate of the circle's center
  - y (number) - the y-coordinate of the circle's center
  - r (number) - the circle's radius (in px)
- target (string or object)- the name of the token (or the token itself) we're checking to see if it's within the circle

**liesWithinCone(cone, target, caster)**
- cone (object)- an object that represents all the information we need about the cone. The values needed are as follows
  - x (number) - the x-coordinate of the cone's origin
  - y (number) - the y-coordinate of the cone's origin
  - r (number) - the cone's length (in px)
  - angle (number) - the angle of line bisecting the cone reckoned by the unit circle (in radians)
- target (string or object)- the name of the token (or the token itself) we're checking to see if it's within the cone
- caster (string or object)- the name of the caster, or the caster's token itself. Sometimes it can be a bit murky whether the caster is within their own cone, so if you want to make sure the caster is never within a cone of their own creation, you can specify its name here

**liesWithinRectangle(rectangle, target)** (good for squares too)
- rectangle (object)- an object that represents all the information we need about the rectangle. The values needed are as follows
  - x1, x2, x3, x4 (numbers)- the x-coordinates of the corners of the rectangle
  - y1, y2, y3, y4 (numbers)- the y-coordinates of the corners of the rectangle. x1 goes with y1, x2 goes with y2, and so on...
 
## **GOLDTRACKER.JS**
Puts a gold tracker at the top-left corner of the map, and tracks how much money each player has in a place everyone can easily see. If everyone is tracking their gold in something like a google sheet, maybe this doesn't have a ton of use, and possibly would even be annoying for covering part of the map, but it's nice to have this quick reference available in many cases.
You'll want players to update their gold total by using the "Update Money" macro (see macros.txt). This script handles requests from that. Behind the scenes though, the money data is being stored in a file called "Gold Tracking" (which this script will create if it doesn't exist).
Something I considered putting in was a way to quickly divide gold amongst all players and update their totals, but that never came to pass. That's another useful function you could add.

## **HP.JS**
This script put messages into chat whenever a token takes damage/receives healing. If you deduct hp from the HP box (bar3_value) while there's still HP in the temp HP box (bar2_value), it'll automatically correct it for you so you're burning through temp HP first. Some players like to things like "(+#)" in their HP totals when they're trying to find a way to keep it clear that their max HP is currently boosted by spells like Aid, and this file can kind of work around some of the more predictable cases, but isn't perfect.
This file also handles prompting for concentration checks, will announce when targets are bloodied, and announce when they are dead/unconscious (applying appropriate markers too).
Will distribute damage dealt across targets with paired Warding Bond markers, will remove the 'armorOfAgathys' marker if it's present and temp HP goes to 0, and will prevent attempts to heal a token if the 'chilltouch' marker is present on it.

## **MACROS.TXT**
Contains a list of all the macros I used. Read it and add them to your campaign if you're using these scripts. Sorry you have to do it manually.

## **MARKERS.JS**
The markers.js file uses some of the roll20 default markers (e.g. those whose names are just colors), but by-and-large depends on the addition of your own custom marker set. I use BG3's spell icons as art for a lot of my custom markers, but I don't know if I'm legally allowed to add them here, and I'm waiting for a response from their support team on that. But yeah... add your own custom markers to your own custom marker set, and tie it to the campaign where you're using these scripts.
Marker definitions are stored in a var within this file called "markers", and the constructor for them looks like this:

**constructor(name, marker, savingThrowStat, startOfTurnCallback, endOfTurnCallback, onRemoval, autoBadge)**
 - name (string)- the friendly name of the marker, though for some reason I've decided to use camel case for mine. When you do a marker lookup (see macros.txt), the name here gets pretty-printed.
 - marker (string)- the name of the marker as it appears in the marker set. That is, it matches the name of the file you uploaded (minus the extension)
 - savingThrowStat (string, optional)- give it a value that's one of the common 3-letter abbreviations for ability scores (e.g. 'wis'). If the marker implies a saving throw that needs to be made on a regular basis, this is the type of saving throw that gets made
 - startOfTurnCallback (function, optional)- if the marker means something should happen to the marked token on the start of its turn, this function defines that behavior. For example, Searing Smite deals 1d6 to a target on the start of each of its turns. Here is the callback used for it
 <img width="799" height="209" alt="image" src="https://github.com/user-attachments/assets/1166a00a-e3e1-43c1-b946-8b5f0fe3bf81" />

 - endOfTurnCallback (function, optional)- if the if the marker means something should happen to the marked token on the end of its turn, this function defines that behavior. For example, Tasha's Hideous Laughter has the player make a wisdom save at the end of their turn to end the effect. its endOfTurnCallback looks like this
 <img width="760" height="222" alt="image" src="https://github.com/user-attachments/assets/37553c21-152b-4cb9-9a7b-a51ba224c3fb" />

 - onRemoval (function, optional)- if you want something to happen when the marker is removed from the token, you can specify it here. For example, when we remove the "Enlarge" marker for Enlarge/Reduce, we want to shrink the token down. This function does that
 <img width="803" height="181" alt="image" src="https://github.com/user-attachments/assets/21e1dd05-4e2b-43d4-ae3d-9f33ac31b31f" />

 - autoBadge (string, optional)- if you add markers manually, you can't really put a badge on them (at least of 3/27/26). But if you want the same badge to appear every time, you can specify it here, and when the code detects the addition of a marker to a token, it'll apply this badge. For example, the Bardic Inspiration marker has the autoBadge 'Bardic' (because people kept missing the marker). Now I just click this:
<img width="305" height="239" alt="image" src="https://github.com/user-attachments/assets/04ec1872-f94c-4ea4-b618-9dbfe5ad1a10" />
And the marker shows this:
<img width="247" height="210" alt="image" src="https://github.com/user-attachments/assets/bd7d8df3-58a1-4db1-8391-7cad94160934" />

The only thing you really want to add to this file are definitions for new markers, and any sort of callback functions (including onRemoval functions). Marker information is stored in a file called "Marker Tracker", which gets created automatically if one doesn't exist. This serves two functions. First, if you restart the scripts, the sandbox can "remember" what markers exist and what effects are tied to them. Second, it can link the marker to some other entity and let removing the marker remove some other related entity. For example, if you remove the concentration marker on a token that's concentrating on Moonbeam, the moonbeam AoE object goes away. Or if you're concentrating on Haste and drop concentration, the haste marker goes away on the token who had it. I will say, sometimes the marker tracking is a bit finnicky and doesn't work right 100% of the time. Sometimes it seems like old trackers that we don't need anymore persist longer than they're supposed to. If you need to just wipe out all markers and start fresh, type "!clearmarkers" in chat.
Sometimes an effect might try to put multiple markers on a token at the same time, or might try to add a marker and remove another one at the same time, and trying to make both these changes at the same time can cause them to step on each other/overwrite each other. Consequently, the markers.js class handles programmatic requests to update markers with a queue.
Aside from that here's some methods that are good to know:

**addTokenStatusMarker(name, type, badge, links, expiration)**
The 'true' name of the addMarker function, but it's wordy. I'd probably recommend just using "addMarker" for this function going forward.

**addMarker(name, type, badge, links, expiration)**
- name (string)- the name of the token receiving the marker
- type (string)- the type of marker being applied to the token. You can use either the friendly name or the literal name of the marker here (first or second arg of the Marker constructor), it'll take either.
- badge (string, optional)- if you want a badge to appear on the marker, this is where you define it
- links (object array or single object, optional)- if this marker is connected in some way to some other marker, object, or aura, this provides the id of the Roll20 object. Below defines the fields that go into a link JSON object:
    - 'id' (string)- value which is the id of the roll20 object which is logically connected to this marker. This can be the thing a connected marker is on, a summoned token, or a token that gets an aura because of this marker
    - 'isSummon' (boolean, optional)- if the roll20 object linked to this marker is a summon of some kind (be it a creature like a mephit, or an AoE hazard like a Cloud of Daggers), set this to true
    - 'isAura1' (boolean, optional)- if the thing linked to this marker is an aura on the token, and is Aura 1, set this to true
    - 'isAura2' (boolean, optional)- if the thing linked to this marker is an aura on the token, and is Aura 2, set this to true
    - 'marker' (string, optional)- the name of the marker that's logically tied to this marker. For example, if typing a haste marker to a concentration marker, the value for this thing is 'haste'
- expiration (object, optional)- lets you specify a condition for the marker to expire automatically, so you don't have to remove it manually. For example, if you hit a target with a guiding bolt, we put a marker on it indicating that the next attack against it has advantage. We give it a condition to expire at the end of the caster's next turn if it still exists by then. Expiration times are regulated through turns.js instead of markers.js. Below defines the fields that go into an expiration JSON object:
    - 'id' (string) - the id of the Roll20 object the duration is defined in reference to
    - 'duration' (string) - the condition upon which the marker expires relative to the object specified by the 'id' field. Accepted values are 'startOfTurn' (start of id's turn), 'endOfTurn' (end of id's turn), and 'endOfNextTurn' (end of id's next turn).
  
**concentrate(name, badge, duration, links)**
Basically adds a concentration marker to a token. The name, badge, and links args work the same as they do for addMarker. For the badge, you'll probably want to put the name of the spell you're concentrating on. The 'duration' field is the number of turns left in concentration, and it ticks down at the end of of the concentrater's turns (disappearing when it hits 0). It gets appended to the badge with a '/' separating it from the spell's name (e.g. "Haste/10")

**getBadge(name, marker)**
Gets the badge on a marker. 'name' is the name of the token in question, 'marker' is the type of marker (can be the friendly name or the literal name)

**hasMarker(name, marker, badge)**
checks to see if the token with the name given by the name argument has the marker given by the marker argument. 'badge' is an optional string argument if you want to check if the marker has that specific badge.

**isConcentrating(name)**
checks if the token whose name is given by 'name' is concentrating

**dropConcentration(name)**
drops concentration for the token whose name is given by 'name' (if it's concentrating)

**getMarkers(token)**
returns an array of markers that exist on the token specified by token. 'token' can either be the Roll20 token object, or it can be the name of the token.

**clearMarker(name, type, badge, bypassMarkerTracking)**
removes the marker whose name is given by 'type' from the token whose name is given by 'name'. If multiple markers of the same type but with different badges exist on a single token, the 'badge' field can be used to further narrow down which specific marker you want to remove. the 'bypassMarkerTracking' parameter is an optional boolean argument that's mostly there to handle the countdown for concentration, and really shouldn't be used without good reason. Since ticking down on concentration has to destroy and recreate the concentration marker each time, it would also inadvertently destroy any markers associated with it, and recreating those markers (and tracking) is a hassle. So this just lets us bypass that.

## **MYCUSTOMFX.JS**
Contains some fx definitions I use for certain spell effects. Once the effects are stored in your campaign's fx tool, you don't really need this file, but it's useful when building them from scratch. For information on how to create FX programmatically and display them on the page, see https://wiki.roll20.net/Fx_Tool

## **PUTPLAYERTOKENS.JS**
A handy little script that automatically creates tokens for all active characters with stats from their character sheets whenever you click that "+ Create Page" button, and places them on the map for you. Relies heavily on characters.js to get information for the tokens, and to get the list of inactive characters who shouldn't get tokens. Also creates a token called "Lair Actions" on the GM layer so that it can get added to initiative order.

## **SPELL7.JS**
The seventh iteration of my spell execution script. The script has a var called 'spellbook', where we define a list of spell objects. The spell constructor looks like this:
**constructor(name, minLevel, callback, soundFx)**
- name (string)- the name of the spell, without spaces. The name should match a key in spelltemplates.js that contains the list of params you need in order to cast that spell (see spelltemplates.js for more information)
- minLevel (number)- the lowest level the spell can be cast at. For cantrips, this value is 0
- callback (function)- the function that actually does the spell after collecting the information from the user as defined in spelltemplates.js. Each callback function you write should have a single argument of 'params' in its definition
- soundFx (string, optional)- the name of the sound from your game library that you want to play when this spell happens. If no value is provided, no sound happens.

The script is smart enough to look at the player who's using this macro, cross reference it with the list of spells on their active character's character sheet, and print filtered list of spells from 'spellbook' for them to select from. When they click on an option, they are prompted for any relevant information (e.g. who are they targetting? how much damage did they roll?), and the spell executes. Parameters such as save DC or cantrip scaling are calculated automatically from reading the character sheet.
Spells that require damage values can also auto roll damage for players if they wish, just by leaving the damage fields blank.

The following are a list of helper functions you may want to use when writing your own spell definitions and callbacks

**function rollTokenSave(target, params)**- if the spell prompts a token to roll a saving throw, use this. It'll roll saves for enemies automatically (if stats are defined in enemytemplates.js), while just prompting players to make rolls themselves
- target (string or object)- the name of the target that must roll the save, or the token representing that target.
- params (object) - your spell callbacks are always assumed to have a params object, you can just pass that in here. maybe add a couple values to it in the spell callback if necessary. but definitely use params from the callback as the basis for this argument in rollTokenSave

**halfDamage(dmg) and noDamage(dmg)**- used in functions that require saving throws and does exactly what you'd expect them to.
- dmg (number)- the damage that's being halved (or reduced to 0)

**cantripScale(caster)**- returns 1, 2, 3, or 4, based on the caster's level (returns 1 for levels 1-4, 2 for levels 5-10, 3 for levels 11-16, 4 for levels 17+)
- caster (string or object)- the name of the caster or the token representing them

**autorollIfNeeded(params, dice, paramName)**- rolls dice for the params named by paramName if needed
- params (object)- the list of parameters to check against when deciding if we need to autoroll. It's gonna be the same params that are from your spell callback's definition 99% of the time.
- dice (string)- the amount of dice you want to roll. Should be in "XdY+Z" format
- paramName (string)- the parameter within params that might need a value rolled for it. If a value already exists within params, just return that value. Otherwise, do the roll.

**circleAoe(params, radius, fxType, delay, callback)**- if your spell creates a circle AoE (e.g. fireball), this method can be used to check who's in the AoE, make them roll saves, and apply whatever effects the spell's supposed to on success/fail. Requires an AoE marker of the appropriate size and shape to be drawn, which it consums on execution (see the Draw-AoE macro in macros.txt). If one doesn't exist, it puts one on the screen for you and prompts you to place it, then fire the spell again. NOTE: before calling circleAoE in your spell callbacks, you will probably want to specify a few extra values in params. Things like 'stat' (ability score the saving throw needs), 'dmgType' (self explanatory), and onSave (function that defines what if anything should happen when a target succeeds on its saving throw).
- params (object)- again, just use the params used from your spell callback function's args.
- radius (number)- the radius of the aoe effect in feet
- fxType (string, optional)- the fx you want the spell to create. If it's one of roll20's baked-in fxs, you can just pass the simple name in. Otherwise, you have to get the actual id of the fx and pass it in. (I should've added a helper function for that. missed opportunity)
- delay (number, optional)- if you want to delay the effect by some number of milliseconds, specify the value here. By default, a 400msec delay is added because that seems to be what best syncs the audio with the video (at least for me), so a 400msec delay will always be added to whatever value you specify.
- callback (function, optional)- if something's actually supposed to happen as a result of being within this AoE, the callback you provide defines the behavior. "damageToken" is an obvious choice for such a callback, but sometimes you need to write your own if behavior is more complex (e.g. you damage the token and apply a marker to it)
Simple example of this in action with the spell fireball:
<img width="601" height="107" alt="image" src="https://github.com/user-attachments/assets/db6290d5-95cb-49ff-b0ed-a0ab519768d7" />

**effectOnToken(targetName, fxType, delay)**- makes an fx appear on a target
- targetName (string or object)- the name of the token (or the token itself) you want an FX to appear on
- fxType (string)- the id of the fx, or the name of the fx if it's one of roll20's baked in fxs
- delay (number, optional)- if you want to delay the effect by some number of milliseconds, specify the value here. By default, a 400msec delay is added because that seems to be what best syncs the audio with the video (at least for me), so a 400msec delay will always be added to whatever value you specify.

**coneAoe(params, radius, color, callback)**- if your spell creates a cone AoE (e.g. cone of cold), this method can be used to check who's in the AoE, make them roll saves, and apply whatever effects the spell's supposed to on success/fail. Requires an AoE marker of the appropriate size and shape to be drawn, which it consums on execution (see the Draw-AoE macro in macros.txt). If one doesn't exist, it puts one on the screen for you and prompts you to place it, then fire the spell again. NOTE: before calling coneAoE in your spell callbacks, you will probably want to specify a few extra values in params. Things like 'stat' (ability score the saving throw needs), 'dmgType' (self explanatory), and onSave (function that defines what if anything should happen when a target succeeds on its saving throw).
- params (object)- again, just use the params used from your spell callback function's args.
- radius (number)- the length of the cone in feet
- color (string)- the 'color' of the fx you want to create. Specifically, it creates an fx of 'breath-' + color. Acceptable values for this are the ones presented below:
<img width="261" height="263" alt="image" src="https://github.com/user-attachments/assets/fd61fc61-88a5-455e-b350-dbf4c480056e" />
- callback (function, optional)- if something's actually supposed to happen as a result of being within this AoE, the callback you provide defines the behavior. "damageToken" is an obvious choice for such a callback, but sometimes you need to write your own if behavior is more complex (e.g. you damage the token and apply a marker to it)
Simple example of this in action with the spell burning hands:
<img width="554" height="104" alt="image" src="https://github.com/user-attachments/assets/2d1a4191-69a3-4ac9-83e2-dccc55e1a10d" />

**shootRay(params, radius, color, onImpact, onImpactSound)**- creates an fx and fires it in the direction based on the specified inputs. NOTE: it ALWAYS wants to fire in the wrong direction unless you're firing perfectly horizontally or vertically. There's nothing I can do about it; seems it's on Roll20's side. No workarounds I've tried have actually worked. Hopefully they fix it some day, but as of 3/27/26, no such luck.
- params (object)- use the params used from your spell callback function's args. You could also add a 'theta' parameter to this if you're firing off in a direction instead of at a specific target, but... probably not worth it.
- radius (number, optional)- if you aren't providing a params.target and are instead providing a params.theta, then this is the distance in feet that you want your ray to shoot. If you ARE providing a params.target, this value is optional
- onImpact (string, optional)- if you want some sort of effect to happen on the target at the end of the ray (say for example, you want a burst effect), you can specify it here. it should either be one of roll20's baked-in fxs, or the id of your own custom fx
- onImpactSound (string, optional)- if you want some sort of sound to play to coincide with the fx striking your target, you can specify the name of the sound from your campaign library here

**cubeAoe(params,side,fxType,callback)**- if your spell creates a cube AoE (e.g. cone of cold), this method can be used to check who's in the AoE, make them roll saves, and apply whatever effects the spell's supposed to on success/fail. Requires an AoE marker of the appropriate size and shape to be drawn, which it consums on execution (see the Draw-AoE macro in macros.txt). If one doesn't exist, it puts one on the screen for you and prompts you to place it, then fire the spell again. NOTE: before calling cubeAoE in your spell callbacks, you will probably want to specify a few extra values in params. Things like 'stat' (ability score the saving throw needs), 'dmgType' (self explanatory), and onSave (function that defines what if anything should happen when a target succeeds on its saving throw).
- params (object)- again, just use the params used from your spell callback function's args.
- side (number)- the side length of the aoe effect in feet
- fxType (string, optional)- the fx you want the spell to create. If it's one of roll20's baked-in fxs, you can just pass the simple name in. Otherwise, you have to get the actual id of the fx and pass it in. (I should've added a helper function for that. missed opportunity)
- callback (function, optional)- if something's actually supposed to happen as a result of being within this AoE, the callback you provide defines the behavior. "damageToken" is an obvious choice for such a callback, but sometimes you need to write your own if behavior is more complex (e.g. you damage the token and apply a marker to it)
Here's an example of this in action with the spell thunderwave:
<img width="630" height="382" alt="image" src="https://github.com/user-attachments/assets/f437d9c6-c997-4e5c-bad1-2e9566582283" />

**summonSomething(summonName, img, w, h, params)**- creates a token that you control.
- summonName (string)- the name you want to appear on the token
- img (string)- the full url of the image for the token. This must be something you've uploaded to roll20. The Get-Imgsrc macro can help you get the url for a token on the map (see macros.txt)
- w (number)- the width of the token in squares (e.g. 1 for medium, 2 for large, .5 for small)
- h (number)- the height of the token in squares (same as above)
- params (object)- you can pass params straight in from the function's callback, but really you only need a value for "caster" within this object
Here's an example where this function is used for creating a mage hand
<img width="650" height="77" alt="image" src="https://github.com/user-attachments/assets/a23bd765-0dcb-4d73-89a0-8f37ba859338" />


**damageToken(t, params)**- applies damage to a token factoring in the results of saving throws (if necessary), abilities such as evasion (for dex saves), resistances, vulnerabilities, and immunities.
- t (string or object)- the name of the token taking damage or the token itself
- params (object)- just pass it in from the function's callback. If a saving throw is part of the calculations, add the result of the saving throw to params as params.saved
Here's an example using hellish rebuke
<img width="789" height="152" alt="image" src="https://github.com/user-attachments/assets/df2a7915-2971-40da-b055-3e0dcb2b1cdc" />

## **SPELLTEMPLATES.JS**
Here you list the information that the user will need to provide in order for your spell functions to work. In order to make the prompting all nice and neat, it follows Roll20 Roll Query syntax (see https://wiki.roll20.net/Roll_Query), with a key modification. When you need to collect multiple params whose names are going to be similar, you can use square brackets ([]) to inject math into it and allow it to repeat. For example, the spell Bless lets you bless a number of targets equal to 2 + the level cast (3 at level 1, 4 at level 2, 5 at level 3, and so on). Rather than just having separate templates for bless at each spell level, I wrote this:
<img width="402" height="18" alt="image" src="https://github.com/user-attachments/assets/ea5e0e15-c8d6-4c8a-a31c-9bd454d17aa9" />
and spell7.js will know that I need to collect (2 + the level cast) ally values (storing them as ally1, ally2, ally3...)

## **TIMERS.JS**
This file creates and regulates the timers to help keep things moving in initiative, as well as the ad hoc timer. The DM timer appears in green in the bottom right of the map, and the player timer appears in red in the bottom right. To interact with these timers, please use the macros described in macros.txt. If you do not wish to use timers in your game, it is best you simply not add this file to your Roll20 Scripts

## **TURNS.JS**
This file is responsible for helping with initiative tracking. That includes announcing turns in chat, executing start of turn and end of turn behaviors for enemies, handling markers that have effects (or just need to be removed) at the start or end of a turn, and adding enemies to initiative order and rolling for them. It's generally best to just let this file do its own thing.
NOTE: I think this file might need some more null-safing. I swear sometimes there are crashes that happen when the turn order list gets emptied, but I haven't really investigated it fully. Something to look for if you're using this and have time to hunt for bugs

## **UTIL.JS**
This file contains a bunch of utility functions that are helpful when writing your own additions to the code. It also serves as the entry point for a lot of macros of general purpose, and is also where I've put a lot of ad-hoc functionality (so if you find yourself having to sift through that to make sense of this file... my bad). Below are descriptions of the most useful functions within this file:

### Player ID helpers

**getGM()**- returns the Roll20 Object ID of the GM.

**getPlayerID(player)**- returns the Roll20 Object ID of the player whose name you provided
- player (string)- the name of the player as you see it in Roll20

**getPlayerName(playerid)**- takes the Roll20 Object ID of the player, and spits out the friendly name. It's getPlayerID in reverse
- playerid (string)- the Roll20 Object ID of the player

### Map helpers

**getPlayerPage()**- gets the Roll20 Object ID of the page (map) the party is currently assigned to.

**getPlayerPageName()**- gets the friendly name of the page (map) the party is currently assigned to.

**getMapID(name)**- takes the friendly name of a page (map) and spits out the Roll20 object ID of that page (map) if it exists
- name (string)- the friendly name of the page

**changePlayerPage(playerid, page)**- moves a player from one page (map) to another, in case you have to split the party
- playerid (string)- the Roll20 Object ID of the player who is being moved to view another map.
- page (string)- the friendly name or Roll20 Object ID of the map you want the player to view (it takes either)

### Token helpers

**refreshTokens()**- makes sure the scripts have the most up-to-date information of the tokens on the map. refreshTokens() stores data about tokens on the map the party is assigned to in a var called **'tokens'**, data about tokens corresponding to players on the map the party is assigned to in **'playerTokens'**, and information about player tokens across all maps in **'playerTokensAcrossMaps'**. Any unnamed token is also given a default name corresponding to its own id whenever this is called

**getGMNotes(token)**- returns the gmnotes on a token. Can be useful if you're storing information you want to use programmatically in the token's GM notes
- token (string or object)- the name of the token, or the token object itself

**effectOnToken(targetName, fxType, delay)**- if you want to make an FX appear on a token (one which doesn't move from point A to point B), you can use this method
- targetName (string)- the name of the token on which the fx appears
- fxType (string)- the type of fx you want to appear on the token. Must be either a simple name for one of roll20's baked-in FX types, or must be the ID of your custom FX object
- delay (number, optional)- if you want to delay the FX from appearing by a certain amount of time, you can define a delay here in milliseconds

**rollCharacterSave(playerid, saveType, adv)**- if your players are okay with relinquishing control of the dice to you when it comes to rolling their own saves, you can use this function to do so programmatically. If there's a paladin in the party who can provide a bonus to saving throws with their aura, you can add that in by updating the line that says 'let paladin = null;' to instead retrieve info on the paladin
- playerid (string)- the Roll20 Object ID of the player whose character is rolling a save
- saveType (string)- the ability score used for rolling the save. Can be the full name (e.g. 'strength') or can be the 3-letter abbreviation (e.g. 'int')
- adv (string, optional)- put any string starting with 'a' to roll with advantage, or any string starting with 'd' to roll with disadvantage.

**pingToken(tokenName, playerid)**- pings a token on the map and moves the camera to focus on it
- tokenName (string or object)- the token's name or the token itself
- playerid (string, optional)- the ID of a player requesting the ping. This is used to safeguard players from pinging enemy tokens that might still be hidden. If you just want to ping a token regardless, the value you provide for this arg can just be getGM()

**getToken(name)**- takes a token name and returns the token on the current page (map) that has that name
- name (string or object)- the name of the token, or the object itself (ability to take the object itself is mostly there as a safeguard)

**getTokenId(name)**- takes a token name and returns the Roll20 Object ID of the token on the current page (map) that has that name
- name (string or object)- the name of the token, or the object itself

**setPosition(t, x, y)**- moves a token to a specified set of coordinates
- t (string or object)- the name of the token you want to move, or the token itself
- x (number) - the x-coordinate of the position you want the token to go
- y (number) - the y-coordinate of the position you want the token to go

### Chat helpers

**spoof(player, msg)**- send a message programmatically under the guise of another player
- player (string)- the name you want the message to appear to be from
- msg (string)- the message to be printed in chat

**whisper(player, msg)**- whisper a message to a player (for their eyes only)
- player (string)- the name of the player being whispered to.
- msg (string)- the message being whispered

**echo(text)**- prints the contents of 'text' into chat
- text (string)- the message to be displayed in chat

**emphasis(text)**- prints the contents of 'text' into chat, but bolded, italicized, and orange for emphasis
- text (string)- the message to be displayed in chat

### Sound helpers

**playSound(title, delay, loop, volume)**- plays the sound at the requested volume, loops it if you want
- title (string)- the name of the sound you want to be played. Must be imported into your roll20 campaign
- delay (number, optional)- delay playing the sound by this number of milliseconds
- loop (boolean, optional)- if true, will play the sound on loop. Assumes false
- volume (number, optional)- the volume to play the sound at, on a scale from 0 to 100. Defaults to 50

**stopSound(title, delay)**- stops a sound from playing
- title (string)- the name of the sound currently playing
- delay (number, optional)- delay stopping the sound by this many milliseconds

### Text + Logging Helpers
Note: You'll see messages in here that refer to a *logging document*. At one point, I would have API Log messages written to a document called "API Logging", but the write operations ended up taking so long that the system would get too bogged down by it. If you need to have log messages written to the logging document, find the code around line 80 that's commented out with the comment "DISABLED AS IT BOGS THE API DOWN TOO MUCH", and un-comment it.

**prettyPrint(str)**- takes a string written in camel case (e.g. "stringInCamelCase") and prints it in title case (e.g. "String In Title Case")
- str (string)- the string to be pretty-printed

**debugging(msg)**- this would be perhaps considered 'verbose' logging. This writes messages to the API Sandbox logs if the debug var is set to true, and to a logging document. In the log document, messages are preceded by 'DEBUG:'. 'debug' is false by default. To set it to true, type '!debug on' in chat. To turn it off again, restart the sandbox or type '!debug off'
- msg (string)- the log message to write

**inform(msg)**- writes info level messages to the API sandbox, and to a logging document if configured. In the log document, messages are preceded by 'INFORM:'
- msg (string)- the log message to write

**trace(msg)**- writes trace level messages to the API sandbox (think more like milestones), and to a logging document if configured. In the log document, messages are preceded by 'TRACE:'
- msg (string)- the log message to write

**warn(msg)**- writes warning level messages to the API sandbox, and to a logging document if configured. In the log document, messages are preceded by 'ALERT:'
- msg (string)- the log message to write

### ROLL DICE

**rollDice(desc, dice, advantage)**- rolls dice for you, parsing "XdY+Z" syntax. Can process "kh#" and "kl#" in roll commands
- desc (string, DEPRECATED)- this argument doesn't do anything anymore
- dice (string)- the dice to be rolled in "XdY+Z" format
- advantage (string, optional)- a string that begins with 'a' will be interpreted as advantage (keep only the highest die), and a string that begins in 'd' will be interpreted as disadvantage (keep only the lowest die).

### Miscellaneous Helpers

**sleepMS(delayMs)/delayMS(delayMs)**- helper function to cause a delay before doing something. Must be preceded by 'await' when invoking it for it to work properly.
- delayMs (number)- the amount of delay you want (in milliseconds)

