var aoeHazards = [];

const START_OF_TURN = 'turnstart';
const ENTERS_AREA = 'entersarea';
const END_OF_TURN = 'turnend';
const TRAP = 'trap';
const ON_CAST = 'oncast';
const HAZARD_MOVED = 'hazardmoved';

//kinda janky, but we gotta
const hazardCallbacks = {
    moonbeamCallback,
    silenceCallback, 
    silenceExitCallback,
    radianceCallback,
    flamingSphereCallback,
    daggersCallback,
    spiritGuardiansCallback,
    greaseCallback,
    webCallback
};

class AoeHazard {
    constructor(aoeSource, pageid, name, triggers, shape, position, params, callback, exitCallback) {
        this.aoeSource = aoeSource;
        this.pageid = pageid;
        this.name = name;
        this.triggers = triggers;
        this.shape = shape;
        this.position = position;
        this.params = params;
        this.callback = callback.bind(this);
        if (exitCallback != null) {
            log('exit callback defined');
            this.exitCallback = exitCallback.bind(this);
        }
        this.exit = this.exit.bind(this);         
    }
    
    effect(arg) {
        this.callback(arg, this.params);
    }
    
    exit(arg) {
        if(this.exitCallback != null) {
            this.exitCallback(arg, this.params); 
        } else {
            log(arg.get('name') + ' exited aoe');
        }
    }
}


function evaluateAoeHazard(token, hazard, trigger, prev) {
    if (hazard == null) return;
    if (hazard.triggered == true && trigger == ENTERS_AREA) return; //make sure the target can't repeatedly injure itself playing the hokey-pokey with the AoE
    if (hazard.shape != null && hazard.position != null && hazard.triggers != null && hazard.triggers.indexOf(trigger) > -1) {
        if (prev == null) {
            debugging('checking using current position only');
            debugging(hazard.position);
            debugging(printCoordinates(token.get('left'), token.get('top')));
            if (hazard.shape == 'circle' && liesWithinCircle(hazard.position, token)) {
                debugging('  lies within circle');
                hazard.effect(token);
                if(trigger != END_OF_TURN) hazard.triggered = true;                    
            }
            else if (hazard.shape == 'cone' && liesWithinCone(hazard.position, token)) {
                debugging('  lies within cone');
                hazard.effect(token);
                if(trigger != END_OF_TURN) hazard.triggered = true;                    
            }
            else if (hazard.shape == 'rectangle' && liesWithinRectangle(hazard.position, token)) {
                debugging('  lies within rectangle');
                hazard.effect(token);
                if(trigger != END_OF_TURN) hazard.triggered = true;                    
            }
        } else {
            debugging('checking using previous position');
            let distance = calculateDistance(token.get('left'), token.get('top'), prev.left, prev.top);
            let iterations = Math.floor(distance / 70) - 1; //measure roughly every 5 feet of movement
            let angle = calculateAngle(token.get('left'), token.get('top'), prev.left, prev.top);
            let dx = 70*Math.cos(angle);
            let dy = 70*Math.sin(angle);
            let entersAoE = false;
            let exitsAoE = false;
            //PrevObject is an ad-hoc class that's basically a wrapper for prev so that you can have it invoke a 'get' method and not break the geometry.js methods
            let prevObj = new PrevObject(prev);
            if (hazard.shape == 'circle') {
                log('check circle aoe');
                let inCircleNow = liesWithinCircle(hazard.position, token);
                let wasInCircle = liesWithinCircle(hazard.position, prevObj);
                if (!wasInCircle && inCircleNow) {
                    debugging(prev.name + '  was not in circle before, but is in it now');
                    entersAoE = true;
                } else if (wasInCircle && !inCircleNow) {
                    debugging(prev.name + ' was in circle before but is no longer in it');
                    exitsAoE = true;
                }
            }
            else if (hazard.shape == 'cone') {
                log('check cone aoe');
                let inConeNow = liesWithinCone(hazard.position, token);
                let wasInCone = liesWithinCone(hazard.position, prevObj);
                if (!wasInCone && inConeNow) {
                    debugging(prev.name + '  was not in cone before, but is in it now');                        
                    entersAoE = true;
                } else if (wasInCone && !inConeNow) {
                    debugging(prev.name + ' was in cone before but is no longer in it');
                    exitsAoE = true;
                }
            }
            else if (hazard.shape == 'rectangle') {
                log('check rectangle aoe named ' + hazard.name);
                let inRectNow = liesWithinRectangle(hazard.position, token);
                let wasInRect = liesWithinRectangle(hazard.position, prevObj);
                if (!wasInRect && inRectNow) {
                    debugging(prev.name + '  was not in rectangle before, but is in it now');                        
                    entersAoE = true;  
                } else if (wasInRect && !inRectNow) {
                    debugging(prev.name + ' was in rectangle before but is no longer in it');
                    exitsAoE = true;
                }
            }       
            //check if we pass through AOE
            if (!entersAoE && !exitsAoE) {
                for (let i = 0; i < iterations; i++) {
                    let areaOne = {left: prev.left + (i * dx), top: prev.top + (i * dy), width: prev.width, height: prev.height};
                    let areaTwo = {left: prev.left + ((i+1) * dx), top: prev.top - ((i+1) * dy), width: prev.width, height: prev.height};
                    debugging('checking ' + printCoordinates(areaOne.left, areaOne.top) + ' --> ' + printCoordinates(areaTwo.left, areaTwo.top));
                    if (hazard.shape == 'circle' && liesWithinCircle(hazard.position, areaTwo) && !liesWithinCircle(hazard.position, areaOne)) {
                        entersAoE = true; exitsAoE = true; break;
                    }
                    else if (hazard.shape == 'cone' && liesWithinCone(hazard.position, areaTwo) && !liesWithinCone(hazard.position, areaOne)) {
                        entersAoE = true; exitsAoE = true; break;
                    }
                    else if (hazard.shape == 'rectangle' && liesWithinRectangle(hazard.position, areaTwo) && !liesWithinRectangle(hazard.position, areaOne)) {
                        entersAoE = true; exitsAoE = true; break;
                    }                      
                }
            }
            if (entersAoE) {
                hazard.effect(token);
                if(trigger != END_OF_TURN) hazard.triggered = true;
            }
            if (exitsAoE) {
                setTimeout(hazard.exit, 500, token)
            }
        }
    }
}

