(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ "../../../dist/libs/remix-lib/src/eventManager.js":
/*!*******************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/eventManager.js ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventManager = void 0;

class EventManager {
  constructor() {
    this.registered = {};
    this.anonymous = {};
  }
  /*
    * Unregister a listener.
    * Note that if obj is a function. the unregistration will be applied to the dummy obj {}.
    *
    * @param {String} eventName  - the event name
    * @param {Object or Func} obj - object that will listen on this event
    * @param {Func} func         - function of the listeners that will be executed
  */


  unregister(eventName, obj, func) {
    if (!this.registered[eventName]) {
      return;
    }

    if (obj instanceof Function) {
      func = obj;
      obj = this.anonymous;
    }

    for (const reg in this.registered[eventName]) {
      if (this.registered[eventName][reg].obj === obj && this.registered[eventName][reg].func.toString() === func.toString()) {
        this.registered[eventName].splice(reg, 1);
      }
    }
  }
  /*
    * Register a new listener.
    * Note that if obj is a function, the function registration will be associated with the dummy object {}
    *
    * @param {String} eventName  - the event name
    * @param {Object or Func} obj - object that will listen on this event
    * @param {Func} func         - function of the listeners that will be executed
  */


  register(eventName, obj, func) {
    if (!this.registered[eventName]) {
      this.registered[eventName] = [];
    }

    if (obj instanceof Function) {
      func = obj;
      obj = this.anonymous;
    }

    this.registered[eventName].push({
      obj,
      func
    });
  }
  /*
    * trigger event.
    * Every listener have their associated function executed
    *
    * @param {String} eventName  - the event name
    * @param {Array}j - argument that will be passed to the executed function.
  */


  trigger(eventName, args) {
    if (!this.registered[eventName]) {
      return;
    }

    for (const listener in this.registered[eventName]) {
      const l = this.registered[eventName][listener];
      if (l.func) l.func.apply(l.obj === this.anonymous ? {} : l.obj, args);
    }
  }

}

exports.EventManager = EventManager;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/eventsDecoder.js":
/*!******************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/eventsDecoder.js ***!
  \******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventsDecoder = void 0;

const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");

const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");
/**
  * Register to txListener and extract events
  *
  */


class EventsDecoder {
  constructor({
    resolveReceipt
  }) {
    this.resolveReceipt = resolveReceipt;
  }
  /**
  * use Transaction Receipt to decode logs. assume that the transaction as already been resolved by txListener.
  * logs are decoded only if the contract if known by remix.
  *
  * @param {Object} tx - transaction object
  * @param {Function} cb - callback
  */


  parseLogs(tx, contractName, compiledContracts, cb) {
    if (tx.isCall) return cb(null, {
      decoded: [],
      raw: []
    });
    this.resolveReceipt(tx, (error, receipt) => {
      if (error) return cb(error);

      this._decodeLogs(tx, receipt, contractName, compiledContracts, cb);
    });
  }

  _decodeLogs(tx, receipt, contract, contracts, cb) {
    if (!contract || !receipt) {
      return cb('cannot decode logs - contract or receipt not resolved ');
    }

    if (!receipt.logs) {
      return cb(null, {
        decoded: [],
        raw: []
      });
    }

    this._decodeEvents(tx, receipt.logs, contract, contracts, cb);
  }

  _eventABI(contract) {
    const eventABI = {};
    const abi = new ethers_1.ethers.utils.Interface(contract.abi);

    for (const e in abi.events) {
      const event = abi.getEvent(e);
      eventABI[abi.getEventTopic(e).replace('0x', '')] = {
        event: event.name,
        inputs: event.inputs,
        object: event,
        abi: abi
      };
    }

    return eventABI;
  }

  _eventsABI(compiledContracts) {
    const eventsABI = {};
    (0, txHelper_1.visitContracts)(compiledContracts, contract => {
      eventsABI[contract.name] = this._eventABI(contract.object);
    });
    return eventsABI;
  }

  _event(hash, eventsABI) {
    // get all the events responding to that hash.
    const contracts = [];

    for (const k in eventsABI) {
      if (eventsABI[k][hash]) {
        const event = eventsABI[k][hash];

        for (const input of event.inputs) {
          if (input.type === 'function') {
            input.type = 'bytes24';
            input.baseType = 'bytes24';
          }
        }

        contracts.push(event);
      }
    }

    return contracts;
  }

  _stringifyBigNumber(value) {
    return value._isBigNumber ? value.toString() : value;
  }

  _stringifyEvent(value) {
    if (value === null || value === undefined) return ' - ';
    if (value._ethersType) value.type = value._ethersType;

    if (Array.isArray(value)) {
      // for struct && array
      return value.map(item => {
        return this._stringifyEvent(item);
      });
    } else {
      return this._stringifyBigNumber(value);
    }
  }

  _decodeEvents(tx, logs, contractName, compiledContracts, cb) {
    const eventsABI = this._eventsABI(compiledContracts);

    const events = [];

    for (const i in logs) {
      // [address, topics, mem]
      const log = logs[i];
      const topicId = log.topics[0];

      const eventAbis = this._event(topicId.replace('0x', ''), eventsABI);

      for (const eventAbi of eventAbis) {
        try {
          if (eventAbi) {
            const decodedlog = eventAbi.abi.parseLog(log);
            const decoded = {};

            for (const v in decodedlog.args) {
              decoded[v] = this._stringifyEvent(decodedlog.args[v]);
            }

            events.push({
              from: log.address,
              topic: topicId,
              event: eventAbi.event,
              args: decoded
            });
          } else {
            events.push({
              from: log.address,
              data: log.data,
              topics: log.topics
            });
          }

          break; // if one of the iteration is successful
        } catch (e) {
          continue;
        }
      }
    }

    cb(null, {
      decoded: events,
      raw: logs
    });
  }

}

exports.EventsDecoder = EventsDecoder;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/forkAt.js":
/*!***********************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/forkAt.js ***!
  \***********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.forkAt = void 0;
/**
  * returns the fork name for the @argument networkId and @argument blockNumber
  *
  * @param {Object} networkId - network Id (1 for VM, 3 for Ropsten, 4 for Rinkeby, 5 for Goerli)
  * @param {Object} blockNumber - block number
  * @return {String} - fork name (Berlin, Istanbul, ...)
  */

function forkAt(networkId, blockNumber) {
  if (forks[networkId]) {
    let currentForkName = forks[networkId][0].name;

    for (const fork of forks[networkId]) {
      if (blockNumber >= fork.number) {
        currentForkName = fork.name;
      }
    }

    return currentForkName;
  }

  return 'london';
}

exports.forkAt = forkAt; // see https://github.com/ethereum/go-ethereum/blob/master/params/config.go

const forks = {
  1: [{
    number: 4370000,
    name: 'byzantium'
  }, {
    number: 7280000,
    name: 'constantinople'
  }, {
    number: 7280000,
    name: 'petersburg'
  }, {
    number: 9069000,
    name: 'istanbul'
  }, {
    number: 9200000,
    name: 'muirglacier'
  }, {
    number: 12244000,
    name: 'berlin'
  }, {
    number: 12965000,
    name: 'london'
  }, {
    number: 13773000,
    name: 'arrowGlacier'
  }, {
    number: 15050000,
    name: 'grayGlacier'
  }],
  3: [{
    number: 1700000,
    name: 'byzantium'
  }, {
    number: 4230000,
    name: 'constantinople'
  }, {
    number: 4939394,
    name: 'petersburg'
  }, {
    number: 6485846,
    name: 'istanbul'
  }, {
    number: 7117117,
    name: 'muirglacier'
  }, {
    number: 9812189,
    name: 'berlin'
  }, {
    number: 10499401,
    name: 'london'
  }],
  4: [{
    number: 1035301,
    name: 'byzantium'
  }, {
    number: 3660663,
    name: 'constantinople'
  }, {
    number: 4321234,
    name: 'petersburg'
  }, {
    number: 5435345,
    name: 'istanbul'
  }, {
    number: 8290928,
    name: 'berlin'
  }, {
    number: 8897988,
    name: 'london'
  }],
  5: [{
    number: 1561651,
    name: 'istanbul'
  }, {
    number: 4460644,
    name: 'berlin'
  }, {
    number: 5062605,
    name: 'london'
  }]
};

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/logsManager.js":
/*!****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/logsManager.js ***!
  \****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogsManager = void 0;

const async_1 = __webpack_require__(/*! async */ "../../../node_modules/async/dist/async.js");

const crypto_1 = __webpack_require__(/*! crypto */ "../../../node_modules/crypto-browserify/index.js");

class LogsManager {
  constructor() {
    this.notificationCallbacks = [];
    this.subscriptions = {};
    this.filters = {};
    this.filterTracking = {};
    this.oldLogs = [];
  }

  checkBlock(blockNumber, block, web3) {
    (0, async_1.eachOf)(block.transactions, (tx, i, next) => {
      const txHash = '0x' + tx.hash().toString('hex');
      web3.eth.getTransactionReceipt(txHash, (_error, receipt) => {
        for (const log of receipt.logs) {
          this.oldLogs.push({
            type: 'block',
            blockNumber,
            block,
            tx,
            log,
            txNumber: i
          });
          const subscriptions = this.getSubscriptionsFor({
            type: 'block',
            blockNumber,
            block,
            tx,
            log
          });

          for (const subscriptionId of subscriptions) {
            const result = {
              logIndex: '0x1',
              blockNumber: blockNumber,
              blockHash: '0x' + block.hash().toString('hex'),
              transactionHash: '0x' + tx.hash().toString('hex'),
              transactionIndex: '0x' + i.toString(16),
              // TODO: if it's a contract deploy, it should be that address instead
              address: log.address,
              data: log.data,
              topics: log.topics
            };

            if (result.address === '0x') {
              delete result.address;
            }

            const response = {
              jsonrpc: '2.0',
              method: 'eth_subscription',
              params: {
                result: result,
                subscription: subscriptionId
              }
            };
            this.transmit(response);
          }
        }
      });
    }, _err => {});
  }

  eventMatchesFilter(changeEvent, queryType, queryFilter) {
    if (queryFilter.topics.filter(logTopic => changeEvent.log.topics.indexOf(logTopic) >= 0).length === 0) return false;

    if (queryType === 'logs') {
      const fromBlock = queryFilter.fromBlock || '0x0';
      const toBlock = queryFilter.toBlock || this.oldLogs.length ? this.oldLogs[this.oldLogs.length - 1].blockNumber : '0x0';

      if (queryFilter.address === (changeEvent.tx.to || '').toString() || queryFilter.address === changeEvent.tx.getSenderAddress().toString()) {
        if (parseInt(toBlock) >= parseInt(changeEvent.blockNumber) && parseInt(fromBlock) <= parseInt(changeEvent.blockNumber)) {
          return true;
        }
      }
    }

    return false;
  }

  getSubscriptionsFor(changeEvent) {
    const matchedSubscriptions = [];

    for (const subscriptionId of Object.keys(this.subscriptions)) {
      const subscriptionParams = this.subscriptions[subscriptionId];
      const [queryType, queryFilter] = subscriptionParams;

      if (this.eventMatchesFilter(changeEvent, queryType, queryFilter || {
        topics: []
      })) {
        matchedSubscriptions.push(subscriptionId);
      }
    }

    return matchedSubscriptions;
  }

  getLogsForSubscription(subscriptionId) {
    const subscriptionParams = this.subscriptions[subscriptionId];
    const [_queryType, queryFilter] = subscriptionParams; // eslint-disable-line

    return this.getLogsFor(queryFilter);
  }

  transmit(result) {
    this.notificationCallbacks.forEach(callback => {
      if (result.params.result.raw) {
        result.params.result.data = result.params.result.raw.data;
        result.params.result.topics = result.params.result.raw.topics;
      }

      callback(result);
    });
  }

  addListener(_type, cb) {
    this.notificationCallbacks.push(cb);
  }

  subscribe(params) {
    const subscriptionId = '0x' + (0, crypto_1.randomBytes)(16).toString('hex');
    this.subscriptions[subscriptionId] = params;
    return subscriptionId;
  }

  unsubscribe(subscriptionId) {
    delete this.subscriptions[subscriptionId];
  }

  newFilter(filterType, params) {
    const filterId = '0x' + (0, crypto_1.randomBytes)(16).toString('hex');

    if (filterType === 'block' || filterType === 'pendingTransactions') {
      this.filters[filterId] = {
        filterType
      };
    }

    if (filterType === 'filter') {
      this.filters[filterId] = {
        filterType,
        params
      };
    }

    this.filterTracking[filterId] = {};
    return filterId;
  }

  uninstallFilter(filterId) {
    delete this.filters[filterId];
  }

  getLogsForFilter(filterId, logsOnly) {
    const {
      filterType,
      params
    } = this.filters[filterId];
    const tracking = this.filterTracking[filterId];

    if (logsOnly || filterType === 'filter') {
      return this.getLogsFor(params || {
        topics: []
      });
    }

    if (filterType === 'block') {
      const blocks = this.oldLogs.filter(x => x.type === 'block').filter(x => tracking.block === undefined || x.blockNumber >= tracking.block);
      tracking.block = blocks[blocks.length - 1];
      return blocks.map(block => '0x' + block.hash().toString('hex'));
    }

    if (filterType === 'pendingTransactions') {
      return [];
    }
  }

  getLogsByTxHash(hash) {
    return this.oldLogs.filter(log => '0x' + log.tx.hash().toString('hex') === hash).map(log => {
      return {
        logIndex: '0x1',
        blockNumber: log.blockNumber,
        blockHash: '0x' + log.block.hash().toString('hex'),
        transactionHash: '0x' + log.tx.hash().toString('hex'),
        transactionIndex: '0x' + log.txNumber.toString(16),
        // TODO: if it's a contract deploy, it should be that address instead
        address: log.log.address,
        data: log.log.data,
        topics: log.log.topics
      };
    });
  }

  getLogsFor(params) {
    const results = [];

    for (const log of this.oldLogs) {
      if (this.eventMatchesFilter(log, 'logs', params)) {
        results.push({
          logIndex: '0x1',
          blockNumber: log.blockNumber,
          blockHash: '0x' + log.block.hash().toString('hex'),
          transactionHash: '0x' + log.tx.hash().toString('hex'),
          transactionIndex: '0x' + log.txNumber.toString(16),
          // TODO: if it's a contract deploy, it should be that address instead
          address: log.log.address,
          data: log.log.data,
          topics: log.log.topics
        });
      }
    }

    return results;
  }

}

exports.LogsManager = LogsManager;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txExecution.js":
/*!****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/txExecution.js ***!
  \****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkVMError = exports.callFunction = exports.createContract = void 0;

const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");

const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");
/**
  * deploy the given contract
  *
  * @param {String} from    - sender address
  * @param {String} data    - data to send with the transaction ( return of txFormat.buildData(...) ).
  * @param {String} value    - decimal representation of value.
  * @param {String} gasLimit    - decimal representation of gas limit.
  * @param {Object} txRunner    - TxRunner.js instance
  * @param {Object} callbacks    - { confirmationCb, gasEstimationForceSend, promptCb }
  *     [validate transaction] confirmationCb (network, tx, gasEstimation, continueTxExecution, cancelCb)
  *     [transaction failed, force send] gasEstimationForceSend (error, continueTxExecution, cancelCb)
  *     [personal mode enabled, need password to continue] promptCb (okCb, cancelCb)
  * @param {Function} finalCallback    - last callback.
  */


function createContract(from, data, value, gasLimit, txRunner, callbacks, finalCallback) {
  if (!callbacks.confirmationCb || !callbacks.gasEstimationForceSend || !callbacks.promptCb) {
    return finalCallback('all the callbacks must have been defined');
  }

  const tx = {
    from: from,
    to: null,
    data: data,
    useCall: false,
    value: value,
    gasLimit: gasLimit
  };
  txRunner.rawRun(tx, callbacks.confirmationCb, callbacks.gasEstimationForceSend, callbacks.promptCb, (error, txResult) => {
    // see universaldapp.js line 660 => 700 to check possible values of txResult (error case)
    finalCallback(error, txResult);
  });
}

exports.createContract = createContract;
/**
  * call the current given contract ! that will create a transaction !
  *
  * @param {String} from    - sender address
  * @param {String} to    - recipient address
  * @param {String} data    - data to send with the transaction ( return of txFormat.buildData(...) ).
  * @param {String} value    - decimal representation of value.
  * @param {String} gasLimit    - decimal representation of gas limit.
  * @param {Object} txRunner    - TxRunner.js instance
  * @param {Object} callbacks    - { confirmationCb, gasEstimationForceSend, promptCb }
  *     [validate transaction] confirmationCb (network, tx, gasEstimation, continueTxExecution, cancelCb)
  *     [transaction failed, force send] gasEstimationForceSend (error, continueTxExecution, cancelCb)
  *     [personal mode enabled, need password to continue] promptCb (okCb, cancelCb)
  * @param {Function} finalCallback    - last callback.
  */

function callFunction(from, to, data, value, gasLimit, funAbi, txRunner, callbacks, finalCallback) {
  const useCall = funAbi.stateMutability === 'view' || funAbi.stateMutability === 'pure' || funAbi.constant;
  const tx = {
    from,
    to,
    data,
    useCall,
    value,
    gasLimit
  };
  txRunner.rawRun(tx, callbacks.confirmationCb, callbacks.gasEstimationForceSend, callbacks.promptCb, (error, txResult) => {
    // see universaldapp.js line 660 => 700 to check possible values of txResult (error case)
    finalCallback(error, txResult);
  });
}

exports.callFunction = callFunction;
/**
  * check if the vm has errored
  *
  * @param {Object} execResult    - execution result given by the VM
  * @return {Object} -  { error: true/false, message: DOMNode }
  */

function checkVMError(execResult, compiledContracts) {
  const errorCode = {
    OUT_OF_GAS: 'out of gas',
    STACK_UNDERFLOW: 'stack underflow',
    STACK_OVERFLOW: 'stack overflow',
    INVALID_JUMP: 'invalid JUMP',
    INVALID_OPCODE: 'invalid opcode',
    REVERT: 'revert',
    STATIC_STATE_CHANGE: 'static state change',
    INTERNAL_ERROR: 'internal error',
    CREATE_COLLISION: 'create collision',
    STOP: 'stop',
    REFUND_EXHAUSTED: 'refund exhausted'
  };
  const ret = {
    error: false,
    message: ''
  };

  if (!execResult.exceptionError) {
    return ret;
  }

  const exceptionError = execResult.exceptionError.error || '';
  const error = `VM error: ${exceptionError}.\n`;
  let msg;

  if (exceptionError === errorCode.INVALID_OPCODE) {
    msg = '\t\n\tThe execution might have thrown.\n';
    ret.error = true;
  } else if (exceptionError === errorCode.OUT_OF_GAS) {
    msg = '\tThe transaction ran out of gas. Please increase the Gas Limit.\n';
    ret.error = true;
  } else if (exceptionError === errorCode.REVERT) {
    const returnData = execResult.returnValue;
    const returnDataHex = returnData.slice(0, 4).toString('hex');
    let customError;

    if (compiledContracts) {
      let decodedCustomErrorInputsClean;

      for (const file of Object.keys(compiledContracts)) {
        for (const contractName of Object.keys(compiledContracts[file])) {
          const contract = compiledContracts[file][contractName];

          for (const item of contract.abi) {
            if (item.type === 'error') {
              // ethers doesn't crash anymore if "error" type is specified, but it doesn't extract the errors. see:
              // https://github.com/ethers-io/ethers.js/commit/bd05aed070ac9e1421a3e2bff2ceea150bedf9b7
              // we need here to fake the type, so the "getSighash" function works properly
              const fn = (0, txHelper_1.getFunctionFragment)(Object.assign(Object.assign({}, item), {
                type: 'function',
                stateMutability: 'nonpayable'
              }));
              if (!fn) continue;
              const sign = fn.getSighash(item.name);
              if (!sign) continue;

              if (returnDataHex === sign.replace('0x', '')) {
                customError = item.name;
                const functionDesc = fn.getFunction(item.name); // decoding error parameters

                const decodedCustomErrorInputs = fn.decodeFunctionData(functionDesc, returnData);
                decodedCustomErrorInputsClean = {};
                let devdoc = {}; // "contract" reprensents the compilation result containing the NATSPEC documentation

                if (contract && fn.functions && Object.keys(fn.functions).length) {
                  const functionSignature = Object.keys(fn.functions)[0]; // we check in the 'devdoc' if there's a developer documentation for this error

                  try {
                    devdoc = contract.devdoc.errors && contract.devdoc.errors[functionSignature][0] || {};
                  } catch (e) {
                    console.error(e.message);
                  } // we check in the 'userdoc' if there's an user documentation for this error


                  try {
                    const userdoc = contract.userdoc.errors && contract.userdoc.errors[functionSignature][0] || {};
                    if (userdoc && userdoc.notice) customError += ' : ' + userdoc.notice; // we append the user doc if any
                  } catch (e) {
                    console.error(e.message);
                  }
                }

                let inputIndex = 0;

                for (const input of functionDesc.inputs) {
                  const inputKey = input.name || inputIndex;
                  const v = decodedCustomErrorInputs[inputKey];
                  decodedCustomErrorInputsClean[inputKey] = {
                    value: v.toString ? v.toString() : v
                  };

                  if (devdoc && devdoc.params) {
                    decodedCustomErrorInputsClean[input.name].documentation = devdoc.params[inputKey]; // we add the developer documentation for this input parameter if any
                  }

                  inputIndex++;
                }

                break;
              }
            }
          }
        }
      }

      if (decodedCustomErrorInputsClean) {
        msg = '\tThe transaction has been reverted to the initial state.\nError provided by the contract:';
        msg += `\n${customError}`;
        msg += '\nParameters:';
        msg += `\n${JSON.stringify(decodedCustomErrorInputsClean, null, ' ')}`;
      }
    }

    if (!customError) {
      // It is the hash of Error(string)
      if (returnData && returnDataHex === '08c379a0') {
        const abiCoder = new ethers_1.ethers.utils.AbiCoder();
        const reason = abiCoder.decode(['string'], returnData.slice(4))[0];
        msg = `\tThe transaction has been reverted to the initial state.\nReason provided by the contract: "${reason}".`;
      } else {
        msg = '\tThe transaction has been reverted to the initial state.\nNote: The called function should be payable if you send value and the value you send should be less than your current balance.';
      }
    }

    ret.error = true;
  } else if (exceptionError === errorCode.STATIC_STATE_CHANGE) {
    msg = '\tState changes is not allowed in Static Call context\n';
    ret.error = true;
  }

  ret.message = `${error}\n${exceptionError}\n${msg}\nDebug the transaction to get more information.`;
  return ret;
}

exports.checkVMError = checkVMError;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txFormat.js":
/*!*************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/txFormat.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isArrayOrStringStart = exports.parseFunctionParams = exports.decodeResponse = exports.linkLibrary = exports.setLibraryAddress = exports.linkLibraryStandard = exports.linkLibraryStandardFromlinkReferences = exports.deployLibrary = exports.linkBytecode = exports.linkBytecodeLegacy = exports.linkBytecodeStandard = exports.atAddress = exports.buildData = exports.encodeConstructorCallAndDeployLibraries = exports.linkLibraries = exports.encodeConstructorCallAndLinkLibraries = exports.encodeFunctionCall = exports.encodeParams = exports.encodeData = void 0;

const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");

const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");

const async_1 = __webpack_require__(/*! async */ "../../../node_modules/async/dist/async.js");

const linker_1 = __webpack_require__(/*! solc/linker */ "../../../node_modules/solc/linker.js");

const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");
/**
  * build the transaction data
  *
  * @param {Object} function abi
  * @param {Object} values to encode
  * @param {String} contractbyteCode
  */


function encodeData(funABI, values, contractbyteCode) {
  let encoded;
  let encodedHex;

  try {
    encoded = (0, txHelper_1.encodeParams)(funABI, values);
    encodedHex = encoded.toString('hex');
  } catch (e) {
    return {
      error: 'cannot encode arguments'
    };
  }

  if (contractbyteCode) {
    return {
      data: '0x' + contractbyteCode + encodedHex.replace('0x', '')
    };
  } else {
    return {
      data: (0, txHelper_1.encodeFunctionId)(funABI) + encodedHex.replace('0x', '')
    };
  }
}

exports.encodeData = encodeData;
/**
* encode function / constructor parameters
*
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Function} callback    - callback
*/

function encodeParams(params, funAbi, callback) {
  let data = '';
  let dataHex = '';
  let funArgs = [];

  if (Array.isArray(params)) {
    funArgs = params;

    if (funArgs.length > 0) {
      try {
        data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
        dataHex = data.toString();
      } catch (e) {
        return callback('Error encoding arguments: ' + e);
      }
    }

    if (data.slice(0, 9) === 'undefined') {
      dataHex = data.slice(9);
    }

    if (data.slice(0, 2) === '0x') {
      dataHex = data.slice(2);
    }
  } else if (params.indexOf('raw:0x') === 0) {
    // in that case we consider that the input is already encoded and *does not* contain the method signature
    dataHex = params.replace('raw:0x', '');
    data = Buffer.from(dataHex, 'hex');
  } else {
    try {
      funArgs = parseFunctionParams(params);
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }

    try {
      if (funArgs.length > 0) {
        data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
        dataHex = data.toString();
      }
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }

    if (data.slice(0, 9) === 'undefined') {
      dataHex = data.slice(9);
    }

    if (data.slice(0, 2) === '0x') {
      dataHex = data.slice(2);
    }
  }

  callback(null, {
    data: data,
    dataHex: dataHex,
    funArgs: funArgs
  });
}

exports.encodeParams = encodeParams;
/**
* encode function call (function id + encoded parameters)
*
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Function} callback    - callback
*/

function encodeFunctionCall(params, funAbi, callback) {
  encodeParams(params, funAbi, (error, encodedParam) => {
    if (error) return callback(error);
    callback(null, {
      dataHex: (0, txHelper_1.encodeFunctionId)(funAbi) + encodedParam.dataHex,
      funAbi,
      funArgs: encodedParam.funArgs
    });
  });
}

exports.encodeFunctionCall = encodeFunctionCall;
/**
* encode constructor creation and link with provided libraries if needed
*
* @param {Object} contract    - input paramater of the function to call
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Object} linkLibraries    - contains {linkReferences} object which list all the addresses to be linked
* @param {Object} linkReferences    - given by the compiler, contains the proper linkReferences
* @param {Function} callback    - callback
*/

function encodeConstructorCallAndLinkLibraries(contract, params, funAbi, linkLibrariesAddresses, linkReferences, callback) {
  encodeParams(params, funAbi, (error, encodedParam) => {
    if (error) return callback(error);
    linkLibraries(contract, linkLibrariesAddresses, linkReferences, (error, bytecodeToDeploy) => {
      callback(error, {
        dataHex: bytecodeToDeploy + encodedParam.dataHex,
        funAbi,
        funArgs: encodedParam.funArgs,
        contractBytecode: contract.evm.bytecode.object
      });
    });
  });
}

exports.encodeConstructorCallAndLinkLibraries = encodeConstructorCallAndLinkLibraries;
/**
* link with provided libraries if needed
*
* @param {Object} contract    - input paramater of the function to call
* @param {Object} linkLibraries    - contains {linkReferences} object which list all the addresses to be linked
* @param {Object} linkReferences    - given by the compiler, contains the proper linkReferences
* @param {Function} callback    - callback
*/

function linkLibraries(contract, linkLibraries, linkReferences, callback) {
  let bytecodeToDeploy = contract.evm.bytecode.object;

  if (bytecodeToDeploy.indexOf('_') >= 0) {
    if (linkLibraries && linkReferences) {
      for (const libFile in linkLibraries) {
        for (const lib in linkLibraries[libFile]) {
          const address = linkLibraries[libFile][lib];
          if (!(0, ethereumjs_util_1.isValidAddress)(address)) return callback(address + ' is not a valid address. Please check the provided address is valid.');
          bytecodeToDeploy = linkLibraryStandardFromlinkReferences(lib, address.replace('0x', ''), bytecodeToDeploy, linkReferences);
        }
      }
    }
  }

  if (bytecodeToDeploy.indexOf('_') >= 0) {
    return callback('Failed to link some libraries');
  }

  return callback(null, bytecodeToDeploy);
}

exports.linkLibraries = linkLibraries;
/**
* encode constructor creation and deploy librairies if needed
*
* @param {String} contractName    - current contract name
* @param {Object} contract    - input paramater of the function to call
* @param {Object} contracts    - map of all compiled contracts.
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Function} callback    - callback
* @param {Function} callbackStep  - callbackStep
* @param {Function} callbackDeployLibrary  - callbackDeployLibrary
* @param {Function} callback    - callback
*/

function encodeConstructorCallAndDeployLibraries(contractName, contract, contracts, params, funAbi, callback, callbackStep, callbackDeployLibrary) {
  encodeParams(params, funAbi, (error, encodedParam) => {
    if (error) return callback(error);
    let dataHex = '';
    const contractBytecode = contract.evm.bytecode.object;
    let bytecodeToDeploy = contract.evm.bytecode.object;

    if (bytecodeToDeploy.indexOf('_') >= 0) {
      linkBytecode(contract, contracts, (err, bytecode) => {
        if (err) {
          callback('Error deploying required libraries: ' + err);
        } else {
          bytecodeToDeploy = bytecode + dataHex;
          return callback(null, {
            dataHex: bytecodeToDeploy,
            funAbi,
            funArgs: encodedParam.funArgs,
            contractBytecode,
            contractName: contractName
          });
        }
      }, callbackStep, callbackDeployLibrary);
      return;
    } else {
      dataHex = bytecodeToDeploy + encodedParam.dataHex;
    }

    callback(null, {
      dataHex: bytecodeToDeploy,
      funAbi,
      funArgs: encodedParam.funArgs,
      contractBytecode,
      contractName: contractName
    });
  });
}

exports.encodeConstructorCallAndDeployLibraries = encodeConstructorCallAndDeployLibraries;
/**
* (DEPRECATED) build the transaction data
*
* @param {String} contractName
* @param {Object} contract    - abi definition of the current contract.
* @param {Object} contracts    - map of all compiled contracts.
* @param {Bool} isConstructor    - isConstructor.
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Object} params    - input paramater of the function to call
* @param {Function} callback    - callback
* @param {Function} callbackStep  - callbackStep
* @param {Function} callbackDeployLibrary  - callbackDeployLibrary
*/

function buildData(contractName, contract, contracts, isConstructor, funAbi, params, callback, callbackStep, callbackDeployLibrary) {
  let funArgs = [];
  let data = '';
  let dataHex = '';

  if (params.indexOf('raw:0x') === 0) {
    // in that case we consider that the input is already encoded and *does not* contain the method signature
    dataHex = params.replace('raw:0x', '');
    data = Buffer.from(dataHex, 'hex');
  } else {
    try {
      if (params.length > 0) {
        funArgs = parseFunctionParams(params);
      }
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }

    try {
      data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
      dataHex = data.toString();
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }

    if (data.slice(0, 9) === 'undefined') {
      dataHex = data.slice(9);
    }

    if (data.slice(0, 2) === '0x') {
      dataHex = data.slice(2);
    }
  }

  let contractBytecode;

  if (isConstructor) {
    contractBytecode = contract.evm.bytecode.object;
    let bytecodeToDeploy = contract.evm.bytecode.object;

    if (bytecodeToDeploy.indexOf('_') >= 0) {
      linkBytecode(contract, contracts, (err, bytecode) => {
        if (err) {
          callback('Error deploying required libraries: ' + err);
        } else {
          bytecodeToDeploy = bytecode + dataHex;
          return callback(null, {
            dataHex: bytecodeToDeploy,
            funAbi,
            funArgs,
            contractBytecode,
            contractName: contractName
          });
        }
      }, callbackStep, callbackDeployLibrary);
      return;
    } else {
      dataHex = bytecodeToDeploy + dataHex;
    }
  } else {
    dataHex = (0, txHelper_1.encodeFunctionId)(funAbi) + dataHex;
  }

  callback(null, {
    dataHex,
    funAbi,
    funArgs,
    contractBytecode,
    contractName: contractName
  });
}

exports.buildData = buildData;

function atAddress() {}

exports.atAddress = atAddress;

function linkBytecodeStandard(contract, contracts, callback, callbackStep, callbackDeployLibrary) {
  let contractBytecode = contract.evm.bytecode.object;
  (0, async_1.eachOfSeries)(contract.evm.bytecode.linkReferences, (libs, file, cbFile) => {
    (0, async_1.eachOfSeries)(contract.evm.bytecode.linkReferences[file], (libRef, libName, cbLibDeployed) => {
      const library = contracts[file][libName];

      if (library) {
        deployLibrary(file + ':' + libName, libName, library, contracts, (error, address) => {
          if (error) {
            return cbLibDeployed(error);
          }

          let hexAddress = address.toString('hex');

          if (hexAddress.slice(0, 2) === '0x') {
            hexAddress = hexAddress.slice(2);
          }

          contractBytecode = linkLibraryStandard(libName, hexAddress, contractBytecode, contract);
          cbLibDeployed();
        }, callbackStep, callbackDeployLibrary);
      } else {
        cbLibDeployed('Cannot find compilation data of library ' + libName);
      }
    }, error => {
      cbFile(error);
    });
  }, error => {
    if (error) {
      callbackStep(error);
    }

    callback(error, contractBytecode);
  });
}

exports.linkBytecodeStandard = linkBytecodeStandard;

function linkBytecodeLegacy(contract, contracts, callback, callbackStep, callbackDeployLibrary) {
  const libraryRefMatch = contract.evm.bytecode.object.match(/__([^_]{1,36})__/);

  if (!libraryRefMatch) {
    return callback('Invalid bytecode format.');
  }

  const libraryName = libraryRefMatch[1]; // file_name:library_name

  const libRef = libraryName.match(/(.*):(.*)/);

  if (!libRef) {
    return callback('Cannot extract library reference ' + libraryName);
  }

  if (!contracts[libRef[1]] || !contracts[libRef[1]][libRef[2]]) {
    return callback('Cannot find library reference ' + libraryName);
  }

  const libraryShortName = libRef[2];
  const library = contracts[libRef[1]][libraryShortName];

  if (!library) {
    return callback('Library ' + libraryName + ' not found.');
  }

  deployLibrary(libraryName, libraryShortName, library, contracts, (err, address) => {
    if (err) {
      return callback(err);
    }

    let hexAddress = address.toString('hex');

    if (hexAddress.slice(0, 2) === '0x') {
      hexAddress = hexAddress.slice(2);
    }

    contract.evm.bytecode.object = linkLibrary(libraryName, hexAddress, contract.evm.bytecode.object);
    linkBytecode(contract, contracts, callback, callbackStep, callbackDeployLibrary);
  }, callbackStep, callbackDeployLibrary);
}

