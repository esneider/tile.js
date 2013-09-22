/* jshint bitwise: false */

var Tile = (function() {

    'use strict';

    var slashPattern = /\/(\d+)\/(\d+)\/(\d+)/;
    var paramPattern = /([xyz])=(\d+)&([xyz])=(\d+)&([xyz])=(\d+)/i;
    var genericPattern = /(\d+)([^A-Za-z0-9])(\d+)\2(\d+)/;
    var replacePattern = /{{(p|x|y|z)}}/gi;

    var minLatitude = -85.05112878;
    var maxLatitude = 85.05112878;
    var minLongitude = -180;
    var maxLongitude = 180;
    var equatorialRadius = 6378137;
    var semiperimeter = Math.PI * equatorialRadius;

    var initializing = false;
    var xhr = null;
    var xmlCallback = null;

    /**
     * Switch between TMS and WMTS y coordinates.
     *
     * @see Tile
     * @param {number} y  Coordinate.
     * @param {number} z  Zoom level.
     * @return {number} New y coordinate.
     */
    function switchTms(y, z) {

        return (1 << z) - y - 1;
    }

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
     * @constructor
     * @param {number} x  Coordinate.
     * @param {number} y  Coordinate.
     * @param {number} z  Zoom level.
     * @param {string} [type='wmts']  Can be 'wmts', 'google' or 'tms'.
     */
    var Tile = function(x, y, z, type) {

        if (initializing) { return; }

        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;

        type = type || this.coordType;

        if (type === 'tms') {
            this.y = switchTms(this.y, this.z);
        }
    };

    /**
     * Create a new tile from string parameters.
     *
     * @see Tile
     * @param {string} x  Coordinate.
     * @param {string} y  Coordinate.
     * @param {string} z  Zoom level.
     * @param {string} [type='wmts']  Can be 'wmts', 'google' or 'tms'.
     * @returns {Tile} New tile.
     */
    function tileFromStrings(x, y, z, type) {

        x = parseInt(x, 10);
        y = parseInt(y, 10);
        z = parseInt(z, 10);

        return new Tile(x, y, z, type);
    }

    /**
     * Create a new tile from a tile url. The url information won't be stored,
     * just the coordinates.
     *
     * @param {string} url  Url for the tile.
     * @param {string} [type='wmts']  Can be 'wmts', 'google' or 'tms'.
     * @returns {Tile} New tile.
     * @throws {Error} Invalid url.
     */
    Tile.fromUrl = function(url, type) {

        var res = slashPattern.exec(url);

        if (res !== null) {

            return tileFromStrings(res[2], res[3], res[1], type);
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

        res = genericPattern.exec(url);

        if (res !== null) {

            return tileFromStrings(res[3], res[4], res[1], type);
        }

        throw new Error('Invalid url');
    };

    /**
     * Create a new tile from a Microsoft QuadKey: {@link http://bit.ly/56kDpD}
     *
     * @param {string} key  Base-4 number.
     * @returns {Tile} New tile.
     * @throws {Error} Invalid tile path.
     */
    Tile.fromQuadKey = function(key) {

        return new Tile(0, 0, 0).descendant(key);
    };

    /**
     * Trim a number if it's outside a given range.
     *
     * @param {number} n  Number to trim.
     * @param {number} min  Minimum possible value, included.
     * @param {number} max  Maximum possible value, included.
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
     * @param {number} z  Zoom level.
     * @returns {Tile} New tile.
     */
    Tile.fromLatLon = function(lat, lon, z) {

        lat = trim(lat, minLatitude, maxLatitude);
        lon = trim(lon, minLongitude, maxLongitude);

        var x = (lon + 180) / 360;
        var s = Math.sin(lat * Math.PI / 180);
        var y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);

        var size = 256 << z;

        x = ~~trim(x * size + 0.5, 0, size - 1);
        y = ~~trim(y * size + 0.5, 0, size - 1);

        return new Tile(x >> 8, y >> 8, z);
    };

    /**
     * Create a new tile from zoom plane coordinates (in pixels).
     *
     * @param {number} x  Coordinate.
     * @param {number} y  Coordinate.
     * @param {number} z  Zoom level.
     * @returns {Tile} New tile.
     */
    Tile.fromPixel = function(x, y, z) {

        return new Tile(x >> (z - 8), y >> (z - 8), z);
    };

    /**
     * TODO
     */
    function extend(target, source) {

        for (var attr in source) {
            if (source.hasOwnProperty(attr)) {
                target[attr] = source[attr];
            }
        }
    }

    /**
     * Create a specialized constructor for Tile.
     *
     * @example
     *
     * GoogleTile = Tile.extend({
     *     urlPattern: 'http://mt{{p}}.google.com/vt/x={{x}}&y={{y}}&z={{z}}',
     *     urlPrefixes: ['0','1','2','3'],
     *     coordType: 'google'
     * });
     * var g = new GoogleTile(2, 2, 2);
     *
     * @param {object}    param  Extra tile parameters.
     * @param {string}   [param.urlPattern='']  Pattern for url building.
     * @param {string[]} [param.urlPrefixes=['']]  Possible url prefixes.
     * @param {string}   [param.coordType='wmts']  Can be 'wmts', 'google' or 'tms'.
     * @returns {function} New tile constructor.
     */
    Tile.extend = function(param) {

        function Tile() { this.constructor.apply(this, arguments); }

        initializing = true;
        Tile.prototype = new this();
        initializing = false;

        extend(Tile.prototype, this.prototype);
        extend(Tile.prototype, param);

        return Tile;
    };

    /**
     * Default parameters.
     */
    Tile.prototype.coordType = 'wmts';
    Tile.prototype.urlPrefixes = [''];
    Tile.prototype.urlPattern = '';

    /**
     * Return a tile containing this one (lower zoom level).
     *
     * @param {number} levels  How many zoom levels to traverse up.
     * @return {Tile} New tile.
     */
    Tile.prototype.ancestor = function(levels) {

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
     *  @returns {Tile} New tile.
     *  @throws {Error} Invalid tile path.
     */
    Tile.prototype.descendant = function(path) {

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
     * Generate the url for the tile from a url pattern. The pattern can have
     * one or more of the following markers, which will be replaced by the
     * appropriate value:
     *
     * {{x}}, {{y}}, {{z}}, {{p}}
     *
     * where x and y are the coordinates, z the zoom level and p the random
     * prefix.
     *
     * @param {string} urlPattern
     * @param {string[]} urlPrefixes
     * @returns {string} Url.
     */
    Tile.prototype.toUrl = function(urlPattern, urlPrefixes) {

        urlPattern  = urlPattern  || this.urlPattern;
        urlPrefixes = urlPrefixes || this.urlPrefixes;

        var tile = this;

        return urlPattern.replace(replacePattern, function(match, par) {

            switch (par.toLowerCase()) {
                case 'x': return tile.x;
                case 'y': return tile.y;
                case 'z': return tile.z;
                case 'p': return urlPrefixes[Math.floor(Math.random() * urlPrefixes.length)];
            }
        });
    };

    /**
     * TODO
     */
    Tile.prototype.toPixel = function(x, y) {

        x += this.x << 8;
        y += this.y << 8;

        return {x: x, y: y};
    };

    /**
     * Return the geodetic coordinates corresponding to a given tile pixel.
     *
     * @param {number} x  Tile pixel x coordinate, between 0 and 255.
     * @param {number} y  Tile pixel y coordinate, between 0 and 255.
     * @returns {object} Object with lat and lon fields.
     */
    Tile.prototype.toLatLon = function(x, y) {

        var size = 256 << this.z;

        x = trim(x + (this.x << 8), 0, size - 1) / size - 0.5;
        y = 0.5 - trim(y + (this.y << 8), 0, size - 1) / size;

        var lat = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI;
        var lon = 360 * x;

        return {lat: lat, lon: lon};
    };

    /**
     * TODO
     */
    Tile.prototype.fetch = function(urlPattern, callback, opts) {

        if (!('retries' in opts)) { opts.retries = 3; }
        if (!('timeout' in opts)) { opts.timeout = 3000; }

        if (xhr !== null && xhr.readyState < 4) {

            xmlCallback = function() {
                xmlCallback.apply(arguments);
                callback.apply(arguments);
            };

            return;
        }

        xmlCallback = callback;

        xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {

            if (xhr.readyState === 4) {

                switch (~~(xhr.status / 100)) {
                    case 1:
                    case 2:
                        xmlCallback(xhr.response);
                        break;
                    case 3:
                    case 4:
                        xmlCallback(null);
                        break;
                    default:
                        if (retries) {
                            this.get(xmlCallback, urlPattern, type, retries - 1);
                        } else {
                            xmlCallback(null);
                        }
                        break;
                }
            }
        };

        xhr.open('GET', this.toUrl(urlPattern, type), true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.send(null);
    };

    /**
     * TODO
     */
    Tile.prototype.abort = function() {

        if (xhr) {
            xhr.abort();
        }
    };

    return Tile;
}());
