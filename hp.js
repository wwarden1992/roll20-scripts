on("change:graphic:bar3_value", updateHealthStatus);
on("change:graphic:bar2_value", updateHealthStatus);

async function announceHPChange(obj, hpData) {
    if (obj == null) return false;
    if(hpData.previousHP == hpData.currentHP && hpData.previousTempHP == hpData.currentTempHP) return false;
    debugging(hpData);
    let realHpDmg = Number(hpData.previousHP) - Number(hpData.currentHP);
    if (hpData.previousTempHP == null || typeof hpData.previousTempHP != "number") hpData.previousTempHP = 0;
    if (hpData.currentTempHP == null || typeof hpData.currentTempHP != "number") hpData.currentTempHP = 0;
    let tempHpDmg = hpData.previousTempHP - hpData.currentTempHP;
    let maxHP = obj.get('bar3_max');
    log('MAX HP: ' + maxHP);
    if (isNaN(maxHP)) maxHP = attemptHPCleanup(maxHP);  
    let e = lookupEnemy(obj);
    if (e != null && (realHpDmg != 0 || tempHpDmg != 0)) {
        let color = calculateHpColor(hpData.currentHP / maxHP);
        obj.set({
            'tint_color': color
        });
    }
    //handle damage to real HP despite presence of temp HP
    if (realHpDmg > 0 && hpData.currentTempHP > 0) {
        let totalDamage = realHpDmg + tempHpDmg;
        tempHpDmg = Math.min(hpData.previousTempHP, totalDamage);
        realHpDmg = totalDamage - tempHpDmg;
        let newRealHP = hpData.previousHP - realHpDmg;
        let newTempHP = hpData.previousTempHP - tempHpDmg;
        let newHpData = {
            "currentHP": newRealHP,
            "previousHP": hpData.previousHP,
            "currentTempHP": newTempHP,
            "previousTempHP": hpData.previousTempHP,            
        };
        obj.set({
            'bar3_value': newRealHP,
            'bar3_max': maxHP,
            'bar2_value': newTempHP,
            'bar2_max': maxHP,            
        });
        if (newTempHP == 0 && realHpDmg > 0) {
            echo(
                obj.get('name') + ' lost all remaining temporary hit points and took ' + realHpDmg + ' points of damage' +
                ((maxHP != null && maxHP != "") ? ' (' + Math.max(0,(maxHP - newRealHP)) + ' points of damage in total)' : '')            
            );            
        } else if (newTempHP == 0) {
            echo(
                obj.get('name') + ' lost all remaining temporary hit points' +
                ((maxHP != null && maxHP != "") ? ' (' + Math.max(0,(maxHP - newRealHP)) + ' points of damage against current HP so far)' : '')            
            );               
        } else {
            echo(
                obj.get('name') + ' soaked up ' + (realHpDmg + tempHpDmg) + ' points of damage with its temp HP' +
                ((maxHP != null && maxHP != "") ? ' (' + Math.max(0,(maxHP - newRealHP)) + ' damage to its current HP so far)' : '')
            );            
        }
        if (realHpDmg > 0 || tempHpDmg > 0) await concentrationCheck(obj, tempHpDmg + realHpDmg);        
        return newHpData;
    }
    //handle excess damage that cuts through all temp HP
    if (hpData.currentTempHP < 0) {
        let overdamage = Math.abs(hpData.currentTempHP);
        realHpDmg += overdamage;
        tempHpDmg = hpData.previousTempHP;
        let newHpData = {
            'currentHP': (hpData.currentHP - overdamage),
            'previousHP': hpData.previousHP,
            'currentTempHP': 0,
            'previousTempHP': hpData.previousTempHP,            
        };
        obj.set({
            'bar3_value': (hpData.currentHP - overdamage),
            'bar3_max': maxHP,
            'bar2_value': 0,
            'bar2_max': maxHP,            
        });  
        echo(
            obj.get('name') + ' lost all remaining temporary hit points and took ' + realHpDmg + ' points of damage' +
            ((maxHP != null && maxHP != "") ? ' (' + Math.max(0,(maxHP - (hpData.previousHP - realHpDmg))) + ' points of damage in total)' : '')            
        );
        if (realHpDmg > 0 || tempHpDmg > 0) await concentrationCheck(obj, tempHpDmg + realHpDmg);        
        return newHpData;
    }
    if (obj.get('name') != null && obj.get('name') != '') {
        if(tempHpDmg < 0) {
            echo(
                obj.get('name') + ' now has ' + hpData.currentTempHP + ' temporary hit points'
            );                
        }
        if(realHpDmg < 0) {
            if (hasMarker(obj,'chilltouch')) {
                emphasis(
                    'the attempt to heal ' + obj.get('name') + ' failed! (A spell or other effect is preventing healing)'
                );   
                obj.set('bar3_value',hpData.previousHP);
            } else {
                echo(
                    obj.get('name') + ' healed for ' + Math.abs(realHpDmg) + ' hit points' + 
                    ((maxHP != null && maxHP != "") ? ' (' + Math.max(0,(maxHP - hpData.currentHP)) + ' points of damage in total)' : '')
                );
            }
        }
        else if(realHpDmg > 0) {
            echo(
                obj.get('name') + ' took ' + (realHpDmg + tempHpDmg) + ' points of damage' +
                ((maxHP != null && maxHP != "") ? ' (' + Math.max(0,(maxHP - hpData.currentHP)) + ' points of damage in total)' : '')
            );
        }
        else if(tempHpDmg > 0) {
            echo(
                obj.get('name') + ' soaked up ' + (realHpDmg + tempHpDmg) + ' points of damage with its temp HP' +
                ((maxHP != null && maxHP != "") ? ' (' + Math.max(0,(maxHP - hpData.currentHP)) + ' damage to its current HP so far)' : '')
            );
        }        
    }
    if (playerTokens.find((pt) => pt.get('id') == obj.get('id')) != null) {
        let name = obj.get('name');
        playerTokensAcrossMaps.filter((ptam) => ptam.get('name') == name).forEach((ptam) => 
            ptam.set({
                'bar3_value': hpData.currentHP,
                'bar3_max': maxHP,
                'bar2_value': hpData.currentTempHP,
                'bar2_max': maxHP,                
                'bar1_value': obj.get('bar1_value'),
            })
        );
    }
    if (realHpDmg > 0 || tempHpDmg > 0) await concentrationCheck(obj, tempHpDmg + realHpDmg);        
    return hpData;
}

