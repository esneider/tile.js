/* jshint bitwise: false */

var Tile = (function() {

    "use strict";

    /**
     * Create a new tile with the given coordinates.
     * A tile is determined by the coordinates x, y and the zoom level z.
     * The supported types are:
     *
     * - WMTS:   {@link http://bit.ly/b5fn2j}
     * - Google: {@link http://bit.ly/18xaPQy}
     * - TMS:    {@link http://bit.ly/17IFF5X}
     *
     * WMTS and Google are the same. TMS differs in where the 0 for the y
     * coordinate is.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z Zoom level.
     * @param {string} type  Can be 'wmts', 'google' or 'tms'.
     *
     * @constructor
     */
    var Tile = function(x, y, z, type) {

        type = type || 'wmts';

        this.x = x;
        this.y = y;
        this.z = z;

        if (type === 'tms') {
            this.y = ((1 << z) - 1) - y;
        }
    };

    /**
     * Create a new tile from string parameters.
     *
     * @see Tile
     * @param {string} x
     * @param {string} y
     * @param {string} z  Zoom level.
     * @param {string} type  Can be 'wmts', 'google' or 'tms'.
     * @returns {Tile} New tile.
     */
    function tileFromStrings(x, y, z, type) {

        x = parseInt(x, 10);
        y = parseInt(y, 10);
        z = parseInt(z, 10);

        return new Tile(x, y, z, type);
    }

    var slashPattern = /\/(\d+)\/(\d+)\/(\d+)/;
    var paramPattern = /([xyz])=(\d+)&([xyz])=(\d+)&([xyz])=(\d+)/i;

    /**
     * Create a new tile from a tile url.
     * The url information won't be stored, just the coordinates.
     *
     * @param {string} url  Url for the tile.
     * @param {string} type  Can be 'wmts', 'google' or 'tms'.
     * @returns {Tile} New tile.
     * @throws {Error} Invalid url.
     */
    Tile.fromUrl = function(url, type) {

        type = type || this.coordType;

        var res = slashPattern.exec(url);

        if (res !== null) {

            return tileFromStrings(res[1], res[2], res[3], type);
        }

        res = paramPattern.exec(url);

        if (res !== null) {

            var args = {};

            args[res[1].toLowerCase()] = res[2];
            args[res[3].toLowerCase()] = res[4];
            args[res[5].toLowerCase()] = res[6];

            if ('x' in args && 'y' in args && 'z' in args) {

                return tileFromStrings(args.x, args.y, args.z, type);
            }
        }

        throw new Error('Invalid url');
    };

    var equatorialRadius = 6378137;
    var minLatitude = -85.05112878;
    var maxLatitude = 85.05112878;
    var minLongitude = -180;
    var maxLongitude = 180;
    var semiperimeter = Math.PI * equatorialRadius;

    /**
     * Create a new tile from geodetic coordinates (latitude, longitude). The
     * geodetic coordinates are expected to use the WGS84 datum.
     *
     * @param {number} lat  Latitude.
     * @param {number} lon  Longitude.
     * @param {number} z  Zoom level.
     * @returns {Tile} New tile.
     */
    Tile.fromLatLon = function(lat, lon, z) {

        // TODO

        return lat * lon * z * semiperimeter * minLatitude * minLongitude * maxLatitude * maxLongitude;
    };

    var replacePattern = /%%(x|y|z)%%/gi;

    /**
     * Generate the url for the tile from a url pattern.
     * The pattern can have one or more of the following markers, which will be
     * replaced by the appropriate value:
     *
     * %%X%%, %%Y%%, %%Z%%
     *
     * @param {string} pattern
     * @returns {string} Url.
     */
    Tile.prototype.toUrl = function(pattern) {

        pattern = pattern || this.urlPattern;

        pattern.replace(replacePattern, function(match, par) {

            return this[par.toLowerCase()];
        });
    };

    /**
     * Return a tile containing this one.
     *
     * @param {number} levels  How many zoom levels above should it be.
     * @return {Tile} New tile.
     */
    Tile.prototype.upper = function(levels) {

        levels = levels || 1;

        var factor = 1 << levels;

        return new Tile(this.x / factor, this.y / factor, this.z - levels);
    };

    /*  -------
       | 0 | 1 |
       |---+---|
       | 2 | 3 |
        -------  */
    Tile.prototype.lower = function(n) {

        n = n || 0;

        return new Tile(this.x * 2 + (n & 1), this.y + (n > 1), this.z + 1);
    };

    /* 0 ----- 1
       |   |   |
       |-- 4 --|
       |   |   |
       2 ----- 3 */
    Tile.prototype.toLatLon = function(n) {

        n = n || 4;

        // TODO
    };

    return Tile;
}());

