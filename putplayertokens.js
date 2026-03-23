//DEPENDENCIES:
//   characters.js: provides the getAttribute method for reading a stat from a character sheet

var players;
var troopsDeployed = 0;

on("ready", function(){
    players=findObjs({_type:'player'});
    on('add:page', function(obj) {
        assembleTheTroops(obj);
    });
});

function assembleTheTroops(obj) {
    troopsDeployed = 0;
    Object.keys(characters).forEach((character) => deployTroop(character, obj));
    createLairActionSymbol(obj);
}

async function deployTroop(character, obj) {
    if (characters[character] == null) {
        warn('could not find a value for characters[' + character + ']');
        return;
    }
    let info = characters[character];
    if(inactiveCharacterList.find(n => n == info.name) != null) return;
    let playerObj = players.find(player => player.get('displayname') == info.controlled_by);
    let playerid = playerObj != null ? playerObj.get('id') : 'all';
    if (playerid == null) {
        warn('could not create ' + character + ' token (couldn\'t locate player ID)');
        return;
    }
    let img_path = info.img_path;
    if (img_path == null || img_path == "") {
        warn('could not create ' + character + ' token (couldn\'t locate image path)');
        return;
    }
    if (info.sheet != null) {
        let hp = await getAttribute(info.name,'hp');
        let hpMax = await getAttribute(info.name,'hp','max');
        let ac = await getAttribute(info.name,'ac');
        while (ac === undefined || hpMax === undefined || hp === undefined) {
            await new Promise((r) => setTimeout(r, 100));
        }
        let newToken = createObj('graphic', {
            _subtype: 'token',
            pageid: obj.id,
            layer: 'objects',
            imgsrc: img_path,
            name: character,
            left: 35 + 70*(troopsDeployed%4),
            top: 35 + 70*Math.floor(troopsDeployed/4),
            width: 70,
            height: 70,
            showname: true,
            showplayers_name: true,
            bar3_value: hp,
            bar3_max: hpMax,
            bar4_value: 30,
            bar4_max: 30,            
            bar1_value: ac,
            has_bright_light_vision: true,    
            //represents: info.sheet.id, NOTE: 2024 sheets are still a bit too wonky for us to start considering represents and barX_link fields
            controlledby: 'all' //everyone now controls every token for the sake of sharing vision
        });  
    } else {
        createObj('graphic', {
            _subtype: 'token',
            pageid: obj.id,
            layer: 'objects',
            imgsrc: img_path,
            name: character,
            left: 35 + 70*(troopsDeployed%4),
            top: 35 + 70*Math.floor(troopsDeployed/4),
            width: 70,
            height: 70,
            showname: true,
            showplayers_name: true,
            has_bright_light_vision: true,    
            controlledby: 'all' //everyone now controls every token for the sake of sharing vision
        });   
    }
    troopsDeployed++;
}

var LAIR_ACTIONS = 'Lair Actions';

async function createLairActionSymbol(obj) {
    createObj('graphic', {
        _subtype: 'token',
        pageid: obj.id,
        layer: 'gmlayer',
        imgsrc: 'https://files.d20.io/images/377297238/jsNerrEzluq10lQl7knypQ/thumb.png?1706290491',
        name: LAIR_ACTIONS,
        left: 1715,
        top: 35,
        width: 70,
        height: 70,
        showname: true,        
        controlledby: getGM()
    });  
}