function evaluateAoeHazards(target, trigger, prev) {
    let token = getToken(target);
    if (token == null) return;
    let tokenHP = token.get('bar3_value');
    if (tokenHP == null || tokenHP == "" || isNaN(tokenHP)) return; //if the token doesn't have an HP, then it probably doesn't represent a real entity
    debugging(aoeHazards);
    let checkableHazards = aoeHazards.filter(h => h.pageid == token.get('pageid'));
    if (checkableHazards != null && checkableHazards.length > 0) {
        checkableHazards.forEach(h => evaluateAoeHazard(token, h, trigger, prev));
    }
}

function clearAoeHazardTriggerMarkers() {
    debugging('turning off the triggered value');
    aoeHazards.forEach(h => {
        h.triggered = null;
    });
}

function checkAoeHazardUpdate(obj) {
    if (obj == null) return;
    let aoeHazard = aoeHazards.find(h => h.aoeSource == obj.id);
    if (aoeHazard == null) return;
    let index = aoeHazards.indexOf(aoeHazard);
    if (aoeHazard.shape == 'circle') {
        if (obj.get('aura1_radius') != null && obj.get('aura1_radius') != '') {
            debugging('object aura is aoe');
            aoeHazard.position = {x: obj.get('left'), y: obj.get('top'), r: (obj.get('width')/2) + (Number(obj.get('aura1_radius')) * 70/5)};
        }
        else {
            debugging('object itself is aoe');
            aoeHazard.position = {x: obj.get('left'), y: obj.get('top'), r: obj.get('width')/2};
        }
    } else if (aoeHazard.shape == 'cone') {
        let angle = (270 - Number(obj.get('rotation')));
        if (angle >= 360) angle -= 360;
        angle *= (Math.PI/180);  
        angle = (2*Math.PI) - angle; //bro just trust me bro...
        if (angle >= (2*Math.PI)) angle -= (2*Math.PI)             
        aoeHazard.position = {x: obj.get('left'), y: obj.get('top'), r: obj.get('width')/2, angle: angle};
    } else if (aoeHazard.shape == 'rectangle') {
        aoeHazard.position = getRectangleObjectCorners(obj);
    }
    aoeHazards[index] = aoeHazard;
    debugging('new position data:');
    debugging(aoeHazard.position);
}

