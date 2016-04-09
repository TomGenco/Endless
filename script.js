"use strict";

function Endless() {
  var backgroundChangingColor, bottomMenu, canvas, centerX, centerY, ctx, Dot, dotAnimationsAreDone = false, dotMouseover, dots = [], dotSelection = [], gridHeight, gridWidth, inGameMenu, mainMenu, MenuObject, MenuObjectGroup, menuObjectMouseover, menuObjectGroups, mousePosX, mousePosY, playing, score = 0, selectingDots = false, Setting, showOverlay, supportsStorage, Transition;

  // nifty Settings object
  Setting = function(defaultVal, onSet) {
    this._onSet = onSet;
    this._value = defaultVal;
    this.defaultVal = defaultVal;
  };

  Object.defineProperty(Setting.prototype, "val", {
    get: function() {
      return this._value;
    },
    set: function(newVal) {
      this._value = newVal;
      if (this._onSet != null)
        this._onSet();
    }
  });

  this.Settings = {
    acid: new Setting(false),
    animateDots: new Setting(true),
    animateMenuObjects: new Setting(true),
    backgroundColor: new Setting("rainbow"),
    columns: new Setting(6, function () {
      updateGridDimensions();
      if (playing)
        generateDots();
    }),
    dotAnimationTime: new Setting(300),
    dotAnimationType: new Setting("logistic"),
    dotColors: new Setting(6, function () {
      if (playing)
        generateDots();
    }),
    dotSize: new Setting(70, function () {
      if (playing) {
        updateGridDimensions();
        for (var i = 0; i < dots.length; i++)
          for (var j = 0; j < dots[i].length; j++) {
            dots[i][j].x = (centerX - gridWidth / 2 + Settings.dotSize.val / 2) + (i * Settings.dotSize.val * 2) - centerX;
            dots[i][j].y = (centerY - gridHeight / 2 + Settings.dotSize.val / 2) + (j * Settings.dotSize.val * 2) - centerY;
          }
      }
    }),
    hueShift: new Setting(70),
    rows: new Setting(6, function () {
      updateGridDimensions();
      if (playing)
        generateDots();
    })
  };

  Dot = function(color, column, row, x, y) {
    this.color = color;
    this.col = column;
    this.row = row;
    this.x = x;
    this.y = y;
    this.opacity = 1;
    this.transitions = [];
    this.selected = false;

    this.draw = function() {
      for (var i = 0; i < this.transitions.length; i++) {
        if (!this.transitions[i].started)
          this.transitions[i].start();
        if (this.transitions[i].started && !this.draw["finished" + this.transitions[i].property]) {
          this[this.transitions[i].property] = this.transitions[i].value;
          if (this.transitions[i].finished)
            this.draw["finished" + this.transitions[i].property] = true;
        }
      }

      ctx.fillStyle = "hsla(" + this.color + ", 100%, 50%," + this.opacity + ")";
      ctx.beginPath();
      ctx.shadowColor = "rgba(0,0,0,0)";
      ctx.arc(this.x + centerX, this.y + centerY, Settings.dotSize.val / 2, 0, Math.PI * 2, false);
      ctx.fill();
    };
  }

  MenuObject = function(relativeX, relativeY, fixedOffsetX, fixedOffsetY,
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
    this.align = this.relativeX == 0 ? "left" : this.relativeX == 1 ? "right" : "center";
    this.baseline = this.relativeY == 0 ? "top" : this.relativeY == 1 ? "bottom" : "middle";
    this.opacity = 1;
    this.transitions = [];

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
      if (Settings.animateMenuObjects.val)
        for (var i = 0; i < this.transitions.length; i++)
          if (this.transitions[i].started && !this.draw["finished" + this.transitions[i].property]) {
            this[this.transitions[i].property] = this.transitions[i].value;
            if (this.transitions[i].finished)
              this.draw["finished" + this.transitions[i].property] = true;
          }

      var blur = this.fontSize / 32 + 2;
      ctx.textAlign = this.align;
      ctx.textBaseline = this.baseline;
      ctx.font = (this.fontSize >= 64 ? "100 " : "300 ") + this.fontSize + "px Josefin Sans";
      ctx.shadowColor = "black";
      ctx.shadowOffsetY = blur;
      ctx.shadowOffsetX = blur;
      ctx.shadowBlur = blur;
      ctx.fillStyle = "rgba(255, 255, 255, " + this.opacity + ")";
      ctx.fillText(this.text, canvas.width * this.relativeX + this.fixedOffsetX, canvas.height * this.relativeY + this.fixedOffsetY);
    };
  }

  MenuObjectGroup = function(menuObjects, visibility) {
    this.menuObjects = menuObjects;
    this.visibility = visibility;

    this.draw = function() {
      for (var i = 0; i < this.menuObjects.length; i++)
        this.menuObjects[i].draw();
    }

    this.startTransitions = function() {
      for (var i = 0; i < menuObjects.length; i++)
        for (var j = 0; j < menuObjects[i].transitions.length; j++)
          menuObjects[i].transitions[j].start();
    };
  }

  Transition = function(startVal, endVal, duration, delay, property, motionType, callback) {
    this.startVal = startVal === undefined ? 0 : startVal;
    this.endVal = endVal === undefined ? 100 : endVal;
    this.duration = duration || 1000;
    this.delay = delay === undefined ? 200 : delay;
    this.property = property === undefined ? "opacity" : property;
    this.motionType = motionType === undefined ? "linear" : motionType;
    this.finished = false;
    this.started = false;
    this.initTime = null;
    this.delta = null;
    this.distance = this.endVal - this.startVal;
    this.callback = callback;

    this.start = function() {
      this.started = true;
      this.finished = false;
      var that = this;
      setTimeout(function() {
        that.finished = true;
        if (that.callback)
          that.callback();
      }, that.delay + that.duration);
      this.initTime = Date.now();
    };
  };

  Object.defineProperty(Transition.prototype, "value", {
    get: function() {
      var value;
      if (this.finished)
        return this.endVal;
      else if (!this.started)
        return this.startVal;
      else {
        this.delta = Date.now() - this.delay - this.initTime;
        if (this.delta < 0)
          return this.startVal;

        switch (this.motionType) {
          default:
            console.error("Should be unreachable");
          case "linear":
            value = (this.delta / this.duration) * this.distance + this.startVal;
            return value > this.endVal ? this.endVal : value;
          case "logistic":
            return  1 / (1 + Math.pow(Math.E, -15 * (this.delta / this.duration - 0.5))) * this.distance + this.startVal;
        }
      }
    }
  });

  function loadSettingsFromStorage() {
    var storage = window.localStorage, value;

    for (var i = 0; i < storage.length; i++)
      if (/^ESett--/.test(storage.key(i))) {
        value = storage.getItem(storage.key(i));
        switch (value) {
          case "true":
            value = true;
            break;
          case "false":
            value = false;
            break;
          case "null":
            value = null;
            break;
          default:
            value = isNaN(parseFloat(value)) ? value : parseFloat(value);
        }
        try {
          Endless.Settings[storage.key(i).substr(7)].set(value);
        } catch (e) {
          console.warn("Setting \"" + storage.key(i).substr(7) + "\" from Local Storage doesn't exist");
        }
      }
  }

  function saveSettingsToStorage() {
    for (var setting in Endless.Settings) {
      if (Endless.Settings[setting].val == Endless.Settings[setting].defaultVal)
        localStorage.removeItem("ESett--" + setting);
      else
        localStorage.setItem("ESett--" + setting, Endless.Settings[setting].get);
      }
  }

  function handleMouseDown(posX, posY) {
    if (menuObjectMouseover)
      menuObjectMouseover.onClick();

    if (dotMouseover) {
      mousePosX = posX;
      mousePosY = posY;
      selectingDots = true;
      dotSelection[0] = dotMouseover;
      dotMouseover.selected = true;
    }
  }

  function handleMouseUp(posX, posY) {
    if (selectingDots) {
      selectingDots = false;
      if (dotSelection.length > 1) {
        var dotsCleared = 0;
        for (var dot of dotSelection) {
          dots[dot.col][dot.row] = null;
          //dot.selected = false;
          dotsCleared++;
        }
        score += Math.pow(2, dotsCleared - 1);
        inGameMenu.menuObjects[1].text = "Score: " + score;
        fillGridNulls();
      } else
        dotSelection[0].selected = false;
      dotSelection = [];
    }
    handleMouseMove(posX, posY);
  }

  function handleMouseMove(posX, posY) {
    var onAMenuObject = false, dotMo;

    if (!selectingDots) {
      for (var i = 0; i < menuObjectGroups.length; i++)
        for (var j = 0; j < menuObjectGroups[i].menuObjects.length; j++)
          if (menuObjectGroups[i].menuObjects[j].inRange(posX, posY) &&
              menuObjectGroups[i].visibility) {
            menuObjectMouseover = menuObjectGroups[i].menuObjects[j];
            dotMouseover = null;
            onAMenuObject = true;
            canvas.style.cursor = "pointer";
            return;
          }

      menuObjectMouseover = null;
    }

    // If the user has started playing, doesn't have the game paused, and the last dot has finished its animation
    if (playing && !showOverlay) {
      if (selectingDots) {
        mousePosX = posX;
        mousePosY = posY;
      }
      if (dotMouseover = checkForADot(posX, posY)) {
        if (selectingDots && checkDotConnection(dotSelection[dotSelection.length - 1], dotMouseover)) {
          dotMouseover.selected = true;
          dotSelection[dotSelection.length] = dotMouseover;
        }
        canvas.style.cursor = "pointer";
        return;
      }
    }

    dotMouseover = null;
    canvas.removeAttribute("style");
  }

  function handleTouchStart(event) {
    var touches = event.changedTouches[0];

    for (var i = 0; i < menuObjectGroups.length; i++)
      for (var j = 0; j < menuObjectGroups[i].menuObjects.length; j++)
        if (menuObjectGroups[i].menuObjects[j].inRange(touches.pageX, touches.pageY) &&
            menuObjectGroups[i].visibility) {
          event.preventDefault();
          menuObjectGroups[i].menuObjects[j].onClick();
          return;
        }

    if (playing && !showOverlay) {
      event.preventDefault();
      if (dotSelection[0] = checkForADot(touches.pageX, touches.pageY)) {
        mousePosX = touches.pageX;
        mousePosY = touches.pageY;
        dotSelection[0].selected = true;
        selectingDots = true;
      }
    }
  }

  function handleTouchEnd(event) {
    event.preventDefault();

    var touches = event.changedTouches[0];

    if (selectingDots) {
      selectingDots = false;
      if (dotSelection.length > 1) {
        var dotsCleared = 0;
        for (var dot of dotSelection) {
          dots[dot.col][dot.row] = null;
          //dot.selected = false;
          dotsCleared++;
        }
        score += Math.pow(2, dotsCleared - 1);
        inGameMenu.menuObjects[1].text = "Score: " + score;
        fillGridNulls();
      } else
        dotSelection[0].selected = false;
      dotSelection = [];
    }
  }

  function handleTouchMove(event) {
    var touches = event.changedTouches[0];

    if (selectingDots) {
      mousePosX = touches.pageX;
      mousePosY = touches.pageY;
      if (dotMouseover = checkForADot(touches.pageX, touches.pageY)) {
        event.preventDefault();
        if (checkDotConnection(dotSelection[dotSelection.length - 1], dotMouseover)) {
          dotMouseover.selected = true;
          dotSelection[dotSelection.length] = dotMouseover;
        }
      }
    }
  }

  // Attaches all of the event handlers to their events.
  function setupEventListeners() {
    canvas.onmousedown =  function(e) { handleMouseDown(e.clientX, e.clientY) };
    canvas.onmouseup =    function(e) { handleMouseUp(e.clientX, e.clientY) };
    canvas.onmousemove =  function(e) { handleMouseMove(e.clientX, e.clientY) };
    canvas.onblur =       function(e) { handleMouseUp(e.clientX, e.clientY) };
    canvas.addEventListener("touchstart", handleTouchStart, false);
    canvas.addEventListener("touchend", handleTouchEnd, false);
    canvas.addEventListener("touchmove", handleTouchMove, false);
    window.onresize = updateCanvasSize;
  }

  function checkForADot(posX, posY) {
    if (posX > centerX - gridWidth / 2 &&
        posX < centerX + gridWidth / 2 &&
        posY > centerY - gridHeight / 2 &&
        posY < centerY + gridHeight / 2 &&
        (posX - centerX + gridWidth / 2) / Settings.dotSize.val % 2 <= 1 &&
        (posY - centerY + gridHeight / 2) / Settings.dotSize.val % 2 <= 1) {
      var dot = dots[
        Math.floor(((posX - centerX + gridWidth / 2) / Settings.dotSize.val) / 2)][
        Math.floor(((posY - centerY + gridHeight / 2) / Settings.dotSize.val) / 2)];
      if (dot == null)
        return false;
      else
        return dot;
    }
  }

  function checkDotConnection(dot1, dot2) {
    return dot2 && dotAnimationsAreDone && dot1.color == dot2.color && !dot2.selected &&
      Math.abs(dot2.col - dot1.col) < 2 && Math.abs(dot2.row - dot1.row) < 2;
  }

  function fillGridNulls() {
    // Iterate through each spot in dots[][], from the bottom to top
    for (var row = dots[0].length - 1; row >= 0 ; row--)
      for (var col = 0; col < dots.length; col++)
        // If that spot is null, try to pull the next non-null dot above it
        if (dots[col][row] == null) {
          var countNulls = 0;
          // Count how many nulls there are from this position upward
          while (row - countNulls >= 0)
            if (dots[col][row - countNulls] == null)
              countNulls++;
            else break;
          // If there is a dot above this position, drop it into it's new spot
          if (row - countNulls >= 0) {
            dots[col][row] = dots[col][row - countNulls];
            dots[col][row - countNulls] = null;
            dots[col][row].row = row;
            dots[col][row].transitions = [new Transition(dots[col][row].y, dots[col][row].y + (countNulls * Settings.dotSize.val * 2), 400, 0, "y", "logistic")];
            dots[col][row].draw.finishedy = false;
            dots[col][row].transitions[0].start();
          }
        }

    generateDots();
  }

  // Sets the canvas element's height and width to that of the window's
  function updateCanvasSize() {
    canvas.setAttribute("width", window.innerWidth);
    canvas.setAttribute("height", window.innerHeight);

    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }

  function updateGridDimensions() {
    gridWidth = Settings.columns.val * Settings.dotSize.val * 2 - Settings.dotSize.val;
    gridHeight = Settings.rows.val * Settings.dotSize.val * 2 - Settings.dotSize.val;
  }

  function play() {
    if (!playing) {
      for (var col = 0; col < Settings.columns.val; col++) {
        dots[col] = [];
        for (var row = 0; row < Settings.rows.val; row++)
          dots[col][row] = null;
      }
      generateDots(300);
      inGameMenu.visibility = true;
      inGameMenu.startTransitions();
      playing = true;
    }
    showOverlay = false;
    mainMenu.visibility = false;
  }

  function showMenu() {
    showOverlay = true;
    mainMenu.visibility = true;
  }

  function generateDots(timeIncrease) {
    if (timeIncrease == null)
      timeIncrease = 0;
    dotAnimationsAreDone = false;
    var dot = null;
    for (var col = 0; col < Settings.columns.val; col++)
      for (var row = 0; row < Settings.rows.val; row++) {
        if (dots[col][row] == null) {
          dots[col][row] = new Dot(
            (Math.floor(Math.random() * Settings.dotColors.val) * (360 / Settings.dotColors.val) + Settings.hueShift.val) % 360,
            col, row,
            (centerX - gridWidth / 2 + Settings.dotSize.val / 2) + (col * Settings.dotSize.val * 2) - centerX,
            (centerY - gridHeight / 2 + Settings.dotSize.val / 2) + (row * Settings.dotSize.val * 2) - centerY);
          dot = dots[col][row];
          if (Settings.animateDots.val)
            dots[col][row].transitions = [
              new Transition(
                -centerY - Settings.dotSize.val / 2,
                dots[col][row].y,
                Settings.dotAnimationTime.val + timeIncrease,
                (Settings.rows.val - 1 - row) * ((Settings.dotAnimationTime.val + timeIncrease) / 20),
                "y", Settings.dotAnimationType.val),
            ];
          }
      }
      if (dot == null)
        dotAnimationsAreDone = true;
      else
        dot.transitions[0].callback = function () {
          dotAnimationsAreDone = true;
        };
  }

  // Calls each drawing function every frame, if needed.
  function draw() {
    drawBackground();

    if (playing)
      drawDots();

    if (selectingDots)
      drawDotSelectionLine();

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
    if (Settings.acid.val)
      ctx.globalAlpha = 0.09;
    if (Settings.backgroundColor.val == "rainbow") {
      if (!backgroundChangingColor.started || backgroundChangingColor.finished)
        backgroundChangingColor.start();
      ctx.fillStyle = "hsl(" + backgroundChangingColor.value % 360 + ", 50%, 25%)";
    } else {
      ctx.fillStyle = Settings.backgroundColor.val;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (Settings.acid.val)
      ctx.globalAlpha = 1;
  }

  function drawOverlay() {
    ctx.fillStyle = "rgba(0,0,0,.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Updates each dot's position if it's still animating, and tells them to draw
  function drawDots() {
    // Run each dot's transitions if needed
    for (var i = 0; i < dots.length; i++)
      for (var j = 0; j < dots[i].length; j++) {
        dots[i][j] && dots[i][j].draw();
      }
  }

  function drawDotSelectionLine() {
    ctx.strokeStyle = "hsla(" + dotSelection[0].color + ", 100%, 50%," + dotSelection[0].opacity + ")";
    ctx.lineWidth = Settings.dotSize.val / 3;
    ctx.lineJoin = "bevel";
    ctx.beginPath();
    ctx.moveTo(dotSelection[0].x  + centerX, dotSelection[0].y + centerY);
    for (var i = 0; i < dotSelection.length; i++)
      ctx.lineTo(dotSelection[i].x  + centerX, dotSelection[i].y + centerY)
    ctx.lineTo(mousePosX, mousePosY);
    ctx.stroke();
  }

  // Grabs canvas element and context, sets canvas to to size of the
  // window, and begins the drawing loop.
  function setupGraphics() {
    canvas = document.getElementsByTagName("canvas")[0];
    ctx = canvas.getContext("2d");
    updateCanvasSize();

    // Background hue is set to some random number, then will slowly move its
    // way along the spectrum
    if (Settings.backgroundColor.val == "rainbow") {
      var randomInitialHue = Math.floor(Math.random() * 360);
      backgroundChangingColor = new Transition(randomInitialHue, randomInitialHue + 360, 9e5);
    }

    // MenuObject(horizontalPercent, verticalPercent, xOffset, yOffset, text, fontSize, clickableWidth, clickableHeight, onClickFuction)
    mainMenu = new MenuObjectGroup([
      new MenuObject(0.5, 0.25, 0, 0, "endless", 256),
      new MenuObject(0.5, 0.25, 200, 130, "By Tom Genco", 64),
      new MenuObject(0.5, 0.75, 0, 0, "Play", 128, 240, 170, play)
    ], true);

    bottomMenu = new MenuObjectGroup([
      new MenuObject(0, 1, 15, -15, "tomgenco.com", 64, 360, 70, function() {
        window.location.href = "http://tomgenco.com"; }),
      new MenuObject(1, 1, -15, -15, "Source code", 64, 300, 70, function() {
        window.location.href = "http://github.com/TomGenco/Endless"; })
    ], true);

    inGameMenu = new MenuObjectGroup([
      new MenuObject(0, 0, 15, 25, "Menu", 128, 300, 130, showMenu),
      new MenuObject(1, 0, -15, 25, "Score: " + score, 128)
    ], false);

    if (Settings.animateMenuObjects.val) {
      mainMenu.menuObjects[0].transitions = [new Transition(0, 1, 2000, 0, "opacity")];
      mainMenu.menuObjects[1].transitions = [new Transition(0, 1, 2000, 500, "opacity")];
      mainMenu.menuObjects[2].transitions = [new Transition(0, 1, 2000, 1000, "opacity")];
      bottomMenu.menuObjects[0].transitions = [new Transition(0, 1, 2000, 2000, "opacity")];
      bottomMenu.menuObjects[1].transitions = [new Transition(0, 1, 2000, 2000, "opacity")];
      inGameMenu.menuObjects[0].transitions = [new Transition(-100, inGameMenu.menuObjects[0].fixedOffsetY, 1000, Settings.animateDots.val ? 1000 : 0, "fixedOffsetY", "logistic")];
      inGameMenu.menuObjects[1].transitions = [new Transition(-100, inGameMenu.menuObjects[1].fixedOffsetY, 1000, Settings.animateDots.val ? 1100 : 100, "fixedOffsetY", "logistic")];
    }

    menuObjectGroups = [mainMenu, bottomMenu, inGameMenu];

    updateGridDimensions();

    mainMenu.startTransitions();
    bottomMenu.startTransitions();
    requestAnimationFrame(draw);
  }

  if (!window.localStorage) {
    console.error("This browser doesn't support Web Storage, so Settings and " +
                  "statistics cannot be saved to browser.");
    supportsStorage = false;
  } else {
    supportsStorage = true;
    loadSettingsFromStorage();
  }

  setupGraphics();
  setupEventListeners();
}

window.onload = Endless;
