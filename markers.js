class Marker {
    constructor(name, marker, savingThrowStat, startOfTurnCallback, endOfTurnCallback, onRemoval, autoBadge) {
        this.name = name;
        this.marker = marker;
        this.savingThrowStat = savingThrowStat;
        this.startOfTurnCallback = startOfTurnCallback;
        this.endOfTurnCallback = endOfTurnCallback;
        this.onRemoval = onRemoval;
        this.autoBadge = autoBadge;
    }
}

var markerRequestQueue = [];

var markers = [
    new Marker('advantage', 'blue'),
    new Marker('aid', 'aid'),
    new Marker('airborne', 'fluffy-wing'),
    new Marker('armorOfAgathys', 'armorofagathys'),
    new Marker('auraOfVitality', 'auraofvitality'),
    new Marker('bane', 'bane'),
    new Marker('bardicInspiration', 'bardicinspiration', null, null, null, null, 'Bardic'),
    new Marker('banishment', 'banishment'),
    new Marker('beaconOfHope', 'beaconofhope'),
    new Marker('bestowCurse', 'bestowcurse'),
    new Marker('blinded', 'sheet-blinded', 'con', null, tryToShakeCondition),	
    new Marker('bless', 'bless'),	
    new Marker('blur', 'blur'),
    new Marker('boomingBlade', 'boomingblade'),
    new Marker('calmEmotions', 'calmemotions'),
    new Marker('charmPerson', 'charmperson'),
    new Marker('chilltouch', 'chilltouch'),
    new Marker('command', 'command'),
    new Marker('concentration', 'concentration'),
    new Marker('confusion', 'broken-skull', 'wis', confusionRoll, tryToShakeCondition),
    new Marker('compelledDuel', 'compelledduel'),
    new Marker('crownOfMadness', 'crownofmadness', 'wis', null, tryToShakeCondition),    
    new Marker('dead', 'dead'),
    new Marker('deafened', 'sheet-deafened', 'con', null, tryToShakeCondition),
    new Marker('disadvantage', 'red'),
    new Marker('divineFavor', 'divinefavor'),
    new Marker('emboldeningBond', 'all-for-one'),
    new Marker('enhanceAbilityStrength', 'enhanceabilitystrength'),
    new Marker('enhanceAbilityDexterity', 'enhanceabilitydexterity'),
    new Marker('enhanceAbilityConstitution', 'enhanceabilityconstitution'),
    new Marker('enhanceAbilityIntelligence', 'enhanceabilityintelligence'),
    new Marker('enhanceAbilityWisdom', 'enhanceabilitywisdom'),
    new Marker('enhanceAbilityCharisma', 'enhanceabilitycharisma'),
    new Marker('enlarged', 'enlarged', null, null, null, shrink),
    new Marker('ensnaringStrike', 'ensnaringstrike', 'str', ensnaringStrikeStartOfTurn),
    new Marker('expeditiousRetreat', 'expeditiousretreat'),
    new Marker('faerieFire', 'faeriefire'),
    new Marker('featherFall', 'featherfall'),
    new Marker('freedomOfMovement', 'freedomofmovement'),
    new Marker('frightened', 'sheet-frightened'),    
    new Marker('grappled', 'sheet-grappled'),
    new Marker('guidance', 'guidance'),
    new Marker('guidingBolt', 'guidingbolt'),
    new Marker('gunJammed', 'gunjammed'),
    new Marker('haste', 'haste', null, null, null, becomeLethargic),
    new Marker('heatMetal', 'heatmetal'),
    new Marker('hemorrhagingCurse', 'hemorrhagingcurse'),
    new Marker('heroism', 'heroism', null, heroismStartOfTurn),
    new Marker('hex', 'hex'),
    new Marker('holdMonster', 'holdmonster', 'wis', null, tryToShakeCondition),
    new Marker('holdPerson', 'holdperson', 'wis', null, tryToShakeCondition),
    new Marker('huntersMark', 'huntersmark'),
    new Marker('hypnoticPattern', 'hypnoticpattern'),
    new Marker('illriggerSeal','illriggerseal', null, null, null, null, "1"),
    new Marker('immobilized', 'cobweb'),
    new Marker('incapacitated', 'sheet-incapacitated'),
    new Marker('intellectFortress', 'intellectfortress'),
    new Marker('invisibility', 'invisibility'),
    new Marker('jump', 'jump'),
    new Marker('lethargic', 'lethargic', null, skipTurnFromLethargy),
    new Marker('mageArmor', 'magearmor', null, null, null, restoreAc),
    new Marker('melfsAcidArrow', 'melfsacidarrow', null, null, melfsEndOfTurn),
    new Marker('mindSliver', 'mindsliver'),
    new Marker('mirrorImage', 'mirrorimage'),
    new Marker('otilukesResilientSphere', 'otilukesresilientsphere'),
    new Marker('paralyzed', 'sheet-paralyzed'),
    new Marker('passWithoutTrace', 'passwithouttrace'),
    new Marker('petrified', 'padlock'),
    new Marker('poisoned', 'sheet-poisoned'),
    new Marker('polymorph', 'polymorph'),
    new Marker('prone', 'sheet-prone', null, standUp),
    new Marker('protectionFromEnergyAcid', 'protectionfromenergyacid'),    
    new Marker('protectionFromEnergyCold', 'protectionfromenergycold'),    
    new Marker('protectionFromEnergyFire', 'protectionfromenergyfire'),    
    new Marker('protectionFromEnergyLightning', 'protectionfromenergylightning'),    
    new Marker('protectionFromEnergyThunder', 'protectionfromenergythunder'),    
    new Marker('protectionFromEvilAndGood', 'protectionfromevilandgood'),
    new Marker('rage', 'rage'),
    new Marker('rayOfFrost', 'rayoffrost', null, null, null, increaseSpeedByTen),
    new Marker('reduced', 'reduced', null, null, null, grow),
    new Marker('restrained', 'sheet-restrained'),    
    new Marker('sanctuary', 'sanctuary'),
    new Marker('sanguinespears', 'sanguinespears'),
    new Marker('searingSmite', 'searingsmite', 'con', searingSmiteStartOfTurn),
    new Marker('shield', 'shield', null, unshield),
    new Marker('shieldOfFaith', 'shieldoffaith', null, null, null, reduceACByTwo),
    new Marker('shockingGrasp', 'shockinggrasp'),
    new Marker('sickeningRadiance', 'sickeningradiance'),
    new Marker('silence', 'silence'),
    new Marker('sleep', 'sleepy'),
    new Marker('slow', 'slow', 'wis', null, slowEndOfTurn),
    new Marker('spiritGuardians', 'spiritguardians'),
    new Marker('starryFormChalice', 'trophy'),
    new Marker('stunned', 'sheet-stunned'),
    new Marker('synapticStatic', 'synapticstatic', 'int', null, tryToShakeCondition),
    new Marker('tashasCausticBrew', 'chemical-bolt', null, tashasCausticBrewDamage),
    new Marker('tashasHideousLaughter', 'tashashideouslaughter', 'wis', null, tashasHideousLaughterEndOfTurn),
    new Marker('unconscious', 'sheet-unconscious'),
    new Marker('viciousMockery', 'viciousmockery'),
    new Marker('wardingBond', 'wardingbond'),	
    new Marker('wrathfulSmite', 'wrathfulsmite'),
];

