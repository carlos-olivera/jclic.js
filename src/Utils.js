/**
 *  File    : Utils.js
 *  Created : 01/04/2015
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  JClic.js
 *  An HTML5 player of JClic activities
 *  https://projectestac.github.io/jclic.js
 *
 *  @source https://github.com/projectestac/jclic.js
 *
 *  @license EUPL-1.1
 *  @licstart
 *  (c) 2000-2018 Catalan Educational Telematic Network (XTEC)
 *
 *  Licensed under the EUPL, Version 1.1 or -as soon they will be approved by
 *  the European Commission- subsequent versions of the EUPL (the "Licence");
 *  You may not use this work except in compliance with the Licence.
 *
 *  You may obtain a copy of the Licence at:
 *  https://joinup.ec.europa.eu/software/page/eupl
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  Licence for the specific language governing permissions and limitations
 *  under the Licence.
 *  @licend
 */

/* global define */

define([
  "screenfull",
  "clipboard-js",
  "i18next",
  "jszip",
  "jszip-utils",
  "scriptjs",
  "webfontloader"
], function (screenfull, clipboard, i18next, JSZip, JSZipUtils, ScriptJS, WebFont) {

  // In some cases, require.js does not return a valid value for screenfull. Check it:
  if (!screenfull)
    screenfull = window.screenfull;

  /**
   * Returns the two-digits text expression representing the given number (lesser than 100) zero-padded at left
   * Useful for representing hours, minutes and seconds
   * @param {number} val - The number to be processed
   * @returns {string}
   */
  const _zp = val => `0${val}`.slice(-2);

  /**
   *
   * Miscellaneous utility functions and constants
   * @exports Utils
   * @class
   * @abstract
   */
  class Utils {
    /**
     * Exports third-party NPM packages used by JClic, so they become available to other scripts through
     * the global variable `JClicObject` (defined in {@link JClic})
     * @example <caption>Example usage of JSZip through JClicObject</caption>
     * var WebFont = window.JClicObject.Utils.pkg.WebFont;
     * WebFont.load({google: {families: ['Roboto']}});
     * @type: {object} */
    static get pkg() {
      return {
        ClipboardJS: clipboard,
        i18next: i18next,
        JSZip: JSZip,
        JSZipUtils: JSZipUtils,
        ScriptJS: ScriptJS,
        WebFont: WebFont,
      };
    }

    /**
     * Function obtained from `i18next` that will return the translation of the provided key
     * into the current language.
     * The real function will be initiated by the constructor of `JClicPlayer`. Meanwhile, it just returns `key`.
     * @param {string} key - ID of the expression to be translated
     * @returns {string} - Translated text
     */
    static getMsg(key) { return key }

    /**
     * List of valid verbosity levels
     * @const {string[]} */
    static get LOG_LEVELS() { return ['none', 'error', 'warn', 'info', 'debug', 'trace', 'all'] }

    /**
     * Labels printed on logs for each message type
     * @const {string[]}
     */
    static get LOG_PRINT_LABELS() { return ['     ', 'ERROR', 'WARN ', 'INFO ', 'DEBUG', 'TRACE', 'ALL  '] }

    /**
     * Current verbosity level. Default is 2 (only error and warning messages are printed)
     * @type {number} */
    static get LOG_LEVEL() { return Utils._LOG_LEVEL } // warn

    /**
     * Options of the logging system
     * @type {object} */
    static get LOG_OPTIONS() { return Utils._LOG_OPTIONS }

    /**
     * Initializes the global settings
     * @param {object} options - An object with global settings
     * @returns {object} The normalized `options` object
     */
    static init(options) {
      Utils.normalizeObject(options);
      if (options.logLevel != null)
        Utils.setLogLevel(options.logLevel);
      if (typeof options.chainLogTo === 'function')
        Utils.LOG_OPTIONS.chainTo = options.chainLogTo;
      if (typeof options.pipeLogTo === 'function')
        Utils.LOG_OPTIONS.pipeTo = options.pipeLogTo;
      return options;
    };

    /**
     * Establishes the current verbosity level of the logging system
     * @param {string} level - One of the valid strings in {@link Utils.LOG_LEVELS}
     */
    static setLogLevel(level) {
      const log = Utils.LOG_LEVELS.indexOf(level);
      if (log >= 0)
        Utils._LOG_LEVEL = log;
    }

    /**
     * Reports a new message to the logging system
     * @param {string} type - The type of message. Mus be `error`, `warn`, `info`, `debug` or `trace`.
     * @param {string} msg - The main message to be logged. Additional parameters can be added, like
     * in `console.log` (see: {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/log})
     */
    static log(type, msg) {
      const level = Utils.LOG_LEVELS.indexOf(type);
      const args = Array.prototype.slice.call(arguments);

      // Check if message should currently be logged
      if (level < 0 || level <= Utils.LOG_LEVEL) {
        if (Utils.LOG_OPTIONS.pipeTo)
          Utils.LOG_OPTIONS.pipeTo.apply(null, args);
        else {
          const mainMsg = `${Utils.LOG_OPTIONS.prefix || ''} ${Utils.LOG_PRINT_LABELS[level]} ${Utils.LOG_OPTIONS.timestamp ? Utils.getDateTime() : ''} ${msg}`;
          console[level === 1 ? 'error' : level === 2 ? 'warn' : 'log'].apply(console, [mainMsg].concat(args.slice(2)));
          // Call chained logger, if anny
          if (Utils.LOG_OPTIONS.chainTo)
            Utils.LOG_OPTIONS.chainTo.apply(null, args);
        }
      }
    }

    /**
     * Gets a boolean value from a textual expression
     * @param {string} val - The value to be parsed (`true` for true, null or otherwise for `false`)
     * @param {boolean=} [defaultValue=false] - The default value to return when `val` is false
     * @returns {number}
     */
    static getBoolean(val, defaultValue = false) {
      return val === 'true' ? true : val === 'false' ? false : defaultValue;
    }

    /**
     * Gets a value from an given expression that can be `null`, `undefined` or empty string ('')
     * @param {?*} val - The expression to parse
     * @param {?*} [defaultValue=null] - The value to return when `val` is `null`, `''` or `undefined`
     * @returns {*}
     */
    static getVal(val, defaultValue = null) {
      return (val === '' || val === null || typeof val === 'undefined') ? defaultValue : val;
    }

    /**
     * Gets a number from a string or another number
     * @param {?*} val - The expression to parse
     * @param {number} [defaultValue=0] - The default value
     * @returns {number}
     */
    static getNumber(val, defaultValue) {
      return Number(Utils.getVal(val, defaultValue));
    }

    /**
     * Gets the plain percent expression (without decimals) of the given value
     * @param {number} val - The value to be expressed as a percentile
     * @returns {string}
     */
    static getPercent(val) {
      return `${Math.round(val * 100)}%`;
    }

    /**
     * Returns a given time in [00h 00'00"] format
     * @param {number} millis - Amount of milliseconds to be processed
     * @returns {string}
     */
    static getHMStime(millis) {
      const d = new Date(millis);
      const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds();
      return `${h ? h + 'h ' : ''}${h || m ? _zp(m) + '\'' : ''}${_zp(s)}"`;
    }

    /**
     * Returns a formatted string with the provided date and time
     * @param {Date} date - The date to be formatted. When `null` or `undefined`, the current date will be used.
     * @returns {string}
     */
    static getDateTime(date = new Date()) {
      return `${date.getFullYear()}/${_zp(date.getMonth() + 1)}/${_zp(date.getDate())} ${_zp(date.getHours())}:${_zp(date.getMinutes())}:${_zp(date.getSeconds())}`;
    }

    /** @const {number} */
    static get FALSE() { return 0 }

    /** @const {number} */
    static get TRUE() { return 1 }

    /** @const {number} */
    static get DEFAULT() { return 2 }

    /**
     * Gets a numeric value (0, 1 or 2) from a set of possible values: `false`, `true` and `default`.
     * @param {?string} val - The text to be parsed
     * @param {?any} def - An optional default value
     * @returns {number}
     */
    static getTriState(val, def = Utils.DEFAULT) {
      return val === 'true' ? Utils.TRUE : val === 'false' ? Utils.FALSE : def;
    }

    /**
     * Returns a string with the given `tag` repeated n times
     * @param {string} tag - The tag to be repeated
     * @param {number} repeats - The number of times to repeat the tag
     * @returns {string}
     */
    static fillString(tag, repeats = 0) {
      return Array(repeats).fill(tag).join('');
    }

    /**
     * Checks if two expressions are equivalent.
     * Returns `true` when both parameters are `null` or `undefined`, and also when both have
     * equivalent values.
     * @param {!*} a
     * @param {!*} b
     * @returns {boolean}
     */
    static isEquivalent(a, b) {
      return (typeof a === 'undefined' || a === null) && (typeof b === 'undefined' || b === null) || a === b;
    }

    /**
     * Reads paragraphs, identified by `<p></p>` elements, inside XML data
     * @param {object} xml - The DOM-XML element to be parsed
     * @returns {string}
     */
    static getXmlText(xml) {
      let text = '';
      xml.querySelectorAll('p').forEach(p => text += `<p>${p.textContent}</p>`);
      return text;
    }

    /**
     * Parses the provided XML element node, returning a complex object
     * @param {object} xml - The root XML element to parse
     * @returns {object}
     */
    static parseXmlNode(xml) {
      // Initialize the resulting object
      const result = {};
      // Direct copy of root element attributes as object properties
      if (xml.attributes)
        Utils.attrForEach(xml.attributes, (name, value) => result[name] = /^-?\d*$/.test(value) ? Number(value) : value);
      // Process children elements
      const keys = [];
      const children = xml.children || xml.childNodes;
      for (let n = 0; n < children.length; n++) {
        const child = children[n];
        // Recursive processing of children
        const ch = Utils.parseXmlNode(child);
        // Store the result into a temporary object named as the child node name,
        if (!result[child.nodeName]) {
          // Create object and save key for later processing
          result[child.nodeName] = {};
          keys.push(child.nodeName);
        }
        // Use 'id' (or an incremental number if 'id' is not set) as a key
        if (ch.id)
          result[child.nodeName][ch.id] = ch;
        else {
          const n = Object.keys(result[child.nodeName]).length;
          result[child.nodeName][n] = ch;
        }
      }
      // Check temporary objects, converting it to an array, a single object or a complex object
      keys.forEach(k => {
        // Retrieve temporary object from `keys`
        const kx = Object.keys(result[k]);
        // If all keys are numbers, convert object into an array (or leave it as a single object)
        if (!kx.find(kk => isNaN(kk))) {
          if (kx.length === 1)
            // Array with a single element. Leave it as a simple object:
            result[k] = result[k][0];
          else {
            // Object with numeric keys. Convert it to array:
            const arr = [];
            kx.forEach(kk => arr.push(result[k][kk]));
            result[k] = arr;
          }
        }
      });
      // Save text content, if any:
      if (children.length === 0 && xml.textContent)
        result.textContent = xml.textContent;
      return result;
    }

    /**
     * Creates a string suitable to be used in the 'style' attribute of HTML tags, filled with the
     * CSS attributes contained in the provided object.
     * @param {object} cssObj
     * @returns {string}
     */
    static cssToString(cssObj) {
      return Object.keys(cssObj).reduce((s, key) => `${s}${key}:${cssObj[key]};`, '');
    }

    /**
     * Converts java-like color codes (like '0xRRGGBB') to valid CSS values like '#RRGGBB' or 'rgba(r,g,b,a)'
     * @param {string=} color - A color, as codified in Java
     * @param {string=} defaultColor - The default color to be used
     * @returns {string}
     */
    static checkColor(color, defaultColor = Utils.settings.BoxBase.BACK_COLOR) {
      if (typeof color === 'undefined' || color === null)
        color = defaultColor;
      color = color.replace('0x', '#');
      // Check for Alpha value
      if (color.charAt(0) === '#' && color.length > 7) {
        const alpha = parseInt(color.substring(1, 3), 16) / 255.0;
        color = `rgba(${parseInt(color.substring(3, 5), 16)},${parseInt(color.substring(5, 7), 16)},${parseInt(color.substring(7, 9), 16)},${alpha})`;
      }
      return color;
    }

    /**
     * Checks if the provided color has an alpha value less than 1
     * @param {string} color - The color to be analyzed
     * @returns {boolean}
     */
    static colorHasTransparency(color) {
      if (Utils.startsWith(color, 'rgba(')) {
        var alpha = parseInt(color.substr(color.lastIndexOf(',')));
        return typeof alpha === 'number' && alpha < 1.0;
      }
      return false;
    }

    /**
     * Converts string values to number or boolean when needed
     * @param {Object} obj - A simple object to be processed
     */
    static normalizeObject(obj) {
      if (obj)
        Object.keys(obj).forEach(k => {
          let s, v = obj[k];
          if (typeof v === 'string' && (s = v.trim().toLowerCase()) !== '')
            obj[k] = s === 'true' ? true : s === 'false' ? false : isNaN(s) ? v : Number(s);
        });
    }

    /**
     * Check if the given char is a separator
     * @param {string} ch - A string with a single character
     * @returns {boolean}
     */
    static isSeparator(ch) {
      return ' .,;-|'.includes(ch);
    }

    /**
     * Rounds `v` to the nearest multiple of `n`
     * @param {number} v
     * @param {number} n - Cannot be zero!
     * @returns {number}
     */
    static roundTo(v, n) {
      return Math.round(v / n) * n;
    }

    /**
     * Compares the provided answer against multiple valid options. These valid options are
     * concatenated in a string, separated by pipe chars (`|`). The comparing can be case sensitive.
     * @param {string} answer - The text to check against to
     * @param {string} check - String containing one or multiple options, separated by `|`
     * @param {boolean} checkCase - When true, the comparing will be case-sensitive
     * @returns {boolean}
     */
    static compareMultipleOptions(answer, check, checkCase) {
      if (answer === null || answer.length === 0 || check === null || check.length === 0)
        return false;
      if (!checkCase)
        answer = answer.toUpperCase();
      answer = answer.trim();
      for (let token of check.split('|')) {
        if (answer === (checkCase ? token : token.toUpperCase()).trim())
          return true;
      }
      return false;
    }

    /**
     * Checks if the given string ends with the specified expression
     * @param {string} text - The string where to find the expression
     * @param {string} expr - The expression to search for.
     * @param {boolean=} trim - When `true`, the `text` string will be trimmed before check
     * @returns {boolean}
     */
    static endsWith(text = '', expr, trim) {
      return typeof text === 'string' && (trim ? text.trim() : text).endsWith(expr);
    }

    /**
     * Checks if the given string starts with the specified expression
     * @param {string} text - The string where to find the expression
     * @param {string} expr - The expression to search for.
     * @param {boolean=} trim - When `true`, the `text` string will be trimmed before check
     * @returns {boolean}
     */
    static startsWith(text = '', expr, trim) {
      return typeof text === 'string' && (trim ? text.trim() : text).indexOf(expr) === 0;
    }

    /**
     * Replaces all occurrences of the backslash character (`\`) by a regular slash (`/`)
     * This is useful to normalize bad path names present in some old JClic projects
     * @param {String} str - The string to be normalized
     * @returns {string}
     */
    static nSlash(str) {
      return str ? str.replace(/\\/g, '/') : str;
    }

    /**
     * Checks if the given expression is an absolute URL
     * @param {string} exp - The expression to be checked
     * @returns {boolean}
     */
    static isURL(exp) {
      return /^(filesystem:)?(https?|file|data|ftps?):/i.test(exp);
    }

    /**
     * Gets the base path of the given file path (absolute or full URL). This base path always ends
     * with `/`, meaning it can be concatenated with relative paths without adding a separator.
     * @param {type} path - The full path to be parsed
     * @returns {string}
     */
    static getBasePath(path) {
      const p = path.lastIndexOf('/');
      return p >= 0 ? path.substring(0, p + 1) : '';
    }

    /**
     * Gets the full path of `file` relative to `basePath`
     * @param {string} file - The file name
     * @param {string=} path - The base path
     * @returns {string}
     */
    static getRelativePath(file, path) {
      return (!path || path === '' || file.indexOf(path) !== 0) ? file : file.substr(path.length);
    }

    /**
     * Gets the complete path of a relative or absolute URL, using the provided `basePath`
     * @param {string} basePath - The base URL
     * @param {string} path - The filename
     * @returns {string}
     */
    static getPath(basePath, path) {
      return Utils.isURL(path) ? path : basePath + path;
    }

    /**
     * Gets a promise with the complete path of a relative or absolute URL, using the provided `basePath`
     * @param {string} basePath - The base URL
     * @param {string} path - The filename
     * @param {?external:JSZip} zip - An optional {@link external:JSZip} object where to look
     * for the file
     * @returns {Promise}
     */
    static getPathPromise(basePath, path, zip) {
      if (zip) {
        const fName = Utils.getRelativePath(basePath + path, zip.zipBasePath);
        if (zip.files[fName]) {
          return new Promise((resolve, reject) => {
            zip.file(fName).async('base64').then(data => {
              const ext = path.toLowerCase().split('.').pop();
              const mime = Utils.settings.MIME_TYPES[ext] || 'application/octet-stream';
              resolve(`data:${mime};base64,${data}`);
            }).catch(reject);
          });
        }
      }
      return Promise.resolve(Utils.getPath(basePath, path));
    }

    /**
     * Utility object that provides several methods to build simple and complex DOM objects
     * @type {object}
     */
    static get HTML() {
      return class {

        static element(type, content = null, className = null, css = null, attributes = null) {
          let result = null;
          if (type)
            result = document.createElement(type);
          else {
            const container = document.createElement('div');
            container.innerHTML = content;
            content = null;
            result = container.firstChild;
          }
          if (result && className)
            result.className = className;
          if (result && content)
            result.innerHTML = content;
          if (result && css)
            Utils.HTML.css(result, css);
          if (result && attributes)
            Utils.HTML.attributes(result, attributes);
          return result;
        }

        static div(content = null, className = null, css = null, attributes = null) {
          return Utils.HTML.element('div', content, className, css, attributes);
        }

        static css(element, styles) {
          Object.keys(styles).forEach(k => element.style[k] = styles[k]);
          return element;
        }

        static attributes(element, attributes) {
          Object.keys(attributes).forEach(k => element.setAttribute(k, attributes[k]));
          return element;
        }

        static doubleCell(a, b) {
          return Utils.HTML.element('tr', `<td>${a}</td><td>${b}</td>`);
        }

        static p(txt) {
          return Utils.HTML.element('p', txt);
        }

        static td(txt, className) {
          return Utils.HTML.element('td', txt, className);
        }

        static th(txt, className) {
          return Utils.HTML.element('th', txt, className);
        }

        static append(element, ...children) {
          children.forEach(child => element.appendChild(child));
          return element;
        }

        static empty(element) {
          while (element.firstChild)
            element.removeChild(element.firstChild);
          return element;
        }
      };
    }

    /**
     * Checks if the current browser allows to put HTML elements in full screen mode
     * @returns {boolean}
     */
    static screenFullAllowed() {
      return screenfull && screenfull.enabled;
    }

    /**
     * Replaces `width`, `height` and `fill` attributes of a simple SVG image
     * with the provided values
     * @param {string} svg - The SVG image as XML string
     * @param {string=} width - Optional setting for "width" property
     * @param {string=} height - Optional setting for "height" property
     * @param {string=} fill - Optional setting for "fill" property
     * @returns {string} - The resulting svg code
     */
    static getSvg(svg, width, height, fill) {
      if (width)
        svg = svg.replace(/width=\"\d*\"/, `width="${width}"`);
      if (height)
        svg = svg.replace(/height=\"\d*\"/, `height="${height}"`);
      if (fill)
        svg = svg.replace(/fill=\"[#A-Za-z0-9]*\"/, `fill="${fill}"`);
      return svg;
    }

    /**
     * Encodes a svg expression into a {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/data_URIs|data URI}
     * suitable for the `src` property of `img` elements, optionally changing its original size and fill values.
     * @param {string} svg - The SVG image as XML string
     * @param {string=} width - Optional setting for "width" property
     * @param {string=} height - Optional setting for "height" property
     * @param {string=} fill - Optional setting for "fill" property
     * @returns {string} - The resulting Data URI
     */
    static svgToURI(svg, width, height, fill) {
      return 'data:image/svg+xml;base64,' + btoa(Utils.getSvg(svg, width, height, fill));
    }

    /**
     * Converts the given expression into a valid value for CSS size values
     * @param {string|number} exp - The expression to be evaluated (can be a valid value, `null` or `undefined`)
     * @param {Object} css - An optional Object where the resulting expression (if any) will be saved
     * @param {string} key - The key under which the result will be stored in `css`
     * @param {string} def - Default value to be used when `exp` is `null` or `undefined`
     * @returns {string} - A valid CSS value, or `null` if it can't be found. Default units are `px`
     */
    static toCssSize(exp, css, key, def) {
      const result = typeof exp === 'undefined' || exp === null ? null : isNaN(exp) ? exp : `${exp}px`;
      if (css && key && (result || def))
        css[key] = result !== null ? result : def;
      return result;
    }

    /**
     * Gets a clip of the give image data, in a URL base64 encoded format
     * @param {object} img - The binary data of the realized image, usually obtained from a {@link MediaBagElement}
     * @param {AWT.Rectangle} rect - A rectangle containing the requested clip
     * @returns {string} - The URL with the image clip, as a PNG file encoded in base64
     */
    static getImgClipUrl(img, rect) {
      const canvas = document.createElement('canvas');
      canvas.width = rect.dim.width;
      canvas.height = rect.dim.height;
      const ctx = canvas.getContext('2d');
      let result = '';
      try {
        ctx.drawImage(img, rect.pos.x, rect.pos.y, rect.dim.width, rect.dim.height, 0, 0, rect.dim.width, rect.dim.height);
        result = canvas.toDataURL();
      } catch (err) {
        // catch 'tainted canvases may not be exported' and other errors
        Utils.log('error', err);
      }
      return result;
    }

    /**
     * Finds the nearest `head` or root node of a given HTMLElement, useful to place `<style/>` elements when
     * the main component of JClic is behind a shadow-root.
     * This method will be replaced by a call to [Node.getRootNode()](https://developer.mozilla.org/en-US/docs/Web/API/Node/getRootNode)
     * when fully supported by all major browsers.
     * @param {Node=} el - The element from which to start the search
     * @returns {Node}
     */
    static getRootHead(el) {
      if (el) {
        // Skip HTMLElements
        while (el.parentElement)
          el = el.parentElement;
        // Get the parent node of the last HTMLElement
        if (el instanceof HTMLElement)
          el = el.parentNode || el;
        // If the root node has a `head`, take it
        el = el['head'] || el;
      }
      return el || document.head;
    }

    /**
     * Appends a stylesheet element to the `head` or root node nearest to the given `HTMLElement`.
     * @param {String} css - The content of the stylesheet
     * @param {PlayStation=} ps - An optional `PlayStation` (currently a {@link JClicPlayer}) used as a base to find the root node
     * @returns {HTMLStyleElement} - The appended style element
     */
    static appendStyleAtHead(css, ps) {
      const root = Utils.getRootHead(ps && ps.topDiv ? ps.topDiv : null);
      const style = document.createElement('style');
      style.type = 'text/css';
      style.appendChild(document.createTextNode(css));
      return root.appendChild(style);
    }

    /**
     * Traverses all the attributes defined in an Element, calling a function with its name and value as a parameters
     * @param {external:NamedNodeMap} attributes - The [Element.attributes](https://developer.mozilla.org/en-US/docs/Web/API/Element/attributes)
     * object to be traversed
     * @param {function} callback - The function to be called for each [Attr](https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap)
     * object. It should take two parametres: `name` and `value`
     */
    static attrForEach(attributes, callback) {
      for (let i = 0; i < attributes.length; i++)
        callback(attributes[i].name, attributes[i].value);
    }

    /**
     * Global constants
     * @const
     */
    static get settings() {
      return {
        // layout constants
        AB: 0, BA: 1, AUB: 2, BUA: 3,
        LAYOUT_NAMES: ['AB', 'BA', 'AUB', 'BUA'],
        DEFAULT_WIDTH: 400,
        DEFAULT_HEIGHT: 300,
        MINIMUM_WIDTH: 40,
        MINIMUM_HEIGHT: 40,
        DEFAULT_NAME: '---',
        DEFAULT_MARGIN: 8,
        DEFAULT_SHUFFLES: 31,
        DEFAULT_GRID_ELEMENT_SIZE: 20,
        MIN_CELL_SIZE: 10,
        //DEFAULT_BG_COLOR: '#D3D3D3', // LightGray
        DEFAULT_BG_COLOR: '#C0C0C0', // LightGray
        ACTIONS: {
          ACTION_MATCH: 'MATCH', ACTION_PLACE: 'PLACE',
          ACTION_WRITE: 'WRITE', ACTION_SELECT: 'SELECT', ACTION_HELP: 'HELP'
        },
        PREVIOUS: 0, MAIN: 1, END: 2, END_ERROR: 3, NUM_MSG: 4,
        MSG_TYPE: ['previous', 'initial', 'final', 'finalError'],
        RANDOM_CHARS: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        NUM_COUNTERS: 3,
        MAX_RECORD_LENGTH: 20,
        // BoxBase defaults
        BoxBase: {
          REDUCE_FONT_STEP: 1.0,
          MIN_FONT_SIZE: 8,
          STROKE: 1,
          AC_MARGIN: 6,
          //BACK_COLOR: 'lightgray',
          BACK_COLOR: '#C0C0C0',
          TEXT_COLOR: 'black',
          SHADOW_COLOR: 'gray',
          INACTIVE_COLOR: 'gray',
          ALTERNATIVE_COLOR: 'gray',
          BORDER_COLOR: 'black',
          BORDER_STROKE_WIDTH: 0.75,
          MARKER_STROKE_WIDTH: 2.75
        },
        FILE_TYPES: {
          image: 'gif,jpg,png,jpeg,bmp,ico,svg',
          audio: 'wav,mp3,ogg,oga,au,aiff,flac',
          video: 'avi,mov,mpeg,mp4,ogv,m4v,webm',
          font: 'ttf,otf,eot,woff,woff2',
          midi: 'mid,midi',
          anim: 'swf',
          // Used in custom skins
          xml: 'xml'
        },
        MIME_TYPES: {
          xml: 'text/xml',
          gif: 'image/gif',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          bmp: 'image/bmp',
          svg: 'image/svg+xml',
          ico: 'image/x-icon',
          wav: 'audio/wav',
          mp3: 'audio/mpeg',
          mp4: 'video/mp4',
          m4v: 'video/mp4',
          ogg: 'audio/ogg',
          oga: 'audio/ogg',
          ogv: 'video/ogg',
          webm: 'video/webm',
          au: 'audio/basic',
          aiff: 'audio/x-aiff',
          flac: 'audio/flac',
          avi: 'video/avi',
          mov: 'video/quicktime',
          mpeg: 'video/mpeg',
          ttf: 'application/font-sfnt',
          otf: 'application/font-sfnt',
          eot: ' application/vnd.ms-fontobject',
          woff: 'application/font-woff',
          woff2: 'application/font-woff2',
          swf: 'application/x-shockwave-flash'
        },
        // Global settings susceptible to be modified
        COMPRESS_IMAGES: true,
        // Keyboard key codes
        VK: {
          LEFT: 37,
          UP: 38,
          RIGHT: 39,
          DOWN: 40
        },
        // Flag to indicate that we are running on a touch device
        TOUCH_DEVICE: false,
        // Amount of time (in milliseconds) to wait before a media resource is loaded
        LOAD_TIMEOUT: 10000,
        // Number of points to be calculated as polygon vertexs when simplifying bezier curves
        BEZIER_POINTS: 4,
        // Check if canvas accessibility features are enabled
        // See: http://codepen.io/francesc/pen/amwvRp
        CANVAS_HITREGIONS: typeof CanvasRenderingContext2D !== 'undefined' && typeof CanvasRenderingContext2D.prototype.addHitRegion === 'function',
        CANVAS_HITREGIONS_FOCUS: typeof CanvasRenderingContext2D !== 'undefined' && typeof CanvasRenderingContext2D.prototype.drawFocusIfNeeded === 'function'
      };
    }

    //
    // Functions useful to deal with caret position in `contentEditable` DOM elements
    //
    /**
     * Gets the caret position within the given element. Thanks to
     * {@link http://stackoverflow.com/users/96100/tim-down|Tim Down} answers in:
     * {@link http://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container}
     * and {@link http://stackoverflow.com/questions/6240139/highlight-text-range-using-javascript/6242538}
     * @param {object} element - A DOM element
     * @returns {number}
     */
    static getCaretCharacterOffsetWithin(element) {
      let caretOffset = 0;
      const doc = element.ownerDocument || element.document;
      const win = doc.defaultView || doc.parentWindow;
      let sel;
      if (typeof win.getSelection !== "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
          const range = win.getSelection().getRangeAt(0);
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(element);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          caretOffset = preCaretRange.toString().length;
        }
      } else if ((sel = doc.selection) && sel.type !== "Control") {
        const textRange = sel.createRange();
        const preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
      }
      return caretOffset;
    }

    /**
     * Utility function called by {@link Utils~getCaretCharacterOffsetWithin}
     * @param {object} tnode - A text node
     * @returns {object[]}
     */
    static getTextNodesIn(tnode) {
      const textNodes = [];
      if (tnode.nodeType === 3) {
        textNodes.push(tnode);
      } else {
        const children = tnode.childNodes;
        for (let i = 0, len = children.length; i < len; ++i) {
          textNodes.push.apply(textNodes, Utils.getTextNodesIn(children[i]));
        }
      }
      return textNodes;
    }

    /**
     * Sets the selection range (or the cursor position, when `start` and `end` are the same) to a
     * specific position inside a DOM element.
     * @param {object} el - The DOM element where to set the cursor
     * @param {number} start - The start position of the selection (or cursor position)
     * @param {type} end - The end position of the selection. When null or identical to `start`,
     * indicates a cursor position.
     */
    static setSelectionRange(el, start, end) {
      // Check for `null` or `undefined`
      if (end == null)
        end = start;
      if (document.createRange && window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const textNodes = Utils.getTextNodesIn(el);
        let foundStart = false;
        let charCount = 0, endCharCount, textNode;

        for (let i = 0; i < textNodes.length; i++) {
          textNode = textNodes[i];
          endCharCount = charCount + textNode.length;
          if (!foundStart && start >= charCount &&
            (start < endCharCount ||
              start === endCharCount && i + 1 <= textNodes.length)) {
            range.setStart(textNode, start - charCount);
            foundStart = true;
          }
          if (foundStart && end <= endCharCount) {
            range.setEnd(textNode, end - charCount);
            break;
          }
          charCount = endCharCount;
        }
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (document.selection && document.body.createTextRange) {
        const textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(true);
        textRange.moveEnd('character', end);
        textRange.moveStart('character', start);
        textRange.select();
      }
    }
  }

  // Set default values:
  Utils._LOG_LEVEL = 2; // warn

  Utils._LOG_OPTIONS = {
    prefix: 'JClic',
    timestamp: true,
    popupOnErrors: false,
    chainTo: null,
    pipeTo: null,
  };

  return Utils;
});
