// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t7, e11, o11) {
    if (this._$cssResult$ = true, o11 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t7, this.t = e11;
  }
  get styleSheet() {
    let t7 = this.o;
    const s7 = this.t;
    if (e && void 0 === t7) {
      const e11 = void 0 !== s7 && 1 === s7.length;
      e11 && (t7 = o.get(s7)), void 0 === t7 && ((this.o = t7 = new CSSStyleSheet()).replaceSync(this.cssText), e11 && o.set(s7, t7));
    }
    return t7;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t7) => new n("string" == typeof t7 ? t7 : t7 + "", void 0, s);
var i = (t7, ...e11) => {
  const o11 = 1 === t7.length ? t7[0] : e11.reduce((e12, s7, o12) => e12 + ((t8) => {
    if (true === t8._$cssResult$) return t8.cssText;
    if ("number" == typeof t8) return t8;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t8 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s7) + t7[o12 + 1], t7[0]);
  return new n(o11, t7, s);
};
var S = (s7, o11) => {
  if (e) s7.adoptedStyleSheets = o11.map((t7) => t7 instanceof CSSStyleSheet ? t7 : t7.styleSheet);
  else for (const e11 of o11) {
    const o12 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o12.setAttribute("nonce", n10), o12.textContent = e11.cssText, s7.appendChild(o12);
  }
};
var c = e ? (t7) => t7 : (t7) => t7 instanceof CSSStyleSheet ? ((t8) => {
  let e11 = "";
  for (const s7 of t8.cssRules) e11 += s7.cssText;
  return r(e11);
})(t7) : t7;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t7, s7) => t7;
var u = { toAttribute(t7, s7) {
  switch (s7) {
    case Boolean:
      t7 = t7 ? l : null;
      break;
    case Object:
    case Array:
      t7 = null == t7 ? t7 : JSON.stringify(t7);
  }
  return t7;
}, fromAttribute(t7, s7) {
  let i10 = t7;
  switch (s7) {
    case Boolean:
      i10 = null !== t7;
      break;
    case Number:
      i10 = null === t7 ? null : Number(t7);
      break;
    case Object:
    case Array:
      try {
        i10 = JSON.parse(t7);
      } catch (t8) {
        i10 = null;
      }
  }
  return i10;
} };
var f = (t7, s7) => !i2(t7, s7);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t7) {
    this._$Ei(), (this.l ??= []).push(t7);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t7, s7 = b) {
    if (s7.state && (s7.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t7) && ((s7 = Object.create(s7)).wrapped = true), this.elementProperties.set(t7, s7), !s7.noAccessor) {
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t7, i10, s7);
      void 0 !== h3 && e2(this.prototype, t7, h3);
    }
  }
  static getPropertyDescriptor(t7, s7, i10) {
    const { get: e11, set: r9 } = h(this.prototype, t7) ?? { get() {
      return this[s7];
    }, set(t8) {
      this[s7] = t8;
    } };
    return { get: e11, set(s8) {
      const h3 = e11?.call(this);
      r9?.call(this, s8), this.requestUpdate(t7, h3, i10);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t7) {
    return this.elementProperties.get(t7) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t7 = n2(this);
    t7.finalize(), void 0 !== t7.l && (this.l = [...t7.l]), this.elementProperties = new Map(t7.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t8 = this.properties, s7 = [...r2(t8), ...o2(t8)];
      for (const i10 of s7) this.createProperty(i10, t8[i10]);
    }
    const t7 = this[Symbol.metadata];
    if (null !== t7) {
      const s7 = litPropertyMetadata.get(t7);
      if (void 0 !== s7) for (const [t8, i10] of s7) this.elementProperties.set(t8, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t8, s7] of this.elementProperties) {
      const i10 = this._$Eu(t8, s7);
      void 0 !== i10 && this._$Eh.set(i10, t8);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s7) {
    const i10 = [];
    if (Array.isArray(s7)) {
      const e11 = new Set(s7.flat(1 / 0).reverse());
      for (const s8 of e11) i10.unshift(c(s8));
    } else void 0 !== s7 && i10.push(c(s7));
    return i10;
  }
  static _$Eu(t7, s7) {
    const i10 = s7.attribute;
    return false === i10 ? void 0 : "string" == typeof i10 ? i10 : "string" == typeof t7 ? t7.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t7) => this.enableUpdating = t7), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t7) => t7(this));
  }
  addController(t7) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t7), void 0 !== this.renderRoot && this.isConnected && t7.hostConnected?.();
  }
  removeController(t7) {
    this._$EO?.delete(t7);
  }
  _$E_() {
    const t7 = /* @__PURE__ */ new Map(), s7 = this.constructor.elementProperties;
    for (const i10 of s7.keys()) this.hasOwnProperty(i10) && (t7.set(i10, this[i10]), delete this[i10]);
    t7.size > 0 && (this._$Ep = t7);
  }
  createRenderRoot() {
    const t7 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t7, this.constructor.elementStyles), t7;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t7) => t7.hostConnected?.());
  }
  enableUpdating(t7) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t7) => t7.hostDisconnected?.());
  }
  attributeChangedCallback(t7, s7, i10) {
    this._$AK(t7, i10);
  }
  _$ET(t7, s7) {
    const i10 = this.constructor.elementProperties.get(t7), e11 = this.constructor._$Eu(t7, i10);
    if (void 0 !== e11 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s7, i10.type);
      this._$Em = t7, null == h3 ? this.removeAttribute(e11) : this.setAttribute(e11, h3), this._$Em = null;
    }
  }
  _$AK(t7, s7) {
    const i10 = this.constructor, e11 = i10._$Eh.get(t7);
    if (void 0 !== e11 && this._$Em !== e11) {
      const t8 = i10.getPropertyOptions(e11), h3 = "function" == typeof t8.converter ? { fromAttribute: t8.converter } : void 0 !== t8.converter?.fromAttribute ? t8.converter : u;
      this._$Em = e11;
      const r9 = h3.fromAttribute(s7, t8.type);
      this[e11] = r9 ?? this._$Ej?.get(e11) ?? r9, this._$Em = null;
    }
  }
  requestUpdate(t7, s7, i10, e11 = false, h3) {
    if (void 0 !== t7) {
      const r9 = this.constructor;
      if (false === e11 && (h3 = this[t7]), i10 ??= r9.getPropertyOptions(t7), !((i10.hasChanged ?? f)(h3, s7) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t7) && !this.hasAttribute(r9._$Eu(t7, i10)))) return;
      this.C(t7, s7, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t7, s7, { useDefault: i10, reflect: e11, wrapped: h3 }, r9) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t7) && (this._$Ej.set(t7, r9 ?? s7 ?? this[t7]), true !== h3 || void 0 !== r9) || (this._$AL.has(t7) || (this.hasUpdated || i10 || (s7 = void 0), this._$AL.set(t7, s7)), true === e11 && this._$Em !== t7 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t7));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t8) {
      Promise.reject(t8);
    }
    const t7 = this.scheduleUpdate();
    return null != t7 && await t7, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t9, s8] of this._$Ep) this[t9] = s8;
        this._$Ep = void 0;
      }
      const t8 = this.constructor.elementProperties;
      if (t8.size > 0) for (const [s8, i10] of t8) {
        const { wrapped: t9 } = i10, e11 = this[s8];
        true !== t9 || this._$AL.has(s8) || void 0 === e11 || this.C(s8, void 0, i10, e11);
      }
    }
    let t7 = false;
    const s7 = this._$AL;
    try {
      t7 = this.shouldUpdate(s7), t7 ? (this.willUpdate(s7), this._$EO?.forEach((t8) => t8.hostUpdate?.()), this.update(s7)) : this._$EM();
    } catch (s8) {
      throw t7 = false, this._$EM(), s8;
    }
    t7 && this._$AE(s7);
  }
  willUpdate(t7) {
  }
  _$AE(t7) {
    this._$EO?.forEach((t8) => t8.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t7)), this.updated(t7);
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
  shouldUpdate(t7) {
    return true;
  }
  update(t7) {
    this._$Eq &&= this._$Eq.forEach((t8) => this._$ET(t8, this[t8])), this._$EM();
  }
  updated(t7) {
  }
  firstUpdated(t7) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t7) => t7;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t7) => t7 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t7) => null === t7 || "object" != typeof t7 && "function" != typeof t7;