on("ready", function(){
    getMarkerTrackingDoc();
    on('change:graphic:statusmarkers', function(obj, prev) {
        checkAutoBadge(obj, prev, 'bardicinspiration');
        checkAutoBadge(obj, prev, 'illriggerseal');
        updateMarkerTracking(obj, false);
        let removedMarkers = getRemovedMarkers(obj, prev);
        if (removedMarkers != null) {
            removedMarkers.forEach(rm => {
                debugging('checking ' + rm);
                const marker = markers.find(m => m.name.toLowerCase() == rm.toLowerCase() || m.marker.toLowerCase() == rm.toLowerCase());
                debugging('looked up marker:');
                debugging(marker);
                if (marker != null && marker.onRemoval != null) marker.onRemoval(obj);
            });
        }
    }); 
    
    on('destroy:graphic', function(obj) {
        updateMarkerTracking(obj, true);
    });
    
    on('change:graphic:left', function(obj, prev) {
        if (obj == null) return;
        checkBoomingBlade(obj);
    });
    
    on('change:graphic:top', function(obj, prev) {
        if (obj == null) return;
        if (obj.get('left') != prev.left) return; //ignore; the change:graphic:left function will handle it
        checkBoomingBlade(obj);
    });
});

async function checkBoomingBlade(obj) {
    if (obj == null) return;
    let dmg = getBadge(obj, 'boomingblade');
    if (dmg == null) return;
    let dmgRoll = await rollDice(null, dmg);
    dmgRoll = dmgRoll['total'];
    playSound('boomingblade', null, null, 80);
    let hp = Number(obj.get('bar3_value'));
    if (isNaN(hp)) {
        warn('hp value not present on target!');
    }
    else {
        hp -= dmgRoll;
        obj.set({'bar3_value': hp});
    }
    echo('The booming energy detonates, dealing <b>' + dmgRoll + '</b> dmg to ' + obj.get('name'));
    clearMarker(obj, 'boomingblade');
}

function getRemovedMarkers(obj, prev) {
    const objMarkers = getMarkers(obj);
    debugging('current markers:');
    debugging(objMarkers);
    let statusMarkers = prev.statusmarkers.split(',');
    for (let i = 0; i < statusMarkers.length; i++) {
        if(statusMarkers[i].indexOf('::')>=0) statusMarkers[i] = statusMarkers[i].slice(0,statusMarkers[i].indexOf('::'));
    }
    const prevMarkers = statusMarkers;
    debugging('prev markers:');
    debugging(prevMarkers);
    const removedMarkers = prevMarkers.filter(pm => !objMarkers.includes(pm));
    debugging('removed markers:');
    debugging(removedMarkers);
    return removedMarkers;
}

function checkAutoBadge(obj, prev, type) {
    let marker = markers.find(m => m.name.toLowerCase() == type);
    if (marker == null || marker.autoBadge == null) return;
    let markerType = marker.marker;
    if (markerType == null || markerType.length == 0) return;
    if (prev.statusmarkers != null && prev.statusmarkers.indexOf(markerType) == -1 && obj.get('statusmarkers').indexOf(markerType) >= 0) {
        addBadge(obj, markerType, marker.autoBadge);
    }
}

//I can hardly ever remember what the right name of the function is, so why not make some aliases for it...
async function addMarker(name, type, badge, links, expiration) {
    addTokenStatusMarker(name, type, badge, links, expiration);
}

async function setMarker(name, type, badge, links, expiration) {
    addTokenStatusMarker(name, type, badge, links, expiration);
}

