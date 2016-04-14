"use strict";

function Endless() {
  var settings = new Settings({
    acid: [false],
    animateDots: [true],
    animateMenuObjects: [true],
    backgroundColor: ["#333"],
    columns: [5, updateGrid],
    dotAnimationTime: [300],
    dotAnimationType: ["logistic"],
    dotColors: [5, updateGrid],
    dotSize: [80, updateGrid],
    hueShift: [60],
    rows: [6, updateGrid]
  });

  this.settings = settings;

  this.init = function() {
    if (!window.localStorage) {
      console.error("This browser doesn't support Web Storage, so Settings and " +
                    "statistics cannot be saved to browser.");
      supportsStorage = false;
    } else {
      supportsStorage = true;
      loadDataFromStorage();
    }

    setupGraphics();
    setupEventListeners();

    return this;
  };

  function Settings(settings) {
    this.get = function(setting) {
      return settings[setting][0];
    }
    this.set = function(setting, value) {
      settings[setting][0] = value;
      if (settings[setting][1])
        return settings[setting][1]();
      return true;
    }
  };

  var bottomMenu, canvas, centerX, centerY, ctx, dotAnimationsAreDone = true, dotMouseover, dots = [], dotSelection = [], gridHeight, gridWidth, inGameMenu, mainMenu, menuObjectMouseover, menuObjectGroups, mousePosX, mousePosY, playing, score = 0, selectingDots = false, showOverlay, supportsStorage;

  var Dot = function(color, column, row, x, y) {
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

      ctx.fillStyle = "hsla(" + (this.color + settings.get("hueShift") % 360) + ", " +                     // Hue
                               (this.selected? "100%" : "60%") + ", " + // Saturation
                               (this.selected? "50%"  : "60%") + ", " + // Lightness
                                this.opacity + ")";                     // Alpha (opacity)
      ctx.beginPath();
      ctx.shadowColor = "rgba(0,0,0,0)";
      ctx.arc(this.x, this.y, settings.get("dotSize") / 2, 0, Math.PI * 2, false);
      ctx.fill();
    };
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
      if (settings.get("animateMenuObjects"))
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

  var MenuObjectGroup = function(menuObjects, visibility) {
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

  var Transition = function(startVal, endVal, duration, delay, property, motionType, callback) {
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

  function loadDataFromStorage() {
    var storage = window.localStorage, value;

    for (var i = 0; i < storage.length; i++)
      if (/^Endless--/.test(storage.key(i))) {
        if (storage.key(i) == "Endless--score") {
          updateScore(-score + parseFloat(storage.getItem(storage.key(i))));
          continue;
        }
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
          Endless.setSetting([storage.key(i).substr(9)], value);
        } catch (e) {
          console.warn("Setting \"" + storage.key(i).substr(9) + "\" from Local Storage doesn't exist");
        }
      }
  }

  function saveDataToStorage() {
    for (var setting in Endless.settings)
      localStorage.setItem("Endless--" + Endless.settings[setting], settings.get(setting));
  }

  function handleMouseDown(e) {
    var posX = e.x, posY = e.y;

    if (event.button != 0)
      handleMouseUp(posX, posY);

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
        generateDotColor.lastTwoColors[1] = generateDotColor.lastTwoColors[0];
        generateDotColor.lastTwoColors[0] = dotSelection[0].color;
        var dotsCleared = 0;
        for (var i = 0; i < dotSelection.length; i++) {
          dots[dotSelection[i].col][dotSelection[i].row] = null;
          dotsCleared++;
        }
        updateScore(dotSelection.length == 2? 2 : 2 * dotsCleared);
        fillGridNulls();
        vibrate(30 + (dotSelection.length * 30));
      } else
        dotSelection[0].selected = false;
      dotSelection = [];
    }
    handleMouseMove(posX, posY);
  }

  function handleMouseMove(posX, posY) {
    // Skip all this if onTouchEnd called handleMouseUp
    if (posX == null)
      return;

    var menuObject;

    if (!selectingDots && (menuObject = checkForAMenuObject(posX, posY))) {
      menuObjectMouseover = menuObject;
      dotMouseover = null;
      canvas.style.cursor = "pointer";
    } else {
      menuObjectMouseover = null;
      canvas.removeAttribute("style");

      if (selectingDots)
        mousePosX = posX, mousePosY = posY;
      if (playing && !showOverlay && (dotMouseover = checkForADot(posX, posY))) {
        canvas.style.cursor = "pointer";
        if (dotMouseover == dotSelection[dotSelection.length - 2]) {
          dotSelection[dotSelection.length - 1].selected = false;
          dotSelection.pop();
        }
        if (selectingDots && checkDotConnection(dotSelection[dotSelection.length - 1], dotMouseover)) {
          dotMouseover.selected = true;
          dotSelection.push(dotMouseover);
        }
      } else {
        dotMouseover = null;
        canvas.removeAttribute("style");
      }
    }
  }

  function handleTouchStart(event) {
    var posX, posY;
    for (var i = 0; i < event.changedTouches.length; i++)
      if (event.changedTouches[i].identifier == 0)
        posX = event.changedTouches[i].pageX, posY = event.changedTouches[i].pageY;
    if (posX == undefined)
      return;

    var menuObject;
    if (menuObject = checkForAMenuObject(posX, posY)) {
      event.preventDefault();
      menuObject.onClick();
    } else if (playing && !showOverlay) {
      event.preventDefault();
      if (dotSelection[0] = checkForADot(posX, posY)) {
        mousePosX = posX;
        mousePosY = posY;
        dotSelection[0].selected = true;
        selectingDots = true;
        vibrate(30);
      }
    }
  }

  function handleTouchEnd(event) {
    var posX, posY;
    for (var i = 0; i < event.changedTouches.length; i++)
      if (event.changedTouches[i].identifier == 0)
        posX = event.changedTouches[i].pageX, posY = event.changedTouches[i].pageY;
    if (posX == undefined)
      return;

    handleMouseUp();
  }

  function handleTouchMove(event) {
    var posX, posY;
    for (var i = 0; i < event.changedTouches.length; i++)
      if (event.changedTouches[i].identifier == 0)
        posX = event.changedTouches[i].pageX, posY = event.changedTouches[i].pageY;
    if (posX == undefined)
      return;

    if (selectingDots) {
      mousePosX = posX, mousePosY = posY;
      if (dotMouseover = checkForADot(posX, posY)) {
        event.preventDefault();
        if (dotMouseover == dotSelection[dotSelection.length - 2]) {
          dotSelection[dotSelection.length - 1].selected = false;
          dotSelection.pop();
        } else if (checkDotConnection(dotSelection[dotSelection.length - 1], dotMouseover)) {
          vibrate(30);
          dotMouseover.selected = true;
          dotSelection.push(dotMouseover);
        }
      }
    }
  }

  // Attaches all of the event handlers to their events.
  function setupEventListeners() {
    canvas.addEventListener("mousedown",   function(e) { handleMouseDown(e) }, false);
    canvas.addEventListener("mouseup",     function(e) { handleMouseUp(e.x, e.y) }, false);
    canvas.addEventListener("mousemove",   function(e) { handleMouseMove(e.x, e.y) }, false);
    canvas.addEventListener("mouseout",    function(e) { handleMouseUp(e.x, e.y) }, false);
    canvas.addEventListener("blur",        function(e) { handleMouseUp(e.x, e.y) }, false);
    canvas.addEventListener("touchstart",  function(e) { handleTouchStart(e) }, false);
    canvas.addEventListener("touchend",    function(e) { handleTouchEnd(e) }, false);
    canvas.addEventListener("touchmove",   function(e) { handleTouchMove(e) }, false);
    canvas.addEventListener("touchcancel", function(e) { handleTouchEnd(e) }, false);
    window.onresize = updateCanvasSize;
  }

  function checkForAMenuObject(posX, posY) {
    for (var i = 0; i < menuObjectGroups.length; i++)
      for (var j = 0; j < menuObjectGroups[i].menuObjects.length; j++)
        if (menuObjectGroups[i].menuObjects[j].inRange(posX, posY) &&
            menuObjectGroups[i].visibility)
          return menuObjectGroups[i].menuObjects[j];
    return false;
  }

  function checkForADot(posX, posY) {
    var dotRadius = settings.get("dotSize") / 2,
        gridX = posX - (centerX - gridWidth / 2 - dotRadius),
        gridY = posY - (centerY - gridHeight / 2 - dotRadius);

    if (gridX > 0 && gridX < gridWidth + dotRadius * 2 &&
        gridY > 0 && gridY < gridHeight + dotRadius * 2) {
      var dot = dots[
         Math.floor(gridX / ((gridWidth + dotRadius * 2) / settings.get("columns")))]
        [Math.floor(gridY / ((gridHeight + dotRadius * 2) / settings.get("rows")))
      ];

      if (Math.sqrt(Math.pow(dot.x - posX, 2) + Math.pow(dot.y - posY, 2)) < dotRadius * 1.75)
        return dot;
    }
    return false;
  }

  function checkDotConnection(dot1, dot2) {
    return dot2 && dotAnimationsAreDone && dot1.color == dot2.color && !dot2.selected &&
      Math.abs(dot2.col - dot1.col) < 2 && Math.abs(dot2.row - dot1.row) < 2;
  }

  function fillGridNulls() {
    // Iterate through each spot in dots[][], from the bottom to top
    for (var row = dots[0].length - 1; row >= 0; row--)
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
            if (settings.get("animateDots")) {
              var dot = dots[col][row];
              dotAnimationsAreDone = false;
              dots[col][row].transitions = [new Transition(
                dots[col][row].y,
                dots[col][row].y + (countNulls * settings.get("dotSize") * 2),
                settings.get("dotAnimationTime"),
                0,
                "y",
                settings.get("dotAnimationType"))];
              dots[col][row].draw.finishedy = false;
              dots[col][row].transitions[0].start();
            }
          }
        }

    if (settings.get("animateDots"))
      if (dot == null)
        dotAnimationsAreDone = true;
      else
        dot.transitions[0].callback = function () { dotAnimationsAreDone = true };

    generateDots();
  }

  function updateScore(newPoints) {
    score += newPoints;
    if (playing)
      inGameMenu.menuObjects[1].text = "Score: " + score;
    if (supportsStorage)
      localStorage.setItem("Endless--score", score);
  }

  // Sets the canvas element's height and width to that of the window's
  function updateCanvasSize() {
    canvas.setAttribute("width", window.innerWidth);
    canvas.setAttribute("height", window.innerHeight);

    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }

  // Update variables, fix dot positions, delete dots that shouldn't exist
  function updateGrid() {
    gridWidth = settings.get("columns") * settings.get("dotSize") * 2 - settings.get("dotSize");
    gridHeight = settings.get("rows") * settings.get("dotSize") * 2 - settings.get("dotSize");

    // remove rows and columns that shouldn't exist anymore, and recalculate x and y
    if (playing) {
      // Pop any dot that shouldn't exist
      for (var col = dots.length - 1; col >= 0; col--)
        if (col >= settings.get("columns"))
          dots.pop();
        else
          for (var row = dots[col].length - 1; row >= settings.get("rows"); row--)
            dots[col].pop();

      // Reset existing dot's positions
      for (col = 0; col < dots.length; col++)
        for (row = 0; row < dots[col].length; row++) {
          dots[col][row].x = centerX - gridWidth / 2 + settings.get("dotSize") / 2 + col * settings.get("dotSize") * 2;
          dots[col][row].y = centerY - gridHeight / 2 + settings.get("dotSize") / 2 + row * settings.get("dotSize") * 2;
        }

      // Fill holes in the grid
      generateDots();
    }
  }

  function generateDots(timeIncrease) {
    if (!playing)
      return;
    if (timeIncrease == null)
      timeIncrease = 0;

    for (var col = 0; col < settings.get("columns"); col++) {
      if (dots[col] == undefined)
        dots[col] = [];
      for (var row = 0; row < settings.get("rows"); row++) {
        if (dots[col][row] == null) {
          dots[col][row] = new Dot(
            generateDotColor(),
            col, row,
            centerX - gridWidth / 2 + settings.get("dotSize") / 2 + col * settings.get("dotSize") * 2,
            centerY - gridHeight / 2 + settings.get("dotSize") / 2 + row * settings.get("dotSize") * 2);
          if (settings.get("animateDots")) {
            dotAnimationsAreDone = false;
            var dot = dots[col][row];
            dots[col][row].transitions = [
              new Transition(
                -centerY - settings.get("dotSize") / 2,
                dots[col][row].y,
                settings.get("dotAnimationTime") + timeIncrease,
                (settings.get("rows") - 1 - row) * ((settings.get("dotAnimationTime") + timeIncrease) / 20),
                "y", settings.get("dotAnimationType")),
            ];
          }
        } else {
          dots[col][row].x = (centerX - gridWidth / 2 + settings.get("dotSize") / 2) + (col * settings.get("dotSize") * 2);
          dots[col][row].y = (centerY - gridHeight / 2 + settings.get("dotSize") / 2) + (row * settings.get("dotSize") * 2);
        }
      }
    }
    if (settings.get("animateDots"))
      if (dot == null)
        dotAnimationsAreDone = true;
      else
        dot.transitions[0].callback = function () { dotAnimationsAreDone = true };
  }

  generateDotColor.lastTwoColors = [];
  function generateDotColor() {
    console.log(generateDotColor.lastTwoColors);
    var color;
    while ("I still feel like it") {
      color = Math.floor(Math.random() * settings.get("dotColors")) * (360 / Math.floor(settings.get("dotColors")));
      if (settings.get("dotColors") < 3 ||
         (color != generateDotColor.lastTwoColors[0] &&
          color != generateDotColor.lastTwoColors[1]))
        return color;
    }

  }

  function play() {
    if (!playing) {
      playing = true;
      generateDots(300);
      inGameMenu.visibility = true;
      inGameMenu.startTransitions();
    }
    showOverlay = false;
    mainMenu.visibility = false;
  }

  function reset() {
    var storage = window.localStorage;
    var reallyWannaDoThat = confirm("Do you really want to reset settings and score?");
    if (reallyWannaDoThat) {
      for (var i = 0; i < storage.length; i++)
        if (/^Endless--/.test(storage.key(i))) {
          localStorage.removeItem(storage.key(i));
          i--;
        }
      location.reload();
    }
  }

  function showMenu() {
    showOverlay = true;
    mainMenu.visibility = true;
  }

  function vibrate(time) {
    if (navigator.vibrate)
      navigator.vibrate(time);
    else if (navigator.mozVibrate)
      navigator.mozVibrate(time);
    else if (navigator.webkitVibrate)
      navigator.webkitVibrate(time);
    else return false;
    return true;
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

    if (settings.get("acid"))
      ctx.globalAlpha = 0.01;
    if (settings.get("backgroundColor") == "rainbow") {
      if (!drawBackground.hue.started || drawBackground.hue.finished)
        drawBackground.hue.start();
      ctx.fillStyle = "hsl(" + drawBackground.hue.value % 360 + ", 50%, 25%)";
    } else {
      ctx.fillStyle = settings.get("backgroundColor");
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (settings.get("acid"))
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
    ctx.strokeStyle = "hsla(" + (dotSelection[0].color + settings.get("hueShift") % 360) + ", 100%, 50%," + dotSelection[0].opacity + ")";
    ctx.lineWidth = settings.get("dotSize") / 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(dotSelection[0].x, dotSelection[0].y);
    for (var i = 0; i < dotSelection.length; i++)
      ctx.lineTo(dotSelection[i].x, dotSelection[i].y)
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
    if (settings.get("backgroundColor") == "rainbow") {
      var randomInitialHue = Math.floor(Math.random() * 360);
      drawBackground.hue = new Transition(randomInitialHue, randomInitialHue + 360, 9e5);
    }

    // MenuObject(horizontalPercent, verticalPercent, xOffset, yOffset, text, fontSize, clickableWidth, clickableHeight, onClickFuction)
    mainMenu = new MenuObjectGroup([
      new MenuObject(0.5, 0.25, 0, 0, "endless", 256),
      new MenuObject(0.5, 0.25, 200, 130, "By Tom Genco", 64),
      new MenuObject(0.5, 0.75, -150, 0, "Play", 128, 240, 170, play),
      new MenuObject(0.5, 0.75, 150, 0, "Reset", 128, 270, 170, reset)
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

    if (settings.get("animateMenuObjects")) {
      mainMenu.menuObjects[0].transitions = [new Transition(0, 1, 2000, 0, "opacity")];
      mainMenu.menuObjects[1].transitions = [new Transition(0, 1, 2000, 500, "opacity")];
      mainMenu.menuObjects[2].transitions = [new Transition(0, 1, 2000, 1000, "opacity")];
      mainMenu.menuObjects[3].transitions = [new Transition(0, 1, 2000, 1000, "opacity")];
      bottomMenu.menuObjects[0].transitions = [new Transition(0, 1, 2000, 2000, "opacity")];
      bottomMenu.menuObjects[1].transitions = [new Transition(0, 1, 2000, 2000, "opacity")];
      inGameMenu.menuObjects[0].transitions = [new Transition(-100, inGameMenu.menuObjects[0].fixedOffsetY, 1000, settings.get("animateDots") ? 1000 : 0, "fixedOffsetY", "logistic")];
      inGameMenu.menuObjects[1].transitions = [new Transition(-100, inGameMenu.menuObjects[1].fixedOffsetY, 1000, settings.get("animateDots") ? 1100 : 100, "fixedOffsetY", "logistic")];
    }

    menuObjectGroups = [mainMenu, bottomMenu, inGameMenu];

    updateGrid();
    mainMenu.startTransitions();
    bottomMenu.startTransitions();
    requestAnimationFrame(draw);
  }
}

var endless = new Endless().init();
// document.addEventListener("DOMContentLoaded", Endless.init());
