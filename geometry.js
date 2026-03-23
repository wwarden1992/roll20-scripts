//========================
// GEOMETRY & TRIGONOMETRY
//========================

const CIRCLE_AOE_STROKEWIDTH = 4.8;
const CONE_AOE_STROKEWIDTH = 4.9;
const SQUARE_AOE_STROKEWIDTH = 5.1;
const LINE_AOE_STROKEWIDTH = 5.2;
const AOE_COLOR = "#123456";

function getCoordinates(params, reference, xName, yName) {
    if (xName == null) xName = 'x';
    if (yName == null) yName = 'y';
    if(params[xName] == null || params[yName] == null) return null;
    let x = 0; let y = 0;
    if(params[xName]==null || params[xName]==="") {
        //do nothing; x=0 is fine for initializing
    } else if(typeof params[xName] == "string" && params[xName].indexOf('px') > 0) {
        x = parseFloat(params[xName]);
    } else {
        x = 70 * parseFloat(params[xName]);
    }
    
    if(params[yName]==null || params[yName]==="") {
        //do nothing; y=0 is fine for initializing
    } else if(typeof params[yName] == "string" && params[yName].indexOf('px') > 0) {
        y = parseFloat(params[yName]);
    } else {
        y = 70 * parseFloat(params[yName]);
    }
    let refToken = getToken(reference);
    if (isNaN(y)) y = 0; if (isNaN(x)) x = 0;
    x += refToken != null ? refToken.get('left') : 0;    
    y = refToken != null ? (refToken.get('top') - y) : y;   
    y = Math.max(0,y);
    x = Math.max(0,x);
    return {'x':x, 'y':y};
}

function printCoordinates(x,y) {
    return "(" + x + "," + y + ")";
}

function getLineEquation(x1, y1, x2, y2) {
    if(x1==null || y1==null || x2==null || y2==null ||
      (x1==x2 && y1==y2) ) {
        warn("cannot define a line from fewer than 2 points");
        return null;
    }
    let m = 0;
    if (x2==x1 && y1!=y2) m = 'infinity';
    else m = Math.round(1000000*(y2-y1)/(x2-x1))/1000000; //round to 6 decimal places to prevent floating point arithmetic errors from causing us to fail to detect parallel lines
    let b = 0;
    if (m=='infinity') b = x1;
    else b = y1 - (m*x1); //y = mx + b  
    
    if (Math.abs(m) > 10000) { //if a line has a sufficiently large slope, we probably meant for it to be a vertical line...
        m="infinity"; b=x1;
    }
    return {'m': m, 'b': b};
}

//parse arg to determine if it's a JSON obj with specific x,y,w,h values, if it's a token name, or if it's a token obj.
//return JSON obj with x and y values
function getTargetArea(target) {
    if(!target) {
        warn('no target provided; cannot get area');
        return null;
    }
    //first, check if it's already a token
    try {
        let tokenId = target.get('id');
        let area = {
            'x': target.get('left'), 
            'y': target.get('top'), 
            'w': target.get('width'), 
            'h': target.get('height')
        };
        return area;
    } catch {}
    //second, check if it's a regular piece of JSON
    try {
        if (target.left != null && target.top != null && target.width != null && target.height != null) {
            return {
                'x': target.left, 
                'y': target.top, 
                'w': target.width, 
                'h': target.height            
            };
        }
    } catch {}
    //if neither work, see if 'target' is a token name. get the token and return that
    let token = getToken(target);
    if(token) {
        let area = {
            'x': token.get('left'), 
            'y': token.get('top'), 
            'w': token.get('width'), 
            'h': token.get('height')
        };
        return area;
    }
    //still here? if it's already json with and x and y defined, we're good to go.
    if (target.x && !isNaN(target.x) && target.y && !isNaN(target.y) &&
        target.w && !isNaN(target.w) && target.h && !isNaN(target.h)) {
            debugging('checking area for token located at ' + printCoordinates(target.x, target.y));
            return target;
    }
    warn('could not get area for given target')
    return null;
}

function pythagorean(a,b) {
    return Math.sqrt(a*a + b*b);
}

function calculateDistance(x1, y1, x2, y2) {
    let delta_x = x2-x1;
    let delta_y = y2-y1;
    return pythagorean(delta_x,delta_y);
}