async function addTokenStatusMarker(name, type, badge, links, expiration) {
    let debugName = name;
    const inputType = type;
    if (typeof name === 'object') {
        debugName = name + '(' + name.get('name') + ')';
    }
    debugging('calling addTokenStatusMarker(' + debugName + ', ' + type + ', ' + badge + ', ' + links + ', ' + expiration + ')');    
    let token = getToken(name);
    if (!token) {
        return;
    }
    let isNext = false;
    //wait up to 3 seconds for my request to be next
    //admittedly, having a separate queue processor method wouldve been a cleaner approach. too late now! 
    markerRequestQueue.push({'name': name, 'type': type, 'badge': badge, 'request': 'add', 'expiresAt': Date.now() + 1500});
    let queueSnapshot = markerRequestQueue.slice();    
    for(let i = 0; i < 30; i++) {
        //create a clone of the array we can safely look at
        queueSnapshot = markerRequestQueue.slice();
        if (queueSnapshot == null || queueSnapshot.length == 0) {
            warn('enqueueing issue! abort');
        }
        let nextInQueue = queueSnapshot[0];
        if (nextInQueue == null) {
            warn('enqueueing issue! abort');
            return;
        }
        //our number has been called! let's process!
        if (nextInQueue['name'] == name && nextInQueue['type'] == type && nextInQueue['badge'] == badge && nextInQueue['request'] == 'add') {
            isNext = true;
            break;
        } else {
            debugging('waiting on:');
            debugging(nextInQueue);
        }
        //if the queue has an expired request at the front, nothing will process it; clear it out because otherwise it'll jam the queue
        if(nextInQueue['expiresAt'] < Date.now()) {
            markerRequestQueue = queueSnapshot.slice(1);
        }
        await new Promise(r => setTimeout(r, 100));
    }
    if (!isNext) {
        warn('failed to have request acknowledged; abort')
        return;
    }
    let statusmarkers = token.get('statusmarkers');
    
    let temp = JSON.parse(Campaign().get("token_markers")).find((tm) => tm.name == type.toLowerCase());
    if (temp != null) {
        temp = temp.tag;
    } else { 
        
        temp = markers.find((m) => m.name == type.toLowerCase());
        if(temp != null) temp = temp.marker;
    }
    if (temp!=null && temp.length >0) {
        type = temp;
        if (badge != null) type = type + '@' + badge;
    }
    if ((inputType == 'grappled'|| inputType == 'restrained'|| inputType == 'paralyzed' || inputType == 'holdPerson' || inputType == 'holdMonster') && hasMarker(token,'freedomOfMovement')) {
        const conditionStr = (inputType == 'holdPerson' || inputType == 'holdMonster') ? 'paralyzed' : inputType;
        emphasis(token.get('name') + ' is currently immune to being ' + conditionStr + ' thanks to freedom of movement!'); 
        markerRequestQueue = markerRequestQueue.slice(1);
        return;
    }
    //append type to existing status markers if status markers already exist
    if(statusmarkers != null && statusmarkers.length > 0) {
        if(statusmarkers.indexOf(type) >= 0) {
            debugging('refusing to add duplicate ' + type + ' marker');
            markerRequestQueue = markerRequestQueue.slice(1);
            return; //avoid putting a duplicate marker on token
        }
        type = statusmarkers + "," + type;
    }
    try {
        let e = lookupEnemy(token);
        if (e != null) {
            debugging('check if ' + token.get('name') + ' is immune to the ' + inputType + ' condition');
            if (e.isImmuneTo(inputType)) {
                markerRequestQueue = markerRequestQueue.slice(1);
                return;
            }
        }
    } catch {
        warn('error checking if ' + token.get('name') + ' is immune to the ' + inputType + ' condition');
    }
    debugging('adding ' + inputType + ' to markers for ' + name);
    token.set('statusmarkers',type);
    markerRequestQueue = markerRequestQueue.slice(1);
    let trackingType = inputType;
    if(trackingType.indexOf('::')>=0) trackingType = trackingType.slice(0,trackingType.indexOf('::'));
    if(trackingType.indexOf('@')>=0) trackingType = trackingType.slice(0,trackingType.indexOf('@'));      
    if (links != null) {
        const source = {
            'id': token.get('id'),
            'marker': trackingType,
        }
        if (Array.isArray(links)) {
            for (const link of links) {
                let linkObj = getObj('graphic', link.id);
                if (link.marker != null && !hasMarker(linkObj, link.marker)) {
                    debugging('re-add erroneously removed marker from target'); //this happens if we concentrate a spell with multiple targets, then cast it again and change some but not all of the targets
                    addTokenStatusMarker(linkObj, link.marker);
                }
            }
        } else {
            let linkObj = getObj('graphic', links.id);
            if (links.marker != null && !hasMarker(linkObj, links.marker)) {
                debugging('re-add erroneously removed marker from target'); //this happens if we concentrate a spell with multiple targets, then cast it again and change some but not all of the targets
                addTokenStatusMarker(linkObj, links.marker);
            }            
        }
        addMarkerTracker(source, links);
    }
    if (expiration != null) {
        let source = {
            'id': token.get('id'),
            'marker': trackingType,
        }        
        source = {...source, ...expiration}   
        addMarkerTracker(source);        
    }
}

async function concentrate(name, badge, duration, links) {
    debugging(name + ' to begin concentrating on ' + badge);
    if (duration == null || isNaN(duration)) duration = 10;
    badge = badge + "/" + duration;
    if(isConcentrating(name)) {
        let oldBadge = getBadge(name, 'concentration');
        let message = name + " stopped concentrating on ";
        message += (oldBadge != null && oldBadge.length > 0 ? oldBadge : "its previous spell");
        message += " to concentrate on ";
        message += (badge != null && badge.length > 0 ? badge : "a new one");
        await clearMarker(name, 'concentration');
        addTokenStatusMarker(name, 'concentration', badge, links);
        return;
    }
    //a poor attempt at thread-safing by trying to make this yield to other token marker updates
    await new Promise(r => setTimeout(r, 500));    
    addTokenStatusMarker(name, 'concentration', badge, links);
}

function getBadge(name, marker) {
    if(!hasMarker(name, marker)) return null;
    let token = getToken(name);
    if (token == null) {
        return false;
    }
    name = token.get('name');
    debugging('checking if ' + name + ' has the "' + marker + '" marker' );
    let temp = markers.filter((k) => k.name == marker && k.marker != null);
    if (temp != null && temp.length > 0) {
        marker = temp[0].marker;
        debugging('switch to checking if ' + name + ' has the "' + marker + '" marker' );
    }
    if (token.get('statusmarkers') == null || token.get('statusmarkers').length == 0) return false;
    let statusMarkers = token.get('statusmarkers').split(',');
    debugging('MARKERS FOR ' + name.toUpperCase());
    debugging(statusMarkers);
    for (let i = 0; i < statusMarkers.length; i++) {
        let doubleColonIndex = statusMarkers[i].indexOf('::');
        if(doubleColonIndex >=0) {
            let badgeIndex = statusMarkers[i].indexOf('@');
            if (badgeIndex > doubleColonIndex) statusMarkers[i] = statusMarkers[i].slice(0,doubleColonIndex) + statusMarkers[i].slice(badgeIndex);
            else statusMarkers[i] = statusMarkers[i].slice(0,doubleColonIndex);
        }
    }    
    let markerFound = statusMarkers.find((sm) => sm.indexOf(marker) == 0);
    if(markerFound == null || markerFound.indexOf('@') < 0) return null;
    let badge = markerFound.slice(1+markerFound.indexOf('@'));
    inform('got badge: ' + badge);
    return badge;
}

