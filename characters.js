var sheets;

class Character {
    constructor(name, img_path, controlled_by, sheet) {
        this.name = name;
        this.img_path = img_path;
        this.controlled_by = controlled_by;
        this.sheet = sheet;
    }
}

var characters;

//if a character dies, retires, or otherwise needs to be excluded from the list of 
//active characters, add them here
var inactiveCharacterList = [
    'Aerin',
    'Sissy',
    'Blondie',
    'Lucy',
    'Opalo',
    'King',
    'Old Huey',
    'Emi Yuki',
    'Kreegix Half-ear',
    'Sal "The Man" Sardino',    
    'Aether Lux',
    'Echo Versailes',
    'Eckard Scraffdtt',
    'Echard Scraffdtt',
    'Echo Versails',
    'Scrap',
    "Belik'r",
    'Monc',
    'Ulharmolik',
    'Noire',
    'Aurelius',
    'Monica',
    'Kellan',
    'Fect',
    'Huey'
];

var pets = [
  'A2',
  'A3',
  'A4',
  'A5',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6',
  'Persephone'
];

function updateCharacters() {
    characters = {};
    sheets=findObjs({_type:'character'});    
    sheets.forEach((s) => {
        let name = s.get('name');
        let img_path = s.get('avatar')
                        .replace('s3.amazonaws.com/','')
                        .replace('/max','/thumb')
                        .replace('/med','/thumb');
        let controlled_by = getPlayerName(s.get('controlledby'));
        characters[name] = new Character(name, img_path, controlled_by, s);
    });
}

function getActiveCharacters() {
    if (characters == null) return null;
    let activeCharacters = Object.keys(characters).filter(c => !inactiveCharacterList.includes(c) && !pets.includes(c));
    return activeCharacters;
}

//takes the human friendly name and returns the active character name
function getPlayerCharacter(player) {
    if (characters == null) return null;
    let character = Object.keys(characters).find(c => !inactiveCharacterList.includes(c) && !pets.includes(c) && characters[c].controlled_by == player);
    return character;
}

function getCharacterSheet(character) {
    try {
        if (character != null && character.get('type') == 'character') return character;
    } catch {}
    let sheet = sheets.find((s) => s.get('name') == character);
    if (sheet == null) {
        echo('Could not find character sheet info for "' + character + '"');
        return null;
    }
    return sheet;
}

async function get2024CharacterData(character) {
    let sheet = getCharacterSheet(character);
    if (sheet == null) return null;
    let data = findObjs({_type:"attribute", _characterid: sheet.id, name: 'store'});
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100)); //this can sometimes take a while to return; want to make sure we don't call the get('current') before then
        if (data != null) break;
    }
    if (data == null || data.length == 0) {
        warn('failed to obtain 2024 character data for ' + character);
        return null;
    }
    let retval = data[0].get('current').integrants.integrants;
    retval.hitpoints = data[0].get('current').hitpoints;
    if (retval.hitpoints.maximumWithoutTemp == null) {
        let conModifier = calcModifier(calcAbilityScore(retval, 'constitution')); 
        log(character + ' con modifier is ' + conModifier);
        let hpDatapoints = Object.keys(retval).filter(r => retval[r]['type'] == 'Hit Points' && retval[r]['hitpointType'] == 'Maximum');
        retval.hitpoints.maximumWithoutTemp = 0;
        //default path
        hpDatapoints.forEach(dp => {
            retval.hitpoints.maximumWithoutTemp += retval[dp]['valueFormula']['flatValue'];
            retval.hitpoints.maximumWithoutTemp += conModifier;
        });
        let overrideMax = hpDatapoints.find(dp => retval[dp]['_label'] == "Override Max HP");
        if (overrideMax != null) {
            retval.hitpoints.maximumWithoutTemp = retval[overrideMax]['valueFormula']['flatValue']
        }
    }
    return retval;
}