function calculateObjectDistance(firstObj, secondObj) {
    if(firstObj == null || secondObj == null) return Number.MAX_SAFE_INTEGER;
    let x1 = firstObj.get('left');
    let w1 = firstObj.get('width');
    let y1 = firstObj.get('top');
    let h1 = firstObj.get('height');
    let x2 = secondObj.get('left');
    let w2 = secondObj.get('width');
    let y2 = secondObj.get('top');
    let h2 = secondObj.get('height');
    x1 += (w1/2);
    x2 += (w2/2);
    y1 += (h1/2);
    y2 += (h2/2);
    let delta_x = x2-x1;
    let delta_y = y2-y1;
    return pythagorean(delta_x,delta_y);
}

function calculateObjectAngle(firstObj, secondObj) {
    if (firstObj == null || secondObj == null) return;
    let x1 = firstObj.get('left');
    let w1 = firstObj.get('width');
    let y1 = firstObj.get('top');
    let h1 = firstObj.get('height');
    let x2 = secondObj.get('left');
    let w2 = secondObj.get('width');
    let y2 = secondObj.get('top');
    let h2 = secondObj.get('height');
    x1 += (w1/2);
    x2 += (w2/2);
    y1 += (h1/2);
    y2 += (h2/2);    
    return calculateAngle(x1,y1,x2,y2);
}

//returns an angle on the interval [0,2pi).
function calculateAngle(x1,y1,x2,y2) {
    if(x1 == x2) {
        if (y1 < y2) return Math.PI/2;
        else if (y1 > y2) return 3*Math.PI/2;
        else return null; //return null if (x1,y1) and (x2, y2) are the same point
    }
    let angle = Math.atan((y2-y1)/(x2-x1));
    if(x2<x1) {
        if (y2 > y1) angle += Math.PI;
        else angle -= Math.PI;
    }
    if (angle < 0) angle += (2*Math.PI);
    //debugging('calculated angle for ' + printCoordinates(x1,y1) + " to " + printCoordinates(x2,y2) + " is " + angle + " radians, (" + (angle*180/Math.PI) + " degrees)")
    return angle;
}

function getRectangleObjectCorners(obj) {
    debugging(obj);
    let angle = (270 - Number(obj.get('rotation')));
    if (angle >= 360) angle -= 360;
    angle = (360 - angle) * (Math.PI/180);
    let markerTheta = Number(obj.get('rotation')) * Math.PI/180;
    let l = obj.get('left') != null ? obj.get('left') : obj.get('x');
    let t = obj.get('top') != null ? obj.get('top') : obj.get('y');
    let h = obj.get('height');
    if (h == null) {
        h = JSON.parse(obj.get('points'))[1][1];
    }
    let w = obj.get('width');
    if (w == null) {
        w = JSON.parse(obj.get('points'))[1][0];
    }    
    let x = Number(l) + (Number(h) * Math.sin(markerTheta)/2);
    let y = Number(t) - (Number(h) * Math.cos(markerTheta)/2);
    let offset_x = 2*(Number(l) - x);
    let offset_y = -2*(Number(t) - y);
    let x1 = Math.round(x);
    let y1 = Math.round(y);
    let x2 = Math.round(x1 + offset_x);
    let y2 = Math.round(y1 - offset_y);
    debugging(printCoordinates(x1,y1));
    debugging(printCoordinates(x2,y2));    
    w = Number(w)/2; //use half width... we because we extend the hitbox by +/- w
    let b_x = x1 + (w*Math.sin(angle));
    let c_x = x2 + (w*Math.sin(angle));
    let d_x = x1 - (w*Math.sin(angle));
    let e_x = x2 - (w*Math.sin(angle));   
    let b_y = y1 - (w*Math.cos(angle));
    let c_y = y2 - (w*Math.cos(angle));
    let d_y = y1 + (w*Math.cos(angle));
    let e_y = y2 + (w*Math.cos(angle));
    let corners = {
        'x1':b_x,'y1':b_y,
        'x2':c_x,'y2':c_y,
        'x3':d_x,'y3':d_y,
        'x4':e_x,'y4':e_y,
    };
    debugging(corners);
    return corners;
}