function hasMarker(name, marker, badge) {
    let token = getToken(name);
    if (token == null) {
        return false;
    }
    name = token.get('name');
    debugging('checking if ' + name + ' has the "' + marker + '" marker' );
    let temp = markers.filter((k) => k.name == marker && k.marker != null);
    if (temp != null && temp.length > 0) {
        marker = temp[0].marker;
        debugging('switch to checking if ' + name + ' has the "' + marker + '" marker' );
    }
    if (token.get('statusmarkers') == null || token.get('statusmarkers').length == 0) return false;
    let statusMarkers = token.get('statusmarkers').split(',');
    debugging('MARKERS FOR ' + name.toUpperCase());
    debugging(statusMarkers);
    for (let i = 0; i < statusMarkers.length; i++) {
        if(statusMarkers[i].indexOf('::')>=0) statusMarkers[i] = statusMarkers[i].slice(0,statusMarkers[i].indexOf('::'));
        if(badge == null && statusMarkers[i].indexOf('@')>=0) statusMarkers[i] = statusMarkers[i].slice(0,statusMarkers[i].indexOf('@'));
    }    
    let markerFound = statusMarkers.find((sm) => (badge == null && sm == marker) || (badge != null && sm == (marker + '@' + badge)));
    inform(name + (markerFound ? ' has ' : ' does NOT have ') + 'the ' + marker + ' marker');
    return (markerFound != null);    
}

function isConcentrating(name) {
    debugging('checking if ' + name + ' is concentrating');
    let result = hasMarker(name, 'concentration');
    debugging ('(is ' + (result ? '' : 'NOT ') + 'concentrating)');
    return result;
}

function dropConcentration(name) {
    debugging('dropping concentration for ' + name);
    if (!isConcentrating(name)) return;
    clearTokenMarker(name, 'concentration');
}

function getMarkers(token) {
    if(token == null) {
        warn('invalid token was selected for marker lookup');
        return null;
    }  
    let t = getToken(token); //in case arg is a token name, not a token itself
    if (t == null) {
        return null;
    }
    let statusMarkers = t.get('statusmarkers').split(',');
    for (let i = 0; i < statusMarkers.length; i++) {
        if(statusMarkers[i].indexOf('::')>=0) statusMarkers[i] = statusMarkers[i].slice(0,statusMarkers[i].indexOf('::'));
    }
    return statusMarkers;
}

function explainMarkers(player, token) {
    if(token == null) {
        warn('invalid token was selected for marker lookup');
        return;
    }  
    let t = token.get('name');
    let msg = t + " is marked as having the following conditions/spell effects: ";
    debugging(t + ' has the following status markers: ' + token.get('statusmarkers'));
    if (token.get('statusmarkers')==null || token.get('statusmarkers')==="")  {
        msg = t + "'" + (t.charAt(t.length-1) == 's' ? '' : 's') + " token currently has no markers on it";
    } else {
        let statusMarkers = getMarkers(token);
        statusMarkers.forEach((m) => {
            let marker = markers.find((k) => k.marker==m || (m.indexOf('@') > 0 && k.marker == m.slice(0,m.indexOf('@'))));
            if (marker!=null) {
                if (m.indexOf('@') > 0) msg = msg + prettyPrint(marker.name) + ' (' + m.slice(1 + m.indexOf('@')) + '), ';
                else msg = msg + prettyPrint(marker.name) + ", ";
            }
        });
        msg = msg.slice(0,-2);//remove the trailing comma and whitespace
    }
    whisper(player, msg);
}

//bypassMarkerTracking really exists just for the purpose of our concentration countdown...
//we don't want the deletion and re-badging to clear the markers tied to the concentration
async function clearMarker(name, type, badge, bypassMarkerTracking) {
    return await clearTokenMarker(name, type, badge, bypassMarkerTracking);
}

