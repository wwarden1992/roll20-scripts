var jukebox;
var tokens;
var playerTokens;
var playerTokensAcrossMaps;
var players;
var chatName = 'System';
var logHandout;
var debug;
var clockDoc;
var clock;

var abilityScores = [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma"
];

var damageTypes = [
    'acid',
    'bludgeoning',
    'cold',
    'fire',
    'force',
    'lightning',
    'necrotic',
    'nmbludgeoning',
    'nmpiercing',
    'nmslashing',
    'piercing',
    'poison',
    'psychic',
    'radiant',
    'slashing',
    'thunder',
];

const logFileSizeLimit = 50*1024; //50KB seems reasonable


//TODO keeping this handy in case we ever want to play around with FX again.
//The library that Roll20 provides is definitively janky and not fully functional

//TODO can /fx chat work? See https://wiki.roll20.net/Text_Chat
async function test() {
    /*spawnFxWithDefinition(700, 700, {
        angle: 0,
        angleRandom: 360,        
    	duration: 20,
    	emissionRate: 20,
    	endColour: [0, 255, 0, 0.5],
    	endColourRandom: [0, 0, 0, 0],
    	lifeSpan: 50,
    	lifeSpanRandom: 0,
    	maxParticles: 2000,
        gravity: { x: 0.01, y: 0.01 },
    	size: 30,
    	sizeRandom: 0,
    	speed: 200,
    	speedRandom: 0,
    	startColour: [0, 255, 0, 1],
    	startColourRandom: [0, 0, 0, 0]
    });*/
    //let data = await get2024CharacterData('Stein Vetchka');
    //log(data);
    echo("<div style=\"color: #ffffff; background: #1c1c1c; padding: 6px; background-clip: border-box; border-radius: 8px; border: 1px solid #702c91; font-size: 1.1em; line-height: 1.5em; display: inline-block;\">rolling 1d6</div>");
}