async function createAoeHazard(obj, shape, triggers, params, callback, exitCallback, storeInMemory) {
    if (storeInMemory == null) storeInMemory = true;
    let position = null;
    if (obj == null) return;
    debugging('creating a ' + shape + ' aoe hazard');
    if (shape == 'circle') {
        if (obj.get('aura1_radius') != null && obj.get('aura1_radius') != '') {
            debugging('object aura is aoe');
            position = {x: obj.get('left'), y: obj.get('top'), r: (obj.get('width')/2) + (Number(obj.get('aura1_radius')) * 70/5)};
        }
        else {
            debugging('object itself is aoe');
            if (obj.get('left') && obj.get('top')) {
                position = {x: obj.get('left'), y: obj.get('top'), r: obj.get('width')/2};
            } else {
                //Pathv2 
                let points = JSON.parse(obj.get('points'));
                log(points);
                let d = points[points.length-1][0]; //assume points in pathv2 are [[0,0][d,d]]
                position = {x: obj.get('x'), y: obj.get('y'), r: d/2}; //Pathv2 uses x & y instead of left & top
            }
        }        
    } else if (shape == 'cone') {
        let angle = (270 - Number(obj.get('rotation')));
        if (angle >= 360) angle -= 360;
        angle *= (Math.PI/180);  
        angle = (2*Math.PI) - angle; //bro just trust me bro...
        if (angle >= (2*Math.PI)) angle -= (2*Math.PI)        
        if (obj.get('left') && obj.get('top')) {
            position = {x: obj.get('left'), y: obj.get('top'), r: obj.get('width')/2, angle: angle};
        } else {
            //Pathv2 
            let points = JSON.parse(obj.get('points'));
            let r = points[4][1]; //assume cone drawn with 9 points, the fifth point (index 4) is [0,r]
            position = {x: obj.get('x'), y: obj.get('y'), r: r}; //Pathv2 uses x & y instead of left & top            
        }
    } else if (shape == 'rectangle') {
        position = getRectangleObjectCorners(obj);
    }
    let hazard = null;
    if (position != null) {
        hazard = new AoeHazard(
            obj.get('id'),
            obj.get('pageid'),
            obj.get('name'),
            triggers, 
            shape, 
            position,
            params,
            callback,
            exitCallback
        );            
        aoeHazards.push(hazard);  
    }
    if(triggers.indexOf(ON_CAST) > -1) tokens.forEach(t => evaluateAoeHazard(t, hazard, ON_CAST));
    if (storeInMemory && hazard) {
        if (!aoeHazardDoc) {
            getHazardDoc();
            if (!aoeHazardDoc) {
                warn('AOE hazard doc missing; hazard will not persist');
                return hazard;
            }
        }
    
        let data = [];
        await aoeHazardDoc.get('notes', function(text) {
            if (text && text.trim()) {
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    warn('Failed to parse AOE hazard memory; resetting');
                    data = [];
                }
            }
        });
        
        let hazardRecord = {
            objId: obj.get('id'),
            shape: shape,
            triggers: triggers,
            callback: callback?.name || null,
            exitCallback: exitCallback?.name || null,
        };
        if(params != null) {
            hazardRecord['params'] = {
                'caster': params.caster,
                'dc': params.dc,
                'level': params.level
            };
        }
        data.push(hazardRecord);
        aoeHazardDoc.set('notes', JSON.stringify(data));
    }
    return hazard;
}

var aoeHazardDoc = null;

async function getHazardDoc() {
    let docs = findObjs({ _type: 'handout', name: 'Hazard Tracker' });
    let doc;
    if (docs.length) {
        aoeHazardDoc = docs[0];
    } else {
        aoeHazardDoc = createObj('handout', {
            name: 'Hazard Tracker'
        });
        aoeHazardDoc.set('notes', '[]');
    }
}