async function clearTokenMarker(name, type, badge, bypassMarkerTracking) {
    let debugName = name;
    if (typeof name === 'object') {
        debugName = name + '(' + name.get('name') + ')';
    }
    debugging('calling clearTokenMarker(' + debugName + ', ' + type + ', ' + badge + ')');
    if (type == null || name == null) return;
    let token = getToken(name);
    if (!token) {
        return false;
    } try {    
        //wait up to 3 seconds for my request to be next
        //admittedly, having a separate queue processor method wouldve been a cleaner approach. too late now! 
        markerRequestQueue.push({'name': name, 'type': type, 'badge': badge, 'request': 'clear', 'expiresAt': Date.now() + 3000});
        let queueSnapshot = markerRequestQueue.slice();    
        for(let i = 0; i < 30; i++) {
            //create a clone of the array we can safely look at
            queueSnapshot = markerRequestQueue.slice();
            if (queueSnapshot == null || queueSnapshot.length == 0) {
                warn('enqueueing issue! abort');
            }
            let nextInQueue = queueSnapshot[0];
            if (nextInQueue == null) {
                warn('enqueueing issue! abort');
                return;
            }
            //our number has been called! let's process!
            if (nextInQueue['name'] == name && nextInQueue['type'] == type && nextInQueue['badge'] == badge && nextInQueue['request'] == 'clear') {
                isNext = true;
                break;
            }
            //if the queue has an expired request at the front, nothing will process it; clear it out because otherwise it'll jam the queue
            if(nextInQueue['expiresAt'] < Date.now()) {
                markerRequestQueue = queueSnapshot.slice(1);
            }
            await new Promise(r => setTimeout(r, 100));
        }
        if (!isNext) {
            warn('failed to have request acknowledged; abort')
            return;
        }
        debugging('getting status markers for ' + token.get('name'));
        let statusMarkers = token.get('statusmarkers').split(',');
        debugging(token.get('name') + ' has status markers: ' + statusMarkers);
        const statusMarkersLower = statusMarkers.map(m => m.toLowerCase());
        let index = -1;
        for (let i = 0; i < statusMarkersLower.length; i++) {
            debugging('check if ' + type + ' corresponds to ' + statusMarkersLower[i]);
            const markerObj = markers.find((m) => m.name.toLowerCase() == type.toLowerCase() || m.marker.toLowerCase() == type.toLowerCase());
            if (markerObj == null) continue;
            let marker = markerObj.marker;
            let badgeString = '';
            if (badge != null) badgeString = ('@' + badge);
            if(statusMarkersLower[i].indexOf(type.toLowerCase() + badgeString) == 0 || statusMarkersLower[i].indexOf(marker.toLowerCase() + badgeString) == 0) {
                index = i;
                if (markerObj.onRemoval != null) markerObj.onRemoval(token);
                break;
            }
        }
        if (index >= 0) {
            debugging('found "' + type + '" marker at index ' + index + '; splice(' + index + ',1)');
            statusMarkers.splice(index, 1);
            let updatedMarkers = "";
            for (let i = 0; i < statusMarkers.length; i++) {
                updatedMarkers += statusMarkers[i];
                updatedMarkers += ',';
            }
            if(updatedMarkers.length > 0) updatedMarkers = updatedMarkers.slice(0,-1); //remove trailing comma
            debugging('set statusmarkers on "' + token.get('name') + '" to ' + updatedMarkers);
            debugging('update to ' + updatedMarkers);
            token.set('statusmarkers', updatedMarkers);
        } else {
            debugging(type + ' marker not found on ' + token.get('name'));
        }
        markerRequestQueue = markerRequestQueue.slice(1);
        if (type != null) {
            if(type.indexOf('::')>=0) type = type.slice(0,type.indexOf('::'));
            if(type.indexOf('@')>=0) type = type.slice(0,type.indexOf('@'));
        }
        if(!bypassMarkerTracking) {
            let children = getMarkerTrackingForSource(token);
            debugging('from clearTokenMarker: got ' + (children ? children.length : 0) + ' tracker(s) where source equals ' + token.get('id'));
            if (children != null) {
                children = children.filter(c => c.source.marker == type && c.target != null);
                if (children.length > 0) {
                    children.forEach(c => {
                        let targetObj = getObj('graphic', c.target.id);
                        if (targetObj == null) targetObj = getObj('pathv2', c.target.id);
                        if (c.target.marker != null) {
                            clearMarker(targetObj, c.target.marker);
                        }
                        else if (c.target.isSummon == true) {
                            targetObj.remove();
                        }
                        else if (c.target.isAura1 == true) {
                            targetObj.set({'aura1_radius': null});
                        }
                        else if (c.target.isAura2 == true) {
                            targetObj.set({'aura2_radius': null});
                        }
                    });
                }
                
            }
            let parent = getMarkerTrackingForTarget(token);
            debugging('from clearTokenMarker: got ' + (parent ? parent.length : 0) + ' tracker(s) where target equals ' + token.get('id'));
            if (parent != null && parent.length > 0) {
                if (parent.find(p => p.target.isSummon == true)) {
                    token.remove();
                }
                else if (parent.find(p => p.target.isAura1 == true)) {
                    token.set({
                        'aura1_radius': null
                    });
                } 
                else if (parent.find(p => p.target.isAura2 == true)) {
                    token.set({
                        'aura2_radius': null
                    });
                }                 
            } 
            removeMarkerTracker(null, {'id': token.get('id'), 'marker': type});
            removeMarkerTracker({'id': token.get('id'), 'marker': type});
        }
    } catch (e) {
        warn('exception thrown in clearTokenMarker');
        debugging(e.message);
        debugging(e.stack);
        return false;
    }
    return true;
}

async function clearMarkersOnTokens() {
    tokens.forEach((t) =>  t.set('statusmarkers',""));
    if (markerTrackingDoc) markerTrackingDoc.set('notes', '[]');    
}

async function markToken(t, params) {
    addTokenStatusMarker(params.target, params.type);
}

function isDead(name) {
    return hasMarker(name, 'dead');
}

async function addBadge(t, marker, badge) {
    if (t == null || marker == null) return;
    let token = getToken(t);
    if (badge == null) badge = '';
    marker = markers.find(m => m.name == marker || m.marker == marker);
    if (marker == null) return;
    if (!hasMarker(token.get('name'), marker.name)) addTokenStatusMarker(token, marker.name, badge);
    else {
        let statusMarkerStr = token.get('statusmarkers');
        let startPoint = statusMarkerStr.indexOf(marker.marker);
        if (statusMarkerStr.charAt(startPoint + marker.marker.length) == '@') return; //we won't edit an existing badge
        clearMarker(token, marker.name);
        addTokenStatusMarker(token, marker.name, badge);
    }
}

// MARKER TRACKING

var markerTrackingDoc = null;

async function getMarkerDoc() {
    getMarkerTrackingDoc();
}

async function getMarkerTrackingDoc() {
    let docs = findObjs({ _type: 'handout', name: 'Marker Tracker' });
    let doc;
    if (docs.length) {
        markerTrackingDoc = docs[0];
    } else {
        markerTrackingDoc = createObj('handout', {
            name: 'Marker Tracker'
        });
        markerTrackingDoc.set('notes', '[]');
    }
}

function getMarkerTrackingData() {
    let markerTrackingData = [];
    markerTrackingDoc.get('notes', function(text) {
        markerTrackingData = JSON.parse(text);
    });
    return markerTrackingData;
}

