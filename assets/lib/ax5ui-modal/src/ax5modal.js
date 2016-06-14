// ax5.ui.modal
(function (root, _SUPER_) {

    /**
     * @class ax5modal
     * @alias ax5.ui.modal
     * @version 0.6.0
     * @author tom@axisj.com
     * @example
     * ```
     * var my_modal = new ax5.ui.modal();
     * ```
     */

    var U = ax5.util;

    //== UI Class
    var axClass = function () {
        var
            self = this,
            cfg,
            ENM = {
                "mousedown": (ax5.info.supportTouch) ? "touchstart" : "mousedown",
                "mousemove": (ax5.info.supportTouch) ? "touchmove" : "mousemove",
                "mouseup": (ax5.info.supportTouch) ? "touchend" : "mouseup"
            },
            getMousePosition = function (e) {
                var mouseObj = e;
                if ('changedTouches' in e) {
                    mouseObj = e.changedTouches[0];
                }
                return {
                    clientX: mouseObj.clientX,
                    clientY: mouseObj.clientY
                }
            };

        if (_SUPER_) _SUPER_.call(this); // 부모호출
        this.activeModal = null;
        this.$ = {}; // UI inside of the jQuery object store
        this.config = {
            position: {
                left: "center",
                top: "middle",
                margin: 10
            },
            minimizePosition: "bottom-right",
            clickEventName: "click", //(('ontouchstart' in document.documentElement) ? "touchstart" : "click"),
            theme: 'default',
            width: 300,
            height: 400,
            closeToEsc: true,
            animateTime: 250
        };
        cfg = this.config; // extended config copy cfg
        cfg.id = 'ax5-modal-' + ax5.getGuid(); // instance id

        var
            onStateChanged = function (opts, that) {
                if (opts && opts.onStateChanged) {
                    opts.onStateChanged.call(that, that);
                }
                else if (this.onStateChanged) {
                    this.onStateChanged.call(that, that);
                }
                return true;
            },
            getContentTmpl = function () {
                return ` 
                <div id="{{modalId}}" data-modal-els="root" class="ax5modal {{theme}} {{fullscreen}}" style="{{styles}}">
                    {{#header}}
                    <div class="ax-modal-header" data-modal-els="header">
                        {{{title}}}
                        {{#btns}}
                            <div class="ax-modal-header-addon">
                            {{#@each}}
                            <a tabindex="-1" data-modal-header-btn="{{@key}}" class="{{@value.theme}}">{{{@value.label}}}</a>
                            {{/@each}}
                            </div>
                        {{/btns}}
                    </div>
                    {{/header}}
                    <div class="ax-modal-body" data-modal-els="body">
                    {{#iframe}}
                        <div data-modal-els="iframe-wrap" style="-webkit-overflow-scrolling: touch; overflow: auto;position: relative;">
                        <iframe name="{{modalId}}-frame" src="" width="100%" height="100%" frameborder="0" data-modal-els="iframe" style="position: absolute;left:0;top:0;"></iframe>
                        </div>
                        <form name="{{modalId}}-form" data-modal-els="iframe-form">
                        <input type="hidden" name="modalId" value="{{modalId}}" />
                        {{#param}}
                        {{#@each}}
                        <input type="hidden" name="{{@key}}" value="{{@value}}" />
                        {{/@each}}
                        {{/param}}
                        </form>
                    {{/iframe}}
                    </div>
                </div>
                `;
            },
            getContent = function (modalId, opts) {
                var
                    data = {
                        modalId: modalId,
                        theme: opts.theme,
                        header: opts.header,
                        fullScreen: (opts.fullScreen ? "fullscreen" : ""),
                        styles: [],
                        iframe: opts.iframe
                    };

                if (opts.zIndex) {
                    data.styles.push("z-index:" + opts.zIndex);
                }
                if (data.iframe && typeof data.iframe.param === "string") {
                    data.iframe.param = ax5.util.param(data.iframe.param);
                }

                return ax5.mustache.render(getContentTmpl(), data);
            },
            open = function (opts, callBack) {
                var that;

                jQuery(document.body).append(getContent.call(this, opts.id, opts));

                this.activeModal = jQuery('#' + opts.id);

                // 파트수집
                this.$ = {
                    "root": this.activeModal.find('[data-modal-els="root"]'),
                    "header": this.activeModal.find('[data-modal-els="header"]'),
                    "body": this.activeModal.find('[data-modal-els="body"]')
                };

                if (opts.iframe) {
                    this.$["iframe-wrap"] = this.activeModal.find('[data-modal-els="iframe-wrap"]');
                    this.$["iframe"] = this.activeModal.find('[data-modal-els="iframe"]');
                    this.$["iframe-form"] = this.activeModal.find('[data-modal-els="iframe-form"]');
                }

                //- position 정렬
                this.align();

                that = {
                    self: this,
                    id: opts.id,
                    theme: opts.theme,
                    width: opts.width,
                    height: opts.height,
                    state: "open",
                    $: this.$
                };

                if (opts.iframe) {

                    this.$["iframe-wrap"].css({height: opts.height});
                    this.$["iframe"].css({height: opts.height});

                    // iframe content load
                    this.$["iframe-form"].attr({"method": opts.iframe.method});
                    this.$["iframe-form"].attr({"target": opts.id + "-frame"});
                    this.$["iframe-form"].attr({"action": opts.iframe.url});
                    this.$["iframe"].on("load", (function () {
                        that.state = "load";
                        onStateChanged.call(this, opts, that);
                    }).bind(this));
                    this.$["iframe-form"].submit();
                }

                if (callBack) callBack.call(that);
                onStateChanged.call(this, opts, that);

                // bind key event
                if (opts.closeToEsc) {
                    jQuery(window).bind("keydown.ax-modal", (function (e) {
                        onkeyup.call(this, e || window.event);
                    }).bind(this));
                }
                jQuery(window).bind("resize.ax-modal", (function (e) {
                    this.align(null, e || window.event);
                }).bind(this));

                this.activeModal.find("[data-modal-header-btn]").on(cfg.clickEventName, (function (e) {
                    btnOnClick.call(this, e || window.event, opts);
                }).bind(this));

                this.$.header
                    .bind(ENM["mousedown"], function (e) {
                        self.mousePosition = getMousePosition(e);
                        moveModal.on.call(self);
                    })
                    .bind("dragstart", function (e) {
                        U.stopEvent(e);
                        return false;
                    });
            },
            btnOnClick = function (e, opts, callBack, target, k) {
                var that;
                if (e.srcElement) e.target = e.srcElement;

                target = U.findParentNode(e.target, function (target) {
                    if (target.getAttribute("data-modal-header-btn")) {
                        return true;
                    }
                });

                if (target) {
                    k = target.getAttribute("data-modal-header-btn");

                    that = {
                        self: this,
                        key: k, value: opts.header.btns[k],
                        dialogId: opts.id,
                        btnTarget: target
                    };

                    if (opts.header.btns[k].onClick) {
                        opts.header.btns[k].onClick.call(that, k);
                    }
                }

                that = null;
                opts = null;
                callBack = null;
                target = null;
                k = null;
            },
            onkeyup = function (e) {
                if (e.keyCode == ax5.info.eventKeys.ESC) {
                    this.close();
                }
            },
            alignProcessor = {
                "top-left": function () {
                    this.align({left: "left", top: "top"});
                },
                "top-right": function () {
                    this.align({left: "right", top: "top"});
                },
                "bottom-left": function () {
                    this.align({left: "left", top: "bottom"});
                },
                "bottom-right": function () {
                    this.align({left: "right", top: "bottom"});
                },
                "center-middle": function () {
                    this.align({left: "center", top: "middle"});
                }
            },
            moveModal = {
                "on": function () {
                    var modalOffset = this.activeModal.position();
                    var modalBox = {
                        width: this.activeModal.outerWidth(), height: this.activeModal.outerHeight()
                    };
                    var windowBox = {
                        width: jQuery(window).width(),
                        height: jQuery(window).height()
                    };
                    var getResizerPosition = function (e) {
                        self.__dx = e.clientX - self.mousePosition.clientX;
                        self.__dy = e.clientY - self.mousePosition.clientY;

                        var minX = 0;
                        var maxX = windowBox.width - modalBox.width;
                        var minY = 0;
                        var maxY = windowBox.height - modalBox.height;

                        if(minX > modalOffset.left + self.__dx){
                            self.__dx = -modalOffset.left;
                        }
                        else if(maxX < modalOffset.left + self.__dx){
                            self.__dx = (maxX) - modalOffset.left;
                        }

                        if(minY > modalOffset.top + self.__dy){
                            self.__dy = -modalOffset.top;
                        }
                        else if(maxY < modalOffset.top + self.__dy){
                            self.__dy = (maxY) - modalOffset.top;
                        }

                        return {
                            left: modalOffset.left + self.__dx + $(document).scrollLeft(),
                            top: modalOffset.top + self.__dy + $(document).scrollTop()
                        };
                    };

                    self.__dx = 0; // 변화량 X
                    self.__dy = 0; // 변화량 Y

                    jQuery(document.body)
                        .bind(ENM["mousemove"] + ".ax5modal-" + cfg.id, function (e) {
                            if (!self.resizer) {
                                // self.resizerBg : body 가 window보다 작을 때 문제 해결을 위한 DIV
                                self.resizerBg = jQuery('<div class="ax5modal-resizer-background" ondragstart="return false;"></div>');
                                self.resizer = jQuery('<div class="ax5modal-resizer" ondragstart="return false;"></div>');
                                self.resizer.css({
                                    left: modalOffset.left,
                                    top: modalOffset.top,
                                    width: modalBox.width,
                                    height: modalBox.height
                                });
                                jQuery(document.body)
                                    .append(self.resizerBg)
                                    .append(self.resizer);
                                self.activeModal.addClass("draged");
                            }
                            self.resizer.css(getResizerPosition(e));
                        })
                        .bind(ENM["mouseup"] + ".ax5layout-" + this.instanceId, function (e) {
                            moveModal.off.call(self);
                        })
                        .bind("mouseleave.ax5layout-" + this.instanceId, function (e) {
                            moveModal.off.call(self);
                        });

                    jQuery(document.body)
                        .attr('unselectable', 'on')
                        .css('user-select', 'none')
                        .on('selectstart', false);
                },
                "off": function () {
                    var setModalPosition = function () {
                        //console.log(this.activeModal.offset(), this.__dx);
                        var box = this.activeModal.offset();
                        box.left += this.__dx - $(document).scrollLeft();
                        box.top += this.__dy - $(document).scrollTop();
                        this.activeModal.css(box);
                    };

                    if (this.resizer) {
                        this.activeModal.removeClass("draged");
                        this.resizer.remove();
                        this.resizer = null;
                        this.resizerBg.remove();
                        this.resizerBg = null;
                        setModalPosition.call(this);
                        //this.align();
                    }

                    jQuery(document.body)
                        .unbind(ENM["mousemove"] + ".ax5modal-" + cfg.id)
                        .unbind(ENM["mouseup"] + ".ax5modal-" + cfg.id)
                        .unbind("mouseleave.ax5modal-" + cfg.id);

                    jQuery(document.body)
                        .removeAttr('unselectable')
                        .css('user-select', 'auto')
                        .off('selectstart');

                }
            };

        /// private end

        /**
         * Preferences of modal UI
         * @method ax5modal.setConfig
         * @param {Object} config - 클래스 속성값
         * @returns {ax5modal}
         * @example
         * ```
         * ```
         */
        //== class body start
        this.init = function () {
            this.onStateChanged = cfg.onStateChanged;
        };

        /**
         * open the modal
         * @method ax5modal.open
         * @returns {ax5modal}
         * @example
         * ```
         * my_modal.open();
         * ```
         */
        this.open = function (opts, callBack) {
            if (!this.activeModal) {
                opts = self.modalConfig = jQuery.extend(true, {}, cfg, opts);
                open.call(this, opts, callBack);
            }
            return this;
        };

        /**
         * close the modal
         * @method ax5modal.close
         * @returns {ax5modal}
         * @example
         * ```
         * my_modal.close();
         * ```
         */
        this.close = function (opts) {
            if (this.activeModal) {
                opts = self.modalConfig;
                this.activeModal.addClass("destroy");
                jQuery(window).unbind("keydown.ax-modal");
                jQuery(window).unbind("resize.ax-modal");

                setTimeout((function () {
                    this.activeModal.remove();
                    this.activeModal = null;
                    onStateChanged.call(this, opts, {
                        self: this,
                        state: "close"
                    });
                }).bind(this), cfg.animateTime);
            }
            return this;
        };

        /**
         * @method ax5modal.minimize
         * @returns {axClass}
         */
        this.minimize = (function () {

            return function (minimizePosition) {
                var opts = self.modalConfig;
                if (typeof minimizePosition === "undefined") minimizePosition = cfg.minimizePosition;
                this.minimized = true;
                this.$.body.hide();
                self.modalConfig.originalHeight = opts.height;
                self.modalConfig.height = 0;
                alignProcessor[minimizePosition].call(this);

                onStateChanged.call(this, opts, {
                    self: this,
                    state: "minimize"
                });

                return this;
            };
        })();

        /**
         * @method ax5modal.maximize
         * @returns {axClass}
         */
        this.maximize = function () {
            var opts = self.modalConfig;
            if (this.minimized) {
                this.minimized = false;
                this.$.body.show();
                self.modalConfig.height = self.modalConfig.originalHeight;
                self.modalConfig.originalHeight = undefined;

                this.align({left: "center", top: "middle"});
                onStateChanged.call(this, opts, {
                    self: this,
                    state: "restore"
                });
            }
            return this;
        };

        /**
         * setCSS
         * @method ax5modal.css
         * @param {Object} css -
         * @returns {ax5modal}
         */
        this.css = function (css) {
            if (this.activeModal && !self.fullScreen) {
                this.activeModal.css(css);
                if (css.width) {
                    self.modalConfig.width = this.activeModal.width();
                }
                if (css.height) {
                    self.modalConfig.height = this.activeModal.height();
                    if (this.$["iframe"]) {
                        this.$["iframe-wrap"].css({height: self.modalConfig.height});
                        this.$["iframe"].css({height: self.modalConfig.height});
                    }
                }
            }
            return this;
        };

        /**
         * @mothod ax5modal.align
         * @param position
         * @param e
         * @returns {ax5modal}
         */
        this.align = (function () {

            return function (position, e) {
                if (!this.activeModal) return this;

                var opts = self.modalConfig,
                    box = {
                        width: opts.width,
                        height: opts.height
                    };


                if (opts.fullScreen) {
                    if (opts.header) this.$.header.hide();
                    box.width = jQuery(window).width();
                    box.height = jQuery(window).height();
                    box.left = 0;
                    box.top = 0;

                    if (opts.iframe) {
                        this.$["iframe-wrap"].css({height: box.height});
                        this.$["iframe"].css({height: box.height});
                    }
                }
                else {
                    if (position) {
                        jQuery.extend(true, opts.position, position);
                    }

                    if (opts.header) {
                        box.height += this.$.header.outerHeight();
                    }

                    //- position 정렬
                    if (opts.position.left == "left") {
                        box.left = (opts.position.margin || 0);
                    }
                    else if (opts.position.left == "right") {
                        // window.innerWidth;
                        box.left = jQuery(window).width() - box.width - (opts.position.margin || 0);
                    }
                    else if (opts.position.left == "center") {
                        box.left = jQuery(window).width() / 2 - box.width / 2;
                    }
                    else {
                        box.left = opts.position.left || 0;
                    }

                    if (opts.position.top == "top") {
                        box.top = (opts.position.margin || 0);
                    }
                    else if (opts.position.top == "bottom") {
                        box.top = jQuery(window).height() - box.height - (opts.position.margin || 0);
                    }
                    else if (opts.position.top == "middle") {
                        box.top = jQuery(window).height() / 2 - box.height / 2;
                    }
                    else {
                        box.top = opts.position.top || 0;
                    }

                }

                this.activeModal.css(box);
                return this;
            };
        })();

        // 클래스 생성자
        this.main = (function () {
            if (arguments && U.isObject(arguments[0])) {
                this.setConfig(arguments[0]);
            }
        }).apply(this, arguments);
    };
    //== UI Class

    root.modal = (function () {
        if (U.isFunction(_SUPER_)) axClass.prototype = new _SUPER_(); // 상속
        return axClass;
    })(); // ax5.ui에 연결

})(ax5.ui, ax5.ui.root);