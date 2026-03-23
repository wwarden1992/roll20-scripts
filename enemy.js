class Enemy {
    constructor(token, stats) {
        this.token = token;
        if (stats != null) stats.token = token;
        this.stats = stats;
    }
    
    getHP() {
        return this.token != null ? Number(this.token.get('bar3_value')) : null;    
    }
    
    getMaxHP() {
        return this.token != null ? Number(this.token.get('bar3_max')) : null;    
    }    
    
    getTempHP() {
        return this.token != null ? Number(this.token.get('bar1_value')) : null;    
    }
    
    async rollToRecharge() {
        if(this.token != null && this.stats.rechargeAbilityReady != true) {
            let rechargeDie = this.stats.rechargeDie; if (rechargeDie == null) rechargeDie = '1d6';
            let rechargeNumber = this.stats.rechargeNumber; if (rechargeDie == null) rechargeNumber = 6;
            echo(this.token.get('name') + ' is rolling to recharge an ability (must meet or beat a ' + rechargeNumber + ')');
            let rechargeRoll = await rollDice(this.token.get('name'), rechargeDie);
            rechargeRoll = rechargeRoll['total'];
            if (rechargeRoll >= rechargeNumber) {
                this.stats.rechargeAbilityReady = true;
                echo(this.token.get('name') + ' rolled a ' + rechargeRoll + ' and successfully recharged its ability');
            } else {
                echo(this.token.get('name') + ' rolled a ' + rechargeRoll + ' and failed to recharge its ability');
            }
        }
    }
    
    inMeleeRange(t) {
        if (t == null) return false;
        let token = getToken(t);
        if (token == null || this.token == null) return false;
        if (adjacent(this.token,token)) return true;
        let reach = this.stats.reach;
        if (reach == null) reach = 5;
        let reach_px = reach*70/5;
        let t_w = token.get('width');
        let t_h = token.get('height');
        let t_x = t_w*Math.round((token.get('left') - (t_w/2))/t_w);
        let t_y = t_h*Math.round((token.get('top') - (t_h/2))/t_h);
        let my_w = this.token.get('width');
        let my_h = this.token.get('height');
        let my_x = my_w*Math.round((this.token.get('left') - (my_w/2))/my_w); //idk why but it seems we're reckoning left and top as centerpoints now instead of top-left corner
        let my_y = my_h*Math.round((this.token.get('top') -  (my_h/2))/my_h);
        let gridSize = Math.min(70, my_w); //we have to assume all tokens are squares...
        reach_px -= gridSize; //creature must be within reach (in grid squares) minus 1 grid square
        reach_px = Math.max(0,reach_px);        
        let min_x = t_x - reach_px;
        let max_x = t_x + t_w + reach_px;
        let min_y = t_y - reach_px;
        let max_y = t_y + t_h + reach_px;  
        return (liesWithinRectangle({
            'x1':min_x,'y1':min_y,
            'x2':min_x,'y2':max_y,
            'x3':max_x,'y3':min_y,
            'x4':max_x,'y4':max_y,
        },this.token));
    }
    
    hasAdvantageAgainst(token) {
        let adv = hasMarker(token,'prone') && adjacent(this.token, token);
        if (!adv) adv = hasMarker(token, 'blinded') || hasMarker(token, 'paralyzed') || hasMarker(token, 'holdPerson') || hasMarker(token, 'holdMonster') || hasMarker(token, 'restrained') || hasMarker(token, 'stunned') || hasMarker(token, 'unconscious') || hasMarker(token, 'petrified') || hasMarker(this.token, 'blue');
        if (!adv) adv = hasMarker(this.token, 'invisibility');
        if (!adv && this.stats.receivesAdvFunction != null) {
            adv = this.stats.receivesAdvFunction(this, token);
        }
        return adv;
    }
    
    hasDisadvantageAgainst(token) {
        let dis = hasMarker(this.token, 'blinded') || hasMarker(this.token, 'red') || hasMarker(this.token, 'viciousMockery') || hasMarker(this.token, 'frightened') || hasMarker(this.token, 'poisoned') || hasMarker(this.token, 'prone') || hasMarker(this.token, 'restrained');
        if (!dis) dis = hasMarker(token, 'invisibility') || hasMarker(token, 'blur') || (hasMarker(token, 'prone') && !adjacent(this.token, token));
        if (!dis) dis = (hasMarker(this.token,'sickeningRadiance') && Number(getBadge(this.token,'sickeningRadiance')) >= 3);
        if (!dis && this.stats.receivesDisFunction != null) {
            dis = this.stats.receivesDisFunction(this, token);
        }      
        if (!dis) dis = (hasMarker(token, 'protectionfromevilandgood') && (this.stats['type'] == 'fiend' || this.stats['type'] == 'undead' || this.stats['type'] == 'aberration' || this.stats['type'] == 'celestial' || this.stats['type'] == 'fey' || this.stats['type'] == 'elemental'));
        return dis;
    }    
    
    cannotAttack() {
        hasMarker(this.token, 'unconscious') || hasMarker(this.token, 'dead') || hasMarker(this.token, 'incapacitated') || hasMarker(this.token, 'holdPerson') || hasMarker(token, 'holdMonster') || hasMarker(this.token, 'paralyzed') || hasMarker(this.token, 'petrified') || hasMarker(this.token, 'stunned');
    }
    
    attackAutoCrits(token) {
        return (((hasMarker(token, 'paralyzed') || hasMarker(token, 'holdMonster') || hasMarker(token, 'holdPerson')) && adjacent(this.token, token)) || hasMarker(token, 'unconscious'));
    }
    
    calculateNextMove(excludeList) {
        if (this.token == null) return;
        if (excludeList == null) excludeList = [];
        excludeList.push('DM Timer Light');
        excludeList.push('Player Timer Light');
        let closestPlayer = findClosestPlayer(this.token, excludeList); //returns a token obj
        if (closestPlayer == null) return;
        //debugging(this.token.get('name') + ' should approach ' + closestPlayer.get('name') + " at " + printCoordinates(closestPlayer.get('left'),closestPlayer.get('top')));
        let speed = this.stats['speed'];
        if (speed == null) speed = 30;
        let speed_px = speed * 70/5;
        //it's just easier to code that frightened enemies must always flee the source of fright...
        if (hasMarker(this.token, 'frightened')) {
            let fearSource = getToken(getBadge(this.token, 'frightened'));
            if (fearSource != null) inform(this.token.get('name') + ' is frightened of ' + fearSource.get('name'));
            else inform(this.token.get('name').toUpperCase() + " IS FRIGHTENED");
            let angle = calculateObjectAngle(fearSource, this.token); //token with respect to player gives us the direction of fleeing
            return {
                'player': null, 
                'x': this.token.get('left') + Math.round(Math.cos(angle)*speed_px), 
                'y': this.token.get('top') + Math.round(Math.sin(angle)*speed_px)
            };
        }         
        if (hasMarker(this.token,'prone')) speed /= 2;
        if (hasMarker(this.token,'sickeningRadiance') && Number(getBadge(this.token,'sickeningRadiance')) >= 2) speed /= 2;
        if (hasMarker(this.token,'sickeningRadiance') && Number(getBadge(this.token,'sickeningRadiance')) >= 5) speed = 0;        
        if (hasMarker(this.token,'immobilized') || hasMarker(this.token,'paralyzed') || hasMarker(this.token,'holdPerson') || hasMarker(token, 'holdMonster') || hasMarker(this.token,'incapacitated') || hasMarker(this.token,'unconscious') || hasMarker(this.token,'stunned') || hasMarker(this.token,'grappled')) speed = 0;
        if (speed > 0 && hasMarker(this.token, 'prone')) clearTokenMarker(this.token, 'prone');
        //if we're already close enough to strike our target, no point in moving!
        if (this.inMeleeRange(closestPlayer)) {
            return {
                'player': closestPlayer, 
                'x': null, 
                'y': null
            };
        }        

        let my_w = this.token.get('width');
        let my_h = this.token.get('height');
        let gridSize = 35; //assume grid is 35px*35px squares  
        let my_x = gridSize*Math.round((this.token.get('left') - (my_w/2))/gridSize); //do calculations using top left corner instead of centerpoint
        let my_y = gridSize*Math.round((this.token.get('top') -  (my_h/2))/gridSize);
        let cp_w = closestPlayer.get('width');
        let cp_h = closestPlayer.get('height');
        let cp_x = gridSize*Math.round((closestPlayer.get('left') - (cp_w/2))/gridSize);
        let cp_y = gridSize*Math.round((closestPlayer.get('top') - (cp_h/2))/gridSize);
        //debugging('calculate from: ' + printCoordinates(cp_x,cp_y));        
        //construct a list of possible spaces this item can take.
        let reach = this.stats.reach;
        if (reach == null) reach = 5;
        let reach_px = reach * 70/5;
        reach_px -= gridSize; //creature must be within reach (in grid squares) minus 1 grid square
        reach_px = Math.max(0,reach_px);
        let cp_x_min = cp_x-my_w-reach_px;
        let cp_x_max = cp_x+cp_w+reach_px;
        let cp_y_min = cp_y-my_h-reach_px;
        let cp_y_max = cp_y+cp_h+reach_px;
        
        
        let xOptions = 1+((cp_x_max - cp_x_min)/gridSize);
        let yOptions = 1+((cp_y_max - cp_y_min)/gridSize);

        let possibleSpaces = [];
        for (let y = 0; y < yOptions; y++) {
            for (let x = 0; x < xOptions; x++) {
                if (y <= (reach_px/gridSize) || y >= ((yOptions-1) - (reach_px/gridSize)) || x <= (reach_px/gridSize) || x >= ((xOptions - 1) - (reach_px/gridSize))) {
                    possibleSpaces.push({
                        'x': cp_x_min + x*gridSize,
                        'y': cp_y_min + y*gridSize,
                    });
                }
            }
        }
        //debugging(possibleSpaces);
        //strike already occupied spots from the list
        refreshTokens();
        let unoccupiedSpaces = [];
        let mySpace = null;
        possibleSpaces.forEach((s) => {
            let occupyingTokens = tokens.filter((t) => t.get('layer') != 'map' && liesWithinRectangle({"x1":s.x,"y1":s.y,"x2":s.x,"y2":s.y+my_h,"x3":s.x+my_w,"y3":s.y,"x4":s.x+my_w,"y4":s.y+my_h},t));
            if (occupyingTokens == null || occupyingTokens.length == 0) unoccupiedSpaces.push(s);
        });

        if (unoccupiedSpaces == null || unoccupiedSpaces.length == 0) {
            excludeList.push(closestPlayer.get('name'));
            return this.calculateNextMove(excludeList);
        }
        
        //strike spots that are too far away from this list
        let accessibleSpaces = []
        unoccupiedSpaces.forEach((s) => {
            if (my_x + speed_px >= s.x && s.x >= my_x - speed_px && my_y + speed_px >= s.y && s.y >= my_y - speed_px) {
                accessibleSpaces.push(s);
            }
        });

        //if no available options, then just move as close as you can
        if (accessibleSpaces == null || accessibleSpaces.length == 0) {
            //debugging('NO ACCESSIBLE SPACES!');
            let spaces_x = (cp_x + cp_w) - my_x;
            if(Math.abs(spaces_x) > Math.abs(cp_x - (my_x + my_w))) spaces_x = cp_x - (my_x + my_w);
            let spaces_y = (cp_y + cp_h) - my_y;
            if(Math.abs(spaces_y) > Math.abs(cp_y - (my_y + my_h))) spaces_y = cp_y - (my_y + my_h);  
            spaces_x /= my_w; spaces_x = Math.floor(spaces_x);
            spaces_y /= my_h; spaces_y = Math.floor(spaces_y);
            spaces_x *= (my_w/70);
            spaces_y *= (my_h/70);
            //debugging(this.token.get('name') + ' is ' + spaces_x + ' sq away horizontally and ' + spaces_y + ' sq away vertically');
            speed /= 5;
            let movement_x = spaces_x;
            let movement_y = spaces_y;
            if (movement_x > speed) movement_x = speed;
            else if (Math.abs(movement_x) > speed) movement_x = -1*speed;
            if (movement_y > speed) movement_y = speed;
            else if (Math.abs(movement_y) > speed) movement_y = -1*speed;  
            //debugging(this.token.get('name') + ' should move ' + movement_x + ' sq horizontally and ' + movement_y + ' sq vertically');
            return {
                'player': null, 
                'x': this.token.get('left') + (70*movement_x), 
                'y': this.token.get('top') + (70*movement_y)
            };
        } else {
            //select closest spot
            accessibleSpaces.sort(function(a,b) {
                if (pythagorean(a.x - (cp_x+(cp_w/2)), a.y - (cp_y+(cp_h/2))) != pythagorean(b.x - (cp_x +(cp_w/2)), b.y - (cp_y+(cp_h/2)))) 
                        return pythagorean(a.x - (cp_x+(cp_w/2)), a.y - (cp_y+(cp_h/2))) - pythagorean(b.x - (cp_x +(cp_w/2)), b.y - (cp_y+(cp_h/2)))
                else return pythagorean(a.x - my_x, a.y - my_y) - pythagorean(b.x - my_x, b.y - my_y);
            });
            return {
                'player': closestPlayer, 
                'x': accessibleSpaces[0].x + (my_w/2), 
                'y': accessibleSpaces[0].y + (my_h/2)
            };
        }        
    }
    
    approachPlayer() {
        let nextMove = this.calculateNextMove();
        if (nextMove == null) return null;
        if (nextMove.x != null && nextMove.y != null && this.token != null) setPosition(this.token, nextMove.x, nextMove.y);
        if (nextMove.player != null) echo(this.token.get('name') + ' approaches ' + nextMove.player.get('name'));
        return nextMove.player;
    }
    
    async initiativeRoll() {
        if (this.stats == null) return null;
        let dex = Number(this.stats['dex']);
        let dexMod = Math.floor((dex - 10)/2);
        let initiativeBonus = Number(this.stats['initiativeBonus']);
        if (initiativeBonus != null && !isNaN(initiativeBonus)) dexMod += initiativeBonus;
        let roll = await rollDice(this.token.get('name'), "1d20" + ( dexMod >= 0 ? '+' : '') + dexMod);
        if (roll['d20'] == 20) roll = "99.99*";
        else if (roll['d20'] == 1) roll = "-99.99*";        
        else {
            roll = roll['total'];
            debugging('got initiative roll ' + roll);
            roll = Number(roll) + Number((dex/100).toFixed(2));
        }
        return roll;
    }
    
    async rollInitiative() {
        if (this.token == null) return;
        let roll = await this.initiativeRoll();
        if (roll == null || isNaN(roll)) return;
        turnorder = JSON.parse(Campaign().get("turnorder"));
        let myEntry = turnorder.find((to) => to.id == this.token.get("id"));
        if (myEntry != null && turnorder.indexOf(myEntry) >= 0) {
            turnorder[turnorder.indexOf(myEntry)].pr = roll;
        } else {
            turnorder.push({
                id: this.token.get("id"),
                pr: roll,
                custom: this.token.get("name"),
                _pageid: Campaign().get("playerpageid")
            });            
        }
        Campaign().set("turnorder", JSON.stringify(turnorder));
    }
    
    async basicAttack(target, overrideAttackMod, overrideDamage, overrideDamageType, overrideSecondaryDamage, overrideSecondaryDamageType, callbackFn) {
        if (this.token == null) return;
        let name = this.token.get('name');
        if (this.stats == null) {
            warn('no stats available for ' + name + '; returning');
            return;
        }
        if (this.cannotAttack()) {
            inform(name + ' is unable to attack');
            return;
        }
        let attackStat = this.stats['attack_stat'];
        if (attackStat == null) {
            inform('no attack stat specified for ' + name + '; assuming it is str');
            attackStat = 'str';
        }
        let attackStatVal = this.stats[attackStat.toLowerCase()];
        if (attackStatVal == null || isNaN(attackStatVal)) {
            inform('no value found for ' + attackStat + ' stat for ' + name + '; assuming it is 10');
            attackStatVal = 10;
        }
        attackStatVal = Number(attackStatVal);
        let statMod = Math.floor((attackStatVal-10)/2);
        let pb = this.stats['proficiency_bonus'];
        if (pb == null) {
            inform('proficiency bonus not found for ' + name + '; assuming it is 2');
            pb = 2;
        }
        let attackBonus = this.stats['attack_bonus'];
        if (attackBonus == null) {
            inform('no attack bonus found for ' + name + '; using 0');
            attackBonus = 0;
        }
        let attackModifier = statMod + pb + attackBonus;
        if (overrideAttackMod != null) attackModifier = Number(overrideAttackMod);
        let adv = this.hasAdvantageAgainst(target);
        let dis = this.hasDisadvantageAgainst(target);
        debugging('adv = ' + adv + ', dis = ' + dis);
        if (adv == true && hasMarker(this.token, 'blue')) clearTokenMarker(this.token, 'blue');
        if (dis == true && hasMarker(this.token, 'red')) clearTokenMarker(this.token, 'red');  
        if (dis == true && hasMarker(this.token, 'viciousmockery')) clearTokenMarker(this.token, 'viciousmockery');        
        let dice = "1d20";
        if (adv && !dis) dice = "2d20kh1";
        if (dis && !adv) dice = "2d20kl1";
        if (hasMarker(this.token,'bane')) dice += "-1d4";
        if (hasMarker(this.token,'bless')) dice += "+1d4";
        if (hasMarker(this.token,'synapticStatic')) dice += "-1d6";
        if (hasMarker(target, 'sanctuary')) {
            let dc = getBadge(target, 'sanctuary');
            if (dc != null) {
                dc = Number(dc.replace('DC', '').replace(' ', ''));
                if (isNaN(dc)) dc = 10;
            } else {
                dc = 10;
            }
            echo('Rolling wisdom save to see if ' + this.token.get('name') + ' can hit ' + target.get('name') + ' despite Sanctuary');
            let wisdomSave = await this.rollSave('wis', null, null, dc, 'spell')
            if (wisdomSave == null || !wisdomSave) {
                emphasis('Sanctuary prevents ' + this.token.get('enemy') + ' from attacking and they waste that attack!');
                return false;
            }
        }
        let roll = await rollDice(this.token.get('name'), dice + ( attackModifier >= 0 ? '+' : '') + attackModifier);
        let isCrit = false; let isCritFail = false;
        if (roll['d20'] == 20) {
            isCrit = true;
        } else if (roll['d20'] == 1) {
            isCritFail = true;
        }
        roll = roll['total'];
        let token = getToken(target);
        if (this.stats['attack_sound'] != null && this.stats['attack_sound'] != "") {
            playSound(this.stats['attack_sound']);
        } 
        if (token == null || isCritFail) {
            echo(this.token.get('name') + ' rolled a ' + roll + (isCrit ? ' (CRIT!)' : (isCritFail ? ' (CRIT FAIL!)' : '')));
            if (callbackFn != null) callbackFn(target,false);
            return;
        }
        let ac = token.get('bar1_value');
        if (ac == null) {
            inform('no ac found for target; assuming 10');
            ac = 10;
        }
        if(hasMarker(target,'mirrorImage')) {
            let ignoresMirrorImage = false;
            debugging('target has mirror image; rolling to see if target is hit or duplicate');
            if (hasMarker(this.token, 'blinded') || this.stats['blindsight'] || this.stats['truesight'] || this.stats['tremorsense']) {
                emphasis('it seems ' + this.token.get('name') + ' is unaffected by the mirror images...');
                ignoresMirrorImage = true;
            }
            let attackMirrorImage = await rollDice(this.token.get('name'), '1d20');
            attackMirrorImage = attackMirrorImage['d20'];
            let mirrorImages = getBadge(target, 'mirrorImage');
            let mirrorAC = await getAttribute(token.get('name'), 'dexterity_mod');
            mirrorAC = 10 + Number(mirrorAC);
            let threshold = (mirrorImages == 3 ? 6 : (mirrorImages == 2 ? 8 : 11));
            let mirrorMessage = this.token.get('name') + ' rolled ' + roll + ' on their attack and ' + attackMirrorImage + ' on the mirror image check (' + threshold + ' or higher means it attacks a mirror image)';
            echo(mirrorMessage);
            if (!ignoresMirrorImage && attackMirrorImage >= threshold && (roll >= mirrorAC || isCrit)) {
                emphasis(this.token.get('name') + ' struck one of the mirror images! (attack roll was ' + roll + ')');
                clearMarker(target, 'mirrorImage');
                mirrorImages--;
                if (mirrorImages > 0) addTokenStatusMarker(target, 'mirrorImage', mirrorImages);
                return false;
            } 
        }
        let hit = (roll >= ac || isCrit);
        if (hit) {
            if (this.attackAutoCrits(target)) isCrit = true;
            if (this.stats['attack_fx'] != null && this.stats['attack_fx'] != "") {
                spawnFx(token.get('left'), token.get('top'), this.stats['attack_fx']);
            } 
            let dmgBonus = this.stats['damage_bonus'];
            if (dmgBonus == null) {
                inform('no damage bonus specified for ' + name + '; using 0');
                dmgBonus = 0;
            }
            let dmgDie = this.stats['damage_die'];
            if (dmgDie == null) {
                inform('no damage die specified for ' + name + '; assuming 1d6');
                dmgDie = '1d6';
            }
            let dmgType = overrideDamageType;
            if (dmgType == null) dmgType = this.stats['damage_type'];
            if (isCrit) {
                let dieStats = dmgDie.split('d');
                dmgDie = (Number(dieStats[0]) * 2) + 'd' + dieStats[1];
            }            
            let secondaryDmgDie = overrideSecondaryDamage;
            if (secondaryDmgDie == null) secondaryDmgDie = this.stats['secondary_damage_die'];
            let secondaryDmgType = overrideSecondaryDamageType;
            if (secondaryDmgType == null) secondaryDmgType = this.stats['secondary_damage_type'];
            if (secondaryDmgDie != null && isCrit) {
                let dieStats = secondaryDmgDie.split('d');
                secondaryDmgDie = (Number(dieStats[0]) * 2) + 'd' + dieStats[1];
            }              
            let addModToDmg = this.stats['add_mod_to_dmg'];
            if (addModToDmg == null) {
                inform('not specified whether stat mod gets added to dmg; assume true if str or dex, false otherwise');
                addModToDmg = ((attackStat.toLowerCase() == 'str' || attackStat.toLowerCase() == 'dex') ? true : false);
            }
            let dmgMod = dmgBonus + (addModToDmg ? statMod : 0);
            let dmgString = overrideDamage;
            if (dmgString == null) dmgString = dmgDie + ( dmgMod >= 0 ? '+' : '') + dmgMod;
            let dmg = await rollDice(this.token.get('name'), dmgString);
            dmg = dmg['total'];
            let secondaryDmg = 0;
            if (secondaryDmgDie != null) {
                secondaryDmg = await rollDice(this.token.get('name'), secondaryDmgDie);
                secondaryDmg = secondaryDmg['total'];
            }
            let dmgTypeString = dmgType;
            if (dmgType != null && dmgType.indexOf('nm') == 0) dmgTypeString = 'nonmagical ' + dmgType.substr(2);
            let dmgMessage = (this.token.get('name') + ' hit with a ' + roll + (isCrit ? ' (CRIT!)' : '') + (adv ? (dis ? ' (rolling with advantage and disadvantage)' : ' (rolling with advantage)') : (dis ? ' (rolling with disadvantage' : '')) + ' and rolled ' + dmg + ' ' + dmgTypeString + ' damage');
            let secondaryDmgTypeString = secondaryDmgType;
            if (secondaryDmgType != null && secondaryDmgType.indexOf('nm') == 0) secondaryDmgTypeString = 'nonmagical ' + secondaryDmgType.substr(2);
            if (secondaryDmg > 0) dmgMessage = dmgMessage + ' and ' + secondaryDmg + ' ' + secondaryDmgTypeString + ' damage';
            echo(dmgMessage);
            if (hasMarker(token,'rage') && (dmgType.indexOf('piercing') > -1 || dmgType.indexOf('bludgeoning') > -1 || dmgType.indexOf('slashing') > -1)) {
                dmg = Math.floor(dmg/2)
            }
            if (secondaryDmgDie != null && hasMarker(token,'rage') && (secondaryDmgType.indexOf('piercing') > -1 || secondaryDmgType.indexOf('bludgeoning') > -1 || secondaryDmgType.indexOf('slashing') > -1)) {
                secondaryDmg = Math.floor(secondaryDmg/2)
            }
            if (hasMarker(token, 'protectionfromenergyacid') && dmgType == 'acid') dmg = Math.floor(dmg/2);
            if (hasMarker(token, 'protectionfromenergycold') && dmgType == 'cold') dmg = Math.floor(dmg/2);
            if (hasMarker(token, 'protectionfromenergyfire') && dmgType == 'fire') dmg = Math.floor(dmg/2);
            if (hasMarker(token, 'protectionfromenergylightning') && dmgType == 'lightning') dmg = Math.floor(dmg/2);
            if (hasMarker(token, 'protectionfromenergythunder') && dmgType == 'thunder') dmg = Math.floor(dmg/2);
            if (secondaryDmgDie != null && hasMarker(token, 'protectionfromenergyacid') && secondaryDmgType == 'acid') secondaryDmg = Math.floor(secondaryDmg/2);
            if (secondaryDmgDie != null && hasMarker(token, 'protectionfromenergycold') && secondaryDmgType == 'cold') secondaryDmg = Math.floor(secondaryDmg/2);
            if (secondaryDmgDie != null && hasMarker(token, 'protectionfromenergyfire') && secondaryDmgType == 'fire') secondaryDmg = Math.floor(secondaryDmg/2);
            if (secondaryDmgDie != null && hasMarker(token, 'protectionfromenergylightning') && secondaryDmgType == 'lightning') secondaryDmg = Math.floor(secondaryDmg/2);
            if (secondaryDmgDie != null && hasMarker(token, 'protectionfromenergythunder') && secondaryDmgType == 'thunder') secondaryDmg = Math.floor(secondaryDmg/2);   
            
            let currentHP = Number(token.get('bar3_value'));
            let tempHP = Number(token.get('bar2_value'));
            let tempHPDmg = 0;
            if (secondaryDmg < 0) secondaryDmg = 0;
            if (dmg < 0) dmg = 0;
            dmg += secondaryDmg;
            if (tempHP > 0) {
                tempHPDmg = Math.min(tempHP, dmg);
                token.set('bar2_value', (tempHP - tempHPDmg));
                dmg -= tempHPDmg;
            }  
            if (typeof currentHP != "number") currentHP = Number(currentHP);
            token.set('bar3_value', (currentHP - dmg));
            let hpData = {
                "currentHP": (currentHP-dmg),
                "currentTempHP": (tempHP - tempHPDmg),
                "previousHP": currentHP,
                "previousTempHP": tempHP             
            };
            hpData = await announceHPChange(token,hpData);
            if (hpData) {
                checkBloodied(token,currentHP, (currentHP-dmg));
                checkDead(token, (currentHP-dmg), currentHP);
                if (callbackFn != null) callbackFn(target, hit, roll, hpData);                
            }            
        } else {
            echo(this.token.get('name') + ' missed ' + (adv ? (dis ? ' (rolling with advantage and disadvantage)' : ' (rolling with advantage)') : (dis ? ' (rolling with disadvantage)' : '')) + ' with a ' + roll);
            if (callbackFn != null) callbackFn(target, hit, roll);                
        }
        return hit;
    }
    
    hasRelationshipTo(type, relationshipType) {
        if (type == null || relationshipType == null) return false;
        if (this.stats == null) {
            log('no stats are defined for this token');
            return null;
        }
        let relationships = this.stats[relationshipType];
        if (relationships == null || relationships.length == 0) return false;
        let relationship = relationships.find((i) => i == type);
        return (relationship != null);
    }

    isImmuneTo(type) {
        if (this.token == null) return null;
        let immunity = this.hasRelationshipTo(type, 'immunities');
        if (immunity) {
            if (damageTypes.find((dt) => dt == type)) {
            const typeStr = type.substring(0,2) == 'nm' ? 'nonmagical ' + type.substring(2) : type;
                emphasis(this.token.get('name') + " seems completely unaffected by " + typeStr + " damage...");
            } else { //is a status condition
                emphasis("You get the feeling " + this.token.get('name') + " can't be " + type + "...");
            }
        }
        return immunity;
    }

    isResistantTo(type) {
        if (this.token == null) return null;
        let resistant = this.hasRelationshipTo(type, 'resistances');
        if (resistant !== true && hasMarker(this.token, 'rage')) {
            if (type == 'nmbludgeoning' || type == 'nmslashing' || type == 'nmpiercing' || type == 'bludgeoning' || type == 'slashing' || type == 'piercing') {
                resistant = true;
            }
        }
        if (resistant !== true && hasMarker(this.token, 'protectionfromenergyacid') && type == 'acid') resistant = true;
        if (resistant !== true && hasMarker(this.token, 'protectionfromenergycold') && type == 'cold') resistant = true;
        if (resistant !== true && hasMarker(this.token, 'protectionfromenergyfire') && type == 'fire') resistant = true;
        if (resistant !== true && hasMarker(this.token, 'protectionfromenergylightning') && type == 'lightning') resistant = true;
        if (resistant !== true && hasMarker(this.token, 'protectionfromenergythunder') && type == 'thunder') resistant = true;        
        const typeStr = type.substring(0,2) == 'nm' ? 'nonmagical ' + type.substring(2) : type;
        if (resistant) {
            emphasis(this.token.get('name') + " seems like it's not too bothered by " + typeStr + " damage...");
        }
        return resistant;        
    }

    isVulnerableTo(type) {
        if (this.token == null) return null;
        let vulnerable = this.hasRelationshipTo(type, 'vulnerabilities');
        const typeStr = type.substring(0,2) == 'nm' ? 'nonmagical ' + type.substring(2) : type;
        if (vulnerable) {
            emphasis(this.token.get('name') + " really does not seem to like " + typeStr + " damage!");
        }
        return vulnerable;
    }
    
    calculateSaveModifier(stat) {
        if (this.stats == null) {
            echo('no stats are defined for this token');
            return null;
        }
        let statValue = this.stats[stat.toLowerCase()];
        if (statValue ==  null) {
            warn('no ' + stat + ' value known for ' + this.stats.name + '; assuming stat is 10');
            statValue = 10;
        }
        statValue = Math.floor((statValue-10)/2);
        if(this.stats.proficient_saves != null) {
            if(this.stats.proficient_saves.find((ps) => ps == stat.toLowerCase())) {
                let profBonus = this.stats.proficiency_bonus;
                if (profBonus == null) {
                    warn('no proficiency bonus listed for ' + this.stats.name + '; assuming proficiency bonus is 3');
                    profBonus = 3;
                }
                statValue += profBonus;
            }
        }
        return statValue;
    }
    
    async rollSave(stat, adv, disadv, dc, type, condition) {
        if (condition != null && condition != "" && this.isImmuneTo(condition)) {
            return true;
        }
        let t = this.token;
        if (t == null) return null;
        let saveEntry = {name: t.get('name'), outcome: 'pending', value: 'pending'};
        saves.push(saveEntry);
        if((hasMarker(t,'paralyzed') || hasMarker(t, 'holdMonster') || hasMarker(t, 'holdPerson')) && (stat == 'dex' || stat == 'str')) {
            echo(t.get('name') + ' is paralyzed and thus automatically fails the ' + stat + ' saving throw');
            saveEntry.outcome = 'fail&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
            saveEntry.value = 'N/A';
            return false;
        }
        else if(hasMarker(t,'stunned') && (stat == 'dex' || stat == 'str')) {
            echo(t.get('name') + ' is stunned and thus automatically fails the ' + stat + ' saving throw');
            saveEntry.outcome = 'fail&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
            saveEntry.value = 'N/A';            
            return false;
        }   
        else if(hasMarker(t,'unconscious') && (stat == 'dex' || stat == 'str')) {
            echo(t.get('name') + ' is unconscious and thus automatically fails the ' + stat + ' saving throw');
            saveEntry.outcome = 'fail&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
            saveEntry.value = 'N/A';            
            return false;
        }           
        if(hasMarker(t,'restrained') && stat == 'dex') {
            echo('(' + t.get('name') + ' is restrained and has disadvantage on its saving throw');
            disadv = true;
        }
        if (hasMarker(this.token,'sickeningRadiance') && Number(getBadge(this.token,'sickeningRadiance')) >= 3) {
            echo('(' + t.get('name') + ' has at least 3 levels of exhaustion and has disadvantage on its saving throw');
            disadv = true;            
        }      
        let saveModifier = this.calculateSaveModifier(stat);
        if (saveModifier == null || isNaN(saveModifier)) {
            echo(this.token.get('name'), "no " + stat + " stat is given for this enemy; cannot auto-roll saving throw");
            saveEntry.outcome = '';
            saveEntry.value = 'need manual roll';            
            return;
        }
        echo(t.get('name') + ' is making its ' + stat.toUpperCase() + ' saving throw...');
        if(hasMarker(t,'slow') && stat == 'dex') {
            echo('(' + t.get('name') + ' is slowed and has a -2 penalty to its dex saving throw');
            saveModifier -= 2;
        }
        if (this.stats.magicResistance == true && (type == 'spell' || type == 'magic')) {
            adv = true;
        }
        if (type == 'concentration' && this.stats != null && this.stats.adv_on_concentration_checks) {
            adv = true;
        }        
        if(adv == null && hasMarker(t,'blue')) {
            adv = true;
            clearTokenMarker(t, 'blue');
        }
        if (disadv == null && hasMarker(t, 'red')) {
            disadv = true;
            if (adv == true) await new Promise((r)=>setTimeout(r,300)); //essentially this is shitty thread-safing
            clearTokenMarker(t, 'red');
        }
        let advantage = '';
        let advMessage = '';
        if (adv == true && disadv == true) advMessage = ' (rolled with advantage and disadvantage)';
        else if (adv == true) advMessage = ' (rolled with advantage)';
        else if (disadv == true) advMessage = ' (rolled with disadvantage)';
        if (adv == true && disadv != true) advantage = 'a';
        else if (adv != true && disadv == true) advantage = 'd';
        let dice = "1d20"
        if (hasMarker(this.token,'bane')) dice += "-1d4";
        if (hasMarker(this.token,'mindsliver')) {
            dice += "-1d4";
            clearTokenMarker(this.token,'mindsliver');
        }
        if (hasMarker(this.token,'bless')) dice += "+1d4";
        if (hasMarker(this.token,'synapticStatic') && type == 'concentration') dice += "-1d6";
        let roll = await rollDice(this.token.get('name'), dice + (saveModifier >= 0 ? '+' : '') + saveModifier, advantage);
        if (roll['d20'] == 20) {
            //echo(this.token.get('name') + ' crit on its ' + stat + ' save ' + (dc != null ? ('(DC ' + dc + ')') : ''));
            saveEntry.outcome = 'CRIT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
            saveEntry.value = roll['total'];             
            return true;
        } else if (roll['d20'] == 1) {
            //emphasis(this.token.get('name') + ' crit failed on its ' + stat + ' save ' + (dc != null ? ('(DC ' + dc + ')') : ''));
            saveEntry.outcome = 'CRIT FAIL&nbsp;';
            saveEntry.value = roll['total'];               
            return false;            
        }
        roll = roll['total'];
        if (dc == null) {
            //echo(this.token.get('name') + ' rolls a ' + roll + ' on its ' + stat + ' save ' + advMessage);
            saveEntry.outcome = '??DC??&nbsp;&nbsp;&nbsp;';
            saveEntry.value = roll;               
            return null;
        }
        else {
            if (roll >= dc) {
                //echo(this.token.get('name') + ' succeeds on its ' + stat + ' save (DC ' + dc + ') with a ' + roll + advMessage);
                saveEntry.outcome = 'SUCCESS&nbsp;&nbsp;';
                saveEntry.value = roll;   
            }
            else {
                //emphasis(this.token.get('name') + ' fails its ' + stat + ' save (DC ' + dc + ') with a ' + roll + advMessage);
                saveEntry.outcome = 'FAIL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
                saveEntry.value = roll;                 
            }
        }
        return (roll >= dc);
    }
}

