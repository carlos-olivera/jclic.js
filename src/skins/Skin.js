/**
 *  File    : skins/Skin.js
 *  Created : 29/04/2015
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
  "../Utils",
  "../AWT"
], function (screenfull, clipboard, Utils, AWT) {

  // In some cases, require.js does not return a valid value for screenfull. Check it:
  if (!screenfull)
    screenfull = window.screenfull;

  // Shorthand expression for Utils.HTML
  const html = Utils.HTML;

  /**
   * This abstract class manages the layout, position ans size of the visual components of JClic:
   * player window, message box, counters, buttons, status... and also the appearance of the main
   * container.
   * The basic implementation of Skin is {@link DefaultSkin}.
   * @exports Skin
   * @class
   * @abstract
   * @extends AWT.Container
   */
  class Skin extends AWT.Container {
    /**
     * Skin constructor
     * @param {PlayStation} ps - The `PlayStation` (currently a {@link JClicPlayer}) used to load and
     * realize the media objects needed tot build the Skin.
     * @param {string=} name - The skin name
     * @param {object=} options - Optional parameter with additional options
     */
    constructor(ps, name = null, options = {}) {

      // Skin extends [AWT.Container](AWT.html)
      super();

      // Save parameters for later use
      this.ps = ps;
      if (name !== null)
        this.name = name;
      this.options = options;

      if (this.options.skinId)
        this.skinId = this.options.skinId;

      if (!Skin.registerStyleSheet(this.skinId, ps)) {
        let css = this._getStyleSheets('default');
        let twoThirds = this._getStyleSheets('twoThirds');
        if (twoThirds.length > 0)
          css += ` @media (max-width:${this.twoThirdsMedia.width}px),(max-height:${this.twoThirdsMedia.height}px){${twoThirds}}`;
        let half = this._getStyleSheets('half');
        if (half.length > 0)
          css += ` @media (max-width:${this.halfMedia.width}px),(max-height:${this.halfMedia.height}px){${half}}`;
        Utils.appendStyleAtHead(css.replace(/\.ID/g, `.${this.skinId}`), ps);
      }

      let msg = '';

      this.div = html.div(null, this.skinId);
      this.playerCnt = html.div(null, 'JClicPlayerCnt');

      // Add waiting panel and progress bar
      this.progress = html.element('progress', null, 'progressBar', { display: 'none' });
      this.waitPanel = html.append(html.div(null, null, { display: 'none', 'background-color': 'rgba(255, 255, 255, .60)', 'z-index': 99 }),
        html.append(html.div(null, 'waitPanel', { display: 'flex', 'flex-direction': 'column' }),
          html.div(`${this.waitImgBig}${this.waitImgSmall}`, 'animImgBox'),
          this.progress
        )
      );

      html.append(this.playerCnt, this.waitPanel);

      this.buttons = Object.assign({}, Skin.prototype.buttons);
      this.counters = Object.assign({}, Skin.prototype.counters);
      this.msgArea = Object.assign({}, Skin.prototype.msgArea);

      // Create dialog overlay and panel
      this.dlgOverlay = html.div(null, 'dlgOverlay', {
        'z-index': 98,
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        display: 'none',
        'background-color': 'rgba(30,30,30,0.7)'
      });
      this.dlgOverlay.addEventListener('click', ev => {
        if (!this._isModalDlg)
          // Non-modal dialogs are closed on click outside the main area
          this._closeDlg(true);
        ev.stopPropagation();
      });

      const dlgDiv = html.div(null, 'dlgDiv',
        {
          display: 'inline-block',
          position: 'relative',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }, {
          role: 'dialog',
          'aria-labelledby': ps.getUniqueId('ReportsLb'),
          'aria-describedby': ps.getUniqueId('ReportsCnt'),
        });

      dlgDiv.addEventListener('click', ev => {
        // Clicks not passed to parent
        ev.stopPropagation();
      });

      this.dlgMainPanel = html.div(null, 'dlgMainPanel', null, { id: ps.getUniqueId('ReportsCnt') });
      this.dlgBottomPanel = html.div(null, 'dlgBottomPanel', { role: 'navigation' });

      // Basic dialog structure:
      html.append(this.div,
        this.playerCnt,
        html.append(this.dlgOverlay,
          html.append(dlgDiv,
            this.dlgMainPanel,
            this.dlgBottomPanel
          )
        )
      );

      msg = ps.getMsg('JClic logo');

      const logo = html.element(null, this.appLogo, null, { width: '1.5em', height: '1.5em', 'vertical-align': 'bottom' }, { 'aria-label': msg });
      logo.addEventListener('dblclick', () => {
        // Double click on JClic logo is a hidden method to increase verbosity on Javascript console
        Utils.setLogLevel('all');
        Utils.log('trace', 'Log level set to "trace"');
      });

      this.infoHead = html.append(html.div(null, 'infoHead'),
        html.append(html.div(null, 'headTitle unselectableText'),
          logo,
          html.element('span', 'JClic.js')
        ),
        html.append(html.element('p', null, null, { 'margin-top': 0, 'margin-left': '3.5em' }),
          html.element('a', 'http://clic.xtec.cat', null, null, { href: 'http://clic.xtec.cat/repo/index.html?page=info' }),
          html.element('br'),
          html.element('span', `${ps.getMsg('Version')} ${this.ps.JClicVersion}`)
        )
      );

      this.reportsPanel = html.div(null, 'reportsPanel', null, { role: 'document' });

      msg = ps.getMsg('Copy data to clipboard');
      this.copyBtn = html.append(html.element('button', null, null, null, { title: msg, 'aria-label': msg }),
        html.element(null, this.copyIcon, null, { width: '26px', height: '26px' })
      );
      this.copyBtn.addEventListener('click', () => {
        clipboard.copy({
          'text/plain': `===> ${ps.getMsg('The data has been copied in HTML format. Please paste them into a spreadsheet or in a rich text editor')} <===`,
          'text/html': this.reportsPanel.innerHTML,
        });
        // TODO: Show "The data has been copied to clipboard" popup with fadein, fadeout and remove
      });

      msg = ps.getMsg('Close');
      this.closeDlgBtn = html.append(html.element('button', null, null, null, { title: msg, 'aria-label': msg }),
        html.element(null, this.closeDialogIcon, null, { width: '26px', height: '26px' })
      );
      this.closeDlgBtn.addEventListener('click', () => this._closeDlg(true));

      msg = ps.getMsg('OK');
      this.okDlgBtn = html.append(html.element('button', null, null, null, { title: msg, 'aria-label': msg }),
        html.element(null, this.okDialogIcon, null, { width: '26px', height: '26px' })
      );
      this.okDlgBtn.addEventListener('click', () => this._closeDlg(true));

      msg = ps.getMsg('Cancel');
      this.cancelDlgBtn = html.append(html.element('button', null, null, null, { title: msg, 'aria-label': msg }),
        html.element(null, this.closeDialogIcon, null, { width: '26px', height: '26px' })
      );
      this.cancelDlgBtn.addEventListener('click', () => this._closeDlg(false));

      // Registers this Skin in the list of realized Skin objects
      Skin.skinStack.push(this);
    }

    /**
     * Checks if the provided stylesheet ID is already registered in the root node where the current player is placed
     * @param {String} skinId - The unique identifier of the skin to check
     * @param {PlayStation=} ps - An optional `PlayStation` (currently a {@link JClicPlayer}) used as a base to find the root node
     * @returns {Boolean} - _true_ when the skin stylesheet is already defined in the current root node, _false_ otherwise
     */
    static registerStyleSheet(skinId, ps) {
      let result = false;
      const root = Utils.getRootHead(ps);
      if (!root['__JClicID'])
        root.__JClicID = `SK${Skin.lastId++}`;

      let styles = Skin.rootStyles[root.__JClicID];
      if (!styles) {
        styles = [];
        Skin.rootStyles[root.__JClicID] = styles;
      }

      if (styles.indexOf(skinId) < 0) {
        Utils.log('trace', `Stylesheet "${skinId}" has been registered for root node labeled as "${root.__JClicID}"`);
        styles.push(skinId);
      } else
        result = true;

      return result;
    }

    /**
     * Gets the specified Skin from `skinStack`, or creates a new one if not found.
     * This function should be used only through `Skin.getSkin`
     * @param {string} skinName - The name of the searched skin
     * @param {PlayStation} ps - The PlayStation (usually a {@link JClicPlayer}) used to build the new skin.
     * @param {object=} options - Optional parameter with additional options
     * @returns {Skin}
     */
    static getSkin(skinName = 'default', ps, options = {}) {
      skinName = skinName || 'default';

      // Correct old skin names
      if (skinName.charAt(0, 1) === '@' && skinName.substr(-4) === '.xml')
        skinName = skinName.substr(1, skinName.length - 5);

      // look for the skin in the stack of realized skins
      if (skinName && ps) {
        // TODO: Check also `options`!
        const sk = Skin.skinStack.find(s => s.name === skinName && s.ps === ps);
        if (sk)
          return sk;
      }

      // Locates the class of the requested Skin (or [DefaultSkin](DefaultSkin.html)
      // if not specified). When not found, a new one is created and registered in `skinStack`
      let cl = Skin.CLASSES[skinName];
      if (!cl) {
        // Process custom skin XML files
        const mbe = ps.project.mediaBag.getElement(skinName, false);
        if (mbe && mbe.data) {
          options = Object.assign({}, options, mbe.data);
          options.skinId = `JClic-${skinName.replace('.xml', '')}`;
        }

        if (!ps.zip
          && options.class === 'edu.xtec.jclic.skins.BasicSkin'
          && options.image
          && ps.project.mediaBag.getElement(options.image, false)
          && ps.project.mediaBag.getElement(options.image, false).data)
          cl = Skin.CLASSES.custom;
        else {
          Utils.log('warn', `Unknown skin class: ${skinName}`);
          cl = Skin.CLASSES.default;
        }
      }

      // Build and return the requested skin
      return new cl(ps, skinName, options);
    }

    /**
     * Returns the CSS styles used by this skin. This method should be called only from
     * the `Skin` constructor, and overridded by subclasses if needed.
     * @param {string} media - A specific media size. Possible values are: 'default', 'half' and 'twoThirds'
     * @returns {string}
     */
    _getStyleSheets(media = 'default') {
      return media === 'default' ? (this.basicCSS + this.waitAnimCSS + this.reportsCSS) : '';
    }

    /**
     * Attaches a {@link JClicPlayer} object to this Skin
     * @param {JClicPlayer} player
     */
    attach(player) {
      this.detach();
      if (player !== null && player.skin !== null)
        player.skin.detach();
      this.player = player;
      this.playerCnt.insertBefore(player.$div[0], this.playerCnt.firstChild)
      //this.playerCnt.appendChild(player.$div[0]);
      //this.$playerCnt.prepend(player.$div);
      this.setSkinSizes();
      player.$mainContainer.append(this.div);
    }

    /**
     * Sets the 'size' CSS values (max, min and compulsory) to the main `div` of this skin
     * @param {boolean} full - `true` when the skin is in full screen mode
     */
    setSkinSizes(full) {
      const
        css = {},
        topHeight = this.player.topDiv.clientHeight,
        nilValue = this.player.fullScreenChecked ? 'inherit' : null;

      // When `full` no set, detect the current status with screenfull
      if (typeof full === 'undefined')
        full = screenfull && screenfull.enabled && screenfull.isFullscreen;

      Utils.toCssSize(full ? '100vw' : this.ps.options.minWidth, css, 'min-width', nilValue);
      Utils.toCssSize(full ? '100vh' : this.ps.options.minHeight, css, 'min-height', nilValue);
      Utils.toCssSize(full ? '100vw' : this.ps.options.maxWidth, css, 'max-width', nilValue);
      Utils.toCssSize(full ? '100vh' : this.ps.options.maxHeight, css, 'max-height', nilValue);
      Utils.toCssSize(full ? '100vw' : this.ps.options.width, css, 'width', '100%');
      Utils.toCssSize(full ? '100vh' : this.ps.options.height, css, 'height', topHeight > 0 ? '100%' : '100vh');
      html.css(this.div, css);
    }

    /**
     * Detaches the `player` element from this Skin
     */
    detach() {
      if (this.player !== null) {
        this.player.$div.remove();
        //this.$div.detach();
        this.div.remove();
        this.player = null;
      }
    }

    /**
     * Updates the graphic contents of this skin.
     * This method should be called from {@link Skin#update}
     * @override
     * @param {AWT.Rectangle} dirtyRegion - Specifies the area to be updated. When `null`, it's the
     * whole panel.
     */
    updateContent(dirtyRegion) {
      if (this.msgBoxDivCanvas) {
        const ctx = this.msgBoxDivCanvas.getContext('2d');
        ctx.clearRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
        this.msgBox.update(ctx, dirtyRegion);
      }
      return super.updateContent();
    }

    /**
     * Resets all counters
     * @param {boolean} bEnabled - Leave it enabled/disabled
     */
    resetAllCounters(bEnabled) {
      Object.keys(this.counters).forEach(k => {
        const counter = this.counters[k];
        if (counter !== null) {
          counter.value = 0;
          counter.countDown = 0;
          counter.enabled = bEnabled;
          counter.refreshDisplay();
        }
      });
    }

    /**
     * Sets/unsets the 'wait' state
     * @param {boolean} status - Whether to set or unset the wait status. When `undefined`, the
     * `waitCursorCount` member is evaluated to decide if the wait state should be activated or deactivated.
     */
    setWaitCursor(status) {
      if (typeof status === 'undefined') {
        if (this.waitPanel)
          html.css(this.waitPanel, {
            display: this.waitCursorCount > 0 ? 'initial' : 'none'
          });
      } else {
        switch (status) {
          case true:
            this.waitCursorCount++;
            break;
          case false:
            if (--this.waitCursorCount < 0)
              this.waitCursorCount = 0;
            break;
          case 'reset':
            this.waitCursorCount = 0;
            break;
        }
        this.setWaitCursor();
      }
    }

    /**
     * Sets the current value of the progress bar
     * @param {number} val - The current value. Should be less or equal than `max`. When -1, the progress bar will be hidden.
     * @param {number=} max - Optional parameter representing the maximum value. When passed, the progress bar will be displayed.
     */
    setProgress(val, max) {
      if (this.progress) {
        this.currentProgress = val;
        if (val < 0)
          html.css(this.progress, { display: 'none' });
        else {
          if (max) {
            this.maxProgress = max;
            this.progress.setAttribute('max', max);
            this.progress.style.display = 'initial';
          }
          this.progress.setAttribute('value', val);
        }
        Utils.log('trace', `Progress: ${this.currentProgress}/${this.maxProgress}`);
      }
    }

    /**
     * Increments the progress bar value by the specified amount, only when the progress bar is running.
     * @param {number=} val - The amount to increment. When not defined, it's 1.
     */
    incProgress(val) {
      if (this.currentProgress >= 0)
        this.setProgress(this.currentProgress + (val || 1));
    }

    /**
     * Shows a window with clues or help for the current activity
     * @param {HTMLElement} _hlpComponent - A DOM element with the information to be shown.
     * It can contain a string or number. When `null`, the help window (if any) must be closed.
     */
    showHelp(_hlpComponent) {
      // TODO: Implement HelpWindow
    }

    /**
     * Shows a "dialog" panel, useful for displaying information or prompt something to users
     * @param {boolean} modal - When `true`, the dialog should be closed by any click outside the main panel
     * @param {object} options - This object should have two components: `main` and `bottom`, both
     * containing an HTML element (or array of elements) to be placed on the main and bottom panels
     * of the dialog.
     * @returns {Promise} - A Promise that will be fulfilled when the dialog is closed.
     */
    showDlg(modal, options) {
      return new Promise((resolve, reject) => {
        this._dlgOkValue = 'ok';
        this._dlgCancelValue = 'cancelled';
        this._isModalDlg = modal;

        html.empty(this.dlgMainPanel);
        html.empty(this.dlgBottomPanel);
        if (options.main)
          html.append(this.dlgMainPanel, ...options.main);
        if (options.bottom)
          html.append(this.dlgBottomPanel, ...options.bottom);

        this._closeDlg = resolved => {
          if (resolved && resolve)
            resolve(this._dlgOkValue);
          else if (!resolved && reject)
            reject(this._dlgCancelValue);
          this.dlgOverlay.style.display = 'none';
          this.enableMainButtons(true);
          this._closeDlg = Skin.prototype._closeDlg;
        };
        this.enableMainButtons(false);
        this.dlgOverlay.style.display = 'initial';
      });
    }

    /**
     * Enables or disables the `tabindex` attribute of the main buttons. Useful when a modal dialog
     * overlay is active, to avoid direct access to controls not related with the dialog.
     * @param {boolean} status - `true` to make main controls navigable, `false` otherwise
     */
    enableMainButtons(status) {
      this.playerCnt.querySelectorAll('button').forEach(btn => btn.setAttribute('tabindex', status ? '0' : '1'));
    }

    /**
     * Called when the dialog must be closed, usually only by Skin members.
     * This method is re-defined on each call to `showDlg`, so the `resolve` and `reject`
     * functions can be safely called.
     */
    _closeDlg() {
      // Do nothing
    }

    /**
     * Displays a dialog with a report of the current results achieved by the user.
     * @param {Reporter} reporter - The reporter system currently in use
     * @returns {Promise} - The Promise returned by {@link Skin.showDlg}.
     */
    showReports(reporter) {
      html.empty(this.reportsPanel);
      html.append(this.reportsPanel, ...this.printReport(reporter));
      return this.showDlg(false, {
        main: [this.infoHead, this.reportsPanel],
        bottom: [this.copyBtn, this.closeDlgBtn]
      });
    }

    /**
     * Formats the current report in a DOM tree, ready to be placed in `reportsPanel`
     * @param {Reporter} reporter - The reporter system currently in use
     * @returns {HTMLElement[]} - An array of elements containing the full report
     */
    printReport(reporter) {
      let result = [];
      if (reporter) {
        const report = reporter.getData();
        const started = new Date(report.started);

        result.push(html.div(this.ps.getMsg('Current results'), 'subTitle', null, { id: this.ps.getUniqueId('ReportsLb') }));
        const t = html.element('table', null, 'JCGlobalResults');
        html.append(t,
          html.doubleCell(
            this.ps.getMsg('Session started:'),
            `${started.toLocaleDateString()} ${started.toLocaleTimeString()}`),
          html.doubleCell(
            this.ps.getMsg('Reports system:'),
            `${this.ps.getMsg(report.descriptionKey)} ${report.descriptionDetail}`)
        );
        if (report.userId)
          html.append(t, html.doubleCell(
            this.ps.getMsg('User:'),
            report.userId)
          );
        else if (report.user) // SCORM user
          html.append(t, html.doubleCell(
            this.ps.getMsg('User:'),
            report.user)
          );
        if (report.sequences > 0) {
          if (report.sessions.length > 1)
            html.append(t, html.doubleCell(
              this.ps.getMsg('Projects:'),
              report.sessions.length)
            );
          html.append(t,
            html.doubleCell(
              this.ps.getMsg('Sequences:'),
              report.sequences),
            html.doubleCell(
              this.ps.getMsg('Activities done:'),
              report.activitiesDone),
            html.doubleCell(
              this.ps.getMsg('Activities played at least once:'),
              `${report.playedOnce}/${report.reportable} (${Utils.getPercent(report.ratioPlayed / 100)})`)
          );
          if (report.activitiesDone > 0) {
            html.append(t, html.doubleCell(
              this.ps.getMsg('Activities solved:'),
              `${report.activitiesSolved} (${Utils.getPercent(report.ratioSolved / 100)})`)
            );
            if (report.actScore > 0)
              html.append(t,
                html.doubleCell(
                  this.ps.getMsg('Partial score:'),
                  `${Utils.getPercent(report.partialScore / 100)} ${this.ps.getMsg('(out of played activities)')}`),
                html.doubleCell(
                  this.ps.getMsg('Global score:'),
                  `${Utils.getPercent(report.globalScore / 100)} ${this.ps.getMsg('(out of all project activities)')}`)
              );
            html.append(t,
              html.doubleCell(
                this.ps.getMsg('Total time in activities:'),
                Utils.getHMStime(report.time * 1000)),
              html.doubleCell(
                this.ps.getMsg('Actions done:'),
                report.actions)
            );
          }
          result.push(t);

          report.sessions.forEach(sr => {
            if (sr.sequences.length > 0) {
              const t = html.element('table', null, 'JCDetailed');
              result.push(html.p(report.sessions.length > 1 ? `${this.ps.getMsg('Project')} ${sr.projectName}` : ''));
              html.append(t,
                html.append(html.element('thead'),
                  html.append(html.element('tr'),
                    html.th(this.ps.getMsg('sequence')),
                    html.th(this.ps.getMsg('activity')),
                    html.th(this.ps.getMsg('OK')),
                    html.th(this.ps.getMsg('actions')),
                    html.th(this.ps.getMsg('score')),
                    html.th(this.ps.getMsg('time'))
                  )
                )
              );

              sr.sequences.forEach(seq => {
                let tr = html.append(html.element('tr'),
                  html.element('td', seq.sequence, null, null, { rowspan: seq.activities.length }));
                seq.activities.forEach(act => {
                  if (act.closed)
                    html.append(tr,
                      html.td(act.name),
                      act.solved ? html.td(this.ps.getMsg('YES'), 'ok') : html.td(this.ps.getMsg('NO'), 'no'),
                      html.td(act.actions),
                      html.td(Utils.getPercent(act.precision / 100)),
                      html.td(Utils.getHMStime(act.time * 1000))
                    );
                  else {
                    html.append(tr, html.td(act.name, 'incomplete'));
                    for (let r = 0; r < 4; r++)
                      html.append(tr, html.td('-', 'incomplete'));
                  }
                  html.append(t, tr);
                  tr = html.element('tr');
                });
              });

              html.append(t,
                html.append(html.element('tr'),
                  html.td(this.ps.getMsg('Total:')),
                  html.td(`${sr.played} (${Utils.getPercent(sr.ratioPlayed / 100)})`),
                  html.td(`${sr.solved} (${Utils.getPercent(sr.ratioSolved / 100)})`),
                  html.td(sr.actions),
                  html.td(Utils.getPercent(sr.score / 100)),
                  html.td(Utils.getHMStime(sr.time * 1000))
                )
              );

              result.push(t);
            }
          }, this);
        } else
          result.push(html.p(this.ps.getMsg('No activities done!')));
      }
      return result;
    }

    /**
     * Enables or disables a specific counter
     * @param {string} counter - Which counter
     * @param {boolean} bEnabled - When `true`, the counter will be enabled.
     */
    enableCounter(counter, bEnabled) {
      if (this.counters[counter])
        this.counters[counter].setEnabled(bEnabled);
    }

    /**
     * Main method used to build the content of the skin. Resizes and places internal objects.
     */
    doLayout() {
      // Resize player
      this.player.doLayout();

      // Build ths canvas at the end of current thread, thus avoiding
      // invalid sizes due to incomplete layout of DOM objects
      if (this.msgBoxDiv)
        window.setTimeout(() => {

          // Temporary remove canvas to let div get its natural size:
          if (this.msgBoxDivCanvas)
            this.msgBoxDivCanvas.remove();

          // Get current size of message box div without canvas
          const
            msgWidth = this.msgBoxDiv.offsetWidth,
            msgHeight = this.msgBoxDiv.offsetHeight;

          // Replace existing canvas if size has changed
          if (this.msgBoxDivCanvas === null ||
            this.msgBox.dim.widht !== msgWidth ||
            this.msgBox.dim.height !== msgHeight) {
            this.msgBoxDivCanvas = html.element(null, `<canvas width="${msgWidth}" height="${msgHeight}"/>`);
            this.msgBox.setBounds(new AWT.Rectangle(0, 0, msgWidth + 1, msgHeight));
            // TODO: build accessible element without jQuery!!
            // this.msgBox.buildAccessibleElement(this.msgBoxDivCanvas, this.msgBoxDiv);
          }
          // restore canvas
          this.msgBoxDiv.appendChild(this.msgBoxDivCanvas);
          this.updateContent();
        }, 0);
    }

    /**
     * adjusts the skin to the dimension of its `div` container
     * @returns {AWT.Dimension} the new dimension of the skin
     */
    fit() {
      this.doLayout();
      return new AWT.Dimension(this.div.offsetWidth, this.div.offsetHeight);
    }

    /**
     * Sets or unsets the player in fullscreen mode, when allowed, using the
     * {@link https://github.com/sindresorhus/screenfull.js|screenfull.js} library.
     * @param {boolean} status - Whether to set or unset the player in fullscreen mode. When `null`
     * or `undefined`, the status toggles between fullscreen and windowed modes.
     * @returns {boolean} `true` if the request was successful, `false` otherwise.
     */
    setScreenFull(status) {
      if (screenfull && screenfull.enabled && (
        status === true && !screenfull.isFullscreen ||
        status === false && !screenfull.isFullScreen ||
        status !== true && status !== false)) {
        // Save current value of fullScreen for later use
        const full = screenfull.isFullscreen;
        screenfull.toggle(this.player.$mainContainer.get(-1));
        this.player.fullScreenChecked = true;
        // Firefox don't updates `document.fullscreenElement` in real time, so use the saved value instead
        this.setSkinSizes(!full);
      }
    }

    /**
     * Method used to notify this skin that a specific action has changed its enabled/disabled status
     * @param {AWT.Action} _action - The action originating the change event
     */
    actionStatusChanged(act) {
      if (act.name && this.buttons[act.name])
        this.setEnabled(this.buttons[act.name], act.enabled);
    }

    /**
     * Enables or disables an object
     * @param {external:HTMLElement} object - A DOM element
     * @override
     * @param {boolean} enabled
     */
    setEnabled(object, enabled) {
      if (object && enabled)
        object.removeAttribute('disabled');
      else if (object)
        object.setAttribute('disabled', true);
    }

    /**
     * Compares two Skin objects
     * @param {Skin} skin - The Skin to compare against this
     * @returns {boolean} - `true` if both skins are equivalent.
     */
    equals(skin) {
      return skin &&
        this.name === skin.name &&
        this.ps === skin.ps;
    }

    /**
     * Gets the {@link ActiveBox} used to display the main messages of activities
     * @returns {ActiveBox}
     */
    getMsgBox() {
      // Method to be implemented by subclasses
      return null;
    }

  }

  /**
   * Collection of realized __Skin__ objects.
   * @type {Skin[]}
   */
  Skin.skinStack = [];

  /**
   * Collection of skin style sheets already registered on the current document
   * @type {Object}
   */
  Skin.rootStyles = {};

  /**
   * Counter used to label root nodes with unique IDs
   * @type {Number}
   */
  Skin.lastId = 1;

  /**
   * List of classes derived from Skin. It should be filled by real skin classes at declaration time.
   * @type {object}
   */
  Skin.CLASSES = {};

  Object.assign(Skin.prototype, {
    /**
     * Class name of this skin. It will be used as a base selector in the definition of all CSS styles.
     * @name Skin#skinId
     * @type {string} */
    skinId: 'JClicBasicSkin',
    /**
     * The HTML div object used by this Skin
     * @name Skin#div
     * @type {external:HTMLElement} */
    div: null,
    /**
     * The HTML div where JClic Player will be placed
     * @name Skin#playerCnt
     * @type {external:HTMLElement} */
    playerCnt: null,
    /**
     * Current name of the skin.
     * @name Skin#name
     * @type {string} */
    name: 'default',
    /**
     * Specific options of this skin
     * @name Skin#options
     * @type {object} */
    options: {},
    /**
     * Name of the XML file used to retrieve the skin settings.
     * @name Skin#fileName
     * @type {string} */
    fileName: '',
    /**
     * Waiting panel, displayed while loading resources.
     * @name Skin#waitPanel
     * @type {external:HTMLElement} */
    waitPanel: null,
    /**
     * Graphic indicator of loading progress
     * @name Skin#progress
     * @type {external:HTMLElement} */
    progress: null,
    /**
     * Current value of the progress bar
     * @name Skin#currentProgress
     * @type {number} */
    currentProgress: -1,
    /**
     * Max value of the progress bar
     * @name Skin#maxProgress
     * @type {number} */
    maxProgress: 0,
    /**
     * The box used to display the main messages of JClic activities
     * @name Skin#msgBox
     * @type {ActiveBox} */
    msgBox: null,
    /**
     * The `div` DOM object where `msgBox` is located
     * @name Skin#msgBoxDiv
     * @type {external:HTMLElement} */
    msgBoxDiv: null,
    /*
     * An HTML `canvas` object created in `msgBoxDiv`
     * @name Skin#msgBoxDivCanvas
     * @type {external:HTMLElement} */
    msgBoxDivCanvas: null,
    /**
     * Main panel used to display modal and non-modal dialogs
     * @name Skin#dlgOverlay
     * @type {external:HTMLElement} */
    dlgOverlay: null,
    /**
     * Main panel of dialogs, where relevant information must be placed
     * @name Skin#dlgMainPanel
     * @type {external:HTMLElement} */
    dlgMainPanel: null,
    /**
     * Bottom panel of dialogs, used for action buttons
     * @name Skin#dlgBottomPanel
     * @type {external:HTMLElement} */
    dlgBottomPanel: null,
    /**
     * Element usually used as header in dialogs, with JClic logo, name and version
     * @name Skin#infoHead
     * @type {external:HTMLElement} */
    infoHead: null,
    /**
     * Iconic button used to copy content to clipboard
     * @name Skin#copyBtn
     * @type {external:HTMLElement} */
    copyBtn: null,
    /**
     * Iconic button used to close the dialog
     * @name Skin#closeDlgBtn
     * @type {external:HTMLElement} */
    closeDlgBtn: null,
    /**
     * OK dialog button
     * @name Skin#okDlgBtn
     * @type {external:HTMLElement} */
    okDlgBtn: null,
    /**
     * Cancel dialog button
     * @name Skin#cancelDlgBtn
     * @type {external:HTMLElement} */
    cancelDlgBtn: null,
    /**
     * Value to be returned by the dialog promise when the presented task is fulfilled
     * @name Skin#_dlgOkValue
     * @type {Object} */
    _dlgOkValue: null,
    /**
     * Value to be returned in user-canceled dialogs
     * @name Skin#_dlgCancelValue
     * @type {Object} */
    _dlgCancelValue: null,
    /**
     * Flag indicating if the current dialog is modal or not
     * @name Skin#_isModalDlg
     * @type {boolean} */
    _isModalDlg: false,
    /**
     * Div inside {@link dlgOverlay} where JClicPlayer will place the information to be shown
     * @name Skin#reportsPanel
     * @type {external:HTMLElement} */
    reportsPanel: null,
    /**
     * The basic collection of buttons that most skins implement
     * @name Skin#buttons
     * @type {object} */
    buttons: {
      'prev': null,
      'next': null,
      'return': null,
      'reset': null,
      'info': null,
      'help': null,
      'audio': null,
      'about': null,
      'fullscreen': null,
      'close': null
    },
    /**
     * The collection of counters
     * @name Skin#counters
     * @type {object} */
    counters: {
      'actions': null,
      'score': null,
      'time': null
    },
    /**
     * The collection of message areas
     * @name Skin#msgArea
     * @type {object} */
    msgArea: {
      'main': null,
      'aux': null,
      'mem': null
    },
    /**
     * The {@link JClicPlayer} object associated to this skin
     * @name Skin#player
     * @type {JClicPlayer} */
    player: null,
    /**
     * The {@link http://projectestac.github.io/jclic/apidoc/edu/xtec/jclic/PlayStation.html|PlayStation}
     * used by this Skin. Usually, the same as `player`
     * @name Skin#ps
     * @type {PlayStation} */
    ps: null,
    /**
     * Counter to be incremented or decremented as `waitCursor` is requested or released.
     * @name Skin#waitCursorCount
     * @type {number} */
    waitCursorCount: 0,
    //
    // Buttons and other graphical resources used by this skin.
    //
    /**
     * Main styles
     * @name Skin#basicCSS
     * @type {string} */
    basicCSS: '\
.ID {width:100%; background-color:#3F51B5; display:-webkit-flex; display:flex; -webkit-flex-direction:column; flex-direction:column;}\
.ID .JClicPlayerCnt {background-color:lightblue; margin:18px; -webkit-flex-grow:1; flex-grow:1; position:relative;}\
.ID .JClicPlayerCnt > div {position:absolute; width:100%; height:100%;}\
.ID button:not(.StockBtn) {background:transparent; padding:0; border:none;}\
.ID .unselectableText {-webkit-user-select:none; -moz-user-select:none; -ms-user-select:none; user-select: none;}\
.ID .progressBar {width: 250px}',
    /**
     * Waiting screen styles
     * @name Skin#waitAnimCSS
     * @type {string} */
    waitAnimCSS: '\
.ID .waitPanel {display:-webkit-flex; display:flex; width:100%; height:100%; -webkit-justify-content:center; justify-content:center; -webkit-align-items:center; align-items:center;}\
.ID .animImgBox {position:relative; width:300px; height:300px; max-width:80%; max-height:80%;}\
.ID .animImgBox svg {position:absolute; width:100%; height:100%; animation-iteration-count:infinite; animation-timing-function:linear;}\
.ID #waitImgBig {animation-duration:0.8s; animation-name:rotate-right;}\
@keyframes rotate-right {from {transform:rotate(0);} to {transform:rotate(1turn);}}\
.ID #waitImgSmall {animation-duration:0.6s; animation-name:rotate-left;}\
@keyframes rotate-left {from {transform:rotate(0);} to {transform:rotate(-1turn);}}',
    /**
     * Animated image displayed while loading resources
     * Based on Ryan Allen's [svg-spinner](http://articles.dappergentlemen.com/2015/01/13/svg-spinner/)
     * @name Skin#waitImgBig
     * @type {string} */
    waitImgBig: '<svg id="waitImgBig" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">\
<path fill="#3F51B5" d="m 65.99,40.19 c -0.42,5.33 7.80,4.94 8.11,0.20 C 74.50,34.37 66.35,8.59 42.92,\
7.98 15.90,7.29 9.96,29.50 9.94,39.41 15.33,-1.66 68.61,7.048 65.99,40.19 Z" />\
</svg>',
    /**
     * Animated image displayed while loading resources (small)
     * @name Skin#waitImgSmall
     * @type {string} */
    waitImgSmall: '<svg id="waitImgSmall" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">\
<path fill="#3F51B5"d="m 57.00,39.43 c -0.28,-3.53 5.16,-3.27 5.37,-0.13 0.26,3.99 -5.13,21.04 -20.63,\
21.44 C 23.85,61.19 19.93,46.50 19.92,39.94 23.48,67.11 58.73,61.35 57.00,39.43 Z"/>\
</svg>',
    /**
     * Reports screen styles
     * @name Skin#reportsCSS
     * @type {string} */
    reportsCSS: '\
.ID .dlgDiv {background-color:#efefef; color:#757575; font-family:Roboto,sans-serif; font-size:10pt; line-height:normal;}\
.ID .dlgDiv a,a:visited,a:active,a:hover {text-decoration:none; color:inherit;}\
.ID .dlgMainPanel {padding:1em 2em; max-height:calc(100vh - 8em); max-width:calc(100vw - 2em); min-width:20em; overflow:auto;}\
.ID .dlgMainPanel .headTitle {font-size:2.5em; font-weight:bold; margin:auto;}\
.ID .dlgMainPanel .subTitle {font-size:1.4em; font-weight:bold; margin-bottom:0.5em;}\
.ID .dlgMainPanel p {font-size:1.1em; margin-bottom:0.5em;}\
.ID .dlgMainPanel table {table-layout:fixed; width:40em; margin:0.5em 0 1.7em 0; border-collapse:collapse;}\
.ID .dlgMainPanel select {min-width:20em; font-size:1.2em; font-family:Roboto,sans-serif; color:#757575;}\
.ID .dlgMainPanel input {margin-left:1em; font-size:1.2em; font-family:Roboto,sans-serif; border-color:lightgray;}\
.ID .infoHead {padding:1em 0em 0.5em;}\
.ID .JCGlobalResults td {padding:0.4em; border-bottom:1px solid #b6b6b6;}\
.ID .JCGlobalResults td:first-child {font-weight:600; width:14em;}\
.ID .JCDetailed td,th {border-bottom:1px solid #b6b6b6; padding:0.3em 0.4em; vertical-align:top; text-align:center; overflow:hidden; text-overflow:ellipsis;}\
.ID .JCDetailed thead {font-weight:600;}\
.ID .JCDetailed th:first-child {width:7em;}\
.ID .JCDetailed th:nth-last-child(4) {width:4em;}\
.ID .JCDetailed th:nth-last-child(-n+3) {width:4.1em; text-align:right;}\
.ID .JCDetailed td:nth-last-child(-n+3) {text-align:right;}\
.ID .JCDetailed .ok {color:#4bae4f; font-weight:600;}\
.ID .JCDetailed .no {color:#f34235; font-weight:600;}\
.ID .JCDetailed tr:last-child {font-weight:bold;}\
.ID .JCDetailed .incomplete {font-style:italic;}\
.ID .dlgBottomPanel {height:3.5em; background-color:white; padding:0.5em; font-weight:bold; text-align:right; border-top:1px solid #eee; position:relative;}\
.ID .dlgBottomPanel .smallPopup {background-color:#222; color:#ddd; padding:0.5em; font-size:0.9em; position:absolute; right:6em; top:1em;}\
.ID .dlgBottomPanel button {display:inline-block; padding:10px; cursor:pointer; line-height:0;}\
.ID .dlgBottomPanel button:hover {background-color:#eee; border-radius:80px;}\
.ID .dlgBottomPanel button:active {background-color:#b3e5fc;}',
    //
    // Icons used in buttons:
    //
    /**
     * Icon for 'close dialog' button
     * @name Skin#closeDialogIcon
     * @type {string} */
    closeDialogIcon: '<svg fill="#757575" viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">\
<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>\
</svg>',
    /**
     * Icon for 'ok' button
     * @name Skin#okDialogIcon
     * @type {string} */
    okDialogIcon: '<svg fill="#757575" viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">\
<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>\
</svg>',
    /**
     * Icon for 'copy' button
     * @name Skin#copyIcon
     * @type {string} */
    copyIcon: '<svg fill="#757575" viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">\
<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>\
</svg>',
    /**
     * JClic logo
     * @name Skin#appLogo
     * @type {string} */
    appLogo: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(.02081 0 0-.02081 5 62.33)">\
<path d="m1263 1297l270 1003 996-267-267-990c-427-1583-2420-1046-1999 519 3 11 999-266 999-266z" fill="none" stroke="#9d6329" stroke-linejoin="round" stroke-linecap="round" stroke-width="180" stroke-miterlimit="3.864"/>\
<path d="m1263 1297l270 1003 996-267-267-990c-427-1583-2420-1046-1998 519 3 11 999-266 999-266" fill="#f89c0e"/>\
<path d="m357 2850l1000-268-267-992-1000 266 267 994z" fill="none" stroke="#86882b" stroke-linejoin="round" stroke-linecap="round" stroke-width="180" stroke-miterlimit="3.864"/>\n\
<path d="m357 2850l1000-268-267-992-1000 266 267 994" fill="#d9e70c"/>\n\
</g></svg>',
    /**
     * Screen sizes (width and height) below which will half sized elements will be used
     * @name DefaultSkin#halfMedia
     * @type {object} */
    halfMedia: { width: 376, height: 282 },
    /**
     * Screen sizes (width and height) below which will two-thirds sized elements will be used
     * @name DefaultSkin#twoThirdsMedia
     * @type {object} */
    twoThirdsMedia: { width: 420, height: 315 },
  });

  return Skin;
});