on("ready", function(){

    players=findObjs({_type:'player'});
    updateCharacters();
    refreshTokens();
    loadEnemies();
    jukebox = findObjs({_type:'jukeboxtrack'});
    jukebox.forEach((r)=>r.set('volume',50));
    /* DISABLED AS IT BOGS THE API DOWN TOO MUCH.
    let handouts = findObjs({type: 'handout', name: 'API Logging'});
    if (handouts != null && handouts.length > 0) {
        logHandout = handouts[0];
    } else {
        logHandout = createObj('handout', {
            name: 'API Logging'
        });
        inform('log file created');
    }*/
    clockDoc = findObjs({type: 'handout', name: 'In-Universe Date'});
    if (clockDoc != null && clockDoc.length > 0) {
        clockDoc = clockDoc[0];
    }
    if (clockDoc != null) {
        initClock();
        updateUniverseTime();
    }
    monitorLoadingPages();
    monitorSaveResults();
    
    on("change:campaign:playerpageid", async function() {
        initClock();     
    });
    
    on('destroy:graphic', function(obj) {
       refreshTokens(); 
    });
    
    on('chat:message', function(msg) {
        if(debug === undefined) debug = false;
        if (msg.content.indexOf('!test') == 0 && playerIsGM(msg.playerid)) {
            test();
        }
        else if (msg.content.indexOf('!invoke') == 0 && playerIsGM(msg.playerid)) {
            let args = msg.content.split(' ');
            let func = this[args[1]]
            args.splice(0,2);
            func(...args);
        } 
        else if (msg.content.indexOf('!echo ') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js got command to echo "' + msg.content.slice(6) + '"');
            echo(msg.content.slice(6));
        }
        else if (msg.content.indexOf('!attribute') == 0) {
            trace('util.js got attribute request "' + msg.content + '"');
            let msgSubstrs = msg.content.split(' ');
            let charName = '';
            for (let i = 1; i < (msgSubstrs.length-1); i++) {
                charName += msgSubstrs[i];
                charName += " ";
            }
            charName = charName.slice(0,-1);
            let attrType = msgSubstrs[msgSubstrs.length - 1];
            if (msgSubstrs.length > 2) {
                getAttribute(charName, attrType);
            }
        }
        else if (msg.content.indexOf('!clearmarkers') == 0 && playerIsGM(msg.playerid)) {
            clearMarkersOnTokens();
        }
        else if (msg.content.indexOf('!save') == 0) {
            trace('util.js got message: ' + msg.content);
            let msgSubstrs = msg.content.split(' ');
            if (msgSubstrs.length == 2) {
                rollCharacterSave(msg.playerid, msgSubstrs[1], 'none');
            } else if (msgSubstrs.length > 2) {
                rollCharacterSave(msg.playerid, msgSubstrs[1], msgSubstrs[2]);
            } else {
                echo('please specify the type of save you would like to roll');
            }
        }
        else if (msg.content.indexOf('!enemysave') == 0) {
            trace('util.js got message: ' + msg.content);
            let msgSubstrs = msg.content.split("`");
            msgSubstrs = msgSubstrs.filter((s) => s !== " ");
            if (msgSubstrs.length < 6) {
                warn('command underdefined');
            }
            let stat = msgSubstrs[2];
            let dc = msgSubstrs[3];
            let adv = false; let disadv = false;
            if (msgSubstrs[4] == "Both" || msgSubstrs[4] == "Advantage") adv = true;
            if (msgSubstrs[4] == "Both" || msgSubstrs[4] == "Disadvantage") disadv = true;
            let type = 'nonmagical';
            if (msgSubstrs[5] == "Yes") type = 'magic';
            let e = lookupEnemy(msgSubstrs[1]);
            if (e == null) warn('enemy lookup failed');
            else e.rollSave(stat, adv, disadv, dc, type, null);
        }
        else if (msg.content.indexOf('!find') == 0 || msg.content.indexOf('!locate') == 0) {
            trace('util.js got message: ' + msg.content);
            let msgSubstrs = msg.content.split(' ');
            refreshTokens();
            if (msgSubstrs.length < 2) {
                promptCharacterSelection(getObj('player', msg.playerid).get('displayname'));
            }
            else {
                msgSubstrs = msg.content.split('`');
                if (msgSubstrs.length < 2) {
                    warn('malformed !find command');
                } else {
                    let target = msgSubstrs[1];
                    if (msgSubstrs.length > 2 && msgSubstrs[2].trim() != '') {
                        let player = msgSubstrs[2].trim();
                        pingToken(target, player);
                    } 
                    else pingToken(target,msg.playerid);
                }
            }
        } else if (msg.content.indexOf('!markers') == 0) {
            trace('util.js got message: ' + msg.content);
            let msgSubstrs = msg.content.split(' ');
            refreshTokens();
            if(msgSubstrs.length < 2) {
                echo('Token name cannot be blank for marker lookup');
            } else {
                explainMarkers(getObj('player', msg.playerid).get('displayname'), getToken(msg.content.slice(msg.content.indexOf(' ') + 1)));
            }
        } else if (msg.content.indexOf('!spawn') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js got message: ' + msg.content);
            let msgSubstrs = msg.content.split(' ');
            if(msgSubstrs.length < 2) return;
            if (msgSubstrs.length == 2) spawnEnemy(msgSubstrs[1]);
            else if (msgSubstrs.length == 4 || msgSubstrs[3] == "random") spawnEnemy(msgSubstrs[1], msgSubstrs[2], msgSubstrs[3], msgSubstrs[3]);
            else if (msgSubstrs.length < 5) spawnEnemy(msgSubstrs[1], msgSubstrs[2]);
            else spawnEnemy(msgSubstrs[1], msgSubstrs[2], msgSubstrs[3], msgSubstrs[4]);
        } else if (msg.content.indexOf('!draw') == 0) {
            let msgSubstrs = msg.content.split(' ');
            trace('util.js got DRAW message: ' + msg.content);
            if (msgSubstrs.length == 1) {
                echo('please define a shape to draw (circle, square, or cone)');
            } else if (msgSubstrs.length == 2) {
                echo('missing either a shape or length for the \'draw\' command');
            } else if (msgSubstrs[2] == "" || isNaN(msgSubstrs[2])) {
                echo('You must provide a numerical value for the length of the shape');
            } else {
                let shape = msgSubstrs[1]; let length = Number(msgSubstrs[2]);
                let width = null;
                if (msgSubstrs[3] != null && msgSubstrs[3] != "") width = Number(msgSubstrs[3]);
                drawShape(msg.playerid, shape, length, width);
            }
        } else if (msg.content.indexOf('!debug on') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js got message: ' + msg.content);
            debug = true;
        } else if (msg.content.indexOf('!debug off') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js got message: ' + msg.content);
            debug = false;
        } else if (msg.content.indexOf('!start-initiative') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js got message: ' + msg.content);
            populateTurnOrder();
        } else if (msg.content.indexOf('!dmglookup') == 0) {
            debugging(msg.content.slice(11));
            dmgLookup(msg.content.slice(11));
            trace('util.js acknowledging message: ' + msg.content);
        } else if (msg.content.indexOf('!basicattack') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js acknowledging message: ' + msg.content);
            let strTokens = msg.content.split("`");
            let attacker = getToken(strTokens[1]);
            let target = getToken(strTokens[3]);
            if (attacker == null || target == null) {
                warn('attacker or target invalid');
                return;
            }
            let e = lookupEnemy(attacker);
            if (e != null) e.basicAttack(target);            
        } else if (msg.content.indexOf('!check') == 0) {
            trace('util.js acknowledging message: ' + msg.content);
            let skill = msg.content.slice(7);
            let strTokens = msg.content.split(' ');
            let adv = null;
            let possibleAdvTerm = strTokens[strTokens.length - 1];
            if (possibleAdvTerm.toLowerCase() == 'adv' || possibleAdvTerm.toLowerCase() == 'a' || possibleAdvTerm.toLowerCase() == 'advantage') adv = 'adv';
            else if (possibleAdvTerm.toLowerCase() == 'dis' || possibleAdvTerm.toLowerCase() == 'd' || possibleAdvTerm.toLowerCase() == 'disadvantage') adv = 'dis';
            if (adv != null) {
                skill = skill.slice(0, skill.lastIndexOf(' '));
            }
            let character = inferCharacter(msg.playerid);
            rollCheck(character, skill, adv);
        } else if (msg.content.indexOf('!attack') == 0) {
            trace('util.js acknowledging message: ' + msg.content);
            let adv = msg.content.slice(8);
            let character = inferCharacter(msg.playerid);
            rollAttack(character, adv);            
        // ONE-OFF EFFECTS
        } else if (msg.content.indexOf('!imgsrc') == 0) {
            let data = msg.content.slice(8);
            trace('get imgsrc of token with id ' + data);
            let token = getObj('graphic',data);
            if (token != null) {
                trace('imgsrc is:   ' + token.get('imgsrc'));
            }
        } else if (msg.content.indexOf('!gun') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js acknowledging message: ' + msg.content);
            let strTokens = msg.content.split("`");
            let shooter = getToken(strTokens[1]);
            let target = getToken(strTokens[3]);
            let type = strTokens[5];
            if (shooter == null || target == null) {
                inform('invalid shooter or target value');
                return;
            }
            let e = lookupEnemy(shooter);
            let overrideDmg = '0';
            let misfireNumber = 1;
            let dexMod = 2;
            if (e != null) {
                let dex = Number(e.stats['dex']);
                dexMod = (dex != null && !isNaN(dex) ? Math.floor((dex - 10)/2) : 2);
            }
            if (type.toLowerCase() == 'rifle') {
                overrideDmg = '2d10+' + dexMod;
                misfireNumber = 3;
            }
            else if (type.toLowerCase()=='revolver') {
                overrideDmg = '2d8+' + dexMod;
                misfireNumber = 2;
            }
            else if (type.toLowerCase()=='shotgun') {
                overrideDmg = '2d12+' + dexMod;
                misfireNumber = 4;
            }
            else if (type.toLowerCase()=='gatling') overrideDmg = '1d4';
            let callbackFn = async function(target, hit, roll) {
                inform('gun callbackFn called');
                if (roll <= misfireNumber) {
                    emphasis(shooter.get('name') + "'s gun misfired and is now jammed!");
                    let badge = '';
                    if(hasMarker(shooter, 'gunjammed')) {
                        badge = getBadge(shooter, 'gunjammed');
                        if (badge != '') badge = badge + " + " + type;
                    } else {
                        badge = type;
                    }
                    await clearMarker(shooter, 'gunjammed');
                    addTokenStatusMarker(shooter, 'gunjammed', badge);
                }
            }
            if (e != null && type.toLowerCase() != 'gatling') e.basicAttack(target, null, overrideDmg, null, null, null, callbackFn);
            else if (type.toLowerCase() == 'gatling') {
                gatlingAttack(e, target);
            }
            else {
                debugging('enemy lookup failed');
            }
            gunshot(shooter, target, (type.toLowerCase()=='gatling' ? 'gatling' : 'revolver'));
        } else if (msg.content.indexOf('!enterbook') == 0) {  
            trace(getPlayerName(msg.playerid) + ' is entering the book');
            changePlayerPage(msg.playerid, 'Book World 1F');
        } else if (msg.content.indexOf('!exitbook') == 0) {            
            trace(getPlayerName(msg.playerid) + ' is exiting the book');
            if (typeof Campaign().get('playerspecificpages') != "boolean") {
                let objs = findObjs({_type:'graphic', subtype:'token', controlledby:  msg.playerid, pageid:  Campaign().get('playerspecificpages')[msg.playerid]});
                if (objs != null && objs.length > 0) {
                    inform('moving token to entrance for future re-entry');
                    teleport(objs[0], teleporters[0]);
                }
            }
            changePlayerPage(msg.playerid, null);
        } else if (msg.content.indexOf('!initiative') == 0) {
            let name = msg.content.slice(12);
            trace('util.js acknowledging request to roll initiative for: ' + msg.content);
            let enemy = enemies.find(e => e.token.get('name') == name);
            if (enemy != null) enemy.rollInitiative();
        } else if (msg.content.indexOf('!concentrate') == 0) {
            trace('util.js acknowledging request for target to concentrate');
            trace(msg.content);
            let strTokens = msg.content.split("`");
            if (strTokens.length < 4) {
                warn('improperly formatted concentration request');
            }
            let tokenName = strTokens[1];
            let spellName = strTokens[3];
            let duration = null;
            if (strTokens.length >= 6) {
                duration = strTokens[5];
            }
            concentrate(tokenName, spellName, duration);
        } else if (msg.content.indexOf('!z-axis') == 0) {
            trace('util.js acknowledging request for target to be at different height');
            let strTokens = msg.content.split("`");
            if (strTokens.length < 4) {
                warn('improperly formatted concentration request');
            }
            let tokenName = strTokens[1];
            let height = strTokens[3];
            clearMarker(tokenName, 'concentration');
            addTokenStatusMarker(tokenName, 'fluffy-wing', height + 'ft.');
        } else if (msg.content.indexOf('!updateclock') == 0 && playerIsGM(msg.playerid)) {
            trace('util.js got message: ' + msg.content);
            let updatedTime = msg.content.slice(13);
            updateUniverseTime(updatedTime);
        } else if (msg.playerid != null && !playerIsGM(msg.playerid)) {
            let playerName = getPlayerName(msg.playerid);
            if (playerName == null || msg.playerid == 'API') playerName = 'API';
            if (playerName != null) trace(playerName + ' typed:   ' + msg.content.replaceAll('<','&lt;').replaceAll('>','&gt;') );
        } else if (msg.content.indexOf('!illriggerseal') == 0) {
            trace('util.js acknowledging message: ' + msg.content);
            let msgTokens = msg.content.split('`');
            if (msgTokens.length < 2) {
                warn ('illrigger seal command invalid');
            }
            let target = msgTokens[1];
            let source = null;
            let movingSeals = false;
            if (msgTokens.length >= 4) {
                source = msgTokens[3];
                movingSeals = true;
            }
            let badge = getBadge(target, 'illriggerseal');
            let sourceBadge = (source == null ? 0 : getBadge(source, 'illriggerseal'));
            if (movingSeals) {
                clearTokenMarker(source, 'illriggerseal');
            }
            if (badge == null || badge.length == 0 || isNaN(badge)) {
                addTokenStatusMarker(target, 'illriggerseal', "" + (sourceBadge > 0 ? sourceBadge : '1'));
            } else {
                clearTokenMarker(target, 'illriggerseal');
                badge = Number(badge) + (movingSeals ? Number(sourceBadge) : 1);
                addTokenStatusMarker(target,'illriggerseal', badge);
            }
        } else if (msg.content.indexOf('!boxofdoom') == 0) {
            if (!activeLoops.find(l => l == 'boxofdoom')) playSound('boxofdoom',null,true, 70);
            else {
                stopSound('boxofdoom',500);
                playSound('boxofdoomend');
            }
        } else if (msg.content.indexOf('!updatespearbadge') == 0) {
            let newBadge = msg.content.split(' ')[1];
            clearMarker('Ominous Spear', 'custom');
            addTokenStatusMarker('Ominous Spear','custom',newBadge);
            
        } else {
            trace('util.js acknowledging message: ' + msg.content + ' (ignored)');
        }
    });
});

