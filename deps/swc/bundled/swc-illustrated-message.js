// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t6, e11, o8) {
    if (this._$cssResult$ = true, o8 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t6, this.t = e11;
  }
  get styleSheet() {
    let t6 = this.o;
    const s5 = this.t;
    if (e && void 0 === t6) {
      const e11 = void 0 !== s5 && 1 === s5.length;
      e11 && (t6 = o.get(s5)), void 0 === t6 && ((this.o = t6 = new CSSStyleSheet()).replaceSync(this.cssText), e11 && o.set(s5, t6));
    }
    return t6;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t6) => new n("string" == typeof t6 ? t6 : t6 + "", void 0, s);
var i = (t6, ...e11) => {
  const o8 = 1 === t6.length ? t6[0] : e11.reduce((e12, s5, o9) => e12 + ((t7) => {
    if (true === t7._$cssResult$) return t7.cssText;
    if ("number" == typeof t7) return t7;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t7 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t6[o9 + 1], t6[0]);
  return new n(o8, t6, s);
};
var S = (s5, o8) => {
  if (e) s5.adoptedStyleSheets = o8.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
  else for (const e11 of o8) {
    const o9 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o9.setAttribute("nonce", n5), o9.textContent = e11.cssText, s5.appendChild(o9);
  }
};
var c = e ? (t6) => t6 : (t6) => t6 instanceof CSSStyleSheet ? ((t7) => {
  let e11 = "";
  for (const s5 of t7.cssRules) e11 += s5.cssText;
  return r(e11);
})(t6) : t6;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t6, s5) => t6;
var u = { toAttribute(t6, s5) {
  switch (s5) {
    case Boolean:
      t6 = t6 ? l : null;
      break;
    case Object:
    case Array:
      t6 = null == t6 ? t6 : JSON.stringify(t6);
  }
  return t6;
}, fromAttribute(t6, s5) {
  let i6 = t6;
  switch (s5) {
    case Boolean:
      i6 = null !== t6;
      break;
    case Number:
      i6 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        i6 = JSON.parse(t6);
      } catch (t7) {
        i6 = null;
      }
  }
  return i6;
} };
var f = (t6, s5) => !i2(t6, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t6) {
    this._$Ei(), (this.l ??= []).push(t6);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t6, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t6) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t6, s5), !s5.noAccessor) {
      const i6 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t6, i6, s5);
      void 0 !== h3 && e2(this.prototype, t6, h3);
    }
  }
  static getPropertyDescriptor(t6, s5, i6) {
    const { get: e11, set: r6 } = h(this.prototype, t6) ?? { get() {
      return this[s5];
    }, set(t7) {
      this[s5] = t7;
    } };
    return { get: e11, set(s6) {
      const h3 = e11?.call(this);
      r6?.call(this, s6), this.requestUpdate(t6, h3, i6);
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
      const t7 = this.properties, s5 = [...r2(t7), ...o2(t7)];
      for (const i6 of s5) this.createProperty(i6, t7[i6]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const s5 = litPropertyMetadata.get(t6);
      if (void 0 !== s5) for (const [t7, i6] of s5) this.elementProperties.set(t7, i6);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, s5] of this.elementProperties) {
      const i6 = this._$Eu(t7, s5);
      void 0 !== i6 && this._$Eh.set(i6, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i6 = [];
    if (Array.isArray(s5)) {
      const e11 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e11) i6.unshift(c(s6));
    } else void 0 !== s5 && i6.push(c(s5));
    return i6;
  }
  static _$Eu(t6, s5) {
    const i6 = s5.attribute;
    return false === i6 ? void 0 : "string" == typeof i6 ? i6 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
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
    const t6 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i6 of s5.keys()) this.hasOwnProperty(i6) && (t6.set(i6, this[i6]), delete this[i6]);
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
  attributeChangedCallback(t6, s5, i6) {
    this._$AK(t6, i6);
  }
  _$ET(t6, s5) {
    const i6 = this.constructor.elementProperties.get(t6), e11 = this.constructor._$Eu(t6, i6);
    if (void 0 !== e11 && true === i6.reflect) {
      const h3 = (void 0 !== i6.converter?.toAttribute ? i6.converter : u).toAttribute(s5, i6.type);
      this._$Em = t6, null == h3 ? this.removeAttribute(e11) : this.setAttribute(e11, h3), this._$Em = null;
    }
  }
  _$AK(t6, s5) {
    const i6 = this.constructor, e11 = i6._$Eh.get(t6);
    if (void 0 !== e11 && this._$Em !== e11) {
      const t7 = i6.getPropertyOptions(e11), h3 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : u;
      this._$Em = e11;
      const r6 = h3.fromAttribute(s5, t7.type);
      this[e11] = r6 ?? this._$Ej?.get(e11) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t6, s5, i6, e11 = false, h3) {
    if (void 0 !== t6) {
      const r6 = this.constructor;
      if (false === e11 && (h3 = this[t6]), i6 ??= r6.getPropertyOptions(t6), !((i6.hasChanged ?? f)(h3, s5) || i6.useDefault && i6.reflect && h3 === this._$Ej?.get(t6) && !this.hasAttribute(r6._$Eu(t6, i6)))) return;
      this.C(t6, s5, i6);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, s5, { useDefault: i6, reflect: e11, wrapped: h3 }, r6) {
    i6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t6) && (this._$Ej.set(t6, r6 ?? s5 ?? this[t6]), true !== h3 || void 0 !== r6) || (this._$AL.has(t6) || (this.hasUpdated || i6 || (s5 = void 0), this._$AL.set(t6, s5)), true === e11 && this._$Em !== t6 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t6));
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
        for (const [t8, s6] of this._$Ep) this[t8] = s6;
        this._$Ep = void 0;
      }
      const t7 = this.constructor.elementProperties;
      if (t7.size > 0) for (const [s6, i6] of t7) {
        const { wrapped: t8 } = i6, e11 = this[s6];
        true !== t8 || this._$AL.has(s6) || void 0 === e11 || this.C(s6, void 0, i6, e11);
      }
    }
    let t6 = false;
    const s5 = this._$AL;
    try {
      t6 = this.shouldUpdate(s5), t6 ? (this.willUpdate(s5), this._$EO?.forEach((t7) => t7.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t6 = false, this._$EM(), s6;
    }
    t6 && this._$AE(s5);
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
var x = (t6) => (i6, ...s5) => ({ _$litType$: t6, strings: i6, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t6, i6) {
  if (!u2(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i6) : i6;
}
var N = (t6, i6) => {
  const s5 = t6.length - 1, e11 = [];
  let n5, l3 = 2 === i6 ? "<svg>" : 3 === i6 ? "<math>" : "", c4 = v;
  for (let i7 = 0; i7 < s5; i7++) {
    const s6 = t6[i7];
    let a4, u3, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u3 = c4.exec(s6), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a4 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x2 = c4 === p2 && t6[i7 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s6 + r3 : d3 >= 0 ? (e11.push(a4), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i7 : x2);
  }
  return [V(t6, l3 + (t6[s5] || "<?>") + (2 === i6 ? "</svg>" : 3 === i6 ? "</math>" : "")), e11];
};
var S2 = class _S {
  constructor({ strings: t6, _$litType$: i6 }, e11) {
    let r6;
    this.parts = [];
    let l3 = 0, a4 = 0;
    const u3 = t6.length - 1, d3 = this.parts, [f3, v2] = N(t6, i6);
    if (this.el = _S.createElement(f3, e11), P.currentNode = this.el.content, 2 === i6 || 3 === i6) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t7 of r6.getAttributeNames()) if (t7.endsWith(h2)) {
          const i7 = v2[a4++], s5 = r6.getAttribute(t7).split(o3), e12 = /([.?@])?(.*)/.exec(i7);
          d3.push({ type: 1, index: l3, name: e12[2], strings: s5, ctor: "." === e12[1] ? I : "?" === e12[1] ? L : "@" === e12[1] ? z : H }), r6.removeAttribute(t7);
        } else t7.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t7));
        if (y2.test(r6.tagName)) {
          const t7 = r6.textContent.split(o3), i7 = t7.length - 1;
          if (i7 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i7; s5++) r6.append(t7[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t7[i7], c3());
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
  static createElement(t6, i6) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t6, s5;
  }
};
function M(t6, i6, s5 = t6, e11) {
  if (i6 === E) return i6;
  let h3 = void 0 !== e11 ? s5._$Co?.[e11] : s5._$Cl;
  const o8 = a2(i6) ? void 0 : i6._$litDirective$;
  return h3?.constructor !== o8 && (h3?._$AO?.(false), void 0 === o8 ? h3 = void 0 : (h3 = new o8(t6), h3._$AT(t6, s5, e11)), void 0 !== e11 ? (s5._$Co ??= [])[e11] = h3 : s5._$Cl = h3), void 0 !== h3 && (i6 = M(t6, h3._$AS(t6, i6.values), h3, e11)), i6;
}
var R = class {
  constructor(t6, i6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = i6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: i6 }, parts: s5 } = this._$AD, e11 = (t6?.creationScope ?? l2).importNode(i6, true);
    P.currentNode = e11;
    let h3 = P.nextNode(), o8 = 0, n5 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o8 === r6.index) {
        let i7;
        2 === r6.type ? i7 = new k(h3, h3.nextSibling, this, t6) : 1 === r6.type ? i7 = new r6.ctor(h3, r6.name, r6.strings, this, t6) : 6 === r6.type && (i7 = new Z(h3, this, t6)), this._$AV.push(i7), r6 = s5[++n5];
      }
      o8 !== r6?.index && (h3 = P.nextNode(), o8++);
    }
    return P.currentNode = l2, e11;
  }
  p(t6) {
    let i6 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t6, s5, i6), i6 += s5.strings.length - 2) : s5._$AI(t6[i6])), i6++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, i6, s5, e11) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t6, this._$AB = i6, this._$AM = s5, this.options = e11, this._$Cv = e11?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const i6 = this._$AM;
    return void 0 !== i6 && 11 === t6?.nodeType && (t6 = i6.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, i6 = this) {
    t6 = M(this, t6, i6), a2(t6) ? t6 === A || null == t6 || "" === t6 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t6 !== this._$AH && t6 !== E && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : d2(t6) ? this.k(t6) : this._(t6);
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
    const { values: i6, _$litType$: s5 } = t6, e11 = "number" == typeof s5 ? this._$AC(t6) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e11) this._$AH.p(i6);
    else {
      const t7 = new R(e11, this), s6 = t7.u(this.options);
      t7.p(i6), this.T(s6), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let i6 = C.get(t6.strings);
    return void 0 === i6 && C.set(t6.strings, i6 = new S2(t6)), i6;
  }
  k(t6) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i6 = this._$AH;
    let s5, e11 = 0;
    for (const h3 of t6) e11 === i6.length ? i6.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i6[e11], s5._$AI(h3), e11++;
    e11 < i6.length && (this._$AR(s5 && s5._$AB.nextSibling, e11), i6.length = e11);
  }
  _$AR(t6 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t6 !== this._$AB; ) {
      const s6 = i3(t6).nextSibling;
      i3(t6).remove(), t6 = s6;
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
  constructor(t6, i6, s5, e11, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t6, this.name = i6, this._$AM = e11, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t6, i6 = this, s5, e11) {
    const h3 = this.strings;
    let o8 = false;
    if (void 0 === h3) t6 = M(this, t6, i6, 0), o8 = !a2(t6) || t6 !== this._$AH && t6 !== E, o8 && (this._$AH = t6);
    else {
      const e12 = t6;
      let n5, r6;
      for (t6 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r6 = M(this, e12[s5 + n5], i6, n5), r6 === E && (r6 = this._$AH[n5]), o8 ||= !a2(r6) || r6 !== this._$AH[n5], r6 === A ? t6 = A : t6 !== A && (t6 += (r6 ?? "") + h3[n5 + 1]), this._$AH[n5] = r6;
    }
    o8 && !e11 && this.j(t6);
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
  constructor(t6, i6, s5, e11, h3) {
    super(t6, i6, s5, e11, h3), this.type = 5;
  }
  _$AI(t6, i6 = this) {
    if ((t6 = M(this, t6, i6, 0) ?? A) === E) return;
    const s5 = this._$AH, e11 = t6 === A && s5 !== A || t6.capture !== s5.capture || t6.once !== s5.once || t6.passive !== s5.passive, h3 = t6 !== A && (s5 === A || e11);
    e11 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var Z = class {
  constructor(t6, i6, s5) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = i6, this.options = s5;
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
var D = (t6, i6, s5) => {
  const e11 = s5?.renderBefore ?? i6;
  let h3 = e11._$litPart$;
  if (void 0 === h3) {
    const t7 = s5?.renderBefore ?? null;
    e11._$litPart$ = h3 = new k(i6.insertBefore(c3(), t7), t7, void 0, s5 ?? {});
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

// deps/swc/swc-dist/components/illustrated-message/illustrated-message.js
var t3 = i`:host{display:block}*{box-sizing:border-box}.swc-IllustratedMessage{--_swc-illustrated-message-illustration-to-content: var(--swc-illustrated-message-illustration-to-content, 12px);display:flex;flex-direction:column;gap:var(--_swc-illustrated-message-illustration-to-content);align-items:center;max-inline-size:var(--swc-illustrated-message-max-inline-size, 380px);margin-inline:auto}.swc-IllustratedMessage-illustration{--_swc-illustrated-message-illustration-size: var(--swc-illustrated-message-illustration-size, 96px);display:flex;flex-shrink:0;justify-content:center;inline-size:var(--swc-illustrated-message-illustration-inline-size, var(--_swc-illustrated-message-illustration-size));block-size:var(--swc-illustrated-message-illustration-block-size, var(--_swc-illustrated-message-illustration-size));color:var(--swc-illustrated-message-illustration-color, var(--swc-gray-800))}.swc-IllustratedMessage-content{display:flex;flex-direction:column;gap:4px;text-align:center}.swc-IllustratedMessage-description{font-size:var(--swc-illustrated-message-description-font-size, var(--swc-illustrated-message-medium-body-font-size));font-weight:400;line-height:var(--swc-illustrated-message-description-line-height, var(--swc-line-height-200));color:var(--swc-gray-800)}:host([size=\"s\"]){--swc-illustrated-message-illustration-size: 96px;--swc-illustrated-message-illustration-to-content: 12px;--swc-illustrated-message-heading-font-size: var(--swc-illustrated-message-small-title-font-size);--swc-illustrated-message-description-font-size: var(--swc-body-size-xs)}:host([size=\"l\"]){--swc-illustrated-message-illustration-size: 160px;--swc-illustrated-message-illustration-to-content: 8px;--swc-illustrated-message-heading-font-size: var(--swc-illustrated-message-large-title-font-size);--swc-illustrated-message-description-font-size: var(--swc-illustrated-message-large-body-font-size)}:host(:lang(ja)),:host(:lang(ko)),:host(:lang(zh)){--swc-illustrated-message-heading-font-size: var(--swc-illustrated-message-medium-cjk-title-font-size);--swc-illustrated-message-heading-line-height: 1.5;--swc-illustrated-message-description-line-height: 1.7}:host([size=\"s\"]:lang(ja)),:host([size=\"s\"]:lang(ko)),:host([size=\"s\"]:lang(zh)){--swc-illustrated-message-heading-font-size: var(--swc-illustrated-message-small-cjk-title-font-size)}:host([size=\"l\"]:lang(ja)),:host([size=\"l\"]:lang(ko)),:host([size=\"l\"]:lang(zh)){--swc-illustrated-message-heading-font-size: var(--swc-illustrated-message-large-cjk-title-font-size)}:host([orientation=\"horizontal\"]){--swc-illustrated-message-max-inline-size: 535px}:host([orientation=\"horizontal\"]) .swc-IllustratedMessage{flex-direction:row;align-items:center}:host([orientation=\"horizontal\"]) .swc-IllustratedMessage-content{align-items:flex-start;text-align:start}slot[name=heading]{font-size:var(--swc-illustrated-message-heading-font-size, var(--swc-illustrated-message-medium-title-font-size));font-style:normal;font-weight:700;line-height:var(--swc-illustrated-message-heading-line-height, 1.3);color:var(--swc-gray-900)}::slotted([slot=\"heading\"]:not([class])){margin:0!important;font:inherit!important;color:inherit!important}:host(:has([slot=\"actions\"])) slot[name=actions]{margin-block-start:16px}::slotted(svg){display:block;inline-size:100%;block-size:100%;fill:currentcolor;stroke:currentcolor}`;

// deps/swc/swc-dist/core/components/illustrated-message/IllustratedMessage.types.js
var e4 = [
  "s",
  "m",
  "l"
];
var t4 = ["vertical", "horizontal"];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e5(e11, t6, n5, r6) {
  var i6 = arguments.length, a4 = i6 < 3 ? t6 : r6 === null ? r6 = Object.getOwnPropertyDescriptor(t6, n5) : r6, o8;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a4 = Reflect.decorate(e11, t6, n5, r6);
  else for (var s5 = e11.length - 1; s5 >= 0; s5--) (o8 = e11[s5]) && (a4 = (i6 < 3 ? o8(a4) : i6 > 3 ? o8(t6, n5, a4) : o8(t6, n5)) || a4);
  return i6 > 3 && a4 && Object.defineProperty(t6, n5, a4), a4;
}

// deps/swc/swc-dist/core/controllers/slot-attribute-propagation/src/slot-attribute-propagation-controller.js
var e6 = class {
  constructor(e11, t6) {
    this._host = e11, this._options = t6, e11.addController(this);
  }
  hostDisconnected() {
    this._previousValue = void 0;
  }
  hostUpdated() {
    let e11 = this._options.getValue();
    e11 !== this._previousValue && (this._previousValue = e11, this._propagateToSlot(e11));
  }
  propagate() {
    this._propagateToSlot(this._options.getValue());
  }
  _propagateToSlot(e11) {
    let t6 = this._resolveSlot();
    if (!t6) return;
    let n5 = t6.assignedElements({ flatten: true }), r6 = this._options.selector ? n5.filter((e12) => e12.matches(this._options.selector)) : n5;
    for (let t7 of r6) t7.setAttribute(this._options.attribute, e11);
  }
  _resolveSlot() {
    let e11 = this._host.shadowRoot;
    if (!e11) return null;
    let { slotName: t6 } = this._options;
    return t6 ? e11.querySelector(`slot[name="${t6}"]`) : e11.querySelector("slot:not([name])");
  }
};

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t6 = o5, e11, r6) => {
  const { kind: n5, metadata: i6 } = r6;
  let s5 = globalThis.litPropertyMetadata.get(i6);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i6, s5 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t6 = Object.create(t6)).wrapped = true), s5.set(r6.name, t6), "accessor" === n5) {
    const { name: o8 } = r6;
    return { set(r7) {
      const n6 = e11.get.call(this);
      e11.set.call(this, r7), this.requestUpdate(o8, n6, t6, true, r7);
    }, init(e12) {
      return void 0 !== e12 && this.C(o8, void 0, t6, e12), e12;
    } };
  }
  if ("setter" === n5) {
    const { name: o8 } = r6;
    return function(r7) {
      const n6 = this[o8];
      e11.call(this, r7), this.requestUpdate(o8, n6, t6, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t6) {
  return (e11, o8) => "object" == typeof o8 ? r4(t6, e11, o8) : ((t7, e12, o9) => {
    const r6 = e12.hasOwnProperty(o9);
    return e12.constructor.createProperty(o9, t7), r6 ? Object.getOwnPropertyDescriptor(e12, o9) : void 0;
  })(t6, e11, o8);
}

// deps/swc/swc-dist/core/element/define-element.js
function e8(e11, t6) {
  window.__swc && window.__swc.DEBUG && customElements.get(e11) && window.__swc.warn(void 0, `Attempted to redefine <${e11}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e11, t6);
}

// deps/swc/swc-dist/core/element/version.js
var e9 = "0.1.0";
var t5 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e10(e11 = document) {
  var t6;
  let n5 = e11.activeElement;
  for (; !(n5 == null || (t6 = n5.shadowRoot) == null) && t6.activeElement; ) n5 = n5.shadowRoot.activeElement;
  return n5;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t6) {
  class n5 extends t6 {
    hasVisibleFocusInTree() {
      var t7;
      let n6 = e10(this.getRootNode());
      return (t7 = n6 == null ? void 0 : n6.matches(":focus-visible")) == null ? false : t7;
    }
  }
  return n5;
}
var o6 = class extends a3(i4) {
  get dir() {
    var e11;
    return (e11 = getComputedStyle(this).direction) == null ? "ltr" : e11;
  }
};
if (i5 = o6, i5.VERSION = e9, i5.CORE_VERSION = t5, true) {
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
    ignoreWarningLocalNames: { ...((s5 = window.__swc) == null ? void 0 : s5.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e11,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t6,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e12, t7, n5, { type: r6 = "api", level: i6 = "default", issues: a4 } = {}) => {
      let { localName: o8 = "base" } = e12 || {}, s6 = `${o8}:${r6}:${i6}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o8] || window.__swc.ignoreWarningTypes[r6] || window.__swc.ignoreWarningLevels[i6]) return;
      window.__swc.issuedWarnings.add(s6);
      let c5 = "";
      a4 && a4.length && (a4.unshift(""), c5 = a4.join("\n    - ") + "\n");
      let l4 = i6 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e12 ? "\nInspect this issue in the follow element:" : "", d3 = (e12 ? "\n\n" : "\n") + n5 + "\n", f3 = [];
      f3.push(l4 + t7 + "\n" + c5 + u3), e12 && f3.push(e12), f3.push(d3, { data: {
        localName: o8,
        type: r6,
        level: i6
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c4;
var l3;

// deps/swc/swc-dist/core/components/illustrated-message/IllustratedMessage.base.js
var o7;
var s4 = class extends o6 {
  constructor(...e11) {
    super(...e11), this.size = "m", this.orientation = "vertical", this._sizePropagation = new e6(this, {
      attribute: "size",
      getValue: () => this.size,
      slotName: "actions"
    });
  }
  updated(e11) {
    var t6;
    super.updated(e11), (t6 = window.__swc) != null && t6.DEBUG && (e11.has("size") && !e4.includes(this.size) && window.__swc.warn(this, `<${this.localName}> received an invalid "size" value of "${this.size}". Valid values are ${e4.join(", ")}.`, "https://opensource.adobe.com/spectrum-web-components/components/illustrated-message/", { issues: [`size="${this.size}"`] }), e11.has("orientation") && !t4.includes(this.orientation) && window.__swc.warn(this, `<${this.localName}> received an invalid "orientation" value of "${this.orientation}". Valid values are ${t4.join(", ")}.`, "https://opensource.adobe.com/spectrum-web-components/components/illustrated-message/", { issues: [`orientation="${this.orientation}"`] }));
  }
  handleActionsSlotChange() {
    this._sizePropagation.propagate();
  }
  handleHeadingSlotChange(e11) {
    var t6;
    if ((t6 = window.__swc) != null && t6.DEBUG) {
      let t7 = e11.target;
      for (let e12 of t7.assignedElements()) [
        "H2",
        "H3",
        "H4",
        "H5",
        "H6"
      ].includes(e12.tagName) || window.__swc.warn(this, `<${this.localName}> heading slot received a <${e12.tagName.toLowerCase()}> element. Only <h2>\u2013<h6> elements are allowed in the heading slot.`, "https://opensource.adobe.com/spectrum-web-components/components/illustrated-message/", { issues: [`heading slot: <${e12.tagName.toLowerCase()}>`] });
    }
  }
};
o7 = s4, o7.VALID_SIZES = e4, o7.VALID_ORIENTATIONS = t4, e5([n4({
  type: String,
  reflect: true
})], s4.prototype, "size", void 0), e5([n4({
  type: String,
  reflect: true
})], s4.prototype, "orientation", void 0);

// deps/swc/swc-dist/components/illustrated-message/IllustratedMessage.js
var r5 = class extends s4 {
  static get styles() {
    return [t3];
  }
  render() {
    return b2`
      <div class="swc-IllustratedMessage">
        <div class="swc-IllustratedMessage-illustration">
          <slot></slot>
        </div>
        <div class="swc-IllustratedMessage-content">
          <slot
            name="heading"
            @slotchange=${this.handleHeadingSlotChange}
          ></slot>
          <div class="swc-IllustratedMessage-description">
            <slot name="description"></slot>
          </div>
          <slot
            name="actions"
            @slotchange=${this.handleActionsSlotChange}
          ></slot>
        </div>
      </div>
    `;
  }
};

// deps/swc/swc-dist/components/illustrated-message/swc-illustrated-message.js
e8("swc-illustrated-message", r5);
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
