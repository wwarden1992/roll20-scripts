This repo contains all the scripts I wrote for the campaign I ran (excluding ad-hoc files made for certain maps or puzzles).

Here is an explanation of all the files I wrote and the important functions if you want to build off it. You will see references to "Roll20 Objects" throughout this document. Please note that this refers to a specific type of structure as outlined in this webpage: https://wiki.roll20.net/API:Objects

GENERAL CONSIDERATIONS:
I use bar3_value (the circle that's red by default) for HP, bar2_value (the circle that's blue by default) for temp HP, and bar1_value (the circle that's green by default) for AC. If you have bar4_value enabled in your settings (the circle that's yellow be default), I use that for speed.
If you don't use the same bars(/circles) for your values, then your mileage with these scripts will vary wildly.



**AOEHAZARDS.JS**
This file allows you to create AOE hazards in your own JS files, specifying shapes, sizes, trigger conditions, and specific effects for them. Spells that generate AOE hazards (e.g. Grease, Moonbeam, etc.) make use of the methods in this class.
Hazard information gets stored as JSON in a document called "Hazard Tracker", which you can access from the "Journal" tab on the righthand menu in your Roll20 campaign. If this document does not exist, it will be created automatically as soon as we need to store hazard information. This file serves as "memory" so the AoE hazards will continue to be observed by the scripts following a restart (often due to inactivity, a crash, or you're pushing your own changes). I think it's still a bit finnicky at times, but it's pretty good about updating records when AoEs are created, moved, or destroyed.
AoE hazard sources are either a specific token (such as in the case of a moonbeam or a cloud of daggers), an aura around a token (such as in the case of spirit guardians), or a path object (such as what we use for fog cloud). To create your own AoE hazard programmatically, it is STRONGLY recommended you use the following method:


**createAoeHazard(obj, shape, triggers, params, callback, exitCallback, storeInMemory)**
obj (Roll20 Object)- The Roll20 Object that is the source of the AoE. This can be a graphic, or a pathv2
shape (string)- Acceptable values are "circle", "cone", and "rectangle". Shapes other than this (e.g. if you drew a random polygon) are not supported
triggers (string array)- the conditions where the string effects are triggered. It is recommended that you use the consts defined at the top of this file as values for the array rather than hardcoding the strings yourself. The consts are listed as follows: 
 - START_OF_TURN (trigger if a token is within the AoE at the start of its turn)
 - ENTERS_AREA (trigger when the token enters the AoE on the first time during its turn; prevents triggering from involuntary movement, and prevents you from pinging yourself 'playing the hokey pokey' with the AoE)
 - END_OF_TURN (triger if the token is within the AoE at the end of its turn)
 - TRAP (trigger any time a token moves within the AoE, regardless of turn. Useful for when players move their tokens around a dungeon map outside of initiative
 - ON_CAST (trigger as the AoE comes into existence)
 - HAZARD_MOVED (trigger if the AoE is moved. good for something like ramming a creature with a flaming sphere)
params (object) - typically if you're creating the AoE as part of a spell, you'll be able to just get away with using the 'params' that are already kind of baked into the spell script's architecture. It's smart enough to infer the values you need. Otherwise, your params object should look like this:
  { 
    "caster": The name of the token who's spell or ability created the AoE hazard (can be omitted if not applicable),
    "dc": The DC for a saving throw prompted by this AoE when triggered (can be omitted if not applicable),
    "level": The level of the spell cast that created this AoE, used for things like scaling damage effects (can be omitted if not applicable)
  }
callback (function)- A function that specifies what happens when the AoE gets triggered.
exitCallback (function, optional)- A function that gets called whenever a creature exits the AoE. Most AoEs do not need an exitCallback, but for some exceptions like Silence where we would want to remove a marker denoting it's silenced/deafened status, it's helpful.
storeInMemory (boolean, optional)- if you don't want the AoE hazard to be remembered by the Hazard Tracker doc, set this to false. Otherwise it's assumed to be true. Useful to set false when you've scripted traps into your map, and you don't want to create duplicates each time you restart the scripts.




**CHANGEMAP.JS**
Provides the ability for players to manually change the map they view. No macro has been provided, but anyone can type "!changemap (name of map)", and as long as a map of that name exists, the person who typed it will view that map. When that player is done, they can type "!changemap Rejoin Group" and they will be moved back to the map that the party is on.
It probably would not be too great an effort to write a function with another command where you print a list of buttons in chat so you could provide a list of specific map options (and 'Rejoin Group') for players to choose from. If someone wants to add a function like that and a placeholder array for you to name maps (or better yet, read from a campaign document with JSON so you can configure without having to restart scripts), that would be awesome




**CHARACTERS.JS**
This contains methods for parsing information from character sheets in the campaign. 2024 character sheets here might perhaps be more appropriately labeled Jumpgate character sheets? Whatever the new style of character sheets is, it's a heck of a lot harder to parse out information from them now, so a lot of the methods are kind of hard to decipher. Honestly, a lot of the 2024 stuff probably isn't perfect either! 
Things you should know as a user:
- There's a var called "inactiveCharacterList". If there's any character sheets in the campaign for characters that are inactive, listing them here helps filter them out in functions where we only care about the active characters. For example, when we autopopulate a map with character tokens, we'll ignore characters from the inactiveCharacterList. Similarly, when we're trying to do gold tracking, we won't track gold for inactive characters.
- There's another var called "pets". If you maintain character sheets for your familiar, homunculi, stray NPCs, etc, adding them to the pets list will help us know that these aren't your actual characters. We'll still make tokens for them when creating a new map, but we know that we probably don't care about them for other things like gold tracking, looking up a player's active character's stats, etc.
- Aside from that, most of this stuff is just there to help with auto-creating tokens for your characters, figuring out your attack modifiers and DCs, etc. There's stuff that can check for your abilities and proficiencies, but most players don't want the machine auto-rolling for them, so it's debatable how useful it is.
In general, if you're trying to make new stuff, the most useful function to know is the following:

**getAttribute(character, attrName, valueType)**
character (string)- The name of the character as it appears on the character sheet
attrName (string)- The stat you want to look up information about
 - can be an ability score like "strength", "intelligence", etc.
 - if you want the modifier instead of the raw ability score, use "strength_mod", "intelligence_mod", etc.
 - if you want the save modifier, use "strength_save_bonus", etc.
 - for skills, use "perception_bonus", "animal_handling_bonus", etc.
 - other: "hp", "ac", "pb", "spellcasting_ability", "spell_save_dc", "spell_attack_bonus", "level"
valueType (string, optional) - you can provide a value of "max" for this if you want to get an HP max instead of current HP from the character sheet.




**ENEMY.JS**
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



**ENEMYTEMPLATES.JS**
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
  


**FORTUNETOKENS.JS**
If you want to play with fortune tokens, this provides a means to do that. Interact with it through the SPEND-FORTUNE-TOKEN and SPEND-MISFORTUNE-TOKEN macros outlined in macros.txt. One thing I'll note, there's a const pretty early on in the file called 'totalTokens', and that's the sum of fortune/misfortune tokens in play at any given time. Traditionally, this should be set to the number of active players in the campaign, so you may want to raise or lower it (probably lower it) according to how many players there are in your campaign.
The quantity of fortune tokens is maintained in a document called "Fortune Token Tracking" (it gets created if it doesn't currently exist). This is used so the system can "remember" the balance of fortune tokens after a script reset, and also to reset the fortune tokens to the starting balance if it's the next session (i.e. hasn't been updated in 24 hours)
NOTE: I've tricked myself into thinking the fortune/misfortune tokens aren't working, by spending a misfortune token while looking at a different map. Please note that when you spend a fortune token, it only updates on the map the party is on, and won't update on other maps until that other map becomes the party map.



**GEOMETRY.JS**
Abandon all hope ye who enter here. This contains the logic for detecting whether enemies fall within a certain AOE range, and it is messy and hard to read. But it works.
Notes about checking if an enemy exists within an AoE: it assumes that tokens are square, and even the tiniest bit of overlap is enough to declare a hit. If you'd rather the tokens be treated as circles within the grid square(s) they occupy, set the var somewhere within this file called 'allowAnyOverlap' to false.
The only function in here that you might like to use outside of this library is this one:

**function drawShape(playerid, shape, length, width, type, color, fill)**
playerid (string, DEPRECATED)- don't worry about putting a value here. The program overwrites it to 'all'
shape (string) - acceptable values are "cone", "square", "circle", or "line" (which actually draws a rectangle)
length (number) - Whatever value (in feet) a spell or ability description would give, that's what you want to provide. For a sphere or cylinder with a 20 foot radius, use 20. For a 15 foot cone, use 15. For a 30 foot cube, use 30. And so on
width (number) - optional for all shapes except "line". Gives the width of a rectangle. If you're drawing this shape for an ability that travels in a line but doesn't have a specified width (e.g. catapult), I just like to use something small for this value like 1
type (string, optional) - if you're using this to measure something other than an aoe for a spell or ability, put some value here (not 'aoe'). Otherwise, it'll assume the object being drawn is going to be used for spell cast and will make a microadjustment to the line thickness to signal it can be used by a spell. 
color (string, optional) - gives the color of the line drawing the shape. Use "#RRGGBB" format. If no value is provided, "#123456" is used (looks kinda dark blue)
fill (string, optional) - fills in the shape with the given color. Use "#RRGGBB" format. If no value is provided, the shape is not filled in (e.g. transparent fill)



**GOLDTRACKER.JS**
Puts a gold tracker at the top-left corner of the map, and tracks how much money each player has in a place everyone can easily see. If everyone is tracking their gold in something like a google sheet, maybe this doesn't have a ton of use, and possibly would even be annoying for covering part of the map, but it's nice to have this quick reference available in many cases.
You'll want players to update their gold total by using the "Update Money" macro (see macros.txt). This script handles requests from that. Behind the scenes though, the money data is being stored in a file called "Gold Tracking" (which this script will create if it doesn't exist).
Something I considered putting in was a way to quickly divide gold amongst all players and update their totals, but that never came to pass. That's another useful function you could add.



**HP.JS**
This script put messages into chat whenever a token takes damage/receives healing. If you deduct hp from the HP box (bar3_value) while there's still HP in the temp HP box (bar2_value), it'll automatically correct it for you so you're burning through temp HP first. Some players like to things like "(+#)" in their HP totals when they're trying to find a way to keep it clear that their max HP is currently boosted by spells like Aid, and this file can kind of work around some of the more predictable cases, but isn't perfect.
This file also handles prompting for concentration checks, will announce when targets are bloodied, and announce when they are dead/unconscious (applying appropriate markers too).
Will distribute damage dealt across targets with paired Warding Bond markers, will remove the 'armorOfAgathys' marker if it's present and temp HP goes to 0, and will prevent attempts to heal a token if the 'chilltouch' marker is present on it.



**MACROS.TXT**
Contains a list of all the macros I used. Read it and add them to your campaign if you're using these scripts. Sorry you have to do it manually.



**MARKERS.JS**
TODO...
