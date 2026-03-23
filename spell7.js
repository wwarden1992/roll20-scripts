class Spell {
    constructor(name, minLevel, callback, soundFx) {
        this.name = name;
        this.minLevel = minLevel;
        this.soundFx = soundFx;
        this.callback = async function(c) {
            refreshTokens();
            let playSfx = await callback(c);
            if (playSfx) playSound(this.soundFx);
        };
    }
    
    async calculateHref(player, level, cantripScaling) {
        let characterName = getPlayerCharacter(player);
        let caster = currentTurn;
        if (characterName != currentTurn && !playerIsGM(getPlayerId(player))) caster = characterName;
        let spellTemplate = spellTemplates[this.name];
        if (spellTemplate == null) {
            warn('no template for ' + this.name);
            return '';
        }
        let tempLevel = level;
        if (level == 0 && caster != null) level = cantripScaling;
        else if (level == 0) level = 1; //make cantrips where targets scale with level hit the minimum number of targets
        const repeatRegex = /(\w+)\[([^\]]+)\]=([^\s]+(?:\s+(?!\w+\[)[^\s]+)*)/g;
        let result = spellTemplate;
        let match;
        while ((match = repeatRegex.exec(spellTemplate)) !== null) {
            const [, baseName, expression, valueTemplate] = match;
    
            const count = this._evaluateExpression(expression, level);
    
            let expanded = [];
            for (let i = 1; i <= count; i++) {
                expanded.push(
                    `${baseName}${i}=${valueTemplate.replace(/\$/g, i)}`
                );
            }
    
            result = result.replace(match[0], expanded.join(' '));
        }
        if (tempLevel != level) level = tempLevel
        
        if (!playerIsGM(getPlayerId(player))) {
            result = result.replace(
                /\bcaster=([^\s]+(?:\s+(?!\w+=)[^\s]+)*)/g,
                `caster='${caster}'`
            );
        }
        result = "<a href=\"!spell " + this.name + " level=" + level + " " + result + "\">" + prettyPrint(this.name) + "</a>";
        debugging(result);
        return result;
    }
    
    _evaluateExpression(expr, level) {
        // Normalize
        expr = expr.replace(/\s+/g, '');
    
        // Replace 'level' with its numeric value
        expr = expr.replace(/\blevel\b/g, String(level));
    
        // Only allow digits and operators now
        if (!/^[\d+*/()-]+$/.test(expr)) {
            throw new Error(`Invalid expression after substitution: ${expr}`);
        }
    
        // Very small expression evaluator
        return this._simpleMathEval(expr);
    }
    
    _simpleMathEval(expr) {
        // Handle parentheses recursively
        while (expr.includes('(')) {
            expr = expr.replace(/\(([^()]+)\)/g, (_, sub) =>
                this._simpleMathEval(sub)
            );
        }
    
        // Multiplication / division
        expr = expr.replace(/(\d+)([*/])(\d+)/g, (_, a, op, b) => {
            return op === '*'
                ? Number(a) * Number(b)
                : Math.floor(Number(a) / Number(b));
        });
    
        // Addition / subtraction
        expr = expr.replace(/(\d+)([+-])(\d+)/g, (_, a, op, b) => {
            return op === '+'
                ? Number(a) + Number(b)
                : Number(a) - Number(b);
        });
    
        return Number(expr);
    }    
}


//spell.js had text-based spell commands
//spell2.js used macros to prompt users for selection, but it was really like hundreds of macros in a trenchcoat. Also introduced geometry for aoe spells
//spell3.js had the ability to interact with user-placed aoe drawings for more intuitive control over where blasts went
//spell4.js breaks up macros into individual components to allow clicking of specific targets rather than selecting from a static name list.
//spell5.js does away with the 'reference-x-y' option for AoE spells and enforces the AOE marker schema. Also infers caster and DC from turn order data (or explicitly provided caster for reaction spells)
//spell6.js does away with macros in favor of reading from a new spelltemplates.js file. The params are used to build an href string for a menu button. Some intelligence about modifying prompts based on player and spell level
//spell7.js filters the list of all available spells based on what's present on the active player's character sheet (DM gets master list), and marker and aoe tracking added for persistence through API resets

//TODO get sounds

var spellbook = [
    //Cantrips
    new Spell('AcidSplash', 0, acidSplash),
    new Spell('BloodBolt', 0, bloodBolt, 'bloodbolt'), //TODO missing sfx
    new Spell('BoomingBlade', 0, boomingBlade,'boomingblade'),
    new Spell('ChillTouch', 0, chillTouch, 'chilltouch'),
    new Spell('EldritchBlast', 0, eldritchBlast),
    new Spell('Firebolt', 0, firebolt, 'firebolt'),
    new Spell('Frostbite', 0, frostbite, 'frostbite'),
    new Spell('IllusionaryDart', 0, illusionaryDart),
    new Spell('GreenFlameBlade', 0, greenFlameBlade, 'firebolt'),
    new Spell('Guidance', 0, guidance, 'guidance'),
    new Spell('Light', 0, light, 'light'), 
    new Spell('MageHand', 0, mageHand),
    new Spell('MindSliver', 0, mindSliver,'mindsliver'), 
    new Spell('ProduceFlame', 0, produceFlame,'firebolt'),
    new Spell('RayOfFrost', 0, rayOfFrost,'rayoffrost'),
    new Spell('SacredFlame', 0, sacredFlame,'sacredflame'),
    new Spell('ShockingGrasp', 0, shockingGrasp, 'shockinggrasp'),
    new Spell('StarryWisp', 0, starryWisp, 'starrywisp'),
    new Spell('Thaumaturgy', 0, thaumaturgy,'boomingblade'),
    new Spell('Thunderclap', 0, thunderclap,'thunderclap'),
    new Spell('TollTheDead', 0, tollTheDead,'tollthedead'),
    new Spell('ViciousMockery', 0, viciousMockery,'vicious_mockery'),
    new Spell('WordOfRadiance', 0, wordOfRadiance,'guidance'),
    //1st Level
    new Spell('AbsorbElements', 1, absorbElements,'absorbelements'), 
    new Spell('ArmorOfAgathys', 1, armorOfAgathys, 'frostbite'),
    new Spell('Bane', 1, bane,'bane'),
    new Spell('Bless', 1, bless,'bless'),
    new Spell('BurningHands', 1, burningHands,'firebolt'),
    new Spell('Catapult', 1, catapult,'catapult'),
    new Spell('ChaosBolt', 1, chaosBolt),
    new Spell('CharmPerson', 1, charmPerson,'charmperson'),
    new Spell('ColorSpray', 1, colorSpray,'colorspray'),
    new Spell('Command', 1, command),
    new Spell('CompelledDuel', 1, compelledDuel, 'compelledduel'),
    new Spell('ChromaticOrb', 1, chromaticOrb),
    new Spell('CreateWater', 1, createWater,'createwater'),
    new Spell('CureWounds', 1, cureWounds,'curewounds'),
    new Spell('DetectMagic', 1, detectMagic),
    new Spell('DetectEvilAndGood', 1, detectEvilAndGood),
    new Spell('DetectPoisonAndDisease', 1, detectPoisonAndDisease),
    new Spell('DissonantWhispers', 1, dissonantWhispers,'dissonantwhispers'),
    new Spell('DivineFavor', 1, divineFavor,'bless'),
    new Spell('DivineSmite', 1, divineSmite, 'divinesmite'),
    new Spell('EnsnaringStrike', 1, ensnaringStrike, 'ensnaringstrike'),
    new Spell('ExpeditiousRetreat', 1, expeditiousRetreat, 'expeditiousretreat'),
    new Spell('FaerieFire', 1, faerieFire,'faeriefire'), 
    new Spell('FalseLife',  1, falseLife, 'falselife'),
    new Spell('FeatherFall',  1, featherFall,'featherfall'),    
    new Spell('FogCloud',1, fogCloud, 'gustofwind'),
    new Spell('Goodberry', 1, goodberry),
    new Spell('GravityWell', 1, gravityWell,'gravitywell'),
    new Spell('Grease', 1, grease, 'grease'),
    new Spell('GuidingBolt', 1, guidingBolt,'guidingbolt'),    
    new Spell('HailOfThorns', 1, hailOfThorns,'hailofthorns'),
    new Spell('HealingWord', 1, healingWord,'healingword'),
    new Spell('HellishRebuke', 1, hellishRebuke, 'firebolt'),
    new Spell('HemorrhagingCurse', 1, hemorrhagingCurse, 'hex'),
    new Spell('Heroism', 1, heroism,'heroism'),
    new Spell('Hex', 1, hex,'hex'),
    new Spell('HuntersMark', 1, huntersMark,'huntersmark'),
    new Spell('IceKnife', 1, iceKnife,'iceknife'),
    new Spell('InflictWounds', 1, inflictWounds, 'inflictwounds'),
    new Spell('Jump', 1, jump, 'jump'), 
    new Spell('MageArmor', 1, mageArmor,'shield'),
    new Spell('MagicMissile',  1, magicMissile),
    new Spell('ProtectionFromEvilAndGood', 1, protectionFromEvilAndGood, 'protectionfromevilandgood'),
    new Spell('RayOfSickness', 1, rayOfSickness,'witherandbloom'),
    new Spell('Sanctuary', 1, sanctuary, 'bless'),
    new Spell('SearingSmite', 1, searingSmite,'searingsmite'),
    new Spell('Shield', 1, shield,'shield'),
    new Spell('ShieldOfFaith', 1, shieldOfFaith,'shieldoffaith'),
    new Spell('SilveryBarbs', 1, silveryBarbs, 'silverybarbs'),
    new Spell('Sleep', 1, sleep,'sleep'),
    new Spell('TashasCausticBrew', 1, tashasCausticBrew,'acidbreath'),
    new Spell('TashasHideousLaughter', 1, tashasHideousLaughter,'tashashideouslaughter'),
    new Spell('Thunderwave', 1, thunderwave),
    new Spell('WrathfulSmite',  1, wrathfulSmite,'divinesmite'),
    //2nd Level
    new Spell('Aid', 2, aid,'guidance'),
    new Spell('BlindnessDeafness', 2, blindnessDeafness),
    new Spell('Blur', 2, blur,'shield'),
    new Spell('CalmEmotions', 2, calmEmotions, 'calmemotions'),
    new Spell('CloudOfDaggers', 2, cloudOfDaggers, 'cloudofdaggers'),
    new Spell('CrownOfMadness', 2, crownOfMadness,'crownofmadness'),
    new Spell('EnhanceAbility', 2, enhanceAbility, 'enhanceability'),
    new Spell('EnlargeReduce', 2, enlargeReduce), 
    new Spell('FlamingSphere', 2, flamingSphere,'flamingsphere'),
    new Spell('GabrielsChromaticBurst', 2, gabrielsChromaticBurst),
    new Spell('GustOfWind', 2, gustOfWind,'gustofwind'),
    new Spell('HeatMetal', 2, heatMetal,'heatmetal'),
    new Spell('HoldPerson', 2, holdPerson,'holdperson'),
    new Spell('Invisibility', 2, invisibility, 'invisibility'),
    new Spell('LesserRestoration', 2, lesserRestoration,'guidingbolt'),
    new Spell('Levitate', 2, levitate, 'levitate'),
    new Spell('MaximilliansEarthenGrasp', 2, maximilliansEarthenGrasp, 'earthengrasp'), //TODO sound
    new Spell('MelfsAcidArrow', 2, melfsAcidArrow,'acidchromaticorb'),
    new Spell('MirrorImage', 2, mirrorImage, 'mirrorimage'),
    new Spell('Moonbeam', 2, moonbeam, 'guidingbolt'),
    new Spell('PassWithoutTrace', 2, passWithoutTrace,'passwithouttrace'),
    new Spell('Shatter', 2, shatter,'shatter'), 
    new Spell('Silence', 2, silence,'silence'),
    new Spell('SpiritualWeapon', 2, spiritualWeapon,'spiritualweapon'),
    new Spell('SummonBeast', 2, summonBeast,'summonbeast'),
    new Spell('WardingBond', 2, wardingBond,'bless'),
    new Spell('Web', 2, web, 'web'), //TODO sound
    new Spell('WitherAndBloom', 2, witherAndBloom, 'witherandbloom'),
    //3rd Level
    new Spell('Antagonize', 3, antagonize, 'antagonize'), //TODO sound
    new Spell('AuraOfVitality', 3, auraOfVitality, 'auraofvitality'), //TODO sound
    new Spell('BeaconOfHope', 3, beaconOfHope), //TODO sound
    new Spell('BestowCurse', 3, bestowCurse, 'hex'),
    new Spell('BlindingSmite', 3, blindingSmite,'divinesmite'),
    new Spell('Counterspell', 3, counterspell,'counterspell'),
    new Spell('Fear', 3, fear, 'fear'), //TODO sound
    new Spell('Fireball', 3, fireball,'fireball'),
    new Spell('Haste', 3, haste,'haste', 'powerup'),
    new Spell('HypnoticPattern', 3, hypnoticPattern,'hypnoticpattern'),
    new Spell('IntellectFortress', 3, intellectFortress, 'intellectfortress'), //TODO sound
    new Spell('LightningBolt', 3, lightningBolt, 'lightningbolt'),
    new Spell('MassHealingWord', 3, massHealingWord,'healingword'),
    new Spell('ProtectionFromEnergy', 3, protectionFromEnergy, 'absorbelements'),
    new Spell('SanguineSpears', 3, sanguineSpears,'sanguinespears'), //TODO Sound
    new Spell('Slow', 3, slow, 'slow'), //TODO sound; clock ticks getting slower
    new Spell('SpiritGuardians', 3, spiritGuardians, 'spiritguardians'),
    //4th Level
    new Spell('Banishment', 4, banishment),
    new Spell('Exsanguinate', 4, exsanguinate, 'exsanguinate'), //TODO SOUND
    new Spell('FreedomOfMovement', 4, freedomOfMovement, 'freedomofmovement'), //TODO SOUND
    new Spell('IceStorm', 4, iceStorm, 'icestorm'), //TODO sound
    new Spell('OtilukesResilientSphere', 4, otilukesResilientSphere,'otilukesresilientsphere'),
    new Spell('Polymorph', 4, polymorph,'polymorph'),
    new Spell('SickeningRadiance', 4, sickeningRadiance, 'sickeningradiance'), //TODO sound; geiger counter
    new Spell('SummonConstruct', 4, summonConstruct,'summonconstruct'),
    new Spell('WebOfFire', 4, webOfFire, 'weboffire'), //TODO sound
    //5th Level
    new Spell('AnimateObjects', 5, animateObjects, 'animateobjects'), //TODO sound
    new Spell('CircleOfPower', 5, circleOfPower, 'circleofpower'), // TODO sound
    new Spell('HoldMonster', 5, holdMonster, 'holdperson'),
    new Spell('MassCureWounds', 5, massHealingWord,'curewounds'),
    new Spell('SynapticStatic', 5, synapticStatic, 'synapticstatic') //TODO sound
];

var elements = {
    'fire': 'fire',
    'cold': 'frost',
    'thunder': 'magic',
    'acid': 'acid',
    'poison': 'acid',
    'f': 'fire',
    'c': 'frost',
    't': 'magic',
    'l': 'frost',
    'a': 'acid',
    'p': 'acid'
};

on("ready", function(){
    players=findObjs({_type:'player'});
    refreshTokens();
    on('chat:message', function(msg) {
        //Using spellbook macro instead of !spell command
        if (msg.content.indexOf('!spell') == 0 || msg.content.indexOf('!cast') == 0) {
            inform('spell7.js got message: ' + msg.content);
            try {
                let msgTokens = msg.content.split(' ');
                if (msgTokens.length == 1) {
                    selectSpellLevel(getPlayerName(msg.playerid));
                }
                else if (msgTokens.length == 2) {
                    printSpellList(getPlayerName(msg.playerid), msgTokens[1]);
                }
                else evaluateSpell(msg);
            } catch (error) {
                warn(error);
            }
        }
    });
});

