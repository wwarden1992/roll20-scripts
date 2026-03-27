Contains all the scripts I wrote for the campaign I ran (excluding ad-hoc files made for certain maps or puzzles).

Here is an explanation of all the files I wrote and the important functions if you want to build off it. You will see references to "Roll20 Objects" throughout this document. Please note that this refers to a specific type of structure as outlined in this webpage: https://wiki.roll20.net/API:Objects



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
