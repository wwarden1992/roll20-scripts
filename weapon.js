var slash = ['longsword','slash','slashing','scimitar','sickle','handaxe','battleaxe','axe','greataxe','glaive','halberd','greatsword','whip'];
var bludgeon = ['bludgeon','bludgeoning','club','greatclub','hammer','lighthammer','warhammer','mace','quarterstaff','flail','maul','punch','punching','kick','kicking','unarmed','flurry','flurryofblows','fist','fists'];
var pierce = ['pierce','piercing','dagger','stab','stabbing','javelin','spear','lance','morningstar','pike','rapier','shortsword','trident','warpick','crossbow','handcrossbow','heavycrossbow','lightcrossbow','gun','revolver','rifle','blunderbuss','pistol','shotgun','bow','arrow','longbow','javelin','ranged','shortbow'];

on("ready", function(){
    on('chat:message', function(msg) {
        if (msg.content.indexOf('!weapon') == 0 || msg.content.indexOf('!hit') == 0) {
            inform('weapon.js got message: ' + msg.content);
            evaluateWeapon(msg.content);
        }
    });
});

//syntax: "!(hit/weapon) (target) (dmg) (soundtype)"
function evaluateWeapon(msg) {
    if(!msg) return;
    let nameTokens = msg.split("'");
    let enemyName = '';
    if(nameTokens.length == 3) {
        enemyName = nameTokens[1]; //Assume command string will look like ______'(enemy name)'________
    }
    let commandString = '';
    if(enemyName.length > 0) {
        let nameStart = msg.indexOf(enemyName) - 1; //minus 1, so we include the apostrophe before it
        let nameEnd = nameStart + enemyName.length + 3; //plus 3, so we cover the whole name, the apostrophes, and 1 whitespace char
        commandString = msg.slice(0, nameStart) + msg.slice(nameEnd);
    }
    let strTokens = commandString.split(" ");
    if (strTokens.length < 3) return;
    let dmg = strTokens[1];
    let magical = (strTokens[2] == 'Magical');
    let params = [enemyName, dmg, magical];
    if(strTokens.length > 3 && strTokens[3] != "None") {
        for (let i = 3; i < strTokens.length; i++) {
            params.push(strTokens[i]);
        }
    }
    if (params.length == 3) {
        simpleWeaponStatement(params);
    } else if (params.length >= 4) { 
        fullWeaponStatement(params);
    }
}

function simpleWeaponStatement(params) {
    try {
        let token = getToken(params[0]);
        let currentHP = Number(token.get('bar3_value'));
        if (currentHP <= 0) return;
        let tempHP = 0;
        if (token.get('bar2_value')!=null && token.get('bar2_value').length > 0) {
            tempHP = Number(token.get('bar2_value'));
        }
        let maxHP = token.get('bar3_max');
        if(params[1]==null || params[1]==="") params[1] = '0';
        let dmg = Number(params[1]);
        if (dmg <= 0) return;
        if (typeof dmg === "number") {
            let tempHPDmg = 0;
            if (tempHP > 0) {
                tempHPDmg = Math.min(tempHP, dmg);
                token.set('bar2_value', (tempHP - tempHPDmg));
                dmg -= tempHPDmg;
            }
            token.set('bar3_value', (currentHP - dmg));
            if(maxHP) {
                let hpData = {
                    "currentHP": (currentHP-dmg),
                    "currentTempHP": (tempHP - tempHPDmg),
                    "previousHP": currentHP,
                    "previousTempHP": tempHP                    
                };
                hpData = announceHPChange(token,hpData);
                if (hpData) {
                    checkBloodied(token,currentHP, (currentHP-dmg));
                    checkDead(token, (currentHP-dmg));
                }
            }
        } else {
            warn('non-numeric damage provided');
        }
    } catch(err) {
        warn('an error happened in updating HP (simpleWeaponStatement)');
    }
}

async function fullWeaponStatement(params) {
    debugging(params);
    let weapon = params.slice(3).join("").toLowerCase();
    debugging('weapon sound: ' + weapon);
    let dmgType = null;
    if (bludgeon.find((x) => x==weapon)) {
        dmgType = 'bludgeoning';
    } else if (pierce.find((x) => x==weapon)) {
        dmgType = 'piercing';
    }  else if (slash.find((x) => x==weapon)) {
        dmgType = 'slashing';
    }
    let magical = params[2];
    if (!magical) dmgType = 'nm' + dmgType;
    playSound(weapon);
    try {
        let token = getToken(params[0]);
        let currentHP = Number(token.get('bar3_value'));
        if (currentHP <= 0) return;
        let tempHP = 0;
        if (token.get('bar2_value')!=null && token.get('bar2_value').length > 0) {
            tempHP = parseInt(token.get('bar2_value'));
        }            
        let maxHP = token.get('bar3_max');
        let dmg = parseInt(params[1]);
        if (dmg <= 0) return;
        let e = lookupEnemy(token);
        if (e != null) {
            if (dmgType != null) {
                if (e.isResistantTo(dmgType)) dmg = halfDamage(dmg);
                if (e.isImmuneTo(dmgType)) dmg = 0;
                if (e.isVulnerableTo(dmgType)) dmg *= 2;
            }            
        }        
        debugging('dmg after calculating resistances: ' + dmg);
        if (typeof dmg === "number") {
            let tempHPDmg = 0;
            if (tempHP > 0) {
                tempHPDmg = Math.min(tempHP, dmg);
                token.set('bar2_value', (tempHP - tempHPDmg));
                dmg -= tempHPDmg;
            }
            token.set('bar3_value', (currentHP - dmg));
            if(maxHP) {
                let hpData = {
                    "currentHP": (currentHP-dmg),
                    "currentTempHP": (tempHP - tempHPDmg),
                    "previousHP": currentHP,
                    "previousTempHP": tempHP                    
                };
                hpData = announceHPChange(token,hpData);
                if (hpData) {
                    checkBloodied(token,currentHP, (currentHP-dmg));
                    checkDead(token, (currentHP-dmg));
                }
            }
        } else {
            warn('non-numeric damage provided');
        }
    } catch(err) {
        warn('an error happened in updating HP (fullWeaponStatement)');
    }
}