function evaluateSpell(msg) {
    let unfilteredParams = msg.content.split(" ");
    let spellObj = validSpell(unfilteredParams[1]); //unfilteredParams[0] == '!spell', unfilteredParams[1] == the spell name
    if(!spellObj) {
        warn('no such spell as \'' + unfilteredParams[1] + '\'');
        return;
    }
    //clear any empty args that may have been added by, say, putting a double space between entries
    let params = [];
    for(let i = 0; i < unfilteredParams.length; i++ ) {
        if(unfilteredParams[i]!=null && unfilteredParams[i].length > 0) {
            //all params must be in the form of "paramName=param", implying a split on '=' will yield 2 pieces, one as the key, one as the value
            let param = unfilteredParams[i].split("=");
            if(param.length == 2) {
                if (param[1].indexOf('[') == 0) {
                    param[1] = param[1].replace(/'/g, '"');
                    let arr = JSON.parse(param[1]);
                    params[param[0]] = arr;
                } else {
                    params[param[0]] = param[1];
                }
            }
        }
    }
    //cliclable params might have whitespace in values. give a special rule to account for it
    var clickableParams = [
        'target','target1','target2','target3','target4','target5','target6','target7','target8','target9',
        'ally','ally1','ally2','ally3','ally4','ally5','ally6','ally7','ally8','ally9', 'caster','reference'
    ];
    clickableParams.forEach(cp => {
        let paramString = cp + "='";
        let targetSubstr = msg.content.indexOf(paramString) + paramString.length; //start AFTER the "______='"
        if(targetSubstr >= paramString.length) {
            let endTargetSubstr = msg.content.indexOf("'",targetSubstr);
            let target = msg.content.slice(targetSubstr, endTargetSubstr);
            params[cp] = target;
        }
    });
    try {
        castSpell(msg.playerid, spellObj, params);
    } catch (error) {
        warn(error);
    }
}

function validSpell(spell) {
    let spellObj = spellbook.find((s) => s.name.toLowerCase()==spell.toLowerCase());   
    if (spellObj == null) {
        warn('there is no defined spell called "' + spell + '"');
        echo( 
            'Sorry, either \'' + spell + '\' is not a valid spell name, or data for that spell has not been defined yet'
        );
        return false;
    }  
    return spellObj;
}

function printSpellSyntax(spell) {
    inform('attempting to print syntax for spell named \'' + spell + '\'');
    let spellObj = validSpell(spell);
    let argsString = '\'!spell ' + spell;
    spellObj.args.forEach((arg) => argsString = argsString + ' ' + arg);
    argsString += '\'.'
    if (spellObj) echo( 
        'To cast \'' + spell +'\', use ' + argsString + '\'\n' +
        'Arguments listed within parentheses are optional. (Don\'t actually type out the parentheses)'
    );
}

function selectSpellLevel(player) {
    let msg = 'Which level spell slot are you using?<br/>';
    msg += '<a href="!spell 0"> Cantrip </a><br/>';
    msg += '<a href="!spell 1">1st Level</a><br/>'; 
    msg += '<a href="!spell 2">2nd Level</a><br/>';    
    msg += '<a href="!spell 3">3rd Level</a><br/>';    
    msg += '<a href="!spell 4">4th Level</a><br/>';    
    msg += '<a href="!spell 5">5th Level</a><br/>';
    whisper(player, msg);
}

async function printSpellList(player, spellLevel) {
    debugging('printing spell list for ' + player);
    let msg = 'Which ' + (spellLevel == 0 ? 'cantrip ' : 'spell ') + 'are you casting?<br/>';
    let spellList = [];
    if (spellLevel == 0) spellList = spellbook.filter(s => s.minLevel == 0);
    else spellList = spellbook.filter(s => s.minLevel != 0 && s.minLevel <= spellLevel);
    let characterName = getPlayerCharacter(player);
    let caster = currentTurn;
    //show a filtered list
    if (!playerIsGM(getPlayerId(player))) {
        try {
            let data = await get2024CharacterData(characterName);
            let characterSpells = [];
            Object.keys(data).forEach(d => {
                if (data[d]['source'] == 'Spell') characterSpells.push(data[d]['name']);
            });
            spellList = spellList.filter(s => characterSpells.includes(prettyPrint(s.name)));
        } catch {
            //probably not a 2024 sheet. try the 2014 style
            try {
                let sheet = await getCharacterSheet(characterName);
                let attrs = findObjs({_type:"attribute", _characterid: sheet.id}); 
                let characterSpells = attrs.filter(a => a.get('name') != null && a.get('name').indexOf('repeating_spell') > -1 && a.get('name').indexOf('spellname') > -1);
                log(characterSpells);
                characterSpells = characterSpells.map(s => s.get('current').replace("'","").toLowerCase());
                spellList = spellList.filter(s => characterSpells.includes(prettyPrint(s.name).toLowerCase()));
            } catch {
                warn("could not lookup spell list for character")  ;
            }
        }
        if (characterName != currentTurn) caster = characterName;
    }  
    spellList.sort((a,b) => {return (a.name > b.name ? 1 : -1)});
    let cantripScaling = await cantripScale(caster);
    for (const sl of spellList) {
        msg += await sl.calculateHref(player, spellLevel, cantripScaling);
    };
    whisper(player, msg);
}

async function castSpell(playerid, spell, params) {
    trace('casting \'' + spell.name + '\'');
    if (params.caster != null) params.dc = await getAttribute(params.caster, 'spell_save_dc');
    else if (currentTurn != null && lookupEnemy(currentTurn) == null) {
        debugging('inferring caster is a player named ' + currentTurn);
        params.dc = await getAttribute(currentTurn, 'spell_save_dc');    
        params.caster = currentTurn;
    }
    else if (lookupEnemy(currentTurn) != null) {
        debugging('inferring caster is an enemy named ' + currentTurn)
        let e = lookupEnemy(currentTurn);
        if (e.stats['spell_save_dc'] != null) params.dc = e.stats['spell_save_dc'];
        params.caster = e.token.get('name');
    } else {
        debugging('could not determine spellcaster for this spell');
    }
    if (params.caster != null && params.caster != "") {
        let ordinalSuffix = 'th';
        if (params.level == 1) ordinalSuffix = 'st';
        else if (params.level == 2) ordinalSuffix = 'nd';
        else if (params.level == 3) ordinalSuffix = 'rd';
        let levelString = "";
        if (params.level > 0) {
            levelString = ' at ' + params.level + ordinalSuffix + ' level';
        }
        echo( params.caster + " casts " + prettyPrint(spell.name) + levelString);
    } else {
        echo( 'A(n) ' + prettyPrint(spell.name) + ' was just cast');
    }    
    spell.callback(params);
}

function missingSpellArgs(spell, error) {
    let msg = 'missing one or more arguments for \'' + spell + '\' (first detected was \'' + error + '\')';
    warn(msg)
    echo(msg);
}

function halfDamage(dmg) {
    return Math.floor(dmg/2);
}

function noDamage(dmg) {
    return 0;
}

async function cantripScale(caster) {
    let level = await getAttribute(caster,'level');
    if (level == null || isNaN(level)) {
        try {
            let e = lookupEnemy(caster);
            if (e != null && e.stats != null && e.stats['casterLevel'] != null) {
                level = e.stats['casterLevel'];
            }
        } catch {}
    }
    let cantripScaling = 1 + Math.floor((1 + level)/6);
    return cantripScaling;
}

async function autorollIfNeeded(params, dice, paramName) {
    if (paramName == null) paramName = 'dmg';
    let val = params[paramName];
    if (isNaN(params[paramName]) || params[paramName] == '') {
        val = await rollDice(params.caster, dice);
        val = val['total'];
        echo('autorolled <b>' + dice + '</b> for <b>' + val + '</b>');
    }
    return val;
}
//wants an angle in degrees if an angle is provided, but outputs an angle in radians
function adjustmentsForAngle(params, radius) {
    //get the caster from the params to extract vertex information
    let caster = getToken(params.caster);
    if(!caster) {
        warn('no caster defined for spell');
        return null;
    }
    let x = caster.get('left');
    let y = caster.get('top');
    let w = caster.get('width');
    let h = caster.get('height');
    if (params.testX != null) x = params.testX;
    if (params.testY != null) y = params.testY;
    let theta = 0;
    let radiusPx = radius * 14; //radius (ft) * 1sq/5ft * 70px/sq
    let offset_x = 0; let offset_y = 0;
    if(params.theta != null) {
        theta = (2*Math.PI) - (params.theta * Math.PI/180);
        offset_x = radiusPx * Math.cos(theta);
        offset_y = -1 * radiusPx * Math.sin(theta);
    } else if (params.x != null && params.y != null) {
        offset_x = radiusPx * params.x;
        offset_y = radiusPx * params.y;
        theta = calculateAngle(x,y,x + offset_x,y - offset_y);   
        offset_x = radiusPx * Math.cos(theta);
        offset_y = -1 * radiusPx * Math.sin(theta);        
    }  else {
        return null;
    }
    if (theta >= 7*Math.PI/4 || theta <= Math.PI/4) {
        x += w/2;
        y += ((w/2)*Math.tan(theta));
    }
    else if (Math.PI/4 <= theta && theta <= 3*Math.PI/4) {
        x += ((h/2)*Math.tan((Math.PI/2) - theta));
        y += h/2;
    }
    else if (3*Math.PI/4 <= theta && theta <= 5*Math.PI/4) {
        x -= w/2;
        y += ((w/2)*Math.tan(Math.PI - theta));
    }
    else if (5*Math.PI/4 <= theta && theta <= 7*Math.PI/4) {
        x -= ((h/2)*Math.tan((3*Math.PI/2) - theta));
        y -= h/2;
    }    
    //some of the fx can get a bit screwy if you don't feed them int values...
    let result = {
        'x': Math.round(x),
        'y': Math.round(y),
        'w': Math.round(w),
        'h': Math.round(h),
        'offset_x': Math.round(offset_x),
        'offset_y': Math.round(offset_y),
        'theta': theta
    };
    debugging(result);
    return result;
}

async function circleAoe(params, radius, fxType, delay, callback) {
    //hardcoded delay to get audio better synced up
    if(!delay) {
        delay = 0;
    }
    delay += 400;
    
    await new Promise(r => setTimeout(r, delay));
    let diameterPx = radius * 28; //radius (ft) * 2 * 1sq/5ft * 70px/1sq
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CIRCLE_AOE_STROKEWIDTH, points:"[[0,0],["+diameterPx+","+diameterPx+"]]"});
    
    let aoeMarker = null;
    if (params.reference != null) {
        let token = getToken(params.reference);
        try {
            params.x = token.get('left');
            params.y = token.get('top');
        } catch {}
    }
    else if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (params.reference == null && aoeMarker == null) {
        debugging("[[0,0],["+diameterPx+","+diameterPx+"]]");
        debugging( findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CIRCLE_AOE_STROKEWIDTH}) );
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'circle', radius, null);
        return false;
    }
    if (aoeMarker != null) {
        params.x = aoeMarker.get('x');
        params.y = aoeMarker.get('y');
        aoeMarker.remove();  
    }
    debugging(printCoordinates(params.x,params.y) + '     ' + fxType);
    spawnFx(params.x, params.y, fxType, Campaign().get('playerpageid'));
    if (params.dc != null && params.stat !=null && callback != null) {
        if (isNaN(params.dc)) {
           echo( "please provide a numeric value for spell DC");
           return false;
        }
        let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
        for(let i = 0; i < possibleTargets.length; i++) {
            let t = possibleTargets[i];        
            //radius is provided to this method in feet; multiply by 70/5 to scale to 70px/sq
            if(liesWithinCircle({'x':params.x,'y':params.y,'r':(radius*70/5)},t)) {
                debugging(t.get('name') + ' lies within the circle');
                params.saved = await rollTokenSave(t, params);
                if(callback && params.saved != null) {
                    await callback(t, params);
                }
            }
        }
    }
    return true;
}

async function effectOnToken(targetName, fxType, delay) {
    //hardcoded delay for sounds to load
    if (!delay) delay = 0;
    delay += 400;
    
    await new Promise(r => setTimeout(r, delay));
    var target = getToken(targetName);
    if(!target) return false;
    spawnFx(target.get('left'), target.get('top'), fxType);
    return true;
}

async function coneAoe(params, radius, color, callback) {
    //hardcode delay for better syncing with sound
    await new Promise(r => setTimeout(r, 400));
    //move cone to the edge of the token representing the caster
    let caster = getToken(params.caster);
    let radiusPx = radius * 14; //radius (ft) * 1sq/5ft * 70 px/sq
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CONE_AOE_STROKEWIDTH});
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers.find(pam => pam.get('points').indexOf("[0," + radiusPx +"]") >= 0);
    }
    if (aoeMarker == null) {
        let aoeMarkerType = " (" + (radiusPx*5/70) + " ft cone)";
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'cone', radius, null);
        return false;
    }    
    let angle = (270 - Number(aoeMarker.get('rotation')));
    if (angle >= 360) angle -= 360;
    angle *= (Math.PI/180);
    let cone = {}
    cone.angle = 2*Math.PI - angle; 
    cone.x = aoeMarker.get('x') - (radiusPx * Math.cos(angle)/2);
    cone.y = aoeMarker.get('y') + (radiusPx * Math.sin(angle)/2);
    cone.offset_x = (radiusPx * Math.cos(angle));
    cone.offset_y = (radiusPx * Math.sin(angle));
    cone.r = radius*70/5;
    aoeMarker.remove();
    debugging(params);
    debugging(cone);
    let fx_corrective_factor =  getFxCorrectiveFactor(cone.r, cone.angle);
    //TODO test with corrective factor
    spawnFxBetweenPoints(
        {"x": cone.x, "y": cone.y},
        {"x": cone.x + cone.offset_x, "y": cone.y - cone.offset_y},
        'breath-' + color
    );
    if(params.stat != null && params.dc != null && callback != null) {
        if (isNaN(params.dc)) {
           echo( "please provide a numeric value for spell DC");
           return false;
        }        
        let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
        for(let i = 0; i < possibleTargets.length; i++) {
            let t = possibleTargets[i];
            inform('checking ' + t.get('name'));
            //radius is provided to this method in feet; multiply by 70/5 to scale to 70px/sq
            if(liesWithinCone(cone,t,caster)) {
                params.saved = await rollTokenSave(t, params);
                if(callback && params.saved != null) {
                    await callback(t, params);
                }
            }
        }
    }
    return await cone;
}

async function shootRay(params, radius, color, onImpact, onImpactSound) {
    //hardcode delay for better syncing with sound
    await new Promise(r => setTimeout(r, 400));
    let caster = getToken(params.caster);
    let target = getToken(params.target);
    let fxName = 'beam-' + color;
    let fx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == color);
    if(fx != null) {
        fxName = fx.get('id');
    }
    if (fxName == null) {
        warn('failed to get fx type');
    }
    if(target==null) {
        let adj = adjustmentsForAngle(params,radius);
        let fx_corrective_factor =  getFxCorrectiveFactor(pythagorean(adj.offset_x, adj.offset_y), (adj.theta - Math.PI/2)*180/Math.PI);  
        debugging(adj.theta*180/Math.PI);
        spawnFxBetweenPoints(
            {"x": adj.x, "y": adj.y},
            {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
            fxName
        );     
    } else {
        let angle = calculateObjectAngle(caster, target);
        let fx_corrective_factor =  getFxCorrectiveFactor(calculateObjectDistance(caster,target), angle);  
        spawnFxBetweenPoints(
            {"x": caster.get('left'), "y": caster.get('top')},
            {"x": target.get('left'), "y": target.get('top') - fx_corrective_factor},
            fxName
        );
    }
    if(onImpact!=null) {
        let distance = Math.round(calculateObjectDistance(caster, target)/5); //a rough approximation
        if(onImpactSound) playSound(onImpactSound, distance+400);
        effectOnToken(target.get('name'), onImpact + '-' + color, distance);
    }
    return true;
}

async function cubeAoe(params,side,fxType,callback) {
    
    const fxId = fxType ? fxType.get('id') : null;
    let fxProperties = fxType ? fxType.get('definition') : null;
    let fxDistance = side*7; //fx_distance = side (in ft)/2 * 1sq /5 ft * 70 px/sq --> side * 70/10 --> side*7
    let hypotenuse = pythagorean(35,fxDistance); //half the caster size in px & half the cube size in px to get distance to near corners of cube
    let theta = Math.atan(fxDistance/35);
    let sidePx = side * 14; // side (ft) * 1sq/5ft * 70px/sq
    debugging(sidePx);
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: SQUARE_AOE_STROKEWIDTH, points:"[[0,0],["+sidePx+","+sidePx+"]]"});
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'square', side, null);
        return false;
    }    
    let angle_ab = (270 - Number(aoeMarker.get('rotation')));
    if (angle_ab >= 360) angle_ab -= 360;
    angle_ab *= (Math.PI/180);
    let center_x = aoeMarker.get('x');
    let center_y = aoeMarker.get('y'); 
    let a_x = center_x  + (-0.5 * sidePx * Math.cos(angle_ab));
    let a_y = center_y + (0.5 * sidePx * Math.sin(angle_ab));
    hypotenuse = sidePx/2; 
    theta = Math.PI/2;

    let phi = angle_ab + theta;
    let b_x = a_x + hypotenuse*Math.cos(phi);
    let b_y = a_y - hypotenuse*Math.sin(phi);
    debugging(printCoordinates(b_x, b_y));
    //hard code delays to better align with sound effects
    await new Promise(r => setTimeout(r, 400));
    if (fxId != null) {
        spawnFxBetweenPoints(
            {"x": b_x, "y": b_y},
            {"x": center_x, "y": center_y},
            fxId
        );
    }
    phi = angle_ab - theta;
    let c_x = a_x + hypotenuse*Math.cos(phi);
    let c_y = a_y - hypotenuse*Math.sin(phi);
    if (fxId != null) {
        spawnFxBetweenPoints(
            {"x": c_x, "y": c_y},
            {"x": center_x, "y": center_y},
            fxId
        );
    }
    let d_x = b_x + 2*fxDistance*Math.cos(angle_ab);
    let d_y = b_y - 2*fxDistance*Math.sin(angle_ab);
    let e_x = c_x + 2*fxDistance*Math.cos(angle_ab);
    let e_y = c_y - 2*fxDistance*Math.sin(angle_ab);  
    if (fxId != null) {
        spawnFxBetweenPoints(
            {"x": d_x, "y": d_y},
            {"x": center_x, "y": center_y},
            fxId
        );
        spawnFxBetweenPoints(
            {"x": e_x, "y": e_y},
            {"x": center_x, "y": center_y},
            fxId
        );
    }
    if (params.dc != null && params.stat != null && callback != null) {
        if (isNaN(params.dc)) {
           echo( "please provide a numeric value for spell DC (value provided was " + params.dc + ")");
           return false;
        }        
        let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
        if (params['ignoreCaster'] == true) {
            let index = possibleTargets.indexOf(getToken(params.caster));
            debugging(index);
            if (index >= 0) {
                possibleTargets.splice(index, 1);
            }
        }
        for(let i = 0; i < possibleTargets.length; i++) {
            let t = possibleTargets[i];     
            //radius is provided to this method in feet; multiply by 70/5 to scale to 70px/sq
            if(liesWithinRectangle({
                'x1':b_x,'y1':b_y,
                'x2':c_x,'y2':c_y,
                'x3':d_x,'y3':d_y,
                'x4':e_x,'y4':e_y,
            },t)) {
                params.target = t;
                params.saved = await rollTokenSave(t, params);
                if(callback && params.saved != null) {
                    await callback(t, params);
                }
            }
        }
    }
    if(aoeMarker!=null) {
        await new Promise((r)=>setTimeout(r,1000)); //feels silly to do this, but the point is that we don't screw over the mulitple cube aoes for faeriefire
        aoeMarker.remove();
    }
    return true;
}

function interfereWithThem(params, sourceFx, targetFx) {
    let caster = getToken(params.caster);
    let target = getToken(params.target);
    spawnFx(caster.get('left'), caster.get('top'), sourceFx);
    spawnFx(target.get('left'), target.get('top'), targetFx);
    return true;
}

async function summonSomething(summonName, img, w, h, params) {
    let caster = getToken(params.caster);
    let page = findObjs({_type:'page'}).find((page) => page.id == Campaign().get('playerpageid'));
    await new Promise((r)=>setTimeout(r,400));
    let tokenName = (params.caster ? (params.caster + "'" + (params.caster.charAt(params.caster.length-1) == 's' ? '' : 's') + " ") : "") + summonName;
    if (getToken(tokenName) != null) {
        getToken(tokenName).remove();
        refreshTokens();
    }
    let token = createObj('graphic', {
        _subtype: 'token',
        pageid: Campaign().get('playerpageid'),
        layer: 'objects',
        imgsrc: img,
        left: Number(caster.get('left')) + 70,
        top: caster.get('top'),
        width: 70 * w,
        height: 70 * h,
        controlledby: (caster ? caster.get('controlledby') : null),
        has_bright_light_vision: page.get('dynamic_lighting_enabled'),
        name: tokenName,
        showname: true,
        showplayers_name: true,
    });  
    return token;
}

