// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t6, e11, o9) {
    if (this._$cssResult$ = true, o9 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t6, this.t = e11;
  }
  get styleSheet() {
    let t6 = this.o;
    const s4 = this.t;
    if (e && void 0 === t6) {
      const e11 = void 0 !== s4 && 1 === s4.length;
      e11 && (t6 = o.get(s4)), void 0 === t6 && ((this.o = t6 = new CSSStyleSheet()).replaceSync(this.cssText), e11 && o.set(s4, t6));
    }
    return t6;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t6) => new n("string" == typeof t6 ? t6 : t6 + "", void 0, s);
var i = (t6, ...e11) => {
  const o9 = 1 === t6.length ? t6[0] : e11.reduce((e12, s4, o10) => e12 + ((t7) => {
    if (true === t7._$cssResult$) return t7.cssText;
    if ("number" == typeof t7) return t7;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t7 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t6[o10 + 1], t6[0]);
  return new n(o9, t6, s);
};
var S = (s4, o9) => {
  if (e) s4.adoptedStyleSheets = o9.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
  else for (const e11 of o9) {
    const o10 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o10.setAttribute("nonce", n6), o10.textContent = e11.cssText, s4.appendChild(o10);
  }
};
var c = e ? (t6) => t6 : (t6) => t6 instanceof CSSStyleSheet ? ((t7) => {
  let e11 = "";
  for (const s4 of t7.cssRules) e11 += s4.cssText;
  return r(e11);
})(t6) : t6;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t6, s4) => t6;
var u = { toAttribute(t6, s4) {
  switch (s4) {
    case Boolean:
      t6 = t6 ? l : null;
      break;
    case Object:
    case Array:
      t6 = null == t6 ? t6 : JSON.stringify(t6);
  }
  return t6;
}, fromAttribute(t6, s4) {
  let i9 = t6;
  switch (s4) {
    case Boolean:
      i9 = null !== t6;
      break;
    case Number:
      i9 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        i9 = JSON.parse(t6);
      } catch (t7) {
        i9 = null;
      }
  }
  return i9;
} };
var f = (t6, s4) => !i2(t6, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t6) {
    this._$Ei(), (this.l ??= []).push(t6);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t6, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t6) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t6, s4), !s4.noAccessor) {
      const i9 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t6, i9, s4);
      void 0 !== h3 && e2(this.prototype, t6, h3);
    }
  }
  static getPropertyDescriptor(t6, s4, i9) {
    const { get: e11, set: r9 } = h(this.prototype, t6) ?? { get() {
      return this[s4];
    }, set(t7) {
      this[s4] = t7;
    } };
    return { get: e11, set(s5) {
      const h3 = e11?.call(this);
      r9?.call(this, s5), this.requestUpdate(t6, h3, i9);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t6) {
    return this.elementProperties.get(t6) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t6 = n2(this);
    t6.finalize(), void 0 !== t6.l && (this.l = [...t6.l]), this.elementProperties = new Map(t6.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t7 = this.properties, s4 = [...r2(t7), ...o2(t7)];
      for (const i9 of s4) this.createProperty(i9, t7[i9]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const s4 = litPropertyMetadata.get(t6);
      if (void 0 !== s4) for (const [t7, i9] of s4) this.elementProperties.set(t7, i9);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, s4] of this.elementProperties) {
      const i9 = this._$Eu(t7, s4);
      void 0 !== i9 && this._$Eh.set(i9, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i9 = [];
    if (Array.isArray(s4)) {
      const e11 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e11) i9.unshift(c(s5));
    } else void 0 !== s4 && i9.push(c(s4));
    return i9;
  }
  static _$Eu(t6, s4) {
    const i9 = s4.attribute;
    return false === i9 ? void 0 : "string" == typeof i9 ? i9 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t6) => this.enableUpdating = t6), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t6) => t6(this));
  }
  addController(t6) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t6), void 0 !== this.renderRoot && this.isConnected && t6.hostConnected?.();
  }
  removeController(t6) {
    this._$EO?.delete(t6);
  }
  _$E_() {
    const t6 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i9 of s4.keys()) this.hasOwnProperty(i9) && (t6.set(i9, this[i9]), delete this[i9]);
    t6.size > 0 && (this._$Ep = t6);
  }
  createRenderRoot() {
    const t6 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t6, this.constructor.elementStyles), t6;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t6) => t6.hostConnected?.());
  }
  enableUpdating(t6) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t6) => t6.hostDisconnected?.());
  }
  attributeChangedCallback(t6, s4, i9) {
    this._$AK(t6, i9);
  }
  _$ET(t6, s4) {
    const i9 = this.constructor.elementProperties.get(t6), e11 = this.constructor._$Eu(t6, i9);
    if (void 0 !== e11 && true === i9.reflect) {
      const h3 = (void 0 !== i9.converter?.toAttribute ? i9.converter : u).toAttribute(s4, i9.type);
      this._$Em = t6, null == h3 ? this.removeAttribute(e11) : this.setAttribute(e11, h3), this._$Em = null;
    }
  }
  _$AK(t6, s4) {
    const i9 = this.constructor, e11 = i9._$Eh.get(t6);
    if (void 0 !== e11 && this._$Em !== e11) {
      const t7 = i9.getPropertyOptions(e11), h3 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : u;
      this._$Em = e11;
      const r9 = h3.fromAttribute(s4, t7.type);
      this[e11] = r9 ?? this._$Ej?.get(e11) ?? r9, this._$Em = null;
    }
  }
  requestUpdate(t6, s4, i9, e11 = false, h3) {
    if (void 0 !== t6) {
      const r9 = this.constructor;
      if (false === e11 && (h3 = this[t6]), i9 ??= r9.getPropertyOptions(t6), !((i9.hasChanged ?? f)(h3, s4) || i9.useDefault && i9.reflect && h3 === this._$Ej?.get(t6) && !this.hasAttribute(r9._$Eu(t6, i9)))) return;
      this.C(t6, s4, i9);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, s4, { useDefault: i9, reflect: e11, wrapped: h3 }, r9) {
    i9 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t6) && (this._$Ej.set(t6, r9 ?? s4 ?? this[t6]), true !== h3 || void 0 !== r9) || (this._$AL.has(t6) || (this.hasUpdated || i9 || (s4 = void 0), this._$AL.set(t6, s4)), true === e11 && this._$Em !== t6 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t6));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t7) {
      Promise.reject(t7);
    }
    const t6 = this.scheduleUpdate();
    return null != t6 && await t6, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t8, s5] of this._$Ep) this[t8] = s5;
        this._$Ep = void 0;
      }
      const t7 = this.constructor.elementProperties;
      if (t7.size > 0) for (const [s5, i9] of t7) {
        const { wrapped: t8 } = i9, e11 = this[s5];
        true !== t8 || this._$AL.has(s5) || void 0 === e11 || this.C(s5, void 0, i9, e11);
      }
    }
    let t6 = false;
    const s4 = this._$AL;
    try {
      t6 = this.shouldUpdate(s4), t6 ? (this.willUpdate(s4), this._$EO?.forEach((t7) => t7.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t6 = false, this._$EM(), s5;
    }
    t6 && this._$AE(s4);
  }
  willUpdate(t6) {
  }
  _$AE(t6) {
    this._$EO?.forEach((t7) => t7.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t6)), this.updated(t6);
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
  shouldUpdate(t6) {
    return true;
  }
  update(t6) {
    this._$Eq &&= this._$Eq.forEach((t7) => this._$ET(t7, this[t7])), this._$EM();
  }
  updated(t6) {
  }
  firstUpdated(t6) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t6) => t6;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t6) => t6 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t6) => null === t6 || "object" != typeof t6 && "function" != typeof t6;
