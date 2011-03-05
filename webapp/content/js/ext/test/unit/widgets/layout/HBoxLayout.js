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
    var suite  = Ext.test.session.getSuite('Ext.layout.HBoxLayout'),
        assert = Y.Assert;
    
    function buildFakeChild(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            // width: 10,
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
        
        return new Ext.layout.HBoxLayout(config);
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
                height: 100,
                width : 400
            };
        },
        
        testEqualFlexWidths: function() {
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(100, boxes[0].width);
            assert.areEqual(100, boxes[1].width);
            assert.areEqual(100, boxes[2].width);
            assert.areEqual(100, boxes[3].width);
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
            
            assert.areEqual(40, boxes[0].width);
            assert.areEqual(80, boxes[1].width);
            assert.areEqual(120, boxes[2].width);
            assert.areEqual(160, boxes[3].width);
        },
        
        testMarginsAccountedFor: function() {
            var items = [
                buildFakeChild({flex: 1, margins: {left: 10, right: 10, top: 0, bottom: 0}}),
                buildFakeChild({flex: 1, margins: {left: 10, right: 10, top: 0, bottom: 0}}),
                buildFakeChild({flex: 1, margins: {left: 10, right: 10, top: 0, bottom: 0}}),
                buildFakeChild({flex: 1, margins: {left: 10, right: 10, top: 0, bottom: 0}})
            ];
             
            var calcs = this.layout.calculateChildBoxes(items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(80, boxes[0].width);
            assert.areEqual(80, boxes[1].width);
            assert.areEqual(80, boxes[2].width);
            assert.areEqual(80, boxes[3].width);
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
            assert.areEqual(95, boxes[0].width);
            assert.areEqual(95, boxes[1].width);
            assert.areEqual(95, boxes[2].width);
            assert.areEqual(95, boxes[3].width);
        },
        
        //one of the items is passed both a width and a flex - the flex should be ignored
        testWidthDominatesFlex: function() {
            var items = [
                buildFakeChild({flex: 1, width: 250, getWidth: function() {return 250;}}),
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 1}),
                buildFakeChild({flex: 1})
            ];
             
            var calcs = this.layout.calculateChildBoxes(items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(250, boxes[0].width);
            assert.areEqual(50, boxes[1].width);
            assert.areEqual(50, boxes[2].width);
            assert.areEqual(50, boxes[3].width);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'minWidth of items',
        
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
                buildFakeChild({width: 100, minWidth: 100}),
                buildFakeChild({width: 200, minWidth: 120}),
                buildFakeChild({width: 200, minWidth: 120}),
                buildFakeChild({width: 200, minWidth: 120})
            ];
        },
        
        testAvailableWidthIsSufficient: function() {
            var targetSize = {
                width : 700,
                height: 25
            };
            
            var calcs = this.layout.calculateChildBoxes(this.items, targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0,   boxes[0].left);
            assert.areEqual(100, boxes[1].left);
            assert.areEqual(300, boxes[2].left);
            assert.areEqual(500, boxes[3].left);
            
            assert.areEqual(100, boxes[0].width);
            assert.areEqual(200, boxes[1].width);
            assert.areEqual(200, boxes[2].width);
            assert.areEqual(200, boxes[3].width);
        },
        
        testHasShortfall: function() {
            var targetSize = {
                width : 500,
                height: 25
            };
            
            var calcs = this.layout.calculateChildBoxes(this.items, targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(100, boxes[0].width);
            assert.areEqual(133, boxes[1].width);
            assert.areEqual(133, boxes[2].width);
            assert.areEqual(134, boxes[3].width);
            
            assert.areEqual(0,   boxes[0].left);
            assert.areEqual(100, boxes[1].left);
            assert.areEqual(233, boxes[2].left);
            assert.areEqual(366, boxes[3].left);
        },
        
        testTooNarrow: function() {
            var targetSize = {
                width : 400,
                height: 25
            };
            
            var calcs = this.layout.calculateChildBoxes(this.items, targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0,   boxes[0].left);
            assert.areEqual(100, boxes[1].left);
            assert.areEqual(220, boxes[2].left);
            assert.areEqual(340, boxes[3].left);
            
            assert.areEqual(100, boxes[0].width);
            assert.areEqual(120, boxes[1].width);
            assert.areEqual(120, boxes[2].width);
            assert.areEqual(120, boxes[3].width);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'aligning',
        
        setUp: function() {
            this.items = [
                buildFakeChild({flex: 1, getHeight: function() {return 10;}}),
                buildFakeChild({flex: 1, getHeight: function() {return 20;}}),
                buildFakeChild({flex: 1, getHeight: function() {return 30;}}),
                buildFakeChild({flex: 1, getHeight: function() {return 40;}})
            ];
            
            this.targetSize = {
                height: 100,
                width : 400
            };
        },
        
        testTop: function() {
            this.layout = buildLayout({
                align: 'top'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].top);
            assert.areEqual(0, boxes[1].top);
            assert.areEqual(0, boxes[2].top);
            assert.areEqual(0, boxes[3].top);
        },
        
        testMiddle: function() {
            this.layout = buildLayout({
                align: 'middle'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(45, boxes[0].top);
            assert.areEqual(40, boxes[1].top);
            assert.areEqual(35, boxes[2].top);
            assert.areEqual(30, boxes[3].top);
        },
        
        testStretch: function() {
            this.layout = buildLayout({
                align: 'stretch'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].top);
            assert.areEqual(0, boxes[1].top);
            assert.areEqual(0, boxes[2].top);
            assert.areEqual(0, boxes[3].top);
            
            assert.areEqual(100, boxes[0].height);
            assert.areEqual(100, boxes[1].height);
            assert.areEqual(100, boxes[2].height);
            assert.areEqual(100, boxes[3].height);
        },
        
        testStretchMax: function() {
            this.layout = buildLayout({
                align: 'stretchmax'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].top);
            assert.areEqual(0, boxes[1].top);
            assert.areEqual(0, boxes[2].top);
            assert.areEqual(0, boxes[3].top);
            
            assert.areEqual(40, boxes[0].height);
            assert.areEqual(40, boxes[1].height);
            assert.areEqual(40, boxes[2].height);
            assert.areEqual(40, boxes[3].height);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'packing',
        
        setUp: function() {
            this.items = [
                buildFakeChild({getSize: function() {return {height: 10, width: 10};}}),
                buildFakeChild({getSize: function() {return {height: 10, width: 20};}}),
                buildFakeChild({getSize: function() {return {height: 10, width: 30};}}),
                buildFakeChild({getSize: function() {return {height: 10, width: 40};}})
            ];
            
            this.targetSize = {
                height: 100,
                width : 400
            };
        },
        
        testPackStart: function() {
            this.layout = buildLayout({
                pack: 'start'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].left);
            assert.areEqual(10, boxes[1].left);
            assert.areEqual(30, boxes[2].left);
            assert.areEqual(60, boxes[3].left);
        },
        
        testPackCenter: function() {
            this.layout = buildLayout({
                pack: 'center'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
                        
            assert.areEqual(150, boxes[0].left);
            assert.areEqual(160, boxes[1].left);
            assert.areEqual(180, boxes[2].left);
            assert.areEqual(210, boxes[3].left);
        },
        
        testPackEnd: function() {
            this.layout = buildLayout({
                pack: 'end'
            });
            
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(300, boxes[0].left);
            assert.areEqual(310, boxes[1].left);
            assert.areEqual(330, boxes[2].left);
            assert.areEqual(360, boxes[3].left);
        },
        
        testWidthPropertyDominatesGetWidth: function() {
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
                    width: 100,
                    html: 'width : 100',
                    frame: true,
                    margins: {top: 0, left: 0, right: 0, bottom: 0},
                    getHeight: function() {return 10;},
                    
                    //NOTE: this should be ignored by HBox because we have a different configured width property
                    getWidth: function() {return 10;}
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
                height: 630,
                width : 1628
            };
            
            var calcs = layout.calculateChildBoxes(items, targetSize),
                boxes = calcs.boxes;
            
            assert.areEqual(0, boxes[0].left);
            assert.areEqual(510, boxes[1].left);
            assert.areEqual(610, boxes[2].left);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'meta data from calculated box sizes',
        
        setUp: function() {
            this.layout = buildLayout();
            
            this.items = [
                buildFakeChild({getHeight: function() {return 50;}, flex: 1}),
                buildFakeChild({getHeight: function() {return 60;}, flex: 1}),
                buildFakeChild({getHeight: function() {return 10;}, flex: 1}),
                buildFakeChild({getHeight: function() {return 80;}, flex: 1})
            ];
            
            this.targetSize = {
                height: 100,
                width : 400
            };
        },
        
        testMaxHeight: function() {
            var calcs = this.layout.calculateChildBoxes(this.items, this.targetSize),
                meta  = calcs.meta;
            
            assert.areEqual(80, meta.maxHeight);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'update innerCt size',
        
        setUp: function() {
            this.layout = buildLayout({
                align  : 'stretch',
                padding: {
                    top   : 10,
                    bottom: 20,
                    left  : 0,
                    right : 0
                }
            });
            
            //fake the values that are calculated during onLayout
            this.layoutTargetLastSize = {
                width : 400,
                height: 100
            };
            
            this.childBoxCache = {
                meta: {
                    maxHeight: 150
                }
            };
        },
        
        testMaintainsHeightForAlignStretch: function() {
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
            
            assert.areSame(400, width);
            assert.areSame(100, height);
        },
        
        //if aligning middle, increase height to accomodate the tallest child
        testIncreasesHeightForAlignMiddle: function() {
            this.layout = buildLayout({
                align  : 'middle',
                padding: {
                    top   : 10,
                    bottom: 20,
                    left  : 0,
                    right : 0
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
            
            assert.areSame(400, width);
            assert.areSame(180, height);
        }
    }));
})();