function calcAbilityScore(storedData, attributeName) {
    let retval = 0; let gotMatch = false;
    let setBaseData ={};
    Object.keys(storedData).forEach((a) => {
        if(storedData[a].ability !== undefined && storedData[a].valueFormula !== undefined && 
           storedData[a].ability.toLowerCase() == attributeName && storedData[a].valueFormula.flatValue != null) {
            gotMatch = true;
            if (storedData[a].calculation == 'Set Base' && setBaseData.length > 0) {
                if (setBaseData['createdTime'] == null || storedData[a].createdTime > setBaseData['createdTime']) {
                    retval -= setBaseData['value'];
                    setBaseData = {
                        'createdTime': storedData[a].createdTime,
                        'value': storedData[a].valueFormula.flatValue
                    };
                    retval += storedData[a].valueFormula.flatValue;
                }
            } else {
                retval += storedData[a].valueFormula.flatValue;
            }
        }
    });
    if (gotMatch) return retval;
    return null;
}

function calcModifier(abilityScore) {
    if (abilityScore == null || isNaN(abilityScore)) return abilityScore;
    return Math.floor((Number(abilityScore) - 10)/2)
}

function getCharacterLevel(storedData) {
    let totalLevel = 0;
    Object.keys(storedData).forEach((a) => {
        if(storedData[a].totalLevel !== undefined && storedData[a].level !== undefined && storedData[a].level != 0) totalLevel += storedData[a].totalLevel;
    });
    if (totalLevel > 0) return totalLevel;
    return null;
}

function getProficiencyBonus(storedData) {
    let proficiencyBonus = 2;
    let totalLevel = getCharacterLevel(storedData);
    if (totalLevel == null) return 0;
    if (totalLevel >= 5) proficiencyBonus++;
    if (totalLevel >= 9) proficiencyBonus++;
    if (totalLevel >= 13) proficiencyBonus++;
    if (totalLevel >= 17) proficiencyBonus++;       
    return proficiencyBonus;
}

function getProficiencyLevel(data, skill) {
    skill = skill.replace('_', ' ');
    let proficiencyInfo = Object.keys(data).find((a) => data[a].proficiency !== undefined && data[a].proficiency.toLowerCase() == skill.toLowerCase());
    let proficiencyLevel = "";
    if (proficiencyInfo != null && data[proficiencyInfo].proficiencyLevel != null) proficiencyLevel = data[proficiencyInfo].proficiencyLevel;
    return proficiencyLevel;
}

function getSkillAbility(data, skill) {
    let matchFound = false;
    let baseAbility = calcAbilityScore(data, data['skill-' + skill.replace("_", "-")].ability.toLowerCase());
    if(baseAbility != null) matchFound = true;
    let abilityMod = calcModifier(baseAbility);
    let proficiencyLevel = getProficiencyLevel(data, skill);
    let proficiencyBonus = getProficiencyBonus(data);
    if(proficiencyLevel == "Proficient") {
        abilityMod += proficiencyBonus;
    } else if (proficiencyLevel == "Expertise") {
        abilityMod += (2*proficiencyBonus);
    } else if (proficiencyLevel == "Half Proficient") {
        abilityMod += Math.floor(proficiencyBonus/2);
    }    
    if (matchFound) return abilityMod;
    return null;
}

function hasSaveProficiency(data, skill) {
    let test = Object.keys(data).find((a) => data[a].category == "Saving Throw" && data[a].proficiency != null && data[a].proficiency.toLowerCase() == skill.toLowerCase());
    return (test != null);
}

function calculateSavingThrow(data, skill) {
    let baseAbility = calcAbilityScore(data, skill);
    if (baseAbility == null) return null;
    let abilityMod = calcModifier(baseAbility);
    if (hasSaveProficiency(data, skill)) abilityMod += getProficiencyBonus(data);
    return abilityMod;
}

