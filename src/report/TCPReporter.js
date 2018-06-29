/**
 *  File    : report/TCPReporter.js
 *  Created : 08/06/2016
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

/* global define, document */

define([
  "./Reporter",
  "../Utils"
], function (
  Reporter, Utils) {

    /**
     * This special case of {@link Reporter} connects with an external service reporter providing
     * the {@link https://github.com/projectestac/jclic/wiki/JClic-Reports-developers-guide JClic Reports API}.
     * Connection parameters to the reports server (`path`, `service`, `userId`, `key`, `context`...)
     * are passed through the `options` element of {@link JClicPlayer} (acting as {@link PlayStation}).
     * @exports TCPReporter
     * @class
     * @extends Reporter
     */
    class TCPReporter extends Reporter {
      /**
       * TCPReporter constructor
       * @param {PlayStation} ps - The {@link PlayStation} used to retrieve settings and localized messages
       */
      constructor(ps) {
        super(ps);
        this.tasks = [];
      }

      /**
       * Gets a specific property from this reporting system
       * @override
       * @param {string} key - Requested property
       * @param {string}+ defaultValue - Default return value when requested property does not exist
       * @returns {string}
       */
      getProperty(key, defaultValue) {
        return this.dbProperties !== null && this.dbProperties.hasOwnProperty(key) ?
          this.dbProperties[key] :
          defaultValue;
      }

      /**
       * Adds a new element to the list of report beans pending to be transmitted.
       * @param {ReportBean} bean
       */
      addTask(bean) {
        if (this.processingTasks) {
          if (this.waitingTasks === null)
            this.waitingTasks = [bean];
          else
            this.waitingTasks.push(bean);
        } else
          this.tasks.push(bean);
      }

      /**
       * Transmits all report beans currently stored in `tasks` to the reports server
       * @returns {Promise}
       */
      flushTasksPromise() {
        if (this.processingTasks || this.currentSessionId === null ||
          this.tasks.length === 0 || this.serviceUrl === null) {
          // The task list cannot be processed now. Pass and wait until the next timer cycle:
          if (this.processingTasks)
            this.forceFlush = true;
          return Promise.resolve(true);
        }
        else {
          // Set up the `processingTasks` flag to avoid re-entrant processing
          this.processingTasks = true;

          const reportBean = new ReportBean('multiple');
          for (let i = 0; i < this.tasks.length; i++)
            reportBean.appendData(this.tasks[i].xml);

          Utils.log('debug', 'Reporting:', reportBean.xml);

          return this.transaction(reportBean)
            .then(_data => {
              this.failCount = 0;

              // Clear waiting tasks
              if (this.waitingTasks) {
                this.tasks = this.waitingTasks;
                this.waitingTasks = null;
              }
              else {
                this.forceFlush = false;
                this.tasks = [];
              }

              if (this.forceFlush && this.tasks.length > 0) {
                this.forceFlush = false;
                this.processingTasks = false;
                return this.flushTasksPromise();
              }

              this.forceFlush = false;
              this.processingTasks = false;
              return true;
            })
            .catch(err => {
              if (++this.failCount > this.maxFails)
                this.stopReporting();
              this.processingTasks = false;
              throw `Error reporting results to ${this.serviceUrl} [${err}]`;
            });
        }
      }

      /**
       * Function used as a handler for the `beforeunload` event.
       * See: https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
       * Warns before leaving the current page with unsaved data.
       * @param {external:Event} event 
       */
      beforeUnloadFunction(event) {
        if (this.serviceUrl !== null &&
          (this.tasks.length > 0 || this.processingTasks)) {
          const result = this.ps.getMsg('Please wait until the results of your activities are sent to the reports system');
          if (event)
            event.returnValue = result;
          this.flushTasksPromise();
          return result;
        }
      }

      /**
       * Initializes this report system with an optional set of parameters.
       * Returns a Promise, fulfilled when the reporter is fully initialized.
       * @override
       * @param {?Object} options - Initial settings passed to the reporting system
       * @returns {Promise}
       */
      init(options) {
        if (typeof options === 'undefined' || options === null)
          options = this.ps.options;

        return super.init(options)
          .then(_result => {
            this.initiated = false;
            return this.stopReporting();
          })
          .then(_result => {
            this.serverPath = options.path || this.DEFAULT_SERVER_PATH;
            this.descriptionDetail = this.serverPath;
            let serverService = options.service || this.DEFAULT_SERVER_SERVICE;
            if (!Utils.startsWith(serverService, '/'))
              serverService = `/${serverService}`;
            const serverProtocol = options.protocol || this.DEFAULT_SERVER_PROTOCOL;
            this.serviceUrl = `${serverProtocol}://${this.serverPath}${serverService}`;
            return this.transaction(new ReportBean('get_properties'));
          })
          .then(data => {
            this.dbProperties = {};
            data.querySelectorAll('param').forEach(param => this.dbProperties[param.getAttribute('name')] = param.getAttribute('value'));
            return true;
          })
          .then(_result => this.promptUserId(false))
          .then(userId => {
            // Save userId and make final adjustements:
            this.userId = userId;
            const tl = options.lap || this.getProperty('TIME_LAP', this.DEFAULT_TIMER_LAP);
            this.timerLap = Math.min(30, Math.max(1, parseInt(tl)));
            this.timer = window.setInterval(() => this.flushTasksPromise(), this.timerLap * 1000);
            window.addEventListener('beforeunload', this.beforeUnloadFunction);
            this.beforeUnloadHandler = true;
            this.initiated = true;
            return true;
          })
          .catch(err => {
            this.stopReporting();
            throw `Error initializing reports service ${this.serviceUrl} [${err}]`;
          });
      }

      /**
       * This method should be invoked when a new session starts.
       * @override
       * @param {JClicProject} jcp - The {@link JClicProject} this session refers to.
       */
      newSession(jcp) {
        super.newSession(jcp);
        if (this.serviceUrl && this.userId !== null) {
          // Session ID will be obtained when reporting first activity
          this.currentSessionId = null;
        }
      }

      /**
       * Creates a new session in the remote database and records its ID for future use
       * @param {boolean} forceNewSession - When `true`, a new session will always be created.
       * @returns {Promise} - A Promise reporter will be successfully resolved
       * only when `currentSessionId` has a valid value.
       */
      createDBSession(forceNewSession) {
        if (this.currentSessionId !== null && !forceNewSession)
          // A valid session is available, so just return it
          return Promise.resolve(this.currentSessionId);
        else if (!this.initiated || this.userId === null || this.currentSession === null)
          return Promise.reject('Unable to start session in remote server!');
        else
          return this.flushTasksPromise()
            .then(_result => {
              this.currentSessionId = null;
              const bean = new ReportBean('add session');
              bean.setParam('project', this.currentSession.projectName);
              bean.setParam('activities', Number(this.currentSession.reportableActs));
              bean.setParam('time', Number(this.currentSession.started));
              bean.setParam('code', this.currentSession.code);
              bean.setParam('user', this.userId);
              bean.setParam('key', this.sessionKey);
              bean.setParam('context', this.sessionContext);
              return this.transaction(bean);
            })
            .then(data => {
              const sessionParam = data ? data.querySelector('param[name="session"]') : null;
              if (sessionParam)
                this.currentSessionId = sessionParam.getAttribute('value');
              if (this.currentSessionId === null)
                throw 'No session ID!';
              return this.currentSessionId;
            })
            .catch(err => {
              this.stopReporting();
              throw `Error creating new reports session in ${this.serviceUrl} [${err}]`;
            });
      }

      /**
       * Closes this reporting system
       * @override
       * @returns {Promise} - A promise to be fullfilled when all pending tasks are finished, or _null_ if not active.
       */
      end() {
        this.reportActivity(true);
        return this.stopReporting()
          .then(_result => super.end());
      }

      /**
       * Performs a transaction on the remote server
       * @param {ReportBean} bean - The Reportbean containing the XML element to be transmited
       * @returns {external:Promise} - A Promise that resolves with an XML Element
       */
      transaction(bean) {
        if (!this.serviceUrl)
          return Promise.reject('A valid URL for the reports server was not provided!');

        return fetch(this.serviceUrl, {
          method: 'POST',
          body: `<?xml version="1.0" encoding="UTF-8"?>${Utils.serializer.serializeToString(bean.xml).replace(/minactions/g, 'minActions').replace(/reportactions/g, 'reportActions')}`,
          //mode: 'cors',
          credentials: 'same-origin',
          cache: 'no-cache',
          headers: {
            'Accept': 'text/xml',
            'Content-Type': 'text/xml',
          }
        })
          .then(response => response.text()
            .then(text => {
              if (!response.ok)
                throw `Server error ${response.status}: ${text}`;
              return Utils.parseXmlText(text);
            })
          );
      }

      /**
       * Gets the list of current groups or organizations registered on this reporting system.
       * @override
       * @returns {Promise} - Resolves to an array of group data
       */
      getGroups() {
        if (!this.userBased())
          return Promise.reject('This system does not manage users!');

        return this.transaction(new ReportBean('get groups'))
          .then(data => {
            const currentGroups = [];
            data.querySelectorAll('group').forEach(gr => {
              currentGroups.push({
                id: gr.getAttribute('id'),
                name: gr.getAttribute('name'),
              });
            });
            return currentGroups;
          })
          .catch(err => {
            throw `Error retrieving groups list from ${this.serviceUrl} [${err}]`;
          });
      }

      /**
       * Gets the list of users currently registered in the system, optionally filtered by
       * a specific group ID.
       * @override
       * @param {string}+ groupId - Optional group ID to be used as a filter criteria
       * @returns {Promise} - When fulfilled, an object with a collection of user data records
       * is returned
       */
      getUsers(groupId) {
        if (!this.userBased())
          return Promise.reject('This system does not manage users!');

        const bean = new ReportBean('get users');
        if (typeof groupId !== 'undefined' && groupId !== null)
          bean.setParam('group', groupId);

        return this.transaction(bean)
          .then(data => {
            const currentUsers = [];
            data.querySelectorAll('user').forEach(usr => {
              const user = {
                id: usr.getAttribute('id'),
                name: usr.getAttribute('name'),
              };
              if (usr.getAttribute('pwd'))
                user.pwd = usr.getAttribute('pwd');
              currentUsers.push(user);
            });
            return currentUsers;
          })
          .catch(err => {
            throw `Error retrieving users list from ${this.serviceUrl} [${err}]`;
          });
      }

      /**
       * Gets extended data associated with a specific user.
       * @param {string} userId - The requested user ID
       * @returns {Promise} - When fulfilled, an object with user data is returned.
       */
      getUserData(userId) {
        if (!this.userBased())
          return Promise.reject('This system does not manage users!');
        if (typeof userId === 'undefined' || userId === null || userId === '')
          return Promise.reject(`Invalid user ID: "${userId}"`);

        const bean = new ReportBean('get user data');
        bean.setParam('user', userId);
        return this.transaction(bean)
          .then(data => {
            const user = data.querySelector('user');
            if (!user) {
              alert(this.ps.getMsg('Invalid user!'));
              throw 'Invalid user ID';
            } else {
              const userData = {
                id: user.getAttribute('id'),
                name: user.getAttribute('name'),
              };
              if (user.getAttribute('pwd'))
                userData.pwd = user.getAttribute('pwd');
              return userData;
            }
          })
          .catch(err => {
            throw `Error retrieving user data from ${this.serviceUrl} [${err}]`;
          });
      }

      /**
       * Stops the reporting system, usually as a result of repeated errors or because the player
       * shuts down.
       * @returns {Promise} - A promise to be fullfilled when all pending tasks are finished.
       */
      stopReporting() {
        let result = null;
        if (this.timer >= 0) {
          window.clearInterval(this.timer);
          this.timer = -1;
        }
        if (this.beforeUnloadHandler) {
          window.removeEventListener('beforeunload', this.beforeUnloadFunction);
          this.beforeUnloadHandler = false;
        }
        if (this.initiated) {
          result = this.flushTasksPromise()
            .then(() => {
              this.serviceUrl = null;
              this.descriptionDetail = `${this.serverPath} (${this.ps.getMsg('not connected')})`;
              this.initiated = false;
            });
        }
        return result || Promise.resolve(true);
      }

      /**
       * Prepares a {@link ReportBean} object with information related to the current
       * activity, and pushes it into the list of pending `tasks`, to be processed by the main `timer`.
       * @param {boolean} flushNow - When `true`, the activity data will be sent to server as soon as possible
       */
      reportActivity(flushNow) {
        if (this.lastActivity) {
          if (!this.lastActivity.closed)
            this.lastActivity.closeActivity();
          const
            actCount = this.actCount++,
            act = this.lastActivity;
          this.createDBSession(false).then(() => {
            const bean = new ReportBean('add activity');
            bean.setParam('session', this.currentSessionId);
            bean.setParam('num', actCount);
            bean.appendData(act.getXML());
            this.addTask(bean);
            if (flushNow)
              this.flushTasksPromise().then();
          });
        }
        if (this.currentSession !== null &&
          this.currentSession.currentSequence !== null &&
          this.currentSession.currentSequence.currentActivity !== this.lastActivity) {
          this.lastActivity = this.currentSession.currentSequence.currentActivity;
        } else
          this.lastActivity = null;
      }

      /**
       * This method should be invoked when the user starts a new activity
       * @override
       * @param {Activity} act - The {@link Activity} reporter has just started
       */
      newActivity(act) {
        super.newActivity(act);
        this.reportActivity(false);
      }

      /**
       * This method should be called when the current activity finishes. Data about user's final results
       * on the activity will then be saved.
       * @override
       * @param {number} score - The final score, usually in a 0-100 scale.
       * @param {number} numActions - The total number of actions done by the user to solve the activity
       * @param {boolean} solved - `true` if the activity was finally solved, `false` otherwise.
       */
      endActivity(score, numActions, solved) {
        super.endActivity(score, numActions, solved);
        this.reportActivity(true);
      }
    }

    Object.assign(TCPReporter.prototype, {
      /**
       * Description of this reporting system
       * @name TCPReporter#descriptionKey
       * @override
       * @type {string} */
      descriptionKey: 'Reporting to remote server',
      /**
       * Additional info to display after the reporter's `description`
       * @name TCPReporter#descriptionDetail
       * @override
       * @type {string} */
      descriptionDetail: '(not connected)',
      /**
       * Main path of the reports server (without protocol nor service)
       * @name TCPReporter#serverPath
       * @type {string} */
      serverPath: '',
      /**
       * Checks if the 'beforeunload' event is already linked to this reporter
       * @name TCPReporter#beforeUnloadHandler
       * @type {boolean} */
      beforeUnloadHandler: false,
      /**
       * Identifier of the current session, provided by the server
       * @name TCPReporter#currentSessionId
       * @type {string} */
      currentSessionId: '',
      /**
       * Last activity reported
       * @name TCPReporter#lastActivity
       * @type {ActivityReg} */
      lastActivity: null,
      /**
       * Number of activities processed
       * @name TCPReporter#actCount
       * @type {number} */
      actCount: 0,
      /**
       * Service URL of the JClic Reports server
       * @name TCPReporter#serviceUrl
       * @type {string} */
      serviceUrl: null,
      /**
       * Object used to store specific properties of the connected reports system
       * @name TCPReporter#dbProperties
       * @type {object} */
      dbProperties: null,
      /**
       * List of {@link ReportBean} objects pending to be processed
       * @name TCPReporter#tasks
       * @type {ReportBean[]} */
      tasks: null,
      /**
       * Waiting list of tasks, to be used while `tasks` is being processed
       * @name TCPReporter#waitingTasks
       * @type {ReportBean[]} */
      waitingTasks: null,
      /**
       * Flag used to indicate if `transaction` is currently running
       * @name TCPReporter#processingTasks
       * @type {boolean} */
      processingTasks: false,
      /**
       * Force processing of pending tasks as soon as possible
       * @name TCPReporter#forceFlush
       * @type {boolean} */
      forceFlush: false,
      /**
       * Identifier of the background function obtained with a call to `window.setInterval`
       * @name TCPReporter#timer
       * @type {number} */
      timer: -1,
      /**
       * Time between calls to the background function, in seconds
       * @name TCPReporter#timerLap
       * @type {number} */
      timerLap: 5,
      /**
       * Counter of unsuccessful connection attempts with the report server
       * @name TCPReporter#failCount
       * @type {number} */
      failCount: 0,
      /**
       * Maximum number of failed attempts allowed before disconnecting
       * @name TCPReporter#maxFails
       * @type {number} */
      maxFails: 5,
      /**
       * Default path of JClic Reports Server
       * @name TCPReporter#DEFAULT_SERVER_PATH
       * @type {string} */
      DEFAULT_SERVER_PATH: 'localhost:9000',
      /**
       * Default name for the reports service
       * @name TCPReporter#DEFAULT_SERVER_SERVICE
       * @type {string} */
      DEFAULT_SERVER_SERVICE: '/JClicReportService',
      /**
       * Default server protocol
       * Use always 'https' except when in 'http' and protocol not set in options
       * @name TCPReporter#DEFAULT_SERVER_PROTOCOL
       * @type {string} */
      DEFAULT_SERVER_PROTOCOL: (document && document.location && document.location.protocol === 'http:') ? 'http' : 'https',
      /**
       * Default lap between calls to `flushTasks`, in seconds
       * @name TCPReporter#DEFAULT_TIMER_LAP
       * @type {number} */
      DEFAULT_TIMER_LAP: 20,
    });


    /**
     * This inner class encapsulates a chunk of information in XML format, ready to be
     * transmitted to the remote reports server.
     * @class
     */
    class ReportBean {
      /**
       * ReportBean constructor
       * @param id {string} - The main identifier of this ReportBean. Current valid values are:
       * `get property`, `get_properties`, `add session`, `add activity`, `get groups`, `get users`,
       * `get user data`, `get group data`, `new group`, `new user` and `multiple`.
       * @param data {external:Element}+ - Optional XML data to be added to this bean
       */
      constructor(id, data) {
        this.xml = document.createElement('bean');
        this.xml.setAttribute('id', id);
        if (data)
          this.appendData(data);
      }

      /**
       * Adds an XML element to the bean
       * @param {external:Element} data - The XML element to be added to this bean
       */
      appendData(data) {
        if (data) {
          this.xml.appendChild(data);
        }
      }

      /**
       * Adds an XML element of type `param` to this ReportBean
       * @param {string} name - The key name of the parameter
       * @param {string|number|boolean} value - The value of the parameter
       */
      setParam(name, value) {
        if (typeof value !== 'undefined' && value !== null) {
          const child = document.createElement('param');
          child.setAttribute('name', name);
          child.setAttribute('value', value);
          this.appendData(child);
        }
      }
    }

    Object.assign(ReportBean.prototype, {
      /**
       * The main XML element managed by this ReportBean
       * @name ReportBean#xml
       * @type {external:Element} */
      xml: null,
    });

    TCPReporter.ReportBean = ReportBean;

    // Register class in Reporter.CLASSES
    Reporter.CLASSES['TCPReporter'] = TCPReporter;

    return TCPReporter;
  });