function checkBloodied(obj, previousHP, currentHP) {
    if (obj == null) return;
    let dmg = previousHP - currentHP;
    let maxHP = obj.get('bar3_max');
    if (isNaN(maxHP)) maxHP = attemptHPCleanup(maxHP);  
    let bloodiedThreshold = (maxHP != null && maxHP != "" && maxHP > 0) ? Math.floor(maxHP / 2) : 0;
    if(dmg > 0 && previousHP > bloodiedThreshold && currentHP <= bloodiedThreshold) {
        for(let i = 0; i < 5; i++) {
            spawnFx(
                obj.get('left') - (obj.get('width')/2) + randomInteger(obj.get('width')-1), 
                obj.get('top') - (obj.get('height')/2) + randomInteger(obj.get('height')-1), 
                'pooling-blood', 
                Campaign().get('playerpageid')
            );
        }
        if (obj.get('name') != null && obj.get('name') != '') {
            echo( 
                obj.get('name') + ' is now bloodied'
            );
        }
    }
}

async function checkDead(obj, currentHP, previousHP) {
    if (obj == null) return;
    if(currentHP <= 0) {
        try {
            let maxHP = obj.get('bar3_max');
            if (isNaN(maxHP)) maxHP = attemptHPCleanup(maxHP);  
            if(obj.get('controlledby') != null && obj.get('controlledby').length > 0  && obj.get('controlledby') != getGM() && currentHP > (-1 * maxHP)) {
                if (obj.get('name') != null && obj.get('name') != '' && previousHP > currentHP) {
                    if (previousHP > 0) {
                        emphasis(obj.get('name') + ' has been knocked unconscious');
                        addTokenStatusMarker(obj.get('name'), 'unconscious');
                        clearMarker(obj.get('name'), 'grappled');                        
                    } else {
                        emphasis(obj.get('name') + ' has been struck while unconscious at 0 HP!');
                    }
                }
            } else {
                if (obj.get('name') != null && obj.get('name') != '') {
                    //a poor means of thread-safing... making sure this marker gets applied after any other status updates
                    await new Promise(r => setTimeout(r, 500));
                    let e = lookupEnemy(obj);
                    let reallyDead = true;
                    if (e != null && e.stats != null && e.stats.onLethalDamage != null) {
                        reallyDead = await e.onLethalDamage(e);
                    }
                    if (reallyDead) {
                        addTokenStatusMarker(obj.get('name'), 'dead');
                        echo(obj.get('name') + ' has been killed');
                    }
                }
            }
        } catch(err) {
            warn(err);
        }
        
        try {
            if (isConcentrating(obj.get('name'))) {
                dropConcentration(obj);
            }
        } catch(err) {
            warn(err);
        }
    }   
}

