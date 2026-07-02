// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t9, e13, o8) {
    if (this._$cssResult$ = true, o8 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t9, this.t = e13;
  }
  get styleSheet() {
    let t9 = this.o;
    const s4 = this.t;
    if (e && void 0 === t9) {
      const e13 = void 0 !== s4 && 1 === s4.length;
      e13 && (t9 = o.get(s4)), void 0 === t9 && ((this.o = t9 = new CSSStyleSheet()).replaceSync(this.cssText), e13 && o.set(s4, t9));
    }
    return t9;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t9) => new n("string" == typeof t9 ? t9 : t9 + "", void 0, s);
var i = (t9, ...e13) => {
  const o8 = 1 === t9.length ? t9[0] : e13.reduce((e14, s4, o9) => e14 + ((t10) => {
    if (true === t10._$cssResult$) return t10.cssText;
    if ("number" == typeof t10) return t10;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t10 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t9[o9 + 1], t9[0]);
  return new n(o8, t9, s);
};
var S = (s4, o8) => {
  if (e) s4.adoptedStyleSheets = o8.map((t9) => t9 instanceof CSSStyleSheet ? t9 : t9.styleSheet);
  else for (const e13 of o8) {
    const o9 = document.createElement("style"), n8 = t.litNonce;
    void 0 !== n8 && o9.setAttribute("nonce", n8), o9.textContent = e13.cssText, s4.appendChild(o9);
  }
};
var c = e ? (t9) => t9 : (t9) => t9 instanceof CSSStyleSheet ? ((t10) => {
  let e13 = "";
  for (const s4 of t10.cssRules) e13 += s4.cssText;
  return r(e13);
})(t9) : t9;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t9, s4) => t9;
var u = { toAttribute(t9, s4) {
  switch (s4) {
    case Boolean:
      t9 = t9 ? l : null;
      break;
    case Object:
    case Array:
      t9 = null == t9 ? t9 : JSON.stringify(t9);
  }
  return t9;
}, fromAttribute(t9, s4) {
  let i7 = t9;
  switch (s4) {
    case Boolean:
      i7 = null !== t9;
      break;
    case Number:
      i7 = null === t9 ? null : Number(t9);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t9);
      } catch (t10) {
        i7 = null;
      }
  }
  return i7;
} };
var f = (t9, s4) => !i2(t9, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t9) {
    this._$Ei(), (this.l ??= []).push(t9);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t9, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t9) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t9, s4), !s4.noAccessor) {
      const i7 = /* @__PURE__ */ Symbol(), h4 = this.getPropertyDescriptor(t9, i7, s4);
      void 0 !== h4 && e2(this.prototype, t9, h4);
    }
  }
  static getPropertyDescriptor(t9, s4, i7) {
    const { get: e13, set: r8 } = h(this.prototype, t9) ?? { get() {
      return this[s4];
    }, set(t10) {
      this[s4] = t10;
    } };
    return { get: e13, set(s5) {
      const h4 = e13?.call(this);
      r8?.call(this, s5), this.requestUpdate(t9, h4, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t9) {
    return this.elementProperties.get(t9) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t9 = n2(this);
    t9.finalize(), void 0 !== t9.l && (this.l = [...t9.l]), this.elementProperties = new Map(t9.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t10 = this.properties, s4 = [...r2(t10), ...o2(t10)];
      for (const i7 of s4) this.createProperty(i7, t10[i7]);
    }
    const t9 = this[Symbol.metadata];
    if (null !== t9) {
      const s4 = litPropertyMetadata.get(t9);
      if (void 0 !== s4) for (const [t10, i7] of s4) this.elementProperties.set(t10, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t10, s4] of this.elementProperties) {
      const i7 = this._$Eu(t10, s4);
      void 0 !== i7 && this._$Eh.set(i7, t10);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i7 = [];
    if (Array.isArray(s4)) {
      const e13 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e13) i7.unshift(c(s5));
    } else void 0 !== s4 && i7.push(c(s4));
    return i7;
  }
  static _$Eu(t9, s4) {
    const i7 = s4.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t9 ? t9.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t9) => this.enableUpdating = t9), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t9) => t9(this));
  }
  addController(t9) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t9), void 0 !== this.renderRoot && this.isConnected && t9.hostConnected?.();
  }
  removeController(t9) {
    this._$EO?.delete(t9);
  }
  _$E_() {
    const t9 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i7 of s4.keys()) this.hasOwnProperty(i7) && (t9.set(i7, this[i7]), delete this[i7]);
    t9.size > 0 && (this._$Ep = t9);
  }
  createRenderRoot() {
    const t9 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t9, this.constructor.elementStyles), t9;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t9) => t9.hostConnected?.());
  }
  enableUpdating(t9) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t9) => t9.hostDisconnected?.());
  }
  attributeChangedCallback(t9, s4, i7) {
    this._$AK(t9, i7);
  }
  _$ET(t9, s4) {
    const i7 = this.constructor.elementProperties.get(t9), e13 = this.constructor._$Eu(t9, i7);
    if (void 0 !== e13 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s4, i7.type);
      this._$Em = t9, null == h4 ? this.removeAttribute(e13) : this.setAttribute(e13, h4), this._$Em = null;
    }
  }
  _$AK(t9, s4) {
    const i7 = this.constructor, e13 = i7._$Eh.get(t9);
    if (void 0 !== e13 && this._$Em !== e13) {
      const t10 = i7.getPropertyOptions(e13), h4 = "function" == typeof t10.converter ? { fromAttribute: t10.converter } : void 0 !== t10.converter?.fromAttribute ? t10.converter : u;
      this._$Em = e13;
      const r8 = h4.fromAttribute(s4, t10.type);
      this[e13] = r8 ?? this._$Ej?.get(e13) ?? r8, this._$Em = null;
    }
  }
  requestUpdate(t9, s4, i7, e13 = false, h4) {
    if (void 0 !== t9) {
      const r8 = this.constructor;
      if (false === e13 && (h4 = this[t9]), i7 ??= r8.getPropertyOptions(t9), !((i7.hasChanged ?? f)(h4, s4) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t9) && !this.hasAttribute(r8._$Eu(t9, i7)))) return;
      this.C(t9, s4, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t9, s4, { useDefault: i7, reflect: e13, wrapped: h4 }, r8) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t9) && (this._$Ej.set(t9, r8 ?? s4 ?? this[t9]), true !== h4 || void 0 !== r8) || (this._$AL.has(t9) || (this.hasUpdated || i7 || (s4 = void 0), this._$AL.set(t9, s4)), true === e13 && this._$Em !== t9 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t9));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t10) {
      Promise.reject(t10);
    }
    const t9 = this.scheduleUpdate();
    return null != t9 && await t9, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t11, s5] of this._$Ep) this[t11] = s5;
        this._$Ep = void 0;
      }
      const t10 = this.constructor.elementProperties;
      if (t10.size > 0) for (const [s5, i7] of t10) {
        const { wrapped: t11 } = i7, e13 = this[s5];
        true !== t11 || this._$AL.has(s5) || void 0 === e13 || this.C(s5, void 0, i7, e13);
      }
    }
    let t9 = false;
    const s4 = this._$AL;
    try {
      t9 = this.shouldUpdate(s4), t9 ? (this.willUpdate(s4), this._$EO?.forEach((t10) => t10.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t9 = false, this._$EM(), s5;
    }
    t9 && this._$AE(s4);
  }
  willUpdate(t9) {
  }
  _$AE(t9) {
    this._$EO?.forEach((t10) => t10.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t9)), this.updated(t9);
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
  shouldUpdate(t9) {
    return true;
  }
  update(t9) {
    this._$Eq &&= this._$Eq.forEach((t10) => this._$ET(t10, this[t10])), this._$EM();
  }
  updated(t9) {
  }
  firstUpdated(t9) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t9) => t9;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t9) => t9 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t9) => null === t9 || "object" != typeof t9 && "function" != typeof t9;