function getRectangleCorners(l, w, x, y, theta) {
    let x1 = Number(x);
    let y1 = Number(y);
    let angle = theta;
    let x2 = x1 + l*Math.cos(angle);
    let y2 = y1 + l*Math.sin(angle);
    let b_x = x1 + (w*Math.sin(angle));
    let c_x = x2 + (w*Math.sin(angle));
    let d_x = x1 - (w*Math.sin(angle));
    let e_x = x2 - (w*Math.sin(angle));   
    let b_y = y1 - (w*Math.cos(angle));
    let c_y = y2 - (w*Math.cos(angle));
    let d_y = y1 + (w*Math.cos(angle));
    let e_y = y2 + (w*Math.cos(angle)); 
    debugging(printCoordinates(b_x,b_y));
    debugging(printCoordinates(c_x,c_y));
    debugging(printCoordinates(d_x,d_y));
    debugging(printCoordinates(e_x,e_y));    
    corners = {
        'x1':b_x,'y1':b_y,
        'x2':c_x,'y2':c_y,
        'x3':d_x,'y3':d_y,
        'x4':e_x,'y4':e_y,
    };  
    debugging(corners);
    return corners;
}

//if an aoe even barely grazes/overlaps the area of a square token, we consider that a hit if this is true.
//if this is false, then we consider a token to only occupy the area of the inscribed circle of the square token.
//or put more simply: if true, pretend all tokens are squares. if false, pretend all tokens are circles
var allowAnyOverlap = true;

//circle must be a JSON object with x,y,r values (with (x,y) representing the center and r representing radius).
//when allowAnyOverlap is true, this method is still an approximation and will miss a couple of fringe cases where very little (~ 2%) of the token is hit 
//we're hand-waving it and saying that because so little of the token was actually within the aoe, it doesn't count as a hit.
function liesWithinCircle(circle, target) {
    if(!circle) { 
        warn('no circle definition provided');
        return false;
    }
    if(!target) {
        warn('target not provided for liesWithinCircle');
        return false;
    }
    if(!circle.x || !circle.y || !circle.r) {
        warn('circle is underdefined: (' + circle.x + ", " + circle.y + ", " + circle.r + ')');
        return;
    }
    let targetArea = getTargetArea(target);
    if(!targetArea) {
        warn('could not determine target area');
        return false;
    }
    let distance_ab = calculateDistance(circle.x, circle.y, targetArea.x, targetArea.y);
    if(distance_ab == 0) return true; //if centered exactly on target, declare success now. otherwise, you'll have issues with calculating an angle...
    let theta_ab = calculateAngle(circle.x, circle.y, targetArea.x, targetArea.y);
    let r_a = circle.r;
    let r_b = (targetArea.w/2); 
    //take a radius from the center of circle, and extend it so that it reaches the edge of a square circumscribed around it
    //(where the square is drawn from horizontal and vertical lines)
    //the formula is largely based on the equations for defining a square within a polar coordinate system: r <= csc(theta), r <= sec(theta)
    let squarifier = 1 / Math.abs( 
        ((Math.PI/4 < theta_ab && theta_ab < 3*Math.PI/4) || (5*Math.PI/4 < theta_ab && theta_ab < 7*Math.PI/4)) ?
        Math.sin(theta_ab) :
        Math.cos(theta_ab) 
    );
    if(distance_ab < r_a + ((allowAnyOverlap ? squarifier : 1) * r_b)) return true;
    //an extra check just to minimize the amount of fringe cases missed; if any of the corners are in the circle, overlap exists.
    if(allowAnyOverlap) {
        if(calculateDistance(circle.x,circle.y,targetArea.x-targetArea.w/2, targetArea.y-targetArea.h/2) < circle.r) return true;
        if(calculateDistance(circle.x,circle.y,targetArea.x+targetArea.w/2, targetArea.y-targetArea.h/2) < circle.r) return true;
        if(calculateDistance(circle.x,circle.y,targetArea.x-targetArea.w/2, targetArea.y+targetArea.h/2) < circle.r) return true;
        if(calculateDistance(circle.x,circle.y,targetArea.x+targetArea.w/2, targetArea.y+targetArea.h/2) < circle.r) return true;
    }
    return false;
}

