/**
 *  File    : bags/JumpInfo.js
 *  Created : 05/04/2015
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
 *  (c) 2000-2016 Catalan Educational Telematic Network (XTEC)
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

define(["../Utils"], function (Utils) {

  /**
   * This class contains information about what things JClic sequence manager has to do in certain
   * circumstances, such as:
   * - an activity finishes
   * - the user clicks on the "next" or "prev" buttons
   * - the user clicks or a cell with special "active content"
   *
   * Different kinds of actions are possible for each of these events:
   * - RETURN: to go back to a previous point in the sequence.
   * - EXIT: to exit the program (thus navigating to another URL)
   * - STOP: to do nothing.
   * - JUMP: to jump to a specific point in the sequence of activities, or to another JClic project.
   * @exports JumpInfo
   * @class
   * @see {@link ActivitySequenceJump}
   * @see {@link ConditionalJumpInfo}
   */
  class JumpInfo {
    /**
     * JumpInfo constructor
     * @param {string} action - Must be one of the described actions.
     * @param {(number|string)=} sq - Can be the tag of the sequence element to jump to, or its
     * cardinal number in the list.
     */
    constructor(action, sq) {
      this.action = action
      switch (typeof sq) {
        case 'string':
          this.sequence = sq
          break
        case 'number':
          this.actNum = sq
          break
      }
    }

    /**
     * Loads the object settings from a specific JQuery XML element
     * @param {external:jQuery} $xml - The XML element to parse
     */
    setProperties($xml) {
      this.id = $xml.attr('id')
      this.action = $xml.attr('action') || 'JUMP'
      this.sequence = Utils.nSlash($xml.attr('tag'))
      this.projectPath = Utils.nSlash($xml.attr('project'))
      return this
    }
  }

  Object.assign(JumpInfo.prototype, {
    /**
     * The JumpInfo identifier
     * - For regular jumps: 'forward', 'back'
     * - For conditional jumps: 'upper', 'lower'
     * @name JumpInfo#id
     * @type {string} */
    id: null,
    /**
     * The current action.
     * Possible values are: `JUMP`, `STOP`, `RETURN` and `EXIT`.
     * @name JumpInfo#action
     * @type {string} */
    action: undefined,
    /**
     * Activity number in the sequence list
     * @name JumpInfo#actNum
     * @type {number} */
    actNum: -1,
    /**
     * Current sequence tag
     * @name JumpInfo#sequence
     * @type {string} */
    sequence: undefined,
    /**
     * Path of another JClic project to jump to
     * @name JumpInfo#projectPath
     * @type {string} */
    projectPath: undefined,
  })

  return JumpInfo
})
