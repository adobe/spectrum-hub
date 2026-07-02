// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t7, e14, o10) {
    if (this._$cssResult$ = true, o10 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t7, this.t = e14;
  }
  get styleSheet() {
    let t7 = this.o;
    const s5 = this.t;
    if (e && void 0 === t7) {
      const e14 = void 0 !== s5 && 1 === s5.length;
      e14 && (t7 = o.get(s5)), void 0 === t7 && ((this.o = t7 = new CSSStyleSheet()).replaceSync(this.cssText), e14 && o.set(s5, t7));
    }
    return t7;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t7) => new n("string" == typeof t7 ? t7 : t7 + "", void 0, s);
var i = (t7, ...e14) => {
  const o10 = 1 === t7.length ? t7[0] : e14.reduce((e15, s5, o11) => e15 + ((t8) => {
    if (true === t8._$cssResult$) return t8.cssText;
    if ("number" == typeof t8) return t8;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t8 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t7[o11 + 1], t7[0]);
  return new n(o10, t7, s);
};
var S = (s5, o10) => {
  if (e) s5.adoptedStyleSheets = o10.map((t7) => t7 instanceof CSSStyleSheet ? t7 : t7.styleSheet);
  else for (const e14 of o10) {
    const o11 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o11.setAttribute("nonce", n10), o11.textContent = e14.cssText, s5.appendChild(o11);
  }
};
var c = e ? (t7) => t7 : (t7) => t7 instanceof CSSStyleSheet ? ((t8) => {
  let e14 = "";
  for (const s5 of t8.cssRules) e14 += s5.cssText;
  return r(e14);
})(t7) : t7;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t7, s5) => t7;
var u = { toAttribute(t7, s5) {
  switch (s5) {
    case Boolean:
      t7 = t7 ? l : null;
      break;
    case Object:
    case Array:
      t7 = null == t7 ? t7 : JSON.stringify(t7);
  }
  return t7;
}, fromAttribute(t7, s5) {
  let i10 = t7;
  switch (s5) {
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
var f = (t7, s5) => !i2(t7, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t7) {
    this._$Ei(), (this.l ??= []).push(t7);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t7, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t7) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t7, s5), !s5.noAccessor) {
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t7, i10, s5);
      void 0 !== h3 && e2(this.prototype, t7, h3);
    }
  }
  static getPropertyDescriptor(t7, s5, i10) {
    const { get: e14, set: r7 } = h(this.prototype, t7) ?? { get() {
      return this[s5];
    }, set(t8) {
      this[s5] = t8;
    } };
    return { get: e14, set(s6) {
      const h3 = e14?.call(this);
      r7?.call(this, s6), this.requestUpdate(t7, h3, i10);
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
      const t8 = this.properties, s5 = [...r2(t8), ...o2(t8)];
      for (const i10 of s5) this.createProperty(i10, t8[i10]);
    }
    const t7 = this[Symbol.metadata];
    if (null !== t7) {
      const s5 = litPropertyMetadata.get(t7);
      if (void 0 !== s5) for (const [t8, i10] of s5) this.elementProperties.set(t8, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t8, s5] of this.elementProperties) {
      const i10 = this._$Eu(t8, s5);
      void 0 !== i10 && this._$Eh.set(i10, t8);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i10 = [];
    if (Array.isArray(s5)) {
      const e14 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e14) i10.unshift(c(s6));
    } else void 0 !== s5 && i10.push(c(s5));
    return i10;
  }
  static _$Eu(t7, s5) {
    const i10 = s5.attribute;
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
    const t7 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i10 of s5.keys()) this.hasOwnProperty(i10) && (t7.set(i10, this[i10]), delete this[i10]);
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
  attributeChangedCallback(t7, s5, i10) {
    this._$AK(t7, i10);
  }
  _$ET(t7, s5) {
    const i10 = this.constructor.elementProperties.get(t7), e14 = this.constructor._$Eu(t7, i10);
    if (void 0 !== e14 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s5, i10.type);
      this._$Em = t7, null == h3 ? this.removeAttribute(e14) : this.setAttribute(e14, h3), this._$Em = null;
    }
  }
  _$AK(t7, s5) {
    const i10 = this.constructor, e14 = i10._$Eh.get(t7);
    if (void 0 !== e14 && this._$Em !== e14) {
      const t8 = i10.getPropertyOptions(e14), h3 = "function" == typeof t8.converter ? { fromAttribute: t8.converter } : void 0 !== t8.converter?.fromAttribute ? t8.converter : u;
      this._$Em = e14;
      const r7 = h3.fromAttribute(s5, t8.type);
      this[e14] = r7 ?? this._$Ej?.get(e14) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t7, s5, i10, e14 = false, h3) {
    if (void 0 !== t7) {
      const r7 = this.constructor;
      if (false === e14 && (h3 = this[t7]), i10 ??= r7.getPropertyOptions(t7), !((i10.hasChanged ?? f)(h3, s5) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t7) && !this.hasAttribute(r7._$Eu(t7, i10)))) return;
      this.C(t7, s5, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t7, s5, { useDefault: i10, reflect: e14, wrapped: h3 }, r7) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t7) && (this._$Ej.set(t7, r7 ?? s5 ?? this[t7]), true !== h3 || void 0 !== r7) || (this._$AL.has(t7) || (this.hasUpdated || i10 || (s5 = void 0), this._$AL.set(t7, s5)), true === e14 && this._$Em !== t7 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t7));
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
        for (const [t9, s6] of this._$Ep) this[t9] = s6;
        this._$Ep = void 0;
      }
      const t8 = this.constructor.elementProperties;
      if (t8.size > 0) for (const [s6, i10] of t8) {
        const { wrapped: t9 } = i10, e14 = this[s6];
        true !== t9 || this._$AL.has(s6) || void 0 === e14 || this.C(s6, void 0, i10, e14);
      }
    }
    let t7 = false;
    const s5 = this._$AL;
    try {
      t7 = this.shouldUpdate(s5), t7 ? (this.willUpdate(s5), this._$EO?.forEach((t8) => t8.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t7 = false, this._$EM(), s6;
    }
    t7 && this._$AE(s5);
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
var x = (t7) => (i10, ...s5) => ({ _$litType$: t7, strings: i10, values: s5 });
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
  const s5 = t7.length - 1, e14 = [];
  let n10, l4 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c4 = v;
  for (let i11 = 0; i11 < s5; i11++) {
    const s6 = t7[i11];
    let a6, u4, d4 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u4 = c4.exec(s6), null !== u4); ) f3 = c4.lastIndex, c4 === v ? "!--" === u4[1] ? c4 = _ : void 0 !== u4[1] ? c4 = m : void 0 !== u4[2] ? (y2.test(u4[2]) && (n10 = RegExp("</" + u4[2], "g")), c4 = p2) : void 0 !== u4[3] && (c4 = p2) : c4 === p2 ? ">" === u4[0] ? (c4 = n10 ?? v, d4 = -1) : void 0 === u4[1] ? d4 = -2 : (d4 = c4.lastIndex - u4[2].length, a6 = u4[1], c4 = void 0 === u4[3] ? p2 : '"' === u4[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n10 = void 0);
    const x2 = c4 === p2 && t7[i11 + 1].startsWith("/>") ? " " : "";
    l4 += c4 === v ? s6 + r3 : d4 >= 0 ? (e14.push(a6), s6.slice(0, d4) + h2 + s6.slice(d4) + o3 + x2) : s6 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t7, l4 + (t7[s5] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e14];
};
var S2 = class _S {
  constructor({ strings: t7, _$litType$: i10 }, e14) {
    let r7;
    this.parts = [];
    let l4 = 0, a6 = 0;
    const u4 = t7.length - 1, d4 = this.parts, [f3, v2] = N(t7, i10);
    if (this.el = _S.createElement(f3, e14), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t8 = this.el.content.firstChild;
      t8.replaceWith(...t8.childNodes);
    }
    for (; null !== (r7 = P.nextNode()) && d4.length < u4; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t8 of r7.getAttributeNames()) if (t8.endsWith(h2)) {
          const i11 = v2[a6++], s5 = r7.getAttribute(t8).split(o3), e15 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l4, name: e15[2], strings: s5, ctor: "." === e15[1] ? I : "?" === e15[1] ? L : "@" === e15[1] ? z : H }), r7.removeAttribute(t8);
        } else t8.startsWith(o3) && (d4.push({ type: 6, index: l4 }), r7.removeAttribute(t8));
        if (y2.test(r7.tagName)) {
          const t8 = r7.textContent.split(o3), i11 = t8.length - 1;
          if (i11 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i11; s5++) r7.append(t8[s5], c3()), P.nextNode(), d4.push({ type: 2, index: ++l4 });
            r7.append(t8[i11], c3());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === n3) d4.push({ type: 2, index: l4 });
      else {
        let t8 = -1;
        for (; -1 !== (t8 = r7.data.indexOf(o3, t8 + 1)); ) d4.push({ type: 7, index: l4 }), t8 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t7, i10) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t7, s5;
  }
};
function M(t7, i10, s5 = t7, e14) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e14 ? s5._$Co?.[e14] : s5._$Cl;
  const o10 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o10 && (h3?._$AO?.(false), void 0 === o10 ? h3 = void 0 : (h3 = new o10(t7), h3._$AT(t7, s5, e14)), void 0 !== e14 ? (s5._$Co ??= [])[e14] = h3 : s5._$Cl = h3), void 0 !== h3 && (i10 = M(t7, h3._$AS(t7, i10.values), h3, e14)), i10;
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
    const { el: { content: i10 }, parts: s5 } = this._$AD, e14 = (t7?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e14;
    let h3 = P.nextNode(), o10 = 0, n10 = 0, r7 = s5[0];
    for (; void 0 !== r7; ) {
      if (o10 === r7.index) {
        let i11;
        2 === r7.type ? i11 = new k(h3, h3.nextSibling, this, t7) : 1 === r7.type ? i11 = new r7.ctor(h3, r7.name, r7.strings, this, t7) : 6 === r7.type && (i11 = new Z(h3, this, t7)), this._$AV.push(i11), r7 = s5[++n10];
      }
      o10 !== r7?.index && (h3 = P.nextNode(), o10++);
    }
    return P.currentNode = l2, e14;
  }
  p(t7) {
    let i10 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t7, s5, i10), i10 += s5.strings.length - 2) : s5._$AI(t7[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t7, i10, s5, e14) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t7, this._$AB = i10, this._$AM = s5, this.options = e14, this._$Cv = e14?.isConnected ?? true;
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
    const { values: i10, _$litType$: s5 } = t7, e14 = "number" == typeof s5 ? this._$AC(t7) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e14) this._$AH.p(i10);
    else {
      const t8 = new R(e14, this), s6 = t8.u(this.options);
      t8.p(i10), this.T(s6), this._$AH = t8;
    }
  }
  _$AC(t7) {
    let i10 = C.get(t7.strings);
    return void 0 === i10 && C.set(t7.strings, i10 = new S2(t7)), i10;
  }
  k(t7) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s5, e14 = 0;
    for (const h3 of t7) e14 === i10.length ? i10.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i10[e14], s5._$AI(h3), e14++;
    e14 < i10.length && (this._$AR(s5 && s5._$AB.nextSibling, e14), i10.length = e14);
  }
  _$AR(t7 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t7 !== this._$AB; ) {
      const s6 = i3(t7).nextSibling;
      i3(t7).remove(), t7 = s6;
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
  constructor(t7, i10, s5, e14, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t7, this.name = i10, this._$AM = e14, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t7, i10 = this, s5, e14) {
    const h3 = this.strings;
    let o10 = false;
    if (void 0 === h3) t7 = M(this, t7, i10, 0), o10 = !a2(t7) || t7 !== this._$AH && t7 !== E, o10 && (this._$AH = t7);
    else {
      const e15 = t7;
      let n10, r7;
      for (t7 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r7 = M(this, e15[s5 + n10], i10, n10), r7 === E && (r7 = this._$AH[n10]), o10 ||= !a2(r7) || r7 !== this._$AH[n10], r7 === A ? t7 = A : t7 !== A && (t7 += (r7 ?? "") + h3[n10 + 1]), this._$AH[n10] = r7;
    }
    o10 && !e14 && this.j(t7);
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
  constructor(t7, i10, s5, e14, h3) {
    super(t7, i10, s5, e14, h3), this.type = 5;
  }
  _$AI(t7, i10 = this) {
    if ((t7 = M(this, t7, i10, 0) ?? A) === E) return;
    const s5 = this._$AH, e14 = t7 === A && s5 !== A || t7.capture !== s5.capture || t7.once !== s5.once || t7.passive !== s5.passive, h3 = t7 !== A && (s5 === A || e14);
    e14 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t7), this._$AH = t7;
  }
  handleEvent(t7) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t7) : this._$AH.handleEvent(t7);
  }
};
var Z = class {
  constructor(t7, i10, s5) {
    this.element = t7, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s5;
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
var D = (t7, i10, s5) => {
  const e14 = s5?.renderBefore ?? i10;
  let h3 = e14._$litPart$;
  if (void 0 === h3) {
    const t8 = s5?.renderBefore ?? null;
    e14._$litPart$ = h3 = new k(i10.insertBefore(c3(), t8), t8, void 0, s5 ?? {});
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
    const r7 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t7), this._$Do = D(r7, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/status-light/status-light.js
var t3 = i`:host{display:inline-block;align-self:start;justify-self:start;place-self:start;vertical-align:middle}*,*:before{box-sizing:border-box}.swc-StatusLight{--_swc-status-light-text-to-visual: var(--swc-status-light-text-to-visual, 6px);--_swc-status-light-line-height: var(--swc-status-light-line-height, var(--swc-line-height-font-size-100));display:flex;gap:var(--_swc-status-light-text-to-visual);align-items:flex-start;font-size:var(--swc-status-light-font-size, var(--swc-font-size-100));font-style:normal;font-weight:400;line-height:var(--_swc-status-light-line-height);color:var(--swc-status-light-content-color, var(--swc-gray-800));&:lang(ja),&:lang(zh),&:lang(ko){line-height:1.5}&:before{--_swc-status-light-dot-size: var(--swc-status-light-dot-size, var(--swc-status-light-dot-size-medium));flex-grow:0;flex-shrink:0;inline-size:var(--_swc-status-light-dot-size);block-size:var(--_swc-status-light-dot-size);margin-block-start:calc((1lh - var(--_swc-status-light-dot-size)) / 2);background-color:var(--swc-status-light-dot-color, var(--swc-neutral-visual-color));border-radius:50%;content:\"\"}}:host([size=\"s\"]){--swc-status-light-text-to-visual: 4px;--swc-status-light-dot-size: var(--swc-status-light-dot-size-small);--swc-status-light-font-size: var(--swc-font-size-75);--swc-status-light-line-height: var(--swc-line-height-font-size-75)}:host([size=\"l\"]){--swc-status-light-text-to-visual: 6px;--swc-status-light-dot-size: var(--swc-status-light-dot-size-large);--swc-status-light-font-size: var(--swc-font-size-200);--swc-status-light-line-height: var(--swc-line-height-font-size-200)}:host([size=\"xl\"]){--swc-status-light-text-to-visual: 6px;--swc-status-light-dot-size: var(--swc-status-light-dot-size-extra-large);--swc-status-light-font-size: var(--swc-font-size-300);--swc-status-light-line-height: var(--swc-line-height-font-size-300)}:host([variant=\"info\"]){--swc-status-light-dot-color: var(--swc-informative-visual-color)}:host([variant=\"negative\"]){--swc-status-light-dot-color: var(--swc-negative-visual-color)}:host([variant=\"notice\"]){--swc-status-light-dot-color: var(--swc-notice-visual-color)}:host([variant=\"positive\"]){--swc-status-light-dot-color: var(--swc-positive-visual-color)}.swc-StatusLight--yellow{--swc-status-light-dot-color: var(--swc-yellow-visual-color)}.swc-StatusLight--chartreuse{--swc-status-light-dot-color: var(--swc-chartreuse-visual-color)}.swc-StatusLight--celery{--swc-status-light-dot-color: var(--swc-celery-visual-color)}.swc-StatusLight--seafoam{--swc-status-light-dot-color: var(--swc-seafoam-visual-color)}.swc-StatusLight--cyan{--swc-status-light-dot-color: var(--swc-cyan-visual-color)}.swc-StatusLight--indigo{--swc-status-light-dot-color: var(--swc-indigo-visual-color)}.swc-StatusLight--purple{--swc-status-light-dot-color: var(--swc-purple-visual-color)}.swc-StatusLight--fuchsia{--swc-status-light-dot-color: var(--swc-fuchsia-visual-color)}.swc-StatusLight--magenta{--swc-status-light-dot-color: var(--swc-magenta-visual-color)}.swc-StatusLight--pink{--swc-status-light-dot-color: var(--swc-pink-visual-color)}.swc-StatusLight--turquoise{--swc-status-light-dot-color: var(--swc-turquoise-visual-color)}.swc-StatusLight--cinnamon{--swc-status-light-dot-color: var(--swc-cinnamon-visual-color)}.swc-StatusLight--brown{--swc-status-light-dot-color: var(--swc-brown-visual-color)}.swc-StatusLight--silver{--swc-status-light-dot-color: var(--swc-silver-visual-color)}@media(forced-colors:active){.swc-StatusLight{--swc-status-light-content-color: CanvasText;forced-color-adjust:none;&:before{border:1px solid}}}`;

// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e4(e14, t7, n10, r7) {
  var i10 = arguments.length, a6 = i10 < 3 ? t7 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t7, n10) : r7, o10;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e14, t7, n10, r7);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o10 = e14[s5]) && (a6 = (i10 < 3 ? o10(a6) : i10 > 3 ? o10(t7, n10, a6) : o10(t7, n10)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t7, n10, a6), a6;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t7 = o5, e14, r7) => {
  const { kind: n10, metadata: i10 } = r7;
  let s5 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i10, s5 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t7 = Object.create(t7)).wrapped = true), s5.set(r7.name, t7), "accessor" === n10) {
    const { name: o10 } = r7;
    return { set(r8) {
      const n11 = e14.get.call(this);
      e14.set.call(this, r8), this.requestUpdate(o10, n11, t7, true, r8);
    }, init(e15) {
      return void 0 !== e15 && this.C(o10, void 0, t7, e15), e15;
    } };
  }
  if ("setter" === n10) {
    const { name: o10 } = r7;
    return function(r8) {
      const n11 = this[o10];
      e14.call(this, r8), this.requestUpdate(o10, n11, t7, true, r8);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t7) {
  return (e14, o10) => "object" == typeof o10 ? r4(t7, e14, o10) : ((t8, e15, o11) => {
    const r7 = e15.hasOwnProperty(o11);
    return e15.constructor.createProperty(o11, t8), r7 ? Object.getOwnPropertyDescriptor(e15, o11) : void 0;
  })(t7, e14, o10);
}

// node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e6 = (t7) => (...e14) => ({ _$litDirective$: t7, values: e14 });
var i5 = class {
  constructor(t7) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t7, e14, i10) {
    this._$Ct = t7, this._$AM = e14, this._$Ci = i10;
  }
  _$AS(t7, e14) {
    return this.update(t7, e14);
  }
  update(t7, e14) {
    return this.render(...e14);
  }
};

