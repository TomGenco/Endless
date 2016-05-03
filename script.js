"use strict";

function Endless() {
  var Game = {
    Settings: {
      animations: true,
      columns: 5,
      dotColors: 5,
      hueShift: 60,
      rows: 5,
      vibrate: true
    },

    Screens: {},
    score: 0,
    selectingDots: false,
    menuObjectMouseover: null,
    dotMouseover: null,
    dotSelection: [],
    dotSelectionHue: 100,
    playing: false,
    paused: false,

    play: function() {
      if (!Game.playing) {
        Game.updateScore(0);
        Game.playing = true;
        Game.Screens.playing.show();
        Game.Screens.main.overlay = true;
      }
      Game.paused = false;
      Game.Screens.main.hide();
    },

    updateScore: function(dotsCleared) {
      Game.score += dotsCleared == 2? 2 : 2 * dotsCleared;
      if (Game.playing) {
        Game.Screens.playing.contents.score.text = Game.score;
        if (Game.Settings.animations) {
          Game.Screens.playing.contents.score.hue = Game.dotSelectionHue + Game.Settings.hueShift % 360;
          Game.Screens.playing.contents.score.lightness = 60;
          Game.Screens.playing.contents.score.transition = new Transition(
            Game.Screens.playing.contents.score,
            "lightness", 60, 100, 800, 0);
          Game.Screens.playing.contents.score.transition.start();
          }
      }
      localStorage.setItem("Endless--score", Game.score);
      localStorage.setItem("Endless--lastTwoHues", JSON.stringify(Grid.lastTwoHues));
    },

    updateScoreIndicator: function(dotsCleared) {
      if (dotsCleared > 1) {
        Game.Screens.playing.contents.scoreIndicator.text = "+" + (dotsCleared == 2? 2 : 2 * dotsCleared);
        Game.Screens.playing.contents.scoreIndicator.visible = true;
        Game.Screens.playing.contents.scoreIndicator.hue = Game.dotSelection[0].hue + Game.Settings.hueShift % 360;
        Game.Screens.playing.contents.scoreIndicator.saturation = 60;
        Game.Screens.playing.contents.scoreIndicator.lightness = 60;
      } else {
        Game.Screens.playing.contents.scoreIndicator.visible = false;
      }
    }
  }

  var Util = {
    loadDataFromStorage: function() {
      for (var i = 0; i < localStorage.length; i++)
        if (/^Endless--/.test(localStorage.key(i))) {
          if (localStorage.key(i) == "Endless--score") {
            Game.score = parseFloat(localStorage.getItem("Endless--score"));
            Game.updateScore(0);
            continue;
          } else if (localStorage.key(i) == "Endless--grid") {
            Grid.importing = true;
            continue;
          } else if (localStorage.key(i) == "Endless--lastTwoHues") {
            Grid.lastTwoHues = JSON.parse(localStorage.getItem("Endless--lastTwoHues"));
            continue;
          }
          var value = localStorage.getItem(localStorage.key(i));
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
            settings.set([localStorage.key(i).substr(9)], value);
          } catch (e) {
            console.warn("Setting \"" + localStorage.key(i).substr(9) + "\" from Local Storage doesn't exist");
          }
        }
    },

    saveDataToStorage: function() {
      for (var setting in Game.Settings)
        localStorage.setItem("Endless--" + setting, Game.Setting[setting]);
    },

    clearStorage: function() {;
      var reallyWannaDoThat = confirm("Do you really want to reset settings and score?");
      if (reallyWannaDoThat) {
        for (var i = 0; i < localStorage.length; i++)
          if (/^Endless--/.test(localStorage.key(i))) {
            localStorage.removeItem(localStorage.key(i));
            i--;
          }
        location.reload();
      }
    },

    vibrate: function(time) {
      if (!Game.Settings.vibrate)
        return;
      else if (navigator.vibrate)
        navigator.vibrate(time);
      else if (navigator.mozVibrate)
        navigator.mozVibrate(time);
      else if (navigator.webkitVibrate)
        navigator.webkitVibrate(time);
      else return false;
      return true;
    }
  }

  var EventHandlers = {
    mouseX: null, mouseY: null,


    init: function() {
      Graphics.canvas.addEventListener("mousedown", EventHandlers.MouseDown, false);
      Graphics.canvas.addEventListener("mouseup", EventHandlers.MouseUp, false);
      Graphics.canvas.addEventListener("mousemove", EventHandlers.MouseMove, false);
      Graphics.canvas.addEventListener("mouseout", EventHandlers.Blur, false);
      Graphics.canvas.addEventListener("blur", EventHandlers.Blur, false);
      Graphics.canvas.addEventListener("touchstart", EventHandlers.TouchStart, false);
      Graphics.canvas.addEventListener("touchend", EventHandlers.TouchEnd, false);
      Graphics.canvas.addEventListener("touchmove", EventHandlers.TouchMove, false);
      Graphics.canvas.addEventListener("touchcancel", EventHandlers.TouchCancel, false);
      window.onresize = function() {
        Graphics.updateCanvasSize();
        for (var screen in Game.Screens)
          Game.Screens[screen].onResize();
      }
    },

    MouseDown: function(event) {
      if (event.button != 0) {
        Grid.cancelSelection();
        return;
      }

      if (Game.menuObjectMouseover && Game.menuObjectMouseover.activate)
        Game.menuObjectMouseover.activate();

      if (Game.dotMouseover && !Game.dotSelection[0])
        Grid.startSelection(Game.dotMouseover);
    },

    MouseUp: function(event) {
      if ((event.button == 0 || event instanceof TouchEvent) && Game.selectingDots)
        Grid.endSelection();
    },

    MouseMove: function(event) {
      if (Game.selectingDots)
        EventHandlers.mouseX = event.clientX, EventHandlers.mouseY = event.clientY;

      if (Game.menuObjectMouseover = MenuObject.searchAtPosition(event.clientX, event.clientY)) {
        Game.dotMouseover = null;
        if (Game.menuObjectMouseover.activate)
          Graphics.canvas.style.cursor = "pointer";
        if (Game.selectingDots)
          Grid.cancelSelection();
      } else if (Game.dotMouseover = Grid.searchAtPosition(event.clientX, event.clientY)) {
        Game.menuObjectMouseover = null;
        if (Game.playing && !Game.paused) {
          Graphics.canvas.style.cursor = "pointer";
          if (Game.selectingDots)
            Grid.handleDotMouseover(Game.dotMouseover);
        }
      } else {
        Graphics.canvas.removeAttribute("style");
      }
    },

    TouchStart: function(event) {
      var x, y;
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          x = event.changedTouches[i].pageX, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      var menuObject;
      if ((menuObject = MenuObject.searchAtPosition(x, y)) && menuObject.activate) {
        event.preventDefault();
        menuObject.activate();
      } else if (Game.playing && !Game.Screens.main.visible) {
        event.preventDefault();
        if (Game.dotSelection[0] = Grid.searchAtPosition(x, y))
          Grid.startSelection(Game.dotSelection[0]);
      }
    },

    TouchEnd: function(event) {
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          EventHandlers.MouseUp(event);
    },

    TouchMove: function(event) {
      var x, y;
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          x = event.changedTouches[i].pageX, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      if (Game.selectingDots) {
        if (MenuObject.searchAtPosition(x, y)) {
          Grid.cancelSelection();
          return;
        }
        EventHandlers.mouseX = x, EventHandlers.mouseY = y;
        if (Game.dotMouseover = Grid.searchAtPosition(x, y)) {
          event.preventDefault();
          Grid.handleDotMouseover(Game.dotMouseover);
        }
      }
    },

    TouchCancel: function(event) {
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0 && Game.selectingDots)
          Grid.cancelSelection();
    },

    Blur: function () {
      if (Game.selectingDots)
        Grid.cancelSelection();
    }
  };

  var Graphics = {
    canvas: null,
    ctx: null,
    dotSize: 0,

    init: function() {
      Graphics.canvas = document.getElementsByTagName("canvas")[0];
      Graphics.ctx = Graphics.canvas.getContext("2d");
      Graphics.updateCanvasSize();
      Grid.calculateDimensions();
      Grid.generateDots();

      var main =    Game.Screens.main =    new Screen(),
          playing = Game.Screens.playing = new Screen();

      main.add([
        "title",      new MenuObject("endless",      0.5, 0.30,    0,   0, 256),
        "subtitle",   new MenuObject("By Tom Genco", 0.5, 0.30,  200, 130,  64),
        "play",       new MenuObject("Play",         0.5, 0.65, -150,   0, 128, Game.play),
        "reset",      new MenuObject("Reset",        0.5, 0.65,  150,   0, 128, Util.clearStorage),
        "siteLink",   new MenuObject("tomgenco.com",   0,    1,   15,  -5,  64, function() { window.location.href = "http://tomgenco.com"; }),
        "sourceLink", new MenuObject("Source code",    1,    1,  -15,  -5,  64, function() { window.location.href = "http://github.com/TomGenco/Endless"; })
      ]);
      playing.add([
        "menu",           new MenuObject("Menu",       0,    0,   15,   0, 128),
        "score",          new MenuObject(Game.score,   1,    0,  -15,   0, 128),
        "scoreIndicator", new MenuObject("hi",         1,    0,  -15, 130, 128),
        "grid",           Grid,
        "siteLink",       main.contents.siteLink,
        "sourceLink",     main.contents.sourceLink
      ]);

      playing.contents.scoreIndicator.visible = false;
      playing.contents.menu.activate = function() { Game.paused = true, main.show(); };

      if (Game.Settings.animations) {
        var i = 0;
        for (var object in main.contents)
          main.contents[object].transition = new Transition(main.contents[object], "opacity", 0, 1, 2000, i++ * 250);

        playing.contents.menu.transition =  new Transition(playing.contents.menu,  "fixedOffsetY", -128, 10, 1000, 100, "logistic");
        playing.contents.score.transition = new Transition(playing.contents.score, "fixedOffsetY", -128, 10, 1000, 150, "logistic");
    }
      main.show();
      requestAnimationFrame(Graphics.draw);
    },

    updateCanvasSize: function() {
      Graphics.canvas.setAttribute("width", window.innerWidth);
      Graphics.canvas.setAttribute("height", window.innerHeight);
    },

    // Calls each drawing function every frame, if needed.
    draw: function() {
      Graphics.ctx.clearRect(0,0,Graphics.canvas.width,Graphics.canvas.height);

      if (Game.Screens.playing.visible)
        Game.Screens.playing.draw();
      if (Game.Screens.main.visible)
        Game.Screens.main.draw();


      requestAnimationFrame(Graphics.draw);
    }
  }

  function Screen() {
    this.contents    = {};
    this.initialized = false
    this.visible     = false;
    this.overlay     = false;

    this.add = function(name, object) {
      if (Array.isArray(arguments[0])) {
        for (var i = 0; i < arguments[0].length; i+=2)
          this.add(arguments[0][i], arguments[0][i + 1]);
        return;
      }

      if (!object.draw)
        console.error(name + " needs a draw function.");
      else
        this.contents[name] = object;
    }

    this.draw = function() {
      if (this.overlay) {
        Graphics.ctx.fillStyle = "rgba(0,0,0,.75)";
        Graphics.ctx.fillRect(0, 0, Graphics.canvas.width, Graphics.canvas.height);
      }

      for (var object in this.contents)
        if (this.contents[object].visible)
          this.contents[object].draw();
    }

    this.initialize = function() {
      if (Game.Settings.animations)
        for (var object in this.contents)
          if (this.contents[object].visible && !this.contents[object].transition.started)
            this.contents[object].transition.start();
      this.initialized = true;
    }

    this.onResize = function () {
      for (var object in this.contents)
        if (this.contents[object].calculateDimensions)
          this.contents[object].calculateDimensions();
    }

    this.show = function() {
      if (!this.initialized)
        this.initialize();
      this.visible = true;
    }

    this.hide = function() {
      this.visible = false;
    }
  }

  var Grid = {
    gridX: null, gridY: null, width: null, height: null, dots: [], lastTwoHues: [], visible: true, importing: false,

    transition: {
      started: false,
      start: function() {
        for (var i = 0; i < Grid.dots.length; i++)
          for (var j = 0; j < Grid.dots[i].length; j++)
            if (Grid.dots[i][j] && Game.Settings.animations)
              Grid.dots[i][j].transition.start();
      }
    },

    generateDots: function() {
      var delay = 0, updateDelay;
      for (var col = 0; col < Game.Settings.columns; col++) {
        if (Grid.dots[col] == undefined)
          Grid.dots[col] = [];
        updateDelay = false;
        for (var row = 0; row < Game.Settings.rows; row++)
          if (!Grid.dots[col][row]) {
            var hue;
            while ("I still feel like it") {
              hue = Math.floor(Math.random() * Game.Settings.dotColors) * (360 / Math.floor(Game.Settings.dotColors));
              if (Game.Settings.dotColors < 3 ||
                (hue != Grid.lastTwoHues[0] &&
                 hue != Grid.lastTwoHues[1]))
                 break;
            }
            Grid.dots[col][row] = new Dot(hue, col, row,
              Grid.gridX + Graphics.dotSize / 2 + col * Graphics.dotSize * 2,
              Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2);
            if (Game.Settings.animations)
              Grid.dots[col][row].transition = new Transition(
                Grid.dots[col][row],
                "y",
                -Graphics.dotSize / 2 - Graphics.dotSize / 2 * (Game.Settings.rows - 1 - row),
                Grid.dots[col][row].y,
                500 + delay * 100, 0, "logistic"
              );
            if (!updateDelay)
              updateDelay = true;
          }
        if (updateDelay)
          delay++;
      }
      if (Grid.importing) {
        Grid.importing = false;
        Grid.importFromJSON();
      } else
        Grid.exportToJSON();
    },

    fillNulls: function() {
      // Iterate through each spot in Grid.dots[][], from the bottom to top
      for (var row = Grid.dots[0].length - 1; row >= 0; row--)
        for (var col = 0; col < Grid.dots.length; col++)
          // If that spot is null, try to pull the next non-null dot above it
          if (Grid.dots[col][row] == null) {
            var countNulls = 0;
            // Count how many nulls there are from this position upward
            while (row - countNulls >= 0)
              if (Grid.dots[col][row - countNulls] == null)
                countNulls++;
              else break;
            // If there is a dot above this position, drop it into it's new spot
            if (row - countNulls >= 0) {
              Grid.dots[col][row] = Grid.dots[col][row - countNulls];
              Grid.dots[col][row - countNulls] = null;
              Grid.dots[col][row].row = row;
              if (Game.Settings.animations) {
                Grid.dots[col][row].transition = new Transition(
                  Grid.dots[col][row],
                  "y",
                  Grid.gridY + Graphics.dotSize / 2 + (row - countNulls) * Graphics.dotSize * 2,
                  Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2,
                  400, 0, "logistic");
                Grid.dots[col][row].draw.finished = false;
                Grid.dots[col][row].transition.start();
              } else {
                Grid.dots[col][row].y = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
              }
            }
          }

      Grid.generateDots();
      Grid.transition.start();

    },

    draw: function() {
      // Run each dot's transitions if needed
      for (var i = 0; i < Grid.dots.length; i++)
        for (var j = 0; j < Grid.dots[i].length; j++)
          if (Grid.dots[i][j]) {
            if (Game.Settings.animations)
              Grid.dots[i][j].transition.update();
            Grid.dots[i][j].draw();
          }

      if (Game.selectingDots)
        Grid.drawSelectionLine();
    },

    drawSelectionLine: function() {
      Graphics.ctx.strokeStyle = "hsla(" + (Game.dotSelection[0].hue + Game.Settings.hueShift % 360) + ", 100%, 50%, 1)";
      Graphics.ctx.lineWidth = Graphics.dotSize / 3;
      Graphics.ctx.lineJoin = "round";
      Graphics.ctx.beginPath();
      Graphics.ctx.moveTo(Game.dotSelection[0].x, Game.dotSelection[0].y);
      for (var i = 0; i < Game.dotSelection.length; i++)
        Graphics.ctx.lineTo(Game.dotSelection[i].x, Game.dotSelection[i].y)
      Graphics.ctx.lineTo(EventHandlers.mouseX, EventHandlers.mouseY);
      Graphics.ctx.stroke();
    },

    calculateDimensions: function() {
      // This will need some work (what if grid isn't a square?)
      Graphics.dotSize = (Math.min(Graphics.canvas.height, Graphics.canvas.width)) /
        (Math.max(Game.Settings.rows, Game.Settings.columns) * 2.4);

      Grid.width = Game.Settings.columns * Graphics.dotSize * 2 - Graphics.dotSize;
      Grid.height = Game.Settings.rows * Graphics.dotSize * 2 - Graphics.dotSize;
      Grid.gridX = window.innerWidth / 2 - Grid.width / 2;
      Grid.gridY = window.innerHeight / 2 - Grid.height / 2;

      this.calculateDotPositions();
    },

    calculateDotPositions: function() {
      for (var col = 0; col < Grid.dots.length; col++)
        for (var row = 0; row < Grid.dots[col].length; row++) {
          Grid.dots[col][row].x = Grid.gridX + Graphics.dotSize / 2 + col * Graphics.dotSize * 2;
          Grid.dots[col][row].y = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
          if (Game.Settings.animations)
            if (Grid.dots[col][row].transition.started) {
              Grid.dots[col][row].transition.endVal = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
              Grid.dots[col][row].transition.finished = true;
            } else {
              Grid.dots[col][row].transition.endVal = Grid.gridY + Graphics.dotSize / 2 + row * Graphics.dotSize * 2;
              Grid.dots[col][row].transition.distance = Grid.dots[col][row].transition.endVal - Grid.dots[col][row].transition.startVal;
            }
        }
    },

    searchAtPosition: function(mouseX, mouseY) {
      var gridPosX = mouseX - Grid.gridX + Graphics.dotSize / 2,
          gridPosY = mouseY - Grid.gridY + Graphics.dotSize / 2;

      if (gridPosX > 0 && gridPosX < Grid.width  + Graphics.dotSize &&
          gridPosY > 0 && gridPosY < Grid.height + Graphics.dotSize) {
        var dot = Grid.dots[
           Math.floor(gridPosX / ((Grid.width  + Graphics.dotSize) / Game.Settings.columns))]
          [Math.floor(gridPosY / ((Grid.height + Graphics.dotSize) / Game.Settings.rows))
        ];

        if (dot && Math.sqrt(Math.pow(dot.x - mouseX, 2) + Math.pow(dot.y - mouseY, 2)) < Graphics.dotSize / 2 * 1.75)
          return dot;
      }
      return false;
    },

    checkConnection: function(dot1, dot2) {
      return dot2 && dot1.hue == dot2.hue && !dot2.selected &&
        Math.abs(dot2.col - dot1.col) < 2 && Math.abs(dot2.row - dot1.row) < 2;
    },

    cleanUp: function() {
      // Remove any dot that shouldn't exist
      for (var col = dots.length - 1; col >= 0; col--)
        if (col >= Game.Settings.columns)
          dots.pop();
        else
          for (var row = Grid.dots[col].length - 1; row >= Game.Settings.rows; row--)
            Grid.dots[col].pop();

      Grid.generateDots();
    },

    importFromJSON: function(gridString) {
      var grid = JSON.parse(localStorage.getItem("Endless--grid"));
      for (var col = 0; col < grid.length; col++)
        for (var row = 0; row < grid[0].length; row++)
          Grid.dots[col][row].hue = grid[col][row].hue;
    },

    exportToJSON: function() {
      var grid = [];
      for (var col = 0; col < Grid.dots.length; col++) {
        grid[col] = [];
        for (var row = 0; row < Grid.dots[0].length; row++)
          grid[col][row] = {
            hue: Grid.dots[col][row].hue
          };
      }
      localStorage.setItem("Endless--grid", JSON.stringify(grid));
    },

    startSelection: function(dot) {
      EventHandlers.mouseX = undefined;
      EventHandlers.mouseY = undefined;
      Game.selectingDots = true;
      Game.dotSelection[0] = dot;
      dot.selected = true;
      if (Game.Settings.vibrate)
        Util.vibrate(30);
    },

    endSelection: function() {
      Game.updateScoreIndicator(0);
      Game.selectingDots = false;
      if (Game.dotSelection.length > 1) {
        Grid.lastTwoHues[1] = Grid.lastTwoHues[0];
        Grid.lastTwoHues[0] = Game.dotSelection[0].hue;
        Game.dotSelectionHue = Game.dotSelection[0].hue;
        var dotsCleared = 0;
        for (var i = 0; i < Game.dotSelection.length; i++) {
          Grid.dots[Game.dotSelection[i].col][Game.dotSelection[i].row] = null;
          dotsCleared++;
        }
        Game.updateScore(dotsCleared);
        Grid.fillNulls();
        Util.vibrate([20, 40, 20]);
      } else
        Game.dotSelection[0].selected = false;
      Game.dotSelection = [];
    },

    cancelSelection: function() {
      Game.updateScoreIndicator(0);
      Game.selectingDots = false;
      for (var i = 0; i < Game.dotSelection.length; i++)
        Game.dotSelection[i].selected = false;
      Game.dotSelection = [];
    },

    handleDotMouseover: function(dot) {
      if (dot == Game.dotSelection[Game.dotSelection.length - 2]) {
        Game.dotSelection.pop().selected = false;
        Game.updateScoreIndicator(Game.dotSelection.length);
      } else if (Grid.checkConnection(Game.dotSelection[Game.dotSelection.length - 1], dot)) {
        dot.selected = true;
        Game.dotSelection.push(dot);
        Game.updateScoreIndicator(Game.dotSelection.length);
        if (Game.Settings.vibrate)
          Util.vibrate(20);
      }
    }

  }

  function Dot(hue, column, row, x, y) {
    this.hue = hue;
    this.col = column;
    this.row = row;
    this.x = x;
    this.y = y;
    this.transition;
    this.selected = false;

    this.draw = function() {
      Graphics.ctx.fillStyle = "hsla(" +
        (this.hue + Game.Settings.hueShift % 360) + ", " + // Hue
        (this.selected? "100%" : "60%") + ", " +               // Saturation
        (this.selected? "50%"  : "60%") + ", " +               // Lightness
         "1)";                                   // Alpha (opacity)
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, Graphics.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    }
  }

  function MenuObject(text, relativeX, relativeY, fixedOffsetX, fixedOffsetY, fontSize, activate) {
    this.fixedOffsetX = fixedOffsetX;
    this.fixedOffsetY = fixedOffsetY;
    this.activate = activate;
    this.opacity = 1;
    this.transition;
    this.visible = true
    this.text = text;
    this.hue = 0;
    this.saturation = 100;
    this.lightness = 100;
    var width, height, align, baseline, menuX, menuY;

    this.inRange = function(mouseX, mouseY) {
      return mouseX > menuX && mouseX < menuX + width &&
             mouseY > (menuY - fontSize / 10) && mouseY < menuY + height;
    }

    this.draw = function() {
      if (this.transition)
        this.transition.update();

      Graphics.ctx.textAlign = align;
      Graphics.ctx.textBaseline = baseline;
      Graphics.ctx.font = (fontSize >= 64 ? "100 " : "300 ") + fontSize + "px Josefin Sans";
      Graphics.ctx.globalAlpha = this.opacity;
      Graphics.ctx.fillStyle = "hsl(" + this.hue + "," + this.saturation + "%," + this.lightness + "%)";
      Graphics.ctx.fillText(this.text, relativeX * Graphics.canvas.width + this.fixedOffsetX, relativeY * Graphics.canvas.height + this.fixedOffsetY);
      // Graphics.ctx.strokeRect(menuX, menuY - fontSize / 10, width, height + fontSize / 10);
    };

    this.calculateDimensions = function() {
      Graphics.ctx.font = (fontSize >= 64 ? "100 " : "300 ") + fontSize + "px Josefin Sans";
      width    = Graphics.ctx.measureText(text).width;
      height   = fontSize;
      align    = relativeX == 0 ? "left" : relativeX == 1 ? "right" : "center";
      baseline = relativeY == 0 ? "top" : relativeY == 1 ? "bottom" : "middle";

      switch (align) {
        case "center":
          menuX = relativeX * Graphics.canvas.width + fixedOffsetX - width / 2;
          break;
        case "left":
          menuX = relativeX * Graphics.canvas.width + fixedOffsetX;
          break;
        case "right":
          menuX = relativeX * Graphics.canvas.width + fixedOffsetX - width;
          break;
      }

      switch (baseline) {
        case "middle":
          menuY = relativeY * Graphics.canvas.height + fixedOffsetY - height / 2;
          break;
        case "top":
          menuY = relativeY * Graphics.canvas.height + fixedOffsetY;
          break;
        case "bottom":
          menuY = relativeY * Graphics.canvas.height + fixedOffsetY - height;
          break;
      }
    };
    this.calculateDimensions();

    MenuObject.searchAtPosition = function(mouseX, mouseY) {
      for (var screen in Game.Screens)
        for (var object in Game.Screens[screen].contents)
          if (Game.Screens[screen].contents[object].opacity && Game.Screens[screen].contents[object].inRange(mouseX, mouseY) &&
              Game.Screens[screen].visible)
            return Game.Screens[screen].contents[object];
    };
  }

  function Transition(object, property, startVal, endVal, duration, delay, motionType, callback) {
    this.object = object;
    this.startVal = startVal;
    this.endVal = endVal;
    this.duration = duration;
    this.delay = delay;
    this.property = property;
    this.motionType = motionType || "linear";
    this.finished = false;
    this.started = false;
    this.initTime = null;
    this.delta = null;
    this.distance = this.endVal - this.startVal;
    this.callback = callback;

    Object.defineProperty(this, "value", {
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
              console.error("Invalid motion type");
            case "linear":
              value = (this.delta / this.duration) * this.distance + this.startVal;
              return value > this.endVal ? this.endVal : value;
            case "logistic":
              return  1 / (1 + Math.pow(Math.E, -15 * (this.delta / this.duration - 0.5))) * this.distance + this.startVal;
          }
        }
      }
    });

    this.start = function() {
      if (this.started)
        return;
      this.started = true;
      this.finished = false;
      var that = this;
      setTimeout(function() {
        // Checks if this transition has been replaced before it's finished
        if (that == that.object.transition) {
          that.finished = true;
          that.object[that.property] = that.endVal;
          if (that.callback)
            that.callback();
        }
      }, that.delay + that.duration);
      this.initTime = Date.now();
    };

    this.update = function() {
      if (!this.finished)
        this.object[this.property] = this.value;
    }
  }

  Util.loadDataFromStorage();
  Graphics.init();
  EventHandlers.init();
}

Endless();
