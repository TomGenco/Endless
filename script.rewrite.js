function Endless() {
  var canvas, ctx, centerX = 0, centerY = 0, hideTitle = false, playing = false; menuObjects = [], titleAnimation = true, menuAnimationGroup = null, backgroundColor = "blue";

  function setup() {
    setupGraphics();
    setupEventListeners();
  }

  // Grabs canvas element and context, sets canvas to to size of the
  // window, and begins the drawing loop.
  function setupGraphics() {
    canvas = document.getElementsByTagName("canvas")[0];
    ctx = canvas.getContext("2d");
    updateCanvasSize();

    menuObjects = [
      new MenuObject(0.5, 0.25, 0, 0, "Endless", 128),
      new MenuObject(0.5, 0.25, 118, 64, "By Tom Genco", 32),
      new MenuObject(0.5, 0.75, 0, 0, "Play", 48),
    ];
    menuAnimationGroup = new AnimationGroup([
      new Animation(0, 1, 2000),
      new Animation(0, 1, 2000),
      new Animation(0, 1, 1000)
    ]);

    menuAnimationGroup.start("delay", 500);
    requestAnimationFrame(draw);
  }

  // Attaches all of the event handlers to their events.
  function setupEventListeners() {
    canvas.onmousemove = function(e) { handleMouseMove(e.clientX, e.clientY) };
    canvas.onmousedown = function(e) { handleMouseDown(e.clientX, e.clientY) };
    canvas.onmouseup = function(e) { handleMouseUp(e.clientX, e.clientY) };
    canvas.onblur = function(e) { handleMouseUp(e.clientX, e.clientY) };
    window.onresize = updateCanvasSize;
  }

  function handleMouseMove(posX, posY) {
    // body...
  }

  function handleMouseDown(posX, posY) {
    // body...
  }

  function handleMouseUp(posX, posY) {

  }

  // Sets the canvas element's height and width to that of the window's
  function updateCanvasSize() {
    canvas.setAttribute("width", window.innerWidth);
    canvas.setAttribute("height", window.innerHeight);

    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }

  // Calls each drawing function every frame, if needed.
  function draw() {
    drawBackground();
    for (var i = 0; i < menuAnimationGroup.animations.length; i++)
      menuObjects[i].opacity = menuAnimationGroup.animations[i].getVal();
    for (var i = 0; i < menuObjects.length; i++) {
      menuObjects[i].draw();
    }
    requestAnimationFrame(draw);
  }

  // Fills the canvas with whatever backgroundColor is set to
  function drawBackground() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // This is really fucking clunky but pretty self explanatory I think
  MenuObject = function(relativeX, relativeY, fixedOffsetX, fixedOffsetY,
      text, fontSize, width, height, opacity, clickable) {
    this.relativeX = relativeX;
    this.relativeY = relativeY;
    this.fixedOffsetX = fixedOffsetX;
    this.fixedOffsetY = fixedOffsetY;
    this.text = text;
    this.fontSize = fontSize;
    this.width = width;
    this.height = height;
    this.opacity = opacity === undefined ? 1 : opacity;
    this.clickable = clickable === undefined ? false : clickable;

    this.inRange = function(mousePosX, mousePosY) {
      if (mousePosX > this.posX - this.width / 2 &&
          mousePosX < this.posX + this.width / 2 &&
          mousePosY > this.posY - this.height / 2 &&
          mousePosY < this.posX + this.height / 2)
        return true;
      return false;
    };

    this.draw = function () {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = this.fontSize + "px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, " + this.opacity + ")";
      ctx.lineWidth = this.fontSize / 16 + 4;
      ctx.strokeStyle = "rgba(0, 0, 0, " + this.opacity + ")";
      ctx.strokeText(this.text, canvas.width * relativeX + fixedOffsetX, canvas.height * relativeY + fixedOffsetY);
      ctx.fillText(this.text, canvas.width * relativeX + fixedOffsetX, canvas.height * relativeY + fixedOffsetY);
    };
  }

  Animation = function(startVal, endVal, duration, delay) {
    this.startVal = startVal === undefined ? 0 : startVal;
    this.endVal = endVal === undefined ? 100 : endVal;
    this.duration = duration || 1000;
    this.delay = delay === undefined ? 200 : delay;
    var initTime, delta, started = false, finished = false;

    this.start = function() {
      started = true;
      initTime = Date.now();
    };

    this.getVal = function () {
      if (finished)
        return this.endVal;
      else if (!started)
        return this.startVal;
      else {
        delta = Date.now() - this.delay - initTime;
        if (delta > this.duration) {
          started = false;
          finished = true;
          return this.endVal;
        } else
          return delta < 0 ? 0 : delta / this.duration * (this.endVal - this.startVal) + this.startVal;
      }
    };
  };

  AnimationGroup = function(animations) {
    this.animations = animations;

    this.start = function(mode, delay) {
      switch (mode) {
        // Run all the animations at the same time
        case "parallel":
          for (var i = 0; i < animations.length; i++) {
            animations[i].start();
          }
          break;
        // Wait so many milliseconds before starting each animation
        case "delay":
          for (var i = 0; i < animations.length; i++) {
            animations[i].delay += (delay * i);
            animations[i].start();
          }
          break;
        // Wait until the previous animation ends
        default: case "series":
          for (var i = 0; i < animations.length; i++) {
            if (i > 0)
              animations[i].delay += (animations[i-1].duration) + (animations[i-1].delay);
            animations[i].start();
          }
          break;
      }
    };
  };

  setup();
}

window.onload = Endless;