var u2 = Array.isArray;
var d2 = (t9) => u2(t9) || "function" == typeof t9?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t9) => (i7, ...s4) => ({ _$litType$: t9, strings: i7, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t9, i7) {
  if (!u2(t9) || !t9.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t9, i7) => {
  const s4 = t9.length - 1, e13 = [];
  let n8, l4 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c4 = v;
  for (let i8 = 0; i8 < s4; i8++) {
    const s5 = t9[i8];
    let a5, u5, d4 = -1, f4 = 0;
    for (; f4 < s5.length && (c4.lastIndex = f4, u5 = c4.exec(s5), null !== u5); ) f4 = c4.lastIndex, c4 === v ? "!--" === u5[1] ? c4 = _ : void 0 !== u5[1] ? c4 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n8 = RegExp("</" + u5[2], "g")), c4 = p2) : void 0 !== u5[3] && (c4 = p2) : c4 === p2 ? ">" === u5[0] ? (c4 = n8 ?? v, d4 = -1) : void 0 === u5[1] ? d4 = -2 : (d4 = c4.lastIndex - u5[2].length, a5 = u5[1], c4 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n8 = void 0);
    const x2 = c4 === p2 && t9[i8 + 1].startsWith("/>") ? " " : "";
    l4 += c4 === v ? s5 + r3 : d4 >= 0 ? (e13.push(a5), s5.slice(0, d4) + h2 + s5.slice(d4) + o3 + x2) : s5 + o3 + (-2 === d4 ? i8 : x2);
  }
  return [V(t9, l4 + (t9[s4] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e13];
};
var S2 = class _S {
  constructor({ strings: t9, _$litType$: i7 }, e13) {
    let r8;
    this.parts = [];
    let l4 = 0, a5 = 0;
    const u5 = t9.length - 1, d4 = this.parts, [f4, v3] = N(t9, i7);
    if (this.el = _S.createElement(f4, e13), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t10 = this.el.content.firstChild;
      t10.replaceWith(...t10.childNodes);
    }
    for (; null !== (r8 = P.nextNode()) && d4.length < u5; ) {
      if (1 === r8.nodeType) {
        if (r8.hasAttributes()) for (const t10 of r8.getAttributeNames()) if (t10.endsWith(h2)) {
          const i8 = v3[a5++], s4 = r8.getAttribute(t10).split(o3), e14 = /([.?@])?(.*)/.exec(i8);
          d4.push({ type: 1, index: l4, name: e14[2], strings: s4, ctor: "." === e14[1] ? I : "?" === e14[1] ? L : "@" === e14[1] ? z : H }), r8.removeAttribute(t10);
        } else t10.startsWith(o3) && (d4.push({ type: 6, index: l4 }), r8.removeAttribute(t10));
        if (y2.test(r8.tagName)) {
          const t10 = r8.textContent.split(o3), i8 = t10.length - 1;
          if (i8 > 0) {
            r8.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i8; s4++) r8.append(t10[s4], c3()), P.nextNode(), d4.push({ type: 2, index: ++l4 });
            r8.append(t10[i8], c3());
          }
        }
      } else if (8 === r8.nodeType) if (r8.data === n3) d4.push({ type: 2, index: l4 });
      else {
        let t10 = -1;
        for (; -1 !== (t10 = r8.data.indexOf(o3, t10 + 1)); ) d4.push({ type: 7, index: l4 }), t10 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t9, i7) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t9, s4;
  }
};
function M(t9, i7, s4 = t9, e13) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e13 ? s4._$Co?.[e13] : s4._$Cl;
  const o8 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o8 && (h4?._$AO?.(false), void 0 === o8 ? h4 = void 0 : (h4 = new o8(t9), h4._$AT(t9, s4, e13)), void 0 !== e13 ? (s4._$Co ??= [])[e13] = h4 : s4._$Cl = h4), void 0 !== h4 && (i7 = M(t9, h4._$AS(t9, i7.values), h4, e13)), i7;
}
var R = class {
  constructor(t9, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t9, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t9) {
    const { el: { content: i7 }, parts: s4 } = this._$AD, e13 = (t9?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e13;
    let h4 = P.nextNode(), o8 = 0, n8 = 0, r8 = s4[0];
    for (; void 0 !== r8; ) {
      if (o8 === r8.index) {
        let i8;
        2 === r8.type ? i8 = new k(h4, h4.nextSibling, this, t9) : 1 === r8.type ? i8 = new r8.ctor(h4, r8.name, r8.strings, this, t9) : 6 === r8.type && (i8 = new Z(h4, this, t9)), this._$AV.push(i8), r8 = s4[++n8];
      }
      o8 !== r8?.index && (h4 = P.nextNode(), o8++);
    }
    return P.currentNode = l2, e13;
  }
  p(t9) {
    let i7 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t9, s4, i7), i7 += s4.strings.length - 2) : s4._$AI(t9[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t9, i7, s4, e13) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t9, this._$AB = i7, this._$AM = s4, this.options = e13, this._$Cv = e13?.isConnected ?? true;
  }
  get parentNode() {
    let t9 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t9?.nodeType && (t9 = i7.parentNode), t9;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t9, i7 = this) {
    t9 = M(this, t9, i7), a2(t9) ? t9 === A || null == t9 || "" === t9 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t9 !== this._$AH && t9 !== E && this._(t9) : void 0 !== t9._$litType$ ? this.$(t9) : void 0 !== t9.nodeType ? this.T(t9) : d2(t9) ? this.k(t9) : this._(t9);
  }
  O(t9) {
    return this._$AA.parentNode.insertBefore(t9, this._$AB);
  }
  T(t9) {
    this._$AH !== t9 && (this._$AR(), this._$AH = this.O(t9));
  }
  _(t9) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t9 : this.T(l2.createTextNode(t9)), this._$AH = t9;
  }
  $(t9) {
    const { values: i7, _$litType$: s4 } = t9, e13 = "number" == typeof s4 ? this._$AC(t9) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e13) this._$AH.p(i7);
    else {
      const t10 = new R(e13, this), s5 = t10.u(this.options);
      t10.p(i7), this.T(s5), this._$AH = t10;
    }
  }
  _$AC(t9) {
    let i7 = C.get(t9.strings);
    return void 0 === i7 && C.set(t9.strings, i7 = new S2(t9)), i7;
  }
  k(t9) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s4, e13 = 0;
    for (const h4 of t9) e13 === i7.length ? i7.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i7[e13], s4._$AI(h4), e13++;
    e13 < i7.length && (this._$AR(s4 && s4._$AB.nextSibling, e13), i7.length = e13);
  }
  _$AR(t9 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t9 !== this._$AB; ) {
      const s5 = i3(t9).nextSibling;
      i3(t9).remove(), t9 = s5;
    }
  }
  setConnected(t9) {
    void 0 === this._$AM && (this._$Cv = t9, this._$AP?.(t9));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t9, i7, s4, e13, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t9, this.name = i7, this._$AM = e13, this.options = h4, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t9, i7 = this, s4, e13) {
    const h4 = this.strings;
    let o8 = false;
    if (void 0 === h4) t9 = M(this, t9, i7, 0), o8 = !a2(t9) || t9 !== this._$AH && t9 !== E, o8 && (this._$AH = t9);
    else {
      const e14 = t9;
      let n8, r8;
      for (t9 = h4[0], n8 = 0; n8 < h4.length - 1; n8++) r8 = M(this, e14[s4 + n8], i7, n8), r8 === E && (r8 = this._$AH[n8]), o8 ||= !a2(r8) || r8 !== this._$AH[n8], r8 === A ? t9 = A : t9 !== A && (t9 += (r8 ?? "") + h4[n8 + 1]), this._$AH[n8] = r8;
    }
    o8 && !e13 && this.j(t9);
  }
  j(t9) {
    t9 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t9 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t9) {
    this.element[this.name] = t9 === A ? void 0 : t9;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t9) {
    this.element.toggleAttribute(this.name, !!t9 && t9 !== A);
  }
};
var z = class extends H {
  constructor(t9, i7, s4, e13, h4) {
    super(t9, i7, s4, e13, h4), this.type = 5;
  }
  _$AI(t9, i7 = this) {
    if ((t9 = M(this, t9, i7, 0) ?? A) === E) return;
    const s4 = this._$AH, e13 = t9 === A && s4 !== A || t9.capture !== s4.capture || t9.once !== s4.once || t9.passive !== s4.passive, h4 = t9 !== A && (s4 === A || e13);
    e13 && this.element.removeEventListener(this.name, this, s4), h4 && this.element.addEventListener(this.name, this, t9), this._$AH = t9;
  }
  handleEvent(t9) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t9) : this._$AH.handleEvent(t9);
  }
};
var Z = class {
  constructor(t9, i7, s4) {
    this.element = t9, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t9) {
    M(this, t9);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t9, i7, s4) => {
  const e13 = s4?.renderBefore ?? i7;
  let h4 = e13._$litPart$;
  if (void 0 === h4) {
    const t10 = s4?.renderBefore ?? null;
    e13._$litPart$ = h4 = new k(i7.insertBefore(c3(), t10), t10, void 0, s4 ?? {});
  }
  return h4._$AI(t9), h4;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t9 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t9.firstChild, t9;
  }
  update(t9) {
    const r8 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t9), this._$Do = D(r8, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/tooltip/tooltip.js
var t3 = i`:host{--_swc-tooltip-animation-distance: 4px;position:absolute;inset:auto;max-inline-size:min(100%,var(--swc-placement-available-width),var(--swc-tooltip-maximum-width));max-block-size:min(var(--swc-placement-available-height),90vh);max-block-size:min(var(--swc-placement-available-height),90vb);padding:0;margin:0;color:inherit;background:transparent;border:none;overflow:visible;opacity:0;transition-timing-function:ease-in-out;transition-duration:.13s;transition-property:transform,opacity,overlay,display;transition-behavior:allow-discrete}:host(:not(:popover-open)){display:none}*{box-sizing:border-box}.swc-Tooltip{--_swc-tooltip-tip-height: var(--swc-tooltip-tip-height);--_swc-tooltip-background-color: var(--swc-gray-800);--_swc-tooltip-tip-square-size: 8px;--_swc-tooltip-border-radius: 7px;display:inline-flex;position:relative;min-block-size:var(--swc-component-height-75);padding-block:5px;padding-inline:var(--swc-base-padding-horizontal-small);margin-block-end:var(--_swc-tooltip-tip-height);font-size:var(--swc-font-size-75);font-weight:400;line-height:var(--swc-line-height-font-size-75);color:var(--swc-gray-25);word-wrap:break-word;background-color:var(--swc-tooltip-background-color, var(--_swc-tooltip-background-color));border-radius:var(--_swc-tooltip-border-radius);&:lang(ja),&:lang(zh),&:lang(ko){line-height:1.5}}:host([variant=\"informative\"]){--swc-tooltip-background-color: var(--swc-informative-background-color-default)}:host([variant=\"negative\"]){--swc-tooltip-background-color: var(--swc-negative-background-color-default)}:host([actual-placement=\"bottom\"]) .swc-Tooltip{margin-block-start:var(--_swc-tooltip-tip-height);margin-block-end:0}:host([actual-placement=\"right\"]) .swc-Tooltip{margin-block-end:0;margin-left:var(--_swc-tooltip-tip-height)}:host([actual-placement=\"left\"]) .swc-Tooltip{margin-block-end:0;margin-right:var(--_swc-tooltip-tip-height)}:host(:popover-open){opacity:1}@starting-style{:host(:popover-open){opacity:0;transform:translateY(var(--_swc-tooltip-animation-distance))}}@starting-style{:host([actual-placement=\"bottom\"]:popover-open){transform:translateY(calc(-1 * var(--_swc-tooltip-animation-distance)))}}@starting-style{:host([actual-placement=\"right\"]:popover-open){transform:translate(calc(-1 * var(--_swc-tooltip-animation-distance)))}}@starting-style{:host([actual-placement=\"left\"]:popover-open){transform:translate(var(--_swc-tooltip-animation-distance))}}.swc-Tooltip-tip{position:absolute;top:calc(100% - (.5 * var(--_swc-tooltip-tip-square-size)));left:calc(50% - (.5 * var(--_swc-tooltip-tip-square-size)));z-index:-1;inline-size:var(--_swc-tooltip-tip-square-size);block-size:var(--_swc-tooltip-tip-square-size);background-color:inherit;border-radius:0 0 0 1px;clip-path:polygon(0 0,100% 100%,0 100%);transform:rotate(-45deg)}:host([actual-placement=\"top\"]) .swc-Tooltip-tip{top:calc(100% - (.5 * var(--_swc-tooltip-tip-square-size)));transform:rotate(-45deg)}:host([actual-placement=\"bottom\"]) .swc-Tooltip-tip{inset-block:auto calc(100% - (.5 * var(--_swc-tooltip-tip-square-size)));transform:rotate(135deg)}:host([actual-placement=\"right\"]) .swc-Tooltip-tip{top:calc(50% - (.5 * var(--_swc-tooltip-tip-square-size)));left:calc(-.5 * var(--_swc-tooltip-tip-square-size));transform:rotate(45deg)}:host([actual-placement=\"left\"]) .swc-Tooltip-tip{top:calc(50% - (.5 * var(--_swc-tooltip-tip-square-size)));right:calc(-.5 * var(--_swc-tooltip-tip-square-size));left:auto;transform:rotate(-135deg)}::slotted(*:not([class])){margin:0!important;font:inherit!important;color:inherit!important}@media(forced-colors:active){.swc-Tooltip{border:1px solid CanvasText}.swc-Tooltip-tip{background-color:CanvasText}}@media(prefers-reduced-motion:reduce){:host{transition-duration:0ms}}`;

// deps/swc/swc-dist/core/components/tooltip/Tooltip.types.js
var e4 = [
  "neutral",
  "informative",
  "negative"
];
var t4 = [
  "top",
  "bottom",
  "left",
  "right"
];
var n4 = ["start", "end"];
var r4 = [...t4, ...n4];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e5(e13, t9, n8, r8) {
  var i7 = arguments.length, a5 = i7 < 3 ? t9 : r8 === null ? r8 = Object.getOwnPropertyDescriptor(t9, n8) : r8, o8;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e13, t9, n8, r8);
  else for (var s4 = e13.length - 1; s4 >= 0; s4--) (o8 = e13[s4]) && (a5 = (i7 < 3 ? o8(a5) : i7 > 3 ? o8(t9, n8, a5) : o8(t9, n8)) || a5);
  return i7 > 3 && a5 && Object.defineProperty(t9, n8, a5), a5;
}

// deps/swc/swc-dist/core/controllers/hover-controller/src/hover-controller.js
var e6 = 300;
function t5(e13, t9) {
  let n8 = e13;
  return n8[t9] || (n8[t9] = {
    isWarm: false,
    cooldownTimer: null
  }), n8[t9];
}
var n5 = class {
  constructor(e13, t9) {
    this.target = null, this.warmupTimer = null, this.isBridgeWired = false, this.isGuardActive = false, this.hasFocusOpen = false, this.hadPointerdown = false, this.boundPointerDownTrigger = this.handlePointerDownTrigger.bind(this), this.boundPointerEnterTrigger = this.handlePointerEnterTrigger.bind(this), this.boundPointerLeaveTrigger = this.handlePointerLeaveTrigger.bind(this), this.boundFocusin = this.handleFocusin.bind(this), this.boundFocusout = this.handleFocusout.bind(this), this.boundPointerEnterHost = this.handlePointerEnterHost.bind(this), this.boundPointerLeaveHost = this.handlePointerLeaveHost.bind(this), this.host = e13, this.warmStateKey = /* @__PURE__ */ Symbol.for(`swc-hover-state:${t9.warmStateKey}`), e13.addController(this);
  }
  setTarget(e13) {
    this.unwireTarget(), this.clearWarmupTimer(), this.target = e13, this.wireTarget();
  }
  hostConnected() {
    this.wireTarget();
  }
  hostDisconnected() {
    this.unwireTarget(), this.unwireBridge(), this.clearWarmupTimer(), this.hasFocusOpen = false, this.hadPointerdown = false, this.isGuardActive = false;
  }
  hostUpdated() {
    let e13 = this.host.disabled || this.host.manual;
    e13 !== this.isGuardActive && (this.isGuardActive = e13, e13 ? (this.unwireTarget(), this.clearWarmupTimer(), this.clearCooldownTimer(), this.hasFocusOpen = false, this.hadPointerdown = false, this.unwireBridge(), this.callHidePopover()) : this.wireTarget());
  }
  wireTarget() {
    !this.target || this.host.disabled || this.host.manual || (this.target.addEventListener("pointerdown", this.boundPointerDownTrigger), this.target.addEventListener("pointerenter", this.boundPointerEnterTrigger), this.target.addEventListener("pointerleave", this.boundPointerLeaveTrigger), this.target.addEventListener("focusin", this.boundFocusin), this.target.addEventListener("focusout", this.boundFocusout));
  }
  unwireTarget() {
    this.target && (this.target.removeEventListener("pointerdown", this.boundPointerDownTrigger), this.target.removeEventListener("pointerenter", this.boundPointerEnterTrigger), this.target.removeEventListener("pointerleave", this.boundPointerLeaveTrigger), this.target.removeEventListener("focusin", this.boundFocusin), this.target.removeEventListener("focusout", this.boundFocusout));
  }
  wireBridge() {
    this.isBridgeWired || (this.isBridgeWired = true, this.host.addEventListener("pointerenter", this.boundPointerEnterHost), this.host.addEventListener("pointerleave", this.boundPointerLeaveHost));
  }
  unwireBridge() {
    this.isBridgeWired && (this.isBridgeWired = false, this.host.removeEventListener("pointerenter", this.boundPointerEnterHost), this.host.removeEventListener("pointerleave", this.boundPointerLeaveHost));
  }
  showWithBridge() {
    this.host.requestOpen(), this.wireBridge();
  }
  callHidePopover() {
    this.host.requestClose(), this.unwireBridge();
  }
  clearWarmupTimer() {
    this.warmupTimer !== null && (clearTimeout(this.warmupTimer), this.warmupTimer = null);
  }
  clearCooldownTimer() {
    let e13 = t5(this.host.ownerDocument, this.warmStateKey);
    e13.cooldownTimer !== null && (clearTimeout(e13.cooldownTimer), e13.cooldownTimer = null);
  }
  startCooldown() {
    var n8;
    let r8 = t5(this.host.ownerDocument, this.warmStateKey), i7 = (n8 = this.host.closeDelay) == null ? e6 : n8;
    r8.cooldownTimer = setTimeout(() => {
      r8.cooldownTimer = null, r8.isWarm = false, this.callHidePopover();
    }, i7);
  }
  handlePointerDownTrigger() {
    this.hadPointerdown = true, setTimeout(() => {
      this.hadPointerdown = false;
    }, 0);
  }
  handlePointerEnterTrigger() {
    if (this.hasFocusOpen) return;
    let e13 = t5(this.host.ownerDocument, this.warmStateKey);
    this.clearCooldownTimer(), this.host.delay === 0 || e13.isWarm ? this.showWithBridge() : this.warmupTimer = setTimeout(() => {
      this.warmupTimer = null, !(this.host.disabled || this.host.manual) && (e13.isWarm = true, this.showWithBridge());
    }, this.host.delay);
  }
  handlePointerLeaveTrigger() {
    this.clearWarmupTimer(), !this.hasFocusOpen && this.startCooldown();
  }
  handleFocusin() {
    this.hadPointerdown || (this.hasFocusOpen = true, this.clearWarmupTimer(), this.clearCooldownTimer(), this.showWithBridge());
  }
  handleFocusout() {
    this.hasFocusOpen = false, this.clearWarmupTimer(), this.callHidePopover();
  }
  handlePointerEnterHost() {
    this.hasFocusOpen || this.clearCooldownTimer();
  }
  handlePointerLeaveHost() {
    this.hasFocusOpen || this.startCooldown();
  }
};

// deps/swc/swc-dist/core/controllers/placement-controller/src/placement-conversion.js
var e7 = /* @__PURE__ */ new Set(["start", "end"]);
var t6 = {
  ltr: {
    start: "left",
    end: "right"
  },
  rtl: {
    start: "right",
    end: "left"
  }
};
var n6 = {
  start: "left",
  end: "right"
};
var r5 = {
  bottom: {
    left: "bottom-start",
    right: "bottom-end"
  },
  top: {
    left: "top-start",
    right: "top-end"
  },
  left: {
    top: "left-start",
    bottom: "left-end"
  },
  right: {
    top: "right-start",
    bottom: "right-end"
  }
};
var i5 = {
  "left-start": "left-top",
  "left-end": "left-bottom",
  "right-start": "right-top",
  "right-end": "right-bottom"
};
function a3(i7, a5 = "ltr") {
  var o8;
  let [s4, c4] = i7.split("-");
  if (e7.has(s4)) {
    var l4, u5, d4;
    let e13 = (l4 = t6[a5][s4]) == null ? s4 : l4;
    return c4 ? ((u5 = r5[e13]) == null ? void 0 : u5[c4]) || `${e13}-${(d4 = n6[c4]) == null ? c4 : d4}` : e13;
  }
  return c4 ? c4 === "start" || c4 === "end" ? `${s4}-${c4}` : ((o8 = r5[s4]) == null ? void 0 : o8[c4]) || `${s4}-${c4}` : s4;
}
function o5(e13) {
  var t9;
  return (t9 = i5[e13]) == null ? e13 : t9;
}

// deps/swc/swc-dist/core/controllers/placement-controller/src/fallback-placements.js
var e8 = {
  left: [
    "right",
    "bottom",
    "top"
  ],
  "left-start": [
    "right-start",
    "bottom",
    "top"
  ],
  "left-end": [
    "right-end",
    "bottom",
    "top"
  ],
  right: [
    "left",
    "bottom",
    "top"
  ],
  "right-start": [
    "left-start",
    "bottom",
    "top"
  ],
  "right-end": [
    "left-end",
    "bottom",
    "top"
  ],
  top: [
    "bottom",
    "left",
    "right"
  ],
  "top-start": [
    "bottom-start",
    "left",
    "right"
  ],
  "top-end": [
    "bottom-end",
    "left",
    "right"
  ],
  bottom: [
    "top",
    "left",
    "right"
  ],
  "bottom-start": [
    "top-start",
    "left",
    "right"
  ],
  "bottom-end": [
    "top-end",
    "left",
    "right"
  ]
};
function t7(t9) {
  var n8;
  return (n8 = e8[t9]) == null ? [t9] : n8;
}

// node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var min = Math.min;
var max = Math.max;
var round = Math.round;
var floor = Math.floor;
var createCoords = (v3) => ({
  x: v3,
  y: v3
});
var oppositeSideMap = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
  const firstChar = placement[0];
  return firstChar === "t" || firstChar === "b" ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
}
var lrPlacement = ["left", "right"];
var rlPlacement = ["right", "left"];
var tbPlacement = ["top", "bottom"];
var btPlacement = ["bottom", "top"];
function getSideList(side, isStart, rtl) {
  switch (side) {
    case "top":
    case "bottom":
      if (rtl) return isStart ? rlPlacement : lrPlacement;
      return isStart ? lrPlacement : rlPlacement;
    case "left":
    case "right":
      return isStart ? tbPlacement : btPlacement;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  const side = getSide(placement);
  return oppositeSideMap[side] + placement.slice(side.length);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number" ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  const {
    x: x2,
    y: y4,
    width,
    height
  } = rect;
  return {
    width,
    height,
    top: y4,
    left: x2,
    right: x2 + width,
    bottom: y4 + height,
    x: x2,
    y: y4
  };
}