async function concentrationCheck(obj, dmg) {
    if (obj == null) return;
    let e = lookupEnemy(obj);
    if (isConcentrating(obj.get('name'))) {
        let dc = Math.max(10, Math.floor((dmg)/2));
        if (e != null) {
            let conSave = await e.rollSave('con', null, null, dc, 'concentration');
            if (!conSave) {
                emphasis(e.token.get('name') + " dropped concentration!");
                dropConcentration(e.token);
            }
        } else if (!isNaN(dc)) {
            emphasis("Please roll a DC " + dc + " concentration saving throw for " + obj.get('name'));
        }
    }     
}

function calculateHpColor(hp) {
    let color = "transparent";
    let green = 0; let red = 255;
    let greenOne = 'f'; let greenTwo = 'f';
    let redOne = 'f'; let redTwo='f';
    if (isNaN(hp) || hp >= 1) return color;
    if (hp > .5) {
        red = 255 * ((1-hp)/.5);
        redTwo = Math.round(red % 16).toString(16);
        redOne = Math.round(red / 16).toString(16);
        //Dunno why this is necessary, but it is
        if (redOne == '10') redOne = 'a';
        if (redTwo == '10') redTwo = 'a';
    } else {
        green = 255*(hp/.5);
        greenTwo = Math.round(green % 16).toString(16);
        greenOne = Math.round(green / 16).toString(16);   
        //Dunno why this is necessary, but it is
        if (greenOne == '10') greenOne = 'a';
        if (greenTwo == '10') greenTwo = 'a';        
    }
    color = '#' + redOne + redTwo + greenOne + greenTwo + '00';
    if (hp <= 0) color = "#000000";
    debugging(color);
    return color;
}

function dmgLookup(name) {
    let token = getToken(name);
    if (token == null) return;
    let currentHP = token.get('bar3_value');
    if (isNaN(currentHP)) currentHP = attemptHPCleanup(currentHP);
    let tempHP = token.get('bar2_value');
    let maxHP = token.get('bar3_max');
    if (isNaN(maxHP)) maxHP = attemptHPCleanup(maxHP);    
    let dmg = Number(maxHP) - Number(currentHP);
    let msg = token.get('name') + " hasn't taken any damage";
    if (dmg > 0) msg = token.get('name') + " has taken " + dmg + " damage";
    if (tempHP > 0) msg = msg + " but has some amount of temporary hit points";
    echo(msg);
}