function getGM() {
    let gmObject = findObjs({_type:'player'}).find((p) => playerIsGM(p.get('id')));
    if (gmObject != null) return gmObject.get('id');
}

function getPlayerId(player) {
    if (player == null) return null;
    let playerObj = null;
    try {
        let testType = playerid.get('_type');
        if(testType === 'player') playerObj = player;
    } catch {
    }
    if (playerObj == null) {
        try {
            playerObj = findObjs({ type: 'player', displayname: player });
            if (playerObj != null && playerObj.length > 0) {
                playerObj = playerObj[0];
            } else {
                playerObj = null;
            }
        } catch {
        }
    }
    if (playerObj == null) {
        warn('could not obtain player object from provided name (' + player + ')');
        return null;
    } else {
        let playerid = playerObj.get('id');
        return playerid;    
    }
}

function getPlayerName(playerid) {
    if (playerid == null || playerid == 'API') return;
    let playerObj = null;
    try {
        let testType = playerid.get('_type');
        if(testType === 'player') playerObj = playerid;
    } catch {
    }
    if (playerObj == null) {
        try {
            playerObj = getObj('player',playerid);
        } catch {
        }
    }
    if (playerObj == null) {
        try {
            playerObj = findObjs({type: 'player', displayname: playerid});
            if (playerObj != null && playerObj.length > 0) {
                playerObj = playerObj[0];
            } else {
                playerObj = null;
            }
        } catch {
        }
    }
    if (playerObj == null) {
        warn('could not obtain player object from provided id (' + playerid + ')');
        return null;
    } else {
        let player = playerObj.get('displayname');
        return player;    
    }
}