exports.linkBytecodeLegacy = linkBytecodeLegacy;

function linkBytecode(contract, contracts, callback, callbackStep, callbackDeployLibrary) {
  if (contract.evm.bytecode.object.indexOf('_') < 0) {
    return callback(null, contract.evm.bytecode.object);
  }

  if (contract.evm.bytecode.linkReferences && Object.keys(contract.evm.bytecode.linkReferences).length) {
    linkBytecodeStandard(contract, contracts, callback, callbackStep, callbackDeployLibrary);
  } else {
    linkBytecodeLegacy(contract, contracts, callback, callbackStep, callbackDeployLibrary);
  }
}

exports.linkBytecode = linkBytecode;

function deployLibrary(libraryName, libraryShortName, library, contracts, callback, callbackStep, callbackDeployLibrary) {
  const address = library.address;

  if (address) {
    return callback(null, address);
  }

  const bytecode = library.evm.bytecode.object;

  if (bytecode.indexOf('_') >= 0) {
    linkBytecode(library, contracts, (err, bytecode) => {
      if (err) callback(err);else {
        library.evm.bytecode.object = bytecode;
        deployLibrary(libraryName, libraryShortName, library, contracts, callback, callbackStep, callbackDeployLibrary);
      }
    }, callbackStep, callbackDeployLibrary);
  } else {
    callbackStep(`creation of library ${libraryName} pending...`);
    const data = {
      dataHex: bytecode,
      funAbi: {
        type: 'constructor'
      },
      funArgs: [],
      contractBytecode: bytecode,
      contractName: libraryShortName,
      contractABI: library.abi
    };
    callbackDeployLibrary({
      data: data,
      useCall: false
    }, (err, txResult) => {
      if (err) {
        return callback(err);
      }

      const address = txResult.receipt.contractAddress;
      library.address = address;
      callback(err, address);
    });
  }
}

exports.deployLibrary = deployLibrary;

function linkLibraryStandardFromlinkReferences(libraryName, address, bytecode, linkReferences) {
  for (const file in linkReferences) {
    for (const libName in linkReferences[file]) {
      if (libraryName === libName) {
        bytecode = setLibraryAddress(address, bytecode, linkReferences[file][libName]);
      }
    }
  }

  return bytecode;
}

exports.linkLibraryStandardFromlinkReferences = linkLibraryStandardFromlinkReferences;

function linkLibraryStandard(libraryName, address, bytecode, contract) {
  return linkLibraryStandardFromlinkReferences(libraryName, address, bytecode, contract.evm.bytecode.linkReferences);
}

exports.linkLibraryStandard = linkLibraryStandard;

function setLibraryAddress(address, bytecodeToLink, positions) {
  if (positions) {
    for (const pos of positions) {
      const regpos = bytecodeToLink.match(new RegExp(`(.{${2 * pos.start}})(.{${2 * pos.length}})(.*)`));

      if (regpos) {
        bytecodeToLink = regpos[1] + address + regpos[3];
      }
    }
  }

  return bytecodeToLink;
}

exports.setLibraryAddress = setLibraryAddress;

function linkLibrary(libraryName, address, bytecodeToLink) {
  return (0, linker_1.linkBytecode)(bytecodeToLink, {
    [libraryName]: (0, ethereumjs_util_1.addHexPrefix)(address)
  });
}

exports.linkLibrary = linkLibrary;

function decodeResponse(response, fnabi) {
  // Only decode if there supposed to be fields
  if (fnabi.outputs && fnabi.outputs.length > 0) {
    try {
      let i;
      const outputTypes = [];

      for (i = 0; i < fnabi.outputs.length; i++) {
        const type = fnabi.outputs[i].type;
        outputTypes.push(type.indexOf('tuple') === 0 ? (0, txHelper_1.makeFullTypeDefinition)(fnabi.outputs[i]) : type);
      }

      if (!response || !response.length) response = new Uint8Array(32 * fnabi.outputs.length); // ensuring the data is at least filled by 0 cause `AbiCoder` throws if there's not engouh data
      // decode data

      const abiCoder = new ethers_1.ethers.utils.AbiCoder();
      const decodedObj = abiCoder.decode(outputTypes, response);
      const json = {};

      for (i = 0; i < outputTypes.length; i++) {
        const name = fnabi.outputs[i].name;
        json[i] = outputTypes[i] + ': ' + (name ? name + ' ' + decodedObj[i] : decodedObj[i]);
      }

      return json;
    } catch (e) {
      return {
        error: 'Failed to decode output: ' + e
      };
    }
  }

  return {};
}

exports.decodeResponse = decodeResponse;

function parseFunctionParams(params) {
  const args = []; // Check if parameter string starts with array or string

  let startIndex = isArrayOrStringStart(params, 0) ? -1 : 0;

  for (let i = 0; i < params.length; i++) {
    // If a quote is received
    if (params.charAt(i) === '"') {
      startIndex = -1;
      let endQuoteIndex = false; // look for closing quote. On success, push the complete string in arguments list

      for (let j = i + 1; !endQuoteIndex; j++) {
        if (params.charAt(j) === '"') {
          args.push(params.substring(i + 1, j));
          endQuoteIndex = true;
          i = j;
        } // Throw error if end of params string is arrived but couldn't get end quote


        if (!endQuoteIndex && j === params.length - 1) {
          throw new Error('invalid params');
        }
      }
    } else if (params.charAt(i) === '[') {
      // If an array/struct opening bracket is received
      startIndex = -1;
      let bracketCount = 1;
      let j;

      for (j = i + 1; bracketCount !== 0; j++) {
        // Increase count if another array opening bracket is received (To handle nested array)
        if (params.charAt(j) === '[') {
          bracketCount++;
        } else if (params.charAt(j) === ']') {
          // // Decrease count if an array closing bracket is received (To handle nested array)
          bracketCount--;
        } // Throw error if end of params string is arrived but couldn't get end of tuple


        if (bracketCount !== 0 && j === params.length - 1) {
          throw new Error('invalid tuple params');
        }

        if (bracketCount === 0) break;
      }

      args.push(parseFunctionParams(params.substring(i + 1, j)));
      i = j - 1;
    } else if (params.charAt(i) === ',' || i === params.length - 1) {
      // , or end of string
      // if startIndex >= 0, it means a parameter was being parsed, it can be first or other parameter
      if (startIndex >= 0) {
        let param = params.substring(startIndex, i === params.length - 1 ? undefined : i);
        const trimmed = param.trim();
        if (param.startsWith('0x')) param = `${param}`;
        if (/[0-9]/g.test(trimmed)) param = `${trimmed}`;

        if (typeof param === 'string') {
          if (trimmed === 'true') param = true;
          if (trimmed === 'false') param = false;
        }

        args.push(param);
      } // Register start index of a parameter to parse


      startIndex = isArrayOrStringStart(params, i + 1) ? -1 : i + 1;
    }
  }

  return args;
}

exports.parseFunctionParams = parseFunctionParams;

function isArrayOrStringStart(str, index) {
  return str.charAt(index) === '"' || str.charAt(index) === '[';
}

exports.isArrayOrStringStart = isArrayOrStringStart;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/node-libs-browser/node_modules/buffer/index.js */ "../../../node_modules/node-libs-browser/node_modules/buffer/index.js").Buffer))

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txHelper.js":
/*!*************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/txHelper.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inputParametersDeclarationToString = exports.visitContracts = exports.getContract = exports.getReceiveInterface = exports.getFallbackInterface = exports.getFunction = exports.extractSize = exports.serializeInputs = exports.getConstructorInterface = exports.sortAbiFunction = exports.getFunctionFragment = exports.encodeFunctionId = exports.encodeParams = exports.makeFullTypeDefinition = void 0;

const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");

function makeFullTypeDefinition(typeDef) {
  if (typeDef && typeDef.type.indexOf('tuple') === 0 && typeDef.components) {
    const innerTypes = typeDef.components.map(innerType => {
      return makeFullTypeDefinition(innerType);
    });
    return `tuple(${innerTypes.join(',')})${extractSize(typeDef.type)}`;
  }

  return typeDef.type;
}

exports.makeFullTypeDefinition = makeFullTypeDefinition;

function encodeParams(funABI, args) {
  const types = [];

  if (funABI.inputs && funABI.inputs.length) {
    for (let i = 0; i < funABI.inputs.length; i++) {
      const type = funABI.inputs[i].type; // "false" will be converting to `false` and "true" will be working
      // fine as abiCoder assume anything in quotes as `true`

      if (type === 'bool' && args[i] === 'false') {
        args[i] = false;
      }

      types.push(type.indexOf('tuple') === 0 ? makeFullTypeDefinition(funABI.inputs[i]) : type);

      if (args.length < types.length) {
        args.push('');
      }
    }
  } // NOTE: the caller will concatenate the bytecode and this
  //       it could be done here too for consistency


  const abiCoder = new ethers_1.ethers.utils.AbiCoder();
  return abiCoder.encode(types, args);
}

exports.encodeParams = encodeParams;

function encodeFunctionId(funABI) {
  if (funABI.type === 'fallback' || funABI.type === 'receive') return '0x';
  const abi = new ethers_1.ethers.utils.Interface([funABI]);
  return abi.getSighash(funABI.name);
}

exports.encodeFunctionId = encodeFunctionId;

function getFunctionFragment(funABI) {
  if (funABI.type === 'fallback' || funABI.type === 'receive') return null;
  return new ethers_1.ethers.utils.Interface([funABI]);
}

exports.getFunctionFragment = getFunctionFragment;

function sortAbiFunction(contractabi) {
  // Check if function is constant (introduced with Solidity 0.6.0)
  const isConstant = ({
    stateMutability
  }) => stateMutability === 'view' || stateMutability === 'pure'; // Sorts the list of ABI entries. Constant functions will appear first,
  // followed by non-constant functions. Within those t wo groupings, functions
  // will be sorted by their names.


  return contractabi.sort(function (a, b) {
    if (isConstant(a) && !isConstant(b)) {
      return 1;
    } else if (isConstant(b) && !isConstant(a)) {
      return -1;
    } // If we reach here, either a and b are both constant or both not; sort by name then
    // special case for fallback, receive and constructor function


    if (a.type === 'function' && typeof a.name !== 'undefined') {
      return a.name.localeCompare(b.name);
    } else if (a.type === 'constructor' || a.type === 'fallback' || a.type === 'receive') {
      return 1;
    }
  });
}

exports.sortAbiFunction = sortAbiFunction;

function getConstructorInterface(abi) {
  const funABI = {
    name: '',
    inputs: [],
    type: 'constructor',
    payable: false,
    outputs: []
  };

  if (typeof abi === 'string') {
    try {
      abi = JSON.parse(abi);
    } catch (e) {
      console.log('exception retrieving ctor abi ' + abi);
      return funABI;
    }
  }

  for (let i = 0; i < abi.length; i++) {
    if (abi[i].type === 'constructor') {
      funABI.inputs = abi[i].inputs || [];
      funABI.payable = abi[i].payable;
      funABI['stateMutability'] = abi[i].stateMutability;
      break;
    }
  }

  return funABI;
}

exports.getConstructorInterface = getConstructorInterface;

function serializeInputs(fnAbi) {
  let serialized = '(';

  if (fnAbi.inputs && fnAbi.inputs.length) {
    serialized += fnAbi.inputs.map(input => {
      return input.type;
    }).join(',');
  }

  serialized += ')';
  return serialized;
}

exports.serializeInputs = serializeInputs;

function extractSize(type) {
  const size = type.match(/([a-zA-Z0-9])(\[.*\])/);
  return size ? size[2] : '';
}

exports.extractSize = extractSize;

function getFunction(abi, fnName) {
  for (let i = 0; i < abi.length; i++) {
    const fn = abi[i];

    if (fn.type === 'function' && fnName === fn.name + '(' + fn.inputs.map(value => {
      if (value.components) {
        const fullType = makeFullTypeDefinition(value);
        return fullType.replace(/tuple/g, ''); // return of makeFullTypeDefinition might contain `tuple`, need to remove it cause `methodIdentifier` (fnName) does not include `tuple` keyword
      } else {
        return value.type;
      }
    }).join(',') + ')') {
      return fn;
    }
  }

  return null;
}

exports.getFunction = getFunction;

function getFallbackInterface(abi) {
  for (let i = 0; i < abi.length; i++) {
    if (abi[i].type === 'fallback') {
      return abi[i];
    }
  }
}

exports.getFallbackInterface = getFallbackInterface;

function getReceiveInterface(abi) {
  for (let i = 0; i < abi.length; i++) {
    if (abi[i].type === 'receive') {
      return abi[i];
    }
  }
}

exports.getReceiveInterface = getReceiveInterface;
/**
  * return the contract obj of the given @arg name. Uses last compilation result.
  * return null if not found
  * @param {String} name    - contract name
  * @returns contract obj and associated file: { contract, file } or null
  */

function getContract(contractName, contracts) {
  for (const file in contracts) {
    if (contracts[file][contractName]) {
      return {
        object: contracts[file][contractName],
        file: file
      };
    }
  }

  return null;
}

exports.getContract = getContract;
/**
  * call the given @arg cb (function) for all the contracts. Uses last compilation result
  * stop visiting when cb return true
  * @param {Function} cb    - callback
  */

function visitContracts(contracts, cb) {
  for (const file in contracts) {
    for (const name in contracts[file]) {
      if (cb({
        name: name,
        object: contracts[file][name],
        file: file
      })) return;
    }
  }
}

exports.visitContracts = visitContracts;

function inputParametersDeclarationToString(abiinputs) {
  const inputs = (abiinputs || []).map(inp => inp.type + ' ' + inp.name);
  return inputs.join(', ');
}

exports.inputParametersDeclarationToString = inputParametersDeclarationToString;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txListener.js":
/*!***************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/txListener.js ***!
  \***************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxListener = void 0;

const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");

const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");

const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");

const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");

const util_1 = __webpack_require__(/*! ../util */ "../../../dist/libs/remix-lib/src/util.js");

const txFormat_1 = __webpack_require__(/*! ./txFormat */ "../../../dist/libs/remix-lib/src/execution/txFormat.js");

const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");

function addExecutionCosts(txResult, tx, execResult) {
  if (txResult) {
    if (execResult) {
      tx.returnValue = execResult.returnValue;
      if (execResult.gasUsed) tx.executionCost = execResult.gasUsed.toString(10);
    }

    if (txResult.receipt && txResult.receipt.gasUsed) tx.transactionCost = txResult.receipt.gasUsed.toString(10);
  }
}
/**
  * poll web3 each 2s if web3
  * listen on transaction executed event if VM
  * attention: blocks returned by the event `newBlock` have slightly different json properties whether web3 or the VM is used
  * trigger 'newBlock'
  *
  */


class TxListener {
  constructor(opt, executionContext) {
    this.event = new eventManager_1.EventManager(); // has a default for now for backwards compatability

    this.executionContext = executionContext;
    this._api = opt.api;
    this._resolvedTransactions = {};
    this._resolvedContracts = {};
    this._isListening = false;
    this._listenOnNetwork = false;
    this._loopId = null;
    this.init();
    this.executionContext.event.register('contextChanged', context => {
      if (this._isListening) {
        this.stopListening();
        this.startListening();
      }
    });
    opt.event.udapp.register('callExecuted', (error, from, to, data, lookupOnly, txResult) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      if (error) return; // we go for that case if
      // in VM mode
      // in web3 mode && listen remix txs only

      if (!this._isListening) return; // we don't listen

      if (this._loopId) return; // we seems to already listen on a "web3" network

      let returnValue;
      let execResult;

      if (this.executionContext.isVM()) {
        execResult = yield this.executionContext.web3().eth.getExecutionResultFromSimulator(txResult.transactionHash);
        returnValue = execResult.returnValue;
      } else {
        returnValue = (0, ethereumjs_util_1.toBuffer)((0, ethereumjs_util_1.addHexPrefix)(txResult.result));
      }

      const call = {
        from: from,
        to: to,
        input: data,
        hash: txResult.transactionHash ? txResult.transactionHash : 'call' + (from || '') + to + data,
        isCall: true,
        returnValue,
        envMode: this.executionContext.getProvider()
      };
      addExecutionCosts(txResult, call, execResult);

      this._resolveTx(call, call, (error, resolvedData) => {
        if (!error) {
          this.event.trigger('newCall', [call]);
        }
      });
    }));
    opt.event.udapp.register('transactionExecuted', (error, from, to, data, lookupOnly, txResult) => {
      if (error) return;
      if (lookupOnly) return; // we go for that case if
      // in VM mode
      // in web3 mode && listen remix txs only

      if (!this._isListening) return; // we don't listen

      if (this._loopId) return; // we seems to already listen on a "web3" network

      this.executionContext.web3().eth.getTransaction(txResult.transactionHash, (error, tx) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        if (error) return console.log(error);
        let execResult;

        if (this.executionContext.isVM()) {
          execResult = yield this.executionContext.web3().eth.getExecutionResultFromSimulator(txResult.transactionHash);
        }

        addExecutionCosts(txResult, tx, execResult);
        tx.envMode = this.executionContext.getProvider();
        tx.status = txResult.receipt.status; // 0x0 or 0x1

        this._resolve([tx]);
      }));
    });
  }
  /**
    * define if txlistener should listen on the network or if only tx created from remix are managed
    *
    * @param {Bool} type - true if listen on the network
    */


  setListenOnNetwork(listenOnNetwork) {
    this._listenOnNetwork = listenOnNetwork;

    if (this._loopId) {
      clearInterval(this._loopId);
    }

    this._listenOnNetwork ? this.startListening() : this.stopListening();
  }
  /**
    * reset recorded transactions
    */


  init() {
    this.blocks = [];
  }
  /**
    * start listening for incoming transactions
    *
    * @param {String} type - type/name of the provider to add
    * @param {Object} obj  - provider
    */


  startListening() {
    this.init();
    this._isListening = true;

    if (this._listenOnNetwork && this.executionContext.getProvider() !== 'vm') {
      this._startListenOnNetwork();
    }
  }
  /**
    * stop listening for incoming transactions. do not reset the recorded pool.
    *
    * @param {String} type - type/name of the provider to add
    * @param {Object} obj  - provider
    */


  stopListening() {
    if (this._loopId) {
      clearInterval(this._loopId);
    }

    this._loopId = null;
    this._isListening = false;
  }

  _startListenOnNetwork() {
    var _a;

    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      let lastSeenBlock = ((_a = this.executionContext.lastBlock) === null || _a === void 0 ? void 0 : _a.number) - 1;
      let processingBlock = false;

      const processBlocks = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        var _b, _c;

        if (!this._isListening) return;
        if (processingBlock) return;
        processingBlock = true;
        const currentLoopId = this._loopId;

        if (this._loopId === null) {
          processingBlock = false;
          return;
        }

        if (!lastSeenBlock) {
          lastSeenBlock = (_b = this.executionContext.lastBlock) === null || _b === void 0 ? void 0 : _b.number; // trying to resynchronize

          console.log('listen on blocks, resynchronising');
          processingBlock = false;
          return;
        }

        const current = (_c = this.executionContext.lastBlock) === null || _c === void 0 ? void 0 : _c.number;

        if (!current) {
          console.log(new Error('no last block found'));
          processingBlock = false;
          return;
        }

        if (currentLoopId === this._loopId && lastSeenBlock < current) {
          while (lastSeenBlock <= current) {
            try {
              if (!this._isListening) break;
              yield this._manageBlock(lastSeenBlock);
            } catch (e) {
              console.log(e);
            }

            lastSeenBlock++;
          }

          lastSeenBlock = current;
        }

        processingBlock = false;
      });

      this._loopId = setInterval(processBlocks, 20000);
      processBlocks();
    });
  }

  _manageBlock(blockNumber) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const result = yield this.executionContext.web3().eth.getBlock(blockNumber, true);
        return yield this._newBlock(Object.assign({
          type: 'web3'
        }, result));
      } catch (e) {}
    });
  }
  /**
    * try to resolve the contract name from the given @arg address
    *
    * @param {String} address - contract address to resolve
    * @return {String} - contract name
    */


  resolvedContract(address) {
    if (this._resolvedContracts[address]) return this._resolvedContracts[address].name;
    return null;
  }
  /**
    * try to resolve the transaction from the given @arg txHash
    *
    * @param {String} txHash - contract address to resolve
    * @return {String} - contract name
    */


  resolvedTransaction(txHash) {
    return this._resolvedTransactions[txHash];
  }

  _newBlock(block) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      this.blocks.push(block);
      yield this._resolve(block.transactions);
      this.event.trigger('newBlock', [block]);
    });
  }

  _resolveAsync(tx) {
    return new Promise((resolve, reject) => {
      this._api.resolveReceipt(tx, (error, receipt) => {
        if (error) return reject(error);

        this._resolveTx(tx, receipt, (error, resolvedData) => {
          if (error) return reject(error);

          if (resolvedData) {
            this.event.trigger('txResolved', [tx, receipt, resolvedData]);
          }

          this.event.trigger('newTransaction', [tx, receipt]);
          resolve({});
        });
      });
    });
  }

  _resolve(transactions) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      for (const tx of transactions) {
        try {
          if (!this._isListening) break;
          yield this._resolveAsync(tx);
        } catch (e) {}
      }
    });
  }

  _resolveTx(tx, receipt, cb) {
    const contracts = this._api.contracts();

    if (!contracts) return cb();
    let fun;
    let contract;

    if (!tx.to || tx.to === '0x0') {
      // testrpc returns 0x0 in that case
      // contract creation / resolve using the creation bytes code
      // if web3: we have to call getTransactionReceipt to get the created address
      // if VM: created address already included
      const code = tx.input;
      contract = this._tryResolveContract(code, contracts, true);

      if (contract) {
        const address = receipt.contractAddress;
        this._resolvedContracts[address] = contract;
        fun = this._resolveFunction(contract, tx, true);

        if (this._resolvedTransactions[tx.hash]) {
          this._resolvedTransactions[tx.hash].contractAddress = address;
        }

        return cb(null, {
          to: null,
          contractName: contract.name,
          function: fun,
          creationAddress: address
        });
      }

      return cb();
    } else {
      // first check known contract, resolve against the `runtimeBytecode` if not known
      contract = this._resolvedContracts[tx.to];

      if (!contract) {
        this.executionContext.web3().eth.getCode(tx.to, (error, code) => {
          if (error) return cb(error);

          if (code) {
            const contract = this._tryResolveContract(code, contracts, false);

            if (contract) {
              this._resolvedContracts[tx.to] = contract;

              const fun = this._resolveFunction(contract, tx, false);

              return cb(null, {
                to: tx.to,
                contractName: contract.name,
                function: fun
              });
            }
          }

          return cb();
        });
        return;
      }

      if (contract) {
        fun = this._resolveFunction(contract, tx, false);
        return cb(null, {
          to: tx.to,
          contractName: contract.name,
          function: fun
        });
      }

      return cb();
    }
  }

  _resolveFunction(contract, tx, isCtor) {
    if (!contract) {
      console.log('txListener: cannot resolve contract - contract is null');
      return;
    }

    const abi = contract.object.abi;
    const inputData = tx.input.replace('0x', '');

    if (!isCtor) {
      const methodIdentifiers = contract.object.evm.methodIdentifiers;

      for (const fn in methodIdentifiers) {
        if (methodIdentifiers[fn] === inputData.substring(0, 8)) {
          const fnabi = (0, txHelper_1.getFunction)(abi, fn);
          this._resolvedTransactions[tx.hash] = {
            contractName: contract.name,
            to: tx.to,
            fn: fn,
            params: this._decodeInputParams(inputData.substring(8), fnabi)
          };

          if (tx.returnValue) {
            this._resolvedTransactions[tx.hash].decodedReturnValue = (0, txFormat_1.decodeResponse)(tx.returnValue, fnabi);
          }

          return this._resolvedTransactions[tx.hash];
        }
      } // receive function


      if (!inputData && (0, txHelper_1.getReceiveInterface)(abi)) {
        this._resolvedTransactions[tx.hash] = {
          contractName: contract.name,
          to: tx.to,
          fn: '(receive)',
          params: null
        };
      } else {
        // fallback function
        this._resolvedTransactions[tx.hash] = {
          contractName: contract.name,
          to: tx.to,
          fn: '(fallback)',
          params: null
        };
      }
    } else {
      const bytecode = contract.object.evm.bytecode.object;
      let params = null;

      if (bytecode && bytecode.length) {
        params = this._decodeInputParams(inputData.substring(bytecode.length), (0, txHelper_1.getConstructorInterface)(abi));
      }

      this._resolvedTransactions[tx.hash] = {
        contractName: contract.name,
        to: null,
        fn: '(constructor)',
        params: params
      };
    }

    return this._resolvedTransactions[tx.hash];
  }

  _tryResolveContract(codeToResolve, compiledContracts, isCreation) {
    let found = null;
    (0, txHelper_1.visitContracts)(compiledContracts, contract => {
      const bytes = isCreation ? contract.object.evm.bytecode.object : contract.object.evm.deployedBytecode.object;

      if ((0, util_1.compareByteCode)(codeToResolve, '0x' + bytes)) {
        found = contract;
        return true;
      }
    });
    return found;
  }

  _decodeInputParams(data, abi) {
    data = (0, ethereumjs_util_1.toBuffer)((0, ethereumjs_util_1.addHexPrefix)(data));
    if (!data.length) data = new Uint8Array(32 * abi.inputs.length); // ensuring the data is at least filled by 0 cause `AbiCoder` throws if there's not engouh data

    const inputTypes = [];

    for (let i = 0; i < abi.inputs.length; i++) {
      const type = abi.inputs[i].type;
      inputTypes.push(type.indexOf('tuple') === 0 ? (0, txHelper_1.makeFullTypeDefinition)(abi.inputs[i]) : type);
    }

    const abiCoder = new ethers_1.ethers.utils.AbiCoder();
    const decoded = abiCoder.decode(inputTypes, data);
    const ret = {};

    for (const k in abi.inputs) {
      ret[abi.inputs[k].type + ' ' + abi.inputs[k].name] = decoded[k];
    }

    return ret;
  }

}

exports.TxListener = TxListener;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txRunner.js":
/*!*************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/txRunner.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxRunner = void 0;

const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");

class TxRunner {
  constructor(internalRunner, opt) {
    this.opt = opt || {};
    this.internalRunner = internalRunner;
    this.event = new eventManager_1.EventManager();
    this.runAsync = this.opt.runAsync || true; // We have to run like this cause the VM Event Manager does not support running multiple txs at the same time.

    this.pendingTxs = {};
    this.queusTxs = [];
  }

  rawRun(args, confirmationCb, gasEstimationForceSend, promptCb, cb) {
    run(this, args, args.timestamp || Date.now(), confirmationCb, gasEstimationForceSend, promptCb, cb);
  }

  execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback) {
    let data = args.data;

    if (data.slice(0, 2) !== '0x') {
      data = '0x' + data;
    }

    this.internalRunner.execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback);
  }

}

exports.TxRunner = TxRunner;

function run(self, tx, stamp, confirmationCb, gasEstimationForceSend = null, promptCb = null, callback = null) {
  if (!self.runAsync && Object.keys(self.pendingTxs).length) {
    return self.queusTxs.push({
      tx,
      stamp,
      callback
    });
  }

  self.pendingTxs[stamp] = tx;
  self.execute(tx, confirmationCb, gasEstimationForceSend, promptCb, function (error, result) {
    delete self.pendingTxs[stamp];
    if (callback && typeof callback === 'function') callback(error, result);

    if (self.queusTxs.length) {
      const next = self.queusTxs.pop();
      run(self, next.tx, next.stamp, next.callback);
    }
  });
}

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txRunnerVM.js":
/*!***************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/txRunnerVM.js ***!
  \***************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxRunnerVM = void 0;

const tx_1 = __webpack_require__(/*! @ethereumjs/tx */ "../../../node_modules/@ethereumjs/tx/dist.browser/index.js");

const block_1 = __webpack_require__(/*! @ethereumjs/block */ "../../../node_modules/@ethereumjs/block/dist.browser/index.js");

const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");

const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");

const logsManager_1 = __webpack_require__(/*! ./logsManager */ "../../../dist/libs/remix-lib/src/execution/logsManager.js");

class TxRunnerVM {
  constructor(vmaccounts, api, getVMObject) {
    this.event = new eventManager_1.EventManager();
    this.logsManager = new logsManager_1.LogsManager(); // has a default for now for backwards compatability

    this.getVMObject = getVMObject;
    this.commonContext = this.getVMObject().common;
    this.blockNumber = 0;
    this.runAsync = true;
    this.blockNumber = 0; // The VM is running in Homestead mode, which started at this block.

    this.runAsync = false; // We have to run like this cause the VM Event Manager does not support running multiple txs at the same time.

    this.pendingTxs = {};
    this.vmaccounts = vmaccounts;
    this.queusTxs = [];
    this.blocks = [];
    /*
      txHash is generated using the nonce,
      in order to have unique transaction hash, we need to keep using different nonce (in case of a call)
      so we increment this value after each call.
      For this to function we also need to skip nonce validation, in the vm: `{ skipNonce: true }`
    */

    this.nextNonceForCall = 0;
  }

  execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback) {
    let data = args.data;

    if (data.slice(0, 2) !== '0x') {
      data = '0x' + data;
    }

    try {
      this.runInVm(args.from, args.to, data, args.value, args.gasLimit, args.useCall, args.timestamp, callback);
    } catch (e) {
      callback(e, null);
    }
  }

  runInVm(from, to, data, value, gasLimit, useCall, timestamp, callback) {
    const self = this;
    let account;

    if (!from && useCall && Object.keys(self.vmaccounts).length) {
      from = Object.keys(self.vmaccounts)[0];
      account = self.vmaccounts[from];
    } else account = self.vmaccounts[from];

    if (!account) {
      return callback('Invalid account selected');
    }

    if (Number.isInteger(gasLimit)) {
      gasLimit = '0x' + gasLimit.toString(16);
    }

    this.getVMObject().stateManager.getAccount(ethereumjs_util_1.Address.fromString(from)).then(res => {
      // See https://github.com/ethereumjs/ethereumjs-tx/blob/master/docs/classes/transaction.md#constructor
      // for initialization fields and their types
      if (!value) value = 0;

      if (typeof value === 'string') {
        if (value.startsWith('0x')) value = new ethereumjs_util_1.BN(value.replace('0x', ''), 'hex');else {
          try {
            value = new ethereumjs_util_1.BN(value, 10);
          } catch (e) {
            return callback('Unable to parse the value ' + e.message);
          }
        }
      }

      const EIP1559 = this.commonContext.hardfork() !== 'berlin'; // berlin is the only pre eip1559 fork that we handle.

      let tx;

      if (!EIP1559) {
        tx = tx_1.Transaction.fromTxData({
          nonce: useCall ? this.nextNonceForCall : new ethereumjs_util_1.BN(res.nonce),
          gasPrice: '0x1',
          gasLimit: gasLimit,
          to: to,
          value: value,
          data: Buffer.from(data.slice(2), 'hex')
        }, {
          common: this.commonContext
        }).sign(account.privateKey);
      } else {
        tx = tx_1.FeeMarketEIP1559Transaction.fromTxData({
          nonce: useCall ? this.nextNonceForCall : new ethereumjs_util_1.BN(res.nonce),
          maxPriorityFeePerGas: '0x01',
          maxFeePerGas: '0x1',
          gasLimit: gasLimit,
          to: to,
          value: value,
          data: Buffer.from(data.slice(2), 'hex')
        }).sign(account.privateKey);
      }

      if (useCall) this.nextNonceForCall++;
      const coinbases = ['0x0e9281e9c6a0808672eaba6bd1220e144c9bb07a', '0x8945a1288dc78a6d8952a92c77aee6730b414778', '0x94d76e24f818426ae84aa404140e8d5f60e10e7e'];
      const difficulties = [new ethereumjs_util_1.BN('69762765929000', 10), new ethereumjs_util_1.BN('70762765929000', 10), new ethereumjs_util_1.BN('71762765929000', 10)];
      const block = block_1.Block.fromBlockData({
        header: {
          timestamp: timestamp || new Date().getTime() / 1000 | 0,
          number: self.blockNumber,
          coinbase: coinbases[self.blockNumber % coinbases.length],
          difficulty: difficulties[self.blockNumber % difficulties.length],
          gasLimit: new ethereumjs_util_1.BN(gasLimit.replace('0x', ''), 16).imuln(2),
          baseFeePerGas: EIP1559 ? '0x1' : undefined
        },
        transactions: [tx]
      }, {
        common: this.commonContext
      });

      if (!useCall) {
        ++self.blockNumber;
        this.runBlockInVm(tx, block, callback);
      } else {
        this.getVMObject().stateManager.checkpoint().then(() => {
          this.runBlockInVm(tx, block, (err, result) => {
            this.getVMObject().stateManager.revert().then(() => {
              callback(err, result);
            });
          });
        });
      }
    }).catch(e => {
      callback(e);
    });
  }

  runBlockInVm(tx, block, callback) {
    this.getVMObject().vm.runBlock({
      block: block,
      generate: true,
      skipBlockValidation: true,
      skipBalance: false,
      skipNonce: true
    }).then(results => {
      const result = results.results[0];

      if (result) {
        const status = result.execResult.exceptionError ? 0 : 1;
        result.status = `0x${status}`;
      }

      callback(null, {
        result: result,
        transactionHash: (0, ethereumjs_util_1.bufferToHex)(Buffer.from(tx.hash())),
        block,
        tx
      });
    }).catch(function (err) {
      callback(err);
    });
  }

}