async function damageToken(t, params) {
    if(t == null || params.dmg == null) return;
    let e = lookupEnemy(t);
    t = getToken(t);
    if (t==null) return;
    let name = '';
    if (e == null) {
        try {
            name = t.get('name');
        } catch {}
        if (name == null) {
            echo( "could not identify a token named '" + name + "'");
            return;    
        } else if (t.get('controlledby') != getGM() && params.saved !== undefined) {
            return;
        }
    } else {
        name = e.token.get('name');
    }
    if (typeof params.dmg != "number") params.dmg = Number(params.dmg);
    let dmg = params.dmg;
    if (dmg == null || isNaN(dmg)) {
        echo( "please provide a numeric value for the damage of your spell");
        return;
    }
    if (params.saved && params.onSave !== undefined) {
        if (params.stat=='dex' && e != null && e.stats != null && e.stats['evasion'] == true) {
            emphasis(e.token.get('name') + ' avoided damage with its evasion trait');
            dmg = params.noDamage(dmg);
        }
        else dmg = params.onSave(dmg);
    }
    else if (params.saved === false && params.stat == 'dex' && e != null && e.stats != null && e.stats['evasion'] == true) {
        emphasis(e.token.get('name') + ' avoided half the damage with its evasion trait');
        dmg = params.halfDamage(dmg);
    }
    if (e != null && params.dmgType != null && dmg > 0) {
        if (e.isResistantTo(params.dmgType)) dmg = halfDamage(dmg);
        if (e.isImmuneTo(params.dmgType)) dmg = 0;
        if (e.isVulnerableTo(params.dmgType)) dmg *= 2;
    }    
    let currentHP = t.get('bar3_value');
    let tempHP = t.get('bar2_value');
    let tempHPDmg = 0;
    if (tempHP > 0) {
        tempHPDmg = Math.min(tempHP, dmg);
        t.set('bar2_value', (tempHP - tempHPDmg));
        dmg -= tempHPDmg;
    }  
    if (typeof currentHP != "number") currentHP = Number(currentHP);
    t.set('bar3_value', (currentHP - dmg));
    let hpData = {
        "currentHP": (currentHP-dmg),
        "currentTempHP": (tempHP - tempHPDmg),
        "previousHP": currentHP,
        "previousTempHP": tempHP             
    }
    hpData = announceHPChange(t,hpData);
    if (hpData) {
        checkBloodied(t,currentHP, (currentHP-dmg));
        checkDead(t, (currentHP-dmg));
    }
}

//SPECIFIC SPELLS

async function acidSplash(params) {
    params.stat='dex';
    params.onSave = noDamage;
    params.dmgType = 'acid';
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd6');
    let didAoE = await circleAoe(params, 2.5, 'sparkle-acid', 0, damageToken);
    if (didAoE) {
        playSound('acidbreath');
        playSound('acidchromaticorb');
    }
    return null;
}

async function antagonize(params) {
    params.dmg = await autorollIfNeeded(params, (1+Number(params.level)) + 'd4');
    params.dmgType = 'psychic';    
    params.onSave = halfDamage;
    params.stat='wis';
    effectOnToken(params.target, 'glow-charm');
    params.saved = await rollTokenSave(params.target, params);
    damageToken(params.target, params);  
    return true;
}

async function hellishRebuke(params) {
    params.dmg = await autorollIfNeeded(params, (1+Number(params.level)) + 'd10');
    params.dmgType = 'fire';    
    params.onSave = halfDamage;
    params.stat='dex';
    effectOnToken(params.target, 'burn-fire');
    params.saved = await rollTokenSave(params.target, params);
    damageToken(params.target, params);    
    return true;
}


async function iceStorm(params) {
    params.dmg = await autorollIfNeeded(params, '4d6');
    params.dmg2 = await autorollIfNeeded(params, (Number(params.level)-2) + 'd8', 'dmg2');
    var patternFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'IceStorm');
    if(!patternFx) {
        patternFx = createObj('custfx', {"name": 'IceStorm', "definition": mycustomfx['iceStorm']});
    }    
    params.dmgType = 'cold';    
    params.onSave = halfDamage;
    params.stat='dex';
    let iceStormCallback = function(t, params) {
        damageToken(t, params);
        params.dmg = params.dmg2;
        params.dmgType = 'bludgeoning';
        damageToken(t, params);
    }
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CIRCLE_AOE_STROKEWIDTH, points:"[[0,0],[560,560]]"});
    
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    } 
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'circle', 40, null);     
        return false;
    } else {
        params.x = aoeMarker.get('x');
        params.y = aoeMarker.get('y');
    }
     
    await circleAoe(params, 20, patternFx.get('id'), 0, iceStormCallback);
    let obj = drawCircle(params.x, params.y, 20, 'all');
    obj.set({
        stroke: "#55ffff",
        stroke_width: 5
    });
    return true;
}


function fogCloud(params) {
    var patternFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'FogCloud');
    if(!patternFx) {
        patternFx = createObj('custfx', {"name": 'FogCloud', "definition": mycustomfx['fogCloud']});
    }    
    let diameterPx = 8*70*Number(params.level);
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CIRCLE_AOE_STROKEWIDTH, points:"[[0,0],["+diameterPx+","+diameterPx+"]]"});    
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        let aoeMarkerType = " (" + (diameterPx*5/140) + " ft circle)";
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'circle', 20*Number(params.level), null);
        return false;
    }    
    aoeMarker.remove();
    params.x = aoeMarker.get('x');
    params.y = aoeMarker.get('y');        
    let t = drawCircle(params.x, params.y, (diameterPx*5/140), 'all', 'effect', '#c0c0c0', '#f0f0f0');
    t.set({
        stroke: "#555555",
        stroke_width: 5      
    });
    concentrate(params.caster, 'Fog Cloud', 600, {'id': t.get('id'), 'isSummon': true});     
    return true;
}

async function silence(params) {
    let diameterPx = 8*70;
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CIRCLE_AOE_STROKEWIDTH, points:"[[0,0],["+diameterPx+","+diameterPx+"]]"});    
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'circle', 20, null);
        return false;
    }    
    aoeMarker.remove();
    params.x = aoeMarker.get('x');
    params.y = aoeMarker.get('y');        
    let t = drawCircle(params.x, params.y, 20, 'all', 'effect', '#ffffff');
    t.set({
        stroke: "#ffffff",
        stroke_width: 5      
    });
    let hazard = await createAoeHazard(t, 'circle', [ON_CAST, TRAP], {'caster': params.caster}, silenceCallback, silenceExitCallback);
    concentrate(params.caster, 'Silence', 100, {'id': hazard.aoeSource, 'isSummon': true}); 
    return true;
}

async function silenceCallback(token) {
    let caster = getToken(this.params.caster);
    let casterId = caster ? caster.get('id') : null;
    let tokenObj = getToken(token);
    addTokenStatusMarker(token, 'silence');
    if (casterId) {
        addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'silence'});
    }
    
}    
async function silenceExitCallback(token) {
    clearTokenMarker(token, 'silence');
} 

async function grease(params) {

    params.stat = 'dex';
    let gCallback = function(t, params) {
        if (!params.saved) {
            addTokenStatusMarker(t, 'prone')            
        }
    }
    let sidePx = 140; 
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: SQUARE_AOE_STROKEWIDTH, points:"[[0,0],["+sidePx+","+sidePx+"]]"});
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'square', 10, null);
        return false;
    }
    params.x = aoeMarker.get('x');
    params.y = aoeMarker.get('y');    
    let rotation = aoeMarker.get('rotation');
    let cube = await cubeAoe(params,10,null, gCallback);
    if (!cube) return;

    let t = await drawSquare(params.x, params.y, 10, 'all', 'effect', '#d2aa6d', '#e8db85');
    t.set({
        stroke_width: 5,
        rotation: rotation
    });    
    let hazard = await createAoeHazard(t, 'rectangle', [ENTERS_AREA, END_OF_TURN], params, greaseCallback);
    toBack(t);
    return true;
}

async function greaseCallback(token, params) {
    let callbackParams = params;
    callbackParams.stat='dex';
    callbackParams.saved = await rollTokenSave(token, callbackParams);
    if(callbackParams.saved != null && !callbackParams.saved) {
        addTokenStatusMarker(token, 'prone');
    }            
}  


async function sickeningRadiance(params) {
    var patternFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'SickeningRadiance');
    if(!patternFx) {
        patternFx = createObj('custfx', {"name": 'SickeningRadiance', "definition": mycustomfx['sickeningRadiance']});
    }    
    let diameterPx = 12*70;
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CIRCLE_AOE_STROKEWIDTH, points:"[[0,0],["+diameterPx+","+diameterPx+"]]"});    
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'circle', 30, null);
        return false;
    }    
    aoeMarker.remove();
    params.x = aoeMarker.get('x');
    params.y = aoeMarker.get('y');        
    let t = drawCircle(params.x, params.y, 30, 'all', 'effect', '#00af00', '#00ff00');
    log(t);
    t.set({
        stroke: "#55ff55",
        stroke_width: 5      
    });
    let hazard = await createAoeHazard(t, 'circle', [START_OF_TURN, ENTERS_AREA], params, radianceCallback);
    concentrate(params.caster, 'Sickening Radiance', null, {'id': hazard.aoeSource, 'isSummon': true}); 
    return true;
}

async function radianceCallback(token, params) {
    let callbackParams = {};
    callbackParams.dmgType = 'radiant'; 
    let dmg = await rollDice(params.caster, '4d10')
    callbackParams.dmg = dmg['total'];
    callbackParams.dc = params.dc;
    callbackParams.onSave = noDamage;
    callbackParams.stat='con';
    callbackParams.saved = await rollTokenSave(token, callbackParams);
    if(callbackParams.saved != null) {
        await damageToken(token, callbackParams);
        let exhaustionLevels = 1;
        if (hasMarker(token, 'sickeningRadiance')) exhaustionLevels = 1 + Number(getBadge(token, 'sickeningRadiance'));
        if (!callbackParams.saved) {
            await clearMarker(token, 'sickeningRadiance');
            if(exhaustionLevels >= 6) {
                addTokenStatusMarker(token, 'dead');
                token.set({
                    'bar3_value': 0
                });
            }
            else {
                addTokenStatusMarker(token, 'sickeningRadiance', exhaustionLevels);
                let caster = getToken(params.caster);
                let casterId = caster ? caster.get('id') : null;
                let tokenObj = getToken(token);
                if (casterId) {
                    addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'sickeningRadiance'});
                }                    
            }
        }
    }            
}  

async function fireball(params) {
    params.dmg = await autorollIfNeeded(params, (5+Number(params.level)) + 'd6');
    params.dmgType = 'fire';    
    params.onSave = halfDamage;
    params.stat='dex';
    return await circleAoe(params, 20, 'nova-fire', 0, damageToken);
}

async function calmEmotions(params) {
    params.stat='cha';
    concentrate(params.caster, 'Calm Emotions');
    let ceCallback = function(t, params) {
        if (!params.saved) {
            let token = getToken(t);
            addTokenStatusMarker(token,'calmemotions');
            let caster = getToken(params.caster);
            let casterId = caster ? caster.get('id') : null;
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': token.get('id'), 'marker': 'calmemotions'});
            }              
        }
    }    
    return await circleAoe(params, 20, 'nova-charm', 0, ceCallback);
}

async function synapticStatic(params) {
    params.dmg = await autorollIfNeeded(params, (3+Number(params.level)) + 'd6');
    params.dmgType = 'psychic';    
    params.onSave = halfDamage;
    params.stat='int';
    var synapticStatic = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'SynapticStatic');
    if(!synapticStatic) {
        synapticStatic = createObj('custfx', {"name": 'SynapticStatic', "definition": mycustomfx['synapticstatic']});
    }    
    let exempt = function(t, params) {
        let token = getToken(t);
        let e = lookupEnemy(token);
        if (e != null && e.stats != null && e.stats.int <= 2) {
            echo("(" + token.get('name') + ' has an intelligence of 2 or lower and is immune to this spell)');
            return true;
        }
        return false;
    }
    params.exemptFromSave = exempt;
    let ssCallback = function(t, params) {
        damageToken(t, params);
        if(params.saved != null && params.saved == false) {
            addTokenStatusMarker(t, 'synapticStatic','DC'+params.dc);
        }
    }
    return await circleAoe(params, 20, synapticStatic.get('id'), 0, ssCallback);
}

async function magicMissile(params) {
    let i = 1;
    params.dmgType = 'force';    
    for ( ; i < 12; i++) {
        let t = params['target' + i];
        if(!getToken(t)) {
            break;
        }
        effectOnToken(t, 'bomb-magic',250*i);
        params['dmg'+i] = await autorollIfNeeded(params, '1d4+1','dmg'+i);
        params.dmg = params['dmg'+i]
        damageToken(t, params);
    }
    playSound('magicmissile'+params.level);
    return null;
}

async function featherFall(params) {
    let i = 1;
    for ( ; i <= 5; i++) {
        let t = params['ally' + i];
        if(!getToken(t)) {
            break;
        }
        addTokenStatusMarker(params['ally' + i],'featherfall');
    }
    return true;
}

function counterspell(params) {
    interfereWithThem(params, 'bubbling-magic', 'bubbling-smoke');
    return true;
}

async function flamingSphere(params) {
    let img = 'https://files.d20.io/images/384089613/zZQy0Av_a-wlBxDOPALw8g/thumb.png?1710176220';
    params['reference'] = params.caster;
    let t = await summonSomething('Flaming Sphere', img, 1, 1, params);
    debugging(t);
    concentrate(params.caster, 'Flaming Sphere', null, {'id': t.get('id'), 'isSummon': true});
    t.set({
        'aura1_radius': 5,
        'aura1_color': "#ff4d00"
    })
    createAoeHazard(t, 'circle', [END_OF_TURN, HAZARD_MOVED], params, flamingSphereCallback);    
    applyLightToToken(t);
    return true;
}
async function flamingSphereCallback(token, params) {
    let callbackParams = {};
    callbackParams.dmgType = 'fire'; 
    let dmg = await rollDice(params.caster, Number(params.level) + 'd6')
    callbackParams.dmg = dmg['total'];
    callbackParams.dc = params.dc;
    callbackParams.onSave = halfDamage;
    callbackParams.stat='dex';
    callbackParams.saved = await rollTokenSave(token, callbackParams);
    if(callbackParams.saved != null) {
        await damageToken(token, callbackParams);
    }            
}

async function maximilliansEarthenGrasp(params) {
    let img = 'https://files.d20.io/images/468083504/MHlZKKt8KesM_C9YYG7aQg/original.png';
    params['reference'] = params.target;
    params.dmg = await autorollIfNeeded(params, '2d6');    
    let t = await summonSomething('Earthen Grasp', img, 1, 1, params);
    concentrate(params.caster, 'Earthen Grasp', null, {'id': t.get('id'), 'isSummon': true});
    params.dmgType = 'bludgeoning';    
    params.stat='str';
    let saved = await rollTokenSave(params.target, params);
    if (!saved && saved != null) {
        damageToken(params.target, params);    
        addTokenStatusMarker(params.target,'restrained','DC'+params.dc);   
        let caster = getToken(params.caster);
        const casterId = caster.get('id')
        let target = getToken(params.target);
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': target.get('id'), 'marker': 'restrained'});
        }
    }
    return true;
}

async function cloudOfDaggers(params) {
    let img = 'https://files.d20.io/images/434155955/QXYBNOmtOFkS3rGHkAn50g/thumb.png';
    params['reference'] = params.caster;
    let t = await summonSomething('Cloud of Daggers', img, 1, 1, params);
    concentrate(params.caster, 'Cloud of Daggers', null, {'id': t.get('id'), 'isSummon': true});
    createAoeHazard(t, 'rectangle', [START_OF_TURN, ENTERS_AREA], params, daggersCallback);
    toBack(t);    
    return true;
}
async function daggersCallback(token, params) {
    let callbackParams = {};
    callbackParams.dmgType = 'slashing'; 
    let dmg = await rollDice(params.caster, (2*Number(params.level)) + 'd4')
    callbackParams.dmg = dmg['total'];
    damageToken(token, callbackParams);
}

async function moonbeam(params) {
    let img = 'https://files.d20.io/images/404343783/JFMQnqh2d1L-mvUADZ-pfQ/thumb.png?1723157772';
    params['reference'] = params.caster;
    let t = await summonSomething('Moonbeam', img, 2, 2, params);
    concentrate(params.caster, 'Moonbeam', null, {'id': t.get('id'), 'isSummon': true});
    createAoeHazard(t, 'circle', [START_OF_TURN, ENTERS_AREA], params, moonbeamCallback);
    toBack(t);
    applyLightToToken(t);
    return true;
}
async function moonbeamCallback(token, params) {
    let callbackParams = {};
    callbackParams.dmgType = 'radiant'; 
    let dmg = await rollDice(params.caster, Number(params.level) + 'd10')
    callbackParams.dmg = dmg['total'];
    callbackParams.dc = params.dc;
    callbackParams.onSave = halfDamage;
    callbackParams.stat='con';
    callbackParams.saved = await rollTokenSave(token, callbackParams);
    if(callbackParams.saved != null) {
        await damageToken(token, callbackParams);
    }            
}

async function web(params) {

    params.stat = 'dex';
    let sidePx = 280; 
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: SQUARE_AOE_STROKEWIDTH, points:"[[0,0],["+sidePx+","+sidePx+"]]"});
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'square', 20, null);
        return false;
    }
    params.x = aoeMarker.get('x');
    params.y = aoeMarker.get('y');    
    let rotation = aoeMarker.get('rotation');
    aoeMarker.remove();
    let t = await drawSquare(params.x, params.y, 20, 'all', 'effect', '#cccccc');
    t.set({
        stroke_width: 5,
        rotation: rotation
    });    
    let hazard = await createAoeHazard(t, 'rectangle', [START_OF_TURN, ENTERS_AREA], params, webCallback);
    concentrate(params.caster, 'Web', 600, {'id': hazard.aoeSource, 'isSummon': true});     
    toBack(t);
    return true;
}

async function webCallback(token, params) {
    if (hasMarker(token, 'restrained')) {
        log('token is already restrained');
        return;
    }    
    let callbackParams = params;
    callbackParams.stat='dex';
    callbackParams.saved = await rollTokenSave(token, callbackParams);
    let caster = getToken(this.params.caster);
    let casterId = caster ? caster.get('id') : null;
    let tokenObj = getToken(token);        
    if(callbackParams.saved != null && !callbackParams.saved) {
        addTokenStatusMarker(token, 'restrained');
        if (casterId && tokenObj) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'restrained'});
        }           
    }            
}  