async function updateHealthStatus(obj, prev) {
    if (obj == null) return;
    let hpData = {
        "currentHP": Number(obj.get('bar3_value')),
        "currentTempHP": Number(obj.get('bar2_value')),
        "previousHP": Number(prev.bar3_value),
        "previousTempHP": Number(prev.bar2_value),
    }
    if(prev.bar3_max == null || prev.bar3_max == 0 || prev.name == null || prev.name=="") return;
    debugging(hpData);
    if (isNaN(hpData['currentHP'])) hpData['currentHP'] = attemptHPCleanup(obj.get('bar3_value'));
    if (isNaN(hpData['previousHP'])) hpData['previousHP'] = attemptHPCleanup(prev.bar3_value);    
    if (hasMarker(obj, 'wardingBond')) {
        let badge = getBadge(obj, 'wardingBond');
        if (badge != null && badge.length > 0) {
            let bondSource = getToken(badge);
            if (bondSource != null) {
                let distance = calculateObjectDistance(obj, bondSource);
                if (distance <= 840) {
                    let netDmg = (hpData['previousHP'] - hpData['currentHP']) + (hpData['previousTempHP'] - hpData['currentTempHP']); 
                    if (netDmg > 0) {
                        let halfDamage = Math.floor(netDmg/2);
                        let bondSourceHPData = {
                            "previousHP": Number(bondSource.get('bar3_value')),
                            "previousTempHP": Number(bondSource.get('bar2_value')),
                            "currentHP": Number(bondSource.get('bar3_value')) - halfDamage,
                            "currentTempHP": Number(bondSource.get('bar2_value')),
                        }
                        bondSource.set({
                            'bar3_value': Number(bondSource.get('bar3_value')) - halfDamage
                        });
                        echo(badge + ' absorbs damage through the warding bond');
                        bondSourceHPData = await announceHPChange(bondSource, bondSourceHPData);
                        if (bondSourceHPData) {
                            checkBloodied(obj, bondSourceHPData.previousHP, bondSourceHPData.currentHP);
                            checkDead(obj, bondSourceHPData.currentHP, bondSourceHPData.previousHP);
                        }
                        let damageRefund = Math.ceil(netDmg/2);
                        let tempHPLost = (hpData['previousTempHP'] - hpData['currentTempHP']);
                        obj.set({
                            'bar2_value': hpData['currentTempHP'] + Math.min(damageRefund, tempHPLost)
                        });
                        hpData['currentTempHP'] = hpData['currentTempHP'] + Math.min(damageRefund, tempHPLost);
                        damageRefund -= tempHPLost;
                        if (damageRefund > 0) {
                            let realHPLost = (hpData['previousHP'] - hpData['currentHP']);
                            obj.set({
                                'bar3_value': hpData['currentHP'] + Math.min(damageRefund, realHPLost)
                            });
                            hpData['currentHP'] = hpData['currentHP'] + Math.min(damageRefund, realHPLost);
                        }
                    }
                }
            }
        }
    }
    if (hasMarker(obj, 'armorofagathys')) {
        let tempHP = Number(obj.get('bar2_value'));
        if (tempHP <= 0) {
            clearTokenMarker(obj, 'armorofagathys');
        }
    }
    hpData = await announceHPChange(obj, hpData);
    if (hpData) {
        checkBloodied(obj, hpData.previousHP, hpData.currentHP);
        checkDead(obj, hpData.currentHP, hpData.previousHP);
    }
}
//try to handle for "## (+#)"  or "## +(#)" notation that some of my players use for HP increases granted by spells like Aid
function attemptHPCleanup(hpVal) {
    debugging('attempt sanitization of "' + hpVal + '"');
    let result = Number(hpVal);
    try {
        let currentHPStrings = hpVal.split(' ');
        let addlHPContainingString = currentHPStrings[currentHPStrings.length-1];
        let addlHPStringStartOptionOne = addlHPContainingString.indexOf('(');
        let addlHPStringStartOptionTwo = addlHPContainingString.indexOf('+');
        let addlHPStringStartOptionThree = addlHPContainingString.indexOf('-');
        let addlHPStringStart = addlHPStringStartOptionOne;
        if (addlHPStringStartOptionTwo < addlHPStringStart && addlHPStringStartOptionTwo >= 0) addlHPStringStart = addlHPStringStartOptionTwo;
        if (addlHPStringStartOptionThree < addlHPStringStart && addlHPStringStartOptionThree >= 0) addlHPStringStart = addlHPStringStartOptionThree;
        if (addlHPStringStart >= 0) {
            let addlHPString = addlHPContainingString.substring(addlHPStringStart);
            addlHPString = addlHPString.replaceAll('(','').replaceAll(')','').replaceAll(' ','');
            let addHP = (addlHPString.indexOf('+') >= 0);
            let subtractHP = (addlHPString.indexOf('-') >= 0);
            addlHPString = addlHPString.replaceAll('+','').replaceAll('-','');
            if (currentHPStrings.length == 1) currentHPStrings[0] = currentHPStrings[0].substring(0, currentHPStrings[0].indexOf('('));
            if (subtractHP) {
                result = Number(currentHPStrings[0]) - Number(addlHPString);
            } else if (addHP) {
                result = Number(currentHPStrings[0]) + Number(addlHPString);
            }
        }
    } catch {
        warn('failure to parse HP data');
    }
    return result;
}