var u2 = Array.isArray;
var d2 = (t7) => u2(t7) || "function" == typeof t7?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t7) => (i10, ...s7) => ({ _$litType$: t7, strings: i10, values: s7 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t7, i10) {
  if (!u2(t7) || !t7.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i10) : i10;
}
var N = (t7, i10) => {
  const s7 = t7.length - 1, e11 = [];
  let n10, l3 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c4 = v;
  for (let i11 = 0; i11 < s7; i11++) {
    const s8 = t7[i11];
    let a6, u4, d4 = -1, f3 = 0;
    for (; f3 < s8.length && (c4.lastIndex = f3, u4 = c4.exec(s8), null !== u4); ) f3 = c4.lastIndex, c4 === v ? "!--" === u4[1] ? c4 = _ : void 0 !== u4[1] ? c4 = m : void 0 !== u4[2] ? (y2.test(u4[2]) && (n10 = RegExp("</" + u4[2], "g")), c4 = p2) : void 0 !== u4[3] && (c4 = p2) : c4 === p2 ? ">" === u4[0] ? (c4 = n10 ?? v, d4 = -1) : void 0 === u4[1] ? d4 = -2 : (d4 = c4.lastIndex - u4[2].length, a6 = u4[1], c4 = void 0 === u4[3] ? p2 : '"' === u4[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n10 = void 0);
    const x2 = c4 === p2 && t7[i11 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s8 + r3 : d4 >= 0 ? (e11.push(a6), s8.slice(0, d4) + h2 + s8.slice(d4) + o3 + x2) : s8 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t7, l3 + (t7[s7] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e11];
};
var S2 = class _S {
  constructor({ strings: t7, _$litType$: i10 }, e11) {
    let r9;
    this.parts = [];
    let l3 = 0, a6 = 0;
    const u4 = t7.length - 1, d4 = this.parts, [f3, v2] = N(t7, i10);
    if (this.el = _S.createElement(f3, e11), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t8 = this.el.content.firstChild;
      t8.replaceWith(...t8.childNodes);
    }
    for (; null !== (r9 = P.nextNode()) && d4.length < u4; ) {
      if (1 === r9.nodeType) {
        if (r9.hasAttributes()) for (const t8 of r9.getAttributeNames()) if (t8.endsWith(h2)) {
          const i11 = v2[a6++], s7 = r9.getAttribute(t8).split(o3), e12 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l3, name: e12[2], strings: s7, ctor: "." === e12[1] ? I : "?" === e12[1] ? L : "@" === e12[1] ? z : H }), r9.removeAttribute(t8);
        } else t8.startsWith(o3) && (d4.push({ type: 6, index: l3 }), r9.removeAttribute(t8));
        if (y2.test(r9.tagName)) {
          const t8 = r9.textContent.split(o3), i11 = t8.length - 1;
          if (i11 > 0) {
            r9.textContent = s2 ? s2.emptyScript : "";
            for (let s7 = 0; s7 < i11; s7++) r9.append(t8[s7], c3()), P.nextNode(), d4.push({ type: 2, index: ++l3 });
            r9.append(t8[i11], c3());
          }
        }
      } else if (8 === r9.nodeType) if (r9.data === n3) d4.push({ type: 2, index: l3 });
      else {
        let t8 = -1;
        for (; -1 !== (t8 = r9.data.indexOf(o3, t8 + 1)); ) d4.push({ type: 7, index: l3 }), t8 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t7, i10) {
    const s7 = l2.createElement("template");
    return s7.innerHTML = t7, s7;
  }
};
function M(t7, i10, s7 = t7, e11) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e11 ? s7._$Co?.[e11] : s7._$Cl;
  const o11 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o11 && (h3?._$AO?.(false), void 0 === o11 ? h3 = void 0 : (h3 = new o11(t7), h3._$AT(t7, s7, e11)), void 0 !== e11 ? (s7._$Co ??= [])[e11] = h3 : s7._$Cl = h3), void 0 !== h3 && (i10 = M(t7, h3._$AS(t7, i10.values), h3, e11)), i10;
}
var R = class {
  constructor(t7, i10) {
    this._$AV = [], this._$AN = void 0, this._$AD = t7, this._$AM = i10;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t7) {
    const { el: { content: i10 }, parts: s7 } = this._$AD, e11 = (t7?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e11;
    let h3 = P.nextNode(), o11 = 0, n10 = 0, r9 = s7[0];
    for (; void 0 !== r9; ) {
      if (o11 === r9.index) {
        let i11;
        2 === r9.type ? i11 = new k(h3, h3.nextSibling, this, t7) : 1 === r9.type ? i11 = new r9.ctor(h3, r9.name, r9.strings, this, t7) : 6 === r9.type && (i11 = new Z(h3, this, t7)), this._$AV.push(i11), r9 = s7[++n10];
      }
      o11 !== r9?.index && (h3 = P.nextNode(), o11++);
    }
    return P.currentNode = l2, e11;
  }
  p(t7) {
    let i10 = 0;
    for (const s7 of this._$AV) void 0 !== s7 && (void 0 !== s7.strings ? (s7._$AI(t7, s7, i10), i10 += s7.strings.length - 2) : s7._$AI(t7[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t7, i10, s7, e11) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t7, this._$AB = i10, this._$AM = s7, this.options = e11, this._$Cv = e11?.isConnected ?? true;
  }
  get parentNode() {
    let t7 = this._$AA.parentNode;
    const i10 = this._$AM;
    return void 0 !== i10 && 11 === t7?.nodeType && (t7 = i10.parentNode), t7;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t7, i10 = this) {
    t7 = M(this, t7, i10), a2(t7) ? t7 === A || null == t7 || "" === t7 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t7 !== this._$AH && t7 !== E && this._(t7) : void 0 !== t7._$litType$ ? this.$(t7) : void 0 !== t7.nodeType ? this.T(t7) : d2(t7) ? this.k(t7) : this._(t7);
  }
  O(t7) {
    return this._$AA.parentNode.insertBefore(t7, this._$AB);
  }
  T(t7) {
    this._$AH !== t7 && (this._$AR(), this._$AH = this.O(t7));
  }
  _(t7) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t7 : this.T(l2.createTextNode(t7)), this._$AH = t7;
  }
  $(t7) {
    const { values: i10, _$litType$: s7 } = t7, e11 = "number" == typeof s7 ? this._$AC(t7) : (void 0 === s7.el && (s7.el = S2.createElement(V(s7.h, s7.h[0]), this.options)), s7);
    if (this._$AH?._$AD === e11) this._$AH.p(i10);
    else {
      const t8 = new R(e11, this), s8 = t8.u(this.options);
      t8.p(i10), this.T(s8), this._$AH = t8;
    }
  }
  _$AC(t7) {
    let i10 = C.get(t7.strings);
    return void 0 === i10 && C.set(t7.strings, i10 = new S2(t7)), i10;
  }
  k(t7) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s7, e11 = 0;
    for (const h3 of t7) e11 === i10.length ? i10.push(s7 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s7 = i10[e11], s7._$AI(h3), e11++;
    e11 < i10.length && (this._$AR(s7 && s7._$AB.nextSibling, e11), i10.length = e11);
  }
  _$AR(t7 = this._$AA.nextSibling, s7) {
    for (this._$AP?.(false, true, s7); t7 !== this._$AB; ) {
      const s8 = i3(t7).nextSibling;
      i3(t7).remove(), t7 = s8;
    }
  }
  setConnected(t7) {
    void 0 === this._$AM && (this._$Cv = t7, this._$AP?.(t7));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t7, i10, s7, e11, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t7, this.name = i10, this._$AM = e11, this.options = h3, s7.length > 2 || "" !== s7[0] || "" !== s7[1] ? (this._$AH = Array(s7.length - 1).fill(new String()), this.strings = s7) : this._$AH = A;
  }
  _$AI(t7, i10 = this, s7, e11) {
    const h3 = this.strings;
    let o11 = false;
    if (void 0 === h3) t7 = M(this, t7, i10, 0), o11 = !a2(t7) || t7 !== this._$AH && t7 !== E, o11 && (this._$AH = t7);
    else {
      const e12 = t7;
      let n10, r9;
      for (t7 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r9 = M(this, e12[s7 + n10], i10, n10), r9 === E && (r9 = this._$AH[n10]), o11 ||= !a2(r9) || r9 !== this._$AH[n10], r9 === A ? t7 = A : t7 !== A && (t7 += (r9 ?? "") + h3[n10 + 1]), this._$AH[n10] = r9;
    }
    o11 && !e11 && this.j(t7);
  }
  j(t7) {
    t7 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t7 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t7) {
    this.element[this.name] = t7 === A ? void 0 : t7;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t7) {
    this.element.toggleAttribute(this.name, !!t7 && t7 !== A);
  }
};
var z = class extends H {
  constructor(t7, i10, s7, e11, h3) {
    super(t7, i10, s7, e11, h3), this.type = 5;
  }
  _$AI(t7, i10 = this) {
    if ((t7 = M(this, t7, i10, 0) ?? A) === E) return;
    const s7 = this._$AH, e11 = t7 === A && s7 !== A || t7.capture !== s7.capture || t7.once !== s7.once || t7.passive !== s7.passive, h3 = t7 !== A && (s7 === A || e11);
    e11 && this.element.removeEventListener(this.name, this, s7), h3 && this.element.addEventListener(this.name, this, t7), this._$AH = t7;
  }
  handleEvent(t7) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t7) : this._$AH.handleEvent(t7);
  }
};
var Z = class {
  constructor(t7, i10, s7) {
    this.element = t7, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s7;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t7) {
    M(this, t7);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t7, i10, s7) => {
  const e11 = s7?.renderBefore ?? i10;
  let h3 = e11._$litPart$;
  if (void 0 === h3) {
    const t8 = s7?.renderBefore ?? null;
    e11._$litPart$ = h3 = new k(i10.insertBefore(c3(), t8), t8, void 0, s7 ?? {});
  }
  return h3._$AI(t7), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t7 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t7.firstChild, t7;
  }
  update(t7) {
    const r9 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t7), this._$Do = D(r9, this.renderRoot, this.renderOptions);
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

// node_modules/lit-html/is-server.js
var o5 = false;

// deps/swc/swc-dist/components/accordion/accordion.js
var t3 = i`:host{display:block;min-inline-size:var(--swc-accordion-min-inline-size, var(--swc-accordion-minimum-width))}.swc-Accordion{--_swc-accordion-corner-radius: 8px}:host([size=\"s\"]) .swc-Accordion{--_swc-accordion-corner-radius: 7px}:host([size=\"l\"]) .swc-Accordion{--_swc-accordion-corner-radius: 9px}:host([size=\"xl\"]) .swc-Accordion{--_swc-accordion-corner-radius: 10px}:host([quiet]) ::slotted(swc-accordion-item){--swc-accordion-item-divider-color: transparent;--swc-accordion-item-header-corner-radius: var(--_swc-accordion-corner-radius)}:host([density=\"compact\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 7px;--swc-accordion-item-padding-bottom: 7px}:host([density=\"spacious\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 13px;--swc-accordion-item-padding-bottom: 13px}:host([density=\"compact\"][size=\"s\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 5px;--swc-accordion-item-padding-bottom: 5px}:host([density=\"compact\"][size=\"l\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 10px;--swc-accordion-item-padding-bottom: 10px}:host([density=\"compact\"][size=\"xl\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 13px;--swc-accordion-item-padding-bottom: 13px}:host([density=\"spacious\"][size=\"s\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 10px;--swc-accordion-item-padding-bottom: 10px}:host([density=\"spacious\"][size=\"l\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 15px;--swc-accordion-item-padding-bottom: 15px}:host([density=\"spacious\"][size=\"xl\"]) ::slotted(swc-accordion-item){--swc-accordion-item-padding-top: 19px;--swc-accordion-item-padding-bottom: 19px}`;

// deps/swc/swc-dist/core/components/accordion/Accordion.types.js
var e4 = [
  "s",
  "m",
  "l",
  "xl"
];
var r4 = "swc-accordion-item-toggle";
var i5 = "swc-open";
var a3 = "swc-close";
var o6 = "swc-after-open";
var s4 = "swc-after-close";

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e5(e11, t7, n10, r9) {
  var i10 = arguments.length, a6 = i10 < 3 ? t7 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t7, n10) : r9, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e11, t7, n10, r9);
  else for (var s7 = e11.length - 1; s7 >= 0; s7--) (o11 = e11[s7]) && (a6 = (i10 < 3 ? o11(a6) : i10 > 3 ? o11(t7, n10, a6) : o11(t7, n10)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t7, n10, a6), a6;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o7 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r5 = (t7 = o7, e11, r9) => {
  const { kind: n10, metadata: i10 } = r9;
  let s7 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s7 && globalThis.litPropertyMetadata.set(i10, s7 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t7 = Object.create(t7)).wrapped = true), s7.set(r9.name, t7), "accessor" === n10) {
    const { name: o11 } = r9;
    return { set(r10) {
      const n11 = e11.get.call(this);
      e11.set.call(this, r10), this.requestUpdate(o11, n11, t7, true, r10);
    }, init(e12) {
      return void 0 !== e12 && this.C(o11, void 0, t7, e12), e12;
    } };
  }
  if ("setter" === n10) {
    const { name: o11 } = r9;
    return function(r10) {
      const n11 = this[o11];
      e11.call(this, r10), this.requestUpdate(o11, n11, t7, true, r10);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t7) {
  return (e11, o11) => "object" == typeof o11 ? r5(t7, e11, o11) : ((t8, e12, o12) => {
    const r9 = e12.hasOwnProperty(o12);
    return e12.constructor.createProperty(o12, t8), r9 ? Object.getOwnPropertyDescriptor(e12, o12) : void 0;
  })(t7, e11, o11);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r6(r9) {
  return n4({ ...r9, state: true, attribute: false });
}

// deps/swc/swc-dist/core/element/define-element.js
function e7(e11, t7) {
  window.__swc && window.__swc.DEBUG && customElements.get(e11) && window.__swc.warn(void 0, `Attempted to redefine <${e11}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e11, t7);
}

// deps/swc/swc-dist/core/element/version.js
var e8 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e9(e11 = document) {
  var t7;
  let n10 = e11.activeElement;
  for (; !(n10 == null || (t7 = n10.shadowRoot) == null) && t7.activeElement; ) n10 = n10.shadowRoot.activeElement;
  return n10;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i6;
function a4(t7) {
  class n10 extends t7 {
    hasVisibleFocusInTree() {
      var t8;
      let n11 = e9(this.getRootNode());
      return (t8 = n11 == null ? void 0 : n11.matches(":focus-visible")) == null ? false : t8;
    }
  }
  return n10;
}
var o8 = class extends a4(i4) {
  get dir() {
    var e11;
    return (e11 = getComputedStyle(this).direction) == null ? "ltr" : e11;
  }
};
if (i6 = o8, i6.VERSION = e8, i6.CORE_VERSION = t4, true) {
  let e11 = {
    default: false,
    accessibility: false,
    api: false
  }, t7 = {
    default: false,
    low: false,
    medium: false,
    high: false,
    deprecation: false
  };
  window.__swc = {
    ...window.__swc,
    DEBUG: true,
    ignoreWarningLocalNames: { ...((s7 = window.__swc) == null ? void 0 : s7.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e11,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t7,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e12, t8, n10, { type: r9 = "api", level: i10 = "default", issues: a6 } = {}) => {
      let { localName: o11 = "base" } = e12 || {}, s8 = `${o11}:${r9}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s8) || window.__swc.ignoreWarningLocalNames[o11] || window.__swc.ignoreWarningTypes[r9] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s8);
      let c5 = "";
      a6 && a6.length && (a6.unshift(""), c5 = a6.join("\n    - ") + "\n");
      let l4 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u4 = e12 ? "\nInspect this issue in the follow element:" : "", d4 = (e12 ? "\n\n" : "\n") + n10 + "\n", f3 = [];
      f3.push(l4 + t8 + "\n" + c5 + u4), e12 && f3.push(e12), f3.push(d4, { data: {
        localName: o11,
        type: r9,
        level: i10
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s7;
var c4;
var l3;

// node_modules/@lit-labs/observers/mutation-controller.js
var s5 = class {
  constructor(s7, { target: i10, config: h3, callback: o11, skipInitial: e11 }) {
    this.t = /* @__PURE__ */ new Set(), this.o = false, this.i = false, this.h = s7, null !== i10 && this.t.add(i10 ?? s7), this.l = h3, this.o = e11 ?? this.o, this.callback = o11, o5 || (window.MutationObserver ? (this.u = new MutationObserver((t7) => {
      this.handleChanges(t7), this.h.requestUpdate();
    }), s7.addController(this)) : console.warn("MutationController error: browser does not support MutationObserver."));
  }
  handleChanges(t7) {
    this.value = this.callback?.(t7, this.u);
  }
  hostConnected() {
    for (const t7 of this.t) this.observe(t7);
  }
  hostDisconnected() {
    this.disconnect();
  }
  async hostUpdated() {
    const t7 = this.u.takeRecords();
    (t7.length || !this.o && this.i) && this.handleChanges(t7), this.i = false;
  }
  observe(t7) {
    this.t.add(t7), this.u.observe(t7, this.l), this.i = true, this.h.requestUpdate();
  }
  disconnect() {
    this.u.disconnect();
  }
};

// deps/swc/swc-dist/core/mixins/observe-slot-presence.js
var t5 = /* @__PURE__ */ Symbol("slotContentIsPresent");
function n5(n10, r9) {
  let i10 = Array.isArray(r9) ? r9 : [r9];
  class a6 extends n10 {
    constructor(...n11) {
      super(...n11), this[t5] = /* @__PURE__ */ new Map(), this.managePresenceObservedSlot = () => {
        let e11 = false;
        i10.forEach((n12) => {
          let r10 = !!this.querySelector(`:scope > ${n12}`), i11 = this[t5].get(n12) || false;
          e11 = e11 || i11 !== r10, this[t5].set(n12, !!this.querySelector(`:scope > ${n12}`));
        }), e11 && this.updateComplete.then(() => {
          this.requestUpdate();
        });
      }, new s5(this, {
        config: {
          childList: true,
          subtree: true
        },
        callback: () => {
          this.managePresenceObservedSlot();
        }
      }), this.managePresenceObservedSlot();
    }
    get slotContentIsPresent() {
      if (i10.length === 1) return this[t5].get(i10[0]) || false;
      throw Error("Multiple selectors provided to `ObserveSlotPresence` use `getSlotContentPresence(selector: string)` instead.");
    }
    getSlotContentPresence(e11) {
      if (this[t5].has(e11)) return this[t5].get(e11) || false;
      throw Error(`The provided selector \`${e11}\` is not being observed.`);
    }
  }
  return a6;
}

// deps/swc/swc-dist/core/components/accordion/AccordionItem.base.js
var u3 = class extends n5(o8, '[slot="actions"]') {
  constructor(...e11) {
    super(...e11), this.disabled = false, this._open = false, this.headingLevel = 3, this.parentDisabled = false, this.afterEventPending = false, this.handleTransitionEnd = (e12) => {
      e12.target !== this.contentPanel || e12.propertyName !== "height" || !this.afterEventPending || (this.afterEventPending = false, this.dispatchAfterEvent(this.open));
    }, this.handleTransitionCancel = (e12) => {
      e12.target !== this.contentPanel || e12.propertyName !== "height" || !this.afterEventPending || (this.afterEventPending = false, this.dispatchAfterEvent(this.open));
    };
  }
  get open() {
    return this._open;
  }
  set open(e11) {
    if (this.hasUpdated && !this.mayExpand() && e11 !== this._open || e11 === this._open) return;
    let t7 = this._open;
    this._open = e11, e11 ? this.setAttribute("open", "") : this.removeAttribute("open"), this.requestUpdate("open", t7);
  }
  mayExpand() {
    return !this.disabled && !this.parentDisabled;
  }
  get contentPanel() {
    var e11, t7;
    return (e11 = (t7 = this.shadowRoot) == null ? void 0 : t7.getElementById("content")) == null ? null : e11;
  }
  dispatchAfterEvent(n10) {
    this.dispatchEvent(new Event(n10 ? o6 : s4, {
      bubbles: true,
      composed: true
    }));
  }
  toggle() {
    if (!this.mayExpand()) return;
    this.open = !this.open;
    let e11 = new Event(r4, {
      bubbles: true,
      composed: true,
      cancelable: true
    });
    if (!this.dispatchEvent(e11)) {
      this.open = !this.open;
      return;
    }
    let t7 = this.open;
    this.dispatchEvent(new Event(t7 ? i5 : a3, {
      bubbles: true,
      composed: true
    }));
    let a6 = this.contentPanel;
    !a6 || getComputedStyle(a6).transitionDuration === "0s" ? this.dispatchAfterEvent(t7) : this.afterEventPending = true;
  }
  setManagedHeading(e11) {
    this.headingLevel = e11;
  }
  setManagedParentDisabled(e11) {
    this.parentDisabled = e11;
  }
  firstUpdated(e11) {
    var t7, n10;
    super.firstUpdated(e11), (t7 = this.contentPanel) == null || t7.addEventListener("transitionend", this.handleTransitionEnd), (n10 = this.contentPanel) == null || n10.addEventListener("transitioncancel", this.handleTransitionCancel);
  }
  connectedCallback() {
    if (super.connectedCallback(), this.hasUpdated) {
      var e11, t7;
      (e11 = this.contentPanel) == null || e11.addEventListener("transitionend", this.handleTransitionEnd), (t7 = this.contentPanel) == null || t7.addEventListener("transitioncancel", this.handleTransitionCancel);
    }
  }
  disconnectedCallback() {
    var e11, t7;
    super.disconnectedCallback(), (e11 = this.contentPanel) == null || e11.removeEventListener("transitionend", this.handleTransitionEnd), (t7 = this.contentPanel) == null || t7.removeEventListener("transitioncancel", this.handleTransitionCancel);
  }
};
e5([n4({
  type: Boolean,
  reflect: true
})], u3.prototype, "open", null), e5([n4({
  type: Boolean,
  reflect: true
})], u3.prototype, "disabled", void 0), e5([n4({
  type: String,
  reflect: true
})], u3.prototype, "size", void 0), e5([r6()], u3.prototype, "headingLevel", void 0), e5([r6()], u3.prototype, "parentDisabled", void 0);

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r7 = [
  "s",
  "m",
  "l",
  "xl"
];
function i8(n10, { validSizes: i10 = [...r7], noDefaultSize: a6, defaultSize: o11 = "m" } = {}) {
  var s7;
  class c4 extends n10 {
    constructor(...e11) {
      super(...e11), this._size = o11;
    }
    get size() {
      return this._size || o11;
    }
    set size(e11) {
      let t7 = a6 ? null : o11, n11 = e11 && e11.toLocaleLowerCase(), r9 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t7;
      if (r9 && this.setAttribute("size", r9), this._size === r9) return;
      let i11 = this._size;
      this._size = r9, this.requestUpdate("size", i11);
    }
    update(e11) {
      !this.hasAttribute("size") && !a6 && this.setAttribute("size", this.size), super.update(e11);
    }
  }
  return s7 = c4, s7.VALID_SIZES = i10, e5([n4({ type: String })], c4.prototype, "size", null), c4;
}

// deps/swc/swc-dist/core/components/accordion/Accordion.base.js
var s6 = class extends i8(o8, {
  validSizes: e4,
  defaultSize: "m"
}) {
  constructor(...e11) {
    super(...e11), this.allowMultiple = false, this.level = 3, this.density = "regular", this.quiet = false, this.disabled = false, this.closeSiblingsOnOpen = (e12) => {
      if (this.disabled) {
        e12.preventDefault();
        return;
      }
      if (this.allowMultiple) return;
      let t7 = e12.target;
      t7 instanceof u3 && queueMicrotask(() => {
        if (t7.open) for (let e13 of this.assignedItems()) e13 !== t7 && (e13.open = false);
      });
    };
  }
  assignedItems() {
    var e11;
    let t7 = (e11 = this.renderRoot) == null ? void 0 : e11.querySelector("slot");
    return t7 ? t7.assignedElements({ flatten: true }).filter((e12) => e12 instanceof u3) : [];
  }
  syncAccordionItems() {
    for (let e11 of this.assignedItems()) e11.setManagedHeading(this.level), e11.size = this.size, e11.setManagedParentDisabled(this.disabled);
  }
  enforceExclusiveOpen() {
    let e11 = false;
    for (let t7 of this.assignedItems()) t7.open && (e11 ? t7.open = false : e11 = true);
  }
  connectedCallback() {
    super.connectedCallback(), this.addEventListener(r4, this.closeSiblingsOnOpen);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.removeEventListener(r4, this.closeSiblingsOnOpen);
  }
  update(e11) {
    if (e11.has("level")) {
      let e12 = Math.min(6, Math.max(2, this.level));
      this.level !== e12 && (this.level = e12);
    }
    (e11.has("level") || e11.has("size") || e11.has("disabled")) && this.syncAccordionItems(), e11.has("disabled") && e11.get("disabled") === true && !this.allowMultiple && this.enforceExclusiveOpen(), super.update(e11);
  }
};
e5([n4({
  type: Boolean,
  reflect: true,
  attribute: "allow-multiple"
})], s6.prototype, "allowMultiple", void 0), e5([n4({
  type: Number,
  reflect: true
})], s6.prototype, "level", void 0), e5([n4({
  type: String,
  reflect: true
})], s6.prototype, "density", void 0), e5([n4({
  type: Boolean,
  reflect: true
})], s6.prototype, "quiet", void 0), e5([n4({
  type: Boolean,
  reflect: true
})], s6.prototype, "disabled", void 0);

// deps/swc/swc-dist/components/accordion/Accordion2.js
var r8 = class extends s6 {
  static get styles() {
    return [t3];
  }
  render() {
    return b2`
      <div class="swc-Accordion">
        <slot @slotchange=${this.syncAccordionItems}></slot>
      </div>
    `;
  }
};

// deps/swc/swc-dist/components/accordion/swc-accordion.js
e7("swc-accordion", r8);
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
@lit-labs/observers/mutation-controller.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
