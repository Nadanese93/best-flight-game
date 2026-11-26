// Keyboard and mouse input for Meridian Courier.
// Arrow keys / WASD fly the plane; the mouse steers gently when moved
// off-centre, and a click adds a short burst of throttle.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseActive = false;
    this.mouseDown = false;
    this.pressed = new Set();
    this.canvas = canvas;
    this.onPause = null;
    this.onRestart = null;
    this.onCamera = null;
    this.onMute = null;
    this.onConfirm = null;
    this.onMission = null;
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width - 0.5;
      this.mouseY = (e.clientY - rect.top) / rect.height - 0.5;
      this.mouseActive = true;
    });
    canvas.addEventListener('mousedown', () => {
      this.mouseDown = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouseActive = false;
    });
  }

  handleKey(e, down) {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }
    if (down) {
      if (!this.keys.has(code)) this.pressed.add(code);
      this.keys.add(code);
      if (code === 'KeyP' && this.onPause) this.onPause();
      if (code === 'KeyR' && this.onRestart) this.onRestart();
      if (code === 'KeyC' && this.onCamera) this.onCamera();
      if (code === 'KeyM' && this.onMute) this.onMute();
      if (code === 'Enter' && this.onConfirm) this.onConfirm();
      if (code === 'Digit1' && this.onMission) this.onMission(0);
      if (code === 'Digit2' && this.onMission) this.onMission(1);
      if (code === 'Digit3' && this.onMission) this.onMission(2);
    } else {
      this.keys.delete(code);
    }
  }

  consumePressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  endFrame() {
    this.pressed.clear();
  }

  // A snapshot the physics step reads each frame.
  state() {
    const k = this.keys;
    const steer = this.mouseActive && Math.abs(this.mouseX) > 0.08
      ? Math.max(-1, Math.min(1, this.mouseX * 2.2)) : 0;
    const pitch = this.mouseActive && Math.abs(this.mouseY) > 0.08
      ? Math.max(-1, Math.min(1, this.mouseY * 2.2)) : 0;
    return {
      up: k.has('KeyW') || k.has('ArrowUp'),
      down: k.has('KeyS') || k.has('ArrowDown'),
      left: k.has('KeyA') || k.has('ArrowLeft'),
      right: k.has('KeyD') || k.has('ArrowRight'),
      throttleUp: k.has('ShiftLeft') || k.has('ShiftRight') || k.has('Equal'),
      throttleDown: k.has('ControlLeft') || k.has('ControlRight') || k.has('Minus'),
      brake: k.has('Space'),
      boost: this.mouseDown,
      mouseSteer: steer,
      mousePitch: pitch,
    };
  }
}
