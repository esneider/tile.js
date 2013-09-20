var x = 5;
var y = 6;
var z = 7;

test("constructor", function() {

    var t;

    t = new Tile();
    ok(t.x === 0, "Default value");
    ok(t.y === 0, "Default value");
    ok(t.z === 0, "Default value");

    t = new Tile(x, y, z);
    ok(t.x === x, "Initialization");
    ok(t.y === y, "Initialization");
    ok(t.z === z, "Initialization");

    deepEqual(new Tile(x, y, z), new Tile(x, y, z, 'wmts'), "Default type");
    deepEqual(new Tile(x, y, z), new Tile(x, y, z, 'google'), "Default type");
    notDeepEqual(new Tile(x, y, z), new Tile(x, y, z, 'tms'), "Default type");

    t = new Tile(x, y, z, 'tms');
    t.y = (1 << t.z) - t.y - 1;
    deepEqual(t, new Tile(x, y, z), "TMS type");
});

