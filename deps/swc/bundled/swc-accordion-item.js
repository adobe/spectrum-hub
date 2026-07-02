// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t12, e12, o15) {
    if (this._$cssResult$ = true, o15 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t12, this.t = e12;
  }
  get styleSheet() {
    let t12 = this.o;
    const s8 = this.t;
    if (e && void 0 === t12) {
      const e12 = void 0 !== s8 && 1 === s8.length;
      e12 && (t12 = o.get(s8)), void 0 === t12 && ((this.o = t12 = new CSSStyleSheet()).replaceSync(this.cssText), e12 && o.set(s8, t12));
    }
    return t12;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t12) => new n("string" == typeof t12 ? t12 : t12 + "", void 0, s);
var i = (t12, ...e12) => {
  const o15 = 1 === t12.length ? t12[0] : e12.reduce((e13, s8, o16) => e13 + ((t13) => {
    if (true === t13._$cssResult$) return t13.cssText;
    if ("number" == typeof t13) return t13;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t13 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s8) + t12[o16 + 1], t12[0]);
  return new n(o15, t12, s);
};
var S = (s8, o15) => {
  if (e) s8.adoptedStyleSheets = o15.map((t12) => t12 instanceof CSSStyleSheet ? t12 : t12.styleSheet);
  else for (const e12 of o15) {
    const o16 = document.createElement("style"), n12 = t.litNonce;
    void 0 !== n12 && o16.setAttribute("nonce", n12), o16.textContent = e12.cssText, s8.appendChild(o16);
  }
};
var c = e ? (t12) => t12 : (t12) => t12 instanceof CSSStyleSheet ? ((t13) => {
  let e12 = "";
  for (const s8 of t13.cssRules) e12 += s8.cssText;
  return r(e12);
})(t12) : t12;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t12, s8) => t12;
var u = { toAttribute(t12, s8) {
  switch (s8) {
    case Boolean:
      t12 = t12 ? l : null;
      break;
    case Object:
    case Array:
      t12 = null == t12 ? t12 : JSON.stringify(t12);
  }
  return t12;
}, fromAttribute(t12, s8) {
  let i10 = t12;
  switch (s8) {
    case Boolean:
      i10 = null !== t12;
      break;
    case Number:
      i10 = null === t12 ? null : Number(t12);
      break;
    case Object:
    case Array:
      try {
        i10 = JSON.parse(t12);
      } catch (t13) {
        i10 = null;
      }
  }
  return i10;
} };
var f = (t12, s8) => !i2(t12, s8);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t12) {
    this._$Ei(), (this.l ??= []).push(t12);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t12, s8 = b) {
    if (s8.state && (s8.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t12) && ((s8 = Object.create(s8)).wrapped = true), this.elementProperties.set(t12, s8), !s8.noAccessor) {
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t12, i10, s8);
      void 0 !== h3 && e2(this.prototype, t12, h3);
    }
  }
  static getPropertyDescriptor(t12, s8, i10) {
    const { get: e12, set: r9 } = h(this.prototype, t12) ?? { get() {
      return this[s8];
    }, set(t13) {
      this[s8] = t13;
    } };
    return { get: e12, set(s9) {
      const h3 = e12?.call(this);
      r9?.call(this, s9), this.requestUpdate(t12, h3, i10);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t12) {
    return this.elementProperties.get(t12) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t12 = n2(this);
    t12.finalize(), void 0 !== t12.l && (this.l = [...t12.l]), this.elementProperties = new Map(t12.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t13 = this.properties, s8 = [...r2(t13), ...o2(t13)];
      for (const i10 of s8) this.createProperty(i10, t13[i10]);
    }
    const t12 = this[Symbol.metadata];
    if (null !== t12) {
      const s8 = litPropertyMetadata.get(t12);
      if (void 0 !== s8) for (const [t13, i10] of s8) this.elementProperties.set(t13, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t13, s8] of this.elementProperties) {
      const i10 = this._$Eu(t13, s8);
      void 0 !== i10 && this._$Eh.set(i10, t13);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s8) {
    const i10 = [];
    if (Array.isArray(s8)) {
      const e12 = new Set(s8.flat(1 / 0).reverse());
      for (const s9 of e12) i10.unshift(c(s9));
    } else void 0 !== s8 && i10.push(c(s8));
    return i10;
  }
  static _$Eu(t12, s8) {
    const i10 = s8.attribute;
    return false === i10 ? void 0 : "string" == typeof i10 ? i10 : "string" == typeof t12 ? t12.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t12) => this.enableUpdating = t12), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t12) => t12(this));
  }
  addController(t12) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t12), void 0 !== this.renderRoot && this.isConnected && t12.hostConnected?.();
  }
  removeController(t12) {
    this._$EO?.delete(t12);
  }
  _$E_() {
    const t12 = /* @__PURE__ */ new Map(), s8 = this.constructor.elementProperties;
    for (const i10 of s8.keys()) this.hasOwnProperty(i10) && (t12.set(i10, this[i10]), delete this[i10]);
    t12.size > 0 && (this._$Ep = t12);
  }
  createRenderRoot() {
    const t12 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t12, this.constructor.elementStyles), t12;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t12) => t12.hostConnected?.());
  }
  enableUpdating(t12) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t12) => t12.hostDisconnected?.());
  }
  attributeChangedCallback(t12, s8, i10) {
    this._$AK(t12, i10);
  }
  _$ET(t12, s8) {
    const i10 = this.constructor.elementProperties.get(t12), e12 = this.constructor._$Eu(t12, i10);
    if (void 0 !== e12 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s8, i10.type);
      this._$Em = t12, null == h3 ? this.removeAttribute(e12) : this.setAttribute(e12, h3), this._$Em = null;
    }
  }
  _$AK(t12, s8) {
    const i10 = this.constructor, e12 = i10._$Eh.get(t12);
    if (void 0 !== e12 && this._$Em !== e12) {
      const t13 = i10.getPropertyOptions(e12), h3 = "function" == typeof t13.converter ? { fromAttribute: t13.converter } : void 0 !== t13.converter?.fromAttribute ? t13.converter : u;
      this._$Em = e12;
      const r9 = h3.fromAttribute(s8, t13.type);
      this[e12] = r9 ?? this._$Ej?.get(e12) ?? r9, this._$Em = null;
    }
  }
  requestUpdate(t12, s8, i10, e12 = false, h3) {
    if (void 0 !== t12) {
      const r9 = this.constructor;
      if (false === e12 && (h3 = this[t12]), i10 ??= r9.getPropertyOptions(t12), !((i10.hasChanged ?? f)(h3, s8) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t12) && !this.hasAttribute(r9._$Eu(t12, i10)))) return;
      this.C(t12, s8, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t12, s8, { useDefault: i10, reflect: e12, wrapped: h3 }, r9) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t12) && (this._$Ej.set(t12, r9 ?? s8 ?? this[t12]), true !== h3 || void 0 !== r9) || (this._$AL.has(t12) || (this.hasUpdated || i10 || (s8 = void 0), this._$AL.set(t12, s8)), true === e12 && this._$Em !== t12 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t12));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t13) {
      Promise.reject(t13);
    }
    const t12 = this.scheduleUpdate();
    return null != t12 && await t12, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t14, s9] of this._$Ep) this[t14] = s9;
        this._$Ep = void 0;
      }
      const t13 = this.constructor.elementProperties;
      if (t13.size > 0) for (const [s9, i10] of t13) {
        const { wrapped: t14 } = i10, e12 = this[s9];
        true !== t14 || this._$AL.has(s9) || void 0 === e12 || this.C(s9, void 0, i10, e12);
      }
    }
    let t12 = false;
    const s8 = this._$AL;
    try {
      t12 = this.shouldUpdate(s8), t12 ? (this.willUpdate(s8), this._$EO?.forEach((t13) => t13.hostUpdate?.()), this.update(s8)) : this._$EM();
    } catch (s9) {
      throw t12 = false, this._$EM(), s9;
    }
    t12 && this._$AE(s8);
  }
  willUpdate(t12) {
  }
  _$AE(t12) {
    this._$EO?.forEach((t13) => t13.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t12)), this.updated(t12);
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
  shouldUpdate(t12) {
    return true;
  }
  update(t12) {
    this._$Eq &&= this._$Eq.forEach((t13) => this._$ET(t13, this[t13])), this._$EM();
  }
  updated(t12) {
  }
  firstUpdated(t12) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t12) => t12;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t12) => t12 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t12) => null === t12 || "object" != typeof t12 && "function" != typeof t12;