async function createHazardsFromDoc() {
    if (!aoeHazardDoc) await getHazardDoc();
    if (!aoeHazardDoc) {
        warn('something is messed up');
        return;
    }
    let hazardText = '[]';
    await aoeHazardDoc.get('notes', function(text) {
        if (text) hazardText = text;
    });
    let hazardData;
    try {
        hazardData = JSON.parse(hazardText);
    } catch (e) {
        warn('Failed to parse hazard data from doc: ' + e);
        return;
    }

    // Iterate over each stored hazard
    for (const hazardId in hazardData) {
        const h = hazardData[hazardId];
        if (h == null) continue;
        // Resolve callbacks if you have named functions stored somewhere
        let callbackFn = h.callback ? hazardCallbacks[h.callback] : null;
        let exitCallbackFn = h.exitCallback ? hazardCallbacks[h.exitCallback] : null;

        // Recreate the hazard
        let obj = getObj('graphic', h.objId);
        if (!obj) {
            obj = getObj('pathv2', h.objId);
            if (!obj) {
                log(`Cannot find object with id ${h.objId}, skipping hazard creation.`);
                continue;
            }
        }

        await createAoeHazard(obj, h.shape, h.triggers, h.params, callbackFn, exitCallbackFn, false);
    }
}

async function removeAoeHazardFromDoc(objId) {
    if (!aoeHazardDoc) return;
    //just a very lazy way to try to mitigate race conditions where you might have several updates occuring roughly simultaneously
    await delayMS(1000 + randomInteger(1000)); 
    debugging('removing hazard ' + objId);
    // Read the current stored JSON
    let hazardText = "";
    await aoeHazardDoc.get('notes', function(text) {
        if (text) hazardText = text;
    });
    let hazards = [];
    try { hazards = JSON.parse(hazardText); } catch(e) { warn('Failed to parse aoeHazardDoc'); }
    // Remove any hazard with matching objId
    hazards = hazards.filter(h => h && h.objId !== objId);
    // Write updated JSON back to the doc
    aoeHazardDoc.set('notes', JSON.stringify(hazards));
}

on("ready", function(){
    aoeHazards = [];
    createHazardsFromDoc();
    on('destroy:graphic', function(obj) {
        debugging('checking if destroyed graphic was an AoE Hazard');
        if (obj == null) return;
        let updatedAoeHazards = [];
        for(let i = 0; i < aoeHazards.length; i++) {
            if(aoeHazards[i].id != obj.get('id') && (aoeHazards[i].name != null && aoeHazards[i].name != obj.get('name'))) updatedAoeHazards.push(aoeHazards[i]);
        }
        aoeHazards = updatedAoeHazards;
        removeAoeHazardFromDoc(obj.get('id'));        
    });
    
    on('destroy:pathv2', function(obj) {
        if (obj == null) return;
        let updatedAoeHazards = [];
        for(let i = 0; i < aoeHazards.length; i++) {
            if(aoeHazards[i].id != obj.get('id') && (aoeHazards[i].name != null && aoeHazards[i].name != obj.get('name'))) updatedAoeHazards.push(aoeHazards[i]);
        }
        aoeHazards = updatedAoeHazards;  
        removeAoeHazardFromDoc(obj.get('id'));        
    });

    on('change:graphic:left', function(obj, prev) {
        if (obj == null) return;
        checkAoeHazardUpdate(obj);
        evaluateAoeHazards(obj, TRAP, prev);
        if (obj.get('name') != getCurrentTurn()) return; //if moving outside of turn, consider it involuntary movement
        evaluateAoeHazards(obj, ENTERS_AREA, prev);
    });
    
    on('change:graphic:top', function(obj, prev) {
        if (obj == null) return;
        if (obj.get('left') != prev.left) return; //ignore; the change:graphic:left function will handle it
        checkAoeHazardUpdate(obj);
        evaluateAoeHazards(obj, TRAP, prev);
        if (obj.get('name') != getCurrentTurn()) return; //if moving outside of turn, consider it involuntary movement        
        evaluateAoeHazards(obj, ENTERS_AREA, prev);
    });
    
    on('change:graphic:aura1_radius', function(obj, prev) {
        if (obj == null) return;
        if (obj.get('aura1_radius') == '') aoeHazards = aoeHazards.filter(h => h.aoeSource != obj.id); 
    });
    
    on('change:graphic:aura2_radius', function(obj, prev) {
        if (obj == null) return;
        if (obj.get('aura2_radius') == '') aoeHazards = aoeHazards.filter(h => h.aoeSource != obj.id); 
    });
});  


class PrevObject {
    constructor(props) {
        this.props = props;
    }
    
    get(type) {
        if (this.props == null) return null;
        return this.props[type];
    }
}