//cone must be a JSON object with x,y,r,angle values (with (x,y) representing the center, r representing radius, and angle representing the angle bisecting the cone)
//assume cone.angle is represented in radians
//returns a simple true/false value
function liesWithinCone(cone, target, caster) {
    if (!cone || !target || !cone.x || !cone.y || !cone.r || cone.angle==null) {
        if(!cone)  warn('cone not defined properly');
        if(!target) warn('target not defined properly');
        if(!cone.x || !cone.y) warn('cone vertex coordinates not defined properly');
        if(!cone.r) warn ('cone radius not defined properly');
        if(cone.angle==null) warn('cone angle not defined properly');
        return false;
    }
    
    let casterToken = getToken(caster);
    let targetToken = getToken(target);
    let isCaster = false;
    if(casterToken != null && targetToken != null && targetToken.get('id') == casterToken.get('id')) {
        debugging(casterToken.get('name') + ' is the caster and therefore cannot hit themselves');
        return false;
    };
    
    let targetArea = getTargetArea(target);
    if (!targetArea) {
        warn('could not determine space occupied by target');
        return false;
    }
    
    const thirtyDegrees = Math.PI/6;
    const phi = cone.angle;    
    
    if (!liesWithinCircle(cone,target)) {
        return false; //if target lies outside of circle of radius r, there's no way it can lie within a cone that represents a sector of that circle
    }

    //if target is close enough to be in cone range, then if center of token is along the angle swept by the cone, we hit
    let theta_ab = calculateAngle(cone.x, cone.y, targetArea.x, targetArea.y);
    let boundOne = phi-thirtyDegrees;
    let boundTwo = phi+thirtyDegrees;
    debugging(boundOne + '   ' + theta_ab + '   ' + boundTwo);
    if (boundOne <= theta_ab && theta_ab <= boundTwo) return true;
    //covers scenario where phi >= 11pi/6, but theta < pi/6
    let coterminalTheta = (theta_ab + 2*Math.PI);
    if (boundOne <= coterminalTheta && coterminalTheta <= boundTwo) return true;
    //covers scenario where theta >= 11pi/6, but phi < pi/6
    coterminalTheta = (theta_ab - 2*Math.PI);
    if (boundOne <= coterminalTheta && coterminalTheta <= boundTwo) return true;

    //otherwise, check to see if a corner point lies within the cone
    let theta_botLeft = calculateAngle(cone.x,cone.y,targetArea.x-targetArea.w/2, targetArea.y+targetArea.h/2);
    let theta_topLeft = calculateAngle(cone.x,cone.y,targetArea.x-targetArea.w/2, targetArea.y-targetArea.h/2);
    let theta_botRight = calculateAngle(cone.x,cone.y,targetArea.x+targetArea.w/2, targetArea.y+targetArea.h/2);
    let theta_topRight = calculateAngle(cone.x,cone.y,targetArea.x+targetArea.w/2, targetArea.y-targetArea.h/2); 
    let d_botLeft = calculateDistance(cone.x,cone.y,targetArea.x-targetArea.w/2, targetArea.y+targetArea.h/2);
    let d_topLeft = calculateDistance(cone.x,cone.y,targetArea.x-targetArea.w/2, targetArea.y-targetArea.h/2);
    let d_botRight = calculateDistance(cone.x,cone.y,targetArea.x+targetArea.w/2, targetArea.y+targetArea.h/2);
    let d_topRight = calculateDistance(cone.x,cone.y,targetArea.x+targetArea.w/2, targetArea.y-targetArea.h/2);
    //if bottom left corner lies within cone, return true
    if (d_botLeft < cone.r && phi - thirtyDegrees < theta_botLeft && theta_botLeft < phi + thirtyDegrees) return true;
    //if top left corner lies within cone, return true
    if (d_topLeft < cone.r && phi - thirtyDegrees < theta_topLeft && theta_topLeft < phi + thirtyDegrees) return true;
    //and so on...
    if (d_botRight < cone.r && phi - thirtyDegrees < theta_botRight && theta_botRight < phi + thirtyDegrees) return true;
    if (d_topRight < cone.r && phi - thirtyDegrees < theta_topRight && theta_topRight < phi + thirtyDegrees) return true;
    
    //check coterminal angles
    coterminalTheta = (theta_botLeft - 2*Math.PI);
    if (d_botLeft < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;
    coterminalTheta = (theta_topLeft - 2*Math.PI);
    if (d_topLeft < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;
    coterminalTheta = (theta_botRight - 2*Math.PI);
    if (d_botRight < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;
    coterminalTheta = (theta_topRight - 2*Math.PI);
    if (d_topRight < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;

    coterminalTheta = (theta_botLeft + 2*Math.PI);
    if (d_botLeft < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;
    coterminalTheta = (theta_topLeft + 2*Math.PI);
    if (d_topLeft < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;
    coterminalTheta = (theta_botRight + 2*Math.PI);
    if (d_botRight < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;
    coterminalTheta = (theta_topRight + 2*Math.PI);
    if (d_topRight < cone.r && phi - thirtyDegrees < coterminalTheta && coterminalTheta < phi + thirtyDegrees) return true;
    
    //finally, if the vertex of the cone falls within range of the token,
    //take a radius from the center of circle (inscribed within a token), and extend it so that it reaches the edge of a square circumscribed around it (i.e. the token itself)
    //the formula is largely based on the equations for defining a square within a polar coordinate system: r <= csc(theta), r <= sec(theta)
    let squarifier = 1 / Math.abs( 
        ((Math.PI/4 < theta_ab && theta_ab < 3*Math.PI/4) || (5*Math.PI/4 < theta_ab && theta_ab < 7*Math.PI/4)) ?
        Math.sin(theta_ab) :
        Math.cos(theta_ab) 
    );
    let distance_ab = calculateDistance(cone.x, cone.y, targetArea.x, targetArea.y);
    //round to avoid floating point precision errors.
    if(Math.round(100000000*distance_ab) < Math.round(100000000*(squarifier * targetArea.w/2))) {
        debugging(targetToken.get('name') + ':  vertex ' + printCoordinates(cone.x, cone.y) + ' lies within token area centered at ' + printCoordinates(targetArea.x, targetArea.y));
        debugging('distance ' + distance_ab.toFixed(8) + ' < ' + (squarifier * targetArea.w/2).toFixed(8) + ' (' + squarifier + ' * ' + (targetArea.w/2) + ')');
        return true;
    }
    return false;
}

//finds the best angle for a cone fired by an enemy creature positioned at a certain point. radius is given in feet, and params is a JSON object which may contain the following fields
//testX: if we want to calculate a cone for a given enemy if they were at a different position, use this as the X-coordinate
//testY: if we want to calculate a cone for a given enemy if they were at a different position, use this as the Y-coordinate
//minPlayers: only include cones that hit at least this many enemies (assume 1 if no value provided)
//maxEnemies: exclude cones that hit more than this many of the creatures aligned with the enemy (assume 0 if no value provided)
//excludeIf: a function that specifies to exclude players as valid targets if some condition is met
//
//returns the calculated best cone
function calculateBestCone(t, radius, params) {
    let token = getToken(t);
    if (token == null) {
        warn('could not find a token for "' + t + '"');
        return;
    }
    let partitions = 24; //sweep 15 degrees. preferably don't do more, or else this can get slow...
    let increment = 360/partitions;
    let possibleCones = [];
    let minPlayers = 1;
    let maxEnemies = 0;
    if (params == null) params = [];
    //test a 30ft cone originating from the umberhulk in 15 degree increments
    for (let i = 0; i < partitions; i++) {
        //debugging('calculating partition ' + i);
        let angleParams = {'caster': token, 'theta': i*increment};
        if (params.testX != null && params.testY != null) {
            angleParams['testX'] = params.testX;
            angleParams['testY'] = params.testY;
            //debugging('assuming the token will be at ' + printCoordinates(params.testX, params.testY));
        }
        if (params.minPlayers != null) minPlayers = params.minPlayers;
        if (params.maxEnemies != null) maxEnemies = params.maxEnemies;
        let adj = adjustmentsForAngle(angleParams, radius);
        let cone = {'x': adj.x, 'y': adj.y, 'angle': adj.theta, 'r': (radius*70/5)};
        let playersHit = []; let enemiesHit = []
        for (let j = 0; j < playerTokens.length; j++) {
            if (liesWithinCone(cone, playerTokens[j], token) && (params.excludeIf == null || !params.excludeIf(playerTokens[j]))) {
                playersHit.push(playerTokens[j].get('bar3_value')); //hp values collected as we use this for tiebreakers
            }
        }
        for (let j = 0; j < enemies.length; j++) {
            if (liesWithinCone(cone, enemies[j].token, token)) enemiesHit.push(enemies[j].token.get('bar3_value'));
        } 
        //consider only the cones that hit enemies and don't hit allies
        if (playersHit.length != 0) playersHit.sort(function(a,b) {return b - a});
        if (enemiesHit.length <= maxEnemies && playersHit.length >= minPlayers) {
            //debugging('consider cone at ' + (i*increment) + ' degrees');
            cone.angle = Math.round(((2*Math.PI) - cone.angle) * 180/Math.PI);
            possibleCones.push({'cone': cone, 'playersHit': playersHit});
        }
    }
    //return now if we just won't hit anything at all
    if(possibleCones.length == 0) return null;
    //sort result set first by most enemies hit, then by whichever one is going to get the least damaged target.
    possibleCones.sort(function(a, b) {
        if (b.playersHit.length != a.playersHit.length) return b.playersHit.length - a.playersHit.length;
        else return (b.playersHit[0] - a.playersHit[0]);
    });
    //select the one that'll be most effective
    let selection = possibleCones[0];  
    inform(selection);
    return selection;
}

function liesWithinRectangle(rectangle, target) {
    if (target == null) return null;
    try {
        debugging('checking if ' + target.get('name') + ' lies within rectangle ' + printCoordinates(target.get('left'), target.get('top')));
    } catch {}
    //sanity check
    if(rectangle.x1==null || rectangle.x2==null || rectangle.x3==null || rectangle.x4==null ||
       rectangle.y1==null || rectangle.y2==null || rectangle.y3==null || rectangle.y4==null ) {
           warn("rectangle is missing values in its definition");
           return null;
    }
    //check if token intersects edge or diagonal of rectangle
    let x = [rectangle.x1, rectangle.x2, rectangle.x3, rectangle.x4];
    let y = [rectangle.y1, rectangle.y2, rectangle.y3, rectangle.y4];
    let line_eq_tmp = [];
    for(let i = 0; i < 4; i++) {
        for(let j = i+1; j < 4; j++) {
            let r = calculateDistance(x[i],y[i],x[j],y[j]);
            if (lineIntersectsTarget(x[i],y[i],x[j],y[j],r,target)) {
                return true;
            }
            line_eq_tmp.push(getLineEquation(x[i],y[i],x[j],y[j]));
        }
    }
    
    let line_eq = [];
    for(let i = 0; i < line_eq_tmp.length; i++) {
        for (let j = 0; j < line_eq_tmp.length; j++) {
            if (i==j) continue;
            if (line_eq_tmp[i].m == line_eq_tmp[j].m) {
                if(line_eq_tmp[i].b > line_eq_tmp[j].b) {
                    line_eq.push({
                        'm': line_eq_tmp[i].m,
                        'b': line_eq_tmp[i].b,
                        'op': '<='
                    });
                } else if (line_eq_tmp[i].b < line_eq_tmp[j].b) {
                    line_eq.push({
                        'm': line_eq_tmp[i].m,
                        'b': line_eq_tmp[i].b,
                        'op': '>='
                    });
                }
            }
        }
    }
    //sanity check
    if(line_eq.length != 4) {
        warn("uh oh... we somehow got " + line_eq.length + " equations defining our rectangle");
     
        return false;
    }
    debugging(line_eq);
    let t = getTargetArea(target);
    //test centerpoint within rectangle lines
    for (let i = 0; i < line_eq.length; i++) {
        if (line_eq[i].op == '>=') {
            if (line_eq[i].m == 'infinity') {
                if (t.x < line_eq[i].b) return false;
            } else {
                if (t.y < line_eq[i].m * t.x + line_eq[i].b) return false;
            }
        } else if (line_eq[i].op == '<=') {
            if (line_eq[i].m == 'infinity') {
                if (t.x > line_eq[i].b) return false;
            } else {
                if (t.y > line_eq[i].m * t.x + line_eq[i].b) return false;
            }
        } else {
            warn('uh oh... we somehow have a null or invalid comparison operator for one of our rectangle line equations');
            return false;
        }
    }
    debugging(target.get('name') + ' is hit because its centerpoint ' + printCoordinates(target.get('left'), target.get('top')) +
    ' satisfies the inequalities');
    return true;
}

//x1,y1 is understood to be an endpoint of the line, and extends in the direction of x2,y2 up to a distance of r.
//we want to know if any part of 'target' lies on the line.
//we will return a simple boolean here
function lineIntersectsTarget(x1,y1,x2,y2,r,target) {
    if (!x1 || !x2 || !y1 || !y2 || !r || !target) {
        warn('invalid data to define points for a line or a target for the line');
        return false;
    }
    if (x1==x2 && y1==y2) {
        warn('attempted to use the same point twice to define a line. cannot perform calculation');
        return false;
    }
    let targetArea = getTargetArea(target);    
    if (!targetArea) {
        warn('could not determine space occupied by target');
        return false;
    }
    
    let line_eq = getLineEquation(x1, y1, x2, y2);
    let m = line_eq.m;
    let b = line_eq.b;
    
    let name = 'Target';
    try {
        name = target.get('name');
    } catch {}
    
    let leftSide = targetArea.x - (targetArea.w/2);
    let rightSide = targetArea.x + (targetArea.w/2);
    let topSide = targetArea.y - (targetArea.h/2);
    let bottomSide = targetArea.y + (targetArea.h/2);
    debugging('target "' + name + '" bounded by ' + leftSide + ' < x < ' + rightSide + ', ' + topSide + ' < y < ' + bottomSide);
    if (m=='infinity') {
        debugging('line eq: x=' + b);
        if(b <= leftSide || b >= rightSide) return false;
        if (y1 > topSide && y1 < bottomSide) {
            debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + 
            ' and contains the point ' + printCoordinates(x1, y1));
            return true; //recall that moving down --> +y
        }
        else if(y2 > y1) { //vertical line moves downward
            if (y1 < topSide && topSide < y1 + r) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + 
                ' and its top side is within ' + r + ' vertical pixels of ' + printCoordinates(x1, y1));
                return true;
            }
        } else { //vertical line moves upward
            if(y1 > bottomSide && bottomSide > y1 - r) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + 
                ' and its bottom side is within ' + r + ' vertical pixels of ' + printCoordinates(x1, y1));
                return true;
            }
        }
    } else if (m==0) {
        debugging('line eq: y=' + b);        
        if(b <= topSide || b >= bottomSide) return false;
        if (x1 > leftSide && x1 < rightSide) {
            debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + 
            ' and contains the point ' + printCoordinates(x1, y1));
            return true;
        }
        else if(x2 > x1) { //horizontal line moves left to right
            if (x1 < leftSide && leftSide < x1 + r) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + 
                ' and its left side is within ' + r + ' horizontal pixels of ' + printCoordinates(x1, y1));
                return true;
            }
        } else { //horizontal line moves right to left
            if(x1 > rightSide  && rightSide > x1 - r) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + 
                ' and its right side is within ' + r + ' horizontal pixels of ' + printCoordinates(x1, y1));
                return true;
            }
        }        
    } else {
        debugging('line eq: y=' + m + 'x' + (b <= 0 ? '' : '+') + (b!=0 ? b : ''));
        let theta = calculateAngle(x1,y1,x2,y2);
        let x = leftSide;
        let y = m*x + b;
        y2 = y1 + r*Math.sin(theta);
        x2 = x1 + r*Math.cos(theta);
        debugging('line endpoints: ' + printCoordinates(x1,y1) + ' --->' + printCoordinates(x2,y2));
        //cases for left and right side are a tad less restrictive so that we may check for intersecting (and not just tangent to) corners
        if((y1 < y && y < y2) || (y2 < y && y < y1)) {
            if ((y > topSide && y < bottomSide) || (y==topSide && m > 0) || (y==bottomSide && m < 0)) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + ' and intersects line y=' + m + 'x + ' + b + ' at ' + printCoordinates(x,y));
                return true;
            }
        }
        
        x = rightSide;
        y = m*x + b;
        if((y1 < y && y < y2) || (y2 < y && y < y1)) {
            if ((y > topSide && y < bottomSide) || (y==topSide && m < 0) || (y==bottomSide && m > 0)) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + ' and intersects line y=' + m + 'x + ' + b + ' at ' + printCoordinates(x,y));
                return true;
            }
        }

        y = topSide;
        x = (y - b)/m;
        if (x > leftSide && x < rightSide) {
            if((x1 < x && x < x2) || (x2 < x && x < x1)) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + ' and intersects line y=' + m + 'x + ' + b + ' at ' + printCoordinates(x,y));
                return true;
            }
        }
        
        y = bottomSide;
        x = (y - b)/m;
        if (x > leftSide && x < rightSide) {
            if((x1 < x && x < x2) || (x2 < x && x < x1)) {
                debugging(name + ' is hit because it is located at ' + printCoordinates(targetArea.x, targetArea.y) + ' and  intersects line y=' + m + 'x + ' + b + ' at ' + printCoordinates(x,y));
                return true;
            }
        }
        
    }
    return false;
}