var enemies= [];

on("ready", function(){
    
    on("change:campaign:playerpageid", async function() {
        loadEnemies();
    });
    
    on("add:graphic", async function(obj) {
        let imgsrc = obj.get('imgsrc');
        let stats = Object.values(templates).find((v) => 
            imgsrc.indexOf(path1 + v.img.slice(0,9)) == 0 || 
            imgsrc.indexOf(path2 + v.img.slice(0,9)) == 0 || 
            imgsrc.indexOf(path3 + v.img.slice(0,9)) == 0
        );
        if(!stats) {
            return;
        }
        loadEnemies();
        let enemiesLikeThis = enemies.filter((e) => e.token != null && e.token.get('name').toLowerCase().indexOf(stats.name.toLowerCase()) == 0);
        if (enemiesLikeThis == null) {
            enemiesLikeThis = 0;
        }
        else { 
            enemiesLikeThis = enemiesLikeThis.length; 
        }
        debugging('enemies like this one: ' + enemiesLikeThis);
        let token = null;
        do {
           token = getToken(stats.name + ' ' + (++enemiesLikeThis));
        } while (token != null);        
        
        token = obj.set({
            name: stats.name + ' ' + (enemiesLikeThis),
            controlledby: getGM(),
            showname: true,
            width: Number(stats.width) || 70,
            height: Number(stats.height) || 70,
            bar3_max: Number(stats.hp),
            bar3_value: Number(stats.hp),
            bar1_value: Number(stats.ac),
            bar4_value: Number(stats["speed"] || 30),
            aura1_radius: stats['aura1_radius'] || "",
            aura2_radius: stats['aura2_radius'] || "",            
            showplayers_name: true,        
        });
        if (stats['gmnotes'] != null) {
            token.set('gmnotes', stats['gmnotes']);
        }        
    });
});