function spiritGuardians(params) {
    let token = getToken(params.caster)
    addTokenStatusMarker(params.caster, 'spiritguardians');
    let links = [{'id': token.get('id'), 'isAura1': true, 'type': 'spiritguardians'}, {'id': token.get('id'), 'marker': 'spiritguardians'}]
    concentrate(params.caster, 'Spirit Guardians', null, links);
    
    let auraColor = '#fbf07b';
    if (params.dmgType == 'Necrotic') auraColor = '#7f7f7f';
    token.set({
        'aura1_radius': 15,
        'aura1_color': auraColor
    });
    createAoeHazard(token, 'circle', [START_OF_TURN, ENTERS_AREA], params, spiritGuardiansCallback)
    return true;
}
async function spiritGuardiansCallback(token) {
    let callbackParams = {};
    callbackParams.dmgType = params.dmgType.toLowerCase(); 
    callbackParams.ignoreAllies = true;
    let dmg = await rollDice(params.caster, Number(params.level) + 'd8')
    callbackParams.dmg = dmg['total'];
    callbackParams.dc = params.dc;
    callbackParams.onSave = halfDamage;
    callbackParams.stat='wis';
    callbackParams.saved = await rollTokenSave(token, callbackParams);
    if(callbackParams.saved != null) {
        await damageToken(token, callbackParams);
    }            
}

function auraOfVitality(params) {
    let token = getToken(params.caster)
    addTokenStatusMarker(params.caster, 'auraOfVitality');
    let links = [{'id': token.get('id'), 'isAura1': true, 'type': 'auraOfVitality'}, {'id': token.get('id'), 'marker': 'auraofvitality'}]
    concentrate(params.caster, 'Aura Of Vitality', null, links);
    token.set({
        'aura1_radius': 30,
        'aura1_color': '#b6d7a8'
    });
    return true;
}

function circleOfPower(params) {
    let token = getToken(params.caster)
    concentrate(params.caster, 'Circle of Power', null, {'id': token.get('id'), 'isAura1': true, 'type': 'circleOfPower'});
    token.set({
        'aura1_radius': 30,
        'aura1_color': '#b6d7a8'
    });
    return true;
}

function silveryBarbs(params) {
    interfereWithThem(params,'sparkle-smoke','sparkle-death');
    effectOnToken(params.ally,'glow-holy');
    addTokenStatusMarker(params.ally,'advantage');
    return true;
}

async function guidingBolt(params) {
    params.dmg = await autorollIfNeeded(params, (3+Number(params.level))+'d6');
    params.dmgType = 'radiant';    
    effectOnToken(params.target, 'bomb-holy');
    damageToken(params.target, params);
    const caster = getToken(params.caster);
    let expiration = caster ? {'durationRef': caster.get('id'), duration: 'endOfNextTurn'} : null;
    addTokenStatusMarker(params.target, 'guidingbolt', null, null, expiration);
    return true;
}

async function frostbite(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster))+'d6');
    effectOnToken(params.target, 'bubbling-frost');
    params.dmgType = 'cold';    
    params.stat='con';
    let saved = await rollTokenSave(params.target, params);
    if (!saved && saved != null) {
        damageToken(params.target, params);
        const target = getToken(params.target);
        let expiration = target ? {'durationRef': target.get('id'), 'duration': 'endOfTurn'} : null;
        addTokenStatusMarker(params.target, 'disadvantage', null, null, expiration);        
    }
    return true;
}

function guidance(params) {
    effectOnToken(params.ally, 'glow-holy');
    addTokenStatusMarker(params.ally,'guidance');
    let token = getToken(params.ally);
    concentrate(params.caster, 'Guidance', null, {'id': token.get('id'), 'marker': 'guidance'});
    return true;
}

function armorOfAgathys(params) {
    effectOnToken(params.caster, 'shield-frost');
    addTokenStatusMarker(params.caster,'armorofagathys');
    let token = getToken(params.caster);
    let maxHP = token.get('bar3_max');
    token.set({
        'bar2_value': (5 * params.level),
        'bar2_max': maxHP
    });
    return true;
}

async function falseLife(params) {
    params.tempHP = await autorollIfNeeded(params, '1d4+' + (4 + (5*Number(params.level-1))), 'tempHP');
    effectOnToken(params.caster, 'shield-slime');
    let token = getToken(params.caster);
    let maxHP = token.get('bar3_max');
    token.set({
        'bar2_value': params.tempHP,
        'bar2_max': maxHP
    });
    return true;
}

function mageHand(params) {
    let img = 'https://files.d20.io/images/390893061/uYqyga03HJ5gJSCUQ2Xg1Q/thumb.png?1714425033';
    params['reference'] = params.caster;
    summonSomething('Mage Hand', img, .5, .5, params);
    return true;
}

async function produceFlame(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster))+'d8');
    effectOnToken(params.target, 'burn-fire');
    params.dmgType = 'fire';    
    damageToken(params.target, params);    
    return true;
}

async function sacredFlame(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster))+'d6');
    effectOnToken(params.target, 'burn-holy');
    params.dmgType = 'radiant';    
    params.stat='dex';
    let saved = await rollTokenSave(params.target, params);    
    if (!saved && saved != null) damageToken(params.target, params);
    return true;
}

async function tollTheDead(params) {
    let target = getToken(params.target);
    let hp = 1;
    let maxHp = 2; //set different than hp so we default to d12 if we can't figure out the target
    if (target != null) {
        hp = target.get('bar3_value');
        maxHp = target.get('bar3_max');
    }
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster))+(hp==maxHp ? 'd8' : 'd12'));
    effectOnToken(params.target, 'bubbling-death');
    params.dmgType = 'necrotic';    
    params.stat='wis';
    let saved = await rollTokenSave(params.target, params);    
    if (!saved && saved != null) damageToken(params.target, params);   
    return true;
}

async function cureWounds(params) {
    params.healing = await autorollIfNeeded(params, Number(params.level) + 'd8+' + await getAttribute(params.caster, 'spellcasting_ability'), 'healing');
    if(!params.target) return;
    heal(params);
    return true;
}

async function healingWord(params) {
    params.healing = await autorollIfNeeded(params, Number(params.level) + 'd4+' + await getAttribute(params.caster, 'spellcasting_ability'), 'healing');
    if(!params.target) return;
    heal(params);
    return true;
}

async function massHealingWord(params) {
    params.healing = await autorollIfNeeded(params, (Number(params.level)-2) + 'd4+' + getAttribute(params.caster, 'spellcasting_ability'), 'healing');
    for(let i = 1; i <= 6; i++) {
        if (params[('target' + i)] == null) continue;
        params.target = params[('target' + i)];
        heal(params);
    }
    return true;
}

function heal(params) {
    if (typeof params.healing != "number") params.healing = Number(params.healing);
    if(isNaN(params.healing)) {
        echo( "please enter a numerical value for hit points healed");
        return;
    }
    let healing = Math.floor(Math.abs(params.healing)); //don't want to heal for negative health
    effectOnToken(params.target, 'glow-slime');
    let token = getToken(params.target);
    if (token == null) {
        echo( "Cannot find a token named '" + params.target + "'");
        return;
    }
    let prevHP = token.get('bar3_value');
    let maxHP = token.get('bar3_max');
    if (typeof prevHP != "number") prevHP = Number(prevHP);
    if (typeof maxHP != "number") maxHP = Number(maxHP);
    let newHP = Math.min(Math.max(0,prevHP) + healing, maxHP);
    if (!isDead(token)) {
        if (!hasMarker(token, 'chilltouch')) token.set('bar3_value', newHP);
        if(healing != null && healing != 0) {
            announceHPChange(token, prevHP, newHP);
        }
    }
}

async function heatMetal(params) {
    params.dmg = await autorollIfNeeded(params, Number(params.level) + 'd8');
    params.dmgType = 'fire';    
    params.stat = 'con';
    effectOnToken(params.target, 'glow-fire');
    addTokenStatusMarker(params.target,'heatMetal');
    damageToken(params.target, params);
    let saved = await rollTokenSave(params.target, params); 
    if (saved && saved != null) {    
        addTokenStatusMarker(params.target, 'red');
    } else if (saved != null) {
        emphasis(params.target + ' failed its Constitution save and must drop the metal object if possible!');
    }
    let target = getToken(params.target);
    let targetLink = target ? {'id': target.get('id'), 'marker': 'heatMetal'} : null;
    concentrate(params.caster, 'Heat Metal', null, targetLink);
    return true;
}

async function witherAndBloom(params) {
    params.dmg = await autorollIfNeeded(params, params.level + 'd6');
    let spellcastingAbility = await getAttribute(params.caster,'spellcasting_ability')
    params.dmgType = 'necrotic';  
    params.stat = 'con';
    params.onSave = halfDamage;
    var witherbloom = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'Witherbloom');
    if(!witherbloom) {
        witherbloom = createObj('custfx', {"name": 'Witherbloom', "definition": mycustomfx['witherandbloom']});
    }
    let effectOnAlly = function(t, params) {
        emphasis(t.get('name') + ' is in range of the spell and may spend ' +
        'one of their (unspent) hit die, and then receive an extra ' + spellcastingAbility +
        ' HP');
    }
    params.effectOnAlly = effectOnAlly;
    return await circleAoe(params, 10, witherbloom.get('id'), 0, damageToken);
}

function beaconOfHope(params) {
    let refToken = getToken(params.caster);
    params.x = '0'; params.y = '0';
    effectOnToken(params.caster, 'burst-holy');
    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
    let c = getCoordinates(params, refToken);
    let links = [];
    for(let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];        
        //radius is provided to this method in feet; multiply by 70/5 to scale to 70px/sq
        if(liesWithinCircle({'x':c.x,'y':c.y,'r':(30*70/5)},t)) {
            debugging(t.get('name') + ' lies within the circle');
            if(t.get('controlledby') == 'all') {
                addTokenStatusMarker(t, 'beaconOfHope');
                links.push({'id': t.get('id'), 'marker': 'beaconOfHope'});
            }
        }
    }
    concentrate(params.caster, 'Beacon of Hope', null, links);
    return true;
}

async function rayOfSickness(params) {
    params.dmg = await autorollIfNeeded(params, (Number(params.level)+1) + 'd8');
    shootRay(params, 0, 'slime');
    params.dmgType = 'poison';    
    params.stat = 'con';
    damageToken(params.target, params);
    params.condition = 'poisoned';
    let saved = await rollTokenSave(params.target, params);   
    if (!saved && saved != null) {    
        const caster = getToken(params.caster);
        let expiration = caster ? {'durationRef': caster.get('id'), 'duration': 'endOfNextTurn'} : null
        addTokenStatusMarker(params.target, 'poisoned', 'Ray of Sickness', null, expiration);
    }
    return true;
}

async function eldritchBlast(params) {
    params.dmgType = 'force';    
    var blast = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'EldritchBlast');
    if(!blast) {
        blast = createObj('custfx', {"name": 'EldritchBlast', "definition": mycustomfx['eldritchblast']});
    }  
    let i = 1;
    for ( ; i < 5; i++) {
        let t = params['target' + i];
        if(t == null || t.length == 0 || !getToken(t)) {
            break;
        }
        //Naive assumption that caster has agonizing blast eldritch invocation
        params['dmg+i'] = await autorollIfNeeded(params, '1d10+' + await getAttribute(params.caster, 'charisma_mod'), 'dmg'+i);
        params.dmg = params['dmg' + i];
        effectOnToken(t, blast.get('id'),150*i);
        damageToken(t, params);
    } 
    playSound('eldritchblast' + (i-1));
    return null;
}

async function illusionaryDart(params) {
    params.dmgType = 'psychic';    
    var dart = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'IllusionaryDart');
    if(!dart) {
        dart = createObj('custfx', {"name": 'IllusionaryDart', "definition": mycustomfx['illusionarydart']});
    }  
    let i = 1;
    for ( ; i < 5; i++) {
        let t = params['target' + i];
        if(t == null || t.length == 0 || !getToken(t)) {
            break;
        }
        params['dmg'+i] = await autorollIfNeeded(params, '1d8', 'dmg'+i);
        params.dmg = params['dmg' + i];
        effectOnToken(t, dart.get('id'),150*i);
        damageToken(t, params);
    } 
    playSound('illusionarydart' + (i-1));
    return null;
}

function lesserRestoration(params) {
    effectOnToken(params.ally, 'glow-holy');
    if(params['condition'] == null || params['condition'].length==0) return;
    clearTokenMarker(params.ally, params.condition.toLowerCase());
    return true;
}

async function summonBeast(params) {
    let img = 'https://files.d20.io/images/390896186/Hm-O0YeeUOlug6lVnKrEeQ/thumb.png?1714426826';
    if (params.type == 'Air') img = 'https://files.d20.io/images/434326939/nS8W1NlQyA6kc10kS93Cyw/thumb.png?1742912767';
    else if (params.type == 'Water') img = 'https://files.d20.io/images/434326940/uJyM-eAQkcEd6GdLdhb0BQ/original.png';
    let token = await summonSomething('Beast Summon', img, 1, 1, params);
    concentrate(params.caster, 'Summon Beast', null, {'id': token.get('id'), 'isSummon': true});
    token.set({
        'bar1_value': 11 + Number(params.level),
        'bar3_value': (params.type == 'Air' ? 20 : 30) + (5 * (Number(params.level) - 2)),
        'bar3_max': (params.type == 'Air' ? 20 : 30) + (5 * (Number(params.level) - 2)),
        'has_bright_light_vision': true,
        'has_night_vision': true,
        'night_vision_distance': 60
    });
    let gmNotesStr = "STR:18 DEX:11 CON:16 INT:4 WIS:14 CHA:5<br><br>";
    let spellAttackBonus = await getAttribute(params.caster, 'spell_attack_bonus');
    let pb = await getAttribute(params.caster, 'pb');
    gmNotesStr += "Proficiency Bonus: " + pb + "<br>";
    gmNotesStr += "Walk Speed 30 ft, "; 
    if (params.type=='Air') gmNotesStr += "Fly Speed 60 ft<br>"
    else if (params.type=='Water') gmNotesStr += "Swim Speed 30 ft<br>"
    else gmNotesStr += "Climb Speed 30 ft<br><br>"
    gmNotesStr += "This creature makes " + Math.floor(Number(params.level)/2) + " attack(s) with the attack action<br><br>"
    gmNotesStr += "**Maul.** Melee Weapon Attack: +" + spellAttackBonus + " to hit, reach 5 ft., one target. Hit: 1d8 + " + (4 + Number(params.level)) + " piercing damage."
    token.set('gmnotes', gmNotesStr);
    return true;
}
async function summonConstruct(params) {
    let img = 'https://files.d20.io/images/429933115/TcSTNDvuWl5SZO7cdz8z5Q/thumb.png?1740163546';
    let token = await summonSomething(params.type + ' Construct Summon', img, 1, 1, params);
    concentrate(params.caster, 'Summon Construct', null, {'id': token.get('id'), 'isSummon': true});
    token.set({
        'bar1_value': 13 + Number(params.level),
        'bar3_value': 40 + (15 * (Number(params.level) - 4)),
        'bar3_max': 40 + (15 * (Number(params.level) - 4)),
        'has_bright_light_vision': true,
        'has_night_vision': true,
        'night_vision_distance': 60
    });
    let gmNotesStr = "STR:18 DEX:10 CON:18 INT:14 WIS:11 CHA:5<br><br>";
    let spellAttackBonus = await getAttribute(params.caster, 'spell_attack_bonus');
    let pb = await getAttribute(params.caster, 'pb');
    gmNotesStr += "Proficiency Bonus: " + pb + "<br>";
    gmNotesStr += "Walk Speed 30 ft<br><br>"; 
    gmNotesStr += "This creature makes " + Math.floor(Number(params.level)/2) + " attack(s) with the attack action<br>"
    gmNotesStr += "**Slam.** Melee Weapon Attack: +" + spellAttackBonus + " to hit, reach 5 ft., one target. Hit: 1d8 + " + (4 + Number(params.level)) + " bludgeoning damage.<br><br>"
    if(params.type=='Clay') gmNotesStr+= "**Berserk Lashing. (Reaction)** When the construct takes damage, it makes a slam attack against a random creature within 5 feet of it. If no creature is within reach, the construct moves up to half its speed toward an enemy it can see, without provoking opportunity attacks.";
    else if (params.type=='Metal') gmNotesStr+= "**Heated Body.** A creature that touches the construct or hits it with a melee attack while within 5 feet of it takes 1d10 fire damage.";
    else if (params.type=='Stone') gmNotesStr+= "**Stony Lethargy.** When a creature the construct can see starts its turn within 10 feet of the construct, the construct can force it to make a Wisdom saving throw against your spell save DC. On a failed save, the target can’t use reactions and its speed is halved until the start of its next turn";
    token.set('gmnotes', gmNotesStr);
    return true;
}


async function animateObjects(params) {
    let img = 'https://files.d20.io/images/449587421/_rOWQtC_LpYP-Yi9nTMKyw/thumb.png';
    //async function summonSomething(summonName, img, w, h, params)
    const sizes = {
        'tiny': {'w': 0.25, 'hp': 20, 'ac': 18, 'gmnotes': "STR:4 DEX:18 CON:10 INT:3 WIS:3 CHA:1", 'toHit': "+8", 'dmg': '1d4+4'},
        'small': {'w': 0.5, 'hp': 25, 'ac': 16, 'gmnotes': "STR:6 DEX:14 CON:10 INT:3 WIS:3 CHA:1", 'toHit': "+6", 'dmg': '1d8+2'},
        'medium': {'w': 1, 'hp': 40, 'ac': 13, 'gmnotes': "STR:10 DEX:12 CON:10 INT:3 WIS:3 CHA:1", 'toHit': "+5", 'dmg': '2d6+1'},
        'large': {'w': 2, 'hp': 50, 'ac': 10, 'gmnotes': "STR:14 DEX:10 CON:10 INT:3 WIS:3 CHA:1", 'toHit': "+6", 'dmg': '2d10+2'},
        'huge': {'w': 3, 'hp': 80, 'ac': 10, 'gmnotes': "STR:18 DEX:6 CON:10 INT:3 WIS:3 CHA:1", 'toHit': "+8", 'dmg': '2d12+4'}
    }
    let i = 1;
    let links = [];
    for (const k in sizes) {
        for(let j = 0; j < params[k]; j++) {
            let summonName = k.charAt(0).toUpperCase() + k.slice(1) + ' Object ' + i++;
            let token = await summonSomething(summonName, img, sizes[k]['w'], sizes[k]['w'], params);
            links.push({'id': token.get('id'), 'isSummon': true});
            token.set({
                'bar1_value': sizes[k]['ac'],
                'bar3_value': sizes[k]['hp'],
                'bar3_max': sizes[k]['hp'],
                'has_bright_light_vision': true,
            });
            let gmNotesStr = sizes[k]['gmnotes'] + "<br><br>Attack: " + sizes[k]['toHit'] + ", " + sizes[k]['dmg'] + " bludgeoning (unless DM says otherwise)<br>" +
            "hover speed 30<br>blindsight 30";
            token.set('gmnotes', gmNotesStr);
        }
    }
    concentrate(params.caster, 'Animate Objects', null, links);
    return true;
}