// node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case "start":
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case "end":
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x: x2,
    y: y4,
    platform: platform2,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
    element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === "floating" ? {
    x: x2,
    y: y4,
    width: rects.floating.width,
    height: rects.floating.height
  } : rects.reference;
  const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
  const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) ? await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}
var MAX_RESET_COUNT = 50;
var computePosition = async (reference, floating, config) => {
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2
  } = config;
  const platformWithDetectOverflow = platform2.detectOverflow ? platform2 : {
    ...platform2,
    detectOverflow
  };
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
  let rects = await platform2.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x: x2,
    y: y4
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let resetCount = 0;
  const middlewareData = {};
  for (let i7 = 0; i7 < middleware.length; i7++) {
    const currentMiddleware = middleware[i7];
    if (!currentMiddleware) {
      continue;
    }
    const {
      name,
      fn
    } = currentMiddleware;
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x: x2,
      y: y4,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform: platformWithDetectOverflow,
      elements: {
        reference,
        floating
      }
    });
    x2 = nextX != null ? nextX : x2;
    y4 = nextY != null ? nextY : y4;
    middlewareData[name] = {
      ...middlewareData[name],
      ...data
    };
    if (reset && resetCount < MAX_RESET_COUNT) {
      resetCount++;
      if (typeof reset === "object") {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform2.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x: x2,
          y: y4
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i7 = -1;
    }
  }
  return {
    x: x2,
    y: y4,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};