function lookupEnemy(identifier) {
    debugging('looking up enemy');
    if(enemies == null) {
        debugging('no enemies on this map');
        return null;
    }
    let token = getToken(identifier);
    if (token == null) {
        debugging('enemy lookup failed: name does not match any token');
        return null;
    }
    debugging('lookup enemy named ' + token.get('name'));
    let enemy = null;
    try {
        enemy = enemies.find((e) => e.token == token);
        if (enemy == null) {
            enemy = enemies.find((e) => e.token.get('name').toLowerCase() == token.get('name').toLowerCase());
        }
    } catch {}
    return enemy;
}

async function loadEnemies() {
    enemies = [];
    refreshTokens();
    let candidates = tokens.filter((p) => playerIsGM(p.get('controlledby'))); 
    if (candidates == null) return;
    for (let i = 0; i < candidates.length; i++) {
        let q = candidates[i];
        let template = Object.values(templates).find((t) => 
            q.get('imgsrc').indexOf(path1 + t['img'].slice(0,9)) == 0 || 
            q.get('imgsrc').indexOf(path2 + t['img'].slice(0,9)) == 0 || 
            q.get('imgsrc').indexOf(path3 + t['img'].slice(0,9)) == 0
        );
        let gmNotes = await getGMNotes(q);
        if (gmNotes != null) {
            gmNotes = gmNotes.replace('<br>','');
            debugging(gmNotes);
            try {
                gmNotes = JSON.parse(gmNotes);
                //log(q.get('name') + ' got template value of:    ' + gmNotes['template']);
                let temp = templates[gmNotes['template']];
                if(temp != null) {
                    template = temp;
                    inform('template found for ' + q.get('name') + " (" + template.name + ")");
                }
            } catch {
                //log("no GM Note-defined template found for " + q.get('name'));
            }
        }
        if (template == null) {
            warn("no template found for " + q.get('name') + '(' + q.get('imgsrc') + ')');
            debugging(q.get('imgsrc'));
        } else {
            inform('template found for ' + q.get('name') + " (" + template.name + ")");
        }
        let e = new Enemy(q, template);
        enemies.push(e);
    }
    trace('loaded ' + enemies.length + ' enemies');
}

