var DEFAULT_WINDOW_WIDTH = 600;
var DEFAULT_WINDOW_HEIGHT = 400;

function createComposerWindow(options) {
  if (!options) {
    options = {};
  }
  return new Ext.Window({
    width: options.width ? options.width : DEFAULT_WINDOW_WIDTH,
    height: options.height ? options.height : DEFAULT_WINDOW_HEIGHT,
    title: "Graphite Composer",
    layout: "border",
    maximizable: true
  });
} //XXX after merging, BorderLayout is static, can't add() after render. So maybe create it with my window as in items: ...