var arrow = (options) => ({
  name: "arrow",
  options,
  async fn(state) {
    const {
      x: x2,
      y: y4,
      placement,
      rects,
      platform: platform2,
      elements,
      middlewareData
    } = state;
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x: x2,
      y: y4
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform2.getDimensions(element);
    const isYAxis = axis === "y";
    const minProp = isYAxis ? "top" : "left";
    const maxProp = isYAxis ? "bottom" : "right";
    const clientProp = isYAxis ? "clientHeight" : "clientWidth";
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
    if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
    const min$1 = minPadding;
    const max2 = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset3 = clamp(min$1, center, max2);
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset3 && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max2 : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset3,
        centerOffset: center - offset3 - alignmentOffset,
        ...shouldAddOffset && {
          alignmentOffset
        }
      },
      reset: shouldAddOffset
    };
  }
});
var flip = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "flip",
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform: platform2,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = "bestFit",
        fallbackAxisSideDirection = "none",
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const initialSideAxis = getSideAxis(initialPlacement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
      if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements2 = [initialPlacement, ...fallbackPlacements];
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides2 = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];
      if (!overflows.every((side2) => side2 <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements2[nextIndex];
        if (nextPlacement) {
          const ignoreCrossAxisOverflow = checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false;
          if (!ignoreCrossAxisOverflow || // We leave the current main axis only if every placement on that axis
          // overflows the main axis.
          overflowsData.every((d4) => getSideAxis(d4.placement) === initialSideAxis ? d4.overflows[0] > 0 : true)) {
            return {
              data: {
                index: nextIndex,
                overflows: overflowsData
              },
              reset: {
                placement: nextPlacement
              }
            };
          }
        }
        let resetPlacement = (_overflowsData$filter = overflowsData.filter((d4) => d4.overflows[0] <= 0).sort((a5, b3) => a5.overflows[1] - b3.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case "bestFit": {
              var _overflowsData$filter2;
              const placement2 = (_overflowsData$filter2 = overflowsData.filter((d4) => {
                if (hasFallbackAxisSideDirection) {
                  const currentSideAxis = getSideAxis(d4.placement);
                  return currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  currentSideAxis === "y";
                }
                return true;
              }).map((d4) => [d4.placement, d4.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a5, b3) => a5[1] - b3[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
              if (placement2) {
                resetPlacement = placement2;
              }
              break;
            }
            case "initialPlacement":
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};
var originSides = /* @__PURE__ */ new Set(["left", "top"]);
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform: platform2,
    elements
  } = state;
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = originSides.has(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === "number" ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: rawValue.mainAxis || 0,
    crossAxis: rawValue.crossAxis || 0,
    alignmentAxis: rawValue.alignmentAxis
  };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}
var offset = function(options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: "offset",
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x: x2,
        y: y4,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x2 + diffCoords.x,
        y: y4 + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};
var shift = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "shift",
    options,
    async fn(state) {
      const {
        x: x2,
        y: y4,
        placement,
        platform: platform2
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: (_ref) => {
            let {
              x: x3,
              y: y5
            } = _ref;
            return {
              x: x3,
              y: y5
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x: x2,
        y: y4
      };
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === "y" ? "top" : "left";
        const maxSide = mainAxis === "y" ? "bottom" : "right";
        const min2 = mainAxisCoord + overflow[minSide];
        const max2 = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min2, mainAxisCoord, max2);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === "y" ? "top" : "left";
        const maxSide = crossAxis === "y" ? "bottom" : "right";
        const min2 = crossAxisCoord + overflow[minSide];
        const max2 = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min2, crossAxisCoord, max2);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x2,
          y: limitedCoords.y - y4,
          enabled: {
            [mainAxis]: checkMainAxis,
            [crossAxis]: checkCrossAxis
          }
        }
      };
    }
  };
};
var size = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "size",
    options,
    async fn(state) {
      var _state$middlewareData, _state$middlewareData2;
      const {
        placement,
        rects,
        platform: platform2,
        elements
      } = state;
      const {
        apply = () => {
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const side = getSide(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === "y";
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === "top" || side === "bottom") {
        heightSide = side;
        widthSide = alignment === (await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
      } else {
        widthSide = side;
        heightSide = alignment === "end" ? "top" : "bottom";
      }
      const maximumClippingHeight = height - overflow.top - overflow.bottom;
      const maximumClippingWidth = width - overflow.left - overflow.right;
      const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
      const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
      const noShift = !state.middlewareData.shift;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if ((_state$middlewareData = state.middlewareData.shift) != null && _state$middlewareData.enabled.x) {
        availableWidth = maximumClippingWidth;
      }
      if ((_state$middlewareData2 = state.middlewareData.shift) != null && _state$middlewareData2.enabled.y) {
        availableHeight = maximumClippingHeight;
      }
      if (noShift && !alignment) {
        const xMin = max(overflow.left, 0);
        const xMax = max(overflow.right, 0);
        const yMin = max(overflow.top, 0);
        const yMax = max(overflow.bottom, 0);
        if (isYAxis) {
          availableWidth = width - 2 * (xMin !== 0 || xMax !== 0 ? xMin + xMax : max(overflow.left, overflow.right));
        } else {
          availableHeight = height - 2 * (yMin !== 0 || yMax !== 0 ? yMin + yMax : max(overflow.top, overflow.bottom));
        }
      }
      await apply({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform2.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};

// node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function hasWindow() {
  return typeof window !== "undefined";
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || "").toLowerCase();
  }
  return "#document";
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  if (!hasWindow() || typeof ShadowRoot === "undefined") {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle2(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
}
function isTableElement(element) {
  return /^(table|td|th)$/.test(getNodeName(element));
}
function isTopLayer(element) {
  try {
    if (element.matches(":popover-open")) {
      return true;
    }
  } catch (_e) {
  }
  try {
    return element.matches(":modal");
  } catch (_e) {
    return false;
  }
}
var willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
var containRe = /paint|layout|strict|content/;
var isNotNone = (value) => !!value && value !== "none";
var isWebKitValue;
function isContainingBlock(elementOrCss) {
  const css = isElement(elementOrCss) ? getComputedStyle2(elementOrCss) : elementOrCss;
  return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else if (isTopLayer(currentNode)) {
      return null;
    }
    currentNode = getParentNode(currentNode);
  }
  return null;
}
function isWebKit() {
  if (isWebKitValue == null) {
    isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
  }
  return isWebKitValue;
}
function isLastTraversableNode(node) {
  return /^(html|body|#document)$/.test(getNodeName(node));
}
function getComputedStyle2(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.scrollX,
    scrollTop: element.scrollY
  };
}
function getParentNode(node) {
  if (getNodeName(node) === "html") {
    return node;
  }
  const result = (
    // Step into the shadow DOM of the parent of a slotted node.
    node.assignedSlot || // DOM Element detected.
    node.parentNode || // ShadowRoot detected.
    isShadowRoot(node) && node.host || // Fallback.
    getDocumentElement(node)
  );
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    const frameElement = getFrameElement(win);
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
  } else {
    return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
  }
}
function getFrameElement(win) {
  return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}

// node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function getCssDimensions(element) {
  const css = getComputedStyle2(element);
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}
function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}
function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $: $2
  } = getCssDimensions(domElement);
  let x2 = ($2 ? round(rect.width) : rect.width) / width;
  let y4 = ($2 ? round(rect.height) : rect.height) / height;
  if (!x2 || !Number.isFinite(x2)) {
    x2 = 1;
  }
  if (!y4 || !Number.isFinite(y4)) {
    y4 = 1;
  }
  return {
    x: x2,
    y: y4
  };
}
var noOffsets = /* @__PURE__ */ createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) {
    return false;
  }
  return isFixed;
}
function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x2 = (clientRect.left + visualOffsets.x) / scale.x;
  let y4 = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = getFrameElement(currentWin);
    while (currentIFrame && offsetParent && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle2(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x2 *= iframeScale.x;
      y4 *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x2 += left;
      y4 += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = getFrameElement(currentWin);
    }
  }
  return rectToClientRect({
    width,
    height,
    x: x2,
    y: y4
  });
}
function getWindowScrollBarX(element, rect) {
  const leftScroll = getNodeScroll(element).scrollLeft;
  if (!rect) {
    return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
  }
  return rect.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
  const htmlRect = documentElement.getBoundingClientRect();
  const x2 = htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect);
  const y4 = htmlRect.top + scroll.scrollTop;
  return {
    x: x2,
    y: y4
  };
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === "fixed";
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
  };
}
function getClientRects(element) {
  return Array.from(element.getClientRects());
}
function getDocumentRect(element) {
  const html = getDocumentElement(element);
  const scroll = getNodeScroll(element);
  const body = element.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x2 = -scroll.scrollLeft + getWindowScrollBarX(element);
  const y4 = -scroll.scrollTop;
  if (getComputedStyle2(body).direction === "rtl") {
    x2 += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x: x2,
    y: y4
  };
}
var SCROLLBAR_MAX = 25;
function getViewportRect(element, strategy) {
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x2 = 0;
  let y4 = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isWebKit();
    if (!visualViewportBased || visualViewportBased && strategy === "fixed") {
      x2 = visualViewport.offsetLeft;
      y4 = visualViewport.offsetTop;
    }
  }
  const windowScrollbarX = getWindowScrollBarX(html);
  if (windowScrollbarX <= 0) {
    const doc = html.ownerDocument;
    const body = doc.body;
    const bodyStyles = getComputedStyle(body);
    const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
    const clippingStableScrollbarWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
    if (clippingStableScrollbarWidth <= SCROLLBAR_MAX) {
      width -= clippingStableScrollbarWidth;
    }
  } else if (windowScrollbarX <= SCROLLBAR_MAX) {
    width += windowScrollbarX;
  }
  return {
    width,
    height,
    x: x2,
    y: y4
  };
}
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = isHTMLElement(element) ? getScale(element) : createCoords(1);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x2 = left * scale.x;
  const y4 = top * scale.y;
  return {
    width,
    height,
    x: x2,
    y: y4
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === "viewport") {
    rect = getViewportRect(element, strategy);
  } else if (clippingAncestor === "document") {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y,
      width: clippingAncestor.width,
      height: clippingAncestor.height
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
  const parentNode = getParentNode(element);
  if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
    return false;
  }
  return getComputedStyle2(parentNode).position === "fixed" || hasFixedPositionAncestor(parentNode, stopNode);
}
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle2(element).position === "fixed";
  let currentNode = elementIsFixed ? getParentNode(element) : element;
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle2(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === "fixed") {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === "static" && !!currentContainingBlockComputedStyle && (currentContainingBlockComputedStyle.position === "absolute" || currentContainingBlockComputedStyle.position === "fixed") || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode);
    if (shouldDropCurrentNode) {
      result = result.filter((ancestor) => ancestor !== currentNode);
    } else {
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
  let top = firstRect.top;
  let right = firstRect.right;
  let bottom = firstRect.bottom;
  let left = firstRect.left;
  for (let i7 = 1; i7 < clippingAncestors.length; i7++) {
    const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i7], strategy);
    top = max(rect.top, top);
    right = min(rect.right, right);
    bottom = min(rect.bottom, bottom);
    left = max(rect.left, left);
  }
  return {
    width: right - left,
    height: bottom - top,
    x: left,
    y: top
  };
}
function getDimensions(element) {
  const {
    width,
    height
  } = getCssDimensions(element);
  return {
    width,
    height
  };
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === "fixed";
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  function setLeftRTLScrollbarOffset() {
    offsets.x = getWindowScrollBarX(documentElement);
  }
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      setLeftRTLScrollbarOffset();
    }
  }
  if (isFixed && !isOffsetParentAnElement && documentElement) {
    setLeftRTLScrollbarOffset();
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  const x2 = rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x;
  const y4 = rect.top + scroll.scrollTop - offsets.y - htmlOffset.y;
  return {
    x: x2,
    y: y4,
    width: rect.width,
    height: rect.height
  };
}
function isStaticPositioned(element) {
  return getComputedStyle2(element).position === "static";
}
function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement(element) || getComputedStyle2(element).position === "fixed") {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  let rawOffsetParent = element.offsetParent;
  if (getDocumentElement(element) === rawOffsetParent) {
    rawOffsetParent = rawOffsetParent.ownerDocument.body;
  }
  return rawOffsetParent;
}
function getOffsetParent(element, polyfill) {
  const win = getWindow(element);
  if (isTopLayer(element)) {
    return win;
  }
  if (!isHTMLElement(element)) {
    let svgOffsetParent = getParentNode(element);
    while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
      if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
        return svgOffsetParent;
      }
      svgOffsetParent = getParentNode(svgOffsetParent);
    }
    return win;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
    return win;
  }
  return offsetParent || getContainingBlock(element) || win;
}
var getElementRects = async function(data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  const floatingDimensions = await getDimensionsFn(data.floating);
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      width: floatingDimensions.width,
      height: floatingDimensions.height
    }
  };
};
function isRTL(element) {
  return getComputedStyle2(element).direction === "rtl";
}
var platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};
function rectsAreEqual(a5, b3) {
  return a5.x === b3.x && a5.y === b3.y && a5.width === b3.width && a5.height === b3.height;
}
function observeMove(element, onMove) {
  let io = null;
  let timeoutId;
  const root = getDocumentElement(element);
  function cleanup() {
    var _io;
    clearTimeout(timeoutId);
    (_io = io) == null || _io.disconnect();
    io = null;
  }
  function refresh(skip, threshold) {
    if (skip === void 0) {
      skip = false;
    }
    if (threshold === void 0) {
      threshold = 1;
    }
    cleanup();
    const elementRectForRootMargin = element.getBoundingClientRect();
    const {
      left,
      top,
      width,
      height
    } = elementRectForRootMargin;
    if (!skip) {
      onMove();
    }
    if (!width || !height) {
      return;
    }
    const insetTop = floor(top);
    const insetRight = floor(root.clientWidth - (left + width));
    const insetBottom = floor(root.clientHeight - (top + height));
    const insetLeft = floor(left);
    const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
    const options = {
      rootMargin,
      threshold: max(0, min(1, threshold)) || 1
    };
    let isFirstUpdate = true;
    function handleObserve(entries) {
      const ratio = entries[0].intersectionRatio;
      if (ratio !== threshold) {
        if (!isFirstUpdate) {
          return refresh();
        }
        if (!ratio) {
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 1e3);
        } else {
          refresh(false, ratio);
        }
      }
      if (ratio === 1 && !rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) {
        refresh();
      }
      isFirstUpdate = false;
    }
    try {
      io = new IntersectionObserver(handleObserve, {
        ...options,
        // Handle <iframe>s
        root: root.ownerDocument
      });
    } catch (_e) {
      io = new IntersectionObserver(handleObserve, options);
    }
    io.observe(element);
  }
  refresh(true);
  return cleanup;
}
function autoUpdate(reference, floating, update, options) {
  if (options === void 0) {
    options = {};
  }
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === "function",
    layoutShift = typeof IntersectionObserver === "function",
    animationFrame = false
  } = options;
  const referenceEl = unwrapElement(reference);
  const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
  ancestors.forEach((ancestor) => {
    ancestorScroll && ancestor.addEventListener("scroll", update, {
      passive: true
    });
    ancestorResize && ancestor.addEventListener("resize", update);
  });
  const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
  let reobserveFrame = -1;
  let resizeObserver = null;
  if (elementResize) {
    resizeObserver = new ResizeObserver((_ref) => {
      let [firstEntry] = _ref;
      if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
        resizeObserver.unobserve(floating);
        cancelAnimationFrame(reobserveFrame);
        reobserveFrame = requestAnimationFrame(() => {
          var _resizeObserver;
          (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
        });
      }
      update();
    });
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
    if (floating) {
      resizeObserver.observe(floating);
    }
  }
  let frameId;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
  if (animationFrame) {
    frameLoop();
  }
  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);
    if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) {
      update();
    }
    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }
  update();
  return () => {
    var _resizeObserver2;
    ancestors.forEach((ancestor) => {
      ancestorScroll && ancestor.removeEventListener("scroll", update);
      ancestorResize && ancestor.removeEventListener("resize", update);
    });
    cleanupIo == null || cleanupIo();
    (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
    resizeObserver = null;
    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}
var offset2 = offset;
var shift2 = shift;
var flip2 = flip;
var size2 = size;
var arrow2 = arrow;
var computePosition2 = (reference, floating, options) => {
  const cache = /* @__PURE__ */ new Map();
  const mergedOptions = {
    platform,
    ...options
  };
  const platformWithCache = {
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};

// deps/swc/swc-dist/core/controllers/placement-controller/src/placement-controller.js
var u3 = 100;
var d3 = "bottom";
var f3 = 0;
var p3 = 0;
var m2 = 8;
var h3 = true;
var g2 = 8;
function _2(e13) {
  let t9 = window.devicePixelRatio || 1;
  return Math.round(e13 * t9) / t9;
}
function v2() {
  if (typeof navigator > "u") return false;
  let e13 = navigator.userAgent;
  return /AppleWebKit/.test(e13) && !/Chrome/.test(e13);
}
var y3 = class {
  constructor(e13) {
    this.session = null, this.actualPlacement = null, this.isConstrained = false, e13.addController(this);
  }
  start(e13, t9, n8 = {}) {
    var r8;
    this.stop();
    let a5 = {
      trigger: e13,
      floating: t9,
      options: n8,
      isWebKit: v2()
    };
    this.session = a5, this.actualPlacement = (r8 = n8.placement) == null ? d3 : r8;
    let o8 = autoUpdate(e13, t9, () => {
      this.computePlacement();
    }), s4, c4 = window.visualViewport;
    if (a5.isWebKit && c4) {
      let e14 = 0, t10 = false, n9 = () => {
        t10 || e14 || (e14 = requestAnimationFrame(() => {
          e14 = 0, !t10 && this.computePlacement();
        }));
      };
      c4.addEventListener("resize", n9, { passive: true }), c4.addEventListener("scroll", n9, { passive: true }), s4 = () => {
        t10 = true, e14 && (cancelAnimationFrame(e14), e14 = 0), c4.removeEventListener("resize", n9), c4.removeEventListener("scroll", n9);
      };
    }
    let l4 = e13 instanceof HTMLElement ? e13 : t9, u5 = new MutationObserver(() => {
      this.computePlacement();
    }), f4 = (e14) => {
      e14 && u5.observe(e14, {
        attributes: true,
        attributeFilter: ["dir"]
      });
    };
    f4(l4.ownerDocument.documentElement), f4(l4.closest("[dir]")), this.cleanup = () => {
      u5.disconnect(), s4 == null || s4(), o8();
    };
  }
  stop() {
    var e13;
    (e13 = this.cleanup) == null || e13.call(this), this.cleanup = void 0, this.session = null, this.actualPlacement = null, this.isConstrained = false, this.initialHeight = void 0, this.lastEmittedPlacement = void 0;
  }
  recompute() {
    this.computePlacement();
  }
  hostDisconnected() {
    this.stop();
  }
  async computePlacement() {
    var i7, v3, y4, b3, x2, S3;
    let C2 = this.session;
    if (!C2) return;
    let { trigger: w2, floating: T2, options: E2 } = C2;
    if (document.fonts && await document.fonts.ready, this.session !== C2 || C2.isWebKit && (await new Promise((e13) => requestAnimationFrame(() => e13())), this.session !== C2)) return;
    let D2 = T2.getBoundingClientRect();
    if (D2.width === 0 && D2.height === 0) return;
    let O = (i7 = E2.placement) == null ? d3 : i7, k2 = w2 instanceof HTMLElement ? w2 : T2, A2 = a3(O, getComputedStyle(k2).direction === "rtl" ? "rtl" : "ltr"), j = (v3 = E2.containerPadding) == null ? m2 : v3, M2 = (y4 = E2.shouldFlip) == null ? h3 : y4, N2 = (b3 = E2.offset) == null ? f3 : b3, P2 = (x2 = E2.crossOffset) == null ? p3 : x2, F = M2 && (w2 instanceof HTMLElement ? flip2({
      padding: j,
      fallbackStrategy: "bestFit"
    }) : flip2({
      padding: j,
      fallbackPlacements: t7(A2),
      fallbackStrategy: "bestFit"
    })), I2 = E2.tipElement, L2 = (S3 = E2.tipPadding) == null ? g2 : S3, { x: R2, y: z2, placement: B2, middlewareData: V2 } = await computePosition2(w2, T2, {
      placement: A2,
      middleware: [
        offset2({
          mainAxis: N2,
          crossAxis: P2
        }),
        shift2({ padding: j }),
        F,
        size2({
          padding: j,
          apply: ({ availableHeight: e13, availableWidth: t9, rects: n8 }) => {
            var r8;
            if (this.session !== C2) return;
            let i8 = Math.max(u3, Math.floor(e13)), a5 = n8.floating.height;
            this.initialHeight = this.isConstrained ? (r8 = this.initialHeight) == null ? a5 : r8 : a5, this.isConstrained = a5 < this.initialHeight || i8 <= a5, T2.style.setProperty("--swc-placement-available-width", `${Math.floor(t9)}px`), T2.style.setProperty("--swc-placement-available-height", `${i8}px`);
          }
        }),
        I2 ? arrow2({
          element: I2,
          padding: L2
        }) : null
      ],
      strategy: "absolute"
    });
    if (this.session !== C2) return;
    let H2 = R2, U = z2, W = window.visualViewport;
    if (W && C2.isWebKit && (H2 -= W.offsetLeft, U -= W.offsetTop), Object.assign(T2.style, {
      top: "0px",
      left: "0px",
      translate: `${_2(H2)}px ${_2(U)}px`
    }), I2 && V2.arrow) {
      let { x: e13, y: t9 } = V2.arrow;
      Object.assign(I2.style, {
        top: B2.startsWith("right") || B2.startsWith("left") ? "0px" : "",
        left: B2.startsWith("bottom") || B2.startsWith("top") ? "0px" : "",
        translate: `${_2(e13 == null ? 0 : e13)}px ${_2(t9 == null ? 0 : t9)}px`
      });
    }
    let G = o5(B2);
    if (this.actualPlacement = G, G !== this.lastEmittedPlacement) {
      var K;
      this.lastEmittedPlacement = G, (K = E2.onPlacementChange) == null || K.call(E2, G);
    }
  }
};

// node_modules/@lit/reactive-element/decorators/property.js
var o6 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r6 = (t9 = o6, e13, r8) => {
  const { kind: n8, metadata: i7 } = r8;
  let s4 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i7, s4 = /* @__PURE__ */ new Map()), "setter" === n8 && ((t9 = Object.create(t9)).wrapped = true), s4.set(r8.name, t9), "accessor" === n8) {
    const { name: o8 } = r8;
    return { set(r9) {
      const n9 = e13.get.call(this);
      e13.set.call(this, r9), this.requestUpdate(o8, n9, t9, true, r9);
    }, init(e14) {
      return void 0 !== e14 && this.C(o8, void 0, t9, e14), e14;
    } };
  }
  if ("setter" === n8) {
    const { name: o8 } = r8;
    return function(r9) {
      const n9 = this[o8];
      e13.call(this, r9), this.requestUpdate(o8, n9, t9, true, r9);
    };
  }
  throw Error("Unsupported decorator location: " + n8);
};
function n7(t9) {
  return (e13, o8) => "object" == typeof o8 ? r6(t9, e13, o8) : ((t10, e14, o9) => {
    const r8 = e14.hasOwnProperty(o9);
    return e14.constructor.createProperty(o9, t10), r8 ? Object.getOwnPropertyDescriptor(e14, o9) : void 0;
  })(t9, e13, o8);
}