var u2 = Array.isArray;
var d2 = (t6) => u2(t6) || "function" == typeof t6?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t6) => (i9, ...s4) => ({ _$litType$: t6, strings: i9, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t6, i9) {
  if (!u2(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i9) : i9;
}
var N = (t6, i9) => {
  const s4 = t6.length - 1, e11 = [];
  let n6, l3 = 2 === i9 ? "<svg>" : 3 === i9 ? "<math>" : "", c4 = v;
  for (let i10 = 0; i10 < s4; i10++) {
    const s5 = t6[i10];
    let a6, u4, d4 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u4 = c4.exec(s5), null !== u4); ) f3 = c4.lastIndex, c4 === v ? "!--" === u4[1] ? c4 = _ : void 0 !== u4[1] ? c4 = m : void 0 !== u4[2] ? (y2.test(u4[2]) && (n6 = RegExp("</" + u4[2], "g")), c4 = p2) : void 0 !== u4[3] && (c4 = p2) : c4 === p2 ? ">" === u4[0] ? (c4 = n6 ?? v, d4 = -1) : void 0 === u4[1] ? d4 = -2 : (d4 = c4.lastIndex - u4[2].length, a6 = u4[1], c4 = void 0 === u4[3] ? p2 : '"' === u4[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n6 = void 0);
    const x2 = c4 === p2 && t6[i10 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d4 >= 0 ? (e11.push(a6), s5.slice(0, d4) + h2 + s5.slice(d4) + o3 + x2) : s5 + o3 + (-2 === d4 ? i10 : x2);
  }
  return [V(t6, l3 + (t6[s4] || "<?>") + (2 === i9 ? "</svg>" : 3 === i9 ? "</math>" : "")), e11];
};
var S2 = class _S {
  constructor({ strings: t6, _$litType$: i9 }, e11) {
    let r9;
    this.parts = [];
    let l3 = 0, a6 = 0;
    const u4 = t6.length - 1, d4 = this.parts, [f3, v2] = N(t6, i9);
    if (this.el = _S.createElement(f3, e11), P.currentNode = this.el.content, 2 === i9 || 3 === i9) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (r9 = P.nextNode()) && d4.length < u4; ) {
      if (1 === r9.nodeType) {
        if (r9.hasAttributes()) for (const t7 of r9.getAttributeNames()) if (t7.endsWith(h2)) {
          const i10 = v2[a6++], s4 = r9.getAttribute(t7).split(o3), e12 = /([.?@])?(.*)/.exec(i10);
          d4.push({ type: 1, index: l3, name: e12[2], strings: s4, ctor: "." === e12[1] ? I : "?" === e12[1] ? L : "@" === e12[1] ? z : H }), r9.removeAttribute(t7);
        } else t7.startsWith(o3) && (d4.push({ type: 6, index: l3 }), r9.removeAttribute(t7));
        if (y2.test(r9.tagName)) {
          const t7 = r9.textContent.split(o3), i10 = t7.length - 1;
          if (i10 > 0) {
            r9.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i10; s4++) r9.append(t7[s4], c3()), P.nextNode(), d4.push({ type: 2, index: ++l3 });
            r9.append(t7[i10], c3());
          }
        }
      } else if (8 === r9.nodeType) if (r9.data === n3) d4.push({ type: 2, index: l3 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = r9.data.indexOf(o3, t7 + 1)); ) d4.push({ type: 7, index: l3 }), t7 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t6, i9) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t6, s4;
  }
};
function M(t6, i9, s4 = t6, e11) {
  if (i9 === E) return i9;
  let h3 = void 0 !== e11 ? s4._$Co?.[e11] : s4._$Cl;
  const o9 = a2(i9) ? void 0 : i9._$litDirective$;
  return h3?.constructor !== o9 && (h3?._$AO?.(false), void 0 === o9 ? h3 = void 0 : (h3 = new o9(t6), h3._$AT(t6, s4, e11)), void 0 !== e11 ? (s4._$Co ??= [])[e11] = h3 : s4._$Cl = h3), void 0 !== h3 && (i9 = M(t6, h3._$AS(t6, i9.values), h3, e11)), i9;
}
var R = class {
  constructor(t6, i9) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = i9;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: i9 }, parts: s4 } = this._$AD, e11 = (t6?.creationScope ?? l2).importNode(i9, true);
    P.currentNode = e11;
    let h3 = P.nextNode(), o9 = 0, n6 = 0, r9 = s4[0];
    for (; void 0 !== r9; ) {
      if (o9 === r9.index) {
        let i10;
        2 === r9.type ? i10 = new k(h3, h3.nextSibling, this, t6) : 1 === r9.type ? i10 = new r9.ctor(h3, r9.name, r9.strings, this, t6) : 6 === r9.type && (i10 = new Z(h3, this, t6)), this._$AV.push(i10), r9 = s4[++n6];
      }
      o9 !== r9?.index && (h3 = P.nextNode(), o9++);
    }
    return P.currentNode = l2, e11;
  }
  p(t6) {
    let i9 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t6, s4, i9), i9 += s4.strings.length - 2) : s4._$AI(t6[i9])), i9++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, i9, s4, e11) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t6, this._$AB = i9, this._$AM = s4, this.options = e11, this._$Cv = e11?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const i9 = this._$AM;
    return void 0 !== i9 && 11 === t6?.nodeType && (t6 = i9.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, i9 = this) {
    t6 = M(this, t6, i9), a2(t6) ? t6 === A || null == t6 || "" === t6 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t6 !== this._$AH && t6 !== E && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : d2(t6) ? this.k(t6) : this._(t6);
  }
  O(t6) {
    return this._$AA.parentNode.insertBefore(t6, this._$AB);
  }
  T(t6) {
    this._$AH !== t6 && (this._$AR(), this._$AH = this.O(t6));
  }
  _(t6) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t6 : this.T(l2.createTextNode(t6)), this._$AH = t6;
  }
  $(t6) {
    const { values: i9, _$litType$: s4 } = t6, e11 = "number" == typeof s4 ? this._$AC(t6) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e11) this._$AH.p(i9);
    else {
      const t7 = new R(e11, this), s5 = t7.u(this.options);
      t7.p(i9), this.T(s5), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let i9 = C.get(t6.strings);
    return void 0 === i9 && C.set(t6.strings, i9 = new S2(t6)), i9;
  }
  k(t6) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i9 = this._$AH;
    let s4, e11 = 0;
    for (const h3 of t6) e11 === i9.length ? i9.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i9[e11], s4._$AI(h3), e11++;
    e11 < i9.length && (this._$AR(s4 && s4._$AB.nextSibling, e11), i9.length = e11);
  }
  _$AR(t6 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t6 !== this._$AB; ) {
      const s5 = i3(t6).nextSibling;
      i3(t6).remove(), t6 = s5;
    }
  }
  setConnected(t6) {
    void 0 === this._$AM && (this._$Cv = t6, this._$AP?.(t6));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t6, i9, s4, e11, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t6, this.name = i9, this._$AM = e11, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t6, i9 = this, s4, e11) {
    const h3 = this.strings;
    let o9 = false;
    if (void 0 === h3) t6 = M(this, t6, i9, 0), o9 = !a2(t6) || t6 !== this._$AH && t6 !== E, o9 && (this._$AH = t6);
    else {
      const e12 = t6;
      let n6, r9;
      for (t6 = h3[0], n6 = 0; n6 < h3.length - 1; n6++) r9 = M(this, e12[s4 + n6], i9, n6), r9 === E && (r9 = this._$AH[n6]), o9 ||= !a2(r9) || r9 !== this._$AH[n6], r9 === A ? t6 = A : t6 !== A && (t6 += (r9 ?? "") + h3[n6 + 1]), this._$AH[n6] = r9;
    }
    o9 && !e11 && this.j(t6);
  }
  j(t6) {
    t6 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t6 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t6) {
    this.element[this.name] = t6 === A ? void 0 : t6;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t6) {
    this.element.toggleAttribute(this.name, !!t6 && t6 !== A);
  }
};
var z = class extends H {
  constructor(t6, i9, s4, e11, h3) {
    super(t6, i9, s4, e11, h3), this.type = 5;
  }
  _$AI(t6, i9 = this) {
    if ((t6 = M(this, t6, i9, 0) ?? A) === E) return;
    const s4 = this._$AH, e11 = t6 === A && s4 !== A || t6.capture !== s4.capture || t6.once !== s4.once || t6.passive !== s4.passive, h3 = t6 !== A && (s4 === A || e11);
    e11 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var Z = class {
  constructor(t6, i9, s4) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = i9, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t6) {
    M(this, t6);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t6, i9, s4) => {
  const e11 = s4?.renderBefore ?? i9;
  let h3 = e11._$litPart$;
  if (void 0 === h3) {
    const t7 = s4?.renderBefore ?? null;
    e11._$litPart$ = h3 = new k(i9.insertBefore(c3(), t7), t7, void 0, s4 ?? {});
  }
  return h3._$AI(t6), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t6 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t6.firstChild, t6;
  }
  update(t6) {
    const r9 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t6), this._$Do = D(r9, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/tabs/tabs.js
var t3 = i`:host{display:flex;flex-direction:column}*{box-sizing:border-box}.tablist{--_swc-tabs-gap: 32px;display:flex;position:relative;gap:var(--_swc-tabs-gap);align-items:center}:host([density=\"compact\"]) .tablist{--_swc-tabs-gap: 24px;--swc-tab-height: var(--swc-tab-item-compact-height-medium);--swc-tab-padding-block: 7px;--swc-tab-padding-block-end: 7px}:host([direction=\"vertical\"]){flex-direction:row;gap:32px}:host([direction=\"vertical\"][density=\"compact\"]){gap:24px}:host([direction=\"vertical\"]) .tablist{--_swc-tabs-gap: 32px;flex-direction:column;align-items:flex-start;padding-inline-start:var(--swc-base-padding-horizontal-medium)}:host([direction=\"vertical\"][density=\"compact\"]) .tablist{--_swc-tabs-gap: 24px}.selection-indicator{position:absolute;z-index:1;background-color:var(--swc-tabs-indicator-color, var(--swc-gray-800));border-radius:4px;pointer-events:none;transition:transform .13s ease-in-out}.selection-indicator.first-position{transition:none}:host([direction=\"horizontal\"]) .selection-indicator,:host(:not([direction])) .selection-indicator{inset-block-end:0;inset-inline-start:0;inline-size:100px;block-size:2px;transform-origin:left center}:host([direction=\"vertical\"]) .selection-indicator{inset-block-start:0;inset-inline-start:0;inline-size:2px;block-size:100px;transform-origin:center top}:host([disabled]){pointer-events:none}:host([disabled]) ::slotted(swc-tab){--swc-tab-text-color: var(--swc-gray-400)}:host([disabled]) .selection-indicator{--swc-tabs-indicator-color: var(--swc-gray-300)}@media(forced-colors:active){.selection-indicator{background-color:Highlight}}`;

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e4(e11, t6, n6, r9) {
  var i9 = arguments.length, a6 = i9 < 3 ? t6 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t6, n6) : r9, o9;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e11, t6, n6, r9);
  else for (var s4 = e11.length - 1; s4 >= 0; s4--) (o9 = e11[s4]) && (a6 = (i9 < 3 ? o9(a6) : i9 > 3 ? o9(t6, n6, a6) : o9(t6, n6)) || a6);
  return i9 > 3 && a6 && Object.defineProperty(t6, n6, a6), a6;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t6 = o5, e11, r9) => {
  const { kind: n6, metadata: i9 } = r9;
  let s4 = globalThis.litPropertyMetadata.get(i9);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i9, s4 = /* @__PURE__ */ new Map()), "setter" === n6 && ((t6 = Object.create(t6)).wrapped = true), s4.set(r9.name, t6), "accessor" === n6) {
    const { name: o9 } = r9;
    return { set(r10) {
      const n7 = e11.get.call(this);
      e11.set.call(this, r10), this.requestUpdate(o9, n7, t6, true, r10);
    }, init(e12) {
      return void 0 !== e12 && this.C(o9, void 0, t6, e12), e12;
    } };
  }
  if ("setter" === n6) {
    const { name: o9 } = r9;
    return function(r10) {
      const n7 = this[o9];
      e11.call(this, r10), this.requestUpdate(o9, n7, t6, true, r10);
    };
  }
  throw Error("Unsupported decorator location: " + n6);
};
function n4(t6) {
  return (e11, o9) => "object" == typeof o9 ? r4(t6, e11, o9) : ((t7, e12, o10) => {
    const r9 = e12.hasOwnProperty(o10);
    return e12.constructor.createProperty(o10, t7), r9 ? Object.getOwnPropertyDescriptor(e12, o10) : void 0;
  })(t6, e11, o9);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r5(r9) {
  return n4({ ...r9, state: true, attribute: false });
}

// deps/swc/swc-dist/core/element/define-element.js
function e6(e11, t6) {
  window.__swc && window.__swc.DEBUG && customElements.get(e11) && window.__swc.warn(void 0, `Attempted to redefine <${e11}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e11, t6);
}

// deps/swc/swc-dist/core/element/version.js
var e7 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e8(e11 = document) {
  var t6;
  let n6 = e11.activeElement;
  for (; !(n6 == null || (t6 = n6.shadowRoot) == null) && t6.activeElement; ) n6 = n6.shadowRoot.activeElement;
  return n6;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t6) {
  class n6 extends t6 {
    hasVisibleFocusInTree() {
      var t7;
      let n7 = e8(this.getRootNode());
      return (t7 = n7 == null ? void 0 : n7.matches(":focus-visible")) == null ? false : t7;
    }
  }
  return n6;
}
var o6 = class extends a3(i4) {
  get dir() {
    var e11;
    return (e11 = getComputedStyle(this).direction) == null ? "ltr" : e11;
  }
};
if (i5 = o6, i5.VERSION = e7, i5.CORE_VERSION = t4, true) {
  let e11 = {
    default: false,
    accessibility: false,
    api: false
  }, t6 = {
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
      ...e11,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t6,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e12, t7, n6, { type: r9 = "api", level: i9 = "default", issues: a6 } = {}) => {
      let { localName: o9 = "base" } = e12 || {}, s5 = `${o9}:${r9}:${i9}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s5) || window.__swc.ignoreWarningLocalNames[o9] || window.__swc.ignoreWarningTypes[r9] || window.__swc.ignoreWarningLevels[i9]) return;
      window.__swc.issuedWarnings.add(s5);
      let c5 = "";
      a6 && a6.length && (a6.unshift(""), c5 = a6.join("\n    - ") + "\n");
      let l4 = i9 === "deprecation" ? "DEPRECATION NOTICE: " : "", u4 = e12 ? "\nInspect this issue in the follow element:" : "", d4 = (e12 ? "\n\n" : "\n") + n6 + "\n", f3 = [];
      f3.push(l4 + t7 + "\n" + c5 + u4), e12 && f3.push(e12), f3.push(d4, { data: {
        localName: o9,
        type: r9,
        level: i9
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s4;
var c4;
var l3;

// deps/swc/swc-dist/core/components/tabs/Tab.base.js
var r6 = 0;
var i6 = class extends o6 {
  constructor(...e11) {
    super(...e11), this.disabled = false, this.selected = false, this.vertical = false, this.tabId = "";
  }
  firstUpdated(e11) {
    super.firstUpdated(e11), this.setAttribute("role", "tab"), this.hasAttribute("id") || (this.id = `swc-tab-${r6++}`), this.syncAriaSelected(), this.syncAriaDisabled(), this.hasAttribute("tabindex") || (this.tabIndex = -1);
  }
  updated(e11) {
    super.updated(e11), e11.has("selected") && this.syncAriaSelected(), e11.has("disabled") && this.syncAriaDisabled();
  }
  syncAriaSelected() {
    this.setAttribute("aria-selected", String(this.selected));
  }
  syncAriaDisabled() {
    this.disabled ? this.setAttribute("aria-disabled", "true") : this.removeAttribute("aria-disabled");
  }
};
e4([n4({
  type: Boolean,
  reflect: true
})], i6.prototype, "disabled", void 0), e4([n4({
  type: Boolean,
  reflect: true
})], i6.prototype, "selected", void 0), e4([n4({
  type: Boolean,
  reflect: true
})], i6.prototype, "vertical", void 0), e4([n4({
  type: String,
  reflect: true,
  attribute: "tab-id"
})], i6.prototype, "tabId", void 0);

// deps/swc/swc-dist/core/components/tabs/TabPanel.base.js
var r7 = 0;
var i7 = class extends o6 {
  constructor(...e11) {
    super(...e11), this.selected = false, this.tabId = "";
  }
  handleFocusin() {
    this.removeAttribute("tabindex");
  }
  handleFocusout() {
    this.tabIndex = this.selected ? 0 : -1;
  }
  firstUpdated(e11) {
    super.firstUpdated(e11), this.slot = "tab-panel", this.setAttribute("role", "tabpanel"), this.tabIndex = 0, this.hasAttribute("id") || (this.id = `swc-tab-panel-${r7++}`);
  }
  updated(e11) {
    super.updated(e11), e11.has("selected") && this.syncVisibility();
  }
  syncVisibility() {
    this.selected ? (this.removeAttribute("aria-hidden"), this.tabIndex = 0) : (this.setAttribute("aria-hidden", "true"), this.tabIndex = -1);
  }
};
e4([n4({
  type: Boolean,
  reflect: true
})], i7.prototype, "selected", void 0), e4([n4({
  type: String,
  reflect: true,
  attribute: "tab-id"
})], i7.prototype, "tabId", void 0);

// deps/swc/swc-dist/core/components/tabs/Tabs.types.js
var e9 = ["horizontal", "vertical"];
var t5 = "horizontal";
var n5 = ["manual", "automatic"];
var r8 = "manual";
var i8 = ["regular", "compact"];
var a4 = "regular";

// deps/swc/swc-dist/core/components/tabs/Tabs.base.js
var u3;
var d3 = class e10 extends o6 {
  constructor(...t6) {
    super(...t6), this._keyboardActivation = r8, this._density = a4, this._direction = t5, this.disabled = false, this.accessibleLabel = "", this.selected = "", this.selectionIndicatorStyle = "", this.shouldAnimate = false, this._tabs = [], this.updateSelectionIndicator = async () => {
      var t7, n6;
      let r9 = this._tabs.find((e11) => e11.selected);
      if (!r9) {
        this.selectionIndicatorStyle = "transform: translateX(0px) scaleX(0) scaleY(0)";
        return;
      }
      let i9 = (t7 = this.renderRoot) == null ? void 0 : t7.querySelector(".tablist");
      if (!i9) return;
      await Promise.all([(n6 = r9.updateComplete) == null ? Promise.resolve() : n6, document.fonts ? document.fonts.ready : Promise.resolve()]);
      let a6 = r9.getBoundingClientRect(), o9 = i9.getBoundingClientRect();
      this._direction === "horizontal" ? this.selectionIndicatorStyle = `transform: translateX(${a6.left - o9.left}px) scaleX(${a6.width / e10.INDICATOR_BASE_SIZE})` : this.selectionIndicatorStyle = `transform: translateY(${a6.top - o9.top}px) scaleY(${a6.height / e10.INDICATOR_BASE_SIZE})`, this.shouldAnimate || (await this.updateComplete, this.shouldAnimate = true);
    };
  }
  get keyboardActivation() {
    return this._keyboardActivation;
  }
  set keyboardActivation(e11) {
    var r9;
    let i9 = n5.includes(e11);
    !i9 && (r9 = window.__swc) != null && r9.DEBUG && window.__swc.warn(this, `<${this.localName}> expects "keyboard-activation" to be one of:`, "https://opensource.adobe.com/spectrum-web-components/components/tabs/", { issues: [...n5] });
    let a6 = i9 ? e11 : r8;
    if (this._keyboardActivation === a6) return;
    let o9 = this._keyboardActivation;
    this._keyboardActivation = a6, this.requestUpdate("keyboardActivation", o9);
  }
  get density() {
    return this._density;
  }
  set density(e11) {
    var t6;
    let n6 = i8.includes(e11);
    !n6 && (t6 = window.__swc) != null && t6.DEBUG && window.__swc.warn(this, `<${this.localName}> expects "density" to be one of:`, "https://opensource.adobe.com/spectrum-web-components/components/tabs/", { issues: [...i8] });
    let r9 = n6 ? e11 : a4;
    if (this._density === r9) return;
    let i9 = this._density;
    this._density = r9, this.requestUpdate("density", i9);
  }
  get direction() {
    return this._direction;
  }
  set direction(e11) {
    var t6;
    let n6 = e9.includes(e11);
    !n6 && (t6 = window.__swc) != null && t6.DEBUG && window.__swc.warn(this, `<${this.localName}> expects the "direction" attribute to be one of the following:`, "https://opensource.adobe.com/spectrum-web-components/components/tabs/", { issues: [...e9] });
    let a6 = n6 ? e11 : t5;
    if (this._direction === a6) return;
    let o9 = this._direction;
    this._direction = a6, this.requestUpdate("direction", o9);
  }
  static isTabSlotNode(e11) {
    return e11 instanceof HTMLElement ? e11.getAttribute("role") === "tab" ? true : e11.localName === "swc-tab" : false;
  }
  handleTabSlotChange(t6) {
    this._tabs = t6.target.assignedElements().filter(e10.isTabSlotNode), this.updateCheckedState(), this.updateSelectionIndicator();
  }
  handlePanelSlotChange(e11) {
    let t6 = e11.target.assignedElements();
    this.managePanels(t6);
  }
  handleClick(e11) {
    if (this.disabled) return;
    let t6 = e11.composedPath().find((e12) => e12.parentElement === this);
    !t6 || t6.disabled || this.selectTarget(t6);
  }
  handleKeyDown(e11) {
    if (this.disabled) return;
    let { code: t6 } = e11;
    if (t6 === "Enter" || t6 === "Space") {
      e11.preventDefault();
      let t7 = e11.target;
      t7 && !t7.disabled && this.selectTarget(t7);
      return;
    }
    let n6 = this.getNavigationDelta(t6);
    if (n6 !== null) {
      e11.preventDefault(), this.focusByDelta(n6);
      return;
    }
    if (t6 === "Home") {
      e11.preventDefault(), this.focusTabAtIndex(0);
      return;
    }
    if (t6 === "End") {
      e11.preventDefault(), this.focusTabAtIndex(this._tabs.length - 1);
      return;
    }
  }
  getNavigationDelta(e11) {
    let t6 = this.dir === "rtl";
    return this._direction === "horizontal" ? e11 === "ArrowRight" ? t6 ? -1 : 1 : e11 === "ArrowLeft" ? t6 ? 1 : -1 : null : e11 === "ArrowDown" ? 1 : e11 === "ArrowUp" ? -1 : null;
  }
  focusByDelta(e11) {
    if (!this._tabs.length) return;
    let t6 = this.getRootNode(), n6 = this._tabs.indexOf(t6.activeElement), r9 = n6 === -1 ? 0 : n6, i9 = this.wrapIndex(r9 + e11);
    this.focusTabAtIndex(i9);
  }
  focusTabAtIndex(e11) {
    if (!this._tabs.length) return;
    let t6 = this.wrapIndex(e11), n6 = this._tabs[t6];
    n6 && (this._keyboardActivation === "automatic" && !n6.disabled && this.selectTarget(n6), this.setRovingTabindex(n6), n6.focus());
  }
  wrapIndex(e11) {
    let t6 = this._tabs.length;
    return (e11 % t6 + t6) % t6;
  }
  setRovingTabindex(e11) {
    for (let t6 of this._tabs) t6.tabIndex = t6 === e11 ? 0 : -1;
  }
  selectTarget(e11) {
    let t6 = e11.tabId;
    if (!t6) return;
    let n6 = this.selected;
    this.selected = t6, this.dispatchEvent(new Event("change", { cancelable: true })) || (this.selected = n6);
  }
  updateCheckedState() {
    let e11 = false;
    for (let e12 of this._tabs) e12.selected = false;
    if (this.selected) {
      let t6 = this._tabs.find((e12) => e12.tabId === this.selected);
      t6 ? (t6.selected = true, this.disabled || (this.setRovingTabindex(t6), e11 = true)) : this.selected = "";
    }
    if (this.disabled) for (let e12 of this._tabs) e12.tabIndex = -1;
    else !e11 && this._tabs.length && (this._tabs[0].tabIndex = 0);
  }
  managePanels(e11) {
    for (let t6 of e11) {
      let { tabId: e12, id: n6 } = t6, r9 = this.querySelector(`[role="tab"][tab-id="${e12}"]`);
      r9 && (r9.setAttribute("aria-controls", n6), t6.setAttribute("aria-labelledby", r9.id)), t6.selected = e12 === this.selected;
    }
  }
  willUpdate(e11) {
    if (!this.hasUpdated) {
      let e12 = this.querySelector(":scope > [selected]");
      e12 && this.selectTarget(e12);
    }
    if (super.willUpdate(e11), e11.has("selected")) {
      this._tabs.length && this.updateCheckedState();
      let t6 = e11.get("selected");
      if (t6) {
        let e12 = this.querySelector(`[role="tabpanel"][tab-id="${t6}"]`);
        e12 && (e12.selected = false);
      }
      let n6 = this.querySelector(`[role="tabpanel"][tab-id="${this.selected}"]`);
      n6 && (n6.selected = true), this.updateSelectionIndicator();
    }
    e11.has("disabled") && this._tabs.length && this.updateCheckedState(), e11.has("direction") && this.updateSelectionIndicator();
  }
  connectedCallback() {
    super.connectedCallback(), window.addEventListener("resize", this.updateSelectionIndicator), "fonts" in document && document.fonts.addEventListener("loadingdone", this.updateSelectionIndicator), this._resizeObserver = new ResizeObserver(() => {
      this.updateSelectionIndicator();
    }), this._resizeObserver.observe(this);
  }
  disconnectedCallback() {
    var e11;
    window.removeEventListener("resize", this.updateSelectionIndicator), "fonts" in document && document.fonts.removeEventListener("loadingdone", this.updateSelectionIndicator), (e11 = this._resizeObserver) == null || e11.disconnect(), this._resizeObserver = void 0, super.disconnectedCallback();
  }
  focus(e11) {
    if (this.disabled) return;
    let t6 = this._tabs.find((e12) => e12.selected);
    if (t6) {
      t6.focus(e11);
      return;
    }
    if (this._tabs.length) {
      this._tabs[0].focus(e11);
      return;
    }
    super.focus(e11);
  }
  firstUpdated(e11) {
    var t6;
    super.firstUpdated(e11), this.hasAttribute("direction") || this.setAttribute("direction", this.direction), (t6 = window.__swc) != null && t6.DEBUG && !this.accessibleLabel && window.__swc.warn(this, `<${this.localName}> requires an "accessible-label" attribute to provide an accessible name for the tablist.`, "https://opensource.adobe.com/spectrum-web-components/components/tabs/", {
      type: "accessibility",
      level: "high"
    });
  }
  async getUpdateComplete() {
    let e11 = await super.getUpdateComplete(), t6 = [...this.children].map((e12) => "updateComplete" in e12 ? e12.updateComplete : Promise.resolve(true));
    return await Promise.all(t6), e11;
  }
};
u3 = d3, u3.VALID_DIRECTIONS = e9, u3.VALID_KEYBOARD_ACTIVATIONS = n5, u3.VALID_DENSITIES = i8, u3.INDICATOR_BASE_SIZE = 100, e4([n4({
  type: String,
  reflect: true,
  attribute: "keyboard-activation"
})], d3.prototype, "keyboardActivation", null), e4([n4({
  type: String,
  reflect: true
})], d3.prototype, "density", null), e4([n4({
  type: String,
  reflect: true
})], d3.prototype, "direction", null), e4([n4({
  type: Boolean,
  reflect: true
})], d3.prototype, "disabled", void 0), e4([n4({
  type: String,
  attribute: "accessible-label"
})], d3.prototype, "accessibleLabel", void 0), e4([n4({
  type: String,
  reflect: true
})], d3.prototype, "selected", void 0), e4([r5()], d3.prototype, "selectionIndicatorStyle", void 0), e4([r5()], d3.prototype, "shouldAnimate", void 0);

// node_modules/lit-html/directives/if-defined.js
var o7 = (o9) => o9 ?? A;

// deps/swc/swc-dist/components/tabs/Tabs2.js
var a5;
var o8 = class extends d3 {
  static get styles() {
    return [t3];
  }
  render() {
    return b2`
      <div
        role="tablist"
        class="tablist"
        aria-label=${this.accessibleLabel || A}
        aria-orientation=${o7(this.direction === "vertical" ? "vertical" : void 0)}
        aria-disabled=${o7(this.disabled ? "true" : void 0)}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <slot @slotchange=${this.handleTabSlotChange}></slot>
        <div
          class="selection-indicator ${this.shouldAnimate ? "" : "first-position"}"
          style=${this.selectionIndicatorStyle}
          role="presentation"
        ></div>
      </div>
      <slot name="tab-panel" @slotchange=${this.handlePanelSlotChange}></slot>
    `;
  }
};
a5 = o8, a5.shadowRootOptions = {
  delegatesFocus: true,
  mode: "open"
};

// deps/swc/swc-dist/components/tabs/swc-tabs.js
e6("swc-tabs", o8);
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

lit-html/directives/if-defined.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