function calcArmorClass(data) {
    let ac = 10;
    let dex = calcAbilityScore(data, 'dexterity');
    if (dex != null && !isNaN(dex)) dex = calcModifier(dex); 
    let characterClasses = determineCharacterClasses(data);
    let classes = Object.keys(characterClasses);
    let unarmoredDefenseBonus = 0;
    if (classes.includes('Barbarian')) {
        let con = calcAbilityScore(data, 'constitution');
        if (con != null && !isNaN(con)) con = calcModifier(con);
        unarmoredDefenseBonus = Math.max(unarmoredDefenseBonus, con);
    }
    if (classes.includes('Monk') || classes.includes('Alternate Monk')) {
        let wis = calcAbilityScore(data, 'wisdom');
        if (wis != null && !isNaN(wis)) wis = calcModifier(wis);
        unarmoredDefenseBonus = Math.max(unarmoredDefenseBonus, wis);        
    }
    let mod = 0;
    let armored = false;
    Object.keys(data).forEach((a) => {
        if(data[a].type == 'Armor Class' && data[a]._enabled == true && 
           data[a].valueFormula != null && data[a].valueFormula.flatValue != null) {
            if(data[a].calculation == 'Set Base') {
                let newAc = data[a].valueFormula.flatValue;
                let parent = data[data[a].parentID];
                if (parent != null && parent.armorData != null) {
                    armored = true;
                    if (parent.armorData.category == "Medium") newAc += Math.min(dex, parent.armorData.bonusCap);
                    else if (parent.armorData.category == "Light") newAc += dex;
                }
                ac = Math.max(ac, newAc);
            }
            else if (data[a].calculation == 'Modify' && data[a].valueFormula.flatValue != null) mod += data[a].valueFormula.flatValue;
        }
    });
    if (!armored) mod += dex;
    return (ac + mod + (armored ? 0 : unarmoredDefenseBonus));
}

function getSpellSaveDC(data) {
    return 8 + determineSpellcastingAbility(data) + getProficiencyBonus(data) + getSpellDCBonus(data);
}

function getSpellAttackModifier(data) {
    return determineSpellcastingAbility(data) + getProficiencyBonus(data) + getSpellAttackBonus(data);
}

function getSpellAttackBonus(data) {
    let createdTime = 0;
    let bonus = 0;
    Object.keys(data).forEach((a) => {
        if(data[a]._enabled == true && data[a].type == 'Roll Bonus' && data[a].name == "Spell Attack Bonus") {
            if (data[a].createdTime > createdTime) {
                createdTime = data[a].createdTime;
                bonus = data[a].bonusValue;
            }
        }
    });   
    return bonus;    
}

function getSpellDCBonus(data) {
    let createdTime = 0;
    let bonus = 0;
    Object.keys(data).forEach((a) => {
        if(data[a]._enabled == true && data[a].type == 'Roll Bonus' && data[a].name == "Spell Save Bonus") {
            if (data[a].createdTime > createdTime) {
                createdTime = data[a].createdTime;
                bonus = data[a].bonusValue;
            }
        }
    });   
    return bonus;
}

function determineCharacterClasses(data) {
    let characterClasses = {};
    Object.keys(data).forEach((a) => {
        if(data[a].type == 'Class Level' && data[a].name != null && data[a].name.length > 0) {
            if (characterClasses[data[a].name] == null) characterClasses[data[a].name] = data[a].level;
            else characterClasses[data[a].name] = Math.max(characterClasses[data[a].name], data[a].level);
        }
    });
    debugging(characterClasses);
    return characterClasses;
}

function determineSpellcastingAbility(data) {
    let characterClasses = determineCharacterClasses(data);
    //make naive assumption that spellcasting ability with most dependent class levels is the spellcasting ability we want
    const intCasters = ['Wizard', 'Artificer', 'Rogue', 'Fighter']; //include third-casters
    const wisCasters = ['Cleric', 'Druid', 'Ranger'];
    const chaCasters = ['Bard', 'Sorcerer', 'Warlock', 'Paladin'];
    let chaLevels = 0;
    let intLevels = 0;
    let wisLevels = 0;
    Object.keys(characterClasses).forEach(k => {
        if (intCasters.includes(k)) intLevels += characterClasses[k];
        if (wisCasters.includes(k)) wisLevels += characterClasses[k];
        if (chaCasters.includes(k)) chaLevels += characterClasses[k];
    });
    let castingStat = 'intelligence';
    if (wisLevels > intLevels && wisLevels >= chaLevels) castingStat = 'wisdom';
    else if (chaLevels > intLevels && chaLevels >= wisLevels) castingStat = 'charisma';
    debugging('decided spellcasting stat is ' +castingStat);
    let abilityScore = calcAbilityScore(data, castingStat);
    debugging(castingStat + ' score is ' + abilityScore);
    let spellcastingAbility = calcModifier(abilityScore);
    return spellcastingAbility;
}

