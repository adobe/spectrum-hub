// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e11, o12) {
    if (this._$cssResult$ = true, o12 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e11;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e11 = void 0 !== s5 && 1 === s5.length;
      e11 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e11 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e11) => {
  const o12 = 1 === t5.length ? t5[0] : e11.reduce((e12, s5, o13) => e12 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o13 + 1], t5[0]);
  return new n(o12, t5, s);
};
var S = (s5, o12) => {
  if (e) s5.adoptedStyleSheets = o12.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e11 of o12) {
    const o13 = document.createElement("style"), n9 = t.litNonce;
    void 0 !== n9 && o13.setAttribute("nonce", n9), o13.textContent = e11.cssText, s5.appendChild(o13);
  }
};
var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e11 = "";
  for (const s5 of t6.cssRules) e11 += s5.cssText;
  return r(e11);
})(t5) : t5;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s5) => t5;
var u = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i9 = t5;
  switch (s5) {
    case Boolean:
      i9 = null !== t5;
      break;
    case Number:
      i9 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i9 = JSON.parse(t5);
      } catch (t6) {
        i9 = null;
      }
  }
  return i9;
} };
var f = (t5, s5) => !i2(t5, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i9 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t5, i9, s5);
      void 0 !== h3 && e2(this.prototype, t5, h3);
    }
  }
  static getPropertyDescriptor(t5, s5, i9) {
    const { get: e11, set: r7 } = h(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e11, set(s6) {
      const h3 = e11?.call(this);
      r7?.call(this, s6), this.requestUpdate(t5, h3, i9);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s5 = [...r2(t6), ...o2(t6)];
      for (const i9 of s5) this.createProperty(i9, t6[i9]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i9] of s5) this.elementProperties.set(t6, i9);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i9 = this._$Eu(t6, s5);
      void 0 !== i9 && this._$Eh.set(i9, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i9 = [];
    if (Array.isArray(s5)) {
      const e11 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e11) i9.unshift(c(s6));
    } else void 0 !== s5 && i9.push(c(s5));
    return i9;
  }
  static _$Eu(t5, s5) {
    const i9 = s5.attribute;
    return false === i9 ? void 0 : "string" == typeof i9 ? i9 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i9 of s5.keys()) this.hasOwnProperty(i9) && (t5.set(i9, this[i9]), delete this[i9]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i9) {
    this._$AK(t5, i9);
  }
  _$ET(t5, s5) {
    const i9 = this.constructor.elementProperties.get(t5), e11 = this.constructor._$Eu(t5, i9);
    if (void 0 !== e11 && true === i9.reflect) {
      const h3 = (void 0 !== i9.converter?.toAttribute ? i9.converter : u).toAttribute(s5, i9.type);
      this._$Em = t5, null == h3 ? this.removeAttribute(e11) : this.setAttribute(e11, h3), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i9 = this.constructor, e11 = i9._$Eh.get(t5);
    if (void 0 !== e11 && this._$Em !== e11) {
      const t6 = i9.getPropertyOptions(e11), h3 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e11;
      const r7 = h3.fromAttribute(s5, t6.type);
      this[e11] = r7 ?? this._$Ej?.get(e11) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i9, e11 = false, h3) {
    if (void 0 !== t5) {
      const r7 = this.constructor;
      if (false === e11 && (h3 = this[t5]), i9 ??= r7.getPropertyOptions(t5), !((i9.hasChanged ?? f)(h3, s5) || i9.useDefault && i9.reflect && h3 === this._$Ej?.get(t5) && !this.hasAttribute(r7._$Eu(t5, i9)))) return;
      this.C(t5, s5, i9);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i9, reflect: e11, wrapped: h3 }, r7) {
    i9 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r7 ?? s5 ?? this[t5]), true !== h3 || void 0 !== r7) || (this._$AL.has(t5) || (this.hasUpdated || i9 || (s5 = void 0), this._$AL.set(t5, s5)), true === e11 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i9] of t6) {
        const { wrapped: t7 } = i9, e11 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e11 || this.C(s6, void 0, i9, e11);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
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
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i9, ...s5) => ({ _$litType$: t5, strings: i9, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i9) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i9) : i9;
}
var N = (t5, i9) => {
  const s5 = t5.length - 1, e11 = [];
  let n9, l3 = 2 === i9 ? "<svg>" : 3 === i9 ? "<math>" : "", c4 = v;
  for (let i10 = 0; i10 < s5; i10++) {
    const s6 = t5[i10];
    let a5, u3, d4 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u3 = c4.exec(s6), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n9 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n9 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c4.lastIndex - u3[2].length, a5 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n9 = void 0);
    const x2 = c4 === p2 && t5[i10 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s6 + r3 : d4 >= 0 ? (e11.push(a5), s6.slice(0, d4) + h2 + s6.slice(d4) + o3 + x2) : s6 + o3 + (-2 === d4 ? i10 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i9 ? "</svg>" : 3 === i9 ? "</math>" : "")), e11];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i9 }, e11) {
    let r7;
    this.parts = [];
    let l3 = 0, a5 = 0;
    const u3 = t5.length - 1, d4 = this.parts, [f3, v2] = N(t5, i9);
    if (this.el = _S.createElement(f3, e11), P.currentNode = this.el.content, 2 === i9 || 3 === i9) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r7 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t6 of r7.getAttributeNames()) if (t6.endsWith(h2)) {
          const i10 = v2[a5++], s5 = r7.getAttribute(t6).split(o3), e12 = /([.?@])?(.*)/.exec(i10);
          d4.push({ type: 1, index: l3, name: e12[2], strings: s5, ctor: "." === e12[1] ? I : "?" === e12[1] ? L : "@" === e12[1] ? z : H }), r7.removeAttribute(t6);
        } else t6.startsWith(o3) && (d4.push({ type: 6, index: l3 }), r7.removeAttribute(t6));
        if (y2.test(r7.tagName)) {
          const t6 = r7.textContent.split(o3), i10 = t6.length - 1;
          if (i10 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i10; s5++) r7.append(t6[s5], c3()), P.nextNode(), d4.push({ type: 2, index: ++l3 });
            r7.append(t6[i10], c3());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === n3) d4.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r7.data.indexOf(o3, t6 + 1)); ) d4.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i9) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i9, s5 = t5, e11) {
  if (i9 === E) return i9;
  let h3 = void 0 !== e11 ? s5._$Co?.[e11] : s5._$Cl;
  const o12 = a2(i9) ? void 0 : i9._$litDirective$;
  return h3?.constructor !== o12 && (h3?._$AO?.(false), void 0 === o12 ? h3 = void 0 : (h3 = new o12(t5), h3._$AT(t5, s5, e11)), void 0 !== e11 ? (s5._$Co ??= [])[e11] = h3 : s5._$Cl = h3), void 0 !== h3 && (i9 = M(t5, h3._$AS(t5, i9.values), h3, e11)), i9;
}
var R = class {
  constructor(t5, i9) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i9;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i9 }, parts: s5 } = this._$AD, e11 = (t5?.creationScope ?? l2).importNode(i9, true);
    P.currentNode = e11;
    let h3 = P.nextNode(), o12 = 0, n9 = 0, r7 = s5[0];
    for (; void 0 !== r7; ) {
      if (o12 === r7.index) {
        let i10;
        2 === r7.type ? i10 = new k(h3, h3.nextSibling, this, t5) : 1 === r7.type ? i10 = new r7.ctor(h3, r7.name, r7.strings, this, t5) : 6 === r7.type && (i10 = new Z(h3, this, t5)), this._$AV.push(i10), r7 = s5[++n9];
      }
      o12 !== r7?.index && (h3 = P.nextNode(), o12++);
    }
    return P.currentNode = l2, e11;
  }
  p(t5) {
    let i9 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i9), i9 += s5.strings.length - 2) : s5._$AI(t5[i9])), i9++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i9, s5, e11) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i9, this._$AM = s5, this.options = e11, this._$Cv = e11?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i9 = this._$AM;
    return void 0 !== i9 && 11 === t5?.nodeType && (t5 = i9.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i9 = this) {
    t5 = M(this, t5, i9), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i9, _$litType$: s5 } = t5, e11 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e11) this._$AH.p(i9);
    else {
      const t6 = new R(e11, this), s6 = t6.u(this.options);
      t6.p(i9), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i9 = C.get(t5.strings);
    return void 0 === i9 && C.set(t5.strings, i9 = new S2(t5)), i9;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i9 = this._$AH;
    let s5, e11 = 0;
    for (const h3 of t5) e11 === i9.length ? i9.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i9[e11], s5._$AI(h3), e11++;
    e11 < i9.length && (this._$AR(s5 && s5._$AB.nextSibling, e11), i9.length = e11);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i3(t5).nextSibling;
      i3(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i9, s5, e11, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i9, this._$AM = e11, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i9 = this, s5, e11) {
    const h3 = this.strings;
    let o12 = false;
    if (void 0 === h3) t5 = M(this, t5, i9, 0), o12 = !a2(t5) || t5 !== this._$AH && t5 !== E, o12 && (this._$AH = t5);
    else {
      const e12 = t5;
      let n9, r7;
      for (t5 = h3[0], n9 = 0; n9 < h3.length - 1; n9++) r7 = M(this, e12[s5 + n9], i9, n9), r7 === E && (r7 = this._$AH[n9]), o12 ||= !a2(r7) || r7 !== this._$AH[n9], r7 === A ? t5 = A : t5 !== A && (t5 += (r7 ?? "") + h3[n9 + 1]), this._$AH[n9] = r7;
    }
    o12 && !e11 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i9, s5, e11, h3) {
    super(t5, i9, s5, e11, h3), this.type = 5;
  }
  _$AI(t5, i9 = this) {
    if ((t5 = M(this, t5, i9, 0) ?? A) === E) return;
    const s5 = this._$AH, e11 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h3 = t5 !== A && (s5 === A || e11);
    e11 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i9, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i9, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t5, i9, s5) => {
  const e11 = s5?.renderBefore ?? i9;
  let h3 = e11._$litPart$;
  if (void 0 === h3) {
    const t6 = s5?.renderBefore ?? null;
    e11._$litPart$ = h3 = new k(i9.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h3._$AI(t5), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r7 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r7, this.renderRoot, this.renderOptions);
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
function e5(e11, t5, n9, r7) {
  var i9 = arguments.length, a5 = i9 < 3 ? t5 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t5, n9) : r7, o12;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e11, t5, n9, r7);
  else for (var s5 = e11.length - 1; s5 >= 0; s5--) (o12 = e11[s5]) && (a5 = (i9 < 3 ? o12(a5) : i9 > 3 ? o12(t5, n9, a5) : o12(t5, n9)) || a5);
  return i9 > 3 && a5 && Object.defineProperty(t5, n9, a5), a5;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t5 = o5, e11, r7) => {
  const { kind: n9, metadata: i9 } = r7;
  let s5 = globalThis.litPropertyMetadata.get(i9);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i9, s5 = /* @__PURE__ */ new Map()), "setter" === n9 && ((t5 = Object.create(t5)).wrapped = true), s5.set(r7.name, t5), "accessor" === n9) {
    const { name: o12 } = r7;
    return { set(r8) {
      const n10 = e11.get.call(this);
      e11.set.call(this, r8), this.requestUpdate(o12, n10, t5, true, r8);
    }, init(e12) {
      return void 0 !== e12 && this.C(o12, void 0, t5, e12), e12;
    } };
  }
  if ("setter" === n9) {
    const { name: o12 } = r7;
    return function(r8) {
      const n10 = this[o12];
      e11.call(this, r8), this.requestUpdate(o12, n10, t5, true, r8);
    };
  }
  throw Error("Unsupported decorator location: " + n9);
};
function n4(t5) {
  return (e11, o12) => "object" == typeof o12 ? r4(t5, e11, o12) : ((t6, e12, o13) => {
    const r7 = e12.hasOwnProperty(o13);
    return e12.constructor.createProperty(o13, t6), r7 ? Object.getOwnPropertyDescriptor(e12, o13) : void 0;
  })(t5, e11, o12);
}