//========================
// MAPS
//========================
function getPlayerPage() {
    return Campaign().get('playerpageid');
}

function getPlayerPageName() {
    return getMapName(getPlayerPage());
}

function getMapID(name) {
    let mapID = findObjs({_type:'page'}).find((n) => n.get('name') == name);
    if (mapID == null) return;
    return mapID.get('id');
}

function getMapName(id) {
    let map = findObjs({_type:'page'}).find((n) => n.get('id') == id);
    if (map == null) return;
    return map.get('name');
}

function changePlayerPage(playerid, page) {
    if (playerid == null) return;
    let pageid = getMapID(page);
    if (page == null) {
        page = Campaign().get('playerpageid');
    }    
    if (pageid == null) pageid = page; //assume that 'page' is already a pageid if we can't retrieve an id from the string
    let playerspecificpages = Campaign().get('playerspecificpages');	
    if (typeof playerspecificpages == "boolean") playerspecificpages = {};
    else if (typeof playerspecificpages == "string") playerspecificpages = JSON.parse(playerspecificpages);
    Campaign().set('playerspecificpages', false);
    if (Campaign().get('playerpageid') == pageid) {
        delete playerspecificpages[playerid];
        if(Object.keys(playerspecificpages).length == 0) playerspecificpages = false;
    } 
    else playerspecificpages[playerid] = pageid;
    Campaign().set('playerspecificpages', playerspecificpages);    
}

//========================
// TOKENS
//========================

function refreshTokens() {
    tokens = findObjs({_type:'graphic', subtype:'token', pageid: Campaign().get('playerpageid')});
    tokens.forEach((t) => {
        if(!t.get('name')) t.set('name',t.get('id'));
    });
    //in general, we only want to look at the player tokens on this page
    playerTokens = findObjs({_type:'graphic', subtype:'token', pageid: Campaign().get('playerpageid')});
    playerTokens = playerTokens.filter((p) => 
        p.get('controlledby') != null && p.get('controlledby') != "" && !playerIsGM(p.get('controlledby'))
    );
    
    playerTokensAcrossMaps = findObjs({_type:'graphic', subtype:'token'});
    playerTokensAcrossMaps = playerTokensAcrossMaps.filter((p) => 
        p.get('controlledby') != null && p.get('controlledby') != "" && !playerIsGM(p.get('controlledby'))
    );
}

function getTokens(json) {
    if (json == null) json = {};
    json['_type'] = 'graphic';
    json['subtype'] = 'token';
    json['pageid'] = Campaign().get('playerpageid');
    return findObjs(json);
}
    
async function getGMNotes(token) {
    let t = getToken(token); //just in case we passed name as ref instead of token itself
    if (t == null) return;
    let gmNotes =unencodeUrlString(await t.get('gmnotes'));
    if (gmNotes != null && gmNotes.length >= 7) gmNotes = gmNotes.slice(3,-4);
    //log(gmNotes);
    return gmNotes;
}

async function effectOnToken(targetName, fxType, delay) {
    //hardcoded delay for sounds to load
    if (!delay) delay = 0;
    delay += 400;
    
    await new Promise(r => setTimeout(r, delay));
    var target = getToken(targetName);
    spawnFx(target.get('left'), target.get('top'), fxType);
}

function inferCharacter(playerid) {
    let playerObj = null;
    try {
        let testType = playerid.get('_type');
        if(testType === 'player') playerObj = playerid;
    } catch {
    }
    if (playerObj == null) {
        try {
            playerObj = getObj('player',playerid);
        } catch {
        }
    }
    if (playerObj == null) {
        warn('could not obtain player object from provided id');
        return;
    } 
    let player = playerObj.get('displayname');
    let character = Object.keys(characters).find((c) => characters[c].controlled_by == player);
    return character;
}

async function rollCharacterSave(playerid, saveType, adv) {
    let player = getObj('player', playerid).get('displayname');
    if (saveType == null || saveType == "") {
        warn('no save type passed to function');
        return;
    }
    saveType = saveType.toLowerCase();
    let character = inferCharacter(playerid);
    if (character == null) {
        warn('failed to determine who is rolling a save');
        return;
    }
    switch (saveType) {
        case "str": saveType = 'strength'; break;
        case "dex": saveType = 'dexterity'; break;
        case "con": saveType = 'constitution'; break;
        case "int": saveType = 'intelligence'; break;
        case "wis": saveType = 'wisdom'; break;
        case "cha": saveType = 'charisma'; break;
        default: break;
    }
    let saveModifier = await getAttribute(character, saveType + '_save_bonus');
    inform(character + ' has a ' + (saveModifier >= 0 ? '+' : '') + saveModifier + ' modifier on ' + saveType + ' saves');
    //check if within Paladin aura
    let token = getToken(character);
    let paladin = null; //can specify a getToken("paladin's name"); here to apply aura effect
	let inAura = false;	
	let auraBoost = 0;
	if (paladin != null) {
	    let distance = calculateObjectDistance(token, paladin) * 5 / 70;
	    if (token != null && paladin != null && distance < 14.15) { //a little bigger than 10 * sqrt(2)
	        inAura = true;
			auraBoost = Math.max(1, await getAttribute(paladin, 'charisma_mod'));
	        saveModifier += auraBoost;
	    }
	}
    let advantageStatus = '';
    if (adv == 'Advantage') advantageStatus = ' at advantage';
    else if (adv == 'Disadvantage') advantageStatus = ' at disadvantage';
    let roll = await rollDice(token.get('name'), "1d20" + (saveModifier >= 0 ? '+' : '') + saveModifier, adv);
    let isCrit = roll['d20'] == 20;
    let isCritFail = roll['d20'] == 1;
    roll = roll['total'];
    echo(character + ' rolled a ' + roll + ' on their ' + saveType[0].toUpperCase() + saveType.slice(1) +  ' save' + advantageStatus + (inAura ? ' (including the ' + auraBoost + ' from ' + paladin.get('name') + '\'s aura)' : '') + (isCrit ? ' CRITICAL SUCCESS!' : '') + (isCritFail ? ' CRIT FAIL!' : ''));
}

