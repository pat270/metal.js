'use strict';

var assert = require('assert');
var sinon = require('sinon');
var createFakeSocketIO = require('../fixture/FakeSocketIO');
require('../fixture/sandbox.js');

describe('WebSocketTransport', function() {
  before(function() {
    global.FakeSocketIO = createFakeSocketIO();
  });

  beforeEach(function() {
    global.io = function() {
      return new global.FakeSocketIO();
    };
  });

  it('should set uri', function() {
    var transport = new lfr.WebSocketTransport('');
    transport.setUri('http://liferay.com');
    assert.strictEqual('http://liferay.com', transport.getUri(), 'Should set uri');
  });

  it('should set uri from constructor', function() {
    var transport = new lfr.WebSocketTransport('http://liferay.com');
    assert.strictEqual('http://liferay.com', transport.getUri(), 'Should set uri from constructor');
  });

  it('should throw error when Socket.IO not found', function() {
    var transport = new lfr.WebSocketTransport('http://liferay.com');
    global.io = null;
    assert.throws(function() {
      transport.open();
    }, Error);
  });

  it('should connection open', function(done) {
    var transport = new lfr.WebSocketTransport('http://liferay.com');
    var stubOpen = sinon.stub();
    transport.on('open', stubOpen);
    transport.open();
    assert.strictEqual(0, stubOpen.callCount, 'Should open be asynchronous');
    transport.on('open', function() {
      assert.strictEqual(1, stubOpen.callCount);
      done();
    });
  });

  it('should connection warn when open multiple times', function(done) {
    var originalWarningFn = console.warn;
    console.warn = sinon.stub();

    var transport = new lfr.WebSocketTransport('http://liferay.com');
    var stubOpen = sinon.stub();
    transport.on('open', stubOpen);
    transport.open();
    transport.open();
    transport.open();
    assert.strictEqual(0, stubOpen.callCount, 'Should open be asynchronous');
    transport.on('open', function() {
      assert.strictEqual(2, console.warn.callCount, 'Should warn when open');
      assert.strictEqual(1, stubOpen.callCount, 'Should not emit open twice');

      console.warn = originalWarningFn;
      done();
    });
  });

  it('should connection reopen without warn', function(done) {
    var originalWarningFn = console.warn;
    console.warn = sinon.stub();

    var transport = new lfr.WebSocketTransport('http://liferay.com');
    transport.close();

    var stubClose = sinon.stub();
    var stubOpen = sinon.stub();
    transport.on('close', stubClose);
    transport.on('open', stubOpen);

    transport.open();
    assert.strictEqual(0, stubOpen.callCount, 'Should open be asynchronous');
    transport.once('open', function() {
      assert.strictEqual(1, stubOpen.callCount);
      transport.close();
      assert.strictEqual(0, stubClose.callCount, 'Should close be asynchronous');
      transport.once('close', function() {
        assert.strictEqual(1, stubClose.callCount);
        transport.open();
        assert.strictEqual(1, stubOpen.callCount, 'Should open be asynchronous');
        transport.once('open', function() {
          assert.strictEqual(2, stubOpen.callCount, 'Should emit open twice');
          assert.strictEqual(1, stubClose.callCount, 'Should not emit close twice');
          assert.strictEqual(0, console.warn.callCount, 'Should warn when open');

          console.warn = originalWarningFn;
          done();
        });
      });
    });
  });

  it('should handle successful send message', function(done) {
    var transport = new lfr.WebSocketTransport('http://liferay.com');
    transport.open();
    transport.on('open', function() {
      transport.on('message', function(data) {
        assert.strictEqual('message', data, 'Should set request message');
        done();
      });
      transport.send('message');
    });
  });

  it('should handle successful receive data', function(done) {
    var transport = new lfr.WebSocketTransport('http://liferay.com');
    var stubData = sinon.stub();
    transport.on('data', stubData);
    transport.open();
    transport.on('open', function() {
      transport.socket.on('data', function() {
        assert.strictEqual('data', stubData.getCall(0).args[0], 'Should receive emitted data');
        done();
      });
      transport.socket.emit('data', 'data');
    });
  });

  it('should handle failing send data', function(done) {
    var transport = new lfr.WebSocketTransport('http://liferay.com');
    var stubError = sinon.stub();
    transport.on('error', stubError);
    transport.open();
    transport.on('open', function() {
      transport.send();
      transport.socket.on('error', function() {
        var error = stubError.getCall(0).args[0].error;
        assert.ok(error instanceof Error);
        assert.ok(error.socket instanceof global.FakeSocketIO);
        assert.strictEqual('reason', error.message);
        done();
      });
      transport.socket.emit('error', 'reason');
    });
  });

  it('should abort requests when disposed', function(done) {
    var transport = new lfr.WebSocketTransport('http://liferay.com');
    transport.open();
    transport.on('open', function() {
      transport.send();
      transport.dispose();
      transport.on('close', function() {
        done();
      });
    });
  });
});