// deps/swc/swc-dist/core/element/define-element.js
function e10(e13, t9) {
  window.__swc && window.__swc.DEBUG && customElements.get(e13) && window.__swc.warn(void 0, `Attempted to redefine <${e13}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e13, t9);
}

// deps/swc/swc-dist/core/element/version.js
var e11 = "0.1.0";
var t8 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e12(e13 = document) {
  var t9;
  let n8 = e13.activeElement;
  for (; !(n8 == null || (t9 = n8.shadowRoot) == null) && t9.activeElement; ) n8 = n8.shadowRoot.activeElement;
  return n8;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i6;
function a4(t9) {
  class n8 extends t9 {
    hasVisibleFocusInTree() {
      var t10;
      let n9 = e12(this.getRootNode());
      return (t10 = n9 == null ? void 0 : n9.matches(":focus-visible")) == null ? false : t10;
    }
  }
  return n8;
}
var o7 = class extends a4(i4) {
  get dir() {
    var e13;
    return (e13 = getComputedStyle(this).direction) == null ? "ltr" : e13;
  }
};
if (i6 = o7, i6.VERSION = e11, i6.CORE_VERSION = t8, true) {
  let e13 = {
    default: false,
    accessibility: false,
    api: false
  }, t9 = {
    default: false,
    low: false,
    medium: false,
    high: false,
    deprecation: false
  };
  window.__swc = {
    ...window.__swc,
    DEBUG: true,
    ignoreWarningLocalNames: { ...((s4 = window.__swc) == null ? void 0 : s4.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e13,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t9,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e14, t10, n8, { type: r8 = "api", level: i7 = "default", issues: a5 } = {}) => {
      let { localName: o8 = "base" } = e14 || {}, s5 = `${o8}:${r8}:${i7}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s5) || window.__swc.ignoreWarningLocalNames[o8] || window.__swc.ignoreWarningTypes[r8] || window.__swc.ignoreWarningLevels[i7]) return;
      window.__swc.issuedWarnings.add(s5);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l5 = i7 === "deprecation" ? "DEPRECATION NOTICE: " : "", u5 = e14 ? "\nInspect this issue in the follow element:" : "", d4 = (e14 ? "\n\n" : "\n") + n8 + "\n", f4 = [];
      f4.push(l5 + t10 + "\n" + c5 + u5), e14 && f4.push(e14), f4.push(d4, { data: {
        localName: o8,
        type: r8,
        level: i7
      } }), console.warn(...f4);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s4;