var addingMarkerTracker = false;

async function addMarkerTracker(source, targets) {
    //this feels really janky, but it's a way to try to get simultaneous operations out of phase with each other
    //on the addingMarkerTracker check
    await delayMS(randomInteger(100));
    while (addingMarkerTracker) {
        await delayMS(100);
    }
    addingMarkerTracker = true;
    debugging('add marker tracker');
    debugging('source');
    debugging(source);
    debugging('target(s)');
    debugging(targets);
    if (markerTrackingDoc == null) {
        warn('marking tracking doc not defined! cannot track markers');
        return;
    }
    let markerTrackingData = await getMarkerTrackingData();
    if (targets == null) {
        markerTrackingData.push({'source': source});
    } else if (Array.isArray(targets)) {
        for (const target of targets) {
            markerTrackingData.push({'source': source, 'target': target});
        }
    } else {
        markerTrackingData.push({'source': source, 'target': targets});
    }
    markerTrackingDoc.set('notes',JSON.stringify(markerTrackingData));
    addingMarkerTracker = false;
}

function removeMarkerTracker(source, targets) {
    if (source == null && targets == null) {
        warn('no data for marker tracker speficied; cannot remove tracker');
        return;
    }
    debugging('calling removeMarkerTracker');
    debugging('source:');
    debugging(source);
    debugging('targets:');
    debugging(targets);
    let markerTrackingData = getMarkerTrackingData();
    let indices = [];
    for (const tracker in markerTrackingData) {
        let candidate = markerTrackingData[tracker];
        debugging('checking this one:');
        debugging(candidate);
        debugging('against:');
        debugging(source);
        if (source == null || (source != null && source.id == candidate.source.id && (source.marker == null || source.marker.toLowerCase() == candidate.source.marker.toLowerCase()))) {
            if (source == null && candidate.target == null) continue; //this prevents exceptions for markers that have expiration conditions and no children markers to look for
            else if (targets == null) {
                indices.push(tracker);
                handleCleanup(candidate);
            } else if  (!Array.isArray(targets) && targets.id == candidate.target.id) {
                if (
                    (targets.isAura1 != null && targets.isAura1 == candidate.target.isAura1) || 
                    (targets.isAura2 != null && targets.isAura2 == candidate.target.isAura2) ||                     
                    (targets.marker == null || (candidate.target.marker != null && targets.marker.toLowerCase() == candidate.target.marker.toLowerCase()))
                ) {
                    indices.push(tracker);
                    handleCleanup(candidate);
                }
            } else if  (Array.isArray(targets)) {
                let target = targets.find(t =>
                    t.id == candidate.target.id && (
                        (t.isAura1 != null && t.isAura1 == candidate.target.isAura1) || 
                        (t.isAura2 != null && t.isAura2 == candidate.target.isAura2) ||                                
                        (t.marker == null || (candidate.target.marker != null && t.marker.toLowerCase() == candidate.target.marker.toLowerCase()))
                    )
                );
                if (target != null) {
                    indices.push(tracker);
                    handleCleanup(candidate);
                }
            }
        }
    }
    debugging('indices:');
    debugging(indices);
    markerTrackingData = markerTrackingData.filter((_, index) => !indices.includes("" + index));
    debugging('update markerTrackingDoc to:');
    debugging(markerTrackingData);
    markerTrackingDoc.set('notes',JSON.stringify(markerTrackingData));
}

async function updateMarkerDuration(entry, duration) {
    await delayMS(500); //let's wait a bit so we don't step on the toes of other updates
    if (entry == null) return;
    debugging('updating duration to ' + duration + ' for:');
    debugging(entry);
    let markerTrackingData = getMarkerTrackingData();
    markerTrackingData.forEach(d => {
        debugging('comparing ' + JSON.stringify(d) + ' to ' + JSON.stringify(entry));
        if (JSON.stringify(d) == JSON.stringify(entry)) {
            debugging('got matching entry in markerTrackingData');
            d.source.duration = duration;
        }
    });
    markerTrackingDoc.set('notes',JSON.stringify(markerTrackingData));
}

function handleCleanup(entry) {
    if (entry == null || entry.target == null) return;
    const target = entry.target;
    let token = getObj('graphic', target.id);
    if (token == null) token = getObj('pathv2', target.id);
    if (token == null) return;
    if (target.isSummon) {
        token.remove();
    } else if (target.isAura1) {
        token.set({'aura1_radius': null});
    } else if (target.isAura2) {
        token.set({'aura2_radius': null});
    }
}

function getMarkerTrackingForSource(obj) {
    if (obj == null || obj.get('id') == null) {
        warn('invalid source id provided');
        return;
    }
    debugging('get trackers where source = ' + obj.get('id'));
    let markerTrackingData = getMarkerTrackingData();
    debugging(markerTrackingData);
    let markerTrackingForSource = markerTrackingData.filter(d => d.source != null && d.source.id == obj.id);
    return markerTrackingForSource;
}

function getMarkerTrackingForTarget(obj) {
    if (obj == null || obj.get('id') == null) {
        warn('invalid target id provided');
        return;
    }
    debugging('get trackers where target = ' + obj.get('id'));    
    let markerTrackingData = getMarkerTrackingData();
    debugging(markerTrackingData);
    let markerTrackingForTarget = markerTrackingData.filter(d => d.target != null && d.target.id == obj.id);
    return markerTrackingForTarget;
}