exports.TxRunnerVM = TxRunnerVM;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/node-libs-browser/node_modules/buffer/index.js */ "../../../node_modules/node-libs-browser/node_modules/buffer/index.js").Buffer))

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txRunnerWeb3.js":
/*!*****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/txRunnerWeb3.js ***!
  \*****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxRunnerWeb3 = void 0;

const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");

const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");

class TxRunnerWeb3 {
  constructor(api, getWeb3, currentblockGasLimit) {
    this.event = new eventManager_1.EventManager();
    this.getWeb3 = getWeb3;
    this.currentblockGasLimit = currentblockGasLimit;
    this._api = api;
  }

  _executeTx(tx, network, txFee, api, promptCb, callback) {
    if (network && network.lastBlock && network.lastBlock.baseFeePerGas) {
      // the sending stack (web3.js / metamask need to have the type defined)
      // this is to avoid the following issue: https://github.com/MetaMask/metamask-extension/issues/11824
      tx.type = '0x2';
    }

    if (txFee) {
      if (txFee.baseFeePerGas) {
        tx.maxPriorityFeePerGas = this.getWeb3().utils.toHex(this.getWeb3().utils.toWei(txFee.maxPriorityFee, 'gwei'));
        tx.maxFeePerGas = this.getWeb3().utils.toHex(this.getWeb3().utils.toWei(txFee.maxFee, 'gwei'));
        tx.type = '0x2';
      } else {
        tx.gasPrice = this.getWeb3().utils.toHex(this.getWeb3().utils.toWei(txFee.gasPrice, 'gwei'));
        tx.type = '0x1';
      }
    }

    if (api.personalMode()) {
      promptCb(value => {
        this._sendTransaction(this.getWeb3().personal.sendTransaction, tx, value, callback);
      }, () => {
        return callback('Canceled by user.');
      });
    } else {
      this._sendTransaction(this.getWeb3().eth.sendTransaction, tx, null, callback);
    }
  }

  _sendTransaction(sendTx, tx, pass, callback) {
    const cb = (err, resp) => {
      if (err) {
        return callback(err, resp);
      }

      this.event.trigger('transactionBroadcasted', [resp]);

      const listenOnResponse = () => {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise((resolve, reject) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
          const receipt = yield tryTillReceiptAvailable(resp, this.getWeb3());
          tx = yield tryTillTxAvailable(resp, this.getWeb3());
          resolve({
            receipt,
            tx,
            transactionHash: receipt ? receipt['transactionHash'] : null
          });
        }));
      };

      listenOnResponse().then(txData => {
        callback(null, txData);
      }).catch(error => {
        callback(error);
      });
    };

    const args = pass !== null ? [tx, pass, cb] : [tx, cb];

    try {
      sendTx.apply({}, args);
    } catch (e) {
      return callback(`Send transaction failed: ${e.message} . if you use an injected provider, please check it is properly unlocked. `);
    }
  }

  execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback) {
    let data = args.data;

    if (data.slice(0, 2) !== '0x') {
      data = '0x' + data;
    }

    return this.runInNode(args.from, args.to, data, args.value, args.gasLimit, args.useCall, args.timestamp, confirmationCb, gasEstimationForceSend, promptCb, callback);
  }

  runInNode(from, to, data, value, gasLimit, useCall, timestamp, confirmCb, gasEstimationForceSend, promptCb, callback) {
    const tx = {
      from: from,
      to: to,
      data: data,
      value: value
    };
    if (!from) return callback('the value of "from" is not defined. Please make sure an account is selected.');

    if (useCall) {
      tx['gas'] = gasLimit;
      if (this._api && this._api.isVM()) tx['timestamp'] = timestamp;
      return this.getWeb3().eth.call(tx, function (error, result) {
        if (error) return callback(error);
        callback(null, {
          result: result
        });
      });
    }

    this.getWeb3().eth.estimateGas(tx, (err, gasEstimation) => {
      if (err && err.message.indexOf('Invalid JSON RPC response') !== -1) {
        // // @todo(#378) this should be removed when https://github.com/WalletConnect/walletconnect-monorepo/issues/334 is fixed
        callback(new Error('Gas estimation failed because of an unknown internal error. This may indicated that the transaction will fail.'));
      }

      this._api.detectNetwork((errNetWork, network) => {
        if (errNetWork) {
          console.log(errNetWork);
          return;
        }

        err = network.name === 'VM' ? null : err; // just send the tx if "VM"

        gasEstimationForceSend(err, () => {
          // callback is called whenever no error
          tx['gas'] = !gasEstimation ? gasLimit : gasEstimation;

          if (this._api.config.getUnpersistedProperty('doNotShowTransactionConfirmationAgain')) {
            return this._executeTx(tx, network, null, this._api, promptCb, callback);
          }

          confirmCb(network, tx, tx['gas'], txFee => {
            return this._executeTx(tx, network, txFee, this._api, promptCb, callback);
          }, error => {
            callback(error);
          });
        }, () => {
          const blockGasLimit = this.currentblockGasLimit(); // NOTE: estimateGas very likely will return a large limit if execution of the code failed
          //       we want to be able to run the code in order to debug and find the cause for the failure

          if (err) return callback(err);
          let warnEstimation = ' An important gas estimation might also be the sign of a problem in the contract code. Please check loops and be sure you did not sent value to a non payable function (that\'s also the reason of strong gas estimation). ';
          warnEstimation += ' ' + err;

          if (gasEstimation > gasLimit) {
            return callback('Gas required exceeds limit: ' + gasLimit + '. ' + warnEstimation);
          }

          if (gasEstimation > blockGasLimit) {
            return callback('Gas required exceeds block gas limit: ' + gasLimit + '. ' + warnEstimation);
          }
        });
      });
    });
  }

}

exports.TxRunnerWeb3 = TxRunnerWeb3;

function tryTillReceiptAvailable(txhash, web3) {
  return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
    try {
      const receipt = yield web3.eth.getTransactionReceipt(txhash);
      if (receipt) return receipt;
    } catch (e) {}

    yield pause();
    return yield tryTillReceiptAvailable(txhash, web3);
  });
}

function tryTillTxAvailable(txhash, web3) {
  return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
    try {
      const tx = yield web3.eth.getTransaction(txhash);
      if (tx && tx.blockHash) return tx;
    } catch (e) {}

    return yield tryTillTxAvailable(txhash, web3);
  });
}

function pause() {
  return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 500);
    });
  });
}

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/typeConversion.js":
/*!*******************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/execution/typeConversion.js ***!
  \*******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringify = exports.toInt = void 0;

const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");

function toInt(h) {
  if (h.indexOf && h.indexOf('0x') === 0) {
    return new ethereumjs_util_1.BN(h.replace('0x', ''), 16).toString(10);
  } else if (h.constructor && h.constructor.name === 'BigNumber' || ethereumjs_util_1.BN.isBN(h)) {
    return h.toString(10);
  }

  return h;
}

exports.toInt = toInt;
exports.stringify = convertToString;

function convertToString(v) {
  try {
    if (v instanceof Array) {
      const ret = [];

      for (const k in v) {
        ret.push(convertToString(v[k]));
      }

      return ret;
    } else if (ethereumjs_util_1.BN.isBN(v) || v.constructor && v.constructor.name === 'BigNumber') {
      return v.toString(10);
    } else if (v._isBuffer) {
      return (0, ethereumjs_util_1.bufferToHex)(v);
    } else if (typeof v === 'object') {
      const retObject = {};

      for (const i in v) {
        retObject[i] = convertToString(v[i]);
      }

      return retObject;
    } else {
      return v;
    }
  } catch (e) {
    console.log(e);
    return v;
  }
}

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/compilerHelper.js":
/*!*****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/helpers/compilerHelper.js ***!
  \*****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compilerInput = void 0;

function compilerInput(contracts) {
  return JSON.stringify({
    language: 'Solidity',
    sources: {
      'test.sol': {
        content: contracts
      }
    },
    settings: {
      optimizer: {
        enabled: false,
        runs: 200
      },
      outputSelection: {
        '*': {
          '': ['ast'],
          '*': ['abi', 'metadata', 'evm.legacyAssembly', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'evm.gasEstimates']
        }
      }
    }
  });
}

exports.compilerInput = compilerInput;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/hhconsoleSigs.js":
/*!****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/helpers/hhconsoleSigs.js ***!
  \****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
 // Fetched from https://github.com/nomiclabs/hardhat/blob/ee4969a0a8f746f4775d4018326056d161066869/packages/hardhat-core/src/internal/hardhat-network/stack-traces/logger.ts#L47

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConsoleLogs = void 0;
exports.ConsoleLogs = {
  1368866505: '()',
  1309416733: '(int)',
  4122065833: '(uint)',
  1093685164: '(string)',
  843419373: '(bool)',
  741264322: '(address)',
  199720790: '(bytes)',
  1847107880: '(bytes1)',
  3921027734: '(bytes2)',
  763578662: '(bytes3)',
  3764340945: '(bytes4)',
  2793701517: '(bytes5)',
  2927928721: '(bytes6)',
  1322614312: '(bytes7)',
  1334060334: '(bytes8)',
  2428341456: '(bytes9)',
  20780939: '(bytes10)',
  67127854: '(bytes11)',
  2258660029: '(bytes12)',
  2488442420: '(bytes13)',
  2456219775: '(bytes14)',
  3667227872: '(bytes15)',
  1717330180: '(bytes16)',
  866084666: '(bytes17)',
  3302112666: '(bytes18)',
  1584093747: '(bytes19)',
  1367925737: '(bytes20)',
  3923391840: '(bytes21)',
  3589990556: '(bytes22)',
  2879508237: '(bytes23)',
  4055063348: '(bytes24)',
  193248344: '(bytes25)',
  4172368369: '(bytes26)',
  976705501: '(bytes27)',
  3358255854: '(bytes28)',
  1265222613: '(bytes29)',
  3994207469: '(bytes30)',
  3263516050: '(bytes31)',
  666357637: '(bytes32)',
  1812949376: '(uint,uint)',
  262402885: '(uint,string)',
  510514412: '(uint,bool)',
  1491830284: '(uint,address)',
  2534451664: '(string,uint)',
  1264337527: '(string,string)',
  3283441205: '(string,bool)',
  832238387: '(string,address)',
  910912146: '(bool,uint)',
  2414527781: '(bool,string)',
  705760899: '(bool,bool)',
  2235320393: '(bool,address)',
  574869411: '(address,uint)',
  1973388987: '(address,string)',
  1974863315: '(address,bool)',
  3673216170: '(address,address)',
  3884059252: '(uint,uint,uint)',
  2104037094: '(uint,uint,string)',
  1733758967: '(uint,uint,bool)',
  3191032091: '(uint,uint,address)',
  1533929535: '(uint,string,uint)',
  1062716053: '(uint,string,string)',
  1185403086: '(uint,string,bool)',
  529592906: '(uint,string,address)',
  1515034914: '(uint,bool,uint)',
  2332955902: '(uint,bool,string)',
  3587091680: '(uint,bool,bool)',
  1112473535: '(uint,bool,address)',
  2286109610: '(uint,address,uint)',
  3464692859: '(uint,address,string)',
  2060456590: '(uint,address,bool)',
  2104993307: '(uint,address,address)',
  2526862595: '(string,uint,uint)',
  2750793529: '(string,uint,string)',
  4043501061: '(string,uint,bool)',
  3817119609: '(string,uint,address)',
  4083337817: '(string,string,uint)',
  753761519: '(string,string,string)',
  2967534005: '(string,string,bool)',
  2515337621: '(string,string,address)',
  689682896: '(string,bool,uint)',
  3801674877: '(string,bool,string)',
  2232122070: '(string,bool,bool)',
  2469116728: '(string,bool,address)',
  130552343: '(string,address,uint)',
  3773410639: '(string,address,string)',
  3374145236: '(string,address,bool)',
  4243355104: '(string,address,address)',
  995886048: '(bool,uint,uint)',
  3359211184: '(bool,uint,string)',
  464374251: '(bool,uint,bool)',
  3302110471: '(bool,uint,address)',
  3224906412: '(bool,string,uint)',
  2960557183: '(bool,string,string)',
  3686056519: '(bool,string,bool)',
  2509355347: '(bool,string,address)',
  2954061243: '(bool,bool,uint)',
  626391622: '(bool,bool,string)',
  1349555864: '(bool,bool,bool)',
  276362893: '(bool,bool,address)',
  3950005167: '(bool,address,uint)',
  3734671984: '(bool,address,string)',
  415876934: '(bool,address,bool)',
  3530962535: '(bool,address,address)',
  2273710942: '(address,uint,uint)',
  3136907337: '(address,uint,string)',
  3846889796: '(address,uint,bool)',
  2548867988: '(address,uint,address)',
  484110986: '(address,string,uint)',
  4218888805: '(address,string,string)',
  3473018801: '(address,string,bool)',
  4035396840: '(address,string,address)',
  742821141: '(address,bool,uint)',
  555898316: '(address,bool,string)',
  3951234194: '(address,bool,bool)',
  4044790253: '(address,bool,address)',
  1815506290: '(address,address,uint)',
  7426238: '(address,address,string)',
  4070990470: '(address,address,bool)',
  25986242: '(address,address,address)',
  1554033982: '(uint,uint,uint,uint)',
  2024634892: '(uint,uint,uint,string)',
  1683143115: '(uint,uint,uint,bool)',
  3766828905: '(uint,uint,uint,address)',
  949229117: '(uint,uint,string,uint)',
  2080582194: '(uint,uint,string,string)',
  2989403910: '(uint,uint,string,bool)',
  1127384482: '(uint,uint,string,address)',
  1818524812: '(uint,uint,bool,uint)',
  4024028142: '(uint,uint,bool,string)',
  2495495089: '(uint,uint,bool,bool)',
  3776410703: '(uint,uint,bool,address)',
  1628154048: '(uint,uint,address,uint)',
  3600994782: '(uint,uint,address,string)',
  2833785006: '(uint,uint,address,bool)',
  3398671136: '(uint,uint,address,address)',
  3221501959: '(uint,string,uint,uint)',
  2730232985: '(uint,string,uint,string)',
  2270850606: '(uint,string,uint,bool)',
  2877020669: '(uint,string,uint,address)',
  1995203422: '(uint,string,string,uint)',
  1474103825: '(uint,string,string,string)',
  310782872: '(uint,string,string,bool)',
  3432549024: '(uint,string,string,address)',
  2763295359: '(uint,string,bool,uint)',
  2370346144: '(uint,string,bool,string)',
  1371286465: '(uint,string,bool,bool)',
  2037328032: '(uint,string,bool,address)',
  2565338099: '(uint,string,address,uint)',
  4170733439: '(uint,string,address,string)',
  4181720887: '(uint,string,address,bool)',
  2141537675: '(uint,string,address,address)',
  1451396516: '(uint,bool,uint,uint)',
  3906845782: '(uint,bool,uint,string)',
  3534472445: '(uint,bool,uint,bool)',
  1329595790: '(uint,bool,uint,address)',
  2438978344: '(uint,bool,string,uint)',
  2754870525: '(uint,bool,string,string)',
  879671495: '(uint,bool,string,bool)',
  1231956916: '(uint,bool,string,address)',
  3173363033: '(uint,bool,bool,uint)',
  831186331: '(uint,bool,bool,string)',
  1315722005: '(uint,bool,bool,bool)',
  1392910941: '(uint,bool,bool,address)',
  1102442299: '(uint,bool,address,uint)',
  2721084958: '(uint,bool,address,string)',
  2449150530: '(uint,bool,address,bool)',
  2263728396: '(uint,bool,address,address)',
  3399106228: '(uint,address,uint,uint)',
  1054063912: '(uint,address,uint,string)',
  435581801: '(uint,address,uint,bool)',
  4256361684: '(uint,address,uint,address)',
  2697204968: '(uint,address,string,uint)',
  2373420580: '(uint,address,string,string)',
  581204390: '(uint,address,string,bool)',
  3420819197: '(uint,address,string,address)',
  2064181483: '(uint,address,bool,uint)',
  1676730946: '(uint,address,bool,string)',
  2116501773: '(uint,address,bool,bool)',
  3056677012: '(uint,address,bool,address)',
  2587672470: '(uint,address,address,uint)',
  2034490470: '(uint,address,address,string)',
  22350596: '(uint,address,address,bool)',
  1430734329: '(uint,address,address,address)',
  149837414: '(string,uint,uint,uint)',
  2773406909: '(string,uint,uint,string)',
  4147936829: '(string,uint,uint,bool)',
  3201771711: '(string,uint,uint,address)',
  2697245221: '(string,uint,string,uint)',
  1821956834: '(string,uint,string,string)',
  3919545039: '(string,uint,string,bool)',
  3144824297: '(string,uint,string,address)',
  1427009269: '(string,uint,bool,uint)',
  1993105508: '(string,uint,bool,string)',
  3816813520: '(string,uint,bool,bool)',
  3847527825: '(string,uint,bool,address)',
  1481210622: '(string,uint,address,uint)',
  844415720: '(string,uint,address,string)',
  285649143: '(string,uint,address,bool)',
  3939013249: '(string,uint,address,address)',
  3587119056: '(string,string,uint,uint)',
  2366909661: '(string,string,uint,string)',
  3864418506: '(string,string,uint,bool)',
  1565476480: '(string,string,uint,address)',
  2681211381: '(string,string,string,uint)',
  3731419658: '(string,string,string,string)',
  739726573: '(string,string,string,bool)',
  1834430276: '(string,string,string,address)',
  2256636538: '(string,string,bool,uint)',
  1585754346: '(string,string,bool,string)',
  1081628777: '(string,string,bool,bool)',
  3279013851: '(string,string,bool,address)',
  1250010474: '(string,string,address,uint)',
  3944480640: '(string,string,address,string)',
  1556958775: '(string,string,address,bool)',
  1134328815: '(string,string,address,address)',
  1572859960: '(string,bool,uint,uint)',
  1119461927: '(string,bool,uint,string)',
  1019590099: '(string,bool,uint,bool)',
  1909687565: '(string,bool,uint,address)',
  885731469: '(string,bool,string,uint)',
  2821114603: '(string,bool,string,string)',
  1066037277: '(string,bool,string,bool)',
  3764542249: '(string,bool,string,address)',
  2155164136: '(string,bool,bool,uint)',
  2636305885: '(string,bool,bool,string)',
  2304440517: '(string,bool,bool,bool)',
  1905304873: '(string,bool,bool,address)',
  685723286: '(string,bool,address,uint)',
  764294052: '(string,bool,address,string)',
  2508990662: '(string,bool,address,bool)',
  870964509: '(string,bool,address,address)',
  3668153533: '(string,address,uint,uint)',
  1280700980: '(string,address,uint,string)',
  1522647356: '(string,address,uint,bool)',
  2741431424: '(string,address,uint,address)',
  2405583849: '(string,address,string,uint)',
  609847026: '(string,address,string,string)',
  1595265676: '(string,address,string,bool)',
  2864486961: '(string,address,string,address)',
  3318856587: '(string,address,bool,uint)',
  72663161: '(string,address,bool,string)',
  2038975531: '(string,address,bool,bool)',
  573965245: '(string,address,bool,address)',
  1857524797: '(string,address,address,uint)',
  2148146279: '(string,address,address,string)',
  3047013728: '(string,address,address,bool)',
  3985582326: '(string,address,address,address)',
  853517604: '(bool,uint,uint,uint)',
  3657852616: '(bool,uint,uint,string)',
  2753397214: '(bool,uint,uint,bool)',
  4049711649: '(bool,uint,uint,address)',
  1098907931: '(bool,uint,string,uint)',
  3542771016: '(bool,uint,string,string)',
  2446522387: '(bool,uint,string,bool)',
  2781285673: '(bool,uint,string,address)',
  3554563475: '(bool,uint,bool,uint)',
  3067439572: '(bool,uint,bool,string)',
  2650928961: '(bool,uint,bool,bool)',
  1114097656: '(bool,uint,bool,address)',
  3399820138: '(bool,uint,address,uint)',
  403247937: '(bool,uint,address,string)',
  1705899016: '(bool,uint,address,bool)',
  2318373034: '(bool,uint,address,address)',
  2387273838: '(bool,string,uint,uint)',
  2007084013: '(bool,string,uint,string)',
  549177775: '(bool,string,uint,bool)',
  1529002296: '(bool,string,uint,address)',
  1574643090: '(bool,string,string,uint)',
  392356650: '(bool,string,string,string)',
  508266469: '(bool,string,string,bool)',
  2547225816: '(bool,string,string,address)',
  2372902053: '(bool,string,bool,uint)',
  1211958294: '(bool,string,bool,string)',
  3697185627: '(bool,string,bool,bool)',
  1401816747: '(bool,string,bool,address)',
  453743963: '(bool,string,address,uint)',
  316065672: '(bool,string,address,string)',
  1842623690: '(bool,string,address,bool)',
  724244700: '(bool,string,address,address)',
  1181212302: '(bool,bool,uint,uint)',
  1348569399: '(bool,bool,uint,string)',
  2874982852: '(bool,bool,uint,bool)',
  201299213: '(bool,bool,uint,address)',
  395003525: '(bool,bool,string,uint)',
  1830717265: '(bool,bool,string,string)',
  3092715066: '(bool,bool,string,bool)',
  4188875657: '(bool,bool,string,address)',
  3259532109: '(bool,bool,bool,uint)',
  719587540: '(bool,bool,bool,string)',
  992632032: '(bool,bool,bool,bool)',
  2352126746: '(bool,bool,bool,address)',
  1620281063: '(bool,bool,address,uint)',
  2695133539: '(bool,bool,address,string)',
  3231908568: '(bool,bool,address,bool)',
  4102557348: '(bool,bool,address,address)',
  2617143996: '(bool,address,uint,uint)',
  2691192883: '(bool,address,uint,string)',
  4002252402: '(bool,address,uint,bool)',
  1760647349: '(bool,address,uint,address)',
  194640930: '(bool,address,string,uint)',
  2805734838: '(bool,address,string,string)',
  3804222987: '(bool,address,string,bool)',
  1870422078: '(bool,address,string,address)',
  1287000017: '(bool,address,bool,uint)',
  1248250676: '(bool,address,bool,string)',
  1788626827: '(bool,address,bool,bool)',
  474063670: '(bool,address,bool,address)',
  1384430956: '(bool,address,address,uint)',
  3625099623: '(bool,address,address,string)',
  1180699616: '(bool,address,address,bool)',
  487903233: '(bool,address,address,address)',
  1024368100: '(address,uint,uint,uint)',
  2301889963: '(address,uint,uint,string)',
  3964381346: '(address,uint,uint,bool)',
  519451700: '(address,uint,uint,address)',
  4111650715: '(address,uint,string,uint)',
  2119616147: '(address,uint,string,string)',
  2751614737: '(address,uint,string,bool)',
  3698927108: '(address,uint,string,address)',
  1770996626: '(address,uint,bool,uint)',
  2391690869: '(address,uint,bool,string)',
  4272018778: '(address,uint,bool,bool)',
  602229106: '(address,uint,bool,address)',
  2782496616: '(address,uint,address,uint)',
  1567749022: '(address,uint,address,string)',
  4051804649: '(address,uint,address,bool)',
  3961816175: '(address,uint,address,address)',
  2764647008: '(address,string,uint,uint)',
  1561552329: '(address,string,uint,string)',
  2116357467: '(address,string,uint,bool)',
  3755464715: '(address,string,uint,address)',
  2706362425: '(address,string,string,uint)',
  1560462603: '(address,string,string,string)',
  900007711: '(address,string,string,bool)',
  2689478535: '(address,string,string,address)',
  3877655068: '(address,string,bool,uint)',
  3154862590: '(address,string,bool,string)',
  1595759775: '(address,string,bool,bool)',
  542667202: '(address,string,bool,address)',
  2350461865: '(address,string,address,uint)',
  4158874181: '(address,string,address,string)',
  233909110: '(address,string,address,bool)',
  221706784: '(address,string,address,address)',
  3255869470: '(address,bool,uint,uint)',
  2606272204: '(address,bool,uint,string)',
  2244855215: '(address,bool,uint,bool)',
  227337758: '(address,bool,uint,address)',
  2652011374: '(address,bool,string,uint)',
  1197235251: '(address,bool,string,string)',
  1353532957: '(address,bool,string,bool)',
  436029782: '(address,bool,string,address)',
  3484780374: '(address,bool,bool,uint)',
  3754205928: '(address,bool,bool,string)',
  3401856121: '(address,bool,bool,bool)',
  3476636805: '(address,bool,bool,address)',
  3698398930: '(address,bool,address,uint)',
  769095910: '(address,bool,address,string)',
  2801077007: '(address,bool,address,bool)',
  1711502813: '(address,bool,address,address)',
  1425929188: '(address,address,uint,uint)',
  2647731885: '(address,address,uint,string)',
  3270936812: '(address,address,uint,bool)',
  3603321462: '(address,address,uint,address)',
  69767936: '(address,address,string,uint)',
  566079269: '(address,address,string,string)',
  1863997774: '(address,address,string,bool)',
  2406706454: '(address,address,string,address)',
  2513854225: '(address,address,bool,uint)',
  2858762440: '(address,address,bool,string)',
  752096074: '(address,address,bool,bool)',
  2669396846: '(address,address,bool,address)',
  3982404743: '(address,address,address,uint)',
  4161329696: '(address,address,address,string)',
  238520724: '(address,address,address,bool)',
  1717301556: '(address,address,address,address)',
  4133908826: '(uint,uint)',
  3054400204: '(string,uint)'
};

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/txResultHelper.js":
/*!*****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/helpers/txResultHelper.js ***!
  \*****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resultToRemixTx = void 0;

const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");

const ethjs_util_1 = __webpack_require__(/*! ethjs-util */ "../../../node_modules/ethjs-util/lib/index.js");

function convertToPrefixedHex(input) {
  if (input === undefined || input === null || (0, ethjs_util_1.isHexString)(input)) {
    return input;
  } else if (Buffer.isBuffer(input)) {
    return (0, ethereumjs_util_1.bufferToHex)(input);
  }

  return '0x' + input.toString(16);
}
/*
 txResult.result can be 3 different things:
 - VM call or tx: ethereumjs-vm result object
 - Node transaction: object returned from eth.getTransactionReceipt()
 - Node call: return value from function call (not an object)

 Also, VM results use BN and Buffers, Node results use hex strings/ints,
 So we need to normalize the values to prefixed hex strings
*/


function resultToRemixTx(txResult, execResult) {
  const {
    receipt,
    transactionHash,
    result
  } = txResult;
  const {
    status,
    gasUsed,
    contractAddress
  } = receipt;
  let returnValue, errorMessage;

  if ((0, ethjs_util_1.isHexString)(result)) {
    returnValue = result;
  } else if (execResult !== undefined) {
    returnValue = execResult.returnValue;
    errorMessage = execResult.exceptionError;
  }

  return {
    transactionHash,
    status,
    gasUsed: convertToPrefixedHex(gasUsed),
    error: errorMessage,
    return: convertToPrefixedHex(returnValue),
    createdAddress: convertToPrefixedHex(contractAddress)
  };
}

exports.resultToRemixTx = resultToRemixTx;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/node-libs-browser/node_modules/buffer/index.js */ "../../../node_modules/node-libs-browser/node_modules/buffer/index.js").Buffer))

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/uiHelper.js":
/*!***********************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/helpers/uiHelper.js ***!
  \***********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runInBrowser = exports.normalizeHexAddress = exports.normalizeHex = exports.formatCss = exports.tryConvertAsciiFormat = exports.formatMemory = void 0;

function formatMemory(mem, width) {
  const ret = {};

  if (!mem) {
    return ret;
  }

  if (!mem.substr) {
    mem = mem.join(''); // geth returns an array, eth return raw string
  }

  for (let k = 0; k < mem.length; k += width * 2) {
    const memory = mem.substr(k, width * 2);
    const content = tryConvertAsciiFormat(memory);
    ret['0x' + (k / 2).toString(16)] = content.raw + '\t' + content.ascii;
  }

  return ret;
}

exports.formatMemory = formatMemory;

function tryConvertAsciiFormat(memorySlot) {
  const ret = {
    ascii: '',
    raw: ''
  };

  for (let k = 0; k < memorySlot.length; k += 2) {
    const raw = memorySlot.substr(k, 2);
    let ascii = String.fromCharCode(parseInt(raw, 16));
    ascii = ascii.replace(/[^\w\s]/, '?');

    if (ascii === '') {
      ascii = '?';
    }

    ret.ascii += ascii;
    ret.raw += raw;
  }

  return ret;
}

exports.tryConvertAsciiFormat = tryConvertAsciiFormat;
/**
 * format @args css1, css2, css3 to css inline style
 *
 * @param {Object} css1 - css inline declaration
 * @param {Object} css2 - css inline declaration
 * @param {Object} css3 - css inline declaration
 * @param {Object} ...
 * @return {String} css inline style
 *                  if the key start with * the value is direcly appended to the inline style (which should be already inline style formatted)
 *                  used if multiple occurences of the same key is needed
 */

function formatCss(css1, css2) {
  let ret = '';

  for (const arg in arguments) {
    // eslint-disable-line
    for (const k in arguments[arg]) {
      // eslint-disable-line
      if (arguments[arg][k] && ret.indexOf(k) === -1) {
        // eslint-disable-line
        if (k.indexOf('*') === 0) {
          ret += arguments[arg][k]; // eslint-disable-line
        } else {
          ret += k + ':' + arguments[arg][k] + ';'; // eslint-disable-line
        }
      }
    }
  }

  return ret;
}

exports.formatCss = formatCss;

function normalizeHex(hex) {
  if (hex.indexOf('0x') === 0) {
    hex = hex.replace('0x', '');
  }

  hex = hex.replace(/^0+/, '');
  return '0x' + hex;
}

exports.normalizeHex = normalizeHex;

function normalizeHexAddress(hex) {
  if (hex.indexOf('0x') === 0) hex = hex.replace('0x', '');

  if (hex.length >= 40) {
    const reg = /(.{40})$/.exec(hex);

    if (reg) {
      return '0x' + reg[0];
    }
  } else {
    return '0x' + new Array(40 - hex.length + 1).join('0') + hex;
  }
}

exports.normalizeHexAddress = normalizeHexAddress;

function runInBrowser() {
  return typeof window !== 'undefined';
}

exports.runInBrowser = runInBrowser;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/index.js":
/*!************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/index.js ***!
  \************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.execution = exports.util = exports.Storage = exports.helpers = exports.EventManager = exports.QueryParams = exports.ConsoleLogs = void 0;

const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");

const eventManager_1 = __webpack_require__(/*! ./eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");

Object.defineProperty(exports, "EventManager", {
  enumerable: true,
  get: function () {
    return eventManager_1.EventManager;
  }
});
const uiHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./helpers/uiHelper */ "../../../dist/libs/remix-lib/src/helpers/uiHelper.js"));
const compilerHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./helpers/compilerHelper */ "../../../dist/libs/remix-lib/src/helpers/compilerHelper.js"));
const util = (0, tslib_1.__importStar)(__webpack_require__(/*! ./util */ "../../../dist/libs/remix-lib/src/util.js"));
exports.util = util;

const storage_1 = __webpack_require__(/*! ./storage */ "../../../dist/libs/remix-lib/src/storage.js");

Object.defineProperty(exports, "Storage", {
  enumerable: true,
  get: function () {
    return storage_1.Storage;
  }
});

const eventsDecoder_1 = __webpack_require__(/*! ./execution/eventsDecoder */ "../../../dist/libs/remix-lib/src/execution/eventsDecoder.js");

const txExecution = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/txExecution */ "../../../dist/libs/remix-lib/src/execution/txExecution.js"));
const txHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js"));
const txFormat = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/txFormat */ "../../../dist/libs/remix-lib/src/execution/txFormat.js"));

const txListener_1 = __webpack_require__(/*! ./execution/txListener */ "../../../dist/libs/remix-lib/src/execution/txListener.js");

const txRunner_1 = __webpack_require__(/*! ./execution/txRunner */ "../../../dist/libs/remix-lib/src/execution/txRunner.js");

const logsManager_1 = __webpack_require__(/*! ./execution/logsManager */ "../../../dist/libs/remix-lib/src/execution/logsManager.js");

const forkAt_1 = __webpack_require__(/*! ./execution/forkAt */ "../../../dist/libs/remix-lib/src/execution/forkAt.js");

const typeConversion = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/typeConversion */ "../../../dist/libs/remix-lib/src/execution/typeConversion.js"));

const txRunnerVM_1 = __webpack_require__(/*! ./execution/txRunnerVM */ "../../../dist/libs/remix-lib/src/execution/txRunnerVM.js");

const txRunnerWeb3_1 = __webpack_require__(/*! ./execution/txRunnerWeb3 */ "../../../dist/libs/remix-lib/src/execution/txRunnerWeb3.js");

const txResultHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./helpers/txResultHelper */ "../../../dist/libs/remix-lib/src/helpers/txResultHelper.js"));

var hhconsoleSigs_1 = __webpack_require__(/*! ./helpers/hhconsoleSigs */ "../../../dist/libs/remix-lib/src/helpers/hhconsoleSigs.js");

Object.defineProperty(exports, "ConsoleLogs", {
  enumerable: true,
  get: function () {
    return hhconsoleSigs_1.ConsoleLogs;
  }
});

var query_params_1 = __webpack_require__(/*! ./query-params */ "../../../dist/libs/remix-lib/src/query-params.js");