function spiritualWeapon(params) {
    let img = 'https://files.d20.io/images/395639314/36mS6N5mfMhMw-WnOG7YEA/thumb.png?1717505242';
    params['reference'] = params.caster;
    summonSomething('Spiritual Weapon', img, 1, 1, params);
    return true;
}

async function heroism(params) {
    let spellcastingAbility = await getAttribute(params.caster,'spellcasting_ability')
    let links = [];
    for (let i = 1; i < 12; i++) {
        let t = params['ally' + i];
        if(!t) continue;
        effectOnToken(t, 'glow-holy');
        addTokenStatusMarker(t,'heroism', spellcastingAbility+'HP/turn');
        let token = getToken(t);
        links.push({'id': token.get('id'), 'marker': 'heroism'});
    }  
    concentrate(params.caster, 'Heroism', null, links);
    return true;
}

function intellectFortress(params) {
    let links = [];
    for (let i = 1; i < 12; i++) {
        let t = params['ally' + i];
        if(!t) continue;
        effectOnToken(t, 'glow-charm');
        addTokenStatusMarker(t,'intellectFortress');
        let token = getToken(t);
        links.push({'id': token.get('id'), 'marker': 'intellectFortress'});        
    }  
    concentrate(params.caster, 'Intellect Fortress', null, links);
    return true;
}

async function viciousMockery(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd4');
    params.dmgType = 'psychic';    
    params.stat='wis';
    let saved = await rollTokenSave(params.target, params);   
    effectOnToken(params.target,'glow-charm');
    if (!saved && saved != null) {    
        const target = getToken(params.target);
        let expiration = target ? {'durationRef': target.get('id'), 'duration': 'endOfTurn'} : null;
        addTokenStatusMarker(params.target, 'viciousMockery', null, null, expiration);
        damageToken(params.target, params);
    }
    return true;
}

async function dissonantWhispers(params) {
    params.dmg = await autorollIfNeeded(params, (2+params.level) + 'd6');
    params.dmgType = 'psychic';    
    params.stat = 'wis';
    let token = getToken(params.target);
    if(token == null) {
        echo( "cannot locate a token named '" + params.target + "'");
        return false;
    }
    let statusmarkers = token.get('statusmarkers');
    let type = markers['deafened'];
    let saved = null;
    if(statusmarkers != null && statusmarkers.length > 0) {
        if(statusmarkers.indexOf(type) >= 0) {
            echo( token.get('name') + ' is deafened and automatically succeds its save');
            saved = true;
        }
    }
    if (saved == null) {
        saved = await rollTokenSave(params.target, params);
    }
    if (!saved && saved != null) {
        effectOnToken(params.target, 'bubbling-charm');
    } else {
        if (params.dmg != null) params.dmg = Math.floor(params.dmg/2);
    }
    if (saved != null) damageToken(params.target, params);
    return true;
}

function sanctuary(params) {
    effectOnToken(params.target, 'glow-holy');
    addTokenStatusMarker(params.target,'sanctuary', 'DC' + params.dc);
    return true;
}

function detectMagic(params) {
    effectOnToken(params.caster, 'glow-magic');
    let token = getToken(params.caster);
    concentrate(params.caster, 'Detect Magic', 100, {'id': token.get('id'), 'isAura2': true, 'type': 'detectMagic'});
    token.set({
        'aura2_radius': 30
    });      
    return true;
}

function detectEvilAndGood(params) {
    effectOnToken(params.caster, 'glow-holy');
    effectOnToken(params.caster, 'glow-death');
    let token = getToken(params.caster);
    concentrate(params.caster, 'Detect Evil+Good', 100, {'id': token.get('id'), 'isAura2': true, 'type': 'detectEvilAndGood'});
    token.set({
        'aura2_radius': 30
    });    
    return true;
}

function detectPoisonAndDisease(params) {
    effectOnToken(params.caster, 'glow-slime');
    let token = getToken(params.caster);
    concentrate(params.caster, 'Detect Psn+Dis', 100, {'id': token.get('id'), 'isAura2': true, 'type': 'detectPoisonAndDisease'});
    token.set({
        'aura2_radius': 30
    });    
    return true;
}

function haste(params) {
    effectOnToken(params.ally, 'glow-holy');
    addTokenStatusMarker(params.ally,'haste');
    let token = getToken(params.ally);
    if (token != null) {
        let ac = Number(token.get('bar1_value'));
        if (!isNaN(ac)) {
            token.set('bar1_value', (ac+2));
        }    
    }
    const id = getTokenId(params.ally);
    concentrate(params.caster, 'Haste', null, {'id': id, 'marker': 'haste'});
    return true;
}

function shieldOfFaith(params) {
    effectOnToken(params.target, 'glow-holy');
    addTokenStatusMarker(params.ally,'shieldOfFaith');
    let token = getToken(params.ally);
    if (token != null) {
        token.set('bar1_value', Number(token.get('bar1_value'))+2);
    }    
    let link = token ? {'id': token.get('id'), 'marker': 'shieldOfFaith'} : null;
    concentrate(params.caster, 'Shield Of Faith', 100, link);
    return true;
}

function divineFavor(params) {
    effectOnToken(params.target, 'glow-holy');
    addTokenStatusMarker(params.caster,'divineFavor');
    let token = getToken(params.caster);
    let link = token ? {'id': token.get('id'), 'marker': 'divineFavor'} : null;
    concentrate(params.caster, 'Divine Favor', null, link);
    return true;
}

function protectionFromEnergy(params) {
    effectOnToken(params.ally, 'shield-magic');
    log('protectionFromEnergy' + params.type);
    addTokenStatusMarker(params.ally,'protectionFromEnergy' + params.type);
    let token = getToken(params.ally);
    let link = token ? {'id': token.get('id'), 'marker': ('protectionFromEnergy' + params.type)} : null;    
    concentrate(params.caster, 'Protection From Energy', null, link);
    return true;
}

function bless(params) {
    let links = [];
    for (let i = 1; i < 12; i++) {
        let t = params['ally' + i];
        if(!t) continue;
        effectOnToken(t, 'glow-holy');
        addTokenStatusMarker(t,'bless');
        let token = getToken(t);
        links.push({'id': token.get('id'), 'marker': 'bless'})
    }    
    
    concentrate(params.caster, 'Bless', null, links);
    return true;
}

function protectionFromEvilAndGood(params) {
    effectOnToken(params.ally, 'glow-holy');    
    effectOnToken(params.ally, 'glow-death');
    addTokenStatusMarker(params.ally,'protectionFromEvilAndGood');
    let token = getToken(params.ally);
    let link = token ? {'id': token.get('id'), 'marker': 'protectionFromEvilAndGood'} : null;        
    concentrate(params.caster, 'Protection From Evil & Good', null, link);
    return true;
}

async function bane(params) {
    let links = [];
    for (let i = 1; i < 12; i++) {
        let t = params['target' + i];
        if(!t) continue;
        params.stat = 'cha'
        let saved = await rollTokenSave(t, params);
        if(!saved && saved != null) {
            effectOnToken(t, 'glow-charm');
            addTokenStatusMarker(t,'bane');
            let token = getToken(t);
            links.push({'id': token.get('id'), 'marker': 'bane'});           
        }
    }
    concentrate(params.caster, 'Bane', null, links);
    return true;
}    

async function shatter(params) {
    params.dmg = await autorollIfNeeded(params, (1+Number(params.level)) + 'd8');
    params.dmgType = 'thunder';    
    params.onSave = halfDamage;
    params.stat='con';
    return await circleAoe(params, 10, 'explode-magic', 0, damageToken);
}

async function burningHands(params) {
    params.dmg = await autorollIfNeeded(params, (2+Number(params.level)) + 'd6');
    params.dmgType = 'fire'; 
    params.onSave = halfDamage;
    params.stat = 'dex';
    return await coneAoe(params,15,'fire',damageToken);
}

async function colorSpray(params) {
    params.dmg = await autorollIfNeeded(params, (4+(2*Number(params.level))) + 'd10');
    params.condition = 'blinded';
    let cone = await coneAoe(params,15,'magic');
    if (!cone) return false;
    let caster = getToken(params.caster);
    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
    possibleTargets.sort((p,q) => Number(p.get('bar3_value')) >= Number(q.get('bar3_value')) ? 1 : -1);
    for (let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];
        debugging('checking ' + t.get('name'))
        if(Number(t.get('bar3_value')) > params.dmg) {
            debugging('no more enemies can be blinded based on total HP');
            break;
        }
        if(liesWithinCone(cone,t,caster)) {
            let expiration = caster ? {'durationRef': caster.get('id'), 'duration': 'endOfNextTurn'} : null;
            debugging(t.get('name') + ' lies within the cone');
            addTokenStatusMarker(t,'blinded',null,null,expiration);   
            params.dmg -= Number(t.get('bar3_value'));
        }
    }    
    return true;
}

async function fear(params) {
    params.stat = 'wis';
    params.ignoreAllies = false;
    let callbackFn = function(t, params) {
        if(!params.saved) {
            addTokenStatusMarker(t, 'frightened', 'Fear(' + params.caster + ')');
            echo(t.get('name') + ' has dropped whatever it was holding to flee');
            let caster = getToken(params.caster);
            let casterId = caster ? caster.get('id') : null;
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': t.get('id'), 'marker': 'frightened'});
            }              
        }
    };
    let cone = await coneAoe(params,30,'charm',callbackFn);
    if (!cone) return false;
    concentrate(params.caster, 'Fear');
}

async function tashasCausticBrew(params) {
    params.dmgType = 'acid';    
    params.stat = 'dex';
    let caster = getToken(params.caster);
    let widthPx = 70; // 5 ft --> 70px
    let lengthPx = 420; // 30 ft --> 420px
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: LINE_AOE_STROKEWIDTH, points:"[[0,0],["+widthPx+","+lengthPx+"]]"});
    let aoeMarker = null;    
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'line', 30, 5);
        return false;
    }   
    let adj = {};
    let angle = (270 - Number(aoeMarker.get('rotation')));
    if (angle >= 360) angle -= 360;
    adj.theta = (360 - angle) * (Math.PI/180);
    debugging(aoeMarker);
    let markerTheta = Number(aoeMarker.get('rotation')) * Math.PI/180;
    adj.x = Math.round(aoeMarker.get('x') + (lengthPx * Math.sin(markerTheta)/2));
    adj.y = Math.round(aoeMarker.get('y') - (lengthPx * Math.cos(markerTheta)/2));
    adj.offset_x = Math.round(2*(aoeMarker.get('x') - adj.x));
    adj.offset_y = Math.round(-2*(aoeMarker.get('y') - adj.y)); 
    debugging(printCoordinates(adj.x,adj.y) + '-->' + printCoordinates(adj.x + adj.offset_x,adj.y - adj.offset_y));
    let fx_corrective_factor = getFxCorrectiveFactor(lengthPx, aoeMarker.get('rotation'));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        'beam-acid'
    );        
    aoeMarker.remove();
    let l = 30*70/5;
    let w = 35; //use half width... we because we extend the hitbox by +/- w    
    let rectangle = getRectangleCorners(l, w, adj.x, adj.y, adj.theta);

    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects' && t.get('name').toLowerCase()!=params.caster.toLowerCase());
    for(let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];        
        //radius is provided to this method in feet; multiply by 70/5 to scale to 70px/sq
        if(liesWithinRectangle(rectangle,t)) {
            let saved = await rollTokenSave(t, params);
            if(!saved && saved != null) {
                addTokenStatusMarker(t, 'chemical-bolt', (2*Number(params.level)) + 'd4');
                let caster = getToken(params.caster);
                let casterId = caster ? caster.get('id') : null;
                let tokenObj = getToken(t);
                if (casterId) {
                    addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'chemical-bolt'});
                }                  
            }
        }
    }
    concentrate(params.caster, 'TashasCausticBrew');
    return true;
}

async function gustOfWind(params) {
    await new Promise(r => setTimeout(r,400));
    let adj = {};
    let caster = getToken(params.caster);
    
    let widthPx = 140; // 10 ft --> 140px
    let lengthPx = 840; // 60 ft --> 140px
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: LINE_AOE_STROKEWIDTH, points:"[[0,0],["+widthPx+","+lengthPx+"]]"});
    let aoeMarker = null;
    let fx_corrective_factor = 0;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'line', 60, 10);
        return false;
    }       
    let angle = (270 - Number(aoeMarker.get('rotation')));
    if (angle >= 360) angle -= 360;
    adj.theta = (360 - angle) * (Math.PI/180);
    debugging(aoeMarker);
    let markerTheta = Number(aoeMarker.get('rotation')) * Math.PI/180;
    adj.x = aoeMarker.get('x') + (lengthPx * Math.sin(markerTheta)/2);
    adj.y = aoeMarker.get('y') - (lengthPx * Math.cos(markerTheta)/2);
    adj.offset_x = 2*(aoeMarker.get('x') - adj.x);
    adj.offset_y = -2*(aoeMarker.get('y') - adj.y);
    fx_corrective_factor =  getFxCorrectiveFactor(lengthPx, aoeMarker.get('rotation')); 
    aoeMarker.remove();
    let x1 = Math.round(adj.x);
    let y1 = Math.round(adj.y);
    let x2 = Math.round(x1 + adj.offset_x);
    let y2 = Math.round(y1 - adj.offset_y); //normal cartesian coordinate change where moving up --> +y
    angle = adj.theta;
    debugging(printCoordinates(x1,y1) + '-->' + printCoordinates(x2,y2));
    spawnFxBetweenPoints(
        {"x": x1 + 35*Math.sin(angle), "y": y1 - 35*Math.cos(angle)},
        {"x": x2 + 35*Math.sin(angle), "y": y2 - 35*Math.cos(angle) + fx_corrective_factor},
        'beam-smoke'
    ); 
    spawnFxBetweenPoints(
        {"x": x1 - 35*Math.sin(angle), "y": y1 + 35*Math.cos(angle)},
        {"x": x2 - 35*Math.sin(angle), "y": y2 + 35*Math.cos(angle) + fx_corrective_factor},
        'beam-smoke'
    );   
    params.stat = 'str';
    let l = 60*70/5;
    let w = 70; //use half width... we because we extend the hitbox by +/- w
    let rectangle = getRectangleCorners(l, w, adj.x, adj.y, adj.theta);    
    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects' && t.get('name').toLowerCase()!=params.caster.toLowerCase());
    for(let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];        
        //radius is provided to this method in feet; multiply by 70/5 to scale to 70px/sq
        if(liesWithinRectangle(rectangle,t)) {
            let saved = await rollTokenSave(t, params);
            if(saved != null && !saved) {
                let target = getToken(t);
                let target_x=target.get('left');
                let target_y=target.get('top');
                let delta_x = 210*Math.cos(angle);//210px = 15ft
                let delta_y = 210*Math.sin(angle);               
                t.set({
                    'left': (target_x + delta_x),
                    'top': (target_y + delta_y),
                })
            }
        }
    }    
    return true;
}

async function lightningBolt(params) {
    params.dmg = await autorollIfNeeded(params, (5+Number(params.level)) + 'd6');
    params.dmgType = 'lightning';    
    params.stat = 'dex';
    let adj = {};
    let caster = getToken(params.caster);
    let widthPx = 70; // 5 ft --> 70px
    let lengthPx = 1400; // 100 ft --> 1400px
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: LINE_AOE_STROKEWIDTH, points:"[[0,0],["+widthPx+","+lengthPx+"]]"});
    var lightningBoltFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'LightningBolt');
    if(!lightningBoltFx) {
        lightningBoltFx = createObj('custfx', {"name": 'LightningBolt', "definition": mycustomfx['lightningBolt']});
    }     
    let aoeMarker = null;    
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'line', 100, 5);
        return false;
    }   
    let angle = (270 - Number(aoeMarker.get('rotation')));
    if (angle >= 360) angle -= 360;
    adj.theta = (360 - angle) * (Math.PI/180);
    debugging(aoeMarker);
    let markerTheta = Number(aoeMarker.get('rotation')) * Math.PI/180;
    adj.x = Math.round(aoeMarker.get('x') + (lengthPx * Math.sin(markerTheta)/2));
    adj.y = Math.round(aoeMarker.get('y') - (lengthPx * Math.cos(markerTheta)/2));
    adj.offset_x = Math.round(-1 * lengthPx * Math.sin(markerTheta));
    adj.offset_y = Math.round(-1 * lengthPx*Math.cos(markerTheta));
    debugging(printCoordinates(adj.x,adj.y) + '-->' + printCoordinates(adj.x + adj.offset_x,adj.y - adj.offset_y));
    
    let fx_corrective_factor =  getFxCorrectiveFactor(lengthPx, aoeMarker.get('rotation'));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );
    await new Promise((r)=>setTimeout(r,250));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );
    await new Promise((r)=>setTimeout(r,250));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );  
    await new Promise((r)=>setTimeout(r,50));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );       
    await new Promise((r)=>setTimeout(r,50));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );     
    await new Promise((r)=>setTimeout(r,50));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    ); 
    await new Promise((r)=>setTimeout(r,50));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    ); 
    await new Promise((r)=>setTimeout(r,50));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );  
    await new Promise((r)=>setTimeout(r,50));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );
    await new Promise((r)=>setTimeout(r,50));
    spawnFxBetweenPoints(
        {"x": adj.x, "y": adj.y},
        {"x": adj.x + adj.offset_x, "y": adj.y - adj.offset_y + fx_corrective_factor},
        lightningBoltFx.get('id')
    );        
    aoeMarker.remove();
    let l = 100*70/5;
    let w = 35; //use half width... we because we extend the hitbox by +/- w
    let rectangle = getRectangleCorners(l, w, adj.x, adj.y, adj.theta);

    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects' && t.get('name').toLowerCase()!=params.caster.toLowerCase());
    for(let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];        
        //radius is provided to this method in feet; multiply by 70/5 to scale to 70px/sq
        if(liesWithinRectangle(rectangle,t)) {
            let saved = await rollTokenSave(t, params);
            if(!saved && saved != null) {
                params.onSave = halfDamage;
                damageToken(t, params);                
            }
        }
    }
    return true;
}

