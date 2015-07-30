"use strict";

function Endless() {
  this.Settings = {
    DefaultEntries: { acid: false, animateDots: true, animateMenuObjects: true, backgroundColor: "rainbow", columns: 10, dotAnimationTime: 1000, dotAnimationType: "logistic", dotColors: 10, dotSize: 40, hueShift: 70, rows: 10 },
    Entries: {},

    saveToStorage: function() {
      for (var setting in this.Entries)
        if (setting != "DefaultEntries") {
          if (this.Entries[setting] == this.DefaultEntries[setting])
            localStorage.removeItem("ESett--" + setting);
          else
            localStorage.setItem("ESett--" + setting, this.Entries[setting]);
        }
    },
    loadFromStorage: function() {
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
          // Clean up any stored settings that are already the default
          if (this.DefaultEntries[storage.key(i).substr(7)] == value)
            localStorage.removeItem(storage.key(i));
          else
            this.Entries[storage.key(i).substr(7)] = value;
        }
    },
    toString: function() {
      var string = "";
      for (var setting in this.Entries)
        if (setting != "DefaultEntries" && this.Entries[setting] != this.DefaultEntries[setting])
          string += setting + ':' + this.Entries[setting] + ';';
      return string.trim();
    },
    loadFromString: function(string) {
      var pairs = string.split(';'), value;
      for (var i = 0; i < pairs.length - 1; i++) {
        value = pairs[i].split(':')[1];
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
        Settings.Entries[pairs[i].split(':')[0]] = value;
      }
    }
  };

  var backgroundChangingColor, bottomMenu, canvas, centerX, centerY, ctx, currentDotSize, dots = [], gridHeight, gridWidth, inGameMenu, mainMenu, menuObjectGroups, playing, showOverlay, supportsStorage;

  function setup() {
    var loading = document.getElementsByTagName("h1")[0];
    loading.removeAttribute("style");

    for (var setting in Settings.DefaultEntries) {
      Settings.Entries[setting] = Settings.DefaultEntries[setting];
    }

    if (!window.localStorage) {
      console.error("This browser doesn't support Web Storage, so settings and " +
                    "statistics cannot be saved to browser.");
      supportsStorage = false;
    } else {
      supportsStorage = true;
      Settings.loadFromStorage();
    }

    setTimeout(function () {
      setupGraphics();
      setupEventListeners();
      
      loading.setAttribute("style", "display:none;");
    }, 300);
  }

  // Grabs canvas element and context, sets canvas to to size of the
  // window, and begins the drawing loop.
  function setupGraphics() {
    canvas = document.getElementsByTagName("canvas")[0];
    ctx = canvas.getContext("2d");
    currentDotSize = Settings.Entries.dotSize;
    updateCanvasSize();

    // Background hue is set to some random number, then will slowly move its
    // way along the spectrum
    if (Settings.Entries.backgroundColor == "rainbow") {
      var randomInitialHue = Math.floor(Math.random() * 360);
      backgroundChangingColor = new Transition(randomInitialHue, randomInitialHue + 360, 9e5);
    }

    // Menu object positions are described by a percentage of the canvas size
    // plus any pixel offset. e.g. MenuObject(0.5, 0.5, 0, 0, ...) is in the
    // middle of the canvas, and MenuObject(1, 1, -50, -50, ...) is 50 pixels
    // from the bottom, and 50 pixels from the right.
    // This is done so the actual x and y can adjust to varying screen sizes.
    mainMenu = new MenuObjectGroup([
      new MenuObject(0.5, 0.25, 0, 0, "endless", 256),
      new MenuObject(0.5, 0.25, 200, 130, "By Tom Genco", 64),
      new MenuObject(0.5, 0.75, 0, 0, "Play", 128, 210, 140, play)
    ], true);

    bottomMenu = new MenuObjectGroup([
      new MenuObject(0, 1, 15, -15, "tomgenco.com", 32, 180, 40, function() {
        window.location.href = "http://tomgenco.com/"; }),
      new MenuObject(1, 1, -15, -15, "source code", 32, 160, 40, function() {
        window.location.href = "http://github.com/TomGenco/Endless"; })
    ], true);

    inGameMenu = new MenuObjectGroup([
      new MenuObject(0, 0, 15, 5, "Menu", 64, 140, 70, showMenu),
      new MenuObject(1, 0, -15, 5, "Score: 0", 64)
    ], false);

    if (Settings.Entries.animateMenuObjects) {
      mainMenu.menuObjects[0].transitions = [new Transition(0, 1, 2000, 0, "opacity")];
      mainMenu.menuObjects[1].transitions = [new Transition(0, 1, 2000, 500, "opacity")];
      mainMenu.menuObjects[2].transitions = [new Transition(0, 1, 2000, 1000, "opacity")];
      bottomMenu.menuObjects[0].transitions = [new Transition(0, 1, 2000, 2000, "opacity")];
      bottomMenu.menuObjects[1].transitions = [new Transition(0, 1, 2000, 2000, "opacity")];
      inGameMenu.menuObjects[0].transitions = [new Transition(-100, inGameMenu.menuObjects[0].fixedOffsetY, 1000, Settings.Entries.animateDots ? 1000 : 0, "fixedOffsetY", "logistic")];
      inGameMenu.menuObjects[1].transitions = [new Transition(-100, inGameMenu.menuObjects[1].fixedOffsetY, 1000, Settings.Entries.animateDots ? 1100 : 100, "fixedOffsetY", "logistic")];
    }

    menuObjectGroups = [mainMenu, bottomMenu, inGameMenu];

    gridWidth = Settings.Entries.columns * currentDotSize * 2 - currentDotSize;
    gridHeight = Settings.Entries.rows * currentDotSize * 2 - currentDotSize;

    mainMenu.startTransitions();
    bottomMenu.startTransitions();
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
        (posX - centerX + gridWidth / 2) / currentDotSize % 2 <= 1 &&
        (posY - centerY + gridHeight / 2) / currentDotSize % 2 <= 1))
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
      inGameMenu.startTransitions();
    }
    showOverlay = false;
    mainMenu.visibility = false;
  }

  function showMenu() {
    showOverlay = true;
    mainMenu.visibility = true;
  }

  function generateDots() {
    for (var col = 0; col < Settings.Entries.columns; col++) {
      dots[col] = [];
      for (var row = 0; row < Settings.Entries.rows; row++) {
        dots[col][row] = new Dot(
          (Math.floor(Math.random() * Settings.Entries.dotColors) * (360 / Settings.Entries.dotColors) + Settings.Entries.hueShift) % 360,
          col, row,
          (centerX - gridWidth / 2 + currentDotSize / 2) + (col * currentDotSize * 2) - centerX,
          (centerY - gridHeight / 2 + currentDotSize / 2) + (row * currentDotSize * 2) - centerY);
        if (Settings.Entries.animateDots)
          dots[col][row].transitions = [
            new Transition(
              dots[col][row].y - centerY - gridHeight / 2 - currentDotSize / 2,
              dots[col][row].y,
              Settings.Entries.dotAnimationTime,
              col * (Settings.Entries.dotAnimationTime / 20),
              "y", Settings.Entries.dotAnimationType),
            new Transition(
              dots[col][row].x - centerX - gridWidth / 2 - currentDotSize / 2,
              dots[col][row].x,
              Settings.Entries.dotAnimationTime,
              (Settings.Entries.rows - row - 1) * (Settings.Entries.dotAnimationTime / 20),
              "x", Settings.Entries.dotAnimationType)];
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
    if (Settings.Entries.acid)
      ctx.globalAlpha = 0.09;
    if (Settings.Entries.backgroundColor == "rainbow") {
      if (!backgroundChangingColor.started || backgroundChangingColor.finished)
        backgroundChangingColor.start();
      ctx.fillStyle = "hsl(" + backgroundChangingColor.getVal() % 360 + ", 50%, 25%)";
    } else {
      ctx.fillStyle = Settings.Entries.backgroundColor;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (Settings.Entries.acid)
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
        if (Settings.Entries.dotSize != currentDotSize) {
          currentDotSize = Settings.Entries.dotSize;
          for (var k = 0; k < dots.length; k++)
            for (var l = 0; l < dots[k].length; l++)
              dots[k][l].recalculatePosition();
        }
        dots[i][j].draw();
      }
  }

  var Dot = function (color, column, row, x, y) {
    this.color = color || 0;
    this.col = column;
    this.row = row;
    this.x = x;
    this.y = y;
    this.opacity = 1;
    this.transitions = [];

    this.recalculatePosition = function() {
      gridWidth = Settings.Entries.columns * currentDotSize * 2 - currentDotSize;
      gridHeight = Settings.Entries.rows * currentDotSize * 2 - currentDotSize;

      this.x = (centerX - gridWidth / 2 + currentDotSize / 2) + (this.col * currentDotSize * 2) - centerX,
      this.y = (centerY - gridHeight / 2 + currentDotSize / 2) + (this.row * currentDotSize * 2) - centerY;
    };

    this.draw = function() {
      for (var i = 0; i < this.transitions.length; i++) {
        if (!this.transitions[i].started)
          this.transitions[i].start();
        if (this.transitions[i].started && !this.draw["finished" + this.transitions[i].property]) {
          this[this.transitions[i].property] = this.transitions[i].getVal();
          if (this.transitions[i].finished)
            this.draw["finished" + this.transitions[i].property] = true;
        }
      }

      ctx.fillStyle = "hsla(" + this.color + ", 100%, 50%," + this.opacity + ")";
      ctx.beginPath();
      ctx.shadowColor = "rgba(0,0,0,0)";
      ctx.arc(this.x + centerX, this.y + centerY, currentDotSize / 2, 0, Math.PI * 2, false);
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
      if (Settings.Entries.animateMenuObjects)
        for (var i = 0; i < this.transitions.length; i++)
          if (this.transitions[i].started && !this.draw["finished" + this.transitions[i].property]) {
            this[this.transitions[i].property] = this.transitions[i].getVal();
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

  var Transition = function(startVal, endVal, duration, delay, property, motionType) {
    this.startVal = startVal === undefined ? 0 : startVal;
    this.endVal = endVal === undefined ? 100 : endVal;
    this.duration = duration || 1000;
    this.delay = delay === undefined ? 200 : delay;
    this.property = property === undefined ? "opacity" : property;
    this.motionType = motionType === undefined ? "linear" : motionType;
    this.finished = false;
    this.started = false;
    var initTime, delta, distance = this.endVal - this.startVal;

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
            value = (delta / this.duration) * distance + this.startVal;
            return value > endVal ? endVal : value;
          case "logistic":
            return  1 / (1 + Math.pow(Math.E, -15 * (delta / this.duration - .5))) * distance + this.startVal;
        }
      }
    };
  };

  setup();
}

window.onload = Endless;
