// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t8, e16, o11) {
    if (this._$cssResult$ = true, o11 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t8, this.t = e16;
  }
  get styleSheet() {
    let t8 = this.o;
    const s6 = this.t;
    if (e && void 0 === t8) {
      const e16 = void 0 !== s6 && 1 === s6.length;
      e16 && (t8 = o.get(s6)), void 0 === t8 && ((this.o = t8 = new CSSStyleSheet()).replaceSync(this.cssText), e16 && o.set(s6, t8));
    }
    return t8;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t8) => new n("string" == typeof t8 ? t8 : t8 + "", void 0, s);
var i = (t8, ...e16) => {
  const o11 = 1 === t8.length ? t8[0] : e16.reduce((e17, s6, o12) => e17 + ((t9) => {
    if (true === t9._$cssResult$) return t9.cssText;
    if ("number" == typeof t9) return t9;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t9 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s6) + t8[o12 + 1], t8[0]);
  return new n(o11, t8, s);
};
var S = (s6, o11) => {
  if (e) s6.adoptedStyleSheets = o11.map((t8) => t8 instanceof CSSStyleSheet ? t8 : t8.styleSheet);
  else for (const e16 of o11) {
    const o12 = document.createElement("style"), n9 = t.litNonce;
    void 0 !== n9 && o12.setAttribute("nonce", n9), o12.textContent = e16.cssText, s6.appendChild(o12);
  }
};
var c = e ? (t8) => t8 : (t8) => t8 instanceof CSSStyleSheet ? ((t9) => {
  let e16 = "";
  for (const s6 of t9.cssRules) e16 += s6.cssText;
  return r(e16);
})(t8) : t8;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t8, s6) => t8;
var u = { toAttribute(t8, s6) {
  switch (s6) {
    case Boolean:
      t8 = t8 ? l : null;
      break;
    case Object:
    case Array:
      t8 = null == t8 ? t8 : JSON.stringify(t8);
  }
  return t8;
}, fromAttribute(t8, s6) {
  let i10 = t8;
  switch (s6) {
    case Boolean:
      i10 = null !== t8;
      break;
    case Number:
      i10 = null === t8 ? null : Number(t8);
      break;
    case Object:
    case Array:
      try {
        i10 = JSON.parse(t8);
      } catch (t9) {
        i10 = null;
      }
  }
  return i10;
} };
var f = (t8, s6) => !i2(t8, s6);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t8) {
    this._$Ei(), (this.l ??= []).push(t8);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t8, s6 = b) {
    if (s6.state && (s6.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t8) && ((s6 = Object.create(s6)).wrapped = true), this.elementProperties.set(t8, s6), !s6.noAccessor) {
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t8, i10, s6);
      void 0 !== h3 && e2(this.prototype, t8, h3);
    }
  }
  static getPropertyDescriptor(t8, s6, i10) {
    const { get: e16, set: r6 } = h(this.prototype, t8) ?? { get() {
      return this[s6];
    }, set(t9) {
      this[s6] = t9;
    } };
    return { get: e16, set(s7) {
      const h3 = e16?.call(this);
      r6?.call(this, s7), this.requestUpdate(t8, h3, i10);
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
      const t9 = this.properties, s6 = [...r2(t9), ...o2(t9)];
      for (const i10 of s6) this.createProperty(i10, t9[i10]);
    }
    const t8 = this[Symbol.metadata];
    if (null !== t8) {
      const s6 = litPropertyMetadata.get(t8);
      if (void 0 !== s6) for (const [t9, i10] of s6) this.elementProperties.set(t9, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t9, s6] of this.elementProperties) {
      const i10 = this._$Eu(t9, s6);
      void 0 !== i10 && this._$Eh.set(i10, t9);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s6) {
    const i10 = [];
    if (Array.isArray(s6)) {
      const e16 = new Set(s6.flat(1 / 0).reverse());
      for (const s7 of e16) i10.unshift(c(s7));
    } else void 0 !== s6 && i10.push(c(s6));
    return i10;
  }
  static _$Eu(t8, s6) {
    const i10 = s6.attribute;
    return false === i10 ? void 0 : "string" == typeof i10 ? i10 : "string" == typeof t8 ? t8.toLowerCase() : void 0;
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
    const t8 = /* @__PURE__ */ new Map(), s6 = this.constructor.elementProperties;
    for (const i10 of s6.keys()) this.hasOwnProperty(i10) && (t8.set(i10, this[i10]), delete this[i10]);
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
  attributeChangedCallback(t8, s6, i10) {
    this._$AK(t8, i10);
  }
  _$ET(t8, s6) {
    const i10 = this.constructor.elementProperties.get(t8), e16 = this.constructor._$Eu(t8, i10);
    if (void 0 !== e16 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s6, i10.type);
      this._$Em = t8, null == h3 ? this.removeAttribute(e16) : this.setAttribute(e16, h3), this._$Em = null;
    }
  }
  _$AK(t8, s6) {
    const i10 = this.constructor, e16 = i10._$Eh.get(t8);
    if (void 0 !== e16 && this._$Em !== e16) {
      const t9 = i10.getPropertyOptions(e16), h3 = "function" == typeof t9.converter ? { fromAttribute: t9.converter } : void 0 !== t9.converter?.fromAttribute ? t9.converter : u;
      this._$Em = e16;
      const r6 = h3.fromAttribute(s6, t9.type);
      this[e16] = r6 ?? this._$Ej?.get(e16) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t8, s6, i10, e16 = false, h3) {
    if (void 0 !== t8) {
      const r6 = this.constructor;
      if (false === e16 && (h3 = this[t8]), i10 ??= r6.getPropertyOptions(t8), !((i10.hasChanged ?? f)(h3, s6) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t8) && !this.hasAttribute(r6._$Eu(t8, i10)))) return;
      this.C(t8, s6, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t8, s6, { useDefault: i10, reflect: e16, wrapped: h3 }, r6) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t8) && (this._$Ej.set(t8, r6 ?? s6 ?? this[t8]), true !== h3 || void 0 !== r6) || (this._$AL.has(t8) || (this.hasUpdated || i10 || (s6 = void 0), this._$AL.set(t8, s6)), true === e16 && this._$Em !== t8 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t8));
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
        for (const [t10, s7] of this._$Ep) this[t10] = s7;
        this._$Ep = void 0;
      }
      const t9 = this.constructor.elementProperties;
      if (t9.size > 0) for (const [s7, i10] of t9) {
        const { wrapped: t10 } = i10, e16 = this[s7];
        true !== t10 || this._$AL.has(s7) || void 0 === e16 || this.C(s7, void 0, i10, e16);
      }
    }
    let t8 = false;
    const s6 = this._$AL;
    try {
      t8 = this.shouldUpdate(s6), t8 ? (this.willUpdate(s6), this._$EO?.forEach((t9) => t9.hostUpdate?.()), this.update(s6)) : this._$EM();
    } catch (s7) {
      throw t8 = false, this._$EM(), s7;
    }
    t8 && this._$AE(s6);
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
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t8) => t8 }) : void 0;
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
var x = (t8) => (i10, ...s6) => ({ _$litType$: t8, strings: i10, values: s6 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t8, i10) {
  if (!u2(t8) || !t8.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i10) : i10;
}
var N = (t8, i10) => {
  const s6 = t8.length - 1, e16 = [];
  let n9, l3 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c4 = v;
  for (let i11 = 0; i11 < s6; i11++) {
    const s7 = t8[i11];
    let a6, u3, d4 = -1, f3 = 0;
    for (; f3 < s7.length && (c4.lastIndex = f3, u3 = c4.exec(s7), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n9 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n9 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c4.lastIndex - u3[2].length, a6 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n9 = void 0);
    const x2 = c4 === p2 && t8[i11 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s7 + r3 : d4 >= 0 ? (e16.push(a6), s7.slice(0, d4) + h2 + s7.slice(d4) + o3 + x2) : s7 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t8, l3 + (t8[s6] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e16];
};
var S2 = class _S {
  constructor({ strings: t8, _$litType$: i10 }, e16) {
    let r6;
    this.parts = [];
    let l3 = 0, a6 = 0;
    const u3 = t8.length - 1, d4 = this.parts, [f3, v2] = N(t8, i10);
    if (this.el = _S.createElement(f3, e16), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t9 = this.el.content.firstChild;
      t9.replaceWith(...t9.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t9 of r6.getAttributeNames()) if (t9.endsWith(h2)) {
          const i11 = v2[a6++], s6 = r6.getAttribute(t9).split(o3), e17 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l3, name: e17[2], strings: s6, ctor: "." === e17[1] ? I : "?" === e17[1] ? L : "@" === e17[1] ? z : H }), r6.removeAttribute(t9);
        } else t9.startsWith(o3) && (d4.push({ type: 6, index: l3 }), r6.removeAttribute(t9));
        if (y2.test(r6.tagName)) {
          const t9 = r6.textContent.split(o3), i11 = t9.length - 1;
          if (i11 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s6 = 0; s6 < i11; s6++) r6.append(t9[s6], c3()), P.nextNode(), d4.push({ type: 2, index: ++l3 });
            r6.append(t9[i11], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d4.push({ type: 2, index: l3 });
      else {
        let t9 = -1;
        for (; -1 !== (t9 = r6.data.indexOf(o3, t9 + 1)); ) d4.push({ type: 7, index: l3 }), t9 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t8, i10) {
    const s6 = l2.createElement("template");
    return s6.innerHTML = t8, s6;
  }
};
function M(t8, i10, s6 = t8, e16) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e16 ? s6._$Co?.[e16] : s6._$Cl;
  const o11 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o11 && (h3?._$AO?.(false), void 0 === o11 ? h3 = void 0 : (h3 = new o11(t8), h3._$AT(t8, s6, e16)), void 0 !== e16 ? (s6._$Co ??= [])[e16] = h3 : s6._$Cl = h3), void 0 !== h3 && (i10 = M(t8, h3._$AS(t8, i10.values), h3, e16)), i10;
}
var R = class {
  constructor(t8, i10) {
    this._$AV = [], this._$AN = void 0, this._$AD = t8, this._$AM = i10;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t8) {
    const { el: { content: i10 }, parts: s6 } = this._$AD, e16 = (t8?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e16;
    let h3 = P.nextNode(), o11 = 0, n9 = 0, r6 = s6[0];
    for (; void 0 !== r6; ) {
      if (o11 === r6.index) {
        let i11;
        2 === r6.type ? i11 = new k(h3, h3.nextSibling, this, t8) : 1 === r6.type ? i11 = new r6.ctor(h3, r6.name, r6.strings, this, t8) : 6 === r6.type && (i11 = new Z(h3, this, t8)), this._$AV.push(i11), r6 = s6[++n9];
      }
      o11 !== r6?.index && (h3 = P.nextNode(), o11++);
    }
    return P.currentNode = l2, e16;
  }
  p(t8) {
    let i10 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t8, s6, i10), i10 += s6.strings.length - 2) : s6._$AI(t8[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t8, i10, s6, e16) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t8, this._$AB = i10, this._$AM = s6, this.options = e16, this._$Cv = e16?.isConnected ?? true;
  }
  get parentNode() {
    let t8 = this._$AA.parentNode;
    const i10 = this._$AM;
    return void 0 !== i10 && 11 === t8?.nodeType && (t8 = i10.parentNode), t8;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t8, i10 = this) {
    t8 = M(this, t8, i10), a2(t8) ? t8 === A || null == t8 || "" === t8 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t8 !== this._$AH && t8 !== E && this._(t8) : void 0 !== t8._$litType$ ? this.$(t8) : void 0 !== t8.nodeType ? this.T(t8) : d2(t8) ? this.k(t8) : this._(t8);
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
    const { values: i10, _$litType$: s6 } = t8, e16 = "number" == typeof s6 ? this._$AC(t8) : (void 0 === s6.el && (s6.el = S2.createElement(V(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === e16) this._$AH.p(i10);
    else {
      const t9 = new R(e16, this), s7 = t9.u(this.options);
      t9.p(i10), this.T(s7), this._$AH = t9;
    }
  }
  _$AC(t8) {
    let i10 = C.get(t8.strings);
    return void 0 === i10 && C.set(t8.strings, i10 = new S2(t8)), i10;
  }
  k(t8) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s6, e16 = 0;
    for (const h3 of t8) e16 === i10.length ? i10.push(s6 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s6 = i10[e16], s6._$AI(h3), e16++;
    e16 < i10.length && (this._$AR(s6 && s6._$AB.nextSibling, e16), i10.length = e16);
  }
  _$AR(t8 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t8 !== this._$AB; ) {
      const s7 = i3(t8).nextSibling;
      i3(t8).remove(), t8 = s7;
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
  constructor(t8, i10, s6, e16, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t8, this.name = i10, this._$AM = e16, this.options = h3, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = A;
  }
  _$AI(t8, i10 = this, s6, e16) {
    const h3 = this.strings;
    let o11 = false;
    if (void 0 === h3) t8 = M(this, t8, i10, 0), o11 = !a2(t8) || t8 !== this._$AH && t8 !== E, o11 && (this._$AH = t8);
    else {
      const e17 = t8;
      let n9, r6;
      for (t8 = h3[0], n9 = 0; n9 < h3.length - 1; n9++) r6 = M(this, e17[s6 + n9], i10, n9), r6 === E && (r6 = this._$AH[n9]), o11 ||= !a2(r6) || r6 !== this._$AH[n9], r6 === A ? t8 = A : t8 !== A && (t8 += (r6 ?? "") + h3[n9 + 1]), this._$AH[n9] = r6;
    }
    o11 && !e16 && this.j(t8);
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
  constructor(t8, i10, s6, e16, h3) {
    super(t8, i10, s6, e16, h3), this.type = 5;
  }
  _$AI(t8, i10 = this) {
    if ((t8 = M(this, t8, i10, 0) ?? A) === E) return;
    const s6 = this._$AH, e16 = t8 === A && s6 !== A || t8.capture !== s6.capture || t8.once !== s6.once || t8.passive !== s6.passive, h3 = t8 !== A && (s6 === A || e16);
    e16 && this.element.removeEventListener(this.name, this, s6), h3 && this.element.addEventListener(this.name, this, t8), this._$AH = t8;
  }
  handleEvent(t8) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t8) : this._$AH.handleEvent(t8);
  }
};
var Z = class {
  constructor(t8, i10, s6) {
    this.element = t8, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s6;
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
var D = (t8, i10, s6) => {
  const e16 = s6?.renderBefore ?? i10;
  let h3 = e16._$litPart$;
  if (void 0 === h3) {
    const t9 = s6?.renderBefore ?? null;
    e16._$litPart$ = h3 = new k(i10.insertBefore(c3(), t9), t9, void 0, s6 ?? {});
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
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t8), this._$Do = D(r6, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/divider/divider.js
var t3 = i`:host{display:block}*{box-sizing:border-box}.swc-Divider{--_swc-divider-thickness: var(--swc-divider-thickness, 2px);inline-size:100%;block-size:var(--_swc-divider-thickness);background-color:var(--swc-divider-background-color, var(--swc-gray-200));border-radius:var(--_swc-divider-thickness)}:host([size=\"s\"]){--swc-divider-thickness: 1px}:host([size=\"l\"]){--swc-divider-thickness: 4px;--swc-divider-background-color: var(--swc-gray-800)}.swc-Divider:not(.swc-Divider--vertical){min-inline-size:min(100%,200px)}:host([vertical]){block-size:100%}.swc-Divider--vertical{align-self:flex-start;inline-size:var(--_swc-divider-thickness);block-size:100%;min-block-size:min(100%,200px)}.swc-Divider--staticWhite{--swc-divider-background-color: rgba(255, 255, 255, .14)}.swc-Divider--staticWhite:where(.swc-Divider--sizeL){--swc-divider-background-color: rgba(255, 255, 255, .85)}.swc-Divider--staticBlack{--swc-divider-background-color: rgba(0, 0, 0, .12)}.swc-Divider--staticBlack:where(.swc-Divider--sizeL){--swc-divider-background-color: rgba(0, 0, 0, .84)}@media(forced-colors:active){.swc-Divider{--swc-divider-background-color: CanvasText}}`;

// node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t8) => (...e16) => ({ _$litDirective$: t8, values: e16 });
var i5 = class {
  constructor(t8) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t8, e16, i10) {
    this._$Ct = t8, this._$AM = e16, this._$Ci = i10;
  }
  _$AS(t8, e16) {
    return this.update(t8, e16);
  }
  update(t8, e16) {
    return this.render(...e16);
  }
};

// node_modules/lit-html/directives/class-map.js
var e5 = e4(class extends i5 {
  constructor(t8) {
    if (super(t8), t8.type !== t4.ATTRIBUTE || "class" !== t8.name || t8.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t8) {
    return " " + Object.keys(t8).filter((s6) => t8[s6]).join(" ") + " ";
  }
  update(s6, [i10]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s6.strings && (this.nt = new Set(s6.strings.join(" ").split(/\s/).filter((t8) => "" !== t8)));
      for (const t8 in i10) i10[t8] && !this.nt?.has(t8) && this.st.add(t8);
      return this.render(i10);
    }
    const r6 = s6.element.classList;
    for (const t8 of this.st) t8 in i10 || (r6.remove(t8), this.st.delete(t8));
    for (const t8 in i10) {
      const s7 = !!i10[t8];
      s7 === this.st.has(t8) || this.nt?.has(t8) || (s7 ? (r6.add(t8), this.st.add(t8)) : (r6.remove(t8), this.st.delete(t8)));
    }
    return E;
  }
});

// deps/swc/swc-dist/core/utils/get-active-element.js
function e6(e16 = document) {
  var t8;
  let n9 = e16.activeElement;
  for (; !(n9 == null || (t8 = n9.shadowRoot) == null) && t8.activeElement; ) n9 = n9.shadowRoot.activeElement;
  return n9;
}

// deps/swc/swc-dist/core/utils/capitalize.js
function e7(e16) {
  return typeof e16 == "string" ? e16.charAt(0).toUpperCase() + e16.slice(1) : "";
}

// deps/swc/swc-dist/core/utils/focusable-selectors.js
var e8 = [
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
var t5 = e8.split(",").map((e16) => e16 + ':not([tabindex="-1"])').join(",");

// deps/swc/swc-dist/core/components/divider/Divider.types.js
var e10 = [
  "s",
  "m",
  "l"
];
var t6 = ["white", "black"];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e11(e16, t8, n9, r6) {
  var i10 = arguments.length, a6 = i10 < 3 ? t8 : r6 === null ? r6 = Object.getOwnPropertyDescriptor(t8, n9) : r6, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e16, t8, n9, r6);
  else for (var s6 = e16.length - 1; s6 >= 0; s6--) (o11 = e16[s6]) && (a6 = (i10 < 3 ? o11(a6) : i10 > 3 ? o11(t8, n9, a6) : o11(t8, n9)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t8, n9, a6), a6;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t8 = o5, e16, r6) => {
  const { kind: n9, metadata: i10 } = r6;
  let s6 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s6 && globalThis.litPropertyMetadata.set(i10, s6 = /* @__PURE__ */ new Map()), "setter" === n9 && ((t8 = Object.create(t8)).wrapped = true), s6.set(r6.name, t8), "accessor" === n9) {
    const { name: o11 } = r6;
    return { set(r7) {
      const n10 = e16.get.call(this);
      e16.set.call(this, r7), this.requestUpdate(o11, n10, t8, true, r7);
    }, init(e17) {
      return void 0 !== e17 && this.C(o11, void 0, t8, e17), e17;
    } };
  }
  if ("setter" === n9) {
    const { name: o11 } = r6;
    return function(r7) {
      const n10 = this[o11];
      e16.call(this, r7), this.requestUpdate(o11, n10, t8, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n9);
};
function n4(t8) {
  return (e16, o11) => "object" == typeof o11 ? r4(t8, e16, o11) : ((t9, e17, o12) => {
    const r6 = e17.hasOwnProperty(o12);
    return e17.constructor.createProperty(o12, t9), r6 ? Object.getOwnPropertyDescriptor(e17, o12) : void 0;
  })(t8, e16, o11);
}

// deps/swc/swc-dist/core/element/define-element.js
function e13(e16, t8) {
  window.__swc && window.__swc.DEBUG && customElements.get(e16) && window.__swc.warn(void 0, `Attempted to redefine <${e16}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e16, t8);
}

// deps/swc/swc-dist/core/element/version.js
var e14 = "0.1.0";
var t7 = "0.1.0";

// deps/swc/swc-dist/core/element/spectrum-element.js
var i6;
function a3(t8) {
  class n9 extends t8 {
    hasVisibleFocusInTree() {
      var t9;
      let n10 = e6(this.getRootNode());
      return (t9 = n10 == null ? void 0 : n10.matches(":focus-visible")) == null ? false : t9;
    }
  }
  return n9;
}
var o6 = class extends a3(i4) {
  get dir() {
    var e16;
    return (e16 = getComputedStyle(this).direction) == null ? "ltr" : e16;
  }
};
if (i6 = o6, i6.VERSION = e14, i6.CORE_VERSION = t7, true) {
  let e16 = {
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
    ignoreWarningLocalNames: { ...((s6 = window.__swc) == null ? void 0 : s6.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e16,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t8,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e17, t9, n9, { type: r6 = "api", level: i10 = "default", issues: a6 } = {}) => {
      let { localName: o11 = "base" } = e17 || {}, s7 = `${o11}:${r6}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s7) || window.__swc.ignoreWarningLocalNames[o11] || window.__swc.ignoreWarningTypes[r6] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s7);
      let c5 = "";
      a6 && a6.length && (a6.unshift(""), c5 = a6.join("\n    - ") + "\n");
      let l4 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e17 ? "\nInspect this issue in the follow element:" : "", d4 = (e17 ? "\n\n" : "\n") + n9 + "\n", f3 = [];
      f3.push(l4 + t9 + "\n" + c5 + u3), e17 && f3.push(e17), f3.push(d4, { data: {
        localName: o11,
        type: r6,
        level: i10
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s6;
var c4;
var l3;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r5 = [
  "s",
  "m",
  "l",
  "xl"
];
function i8(n9, { validSizes: i10 = [...r5], noDefaultSize: a6, defaultSize: o11 = "m" } = {}) {
  var s6;
  class c4 extends n9 {
    constructor(...e16) {
      super(...e16), this._size = o11;
    }
    get size() {
      return this._size || o11;
    }
    set size(e16) {
      let t8 = a6 ? null : o11, n10 = e16 && e16.toLocaleLowerCase(), r6 = this.constructor.VALID_SIZES.includes(n10) ? n10 : t8;
      if (r6 && this.setAttribute("size", r6), this._size === r6) return;
      let i11 = this._size;
      this._size = r6, this.requestUpdate("size", i11);
    }
    update(e16) {
      !this.hasAttribute("size") && !a6 && this.setAttribute("size", this.size), super.update(e16);
    }
  }
  return s6 = c4, s6.VALID_SIZES = i10, e11([n4({ type: String })], c4.prototype, "size", null), c4;
}

// deps/swc/swc-dist/core/components/divider/Divider.base.js
var o10;
var s5 = class extends i8(o6, { validSizes: e10 }) {
  constructor(...e16) {
    super(...e16), this.vertical = false;
  }
  update(e16) {
    var t8;
    if ((t8 = window.__swc) != null && t8.DEBUG) {
      let e17 = this.constructor;
      this.staticColor !== void 0 && !e17.STATIC_COLORS.includes(this.staticColor) && window.__swc.warn(this, `<${this.localName}> element expects the "static-color" attribute to be one of the following:`, "https://opensource.adobe.com/spectrum-web-components/components/divider/", { issues: [...e17.STATIC_COLORS] });
    }
    super.update(e16);
  }
  firstUpdated(e16) {
    super.firstUpdated(e16), this.setAttribute("role", "separator");
  }
  updated(e16) {
    super.updated(e16), e16.has("vertical") && (this.vertical ? this.setAttribute("aria-orientation", "vertical") : this.removeAttribute("aria-orientation"));
  }
};
o10 = s5, o10.STATIC_COLORS = t6, e11([n4({
  type: Boolean,
  reflect: true
})], s5.prototype, "vertical", void 0), e11([n4({
  type: String,
  reflect: true,
  attribute: "static-color"
})], s5.prototype, "staticColor", void 0);

// deps/swc/swc-dist/components/divider/Divider2.js
var a5 = class extends s5 {
  static get styles() {
    return [t3];
  }
  render() {
    var e16;
    return b2`
      <div
        class=${e5({
      "swc-Divider": true,
      [`swc-Divider--size${(e16 = this.size) == null ? void 0 : e16.toUpperCase()}`]: this.size != null,
      [`swc-Divider--static${e7(this.staticColor)}`]: this.staticColor != null,
      "swc-Divider--vertical": this.vertical
    })}
      ></div>
    `;
  }
};

// deps/swc/swc-dist/components/divider/swc-divider.js
e13("swc-divider", a5);
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
lit-html/directive.js:
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

lit-html/directives/class-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
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
