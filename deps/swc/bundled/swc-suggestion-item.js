// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t6, e11, o12) {
    if (this._$cssResult$ = true, o12 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
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
  const o12 = 1 === t6.length ? t6[0] : e11.reduce((e12, s5, o13) => e12 + ((t7) => {
    if (true === t7._$cssResult$) return t7.cssText;
    if ("number" == typeof t7) return t7;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t7 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t6[o13 + 1], t6[0]);
  return new n(o12, t6, s);
};
var S = (s5, o12) => {
  if (e) s5.adoptedStyleSheets = o12.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
  else for (const e11 of o12) {
    const o13 = document.createElement("style"), n9 = t.litNonce;
    void 0 !== n9 && o13.setAttribute("nonce", n9), o13.textContent = e11.cssText, s5.appendChild(o13);
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
  let i10 = t6;
  switch (s5) {
    case Boolean:
      i10 = null !== t6;
      break;
    case Number:
      i10 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        i10 = JSON.parse(t6);
      } catch (t7) {
        i10 = null;
      }
  }
  return i10;
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
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t6, i10, s5);
      void 0 !== h3 && e2(this.prototype, t6, h3);
    }
  }
  static getPropertyDescriptor(t6, s5, i10) {
    const { get: e11, set: r7 } = h(this.prototype, t6) ?? { get() {
      return this[s5];
    }, set(t7) {
      this[s5] = t7;
    } };
    return { get: e11, set(s6) {
      const h3 = e11?.call(this);
      r7?.call(this, s6), this.requestUpdate(t6, h3, i10);
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
      for (const i10 of s5) this.createProperty(i10, t7[i10]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const s5 = litPropertyMetadata.get(t6);
      if (void 0 !== s5) for (const [t7, i10] of s5) this.elementProperties.set(t7, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, s5] of this.elementProperties) {
      const i10 = this._$Eu(t7, s5);
      void 0 !== i10 && this._$Eh.set(i10, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i10 = [];
    if (Array.isArray(s5)) {
      const e11 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e11) i10.unshift(c(s6));
    } else void 0 !== s5 && i10.push(c(s5));
    return i10;
  }
  static _$Eu(t6, s5) {
    const i10 = s5.attribute;
    return false === i10 ? void 0 : "string" == typeof i10 ? i10 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
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
    for (const i10 of s5.keys()) this.hasOwnProperty(i10) && (t6.set(i10, this[i10]), delete this[i10]);
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
  attributeChangedCallback(t6, s5, i10) {
    this._$AK(t6, i10);
  }
  _$ET(t6, s5) {
    const i10 = this.constructor.elementProperties.get(t6), e11 = this.constructor._$Eu(t6, i10);
    if (void 0 !== e11 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s5, i10.type);
      this._$Em = t6, null == h3 ? this.removeAttribute(e11) : this.setAttribute(e11, h3), this._$Em = null;
    }
  }
  _$AK(t6, s5) {
    const i10 = this.constructor, e11 = i10._$Eh.get(t6);
    if (void 0 !== e11 && this._$Em !== e11) {
      const t7 = i10.getPropertyOptions(e11), h3 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : u;
      this._$Em = e11;
      const r7 = h3.fromAttribute(s5, t7.type);
      this[e11] = r7 ?? this._$Ej?.get(e11) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t6, s5, i10, e11 = false, h3) {
    if (void 0 !== t6) {
      const r7 = this.constructor;
      if (false === e11 && (h3 = this[t6]), i10 ??= r7.getPropertyOptions(t6), !((i10.hasChanged ?? f)(h3, s5) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t6) && !this.hasAttribute(r7._$Eu(t6, i10)))) return;
      this.C(t6, s5, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, s5, { useDefault: i10, reflect: e11, wrapped: h3 }, r7) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t6) && (this._$Ej.set(t6, r7 ?? s5 ?? this[t6]), true !== h3 || void 0 !== r7) || (this._$AL.has(t6) || (this.hasUpdated || i10 || (s5 = void 0), this._$AL.set(t6, s5)), true === e11 && this._$Em !== t6 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t6));
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
      if (t7.size > 0) for (const [s6, i10] of t7) {
        const { wrapped: t8 } = i10, e11 = this[s6];
        true !== t8 || this._$AL.has(s6) || void 0 === e11 || this.C(s6, void 0, i10, e11);
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
var x = (t6) => (i10, ...s5) => ({ _$litType$: t6, strings: i10, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t6, i10) {
  if (!u2(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i10) : i10;
}
var N = (t6, i10) => {
  const s5 = t6.length - 1, e11 = [];
  let n9, l3 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c5 = v;
  for (let i11 = 0; i11 < s5; i11++) {
    const s6 = t6[i11];
    let a5, u3, d4 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u3 = c5.exec(s6), null !== u3); ) f3 = c5.lastIndex, c5 === v ? "!--" === u3[1] ? c5 = _ : void 0 !== u3[1] ? c5 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n9 = RegExp("</" + u3[2], "g")), c5 = p2) : void 0 !== u3[3] && (c5 = p2) : c5 === p2 ? ">" === u3[0] ? (c5 = n9 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c5.lastIndex - u3[2].length, a5 = u3[1], c5 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n9 = void 0);
    const x2 = c5 === p2 && t6[i11 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d4 >= 0 ? (e11.push(a5), s6.slice(0, d4) + h2 + s6.slice(d4) + o3 + x2) : s6 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t6, l3 + (t6[s5] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e11];
};
var S2 = class _S {
  constructor({ strings: t6, _$litType$: i10 }, e11) {
    let r7;
    this.parts = [];
    let l3 = 0, a5 = 0;
    const u3 = t6.length - 1, d4 = this.parts, [f3, v2] = N(t6, i10);
    if (this.el = _S.createElement(f3, e11), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (r7 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t7 of r7.getAttributeNames()) if (t7.endsWith(h2)) {
          const i11 = v2[a5++], s5 = r7.getAttribute(t7).split(o3), e12 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l3, name: e12[2], strings: s5, ctor: "." === e12[1] ? I : "?" === e12[1] ? L : "@" === e12[1] ? z : H }), r7.removeAttribute(t7);
        } else t7.startsWith(o3) && (d4.push({ type: 6, index: l3 }), r7.removeAttribute(t7));
        if (y2.test(r7.tagName)) {
          const t7 = r7.textContent.split(o3), i11 = t7.length - 1;
          if (i11 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i11; s5++) r7.append(t7[s5], c3()), P.nextNode(), d4.push({ type: 2, index: ++l3 });
            r7.append(t7[i11], c3());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === n3) d4.push({ type: 2, index: l3 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = r7.data.indexOf(o3, t7 + 1)); ) d4.push({ type: 7, index: l3 }), t7 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t6, i10) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t6, s5;
  }
};
function M(t6, i10, s5 = t6, e11) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e11 ? s5._$Co?.[e11] : s5._$Cl;
  const o12 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o12 && (h3?._$AO?.(false), void 0 === o12 ? h3 = void 0 : (h3 = new o12(t6), h3._$AT(t6, s5, e11)), void 0 !== e11 ? (s5._$Co ??= [])[e11] = h3 : s5._$Cl = h3), void 0 !== h3 && (i10 = M(t6, h3._$AS(t6, i10.values), h3, e11)), i10;
}
var R = class {
  constructor(t6, i10) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = i10;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: i10 }, parts: s5 } = this._$AD, e11 = (t6?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e11;
    let h3 = P.nextNode(), o12 = 0, n9 = 0, r7 = s5[0];
    for (; void 0 !== r7; ) {
      if (o12 === r7.index) {
        let i11;
        2 === r7.type ? i11 = new k(h3, h3.nextSibling, this, t6) : 1 === r7.type ? i11 = new r7.ctor(h3, r7.name, r7.strings, this, t6) : 6 === r7.type && (i11 = new Z(h3, this, t6)), this._$AV.push(i11), r7 = s5[++n9];
      }
      o12 !== r7?.index && (h3 = P.nextNode(), o12++);
    }
    return P.currentNode = l2, e11;
  }
  p(t6) {
    let i10 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t6, s5, i10), i10 += s5.strings.length - 2) : s5._$AI(t6[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, i10, s5, e11) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t6, this._$AB = i10, this._$AM = s5, this.options = e11, this._$Cv = e11?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const i10 = this._$AM;
    return void 0 !== i10 && 11 === t6?.nodeType && (t6 = i10.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, i10 = this) {
    t6 = M(this, t6, i10), a2(t6) ? t6 === A || null == t6 || "" === t6 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t6 !== this._$AH && t6 !== E && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : d2(t6) ? this.k(t6) : this._(t6);
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
    const { values: i10, _$litType$: s5 } = t6, e11 = "number" == typeof s5 ? this._$AC(t6) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e11) this._$AH.p(i10);
    else {
      const t7 = new R(e11, this), s6 = t7.u(this.options);
      t7.p(i10), this.T(s6), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let i10 = C.get(t6.strings);
    return void 0 === i10 && C.set(t6.strings, i10 = new S2(t6)), i10;
  }
  k(t6) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s5, e11 = 0;
    for (const h3 of t6) e11 === i10.length ? i10.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i10[e11], s5._$AI(h3), e11++;
    e11 < i10.length && (this._$AR(s5 && s5._$AB.nextSibling, e11), i10.length = e11);
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
  constructor(t6, i10, s5, e11, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t6, this.name = i10, this._$AM = e11, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t6, i10 = this, s5, e11) {
    const h3 = this.strings;
    let o12 = false;
    if (void 0 === h3) t6 = M(this, t6, i10, 0), o12 = !a2(t6) || t6 !== this._$AH && t6 !== E, o12 && (this._$AH = t6);
    else {
      const e12 = t6;
      let n9, r7;
      for (t6 = h3[0], n9 = 0; n9 < h3.length - 1; n9++) r7 = M(this, e12[s5 + n9], i10, n9), r7 === E && (r7 = this._$AH[n9]), o12 ||= !a2(r7) || r7 !== this._$AH[n9], r7 === A ? t6 = A : t6 !== A && (t6 += (r7 ?? "") + h3[n9 + 1]), this._$AH[n9] = r7;
    }
    o12 && !e11 && this.j(t6);
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
  constructor(t6, i10, s5, e11, h3) {
    super(t6, i10, s5, e11, h3), this.type = 5;
  }
  _$AI(t6, i10 = this) {
    if ((t6 = M(this, t6, i10, 0) ?? A) === E) return;
    const s5 = this._$AH, e11 = t6 === A && s5 !== A || t6.capture !== s5.capture || t6.once !== s5.once || t6.passive !== s5.passive, h3 = t6 !== A && (s5 === A || e11);
    e11 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var Z = class {
  constructor(t6, i10, s5) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s5;
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
var D = (t6, i10, s5) => {
  const e11 = s5?.renderBefore ?? i10;
  let h3 = e11._$litPart$;
  if (void 0 === h3) {
    const t7 = s5?.renderBefore ?? null;
    e11._$litPart$ = h3 = new k(i10.insertBefore(c3(), t7), t7, void 0, s5 ?? {});
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
    const r7 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t6), this._$Do = D(r7, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/icon/icon.js
var t3 = i`:host{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium);display:inline-flex;inline-size:var(--swc-icon-inline-size);block-size:var(--swc-icon-block-size);color:var(--swc-icon-color, currentColor)}:host([size=\"xs\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-small);--swc-icon-block-size: var(--swc-workflow-icon-extra-small)}:host([size=\"s\"]){--swc-icon-inline-size: var(--swc-workflow-icon-small);--swc-icon-block-size: var(--swc-workflow-icon-small)}:host([size=\"m\"]){--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium)}:host([size=\"l\"]){--swc-icon-inline-size: var(--swc-workflow-icon-large);--swc-icon-block-size: var(--swc-workflow-icon-large)}:host([size=\"xl\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-large);--swc-icon-block-size: var(--swc-workflow-icon-extra-large)}.swc-Icon{display:block;inline-size:100%;block-size:100%}svg,.swc-Icon>svg,::slotted(*){display:block;inline-size:100%;block-size:100%;fill:currentcolor}`;

// deps/swc/swc-dist/core/components/icon/Icon.types.js
var e4 = [
  "xs",
  "s",
  "m",
  "l",
  "xl"
];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e5(e11, t6, n9, r7) {
  var i10 = arguments.length, a5 = i10 < 3 ? t6 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t6, n9) : r7, o12;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e11, t6, n9, r7);
  else for (var s5 = e11.length - 1; s5 >= 0; s5--) (o12 = e11[s5]) && (a5 = (i10 < 3 ? o12(a5) : i10 > 3 ? o12(t6, n9, a5) : o12(t6, n9)) || a5);
  return i10 > 3 && a5 && Object.defineProperty(t6, n9, a5), a5;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t6 = o5, e11, r7) => {
  const { kind: n9, metadata: i10 } = r7;
  let s5 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i10, s5 = /* @__PURE__ */ new Map()), "setter" === n9 && ((t6 = Object.create(t6)).wrapped = true), s5.set(r7.name, t6), "accessor" === n9) {
    const { name: o12 } = r7;
    return { set(r8) {
      const n10 = e11.get.call(this);
      e11.set.call(this, r8), this.requestUpdate(o12, n10, t6, true, r8);
    }, init(e12) {
      return void 0 !== e12 && this.C(o12, void 0, t6, e12), e12;
    } };
  }
  if ("setter" === n9) {
    const { name: o12 } = r7;
    return function(r8) {
      const n10 = this[o12];
      e11.call(this, r8), this.requestUpdate(o12, n10, t6, true, r8);
    };
  }
  throw Error("Unsupported decorator location: " + n9);
};
function n4(t6) {
  return (e11, o12) => "object" == typeof o12 ? r4(t6, e11, o12) : ((t7, e12, o13) => {
    const r7 = e12.hasOwnProperty(o13);
    return e12.constructor.createProperty(o13, t7), r7 ? Object.getOwnPropertyDescriptor(e12, o13) : void 0;
  })(t6, e11, o12);
}

// node_modules/@lit/reactive-element/decorators/base.js
var e6 = (e11, t6, c5) => (c5.configurable = true, c5.enumerable = true, Reflect.decorate && "object" != typeof t6 && Object.defineProperty(e11, t6, c5), c5);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o6(o12) {
  return (e11, n9) => {
    const { slot: r7, selector: s5 } = o12 ?? {}, c5 = "slot" + (r7 ? `[name=${r7}]` : ":not([name])");
    return e6(e11, n9, { get() {
      const t6 = this.renderRoot?.querySelector(c5), e12 = t6?.assignedElements(o12) ?? [];
      return void 0 === s5 ? e12 : e12.filter((t7) => t7.matches(s5));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e7(e11, t6) {
  window.__swc && window.__swc.DEBUG && customElements.get(e11) && window.__swc.warn(void 0, `Attempted to redefine <${e11}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e11, t6);
}

// deps/swc/swc-dist/core/element/version.js
var e8 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e9(e11 = document) {
  var t6;
  let n9 = e11.activeElement;
  for (; !(n9 == null || (t6 = n9.shadowRoot) == null) && t6.activeElement; ) n9 = n9.shadowRoot.activeElement;
  return n9;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t6) {
  class n9 extends t6 {
    hasVisibleFocusInTree() {
      var t7;
      let n10 = e9(this.getRootNode());
      return (t7 = n10 == null ? void 0 : n10.matches(":focus-visible")) == null ? false : t7;
    }
  }
  return n9;
}
var o7 = class extends a3(i4) {
  get dir() {
    var e11;
    return (e11 = getComputedStyle(this).direction) == null ? "ltr" : e11;
  }
};
if (i5 = o7, i5.VERSION = e8, i5.CORE_VERSION = t4, true) {
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
      ...((c5 = window.__swc) == null ? void 0 : c5.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t6,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e12, t7, n9, { type: r7 = "api", level: i10 = "default", issues: a5 } = {}) => {
      let { localName: o12 = "base" } = e12 || {}, s6 = `${o12}:${r7}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o12] || window.__swc.ignoreWarningTypes[r7] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s6);
      let c6 = "";
      a5 && a5.length && (a5.unshift(""), c6 = a5.join("\n    - ") + "\n");
      let l4 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e12 ? "\nInspect this issue in the follow element:" : "", d4 = (e12 ? "\n\n" : "\n") + n9 + "\n", f3 = [];
      f3.push(l4 + t7 + "\n" + c6 + u3), e12 && f3.push(e12), f3.push(d4, { data: {
        localName: o12,
        type: r7,
        level: i10
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c5;
var l3;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r5 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n9, { validSizes: i10 = [...r5], noDefaultSize: a5, defaultSize: o12 = "m" } = {}) {
  var s5;
  class c5 extends n9 {
    constructor(...e11) {
      super(...e11), this._size = o12;
    }
    get size() {
      return this._size || o12;
    }
    set size(e11) {
      let t6 = a5 ? null : o12, n10 = e11 && e11.toLocaleLowerCase(), r7 = this.constructor.VALID_SIZES.includes(n10) ? n10 : t6;
      if (r7 && this.setAttribute("size", r7), this._size === r7) return;
      let i11 = this._size;
      this._size = r7, this.requestUpdate("size", i11);
    }
    update(e11) {
      !this.hasAttribute("size") && !a5 && this.setAttribute("size", this.size), super.update(e11);
    }
  }
  return s5 = c5, s5.VALID_SIZES = i10, e5([n4({ type: String })], c5.prototype, "size", null), c5;
}

// deps/swc/swc-dist/core/components/icon/Icon.base.js
var o11 = class extends i7(o7, { validSizes: [...e4] }) {
  constructor(...e11) {
    super(...e11), this.label = "";
  }
  firstUpdated(e11) {
    super.firstUpdated(e11), this.updateSlottedIcon(), this.updateHostAccessibility();
  }
  updated(e11) {
    super.updated(e11), e11.has("label") && (this.updateSlottedIcon(), this.updateHostAccessibility());
  }
  handleSlotChange() {
    this.updateSlottedIcon();
  }
  updateSlottedIcon() {
    var e11;
    let [t6] = this.defaultSlotElements;
    if (!t6) return;
    let n9 = t6 instanceof SVGElement ? t6 : (e11 = t6.querySelector) == null ? void 0 : e11.call(t6, "svg");
    n9 && (n9.setAttribute("role", "img"), this.label ? (n9.setAttribute("aria-label", this.label), n9.removeAttribute("aria-hidden")) : (n9.setAttribute("aria-hidden", "true"), n9.removeAttribute("aria-label")));
  }
  updateHostAccessibility() {
    this.label ? this.removeAttribute("aria-hidden") : this.setAttribute("aria-hidden", "true");
  }
};
e5([n4({ type: String })], o11.prototype, "label", void 0), e5([o6({ flatten: true })], o11.prototype, "defaultSlotElements", void 0);

// deps/swc/swc-dist/components/icon/Icon2.js
var r6 = class extends o11 {
  static get styles() {
    return [t3];
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
e7("swc-icon", r6);

// deps/swc/swc-dist/patterns/conversational-ai/utils/icons/index.js
var c4 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path
      d="M18.0313 10.7012L14.5342 7.19825C14.2412 6.90528 13.7656 6.90626 13.4727 7.19727C13.1797 7.49024 13.1797 7.96485 13.4717 8.25879L15.6877 10.4785H8.49317C7.29005 10.4785 6.16016 10.0107 5.31055 9.16114C4.45996 8.31055 3.99219 7.18067 3.99219 5.97852C3.99219 5.56446 3.65625 5.22852 3.24219 5.22852C2.82813 5.22852 2.49219 5.56446 2.49219 5.97852C2.49219 7.58106 3.11621 9.0879 4.25 10.2217C5.38281 11.3545 6.88965 11.9785 8.49316 11.9785H15.6924L13.4726 14.1982C13.1797 14.4912 13.1797 14.9658 13.4726 15.2588C13.6191 15.4053 13.8105 15.4785 14.0029 15.4785C14.1953 15.4785 14.3867 15.4053 14.5332 15.2588L18.0303 11.7617C18.3232 11.4688 18.3232 10.9941 18.0313 10.7012Z"
      fill="currentColor"
    />
  </svg>
`;

// deps/swc/swc-dist/patterns/conversational-ai/suggestion-item/suggestion-item.js
var t5 = i`:host{display:inline-block}*,*:before,*:after{box-sizing:border-box}.swc-SuggestionItem{-webkit-tap-highlight-color:transparent;display:inline-flex;align-items:center;block-size:var(--swc-suggestion-item-min-block-size, var(--swc-component-height-100));padding:0;font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-style:normal;font-weight:400;line-height:var(--swc-line-height-font-size-100);color:var(--swc-gray-800);background:var(--swc-gray-100);border:1px solid transparent;border-radius:16px;transition:background .13s cubic-bezier(.45,0,.4,1)}.swc-SuggestionItem:hover,.swc-SuggestionItem:focus-visible,.swc-SuggestionItem:active{background:var(--swc-gray-200)}.swc-SuggestionItem:focus-visible{outline:2px solid var(--swc-blue-800);outline-offset:2px}.swc-SuggestionItem:active{transform:perspective(64px) translateZ(-1px);transition-timing-function:cubic-bezier(.45,0,.4,1);transition-duration:.16s;will-change:transform}.swc-SuggestionItem swc-icon{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium);flex-shrink:0;margin-inline-start:var(--swc-suggestion-item-icon-margin-inline-start, 14px);margin-inline-end:var(--swc-suggestion-item-icon-margin-inline-end, 6px)}.swc-SuggestionItem-label{display:inline-flex;padding-block:var(--swc-suggestion-item-label-padding-block, 7px);padding-inline-end:var(--swc-suggestion-item-label-padding-inline-end, 16px);text-align:start}@media(forced-colors:active){.swc-SuggestionItem:focus-visible{outline-color:CanvasText}}`;

// deps/swc/swc-dist/patterns/conversational-ai/suggestion-item/SuggestionItem.js
var i9 = class extends o7 {
  static get styles() {
    return [t5];
  }
  _handleClick() {
    var e11, t6;
    let n9 = (e11 = (t6 = this.textContent) == null ? void 0 : t6.trim()) == null ? "" : e11;
    this.dispatchEvent(new CustomEvent("swc-suggestion", {
      bubbles: true,
      composed: true,
      detail: { label: n9 }
    }));
  }
  render() {
    return b2`
      <button
        type="button"
        class="swc-SuggestionItem"
        @click=${this._handleClick}
      >
        <swc-icon aria-hidden="true">${c4()}</swc-icon>
        <span class="swc-SuggestionItem-label">
          <slot></slot>
        </span>
      </button>
    `;
  }
};

// deps/swc/swc-dist/patterns/conversational-ai/suggestion-item/index.js
e7("swc-suggestion-item", i9);
export {
  i9 as SuggestionItem
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
@lit-labs/observers/mutation-controller.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