async function pingToken(tokenName, playerid) {
    inform('Processing request to locate a token named \'' + tokenName + '\'' + ' for player ' + getPlayerName(playerid));
    let token = getToken(tokenName);
    if(!token) {
        warn('cannot find a token named ' + tokenName + ' on this map');
        echo("Sorry, I cannot find a token named '" + tokenName + "'");
        return;
    }
    let controlledby = token.get('controlledby');
    if((!controlledby || controlledby=='') && !playerIsGM(playerid)) {
        warn('rejected player request to find non-allied token ' + tokenName);
        echo("Sorry, I am forbidden from revealing enemy positions to players");
        return;        
    }

    let player = getObj('player', playerid);
    oldcolor = player.get('color');
    setTimeout(function(){
        sendPing(token.get('left'), token.get('top'), Campaign().get('playerpageid'), playerid, true, playerid);
    },10);
}

function getToken(name) {
    if(!name) return null;
    refreshTokens();
    //just a precaution in case someone calls getToken while providing a token itself as an arg...
    try {
        let token = name.get('id');
        return name;
    } catch {}
    let tokenObj = null;
    for(let i = 0; i < tokens.length; i++) {
        if(!tokens[i].get('name')) continue;
        tokenObj = tokens[i];
        if(tokenObj.get('name') !== name) {
            tokenObj = null;
        } 
        if(tokenObj != null) break;
    }
    if(tokenObj == null) {
        trace('could not find a token with nameplate \'' + name + '\'');
        return null;
    }
    return tokenObj;
}

function getTokenId(name) {
    let token = getToken(name);
    if (token == null) return null;
    return token.get('id');
}

function promptCharacterSelection(player) {
    var characterSelectList = "";
    if(tokens.length == 0) warn('no findable tokens!');
    log(playerTokens)
    const ignoreList = ['Lair Actions', 'Fortune Token', 'Misfortune Token', 'Moneybag'];
    tokens
        .filter(t => t.get('name').indexOf('Timer Light') == -1 && !ignoreList.includes(t.get('name')))
        .filter(t => t.get('name') != t.get('id'))
        .filter(t => t.get('left') >= 0 && t.get('top') >= 0)
        .filter(t => (t.get('layer') == 'objects' && playerTokens.includes(t)) || playerIsGM(getPlayerId(player)))
        .sort((a, b) => {
            const nameA = a.get('name');
            const nameB = b.get('name');            
            if (playerTokens != null) {
                if (playerTokens.includes(a) && !playerTokens.includes(b)) {
                    return -1;
                }
                else if (playerTokens.includes(b) && !playerTokens.includes(a)) {
                    return 1;
                }
                else if (playerTokens.includes(a) && playerTokens.includes(b)) {
                    return nameA < nameB ? -1 : 1;
                }
            }

            let nameATokens = nameA.split(" ");
            let nameBTokens = nameB.split(" ");
            let numA = parseInt(nameATokens[nameATokens.length-1]);
            let numB = parseInt(nameBTokens[nameBTokens.length-1]);
            if (numA != NaN && numB != NaN) {
                nameATokens.pop();
                nameBTokens.pop();
                if (nameATokens.join(' ') == nameBTokens.join(' ')) {
                    return numA - numB;
                }
            }
            return nameA < nameB ? -1 : 1;
        })
        .forEach((t) => {
            characterSelectList += '<a href="!find `' + t.get('name') + '`">' + t.get('name') + '</a>';
        }
    );
    let msg = 'Which token do you want to find?<br/>' + characterSelectList;
    debugging(msg);
    whisper(player, msg);
}

function setPosition(t, x, y) {
    let token = getToken(t);
    if (t == null) return;
    token.set({
        'left': x,
        'top': y
    })
}

function findClosestPlayer(reference, excludeList) {
    let t = getToken(reference);
    let distance = Number.MAX_VALUE;
    let closest = null;
    if (excludeList == null) excludeList = [];
    playerTokens.forEach((pt) => {
        let d = calculateObjectDistance(t, pt)
        if (d < distance && //close enough
                (!hasMarker(pt,'fluffy-wing') || hasMarker(t, 'fluffy-wing')) && //reachable
                (!hasMarker(pt, 'dead')) && //ignore corpses
                (!hasMarker(pt, 'invisibility') || t.stats['blindsight'] == true || t.stats['truesight'] == true || (t.stats['tremorsense'] == true && !hasMarker(pt,'fluffy-wing'))) && //perceivable
                (excludeList.find((el) => getToken(el) != null && getToken(el).get('id') == pt.get('id')) == null) // exclude tokens from consideration if names are listed in the exclude list
        ) {
            distance = d
            closest = pt;
        }
    });
    return closest;
}

