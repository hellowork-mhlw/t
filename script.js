import jsQR from 'https://cdn.skypack.dev/jsqr@1.4.0';

async function scanQRFromFile(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise((resolve) => img.addEventListener("load", resolve));
  const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
  return jsQR(imageData.data, img.naturalWidth, img.naturalHeight)?.data;
}

var script = {
  data() {
    return {
      entries: JSON.parse(localStorage.getItem("entries")) ?? []
    };
  },
  mounted() {
    this.update();
    addEventListener("keydown", (e) => {
      if (["ArrowDown", "ArrowRight"].includes(e.key)) {
        if (!document.querySelector(".entry:first-of-type")) return;
        document.querySelector(".entry:first-of-type").focus();
      }
      if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        if (!document.querySelector(".entry:last-of-type")) return;
        document.querySelector(".entry:last-of-type").focus();
      }
    });
    addEventListener("paste", async (e) => {
      const text = e.clipboardData.getData("text");
      this.addText(text);
      if (!e.clipboardData.files.length) return;
      const data = await scanQRFromFile(e.clipboardData.files[0]);
      if (!data) {
        Toastify({
          text: "Could not scan the QR code.",
          duration: 10000,
          style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)"
          },
          gravity: "bottom"
        }).showToast();
        Toastify({
          text: "Add some white padding around the QR image by PrintScreen.",
          duration: 10000,
          destination:
            "https://github.com/cozmo/jsQR/issues/142#issuecomment-1364690399",
          newWindow: true,
          style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)"
          },
          gravity: "bottom"
        }).showToast();
        return;
      }
      this.addText(data);
    });
    this.$nextTick().then(() => {
      if (!document.querySelector(".entry:first-of-type")) return;
      document.querySelector(".entry:first-of-type").focus();
    });
  },
  methods: {
    update() {
      const ms = 1000 * 30;
      const duration = ms - (Date.now() % ms);
      setTimeout(this.update, duration);
      this.$refs.bar.animate(
        [
          { transform: `translateX(-${((ms - duration) / ms) * 100}%)` },
          { transform: `translateX(-100%)` }
        ],
        {
          duration
        }
      );
      this.updateOtp();
    },
    updateOtp() {
      for (const entry of this.entries) {
        const totp = new OTPAuth.TOTP(entry);
        entry.otp = totp.generate();
      }
    },
    addEntry(entry) {
      entry.created_at = new Date();
      const totp = new OTPAuth.TOTP(entry);
      entry.otp = totp.generate();
      this.entries.unshift(entry);
      localStorage.setItem("entries", JSON.stringify(this.entries));
      this.copy(entry.otp);
      scrollTo({ top: 0, behavior: "smooth" });
    },
    deleteEntry(index) {
      this.$delete(this.entries, index);
      localStorage.setItem("entries", JSON.stringify(this.entries));
    },
    addText(text) {
      if (!text) return;
      if (/^[2-7]{6}$/.test(text)) return;
      if (/^[A-Z2-7]+$/.test(text)) this.addEntry({ secret: text });
      try {
        const url = new URL(text);
        const entry = Object.fromEntries(url.searchParams);
        entry.label = decodeURIComponent(url.pathname.split("/").at(-1));
        this.addEntry(entry);
      } catch (e) {
        console.error(e);
      }
    },
    copy(text) {
      const activeElement = document.activeElement;
      Toastify({ text, gravity: "bottom" }).showToast();
      const input = document.body.appendChild(document.createElement("input"));
      input.value = text;
      input.select();
      document.execCommand("copy");
      input.parentNode.removeChild(input);
      activeElement.focus();
    },
    isCollapsed() {
      return getSelection().isCollapsed;
    },
    focusPrev(e) {
      if (!e.target.previousElementSibling) return;
      e.target.previousElementSibling.focus();
    },
    focusNext(e) {
      if (!e.target.nextElementSibling) return;
      e.target.nextElementSibling.focus();
    }
  }
};

