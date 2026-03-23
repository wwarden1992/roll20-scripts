on("ready", function(){
    var maps = findObjs({'type': 'page'});
    on('chat:message', function(msg) {
        if (msg.content.indexOf('!changemap') == 0) {
            trace('changemap.js got message: ' + msg.content);
            let mapName = msg.content.slice(11); //omit '!changemap '
            if (mapName == "Rejoin Group") {
                let pages = Campaign().get('playerspecificpages');
                //Dunno why, but I had to do it this really roundabout way
                let newPages = {};
                Object.keys(pages).forEach((p) => {if (p != msg.playerid) newPages[p] = pages[p];});
                if (Object.keys(newPages).length == 0) newPages = false;
                Campaign().set('playerspecificpages', newPages);
                return;
            }
            let map = maps.find((m) => m.get('name').toLowerCase() == mapName.toLowerCase());
            if(map != null) map = map.get('id');
            if(map == null) {
                echo( "Could not identify a map named '" + mapName + "'");
                return;
            } else {
                movePlayerToMap(msg.playerid, map);
            }
        }
    });
});

function movePlayerToMap(playerid, map) {
    if (playerid == null || map == null) {
        warn('null value provided for either playerID or map');
    }
    let pages = Campaign().get('playerspecificpages');
    //Dunno why, but I had to do it this really roundabout way
    let newPages = {};
    newPages[playerid] = map;
    if (pages !== false) {
        debugging(Object.keys(pages));
        Object.keys(pages).forEach((p) => {if(p != playerid) newPages[p] = pages[p];});
    }
    Campaign().set('playerspecificpages', newPages);
    debugging(Campaign().get('playerspecificpages'));
}