// use values like 'strength', 'strength_mod', 'strength_save_bonus', 'perception_bonus' for the base ability score, ability score modifier, saving throw modifier, and skill modifier respectively
async function getAttribute(character, attrName, valueType) {
    if (sheets==null) sheets=findObjs({_type:'character'});
    if(sheets != null) {
        debugging('found character sheets');
        let sheet = getCharacterSheet(character);
        if (sheet == null) {
            debugging('failed to lookup character sheet for "' + character + '"');
            return null;
        } 
        let candidates = findObjs({_type:"attribute", _characterid: sheet.id, name: attrName});
        if (candidates.length >= 1) {
            if (attrName == 'spellcasting_ability') {
                let retval = await getAttribute(character, candidates[0].get('current').replace('+','').replace('@{','').replace('}',''));
                return retval;
            }
            if (valueType == 'max') {
                debugging('got value of ' + candidates[0].get('max') + ' for attribute ' + attrName);
                return candidates[0].get('max');
            } else {
                debugging('got value of ' + candidates[0].get('current') + ' for attribute ' + attrName);
                return candidates[0].get('current');                
            }
        } else {
            //Handle 2024 sheets
            debugging("did not find attribute with name '" + attrName + "' while parsing as legacy character sheet. Trying as 2024 character sheet");
            let test = 0;
            let data = await get2024CharacterData(character);
            if(data == null || data.length == 0) {
                warn('character lookup failed for ' + character + '!');
                return;
            }
            debugging('got 2024 character sheet data for "' + character + '"');
            let proficiencyBonus = getProficiencyBonus(data);
            if (attrName == 'pb') {
                return proficiencyBonus;
            //check for base ability scores
            } else if (abilityScores.find((as) => as.toLowerCase() == attrName.toLowerCase()) != null) {
                test = calcAbilityScore(data, attrName);
            } else if (attrName.slice(-4) == "_mod" && abilityScores.find((as) => as.toLowerCase() == attrName.toLowerCase().slice(0,-4)) != null) {
                test = calcAbilityScore(data, attrName.slice(0,-4));
                if (test != null) test = calcModifier(test);
            } else if (attrName.slice(-6) == "_bonus" && attrName != "spell_attack_bonus") {
                let skillName = attrName.slice(0,-6);
                if(data['skill-' + skillName.replace("_","-")] != null) { //if it's a proper skill and not a saving throw
                    test = getSkillAbility(data, skillName);
                } else if (skillName.slice(-5) == "_save") {
                    skillName = skillName.slice(0,-5);
                    test = calculateSavingThrow(data, skillName);
                }
            } else if (attrName == 'hp') {
                if(valueType == 'max') {
                    test = data.hitpoints.maximumWithoutTemp;
                } else {
                    test = data.hitpoints.currentHP;
                }
            } else if (attrName == 'ac') {
                test = calcArmorClass(data);
            } else if (attrName == 'spellcasting_ability') {
                test = determineSpellcastingAbility(data);
            } else if (attrName == 'spell_save_dc') {
                test = getSpellSaveDC(data);
            } else if (attrName == 'spell_attack_bonus') {
                test = getSpellAttackModifier(data);
            } else if (attrName == 'level') {
                test = getCharacterLevel(data);
            }
            debugging('got value of ' + test + ' for attribute ' + attrName);
            return test;
        }
    } else {
        echo("Could not load character sheets in API");
        return null;
    }
}


async function findHighestWeaponBonus(data, type) {
    let highestBonus = 0;
    Object.keys(data).forEach((a) => {
        let aData = data[a];
        if (aData['type'] == 'Attack') {
            let attack = aData['attack'];
            if (attack != null) {
                if((type == null || attack['type'] == type) && attack['bonus'] > highestBonus) {
                    highestBonus = attack['bonus'];
                }
            }
        }
    });
    return highestBonus;
}