function drawShape(playerid, shape, length, width, type, color, fill) {
    let character = inferCharacter(playerid);
    let token = getToken(character);

    let page = getObj('page', Campaign().get('playerpageid'));
    if (page == null) return;
    let pageWidth = 70 * Number(page.get('width'));
    let pageHeight = 70 * Number(page.get('height'));
    let x = pageWidth/2;
    let y = pageHeight/2;
    
    if(token != null) {
        let x = token.get('left');
        let y = token.get('top'); 
    }
    //if (playerIsGM(playerid)) playerid = 'all';
    playerid = 'all'; //try to let all the players control the marker
    if (shape.toLowerCase() == 'cone') drawCone(x, y, length, playerid, type, color, fill);
    else if (shape.toLowerCase() == 'square') drawSquare(x, y, length, playerid, type, color, fill);
    else if (shape.toLowerCase() == 'circle') drawCircle(x, y, length, playerid, type, color, fill);
    else if (shape.toLowerCase() == 'line') drawRectangle(x,y, length, width, playerid, type, color, fill);
}

function drawCircle(x, y, radius, controlledby, type, color, fill) {
    const r = radius*70/5;
    let def = {
      layer: "objects",
      pageid: Campaign().get("playerpageid"),
      shape: "eli",
      stroke: AOE_COLOR,
      stroke_width: CIRCLE_AOE_STROKEWIDTH,
      x: x,
      y: y,
      points: "[[0,0],[" + 2*r + "," + 2*r + "]]",
      controlledby: 'all'
    };
    if (type != null && type.toLowerCase() != 'aoe') {
        def.stroke_width = 5;
        if (color != null) def.stroke = color;
        if (fill != null) def['fill'] = fill;
    }
    let obj = createObj('pathv2', def);
    toBack(obj);
    log(obj);    return obj;
}