async function divineSmite(params) {
    let target = getToken(params.target);
    let fiendOrUndeadBonus = 0;
    if (target != null) {
        let e = lookupEnemy(target);
        if (e != null && e.stats != null && (e.stats['type'] == 'fiend' || e.stats['type'] == 'undead')) {
            fiendOrUndeadBonus = 1;
        }
    }
    params.dmg = await autorollIfNeeded(params, (1+Number(params.level)+fiendOrUndeadBonus) + 'd8');
    params.dmgType = 'radiant';    
    effectOnToken(params.target, 'explode-holy',750);
    damageToken(params.target, params);
    params.dmgType = params.dmgType2.toLowerCase();
    if (params.dmg2 == null) {
        echo('please manually update the damage done by the regular weapon portion');
    }
    params.dmg = params.dmg2;
    damageToken(params.target, params);
    return true;
}

async function searingSmite(params) {
    params.dmg = await autorollIfNeeded(params, (params.level) + 'd6');
    params.dmgType = 'fire';    
    effectOnToken(params.target, 'explode-fire');
    damageToken(params.target, params);
    addTokenStatusMarker(params.target,'searingSmite', 'DC'+params.dc);
    let targetToken = getToken(params.target);
    let link = targetToken ? {'id': targetToken.get('id'), 'marker': 'searingSmite'} : null;
    concentrate(params.caster, 'Searing Smite', null, link);
    if (params.dmg2 == null) {
        echo('please manually update the damage done by the regular weapon portion');
    }
    params.dmgType = params.dmgType2;
    params.dmg = params.dmg2;
    damageToken(params.target, params); 
    return true;
}

async function ensnaringStrike(params) {
    effectOnToken(params.target, 'sparkle-acid');
    damageToken(params.target, params);
    params.stat = 'str';
    let saved = await rollTokenSave(params.target, params);   
    if (!saved && saved != null) {    
        addTokenStatusMarker(params.target,'ensnaringStrike', params.level);
        let caster = getToken(params.caster);
        let casterId = caster ? caster.get('id') : null;
        let tokenObj = getToken(params.target);
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'ensnaringStrike'});
        }  
    }    
    concentrate(params.caster, 'Ensnaring Strike');
    return true;
}

async function wrathfulSmite(params) {
    params.dmg = await autorollIfNeeded(params, '1d6');
    params.dmgType = 'psychic';
    params.condition = 'frightened';
    params.stat = 'wis';
    effectOnToken(params.target, 'explode-charm');
    damageToken(params.target, params);
    let saved = await rollTokenSave(params.target, params);   
    if (!saved && saved != null) {    
        addTokenStatusMarker(params.target,'frightened', 'Wrathful Smite');
        let caster = getToken(params.caster);
        let casterId = caster ? caster.get('id') : null;
        let tokenObj = getToken(params.target);
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'frightened'});
        }          
    }
    params.dmgType = params.dmgType2;
    if (params.dmg2 == null) {
        echo('please manually update the damage done by the regular weapon portion');
    }
    params.dmg = params.dmg2;
    damageToken(params.target, params);
    concentrate(params.caster, 'Wrathful Smite');
    return true;
}

async function blindingSmite(params) {
    params.dmg = await autorollIfNeeded(params, '3d8');
    params.dmgType = 'radiant';
    params.condition = 'blinded';
    params.stat = 'con';
    effectOnToken(params.target, 'explode-holy');
    damageToken(params.target, params);
    let saved = await rollTokenSave(params.target, params);   
    if (!saved && saved != null) {    
        addTokenStatusMarker(params.target,'blinded', 'DC' + params.dc);
        let caster = getToken(params.caster);
        let casterId = caster ? caster.get('id') : null;
        let tokenObj = getToken(params.target);
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'blinded'});
        }        
    }
    params.dmgType = params.dmgType2;
    if (params.dmg2 == null) {
        echo('please manually update the damage done by the regular weapon portion');
    }
    params.dmg = params.dmg2;
    damageToken(params.target, params);
    concentrate(params.caster, 'Blinding Smite');
    return true;
}

async function otilukesResilientSphere(params) {
    params.stat = 'dex';
    let token = getToken(params.target);
    if(token == null) {
        warn('invalid target for Otilukes Resilient Sphere');
        return
    }
    let w = token.get('width');
    if (w > 140) {
        emphasis('This creature is too big for Otiluke\'s Resilient Sphere! (Must be size Large or smaller)')
        return;
    }
    let r = (w/2) * 5 * 0.4142 / 70; //0.4142 is approximately sqrt(2)-1
    
    let e = lookupEnemy(token);
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null; 
    let tokenObj = getToken(params.target);
    let setAura = false;
    if (e != null) {
        let saved = await rollTokenSave(params.target, params);   
        if (!saved && saved != null) {    
            addTokenStatusMarker(params.target,'otilukesResilientSphere');
            setAura = true;
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'otilukesResilientSphere'});
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'isAura2': true, 'type':'otilukesResilientSphere'});
            } 
        }
    } else {
        addTokenStatusMarker(params.target,'otilukesResilientSphere');
        setAura = true;
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'otilukesResilientSphere'});
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'isAura2': true, 'type':'otilukesResilientSphere'});
        }         
    }
    concentrate(params.caster, 'Resilient Sphere');
    if (setAura) {
        token.set({
            'aura2_radius': r
        });
    }
    return true;
}

async function gravityWell(params) {
    params.dmg = await autorollIfNeeded(params, '2d8');
    let caster = getToken(params.caster);
    let target = getToken(params.target);
    params.dmgType = 'force';    
    let temp = params.caster;
    params.caster = params.target;
    params.target = temp;
    await shootRay(params,10,'frost');
    let angle = calculateObjectAngle(caster, target);
    let target_x=target.get('left');
    let target_y=target.get('top');
    let caster_x=caster.get('left');
    let caster_y=caster.get('top');
    let delta_x = 280*Math.cos(angle);//280px=20ft
    let delta_y = 280*Math.sin(angle);//280px=20ft
    target.set('left',target_x-delta_x);
    target.set('top',target_y-delta_y);
    damageToken(params.caster, params); //remember... this is the target... we just flipped it
    return true;
}

async function rayOfFrost(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd8');
    params.dmgType = 'cold';    
    shootRay(params, 0, 'frost');
    damageToken(params.target, params);  
    let target = getToken(params.target);
    if (target != null) {
        let newSpeed = Math.max(0, Number(target.get('bar4_value')) - 10);
        target.set({'bar4_value': newSpeed});
        const caster = getToken(params.caster);
        let expiration = caster ? {'durationRef': caster.get('id'), 'duration': 'startOfTurn'} : null;
        addTokenStatusMarker(params.target, 'rayoffrost', null, null, expiration);
    }
    return true;
}

async function thunderclap(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd6');
    params.dmgType = 'thunder';    
    params.reference=params.caster; 
    params.stat='con';
    params.onSave = noDamage;
    params.ignoreCaster = true;
    return await circleAoe(params, 7.5, 'explode-magic', 0, damageToken);
}

async function wordOfRadiance(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd6');
    params.dmgType = 'radiant';    
    params.reference=params.caster; 
    params.stat='con';
    params.onSave = noDamage;
    params.ignoreAllies = true;
    return await circleAoe(params, 7.5, 'explode-holy', 0, damageToken);
}

async function boomingBlade(params) {
    const cantripScaleVal = Number(await cantripScale(params.caster));
    params.dmg = await autorollIfNeeded(params, (cantripScaleVal - 1) + 'd8');
    params.dmgType = 'thunder';    
    effectOnToken(params.target, 'sparkle-magic');
    damageToken(params.target, params);
    params.dmgType = 'nm' + params.dmgType2.toLowerCase();
    if (params.dmg2 == null) {
        echo('please manually update the damage done by the regular weapon portion');
    }
    params.dmg = params.dmg2;
    damageToken(params.target, params);
    const caster = getToken(params.caster);
    let expiration = caster ? {'durationRef': caster.get('id'), 'duration': 'startOfTurn'} : null;
    addTokenStatusMarker(params.target, 'boomingblade', cantripScaleVal + "d8", null, expiration);    
    return true;
}

async function greenFlameBlade(params) {
    let spellcastingAbility = await getAttribute(params.caster,'spellcasting_ability')
    let cantripScaling = Number(await cantripScale(params.caster));
    params.dmg3 = await autorollIfNeeded(params, (cantripScaling-1) + '+' + spellcastingAbility);
    params.dmgType3 = 'fire';   
    //fire damage to primary
    if (cantripScaling > 1) {
        params.dmg = await autorollIfNeeded(params, (cantripScaling-1));
        params.dmgType = 'fire';
        damageToken(params.target, params);
    }
    //weapon damage to primary
    if (params.dmg2 == null) {
        echo('please manually update the damage done by the regular weapon portion');
    } else {
        params.dmg = params.dmg2;
        params.dmgType = 'nm' + params.dmgType2.toLowerCase();        
        damageToken(params.target, params);
    }
    //fire damage to secondary target
    params.dmg = params.dmg3;
    params.dmgType = params.dmgType3;    
    damageToken(params.target2, params)
    
    let targetOneToken = getToken(params.target);
    let targetTwoToken = getToken(params.target2);
    let fx_corrective_factor =  getFxCorrectiveFactor(calculateObjectDistance(targetOneToken, targetTwoToken), calculateObjectAngle(targetOneToken, targetTwoToken)); 
    
    spawnFxBetweenPoints(
        {"x": targetOneToken.get('left'), "y": targetTwoToken.get('top')},
        {"x": targetTwoToken.get('left'), "y": targetTwoToken.get('top') - fx_corrective_factor},
        'beam-acid'
    );
    return true;
}

async function faerieFire(params) {
    let refToken = getToken(params.reference);
    var faerieFireOne = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'FaerieFire1');
    if(!faerieFireOne) {
        faerieFireOne = createObj('custfx', {"name": 'FaerieFire1', "definition": mycustomfx['faeriefire1']});
    }
    var faerieFireTwo = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'FaerieFire2');
    if(!faerieFireTwo) {
        faerieFireTwo = createObj('custfx', {"name": 'FaerieFire2', "definition": mycustomfx['faeriefire2']});
    }
    var faerieFireThree = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'FaerieFire3');
    if(!faerieFireThree) {
        faerieFireThree = createObj('custfx', {"name": 'FaerieFire3', "definition": mycustomfx['faeriefire3']});
    }    
    let center = getCoordinates(params, refToken);
    params.stat='dex';
    
    let ffCallback = function(t, params) {
        if (!params.saved) {
            let token = getToken(t);
            addTokenStatusMarker(params.target,'faerieFire');
            applyLightToToken(t);
            let caster = getToken(params.caster);
            let casterId = caster ? caster.get('id') : null;
            let tokenObj = getToken(params.target);
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'faerieFire'});
            }              
        }
    }
    
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: SQUARE_AOE_STROKEWIDTH, points:"[[0,0],["+(20*14)+","+(20*14)+"]]"});
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'square', 20, null);
        return;
    }   
    concentrate(params.caster, 'Faerie Fire');
    cubeAoe(params,20,faerieFireOne, ffCallback);
    cubeAoe(params,20,faerieFireTwo);
    return await cubeAoe(params,20,faerieFireThree);
}

function absorbElements(params) {
    effectOnToken(params.caster, 'shield-magic');
    addTokenStatusMarker(params.caster, 'absorbElements', params.dmg);
    return true;    
}

async function thunderwave(params) {
    params.dmg = await autorollIfNeeded(params, (1+Number(params.level)) + 'd8');
    params.dmgType = 'thunder';    
    params.ignoreCaster = true;
    var rightAngle = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'RightAngle');
    if(!rightAngle) {
        rightAngle = createObj('custfx', {"name": 'RightAngle', "definition": mycustomfx['thunderwave']});
    }
    let caster = getToken(params.caster);
    if(params.x===0 && params.y===0) {
        echo( "Sorry, you cannot cast thunderwave on top of yourself");
    } else {
        params.stat = 'con';
        params.onSave = halfDamage;
        let twCallback = function(t, params) {
            damageToken(t, params);
            if (!params.saved) {
                let target = getToken(t);
                let caster = getToken(params.caster);
                let angle = calculateObjectAngle(caster, target);
                let target_x=target.get('left');
                let target_y=target.get('top');
                let delta_x = 140*Math.cos(angle);//140px=10ft
                let delta_y = 140*Math.sin(angle);//140px=10ft
                target.set('left',target_x+delta_x);
                target.set('top',target_y+delta_y);                
            }
        }
        let cube = await cubeAoe(params,15,rightAngle, twCallback);
        if (cube) playSound('thunderwave');
    }
    return null;
}

function shield(params) {
    effectOnToken(params.caster,'shield-magic');
    addTokenStatusMarker(params.caster,'shield');
    let token = getToken(params.caster);
    if (token == null) return;
    let ac = Number(token.get('bar1_value')) + 5;
    token.set('bar1_value', ac);
    return true;    
}

async function mageArmor(params) {
    effectOnToken(params.caster,'shield-holy');
    addTokenStatusMarker(params.caster,'mageArmor');
    let dexMod = await getAttribute(params.caster,'dexterity_mod',null);
    let token = getToken(params.caster);
    dexMod = Number(dexMod);
    if(isNaN(dexMod)) return;
    token.set('bar1_value', (13 + dexMod));
    return true;    
}

async function freedomOfMovement(params) {
    effectOnToken(params.target,'glow-smoke');
    addTokenStatusMarker(params.target,'freedomOfMovement');
    let token = getToken(params.target);
    if (token != null) {
        if (hasMarker(token,'restrained')) clearMarker(token, 'restrained');
        if (hasMarker(token,'paralyzed')) clearMarker(token, 'paralyzed');        
        if (hasMarker(token,'grappled')) clearMarker(token, 'grappled');     
    }
    return true;    
}

async function webOfFire(params) {
    let singleTarget = false;
    if (params['target1'] == params['target2'] && params['target1'] == params['target3'] && params['target1'] == params['target4'] && params['target1'] == params['target5']) singleTarget = true;
    params.dmg1 = await autorollIfNeeded(params, (4+Number(params.level)+ (singleTarget ? 4 : 0)) + 'd6', 'dmg1');
    if (!singleTarget) {
        params.dmg2 = params.dmg1;
        params.dmg3 = params.dmg1;
        params.dmg4 = params.dmg1;
        params.dmg5 = params.dmg1;
    }
    params.dmgType = 'fire';    
    params.onSave = halfDamage;
    params.stat = 'dex';
    
    let fire = async function(i) {
        params.target = params['target' + i];
        params.dmg = params['dmg' + i];
        if(params.dmg == null || params.dmg == '' || isNaN(params.dmg)) return;
        inform('FIRE AT ' + params.target);
        await shootRay(params, 0, 'fire');  
    }
    //using separate loops because otherwise the rays might not fire correctly
    for(let i=1; i <= 5; i++) {    
        await fire(i);
    }
    for(let i=1; i <= 5; i++) {
        params.target = params['target' + i];
        params.dmg = params['dmg' + i];
        if(params.dmg == null || params.dmg == '' || isNaN(params.dmg)) continue;
        let saved = await rollTokenSave(params.target, params);
        if (saved != null) damageToken(params.target, params);       
    }
    return true;    
}

async function firebolt(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd10');
    params.dmgType = 'fire';    
    effectOnToken(params.target, 'burn-fire');
    damageToken(params.target, params);    
    return true;    
}

async function starryWisp(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd8');
    params.dmgType = 'radiant';    
    effectOnToken(params.target, 'sparkle-holy');
    damageToken(params.target, params);  
    return true;    
}

async function bloodBolt(params) {
    params.dmg1 = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd6', 'dmg1');
    params.dmg2 = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd6', 'dmg2');
    params.dmgType = 'piercing';  
    params.dmg = params.dmg1;
    effectOnToken(params.caster, 'burn-blood');
    effectOnToken(params.target, 'burn-blood');
    damageToken(params.target, params);    
    await new Promise((r)=>setTimeout(r,100));
    params.dmgType = 'necrotic';
    params.dmg = params.dmg2;
    damageToken(params.target, params);    
    let token = getToken(params.caster);
    let hp = Number(token.get('bar3_value'));
    if (hp != null && !isNaN(hp)) {
        hp--;
        token.set({
            'bar3_value': hp
        });
    }
    return true;    
}

function thaumaturgy(params) {
    effectOnToken(params.caster, 'glow-holy', 250);
    return true;    
}

function createWater(params) {
    var createWaterFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'CreateWater');
    if(!createWaterFx) {
        createWaterFx = createObj('custfx', {"name": 'CreateWater', "definition": mycustomfx['createwater']});
    }
    cubeAoe(params,30,createWaterFx);
    return true;    
}

async function hypnoticPattern(params) {
    let refToken = getToken(params.reference);
    params.condition = 'charmed';
    var patternFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'HypnoticPattern');
    if(!patternFx) {
        patternFx = createObj('custfx', {"name": 'HypnoticPattern', "definition": mycustomfx['hypnoticpattern']});
    }
    let center = getCoordinates(params, refToken);
    params.stat = 'wis';
    let casterToken = getToken(params.caster);
    let casterId = casterToken ? casterToken.get('id') : null;
    let hpCallback = function(t, params) {
        if (!params.saved) {
            let token = getToken(t);
            let tokenId = token ? token.get('id') : null;
            addTokenStatusMarker(params.target,'hypnoticPattern');
            if (casterId != null && tokenId != null) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenId, 'marker': 'hypnoticPattern'});
            }
        }
    }
    concentrate(params.caster, 'Hypnotic Pattern');
    return await cubeAoe(params,30,patternFx,hpCallback);    
}