var u2 = Array.isArray;
var d2 = (t12) => u2(t12) || "function" == typeof t12?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t12) => (i10, ...s8) => ({ _$litType$: t12, strings: i10, values: s8 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t12, i10) {
  if (!u2(t12) || !t12.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i10) : i10;
}
var N = (t12, i10) => {
  const s8 = t12.length - 1, e12 = [];
  let n12, l4 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c5 = v;
  for (let i11 = 0; i11 < s8; i11++) {
    const s9 = t12[i11];
    let a7, u5, d5 = -1, f3 = 0;
    for (; f3 < s9.length && (c5.lastIndex = f3, u5 = c5.exec(s9), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n12 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n12 ?? v, d5 = -1) : void 0 === u5[1] ? d5 = -2 : (d5 = c5.lastIndex - u5[2].length, a7 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n12 = void 0);
    const x2 = c5 === p2 && t12[i11 + 1].startsWith("/>") ? " " : "";
    l4 += c5 === v ? s9 + r3 : d5 >= 0 ? (e12.push(a7), s9.slice(0, d5) + h2 + s9.slice(d5) + o3 + x2) : s9 + o3 + (-2 === d5 ? i11 : x2);
  }
  return [V(t12, l4 + (t12[s8] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e12];
};
var S2 = class _S {
  constructor({ strings: t12, _$litType$: i10 }, e12) {
    let r9;
    this.parts = [];
    let l4 = 0, a7 = 0;
    const u5 = t12.length - 1, d5 = this.parts, [f3, v2] = N(t12, i10);
    if (this.el = _S.createElement(f3, e12), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t13 = this.el.content.firstChild;
      t13.replaceWith(...t13.childNodes);
    }
    for (; null !== (r9 = P.nextNode()) && d5.length < u5; ) {
      if (1 === r9.nodeType) {
        if (r9.hasAttributes()) for (const t13 of r9.getAttributeNames()) if (t13.endsWith(h2)) {
          const i11 = v2[a7++], s8 = r9.getAttribute(t13).split(o3), e13 = /([.?@])?(.*)/.exec(i11);
          d5.push({ type: 1, index: l4, name: e13[2], strings: s8, ctor: "." === e13[1] ? I : "?" === e13[1] ? L : "@" === e13[1] ? z : H }), r9.removeAttribute(t13);
        } else t13.startsWith(o3) && (d5.push({ type: 6, index: l4 }), r9.removeAttribute(t13));
        if (y2.test(r9.tagName)) {
          const t13 = r9.textContent.split(o3), i11 = t13.length - 1;
          if (i11 > 0) {
            r9.textContent = s2 ? s2.emptyScript : "";
            for (let s8 = 0; s8 < i11; s8++) r9.append(t13[s8], c3()), P.nextNode(), d5.push({ type: 2, index: ++l4 });
            r9.append(t13[i11], c3());
          }
        }
      } else if (8 === r9.nodeType) if (r9.data === n3) d5.push({ type: 2, index: l4 });
      else {
        let t13 = -1;
        for (; -1 !== (t13 = r9.data.indexOf(o3, t13 + 1)); ) d5.push({ type: 7, index: l4 }), t13 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t12, i10) {
    const s8 = l2.createElement("template");
    return s8.innerHTML = t12, s8;
  }
};
function M(t12, i10, s8 = t12, e12) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e12 ? s8._$Co?.[e12] : s8._$Cl;
  const o15 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o15 && (h3?._$AO?.(false), void 0 === o15 ? h3 = void 0 : (h3 = new o15(t12), h3._$AT(t12, s8, e12)), void 0 !== e12 ? (s8._$Co ??= [])[e12] = h3 : s8._$Cl = h3), void 0 !== h3 && (i10 = M(t12, h3._$AS(t12, i10.values), h3, e12)), i10;
}
var R = class {
  constructor(t12, i10) {
    this._$AV = [], this._$AN = void 0, this._$AD = t12, this._$AM = i10;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t12) {
    const { el: { content: i10 }, parts: s8 } = this._$AD, e12 = (t12?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e12;
    let h3 = P.nextNode(), o15 = 0, n12 = 0, r9 = s8[0];
    for (; void 0 !== r9; ) {
      if (o15 === r9.index) {
        let i11;
        2 === r9.type ? i11 = new k(h3, h3.nextSibling, this, t12) : 1 === r9.type ? i11 = new r9.ctor(h3, r9.name, r9.strings, this, t12) : 6 === r9.type && (i11 = new Z(h3, this, t12)), this._$AV.push(i11), r9 = s8[++n12];
      }
      o15 !== r9?.index && (h3 = P.nextNode(), o15++);
    }
    return P.currentNode = l2, e12;
  }
  p(t12) {
    let i10 = 0;
    for (const s8 of this._$AV) void 0 !== s8 && (void 0 !== s8.strings ? (s8._$AI(t12, s8, i10), i10 += s8.strings.length - 2) : s8._$AI(t12[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t12, i10, s8, e12) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t12, this._$AB = i10, this._$AM = s8, this.options = e12, this._$Cv = e12?.isConnected ?? true;
  }
  get parentNode() {
    let t12 = this._$AA.parentNode;
    const i10 = this._$AM;
    return void 0 !== i10 && 11 === t12?.nodeType && (t12 = i10.parentNode), t12;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t12, i10 = this) {
    t12 = M(this, t12, i10), a2(t12) ? t12 === A || null == t12 || "" === t12 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t12 !== this._$AH && t12 !== E && this._(t12) : void 0 !== t12._$litType$ ? this.$(t12) : void 0 !== t12.nodeType ? this.T(t12) : d2(t12) ? this.k(t12) : this._(t12);
  }
  O(t12) {
    return this._$AA.parentNode.insertBefore(t12, this._$AB);
  }
  T(t12) {
    this._$AH !== t12 && (this._$AR(), this._$AH = this.O(t12));
  }
  _(t12) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t12 : this.T(l2.createTextNode(t12)), this._$AH = t12;
  }
  $(t12) {
    const { values: i10, _$litType$: s8 } = t12, e12 = "number" == typeof s8 ? this._$AC(t12) : (void 0 === s8.el && (s8.el = S2.createElement(V(s8.h, s8.h[0]), this.options)), s8);
    if (this._$AH?._$AD === e12) this._$AH.p(i10);
    else {
      const t13 = new R(e12, this), s9 = t13.u(this.options);
      t13.p(i10), this.T(s9), this._$AH = t13;
    }
  }
  _$AC(t12) {
    let i10 = C.get(t12.strings);
    return void 0 === i10 && C.set(t12.strings, i10 = new S2(t12)), i10;
  }
  k(t12) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s8, e12 = 0;
    for (const h3 of t12) e12 === i10.length ? i10.push(s8 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s8 = i10[e12], s8._$AI(h3), e12++;
    e12 < i10.length && (this._$AR(s8 && s8._$AB.nextSibling, e12), i10.length = e12);
  }
  _$AR(t12 = this._$AA.nextSibling, s8) {
    for (this._$AP?.(false, true, s8); t12 !== this._$AB; ) {
      const s9 = i3(t12).nextSibling;
      i3(t12).remove(), t12 = s9;
    }
  }
  setConnected(t12) {
    void 0 === this._$AM && (this._$Cv = t12, this._$AP?.(t12));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t12, i10, s8, e12, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t12, this.name = i10, this._$AM = e12, this.options = h3, s8.length > 2 || "" !== s8[0] || "" !== s8[1] ? (this._$AH = Array(s8.length - 1).fill(new String()), this.strings = s8) : this._$AH = A;
  }
  _$AI(t12, i10 = this, s8, e12) {
    const h3 = this.strings;
    let o15 = false;
    if (void 0 === h3) t12 = M(this, t12, i10, 0), o15 = !a2(t12) || t12 !== this._$AH && t12 !== E, o15 && (this._$AH = t12);
    else {
      const e13 = t12;
      let n12, r9;
      for (t12 = h3[0], n12 = 0; n12 < h3.length - 1; n12++) r9 = M(this, e13[s8 + n12], i10, n12), r9 === E && (r9 = this._$AH[n12]), o15 ||= !a2(r9) || r9 !== this._$AH[n12], r9 === A ? t12 = A : t12 !== A && (t12 += (r9 ?? "") + h3[n12 + 1]), this._$AH[n12] = r9;
    }
    o15 && !e12 && this.j(t12);
  }
  j(t12) {
    t12 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t12 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t12) {
    this.element[this.name] = t12 === A ? void 0 : t12;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t12) {
    this.element.toggleAttribute(this.name, !!t12 && t12 !== A);
  }
};
var z = class extends H {
  constructor(t12, i10, s8, e12, h3) {
    super(t12, i10, s8, e12, h3), this.type = 5;
  }
  _$AI(t12, i10 = this) {
    if ((t12 = M(this, t12, i10, 0) ?? A) === E) return;
    const s8 = this._$AH, e12 = t12 === A && s8 !== A || t12.capture !== s8.capture || t12.once !== s8.once || t12.passive !== s8.passive, h3 = t12 !== A && (s8 === A || e12);
    e12 && this.element.removeEventListener(this.name, this, s8), h3 && this.element.addEventListener(this.name, this, t12), this._$AH = t12;
  }
  handleEvent(t12) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t12) : this._$AH.handleEvent(t12);
  }
};
var Z = class {
  constructor(t12, i10, s8) {
    this.element = t12, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s8;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t12) {
    M(this, t12);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t12, i10, s8) => {
  const e12 = s8?.renderBefore ?? i10;
  let h3 = e12._$litPart$;
  if (void 0 === h3) {
    const t13 = s8?.renderBefore ?? null;
    e12._$litPart$ = h3 = new k(i10.insertBefore(c3(), t13), t13, void 0, s8 ?? {});
  }
  return h3._$AI(t12), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t12 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t12.firstChild, t12;
  }
  update(t12) {
    const r9 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t12), this._$Do = D(r9, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/icon/elements/Chevron75Icon.js
var t3 = () => b2`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <path
        d="M3.375 9.375c-.16016 0-.32031-.06055-.44238-.18262-.24316-.24414-.24316-.64062 0-.88477l3.30859-3.30762L2.93262 1.69238c-.24316-.24414-.24316-.64062 0-.88477.24414-.24414.64062-.24414.88477 0l3.75 3.75c.24316.24414.24316.64062 0 .88477l-3.75 3.75c-.12207.12207-.28223.18262-.44238.18262Z"
      />
    </svg>
  `;

// deps/swc/swc-dist/components/icon/elements/Chevron100Icon.js
var t4 = ({ direction: t12 = "right" } = {}) => {
  let n12 = t12 === "up" ? "rotate(270deg)" : t12 === "down" ? "rotate(90deg)" : t12 === "left" ? "rotate(180deg)" : "";
  return b2`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 10"
      style=${n12 ? `transform: ${n12};` : ""}
    >
      <path
        d="M2.83789 9.8252c-.19238 0-.38379-.07324-.53027-.21973-.29297-.29297-.29297-.76758 0-1.06055l3.54395-3.54492L2.30762 1.45508c-.29297-.29297-.29297-.76758 0-1.06055s.76758-.29297 1.06055 0l4.07422 4.0752c.29297.29297.29297.76758 0 1.06055l-4.07422 4.0752c-.14648.14648-.33789.21973-.53027.21973Z"
      />
    </svg>
  `;
};

// deps/swc/swc-dist/components/icon/elements/Chevron200Icon.js
var t5 = () => b2`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
      <path
        d="M3.5625 11.7002c-.21094 0-.42188-.08105-.58301-.24219-.32227-.32227-.32227-.84375 0-1.16602l4.29102-4.29199L2.97949 1.70801c-.32227-.32227-.32227-.84375 0-1.16602s.84375-.32227 1.16602 0l4.875 4.875c.32227.32227.32227.84375 0 1.16602l-4.875 4.875c-.16113.16113-.37207.24219-.58301.24219Z"
      />
    </svg>
  `;

// deps/swc/swc-dist/components/icon/elements/Chevron300Icon.js
var t6 = () => b2`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
      <path
        d="M10.639 7a.95.95 0 0 0-.278-.671l-.003-.002-5.33-5.33a.95.95 0 0 0-1.342 1.342L8.346 7l-4.661 4.66a.95.95 0 1 0 1.342 1.343l5.33-5.33.003-.001A.95.95 0 0 0 10.64 7z"
      />
    </svg>
  `;

// deps/swc/swc-dist/components/icon/icon.js
var t7 = i`:host{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium);display:inline-flex;inline-size:var(--swc-icon-inline-size);block-size:var(--swc-icon-block-size);color:var(--swc-icon-color, currentColor)}:host([size=\"xs\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-small);--swc-icon-block-size: var(--swc-workflow-icon-extra-small)}:host([size=\"s\"]){--swc-icon-inline-size: var(--swc-workflow-icon-small);--swc-icon-block-size: var(--swc-workflow-icon-small)}:host([size=\"m\"]){--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium)}:host([size=\"l\"]){--swc-icon-inline-size: var(--swc-workflow-icon-large);--swc-icon-block-size: var(--swc-workflow-icon-large)}:host([size=\"xl\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-large);--swc-icon-block-size: var(--swc-workflow-icon-extra-large)}.swc-Icon{display:block;inline-size:100%;block-size:100%}svg,.swc-Icon>svg,::slotted(*){display:block;inline-size:100%;block-size:100%;fill:currentcolor}`;

// deps/swc/swc-dist/core/components/icon/Icon.types.js
var e4 = [
  "xs",
  "s",
  "m",
  "l",
  "xl"
];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e5(e12, t12, n12, r9) {
  var i10 = arguments.length, a7 = i10 < 3 ? t12 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t12, n12) : r9, o15;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a7 = Reflect.decorate(e12, t12, n12, r9);
  else for (var s8 = e12.length - 1; s8 >= 0; s8--) (o15 = e12[s8]) && (a7 = (i10 < 3 ? o15(a7) : i10 > 3 ? o15(t12, n12, a7) : o15(t12, n12)) || a7);
  return i10 > 3 && a7 && Object.defineProperty(t12, n12, a7), a7;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o6 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t12 = o6, e12, r9) => {
  const { kind: n12, metadata: i10 } = r9;
  let s8 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s8 && globalThis.litPropertyMetadata.set(i10, s8 = /* @__PURE__ */ new Map()), "setter" === n12 && ((t12 = Object.create(t12)).wrapped = true), s8.set(r9.name, t12), "accessor" === n12) {
    const { name: o15 } = r9;
    return { set(r10) {
      const n13 = e12.get.call(this);
      e12.set.call(this, r10), this.requestUpdate(o15, n13, t12, true, r10);
    }, init(e13) {
      return void 0 !== e13 && this.C(o15, void 0, t12, e13), e13;
    } };
  }
  if ("setter" === n12) {
    const { name: o15 } = r9;
    return function(r10) {
      const n13 = this[o15];
      e12.call(this, r10), this.requestUpdate(o15, n13, t12, true, r10);
    };
  }
  throw Error("Unsupported decorator location: " + n12);
};
function n4(t12) {
  return (e12, o15) => "object" == typeof o15 ? r4(t12, e12, o15) : ((t13, e13, o16) => {
    const r9 = e13.hasOwnProperty(o16);
    return e13.constructor.createProperty(o16, t13), r9 ? Object.getOwnPropertyDescriptor(e13, o16) : void 0;
  })(t12, e12, o15);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r5(r9) {
  return n4({ ...r9, state: true, attribute: false });
}

// node_modules/@lit/reactive-element/decorators/base.js
var e6 = (e12, t12, c5) => (c5.configurable = true, c5.enumerable = true, Reflect.decorate && "object" != typeof t12 && Object.defineProperty(e12, t12, c5), c5);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o7(o15) {
  return (e12, n12) => {
    const { slot: r9, selector: s8 } = o15 ?? {}, c5 = "slot" + (r9 ? `[name=${r9}]` : ":not([name])");
    return e6(e12, n12, { get() {
      const t12 = this.renderRoot?.querySelector(c5), e13 = t12?.assignedElements(o15) ?? [];
      return void 0 === s8 ? e13 : e13.filter((t13) => t13.matches(s8));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e7(e12, t12) {
  window.__swc && window.__swc.DEBUG && customElements.get(e12) && window.__swc.warn(void 0, `Attempted to redefine <${e12}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e12, t12);
}

// deps/swc/swc-dist/core/element/version.js
var e8 = "0.1.0";
var t8 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e9(e12 = document) {
  var t12;
  let n12 = e12.activeElement;
  for (; !(n12 == null || (t12 = n12.shadowRoot) == null) && t12.activeElement; ) n12 = n12.shadowRoot.activeElement;
  return n12;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t12) {
  class n12 extends t12 {
    hasVisibleFocusInTree() {
      var t13;
      let n13 = e9(this.getRootNode());
      return (t13 = n13 == null ? void 0 : n13.matches(":focus-visible")) == null ? false : t13;
    }
  }
  return n12;
}
var o8 = class extends a3(i4) {
  get dir() {
    var e12;
    return (e12 = getComputedStyle(this).direction) == null ? "ltr" : e12;
  }
};
if (i5 = o8, i5.VERSION = e8, i5.CORE_VERSION = t8, true) {
  let e12 = {
    default: false,
    accessibility: false,
    api: false
  }, t12 = {
    default: false,
    low: false,
    medium: false,
    high: false,
    deprecation: false
  };
  window.__swc = {
    ...window.__swc,
    DEBUG: true,
    ignoreWarningLocalNames: { ...((s8 = window.__swc) == null ? void 0 : s8.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e12,
      ...((c5 = window.__swc) == null ? void 0 : c5.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t12,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e13, t13, n12, { type: r9 = "api", level: i10 = "default", issues: a7 } = {}) => {
      let { localName: o15 = "base" } = e13 || {}, s9 = `${o15}:${r9}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s9) || window.__swc.ignoreWarningLocalNames[o15] || window.__swc.ignoreWarningTypes[r9] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s9);
      let c6 = "";
      a7 && a7.length && (a7.unshift(""), c6 = a7.join("\n    - ") + "\n");
      let l5 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u5 = e13 ? "\nInspect this issue in the follow element:" : "", d5 = (e13 ? "\n\n" : "\n") + n12 + "\n", f3 = [];
      f3.push(l5 + t13 + "\n" + c6 + u5), e13 && f3.push(e13), f3.push(d5, { data: {
        localName: o15,
        type: r9,
        level: i10
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s8;
var c5;
var l4;

// node_modules/@lit-labs/observers/mutation-controller.js
var s4 = class {
  constructor(s8, { target: i10, config: h3, callback: o15, skipInitial: e12 }) {
    this.t = /* @__PURE__ */ new Set(), this.o = false, this.i = false, this.h = s8, null !== i10 && this.t.add(i10 ?? s8), this.l = h3, this.o = e12 ?? this.o, this.callback = o15, o5 || (window.MutationObserver ? (this.u = new MutationObserver((t12) => {
      this.handleChanges(t12), this.h.requestUpdate();
    }), s8.addController(this)) : console.warn("MutationController error: browser does not support MutationObserver."));
  }
  handleChanges(t12) {
    this.value = this.callback?.(t12, this.u);
  }
  hostConnected() {
    for (const t12 of this.t) this.observe(t12);
  }
  hostDisconnected() {
    this.disconnect();
  }
  async hostUpdated() {
    const t12 = this.u.takeRecords();
    (t12.length || !this.o && this.i) && this.handleChanges(t12), this.i = false;
  }
  observe(t12) {
    this.t.add(t12), this.u.observe(t12, this.l), this.i = true, this.h.requestUpdate();
  }
  disconnect() {
    this.u.disconnect();
  }
};

// deps/swc/swc-dist/core/mixins/observe-slot-presence.js
var t9 = /* @__PURE__ */ Symbol("slotContentIsPresent");
function n5(n12, r9) {
  let i10 = Array.isArray(r9) ? r9 : [r9];
  class a7 extends n12 {
    constructor(...n13) {
      super(...n13), this[t9] = /* @__PURE__ */ new Map(), this.managePresenceObservedSlot = () => {
        let e12 = false;
        i10.forEach((n14) => {
          let r10 = !!this.querySelector(`:scope > ${n14}`), i11 = this[t9].get(n14) || false;
          e12 = e12 || i11 !== r10, this[t9].set(n14, !!this.querySelector(`:scope > ${n14}`));
        }), e12 && this.updateComplete.then(() => {
          this.requestUpdate();
        });
      }, new s4(this, {
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
      if (i10.length === 1) return this[t9].get(i10[0]) || false;
      throw Error("Multiple selectors provided to `ObserveSlotPresence` use `getSlotContentPresence(selector: string)` instead.");
    }
    getSlotContentPresence(e12) {
      if (this[t9].has(e12)) return this[t9].get(e12) || false;
      throw Error(`The provided selector \`${e12}\` is not being observed.`);
    }
  }
  return a7;
}

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n12, { validSizes: i10 = [...r6], noDefaultSize: a7, defaultSize: o15 = "m" } = {}) {
  var s8;
  class c5 extends n12 {
    constructor(...e12) {
      super(...e12), this._size = o15;
    }
    get size() {
      return this._size || o15;
    }
    set size(e12) {
      let t12 = a7 ? null : o15, n13 = e12 && e12.toLocaleLowerCase(), r9 = this.constructor.VALID_SIZES.includes(n13) ? n13 : t12;
      if (r9 && this.setAttribute("size", r9), this._size === r9) return;
      let i11 = this._size;
      this._size = r9, this.requestUpdate("size", i11);
    }
    update(e12) {
      !this.hasAttribute("size") && !a7 && this.setAttribute("size", this.size), super.update(e12);
    }
  }
  return s8 = c5, s8.VALID_SIZES = i10, e5([n4({ type: String })], c5.prototype, "size", null), c5;
}

// deps/swc/swc-dist/core/components/icon/Icon.base.js
var o11 = class extends i7(o8, { validSizes: [...e4] }) {
  constructor(...e12) {
    super(...e12), this.label = "";
  }
  firstUpdated(e12) {
    super.firstUpdated(e12), this.updateSlottedIcon(), this.updateHostAccessibility();
  }
  updated(e12) {
    super.updated(e12), e12.has("label") && (this.updateSlottedIcon(), this.updateHostAccessibility());
  }
  handleSlotChange() {
    this.updateSlottedIcon();
  }
  updateSlottedIcon() {
    var e12;
    let [t12] = this.defaultSlotElements;
    if (!t12) return;
    let n12 = t12 instanceof SVGElement ? t12 : (e12 = t12.querySelector) == null ? void 0 : e12.call(t12, "svg");
    n12 && (n12.setAttribute("role", "img"), this.label ? (n12.setAttribute("aria-label", this.label), n12.removeAttribute("aria-hidden")) : (n12.setAttribute("aria-hidden", "true"), n12.removeAttribute("aria-label")));
  }
  updateHostAccessibility() {
    this.label ? this.removeAttribute("aria-hidden") : this.setAttribute("aria-hidden", "true");
  }
};
e5([n4({ type: String })], o11.prototype, "label", void 0), e5([o7({ flatten: true })], o11.prototype, "defaultSlotElements", void 0);

// deps/swc/swc-dist/components/icon/Icon2.js
var r7 = class extends o11 {
  static get styles() {
    return [t7];
  }
  render() {
    return b2`
      <span class="swc-Icon">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </span>
    `;
  }
};

// deps/swc/swc-dist/components/icon/swc-icon.js
e7("swc-icon", r7);

// deps/swc/swc-dist/components/accordion/accordion-item.js
var t10 = i`:host{display:block;inline-size:100%}*{box-sizing:border-box}.swc-AccordionItem{--_swc-accordion-item-header-background: transparent;--_swc-accordion-item-header-text-color: var(--swc-gray-800);inline-size:100%;border-block-end:1px solid var(--swc-accordion-item-divider-color, var(--swc-gray-200))}:host(:first-child) .swc-AccordionItem{border-block-start:1px solid var(--swc-accordion-item-divider-color, var(--swc-gray-200))}.swc-AccordionItem-row{display:flex;gap:8px;align-items:center}.swc-AccordionItem-heading{flex:1 1 auto;min-inline-size:0;padding:0;margin:0;font:inherit}.swc-AccordionItem-header{--_swc-accordion-item-padding-top: var(--swc-accordion-item-padding-top, 10px);--_swc-accordion-item-padding-bottom: var(--swc-accordion-item-padding-bottom, 10px);--_swc-accordion-item-disclosure-indicator-gap: var(--swc-accordion-item-disclosure-indicator-gap, 6px);--_swc-accordion-item-edge-to-content-area: var(--swc-accordion-item-edge-to-content-area, 8px);--_swc-accordion-item-header-font-size: var(--swc-accordion-item-header-font-size, var(--swc-font-size-200));display:flex;gap:var(--_swc-accordion-item-disclosure-indicator-gap);align-items:center;inline-size:100%;padding-block:var(--_swc-accordion-item-padding-top) var(--_swc-accordion-item-padding-bottom);padding-inline:var(--_swc-accordion-item-edge-to-content-area);font-family:inherit;font-size:var(--_swc-accordion-item-header-font-size);font-weight:700;line-height:1.3;color:var(--_swc-accordion-item-header-text-color);text-align:start;background-color:var(--_swc-accordion-item-header-background);border:0;border-radius:var(--swc-accordion-item-header-corner-radius, 0);-webkit-appearance:none;-moz-appearance:none;appearance:none}.swc-AccordionItem:has(.swc-AccordionItem-header:focus-visible){--_swc-accordion-item-header-background: rgba(0, 0, 0, .09);--_swc-accordion-item-header-text-color: var(--swc-gray-900)}.swc-AccordionItem-header:focus-visible{border-radius:var(--swc-accordion-item-focus-indicator-corner-radius, 8px);outline:2px solid var(--swc-blue-800);outline-offset:-2px}.swc-AccordionItem:has(.swc-AccordionItem-header:hover){--_swc-accordion-item-header-background: rgba(0, 0, 0, .09);--_swc-accordion-item-header-text-color: var(--swc-gray-900)}.swc-AccordionItem:has(.swc-AccordionItem-header:active){--_swc-accordion-item-header-background: rgba(0, 0, 0, .15);--_swc-accordion-item-header-text-color: var(--swc-gray-900)}.swc-AccordionItem:has(.swc-AccordionItem-header[aria-disabled=true]),.swc-AccordionItem:has(.swc-AccordionItem-header[aria-disabled=true]:hover){--_swc-accordion-item-header-background: transparent;--_swc-accordion-item-header-text-color: var(--swc-gray-400)}.swc-AccordionItem-indicator{--swc-icon-inline-size: var(--swc-ui-icon-medium);--swc-icon-block-size: var(--swc-ui-icon-medium);flex-shrink:0;rotate:0deg;transition:rotate .13s cubic-bezier(.45,0,.4,1)}:dir(rtl) .swc-AccordionItem-indicator{scale:-1 1}:host([size=\"s\"]) .swc-AccordionItem-indicator{--swc-icon-inline-size: var(--swc-ui-icon-small);--swc-icon-block-size: var(--swc-ui-icon-small)}:host([size=\"l\"]) .swc-AccordionItem-indicator{--swc-icon-inline-size: var(--swc-ui-icon-large);--swc-icon-block-size: var(--swc-ui-icon-large)}:host([size=\"xl\"]) .swc-AccordionItem-indicator{--swc-icon-inline-size: var(--swc-ui-icon-extra-large);--swc-icon-block-size: var(--swc-ui-icon-extra-large)}:host([open]) .swc-AccordionItem-indicator{rotate:90deg}:host([open]):dir(rtl) .swc-AccordionItem-indicator{rotate:-90deg}.swc-AccordionItem-label{flex:1}::slotted([slot=\"label\"]:not([class])){margin:0!important;font:inherit!important}.swc-AccordionItem-actions{display:flex;flex:0 0 auto;gap:8px;align-items:center;margin-inline-end:var(--swc-accordion-item-edge-to-content-area, 8px)}.swc-AccordionItem-content{display:none}:host([open]) .swc-AccordionItem-content{display:block}.swc-AccordionItem-contentBody{--_swc-accordion-item-content-padding-inline: var(--swc-accordion-item-content-padding-inline, 8px);padding-block:8px 16px;padding-inline:var(--_swc-accordion-item-content-padding-inline);font-size:var(--swc-font-size-100);font-weight:400;line-height:1.3;color:var(--swc-gray-700)}.swc-AccordionItem-contentBody ::slotted(:nth-child(1 of :not([slot]))){margin-block-start:0}.swc-AccordionItem-contentBody ::slotted(:last-child){margin-block-end:0}:host([size=\"s\"]){--swc-accordion-item-focus-indicator-corner-radius: 7px;--swc-accordion-item-padding-top: 7px;--swc-accordion-item-padding-bottom: 7px;--swc-accordion-item-disclosure-indicator-gap: 6px;--swc-accordion-item-edge-to-content-area: 8px;--swc-accordion-item-header-font-size: var(--swc-font-size-100);--swc-accordion-item-content-padding-inline: 8px}:host([size=\"l\"]){--swc-accordion-item-focus-indicator-corner-radius: 9px;--swc-accordion-item-padding-top: 13px;--swc-accordion-item-padding-bottom: 13px;--swc-accordion-item-disclosure-indicator-gap: 6px;--swc-accordion-item-edge-to-content-area: 12px;--swc-accordion-item-header-font-size: var(--swc-font-size-300);--swc-accordion-item-content-padding-inline: 12px}:host([size=\"xl\"]){--swc-accordion-item-focus-indicator-corner-radius: 10px;--swc-accordion-item-padding-top: 15px;--swc-accordion-item-padding-bottom: 15px;--swc-accordion-item-disclosure-indicator-gap: 8px;--swc-accordion-item-edge-to-content-area: 16px;--swc-accordion-item-header-font-size: var(--swc-font-size-400);--swc-accordion-item-content-padding-inline: 16px}@supports (height: calc-size(auto,size)){.swc-AccordionItem-content{display:block;height:0;overflow:hidden;transition:height .13s cubic-bezier(.45,0,.4,1)}:host([open]) .swc-AccordionItem-content{height:calc-size(auto,size)}@media(prefers-reduced-motion:reduce){.swc-AccordionItem-content{transition:none}}}`;

// node_modules/lit-html/directives/if-defined.js
var o12 = (o15) => o15 ?? A;

// node_modules/lit-html/directives/when.js
function n9(n12, r9, t12) {
  return n12 ? r9(n12) : t12?.(n12);
}

// deps/swc/swc-dist/core/components/accordion/Accordion.types.js
var e11 = [
  "s",
  "m",
  "l",
  "xl"
];
var r8 = "swc-accordion-item-toggle";
var i9 = "swc-open";
var a5 = "swc-close";
var o13 = "swc-after-open";
var s5 = "swc-after-close";

// deps/swc/swc-dist/core/components/accordion/AccordionItem.base.js
var u3 = class extends n5(o8, '[slot="actions"]') {
  constructor(...e12) {
    super(...e12), this.disabled = false, this._open = false, this.headingLevel = 3, this.parentDisabled = false, this.afterEventPending = false, this.handleTransitionEnd = (e13) => {
      e13.target !== this.contentPanel || e13.propertyName !== "height" || !this.afterEventPending || (this.afterEventPending = false, this.dispatchAfterEvent(this.open));
    }, this.handleTransitionCancel = (e13) => {
      e13.target !== this.contentPanel || e13.propertyName !== "height" || !this.afterEventPending || (this.afterEventPending = false, this.dispatchAfterEvent(this.open));
    };
  }
  get open() {
    return this._open;
  }
  set open(e12) {
    if (this.hasUpdated && !this.mayExpand() && e12 !== this._open || e12 === this._open) return;
    let t12 = this._open;
    this._open = e12, e12 ? this.setAttribute("open", "") : this.removeAttribute("open"), this.requestUpdate("open", t12);
  }
  mayExpand() {
    return !this.disabled && !this.parentDisabled;
  }
  get contentPanel() {
    var e12, t12;
    return (e12 = (t12 = this.shadowRoot) == null ? void 0 : t12.getElementById("content")) == null ? null : e12;
  }
  dispatchAfterEvent(n12) {
    this.dispatchEvent(new Event(n12 ? o13 : s5, {
      bubbles: true,
      composed: true
    }));
  }
  toggle() {
    if (!this.mayExpand()) return;
    this.open = !this.open;
    let e12 = new Event(r8, {
      bubbles: true,
      composed: true,
      cancelable: true
    });
    if (!this.dispatchEvent(e12)) {
      this.open = !this.open;
      return;
    }
    let t12 = this.open;
    this.dispatchEvent(new Event(t12 ? i9 : a5, {
      bubbles: true,
      composed: true
    }));
    let a7 = this.contentPanel;
    !a7 || getComputedStyle(a7).transitionDuration === "0s" ? this.dispatchAfterEvent(t12) : this.afterEventPending = true;
  }
  setManagedHeading(e12) {
    this.headingLevel = e12;
  }
  setManagedParentDisabled(e12) {
    this.parentDisabled = e12;
  }
  firstUpdated(e12) {
    var t12, n12;
    super.firstUpdated(e12), (t12 = this.contentPanel) == null || t12.addEventListener("transitionend", this.handleTransitionEnd), (n12 = this.contentPanel) == null || n12.addEventListener("transitioncancel", this.handleTransitionCancel);
  }
  connectedCallback() {
    if (super.connectedCallback(), this.hasUpdated) {
      var e12, t12;
      (e12 = this.contentPanel) == null || e12.addEventListener("transitionend", this.handleTransitionEnd), (t12 = this.contentPanel) == null || t12.addEventListener("transitioncancel", this.handleTransitionCancel);
    }
  }
  disconnectedCallback() {
    var e12, t12;
    super.disconnectedCallback(), (e12 = this.contentPanel) == null || e12.removeEventListener("transitionend", this.handleTransitionEnd), (t12 = this.contentPanel) == null || t12.removeEventListener("transitioncancel", this.handleTransitionCancel);
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
})], u3.prototype, "size", void 0), e5([r5()], u3.prototype, "headingLevel", void 0), e5([r5()], u3.prototype, "parentDisabled", void 0);

// deps/swc/swc-dist/core/components/accordion/Accordion.base.js
var s6 = class extends i7(o8, {
  validSizes: e11,
  defaultSize: "m"
}) {
  constructor(...e12) {
    super(...e12), this.allowMultiple = false, this.level = 3, this.density = "regular", this.quiet = false, this.disabled = false, this.closeSiblingsOnOpen = (e13) => {
      if (this.disabled) {
        e13.preventDefault();
        return;
      }
      if (this.allowMultiple) return;
      let t12 = e13.target;
      t12 instanceof u3 && queueMicrotask(() => {
        if (t12.open) for (let e14 of this.assignedItems()) e14 !== t12 && (e14.open = false);
      });
    };
  }
  assignedItems() {
    var e12;
    let t12 = (e12 = this.renderRoot) == null ? void 0 : e12.querySelector("slot");
    return t12 ? t12.assignedElements({ flatten: true }).filter((e13) => e13 instanceof u3) : [];
  }
  syncAccordionItems() {
    for (let e12 of this.assignedItems()) e12.setManagedHeading(this.level), e12.size = this.size, e12.setManagedParentDisabled(this.disabled);
  }
  enforceExclusiveOpen() {
    let e12 = false;
    for (let t12 of this.assignedItems()) t12.open && (e12 ? t12.open = false : e12 = true);
  }
  connectedCallback() {
    super.connectedCallback(), this.addEventListener(r8, this.closeSiblingsOnOpen);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.removeEventListener(r8, this.closeSiblingsOnOpen);
  }
  update(e12) {
    if (e12.has("level")) {
      let e13 = Math.min(6, Math.max(2, this.level));
      this.level !== e13 && (this.level = e13);
    }
    (e12.has("level") || e12.has("size") || e12.has("disabled")) && this.syncAccordionItems(), e12.has("disabled") && e12.get("disabled") === true && !this.allowMultiple && this.enforceExclusiveOpen(), super.update(e12);
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

// node_modules/lit-html/static.js
var a6 = /* @__PURE__ */ Symbol.for("");
var o14 = (t12) => {
  if (t12?.r === a6) return t12?._$litStatic$;
};
var s7 = (t12) => ({ _$litStatic$: t12, r: a6 });
var l3 = /* @__PURE__ */ new Map();
var n11 = (t12) => (r9, ...e12) => {
  const a7 = e12.length;
  let s8, i10;
  const n12 = [], u5 = [];
  let c5, $3 = 0, f3 = false;
  for (; $3 < a7; ) {
    for (c5 = r9[$3]; $3 < a7 && void 0 !== (i10 = e12[$3], s8 = o14(i10)); ) c5 += s8 + r9[++$3], f3 = true;
    $3 !== a7 && u5.push(i10), n12.push(c5), $3++;
  }
  if ($3 === a7 && n12.push(r9[a7]), f3) {
    const t13 = n12.join("$$lit$$");
    void 0 === (r9 = l3.get(t13)) && (n12.raw = n12, l3.set(t13, r9 = n12)), e12 = u5;
  }
  return t12(r9, ...e12);
};
var u4 = n11(b2);
var c4 = n11(w);
var $2 = n11(T);

// deps/swc/swc-dist/components/accordion/AccordionItem.js
var d4 = class extends u3 {
  static get styles() {
    return [t10];
  }
  focus(e12) {
    var t12;
    (t12 = this.shadowRoot) == null || (t12 = t12.getElementById("header")) == null || t12.focus(e12);
  }
  click() {
    var e12;
    (e12 = this.shadowRoot) == null || (e12 = e12.getElementById("header")) == null || e12.click();
  }
  chevronForSize() {
    switch (this.size) {
      case "s":
        return t3();
      case "l":
        return t5();
      case "xl":
        return t6();
      default:
        return t4();
    }
  }
  handleHeaderKeydown(e12) {
    e12.key === " " && (e12.preventDefault(), this.toggle());
  }
  renderHeadingWrapper(e12) {
    let t12 = s7(`h${this.headingLevel}`);
    return u4`<${t12} class="swc-AccordionItem-heading">${e12}</${t12}>`;
  }
  render() {
    let e12 = b2`
      <button
        id="header"
        class="swc-AccordionItem-header"
        type="button"
        aria-expanded=${this.open ? "true" : "false"}
        aria-controls="content"
        aria-disabled=${o12(this.disabled || this.parentDisabled ? "true" : void 0)}
        @click=${this.toggle}
        @keydown=${this.handleHeaderKeydown}
      >
        <swc-icon class="swc-AccordionItem-indicator" aria-hidden="true">
          ${this.chevronForSize()}
        </swc-icon>
        <span class="swc-AccordionItem-label">
          <slot name="label"></slot>
        </span>
      </button>
    `;
    return b2`
      <div class="swc-AccordionItem">
        <div class="swc-AccordionItem-row">
          ${this.renderHeadingWrapper(e12)}
          ${n9(this.slotContentIsPresent, () => b2`
              <div class="swc-AccordionItem-actions">
                <slot name="actions"></slot>
              </div>
            `)}
        </div>
        <div
          id="content"
          class="swc-AccordionItem-content"
          role="region"
          aria-labelledby="header"
          aria-hidden=${o12(this.open ? void 0 : "true")}
          .inert=${this.disabled || this.parentDisabled}
        >
          <div class="swc-AccordionItem-contentBody">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
};

// deps/swc/swc-dist/components/accordion/swc-accordion-item.js
e7("swc-accordion-item", d4);
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
lit-html/directives/when.js:
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

lit-html/static.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