function drawSquare(x, y, length, controlledby, type, color, fill) {
    const l = length*70/5;
    let def = {
        _pageid: Campaign().get("playerpageid"),      
        layer: 'objects',
        x: x,
        y: y,
        shape: "rec",
        stroke: AOE_COLOR,
        stroke_width: SQUARE_AOE_STROKEWIDTH,
        points: "[[0,0],[" + l + "," + l + "]]",
        controlledby: 'all'
    };
    if (type != null && type.toLowerCase() != 'aoe') {
        def.stroke_width = 5;
        if (color != null) def.stroke = color;
        if (fill != null) def['fill'] = fill;
    }
    let obj = createObj('pathv2', def);
    toBack(obj);
    return obj;
}

function drawRectangle(x, y, length, width, controlledby, type, color, fill) {
    const l = length*70/5;
    const w = width*70/5;
    let def = {
        _pageid: Campaign().get("playerpageid"),      
        layer: 'objects',
        x: x,
        y: y,
        shape: "rec",
        stroke: AOE_COLOR,
        stroke_width: LINE_AOE_STROKEWIDTH,
        points: "[[0,0],[" + w + "," + l + "]]",
        controlledby: 'all'
    };
    if (type != null && type.toLowerCase() != 'aoe') {
        def.stroke_width = 5;
        if (color != null) def.stroke = color;
        if (fill != null) def['fill'] = fill;
    }
    let obj = createObj('pathv2', def);
    toBack(obj);
    return obj;
}