// node_modules/@lit/reactive-element/decorators/base.js
var e6 = (e11, t5, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t5 && Object.defineProperty(e11, t5, c4), c4);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o6(o12) {
  return (e11, n9) => {
    const { slot: r7, selector: s5 } = o12 ?? {}, c4 = "slot" + (r7 ? `[name=${r7}]` : ":not([name])");
    return e6(e11, n9, { get() {
      const t5 = this.renderRoot?.querySelector(c4), e12 = t5?.assignedElements(o12) ?? [];
      return void 0 === s5 ? e12 : e12.filter((t6) => t6.matches(s5));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e7(e11, t5) {
  window.__swc && window.__swc.DEBUG && customElements.get(e11) && window.__swc.warn(void 0, `Attempted to redefine <${e11}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e11, t5);
}

// deps/swc/swc-dist/core/element/version.js
var e8 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e9(e11 = document) {
  var t5;
  let n9 = e11.activeElement;
  for (; !(n9 == null || (t5 = n9.shadowRoot) == null) && t5.activeElement; ) n9 = n9.shadowRoot.activeElement;
  return n9;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t5) {
  class n9 extends t5 {
    hasVisibleFocusInTree() {
      var t6;
      let n10 = e9(this.getRootNode());
      return (t6 = n10 == null ? void 0 : n10.matches(":focus-visible")) == null ? false : t6;
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
  }, t5 = {
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
      ...t5,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e12, t6, n9, { type: r7 = "api", level: i9 = "default", issues: a5 } = {}) => {
      let { localName: o12 = "base" } = e12 || {}, s6 = `${o12}:${r7}:${i9}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o12] || window.__swc.ignoreWarningTypes[r7] || window.__swc.ignoreWarningLevels[i9]) return;
      window.__swc.issuedWarnings.add(s6);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l4 = i9 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e12 ? "\nInspect this issue in the follow element:" : "", d4 = (e12 ? "\n\n" : "\n") + n9 + "\n", f3 = [];
      f3.push(l4 + t6 + "\n" + c5 + u3), e12 && f3.push(e12), f3.push(d4, { data: {
        localName: o12,
        type: r7,
        level: i9
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c4;
var l3;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r5 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n9, { validSizes: i9 = [...r5], noDefaultSize: a5, defaultSize: o12 = "m" } = {}) {
  var s5;
  class c4 extends n9 {
    constructor(...e11) {
      super(...e11), this._size = o12;
    }
    get size() {
      return this._size || o12;
    }
    set size(e11) {
      let t5 = a5 ? null : o12, n10 = e11 && e11.toLocaleLowerCase(), r7 = this.constructor.VALID_SIZES.includes(n10) ? n10 : t5;
      if (r7 && this.setAttribute("size", r7), this._size === r7) return;
      let i10 = this._size;
      this._size = r7, this.requestUpdate("size", i10);
    }
    update(e11) {
      !this.hasAttribute("size") && !a5 && this.setAttribute("size", this.size), super.update(e11);
    }
  }
  return s5 = c4, s5.VALID_SIZES = i9, e5([n4({ type: String })], c4.prototype, "size", null), c4;
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
    let [t5] = this.defaultSlotElements;
    if (!t5) return;
    let n9 = t5 instanceof SVGElement ? t5 : (e11 = t5.querySelector) == null ? void 0 : e11.call(t5, "svg");
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
