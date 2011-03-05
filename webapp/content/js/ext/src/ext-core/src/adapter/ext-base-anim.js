/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
(function(){
    var EXTLIB = Ext.lib,
        noNegatives = /width|height|opacity|padding/i,
        offsetAttribute = /^((width|height)|(top|left))$/,
        defaultUnit = /width|height|top$|bottom$|left$|right$/i,
        offsetUnit =  /\d+(em|%|en|ex|pt|in|cm|mm|pc)$/i,
        isset = function(v){
            return typeof v !== 'undefined';
        },
        now = function(){
            return new Date();
        };

    EXTLIB.Anim = {
        motion : function(el, args, duration, easing, cb, scope) {
            return this.run(el, args, duration, easing, cb, scope, Ext.lib.Motion);
        },

        run : function(el, args, duration, easing, cb, scope, type) {
            type = type || Ext.lib.AnimBase;
            if (typeof easing == "string") {
                easing = Ext.lib.Easing[easing];
            }
            var anim = new type(el, args, duration, easing);
            anim.animateX(function() {
                if(Ext.isFunction(cb)){
                    cb.call(scope);
                }
            });
            return anim;
        }
    };

    EXTLIB.AnimBase = function(el, attributes, duration, method) {
        if (el) {
            this.init(el, attributes, duration, method);
        }
    };

    EXTLIB.AnimBase.prototype = {
        doMethod: function(attr, start, end) {
            var me = this;
            return me.method(me.curFrame, start, end - start, me.totalFrames);
        },


        setAttr: function(attr, val, unit) {
            if (noNegatives.test(attr) && val < 0) {
                val = 0;
            }
            Ext.fly(this.el, '_anim').setStyle(attr, val + unit);
        },


        getAttr: function(attr) {
            var el = Ext.fly(this.el),
                val = el.getStyle(attr),
                a = offsetAttribute.exec(attr) || [];

            if (val !== 'auto' && !offsetUnit.test(val)) {
                return parseFloat(val);
            }

            return (!!(a[2]) || (el.getStyle('position') == 'absolute' && !!(a[3]))) ? el.dom['offset' + a[0].charAt(0).toUpperCase() + a[0].substr(1)] : 0;
        },


        getDefaultUnit: function(attr) {
            return defaultUnit.test(attr) ? 'px' : '';
        },

        animateX : function(callback, scope) {
            var me = this,
                f = function() {
                me.onComplete.removeListener(f);
                if (Ext.isFunction(callback)) {
                    callback.call(scope || me, me);
                }
            };
            me.onComplete.addListener(f, me);
            me.animate();
        },


        setRunAttr: function(attr) {
            var me = this,
                a = this.attributes[attr],
                to = a.to,
                by = a.by,
                from = a.from,
                unit = a.unit,
                ra = (this.runAttrs[attr] = {}),
                end;

            if (!isset(to) && !isset(by)){
                return false;
            }

            var start = isset(from) ? from : me.getAttr(attr);
            if (isset(to)) {
                end = to;
            }else if(isset(by)) {
                if (Ext.isArray(start)){
                    end = [];
                    for(var i=0,len=start.length; i<len; i++) {
                        end[i] = start[i] + by[i];
                    }
                }else{
                    end = start + by;
                }
            }

            Ext.apply(ra, {
                start: start,
                end: end,
                unit: isset(unit) ? unit : me.getDefaultUnit(attr)
            });
        },


        init: function(el, attributes, duration, method) {
            var me = this,
                actualFrames = 0,
                mgr = EXTLIB.AnimMgr;

            Ext.apply(me, {
                isAnimated: false,
                startTime: null,
                el: Ext.getDom(el),
                attributes: attributes || {},
                duration: duration || 1,
                method: method || EXTLIB.Easing.easeNone,
                useSec: true,
                curFrame: 0,
                totalFrames: mgr.fps,
                runAttrs: {},
                animate: function(){
                    var me = this,
                        d = me.duration;

                    if(me.isAnimated){
                        return false;
                    }

                    me.curFrame = 0;
                    me.totalFrames = me.useSec ? Math.ceil(mgr.fps * d) : d;
                    mgr.registerElement(me);
                },

                stop: function(finish){
                    var me = this;

                    if(finish){
                        me.curFrame = me.totalFrames;
                        me._onTween.fire();
                    }
                    mgr.stop(me);
                }
            });

            var onStart = function(){
                var me = this,
                    attr;

                me.onStart.fire();
                me.runAttrs = {};
                for(attr in this.attributes){
                    this.setRunAttr(attr);
                }

                me.isAnimated = true;
                me.startTime = now();
                actualFrames = 0;
            };


            var onTween = function(){
                var me = this;

                me.onTween.fire({
                    duration: now() - me.startTime,
                    curFrame: me.curFrame
                });

                var ra = me.runAttrs;
                for (var attr in ra) {
                    this.setAttr(attr, me.doMethod(attr, ra[attr].start, ra[attr].end), ra[attr].unit);
                }

                ++actualFrames;
            };

            var onComplete = function() {
                var me = this,
                    actual = (now() - me.startTime) / 1000,
                    data = {
                        duration: actual,
                        frames: actualFrames,
                        fps: actualFrames / actual
                    };

                me.isAnimated = false;
                actualFrames = 0;
                me.onComplete.fire(data);
            };

            me.onStart = new Ext.util.Event(me);
            me.onTween = new Ext.util.Event(me);
            me.onComplete = new Ext.util.Event(me);
            (me._onStart = new Ext.util.Event(me)).addListener(onStart);
            (me._onTween = new Ext.util.Event(me)).addListener(onTween);
            (me._onComplete = new Ext.util.Event(me)).addListener(onComplete);
        }
    };


    Ext.lib.AnimMgr = new function() {
        var me = this,
            thread = null,
            queue = [],
            tweenCount = 0;


        Ext.apply(me, {
            fps: 1000,
            delay: 1,
            registerElement: function(tween){
                queue.push(tween);
                ++tweenCount;
                tween._onStart.fire();
                me.start();
            },

            unRegister: function(tween, index){
                tween._onComplete.fire();
                index = index || getIndex(tween);
                if (index != -1) {
                    queue.splice(index, 1);
                }

                if (--tweenCount <= 0) {
                    me.stop();
                }
            },

            start: function(){
                if(thread === null){
                    thread = setInterval(me.run, me.delay);
                }
            },

            stop: function(tween){
                if(!tween){
                    clearInterval(thread);
                    for(var i = 0, len = queue.length; i < len; ++i){
                        if(queue[0].isAnimated){
                            me.unRegister(queue[0], 0);
                        }
                    }

                    queue = [];
                    thread = null;
                    tweenCount = 0;
                }else{
                    me.unRegister(tween);
                }
            },

            run: function(){
                var tf, i, len, tween;
                for(i = 0, len = queue.length; i<len; i++) {
                    tween = queue[i];
                    if(tween && tween.isAnimated){
                        tf = tween.totalFrames;
                        if(tween.curFrame < tf || tf === null){
                            ++tween.curFrame;
                            if(tween.useSec){
                                correctFrame(tween);
                            }
                            tween._onTween.fire();
                        }else{
                            me.stop(tween);
                        }
                    }
                }
            }
        });

        var getIndex = function(anim) {
            var i, len;
            for(i = 0, len = queue.length; i<len; i++) {
                if(queue[i] === anim) {
                    return i;
                }
            }
            return -1;
        };

        var correctFrame = function(tween) {
            var frames = tween.totalFrames,
                frame = tween.curFrame,
                duration = tween.duration,
                expected = (frame * duration * 1000 / frames),
                elapsed = (now() - tween.startTime),
                tweak = 0;

            if(elapsed < duration * 1000){
                tweak = Math.round((elapsed / expected - 1) * frame);
            }else{
                tweak = frames - (frame + 1);
            }
            if(tweak > 0 && isFinite(tweak)){
                if(tween.curFrame + tweak >= frames){
                    tweak = frames - (frame + 1);
                }
                tween.curFrame += tweak;
            }
        };
    };

    EXTLIB.Bezier = new function() {

        this.getPosition = function(points, t) {
            var n = points.length,
                tmp = [],
                c = 1 - t,
                i,
                j;

            for (i = 0; i < n; ++i) {
                tmp[i] = [points[i][0], points[i][1]];
            }

            for (j = 1; j < n; ++j) {
                for (i = 0; i < n - j; ++i) {
                    tmp[i][0] = c * tmp[i][0] + t * tmp[parseInt(i + 1, 10)][0];
                    tmp[i][1] = c * tmp[i][1] + t * tmp[parseInt(i + 1, 10)][1];
                }
            }

            return [ tmp[0][0], tmp[0][1] ];

        };
    };


    EXTLIB.Easing = {
        easeNone: function (t, b, c, d) {
            return c * t / d + b;
        },


        easeIn: function (t, b, c, d) {
            return c * (t /= d) * t + b;
        },


        easeOut: function (t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        }
    };

    (function() {
        EXTLIB.Motion = function(el, attributes, duration, method) {
            if (el) {
                EXTLIB.Motion.superclass.constructor.call(this, el, attributes, duration, method);
            }
        };

        Ext.extend(EXTLIB.Motion, Ext.lib.AnimBase);

        var superclass = EXTLIB.Motion.superclass,
            pointsRe = /^points$/i;

        Ext.apply(EXTLIB.Motion.prototype, {
            setAttr: function(attr, val, unit){
                var me = this,
                    setAttr = superclass.setAttr;

                if (pointsRe.test(attr)) {
                    unit = unit || 'px';
                    setAttr.call(me, 'left', val[0], unit);
                    setAttr.call(me, 'top', val[1], unit);
                } else {
                    setAttr.call(me, attr, val, unit);
                }
            },

            getAttr: function(attr){
                var me = this,
                    getAttr = superclass.getAttr;

                return pointsRe.test(attr) ? [getAttr.call(me, 'left'), getAttr.call(me, 'top')] : getAttr.call(me, attr);
            },

            doMethod: function(attr, start, end){
                var me = this;

                return pointsRe.test(attr)
                        ? EXTLIB.Bezier.getPosition(me.runAttrs[attr], me.method(me.curFrame, 0, 100, me.totalFrames) / 100)
                        : superclass.doMethod.call(me, attr, start, end);
            },

            setRunAttr: function(attr){
                if(pointsRe.test(attr)){

                    var me = this,
                        el = this.el,
                        points = this.attributes.points,
                        control = points.control || [],
                        from = points.from,
                        to = points.to,
                        by = points.by,
                        DOM = EXTLIB.Dom,
                        start,
                        i,
                        end,
                        len,
                        ra;


                    if(control.length > 0 && !Ext.isArray(control[0])){
                        control = [control];
                    }else{
                        /*
                        var tmp = [];
                        for (i = 0,len = control.length; i < len; ++i) {
                            tmp[i] = control[i];
                        }
                        control = tmp;
                        */
                    }

                    Ext.fly(el, '_anim').position();
                    DOM.setXY(el, isset(from) ? from : DOM.getXY(el));
                    start = me.getAttr('points');


                    if(isset(to)){
                        end = translateValues.call(me, to, start);
                        for (i = 0,len = control.length; i < len; ++i) {
                            control[i] = translateValues.call(me, control[i], start);
                        }
                    } else if (isset(by)) {
                        end = [start[0] + by[0], start[1] + by[1]];

                        for (i = 0,len = control.length; i < len; ++i) {
                            control[i] = [ start[0] + control[i][0], start[1] + control[i][1] ];
                        }
                    }

                    ra = this.runAttrs[attr] = [start];
                    if (control.length > 0) {
                        ra = ra.concat(control);
                    }

                    ra[ra.length] = end;
                }else{
                    superclass.setRunAttr.call(this, attr);
                }
            }
        });

        var translateValues = function(val, start) {
            var pageXY = EXTLIB.Dom.getXY(this.el);
            return [val[0] - pageXY[0] + start[0], val[1] - pageXY[1] + start[1]];
        };
    })();
})();