function drawCone(x, y, length, controlledby, type, color, fill) {
    const l = length*70/5;
    let def = {
        _pageid: Campaign().get("playerpageid"),      
        layer: 'objects',
        x: x,
        y: y,
        stroke: AOE_COLOR,
        shape: "pol",
        stroke_width: CONE_AOE_STROKEWIDTH,
        points: JSON.stringify([
            [0,0],
            [-1*l/2,l*1.7321/2],
            [l*Math.sin(-1*Math.PI/9),l*Math.cos(-1*Math.PI/9)],
            [l*Math.sin(-1*Math.PI/18),l*Math.cos(-1*Math.PI/18)],
            [0,l],
            [l*Math.sin(Math.PI/18),l*Math.cos(Math.PI/18)],
            [l*Math.sin(Math.PI/9),l*Math.cos(Math.PI/9)],
            [l/2,l*1.7321/2],
            [0,0]
        ]),
        controlledby: 'all'
    };
    if (type != null && type.toLowerCase() != 'aoe') {
        def.stroke_width = 5;
        if (color != null) def.stroke = color;
        if (fill != null) def['fill'] = fill;
    }
    let obj = createObj('pathv2', def);  
    toBack(obj);
    return obj;
}

var FX_TOOL_IS_BROKEN = true;

//because the FX tool doesn't fucking fire at the spots I tell it to, this was determined maybe help provide an approximation to correct it. I think it's still a bit buggy      
function getFxCorrectiveFactor(lengthPx, angleDegrees) {
    let fx_corrective_factor = -8 * lengthPx* (Math.exp(-1 * Math.pow((90-Number(angleDegrees)),2)/600) + Math.exp(-1 * Math.pow((90+Number(angleDegrees)),2)/600) - 1) / 35;
    if (Math.abs(angleDegrees) > 90) fx_corrective_factor *=-1;
    if(FX_TOOL_IS_BROKEN) debugging ('fx_corrective_factor: ' + fx_corrective_factor);
    return FX_TOOL_IS_BROKEN ? fx_corrective_factor : 0;
}