// node_modules/lit-html/directives/class-map.js
var e7 = e6(class extends i5 {
  constructor(t7) {
    if (super(t7), t7.type !== t4.ATTRIBUTE || "class" !== t7.name || t7.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t7) {
    return " " + Object.keys(t7).filter((s5) => t7[s5]).join(" ") + " ";
  }
  update(s5, [i10]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s5.strings && (this.nt = new Set(s5.strings.join(" ").split(/\s/).filter((t7) => "" !== t7)));
      for (const t7 in i10) i10[t7] && !this.nt?.has(t7) && this.st.add(t7);
      return this.render(i10);
    }
    const r7 = s5.element.classList;
    for (const t7 of this.st) t7 in i10 || (r7.remove(t7), this.st.delete(t7));
    for (const t7 in i10) {
      const s6 = !!i10[t7];
      s6 === this.st.has(t7) || this.nt?.has(t7) || (s6 ? (r7.add(t7), this.st.add(t7)) : (r7.remove(t7), this.st.delete(t7)));
    }
    return E;
  }
});

// deps/swc/swc-dist/core/components/status-light/StatusLight.types.js
var e8 = [
  "s",
  "m",
  "l",
  "xl"
];
var t5 = [
  "neutral",
  "info",
  "positive",
  "negative",
  "notice"
];
var n5 = [
  "fuchsia",
  "indigo",
  "magenta",
  "purple",
  "seafoam",
  "yellow",
  "chartreuse",
  "celery",
  "cyan",
  "pink",
  "turquoise",
  "brown",
  "cinnamon",
  "silver"
];
var r5 = [...t5, ...n5];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e9(e14, t7, n10, r7) {
  var i10 = arguments.length, a6 = i10 < 3 ? t7 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t7, n10) : r7, o10;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e14, t7, n10, r7);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o10 = e14[s5]) && (a6 = (i10 < 3 ? o10(a6) : i10 > 3 ? o10(t7, n10, a6) : o10(t7, n10)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t7, n10, a6), a6;
}