function updateMarkerTracking(obj, deleted) {
    if (obj == null) {
        warn('cannot update marker tracking for null reference');
    }
    let statusMarkers = getMarkers(obj);
    const id = obj.get('id');
    debugging('attempt to update marker tracking with ' + id);
    if (id == null) {
        warn('cannot get id for object! no marker tracking update will be performed');
        return;
    }
    debugging('current markers on ' + id + ':');
    debugging(statusMarkers);
    if (deleted) {
        debugging(id + ' is being deleted; remove all tracking references to ' + id)
        let children = getMarkerTrackingForSource(obj);
        if (children != null && children.length > 0) {
            children.forEach(c => {
                clearMarker(getObj('graphic', c.target.id), c.target.marker);
            });
        }        
        removeMarkerTracker(null, {'id': id});
    } else {
        let markerTrackingForSource = getMarkerTrackingForSource(obj);
        if(markerTrackingForSource != null) {
            debugging('found ' + markerTrackingForSource.length + ' trackers where ' + id + ' is the source');   
        }
        let markerTrackingForTarget = getMarkerTrackingForTarget(obj);
        if(markerTrackingForTarget != null) {
            debugging('found ' + markerTrackingForTarget.length + ' trackers where ' + id + ' is the target');   
        }        
        if (markerTrackingForSource == null && markerTrackingForTarget == null) {
            debugging('no markers tracked for this target');
            return;
        }
        const statusMarkersLower = statusMarkers.map(m => m.toLowerCase());
        debugging(statusMarkersLower);
        for (const markerTracker of markerTrackingForSource) {
            debugging('check if ' + statusMarkers + ' includes "' + markerTracker.source.marker + '"');
            if (markerTracker.source.marker != null && statusMarkersLower.includes(markerTracker.source.marker.toLowerCase())) continue;
            if (markerTracker.target != null && markerTracker.target.marker != null) clearMarker(getObj('graphic',markerTracker.target.id), markerTracker.target.marker);
            else removeMarkerTracker(markerTracker.source, markerTracker.target);
        }
        for (const markerTracker of markerTrackingForTarget) {
            if (markerTracker.target == null) continue;
            debugging('check if ' + statusMarkers + ' includes "' + markerTracker.target.marker + '"');
            if (markerTracker.target.marker != null && statusMarkersLower.includes(markerTracker.target.marker.toLowerCase())) continue;
            removeMarkerTracker(null, markerTracker.target);
        }       
    }

}


// MARKER CALLBACK METHODS

function confusionRoll(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let effect = randomInteger(10);
        if (effect == 1) {
            let direction = randomInteger(8);
            let directionStr = 'in a random direction';
            switch (direction) {
                case 1:
                    directionStr = 'up';
                    break;
                case 2:
                    directionStr = 'up and to the right';
                    break;
                case 3:
                    directionStr = 'right';
                    break;
                case 4:
                    directionStr = 'down and to the right';
                    break;
                case 5:
                    directionStr = 'down';
                    break;
                case 6:
                    directionStr = 'down and to the left';
                    break;
                case 7:
                    directionStr = 'left';
                    break;
                case 8:
                    directionStr = 'up and to the left';
                    break;                    
            }
            echo(token.get('name') + ' is confused and cannot act; it just moves' + directionStr);
        } else if (effect <= 6) {
            echo(token.get('name') + ' is confused and cannot move or take actions this turn');
        } else if (effect <= 8) {
            echo (token.get('name') + ' is confused and lashes out at someone closeby (or does nothing if nobody is there)');
        } else {
            echo (token.get('name') + ' pushes through their confusion and can act normally');
        }
    } else {
        echo('please roll a d10 for the Confusion effect');
    }
}

async function tashasCausticBrewDamage(token) {
    debugging('calling tashasCausticBrewDamage');
    const e = lookupEnemy(token);
    if (e != null) {
        const badge = await getBadge(token, 'tashasCausticBrew');
        if (badge != null) {
            let dmgRoll = await rollDice(null, badge);
            dmgRoll = dmgRoll['total'];
            let params = {'dmg': dmgRoll, 'dmgType': 'acid'};
            damageToken(token, params);
            return;
        }
    }
    echo('please roll damage for the ' + prettyPrint(this.name) + ' effect');
}

async function requestStrSave(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let saveResult = e.rollSave('str');
        echo(token.get('name') + ' rolls a ' + saveResult + ' on their Strength saving throw');
    } else {
        echo('please roll a Strength saving throw to attempt to end the ' + prettyPrint(this.name) + ' effect');
    }
}

function requestDexSave(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let saveResult = e.rollSave('dex');
        echo(token.get('name') + ' rolls a ' + saveResult + ' on their Dexterity saving throw');
    } else {    
        echo('please roll a Dexterity saving throw to attempt to end the ' + prettyPrint(this.name) + ' effect');
    }
}

function requestConSave(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let saveResult = e.rollSave('con');
        echo(token.get('name') + ' rolls a ' + saveResult + ' on their Constitution saving throw');
    } else {    
        echo('please roll a Constitution saving throw to attempt to end the ' + prettyPrint(this.name) + ' effect');
    }
}

function requestIntSave(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let saveResult = e.rollSave('int');
        echo(token.get('name') + ' rolls a ' + saveResult + ' on their Intelligence saving throw');
    } else {    
        echo('please roll an Intelligence saving throw to attempt to end the ' + prettyPrint(this.name) + ' effect');
    }
}

function requestWisSave(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let saveResult = e.rollSave('wis');
        echo(token.get('name') + ' rolls a ' + saveResult + ' on their Wisdom saving throw');
    } else {    
        echo('please roll a Wisdom saving throw to attempt to end the ' + prettyPrint(this.name) + ' effect');
    }
}

function requestChaSave(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let saveResult = e.rollSave('cha');
        echo(token.get('name') + ' rolls a ' + saveResult + ' on their Charisma saving throw');
    } else {    
        echo('please roll a Charisma saving throw to attempt to end the ' + prettyPrint(this.name) + ' effect');
    }
}

function remove(token) {
    clearMarker(token.get('name'), this.name);
}

function unshield(token) {
    token = getToken(token);
    if (token == null) return;
    echo('The effects of ' + token.get('name') + "'s shield have worn off");
    let ac = Number(token.get('bar1_value')) - 5;
    token.set('bar1_value', ac);
    clearMarker(token.get('name'), 'shield');
}