var c4;
var l4;

// deps/swc/swc-dist/core/components/tooltip/Tooltip.base.js
var l3;
var u4 = class extends o7 {
  constructor(...e13) {
    super(...e13), this.variant = "neutral", this.placement = "top", this.open = false, this.triggerElement = null, this.delay = 1500, this.disabled = false, this.manual = false, this.offset = 4, this.crossOffset = 0, this.containerPadding = 12, this.shouldFlip = true, this.labeling = false, this.hoverController = new n5(this, { warmStateKey: "swc-tooltip" }), this.placementController = new y3(this), this.afterEventPending = false, this.afterEventFallbackTimer = null, this._lastWiredTrigger = null, this.handleBeforeToggle = (e14) => {
      let { newState: t9 } = e14, n8 = t9 === "open" ? "swc-open" : "swc-close";
      this.dispatchEvent(new CustomEvent(n8, {
        bubbles: true,
        composed: true
      })), this.afterEventPending = true;
    }, this.handleToggle = (e14) => {
      this.afterEventFallbackTimer !== null && (clearTimeout(this.afterEventFallbackTimer), this.afterEventFallbackTimer = null);
      let { newState: t9 } = e14, n8 = t9 === "open";
      n8 !== this.open && (this.open = n8);
      let r8 = getComputedStyle(this).transitionDuration.split(",");
      if (r8.every((e15) => e15.trim() === "0s")) this.afterEventPending = false, this.dispatchAfterEvent(n8);
      else if (!n8) {
        let e15 = Math.max(0, ...r8.map((e16) => {
          let t10 = e16.trim(), n9 = parseFloat(t10);
          return t10.endsWith("ms") ? n9 : n9 * 1e3;
        }));
        this.afterEventFallbackTimer = setTimeout(() => {
          this.afterEventFallbackTimer = null, this.afterEventPending && (this.afterEventPending = false, this.dispatchAfterEvent(false));
        }, e15 + 100);
      }
    }, this.handleTransitionEnd = (e14) => {
      e14.target !== this || !this.afterEventPending || (this.afterEventFallbackTimer !== null && (clearTimeout(this.afterEventFallbackTimer), this.afterEventFallbackTimer = null), this.afterEventPending = false, this.dispatchAfterEvent(this.open));
    }, this.handleKeyDown = (e14) => {
      e14.key === "Escape" && this.open && (this.open = false);
    };
  }
  get tipElement() {
    return null;
  }
  get isPopoverOpen() {
    return this.matches(":popover-open");
  }
  requestOpen() {
    this.open = true;
  }
  requestClose() {
    this.open = false;
  }
  setDeclaredActualPlacement() {
    let e13 = this.resolveTrigger(), t9 = e13 && getComputedStyle(e13).direction === "rtl" ? "rtl" : "ltr", i7 = o5(a3(this.placement, t9)).split("-")[0];
    this.setAttribute("actual-placement", i7);
  }
  startPlacement() {
    var e13;
    let t9 = this.resolveTrigger();
    t9 && this.placementController.start(t9, this, {
      placement: this.placement,
      offset: this.offset,
      crossOffset: this.crossOffset,
      containerPadding: this.containerPadding,
      shouldFlip: this.shouldFlip,
      tipElement: (e13 = this.tipElement) == null ? void 0 : e13,
      onPlacementChange: (e14) => {
        this.setAttribute("actual-placement", e14.split("-")[0]);
      }
    });
  }
  resolveTrigger() {
    if (this.triggerElement) return this.triggerElement;
    if (this.for) {
      var e13;
      let t9 = this.getRootNode().getElementById(this.for);
      return !t9 && (e13 = window.__swc) != null && e13.DEBUG && window.__swc.warn(this, `<${this.localName}> for="${this.for}" did not resolve to an element in the current tree root. Check that the referenced id exists in the same document tree root.`, "https://opensource.adobe.com/spectrum-web-components/components/tooltip/", { level: "high" }), t9;
    }
    return null;
  }
  clearAriaRelationship() {
    var e13, t9;
    if (!this._lastWiredTrigger) return;
    let n8 = this._lastWiredTrigger;
    n8.ariaDescribedByElements = ((e13 = n8.ariaDescribedByElements) == null ? [] : e13).filter((e14) => e14 !== this), n8.ariaLabelledByElements = ((t9 = n8.ariaLabelledByElements) == null ? [] : t9).filter((e14) => e14 !== this), this._lastWiredTrigger = null;
  }
  syncAriaRelationship() {
    var e13, t9;
    this.clearAriaRelationship();
    let n8 = this.resolveTrigger();
    if (!n8) return;
    let r8 = (e13 = (t9 = n8.shadowRoot) == null ? void 0 : t9.querySelector("button")) == null ? n8 : e13;
    if (this.labeling) {
      var i7, a5;
      r8.ariaDescribedByElements = ((i7 = r8.ariaDescribedByElements) == null ? [] : i7).filter((e15) => e15 !== this);
      let e14 = (a5 = r8.ariaLabelledByElements) == null ? [] : a5;
      r8.ariaLabelledByElements = this.open ? [...e14.filter((e15) => e15 !== this), this] : e14.filter((e15) => e15 !== this);
    } else {
      var o8, s4;
      r8.ariaLabelledByElements = ((o8 = r8.ariaLabelledByElements) == null ? [] : o8).filter((e15) => e15 !== this);
      let e14 = (s4 = r8.ariaDescribedByElements) == null ? [] : s4;
      r8.ariaDescribedByElements = this.open ? [...e14.filter((e15) => e15 !== this), this] : e14.filter((e15) => e15 !== this);
    }
    this.open && (this._lastWiredTrigger = r8);
  }
  clearPositioningState() {
    this.removeAttribute("actual-placement"), this.style.removeProperty("translate"), this.style.removeProperty("top"), this.style.removeProperty("left"), this.style.removeProperty("--swc-placement-available-width"), this.style.removeProperty("--swc-placement-available-height"), this.tipElement && (this.tipElement.style.removeProperty("translate"), this.tipElement.style.removeProperty("top"), this.tipElement.style.removeProperty("left"));
  }
  dispatchAfterEvent(e13) {
    this.dispatchEvent(new CustomEvent(e13 ? "swc-after-open" : "swc-after-close", {
      bubbles: true,
      composed: true
    })), e13 || this.clearPositioningState();
  }
  willUpdate(e13) {
    super.willUpdate(e13), this.disabled && this.open && (this.open = false);
  }
  updated(e13) {
    super.updated(e13), e13.has("offset") && this.style.setProperty("--_swc-tooltip-animation-distance", `${this.offset}px`), (e13.has("open") || e13.has("labeling") || e13.has("for") || e13.has("triggerElement")) && this.syncAriaRelationship(), (e13.has("for") || e13.has("triggerElement")) && this.hoverController.setTarget(this.resolveTrigger()), e13.has("open") ? this.open ? (document.addEventListener("keydown", this.handleKeyDown), this.setDeclaredActualPlacement(), this.startPlacement(), this.open !== this.isPopoverOpen && this.showPopover()) : (document.removeEventListener("keydown", this.handleKeyDown), this.open !== this.isPopoverOpen && this.hidePopover(), this.placementController.stop()) : this.open && (e13.has("placement") || e13.has("offset") || e13.has("crossOffset") || e13.has("containerPadding") || e13.has("shouldFlip") || e13.has("for") || e13.has("triggerElement")) && this.startPlacement();
  }
  connectedCallback() {
    super.connectedCallback(), this.setAttribute("role", "tooltip"), this.setAttribute("popover", "auto"), this.addEventListener("beforetoggle", this.handleBeforeToggle), this.addEventListener("toggle", this.handleToggle), this.addEventListener("transitionend", this.handleTransitionEnd);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.removeEventListener("beforetoggle", this.handleBeforeToggle), this.removeEventListener("toggle", this.handleToggle), this.removeEventListener("transitionend", this.handleTransitionEnd), document.removeEventListener("keydown", this.handleKeyDown), this.afterEventFallbackTimer !== null && (clearTimeout(this.afterEventFallbackTimer), this.afterEventFallbackTimer = null), this.clearAriaRelationship();
  }
};
l3 = u4, l3.VARIANTS = e4, l3.PLACEMENTS = r4, e5([n7({
  type: String,
  reflect: true
})], u4.prototype, "variant", void 0), e5([n7({
  type: String,
  reflect: true
})], u4.prototype, "placement", void 0), e5([n7({
  type: Boolean,
  reflect: true
})], u4.prototype, "open", void 0), e5([n7({
  attribute: "for",
  type: String
})], u4.prototype, "for", void 0), e5([n7({ attribute: false })], u4.prototype, "triggerElement", void 0), e5([n7({
  type: Number,
  reflect: true
})], u4.prototype, "delay", void 0), e5([n7({
  type: Boolean,
  reflect: true
})], u4.prototype, "disabled", void 0), e5([n7({
  type: Boolean,
  reflect: true
})], u4.prototype, "manual", void 0), e5([n7({ type: Number })], u4.prototype, "offset", void 0), e5([n7({
  type: Number,
  attribute: "cross-offset"
})], u4.prototype, "crossOffset", void 0), e5([n7({
  type: Number,
  attribute: "container-padding"
})], u4.prototype, "containerPadding", void 0), e5([n7({
  type: Boolean,
  attribute: "should-flip"
})], u4.prototype, "shouldFlip", void 0), e5([n7({
  type: Boolean,
  reflect: true
})], u4.prototype, "labeling", void 0);

// deps/swc/swc-dist/components/tooltip/Tooltip2.js
var r7 = class extends u4 {
  constructor(...e13) {
    super(...e13), this._tipElement = null;
  }
  static get styles() {
    return [t3];
  }
  get tipElement() {
    if (!this._tipElement) {
      var e13, t9;
      this._tipElement = (e13 = (t9 = this.renderRoot) == null ? void 0 : t9.querySelector(".swc-Tooltip-tip")) == null ? null : e13;
    }
    return this._tipElement;
  }
  render() {
    return b2`
      <div class="swc-Tooltip">
        <span class="swc-Tooltip-tip" aria-hidden="true"></span>
        <slot></slot>
      </div>
    `;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._tipElement = null;
  }
};

// deps/swc/swc-dist/components/tooltip/swc-tooltip.js
e10("swc-tooltip", r7);
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
