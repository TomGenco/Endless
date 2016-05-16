function Endless() {
  "use strict";

  var Settings = {
    animations: true,
    vibrate: true,
    dotSizeRatio: 1,
  };

  var Game = {
    screen: undefined,
    mode: undefined,
    paused: false,

    modes: {
      endless: {
        settings: {
          columns: 5,
          dotColors: 5,
          hueShift: 60,
          rows: 6,
        },
        screen: undefined,
        playing: false,
        score: 0,
        grid: undefined,
        topMenuBar: undefined,

        textMouseover: undefined,
        dotMouseover: undefined,
        dotSelection: undefined,
        selectingDots: false,
        lastTwoHues: [],

        setupGraphics: function() {
          this.screen = new Screen();

          this.topMenuBar = new MenuBar(
            "score",          new Text(this.score, 0.01, 0.005, "left",  "top", 35),
            "scoreIndicator", new Text(undefined,     0, 0.005, "left",  "top", 35, {
              visible: false
            }),
            "menu",           new Text("Menu",     0.99, 0.005, "right", "top", 35, {
              activate: Game.pause
            })
          );
          this.topMenuBar.contents.scoreIndicator.putAfter(this.topMenuBar.contents.score);

          this.screen.add(
            "topMenuBar",   this.topMenuBar,
            "grid",         undefined,
            "dotSelection", undefined
          );
        },

        setupTransitions: function() {
          if (Settings.animations) {
            this.topMenuBar.contents.menu.transition =  new Transition(this.topMenuBar.contents.menu,  "y", -this.topMenuBar.height, 1000, 100, "logistic");
            this.topMenuBar.contents.score.transition = new Transition(this.topMenuBar.contents.score, "y", -this.topMenuBar.height, 1000, 100, "logistic");
            this.topMenuBar.transition =                new Transition(this.topMenuBar,                "y", -this.topMenuBar.height, 1000, 100, "logistic");
          }
        },

        setup: function() {
          if (localStorage.getItem("Endless--grid")) {
            localStorage.setItem("Endless.endless.grid", localStorage.getItem("Endless--grid"));
            localStorage.removeItem("Endless--grid");
          }
          if (localStorage.getItem("Endless--lastTwoHues")) {
            localStorage.setItem("Endless.endless.lastTwoHues", localStorage.getItem("Endless--lastTwoHues"));
            localStorage.removeItem("Endless--lastTwoHues");
          }
          if (localStorage.getItem("Endless--score")) {
            localStorage.setItem("Endless.endless.score", localStorage.getItem("Endless--score"));
            localStorage.removeItem("Endless--score");
          }

          this.score = parseFloat(localStorage.getItem("Endless.endless.score"));
          if (!this.score)
            this.score = 0;

          this.topMenuBar.contents.score.setText(this.score);

          this.lastTwoHues = JSON.parse(localStorage.getItem("Endless.endless.lastTwoHues"));
          if (!this.lastTwoHues)
            this.lastTwoHues = [];

          this.grid = this.screen.contents.grid = new Grid(
            this.screen,
            this.settings.columns,
            this.settings.rows,
            this.settings.dotColors,
            {
              hueShift:    this.settings.hueShift,
              lastTwoHues: this.lastTwoHues,
              jsonGrid:    localStorage.getItem("Endless.endless.grid")
            }
          );

          this.dotSelection = this.screen.contents.dotSelection = new DotSelection(this.grid);
        },

        pause: function() {
          Transition.pauseAllTransitions();
        },

        play: function() {
          Transition.startAllTransitions();
        },

        end: function() {
          Transition.cancelAllTransitions();
          this.playing = false;
          this.screen.visible = false;
          return true;
        },

        mouseDown: function(event) {
          if (event.button != 0)
            this.cancelSelection();
          else if (this.textMouseover && this.textMouseover.activate)
            this.textMouseover.activate();
          else if (this.dotMouseover && !this.dotSelection.selection[0])
            this.startSelection(this.dotMouseover);
        },

        mouseUp: function(event) {
          if (event.button == 0 && this.selectingDots)
            this.endSelection();
        },

        mouseMove: function(event) {
          if (this.selectingDots) {
            if (event.clientY < this.topMenuBar.height) {
              this.cancelSelection();
              return;
            }
            this.dotSelection.lastPosX = event.clientX - Graphics.canvas.offsetLeft;
            this.dotSelection.lastPosY = event.clientY;
          }

          if (this.textMouseover = Text.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) {
            this.dotMouseover = null;
            if (this.textMouseover.activate)
              Graphics.canvas.style.cursor = "pointer";
          } else if (this.dotMouseover = this.grid.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) {
            this.textMouseover = null;
            Graphics.canvas.style.cursor = "pointer";
            if (this.selectingDots)
              this.handleDotMouseover(this.dotMouseover);
          } else
            Graphics.canvas.style.cursor = "";
        },

        touchStart: function(event, x, y) {
          event.preventDefault();

          var text, dot;
          if ((text = Text.searchAtPosition(x, y)) && text.activate)
            text.activate();
          else if (dot = this.grid.searchAtPosition(x, y))
            this.startSelection(dot);
        },

        touchEnd: function(event, x, y) {
          if (this.selectingDots)
            this.endSelection();
        },

        touchMove: function(event, x, y) {
          if (this.selectingDots) {
            if (y < this.topMenuBar.height)
              this.cancelSelection();
            else {
              this.dotSelection.lastPosX = x, this.dotSelection.lastPosY = y;
              if (this.dotMouseover = this.grid.searchAtPosition(x, y)) {
                event.preventDefault();
                this.handleDotMouseover(this.dotMouseover);
              }
            }
          }
        },

        touchCancel: function(event, x, y) {
          if (this.selectingDots)
            this.cancelSelection();
        },

        blur: function(event) {
          if (this.selectingDots)
            this.cancelSelection();
        },

        startSelection: function(dot) {
          this.dotSelection.lastPosX = undefined;
          this.dotSelection.lastPosY = undefined;
          this.selectingDots = true;
          this.dotSelection.selection[0] = dot;
          this.dotSelection.hue = dot.hue;
          dot.selected = true;
          Util.vibrate(30);
        },

        endSelection: function() {
          this.topMenuBar.contents.menu.setText("Menu");
          this.selectingDots = false;
          if (this.dotSelection.selection.length > 1) {
            if (this.dotSelection.hue != null) {
              this.lastTwoHues[1] = this.lastTwoHues[0];
              this.lastTwoHues[0] = this.dotSelection.hue;
            }
            var dotsCleared = 0;
            for (var i = 0; i < this.dotSelection.selection.length; i++) {
              this.grid.dots[this.dotSelection.selection[i].col][this.dotSelection.selection[i].row] = null;
              dotsCleared++;
            }
            this.grid.fillNulls();
            this.updateScore();
            Util.vibrate([50, 100, 50]);
          } else
            this.dotSelection.selection[0].selected = false;
          this.dotMouseover = undefined;
          this.dotSelection.selection = [];
          this.updateScoreIndicator();
        },

        cancelSelection: function() {
          this.topMenuBar.contents.menu.setText("Menu");
          this.selectingDots = false;
          for (var i = 0; i < this.dotSelection.selection.length; i++)
            this.dotSelection.selection[i].selected = false;
          this.dotSelection.selection = [];
          this.updateScoreIndicator();
        },

        handleDotMouseover: function(dot) {
          if (dot == this.dotSelection.selection[this.dotSelection.selection.length - 2]) {
            this.dotSelection.hue = dot.hue;
            this.dotSelection.selection.pop().selected = false;
            this.dotSelection.hue = this.dotSelection.selection[this.dotSelection.selection.length - 1].hue;
            this.updateScoreIndicator();
          } else if (this.dotSelection.selection[this.dotSelection.selection.length - 1].canConnectTo(dot)) {
            this.dotSelection.hue = dot.hue;
            this.topMenuBar.contents.menu.setText("Cancel");
            dot.selected = true;
            this.dotSelection.selection.push(dot);
            this.updateScoreIndicator();
            Util.vibrate(20);
          }
        },

        updateScore: function() {
          for (var i = 0; i < this.dotSelection.selection.length; i++)
            this.score += this.dotSelection.selection[i].points;
          if (this.playing) {
            this.topMenuBar.contents.score.setText(this.score);
            if (Settings.animations && this.dotSelection.hue != null) {
              this.topMenuBar.contents.score.hue = this.dotSelection.hue + this.settings.hueShift % 360;
              this.topMenuBar.contents.score.lightness = 100;
              this.topMenuBar.contents.score.transition = new Transition(
                this.topMenuBar.contents.score,
                "lightness", 60, 800, 0);
              this.topMenuBar.contents.score.transition.start();
            }
          }
          localStorage.setItem("Endless.endless.score", this.score);
          localStorage.setItem("Endless.endless.lastTwoHues", JSON.stringify(this.lastTwoHues));
          localStorage.setItem("Endless.endless.grid", JSON.stringify(this.grid.toJson()));
        },

        updateScoreIndicator: function() {
          var possibleScore = 0;
          for (var i = 0; i < this.dotSelection.selection.length; i++)
            possibleScore += this.dotSelection.selection[i].points;

          if (possibleScore > 3) {
            this.topMenuBar.contents.scoreIndicator.setText("+" + possibleScore);
            this.topMenuBar.contents.scoreIndicator.visible = true;
            this.topMenuBar.contents.scoreIndicator.hue = this.dotSelection.hue + this.settings.hueShift % 360;
            this.topMenuBar.contents.scoreIndicator.saturation = 60;
            this.topMenuBar.contents.scoreIndicator.lightness = 60;
          } else
            this.topMenuBar.contents.scoreIndicator.visible = false;
        }
      },

      speed: {
        settings: {
          columns: 5,
          dotColors: 5,
          hueShift: 60,
          rows: 6,
        },
        screens: {
          playing: undefined,
          end: undefined
        },
        screen: undefined,
        score: 0,
        started: false,
        playing: false,
        highScore: undefined,
        grid: undefined,
        topMenuBar: undefined,

        textMouseover: undefined,
        dotMouseover: undefined,
        dotSelection: undefined,
        selectingDots: false,
        lastTwoHues: [],

        setupGraphics: function() {
          this.highScore = parseFloat(localStorage.getItem("Endless.speed.highScore"));
          if (!this.highScore)
            this.highScore = 0;

          this.screen = this.screens.playing = new Screen();
          this.screens.end = new Screen();

          this.topMenuBar = new MenuBar(
            "replay",         new Text("Replay",  0.01, 0.005, "left",   "top", 35, {
              activate: this.setup.bind(this)
            }),
            "score",          new Text("undefined", 0.01, 0.005, "left",   "top", 35),
            "timer",          new Text(60,         0.5, 0.005, "center", "top", 35),
            "menu",           new Text("Menu",    0.99, 0.005, "right",  "top", 35, {
              activate: Game.pause
            }),
            "scoreIndicator", new Text("undefined",    0, 0.005, "left",   "top", 35, {
              visible: false
            })
          );
          this.topMenuBar.contents.scoreIndicator.putAfter(this.topMenuBar.contents.score);

          this.screens.playing.add(
            "grid",         undefined,
            "dotSelection", undefined,
            "countDown",    new Text(0, 0.5, 0.5, "center", "middle", 100),
            "topMenuBar",   this.topMenuBar
          );

          this.screens.end.add(
            "topMenuBar", this.topMenuBar,
            "finalScore", new Text("error",                         0.5, 0.35, "center", "middle", 30),
            "highScore",  new Text("High Score: " + this.highScore, 0.5, 0.65, "center", "middle", 30)
          );
        },

        setupTransitions: function() {
          if (Settings.animations) {
            this.topMenuBar.contents.menu.transition =  new Transition(this.topMenuBar.contents.menu,  "y",    -this.topMenuBar.height, 1000, 100, "logistic");
            this.topMenuBar.contents.score.transition = new Transition(this.topMenuBar.contents.score, "y",    -this.topMenuBar.height, 1000, 100, "logistic");
            this.topMenuBar.contents.timer.transition = new Transition(this.topMenuBar.contents.timer, "y",    -this.topMenuBar.height, 1000, 100, "logistic");
            this.topMenuBar.transition =                new Transition(this.topMenuBar,                "y",    -this.topMenuBar.height, 1000, 100, "logistic");
          }
        },

        setup: function() {
          this.screen = this.screens.playing;
          this.score = 0;

          this.lastTwoHues = [];

          this.grid = this.screen.contents.grid = new Grid(
            this.screen,
            this.settings.columns,
            this.settings.rows,
            this.settings.dotColors,
            {
              hueShift:      this.settings.hueShift,
              lastTwoHues:   this.lastTwoHues,
              enabled:       false,
              rowDelay:      90,
              columnDelay:   300,
              animationTime: 1000
            }
          );

          this.dotSelection = this.screen.contents.dotSelection = new DotSelection(this.grid);

          this.screen.contents.countDown.visible = true;
          this.screen.contents.countDown.transition = new Transition(this.screen.contents.countDown, "text", 3, 3000, 0, "countDown", this.start.bind(this));
          this.screens.playing.contents.countDown.transition.start();

          this.topMenuBar.contents.replay.visible = false;
          this.topMenuBar.contents.score.visible = true;
          this.topMenuBar.contents.timer.visible = true;
          this.topMenuBar.contents.timer.setText(60);
          this.topMenuBar.contents.score.setText(0);

          this.screen.show();
        },

        start: function() {
          this.started = true;
          this.topMenuBar.contents.timer.setText(0);
          this.topMenuBar.contents.timer.transition = new Transition(this.topMenuBar.contents.timer, "text", 60, 60000, 0, "countDown", this.stop.bind(this));
          this.topMenuBar.contents.timer.visible = true;
          this.grid.enabled = true;
          this.screens.playing.contents.countDown.visible = false;

          this.grid.rowDelay =       0;
          this.grid.columnDelay =    50;
          this.grid.animationTime =  500;
        },

        stop: function() {
          if (this.selectingDots)
            this.endSelection();
          this.started = false;
          this.grid.enabled = false;
          this.screens.playing.contents.countDown.setText(0);
          this.topMenuBar.contents.score.visible = false;
          this.topMenuBar.contents.replay.visible = true;
          this.topMenuBar.contents.timer.visible = false;
          this.screens.playing.hide();
          this.screen = this.screens.end;

          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.screen.contents.highScore.setText("High Score: " + this.highScore);
            localStorage.setItem("Endless.speed.highScore", this.highScore);
          }
          this.screen.contents.finalScore.setText("Final Score: " + this.score);
          this.screen.show();
        },

        pause: function() {
          this.grid.enabled = false;
          Game.modes.endless.pause.call(this);
        },

        play: function() {
          if (this.started) {
            this.screen.contents.countDown.visible = true;
            this.screen.contents.countDown.setText(0);
            for (var i = 0; i < this.grid.dots.length; i++)
              for (var j = 0; j < this.grid.dots[i].length; j++)
                if (Settings.animations && this.grid.dots[i][j].transition)
                  this.grid.dots[i][j].transition.start();
            if (this.topMenuBar.contents.score.transition)
              this.topMenuBar.contents.score.transition.start();

            this.screen.contents.countDown.transition = new Transition(this.screen.contents.countDown, "text", 2, 2000, 0, "countDown", (function () {
              this.grid.enabled = true;
              this.screens.playing.contents.countDown.visible = false;
              Game.modes.endless.play.call(this);
            }).bind(this));
            this.screens.playing.contents.countDown.transition.start();
          } else
            Game.modes.endless.play.call(this);
        },

        end: function() {
          if (!this.playing)
            return true;
          if (this.started && !confirm("Are you sure you want to leave mid-game?"))
            return false;
          this.stop();
          return Game.modes.endless.end.call(this);
        },

        mouseDown:            function(event) {       Game.modes.endless.mouseDown.call(this, event); },
        mouseUp:              function(event) {       Game.modes.endless.mouseUp.call(this, event); },
        mouseMove:            function(event) {       Game.modes.endless.mouseMove.call(this, event); },
        touchStart:           function(event, x, y) { Game.modes.endless.touchStart.call(this, event, x, y); },
        touchEnd:             function(event, x, y) { Game.modes.endless.touchEnd.call(this, event, x, y); },
        touchMove:            function(event, x, y) { Game.modes.endless.touchMove.call(this, event, x, y); },
        touchCancel:          function(event, x, y) { Game.modes.endless.touchCancel.call(this, event, x, y); },
        blur:                 function(event) {       Game.modes.endless.blur.call(this, event); },
        startSelection:       function(dot) {         Game.modes.endless.startSelection.call(this, dot); },
        endSelection:         function() {            Game.modes.endless.endSelection.call(this); },
        cancelSelection:      function() {            Game.modes.endless.cancelSelection.call(this); },
        handleDotMouseover:   function(dot) {         Game.modes.endless.handleDotMouseover.call(this, dot); },
        updateScoreIndicator: function() {            Game.modes.endless.updateScoreIndicator.call(this); },

        // TODO: Find a way to remove localStorage stuff from modes.endless.updateScore so I can resuse it here
        updateScore: function() {
          for (var i = 0; i < this.dotSelection.selection.length; i++)
            this.score += this.dotSelection.selection[i].points;
          if (this.playing) {
            this.topMenuBar.contents.score.setText(this.score);
            if (Settings.animations && this.dotSelection.hue != null) {
              this.topMenuBar.contents.score.hue = this.dotSelection.hue + this.settings.hueShift % 360;
              this.topMenuBar.contents.score.lightness = 100;
              this.topMenuBar.contents.score.transition = new Transition(
                this.topMenuBar.contents.score,
                "lightness", 60, 800, 0);
              this.topMenuBar.contents.score.transition.start();
            }
          }
        }
      }
    },

    play: function() {
      if (!Game.mode.playing) {
        for (var object in Game.screen.contents) {
          if (Game.screen.contents[object].transition)
            Game.screen.contents[object].transition.finish();
        }
        Game.mode.playing = true;
        Game.mode.screen.show();
        Game.mode.setup();
        Game.screen.overlay = true;
      }
      Game.mode.play();
      Game.paused = false;
      Game.screen.hide();
    },

    pause: function() {
      Game.paused = true;
      Game.screen.show();
      Game.mode.pause();
    },
  };

  var Util = {
    loadDataFromStorage: function() {
      for (var i = 0; i < localStorage.length; i++) {
        if ((localStorage.key(i)) == "Endless--score")
          localStorage.setItem("Endless.endless.score", localStorage.getItem("Endless--score"));
        if (/^Endless\./.test(localStorage.key(i))) {
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
            Settings[localStorage.key(i).substr(9)] = value;
          } catch (e) {
            console.warn("Setting \"" + localStorage.key(i).substr(9) + "\" from Local Storage doesn't exist");
          }
        }
      }
    },

    saveDataToStorage: function() {
      for (var setting in Game.Settings)
        localStorage.setItem("Endless." + setting, Game.Setting[setting]);
    },

    clearStorage: function() {;
      if (confirm("Do you really want to reset settings and score?")) {
        for (var i = 0; i < localStorage.length; i++)
          if (/^Endless/.test(localStorage.key(i))) {
            localStorage.removeItem(localStorage.key(i));
            i--;
          }
        location.reload();
      }
    },

    vibrate: function(time) {
      if (!Settings.vibrate)
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
  };

  var EventHandlers = {
    mouseX: null, mouseY: null, textMouseover: null,

    setup: function() {
      window.addEventListener("mousedown", EventHandlers.MouseDown, false);
      window.addEventListener("mouseup", EventHandlers.MouseUp, false);
      window.addEventListener("mousemove", EventHandlers.MouseMove, false);
      window.addEventListener("blur", EventHandlers.Blur, false);
      window.addEventListener("touchstart", EventHandlers.TouchStart, false);
      window.addEventListener("touchend", EventHandlers.TouchEnd, false);
      window.addEventListener("touchmove", EventHandlers.TouchMove, false);
      window.addEventListener("touchcancel", EventHandlers.TouchCancel, false);
      window.addEventListener("resize", function() {
        Graphics.updateCanvasSize();
        Game.screen.onResize();
        // TODO: only resize the current one, and make sure the others do only when they need to
        for (var mode in Game.modes)
          Game.modes[mode].screen.onResize();
      });
    },

    MouseDown: function(event) {
      if (!Graphics.ready)
        return;

      if (Game.screen.visible) {
        if (event.button == 0 && EventHandlers.textMouseover && EventHandlers.textMouseover.activate)
          EventHandlers.textMouseover.activate();
      } else if (Game.mode)
        Game.mode.mouseDown(event);
    },

    MouseUp: function(event) {
      if (!Graphics.ready)
        return;

      if (!Game.screen.visible && Game.mode)
        Game.mode.mouseUp(event);
    },

    MouseMove: function(event) {
      if (!Graphics.ready)
        return;

      if (Game.screen.visible) {
        if ((EventHandlers.textMouseover = Text.searchAtPosition(event.clientX - Graphics.canvas.offsetLeft, event.clientY)) &&
            EventHandlers.textMouseover.activate)
          Graphics.canvas.style.cursor = "pointer";
        else
          Graphics.canvas.style.cursor = "";
      } else if (Game.mode)
        Game.mode.mouseMove(event);
    },

    TouchStart: function(event) {
      event.stopPropagation();
      if (!Graphics.ready)
        return;

      var x, y;
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          x = event.changedTouches[i].pageX - Graphics.canvas.offsetLeft, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      if (Game.screen.visible) {
        var text;

        if ((text = Text.searchAtPosition(x, y)) && text.activate) {
          event.preventDefault();
          text.activate();
        }
      } else if (Game.mode)
        Game.mode.touchStart(event, x, y);
    },

    TouchEnd: function(event) {
      event.stopPropagation();
      if (!Graphics.ready)
        return;

      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0 && Game.mode)
          Game.mode.touchEnd(event);
    },

    TouchMove: function(event) {
      if (!Graphics.ready)
        return;

      var x, y;
      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0)
          x = event.changedTouches[i].pageX - Graphics.canvas.offsetLeft, y = event.changedTouches[i].pageY;
      if (x == undefined)
        return;

      if (!Game.screen.visible && Game.mode)
        Game.mode.touchMove(event, x, y);
    },

    TouchCancel: function(event) {
      if (!Graphics.ready)
        return;

      for (var i = 0; i < event.changedTouches.length; i++)
        if (event.changedTouches[i].identifier == 0 && Game.mode)
          Game.mode.touchCancel(event)
    },

    Blur: function () {
      if (!Graphics.ready)
        return;

      if (!Game.screen.visible && Game.mode)
        Game.mode.blur(event);
    }
  };

  var Graphics = {
    ready: false,
    canvas: null,
    ctx: null,

    setup: function() {
      Graphics.canvas = document.getElementsByTagName("canvas")[0];
      Graphics.ctx = Graphics.canvas.getContext("2d");
      Graphics.updateCanvasSize();

      for (var mode in Game.modes)
        Game.modes[mode].setupGraphics();

      Game.screen = new Screen();
      Game.screen.add(
        "title",      new Text("endless",       0.5,   0.3, "center", "middle",  100),
        "subtitle",   new Text("by Tom Genco",  0.5,     0, "center", "top"   ,   25),
        "playSpeed",  new Text("Play Speed",    0.5,   0.6, "center", "middle",   25, {
          activate: function () {
            if (Game.modes.endless.playing && !Game.modes.endless.end())
              return;
            Game.mode = Game.modes.speed;
            Game.play();
          }
        }),
        "play",       new Text("Play",          0.3,   0.8, "center", "middle",   35, {
          activate: function () {
            if (Game.modes.speed.playing && !Game.modes.speed.end())
              return;
            Game.mode = Game.modes.endless;
            Game.play();
          }
        }),
        "reset",      new Text("Reset",         0.7,   0.8, "center", "middle",   35, {
          activate: Util.clearStorage
        }),
        "siteLink",   new Text("tomgenco.com", 0.02, 0.995, "left",   "bottom",   25, {
          activate: function() { window.location.href = "http://tomgenco.com"; }
        }),
        "sourceLink", new Text("Source code",  0.98, 0.995, "right",  "bottom",   25, {
          activate: function() { window.location.href = "http://github.com/TomGenco/Endless"; }
        })
      );
      Game.screen.contents.subtitle.putBelow(Game.screen.contents.title);

      if (Settings.animations) {
        var i = 0;
        for (var object in Game.screen.contents)
          Game.screen.contents[object].transition = new Transition(Game.screen.contents[object], "opacity", 0, 2000, i++ * 250);
      }

      document.getElementsByTagName("h1")[0].innerHTML = "Loading Font";
      WebFont.load({
        google: {
          families: ["Josefin Sans:300"]
        },
        active: function () {
          Game.screen.onResize();
          for (var mode in Game.modes) {
            for (var screen in Game.modes[mode].screens) {
              Game.modes[mode].screens[screen].onResize();
            }
            Game.modes[mode].setupTransitions();
          }
          Game.screen.show();
          requestAnimationFrame(Graphics.draw);
          Graphics.ready = true;
          document.getElementsByTagName("h1")[0].style.display = "none";
        }
      });
    },

    updateCanvasSize: function() {
      Graphics.canvas.setAttribute("height", window.innerHeight);
      if (window.innerWidth > window.innerHeight) {
        var canvasWidth = Math.min(window.innerHeight, 980);
        Graphics.canvas.setAttribute("width", canvasWidth);
        Graphics.canvas.style["margin-left"] = ((window.innerWidth - canvasWidth) / 2) + "px";
      } else {
        Graphics.canvas.setAttribute("width", window.innerWidth);
        Graphics.canvas.style["margin-left"] = 0;
      }
    },

    // Calls each drawing function every frame, if needed.
    draw: function() {
      Graphics.ctx.clearRect(0,0,Graphics.canvas.width,Graphics.canvas.height);

      for (var modes in Game.modes)
        if (Game.modes[modes].screen.visible)
          Game.modes[modes].screen.draw();
      if (Game.screen.visible)
        Game.screen.draw();

      requestAnimationFrame(Graphics.draw);
    }
  }

  function Screen() {
    this.contents    = {},
    this.topMenuBar  = null,
    this.interactive = [],
    this.initialized = false
    this.visible     = false,
    this.overlay     = false,
    this.y           = 0;

    this.add = function() {
      for (var i = 0; i < arguments.length; i+=2)
        if (arguments[i + 1] instanceof MenuBar) {
          this.topMenuBar = arguments[i + 1];
          this.topMenuBar.calculateDimensions();
          this.y = this.topMenuBar.y + this.topMenuBar.height;
          for (var object in this.topMenuBar.contents)
            if (this.topMenuBar.contents[object].activate)
              this.interactive.push(this.topMenuBar.contents[object]);
        } else {
          this.contents[arguments[i]] = arguments[i + 1];
          if (arguments[i + 1] && arguments[i + 1].activate)
            this.interactive.push(arguments[i + 1]);
        }
    }

    this.draw = function() {
      if (this.overlay) {
        Graphics.ctx.fillStyle = "rgba(20,20,20,.8)";
        Graphics.ctx.fillRect(0, 0, Graphics.canvas.width, Graphics.canvas.height);
      }

      for (var object in this.contents)
        if (this.contents[object].visible)
          this.contents[object].draw();

      if (this.topMenuBar)
        this.topMenuBar.draw();
    }

    this.initialize = function() {
      if (Settings.animations) {
        for (var object in this.contents)
          if (this.contents[object] &&
              this.contents[object].visible &&
              this.contents[object].transition &&
              this.contents[object].transition.autoStart &&
             !this.contents[object].transition.started)
            this.contents[object].transition.start();
        if (this.topMenuBar &&
            this.topMenuBar.transition &&
           !this.topMenuBar.transition.started)
          this.topMenuBar.transition.start();
      }
      this.initialized = true;
    }

    this.onResize = function () {
      if (this.topMenuBar) {
        this.topMenuBar.onResize();
        this.y = this.topMenuBar.y + this.topMenuBar.height;
      }
      for (var object in this.contents)
        if (this.contents[object] && this.contents[object].onResize)
          this.contents[object].onResize();
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

  function Grid(screen, cols, rows, colors, options) {
    this.cols = cols,
    this.rows = rows,
    this.dots = [],
    this.visible = true,
    this.enabled = true,
    this.hueShift = 0,
    this.lastTwoHues = [],
    this.rowDelay = 0,
    this.columnDelay = 50,
    this.animationTime = 500;
    this.jsonGrid = false;

    if (options)
      for (var option in options)
        this[option] = options[option];

    this.generateDots = function() {
      for (var col = 0; col < cols; col++) {
        if (!this.dots[col])
          this.dots[col] = [];
        for (var row = 0; row < rows; row++)
          if (!this.dots[col][row]) {
            if (Math.floor(Math.random() * 20) == 0)
              this.dots[col][row] = new SuperDot(this, col, row);
            else
              this.dots[col][row] = new ColorDot(this, col, row, {
                colors: colors,
                hueShift: this.hueShift,
                lastTwoHues: this.lastTwoHues
              });
          }
      }
    };

    this.calculateDimensions = function() {
      this.dotSize = Settings.dotSizeRatio * Math.min(
        Graphics.canvas.width / (cols * 2),
       (Graphics.canvas.height - screen.y) / (rows * 2));

      this.width = cols * this.dotSize * 2 - this.dotSize;
      this.height = rows * this.dotSize * 2 - this.dotSize;
      this.x = Graphics.canvas.width / 2 - this.width / 2;
      this.y = Graphics.canvas.height / 2 - this.height / 2 + (screen.y / 2);
    };

    this.calculateDotPositions = function() {
      for (var col = 0; col < this.dots.length; col++) {
        for (var row = 0; row < this.dots[col].length; row++)
          this.dots[col][row].x = this.x + this.dotSize / 2 + col * this.dotSize * 2,
          this.dots[col][row].y = this.y + this.dotSize / 2 + row * this.dotSize * 2;
      }
    };

    this.setDotTransitions = function() {
      if (!Settings.animations)
        return;

      var columnDelayMultiplier = 0, rowDelayMultiplier = 0, updateDelay = false;

      for (var col = 0; col < this.dots.length; col++) {
        for (var row = this.dots[col].length - 1; row >= 0; row--) {
          if (this.dots[col][row].transition === null)
            continue;
          if (this.dots[col][row].transition !== undefined) {
            this.dots[col][row].y = -this.dotSize / 2 - this.dotSize / 2 * (this.rows - 1 - row);
            this.dots[col][row].transition.endVal = this.y + this.dotSize / 2 + row * this.dotSize * 2;
            this.dots[col][row].transition.distance = this.dots[col][row].transition.startVal - this.dots[col][row].transition.endVal;
          } else
            this.dots[col][row].transition = new Transition(this.dots[col][row], 'y',
              -this.dotSize / 2 - this.dotSize / 2 * (this.rows - 1 - row),
              this.animationTime, columnDelayMultiplier * this.columnDelay + rowDelayMultiplier * this.rowDelay, "logistic");
          updateDelay = true;
          rowDelayMultiplier++;
        }
        if (updateDelay) {
          updateDelay = false;
          rowDelayMultiplier = 0;
          columnDelayMultiplier++;
        }
      }
    };

    this.onResize = function() {
      this.calculateDimensions();
      this.calculateDotPositions();
      this.setDotTransitions();
    };

    this.generateFromJSON = function() {
      var grid = JSON.parse(this.jsonGrid);

      for (var col = 0; col < cols; col++) {
        if (!this.dots[col])
          this.dots[col] = [];
        for (var row = 0; row < rows; row++)
          if (!this.dots[col][row] && grid[col] && grid[col][row])
            switch (grid[col][row].type) {
              case "SuperDot":
                this.dots[col][row] = new SuperDot(this, col, row);
                break;
              default:
              case "ColorDot":
                this.dots[col][row] = new ColorDot(this, col, row, {
                  hue: grid[col][row].hue,
                  hueShift: this.hueShift,
                  lastTwoHues: this.lastTwoHues
                });
                break;
            }
      }
    };

    this.toJson = function() {
      var grid = [];
      for (var col = 0; col < this.dots.length; col++) {
        grid[col] = [];
        for (var row = 0; row < this.dots[0].length; row++)
          grid[col][row] = {
            type: this.dots[col][row].__proto__.constructor.name,
            hue: this.dots[col][row].hue
          };
      }
      return grid;
    };

    this.fillNulls = function() {
      // Iterate through each spot in this.grid.dots[][], from the bottom to top
      for (var row = this.dots[0].length - 1; row >= 0; row--)
        for (var col = 0; col < this.dots.length; col++)
          // If that spot is null, try to pull the next non-null dot above it
          if (this.dots[col][row] == null) {
            var countNulls = 0;
            // Count how many nulls there are from this position upward
            while (row - countNulls >= 0)
              if (this.dots[col][row - countNulls] == null)
                countNulls++;
              else break;
            // If there is a dot above this position, drop it into it's new spot
            if (row - countNulls >= 0) {
              this.dots[col][row] = this.dots[col][row - countNulls];
              this.dots[col][row - countNulls] = null;
              this.dots[col][row].row = row;
              this.dots[col][row].y = this.y + this.dotSize / 2 + row * this.dotSize * 2;
              if (Settings.animations) {
                this.dots[col][row].transition = new Transition(
                  this.dots[col][row],
                  "y",
                  this.y + this.dotSize / 2 + (row - countNulls) * this.dotSize * 2,
                  400, 0, "logistic");
                this.dots[col][row].transition.start();
              }
            }
          }

      this.generateDots();
      this.calculateDotPositions();
      this.setDotTransitions();
    };

    this.draw = function() {
      for (var i = 0; i < this.dots.length; i++)
        for (var j = 0; j < this.dots[i].length; j++)
          if (this.dots[i][j]) {
            if (Settings.animations && this.dots[i][j].transition) {
              if (!this.dots[i][j].transition.started)
                this.dots[i][j].transition.start();
              this.dots[i][j].transition.update();
            }
            this.dots[i][j].draw();
          }
    };

    this.searchAtPosition = function(mouseX, mouseY) {
      var gridPosX = mouseX - this.x + this.dotSize / 2,
          gridPosY = mouseY - this.y + this.dotSize / 2;

      if (this.visible && this.enabled &&
          gridPosX > 0 && gridPosX < this.width  + this.dotSize &&
          gridPosY > 0 && gridPosY < this.height + this.dotSize) {
        var dot = this.dots[
           Math.floor(gridPosX / ((this.width  + this.dotSize) / this.cols))]
          [Math.floor(gridPosY / ((this.height + this.dotSize) / this.rows))
        ];

        if (dot && Math.sqrt(Math.pow(dot.x - mouseX, 2) + Math.pow(dot.y - mouseY, 2)) < this.dotSize / 2 * 1.75)
          return dot;
      }
      return false;
    };

    this.cleanUp = function() {
      // Remove any dot that shouldn't exist
      for (var col = dots.length - 1; col >= 0; col--)
        if (col >= this.cols)
          dots.pop();
        else
          for (var row = this.dots[col].length - 1; row >= this.rows; row--)
            this.dots[col].pop();

      this.generateDots();
    };

    (function() {
      if (this.jsonGrid)
        this.generateFromJSON();
      else
        this.generateDots();
      this.calculateDimensions();
      this.calculateDotPositions();
      if (Settings.animations)
        this.setDotTransitions();
    }).call(this);
  }

  function DotSelection(grid) {
    this.selection = [],
    this.visible = true,
    this.hue,
    this.lastPosX,
    this.lastPosY;

    this.draw = function() {
      if (!this.selection[0])
        return;

      Graphics.ctx.lineWidth = grid.dotSize / 3;
      Graphics.ctx.lineJoin = "round";
      Graphics.ctx.beginPath();
      Graphics.ctx.moveTo(this.selection[0].x, this.selection[0].y);
      for (var i = 1; i < this.selection.length; i++) {
        var gradient = Graphics.ctx.createLinearGradient(this.selection[i-1].x, this.selection[i-1].y, this.selection[i].x, this.selection[i].y);
        gradient.addColorStop(0.2, this.selection[i-1].getColor());
        gradient.addColorStop(0.8, this.selection[i].getColor());
        Graphics.ctx.lineTo(this.selection[i].x, this.selection[i].y)
        Graphics.ctx.strokeStyle = gradient;
        Graphics.ctx.stroke();
        Graphics.ctx.beginPath();
        Graphics.ctx.moveTo(this.selection[i].x, this.selection[i].y);
      }
      Graphics.ctx.lineTo(this.lastPosX, this.lastPosY);
      Graphics.ctx.strokeStyle = this.selection[this.selection.length - 1].getColor();
      Graphics.ctx.stroke();
    }
  }

  function Dot(grid, column, row, options) {
    this.col = column,
    this.row = row,
    this.x = undefined,
    this.y = undefined,
    this.points = 2,
    this.transition,
    this.selected = false;

    if (options)
      for (var option in options)
        this[option] = options[option];

    Dot.draw = function() {
      Graphics.ctx.fillStyle = "#999";
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, grid.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      return false;
    };

    this.getColor = function() {
      return "white";
    }
  }

  // function ColorDot(grid, column, row, colors, hueShift, lastTwoHues) {
  function ColorDot(grid, column, row, options) {
    Dot.apply(this, arguments);
    ColorDot.prototype = Object.create(Dot.prototype);
    ColorDot.prototype.constructor = ColorDot;

    this.lastTwoHues = this.lastTwoHues || [];

    this.determineHue = function() {
      var determinedHue;

      while (this.hue === undefined) {
        determinedHue = Math.floor(Math.random() * this.colors) * (360 / Math.floor(this.colors));
        if (this.colors < 3 ||
           (determinedHue != this.lastTwoHues[0] &&
            determinedHue != this.lastTwoHues[1])) {
          this.hue = determinedHue;
          break;
        }
      }
    };

    this.draw = function() {
      if (!grid.enabled) {
        Dot.prototype.constructor.draw.call(this);
        return;
      }

      Graphics.ctx.fillStyle = "hsla(" +
        (this.hue + this.hueShift % 360) + ", " + // Hue
        (this.selected? "100%" : "60%") + ", " +               // Saturation
        (this.selected? "50%"  : "60%") + ", " +               // Lightness
         "1)";                                   // Alpha (opacity)
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, grid.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      if (dot && (this.hue == dot.hue || dot instanceof SuperDot) && !dot.selected &&
          Math.abs(dot.col - this.col) < 2 && Math.abs(dot.row - this.row) < 2) {
        if (dot.hue == null)
          grid.dotSelectionHue = undefined;
        else
          grid.dotSelectionHue = dot.hue;
        return true;
      }
    };

    this.getColor = function() {
      return "hsla(" + (this.hue + this.hueShift % 360) + ", 100%, 50%, 1)";
    };

    (function() {
      if (!this.hue)
        this.determineHue();
    }).call(this);
  }

  function SuperDot(grid, column, row, options) {
    Dot.apply(this, arguments);

    this.points = 10;

    this.draw = function() {
      if (!grid.enabled) {
        Dot.prototype.constructor.draw.call(this);
        return;
      }

      Graphics.ctx.fillStyle = "white";
      Graphics.ctx.beginPath();
      Graphics.ctx.arc(this.x, this.y, grid.dotSize / 2, 0, Math.PI * 2, false);
      Graphics.ctx.fill();
    };

    this.canConnectTo = function(dot) {
      if (dot && !dot.selected && Math.abs(dot.col - this.col) < 2 && Math.abs(dot.row - this.row) < 2) {
        if (dot.hue == null)
          grid.dotSelectionHue = undefined;
        else
          grid.dotSelectionHue = dot.hue;
        return true;
      }
    };
  }

  SuperDot.prototype = Object.create(Dot.prototype);
  SuperDot.prototype.constructor = SuperDot;

  function Text(text, x, y, align, baseline, textSize, options) {
    this.opacity = 1,
    this.transition,
    this.visible = true,
    this.hue = 0,
    this.saturation = 100,
    this.lightness = 100,
    this.text = text,
    this.x,
    this.y,
    this.width,
    this.height,
    this.isBelow,
    this.isAfter;

    if (options)
      for (var option in options)
        this[option] = options[option];

    this.inRange = function(mouseX, mouseY) {
      return mouseX > this.x && mouseX < this.x + this.width &&
             mouseY > (this.y - this.height / 10) && mouseY < this.y + this.height;
    }

    this.draw = function() {
      if (this.transition)
        this.transition.update();

      Graphics.ctx.textBaseline = "top";
      Graphics.ctx.font = this.height + "px Josefin Sans";
      Graphics.ctx.globalAlpha = this.opacity;
      Graphics.ctx.fillStyle = "hsl(" + this.hue + "," + this.saturation + "%," + this.lightness + "%)";
      Graphics.ctx.fillText(this.text, this.x, this.y);
      //Graphics.ctx.strokeRect(this.x, this.y - this.height / 10, this.width, this.height + this.height / 10); // (click detection rectangle)
      //Graphics.ctx.strokeRect(this.x, this.y, this.width, this.height); // (canvas update detection rectangle)
    };

    this.calculateDimensions = function() {
      this.height = textSize * Graphics.canvas.width / 300;
      Graphics.ctx.font = this.height + "px Josefin Sans";
      this.width  = Graphics.ctx.measureText(this.text).width;

      switch (align) {
        case "left":
          this.x = x * Graphics.canvas.width;
          break;
        case "right":
          this.x = x * Graphics.canvas.width - this.width;
          break;
        default:
          this.x = x * Graphics.canvas.width - this.width / 2;
          break;
      }

      switch (baseline) {
        case "top":
          this.y = y * Graphics.canvas.height;
          break;
        case "bottom":
          this.y = y * Graphics.canvas.height - this.height;
          break;
        default:
          this.y = y * Graphics.canvas.height - this.height / 2;
          break;
      }

      if (this.isBelow)
        this.y += this.isBelow.y + this.isBelow.height - .2 * this.isBelow.height;
      else if (this.isAfter)
        this.x += this.isAfter.x + this.isAfter.width;
    };

    this.onResize = function() {
      this.calculateDimensions();
    }

    this.setText = function(newText) {
      this.text = newText;
      Graphics.ctx.font = this.height + "px Josefin Sans";
      this.width  = Graphics.ctx.measureText(this.text).width;

      switch (align) {
        case "left":
          this.x = x * Graphics.canvas.width;
          break;
        case "right":
          this.x = x * Graphics.canvas.width - this.width;
          break;
        default:
          this.x = x * Graphics.canvas.width - this.width / 2;
          break;
      }

      if (this.isAfter)
        this.x += this.isAfter.x + this.isAfter.width;
    };

    this.putBelow = function(text) {
      this.isBelow = text;
      this.calculateDimensions();
    };

    this.putAfter = function(text) {
      this.isAfter = text;
      this.calculateDimensions();
    }

    Text.searchAtPosition = function(mouseX, mouseY) {
      if (Game.screen.visible) {
        for (var i = 0; i < Game.screen.interactive.length; i++)
          if (Game.screen.interactive[i].visible && Game.screen.interactive[i].inRange(mouseX, mouseY))
            return Game.screen.interactive[i];
      } else
        for (var mode in Game.modes)
          if (Game.modes[mode].screen.visible)
            for (var i = 0; i < Game.modes[mode].screen.interactive.length; i++)
              if (Game.modes[mode].screen.interactive[i].visible && Game.modes[mode].screen.interactive[i].inRange(mouseX, mouseY))
                return Game.modes[mode].screen.interactive[i];
    };
  }

  function MenuBar() {
    this.contents = {},
    this.visible = true,
    this.color = "#222",
    this.height = 0,
    this.y = 0,
    this.transition;

    for (var i = 0; i < arguments.length; i+=2) {
      this.contents[arguments[i]] = arguments[i + 1];
      if (arguments[i + 1].height + arguments[i + 1].y > this.height)
        this.height = arguments[i + 1].height + arguments[i + 1].y;
    }

    this.calculateDimensions = function() {
      this.height = 0;
      for (var text in this.contents) {
        this.contents[text].calculateDimensions();
        if (this.contents[text].height + this.contents[text].y > this.height)
          this.height = this.contents[text].height + this.contents[text].y;
      }
    }

    this.onResize = function() {
      this.calculateDimensions();
    }

    this.draw = function() {
      if (this.transition)
        this.transition.update();

      Graphics.ctx.fillStyle = this.color;
      Graphics.ctx.fillRect(0, 0, Graphics.canvas.width, this.y + this.height)

      for (var object in this.contents) {
        if (this.contents[object].transition &&
           !this.contents[object].transition.started &&
            this.contents[object].transition.autoStart)
          this.contents[object].transition.start();
        if (this.contents[object].visible)
          this.contents[object].draw();
        }
    };
  }

  function Transition(object, property, startVal, duration, delay, motionType, callback) {
    this.object = object,
    this.autoStart = true,
    this.startVal = startVal,
    this.endVal = object[property],
    this.duration = duration,
    this.delay = delay,
    this.property = property,
    this.motionType = motionType || "linear",
    this.started = false,
    this.paused = false,
    this.initTime = null,
    this.delta = 0,
    this.distance = this.endVal - this.startVal,
    this.callback = callback;
    this.object[this.property] = this.startVal;
    var timeout;

    this.start = function() {
      if (this.paused)
        this.paused = false;
      else if (this.started)
        return;
      else
        Transition.addTransition(this);
      this.started = true;
      timeout = setTimeout(this.finish.bind(this), this.duration + delay); // Using the parameter instead of the property is intentional
      this.initTime = Date.now() - this.delta;
    };

    this.pause = function() {
      if (this.paused)
        return;

      clearTimeout(timeout);
      this.paused = true;
      this.delay = 0;
    };

    this.update = function() {
      if (this.paused || !this.started) // Delta will be negative if we're still waiting for the delay to be over
        return;

      if ((this.delta = Date.now() - this.initTime - this.delay) < 0)
        return;

      if (this.delta > this.duration)
        this.finish();
      else
        switch (this.motionType) {
          default:
            console.error("Invalid motion type");
          case "linear":
            this.object[this.property] = this.startVal + (this.delta / this.duration) * this.distance;
            break;
          case "countDown":
            this.object.setText(this.startVal + Math.ceil((this.delta / this.duration) * this.distance));
            break;
          case "logistic":
            this.object[this.property] = this.startVal + (this.endVal - this.startVal) / (1 + Math.pow(Math.E, -15 * (this.delta / this.duration - 0.5)));
            break;
        }
    };

    this.finish = function() {
      if (this == this.object.transition && !this.paused) {
        this.cancel();
        this.object[this.property] = this.endVal;
        if (this.callback)
          this.callback();
      }
    };

    this.cancel = function() {
      clearTimeout(timeout);
      this.object.transition = null;
      Transition.removeTransition(this);
    }
  }

  Transition.transitions = [];

  Transition.addTransition = function(transition) {
    for (var i = 0; i < Transition.transitions.length; i++)
      if (Transition.transitions[i] == undefined) {
        Transition.transitions[i] = transition;
        return;
      }
    Transition.transitions.push(transition);
  };

  Transition.removeTransition = function(transition) {
    for (var i = 0; i < Transition.transitions.length; i++)
      if (Transition.transitions[i] == transition) {
        Transition.transitions[i] = undefined;
        Transition.transitions = Transition.transitions.filter(function (value) { return value !== undefined; });
        return;
      }
    console.error("Cannot remove transition that doesn't exist");
  };

  Transition.pauseAllTransitions = function() {
    for (var i = 0; i < Transition.transitions.length; i++) {
      Transition.transitions[i].pause();
    }
  };

  Transition.startAllTransitions = function() {
    for (var i = 0; i < Transition.transitions.length; i++)
      if (Transition.transitions[i].paused)
        Transition.transitions[i].start();
  };

  Transition.cancelAllTransitions = function() {
    for (var i = 0; i < Transition.transitions.length; i++)
      Transition.transitions[i].cancel();
  };

  Game.mode = Game.modes.endless;
  Util.loadDataFromStorage();
  Graphics.setup();
  EventHandlers.setup();
}

Endless();
