// Constants

test('Constructor', function() {

    var x = 5, y = 6, z = 7, t, T;

    t = new Tile();
    ok(t.x === 0, 'Default value');
    ok(t.y === 0, 'Default value');
    ok(t.z === 0, 'Default value');

    t = new Tile(x, y, z);
    ok(t.x === x, 'Initialization');
    ok(t.y === y, 'Initialization');
    ok(t.z === z, 'Initialization');

    T = Tile.extend({format: 'wmts'});
    ok(t.equals(new T(x, y, z)), 'Default format');

    T = Tile.extend({format: 'google'});
    ok(t.equals(new T(x, y, z)), 'Default format');

    T = Tile.extend({format: 'tms'});
    t.y = (1 << t.z) - t.y - 1;
    ok(t.equals(new T(x, y, z)), 'TMS format');

    T = Tile.extend({minZ: 5, maxZ: 10});
    t = new Tile(0, 0, 5);
    ok(t.equals(new T(0, 0, 4)), 'Minimum Z');
    t = new Tile(0, 0, 10);
    ok(t.equals(new T(0, 0, 11)), 'Maximum Z');
});

test('URL constructor', function() {

    var t, f, T;

    t = Tile.fromUrl('http://mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw/9/321/121.jpg');
    deepEqual(t, new Tile(321, 121, 9), 'Slash pattern');

    t = Tile.fromUrl('http://mt1.google.com/vt/x=213&y=230&z=10');
    deepEqual(t, new Tile(213, 230, 10), 'Param pattern');
    t = Tile.fromUrl('http://mt1.google.com/vt/y=230&z=10&x=213');
    deepEqual(t, new Tile(213, 230, 10), 'Param pattern (shuffle)');
    f = function() { Tile.fromUrl('http://mt1.google.com/vt/x=230&z=10&x=213'); };
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

    T = Tile.extend({format: 'tms'});
    t = T.fromUrl('http://mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw/9/321/121.jpg');
    ok(t.equals(new Tile(321, (1 << 9) - 122, 9)), 'TMS format');
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

    T = Tile.extend({minZ: 5, maxZ: 10});
    t = T.fromQuadKey('02301020333');
    ok(t.equals(Tile.fromQuadKey('0230102033')), 'Minimum Z');
    t = T.fromQuadKey('0230');
    ok(t.equals(Tile.fromQuadKey('02300')), 'Maximum Z');
});

test('LatLon constructor', function() {

    var t, f;

    t = Tile.fromLatLon(37.8, -122.4, 11);
    deepEqual(t, new Tile(327, 791, 11), 'Initialization');
});
