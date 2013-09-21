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
    t = Tile.fromUrl('http://mt1.google.com/vt/lyrs=m@129&hl=en&y=230&z=10&x=213&s=Galileo');
    deepEqual(t, new Tile(213, 230, 10), 'Param pattern (shuffle)');
    f = function() { Tile.fromUrl('http://mt1.google.com/vt/lyrs=m@129&hl=en&x=230&z=10&x=213&s=Galileo'); };
    throws(f, 'Invalid url (param pattern: has no z)');

    t = Tile.fromUrl('http://domain.com/myimage_11_543_234.png');
    deepEqual(t, new Tile(543, 234, 11), 'Generic pattern');
    f = function() { Tile.fromUrl('http://domain.com/myimage_11_543-234.png'); };
    throws(f, 'Invalid url (generic pattern: has different separators)');

    f = function() { Tile.fromUrl(''); };
    throws(f, 'Invalid url (empty)');
    f = function() { Tile.fromUrl('http://www.google.com/'); };
    throws(f, 'Invalid url (non-numeric)');
    f = function() { Tile.fromUrl('http://www.google.com/search?aqs=69i57j69i60l3j69i65l2.699j0'); };
    throws(f, 'Invalid url (numeric)');

    t = Tile.fromUrl('http://mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw/9/321/121.jpg', 'tms');
    deepEqual(t, new Tile(321, (1 << 9) - 122, 9), 'TMS type');
});

test('QuadKey constructor', function() {

    var t, f;

    t = Tile.fromQuadKey('02301020333');
    deepEqual(t, new Tile(327, 791, 11), 'Initialization');

    f = function() { Tile.fromQuadKey('2131234'); };
    throws(f, 'Invalid tile path');
    f = function() { Tile.fromQuadKey('213123a'); };
    throws(f, 'Invalid tile path');
    f = function() { Tile.fromQuadKey('213123@'); };
    throws(f, 'Invalid tile path');
});

test('LatLon constructor', function() {

});
