function Endless() {
  "use strict";

  this.Settings = {
    Default: { acid: false, animateDots: true, animateMenuObjects: true, backgroundColor: "rainbow", columns: 10, dotAnimationTime: 1000, dotAnimationType: "logistic", dotColors: 10, dotSize: 40, hueShift: 70, rows: 10 }
  };

  var backgroundChangingColor, bottomMenu, canvas, centerX, centerY, ctx, dotAnimationGroup, dots = [], gridHeight, gridWidth, inGameMenu, mainMenu, menuObjectGroups, playing, showOverlay;

  function setup() {
    for (var prop in Settings.Default) {
      Settings[prop] = Settings.Default[prop];
    }

    setupGraphics();
    setupEventListeners();
  }

  // Grabs canvas element and context, sets canvas to to size of the
  // window, and begins the drawing loop.
  function setupGraphics() {
    canvas = document.getElementsByTagName("canvas")[0];
    ctx = canvas.getContext("2d");
    updateCanvasSize();

    // Background hue is set to some random number, then will slowly move its
    // way along the spectrum
    if (Settings.backgroundColor == "rainbow") {
      var randomInitialHue = Math.floor(Math.random() * 360);
      backgroundChangingColor = new Transition(randomInitialHue, randomInitialHue + 360, 9e5);
    }

    // Menu object positions are described by a percentage of the canvas size
    // plus any pixel offset. e.g. MenuObject(0.5, 0.5, 0, 0, ...) is in the
    // middle of the canvas, and MenuObject(1, 1, -50, -50, ...) is 50 pixels
    // from the bottom, and 50 pixels from the right.
    // This is done so the actual x and y can adjust to varying screen sizes.
    mainMenu = new MenuObjectGroup([
      new MenuObject(0.5, 0.25, 0, 0, "Endless", 256),
      new MenuObject(0.5, 0.25, 200, 130, "By Tom Genco", 64),
      new MenuObject(0.5, 0.75, 0, 0, "Play", 128, 280, 150, play)
    ], true);

    bottomMenu = new MenuObjectGroup([
      new MenuObject(0, 1, 5, -5, "tomgenco.com", 32, 220, 40, function() {
        window.location.href = "http://tomgenco.com/";
      })
    ], true);
    bottomMenu.menuObjects[0].align = "left", bottomMenu.menuObjects[0].baseline = "bottom";

    inGameMenu = new MenuObjectGroup([
      new MenuObject(0, 0, 15, 5, "Menu", 64, 170, 70, showMenu),
      new MenuObject(1, 0, -15, 5, "Score: 0", 64)
    ], false);
    inGameMenu.menuObjects[0].align = "left", inGameMenu.menuObjects[0].baseline = "top";
    inGameMenu.menuObjects[1].align = "right", inGameMenu.menuObjects[1].baseline = "top";

    if (Settings.animateMenuObjects) {
      mainMenu.transitionGroup = new TransitionGroup([
        new Transition(0, 1, 2000),
        new Transition(0, 1, 2000),
        new Transition(0, 1, 1000)
      ], "delay", 750, "opacity");

      bottomMenu.transitionGroup = new TransitionGroup([
        new Transition(0, 1, 2000, 2000)
      ], "parallel", 0, "opacity");

      inGameMenu.transitionGroup = new TransitionGroup([
        new Transition(-100, inGameMenu.menuObjects[0].fixedOffsetY, 1000, Settings.animateDots ? 500 : 0, "logistic"),
        new Transition(-100, inGameMenu.menuObjects[1].fixedOffsetY, 1000, Settings.animateDots ? 600 : 100, "logistic")
      ], "parallel", 0, "fixedOffsetY");
    }

    menuObjectGroups = [mainMenu, bottomMenu, inGameMenu];

    if (Settings.animateDots)
      dotAnimationGroup = new TransitionGroup([], "delay", 2);

    gridWidth = Settings.columns * Settings.dotSize * 2 - Settings.dotSize;
    gridHeight = Settings.rows * Settings.dotSize * 2 - Settings.dotSize;

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
    var inARange = false;

    for (var i = 0; i < menuObjectGroups.length; i++)
      for (var j = 0; j < menuObjectGroups[i].menuObjects.length; j++)
        if (menuObjectGroups[i].visibility && menuObjectGroups[i].menuObjects[j].onClick &&
            menuObjectGroups[i].menuObjects[j].inRange(posX, posY))
          inARange = true;

    if (inARange || (playing && !mainMenu.visible &&
        posX > centerX - gridWidth / 2 && posX < centerX + gridWidth / 2 &&
        posY > centerY - gridHeight / 2 && posY < centerY + gridHeight / 2 &&
        (posX - centerX + gridWidth / 2) / Settings.dotSize % 2 <= 1 &&
        (posY - centerY + gridHeight / 2) / Settings.dotSize % 2 <= 1))
      canvas.style.cursor = "pointer";
    else
      canvas.removeAttribute("style");
  }

  function handleMouseDown(posX, posY) {
    for (var i = 0; i < menuObjectGroups.length; i++)
      for (var j = 0; j < menuObjectGroups[i].menuObjects.length; j++)
        if (menuObjectGroups[i].visibility && menuObjectGroups[i].menuObjects[j].onClick &&
            menuObjectGroups[i].menuObjects[j].inRange(posX, posY))
          menuObjectGroups[i].menuObjects[j].onClick();
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
    if (!playing) {
      generateDots();
      playing = true;
      inGameMenu.visibility = true;
    }
    showOverlay = false;
    mainMenu.visibility = false;
  }

  function showMenu() {
    showOverlay = true;
    mainMenu.visibility = true;
  }

  function generateDots() {
    for (var col = 0; col < Settings.columns; col++) {
      dots[col] = [];
      for (var row = 0; row < Settings.rows; row++) {
        dots[col][row] = new Dot(
          (Math.floor(Math.random() * Settings.dotColors) * (360 / Settings.dotColors) + Settings.hueShift) % 360,
          col, row,
          (centerX - gridWidth / 2 + Settings.dotSize / 2) + (col * Settings.dotSize * 2) - centerX,
          (centerY - gridHeight / 2 + Settings.dotSize / 2) + (row * Settings.dotSize * 2) - centerY);
        if (Settings.animateDots)
          dotAnimationGroup.transitions[col * Settings.rows + Settings.rows - row - 1] =
            new Transition(dots[col][row].y - centerY - gridHeight / 2 - Settings.dotSize / 2, dots[col][row].y, Settings.dotAnimationTime, 0, Settings.dotAnimationType);
      }
    }
  }

  // Calls each drawing function every frame, if needed.
  function draw() {
    drawBackground();

    if (playing)
      drawDots();

    for (var i = 0; i < menuObjectGroups.length; i++)
      if (menuObjectGroups[i].visibility) {
        if (showOverlay && menuObjectGroups[i] == mainMenu)
          drawOverlay();
        menuObjectGroups[i].draw();
      }

    requestAnimationFrame(draw);
  }

  // Fills the canvas with whatever backgroundColor is set to
  function drawBackground() {
    if (Settings.acid)
      ctx.globalAlpha = 0.09;
    if (Settings.backgroundColor == "rainbow") {
      if (!backgroundChangingColor.started || backgroundChangingColor.finished)
        backgroundChangingColor.start();
      ctx.fillStyle = "hsl(" + backgroundChangingColor.getVal() % 360 + ", 50%, 25%)";
    } else {
      ctx.fillStyle = Settings.backgroundColor;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (Settings.acid)
      ctx.globalAlpha = 1;
  }

  function drawOverlay() {
    ctx.fillStyle = "rgba(0,0,0,.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Updates each dot's position if it's still animating, and tells them to draw
  function drawDots() {
    if (playing) {
      if (!Settings.animateDots || dotAnimationGroup.allFinished())
        for (var i = 0; i < dots.length; i++)
          for (var j = 0; j < dots[i].length; j++)
            dots[i][j].draw();
      else {
        if (!dotAnimationGroup.started)
          dotAnimationGroup.start();
        for (var i = 0; i < dots.length; i++)
          for (var j = 0; j < dots[i].length; j++) {
            dots[i][j].y = dotAnimationGroup.transitions[i * Settings.rows + j].getVal();
            dots[i][j].draw();
          }
      }
    }
  }

  var Dot = function (color, column, row, x, y) {
    this.color = color || 0;
    this.col = column;
    this.row = row;
    this.x = x;
    this.y = y;

    this.draw = function () {
      ctx.fillStyle = "hsl(" + this.color + ", 100%, 50%)";
      ctx.beginPath();
      ctx.arc(this.x + centerX, this.y + centerY, Settings.dotSize / 2, 0, Math.PI * 2, false);
      ctx.fill();
    }
  }

  var MenuObject = function(relativeX, relativeY, fixedOffsetX, fixedOffsetY,
      text, fontSize, width, height, onClick) {
    this.relativeX = relativeX;
    this.relativeY = relativeY;
    this.fixedOffsetX = fixedOffsetX;
    this.fixedOffsetY = fixedOffsetY;
    this.text = text;
    this.fontSize = fontSize;
    this.width = width;
    this.height = height;
    this.onClick = onClick;
    this.align = "center";
    this.baseline = "middle";
    this.opacity = 1;

    this.inRange = function(mousePosX, mousePosY) {
      // TODO: Simplify this somehow

      var realX = (canvas.width * relativeX + fixedOffsetX),
          realY = (canvas.height * relativeY + fixedOffsetY);
      switch (this.align) {
        default: console.error("invalid align for MenuObject " + this.text + ", using center");
        case "center":
          switch (this.baseline) {
            default: console.error("invalid baseline for MenuObject " + this.text + ", using middle");
            case "middle":
              if (mousePosX > realX - this.width / 2 && mousePosX < realX + this.width / 2 &&
                  mousePosY > realY - this.height / 2 && mousePosY < realY + this.height / 2)
                return true;
              return false;
            case "bottom":
              if (mousePosX > realX - this.width / 2 && mousePosX < realX + this.width / 2 &&
                  mousePosY > realY - this.height && mousePosY < realY)
                return true;
              return false;
            case "top":
              if (mousePosX > realX - this.width / 2 && mousePosX < realX + this.width / 2 &&
                  mousePosY > realY && mousePosY < realY + this.height)
                return true;
              return false;
          }
        case "left":
          switch (this.baseline) {
            default: console.error("invalid baseline for MenuObject " + this.text + ", using middle");
            case "middle":
              if (mousePosX > realX && mousePosX < realX + this.width &&
                  mousePosY > realY - this.height / 2 && mousePosY < realY + this.height / 2)
                return true;
              return false;
            case "bottom":
              if (mousePosX > realX && mousePosX < realX + this.width &&
                  mousePosY > realY - this.height && mousePosY < realY)
                return true;
              return false;
            case "top":
              if (mousePosX > realX && mousePosX < realX + this.width &&
                  mousePosY > realY && mousePosY < realY + this.height)
                return true;
              return false;
          }
        case "right":
          switch (this.baseline) {
            default: console.error("invalid baseline for MenuObject " + this.text + ", using middle");
            case "middle":
              if (mousePosX > realX - this.width && mousePosX < realX &&
                  mousePosY > realY - this.height / 2 && mousePosY < realY + this.height / 2)
                return true;
              return false;
            case "bottom":
              if (mousePosX > realX - this.width && mousePosX < realX &&
                  mousePosY > realY - this.height && mousePosY < realY)
                return true;
              return false;
            case "top":
              if (mousePosX > realX - this.width && mousePosX < realX &&
                  mousePosY > realY && mousePosY < realY + this.height)
                return true;
              return false;
          }
      }
    };

    this.draw = function() {
      ctx.textAlign = this.align;
      ctx.textBaseline = this.baseline;
      ctx.font = this.fontSize + "px sans-serif";
      ctx.lineJoin = "round";
      ctx.fillStyle = "rgba(255, 255, 255, " + this.opacity + ")";
      ctx.lineWidth = this.fontSize / 12 + 3;
      ctx.strokeStyle = "rgba(0, 0, 0, " + this.opacity + ")";
      ctx.strokeText(this.text, canvas.width * this.relativeX + this.fixedOffsetX, canvas.height * this.relativeY + this.fixedOffsetY);
      ctx.fillText(this.text, canvas.width * this.relativeX + this.fixedOffsetX, canvas.height * this.relativeY + this.fixedOffsetY);
    };
  }

  var MenuObjectGroup = function(menuObjects, visibility) {
    this.menuObjects = menuObjects;
    this.visibility = visibility;
    this.transitionGroup = null;

    this.draw = function() {
      if (Settings.animateMenuObjects) {
        if (!this.transitionGroup.started)
          this.transitionGroup.start();
        if (!this.draw.finishedTransition) {
          for (var i = 0; i < this.transitionGroup.transitions.length; i++)
            this.menuObjects[i][this.transitionGroup.property] = this.transitionGroup.transitions[i].getVal();
          if (this.transitionGroup.allFinished())
            this.draw.finishedTransition = true;
        }
      }
      for (var i = 0; i < this.menuObjects.length; i++)
        this.menuObjects[i].draw();
    }
  }

  var Transition = function(startVal, endVal, duration, delay, motionType) {
    this.startVal = startVal === undefined ? 0 : startVal;
    this.endVal = endVal === undefined ? 100 : endVal;
    this.duration = duration || 1000;
    this.delay = delay === undefined ? 200 : delay;
    this.motionType = motionType === undefined ? "linear" : motionType;
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
      var value;
      if (this.finished)
        return this.endVal;
      else if (!this.started)
        return this.startVal;
      else {
        delta = Date.now() - this.delay - initTime;
        if (delta < 0)
          return this.startVal;

        switch (this.motionType) {
          default:
            console.error("Should be unreachable");
          case "linear":
            value = ((delta + 5 / this.duration + 100) / this.duration) * (this.endVal - this.startVal) + this.startVal;
            return value > endVal ? endVal : value;
          case "logistic":
            return  (1 / (1 + Math.pow(Math.E, -10 * (2 * (delta / this.duration) - 1)))) * (this.endVal - this.startVal) + this.startVal;
        }
      }
    };
  };

  var TransitionGroup = function(transitions, mode, delay, property) {
    this.transitions = transitions;
    this.started = false;
    this.property = property;

    this.start = function() {
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