function adjacent(first, second) {
    let tokenOne = getToken(first);
    let tokenTwo = getToken(second);
    let dx = Math.floor(Math.abs(tokenOne.get('left') - tokenTwo.get('left')));
    let dy = Math.floor(Math.abs(tokenOne.get('top') - tokenTwo.get('top')));
    let max_x = (tokenOne.get('width') + tokenTwo.get('width'))/2;
    let max_y = (tokenOne.get('height') + tokenTwo.get('height'))/2;
    debugging(tokenOne.get('name') + ' is ' + dx + ' away horizontally from ' + tokenTwo.get('name') + ' and must less than ' + max_x + ' to maybe be adjacent');
    debugging(tokenOne.get('name') + ' is ' + dy + ' away vertically from ' + tokenTwo.get('name') + ' and must less than ' + max_y + ' to maybe be adjacent');
    let tokenOneZ = getBadge(tokenOne, 'fluffy-wing');
    let tokenTwoZ = getBadge(tokenTwo, 'fluffy-wing');    
    if (tokenOneZ == null) tokenOneZ = 0;
    else tokenOneZ = Number(tokenOneZ.replace('ft.',''));
    if (tokenTwoZ == null) tokenOneZ = 0;
    else tokenTwoZ = Number(tokenOneZ.replace('ft.',''));  
    
    let same_z = isNaN(tokenOneZ) || isNaN(tokenTwoZ) || Math.abs(tokenOneZ - tokenTwoZ) <= 5; //if we can't parse a z axis value, then the safer assumption is that they're on the same z-index.
    debugging(tokenOne.get('name') + ' is ' + (same_z ? '' : 'NOT ') + 'able to reach ' + tokenTwo.get('name') + ' along the z-axis');
    let isAdjacent = (dx <= max_x && dy <= max_y && same_z);
    debugging(tokenOne.get('name') + ' is ' + (isAdjacent ? '' : 'NOT ') + 'adjacent to ' + tokenTwo.get('name'));
    return isAdjacent;
}

//========================
// CHAT
//========================
function spoof(player, msg) {
    sendChat(player, msg);
}


function whisper(player, msg) {
    debugging("/w \"" + player + "\" " + msg);
    sendChat(chatName, "/w \"" + player + "\" " + msg);
}

function echo(text) {
    text = "" + text;
    sendChat(chatName, text);
}

function emphasis(text) {
    text = "/em " + text;
    sendChat('', text)
}

//========================
// SOUND
//========================

function getSound(title) {
    if(title == null) {
        return;
    }
    let sound_fx = jukebox.find((track) => track.get('title') == title);
    if (sound_fx == null) {
        warn('did not find sound effect named \'' + title + '\'');
    }
    return sound_fx;
}

var activeLoops = [];

async function playSound(title, delay, loop, volume) {
    if(title == null) {
        return;
    }
    let sound_fx = jukebox.find((track) => track.get('title') == title);
    if (sound_fx == null) {
        warn('did not find sound effect named \'' + title + '\'');
    } else {
        if (delay != null && delay > 0) {
            debugging('waiting ' + delay + ' ms before playing');
            await new Promise(r => setTimeout(r, delay));
        }
        if (loop==null) loop = false;
        else {
            activeLoops.push(title);
        }
        if (volume==null) volume = 50;
        sound_fx.set({
            'volume': volume,
            'playing': true,
            'softstop': false,
            'loop': loop
        });
        debugging(sound_fx);
    }
}

async function stopSound(title, delay) {
    if(title == null) {
        return;
    }
    let sound_fx = jukebox.find((track) => track.get('title') == title);
    if (sound_fx == null) {
        warn('did not find sound effect named \'' + title + '\'');
    } else {
        if (delay != null && delay > 0) {
            debugging('delaying ' + delay + ' ms before stopping');
            await new Promise(r => setTimeout(r, delay));
        }
        sound_fx.set({
            'volume': 50,
            'playing': false,
            'softstop': false,
            'loop': false
        });
        debugging(sound_fx);
    }
    activeLoops = activeLoops.filter(l => l != title);
}

//========================
// TEXT + LOGGING
//========================

function prettyPrint(str) {
    if(str == null || str == "") return "";
    let output = str.replace(/([A-Z])/g, " $1");
    if(output.charAt(0) == " ") return output.substring(1);
    else return (output.charAt(0).toUpperCase() + output.slice(1));
}

function debugging(msg) {
    if(debug) {
        log(msg);
        logMessage('DEBUG: ' + new Date().toLocaleString() + ' ' +  msg);
    }
}

function inform(msg) {
    log(msg);
    logMessage('INFORM: ' + new Date().toLocaleString() + ' ' + msg);
}

function trace(msg) {
    log(msg);
    logMessage('TRACE: ' + new Date().toLocaleString() + ' ' + msg);    
}

function warn(msg) {
    log(msg);
    logMessage('ALERT: ' + new Date().toLocaleString() + ' ' + msg);    
}

function logMessage(msg) {
    if (logHandout == null) return;
    logHandout.get('notes', function(text) {
        if (text.length < logFileSizeLimit) {
            logHandout.set('notes', text + '<br>' + msg);
        } else {
            logHandout.set('name', 'API Logging (through ' + new Date().toLocaleString() + ')');
            logHandout = createObj('handout', {
                name: 'API Logging'
            });
            inform('log file full; create new log file created');            
            logHandout.set('notes', msg);
        }
    });
}

function createRollQueryParam(paramName, level, levelScaling) {
    let rollQueryParam = "";
    switch(paramName) {
        case "ally":
            let levelScalingFn = levelScaling[paramName];
            let numAllies = (levelScalingFn != null ? levelScalingFn(level) : 1);
            debugging('numAllies = ' + numAllies);
            for(let i = 1; i <= numAllies; i++) {
                rollQueryParam += (
                    ' ' +
                    paramName + i + '=?{' +  
                    prettyPrint(paramName.replace('(','').replace(')','')) + ' ' + i
                ); 
                playerTokens.forEach((pt) => {rollQueryParam = rollQueryParam + '|' + pt.get('name');})
                rollQueryParam += '}';
            }
            break;
        default:
            rollQueryParam = (' ' + paramName + '=?{'+  prettyPrint(paramName.replace('(','').replace(')','')) + '}');
            break;
    }
    return rollQueryParam;
}