// deps/swc/swc-dist/core/element/define-element.js
function e10(e14, t7) {
  window.__swc && window.__swc.DEBUG && customElements.get(e14) && window.__swc.warn(void 0, `Attempted to redefine <${e14}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e14, t7);
}

// deps/swc/swc-dist/core/element/version.js
var e11 = "0.1.0";
var t6 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e12(e14 = document) {
  var t7;
  let n10 = e14.activeElement;
  for (; !(n10 == null || (t7 = n10.shadowRoot) == null) && t7.activeElement; ) n10 = n10.shadowRoot.activeElement;
  return n10;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i6;
function a3(t7) {
  class n10 extends t7 {
    hasVisibleFocusInTree() {
      var t8;
      let n11 = e12(this.getRootNode());
      return (t8 = n11 == null ? void 0 : n11.matches(":focus-visible")) == null ? false : t8;
    }
  }
  return n10;
}
var o6 = class extends a3(i4) {
  get dir() {
    var e14;
    return (e14 = getComputedStyle(this).direction) == null ? "ltr" : e14;
  }
};
if (i6 = o6, i6.VERSION = e11, i6.CORE_VERSION = t6, true) {
  let e14 = {
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
    ignoreWarningLocalNames: { ...((s5 = window.__swc) == null ? void 0 : s5.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e14,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t7,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e15, t8, n10, { type: r7 = "api", level: i10 = "default", issues: a6 } = {}) => {
      let { localName: o10 = "base" } = e15 || {}, s6 = `${o10}:${r7}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o10] || window.__swc.ignoreWarningTypes[r7] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s6);
      let c5 = "";
      a6 && a6.length && (a6.unshift(""), c5 = a6.join("\n    - ") + "\n");
      let l5 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u4 = e15 ? "\nInspect this issue in the follow element:" : "", d4 = (e15 ? "\n\n" : "\n") + n10 + "\n", f3 = [];
      f3.push(l5 + t8 + "\n" + c5 + u4), e15 && f3.push(e15), f3.push(d4, { data: {
        localName: o10,
        type: r7,
        level: i10
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c4;
var l4;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i8(n10, { validSizes: i10 = [...r6], noDefaultSize: a6, defaultSize: o10 = "m" } = {}) {
  var s5;
  class c4 extends n10 {
    constructor(...e14) {
      super(...e14), this._size = o10;
    }
    get size() {
      return this._size || o10;
    }
    set size(e14) {
      let t7 = a6 ? null : o10, n11 = e14 && e14.toLocaleLowerCase(), r7 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t7;
      if (r7 && this.setAttribute("size", r7), this._size === r7) return;
      let i11 = this._size;
      this._size = r7, this.requestUpdate("size", i11);
    }
    update(e14) {
      !this.hasAttribute("size") && !a6 && this.setAttribute("size", this.size), super.update(e14);
    }
  }
  return s5 = c4, s5.VALID_SIZES = i10, e9([n4({ type: String })], c4.prototype, "size", null), c4;
}

// deps/swc/swc-dist/core/components/status-light/StatusLight.base.js
var a5 = class extends i8(o6, {
  validSizes: e8,
  noDefaultSize: true
}) {
  constructor(...e14) {
    super(...e14), this.variant = "neutral";
  }
  updated(e14) {
    var t7;
    if (super.updated(e14), (t7 = window.__swc) != null && t7.DEBUG) {
      let e15 = this.constructor;
      this.variant === "accent" ? window.__swc.warn(this, `<${this.localName}> does not support the "accent" variant in Spectrum 2. Use "neutral" or "info" depending on intent.`, "https://spectrum-web-components.adobe.com/?path=/docs/status-light-migration-guide--docs", { level: "deprecation" }) : e15.VARIANTS.includes(this.variant) || window.__swc.warn(this, `<${this.localName}> element expects the "variant" attribute to be one of the following:`, "https://opensource.adobe.com/spectrum-web-components/components/status-light/#variants", { issues: [...e15.VARIANTS] }), this.hasAttribute("disabled") && window.__swc.warn(this, `<${this.localName}> does not support the "disabled" attribute. It was deprecated in Spectrum 1 and has been removed in Spectrum 2.`, "https://spectrum-web-components.adobe.com/?path=/docs/status-light-migration-guide--docs", { level: "deprecation" });
    }
  }
};
e9([n4({
  type: String,
  reflect: true
})], a5.prototype, "variant", void 0);

// deps/swc/swc-dist/components/status-light/StatusLight.js
var l3;
var u3 = class extends a5 {
  constructor(...e14) {
    super(...e14), this.variant = "neutral";
  }
  static get styles() {
    return [t3];
  }
  render() {
    var e14;
    return b2`
      <div
        class=${e7({
      "swc-StatusLight": true,
      [`swc-StatusLight--size${(e14 = this.size) == null ? void 0 : e14.toUpperCase()}`]: this.size != null,
      [`swc-StatusLight--${this.variant}`]: this.variant !== void 0
    })}
      >
        <slot></slot>
      </div>
    `;
  }
};
l3 = u3, l3.VARIANTS_COLOR = n5, l3.VARIANTS_SEMANTIC = t5, l3.VARIANTS = r5, e4([n4({
  type: String,
  reflect: true
})], u3.prototype, "variant", void 0);

// deps/swc/swc-dist/components/status-light/swc-status-light.js
e10("swc-status-light", u3);
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
lit-html/directive.js:
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

lit-html/directives/class-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