function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
    if (typeof shadowMode !== 'boolean') {
        createInjectorSSR = createInjector;
        createInjector = shadowMode;
        shadowMode = false;
    }
    // Vue.extend constructor export interop.
    const options = typeof script === 'function' ? script.options : script;
    // render functions
    if (template && template.render) {
        options.render = template.render;
        options.staticRenderFns = template.staticRenderFns;
        options._compiled = true;
        // functional template
        if (isFunctionalTemplate) {
            options.functional = true;
        }
    }
    // scopedId
    if (scopeId) {
        options._scopeId = scopeId;
    }
    let hook;
    if (moduleIdentifier) {
        // server build
        hook = function (context) {
            // 2.3 injection
            context =
                context || // cached call
                    (this.$vnode && this.$vnode.ssrContext) || // stateful
                    (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
            // 2.2 with runInNewContext: true
            if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                context = __VUE_SSR_CONTEXT__;
            }
            // inject component styles
            if (style) {
                style.call(this, createInjectorSSR(context));
            }
            // register component module identifier for async chunk inference
            if (context && context._registeredComponents) {
                context._registeredComponents.add(moduleIdentifier);
            }
        };
        // used by ssr in case component is cached and beforeCreate
        // never gets called
        options._ssrRegister = hook;
    }
    else if (style) {
        hook = shadowMode
            ? function (context) {
                style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
            }
            : function (context) {
                style.call(this, createInjector(context));
            };
    }
    if (hook) {
        if (options.functional) {
            // register for functional component in vue file
            const originalRender = options.render;
            options.render = function renderWithStyleInjection(h, context) {
                hook.call(context);
                return originalRender(h, context);
            };
        }
        else {
            // inject component registration as beforeCreate hook
            const existing = options.beforeCreate;
            options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
    }
    return script;
}

const isOldIE = typeof navigator !== 'undefined' &&
    /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
function createInjector(context) {
    return (id, style) => addStyle(id, style);
}
let HEAD;
const styles = {};
function addStyle(id, css) {
    const group = isOldIE ? css.media || 'default' : id;
    const style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
    if (!style.ids.has(id)) {
        style.ids.add(id);
        let code = css.source;
        if (css.map) {
            // https://developer.chrome.com/devtools/docs/javascript-debugging
            // this makes source maps inside style tags work properly in Chrome
            code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
            // http://stackoverflow.com/a/26603875
            code +=
                '\n/*# sourceMappingURL=data:application/json;base64,' +
                    btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                    ' */';
        }
        if (!style.element) {
            style.element = document.createElement('style');
            style.element.type = 'text/css';
            if (css.media)
                style.element.setAttribute('media', css.media);
            if (HEAD === undefined) {
                HEAD = document.head || document.getElementsByTagName('head')[0];
            }
            HEAD.appendChild(style.element);
        }
        if ('styleSheet' in style.element) {
            style.styles.push(code);
            style.element.styleSheet.cssText = style.styles
                .filter(Boolean)
                .join('\n');
        }
        else {
            const index = style.ids.size - 1;
            const textNode = document.createTextNode(code);
            const nodes = style.element.childNodes;
            if (nodes[index])
                style.element.removeChild(nodes[index]);
            if (nodes.length)
                style.element.insertBefore(textNode, nodes[index]);
            else
                style.element.appendChild(textNode);
        }
    }
}

/* script */
const __vue_script__ = script;