async function slow(params) {
    let refToken = getToken(params.reference);
    var patternFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'Slow');
    if(!patternFx) {
        patternFx = createObj('custfx', {"name": 'Slow', "definition": mycustomfx['slow']});
    }
    let center = getCoordinates(params, refToken);
    params.stat = 'wis';
    let casterToken = getToken(params.caster);
    let casterId = casterToken ? casterToken.get('id') : null;    
    let sCallback = function(t, params) {
        if (!params.saved) {
            let token = getToken(t);
            addTokenStatusMarker(token,'slow','DC' + params.dc);
            let ac = Number(token.get('bar1_value'));
            if (!isNaN(ac)) {
                token.set('bar1_value', (ac-2));
            }
            let tokenId = token ? token.get('id') : null;
            if (casterId != null && tokenId != null) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenId, 'marker': 'slow'});
            }            
        }
    }
    let retval = await cubeAoe(params,40,patternFx,sCallback);
    if (retval) concentrate(params.caster, 'Slow');
    return retval;
}

async function chillTouch(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd8');
    params.dmgType = 'necrotic';    
    effectOnToken(params.target,'sparkle-death');
    effectOnToken(params.target,'sparkle-frost');
    damageToken(params.target, params);
    const caster = getToken(params.caster);
    let expiration = caster ? {'durationRef': caster.get('id'), 'duration': 'startOfTurn'} : null;
    addTokenStatusMarker(params.target, 'chilltouch', null, null, expiration);
    let enemy = lookupEnemy(params.target);
    if (caster != null && enemy != null && enemy.stats != null && enemy.stats.type == 'undead') {
        expiration = caster ? {'durationRef': caster.get('id'), 'duration': 'endOfNextTurn'} : null;
        addTokenStatusMarker(params.target, 'disadvantage', null, null, expiration);
    }
    return true;
}

async function mindSliver(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd6');
    params.dmgType = 'psychic';    
    var target = getToken(params.target);
    spawnFx(target.get('left'), target.get('top'), 'glow-charm');
    params.stat='int';
    let saved = await rollTokenSave(params.target, params);
    
    const caster = getToken(params.caster);
    if (!saved && saved != null) {
        damageToken(params.target, params);   
        let expiration = caster ? {'durationRef': caster.get('id'), 'duration': 'endOfNextTurn'} : null;
        addTokenStatusMarker(params.target, 'mindsliver', null, null, expiration);    
    }
    return true;
}

async function shockingGrasp(params) {
    params.dmg = await autorollIfNeeded(params, Number(await cantripScale(params.caster)) + 'd8');
    params.dmgType = 'lightning';    
    var grasp = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'ShockingGrasp');
    if(!grasp) {
        grasp = createObj('custfx', {"name": 'ShockingGrasp', "definition": mycustomfx['shockinggrasp']});
    }    
    for(let i = 0; i < 3; i++) {
        effectOnToken(params.target, grasp.get('id'), 200*i);
    }
    damageToken(params.target, params); 
    const target = getToken(params.target)
    if (target != null) {
        let expiration = target ? {'durationRef': target.get('id'), 'duration': 'startOfTurn'} : null;
        addTokenStatusMarker(params.target, 'shockinggrasp', null, null, expiration);
    }    
    return true;
}

async function inflictWounds(params) {
    params.dmg = await autorollIfNeeded(params, (Number(params.level)+2) + 'd10');
    params.dmgType = 'necrotic';    
    effectOnToken(params.target, 'burn-death');
    damageToken(params.target, params);    
    return true;
}

async function chromaticOrb(params) {
    params.dmg = await autorollIfNeeded(params, (Number(params.level)+2) + 'd8');
    let element = Object.values(elements).find((v) => elements[params.type.toLowerCase()] == v);
    if (!element) {
        echo( 
            'Sorry, \''+ params.type + '\' is not a valid damage type for Chromatic Orb'
        );
        return;
    }
    params.dmgType = Object.keys(elements).find((k) => k.length > 1 && k.indexOf(params.type.toLowerCase()) == 0); //make sure we don't get the single letter abbrev.
    playSound(params.dmgType + 'chromaticorb');
    let token = getToken(params.target);
    if (token == null) {
        echo( "Sorry, I cannot find a token named '" + params.target + "'");
        return;
    }
    effectOnToken(params.target,'bomb-'+element);
    damageToken(params.target, params);
    return null;
}

async function chaosBolt(params) {
    const chaosBoltElements = {
        'fire': 'fire',
        'cold': 'frost',
        'thunder': 'magic',
        'lightning': 'frost',
        'acid': 'acid',
        'poison': 'acid',
        'force': 'magic',
        'psychic': 'charm'
    };  
    let damageDieOne = null;
    let damageDieTwo = null;
    let damageDieThree = null;
    let element = Object.values(chaosBoltElements).find((v) => chaosBoltElements[params.type.toLowerCase()] == v);
    if (params.type != 'Roll' && !element) {
        echo( 
            'Sorry, \''+ params.type + '\' is not a valid damage type for Chaos Bolt'
        );
        return;
    }    
    let damageTypeArray = Object.keys(chaosBoltElements).sort();
    if (isNaN(params.dmg) || params.dmg == '') {
        damageDieOne = randomInteger(8);
        damageDieTwo = randomInteger(8);
        damageDieThree = 0;
        for (let i = 0; i < Number(params.level); i++) {
            damageDieThree += randomInteger(6);
        }
        if (damageDieOne == damageDieTwo) {
            emphasis('The bolt leaps to another target within 30 feet!');
        }
        log(damageDieOne);
        params.dmg = damageDieOne + damageDieTwo + damageDieThree;
        if (params.type == 'Roll') {
            params.type = damageTypeArray[damageDieOne - 1];
            element = chaosBoltElements[params.type.toLowerCase()];
        }
        echo('autorolled <b>2d8+' + params.level + 'd6</b> for <b>' + params.dmg + '</b>. Damage type is <b>' + params.type.charAt(0).toUpperCase() + params.type.slice(1) + '</b>');
    }
    if (params.type == 'Roll') {
        if (damageDieOne == null) {
            damageDieOne = await rollDice(params.caster, '1d8');
            damageDieOne = damageDieOne['total'];
        }
        params.type = damageTypeArray[damageDieOne - 1];
        element = chaosBoltElements[params.type.toLowerCase()];        
    }    
    
    params.dmgType = params.type.toLowerCase();
    if (params.dmgtype == 'psychic') playSound('mindsliver');
    else if (params.dmgtype == 'force') playSound('forcechaosbolt');
    else playSound(params.dmgType + 'chromaticorb');
    let token = getToken(params.target);
    if (token == null) {
        echo( "Sorry, I cannot find a token named '" + params.target + "'");
        return;
    }
    effectOnToken(params.target,'bomb-'+element);
    damageToken(params.target, params);
    return null;
}

async function gabrielsChromaticBurst(params) {
    params.dmg = await autorollIfNeeded(params, (Number(params.level)+1) + 'd8');
    let element = Object.values(elements).find((v) => elements[params.type.toLowerCase()] == v);
    if (!element) {
        echo( 
            'Sorry, \''+ params.type + '\' is not a valid damage type for Gabriel\'s Chromatic Burst'
        );
        return;
    }
    params.dmgType = Object.keys(elements).find((k) => k.length > 1 && k.indexOf(params.type.toLowerCase()) == 0); //make sure we don't get the single letter abbrev.
    playSound(params.dmgType + 'chromaticorb');
    effectOnToken(params.target,'burst-'+element);
    damageToken(params.target, params);
    params.stat = 'dex'
    params.x = '0'; params.y='0'; params.reference = params.target;
    params.dmg2 = await autorollIfNeeded(params, Number(params.level) + 'd4', 'dmg2');
    params.dmg = params.dmg2;
    if (isNaN(params.dc)) {
       echo( "please provide a numeric value for spell DC");
       return;
    }
    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
    let refToken = getToken(params.reference);
    let c = getCoordinates(params, refToken);
    for(let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];        
        if(liesWithinCircle({'x':c.x,'y':c.y,'r':(7.5*70/5)},t)) {
            debugging(t.get('name') + ' lies within the circle');
            let saved = await rollTokenSave(t, params);
            if(!saved && saved != null) {
                await damageToken(t, params);
            }
        }
    }
    return null;
}

function light(params) {
    var token = null;
    if(params.target!=null) {
        token = getToken(params.target);
        applyLightToToken(token);
    } else {
        applyLightToMap(params);
    }
    return true;
}

function applyLightToToken(token) {
    if(!token) return;
    trace('applying light to ' + token.get('name'));
    token.set({
        "bright_light_distance": 20,
        "emits_bright_light": true,
        "emits_low_light": true, 
        "low_light_distance": 40,
    });
}

function applyLightToMap(params) {
    let refToken = getToken(params.reference);
    let c = getCoordinates(params, refToken);
    createObj('graphic', {
            pageid: Campaign().get('playerpageid'),
            layer: 'walls',
            left: c.x,
            top: c.y,
            width: 70,
            height: 70,
            imgsrc: "https://files.d20.io/images/391148556/0exsVLy0R-0pDKuPbkpDcg/thumb.png?1714601449",
            bright_light_distance: 20,
            emits_bright_light: true,
            emits_low_light: true, 
            low_light_distance: 40
    });   
}

async function catapult(params) {
    params.dmg = await autorollIfNeeded(params, (Number(params.level)+2) + 'd8');
    params.dmgType = 'bludgeoning';    
    let widthPx = 14; // 1 ft --> 14px
    let lengthPx = 1260; // 90 ft --> 1260px
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: LINE_AOE_STROKEWIDTH, points:"[[0,0],["+widthPx+","+lengthPx+"]]"});
    let aoeMarker = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
    }
    if (aoeMarker == null) {
        debugging("[[0,0],["+widthPx+","+lengthPx+"]]");
        debugging( findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: LINE_AOE_STROKEWIDTH}) );        
        emphasis('Place the marker where you want the spell to go, and then cast the spell again');       
        drawShape('all', 'line', 90, 1);
        return false;
    }    
    let fx_corrective_factor = 0;
    let adj = {}
    let angle = (270 - Number(aoeMarker.get('rotation')));
    if (angle >= 360) angle -= 360;
    fx_corrective_factor =  getFxCorrectiveFactor(lengthPx, angle); 
    adj.theta = (360 - angle) * (Math.PI/180);
    debugging(aoeMarker);
    let markerTheta = Number(aoeMarker.get('rotation')) * Math.PI/180;
    adj.x = aoeMarker.get('x') + (lengthPx * Math.sin(markerTheta)/2);
    adj.y = aoeMarker.get('y') - (lengthPx * Math.cos(markerTheta)/2);
    adj.offset_x = 2*(aoeMarker.get('x') - adj.x);
    adj.offset_y = -2*(aoeMarker.get('y') - adj.y);
    
    aoeMarker.remove();
    let x1 = Math.round(adj.x);
    let y1 = Math.round(adj.y);
    let x2 = Math.round(x1 + adj.offset_x);
    let y2 = Math.round(y1 - adj.offset_y); //normal cartesian coordinate change where moving up --> +y
    angle = adj.theta;
    debugging(printCoordinates(x1,y1) + '-->' + printCoordinates(x2,y2));
    var catapult = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'Catapult');
    if(!catapult) {
        catapult = createObj('custfx', {"name": 'Catapult', "definition": mycustomfx['catapult']});
    }   
    spawnFxBetweenPoints(
        {"x": x1, "y": y1},
        {"x": x2, "y": y2},
        catapult.get('id')
    ); 
    spawnFxBetweenPoints(
        {"x": x1, "y": y1},
        {"x": x2, "y": y2 - fx_corrective_factor},
        catapult.get('id')
    ); 

    params.stat = 'dex';
    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
    possibleTargets.sort((p,q) => calculateDistance(x1,y1,p.get('left'),p.get('top')) >= calculateDistance(x1,y1,q.get('left'),q.get('top')) ? 1 : -1);
    for (let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];
        debugging('checking ' + t.get('name'));
        if(lineIntersectsTarget(x1,y1,x2,y2,1260,t)) {
            params.target = t;
            let saved = await rollTokenSave(t, params);
            if (!saved && saved != null) {
                damageToken(t, params);
                break;
            }
        }
    }
    return true;
}

function hemorrhagingCurse(params) {
    effectOnToken(params.target, 'bubbling-blood');
    addTokenStatusMarker(params.target,'hemorrhagingcurse');
    let token = getToken(params.caster);
    let hp = Number(token.get('bar3_value'));
    if (hp != null && !isNaN(hp)) {
        hp--;
        token.set({
            'bar3_value': hp
        });
    }   
    let target = getToken(params.target);
    let targetLink = target ? {'id': target.get('id'), 'marker': 'hemorrhagingcurse'} : null;    
    concentrate(params.caster, 'Hemorrhaging Curse', null, targetLink);
    return true;
}

async function exsanguinate(params) {
    params.dmg = await autorollIfNeeded(params, (Number(params.level)+2) + 'd6');
    params.stat = 'con';
    effectOnToken(params.target, 'burst-blood');
    let token = getToken(params.caster);
    let casterHP = Number(token.get('bar3_value'));
    if (casterHP != null && !isNaN(casterHP)) {
        effectOnToken(params.caster, 'bubbling-blood');
        casterHP -= 4;
        token.set({
            'bar3_value': casterHP
        });
    }     
    let saved = await rollTokenSave(params.target, params);
    let e = lookupEnemy(params.target);
    let maxHP = -1;
    let HP = -1;
    let extraDamage = false;
    if (e != null) {
        maxHP = e.getMaxHP();
        HP = e.getHP();
        if (maxHP > 0 && (2*HP) <= maxHP) {
            extraDamage = true;
        }
    }
    if(!saved && saved != null) {
        if (e != null && maxHP > 0) {
            e.token.set({
                'bar3_max': (maxHP - Number(params.dmg))
            });
        }
    } else {
        params.dmg = Number(params.dmg)/2; 
    }    
    if (e != null) {
        damageToken(params.target, params);    
        if (extraDamage) {
            params.dmgExtra = await autorollIfNeeded(params, (Number(params.level)+2) + 'd6', 'dmgExtra');
            params.dmg = params.dmgExtra;
            damageToken(params.target, params);
        }
    }
    return true;
}

async function sanguineSpears(params) {
    let token = getToken(params.caster);
    let statusmarkers = token.get('statusmarkers');
    let alreadyHasSpears = statusmarkers.indexOf('sanguinespears') >= 0;  
    let current_spear_count = 0;
    if (params.mode == 'Creating' && alreadyHasSpears) {
        current_spear_count = Number(getBadge(token, 'sanguinespears'));
        clearMarker(token,'sanguinespears');
        inform('need to add more to existing spear count');
    }
    if (params.mode == null) return;
    if (params.mode == 'Creating') {
        effectOnToken(params.caster, 'burn-blood');
        addTokenStatusMarker(token,'sanguinespears',Number(params.level) + current_spear_count);
        let hp = Number(token.get('bar3_value'));
        if (hp != null && !isNaN(hp)) {
            hp -= (2*Number(params.level));
            hp = Math.max (0, hp);
            token.set({
                'bar3_value': hp
            });
        }           
    } else if (params.mode == 'Attacking') {
        params.dmg = await autorollIfNeeded(params, '2d6');
        let token = getToken(params.caster);
        let hp = Number(token.get('bar3_value'));
        let hp_max = Number(token.get('bar3_max'));
        let spear_count = getBadge(token, 'sanguinespears');
        if (spear_count == null || spear_count <= 0) {
            echo( 'you must create new sanguine spears before you can attack with them');
            return; 
        }
        effectOnToken(params.target, 'burn-blood');
        params.dmgType = 'piercing';  
        params.dmg = params.dmg1;
        damageToken(params.target, params);    
        await new Promise((r)=>setTimeout(r,300));
        params.dmgType = 'necrotic';
        params.dmg2 = await autorollIfNeeded(params, '2d6', 'dmg2');
        params.dmg = params.dmg2;   
        damageToken(params.target, params);    
        clearTokenMarker(token,'sanguinespears');
        spear_count--;
        if (spear_count > 0) addTokenStatusMarker(token,'sanguinespears',spear_count);        
        if (hp != null && !isNaN(hp)) {
            hp += 5;
            hp = Math.min(hp, hp_max);
            token.set({
                'bar3_value': hp
            });
        }          
    }
    return true;
}

function hex(params) {
    var hexFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'Hex');
    if(!hexFx) {
        hexFx = createObj('custfx', {"name": 'Hex', "definition": mycustomfx['hex']});
    } 
    effectOnToken(params.target, hexFx.get('id'));
    addTokenStatusMarker(params.target,'hex',params.stat);
    let target = getToken(params.target);
    let targetLink = target ? {'id': target.get('id'), 'marker': 'hex'} : null;       
    concentrate(params.caster, 'Hex', null, targetLink);
    return true;
}

function bardicInspiration(params) {
    addTokenStatusMarker(params.ally,'bardicInspiration');
}

function jump(params) {
    effectOnToken(params.target, 'glow-frost');
    addTokenStatusMarker(params.target,'jump');
    return true;
}

function expeditiousRetreat(params) {
    effectOnToken(params.caster, 'glow-frost');
    addTokenStatusMarker(params.caster,'expeditiousRetreat');
    let target = getToken(params.caster);
    let targetLink = target ? {'id': target.get('id'), 'marker': 'expeditiousRetreat'} : null;       
    concentrate(params.caster, 'Expeditious Retreat', null, targetLink);
    return true;
}

function huntersMark(params) {
    effectOnToken(params.target,'burn-acid');
    addTokenStatusMarker(params.target,'huntersMark');
    let target = getToken(params.target);
    let targetLink = target ? {'id': target.get('id'), 'marker': 'huntersMark'} : null;       
    concentrate(params.caster, 'Hunter\'s Mark', null, targetLink);
    return true;
}

async function iceKnife(params) {
    params.dmg = await autorollIfNeeded(params, (Number(params.level)+1) + 'd6');
    params.dmgType = 'cold';    
    shootRay(params, 0, 'frost','explode');
    damageToken(params.target, params);
    params.stat = 'dex'
    params.x = '0'; params.y='0'; params.reference = params.target;
    params.dmg2 = await autorollIfNeeded(params, '1d10', 'dmg2');
    params.dmg = params.dmg2;
    if (isNaN(params.dc)) {
       echo( "please provide a numeric value for spell DC");
       return;
    }
    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
    let refToken = getToken(params.reference);
    let c = getCoordinates(params, refToken);
    for(let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];        
        if(liesWithinCircle({'x':c.x,'y':c.y,'r':(7.5*70/5)},t)) {
            debugging(t.get('name') + ' lies within the circle');
            let saved = await rollTokenSave(t, params);
            if(!saved && saved != null) {
                await damageToken(t, params);
            }
        }
    }    
    return true;
}