Object.defineProperty(exports, "QueryParams", {
  enumerable: true,
  get: function () {
    return query_params_1.QueryParams;
  }
});
const helpers = {
  ui: uiHelper,
  compiler: compilerHelper,
  txResultHelper
};
exports.helpers = helpers;
const execution = {
  EventsDecoder: eventsDecoder_1.EventsDecoder,
  txExecution: txExecution,
  txHelper: txHelper,
  txFormat: txFormat,
  txListener: txListener_1.TxListener,
  TxRunner: txRunner_1.TxRunner,
  TxRunnerWeb3: txRunnerWeb3_1.TxRunnerWeb3,
  TxRunnerVM: txRunnerVM_1.TxRunnerVM,
  typeConversion: typeConversion,
  LogsManager: logsManager_1.LogsManager,
  forkAt: forkAt_1.forkAt
};
exports.execution = execution;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/query-params.js":
/*!*******************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/query-params.js ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QueryParams = void 0;

class QueryParams {
  update(params) {
    const currentParams = this.get();
    const keys = Object.keys(params);

    for (const x in keys) {
      currentParams[keys[x]] = params[keys[x]];
    }

    let queryString = '#';
    const updatedKeys = Object.keys(currentParams);

    for (const y in updatedKeys) {
      queryString += updatedKeys[y] + '=' + currentParams[updatedKeys[y]] + '&';
    }

    window.location.hash = queryString.slice(0, -1);
  }

  get() {
    const qs = window.location.hash.substr(1);

    if (window.location.search.length > 0) {
      // use legacy query params instead of hash
      window.location.hash = window.location.search.substr(1);
      window.location.search = '';
    }

    const params = {};
    const parts = qs.split('&');

    for (const x in parts) {
      const keyValue = parts[x].split('=');

      if (keyValue[0] !== '') {
        params[keyValue[0]] = keyValue[1];
      }
    }

    return params;
  }

}

exports.QueryParams = QueryParams;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/storage.js":
/*!**************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/storage.js ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Storage = void 0;

class Storage {
  constructor(prefix) {
    this.prefix = prefix; // on startup, upgrade the old storage layout

    if (typeof window !== 'undefined') {
      this.safeKeys().forEach(function (name) {
        if (name.indexOf('sol-cache-file-', 0) === 0) {
          const content = window.localStorage.getItem(name);
          window.localStorage.setItem(name.replace(/^sol-cache-file-/, 'sol:'), content);
          window.localStorage.removeItem(name);
        }
      });
    } // remove obsolete key


    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('editor-size-cache');
    }
  }

  exists(name) {
    if (typeof window !== 'undefined') {
      return this.get(name) !== null;
    }
  }

  get(name) {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(this.prefix + name);
    }
  }

  set(name, content) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(this.prefix + name, content);
      }
    } catch (exception) {
      return false;
    }

    return true;
  }

  remove(name) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.prefix + name);
    }

    return true;
  }

  rename(originalName, newName) {
    const content = this.get(originalName);

    if (!this.set(newName, content)) {
      return false;
    }

    this.remove(originalName);
    return true;
  }

  safeKeys() {
    // NOTE: this is a workaround for some browsers
    if (typeof window !== 'undefined') {
      return Object.keys(window.localStorage).filter(function (item) {
        return item !== null && item !== undefined;
      });
    }

    return [];
  }

  keys() {
    return this.safeKeys() // filter any names not including the prefix
    .filter(item => item.indexOf(this.prefix, 0) === 0) // remove prefix from filename and add the 'browser' path
    .map(item => item.substr(this.prefix.length));
  }

}

exports.Storage = Storage;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/util.js":
/*!***********************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/dist/libs/remix-lib/src/util.js ***!
  \***********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.escapeRegExp = exports.concatWithSeperator = exports.groupBy = exports.compareByteCode = exports.extractSwarmHash = exports.extractcborMetadata = exports.cborEncodedValueExtraction = exports.swarmHashExtractionPOC32 = exports.swarmHashExtractionPOC31 = exports.swarmHashExtraction = exports.sha3_256 = exports.buildCallPath = exports.findCall = exports.findClosestIndex = exports.findLowerBoundValue = exports.findLowerBound = exports.formatMemory = exports.hexListFromBNs = exports.hexToIntArray = void 0;

const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");

const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");

const string_similarity_1 = (0, tslib_1.__importDefault)(__webpack_require__(/*! string-similarity */ "../../../node_modules/string-similarity/src/index.js"));
/*
 contains misc util: @TODO should be splitted
  - hex conversion
  - binary search
  - CALL related look up
  - sha3 calculation
  - swarm hash extraction
  - bytecode comparison
*/

/*
    ints: IntArray
  */

/**
   * Converts a hex string to an array of integers.
   */

function hexToIntArray(hexString) {
  if (hexString.slice(0, 2) === '0x') {
    hexString = hexString.slice(2);
  }

  const integers = [];

  for (let i = 0; i < hexString.length; i += 2) {
    integers.push(parseInt(hexString.slice(i, i + 2), 16));
  }

  return integers;
}

exports.hexToIntArray = hexToIntArray;
/*
    ints: list of BNs
  */

function hexListFromBNs(bnList) {
  const ret = [];

  for (const k in bnList) {
    const v = bnList[k];

    if (ethereumjs_util_1.BN.isBN(v)) {
      ret.push('0x' + v.toString('hex', 64));
    } else {
      ret.push('0x' + new ethereumjs_util_1.BN(v).toString('hex', 64)); // TEMP FIX TO REMOVE ONCE https://github.com/ethereumjs/ethereumjs-vm/pull/293 is released
    }
  }

  return ret;
}

exports.hexListFromBNs = hexListFromBNs;
/*
  ints: ints: IntArray
*/

function formatMemory(mem) {
  const hexMem = (0, ethereumjs_util_1.bufferToHex)(mem).substr(2);
  const ret = [];

  for (let k = 0; k < hexMem.length; k += 32) {
    const row = hexMem.substr(k, 32);
    ret.push(row);
  }

  return ret;
}

exports.formatMemory = formatMemory;
/*
  Binary Search:
  Assumes that @arg array is sorted increasingly
  return largest i such that array[i] <= target; return -1 if array[0] > target || array is empty
*/

function findLowerBound(target, array) {
  let start = 0;
  let length = array.length;

  while (length > 0) {
    const half = length >> 1;
    const middle = start + half;

    if (array[middle] <= target) {
      length = length - 1 - half;
      start = middle + 1;
    } else {
      length = half;
    }
  }

  return start - 1;
}

exports.findLowerBound = findLowerBound;
/*
  Binary Search:
  Assumes that @arg array is sorted increasingly
  return largest array[i] such that array[i] <= target; return null if array[0] > target || array is empty
*/

function findLowerBoundValue(target, array) {
  const index = findLowerBound(target, array);
  return index >= 0 ? array[index] : null;
}

exports.findLowerBoundValue = findLowerBoundValue;
/*
  Binary Search:
  Assumes that @arg array is sorted increasingly
  return Return i such that |array[i] - target| is smallest among all i and -1 for an empty array.
  Returns the smallest i for multiple candidates.
*/

function findClosestIndex(target, array) {
  if (array.length === 0) {
    return -1;
  }

  const index = findLowerBound(target, array);

  if (index < 0) {
    return 0;
  } else if (index >= array.length - 1) {
    return array.length - 1;
  } else {
    const middle = (array[index] + array[index + 1]) / 2;
    return target <= middle ? index : index + 1;
  }
}

exports.findClosestIndex = findClosestIndex;
/**
  * Find the call from @args rootCall which contains @args index (recursive)
  *
  * @param {Int} index - index of the vmtrace
  * @param {Object} rootCall  - call tree, built by the trace analyser
  * @return {Object} - return the call which include the @args index
  */

function findCall(index, rootCall) {
  const ret = buildCallPath(index, rootCall);
  return ret[ret.length - 1];
}

exports.findCall = findCall;
/**
  * Find calls path from @args rootCall which leads to @args index (recursive)
  *
  * @param {Int} index - index of the vmtrace
  * @param {Object} rootCall  - call tree, built by the trace analyser
  * @return {Array} - return the calls path to @args index
  */

function buildCallPath(index, rootCall) {
  const ret = [];
  findCallInternal(index, rootCall, ret);
  return ret;
}

exports.buildCallPath = buildCallPath;
/**
  * sha3 the given @arg value (left pad to 32 bytes)
  *
  * @param {String} value - value to sha3
  * @return {Object} - return sha3ied value
  */
// eslint-disable-next-line camelcase

function sha3_256(value) {
  value = (0, ethereumjs_util_1.toBuffer)((0, ethereumjs_util_1.addHexPrefix)(value));
  const retInBuffer = (0, ethereumjs_util_1.keccak)((0, ethereumjs_util_1.setLengthLeft)(value, 32));
  return (0, ethereumjs_util_1.bufferToHex)(retInBuffer);
}

exports.sha3_256 = sha3_256;
/**
  * return a regex which extract the swarmhash from the bytecode.
  *
  * @return {RegEx}
  */

function swarmHashExtraction() {
  return /a165627a7a72305820([0-9a-f]{64})0029$/;
}

exports.swarmHashExtraction = swarmHashExtraction;
/**
  * return a regex which extract the swarmhash from the bytecode, from POC 0.3
  *
  * @return {RegEx}
  */

function swarmHashExtractionPOC31() {
  return /a265627a7a72315820([0-9a-f]{64})64736f6c6343([0-9a-f]{6})0032$/;
}

exports.swarmHashExtractionPOC31 = swarmHashExtractionPOC31;
/**
  * return a regex which extract the swarmhash from the bytecode, from POC 0.3
  *
  * @return {RegEx}
  */

function swarmHashExtractionPOC32() {
  return /a265627a7a72305820([0-9a-f]{64})64736f6c6343([0-9a-f]{6})0032$/;
}

exports.swarmHashExtractionPOC32 = swarmHashExtractionPOC32;
/**
  * return a regex which extract the cbor encoded metadata : {"ipfs": <IPFS hash>, "solc": <compiler version>} from the bytecode.
  * ref https://solidity.readthedocs.io/en/v0.6.6/metadata.html?highlight=ipfs#encoding-of-the-metadata-hash-in-the-bytecode
  * @return {RegEx}
  */

function cborEncodedValueExtraction() {
  return /64697066735822([0-9a-f]{68})64736f6c6343([0-9a-f]{6})0033$/;
}

exports.cborEncodedValueExtraction = cborEncodedValueExtraction;

function extractcborMetadata(value) {
  return value.replace(cborEncodedValueExtraction(), '');
}

exports.extractcborMetadata = extractcborMetadata;

function extractSwarmHash(value) {
  value = value.replace(swarmHashExtraction(), '');
  value = value.replace(swarmHashExtractionPOC31(), '');
  value = value.replace(swarmHashExtractionPOC32(), '');
  return value;
}

exports.extractSwarmHash = extractSwarmHash;
/**
  * Compare bytecode. return true if the code is equal (handle swarm hash and library references)
  * @param {String} code1 - the bytecode that is actually deployed (contains resolved library reference and a potentially different swarmhash)
  * @param {String} code2 - the bytecode generated by the compiler (contains unresolved library reference and a potentially different swarmhash)
                            this will return false if the generated bytecode is empty (asbtract contract cannot be deployed)
  *
  * @return {bool}
  */

function compareByteCode(code1, code2) {
  if (code1 === code2) return true;
  if (code2 === '0x') return false; // abstract contract. see comment

  if (code2.substr(2, 46) === '7300000000000000000000000000000000000000003014') {
    // testing the following signature: PUSH20 00..00 ADDRESS EQ
    // in the context of a library, that slot contains the address of the library (pushed by the compiler to avoid calling library other than with a DELEGATECALL)
    // if code2 is not a library, well we still suppose that the comparison remain relevant even if we remove some information from `code1`
    code1 = replaceLibReference(code1, 4);
  }

  let pos = -1;

  while ((pos = code2.search(/__(.*)__/)) !== -1) {
    code2 = replaceLibReference(code2, pos);
    code1 = replaceLibReference(code1, pos);
  }

  code1 = extractSwarmHash(code1);
  code1 = extractcborMetadata(code1);
  code2 = extractSwarmHash(code2);
  code2 = extractcborMetadata(code2);

  if (code1 && code2) {
    const compare = string_similarity_1.default.compareTwoStrings(code1, code2);
    return compare > 0.93;
  }

  return false;
}

exports.compareByteCode = compareByteCode;
/* util extracted out from remix-ide. @TODO split this file, cause it mix real util fn with solidity related stuff ... */

function groupBy(arr, key) {
  return arr.reduce((sum, item) => {
    const groupByVal = item[key];
    const groupedItems = sum[groupByVal] || [];
    groupedItems.push(item);
    sum[groupByVal] = groupedItems;
    return sum;
  }, {});
}

exports.groupBy = groupBy;

function concatWithSeperator(list, seperator) {
  return list.reduce((sum, item) => sum + item + seperator, '').slice(0, -seperator.length);
}

exports.concatWithSeperator = concatWithSeperator;

function escapeRegExp(str) {
  return str.replace(/[-[\]/{}()+?.\\^$|]/g, '\\$&');
}

exports.escapeRegExp = escapeRegExp;

function replaceLibReference(code, pos) {
  return code.substring(0, pos) + '0000000000000000000000000000000000000000' + code.substring(pos + 40);
}

function findCallInternal(index, rootCall, callsPath) {
  const calls = Object.keys(rootCall.calls);
  const ret = rootCall;
  callsPath.push(rootCall);

  for (const k in calls) {
    const subCall = rootCall.calls[calls[k]];

    if (index >= subCall.start && index <= subCall.return) {
      findCallInternal(index, subCall, callsPath);
      break;
    }
  }

  return ret;
}

/***/ }),

/***/ "../../../libs/remix-ui/app/src/index.ts":
/*!**********************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/index.ts ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "AlertModal", {
  enumerable: true,
  get: function () {
    return _index.AlertModal;
  }
});
Object.defineProperty(exports, "AppContext", {
  enumerable: true,
  get: function () {
    return _context.AppContext;
  }
});
Object.defineProperty(exports, "AppModal", {
  enumerable: true,
  get: function () {
    return _index.AppModal;
  }
});
Object.defineProperty(exports, "ModalProvider", {
  enumerable: true,
  get: function () {
    return _provider.ModalProvider;
  }
});
Object.defineProperty(exports, "ModalTypes", {
  enumerable: true,
  get: function () {
    return _index2.ModalTypes;
  }
});
Object.defineProperty(exports, "RemixApp", {
  enumerable: true,
  get: function () {
    return _remixApp.default;
  }
});
Object.defineProperty(exports, "dispatchModalContext", {
  enumerable: true,
  get: function () {
    return _context.dispatchModalContext;
  }
});
Object.defineProperty(exports, "useDialogDispatchers", {
  enumerable: true,
  get: function () {
    return _provider.useDialogDispatchers;
  }
});

var _remixApp = _interopRequireDefault(__webpack_require__(/*! ./lib/remix-app/remix-app */ "../../../libs/remix-ui/app/src/lib/remix-app/remix-app.tsx"));

var _context = __webpack_require__(/*! ./lib/remix-app/context/context */ "../../../libs/remix-ui/app/src/lib/remix-app/context/context.tsx");

var _provider = __webpack_require__(/*! ./lib/remix-app/context/provider */ "../../../libs/remix-ui/app/src/lib/remix-app/context/provider.tsx");

var _index = __webpack_require__(/*! ./lib/remix-app/interface/index */ "../../../libs/remix-ui/app/src/lib/remix-app/interface/index.ts");

var _index2 = __webpack_require__(/*! ./lib/remix-app/types/index */ "../../../libs/remix-ui/app/src/lib/remix-app/types/index.ts");

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/actions/modals.ts":
/*!*********************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/actions/modals.ts ***!
  \*********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.modalActionTypes = void 0;
let modalActionTypes;
exports.modalActionTypes = modalActionTypes;

(function (modalActionTypes) {
  modalActionTypes["setModal"] = "SET_MODAL";
  modalActionTypes["setToast"] = "SET_TOAST";
  modalActionTypes["processQueue"] = "PROCESS_QUEUEU";
  modalActionTypes["handleHideModal"] = "HANDLE_HIDE_MODAL";
  modalActionTypes["handleToaster"] = "HANDLE_HIDE_TOAST";
})(modalActionTypes || (exports.modalActionTypes = modalActionTypes = {}));

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.css":
/*!**********************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.css ***!
  \**********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./dragbar.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.tsx":
/*!**********************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.tsx ***!
  \**********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _reactDraggable = _interopRequireDefault(__webpack_require__(/*! react-draggable */ "../../../node_modules/react-draggable/build/cjs/cjs.js"));

__webpack_require__(/*! ./dragbar.css */ "../../../libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.css");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\app\\src\\lib\\remix-app\\components\\dragbar\\dragbar.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const DragBar = props => {
  const [dragState, setDragState] = (0, _react.useState)(false);
  const [dragBarPosX, setDragBarPosX] = (0, _react.useState)(0);
  const [offset, setOffSet] = (0, _react.useState)(0);
  const initialWidth = (0, _react.useRef)(props.minWidth);

  const nodeRef = _react.default.useRef(null); // fix for strictmode


  (0, _react.useEffect)(() => {
    setDragBarPosX(offset + (props.hidden ? 0 : props.refObject.current.offsetWidth));
  }, [props.hidden, offset]);
  (0, _react.useEffect)(() => {
    initialWidth.current = props.refObject.current.clientWidth;

    if (props.maximiseTrigger > 0) {
      const width = 0.4 * window.innerWidth;

      if (width > props.refObject.current.offsetWidth) {
        props.refObject.current.style.width = width + 'px';
        setTimeout(() => {
          setDragBarPosX(offset + width);
        }, 300);
      }
    }
  }, [props.maximiseTrigger]);
  (0, _react.useEffect)(() => {
    if (props.maximiseTrigger > 0) {
      props.refObject.current.style.width = initialWidth.current + 'px';
      setTimeout(() => {
        setDragBarPosX(offset + initialWidth.current);
      }, 300);
    }
  }, [props.resetTrigger]);

  const handleResize = () => {
    setOffSet(props.refObject.current.offsetLeft);
    setDragBarPosX(props.refObject.current.offsetLeft + props.refObject.current.offsetWidth);
  };

  (0, _react.useEffect)(() => {
    window.addEventListener('resize', handleResize); // TODO: not a good way to wait on the ref doms element to be rendered of course

    setTimeout(() => handleResize(), 2000);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function stopDrag(e, data) {
    setDragState(false);

    if (data.x < props.minWidth) {
      setDragBarPosX(offset);
      props.setHideStatus(true);
    } else {
      props.refObject.current.style.width = data.x - offset + 'px';
      setTimeout(() => {
        props.setHideStatus(false);
        setDragBarPosX(offset + props.refObject.current.offsetWidth);
      }, 300);
    }
  }

  function startDrag() {
    setDragState(true);
  }

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: `overlay ${dragState ? '' : 'd-none'}`
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 79,
      columnNumber: 5
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactDraggable.default, {
      nodeRef: nodeRef,
      position: {
        x: dragBarPosX,
        y: 0
      },
      onStart: startDrag,
      onStop: stopDrag,
      axis: "x",
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        ref: nodeRef,
        className: `dragbar ${dragState ? 'ondrag' : ''}`
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 81,
        columnNumber: 7
      }, void 0)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 80,
      columnNumber: 5
    }, void 0)]
  }, void 0, true);
};

var _default = DragBar;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/dialogViewPlugin.tsx":
/*!******************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/modals/dialogViewPlugin.tsx ***!
  \******************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _context = __webpack_require__(/*! ../../context/context */ "../../../libs/remix-ui/app/src/lib/remix-app/context/context.tsx");

var _provider = __webpack_require__(/*! ../../context/provider */ "../../../libs/remix-ui/app/src/lib/remix-app/context/provider.tsx");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const DialogViewPlugin = () => {
  const {
    modal,
    alert,
    toast
  } = (0, _provider.useDialogDispatchers)();
  const app = (0, _react.useContext)(_context.AppContext);
  (0, _react.useEffect)(() => {
    app.modal.setDispatcher({
      modal,
      alert,
      toast
    });
  }, []);
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {}, void 0, false);
};

var _default = DialogViewPlugin;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/dialogs.tsx":
/*!*********************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/modals/dialogs.tsx ***!
  \*********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));

var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _provider = __webpack_require__(/*! ../../context/provider */ "../../../libs/remix-ui/app/src/lib/remix-app/context/provider.tsx");

var _toaster = __webpack_require__(/*! @remix-ui/toaster */ "../../../libs/remix-ui/toaster/src/index.ts");

var _modalWrapper = _interopRequireDefault(__webpack_require__(/*! ./modal-wrapper */ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/modal-wrapper.tsx"));

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\app\\src\\lib\\remix-app\\components\\modals\\dialogs.tsx";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

const AppDialogs = () => {
  const {
    handleHideModal,
    handleToaster
  } = (0, _provider.useDialogDispatchers)();
  const {
    focusModal,
    focusToaster
  } = (0, _provider.useDialogs)();
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_modalWrapper.default, _objectSpread(_objectSpread({}, focusModal), {}, {
      handleHide: handleHideModal
    }), void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 12,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_toaster.Toaster, {
      message: focusToaster,
      handleHide: handleToaster
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 13,
      columnNumber: 7
    }, void 0)]
  }, void 0, true);
};

var _default = AppDialogs;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/matomo.tsx":
/*!********************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/modals/matomo.tsx ***!
  \********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _context = __webpack_require__(/*! ../../context/context */ "../../../libs/remix-ui/app/src/lib/remix-app/context/context.tsx");

var _provider = __webpack_require__(/*! ../../context/provider */ "../../../libs/remix-ui/app/src/lib/remix-app/context/provider.tsx");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\app\\src\\lib\\remix-app\\components\\modals\\matomo.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const _paq = window._paq = window._paq || [];

const MatomoDialog = props => {
  const {
    settings,
    showMatamo,
    appManager
  } = (0, _react.useContext)(_context.AppContext);
  const {
    modal
  } = (0, _provider.useDialogDispatchers)();
  const [visible, setVisible] = (0, _react.useState)(props.hide);

  const message = () => {
    return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
      children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("p", {
        children: ["An Opt-in version of ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
          href: "https://matomo.org",
          target: "_blank",
          rel: "noreferrer",
          children: "Matomo"
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 12,
          columnNumber: 39
        }, void 0), ", an open source data analytics platform is being used to improve Remix IDE."]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 12,
        columnNumber: 15
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("p", {
        children: "We realize that our users have sensitive information in their code and that their privacy - your privacy - must be protected."
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 13,
        columnNumber: 7
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("p", {
        children: ["All data collected through Matomo is stored on our own server - no data is ever given to third parties.  Our analytics reports are public: ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
          href: "https://matomo.ethereum.org/index.php?module=MultiSites&action=index&idSite=23&period=day&date=yesterday",
          target: "_blank",
          rel: "noreferrer",
          children: "take a look"
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 14,
          columnNumber: 149
        }, void 0), "."]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 14,
        columnNumber: 7
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("p", {
        children: "We do not collect nor store any personally identifiable information (PII)."
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 15,
        columnNumber: 7
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("p", {
        children: ["For more info, see: ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
          href: "https://medium.com/p/66ef69e14931/",
          target: "_blank",
          rel: "noreferrer",
          children: "Matomo Analyitcs on Remix iDE"
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 16,
          columnNumber: 30
        }, void 0), "."]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 16,
        columnNumber: 7
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("p", {
        children: "You can change your choice in the Settings panel anytime."
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 17,
        columnNumber: 7
      }, void 0)]
    }, void 0, true);
  };

  (0, _react.useEffect)(() => {
    if (visible && showMatamo) {
      modal({
        id: 'matomoModal',
        title: 'Help us to improve Remix IDE',
        message: message(),
        okLabel: 'Accept',
        okFn: handleModalOkClick,
        cancelLabel: 'Decline',
        cancelFn: declineModal
      });
    }
  }, [visible]);

  const declineModal = async () => {
    settings.updateMatomoAnalyticsChoice(false);

    _paq.push(['optUserOut']);

    appManager.call('walkthrough', 'start');
    setVisible(false);
  };

  const handleModalOkClick = async () => {
    _paq.push(['forgetUserOptOut']); // @TODO remove next line when https://github.com/matomo-org/matomo/commit/9e10a150585522ca30ecdd275007a882a70c6df5 is used


    document.cookie = 'mtm_consent_removed=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    settings.updateMatomoAnalyticsChoice(true);
    appManager.call('walkthrough', 'start');
    setVisible(false);
  };

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {}, void 0, false);
};

var _default = MatomoDialog;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/modal-wrapper.tsx":
/*!***************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/modals/modal-wrapper.tsx ***!
  \***************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _modalDialog = __webpack_require__(/*! @remix-ui/modal-dialog */ "../../../libs/remix-ui/modal-dialog/src/index.ts");

var _types = __webpack_require__(/*! ../../types */ "../../../libs/remix-ui/app/src/lib/remix-app/types/index.ts");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\app\\src\\lib\\remix-app\\components\\modals\\modal-wrapper.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

const ModalWrapper = props => {
  const [state, setState] = (0, _react.useState)();
  const ref = (0, _react.useRef)();
  const data = (0, _react.useRef)();

  const onFinishPrompt = async () => {
    if (ref.current === undefined) {
      onOkFn();
    } else {
      // @ts-ignore: Object is possibly 'null'.
      props.okFn ? props.okFn(ref.current.value) : props.resolve(ref.current.value);
    }
  };

  const onOkFn = async () => {
    props.okFn ? props.okFn(data.current) : props.resolve(data.current || true);
  };

  const onCancelFn = async () => {
    props.cancelFn ? props.cancelFn() : props.resolve(false);
  };

  const onInputChanged = event => {
    if (props.validationFn) {
      const validation = props.validationFn(event.target.value);
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          message: createModalMessage(props.defaultValue, validation),
          validation
        });
      });
    }
  };

  const createModalMessage = (defaultValue, validation) => {
    return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
      children: [props.message, /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
        onChange: onInputChanged,
        type: props.modalType === _types.ModalTypes.password ? 'password' : 'text',
        defaultValue: defaultValue,
        "data-id": "modalDialogCustomPromp",
        ref: ref,
        className: "form-control"
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 45,
        columnNumber: 9
      }, void 0), !validation.valid && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        className: "text-warning",
        children: validation.message
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 46,
        columnNumber: 31
      }, void 0)]
    }, void 0, true);
  };

  (0, _react.useEffect)(() => {
    data.current = props.data;

    if (props.modalType) {
      switch (props.modalType) {
        case _types.ModalTypes.prompt:
        case _types.ModalTypes.password:
          setState(_objectSpread(_objectSpread({}, props), {}, {
            okFn: onFinishPrompt,
            cancelFn: onCancelFn,
            message: createModalMessage(props.defaultValue, {
              valid: true
            })
          }));
          break;

        default:
          setState(_objectSpread(_objectSpread({}, props), {}, {
            okFn: onOkFn,
            cancelFn: onCancelFn
          }));
          break;
      }
    } else {
      setState(_objectSpread(_objectSpread({}, props), {}, {
        okFn: onOkFn,
        cancelFn: onCancelFn
      }));
    }
  }, [props]); // reset the message and input if any, so when the modal is shown again it doesn't show the previous value.

  const handleHide = () => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        message: ''
      });
    });
    props.handleHide();
  };

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_modalDialog.ModalDialog, _objectSpread(_objectSpread({
    id: props.id
  }, state), {}, {
    handleHide: handleHide
  }), void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 90,
    columnNumber: 5
  }, void 0);
};

var _default = ModalWrapper;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/origin-warning.tsx":
/*!****************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/modals/origin-warning.tsx ***!
  \****************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _provider = __webpack_require__(/*! ../../context/provider */ "../../../libs/remix-ui/app/src/lib/remix-app/context/provider.tsx");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const OriginWarning = () => {
  const {
    alert
  } = (0, _provider.useDialogDispatchers)();
  const [content, setContent] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    // check the origin and warn message
    if (window.location.hostname === 'yann300.github.io') {
      setContent('This UNSTABLE ALPHA branch of Remix has been moved to http://ethereum.github.io/remix-live-alpha.');
    } else if (window.location.hostname === 'remix-alpha.ethereum.org' || window.location.hostname === 'ethereum.github.io' && window.location.pathname.indexOf('/remix-live-alpha') === 0) {
      setContent('Welcome to the Remix alpha instance. Please use it to try out latest features. But use preferably https://remix.ethereum.org for any production work.');
    }
  }, []);
  (0, _react.useEffect)(() => {
    if (content) {
      alert({
        id: 'warningOriging',
        title: null,
        message: content
      });
    }
  }, [content]);
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {}, void 0, false);
};

var _default = OriginWarning;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/context/context.tsx":
/*!***********************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/context/context.tsx ***!
  \***********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.modalContext = exports.dispatchModalContext = exports.AppContext = void 0;

var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _modals = __webpack_require__(/*! ../state/modals */ "../../../libs/remix-ui/app/src/lib/remix-app/state/modals.ts");

const AppContext = /*#__PURE__*/_react.default.createContext(null);

exports.AppContext = AppContext;

const dispatchModalContext = /*#__PURE__*/_react.default.createContext({
  modal: data => {},
  toast: message => {},
  alert: data => {},
  handleHideModal: () => {},
  handleToaster: () => {}
});

exports.dispatchModalContext = dispatchModalContext;

const modalContext = /*#__PURE__*/_react.default.createContext(_modals.ModalInitialState);

exports.modalContext = modalContext;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/context/provider.tsx":
/*!************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/context/provider.tsx ***!
  \************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useDialogs = exports.useDialogDispatchers = exports.ModalProvider = exports.AppProvider = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _modals = __webpack_require__(/*! ../actions/modals */ "../../../libs/remix-ui/app/src/lib/remix-app/actions/modals.ts");

var _modals2 = __webpack_require__(/*! ../reducer/modals */ "../../../libs/remix-ui/app/src/lib/remix-app/reducer/modals.ts");

var _modals3 = __webpack_require__(/*! ../state/modals */ "../../../libs/remix-ui/app/src/lib/remix-app/state/modals.ts");

var _types = __webpack_require__(/*! ../types */ "../../../libs/remix-ui/app/src/lib/remix-app/types/index.ts");

var _context = __webpack_require__(/*! ./context */ "../../../libs/remix-ui/app/src/lib/remix-app/context/context.tsx");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\app\\src\\lib\\remix-app\\context\\provider.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const ModalProvider = ({
  children: _children = [],
  reducer: _reducer = _modals2.modalReducer,
  initialState: _initialState = _modals3.ModalInitialState
} = {}) => {
  const [{
    modals,
    toasters,
    focusModal,
    focusToaster
  }, dispatch] = (0, _react.useReducer)(_reducer, _initialState);

  const onNextFn = async () => {
    dispatch({
      type: _modals.modalActionTypes.processQueue
    });
  };

  const modal = modalData => {
    const {
      id,
      title,
      message,
      validationFn,
      okLabel,
      okFn,
      cancelLabel,
      cancelFn,
      modalType,
      defaultValue,
      hideFn,
      data
    } = modalData;
    return new Promise((resolve, reject) => {
      dispatch({
        type: _modals.modalActionTypes.setModal,
        payload: {
          id,
          title,
          message,
          okLabel,
          validationFn,
          okFn,
          cancelLabel,
          cancelFn,
          modalType: modalType || _types.ModalTypes.default,
          defaultValue: defaultValue,
          hideFn,
          resolve,
          next: onNextFn,
          data
        }
      });
    });
  };

  const alert = modalData => {
    return modal({
      id: modalData.id,
      title: modalData.title || 'Alert',
      message: modalData.message || modalData.title,
      okLabel: 'OK',
      okFn: value => {},
      cancelLabel: '',
      cancelFn: () => {}
    });
  };

  const handleHideModal = () => {
    dispatch({
      type: _modals.modalActionTypes.handleHideModal,
      payload: null
    });
  };

  const toast = message => {
    dispatch({
      type: _modals.modalActionTypes.setToast,
      payload: message
    });
  };

  const handleToaster = () => {
    dispatch({
      type: _modals.modalActionTypes.handleToaster,
      payload: null
    });
  };

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_context.dispatchModalContext.Provider, {
    value: {
      modal,
      toast,
      alert,
      handleHideModal,
      handleToaster
    },
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_context.modalContext.Provider, {
      value: {
        modals,
        toasters,
        focusModal,
        focusToaster
      },
      children: _children
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 54,
      columnNumber: 5
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 53,
    columnNumber: 11
  }, void 0);
};

exports.ModalProvider = ModalProvider;

const AppProvider = ({
  children: _children2 = [],
  value: _value = {}
} = {}) => {
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_context.AppContext.Provider, {
    value: _value,
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(ModalProvider, {
      children: _children2
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 62,
      columnNumber: 5
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 61,
    columnNumber: 10
  }, void 0);
};

exports.AppProvider = AppProvider;

const useDialogs = () => {
  return _react.default.useContext(_context.modalContext);
};

exports.useDialogs = useDialogs;

const useDialogDispatchers = () => {
  return _react.default.useContext(_context.dispatchModalContext);
};

exports.useDialogDispatchers = useDialogDispatchers;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/interface/index.ts":
/*!**********************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/interface/index.ts ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/reducer/modals.ts":
/*!*********************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/reducer/modals.ts ***!
  \*********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.modalReducer = void 0;

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));

var _modals = __webpack_require__(/*! ../actions/modals */ "../../../libs/remix-ui/app/src/lib/remix-app/actions/modals.ts");

var _modals2 = __webpack_require__(/*! ../state/modals */ "../../../libs/remix-ui/app/src/lib/remix-app/state/modals.ts");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