/* template */
var __vue_render__ = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", { attrs: { id: "app" } }, [
    _c("div", {
      directives: [
        {
          name: "show",
          rawName: "v-show",
          value: _vm.entries.length,
          expression: "entries.length"
        }
      ],
      staticClass: "bar-bg"
    }),
    _vm._v(" "),
    _c("div", {
      directives: [
        {
          name: "show",
          rawName: "v-show",
          value: _vm.entries.length,
          expression: "entries.length"
        }
      ],
      ref: "bar",
      staticClass: "bar"
    }),
    _vm._v(" "),
    _vm.entries.length
      ? _c(
          "div",
          [
            _vm._l(_vm.entries, function(entry, index) {
              return _c(
                "div",
                {
                  staticClass: "entry",
                  attrs: { tabindex: "0" },
                  on: {
                    keydown: [
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k(
                            $event.keyCode,
                            "enter",
                            13,
                            $event.key,
                            "Enter"
                          )
                        ) {
                          return null
                        }
                        return _vm.copy(entry.otp)
                      },
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k($event.keyCode, "space", 32, $event.key, [
                            " ",
                            "Spacebar"
                          ])
                        ) {
                          return null
                        }
                        $event.preventDefault();
                        return _vm.copy(entry.otp)
                      },
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k(
                            $event.keyCode,
                            "delete",
                            [8, 46],
                            $event.key,
                            ["Backspace", "Delete", "Del"]
                          )
                        ) {
                          return null
                        }
                        return _vm.deleteEntry(index)
                      },
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k(
                            $event.keyCode,
                            "c",
                            undefined,
                            $event.key,
                            undefined
                          )
                        ) {
                          return null
                        }
                        if (!$event.ctrlKey) {
                          return null
                        }
                        _vm.isCollapsed() && _vm.copy(entry.otp);
                      },
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k($event.keyCode, "up", 38, $event.key, [
                            "Up",
                            "ArrowUp"
                          ])
                        ) {
                          return null
                        }
                        $event.stopPropagation();
                        return _vm.focusPrev($event)
                      },
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k($event.keyCode, "left", 37, $event.key, [
                            "Left",
                            "ArrowLeft"
                          ])
                        ) {
                          return null
                        }
                        $event.stopPropagation();
                        if ("button" in $event && $event.button !== 0) {
                          return null
                        }
                        return _vm.focusPrev($event)
                      },
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k($event.keyCode, "down", 40, $event.key, [
                            "Down",
                            "ArrowDown"
                          ])
                        ) {
                          return null
                        }
                        $event.stopPropagation();
                        return _vm.focusNext($event)
                      },
                      function($event) {
                        if (
                          !$event.type.indexOf("key") &&
                          _vm._k($event.keyCode, "right", 39, $event.key, [
                            "Right",
                            "ArrowRight"
                          ])
                        ) {
                          return null
                        }
                        $event.stopPropagation();
                        if ("button" in $event && $event.button !== 2) {
                          return null
                        }
                        return _vm.focusNext($event)
                      }
                    ]
                  }
                },
                [
                  _c("div", { staticClass: "entry-left" }, [
                    entry.label
                      ? _c("div", [_vm._v(_vm._s(entry.label))])
                      : _vm._e(),
                    _vm._v(" "),
                    _c("div", [_vm._v("secret: " + _vm._s(entry.secret))]),
                    _vm._v(" "),
                    entry.issuer
                      ? _c("div", [_vm._v("issuer: " + _vm._s(entry.issuer))])
                      : _vm._e(),
                    _vm._v(" "),
                    _c("div", [_vm._v(_vm._s(new Date(entry.created_at)))])
                  ]),
                  _vm._v(" "),
                  _c(
                    "div",
                    {
                      on: {
                        click: function($event) {
                          return _vm.copy(entry.otp)
                        }
                      }
                    },
                    [_c("h1", [_vm._v(_vm._s(entry.otp))])]
                  )
                ]
              )
            }),
            _vm._v(" "),
            _vm._m(0)
          ],
          2
        )
      : _c(
          "div",
          {
            staticClass: "initial",
            attrs: {
              title:
                "If you paste QR image, add some white padding around the QR image by Win + Shift + S."
            }
          },
          [_vm._m(1)]
        ),
    _vm._v(" "),
    _c(
      "a",
      {
        staticClass: "github-corner",
        attrs: {
          href: "https://qiita.com/7mpy/items/69084d19825e42238814",
          "aria-label": "View source on GitHub",
          target: "_blank"
        }
      },
      [
        _c(
          "svg",
          {
            style: {
              fill: "#64ceaa",
              color: "#fff",
              position: "fixed",
              top: _vm.entries.length ? "8px" : 0,
              border: 0,
              right: 0
            },
            attrs: {
              width: "80",
              height: "80",
              viewBox: "0 0 250 250",
              "aria-hidden": "true"
            }
          },
          [
            _c("path", {
              attrs: { d: "M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" }
            }),
            _vm._v(" "),
            _c("path", {
              staticClass: "octo-arm",
              staticStyle: { "transform-origin": "130px 106px" },
              attrs: {
                d:
                  "M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2",
                fill: "currentColor"
              }
            }),
            _vm._v(" "),
            _c("path", {
              staticClass: "octo-body",
              attrs: {
                d:
                  "M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z",
                fill: "currentColor"
              }
            })
          ]
        )
      ]
    )
  ])
};
var __vue_staticRenderFns__ = [
  function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("h1", { attrs: { title: "Delete a entry by DELETE key" } }, [
      _vm._v("\n      Copy a OTP by\n      "),
      _c("span", { staticClass: "key" }, [_vm._v("Enter")]),
      _vm._v("\n      ,\n      "),
      _c("span", { staticClass: "key" }, [_vm._v("Space")]),
      _vm._v("\n      ,\n      "),
      _c("span", { staticClass: "key" }, [_vm._v("Ctrl")]),
      _vm._v("\n      +\n      "),
      _c("span", { staticClass: "key" }, [_vm._v("C")]),
      _vm._v("\n      , click a OTP\n    ")
    ])
  },
  function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("h1", [
      _vm._v("\n      Paste a secret key, URL, QR image by\n      "),
      _c("span", { staticClass: "key" }, [_vm._v("Ctrl")]),
      _vm._v("\n      +\n      "),
      _c("span", { staticClass: "key" }, [_vm._v("V")])
    ])
  }
];
__vue_render__._withStripped = true;

  /* style */
  const __vue_inject_styles__ = function (inject) {
    if (!inject) return
    inject("data-v-fe61ae48_0", { source: "\nbody {\n  margin: 0;\n}\n#app {\n  text-align: center;\n  color: #2c3e50;\n}\n.bar-bg {\n  position: sticky;\n  top: 0;\n  height: 8px;\n  background: lightgreen;\n}\n.bar {\n  position: sticky;\n  top: 0;\n  margin-top: -8px;\n  height: 8px;\n  background: green;\n  will-change: transform;\n}\n.entry {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  margin: 16px auto;\n  border: 2px solid #fafafa;\n  border-radius: 8px;\n  padding: 8px;\n  max-width: 768px;\n  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.26);\n  outline-color: green;\n}\n.entry:focus {\n  border: 2px solid green;\n}\n.entry-left {\n  text-align: left;\n}\n.key {\n  border: 1px solid #19191c33;\n  border-radius: 4px;\n  padding: 0px 12px;\n  line-height: 1.8;\n  background: #19191c0d;\n}\n.initial {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n}\n.github-corner:hover .octo-arm {\n  animation: octocat-wave 560ms ease-in-out;\n}\n@keyframes octocat-wave {\n0%,\n  100% {\n    transform: rotate(0);\n}\n20%,\n  60% {\n    transform: rotate(-25deg);\n}\n40%,\n  80% {\n    transform: rotate(10deg);\n}\n}\n@media (max-width: 500px) {\n.github-corner:hover .octo-arm {\n    animation: none;\n}\n.github-corner .octo-arm {\n    animation: octocat-wave 560ms ease-in-out;\n}\n}\n", map: {"version":3,"sources":["/tmp/codepen/vuejs/src/pen.vue"],"names":[],"mappings":";AAwOA;EACA,SAAA;AACA;AAEA;EACA,kBAAA;EACA,cAAA;AACA;AAEA;EACA,gBAAA;EACA,MAAA;EACA,WAAA;EACA,sBAAA;AACA;AAEA;EACA,gBAAA;EACA,MAAA;EACA,gBAAA;EACA,WAAA;EACA,iBAAA;EACA,sBAAA;AACA;AAEA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,SAAA;EACA,iBAAA;EACA,yBAAA;EACA,kBAAA;EACA,YAAA;EACA,gBAAA;EACA,yCAAA;EACA,oBAAA;AACA;AAEA;EACA,uBAAA;AACA;AAEA;EACA,gBAAA;AACA;AAEA;EACA,2BAAA;EACA,kBAAA;EACA,iBAAA;EACA,gBAAA;EACA,qBAAA;AACA;AAEA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,aAAA;AACA;AAEA;EACA,yCAAA;AACA;AACA;AACA;;IAEA,oBAAA;AACA;AACA;;IAEA,yBAAA;AACA;AACA;;IAEA,wBAAA;AACA;AACA;AACA;AACA;IACA,eAAA;AACA;AACA;IACA,yCAAA;AACA;AACA","file":"pen.vue","sourcesContent":["<!-- Use preprocessors via the lang attribute! e.g. <template lang=\"pug\"> -->\n<template>\n  <div id=\"app\">\n    <div class=\"bar-bg\" v-show=\"entries.length\"></div>\n    <div class=\"bar\" ref=\"bar\" v-show=\"entries.length\"></div>\n    <div v-if=\"entries.length\">\n      <div\n        class=\"entry\"\n        v-for=\"(entry, index) in entries\"\n        tabindex=\"0\"\n        @keydown.enter=\"copy(entry.otp)\"\n        @keydown.prevent.space=\"copy(entry.otp)\"\n        @keydown.delete=\"deleteEntry(index)\"\n        @keydown.ctrl.c=\"isCollapsed() && copy(entry.otp)\"\n        @keydown.stop.up=\"focusPrev\"\n        @keydown.stop.left=\"focusPrev\"\n        @keydown.stop.down=\"focusNext\"\n        @keydown.stop.right=\"focusNext\"\n      >\n        <div class=\"entry-left\">\n          <div v-if=\"entry.label\">{{ entry.label }}</div>\n          <div>secret: {{ entry.secret }}</div>\n          <div v-if=\"entry.issuer\">issuer: {{ entry.issuer }}</div>\n          <div>{{ new Date(entry.created_at) }}</div>\n        </div>\n        <div @click=\"copy(entry.otp)\">\n          <h1>{{ entry.otp }}</h1>\n        </div>\n      </div>\n      <h1 title=\"Delete a entry by DELETE key\">\n        Copy a OTP by\n        <span class=\"key\">Enter</span>\n        ,\n        <span class=\"key\">Space</span>\n        ,\n        <span class=\"key\">Ctrl</span>\n        +\n        <span class=\"key\">C</span>\n        , click&nbsp;a&nbsp;OTP\n      </h1>\n    </div>\n    <div\n      v-else\n      class=\"initial\"\n      title=\"If you paste QR image, add some white padding around the QR image by Win + Shift + S.\"\n    >\n      <h1>\n        Paste a secret key, URL, QR image by\n        <span class=\"key\">Ctrl</span>\n        +\n        <span class=\"key\">V</span>\n      </h1>\n    </div>\n    <a\n      href=\"https://qiita.com/7mpy/items/69084d19825e42238814\"\n      class=\"github-corner\"\n      aria-label=\"View source on GitHub\"\n      target=\"_blank\"\n    >\n      <svg\n        width=\"80\"\n        height=\"80\"\n        viewBox=\"0 0 250 250\"\n        :style=\"{\n          fill: '#64ceaa',\n          color: '#fff',\n          position: 'fixed',\n          top: entries.length ? '8px' : 0,\n          border: 0,\n          right: 0\n        }\"\n        aria-hidden=\"true\"\n      >\n        <path d=\"M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z\"></path>\n        <path\n          d=\"M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2\"\n          fill=\"currentColor\"\n          style=\"transform-origin: 130px 106px\"\n          class=\"octo-arm\"\n        ></path>\n        <path\n          d=\"M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z\"\n          fill=\"currentColor\"\n          class=\"octo-body\"\n        ></path>\n      </svg>\n    </a>\n  </div>\n</template>\n\n<script>\nimport jsQR from \"https://cdn.skypack.dev/jsqr@1.4.0\";\n\nasync function scanQRFromFile(file) {\n  const img = new Image();\n  img.src = URL.createObjectURL(file);\n  await new Promise((resolve) => img.addEventListener(\"load\", resolve));\n  const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);\n  const ctx = canvas.getContext(\"2d\");\n  ctx.imageSmoothingEnabled = false;\n  ctx.drawImage(img, 0, 0);\n  const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);\n  return jsQR(imageData.data, img.naturalWidth, img.naturalHeight)?.data;\n}\n\nexport default {\n  data() {\n    return {\n      entries: JSON.parse(localStorage.getItem(\"entries\")) ?? []\n    };\n  },\n  mounted() {\n    this.update();\n    addEventListener(\"keydown\", (e) => {\n      if ([\"ArrowDown\", \"ArrowRight\"].includes(e.key)) {\n        if (!document.querySelector(\".entry:first-of-type\")) return;\n        document.querySelector(\".entry:first-of-type\").focus();\n      }\n      if ([\"ArrowUp\", \"ArrowLeft\"].includes(e.key)) {\n        if (!document.querySelector(\".entry:last-of-type\")) return;\n        document.querySelector(\".entry:last-of-type\").focus();\n      }\n    });\n    addEventListener(\"paste\", async (e) => {\n      const text = e.clipboardData.getData(\"text\");\n      this.addText(text);\n      if (!e.clipboardData.files.length) return;\n      const data = await scanQRFromFile(e.clipboardData.files[0]);\n      if (!data) {\n        Toastify({\n          text: \"Could not scan the QR code.\",\n          duration: 10000,\n          style: {\n            background: \"linear-gradient(to right, #ff5f6d, #ffc371)\"\n          },\n          gravity: \"bottom\"\n        }).showToast();\n        Toastify({\n          text: \"Add some white padding around the QR image by PrintScreen.\",\n          duration: 10000,\n          destination:\n            \"https://github.com/cozmo/jsQR/issues/142#issuecomment-1364690399\",\n          newWindow: true,\n          style: {\n            background: \"linear-gradient(to right, #ff5f6d, #ffc371)\"\n          },\n          gravity: \"bottom\"\n        }).showToast();\n        return;\n      }\n      this.addText(data);\n    });\n    this.$nextTick().then(() => {\n      if (!document.querySelector(\".entry:first-of-type\")) return;\n      document.querySelector(\".entry:first-of-type\").focus();\n    });\n  },\n  methods: {\n    update() {\n      const ms = 1000 * 30;\n      const duration = ms - (Date.now() % ms);\n      setTimeout(this.update, duration);\n      this.$refs.bar.animate(\n        [\n          { transform: `translateX(-${((ms - duration) / ms) * 100}%)` },\n          { transform: `translateX(-100%)` }\n        ],\n        {\n          duration\n        }\n      );\n      this.updateOtp();\n    },\n    updateOtp() {\n      for (const entry of this.entries) {\n        const totp = new OTPAuth.TOTP(entry);\n        entry.otp = totp.generate();\n      }\n    },\n    addEntry(entry) {\n      entry.created_at = new Date();\n      const totp = new OTPAuth.TOTP(entry);\n      entry.otp = totp.generate();\n      this.entries.unshift(entry);\n      localStorage.setItem(\"entries\", JSON.stringify(this.entries));\n      this.copy(entry.otp);\n      scrollTo({ top: 0, behavior: \"smooth\" });\n    },\n    deleteEntry(index) {\n      this.$delete(this.entries, index);\n      localStorage.setItem(\"entries\", JSON.stringify(this.entries));\n    },\n    addText(text) {\n      if (!text) return;\n      if (/^[2-7]{6}$/.test(text)) return;\n      if (/^[A-Z2-7]+$/.test(text)) this.addEntry({ secret: text });\n      try {\n        const url = new URL(text);\n        const entry = Object.fromEntries(url.searchParams);\n        entry.label = decodeURIComponent(url.pathname.split(\"/\").at(-1));\n        this.addEntry(entry);\n      } catch (e) {\n        console.error(e);\n      }\n    },\n    copy(text) {\n      const activeElement = document.activeElement;\n      Toastify({ text, gravity: \"bottom\" }).showToast();\n      const input = document.body.appendChild(document.createElement(\"input\"));\n      input.value = text;\n      input.select();\n      document.execCommand(\"copy\");\n      input.parentNode.removeChild(input);\n      activeElement.focus();\n    },\n    isCollapsed() {\n      return getSelection().isCollapsed;\n    },\n    focusPrev(e) {\n      if (!e.target.previousElementSibling) return;\n      e.target.previousElementSibling.focus();\n    },\n    focusNext(e) {\n      if (!e.target.nextElementSibling) return;\n      e.target.nextElementSibling.focus();\n    }\n  }\n};\n</script>\n\n<!-- Use preprocessors via the lang attribute! e.g. <style lang=\"scss\"> -->\n<style>\nbody {\n  margin: 0;\n}\n\n#app {\n  text-align: center;\n  color: #2c3e50;\n}\n\n.bar-bg {\n  position: sticky;\n  top: 0;\n  height: 8px;\n  background: lightgreen;\n}\n\n.bar {\n  position: sticky;\n  top: 0;\n  margin-top: -8px;\n  height: 8px;\n  background: green;\n  will-change: transform;\n}\n\n.entry {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  margin: 16px auto;\n  border: 2px solid #fafafa;\n  border-radius: 8px;\n  padding: 8px;\n  max-width: 768px;\n  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.26);\n  outline-color: green;\n}\n\n.entry:focus {\n  border: 2px solid green;\n}\n\n.entry-left {\n  text-align: left;\n}\n\n.key {\n  border: 1px solid #19191c33;\n  border-radius: 4px;\n  padding: 0px 12px;\n  line-height: 1.8;\n  background: #19191c0d;\n}\n\n.initial {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n}\n\n.github-corner:hover .octo-arm {\n  animation: octocat-wave 560ms ease-in-out;\n}\n@keyframes octocat-wave {\n  0%,\n  100% {\n    transform: rotate(0);\n  }\n  20%,\n  60% {\n    transform: rotate(-25deg);\n  }\n  40%,\n  80% {\n    transform: rotate(10deg);\n  }\n}\n@media (max-width: 500px) {\n  .github-corner:hover .octo-arm {\n    animation: none;\n  }\n  .github-corner .octo-arm {\n    animation: octocat-wave 560ms ease-in-out;\n  }\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__ = undefined;
  /* module identifier */
  const __vue_module_identifier__ = undefined;
  /* functional template */
  const __vue_is_functional_template__ = false;
  /* style inject SSR */
  
  /* style inject shadow dom */
  

  
  const __vue_component__ = /*#__PURE__*/normalizeComponent(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    false,
    createInjector,
    undefined,
    undefined
  );

export default __vue_component__;