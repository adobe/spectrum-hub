// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t6, e10, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t6, this.t = e10;
  }
  get styleSheet() {
    let t6 = this.o;
    const s4 = this.t;
    if (e && void 0 === t6) {
      const e10 = void 0 !== s4 && 1 === s4.length;
      e10 && (t6 = o.get(s4)), void 0 === t6 && ((this.o = t6 = new CSSStyleSheet()).replaceSync(this.cssText), e10 && o.set(s4, t6));
    }
    return t6;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t6) => new n("string" == typeof t6 ? t6 : t6 + "", void 0, s);
var i = (t6, ...e10) => {
  const o7 = 1 === t6.length ? t6[0] : e10.reduce((e11, s4, o8) => e11 + ((t7) => {
    if (true === t7._$cssResult$) return t7.cssText;
    if ("number" == typeof t7) return t7;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t7 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t6[o8 + 1], t6[0]);
  return new n(o7, t6, s);
};
var S = (s4, o7) => {
  if (e) s4.adoptedStyleSheets = o7.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
  else for (const e10 of o7) {
    const o8 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o8.setAttribute("nonce", n5), o8.textContent = e10.cssText, s4.appendChild(o8);
  }
};
var c = e ? (t6) => t6 : (t6) => t6 instanceof CSSStyleSheet ? ((t7) => {
  let e10 = "";
  for (const s4 of t7.cssRules) e10 += s4.cssText;
  return r(e10);
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
  let i7 = t6;
  switch (s4) {
    case Boolean:
      i7 = null !== t6;
      break;
    case Number:
      i7 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t6);
      } catch (t7) {
        i7 = null;
      }
  }
  return i7;
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
      const i7 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t6, i7, s4);
      void 0 !== h3 && e2(this.prototype, t6, h3);
    }
  }
  static getPropertyDescriptor(t6, s4, i7) {
    const { get: e10, set: r6 } = h(this.prototype, t6) ?? { get() {
      return this[s4];
    }, set(t7) {
      this[s4] = t7;
    } };
    return { get: e10, set(s5) {
      const h3 = e10?.call(this);
      r6?.call(this, s5), this.requestUpdate(t6, h3, i7);
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
      for (const i7 of s4) this.createProperty(i7, t7[i7]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const s4 = litPropertyMetadata.get(t6);
      if (void 0 !== s4) for (const [t7, i7] of s4) this.elementProperties.set(t7, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, s4] of this.elementProperties) {
      const i7 = this._$Eu(t7, s4);
      void 0 !== i7 && this._$Eh.set(i7, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i7 = [];
    if (Array.isArray(s4)) {
      const e10 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e10) i7.unshift(c(s5));
    } else void 0 !== s4 && i7.push(c(s4));
    return i7;
  }
  static _$Eu(t6, s4) {
    const i7 = s4.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
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
    for (const i7 of s4.keys()) this.hasOwnProperty(i7) && (t6.set(i7, this[i7]), delete this[i7]);
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
  attributeChangedCallback(t6, s4, i7) {
    this._$AK(t6, i7);
  }
  _$ET(t6, s4) {
    const i7 = this.constructor.elementProperties.get(t6), e10 = this.constructor._$Eu(t6, i7);
    if (void 0 !== e10 && true === i7.reflect) {
      const h3 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s4, i7.type);
      this._$Em = t6, null == h3 ? this.removeAttribute(e10) : this.setAttribute(e10, h3), this._$Em = null;
    }
  }
  _$AK(t6, s4) {
    const i7 = this.constructor, e10 = i7._$Eh.get(t6);
    if (void 0 !== e10 && this._$Em !== e10) {
      const t7 = i7.getPropertyOptions(e10), h3 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : u;
      this._$Em = e10;
      const r6 = h3.fromAttribute(s4, t7.type);
      this[e10] = r6 ?? this._$Ej?.get(e10) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t6, s4, i7, e10 = false, h3) {
    if (void 0 !== t6) {
      const r6 = this.constructor;
      if (false === e10 && (h3 = this[t6]), i7 ??= r6.getPropertyOptions(t6), !((i7.hasChanged ?? f)(h3, s4) || i7.useDefault && i7.reflect && h3 === this._$Ej?.get(t6) && !this.hasAttribute(r6._$Eu(t6, i7)))) return;
      this.C(t6, s4, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, s4, { useDefault: i7, reflect: e10, wrapped: h3 }, r6) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t6) && (this._$Ej.set(t6, r6 ?? s4 ?? this[t6]), true !== h3 || void 0 !== r6) || (this._$AL.has(t6) || (this.hasUpdated || i7 || (s4 = void 0), this._$AL.set(t6, s4)), true === e10 && this._$Em !== t6 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t6));
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
      if (t7.size > 0) for (const [s5, i7] of t7) {
        const { wrapped: t8 } = i7, e10 = this[s5];
        true !== t8 || this._$AL.has(s5) || void 0 === e10 || this.C(s5, void 0, i7, e10);
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
var x = (t6) => (i7, ...s4) => ({ _$litType$: t6, strings: i7, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t6, i7) {
  if (!u2(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t6, i7) => {
  const s4 = t6.length - 1, e10 = [];
  let n5, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c4 = v;
  for (let i8 = 0; i8 < s4; i8++) {
    const s5 = t6[i8];
    let a5, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a5 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x2 = c4 === p2 && t6[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e10.push(a5), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t6, l3 + (t6[s4] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e10];
};
var S2 = class _S {
  constructor({ strings: t6, _$litType$: i7 }, e10) {
    let r6;
    this.parts = [];
    let l3 = 0, a5 = 0;
    const u3 = t6.length - 1, d3 = this.parts, [f3, v2] = N(t6, i7);
    if (this.el = _S.createElement(f3, e10), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t7 of r6.getAttributeNames()) if (t7.endsWith(h2)) {
          const i8 = v2[a5++], s4 = r6.getAttribute(t7).split(o3), e11 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e11[2], strings: s4, ctor: "." === e11[1] ? I : "?" === e11[1] ? L : "@" === e11[1] ? z : H }), r6.removeAttribute(t7);
        } else t7.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t7));
        if (y2.test(r6.tagName)) {
          const t7 = r6.textContent.split(o3), i8 = t7.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i8; s4++) r6.append(t7[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t7[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = r6.data.indexOf(o3, t7 + 1)); ) d3.push({ type: 7, index: l3 }), t7 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t6, i7) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t6, s4;
  }
};
function M(t6, i7, s4 = t6, e10) {
  if (i7 === E) return i7;
  let h3 = void 0 !== e10 ? s4._$Co?.[e10] : s4._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h3?.constructor !== o7 && (h3?._$AO?.(false), void 0 === o7 ? h3 = void 0 : (h3 = new o7(t6), h3._$AT(t6, s4, e10)), void 0 !== e10 ? (s4._$Co ??= [])[e10] = h3 : s4._$Cl = h3), void 0 !== h3 && (i7 = M(t6, h3._$AS(t6, i7.values), h3, e10)), i7;
}
var R = class {
  constructor(t6, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: i7 }, parts: s4 } = this._$AD, e10 = (t6?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e10;
    let h3 = P.nextNode(), o7 = 0, n5 = 0, r6 = s4[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h3, h3.nextSibling, this, t6) : 1 === r6.type ? i8 = new r6.ctor(h3, r6.name, r6.strings, this, t6) : 6 === r6.type && (i8 = new Z(h3, this, t6)), this._$AV.push(i8), r6 = s4[++n5];
      }
      o7 !== r6?.index && (h3 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e10;
  }
  p(t6) {
    let i7 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t6, s4, i7), i7 += s4.strings.length - 2) : s4._$AI(t6[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, i7, s4, e10) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t6, this._$AB = i7, this._$AM = s4, this.options = e10, this._$Cv = e10?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t6?.nodeType && (t6 = i7.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, i7 = this) {
    t6 = M(this, t6, i7), a2(t6) ? t6 === A || null == t6 || "" === t6 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t6 !== this._$AH && t6 !== E && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : d2(t6) ? this.k(t6) : this._(t6);
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
    const { values: i7, _$litType$: s4 } = t6, e10 = "number" == typeof s4 ? this._$AC(t6) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e10) this._$AH.p(i7);
    else {
      const t7 = new R(e10, this), s5 = t7.u(this.options);
      t7.p(i7), this.T(s5), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let i7 = C.get(t6.strings);
    return void 0 === i7 && C.set(t6.strings, i7 = new S2(t6)), i7;
  }
  k(t6) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s4, e10 = 0;
    for (const h3 of t6) e10 === i7.length ? i7.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i7[e10], s4._$AI(h3), e10++;
    e10 < i7.length && (this._$AR(s4 && s4._$AB.nextSibling, e10), i7.length = e10);
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
  constructor(t6, i7, s4, e10, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t6, this.name = i7, this._$AM = e10, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t6, i7 = this, s4, e10) {
    const h3 = this.strings;
    let o7 = false;
    if (void 0 === h3) t6 = M(this, t6, i7, 0), o7 = !a2(t6) || t6 !== this._$AH && t6 !== E, o7 && (this._$AH = t6);
    else {
      const e11 = t6;
      let n5, r6;
      for (t6 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r6 = M(this, e11[s4 + n5], i7, n5), r6 === E && (r6 = this._$AH[n5]), o7 ||= !a2(r6) || r6 !== this._$AH[n5], r6 === A ? t6 = A : t6 !== A && (t6 += (r6 ?? "") + h3[n5 + 1]), this._$AH[n5] = r6;
    }
    o7 && !e10 && this.j(t6);
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
  constructor(t6, i7, s4, e10, h3) {
    super(t6, i7, s4, e10, h3), this.type = 5;
  }
  _$AI(t6, i7 = this) {
    if ((t6 = M(this, t6, i7, 0) ?? A) === E) return;
    const s4 = this._$AH, e10 = t6 === A && s4 !== A || t6.capture !== s4.capture || t6.once !== s4.once || t6.passive !== s4.passive, h3 = t6 !== A && (s4 === A || e10);
    e10 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var Z = class {
  constructor(t6, i7, s4) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s4;
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
var D = (t6, i7, s4) => {
  const e10 = s4?.renderBefore ?? i7;
  let h3 = e10._$litPart$;
  if (void 0 === h3) {
    const t7 = s4?.renderBefore ?? null;
    e10._$litPart$ = h3 = new k(i7.insertBefore(c3(), t7), t7, void 0, s4 ?? {});
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
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t6), this._$Do = D(r6, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/avatar/avatar.js
var t3 = i`:host{display:inline-block;align-self:start;justify-self:start;place-self:start;vertical-align:middle}*{box-sizing:border-box}:host([size=\"50\"]){--swc-avatar-size: var(--swc-avatar-size-50)}:host([size=\"75\"]){--swc-avatar-size: var(--swc-avatar-size-75)}:host([size=\"100\"]){--swc-avatar-size: var(--swc-avatar-size-100)}:host([size=\"200\"]){--swc-avatar-size: var(--swc-avatar-size-200)}:host([size=\"300\"]){--swc-avatar-size: var(--swc-avatar-size-300)}:host([size=\"400\"]){--swc-avatar-size: var(--swc-avatar-size-400)}:host([size=\"500\"]){--swc-avatar-size: var(--swc-avatar-size-500)}:host([size=\"600\"]){--swc-avatar-size: var(--swc-avatar-size-600)}:host([size=\"700\"]){--swc-avatar-size: var(--swc-avatar-size-700)}:host([size=\"800\"]){--swc-avatar-size: var(--swc-avatar-size-800)}:host([size=\"900\"]){--swc-avatar-size: var(--swc-avatar-size-900)}:host([size=\"1000\"]){--swc-avatar-size: var(--swc-avatar-size-1000)}:host([size=\"1100\"]){--swc-avatar-size: var(--swc-avatar-size-1100)}:host([size=\"1200\"]){--swc-avatar-size: var(--swc-avatar-size-1200)}:host([size=\"1300\"]){--swc-avatar-size: var(--swc-avatar-size-1300)}:host([size=\"1400\"]){--swc-avatar-size: var(--swc-avatar-size-1400)}:host([size=\"1500\"]){--swc-avatar-size: var(--swc-avatar-size-1500)}.swc-Avatar{display:inline-block;inline-size:var(--swc-avatar-size, var(--swc-avatar-size-500));block-size:var(--swc-avatar-size, var(--swc-avatar-size-500));border-radius:50%;-webkit-user-select:none;-moz-user-select:none;user-select:none}.swc-Avatar-image{display:block;inline-size:var(--swc-avatar-size, var(--swc-avatar-size-500));block-size:var(--swc-avatar-size, var(--swc-avatar-size-500));border-radius:50%;-o-object-fit:cover;object-fit:cover}:host([outline]) .swc-Avatar-image{outline:var(--swc-avatar-outline-width, 1px) solid var(--swc-avatar-outline-color, var(--swc-gray-25))}:host([outline][size=\"1000\"]),:host([outline][size=\"1100\"]),:host([outline][size=\"1200\"]),:host([outline][size=\"1300\"]),:host([outline][size=\"1400\"]),:host([outline][size=\"1500\"]){--swc-avatar-outline-width: 2px}:host([disabled]) .swc-Avatar{pointer-events:none;cursor:default;opacity:var(--swc-avatar-opacity-disabled, .3)}`;

// deps/swc/swc-dist/core/components/avatar/Avatar.types.js
var e4 = [
  50,
  75,
  100,
  200,
  300,
  400,
  500,
  600,
  700,
  800,
  900,
  1e3,
  1100,
  1200,
  1300,
  1400,
  1500
];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e5(e10, t6, n5, r6) {
  var i7 = arguments.length, a5 = i7 < 3 ? t6 : r6 === null ? r6 = Object.getOwnPropertyDescriptor(t6, n5) : r6, o7;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e10, t6, n5, r6);
  else for (var s4 = e10.length - 1; s4 >= 0; s4--) (o7 = e10[s4]) && (a5 = (i7 < 3 ? o7(a5) : i7 > 3 ? o7(t6, n5, a5) : o7(t6, n5)) || a5);
  return i7 > 3 && a5 && Object.defineProperty(t6, n5, a5), a5;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t6 = o5, e10, r6) => {
  const { kind: n5, metadata: i7 } = r6;
  let s4 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i7, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t6 = Object.create(t6)).wrapped = true), s4.set(r6.name, t6), "accessor" === n5) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n6 = e10.get.call(this);
      e10.set.call(this, r7), this.requestUpdate(o7, n6, t6, true, r7);
    }, init(e11) {
      return void 0 !== e11 && this.C(o7, void 0, t6, e11), e11;
    } };
  }
  if ("setter" === n5) {
    const { name: o7 } = r6;
    return function(r7) {
      const n6 = this[o7];
      e10.call(this, r7), this.requestUpdate(o7, n6, t6, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t6) {
  return (e10, o7) => "object" == typeof o7 ? r4(t6, e10, o7) : ((t7, e11, o8) => {
    const r6 = e11.hasOwnProperty(o8);
    return e11.constructor.createProperty(o8, t7), r6 ? Object.getOwnPropertyDescriptor(e11, o8) : void 0;
  })(t6, e10, o7);
}

// deps/swc/swc-dist/core/element/define-element.js
function e7(e10, t6) {
  window.__swc && window.__swc.DEBUG && customElements.get(e10) && window.__swc.warn(void 0, `Attempted to redefine <${e10}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e10, t6);
}

// deps/swc/swc-dist/core/element/version.js
var e8 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e9(e10 = document) {
  var t6;
  let n5 = e10.activeElement;
  for (; !(n5 == null || (t6 = n5.shadowRoot) == null) && t6.activeElement; ) n5 = n5.shadowRoot.activeElement;
  return n5;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t6) {
  class n5 extends t6 {
    hasVisibleFocusInTree() {
      var t7;
      let n6 = e9(this.getRootNode());
      return (t7 = n6 == null ? void 0 : n6.matches(":focus-visible")) == null ? false : t7;
    }
  }
  return n5;
}
var o6 = class extends a3(i4) {
  get dir() {
    var e10;
    return (e10 = getComputedStyle(this).direction) == null ? "ltr" : e10;
  }
};
if (i5 = o6, i5.VERSION = e8, i5.CORE_VERSION = t4, true) {
  let e10 = {
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
      ...e10,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t6,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e11, t7, n5, { type: r6 = "api", level: i7 = "default", issues: a5 } = {}) => {
      let { localName: o7 = "base" } = e11 || {}, s5 = `${o7}:${r6}:${i7}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s5) || window.__swc.ignoreWarningLocalNames[o7] || window.__swc.ignoreWarningTypes[r6] || window.__swc.ignoreWarningLevels[i7]) return;
      window.__swc.issuedWarnings.add(s5);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l4 = i7 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e11 ? "\nInspect this issue in the follow element:" : "", d3 = (e11 ? "\n\n" : "\n") + n5 + "\n", f3 = [];
      f3.push(l4 + t7 + "\n" + c5 + u3), e11 && f3.push(e11), f3.push(d3, { data: {
        localName: o7,
        type: r6,
        level: i7
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s4;
var c4;
var l3;

// deps/swc/swc-dist/core/components/avatar/Avatar.base.js
var i6;
var a4 = class extends o6 {
  constructor(...e10) {
    super(...e10), this.src = "", this._size = 500, this.outline = false, this.disabled = false, this.decorative = false;
  }
  get size() {
    return this._size;
  }
  set size(e10) {
    let n5 = e4.includes(Number(e10)) ? Number(e10) : 500;
    if (this._size === n5) return;
    let r6 = this._size;
    this._size = n5, this.requestUpdate("size", r6);
  }
  firstUpdated(e10) {
    var t6;
    super.firstUpdated(e10), this.hasAttribute("size") || this.setAttribute("size", String(this.size)), this._syncAriaHidden(), (t6 = window.__swc) != null && t6.DEBUG && this._warnMissingAlt();
  }
  updated(e10) {
    var t6;
    super.updated(e10), e10.has("decorative") && this._syncAriaHidden(), e10.has("alt") && (t6 = window.__swc) != null && t6.DEBUG && this._warnMissingAlt();
  }
  _syncAriaHidden() {
    this.decorative ? this.setAttribute("aria-hidden", "true") : this.removeAttribute("aria-hidden");
  }
  _warnMissingAlt() {
    if (this.alt === void 0 && !this.decorative) {
      var e10;
      (e10 = window.__swc) == null || e10.warn(this, `<${this.localName}> is missing an \`alt\` attribute. Provide a text description or pass \`alt=""\` and mark it as \`decorative\`.`, "https://opensource.adobe.com/spectrum-web-components/components/avatar/#accessibility", {
        type: "accessibility",
        issues: ["Provide an `alt` attribute with meaningful alternative text, or", 'Set `alt=""` and mark the image as `decorative` (hidden from screen readers).']
      });
    }
  }
};
i6 = a4, i6.VALID_SIZES = e4, e5([n4({ type: String })], a4.prototype, "src", void 0), e5([n4({ type: String })], a4.prototype, "alt", void 0), e5([n4({
  type: Number,
  reflect: true
})], a4.prototype, "size", null), e5([n4({
  type: Boolean,
  reflect: true
})], a4.prototype, "outline", void 0), e5([n4({
  type: Boolean,
  reflect: true
})], a4.prototype, "disabled", void 0), e5([n4({
  type: Boolean,
  reflect: true
})], a4.prototype, "decorative", void 0);

// deps/swc/swc-dist/components/avatar/Avatar2.js
var r5 = class extends a4 {
  static get styles() {
    return [t3];
  }
  render() {
    var e10;
    return b2`
      <div class="swc-Avatar">
        <img class="swc-Avatar-image" src=${this.src} alt=${(e10 = this.alt) == null ? "" : e10} />
      </div>
    `;
  }
};

// deps/swc/swc-dist/components/avatar/swc-avatar.js
e7("swc-avatar", r5);
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