const modalReducer = (state = _modals2.ModalInitialState, action) => {
  switch (action.type) {
    case _modals.modalActionTypes.setModal:
      {
        const timestamp = Date.now();
        const focusModal = {
          timestamp,
          id: action.payload.id || timestamp.toString(),
          hide: false,
          title: action.payload.title,
          validationFn: action.payload.validationFn,
          message: action.payload.message,
          okLabel: action.payload.okLabel,
          okFn: action.payload.okFn,
          cancelLabel: action.payload.cancelLabel,
          cancelFn: action.payload.cancelFn,
          modalType: action.payload.modalType,
          defaultValue: action.payload.defaultValue,
          hideFn: action.payload.hideFn,
          resolve: action.payload.resolve,
          next: action.payload.next,
          data: action.payload.data
        };
        const modalList = state.modals.slice();
        modalList.push(focusModal);

        if (modalList.length === 1) {
          return _objectSpread(_objectSpread({}, state), {}, {
            modals: modalList,
            focusModal
          });
        } else {
          return _objectSpread(_objectSpread({}, state), {}, {
            modals: modalList
          });
        }
      }

    case _modals.modalActionTypes.handleHideModal:
      {
        setTimeout(() => {
          if (state.focusModal.hideFn) {
            state.focusModal.hideFn();
          }

          if (state.focusModal.resolve) {
            state.focusModal.resolve(undefined);
          }

          if (state.focusModal.next) {
            state.focusModal.next();
          }
        }, 250);
        const modalList = state.modals.slice();
        modalList.shift(); // remove the current modal from the list

        state.focusModal = _objectSpread(_objectSpread({}, state.focusModal), {}, {
          hide: true,
          message: null
        });
        return _objectSpread(_objectSpread({}, state), {}, {
          modals: modalList
        });
      }

    case _modals.modalActionTypes.processQueue:
      {
        const modalList = state.modals.slice();

        if (modalList.length) {
          const focusModal = modalList[0]; // extract the next modal from the list

          return _objectSpread(_objectSpread({}, state), {}, {
            modals: modalList,
            focusModal
          });
        } else {
          return _objectSpread(_objectSpread({}, state), {}, {
            modals: modalList
          });
        }
      }

    case _modals.modalActionTypes.setToast:
      {
        const toasterList = state.toasters.slice();
        const message = action.payload;
        toasterList.push(message);

        if (toasterList.length === 1) {
          return _objectSpread(_objectSpread({}, state), {}, {
            toasters: toasterList,
            focusToaster: action.payload
          });
        } else {
          return _objectSpread(_objectSpread({}, state), {}, {
            toasters: toasterList
          });
        }
      }

    case _modals.modalActionTypes.handleToaster:
      {
        const toasterList = state.toasters.slice();
        toasterList.shift();

        if (toasterList.length) {
          const toaster = toasterList[0];
          return _objectSpread(_objectSpread({}, state), {}, {
            toasters: toasterList,
            focusToaster: toaster
          });
        } else {
          return _objectSpread(_objectSpread({}, state), {}, {
            toasters: []
          });
        }
      }
  }
};

exports.modalReducer = modalReducer;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/remix-app.tsx":
/*!*****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/remix-app.tsx ***!
  \*****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

__webpack_require__(/*! ./style/remix-app.css */ "../../../libs/remix-ui/app/src/lib/remix-app/style/remix-app.css");

var _panel = __webpack_require__(/*! @remix-ui/panel */ "../../../libs/remix-ui/panel/src/index.ts");

var _matomo = _interopRequireDefault(__webpack_require__(/*! ./components/modals/matomo */ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/matomo.tsx"));

var _originWarning = _interopRequireDefault(__webpack_require__(/*! ./components/modals/origin-warning */ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/origin-warning.tsx"));

var _dragbar = _interopRequireDefault(__webpack_require__(/*! ./components/dragbar/dragbar */ "../../../libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.tsx"));

var _provider = __webpack_require__(/*! ./context/provider */ "../../../libs/remix-ui/app/src/lib/remix-app/context/provider.tsx");

var _dialogs = _interopRequireDefault(__webpack_require__(/*! ./components/modals/dialogs */ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/dialogs.tsx"));

var _dialogViewPlugin = _interopRequireDefault(__webpack_require__(/*! ./components/modals/dialogViewPlugin */ "../../../libs/remix-ui/app/src/lib/remix-app/components/modals/dialogViewPlugin.tsx"));

var _context = __webpack_require__(/*! ./context/context */ "../../../libs/remix-ui/app/src/lib/remix-app/context/context.tsx");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\app\\src\\lib\\remix-app\\remix-app.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const RemixApp = props => {
  const [appReady, setAppReady] = (0, _react.useState)(false);
  const [hideSidePanel, setHideSidePanel] = (0, _react.useState)(false);
  const [maximiseTrigger, setMaximiseTrigger] = (0, _react.useState)(0);
  const [resetTrigger, setResetTrigger] = (0, _react.useState)(0);
  const sidePanelRef = (0, _react.useRef)(null);
  (0, _react.useEffect)(() => {
    async function activateApp() {
      props.app.themeModule.initTheme(() => {
        setAppReady(true);
        props.app.activate();
        setListeners();
      });
    }

    if (props.app) {
      activateApp();
    }
  }, []);

  function setListeners() {
    props.app.sidePanel.events.on('toggle', () => {
      setHideSidePanel(prev => {
        return !prev;
      });
    });
    props.app.sidePanel.events.on('showing', () => {
      setHideSidePanel(false);
    });
    props.app.layout.event.on('minimizesidepanel', () => {
      // the 'showing' event always fires from sidepanel, so delay this a bit
      setTimeout(() => {
        setHideSidePanel(true);
      }, 1000);
    });
    props.app.layout.event.on('maximisesidepanel', () => {
      setMaximiseTrigger(prev => {
        return prev + 1;
      });
    });
    props.app.layout.event.on('resetsidepanel', () => {
      setResetTrigger(prev => {
        return prev + 1;
      });
    });
  }

  const value = {
    settings: props.app.settings,
    showMatamo: props.app.showMatamo,
    appManager: props.app.appManager,
    modal: props.app.notification,
    layout: props.app.layout
  };
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_provider.AppProvider, {
    value: value,
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_originWarning.default, {}, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 77,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_matomo.default, {
      hide: !appReady
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 78,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: `remixIDE ${appReady ? '' : 'd-none'}`,
      "data-id": "remixIDE",
      children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        id: "icon-panel",
        "data-id": "remixIdeIconPanel",
        className: "iconpanel bg-light",
        children: props.app.menuicons.render()
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 81,
        columnNumber: 9
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        ref: sidePanelRef,
        id: "side-panel",
        "data-id": "remixIdeSidePanel",
        className: `sidepanel border-right border-left ${hideSidePanel ? 'd-none' : ''}`,
        children: props.app.sidePanel.render()
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 82,
        columnNumber: 9
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_dragbar.default, {
        resetTrigger: resetTrigger,
        maximiseTrigger: maximiseTrigger,
        minWidth: 250,
        refObject: sidePanelRef,
        hidden: hideSidePanel,
        setHideStatus: setHideSidePanel
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 83,
        columnNumber: 9
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        id: "main-panel",
        "data-id": "remixIdeMainPanel",
        className: "mainpanel",
        children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_panel.RemixUIMainPanel, {
          Context: _context.AppContext
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 85,
          columnNumber: 11
        }, void 0)
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 84,
        columnNumber: 9
      }, void 0)]
    }, void 0, true, {
      fileName: _jsxFileName,
      lineNumber: 80,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      children: props.app.hiddenPanel.render()
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 88,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_dialogs.default, {}, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 89,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_dialogViewPlugin.default, {}, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 90,
      columnNumber: 7
    }, void 0)]
  }, void 0, true, {
    fileName: _jsxFileName,
    lineNumber: 76,
    columnNumber: 5
  }, void 0);
};

var _default = RemixApp;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/state/modals.ts":
/*!*******************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/state/modals.ts ***!
  \*******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ModalInitialState = void 0;
const ModalInitialState = {
  modals: [],
  toasters: [],
  focusModal: {
    id: '',
    hide: true,
    title: '',
    message: '',
    validationFn: () => {
      return {
        valid: true,
        message: ''
      };
    },
    okLabel: '',
    okFn: () => {},
    cancelLabel: '',
    cancelFn: () => {}
  },
  focusToaster: ''
};
exports.ModalInitialState = ModalInitialState;

/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/style/remix-app.css":
/*!***********************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/style/remix-app.css ***!
  \***********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./remix-app.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/app/src/lib/remix-app/style/remix-app.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/app/src/lib/remix-app/types/index.ts":
/*!******************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/types/index.ts ***!
  \******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ModalTypes = void 0;
let ModalTypes;
exports.ModalTypes = ModalTypes;

(function (ModalTypes) {
  ModalTypes["alert"] = "alert";
  ModalTypes["confirm"] = "confirm";
  ModalTypes["prompt"] = "prompt";
  ModalTypes["password"] = "password";
  ModalTypes["default"] = "default";
})(ModalTypes || (exports.ModalTypes = ModalTypes = {}));

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/index.ts":
/*!*******************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/index.ts ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _modalDialogCustom = __webpack_require__(/*! ./lib/modal-dialog-custom */ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.tsx");

Object.keys(_modalDialogCustom).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _modalDialogCustom[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _modalDialogCustom[key];
    }
  });
});

var _remixUiModalDialog = __webpack_require__(/*! ./lib/remix-ui-modal-dialog */ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.tsx");

Object.keys(_remixUiModalDialog).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _remixUiModalDialog[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _remixUiModalDialog[key];
    }
  });
});

var _index = __webpack_require__(/*! ./lib/types/index */ "../../../libs/remix-ui/modal-dialog/src/lib/types/index.ts");

Object.keys(_index).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _index[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css":
/*!**************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css ***!
  \**************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./modal-dialog-custom.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.tsx":
/*!**************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.tsx ***!
  \**************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ModalDialogCustom = void 0;

var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

__webpack_require__(/*! ./modal-dialog-custom.css */ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\modal-dialog\\src\\lib\\modal-dialog-custom.tsx";

const ModalDialogCustom = props => {
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("h1", {
      children: "Welcome to modal-dialog-custom!"
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 11,
      columnNumber: 7
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 10,
    columnNumber: 5
  }, void 0);
};

exports.ModalDialogCustom = ModalDialogCustom;
var _default = ModalDialogCustom;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css":
/*!****************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css ***!
  \****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./remix-ui-modal-dialog.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.tsx":
/*!****************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.tsx ***!
  \****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ModalDialog = void 0;

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

__webpack_require__(/*! ./remix-ui-modal-dialog.css */ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\modal-dialog\\src\\lib\\remix-ui-modal-dialog.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

const ModalDialog = props => {
  const [state, setState] = (0, _react.useState)({
    toggleBtn: true
  });
  const calledHideFunctionOnce = (0, _react.useRef)();
  const modal = (0, _react.useRef)(null);

  const handleHide = () => {
    if (!calledHideFunctionOnce.current) {
      props.handleHide();
    }

    calledHideFunctionOnce.current = true;
  };

  (0, _react.useEffect)(() => {
    calledHideFunctionOnce.current = props.hide;
    modal.current.focus();
  }, [props.hide]);
  (0, _react.useEffect)(() => {
    function handleBlur(e) {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        e.stopPropagation();

        if (document.activeElement !== this) {
          !window.testmode && handleHide();
        }
      }
    }

    if (modal.current) {
      modal.current.addEventListener('blur', handleBlur);
    }

    return () => {
      modal.current && modal.current.removeEventListener('blur', handleBlur);
    };
  }, [modal.current]);

  const modalKeyEvent = keyCode => {
    if (keyCode === 27) {
      // Esc
      if (props.cancelFn) props.cancelFn();
      handleHide();
    } else if (keyCode === 13) {
      // Enter
      enterHandler();
    } else if (keyCode === 37) {
      // todo && footerIsActive) { // Arrow Left
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          toggleBtn: true
        });
      });
    } else if (keyCode === 39) {
      // todo && footerIsActive) { // Arrow Right
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          toggleBtn: false
        });
      });
    }
  };

  const enterHandler = () => {
    if (state.toggleBtn) {
      if (props.okFn) props.okFn();
    } else {
      if (props.cancelFn) props.cancelFn();
    }

    handleHide();
  };

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    "data-id": `${props.id}ModalDialogContainer-react`,
    "data-backdrop": "static",
    "data-keyboard": "false",
    className: "modal",
    style: {
      display: props.hide ? 'none' : 'block'
    },
    role: "dialog",
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: "modal-dialog",
      role: "document",
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        ref: modal,
        tabIndex: -1,
        className: 'modal-content remixModalContent ' + (props.modalClass ? props.modalClass : ''),
        onKeyDown: ({
          keyCode
        }) => {
          modalKeyEvent(keyCode);
        },
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "modal-header",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("h6", {
            className: "modal-title",
            "data-id": `${props.id}ModalDialogModalTitle-react`,
            children: props.title && props.title
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 85,
            columnNumber: 13
          }, void 0), !props.showCancelIcon && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
            className: "modal-close",
            onClick: () => handleHide(),
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
              title: "Close",
              className: "fas fa-times",
              "aria-hidden": "true"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 90,
              columnNumber: 17
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 89,
            columnNumber: 15
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 84,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "modal-body text-break remixModalBody",
          "data-id": `${props.id}ModalDialogModalBody-react`,
          children: props.children ? props.children : props.message
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 94,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "modal-footer",
          "data-id": `${props.id}ModalDialogModalFooter-react`,
          children: [props.okLabel && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            "data-id": `${props.id}-modal-footer-ok-react`,
            className: 'modal-ok btn btn-sm ' + (state.toggleBtn ? 'btn-dark' : 'btn-light'),
            disabled: props.validation && !props.validation.valid,
            onClick: () => {
              if (props.validation && !props.validation.valid) return;
              if (props.okFn) props.okFn();
              handleHide();
            },
            children: props.okLabel ? props.okLabel : 'OK'
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 99,
            columnNumber: 32
          }, void 0), props.cancelLabel && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            "data-id": `${props.id}-modal-footer-cancel-react`,
            className: 'modal-cancel btn btn-sm ' + (state.toggleBtn ? 'btn-light' : 'btn-dark'),
            "data-dismiss": "modal",
            onClick: () => {
              if (props.cancelFn) props.cancelFn();
              handleHide();
            },
            children: props.cancelLabel ? props.cancelLabel : 'Cancel'
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 112,
            columnNumber: 36
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 97,
          columnNumber: 11
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 78,
        columnNumber: 9
      }, void 0)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 77,
      columnNumber: 7
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 69,
    columnNumber: 5
  }, void 0);
};

exports.ModalDialog = ModalDialog;
var _default = ModalDialog;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/types/index.ts":
/*!*****************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/lib/types/index.ts ***!
  \*****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/***/ }),

/***/ "../../../libs/remix-ui/panel/src/index.ts":
/*!************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/index.ts ***!
  \************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "RemixPluginPanel", {
  enumerable: true,
  get: function () {
    return _remixUiPanel.default;
  }
});
Object.defineProperty(exports, "RemixUIMainPanel", {
  enumerable: true,
  get: function () {
    return _mainPanel.default;
  }
});

var _remixUiPanel = _interopRequireDefault(__webpack_require__(/*! ./lib/plugins/remix-ui-panel */ "../../../libs/remix-ui/panel/src/lib/plugins/remix-ui-panel.tsx"));

var _mainPanel = _interopRequireDefault(__webpack_require__(/*! ./lib/main/main-panel */ "../../../libs/remix-ui/panel/src/lib/main/main-panel.tsx"));

/***/ }),

/***/ "../../../libs/remix-ui/panel/src/lib/dragbar/dragbar.css":
/*!***************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/dragbar/dragbar.css ***!
  \***************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./dragbar.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/panel/src/lib/dragbar/dragbar.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/panel/src/lib/dragbar/dragbar.tsx":
/*!***************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/dragbar/dragbar.tsx ***!
  \***************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _reactDraggable = _interopRequireDefault(__webpack_require__(/*! react-draggable */ "../../../node_modules/react-draggable/build/cjs/cjs.js"));

__webpack_require__(/*! ./dragbar.css */ "../../../libs/remix-ui/panel/src/lib/dragbar/dragbar.css");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\panel\\src\\lib\\dragbar\\dragbar.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const DragBar = props => {
  const [dragState, setDragState] = (0, _react.useState)(false);
  const [dragBarPosY, setDragBarPosY] = (0, _react.useState)(0);

  const nodeRef = _react.default.useRef(null); // fix for strictmode


  function stopDrag(e, data) {
    const h = window.innerHeight - data.y;
    props.refObject.current.setAttribute('style', `height: ${h}px;`);
    setDragBarPosY(window.innerHeight - props.refObject.current.offsetHeight);
    setDragState(false);
    props.setHideStatus(false);
  }

  const handleResize = () => {
    setDragBarPosY(window.innerHeight - props.refObject.current.offsetHeight);
  };

  (0, _react.useEffect)(() => {
    handleResize();
  }, [props.hidden]);
  (0, _react.useEffect)(() => {
    window.addEventListener('resize', handleResize); // TODO: not a good way to wait on the ref doms element to be rendered of course

    setTimeout(() => handleResize(), 2000);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function startDrag() {
    setDragState(true);
  }

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: `overlay ${dragState ? '' : 'd-none'}`
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 45,
      columnNumber: 5
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactDraggable.default, {
      nodeRef: nodeRef,
      position: {
        x: 0,
        y: dragBarPosY
      },
      onStart: startDrag,
      onStop: stopDrag,
      axis: "y",
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        ref: nodeRef,
        className: `dragbar_terminal ${dragState ? 'ondrag' : ''}`
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 47,
        columnNumber: 7
      }, void 0)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 46,
      columnNumber: 5
    }, void 0)]
  }, void 0, true);
};

var _default = DragBar;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/panel/src/lib/main/main-panel.css":
/*!***************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/main/main-panel.css ***!
  \***************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./main-panel.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/panel/src/lib/main/main-panel.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/panel/src/lib/main/main-panel.tsx":
/*!***************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/main/main-panel.tsx ***!
  \***************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _dragbar = _interopRequireDefault(__webpack_require__(/*! ../dragbar/dragbar */ "../../../libs/remix-ui/panel/src/lib/dragbar/dragbar.tsx"));

var _panelPlugin = _interopRequireDefault(__webpack_require__(/*! ../plugins/panel-plugin */ "../../../libs/remix-ui/panel/src/lib/plugins/panel-plugin.tsx"));

__webpack_require__(/*! ./main-panel.css */ "../../../libs/remix-ui/panel/src/lib/main/main-panel.css");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\panel\\src\\lib\\main\\main-panel.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const RemixUIMainPanel = props => {
  const appContext = (0, _react.useContext)(props.Context);
  const [plugins, setPlugins] = (0, _react.useState)([]);
  const editorRef = (0, _react.useRef)(null);
  const mainPanelRef = (0, _react.useRef)(null);
  const tabsRef = (0, _react.useRef)(null);
  const terminalRef = (0, _react.useRef)(null);
  const refs = [tabsRef, editorRef, mainPanelRef, terminalRef];

  const renderPanels = () => {
    if (appContext) {
      const pluginPanels = [];
      Object.values(appContext.layout.panels).map(panel => {
        pluginPanels.push({
          profile: panel.plugin.profile,
          active: panel.active,
          view: panel.plugin.profile.name === 'tabs' ? panel.plugin.renderTabsbar() : panel.plugin.render(),
          class: panel.plugin.profile.name + '-wrap ' + (panel.minimized ? 'minimized' : ''),
          minimized: panel.minimized
        });
      });
      setPlugins(pluginPanels);
    }
  };

  (0, _react.useEffect)(() => {
    renderPanels();
    appContext.layout.event.on('change', () => {
      renderPanels();
    });
    return () => {
      appContext.layout.event.off('change');
    };
  }, []);

  const showTerminal = hide => {
    appContext.layout.panels.terminal.minimized = hide;
    appContext.layout.event.emit('change', appContext.layout.panels);
    appContext.layout.emit('change', appContext.layout.panels);
  };

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    className: "mainview",
    children: Object.values(plugins).map((pluginRecord, i) => {
      return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_react.default.Fragment, {
        children: [pluginRecord.profile.name === 'terminal' ? /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_dragbar.default, {
          hidden: pluginRecord.minimized || false,
          setHideStatus: showTerminal,
          refObject: terminalRef
        }, 'dragbar-terminal', false, {
          fileName: _jsxFileName,
          lineNumber: 60,
          columnNumber: 59
        }, void 0) : null, /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_panelPlugin.default, {
          ref: refs[i],
          pluginRecord: pluginRecord
        }, pluginRecord.profile.name, false, {
          fileName: _jsxFileName,
          lineNumber: 61,
          columnNumber: 13
        }, void 0)]
      }, `mainView${i}`, true, {
        fileName: _jsxFileName,
        lineNumber: 59,
        columnNumber: 11
      }, void 0);
    })
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 56,
    columnNumber: 5
  }, void 0);
};

var _default = RemixUIMainPanel;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/panel/src/lib/plugins/panel-plugin.tsx":
/*!********************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/plugins/panel-plugin.tsx ***!
  \********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

__webpack_require__(/*! ./panel.css */ "../../../libs/remix-ui/panel/src/lib/plugins/panel.css");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\panel\\src\\lib\\plugins\\panel-plugin.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const RemixUIPanelPlugin = (props, panelRef) => {
  const localRef = (0, _react.useRef)(null);
  const [view, setView] = (0, _react.useState)();
  (0, _react.useEffect)(() => {
    const ref = panelRef || localRef;

    if (ref.current) {
      if (props.pluginRecord.view) {
        if ( /*#__PURE__*/_react.default.isValidElement(props.pluginRecord.view)) {
          setView(props.pluginRecord.view);
        } else {
          ref.current.appendChild(props.pluginRecord.view);
        }
      }
    }
  }, []);
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    className: props.pluginRecord.active ? `${props.pluginRecord.class}` : 'd-none',
    ref: panelRef || localRef,
    children: view
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 27,
    columnNumber: 5
  }, void 0);
};

var _default = /*#__PURE__*/(0, _react.forwardRef)(RemixUIPanelPlugin);

exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/panel/src/lib/plugins/panel.css":
/*!*************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/plugins/panel.css ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./panel.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/panel/src/lib/plugins/panel.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/panel/src/lib/plugins/remix-ui-panel.tsx":
/*!**********************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/plugins/remix-ui-panel.tsx ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RemixPluginPanel = RemixPluginPanel;
exports.default = void 0;

var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

__webpack_require__(/*! ./panel.css */ "../../../libs/remix-ui/panel/src/lib/plugins/panel.css");

var _panelPlugin = _interopRequireDefault(__webpack_require__(/*! ./panel-plugin */ "../../../libs/remix-ui/panel/src/lib/plugins/panel-plugin.tsx"));

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\panel\\src\\lib\\plugins\\remix-ui-panel.tsx";

function RemixPluginPanel(props) {
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: [props.header, /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: "pluginsContainer",
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: "plugins pb-2",
        id: "plugins",
        children: Object.values(props.plugins).map(pluginRecord => {
          return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_panelPlugin.default, {
            pluginRecord: pluginRecord
          }, pluginRecord.profile.name, false, {
            fileName: _jsxFileName,
            lineNumber: 20,
            columnNumber: 20
          }, this);
        })
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 18,
        columnNumber: 9
      }, this)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 17,
      columnNumber: 7
    }, this)]
  }, void 0, true);
}

var _default = RemixPluginPanel;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/toaster/src/index.ts":
/*!**************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/toaster/src/index.ts ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toaster = __webpack_require__(/*! ./lib/toaster */ "../../../libs/remix-ui/toaster/src/lib/toaster.tsx");

Object.keys(_toaster).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _toaster[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _toaster[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/toaster/src/lib/toaster.css":
/*!*********************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/toaster/src/lib/toaster.css ***!
  \*********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./toaster.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/toaster/src/lib/toaster.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/toaster/src/lib/toaster.tsx":
/*!*********************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/toaster/src/lib/toaster.tsx ***!
  \*********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Toaster = void 0;

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _modalDialog = __webpack_require__(/*! @remix-ui/modal-dialog */ "../../../libs/remix-ui/modal-dialog/src/index.ts");

__webpack_require__(/*! ./toaster.css */ "../../../libs/remix-ui/toaster/src/lib/toaster.css");

var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");

var _jsxFileName = "C:\\Users\\guwno\\Desktop\\remix-project-master\\libs\\remix-ui\\toaster\\src\\lib\\toaster.tsx";

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

const Toaster = props => {
  const [state, setState] = (0, _react.useState)({
    message: '',
    hide: true,
    hiding: false,
    timeOutId: null,
    timeOut: props.timeOut || 7000,
    showModal: false,
    showFullBtn: false
  });
  (0, _react.useEffect)(() => {
    if (props.message) {
      const timeOutId = setTimeout(() => {
        setState(prevState => {
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hiding: true
          });
        });
      }, state.timeOut);
      setState(prevState => {
        if (typeof props.message === 'string' && props.message.length > 201) {
          const shortTooltipText = props.message.substring(0, 200) + '...';
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hide: false,
            hiding: false,
            timeOutId,
            message: shortTooltipText
          });
        } else {
          const shortTooltipText = props.message;
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hide: false,
            hiding: false,
            timeOutId,
            message: shortTooltipText
          });
        }
      });
    }
  }, [props.message]);
  (0, _react.useEffect)(() => {
    if (state.hiding) {
      setTimeout(() => {
        closeTheToaster();
      }, 1800);
    }
  }, [state.hiding]);

  const showFullMessage = () => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        showModal: true
      });
    });
  };

  const hideFullMessage = () => {
    //eslint-disable-line
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        showModal: false
      });
    });
  };

  const closeTheToaster = () => {
    if (state.timeOutId) {
      clearTimeout(state.timeOutId);
    }

    props.handleHide && props.handleHide();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        message: '',
        hide: true,
        hiding: false,
        timeOutId: null,
        showModal: false
      });
    });
  };

  const handleMouseEnter = () => {
    if (state.timeOutId) {
      clearTimeout(state.timeOutId);
    }

    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        timeOutId: null
      });
    });
  };

  const handleMouseLeave = () => {
    if (!state.timeOutId) {
      const timeOutId = setTimeout(() => {
        setState(prevState => {
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hiding: true
          });
        });
      }, state.timeOut);
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          timeOutId
        });
      });
    }
  };

  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_modalDialog.ModalDialog, {
      id: "toaster",
      message: props.message,
      cancelLabel: "Close",
      cancelFn: () => {},
      hide: !state.showModal,
      handleHide: hideFullMessage
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 109,
      columnNumber: 7
    }, void 0), !state.hide && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      "data-shared": "tooltipPopup",
      className: `remixui_tooltip alert alert-info p-2 ${state.hiding ? 'remixui_animateTop' : 'remixui_animateBottom'}`,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        className: "px-2",
        children: [state.message, state.showFullBtn && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
          className: "btn btn-secondary btn-sm mx-3",
          style: {
            whiteSpace: 'nowrap'
          },
          onClick: showFullMessage,
          children: "Show full message"
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 121,
          columnNumber: 36
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 119,
        columnNumber: 11
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        style: {
          alignSelf: 'baseline'
        },
        children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
          "data-id": "tooltipCloseButton",
          className: "fas fa-times btn-info mx-1 p-0",
          onClick: closeTheToaster
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 124,
          columnNumber: 13
        }, void 0)
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 123,
        columnNumber: 11
      }, void 0)]
    }, void 0, true, {
      fileName: _jsxFileName,
      lineNumber: 118,
      columnNumber: 9
    }, void 0)]
  }, void 0, true);
};

