// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e15, t8, n7, r5) {
  var i7 = arguments.length, a5 = i7 < 3 ? t8 : r5 === null ? r5 = Object.getOwnPropertyDescriptor(t8, n7) : r5, o8;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e15, t8, n7, r5);
  else for (var s5 = e15.length - 1; s5 >= 0; s5--) (o8 = e15[s5]) && (a5 = (i7 < 3 ? o8(a5) : i7 > 3 ? o8(t8, n7, a5) : o8(t8, n7)) || a5);
  return i7 > 3 && a5 && Object.defineProperty(t8, n7, a5), a5;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t8, e15, o8) {
    if (this._$cssResult$ = true, o8 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t8, this.t = e15;
  }
  get styleSheet() {
    let t8 = this.o;
    const s5 = this.t;
    if (e2 && void 0 === t8) {
      const e15 = void 0 !== s5 && 1 === s5.length;
      e15 && (t8 = o.get(s5)), void 0 === t8 && ((this.o = t8 = new CSSStyleSheet()).replaceSync(this.cssText), e15 && o.set(s5, t8));
    }
    return t8;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t8) => new n("string" == typeof t8 ? t8 : t8 + "", void 0, s);
var i = (t8, ...e15) => {
  const o8 = 1 === t8.length ? t8[0] : e15.reduce((e16, s5, o9) => e16 + ((t9) => {
    if (true === t9._$cssResult$) return t9.cssText;
    if ("number" == typeof t9) return t9;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t9 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t8[o9 + 1], t8[0]);
  return new n(o8, t8, s);
};
var S = (s5, o8) => {
  if (e2) s5.adoptedStyleSheets = o8.map((t8) => t8 instanceof CSSStyleSheet ? t8 : t8.styleSheet);
  else for (const e15 of o8) {
    const o9 = document.createElement("style"), n7 = t.litNonce;
    void 0 !== n7 && o9.setAttribute("nonce", n7), o9.textContent = e15.cssText, s5.appendChild(o9);
  }
};
var c = e2 ? (t8) => t8 : (t8) => t8 instanceof CSSStyleSheet ? ((t9) => {
  let e15 = "";
  for (const s5 of t9.cssRules) e15 += s5.cssText;
  return r(e15);
})(t8) : t8;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t8, s5) => t8;
var u = { toAttribute(t8, s5) {
  switch (s5) {
    case Boolean:
      t8 = t8 ? l : null;
      break;
    case Object:
    case Array:
      t8 = null == t8 ? t8 : JSON.stringify(t8);
  }
  return t8;
}, fromAttribute(t8, s5) {
  let i7 = t8;
  switch (s5) {
    case Boolean:
      i7 = null !== t8;
      break;
    case Number:
      i7 = null === t8 ? null : Number(t8);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t8);
      } catch (t9) {
        i7 = null;
      }
  }
  return i7;
} };
var f = (t8, s5) => !i2(t8, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t8) {
    this._$Ei(), (this.l ??= []).push(t8);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t8, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t8) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t8, s5), !s5.noAccessor) {
      const i7 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t8, i7, s5);
      void 0 !== h3 && e3(this.prototype, t8, h3);
    }
  }
  static getPropertyDescriptor(t8, s5, i7) {
    const { get: e15, set: r5 } = h(this.prototype, t8) ?? { get() {
      return this[s5];
    }, set(t9) {
      this[s5] = t9;
    } };
    return { get: e15, set(s6) {
      const h3 = e15?.call(this);
      r5?.call(this, s6), this.requestUpdate(t8, h3, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t8) {
    return this.elementProperties.get(t8) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t8 = n2(this);
    t8.finalize(), void 0 !== t8.l && (this.l = [...t8.l]), this.elementProperties = new Map(t8.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t9 = this.properties, s5 = [...r2(t9), ...o2(t9)];
      for (const i7 of s5) this.createProperty(i7, t9[i7]);
    }
    const t8 = this[Symbol.metadata];
    if (null !== t8) {
      const s5 = litPropertyMetadata.get(t8);
      if (void 0 !== s5) for (const [t9, i7] of s5) this.elementProperties.set(t9, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t9, s5] of this.elementProperties) {
      const i7 = this._$Eu(t9, s5);
      void 0 !== i7 && this._$Eh.set(i7, t9);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i7 = [];
    if (Array.isArray(s5)) {
      const e15 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e15) i7.unshift(c(s6));
    } else void 0 !== s5 && i7.push(c(s5));
    return i7;
  }
  static _$Eu(t8, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t8 ? t8.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t8) => this.enableUpdating = t8), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t8) => t8(this));
  }
  addController(t8) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t8), void 0 !== this.renderRoot && this.isConnected && t8.hostConnected?.();
  }
  removeController(t8) {
    this._$EO?.delete(t8);
  }
  _$E_() {
    const t8 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t8.set(i7, this[i7]), delete this[i7]);
    t8.size > 0 && (this._$Ep = t8);
  }
  createRenderRoot() {
    const t8 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t8, this.constructor.elementStyles), t8;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t8) => t8.hostConnected?.());
  }
  enableUpdating(t8) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t8) => t8.hostDisconnected?.());
  }
  attributeChangedCallback(t8, s5, i7) {
    this._$AK(t8, i7);
  }
  _$ET(t8, s5) {
    const i7 = this.constructor.elementProperties.get(t8), e15 = this.constructor._$Eu(t8, i7);
    if (void 0 !== e15 && true === i7.reflect) {
      const h3 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s5, i7.type);
      this._$Em = t8, null == h3 ? this.removeAttribute(e15) : this.setAttribute(e15, h3), this._$Em = null;
    }
  }
  _$AK(t8, s5) {
    const i7 = this.constructor, e15 = i7._$Eh.get(t8);
    if (void 0 !== e15 && this._$Em !== e15) {
      const t9 = i7.getPropertyOptions(e15), h3 = "function" == typeof t9.converter ? { fromAttribute: t9.converter } : void 0 !== t9.converter?.fromAttribute ? t9.converter : u;
      this._$Em = e15;
      const r5 = h3.fromAttribute(s5, t9.type);
      this[e15] = r5 ?? this._$Ej?.get(e15) ?? r5, this._$Em = null;
    }
  }
  requestUpdate(t8, s5, i7, e15 = false, h3) {
    if (void 0 !== t8) {
      const r5 = this.constructor;
      if (false === e15 && (h3 = this[t8]), i7 ??= r5.getPropertyOptions(t8), !((i7.hasChanged ?? f)(h3, s5) || i7.useDefault && i7.reflect && h3 === this._$Ej?.get(t8) && !this.hasAttribute(r5._$Eu(t8, i7)))) return;
      this.C(t8, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t8, s5, { useDefault: i7, reflect: e15, wrapped: h3 }, r5) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t8) && (this._$Ej.set(t8, r5 ?? s5 ?? this[t8]), true !== h3 || void 0 !== r5) || (this._$AL.has(t8) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t8, s5)), true === e15 && this._$Em !== t8 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t8));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t9) {
      Promise.reject(t9);
    }
    const t8 = this.scheduleUpdate();
    return null != t8 && await t8, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t10, s6] of this._$Ep) this[t10] = s6;
        this._$Ep = void 0;
      }
      const t9 = this.constructor.elementProperties;
      if (t9.size > 0) for (const [s6, i7] of t9) {
        const { wrapped: t10 } = i7, e15 = this[s6];
        true !== t10 || this._$AL.has(s6) || void 0 === e15 || this.C(s6, void 0, i7, e15);
      }
    }
    let t8 = false;
    const s5 = this._$AL;
    try {
      t8 = this.shouldUpdate(s5), t8 ? (this.willUpdate(s5), this._$EO?.forEach((t9) => t9.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t8 = false, this._$EM(), s6;
    }
    t8 && this._$AE(s5);
  }
  willUpdate(t8) {
  }
  _$AE(t8) {
    this._$EO?.forEach((t9) => t9.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t8)), this.updated(t8);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t8) {
    return true;
  }
  update(t8) {
    this._$Eq &&= this._$Eq.forEach((t9) => this._$ET(t9, this[t9])), this._$EM();
  }
  updated(t8) {
  }
  firstUpdated(t8) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t8) => t8;
