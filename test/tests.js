// Constants
var x = 5;
var y = 6;
var z = 7;

test('Constructor', function() {

    var t;

    t = new Tile();
    ok(t.x === 0, 'Default value');
    ok(t.y === 0, 'Default value');
    ok(t.z === 0, 'Default value');

    t = new Tile(x, y, z);
    ok(t.x === x, 'Initialization');
    ok(t.y === y, 'Initialization');
    ok(t.z === z, 'Initialization');

    deepEqual(new Tile(x, y, z), new Tile(x, y, z, 'wmts'), 'Default type');
    deepEqual(new Tile(x, y, z), new Tile(x, y, z, 'google'), 'Default type');
    notDeepEqual(new Tile(x, y, z), new Tile(x, y, z, 'tms'), 'Default type');

    t = new Tile(x, y, z, 'tms');
    t.y = (1 << t.z) - t.y - 1;
    deepEqual(t, new Tile(x, y, z), 'TMS type');
});

test('URL constructor', function() {

    var t, f;

    t = Tile.fromUrl('http://mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw/9/321/121.jpg');
    deepEqual(t, new Tile(321, 121, 9), 'Slash pattern');

    t = Tile.fromUrl('http://mt1.google.com/vt/lyrs=m@129&hl=en&x=213&y=230&z=10&s=Galileo');
    deepEqual(t, new Tile(213, 230, 10), 'Param pattern');

    t = Tile.fromUrl('http://domain.com/myimage_11_543_234.png');
    deepEqual(t, new Tile(543, 234, 11), 'Generic pattern');

    f = function() { Tile.fromUrl('https://www.google.com/'); };
    throws(f, 'Invalid url (non-numeric)');

    f = function() { Tile.fromUrl('https://www.google.com/search?aqs=chrome..69i57j69i60l3j69i65l2.699j0'); };
    throws(f, 'Invalid url (numeric)');
});

