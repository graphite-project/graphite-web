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
    var suite  = Ext.test.session.getSuite('Ext.Slider'),
        assert = Y.Assert;
        
    suite.add(new Y.Test.Case({
        name: 'constructor and initComponent',
        
        setUp: function() {
            this.slider = new Ext.Slider();
        },
        
        testDefaultValues: function() {
            assert.areEqual(0, this.slider.minValue);
            assert.areEqual(0, this.slider.value);
            assert.areEqual(100, this.slider.maxValue);
        },
        
        testDefaultValueSet: function() {
            var slider = new Ext.Slider({minValue: 50});
            
            assert.areEqual(50, slider.value);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'Changing value',
        
        setUp: function() {
            this.slider = new Ext.Slider({
                minValue: 30,
                values  : [50, 70],
                maxValue: 90,
                renderTo: Ext.getBody()
            });
            
            this.slider.render();
        },
        
        tearDown: function() {
            this.slider.destroy();
        },
        
        testValueChanged: function() {
            this.slider.setValue(0, 60);
            
            assert.areEqual(60, this.slider.getValues()[0]);
        },
        
        testEventFired: function() {
            var executed = false,
                value, thumb;
            
            this.slider.on('change', function(slider, v, t) {
                executed = true;
                value = v;
                thumb = t;
            }, this);
            
            this.slider.setValue(0, 60);
            
            assert.isTrue(executed);
            assert.areEqual(60, value);
            assert.areEqual(this.slider.thumbs[0], thumb);
        },
        
        testThumbMoved: function() {
            var orig = this.slider.moveThumb,
                index, animate;
            
            this.slider.moveThumb = function(i, v, a) {
                index   = i;
                animate = a;
            };
            
            this.slider.setValue(0, 60, false);
            
            assert.areEqual(0, index);
            assert.isFalse(animate);
        },
        
        testChangeComplete: function() {
            var executed = false,
                value, thumb;
            
            this.slider.on('changecomplete', function(slider, v, t) {
                executed = true;
                value = v;
                thumb = t;
            }, this);
            
            this.slider.setValue(0, 60, undefined, true);
            
            assert.isTrue(executed);
            assert.areEqual(60, value);
            assert.areEqual(this.slider.thumbs[0], thumb);
        },
        
        testSetMinValue: function() {
            this.slider.setMinValue(20);
            
            assert.areEqual(20, this.slider.minValue);
            assert.areEqual(50, this.slider.getValues()[0]);
        },
        
        testSetMaxValue: function() {
            this.slider.setMaxValue(110);
            
            assert.areEqual(110, this.slider.maxValue);
            assert.areEqual(50, this.slider.getValues()[0]);
        },
        
        testSetMinValueChangesValue: function() {
            this.slider.setMinValue(60);
            
            assert.areEqual(60, this.slider.getValues()[0]);
            assert.areEqual(70, this.slider.getValues()[1]);
        },
        
        testSetMaxValueChangesValue: function() {
            this.slider.setMaxValue(60);
            
            assert.areEqual(50, this.slider.getValues()[0]);
            assert.areEqual(60, this.slider.getValues()[1]);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'Utility functions',
        
        setUp: function() {
            this.slider = new Ext.Slider({
                //the slider has 14px of total padding on the sides, so add this here to make the numbers easier
                width   : 214,
                minValue: 100,
                maxValue: 500,
                renderTo: Ext.getBody()
            });
            
            this.slider.render();
        },
        
        tearDown: function() {
            this.slider.destroy();
        },
        
        testGetRatio: function() {
            assert.areEqual(0.5, this.slider.getRatio());
        },
        
        testTranslateValue: function() {
            
        },
        
        testReverseValue: function() {
            
        },
        
        testNormalizeValue: function() {
            
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'Snapping',
        
        setUp: function() {
            this.slider = new Ext.Slider({
                increment: 10,
                renderTo : Ext.getBody()
            });
            
            this.slider.render();
        },
        
        tearDown: function() {
            this.slider.destroy();
        },
        
        testSnapToFloor: function() {
            this.slider.setValue(0, 12);
            
            assert.areEqual(10, this.slider.doSnap(12));
        },
        
        testSnapToCeil: function() {
            assert.areEqual(20, this.slider.doSnap(18));            
            assert.areEqual(20, this.slider.doSnap(15));
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'Adding and removing thumbs'
    }));
})();