var s2 = t2.trustedTypes;
var e4 = s2 ? s2.createPolicy("lit-html", { createHTML: (t8) => t8 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t8) => null === t8 || "object" != typeof t8 && "function" != typeof t8;
var u2 = Array.isArray;
var d2 = (t8) => u2(t8) || "function" == typeof t8?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t8) => (i7, ...s5) => ({ _$litType$: t8, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t8, i7) {
  if (!u2(t8) || !t8.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i7) : i7;
}
var N = (t8, i7) => {
  const s5 = t8.length - 1, e15 = [];
  let n7, l4 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c4 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t8[i8];
    let a5, u3, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u3 = c4.exec(s6), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n7 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n7 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a5 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n7 = void 0);
    const x2 = c4 === p2 && t8[i8 + 1].startsWith("/>") ? " " : "";
    l4 += c4 === v ? s6 + r3 : d3 >= 0 ? (e15.push(a5), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t8, l4 + (t8[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e15];
};
var S2 = class _S {
  constructor({ strings: t8, _$litType$: i7 }, e15) {
    let r5;
    this.parts = [];
    let l4 = 0, a5 = 0;
    const u3 = t8.length - 1, d3 = this.parts, [f3, v2] = N(t8, i7);
    if (this.el = _S.createElement(f3, e15), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t9 = this.el.content.firstChild;
      t9.replaceWith(...t9.childNodes);
    }
    for (; null !== (r5 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r5.nodeType) {
        if (r5.hasAttributes()) for (const t9 of r5.getAttributeNames()) if (t9.endsWith(h2)) {
          const i8 = v2[a5++], s5 = r5.getAttribute(t9).split(o3), e16 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l4, name: e16[2], strings: s5, ctor: "." === e16[1] ? I : "?" === e16[1] ? L : "@" === e16[1] ? z : H }), r5.removeAttribute(t9);
        } else t9.startsWith(o3) && (d3.push({ type: 6, index: l4 }), r5.removeAttribute(t9));
        if (y2.test(r5.tagName)) {
          const t9 = r5.textContent.split(o3), i8 = t9.length - 1;
          if (i8 > 0) {
            r5.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r5.append(t9[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l4 });
            r5.append(t9[i8], c3());
          }
        }
      } else if (8 === r5.nodeType) if (r5.data === n3) d3.push({ type: 2, index: l4 });
      else {
        let t9 = -1;
        for (; -1 !== (t9 = r5.data.indexOf(o3, t9 + 1)); ) d3.push({ type: 7, index: l4 }), t9 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t8, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t8, s5;
  }
};
function M(t8, i7, s5 = t8, e15) {
  if (i7 === E) return i7;
  let h3 = void 0 !== e15 ? s5._$Co?.[e15] : s5._$Cl;
  const o8 = a2(i7) ? void 0 : i7._$litDirective$;
  return h3?.constructor !== o8 && (h3?._$AO?.(false), void 0 === o8 ? h3 = void 0 : (h3 = new o8(t8), h3._$AT(t8, s5, e15)), void 0 !== e15 ? (s5._$Co ??= [])[e15] = h3 : s5._$Cl = h3), void 0 !== h3 && (i7 = M(t8, h3._$AS(t8, i7.values), h3, e15)), i7;
}
var R = class {
  constructor(t8, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t8, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t8) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e15 = (t8?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e15;
    let h3 = P.nextNode(), o8 = 0, n7 = 0, r5 = s5[0];
    for (; void 0 !== r5; ) {
      if (o8 === r5.index) {
        let i8;
        2 === r5.type ? i8 = new k(h3, h3.nextSibling, this, t8) : 1 === r5.type ? i8 = new r5.ctor(h3, r5.name, r5.strings, this, t8) : 6 === r5.type && (i8 = new Z(h3, this, t8)), this._$AV.push(i8), r5 = s5[++n7];
      }
      o8 !== r5?.index && (h3 = P.nextNode(), o8++);
    }
    return P.currentNode = l2, e15;
  }
  p(t8) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t8, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t8[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t8, i7, s5, e15) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t8, this._$AB = i7, this._$AM = s5, this.options = e15, this._$Cv = e15?.isConnected ?? true;
  }
  get parentNode() {
    let t8 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t8?.nodeType && (t8 = i7.parentNode), t8;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t8, i7 = this) {
    t8 = M(this, t8, i7), a2(t8) ? t8 === A || null == t8 || "" === t8 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t8 !== this._$AH && t8 !== E && this._(t8) : void 0 !== t8._$litType$ ? this.$(t8) : void 0 !== t8.nodeType ? this.T(t8) : d2(t8) ? this.k(t8) : this._(t8);
  }
  O(t8) {
    return this._$AA.parentNode.insertBefore(t8, this._$AB);
  }
  T(t8) {
    this._$AH !== t8 && (this._$AR(), this._$AH = this.O(t8));
  }
  _(t8) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t8 : this.T(l2.createTextNode(t8)), this._$AH = t8;
  }
  $(t8) {
    const { values: i7, _$litType$: s5 } = t8, e15 = "number" == typeof s5 ? this._$AC(t8) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e15) this._$AH.p(i7);
    else {
      const t9 = new R(e15, this), s6 = t9.u(this.options);
      t9.p(i7), this.T(s6), this._$AH = t9;
    }
  }
  _$AC(t8) {
    let i7 = C.get(t8.strings);
    return void 0 === i7 && C.set(t8.strings, i7 = new S2(t8)), i7;
  }
  k(t8) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e15 = 0;
    for (const h3 of t8) e15 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e15], s5._$AI(h3), e15++;
    e15 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e15), i7.length = e15);
  }
  _$AR(t8 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t8 !== this._$AB; ) {
      const s6 = i3(t8).nextSibling;
      i3(t8).remove(), t8 = s6;
    }
  }
  setConnected(t8) {
    void 0 === this._$AM && (this._$Cv = t8, this._$AP?.(t8));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t8, i7, s5, e15, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t8, this.name = i7, this._$AM = e15, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t8, i7 = this, s5, e15) {
    const h3 = this.strings;
    let o8 = false;
    if (void 0 === h3) t8 = M(this, t8, i7, 0), o8 = !a2(t8) || t8 !== this._$AH && t8 !== E, o8 && (this._$AH = t8);
    else {
      const e16 = t8;
      let n7, r5;
      for (t8 = h3[0], n7 = 0; n7 < h3.length - 1; n7++) r5 = M(this, e16[s5 + n7], i7, n7), r5 === E && (r5 = this._$AH[n7]), o8 ||= !a2(r5) || r5 !== this._$AH[n7], r5 === A ? t8 = A : t8 !== A && (t8 += (r5 ?? "") + h3[n7 + 1]), this._$AH[n7] = r5;
    }
    o8 && !e15 && this.j(t8);
  }
  j(t8) {
    t8 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t8 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t8) {
    this.element[this.name] = t8 === A ? void 0 : t8;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t8) {
    this.element.toggleAttribute(this.name, !!t8 && t8 !== A);
  }
};
var z = class extends H {
  constructor(t8, i7, s5, e15, h3) {
    super(t8, i7, s5, e15, h3), this.type = 5;
  }
  _$AI(t8, i7 = this) {
    if ((t8 = M(this, t8, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e15 = t8 === A && s5 !== A || t8.capture !== s5.capture || t8.once !== s5.once || t8.passive !== s5.passive, h3 = t8 !== A && (s5 === A || e15);
    e15 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t8), this._$AH = t8;
  }
  handleEvent(t8) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t8) : this._$AH.handleEvent(t8);
  }
};
var Z = class {
  constructor(t8, i7, s5) {
    this.element = t8, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t8) {
    M(this, t8);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t8, i7, s5) => {
  const e15 = s5?.renderBefore ?? i7;
  let h3 = e15._$litPart$;
  if (void 0 === h3) {
    const t9 = s5?.renderBefore ?? null;
    e15._$litPart$ = h3 = new k(i7.insertBefore(c3(), t9), t9, void 0, s5 ?? {});
  }
  return h3._$AI(t8), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t8 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t8.firstChild, t8;
  }
  update(t8) {
    const r5 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t8), this._$Do = D(r5, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// deps/swc/swc-dist/patterns/conversational-ai/conversation-thread/conversation-thread.js
var t3 = i`:host{display:block;inline-size:100%}*,*:before,*:after{box-sizing:border-box}.swc-ConversationThread{display:flex;flex-direction:column;gap:var(--swc-conversation-thread-gap, 8px);inline-size:100%}`;

// node_modules/@lit/reactive-element/decorators/base.js
var e5 = (e15, t8, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t8 && Object.defineProperty(e15, t8, c4), c4);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o5(o8) {
  return (e15, n7) => {
    const { slot: r5, selector: s5 } = o8 ?? {}, c4 = "slot" + (r5 ? `[name=${r5}]` : ":not([name])");
    return e5(e15, n7, { get() {
      const t8 = this.renderRoot?.querySelector(c4), e16 = t8?.assignedElements(o8) ?? [];
      return void 0 === s5 ? e16 : e16.filter((t9) => t9.matches(s5));
    } });
  };
}

// deps/swc/swc-dist/core/utils/get-active-element.js
function e6(e15 = document) {
  var t8;
  let n7 = e15.activeElement;
  for (; !(n7 == null || (t8 = n7.shadowRoot) == null) && t8.activeElement; ) n7 = n7.shadowRoot.activeElement;
  return n7;
}

// deps/swc/swc-dist/core/utils/focusable-selectors.js
var e7 = [
  "input:not([inert]):not([disabled])",
  "select:not([inert]):not([disabled])",
  "textarea:not([inert]):not([disabled])",
  "a[href]:not([inert])",
  "button:not([inert]):not([disabled])",
  "[tabindex]:not([inert])",
  "audio[controls]:not([inert])",
  "video[controls]:not([inert])",
  '[contenteditable]:not([contenteditable="false"]):not([inert])',
  "details>summary:first-of-type:not([inert])",
  "details:not([inert])"
].join(",");
var t4 = e7.split(",").map((e15) => e15 + ':not([tabindex="-1"])').join(",");

// deps/swc/swc-dist/core/element/define-element.js
function e10(e15, t8) {
  window.__swc && window.__swc.DEBUG && customElements.get(e15) && window.__swc.warn(void 0, `Attempted to redefine <${e15}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e15, t8);
}

// deps/swc/swc-dist/core/element/version.js
var e11 = "0.1.0";
var t5 = "0.1.0";

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t8) {
  class n7 extends t8 {
    hasVisibleFocusInTree() {
      var t9;
      let n8 = e6(this.getRootNode());
      return (t9 = n8 == null ? void 0 : n8.matches(":focus-visible")) == null ? false : t9;
    }
  }
  return n7;
}
var o6 = class extends a3(i4) {
  get dir() {
    var e15;
    return (e15 = getComputedStyle(this).direction) == null ? "ltr" : e15;
  }
};
if (i5 = o6, i5.VERSION = e11, i5.CORE_VERSION = t5, true) {
  let e15 = {
    default: false,
    accessibility: false,
    api: false
  }, t8 = {
    default: false,
    low: false,
    medium: false,
    high: false,
    deprecation: false
  };
  window.__swc = {
    ...window.__swc,
    DEBUG: true,
    ignoreWarningLocalNames: { ...((s5 = window.__swc) == null ? void 0 : s5.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e15,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t8,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e16, t9, n7, { type: r5 = "api", level: i7 = "default", issues: a5 } = {}) => {
      let { localName: o8 = "base" } = e16 || {}, s6 = `${o8}:${r5}:${i7}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o8] || window.__swc.ignoreWarningTypes[r5] || window.__swc.ignoreWarningLevels[i7]) return;
      window.__swc.issuedWarnings.add(s6);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l5 = i7 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e16 ? "\nInspect this issue in the follow element:" : "", d3 = (e16 ? "\n\n" : "\n") + n7 + "\n", f3 = [];
      f3.push(l5 + t9 + "\n" + c5 + u3), e16 && f3.push(e16), f3.push(d3, { data: {
        localName: o8,
        type: r5,
        level: i7
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c4;
var l4;

// deps/swc/swc-dist/core/controllers/focusgroup-navigation-controller/src/focusgroup-navigation-controller.js
var e12 = {
  wrap: false,
  memory: true,
  skipDisabled: false
};
var t7 = 6;
var n5 = "swc-focusgroup-navigation-active-change";
var r4 = class {
  constructor(t8, n7) {
    this.boundKeydown = this.handleKeydown.bind(this), this.boundFocusin = this.handleFocusin.bind(this), this.boundFocusout = this.handleFocusout.bind(this), this.lastFocused = null, this.previousActive = null, this.isNavigating = false, this.cachedEligibleItems = null, this.cachedRows = null, this.host = t8, this.options = {
      ...e12,
      ...n7
    }, t8.addController(this);
  }
  setOptions(e15) {
    this.options = {
      ...this.options,
      ...e15
    }, this.refresh();
  }
  getActiveItem() {
    for (let e15 of this.getEligibleItems()) if (e15.tabIndex === 0) return e15;
    return null;
  }
  refresh() {
    var e15, t8;
    this.cachedEligibleItems = null, this.cachedRows = null;
    let n7 = this.getEligibleItems();
    if (n7.length === 0) {
      for (let e16 of this.getRawItems()) e16.tabIndex = -1;
      if (this.lastFocused = null, this.previousActive !== null) {
        var r5, i7;
        this.previousActive = null, this.dispatchActiveChange(null), (r5 = (i7 = this.options).onActiveItemChange) == null || r5.call(i7, null);
      }
      return;
    }
    let a5 = (e15 = (t8 = this.options.memory && this.lastFocused && n7.includes(this.lastFocused) ? this.lastFocused : null) == null ? this.getActiveItem() : t8) == null ? n7[0] : e15;
    this.applyRovingTabindex(a5);
  }
  setActiveItem(e15) {
    return this.getEligibleItems().includes(e15) ? (this.applyRovingTabindex(e15), this.options.memory && (this.lastFocused = e15), true) : false;
  }
  focusFirstItemByTextPrefix(e15) {
    let t8 = e15.trim();
    if (t8 === "") return false;
    let n7 = t8.toLowerCase(), r5 = this.getEligibleItems().find((e16) => this.getItemTypeaheadLabel(e16).toLowerCase().startsWith(n7));
    return r5 ? (this.applyRovingTabindex(r5), true) : false;
  }
  hostConnected() {
    this.previousActive = null, this.cachedEligibleItems = null, this.cachedRows = null, this.host.addEventListener("keydown", this.boundKeydown, true), this.host.addEventListener("focusin", this.boundFocusin, true), this.host.addEventListener("focusout", this.boundFocusout, true), this.refresh();
  }
  hostDisconnected() {
    this.host.removeEventListener("keydown", this.boundKeydown, true), this.host.removeEventListener("focusin", this.boundFocusin, true), this.host.removeEventListener("focusout", this.boundFocusout, true);
  }
  isRtl() {
    return getComputedStyle(this.host).direction === "rtl";
  }
  isNodeWithinHostScope(e15) {
    if (!e15) return false;
    let t8 = this.host, n7 = e15;
    for (; n7; ) {
      if (n7 === t8) return true;
      let e16 = n7.parentNode;
      if (e16) n7 = e16;
      else if (n7 instanceof ShadowRoot) n7 = n7.host;
      else return false;
    }
    return false;
  }
  getRawItems() {
    return this.options.getItems().filter((e15) => this.isNodeWithinHostScope(e15));
  }
  getEligibleItems() {
    return this.cachedEligibleItems || (this.cachedEligibleItems = this.getRawItems().filter((e15) => this.isNavigableItem(e15))), this.cachedEligibleItems;
  }
  getRows(e15) {
    return this.cachedRows || (this.cachedRows = this.buildRows(e15)), this.cachedRows;
  }
  isNavigableItem(e15) {
    if (!e15.isConnected || e15.hasAttribute("inert") || e15.closest("[inert]")) return false;
    let t8 = getComputedStyle(e15);
    return !(t8.visibility === "hidden" || t8.display === "none" || this.options.skipDisabled && this.isDisabledForSkip(e15));
  }
  isDisabledForSkip(e15) {
    return "disabled" in e15 && e15.disabled ? true : e15.getAttribute("aria-disabled") === "true";
  }
  getItemTypeaheadLabel(e15) {
    var t8, n7, r5, i7;
    let a5 = (t8 = e15.getAttribute("aria-label")) == null ? void 0 : t8.trim();
    if (a5) return a5;
    let o8 = (n7 = e15.getAttribute("aria-labelledby")) == null ? void 0 : n7.trim();
    if (o8) {
      let t9 = e15.getRootNode(), n8 = [];
      for (let r7 of o8.split(/\s+/)) {
        var s5, c4;
        if (!r7) continue;
        let i8 = t9 instanceof ShadowRoot ? (s5 = t9.getElementById(r7)) == null ? e15.ownerDocument.getElementById(r7) : s5 : e15.ownerDocument.getElementById(r7), a6 = i8 == null || (c4 = i8.textContent) == null ? void 0 : c4.trim();
        a6 && n8.push(a6);
      }
      let r6 = n8.join(" ").trim();
      if (r6) return r6;
    }
    return (r5 = (i7 = e15.textContent) == null ? void 0 : i7.trim()) == null ? "" : r5;
  }
  isNativelyDisabled(e15) {
    return "disabled" in e15 && e15.disabled === true;
  }
  applyRovingTabindex(e15) {
    let t8 = this.getEligibleItems(), n7 = new Set(t8);
    for (let e16 of this.getRawItems()) n7.has(e16) || (e16.tabIndex = -1);
    if (t8.length === 0) return;
    let r5 = n7.has(e15) ? e15 : t8[0];
    if (this.isNativelyDisabled(r5)) {
      var i7;
      r5 = (i7 = t8.find((e16) => !this.isNativelyDisabled(e16))) == null ? r5 : i7;
    }
    for (let e16 of t8) e16 === r5 ? e16.tabIndex = 0 : e16.tabIndex = -1;
    if (r5 !== this.previousActive) {
      var a5, o8;
      this.previousActive = r5, this.dispatchActiveChange(r5), (a5 = (o8 = this.options).onActiveItemChange) == null || a5.call(o8, r5);
    }
  }
  dispatchActiveChange(e15) {
    this.host.dispatchEvent(new CustomEvent(n5, {
      bubbles: true,
      composed: true,
      detail: { activeElement: e15 }
    }));
  }
  resolveManagedFocusTarget(e15, t8) {
    if (t8.length === 0) return null;
    let n7 = new Set(t8);
    for (let t9 of e15.composedPath()) if (t9 instanceof HTMLElement) {
      if (n7.has(t9)) return t9;
      if (t9 === this.host) break;
    }
    let r5 = this.host.shadowRoot, i7 = r5 == null ? void 0 : r5.activeElement;
    return i7 instanceof HTMLElement && n7.has(i7) ? i7 : null;
  }
  handleFocusin(e15) {
    if (this.isNavigating) return;
    this.cachedEligibleItems = null, this.cachedRows = null;
    let t8 = this.getEligibleItems(), n7 = this.resolveManagedFocusTarget(e15, t8);
    n7 && (this.applyRovingTabindex(n7), this.options.memory && (this.lastFocused = n7));
  }
  handleFocusout(e15) {
    let t8 = e15.relatedTarget;
    if (t8 instanceof Node && this.isNodeWithinHostScope(t8)) return;
    let n7 = e15.target;
    if (this.options.memory && n7 instanceof HTMLElement && this.getRawItems().includes(n7) && (this.lastFocused = n7), !this.options.memory) {
      this.cachedEligibleItems = null, this.cachedRows = null;
      let e16 = this.getEligibleItems();
      e16.length > 0 && this.applyRovingTabindex(e16[0]);
    }
  }
  resolveManagedKeydownTarget(e15, t8) {
    if (t8.length === 0) return null;
    let n7 = new Set(t8);
    for (let t9 of e15.composedPath()) if (t9 instanceof HTMLElement) {
      if (n7.has(t9)) return t9;
      if (t9 === this.host) break;
    }
    let r5 = this.host.shadowRoot, i7 = r5 == null ? void 0 : r5.activeElement;
    return i7 instanceof HTMLElement && n7.has(i7) ? i7 : null;
  }
  handleKeydown(e15) {
    if (e15.defaultPrevented || e15.altKey) return;
    this.cachedEligibleItems = null, this.cachedRows = null;
    let t8 = this.getEligibleItems(), n7 = this.resolveManagedKeydownTarget(e15, t8);
    if (!n7) return;
    let r5 = this.options.direction === "grid", i7 = r5 ? this.getRows(t8) : null;
    if (r5 && e15.ctrlKey && !e15.metaKey && (e15.key === "Home" || e15.key === "End")) {
      if (i7.length > 0) {
        var a5, o8;
        let t9 = i7[0], r6 = i7[i7.length - 1], s6 = e15.key === "Home" ? (a5 = t9 == null ? void 0 : t9[0]) == null ? null : a5 : (o8 = r6 == null ? void 0 : r6[r6.length - 1]) == null ? null : o8;
        s6 && s6 !== n7 && (e15.preventDefault(), this.moveKeyNavigationFocusTo(s6));
      }
      return;
    }
    if (e15.ctrlKey || e15.metaKey) return;
    let s5 = this.getEffectivePageMagnitude();
    if (s5 !== null && (e15.key === "PageUp" || e15.key === "PageDown")) {
      let r6 = this.navigatePage(t8, n7, e15.key === "PageDown" ? s5 : -s5, i7);
      r6 && r6 !== n7 && (e15.preventDefault(), this.moveKeyNavigationFocusTo(r6));
      return;
    }
    let c4 = this.isRtl(), l4 = null;
    switch (this.options.direction) {
      case "horizontal":
        l4 = this.navigateLinear(t8, n7, e15.key, "horizontal", c4);
        break;
      case "vertical":
        l4 = this.navigateLinear(t8, n7, e15.key, "vertical", c4);
        break;
      case "both":
        l4 = this.navigateBothAxes(t8, n7, e15.key, c4);
        break;
      case "grid":
        l4 = this.navigateGrid(n7, e15.key, c4, i7);
        break;
      default:
        break;
    }
    if (l4 && l4 !== n7) {
      e15.preventDefault(), this.moveKeyNavigationFocusTo(l4);
      return;
    }
    if (e15.key === "Home" || e15.key === "End") if (r5) {
      let t9 = this.findGridIndex(i7, n7);
      if (!t9) return;
      let r6 = i7[t9.row];
      if (!(r6 != null && r6.length)) return;
      let a6 = e15.key === "Home" ? r6[0] : r6[r6.length - 1];
      a6 && a6 !== n7 && (e15.preventDefault(), this.moveKeyNavigationFocusTo(a6));
    } else {
      if (t8.length === 0) return;
      let r6 = e15.key === "Home" ? t8[0] : t8[t8.length - 1];
      r6 && r6 !== n7 && (e15.preventDefault(), this.moveKeyNavigationFocusTo(r6));
    }
  }
  moveKeyNavigationFocusTo(e15) {
    this.isNavigating = true;
    try {
      this.setActiveItem(e15) && e15.focus();
    } finally {
      this.isNavigating = false;
    }
  }
  getEffectivePageMagnitude() {
    let e15 = this.options.pageStep;
    if (e15 === void 0) return null;
    let t8 = Math.trunc(Number(e15));
    return !Number.isFinite(t8) || t8 === 0 ? null : Math.abs(t8);
  }
  navigatePage(e15, t8, n7, r5) {
    return this.options.direction === "grid" ? this.navigatePageGridRows(t8, n7, r5) : this.navigatePageLinearItems(e15, t8, n7);
  }
  navigatePageLinearItems(e15, t8, n7) {
    var r5;
    let i7 = e15.indexOf(t8);
    if (i7 < 0 || e15.length === 0) return null;
    let a5 = i7 + n7;
    if (this.options.wrap) {
      let t9 = e15.length;
      a5 = (a5 % t9 + t9) % t9;
    } else a5 = Math.max(0, Math.min(e15.length - 1, a5));
    return (r5 = e15[a5]) == null ? null : r5;
  }
  navigatePageGridRows(e15, t8, n7) {
    var r5;
    if (n7.length === 0) return null;
    let i7 = this.findGridIndex(n7, e15);
    if (!i7) return null;
    let { row: a5, col: o8 } = i7, s5 = a5 + t8;
    if (this.options.wrap) {
      let e16 = n7.length;
      s5 = (s5 % e16 + e16) % e16;
    } else s5 = Math.max(0, Math.min(n7.length - 1, s5));
    let c4 = n7[s5];
    return c4 != null && c4.length ? (r5 = c4[Math.min(o8, c4.length - 1)]) == null ? null : r5 : null;
  }
  navigateLinear(e15, t8, n7, r5, i7) {
    var a5;
    let o8 = e15.indexOf(t8);
    if (o8 < 0) return null;
    let s5 = 0;
    if (r5 === "horizontal" ? n7 === "ArrowLeft" ? s5 = i7 ? 1 : -1 : n7 === "ArrowRight" && (s5 = i7 ? -1 : 1) : n7 === "ArrowUp" ? s5 = -1 : n7 === "ArrowDown" && (s5 = 1), s5 === 0) return null;
    let c4 = o8 + s5;
    if (this.options.wrap) c4 = (c4 + e15.length) % e15.length;
    else if (c4 < 0 || c4 >= e15.length) return null;
    return (a5 = e15[c4]) == null ? null : a5;
  }
  navigateBothAxes(e15, t8, n7, r5) {
    var i7;
    let a5 = e15.indexOf(t8);
    if (a5 < 0) return null;
    let o8 = 0;
    if (n7 === "ArrowLeft" ? o8 = r5 ? 1 : -1 : n7 === "ArrowRight" ? o8 = r5 ? -1 : 1 : n7 === "ArrowUp" ? o8 = -1 : n7 === "ArrowDown" && (o8 = 1), o8 === 0) return null;
    let s5 = a5 + o8;
    if (this.options.wrap) s5 = (s5 + e15.length) % e15.length;
    else if (s5 < 0 || s5 >= e15.length) return null;
    return (i7 = e15[s5]) == null ? null : i7;
  }
  navigateGrid(e15, t8, n7, r5) {
    var i7, a5;
    let o8 = this.findGridIndex(r5, e15);
    if (!o8) return null;
    let { row: s5, col: c4 } = o8, l4 = (i7 = r5[s5]) == null ? [] : i7, u3 = s5, d3 = c4;
    switch (t8) {
      case "ArrowLeft":
        d3 = n7 ? c4 + 1 : c4 - 1;
        break;
      case "ArrowRight":
        d3 = n7 ? c4 - 1 : c4 + 1;
        break;
      case "ArrowUp":
        u3 = s5 - 1;
        break;
      case "ArrowDown":
        u3 = s5 + 1;
        break;
      default:
        return null;
    }
    if (t8 === "ArrowLeft" || t8 === "ArrowRight") {
      if (d3 >= 0 && d3 < l4.length) {
        var f3;
        return (f3 = l4[d3]) == null ? null : f3;
      }
      if (this.options.wrap && l4.length > 0) {
        var p3;
        return (p3 = l4[(d3 + l4.length) % l4.length]) == null ? null : p3;
      }
      return null;
    }
    if (u3 < 0 || u3 >= r5.length) if (this.options.wrap && r5.length > 0) u3 = (u3 + r5.length) % r5.length;
    else return null;
    let m2 = r5[u3];
    return m2 != null && m2.length ? (a5 = m2[Math.min(c4, m2.length - 1)]) == null ? null : a5 : null;
  }
  buildRows(e15) {
    let n7 = [];
    for (let r5 of e15) {
      let e16 = r5.getBoundingClientRect().top, i7 = n7.find((n8) => Math.abs(n8.top - e16) <= t7);
      i7 || (i7 = {
        top: e16,
        elements: []
      }, n7.push(i7)), i7.elements.push(r5);
    }
    return n7.sort((e16, t8) => e16.top - t8.top), n7.map((e16) => e16.elements.sort((e17, t8) => e17.getBoundingClientRect().left - t8.getBoundingClientRect().left));
  }
  findGridIndex(e15, t8) {
    for (let n7 = 0; n7 < e15.length; n7++) {
      let r5 = e15[n7].indexOf(t8);
      if (r5 !== -1) return {
        row: n7,
        col: r5
      };
    }
    return null;
  }
};

// deps/swc/swc-dist/patterns/conversational-ai/conversation-thread/ConversationThread.js
var s4 = class extends o6 {
  constructor(...e15) {
    super(...e15), this.focusgroupNavigationController = new r4(this, {
      direction: "vertical",
      getItems: () => this._getItemsFromSlot()
    });
  }
  static get styles() {
    return [t3];
  }
  focus(e15) {
    this._syncRovingFocusTarget();
    let t8 = this.focusgroupNavigationController.getActiveItem();
    t8 == null || t8.focus(e15);
  }
  _setActiveToLast() {
    let e15 = this._getItemsFromSlot();
    e15.length && this.focusgroupNavigationController.setActiveItem(e15[e15.length - 1]);
  }
  _getItemsFromSlot() {
    var e15;
    return Array.from((e15 = this._assignedTurns) == null ? [] : e15);
  }
  _syncRovingFocusTarget(e15 = false) {
    this.focusgroupNavigationController.refresh();
    let t8 = this._getItemsFromSlot();
    t8.length && e15 && this.focusgroupNavigationController.setActiveItem(t8[t8.length - 1]);
  }
  _handleSlotChange() {
    let e15 = this._getItemsFromSlot().some((e16) => e16.hasAttribute("tabindex"));
    this._syncRovingFocusTarget(e15 && !this._hasFocusWithin());
  }
  _handleFocusOut(e15) {
    let t8 = e15.relatedTarget;
    t8 instanceof Node && this.contains(t8) || this._setActiveToLast();
  }
  _hasFocusWithin() {
    let e15 = e6(this.getRootNode());
    return e15 instanceof Node && this.contains(e15);
  }
  render() {
    return b2`
      <div class="swc-ConversationThread" @focusout=${this._handleFocusOut}>
        <slot @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
};
e([o5({
  flatten: true,
  selector: "swc-conversation-turn"
})], s4.prototype, "_assignedTurns", void 0);

// deps/swc/swc-dist/patterns/conversational-ai/conversation-thread/index.js
e10("swc-conversation-thread", s4);
export {
  s4 as ConversationThread
};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
