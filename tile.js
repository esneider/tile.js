/* jshint bitwise: false */

var Tile = (function() {

    'use strict';

    var slashPattern = /\/(\d+)\/(\d+)\/(\d+)/;
    var paramPattern = /([xyz])=(\d+)&([xyz])=(\d+)&([xyz])=(\d+)/i;
    var replacePattern = /%%(x|y|z)%%/gi;

    var minLatitude = -85.05112878;
    var maxLatitude = 85.05112878;
    var minLongitude = -180;
    var maxLongitude = 180;
    var equatorialRadius = 6378137;
    var semiperimeter = Math.PI * equatorialRadius;

    var xmlHttp = null;
    var xmlCallback = null;

    /**
     * Create a new tile with the given coordinates.
     * A tile is determined by the coordinates x, y and the zoom level z.
     * The supported types are:
     *
     * - WMTS:   {@link http://bit.ly/b5fn2j}
     * - Google: {@link http://bit.ly/18xaPQy}
     * - TMS:    {@link http://bit.ly/17IFF5X}
     *
     * WMTS and Google are the same. TMS differs just in where the 0 for the y
     * coordinate is.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z     Zoom level.
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
     *
     * @param {string} x
     * @param {string} y
     * @param {string} z     Zoom level.
     * @param {string} type  Can be 'wmts', 'google' or 'tms'.
     *
     * @returns {Tile} New tile.
     */
    function tileFromStrings(x, y, z, type) {

        x = parseInt(x, 10);
        y = parseInt(y, 10);
        z = parseInt(z, 10);

        return new Tile(x, y, z, type);
    }

    /**
     * Create a new tile from a tile url.
     * The url information won't be stored, just the coordinates.
     *
     * @param {string} url   Url for the tile.
     * @param {string} type  Can be 'wmts', 'google' or 'tms'.
     *
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

    /**
     * Create a new tile corresponding to a Microsoft QuadTree tile:
     * {@link http://bit.ly/56kDpD}
     *
     * @param {string} key  Base-4 number.
     *
     * @returns {Tile} New tile.
     * @throws {Error} Invalid tile path.
     */
    Tile.fromQuadKey = function(key) {

        return new Tile(0, 0, 0).lower(key);
    };

    /**
     * Trim a number if it is outside a given range.
     *
     * @param {number} n
     * @param {number} min
     * @param {number} max
     *
     * @returns {number} Trimmed number.
     */
    function trim(n, min, max) {

        return n < min ? min : (n > max ? max : n);
    }

    /**
     * Create a new tile from geodetic coordinates (latitude and longitude in
     * degrees). The geodetic coordinates are expected to use the WGS84 datum.
     *
     * @param {number} lat  Latitude.
     * @param {number} lon  Longitude.
     * @param {number} z    Zoom level.
     *
     * @returns {Tile} New tile.
     */
    Tile.fromLatLon = function(lat, lon, z) {

        lat = trim(lat, minLatitude, maxLatitude);
        lon = trim(lon, minLongitude, maxLongitude);

        var x = lon / 360 + 0.5;
        var sinLat = Math.sin(lat * Math.PI / 180);
        var y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);

        x = ~~trim((x << z) + 1.5, 1, 1 << z) - 1;
        y = ~~trim((x << z) + 1.5, 1, 1 << z) - 1;

        return new Tile(x, y, z);
    };

    Tile.fromPixel = function(x, y, z) {

        // TODO
    };

    /**
     * Generate the url for the tile from a url pattern.
     * The pattern can have one or more of the following markers, which will be
     * replaced by the appropriate value:
     *
     * %%X%%, %%Y%%, %%Z%%
     *
     * @param {string} pattern
     *
     * @returns {string} Url.
     */
    Tile.prototype.toUrl = function(pattern) {

        pattern = pattern || this.urlPattern;

        return pattern.replace(replacePattern, function(match, par) {

            return this[par.toLowerCase()];
        });
    };

    /**
     * Return a tile containing this one (lower zoom level).
     *
     * @param {number} levels  How many zoom levels above should it be.
     *
     * @return {Tile} New tile.
     */
    Tile.prototype.higher = function(levels) {

        levels = levels || 1;

        return new Tile(this.x >> levels, this.y >> levels, this.z - levels);
    };

    /**
     * Return a tile contained by this one (higher zoom level). For each
     * further zoom level, we can choose between 4 tiles, numbered as follows:
     *
     *  -------
     * | 0 | 1 |
     * |---+---|
     * | 2 | 3 |
     *  -------
     *
     *  Thus, the path to a tile is the concatenation of the numbers
     *  representing this choices.
     *
     *  @param {string} path  Base-4 number.
     *
     *  @returns {Tile} New tile.
     *  @throws {Error} Invalid tile path.
     */
    Tile.prototype.lower = function(path) {

        path = path || '0';

        var x = this.x;
        var y = this.y;

        for (var i = 0; i < path.length; i++) {

            x <<= 1;
            y <<= 1;

            switch (path.charAt(i)) {
                case '0': break;
                case '1': x++; break;
                case '2': y++; break;
                case '3': x++; y++; break;
                default:
                    throw new Error('Invalid tile path');
            }
        }

        return new Tile(x, y, this.z + path.length);
    };

    /**
     * Return the geodetic coordinates corresponding to a given tile pixel.
     *
     * @param {number} x  Tile pixel x coordinate, between 0 and 255.
     * @param {number} y  Tile pixel y coordinate, between 0 and 255.
     *
     * @returns {object} Object with lat and lon fields.
     */
    Tile.prototype.toLatLon = function(x, y) {

        // TODO
    };

    /**
     *
     */
    Tile.prototype.get = function(callback, url, type, retries) {

        if (xmlHttp !== null && xmlHttp.readyState < 4) {

            xmlCallback = function(res) {
                xmlCallback(res);
                callback(res);
            };

            return;
        }

        xmlCallback = callback;

        xmlHttp = new XMLHttpRequest();

        xmlHttp.onreadystatechange = function() {

            if (xmlHttp.readyState === 4) {

                switch (~~(xmlHttp.status / 100)) {
                    case 1:
                    case 2:
                        xmlCallback(xmlHttp.response);
                        break;
                    case 3:
                    case 4:
                        xmlCallback(null);
                        break;
                    default:
                        if (retries) {
                            this.get(xmlCallback, url, type, retries - 1);
                        } else {
                            xmlCallback(null);
                        }
                        break;
                }
            }
        };

        xmlHttp.open('GET', this.toUrl(url, type), true);
        xmlHttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xmlHttp.send(null);
    };

    Tile.prototype.abort = function() {

        if (xmlHttp) {
            xmlHttp.abort();
        }
    };

    return Tile;
}());

