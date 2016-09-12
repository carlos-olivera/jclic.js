/**
 *  File    : shapers/JigSaw.js
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
 *  (c) 2000-2016 Ministry of Education of Catalonia (http://xtec.cat)
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

define([
  "jquery",
  "./Shaper",
  "../AWT"
], function ($, Shaper, AWT) {

  /**
   *
   * This {@link Shaper} returns a set of rectangular shapes with teeth and slots that fit between them.
   * @exports JigSaw
   * @class
   * @extends Shaper
   * @param {number} nx - Number of columns
   * @param {number} ny - Number of rows
   */
  var JigSaw = function (nx, ny) {
    Shaper.call(this, nx, ny);
  };

  JigSaw.prototype = {
    constructor: JigSaw,
    /**
     * Overrides same flag in {@link Shaper#rectangularShapes}
     * @type {boolean} */
    rectangularShapes: false,
    /**
     *
     * Builds the jigsaw shapes based on the number of rows and columns
     */
    buildShapes: function () {
      // Create two two-dimension arrays for storing the type of horizontal and vertical lines
      var hLineType = [];
      var vLineType = [];
      for (var i = 0; i <= this.nRows; i++) {
        hLineType[i] = [];
        vLineType[i] = [];
      }

      for (var row = 0; row < this.nRows; row++) {
        for (var col = 0; col < this.nCols; col++) {
          if (row === 0) {
            hLineType[row][col] = 0;
          } else {
            hLineType[row][col] = 1 + (this.randomLines ? Math.round(Math.random() * 9) : row + col) % 2;
          }
          if (col === 0) {
            vLineType[row][col] = 0;
          } else {
            vLineType[row][col] = 1 + (this.randomLines ? Math.round(Math.random() * 9) : col + row + 1) % 2;
          }
          if (col === this.nCols - 1)
            vLineType[row][col + 1] = 0;
          if (row === this.nRows - 1)
            hLineType[row + 1][col] = 0;
        }
      }

      var w = 1 / this.nCols;
      var h = 1 / this.nRows;

      for (var r = 0; r < this.nRows; r++) {
        for (var c = 0; c < this.nCols; c++) {
          var x = w * c;
          var y = h * r;
          var sd = new AWT.Path([new AWT.PathStroke('M', [x, y])]);
          this.hLine(sd, hLineType[r][c], x + 0, y + 0, w, h, false);
          this.vLine(sd, vLineType[r][c + 1], x + w, y + 0, w, h, false);
          this.hLine(sd, hLineType[r + 1][c], x + w, y + h, w, h, true);
          this.vLine(sd, vLineType[r][c], x + 0, y + h, w, h, true);
          sd.addStroke(new AWT.PathStroke('X'));
          sd.calcEnclosingRect();
          // Save the Path in `shapeData`
          this.shapeData[r * this.nCols + c] = sd;
        }
      }
      this.initiated = true;
    },
    /**
     *
     * Adds an horizontal line to the provided path
     * @param {AWT.Path} sd - The Path to which the line will be added
     * @param {number} type - Type  of tooth: 0 is flat (no tooth), 1 means tooth up, and 2 means tooth down
     * @param {number} x - X coordinate of the starting point
     * @param {number} y - Y coordinate of the starting point
     * @param {number} w - Width of the piece
     * @param {number} h - Height of the piece
     * @param {boolean} inv - The line must be drawn right to left
     */
    hLine: function (sd, type, x, y, w, h, inv) {
      var kx = inv ? -1 : 1;
      var ky = type === 1 ? 1 : -1;

      if (type === 0) {
        // Flat line
        sd.addStroke(new AWT.PathStroke('L', [x + w * kx, y]));
      } else {
        var x0 = x + (w - w * this.baseWidthFactor) / 2 * kx;
        var wb = w * this.baseWidthFactor * kx;
        // Approximation to the tooth:
        sd.addStroke(new AWT.PathStroke('L', [x0, y]));
        // This is the tooth:
        var hb = h * this.toothHeightFactor * ky;
        sd.addStroke(new AWT.PathStroke('L', [x0, y + hb]));
        sd.addStroke(new AWT.PathStroke('L', [x0 + wb, y + hb]));
        sd.addStroke(new AWT.PathStroke('L', [x0 + wb, y]));
        // Draw the remaining line
        sd.addStroke(new AWT.PathStroke('L', [x + w * kx, y]));
      }
    },
    /**
     *
     * Adds a vertical line to the provided path
     * @param {AWT.Path} sd - The Path to which the line will be added
     * @param {number} type - Type  of tooth: 0 is flat (no tooth), 1 means tooth right, and 2 means tooth left
     * @param {number} x - X coordinate of the starting point
     * @param {number} y - Y coordinate of the starting point
     * @param {number} w - Width of the piece
     * @param {number} h - Height of the piece
     * @param {boolean} inv - The line must be drawn bottom to top
     */
    vLine: function (sd, type, x, y, w, h, inv) {
      var ky = inv ? -1 : 1;
      var kx = type === 1 ? 1 : -1;

      if (type === 0) {
        // Flat line
        sd.addStroke(new AWT.PathStroke('L', [x, y + h * ky]));
      } else {
        var y0 = y + (h - h * this.baseWidthFactor) / 2 * ky;
        var hb = h * this.baseWidthFactor * ky;
        // Approximation to the tooth:
        sd.addStroke(new AWT.PathStroke('L', [x, y0]));
        // This is the tooth:
        var wb = w * this.toothHeightFactor * kx;
        sd.addStroke(new AWT.PathStroke('L', [x + wb, y0]));
        sd.addStroke(new AWT.PathStroke('L', [x + wb, y0 + hb]));
        sd.addStroke(new AWT.PathStroke('L', [x, y0 + hb]));
        // Draw the remaining line
        sd.addStroke(new AWT.PathStroke('L', [x, y + h * ky]));
      }
    }
  };

  // JigSaw extends Shaper
  JigSaw.prototype = $.extend(Object.create(Shaper.prototype), JigSaw.prototype);

  // Register this class in the list of known shapers
  Shaper.CLASSES['@JigSaw'] = JigSaw;

  return JigSaw;

});