exports.Toaster = Toaster;
var _default = Toaster;
exports.default = _default;

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.css":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/components/dragbar/dragbar.css ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, "/* dragbar UI */\n\n.dragbar {\n  display: block;\n  height: 100%;\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 0.3em;\n  z-index: 1000;\n}\n\n.overlay {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100vw;\n  height: 100vh;\n  display: block;\n  z-index: 1000;\n}\n\n.dragbar:hover,\n.dragbar.ondrag {\n  background-color: var(--secondary);\n  cursor: col-resize;\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRyYWdiYXIuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGVBQWU7O0FBRWY7RUFDRSxjQUFjO0VBQ2QsWUFBWTtFQUNaLGtCQUFrQjtFQUNsQixTQUFTO0VBQ1QsUUFBUTtFQUNSLFlBQVk7RUFDWixhQUFhO0FBQ2Y7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsT0FBTztFQUNQLE1BQU07RUFDTixZQUFZO0VBQ1osYUFBYTtFQUNiLGNBQWM7RUFDZCxhQUFhO0FBQ2Y7O0FBRUE7O0VBRUUsa0NBQWtDO0VBQ2xDLGtCQUFrQjtBQUNwQiIsImZpbGUiOiJkcmFnYmFyLmNzcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGRyYWdiYXIgVUkgKi9cblxuLmRyYWdiYXIge1xuICBkaXNwbGF5OiBibG9jaztcbiAgaGVpZ2h0OiAxMDAlO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGxlZnQ6IDBweDtcbiAgdG9wOiAwcHg7XG4gIHdpZHRoOiAwLjNlbTtcbiAgei1pbmRleDogMTAwMDtcbn1cblxuLm92ZXJsYXkge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGxlZnQ6IDA7XG4gIHRvcDogMDtcbiAgd2lkdGg6IDEwMHZ3O1xuICBoZWlnaHQ6IDEwMHZoO1xuICBkaXNwbGF5OiBibG9jaztcbiAgei1pbmRleDogMTAwMDtcbn1cblxuLmRyYWdiYXI6aG92ZXIsXG4uZHJhZ2Jhci5vbmRyYWcge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1zZWNvbmRhcnkpO1xuICBjdXJzb3I6IGNvbC1yZXNpemU7XG59XG4iXX0= */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/app/src/lib/remix-app/style/remix-app.css":
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/app/src/lib/remix-app/style/remix-app.css ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, "html { box-sizing: border-box; }\n*, *:before, *:after { box-sizing: inherit; }\nbody                 {\n  /* font: 14px/1.5 Lato, \"Helvetica Neue\", Helvetica, Arial, sans-serif; */\n  font-size          : .8rem;\n}\npre {\n  overflow-x: auto;\n}\n.remixIDE            {\n  width              : 100vw;\n  height             : 100vh;\n  overflow           : hidden;\n  flex-direction     : row;\n  display            : flex;\n}\n.mainpanel           {\n  display            : flex;\n  flex-direction     : column;\n  overflow           : hidden;\n  flex               : 1;\n  min-width          : 320px;\n}\n.iconpanel           {\n  display            : flex;\n  flex-direction     : column;\n  overflow           : hidden;\n  width              : 50px;\n  -webkit-user-select        : none;\n     -moz-user-select        : none;\n      -ms-user-select        : none;\n          user-select        : none;\n}\n.sidepanel           {\n  display            : flex;\n  flex-direction     : row-reverse;\n  width              : 320px;\n  transition         : width 0.25s;\n}\n.highlightcode       {\n  position           : absolute;\n  z-index            : 20;\n  background-color   : var(--info);\n}\n.highlightcode_fullLine {\n  position           : absolute;\n  z-index            : 20;\n  background-color   : var(--info);\n  opacity            : 0.5;\n}\n.centered {\n  position           : fixed;\n  top                : 20%;\n  left               : 45%;\n  width              : 200px;\n  height             : 200px;\n}\n.centered svg path {\n  fill: var(--secondary);\n}\n.centered svg polygon {\n  fill              : var(--secondary);\n}\n.onboarding {\n  color             : var(--text-info);\n  background-color  : var(--info);\n}\n.matomoBtn {\n  width              : 100px;\n}\n.splash {\n  text-align: center;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlbWl4LWFwcC5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxzQkFBc0IsRUFBRTtBQUMvQix1QkFBdUIsbUJBQW1CLEVBQUU7QUFDNUM7RUFDRSx5RUFBeUU7RUFDekUsMEJBQTBCO0FBQzVCO0FBQ0E7RUFDRSxnQkFBZ0I7QUFDbEI7QUFDQTtFQUNFLDBCQUEwQjtFQUMxQiwwQkFBMEI7RUFDMUIsMkJBQTJCO0VBQzNCLHdCQUF3QjtFQUN4Qix5QkFBeUI7QUFDM0I7QUFDQTtFQUNFLHlCQUF5QjtFQUN6QiwyQkFBMkI7RUFDM0IsMkJBQTJCO0VBQzNCLHNCQUFzQjtFQUN0QiwwQkFBMEI7QUFDNUI7QUFDQTtFQUNFLHlCQUF5QjtFQUN6QiwyQkFBMkI7RUFDM0IsMkJBQTJCO0VBQzNCLHlCQUF5QjtFQUN6QixpQ0FBeUI7S0FBekIsOEJBQXlCO01BQXpCLDZCQUF5QjtVQUF6Qix5QkFBeUI7QUFDM0I7QUFDQTtFQUNFLHlCQUF5QjtFQUN6QixnQ0FBZ0M7RUFDaEMsMEJBQTBCO0VBQzFCLGdDQUFnQztBQUNsQztBQUVBO0VBQ0UsNkJBQTZCO0VBQzdCLHVCQUF1QjtFQUN2QixnQ0FBZ0M7QUFDbEM7QUFDQTtFQUNFLDZCQUE2QjtFQUM3Qix1QkFBdUI7RUFDdkIsZ0NBQWdDO0VBQ2hDLHdCQUF3QjtBQUMxQjtBQUNBO0VBQ0UsMEJBQTBCO0VBQzFCLHdCQUF3QjtFQUN4Qix3QkFBd0I7RUFDeEIsMEJBQTBCO0VBQzFCLDBCQUEwQjtBQUM1QjtBQUNBO0VBQ0Usc0JBQXNCO0FBQ3hCO0FBQ0E7RUFDRSxvQ0FBb0M7QUFDdEM7QUFDQTtFQUNFLG9DQUFvQztFQUNwQywrQkFBK0I7QUFDakM7QUFDQTtFQUNFLDBCQUEwQjtBQUM1QjtBQUVBO0VBQ0Usa0JBQWtCO0FBQ3BCIiwiZmlsZSI6InJlbWl4LWFwcC5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyJodG1sIHsgYm94LXNpemluZzogYm9yZGVyLWJveDsgfVxuKiwgKjpiZWZvcmUsICo6YWZ0ZXIgeyBib3gtc2l6aW5nOiBpbmhlcml0OyB9XG5ib2R5ICAgICAgICAgICAgICAgICB7XG4gIC8qIGZvbnQ6IDE0cHgvMS41IExhdG8sIFwiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgc2Fucy1zZXJpZjsgKi9cbiAgZm9udC1zaXplICAgICAgICAgIDogLjhyZW07XG59XG5wcmUge1xuICBvdmVyZmxvdy14OiBhdXRvO1xufVxuLnJlbWl4SURFICAgICAgICAgICAge1xuICB3aWR0aCAgICAgICAgICAgICAgOiAxMDB2dztcbiAgaGVpZ2h0ICAgICAgICAgICAgIDogMTAwdmg7XG4gIG92ZXJmbG93ICAgICAgICAgICA6IGhpZGRlbjtcbiAgZmxleC1kaXJlY3Rpb24gICAgIDogcm93O1xuICBkaXNwbGF5ICAgICAgICAgICAgOiBmbGV4O1xufVxuLm1haW5wYW5lbCAgICAgICAgICAge1xuICBkaXNwbGF5ICAgICAgICAgICAgOiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbiAgICAgOiBjb2x1bW47XG4gIG92ZXJmbG93ICAgICAgICAgICA6IGhpZGRlbjtcbiAgZmxleCAgICAgICAgICAgICAgIDogMTtcbiAgbWluLXdpZHRoICAgICAgICAgIDogMzIwcHg7XG59XG4uaWNvbnBhbmVsICAgICAgICAgICB7XG4gIGRpc3BsYXkgICAgICAgICAgICA6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uICAgICA6IGNvbHVtbjtcbiAgb3ZlcmZsb3cgICAgICAgICAgIDogaGlkZGVuO1xuICB3aWR0aCAgICAgICAgICAgICAgOiA1MHB4O1xuICB1c2VyLXNlbGVjdCAgICAgICAgOiBub25lO1xufVxuLnNpZGVwYW5lbCAgICAgICAgICAge1xuICBkaXNwbGF5ICAgICAgICAgICAgOiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbiAgICAgOiByb3ctcmV2ZXJzZTtcbiAgd2lkdGggICAgICAgICAgICAgIDogMzIwcHg7XG4gIHRyYW5zaXRpb24gICAgICAgICA6IHdpZHRoIDAuMjVzO1xufVxuXG4uaGlnaGxpZ2h0Y29kZSAgICAgICB7XG4gIHBvc2l0aW9uICAgICAgICAgICA6IGFic29sdXRlO1xuICB6LWluZGV4ICAgICAgICAgICAgOiAyMDtcbiAgYmFja2dyb3VuZC1jb2xvciAgIDogdmFyKC0taW5mbyk7XG59XG4uaGlnaGxpZ2h0Y29kZV9mdWxsTGluZSB7XG4gIHBvc2l0aW9uICAgICAgICAgICA6IGFic29sdXRlO1xuICB6LWluZGV4ICAgICAgICAgICAgOiAyMDtcbiAgYmFja2dyb3VuZC1jb2xvciAgIDogdmFyKC0taW5mbyk7XG4gIG9wYWNpdHkgICAgICAgICAgICA6IDAuNTtcbn1cbi5jZW50ZXJlZCB7XG4gIHBvc2l0aW9uICAgICAgICAgICA6IGZpeGVkO1xuICB0b3AgICAgICAgICAgICAgICAgOiAyMCU7XG4gIGxlZnQgICAgICAgICAgICAgICA6IDQ1JTtcbiAgd2lkdGggICAgICAgICAgICAgIDogMjAwcHg7XG4gIGhlaWdodCAgICAgICAgICAgICA6IDIwMHB4O1xufVxuLmNlbnRlcmVkIHN2ZyBwYXRoIHtcbiAgZmlsbDogdmFyKC0tc2Vjb25kYXJ5KTtcbn1cbi5jZW50ZXJlZCBzdmcgcG9seWdvbiB7XG4gIGZpbGwgICAgICAgICAgICAgIDogdmFyKC0tc2Vjb25kYXJ5KTtcbn1cbi5vbmJvYXJkaW5nIHtcbiAgY29sb3IgICAgICAgICAgICAgOiB2YXIoLS10ZXh0LWluZm8pO1xuICBiYWNrZ3JvdW5kLWNvbG9yICA6IHZhcigtLWluZm8pO1xufVxuLm1hdG9tb0J0biB7XG4gIHdpZHRoICAgICAgICAgICAgICA6IDEwMHB4O1xufVxuXG4uc3BsYXNoIHtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xufSJdfQ== */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJtb2RhbC1kaWFsb2ctY3VzdG9tLmNzcyJ9 */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".remixModalContent {\n  box-shadow: 0 0 8px 10000px rgba(0,0,0,0.6),0 6px 20px 0 rgba(0,0,0,0.19);\n  -webkit-animation-name: animatetop;\n  -webkit-animation-duration: 0.4s;\n  animation-name: animatetop;\n  animation-duration: 0.4s\n}\n.remixModalBody {\n  overflow-y: auto;\n  max-height: 600px;\n  white-space: pre-line;\n}\n@-webkit-keyframes animatetop {\n  from {top: -300px; opacity: 0}\n  to {top: 0; opacity: 1}\n}\n@keyframes animatetop {\n  from {top: -300px; opacity: 0}\n  to {top: 0; opacity: 1}\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlbWl4LXVpLW1vZGFsLWRpYWxvZy5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFDRSx5RUFBeUU7RUFDekUsa0NBQWtDO0VBQ2xDLGdDQUFnQztFQUNoQywwQkFBMEI7RUFDMUI7QUFDRjtBQUNBO0VBQ0UsZ0JBQWdCO0VBQ2hCLGlCQUFpQjtFQUNqQixxQkFBcUI7QUFDdkI7QUFDQTtFQUNFLE1BQU0sV0FBVyxFQUFFLFVBQVU7RUFDN0IsSUFBSSxNQUFNLEVBQUUsVUFBVTtBQUN4QjtBQUNBO0VBQ0UsTUFBTSxXQUFXLEVBQUUsVUFBVTtFQUM3QixJQUFJLE1BQU0sRUFBRSxVQUFVO0FBQ3hCIiwiZmlsZSI6InJlbWl4LXVpLW1vZGFsLWRpYWxvZy5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyIucmVtaXhNb2RhbENvbnRlbnQge1xuICBib3gtc2hhZG93OiAwIDAgOHB4IDEwMDAwcHggcmdiYSgwLDAsMCwwLjYpLDAgNnB4IDIwcHggMCByZ2JhKDAsMCwwLDAuMTkpO1xuICAtd2Via2l0LWFuaW1hdGlvbi1uYW1lOiBhbmltYXRldG9wO1xuICAtd2Via2l0LWFuaW1hdGlvbi1kdXJhdGlvbjogMC40cztcbiAgYW5pbWF0aW9uLW5hbWU6IGFuaW1hdGV0b3A7XG4gIGFuaW1hdGlvbi1kdXJhdGlvbjogMC40c1xufVxuLnJlbWl4TW9kYWxCb2R5IHtcbiAgb3ZlcmZsb3cteTogYXV0bztcbiAgbWF4LWhlaWdodDogNjAwcHg7XG4gIHdoaXRlLXNwYWNlOiBwcmUtbGluZTtcbn1cbkAtd2Via2l0LWtleWZyYW1lcyBhbmltYXRldG9wIHtcbiAgZnJvbSB7dG9wOiAtMzAwcHg7IG9wYWNpdHk6IDB9XG4gIHRvIHt0b3A6IDA7IG9wYWNpdHk6IDF9XG59XG5Aa2V5ZnJhbWVzIGFuaW1hdGV0b3Age1xuICBmcm9tIHt0b3A6IC0zMDBweDsgb3BhY2l0eTogMH1cbiAgdG8ge3RvcDogMDsgb3BhY2l0eTogMX1cbn0iXX0= */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/panel/src/lib/dragbar/dragbar.css":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/dragbar/dragbar.css ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, "/* dragbar UI */\n\n.dragbar_terminal {\n  display: block;\n  width: 100%;\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  height: 0.3em;\n  z-index: 1000;\n}\n\n.overlay {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100vw;\n  height: 100vh;\n  display: block;\n  z-index: 900;\n}\n\n.dragbar_terminal:hover,\n.dragbar_terminal.ondrag {\n  background-color: var(--secondary);\n  cursor: row-resize;\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRyYWdiYXIuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGVBQWU7O0FBRWY7RUFDRSxjQUFjO0VBQ2QsV0FBVztFQUNYLGtCQUFrQjtFQUNsQixTQUFTO0VBQ1QsUUFBUTtFQUNSLGFBQWE7RUFDYixhQUFhO0FBQ2Y7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsT0FBTztFQUNQLE1BQU07RUFDTixZQUFZO0VBQ1osYUFBYTtFQUNiLGNBQWM7RUFDZCxZQUFZO0FBQ2Q7O0FBRUE7O0VBRUUsa0NBQWtDO0VBQ2xDLGtCQUFrQjtBQUNwQiIsImZpbGUiOiJkcmFnYmFyLmNzcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGRyYWdiYXIgVUkgKi9cblxuLmRyYWdiYXJfdGVybWluYWwge1xuICBkaXNwbGF5OiBibG9jaztcbiAgd2lkdGg6IDEwMCU7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgbGVmdDogMHB4O1xuICB0b3A6IDBweDtcbiAgaGVpZ2h0OiAwLjNlbTtcbiAgei1pbmRleDogMTAwMDtcbn1cblxuLm92ZXJsYXkge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGxlZnQ6IDA7XG4gIHRvcDogMDtcbiAgd2lkdGg6IDEwMHZ3O1xuICBoZWlnaHQ6IDEwMHZoO1xuICBkaXNwbGF5OiBibG9jaztcbiAgei1pbmRleDogOTAwO1xufVxuXG4uZHJhZ2Jhcl90ZXJtaW5hbDpob3Zlcixcbi5kcmFnYmFyX3Rlcm1pbmFsLm9uZHJhZyB7XG4gIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXNlY29uZGFyeSk7XG4gIGN1cnNvcjogcm93LXJlc2l6ZTtcbn1cbiJdfQ== */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/panel/src/lib/main/main-panel.css":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/main/main-panel.css ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".mainview            {\n    display           : flex;\n    flex-direction    : column;\n    height            : 100%;\n    width             : 100%;\n    position: relative;\n  }  \n\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4tcGFuZWwuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBQ0ksd0JBQXdCO0lBQ3hCLDBCQUEwQjtJQUMxQix3QkFBd0I7SUFDeEIsd0JBQXdCO0lBQ3hCLGtCQUFrQjtFQUNwQiIsImZpbGUiOiJtYWluLXBhbmVsLmNzcyIsInNvdXJjZXNDb250ZW50IjpbIi5tYWludmlldyAgICAgICAgICAgIHtcbiAgICBkaXNwbGF5ICAgICAgICAgICA6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb24gICAgOiBjb2x1bW47XG4gICAgaGVpZ2h0ICAgICAgICAgICAgOiAxMDAlO1xuICAgIHdpZHRoICAgICAgICAgICAgIDogMTAwJTtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIH0gIFxuXG4iXX0= */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/panel/src/lib/plugins/panel.css":
/*!************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/panel/src/lib/plugins/panel.css ***!
  \************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".panel {\n    width: 100%;\n    height: 100%;\n    display: flex;\n    flex-direction: column;\n    flex: auto;\n}\n\n.swapitTitle {\n    margin: 0;\n    text-transform: uppercase;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.swapitTitle i {\n    padding-left: 6px;\n    font-size: 14px;\n}\n\n.swapitHeader {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    text-transform: uppercase;\n}\n\n.icons i {\n    height: 80%;\n    cursor: pointer;\n}\n\n.pluginsContainer {\n    height: 100%;\n    overflow-y: auto;\n}\n\n.titleInfo {\n    padding-left: 10px;\n}\n\n.versionBadge {\n    background-color: var(--light);\n    padding: 0 7px;\n    font-weight: bolder;\n    margin-left: 5px;\n    text-transform: lowercase;\n    cursor: default;\n}\n\niframe {\n    height: 100%;\n    width: 100%;\n    border: 0;\n}\n\n.plugins {\n    height: 100%;\n}\n\n.plugItIn {\n    display: none;\n    height: 100%;\n}\n\n.plugItIn>div {\n    overflow-y: auto;\n    overflow-x: hidden;\n    height: 100%;\n    width: 100%;\n}\n\n.plugItIn.active {\n    display: block;\n}\n\n#editorView {\n    height: 100%;\n    width: 100%;\n    border: 0;\n    display: block;\n}\n\n#mainPanel {\n    height: 100%;\n    width: 100%;\n    border: 0;\n    display: block;\n}\n\n.mainPanel-wrap, .editor-wrap {\n    flex: 1;\n    min-height: 100px;\n}\n\n.terminal-wrap {\n    min-height: 35px;\n    height: 20%;\n}\n\n.terminal-wrap.minimized {\n    height: 2rem !important;\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhbmVsLmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtJQUNJLFdBQVc7SUFDWCxZQUFZO0lBQ1osYUFBYTtJQUNiLHNCQUFzQjtJQUN0QixVQUFVO0FBQ2Q7O0FBRUE7SUFDSSxTQUFTO0lBQ1QseUJBQXlCO0lBQ3pCLG1CQUFtQjtJQUNuQixnQkFBZ0I7SUFDaEIsdUJBQXVCO0FBQzNCOztBQUVBO0lBQ0ksaUJBQWlCO0lBQ2pCLGVBQWU7QUFDbkI7O0FBRUE7SUFDSSxhQUFhO0lBQ2IsbUJBQW1CO0lBQ25CLDhCQUE4QjtJQUM5Qix5QkFBeUI7QUFDN0I7O0FBRUE7SUFDSSxXQUFXO0lBQ1gsZUFBZTtBQUNuQjs7QUFFQTtJQUNJLFlBQVk7SUFDWixnQkFBZ0I7QUFDcEI7O0FBRUE7SUFDSSxrQkFBa0I7QUFDdEI7O0FBRUE7SUFDSSw4QkFBOEI7SUFDOUIsY0FBYztJQUNkLG1CQUFtQjtJQUNuQixnQkFBZ0I7SUFDaEIseUJBQXlCO0lBQ3pCLGVBQWU7QUFDbkI7O0FBRUE7SUFDSSxZQUFZO0lBQ1osV0FBVztJQUNYLFNBQVM7QUFDYjs7QUFFQTtJQUNJLFlBQVk7QUFDaEI7O0FBRUE7SUFDSSxhQUFhO0lBQ2IsWUFBWTtBQUNoQjs7QUFFQTtJQUNJLGdCQUFnQjtJQUNoQixrQkFBa0I7SUFDbEIsWUFBWTtJQUNaLFdBQVc7QUFDZjs7QUFFQTtJQUNJLGNBQWM7QUFDbEI7O0FBRUE7SUFDSSxZQUFZO0lBQ1osV0FBVztJQUNYLFNBQVM7SUFDVCxjQUFjO0FBQ2xCOztBQUVBO0lBQ0ksWUFBWTtJQUNaLFdBQVc7SUFDWCxTQUFTO0lBQ1QsY0FBYztBQUNsQjs7QUFFQTtJQUNJLE9BQU87SUFDUCxpQkFBaUI7QUFDckI7O0FBRUE7SUFDSSxnQkFBZ0I7SUFDaEIsV0FBVztBQUNmOztBQUVBO0lBQ0ksdUJBQXVCO0FBQzNCIiwiZmlsZSI6InBhbmVsLmNzcyIsInNvdXJjZXNDb250ZW50IjpbIi5wYW5lbCB7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgaGVpZ2h0OiAxMDAlO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICBmbGV4OiBhdXRvO1xufVxuXG4uc3dhcGl0VGl0bGUge1xuICAgIG1hcmdpbjogMDtcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XG4gICAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpcztcbn1cblxuLnN3YXBpdFRpdGxlIGkge1xuICAgIHBhZGRpbmctbGVmdDogNnB4O1xuICAgIGZvbnQtc2l6ZTogMTRweDtcbn1cblxuLnN3YXBpdEhlYWRlciB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xufVxuXG4uaWNvbnMgaSB7XG4gICAgaGVpZ2h0OiA4MCU7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xufVxuXG4ucGx1Z2luc0NvbnRhaW5lciB7XG4gICAgaGVpZ2h0OiAxMDAlO1xuICAgIG92ZXJmbG93LXk6IGF1dG87XG59XG5cbi50aXRsZUluZm8ge1xuICAgIHBhZGRpbmctbGVmdDogMTBweDtcbn1cblxuLnZlcnNpb25CYWRnZSB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tbGlnaHQpO1xuICAgIHBhZGRpbmc6IDAgN3B4O1xuICAgIGZvbnQtd2VpZ2h0OiBib2xkZXI7XG4gICAgbWFyZ2luLWxlZnQ6IDVweDtcbiAgICB0ZXh0LXRyYW5zZm9ybTogbG93ZXJjYXNlO1xuICAgIGN1cnNvcjogZGVmYXVsdDtcbn1cblxuaWZyYW1lIHtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgYm9yZGVyOiAwO1xufVxuXG4ucGx1Z2lucyB7XG4gICAgaGVpZ2h0OiAxMDAlO1xufVxuXG4ucGx1Z0l0SW4ge1xuICAgIGRpc3BsYXk6IG5vbmU7XG4gICAgaGVpZ2h0OiAxMDAlO1xufVxuXG4ucGx1Z0l0SW4+ZGl2IHtcbiAgICBvdmVyZmxvdy15OiBhdXRvO1xuICAgIG92ZXJmbG93LXg6IGhpZGRlbjtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgd2lkdGg6IDEwMCU7XG59XG5cbi5wbHVnSXRJbi5hY3RpdmUge1xuICAgIGRpc3BsYXk6IGJsb2NrO1xufVxuXG4jZWRpdG9yVmlldyB7XG4gICAgaGVpZ2h0OiAxMDAlO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGJvcmRlcjogMDtcbiAgICBkaXNwbGF5OiBibG9jaztcbn1cblxuI21haW5QYW5lbCB7XG4gICAgaGVpZ2h0OiAxMDAlO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGJvcmRlcjogMDtcbiAgICBkaXNwbGF5OiBibG9jaztcbn1cblxuLm1haW5QYW5lbC13cmFwLCAuZWRpdG9yLXdyYXAge1xuICAgIGZsZXg6IDE7XG4gICAgbWluLWhlaWdodDogMTAwcHg7XG59XG5cbi50ZXJtaW5hbC13cmFwIHtcbiAgICBtaW4taGVpZ2h0OiAzNXB4O1xuICAgIGhlaWdodDogMjAlO1xufVxuXG4udGVybWluYWwtd3JhcC5taW5pbWl6ZWQge1xuICAgIGhlaWdodDogMnJlbSAhaW1wb3J0YW50O1xufVxuIl19 */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/toaster/src/lib/toaster.css":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!C:/Users/guwno/Desktop/remix-project-master/libs/remix-ui/toaster/src/lib/toaster.css ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".remixui_tooltip {\n    z-index: 1001;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    position: fixed;\n    min-height: 50px;\n    padding: 16px 24px 12px;\n    border-radius: 3px;\n    left: 40%;\n    font-size: 14px;\n    text-align: center;\n    bottom: -0px;\n    flex-direction: row;\n}\n@-webkit-keyframes remixui_animatebottom  {\n  0% {bottom: -300px}\n  100% {bottom: 0px}\n}\n@keyframes remixui_animatebottom  {\n  0% {bottom: -300px}\n  100% {bottom: 0px}\n}\n@-webkit-keyframes remixui_animatetop  {\n  0% {bottom: 0px}\n  100% {bottom: -300px}\n}\n@keyframes remixui_animatetop  {\n  0% {bottom: 0px}\n  100% {bottom: -300px}\n}\n.remixui_animateTop {\n  -webkit-animation-name: remixui_animatetop;\n  -webkit-animation-duration: 2s;\n  animation-name: remixui_animatetop;\n  animation-duration: 2s;\n}\n.remixui_animateBottom {\n  -webkit-animation-name: remixui_animatebottom;\n  -webkit-animation-duration: 2s;\n  animation-name: remixui_animatebottom;\n  animation-duration: 2s;    \n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRvYXN0ZXIuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBQ0ksYUFBYTtJQUNiLGFBQWE7SUFDYiw4QkFBOEI7SUFDOUIsbUJBQW1CO0lBQ25CLGVBQWU7SUFDZixnQkFBZ0I7SUFDaEIsdUJBQXVCO0lBQ3ZCLGtCQUFrQjtJQUNsQixTQUFTO0lBQ1QsZUFBZTtJQUNmLGtCQUFrQjtJQUNsQixZQUFZO0lBQ1osbUJBQW1CO0FBQ3ZCO0FBQ0E7RUFDRSxJQUFJLGNBQWM7RUFDbEIsTUFBTSxXQUFXO0FBQ25CO0FBQ0E7RUFDRSxJQUFJLGNBQWM7RUFDbEIsTUFBTSxXQUFXO0FBQ25CO0FBQ0E7RUFDRSxJQUFJLFdBQVc7RUFDZixNQUFNLGNBQWM7QUFDdEI7QUFDQTtFQUNFLElBQUksV0FBVztFQUNmLE1BQU0sY0FBYztBQUN0QjtBQUNBO0VBQ0UsMENBQTBDO0VBQzFDLDhCQUE4QjtFQUM5QixrQ0FBa0M7RUFDbEMsc0JBQXNCO0FBQ3hCO0FBQ0E7RUFDRSw2Q0FBNkM7RUFDN0MsOEJBQThCO0VBQzlCLHFDQUFxQztFQUNyQyxzQkFBc0I7QUFDeEIiLCJmaWxlIjoidG9hc3Rlci5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyIucmVtaXh1aV90b29sdGlwIHtcbiAgICB6LWluZGV4OiAxMDAxO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgcG9zaXRpb246IGZpeGVkO1xuICAgIG1pbi1oZWlnaHQ6IDUwcHg7XG4gICAgcGFkZGluZzogMTZweCAyNHB4IDEycHg7XG4gICAgYm9yZGVyLXJhZGl1czogM3B4O1xuICAgIGxlZnQ6IDQwJTtcbiAgICBmb250LXNpemU6IDE0cHg7XG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgIGJvdHRvbTogLTBweDtcbiAgICBmbGV4LWRpcmVjdGlvbjogcm93O1xufVxuQC13ZWJraXQta2V5ZnJhbWVzIHJlbWl4dWlfYW5pbWF0ZWJvdHRvbSAge1xuICAwJSB7Ym90dG9tOiAtMzAwcHh9XG4gIDEwMCUge2JvdHRvbTogMHB4fVxufVxuQGtleWZyYW1lcyByZW1peHVpX2FuaW1hdGVib3R0b20gIHtcbiAgMCUge2JvdHRvbTogLTMwMHB4fVxuICAxMDAlIHtib3R0b206IDBweH1cbn1cbkAtd2Via2l0LWtleWZyYW1lcyByZW1peHVpX2FuaW1hdGV0b3AgIHtcbiAgMCUge2JvdHRvbTogMHB4fVxuICAxMDAlIHtib3R0b206IC0zMDBweH1cbn1cbkBrZXlmcmFtZXMgcmVtaXh1aV9hbmltYXRldG9wICB7XG4gIDAlIHtib3R0b206IDBweH1cbiAgMTAwJSB7Ym90dG9tOiAtMzAwcHh9XG59XG4ucmVtaXh1aV9hbmltYXRlVG9wIHtcbiAgLXdlYmtpdC1hbmltYXRpb24tbmFtZTogcmVtaXh1aV9hbmltYXRldG9wO1xuICAtd2Via2l0LWFuaW1hdGlvbi1kdXJhdGlvbjogMnM7XG4gIGFuaW1hdGlvbi1uYW1lOiByZW1peHVpX2FuaW1hdGV0b3A7XG4gIGFuaW1hdGlvbi1kdXJhdGlvbjogMnM7XG59XG4ucmVtaXh1aV9hbmltYXRlQm90dG9tIHtcbiAgLXdlYmtpdC1hbmltYXRpb24tbmFtZTogcmVtaXh1aV9hbmltYXRlYm90dG9tO1xuICAtd2Via2l0LWFuaW1hdGlvbi1kdXJhdGlvbjogMnM7XG4gIGFuaW1hdGlvbi1uYW1lOiByZW1peHVpX2FuaW1hdGVib3R0b207XG4gIGFuaW1hdGlvbi1kdXJhdGlvbjogMnM7ICAgIFxufVxuIl19 */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!./app/components/styles/preload.css":
/*!******************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./app/components/styles/preload.css ***!
  \******************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".preload-container {\n    display: flex;\n    flex-direction: column;\n    justify-content: center;\n    align-items: center;\n    height: 100vh;\n}\n\n.preload-info-container {\n    display: flex;\n    flex-direction: column;\n    text-align: center;\n    max-width: 400px;\n}\n\n.preload-info-container .btn {\n    cursor: pointer;\n}\n\n.preload-logo {\n    min-width: 200px;\n    max-width: 240px;\n    padding-bottom: 1.5rem !important;\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByZWxvYWQuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBQ0ksYUFBYTtJQUNiLHNCQUFzQjtJQUN0Qix1QkFBdUI7SUFDdkIsbUJBQW1CO0lBQ25CLGFBQWE7QUFDakI7O0FBRUE7SUFDSSxhQUFhO0lBQ2Isc0JBQXNCO0lBQ3RCLGtCQUFrQjtJQUNsQixnQkFBZ0I7QUFDcEI7O0FBRUE7SUFDSSxlQUFlO0FBQ25COztBQUVBO0lBQ0ksZ0JBQWdCO0lBQ2hCLGdCQUFnQjtJQUNoQixpQ0FBaUM7QUFDckMiLCJmaWxlIjoicHJlbG9hZC5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyIucHJlbG9hZC1jb250YWluZXIge1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGhlaWdodDogMTAwdmg7XG59XG5cbi5wcmVsb2FkLWluZm8tY29udGFpbmVyIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgIG1heC13aWR0aDogNDAwcHg7XG59XG5cbi5wcmVsb2FkLWluZm8tY29udGFpbmVyIC5idG4ge1xuICAgIGN1cnNvcjogcG9pbnRlcjtcbn1cblxuLnByZWxvYWQtbG9nbyB7XG4gICAgbWluLXdpZHRoOiAyMDBweDtcbiAgICBtYXgtd2lkdGg6IDI0MHB4O1xuICAgIHBhZGRpbmctYm90dG9tOiAxLjVyZW0gIWltcG9ydGFudDtcbn1cbiJdfQ== */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!./index.css":
/*!******************************************************************************************************************************************************************************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!C:/Users/guwno/Desktop/remix-project-master/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./index.css ***!
  \******************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".centered {\n  position           : fixed;\n  top                : 20%;\n  left               : 45%;\n  width              : 200px;\n  height             : 200px;\n}\n.centered svg path {\n  fill: var(--secondary);\n}\n.centered svg polygon {\n  fill              : var(--secondary);\n}\n.splash {\n  text-align: center;\n}\n.version {\n  cursor: pointer;\n  font-size: 0.8rem;\n  font-weight: normal;\n  max-width: 300px;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUNFLDBCQUEwQjtFQUMxQix3QkFBd0I7RUFDeEIsd0JBQXdCO0VBQ3hCLDBCQUEwQjtFQUMxQiwwQkFBMEI7QUFDNUI7QUFDQTtFQUNFLHNCQUFzQjtBQUN4QjtBQUNBO0VBQ0Usb0NBQW9DO0FBQ3RDO0FBQ0E7RUFDRSxrQkFBa0I7QUFDcEI7QUFDQTtFQUNFLGVBQWU7RUFDZixpQkFBaUI7RUFDakIsbUJBQW1CO0VBQ25CLGdCQUFnQjtBQUNsQiIsImZpbGUiOiJpbmRleC5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyIuY2VudGVyZWQge1xuICBwb3NpdGlvbiAgICAgICAgICAgOiBmaXhlZDtcbiAgdG9wICAgICAgICAgICAgICAgIDogMjAlO1xuICBsZWZ0ICAgICAgICAgICAgICAgOiA0NSU7XG4gIHdpZHRoICAgICAgICAgICAgICA6IDIwMHB4O1xuICBoZWlnaHQgICAgICAgICAgICAgOiAyMDBweDtcbn1cbi5jZW50ZXJlZCBzdmcgcGF0aCB7XG4gIGZpbGw6IHZhcigtLXNlY29uZGFyeSk7XG59XG4uY2VudGVyZWQgc3ZnIHBvbHlnb24ge1xuICBmaWxsICAgICAgICAgICAgICA6IHZhcigtLXNlY29uZGFyeSk7XG59XG4uc3BsYXNoIHtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xufVxuLnZlcnNpb24ge1xuICBjdXJzb3I6IHBvaW50ZXI7XG4gIGZvbnQtc2l6ZTogMC44cmVtO1xuICBmb250LXdlaWdodDogbm9ybWFsO1xuICBtYXgtd2lkdGg6IDMwMHB4O1xufSJdfQ== */", '', '']]

/***/ }),

/***/ "../../../node_modules/regenerator-runtime/runtime.js":
/*!***********************************************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/node_modules/regenerator-runtime/runtime.js ***!
  \***********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return obj[key];
  }
  try {
    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
    define({}, "");
  } catch (err) {
    define = function(obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunction.displayName = define(
    GeneratorFunctionPrototype,
    toStringTagSymbol,
    "GeneratorFunction"
  );

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      define(prototype, method, function(arg) {
        return this._invoke(method, arg);
      });
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      define(genFun, toStringTagSymbol, "GeneratorFunction");
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  define(Gp, toStringTagSymbol, "Generator");

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   true ? module.exports : undefined
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}


/***/ }),

/***/ "../../../node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "../../../package.json":
/*!****************************************************************!*\
  !*** C:/Users/guwno/Desktop/remix-project-master/package.json ***!
  \****************************************************************/
