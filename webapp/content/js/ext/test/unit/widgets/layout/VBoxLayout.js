/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * Tests Ext.data.Store functionality
 * @author Ed Spencer
 */
(function() {
    var suite  = Ext.test.session.getSuite('Ext.layout.VBoxLayout'),
        assert = Y.Assert;
    
    function buildFakeChild(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            getWidth: function() {
                return 10;
            },
            getHeight: function() {
                return 10;
            },
            getSize: function() {
                return {
                    height: 10,
                    width : 10
                };
            },
            margins: {
                top   : 0,
                right : 0,
                bottom: 0,
                left  : 0
            }
        });
        
        return config;
    }
    
    function buildLayout(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            padding: {
                top   : 0,
                right : 0,
                bottom: 0,
                left  : 0
            }
        });
        
        return new Ext.layout.VBoxLayout(config);
    };
    
    suite.add(new Y.Test.Case({
        name: 'calculating flexed box sizes',
        
        setUp: function() {
            this.layout = buildLayout();
            
            this.items = [
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 1})
            ];
            
            this.targetSize = {
                height: 400,
                width : 100
            };
        },
        
        testEqualFlexHeights: function() {
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(100, boxes[0].height);
            assert.areEqual(100, boxes[1].height);
            assert.areEqual(100, boxes[2].height);
            assert.areEqual(100, boxes[3].height);
        },
        
        testDifferentFlexWidths: function() {
            this.items = [
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 2}),
                buildFakeChild({flex: 3}),
                buildFakeChild({flex: 4})
            ];
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(40, boxes[0].height);
            assert.areEqual(80, boxes[1].height);
            assert.areEqual(120, boxes[2].height);
            assert.areEqual(160, boxes[3].height);
        },
        
        testMarginsAccountedFor: function() {
            var items = [
                buildFakeChild({flex: 1, margins: {left: 0, right: 0, top: 10, bottom: 10}}),
                buildFakeChild({flex: 1, margins: {left: 0, right: 0, top: 10, bottom: 10}}),
                buildFakeChild({flex: 1, margins: {left: 0, right: 0, top: 10, bottom: 10}}),
                buildFakeChild({flex: 1, margins: {left: 0, right: 0, top: 10, bottom: 10}})
            ];
             
            var calcs = this.layout.calculateChildBoxes(items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(80, boxes[0].height);
            assert.areEqual(80, boxes[1].height);
            assert.areEqual(80, boxes[2].height);
            assert.areEqual(80, boxes[3].height);
        },
        
        testPaddingAccountedFor: function() {
            this.layout = buildLayout({
                padding: {
                    top   : 10,
                    right : 10,
                    bottom: 10,
                    left  : 10
                }
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            //400px available internally, minus 20px total left + right padding = 380 / 4
            assert.areEqual(95, boxes[0].height);
            assert.areEqual(95, boxes[1].height);
            assert.areEqual(95, boxes[2].height);
            assert.areEqual(95, boxes[3].height);
        },
        
        //one of the items is passed both a width and a flex - the flex should be ignored
        testHeightDominatesFlex: function() {
            var items = [
                buildFakeChild({flex: 1, height: 250, getHeight: function() {return 250;}}),
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 1})
            ];
             
            var calcs = this.layout.calculateChildBoxes(items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(250, boxes[0].height);
            assert.areEqual(50, boxes[1].height);
            assert.areEqual(50, boxes[2].height);
            assert.areEqual(50, boxes[3].height);
        },
        
        testHeightPropertyDominatesGetHeight: function() {
            var layout = buildLayout({
                pack : 'start',
                align: 'stretch'
            });
            
            var items = [
                {
                    title: 'Panel 1',
                    flex: 1,
                    html: 'flex : 1',
                    frame: true,
                    margins: {top: 0, left: 0, right: 0, bottom: 0},
                    getHeight: function() {return 10;},
                    getWidth: function() {return 10;}
                }, {
                    title: 'Panel 2',
                    height: 100,
                    html: 'width : 100',
                    frame: true,
                    margins: {top: 0, left: 0, right: 0, bottom: 0},
                    getWidth: function() {return 10;},
                    
                    //NOTE: this should be ignored by HBox because we have a different configured width property
                    getHeight: function() {return 10;}
                }, {
                    title: 'Panel 3',
                    flex: 2,
                    html: 'flex : 2',
                    frame: true,
                    margins: {top: 0, left: 0, right: 0, bottom: 0},
                    getHeight: function() {return 10;},
                    getWidth: function() {return 10;}
                }
            ];
            
            var targetSize = {
                height: 1628,
                width : 630
            };
            
            var calcs = layout.calculateChildBoxes(items, targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].top);
            assert.areEqual(510, boxes[1].top);
            assert.areEqual(610, boxes[2].top);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'minHeight of items',

        setUp: function() {
            this.layout = buildLayout();

            this.layout.beforeCt = {
                getWidth: function() {
                    return 0;
                },
                createChild: Ext.emptyFn
            };

            this.layout.afterCt = {
                getWidth: function() {
                    return 0;
                },
                createChild: Ext.emptyFn
            };

            this.items = [
                buildFakeChild({height: 100, minHeight: 100}),
                buildFakeChild({height: 200, minHeight: 120}),
                buildFakeChild({height: 200, minHeight: 120}),
                buildFakeChild({height: 200, minHeight: 120})
            ];
        },

        testAvailableWidthIsSufficient: function() {
            var targetSize = {
                height: 700,
                width : 25
            };

            var calcs = this.layout.calculateChildBoxes(this.items, targetSize),
                boxes = calcs.boxes;

            assert.areEqual(0,   boxes[0].top);
            assert.areEqual(100, boxes[1].top);
            assert.areEqual(300, boxes[2].top);
            assert.areEqual(500, boxes[3].top);

            assert.areEqual(100, boxes[0].height);
            assert.areEqual(200, boxes[1].height);
            assert.areEqual(200, boxes[2].height);
            assert.areEqual(200, boxes[3].height);
        },

        testHasShortfall: function() {
            var targetSize = {
                height: 500,
                width : 25
            };

            var calcs = this.layout.calculateChildBoxes(this.items, targetSize),
                boxes = calcs.boxes;

            assert.areEqual(100, boxes[0].height);
            assert.areEqual(133, boxes[1].height);
            assert.areEqual(133, boxes[2].height);
            assert.areEqual(134, boxes[3].height);

            assert.areEqual(0,   boxes[0].top);
            assert.areEqual(100, boxes[1].top);
            assert.areEqual(233, boxes[2].top);
            assert.areEqual(366, boxes[3].top);
        },

        testTooNarrow: function() {
            var targetSize = {
                height: 400,
                width : 25
            };

            var calcs = this.layout.calculateChildBoxes(this.items, targetSize),
                boxes = calcs.boxes;

            assert.areEqual(0,   boxes[0].top);
            assert.areEqual(100, boxes[1].top);
            assert.areEqual(220, boxes[2].top);
            assert.areEqual(340, boxes[3].top);

            assert.areEqual(100, boxes[0].height);
            assert.areEqual(120, boxes[1].height);
            assert.areEqual(120, boxes[2].height);
            assert.areEqual(120, boxes[3].height);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'aligning',
        
        setUp: function() {
            this.items = [
                buildFakeChild({flex: 1, getWidth: function() {return 10;}}),
                buildFakeChild({flex: 1, getWidth: function() {return 20;}}),
                buildFakeChild({flex: 1, getWidth: function() {return 30;}}),
                buildFakeChild({flex: 1, getWidth: function() {return 40;}})
            ];
            
            this.targetSize = {
                height: 400,
                width : 100
            };
        },
        
        testLeft: function() {
            this.layout = buildLayout({
                align: 'left'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].left);
            assert.areEqual(0, boxes[1].left);
            assert.areEqual(0, boxes[2].left);
            assert.areEqual(0, boxes[3].left);
        },
        
        testMiddle: function() {
            this.layout = buildLayout({
                align: 'center'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(45, boxes[0].left);
            assert.areEqual(40, boxes[1].left);
            assert.areEqual(35, boxes[2].left);
            assert.areEqual(30, boxes[3].left);
        },
        
        testStretch: function() {
            this.layout = buildLayout({
                align: 'stretch'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].left);
            assert.areEqual(0, boxes[1].left);
            assert.areEqual(0, boxes[2].left);
            assert.areEqual(0, boxes[3].left);
            
            assert.areEqual(100, boxes[0].width);
            assert.areEqual(100, boxes[1].width);
            assert.areEqual(100, boxes[2].width);
            assert.areEqual(100, boxes[3].width);
        },
        
        testStretchMax: function() {
            this.layout = buildLayout({
                align: 'stretchmax'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].left);
            assert.areEqual(0, boxes[1].left);
            assert.areEqual(0, boxes[2].left);
            assert.areEqual(0, boxes[3].left);
            
            assert.areEqual(40, boxes[0].width);
            assert.areEqual(40, boxes[1].width);
            assert.areEqual(40, boxes[2].width);
            assert.areEqual(40, boxes[3].width);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'packing',
        
        setUp: function() {
            this.items = [
                buildFakeChild({getSize: function() {return {width: 10, height: 10};}}),
                buildFakeChild({getSize: function() {return {width: 10, height: 20};}}),
                buildFakeChild({getSize: function() {return {width: 10, height: 30};}}),
                buildFakeChild({getSize: function() {return {width: 10, height: 40};}})
            ];
            
            this.targetSize = {
                height: 400,
                width : 100
            };
        },
        
        testPackStart: function() {
            this.layout = buildLayout({
                pack: 'start'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].top);
            assert.areEqual(10, boxes[1].top);
            assert.areEqual(30, boxes[2].top);
            assert.areEqual(60, boxes[3].top);
        },
        
        testPackCenter: function() {
            this.layout = buildLayout({
                pack: 'center'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
                        
            assert.areEqual(150, boxes[0].top);
            assert.areEqual(160, boxes[1].top);
            assert.areEqual(180, boxes[2].top);
            assert.areEqual(210, boxes[3].top);
        },
        
        testPackEnd: function() {
            this.layout = buildLayout({
                pack: 'end'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(300, boxes[0].top);
            assert.areEqual(310, boxes[1].top);
            assert.areEqual(330, boxes[2].top);
            assert.areEqual(360, boxes[3].top);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'meta data from calculated box sizes',
        
        setUp: function() {
            this.layout = buildLayout();
            
            this.items = [
                buildFakeChild({getWidth: function() {return 50;}, flex: 1}),
                buildFakeChild({getWidth: function() {return 60;}, flex: 1}),
                buildFakeChild({getWidth: function() {return 10;}, flex: 1}),
                buildFakeChild({getWidth: function() {return 80;}, flex: 1})
            ];
            
            this.targetSize = {
                height: 400,
                width : 100
            };
        },
        
        testMaxHeight: function() {
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                meta  = calcs.meta;
            
            assert.areEqual(80, meta.maxWidth);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'update innerCt size',
        
        setUp: function() {
            this.layout = buildLayout({
                align  : 'stretch',
                padding: {
                    top   : 0,
                    bottom: 0,
                    left  : 10,
                    right : 20
                }
            });
            
            //fake the values that are calculated during onLayout
            this.layoutTargetLastSize = {
                width : 100,
                height: 400
            };
            
            this.childBoxCache = {
                meta: {
                    maxWidth: 150
                }
            };
        },
        
        testMaintainsWidthForAlignStretch: function() {
            var layout = this.layout,
                width, height;
            
            //a fake innerCt element that we can intercept calls to setSize on
            layout.innerCt = {
                setSize: function(widthArg, heightArg) {
                    width  = widthArg;
                    height = heightArg;
                }
            };
            
            layout.updateInnerCtSize(this.layoutTargetLastSize, this.childBoxCache);
            
            assert.areSame(100, width);
            assert.areSame(400, height);
        },
        
        //if aligning middle, increase height to accomodate the tallest child
        testIncreasesWidthForAlignMiddle: function() {
            this.layout = buildLayout({
                align  : 'middle',
                padding: {
                    top   : 0,
                    bottom: 0,
                    left  : 10,
                    right : 20
                }
            });
            
            var layout = this.layout,
                width, height;
            
            //a fake innerCt element that we can intercept calls to setSize on
            layout.innerCt = {
                setSize: function(widthArg, heightArg) {
                    width  = widthArg;
                    height = heightArg;
                }
            };
            
            layout.updateInnerCtSize(this.layoutTargetLastSize, this.childBoxCache);
            
            assert.areSame(180, width);
            assert.areSame(400, height);
        }
    }));
})();