async function rollDice(desc, dice, advantage) {
	if (dice == null) return;
	dice = dice.trim();
	debugging('parsing ' + dice);
	const diceTokens = dice.split('d');
	if (diceTokens.length == 1) {
		if (!isNaN(diceTokens[0])) {
		    let constant = {'total': Number(diceTokens[0]), 'd20': null};
		    return constant;
		}
		echo('malformed dice syntax. please list dice rolls in the form of _d_');
		return {total: null, d20: null};
	} else if (diceTokens.length > 1) {
		const multipleDice = dice.split(/([+-])/);
		let outcome = {'d20': null, 'total': null};
		let operator = '+';
		if (multipleDice != null && multipleDice.length > 1) {
    		for(let d of multipleDice) {
    		    d = d.trim();
    		    if (d == '+') {
    		        operator = '+';
    		        continue;
    		    } else if (d == '-') {
    		        operator = '-';
    		        continue
    		    }
    		    debugging('rolling ' + d + ' (parsed from larger string ' + dice + ')');
    			let diceOutcome = await rollDice(desc, d);
    			if (diceOutcome['total'] == null) {
    				echo('failed to roll ' + d + '! Invalidating entire roll');
    				return diceOutcome;
    			} else {
    				if (operator == '+') {
    				    if (outcome['total'] == null) outcome['total'] = 0;
    				    outcome['total'] += diceOutcome['total'];
    				}
    				else if (operator == '-') {
    				    if (outcome['total'] == null) outcome['total'] = 0;
    				    outcome['total'] -= diceOutcome['total'];
    				}
    				if (outcome['d20'] == null) outcome['d20'] = diceOutcome['d20'];
    			}
    		}
    		return outcome;
		}
	}
	const diceCount = diceTokens[0];
	let dieValueTemp = diceTokens[1];
	const dieValueTokens = dieValueTemp.split('k');
	let keepHighest = null;
	let keepLowest = null;
	if (dieValueTokens.length > 1) {
		if (dieValueTokens[1].charAt(0) == 'h') {
			keepHighest = Number(dieValueTokens[1].substring(1));
			if (isNaN(keepHighest)) {
				echo('malformed syntax: must put a number after "kh"');
				return {total: null, d20: null};
			}
		}
		else if (dieValueTokens[1].charAt(0) == 'l') {
			keepLowest = Number(dieValueTokens[1].substring(1));
			if (isNaN(keepLowest)) {
				echo('malformed syntax: must put a number after "kl"');
				return {total: null, d20: null};
			}			
		}
	}
	let constant = 0;	
	let dieValueTokensTwo = dieValueTemp.split('+');
	if (dieValueTokensTwo.length > 1) {
		constant = Number(dieValueTokensTwo[1]);		
		if (isNaN(constant)) {
			echo('malformed syntax: constants added to dice rolls must be numbers');
			return {total: null, d20: null};
		}		
	}
	dieValueTokensTwo = dieValueTemp.split('-');
	if (dieValueTokensTwo.length > 1) {
		constant = Number(-1 * dieValueTokensTwo[1]);		
		if (isNaN(constant)) {
			echo('malformed syntax: constants added to dice rolls must be numbers');
			return {total: null, d20: null};
		}		
	}	
	const dieValue = Number(dieValueTemp.split(/[k+-]/)[0]);
	if (isNaN(dieValue)) {
		echo('malformed syntax: must provide a numerical value for number of sides on die');
		return {total: null, d20: null};	
	}
    debugging("begin rolling dice");
	let diceRolls = [];
	for (let i = 0; i < diceCount; i++) {
		diceRolls.push(randomInteger(dieValue));
	}
	diceRolls.sort((a, b) => a - b);
    debugging("dice: " + diceRolls);
	if (keepHighest != null) {
		diceRolls = diceRolls.slice(-1 * keepHighest);
	} else if (keepLowest != null) {
		diceRolls = diceRolls.slice(0, keepLowest);
	} else if (advantage != null && advantage.toLowerCase().indexOf('a') == 0) {
		diceRolls = diceRolls.slice(-1);
	} else if (advantage != null && advantage.toLowerCase().indexOf('d') == 0) {
		diceRolls = diceRolls.slice(0,1);
	}
    debugging("dice (keepers): " + diceRolls);
	let dTwentyOutcome = null;	
	if (dieValue == 20 && diceRolls.length == 1) {
		dTwentyOutcome = diceRolls[0];
	}	
	const sum = diceRolls.reduce((sum, num) => sum + num, constant);
    const result = {'total': sum, 'd20': dTwentyOutcome};
    debugging(result);
    return result;
}

function unencodeUrlString(text) {
    if (text == null || text.length == 0) return;
    text = text.replaceAll("%20", " ");
    text = text.replaceAll("%21", "!");
    text = text.replaceAll("%22", '"');
    text = text.replaceAll("%23", "#");
    text = text.replaceAll("%24", '$');
    text = text.replaceAll("%26", "&");
    text = text.replaceAll("%27", "'");
    text = text.replaceAll("%28", "(");
    text = text.replaceAll("%29", ")");
    text = text.replaceAll("%2A", "*");
    text = text.replaceAll("%2B", "+");
    text = text.replaceAll("%2C", ",");
    text = text.replaceAll("%2D", '-');
    text = text.replaceAll("%2E", '.');
    text = text.replaceAll("%2F", "/");
    text = text.replaceAll("%3A", ":");
    text = text.replaceAll("%3B", ";");
    text = text.replaceAll("%3C", '<');
    text = text.replaceAll("%3D", "=");
    text = text.replaceAll("%3E", '>');
    text = text.replaceAll("%3F", '?');
    text = text.replaceAll("%40", '@')
    text = text.replaceAll("%5B", '[');
    text = text.replaceAll("%5C", '\\');
    text = text.replaceAll("%5D", ']');
    text = text.replaceAll("%5E", '^');
    text = text.replaceAll("%5F", '_');
    text = text.replaceAll("%60", '`');
    text = text.replaceAll("%7B", '{');
    text = text.replaceAll("%7C", '|');
    text = text.replaceAll("%7D", '}');
    text = text.replaceAll("%7E", '~');
    text = text.replaceAll("%25", '%');
    return text;
}

//========================
// UNIVERSE_TIME
//========================