/*! exports provided: name, version, license, description, keywords, repository, author, bugs, homepage, bin, engines, scripts, browserify, dependencies, devDependencies, default */
/***/ (function(module) {

module.exports = JSON.parse("{\"name\":\"remix-project\",\"version\":\"0.26.0-dev\",\"license\":\"MIT\",\"description\":\"Ethereum Remix Monorepo\",\"keywords\":[\"ethereum\",\"solidity\",\"compiler\"],\"repository\":{\"type\":\"git\",\"url\":\"git+https://github.com/ethereum/remix-project.git\"},\"author\":\"@yann300\",\"bugs\":{\"url\":\"https://github.com/ethereum/remix-project/issues\"},\"homepage\":\"https://github.com/ethereum/remix-project#readme\",\"bin\":{\"remix-ide\":\"./apps/remix-ide/bin/remix-ide\"},\"engines\":{\"node\":\"^14.17.6\",\"npm\":\"^6.14.15\"},\"scripts\":{\"nx\":\"nx\",\"start\":\"nx start\",\"serve\":\"nx serve\",\"build\":\"nx build\",\"test\":\"nx test\",\"lint\":\"nx lint\",\"affected:apps\":\"nx affected:apps\",\"affected:libs\":\"nx affected:libs\",\"affected:build\":\"nx affected:build\",\"affected:test\":\"nx affected:test\",\"affected:lint\":\"nx affected:lint\",\"affected:dep-graph\":\"nx affected:dep-graph\",\"affected\":\"nx affected\",\"format\":\"nx format:write\",\"format:write\":\"nx format:write\",\"format:check\":\"nx format:check\",\"update\":\"nx migrate latest\",\"workspace-schematic\":\"nx workspace-schematic\",\"dep-graph\":\"nx dep-graph\",\"help\":\"nx help\",\"lint:libs\":\"nx run-many --target=lint --projects=remix-analyzer,remix-astwalker,remix-debug,remix-lib,remix-simulator,remix-solidity,remix-tests,remix-url-resolver,remix-ws-templates,remixd,remix-ui-tree-view,remix-ui-modal-dialog,remix-ui-toaster,remix-ui-helper,remix-ui-debugger-ui,remix-ui-workspace,remix-ui-static-analyser,remix-ui-checkbox,remix-ui-settings,remix-core-plugin,remix-ui-renderer,remix-ui-publish-to-storage,remix-ui-solidity-compiler,solidity-unit-testing,remix-ui-plugin-manager,remix-ui-terminal,remix-ui-editor,remix-ui-app,remix-ui-tabs,remix-ui-panel,remix-ui-run-tab,remix-ui-permission-handler,remix-ui-search,remix-ui-file-decorators,remix-ui-tooltip-popup\",\"build:libs\":\"nx run-many --target=build --parallel=false --with-deps=true --projects=remix-analyzer,remix-astwalker,remix-debug,remix-lib,remix-simulator,remix-solidity,remix-tests,remix-url-resolver,remix-ws-templates,remixd\",\"test:libs\":\"nx run-many --target=test --projects=remix-analyzer,remix-astwalker,remix-debug,remix-lib,remix-simulator,remix-solidity,remix-tests,remix-url-resolver,remixd\",\"publish:libs\":\"yarn run build:libs && lerna publish --skip-git && yarn run bumpVersion:libs\",\"build:e2e\":\"node apps/remix-ide-e2e/src/buildGroupTests.js && tsc -p apps/remix-ide-e2e/tsconfig.e2e.json\",\"watch:e2e\":\"nodemon\",\"bumpVersion:libs\":\"gulp & gulp syncLibVersions;\",\"browsertest\":\"sleep 5 && yarn run nightwatch_local\",\"csslint\":\"csslint --ignore=order-alphabetical --errors='errors,duplicate-properties,empty-rules' --exclude-list='apps/remix-ide/src/assets/css/font-awesome.min.css' apps/remix-ide/src/assets/css/\",\"downloadsolc_assets\":\"wget --no-check-certificate https://binaries.soliditylang.org/wasm/soljson-v0.8.7+commit.e28d00a7.js -O ./apps/remix-ide/src/assets/js/soljson.js && wget --no-check-certificate https://binaries.soliditylang.org/wasm/soljson-v0.8.7+commit.e28d00a7.js -O ./apps/solidity-compiler/src/assets/js/soljson.js\",\"downloadsolc_assets_dist\":\"wget --no-check-certificate https://binaries.soliditylang.org/wasm/soljson-v0.8.7+commit.e28d00a7.js -O ./dist/apps/remix-ide/assets/js/soljson.js && wget --no-check-certificate https://binaries.soliditylang.org/wasm/soljson-v0.8.7+commit.e28d00a7.js -O ./dist/apps/solidity-compiler/assets/js/soljson.js\",\"make-mock-compiler\":\"node apps/remix-ide/ci/makeMockCompiler.js\",\"minify\":\"uglifyjs --in-source-map inline --source-map-inline -c warnings=false\",\"build:production\":\"NODE_ENV=production nx build remix-ide --skip-nx-cache\",\"serve:production\":\"npx http-server ./dist/apps/remix-ide\",\"select_test\":\"bash apps/remix-ide-e2e/src/select_tests.sh\",\"group_test\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/${npm_config_test}_group${npm_config_group}.test.js --env=${npm_config_env}\",\"nightwatch_parallel\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js --env=chrome,firefox\",\"nightwatch_local_firefox\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js --env=firefox\",\"nightwatch_local_chrome\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js --env=chrome\",\"nightwatch_local_ballot\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/ballot.test.js --env=chrome\",\"nightwatch_local_ballot_0_4_11\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/ballot_0_4_11.test.js --env=chrome\",\"nightwatch_local_usingWorker\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/usingWebWorker.test.js --env=chrome\",\"nightwatch_local_libraryDeployment\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/libraryDeployment.test.js --env=chrome\",\"nightwatch_local_solidityImport\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/solidityImport_*.test.js --env=chrome\",\"nightwatch_local_recorder\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/recorder.test.js --env=chrome\",\"nightwatch_local_transactionExecution\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/transactionExecution_*.test.js --env=chrome\",\"nightwatch_local_staticAnalysis\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/staticAnalysis.test.js --env=chrome\",\"nightwatch_local_signingMessage\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/signingMessage.test.js --env=chrome\",\"nightwatch_local_specialFunctions\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/specialFunctions_*.test.js --env=chrome\",\"nightwatch_local_solidityUnitTests\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/solidityUnittests_*.test.js --env=chrome\",\"nightwatch_local_remixd\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/remixd.test.js --env=chrome\",\"nightwatch_local_terminal\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/terminal_*.test.js --env=chrome\",\"nightwatch_local_gist\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/gist.test.js --env=chrome\",\"nightwatch_local_workspace\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/workspace.test.js --env=chrome\",\"nightwatch_local_defaultLayout\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/defaultLayout.test.js --env=chrome\",\"nightwatch_local_pluginManager\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/pluginManager.test.js --env=chrome\",\"nightwatch_local_publishContract\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/publishContract.test.js --env=chrome\",\"nightwatch_local_generalSettings\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/generalSettings.test.js --env=chrome\",\"nightwatch_local_fileExplorer\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/fileExplorer.test.js --env=chrome\",\"nightwatch_local_debugger\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/debugger_*.test.js --env=chrome\",\"nightwatch_local_editor\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/editor.test.js --env=chrome\",\"nightwatch_local_importFromGithub\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/importFromGithub.test.js --env=chrome\",\"nightwatch_local_compiler\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/compiler_api.test.js --env=chrome\",\"nightwatch_local_txListener\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/txListener.test.js --env=chrome\",\"nightwatch_local_fileManager\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/fileManager_api.test.js --env=chrome\",\"nightwatch_local_runAndDeploy\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/runAndDeploy.js --env=chrome-runAndDeploy\",\"nightwatch_local_url\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/url.test.js --env=chrome\",\"nightwatch_local_verticalIconscontextmenu\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/verticalIconsPanel.test.js --env=chrome\",\"nightwatch_local_pluginApi\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/plugin_api_*.js --env=chrome\",\"nightwatch_local_migrate_filesystem\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/migrateFileSystem.test.js --env=chrome\",\"nightwatch_local_proxy\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/proxy.test.js --env=chrome\",\"nightwatch_local_stress_editor\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/stressEditor.test.js --env=chromeDesktop\",\"nightwatch_local_search\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/search.test.js --env=chromeDesktop\",\"nightwatch_local_providers\":\"yarn run build:e2e && nightwatch --config dist/apps/remix-ide-e2e/nightwatch.js dist/apps/remix-ide-e2e/src/tests/providers.test.js --env=chromeDesktop\",\"onchange\":\"onchange apps/remix-ide/build/app.js -- npm-run-all lint\",\"remixd\":\"nx build remixd && chmod +x dist/libs/remixd/src/bin/remixd.js && dist/libs/remixd/src/bin/remixd.js -s ./apps/remix-ide/contracts --remix-ide http://127.0.0.1:8080\",\"selenium\":\"selenium-standalone start\",\"selenium-install\":\"selenium-standalone install\",\"sourcemap\":\"exorcist --root ../ apps/remix-ide/build/app.js.map > apps/remix-ide/build/app.js\",\"test-browser\":\"npm-run-all -lpr selenium make-mock-compiler serve browsertest\",\"watch\":\"watchify apps/remix-ide/src/index.js -dv -p browserify-reload -o apps/remix-ide/build/app.js --exclude solc\",\"reinstall\":\"rm ./node-modules/ -rf && rm yarn.lock && rm ./build/ -rf && yarn install & yarn run build\",\"ganache-cli\":\"npx ganache-cli\"},\"browserify\":{\"transform\":[[\"babelify\",{\"sourceMapsAbsolute\":false,\"sourceMaps\":true,\"plugins\":[[\"module:fast-async\",{\"runtimePattern\":null,\"compiler\":{\"es7\":true,\"noRuntime\":true,\"promises\":true,\"wrapAwait\":true}}],[\"module:babel-plugin-yo-yoify\"],[\"module:@babel/plugin-transform-object-assign\"]],\"presets\":[\"@babel/preset-env\"]}]]},\"dependencies\":{\"@babel/plugin-proposal-class-properties\":\"^7.16.0\",\"@erebos/bzz-node\":\"^0.13.0\",\"@ethereumjs/block\":\"^3.5.1\",\"@ethereumjs/common\":\"^2.5.0\",\"@ethereumjs/tx\":\"^3.3.2\",\"@ethereumjs/vm\":\"^5.5.3\",\"@ethersphere/bee-js\":\"^3.2.0\",\"@isomorphic-git/lightning-fs\":\"^4.4.1\",\"@monaco-editor/react\":\"4.4.5\",\"@remixproject/engine\":\"^0.3.31\",\"@remixproject/engine-web\":\"^0.3.31\",\"@remixproject/plugin\":\"^0.3.31\",\"@remixproject/plugin-api\":\"^0.3.31\",\"@remixproject/plugin-utils\":\"^0.3.31\",\"@remixproject/plugin-webview\":\"^0.3.31\",\"@remixproject/plugin-ws\":\"^0.3.31\",\"@types/nightwatch\":\"^2.3.1\",\"ansi-gray\":\"^0.1.1\",\"async\":\"^2.6.2\",\"axios\":\">=0.26.0\",\"bootstrap\":\"^5.1.3\",\"brace\":\"^0.8.0\",\"change-case\":\"^4.1.1\",\"chokidar\":\"^2.1.8\",\"color-support\":\"^1.1.3\",\"commander\":\"^2.20.3\",\"core-js\":\"^3.6.5\",\"deep-equal\":\"^1.0.1\",\"document-register-element\":\"1.13.1\",\"eslint-config-prettier\":\"^8.5.0\",\"ethereumjs-util\":\"^7.0.10\",\"ethers\":\"^5.4.2\",\"ethjs-util\":\"^0.1.6\",\"express-ws\":\"^4.0.0\",\"file-path-filter\":\"^3.0.2\",\"file-saver\":\"^2.0.5\",\"form-data\":\"^4.0.0\",\"formik\":\"^2.2.9\",\"fs-extra\":\"^3.0.1\",\"html-react-parser\":\"^1.3.0\",\"http-server\":\"^0.11.1\",\"intro.js\":\"^4.1.0\",\"isbinaryfile\":\"^3.0.2\",\"isomorphic-git\":\"^1.8.2\",\"jquery\":\"^3.3.1\",\"jszip\":\"^3.6.0\",\"latest-version\":\"^5.1.0\",\"merge\":\"^2.1.1\",\"monaco-editor\":\"^0.30.1\",\"npm-install-version\":\"^6.0.2\",\"raw-loader\":\"^4.0.2\",\"react\":\"^17.0.2\",\"react-beautiful-dnd\":\"^13.1.0\",\"react-bootstrap\":\"^1.6.4\",\"react-dom\":\"^17.0.2\",\"react-draggable\":\"^4.4.4\",\"react-json-view\":\"^1.21.3\",\"react-router-dom\":\"^6.3.0\",\"react-tabs\":\"^3.2.2\",\"regenerator-runtime\":\"0.13.7\",\"rss-parser\":\"^3.12.0\",\"selenium\":\"^2.20.0\",\"signale\":\"^1.4.0\",\"string-similarity\":\"^4.0.4\",\"swarmgw\":\"^0.3.1\",\"time-stamp\":\"^2.2.0\",\"ts-loader\":\"^9.2.6\",\"tslib\":\"^2.3.0\",\"web3\":\"^1.7.5\",\"winston\":\"^3.3.3\",\"ws\":\"^7.3.0\"},\"devDependencies\":{\"@babel/core\":\"^7.4.5\",\"@babel/plugin-transform-modules-amd\":\"^7.10.4\",\"@babel/plugin-transform-modules-commonjs\":\"^7.10.4\",\"@babel/plugin-transform-object-assign\":\"^7.2.0\",\"@babel/plugin-transform-runtime\":\"^7.10.4\",\"@babel/polyfill\":\"^7.4.4\",\"@babel/preset-env\":\"^7.10.4\",\"@babel/preset-es2015\":\"^7.0.0-beta.53\",\"@babel/preset-es2017\":\"latest\",\"@babel/preset-react\":\"7.9.4\",\"@babel/preset-stage-0\":\"^7.0.0\",\"@babel/preset-typescript\":\"7.9.0\",\"@babel/register\":\"^7.4.4\",\"@fortawesome/fontawesome-free\":\"^5.8.1\",\"@nrwl/cli\":\"12.3.6\",\"@nrwl/eslint-plugin-nx\":\"12.3.6\",\"@nrwl/jest\":\"12.3.6\",\"@nrwl/linter\":\"12.3.6\",\"@nrwl/node\":\"12.3.6\",\"@nrwl/react\":\"12.3.6\",\"@nrwl/web\":\"12.3.6\",\"@nrwl/workspace\":\"12.3.6\",\"@testing-library/react\":\"10.4.1\",\"@types/axios\":\"^0.14.0\",\"@types/chai\":\"^4.2.11\",\"@types/fs-extra\":\"^9.0.1\",\"@types/isomorphic-git__lightning-fs\":\"^4.4.2\",\"@types/jest\":\"^27.0.2\",\"@types/lodash\":\"^4.14.172\",\"@types/mocha\":\"^7.0.2\",\"@types/node\":\"~8.9.4\",\"@types/react\":\"^17.0.24\",\"@types/react-beautiful-dnd\":\"^13.1.2\",\"@types/react-dom\":\"^17.0.9\",\"@types/react-router-dom\":\"^5.3.0\",\"@types/request\":\"^2.48.7\",\"@types/semver\":\"^7.3.10\",\"@types/tape\":\"^4.13.0\",\"@types/ws\":\"^7.2.4\",\"@typescript-eslint/eslint-plugin\":\"^4.32.0\",\"@typescript-eslint/parser\":\"^4.32.0\",\"ace-mode-lexon\":\"^1.*.*\",\"ace-mode-move\":\"0.0.1\",\"ace-mode-solidity\":\"^0.1.0\",\"ace-mode-zokrates\":\"^1.0.4\",\"babel-eslint\":\"^10.0.0\",\"babel-jest\":\"25.1.0\",\"babel-plugin-add-module-exports\":\"^1.0.2\",\"babel-plugin-fast-async\":\"^6.1.2\",\"babel-plugin-module-resolver\":\"^4.0.0\",\"babel-plugin-transform-object-rest-spread\":\"^6.26.0\",\"babel-plugin-yo-yoify\":\"^2.0.0\",\"babel-preset-env\":\"^1.7.0\",\"babel-preset-typescript\":\"^7.0.0-alpha.19\",\"babelify\":\"^10.0.0\",\"browserify\":\"^16.2.3\",\"browserify-reload\":\"^1.0.3\",\"component-type\":\"^1.2.1\",\"copy-to-clipboard\":\"^3.3.1\",\"csjs-inject\":\"^1.0.1\",\"csslint\":\"^1.0.2\",\"dotenv\":\"^8.2.0\",\"eslint\":\"6.8.0\",\"eslint-config-standard\":\"^14.1.1\",\"eslint-plugin-import\":\"2.20.2\",\"eslint-plugin-jsx-a11y\":\"6.4.1\",\"eslint-plugin-node\":\"11.1.0\",\"eslint-plugin-promise\":\"4.2.1\",\"eslint-plugin-react\":\"7.23.1\",\"eslint-plugin-react-hooks\":\"4.2.0\",\"eslint-plugin-standard\":\"4.0.1\",\"events\":\"^3.0.0\",\"execr\":\"^1.0.1\",\"exorcist\":\"^0.4.0\",\"exports-loader\":\"^1.1.0\",\"fast-async\":\"^7.0.6\",\"fast-levenshtein\":\"^2.0.6\",\"ganache-cli\":\"^6.8.1\",\"gists\":\"^1.0.1\",\"gulp\":\"^4.0.2\",\"ipfs-http-client\":\"^47.0.1\",\"ipfs-mini\":\"^1.1.5\",\"is-electron\":\"^2.2.0\",\"javascript-serialize\":\"^1.6.1\",\"jest\":\"^27.2.4\",\"js-base64\":\"^2.1.9\",\"js-beautify\":\"1.6.14\",\"lerna\":\"^3.22.1\",\"minixhr\":\"^3.2.2\",\"mkdirp\":\"^0.5.1\",\"mocha\":\"^8.0.1\",\"nanohtml\":\"^1.6.3\",\"nightwatch\":\"^2.3\",\"nodemon\":\"^2.0.4\",\"notify-error\":\"^1.2.0\",\"npm-link-local\":\"^1.1.0\",\"npm-merge-driver\":\"^2.3.5\",\"npm-run-all\":\"^4.0.2\",\"nyc\":\"^13.3.0\",\"onchange\":\"^3.2.1\",\"request\":\"^2.83.0\",\"rimraf\":\"^2.6.1\",\"selenium-standalone\":\"^8.0.4\",\"semver\":\"^6.3.0\",\"solc\":\"0.7.4\",\"tap-spec\":\"^5.0.0\",\"tape\":\"^4.13.3\",\"terser-webpack-plugin\":\"^4.2.3\",\"ts-jest\":\"^27.0.5\",\"ts-node\":\"^7.0.1\",\"tslint\":\"~6.0.0\",\"typescript\":\"^4.4.3\",\"uglify-js\":\"^2.8.16\",\"vm-browserify\":\"0.0.4\",\"watchify\":\"^3.9.0\",\"webworkify-webpack\":\"^2.1.5\",\"worker-loader\":\"^2.0.0\",\"yo-yo\":\"github:ioedeveloper/yo-yo\",\"yo-yoify\":\"^3.7.3\"}}");

/***/ }),

/***/ "./app/components/preload.tsx":
/*!************************************!*\
  !*** ./app/components/preload.tsx ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

var _typeof = __webpack_require__(/*! @babel/runtime/helpers/typeof */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/typeof.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Preload = void 0;

var _regenerator = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/regenerator/index.js"));

var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/asyncToGenerator.js"));

var _slicedToArray2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/slicedToArray.js"));

var _app = __webpack_require__(/*! @remix-ui/app */ "../../../libs/remix-ui/app/src/index.ts");

var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _reactDom = __webpack_require__(/*! react-dom */ "../../../node_modules/react-dom/index.js");

var packageJson = _interopRequireWildcard(__webpack_require__(/*! ../../../../../package.json */ "../../../package.json"));

var _fileSystem = __webpack_require__(/*! ../files/fileSystem */ "./app/files/fileSystem.ts");

var _indexedDB = __webpack_require__(/*! ../files/filesystems/indexedDB */ "./app/files/filesystems/indexedDB.ts");

var _localStorage = __webpack_require__(/*! ../files/filesystems/localStorage */ "./app/files/filesystems/localStorage.ts");

var _fileSystemUtility = __webpack_require__(/*! ../files/filesystems/fileSystemUtility */ "./app/files/filesystems/fileSystemUtility.ts");

__webpack_require__(/*! ./styles/preload.css */ "./app/components/styles/preload.css");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var _paq = window._paq = window._paq || [];

var Preload = function Preload() {
  var _useState = (0, _react.useState)(true),
      _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
      supported = _useState2[0],
      setSupported = _useState2[1];

  var _useState3 = (0, _react.useState)(false),
      _useState4 = (0, _slicedToArray2["default"])(_useState3, 2),
      error = _useState4[0],
      setError = _useState4[1];

  var _useState5 = (0, _react.useState)(false),
      _useState6 = (0, _slicedToArray2["default"])(_useState5, 2),
      showDownloader = _useState6[0],
      setShowDownloader = _useState6[1];

  var remixFileSystems = (0, _react.useRef)(new _fileSystem.fileSystems());
  var remixIndexedDB = (0, _react.useRef)(new _indexedDB.indexedDBFileSystem());
  var localStorageFileSystem = (0, _react.useRef)(new _localStorage.localStorageFS()); // url parameters to e2e test the fallbacks and error warnings

  var testmigrationFallback = (0, _react.useRef)(window.location.hash.includes('e2e_testmigration_fallback=true') && window.location.host === '127.0.0.1:8080' && window.location.protocol === 'http:');
  var testmigrationResult = (0, _react.useRef)(window.location.hash.includes('e2e_testmigration=true') && window.location.host === '127.0.0.1:8080' && window.location.protocol === 'http:');
  var testBlockStorage = (0, _react.useRef)(window.location.hash.includes('e2e_testblock_storage=true') && window.location.host === '127.0.0.1:8080' && window.location.protocol === 'http:');

  function loadAppComponent() {
    __webpack_require__.e(/*! import() | app */ "app").then(__webpack_require__.t.bind(null, /*! ../../app */ "./app.js", 7)).then(function (AppComponent) {
      var appComponent = new AppComponent["default"]();
      appComponent.run().then(function () {
        (0, _reactDom.render)( /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_app.RemixApp, {
          app: appComponent
        })), document.getElementById('root'));
      });
    })["catch"](function (err) {
      _paq.push(['trackEvent', 'Preload', 'error', err && err.message]);

      console.log('Error loading Remix:', err);
      setError(true);
    });
  }

  var downloadBackup = /*#__PURE__*/function () {
    var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var fsUtility;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              setShowDownloader(false);
              fsUtility = new _fileSystemUtility.fileSystemUtility();
              _context.next = 4;
              return fsUtility.downloadBackup(remixFileSystems.current.fileSystems['localstorage']);

            case 4:
              _context.next = 6;
              return migrateAndLoad();

            case 6:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function downloadBackup() {
      return _ref.apply(this, arguments);
    };
  }();

  var migrateAndLoad = /*#__PURE__*/function () {
    var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var fsUtility, migrationResult;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              setShowDownloader(false);
              fsUtility = new _fileSystemUtility.fileSystemUtility();
              _context2.next = 4;
              return fsUtility.migrate(localStorageFileSystem.current, remixIndexedDB.current);

            case 4:
              migrationResult = _context2.sent;

              _paq.push(['trackEvent', 'Migrate', 'result', migrationResult ? 'success' : 'fail']);

              _context2.next = 8;
              return setFileSystems();

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function migrateAndLoad() {
      return _ref2.apply(this, arguments);
    };
  }();

  var setFileSystems = /*#__PURE__*/function () {
    var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var fsLoaded;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return remixFileSystems.current.setFileSystem([testmigrationFallback.current || testBlockStorage.current ? null : remixIndexedDB.current, testBlockStorage.current ? null : localStorageFileSystem.current]);

            case 2:
              fsLoaded = _context3.sent;

              if (fsLoaded) {
                console.log(fsLoaded.name + ' activated');

                _paq.push(['trackEvent', 'Storage', 'activate', fsLoaded.name]);

                loadAppComponent();
              } else {
                _paq.push(['trackEvent', 'Storage', 'error', 'no supported storage']);

                setSupported(false);
              }

            case 4:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    }));

    return function setFileSystems() {
      return _ref3.apply(this, arguments);
    };
  }();

  var testmigration = /*#__PURE__*/function () {
    var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4() {
      var fsUtility;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (testmigrationResult.current) {
                fsUtility = new _fileSystemUtility.fileSystemUtility();
                fsUtility.populateWorkspace(_fileSystemUtility.migrationTestData, remixFileSystems.current.fileSystems['localstorage'].fs);
              }

            case 1:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4);
    }));

    return function testmigration() {
      return _ref4.apply(this, arguments);
    };
  }();

  (0, _react.useEffect)(function () {
    function loadStorage() {
      return _loadStorage.apply(this, arguments);
    }

    function _loadStorage() {
      _loadStorage = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5() {
        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return remixFileSystems.current.addFileSystem(remixIndexedDB.current);

              case 2:
                _context5.t0 = _context5.sent;

                if (_context5.t0) {
                  _context5.next = 5;
                  break;
                }

                _paq.push(['trackEvent', 'Storage', 'error', 'indexedDB not supported']);

              case 5:
                _context5.next = 7;
                return remixFileSystems.current.addFileSystem(localStorageFileSystem.current);

              case 7:
                _context5.t1 = _context5.sent;

                if (_context5.t1) {
                  _context5.next = 10;
                  break;
                }

                _paq.push(['trackEvent', 'Storage', 'error', 'localstorage not supported']);

              case 10:
                _context5.next = 12;
                return testmigration();

              case 12:
                _context5.t2 = remixIndexedDB.current.loaded;

                if (!_context5.t2) {
                  _context5.next = 16;
                  break;
                }

                _context5.next = 16;
                return remixIndexedDB.current.checkWorkspaces();

              case 16:
                _context5.t3 = localStorageFileSystem.current.loaded;

                if (!_context5.t3) {
                  _context5.next = 20;
                  break;
                }

                _context5.next = 20;
                return localStorageFileSystem.current.checkWorkspaces();

              case 20:
                _context5.t4 = remixIndexedDB.current.loaded;

                if (!_context5.t4) {
                  _context5.next = 28;
                  break;
                }

                if (!(remixIndexedDB.current.hasWorkSpaces || !localStorageFileSystem.current.hasWorkSpaces)) {
                  _context5.next = 27;
                  break;
                }

                _context5.next = 25;
                return setFileSystems();

              case 25:
                _context5.next = 28;
                break;

              case 27:
                setShowDownloader(true);

              case 28:
                _context5.t5 = !remixIndexedDB.current.loaded;

                if (!_context5.t5) {
                  _context5.next = 32;
                  break;
                }

                _context5.next = 32;
                return setFileSystems();

              case 32:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));
      return _loadStorage.apply(this, arguments);
    }

    loadStorage();
  }, []);
  return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement("div", {
    className: "preload-container"
  }, /*#__PURE__*/_react["default"].createElement("div", {
    className: "preload-logo pb-4"
  }, logo, /*#__PURE__*/_react["default"].createElement("div", {
    className: "info-secondary splash"
  }, "REMIX IDE", /*#__PURE__*/_react["default"].createElement("br", null), /*#__PURE__*/_react["default"].createElement("span", {
    className: "version"
  }, " v", packageJson.version))), !supported ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "preload-info-container alert alert-warning"
  }, "Your browser does not support any of the filesystems required by Remix. Either change the settings in your browser or use a supported browser.") : null, error ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "preload-info-container alert alert-danger text-left"
  }, "An unknown error has occurred while loading the application.", /*#__PURE__*/_react["default"].createElement("br", null), "Doing a hard refresh might fix this issue:", /*#__PURE__*/_react["default"].createElement("br", null), /*#__PURE__*/_react["default"].createElement("div", {
    className: "pt-2"
  }, "Windows:", /*#__PURE__*/_react["default"].createElement("br", null), "- Chrome: CTRL + F5 or CTRL + Reload Button", /*#__PURE__*/_react["default"].createElement("br", null), "- Firefox: CTRL + SHIFT + R or CTRL + F5", /*#__PURE__*/_react["default"].createElement("br", null)), /*#__PURE__*/_react["default"].createElement("div", {
    className: "pt-2"
  }, "MacOS:", /*#__PURE__*/_react["default"].createElement("br", null), "- Chrome & FireFox: CMD + SHIFT + R or SHIFT + Reload Button", /*#__PURE__*/_react["default"].createElement("br", null)), /*#__PURE__*/_react["default"].createElement("div", {
    className: "pt-2"
  }, "Linux:", /*#__PURE__*/_react["default"].createElement("br", null), "- Chrome & FireFox: CTRL + SHIFT + R", /*#__PURE__*/_react["default"].createElement("br", null))) : null, showDownloader ? /*#__PURE__*/_react["default"].createElement("div", {
    className: "preload-info-container alert alert-info"
  }, "This app will be updated now. Please download a backup of your files now to make sure you don't lose your work.", /*#__PURE__*/_react["default"].createElement("br", null), "You don't need to do anything else, your files will be available when the app loads.", /*#__PURE__*/_react["default"].createElement("div", {
    onClick: /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6() {
      return _regenerator["default"].wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return downloadBackup();

            case 2:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6);
    })),
    "data-id": "downloadbackup-btn",
    className: "btn btn-primary mt-1"
  }, "download backup"), /*#__PURE__*/_react["default"].createElement("div", {
    onClick: /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7() {
      return _regenerator["default"].wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 2;
              return migrateAndLoad();

            case 2:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7);
    })),
    "data-id": "skipbackup-btn",
    className: "btn btn-primary mt-1"
  }, "skip backup")) : null, supported && !error && !showDownloader ? /*#__PURE__*/_react["default"].createElement("div", null, /*#__PURE__*/_react["default"].createElement("i", {
    className: "fas fa-spinner fa-spin fa-2x"
  })) : null));
};

exports.Preload = Preload;

var logo = /*#__PURE__*/_react["default"].createElement("svg", {
  id: "Ebene_2",
  "data-name": "Ebene 2",
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 105 100"
}, /*#__PURE__*/_react["default"].createElement("path", {
  d: "M91.84,35a.09.09,0,0,1-.1-.07,41,41,0,0,0-79.48,0,.09.09,0,0,1-.1.07C9.45,35,1,35.35,1,42.53c0,8.56,1,16,6,20.32,2.16,1.85,5.81,2.3,9.27,2.22a44.4,44.4,0,0,0,6.45-.68.09.09,0,0,0,.06-.15A34.81,34.81,0,0,1,17,45c0-.1,0-.21,0-.31a35,35,0,0,1,70,0c0,.1,0,.21,0,.31a34.81,34.81,0,0,1-5.78,19.24.09.09,0,0,0,.06.15,44.4,44.4,0,0,0,6.45.68c3.46.08,7.11-.37,9.27-2.22,5-4.27,6-11.76,6-20.32C103,35.35,94.55,35,91.84,35Z"
}), /*#__PURE__*/_react["default"].createElement("path", {
  d: "M52,74,25.4,65.13a.1.1,0,0,0-.1.17L51.93,91.93a.1.1,0,0,0,.14,0L78.7,65.3a.1.1,0,0,0-.1-.17L52,74A.06.06,0,0,1,52,74Z"
}), /*#__PURE__*/_react["default"].createElement("path", {
  d: "M75.68,46.9,82,45a.09.09,0,0,0,.08-.09,29.91,29.91,0,0,0-.87-6.94.11.11,0,0,0-.09-.08l-6.43-.58a.1.1,0,0,1-.06-.18l4.78-4.18a.13.13,0,0,0,0-.12,30.19,30.19,0,0,0-3.65-6.07.09.09,0,0,0-.11,0l-5.91,2a.1.1,0,0,1-.12-.14L72.19,23a.11.11,0,0,0,0-.12,29.86,29.86,0,0,0-5.84-4.13.09.09,0,0,0-.11,0l-4.47,4.13a.1.1,0,0,1-.17-.07l.09-6a.1.1,0,0,0-.07-.1,30.54,30.54,0,0,0-7-1.47.1.1,0,0,0-.1.07l-2.38,5.54a.1.1,0,0,1-.18,0l-2.37-5.54a.11.11,0,0,0-.11-.06,30,30,0,0,0-7,1.48.12.12,0,0,0-.07.1l.08,6.05a.09.09,0,0,1-.16.07L37.8,18.76a.11.11,0,0,0-.12,0,29.75,29.75,0,0,0-5.83,4.13.11.11,0,0,0,0,.12l2.59,5.6a.11.11,0,0,1-.13.14l-5.9-2a.11.11,0,0,0-.12,0,30.23,30.23,0,0,0-3.62,6.08.11.11,0,0,0,0,.12l4.79,4.19a.1.1,0,0,1-.06.17L23,37.91a.1.1,0,0,0-.09.07A29.9,29.9,0,0,0,22,44.92a.1.1,0,0,0,.07.1L28.4,47a.1.1,0,0,1,0,.18l-5.84,3.26a.16.16,0,0,0,0,.11,30.17,30.17,0,0,0,2.1,6.76c.32.71.67,1.4,1,2.08a.1.1,0,0,0,.06,0L52,68.16H52l26.34-8.78a.1.1,0,0,0,.06-.05,30.48,30.48,0,0,0,3.11-8.88.1.1,0,0,0-.05-.11l-5.83-3.26A.1.1,0,0,1,75.68,46.9Z"
}));

/***/ }),

/***/ "./app/components/styles/preload.css":
/*!*******************************************!*\
  !*** ./app/components/styles/preload.css ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./preload.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!./app/components/styles/preload.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "./app/files/fileSystem.ts":
/*!*********************************!*\
  !*** ./app/files/fileSystem.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fileSystems = exports.fileSystem = void 0;

var _regenerator = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/regenerator/index.js"));

var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/asyncToGenerator.js"));

var _classCallCheck2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/classCallCheck.js"));

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/defineProperty.js"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var fileSystem = function fileSystem() {
  var _this = this;

  (0, _classCallCheck2["default"])(this, fileSystem);
  (0, _defineProperty2["default"])(this, "name", void 0);
  (0, _defineProperty2["default"])(this, "enabled", void 0);
  (0, _defineProperty2["default"])(this, "available", void 0);
  (0, _defineProperty2["default"])(this, "fs", void 0);
  (0, _defineProperty2["default"])(this, "fsCallBack", void 0);
  (0, _defineProperty2["default"])(this, "hasWorkSpaces", void 0);
  (0, _defineProperty2["default"])(this, "loaded", void 0);
  (0, _defineProperty2["default"])(this, "load", void 0);
  (0, _defineProperty2["default"])(this, "test", void 0);
  (0, _defineProperty2["default"])(this, "checkWorkspaces", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return _this.fs.stat('.workspaces');

          case 3:
            _this.hasWorkSpaces = true;
            _context.next = 8;
            break;

          case 6:
            _context.prev = 6;
            _context.t0 = _context["catch"](0);

          case 8:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[0, 6]]);
  })));
  (0, _defineProperty2["default"])(this, "set", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
    var w;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            w = window;

            if (_this.loaded) {
              _context2.next = 3;
              break;
            }

            return _context2.abrupt("return", false);

          case 3:
            w.remixFileSystem = _this.fs;
            w.remixFileSystem.name = _this.name;
            w.remixFileSystemCallback = _this.fsCallBack;
            return _context2.abrupt("return", true);

          case 7:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  })));
  this.available = false;
  this.enabled = false;
  this.hasWorkSpaces = false;
  this.loaded = false;
};

exports.fileSystem = fileSystem;

var fileSystems = function fileSystems() {
  var _this2 = this;

  (0, _classCallCheck2["default"])(this, fileSystems);
  (0, _defineProperty2["default"])(this, "fileSystems", void 0);
  (0, _defineProperty2["default"])(this, "addFileSystem", /*#__PURE__*/function () {
    var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(fs) {
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;
              _this2.fileSystems[fs.name] = fs;
              _context3.next = 4;
              return fs.test();

            case 4:
              _context3.t0 = _context3.sent;

              if (!_context3.t0) {
                _context3.next = 8;
                break;
              }

              _context3.next = 8;
              return fs.load();

            case 8:
              console.log(fs.name + ' is loaded...');
              return _context3.abrupt("return", true);

            case 12:
              _context3.prev = 12;
              _context3.t1 = _context3["catch"](0);
              console.log(fs.name + ' not available...');
              return _context3.abrupt("return", false);

            case 16:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, null, [[0, 12]]);
    }));

    return function (_x) {
      return _ref3.apply(this, arguments);
    };
  }());
  (0, _defineProperty2["default"])(this, "setFileSystem", /*#__PURE__*/function () {
    var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(filesystems) {
      var _iterator, _step, fs, result;

      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _iterator = _createForOfIteratorHelper(filesystems);
              _context4.prev = 1;

              _iterator.s();

            case 3:
              if ((_step = _iterator.n()).done) {
                _context4.next = 13;
                break;
              }

              fs = _step.value;

              if (!(fs && _this2.fileSystems[fs.name])) {
                _context4.next = 11;
                break;
              }

              _context4.next = 8;
              return _this2.fileSystems[fs.name].set();

            case 8:
              result = _context4.sent;

              if (!result) {
                _context4.next = 11;
                break;
              }

              return _context4.abrupt("return", _this2.fileSystems[fs.name]);

            case 11:
              _context4.next = 3;
              break;

            case 13:
              _context4.next = 18;
              break;

            case 15:
              _context4.prev = 15;
              _context4.t0 = _context4["catch"](1);

              _iterator.e(_context4.t0);

            case 18:
              _context4.prev = 18;

              _iterator.f();

              return _context4.finish(18);

            case 21:
              return _context4.abrupt("return", null);

            case 22:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, null, [[1, 15, 18, 21]]);
    }));

    return function (_x2) {
      return _ref4.apply(this, arguments);
    };
  }());
  this.fileSystems = {};
};

exports.fileSystems = fileSystems;

/***/ }),

/***/ "./app/files/filesystems/fileSystemUtility.ts":
/*!****************************************************!*\
  !*** ./app/files/filesystems/fileSystemUtility.ts ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.migrationTestData = exports.fileSystemUtility = void 0;

var _regenerator = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/regenerator/index.js"));

var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/asyncToGenerator.js"));

var _classCallCheck2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/classCallCheck.js"));

var _createClass2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/createClass */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/createClass.js"));

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/defineProperty.js"));

var _utils = __webpack_require__(/*! ethers/lib/utils */ "../../../node_modules/ethers/lib/utils.js");