async function spawnEnemy(type, quantity, pos_x, pos_y) {
    if (type == null || type == '') {
        echo("please specify a type of enemy you wish to spawn");
        return;
    }
    if (typeof type != "string") {
        echo("please provide an alphanumeric name for the enemy template you wish to use");
        return;
    }
    let stats = templates[type];
    if (stats == null) {
        stats = templates[type.toLowerCase()]
    }
    if (stats == null) {
        stats = templates[type.charAt(0).toUpperCase() + type.slice(1)]
    }
    if (stats == null) {
        echo("could not find an enemy template named '" + type + "'");
        return;
    }
    if (quantity == null) {
        quantity = 1;
    } else if (typeof quantity === 'string' && quantity.indexOf("d") > 0) {
        try {
            quantity = await rollDice(chatName, quantity);
            quantity = quantity['total'];
        } catch {
            echo("could not parse enemy quantity; spawning single enemy instead");
            quantity = 1;
        }
    } else if (isNaN(quantity)) {
        echo("could not parse enemy quantity; spawning single enemy instead");
        quantity = 1;      
    } else {
        quantity = parseInt(quantity);    
        if (quantity < 0) {
            echo("cannot spawn a negative number of enemies; aborting");
            return;
        }
    }
    let currentPageID = Campaign().get("playerpageid");
    let currentPage = getObj('page', currentPageID);
    let w = currentPage.get("width");
    let h = currentPage.get("height");
    let randomize_x = false;
    let randomize_y = false;
    if ((pos_x == "random"||pos_x == null) && w != null) {
        randomize_x = true;
    }
    if ((pos_y == "random"||pos_y == null) && h != null) {
        randomize_y = true;
    }    
    
    if (!randomize_x) {
        if (pos_x == null) {
            pos_x = 35;
        }    
        else if (isNaN(pos_x)) {
            echo("cannot parse x position for target to spawn; using 35px");
            pos_x = 35;
        } else {
            pos_x = 70 * parseInt(pos_x) - 35;
            if (pos_x < 35) pos_x = 35;
        }
    }
    
    if (!randomize_y) {
        if (pos_y == null) {
            pos_y = 35;
        }     
        else if (isNaN(pos_y)) {
            echo("cannot parse y position for target to spawn; using 35px");
            pos_y = 35;
        } else {
            pos_y = 70 * parseInt(pos_y) - 35;
            if (pos_y < 35) pos_y = 35;
        }
    }
    
    loadEnemies();
    let enemiesLikeThis = enemies.filter((e) => e.token != null && e.token.get('name').toLowerCase().indexOf(stats.name.toLowerCase()) == 0);
    if (enemiesLikeThis == null) {
        enemiesLikeThis = 0;
    }
    else { 
        enemiesLikeThis = enemiesLikeThis.length; 
    }
    debugging('enemies like this one: ' + enemiesLikeThis);
    let token = null;
    do {
       token = getToken(stats.name + ' ' + (++enemiesLikeThis));
    } while (token != null); 
    
    
    let newEnemies = [];
    for (let i = 0; i < quantity; i++) {
        if (randomize_x) {
            pos_x = 35 + 70 * Math.floor(Math.random() * w);
        }
        if (randomize_y) {
            pos_y = 35 + 70 * Math.floor(Math.random() * h);
        }   
        let width = 70;
        let height = 70;
        if (stats['width'] != null) width = stats['width'];
        if (stats['height'] != null) height = stats['height'];
        trace('spawning at ' + printCoordinates(pos_x, pos_y));
        let token = await createObj('graphic', {
            _subtype: 'token',
            pageid: currentPageID,
            layer: 'objects',
            imgsrc: path1 + stats['img'],
            name: stats['name'] + ' ' + enemiesLikeThis++,
            left: pos_x,
            top: pos_y,
            width: width,
            height: height,
            bar3_max: Number(stats.hp),
            bar3_value: Number(stats.hp),
            bar1_value: Number(stats.ac),  
            bar4_value: Number(stats["speed"] || 30),
            bar4_max: Number(stats["speed"] || 30),            
            aura1_radius: stats['aura1_radius'] || "",
            aura2_radius: stats['aura2_radius'] || "",
            showname: true,
            showplayers_name: true,
            controlledby: getGM()
        });
        if (stats['gmnotes'] != null) {
            token.set('gmnotes', stats['gmnotes']);
        }
        newEnemies.push(token);
    }
    loadEnemies();
    return newEnemies;
}
