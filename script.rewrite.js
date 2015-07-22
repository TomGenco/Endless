function Endless() {
  var canvas, ctx, centerX = 0, centerY = 0, playing = false, menuObjects = [], fadeInMenu = true, menuObjectTransitionGroup = null, animateDots = true, dotAnimation = null, dotAnimationGroup = null, backgroundColor = "", colors = 6, hueShift = 70, dotSize = 20, rows = 20, cols = 30, dots = [];
  window.showMenu = true;

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

    // background hue is set to some random number, then will slowly move its
    // way along the spectrum
    var randomInitialHue = Math.floor(Math.random() * 360);
    backgroundChangingColor = new Transition(randomInitialHue, randomInitialHue + 360, 9e5);

    // Menu object positions are described by a percentage of the canvas size
    // plus any pixel offset. e.g. MenuObject(0.5, 0.5, 0, 0, ...) is in the
    // middle of the canvas, and MenuObject(1, 1, -50, -50, ...) is 50 pixels
    // from the bottom, and 50 pixels from the right.
    // This is done so the actual x and y can adjust to varying screen sizes.
    menuObjects = [
      new MenuObject(0.5, 0.25, 0, 0, "Endless", 128),
      new MenuObject(0.5, 0.25, 118, 72, "By Tom Genco", 32),
      new MenuObject(0.5, 0.75, 0, 0, "Play", 64, 140, 80, function() { play(); }),
      new MenuObject(0, 1, 70, -20, "tomgenco.com", 16, 120, 20, function() {
        window.location.href = "http://tomgenco.com/";
      })
    ];
    if (fadeInMenu) {
      // Transitions are cool too, and are constructed with a start value, end
      // value, duration, and optionally a delay. the current value is returned
      // by .getVal() and starts on .start().
      menuObjectTransitionGroup = new TransitionGroup([
        new Transition(0, 1, 2000),
        new Transition(0, 1, 2000),
        new Transition(0, 1, 1000),
        new Transition(0, .75, 4000, 4000)
      ]);
    }

    if (animateDots)
      dotAnimationGroup = new TransitionGroup([]);

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
    if (!playing) {
      var inARange = false;
      for (var i = 0; i < menuObjects.length; i++)
        if (menuObjects[i].width && menuObjects[i].height && menuObjects[i].inRange(posX, posY)) {
          canvas.style.cursor = "pointer";
          inARange = true;
        }
      if (!inARange)
        canvas.removeAttribute("style");
    }
  }

  function handleMouseDown(posX, posY) {
    if (!playing)
      for (var i = 0; i < menuObjects.length; i++)
        if (menuObjects[i].width && menuObjects[i].height && menuObjects[i].inRange(posX, posY)) {
          menuObjects[i].click();
        }
  }

  function handleMouseUp(posX, posY) {
    canvas.removeAttribute("style");
  }

  // Sets the canvas element's height and width to that of the window's
  function updateCanvasSize() {
    canvas.setAttribute("width", window.innerWidth);
    canvas.setAttribute("height", window.innerHeight);

    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }

  function play() {
    generateDots();
    playing = true;
  }

  function generateDots() {
    var gridwidth = cols * dotSize * 2 - dotSize;
    var gridheight = rows * dotSize * 2 - dotSize;

    for (var col = 0; col < cols; col++) {
      dots[col] = [];
      for (var row = 0; row < rows; row++) {
        dots[col][row] = new Dot(
          (Math.floor(Math.random() * colors) * (360 / colors) + hueShift) % 360,
          col, row,
          (centerX - gridwidth / 2) + (col * dotSize * 2),
          (centerY - gridheight / 2) + (row * dotSize * 2));
        if (animateDots)
          dotAnimationGroup.transitions[col * rows + rows - row - 1] =
            new Transition((dots[col][row].y - centerY - gridheight / 2) * 5, dots[col][row].y, 200);
      }
    }

  }
  // Calls each drawing function every frame, if needed.
  function draw() {
    drawBackground();
    if (playing)
      drawDots();
    else
      drawMenuObjects();

    requestAnimationFrame(draw);
  }

  // Fills the canvas with whatever backgroundColor is set to
  function drawBackground() {
    if (!backgroundChangingColor.started || backgroundChangingColor.finished)
      backgroundChangingColor.start();
    ctx.fillStyle = "hsl(" + backgroundChangingColor.getVal() % 360 + ", 50%, 25%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawDots() {
    if (playing) {
      if (animateDots) {
        if (!dotAnimationGroup.started)
          dotAnimationGroup.start("delay", 5);
        if (!dotAnimationGroup.allFinished())
          for (var i = 0; i < dots.length; i++)
            for (var j = 0; j < dots[i].length; j++)
              dots[i][j].y = dotAnimationGroup.transitions[i * rows + j].getVal();
        else {
          // HACK - For some reason a TransitionGroup reports allFinished before
          // the last transition's getVal returns endVal, so this grabs endVal
          // one last time for each dot
          for (var i = 0; i < dots.length; i++)
            for (var j = 0; j < dots[i].length; j++)
              dots[i][j].y = dotAnimationGroup.transitions[i * rows + j].endVal;
          animateDots = false;
        }
      }
      for (var i = 0; i < dots.length; i++)
        for (var j = 0; j < dots[i].length; j++)
          dots[i][j].draw();
    }
  }

  function drawMenuObjects() {
    if (showMenu) {
      if (fadeInMenu) {
        if (!menuObjectTransitionGroup.started)
          menuObjectTransitionGroup.start("delay", 750);
        if (!menuObjectTransitionGroup.allFinished())
          for (var i = 0; i < menuObjectTransitionGroup.transitions.length; i++)
            menuObjects[i].opacity = menuObjectTransitionGroup.transitions[i].getVal();
      }
      for (var i = 0; i < menuObjects.length; i++)
        menuObjects[i].draw();
    }
  }

  Dot = function (color, column, row, x, y) {
    this.color = color || 0;
    this.col = column;
    this.row = row;
    this.x = x;
    this.y = y;

    this.draw = function () {
      ctx.fillStyle = "hsl(" + this.color + ", 100%, 50%)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, dotSize / 2, 0, Math.PI * 2, false);
      ctx.fill();
    }
  }

  MenuObject = function(relativeX, relativeY, fixedOffsetX, fixedOffsetY,
      text, fontSize, width, height, click) {
    this.relativeX = relativeX;
    this.relativeY = relativeY;
    this.fixedOffsetX = fixedOffsetX;
    this.fixedOffsetY = fixedOffsetY;
    this.text = text;
    this.fontSize = fontSize;
    this.width = width;
    this.height = height;
    this.click = click;
    this.opacity = 1;

    this.inRange = function(mousePosX, mousePosY) {
      if (mousePosX > (canvas.width * relativeX + fixedOffsetX) - this.width / 2 &&
          mousePosX < (canvas.width * relativeX + fixedOffsetX) + this.width / 2 &&
          mousePosY > (canvas.height * relativeY + fixedOffsetY) - this.height / 2 &&
          mousePosY < (canvas.height * relativeY + fixedOffsetY) + this.height / 2)
        return true;
      return false;
    };

    this.draw = function() {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = this.fontSize + "px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, " + this.opacity + ")";
      ctx.lineWidth = this.fontSize / 14 + 3;
      ctx.strokeStyle = "rgba(0, 0, 0, " + this.opacity + ")";
      ctx.strokeText(this.text, canvas.width * relativeX + fixedOffsetX, canvas.height * relativeY + fixedOffsetY);
      ctx.fillText(this.text, canvas.width * relativeX + fixedOffsetX, canvas.height * relativeY + fixedOffsetY);
    };
  }

  Transition = function(startVal, endVal, duration, delay) {
    this.startVal = startVal === undefined ? 0 : startVal;
    this.endVal = endVal === undefined ? 100 : endVal;
    this.duration = duration || 1000;
    this.delay = delay === undefined ? 200 : delay;
    this.finished = false;
    this.started = false;
    var initTime, delta;

    this.start = function() {
      this.started = true;
      this.finished = false;
      var that = this;
      setTimeout(function () { that.finished = true; }, that.delay + that.duration);
      initTime = Date.now();
    };

    this.getVal = function() {
      if (this.finished)
        return this.endVal;
      else if (!this.started)
        return this.startVal;
      else {
        delta = Date.now() - this.delay - initTime;
        return delta < 0 ? this.startVal : delta / this.duration * (this.endVal - this.startVal) + this.startVal;
      }
    };
  };

  TransitionGroup = function(transitions) {
    this.transitions = transitions;
    this.started = false;

    this.start = function(mode, delay) {
      this.started = true;
      delay = delay === undefined ? 100 : delay;
      switch (mode) {
        // Run all the transitions at the same time
        case "parallel":
          for (var i = 0; i < this.transitions.length; i++) {
            this.transitions[i].start();
          }
          break;
        // Wait so many milliseconds before starting each transition
        case "delay":
          for (var i = 0; i < this.transitions.length; i++) {
            this.transitions[i].delay += (delay * i);
            this.transitions[i].start();
          }
          break;
        // Wait until the previous transition ends
        default: case "series":
          for (var i = 0; i < this.transitions.length; i++) {
            if (i > 0)
              this.transitions[i].delay += (this.transitions[i-1].duration) + (this.transitions[i-1].delay);
            this.transitions[i].start();
          }
          break;
      }
    };

    this.allFinished = function() {
      return this.transitions[this.transitions.length - 1].finished;
    }
  };

  setup();
}

window.onload = Endless;
