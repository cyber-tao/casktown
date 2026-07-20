class Spector {
  constructor() {
    this.onCapture = { add() {} }
  }

  captureCanvas() {}
  captureNextFrame() {}
  getFps() {
    return 0
  }

  log() {}
  startCapture() {}
  stopCapture() {}
}

module.exports = { Spector }