var _jszip = _interopRequireDefault(__webpack_require__(/*! jszip */ "../../../node_modules/jszip/dist/jszip.min.js"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var _paq = window._paq = window._paq || [];

var fileSystemUtility = /*#__PURE__*/function () {
  function fileSystemUtility() {
    var _this = this;

    (0, _classCallCheck2["default"])(this, fileSystemUtility);
    (0, _defineProperty2["default"])(this, "migrate", /*#__PURE__*/function () {
      var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(fsFrom, fsTo) {
        var fromFiles, toFiles;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                _context.next = 3;
                return fsFrom.checkWorkspaces();

              case 3:
                _context.next = 5;
                return fsTo.checkWorkspaces();

              case 5:
                if (!fsTo.hasWorkSpaces) {
                  _context.next = 8;
                  break;
                }

                console.log("".concat(fsTo.name, " already has files"));
                return _context.abrupt("return", true);

              case 8:
                if (fsFrom.hasWorkSpaces) {
                  _context.next = 11;
                  break;
                }

                console.log('no files to migrate');
                return _context.abrupt("return", true);

              case 11:
                _context.next = 13;
                return _this.copyFolderToJson('/', null, null, fsFrom.fs);

              case 13:
                fromFiles = _context.sent;
                _context.next = 16;
                return _this.populateWorkspace(fromFiles, fsTo.fs);

              case 16:
                _context.next = 18;
                return _this.copyFolderToJson('/', null, null, fsTo.fs);

              case 18:
                toFiles = _context.sent;

                if (!((0, _utils.hashMessage)(JSON.stringify(toFiles)) === (0, _utils.hashMessage)(JSON.stringify(fromFiles)))) {
                  _context.next = 24;
                  break;
                }

                console.log('file migration successful');
                return _context.abrupt("return", true);

              case 24:
                _paq.push(['trackEvent', 'Migrate', 'error', 'hash mismatch']);

                console.log('file migration failed falling back to ' + fsFrom.name);
                fsTo.loaded = false;
                return _context.abrupt("return", false);

              case 28:
                _context.next = 37;
                break;

              case 30:
                _context.prev = 30;
                _context.t0 = _context["catch"](0);
                console.log(_context.t0);

                _paq.push(['trackEvent', 'Migrate', 'error', _context.t0 && _context.t0.message]);

                console.log('file migration failed falling back to ' + fsFrom.name);
                fsTo.loaded = false;
                return _context.abrupt("return", false);

              case 37:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[0, 30]]);
      }));

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }());
    (0, _defineProperty2["default"])(this, "downloadBackup", /*#__PURE__*/function () {
      var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(fs) {
        var zip, blob, today, date, time;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.prev = 0;
                zip = new _jszip["default"]();
                zip.file("readme.txt", "This is a Remix backup file.\nThis zip should be used by the restore backup tool in Remix.\nThe .workspaces directory contains your workspaces.");
                _context2.next = 5;
                return fs.checkWorkspaces();

              case 5:
                _context2.next = 7;
                return _this.copyFolderToJson('/', null, null, fs.fs, function (_ref3) {
                  var path = _ref3.path,
                      content = _ref3.content;
                  zip.file(path, content);
                });

              case 7:
                _context2.next = 9;
                return zip.generateAsync({
                  type: 'blob'
                });

              case 9:
                blob = _context2.sent;
                today = new Date();
                date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
                time = today.getHours() + 'h' + today.getMinutes() + 'min';

                _this.saveAs(blob, "remix-backup-at-".concat(time, "-").concat(date, ".zip"));

                _paq.push(['trackEvent', 'Backup', 'download', 'preload']);

                _context2.next = 21;
                break;

              case 17:
                _context2.prev = 17;
                _context2.t0 = _context2["catch"](0);

                _paq.push(['trackEvent', 'Backup', 'error', _context2.t0 && _context2.t0.message]);

                console.log(_context2.t0);

              case 21:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[0, 17]]);
      }));

      return function (_x3) {
        return _ref2.apply(this, arguments);
      };
    }());
    (0, _defineProperty2["default"])(this, "populateWorkspace", /*#__PURE__*/function () {
      var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(json, fs) {
        var item, isFolder;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.t0 = _regenerator["default"].keys(json);

              case 1:
                if ((_context3.t1 = _context3.t0()).done) {
                  _context3.next = 15;
                  break;
                }

                item = _context3.t1.value;
                isFolder = json[item].content === undefined;

                if (!isFolder) {
                  _context3.next = 11;
                  break;
                }

                _context3.next = 7;
                return _this.createDir(item, fs);

              case 7:
                _context3.next = 9;
                return _this.populateWorkspace(json[item].children, fs);

              case 9:
                _context3.next = 13;
                break;

              case 11:
                _context3.next = 13;
                return fs.writeFile(item, json[item].content, 'utf8');

              case 13:
                _context3.next = 1;
                break;

              case 15:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x4, _x5) {
        return _ref4.apply(this, arguments);
      };
    }());
    (0, _defineProperty2["default"])(this, "copyFolderToJson", /*#__PURE__*/function () {
      var _ref5 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(path, visitFile, visitFolder, fs) {
        var cb,
            _args4 = arguments;
        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                cb = _args4.length > 4 && _args4[4] !== undefined ? _args4[4] : null;

                visitFile = visitFile || function () {};

                visitFolder = visitFolder || function () {};

                _context4.next = 5;
                return _this._copyFolderToJsonInternal(path, visitFile, visitFolder, fs, cb);

              case 5:
                return _context4.abrupt("return", _context4.sent);

              case 6:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      return function (_x6, _x7, _x8, _x9) {
        return _ref5.apply(this, arguments);
      };
    }());
    (0, _defineProperty2["default"])(this, "createDir", /*#__PURE__*/function () {
      var _ref6 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(path, fs) {
        var paths, currentCheck, _iterator, _step, value;

        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                paths = path.split('/');
                if (paths.length && paths[0] === '') paths.shift();
                currentCheck = '';
                _iterator = _createForOfIteratorHelper(paths);
                _context5.prev = 4;

                _iterator.s();

              case 6:
                if ((_step = _iterator.n()).done) {
                  _context5.next = 16;
                  break;
                }

                value = _step.value;
                currentCheck = currentCheck + (currentCheck ? '/' : '') + value;
                _context5.next = 11;
                return fs.exists(currentCheck);

              case 11:
                if (_context5.sent) {
                  _context5.next = 14;
                  break;
                }

                _context5.next = 14;
                return fs.mkdir(currentCheck);

              case 14:
                _context5.next = 6;
                break;

              case 16:
                _context5.next = 21;
                break;

              case 18:
                _context5.prev = 18;
                _context5.t0 = _context5["catch"](4);

                _iterator.e(_context5.t0);

              case 21:
                _context5.prev = 21;

                _iterator.f();

                return _context5.finish(21);

              case 24:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, null, [[4, 18, 21, 24]]);
      }));

      return function (_x10, _x11) {
        return _ref6.apply(this, arguments);
      };
    }());
    (0, _defineProperty2["default"])(this, "saveAs", function (blob, name) {
      var node = document.createElement('a');
      node.download = name;
      node.rel = 'noopener';
      node.href = URL.createObjectURL(blob);
      setTimeout(function () {
        URL.revokeObjectURL(node.href);
      }, 4E4); // 40s

      setTimeout(function () {
        try {
          node.dispatchEvent(new MouseEvent('click'));
        } catch (e) {
          var evt = document.createEvent('MouseEvents');
          evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
          node.dispatchEvent(evt);
        }
      }, 0); // 40s
    });
  }

  (0, _createClass2["default"])(fileSystemUtility, [{
    key: "_copyFolderToJsonInternal",
    value:
    /**
     * copy the folder recursively (internal use)
     * @param {string} path is the folder to be copied over
     * @param {Function} visitFile is a function called for each visited files
     * @param {Function} visitFolder is a function called for each visited folders
     */
    function () {
      var _copyFolderToJsonInternal2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(path, visitFile, visitFolder, fs, cb) {
        var json, items, _iterator2, _step2, item, file, curPath;

        return _regenerator["default"].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                visitFile = visitFile || function () {
                  /* do nothing. */
                };

                visitFolder = visitFolder || function () {
                  /* do nothing. */
                };

                json = {}; // path = this.removePrefix(path)

                _context6.next = 5;
                return fs.exists(path);

              case 5:
                if (!_context6.sent) {
                  _context6.next = 42;
                  break;
                }

                _context6.next = 8;
                return fs.readdir(path);

              case 8:
                items = _context6.sent;
                visitFolder({
                  path: path
                });

                if (!(items.length !== 0)) {
                  _context6.next = 42;
                  break;
                }

                _iterator2 = _createForOfIteratorHelper(items);
                _context6.prev = 12;

                _iterator2.s();

              case 14:
                if ((_step2 = _iterator2.n()).done) {
                  _context6.next = 34;
                  break;
                }

                item = _step2.value;
                file = {};
                curPath = "".concat(path).concat(path.endsWith('/') ? '' : '/').concat(item);
                _context6.next = 20;
                return fs.stat(curPath);

              case 20:
                if (!_context6.sent.isDirectory()) {
                  _context6.next = 26;
                  break;
                }

                _context6.next = 23;
                return this._copyFolderToJsonInternal(curPath, visitFile, visitFolder, fs, cb);

              case 23:
                file.children = _context6.sent;
                _context6.next = 31;
                break;

              case 26:
                _context6.next = 28;
                return fs.readFile(curPath, 'utf8');

              case 28:
                file.content = _context6.sent;
                if (cb) cb({
                  path: curPath,
                  content: file.content
                });
                visitFile({
                  path: curPath,
                  content: file.content
                });

              case 31:
                json[curPath] = file;

              case 32:
                _context6.next = 14;
                break;

              case 34:
                _context6.next = 39;
                break;

              case 36:
                _context6.prev = 36;
                _context6.t0 = _context6["catch"](12);

                _iterator2.e(_context6.t0);

              case 39:
                _context6.prev = 39;

                _iterator2.f();

                return _context6.finish(39);

              case 42:
                return _context6.abrupt("return", json);

              case 43:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this, [[12, 36, 39, 42]]);
      }));

      function _copyFolderToJsonInternal(_x12, _x13, _x14, _x15, _x16) {
        return _copyFolderToJsonInternal2.apply(this, arguments);
      }

      return _copyFolderToJsonInternal;
    }()
  }]);
  return fileSystemUtility;
}();
/* eslint-disable no-template-curly-in-string */


exports.fileSystemUtility = fileSystemUtility;
var migrationTestData = {
  '.workspaces': {
    children: {
      '.workspaces/default_workspace': {
        children: {
          '.workspaces/default_workspace/README.txt': {
            content: 'TEST README'
          }
        }
      },
      '.workspaces/emptyspace': {},
      '.workspaces/workspace_test': {
        children: {
          '.workspaces/workspace_test/TEST_README.txt': {
            content: 'TEST README'
          },
          '.workspaces/workspace_test/test_contracts': {
            children: {
              '.workspaces/workspace_test/test_contracts/1_Storage.sol': {
                content: 'testing'
              },
              '.workspaces/workspace_test/test_contracts/artifacts': {
                children: {
                  '.workspaces/workspace_test/test_contracts/artifacts/Storage_metadata.json': {
                    content: '{ "test": "data" }'
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
exports.migrationTestData = migrationTestData;

/***/ }),

/***/ "./app/files/filesystems/indexedDB.ts":
/*!********************************************!*\
  !*** ./app/files/filesystems/indexedDB.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.indexedDBFileSystem = exports.IndexedDBStorage = void 0;

var _regenerator = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/regenerator/index.js"));

var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/asyncToGenerator.js"));

var _classCallCheck2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/classCallCheck.js"));

var _assertThisInitialized2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/assertThisInitialized */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/assertThisInitialized.js"));

var _inherits2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/inherits */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/inherits.js"));

var _possibleConstructorReturn2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/possibleConstructorReturn */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/possibleConstructorReturn.js"));

var _getPrototypeOf2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/getPrototypeOf */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/getPrototypeOf.js"));

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/defineProperty.js"));

var _lightningFs = _interopRequireDefault(__webpack_require__(/*! @isomorphic-git/lightning-fs */ "../../../node_modules/@isomorphic-git/lightning-fs/src/index.js"));

var _fileSystem2 = __webpack_require__(/*! ../fileSystem */ "./app/files/fileSystem.ts");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var IndexedDBStorage = /*#__PURE__*/function (_LightningFS) {
  (0, _inherits2["default"])(IndexedDBStorage, _LightningFS);

  var _super = _createSuper(IndexedDBStorage);

  function IndexedDBStorage(name) {
    var _this;

    (0, _classCallCheck2["default"])(this, IndexedDBStorage);
    _this = _super.call(this, name);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "base", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "addSlash", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "extended", void 0);

    _this.addSlash = function (file) {
      if (!file.startsWith('/')) file = '/' + file;
      return file;
    };

    _this.base = _this.promises;
    _this.extended = _objectSpread(_objectSpread({}, _this.promises), {}, {
      exists: function () {
        var _exists = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(path) {
          return _regenerator["default"].wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  return _context.abrupt("return", new Promise(function (resolve) {
                    _this.base.stat(_this.addSlash(path)).then(function () {
                      return resolve(true);
                    })["catch"](function () {
                      return resolve(false);
                    });
                  }));

                case 1:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }));

        function exists(_x) {
          return _exists.apply(this, arguments);
        }

        return exists;
      }(),
      rmdir: function () {
        var _rmdir = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(path) {
          return _regenerator["default"].wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  return _context2.abrupt("return", _this.base.rmdir(_this.addSlash(path)));

                case 1:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2);
        }));

        function rmdir(_x2) {
          return _rmdir.apply(this, arguments);
        }

        return rmdir;
      }(),
      readdir: function () {
        var _readdir = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(path) {
          return _regenerator["default"].wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  return _context3.abrupt("return", _this.base.readdir(_this.addSlash(path)));

                case 1:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3);
        }));

        function readdir(_x3) {
          return _readdir.apply(this, arguments);
        }

        return readdir;
      }(),
      unlink: function () {
        var _unlink = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(path) {
          return _regenerator["default"].wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  return _context4.abrupt("return", _this.base.unlink(_this.addSlash(path)));

                case 1:
                case "end":
                  return _context4.stop();
              }
            }
          }, _callee4);
        }));

        function unlink(_x4) {
          return _unlink.apply(this, arguments);
        }

        return unlink;
      }(),
      mkdir: function () {
        var _mkdir = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(path) {
          return _regenerator["default"].wrap(function _callee5$(_context5) {
            while (1) {
              switch (_context5.prev = _context5.next) {
                case 0:
                  return _context5.abrupt("return", _this.base.mkdir(_this.addSlash(path)));

                case 1:
                case "end":
                  return _context5.stop();
              }
            }
          }, _callee5);
        }));

        function mkdir(_x5) {
          return _mkdir.apply(this, arguments);
        }

        return mkdir;
      }(),
      readFile: function () {
        var _readFile = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(path, options) {
          return _regenerator["default"].wrap(function _callee6$(_context6) {
            while (1) {
              switch (_context6.prev = _context6.next) {
                case 0:
                  return _context6.abrupt("return", _this.base.readFile(_this.addSlash(path), options));

                case 1:
                case "end":
                  return _context6.stop();
              }
            }
          }, _callee6);
        }));

        function readFile(_x6, _x7) {
          return _readFile.apply(this, arguments);
        }

        return readFile;
      }(),
      rename: function () {
        var _rename = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(from, to) {
          return _regenerator["default"].wrap(function _callee7$(_context7) {
            while (1) {
              switch (_context7.prev = _context7.next) {
                case 0:
                  return _context7.abrupt("return", _this.base.rename(_this.addSlash(from), _this.addSlash(to)));

                case 1:
                case "end":
                  return _context7.stop();
              }
            }
          }, _callee7);
        }));

        function rename(_x8, _x9) {
          return _rename.apply(this, arguments);
        }

        return rename;
      }(),
      writeFile: function () {
        var _writeFile = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(path, content, options) {
          return _regenerator["default"].wrap(function _callee8$(_context8) {
            while (1) {
              switch (_context8.prev = _context8.next) {
                case 0:
                  return _context8.abrupt("return", _this.base.writeFile(_this.addSlash(path), content, options));

                case 1:
                case "end":
                  return _context8.stop();
              }
            }
          }, _callee8);
        }));

        function writeFile(_x10, _x11, _x12) {
          return _writeFile.apply(this, arguments);
        }

        return writeFile;
      }(),
      stat: function () {
        var _stat = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(path) {
          return _regenerator["default"].wrap(function _callee9$(_context9) {
            while (1) {
              switch (_context9.prev = _context9.next) {
                case 0:
                  return _context9.abrupt("return", _this.base.stat(_this.addSlash(path)));

                case 1:
                case "end":
                  return _context9.stop();
              }
            }
          }, _callee9);
        }));

        function stat(_x13) {
          return _stat.apply(this, arguments);
        }

        return stat;
      }()
    });
    return _this;
  }

  return IndexedDBStorage;
}(_lightningFs["default"]);

exports.IndexedDBStorage = IndexedDBStorage;

var indexedDBFileSystem = /*#__PURE__*/function (_fileSystem) {
  (0, _inherits2["default"])(indexedDBFileSystem, _fileSystem);

  var _super2 = _createSuper(indexedDBFileSystem);

  function indexedDBFileSystem() {
    var _this2;

    (0, _classCallCheck2["default"])(this, indexedDBFileSystem);
    _this2 = _super2.call(this);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this2), "load", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10() {
      return _regenerator["default"].wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              return _context10.abrupt("return", new Promise(function (resolve, reject) {
                try {
                  var fs = new IndexedDBStorage('RemixFileSystem');
                  fs.init('RemixFileSystem');
                  _this2.fs = fs.extended;
                  _this2.fsCallBack = fs;
                  _this2.loaded = true;
                  resolve(true);
                } catch (e) {
                  reject(e);
                }
              }));

            case 1:
            case "end":
              return _context10.stop();
          }
        }
      }, _callee10);
    })));
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this2), "test", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11() {
      return _regenerator["default"].wrap(function _callee11$(_context11) {
        while (1) {
          switch (_context11.prev = _context11.next) {
            case 0:
              return _context11.abrupt("return", new Promise(function (resolve, reject) {
                if (!window.indexedDB) {
                  _this2.available = false;
                  reject('No indexedDB on window');
                }

                var request = window.indexedDB.open("RemixTestDataBase");

                request.onerror = function () {
                  _this2.available = false;
                  reject('Error creating test database');
                };

                request.onsuccess = function () {
                  window.indexedDB.deleteDatabase("RemixTestDataBase");
                  _this2.available = true;
                  resolve(true);
                };
              }));

            case 1:
            case "end":
              return _context11.stop();
          }
        }
      }, _callee11);
    })));
    _this2.name = 'indexedDB';
    return _this2;
  }

  return indexedDBFileSystem;
}(_fileSystem2.fileSystem);

exports.indexedDBFileSystem = indexedDBFileSystem;

/***/ }),

/***/ "./app/files/filesystems/localStorage.ts":
/*!***********************************************!*\
  !*** ./app/files/filesystems/localStorage.ts ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.localStorageFS = void 0;

var _regenerator = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/regenerator/index.js"));

var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/asyncToGenerator.js"));

var _classCallCheck2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/classCallCheck.js"));

var _assertThisInitialized2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/assertThisInitialized */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/assertThisInitialized.js"));

var _inherits2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/inherits */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/inherits.js"));

var _possibleConstructorReturn2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/possibleConstructorReturn */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/possibleConstructorReturn.js"));

var _getPrototypeOf2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/getPrototypeOf */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/getPrototypeOf.js"));

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/defineProperty.js"));

var _fileSystem2 = __webpack_require__(/*! ../fileSystem */ "./app/files/fileSystem.ts");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var localStorageFS = /*#__PURE__*/function (_fileSystem) {
  (0, _inherits2["default"])(localStorageFS, _fileSystem);

  var _super = _createSuper(localStorageFS);

  function localStorageFS() {
    var _this;

    (0, _classCallCheck2["default"])(this, localStorageFS);
    _this = _super.call(this);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "load", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var me;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              me = (0, _assertThisInitialized2["default"])(_this);
              return _context2.abrupt("return", new Promise(function (resolve, reject) {
                try {
                  var w = window;
                  w.BrowserFS.install(window);
                  w.BrowserFS.configure({
                    fs: 'LocalStorage'
                  }, /*#__PURE__*/function () {
                    var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(e) {
                      return _regenerator["default"].wrap(function _callee$(_context) {
                        while (1) {
                          switch (_context.prev = _context.next) {
                            case 0:
                              if (e) {
                                console.log('BrowserFS Error: ' + e);
                                reject(e);
                              } else {
                                me.fs = _objectSpread({}, window.require('fs'));
                                me.fsCallBack = window.require('fs');
                                me.fs.readdir = me.fs.readdirSync;
                                me.fs.readFile = me.fs.readFileSync;
                                me.fs.writeFile = me.fs.writeFileSync;
                                me.fs.stat = me.fs.statSync;
                                me.fs.unlink = me.fs.unlinkSync;
                                me.fs.rmdir = me.fs.rmdirSync;
                                me.fs.mkdir = me.fs.mkdirSync;
                                me.fs.rename = me.fs.renameSync;
                                me.fs.exists = me.fs.existsSync;
                                me.loaded = true;
                                resolve(true);
                              }

                            case 1:
                            case "end":
                              return _context.stop();
                          }
                        }
                      }, _callee);
                    }));

                    return function (_x) {
                      return _ref2.apply(this, arguments);
                    };
                  }());
                } catch (e) {
                  console.log('BrowserFS is not ready!');
                  reject(e);
                }
              }));

            case 2:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })));
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "test", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              return _context3.abrupt("return", new Promise(function (resolve, reject) {
                var test = 'test';

                try {
                  localStorage.setItem(test, test);
                  localStorage.removeItem(test);
                  resolve(true);
                } catch (e) {
                  reject(e);
                }
              }));

            case 1:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    })));
    _this.name = 'localstorage';
    return _this;
  }

  return localStorageFS;
}(_fileSystem2.fileSystem);

exports.localStorageFS = localStorageFS;

/***/ }),

/***/ "./app/state/registry.ts":
/*!*******************************!*\
  !*** ./app/state/registry.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/classCallCheck.js"));

var _createClass2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/createClass */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/createClass.js"));

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/defineProperty.js"));

var Registry = /*#__PURE__*/function () {
  function Registry() {
    (0, _classCallCheck2["default"])(this, Registry);
    (0, _defineProperty2["default"])(this, "state", void 0);
    this.state = {};
  }

  (0, _createClass2["default"])(Registry, [{
    key: "put",
    value: function put(entry) {
      if (this.state[entry.name]) return this.state[entry.name];
      var server = {
        // uid: serveruid,
        api: entry.api
      };
      this.state[entry.name] = {
        server: server
      };
      return server;
    }
  }, {
    key: "get",
    value: function get(name) {
      var state = this.state[name];
      if (!state) return;
      var server = state.server;
      return server;
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!Registry.instance) {
        Registry.instance = new Registry();
      }

      return Registry.instance;
    }
  }]);
  return Registry;
}();

exports["default"] = Registry;
(0, _defineProperty2["default"])(Registry, "instance", void 0);

/***/ }),

/***/ "./app/tabs/theme-module.js":
/*!**********************************!*\
  !*** ./app/tabs/theme-module.js ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

var _typeof = __webpack_require__(/*! @babel/runtime/helpers/typeof */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/typeof.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThemeModule = void 0;

var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/defineProperty.js"));

var _classCallCheck2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/classCallCheck.js"));

var _createClass2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/createClass */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/createClass.js"));

var _inherits2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/inherits */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/inherits.js"));

var _possibleConstructorReturn2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/possibleConstructorReturn */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/possibleConstructorReturn.js"));

var _getPrototypeOf2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/getPrototypeOf */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/getPrototypeOf.js"));

var _engine = __webpack_require__(/*! @remixproject/engine */ "../../../node_modules/@remixproject/engine/index.js");

var _events = __webpack_require__(/*! events */ "../../../node_modules/events/events.js");

var _remixLib = __webpack_require__(/*! @remix-project/remix-lib */ "../../../dist/libs/remix-lib/src/index.js");

var packageJson = _interopRequireWildcard(__webpack_require__(/*! ../../../../../package.json */ "../../../package.json"));

var _registry = _interopRequireDefault(__webpack_require__(/*! ../state/registry */ "./app/state/registry.ts"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var _paq = window._paq = window._paq || [];

var themes = [{
  name: 'Dark',
  quality: 'dark',
  url: 'assets/css/themes/remix-dark_tvx1s2.css'
}, {
  name: 'Light',
  quality: 'light',
  url: 'assets/css/themes/remix-light_powaqg.css'
}, {
  name: 'Midcentury',
  quality: 'light',
  url: 'assets/css/themes/remix-midcentury_hrzph3.css'
}, {
  name: 'Black',
  quality: 'dark',
  url: 'assets/css/themes/remix-black_undtds.css'
}, {
  name: 'Candy',
  quality: 'light',
  url: 'assets/css/themes/remix-candy_ikhg4m.css'
}, {
  name: 'HackerOwl',
  quality: 'dark',
  url: 'assets/css/themes/remix-hacker_owl.css'
}, {
  name: 'Cerulean',
  quality: 'light',
  url: 'assets/css/themes/bootstrap-cerulean.min.css'
}, {
  name: 'Flatly',
  quality: 'light',
  url: 'assets/css/themes/bootstrap-flatly.min.css'
}, {
  name: 'Spacelab',
  quality: 'light',
  url: 'assets/css/themes/bootstrap-spacelab.min.css'
}, {
  name: 'Cyborg',
  quality: 'dark',
  url: 'assets/css/themes/bootstrap-cyborg.min.css'
}];
var profile = {
  name: 'theme',
  events: ['themeChanged'],
  methods: ['switchTheme', 'getThemes', 'currentTheme', 'fixInvert'],
  version: packageJson.version,
  kind: 'theme'
};

var ThemeModule = /*#__PURE__*/function (_Plugin) {
  (0, _inherits2["default"])(ThemeModule, _Plugin);

  var _super = _createSuper(ThemeModule);

  function ThemeModule() {
    var _this;

    (0, _classCallCheck2["default"])(this, ThemeModule);
    _this = _super.call(this, profile);
    _this.events = new _events.EventEmitter();
    _this._deps = {
      config: _registry["default"].getInstance().get('config') && _registry["default"].getInstance().get('config').api
    };
    _this.themes = {};
    themes.map(function (theme) {
      _this.themes[theme.name.toLocaleLowerCase()] = _objectSpread(_objectSpread({}, theme), {}, {
        url: window.location.origin + (window.location.pathname.startsWith('/address/') || window.location.pathname.endsWith('.sol') ? '/' : window.location.pathname) + theme.url
      });
    });
    _this._paq = _paq;
    var queryTheme = new _remixLib.QueryParams().get().theme;
    queryTheme = queryTheme && queryTheme.toLocaleLowerCase();
    queryTheme = _this.themes[queryTheme] ? queryTheme : null;
    var currentTheme = _this._deps.config && _this._deps.config.get('settings/theme') || null;
    currentTheme = currentTheme && currentTheme.toLocaleLowerCase();
    currentTheme = _this.themes[currentTheme] ? currentTheme : null;
    _this.currentThemeState = {
      queryTheme: queryTheme,
      currentTheme: currentTheme
    };
    _this.active = queryTheme || currentTheme || 'dark';
    _this.forced = !!queryTheme;
    return _this;
  }
  /** Return the active theme */


  (0, _createClass2["default"])(ThemeModule, [{
    key: "currentTheme",
    value: function currentTheme() {
      return this.themes[this.active];
    }
    /** Returns all themes as an array */

  }, {
    key: "getThemes",
    value: function getThemes() {
      var _this2 = this;

      return Object.keys(this.themes).map(function (key) {
        return _this2.themes[key];
      });
    }
    /**
     * Init the theme
     */

  }, {
    key: "initTheme",
    value: function initTheme(callback) {
      // callback is setTimeOut in app.js which is always passed
      if (callback) this.initCallback = callback;

      if (this.active) {
        document.getElementById('theme-link') ? document.getElementById('theme-link').remove() : null;
        var nextTheme = this.themes[this.active]; // Theme

        document.documentElement.style.setProperty('--theme', nextTheme.quality);
        var theme = document.createElement('link');
        theme.setAttribute('rel', 'stylesheet');
        theme.setAttribute('href', nextTheme.url);
        theme.setAttribute('id', 'theme-link');
        theme.addEventListener('load', function () {
          if (callback) callback();
        });
        document.head.insertBefore(theme, document.head.firstChild);
      }
    }
    /**
     * Change the current theme
     * @param {string} [themeName] - The name of the theme
     */

  }, {
    key: "switchTheme",
    value: function switchTheme(themeName) {
      var _this3 = this;

      themeName = themeName && themeName.toLocaleLowerCase();

      if (themeName && !Object.keys(this.themes).includes(themeName)) {
        throw new Error("Theme ".concat(themeName, " doesn't exist"));
      }

      var next = themeName || this.active; // Name

      if (next === this.active) return; // --> exit out of this method

      _paq.push(['trackEvent', 'themeModule', 'switchTo', next]);

      var nextTheme = this.themes[next]; // Theme

      if (!this.forced) this._deps.config.set('settings/theme', next);
      document.getElementById('theme-link') ? document.getElementById('theme-link').remove() : null;
      var theme = document.createElement('link');
      theme.setAttribute('rel', 'stylesheet');
      theme.setAttribute('href', nextTheme.url);
      theme.setAttribute('id', 'theme-link');
      theme.addEventListener('load', function () {
        _this3.emit('themeLoaded', nextTheme);

        _this3.events.emit('themeLoaded', nextTheme);
      });
      document.head.insertBefore(theme, document.head.firstChild);
      document.documentElement.style.setProperty('--theme', nextTheme.quality);
      if (themeName) this.active = themeName; // TODO: Only keep `this.emit` (issue#2210)

      this.emit('themeChanged', nextTheme);
      this.events.emit('themeChanged', nextTheme);
    }
    /**
     * fixes the invertion for images since this should be adjusted when we switch between dark/light qualified themes
     * @param {element} [image] - the dom element which invert should be fixed to increase visibility
     */

  }, {
    key: "fixInvert",
    value: function fixInvert(image) {
      var invert = this.currentTheme().quality === 'dark' ? 1 : 0;

      if (image) {
        image.style.filter = "invert(".concat(invert, ")");
      }
    }
  }]);
  return ThemeModule;
}(_engine.Plugin);

exports.ThemeModule = ThemeModule;

/***/ }),

/***/ "./config.js":
/*!*******************!*\
  !*** ./config.js ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var CONFIG_FILE = '.remix.config';

var EventEmitter = __webpack_require__(/*! events */ "../../../node_modules/events/events.js");

function Config(storage) {
  this.items = {};
  this.unpersistedItems = {};
  this.events = new EventEmitter(); // load on instantiation

  try {
    var config = storage.get(CONFIG_FILE);

    if (config) {
      this.items = JSON.parse(config);
    }
  } catch (exception) {
    /* Do nothing. */
  }

  this.exists = function (key) {
    return this.items[key] !== undefined;
  };

  this.get = function (key) {
    return this.items[key];
  };

  this.set = function (key, content) {
    this.items[key] = content;

    try {
      storage.set(CONFIG_FILE, JSON.stringify(this.items));
      this.events.emit(key + '_changed', content);
    } catch (exception) {
      /* Do nothing. */
    }
  };

  this.clear = function () {
    this.items = {};
    storage.remove(CONFIG_FILE);
  };

  this.getUnpersistedProperty = function (key) {
    return this.unpersistedItems[key];
  }; // TODO: this only used for *one* property "doNotShowTransactionConfirmationAgain"
  // and can be removed once it's refactored away in txRunner


  this.setUnpersistedProperty = function (key, value) {
    this.unpersistedItems[key] = value;
  };
}

module.exports = Config;

/***/ }),

/***/ "./index.css":
/*!*******************!*\
  !*** ./index.css ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./index.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!./index.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "./index.tsx":
/*!*******************!*\
  !*** ./index.tsx ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");

var _regenerator = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/regenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/regenerator/index.js"));

var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/asyncToGenerator.js"));

var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));

var _reactDom = __webpack_require__(/*! react-dom */ "../../../node_modules/react-dom/index.js");

__webpack_require__(/*! ./index.css */ "./index.css");

var _themeModule = __webpack_require__(/*! ./app/tabs/theme-module */ "./app/tabs/theme-module.js");

var _preload = __webpack_require__(/*! ./app/components/preload */ "./app/components/preload.tsx");

var _config = _interopRequireDefault(__webpack_require__(/*! ./config */ "./config.js"));

var _registry = _interopRequireDefault(__webpack_require__(/*! ./app/state/registry */ "./app/state/registry.ts"));

var _remixLib = __webpack_require__(/*! @remix-project/remix-lib */ "../../../dist/libs/remix-lib/src/index.js");

// eslint-disable-next-line no-use-before-define
(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
  var configStorage, config, theme;
  return _regenerator["default"].wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          try {
            configStorage = new _remixLib.Storage('config-v0.8:');
            config = new _config["default"](configStorage);

            _registry["default"].getInstance().put({
              api: config,
              name: 'config'
            });
          } catch (e) {}

          theme = new _themeModule.ThemeModule();
          theme.initTheme();
          (0, _reactDom.render)( /*#__PURE__*/_react["default"].createElement(_react["default"].StrictMode, null, /*#__PURE__*/_react["default"].createElement(_preload.Preload, null)), document.getElementById('root'));

        case 4:
        case "end":
          return _context.stop();
      }
    }
  }, _callee);
}))();

/***/ }),

/***/ "./main.js":
/*!*****************!*\
  !*** ./main.js ***!
  \*****************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


__webpack_require__(/*! ./index */ "./index.tsx");

/***/ }),

/***/ 0:
/*!***********************!*\
  !*** multi ./main.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! C:\Users\guwno\Desktop\remix-project-master\apps\remix-ide\src\main.js */"./main.js");


/***/ }),

/***/ 1:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 10:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 11:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 12:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 13:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 14:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 15:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 16:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 17:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 2:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 3:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 4:
/*!************************!*\
  !*** crypto (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 5:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 6:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 7:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 8:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 9:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.0.26.0-dev.1661717561336.js.map