function reduceACByTwo(token) {
    token = getToken(token);
    if (token == null) return;
    let ac = Number(token.get('bar1_value')) - 2;
    token.set('bar1_value', ac);
}

async function searingSmiteStartOfTurn(token) {
    let e = lookupEnemy(token.get('name'));
    if (e == null || e.stats == null) {
        emphasis('Please roll a Constitution saving throw to try to end the burning effect');
        return;
    }
    let saved = await tryToShakeCondition(token, this);  
    echo('The Searing Smite burns its target...');
    if (!saved) {
        let params = {};
        params.dmg = randomInteger(6);
        params.dmgType = 'fire' 
        damageToken(token, params);
    }
}

async function slowEndOfTurn(token) {
    let e = lookupEnemy(token.get('name'));
    if (e == null || e.stats == null) {
        emphasis('Please roll a Constitution saving throw to try to end the burning effect');
        return;
    }
    let saved = await tryToShakeCondition(token, this);  
    if (saved) {
        let ac = Number(token.get('bar1_value'));
        if (!isNaN(ac)) {
            token.set('bar1_value', (ac+2));
        }
    }
}

async function ensnaringStrikeStartOfTurn(token) {
    let level = await getBadge(token, 'ensnaringstrike');
    const enemy = lookupEnemy(token);
    echo('The thorns of the ensnaring strike dig in...');
    if (enemy) {
        let dmg = 0;
        for (let i = 1; i <= level; i++) {
            dmg += randomInteger(6)
        }
        let params = {};
        params.dmg = dmg;
        params.dmgType = 'piercing' 
        damageToken(token, params);        
    } else {
        emphasis('Please roll ' + level + 'd6 piercing damage for ' + token.get('name'));
    }
}

async function heroismStartOfTurn(token) {
    let spellcastingModifier = Number(await getBadge(token, 'heroism').charAt(0));
    token.set('bar2_value', Math.max(token.get('bar2_value'),spellcastingModifier));
}

function melfsEndOfTurn(token) {
    let badge = getBadge(token, 'melfsAcidArrow');
    emphasis('Please roll ' + badge + ' acid damage for ' + token.get('name'));
    clearMarker(token, 'melfsAcidArrow');
}

function grow(token) {
    if (token == null) return;
    let h = Number(token.get('height'));
    let w = Number(token.get('width'));
    if (isNaN(w) || isNaN(h)) return;
    if (w <= 0 || h <= 0) return;    
    w = Math.min(w+70, 2*w);
    h = Math.min(h+70, 2*h);
    token.set({
        'height': h,
        'width': w
    });
}

function shrink(token) {
    if (token == null) return;
    let h = Number(token.get('height'));
    let w = Number(token.get('width'));
    if (isNaN(w) || isNaN(h)) return;
    if (w <= 0 || h <= 0) return;   
    w = Math.max(w-70, w/2);
    h = Math.max(h-70, h/2);
    token.set({
        'height': h,
        'width': w
    });
}

function becomeLethargic(token) {
    reduceACByTwo(token);
    addTokenStatusMarker(token, 'lethargic')
}

function skipTurnFromLethargy(token) {
    emphasis(token.get('name') + ' is lethargic and cannot move');
    clearTokenMarker(token, 'lethargic')
    advanceTurn();
}

function increaseSpeedByTen(token) {
    let currentSpeed = Number(token.get('bar4_value'));
    token.set({'bar4_value': (currentSpeed + 10)});
}

function standUp(token) {
    if (!hasMarker(token, 'incapacitated') && !hasMarker(token, 'paralyzed') && !hasMarker(token, 'petrified') && !hasMarker(token, 'stunned') && !hasMarker(token, 'unconscious')) {
        echo(token.get('name') + ' stands up using half its movement');
        clearTokenMarker(token, 'prone');
    } else {
        echo(token.get('name') + ' is unable to stand up!');
    }
}

async function restoreAc(token) {
    if (token == null) return;
    let ac = await getAttribute(token.get('name'),'ac');
    token.set('bar1_value', ac);
}

async function tashasHideousLaughterEndOfTurn(token) {
    const e = lookupEnemy(token);
    if (e != null) {
        let badge = await getBadge(token, 'tashasHideousLaughter').substring(2); //strip the 'DC' prefix
        let saved = await e.rollSave('wis', null, null, badge, 'magic', null);  
        if (!saved) {
            echo('the maddening fits of laughter keep ' + token.get('name') + ' incapacitated');
        } else {
            echo(token.get('name') + ' composes itself and stops laughing');
            clearTokenMarker(token, 'incapacitated');
            clearTokenMarker(token, 'tashasHideousLaughter');
        }
    } else {    
        echo('please roll a Wisdom saving throw to attempt to end the ' + prettyPrint(this.name) + ' effect');
    }
}

async function tryToShakeCondition(token, marker) {
    if (marker == null) marker = this;
    if (marker == null) {
        warn('unable to determine which marker\'s effect is trying to be shaken off');
        return null;
    }
    debugging('rolling to shake off the ' + marker.name + ' condition');
    const e = lookupEnemy(token);
    if (e != null) {
        let badge = await getBadge(token, marker.name);
        if (badge != null && badge.length > 2) {
            let badge = await getBadge(token, marker.name).substring(2); //strip the 'DC' prefix
            if (badge != null && !isNaN(badge)) {
                let saved = await e.rollSave(marker.savingThrowStat, null, null, badge, 'magic', null);  
                if (!saved) {
                    echo(token.get('name') + ' fails to shake the ' + prettyPrint(marker.name) + ' condition');
                    return false;
                } else {
                    echo(token.get('name') + ' successfully shakes the ' + prettyPrint(marker.name) + ' condition');
                    clearTokenMarker(token, marker.name);
                    return true;
                }
            }
        }
    }  
    echo('please roll a' + (marker.savingThrowStat != null ? ' ' + marker.savingThrowStat.toUpperCase() : '') + ' saving throw to attempt to end the ' + prettyPrint(marker.name) + ' effect');
    return null;
}