async function findHighestWeaponBonusByStat(data, stat) {
    if(stat == null) return 0;
    let highestBonus = 0;
    Object.keys(data).forEach((a) => {
        let aData = data[a];
        if (aData['type'] == 'Attack') {
            let attack = aData['attack'];
            if (attack != null) {
                if(attack['bonus'] != null && attack['bonus'] > highestBonus) {
                    let name = aData['name'];
                    inform('checking out ' + name);
                    if (name != null) {
                        Object.keys(data).forEach((b) => {
                            let bData = data[b];
                            if (bData['name'] == name && bData['weaponData'] != null) {
                                let weaponData = bData['weaponData'];
                                inform('found weapon data for ' + name);
                                if(stat == 'str' && (weaponData['category'] == 'Melee' || weaponData['type'] == 'Dart')) {
                                    highestBonus = attack['bonus'];
                                } else if(stat == 'dex' && (weaponData['category'] == 'Ranged' || weaponData['type'] == 'Dagger')) {
                                    highestBonus = attack['bonus'];
                                }
                            }
                        });
                    }
                }
            }
        }
    });
    return highestBonus;
}

async function findHighestMeleeWeaponBonus(data) {
    return findHighestWeaponBonus(data, 'Melee');
}

async function findHighestRangedWeaponBonus(data) {
    return findHighestWeaponBonus(data, 'Ranged');
}

async function findHighestStrWeaponBonus(data) {
    return findHighestWeaponBonusByStat(data, 'str');
}

async function findHighestDexWeaponBonus(data) {
    return findHighestWeaponBonusByStat(data, 'dex');
}

async function rollCheck(character, skill, advantage) {
    let mod = await getAttribute(character, skill + '_bonus');
    let roll = await rollDice(character, "1d20" + (mod >= 0 ? '+' : '') + mod, advantage);
    let total = roll['total'];
    let advString = '';
    if (advantage != null && advantage != "") {
        advString = (advantage.charAt(0).toLowerCase() == 'a' ? ' with advantage' : advString);
        advString = (advantage.charAt(0).toLowerCase() == 'd' ? ' with disadvantage' : advString);
    }
    let rollString = (' rolled a ' + total);
    if (roll['d20'] == 20) rollString = (' CRIT with a ' + total);
    else if (roll['d20'] == 1) rollString = (' CRIT FAILED with a ' + total);
    echo(character + rollString + ' on their ' + skill + ' check' + advString);
}

async function rollAttack(character, advantage) {
    //todo logic for spellcasters
    let str_mod = await getAttribute(character, 'strength_mod');
    let dex_mod = await getAttribute(character, 'dexterity_mod');
    let weapon_bonus = 0;
    let data = await get2024CharacterData(character);
    if (data != null) {
        let str_weapon_bonus = await findHighestStrWeaponBonus(data);
        let dex_weapon_bonus = await findHighestDexWeaponBonus(data);
        str_mod += str_weapon_bonus;
        dex_mod += dex_weapon_bonus;
        if (str_mod > dex_mod) {
            weapon_bonus = str_weapon_bonus;
        } else {
            weapon_bonus = dex_weapon_bonus;
        }
    } else {
        //todo 
    }
    let pb = await getAttribute(character, 'pb')
    let mod = (str_mod > dex_mod ? str_mod : dex_mod) + pb;
    let roll = await rollDice(character, "1d20" + (mod >= 0 ? '+' : '') + mod, advantage);
    let total = roll['total']
    let advString = '';
    if (advantage != null && advantage != "") {
        advString = (advantage.charAt(0).toLowerCase() == 'a' ? ' with advantage' : advString);
        advString = (advantage.charAt(0).toLowerCase() == 'd' ? ' with disadvantage' : advString);
    }
    let rollString = (' rolled a ' + total);
    if (roll['d20'] == 20) rollString = (' CRIT with a ' + total);
    else if (roll['d20'] == 1) rollString = (' CRIT FAILED with a ' + total);
    echo(character + rollString + ' on their attack' + advString);
}
