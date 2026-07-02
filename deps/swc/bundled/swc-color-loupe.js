// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t7, e10, o8) {
    if (this._$cssResult$ = true, o8 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t7, this.t = e10;
  }
  get styleSheet() {
    let t7 = this.o;
    const s4 = this.t;
    if (e && void 0 === t7) {
      const e10 = void 0 !== s4 && 1 === s4.length;
      e10 && (t7 = o.get(s4)), void 0 === t7 && ((this.o = t7 = new CSSStyleSheet()).replaceSync(this.cssText), e10 && o.set(s4, t7));
    }
    return t7;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t7) => new n("string" == typeof t7 ? t7 : t7 + "", void 0, s);
var i = (t7, ...e10) => {
  const o8 = 1 === t7.length ? t7[0] : e10.reduce((e11, s4, o9) => e11 + ((t8) => {
    if (true === t8._$cssResult$) return t8.cssText;
    if ("number" == typeof t8) return t8;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t8 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t7[o9 + 1], t7[0]);
  return new n(o8, t7, s);
};
var S = (s4, o8) => {
  if (e) s4.adoptedStyleSheets = o8.map((t7) => t7 instanceof CSSStyleSheet ? t7 : t7.styleSheet);
  else for (const e10 of o8) {
    const o9 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o9.setAttribute("nonce", n6), o9.textContent = e10.cssText, s4.appendChild(o9);
  }
};
var c = e ? (t7) => t7 : (t7) => t7 instanceof CSSStyleSheet ? ((t8) => {
  let e10 = "";
  for (const s4 of t8.cssRules) e10 += s4.cssText;
  return r(e10);
})(t7) : t7;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t7, s4) => t7;
var u = { toAttribute(t7, s4) {
  switch (s4) {
    case Boolean:
      t7 = t7 ? l : null;
      break;
    case Object:
    case Array:
      t7 = null == t7 ? t7 : JSON.stringify(t7);
  }
  return t7;
}, fromAttribute(t7, s4) {
  let i8 = t7;
  switch (s4) {
    case Boolean:
      i8 = null !== t7;
      break;
    case Number:
      i8 = null === t7 ? null : Number(t7);
      break;
    case Object:
    case Array:
      try {
        i8 = JSON.parse(t7);
      } catch (t8) {
        i8 = null;
      }
  }
  return i8;
} };
var f = (t7, s4) => !i2(t7, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t7) {
    this._$Ei(), (this.l ??= []).push(t7);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t7, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t7) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t7, s4), !s4.noAccessor) {
      const i8 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t7, i8, s4);
      void 0 !== h3 && e2(this.prototype, t7, h3);
    }
  }
  static getPropertyDescriptor(t7, s4, i8) {
    const { get: e10, set: r6 } = h(this.prototype, t7) ?? { get() {
      return this[s4];
    }, set(t8) {
      this[s4] = t8;
    } };
    return { get: e10, set(s5) {
      const h3 = e10?.call(this);
      r6?.call(this, s5), this.requestUpdate(t7, h3, i8);
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
      const t8 = this.properties, s4 = [...r2(t8), ...o2(t8)];
      for (const i8 of s4) this.createProperty(i8, t8[i8]);
    }
    const t7 = this[Symbol.metadata];
    if (null !== t7) {
      const s4 = litPropertyMetadata.get(t7);
      if (void 0 !== s4) for (const [t8, i8] of s4) this.elementProperties.set(t8, i8);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t8, s4] of this.elementProperties) {
      const i8 = this._$Eu(t8, s4);
      void 0 !== i8 && this._$Eh.set(i8, t8);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i8 = [];
    if (Array.isArray(s4)) {
      const e10 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e10) i8.unshift(c(s5));
    } else void 0 !== s4 && i8.push(c(s4));
    return i8;
  }
  static _$Eu(t7, s4) {
    const i8 = s4.attribute;
    return false === i8 ? void 0 : "string" == typeof i8 ? i8 : "string" == typeof t7 ? t7.toLowerCase() : void 0;
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
    const t7 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i8 of s4.keys()) this.hasOwnProperty(i8) && (t7.set(i8, this[i8]), delete this[i8]);
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
  attributeChangedCallback(t7, s4, i8) {
    this._$AK(t7, i8);
  }
  _$ET(t7, s4) {
    const i8 = this.constructor.elementProperties.get(t7), e10 = this.constructor._$Eu(t7, i8);
    if (void 0 !== e10 && true === i8.reflect) {
      const h3 = (void 0 !== i8.converter?.toAttribute ? i8.converter : u).toAttribute(s4, i8.type);
      this._$Em = t7, null == h3 ? this.removeAttribute(e10) : this.setAttribute(e10, h3), this._$Em = null;
    }
  }
  _$AK(t7, s4) {
    const i8 = this.constructor, e10 = i8._$Eh.get(t7);
    if (void 0 !== e10 && this._$Em !== e10) {
      const t8 = i8.getPropertyOptions(e10), h3 = "function" == typeof t8.converter ? { fromAttribute: t8.converter } : void 0 !== t8.converter?.fromAttribute ? t8.converter : u;
      this._$Em = e10;
      const r6 = h3.fromAttribute(s4, t8.type);
      this[e10] = r6 ?? this._$Ej?.get(e10) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t7, s4, i8, e10 = false, h3) {
    if (void 0 !== t7) {
      const r6 = this.constructor;
      if (false === e10 && (h3 = this[t7]), i8 ??= r6.getPropertyOptions(t7), !((i8.hasChanged ?? f)(h3, s4) || i8.useDefault && i8.reflect && h3 === this._$Ej?.get(t7) && !this.hasAttribute(r6._$Eu(t7, i8)))) return;
      this.C(t7, s4, i8);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t7, s4, { useDefault: i8, reflect: e10, wrapped: h3 }, r6) {
    i8 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t7) && (this._$Ej.set(t7, r6 ?? s4 ?? this[t7]), true !== h3 || void 0 !== r6) || (this._$AL.has(t7) || (this.hasUpdated || i8 || (s4 = void 0), this._$AL.set(t7, s4)), true === e10 && this._$Em !== t7 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t7));
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
        for (const [t9, s5] of this._$Ep) this[t9] = s5;
        this._$Ep = void 0;
      }
      const t8 = this.constructor.elementProperties;
      if (t8.size > 0) for (const [s5, i8] of t8) {
        const { wrapped: t9 } = i8, e10 = this[s5];
        true !== t9 || this._$AL.has(s5) || void 0 === e10 || this.C(s5, void 0, i8, e10);
      }
    }
    let t7 = false;
    const s4 = this._$AL;
    try {
      t7 = this.shouldUpdate(s4), t7 ? (this.willUpdate(s4), this._$EO?.forEach((t8) => t8.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t7 = false, this._$EM(), s5;
    }
    t7 && this._$AE(s4);
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
var x = (t7) => (i8, ...s4) => ({ _$litType$: t7, strings: i8, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t7, i8) {
  if (!u2(t7) || !t7.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i8) : i8;
}
var N = (t7, i8) => {
  const s4 = t7.length - 1, e10 = [];
  let n6, l3 = 2 === i8 ? "<svg>" : 3 === i8 ? "<math>" : "", c4 = v;
  for (let i9 = 0; i9 < s4; i9++) {
    const s5 = t7[i9];
    let a5, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n6 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n6 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a5 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n6 = void 0);
    const x2 = c4 === p2 && t7[i9 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e10.push(a5), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i9 : x2);
  }
  return [V(t7, l3 + (t7[s4] || "<?>") + (2 === i8 ? "</svg>" : 3 === i8 ? "</math>" : "")), e10];
};
var S2 = class _S {
  constructor({ strings: t7, _$litType$: i8 }, e10) {
    let r6;
    this.parts = [];
    let l3 = 0, a5 = 0;
    const u3 = t7.length - 1, d3 = this.parts, [f3, v2] = N(t7, i8);
    if (this.el = _S.createElement(f3, e10), P.currentNode = this.el.content, 2 === i8 || 3 === i8) {
      const t8 = this.el.content.firstChild;
      t8.replaceWith(...t8.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t8 of r6.getAttributeNames()) if (t8.endsWith(h2)) {
          const i9 = v2[a5++], s4 = r6.getAttribute(t8).split(o3), e11 = /([.?@])?(.*)/.exec(i9);
          d3.push({ type: 1, index: l3, name: e11[2], strings: s4, ctor: "." === e11[1] ? I : "?" === e11[1] ? L : "@" === e11[1] ? z : H }), r6.removeAttribute(t8);
        } else t8.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t8));
        if (y2.test(r6.tagName)) {
          const t8 = r6.textContent.split(o3), i9 = t8.length - 1;
          if (i9 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i9; s4++) r6.append(t8[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t8[i9], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t8 = -1;
        for (; -1 !== (t8 = r6.data.indexOf(o3, t8 + 1)); ) d3.push({ type: 7, index: l3 }), t8 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t7, i8) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t7, s4;
  }
};
function M(t7, i8, s4 = t7, e10) {
  if (i8 === E) return i8;
  let h3 = void 0 !== e10 ? s4._$Co?.[e10] : s4._$Cl;
  const o8 = a2(i8) ? void 0 : i8._$litDirective$;
  return h3?.constructor !== o8 && (h3?._$AO?.(false), void 0 === o8 ? h3 = void 0 : (h3 = new o8(t7), h3._$AT(t7, s4, e10)), void 0 !== e10 ? (s4._$Co ??= [])[e10] = h3 : s4._$Cl = h3), void 0 !== h3 && (i8 = M(t7, h3._$AS(t7, i8.values), h3, e10)), i8;
}
var R = class {
  constructor(t7, i8) {
    this._$AV = [], this._$AN = void 0, this._$AD = t7, this._$AM = i8;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t7) {
    const { el: { content: i8 }, parts: s4 } = this._$AD, e10 = (t7?.creationScope ?? l2).importNode(i8, true);
    P.currentNode = e10;
    let h3 = P.nextNode(), o8 = 0, n6 = 0, r6 = s4[0];
    for (; void 0 !== r6; ) {
      if (o8 === r6.index) {
        let i9;
        2 === r6.type ? i9 = new k(h3, h3.nextSibling, this, t7) : 1 === r6.type ? i9 = new r6.ctor(h3, r6.name, r6.strings, this, t7) : 6 === r6.type && (i9 = new Z(h3, this, t7)), this._$AV.push(i9), r6 = s4[++n6];
      }
      o8 !== r6?.index && (h3 = P.nextNode(), o8++);
    }
    return P.currentNode = l2, e10;
  }
  p(t7) {
    let i8 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t7, s4, i8), i8 += s4.strings.length - 2) : s4._$AI(t7[i8])), i8++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t7, i8, s4, e10) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t7, this._$AB = i8, this._$AM = s4, this.options = e10, this._$Cv = e10?.isConnected ?? true;
  }
  get parentNode() {
    let t7 = this._$AA.parentNode;
    const i8 = this._$AM;
    return void 0 !== i8 && 11 === t7?.nodeType && (t7 = i8.parentNode), t7;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t7, i8 = this) {
    t7 = M(this, t7, i8), a2(t7) ? t7 === A || null == t7 || "" === t7 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t7 !== this._$AH && t7 !== E && this._(t7) : void 0 !== t7._$litType$ ? this.$(t7) : void 0 !== t7.nodeType ? this.T(t7) : d2(t7) ? this.k(t7) : this._(t7);
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
    const { values: i8, _$litType$: s4 } = t7, e10 = "number" == typeof s4 ? this._$AC(t7) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e10) this._$AH.p(i8);
    else {
      const t8 = new R(e10, this), s5 = t8.u(this.options);
      t8.p(i8), this.T(s5), this._$AH = t8;
    }
  }
  _$AC(t7) {
    let i8 = C.get(t7.strings);
    return void 0 === i8 && C.set(t7.strings, i8 = new S2(t7)), i8;
  }
  k(t7) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i8 = this._$AH;
    let s4, e10 = 0;
    for (const h3 of t7) e10 === i8.length ? i8.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i8[e10], s4._$AI(h3), e10++;
    e10 < i8.length && (this._$AR(s4 && s4._$AB.nextSibling, e10), i8.length = e10);
  }
  _$AR(t7 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t7 !== this._$AB; ) {
      const s5 = i3(t7).nextSibling;
      i3(t7).remove(), t7 = s5;
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
  constructor(t7, i8, s4, e10, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t7, this.name = i8, this._$AM = e10, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t7, i8 = this, s4, e10) {
    const h3 = this.strings;
    let o8 = false;
    if (void 0 === h3) t7 = M(this, t7, i8, 0), o8 = !a2(t7) || t7 !== this._$AH && t7 !== E, o8 && (this._$AH = t7);
    else {
      const e11 = t7;
      let n6, r6;
      for (t7 = h3[0], n6 = 0; n6 < h3.length - 1; n6++) r6 = M(this, e11[s4 + n6], i8, n6), r6 === E && (r6 = this._$AH[n6]), o8 ||= !a2(r6) || r6 !== this._$AH[n6], r6 === A ? t7 = A : t7 !== A && (t7 += (r6 ?? "") + h3[n6 + 1]), this._$AH[n6] = r6;
    }
    o8 && !e10 && this.j(t7);
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
  constructor(t7, i8, s4, e10, h3) {
    super(t7, i8, s4, e10, h3), this.type = 5;
  }
  _$AI(t7, i8 = this) {
    if ((t7 = M(this, t7, i8, 0) ?? A) === E) return;
    const s4 = this._$AH, e10 = t7 === A && s4 !== A || t7.capture !== s4.capture || t7.once !== s4.once || t7.passive !== s4.passive, h3 = t7 !== A && (s4 === A || e10);
    e10 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t7), this._$AH = t7;
  }
  handleEvent(t7) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t7) : this._$AH.handleEvent(t7);
  }
};
var Z = class {
  constructor(t7, i8, s4) {
    this.element = t7, this.type = 6, this._$AN = void 0, this._$AM = i8, this.options = s4;
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
var D = (t7, i8, s4) => {
  const e10 = s4?.renderBefore ?? i8;
  let h3 = e10._$litPart$;
  if (void 0 === h3) {
    const t8 = s4?.renderBefore ?? null;
    e10._$litPart$ = h3 = new k(i8.insertBefore(c3(), t8), t8, void 0, s4 ?? {});
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
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t7), this._$Do = D(r6, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/stylesheets/_lit-styles/opacity-checkerboard.js
var t3 = i`.swc-OpacityCheckerboard{--_swc-opacity-checkerboard-square-size: var(--swc-opacity-checkerboard-square-size-medium);background:repeating-conic-gradient(light-dark(var(--swc-opacity-checkerboard-square-dark-light),var(--swc-opacity-checkerboard-square-dark-dark)) 0%,light-dark(var(--swc-opacity-checkerboard-square-dark-light),var(--swc-opacity-checkerboard-square-dark-dark)) 25%,var(--swc-white) 0%,var(--swc-white) 50%) 0 0 / calc(var(--_swc-opacity-checkerboard-square-size) * 2) calc(var(--_swc-opacity-checkerboard-square-size) * 2)}@supports (background: repeating-conic-gradient(from 0deg,red 0deg,red 0deg 1deg,red 2deg)) and (color: light-dark(red,red)){.swc-OpacityCheckerboard{background:repeating-conic-gradient(light-dark(var(--swc-opacity-checkerboard-square-dark-light),var(--swc-opacity-checkerboard-square-dark-dark)) 0% 25%,var(--swc-white) 0% 50%) 0 0 / calc(var(--_swc-opacity-checkerboard-square-size) * 2) calc(var(--_swc-opacity-checkerboard-square-size) * 2)}}.swc-OpacityCheckerboard--sizeS{--_swc-opacity-checkerboard-square-size: var(--swc-opacity-checkerboard-square-size-small)}@media(forced-colors:active){.swc-OpacityCheckerboard{forced-color-adjust:none}}`;

// deps/swc/swc-dist/components/color-loupe/color-loupe.js
var t4 = i`:host{--_swc-color-loupe-width: 48px;display:block;position:absolute;inset-block-end:calc((var(--swc-color-handle-size) - 1px) + 12px);inset-inline-end:calc(50% - (var(--_swc-color-loupe-width) / 2));inline-size:var(--_swc-color-loupe-width);block-size:64px}*{box-sizing:border-box}.swc-ColorLoupe{position:relative;inline-size:100%;block-size:100%;pointer-events:none;opacity:0;filter:drop-shadow(0px 2px 8px var(--swc-drop-shadow-color-200));transform:translateY(8px);transform-origin:bottom center;transition:transform .1s ease-in-out,opacity 125ms ease-in-out}.swc-ColorLoupe-layer{position:absolute;inset-block-start:2px;inset-inline-start:2px;inline-size:100%;block-size:100%}.swc-ColorLoupe-colorFill{background:var(--swc-color-loupe-picked-color)}.swc-ColorLoupe-svg{position:absolute;inline-size:inherit;block-size:inherit}.swc-ColorLoupe-innerBorder{fill:none;stroke:var(--swc-transparent-black-200);stroke-width:1px}.swc-ColorLoupe-outerBorder{--_swc-color-loupe-outer-border-color: var(--swc-white);fill:none;stroke:var(--_swc-color-loupe-outer-border-color);stroke-width:4px}.swc-ColorLoupe--clipped{clip-path:path(\"M 22 60 C 18.2 56 14.6 51.7 11.3 47.2 C 8.3 43.3 5.7 39.1 3.5 34.7 C 1.2 30 0 25.9 0 22.4 C 0 17.2 1.8 12.2 5 8.2 C 8.2 4.2 12.7 1.5 17.6 0.4 C 22.6 -0.6 27.8 0.2 32.3 2.6 C 36.8 5 40.3 8.9 42.3 13.7 C 43.4 16.4 44 19.4 44 22.4 C 44 25.9 42.8 30 40.5 34.7 C 38.3 39.1 35.7 43.3 32.7 47.3 C 29.4 51.7 25.8 56 22 60 Z\")}:host(:dir(rtl)){inset-inline-end:calc(50% - (var(--_swc-color-loupe-width) / 2) - 1px)}:host([open]) .swc-ColorLoupe{opacity:1;transform:translate(0)}@media(forced-colors:active){.swc-ColorLoupe-colorFill{forced-color-adjust:none}.swc-ColorLoupe-outerBorder{--_swc-color-loupe-outer-border-color: CanvasText}}`;

// node_modules/lit-html/directive.js
var t5 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t7) => (...e10) => ({ _$litDirective$: t7, values: e10 });
var i5 = class {
  constructor(t7) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t7, e10, i8) {
    this._$Ct = t7, this._$AM = e10, this._$Ci = i8;
  }
  _$AS(t7, e10) {
    return this.update(t7, e10);
  }
  update(t7, e10) {
    return this.render(...e10);
  }
};

// node_modules/lit-html/directives/style-map.js
var n4 = "important";
var i6 = " !" + n4;
var o5 = e4(class extends i5 {
  constructor(t7) {
    if (super(t7), t7.type !== t5.ATTRIBUTE || "style" !== t7.name || t7.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t7) {
    return Object.keys(t7).reduce((e10, r6) => {
      const s4 = t7[r6];
      return null == s4 ? e10 : e10 + `${r6 = r6.includes("-") ? r6 : r6.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s4};`;
    }, "");
  }
  update(e10, [r6]) {
    const { style: s4 } = e10.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(r6)), this.render(r6);
    for (const t7 of this.ft) null == r6[t7] && (this.ft.delete(t7), t7.includes("-") ? s4.removeProperty(t7) : s4[t7] = null);
    for (const t7 in r6) {
      const e11 = r6[t7];
      if (null != e11) {
        this.ft.add(t7);
        const r7 = "string" == typeof e11 && e11.endsWith(i6);
        t7.includes("-") || r7 ? s4.setProperty(t7, r7 ? e11.slice(0, -11) : e11, r7 ? n4 : "") : s4[t7] = e11;
      }
    }
    return E;
  }
});

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e5(e10, t7, n6, r6) {
  var i8 = arguments.length, a5 = i8 < 3 ? t7 : r6 === null ? r6 = Object.getOwnPropertyDescriptor(t7, n6) : r6, o8;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e10, t7, n6, r6);
  else for (var s4 = e10.length - 1; s4 >= 0; s4--) (o8 = e10[s4]) && (a5 = (i8 < 3 ? o8(a5) : i8 > 3 ? o8(t7, n6, a5) : o8(t7, n6)) || a5);
  return i8 > 3 && a5 && Object.defineProperty(t7, n6, a5), a5;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o6 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t7 = o6, e10, r6) => {
  const { kind: n6, metadata: i8 } = r6;
  let s4 = globalThis.litPropertyMetadata.get(i8);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i8, s4 = /* @__PURE__ */ new Map()), "setter" === n6 && ((t7 = Object.create(t7)).wrapped = true), s4.set(r6.name, t7), "accessor" === n6) {
    const { name: o8 } = r6;
    return { set(r7) {
      const n7 = e10.get.call(this);
      e10.set.call(this, r7), this.requestUpdate(o8, n7, t7, true, r7);
    }, init(e11) {
      return void 0 !== e11 && this.C(o8, void 0, t7, e11), e11;
    } };
  }
  if ("setter" === n6) {
    const { name: o8 } = r6;
    return function(r7) {
      const n7 = this[o8];
      e10.call(this, r7), this.requestUpdate(o8, n7, t7, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n6);
};
function n5(t7) {
  return (e10, o8) => "object" == typeof o8 ? r4(t7, e10, o8) : ((t8, e11, o9) => {
    const r6 = e11.hasOwnProperty(o9);
    return e11.constructor.createProperty(o9, t8), r6 ? Object.getOwnPropertyDescriptor(e11, o9) : void 0;
  })(t7, e10, o8);
}

// deps/swc/swc-dist/core/element/define-element.js
function e7(e10, t7) {
  window.__swc && window.__swc.DEBUG && customElements.get(e10) && window.__swc.warn(void 0, `Attempted to redefine <${e10}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e10, t7);
}

// deps/swc/swc-dist/core/element/version.js
var e8 = "0.1.0";
var t6 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e9(e10 = document) {
  var t7;
  let n6 = e10.activeElement;
  for (; !(n6 == null || (t7 = n6.shadowRoot) == null) && t7.activeElement; ) n6 = n6.shadowRoot.activeElement;
  return n6;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i7;
function a3(t7) {
  class n6 extends t7 {
    hasVisibleFocusInTree() {
      var t8;
      let n7 = e9(this.getRootNode());
      return (t8 = n7 == null ? void 0 : n7.matches(":focus-visible")) == null ? false : t8;
    }
  }
  return n6;
}
var o7 = class extends a3(i4) {
  get dir() {
    var e10;
    return (e10 = getComputedStyle(this).direction) == null ? "ltr" : e10;
  }
};
if (i7 = o7, i7.VERSION = e8, i7.CORE_VERSION = t6, true) {
  let e10 = {
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
    ignoreWarningLocalNames: { ...((s4 = window.__swc) == null ? void 0 : s4.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e10,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t7,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e11, t8, n6, { type: r6 = "api", level: i8 = "default", issues: a5 } = {}) => {
      let { localName: o8 = "base" } = e11 || {}, s5 = `${o8}:${r6}:${i8}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s5) || window.__swc.ignoreWarningLocalNames[o8] || window.__swc.ignoreWarningTypes[r6] || window.__swc.ignoreWarningLevels[i8]) return;
      window.__swc.issuedWarnings.add(s5);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l4 = i8 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e11 ? "\nInspect this issue in the follow element:" : "", d3 = (e11 ? "\n\n" : "\n") + n6 + "\n", f3 = [];
      f3.push(l4 + t8 + "\n" + c5 + u3), e11 && f3.push(e11), f3.push(d3, { data: {
        localName: o8,
        type: r6,
        level: i8
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s4;
var c4;
var l3;

// deps/swc/swc-dist/core/components/color-loupe/ColorLoupe.base.js
var r5 = class extends o7 {
  constructor(...e10) {
    super(...e10), this.open = false, this.color = "rgba(255, 0, 0, 0.5)";
  }
};
e5([n5({
  type: Boolean,
  reflect: true
})], r5.prototype, "open", void 0), e5([n5({ type: String })], r5.prototype, "color", void 0);

// deps/swc/swc-dist/components/color-loupe/ColorLoupe.js
var a4 = class extends r5 {
  static get styles() {
    return [t3, t4];
  }
  render() {
    return b2`
      <div class="swc-ColorLoupe">
        <div
          class="swc-ColorLoupe-layer swc-OpacityCheckerboard swc-ColorLoupe--clipped"
        ></div>
        <div
          class="swc-ColorLoupe-layer swc-ColorLoupe-colorFill swc-ColorLoupe--clipped"
          style=${o5({ "--swc-color-loupe-picked-color": this.color })}
        ></div>
        <svg aria-hidden="true" class="swc-ColorLoupe-svg" overflow="visible">
          <defs>
            <path
              id="loupe-path"
              d="M 22 60 C 18.2 56 14.6 51.7 11.3 47.2 C 8.3 43.3 5.7 39.1 3.5 34.7 C 1.2 30 0 25.9 0 22.4 C 0 17.2 1.8 12.2 5 8.2 C 8.2 4.2 12.7 1.5 17.6 0.4 C 22.6 -0.6 27.8 0.2 32.3 2.6 C 36.8 5 40.3 8.9 42.3 13.7 C 43.4 16.4 44 19.4 44 22.4 C 44 25.9 42.8 30 40.5 34.7 C 38.3 39.1 35.7 43.3 32.7 47.3 C 29.4 51.7 25.8 56 22 60 Z"
              transform="translate(2, 2)"
            />
            <mask id="loupe-mask">
              <rect x="0" y="0" height="100" width="100" fill="white" />
              <use href="#loupe-path" fill="black" />
            </mask>
          </defs>

          <g class="swc-ColorLoupe-loupe">
            <use
              href="#loupe-path"
              mask="url(#loupe-mask)"
              class="swc-ColorLoupe-innerBorder"
            />
            <use
              href="#loupe-path"
              mask="url(#loupe-mask)"
              class="swc-ColorLoupe-outerBorder"
            />
          </g>
        </svg>
      </div>
    `;
  }
};

// deps/swc/swc-dist/components/color-loupe/swc-color-loupe.js
e7("swc-color-loupe", a4);
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

lit-html/directives/style-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