async function charmPerson(params) {
    params.condition = 'charmed';
    for (let i = 1; i < 12; i++) {
        let t = params['target' + i];
        if(getToken(t)==null) continue;
        params.stat = 'wis';
        effectOnToken(t,'bubbling-charm');
        let saved = await rollTokenSave(t, params);
        if(!saved && saved != null) {
            addTokenStatusMarker(t,'charmPerson');
        }
    } 
    return true;
}

async function command(params) {
    for (let i = 1; i < 12; i++) {
        let t = params['target' + i];
        if(getToken(t)==null) continue;
        params.stat = 'wis';
        effectOnToken(t,'bubbling-charm');
        let saved = await rollTokenSave(t, params);
        if(!saved && saved != null) {
            addTokenStatusMarker(t,'command', params.command, null, {'durationRef': getToken(t).get('id'), 'duration': 'endOfTurn'});
        }
    }       
    return true;
}

async function compelledDuel(params) {
    params.stat = 'wis';
    effectOnToken(params.target,'glow-charm');
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    let tokenObj = getToken(params.target);
    let saved = await rollTokenSave(params.target, params);
    if(!saved && saved != null) {
        addTokenStatusMarker(params.target,'compelledDuel');
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'compelledDuel'});
        }          
    }
    concentrate(params.caster, 'Compelled Duel');
    return true;
}

async function sleep(params) {
    params.dmg = await autorollIfNeeded(params, (2*Number(params.level)+3) + 'd8');
    params.condition = 'unconscious';
    let possibleAoEMarkers = findObjs({_type: 'pathv2', stroke: AOE_COLOR, stroke_width: CIRCLE_AOE_STROKEWIDTH, points:"[[0,0],[560,560]]"});
    
    //retrieve AOE marker information before circleAoE deletes it so we can pass the coordinates to our handler for targets in range
    let aoeMarker = null;
    let x = null;
    let y = null;
    if (possibleAoEMarkers != null && possibleAoEMarkers.length > 0) {
        aoeMarker = possibleAoEMarkers[0];
        x = aoeMarker.get('x'); y = aoeMarker.get('y');        
    }    
    circleAoe(params, 20, 'nova-charm');
    if (x == null || y == null) return false;
    let possibleTargets = tokens.filter((t) => t.get('layer')=='objects');
    possibleTargets.sort((p,q) => Number(p.get('bar3_value')) >= Number(q.get('bar3_value')) ? 1 : -1);
    for (let i = 0; i < possibleTargets.length; i++) {
        let t = possibleTargets[i];
        if(liesWithinCircle({'x':x,'y':y,'r':(20*70/5)},t)) {
            if(Number(t.get('bar3_value')) > params.dmg) break;
            debugging(t.get('name') + ' lies within the circle');
            addTokenStatusMarker(t,'sleep');   
            params.dmg -= Number(t.get('bar3_value'));
        }
    }    
    return true;
}

async function blindnessDeafness(params) {
    let mode = params.mode.toLowerCase();
    params.stat = 'con';
    if(mode!='b' && mode!='d' && mode!='blind' && mode!='deaf' && mode!='blindness' && mode!='deafness') {
        echo(
            '\'' + mode + '\' is not a valid mode for this spell. Please select \'b\' for blindness, or \'d\' for deafness'
        );
        return;
    }
    let blinding = false;
    if (mode=='b' || mode=='blind' || mode=='blindness') {
        blinding=true;
        params.condition = 'blinded';
    } else {
        params.condition = 'deafened';
    }
    for (let i = 1; i < 9; i++) {
        let t = params['target' + i];
        if(!t) continue;
        effectOnToken(t,'burn-death');
        let tokenObj = getToken(t);
        let saved = await rollTokenSave(t, params);
        if(!saved && saved != null) {
            addTokenStatusMarker(t, params.condition, 'DC'+params.dc);
        }
    }   
    if(blinding) {
        playSound('myeyes');
    } else {
        playSound('myears');
    }
    return null;    
}

async function holdPerson(params) {
    params.condition = 'paralyzed';
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    for (let i = 1; i < 12; i++) {
        let t = params['target' + i];
        if(!t) continue;
        effectOnToken(t,'bubbling-charm');
        params.stat = 'wis'
        let e = lookupEnemy(t);
        if (e != null && e.stats != null && e.stats.type !== 'humanoid') {
            emphasis('The spell fails to effect ' + t + ' as it is non-humanoid');
            continue;
        }
        let saved = await rollTokenSave(t, params);
        let tokenObj = e.token;
        if(!saved && saved != null) {
            addTokenStatusMarker(t,'holdPerson', 'DC' + params.dc);
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'paralyzed'});
            }
        }
    }  
    concentrate(params.caster, 'Hold Person');
    return true;
}

async function holdMonster(params) {
    params.condition = 'paralyzed';
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    for (let i = 1; i < 12; i++) {
        let t = params['target' + i];
        if(!t) continue;
        effectOnToken(t,'bubbling-charm');
        params.stat = 'wis'
        let e = lookupEnemy(t);
        if (e != null && e.stats != null && e.stats.type == 'undead') {
            emphasis('The spell fails to effect ' + t + ' as it is undead');
            continue;
        }
        let saved = await rollTokenSave(t, params);
        let tokenObj = e.token;
        if(!saved && saved != null) {
            addTokenStatusMarker(t,'holdMonster', 'DC' + params.dc);
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'paralyzed'});
            }   
        }
    }  
    concentrate(params.caster, 'Hold Monster');
    return true;
}

async function banishment(params) {
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    for (let i = 1; i < 12; i++) {
        let t = params['target' + i];
        if(!t) continue;
        effectOnToken(t,'bubbling-smoke');
        params.stat = 'cha'
        let e = lookupEnemy(t);
        let saved = await rollTokenSave(t, params);
        let tokenObj = e.token;
        if(!saved && saved != null) {
            addTokenStatusMarker(t,'banishment', 'Banished');
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'banishment'});
            }   
            await new Promise(r => setTimeout(r,400));
            playSound('banishment');               
        }
    }  
    concentrate(params.caster, 'Banishment');
    return true;
}

async function polymorph(params) {
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    for (let i = 1; i < 12; i++) {
        let t = params['target' + i];
        if(!t) continue;
        effectOnToken(t,'bomb-smoke');
        params.stat = 'wis'
        let saved = await rollTokenSave(t, params);
        let tokenObj = getToken(t);
        if(!saved || saved == null) { //if enemy failed save or is ally who doesn't roll a save...
            addTokenStatusMarker(t,'polymorph');
            getToken(t).set({
                'bar2_value': Number(params.tempHP),
                'bar2_max': Number(params.tempHP)                
            });
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'polymorph'});
            } 
        }
    }  
    concentrate(params.caster, 'Polymorph');
    return true;
}

async function levitate(params) {
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    effectOnToken(params.target,'bomb-smoke');
    params.stat = 'con';
    let tokenObj = getToken(params.target);
    let saved = await rollTokenSave(params.target, params);
    if(!saved || saved == null) { //if enemy failed save or is ally who doesn't roll a save...
        addTokenStatusMarker(params.target,'fluffy-wing','20ft.');
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'fluffy-wing'});
        }         
    }
    concentrate(params.caster, 'Levitate');
    return true;
}

async function tashasHideousLaughter(params) {
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    let tokenObj = getToken(params.target);
    params.stat = 'wis';
    params.condition = 'incapacitated';
    effectOnToken(params.target,'bubbling-charm');
    let saved = await rollTokenSave(params.target, params);
    if(!saved && saved != null) {
        addTokenStatusMarker(params.target,'tashasHideousLaughter', 'DC' + params.dc);
        addTokenStatusMarker(params.target,'prone');  
        addTokenStatusMarker(params.target,'incapacitated'); 
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'tashasHideousLaughter'});
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'incapacitated'});
        }        
    } 
    concentrate(params.caster, 'Hideous Laughter');
    return true;
}

async function bestowCurse(params) {
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    let tokenObj = getToken(params.target);
    params.stat = 'wis';
    var hexFx = findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'Hex');
    if(!hexFx) {
        hexFx = createObj('custfx', {"name": 'Hex', "definition": mycustomfx['hex']});
    } 
    effectOnToken(params.target, hexFx.get('id'));    
    let saved = await rollTokenSave(params.target, params);
    if(!saved && saved != null) {
        addTokenStatusMarker(params.target,'bestowCurse');
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'bestowCurse'});
        }        
    } 
    concentrate(params.caster, 'Bestow Curse');
    return true;
}

function wardingBond(params) {
    effectOnToken(params.caster,'glow-holy');
    addTokenStatusMarker(params.caster,'wardingBond');
    effectOnToken(params.ally,'glow-holy');
    addTokenStatusMarker(params.ally,'wardingBond', params.caster);
    let token = getToken(params.caster);
    let casterId = token ? token.get('id') : null;
    let target = getToken(params.ally);
    let targetId = target ? target.get('id'): null;
    if (casterId) {
        addMarkerTracker({'id': casterId, 'marker': 'wardingBond'}, {'id': casterId, 'isAura2': true, 'type': 'wardingBond'});
        if (targetId) {
            addMarkerTracker({'id': casterId, 'marker': 'wardingBond'}, {'id': targetId, 'marker': 'wardingBond'});
        }        
    }  
    token.set({
        'aura2_radius': 60,
        'aura2_color': '#efefef'
    });    
    return true;
}

function aid(params) {
    for (let i = 1; i <= 3; i++) {
        let t = params['ally' + i];
        if(!t) continue;
        effectOnToken(t, 'glow-holy');
        t = getToken(t);
        let maxHP = Number(t.get('bar3_max'));
        let currentHP = Number(t.get('bar3_value'));
        let hpBoost = 5*(Number(params.level)-1);
        if(!isDead(t) && !hasMarker(t,'aid')) {
            t.set({
               'bar3_max': (maxHP + hpBoost),
               'bar3_value': (currentHP + hpBoost)
            });
            addTokenStatusMarker(t,'aid', ('(Level ' + params.level + ')'));
        } else if (hasMarker(t, 'aid')) {
            let badge = getBadge(t, 'aid');
            if (badge != null) {
                let currentAidLevel = Number(badge.replace('(Level ', '').replace(')',''));
                if (currentAidLevel < Number(params.level)) {
                    hpBoost = 5*(Number(params.level) - currentAidLevel);
                    t.set({
                       'bar3_max': (maxHP + hpBoost),
                       'bar3_value': (currentHP + hpBoost)
                    });
                    clearMarker(t, 'aid');
                    addTokenStatusMarker(t,'aid', ('(Level ' + params.level + ')'));
                }
            }
        }
    } 
    return true;
}

function goodberry(params) {
    let target = getToken(params.target);
    if(!target) return;
    let currentHP = Number(target.get('bar3_value'));
    if(currentHP == null || isDead(target)) return;
    if(currentHP == 0) {
        playSound('1Up');
    }
    target.set('bar3_value', Math.max(1,(Number(currentHP) + 1)));
    return null;
}

function passWithoutTrace(params) {
    addTokenStatusMarker(params.caster,'passWithoutTrace');
    let caster = getToken(params.caster)
    const links = [{'id': caster.get('id'), 'isAura1': true, 'type': 'passWithoutTrace'}, {'id': caster.get('id'), 'marker': 'passWithoutTrace'}];
    concentrate(params.caster, 'Pass Without Trace', null, links);
    let token = getToken(params.caster);
    token.set({
        'aura1_radius': 30,
        'aura1_color': "#006400"
    });    
    return true;
}

async function hailOfThorns(params) {
    if (params.dmg == null) {
        echo('please manually update the regular weapon portion');
    }
    params.dmgType = 'piercing';    
    params.stat = 'dex'
    var thorn= findObjs({_type:'custfx'}).find((fx) => fx.get('name') == 'HailOfThorns');
    if(!thorn) {
        thorn = createObj('custfx', {"name": 'HailOfThorns', "definition": mycustomfx['hailofthorns']});
    }
    params.x = '0'; params.y='0'; params.reference = params.target;
    damageToken(params.target, params);
    params.dmg2 = await autorollIfNeeded(params, Math.min(6,Number(params.level)) + 'd10', 'dmg2')
    params.dmg = params.dmg2;
    params.onSave = halfDamage;
    return await circleAoe(params, 7.5, thorn.get('id'), 0, damageToken);
}

async function melfsAcidArrow(params) {
    params.dmg = await autorollIfNeeded(params, (2+Number(params.level)) + 'd4');
    params.dmgType = 'acid';    
    shootRay(params, 0, 'acid','explode','acidbreath');
    damageToken(params.target, params);
    if(params.hit == 'Yes') {
        addTokenStatusMarker(params.target, 'melfsacidarrow', params.level + 'd4');
    }
    return true;
}

async function invisibility(params) {
    await new Promise((r) => setTimeout(r, 1000));
    let links = [];
    for(let i = 1; i < 9; i++) {
        if (params[('target' + i)] == null) continue;
        let token = getToken(params[('target' + i)]);
        if(!token) return;
        spawnFx(token.get('left'), token.get('top'), 'explode-smoke', Campaign().get('playerpageid'));
        addTokenStatusMarker(token,'invisibility', 'Invisible');
        links.push({'id': token.get('id'), 'marker': 'invisibility'});
    }
    concentrate(params.caster, 'Invisibility', null, links);
    return true;
}

async function enhanceAbility(params) {
    await new Promise((r) => setTimeout(r, 1000));
    let links = [];
    for(let i = 1; i < 9; i++) {
        if (params[('target' + i)] == null) continue;
        let token = getToken(params[('target' + i)]);
        if(!token) return;
        spawnFx(token.get('left'), token.get('top'), 'glow-holy', Campaign().get('playerpageid'));
        addTokenStatusMarker(token,'enhanceAbility'+params.stat); 
        links.push({'id': token.get('id'), 'marker': 'enhanceAbility'+params.stat});
        
    }
    concentrate(params.caster, 'Enhance Ability', null, links);
    return true;
}

async function blur(params) {
    let token = getToken(params.caster);
    if(!token) return;
    await new Promise((r) => setTimeout(r, 500));
    spawnFx(token.get('left'), token.get('top'), 'burn-smoke', Campaign().get('playerpageid'));
    addTokenStatusMarker(params.caster,'blur');
    concentrate(params.caster, 'Blur', null, {'id': token.get('id'), 'marker': 'blur'});
    return true;
}

async function mirrorImage(params) {
    let token = getToken(params.caster);
    if(!token) return;
    await new Promise((r) => setTimeout(r, 500));
    spawnFx(token.get('left'), token.get('top') - (0.75*token.get('height')), 'burn-smoke', Campaign().get('playerpageid'));
    spawnFx(token.get('left') + (0.866*0.75*token.get('width')), token.get('top') + (0.5*0.75*token.get('height')), 'burn-smoke', Campaign().get('playerpageid'));
    spawnFx(token.get('left') - (0.866*0.75*token.get('width')), token.get('top') + (0.5*0.75*token.get('height')), 'burn-smoke', Campaign().get('playerpageid'));
    addTokenStatusMarker(params.caster,'mirrorImage', '3');
    return true;
}

async function crownOfMadness(params) {
    params.stat='wis';
    effectOnToken(params.target,'sparkle-charm');
    let saved = await rollTokenSave(params.target, params);
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    let tokenObj = getToken(params.target);
    if(!saved && saved != null) {
        addTokenStatusMarker(params.target,'crownOfMadness',  'DC' + params.dc);
        if (casterId) {
            addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': tokenObj.get('id'), 'marker': 'crownOfMadness'});
        }         
    }
    concentrate(params.caster, 'Crown of Madness');
    return true;
}

async function enlargeReduce(params) {
    params.stat = 'con';
    if (params.target == null) return;
    let enemy = enemies.find(e => e.token.get('name').toLowerCase() == params.target.toLowerCase());
    let saved = false;
    let token = getToken(params.target);
    if (token == null) return;
    if (enemy != null) {
        saved = await enemy.rollSave(params.stat, null, null, params.dc, 'spell');
    }
    let caster = getToken(params.caster);
    let casterId = caster ? caster.get('id') : null;
    if (!saved) {
        let h = Number(token.get('height'));
        let w = Number(token.get('width'));
        if (isNaN(w) || isNaN(h)) return;
        if (w <= 0 || h <= 0) return;
        if (params.mode == 'Enlarge') {
            playSound('enlarge');
            w = Math.min(w+70, 2*w);
            h = Math.min(h+70, 2*h);
            token.set({
                'height': h,
                'width': w
            });
            addTokenStatusMarker(token, 'enlarged');
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': token.get('id'), 'marker': 'enlarged'});
            }              
        } else {
            playSound('reduce');
            w = Math.max(w-70, w/2);
            h = Math.max(h-70, h/2);
            token.set({
                'height': h,
                'width': w
            });
            addTokenStatusMarker(token, 'reduced');    
            if (casterId) {
                addMarkerTracker({'id': casterId, 'marker': 'concentration'}, {'id': token.get('id'), 'marker': 'reduced'});
            }            
        }
        debugging(printCoordinates(w,h));
    }
    concentrate(params.caster, 'Enlarge Reduce');
    return true;
}

//RESOLVING SPELLS

async function rollTokenSave(target, params) {
    if(!target) return true;
    let dc = 8;
    if(params.dc) dc = params.dc;
    let e = lookupEnemy(target);
    let name = target;
    try {
        name = target.get('name');
    } catch {}
    if (e == null) {
        let token = getToken(target);
        if (token != null && !(params.ignoreCaster == true && token.get('name') == params.caster)) {
            if(hasMarker(token,'freedomOfMovement') && (params.condition == 'paralyzed' || params.condition == 'restrained' || params.condition == 'grappled')) {
                if (token.get('id') != token.get('name')) {
                    emphasis(token.get('name') + ' cannot be ' + params.condition + ' thanks to Freedom of Movement!');
                }
                return null;
            }
            if(!params.ignoreAllies) {
                if(params.effectOnAlly != null) params.effectOnAlly(token, params);
                else if (token.get('id') != token.get('name')) emphasis("Please roll a " + params.stat.toUpperCase() + " save for '" + token.get('name') + "'" + (params.dc != null ? (" (DC " + params.dc + ")") : ""));
            }
            return null;
        }
        if (!(params.ignoreCaster == true && token.get('name') == params.caster)) echo( "could not find an enemy token named '" + name + "'");
        return true;
    }
    let type = 'spell';
    if (params.type != null) type = params.type;
    if (params.exempt != null && params.exempt(target, params) == true) return true;
    let saveResult = await e.rollSave(params.stat, params.adv, params.disadv, dc, type, params.condition);
    return saveResult;
}