function initClock() {
    const CLOCK_TEXT_SIZE=46;
    clock = null;
    clock = findObjs({_type: 'text', font_size: CLOCK_TEXT_SIZE, _pageid: Campaign().get("playerpageid")});
    if (clock != null && clock.length > 0) clock = clock[0];
    else {
        let page = currentPage = getObj('page', Campaign().get('playerpageid'));
        if (page == null) return;
        let pageWidth = 70 * Number(page.get('width'));
        let pageHeight = 70 * Number(page.get('height'));
        
        clock = createObj('text', {
            _pageid: Campaign().get("playerpageid"),      
            layer: 'map',
            font_size: CLOCK_TEXT_SIZE,
            left: pageWidth - 300,
            top:  (BOX_HEIGHT/3),
            font_family: "Arial",
            stroke: "#FF0000",
            color: "#FF0000",
            text: ""
        });  
        toFront(clock);
    } 
    updateUniverseTime();
}

async function updateUniverseTime(newTime) {
    if (clockDoc == null && newTime != null) {
        emphasis('failed to store updated universe time in non-volatile doc. Please be sure you wrote the updated time down somewhere');
    }
    if (newTime == null) { //Initializing- read from doc
        await sleepMS(1000);
        inform('init universe clock by reading from clock-doc');
        await clockDoc.get('notes', function(text) {
            newTime = text;
            if (text.indexOf('<p>') == 0) newTime = text.slice(3,-4);
        });
        inform('read time: ' + newTime);
    } else { 
        clockDoc.get('notes', function(text) {
            let current = text;
            if (current.indexOf('<p>') === 0) {
                current = current.slice(3, -4);
            }
            // Parse current time string
            const timeRegex = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d+)\/(\d+)\s+(\d+)\s+(AM|PM),\s+(\d+)\s+AR$/;
            const match = current.match(timeRegex);
            if (!match) {
                warn('Failed to parse current universe time: ' + current);
                return;
            }
            let [, weekday, month, day, hour, ampm, year] = match;
            month = Number(month);
            day = Number(day);
            year = Number(year);
            hour = Number(hour);
        
            if (ampm === 'PM' && hour !== 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
        
            const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            let weekdayIndex = weekdays.indexOf(weekday);
        
            const delta = { y: 0, m: 0, d: 0, h: 0 };
            const deltaRegex = /(\d+)([ymdh])/gi;
            let dmatch;
            
            while ((dmatch = deltaRegex.exec(newTime)) !== null) {
                const unit = dmatch[2].toLowerCase(); // normalize
                delta[unit] += Number(dmatch[1]);
            }
        
            // Apply deltas
            year += delta.y;
            month += delta.m;
            day += delta.d;
            hour += delta.h;
        
            let daysAdded = 0;        
            
            // Normalize hour → day
            if (hour >= 24) {
                day += Math.floor(hour / 24);
                daysAdded += Math.floor(hour / 24);                
                hour = hour % 24;
            }
        
            // Normalize day → month
            if (day > 30) {
                month += Math.floor((day - 1) / 30);
                daysAdded += Math.floor((day - 1) / 30) * 30;                
                day = ((day - 1) % 30) + 1;
            }
        
            // Normalize month → year
            if (month > 12) {
                year += Math.floor((month - 1) / 12);
                daysAdded += Math.floor((month - 1) / 12) * 360;                
                month = ((month - 1) % 12) + 1;
            }
        
        
            daysAdded += delta.d + delta.m * 30 + delta.y * 360;
        
            weekdayIndex = (weekdayIndex + daysAdded) % 7;
            weekday = weekdays[weekdayIndex];
        
            // Convert hour back to AM/PM
            let displayHour = hour;
            let displayAmPm = 'AM';
            if (displayHour === 0) {
                displayHour = 12;
            } else if (displayHour === 12) {
                displayAmPm = 'PM';
            } else if (displayHour > 12) {
                displayHour -= 12;
                displayAmPm = 'PM';
            }
        
            newTime = `${weekday} ${month}/${day} ${displayHour} ${displayAmPm}, ${year} AR`;
            clockDoc.set('notes', newTime)
        });
    }
    if (newTime != null) {
        inform('setting clock to ' + newTime);
        clock.set("text", newTime);
        toFront(clock);
    }
}

//========================
// MISC
//========================


async function sleepMS(delayMs) {
    await new Promise((r) => setTimeout(r, delayMs));    
}

async function delayMS(delayMs) {
    await sleepMS(delayMs);
}

function monitorLoadingPages() {
    setInterval(() => {
        let page = getObj('page', Campaign().get('playerpageid'));
        let pageName = page.get('name');
        if (pageName.length > 6 && pageName.slice(0, 6) == "Slide ") {
            let slideNumber = Number(pageName.slice(6));
            if (!isNaN(slideNumber)) {
                let nextSlide = slideNumber
                while (nextSlide == slideNumber) {
                    nextSlide = randomInteger(52);
                }
                let nextPage = findObjs({_type:'page'}).find((n) => n.get('name') == ("Slide " + nextSlide));
                if (nextPage != null) {
                    let nextPageId = nextPage.get('id');
                    Campaign().set('playerpageid', nextPageId);
                    inform('change loading page to Slide ' + nextSlide);
                }
            }
        }
    }, 25000);
}

var savesSnapshot = [];
var saves = [];
var expirationCheck = 0;

function monitorSaveResults() {
    setInterval(async function() {
        if (savesSnapshot == saves && saves.length > 0) {
            if (++expirationCheck >= 10) {
                log(saves);
                expirationCheck = 0;
                saves = [];
            }
        }
        if (savesSnapshot == saves && saves.length > 0 && saves.every(s => s.outcome != 'pending')) {
            let msg = '========RESULTS========';
            saves.forEach(s => {
                msg += ('<br>' + s.name + ': ' + s.outcome + ' (' + s.value + ')');
            });
            emphasis(msg);
            saves = [];
        }
        savesSnapshot = saves;
    }, 1000);
}


//========================
// ONE-OFFS
//========================

async function gatlingAttack(e, target) {
    let params={};
    params.dc = 15;
    params.stat = 'dex';
    params.dmgType = 'piercing';
    if (e != null) {
        params.dmg = await rollDice(e.token.get('name'), '6d6');
        params.dmg = params.dmg['total'];
        echo("(" + e.token.get('name') + ' rolled ' + params.dmg + ' piercing damage)')
    }
    else params.dmg = 1; //don't think we need this... it's just a dummy value to avoid breaking, just in case
    await rollTokenSave(target, params);
}
